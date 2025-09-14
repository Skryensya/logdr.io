/**
 * Transaction business rules and validations
 */

import { Transaction, TransactionLine, Account } from '@/types/database';
import { isValidCurrency } from '../currency';
import { ValidationResult } from './types';

export class TransactionRules {
  /**
   * Validate transaction with lines (double-entry)
   */
  static validateTransaction(
    transaction: Partial<Transaction>,
    lines: Partial<TransactionLine>[],
    accounts: Account[]
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Transaction validation
    if (!transaction.description || transaction.description.trim().length === 0) {
      errors.push('Transaction description is required');
    }

    if (!transaction.date || !/^\d{4}-\d{2}-\d{2}$/.test(transaction.date)) {
      errors.push('Valid transaction date is required (YYYY-MM-DD)');
    }

    // Lines validation
    if (!lines || lines.length < 2) {
      errors.push('Transaction must have at least 2 lines (double-entry)');
      return { isValid: false, errors };
    }

    // Validate each line
    const accountMap = new Map(accounts.map(acc => [acc._id, acc]));
    const currencyTotals = new Map<string, number>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Account validation
      if (!line.accountId) {
        errors.push(`Line ${i + 1}: Account is required`);
        continue;
      }

      const account = accountMap.get(line.accountId as Account['_id']);
      if (!account) {
        errors.push(`Line ${i + 1}: Account not found`);
        continue;
      }

      if (account.archived) {
        errors.push(`Line ${i + 1}: Cannot use archived account`);
      }

      // Amount validation
      if (line.amount === undefined || line.amount === null) {
        errors.push(`Line ${i + 1}: Amount is required`);
        continue;
      }

      if (line.amount === 0) {
        warnings.push(`Line ${i + 1}: Zero amount line`);
      }

      // Currency validation
      if (!line.currency) {
        errors.push(`Line ${i + 1}: Currency is required`);
        continue;
      }

      if (!isValidCurrency(line.currency)) {
        errors.push(`Line ${i + 1}: Invalid currency`);
        continue;
      }

      // Accumulate totals by currency
      const currentTotal = currencyTotals.get(line.currency) || 0;
      currencyTotals.set(line.currency, currentTotal + line.amount);
    }

    // Balance validation (must sum to zero for each currency)
    for (const [currency, total] of currencyTotals) {
      if (Math.abs(total) > 0.001) { // Allow for floating point precision
        errors.push(`Transaction lines must balance to zero for ${currency}. Current total: ${total}`);
      }
    }

    // Multi-currency warning
    if (currencyTotals.size > 1) {
      warnings.push('Multi-currency transaction detected');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate transaction correction/delta
   */
  static validateCorrection(
    originalLine: TransactionLine,
    correctionLine: Partial<TransactionLine>
  ): ValidationResult {
    const errors: string[] = [];

    // Must be a correction type
    if (correctionLine.deltaType !== 'correction' && correctionLine.deltaType !== 'reversal') {
      errors.push('Line must be marked as correction or reversal');
    }

    // Must reference original line
    if (!correctionLine.originalLineId || correctionLine.originalLineId !== originalLine._id) {
      errors.push('Correction must reference original line');
    }

    // Must have reason
    if (!correctionLine.reason || correctionLine.reason.trim().length === 0) {
      errors.push('Correction reason is required');
    }

    // Must maintain same transaction context for corrections
    if (correctionLine.deltaType === 'correction' && correctionLine.transactionId !== originalLine.transactionId) {
      errors.push('Correction must be in same transaction as original line');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate date constraints
   */
  static validateDate(transactionDate: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const date = new Date(transactionDate);
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    // Future dates
    if (date > now) {
      warnings.push('Transaction date is in the future');
    }

    // Very old dates
    if (date < oneYearAgo) {
      warnings.push('Transaction date is more than a year ago');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }
}