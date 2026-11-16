# Digital Ink · Final release and mobile deployment

Digital Ink is a static, local-first Progressive Web App. The repository retains its historical name `typing-machine`; the installed app is now branded **Digital Ink**. User notes stay in the same legacy `lamplight.notes.v1` localStorage key to avoid data loss during upgrades.

## Mobile behavior

- Phone screens show a vertical, scrollable Notes archive rather than desktop coverflow. Tap any page once to open it; pin/delete actions stay visible.
- Save & Backup is a vertically scrollable dialog that respects safe-area insets and small viewports.
- On mobile browsers supporting the Web Share API, exporting notes and JSON backups opens the share sheet, including the option to save to Files. Other browsers use a standard download link.
- Automatic saving happens during typing and when the app is backgrounded. Use JSON backup regularly; clearing browser storage may still destroy notes.
- Offline readiness is verified against a complete precache. An installed icon by itself does **not** prove offline files are ready.

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

The committed `dist/` directory contains a complete standalone static distribution: `index.html`, `mobile.css`, `offline-pwa.js`, `sw.js`, `manifest.webmanifest`, `release.json`, all bundled `fonts/` and `icons/`, license notices, and `build-info.json`. Host `dist/` as an HTTPS static folder, or serve it locally for browser testing. GitHub Pages continues to deploy the source repository root.

GitHub Actions verifies the checked-in distribution and publishes an artifact ZIP. The source and built app require no npm runtime dependencies, backend, account, cloud notes or paid hosting.

## Testing limits

Chromium device emulation is not a substitute for hands-on Safari testing on physical iOS devices. Before announcing universal mobile compatibility, test the iPhone Share sheet, Home Screen installation, keyboard resizing, JSON import and export, and airplane-mode re-open on the target devices.
