/**
 * Simplified JWT service that works directly with NextAuth
 */

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  isAnonymous: boolean;
}

export class SimpleJWTService {
  private currentUser: UserProfile | null = null;

  /**
   * Set current user from NextAuth session
   */
  setUser(session: any): void {
    if (session?.user?.email) {
      this.currentUser = {
        id: session.user.id || session.user.email,
        email: session.user.email,
        name: session.user.name,
        isAnonymous: false
      };
    } else {
      this.currentUser = null;
    }
  }

  /**
   * Set anonymous user (always uses fixed guest database)
   */
  setAnonymousUser(): void {
    this.currentUser = {
      id: 'guestdb',
      email: 'guest@anonymous.local',
      name: 'Guest User',
      isAnonymous: true
    };
  }

  /**
   * Get current user
   */
  getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated (including anonymous)
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Check if user is authenticated with a real account (not anonymous)
   */
  isRealUser(): boolean {
    return this.currentUser !== null && !this.currentUser.isAnonymous;
  }

  /**
   * Check if user is anonymous
   */
  isAnonymous(): boolean {
    return this.currentUser !== null && this.currentUser.isAnonymous;
  }

  /**
   * Get user ID
   */
  getUserId(): string | null {
    return this.currentUser?.id || null;
  }

  /**
   * Get user email
   */
  getUserEmail(): string | null {
    return this.currentUser?.email || null;
  }

  /**
   * Get user display name
   */
  getUserDisplayName(): string | null {
    return this.currentUser?.name || this.currentUser?.email?.split('@')[0] || null;
  }

  /**
   * Clear user data (logout)
   */
  clearUser(): void {
    this.currentUser = null;
  }
}

// Singleton instance
export const simpleJWTService = new SimpleJWTService();