/**
 * Demo and examples for Phase 2 implementation
 * This file demonstrates the hybrid authentication system with offline JWT validation,
 * PIN gates, WebAuthn gates, and database integration
 */

import { AuthStateManager, getAuthManager } from '@/lib/auth/auth-state-manager';
import { initializeAuthDatabaseIntegration } from '@/lib/auth/auth-database-integration';
import { OfflineJWTValidator, MockJWTCreator } from '@/lib/auth/jwt-validator';
import { pinGate } from '@/lib/auth/pin-gate';
import { webAuthnGate } from '@/lib/auth/webauthn-gate';
import { AuthState } from '@/types/database';

/**
 * Example: Complete authentication flow setup
 */
export async function setupAuthenticationDemo(): Promise<{
  authManager: AuthStateManager;
  mockJWTCreator: MockJWTCreator;
  jwtValidator: OfflineJWTValidator;
}> {
  console.log('=== Phase 2 Demo: Setting up authentication system ===');
  
  try {
    // 1. Create mock JWT system for development
    const mockJWTCreator = new MockJWTCreator();
    const { publicKeyJWK } = await mockJWTCreator.generateKeyPair();
    
    // 2. Setup JWT validator
    const jwtValidator = new OfflineJWTValidator();
    await jwtValidator.importPublicKey(publicKeyJWK, 'dev-key-1');
    
    // 3. Create auth manager with validator
    const authManager = getAuthManager({
      jwtValidator,
      expectedIssuer: 'logdrio-dev',
      expectedAudience: 'logdrio-app',
      clockTolerance: 300,
      defaultGateDuration: 5
    });
    
    // 4. Setup auth-database integration
    const authDbIntegration = initializeAuthDatabaseIntegration(authManager);
    
    // 5. Initialize from any persisted state
    await authDbIntegration.initializeFromPersistedState();
    
    console.log('✅ Authentication system setup complete');
    
    return {
      authManager,
      mockJWTCreator,
      jwtValidator
    };
  } catch (error) {
    console.error('❌ Error setting up authentication system:', error);
    throw error;
  }
}

/**
 * Example: JWT authentication flow
 */
export async function jwtAuthenticationDemo(
  authManager: AuthStateManager,
  mockJWTCreator: MockJWTCreator
): Promise<string> {
  console.log('=== Phase 2 Demo: JWT Authentication Flow ===');
  
  try {
    // Create mock JWT token
    const mockJWT = await mockJWTCreator.createMockJWT({
      sub: 'demo-user-456',
      email: 'demo@logdrio.com',
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    });
    
    console.log('🔑 Mock JWT created');
    console.log('JWT payload preview:', mockJWT.substring(0, 50) + '...');
    
    // Initialize authentication with JWT
    await authManager.initializeWithJWT(mockJWT);
    
    const status = authManager.getStatus();
    console.log('📊 Auth status after JWT init:', {
      state: status.state,
      userId: status.userId,
      email: status.email,
      requiresGate: status.requiresGate
    });
    
    return mockJWT;
  } catch (error) {
    console.error('❌ Error in JWT authentication demo:', error);
    throw error;
  }
}

/**
 * Example: PIN gate setup and usage
 */
export async function pinGateDemo(userId: string): Promise<void> {
  console.log('=== Phase 2 Demo: PIN Gate System ===');
  
  try {
    const testPIN = '1234';
    
    // 1. Setup PIN
    console.log('🔐 Setting up PIN...');
    await pinGate.setupPIN(testPIN, userId);
    console.log('✅ PIN setup complete');
    
    // 2. Verify PIN works
    console.log('🔍 Verifying PIN...');
    const isValid = await pinGate.verifyPIN(testPIN, userId);
    console.log('PIN verification result:', isValid);
    
    if (isValid) {
      // 3. Set gate session
      pinGate.setGateSession(userId, 5); // 5 minutes
      console.log('🚪 Gate session established');
      
      // 4. Check gate status
      const gateValid = pinGate.isGateValid(userId);
      const timeRemaining = pinGate.getGateTimeRemaining(userId);
      console.log('Gate status:', { valid: gateValid, timeRemainingMs: timeRemaining });
      
      // 5. Test PIN security features
      const pinCreated = pinGate.getPINCreatedDate(userId);
      console.log('PIN created at:', pinCreated);
    }
    
    // Test wrong PIN
    console.log('🔍 Testing wrong PIN...');
    const wrongResult = await pinGate.verifyPIN('9999', userId);
    console.log('Wrong PIN result (should be false):', wrongResult);
    
  } catch (error) {
    console.error('❌ Error in PIN gate demo:', error);
    throw error;
  }
}

/**
 * Example: WebAuthn gate setup (browser dependent)
 */
export async function webAuthnGateDemo(userId: string): Promise<void> {
  console.log('=== Phase 2 Demo: WebAuthn Gate System ===');
  
  try {
    // 1. Check WebAuthn support
    const isSupported = webAuthnGate.isSupported();
    console.log('WebAuthn supported:', isSupported);
    
    if (!isSupported) {
      console.log('⚠️ WebAuthn not supported in this environment');
      return;
    }
    
    // 2. Check platform authenticator availability
    const platformAvailable = await webAuthnGate.isPlatformAuthenticatorAvailable();
    console.log('Platform authenticator available:', platformAvailable);
    
    if (!platformAvailable) {
      console.log('⚠️ Platform authenticator not available');
      return;
    }
    
    // 3. Register WebAuthn credential
    console.log('🔐 Attempting WebAuthn registration...');
    console.log('Note: This will trigger browser authentication prompt');
    
    try {
      const registered = await webAuthnGate.register(
        userId,
        'Demo User',
        'demo@logdrio.com'
      );
      
      if (registered) {
        console.log('✅ WebAuthn registration successful');
        
        // 4. Test authentication
        console.log('🔍 Testing WebAuthn authentication...');
        const authResult = await webAuthnGate.authenticate(userId);
        
        if (authResult) {
          console.log('✅ WebAuthn authentication successful');
          
          // Set gate session
          webAuthnGate.setGateSession(userId, 5);
          console.log('🚪 WebAuthn gate session established');
          
          // Get credential info
          const credInfo = webAuthnGate.getCredentialInfo(userId);
          console.log('Credential info:', credInfo);
        }
      }
    } catch (error) {
      console.log('⚠️ WebAuthn operation cancelled or failed:', error);
    }
    
  } catch (error) {
    console.error('❌ Error in WebAuthn gate demo:', error);
  }
}

