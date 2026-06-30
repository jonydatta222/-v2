import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  projectId: "zany-camera-nnzsc",
  appId: "1:1011703841352:web:1e0c4bb3c5ed5e4b330e7d",
  apiKey: "AIzaSyDcszlgkDe8mzn5S4fPTGiPNbLfYOsQhuc",
  authDomain: "zany-camera-nnzsc.firebaseapp.com",
  storageBucket: "zany-camera-nnzsc.firebasestorage.app",
  messagingSenderId: "1011703841352",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, "ai-studio-hisabkhata-6b16f910-95e2-45b2-9ed5-6329a7bfe4cd");
export const auth = getAuth(app);

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
