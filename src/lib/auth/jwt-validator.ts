import { JWTPayload } from '@/types/database';

/**
 * JWT Header interface for RS256/ES256
 */
interface JWTHeader {
  alg: 'RS256' | 'ES256';
  typ: 'JWT';
  kid?: string; // Key ID
}

/**
 * Base64URL decode function
 */
function base64URLDecode(str: string): Uint8Array {
  // Add padding if needed
  const padded = str + '==='.slice(0, (4 - str.length % 4) % 4);
  // Replace URL-safe characters
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  // Decode base64
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Base64URL encode function
 */
function base64URLEncode(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Text encoder for consistent UTF-8 encoding
 */
const textEncoder = new TextEncoder();

/**
 * JWT Offline Validator using WebCrypto API
 */
export class OfflineJWTValidator {
  private publicKey: CryptoKey | null = null;
  private keyId: string | null = null;

  /**
   * Import public key for JWT validation
   */
  async importPublicKey(jwk: JsonWebKey, keyId?: string): Promise<void> {
    try {
      // Determine algorithm based on key type
      const algorithm = jwk.kty === 'RSA' ? 
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } :
        { name: 'ECDSA', namedCurve: 'P-256' };

      this.publicKey = await crypto.subtle.importKey(
        'jwk',
        jwk,
        algorithm,
        false, // not extractable
        ['verify']
      );
      
      this.keyId = keyId || null;
      console.log('Public key imported successfully');
    } catch (error) {
      console.error('Error importing public key:', error);
      throw new Error('Failed to import public key');
    }
  }

  /**
   * Parse JWT token into header, payload, and signature
   */
  private parseJWT(token: string): {
    header: JWTHeader;
    payload: JWTPayload;
    signature: Uint8Array;
    signingInput: Uint8Array;
  } {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    try {
      // Decode header
      const headerBytes = base64URLDecode(parts[0]);
      const headerStr = new TextDecoder().decode(headerBytes);
      const header = JSON.parse(headerStr) as JWTHeader;

      // Decode payload
      const payloadBytes = base64URLDecode(parts[1]);
      const payloadStr = new TextDecoder().decode(payloadBytes);
      const payload = JSON.parse(payloadStr) as JWTPayload;

      // Decode signature
      const signature = base64URLDecode(parts[2]);

      // Create signing input (header.payload)
      const signingInput = textEncoder.encode(`${parts[0]}.${parts[1]}`);

      return { header, payload, signature, signingInput };
    } catch (error) {
      throw new Error('Failed to parse JWT: ' + (error as Error).message);
    }
  }

  /**
   * Validate JWT signature
   */
  private async validateSignature(
    signingInput: Uint8Array,
    signature: Uint8Array,
    algorithm: string
  ): Promise<boolean> {
    if (!this.publicKey) {
      throw new Error('Public key not imported');
    }

    try {
      // Determine algorithm parameters
      const cryptoAlgorithm = algorithm === 'RS256' ?
        { name: 'RSASSA-PKCS1-v1_5' } :
        { name: 'ECDSA', hash: 'SHA-256' };

      return await crypto.subtle.verify(
        cryptoAlgorithm,
        this.publicKey,
        signature as BufferSource,
        signingInput as BufferSource
      );
    } catch (error) {
      console.error('Signature validation error:', error);
      return false;
    }
  }

  /**
   * Validate JWT payload claims
   */
  private validateClaims(payload: JWTPayload, options: {
    expectedIssuer?: string;
    expectedAudience?: string;
    clockTolerance?: number; // seconds
  } = {}): void {
    const now = Math.floor(Date.now() / 1000);
    const clockTolerance = options.clockTolerance || 300; // 5 minutes default

    // Check expiration (exp)
    if (!payload.exp) {
      throw new Error('JWT missing exp claim');
    }
    if (now > payload.exp + clockTolerance) {
      throw new Error('JWT expired');
    }

    // Check not before (nbf) if present
    if (payload.iat && now < payload.iat - clockTolerance) {
      throw new Error('JWT not yet valid');
    }

    // Check issuer (iss) if expected
    if (options.expectedIssuer && payload.iss !== options.expectedIssuer) {
      throw new Error(`JWT issuer mismatch: expected ${options.expectedIssuer}, got ${payload.iss}`);
    }

    // Check audience (aud) if expected
    if (options.expectedAudience && payload.aud !== options.expectedAudience) {
      throw new Error(`JWT audience mismatch: expected ${options.expectedAudience}, got ${payload.aud}`);
    }

    // Check required claims
    if (!payload.sub) {
      throw new Error('JWT missing sub (user ID) claim');
    }
    if (!payload.email) {
      throw new Error('JWT missing email claim');
    }
  }

  /**
   * Validate complete JWT token
   */
  async validateToken(
    token: string,
    options: {
      expectedIssuer?: string;
      expectedAudience?: string;
      clockTolerance?: number;
    } = {}
  ): Promise<JWTPayload | null> {
    try {
      // Parse JWT
      const { header, payload, signature, signingInput } = this.parseJWT(token);

      // Validate algorithm
      if (!['RS256', 'ES256'].includes(header.alg)) {
        throw new Error(`Unsupported JWT algorithm: ${header.alg}`);
      }

      // Check key ID if specified
      if (this.keyId && header.kid && header.kid !== this.keyId) {
        throw new Error(`JWT key ID mismatch: expected ${this.keyId}, got ${header.kid}`);
      }

      // Validate signature
      const signatureValid = await this.validateSignature(signingInput, signature, header.alg);
      if (!signatureValid) {
        throw new Error('JWT signature validation failed');
      }

      // Validate claims
      this.validateClaims(payload, options);

      return payload;
    } catch (error) {
      console.error('JWT validation failed:', error);
      return null;
    }
  }

  /**
   * Check if JWT is expired (without full validation)
   */
  static isTokenExpired(token: string, clockTolerance = 300): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;

      const payloadBytes = base64URLDecode(parts[1]);
      const payloadStr = new TextDecoder().decode(payloadBytes);
      const payload = JSON.parse(payloadStr);

      if (!payload.exp) return true;

      const now = Math.floor(Date.now() / 1000);
      return now > payload.exp + clockTolerance;
    } catch {
      return true; // Consider invalid tokens as expired
    }
  }

  /**
   * Extract payload without validation (for debugging/development)
   */
  static extractPayload(token: string): JWTPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payloadBytes = base64URLDecode(parts[1]);
      const payloadStr = new TextDecoder().decode(payloadBytes);
      return JSON.parse(payloadStr) as JWTPayload;
    } catch {
      return null;
    }
  }

  /**
   * Get time until expiration in seconds
   */
  static getTimeUntilExpiration(token: string): number | null {
    const payload = OfflineJWTValidator.extractPayload(token);
    if (!payload?.exp) return null;

    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, payload.exp - now);
  }
}

