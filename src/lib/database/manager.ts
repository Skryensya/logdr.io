/**
 * Database manager for user-specific database instances
 */

import { initializePouchDB, initializeSchema } from './initialization';
import { dbLogger } from '@/lib/utils/logger';

// Cache for databases by user
export const userDBs: Map<string, unknown> = new Map();
let PouchDBClass: unknown = null;

/**
 * Get or create database for a specific user
 */
export async function getUserDB(userId: string): Promise<unknown> {
  if (!userId) {
    dbLogger.error('User ID is required for database initialization');
    throw new Error('User ID is required');
  }
  
  dbLogger.debug('Getting database for user:', userId);
  
  if (!userDBs.has(userId)) {
    dbLogger.debug('Database not in cache, creating new instance for user:', userId);
    
    if (!PouchDBClass) {
      dbLogger.debug('Initializing PouchDB class...');
      PouchDBClass = await initializePouchDB();
      dbLogger.debug('PouchDB class initialized');
    }
    
    // Use userId directly, ensuring it's safe for database naming
    const safeUserId = userId.replace(/[^a-z0-9]/gi, '_');
    const dbName = `logdrio-${safeUserId}`;
    
    dbLogger.debug('Creating database with name:', dbName);
    
    const db = new (PouchDBClass as any)(dbName, {
      adapter: 'idb', // Force IndexedDB adapter
      auto_compaction: true,
      revs_limit: 1000
    });
    
    // Log database info after creation
    try {
      const info = await db.info();
      dbLogger.info('Database info after creation:', {
        adapter: info.adapter,
        db_name: info.db_name,
        doc_count: info.doc_count,
        update_seq: info.update_seq
      });
    } catch (error) {
      dbLogger.error('Error getting database info:', error);
    }
    
    // Initialize schema and configuration
    dbLogger.debug('Initializing schema for database:', dbName);
    await initializeSchema(db, userId);
    
    userDBs.set(userId, db);
    dbLogger.info('Database created and cached for user:', userId);
  } else {
    dbLogger.debug('Database found in cache for user:', userId);
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
    dbLogger.info('Cleared all data for user:', userId);
  } catch (error) {
    dbLogger.error('Error clearing data for user:', userId, error);
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