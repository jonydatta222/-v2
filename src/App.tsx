/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Coins,
  AlertCircle,
  BookOpen,
  History,
  Store,
  RefreshCw,
  Clock,
  CheckCircle,
  HelpCircle,
  ArrowUpRight,
  Sparkles,
  Cloud,
  Calendar,
  Globe,
  Settings,
  Calculator,
  Receipt,
} from 'lucide-react';
import { SaleItem, StoreInfo } from './types';
import { StatsCard } from './components/StatsCard';
import { SaleForm } from './components/SaleForm';
import { TodaySalesList } from './components/TodaySalesList';
import { DueListDialog } from './components/DueListDialog';
import { HistoryDialog } from './components/HistoryDialog';
import { GoogleSyncDialog } from './components/GoogleSyncDialog';
import { FirebaseSyncDialog } from './components/FirebaseSyncDialog';
import { MonthlyReportDialog } from './components/MonthlyReportDialog';
import { StoreProfileDialog } from './components/StoreProfileDialog';
import { AboutUsDialog } from './components/AboutUsDialog';
import { CalculatorDialog } from './components/CalculatorDialog';
import { ExpenseDialog } from './components/ExpenseDialog';
import { useLanguage } from './LanguageContext';
import { ExpenseItem } from './types';
import { backupToGoogleDrive, getAccessToken } from './lib/googleDriveSync';
import { auth } from './lib/firebase';
import { backupToFirebase } from './lib/firebaseSync';

const ClockDisplay = ({ language }: { language: 'bn' | 'en' }) => {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      };
      setCurrentTime(now.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', options));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [language]);

  return <>{currentTime || '--:--:--'}</>;
};

