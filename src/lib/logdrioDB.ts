// User-specific LogdrioDBs with preferences document
let userDBs: Map<string, any> = new Map();

async function getUserDB(userEmail: string): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('PouchDB can only be used on the client side');
  }
  
  if (!userDBs.has(userEmail)) {
    const PouchDB = (await import('pouchdb-browser')).default;
    const dbName = `logdrio-${userEmail.replace(/[^a-z0-9]/gi, '_')}`;
    const db = new PouchDB(dbName);
    userDBs.set(userEmail, db);
  }
  
  return userDBs.get(userEmail);
}

export interface UserPreferences {
  _id: 'preferences';
  _rev?: string;
  // theme removed - now handled by next-themes + localStorage
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    desktop: boolean;
  };
  dateFormat: string;
  timeFormat: '12h' | '24h';
  createdAt: string;
  updatedAt: string;
}

const defaultPreferences: Omit<UserPreferences, '_rev'> = {
  _id: 'preferences',
  // theme removed - handled by next-themes
  language: 'es',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  notifications: {
    email: true,
    push: true,
    desktop: true,
  },
  dateFormat: 'dd/MM/yyyy',
  timeFormat: '24h',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Initialize user preferences document
export async function initializeUserPreferences(userEmail: string): Promise<void> {
  const db = await getUserDB(userEmail);
  
  try {
    // Check if preferences already exist
    await db.get('preferences');
    console.log('Preferences already exist for user:', userEmail);
  } catch (error) {
    if ((error as any).status === 404) {
      // Create preferences document
      await db.put(defaultPreferences);
      console.log('Created preferences for user:', userEmail);
    } else {
      throw error;
    }
  }
}

// Get user preferences
export async function getUserPreferences(userEmail: string): Promise<UserPreferences> {
  const db = await getUserDB(userEmail);
  
  try {
    return await db.get('preferences') as UserPreferences;
  } catch (error) {
    if ((error as any).status === 404) {
      // Create default preferences if they don't exist
      await initializeUserPreferences(userEmail);
      return await db.get('preferences') as UserPreferences;
    }
    throw error;
  }
}

// Update user preferences
export async function updateUserPreferences(
  userEmail: string,
  updates: Partial<Omit<UserPreferences, '_id' | 'createdAt'>>
): Promise<UserPreferences> {
  const db = await getUserDB(userEmail);
  
  try {
    const current = await getUserPreferences(userEmail);
    const updated: UserPreferences = {
      ...current,
      ...updates,
      _id: 'preferences',
      updatedAt: new Date().toISOString(),
    };
    
    await db.put(updated);
    return updated;
  } catch (error) {
    console.error('Error updating preferences for user:', userEmail, error);
    throw error;
  }
}

// Get user's LogdrioDB for other operations (logs, etc.)
export async function getLogdrioDBForUser(userEmail: string): Promise<any> {
  return await getUserDB(userEmail);
}

// Clear all data for a user (useful for logout/cleanup)
export async function clearUserData(userEmail: string): Promise<void> {
  try {
    const db = await getUserDB(userEmail);
    await db.destroy();
    userDBs.delete(userEmail);
    console.log('Cleared all data for user:', userEmail);
  } catch (error) {
    console.error('Error clearing data for user:', userEmail, error);
    throw error;
  }
}