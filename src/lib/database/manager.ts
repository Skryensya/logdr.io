/**
 * Database manager for user-specific database instances
 */

import { initializePouchDB, initializeSchema } from './initialization';

// Cache for databases by user
export const userDBs: Map<string, unknown> = new Map();
let PouchDBClass: unknown = null;

/**
 * Get or create database for a specific user
 */
export async function getUserDB(userId: string): Promise<unknown> {
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  if (!userDBs.has(userId)) {
    if (!PouchDBClass) {
      PouchDBClass = await initializePouchDB();
    }
    
    // Use userId directly, ensuring it's safe for database naming
    const safeUserId = userId.replace(/[^a-z0-9]/gi, '_');
    const dbName = `logdrio-${safeUserId}`;
    
    const db = new (PouchDBClass as any)(dbName);
    
    // Initialize schema and configuration
    await initializeSchema(db, userId);
    
    userDBs.set(userId, db);
  }
  
  return userDBs.get(userId)!;
}

/**
 * Clear all data for a user (useful for logout/cleanup)
 */
export async function clearUserData(userId: string): Promise<void> {
  try {
    if (userDBs.has(userId)) {
      const db = userDBs.get(userId);
      await (db as any).destroy();
      userDBs.delete(userId);
    } else {
      // Even if not in cache, attempt to destroy the DB
      if (!PouchDBClass) {
        PouchDBClass = await initializePouchDB();
      }
      
      const safeUserId = userId.replace(/[^a-z0-9]/gi, '_');
      const dbName = `logdrio-${safeUserId}`;
      const db = new (PouchDBClass as any)(dbName);
      await db.destroy();
    }
    console.log('Cleared all data for user:', userId);
  } catch (error) {
    console.error('Error clearing data for user:', userId, error);
    throw error;
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(userId: string): Promise<Record<string, unknown> | null> {
  const db = userDBs.get(userId);
  if (!db) return null;
  
  return {
    info: await (db as any).info(),
    userDB: userId
  };
}