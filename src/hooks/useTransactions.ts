"use client";

import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '@/contexts/AuthContext';
import { TransactionInput, TransactionLineInput, TransactionUpdate } from '@/lib/schemas';
import { Transaction, TransactionLine } from '@/types/database';
import { toast } from 'sonner';
import { useDatabaseEvents } from './useDatabaseEvents';
import { DocumentChangeEvent } from '@/lib/database/events';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const db = useDatabase();
  const eventManager = useDatabaseEvents();

  // Load transactions
  const loadTransactions = useCallback(async () => {
    if (!db) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const transactionList = await db.listTransactions();
      setTransactions(transactionList);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load transactions';
      setError(message);
      console.error('Error loading transactions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  // Load transactions when db is ready
  useEffect(() => {
    if (db) {
      loadTransactions();
    }
  }, [db, loadTransactions]);

  // Set up reactive updates for transactions
  useEffect(() => {
    if (!eventManager) return;

    const handleTransactionChange = (event: DocumentChangeEvent) => {
      console.log('Transaction change detected:', event.type, event.id);
      
      setTransactions(prev => {
        switch (event.type) {
          case 'created':
          case 'updated':
            if (event.document) {
              const updatedTransactions = [...prev];
              const existingIndex = updatedTransactions.findIndex(t => t._id === event.id);
              
              if (existingIndex >= 0) {
                // Update existing transaction
                updatedTransactions[existingIndex] = event.document;
              } else {
                // Add new transaction (sorted by date, newest first)
                updatedTransactions.unshift(event.document);
                updatedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              }
              
              return updatedTransactions;
            }
            break;
            
          case 'deleted':
            return prev.filter(t => t._id !== event.id);
            
          default:
            return prev;
        }
        return prev;
      });
    };

    // Subscribe to transaction and transaction-line changes
    const unsubscribeTransaction = eventManager.onDocumentChange('transaction', handleTransactionChange);
    
    // Also listen for transaction line changes to refresh affected transactions
    const handleTransactionLineChange = (event: DocumentChangeEvent) => {
      console.log('Transaction line change detected:', event.type, event.id);
      // When transaction lines change, we might need to refresh the parent transaction
      // For now, we'll rely on the transaction document updates to handle this
    };
    
    const unsubscribeTransactionLine = eventManager.onDocumentChange('transaction-line', handleTransactionLineChange);
    
    return () => {
      unsubscribeTransaction();
      unsubscribeTransactionLine();
    };
  }, [eventManager]);

  // Create transaction with lines
  const createTransaction = useCallback(async (
    transaction: TransactionInput, 
    lines: TransactionLineInput[]
  ) => {
    if (!db) throw new Error('Database not initialized');
    
    try {
      const result = await db.createTransaction(transaction, lines);
      // No manual refresh needed - reactive updates will handle it
      toast.success('Transacción creada exitosamente');
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create transaction';
      toast.error(`Error al crear transacción: ${message}`);
      throw err;
    }
  }, [db]);

  // Update transaction
  const updateTransaction = useCallback(async (id: string, updates: TransactionUpdate) => {
    if (!db) throw new Error('Database not initialized');
    
    try {
      const updatedTransaction = await db.updateTransaction(id, updates);
      // No manual refresh needed - reactive updates will handle it
      toast.success('Transacción actualizada exitosamente');
      return updatedTransaction;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update transaction';
      toast.error(`Error al actualizar transacción: ${message}`);
      throw err;
    }
  }, [db]);

  // Get transaction by ID
  const getTransaction = useCallback(async (id: string) => {
    if (!db) throw new Error('Database not initialized');
    
    try {
      return await db.getTransaction(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get transaction';
      console.error('Error getting transaction:', err);
      throw err;
    }
  }, [db]);

  // Get transaction lines for a transaction
  const getTransactionLines = useCallback(async (transactionId: string) => {
    if (!db) throw new Error('Database not initialized');
    
    try {
      return await db.getTransactionLines(transactionId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get transaction lines';
      console.error('Error getting transaction lines:', err);
      throw err;
    }
  }, [db]);

  // Search transactions by criteria
  const searchTransactions = useCallback(async (criteria: {
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    accountId?: string;
    description?: string;
  }) => {
    if (!db) throw new Error('Database not initialized');
    
    try {
      // This would need to be implemented in the database layer
      // For now, we'll filter client-side as a fallback
      let filtered = transactions;
      
      if (criteria.startDate) {
        filtered = filtered.filter(t => t.date >= criteria.startDate!);
      }
      
      if (criteria.endDate) {
        filtered = filtered.filter(t => t.date <= criteria.endDate!);
      }
      
      if (criteria.categoryId) {
        filtered = filtered.filter(t => t.categoryId === criteria.categoryId);
      }
      
      if (criteria.description) {
        filtered = filtered.filter(t => 
          t.description.toLowerCase().includes(criteria.description!.toLowerCase())
        );
      }
      
      return filtered;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to search transactions';
      console.error('Error searching transactions:', err);
      throw err;
    }
  }, [db, transactions]);

  return {
    transactions,
    isLoading,
    error,
    createTransaction,
    updateTransaction,
    getTransaction,
    getTransactionLines,
    searchTransactions,
    refreshTransactions: loadTransactions
  };
}