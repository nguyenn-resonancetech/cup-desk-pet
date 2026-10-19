// Cúp — Nowa desk pet. Main process: the pet window, a full-screen overlay (giant face,
// disco lights, zoomies lap), prank popups, a hidden music player (YouTube / any link),
// Google Calendar (iCal), drama feeds, tray + settings, system-idle watch.
const { app, BrowserWindow, ipcMain, screen, Tray, Menu, shell, powerMonitor, nativeImage, net } = require('electron');
const path = require('path');
const fs = require('fs');
const calendar = require('./calendar.cjs');
const drama = require('./drama.cjs');

const ROOT = path.join(__dirname, '..');
// Data: next to the portable exe / in the project when run from source; installed builds use the
// OS app-data folder (the install dir may be read-only). CUP_DATA overrides both (e.g. keep it off C:).
const BASE = process.env.PORTABLE_EXECUTABLE_DIR || (app.isPackaged ? null : ROOT);
const DATA = process.env.CUP_DATA || (BASE ? path.join(BASE, '.userdata') : path.join(app.getPath('appData'), 'Cup Desk Pet'));
const MUSIC = path.join(BASE || DATA, 'music');
fs.mkdirSync(DATA, { recursive: true });
fs.mkdirSync(MUSIC, { recursive: true });
app.setPath('userData', DATA);

const DEFAULT_MUSIC = 'https://www.youtube.com/watch?v=5mhxMaefHRA&list=RDEMRoFDwm7ghkvjDGFhVFY-HA&start_radio=1';
const DEFAULTS = {
  pronoun: 'anh',          // how Cúp calls you
  frequency: 'vua',        // it | vua | lay
  scale: 1.2,              // pet pixel scale (1.2 = 120px)
  vinahouse: true,         // auto party now and then
  musicSource: 'default',  // default (Thái Hoàng) | link | folder | synth
  musicLink: '',
  volume: 0.8,
  flash: true,             // party light flashes
  antics: true,            // giant face, popups, cursor hang, zoomies, leaving…
  water: true,
  food: true,
  drama: true,
  icsUrl: '',
  openAtLogin: false,
  v: 2,
};
const CFG_FILE = path.join(DATA, 'config.json');
let cfg = { ...DEFAULTS };
try {
  const saved = JSON.parse(fs.readFileSync(CFG_FILE, 'utf8'));
  // v1 → v2: the old "Nhỏ" (2×) becomes the new mini 1.2×; old "auto" music → Thái Hoàng default
  if (!saved.v) { if (saved.scale === 2) saved.scale = 1.2; if (saved.musicSource === 'auto' || saved.musicSource === 'youtube') saved.musicSource = 'default'; saved.v = 2; }
  cfg = { ...DEFAULTS, ...saved, antics: true, drama: true };   // trò xàm + drama are not optional
} catch {}
const saveCfg = () => fs.writeFileSync(CFG_FILE, JSON.stringify(cfg, null, 2));

let win, tray, settingsWin, overlay, player;
let quietUntil = 0;
const popups = new Set();

const PET_W = 760;               // transparent, click-through; wide enough that the bubble still fits on screen when Cúp hugs an edge
const winH = () => Math.round(100 * cfg.scale) + 320;   // room for a full-stanza bubble above Cúp
const ICON = path.join(ROOT, 'assets', 'app-icon.png');
const CLEAN_UA = () => app.userAgentFallback.replace(/\s(Electron|cup-desk-pet)\/\S+/g, '');

const displayFor = (x, y) => screen.getDisplayNearestPoint({ x: Math.round(x), y: Math.round(y) });
const petDisplay = () => { const b = win.getBounds(); return displayFor(b.x + b.width / 2, b.y + b.height - 10); };
const toPet = (ch, ...a) => win && !win.isDestroyed() && win.webContents.send(ch, ...a);

