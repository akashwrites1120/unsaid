/**
 * Draft Storage
 * IndexedDB-based local persistence for writing drafts.
 * Provides debounced autosave and session restoration.
 */

const DB_NAME = 'write-or-lose';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';

interface Draft {
  id: string;
  topic: string;
  content: string;
  mode: string;
  wordCount: number;
  elapsedTime: number;
  updatedAt: number;
  status: 'draft' | 'published' | 'failed' | 'completed';
}

export interface SessionData {
  topic: string;
  mode: string;
  category: string;
  startTime: number;
  content: string;
}

interface Draft {
  id: string;
  topic: string;
  content: string;
  mode: string;
  wordCount: number;
  elapsedTime: number;
  updatedAt: number;
  status: 'draft' | 'published' | 'failed' | 'completed';
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
  });

  return dbPromise;
}

/**
 * Save a draft to IndexedDB
 */
export async function saveDraft(draft: Omit<Draft, 'updatedAt'>): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({
      ...draft,
      updatedAt: Date.now(),
    });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a draft by ID
 */
export async function getDraft(id: string): Promise<Draft | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all drafts, sorted by most recent first
 */
export async function getAllDrafts(): Promise<Draft[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('updatedAt');
    const request = index.getAll();
    request.onsuccess = () => {
      const drafts = request.result || [];
      // Sort by most recent first
      drafts.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(drafts);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a draft
 */
export async function deleteDraft(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all drafts
 */
export async function clearAllDrafts(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Create a debounced save function
 */
export function createDebouncedSave(
  getDraftData: () => Omit<Draft, 'updatedAt'> | null,
  delayMs: number = 2000
): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(async () => {
      const draftData = getDraftData();
      if (draftData) {
        try {
          await saveDraft(draftData);
        } catch (error) {
          console.error('Failed to save draft:', error);
        }
      }
    }, delayMs);
  };
}

/**
 * Save current session to sessionStorage (for immediate restore on refresh)
 */
export function saveSessionToStorage(session: SessionData): void {
  try {
    sessionStorage.setItem('writing-session', JSON.stringify(session));
  } catch (error) {
    console.error('Failed to save session:', error);
  }
}

/**
 * Load session from sessionStorage
 */
export function loadSessionFromStorage(): SessionData | null {
  try {
    const saved = sessionStorage.getItem('writing-session');
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Failed to load session:', error);
    return null;
  }
}

/**
 * Clear session from sessionStorage
 */
export function clearSessionFromStorage(): void {
  try {
    sessionStorage.removeItem('writing-session');
  } catch (error) {
    console.error('Failed to clear session:', error);
  }
}