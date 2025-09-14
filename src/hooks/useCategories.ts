"use client";

import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '@/contexts/AuthContext';
import { CategoryInput, CategoryUpdate } from '@/lib/schemas';
import { Category } from '@/types/database';
import { toast } from 'sonner';
import { useDatabaseEvents } from './useDatabaseEvents';
import { DocumentChangeEvent } from '@/lib/database/events';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const db = useDatabase();
  const eventManager = useDatabaseEvents();

  // Load categories
  const loadCategories = useCallback(async () => {
    if (!db) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const categoryList = await db.listCategories();
      setCategories(categoryList);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load categories';
      setError(message);
      console.error('Error loading categories:', err);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  // Load categories when db is ready
  useEffect(() => {
    if (db) {
      loadCategories();
    }
  }, [db, loadCategories]);

  // Set up reactive updates for categories
  useEffect(() => {
    if (!eventManager) return;

    const handleCategoryChange = (event: DocumentChangeEvent) => {
      console.log('Category change detected:', event.type, event.id);
      
      setCategories(prev => {
        switch (event.type) {
          case 'created':
          case 'updated':
            if (event.document) {
              const updatedCategories = [...prev];
              const existingIndex = updatedCategories.findIndex(c => c._id === event.id);
              
              if (existingIndex >= 0) {
                // Update existing category
                updatedCategories[existingIndex] = event.document;
              } else {
                // Add new category
                updatedCategories.push(event.document);
              }
              
              return updatedCategories;
            }
            break;
            
          case 'deleted':
            return prev.filter(c => c._id !== event.id);
            
          default:
            return prev;
        }
        return prev;
      });
    };

    // Subscribe to category changes
    const unsubscribe = eventManager.onDocumentChange('category', handleCategoryChange);
    
    return unsubscribe;
  }, [eventManager]);

  // Create category
  const createCategory = useCallback(async (input: CategoryInput) => {
    if (!db) throw new Error('Database not initialized');
    
    try {
      const newCategory = await db.createCategory(input);
      // No manual refresh needed - reactive updates will handle it
      toast.success('Categoría creada exitosamente');
      return newCategory;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create category';
      toast.error(`Error al crear categoría: ${message}`);
      throw err;
    }
  }, [db]);

  // Update category
  const updateCategory = useCallback(async (id: string, updates: CategoryUpdate) => {
    if (!db) throw new Error('Database not initialized');
    
    try {
      const updatedCategory = await db.updateCategory(id, updates);
      // No manual refresh needed - reactive updates will handle it
      toast.success('Categoría actualizada exitosamente');
      return updatedCategory;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update category';
      toast.error(`Error al actualizar categoría: ${message}`);
      throw err;
    }
  }, [db]);

  // Archive category (soft delete)
  const archiveCategory = useCallback(async (id: string) => {
    if (!db) throw new Error('Database not initialized');
    
    try {
      await db.updateCategory(id, { archived: true });
      // No manual refresh needed - reactive updates will handle it
      toast.success('Categoría archivada exitosamente');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to archive category';
      toast.error(`Error al archivar categoría: ${message}`);
      throw err;
    }
  }, [db]);

  // Restore category
  const restoreCategory = useCallback(async (id: string) => {
    if (!db) throw new Error('Database not initialized');
    
    try {
      await db.updateCategory(id, { archived: false });
      // No manual refresh needed - reactive updates will handle it
      toast.success('Categoría restaurada exitosamente');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to restore category';
      toast.error(`Error al restaurar categoría: ${message}`);
      throw err;
    }
  }, [db]);

  // Get category by ID
  const getCategory = useCallback(async (id: string) => {
    if (!db) throw new Error('Database not initialized');
    
    try {
      return await db.getCategory(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get category';
      console.error('Error getting category:', err);
      throw err;
    }
  }, [db]);

  // Get hierarchical categories (with parent-child relationships)
  const getHierarchicalCategories = useCallback(() => {
    const parentCategories = categories.filter(cat => !cat.parentCategoryId && !cat.archived);
    const childCategories = categories.filter(cat => cat.parentCategoryId && !cat.archived);
    
    return parentCategories.map(parent => ({
      ...parent,
      children: childCategories.filter(child => child.parentCategoryId === parent._id)
    }));
  }, [categories]);

  // Get category options for dropdowns (flat list with indentation)
  const getCategoryOptions = useCallback(() => {
    const hierarchical = getHierarchicalCategories();
    const options: Array<{ value: string; label: string; level: number }> = [];
    
    hierarchical.forEach(parent => {
      options.push({
        value: parent._id,
        label: parent.name,
        level: 0
      });
      
      parent.children?.forEach(child => {
        options.push({
          value: child._id,
          label: `— ${child.name}`,
          level: 1
        });
      });
    });
    
    return options;
  }, [getHierarchicalCategories]);

  return {
    categories,
    isLoading,
    error,
    createCategory,
    updateCategory,
    archiveCategory,
    restoreCategory,
    getCategory,
    getHierarchicalCategories,
    getCategoryOptions,
    refreshCategories: loadCategories
  };
}