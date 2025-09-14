/**
 * Validated database wrapper with Zod schema validation
 * Extends LogdrioDatabase with runtime validation for all operations
 */

import { LogdrioDatabase } from './database';
import {
  validateUser,
  validateAccount,
  validateCategory,
  validateTransaction,
  validateTransactionLine,
  validateUserSettings,
  validateCreateTransactionWithLines,
  userUpdateSchema,
  accountCreateSchema,
  accountUpdateSchema,
  categoryCreateSchema,
  categoryUpdateSchema,
  userSettingsUpdateSchema,
  type AccountInput,
  type AccountUpdate,
  type CategoryInput,
  type CategoryUpdate,
  type TransactionInput,
  type TransactionLineInput,
  type UserSettingsUpdate,
  type UserUpdate
} from '../schemas';
import { 
  User, 
  Account, 
  Category, 
  Transaction, 
  TransactionLine, 
  UserSettings 
} from '@/types/database';

/**
 * Validated database wrapper that ensures all data operations
 * go through Zod schema validation
 */
export class ValidatedLogdrioDatabase {
  private db: LogdrioDatabase;

  constructor(userId: string) {
    this.db = new LogdrioDatabase(userId);
  }

  /**
   * Initialize the underlying database
   */
  async initialize(): Promise<void> {
    await this.db.initialize();
  }

  /**
   * Get raw database instance (use with caution)
   */
  getRawDB(): unknown {
    return this.db.getRawDB();
  }

  /**
   * Get underlying LogdrioDatabase instance
   */
  getUnvalidatedDB(): LogdrioDatabase {
    return this.db;
  }

  // User operations with validation
  async getUser(): Promise<User> {
    const user = await this.db.getUser();
    return validateUser(user);
  }

  async updateUser(updates: UserUpdate): Promise<User> {
    const validatedUpdates = userUpdateSchema.parse(updates);
    const result = await this.db.updateUser(validatedUpdates);
    return validateUser(result);
  }

  // Settings operations with validation
  async getSettings(): Promise<UserSettings> {
    const settings = await this.db.getSettings();
    return validateUserSettings(settings);
  }

  async updateSettings(updates: UserSettingsUpdate): Promise<UserSettings> {
    const validatedUpdates = userSettingsUpdateSchema.parse(updates);
    const result = await this.db.updateSettings(validatedUpdates);
    return validateUserSettings(result);
  }

  // Account operations with validation
  async createAccount(account: AccountInput): Promise<Account> {
    const validatedAccount = accountCreateSchema.parse(account);
    const result = await this.db.createAccount(validatedAccount);
    return validateAccount(result) as Account;
  }

  async getAccount(id: Account['_id']): Promise<Account> {
    const account = await this.db.getAccount(id);
    return validateAccount(account) as Account;
  }

  async updateAccount(id: Account['_id'], updates: AccountUpdate): Promise<Account> {
    const validatedUpdates = accountUpdateSchema.parse(updates);
    const result = await this.db.updateAccount(id, validatedUpdates);
    return validateAccount(result) as Account;
  }

  async listAccounts(activeOnly = true): Promise<Account[]> {
    const accounts = await this.db.listAccounts(activeOnly);
    return accounts.map(account => validateAccount(account) as Account);
  }

  // Category operations with validation
  async createCategory(category: CategoryInput): Promise<Category> {
    const validatedCategory = categoryCreateSchema.parse(category);
    const result = await this.db.createCategory(validatedCategory);
    return validateCategory(result) as Category;
  }

  async getCategory(id: Category['_id']): Promise<Category> {
    const category = await this.db.getCategory(id);
    return validateCategory(category) as Category;
  }

  async updateCategory(id: Category['_id'], updates: CategoryUpdate): Promise<Category> {
    const validatedUpdates = categoryUpdateSchema.parse(updates);
    const result = await this.db.updateCategory(id, validatedUpdates);
    return validateCategory(result) as Category;
  }

  async listCategories(activeOnly = true): Promise<Category[]> {
    const categories = await this.db.listCategories(activeOnly);
    return categories.map(category => validateCategory(category) as Category);
  }

  // Transaction operations with validation
  async createTransaction(
    transaction: TransactionInput,
    lines: TransactionLineInput[]
  ): Promise<{ transaction: Transaction; lines: TransactionLine[] }> {
    // Validate the complete transaction with lines
    const validatedInput = validateCreateTransactionWithLines({
      transaction,
      lines
    });

    const result = await this.db.createTransaction(
      validatedInput.transaction,
      validatedInput.lines
    );

    return {
      transaction: validateTransaction(result.transaction) as Transaction,
      lines: result.lines.map(line => validateTransactionLine(line) as TransactionLine)
    };
  }

