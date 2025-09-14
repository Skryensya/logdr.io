/**
 * Balance and account-related database queries
 */

import { MonthlyBalance } from '@/types/database';
import { MoneyAmount } from '../currency';
import { QueryContext, getRawDB } from './types';

/**
 * Get monthly balances by account and currency
 */
export async function getMonthlyBalances(
  context: QueryContext,
  yearMonth?: string
): Promise<MonthlyBalance[]> {
  const rawDB = getRawDB(context.db);
  
  const options: Record<string, unknown> = {
    group: true
  };
  
  if (yearMonth) {
    // Query only a specific month
    options.startkey = [yearMonth];
    options.endkey = [yearMonth, {}];
  }
  
  const result = await rawDB.query('balance_views/monthly_balance', options);
  
  return result.rows.map((row: Record<string, unknown>) => ({
    yearMonth: row.key[0] as string,
    accountId: row.key[1] as string,
    currency: row.key[2] as string,
    balance: row.value as number
  }));
}

/**
 * Get current balance for a specific account
 */
export async function getAccountBalance(
  context: QueryContext,
  accountId: string,
  currency?: string
): Promise<MoneyAmount[]> {
  const rawDB = getRawDB(context.db);
  
  const options: Record<string, unknown> = {
    group: true,
    startkey: [null, accountId],
    endkey: [null, accountId, {}]
  };
  
  const result = await rawDB.query('balance_views/monthly_balance', options);
  
  const balancesByCurrency = new Map<string, number>();
  
  result.rows.forEach((row: Record<string, unknown>) => {
    const curr = (row.key as unknown[])[2] as string;
    const amount = row.value as number;
    
    if (!currency || curr === currency) {
      balancesByCurrency.set(curr, (balancesByCurrency.get(curr) || 0) + amount);
    }
  });
  
  return Array.from(balancesByCurrency.entries()).map(([curr, amount]) => 
    MoneyAmount.fromRaw(amount, curr)
  );
}

/**
 * Get current balances for all accounts (sum over all months)
 */
export async function getCurrentBalancesByCurrency(
  context: QueryContext
): Promise<{ currency: string; balance: MoneyAmount }[]> {
  const rawDB = getRawDB(context.db);
  const result = await rawDB.query('balance_views/monthly_balance', {
    group: true
  });
  
  const balancesByCurrency = new Map<string, number>();
  
  result.rows.forEach((row: Record<string, unknown>) => {
    const currency = (row.key as unknown[])[2] as string;
    const amount = row.value as number;
    balancesByCurrency.set(currency, (balancesByCurrency.get(currency) || 0) + amount);
  });

  return Array.from(balancesByCurrency.entries()).map(([currency, amount]) => ({
    currency,
    balance: MoneyAmount.fromRaw(amount, currency)
  }));
}