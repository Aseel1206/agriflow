// Handles push notifications when the app tab isn't focused. Runs as a
// browser service worker, so it can't read process.env — these are the same
// public, non-secret client config values from .env.local, duplicated here
// because that's how Firebase's web SDK requires it.
importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBiBwbCVm_6BEYPm7_Uc8X3i_ubQgpz9fk",
  authDomain: "agriflow-53bce.firebaseapp.com",
  projectId: "agriflow-53bce",
  storageBucket: "agriflow-53bce.firebasestorage.app",
  messagingSenderId: "196848822695",
  appId: "1:196848822695:web:f5126f786b25abb3232e82",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "AgriFlow";
  const body = payload.notification?.body || "";
  self.registration.showNotification(title, { body, icon: "/images/logo/logo-icon.svg" });
});
