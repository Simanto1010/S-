import { db, auth, collection, addDoc, serverTimestamp, query, where, getDocs, limit, orderBy, handleFirestoreError, OperationType } from '../firebase';

export interface HealthMetric {
  timestamp: any;
  cpu: number;
  latency: number;
  successRate: number;
  activeTasks: number;
}

export interface SystemError {
  timestamp: any;
  service: string;
  error: string;
  context: any;
  retryCount: number;
  resolved: boolean;
}

export class SystemHealthService {
  private static errorCounts: Record<string, number> = {};

  /**
   * Logs a system error and checks for auto-debugging triggers
   */
  static async logError(service: string, error: string, context: any = {}) {
    // Skip logging if it's a quota exhaustion error to prevent spamming
    if (error.includes('RESOURCE_EXHAUSTED') || error.includes('429') || error.includes('quota')) {
      console.warn(`[SystemHealth] Quota limited in ${service}. Skipping log to prevent spam.`);
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    const errorKey = `${service}:${error}`;
    this.errorCounts[errorKey] = (this.errorCounts[errorKey] || 0) + 1;

    try {
      await addDoc(collection(db, 'systemErrors'), {
        userId: user.uid,
        service,
        error,
        context,
        retryCount: this.errorCounts[errorKey],
        timestamp: serverTimestamp(),
        resolved: false
      });

      console.error(`[SystemHealth] Error in ${service}: ${error}`);

      // Auto-debugging trigger: If an error occurs 3 times, notify the AI Core
      if (this.errorCounts[errorKey] >= 3) {
        console.warn(`[Ghost Engine] Critical failure detected in ${service}. Triggering auto-debugging...`);
        // This will be handled by the AI Core in the next orchestration cycle
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'systemErrors');
    }
  }

  /**
   * Logs real-time system metrics for the Heartbeat visualizer
   */
  static async logMetrics(metrics: Omit<HealthMetric, 'timestamp'>) {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await addDoc(collection(db, 'systemMetrics'), {
        userId: user.uid,
        ...metrics,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'systemMetrics');
    }
  }

  /**
   * Fetches recent metrics for the dashboard
   */
  static async getRecentMetrics(limitCount: number = 20): Promise<HealthMetric[]> {
    const user = auth.currentUser;
    if (!user) return [];

    try {
      const q = query(
        collection(db, 'systemMetrics'),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      } as HealthMetric)).reverse();
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'systemMetrics');
      return [];
    }
  }

  /**
   * Generates simulated real-time metrics for the heartbeat
   */
  static generateSimulatedMetrics(): HealthMetric {
    return {
      timestamp: new Date(),
      cpu: Math.floor(Math.random() * 30) + 10, // 10-40%
      latency: Math.floor(Math.random() * 200) + 50, // 50-250ms
      successRate: 95 + Math.random() * 5, // 95-100%
      activeTasks: Math.floor(Math.random() * 5)
    };
  }
}

export const logError = SystemHealthService.logError.bind(SystemHealthService);
export const logMetrics = SystemHealthService.logMetrics.bind(SystemHealthService);
export const getRecentMetrics = SystemHealthService.getRecentMetrics.bind(SystemHealthService);
export const generateSimulatedMetrics = SystemHealthService.generateSimulatedMetrics.bind(SystemHealthService);
