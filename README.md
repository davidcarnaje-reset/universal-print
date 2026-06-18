# 📐 PrintFlow

A lightweight utility for smart photo tiling, poster-size reconstructions, and auto-centered ID package generation.

[![Frontend](https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript%20%7C%20Tailwind%20CSS%20%7C%20Fabric.js-blue?style=for-the-badge)](https://react.dev/)
[![Build System](https://img.shields.io/badge/Build%20System-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=FFD62B)](https://vite.dev/)
[![Deployment](https://img.shields.io/badge/Deployment-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

---

## 🚀 Key Features

*   **Tiling Mode:** Cross-page image slicing (A4/Letter grid splitting) with smart bleed controls (`CUT HERE` and `PASTE HERE` guides) for printing large format posters or multi-page layout reconstructions.
*   **ID Picture Mode:** Multi-grid allocation (1x1, 2x2, passport packages) using an automatic aspect-ratio scaling, shelf-packing layouts, and high-DPI retina rendering pipeline.
*   **Environment-Aware Workflows:** Auto-detects standalone web client functionality (Vercel PDF export modules) vs. native localized system execution frameworks (Electron desktop environment shell).

---

## 🛠️ Core Tech Stack

| Layer | Technology | Purpose / Details |
| :--- | :--- | :--- |
| **Framework** | React + TypeScript | Standard components, hooks, and strict compile-time type safety. |
| **Bundler** | Vite 8 | Fast Hot Module Replacement (HMR) and optimized build outputs. |
| **Canvas Manipulation** | Fabric.js | Smart interactive object rendering, sheet bounding-boxes, and scaling. |
| **PDF Engine** | jsPDF | Vector-perfect high-DPI PDF creation and client-side document export. |
| **Styling** | Tailwind CSS | Utility-first layouts with sleek, dark-mode adaptive user interfaces. |

---

## 💻 Getting Started (Local Development)

### 1. Clone the Repository
Clone the codebase to your local system:
```bash
git clone https://github.com/davidcarnaje-reset/universal-print.git
cd universal-print
```

### 2. Install Dependencies
Install the required packages. Use the legacy peer dependency flag to bypass potential version strictness issues during package installation:
```bash
npm install --legacy-peer-deps
```

### 3. Run the Development Server
Launch the local web client using Vite:
```bash
npm run dev
```
The application will be accessible at `http://localhost:5173`.

---

## 🌐 Distribution Channels

PrintFlow supports multiple target execution environments:

1.  **Web Application (Vercel):**
    *   Track build state and deployment live at [https://printflow-editor.vercel.app](https://printflow-editor.vercel.app).
    *   Optimized for browser environments, supporting instant client-side **Save as PDF** operations.

2.  **Native Windows Desktop Application:**
    *   Packaged with Electron for low-latency desktop execution.
    *   Cross-linked directly to the Native Windows Installer tracking repository section at [GitHub Releases](/releases) or via [GitHub Releases Page](https://github.com/davidjosh/printflow/releases).
    *   Includes localized system layout execution frameworks and direct print configurations.
