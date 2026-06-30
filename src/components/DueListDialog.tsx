/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Search,
  CheckCircle2,
  User,
  ChevronRight,
  ChevronDown,
  Calendar,
  Receipt,
  Trash2,
} from "lucide-react";
import { SaleItem, CustomerDue } from "../types";
import { useLanguage } from "../LanguageContext";

interface DueListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sales: SaleItem[];
  onSettleDue: (itemIds: string[]) => void;
  onAddSale: (sale: Omit<SaleItem, "id" | "timestamp" | "date">) => void;
  onDeleteSale: (id: string) => void;
}

export const DueListDialog: React.FC<DueListDialogProps> = ({
  isOpen,
  onClose,
  sales,
  onSettleDue,
  onAddSale,
  onDeleteSale,
}) => {
  const { t, formatNumber } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // States for the custom joma popup dialog
  const [jomaCustomer, setJomaCustomer] = useState<string | null>(null);
  const [jomaAmountInput, setJomaAmountInput] = useState("");
  const [jomaError, setJomaError] = useState<string | null>(null);

  // Filter and compute dues correctly (Total Baki minus any Repayments)
  const customerDues = useMemo(() => {
    if (!isOpen) return [];
    const groups: {
      [key: string]: { bakiItems: SaleItem[]; jomaAmount: number };
    } = {};

    sales.forEach((item) => {
      const name = item.customerName || "বেনামী ক্রেতা";
      if (!groups[name]) {
        groups[name] = { bakiItems: [], jomaAmount: 0 };
      }

      if (item.paymentType === "baki") {
        groups[name].bakiItems.push(item);
      } else if (
        item.paymentType === "cash" &&
        item.productName === `বাকির টাকা জমা - ${name}`
      ) {
        groups[name].jomaAmount += item.price;
      }
    });

    const duesList: CustomerDue[] = Object.keys(groups)
      .map((name) => {
        const { bakiItems, jomaAmount } = groups[name];
        const totalBaki = bakiItems.reduce((sum, item) => sum + item.price, 0);
        const totalDue = totalBaki - jomaAmount;
        return {
          customerName: name,
          totalDue: totalDue > 0 ? totalDue : 0,
          items: bakiItems,
        };
      })
      .filter((due) => due.totalDue > 0);

    // Sort by total due amount descending
    return duesList.sort((a, b) => b.totalDue - a.totalDue);
  }, [sales, isOpen]);

  // Filter by search term
  const filteredDues = useMemo(() => {
    return customerDues.filter((due) =>
      due.customerName.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [customerDues, searchTerm]);

  const toggleExpand = (name: string) => {
    setExpandedCustomer(expandedCustomer === name ? null : name);
  };

  const handleSettleAll = (items: SaleItem[]) => {
    const ids = items.map((i) => i.id);
    onSettleDue(ids);
  };

  const handleSettleItem = (id: string) => {
    onSettleDue([id]);
  };

  const handleOpenJoma = (customerName: string) => {
    setJomaCustomer(customerName);
    setJomaAmountInput("");
    setJomaError(null);
  };

  const handleAddJomaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jomaCustomer) return;

    const activeDue = customerDues.find((d) => d.customerName === jomaCustomer);
    if (!activeDue) return;

    const amount = parseFloat(jomaAmountInput);
    if (isNaN(amount) || amount <= 0) {
      setJomaError("দয়া করে সঠিক জমার পরিমাণ লিখুন");
      return;
    }

    if (amount > activeDue.totalDue) {
      setJomaError(
        `বাকি টাকার চেয়ে বেশি জমা নেওয়া যাবে না! (সর্বোচ্চ ৳${formatNumber(activeDue.totalDue)})`,
      );
      return;
    }

    onAddSale({
      productName: `বাকির টাকা জমা - ${jomaCustomer}`,
      price: amount,
      paymentType: "cash",
      customerName: jomaCustomer,
    });

    setJomaCustomer(null);
    setJomaAmountInput("");
    setJomaError(null);
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
            className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden will-change-transform"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {t("dueListTitle")}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {t("dueListSubtitle")}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-200/50 rounded-xl transition-colors text-slate-500 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search and stats bar */}
            <div className="p-4 bg-white border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400"
                />
              </div>
              <div className="flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-xl border border-orange-100 self-start md:self-auto">
                <span className="text-xs font-semibold text-orange-700">
                  {t("totalDueOverall")}
                </span>
                <span className="text-sm font-bold text-orange-800 font-mono">
                  {formatNumber(customerDues.length)} {t("dueRecords")}
                </span>
              </div>
            </div>

            {/* Body / List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {filteredDues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <User className="w-8 h-8 text-slate-300" />
                  </div>
                  <h4 className="text-base font-semibold text-slate-800">
                    {t("noDue")}
                  </h4>
                  <p className="text-sm text-slate-400 mt-1 max-w-sm">
                    {t("noDueDesc")}
                  </p>
                </div>
              ) : (
                filteredDues.map((due) => {
                  const isExpanded = expandedCustomer === due.customerName;
                  return (
                    <div
                      key={due.customerName}
                      className="border border-slate-100 rounded-2xl bg-slate-50/30 overflow-hidden shadow-2xs hover:border-slate-200 transition-all"
                    >
                      {/* Main row */}
                      <div
                        onClick={() => toggleExpand(due.customerName)}
                        className="flex items-center justify-between p-4 bg-white hover:bg-slate-50/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                            {due.customerName.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-800 text-base">
                              {due.customerName}
                            </h4>
                            <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Receipt className="w-3.5 h-3.5 text-slate-400" />
                              {formatNumber(due.items.length)} টি পণ্য ক্রয়
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-xs text-slate-400 block">
                              মোট পাওনা
                            </span>
                            <span className="font-bold text-rose-600 text-lg">
                              ৳ {formatNumber(due.totalDue)}
                            </span>
                          </div>

                          <button
                            id="btn_joma_action"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenJoma(due.customerName);
                            }}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
                          >
                            জমা
                          </button>

                          <div className="text-slate-400">
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5" />
                            ) : (
                              <ChevronRight className="w-5 h-5" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded items */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            className="overflow-hidden border-t border-slate-100 bg-slate-50/50"
                          >
                            <div className="p-4 space-y-3">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                                <span className="text-xs font-semibold text-slate-500">
                                  ক্রয়কৃত মালামাল
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSettleAll(due.items);
                                  }}
                                  className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  সব পরিশোধ
                                </button>
                              </div>

                              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                {due.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl"
                                  >
                                    <div>
                                      <div className="text-sm font-medium text-slate-800">
                                        {item.productName}
                                      </div>
                                      <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                                        <Calendar className="w-3.5 h-3.5 text-slate-300" />
                                        <span>{item.date}</span>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                        <span>{item.timestamp}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="font-semibold text-slate-800 text-sm">
                                        ৳ {formatNumber(item.price)}
                                      </span>
                                      <button
                                        onClick={() =>
                                          handleSettleItem(item.id)
                                        }
                                        title={t("confirmPayment")}
                                        className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                                      >
                                        <CheckCircle2 className="w-4 h-4" />
                                      </button>
                                      {deleteConfirmId === item.id ? (
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() =>
                                              onDeleteSale(item.id)
                                            }
                                            className="px-2 py-1 text-xs font-bold bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors cursor-pointer"
                                          >
                                            {t("confirm")}
                                          </button>
                                          <button
                                            onClick={() =>
                                              setDeleteConfirmId(null)
                                            }
                                            className="px-2 py-1 text-xs font-bold bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors cursor-pointer"
                                          >
                                            {t("cancel")}
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() =>
                                            setDeleteConfirmId(item.id)
                                          }
                                          title={t("delete")}
                                          className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
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

            {/* Nested Joma Dialog Overlay */}
            <AnimatePresence>
              {jomaCustomer && (
                <div className="absolute inset-0 z-55 flex items-center justify-center p-6 bg-slate-900/60">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col space-y-4 will-change-transform"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h4 className="font-bold text-slate-800 text-base">
                        {jomaCustomer} - এর জমা
                      </h4>
                      <button
                        onClick={() => setJomaCustomer(null)}
                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleAddJomaSubmit} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500">
                          জমার পরিমাণ লিখুন (সর্বোচ্চ ৳
                          {formatNumber(
                            customerDues.find(
                              (d) => d.customerName === jomaCustomer,
                            )?.totalDue || 0,
                          )}
                          )
                        </label>
                        <input
                          type="number"
                          step="any"
                          placeholder="৳ জমার পরিমাণ"
                          value={jomaAmountInput}
                          onChange={(e) => {
                            setJomaAmountInput(e.target.value);
                            setJomaError(null);
                          }}
                          className="w-full px-4 py-2.5 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          autoFocus
                        />
                        {jomaError && (
                          <span className="text-xs font-semibold text-rose-500 block pl-1">
                            {jomaError}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-3 justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => setJomaCustomer(null)}
                          className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        >
                          বাতিল
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          জমা করুন
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
