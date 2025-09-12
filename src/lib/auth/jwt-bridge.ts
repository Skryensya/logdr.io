import { realJWTService } from './real-jwt-service';

/**
 * Bridge between real JWT service and auth manager
 * Converts real JWT tokens to the format expected by the existing auth system
 */
export class JWTBridge {
  
  /**
   * Get JWT token in the format expected by AuthStateManager
   */
  async getJWTForAuthManager(): Promise<string | null> {
    try {
      const tokenInfo = await realJWTService.validateToken();
      
      if (!tokenInfo.valid || !tokenInfo.payload) {
        return null;
      }

      // Create a mock JWT structure that AuthStateManager can understand
      // This bridges the gap between real server-side JWTs and the client-side auth manager
      const mockJWTPayload = {
        iss: process.env.NEXT_PUBLIC_JWT_ISSUER || 'https://logdr.io',
        aud: process.env.NEXT_PUBLIC_JWT_AUDIENCE || 'logdrio-app',
        sub: tokenInfo.payload.sub,
        email: tokenInfo.payload.email,
        name: tokenInfo.payload.name,
        exp: tokenInfo.payload.exp,
        iat: tokenInfo.payload.iat
      };

      // Base64 encode the payload (simplified JWT format for auth manager)
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify(mockJWTPayload));
      const signature = 'real-jwt-validated'; // Placeholder since validation is done server-side

      return `${header}.${payload}.${signature}`;

    } catch (error) {
      console.error('Error bridging JWT:', error);
      return null;
    }
  }

  /**
   * Check if we have valid tokens
   */
  async hasValidTokens(): Promise<boolean> {
    try {
      const tokenInfo = await realJWTService.validateToken();
      return tokenInfo.valid;
    } catch (error) {
      return false;
    }
  }

  /**
   * Ensure tokens are valid, refresh if needed
   */
  async ensureValidTokens(): Promise<boolean> {
    return await realJWTService.ensureValidToken();
  }
}

export const jwtBridge = new JWTBridge();