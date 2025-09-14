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
    this.db = await getUserDB(this.userId);
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
    const txnId = `txn::${ulid()}` as const;
    const now = new Date().toISOString();
    const yearMonth = transaction.date.substring(0, 7); // YYYY-MM
    
    const newTransaction: Transaction = {
      _id: txnId,
      ...transaction,
      yearMonth,
      lineCount: lines.length,
      createdAt: now,
      updatedAt: now
    };
    
    const newLines: TransactionLine[] = lines.map(line => ({
      _id: `line::${ulid()}` as const,
      transactionId: txnId,
      ...line,
      date: transaction.date,
      yearMonth,
      isDebit: line.amount < 0,
      createdAt: now
    }));
    
    // Validar balance (debe sumar cero)
    const totalAmount = newLines.reduce((sum, line) => sum + line.amount, 0);
    if (totalAmount !== 0) {
      throw new Error(`Transaction lines must balance to zero. Current total: ${totalAmount}`);
    }
    
    // Insertar en batch
    const docs = [newTransaction, ...newLines];
    await this.db.bulkDocs(docs);
    
    return { transaction: newTransaction, lines: newLines };
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

  async listTransactions(limit = 50, startkey?: string): Promise<Transaction[]> {
    const options: Record<string, unknown> = {
      selector: {
        _id: { $regex: "^txn::" }
      },
      // Removed sort to fix "Cannot sort when using the default index" error
      limit
    };
    
    if (startkey) {
      options.skip = startkey;
    }
    
    const result = await this.db.find(options);
    
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
    
    return sortedDocs;
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