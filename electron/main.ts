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
function getStandardPageSize(widthMM: number, heightMM: number): string | { width: number, height: number } {
  const w = Math.min(widthMM, heightMM)
  const h = Math.max(widthMM, heightMM)

  const matches = (targetW: number, targetH: number) => {
    return Math.abs(w - targetW) < 5 && Math.abs(h - targetH) < 5
  }

  if (matches(215.9, 279.4)) return 'Letter'
  if (matches(215.9, 355.6)) return 'Legal'
  if (matches(215.9, 330.2)) return 'Legal' // Map Long PH to Legal
  if (matches(210.0, 297.0)) return 'A4'
  if (matches(297.0, 420.0)) return 'A3'
  if (matches(148.0, 210.0)) return 'A5'
  if (matches(279.0, 432.0)) return 'Tabloid'

  return {
    width: Math.round(widthMM * 1000),
    height: Math.round(heightMM * 1000)
  }
}

// IPC Event Listeners for Printing
ipcMain.on('print-image-sheets', (_event, data) => {
  const width_px = Math.round(data.paperWidthMM * 3.7795)
  const height_px = Math.round(data.paperHeightMM * 3.7795)

  let printWin: BrowserWindow | null = new BrowserWindow({
    show: false,
    width: width_px,
    height: height_px,
    useContentSize: true,
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
      const pageSize = getStandardPageSize(data.paperWidthMM, data.paperHeightMM)
      printWin?.webContents.print({
        silent: false,
        printBackground: true,
        margins: {
          marginType: 'none'
        },
        pageSize: pageSize as any,
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

ipcMain.on('spool-cached-pdf-print', (_event, payload) => {
  try {
    let base64String: string
    let paperWidthMM: number | undefined
    let paperHeightMM: number | undefined
    let landscape = false

    if (typeof payload === 'string') {
      base64String = payload
    } else {
      base64String = payload.base64String
      paperWidthMM = payload.paperWidthMM
      paperHeightMM = payload.paperHeightMM
      landscape = payload.landscape
    }

    const pdfPath = path.join(app.getPath('temp'), `temp-print-${Date.now()}.pdf`)
    fs.writeFileSync(pdfPath, base64String, 'base64')

    let printWin: BrowserWindow | null = new BrowserWindow({
      show: true,
      x: -2000,
      y: -2000,
      width: 800,
      height: 600,
      webPreferences: {
        plugins: true
      }
    })

    printWin.loadURL(`file://${pdfPath}`).then(() => {
      // Give the PDF viewer extension a brief moment (500ms) to paint the document
      setTimeout(() => {
        const printOptions: any = {
          silent: false,
          printBackground: true
        }

        if (paperWidthMM && paperHeightMM) {
          printOptions.margins = {
            marginType: 'none'
          }
          printOptions.pageSize = {
            width: Math.round(paperWidthMM * 1000),
            height: Math.round(paperHeightMM * 1000)
          }
          printOptions.landscape = landscape
        }

        printWin?.webContents.print(printOptions, () => {
          // Cleanup temp file and close window
          try {
            if (fs.existsSync(pdfPath)) {
              fs.unlinkSync(pdfPath)
            }
          } catch (e) {
            console.error('Failed to delete print PDF file:', e)
          }
          printWin?.close()
          printWin = null
        })
      }, 1500)
    }).catch((err) => {
      console.error('Failed to load temp PDF for printing:', err)
      try {
        if (fs.existsSync(pdfPath)) {
          fs.unlinkSync(pdfPath)
        }
      } catch (e) {}
      printWin?.close()
      printWin = null
    })
  } catch (err) {
    console.error('Error in spool-cached-pdf-print:', err)
  }
})
