import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = name => readFileSync(new URL("../" + name, import.meta.url), "utf8");

test("Mobile archive and save dialogs have separate scrollable layouts", () => {
  const css = read("mobile.css");
  for (const selector of ["#drawer #shelf", "#savePanel, #panel", "#drawer .leaf .acts"]) {
    assert.ok(css.includes(selector), selector);
  }
  assert.match(css, /overflow-y: auto/);
});
test("Digital Ink branding preserves old note storage", () => {
  const html = read("index.html");
  const manifest = JSON.parse(read("manifest.webmanifest"));
  assert.equal(manifest.short_name, "Digital Ink");
  assert.match(html, /DIGITAL INK<\/span>/);
  assert.match(html, /lamplight\.notes\.v1/);
  assert.match(html, /digital-ink-backup\.json/);
});
test("Only finalized releases are eligible for in-app updates", () => {
  const release = JSON.parse(read("release.json"));
  const html = read("index.html");
  const js = read("offline-pwa.js");
  assert.equal(release.status, "final");
  assert.ok(html.includes('name="app-version" content="' + release.version + '"'));
  for (const p of ["release.json", "ACTIVATE_UPDATE", "digitalink:before-update"]) assert.ok(js.includes(p));
  for (const p of ["id=\"checkUpdates\"", "id=\"applyUpdate\"", "id=\"btnUpdate\""]) assert.ok(html.includes(p));
});
test("Service worker doesn't force activation while writing", () => {
  const worker = read("sw.js");
  assert.ok(worker.includes('event.data?.type === "ACTIVATE_UPDATE"'));
  assert.ok(worker.includes("event.waitUntil(self.skipWaiting())"));
  assert.ok(!worker.includes("await self.skipWaiting();"));
  assert.ok(worker.includes('"./mobile.css"'));
});
