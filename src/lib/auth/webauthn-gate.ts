/**
 * WebAuthn-based gate system for biometric authentication
 * Provides secure authentication using platform authenticators (TouchID, FaceID, etc.)
 */

/**
 * Stored credential information
 */
interface StoredCredential {
  credentialId: string;  // Base64-encoded credential ID
  publicKey: string;     // Base64-encoded public key (for verification)
  userId: string;        // User identifier
  userHandle: string;    // User handle (can be different from userId)
  created: string;       // ISO timestamp
  lastUsed: string;      // ISO timestamp
  authenticatorName?: string; // Optional friendly name
}

/**
 * WebAuthn registration options
 */
interface RegistrationOptions {
  challenge: string;
  timeout: number;
  userVerification: 'required' | 'preferred' | 'discouraged';
  authenticatorAttachment?: 'platform' | 'cross-platform';
}

/**
 * WebAuthn authentication options
 */
interface AuthenticationOptions {
  challenge: string;
  timeout: number;
  userVerification: 'required' | 'preferred' | 'discouraged';
}

/**
 * WebAuthn Gate implementation
 */
export class WebAuthnGate {
  private storagePrefix: string = 'logdrio_webauthn_';
  private rpId: string;
  private rpName: string;

  constructor(rpId?: string, rpName: string = 'Logdrio') {
    this.rpId = rpId || (typeof window !== 'undefined' ? window.location.hostname : 'logdrio.com');
    this.rpName = rpName;
  }

  /**
   * Check if WebAuthn is supported
   */
  isSupported(): boolean {
    return !!(window.PublicKeyCredential && 
             navigator.credentials && 
             typeof navigator.credentials.create === 'function' &&
             typeof navigator.credentials.get === 'function');
  }

  /**
   * Check if platform authenticator is available
   */
  async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Generate random challenge
   */
  private generateChallenge(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(32));
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const binary = String.fromCharCode(...bytes);
    return btoa(binary);
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Get storage key for user's credentials
   */
  private getCredentialStorageKey(userId: string): string {
    return `${this.storagePrefix}${userId}`;
  }

