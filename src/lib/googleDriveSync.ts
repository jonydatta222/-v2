/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth } from "./firebase";
import { SaleItem, StoreInfo, ExpenseItem } from "../types";

interface SyncData {
  sales: SaleItem[];
  expenses?: ExpenseItem[];
  storeInfo: StoreInfo | null;
  lastSync?: string;
  app?: string;
}

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
    if (
      error.code === "auth/popup-blocked" ||
      error.code === "auth/web-storage-unsupported" ||
      error.message?.includes("popup")
    ) {
      console.log("Attempting redirect fallback...");
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const googleHandleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
        localStorage.setItem("google_sync_logged_in", "true");
        localStorage.setItem("google_sync_access_token", cachedAccessToken);
        return { user: result.user, accessToken: cachedAccessToken };
      }
    }
  } catch (error) {
    console.error("Google Redirect Result Error:", error);
  }
  return null;
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string, email?: string) => {
  cachedAccessToken = token;
  localStorage.setItem("google_sync_logged_in", "true");
  localStorage.setItem("google_sync_access_token", token);
  if (email) {
    localStorage.setItem("google_sync_user_email", email);
  }
};

export const handleTokenExpiry = () => {
  cachedAccessToken = null;
  localStorage.removeItem("google_sync_logged_in");
  localStorage.removeItem("google_sync_access_token");
};

export const logout = async () => {
  await auth.signOut();
  handleTokenExpiry();
};

const BACKUP_FILE_NAME = "hisab_khata_backup.json";

// Check if a backup exists on Google Drive and returns metadata
export const checkGoogleDriveBackup = async (
  token?: string,
): Promise<{ fileId: string; modifiedTime: string } | null> => {
  const accessToken = token || cachedAccessToken;
  if (!accessToken) return null;

  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILE_NAME}' and trashed=false&fields=files(id,name,modifiedTime)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!res.ok) {
      if (res.status === 401) {
        handleTokenExpiry();
        throw new Error("Google session expired. Please sign in again.");
      }
      throw new Error("Failed to search Google Drive files");
    }
    const data = await res.json();
    const files = data.files || [];
    if (files.length > 0) {
      return {
        fileId: files[0].id,
        modifiedTime: files[0].modifiedTime,
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
    // 1. Search if backup file already exists
    const checkResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILE_NAME}' and trashed=false&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!checkResponse.ok) {
      if (checkResponse.status === 401) {
        handleTokenExpiry();
        throw new Error("Google session expired. Please sign in again.");
      }
      throw new Error("Failed to search Google Drive files");
    }

    const checkData = await checkResponse.json();
    const files = checkData.files || [];
    let fileId = files.length > 0 ? files[0].id : null;

    // 2. If it does not exist, create the file metadata first
    if (!fileId) {
      const createRes = await fetch(
        "https://www.googleapis.com/drive/v3/files",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: BACKUP_FILE_NAME,
            mimeType: "application/json",
          }),
        },
      );

      if (!createRes.ok) {
        throw new Error("Failed to create file metadata");
      }

      const createData = await createRes.json();
      fileId = createData.id;
    }

    if (!fileId) {
      throw new Error("Could not resolve Google Drive File ID");
    }

    // 3. Upload/Update the actual sales data content (as media)
    const uploadData = {
      sales,
      expenses,
      storeInfo,
      lastSync: new Date().toISOString(),
      app: "HishabKhata",
    };

    const uploadRes = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(uploadData),
      },
    );

    if (!uploadRes.ok) {
      throw new Error("Failed to upload sales data to Google Drive");
    }

    // Format current local time in localized representation
    const locale = language === "bn" ? "bn-BD" : "en-US";
    const nowStr =
      new Date().toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }) +
      ", " +
      new Date().toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
      });

    localStorage.setItem("google_sync_last_time", nowStr);
    return { lastSync: nowStr };
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
    // 1. Search if backup file already exists
    const checkResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILE_NAME}' and trashed=false&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!checkResponse.ok) {
      if (checkResponse.status === 401) {
        handleTokenExpiry();
        throw new Error("Google session expired. Please sign in again.");
      }
      throw new Error("Failed to search Google Drive files");
    }

    const checkData = await checkResponse.json();
    const files = checkData.files || [];
    const fileId = files.length > 0 ? files[0].id : null;

    if (!fileId) {
      throw new Error("গুগল ড্রাইভে কোনো ব্যাকআপ ফাইল পাওয়া যায়নি!");
    }

    // 2. Download contents
    const getFileRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!getFileRes.ok) {
      throw new Error("Failed to download backup content");
    }

    const backupData = await getFileRes.json();

    if (backupData && Array.isArray(backupData.sales)) {
      return {
        sales: backupData.sales,
        expenses: backupData.expenses || [],
        storeInfo: backupData.storeInfo || null,
      };
    } else if (Array.isArray(backupData)) {
       return {
        sales: backupData as any,
        expenses: [],
        storeInfo: null,
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
