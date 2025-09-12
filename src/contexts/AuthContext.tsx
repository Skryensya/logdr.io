"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { useSession, signOut } from "next-auth/react";
import { simpleJWTService, UserProfile } from "@/lib/auth/simple-jwt-service";
import { ValidatedLogdrioDatabase, createValidatedUserDatabase } from "@/lib/database";
import { authLogger } from "@/lib/utils/logger";

interface AuthContextType {
  // Auth state
  isAuthenticated: boolean;
  isRealUser: boolean;
  isAnonymous: boolean;
  isLoading: boolean;
  
  // User info
  user: UserProfile | null;
  
  // Database access
  database: ValidatedLogdrioDatabase | null;
  isDatabaseReady: boolean;
  
  // Actions
  loginAsGuest: () => Promise<void>;
  upgradeFromGuest: () => Promise<void>;
  logout: () => Promise<void>;
  
  // Error state
  error?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  
  const [database, setDatabase] = useState<ValidatedLogdrioDatabase | null>(null);
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Handle session changes
  useEffect(() => {
    const handleSessionChange = async () => {
      if (status === "loading") return;

      try {
        if (session?.user?.email) {
          // Set user in JWT service
          simpleJWTService.setUser(session);
          const userId = simpleJWTService.getUserId();
          
          // Initialize database if user changed
          if (userId && userId !== currentUserId) {
            await initializeUserDatabase(userId, session.user.email, session.user.name ?? undefined);
          }
          
          setError(undefined);
        } else {
          // Always use guest database when not logged in
          if (!simpleJWTService.isAuthenticated() || currentUserId !== 'guestdb') {
            simpleJWTService.setAnonymousUser();
            await initializeUserDatabase('guestdb', 'guest@anonymous.local', 'Guest User');
          }
        }
      } catch (error) {
        authLogger.error("Error handling session change:", error);
        setError("Failed to initialize user session");
      }
    };

    handleSessionChange();
  }, [session, status]);

  // Initialize user database
  const initializeUserDatabase = async (userId: string, email: string, name?: string) => {
    // For guest database, check if already initialized and connected
    if (userId === 'guestdb' && currentUserId === 'guestdb' && database && isDatabaseReady) {
      authLogger.debug("Guest database already connected, skipping initialization");
      return;
    }
    
    setCurrentUserId(userId);
    
    // Close existing database only if switching to a different user
    if (database && currentUserId && currentUserId !== userId) {
      authLogger.debug(`Switching from ${currentUserId} to ${userId}, closing previous database`);
      await database.destroy();
    }
    
    // Create or connect to database (will not recreate if exists)
    authLogger.debug(`Initializing database for user: ${userId}`);
    const userDb = await createValidatedUserDatabase(userId);
    setDatabase(userDb);
    setIsDatabaseReady(true);
    
    // Setup defaults only for real users or empty guest database
    if (userId === 'guestdb') {
      await setupGuestDefaultsIfNeeded(userDb);
    } else {
      await setupUserDefaults(userDb, email, name);
    }
  };

  // Clear user data (but keep guest database)
  const clearUserData = async () => {
    // Don't clear if we're already on guest database
    if (currentUserId === 'guestdb') {
      authLogger.debug("Already using guest database, no need to clear");
      return;
    }
    
    // Close current database if it's not the guest database
    if (database && currentUserId !== 'guestdb') {
      await database.destroy();
      setDatabase(null);
      setIsDatabaseReady(false);
    }
    
    // Switch to guest mode
    simpleJWTService.setAnonymousUser();
    await initializeUserDatabase('guestdb', 'guest@anonymous.local', 'Guest User');
  };

  // Setup defaults for new users
  const setupUserDefaults = async (db: ValidatedLogdrioDatabase, email: string, name?: string) => {
    try {
      // Update user document
      await db.updateUser({ 
        email,
        displayName: name || email.split('@')[0]
      });

      // Create default accounts
      await db.createAccount({
        name: 'Cash',
        type: 'asset' as const,
        visible: true,
        archived: false,
        defaultCurrency: 'USD',
        minorUnit: 2,
        balance: 0
      });

      await db.createAccount({
        name: 'Debit',
        type: 'asset' as const,
        visible: true,
        archived: false,
        defaultCurrency: 'USD',
        minorUnit: 2,
        balance: 0
      });

      // Create default categories
      await db.createCategory({
        name: 'Food & Dining',
        kind: 'expense' as const,
        color: '#FF6B6B',
        icon: '🍽️',
        archived: false
      });

      await db.createCategory({
        name: 'Transportation',
        kind: 'expense' as const,
        color: '#4ECDC4',
        icon: '🚗',
        archived: false
      });

      await db.createCategory({
        name: 'Salary',
        kind: 'income' as const,
        color: '#96CEB4',
        icon: '💰',
        archived: false
      });
    } catch (error) {
      authLogger.warn("Could not create user defaults:", error);
    }
  };

