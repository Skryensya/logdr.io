"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { AuthState, AuthStatus } from '@/types/database';
import { AuthStateManager, getAuthManager } from '@/lib/auth/auth-state-manager';
import { initializeAuthDatabaseIntegration, getAuthDatabaseIntegration } from '@/lib/auth/auth-database-integration';
import { simpleJWTService } from '@/lib/auth/simple-jwt-service';
import { LogdrioDatabase } from '@/lib/database';

/**
 * Auth context interface
 */
interface AuthContextType {
  // Auth state
  authState: AuthState;
  authStatus: AuthStatus;
  isAuthenticated: boolean;
  isUnlocked: boolean;
  
  // User info
  userId?: string;
  userEmail?: string;
  userDisplayName?: string;
  
  // Database access
  database: LogdrioDatabase | null;
  isDatabaseReady: boolean;
  
  // Auth methods
  availableAuthMethods: {
    pin: boolean;
    webauthn: boolean;
    webauthnSupported: boolean;
  };
  
  // Actions
  unlockWithPIN: (pin: string) => Promise<boolean>;
  unlockWithWebAuthn: () => Promise<boolean>;
  extendSession: (minutes?: number) => boolean;
  refreshAuth: () => Promise<void>;
  logout: () => void;
  
  // Timing
  jwtTimeRemaining: number;
  gateTimeRemaining: number;
  
