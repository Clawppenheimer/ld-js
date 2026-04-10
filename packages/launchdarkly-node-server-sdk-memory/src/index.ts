/**
 * In-memory feature store for LaunchDarkly Node.js server SDK.
 *
 * Implements the LDFeatureStore interface with a plain JavaScript object
 * as the backing storage. Suitable for testing, development, and single-instance
 * applications. Not recommended for multi-instance or production deployments
 * that require persistence.
 */

/**
 * Feature store item with version tracking and soft delete support.
 */
export interface FeatureStoreItem {
  key: string;
  version: number;
  deleted?: boolean;
  [key: string]: unknown;
}

/**
 * Collection of feature store items organized by kind.
 */
export type FeatureStoreDataStorage = Record<string, Record<string, FeatureStoreItem>>;

/**
 * Kind descriptor (namespace for feature flags, user segments, contexts, etc.)
 */
export interface Kind {
  namespace: string;
}

/**
 * In-memory feature store implementation.
 *
 * Implements the LDFeatureStore interface with a plain JavaScript object
 * as the backing storage.
 */
export class InMemoryFeatureStore {
  private store: FeatureStoreDataStorage = {};
  private isInitialized = false;

  /**
   * Retrieves all items of a given kind, excluding deleted items.
   */
  all(
    kind: Kind,
    callback: (items: Record<string, FeatureStoreItem>) => void,
  ): void {
    const kindData = this.store[kind.namespace] || {};
    const result: Record<string, FeatureStoreItem> = {};

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
  get(
    kind: Kind,
    key: string,
    callback: (item: FeatureStoreItem | undefined) => void,
  ): void {
    const kindData = this.store[kind.namespace];
    if (!kindData) {
      callback(undefined);
      return;
    }

    const item = kindData[key];
    if (!item || item.deleted) {
      callback(undefined);
      return;
    }

    callback(item);
  }

  /**
   * Adds or updates an item, with version-based conflict resolution.
   * Items with higher versions always replace lower versions.
   */
  upsert(
    kind: Kind,
    data: FeatureStoreItem,
    callback: () => void,
  ): void {
    if (!this.store[kind.namespace]) {
      this.store[kind.namespace] = {};
    }

    const kindData = this.store[kind.namespace]!;
    const existing = kindData[data.key];

    // Only upsert if incoming version is greater than existing version
    if (!existing || !existing.version || data.version > existing.version) {
      kindData[data.key] = data;
    }

    callback();
  }

  /**
   * Soft deletes an item by version number.
   * Deleted items are marked with deleted: true and excluded from queries.
   */
  delete(
    kind: Kind,
    key: string,
    version: number,
    callback: () => void,
  ): void {
    if (!this.store[kind.namespace]) {
      this.store[kind.namespace] = {};
    }

    const kindData = this.store[kind.namespace]!;
    const existing = kindData[key];

    // Only delete if incoming version is greater than existing version
    if (!existing || !existing.version || version > existing.version) {
      kindData[key] = {
        key,
        version,
        deleted: true,
      };
    }

    callback();
  }

  /**
   * Initializes the store with complete data, overwriting existing data.
   */
  init(
    allData: FeatureStoreDataStorage,
    callback: () => void,
    _initMetadata?: Record<string, unknown>,
  ): void {
    this.store = JSON.parse(JSON.stringify(allData));
    this.isInitialized = true;
    callback();
  }

  /**
   * Checks if the store has been initialized.
   */
  initialized(callback: (isInitialized: boolean) => void): void {
    callback(this.isInitialized);
  }

  /**
   * Closes the store and releases resources.
   * For in-memory store, this is a no-op.
   */
  close(): void {
    // No-op for in-memory store
  }

  /**
   * Returns a description of this store.
   */
  getDescription(): string {
    return 'In-memory feature store';
  }

  /**
   * Returns initialization metadata.
   */
  getInitMetaData(): Record<string, unknown> {
    return {
      version: 1,
      type: 'in-memory',
    };
  }
}

/**
 * Factory function to create an in-memory feature store.
 *
 * @returns A new InMemoryFeatureStore instance
 *
 * @example
 * ```typescript
 * import { createInMemoryStore } from 'launchdarkly-node-server-sdk-memory';
 * import { init } from '@launchdarkly/node-server-sdk';
 *
 * const store = createInMemoryStore();
 * const client = init('sdk-key', {
 *   featureStore: store,
 * });
 * ```
 */
export function createInMemoryStore(): InMemoryFeatureStore {
  return new InMemoryFeatureStore();
}

export default createInMemoryStore;
