import { AuthState, AuthStatus, JWTPayload } from '@/types/database';
import { OfflineJWTValidator, JWTUtils } from './jwt-validator';
import { pinGate } from './pin-gate';
import { webAuthnGate } from './webauthn-gate';

/**
 * Authentication configuration
 */
interface AuthConfig {
  jwtValidator?: OfflineJWTValidator;
  expectedIssuer?: string;
  expectedAudience?: string;
  clockTolerance?: number;
  defaultGateDuration?: number; // minutes
}

/**
 * Authentication events
 */
export type AuthEvent = 
  | { type: 'JWT_VALIDATED'; payload: JWTPayload }
  | { type: 'JWT_EXPIRED'; payload: { userId: string } }
  | { type: 'GATE_UNLOCKED'; payload: { userId: string; method: 'pin' | 'webauthn' } }
  | { type: 'GATE_EXPIRED'; payload: { userId: string } }
  | { type: 'GATE_EXTENDED'; payload: { userId: string; additionalMinutes: number } }
  | { type: 'USER_LOGOUT'; payload: { userId: string } }
  | { type: 'STATE_CHANGED'; payload: { oldState: AuthState; newState: AuthState } };

/**
 * Authentication event listener
 */
export type AuthEventListener = (event: AuthEvent) => void;

/**
 * Authentication State Manager
 * Handles the complex state transitions defined in the plan
 */
export class AuthStateManager {
  private config: AuthConfig;
  private currentStatus: AuthStatus;
  private listeners: Set<AuthEventListener> = new Set();
  private stateCheckInterval: NodeJS.Timeout | null = null;
  private jwtValidator: OfflineJWTValidator | null = null;

  constructor(config: AuthConfig = {}) {
    this.config = {
      clockTolerance: 300, // 5 minutes
      defaultGateDuration: 5, // 5 minutes
      ...config
    };

    this.currentStatus = {
      state: AuthState.ANON,
      requiresGate: false
    };

    this.jwtValidator = config.jwtValidator || null;
    
    // Start periodic state checking
    this.startStateMonitoring();
  }

  /**
   * Get current authentication status
   */
  getStatus(): AuthStatus {
    return { ...this.currentStatus };
  }

  /**
   * Check if user is authenticated (any level)
   */
  isAuthenticated(): boolean {
    return ![AuthState.ANON, AuthState.ERROR].includes(this.currentStatus.state);
  }

  /**
   * Check if user is fully unlocked (past all gates)
   */
  isUnlocked(): boolean {
    return this.currentStatus.state === AuthState.UNLOCKED;
  }

