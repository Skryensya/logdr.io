/**
 * Database barrel export
 * Provides organized access to all database functionality
 */

// Configuration
export * from './config';

// Initialization
export * from './initialization';

// Database manager
export * from './manager';

// Main database classes
export { LogdrioDatabase, createUserDatabase } from './database';
export { ValidatedLogdrioDatabase, createValidatedUserDatabase } from './database-validated';