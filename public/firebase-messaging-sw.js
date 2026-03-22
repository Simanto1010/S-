importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDRo0-JRTu80Mr8JkXPOf0EkFCcfePMDpM",
  authDomain: "fir-project-e4925.firebaseapp.com",
  projectId: "fir-project-e4925",
  storageBucket: "fir-project-e4925.firebasestorage.app",
  messagingSenderId: "937625530736",
  appId: "1:937625530736:web:156aa388d6d4805b3a9fb5"
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
