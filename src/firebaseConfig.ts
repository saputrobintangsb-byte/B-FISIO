import rawConfig from '../firebase-applet-config.json';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId?: string;
  measurementId?: string;
  oAuthClientId?: string;
  recaptchaSiteKey?: string;
}

const env = (import.meta as any).env || {};

export const firebaseConfig: FirebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || rawConfig?.apiKey || "AIzaSyBoMi0RhuX8JN6Vh21Z9LSuml2lKIAEvS8",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || rawConfig?.authDomain || "b-fisio-app.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || rawConfig?.projectId || "b-fisio-app",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || rawConfig?.storageBucket || "b-fisio-app.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || rawConfig?.messagingSenderId || "55085958555",
  appId: env.VITE_FIREBASE_APP_ID || rawConfig?.appId || "1:55085958555:web:9bf6cfee439db2073b0d3e",
  firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID || rawConfig?.firestoreDatabaseId || "(default)",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || rawConfig?.measurementId || "",
  oAuthClientId: env.VITE_FIREBASE_OAUTH_CLIENT_ID || rawConfig?.oAuthClientId || "55085958555-web.apps.googleusercontent.com",
  recaptchaSiteKey: env.VITE_FIREBASE_RECAPTCHA_SITE_KEY || rawConfig?.recaptchaSiteKey || ""
};

export const apiKey = firebaseConfig.apiKey;
export const authDomain = firebaseConfig.authDomain;
export const projectId = firebaseConfig.projectId;
export const storageBucket = firebaseConfig.storageBucket;
export const messagingSenderId = firebaseConfig.messagingSenderId;
export const appId = firebaseConfig.appId;
export const firestoreDatabaseId = firebaseConfig.firestoreDatabaseId;

export default firebaseConfig;

