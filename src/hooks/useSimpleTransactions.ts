"use client";

import { useDatabase } from '@/contexts/DatabaseContext';

export function useTransactions() {
  const {
    transactions,
    totalCount,
    isLoading,
    isLoadingMore,
    hasMore,
    createTransaction,
    refreshTransactions,
    loadMoreTransactions
  } = useDatabase();

  return {
    transactions,
    totalCount,
    isLoading,
    isLoadingMore,
    hasMore,
    error: null,
    createTransaction: async (transactionInput: any, lines: any[]) => {
      // For compatibility with existing components, ignore the complex format
      // and just create a simple transaction
      const firstLine = lines[0] || {};
      const amount = Math.abs(firstLine.amount || 0) / 100; // Convert from cents
      const type = firstLine.amount > 0 ? 'income' : 'expense';
      
      return createTransaction(
        transactionInput.description,
        amount,
        type,
        firstLine.currency || 'CLP',
        transactionInput.date
      );
    },
    updateTransaction: async (id: string, updates: any) => {
      // Simple implementation - not supported yet
      throw new Error('Update transaction not implemented in simple mode');
    },
    getTransaction: async (id: string) => {
      return transactions.find(t => t.id === id);
    },
    getTransactionLines: async (transactionId: string) => {
      // Return empty array for compatibility
      return [];
    },
    searchTransactions: async (criteria: any) => {
      // Simple search implementation
      let filtered = transactions;
      
      if (criteria.startDate) {
        filtered = filtered.filter(t => t.date >= criteria.startDate);
      }
      
      if (criteria.endDate) {
        filtered = filtered.filter(t => t.date <= criteria.endDate);
      }
      
      if (criteria.description) {
        filtered = filtered.filter(t => 
          t.description.toLowerCase().includes(criteria.description.toLowerCase())
        );
      }
      
      return filtered;
    },
    loadMoreTransactions,
    refreshTransactions
  };
}