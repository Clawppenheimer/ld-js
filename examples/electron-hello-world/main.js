/**
 * Hello World Example: unofficial-ld-electron-sdk
 *
 * Electron desktop application demonstrating LaunchDarkly integration:
 * 1. Initialize LaunchDarkly client
 * 2. Create user context
 * 3. Evaluate feature flags
 * 4. Display flag values in UI
 * 5. Update UI in real-time when flags change
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { init } = require('unofficial-ld-node-client-sdk');

let mainWindow;
let ldClient;

// Flag configuration for the example
const FLAGS = {
  'dark-mode': { key: 'dark-mode', default: false },
  'new-ui': { key: 'new-ui', default: false },
  'beta-features': { key: 'beta-features', default: false },
  'analytics-enabled': { key: 'analytics-enabled', default: true },
};

/**
 * Create the main Electron window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Initialize LaunchDarkly client
 */
async function initializeLDClient() {
  const clientSideId = 'YOUR_CLIENT_SIDE_ID';

  const userContext = {
    kind: 'user',
    key: 'electron-user-123',
    name: 'Desktop App User',
    email: 'desktop@example.com',
  };

  console.log('🚀 Initializing LaunchDarkly client...');
  ldClient = init(clientSideId, userContext);

  try {
    await ldClient.waitForInitialization();
    console.log('✅ LaunchDarkly client initialized');

    // Send initial flag values to renderer
    const flagValues = evaluateAllFlags();
    mainWindow.webContents.send('flags-updated', flagValues);

    // Listen for flag changes
    ldClient.on('change', (context) => {
      console.log('🔄 Flag updated');
      const flagValues = evaluateAllFlags();
      mainWindow.webContents.send('flags-updated', flagValues);
    });
  } catch (error) {
    console.error('❌ Failed to initialize LaunchDarkly:', error);
  }
}

/**
 * Evaluate all feature flags
 */
function evaluateAllFlags() {
  const flagValues = {};

  for (const [key, config] of Object.entries(FLAGS)) {
    flagValues[key] = ldClient.variation(config.key, config.default);
  }

  return flagValues;
}

/**
 * Handle IPC requests from renderer
 */
ipcMain.handle('get-flags', () => {
  return evaluateAllFlags();
});

ipcMain.handle('track-event', (event, eventKey, data) => {
  if (ldClient) {
    ldClient.track(eventKey, data);
    console.log(`📈 Event tracked: ${eventKey}`);
  }
});

ipcMain.handle('identify-user', async (event, newUserContext) => {
  if (ldClient) {
    await ldClient.identify(newUserContext);
    console.log(`👤 User identified: ${newUserContext.key}`);
    const flagValues = evaluateAllFlags();
    mainWindow.webContents.send('flags-updated', flagValues);
    return flagValues;
  }
});

/**
 * App event handlers
 */
app.on('ready', async () => {
  createWindow();
  await initializeLDClient();
});

app.on('window-all-closed', async () => {
  if (ldClient) {
    await ldClient.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  if (ldClient) {
    await ldClient.close();
  }
  app.quit();
});
