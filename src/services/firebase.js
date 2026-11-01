import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyDummyKeyForDevPrimerApp2026",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "devprimer-visionux.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "devprimer-visionux",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "devprimer-visionux.appspot.com",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:123456789012:web:abcdef123456"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

function timeoutPromise(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms));
}

/**
 * Kullanıcının Firestore'daki XP ve Seviye verilerini anlık okur
 */
export async function getUserProgress(uid) {
  try {
    const userDocRef = doc(db, 'users', uid);
    const fetchDoc = getDoc(userDocRef);
    const snap = await Promise.race([fetchDoc, timeoutPromise(1000)]);
    if (snap && snap.exists()) {
      return snap.data();
    }
  } catch (error) {
    // Çevrimdışı yerel mod
  }
  return { uid, xp: 50, level: 1 };
}

/**
 * Kullanıcının XP ve Seviye verilerini Firestore'a anlık yazar (updateDoc)
 */
export async function syncProgress(uid, xp, level) {
  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, { uid, initializedAt: new Date().toISOString() }, { merge: true });
    const updateTask = updateDoc(userDocRef, {
      xp: xp,
      level: level,
      updatedAt: new Date().toISOString()
    });
    await Promise.race([updateTask, timeoutPromise(1500)]);
    console.log(`[Firestore Sync] User ${uid} -> XP: ${xp}, Level: ${level}`);
    return true;
  } catch (error) {
    return false;
  }
}
