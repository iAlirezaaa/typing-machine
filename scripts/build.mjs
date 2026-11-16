// Reproducible, dependency-free static distribution builder for Digital Ink.
// Usage: node scripts/build.mjs [--check]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const files = [
  ".nojekyll", "index.html", "mobile.css", "offline-pwa.js",
  "sw.js", "manifest.webmanifest", "release.json",
  "LICENSE", "THIRD_PARTY_NOTICES.md"
];
const dirs = ["fonts", "icons"];

const sourceFiles = [];
for (const name of files) sourceFiles.push(name);
for (const dir of dirs) {
  const visit = subdir => {
    for (const entry of fs.readdirSync(path.join(root, subdir), { withFileTypes: true })) {
      const rel = path.posix.join(subdir, entry.name);
      if (entry.isDirectory()) visit(rel);
      else if (entry.isFile()) sourceFiles.push(rel);
    }
  };
  visit(dir);
}

const release = JSON.parse(fs.readFileSync(path.join(root, "release.json"), "utf8"));
assert.equal(release.status, "final", "Only finalized releases may be built");
assert.match(release.version, /^\d+\.\d+\.\d+$/, "Release version must be numeric");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.ok(html.includes('name="app-version" content="' + release.version + '"'),
  "HTML app version must match the finalized release");

const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
for (const match of worker.matchAll(/"(\.\/[^"]+)"/g)) {
  const rel = match[1].slice(2);
  assert.ok(sourceFiles.includes(rel), "Missing PWA asset " + rel);
}
const buildInfo = JSON.stringify({
  application: "Digital Ink", version: release.version, status: release.status,
  source: "iAlirezaaa/typing-machine", format: "static-pwa"
}, null, 2) + "\n";

if (process.argv.includes("--check")) {
  const expected = new Set([...sourceFiles, "build-info.json"]);
  const actual = new Set();
  const collect = (dir, prefix = "") => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = path.posix.join(prefix, entry.name);
      if (entry.isDirectory()) collect(path.join(dir, entry.name), rel);
      else if (entry.isFile()) actual.add(rel);
    }
  };
  assert.ok(fs.existsSync(dist), "dist/ does not exist");
  collect(dist);
  assert.deepEqual([...actual].sort(), [...expected].sort(), "dist/ file list is stale");
  for (const rel of sourceFiles) {
    assert.ok(fs.readFileSync(path.join(root, rel)).equals(fs.readFileSync(path.join(dist, rel))),
      "Stale or modified dist/" + rel);
  }
  assert.equal(fs.readFileSync(path.join(dist, "build-info.json"), "utf8"), buildInfo);
  console.log("Digital Ink " + release.version + ": dist/ matches finalized source (" + expected.size + " files).");
} else {
  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });
  for (const rel of sourceFiles) {
    const target = path.join(dist, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(root, rel), target);
  }
  fs.writeFileSync(path.join(dist, "build-info.json"), buildInfo);
  console.log("Built Digital Ink " + release.version + " in dist/ (" + (sourceFiles.length + 1) + " files).");
}
