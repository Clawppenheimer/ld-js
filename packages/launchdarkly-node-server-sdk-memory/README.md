# In-Memory Feature Store for LaunchDarkly Node SDK

A simple, in-memory implementation of the LaunchDarkly feature store interface for the Node.js server SDK.

## Overview

This package provides `InMemoryFeatureStore`, a persistence layer for the LaunchDarkly Node.js server SDK that stores feature flags in memory. It's useful for:

- **Testing** - No external dependencies, fast, isolated
- **Development** - Quick iteration without database setup
- **Single-instance apps** - When you don't need distributed caching

## Installation

```bash
npm install launchdarkly-node-server-sdk-memory @launchdarkly/node-server-sdk
```

## Quick Start

```typescript
import { init } from '@launchdarkly/node-server-sdk';
import { createInMemoryStore } from 'launchdarkly-node-server-sdk-memory';

const store = createInMemoryStore();
const client = init('sdk-key', {
  featureStore: store,
});

await client.waitForInitialization();
const flag = client.variation('flag-key', context, false);
```

## API

### `InMemoryFeatureStore`

Implements the `LDFeatureStore` interface with the following methods:

#### `all(kind, callback)`
Retrieves all items of a given kind (excluding deleted items).

#### `get(kind, key, callback)`
Retrieves a single item by kind and key. Returns `undefined` if not found or deleted.

#### `upsert(kind, item, callback)`
Adds or updates an item with version-based conflict resolution. Only replaces if incoming version > stored version.

#### `delete(kind, key, version, callback)`
Soft deletes an item by marking it as `deleted: true`. Only deletes if incoming version > stored version.

#### `init(allData, callback)`
Initializes the store, completely replacing existing data.

#### `initialized(callback)`
Checks whether the store has been populated with data.

#### `close()`
Cleanup method (no-op for in-memory store).

#### `getDescription()`
Returns `"In-memory feature store"`.

#### `getInitMetaData()`
Returns metadata about the store.

## Features

- ✅ **Full LDFeatureStore compliance** - Implements all required methods
- ✅ **Version conflict resolution** - Higher versions always win
- ✅ **Soft delete pattern** - Deleted items are excluded from queries
- ✅ **Multiple kinds** - Supports features, user segments, contexts, etc.
- ✅ **Synchronous callbacks** - Calls callbacks immediately (no `setImmediate`)
- ✅ **TypeScript support** - Full type definitions included

## Limitations

⚠️ This store is **not suitable for**:
- Multi-instance deployments (no persistence across restarts)
- High-traffic applications (not optimized for performance)
- Production use cases requiring data durability

For production, use `@launchdarkly/node-server-sdk-redis`, PostgreSQL, or other persistent stores.

## Testing

```bash
npm test
npm run test:watch
```

All 20+ tests pass, covering:
- CRUD operations
- Version conflict resolution
- Soft delete behavior
- Initialization
- Multiple kinds
- Edge cases

## License

Apache License 2.0