export default function App() {
  const { t, language, setLanguage } = useLanguage();
  
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(() => {
    const saved = localStorage.getItem('hisab_khata_store_info');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => {
    const saved = localStorage.getItem('hisab_khata_expenses');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [sales, setSales] = useState<SaleItem[]>(() => {
    const saved = localStorage.getItem('hisab_khata_sales');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved sales', e);
      }
    }

    // Seed initial data aligned dynamically with today, yesterday, and 2 days ago
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().slice(0, 10);

    return [
      {
        id: 'seed-1',
        productName: '১ কেজি মিনিকেট চাল',
        price: 75,
        paymentType: 'cash',
        date: today,
        timestamp: '০৯:১৫ মিনিট',
      },
      {
        id: 'seed-2',
        productName: '৫০০ গ্রাম মসুর ডাল',
        price: 65,
        paymentType: 'cash',
        date: today,
        timestamp: '১০:২০ মিনিট',
      },
      {
        id: 'seed-3',
        productName: 'সিলন চা পাতা ২০০গ্রাম',
        price: 110,
        paymentType: 'baki',
        customerName: 'রফিক মিয়া',
        date: today,
        timestamp: '১০:৪৫ মিনিট',
      },
      {
        id: 'seed-4',
        productName: 'সয়াবিন তেল ২ লিটার',
        price: 340,
        paymentType: 'baki',
        customerName: 'শরিফুল ইসলাম',
        date: yesterday,
        timestamp: '০৫:৩০ মিনিট',
      },
      {
        id: 'seed-5',
        productName: 'আটা ৫ কেজি',
        price: 230,
        paymentType: 'cash',
        date: yesterday,
        timestamp: '১১:১০ মিনিট',
      },
      {
        id: 'seed-6',
        productName: 'লাক্স সাবান ৩ টি',
        price: 135,
        paymentType: 'baki',
        customerName: 'রফিক মিয়া',
        date: twoDaysAgo,
        timestamp: '০৮:৪৫ মিনিট',
      },
    ];
  });

  const [firebaseUser, setFirebaseUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setFirebaseUser(user);
    });
    return () => unsubscribe();
  }, []);

  const [isDueListOpen, setIsDueListOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isMonthlyReportOpen, setIsMonthlyReportOpen] = useState(false);
  const [isGoogleSyncOpen, setIsGoogleSyncOpen] = useState(false);
  const [isFirebaseSyncOpen, setIsFirebaseSyncOpen] = useState(false);
  const [isStoreProfileOpen, setIsStoreProfileOpen] = useState(false);
  const [isAboutUsOpen, setIsAboutUsOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('hisab_khata_sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem('hisab_khata_expenses', JSON.stringify(expenses));
  }, [expenses]);

  // Auto-sync to Google Drive
  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      const timer = setTimeout(() => {
        backupToGoogleDrive(sales, expenses, storeInfo, language).catch((err) => {
          if (err.message !== 'Google session expired. Please sign in again.') {
            console.error(err);
          }
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [sales, expenses, storeInfo]);

  // Auto-sync to Firebase
  useEffect(() => {
    if (firebaseUser) {
      const timer = setTimeout(() => {
        backupToFirebase(sales, expenses, storeInfo, language).catch((err) => {
          console.error('Auto backup to Firebase failed:', err);
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [sales, expenses, storeInfo, firebaseUser, language]);

  // Aggregate Stats (calculated over today's sales)
  const totalSalesVal = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return sales
      .filter((item) => item.date === todayStr && !item.productName.startsWith('বাকির টাকা জমা - '))
      .reduce((sum, item) => sum + item.price, 0);
  }, [sales]);

  const totalJomaVal = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const totalCash = sales
      .filter((item) => item.date === todayStr && item.paymentType === 'cash')
      .reduce((sum, item) => sum + item.price, 0);
    const totalExpense = expenses
      .filter((item) => item.date === todayStr)
      .reduce((sum, item) => sum + item.amount, 0);
    return totalCash - totalExpense;
  }, [sales, expenses]);

  const totalBakiVal = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const bakiTotal = sales
      .filter((item) => item.date === todayStr && item.paymentType === 'baki')
      .reduce((sum, item) => sum + item.price, 0);
    const jomaTotalForBaki = sales
      .filter((item) => item.date === todayStr && item.paymentType === 'cash' && item.productName.startsWith('বাকির টাকা জমা - '))
      .reduce((sum, item) => sum + item.price, 0);
    const netBaki = bakiTotal - jomaTotalForBaki;
    return netBaki > 0 ? netBaki : 0;
  }, [sales]);

  const todayExpenseVal = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return expenses
      .filter((item) => item.date === todayStr)
      .reduce((sum, item) => sum + item.amount, 0);
  }, [expenses]);

  // Add Sale Handler
  const handleAddSale = (newSale: Omit<SaleItem, 'id' | 'timestamp' | 'date'>) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const dateString = now.toISOString().slice(0, 10);

    const saleItem: SaleItem = {
      ...newSale,
      id: `sale-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: timeString,
      date: dateString,
    };

    setSales((prev) => [saleItem, ...prev]);
  };

  // Delete Sale Handler
  const handleDeleteSale = (id: string) => {
    setSales((prev) => prev.filter((item) => item.id !== id));
  };

  // Edit Sale Handler
  const handleEditSale = (id: string, newName: string) => {
    setSales((prev) => prev.map((item) => 
      item.id === id ? { ...item, productName: newName } : item
    ));
  };

  const handleAddExpense = (description: string, amount: number) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const dateString = now.toISOString().slice(0, 10);

    const expenseItem: ExpenseItem = {
      id: `expense-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      description,
      amount,
      timestamp: timeString,
      date: dateString,
    };

    setExpenses((prev) => [expenseItem, ...prev]);
  };

  // Settle Due Handler (convert 'baki' item to 'cash' once paid)
  const handleSettleDue = (itemIds: string[]) => {
    setSales((prev) =>
      prev.map((item) => {
        if (itemIds.includes(item.id)) {
          return { ...item, paymentType: 'cash' };
        }
        return item;
      })
    );
  };

  // Clear all data
  const handleClearAll = () => {
    setSales([]);
    setExpenses([]);
  };

  // Display date in correct language format
  const formattedCurrentDate = useMemo(() => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return new Date().toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', options);
  }, [language]);

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col pb-12 selection:bg-emerald-500/10 selection:text-emerald-800">
      {/* Top Banner / App Header */}
      <header className="bg-white border-b border-slate-100 shadow-2xs sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Logo" className="w-12 h-12 rounded-2xl shadow-md object-cover" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">{t('appTitle')}</h1>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Web App
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {storeInfo?.name ? storeInfo.name : t('appSubtitle')}
              </p>
            </div>
          </div>

          {/* Clock & Date & Language & Settings */}
          <div className="flex items-center gap-4 self-start md:self-auto">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCalculatorOpen(true)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                title={t('calculator')}
              >
                <Calculator className="w-4 h-4" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                {isSettingsMenuOpen && (
                  <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-50">
                    <button
                      onClick={() => {
                        setIsSettingsMenuOpen(false);
                        setIsStoreProfileOpen(true);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 font-medium cursor-pointer transition-colors"
                    >
                      {t('profileMenu')}
                    </button>
                    <button
                      onClick={() => {
                        setIsSettingsMenuOpen(false);
                        setIsAboutUsOpen(true);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 font-medium cursor-pointer transition-colors"
                    >
                      {t('aboutUsMenu')}
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
                {language === 'bn' ? 'English' : 'বাংলা'}
              </button>
            </div>
            <div className="text-left md:text-right">
              <div className="text-xs font-semibold text-slate-400">{formattedCurrentDate}</div>
              <div className="text-sm font-bold text-slate-700 flex items-center gap-1.5 justify-start md:justify-end mt-0.5 font-mono">
                <Clock className="w-4 h-4 text-emerald-500" />
                <ClockDisplay language={language} />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto px-4 mt-3 flex-1 space-y-3">
        {/* Statistics Grid (Displayed Side-by-Side horizontally on all screens) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <StatsCard
            id="tv_total_sales"
            title={t('totalSale')}
            value={totalSalesVal}
            type="sales"
            icon={<TrendingUp className="w-4.5 h-4.5" />}
          />
          <StatsCard
            id="tv_total_joma"
            title={t('totalCash')}
            value={totalJomaVal}
            type="joma"
            icon={<Coins className="w-4.5 h-4.5" />}
          />
          <StatsCard
            id="tv_total_baki"
            title={t('totalDue')}
            value={totalBakiVal}
            type="baki"
            icon={<AlertCircle className="w-4.5 h-4.5" />}
          />
          <StatsCard
            id="tv_today_expense"
            title={t('todayExpense')}
            value={todayExpenseVal}
            type="expense"
            icon={<Receipt className="w-4.5 h-4.5" />}
          />
        </div>

        {/* Dashboard Split Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 lg:gap-4">
          {/* Left Column: Input Form (Takes 2 fractions in desktop) */}
          <div className="lg:col-span-2">
            <SaleForm onAddSale={handleAddSale} onOpenExpense={() => setIsExpenseOpen(true)} />
          </div>

          {/* Right Column: Today's Sales List (Takes 3 fractions in desktop) */}
          <div className="lg:col-span-3">
            <TodaySalesList
              sales={sales}
              expenses={expenses}
              onDeleteSale={handleDeleteSale}
              onEditSale={handleEditSale}
              onDeleteExpense={(id) => setExpenses(prev => prev.filter(e => e.id !== id))}
            />
          </div>
        </div>

        {/* Actions Row */}
        <div className="bg-white border border-slate-100 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="space-y-0.5">
            <h2 className="text-sm font-black text-slate-800">{t('appTitle')} Dashboard</h2>
            <p className="text-[11px] text-slate-400 font-semibold">
              {storeInfo?.name ? storeInfo.name : t('appSubtitle')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsDueListOpen(true)}
              className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-xs active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>{t('dueLedger')}</span>
            </button>
            <button
              onClick={() => setIsMonthlyReportOpen(true)}
              className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-bold bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl shadow-xs active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-purple-200/50"
            >
              <Calendar className="w-4 h-4" />
              <span>{t('monthlyReport')}</span>
            </button>
            <button
              onClick={() => setIsCalculatorOpen(true)}
              className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-bold bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-xl shadow-xs active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-indigo-200/50"
            >
              <Calculator className="w-4 h-4" />
              <span>{t('calculator')}</span>
            </button>
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl shadow-xs active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200/50"
            >
              <History className="w-4 h-4" />
              <span>{t('history')}</span>
            </button>
                <button
                  onClick={() => setIsGoogleSyncOpen(true)}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Cloud className="w-4 h-4" />
                  <span>Google Drive Sync</span>
                </button>
                <button
                  onClick={() => setIsFirebaseSyncOpen(true)}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-xs active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Cloud className="w-4 h-4" />
                  <span>Firebase Sync</span>
                </button>
          </div>
        </div>
      </main>

      {/* Footer Details */}
      <footer className="max-w-6xl w-full mx-auto px-4 mt-12 text-center text-xs text-slate-400 border-t border-slate-100 pt-6">
        <p>© {new Date().getFullYear()} {t('appTitle')} • All Rights Reserved</p>
        <p className="mt-1">
          {t('footerText1')}
        </p>
        <p className="mt-4 pb-4 flex items-center justify-center gap-1">
          {t('footerText2')}{" "}
          <a
            href="https://www.facebook.com/share/1EMccG71AB/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 hover:underline font-bold"
          >
            {language === 'bn' ? '"জনি দত্ত"' : '"Jony Datta"'}
          </a>
        </p>
      </footer>

      {/* Dialogs / Modals */}
      <AboutUsDialog
        isOpen={isAboutUsOpen}
        onClose={() => setIsAboutUsOpen(false)}
      />
      <StoreProfileDialog
        isOpen={isStoreProfileOpen}
        onClose={() => setIsStoreProfileOpen(false)}
        initialData={storeInfo}
        onSave={(info) => {
          setStoreInfo(info);
          localStorage.setItem('hisab_khata_store_info', JSON.stringify(info));
          setIsStoreProfileOpen(false);
        }}
      />

      <DueListDialog
        isOpen={isDueListOpen}
        onClose={() => setIsDueListOpen(false)}
        sales={sales}
        onSettleDue={handleSettleDue}
        onAddSale={handleAddSale}
        onDeleteSale={handleDeleteSale}
      />

      <HistoryDialog
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sales={sales}
        onDeleteSale={handleDeleteSale}
        onClearAll={handleClearAll}
      />

      <GoogleSyncDialog
        isOpen={isGoogleSyncOpen}
        onClose={() => setIsGoogleSyncOpen(false)}
        sales={sales}
        expenses={expenses}
        userEmail="jonydatta222@gmail.com"
        storeInfo={storeInfo}
        onRestoreSales={setSales}
        onRestoreExpenses={setExpenses}
        onRestoreStoreInfo={(info) => {
          setStoreInfo(info);
          localStorage.setItem('hisab_khata_store_info', JSON.stringify(info));
        }}
      />

      <FirebaseSyncDialog
        isOpen={isFirebaseSyncOpen}
        onClose={() => setIsFirebaseSyncOpen(false)}
        sales={sales}
        expenses={expenses}
        storeInfo={storeInfo}
        onRestoreSales={setSales}
        onRestoreExpenses={setExpenses}
        onRestoreStoreInfo={(info) => {
          setStoreInfo(info);
          localStorage.setItem('hisab_khata_store_info', JSON.stringify(info));
        }}
      />

      <MonthlyReportDialog
        isOpen={isMonthlyReportOpen}
        onClose={() => setIsMonthlyReportOpen(false)}
        sales={sales}
      />

      <CalculatorDialog
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />

      <ExpenseDialog
        isOpen={isExpenseOpen}
        onClose={() => setIsExpenseOpen(false)}
        onAddExpense={handleAddExpense}
      />
    </div>
  );
}
