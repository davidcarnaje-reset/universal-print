import { BrowserWindow, app, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
//#region electron/main.ts
var __dirname = path.dirname(fileURLToPath(import.meta.url));
ipcMain.on("trigger-print", (_event, pdfBase64) => {
	const tempPath = path.join(app.getPath("temp"), `print-${Date.now()}.pdf`);
	const base64Data = pdfBase64.split(";base64,").pop() || pdfBase64;
	fs.writeFileSync(tempPath, base64Data, "base64");
	let printWindow = new BrowserWindow({
		width: 800,
		height: 600,
		show: true,
		x: -9999,
		y: -9999,
		frame: false,
		skipTaskbar: true,
		transparent: true,
		webPreferences: { plugins: true }
	});
	printWindow.loadURL(`file://${tempPath}`);
	printWindow.webContents.on("did-finish-load", () => {
		setTimeout(() => {
			printWindow?.webContents.print({
				silent: false,
				printBackground: true,
				deviceName: ""
			}, (success, failureReason) => {
				console.log(`Print result: success=${success}, reason=${failureReason}`);
				printWindow?.close();
				printWindow = null;
				try {
					if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
				} catch (err) {
					console.error("Failed to delete temp print file:", err);
				}
			});
		}, 500);
	});
});
process.env.APP_ROOT = path.join(__dirname, "..");
var VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
var MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
var RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
var win;
function createWindow() {
	win = new BrowserWindow({
		icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
		webPreferences: { preload: path.join(__dirname, "preload.mjs") }
	});
	win.webContents.on("did-finish-load", () => {
		win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
	});
	if (VITE_DEV_SERVER_URL) win.loadURL(VITE_DEV_SERVER_URL);
	else win.loadFile(path.join(RENDERER_DIST, "index.html"));
}
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
		win = null;
	}
});
app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.whenReady().then(createWindow);
//#endregion
export { MAIN_DIST, RENDERER_DIST, VITE_DEV_SERVER_URL };
