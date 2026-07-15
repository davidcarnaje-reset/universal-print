# ✏️ PrintFlow v2.0.0

A lightweight utility for smart photo tiling, poster-size reconstructions, and auto-centered ID package generation — now with a hand-drawn **Sketchy UI** theme.

[![Frontend](https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript%20%7C%20Fabric.js-blue?style=for-the-badge)](https://react.dev/)
[![Build System](https://img.shields.io/badge/Build%20System-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=FFD62B)](https://vite.dev/)
[![Deployment](https://img.shields.io/badge/Deployment-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

---

## 🚀 Key Features

*   **Tiling Mode:** Cross-page image slicing (A4/Letter grid splitting) with smart bleed controls (`CUT HERE` and `PASTE HERE` guides).
*   **ID Picture Mode:** Multi-grid allocation (1x1, 2x2, passport packages) using automatic aspect-ratio scaling and high-DPI retina rendering pipeline.
*   **Multi-Size ID Layout:** Place different ID photo sizes on the same sheet with drag-and-drop arrangement.
*   **Environment-Aware Workflows:** Auto-detects standalone web client functionality (Vercel PDF export modules) vs. native localized system execution frameworks (Electron desktop app).
*   **High-Resolution PDF Export:** Generate 300 DPI print-ready PDFs directly in the browser.
*   **Live Canvas Preview:** Interactive Fabric.js canvas with real-time zoom controls and photo grid preview.

---

## 🎨 What's New in v2.0.0 — "Sketchy" Release

### ✏️ Complete UI Redesign — Sketchy Theme
The entire application has been redesigned with a warm, hand-drawn aesthetic inspired by urban sketch journals:

- **Hand-Drawn Typography** — Three curated Google Fonts:
  - *Patrick Hand* for labels, headings, and navigation
  - *Architects Daughter* for workspace titles and modal headers
  - *Comic Neue* for body text and data values
- **Warm Charcoal Color Palette** — Deep brown/charcoal backgrounds (`#1a1612`, `#221d18`) replacing cold blue-grays
- **Teal & Amber Accents** — Active states use `#3bb3a4` teal; section titles use `#d4a853` golden amber
- **Wobbly Dashed Borders** — All cards, inputs, dropdowns, and buttons use hand-drawn dashed outlines with organic `border-radius` values
- **Clipboard Canvas Wrapper** — The canvas area is styled like a sketch pad on a clipboard
- **Tactile Hover Effects** — Interactive elements lift and rotate slightly on hover for a playful, physical feel
- **Dotted Grid Background** — The workspace area features graph-paper-style dotted grids

### 🐛 Bug Fixes
- **ID Grid Alignment Fix** — Resolved centering issues where the photo grid was offset on the canvas due to FabricJS origin coordinate defaults (`originX`/`originY`)
- **Async Race Condition Fix** — Guarded image loaders with `isCurrent` cleanup flags to prevent stale renders when parameters change rapidly
- **Safety Margin Lines Removed** — Removed the grey dashed safety margin rectangle from both the workspace canvas and the print preview modal for a cleaner layout

---

## 🛠️ Core Tech Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | React + TypeScript | Dynamic component state and compile-time type safety |
| **Bundler** | Vite 8 | Ultra-fast development server and optimized build bundling |
| **Canvas Manipulation** | Fabric.js | Smart interactive object rendering and layout sizing |
| **PDF Engine** | jsPDF | High-DPI client-side PDF export generation |
| **Styling** | Vanilla CSS (Sketchy Theme) | Hand-drawn aesthetic with custom CSS variables |
| **Desktop** | Electron | Native Windows desktop application packaging |

---

## 💻 Getting Started (Local Development)

### 1. Clone the Repository
```bash
git clone https://github.com/davidcarnaje-reset/universal-print.git
cd universal-print
```

### 2. Install Dependencies
Install all required packages:
```bash
npm install --legacy-peer-deps
```

### 3. Run Development Server
Start the client server using Vite:
```bash
npm run dev
```
The app will run locally at `http://localhost:5173`.

---

## 📦 Version History

| Version | Highlights |
| :--- | :--- |
| **v2.0.0** | 🎨 Sketchy UI redesign, ID grid alignment fix, safety margin removal |
| **v1.6.9** | ID Picture multi-size mode, Electron desktop packaging |

---

## 🌐 Distribution Channels

*   **Web Application (Vercel):** Deployed live at [https://printflow-editor.vercel.app](https://universal-print-d9up2w9nl-djc-57c9bec2.vercel.app/).
*   **Native Windows Installer:** Available under [/releases](https://github.com/davidcarnaje-reset/universal-print/releases).