/**
 * Mock JWT creator for development/testing
 */
export class MockJWTCreator {
  private privateKey: CryptoKey | null = null;
  private publicKey: CryptoKey | null = null;

  /**
   * Generate key pair for testing
   */
  async generateKeyPair(): Promise<{ publicKeyJWK: JsonWebKey; privateKey: CryptoKey }> {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      true, // extractable
      ['sign', 'verify']
    );

    this.privateKey = keyPair.privateKey;
    this.publicKey = keyPair.publicKey;

    const publicKeyJWK = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    
    return { publicKeyJWK, privateKey: keyPair.privateKey };
  }

  /**
   * Create mock JWT for testing
   */
  async createMockJWT(payload: Partial<JWTPayload>): Promise<string> {
    if (!this.privateKey) {
      const { privateKey } = await this.generateKeyPair();
      this.privateKey = privateKey;
    }

    const now = Math.floor(Date.now() / 1000);
    const fullPayload: JWTPayload = {
      iss: 'logdrio-dev',
      aud: 'logdrio-app',
      sub: payload.sub || 'test-user',
      email: payload.email || 'test@logdrio.com',
      exp: payload.exp || (now + 3600), // 1 hour from now
      iat: payload.iat || now,
      ...payload
    };

    const header = {
      alg: 'RS256' as const,
      typ: 'JWT'
    };

    // Encode header and payload
    const encodedHeader = base64URLEncode(textEncoder.encode(JSON.stringify(header)));
    const encodedPayload = base64URLEncode(textEncoder.encode(JSON.stringify(fullPayload)));
    
    // Create signing input
    const signingInput = textEncoder.encode(`${encodedHeader}.${encodedPayload}`);

    // Sign
    const signature = await crypto.subtle.sign(
      { name: 'RSASSA-PKCS1-v1_5' },
      this.privateKey,
      signingInput
    );

    const encodedSignature = base64URLEncode(new Uint8Array(signature));

    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
  }
}

/**
 * Utility functions for JWT handling
 */
export const JWTUtils = {
  isExpired: OfflineJWTValidator.isTokenExpired,
  extractPayload: OfflineJWTValidator.extractPayload,
  getTimeUntilExpiration: OfflineJWTValidator.getTimeUntilExpiration
};