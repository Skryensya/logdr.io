/**
 * Account business rules and validations
 */

import { Account } from '@/types/database';
import { ValidationResult } from './types';

export class AccountRules {
  /**
   * Validate account creation/update
   */
  static validate(account: Partial<Account>, existingAccounts: Account[] = []): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Name validation
    if (!account.name || account.name.trim().length === 0) {
      errors.push('Account name is required');
    } else if (account.name.trim().length > 100) {
      errors.push('Account name must be 100 characters or less');
    }

    // Check for duplicate names
    if (account.name) {
      const duplicates = existingAccounts.filter(existing => 
        existing.name.toLowerCase() === account.name!.toLowerCase() && 
        existing._id !== account._id
      );
      if (duplicates.length > 0) {
        errors.push('Account name must be unique');
      }
    }

    // Currency validation
    if (account.defaultCurrency) {
      // Currency validation is handled by schema validation
    }

    // Minor unit validation
    if (account.minorUnit !== undefined) {
      if (account.minorUnit < 0 || account.minorUnit > 8) {
        errors.push('Minor unit must be between 0 and 8');
      }
    }

    // Account type validation
    if (account.type) {
      const validTypes = ['asset', 'liability', 'income', 'expense', 'equity'];
      if (!validTypes.includes(account.type)) {
        errors.push('Invalid account type');
      }
    }

    // Business logic warnings
    if (account.type === 'asset' && account.balance !== undefined && account.balance < 0) {
      warnings.push('Asset accounts typically have positive balances');
    }

    if (account.type === 'liability' && account.balance !== undefined && account.balance > 0) {
      warnings.push('Liability accounts typically have negative balances');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate account archival
   */
  static validateArchival(account: Account, hasTransactions: boolean): ValidationResult {
    const errors: string[] = [];

    if (hasTransactions && !account.archived) {
      errors.push('Cannot archive account with existing transactions. Set visible=false instead.');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate account balance update
   */
  static validateBalanceUpdate(
    account: Account, 
    newBalance: number,
    calculatedBalance?: number
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if manually set balance matches calculated balance
    if (calculatedBalance !== undefined && Math.abs(newBalance - calculatedBalance) > 0.01) {
      warnings.push(`Manual balance (${newBalance}) doesn't match calculated balance (${calculatedBalance})`);
    }

    // Type-specific validations
    if (account.type === 'asset' && newBalance < 0) {
      warnings.push('Asset account has negative balance');
    }

    if (account.type === 'liability' && newBalance > 0) {
      warnings.push('Liability account has positive balance');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }
}