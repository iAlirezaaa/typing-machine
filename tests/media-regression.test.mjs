import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = p => readFileSync(path.join(root, p));
const RECORDINGS = new Map([
  ["sounds/key-1.wav", "ae08a68008442351594ffabdcda79ca379057b4f"],
  ["sounds/key-2.wav", "457503a68a233df68681e7dec79fb35ede0833e4"],
  ["sounds/key-3.wav", "4c9de4418c88fdd0e11261df4cf54161ca73ea28"],
  ["sounds/carriage-return.wav", "532f712c68643e5b78f2e3cd299e1a587a9952ef"],
  ["sounds/paper-select.wav", "ada038d891744a5ed9feda98cfdfd26b3d8ba027"],
]);

function gitBlobId(buffer) {
  const header = Buffer.from("blob " + buffer.length + "\0");
  return createHash("sha1").update(header).update(buffer).digest("hex");
}

test("Five real CC0 recordings are exactly the reviewed upstream blobs", () => {
  for (const [name, sha] of RECORDINGS) {
    const bytes = read(name);
    assert.ok(bytes.length > 3000, "Sound too short: " + name);
    assert.equal(bytes.toString("ascii", 0, 4), "RIFF", name);
    assert.equal(bytes.toString("ascii", 8, 12), "WAVE", name);
    assert.equal(gitBlobId(bytes), sha, "Bundled sound changed without an attribution review: " + name);
    assert.deepEqual(bytes, read("dist/" + name), "Distribution is stale: " + name);
  }
});

test("App icon artwork is original, deterministic and installed at every size", () => {
  const source = read("icons/icon-art.webp.b64").toString("ascii").trim();
  const bytes = Buffer.from(source, "base64");
  assert.equal(createHash("sha256").update(bytes).digest("hex"),
    "5622e90d39dff7dbd29c796e278d05042684c7d757f65e36a50fae06b90d45bb");
  const svg = read("icons/icon.svg").toString("utf8");
  assert.ok(svg.includes('data:image/webp;base64,' + source));
  for (const [name, size] of [
    ["icons/icon-192.png", 192],
    ["icons/icon-512.png", 512],
    ["icons/icon-maskable-512.png", 512],
  ]) {
    const png = read(name);
    assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
    assert.deepEqual(png, read("dist/" + name));
  }
  assert.deepEqual(read("icons/icon.svg"), read("dist/icons/icon.svg"));
});

test("Recorded sounds are used locally with a synthetic fallback and can be muted", () => {
  const html = read("index.html").toString("utf8");
  const sw = read("sw.js").toString("utf8");
  const manifest = JSON.parse(read("manifest.webmanifest").toString("utf8"));
  assert.match(html, /function playRecorded\(/);
  assert.match(html, /if \(playRecorded\("keys"/);
  assert.match(html, /ac\.decodeAudioData/);
  assert.match(html, /settings\.sound/);
  assert.match(html, /lastPhysicalKeyAt/);
  assert.match(html, /src="offline-pwa\.js\?v=1\.3\.0"/);
  assert.match(sw, /typing-machine-v9/);
  for (const name of RECORDINGS.keys()) {
    assert.ok(sw.includes('./' + name), "Missing offline sound: " + name);
  }
  assert.ok(manifest.icons.some(x => x.purpose === "maskable"));
  assert.ok(manifest.icons.every(x => x.src.endsWith("?v=1.3.0")));
});

test("Windows local server allows bundled WAV files without a backend dependency", () => {
  const py = read("serve.py").toString("utf8");
  assert.ok(py.includes('"/sounds/"'), "Local Windows server needs a sounds route");
  assert.ok(py.includes('".wav": "audio/wav"'));
  assert.ok(existsSync(path.join(root, "THIRD_PARTY_NOTICES.md")));
});
