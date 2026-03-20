import { db, auth } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { GoogleGenAI } from "@google/genai";
import { ActivityLogService } from "./activityLogService";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export enum PlanType {
  FREE = 'free',
  PRO = 'pro'
}

export interface PlanLimits {
  aiCalls: number;
  executions: number;
  ai_tasks: number;
  storageGb: number;
  connectors: number;
  autonomous: boolean;
  teamMembers: number;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  [PlanType.FREE]: {
    aiCalls: 100,
    executions: 20,
    ai_tasks: 10,
    storageGb: 1,
    connectors: 3,
    autonomous: false,
    teamMembers: 1
  },
  [PlanType.PRO]: {
    aiCalls: 1000000, // Unlimited practically
    executions: 1000000,
    ai_tasks: 1000000,
    storageGb: 100,
    connectors: 100,
    autonomous: true,
    teamMembers: 10
  }
};

export class SaaSService {
  static async getUserSubscription(userId: string) {
    const subRef = doc(db, 'subscriptions', userId);
    const subSnap = await getDoc(subRef);
    
    if (!subSnap.exists()) {
      // Default to free plan
      const defaultSub = {
        userId,
        plan: PlanType.FREE,
        status: 'active',
        createdAt: serverTimestamp(),
        features: PLAN_LIMITS[PlanType.FREE]
      };
      await setDoc(subRef, defaultSub);
      return defaultSub;
    }
    
    return subSnap.data();
  }

