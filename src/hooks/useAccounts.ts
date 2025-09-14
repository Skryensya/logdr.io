"use client";

import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '@/contexts/AuthContext';
import { AccountInput, AccountUpdate } from '@/lib/schemas';
import { Account } from '@/types/database';
import { toast } from 'sonner';
import { useDatabaseEvents } from './useDatabaseEvents';
import { DocumentChangeEvent } from '@/lib/database/events';

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const db = useDatabase();
  const eventManager = useDatabaseEvents();

  // Load accounts
  const loadAccounts = useCallback(async () => {
    if (!db) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const accountList = await db.listAccounts();
      setAccounts(accountList);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load accounts';
      setError(message);
      console.error('Error loading accounts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  // Load accounts when db is ready
  useEffect(() => {
    if (db) {
      loadAccounts();
    }
  }, [db, loadAccounts]);

  // Set up reactive updates for accounts
  useEffect(() => {
    if (!eventManager) return;

    const handleAccountChange = (event: DocumentChangeEvent) => {
      console.log('Account change detected:', event.type, event.id);
      
      setAccounts(prev => {
        switch (event.type) {
          case 'created':
          case 'updated':
            if (event.document) {
              const updatedAccounts = [...prev];
              const existingIndex = updatedAccounts.findIndex(a => a._id === event.id);
              
              if (existingIndex >= 0) {
                // Update existing account
                updatedAccounts[existingIndex] = event.document;
              } else {
                // Add new account
                updatedAccounts.push(event.document);
              }
              
              return updatedAccounts;
            }
            break;
            
          case 'deleted':
            return prev.filter(a => a._id !== event.id);
            
          default:
            return prev;
        }
        return prev;
      });
    };

    // Subscribe to account changes
    const unsubscribe = eventManager.onDocumentChange('account', handleAccountChange);
    
    return unsubscribe;
  }, [eventManager]);

  // Create account
  const createAccount = useCallback(async (input: AccountInput) => {
    if (!db) throw new Error('Database not initialized');
    
    try {
      const newAccount = await db.createAccount(input);
      // No manual refresh needed - reactive updates will handle it
      toast.success('Cuenta creada exitosamente');
      return newAccount;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create account';
      toast.error(`Error al crear cuenta: ${message}`);
      throw err;
    }
  }, [db]);

  // Update account
  const updateAccount = useCallback(async (id: string, updates: AccountUpdate) => {
    if (!db) throw new Error('Database not initialized');
    
    try {
      const updatedAccount = await db.updateAccount(id, updates);
      // No manual refresh needed - reactive updates will handle it
      toast.success('Cuenta actualizada exitosamente');
      return updatedAccount;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update account';
      toast.error(`Error al actualizar cuenta: ${message}`);
      throw err;
    }
  }, [db]);

  // Archive account (soft delete)
  const archiveAccount = useCallback(async (id: string) => {
    if (!db) throw new Error('Database not initialized');
    
    try {
      await db.updateAccount(id, { archived: true });
      // No manual refresh needed - reactive updates will handle it
      toast.success('Cuenta archivada exitosamente');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to archive account';
      toast.error(`Error al archivar cuenta: ${message}`);
      throw err;
    }
  }, [db]);

  // Restore account
  const restoreAccount = useCallback(async (id: string) => {
    if (!db) throw new Error('Database not initialized');
    
    try {
      await db.updateAccount(id, { archived: false });
      // No manual refresh needed - reactive updates will handle it
      toast.success('Cuenta restaurada exitosamente');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to restore account';
      toast.error(`Error al restaurar cuenta: ${message}`);
      throw err;
    }
  }, [db]);

  // Get account by ID
  const getAccount = useCallback(async (id: string) => {
    if (!db) throw new Error('Database not initialized');
    
    try {
      return await db.getAccount(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get account';
      console.error('Error getting account:', err);
      throw err;
    }
  }, [db]);

  return {
    accounts,
    isLoading,
    error,
    createAccount,
    updateAccount,
    archiveAccount,
    restoreAccount,
    getAccount,
    refreshAccounts: loadAccounts
  };
}