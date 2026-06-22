const { app, BrowserWindow, screen, session, ipcMain, shell } = require('electron');
const serve = require('electron-serve');
const path = require('path');

// Register custom protocol client
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('master-typing-pro', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('master-typing-pro');
}

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  return;
}

// Configure electron-serve to serve the Next.js static export
const appServe = app.isPackaged ? serve({directory: path.join(__dirname, 'out')}) : serve({directory: path.join(__dirname, 'out')});

let mainWindow;
let deepLinkToken = null;

function handleDeepLinkUrl(urlStr) {
  try {
    const parsedUrl = new URL(urlStr);
    const host = parsedUrl.hostname || parsedUrl.pathname.replace(/^\/\//, '').split('/')[0];
    if (host === 'auth') {
      const token = parsedUrl.searchParams.get('token');
      if (token) {
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('auth-deep-link', token);
        } else {
          deepLinkToken = token;
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse deep link URL:', e);
  }
}

// Handle second instance startup with deep link args
app.on('second-instance', (event, commandLine) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
  
  const url = commandLine.find(arg => arg.startsWith('master-typing-pro://'));
  if (url) {
    handleDeepLinkUrl(url);
  }
});

// Check startup args for deep link URL
const startupUrl = process.argv.find(arg => arg.startsWith('master-typing-pro://'));
if (startupUrl) {
  handleDeepLinkUrl(startupUrl);
}

function createWindow() {
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
  const targetW = 1920;
  const targetH = 1080;

  const winW = Math.min(targetW, screenW);
  const winH = Math.min(targetH, screenH);

  mainWindow = new BrowserWindow({
    width: winW,
    height: winH,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, 'public/icon.png'),
    // Provide a borderless aesthetic with native Windows buttons overlay
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0b0f19', // Matches dark mode background
      symbolColor: '#ffffff',
      height: 32
    },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.center();

  if (screenW < targetW || screenH < targetH) {
    mainWindow.maximize();
  }

  appServe(mainWindow).then(() => {
    mainWindow.loadURL('app://-');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    if (deepLinkToken) {
      mainWindow.webContents.send('auth-deep-link', deepLinkToken);
      deepLinkToken = null;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  // Intercept outgoing requests to Firebase Auth to rewrite Origin/Referer and bypass domain checking
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://identitytoolkit.googleapis.com/*', 'https://securetoken.googleapis.com/*'] },
    (details, callback) => {
      details.requestHeaders['Origin'] = 'https://master-typing-pro.firebaseapp.com';
      details.requestHeaders['Referer'] = 'https://master-typing-pro.firebaseapp.com/';
      callback({ requestHeaders: details.requestHeaders });
    }
  );

  // Intercept response headers to map Access-Control-Allow-Origin back to app://- and bypass browser CORS checks
  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ['https://identitytoolkit.googleapis.com/*', 'https://securetoken.googleapis.com/*'] },
    (details, callback) => {
      const responseHeaders = details.responseHeaders;
      const originKey = Object.keys(responseHeaders).find(k => k.toLowerCase() === 'access-control-allow-origin') || 'Access-Control-Allow-Origin';
      responseHeaders[originKey] = ['app://-'];
      
      const headersKey = Object.keys(responseHeaders).find(k => k.toLowerCase() === 'access-control-allow-headers') || 'Access-Control-Allow-Headers';
      responseHeaders[headersKey] = ['*'];

      const methodsKey = Object.keys(responseHeaders).find(k => k.toLowerCase() === 'access-control-allow-methods') || 'Access-Control-Allow-Methods';
      responseHeaders[methodsKey] = ['*'];

      callback({ responseHeaders });
    }
  );

  // Handle open-external events
  ipcMain.on('open-external', (event, url) => {
    shell.openExternal(url);
  });

  createWindow();
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
