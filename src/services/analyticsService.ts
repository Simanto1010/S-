import { GoogleGenAI, Type } from "@google/genai";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit } from "firebase/firestore";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export class AnalyticsService {
  /**
   * S+ FUTURE FORECAST - Predictive Analytics Module
   * Analyzes historical data to predict future performance.
   */
  static async getFutureForecast(userId: string, workspaceId: string) {
    // 1. Fetch Historical Data from Firestore
    const analyticsRef = collection(db, "analytics");
    try {
      const q = query(
        analyticsRef, 
        where("userId", "==", userId),
        where("workspaceId", "==", workspaceId),
        orderBy("timestamp", "desc"),
        limit(30) // Last 30 data points
      );
      
      const snapshot = await getDocs(q);
      const historicalData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (historicalData.length < 5) {
        return { 
          forecast: [], 
          mitigationPlan: "Insufficient data for accurate forecasting. Connect more platforms to build history.",
          status: 'insufficient_data'
        };
      }

      // 2. Use Gemini AI Core to Analyze and Predict
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `You are the S+ Predictive Analytics Engine.
        Analyze the following historical performance data for a business workspace.
        
        Historical Data: ${JSON.stringify(historicalData)}
        
        Requirements:
        1. Predict the next 7 days of performance (growth/revenue/engagement).
        2. Identify any potential drops or risks in the next week.
        3. If a drop is predicted, generate a 'Mitigation Plan' with specific actionable steps.
        4. Compare 'Current' vs 'Predicted' growth rates.
        
        Return a JSON object:
        {
          "forecast": { "date": string, "predicted": number, "current": number }[],
          "mitigationPlan": string,
          "riskLevel": "low" | "medium" | "high",
          "keyInsight": string,
          "growthRate": { "current": string, "predicted": string }
        }`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              forecast: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    date: { type: Type.STRING },
                    predicted: { type: Type.NUMBER },
                    current: { type: Type.NUMBER }
                  }
                }
              },
              mitigationPlan: { type: Type.STRING },
              riskLevel: { type: Type.STRING },
              keyInsight: { type: Type.STRING },
              growthRate: {
                type: Type.OBJECT,
                properties: {
                  current: { type: Type.STRING },
                  predicted: { type: Type.STRING }
                }
              }
            }
          }
        }
      });

      const result = JSON.parse(response.text || "{}");

      // 3. Proactive Mitigation: If risk is high, log it as an opportunity/task
      if (result.riskLevel === 'high' || result.riskLevel === 'medium') {
        await addDoc(collection(db, "autonomousTasks"), {
          userId,
          workspaceId,
          title: `S+ Mitigation: ${result.keyInsight}`,
          description: result.mitigationPlan,
          status: 'pending',
          priority: result.riskLevel,
          type: 'mitigation',
          createdAt: serverTimestamp()
        });
      }

      return { ...result, status: 'success' };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'analytics');
      return { status: 'error', error: 'Failed to fetch analytics' };
    }
  }

  /**
   * Log Analytics Data Point
   */
  static async logDataPoint(workspaceId: string, data: { metric: string, value: number, platform: string }) {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await addDoc(collection(db, "analytics"), {
        userId: user.uid,
        workspaceId,
        ...data,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'analytics');
    }
  }
}
