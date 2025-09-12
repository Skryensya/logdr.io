import { AuthStateManager, AuthEvent } from './auth-state-manager';
import { dbIntegration } from '@/lib/database-integration';
import { AuthState } from '@/types/database';

/**
 * Integration layer between authentication and database systems
 * Handles user switching, database initialization, and auth state persistence
 */
export class AuthDatabaseIntegration {
  private authManager: AuthStateManager;
  private currentUserId: string | null = null;
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
      const currentUserId = dbIntegration.getCurrentUserId();
      
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
      if (dbIntegration.hasActiveSession()) {
        await dbIntegration.closeSession();
      }

      // Initialize database for new user
      await dbIntegration.initializeForUser(userId, email);
      
      // Perform health check
      const health = await dbIntegration.healthCheck();
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
      const db = dbIntegration.getCurrentDatabase();
      if (!db) {
        throw new Error('No active database');
      }

      // Update user document with email if provided
      if (email) {
        await db.updateUser({ 
          email,
          displayName: email.split('@')[0] // Use email prefix as display name
        });
      }

      // Create default accounts and categories
      await dbIntegration.createDefaultAccounts();
      await dbIntegration.createDefaultCategories();

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
      if (dbIntegration.hasActiveSession()) {
        await dbIntegration.closeSession();
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
          await dbIntegration.initializeForUser(userId);
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
   * Check if user database is ready
   */
  isDatabaseReady(): boolean {
    return dbIntegration.hasActiveSession() && this.currentUserId !== null;
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

    return await dbIntegration.healthCheck();
  }

  /**
   * Get current database stats
   */
  async getDatabaseStats(): Promise<Record<string, unknown> | null> {
    if (!this.isDatabaseReady()) {
      return null;
    }

    return await dbIntegration.getCurrentStats();
  }

  /**
   * Destroy integration (cleanup)
   */
  destroy(): void {
    // The auth manager will handle its own cleanup
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
export function destroyAuthDatabaseIntegration(): void {
  if (globalAuthDbIntegration) {
    globalAuthDbIntegration.destroy();
    globalAuthDbIntegration = null;
  }
}