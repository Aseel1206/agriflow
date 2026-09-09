"use client";

import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

function getFirebaseApp() {
  if (!firebaseConfig.apiKey) return null;
  return getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
}

let messagingInstance: Messaging | null = null;

async function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  if (!(await isSupported())) return null;
  const app = getFirebaseApp();
  if (!app) return null;
  if (!messagingInstance) messagingInstance = getMessaging(app);
  return messagingInstance;
}

/**
 * Requests notification permission and returns an FCM device token, or null
 * if unsupported/denied/misconfigured. Never throws — push is a best-effort
 * enhancement, not something that should break the app if it fails.
 */
export async function requestPushToken(): Promise<string | null> {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging || !VAPID_KEY) return null;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    return token || null;
  } catch {
    return null;
  }
}

/** Foreground message listener — background messages are handled by the service worker. */
export async function onForegroundMessage(callback: (title: string, body: string) => void) {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    const title = payload.notification?.title || "Notification";
    const body = payload.notification?.body || "";
    callback(title, body);
  });
}
