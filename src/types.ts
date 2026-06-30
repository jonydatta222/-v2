/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SaleItem {
  id: string;
  productName: string;
  price: number;
  paymentType: 'cash' | 'baki';
  customerName?: string;
  timestamp: string; // e.g. "10:30 AM" or "১০:৩০ মিনিট"
  date: string; // YYYY-MM-DD
}

export interface CustomerDue {
  customerName: string;
  totalDue: number;
  items: SaleItem[];
}

export interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
  timestamp: string;
  date: string;
}

export interface StoreInfo {
  name: string;
  phone?: string;
}
