import { db, auth } from '../firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';

export interface HealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  latency?: number;
  message?: string;
}

export class HealthCheckService {
  static async checkAI(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: 'ping',
      });
      return {
        service: 'AI Engine',
        status: 'healthy',
        latency: Date.now() - start
      };
    } catch (err: any) {
      return {
        service: 'AI Engine',
        status: err.message?.includes('quota') ? 'degraded' : 'down',
        message: err.message
      };
    }
  }

  static async checkDatabase(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const q = query(collection(db, 'memories'), limit(1));
      await getDocs(q);
      return {
        service: 'Firestore',
        status: 'healthy',
        latency: Date.now() - start
      };
    } catch (err: any) {
      return {
        service: 'Firestore',
        status: 'down',
        message: err.message
      };
    }
  }

  static async checkAuth(): Promise<HealthStatus> {
    try {
      const user = auth.currentUser;
      return {
        service: 'Authentication',
        status: user ? 'healthy' : 'degraded',
        message: user ? `Logged in as ${user.email}` : 'No active session'
      };
    } catch (err: any) {
      return {
        service: 'Authentication',
        status: 'down',
        message: err.message
      };
    }
  }

  static async checkPaymentSystem(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      // Check if we can reach the payment requests collection
      const q = query(collection(db, 'paymentRequests'), limit(1));
      await getDocs(q);
      return {
        service: 'Payment Gateway',
        status: 'healthy',
        latency: Date.now() - start
      };
    } catch (err: any) {
      return {
        service: 'Payment Gateway',
        status: 'down',
        message: err.message
      };
    }
  }

  static async runFullCheck(): Promise<HealthStatus[]> {
    return Promise.all([
      this.checkAI(),
      this.checkDatabase(),
      this.checkAuth(),
      this.checkPaymentSystem()
    ]);
  }
}
