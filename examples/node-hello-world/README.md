# Node.js Hello World Example

A simple console application demonstrating the `unofficial-ld-node-client-sdk`.

## Features

- ✅ Client initialization
- ✅ User context creation
- ✅ Feature flag evaluation
- ✅ Custom event tracking
- ✅ User identification
- ✅ Proper resource cleanup

## Prerequisites

- Node.js 18.0.0 or higher
- A LaunchDarkly client-side ID (get one at [LaunchDarkly](https://launchdarkly.com))

## Installation

```bash
npm install
```

## Setup

Before running the example, update `index.js` with your client-side ID:

```javascript
const clientSideId = 'YOUR_CLIENT_SIDE_ID';
```

## Running the Example

```bash
npm start
```

## Output

The example will:
1. Initialize the LaunchDarkly client
2. Wait for the client to connect and fetch flags
3. Evaluate 4 different feature flags
4. Track a custom event
5. Identify as a different user
6. Evaluate flags again for the new user
7. Clean up and exit

## API Usage

### Initialize Client

```javascript
import { init } from 'unofficial-ld-node-client-sdk';

const client = init(clientSideId, userContext);
```

### Evaluate Flag

```javascript
const value = client.variation('flag-key', defaultValue);
```

### Track Event

```javascript
client.track('event-key', data);
```

### Identify User

```javascript
await client.identify(newUserContext);
```

### Close Client

```javascript
await client.close();
```

## Documentation

For more information, see the [unofficial-ld-node-client-sdk README](../../packages/unofficial-ld-node-client-sdk/README.md).
