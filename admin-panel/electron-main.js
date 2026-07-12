const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
const { autoUpdater } = require('electron-updater');

// Spawn the express server in the same process
try {
  require('./server/index.js');
} catch (err) {
  console.error("Failed to start embedded server:", err);
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'client/src/assets/logo.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    show: false // Don't show until ready
  });

  // Check if we are explicitly running with Vite dev server
  const useDevServer = process.env.VITE_DEV_SERVER === 'true';

  if (useDevServer) {
    // In dev mode, wait for Vite to start and load the local dev server
    mainWindow.loadURL('http://localhost:5173').catch(err => {
      console.log('Failed to load dev server, falling back to build...');
      mainWindow.loadFile(path.join(__dirname, 'client/dist/index.html'));
    });
    mainWindow.webContents.openDevTools();
  } else {
    // In production or default dev:electron run, load the built React app
    mainWindow.loadFile(path.join(__dirname, 'client/dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Check for updates if packaged
    if (app.isPackaged) {
      autoUpdater.checkForUpdatesAndNotify();
    }
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

// Auto Updater Events
autoUpdater.on('update-available', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Available',
    message: 'A new version is available. Downloading now...'
  });
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: 'Update downloaded. The application will restart to install the update.',
    buttons: ['Restart Now', 'Later']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on('error', (err) => {
  dialog.showErrorBox('Update Error', err == null ? "Unknown error" : (err.stack || err).toString());
});

autoUpdater.on('download-progress', (progressObj) => {
  let log_message = "Download speed: " + (progressObj.bytesPerSecond / 1024 / 1024).toFixed(2) + " MB/s";
  log_message = log_message + ' - Downloaded ' + progressObj.percent.toFixed(2) + '%';
  log_message = log_message + ' (' + (progressObj.transferred / 1024 / 1024).toFixed(2) + " MB / " + (progressObj.total / 1024 / 1024).toFixed(2) + " MB)";
  
  // Optionally, we could send this to the renderer window to show a progress bar.
  // For now, logging it in the terminal.
  console.log(log_message);
});