  async getTransaction(id: Transaction['_id']): Promise<Transaction> {
    const transaction = await this.db.getTransaction(id);
    return validateTransaction(transaction) as Transaction;
  }

  async getTransactionWithLines(id: Transaction['_id']): Promise<{ transaction: Transaction; lines: TransactionLine[] }> {
    const result = await this.db.getTransactionWithLines(id);
    
    return {
      transaction: validateTransaction(result.transaction) as Transaction,
      lines: result.lines.map(line => validateTransactionLine(line) as TransactionLine)
    };
  }

  async listTransactions(limit = 50, startkey?: string): Promise<Transaction[]> {
    const transactions = await this.db.listTransactions(limit, startkey);
    return transactions.map(transaction => validateTransaction(transaction) as Transaction);
  }

  // Transaction line operations (immutable)
  async getTransactionLines(transactionId: Transaction['_id']): Promise<TransactionLine[]> {
    const { lines } = await this.getTransactionWithLines(transactionId);
    return lines;
  }

  /**
   * Create delta/correction line for immutable transaction lines
   * This follows the immutable pattern - original lines are never modified
   */
  async createCorrectionLine(
    originalLineId: TransactionLine['_id'],
    correctionAmount: number,
    reason: string,
    accountId: Account['_id'],
    currency: string
  ): Promise<TransactionLine> {
    // Get the original line to copy metadata
    const originalResult = await (this.db.getRawDB() as any).find({
      selector: { _id: originalLineId }
    });

    if (!originalResult.docs.length) {
      throw new Error(`Original line not found: ${originalLineId}`);
    }

    const originalLine = validateTransactionLine(originalResult.docs[0]) as TransactionLine;

    // Create correction line data
    const correctionLineData: TransactionLineInput = {
      accountId,
      amount: correctionAmount,
      currency,
      categoryId: originalLine.categoryId,
      deltaType: "correction",
      originalLineId,
      reason
    };

    // We need to create this through a transaction since lines can't exist independently
    // For now, we'll add it to the database directly (this would need refinement in a real system)
    const now = new Date().toISOString();
    const correctionLine: TransactionLine = {
      _id: `line::${Date.now()}` as const, // Simple ID for correction
      transactionId: originalLine.transactionId,
      ...correctionLineData,
      date: originalLine.date,
      yearMonth: originalLine.yearMonth,
      isDebit: correctionAmount < 0,
      createdAt: now
    };

    const validatedLine = validateTransactionLine(correctionLine) as TransactionLine;
    await (this.db.getRawDB() as any).put(validatedLine);
    
    return validatedLine;
  }

  // Utility operations
  async destroy(): Promise<void> {
    await this.db.destroy();
  }

  async getStats(): Promise<Record<string, unknown> | null> {
    return await this.db.getStats();
  }
}

/**
 * Factory function to create validated database instances
 */
export async function createValidatedUserDatabase(userId: string): Promise<ValidatedLogdrioDatabase> {
  const db = new ValidatedLogdrioDatabase(userId);
  await db.initialize();
  return db;
}

/**
 * Validation helper for bulk operations
 */
export function validateBulkDocuments(docs: unknown[]): { valid: unknown[]; errors: { doc: unknown; error: string }[] } {
  const valid: unknown[] = [];
  const errors: { doc: unknown; error: string }[] = [];

  for (const doc of docs) {
    try {
      const docObj = doc as Record<string, unknown>;
      const id = docObj._id as string;
      
      if (id === 'user') {
        valid.push(validateUser(doc));
      } else if (id === 'settings') {
        valid.push(validateUserSettings(doc));
      } else if (id.startsWith('account::')) {
        valid.push(validateAccount(doc));
      } else if (id.startsWith('category::')) {
        valid.push(validateCategory(doc));
      } else if (id.startsWith('txn::')) {
        valid.push(validateTransaction(doc));
      } else if (id.startsWith('line::')) {
        valid.push(validateTransactionLine(doc));
      } else {
        // Unknown document type, pass through
        valid.push(doc);
      }
    } catch (error) {
      errors.push({
        doc,
        error: error instanceof Error ? error.message : 'Unknown validation error'
      });
    }
  }

  return { valid, errors };
}