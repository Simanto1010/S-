import { auth, db, doc, setDoc } from '../firebase';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

export class NotificationService {
  /**
   * Requests permission for push notifications and stores the FCM token
   */
  static async requestPermission() {
    try {
      const messaging = getMessaging();
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        const token = await getToken(messaging, {
          vapidKey: 'YOUR_PUBLIC_VAPID_KEY' // Replace with real key from Firebase console
        });
        
        if (token && auth.currentUser) {
          await setDoc(doc(db, 'user_notifications', auth.currentUser.uid), {
            fcmToken: token,
            updatedAt: new Date()
          }, { merge: true });
          console.log('[Notification] FCM Token registered.');
        }
      }
    } catch (error) {
      console.error('Failed to register notifications:', error);
    }
  }

  /**
   * Listens for foreground messages
   */
  static listenForMessages() {
    const messaging = getMessaging();
    onMessage(messaging, (payload) => {
      console.log('[Notification] Message received in foreground:', payload);
      // Show a custom toast or notification in UI
      if (payload.notification) {
        new Notification(payload.notification.title || 'S+ Update', {
          body: payload.notification.body,
          icon: 'https://picsum.photos/seed/splus/192/192'
        });
      }
    });
  }

  /**
   * Triggers a notification (In production, this would be a Cloud Function)
   */
  static async triggerOpportunityNotification(title: string, body: string) {
    console.log(`[Notification Trigger] ${title}: ${body}`);
    // This would typically call a backend endpoint that uses firebase-admin to send the push
    // For now, we simulate the logic
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: 'https://picsum.photos/seed/splus/192/192' });
    }
  }
}
