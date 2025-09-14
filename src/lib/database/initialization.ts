/**
 * Database initialization and schema setup
 */

import { User, UserSettings } from "@/types/database";
import { REQUIRED_INDEXES, DESIGN_DOCS } from "./config";
import { dbLogger } from "@/lib/utils/logger";

// Type for PouchDB constructor
type PouchDBConstructor = new (name: string, options?: Record<string, unknown>) => PouchDBInstance;

// Basic PouchDB instance interface
interface PouchDBInstance {
  createIndex(indexDef: unknown): Promise<unknown>;
  put(doc: unknown): Promise<unknown>;
  get(id: string): Promise<Record<string, unknown>>;
  upsert(id: string, updateFunc: (doc: Record<string, unknown>) => Record<string, unknown>): Promise<unknown>;
}

/**
 * Initialize PouchDB with plugins (lazy loading)
 */
export async function initializePouchDB(): Promise<PouchDBConstructor> {
  if (typeof window === "undefined") {
    throw new Error("PouchDB can only be used on the client side");
  }

  // Temporarily suppress PouchDB's deprecation warning for db.type()
  const originalWarn = console.warn;
  console.warn = function(...args: unknown[]) {
    const message = args.join(' ');
    if (!message.includes('db.type() is deprecated')) {
      originalWarn.apply(console, args);
    }
  };

  const PouchDBBrowser = (await import("pouchdb-browser")).default;
  const pouchdbFind = (await import("pouchdb-find")).default;
  const pouchdbUpsert = (await import("pouchdb-upsert")).default;

  const PouchDB = PouchDBBrowser.plugin(pouchdbFind).plugin(pouchdbUpsert);

  // Restore console.warn after a short delay to ensure all initialization warnings are caught
  setTimeout(() => {
    console.warn = originalWarn;
  }, 1000);

  return PouchDB as PouchDBConstructor;
}

/**
 * Initialize database schema (indexes and views)
 */
export async function initializeSchema(db: PouchDBInstance, userId: string): Promise<void> {
  try {
    // 1. Create indexes
    for (const indexDef of REQUIRED_INDEXES) {
      try {
        await db.createIndex(indexDef);
        dbLogger.debug(`Created index: ${indexDef.name}`);
      } catch (error: unknown) {
        // Ignore errors if index already exists
        if ((error as Record<string, unknown>).status !== 409) {
          dbLogger.warn(`Warning creating index ${indexDef.name}:`, error);
        }
      }
    }

    // 2. Create Map/Reduce views
    for (const [name, designDoc] of Object.entries(DESIGN_DOCS)) {
      try {
        await db.put(designDoc);
        dbLogger.debug(`Created design document: ${name}`);
      } catch (error: unknown) {
        // If already exists, attempt to update
        if ((error as Record<string, unknown>).status === 409) {
          try {
            const existing = await db.get(designDoc._id);
            await db.put({ ...designDoc, _rev: existing._rev });
            dbLogger.debug(`Updated design document: ${name}`);
          } catch (updateError) {
            dbLogger.warn(
              `Warning updating design document ${name}:`,
              updateError
            );
          }
        } else {
          dbLogger.warn(`Warning creating design document ${name}:`, error);
        }
      }
    }

    // 3. Create default documents
    await createDefaultDocuments(db, userId);

    dbLogger.debug("Schema initialization completed for user:", userId);
  } catch (error) {
    dbLogger.error("Error initializing schema:", error);
    throw error;
  }
}

/**
 * Create default documents for a new user
 */
async function createDefaultDocuments(
  db: PouchDBInstance,
  userId: string
): Promise<void> {
  const now = new Date().toISOString();

  // Default user document
  const defaultUser: User = {
    _id: "user",
    userId,
    email: "", // Will be filled when used
    displayName: "",
    homeCurrency: "USD",
    locale: "en-US",
    createdAt: now,
    updatedAt: now,
  };

  // Default settings
  const defaultSettings: UserSettings = {
    _id: "settings",
    requireGatePerSession: false,
    gateMethod: "none",
    gateDurationMin: 5,
    homeCurrency: "USD",
    decimalPlaces: 2,
    dateFormat: "MM/dd/yyyy",
    firstDayOfWeek: 1,
    defaultAccountView: "active",
    showBalance: true,
    compactMode: false,
    createdAt: now,
    updatedAt: now,
  };

  // Create documents if they don't exist
  try {
    await db.get("user");
  } catch (error: unknown) {
    if ((error as Record<string, unknown>).status === 404) {
      await db.put(defaultUser);
      dbLogger.debug("Created default user document");
    }
  }

  try {
    await db.get("settings");
  } catch (error: unknown) {
    if ((error as Record<string, unknown>).status === 404) {
      await db.put(defaultSettings);
      dbLogger.debug("Created default settings document");
    }
  }
}
