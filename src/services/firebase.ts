import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from '../firebaseConfig';

let app: FirebaseApp;
let firestoreDb: Firestore;
let isConfigured = false;

try {
  if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    // Check if custom firestoreDatabaseId is valid and not (default)
    const customDbId = firebaseConfig.firestoreDatabaseId;
    if (customDbId && customDbId !== '(default)' && customDbId !== 'default' && customDbId.trim() !== '') {
      try {
        firestoreDb = getFirestore(app, customDbId);
      } catch (err) {
        console.warn(`Could not connect to custom Firestore database ID "${customDbId}", falling back to default database:`, err);
        firestoreDb = getFirestore(app);
      }
    } else {
      firestoreDb = getFirestore(app);
    }
    isConfigured = true;
  }
} catch (error) {
  console.warn('Firebase initialization error:', error);
}

export const firebaseApp = app!;
export const db = firestoreDb!;
export const isFirebaseReady = isConfigured;
export { firebaseConfig };


