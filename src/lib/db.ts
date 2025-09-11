// Lazy initialization of PouchDB (client-side only)
let preferencesDB: any = null;

async function getPreferencesDB(): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('PouchDB can only be used on the client side');
  }
  
  if (!preferencesDB) {
    const PouchDB = (await import('pouchdb-browser')).default;
    preferencesDB = new PouchDB('preferences');
  }
  
  return preferencesDB;
}

export interface Preferences {
  _id: string;
  _rev?: string;
  userId: string;
  themeMode: 'light' | 'dark' | 'auto';
}

// Create default preferences for a user
function createDefaultPreferences(userId: string): Preferences {
  return {
    _id: `user-${userId}`,
    userId,
    themeMode: 'auto'
  };
}

// Initialize user preferences (create if they don't exist)
export async function initializeUserPreferences(userId: string): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required to initialize preferences');
  }

  const docId = `user-${userId}`;
  
  try {
    const db = await getPreferencesDB();
    // Try to get existing preferences
    await db.get(docId);
    console.log('User preferences already exist for:', userId);
  } catch (error) {
    // If document doesn't exist, create it with defaults
    if ((error as any).status === 404) {
      try {
        const defaultPrefs = createDefaultPreferences(userId);
        const db = await getPreferencesDB();
        await db.put(defaultPrefs);
        console.log('Default preferences created for user:', userId);
      } catch (putError) {
        console.error('Error creating default preferences:', putError);
      }
    } else {
      console.error('Error checking preferences:', error);
    }
  }
}

// Get user preferences
export async function getUserPreferences(userId: string): Promise<Preferences> {
  if (!userId) {
    throw new Error('User ID is required to get preferences');
  }

  const docId = `user-${userId}`;
  
  try {
    const db = await getPreferencesDB();
    const doc = await db.get(docId) as Preferences;
    return doc;
  } catch (error) {
    if ((error as any).status === 404) {
      // Create default preferences if they don't exist
      const defaultPrefs = createDefaultPreferences(userId);
      const db = await getPreferencesDB();
      await db.put(defaultPrefs);
      return defaultPrefs;
    }
    console.error('Error getting preferences:', error);
    return createDefaultPreferences(userId);
  }
}

// Update user theme mode
export async function updateUserThemeMode(userId: string, themeMode: 'light' | 'dark' | 'auto'): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required to update theme mode');
  }

  const docId = `user-${userId}`;
  
  try {
    const db = await getPreferencesDB();
    const doc = await db.get(docId) as Preferences;
    const updatedDoc = {
      ...doc,
      themeMode
    };
    await db.put(updatedDoc);
    console.log('Theme mode updated to:', themeMode, 'for user:', userId);
  } catch (error) {
    console.error('Error updating theme mode:', error);
  }
}