function createPet() {
  const wa = screen.getPrimaryDisplay().workArea;
  win = new BrowserWindow({
    width: PET_W, height: winH(),
    x: Math.round(wa.x + wa.width - PET_W - 40),
    y: Math.round(wa.y + wa.height - winH()),
    transparent: true, frame: false, resizable: false, hasShadow: false,
    skipTaskbar: true, alwaysOnTop: true, focusable: true, show: false,
    backgroundColor: '#00000000',
    // Cúp starts the music on its own (that's the joke) → no user gesture needed
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), backgroundThrottling: false, autoplayPolicy: 'no-user-gesture-required' },
  });
  win.setAlwaysOnTop(true, 'screen-saver', 2);
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, 'pet.html'));
  win.once('ready-to-show', () => win.showInactive());
}

// ---------------------------------------------------------------- overlay (one full-screen layer)
function ensureOverlay() {
  if (overlay && !overlay.isDestroyed()) return overlay;
  overlay = new BrowserWindow({
    transparent: true, frame: false, resizable: false, hasShadow: false, skipTaskbar: true,
    alwaysOnTop: true, focusable: false, show: false, backgroundColor: '#00000000',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), backgroundThrottling: false },
  });
  overlay.setAlwaysOnTop(true, 'screen-saver', 1);
  overlay.loadFile(path.join(__dirname, 'overlay.html'));
  return overlay;
}
ipcMain.on('overlay-show', (_e, msg) => {
  const o = ensureOverlay();
  const d = petDisplay();
  o.setBounds(d.bounds);
  const interactive = msg.mode === 'face';
  o.setIgnoreMouseEvents(!interactive);
  o.setFocusable(interactive);
  const send = () => o.webContents.send('overlay', { ...msg, bounds: d.bounds, workArea: d.workArea, pet: win.getBounds(), cfg });
  if (o.webContents.isLoading()) o.webContents.once('did-finish-load', send); else send();
  if (interactive) { o.show(); o.focus(); } else o.showInactive();
  if (msg.mode === 'lights') win.moveTop();     // Cúp dances above the light show
});
ipcMain.on('overlay-hide', () => { if (overlay && !overlay.isDestroyed()) { overlay.webContents.send('overlay', { mode: 'off' }); overlay.hide(); } });
ipcMain.on('overlay-beat', (_e, b) => overlay && !overlay.isDestroyed() && overlay.isVisible() && overlay.webContents.send('beat', b));
ipcMain.on('overlay-done', (_e, r) => { if (overlay && !overlay.isDestroyed()) overlay.hide(); toPet('overlay-done', r); });

// ---------------------------------------------------------------- prank popups
ipcMain.on('popups', (_e, kinds) => {
  const wa = petDisplay().workArea;
  kinds.forEach((k, i) => setTimeout(() => openPopup(k, wa), i * 380));
});
function popupPos(wa, w, h) {
  return { x: Math.round(wa.x + 40 + Math.random() * (wa.width - w - 80)), y: Math.round(wa.y + 40 + Math.random() * (wa.height - h - 160)) };
}
function openPopup(kind, wa) {
  const w = 380, h = 300, p = popupPos(wa, w, h);
  const pw = new BrowserWindow({
    width: w, height: h, x: p.x, y: p.y, frame: false, transparent: true, resizable: false, hasShadow: false,
    skipTaskbar: true, alwaysOnTop: true, show: false, backgroundColor: '#00000000', title: 'Cúp',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs') },
  });
  pw.setAlwaysOnTop(true, 'floating');
  pw.loadFile(path.join(__dirname, 'popup.html'), { query: { k: kind, a: cfg.pronoun } });
  pw.once('ready-to-show', () => pw.showInactive());
  popups.add(pw);
  pw.on('closed', () => { popups.delete(pw); if (!popups.size) toPet('popups-done'); });
}
ipcMain.on('popup-close', (e) => BrowserWindow.fromWebContents(e.sender)?.close());
ipcMain.on('popup-dodge', (e) => {
  const pw = BrowserWindow.fromWebContents(e.sender); if (!pw) return;
  const wa = displayFor(pw.getBounds().x, pw.getBounds().y).workArea, b = pw.getBounds();
  pw.setBounds({ ...b, ...popupPos(wa, b.width, b.height) });
});
const closeAllPopups = () => [...popups].forEach((p) => !p.isDestroyed() && p.close());

