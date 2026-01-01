import 'fake-indexeddb/auto';
import { beforeEach } from 'vitest';

// Reset IndexedDB before each test
beforeEach(() => {
  // Clear all databases
  if (typeof indexedDB !== 'undefined') {
    const dbs = indexedDB.databases ? indexedDB.databases() : Promise.resolve([]);
    dbs.then((databases) => {
      databases.forEach((db) => {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      });
    });
  }
});
