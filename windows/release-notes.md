# Digital Ink — Windows + mobile release

## Windows (64-bit)
Download `DigitalInk-Setup-1.3.1-x64.exe` from the assets below. Run Setup, choose whether you want a desktop shortcut or **launch at Windows sign-in** (off by default), and select **Launch Digital Ink now** after installation.

The installer bundles its Python runtime. **You do not need to install Python.** A current Microsoft Edge or Google Chrome installation is used to show the application in a standalone app window. It works offline because all app files are installed locally, and the server listens only on `127.0.0.1`.

**Privacy and updates:** Notes stay inside `%LOCALAPPDATA%\DigitalInk\BrowserProfile`; uninstalling the app does not intentionally delete your notes. A Windows installer update does not automatically transfer notes from the legacy `file://` or `localhost` version. Export **Save & backup → JSON** in the old version, then import into the newly installed version. Installer updates are distributed through this GitHub Releases page.

The installer is built automatically on Windows in GitHub Actions and is currently **unsigned**, so Windows SmartScreen may display an unrecognized publisher warning. Only download the installer from this repository's official Releases page.

## Persian letterpress (1.3.1)

Persian text on the paper and in saved note previews now uses the locally bundled OFL Parastoo printed face with deterministic ink pressure, slight word-level baseline irregularity and faded ribbon grain. Connected Persian letters/ZWNJ remain intact. Latin typing and saved text formats are unchanged. The font works fully offline.

## New original icon and recorded typewriter audio

Original vintage typewriter icon appears on the website, installed phone app and Windows installer. Three CC0 recorded keystrokes, a carriage return and paper sliding are bundled locally and play without an internet connection. The existing synthesizer remains available as fallback. See [asset credits](https://github.com/iAlirezaaa/typing-machine/blob/main/THIRD_PARTY_NOTICES.md).

## Phone PWA
Open https://ialirezaaa.github.io/typing-machine/ on Safari (iOS) or Chrome (Android) and add it to the Home Screen. Open the app online once until the offline indicator says **offline ready**. Then it can open without internet while its local cache is retained. On mobile, keyboard-only shortcut tables are hidden; swipe to read old lines and tap the paper to resume typing at the end.

## Test and screenshots
The repository [README](https://github.com/iAlirezaaa/typing-machine#readme) contains authentic English/Persian screenshots, links, offline instructions and an illustrated overview.

---

## فارسی
نصب‌کنندهٔ ویندوز `DigitalInk-Setup-1.3.1-x64.exe` را از فایل‌های همین ریلیز دریافت کنید. پس از نصب، برنامه به‌صورت پیش‌فرض اجرا می‌شود. گزینهٔ **Start with Windows** اختیاری است و خودکار فعال نمی‌شود. برای اجرای برنامه نیازی به نصب Python نیست؛ Microsoft Edge یا Google Chrome باید موجود باشد.

یادداشت‌ها در پوشهٔ اختصاصی کاربر ذخیره می‌شوند. برای انتقال یادداشت‌های نسخه‌های قبلی، از فایل پشتیبان JSON استفاده کنید. نصب‌کننده فعلاً امضای دیجیتال ندارد.

نسخهٔ موبایل نیز از صفحهٔ اصلی گوشی باز می‌شود، بدون اینترنت کار می‌کند، برای مرور متن از لمس و کشیدن انگشت پشتیبانی می‌کند و با لمس صفحه آمادهٔ نوشتن در انتهای متن می‌شود.
