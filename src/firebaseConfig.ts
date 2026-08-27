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

export const firebaseConfig: FirebaseConfig = {
  apiKey: rawConfig.apiKey || "AIzaSyBoMi0RhuX8JN6Vh21Z9LSuml2lKIAEvS8",
  authDomain: rawConfig.authDomain || "b-fisio-app.firebaseapp.com",
  projectId: rawConfig.projectId || "b-fisio-app",
  storageBucket: rawConfig.storageBucket || "b-fisio-app.firebasestorage.app",
  messagingSenderId: rawConfig.messagingSenderId || "55085958555",
  appId: rawConfig.appId || "1:55085958555:web:9bf6cfee439db2073b0d3e",
  firestoreDatabaseId: rawConfig.firestoreDatabaseId || "(default)",
  measurementId: rawConfig.measurementId || "",
  oAuthClientId: rawConfig.oAuthClientId || "",
  recaptchaSiteKey: rawConfig.recaptchaSiteKey || ""
};

export const apiKey = firebaseConfig.apiKey;
export const authDomain = firebaseConfig.authDomain;
export const projectId = firebaseConfig.projectId;
export const storageBucket = firebaseConfig.storageBucket;
export const messagingSenderId = firebaseConfig.messagingSenderId;
export const appId = firebaseConfig.appId;
export const firestoreDatabaseId = firebaseConfig.firestoreDatabaseId;

export default firebaseConfig;

