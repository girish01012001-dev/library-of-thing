import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyBR-EXHFpZsvyqr328ig3eXT5bfE9-p2No",
  authDomain: "library-of-things-339a9.firebaseapp.com",
  projectId: "library-of-things-339a9",
  storageBucket: "library-of-things-339a9.firebasestorage.app",
  messagingSenderId: "452040546323",
  appId: "1:452040546323:web:3a8a83b5b9e61a37c207e6",
  measurementId: "G-DT88JHH1GW"
};

let cachedServices: { app: FirebaseApp; db: Firestore; auth: Auth } | null = null;

export function getFirebaseServices() {
  if (cachedServices) return cachedServices;
  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    cachedServices = { app, db, auth };
    return cachedServices;
  } catch {
    return null;
  }
}
