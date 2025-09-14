/**
 * Hook to access database event manager for reactive updates
 */

import { useEffect, useRef } from 'react';
import { useDatabase } from '@/contexts/AuthContext';
import { DatabaseEventManager, getDatabaseEventManager } from '@/lib/database/events';

/**
 * Hook to get database event manager for reactive updates
 */
export function useDatabaseEvents(): DatabaseEventManager | null {
  const database = useDatabase();
  const eventManagerRef = useRef<DatabaseEventManager | null>(null);

  useEffect(() => {
    if (!database?.getRawDB) {
      eventManagerRef.current = null;
      return;
    }

    try {
      const rawDB = database.getRawDB();
      const eventManager = getDatabaseEventManager(rawDB);
      
      // Start listening if not already listening
      if (!eventManager.listening) {
        eventManager.startListening();
      }
      
      eventManagerRef.current = eventManager;

      return () => {
        // Note: We don't stop listening here because the same database
        // might be used by other components. The event manager will be
        // cleaned up when the database instance is destroyed.
      };
    } catch (error) {
      console.error('Error setting up database event manager:', error);
      eventManagerRef.current = null;
    }
  }, [database]);

  return eventManagerRef.current;
}