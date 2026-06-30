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
  AlertCircle
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
  googleHandleRedirectResult
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
