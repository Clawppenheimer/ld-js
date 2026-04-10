"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  InMemoryFeatureStore: () => InMemoryFeatureStore,
  createInMemoryStore: () => createInMemoryStore,
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  InMemoryFeatureStore,
  createInMemoryStore
});
//# sourceMappingURL=index.js.map