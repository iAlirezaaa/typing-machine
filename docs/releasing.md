# Digital Ink · Final release and mobile deployment

Digital Ink is a static, local-first Progressive Web App. The repository retains its historical name `typing-machine`; the installed app is now branded **Digital Ink**. User notes stay in the same legacy `lamplight.notes.v1` localStorage key to avoid data loss during upgrades.

## Mobile behavior

- Phone screens show portrait-format, horizontal scroll-snapping paper sheets anchored to the compact manila folder flap, not full-width note cards floating above a large empty region. Decorative backing paper remains visible with just one saved note. Swipe between the actual notes, then tap the centered sheet. Pin/delete actions stay on the selected sheet.
- Save & Backup is a vertically scrollable dialog that respects safe-area insets and small viewports.
- On mobile browsers supporting the Web Share API, exporting notes and JSON backups opens the share sheet, including the option to save to Files. Other browsers use a standard download link.
- Automatic saving happens during typing and when the app is backgrounded. Use JSON backup regularly; clearing browser storage may still destroy notes.
- Offline readiness is verified against a complete precache. An installed icon by itself does **not** prove offline files are ready.

## Avoiding stale mobile styles after deployment

Older service-worker releases cached `mobile.css` and `offline-pwa.js` with a cache-first strategy, so new online HTML could display the previous mobile design. Starting in v1.2.2, the HTML references `mobile.css?v=1.2.2` and `offline-pwa.js?v=1.2.2` (the new worker pre-caches both exact URLs for offline use) and the worker fetches these mutable UI assets network-first while connected. Update these version tokens along with the HTML meta tag and worker cache name on later releases.

Safe refresh: open the web URL with a new query parameter while online, then install any waiting update through Help. Never instruct users to clear website storage without first exporting the JSON backup, because the notes are local-only.

## Updating from the app

A published update is eligible only when `release.json` has `"status": "final"` and a numerically higher `version` than the open page's `meta[name="app-version"]`.

1. The app checks release metadata from the network without caching.
2. It asks the browser to check `sw.js`. The new worker pre-caches the entire new app before becoming available.
3. The new worker **waits** rather than forcibly replacing an active writing session.
4. An **Update** button appears in the toolbar and **Help → Install ready update** becomes available.
5. When the user confirms, the editor flushes its notes synchronously, then posts `ACTIVATE_UPDATE` to the waiting worker. The page reloads when the new worker controls it.

If the user is offline, the app continues using its existing cached version. There is no forced reload during typing. Release metadata is public, but user writing is never transmitted to GitHub.

## Finalizing a new version

1. Update the application and regression tests, keeping original localStorage keys and JSON restore compatibility.
2. Bump the version in `release.json` and in the HTML `app-version` meta tag.
3. **Bump the versioned `CACHE` value in `sw.js`**, and include every new static runtime dependency in the `ASSETS` list.
4. Keep the release status `draft` while preparing if you do not want the app to prompt for an update. Set `final` only when the release is ready.
5. Run `node scripts/build.mjs`; commit the complete `dist/` folder.
6. Run `node --test tests/offline-sw.test.mjs tests/mobile-regression.test.mjs`, `node scripts/build.mjs --check`, and the mobile Chromium smoke test.
7. Create a PR, review CI, merge, and verify GitHub Pages deployment. The next open app checks the finalized release and offers the update.

## Build distribution

Run:

```sh
node scripts/build.mjs
node scripts/build.mjs --check
```

The committed `dist/` directory contains the original app icon plus bundled CC0 typewriter recordings and a complete standalone static distribution: `index.html`, `mobile.css`, `offline-pwa.js`, `sw.js`, `manifest.webmanifest`, `release.json`, all bundled `fonts/`, `icons/`, and `sounds/`, license notices, and `build-info.json`. Host `dist/` as an HTTPS static folder, or serve it locally for browser testing. GitHub Pages continues to deploy the source repository root.

GitHub Actions verifies the checked-in distribution and publishes an artifact ZIP. The source and built app require no npm runtime dependencies, backend, account, cloud notes or paid hosting.

## Original icon and downloaded real typewriter audio

`icons/icon-art.webp.b64` is the canonical original app illustration. `scripts/vendor-media.py` validates its SHA-256 and renders icon PNG/SVG variants. The same script downloads and checks five small WAV recordings (3 key strikes, carriage return, paper movement) from their CC0-licensed upstream source, pinned by Git blob hashes. These files are distributed in the repository and in `dist/sounds/`, not loaded from third-party servers at runtime. The audio engine prefers the decoded recordings and retains its original synthetic sounds as a fallback, including a synthesized margin bell. Update `sw.js` precache and Windows `serve.py` when adding any new sound type.

## Windows desktop installer (GitHub Release)

The Windows app is packaged with **PyInstaller** + **Inno Setup** from the same finalized static `dist/` folder. Source code lives in `windows/desktop.py`, `windows/installer.iss`, and `.github/workflows/windows-release.yml`.

On a pull request, the Windows workflow builds and smoke-tests the x64 executable and produces `DigitalInk-Setup-<version>-x64.exe` as a **GitHub Actions artifact**. On a push to `main`, if the version tag does not already exist, it also publishes the installer to the official **GitHub Release** for that version. Existing version tags are never silently moved. To release changes after a tag exists, bump `release.json`, the `app-version` meta tag, the versioned Service Worker cache, and rebuilt `dist/`.

1. Users download the Setup.exe from **Releases** and run it without installing Python. The bundled launcher starts a localhost-only HTTP server and opens the web interface in Edge or Chrome with a dedicated user-data directory.
2. Installation is per-user and requires no admin privileges. **Launch Digital Ink now** is offered at the end of setup. A **Start with Windows** shortcut is available as an opt-in task; no autorun is forced at system login.
3. Installed web assets live under the user's Program Files equivalent; notes remain under `%LOCALAPPDATA%\\DigitalInk\\BrowserProfile`. An uninstall intentionally leaves the browser profile and personal notes untouched.
4. The port `127.0.0.1:8765` is held stable for note-storage compatibility. A different program using that port prevents the launcher from starting; the program never opens an unverified foreign service. An existing Digital Ink server can be reused.
5. The installer is **unsigned**. SmartScreen may warn. Distribution is only through this repository's Actions artifacts and Releases; code signing is a future release requirement.
6. For legacy notes (the original file launch or older localhost browser profile), **export JSON** from the old version and import it into the installed app. This avoids relying on browser cross-profile storage transfer.

Manual Windows verification on a clean Windows 10/11 x64 VM: install, auto-launch, write, reopen, reboot with and without the optional startup shortcut, backup/import JSON, and uninstall/reinstall with notes preserved.

## Mobile gestures and contextual help

Phone/tablet touch interfaces hide the desktop keyboard shortcut table. Drag the **writing paper** vertically to read old text; a short tap moves the caret to the last character and requests the mobile keyboard. The typewriter's baseline is calculated from `window.visualViewport` so the dark caret and metal typing guide stay visible above iOS Safari's software keyboard (even when `innerHeight` stays unchanged). The Notes folder uses a distinct horizontal swipe gesture; desktop text selection and original paper animations remain unchanged. Interactive dialogs, the archive, and button taps are excluded from paper-swipe interception. A Playwright Chromium test covers gesture handling and mobile contextual help, but real-device Safari and Chrome tests remain necessary.

## Testing limits

Chromium device emulation is not a substitute for hands-on Safari testing on physical iOS devices. Before announcing universal mobile compatibility, test the iPhone Share sheet, Home Screen installation, keyboard resizing, JSON import and export, and airplane-mode re-open on the target devices.
