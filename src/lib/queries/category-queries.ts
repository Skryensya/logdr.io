/**
 * Category-related database queries
 */

import { MonthlyByCategory } from '@/types/database';
import { QueryContext, getRawDB } from './types';

/**
 * Get expenses/income by category for a period
 */
export async function getMonthlyCategoryTotals(
  context: QueryContext,
  yearMonth: string
): Promise<MonthlyByCategory[]> {
  const rawDB = getRawDB(context.db);
  
  const result = await rawDB.query('balance_views/monthly_by_category', {
    group: true,
    startkey: [yearMonth],
    endkey: [yearMonth, {}]
  });
  
  return result.rows.map((row: Record<string, unknown>) => ({
    yearMonth: (row.key as unknown[])[0] as string,
    categoryId: (row.key as unknown[])[1] as string,
    currency: (row.key as unknown[])[2] as string,
    amount: row.value as number
  }));
}

/**
 * Get transactions by category
 */
export async function getTransactionsByCategory(
  context: QueryContext,
  categoryId: string,
  yearMonth?: string,
  limit = 50
): Promise<unknown[]> {
  const rawDB = getRawDB(context.db);
  
  const selector: Record<string, unknown> = {
    _id: { $regex: "^txn::" },
    categoryId
  };
  
  if (yearMonth) {
    selector.yearMonth = yearMonth;
  }
  
  const result = await rawDB.find({
    selector,
    sort: [{ date: 'desc' }],
    limit
  });
  
  return result.docs;
}

/**
 * Process categories for expense reports (negative amounts only)
 */
export async function getExpenseCategories(
  context: QueryContext,
  yearMonth: string
): Promise<{ categoryId: string; amount: number; currency: string }[]> {
  const categoryTotals = await getMonthlyCategoryTotals(context, yearMonth);
  
  return categoryTotals
    .filter(cat => cat.amount < 0)
    .map(cat => ({
      categoryId: cat.categoryId,
      amount: Math.abs(cat.amount),
      currency: cat.currency
    }));
}