  /**
   * Register a new WebAuthn credential
   */
  async register(
    userId: string, 
    userDisplayName: string, 
    userEmail: string,
    options: Partial<RegistrationOptions> = {}
  ): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error('WebAuthn is not supported in this browser');
    }

    if (!userId || !userDisplayName || !userEmail) {
      throw new Error('User ID, display name, and email are required');
    }

    try {
      const challenge = this.generateChallenge();
      const userHandle = crypto.getRandomValues(new Uint8Array(32));

      const createCredentialDefaultArgs: PublicKeyCredentialCreationOptions = {
        challenge: challenge as BufferSource,
        rp: {
          id: this.rpId,
          name: this.rpName
        },
        user: {
          id: userHandle as BufferSource,
          name: userEmail,
          displayName: userDisplayName
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' as const },  // ES256
          { alg: -257, type: 'public-key' as const } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: options.authenticatorAttachment || 'platform',
          userVerification: options.userVerification || 'required',
          requireResidentKey: false
        },
        timeout: options.timeout || 60000,
        attestation: 'none' as const
      };

      // Check for existing credentials to exclude
      const existingCredentials = this.getStoredCredentials(userId);
      if (existingCredentials.length > 0) {
        createCredentialDefaultArgs.excludeCredentials = existingCredentials.map(cred => ({
          id: this.base64ToArrayBuffer(cred.credentialId),
          type: 'public-key' as const
        }));
      }

      console.log('Starting WebAuthn registration...');
      const credential = await navigator.credentials.create({
        publicKey: createCredentialDefaultArgs
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to create credential');
      }

      const response = credential.response as AuthenticatorAttestationResponse;
      
      // Store credential information
      const storedCredential: StoredCredential = {
        credentialId: this.arrayBufferToBase64(credential.rawId),
        publicKey: this.arrayBufferToBase64(response.getPublicKey()!),
        userId,
        userHandle: this.arrayBufferToBase64(userHandle.buffer),
        created: new Date().toISOString(),
        lastUsed: new Date().toISOString()
      };

      this.storeCredential(userId, storedCredential);
      
      console.log('WebAuthn credential registered successfully for user:', userId);
      return true;

    } catch (error) {
      console.error('WebAuthn registration failed:', error);
      
      if (error instanceof Error) {
        if (error.name === 'NotSupportedError') {
          throw new Error('WebAuthn is not supported on this device');
        } else if (error.name === 'SecurityError') {
          throw new Error('WebAuthn registration blocked by security policy');
        } else if (error.name === 'AbortError') {
          throw new Error('WebAuthn registration was cancelled');
        } else if (error.name === 'NotAllowedError') {
          throw new Error('WebAuthn registration not allowed');
        }
      }
      
      throw new Error('WebAuthn registration failed');
    }
  }

  /**
   * Authenticate with WebAuthn
   */
  async authenticate(
    userId: string,
    options: Partial<AuthenticationOptions> = {}
  ): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error('WebAuthn is not supported in this browser');
    }

    try {
      const credentials = this.getStoredCredentials(userId);
      
      if (credentials.length === 0) {
        throw new Error('No WebAuthn credentials found for user');
      }

      const challenge = this.generateChallenge();

      const getCredentialDefaultArgs: PublicKeyCredentialRequestOptions = {
        challenge: challenge as BufferSource,
        allowCredentials: credentials.map(cred => ({
          id: this.base64ToArrayBuffer(cred.credentialId),
          type: 'public-key' as const
        })),
        timeout: options.timeout || 60000,
        userVerification: options.userVerification || 'required',
        rpId: this.rpId
      };

      console.log('Starting WebAuthn authentication...');
      const credential = await navigator.credentials.get({
        publicKey: getCredentialDefaultArgs
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Authentication failed');
      }

      // Find the matching stored credential
      const credentialIdBase64 = this.arrayBufferToBase64(credential.rawId);
      const matchingCredential = credentials.find(
        cred => cred.credentialId === credentialIdBase64
      );

      if (!matchingCredential) {
        throw new Error('Credential not found in storage');
      }

      // Update last used timestamp
      matchingCredential.lastUsed = new Date().toISOString();
      this.updateCredential(userId, matchingCredential);

      console.log('WebAuthn authentication successful for user:', userId);
      return true;

    } catch (error) {
      console.error('WebAuthn authentication failed:', error);
      
      if (error instanceof Error) {
        if (error.name === 'NotSupportedError') {
          throw new Error('WebAuthn is not supported on this device');
        } else if (error.name === 'SecurityError') {
          throw new Error('WebAuthn authentication blocked by security policy');
        } else if (error.name === 'AbortError') {
          throw new Error('WebAuthn authentication was cancelled');
        } else if (error.name === 'NotAllowedError') {
          throw new Error('WebAuthn authentication not allowed');
        }
      }
      
      return false;
    }
  }

  /**
   * Store credential in localStorage
   */
  private storeCredential(userId: string, credential: StoredCredential): void {
    const storageKey = this.getCredentialStorageKey(userId);
    const existingCredentials = this.getStoredCredentials(userId);
    
    // Add new credential to existing ones
    const updatedCredentials = [...existingCredentials, credential];
    
    localStorage.setItem(storageKey, JSON.stringify(updatedCredentials));
  }

  /**
   * Update existing credential
   */
  private updateCredential(userId: string, updatedCredential: StoredCredential): void {
    const storageKey = this.getCredentialStorageKey(userId);
    const credentials = this.getStoredCredentials(userId);
    
    const updatedCredentials = credentials.map(cred => 
      cred.credentialId === updatedCredential.credentialId ? updatedCredential : cred
    );
    
    localStorage.setItem(storageKey, JSON.stringify(updatedCredentials));
  }

  /**
   * Get stored credentials for user
   */
  private getStoredCredentials(userId: string): StoredCredential[] {
    const storageKey = this.getCredentialStorageKey(userId);
    const stored = localStorage.getItem(storageKey);
    
    if (!stored) return [];
    
    try {
      return JSON.parse(stored) as StoredCredential[];
    } catch {
      return [];
    }
  }

  /**
   * Check if user has WebAuthn credentials
   */
  hasCredentials(userId: string): boolean {
    return this.getStoredCredentials(userId).length > 0;
  }

  /**
   * Get credential count for user
   */
  getCredentialCount(userId: string): number {
    return this.getStoredCredentials(userId).length;
  }

  /**
   * Get credential information for display
   */
  getCredentialInfo(userId: string): Array<{
    id: string;
    created: Date;
    lastUsed: Date;
    authenticatorName?: string;
  }> {
    return this.getStoredCredentials(userId).map(cred => ({
      id: cred.credentialId.substring(0, 8) + '...',
      created: new Date(cred.created),
      lastUsed: new Date(cred.lastUsed),
      authenticatorName: cred.authenticatorName
    }));
  }

  /**
   * Remove specific credential
   */
  removeCredential(userId: string, credentialId: string): boolean {
    const credentials = this.getStoredCredentials(userId);
    const filteredCredentials = credentials.filter(
      cred => cred.credentialId !== credentialId
    );
    
    if (filteredCredentials.length === credentials.length) {
      return false; // Credential not found
    }
    
    const storageKey = this.getCredentialStorageKey(userId);
    
    if (filteredCredentials.length === 0) {
      localStorage.removeItem(storageKey);
    } else {
      localStorage.setItem(storageKey, JSON.stringify(filteredCredentials));
    }
    
    return true;
  }

  /**
   * Remove all credentials for user
   */
  removeAllCredentials(userId: string): void {
    const storageKey = this.getCredentialStorageKey(userId);
    localStorage.removeItem(storageKey);
    console.log('All WebAuthn credentials removed for user:', userId);
  }

  /**
   * Set gate session after successful authentication
   */
  setGateSession(userId: string, durationMinutes: number = 5): void {
    const now = Date.now();
    const expiresAt = now + (durationMinutes * 60 * 1000);

    const session = {
      userId,
      expiresAt,
      created: now,
      method: 'webauthn'
    };

    const sessionKey = `logdrio_gate_${userId}`;
    sessionStorage.setItem(sessionKey, JSON.stringify(session));

    console.log(`WebAuthn gate session set for user ${userId}, expires in ${durationMinutes} minutes`);
  }

  /**
   * Check gate session validity (shared with PIN gate)
   */
  isGateValid(userId: string): boolean {
    if (!userId) return false;

    try {
      const sessionKey = `logdrio_gate_${userId}`;
      const sessionData = sessionStorage.getItem(sessionKey);
      
      if (!sessionData) return false;

      const session = JSON.parse(sessionData);
      
      if (session.userId !== userId) return false;

      const now = Date.now();
      return now < session.expiresAt;
    } catch {
      return false;
    }
  }
}