  // Setup guest defaults only if needed
  const setupGuestDefaultsIfNeeded = async (db: ValidatedLogdrioDatabase) => {
    try {
      // Check if guest database already has accounts
      const accounts = await db.listAccounts(false);
      if (accounts.length > 0) {
        authLogger.debug("Guest database already has data, skipping setup");
        return;
      }

      // Setup minimal guest defaults
      await db.updateUser({ 
        email: 'guest@anonymous.local',
        displayName: 'Guest User'
      });

      // Create basic accounts
      await db.createAccount({
        name: 'Cash',
        type: 'asset' as const,
        visible: true,
        archived: false,
        defaultCurrency: 'USD',
        minorUnit: 2,
        balance: 0
      });

      await db.createAccount({
        name: 'Debit',
        type: 'asset' as const,
        visible: true,
        archived: false,
        defaultCurrency: 'USD',
        minorUnit: 2,
        balance: 0
      });

      // Create basic categories
      await db.createCategory({
        name: 'Food & Dining',
        kind: 'expense' as const,
        color: '#FF6B6B',
        icon: '🍽️',
        archived: false
      });

      await db.createCategory({
        name: 'Transportation',
        kind: 'expense' as const,
        color: '#4ECDC4',
        icon: '🚗',
        archived: false
      });

      await db.createCategory({
        name: 'Income',
        kind: 'income' as const,
        color: '#96CEB4',
        icon: '💰',
        archived: false
      });

      authLogger.debug("Guest database initialized with default data");
    } catch (error) {
      authLogger.warn("Could not setup guest defaults:", error);
    }
  };

  // Login as guest
  const loginAsGuest = useCallback(async () => {
    try {
      setError(undefined);
      
      // Set anonymous user and initialize guest database
      simpleJWTService.setAnonymousUser();
      await initializeUserDatabase('guestdb', 'guest@anonymous.local', 'Guest User');
      authLogger.debug("Guest user session started");
    } catch (error) {
      authLogger.error("Error during guest login:", error);
      setError("Failed to initialize guest session");
    }
  }, []);

  // Upgrade from guest to real user
  const upgradeFromGuest = useCallback(async () => {
    try {
      setError(undefined);
      
      if (!simpleJWTService.isAnonymous()) {
        authLogger.warn("Cannot upgrade: user is not anonymous");
        return;
      }

      // Store current guest data for potential migration
      const currentUserId = simpleJWTService.getUserId();
      authLogger.debug("Starting upgrade from guest for user:", currentUserId);
      
      // The actual upgrade will happen when NextAuth session is established
      // This method mainly prepares the state for the upgrade
      
      // TODO: In a real implementation, you might want to:
      // 1. Export guest data
      // 2. Show a dialog asking if user wants to migrate data
      // 3. Handle the migration after successful login
      
    } catch (error) {
      authLogger.error("Error during guest upgrade:", error);
      setError("Failed to prepare account upgrade");
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const wasAnonymous = simpleJWTService.isAnonymous();
      
      // Always return to guest mode instead of fully logging out
      if (!wasAnonymous) {
        // If was a real user, sign out from NextAuth first
        await signOut({ callbackUrl: "/" });
      } else {
        // If was already anonymous, just ensure we're using guest database
        simpleJWTService.setAnonymousUser();
        await initializeUserDatabase('guestdb', 'guest@anonymous.local', 'Guest User');
        authLogger.debug("Logout: returned to guest mode");
      }
    } catch (error) {
      authLogger.error("Error during logout:", error);
    }
  }, []);

  const contextValue: AuthContextType = {
    // Auth state
    isAuthenticated: simpleJWTService.isAuthenticated(),
    isRealUser: simpleJWTService.isRealUser(),
    isAnonymous: simpleJWTService.isAnonymous(),
    isLoading: status === "loading",
    
    // User info  
    user: simpleJWTService.getCurrentUser(),
    
    // Database
    database,
    isDatabaseReady,
    
    // Actions
    loginAsGuest,
    upgradeFromGuest,
    logout,
    
    // Error state
    error,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useDatabase(): ValidatedLogdrioDatabase | null {
  const { database, isDatabaseReady } = useAuth();
  return isDatabaseReady ? database : null;
}

export function useRequireAuth(): AuthContextType {
  const auth = useAuth();
  
  if (!auth.isAuthenticated) {
    throw new Error("Authentication required");
  }
  
  return auth;
}