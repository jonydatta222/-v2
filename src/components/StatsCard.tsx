/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useLanguage } from '../LanguageContext';

interface StatsCardProps {
  id?: string;
  title: string;
  value: number;
  type: 'sales' | 'joma' | 'baki' | 'expense';
  icon: React.ReactNode;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  id,
  title,
  value,
  type,
  icon,
}) => {
  const { formatNumber } = useLanguage();
  const colorMap = {
    sales: {
      bg: 'bg-emerald-50/70 border-emerald-100',
      text: 'text-emerald-700',
      iconBg: 'bg-emerald-100 text-emerald-800',
      border: 'border-emerald-500/20',
    },
    joma: {
      bg: 'bg-blue-50/70 border-blue-100',
      text: 'text-blue-700',
      iconBg: 'bg-blue-100 text-blue-800',
      border: 'border-blue-500/20',
    },
    baki: {
      bg: 'bg-amber-50/70 border-amber-100',
      text: 'text-amber-700',
      iconBg: 'bg-amber-100 text-amber-800',
      border: 'border-amber-500/20',
    },
    expense: {
      bg: 'bg-rose-50/70 border-rose-100',
      text: 'text-rose-700',
      iconBg: 'bg-rose-100 text-rose-800',
      border: 'border-rose-500/20',
    },
  };

  const selected = colorMap[type];

  // Formatting currency in Bengali style
  const formatCurrency = (val: number) => {
    return `৳ ${formatNumber(val)}`;
  };

  return (
    <div
      id={id}
      className={`flex items-center justify-between gap-1 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl border ${selected.bg} ${selected.border} shadow-2xs hover:shadow-sm transition-all duration-300`}
    >
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-[10px] sm:text-xs font-bold text-slate-600 truncate mb-0.5">{title}</span>
        <div className={`text-sm sm:text-lg font-black tracking-tight ${selected.text} truncate`}>
          {formatCurrency(value)}
        </div>
      </div>
      <div className={`p-1 sm:p-1.5 rounded-lg ${selected.iconBg} shrink-0 hidden sm:block`}>
        {icon}
      </div>
    </div>
  );
};
