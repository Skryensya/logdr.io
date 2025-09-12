import { LogdrioDatabase } from './database';
import { MonthlyBalance, MonthlyByCategory, MonthlyCashflow } from '@/types/database';
import { MoneyAmount } from './currency';

/**
 * Helper class for common database queries and view operations
 */
export class DatabaseQueries {
  constructor(private db: LogdrioDatabase) {}

  /**
   * Obtiene balances mensuales por cuenta y moneda
   */
  async getMonthlyBalances(yearMonth?: string): Promise<MonthlyBalance[]> {
    const rawDB = this.db.getRawDB();
    
    const options: Record<string, unknown> = {
      group: true
    };
    
    if (yearMonth) {
      // Consultar solo un mes específico
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
   * Obtiene balance actual de una cuenta específica
   */
  async getAccountBalance(accountId: string, currency?: string): Promise<MoneyAmount[]> {
    const rawDB = this.db.getRawDB();
    
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
   * Obtiene gastos/ingresos por categoría en un período
   */
  async getMonthlyCategoryTotals(yearMonth: string): Promise<MonthlyByCategory[]> {
    const rawDB = this.db.getRawDB();
    
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
   * Obtiene flujo de caja mensual (ingresos vs gastos)
   */
  async getMonthlyCashflow(yearMonth: string): Promise<MonthlyCashflow[]> {
    const rawDB = this.db.getRawDB();
    
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
   * Obtiene resumen financiero de un mes
   */
  async getMonthlyReport(yearMonth: string): Promise<{
    balances: Record<string, MoneyAmount>;
    income: Record<string, MoneyAmount>;
    expenses: Record<string, MoneyAmount>;
    netFlow: Record<string, MoneyAmount>;
    categories: Array<{ categoryId: string; amount: MoneyAmount; }>;
  }> {
    // Obtener flujo de caja
    const cashflow = await this.getMonthlyCashflow(yearMonth);
    const categoryTotals = await this.getMonthlyCategoryTotals(yearMonth);
    
    // Procesar ingresos y gastos por moneda
    const income: Record<string, number> = {};
    const expenses: Record<string, number> = {};
    
    cashflow.forEach(flow => {
      if (flow.kind === 'in') {
        income[flow.currency] = (income[flow.currency] || 0) + flow.amount;
      } else {
        expenses[flow.currency] = (expenses[flow.currency] || 0) + flow.amount;
      }
    });
    
    // Calcular flujo neto
    const netFlow: Record<string, number> = {};
    const allCurrencies = new Set([...Object.keys(income), ...Object.keys(expenses)]);
    
    allCurrencies.forEach(currency => {
      const incomeAmount = income[currency] || 0;
      const expenseAmount = expenses[currency] || 0;
      netFlow[currency] = incomeAmount - expenseAmount;
    });
    
    // Obtener balances actuales (suma de todos los meses hasta este)
    const balances = await this.getMonthlyBalances();
    const currentBalances: Record<string, number> = {};
    
    balances.forEach(balance => {
      if (balance.yearMonth <= yearMonth) {
        currentBalances[balance.currency] = (currentBalances[balance.currency] || 0) + balance.balance;
      }
    });
    
    // Procesar categorías (solo gastos negativos)
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

  /**
   * Busca transacciones por texto en descripción
   */
  async searchTransactions(query: string, limit = 20): Promise<unknown[]> {
    const rawDB = this.db.getRawDB();
    
    // Búsqueda simple por descripción (PouchDB no tiene full-text search nativo)
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
   * Obtiene transacciones por período
   */
  async getTransactionsByDateRange(startDate: string, endDate: string, limit = 50): Promise<unknown[]> {
    const rawDB = this.db.getRawDB();
    
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
   * Obtiene transacciones por categoría
   */
  async getTransactionsByCategory(categoryId: string, yearMonth?: string, limit = 50): Promise<unknown[]> {
    const rawDB = this.db.getRawDB();
    
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
   * Obtiene estadísticas rápidas
   */
  async getQuickStats(): Promise<{
    totalTransactions: number;
    totalAccounts: number;
    totalCategories: number;
    lastTransactionDate?: string;
  }> {
    const rawDB = this.db.getRawDB();
    
    // Contar documentos por tipo
    const [txnResult, accountResult, categoryResult] = await Promise.all([
      rawDB.find({
        selector: { _id: { $regex: "^txn::" } },
        fields: ['_id', 'date'],
        sort: [{ date: 'desc' }],
        limit: 1
      }),
      rawDB.find({
        selector: { _id: { $regex: "^account::" } },
        fields: ['_id']
      }),
      rawDB.find({
        selector: { _id: { $regex: "^category::" } },
        fields: ['_id']
      })
    ]);
    
    // Para transacciones, necesitamos contar todas
    const allTxnResult = await rawDB.find({
      selector: { _id: { $regex: "^txn::" } },
      fields: ['_id']
    });
    
    return {
      totalTransactions: allTxnResult.docs.length,
      totalAccounts: accountResult.docs.length,
      totalCategories: categoryResult.docs.length,
      lastTransactionDate: txnResult.docs[0]?.date
    };
  }
}

/**
 * Helper para crear instancia de queries
 */
export function createQueries(db: LogdrioDatabase): DatabaseQueries {
  return new DatabaseQueries(db);
}