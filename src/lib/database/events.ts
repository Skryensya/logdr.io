/**
 * Database event manager for reactive PouchDB updates
 */

export interface DatabaseChange {
  id: string;
  seq: string;
  deleted?: boolean;
  doc?: any;
  changes: Array<{ rev: string }>;
}

export interface DocumentChangeEvent {
  type: 'created' | 'updated' | 'deleted';
  documentType: string;
  document?: any;
  id: string;
}

export type DatabaseChangeListener = (event: DocumentChangeEvent) => void;

/**
 * Simple event emitter for database changes
 */
class SimpleEventEmitter {
  private listeners = new Map<string, Set<Function>>();

  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: string, listener: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}

/**
 * Manages PouchDB change streams and provides reactive updates
 */
export class DatabaseEventManager extends SimpleEventEmitter {
  private changeStream?: any;
  private isListening = false;
  private db: any;

  constructor(db: any) {
    super();
    this.db = db;
  }

  /**
   * Start listening for database changes
   */
  startListening(): void {
    if (this.isListening || !this.db) return;

    try {
      this.changeStream = this.db.changes({
        since: 'now',
        live: true,
        include_docs: true,
        timeout: false,
        heartbeat: 10000,
      });

      this.changeStream.on('change', this.handleChange.bind(this));
      this.changeStream.on('error', this.handleError.bind(this));
      
      this.isListening = true;
      console.log('DatabaseEventManager: Started listening for changes');
    } catch (error) {
      console.error('DatabaseEventManager: Failed to start listening:', error);
    }
  }

  /**
   * Stop listening for database changes
   */
  stopListening(): void {
    if (this.changeStream) {
      try {
        this.changeStream.cancel();
      } catch (error) {
        console.error('DatabaseEventManager: Error stopping change stream:', error);
      }
      this.changeStream = undefined;
    }
    this.isListening = false;
    this.removeAllListeners();
    console.log('DatabaseEventManager: Stopped listening for changes');
  }

  /**
   * Handle a database change event
   */
  private handleChange(change: DatabaseChange): void {
    try {
      const documentType = this.getDocumentType(change.id);
      
      if (documentType === 'unknown') return;

      const changeType: 'created' | 'updated' | 'deleted' = change.deleted
        ? 'deleted'
        : change.changes.length === 1 && change.changes[0].rev.startsWith('1-')
        ? 'created'
        : 'updated';

      const event: DocumentChangeEvent = {
        type: changeType,
        documentType,
        document: change.doc,
        id: change.id,
      };

      // Emit specific document type events
      this.emit(documentType, event);
      this.emit('change', event);
      
      console.log(`DatabaseEventManager: ${changeType} ${documentType}:`, change.id);
    } catch (error) {
      console.error('DatabaseEventManager: Error handling change:', error);
    }
  }

  /**
   * Handle change stream errors
   */
  private handleError(error: any): void {
    console.error('DatabaseEventManager: Change stream error:', error);
    
    // Try to restart after a delay if it's a connection error
    if (error.name === 'RequestError' || error.code === 'ECONNREFUSED') {
      setTimeout(() => {
        if (!this.isListening) {
          this.startListening();
        }
      }, 5000);
    }
  }

  /**
   * Determine document type from document ID
   */
  private getDocumentType(docId: string): string {
    if (docId === 'user') return 'user';
    if (docId === 'settings') return 'settings';
    if (docId.startsWith('account::')) return 'account';
    if (docId.startsWith('category::')) return 'category';
    if (docId.startsWith('txn::')) return 'transaction';
    if (docId.startsWith('line::')) return 'transaction-line';
    return 'unknown';
  }

  /**
   * Subscribe to changes for a specific document type
   */
  onDocumentChange(documentType: string, listener: DatabaseChangeListener): () => void {
    this.on(documentType, listener);
    
    // Return unsubscribe function
    return () => {
      this.off(documentType, listener);
    };
  }

  /**
   * Subscribe to all document changes
   */
  onAnyChange(listener: DatabaseChangeListener): () => void {
    this.on('change', listener);
    
    // Return unsubscribe function
    return () => {
      this.off('change', listener);
    };
  }

  /**
   * Get current listening status
   */
  get listening(): boolean {
    return this.isListening;
  }
}

/**
 * Global event manager instance cache per database
 */
const eventManagers = new WeakMap<any, DatabaseEventManager>();

/**
 * Get or create event manager for a database instance
 */
export function getDatabaseEventManager(db: any): DatabaseEventManager {
  if (!eventManagers.has(db)) {
    const manager = new DatabaseEventManager(db);
    eventManagers.set(db, manager);
  }
  
  return eventManagers.get(db)!;
}