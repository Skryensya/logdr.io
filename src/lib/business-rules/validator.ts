/**
 * Combined business rules validator
 */

import { Account, Category, Transaction, TransactionLine } from '@/types/database';
import { AccountRules } from './account-rules';
import { CategoryRules } from './category-rules';
import { TransactionRules } from './transaction-rules';
import { ValidationResult } from './types';

/**
 * Combined validation function
 */
export function validateBusinessRules(
  entity: 'account',
  data: Partial<Account>,
  context?: { existingAccounts?: Account[] }
): ValidationResult;

export function validateBusinessRules(
  entity: 'category',
  data: Partial<Category>,
  context?: { existingCategories?: Category[] }
): ValidationResult;

export function validateBusinessRules(
  entity: 'transaction',
  data: Partial<Transaction>,
  context: { 
    existingAccounts: Account[];
    transactionLines: TransactionLine[];
  }
): ValidationResult;

export function validateBusinessRules(
  entity: 'account' | 'category' | 'transaction',
  data: Partial<Account> | Partial<Category> | Partial<Transaction>,
  context: {
    existingAccounts?: Account[];
    existingCategories?: Category[];
    transactionLines?: TransactionLine[];
  } = {}
): ValidationResult {
  switch (entity) {
    case 'account':
      return AccountRules.validate(data as Partial<Account>, context.existingAccounts);
    
    case 'category':
      return CategoryRules.validate(data as Partial<Category>, context.existingCategories);
    
    case 'transaction':
      if (!context.transactionLines || !context.existingAccounts) {
        throw new Error('Transaction validation requires lines and accounts context');
      }
      return TransactionRules.validateTransaction(
        data as Partial<Transaction>, 
        context.transactionLines, 
        context.existingAccounts
      );
    
    default:
      throw new Error(`Unknown entity type: ${entity}`);
  }
}