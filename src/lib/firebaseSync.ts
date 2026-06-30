import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  browserPopupRedirectResolver,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { SaleItem, StoreInfo } from "../types";

const provider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const firebaseSignIn = async () => {
  try {
    const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    return result.user;
  } catch (error: any) {
    console.error("Firebase SignIn Error", error);
    // If popups are blocked or unsupported (like inside a WebView/APK)
    if (
      error.code === "auth/popup-blocked" ||
      error.code === "auth/web-storage-unsupported" ||
      error.message?.includes("popup")
    ) {
      console.log("Attempting redirect fallback...");
      await signInWithRedirect(auth, provider, browserPopupRedirectResolver);
      return null;
    }
    throw error;
  }
};

export const handleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth, browserPopupRedirectResolver);
    return result?.user || null;
  } catch (error) {
    console.error("Firebase Redirect Result Error", error);
    return null;
  }
};

export const firebaseSignOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Firebase SignOut Error", error);
    throw error;
  }
};

export const backupToFirebase = async (
  sales: SaleItem[],
  expenses: any[],
  storeInfo: StoreInfo | null,
  language: string = "bn",
) => {
  if (!auth.currentUser) throw new Error("Not authenticated");

  const userId = auth.currentUser.uid;
  const path = `backups/${userId}`;
  const backupRef = doc(db, "backups", userId);

  try {
    await setDoc(backupRef, {
      sales,
      expenses,
      storeInfo,
      updatedAt: serverTimestamp(),
    });

    const locale = language === "bn" ? "bn-BD" : "en-US";
    const nowStr =
      new Date().toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }) +
      ", " +
      new Date().toLocaleDateString(locale);
    localStorage.setItem("firebase_sync_last_time", nowStr);

    return { lastSync: nowStr };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
};

export const checkFirebaseBackup = async () => {
  if (!auth.currentUser) return null;

  const userId = auth.currentUser.uid;
  const path = `backups/${userId}`;
  const backupRef = doc(db, "backups", userId);

  try {
    const snap = await getDoc(backupRef);
    if (snap.exists()) {
      const data = snap.data();
      const updatedDate = data.updatedAt ? data.updatedAt.toDate() : new Date();
      return { modifiedTime: updatedDate.toISOString() };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};

export const restoreFromFirebase = async () => {
  if (!auth.currentUser) throw new Error("Not authenticated");

  const userId = auth.currentUser.uid;
  const path = `backups/${userId}`;
  const backupRef = doc(db, "backups", userId);

  try {
    const snap = await getDoc(backupRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    throw error;
  }
};
