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
interface FeatureStoreItem {
    key: string;
    version: number;
    deleted?: boolean;
    [key: string]: unknown;
}
/**
 * Collection of feature store items organized by kind.
 */
type FeatureStoreDataStorage = Record<string, Record<string, FeatureStoreItem>>;
/**
 * Kind descriptor (namespace for feature flags, user segments, contexts, etc.)
 */
interface Kind {
    namespace: string;
}
/**
 * In-memory feature store implementation.
 *
 * Implements the LDFeatureStore interface with a plain JavaScript object
 * as the backing storage.
 */
declare class InMemoryFeatureStore {
    private store;
    private isInitialized;
    /**
     * Retrieves all items of a given kind, excluding deleted items.
     */
    all(kind: Kind, callback: (items: Record<string, FeatureStoreItem>) => void): void;
    /**
     * Retrieves a single item by kind and key.
     * Returns undefined if the item doesn't exist or is deleted.
     */
    get(kind: Kind, key: string, callback: (item: FeatureStoreItem | undefined) => void): void;
    /**
     * Adds or updates an item, with version-based conflict resolution.
     * Items with higher versions always replace lower versions.
     */
    upsert(kind: Kind, data: FeatureStoreItem, callback: () => void): void;
    /**
     * Soft deletes an item by version number.
     * Deleted items are marked with deleted: true and excluded from queries.
     */
    delete(kind: Kind, key: string, version: number, callback: () => void): void;
    /**
     * Initializes the store with complete data, overwriting existing data.
     */
    init(allData: FeatureStoreDataStorage, callback: () => void, _initMetadata?: Record<string, unknown>): void;
    /**
     * Checks if the store has been initialized.
     */
    initialized(callback: (isInitialized: boolean) => void): void;
    /**
     * Closes the store and releases resources.
     * For in-memory store, this is a no-op.
     */
    close(): void;
    /**
     * Returns a description of this store.
     */
    getDescription(): string;
    /**
     * Returns initialization metadata.
     */
    getInitMetaData(): Record<string, unknown>;
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
declare function createInMemoryStore(): InMemoryFeatureStore;

export { type FeatureStoreDataStorage, type FeatureStoreItem, InMemoryFeatureStore, type Kind, createInMemoryStore, createInMemoryStore as default };
