/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Calendar,
  ArrowRight,
  Trash2,
  Search,
  TrendingUp,
  Coins,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import { SaleItem } from "../types";
import { useLanguage } from "../LanguageContext";

interface HistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sales: SaleItem[];
  onDeleteSale: (id: string) => void;
  onClearAll: () => void;
}

export const HistoryDialog: React.FC<HistoryDialogProps> = ({
  isOpen,
  onClose,
  sales,
  onDeleteSale,
  onClearAll,
}) => {
  const { t, language, formatNumber } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(() => {
    if (sales.length > 0) {
      // Get unique dates, sort descending, and return the latest one
      const dates: string[] = Array.from(new Set(sales.map((s) => s.date)));
      dates.sort((a, b) => b.localeCompare(a));
      return dates[0] || null;
    }
    return null;
  });

  // Group sales by date
  const groupedSales = useMemo(() => {
    if (!isOpen) return { flat: [], hierarchy: [] };

    const groups: {
      [key: string]: {
        items: SaleItem[];
        total: number;
        cash: number;
        baki: number;
      };
    } = {};

    sales.forEach((item) => {
      const dateStr = item.date;
      if (!groups[dateStr]) {
        groups[dateStr] = { items: [], total: 0, cash: 0, baki: 0 };
      }
      groups[dateStr].items.push(item);
      groups[dateStr].total += item.price;
      if (item.paymentType === "cash") {
        groups[dateStr].cash += item.price;
      } else {
        groups[dateStr].baki += item.price;
      }
    });

    // Sort by date descending
    const sortedGroups = Object.keys(groups)
      .map((date) => ({
        date,
        ...groups[date],
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    // Group by Year -> Month -> Date
    const hierarchy: {
      year: string;
      months: { month: string; dates: typeof sortedGroups }[];
    }[] = [];

    sortedGroups.forEach((group) => {
      const d = new Date(group.date);
      if (isNaN(d.getTime())) return;

      const year = d.getFullYear().toString();
      const month = d.toLocaleDateString(
        language === "bn" ? "bn-BD" : "en-US",
        { month: "long" },
      );

      let yearObj = hierarchy.find((y) => y.year === year);
      if (!yearObj) {
        yearObj = { year, months: [] };
        hierarchy.push(yearObj);
      }

      let monthObj = yearObj.months.find((m) => m.month === month);
      if (!monthObj) {
        monthObj = { month, dates: [] };
        yearObj.months.push(monthObj);
      }

      monthObj.dates.push(group);
    });

    return { flat: sortedGroups, hierarchy };
  }, [sales, isOpen]);

  // Search filtered items within the selected date or all items
  const filteredSalesForDate = useMemo(() => {
    if (!selectedDate) return [];
    const dateData = groupedSales.flat.find((g) => g.date === selectedDate);
    if (!dateData) return [];

    return dateData.items.filter(
      (item) =>
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.customerName &&
          item.customerName.toLowerCase().includes(searchTerm.toLowerCase())),
    );
  }, [selectedDate, groupedSales, searchTerm]);

  // Mini stats for the selected date
  const activeDateStats = useMemo(() => {
    if (!selectedDate) return null;
    return groupedSales.flat.find((g) => g.date === selectedDate) || null;
  }, [selectedDate, groupedSales]);

  // Format date to a friendly localized format
  const formatLocalizedDate = (dateStr: string) => {
    try {
      const dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) return dateStr;

      const options: Intl.DateTimeFormatOptions = {
        day: "numeric",
        month: "long",
        year: "numeric",
      };
      return dateObj.toLocaleDateString(
        language === "bn" ? "bn-BD" : "en-US",
        options,
      );
    } catch {
      return dateStr;
    }
  };

  const handleExportData = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(sales, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `hisab_khata_history_${new Date().toISOString().slice(0, 10)}.json`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
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
            className="relative w-full max-w-3xl h-[85vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden will-change-transform"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {t("historyTitle")}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {t("historySubtitle")}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-200/50 rounded-xl transition-colors text-slate-500 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Split Screen Layout for History Selection vs. Detailed View */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Column: Date List */}
              <div
                className={`w-full ${selectedDate ? "hidden md:block" : "block"} md:w-5/12 border-r border-slate-100 overflow-y-auto p-4 space-y-4 bg-slate-50/30`}
              >
                {/* Modern Date Picker Selection */}
                <div className="p-3.5 bg-white border border-slate-100 rounded-2xl shadow-2xs space-y-2">
                  <label className="text-xs font-bold text-slate-500 block flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    {t("viewByDate")}
                  </label>
                  <input
                    type="date"
                    value={selectedDate || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        setSelectedDate(val);
                        setSearchTerm("");
                      }
                    }}
                    className="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 cursor-pointer"
                  />
                  {selectedDate && (
                    <button
                      onClick={() => {
                        setSelectedDate(null);
                        setSearchTerm("");
                      }}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-600 block ml-auto mt-1 cursor-pointer"
                    >
                      {t("clearDate")}
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between px-2 pt-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t("recordDates")}
                  </span>
                  {sales.length > 0 && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={handleExportData}
                        title={t("backupTooltip")}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                      </button>
                      {clearConfirm ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              onClearAll();
                              setSelectedDate(null);
                              setClearConfirm(false);
                            }}
                            className="px-2 py-1 text-[10px] font-bold bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
                          >
                            {t("confirm")}
                          </button>
                          <button
                            onClick={() => setClearConfirm(false)}
                            className="px-2 py-1 text-[10px] font-bold bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                          >
                            {t("cancel")}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setClearConfirm(true)}
                          title={t("clearAllTooltip")}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {groupedSales.hierarchy.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium">
                      {t("noPreviousRecords")}
                    </p>
                  </div>
                ) : (
                  groupedSales.hierarchy.map((yearGroup) => (
                    <div key={yearGroup.year} className="space-y-3">
                      <div className="flex items-center gap-2 mt-4 mb-2">
                        <div className="h-px bg-slate-200 flex-1"></div>
                        <h3 className="text-sm font-black text-slate-500 font-mono">
                          {yearGroup.year}
                        </h3>
                        <div className="h-px bg-slate-200 flex-1"></div>
                      </div>

                      {yearGroup.months.map((monthGroup) => (
                        <div key={monthGroup.month} className="space-y-2">
                          <h4 className="text-xs font-bold text-slate-800 ml-1">
                            {monthGroup.month}
                          </h4>
                          <div className="space-y-2">
                            {monthGroup.dates.map((group) => {
                              return (
                                <button
                                  key={group.date}
                                  onClick={() => {
                                    setSelectedDate(group.date);
                                    setSearchTerm("");
                                  }}
                                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                                    selectedDate === group.date
                                      ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10"
                                      : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-xs text-slate-700"
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-baseline gap-2 mb-1.5">
                                      <span
                                        className={`text-xl font-bold font-mono ${selectedDate === group.date ? "text-white" : "text-slate-800"}`}
                                      >
                                        {
                                          formatLocalizedDate(group.date).split(
                                            " ",
                                          )[0]
                                        }{" "}
                                        {/* Day number localized */}
                                      </span>
                                      <span
                                        className={`text-[10px] font-bold uppercase tracking-wider ${selectedDate === group.date ? "text-slate-400" : "text-slate-400"}`}
                                      >
                                        {new Date(
                                          group.date,
                                        ).toLocaleDateString(
                                          language === "bn" ? "bn-BD" : "en-US",
                                          { weekday: "long" },
                                        )}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-xs">
                                      <span
                                        className={`px-1.5 py-0.5 rounded-sm font-semibold ${selectedDate === group.date ? "bg-emerald-950 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}
                                      >
                                        {t("saleLabel")} ৳
                                        {formatNumber(group.total)}
                                      </span>
                                      <span
                                        className={`px-1.5 py-0.5 rounded-sm font-semibold ${selectedDate === group.date ? "bg-rose-950 text-rose-300" : "bg-rose-50 text-rose-700"}`}
                                      >
                                        {t("dueLabel")} ৳
                                        {formatNumber(group.baki)}
                                      </span>
                                    </div>
                                  </div>
                                  <ArrowRight
                                    className={`w-4 h-4 ${selectedDate === group.date ? "text-white" : "text-slate-300"}`}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>

              {/* Right Column: Date Detailed View */}
              <div
                className={`w-full ${!selectedDate ? "hidden md:flex" : "flex"} md:w-7/12 flex-col overflow-hidden bg-white`}
              >
                {selectedDate ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header of details */}
                    <div className="p-5 border-b border-slate-100 bg-slate-50/20">
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <button
                          onClick={() => setSelectedDate(null)}
                          className="md:hidden text-xs font-semibold text-slate-500 hover:text-slate-800"
                        >
                          {t("goBack")}
                        </button>
                        <h4 className="font-bold text-slate-800 text-sm md:text-base flex items-center gap-2">
                          <Calendar className="w-4.5 h-4.5 text-slate-500" />
                          {formatLocalizedDate(selectedDate)} {t("ledgerFor")}
                        </h4>
                      </div>

                      {/* Mini Stats Grid */}
                      {!activeDateStats ? (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100 text-center">
                            <span className="text-[10px] font-semibold text-emerald-600 block">
                              {t("totalSale")}
                            </span>
                            <span className="text-sm font-bold text-emerald-800 font-mono">
                              ৳ {formatNumber(0)}
                            </span>
                          </div>
                          <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-100 text-center">
                            <span className="text-[10px] font-semibold text-blue-600 block">
                              {t("totalCash")}
                            </span>
                            <span className="text-sm font-bold text-blue-800 font-mono">
                              ৳ {formatNumber(0)}
                            </span>
                          </div>
                          <div className="bg-rose-50/60 p-2.5 rounded-xl border border-rose-100 text-center">
                            <span className="text-[10px] font-semibold text-rose-600 block">
                              {t("totalDue")}
                            </span>
                            <span className="text-sm font-bold text-rose-800 font-mono">
                              ৳ {formatNumber(0)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100 text-center">
                            <span className="text-[10px] font-semibold text-emerald-600 block">
                              {t("totalSale")}
                            </span>
                            <span className="text-sm font-bold text-emerald-800 font-mono">
                              ৳ {formatNumber(activeDateStats.total)}
                            </span>
                          </div>
                          <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-100 text-center">
                            <span className="text-[10px] font-semibold text-blue-600 block">
                              {t("totalCash")}
                            </span>
                            <span className="text-sm font-bold text-blue-800 font-mono">
                              ৳ {formatNumber(activeDateStats.cash)}
                            </span>
                          </div>
                          <div className="bg-rose-50/60 p-2.5 rounded-xl border border-rose-100 text-center">
                            <span className="text-[10px] font-semibold text-rose-600 block">
                              {t("totalDue")}
                            </span>
                            <span className="text-sm font-bold text-rose-800 font-mono">
                              ৳ {formatNumber(activeDateStats.baki)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Search inside details */}
                    <div className="px-5 py-3 border-b border-slate-100">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder={t("searchPlaceholder")}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 transition-all"
                        />
                      </div>
                    </div>

                    {/* Detailed List */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
                      {filteredSalesForDate.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-xs">
                          {searchTerm
                            ? t("noResultFound")
                            : t("noRecordsOnDate")}
                        </div>
                      ) : (
                        filteredSalesForDate.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:border-slate-200 transition-all bg-slate-50/20"
                          >
                            <div className="min-w-0 flex-1 pr-3">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-slate-800 truncate">
                                  {item.productName}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-sm ${
                                    item.paymentType === "cash"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                      : "bg-rose-50 text-rose-700 border border-rose-100"
                                  }`}
                                >
                                  {item.paymentType === "cash"
                                    ? t("cash")
                                    : t("due")}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                                <span>
                                  {t("timePrefix")} {item.timestamp}
                                </span>
                                {item.paymentType === "baki" && (
                                  <>
                                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                    <span className="font-semibold text-rose-600">
                                      {t("customerPrefix")} {item.customerName}
                                    </span>
                                  </>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <span className="font-bold text-slate-800 text-sm font-mono">
                                ৳ {formatNumber(item.price)}
                              </span>
                              {deleteConfirmId === item.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => onDeleteSale(item.id)}
                                    className="px-2 py-1 text-xs font-bold bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors cursor-pointer"
                                  >
                                    {t("confirm")}
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-2 py-1 text-xs font-bold bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors cursor-pointer"
                                  >
                                    {t("cancel")}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirmId(item.id)}
                                  className="p-1.5 hover:bg-rose-50 text-slate-300 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                  title={t("delete")}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                    <Calendar className="w-14 h-14 text-slate-200 mb-3" />
                    <h5 className="font-semibold text-slate-700 text-sm mb-1">
                      {t("selectDateTitle")}
                    </h5>
                    <p className="text-xs max-w-xs leading-relaxed">
                      {t("selectDateDesc")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-semibold bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer text-slate-700"
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
