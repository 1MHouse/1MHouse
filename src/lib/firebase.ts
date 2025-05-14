
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Log the raw environment variable value as soon as the module is loaded
console.log('[firebase.ts] Raw NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
console.log('[firebase.ts] All NEXT_PUBLIC_ env vars:', Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith('NEXT_PUBLIC_'))));


// Ensure your .env.local file is in the src directory and is loaded by Next.js
// e.g., NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log('[firebase.ts] Firebase config object being used:', {
  apiKey: firebaseConfig.apiKey ? '***' : undefined,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId, // This is the crucial one
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId ? '***' : undefined,
});

if (!firebaseConfig.projectId) {
  console.error(
    "[firebase.ts] Firebase projectId is undefined. " +
    "Ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID is set in your environment " +
    "(e.g., .env.local or Firebase Studio settings) " +
    "and the Next.js development server was restarted."
  );
  // Not throwing error here to allow app to load for further debugging of env vars
  // in Firebase Studio, but Firestore will NOT work.
}

// Initialize Firebase
let app;
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
    // Not re-throwing here to allow app to load.
  }
} else {
  app = getApp();
  console.log('[firebase.ts] Existing Firebase app retrieved.');
}

let db;
if (app && firebaseConfig.projectId) { // Only try to get Firestore if app is initialized and projectId is present
  try {
    db = getFirestore(app);
    console.log('[firebase.ts] Firestore instance obtained.');
  } catch (e) {
    console.error('[firebase.ts] Error obtaining Firestore instance:', e)
  }
} else {
   console.warn('[firebase.ts] Firestore instance NOT obtained due to missing app initialization or projectId.');
}


export { app, db };

