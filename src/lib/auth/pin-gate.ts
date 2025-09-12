/**
 * PIN-based gate system using PBKDF2 with WebCrypto API
 * Provides session-based unlocking with configurable timeout
 */

/**
 * PIN configuration interface
 */
interface PINConfig {
  iterations: number; // PBKDF2 iterations
  saltLength: number; // Salt length in bytes
  keyLength: number;  // Derived key length in bytes
}

/**
 * Stored PIN data interface
 */
interface StoredPINData {
  hash: string;      // Base64-encoded PBKDF2 hash
  salt: string;      // Base64-encoded salt
  iterations: number;
  created: string;   // ISO timestamp
}

/**
 * Session gate data interface
 */
interface GateSession {
  userId: string;
  expiresAt: number; // Unix timestamp
  created: number;   // Unix timestamp
}

const DEFAULT_CONFIG: PINConfig = {
  iterations: 100000, // 100k iterations for security
  saltLength: 32,     // 32 bytes salt
  keyLength: 32       // 32 bytes derived key
};

/**
 * PIN Gate implementation
 */
export class PINGate {
  private config: PINConfig;
  private storagePrefix: string;

  constructor(config: PINConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.storagePrefix = 'logdrio_pin_';
  }

  /**
   * Generate cryptographically secure random salt
   */
  private generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(this.config.saltLength));
  }

  /**
   * Derive key using PBKDF2
   */
  private async deriveKey(pin: string, salt: Uint8Array): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const pinBuffer = encoder.encode(pin);

    // Import PIN as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      pinBuffer,
      { name: 'PBKDF2' },
      false, // not extractable
      ['deriveBits']
    );

    // Derive key using PBKDF2
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: this.config.iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      this.config.keyLength * 8 // bits
    );

    return new Uint8Array(derivedBits);
  }

  /**
   * Convert Uint8Array to base64 string
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    const binary = String.fromCharCode(...buffer);
    return btoa(binary);
  }

  /**
   * Convert base64 string to Uint8Array
   */
  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Get storage key for user's PIN
   */
  private getPINStorageKey(userId: string): string {
    return `${this.storagePrefix}${userId}`;
  }

  /**
   * Get storage key for gate session
   */
  private getGateSessionKey(userId: string): string {
    return `logdrio_gate_${userId}`;
  }

  /**
   * Set up PIN for a user
   */
  async setupPIN(pin: string, userId: string): Promise<void> {
    if (!pin || pin.length < 4) {
      throw new Error('PIN must be at least 4 characters long');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      // Generate salt
      const salt = this.generateSalt();
      
      // Derive key
      const hash = await this.deriveKey(pin, salt);

      // Create storage object
      const pinData: StoredPINData = {
        hash: this.arrayBufferToBase64(hash),
        salt: this.arrayBufferToBase64(salt),
        iterations: this.config.iterations,
        created: new Date().toISOString()
      };

      // Store in localStorage
      const storageKey = this.getPINStorageKey(userId);
      localStorage.setItem(storageKey, JSON.stringify(pinData));

      console.log('PIN setup completed for user:', userId);
    } catch (error) {
      console.error('Error setting up PIN:', error);
      throw new Error('Failed to setup PIN');
    }
  }

  /**
   * Verify PIN for a user
   */
  async verifyPIN(pin: string, userId: string): Promise<boolean> {
    if (!pin || !userId) {
      return false;
    }

    try {
      // Get stored PIN data
      const storageKey = this.getPINStorageKey(userId);
      const storedData = localStorage.getItem(storageKey);
      
      if (!storedData) {
        console.warn('No PIN found for user:', userId);
        return false;
      }

      const pinData: StoredPINData = JSON.parse(storedData);

      // Recreate salt and hash
      const salt = this.base64ToArrayBuffer(pinData.salt);
      const storedHash = this.base64ToArrayBuffer(pinData.hash);

      // Derive key with provided PIN
      const derivedHash = await this.deriveKey(pin, salt);

      // Constant-time comparison
      if (storedHash.length !== derivedHash.length) {
        return false;
      }

      let result = 0;
      for (let i = 0; i < storedHash.length; i++) {
        result |= storedHash[i] ^ derivedHash[i];
      }

      const isValid = result === 0;

      if (isValid) {
        console.log('PIN verification successful for user:', userId);
      } else {
        console.warn('PIN verification failed for user:', userId);
      }

      return isValid;
    } catch (error) {
      console.error('Error verifying PIN:', error);
      return false;
    }
  }

  /**
   * Set gate session after successful PIN verification
   */
  setGateSession(userId: string, durationMinutes: number = 5): void {
    const now = Date.now();
    const expiresAt = now + (durationMinutes * 60 * 1000);

    const session: GateSession = {
      userId,
      expiresAt,
      created: now
    };

    const sessionKey = this.getGateSessionKey(userId);
    sessionStorage.setItem(sessionKey, JSON.stringify(session));

    console.log(`Gate session set for user ${userId}, expires in ${durationMinutes} minutes`);
  }

  /**
   * Check if gate session is valid
   */
  isGateValid(userId: string): boolean {
    if (!userId) return false;

    try {
      const sessionKey = this.getGateSessionKey(userId);
      const sessionData = sessionStorage.getItem(sessionKey);
      
      if (!sessionData) {
        return false;
      }

      const session: GateSession = JSON.parse(sessionData);
      
      // Check if session is for the correct user
      if (session.userId !== userId) {
        return false;
      }

      // Check if session is expired
      const now = Date.now();
      const isValid = now < session.expiresAt;

      if (!isValid) {
        // Clean up expired session
        this.clearGateSession(userId);
      }

      return isValid;
    } catch (error) {
      console.error('Error checking gate validity:', error);
      return false;
    }
  }

  /**
   * Get remaining time for gate session in milliseconds
   */
  getGateTimeRemaining(userId: string): number {
    if (!userId) return 0;

    try {
      const sessionKey = this.getGateSessionKey(userId);
      const sessionData = sessionStorage.getItem(sessionKey);
      
      if (!sessionData) return 0;

      const session: GateSession = JSON.parse(sessionData);
      
      if (session.userId !== userId) return 0;

      const now = Date.now();
      return Math.max(0, session.expiresAt - now);
    } catch {
      return 0;
    }
  }

  /**
   * Clear gate session
   */
  clearGateSession(userId: string): void {
    if (!userId) return;

    const sessionKey = this.getGateSessionKey(userId);
    sessionStorage.removeItem(sessionKey);
    console.log('Gate session cleared for user:', userId);
  }

  /**
   * Extend gate session
   */
  extendGateSession(userId: string, additionalMinutes: number = 5): boolean {
    if (!this.isGateValid(userId)) {
      return false;
    }

    try {
      const sessionKey = this.getGateSessionKey(userId);
      const sessionData = sessionStorage.getItem(sessionKey);
      
      if (!sessionData) return false;

      const session: GateSession = JSON.parse(sessionData);
      session.expiresAt += (additionalMinutes * 60 * 1000);

      sessionStorage.setItem(sessionKey, JSON.stringify(session));
      console.log(`Gate session extended for user ${userId} by ${additionalMinutes} minutes`);
      
      return true;
    } catch (error) {
      console.error('Error extending gate session:', error);
      return false;
    }
  }

  /**
   * Check if PIN is set up for user
   */
  hasPIN(userId: string): boolean {
    if (!userId) return false;

    const storageKey = this.getPINStorageKey(userId);
    return localStorage.getItem(storageKey) !== null;
  }

  /**
   * Remove PIN for user (use with caution)
   */
  removePIN(userId: string): void {
    if (!userId) return;

    const storageKey = this.getPINStorageKey(userId);
    localStorage.removeItem(storageKey);
    this.clearGateSession(userId);
    
    console.log('PIN removed for user:', userId);
  }

  /**
   * Change PIN for user
   */
  async changePIN(oldPIN: string, newPIN: string, userId: string): Promise<boolean> {
    // Verify old PIN first
    const isOldPINValid = await this.verifyPIN(oldPIN, userId);
    
    if (!isOldPINValid) {
      console.warn('Old PIN verification failed during PIN change');
      return false;
    }

    try {
      // Set up new PIN
      await this.setupPIN(newPIN, userId);
      console.log('PIN changed successfully for user:', userId);
      return true;
    } catch (error) {
      console.error('Error changing PIN:', error);
      return false;
    }
  }

  /**
   * Get PIN creation date
   */
  getPINCreatedDate(userId: string): Date | null {
    if (!userId) return null;

    try {
      const storageKey = this.getPINStorageKey(userId);
      const storedData = localStorage.getItem(storageKey);
      
      if (!storedData) return null;

      const pinData: StoredPINData = JSON.parse(storedData);
      return new Date(pinData.created);
    } catch {
      return null;
    }
  }
}

/**
 * Global PIN gate instance
 */
export const pinGate = new PINGate();

/**
 * Utility functions for PIN management
 */
export const PINUtils = {
  validatePINStrength: (pin: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!pin) {
      errors.push('PIN is required');
    } else {
      if (pin.length < 4) {
        errors.push('PIN must be at least 4 characters long');
      }
      
      if (pin.length > 20) {
        errors.push('PIN must be no more than 20 characters long');
      }
      
      // Check for trivial patterns
      if (/^(\d)\1+$/.test(pin)) {
        errors.push('PIN cannot be all the same digit');
      }
      
      if (/^(0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|3210)/.test(pin)) {
        errors.push('PIN cannot be a simple sequence');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },
  
  formatTimeRemaining: (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }
};