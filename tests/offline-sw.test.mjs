import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";

const ROOT = "https://ialirezaaa.github.io/typing-machine/";
const workerCode = readFileSync(new URL("../sw.js", import.meta.url), "utf8");

function createWorker() {
  const listeners = new Map();
  const stores = new Map();
  let online = true;
  let htmlError = false;
  const urlOf = request => new URL(typeof request === "string" ? request : request.url, ROOT).href;

  async function networkFetch(request) {
    if (!online) throw new TypeError("Network unavailable");
    const url = urlOf(request);
    const isHTML = url === ROOT || url.endsWith("/index.html") || url.startsWith(ROOT + "?");
    if (htmlError && isHTML) return new Response("503 server error", {
      status: 503, headers: { "content-type": "text/html" }
    });
    return new Response(isHTML ? "<!doctype html><title>Typing Machine</title>" : "asset " + url, {
      headers: { "content-type": isHTML ? "text/html" : "application/octet-stream" }
    });
  }

  class FakeCache {
    responses = new Map();
    async match(request) {
      const response = this.responses.get(urlOf(request));
      return response ? response.clone() : undefined;
    }
    async put(request, response) {
      this.responses.set(urlOf(request), response.clone());
    }
    async delete(request) { return this.responses.delete(urlOf(request)); }
    async addAll(requests) {
      // Cache.addAll requires a successful response to every request.
      const entries = await Promise.all(requests.map(async request => {
        const response = await networkFetch(request);
        if (!response.ok) throw new Error("Precache request failed");
        return [urlOf(request), response];
      }));
      for (const [url, response] of entries) this.responses.set(url, response.clone());
    }
  }

  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new FakeCache());
      return stores.get(name);
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); }
  };

  const self = {
    registration: { scope: ROOT },
    location: { origin: new URL(ROOT).origin },
    clients: { async claim() {} },
    async skipWaiting() {},
    addEventListener(type, listener) { listeners.set(type, listener); }
  };
  vm.runInNewContext(workerCode, { self, caches, URL, Request, Response, fetch: networkFetch }, {
    filename: "sw.js"
  });

  async function dispatch(type, props = {}) {
    const pending = [];
    const event = { ...props, waitUntil(promise) { pending.push(Promise.resolve(promise)); } };
    listeners.get(type)(event);
    await Promise.all(pending);
    return event;
  }

  async function request(path, mode = "navigate", method = "GET") {
    let responsePromise = null;
    const event = {
      request: { url: urlOf(path), mode, method },
      respondWith(promise) { responsePromise = Promise.resolve(promise); }
    };
    listeners.get("fetch")(event);
    return responsePromise ? await responsePromise : null;
  }

  async function check() {
    let answer = null;
    const port = { postMessage(value) { answer = value; } };
    await dispatch("message", { data: { type: "CHECK_OFFLINE" }, ports: [port] });
    return answer;
  }

  return {
    caches, stores, request, check,
    install: () => dispatch("install"),
    activate: () => dispatch("activate"),
    setOnline(value) { online = value; },
    setHtmlError(value) { htmlError = value; }
  };
}

test("pre-caches every file and opens the installed app in airplane mode", async () => {
  const worker = createWorker();
  await worker.install();
  await worker.activate();
  assert.equal((await worker.check()).ready, true);
  worker.setOnline(false);
  const home = await worker.request(ROOT + "?new=1");
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Typing Machine/);
  const css = await worker.request(ROOT + "fonts/fonts.css", "cors");
  assert.equal(css.status, 200);
  assert.match(await css.text(), /fonts\/fonts.css/);
  assert.equal((await worker.check()).ready, true);
});

test("reports incomplete cache, then repairs missing offline assets when online", async () => {
  const worker = createWorker();
  await worker.install();
  const cache = await worker.caches.open("typing-machine-v7");
  await cache.delete(ROOT + "fonts/fonts.css");
  worker.setOnline(false);
  const missing = await worker.check();
  assert.equal(missing.ready, false);
  assert.equal(missing.missing, 1);
  worker.setOnline(true);
  assert.equal((await worker.check()).ready, true);
  worker.setOnline(false);
  assert.equal((await worker.request(ROOT + "fonts/fonts.css", "cors")).status, 200);
});

test("does not overwrite the working offline app with an HTTP error", async () => {
  const worker = createWorker();
  await worker.install();
  worker.setHtmlError(true);
  const errorResponse = await worker.request(ROOT);
  assert.equal(errorResponse.status, 503);
  worker.setOnline(false);
  const offline = await worker.request(ROOT);
  assert.equal(offline.status, 200);
  assert.match(await offline.text(), /Typing Machine/);
});

test("only purges this app's old caches", async () => {
  const worker = createWorker();
  await worker.caches.open("other-app-v1");
  await worker.caches.open("typing-machine-v2");
  await worker.install();
  await worker.activate();
  assert.deepEqual(await worker.caches.keys(), ["other-app-v1", "typing-machine-v7"]);
});

test("does not intercept backend migration, external scope, or non-GET requests", async () => {
  const worker = createWorker();
  await worker.install();
  assert.equal(await worker.request(ROOT + "api/migrate", "cors"), null);
  assert.equal(await worker.request("https://ialirezaaa.github.io/another-project/", "navigate"), null);
  assert.equal(await worker.request(ROOT, "navigate", "POST"), null);
});

test("mobile UI and every pre-cache asset exist in the repository", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /name="apple-mobile-web-app-capable" content="yes"/);
  assert.match(html, /id="offlineStatus"/);
  assert.match(html, /id="offlineHelpStatus"/);
  assert.match(html, /src="offline-pwa.js\\?v=1\\.2\\.2"/);
  assert.match(html, /visibilitychange/);
  const assets = [...workerCode.matchAll(/"(\.\/[^"]+)"/g)].map(match => match[1]);
  assert.ok(assets.includes("./offline-pwa.js"));
  for (const asset of assets) {
    assert.ok(existsSync(new URL("../" + asset.slice(2).split("?")[0], import.meta.url)), "Missing pre-cache asset: " + asset);
  }
  const manifest = JSON.parse(readFileSync(new URL("../manifest.webmanifest", import.meta.url), "utf8"));
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
});
