"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { AuthState, AuthStatus } from '@/types/database';
import { AuthStateManager, getAuthManager } from '@/lib/auth/auth-state-manager';
import { initializeAuthDatabaseIntegration, getAuthDatabaseIntegration } from '@/lib/auth/auth-database-integration';
import { OfflineJWTValidator, MockJWTCreator } from '@/lib/auth/jwt-validator';
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
  
  // Mock JWT creator for development (replace with real JWT tokens in production)
  const [mockJWTCreator] = useState(() => new MockJWTCreator());

  // Initialize auth system
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Setup JWT validator for development
        const jwtValidator = new OfflineJWTValidator();
        const { publicKeyJWK } = await mockJWTCreator.generateKeyPair();
        await jwtValidator.importPublicKey(publicKeyJWK, 'dev-key-1');
        
        // Update auth manager config
        const newAuthManager = getAuthManager({
          jwtValidator,
          expectedIssuer: 'logdrio-dev',
          expectedAudience: 'logdrio-app',
          clockTolerance: 300,
          defaultGateDuration: 5
        });
        
        // Setup auth-database integration
        const authDbIntegration = initializeAuthDatabaseIntegration(newAuthManager);
        
        // Initialize from persisted state
        await authDbIntegration.initializeFromPersistedState();
        
        console.log('Auth system initialized');
      } catch (error) {
        console.error('Error initializing auth system:', error);
        setError('Failed to initialize authentication');
      }
    };

    initAuth();
  }, [mockJWTCreator]);

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
          // Create mock JWT from NextAuth session
          const mockJWT = await mockJWTCreator.createMockJWT({
            sub: session.user.email, // Use email as userId for now
            email: session.user.email,
            exp: Math.floor(Date.now() / 1000) + 24 * 3600 // 24 hours
          });

          // Initialize with JWT
          await authManager.initializeWithJWT(mockJWT);
          
          setError(undefined);
        } catch (error) {
          console.error('Error processing session:', error);
          setError('Failed to process authentication');
        }
      } else if (authStatus.state !== AuthState.ANON) {
        // No session, logout
        authManager.logout();
      }
    };

    handleSessionChange();
  }, [session, sessionStatus, authManager, mockJWTCreator, authStatus.state]);

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
    // In a real app, this would refresh the JWT from the server
    // For demo, we'll just refresh the current session
    if (session?.user?.email) {
      const mockJWT = await mockJWTCreator.createMockJWT({
        sub: session.user.email,
        email: session.user.email,
        exp: Math.floor(Date.now() / 1000) + 24 * 3600
      });
      await authManager.initializeWithJWT(mockJWT);
    }
  };

  const logout = (): void => {
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