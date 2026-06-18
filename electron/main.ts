import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

ipcMain.on('trigger-print', (_event, pdfBase64: string) => {
  const tempPath = path.join(app.getPath('temp'), `print-${Date.now()}.pdf`)
  const base64Data = pdfBase64.split(';base64,').pop() || pdfBase64
  fs.writeFileSync(tempPath, base64Data, 'base64')

  // Create an offscreen window that is technically shown (to force Chromium rendering of the PDF)
  // but positioned far off the visible viewport and skipped from the OS taskbar.
  let printWindow: BrowserWindow | null = new BrowserWindow({
    width: 800,
    height: 600,
    show: true,
    x: -9999,
    y: -9999,
    frame: false,
    skipTaskbar: true,
    transparent: true,
    webPreferences: {
      plugins: true
    }
  })

  printWindow.loadURL(`file://${tempPath}`)

  printWindow.webContents.on('did-finish-load', () => {
    // Wait briefly to make sure the PDF plugin is fully initialized and layout is rendered
    setTimeout(() => {
      printWindow?.webContents.print({
        silent: false,
        printBackground: true,
        deviceName: ''
      }, (success, failureReason) => {
        console.log(`Print result: success=${success}, reason=${failureReason}`)
        printWindow?.close()
        printWindow = null
        try {
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath)
          }
        } catch (err) {
          console.error('Failed to delete temp print file:', err)
        }
      })
    }, 500)
  })
})

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    title: "PrintFlow",
    icon: path.join(process.env.VITE_PUBLIC, 'printflow-logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
