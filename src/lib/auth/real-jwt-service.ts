/**
 * Real JWT service for client-side token management
 */
export interface TokenInfo {
  valid: boolean;
  payload?: {
    sub: string;
    email: string;
    name?: string;
    exp: number;
    iat: number;
  };
  hasRefreshToken: boolean;
  accessTokenExpiry?: number;
  refreshTokenExpiry?: number;
}

export class RealJWTService {
  /**
   * Generate new token pair from current NextAuth session
   */
  async generateTokens(): Promise<{
    success: boolean;
    accessTokenExpiry: number;
    refreshTokenExpiry: number;
  }> {
    const response = await fetch('/api/auth/token', {
      method: 'POST',
      credentials: 'include', // Important for cookies
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate tokens');
    }

    return response.json();
  }

  /**
   * Validate current access token
   */
  async validateToken(): Promise<TokenInfo> {
    const response = await fetch('/api/auth/token', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      return { valid: false, hasRefreshToken: false };
    }

    return response.json();
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<{
    success: boolean;
    accessTokenExpiry: number;
  }> {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to refresh token');
    }

    return response.json();
  }

  /**
   * Logout - clear all tokens
   */
  async logout(): Promise<void> {
    await fetch('/api/auth/refresh', {
      method: 'DELETE',
      credentials: 'include',
    });
  }

  /**
   * Get token expiry times
   */
  async getTokenTimes(): Promise<{
    accessTokenExpiry: number;
    refreshTokenExpiry: number;
  } | null> {
    const tokenInfo = await this.validateToken();
    
    if (!tokenInfo.valid || !tokenInfo.payload) {
      return null;
    }

    // Calculate expiry times from JWT payload
    const accessTokenExpiry = tokenInfo.payload.exp * 1000; // Convert to milliseconds
    
    // For refresh token expiry, we'll estimate based on generation time + 1 hour
    // In a real app, you might want to store this separately or decode the refresh token
    const refreshTokenExpiry = accessTokenExpiry + (55 * 60 * 1000); // Add ~55 minutes

    return {
      accessTokenExpiry,
      refreshTokenExpiry
    };
  }

  /**
   * Auto-refresh token if needed
   */
  async ensureValidToken(): Promise<boolean> {
    try {
      const tokenInfo = await this.validateToken();
      
      if (tokenInfo.valid) {
        return true;
      }

      if (tokenInfo.hasRefreshToken) {
        await this.refreshToken();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Auto-refresh failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const realJWTService = new RealJWTService();