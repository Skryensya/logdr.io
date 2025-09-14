"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Simple interfaces for all entities
interface SimpleTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  currency: string;
  date: string;
  categoryId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  createdAt: string;
}

interface SimpleAccount {
  id: string;
  name: string;
  type: 'asset' | 'liability' | 'income' | 'expense' | 'equity';
  balance: number;
  currency: string;
  visible: boolean;
  archived: boolean;
  createdAt: string;
}

interface SimpleCategory {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
  visible: boolean;
  archived: boolean;
  createdAt: string;
}

interface DatabaseContextType {
  db: any;
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  
  // Transaction methods
  transactions: SimpleTransaction[];
  totalCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  createTransaction: (description: string, amount: number, type: 'income' | 'expense' | 'transfer', currency?: string, customDate?: string) => Promise<SimpleTransaction>;
  clearAllTransactions: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  loadMoreTransactions: () => Promise<void>;
  
  // Account methods
  accounts: SimpleAccount[];
  createAccount: (name: string, type: 'asset' | 'liability' | 'income' | 'expense' | 'equity', currency?: string) => Promise<SimpleAccount>;
  updateAccount: (id: string, updates: Partial<SimpleAccount>) => Promise<SimpleAccount>;
  clearAllAccounts: () => Promise<void>;
  
