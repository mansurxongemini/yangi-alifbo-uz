/**
 * Özbek Alifbosi — desktop ilova (Linux, Windows).
 *
 * - Sayt fayllari ichki `app://` protokoli orqali beriladi (internet kerak emas).
 *   Oddiy file:// o'rniga shu protokol: fon oqimi (Worker), WebAssembly (7-Zip) va
 *   xavfsizlik siyosati (CSP) brauzerdagidek ishlaydi.
 * - Ilova tarmoqqa umuman chiqa olmaydi: barcha http/https so'rovlari bekor qilinadi.
 *   Tashqi havolalar (Telegram, e-pochta) foydalanuvchining oddiy brauzerida ochiladi.
 */
const { app, BrowserWindow, Menu, net, protocol, session, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const SCHEME = 'app';
const HOST = 'alifbo';
const ORIGIN = `${SCHEME}://${HOST}`;
const DIST = path.join(__dirname, '..', 'dist');
const DEV_URL = process.env.VITE_DEV_SERVER_URL; // faqat ishlab chiqishda

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

// Faqat bitta oyna: ikkinchi marta ochilsa, mavjud oynani oldinga chiqaramiz
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let mainWindow = null;

const isExternalAllowed = (url) => /^(https?:|mailto:|tg:)/i.test(url);

function serveDist() {
  protocol.handle(SCHEME, (request) => {
    const { pathname } = new URL(request.url);
    const rel = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
    const file = path.normalize(path.join(DIST, rel));
    // dist dan tashqariga chiqishga yo'l qo'ymaymiz
    if (!file.startsWith(DIST + path.sep)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
}

function lockDownNetwork() {
  const ses = session.defaultSession;
  ses.webRequest.onBeforeRequest((details, callback) => {
    const u = details.url;
    const allowed =
      u.startsWith(`${ORIGIN}/`) || u.startsWith('blob:') || u.startsWith('data:') || u.startsWith('devtools:') ||
      (DEV_URL && (u.startsWith(DEV_URL) || u.startsWith('ws://localhost')));
    callback({ cancel: !allowed });
  });
  // Kamera, mikrofon, joylashuv va h.k. kerak emas — faqat nusxa olishga ruxsat
  ses.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === 'clipboard-sanitized-write'));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 760,
    minHeight: 560,
    title: 'Özbek Alifbosi',
    backgroundColor: '#F4F6F8',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      spellcheck: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Ilova ichida faqat o'z sahifalari; tashqi havolalar — tizim brauzerida
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalAllowed(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (url.startsWith(`${ORIGIN}/`) || (DEV_URL && url.startsWith(DEV_URL))) return;
    e.preventDefault();
    if (isExternalAllowed(url)) shell.openExternal(url);
  });

  mainWindow.loadURL(DEV_URL || `${ORIGIN}/index.html`);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  serveDist();
  lockDownNetwork();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
