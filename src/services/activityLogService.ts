import { db } from '../firebase';
import { collection, addDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';

export interface ActivityLog {
  id?: string;
  userId: string;
  action: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'ai';
  category: 'auth' | 'payment' | 'system' | 'ai' | 'connector';
  details?: any;
  timestamp: Timestamp;
}

export class ActivityLogService {
  static async log(userId: string, action: string, type: ActivityLog['type'], category: ActivityLog['category'], details?: any) {
    try {
      await addDoc(collection(db, 'activityLogs'), {
        userId,
        action,
        type,
        category,
        details: details || {},
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error('Failed to log activity:', err);
    }
  }

  static subscribeToLogs(userId: string, callback: (logs: ActivityLog[]) => void, maxLogs: number = 50) {
    const q = query(
      collection(db, 'activityLogs'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(maxLogs)
    );

    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ActivityLog[];
      callback(logs);
    });
  }

  static subscribeToSystemLogs(callback: (logs: ActivityLog[]) => void, maxLogs: number = 50) {
    const q = query(
      collection(db, 'activityLogs'),
      where('category', '==', 'system'),
      orderBy('timestamp', 'desc'),
      limit(maxLogs)
    );

    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ActivityLog[];
      callback(logs);
    });
  }
}
