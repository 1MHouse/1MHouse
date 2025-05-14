
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Log environment variables at the module scope to see what's available when this file is first imported.
console.log('[firebase.ts] Raw NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
console.log('[firebase.ts] All NEXT_PUBLIC_ env vars at import:', Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith('NEXT_PUBLIC_'))));

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log('[firebase.ts] Firebase config object being constructed:', {
  apiKey: firebaseConfig.apiKey ? '***' : undefined, // Mask API key
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId ? '***' : undefined, // Mask App ID
});

let app;
let db;

// Client-side execution only
if (typeof window !== 'undefined') {
  if (!firebaseConfig.projectId) {
    console.error(
      "[firebase.ts] Firebase projectId is undefined. " +
      "Ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID is set in your .env.local file (in the project root) " +
      "and the Next.js development server was RESTARTED."
    );
    // We won't throw an error here to allow the app to load for debugging Studio env vars,
    // but Firestore will not work.
  }

  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      console.log('[firebase.ts] Firebase app initialized successfully.');
    } catch (e) {
      console.error('[firebase.ts] Error initializing Firebase app:', e);
      console.error('[firebase.ts] Config used for initialization attempt:', {
        apiKeyExists: !!firebaseConfig.apiKey,
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
        messagingSenderIdExists: !!firebaseConfig.messagingSenderId,
        appIdExists: !!firebaseConfig.appId,
      });
    }
  } else {
    app = getApp();
    console.log('[firebase.ts] Existing Firebase app retrieved.');
  }

  if (app && firebaseConfig.projectId) {
    try {
      db = getFirestore(app);
      console.log('[firebase.ts] Firestore instance obtained.');
    } catch (e) {
      console.error('[firebase.ts] Error obtaining Firestore instance:', e);
    }
  } else {
     console.warn('[firebase.ts] Firestore instance NOT obtained, likely due to missing projectId or app initialization failure.');
  }
} else {
  console.log('[firebase.ts] Firebase script not running in browser environment. db will be undefined.');
}

export { app, db };
