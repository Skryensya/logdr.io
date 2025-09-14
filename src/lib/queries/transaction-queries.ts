/**
 * Transaction search and filtering queries
 */

import { QueryContext, getRawDB } from './types';

/**
 * Search transactions by text in description
 */
export async function searchTransactions(
  context: QueryContext,
  query: string,
  limit = 20
): Promise<unknown[]> {
  const rawDB = getRawDB(context.db);
  
  // Simple search by description (PouchDB doesn't have native full-text search)
  const result = await rawDB.find({
    selector: {
      _id: { $regex: "^txn::" },
      description: { $regex: new RegExp(query, 'i') }
    },
    sort: [{ date: 'desc' }],
    limit
  });
  
  return result.docs;
}

/**
 * Get transactions by date range
 */
export async function getTransactionsByDateRange(
  context: QueryContext,
  startDate: string,
  endDate: string,
  limit = 50
): Promise<unknown[]> {
  const rawDB = getRawDB(context.db);
  
  const result = await rawDB.find({
    selector: {
      _id: { $regex: "^txn::" },
      date: { $gte: startDate, $lte: endDate }
    },
    sort: [{ date: 'desc' }, { createdAt: 'desc' }],
    limit
  });
  
  return result.docs;
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