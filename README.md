# Rental Ledger & Sub-Meter OS - iPhone Progressive Web App (PWA)

A standalone, installable Progressive Web App (PWA) built specifically for iPhone Safari, iPad, and mobile devices, hosted for free on GitHub Pages.

---

## Features on iPhone

- **Native App Feel:** Added to iPhone Home Screen via Safari with full-screen standalone mode (no browser address bar).
- **iOS Safe Area Support:** Designed for iPhone Notch and Dynamic Island (`viewport-fit=cover`, `env(safe-area-inset-top)` / `bottom`).
- **Offline First:** Fast offline caching powered by Service Worker (`sw.js`). Works even without an active internet connection.
- **Client-Side Storage:** Built-in offline database (`pwa-storage.js`) with zero dependencies.
- **Pre-loaded Portfolio:** Pre-seeded with your 4 properties (*Building A1*, *Building A2*, *Building A(warehouse)*, *Building 2*) and 43 rooms.
- **Universal Data Sync:** Easily export/import backup JSON files between your iPhone and Windows Desktop app anytime.

---

## Quick Setup: Deploy to GitHub Pages in 2 Minutes

### Method 1: GitHub Web (No Terminal / No Git Installation Needed)

1. Open [GitHub.com](https://github.com) and click **"New"** to create a new repository.
2. Name it `rental-ledger-pwa` and make sure it is set to **Public**. Click **"Create repository"**.
3. On the new repository page, click the link: **"uploading an existing file"**.
4. Drag and drop all the files from this folder (`RentalLedger-PWA`) into the upload box:
   - `index.html`
   - `app.css`
   - `app.js`
   - `pwa-storage.js`
   - `seed_data.json`
   - `manifest.webmanifest`
   - `sw.js`
   - The `icons` folder (with `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable.png`, `favicon.png`)
5. Click **"Commit changes"**.
6. In your GitHub repository, click **Settings** (top tab) &rarr; **Pages** (in the left sidebar).
7. Under **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/(root)**
   - Click **Save**.
8. Wait ~60 seconds. Refresh the page, and GitHub will display your live URL:
   `https://<your-username>.github.io/rental-ledger-pwa/`

---

## How to Install on your iPhone

1. On your iPhone, open **Safari** (you must use Safari to install iOS PWAs).
2. Open your live URL: `https://<your-username>.github.io/rental-ledger-pwa/`
3. Tap the **Share icon** at the bottom of the screen (the square with an arrow pointing up).
4. Scroll down and tap **"Add to Home Screen"**.
5. Tap **"Add"** in the top-right corner.
6. The **Rental Ledger** app icon will now appear on your iPhone Home Screen. Tap it to launch full-screen!
