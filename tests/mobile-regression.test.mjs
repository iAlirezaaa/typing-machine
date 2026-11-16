import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = name => readFileSync(new URL("../" + name, import.meta.url), "utf8");

test("Mobile archive is swipeable paper while save dialogs remain scrollable", () => {
  const css = read("mobile.css");
  for (const selector of ["#drawer #shelf", "#savePanel, #panel", "#drawer .leaf .acts"]) {
    assert.ok(css.includes(selector), selector);
  }
  assert.match(css, /overflow-y: auto/);
  assert.match(css, /scroll-snap-type: x mandatory/);
  assert.match(css, /touch-action: pan-x/);
  assert.ok(css.includes('--pocketH: clamp(208px, 31dvh, 286px)'));
  assert.ok(css.includes('top: max(calc(48px + env(safe-area-inset-top, 0px))'));
  assert.ok(css.includes('calc(var(--folderEdge) - var(--leafH) + 40px)'));
  assert.ok(css.includes('.folder-back::before'));
  assert.ok(css.includes('.folder-back::after'));
  assert.match(css, /body\.mobile-editing #caret::before/);
  assert.match(css, /body\.mobile-keyboard #hudR/);
  assert.doesNotMatch(css, /flex-direction: column; gap: 9px;/);
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


test("Mobile typing line follows the visible iOS viewport", () => {
  const html = read("index.html");
  assert.match(html, /window\.visualViewport\.addEventListener\("resize"/);
  assert.match(html, /window\.visualViewport\.addEventListener\("scroll"/);
  assert.match(html, /const safeBottom = vTop \+ vHeight -/);
  assert.match(html, /classList\.add\("mobile-editing"\)/);
  assert.match(html, /const left = el\.offsetLeft \+ el\.offsetWidth \/ 2 - shelf\.clientWidth \/ 2/);
  assert.match(html, /mobile-archive-hint/);
  assert.ok(html.includes('href="mobile.css?v=1.3.0"'));
  assert.ok(html.includes('src="offline-pwa.js?v=1.3.0"'));
  assert.match(html, /Tap the paper to return to the last line/);
});

test("New worker repairs CSS/JS staleness on future releases", () => {
  const sw = read("sw.js");
  assert.match(sw, /typing-machine-v8/);
  assert.ok(sw.includes('"./mobile.css?v=1.3.0"'));
  assert.ok(sw.includes('"./offline-pwa.js?v=1.3.0"'));
  assert.ok(sw.includes('fetch(request, { cache: "no-store" })'));
});
