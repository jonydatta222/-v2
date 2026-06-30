/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Calendar,
  TrendingUp,
  Coins,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { SaleItem } from "../types";
import { useLanguage } from "../LanguageContext";

interface MonthlyReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sales: SaleItem[];
}

export const MonthlyReportDialog: React.FC<MonthlyReportDialogProps> = ({
  isOpen,
  onClose,
  sales,
}) => {
  const { t, language, formatNumber } = useLanguage();
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const monthlyData = useMemo(() => {
    if (!isOpen) return [];
    const groups: {
      [month: string]: {
        total: number;
        cash: number;
        baki: number;
        jomaForBaki: number;
        dateObj: Date;
      };
    } = {};

    sales.forEach((item) => {
      // item.date is 'YYYY-MM-DD'
      const dateParts = item.date.split("-");
      if (dateParts.length < 2) return;
      const monthKey = `${dateParts[0]}-${dateParts[1]}`; // YYYY-MM

      if (!groups[monthKey]) {
        groups[monthKey] = {
          total: 0,
          cash: 0,
          baki: 0,
          jomaForBaki: 0,
          dateObj: new Date(
            parseInt(dateParts[0]),
            parseInt(dateParts[1]) - 1,
            1,
          ),
        };
      }

      // If it's paying off baki
      if (item.productName.startsWith("বাকির টাকা জমা - ")) {
        groups[monthKey].jomaForBaki += item.price;
        groups[monthKey].cash += item.price;
      } else {
        groups[monthKey].total += item.price;
        if (item.paymentType === "cash") {
          groups[monthKey].cash += item.price;
        } else if (item.paymentType === "baki") {
          groups[monthKey].baki += item.price;
        }
      }
    });

    return Object.keys(groups)
      .map((key) => {
        const netBaki = groups[key].baki - groups[key].jomaForBaki;
        return {
          monthKey: key,
          dateObj: groups[key].dateObj,
          totalSales: groups[key].total,
          totalCash: groups[key].cash,
          totalBaki: netBaki > 0 ? netBaki : 0,
          jomaForBaki: groups[key].jomaForBaki,
          totalBakiGiven: groups[key].baki,
        };
      })
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [sales, isOpen]);

  const formatLocalizedMonthYear = (dateObj: Date) => {
    try {
      const options: Intl.DateTimeFormatOptions = {
        month: "long",
        year: "numeric",
      };
      return dateObj.toLocaleDateString(
        language === "bn" ? "bn-BD" : "en-US",
        options,
      );
    } catch {
      return "";
    }
  };

  const toggleMonth = (monthKey: string) => {
    setExpandedMonth((prev) => (prev === monthKey ? null : monthKey));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 z-50"
          />

          {/* Dialog Panel */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white w-full max-w-2xl rounded-2xl shadow-xl flex flex-col max-h-full overflow-hidden pointer-events-auto will-change-transform"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">
                      {t("monthlyReportTitle")}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      {t("monthlyReportSubtitle")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50/50">
                {monthlyData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-60 py-12">
                    <Calendar className="w-12 h-12 text-slate-400" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-600">
                        {t("noData")}
                      </p>
                      <p className="text-xs text-slate-400">
                        {t("noMonthlyData")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {monthlyData.map((data) => {
                      const isExpanded = expandedMonth === data.monthKey;
                      const localizedMonth = formatLocalizedMonthYear(
                        data.dateObj,
                      );

                      return (
                        <div
                          key={data.monthKey}
                          className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs transition-all"
                        >
                          <button
                            onClick={() => toggleMonth(data.monthKey)}
                            className="w-full px-5 py-4 flex items-center justify-between bg-white hover:bg-slate-50 cursor-pointer text-left transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
                                {localizedMonth.split(" ")[0]}
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-800 text-base">
                                  {localizedMonth}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-2">
                                  <span className="text-emerald-600 font-bold tracking-tight">
                                    {t("totalSale")}: ৳{" "}
                                    {formatNumber(data.totalSales)}
                                  </span>
                                </p>
                              </div>
                            </div>
                            <div className="text-slate-400">
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5" />
                              ) : (
                                <ChevronDown className="w-5 h-5" />
                              )}
                            </div>
                          </button>

                          {/* Expanded Details */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-t border-slate-100 bg-slate-50"
                              >
                                <div className="p-5">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {/* Total Sales Card */}
                                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center space-y-1.5">
                                      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-1">
                                        <TrendingUp className="w-4 h-4" />
                                      </div>
                                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        {t("totalSale")}
                                      </span>
                                      <span className="text-lg font-black text-emerald-700 font-mono">
                                        ৳ {formatNumber(data.totalSales)}
                                      </span>
                                    </div>

                                    {/* Total Joma Card */}
                                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center space-y-1.5">
                                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-1">
                                        <Coins className="w-4 h-4" />
                                      </div>
                                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        {t("totalCash")}
                                      </span>
                                      <span className="text-lg font-black text-blue-700 font-mono">
                                        ৳ {formatNumber(data.totalCash)}
                                      </span>
                                      {data.jomaForBaki > 0 && (
                                        <span className="text-[10px] font-medium text-slate-400 block mt-1">
                                          ({t("dueCollection")}: ৳{" "}
                                          {formatNumber(data.jomaForBaki)})
                                        </span>
                                      )}
                                    </div>

                                    {/* Total Baki Card */}
                                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center space-y-1.5">
                                      <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mb-1">
                                        <AlertCircle className="w-4 h-4" />
                                      </div>
                                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        {t("totalDue")}
                                      </span>
                                      <span className="text-lg font-black text-rose-700 font-mono">
                                        ৳ {formatNumber(data.totalBaki)}
                                      </span>
                                      <span className="text-[10px] font-medium text-slate-400 block mt-1">
                                        ({t("dueGiven")}: ৳{" "}
                                        {formatNumber(data.totalBakiGiven)})
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
