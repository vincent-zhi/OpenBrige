const DB_NAME = 'openbrige';
const DB_VERSION = 1;

import type { BridgeSession, BridgeEvent } from '@openbrige/shared-types';

interface StoreSchema {
  name: string;
  keyPath: string;
  indexes?: { name: string; keyPath: string }[];
}

const STORES: StoreSchema[] = [
  { name: 'sessions', keyPath: 'id', indexes: [{ name: 'status', keyPath: 'status' }] },
  { name: 'events', keyPath: 'id', indexes: [{ name: 'sessionId', keyPath: 'sessionId' }, { name: 'seq', keyPath: 'seq' }] },
  { name: 'cards', keyPath: 'id', indexes: [{ name: 'sessionId', keyPath: 'sessionId' }] },
];

let dbInstance: IDBDatabase | null = null;

export async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store.name)) {
          const objectStore = db.createObjectStore(store.name, { keyPath: store.keyPath });
          if (store.indexes) {
            for (const idx of store.indexes) {
              objectStore.createIndex(idx.name, idx.keyPath);
            }
          }
        }
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function idbPut<T>(storeName: string, value: T): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function idbDelete(storeName: string, key: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbClear(storeName: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- High-level caching helpers ---

export async function cacheSessions(sessions: BridgeSession[]): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sessions', 'readwrite');
    const store = tx.objectStore('sessions');
    // Clear old data then write all new sessions
    store.clear();
    for (const session of sessions) {
      store.put(session);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedSessions(): Promise<BridgeSession[]> {
  return idbGetAll<BridgeSession>('sessions');
}

export async function cacheSessionEvents(sessionId: string, events: BridgeEvent[]): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('events', 'readwrite');
    const store = tx.objectStore('events');
    const index = store.index('sessionId');
    // Delete old events for this session
    const keysReq = index.getAllKeys(sessionId);
    keysReq.onsuccess = () => {
      for (const key of keysReq.result) {
        store.delete(key as IDBValidKey);
      }
      // Write new events
      for (const event of events) {
        store.put(event);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedSessionEvents(sessionId: string): Promise<BridgeEvent[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('events', 'readonly');
    const index = tx.objectStore('events').index('sessionId');
    const req = index.getAll(sessionId);
    req.onsuccess = () => resolve(req.result as BridgeEvent[]);
    req.onerror = () => reject(req.error);
  });
}
