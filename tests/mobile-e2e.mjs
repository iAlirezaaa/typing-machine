import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
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
    // Saved notes are printed pages on a horizontally swipeable folder shelf,
    // not a vertical text list.
    await page.locator("#btnNotes").click();
    await page.waitForSelector("body.drawer");
    await page.waitForFunction(() => {
      const pocket = document.querySelector("#drawer .pocket").getBoundingClientRect();
      return Math.abs(pocket.bottom - innerHeight) < 3;
    }, null, { timeout: 5000 }); // wait until the folder's physical entrance settles
    assert.equal(await page.locator("#shelf .leaf").count(), 2);
    const layout = await page.locator("#shelf").evaluate(el => ({
      overflowX: getComputedStyle(el).overflowX,
      overflowY: getComputedStyle(el).overflowY,
      direction: getComputedStyle(el).flexDirection,
      touchAction: getComputedStyle(el).touchAction,
      paperHeight: el.querySelector(".leaf")?.getBoundingClientRect().height,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth
    }));
    assert.equal(layout.overflowX, "auto");
    assert.equal(layout.overflowY, "hidden");
    assert.equal(layout.direction, "row");
    assert.equal(layout.touchAction, "pan-x");
    assert.ok(layout.paperHeight > 250, "Saved notes should look like full-size paper");
    assert.ok(layout.scrollWidth > layout.clientWidth, "Adjacent pages must be swipeable");
    const folderGeometry = await page.evaluate(() => {
      const box = selector => {
        const r = document.querySelector(selector).getBoundingClientRect();
        return { top:r.top, bottom:r.bottom, left:r.left, right:r.right,
          width:r.width, height:r.height };
      };
      return {
        width: innerWidth, height: innerHeight,
        paper: box("#shelf .leaf.center"),
        pocket: box("#drawer .pocket"),
        folder: box("#drawer .folder-back"),
        backingPaper: getComputedStyle(document.querySelector("#drawer .folder-back"), "::before").content,
        currentCss: [...document.querySelectorAll('link[rel="stylesheet"]')]
          .some(el => el.href.includes("mobile.css?v=1.3.0"))
      };
    });
    assert.ok(folderGeometry.currentCss, "The latest mobile stylesheet must bypass stale service worker caches");
    assert.ok(folderGeometry.paper.width >= folderGeometry.width * .64 &&
      folderGeometry.paper.width <= folderGeometry.width * .82,
      "Notes must look like portrait paper, not full-width cards: " + JSON.stringify(folderGeometry));
    assert.ok(folderGeometry.paper.height > 285, "Notes must be tall paper sheets");
    assert.ok(folderGeometry.pocket.top - folderGeometry.paper.bottom < 30 &&
      folderGeometry.pocket.top - folderGeometry.paper.bottom > -140,
      "The paper must enter the folder without a large empty vertical gap: " + JSON.stringify(folderGeometry));
    assert.notEqual(folderGeometry.backingPaper, "none", "Single-page folders still need physical paper edges");
    await mkdir("artifacts", { recursive: true });
    await page.screenshot({ path: "artifacts/mobile-folder-390x844.png", animations: "disabled" });


    // A hand swipe moves the paper shelf (not the page underneath).
    const cdp = await context.newCDPSession(page);
    const beforeSwipe = await page.locator("#shelf").evaluate(el => el.scrollLeft);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 95, y: 240 }] });
    for (const x of [140, 195, 250, 315]) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: 240 }] });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(300);
    const afterSwipe = await page.locator("#shelf").evaluate(el => el.scrollLeft);
    assert.notEqual(beforeSwipe, afterSwipe, "Finger swipe should change the selected paper");

    // First bring the selected paper to the center, then tap to open it.
    await page.locator("#shelf").evaluate(el => el.scrollTo({ left: 0, behavior: "instant" }));
    await page.waitForTimeout(180);
    await page.locator('#shelf .leaf[data-id="mobile-two"] .pg').click();
    await page.waitForFunction(() => !document.body.classList.contains("drawer"));

    // Touch paper: swiping reads older lines; a tap returns to the final line
    // and focuses the hidden textarea (the mobile keyboard input).
    const longNote = Array.from({ length: 42 }, (_, i) => "Test line " + (i + 1)).join("\n");
    await page.evaluate(text => {
      const input = document.getElementById("input");
      input.value = text;
      input.setSelectionRange(text.length, text.length);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }, longNote);
    const sheetBefore = await page.locator("#sheet").evaluate(el => el.style.transform);
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
    // Recorded key samples are part of the local PWA, not network streams.
    const recordedAudio = page.waitForResponse(r =>
      r.url().endsWith("/sounds/key-1.wav") && r.status() === 200, { timeout: 15000 });
    await page.keyboard.type("x", { delay: 60 });
    await recordedAudio;
    const clipDuration = await page.evaluate(async () => {
      const response = await fetch("sounds/key-1.wav");
      const bytes = await response.arrayBuffer();
      const audio = new (window.AudioContext || window.webkitAudioContext)();
      const buffer = await audio.decodeAudioData(bytes);
      await audio.close();
      return buffer.duration;
    });
    assert.ok(clipDuration > 0.02, "Real typewriter recording must decode correctly in the browser");

    const cursor = await page.locator("#caret").evaluate(el =>
      getComputedStyle(el, "::before").display);
    assert.equal(cursor, "block", "A dark typing caret must be visible on mobile");
    // Emulate the reduced visible area with the software keyboard open.
    await page.setViewportSize({ width: 390, height: 480 });
    await page.waitForTimeout(120);
    const writingLine = await page.evaluate(() => ({
      baseline: parseFloat(getComputedStyle(document.documentElement)
        .getPropertyValue("--typing-baseline")),
      visualBottom: visualViewport.offsetTop + visualViewport.height,
      machineTop: document.getElementById("machine").getBoundingClientRect().top
    }));
    assert.ok(writingLine.baseline < writingLine.visualBottom - 65,
      "The typing line must remain above the keyboard: " + JSON.stringify(writingLine));
    assert.ok(writingLine.machineTop < writingLine.visualBottom - 42,
      "The machine must not disappear behind the keyboard");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(120);

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

    // Reproduce the user's real one-page situation: no extra notes may be
    // invented just to make the folder look layered.
    await page.evaluate(() => {
      window.__noSave = true; // prevent the departing document overwriting the fixture
      const ts = Date.now();
      const one = [{ id: "single-page", text: "", created: ts, updated: ts, caret: 0, pinned: false }];
      localStorage.setItem("lamplight.notes.v1", JSON.stringify(one));
      localStorage.setItem("lamplight.settings.v1", JSON.stringify({ current: one[0].id }));
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("#btnNotes").click();
    await page.waitForSelector("body.drawer");
    await page.waitForFunction(() => {
      const pocket = document.querySelector("#drawer .pocket").getBoundingClientRect();
      return Math.abs(pocket.bottom - innerHeight) < 3;
    }, null, { timeout: 5000 }); // wait until the folder's physical entrance settles
    assert.equal(await page.locator("#shelf .leaf").count(), 1,
      "Exactly one note must remain; the surrounding pages are decorative");
    const oneSheet = await page.locator("#shelf .leaf").boundingBox();
    const onePocket = await page.locator("#drawer .pocket").boundingBox();
    assert.ok(oneSheet.width < 330 && oneSheet.height > 285, "The sole note must still look like a real sheet");
    assert.ok(onePocket.y - (oneSheet.y + oneSheet.height) < 30,
      "One saved sheet must not float above a distant folder flap");
    await page.screenshot({ path: "artifacts/mobile-single-page-390x844.png", animations: "disabled" });
    assert.deepEqual(errors, [], "No runtime JavaScript errors");
  } finally {
    await browser?.close();
    server.kill("SIGTERM");
  }
});
