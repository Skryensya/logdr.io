/**
 * Queries barrel export
 * Provides organized access to all database query functionality
 */

import { LogdrioDatabase } from '../database';

// Types and utilities
export type { QueryContext } from './types';
export { getRawDB } from './types';

// Balance queries
export {
  getMonthlyBalances,
  getAccountBalance,
  getCurrentBalancesByCurrency
} from './balance-queries';

// Category queries
export {
  getMonthlyCategoryTotals,
  getTransactionsByCategory,
  getExpenseCategories
} from './category-queries';

// Report and cashflow queries
export {
  getMonthlyCashflow,
  getMonthlyReport
} from './report-queries';

// Transaction queries
export {
  searchTransactions,
  getTransactionsByDateRange
} from './transaction-queries';

// Statistics queries
export {
  getQuickStats,
  getDocumentCounts
} from './stats-queries';

// Compatibility layer - DatabaseQueries class for backward compatibility
export class DatabaseQueries {
  private context: { db: LogdrioDatabase };

  constructor(db: LogdrioDatabase) {
    this.context = { db };
  }

  // Balance queries
  async getMonthlyBalances(yearMonth?: string) {
    const { getMonthlyBalances } = await import('./balance-queries');
    return getMonthlyBalances(this.context, yearMonth);
  }

  async getAccountBalance(accountId: string, currency?: string) {
    const { getAccountBalance } = await import('./balance-queries');
    return getAccountBalance(this.context, accountId, currency);
  }

  // Category queries
  async getMonthlyCategoryTotals(yearMonth: string) {
    const { getMonthlyCategoryTotals } = await import('./category-queries');
    return getMonthlyCategoryTotals(this.context, yearMonth);
  }

  async getTransactionsByCategory(categoryId: string, yearMonth?: string, limit = 50) {
    const { getTransactionsByCategory } = await import('./category-queries');
    return getTransactionsByCategory(this.context, categoryId, yearMonth, limit);
  }

  // Report queries
  async getMonthlyCashflow(yearMonth: string) {
    const { getMonthlyCashflow } = await import('./report-queries');
    return getMonthlyCashflow(this.context, yearMonth);
  }

  async getMonthlyReport(yearMonth: string) {
    const { getMonthlyReport } = await import('./report-queries');
    return getMonthlyReport(this.context, yearMonth);
  }

  // Transaction queries
  async searchTransactions(query: string, limit = 20) {
    const { searchTransactions } = await import('./transaction-queries');
    return searchTransactions(this.context, query, limit);
  }

  async getTransactionsByDateRange(startDate: string, endDate: string, limit = 50) {
    const { getTransactionsByDateRange } = await import('./transaction-queries');
    return getTransactionsByDateRange(this.context, startDate, endDate, limit);
  }

  // Stats queries
  async getQuickStats() {
    const { getQuickStats } = await import('./stats-queries');
    return getQuickStats(this.context);
  }
}

/**
 * Factory function to create DatabaseQueries instance (backward compatibility)
 */
export function createQueries(db: LogdrioDatabase): DatabaseQueries {
  return new DatabaseQueries(db);
}

/**
 * Create query context for functional API
 */
export function createQueryContext(db: LogdrioDatabase): { db: LogdrioDatabase } {
  return { db };
}