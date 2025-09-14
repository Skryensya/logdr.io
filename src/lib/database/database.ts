import { 
  User, 
  Account, 
  Category, 
  Transaction, 
  TransactionLine, 
  UserSettings
} from '@/types/database';
import { ulid } from 'ulid';
import { getUserDB, clearUserData, getDatabaseStats, userDBs } from './manager';
import { dbLogger } from '@/lib/utils/logger';

/**
 * Clase principal para gestionar la base de datos de un usuario
 */
export class LogdrioDatabase {
  private db: unknown;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Inicializa la conexión a la base de datos
   */
  async initialize(): Promise<void> {
    dbLogger.debug('Initializing database for user:', this.userId);
    try {
      this.db = await getUserDB(this.userId);
      dbLogger.info('Database initialized successfully for user:', this.userId);
    } catch (error) {
      dbLogger.error('Failed to initialize database for user:', this.userId, error);
      throw error;
    }
  }

  /**
   * Obtiene la instancia raw de PouchDB
   */
  getRawDB(): unknown {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  // CRUD Operations for User
  async getUser(): Promise<User> {
    return await this.db.get("user");
  }

  async updateUser(updates: Partial<Omit<User, '_id' | 'userId' | 'createdAt'>>): Promise<User> {
    const current = await this.getUser();
    const updated: User = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await this.db.put(updated);
    return updated;
  }

  // CRUD Operations for Settings
  async getSettings(): Promise<UserSettings> {
    return await this.db.get("settings");
  }

  async updateSettings(updates: Partial<Omit<UserSettings, '_id' | 'createdAt'>>): Promise<UserSettings> {
    const current = await this.getSettings();
    const updated: UserSettings = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await this.db.put(updated);
    return updated;
  }

  // CRUD Operations for Accounts
  async createAccount(account: Omit<Account, '_id' | '_rev' | 'createdAt' | 'updatedAt'>): Promise<Account> {
    const id = `account::${ulid()}` as const;
    const now = new Date().toISOString();
    
    const newAccount: Account = {
      _id: id,
      ...account,
      createdAt: now,
      updatedAt: now
    };
    
    await this.db.put(newAccount);
    return newAccount;
  }

  async getAccount(id: Account['_id']): Promise<Account> {
    return await this.db.get(id);
  }

  async updateAccount(id: Account['_id'], updates: Partial<Omit<Account, '_id' | '_rev' | 'createdAt'>>): Promise<Account> {
    const current = await this.getAccount(id);
    const updated: Account = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await this.db.put(updated);
    return updated;
  }

  async listAccounts(activeOnly = true): Promise<Account[]> {
    const selector: Record<string, unknown> = {
      _id: { $regex: "^account::" }
    };
    
    if (activeOnly) {
      selector.archived = false;
      selector.visible = true;
    }
    
    const result = await this.db.find({
      selector
      // Removed sort to fix "Cannot sort when using the default index" error
    });
    
    // Sort in memory as a temporary fix
    const sortedDocs = result.docs.sort((a: any, b: any) => {
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime; // desc order
    });
    
    return sortedDocs;
  }

  // CRUD Operations for Categories
  async createCategory(category: Omit<Category, '_id' | '_rev' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    const id = `category::${ulid()}` as const;
    const now = new Date().toISOString();
    
    const newCategory: Category = {
      _id: id,
      ...category,
      createdAt: now,
      updatedAt: now
    };
    
    await this.db.put(newCategory);
    return newCategory;
  }

  async getCategory(id: Category['_id']): Promise<Category> {
    return await this.db.get(id);
  }

  async updateCategory(id: Category['_id'], updates: Partial<Omit<Category, '_id' | '_rev' | 'createdAt'>>): Promise<Category> {
    const current = await this.getCategory(id);
    const updated: Category = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await this.db.put(updated);
    return updated;
  }

  async listCategories(activeOnly = true): Promise<Category[]> {
    const selector: Record<string, unknown> = {
      _id: { $regex: "^category::" }
    };
    
    if (activeOnly) {
      selector.archived = false;
    }
    
    const result = await this.db.find({
      selector
      // Removed sort to fix "Cannot sort when using the default index" error
    });
    
    // Sort in memory as a temporary fix
    const sortedDocs = result.docs.sort((a: any, b: any) => {
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime; // desc order
    });
    
    return sortedDocs;
  }

  // CRUD Operations for Transactions
  async createTransaction(
    transaction: Omit<Transaction, '_id' | '_rev' | 'createdAt' | 'updatedAt' | 'yearMonth' | 'lineCount'>,
    lines: Omit<TransactionLine, '_id' | 'transactionId' | 'createdAt' | 'yearMonth' | 'isDebit'>[]
  ): Promise<{ transaction: Transaction; lines: TransactionLine[] }> {
    dbLogger.debug('Starting createTransaction...', { transaction, linesCount: lines.length });
    
    // Verificar que la DB esté inicializada
    if (!this.db) {
      dbLogger.error('Database not initialized');
      throw new Error('Database not initialized');
    }
    
    const txnId = `txn::${ulid()}` as const;
    const now = new Date().toISOString();
    const yearMonth = transaction.date.substring(0, 7); // YYYY-MM
    
    dbLogger.debug('Creating transaction with ID:', txnId);
    
    const newTransaction: Transaction = {
      _id: txnId,
      ...transaction,
      yearMonth,
      lineCount: lines.length,
      createdAt: now,
      updatedAt: now
    };
    
    const newLines: TransactionLine[] = lines.map((line, index) => {
      const lineId = `line::${ulid()}` as const;
      dbLogger.debug(`Creating line ${index + 1}/${lines.length} with ID: ${lineId}`);
      return {
        _id: lineId,
        transactionId: txnId,
        ...line,
        date: transaction.date,
        yearMonth,
        isDebit: line.amount < 0,
        createdAt: now
      };
    });
    
    // Validar balance (debe sumar cero)
    const totalAmount = newLines.reduce((sum, line) => sum + line.amount, 0);
    dbLogger.debug('Transaction balance check:', { totalAmount, shouldBeZero: totalAmount === 0 });
    
    if (totalAmount !== 0) {
      dbLogger.error('Balance error - transaction lines must balance to zero:', totalAmount);
      throw new Error(`Transaction lines must balance to zero. Current total: ${totalAmount}`);
    }
    
    // Insertar en batch
    const docs = [newTransaction, ...newLines];
    dbLogger.debug('Attempting to save batch of documents:', {
      count: docs.length,
      docs: docs.map(doc => ({ id: doc._id, type: doc._id.split('::')[0] }))
    });
    
    try {
      const result = await (this.db as any).bulkDocs(docs);
      dbLogger.debug('BulkDocs result:', result);
      
      // Verificar si hay errores en el resultado
      const errors = result.filter((item: any) => item.error);
      if (errors.length > 0) {
        dbLogger.error('BulkDocs errors found:', errors);
        throw new Error(`BulkDocs failed: ${errors.map((e: any) => e.error).join(', ')}`);
      }
      
      dbLogger.info('Transaction created successfully:', txnId);
      
      // Force a compact to ensure data is written to disk
      try {
        await (this.db as any).compact();
        dbLogger.debug('Database compacted after transaction creation');
      } catch (compactError) {
        dbLogger.warn('Error compacting database:', compactError);
      }
      
      return { transaction: newTransaction, lines: newLines };
      
    } catch (error) {
      dbLogger.error('BulkDocs operation failed:', { error, docsCount: docs.length });
      throw new Error(`Failed to save transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getTransaction(id: Transaction['_id']): Promise<Transaction> {
    return await this.db.get(id);
  }

  async getTransactionWithLines(id: Transaction['_id']): Promise<{ transaction: Transaction; lines: TransactionLine[] }> {
    const transaction = await this.getTransaction(id);
    
    const result = await this.db.find({
      selector: {
        transactionId: id
      }
      // Removed sort to fix "Cannot sort when using the default index" error
    });
    
    // Sort in memory as a temporary fix
    const sortedLines = result.docs.sort((a: any, b: any) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return aTime - bTime; // asc order
    });
    
    return { transaction, lines: sortedLines };
  }

  async listTransactions(limit?: number, startkey?: string): Promise<Transaction[]> {
    const options: Record<string, unknown> = {
      selector: {
        _id: { $regex: "^txn::" }
      }
      // Removed sort to fix "Cannot sort when using the default index" error
    };
    
    // Only apply limit if explicitly provided
    if (limit !== undefined) {
      options.limit = limit;
    }
    
    if (startkey) {
      options.skip = startkey;
    }
    
    const result = await (this.db as any).find(options);
    
    dbLogger.debug('listTransactions query result:', { 
      found: result.docs.length, 
      limit, 
      startkey,
      options 
    });
    
    // Sort in memory as a temporary fix
    const sortedDocs = result.docs.sort((a: any, b: any) => {
      // First sort by date, then by createdAt as fallback
      const aDate = new Date(a.date || a.createdAt || 0).getTime();
      const bDate = new Date(b.date || b.createdAt || 0).getTime();
      if (aDate !== bDate) {
        return bDate - aDate; // desc order by date
      }
      // If dates are equal, sort by createdAt
      const aCreated = new Date(a.createdAt || 0).getTime();
      const bCreated = new Date(b.createdAt || 0).getTime();
      return bCreated - aCreated; // desc order by createdAt
    });
    
    dbLogger.info('listTransactions returning:', sortedDocs.length);
    return sortedDocs;
  }

  async countTransactions(): Promise<number> {
    dbLogger.debug('Counting transactions...');
    const result = await (this.db as any).find({
      selector: {
        _id: { $regex: "^txn::" }
      },
      fields: ['_id'] // Only fetch IDs for counting
    });
    dbLogger.info('Total transactions in database:', result.docs.length);
    
    // Also get some basic database stats
    try {
      const info = await (this.db as any).info();
      dbLogger.debug('Database info during count:', {
        doc_count: info.doc_count,
        update_seq: info.update_seq,
        adapter: info.adapter
      });
    } catch (error) {
      dbLogger.warn('Error getting database info during count:', error);
    }
    
    return result.docs.length;
  }

  /**
   * Cierra y limpia la base de datos del usuario
   */
  async destroy(): Promise<void> {
    if (this.db) {
      await this.db.destroy();
      userDBs.delete(this.userId);
      console.log('Database destroyed for user:', this.userId);
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<Record<string, unknown> | null> {
    return await getDatabaseStats(this.userId);
  }
}

/**
 * Factory function para crear instancias de LogdrioDatabase
 */
export async function createUserDatabase(userId: string): Promise<LogdrioDatabase> {
  const db = new LogdrioDatabase(userId);
  await db.initialize();
  return db;
}

// Re-export clearUserData from manager
export { clearUserData } from './manager';