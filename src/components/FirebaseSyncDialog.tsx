import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Cloud,
  CloudUpload,
  RefreshCw,
  CheckCircle2,
  Shield,
  DownloadCloud,
  LogOut,
  AlertCircle,
  ExternalLink,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import { SaleItem, StoreInfo } from "../types";
import { useLanguage } from "../LanguageContext";
import {
  firebaseSignIn,
  firebaseSignOut,
  backupToFirebase,
  restoreFromFirebase,
  checkFirebaseBackup,
  handleRedirectResult,
  firebaseSignInWithEmail,
  firebaseSignUpWithEmail,
  firebaseResetPassword,
} from "../lib/firebaseSync";
import { auth } from "../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

interface FirebaseSyncDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sales: SaleItem[];
  expenses: any[];
  storeInfo: StoreInfo | null;
  onRestoreSales: (restoredSales: SaleItem[]) => void;
  onRestoreExpenses: (restoredExpenses: any[]) => void;
  onRestoreStoreInfo: (storeInfo: StoreInfo | null) => void;
}

export const FirebaseSyncDialog: React.FC<FirebaseSyncDialogProps> = ({
  isOpen,
  onClose,
  sales,
  expenses,
  storeInfo,
  onRestoreSales,
  onRestoreExpenses,
  onRestoreStoreInfo,
}) => {
  const { t, language, formatNumber } = useLanguage();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasBackup, setHasBackup] = useState<boolean>(false);
  const [backupTime, setBackupTime] = useState<string | null>(null);
  const [checkingBackup, setCheckingBackup] = useState<boolean>(false);

  const [lastSync, setLastSync] = useState(() => {
    return localStorage.getItem("firebase_sync_last_time") || t("notSynced");
  });

  const [isInIframe, setIsInIframe] = useState(false);
  const [isAndroidAPK, setIsAndroidAPK] = useState(false);
  const [authMethod, setAuthMethod] = useState<"google" | "email">("google");
  const [emailMode, setEmailMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch (e) {
      setIsInIframe(true);
    }

    // Check if running inside Capacitor Android APK
    const cap = (window as any).Capacitor;
    if (cap && cap.getPlatform() === "android") {
      setIsAndroidAPK(true);
      setAuthMethod("email"); // default to email since Google redirect is blocked on WebView/APK
    }
  }, []);

  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const user = await handleRedirectResult();
        if (user) {
          const restoredData = await restoreFromFirebase();
          if (restoredData) {
            if (restoredData.sales) onRestoreSales(restoredData.sales);
            if (restoredData.expenses) onRestoreExpenses(restoredData.expenses);
            if (restoredData.storeInfo) onRestoreStoreInfo(restoredData.storeInfo);

            const dateObj = new Date();
            const langLocale = language === "bn" ? "bn-BD" : "en-US";
            const formattedTime =
              dateObj.toLocaleTimeString(langLocale, {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              }) +
              ", " +
              dateObj.toLocaleDateString(langLocale, {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
            setBackupTime(formattedTime);
            setHasBackup(true);
            
            setSyncStatus("success");
            alert("সফলভাবে লগইন হয়েছে এবং ক্লাউড ব্যাকআপ থেকে পূর্বের সকল ডাটা স্বয়ংক্রিয়ভাবে রিস্টোর করা হয়েছে!");
            setTimeout(() => setSyncStatus("idle"), 3000);
          }
        }
      } catch (err) {
        console.error("Redirect handle error:", err);
      }
    };
    checkRedirect();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user && isOpen) {
        checkForCloudBackup();
      }
    });
    return () => unsubscribe();
  }, [isOpen]);

  const checkForCloudBackup = async () => {
    setCheckingBackup(true);
    try {
      const backupMeta = await checkFirebaseBackup();
      if (backupMeta) {
        setHasBackup(true);
        const dateObj = new Date(backupMeta.modifiedTime);
        const langLocale = language === "bn" ? "bn-BD" : "en-US";
        const formattedTime =
          dateObj.toLocaleTimeString(langLocale, {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }) +
          ", " +
          dateObj.toLocaleDateString(langLocale, {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
        setBackupTime(formattedTime);
      } else {
        setHasBackup(false);
        setBackupTime(null);
      }
    } catch (err) {
      console.error("Failed to check firebase backup:", err);
    } finally {
      setCheckingBackup(false);
    }
  };

  const handleLogin = async () => {
    setSyncStatus("syncing");
    setErrorMessage(null);
    try {
      const user = await firebaseSignIn();
      if (user) {
        // Automatically check and restore backup if it exists
        try {
          const restoredData = await restoreFromFirebase();
          if (restoredData) {
            if (restoredData.sales) onRestoreSales(restoredData.sales);
            if (restoredData.expenses) onRestoreExpenses(restoredData.expenses);
            if (restoredData.storeInfo)
              onRestoreStoreInfo(restoredData.storeInfo);

            const dateObj = new Date();
            const langLocale = language === "bn" ? "bn-BD" : "en-US";
            const formattedTime =
              dateObj.toLocaleTimeString(langLocale, {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              }) +
              ", " +
              dateObj.toLocaleDateString(langLocale, {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
            setBackupTime(formattedTime);
            setHasBackup(true);

            setSyncStatus("success");
            alert(
              "সফলভাবে লগইন হয়েছে এবং ক্লাউড ব্যাকআপ থেকে পূর্বের সকল ডাটা স্বয়ংক্রিয়ভাবে রিস্টোর করা হয়েছে!",
            );
          } else {
            setSyncStatus("success");
          }
        } catch (restoreErr) {
          console.error("Auto restore failed on login:", restoreErr);
          setSyncStatus("success");
        }

        setTimeout(() => setSyncStatus("idle"), 3000);
        await checkForCloudBackup();
      }
    } catch (err: any) {
      console.error(err);
      setSyncStatus("error");

      let friendlyMessage = err.message || t("syncErrorGeneral");
      const errCode = err.code || "";
      const errMsg = err.message || "";

      if (
        errCode === "auth/operation-not-allowed" ||
        errMsg.includes("operation-not-allowed")
      ) {
        friendlyMessage =
          "আপনার ফায়ারবেস প্রজেক্টে Google Sign-In সচল করা নেই। অনুগ্রহ করে Firebase Console -> Authentication -> Sign-in method-এ গিয়ে Google চালু (Enable) করুন।";
      } else if (
        errCode === "auth/popup-blocked" ||
        errMsg.includes("popup-blocked")
      ) {
        friendlyMessage =
          "ব্রাউজার গুগল লগইন পপআপটি ব্লক করেছে! অনুগ্রহ করে আপনার ব্রাউজারের পপআপ ব্লকার বন্ধ করুন অথবা সরাসরি নতুন ট্যাবে অ্যাপটি খুলুন।";
      } else if (
        errCode === "auth/web-storage-unsupported" ||
        errMsg.includes("web-storage-unsupported")
      ) {
        friendlyMessage =
          "আইফ্রেমের ভেতরে ব্রাউজার কুকি ও স্টোরেজ ব্লক করার কারণে লগইন করা যাচ্ছে না। দয়া করে উপরের 'নতুন ট্যাবে অ্যাপ খুলুন' বাটনটি ব্যবহার করুন।";
      }

      setErrorMessage(friendlyMessage);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || (emailMode !== "forgot" && !password)) {
      setErrorMessage("অনুগ্রহ করে সব তথ্য সঠিক দিন।");
      return;
    }
    setSyncStatus("syncing");
    setErrorMessage(null);
    try {
      let user = null;
      if (emailMode === "signin") {
        user = await firebaseSignInWithEmail(email, password);
      } else if (emailMode === "signup") {
        user = await firebaseSignUpWithEmail(email, password);
        alert("সফলভাবে নতুন অ্যাকাউন্ট তৈরি করা হয়েছে!");
      } else if (emailMode === "forgot") {
        await firebaseResetPassword(email);
        alert("পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে!");
        setEmailMode("signin");
        setSyncStatus("idle");
        return;
      }

      if (user) {
        // Automatically check and restore backup if it exists
        try {
          const restoredData = await restoreFromFirebase();
          if (restoredData) {
            if (restoredData.sales) onRestoreSales(restoredData.sales);
            if (restoredData.expenses) onRestoreExpenses(restoredData.expenses);
            if (restoredData.storeInfo) onRestoreStoreInfo(restoredData.storeInfo);

            const dateObj = new Date();
            const langLocale = language === "bn" ? "bn-BD" : "en-US";
            const formattedTime =
              dateObj.toLocaleTimeString(langLocale, {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              }) +
              ", " +
              dateObj.toLocaleDateString(langLocale, {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
            setBackupTime(formattedTime);
            setHasBackup(true);

            setSyncStatus("success");
            alert(
              "সফলভাবে লগইন হয়েছে এবং ক্লাউড ব্যাকআপ থেকে পূর্বের সকল ডাটা স্বয়ংক্রিয়ভাবে রিস্টোর করা হয়েছে!",
            );
          } else {
            setSyncStatus("success");
          }
        } catch (restoreErr) {
          console.error("Auto restore failed on login:", restoreErr);
          setSyncStatus("success");
        }

        setTimeout(() => setSyncStatus("idle"), 3000);
        await checkForCloudBackup();
      }
    } catch (err: any) {
      console.error(err);
      setSyncStatus("error");
      let friendlyMessage = err.message || "লগইন করতে ব্যর্থ হয়েছে!";
      const errCode = err.code || "";
      const errMsg = err.message || "";

      if (errCode === "auth/invalid-credential" || errMsg.includes("invalid-credential") || errMsg.includes("wrong-password")) {
        friendlyMessage = "ভুল ইমেইল অথবা পাসওয়ার্ড দিয়েছেন!";
      } else if (errCode === "auth/email-already-in-use" || errMsg.includes("email-already-in-use")) {
        friendlyMessage = "এই ইমেইল দিয়ে ইতিপূর্বে অ্যাকাউন্ট খোলা হয়েছে!";
      } else if (errCode === "auth/weak-password" || errMsg.includes("weak-password")) {
        friendlyMessage = "পাসওয়ার্ড অত্যন্ত দুর্বল! কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন।";
      } else if (errCode === "auth/invalid-email" || errMsg.includes("invalid-email")) {
        friendlyMessage = "সঠিক ফরম্যাটে ইমেইল এড্রেস দিন।";
      } else if (errCode === "auth/user-not-found" || errMsg.includes("user-not-found")) {
        friendlyMessage = "এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট খুঁজে পাওয়া যায়নি!";
      }
      setErrorMessage(friendlyMessage);
    }
  };

  const handleLogout = async () => {
    try {
      await firebaseSignOut();
      setSyncStatus("idle");
      setHasBackup(false);
      setBackupTime(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSyncNow = async () => {
    if (!currentUser) return;
    setSyncStatus("syncing");
    setErrorMessage(null);

    try {
      const result = await backupToFirebase(
        sales,
        expenses,
        storeInfo,
        language,
      );
      setSyncStatus("success");
      setLastSync(result.lastSync);
      await checkForCloudBackup();
      setTimeout(() => setSyncStatus("idle"), 4000);
    } catch (err: any) {
      console.error(err);
      setSyncStatus("error");
      setErrorMessage(
        err.message || "ফায়ারবেসে ব্যাকআপ আপলোড করতে ব্যর্থ হয়েছে!",
      );
    }
  };

  const handleRestoreNow = async () => {
    if (!currentUser) return;

    const confirmed = window.confirm(
      "আপনি কি ফায়ারবেস ব্যাকআপ রিস্টোর করতে চান? এটি আপনার বর্তমান হিসাবের ডাটা সম্পূর্ণ প্রতিস্থাপন করবে।",
    );
    if (!confirmed) return;

    setSyncStatus("syncing");
    setErrorMessage(null);

    try {
      const restoredData = await restoreFromFirebase();
      if (restoredData) {
        if (restoredData.sales) onRestoreSales(restoredData.sales);
        if (restoredData.expenses) onRestoreExpenses(restoredData.expenses);
        if (restoredData.storeInfo) onRestoreStoreInfo(restoredData.storeInfo);

        setSyncStatus("success");
        alert("খাতার হিসাব সফলভাবে রিস্টোর করা হয়েছে!");
        setTimeout(() => setSyncStatus("idle"), 4000);
      } else {
        throw new Error("কোনো ব্যাকআপ ফাইল পাওয়া যায়নি!");
      }
    } catch (err: any) {
      console.error(err);
      setSyncStatus("error");
      setErrorMessage(err.message || "রিস্টোর করতে ব্যর্থ হয়েছে!");
    }
  };

  const handleLocalExport = () => {
    try {
      const backupData = {
        sales,
        expenses,
        storeInfo,
        version: "1.0",
        exportedAt: new Date().toISOString()
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute(
        "download",
        `hisab_khata_offline_backup_${new Date().toISOString().slice(0, 10)}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      alert("সফলভাবে লোকাল অফলাইন ব্যাকআপ ফাইলটি আপনার ডিভাইসে ডাউনলোড হয়েছে!");
    } catch (err: any) {
      console.error(err);
      alert("অফলাইন ব্যাকআপ তৈরি করতে সমস্যা হয়েছে!");
    }
  };

  const handleLocalImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = event.target.files?.[0];
    if (!file) return;

    fileReader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed && (Array.isArray(parsed.sales) || Array.isArray(parsed.expenses))) {
          const confirmed = window.confirm(
            "আপনি কি এই ব্যাকআপ ফাইল থেকে সকল ডাটা রিস্টোর করতে চান? এটি আপনার বর্তমান ফোনের সব হিসাব সম্পূর্ণ প্রতিস্থাপন (Overwrite) করবে এবং বর্তমান ডাটা মুছে যাবে!"
          );
          if (!confirmed) return;

          if (parsed.sales) onRestoreSales(parsed.sales);
          if (parsed.expenses) onRestoreExpenses(parsed.expenses);
          if (parsed.storeInfo) onRestoreStoreInfo(parsed.storeInfo);

          alert("সফলভাবে অফলাইন ফাইল থেকে সকল খাতার হিসাব রিস্টোর করা হয়েছে!");
          onClose();
        } else {
          alert("ভুল ফাইল ফরম্যাট! অনুগ্রহ করে সঠিক হিসাব খাতা অফলাইন ব্যাকআপ ফাইল (.json) সিলেক্ট করুন।");
        }
      } catch (err) {
        console.error(err);
        alert("ফাইলটি পড়তে সমস্যা হয়েছে! ব্যাকআপ ফাইলটি সঠিক কিনা যাচাই করুন।");
      }
    };
    fileReader.readAsText(file);
    event.target.value = "";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col will-change-transform"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-50 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    ফায়ারবেস ব্যাকআপ
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    নিরাপদ ক্লাউড ব্যাকআপ সিঙ্ক
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-200/50 rounded-lg transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl flex gap-2.5 text-rose-800 text-xs font-semibold">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-600 flex-shrink-0" />
                  <p>{errorMessage}</p>
                </div>
              )}

              {!currentUser ? (
                <div className="text-center space-y-4 py-3">
                  <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto text-orange-600">
                    <CloudUpload className="w-8 h-8 animate-pulse" />
                  </div>

                  {/* Android APK Specific Warning */}
                  {isAndroidAPK && (
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-left text-xs text-amber-900 space-y-1.5 max-w-xs mx-auto shadow-xs">
                      <p className="font-bold flex items-center gap-1.5 text-amber-900">
                        <Shield className="w-4 h-4 text-amber-600" />
                        অ্যান্ড্রয়েড অ্যাপ তথ্য:
                      </p>
                      <p className="text-[11px] leading-relaxed text-amber-800 font-medium">
                        অ্যান্ড্রয়েড সিকিউরিটি পলিসি ও গুগল রিডাইরেক্ট জটিলতার কারণে সরাসরি গুগল লগইন সচল থাকে না। অনুগ্রহ করে নিচে ইমেইল ও পাসওয়ার্ড ব্যবহার করে লগইন বা অ্যাকাউন্ট তৈরি করুন।
                      </p>
                    </div>
                  )}

                  {/* Auth Method Switcher (Only on Web/IFrame) */}
                  {!isAndroidAPK && (
                    <div className="flex bg-slate-100 p-1 rounded-xl max-w-xs mx-auto mb-4 border border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMethod("google");
                          setErrorMessage(null);
                        }}
                        className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          authMethod === "google"
                            ? "bg-white text-slate-950 shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Google লগইন
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMethod("email");
                          setErrorMessage(null);
                        }}
                        className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          authMethod === "email"
                            ? "bg-white text-slate-950 shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        ইমেইল লগইন
                      </button>
                    </div>
                  )}

                  {authMethod === "email" ? (
                    /* Email Form */
                    <form onSubmit={handleEmailAuth} className="space-y-4 max-w-xs mx-auto text-left">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600 block">ইমেইল ঠিকানা</label>
                        <div className="relative">
                          <Mail className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="example@gmail.com"
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all"
                          />
                        </div>
                      </div>

                      {emailMode !== "forgot" && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-[11px] font-bold text-slate-600 block">পাসওয়ার্ড</label>
                            {emailMode === "signin" && (
                              <button
                                type="button"
                                onClick={() => setEmailMode("forgot")}
                                className="text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                              >
                                পাসওয়ার্ড ভুলে গেছেন?
                              </button>
                            )}
                          </div>
                          <div className="relative">
                            <Lock className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                            <input
                              type={showPassword ? "text" : "password"}
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="কমপক্ষে ৬টি ক্যারেক্টার দিন"
                              className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={syncStatus === "syncing"}
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {syncStatus === "syncing" ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>প্রসেস হচ্ছে...</span>
                          </>
                        ) : emailMode === "signin" ? (
                          <>
                            <UserCheck className="w-4 h-4" />
                            <span>সাইন-ইন করুন</span>
                          </>
                        ) : emailMode === "signup" ? (
                          <>
                            <UserCheck className="w-4 h-4" />
                            <span>অ্যাকাউন্ট তৈরি করুন</span>
                          </>
                        ) : (
                          <span>পাসওয়ার্ড রিসেট লিংক পাঠান</span>
                        )}
                      </button>

                      <div className="text-center pt-1">
                        {emailMode === "signin" ? (
                          <p className="text-[11px] text-slate-500">
                            কোনো অ্যাকাউন্ট নেই?{" "}
                            <button
                              type="button"
                              onClick={() => setEmailMode("signup")}
                              className="font-bold text-slate-900 underline hover:text-slate-800 cursor-pointer"
                            >
                              নতুন অ্যাকাউন্ট তৈরি করুন
                            </button>
                          </p>
                        ) : emailMode === "signup" ? (
                          <p className="text-[11px] text-slate-500">
                            ইতিমধ্যে অ্যাকাউন্ট আছে?{" "}
                            <button
                              type="button"
                              onClick={() => setEmailMode("signin")}
                              className="font-bold text-slate-900 underline hover:text-slate-800 cursor-pointer"
                            >
                              সাইন-ইন করুন
                            </button>
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEmailMode("signin")}
                            className="text-[11px] font-bold text-slate-900 underline hover:text-slate-800 cursor-pointer"
                          >
                            সাইন-ইন পেজে ফিরে যান
                          </button>
                        )}
                      </div>
                    </form>
                  ) : (
                    /* Google Login UI (Shown on Web) */
                    <div className="space-y-4">
                      {isInIframe && (
                        <div className="p-4 bg-indigo-50/80 border border-indigo-100 rounded-2xl text-left text-xs text-indigo-950 space-y-2.5 max-w-xs mx-auto shadow-xs">
                          <p className="font-bold flex items-center gap-1.5 text-indigo-900">
                            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                            আইফ্রেম ডিটেক্ট করা হয়েছে:
                          </p>
                          <p className="text-[11px] leading-relaxed text-indigo-800">
                            ব্রাউজারের সিকিউরিটি পলিসির কারণে আইফ্রেমের ভেতর গুগল
                            পপআপ লগইন ব্লক হয়। নিচের বাটনটিতে ক্লিক করে সরাসরি নতুন
                            ট্যাবে অ্যাপটি খুলুন এবং লগইন সম্পন্ন করুন।
                          </p>
                          <button
                            onClick={() =>
                              window.open(window.location.href, "_blank")
                            }
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-xl shadow-md shadow-indigo-600/10 hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            নতুন ট্যাবে অ্যাপ খুলুন
                          </button>
                        </div>
                      )}

                      <div className="space-y-1.5 max-w-xs mx-auto">
                        <h4 className="font-bold text-slate-800 text-sm">
                          গুগল অ্যাকাউন্ট যুক্ত করুন
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          গুগল ড্রাইভের সেশন বারবার শেষ হয়ে গেলে ফায়ারবেস ব্যাকআপ
                          ব্যবহার করুন।
                        </p>
                      </div>

                      <button
                        onClick={handleLogin}
                        disabled={syncStatus === "syncing"}
                        className="w-full max-w-xs mx-auto py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                      >
                        {syncStatus === "syncing" ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>রক্ষা করা হচ্ছে...</span>
                          </>
                        ) : (
                          <>
                            <span>Google দিয়ে লগইন করুন</span>
                          </>
                        )}
                      </button>

                      <div className="p-3.5 bg-amber-50/70 border border-amber-100 rounded-2xl text-left text-xs text-amber-900 space-y-1.5 max-w-xs mx-auto">
                        <p className="font-bold flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-amber-700" />
                          লগইন কাজ না করলে করনীয়:
                        </p>
                        <p className="text-[10px] sm:text-[11px] leading-relaxed text-amber-800">
                          আইফ্রেমের সীমাবদ্ধতার কারণে অনেক সময় ব্রাউজারে পপআপ ব্লক
                          হয়। সমস্যা এড়াতে চাইলে আপনার
                          <a
                            href="https://console.firebase.google.com/project/zany-camera-nnzsc/authentication/settings"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold underline ml-1 text-amber-950 hover:text-amber-900"
                          >
                            Firebase Settings
                          </a>
                          -এ নিচের দুটি ডোমেইন <strong>Authorized Domains</strong>-এ
                          যুক্ত করুন:
                        </p>
                        <div className="p-2 bg-white/80 border border-amber-100/50 rounded-xl font-mono text-[9px] text-slate-700 select-all space-y-1">
                          <div className="truncate">
                            ais-dev-mhhmjbreiv2zflqgoeem73-273317504244.asia-southeast1.run.app
                          </div>
                          <div className="truncate">
                            ais-pre-mhhmjbreiv2zflqgoeem73-273317504244.asia-southeast1.run.app
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Local Offline Backup Card */}
                  <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-3 mt-4 text-left">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">
                          ১০০% অফলাইন ব্যাকআপ (সহজ ও নির্ভরযোগ্য)
                        </h4>
                        <p className="text-[10px] text-slate-400 font-medium">
                          কোনো লগইন বা ইন্টারনেট লাগবে না
                        </p>
                      </div>
                    </div>

                    <p className="text-[10px] leading-relaxed text-slate-500 font-medium">
                      আপনার ফোনের মেমরিতে একটি <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-600">.json</code> ফাইল হিসেবে পুরো খাতার হিসাব ডাউনলোড করে নিরাপদে সংরক্ষণ করুন। পরে যেকোনো ফোনে বা নতুন অ্যাপে এই ফাইলটি সিলেক্ট করে সব হিসাব সেকেন্ডে রিস্টোর করতে পারবেন।
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={handleLocalExport}
                        className="py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-[10px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <DownloadCloud className="w-3.5 h-3.5 text-slate-500" />
                        <span>ফাইল ডাউনলোড করুন</span>
                      </button>

                      <label className="py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-[10px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs text-center">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>ফাইল থেকে রিস্টোর</span>
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleLocalImport}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-base">
                        {currentUser.email
                          ? currentUser.email.charAt(0).toUpperCase()
                          : "U"}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800">
                          অ্যাকাউন্ট সংযুক্ত
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono font-medium truncate max-w-[180px]">
                          {currentUser.email || "সংযুক্ত অ্যাকাউন্ট"}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-600 px-2.5 py-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>লগআউট</span>
                    </button>
                  </div>

                  <div className="p-4 border border-orange-50 bg-orange-50/10 rounded-2xl space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">
                        সিঙ্কের অবস্থা
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        মোট {formatNumber(sales.length)} টি হিসাব এন্ট্রি
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-700">
                          বর্তমান ডিভাইস ব্যাকআপ
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                          সর্বশেষ আপলোড: {lastSync}
                        </div>
                      </div>

                      {syncStatus === "syncing" ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>সিঙ্ক হচ্ছে...</span>
                        </div>
                      ) : syncStatus === "success" ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>সফল হয়েছে</span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">
                          প্রস্তুত আছে
                        </span>
                      )}
                    </div>

                    {syncStatus === "syncing" && (
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 1.8, ease: "easeInOut" }}
                          className="h-full bg-orange-600"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-2 pt-2">
                      <button
                        onClick={handleSyncNow}
                        disabled={syncStatus === "syncing"}
                        className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CloudUpload className="w-4 h-4" />
                        <span>ফায়ারবেসে ব্যাকআপ রাখুন</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-4 border border-slate-100 bg-slate-50/50 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700">
                        ফায়ারবেস ব্যাকআপ রিস্টোর
                      </h4>
                      {checkingBackup ? (
                        <span className="text-[10px] text-slate-400 animate-pulse">
                          খোঁজা হচ্ছে...
                        </span>
                      ) : null}
                    </div>

                    {hasBackup ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-sm block w-fit mb-1">
                              ব্যাকআপ পাওয়া গেছে
                            </span>
                            <span className="text-xs font-bold text-slate-800 block">
                              {backupTime}
                            </span>
                          </div>
                          <button
                            onClick={handleRestoreNow}
                            disabled={syncStatus === "syncing"}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <DownloadCloud className="w-3.5 h-3.5" />
                            <span>রিস্টোর করুন</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-white border border-slate-100 rounded-xl text-slate-400 text-xs font-medium">
                        {checkingBackup
                          ? "ক্লাউড ব্যাকআপ চেক করা হচ্ছে..."
                          : "কোনো ব্যাকআপ পাওয়া যায়নি"}
                      </div>
                    )}
                  </div>

                  {/* Local Offline Backup Card (Always accessible alternative) */}
                  <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-3 text-left">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">
                          ১০০% অফলাইন ব্যাকআপ (সহজ ও নির্ভরযোগ্য)
                        </h4>
                        <p className="text-[10px] text-slate-400 font-medium">
                          কোনো লগইন বা ইন্টারনেট লাগবে না
                        </p>
                      </div>
                    </div>

                    <p className="text-[10px] leading-relaxed text-slate-500 font-medium">
                      আপনার ফোনের মেমরিতে একটি <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-600">.json</code> ফাইল হিসেবে পুরো খাতার হিসাব ডাউনলোড করে নিরাপদে সংরক্ষণ করুন। পরে যেকোনো ফোনে বা নতুন অ্যাপে এই ফাইলটি সিলেক্ট করে সব হিসাব সেকেন্ডে রিস্টোর করতে পারবেন।
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={handleLocalExport}
                        className="py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-[10px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <DownloadCloud className="w-3.5 h-3.5 text-slate-500" />
                        <span>ফাইল ডাউনলোড করুন</span>
                      </button>

                      <label className="py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-[10px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs text-center">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>ফাইল থেকে রিস্টোর</span>
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleLocalImport}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex gap-2.5">
                <Shield className="w-4.5 h-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-emerald-800 block">
                    ডাটা সম্পূর্ণ সুরক্ষিত ও অটো-সিঙ্ক সক্রিয়
                  </span>
                  <span className="text-[10px] text-emerald-600 leading-relaxed font-medium block">
                    আপনার যেকোনো নতুন হিসাব এন্ট্রি, খরচ বা পরিবর্তন করার সাথে সাথে ৩ সেকেন্ডের মধ্যে স্বয়ংক্রিয়ভাবে (Automatically) ফায়ারবেস ক্লাউডে ব্যাকআপ সেভ হয়ে যায়।
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer text-slate-600"
              >
                {t("cancel")}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
