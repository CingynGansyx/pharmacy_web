import client from './client';

export type TransactionType = 'SALE' | 'PURCHASE' | 'DEPOSIT' | 'WITHDRAW' | 'REFUND';

export interface CartLine {
  medicine: {
    barcode: string;
    name: string;
    price: number;
    category?: string;
    insuranceDiscountPercent?: number | null;
  };
  quantity: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  userId: string | null;
  branchId: string | null;
  items: CartLine[];
  total: number;
  bonusEarned: number;
  bonusUsed: number;
  walletUsed: number;
  prescriptionId: string | null;
  dateTime: string;
  cashPaid?: number;
}

export interface Summary {
  totalSales: number;
  totalPurchases: number;
}

export function getAllTransactions() {
  return client.get<Transaction[]>('/transactions');
}

export function getSales() {
  return client.get<Transaction[]>('/transactions/sales');
}

export function getPurchases() {
  return client.get<Transaction[]>('/transactions/purchases');
}

export function getSummary() {
  return client.get<Summary>('/transactions/summary');
}
