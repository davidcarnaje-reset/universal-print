# 📐 PrintFlow

A lightweight utility for smart photo tiling, poster-size reconstructions, and auto-centered ID package generation.

[![Frontend](https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript%20%7C%20Tailwind%20CSS%20%7C%20Fabric.js-blue?style=for-the-badge)](https://react.dev/)
[![Build System](https://img.shields.io/badge/Build%20System-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=FFD62B)](https://vite.dev/)
[![Deployment](https://img.shields.io/badge/Deployment-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

---

## 🚀 Key Features

*   **Tiling Mode:** Cross-page image slicing (A4/Letter grid splitting) with smart bleed controls (`CUT HERE` and `PASTE HERE` guides).
*   **ID Picture Mode:** Multi-grid allocation (1x1, 2x2, passport packages) using an automatic aspect-ratio scaling and high-DPI retina rendering pipeline.
*   **Environment-Aware Workflows:** Auto-detects standalone web client functionality (Vercel PDF export modules) vs. native localized system execution frameworks.

---

## 🛠️ Core Tech Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | React + TypeScript | Dynamic component state and compile-time type safety |
| **Bundler** | Vite 8 | Ultra-fast development server and optimized build bundling |
| **Canvas Manipulation** | Fabric.js | Smart interactive object rendering and layout sizing |
| **PDF Engine** | jsPDF | High-DPI client-side PDF export generation |
| **Styling** | Tailwind CSS | Utility-first styling with sleek dark-mode capabilities |

---

## 💻 Getting Started (Local Development)

### 1. Clone the Repository
```bash
git clone https://github.com/davidcarnaje-reset/universal-print.git
cd universal-print
```

### 2. Install Dependencies
Install all required packages bypass peer-dependency requirements:
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

## 🌐 Distribution Channels

*   **Web Application (Vercel):** Deployed live and tracked via Vercel at [https://printflow-editor.vercel.app](https://printflow-editor.vercel.app).
*   **Native Windows Installer:** Cross-linked directly to the Native Windows Installer tracking repository section under [/releases](https://github.com/davidjosh/printflow/releases).
