import { LogdrioDatabase, createUserDatabase } from './database';

/**
 * Helper para integrar el nuevo sistema de base de datos con el existente
 */
export class DatabaseIntegration {
  private static instance: DatabaseIntegration;
  private currentDB: LogdrioDatabase | null = null;
  private currentUserId: string | null = null;

  private constructor() {}

  static getInstance(): DatabaseIntegration {
    if (!DatabaseIntegration.instance) {
      DatabaseIntegration.instance = new DatabaseIntegration();
    }
    return DatabaseIntegration.instance;
  }

  /**
   * Inicializa la base de datos para un usuario
   */
  async initializeForUser(userId: string, email?: string, displayName?: string): Promise<LogdrioDatabase> {
    if (this.currentUserId === userId && this.currentDB) {
      return this.currentDB;
    }

    // Cerrar la base de datos anterior si existe
    if (this.currentDB && this.currentUserId !== userId) {
      console.log('Switching user database from', this.currentUserId, 'to', userId);
    }

    this.currentDB = await createUserDatabase(userId);
    this.currentUserId = userId;

    // Actualizar información de usuario si se proporciona
    if (email || displayName) {
      try {
        await this.currentDB.updateUser({
          email: email || '',
          displayName: displayName || ''
        });
      } catch (error) {
        console.warn('Could not update user info:', error);
      }
    }

    return this.currentDB;
  }

  /**
   * Obtiene la base de datos actual
   */
  getCurrentDatabase(): LogdrioDatabase | null {
    return this.currentDB;
  }

  /**
   * Obtiene el ID del usuario actual
   */
  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * Verifica si hay una sesión activa
   */
  hasActiveSession(): boolean {
    return this.currentDB !== null && this.currentUserId !== null;
  }

  /**
   * Cierra la sesión actual
   */
  async closeSession(): Promise<void> {
    if (this.currentDB) {
      // No destruir la base de datos, solo limpiar la referencia
      this.currentDB = null;
      this.currentUserId = null;
      console.log('Session closed');
    }
  }

  /**
   * Limpia completamente los datos del usuario actual
   */
  async clearCurrentUserData(): Promise<void> {
    if (this.currentDB && this.currentUserId) {
      await this.currentDB.destroy();
      this.currentDB = null;
      this.currentUserId = null;
      console.log('Current user data cleared');
    }
  }

  /**
   * Crea cuentas por defecto para un nuevo usuario
   */
  async createDefaultAccounts(currency = 'USD'): Promise<void> {
    if (!this.currentDB) {
      throw new Error('No active database session');
    }

    const defaultAccounts = [
      {
        name: 'Cash',
        type: 'asset' as const,
        visible: true,
        archived: false,
        defaultCurrency: currency,
        minorUnit: currency === 'CLP' ? 0 : 2,
        balance: 0
      },
      {
        name: 'Checking Account',
        type: 'asset' as const,
        visible: true,
        archived: false,
        defaultCurrency: currency,
        minorUnit: currency === 'CLP' ? 0 : 2,
        balance: 0
      },
      {
        name: 'Salary',
        type: 'income' as const,
        visible: true,
        archived: false,
        defaultCurrency: currency,
        minorUnit: currency === 'CLP' ? 0 : 2,
        balance: 0
      },
      {
        name: 'Food & Dining',
        type: 'expense' as const,
        visible: true,
        archived: false,
        defaultCurrency: currency,
        minorUnit: currency === 'CLP' ? 0 : 2,
        balance: 0
      }
    ];

    for (const account of defaultAccounts) {
      try {
        await this.currentDB.createAccount(account);
      } catch (error) {
        console.warn('Could not create default account:', account.name, error);
      }
    }
  }

