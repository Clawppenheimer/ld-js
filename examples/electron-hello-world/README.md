# Electron Hello World Example

A desktop application demonstrating LaunchDarkly integration with Electron.

## Features

- ✅ LaunchDarkly client initialization
- ✅ Feature flag evaluation
- ✅ Real-time flag updates in UI
- ✅ Event tracking
- ✅ User context switching
- ✅ Beautiful UI with flag table
- ✅ Event logging

## Prerequisites

- Node.js 18.0.0 or higher
- A LaunchDarkly client-side ID (get one at [LaunchDarkly](https://launchdarkly.com))

## Installation

```bash
npm install
```

## Setup

Before running the example, update `main.js` with your client-side ID:

```javascript
const clientSideId = 'YOUR_CLIENT_SIDE_ID';
```

## Running the Example

```bash
npm start
```

Or in development mode with debugging:

```bash
npm run dev
```

## Features Demonstrated

### Flag Evaluation

The app displays 4 sample feature flags:
- `dark-mode` - Boolean flag for theme
- `new-ui` - Boolean flag for new interface
- `beta-features` - Boolean flag for beta access
- `analytics-enabled` - Boolean flag for analytics

### Real-Time Updates

When flags change in LaunchDarkly, the UI updates automatically showing the new values.

### Event Tracking

Click the "Track Event" button to send a custom event to LaunchDarkly.

### User Identification

Click the "Identify User" button to switch to a different user and see how flag values change based on targeting rules.

## Architecture

- **Main Process** (`main.js`) - Initializes LaunchDarkly client, handles flag evaluation, manages IPC
- **Renderer Process** (`index.html`, inline JavaScript) - Displays UI, handles user interactions
- **Preload Script** (`preload.js`) - Provides secure IPC communication

## API Usage

### In Main Process

```javascript
import { init } from 'unofficial-ld-node-client-sdk';

const client = init(clientSideId, userContext);
const flagValue = client.variation('flag-key', defaultValue);
```

### IPC Communication

```javascript
// From renderer to main
await ipcRenderer.invoke('get-flags');
await ipcRenderer.invoke('track-event', eventKey, data);
await ipcRenderer.invoke('identify-user', userContext);

// From main to renderer
mainWindow.webContents.send('flags-updated', flagValues);
```

## Documentation

For more information, see the [unofficial-ld-node-client-sdk README](../../packages/unofficial-ld-node-client-sdk/README.md).

## Note

This example uses the Node.js SDK in an Electron context. For future versions, consider using a dedicated `unofficial-ld-electron-sdk` built specifically for Electron's renderer process and main process patterns.
