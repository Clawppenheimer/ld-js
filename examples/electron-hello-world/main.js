/**
 * Hello World Example: unofficial-ld-electron-sdk
 *
 * Electron desktop application demonstrating LaunchDarkly integration:
 * 1. Initialize LaunchDarkly client (in renderer process)
 * 2. Create user context
 * 3. Evaluate feature flags
 * 4. Display flag values in UI
 * 5. Update UI in real-time when flags change
 *
 * NOTE: The SDK runs in the renderer process using browser APIs (Fetch, Crypto, localStorage)
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

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
 * NOTE: LaunchDarkly client initialization happens in the renderer process
 * This main process only facilitates IPC communication
 */

/**
 * Handle configuration requests from renderer
 */
ipcMain.handle('get-config', () => {
  return {
    environmentId: 'YOUR_ENVIRONMENT_ID',
    flags: FLAGS,
  };
});

/**
 * App event handlers
 */
app.on('ready', () => {
  createWindow();
  console.log('🚀 Electron app ready - LaunchDarkly client will initialize in renderer process');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
