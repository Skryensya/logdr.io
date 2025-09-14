/**
 * Simple, reliable database with guaranteed persistence
 */

import { dbLogger } from '@/lib/utils/logger';

export interface SimpleTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'income' | 'expense' | 'transfer';
  currency: string;
  categoryId?: string;
  createdAt: string;
}

export class SimpleDB {
  private dbName: string;
  private db: IDBDatabase | null = null;

  constructor(userId: string) {
    this.dbName = `logdrio-simple-${userId}`;
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => {
        dbLogger.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        dbLogger.info('Simple database initialized successfully');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create transactions store
        if (!db.objectStoreNames.contains('transactions')) {
          const store = db.createObjectStore('transactions', { keyPath: 'id' });
          store.createIndex('date', 'date');
          store.createIndex('type', 'type');
          dbLogger.info('Created transactions object store');
        }
      };
    });
  }

  async saveTransaction(transaction: SimpleTransaction): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const txn = this.db!.transaction(['transactions'], 'readwrite');
      const store = txn.objectStore('transactions');
      const request = store.put(transaction);

      request.onerror = () => {
        dbLogger.error('Failed to save transaction:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        dbLogger.debug('Transaction saved:', transaction.id);
        resolve();
      };
    });
  }

  async getAllTransactions(): Promise<SimpleTransaction[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const txn = this.db!.transaction(['transactions'], 'readonly');
      const store = txn.objectStore('transactions');
      const request = store.getAll();

      request.onerror = () => {
        dbLogger.error('Failed to get transactions:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const transactions = request.result || [];
        // Sort by date, newest first
        transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        dbLogger.info('Loaded transactions from IndexedDB:', transactions.length);
        resolve(transactions);
      };
    });
  }

  async getTransactionsWithPagination(offset: number = 0, limit: number = 30): Promise<SimpleTransaction[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const txn = this.db!.transaction(['transactions'], 'readonly');
      const store = txn.objectStore('transactions');
      const request = store.getAll();

      request.onerror = () => {
        dbLogger.error('Failed to get paginated transactions:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const allTransactions = request.result || [];
        // Sort by date, newest first
        allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        // Apply pagination
        const paginatedTransactions = allTransactions.slice(offset, offset + limit);
        dbLogger.info(`Loaded ${paginatedTransactions.length} transactions (offset: ${offset}, limit: ${limit})`);
        resolve(paginatedTransactions);
      };
    });
  }

  async countTransactions(): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const txn = this.db!.transaction(['transactions'], 'readonly');
      const store = txn.objectStore('transactions');
      const request = store.count();

      request.onerror = () => {
        dbLogger.error('Failed to count transactions:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const count = request.result;
        dbLogger.info('Total transactions in IndexedDB:', count);
        resolve(count);
      };
    });
  }

  async clearAllTransactions(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const txn = this.db!.transaction(['transactions'], 'readwrite');
      const store = txn.objectStore('transactions');
      const request = store.clear();

      request.onerror = () => {
        dbLogger.error('Failed to clear transactions:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        dbLogger.info('All transactions cleared from IndexedDB');
        resolve();
      };
    });
  }
}