  // Category methods
  categories: SimpleCategory[];
  createCategory: (name: string, type: 'income' | 'expense' | 'both') => Promise<SimpleCategory>;
  updateCategory: (id: string, updates: Partial<SimpleCategory>) => Promise<SimpleCategory>;
  clearAllCategories: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export function DatabaseProvider({ children }: { children: ReactNode }) {
  console.log('🟢 SIMPLE DATABASE PROVIDER INITIALIZED');
  
  // State for all entities
  const [transactions, setTransactions] = useState<SimpleTransaction[]>([]);
  const [accounts, setAccounts] = useState<SimpleAccount[]>([]);
  const [categories, setCategories] = useState<SimpleCategory[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading] = useState(false);
  const [isLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error] = useState<string | null>(null);

  const db = { simple: true }; // Fake db object
  const isInitialized = true;
  const isInitializing = false;

  // Load all data from localStorage
  useEffect(() => {
    const loadFromStorage = () => {
      try {
        // Load transactions
        const storedTransactions = localStorage.getItem('simple-transactions');
        if (storedTransactions) {
          const parsedTransactions = JSON.parse(storedTransactions);
          setTransactions(parsedTransactions);
          setTotalCount(parsedTransactions.length);
          setHasMore(false); // All loaded at once for now
        }

        // Load accounts
        const storedAccounts = localStorage.getItem('simple-accounts');
        if (storedAccounts) {
          const parsedAccounts = JSON.parse(storedAccounts);
          setAccounts(parsedAccounts);
        } else {
          // Create default accounts
          const defaultAccounts: SimpleAccount[] = [
            {
              id: 'acc_cash',
              name: 'Cash',
              type: 'asset',
              balance: 0,
              currency: 'CLP',
              visible: true,
              archived: false,
              createdAt: new Date().toISOString()
            },
            {
              id: 'acc_bank',
              name: 'Bank Account',
              type: 'asset', 
              balance: 0,
              currency: 'CLP',
              visible: true,
              archived: false,
              createdAt: new Date().toISOString()
            }
          ];
          setAccounts(defaultAccounts);
          localStorage.setItem('simple-accounts', JSON.stringify(defaultAccounts));
        }

        // Load categories
        const storedCategories = localStorage.getItem('simple-categories');
        if (storedCategories) {
          const parsedCategories = JSON.parse(storedCategories);
          setCategories(parsedCategories);
        } else {
          // Create default categories
          const defaultCategories: SimpleCategory[] = [
            {
              id: 'cat_food',
              name: 'Food & Dining',
              type: 'expense',
              visible: true,
              archived: false,
              createdAt: new Date().toISOString()
            },
            {
              id: 'cat_transport',
              name: 'Transportation',
              type: 'expense',
              visible: true,
              archived: false,
              createdAt: new Date().toISOString()
            },
            {
              id: 'cat_salary',
              name: 'Salary',
              type: 'income',
              visible: true,
              archived: false,
              createdAt: new Date().toISOString()
            }
          ];
          setCategories(defaultCategories);
          localStorage.setItem('simple-categories', JSON.stringify(defaultCategories));
        }
      } catch (err) {
        console.error('Error loading data from storage:', err);
      }
    };

    loadFromStorage();
  }, []);

  // Save functions for each entity
  const saveTransactionsToStorage = (newTransactions: SimpleTransaction[]) => {
    try {
      localStorage.setItem('simple-transactions', JSON.stringify(newTransactions));
    } catch (err) {
      console.error('Error saving transactions to storage:', err);
    }
  };

  const saveAccountsToStorage = (newAccounts: SimpleAccount[]) => {
    try {
      localStorage.setItem('simple-accounts', JSON.stringify(newAccounts));
    } catch (err) {
      console.error('Error saving accounts to storage:', err);
    }
  };

  const saveCategoriesToStorage = (newCategories: SimpleCategory[]) => {
    try {
      localStorage.setItem('simple-categories', JSON.stringify(newCategories));
    } catch (err) {
      console.error('Error saving categories to storage:', err);
    }
  };

  // ==================== TRANSACTION METHODS ====================
  
  const createTransaction = async (
    description: string,
    amount: number,
    type: 'income' | 'expense' | 'transfer',
    currency = 'CLP',
    customDate?: string
  ): Promise<SimpleTransaction> => {
    console.log('🟢 SIMPLE createTransaction called with:', { description, amount, type, currency, customDate });
    
    const transaction: SimpleTransaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      description,
      amount,
      type,
      currency,
      date: customDate || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    const newTransactions = [transaction, ...transactions];
    setTransactions(newTransactions);
    setTotalCount(newTransactions.length);
    saveTransactionsToStorage(newTransactions);

    console.log('🟢 SIMPLE transaction created successfully:', transaction);
    return transaction;
  };

  const clearAllTransactions = async () => {
    setTransactions([]);
    setTotalCount(0);
    localStorage.removeItem('simple-transactions');
    console.log('✅ All transactions cleared');
  };

  const refreshTransactions = async () => {
    // Already loaded from localStorage
  };

  const loadMoreTransactions = async () => {
    // For now, all transactions are loaded at once
  };

  // ==================== ACCOUNT METHODS ====================
  
  const createAccount = async (
    name: string,
    type: 'asset' | 'liability' | 'income' | 'expense' | 'equity',
    currency = 'CLP'
  ): Promise<SimpleAccount> => {
    const account: SimpleAccount = {
      id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name,
      type,
      balance: 0,
      currency,
      visible: true,
      archived: false,
      createdAt: new Date().toISOString()
    };

    const newAccounts = [...accounts, account];
    setAccounts(newAccounts);
    saveAccountsToStorage(newAccounts);

    return account;
  };

  const updateAccount = async (id: string, updates: Partial<SimpleAccount>): Promise<SimpleAccount> => {
    const newAccounts = accounts.map(acc => 
      acc.id === id ? { ...acc, ...updates } : acc
    );
    setAccounts(newAccounts);
    saveAccountsToStorage(newAccounts);

    const updatedAccount = newAccounts.find(acc => acc.id === id)!;
    return updatedAccount;
  };

  const clearAllAccounts = async () => {
    setAccounts([]);
    localStorage.removeItem('simple-accounts');
    console.log('✅ All accounts cleared');
  };

  // ==================== CATEGORY METHODS ====================
  
  const createCategory = async (
    name: string,
    type: 'income' | 'expense' | 'both'
  ): Promise<SimpleCategory> => {
    const category: SimpleCategory = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name,
      type,
      visible: true,
      archived: false,
      createdAt: new Date().toISOString()
    };

    const newCategories = [...categories, category];
    setCategories(newCategories);
    saveCategoriesToStorage(newCategories);

    return category;
  };

  const updateCategory = async (id: string, updates: Partial<SimpleCategory>): Promise<SimpleCategory> => {
    const newCategories = categories.map(cat => 
      cat.id === id ? { ...cat, ...updates } : cat
    );
    setCategories(newCategories);
    saveCategoriesToStorage(newCategories);

    const updatedCategory = newCategories.find(cat => cat.id === id)!;
    return updatedCategory;
  };

  const clearAllCategories = async () => {
    setCategories([]);
    localStorage.removeItem('simple-categories');
    console.log('✅ All categories cleared');
  };

  const value: DatabaseContextType = {
    db,
    isInitialized,
    isInitializing,
    error,
    
    // Transaction data & methods
    transactions,
    totalCount,
    isLoading,
    isLoadingMore,
    hasMore,
    createTransaction,
    clearAllTransactions,
    refreshTransactions,
    loadMoreTransactions,
    
    // Account data & methods
    accounts,
    createAccount,
    updateAccount,
    clearAllAccounts,
    
    // Category data & methods
    categories,
    createCategory,
    updateCategory,
    clearAllCategories
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}