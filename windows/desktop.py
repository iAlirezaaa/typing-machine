"""Digital Ink Windows desktop launcher (packaged by PyInstaller).

Runs the bundled web app privately on 127.0.0.1 and opens it in a separate
Edge/Chrome app-profile window. It needs no Python installation on the user's PC.
Notes remain in the dedicated browser profile under LOCALAPPDATA, not Program Files.
"""
from __future__ import annotations

import ctypes
import json
import os
from pathlib import Path
import subprocess
import sys
import threading
from urllib.error import URLError
from urllib.request import urlopen

# The parent folder of bin/DigitalInk.exe holds web/, which is installed by
# Inno Setup. For development the repository root is one level above windows/.
if getattr(sys, "frozen", False):
    ROOT = Path(sys.executable).resolve().parent.parent / "web"
else:
    ROOT = Path(__file__).resolve().parent.parent

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import serve  # noqa: E402

URL = f"http://{serve.HOST}:{serve.PORT}/"
DATA = Path(os.environ.get("LOCALAPPDATA") or str(Path.home())) / "DigitalInk"
PROFILE = DATA / "BrowserProfile"


def message(text: str, title: str = "Digital Ink") -> None:
    if os.name == "nt":
        ctypes.windll.user32.MessageBoxW(None, text, title, 0x10)
    else:
        print(f"{title}: {text}", file=sys.stderr)


def browser_path() -> Path | None:
    """Use a browser already installed on Windows, not an external download."""
    roots = [
        os.environ.get("PROGRAMFILES", ""),
        os.environ.get("PROGRAMFILES(X86)", ""),
        os.environ.get("LOCALAPPDATA", ""),
    ]
    relative = [
        Path("Microsoft/Edge/Application/msedge.exe"),
        Path("Google/Chrome/Application/chrome.exe"),
    ]
    for rel in relative:
        for root in roots:
            if root:
                p = Path(root) / rel
                if p.is_file():
                    return p
    return None


def configure() -> None:
    if not (ROOT / "index.html").is_file():
        raise RuntimeError("The installed web files are missing. Reinstall Digital Ink.")
    DATA.mkdir(parents=True, exist_ok=True)
    PROFILE.mkdir(parents=True, exist_ok=True)
    serve.ROOT = str(ROOT)
    # Installation files may be read-only; migration data must never be written
    # inside Program Files / app bundles.
    serve.MIGRATE = str(DATA / "migrate.json")


def ping() -> bool:
    try:
        with urlopen(URL + "api/ping", timeout=1.3) as response:
            if response.status != 200:
                return False
            data = json.load(response)
            return data.get("app") == "digital-ink"
    except (OSError, ValueError, URLError):
        return False


def launch() -> int:
    configure()
    browser = browser_path()
    if browser is None:
        message("Microsoft Edge or Google Chrome is required to open Digital Ink.")
        return 2

    server = None
    thread = None
    try:
        # Keep the loopback port stable: localStorage is origin-specific.
        try:
            server = serve.Server((serve.HOST, serve.PORT), serve.Handler)
        except OSError as exc:
            if not ping():
                raise RuntimeError(
                    f"Port {serve.PORT} is in use by another application. "
                    "Close that application and retry."
                ) from exc
        if server is not None:
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
        cmd = [
            str(browser),
            f"--user-data-dir={PROFILE}",
            f"--app={URL}",
            "--new-window",
            "--no-first-run",
            "--no-default-browser-check",
        ]
        # A private profile gives Digital Ink a stable window and persistent
        # local notes, independent of the browser's normal/default profile.
        child = subprocess.Popen(cmd, close_fds=True)
        child.wait()
        return 0
    except Exception as exc:
        message(str(exc))
        return 1
    finally:
        if server is not None:
            server.shutdown()
            server.server_close()
        if thread is not None:
            thread.join(timeout=2)


def self_test() -> int:
    """CI smoke test: verify bundled assets and loopback-only server."""
    configure()
    for rel in ["index.html", "mobile.css", "offline-pwa.js", "sw.js",
                "manifest.webmanifest", "fonts/fonts.css", "icons/icon.svg"]:
        if not (ROOT / rel).is_file():
            raise RuntimeError("Missing bundled file: " + rel)
    # Use an ephemeral port, so the test can run without opening a browser.
    with serve.Server((serve.HOST, 0), serve.Handler) as httpd:
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        try:
            base = f"http://{serve.HOST}:{httpd.server_port}/"
            for rel in ["", "mobile.css", "offline-pwa.js", "fonts/fonts.css"]:
                with urlopen(base + rel, timeout=4) as response:
                    assert response.status == 200, rel
            assert httpd.server_address[0] == "127.0.0.1"
        finally:
            httpd.shutdown()
            thread.join(timeout=2)
    print("Digital Ink Windows executable self-test passed")
    return 0


if __name__ == "__main__":
    try:
        code = self_test() if "--self-test" in sys.argv else launch()
    except Exception as error:
        message(str(error))
        code = 1
    sys.exit(code)
