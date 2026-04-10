# unofficial-ld-electron-sdk

Unofficial LaunchDarkly SDK for Electron applications.

## Status

🚀 Coming soon - v0.1.0

## Features (Planned)

- ✅ Client-side SDK for Electron renderer process
- ✅ Plugin system for extensibility
- ✅ Hook support for evaluations and events
- ✅ Real-time flag updates via streaming
- ✅ Storage persistence (localStorage, custom adapters)
- ✅ Full TypeScript support
- ✅ Observability/monitoring integration (OpenTelemetry)

## Installation

```bash
npm install unofficial-ld-electron-sdk
```

## Quick Start

```typescript
import { init } from 'unofficial-ld-electron-sdk';

const client = init('YOUR_ENVIRONMENT_ID', {
  kind: 'user',
  key: 'user-123',
  name: 'John Doe',
});

// Wait for initialization
await client.waitForInitialization();

// Evaluate a flag
const showFeature = client.variation('my-flag', false);

// Close the client
await client.close();
```

## Documentation

See the [examples](../../examples/electron-hello-world/) directory for complete working examples.

## License

Apache-2.0
