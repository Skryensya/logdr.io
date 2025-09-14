/**
 * Types and interfaces for database queries
 */

import { LogdrioDatabase } from '../database';

/**
 * Base interface for query implementations
 */
export interface QueryContext {
  db: LogdrioDatabase;
}

/**
 * Helper to get raw database instance with proper typing
 * Note: Returns any to allow database operations - PouchDB doesn't have complete TypeScript types
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getRawDB(db: LogdrioDatabase): any {
  return db.getRawDB();
}