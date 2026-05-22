const { app, BrowserWindow, globalShortcut, screen, ipcMain, shell } = require('electron');
const path = require('path');
const axios = require('axios');
const fs = require('fs');

app.setName('Panda');

const defaultConfig = {
  api_url: 'http://127.0.0.1:8642/v1/chat/completions',
  api_key: 'jiccencewong@dari',
  model: 'hermes-agent',
  skin_id: 'p0018',
  outfit_id: 'none',
  links: [
    { label: 'B站', url: 'https://bilibili.com', action: 'skill01' },
    { label: 'GitHub', url: 'https://github.com', action: 'block' },
    { label: '掘金', url: 'https://juejin.cn', action: 'vertigo' },
    { label: '推特', url: 'https://twitter.com', action: 'attack01' }
  ]
};

let config = { ...defaultConfig };
if (fs.existsSync(path.join(__dirname, 'config.json'))) {
  config = { ...config, ...require('./config.json') };
  if (!config.links || config.links.length !== 4) {
    config.links = defaultConfig.links;
  }
}

function getSkinManifest() {
  const manifestPath = path.join(__dirname, 'public', 'skins.json');
  const fallback = {
    skins: [
      {
        id: 'p0018',
        name: 'Panda 0018',
        frame_prefix: 'p0018',
        sprite_sheet: 'public/skins/p0018/spritesheet.png',
        sprites: 'public/skins/p0018/sprites.json'
      }
    ],
    outfits: [
      { id: 'none', name: 'None', enabled: true, supported_anims: [] }
    ]
  };
  try {
    if (!fs.existsSync(manifestPath)) return fallback;
    const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (!Array.isArray(parsed.skins) || parsed.skins.length === 0) return fallback;
    if (!Array.isArray(parsed.outfits) || parsed.outfits.length === 0) parsed.outfits = fallback.outfits;
    return parsed;
  } catch (e) {
    console.error('skins.json parse error:', e.message);
    return fallback;
  }
}

let mainWindow = null;
let chatWindow = null;
let settingsWindow = null;
let isAlwaysOnTop = true;
const PET_WINDOW_SIZE = 240;
const PET_ACTION_WINDOW_SIZE = 400;

function closeChatWindow() {
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.close();
  }
  chatWindow = null;
}

function closeSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close();
  }
  settingsWindow = null;
}

function setPetWindowSize(size) {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  const [x, y] = mainWindow.getPosition();
  const [width, height] = mainWindow.getSize();
  if (width === size && height === size) return true;
  const nx = Math.round(x + (width - size) / 2);
  const ny = Math.round(y + (height - size) / 2);
  mainWindow.setBounds({ x: nx, y: ny, width: size, height: size });
  return true;
}

const HERMES_API_URL = config.api_url;
const conversationHistory = new Map();

const SYSTEM_PROMPT = `你是一个可爱的桌面宠物，名字叫 OpenPet。
性格安静陪伴。回答简洁友好，可用表情符号。`;

function getHistory(id) {
  if (!conversationHistory.has(id)) {
    conversationHistory.set(id, [{ role: 'system', content: SYSTEM_PROMPT }]);
  }
  return conversationHistory.get(id);
}

async function callHermes(message, id) {
  const history = getHistory(id);
  history.push({ role: 'user', content: message });
  try {
    const r = await axios.post(HERMES_API_URL, {
      model: config.model,
      messages: history,
      temperature: 0.7,
      max_tokens: 500
    }, {
      headers: { 'Authorization': `Bearer ${config.api_key}`, 'Content-Type': 'application/json' }
    });
    const msg = r.data.choices[0].message;
    history.push(msg);
    return msg;
  } catch (e) {
    console.error('Hermes error:', e.message);
    if (e.code === 'ECONNREFUSED') {
      return { role: 'assistant', content: '连不上 Hermes Agent (localhost:8642)' };
    }
    return { role: 'assistant', content: `出错: ${e.message}` };
  }
}

function createWindow() {
  const display = screen.getPrimaryDisplay();
  const width = PET_WINDOW_SIZE;
  const height = PET_WINDOW_SIZE;
  const x = Math.round((display.workArea.width - width) / 2);
  const y = Math.round((display.workArea.height - height) / 2);

  mainWindow = new BrowserWindow({
    width, height, x, y,
    icon: path.join(__dirname, 'icon.png'),
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    show: false,
    hasShadow: false,
    resizable: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('Pet pos:', mainWindow.getPosition());
  });

  mainWindow.on('move', () => {
    const p = mainWindow.getPosition();
    mainWindow.webContents.send('window-moved', { x: p[0], y: p[1] });
  });
}