  /**
   * Crea categorías por defecto
   */
  async createDefaultCategories(): Promise<void> {
    if (!this.currentDB) {
      throw new Error('No active database session');
    }

    const defaultCategories = [
      {
        name: 'Food & Dining',
        kind: 'expense' as const,
        color: '#FF6B6B',
        icon: '🍽️',
        archived: false
      },
      {
        name: 'Transportation',
        kind: 'expense' as const,
        color: '#4ECDC4',
        icon: '🚗',
        archived: false
      },
      {
        name: 'Entertainment',
        kind: 'expense' as const,
        color: '#45B7D1',
        icon: '🎬',
        archived: false
      },
      {
        name: 'Salary',
        kind: 'income' as const,
        color: '#96CEB4',
        icon: '💰',
        archived: false
      },
      {
        name: 'Transfer',
        kind: 'transfer' as const,
        color: '#FFEAA7',
        icon: '↔️',
        archived: false
      }
    ];

    for (const category of defaultCategories) {
      try {
        await this.currentDB.createCategory(category);
      } catch (error) {
        console.warn('Could not create default category:', category.name, error);
      }
    }
  }

  /**
   * Configura un usuario completamente nuevo
   */
  async setupNewUser(
    userId: string, 
    email: string, 
    displayName: string, 
    homeCurrency = 'USD'
  ): Promise<LogdrioDatabase> {
    const db = await this.initializeForUser(userId, email, displayName);
    
    // Actualizar configuraciones
    await db.updateUser({
      homeCurrency: homeCurrency as 'CLP' | 'USD' | 'EUR' | 'BTC',
      locale: homeCurrency === 'CLP' ? 'es-CL' : 'en-US'
    });

    await db.updateSettings({
      homeCurrency,
      decimalPlaces: homeCurrency === 'CLP' ? 0 : 2,
      dateFormat: homeCurrency === 'CLP' ? 'dd/MM/yyyy' : 'MM/dd/yyyy'
    });

    // Crear cuentas y categorías por defecto
    await this.createDefaultAccounts(homeCurrency);
    await this.createDefaultCategories();

    console.log('New user setup completed for:', email);
    return db;
  }

  /**
   * Obtiene estadísticas de la base de datos actual
   */
  async getCurrentStats(): Promise<Record<string, unknown> | null> {
    if (!this.currentDB) {
      return null;
    }

    return await this.currentDB.getStats();
  }

  /**
   * Verifica la salud de la base de datos
   */
  async healthCheck(): Promise<{
    isHealthy: boolean;
    hasUser: boolean;
    hasSettings: boolean;
    accountCount: number;
    categoryCount: number;
    transactionCount: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let isHealthy = true;
    let hasUser = false;
    let hasSettings = false;
    let accountCount = 0;
    let categoryCount = 0;
    let transactionCount = 0;

    if (!this.currentDB) {
      errors.push('No active database session');
      isHealthy = false;
    } else {
      try {
        // Verificar documento de usuario
        await this.currentDB.getUser();
        hasUser = true;
      } catch {
        errors.push('User document not found');
        isHealthy = false;
      }

      try {
        // Verificar configuraciones
        await this.currentDB.getSettings();
        hasSettings = true;
      } catch {
        errors.push('Settings document not found');
        isHealthy = false;
      }

      try {
        // Contar documentos
        const accounts = await this.currentDB.listAccounts(false);
        accountCount = accounts.length;

        const categories = await this.currentDB.listCategories(false);
        categoryCount = categories.length;

        const transactions = await this.currentDB.listTransactions(1000);
        transactionCount = transactions.length;
      } catch (error) {
        errors.push('Error counting documents: ' + (error as Error).message);
        isHealthy = false;
      }
    }

    return {
      isHealthy,
      hasUser,
      hasSettings,
      accountCount,
      categoryCount,
      transactionCount,
      errors
    };
  }
}

// Exportar instancia singleton
export const dbIntegration = DatabaseIntegration.getInstance();

// Helper hooks para usar en componentes React
export function useCurrentDatabase(): LogdrioDatabase | null {
  return dbIntegration.getCurrentDatabase();
}

export function useCurrentUserId(): string | null {
  return dbIntegration.getCurrentUserId();
}

export function useHasActiveSession(): boolean {
  return dbIntegration.hasActiveSession();
}