  // Loading states
  isLoading: boolean;
  error?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Auth provider component
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status: sessionStatus } = useSession();
  
  // Auth state
  const [authManager] = useState(() => getAuthManager());
  const [authStatus, setAuthStatus] = useState<AuthStatus>(authManager.getStatus());
  const [database, setDatabase] = useState<LogdrioDatabase | null>(null);
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  
  // Timing state
  const [jwtTimeRemaining, setJwtTimeRemaining] = useState(0);
  const [gateTimeRemaining, setGateTimeRemaining] = useState(0);

  // Initialize auth system
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Initialize simple JWT service
        await simpleJWTService.initialize();
        
        // Setup auth-database integration
        const authDbIntegration = initializeAuthDatabaseIntegration(authManager);
        await authDbIntegration.initializeFromPersistedState();
        
        console.log('Auth system initialized with Simple JWT Service');
      } catch (error) {
        console.error('Error initializing auth system:', error);
        setError('Failed to initialize authentication');
      }
    };

    initAuth();
  }, [authManager]);

  // Listen to auth state changes
  useEffect(() => {
    const handleAuthStateChange = async () => {
      const newStatus = authManager.getStatus();
      setAuthStatus(newStatus);
      
      // Update timing
      setJwtTimeRemaining(authManager.getJWTTimeRemaining());
      setGateTimeRemaining(authManager.getGateTimeRemaining());
      
      // Update database state
      const authDbIntegration = getAuthDatabaseIntegration();
      if (authDbIntegration) {
        const dbReady = authDbIntegration.isDatabaseReady();
        setIsDatabaseReady(dbReady);
        
        if (dbReady) {
          // Get database from dbIntegration (the singleton)
          const { dbIntegration } = await import('@/lib/database-integration');
          const currentDb = dbIntegration.getCurrentDatabase();
          setDatabase(currentDb);
        } else {
          setDatabase(null);
        }
      }
    };

    // Listen to auth events (wrap async function)
    const syncHandler = () => {
      handleAuthStateChange().catch(console.error);
    };
    authManager.addEventListener(syncHandler);
    
    // Initial state update
    handleAuthStateChange().catch(console.error);
    
    // Update timing every second
    const timingInterval = setInterval(() => {
      setJwtTimeRemaining(authManager.getJWTTimeRemaining());
      setGateTimeRemaining(authManager.getGateTimeRemaining());
    }, 1000);

    return () => {
      authManager.removeEventListener(syncHandler);
      clearInterval(timingInterval);
    };
  }, [authManager]);

  // Handle NextAuth session changes
  useEffect(() => {
    const handleSessionChange = async () => {
      if (sessionStatus === 'loading') {
        setIsLoading(true);
        return;
      }

      setIsLoading(false);

      if (session?.user?.email) {
        try {
          // Check if we have a valid JWT, if not generate one
          const hasValidJWT = await simpleJWTService.hasValidJWT();
          
          if (!hasValidJWT) {
            // Generate new JWT from session (2 days duration)
            const jwt = await simpleJWTService.generateJWTFromSession(session);
            if (jwt) {
              await authManager.initializeWithJWT(jwt);
              console.log('New JWT generated and initialized (2 days duration)');
            }
          } else {
            // We have a valid JWT, ensure auth manager is initialized
            if (authManager.getStatus().state === AuthState.ANON) {
              const currentJWT = await simpleJWTService.getCurrentJWT();
              if (currentJWT) {
                await authManager.initializeWithJWT(currentJWT);
                console.log('Auth manager initialized with existing JWT');
              }
            }
          }
          
          setError(undefined);
        } catch (error) {
          console.error('Error processing session:', error);
          setError('Failed to process authentication');
        }
      } else if (authStatus.state !== AuthState.ANON) {
        // No session, clear tokens and reset state
        simpleJWTService.logout();
        authManager.logout();
      }
    };

    handleSessionChange();
  }, [session, sessionStatus, authManager, authStatus.state]);

  // Auth actions
  const unlockWithPIN = async (pin: string): Promise<boolean> => {
    setError(undefined);
    try {
      const result = await authManager.unlockWithPIN(pin);
      if (!result) {
        setError('Invalid PIN');
      }
      return result;
    } catch (error) {
      setError('Failed to unlock with PIN');
      return false;
    }
  };

  const unlockWithWebAuthn = async (): Promise<boolean> => {
    setError(undefined);
    try {
      const result = await authManager.unlockWithWebAuthn();
      if (!result) {
        setError('WebAuthn authentication failed');
      }
      return result;
    } catch (error) {
      setError('WebAuthn authentication failed');
      return false;
    }
  };

  const extendSession = (minutes = 5): boolean => {
    return authManager.extendGateSession(minutes);
  };

  const refreshAuth = async (): Promise<void> => {
    // No refresh needed - JWT lasts 2 days
    // If expired, user needs to re-authenticate with NextAuth
    console.log('JWT refresh not needed - token lasts 2 days');
  };

  const logout = (): void => {
    // Clear JWT tokens
    simpleJWTService.logout();
    
    authManager.logout();
    // Note: NextAuth logout should be handled by the component using signOut()
  };

  // Get available auth methods
  const availableAuthMethods = authManager.getAvailableAuthMethods();

  const contextValue: AuthContextType = {
    // Auth state
    authState: authStatus.state,
    authStatus,
    isAuthenticated: authManager.isAuthenticated(),
    isUnlocked: authManager.isUnlocked(),
    
    // User info
    userId: authStatus.userId,
    userEmail: authStatus.email,
    userDisplayName: session?.user?.name || authStatus.email?.split('@')[0],
    
    // Database
    database,
    isDatabaseReady,
    
    // Auth methods
    availableAuthMethods,
    
    // Actions
    unlockWithPIN,
    unlockWithWebAuthn,
    extendSession,
    refreshAuth,
    logout,
    
    // Timing
    jwtTimeRemaining,
    gateTimeRemaining,
    
    // Loading states
    isLoading: isLoading || sessionStatus === 'loading',
    error
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to get current database (with type safety)
 */
export function useDatabase(): LogdrioDatabase | null {
  const { database, isDatabaseReady } = useAuth();
  return isDatabaseReady ? database : null;
}

/**
 * Hook to ensure authentication is required
 */
export function useRequireAuth(): AuthContextType {
  const auth = useAuth();
  
  if (!auth.isAuthenticated) {
    throw new Error('Authentication required');
  }
  
  return auth;
}

/**
 * Hook to ensure user is fully unlocked
 */
export function useRequireUnlocked(): AuthContextType {
  const auth = useRequireAuth();
  
  if (!auth.isUnlocked) {
    throw new Error('User must be unlocked');
  }
  
  return auth;
}