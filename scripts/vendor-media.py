#!/usr/bin/env python3
"""Vendor audited CC0 sound recordings and render original app icon artwork.

GitHub Actions runs this script with network access, verifies immutable Git blob
SHA-1 IDs from the upstream CC0 source, and commits assets to this branch.
The app itself makes no third-party requests; all audio works offline.
"""
from __future__ import annotations

import base64
import hashlib
import io
from pathlib import Path
import time
from urllib.request import Request, urlopen
import wave

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "icons"
SOUNDS = ROOT / "sounds"
DIST = ROOT / "dist"

# Upstream: https://github.com/Appletrumpet/Typewriter
# The upstream README attributes each item to a CC0 Freesound recording.
RECORDINGS = {
    "key-1.wav": ("key_1.wav", "ae08a68008442351594ffabdcda79ca379057b4f"),
    "key-2.wav": ("key_2.wav", "457503a68a233df68681e7dec79fb35ede0833e4"),
    "key-3.wav": ("key_3.wav", "4c9de4418c88fdd0e11261df4cf54161ca73ea28"),
    "carriage-return.wav": ("return.wav", "532f712c68643e5b78f2e3cd299e1a587a9952ef"),
    "paper-select.wav": ("paper_select.wav", "ada038d891744a5ed9feda98cfdfd26b3d8ba027"),
}
UPSTREAM = "https://raw.githubusercontent.com/Appletrumpet/Typewriter/main/public/sfx/"

def fetch_verified(name: str, blob_sha: str) -> bytes:
    request = Request(UPSTREAM + name, headers={"User-Agent": "DigitalInk-AssetVendor/1.3"})
    err = None
    for attempt in range(3):
        try:
            with urlopen(request, timeout=30) as response:
                data = response.read()
            git_sha = hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()
            if git_sha != blob_sha:
                raise RuntimeError(f"Source checksum mismatch for {name}: {git_sha}")
            return data
        except Exception as exc:
            err = exc
            if attempt < 2:
                time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"Cannot download verified CC0 recording {name}: {err}")

def render_icon() -> None:
    art_b64 = (ICONS / "icon-art.webp.b64").read_text(encoding="ascii").strip()
    data = base64.b64decode(art_b64, validate=True)
    digest = hashlib.sha256(data).hexdigest()
    expected = "5622e90d39dff7dbd29c796e278d05042684c7d757f65e36a50fae06b90d45bb"
    if digest != expected:
        raise RuntimeError(f"Generated icon artwork did not match source checksum: {digest}")
    base = Image.open(io.BytesIO(data)).convert("RGB")
    if base.size != (128, 128):
        raise RuntimeError(f"Unexpected source icon dimensions {base.size}")
    bg = (228, 185, 128)
    small = base.resize((192, 192), Image.Resampling.LANCZOS)
    large = base.resize((512, 512), Image.Resampling.LANCZOS)
    small.save(ICONS / "icon-192.png", optimize=True)
    large.save(ICONS / "icon-512.png", optimize=True)
    maskable = Image.new("RGB", (512, 512), bg)
    safe = base.resize((384, 384), Image.Resampling.LANCZOS)
    maskable.paste(safe, (64, 64))
    maskable.save(ICONS / "icon-maskable-512.png", optimize=True)
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" '
        'aria-label="Digital Ink — Vintage typewriter">'
        '<title>Digital Ink — Vintage typewriter</title>'
        '<image width="512" height="512" href="data:image/webp;base64,'
        + art_b64 + '"/></svg>\n'
    )
    (ICONS / "icon.svg").write_text(svg, encoding="utf-8")

def download_sounds() -> None:
    SOUNDS.mkdir(exist_ok=True)
    for dest, (source, sha) in RECORDINGS.items():
        data = fetch_verified(source, sha)
        path = SOUNDS / dest
        path.write_bytes(data)
        try:
            with wave.open(io.BytesIO(data)) as wav:
                duration = wav.getnframes() / wav.getframerate()
        except wave.Error as exc:
            raise RuntimeError(f"Invalid WAV from upstream: {source}: {exc}") from exc
        if not 0.02 < duration < 7:
            raise RuntimeError(f"Audio duration outside expected range for {source}: {duration:.2f}s")
        print(f"{dest}: {len(data)} bytes, {duration:.3f}s (CC0 upstream)")

if __name__ == "__main__":
    render_icon()
    download_sounds()
    print("Original Digital Ink icon and verified CC0 typewriter sound pack prepared")
