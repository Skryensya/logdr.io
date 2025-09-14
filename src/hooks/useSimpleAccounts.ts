"use client";

import { useDatabase } from '@/contexts/DatabaseContext';

export function useAccounts() {
  const {
    accounts,
    createAccount,
    updateAccount,
    clearAllAccounts,
    isLoading
  } = useDatabase();

  return {
    accounts,
    isLoading: false, // Simple implementation - no loading states
    error: null,
    createAccount,
    updateAccount,
    deleteAccount: updateAccount, // Alias for compatibility
    clearAllAccounts,
    refreshAccounts: async () => {}, // No-op in simple implementation
  };
}