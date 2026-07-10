import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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

// IPC Event Listeners for Printing
ipcMain.on('print-image-sheets', (_event, data) => {
  let printWin: BrowserWindow | null = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // Build high-res HTML string containing ONLY the page-sized image tiles
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Print Spooler</title>
      <style>
        @page {
          size: ${data.paperWidthMM}mm ${data.paperHeightMM}mm !important;
          margin: 0mm !important;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          height: 100% !important;
          background: #ffffff !important;
          overflow: visible !important;
        }
        .page-image {
          display: block !important;
          width: 100vw !important;
          height: 100vh !important;
          max-width: 100vw !important;
          max-height: 100vh !important;
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          object-fit: fill !important;
          page-break-inside: avoid !important;
          page-break-after: always !important;
          break-inside: avoid !important;
          break-after: page !important;
        }
        .page-image:last-child {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
      </style>
    </head>
    <body>
      ${data.images.map((img: string) => `<img class="page-image" src="${img}" />`).join('')}
    </body>
    </html>
  `

  const htmlPath = path.join(app.getPath('temp'), 'temp-print.html')
  try {
    fs.writeFileSync(htmlPath, htmlContent, 'utf-8')
  } catch (err) {
    console.error('Failed to write temp html print file:', err)
  }

  printWin.loadURL(`file://${htmlPath}`).then(() => {
    // Wait a tiny bit for the rendering engine to paint the base64 frames
    setTimeout(() => {
      printWin?.webContents.print({
        silent: false,
        printBackground: true,
        margins: {
          marginType: 'none'
        },
        pageSize: {
          width: Math.round(data.paperWidthMM * 1000),
          height: Math.round(data.paperHeightMM * 1000)
        },
        landscape: data.landscape
      }, (success, failureReason) => {
        if (!success) {
          console.error('Print image sheets failed:', failureReason)
        }
        printWin?.close()
        printWin = null
        try {
          fs.unlinkSync(htmlPath)
        } catch (e) {
          console.error('Failed to delete temp html print file:', e)
        }
      })
    }, 500)
  }).catch((err) => {
    console.error('Failed to load print-image-sheets into printer engine:', err)
    printWin?.close()
    printWin = null
    try {
      fs.unlinkSync(htmlPath)
    } catch (e) {
      // ignore
    }
  })
})

ipcMain.on('spool-cached-pdf-print', (_event, base64String) => {
  try {
    const pdfPath = path.join(app.getPath('temp'), 'temp-print.pdf')
    fs.writeFileSync(pdfPath, base64String, 'base64')

    let printWin: BrowserWindow | null = new BrowserWindow({
      show: false,
      webPreferences: {
        plugins: true
      }
    })

    printWin.loadURL(`file://${pdfPath}`).then(() => {
      printWin?.webContents.print({
        silent: false,
        printBackground: true
      }, () => {
        printWin?.close()
        printWin = null
      })
    }).catch((err) => {
      console.error('Failed to load temp PDF for printing:', err)
      printWin?.close()
      printWin = null
    })
  } catch (err) {
    console.error('Error in spool-cached-pdf-print:', err)
  }
})
