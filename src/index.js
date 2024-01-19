const { app, BrowserWindow } = require('electron');
const path = require('path');
const {ipcMain} = require('electron')

if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 864,
    height: 768,
    minHeight: 768,
    maxHeight: 768,
    minWidth: 864,
    maxWidth: 864,
    frame: false,
    icon: __dirname + '/bot.png',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'config.html'));
};

ipcMain.on('close', (evt, arg) => {
  app.quit()
})

ipcMain.on('minimize', (evt, arg) => {
  let window = BrowserWindow.getFocusedWindow()
  window.minimize()
})

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
