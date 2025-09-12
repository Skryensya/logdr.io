import { AuthStateManager, AuthEvent } from './auth-state-manager';
import { ValidatedLogdrioDatabase, createValidatedUserDatabase } from '@/lib/database';
import { AuthState } from '@/types/database';

/**
 * Integration layer between authentication and database systems
 * Handles user switching, database initialization, and auth state persistence
 */
export class AuthDatabaseIntegration {
  private authManager: AuthStateManager;
  private currentUserId: string | null = null;
  private currentDB: ValidatedLogdrioDatabase | null = null;
  private isInitializing = false;

  constructor(authManager: AuthStateManager) {
    this.authManager = authManager;
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for auth state changes
   */
  private setupEventListeners(): void {
    this.authManager.addEventListener(this.handleAuthEvent.bind(this));
  }

  /**
   * Handle authentication events and sync with database
   */
  private async handleAuthEvent(event: AuthEvent): Promise<void> {
    console.log('Auth event received:', event.type, event.payload);

    switch (event.type) {
      case 'JWT_VALIDATED':
        await this.handleUserAuthenticated(event.payload.sub, event.payload.email);
        break;

      case 'GATE_UNLOCKED':
        // User is fully authenticated, ensure database is ready
        if (event.payload.userId !== this.currentUserId) {
          await this.switchToUser(event.payload.userId);
        }
        break;

      case 'USER_LOGOUT':
        await this.handleUserLogout();
        break;

      case 'STATE_CHANGED':
        await this.handleStateChange(event.payload.oldState, event.payload.newState);
        break;
    }
  }

  /**
   * Handle user authentication (JWT validation)
   */
  private async handleUserAuthenticated(userId: string, email: string): Promise<void> {
    if (this.isInitializing) {
      console.log('Already initializing, skipping duplicate auth event');
      return;
    }

    try {
      this.isInitializing = true;

      // Check if we need to switch users
      const currentUserId = this.currentUserId;
      
      if (currentUserId !== userId) {
        console.log('User changed, switching database:', { from: currentUserId, to: userId });
        await this.switchToUser(userId, email);
      } else {
        console.log('Same user, database already initialized');
      }

      this.currentUserId = userId;
    } catch (error) {
      console.error('Error handling user authentication:', error);
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Switch to a different user's database
   */
  private async switchToUser(userId: string, email?: string): Promise<void> {
    try {
      console.log('Switching to user database:', userId);

      // Close current session if exists
      if (this.currentDB) {
        await this.currentDB.destroy();
        this.currentDB = null;
      }

      // Initialize database for new user
      this.currentDB = await createValidatedUserDatabase(userId);
      
      // Perform health check
      const health = await this.healthCheck();
      console.log('Database health check after user switch:', health);

      // If this is a completely new user, set up defaults
      if (!health.hasUser || !health.hasSettings) {
        console.log('New user detected, setting up defaults');
        await this.setupNewUserDefaults(userId, email);
      }

      this.currentUserId = userId;
    } catch (error) {
      console.error('Error switching to user:', error);
      throw error;
    }
  }

  /**
   * Setup defaults for new user
   */
  private async setupNewUserDefaults(userId: string, email?: string): Promise<void> {
    try {
      if (!this.currentDB) {
        throw new Error('No active database');
      }

      // Update user document with email if provided
      if (email) {
        await this.currentDB.updateUser({ 
          email,
          displayName: email.split('@')[0] // Use email prefix as display name
        });
      }

      // Create default accounts and categories
      await this.createDefaultAccounts();
      await this.createDefaultCategories();

      console.log('New user defaults created successfully');
    } catch (error) {
      console.error('Error setting up new user defaults:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Handle user logout
   */
  private async handleUserLogout(): Promise<void> {
    try {
      console.log('Handling user logout');

      // Close database session
      if (this.currentDB) {
        await this.currentDB.destroy();
        this.currentDB = null;
      }

      this.currentUserId = null;
      console.log('User logout completed');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  /**
   * Handle auth state changes
   */
  private async handleStateChange(oldState: AuthState, newState: AuthState): Promise<void> {
    console.log(`Auth state changed: ${oldState} → ${newState}`);

    // Persist state change if needed
    try {
      // Store current auth state in sessionStorage for recovery
      const authStatus = this.authManager.getStatus();
      if (authStatus.userId) {
        sessionStorage.setItem('logdrio_last_auth_state', JSON.stringify({
          state: newState,
          userId: authStatus.userId,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.warn('Could not persist auth state:', error);
    }

    // Handle specific state transitions
    if (newState === AuthState.ANON) {
      // Clear persisted state
      sessionStorage.removeItem('logdrio_last_auth_state');
    }
  }

  /**
   * Initialize from persisted state (on app startup)
   */
  async initializeFromPersistedState(): Promise<void> {
    try {
      const persistedState = sessionStorage.getItem('logdrio_last_auth_state');
      
      if (!persistedState) {
        console.log('No persisted auth state found');
        return;
      }

      const { state, userId, timestamp } = JSON.parse(persistedState);
      
      // Check if persisted state is recent (less than 1 hour old)
      const maxAge = 60 * 60 * 1000; // 1 hour
      if (Date.now() - timestamp > maxAge) {
        console.log('Persisted auth state is too old, ignoring');
        sessionStorage.removeItem('logdrio_last_auth_state');
        return;
      }

      console.log('Restoring from persisted state:', { state, userId });

      // If user was authenticated, try to restore database session
      if ([AuthState.JWT_OK, AuthState.GATED, AuthState.UNLOCKED].includes(state) && userId) {
        try {
          this.currentDB = await createValidatedUserDatabase(userId);
          this.currentUserId = userId;
          console.log('Database session restored for user:', userId);
        } catch (error) {
          console.warn('Could not restore database session:', error);
          sessionStorage.removeItem('logdrio_last_auth_state');
        }
      }
    } catch (error) {
      console.error('Error initializing from persisted state:', error);
      sessionStorage.removeItem('logdrio_last_auth_state');
    }
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * Get current database instance
   */
  getCurrentDatabase(): ValidatedLogdrioDatabase | null {
    return this.currentDB;
  }

  /**
   * Check if user database is ready
   */
  isDatabaseReady(): boolean {
    return this.currentDB !== null && this.currentUserId !== null;
  }

  /**
   * Force refresh database connection
   */
  async refreshDatabaseConnection(): Promise<void> {
    if (!this.currentUserId) {
      throw new Error('No current user to refresh database connection');
    }

    const authStatus = this.authManager.getStatus();
    await this.switchToUser(this.currentUserId, authStatus.email);
  }

  /**
   * Create default accounts for a new user
   */
  private async createDefaultAccounts(currency = 'USD'): Promise<void> {
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
        name: 'Debit',
        type: 'asset' as const,
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
   * Create default categories
   */
  private async createDefaultCategories(): Promise<void> {
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
        name: 'Salary',
        kind: 'income' as const,
        color: '#96CEB4',
        icon: '💰',
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
   * Get database health status
   */
  async getDatabaseHealth(): Promise<{
    isHealthy: boolean;
    hasUser: boolean;
    hasSettings: boolean;
    accountCount: number;
    categoryCount: number;
    transactionCount: number;
    errors: string[];
  } | null> {
    if (!this.isDatabaseReady()) {
      return null;
    }

    return await this.healthCheck();
  }

  /**
   * Verify database health
   */
  private async healthCheck(): Promise<{
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
        // Check user document
        await this.currentDB.getUser();
        hasUser = true;
      } catch {
        errors.push('User document not found');
        isHealthy = false;
      }

      try {
        // Check settings
        await this.currentDB.getSettings();
        hasSettings = true;
      } catch {
        errors.push('Settings document not found');
        isHealthy = false;
      }

      try {
        // Count documents
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

  /**
   * Get current database stats
   */
  async getDatabaseStats(): Promise<Record<string, unknown> | null> {
    if (!this.isDatabaseReady()) {
      return null;
    }

    if (!this.currentDB) {
      return null;
    }
    return await this.currentDB.getStats();
  }

  /**
   * Destroy integration (cleanup)
   */
  async destroy(): Promise<void> {
    if (this.currentDB) {
      await this.currentDB.destroy();
      this.currentDB = null;
    }
    this.currentUserId = null;
  }
}

/**
 * Global auth-database integration instance
 */
let globalAuthDbIntegration: AuthDatabaseIntegration | null = null;

/**
 * Initialize auth-database integration
 */
export function initializeAuthDatabaseIntegration(authManager: AuthStateManager): AuthDatabaseIntegration {
  if (!globalAuthDbIntegration) {
    globalAuthDbIntegration = new AuthDatabaseIntegration(authManager);
  }
  return globalAuthDbIntegration;
}

/**
 * Get auth-database integration instance
 */
export function getAuthDatabaseIntegration(): AuthDatabaseIntegration | null {
  return globalAuthDbIntegration;
}

/**
 * Destroy auth-database integration
 */
export async function destroyAuthDatabaseIntegration(): Promise<void> {
  if (globalAuthDbIntegration) {
    await globalAuthDbIntegration.destroy();
    globalAuthDbIntegration = null;
  }
}