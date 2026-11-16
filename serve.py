"""Typing Machine (Lamplight) local web server.

Serves the app at http://127.0.0.1:8765/ (this computer only) so it can run as an
installable, offline-capable web application, and carries notes over once from the
old file:// version of the app.

Run:  python serve.py            (or use TypingMachine.bat)
"""
import http.server
import json
import os
import socketserver
import sys
from urllib.parse import unquote, urlsplit

HOST, PORT = "127.0.0.1", 8765
ROOT = os.path.dirname(os.path.abspath(__file__))
MIGRATE = os.path.join(ROOT, "migrate.json")      # one-time hand-over of notes from file:// to http://


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".webmanifest": "application/manifest+json",
        ".woff2": "font/woff2",
        ".js": "text/javascript",
        ".svg": "image/svg+xml",
        ".json": "application/json",
    }

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        # the old file:// page (origin "null") posts its notes here; nothing else is exposed
        if self.path.startswith("/api/"):
            origin = self.headers.get("Origin")
            if origin in ("null", f"http://{HOST}:{PORT}"):
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
        if self.path in ("/", "/index.html", "/sw.js", "/manifest.webmanifest"):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, *a):          # keep quiet when started from the launcher
        pass

    def _json(self, code, obj=None):
        body = json.dumps(obj or {}).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _allowed_origin(self):
        return self.headers.get("Origin") in (None, "null", f"http://{HOST}:{PORT}")

    def do_GET(self):
        if self.path.startswith("/api/") and not self._allowed_origin():
            return self._json(403, {"error": "origin"})
        if self.path.split("?")[0] == "/api/ping":
            return self._json(200, {"app": "lamplight"})
        if self.path.split("?")[0] == "/api/migrate":
            if os.path.exists(MIGRATE):
                with open(MIGRATE, "r", encoding="utf-8") as f:
                    return self._json(200, json.load(f))
            return self._json(404, {"none": True})
        path = unquote(urlsplit(self.path).path)
        parts = path.split("/")
        if any(part.startswith(".") for part in parts if part):
            return self._json(404, {})
        allowed = path in ("/", "/index.html", "/sw.js", "/manifest.webmanifest")
        allowed = allowed or path.startswith(("/fonts/", "/icons/"))
        if not allowed:
            return self._json(404, {})
        return super().do_GET()

    def do_POST(self):
        if not self._allowed_origin():
            return self._json(403, {"error": "origin"})
        if self.path.split("?")[0] != "/api/migrate":
            return self._json(404, {})
        try:
            n = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            return self._json(400, {"error": "size"})
        if n <= 0 or n > 50 * 1024 * 1024:
            return self._json(400, {"error": "size"})
        try:
            data = json.loads(self.rfile.read(n).decode("utf-8"))
            assert isinstance(data.get("notes"), list)
        except Exception:
            return self._json(400, {"error": "bad data"})
        # never overwrite a hand-over that has not been picked up yet
        if not os.path.exists(MIGRATE):
            with open(MIGRATE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False)
        return self._json(200, {"ok": True})

    def do_DELETE(self):
        if not self._allowed_origin():
            return self._json(403, {"error": "origin"})
        if self.path.split("?")[0] == "/api/migrate" and os.path.exists(MIGRATE):
            # keep a copy rather than deleting outright
            os.replace(MIGRATE, os.path.join(ROOT, "migrate.done.json"))
        return self._json(200, {"ok": True})

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = False


if __name__ == "__main__":
    try:
        with Server((HOST, PORT), Handler) as httpd:
            print(f"Typing Machine is running at http://{HOST}:{PORT}/  (Ctrl+C to stop)")
            httpd.serve_forever()
    except OSError:
        # already running (port in use) - that's fine, the launcher just opens the app
        print(f"Typing Machine server already running on port {PORT}.")
        sys.exit(0)
