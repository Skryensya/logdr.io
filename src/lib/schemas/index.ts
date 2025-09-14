/**
 * Schema validation barrel export
 * Provides organized access to all validation schemas
 */

// Base schemas and utilities
export * from './base';

// Entity schemas
export * from './user';
export * from './account';
export * from './category';
export * from './transaction';

// Auth schemas
export * from './auth';

// Currency schemas
export * from './currency';

// View result schemas
export * from './views';

// Re-export validation functions for backward compatibility
export {
  validateUser,
  validateUserSettings
} from './user';

export {
  validateAccount
} from './account';

export {
  validateCategory
} from './category';

export {
  validateTransaction,
  validateTransactionLine,
  validateCreateTransactionWithLines
} from './transaction';