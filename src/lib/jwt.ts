import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export interface TokenPayload extends JWTPayload {
  sub: string;
  email: string;
  name?: string;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: number;
  refreshTokenExpiry: number;
}

class JWTService {
  private secret: Uint8Array;

  constructor() {
    const secretKey = process.env.JWT_SECRET;
    if (!secretKey) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    this.secret = new TextEncoder().encode(secretKey);
  }

  /**
   * Generate access and refresh token pair
   */
  async generateTokenPair(userId: string, email: string, name?: string): Promise<TokenPair> {
    const now = Math.floor(Date.now() / 1000);
    const accessExpiry = now + this.parseExpiry(process.env.JWT_ACCESS_TOKEN_EXPIRY || '5m');
    const refreshExpiry = now + this.parseExpiry(process.env.JWT_REFRESH_TOKEN_EXPIRY || '1h');

    const issuer = process.env.JWT_ISSUER || 'https://logdr.io';
    const audience = process.env.JWT_AUDIENCE || 'logdrio-app';

    // Generate access token
    const accessToken = await new SignJWT({
      sub: userId,
      email,
      name,
      type: 'access'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(issuer)
      .setAudience(audience)
      .setExpirationTime(accessExpiry)
      .setIssuedAt(now)
      .sign(this.secret);

    // Generate refresh token
    const refreshToken = await new SignJWT({
      sub: userId,
      email,
      name,
      type: 'refresh'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(issuer)
      .setAudience(audience)
      .setExpirationTime(refreshExpiry)
      .setIssuedAt(now)
      .sign(this.secret);

    return {
      accessToken,
      refreshToken,
      accessTokenExpiry: accessExpiry * 1000, // Convert to milliseconds
      refreshTokenExpiry: refreshExpiry * 1000
    };
  }

  /**
   * Verify and decode JWT token
   */
  async verifyToken(token: string): Promise<TokenPayload> {
    const issuer = process.env.JWT_ISSUER || 'https://logdr.io';
    const audience = process.env.JWT_AUDIENCE || 'logdrio-app';

    const { payload } = await jwtVerify(token, this.secret, {
      issuer,
      audience,
    });

    return payload as TokenPayload;
  }

  /**
   * Generate new access token from refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; accessTokenExpiry: number }> {
    const payload = await this.verifyToken(refreshToken);
    
    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type for refresh');
    }

    const now = Math.floor(Date.now() / 1000);
    const accessExpiry = now + this.parseExpiry(process.env.JWT_ACCESS_TOKEN_EXPIRY || '5m');
    
    const issuer = process.env.JWT_ISSUER || 'https://logdr.io';
    const audience = process.env.JWT_AUDIENCE || 'logdrio-app';

    const accessToken = await new SignJWT({
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      type: 'access'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(issuer)
      .setAudience(audience)
      .setExpirationTime(accessExpiry)
      .setIssuedAt(now)
      .sign(this.secret);

    return {
      accessToken,
      accessTokenExpiry: accessExpiry * 1000
    };
  }

  /**
   * Parse expiry string to seconds
   */
  private parseExpiry(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 300; // 5 minutes default
    }
  }
}

// Singleton instance
export const jwtService = new JWTService();