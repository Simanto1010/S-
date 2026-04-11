import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { collection, addDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp, Timestamp, doc, setDoc } from 'firebase/firestore';

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
    // Skip logging if not authenticated to avoid permission errors
    if (!auth.currentUser && category !== 'system') return;

    try {
      // Use doc() + setDoc() with merge to make the operation idempotent
      // and prevent "Document already exists" errors during network retries
      const logRef = doc(collection(db, 'activityLogs'));
      await setDoc(logRef, {
        userId,
        action,
        type,
        category,
        details: details || {},
        timestamp: serverTimestamp()
      }, { merge: true });
    } catch (err: any) {
      // If it's still an "already exists" error, we can safely ignore it as it means the log is already there
      if (err?.code === 'already-exists' || err?.message?.includes('already exists')) {
        console.warn('Activity log already exists (likely a retry):', action);
        return;
      }
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
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `activityLogs/${userId}`);
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
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'activityLogs/system');
    });
  }
}