  /**
   * Add event listener
   */
  addEventListener(listener: AuthEventListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: AuthEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: AuthEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Auth event listener error:', error);
      }
    });
  }

  /**
   * Update state and emit events
   */
  private updateState(newState: AuthState, updates: Partial<AuthStatus> = {}): void {
    const oldState = this.currentStatus.state;
    
    this.currentStatus = {
      ...this.currentStatus,
      ...updates,
      state: newState
    };

    console.log(`Auth state transition: ${oldState} → ${newState}`);

    this.emitEvent({
      type: 'STATE_CHANGED',
      payload: { oldState, newState }
    });
  }

  /**
   * Initialize authentication with JWT
   */
  async initializeWithJWT(jwtToken: string): Promise<void> {
    try {
      // Check if JWT is expired first (quick check)
      if (JWTUtils.isExpired(jwtToken, this.config.clockTolerance)) {
        console.log('JWT is expired, moving to JWT_STALE');
        this.updateState(AuthState.JWT_STALE, {
          jwtExpiresAt: 0,
          requiresGate: false
        });
        return;
      }

      // If we have a validator, do full validation
      let payload: JWTPayload | null = null;
      if (this.jwtValidator) {
        payload = await this.jwtValidator.validateToken(jwtToken, {
          expectedIssuer: this.config.expectedIssuer,
          expectedAudience: this.config.expectedAudience,
          clockTolerance: this.config.clockTolerance
        });

        if (!payload) {
          console.log('JWT validation failed');
          this.updateState(AuthState.ERROR);
          return;
        }

        this.emitEvent({ type: 'JWT_VALIDATED', payload });
      } else {
        // Extract payload without validation (development mode)
        payload = JWTUtils.extractPayload(jwtToken);
        if (!payload) {
          console.log('Failed to extract JWT payload');
          this.updateState(AuthState.ERROR);
          return;
        }
      }

      // JWT is valid, check if user requires gate
      const requiresGate = await this.checkIfUserRequiresGate(payload.sub);
      
      if (requiresGate && !this.isUserGateValid(payload.sub)) {
        console.log('User requires gate, moving to GATED');
        this.updateState(AuthState.GATED, {
          userId: payload.sub,
          email: payload.email,
          jwtExpiresAt: payload.exp * 1000,
          requiresGate: true
        });
      } else if (requiresGate && this.isUserGateValid(payload.sub)) {
        console.log('User gate is valid, moving to UNLOCKED');
        this.updateState(AuthState.UNLOCKED, {
          userId: payload.sub,
          email: payload.email,
          jwtExpiresAt: payload.exp * 1000,
          requiresGate: true,
          gateExpiresAt: this.getGateExpirationTime(payload.sub)
        });
      } else {
        console.log('No gate required, moving to JWT_OK');
        this.updateState(AuthState.JWT_OK, {
          userId: payload.sub,
          email: payload.email,
          jwtExpiresAt: payload.exp * 1000,
          requiresGate: false
        });
      }

    } catch (error) {
      console.error('Error initializing with JWT:', error);
      this.updateState(AuthState.ERROR);
    }
  }

  /**
   * Attempt to unlock with PIN
   */
  async unlockWithPIN(pin: string): Promise<boolean> {
    if (this.currentStatus.state !== AuthState.GATED || !this.currentStatus.userId) {
      console.warn('Cannot unlock with PIN: not in GATED state or no userId');
      return false;
    }

    try {
      const isValid = await pinGate.verifyPIN(pin, this.currentStatus.userId);
      
      if (isValid) {
        // Set gate session
        pinGate.setGateSession(this.currentStatus.userId, this.config.defaultGateDuration);
        
        this.updateState(AuthState.UNLOCKED, {
          gateExpiresAt: Date.now() + (this.config.defaultGateDuration! * 60 * 1000)
        });

        this.emitEvent({
          type: 'GATE_UNLOCKED',
          payload: { userId: this.currentStatus.userId, method: 'pin' }
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error unlocking with PIN:', error);
      return false;
    }
  }

  /**
   * Attempt to unlock with WebAuthn
   */
  async unlockWithWebAuthn(): Promise<boolean> {
    if (this.currentStatus.state !== AuthState.GATED || !this.currentStatus.userId) {
      console.warn('Cannot unlock with WebAuthn: not in GATED state or no userId');
      return false;
    }

    try {
      const isValid = await webAuthnGate.authenticate(this.currentStatus.userId);
      
      if (isValid) {
        // Set gate session
        webAuthnGate.setGateSession(this.currentStatus.userId, this.config.defaultGateDuration);
        
        this.updateState(AuthState.UNLOCKED, {
          gateExpiresAt: Date.now() + (this.config.defaultGateDuration! * 60 * 1000)
        });

        this.emitEvent({
          type: 'GATE_UNLOCKED',
          payload: { userId: this.currentStatus.userId, method: 'webauthn' }
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error unlocking with WebAuthn:', error);
      return false;
    }
  }

  /**
   * Extend gate session
   */
  extendGateSession(additionalMinutes: number = 5): boolean {
    if (this.currentStatus.state !== AuthState.UNLOCKED || !this.currentStatus.userId) {
      return false;
    }

    const extended = pinGate.extendGateSession(this.currentStatus.userId, additionalMinutes);
    
    if (extended) {
      this.updateState(AuthState.UNLOCKED, {
        gateExpiresAt: (this.currentStatus.gateExpiresAt || Date.now()) + (additionalMinutes * 60 * 1000)
      });

      this.emitEvent({
        type: 'GATE_EXTENDED',
        payload: { userId: this.currentStatus.userId, additionalMinutes }
      });

      return true;
    }

    return false;
  }

  /**
   * Logout user completely
   */
  logout(): void {
    const userId = this.currentStatus.userId;
    
    if (userId) {
      // Clear gate sessions
      pinGate.clearGateSession(userId);
      
      this.emitEvent({
        type: 'USER_LOGOUT',
        payload: { userId }
      });
    }

    this.updateState(AuthState.ANON, {
      userId: undefined,
      email: undefined,
      jwtExpiresAt: undefined,
      gateExpiresAt: undefined,
      requiresGate: false
    });
  }

  /**
   * Force refresh authentication state
   */
  async refreshState(): Promise<void> {
    // This will be called periodically to check for state changes
    const currentUserId = this.currentStatus.userId;

    switch (this.currentStatus.state) {
      case AuthState.JWT_OK:
      case AuthState.UNLOCKED:
        // Check JWT expiration
        if (this.currentStatus.jwtExpiresAt && Date.now() > this.currentStatus.jwtExpiresAt) {
          console.log('JWT expired, moving to JWT_STALE');
          this.updateState(AuthState.JWT_STALE);
          
          if (currentUserId) {
            this.emitEvent({
              type: 'JWT_EXPIRED',
              payload: { userId: currentUserId }
            });
          }
        }
        
        // Check gate expiration for UNLOCKED state
        if (this.currentStatus.state === AuthState.UNLOCKED && currentUserId) {
          if (!this.isUserGateValid(currentUserId)) {
            console.log('Gate expired, moving to GATED');
            this.updateState(AuthState.GATED, {
              gateExpiresAt: undefined
            });
            
            this.emitEvent({
              type: 'GATE_EXPIRED',
              payload: { userId: currentUserId }
            });
          }
        }
        break;

      case AuthState.GATED:
        // Check if gate became valid
        if (currentUserId && this.isUserGateValid(currentUserId)) {
          console.log('Gate became valid, moving to UNLOCKED');
          this.updateState(AuthState.UNLOCKED, {
            gateExpiresAt: this.getGateExpirationTime(currentUserId)
          });
        }
        break;
    }
  }

  /**
   * Check if user requires gate authentication
   */
  private async checkIfUserRequiresGate(userId: string): Promise<boolean> {
    // This would typically check user settings
    // For now, return true if user has PIN or WebAuthn set up
    return pinGate.hasPIN(userId) || webAuthnGate.hasCredentials(userId);
  }

  /**
   * Check if user's gate is valid
   */
  private isUserGateValid(userId: string): boolean {
    return pinGate.isGateValid(userId) || webAuthnGate.isGateValid(userId);
  }

  /**
   * Get gate expiration time
   */
  private getGateExpirationTime(userId: string): number | undefined {
    const pinTime = pinGate.getGateTimeRemaining(userId);
    
    if (pinTime > 0) {
      return Date.now() + pinTime;
    }
    
    return undefined;
  }

  /**
   * Start periodic state monitoring
   */
  private startStateMonitoring(): void {
    if (this.stateCheckInterval) {
      clearInterval(this.stateCheckInterval);
    }

    // Check every 30 seconds
    this.stateCheckInterval = setInterval(() => {
      this.refreshState().catch(error => {
        console.error('Error during state refresh:', error);
      });
    }, 30000);
  }

  /**
   * Stop state monitoring
   */
  destroy(): void {
    if (this.stateCheckInterval) {
      clearInterval(this.stateCheckInterval);
      this.stateCheckInterval = null;
    }
    
    this.listeners.clear();
  }

  /**
   * Get available authentication methods for user
   */
  getAvailableAuthMethods(userId?: string): {
    pin: boolean;
    webauthn: boolean;
    webauthnSupported: boolean;
  } {
    const targetUserId = userId || this.currentStatus.userId;
    
    if (!targetUserId) {
      return { pin: false, webauthn: false, webauthnSupported: false };
    }

    return {
      pin: pinGate.hasPIN(targetUserId),
      webauthn: webAuthnGate.hasCredentials(targetUserId),
      webauthnSupported: webAuthnGate.isSupported()
    };
  }

  /**
   * Get time remaining for current gate session
   */
  getGateTimeRemaining(): number {
    if (!this.currentStatus.userId) return 0;
    
    return pinGate.getGateTimeRemaining(this.currentStatus.userId);
  }

  /**
   * Get JWT time remaining
   */
  getJWTTimeRemaining(): number {
    if (!this.currentStatus.jwtExpiresAt) return 0;
    
    return Math.max(0, this.currentStatus.jwtExpiresAt - Date.now());
  }
}

/**
 * Global auth state manager instance
 */
let globalAuthManager: AuthStateManager | null = null;

/**
 * Get or create global auth manager
 */
export function getAuthManager(config?: AuthConfig): AuthStateManager {
  if (!globalAuthManager) {
    globalAuthManager = new AuthStateManager(config);
  }
  return globalAuthManager;
}

/**
 * Destroy global auth manager
 */
export function destroyAuthManager(): void {
  if (globalAuthManager) {
    globalAuthManager.destroy();
    globalAuthManager = null;
  }
}