/**
 * Global WebAuthn gate instance (lazy initialization)
 */
let _webAuthnGate: WebAuthnGate | null = null;

export const webAuthnGate = {
  get instance(): WebAuthnGate {
    if (!_webAuthnGate) {
      _webAuthnGate = new WebAuthnGate();
    }
    return _webAuthnGate;
  },
  
  // Delegate methods to the instance
  isSupported: () => webAuthnGate.instance.isSupported(),
  isPlatformAuthenticatorAvailable: () => webAuthnGate.instance.isPlatformAuthenticatorAvailable(),
  register: (userId: string, userDisplayName: string, userEmail: string, options?: Partial<RegistrationOptions>) => 
    webAuthnGate.instance.register(userId, userDisplayName, userEmail, options),
  authenticate: (userId: string, options?: Partial<AuthenticationOptions>) => 
    webAuthnGate.instance.authenticate(userId, options),
  hasCredentials: (userId: string) => webAuthnGate.instance.hasCredentials(userId),
  getCredentialCount: (userId: string) => webAuthnGate.instance.getCredentialCount(userId),
  getCredentialInfo: (userId: string) => webAuthnGate.instance.getCredentialInfo(userId),
  removeCredential: (userId: string, credentialId: string) => 
    webAuthnGate.instance.removeCredential(userId, credentialId),
  removeAllCredentials: (userId: string) => webAuthnGate.instance.removeAllCredentials(userId),
  setGateSession: (userId: string, durationMinutes?: number) => 
    webAuthnGate.instance.setGateSession(userId, durationMinutes),
  isGateValid: (userId: string) => webAuthnGate.instance.isGateValid(userId),
};

/**
 * WebAuthn utility functions
 */
export const WebAuthnUtils = {
  /**
   * Get user-friendly error message
   */
  getErrorMessage: (error: Error): string => {
    switch (error.name) {
      case 'NotSupportedError':
        return 'WebAuthn is not supported on this device or browser';
      case 'SecurityError':
        return 'Security policy prevents WebAuthn usage';
      case 'AbortError':
        return 'Operation was cancelled';
      case 'NotAllowedError':
        return 'WebAuthn not allowed. Please try again';
      case 'InvalidStateError':
        return 'Authenticator is in an invalid state';
      case 'ConstraintError':
        return 'Authenticator constraints not satisfied';
      case 'NetworkError':
        return 'Network error occurred';
      default:
        return error.message || 'WebAuthn operation failed';
    }
  },

  /**
   * Check browser compatibility
   */
  getBrowserSupport: (): {
    supported: boolean;
    missingFeatures: string[];
  } => {
    const missingFeatures: string[] = [];

    if (!window.PublicKeyCredential) {
      missingFeatures.push('PublicKeyCredential');
    }

    if (!navigator.credentials) {
      missingFeatures.push('Credentials API');
    }

    if (!navigator.credentials?.create) {
      missingFeatures.push('Credential creation');
    }

    if (!navigator.credentials?.get) {
      missingFeatures.push('Credential authentication');
    }

    return {
      supported: missingFeatures.length === 0,
      missingFeatures
    };
  }
};