# unofficial-ld-node-client-sdk

A modern, plugin-enabled LaunchDarkly client-side SDK for Node.js with full observability support.

## Features

- ✅ Client-side only (uses client-side ID, no server SDK keys)
- ✅ Plugin system for extensibility
- ✅ Hook support for evaluations, identifies, and events
- ✅ Filesystem-based flag cache
- ✅ TLS/HTTPS support
- ✅ Custom logger support
- ✅ EventSource streaming support
- ✅ Full TypeScript support

## Installation

```bash
npm install unofficial-ld-node-client-sdk
```

## Quick Start

```typescript
import { init } from 'unofficial-ld-node-client-sdk';

const client = init('your-client-side-id', {
  kind: 'user',
  key: 'user-123',
  name: 'John Doe',
});

// Wait for the client to be ready
await client.waitForInitialization();

// Evaluate a flag
const showNewFeature = client.variation('new-feature-flag', false);

if (showNewFeature) {
  console.log('New feature is enabled!');
}

// Track events
client.track('user-action', { action: 'button-click' });

// Identify a new user
await client.identify({
  kind: 'user',
  key: 'user-456',
  name: 'Jane Smith',
});

// Close the client
await client.close();
```

## Configuration

```typescript
import { init } from 'unofficial-ld-node-client-sdk';

const client = init('client-side-id', context, {
  // Cache flags locally in this directory
  storagePath: '/tmp/ld-cache',

  // TLS/HTTPS configuration
  tlsParams: {
    ca: '/path/to/ca.pem',
    cert: '/path/to/cert.pem',
    key: '/path/to/key.pem',
    rejectUnauthorized: true,
  },

  // Custom logger
  logger: {
    debug: (msg) => console.debug(msg),
    info: (msg) => console.info(msg),
    warn: (msg) => console.warn(msg),
    error: (msg) => console.error(msg),
  },

  // Start in offline mode (for testing)
  offline: true,

  // Standard LaunchDarkly options from @launchdarkly/js-client-sdk-common
  maxCachedContexts: 5,
  diagnosticOptOut: false,
});
```

## Plugin System

You can extend the SDK with plugins:

```typescript
import { init } from 'unofficial-ld-node-client-sdk';
import { Observability } from '@unguibus/ld-observability-node-client';

const client = init('client-side-id', context, {
  plugins: [
    new Observability({
      serviceName: 'my-app',
      environment: 'production',
    }),
  ],
});
```

## Hooks

Plugins can hook into flag evaluations, identifications, and event tracking:

```typescript
const myPlugin = {
  getMetadata: () => ({ name: 'my-plugin' }),
  
  register: (client, metadata) => {
    console.log('Registered with client-side ID:', metadata.clientSideId);
  },
  
  getHooks: () => [{
    getMetadata: () => ({ name: 'my-hook' }),
    
    beforeEvaluation: (context, data) => {
      console.log('About to evaluate:', data.key);
      return data;
    },
    
    afterEvaluation: (context, data, detail) => {
      console.log('Evaluated:', data.key, '=', detail.value);
      return data;
    },
    
    beforeIdentify: (context, data) => {
      console.log('Identifying user:', data.key);
      return data;
    },
    
    afterIdentify: (context, data, result) => {
      console.log('Identified user:', data.key);
      return data;
    },
    
    afterTrack: (context) => {
      console.log('Tracked event:', context.eventKey);
    },
  }],
};

const client = init('client-side-id', context, {
  plugins: [myPlugin],
});
```

## API

### `init(clientSideId, context, options?): LDClient`

Initialize a new LaunchDarkly client.

**Parameters:**
- `clientSideId` (string): Your LaunchDarkly client-side ID
- `context` (LDContext): The initial user context
- `options` (LDOptions): Optional configuration

**Returns:** An LDClient instance

### `client.variation(flagKey, fallback): any`

Get the value of a flag for the current context.

### `client.track(eventKey, data?, metricValue?): void`

Track a custom event.

### `client.identify(newContext): Promise<void>`

Identify as a different user or update the current context.

### `client.waitForInitialization(): Promise<void>`

Wait for the client to finish initialization and streaming connection.

### `client.close(): Promise<void>`

Close the client and clean up resources.

### `client.on(event, listener): void`

Listen to client events:
- `ready` - Client finished initialization
- `change` - A flag value changed for the current context
- `change:{flagKey}` - A specific flag changed
- `error` - An error occurred

## Storage

Flags are cached locally in `~/.launchdarkly/` by default. You can customize this:

```typescript
const client = init('client-side-id', context, {
  storagePath: '/custom/path',
});
```

The SDK uses JSON files to store flag state, keyed by environment and context hash.

## Testing

```bash
npm test
npm test:watch  # Watch mode
npm run coverage  # Coverage report
```

## License

MIT
