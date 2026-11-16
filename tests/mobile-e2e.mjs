import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8765/";

test("mobile archive, saving, downloads, and offline reload", { timeout: 125000 }, async () => {
  const server = spawn("python3", ["-m", "http.server", "8765", "--bind", "127.0.0.1"], {
    stdio: "ignore"
  });
  let browser;
  try {
    let available = false;
    for (let i = 0; i < 120; i++) {
      try { const r = await fetch(BASE); if (r.ok) { available = true; break; } } catch {}
      await delay(100);
    }
    assert.ok(available, "Local test server failed to start");
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
      isMobile: true, hasTouch: true, acceptDownloads: true
    });
    // Seed before the app boots. Reloading after injection would trigger the
    // editor's beforeunload persistence and overwrite this test fixture.
    await context.addInitScript(() => {
      if (sessionStorage.getItem("digitalink-smoke-seeded")) return;
      const ts = Date.now();
      const notes = [
        { id: "mobile-one", text: "# First note\nEnglish words", created: ts - 12000, updated: ts - 12000, pinned: false, caret: 0 },
        { id: "mobile-two", text: "# یادداشت فارسی\nمتن برای تست", created: ts - 11000, updated: ts - 10000, pinned: true, caret: 0 }
      ];
      localStorage.setItem("lamplight.notes.v1", JSON.stringify(notes));
      localStorage.setItem("lamplight.settings.v1", JSON.stringify({ current: "mobile-one" }));
      sessionStorage.setItem("digitalink-smoke-seeded", "yes");
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#btnNotes");

    console.log("MOBILE UI LAYOUT", JSON.stringify(await page.evaluate(() => {
      const selectors = ["#hudL", "#hudR", "#btnNotes", "#btnDir"];
      const rects = {};
      for (const sel of selectors) {
        const e = document.querySelector(sel), r = e.getBoundingClientRect();
        rects[sel] = { x:r.x, y:r.y, w:r.width, h:r.height, z:getComputedStyle(e).zIndex };
      }
      const b = document.querySelector("#btnNotes").getBoundingClientRect();
      const cover = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return { innerWidth, media:matchMedia("(max-width: 680px)").matches,
        mobileCss: [...document.styleSheets].some(x => x.href?.endsWith("/mobile.css")),
        covering: cover?.id || cover?.tagName, rects };
    })));
    // Accessible, one-tap archive cards instead of miniature overlapping sheets.
    await page.locator("#btnNotes").click();
    await page.waitForSelector("body.drawer");
    assert.equal(await page.locator("#shelf .leaf").count(), 2);
    const layout = await page.locator("#shelf").evaluate(el => ({
      scrollable: getComputedStyle(el).overflowY,
      direction: getComputedStyle(el).flexDirection
    }));
    assert.equal(layout.scrollable, "auto");
    assert.equal(layout.direction, "column");
    await page.locator('#shelf .leaf[data-id="mobile-two"] .pg').click();
    await page.waitForFunction(() => !document.body.classList.contains("drawer"));

    // Touch paper: swiping reads older lines; a tap returns to the final line
    // and focuses the hidden textarea (the mobile keyboard input).
    const longNote = Array.from({ length: 42 }, (_, i) => "Test line " + (i + 1)).join("\\n");
    await page.evaluate(text => {
      const input = document.getElementById("input");
      input.value = text;
      input.setSelectionRange(text.length, text.length);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }, longNote);
    const sheetBefore = await page.locator("#sheet").evaluate(el => el.style.transform);
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 200, y: 270 }] });
    for (const y of [310, 360, 410, 470]) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 200, y }] });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    const sheetAfter = await page.locator("#sheet").evaluate(el => el.style.transform);
    assert.notEqual(sheetBefore, sheetAfter, "Swiping over the writing surface should move the paper");
    await page.touchscreen.tap(200, 270);
    const caret = await page.evaluate(() => ({
      start: document.getElementById("input").selectionStart,
      end: document.getElementById("input").value.length,
      focused: document.activeElement?.id === "input"
    }));
    assert.equal(caret.start, caret.end, "Tap on the paper should jump to the final line");
    assert.equal(caret.focused, true, "Tap should focus the keyboard input");

    // A backup must stay usable at phone height and contain all original notes.
    await page.locator("#btnSave").click();
    await page.waitForSelector("body.saving");
    const panel = await page.locator("#savePanel").boundingBox();
    assert.ok(panel && panel.y >= -2 && panel.y + panel.height <= 846,
      "Save panel must fit inside the mobile viewport: " + JSON.stringify(panel));
    const downloadPromise = page.waitForEvent("download", { timeout: 20000 });
    await page.locator('#savePanel [data-act="backup"]').click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), "digital-ink-backup.json");
    const { readFile } = await import("node:fs/promises");
    const data = JSON.parse(await readFile(await download.path(), "utf8"));
    assert.equal(data.notes.length, 2);
    assert.equal(data.app, "digital-ink");

    // Updating is user-controlled: no unexpected reload when checking.
    await page.locator("#spClose").click();
    await page.locator("#btnHelp").click();
    assert.equal(await page.locator(".desktop-shortcuts").isVisible(), false,
      "Keyboard-only shortcuts must not appear in the mobile help");
    assert.equal(await page.locator(".mobile-touch-guide").isVisible(), true,
      "Mobile help should explain touch gestures");
    await page.locator("#checkUpdates").click();
    await page.waitForFunction(() => {
      const el = document.querySelector("#appUpdateStatus");
      return el && /Up to date|Couldn't check|downloading/.test(el.textContent);
    }, { timeout: 15000 });
    assert.equal(await page.locator("#applyUpdate").isVisible(), false);

    // Cache should restore the installed page without a connection.
    await page.locator("#helpClose").click();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, { timeout: 20000 });
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    assert.match(await page.title(), /Digital Ink/);
    assert.ok((await page.locator("#btnNotes").count()) === 1);
    assert.deepEqual(errors, [], "No runtime JavaScript errors");
  } finally {
    await browser?.close();
    server.kill("SIGTERM");
  }
});
