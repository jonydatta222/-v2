/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShoppingBag, DollarSign, User, PlusCircle, Receipt } from 'lucide-react';
import { SaleItem } from '../types';
import { useLanguage } from '../LanguageContext';

interface SaleFormProps {
  onAddSale: (sale: Omit<SaleItem, 'id' | 'timestamp' | 'date'>) => void;
  onOpenExpense: () => void;
}

export const SaleForm: React.FC<SaleFormProps> = ({ onAddSale, onOpenExpense }) => {
  const { t } = useLanguage();
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [paymentType, setPaymentType] = useState<'cash' | 'baki'>('cash');
  const [customerName, setCustomerName] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Reset customer name if payment type is switched to cash
  useEffect(() => {
    if (paymentType === 'cash') {
      setCustomerName('');
    }
  }, [paymentType]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!productName.trim()) {
      newErrors.productName = t('errorProductName');
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      newErrors.price = t('errorPrice');
    }
    if (paymentType === 'baki' && !customerName.trim()) {
      newErrors.customerName = t('customerNameLabel'); // Using same for required
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onAddSale({
      productName: productName.trim(),
      price: parseFloat(price),
      paymentType,
      customerName: paymentType === 'baki' ? customerName.trim() : undefined,
    });

    // Reset fields
    setProductName('');
    setPrice('');
    setPaymentType('cash');
    setCustomerName('');
    setErrors({});
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-slate-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xs hover:shadow-md transition-all duration-300 space-y-3"
    >
      <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm sm:text-base">{t('newSaleFormTitle')}</h3>
        </div>
        <button
          type="button"
          onClick={onOpenExpense}
          className="px-2.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Receipt className="w-3.5 h-3.5" />
          {t('addExpenseBtn')}
        </button>
      </div>

      {/* Product Name & Price side-by-side */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3.5">
        {/* Product Name */}
        <div className="space-y-1 sm:space-y-1.5">
          <label className="text-[10px] sm:text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            {t('productNameLabel')}
          </label>
          <input
            type="text"
            placeholder={t('productNamePlaceholder')}
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className={`w-full px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs bg-slate-50 border ${
              errors.productName ? 'border-rose-400 focus:ring-rose-500/15 focus:border-rose-500' : 'border-slate-200 focus:ring-slate-900/10 focus:border-slate-900'
            } rounded-lg sm:rounded-xl focus:outline-hidden focus:ring-2 sm:focus:ring-4 transition-all`}
          />
          {errors.productName && (
            <span className="text-[10px] font-semibold text-rose-500 block pl-1">{errors.productName}</span>
          )}
        </div>

        {/* Price */}
        <div className="space-y-1 sm:space-y-1.5">
          <label className="text-[10px] sm:text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <DollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            {t('priceLabel')}
          </label>
          <input
            type="number"
            step="any"
            placeholder={t('pricePlaceholder')}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={`w-full px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs font-semibold font-mono bg-slate-50 border ${
              errors.price ? 'border-rose-400 focus:ring-rose-500/15 focus:border-rose-500' : 'border-slate-200 focus:ring-slate-900/10 focus:border-slate-900'
            } rounded-lg sm:rounded-xl focus:outline-hidden focus:ring-2 sm:focus:ring-4 transition-all`}
          />
          {errors.price && (
            <span className="text-[10px] font-semibold text-rose-500 block pl-1">{errors.price}</span>
          )}
        </div>
      </div>

      {/* Payment Type Toggle */}
      <div className="space-y-1 sm:space-y-1.5">
        <label className="text-[10px] sm:text-xs font-semibold text-slate-500">{t('paymentTypeLabel')}</label>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 p-1 sm:p-1.5 bg-slate-100 rounded-xl sm:rounded-2xl">
          <button
            type="button"
            onClick={() => setPaymentType('cash')}
            className={`py-1.5 sm:py-2.5 text-[10px] sm:text-xs font-bold rounded-lg sm:rounded-xl transition-all cursor-pointer ${
              paymentType === 'cash'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t('cash')}
          </button>
          <button
            type="button"
            onClick={() => setPaymentType('baki')}
            className={`py-1.5 sm:py-2.5 text-[10px] sm:text-xs font-bold rounded-lg sm:rounded-xl transition-all cursor-pointer ${
              paymentType === 'baki'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t('due')}
          </button>
        </div>
      </div>

      {/* Customer Name (Visible only when 'baki' is checked) */}
      {paymentType === 'baki' && (
        <div className="space-y-1 sm:space-y-1.5 animate-fadeIn">
          <label className="text-[10px] sm:text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            {t('customerNameLabel')}
          </label>
          <input
            type="text"
            placeholder={t('customerNamePlaceholder')}
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className={`w-full px-3 py-2 sm:px-4 sm:py-3 text-[10px] sm:text-sm bg-slate-50 border ${
              errors.customerName ? 'border-rose-400 focus:ring-rose-500/15 focus:border-rose-500' : 'border-slate-200 focus:ring-slate-900/10 focus:border-slate-900'
            } rounded-lg sm:rounded-2xl focus:outline-hidden focus:ring-2 sm:focus:ring-4 transition-all`}
          />
          {errors.customerName && (
            <span className="text-[10px] sm:text-xs font-semibold text-rose-500 block pl-1">{errors.customerName}</span>
          )}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full py-2.5 sm:py-3.5 px-4 sm:px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl shadow-md shadow-emerald-600/10 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <span>{t('saveRecord')}</span>
      </button>
    </form>
  );
};
