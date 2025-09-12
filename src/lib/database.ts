import { 
  User, 
  Account, 
  Category, 
  Transaction, 
  TransactionLine, 
  UserSettings,
  PouchDBIndex
} from '@/types/database';
import { ulid } from 'ulid';

// Cache para bases de datos por usuario
const userDBs: Map<string, unknown> = new Map();
let PouchDB: unknown = null;

/**
 * Inicializa PouchDB lazy y solo en el cliente
 */
async function initializePouchDB(): Promise<unknown> {
  if (typeof window === 'undefined') {
    throw new Error('PouchDB can only be used on the client side');
  }
  
  if (!PouchDB) {
    const PouchDBBrowser = (await import('pouchdb-browser')).default;
    const pouchdbFind = (await import('pouchdb-find')).default;
    // @ts-expect-error - pouchdb-upsert types not available
    const pouchdbUpsert = (await import('pouchdb-upsert')).default;
    
    PouchDB = PouchDBBrowser
      .plugin(pouchdbFind)
      .plugin(pouchdbUpsert);
  }
  
  return PouchDB;
}

/**
 * Obtiene o crea la base de datos para un usuario específico
 */
async function getUserDB(userId: string): Promise<unknown> {
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  if (!userDBs.has(userId)) {
    const PouchDBClass = await initializePouchDB();
    // Use userId directly, ensuring it's safe for database naming
    const safeUserId = userId.replace(/[^a-z0-9]/gi, '_');
    const dbName = `logdrio-${safeUserId}`;
    const db = new (PouchDBClass as any)(dbName);
    
    // Inicializar esquema y configuración
    await initializeSchema(db, userId);
    
    userDBs.set(userId, db);
  }
  
  return userDBs.get(userId);
}

/**
 * Índices definidos según el plan
 */
const REQUIRED_INDEXES: PouchDBIndex[] = [
  {
    index: {
      fields: ["type", "archived", "updatedAt"]
    },
    name: "accounts-active",
    ddoc: "accounts-active"
  },
  {
    index: {
      fields: ["yearMonth", "accountId", "currency"]
    },
    name: "lines-monthly-account",
    ddoc: "lines-monthly-account"
  },
  {
    index: {
      fields: ["yearMonth", "categoryId", "currency"]
    },
    name: "lines-monthly-category", 
    ddoc: "lines-monthly-category"
  },
  {
    index: {
      fields: ["transactionId", "createdAt"]
    },
    name: "lines-by-transaction",
    ddoc: "lines-by-transaction"
  },
  {
    index: {
      fields: ["date", "categoryId"]
    },
    name: "transactions-by-date",
    ddoc: "transactions-by-date"
  }
];

/**
 * Vistas Map/Reduce para cálculos de balance
 */
const DESIGN_DOCS = {
  balance_views: {
    _id: '_design/balance_views',
    views: {
      monthly_balance: {
        map: `function(doc) {
          if (doc._id.startsWith('line::')) {
            emit([doc.yearMonth, doc.accountId, doc.currency], doc.amount);
          }
        }`,
        reduce: '_sum'
      },
      monthly_by_category: {
        map: `function(doc) {
          if (doc._id.startsWith('line::') && doc.categoryId) {
            emit([doc.yearMonth, doc.categoryId, doc.currency], doc.amount);
          }
        }`,
        reduce: '_sum'
      },
      monthly_cashflow: {
        map: `function(doc) {
          if (doc._id.startsWith('line::')) {
            var kind = doc.amount >= 0 ? 'in' : 'out';
            emit([doc.yearMonth, doc.currency, kind], Math.abs(doc.amount));
          }
        }`,
        reduce: '_sum'
      }
    }
  }
};

/**
 * Inicializa el esquema de la base de datos
 */
