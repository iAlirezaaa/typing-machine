# Digital Ink · ماشین تایپ

**Digital Ink** is a quiet, vintage-inspired typewriter for Persian and English notes. Warm paper, a moving carriage, a soft pool of light, and mechanical key sounds — in your browser.

**Website:** [ialirezaaa.github.io/typing-machine](https://ialirezaaa.github.io/typing-machine/)

[راهنمای فارسی](README.fa.md) · [MIT license](LICENSE)

![Typing Machine with an English sample note](docs/screenshots/english.jpg)

## Web app · screenshots and quick start

The public, installable **Digital Ink web app** runs at **https://ialirezaaa.github.io/typing-machine/**. No login, subscription or cloud storage is required. It is a local-first writing desk that works in Persian (RTL) and English (LTR); your writing remains on this device.

| English writing desk | Persian / RTL writing |
|:--:|:--:|
| [![Digital Ink English writing screenshot](docs/screenshots/english.jpg)](docs/screenshots/english.jpg) | [![Digital Ink Persian writing screenshot](docs/screenshots/persian.jpg)](docs/screenshots/persian.jpg) |
| Live application screenshot | Live application screenshot |

**Using the web app:**

1. Open the [web app](https://ialirezaaa.github.io/typing-machine/). Tap the paper on a phone (or click the writing area on desktop) to start typing. On phones, tapping the paper returns to the **end of the note**, ready for input.
2. Select **+ new** to start a page. Use **notes** to open the paper folder: saved notes appear as **overlapping full-size typed sheets**, not text cards. Swipe sideways to turn the sheets, and tap the centered sheet to put it back on the typewriter. Search and pin pages in the folder. Everything saves automatically on this device.
3. **Phone writing:** swipe vertically across the paper to read older lines; tap once to bring the dark typing caret and the mechanical typing line back above the on-screen keyboard. The mobile help shows touch instructions rather than desktop keyboard shortcuts.
4. Select **save** to export text, Markdown, or the **JSON backup** of all notes. Import the JSON backup to move your notes to another browser or device.
5. **Install offline:** on iPhone use Safari → Share → Add to Home Screen; on Android use Chrome → Install app / Add to Home screen. First open the installed app online until **offline ready** appears, then you can open it without internet while local storage remains intact.

**Privacy:** Notes use browser localStorage; there is no server synchronization. Different devices, browsers and installed app profiles do not share notes automatically. Always keep JSON backups.

## Windows installer (offline desktop app)

Download **Digital Ink Setup for Windows x64** from [GitHub Releases](https://github.com/iAlirezaaa/typing-machine/releases/latest). Run the `DigitalInk-Setup-1.3.0-x64.exe` installer; it creates a Start Menu shortcut and offers to **Launch Digital Ink now** when setup finishes. Desktop shortcut and **Start with Windows** are optional (auto-start at login is **off by default**).

The installer bundles the local Python runtime (you do **not** install Python). It opens its own app-style Microsoft Edge/Chrome window and serves all files strictly from `127.0.0.1`. Writing is kept locally in a dedicated browser profile under `%LOCALAPPDATA%\DigitalInk\BrowserProfile`; uninstalling does not intentionally remove notes. An existing Edge or Chrome installation is required. Installer is not code-signed; Windows SmartScreen may warn. Update through GitHub Releases.

## Original icon and recorded typewriter sounds

![Original Digital Ink typewriter application icon](icons/icon-192.png)

The new app icon features a vintage mechanical typewriter and an aged sheet of paper; it is included as SVG and as PWA/Windows icon sizes. The writing experience now plays **authentic CC0 recordings** of three different key presses, a mechanical carriage return and paper movement. Samples are loaded on the first user interaction and kept in the offline app; if an audio file cannot be decoded, the existing procedural sound engine is used instead. Turn sound on/off with **sound**, and set the level with the slider.

Sound licensing and source credits: [Third-party notices](THIRD_PARTY_NOTICES.md).

## Persian mechanical letterpress (v1.3.1)

Persian notes now use **Parastoo**, a locally bundled, OFL-licensed printed-text font rather than the previous clean modern sans-serif. Each **connected Persian word** has subtle, reproducible height variation and uneven ribbon pressure, with light ink fading and texture. Arabic-script letters and ZWNJ remain connected; splitting and jiggling individual Persian letters would damage their shaping.

The effect appears in the typewriter paper **and** in saved paper previews, without altering the text saved in your notes. Latin typewriter text, selection, search, keyboard caret and export formats remain unchanged. All font files work offline.

## Features

- Persian and English writing with automatic text direction and joined Persian letters.
- Multiple notes, pinned notes, search, and a paper-folder archive.
- Automatic saving in your browser, focus mode, adjustable type size, and optional typing sounds.
- Lightweight Markdown-style headings, quotes, lists, and checkboxes.
- Export text or Markdown; back up and import all notes as JSON.
- Bundled fonts and offline support after the first successful service-worker installation.
- Installable as a standalone web app in supported browsers. No account or build step required.

## Public website · GitHub Pages

The web app runs directly from this repository, without a build step or a backend.

**Public URL:** https://ialirezaaa.github.io/typing-machine/

GitHub Pages is enabled and the first deployment succeeded. The site publishes the existing `index.html` from **main** → **/(root)** and redeploys on subsequent changes. The `.nojekyll` file keeps the site as plain static assets.

The website and the local launcher have **separate browser storage**. To move writing from localhost or a file-based version, export a JSON backup in the old version and import it on the website. The hosted version does not use `serve.py` or transfer notes to a server.

## Install on your phone and write offline

The public website can be installed on iPhone, iPad and supported Android phones. The entire app shell (HTML, fonts, icons, manifest and status script) is downloaded for offline use.

1. **While connected to the internet**, open [Typing Machine](https://ialirezaaa.github.io/typing-machine/).
2. **iPhone/iPad:** In **Safari**, tap **Share → Add to Home Screen → Add**. **Android:** In Chrome, choose **Install app** or **Add to Home screen**.
3. Launch Typing Machine from its **home-screen icon** while online, and wait for the small **offline ready** indicator at the bottom-left.
4. Turn on **Airplane Mode**, close and reopen the installed app, and continue typing. The indicator changes to **working offline**.

If the indicator says **offline not ready**, reconnect to the internet and use **Help → Check / repair**. The cache is verified on launch and can repair missing files. The offline copy may be evicted by the device under storage pressure; it cannot be guaranteed indefinitely.

Notes are saved in the device's browser storage, **not uploaded** to GitHub or a server. Home-screen apps and Safari may have separate storage; notes do not automatically transfer or sync. Use **Save & backup → JSON** regularly, especially before clearing website data or reinstalling the app.

## Digital Ink on phones

**Mobile paper-folder refresh (v1.2.2):** Saved notes sit on portrait-sized sheets whose lower edges tuck into the manila folder. The compact search and backup flap now touches the papers, eliminating the large blank gap. Even a single blank note shows the edges of its paper stack (decorative backing sheets, not additional saved notes).

**If Safari still shows the old layout**, open the [fresh site URL](https://ialirezaaa.github.io/typing-machine/?v=1.2.2) while online and refresh. This release uses versioned CSS and JavaScript links to bypass older service-worker caches. For a Home Screen installation, select **Help → Check for updates → Install ready update** when offered. **Do not clear Safari's website data to fix the layout**: it can delete your locally stored notes. Export **Save & backup → JSON** before reinstalling or changing storage.


The home-screen app now has a tactile, horizontally swipeable paper-folder archive, a keyboard-aware visible typing line on iOS, and a scrollable **Save & backup** panel. On iPhone, exports can use the iOS **Share / Save to Files** sheet; supported browsers use the normal download option otherwise. The original note storage keys are preserved across the rename from Lamplight.

When a newer release is marked **final**, open **Help → Check for updates**. Once all files are ready, select **Install ready update** or the top-left **update** button. Updates never deliberately interrupt typing.

**Prebuilt release:** the checked-in [`dist/`](dist) directory is a complete static build with fonts and icons. Recreate it with `node scripts/build.mjs`; verify using `node scripts/build.mjs --check`. GitHub Actions also provides a downloadable build artifact. See the [release and mobile update guide](docs/releasing.md).

## Run locally

Download or clone this repository, then open `index.html` in a modern browser. For installation and offline caching, use Python 3:

```sh
git clone https://github.com/iAlirezaaa/typing-machine.git
cd typing-machine
python serve.py
```

Open **http://127.0.0.1:8765/**. The server listens only on your computer. On Windows, `TypingMachine.bat` opens Chrome in an app window and starts the local server when it finds Python. `Lamplight.bat` is kept for older shortcuts.

The app can also be served by a static web host over HTTPS. Installation availability depends on the browser.

## Keyboard shortcuts

Use Command instead of Ctrl on macOS.

| Shortcut | Action |
| --- | --- |
| Ctrl+K | Notes drawer |
| Alt+N | New note |
| Ctrl+F | Find in current note |
| Ctrl+S | Export / import panel |
| Ctrl+Shift+S | Back up all notes |
| Ctrl+. | Focus mode |
| Ctrl+; | Toggle sound |
| Ctrl+, | Mechanism settings |
| Alt+R | Change text direction |
| Alt+T | Change typeface |
| Ctrl+/ | Help and more shortcuts |

## Persian writing

![Typing Machine with a Persian sample note](docs/screenshots/persian.jpg)

## Your notes

Notes and settings are stored in this browser's local storage. There is no cloud sync or analytics in the app. Different browsers, profiles, and website addresses have separate storage. Clearing site data can erase your notes, so export a JSON backup regularly.

For users of the original Lamplight file version, the Windows launcher supports a one-time transfer to the local server. The `lamplight.*` storage keys and JSON backup format are retained for compatibility. Local migration files, historical snapshots, and personal backups are excluded from this repository. Screenshots show fictional sample text.

## Project layout

- `index.html`: interface, styles, editor, and generated typing sounds.
- `fonts/`: local fonts and their licenses.
- `icons/`, `manifest.webmanifest`, `sw.js`: install and offline assets.
- `serve.py`: optional local server and legacy-note migration.
- `docs/screenshots/`: actual application screenshots.

## Contributing and license

Bug reports and pull requests are welcome. Include your browser, operating system, and steps to reproduce; use sample notes rather than private writing.

Application code: [MIT](LICENSE). Fonts retain their original licenses; see [third-party notices](THIRD_PARTY_NOTICES.md).
