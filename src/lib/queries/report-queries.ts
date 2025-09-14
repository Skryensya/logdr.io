/**
 * Report and cashflow database queries
 */

import { MonthlyCashflow } from '@/types/database';
import { MoneyAmount } from '../currency';
import { QueryContext, getRawDB } from './types';
import { getMonthlyBalances } from './balance-queries';
import { getMonthlyCategoryTotals } from './category-queries';

/**
 * Get monthly cashflow (income vs expenses)
 */
export async function getMonthlyCashflow(
  context: QueryContext,
  yearMonth: string
): Promise<MonthlyCashflow[]> {
  const rawDB = getRawDB(context.db);
  
  const result = await rawDB.query('balance_views/monthly_cashflow', {
    group: true,
    startkey: [yearMonth],
    endkey: [yearMonth, {}]
  });
  
  return result.rows.map((row: Record<string, unknown>) => ({
    yearMonth: (row.key as unknown[])[0] as string,
    currency: (row.key as unknown[])[1] as string,
    kind: (row.key as unknown[])[2] as 'in' | 'out',
    amount: row.value as number
  }));
}

/**
 * Get comprehensive monthly financial report
 */
export async function getMonthlyReport(
  context: QueryContext,
  yearMonth: string
): Promise<{
  balances: Record<string, MoneyAmount>;
  income: Record<string, MoneyAmount>;
  expenses: Record<string, MoneyAmount>;
  netFlow: Record<string, MoneyAmount>;
  categories: Array<{ categoryId: string; amount: MoneyAmount; }>;
}> {
  // Get cashflow
  const cashflow = await getMonthlyCashflow(context, yearMonth);
  const categoryTotals = await getMonthlyCategoryTotals(context, yearMonth);
  
  // Process income and expenses by currency
  const income: Record<string, number> = {};
  const expenses: Record<string, number> = {};
  
  cashflow.forEach(flow => {
    if (flow.kind === 'in') {
      income[flow.currency] = (income[flow.currency] || 0) + flow.amount;
    } else {
      expenses[flow.currency] = (expenses[flow.currency] || 0) + flow.amount;
    }
  });
  
  // Calculate net flow
  const netFlow: Record<string, number> = {};
  const allCurrencies = new Set([...Object.keys(income), ...Object.keys(expenses)]);
  
  allCurrencies.forEach(currency => {
    const incomeAmount = income[currency] || 0;
    const expenseAmount = expenses[currency] || 0;
    netFlow[currency] = incomeAmount - expenseAmount;
  });
  
  // Get current balances (sum of all months up to this one)
  const balances = await getMonthlyBalances(context);
  const currentBalances: Record<string, number> = {};
  
  balances.forEach(balance => {
    if (balance.yearMonth <= yearMonth) {
      currentBalances[balance.currency] = (currentBalances[balance.currency] || 0) + balance.balance;
    }
  });
  
  // Process categories (negative amounts only for expenses)
  const categories = categoryTotals
    .filter(cat => cat.amount < 0)
    .map(cat => ({
      categoryId: cat.categoryId,
      amount: MoneyAmount.fromRaw(Math.abs(cat.amount), cat.currency)
    }));
  
  return {
    balances: Object.fromEntries(
      Object.entries(currentBalances).map(([currency, amount]) => [
        currency, 
        MoneyAmount.fromRaw(amount, currency)
      ])
    ),
    income: Object.fromEntries(
      Object.entries(income).map(([currency, amount]) => [
        currency, 
        MoneyAmount.fromRaw(amount, currency)
      ])
    ),
    expenses: Object.fromEntries(
      Object.entries(expenses).map(([currency, amount]) => [
        currency, 
        MoneyAmount.fromRaw(amount, currency)
      ])
    ),
    netFlow: Object.fromEntries(
      Object.entries(netFlow).map(([currency, amount]) => [
        currency, 
        MoneyAmount.fromRaw(amount, currency)
      ])
    ),
    categories
  };
}