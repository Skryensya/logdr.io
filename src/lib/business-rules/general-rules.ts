/**
 * General business rules and system validations
 */

import { Account, Category, Transaction } from '@/types/database';
import { MoneyAmount } from '../currency';
import { ValidationResult } from './types';

export class GeneralRules {
  /**
   * Validate currency consistency
   */
  static validateCurrencyConsistency(
    amount: number,
    currency: string,
    account: Account
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (currency !== account.defaultCurrency) {
      warnings.push(`Using ${currency} in account with default currency ${account.defaultCurrency}`);
    }

    // Check if amount precision matches currency minor unit
    const moneyAmount = MoneyAmount.fromRaw(amount, currency);
    const expectedPrecision = moneyAmount.config.minorUnit;
    const actualPrecision = account.minorUnit;

    if (actualPrecision !== expectedPrecision) {
      warnings.push(`Account precision (${actualPrecision}) doesn't match currency precision (${expectedPrecision})`);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate system limits
   */
  static validateSystemLimits(data: {
    accounts?: Account[];
    categories?: Category[];
    transactions?: Transaction[];
  }): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Account limits
    if (data.accounts && data.accounts.length > 1000) {
      warnings.push('Large number of accounts may impact performance');
    }

    // Category limits
    if (data.categories && data.categories.length > 500) {
      warnings.push('Large number of categories may impact usability');
    }

    // Transaction limits
    if (data.transactions && data.transactions.length > 10000) {
      warnings.push('Large number of transactions may impact performance');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }
}