function createChatWindow() {
  closeSettingsWindow();
  const p = mainWindow ? mainWindow.getPosition() : [0, 0];
  const s = mainWindow ? mainWindow.getSize() : [PET_WINDOW_SIZE, PET_WINDOW_SIZE];
  const x = Math.round(p[0] + s[0] / 2 - 200);
  const y = Math.round(p[1] - 500 - 10);

  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.setPosition(x, y);
    chatWindow.show();
    return chatWindow;
  }

  chatWindow = new BrowserWindow({
    width: 400,
    height: 500,
    x, y,
    icon: path.join(__dirname, 'icon.png'),
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    hasShadow: false,
    resizable: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'chat-preload.js'),
      contextIsolation: true
    }
  });

  chatWindow.loadFile('chat.html');
  chatWindow.once('ready-to-show', () => chatWindow.show());
  chatWindow.on('closed', () => { chatWindow = null; });
  return chatWindow;
}

function createSettingsWindow() {
  closeChatWindow();
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 450,
    height: 600,
    icon: path.join(__dirname, 'icon.png'),
    transparent: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'settings-preload.js'),
      contextIsolation: true
    }
  });
  settingsWindow.loadFile('settings.html');
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

ipcMain.handle('toggle-window', () => {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) mainWindow.hide();
  else { mainWindow.show(); mainWindow.focus(); }
});

ipcMain.handle('set-always-on-top', (e, onTop) => {
  isAlwaysOnTop = onTop;
  if (mainWindow) mainWindow.setAlwaysOnTop(isAlwaysOnTop);
  return isAlwaysOnTop;
});

ipcMain.handle('is-always-on-top', () => isAlwaysOnTop);

ipcMain.handle('show-chat-window', () => {
  createChatWindow();
  return true;
});

ipcMain.handle('toggle-chat-window', () => {
  if (chatWindow && !chatWindow.isDestroyed() && chatWindow.isVisible()) {
    chatWindow.hide();
    return false;
  }
  createChatWindow();
  return true;
});

ipcMain.handle('close-chat-window', () => {
  closeChatWindow();
  return true;
});

ipcMain.handle('get-config', () => config);
ipcMain.handle('get-skin-manifest', () => getSkinManifest());

ipcMain.handle('save-config', (e, newConfig) => {
  fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify(newConfig, null, 2));
  config = { ...defaultConfig, ...newConfig };
  app.relaunch({ args: process.argv.slice(1) });
  app.quit();
  return true;
});

ipcMain.handle('open-external-url', (e, url) => {
  shell.openExternal(url);
});

ipcMain.handle('open-settings-window', () => {
  createSettingsWindow();
});
ipcMain.handle('close-settings-window', () => {
  closeSettingsWindow();
});

ipcMain.handle('send-message', async (e, message) => {
  const id = e.sender.id;
  const r = await callHermes(message, id);
  return r;
});

ipcMain.handle('chat-message', async (event, message, id) => {
  const callerId = event.sender.id;
  const r = await callHermes(message, callerId);
  return r;
});

ipcMain.handle('get-screen-bounds', () => {
  const display = screen.getPrimaryDisplay();
  return { width: display.workArea.width, height: display.workArea.height };
});

ipcMain.handle('get-window-position', () => {
  if (!mainWindow) return null;
  const p = mainWindow.getPosition();
  return { x: p[0], y: p[1] };
});

ipcMain.handle('set-window-position', (e, x, y) => {
  if (mainWindow) mainWindow.setPosition(Math.round(x), Math.round(y));
});

ipcMain.handle('set-pet-window-size', (e, mode) => {
  if (mode === 'action') return setPetWindowSize(PET_ACTION_WINDOW_SIZE);
  return setPetWindowSize(PET_WINDOW_SIZE);
});

ipcMain.handle('get-pet-window-bounds', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return null;
  return mainWindow.getBounds();
});

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    app.dock.setIcon(path.join(__dirname, 'icon.png'));
  }
  createWindow();

  globalShortcut.register('CommandOrControl+Shift+P', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) mainWindow.hide();
    else { mainWindow.show(); mainWindow.focus(); }
  });

  globalShortcut.register('CommandOrControl+Shift+T', () => {
    isAlwaysOnTop = !isAlwaysOnTop;
    if (mainWindow) mainWindow.setAlwaysOnTop(isAlwaysOnTop);
    console.log(`AlwaysOnTop: ${isAlwaysOnTop}`);
  });
});

app.on('window-all-closed', () => {
  conversationHistory.clear();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
