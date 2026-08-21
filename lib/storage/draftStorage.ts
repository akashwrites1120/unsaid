/**
 * Draft Storage
 * IndexedDB-based local persistence for writing drafts plus the shared
 * sessionStorage contract between setup → challenge → results pages.
 *
 * Writing content is never deleted here — drafts survive failure, refresh,
 * and navigation (NFR-2).
 */

import type { CategoryKey, ChallengeModeKey } from '@/lib/config';

export type DraftStatus = 'draft' | 'published' | 'failed' | 'completed';

export interface Draft {
  id: string;
  topic: string;
  content: string;
  mode: ChallengeModeKey;
  category: CategoryKey;
  wordCount: number;
  elapsedTime: number;
  updatedAt: number;
  status: DraftStatus;
}

/**
 * The live session blob shared across the write flow via sessionStorage.
 * `elapsedMs` is accumulated active time; results reads it for stats.
 */
export interface WritingSession {
  topic: string;
  mode: ChallengeModeKey;
  category: CategoryKey;
  startedAt: number;
  elapsedMs: number;
  content: string;
  wordCount: number;
  longestStreakMs: number;
  status: 'writing' | 'completed' | 'failed';
}

const SESSION_KEY = 'writing-session';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open('write-or-lose', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('drafts')) {
        const store = db.createObjectStore('drafts', { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
  });

  return dbPromise;
}

/** Save a draft to IndexedDB. */
export async function saveDraft(draft: Omit<Draft, 'updatedAt'>): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('drafts', 'readwrite');
    const request = transaction.objectStore('drafts').put({ ...draft, updatedAt: Date.now() });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/** Get a draft by ID. */
export async function getDraft(id: string): Promise<Draft | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction('drafts', 'readonly').objectStore('drafts').get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

/** All drafts, most recent first. */
export async function getAllDrafts(): Promise<Draft[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const index = db.transaction('drafts', 'readonly').objectStore('drafts').index('updatedAt');
    const request = index.getAll();
    request.onsuccess = () => {
      const drafts = (request.result as Draft[]) ?? [];
      drafts.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(drafts);
    };
    request.onerror = () => reject(request.error);
  });
}

/** Delete a draft by ID. */
export async function deleteDraft(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction('drafts', 'readwrite').objectStore('drafts').delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/** Create a debounced autosave function. */
export function createDebouncedSave(
  getDraftData: () => Omit<Draft, 'updatedAt'> | null,
  delayMs = 1500
): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const draftData = getDraftData();
      if (draftData) {
        saveDraft(draftData).catch((error) => {
          console.error('Failed to save draft:', error);
        });
      }
    }, delayMs);
  };
}

/** Persist the live session blob (called on every meaningful change). */
export function saveSessionToStorage(session: WritingSession): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to save session:', error);
  }
}

/** Read the live session blob, or null when absent/corrupt. */
export function loadSessionFromStorage(): WritingSession | null {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    return saved ? (JSON.parse(saved) as WritingSession) : null;
  } catch (error) {
    console.error('Failed to load session:', error);
    return null;
  }
}

/** Remove the session blob (after publishing or abandoning). */
export function clearSessionFromStorage(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error('Failed to clear session:', error);
  }
}
