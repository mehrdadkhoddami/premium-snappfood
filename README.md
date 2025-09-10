# Premium SnappFood

A Chrome extension which in 1st version to hide or blur various ad types on snappfood.ir. Use the popup to choose per-ad-type behavior: hide, blur, or do nothing.

Badges
- Build: GitHub Actions (package artifact)
- License: MIT

Summary
--------
This extension detects "vendor" cards, product cards (including the special `#search-vendor-product` wrapper), banners and standalone ad SVG icons on snappfood.ir and applies the user-selected action for each ad type: hide, blur or none. Settings are stored in `chrome.storage.sync` and applied immediately.

Features
--------
- Detect vendor ads by Ads marker or ad SVG icon.
- Detect product ads including a specific wrapper `#search-vendor-product`.
- Detect homepage/section banners with `data-sentry-component="Banner"` and `img[alt]` like `ads_banner`.
- Detect standalone ad icons (SVG) and apply action to the smallest relevant element.
- Popup UI to choose behavior for: Vendor / Product / Banner / Standalone SVG.
- Settings synced with Chrome Sync (chrome.storage.sync).
- Optimized processing using MutationObserver and idle scheduling to minimize performance impact.

Files
-----
- `manifest.json` — Chrome extension manifest (MV3).
- `contentScript.js` — core ad detection and apply-action logic.
- `styles.css` — UI classes used by content script (hide/blur).
- `popup.html`, `popup.css`, `popup.js` — popup UI and logic.
- `README-en.md` — this file.
- `LICENSE` — MIT license.
- `.github/workflows/package.yml` — GitHub Actions to package extension.

Installation (local testing)
----------------------------
1. Clone or download the repository.
   ```bash
   git clone <repo-url>
   cd <repo-folder>
   ```
2. Open Chrome (or another Chromium-based browser).
3. Go to `chrome://extensions/`.
4. Enable "Developer mode".
5. Click "Load unpacked" and select the project folder.
6. Open snappfood.ir and adjust settings via the extension popup.

Usage
-----
- Click the extension icon to open the popup.
- For each ad type (Vendor, Product, Banner, Standalone SVG) select one of:
- Hide — completely hide the targeted element (display: none).
- Blur — apply a blur filter and disable pointer events.
- None — do nothing.
- Settings are saved to Chrome Sync and applied immediately to open pages.

Performance notes
-----------------
- The extension avoids full-document repeated scans.
- It uses a MutationObserver to process only added nodes.
- Work is scheduled with requestIdleCallback (with fallback to setTimeout) to avoid UI jank.
- Elements are tagged after processing to avoid re-processing.
- If you still notice performance issues, reduce the number of selectors or narrow the target scope.

Customization
-------------
- Adjust blur amount in `styles.css` (`.sf-blur-by-ext { filter: blur(6px); }`).
- To remove elements instead of hiding, modify the content script's applyAction to call `el.remove()` (be careful).
- Tune idle timeout or mutation logic in `contentScript.js`.

Privacy & Permissions
---------------------
- Uses `chrome.storage.sync` only to store user settings.
- No external servers are contacted.
- `host_permissions` are restricted to `*.snappfood.ir` only, to run the content script.

Contributing
------------
PRs and issues are welcome. Please test changes locally before submitting a PR and include a short description of the change.

License
-------
This project is licensed under the MIT License - see the `LICENSE` file for details.