  static async verifyPaymentWithAI(screenshotBase64: string, expectedAmount: number) {
    const prompt = `Analyze this UPI payment screenshot. 
    Extract:
    - amount (number)
    - status (Success/Failed/Pending)
    - date (ISO format if possible)
    - upi_app (e.g., PhonePe, GPay, Paytm)
    - is_fake (boolean - check for editing artifacts, mismatched fonts, or suspicious layouts)
    - confidence (0-1)

    Expected amount: ₹${expectedAmount}
    Current time: ${new Date().toISOString()}

    Return ONLY JSON.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/png",
              data: screenshotBase64.split(',')[1] || screenshotBase64
            }
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      const result = JSON.parse(response.text || "{}");
      
      // Auto-approve logic
      const isAmountMatch = Math.abs(result.amount - expectedAmount) < 1;
      const isSuccess = result.status?.toLowerCase() === 'success';
      const isHighConfidence = result.confidence > 0.85;
      const isNotFake = !result.is_fake;

      return {
        ...result,
        autoApprove: isAmountMatch && isSuccess && isHighConfidence && isNotFake,
        reason: !isAmountMatch ? "Amount mismatch" : !isSuccess ? "Payment not successful" : !isHighConfidence ? "Low confidence" : isNotFake ? "Verified" : "Potential fake detected"
      };
    } catch (err) {
      console.error("AI Verification failed:", err);
      return { autoApprove: false, reason: "AI Analysis failed", confidence: 0 };
    }
  }

  static async submitUPIPayment(userId: string, userName: string, planType: 'monthly' | 'yearly', amount: number, transactionId: string, screenshotUrl: string) {
    // 1. Basic validation
    if (!transactionId || !/^[a-zA-Z0-9]{12,}$/.test(transactionId)) {
      throw new Error("Transaction ID must be at least 12 alphanumeric characters.");
    }

    if (!screenshotUrl) {
      throw new Error("Payment screenshot is required.");
    }

    // 2. Rate limiting (max 3 attempts per hour)
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    const rateLimitQuery = query(
      collection(db, 'paymentRequests'),
      where('userId', '==', userId),
      where('createdAt', '>=', oneHourAgo)
    );
    const rateLimitSnap = await getDocs(rateLimitQuery);
    if (rateLimitSnap.size >= 3) {
      throw new Error("Rate limit exceeded. Max 3 payment attempts per hour.");
    }

    // 3. Check for duplicate transaction ID
    const q = query(collection(db, 'paymentRequests'), where('transactionId', '==', transactionId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      throw new Error("This transaction ID has already been submitted.");
    }

    // 4. AI Verification
    const aiResult = await this.verifyPaymentWithAI(screenshotUrl, amount);

    // 5. Create payment request
    const requestRef = doc(collection(db, 'paymentRequests'));
    const status = aiResult.autoApprove ? 'approved' : 'pending';
    
    await setDoc(requestRef, {
      userId,
      userName,
      planType,
      amount,
      transactionId,
      screenshotUrl,
      status,
      aiAnalysis: aiResult,
      createdAt: serverTimestamp(),
      verifiedAt: aiResult.autoApprove ? serverTimestamp() : null,
      verifiedBy: aiResult.autoApprove ? 'ai' : null
    });

    ActivityLogService.log(userId, `Payment submitted: ${transactionId}`, 'info', 'payment', { amount, planType });

    // 6. Update subscription
    const subRef = doc(db, 'subscriptions', userId);
    if (aiResult.autoApprove) {
      ActivityLogService.log(userId, `Payment auto-approved by AI: ${transactionId}`, 'success', 'payment');
      const currentPeriodEnd = new Date();
      if (planType === 'monthly') {
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
      } else {
        currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
      }

      await updateDoc(subRef, {
        plan: PlanType.PRO,
        status: 'active',
        currentPeriodEnd: currentPeriodEnd.toISOString(),
        features: PLAN_LIMITS[PlanType.PRO],
        lastTransactionId: transactionId,
        updatedAt: serverTimestamp(),
        cancelAtPeriodEnd: false
      });
    } else {
      await updateDoc(subRef, {
        status: 'pending_verification',
        lastTransactionId: transactionId,
        updatedAt: serverTimestamp()
      });
    }

    return {
      requestId: requestRef.id,
      autoApproved: aiResult.autoApprove,
      aiReason: aiResult.reason
    };
  }

  static async cancelSubscription(userId: string) {
    const subRef = doc(db, 'subscriptions', userId);
    await updateDoc(subRef, {
      cancelAtPeriodEnd: true,
      updatedAt: serverTimestamp()
    });
    return true;
  }

  static async checkExpiry(userId: string) {
    const subRef = doc(db, 'subscriptions', userId);
    const subSnap = await getDoc(subRef);
    
    if (subSnap.exists()) {
      const data = subSnap.data();
      if (data.plan === PlanType.PRO && data.currentPeriodEnd) {
        const expiryDate = new Date(data.currentPeriodEnd);
        if (expiryDate < new Date()) {
          // Downgrade to free
          await updateDoc(subRef, {
            plan: PlanType.FREE,
            status: 'active',
            features: PLAN_LIMITS[PlanType.FREE],
            updatedAt: serverTimestamp(),
            cancelAtPeriodEnd: false
          });
          return true;
        }
      }
    }
    return false;
  }

  static async getPaymentHistory(userId: string) {
    const q = query(
      collection(db, 'paymentRequests'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async checkLimit(userId: string, metric: keyof PlanLimits): Promise<boolean> {
    const sub = await this.getUserSubscription(userId);
    const plan = sub.plan as PlanType;
    const limit = PLAN_LIMITS[plan][metric];
    
    if (typeof limit === 'boolean') return limit;
    
    const usage = await this.getUsage(userId);
    const currentUsage = (usage as any)[metric] || 0;
    
    return currentUsage < limit;
  }

  static async trackUsage(userId: string, metric: 'aiCalls' | 'executions' | 'storageUsed' | 'ai_tasks', amount: number = 1) {
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    const usageId = `${userId}_${month}`;
    const usageRef = doc(db, 'usage', usageId);
    
    const usageSnap = await getDoc(usageRef);
    if (!usageSnap.exists()) {
      await setDoc(usageRef, {
        userId,
        month,
        aiCalls: metric === 'aiCalls' ? amount : 0,
        executions: metric === 'executions' ? amount : 0,
        ai_tasks: metric === 'ai_tasks' ? amount : 0,
        storageUsed: metric === 'storageUsed' ? amount : 0,
        lastUpdated: serverTimestamp()
      });
    } else {
      await updateDoc(usageRef, {
        [metric]: increment(amount),
        lastUpdated: serverTimestamp()
      });
    }
  }

  private static async getUsage(userId: string) {
    const month = new Date().toISOString().slice(0, 7);
    const usageId = `${userId}_${month}`;
    const usageRef = doc(db, 'usage', usageId);
    const usageSnap = await getDoc(usageRef);
    return usageSnap.exists() ? usageSnap.data() : { aiCalls: 0, executions: 0, storageUsed: 0, ai_tasks: 0 };
  }
}
