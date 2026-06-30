/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { ShoppingBag, Search, Trash2, Calendar, User, Clock, CheckCircle, Receipt, Edit2, Check, X } from 'lucide-react';
import { SaleItem, ExpenseItem } from '../types';
import { useLanguage } from '../LanguageContext';

interface TodaySalesListProps {
  sales: SaleItem[];
  expenses: ExpenseItem[];
  onDeleteSale: (id: string) => void;
  onDeleteExpense: (id: string) => void;
  onEditSale?: (id: string, newName: string) => void;
}

export const TodaySalesList: React.FC<TodaySalesListProps> = ({
  sales,
  expenses,
  onDeleteSale,
  onDeleteExpense,
  onEditSale,
}) => {
  const { t, language, formatNumber } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sales' | 'expenses'>('sales');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Get current date in YYYY-MM-DD
  const todayDateStr = useMemo(() => {
    return new Date().toISOString().slice(0, 10);
  }, []);

  // Filter today's sales and expenses
  const todaySales = useMemo(() => {
    return sales.filter((item) => item.date === todayDateStr);
  }, [sales, todayDateStr]);

  const todayExpenses = useMemo(() => {
    return expenses.filter((item) => item.date === todayDateStr);
  }, [expenses, todayDateStr]);

  // Apply search term filtering
  const filteredTodaySales = useMemo(() => {
    return todaySales.filter((item) =>
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.customerName && item.customerName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [todaySales, searchTerm]);

  const filteredTodayExpenses = useMemo(() => {
    return todayExpenses.filter((item) =>
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [todayExpenses, searchTerm]);

  // Sums for today
  const todayStats = useMemo(() => {
    let total = 0;
    let cash = 0;
    let baki = 0;

    todaySales.forEach((item) => {
      total += item.price;
      if (item.paymentType === 'cash') {
        cash += item.price;
      } else {
        baki += item.price;
      }
    });

    const expenseTotal = todayExpenses.reduce((sum, item) => sum + item.amount, 0);
    cash = cash - expenseTotal;

    return { total, cash, baki, expenseTotal };
  }, [todaySales, todayExpenses]);

  return (
    <div className="bg-white border border-slate-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col h-full min-h-[300px]">
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-50">
        <div>
          <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            {t('todaySalesAndExpenses')}
          </h3>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
            {t('todaySalesAndExpensesDesc').replace('{sales}', formatNumber(todaySales.length)).replace('{expenses}', formatNumber(todayExpenses.length))}
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-56">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-4 py-2 text-[10px] sm:text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 sm:focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl mt-3 shrink-0">
        <button
          onClick={() => setActiveTab('sales')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'sales' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700 cursor-pointer'
          }`}
        >
          বেচাকেনা (Sales)
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'expenses' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700 cursor-pointer'
          }`}
        >
          খরচ (Expenses)
        </button>
      </div>

      {/* Today Mini Stats Bar */}
      {activeTab === 'sales' && todaySales.length > 0 && (
        <div className="grid grid-cols-3 gap-2 py-3 border-b border-slate-50 text-[11px] font-semibold">
          <div className="text-center bg-emerald-50/40 text-emerald-700 py-1.5 rounded-lg border border-emerald-100">
            {t('today')}: ৳{formatNumber(todayStats.total)}
          </div>
          <div className="text-center bg-blue-50/40 text-blue-700 py-1.5 rounded-lg border border-blue-100">
            {t('cash')}: ৳{formatNumber(todayStats.cash)}
          </div>
          <div className="text-center bg-amber-50/40 text-amber-700 py-1.5 rounded-lg border border-amber-100">
            {t('due')}: ৳{formatNumber(todayStats.baki)}
          </div>
        </div>
      )}
      
      {activeTab === 'expenses' && todayExpenses.length > 0 && (
        <div className="py-3 border-b border-slate-50 text-[11px] font-semibold">
          <div className="text-center bg-rose-50/40 text-rose-700 py-1.5 rounded-lg border border-rose-100 max-w-[200px] mx-auto">
            মোট খরচ: ৳{formatNumber(todayStats.expenseTotal)}
          </div>
        </div>
      )}

      {/* Sales/Expenses List container */}
      <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-3 max-h-[420px]">
        {activeTab === 'sales' ? (filteredTodaySales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
              <ShoppingBag className="w-6 h-6 text-slate-300" />
            </div>
            <h4 className="text-sm font-bold text-slate-700">
              {searchTerm ? 'খোঁজা হিসাবটি পাওয়া যায়নি' : t('noSalesToday')}
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
              {searchTerm ? 'অনুগ্রহ করে সঠিক পণ্য বা ক্রেতার নাম টাইপ করুন।' : 'নতুন বেচাকেনা যোগ করতে পাশের ফর্মটি ব্যবহার করুন।'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
              {filteredTodaySales.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 border border-slate-100 hover:border-slate-200 bg-slate-50/30 hover:bg-slate-50/60 rounded-xl transition-colors shadow-2xs"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      {editingId === item.id ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (editValue.trim() && onEditSale) {
                                onEditSale(item.id, editValue.trim());
                                setEditingId(null);
                              }
                            } else if (e.key === 'Escape') {
                              setEditingId(null);
                            }
                          }}
                          autoFocus
                          className="font-bold text-slate-800 text-sm border-b-2 border-blue-500 bg-transparent outline-none px-1 py-0.5 w-full max-w-[150px]"
                        />
                      ) : (
                        <h4 className="font-bold text-slate-800 text-[13px] break-words whitespace-normal leading-tight">
                          {item.productName}
                        </h4>
                      )}
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md flex-shrink-0 ${
                        item.paymentType === 'cash'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {item.paymentType === 'cash' ? t('cashBadge') : t('dueBadge')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {item.timestamp}
                      </span>
                      {item.paymentType === 'baki' && (
                        <span className="flex items-center gap-1 text-rose-600 font-semibold">
                          <User className="w-3.5 h-3.5 text-rose-400" />
                          {t('customerNameLabel')}: {item.customerName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-slate-900 text-base font-mono">
                      ৳ {formatNumber(item.price)}
                    </span>
                    {editingId === item.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            if (editValue.trim() && onEditSale) {
                              onEditSale(item.id, editValue.trim());
                              setEditingId(null);
                            }
                          }}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : deleteConfirmId === item.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onDeleteSale(item.id)}
                          className="px-2 py-1 text-xs font-bold bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors cursor-pointer"
                        >
                          {t('confirm')}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 text-xs font-bold bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors cursor-pointer"
                        >
                          {t('cancel')}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        {onEditSale && (
                          <button
                            onClick={() => {
                              setEditingId(item.id);
                              setEditValue(item.productName);
                              setDeleteConfirmId(null);
                            }}
                            className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                            title="এডিট"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setDeleteConfirmId(item.id);
                            setEditingId(null);
                          }}
                          className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                          title={t('delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )) : (
          /* activeTab === 'expenses' */
          filteredTodayExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                <Receipt className="w-6 h-6 text-slate-300" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">
                {t('noExpensesToday')}
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                {t('noExpensesTodayDesc')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTodayExpenses.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 border border-slate-100 hover:border-slate-200 bg-slate-50/30 hover:bg-slate-50/60 rounded-xl transition-colors shadow-2xs"
                >
                  <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800 text-[13px] break-words whitespace-normal leading-tight">
                          {item.description}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {item.timestamp}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-slate-900 text-base font-mono">
                        ৳ {formatNumber(item.amount)}
                      </span>
                      {deleteConfirmId === item.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onDeleteExpense(item.id)}
                            className="px-2 py-1 text-xs font-bold bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors cursor-pointer"
                          >
                            {t('confirm')}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 text-xs font-bold bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors cursor-pointer"
                          >
                            {t('cancel')}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(item.id)}
                          className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                          title={t('delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};