/**
 * Example: Complete authentication flow with state transitions
 */
export async function authStateTransitionDemo(
  authManager: AuthStateManager,
  mockJWT: string
): Promise<void> {
  console.log('=== Phase 2 Demo: Authentication State Transitions ===');
  
  try {
    const userId = 'demo-user-456';
    
    // 1. Start from anonymous
    authManager.logout();
    let status = authManager.getStatus();
    console.log('📊 Initial state:', status.state);
    
    // 2. Authenticate with JWT (no gate required initially)
    await authManager.initializeWithJWT(mockJWT);
    status = authManager.getStatus();
    console.log('📊 After JWT auth:', status.state, '(no gate setup yet)');
    
    // 3. Setup PIN to require gate
    await pinGate.setupPIN('5678', userId);
    console.log('🔐 PIN setup - now gate is required');
    
    // 4. Re-authenticate - should now require gate
    await authManager.initializeWithJWT(mockJWT);
    status = authManager.getStatus();
    console.log('📊 After JWT auth with gate required:', status.state);
    
    // 5. Unlock with PIN
    if (status.state === AuthState.GATED) {
      console.log('🔑 Unlocking with PIN...');
      const unlocked = await authManager.unlockWithPIN('5678');
      status = authManager.getStatus();
      console.log('📊 After PIN unlock:', status.state, '(success:', unlocked + ')');
    }
    
    // 6. Extend gate session
    if (status.state === AuthState.UNLOCKED) {
      console.log('⏰ Extending gate session by 3 minutes...');
      const extended = authManager.extendGateSession(3);
      console.log('Extension result:', extended);
    }
    
    // 7. Show timing information
    console.log('⏱️ Timing info:', {
      jwtTimeRemaining: authManager.getJWTTimeRemaining(),
      gateTimeRemaining: authManager.getGateTimeRemaining(),
      availableMethods: authManager.getAvailableAuthMethods()
    });
    
    // 8. Logout
    authManager.logout();
    status = authManager.getStatus();
    console.log('📊 After logout:', status.state);
    
  } catch (error) {
    console.error('❌ Error in auth state transition demo:', error);
    throw error;
  }
}

/**
 * Example: Testing JWT expiration handling
 */
export async function jwtExpirationDemo(
  authManager: AuthStateManager,
  mockJWTCreator: MockJWTCreator
): Promise<void> {
  console.log('=== Phase 2 Demo: JWT Expiration Handling ===');
  
  try {
    const userId = 'demo-user-789';
    
    // Create expired JWT
    const expiredJWT = await mockJWTCreator.createMockJWT({
      sub: userId,
      email: 'expired@logdrio.com',
      exp: Math.floor(Date.now() / 1000) - 60 // Expired 1 minute ago
    });
    
    console.log('🕐 Created expired JWT');
    
    // Try to authenticate with expired JWT
    await authManager.initializeWithJWT(expiredJWT);
    const status = authManager.getStatus();
    
    console.log('📊 Status with expired JWT:', status.state);
    console.log('Expected: JWT_STALE');
    
    // Create JWT that expires soon
    const soonToExpireJWT = await mockJWTCreator.createMockJWT({
      sub: userId,
      email: 'soon@logdrio.com',
      exp: Math.floor(Date.now() / 1000) + 30 // Expires in 30 seconds
    });
    
    console.log('⏰ Created JWT that expires in 30 seconds');
    
    await authManager.initializeWithJWT(soonToExpireJWT);
    const newStatus = authManager.getStatus();
    
    console.log('📊 Status with soon-to-expire JWT:', newStatus.state);
    console.log('JWT time remaining:', authManager.getJWTTimeRemaining());
    
  } catch (error) {
    console.error('❌ Error in JWT expiration demo:', error);
    throw error;
  }
}

/**
 * Complete Phase 2 demo workflow
 */
export async function runCompletePhase2Demo(): Promise<void> {
  console.log('\n🚀 Starting Complete Phase 2 Demo\n');
  
  try {
    // 1. Setup authentication system
    const { authManager, mockJWTCreator } = await setupAuthenticationDemo();
    
    // 2. JWT authentication flow
    const mockJWT = await jwtAuthenticationDemo(authManager, mockJWTCreator);
    
    // 3. PIN gate demo
    await pinGateDemo('demo-user-456');
    
    // 4. WebAuthn gate demo (browser dependent)
    await webAuthnGateDemo('demo-user-456');
    
    // 5. State transition demo
    await authStateTransitionDemo(authManager, mockJWT);
    
    // 6. JWT expiration demo
    await jwtExpirationDemo(authManager, mockJWTCreator);
    
    console.log('\n✅ Phase 2 demo completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Phase 2 demo failed:', error);
    throw error;
  }
}

// Export for potential use in development/testing
export const Phase2Demo = {
  setupAuthenticationDemo,
  jwtAuthenticationDemo,
  pinGateDemo,
  webAuthnGateDemo,
  authStateTransitionDemo,
  jwtExpirationDemo,
  runCompletePhase2Demo
};