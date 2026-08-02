/**
 * IndexedDB Cache Manager for IRMS Web App
 * Provides 0ms instant offline/startup hydration and delta upserts.
 */

const DB_NAME = 'IRMS_IndexedDB_Cache';
const DB_VERSION = 3;

class CacheManager {
  constructor() {
    this.db = null;
    this.initPromise = null;
  }

  async init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB is not supported in this environment. Falling back to in-memory/localStorage.');
        resolve(false);
        return;
      }

      const openDb = (version) => {
        const req = version ? indexedDB.open(DB_NAME, version) : indexedDB.open(DB_NAME);

        req.onupgradeneeded = (event) => {
          const db = event.target.result;

          const stores = [
            { name: 'requests', keyPath: 'ticketId' },
            { name: 'pickingTasks', keyPath: 'pickingId' },
            { name: 'lostAndFound', keyPath: 'ticketId' },
            { name: 'soh', keyPath: 'id' },
            { name: 'stockMovements', keyPath: 'movementId' },
            { name: 'skusDb', keyPath: 'sku_number' },
            { name: 'racks', keyPath: 'locationName' },
            { name: 'zones', keyPath: 'zone' },
            { name: 'checkerLines', keyPath: 'lineName' },
            { name: 'putaway', keyPath: 'ticketId' },
            { name: 'soData', keyPath: 'id' },
            { name: 'stockActivity', keyPath: 'activityId' },
            { name: 'syncMetadata', keyPath: 'storeName' }
          ];

          stores.forEach(s => {
            if (!db.objectStoreNames.contains(s.name)) {
              db.createObjectStore(s.name, { keyPath: s.keyPath });
            }
          });
        };

        req.onsuccess = (event) => {
          this.db = event.target.result;
          resolve(true);
        };

        req.onerror = (event) => {
          const err = event.target.error;
          if (err && err.name === 'VersionError' && version) {
            console.warn(`IndexedDB VersionError for requested version ${version}. Falling back to current version open...`);
            openDb(null);
            return;
          }
          console.error('IndexedDB open error:', err);
          resolve(false);
        };
      };

      openDb(DB_VERSION);
    });

    return this.initPromise;
  }

  async getStore(storeName) {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch (e) {
        console.error(`Error reading IndexedDB store "${storeName}":`, e);
        resolve([]);
      }
    });
  }

  async setStore(storeName, records) {
    await this.init();
    if (!this.db || !Array.isArray(records)) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.clear();
        records.forEach(item => {
          if (item) store.put(item);
        });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        console.error(`Error writing IndexedDB store "${storeName}":`, e);
        resolve(false);
      }
    });
  }

  async upsertRecords(storeName, records) {
    await this.init();
    if (!this.db || !Array.isArray(records) || records.length === 0) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        records.forEach(item => {
          if (item) store.put(item);
        });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        console.error(`Error upserting IndexedDB store "${storeName}":`, e);
        resolve(false);
      }
    });
  }

  async getLastSyncTime(storeName) {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction('syncMetadata', 'readonly');
        const store = tx.objectStore('syncMetadata');
        const req = store.get(storeName);
        req.onsuccess = () => resolve(req.result ? req.result.lastSyncTime : null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  async setLastSyncTime(storeName, timestampStr) {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction('syncMetadata', 'readwrite');
        const store = tx.objectStore('syncMetadata');
        store.put({ storeName, lastSyncTime: timestampStr || new Date().toISOString() });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  async clearAll() {
    await this.init();
    if (!this.db) return true;

    const storeNames = Array.from(this.db.objectStoreNames);
    if (storeNames.length === 0) return true;

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(storeNames, 'readwrite');
        storeNames.forEach(name => tx.objectStore(name).clear());
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        console.error('Error clearing IndexedDB stores:', e);
        resolve(false);
      }
    });
  }
}

export const cacheManager = new CacheManager();