// ---------------------------------------------------------------- hidden music player (YouTube / any link)
function startPlayer(url, volume) {
  stopPlayer();
  player = new BrowserWindow({
    show: false, width: 960, height: 600, title: 'Cúp — nhạc', icon: ICON, autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'player-preload.cjs'), partition: 'persist:player', backgroundThrottling: false, autoplayPolicy: 'no-user-gesture-required' },
  });
  player.webContents.setUserAgent(CLEAN_UA());
  player.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  player.on('close', (e) => { if (player && !app.quitting) { e.preventDefault(); player.hide(); } });  // closing the video window keeps the music
  player.loadURL(url);
  player.webContents.once('dom-ready', () => player && player.webContents.send('player-volume', volume));
}
function stopPlayer() {
  if (player && !player.isDestroyed()) { const p = player; player = null; p.destroy(); }
  player = null;
}
ipcMain.on('music-start', (_e, url, vol) => startPlayer(url, vol));
ipcMain.on('music-stop', () => stopPlayer());
ipcMain.on('music-show', () => player && !player.isDestroyed() && player.show());
ipcMain.on('player-beat', (_e, b) => toPet('music-beat', b));
ipcMain.on('player-state', (_e, s) => toPet('music-state', s));

// <title> / og:title of any page — used to judge the user's music taste
ipcMain.handle('page-title', async (_e, url) => {
  if (!/^https:\/\//i.test(url)) return '';
  try {
    const ctl = new AbortController(); setTimeout(() => ctl.abort(), 8000);
    const html = await (await net.fetch(url, { signal: ctl.signal, headers: { 'User-Agent': CLEAN_UA(), 'Accept-Language': 'vi,en' } })).text();
    const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i);
    const t = og ? og[1] : (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || '';
    return t.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
  } catch { return ''; }
});

// ---------------------------------------------------------------- calendar + drama
ipcMain.handle('calendar', async () => {
  try { return { events: await calendar.upcoming(cfg.icsUrl) }; } catch (e) { return { error: String(e.message || e) }; }
});
ipcMain.handle('drama', async () => { try { return await drama.hottest(); } catch { return []; } });

// ---------------------------------------------------------------- settings + tray
// Cúp never takes focus, so Windows refuses to raise a new window from it ("focus stealing
// prevention") and Settings opened behind other apps. Pin it on top for a beat, then release.
function bringToFront(w) {
  if (w.isMinimized()) w.restore();
  // stay on top until the user actually clicks/types inside it (isFocused() lies here on Windows),
  // then behave like a normal window — see 'window-touched'
  w.setAlwaysOnTop(true, 'floating');
  w.show(); w.moveTop(); w.focus();
  if (process.platform === 'darwin') app.focus({ steal: true });
  w.flashFrame(false);
}
function openSettings(section) {
  if (settingsWin && !settingsWin.isDestroyed()) { bringToFront(settingsWin); if (section) settingsWin.webContents.send('goto', section); return; }
  const wa = petDisplay().workArea, w = 480, h = Math.min(780, wa.height - 40);
  settingsWin = new BrowserWindow({
    width: w, height: h, x: Math.round(wa.x + (wa.width - w) / 2), y: Math.round(wa.y + (wa.height - h) / 2),
    resizable: false, title: 'Cúp — Cài đặt', show: false,
    icon: ICON, autoHideMenuBar: true, backgroundColor: '#fdf5dd',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs') },
  });
  settingsWin.loadFile(path.join(__dirname, 'settings.html'), section ? { hash: section } : undefined);
  settingsWin.once('ready-to-show', () => bringToFront(settingsWin));
}

function menuTemplate() {
  const quiet = Date.now() < quietUntil;
  const cmd = (c) => () => toPet('cmd', c);
  return [
    { label: 'Cúp ơi, nói gì đi', click: cmd('talk') },
    { label: 'Quẩy nhạc ngay!', click: cmd('party') },
    { label: 'Tắt nhạc', click: cmd('stop') },
    { label: 'Xem video đang phát', click: () => player && !player.isDestroyed() && player.show(), enabled: !!player },
    { type: 'separator' },
    { label: 'Nhắc uống nước', click: cmd('water') },
    { label: 'Rủ đi ăn', click: cmd('food') },
    { label: 'Dẹp hết popup', click: closeAllPopups, enabled: popups.size > 0 },
    { type: 'separator' },
    quiet
      ? { label: 'Đánh thức Cúp', click: () => { quietUntil = 0; toPet('quiet', 0); } }
      : { label: 'Cho Cúp ngủ 1 tiếng', click: () => { quietUntil = Date.now() + 3600e3; toPet('quiet', quietUntil); closeAllPopups(); } },
    { label: 'Gọi Cúp về đây', click: cmd('home') },
    { label: 'Mở thư mục nhạc', click: () => shell.openPath(MUSIC) },
    { label: 'Nối lịch Google của tôi…', click: () => openSettings('calendar'), visible: !cfg.icsUrl },
    { label: 'Cài đặt…', click: () => openSettings() },
    { type: 'separator' },
    { label: 'Tạm biệt Cúp', click: () => app.quit() },
  ];
}

function createTray() {
  const img = nativeImage.createFromPath(path.join(ROOT, 'assets', 'tray-32.png')).resize({ width: process.platform === 'darwin' ? 18 : 16, height: process.platform === 'darwin' ? 18 : 16 });
  tray = new Tray(img);
  tray.setToolTip('Cúp — đang xúi bạn trốn việc');
  tray.on('click', () => toPet('cmd', 'talk'));
  tray.on('right-click', () => tray.popUpContextMenu(Menu.buildFromTemplate(menuTemplate())));
}

// ---------------------------------------------------------------- pet IPC
ipcMain.handle('init', () => ({
  cfg, quietUntil, winW: PET_W, winH: winH(), defaultMusic: DEFAULT_MUSIC,
  bounds: win.getBounds(), workArea: petDisplay().workArea,
}));
ipcMain.on('ignore-mouse', (_e, ignore) => { if (win && !win.isDestroyed()) win.setIgnoreMouseEvents(ignore, { forward: true }); });
ipcMain.on('move', (_e, x, y) => {
  if (!win || win.isDestroyed()) return;
  win.setBounds({ x: Math.round(x), y: Math.round(y), width: PET_W, height: winH() });
});
ipcMain.handle('work-area', (_e, x, y) => displayFor(x, y).workArea);
ipcMain.handle('cursor', () => screen.getCursorScreenPoint());
ipcMain.on('open-url', (_e, url) => { if (/^https:\/\//.test(url) || url === 'steam://open/games') shell.openExternal(url); });
ipcMain.on('context-menu', () => Menu.buildFromTemplate(menuTemplate()).popup({ window: win }));
ipcMain.handle('get-cfg', () => ({ cfg, musicDir: MUSIC, musicFiles: listMusic(), defaultMusic: DEFAULT_MUSIC }));
ipcMain.handle('set-cfg', (_e, next) => {
  const scaleChanged = next.scale !== undefined && next.scale !== cfg.scale;
  cfg = { ...cfg, ...next };
  saveCfg();
  if (next.openAtLogin !== undefined) {
    app.setLoginItemSettings(app.isPackaged
      ? { openAtLogin: cfg.openAtLogin }
      : { openAtLogin: cfg.openAtLogin, path: process.execPath, args: [ROOT] });
  }
  if (scaleChanged) {
    const b = win.getBounds();
    win.setBounds({ x: b.x, y: b.y + b.height - winH(), width: PET_W, height: winH() });
  }
  toPet('cfg', cfg, { winH: winH() });
  return cfg;
});
ipcMain.handle('test-calendar', async (_e, url) => {
  try { const ev = await calendar.upcoming(url); return { ok: true, n: ev.length, next: ev.find((x) => x.start > Date.now()) }; } catch (e) { return { ok: false, error: String(e.message || e) }; }
});
ipcMain.on('open-music-dir', () => shell.openPath(MUSIC));
ipcMain.on('open-settings', (_e, section) => openSettings(section));
ipcMain.on('window-touched', (e) => { const w = BrowserWindow.fromWebContents(e.sender); if (w && w !== win && w.isAlwaysOnTop()) w.setAlwaysOnTop(false); });

function listMusic() {
  try { return fs.readdirSync(MUSIC).filter((f) => /\.(mp3|m4a|ogg|wav|flac)$/i.test(f)).map((f) => path.join(MUSIC, f)); } catch { return []; }
}
ipcMain.handle('music-files', () => listMusic());

// System idle → lets Cúp notice when you sneaked away (or worked too long).
function startIdleWatch() {
  setInterval(() => toPet('idle', powerMonitor.getSystemIdleTime()), 15000);
  powerMonitor.on('lock-screen', () => toPet('idle', 9999));
}

// CUP_DEBUG=1: renderer console → stdout; write commands into .userdata/debug-cmd.txt
// (any pet cmd, plus snap / snapset / snapover / settings / eval:<js>).
function startDebug() {
  const log = (who) => (_e, level, msg, line, src) => console.log(`[${who}:${level}] ${msg} (${path.basename(src || '')}:${line})`);
  win.webContents.on('console-message', log('pet'));
  app.on('browser-window-created', (_e, w) => w.webContents.on('console-message', log('win')));
  let n = 0;
  const f = path.join(DATA, 'debug-cmd.txt');
  setInterval(async () => {
    if (!fs.existsSync(f)) return;
    const cmds = fs.readFileSync(f, 'utf8').trim().split(/\n/); fs.unlinkSync(f);
    for (const c of cmds) {
      if (c === 'snap') {
        fs.writeFileSync(path.join(DATA, `snap-${++n}.png`), (await win.webContents.capturePage()).toPNG());
        console.log('snap', n, JSON.stringify(win.getBounds()));
      } else if (c === 'settings') openSettings();
      else if (c.startsWith('menu:')) { const it = Menu.buildFromTemplate(menuTemplate()).items.find((m) => m.label === c.slice(5)); console.log('menu item', !!it); try { it && it.click(); } catch (e) { console.log('menu error', e.stack); } }
      else if (c === 'snapset' && settingsWin && !settingsWin.isDestroyed()) {
        fs.writeFileSync(path.join(DATA, 'snap-settings.png'), (await settingsWin.webContents.capturePage()).toPNG()); console.log('snapset');
      } else if (c === 'snapover' && overlay && !overlay.isDestroyed()) {
        fs.writeFileSync(path.join(DATA, 'snap-overlay.png'), (await overlay.webContents.capturePage()).toPNG()); console.log('snapover');
      } else if (c === 'snappop') {
        let i = 0; for (const p of popups) fs.writeFileSync(path.join(DATA, `snap-pop-${++i}.png`), (await p.webContents.capturePage()).toPNG());
        console.log('snappop', i);
      } else if (c === 'mute' && player) { player.webContents.setAudioMuted(true); console.log('muted'); }
      else if (c.startsWith('eval:')) console.log('eval', await win.webContents.executeJavaScript(c.slice(5)).catch((e) => String(e)));
      else if (c === 'setstate' && settingsWin && !settingsWin.isDestroyed()) console.log('setstate', JSON.stringify({ vis: settingsWin.isVisible(), foc: settingsWin.isFocused(), top: settingsWin.isAlwaysOnTop(), min: settingsWin.isMinimized(), b: settingsWin.getBounds() }));
      else if (c.startsWith('evalset:') && settingsWin) console.log('evalset', await settingsWin.webContents.executeJavaScript(c.slice(8)).catch((e) => String(e)));
      else if (c.startsWith('evalover:') && overlay) console.log('evalover', await overlay.webContents.executeJavaScript(c.slice(9)).catch((e) => String(e)));
      else if (c.startsWith('evalplayer:') && player) console.log('evalplayer', await player.webContents.executeJavaScript(c.slice(11)).catch((e) => String(e)));
      else toPet('cmd', c);
    }
  }, 300);
}

app.on('before-quit', () => { app.quitting = true; });
if (process.platform === 'darwin' && app.dock) app.dock.hide();   // a desk pet, not a Dock app
app.whenReady().then(() => {
  createPet();
  if (process.platform === 'darwin') win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  createTray();
  startIdleWatch();
  ensureOverlay();
  if (process.env.CUP_DEBUG) startDebug();
  screen.on('display-metrics-changed', () => toPet('cmd', 'home'));
});
app.on('window-all-closed', () => app.quit());
