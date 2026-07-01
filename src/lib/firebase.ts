import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth, initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, browserPopupRedirectResolver } from 'firebase/auth';

const defaultFirebaseConfig = {
  projectId: "zany-camera-nnzsc",
  appId: "1:1011703841352:web:1e0c4bb3c5ed5e4b330e7d",
  apiKey: "AIzaSyDcszlgkDe8mzn5S4fPTGiPNbLfYOsQhuc",
  authDomain: "zany-camera-nnzsc.firebaseapp.com",
  storageBucket: "zany-camera-nnzsc.firebasestorage.app",
  messagingSenderId: "1011703841352",
};

const defaultDbId = "ai-studio-hisabkhata-6b16f910-95e2-45b2-9ed5-6329a7bfe4cd";

let firebaseConfig = defaultFirebaseConfig;
let dbId = defaultDbId;

try {
  const customConfigStr = localStorage.getItem("custom_firebase_config");
  if (customConfigStr) {
    const customConfig = JSON.parse(customConfigStr);
    if (customConfig.apiKey && customConfig.projectId) {
      firebaseConfig = {
        projectId: customConfig.projectId,
        appId: customConfig.appId || "",
        apiKey: customConfig.apiKey,
        authDomain: customConfig.authDomain || `${customConfig.projectId}.firebaseapp.com`,
        storageBucket: customConfig.storageBucket || `${customConfig.projectId}.firebasestorage.app`,
        messagingSenderId: customConfig.messagingSenderId || "",
      };
      dbId = customConfig.databaseId || "(default)";
    }
  }
} catch (e) {
  console.error("Error reading custom Firebase config:", e);
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = dbId && dbId !== "(default)" && dbId !== ""
  ? getFirestore(app, dbId)
  : getFirestore(app);

// Initialize auth with indexedDB local persistence explicitly to fix Capacitor logout issues
let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    popupRedirectResolver: browserPopupRedirectResolver
  });
} catch (e) {
  authInstance = getAuth(app); // fallback if already initialized
}
export const auth = authInstance;

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
