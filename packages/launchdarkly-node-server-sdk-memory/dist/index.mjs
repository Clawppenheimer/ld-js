// src/index.ts
var InMemoryFeatureStore = class {
  constructor() {
    this.store = {};
    this.isInitialized = false;
  }
  /**
   * Retrieves all items of a given kind, excluding deleted items.
   */
  all(kind, callback) {
    const kindData = this.store[kind.namespace] || {};
    const result = {};
    for (const [key, item] of Object.entries(kindData)) {
      if (item && !item.deleted) {
        result[key] = item;
      }
    }
    callback(result);
  }
  /**
   * Retrieves a single item by kind and key.
   * Returns undefined if the item doesn't exist or is deleted.
   */
  get(kind, key, callback) {
    const kindData = this.store[kind.namespace];
    if (!kindData) {
      callback(void 0);
      return;
    }
    const item = kindData[key];
    if (!item || item.deleted) {
      callback(void 0);
      return;
    }
    callback(item);
  }
  /**
   * Adds or updates an item, with version-based conflict resolution.
   * Items with higher versions always replace lower versions.
   */
  upsert(kind, data, callback) {
    if (!this.store[kind.namespace]) {
      this.store[kind.namespace] = {};
    }
    const kindData = this.store[kind.namespace];
    const existing = kindData[data.key];
    if (!existing || !existing.version || data.version > existing.version) {
      kindData[data.key] = data;
    }
    callback();
  }
  /**
   * Soft deletes an item by version number.
   * Deleted items are marked with deleted: true and excluded from queries.
   */
  delete(kind, key, version, callback) {
    if (!this.store[kind.namespace]) {
      this.store[kind.namespace] = {};
    }
    const kindData = this.store[kind.namespace];
    const existing = kindData[key];
    if (!existing || !existing.version || version > existing.version) {
      kindData[key] = {
        key,
        version,
        deleted: true
      };
    }
    callback();
  }
  /**
   * Initializes the store with complete data, overwriting existing data.
   */
  init(allData, callback, _initMetadata) {
    this.store = JSON.parse(JSON.stringify(allData));
    this.isInitialized = true;
    callback();
  }
  /**
   * Checks if the store has been initialized.
   */
  initialized(callback) {
    callback(this.isInitialized);
  }
  /**
   * Closes the store and releases resources.
   * For in-memory store, this is a no-op.
   */
  close() {
  }
  /**
   * Returns a description of this store.
   */
  getDescription() {
    return "In-memory feature store";
  }
  /**
   * Returns initialization metadata.
   */
  getInitMetaData() {
    return {
      version: 1,
      type: "in-memory"
    };
  }
};
function createInMemoryStore() {
  return new InMemoryFeatureStore();
}
var index_default = createInMemoryStore;
export {
  InMemoryFeatureStore,
  createInMemoryStore,
  index_default as default
};
//# sourceMappingURL=index.mjs.map