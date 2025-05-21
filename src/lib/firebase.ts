
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth'; // Import Firebase Auth

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
let db: Firestore | undefined;
let auth: Auth | undefined; // Declare auth variable

// Client-side execution only
if (typeof window !== 'undefined') {
  if (!firebaseConfig.projectId) {
    console.error(
      "[firebase.ts] Firebase projectId is undefined. " +
      "Ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID is set in your environment " +
      "(e.g., .env.local or Firebase Studio settings) " +
      "and the Next.js development server was restarted."
    );
  }

  if (!getApps().length) {
    try {
      if (firebaseConfig.projectId) { // Only initialize if projectId is present
        app = initializeApp(firebaseConfig);
        console.log('[firebase.ts] Firebase app initialized successfully.');
      } else {
        console.warn('[firebase.ts] Firebase app NOT initialized due to missing projectId.');
      }
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
      auth = getAuth(app); // Initialize Firebase Auth
      console.log('[firebase.ts] Firebase Auth instance obtained.');
    } catch (e) {
      console.error('[firebase.ts] Error obtaining Firestore or Auth instance:', e);
    }
  } else {
     console.warn('[firebase.ts] Firestore/Auth instance NOT obtained, likely due to missing projectId or app initialization failure.');
  }
} else {
  console.log('[firebase.ts] Firebase script not running in browser environment. db and auth will be undefined.');
}

export { app, db, auth }; // Export auth
