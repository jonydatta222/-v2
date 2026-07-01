/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Cloud, 
  CloudUpload, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Shield, 
  ArrowRight, 
  DownloadCloud, 
  LogOut,
  AlertCircle,
  Upload,
  FileSpreadsheet
} from 'lucide-react';
import { SaleItem, StoreInfo } from '../types';
import { useLanguage } from '../LanguageContext';
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  backupToGoogleDrive, 
  restoreFromGoogleDrive, 
  checkGoogleDriveBackup,
  getAccessToken,
  googleHandleRedirectResult,
  setAccessToken
} from '../lib/googleDriveSync';

interface GoogleSyncDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sales: SaleItem[];
  expenses: any[]; // Or ExpenseItem if imported
  userEmail: string;
  storeInfo: StoreInfo | null;
  onRestoreSales: (restoredSales: SaleItem[]) => void;
  onRestoreExpenses: (restoredExpenses: any[]) => void;
  onRestoreStoreInfo: (storeInfo: StoreInfo | null) => void;
}

export const GoogleSyncDialog: React.FC<GoogleSyncDialogProps> = ({
  isOpen,
  onClose,
  sales,
  expenses,
  userEmail,
  storeInfo,
  onRestoreSales,
  onRestoreExpenses,
  onRestoreStoreInfo,
}) => {
  const { t, language, formatNumber } = useLanguage();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasBackup, setHasBackup] = useState<boolean>(false);
  const [backupTime, setBackupTime] = useState<string | null>(null);
  const [checkingBackup, setCheckingBackup] = useState<boolean>(false);

  const [lastSync, setLastSync] = useState(() => {
    return localStorage.getItem('google_sync_last_time') || t('notSynced');
  });

  // Handle redirect result automatically
  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const result = await googleHandleRedirectResult();
        if (result?.accessToken) {
          setIsLoggedIn(true);
          checkForCloudBackup(result.accessToken);
        }
      } catch (err) {
        console.error("Redirect handler error:", err);
      }
    };
    handleRedirect();
  }, []);

  // Watch for Auth changes on mount and whenever dialog opens
  useEffect(() => {
    if (isOpen) {
      const unsubscribe = initAuth(
        (user, token) => {
          setIsLoggedIn(true);
          checkForCloudBackup(token);
        },
        () => {
          setIsLoggedIn(false);
        }
      );
      return () => unsubscribe();
    }
  }, [isOpen]);

  // Check if a backup file exists in the user's Google Drive
  const checkForCloudBackup = async (token?: string) => {
    setCheckingBackup(true);
    try {
      const backupMeta = await checkGoogleDriveBackup(token);
      if (backupMeta) {
        setHasBackup(true);
        // Format the ISO modified time nicely
        const dateObj = new Date(backupMeta.modifiedTime);
        const langLocale = language === 'bn' ? 'bn-BD' : 'en-US';
        const formattedTime = dateObj.toLocaleTimeString(langLocale, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }) + ', ' + dateObj.toLocaleDateString(langLocale, {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        setBackupTime(formattedTime);
      } else {
        setHasBackup(false);
        setBackupTime(null);
      }
    } catch (err) {
      console.error('Failed to check cloud backup:', err);
    } finally {
      setCheckingBackup(false);
    }
  };

  const handleLogin = async () => {
    setSyncStatus('syncing');
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setIsLoggedIn(true);
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 3000);
        // Check backup right after login
        await checkForCloudBackup(result.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      setSyncStatus('error');
      setErrorMessage(err.message || t('syncErrorGeneral'));
      if (err.message?.includes('network-request-failed')) {
        setErrorMessage(t('syncErrorBlocked'));
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsLoggedIn(false);
      setSyncStatus('idle');
      setHasBackup(false);
      setBackupTime(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSyncNow = async () => {
    if (!isLoggedIn) return;
    setSyncStatus('syncing');
    setErrorMessage(null);
    
    try {
      const result = await backupToGoogleDrive(sales, expenses, storeInfo, language);
      setSyncStatus('success');
      setLastSync(result.lastSync);
      // Re-verify the cloud backup info
      await checkForCloudBackup();
      setTimeout(() => setSyncStatus('idle'), 4000);
    } catch (err: any) {
      console.error(err);
      setSyncStatus('error');
      setErrorMessage(err.message || 'গুগল ড্রাইভে ব্যাকআপ আপলোড করতে ব্যর্থ হয়েছে!');
    }
  };

  const handleRestoreNow = async () => {
    if (!isLoggedIn) return;
    
    const confirmed = window.confirm(
      'আপনি কি গুগল ড্রাইভের ব্যাকআপ রিস্টোর করতে চান? এটি আপনার বর্তমান হিসাবের ডাটা সম্পূর্ণ প্রতিস্থাপন (overwrite) করবে এবং এই কাজটি আর পূর্বাবস্থায় ফিরিয়ে আনা যাবে না।'
    );
    if (!confirmed) return;

    setSyncStatus('syncing');
    setErrorMessage(null);

    try {
      const restoredData = await restoreFromGoogleDrive();
      if (restoredData) {
        onRestoreSales(restoredData.sales);
        if (restoredData.expenses) {
          onRestoreExpenses(restoredData.expenses);
        }
        if (restoredData.storeInfo) {
          onRestoreStoreInfo(restoredData.storeInfo);
        }
        setSyncStatus('success');
        alert('খাতার হিসাব সফলভাবে রিস্টোর করা হয়েছে!');
        setTimeout(() => setSyncStatus('idle'), 4000);
      } else {
        throw new Error('গুগল ড্রাইভে কোনো ব্যাকআপ ফাইল পাওয়া যায়নি!');
      }
    } catch (err: any) {
      console.error(err);
      setSyncStatus('error');
      setErrorMessage(err.message || 'রিস্টোর করতে ব্যর্থ হয়েছে!');
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60"
          />

          {/* Dialog Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col will-change-transform"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-50 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{t('syncTitle')}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">{t('syncSubtitle')}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-200/50 rounded-lg transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl flex gap-2.5 text-rose-800 text-xs font-semibold">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-600 flex-shrink-0" />
                  <p>{errorMessage}</p>
                </div>
              )}

              {!isLoggedIn ? (
                // Sign In Form View
                <div className="text-center space-y-4 py-3">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-600">
                    <CloudUpload className="w-8 h-8 animate-pulse" />
                  </div>
                  <div className="space-y-1.5 max-w-xs mx-auto">
                    <h4 className="font-bold text-slate-800 text-sm">গুগল অ্যাকাউন্ট যুক্ত করুন</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      আপনার খাতার হিসাব নিরাপদে ও স্থায়ীভাবে সুরক্ষিত রাখতে গুগল ড্রাইভে অটো ব্যাকআপ চালু করুন।
                    </p>
                  </div>

                  <button
                    onClick={handleLogin}
                    disabled={syncStatus === 'syncing'}
                    className="w-full max-w-xs mx-auto py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                  >
                    {syncStatus === 'syncing' ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{t('saving')}</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        <span>{t('signInBtn')}</span>
                      </>
                    )}
                  </button>

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
                      Your files will download as a <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-600">.json</code> file. You can easily export or import this file at any time.
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

                  {/* Token Paste Section for Mobile APK Users */}
                  <div className="p-4 bg-amber-50/40 border border-amber-200/60 rounded-2xl space-y-2.5 text-left mt-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">🔑</span>
                      <h4 className="text-xs font-bold text-amber-900">
                        মোবাইল APK-র জন্য বিকল্প সাইন-ইন
                      </h4>
                    </div>
                    <p className="text-[10px] leading-relaxed text-amber-800/80 font-medium">
                      যদি সরাসরি সাইন-ইন বাটন কাজ না করে (গুগলের সিকিউরিটি ব্লকের কারণে), তবে যেকোনো ব্রাউজারে আমাদের ওয়েব লিংকটি ওপেন করে ড্রাইভ সাইন-ইন করুন এবং সেখান থেকে সিঙ্ক টোকেনটি কপি করে এনে নিচের বক্সে পেস্ট করুন।
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="কপি করা সিঙ্ক টোকেনটি এখানে পেস্ট করুন..."
                        className="flex-1 px-3 py-2 bg-white border border-amber-200 rounded-xl text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-400 text-slate-700 font-mono"
                        id="apkSyncTokenInput"
                      />
                      <button
                        onClick={async () => {
                          const input = document.getElementById("apkSyncTokenInput") as HTMLInputElement;
                          const token = input?.value?.trim();
                          if (token) {
                            setAccessToken(token, "mobile_user@hisabkhata.app");
                            setIsLoggedIn(true);
                            await checkForCloudBackup(token);
                            alert("সফলভাবে ম্যানুয়াল টোকেন দিয়ে ড্রাইভ কানেক্ট করা হয়েছে!");
                          } else {
                            alert("অনুগ্রহ করে একটি সঠিক সিঙ্ক টোকেন পেস্ট করুন।");
                          }
                        }}
                        className="px-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-xl transition-all cursor-pointer shadow-2xs shrink-0"
                      >
                        টোকেন দিয়ে সাইন-ইন
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // Active Synced Control View
                <div className="space-y-4">
                  {/* Connected Account Card */}
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base">
                        {userEmail ? userEmail.charAt(0).toUpperCase() : 'G'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800">গুগল অ্যাকাউন্ট সংযুক্ত</div>
                        <div className="text-[10px] text-slate-400 font-mono font-medium truncate max-w-[180px]">
                          {userEmail || 'সংযুক্ত অ্যাকাউন্ট'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-600 px-2.5 py-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>{t('signOutBtn')}</span>
                    </button>
                  </div>

                  {/* Copy Access Token Option */}
                  <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-2 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">মোবাইল অ্যাপে ব্যবহারের টোকেন</span>
                      <button
                        onClick={() => {
                          const token = getAccessToken();
                          if (token) {
                            navigator.clipboard.writeText(token);
                            alert("সিঙ্ক টোকেন কপি করা হয়েছে! এটি মোবাইল অ্যাপের 'টোকেন পেস্ট করুন' বক্সে পেস্ট করুন।");
                          }
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        কপি করুন
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                      * গুগলের সিকিউরিটি ব্লকের কারণে মোবাইলের APK তে সরাসরি সাইন-ইন না হলে, ব্রাউজার দিয়ে এখানে লগইন করে উপরের কোডটি কপি করে আপনার মোবাইলের APK তে পেস্ট করে নিন।
                    </p>
                  </div>

                  {/* Sync Action & status */}
                  <div className="p-4 border border-blue-50 bg-blue-50/10 rounded-2xl space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">সিঙ্কের অবস্থা</span>
                      <span className="text-[10px] font-bold text-slate-400">
                        মোট {formatNumber(sales.length)} টি হিসাব এন্ট্রি
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-700">বর্তমান ডিভাইস ব্যাকআপ</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                          সর্বশেষ আপলোড: {lastSync}
                        </div>
                      </div>

                      {syncStatus === 'syncing' ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>সিঙ্ক হচ্ছে...</span>
                        </div>
                      ) : syncStatus === 'success' ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>সফল হয়েছে</span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">প্রস্তুত আছে</span>
                      )}
                    </div>

                    {/* Progress Bar for Sync */}
                    {syncStatus === 'syncing' && (
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 1.8, ease: 'easeInOut' }}
                          className="h-full bg-blue-600"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-2 pt-2">
                      <button
                        onClick={handleSyncNow}
                        disabled={syncStatus === 'syncing'}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CloudUpload className="w-4 h-4" />
                        <span>ড্রাইভে ব্যাকআপ রাখুন (Backup Now)</span>
                      </button>
                    </div>
                  </div>

                  {/* Restore from Google Drive section */}
                  <div className="p-4 border border-slate-100 bg-slate-50/50 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700">ক্লাউড ব্যাকআপ রিস্টোর (Restore)</h4>
                      {checkingBackup ? (
                        <span className="text-[10px] text-slate-400 animate-pulse">খোঁজা হচ্ছে...</span>
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
                            disabled={syncStatus === 'syncing'}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <DownloadCloud className="w-3.5 h-3.5" />
                            <span>রিস্টোর করুন</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                          * রিস্টোর করলে বর্তমান ডিভাইসের হিসাব মুছে গুগল ড্রাইভের হিসাবগুলো লোড হবে।
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-white border border-slate-100 rounded-xl text-slate-400 text-xs font-medium">
                        {checkingBackup ? 'ক্লাউড ব্যাকআপ চেক করা হচ্ছে...' : 'ড্রাইভে কোনো ব্যাকআপ পাওয়া যায়নি'}
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
                          ১০০% অফলাইন ব্যাকআপ (সহসহ ও নির্ভরযোগ্য)
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

              {/* Safety banner */}
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex gap-2.5">
                <Shield className="w-4.5 h-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-emerald-800 block">ডাটা সম্পূর্ণ সুরক্ষিত</span>
                  <span className="text-[10px] text-emerald-600 leading-relaxed font-medium block">
                    আপনার হিসাবের ডাটা গুগল ড্রাইভের নিরাপদ অ্যাপডাটা ফোল্ডারে সংরক্ষিত হয়। অন্য কেউ এই ডাটা দেখতে পারবে না।
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer text-slate-600"
              >
                {t('cancel')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
