#!/usr/bin/env python3
"""Vendor a reproducible, OFL-licensed Persian print face for Digital Ink.

Download the Parastoo variable face and OFL text from the official Google Fonts
repository. Verify *Git blob* SHA-1s before converting to a local WOFF2.
Never load fonts from a CDN at application runtime.
"""
from __future__ import annotations

import hashlib
import io
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/parastoo/"
FONTS = ROOT / "fonts"
FILES = {
    "Parastoo[wght].ttf": "a6732f620f5097720283460b76d83135585ec6ea",
    "OFL.txt": "734aecb510ed9b82393c4fa102eafec3885669f1",
}

def download_verified(name: str) -> bytes:
    request = Request(URL + quote(name), headers={"User-Agent": "DigitalInk-PersianType/1.3.1"})
    with urlopen(request, timeout=35) as response:
        data = response.read()
    actual = hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\0" + data).hexdigest()
    if actual != FILES[name]:
        raise RuntimeError(f"Unverified Parastoo upstream file {name}: {actual}")
    return data

def main() -> None:
    source = download_verified("Parastoo[wght].ttf")
    license_text = download_verified("OFL.txt")
    assert b"SIL OPEN FONT LICENSE" in license_text
    font = TTFont(io.BytesIO(source))
    if "fvar" not in font:
        raise RuntimeError("Expected Parastoo variable weight font")
    weights = [a for a in font["fvar"].axes if a.axisTag == "wght"]
    if len(weights) != 1 or weights[0].minValue > 400 or weights[0].maxValue < 700:
        raise RuntimeError("Parastoo weight range must include 400-700")
    font.flavor = "woff2"
    out = FONTS / "Parastoo-Persian-Typewriter.woff2"
    font.save(out)
    (FONTS / "licenses").mkdir(parents=True, exist_ok=True)
    (FONTS / "licenses" / "Parastoo-OFL.txt").write_bytes(license_text)
    print(f"Verified Parastoo OFL source; wrote {out.name} ({out.stat().st_size} bytes)")

if __name__ == "__main__":
    main()
