"use client";

import { useDatabase } from '@/contexts/DatabaseContext';

export function useCategories() {
  const {
    categories,
    createCategory,
    updateCategory,
    clearAllCategories,
    isLoading
  } = useDatabase();

  // Transform categories for compatibility with existing components
  const getCategoryOptions = () => {
    return categories
      .filter(cat => cat.visible && !cat.archived)
      .map(cat => ({
        value: cat.id,
        label: cat.name,
        type: cat.type
      }));
  };

  return {
    categories,
    isLoading: false, // Simple implementation - no loading states  
    error: null,
    createCategory,
    updateCategory,
    deleteCategory: updateCategory, // Alias for compatibility
    clearAllCategories,
    refreshCategories: async () => {}, // No-op in simple implementation
    getCategoryOptions
  };
}