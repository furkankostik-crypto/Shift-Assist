import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyClQKxCYvn5jYsC_SoSeKqurzwCQJbvpHw',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'shift-assist-2430c.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'shift-assist-2430c',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'shift-assist-2430c.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '828997370200',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:828997370200:web:3f34873ed27f31a1abe52d',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-S8ZBRKFDHV',
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.apiKey !== 'your_firebase_api_key_here' &&
    firebaseConfig.projectId !== 'your_project_id'
  );
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    firestore = getFirestore(app);
  } catch (err) {
    console.warn('Firebase başlatılırken bir sorun oluştu:', err);
  }
}

export { app, auth, firestore, googleProvider };