async function initializeSchema(db: unknown, userId: string): Promise<void> {
  try {
    // 1. Crear índices
    for (const indexDef of REQUIRED_INDEXES) {
      try {
        await db.createIndex(indexDef);
        console.log(`Created index: ${indexDef.name}`);
      } catch (error: unknown) {
        // Ignorar errores si el índice ya existe
        if ((error as Record<string, unknown>).status !== 409) {
          console.warn(`Warning creating index ${indexDef.name}:`, error);
        }
      }
    }
    
    // 2. Crear vistas Map/Reduce
    for (const [name, designDoc] of Object.entries(DESIGN_DOCS)) {
      try {
        await db.put(designDoc);
        console.log(`Created design document: ${name}`);
      } catch (error: unknown) {
        // Si ya existe, intentar actualizar
        if ((error as Record<string, unknown>).status === 409) {
          try {
            const existing = await db.get(designDoc._id);
            await db.put({ ...designDoc, _rev: existing._rev });
            console.log(`Updated design document: ${name}`);
          } catch (updateError) {
            console.warn(`Warning updating design document ${name}:`, updateError);
          }
        } else {
          console.warn(`Warning creating design document ${name}:`, error);
        }
      }
    }
    
    // 3. Crear documentos de configuración por defecto
    await createDefaultDocuments(db, userId);
    
    console.log('Schema initialization completed for user:', userId);
  } catch (error) {
    console.error('Error initializing schema:', error);
    throw error;
  }
}

/**
 * Crea documentos por defecto para un usuario
 */
async function createDefaultDocuments(db: unknown, userId: string): Promise<void> {
  const now = new Date().toISOString();
  
  // Usuario
  const defaultUser: User = {
    _id: "user",
    userId,
    email: '', // Se completará al usar
    displayName: '',
    homeCurrency: "USD",
    locale: "en-US",
    createdAt: now,
    updatedAt: now
  };
  
  // Configuración
  const defaultSettings: UserSettings = {
    _id: "settings",
    requireGatePerSession: false,
    gateMethod: "none",
    gateDurationMin: 5,
    homeCurrency: "USD",
    decimalPlaces: 2,
    dateFormat: "MM/dd/yyyy",
    firstDayOfWeek: 1,
    defaultAccountView: "active",
    showBalance: true,
    compactMode: false,
    createdAt: now,
    updatedAt: now
  };
  
  // Intentar crear documentos por defecto si no existen
  try {
    await db.get("user");
  } catch (error: unknown) {
    if ((error as Record<string, unknown>).status === 404) {
      await db.put(defaultUser);
      console.log('Created default user document');
    }
  }
  
  try {
    await db.get("settings");
  } catch (error: unknown) {
    if ((error as Record<string, unknown>).status === 404) {
      await db.put(defaultSettings);
      console.log('Created default settings document');
    }
  }
}

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
      selector,
      sort: [{ updatedAt: 'desc' }]
    });
    
    return result.docs;
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
      selector,
      sort: [{ updatedAt: 'desc' }]
    });
    
    return result.docs;
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
      },
      sort: [{ createdAt: 'asc' }]
    });
    
    return { transaction, lines: result.docs };
  }

  async listTransactions(limit = 50, startkey?: string): Promise<Transaction[]> {
    const options: Record<string, unknown> = {
      selector: {
        _id: { $regex: "^txn::" }
      },
      sort: [{ date: 'desc' }, { createdAt: 'desc' }],
      limit
    };
    
    if (startkey) {
      options.skip = startkey;
    }
    
    const result = await this.db.find(options);
    return result.docs;
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
   * Obtiene estadísticas de la base de datos
   */
  async getStats(): Promise<Record<string, unknown> | null> {
    if (!this.db) return null;
    
    return {
      info: await this.db.info(),
      userDB: this.userId
    };
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

/**
 * Limpia todos los datos de un usuario (útil para logout/cleanup)
 */
export async function clearUserData(userId: string): Promise<void> {
  try {
    if (userDBs.has(userId)) {
      const db = userDBs.get(userId);
      await db.destroy();
      userDBs.delete(userId);
    } else {
      // Aún si no está en cache, intentar destruir la DB
      const PouchDBClass = await initializePouchDB();
      const safeUserId = userId.replace(/[^a-z0-9]/gi, '_');
      const dbName = `logdrio-${safeUserId}`;
      const db = new (PouchDBClass as any)(dbName);
      await db.destroy();
    }
    console.log('Cleared all data for user:', userId);
  } catch (error) {
    console.error('Error clearing data for user:', userId, error);
    throw error;
  }
}