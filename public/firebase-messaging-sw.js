importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBscDrhyTSeb6F4lRumErteTTL0dXYb-ug",
  authDomain: "gen-lang-client-0001323286.firebaseapp.com",
  projectId: "gen-lang-client-0001323286",
  storageBucket: "gen-lang-client-0001323286.firebasestorage.app",
  messagingSenderId: "1086810269961",
  appId: "1:1086810269961:web:f5ac93de1a9076da060bd8"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'https://picsum.photos/seed/splus/192/192'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
