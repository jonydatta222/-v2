/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";
import { SaleItem, StoreInfo, ExpenseItem } from "../types";

interface SyncData {
  sales: SaleItem[];
  expenses?: ExpenseItem[];
  storeInfo: StoreInfo | null;
  lastSync?: string;
  app?: string;
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Drive Scopes
provider.addScope("https://www.googleapis.com/auth/drive.file");
provider.addScope("https://www.googleapis.com/auth/drive.appdata");

let isSigningIn = false;
let cachedAccessToken: string | null = localStorage.getItem(
  "google_sync_access_token",
);

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void,
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // Try to get token if logged in but token not in memory (Firebase token may need to be retrieved or re-authenticated)
        // If we don't have cachedAccessToken, we trigger failure so UI prompts login,
        // but let's allow persistent session. We store the login state in localStorage.
        const wasLoggedIn =
          localStorage.getItem("google_sync_logged_in") === "true";
        if (wasLoggedIn && !isSigningIn) {
          // Trigger sign-in flow or let user sign-in manually
          if (onAuthFailure) onAuthFailure();
        } else {
          if (onAuthFailure) onAuthFailure();
        }
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google Sign-In pop-up
export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to get access token from Google Auth");
    }

    cachedAccessToken = credential.accessToken;
    localStorage.setItem("google_sync_logged_in", "true");
    localStorage.setItem("google_sync_access_token", cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Google Sign-In Error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  localStorage.removeItem("google_sync_logged_in");
  localStorage.removeItem("google_sync_access_token");
};

const BACKUP_FILE_NAME = "hisab_khata_backup.json";

// Check if a backup exists on Google Drive and returns metadata
export const checkGoogleDriveBackup = async (
  token?: string,
): Promise<{ fileId: string; modifiedTime: string } | null> => {
  const accessToken = token || cachedAccessToken;
  if (!accessToken) return null;

  try {
    const res = await fetch("/api/gdrive/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accessToken }),
    });

    if (!res.ok) {
      if (res.status === 401) {
        await logout();
        throw new Error("Google session expired. Please sign in again.");
      }
      throw new Error("Failed to search Google Drive files");
    }
    const data = await res.json();
    if (data) {
      return {
        fileId: data.fileId,
        modifiedTime: data.modifiedTime,
      };
    }
    return null;
  } catch (error: any) {
    if (error.message !== "Google session expired. Please sign in again.") {
      console.error("Check Google Drive Backup Error:", error);
    }
    return null;
  }
};

// Upload/Sync sales list to Google Drive
export const backupToGoogleDrive = async (
  sales: SaleItem[],
  expenses: ExpenseItem[],
  storeInfo: StoreInfo | null,
  language: string = "bn",
): Promise<{ lastSync: string }> => {
  const accessToken = cachedAccessToken;
  if (!accessToken) throw new Error("গুগল অ্যাকাউন্ট সংযুক্ত নেই!");

  try {
    const res = await fetch("/api/gdrive/backup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accessToken,
        sales,
        expenses,
        storeInfo,
        language,
      }),
    });

    if (!res.ok) {
      if (res.status === 401) {
        await logout();
        throw new Error("Google session expired. Please sign in again.");
      }
      throw new Error("Failed to upload sales data to Google Drive");
    }

    const data = await res.json();
    localStorage.setItem("google_sync_last_time", data.lastSync);
    return { lastSync: data.lastSync };
  } catch (error: any) {
    if (error.message !== "Google session expired. Please sign in again.") {
      console.error("Backup to Google Drive failed:", error);
    }
    throw error;
  }
};

// Download and restore data from Google Drive
export const restoreFromGoogleDrive = async (): Promise<SyncData | null> => {
  const accessToken = cachedAccessToken;
  if (!accessToken) throw new Error("গুগল অ্যাকাউন্ট সংযুক্ত নেই!");

  try {
    const res = await fetch("/api/gdrive/restore", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accessToken }),
    });

    if (!res.ok) {
      if (res.status === 401) {
        await logout();
        throw new Error("Google session expired. Please sign in again.");
      }
      throw new Error("Failed to download backup content");
    }
    const backupData = await res.json();

    if (backupData && Array.isArray(backupData.sales)) {
      return {
        sales: backupData.sales,
        expenses: backupData.expenses || [],
        storeInfo: backupData.storeInfo || null,
      };
    }

    return null;
  } catch (error: any) {
    if (error.message !== "Google session expired. Please sign in again.") {
      console.error("Restore from Google Drive failed:", error);
    }
    throw error;
  }
};
