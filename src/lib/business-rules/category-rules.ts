/**
 * Category business rules and validations
 */

import { Category } from '@/types/database';
import { ValidationResult } from './types';

export class CategoryRules {
  /**
   * Validate category creation/update
   */
  static validate(category: Partial<Category>, existingCategories: Category[] = []): ValidationResult {
    const errors: string[] = [];

    // Name validation
    if (!category.name || category.name.trim().length === 0) {
      errors.push('Category name is required');
    } else if (category.name.trim().length > 100) {
      errors.push('Category name must be 100 characters or less');
    }

    // Check for duplicate names within same kind
    if (category.name && category.kind) {
      const duplicates = existingCategories.filter(existing => 
        existing.name.toLowerCase() === category.name!.toLowerCase() && 
        existing.kind === category.kind &&
        existing._id !== category._id
      );
      if (duplicates.length > 0) {
        errors.push(`Category name must be unique within ${category.kind} categories`);
      }
    }

    // Kind validation
    if (category.kind) {
      const validKinds = ['income', 'expense', 'transfer'];
      if (!validKinds.includes(category.kind)) {
        errors.push('Invalid category kind');
      }
    }

    // Parent category validation
    if (category.parentCategoryId) {
      const parent = existingCategories.find(c => c._id === category.parentCategoryId);
      if (!parent) {
        errors.push('Parent category not found');
      } else if (parent.kind !== category.kind) {
        errors.push('Parent category must have same kind');
      } else if (parent.parentCategoryId) {
        errors.push('Cannot create nested subcategories (max 2 levels)');
      }
    }

    // Color validation is handled by schema validation

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate category hierarchy
   */
  static validateHierarchy(categories: Category[]): ValidationResult {
    const errors: string[] = [];

    // Check for circular references
    for (const category of categories) {
      if (category.parentCategoryId) {
        const visited = new Set<string>();
        let current: Category | undefined = category;
        
        while (current?.parentCategoryId) {
          if (visited.has(current._id)) {
            errors.push(`Circular reference detected in category hierarchy: ${category.name}`);
            break;
          }
          visited.add(current._id);
          current = categories.find(c => c._id === current!.parentCategoryId);
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  }
}