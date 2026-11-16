/* Standalone/mobile PWA offline readiness indicator.
 * A successful service worker registration alone does not imply the files
 * required for airplane-mode use are in Cache Storage; ask the worker.
 */
(() => {
  "use strict";

  const badge = document.getElementById("offlineStatus");
  const detail = document.getElementById("offlineHelpStatus");
  const retry = document.getElementById("offlineRetry");
  if (!badge) return;

  const supported = "serviceWorker" in navigator && "MessageChannel" in window &&
    (location.protocol === "https:" || location.hostname === "localhost" ||
      location.hostname === "127.0.0.1");
  let ready = false;
  let checking = false;
  let checkId = 0;

  function showStatus() {
    const connected = navigator.onLine;
    const label = !supported ? "offline unavailable" :
      checking ? "preparing offline" :
      ready ? (connected ? "offline ready" : "working offline") :
      (connected ? "offline not ready" : "offline unavailable");

    badge.textContent = label;
    badge.dataset.ready = String(ready);
    badge.title = "Offline status and mobile installation help";
    if (detail) {
      detail.textContent = !supported
        ? "This browser cannot prepare an offline copy."
        : ready
          ? "All app files are stored on this device. You can open the installed app without internet."
          : checking
            ? "Checking and saving the app files on this device…"
            : "Offline files are not complete. Connect to the internet and press Check / repair.";
    }
  }

  function askWorker(worker) {
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => {
        channel.port1.close();
        reject(new Error("Offline status check timed out"));
      }, 12000);
      channel.port1.onmessage = e => {
        if (!e.data || e.data.type !== "OFFLINE_STATUS") return;
        clearTimeout(timer);
        channel.port1.close();
        resolve(e.data.ready === true);
      };
      try {
        worker.postMessage({ type: "CHECK_OFFLINE" }, [channel.port2]);
      } catch (err) {
        clearTimeout(timer);
        channel.port1.close();
        reject(err);
      }
    });
  }

  async function checkOffline() {
    const id = ++checkId; // ignore stale results from an earlier worker
    if (!supported) { showStatus(); return; }
    checking = true;
    showStatus();
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Service worker not ready")), 16000));
      const registration = await Promise.race([navigator.serviceWorker.ready, timeout]);
      if (!registration.active) throw new Error("No active service worker");
      const result = await askWorker(registration.active);
      if (id === checkId) ready = result;
    } catch (err) {
      if (id === checkId) ready = false;
    } finally {
      if (id === checkId) {
        checking = false;
        showStatus();
      }
    }
  }

  badge.addEventListener("click", () => {
    const help = document.getElementById("btnHelp");
    if (help) help.click();
  });
  if (retry) retry.addEventListener("click", checkOffline);
  window.addEventListener("online", checkOffline);
  window.addEventListener("offline", showStatus);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkOffline();
  });
  if (supported) navigator.serviceWorker.addEventListener("controllerchange", checkOffline);
  showStatus();
  checkOffline();
})();


/* Finalized-release updater. Never replace a live writing session without
 * an explicit user action: new workers wait until "Install ready update". */
(() => {
  "use strict";
  const appVersion = document.querySelector('meta[name="app-version"]')?.content || "unknown";
  const versionEl = document.getElementById("appVersion");
  const status = document.getElementById("appUpdateStatus");
  const checkButton = document.getElementById("checkUpdates");
  const applyButton = document.getElementById("applyUpdate");
  const toolbarButton = document.getElementById("btnUpdate");
  if (!status || !checkButton || !applyButton || !toolbarButton) return;
  if (versionEl) versionEl.textContent = "Digital Ink v" + appVersion;

  const supported = "serviceWorker" in navigator && location.protocol === "https:" ||
    ("serviceWorker" in navigator && /^(localhost|127\.0\.0\.1)$/.test(location.hostname));
  let currentRegistration = null;
  let updateReady = false;
  let applying = false;
  let checking = false;

  function report(message) { status.textContent = message; }
  function setReady(ready, version = "") {
    updateReady = ready;
    applyButton.hidden = !ready;
    toolbarButton.hidden = !ready;
    if (ready) {
      toolbarButton.textContent = "update";
      toolbarButton.title = "Digital Ink " + version + " is ready to install";
      report("Version " + version + " is ready");
    }
  }
  function compareVersions(a, b) {
    const x = String(a).split(".").map(Number), y = String(b).split(".").map(Number);
    if (x.some(v => !Number.isFinite(v)) || y.some(v => !Number.isFinite(v))) return 0;
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0) ? 1 : -1;
    }
    return 0;
  }

  async function getRegistration() {
    return (await navigator.serviceWorker.getRegistration("./")) ||
      await navigator.serviceWorker.ready;
  }

  async function waitForInstalled(registration) {
    if (registration.waiting) return true;
    // update() may resolve before its new worker has finished pre-caching.
    const installing = registration.installing;
    if (!installing) return false;
    return await new Promise(resolve => {
      const timeout = setTimeout(() => { installing.removeEventListener("statechange", onState); resolve(false); }, 15000);
      const onState = () => {
        if (installing.state === "installed" || installing.state === "redundant" ||
            installing.state === "activated") {
          clearTimeout(timeout);
          installing.removeEventListener("statechange", onState);
          resolve(!!registration.waiting);
        }
      };
      installing.addEventListener("statechange", onState);
      onState();
    });
  }

  async function checkForUpdates(silent = false) {
    if (!supported) { report("Updates unavailable in this browser"); return; }
    if (!navigator.onLine) { report("Connect to check for updates"); return; }
    if (checking || applying) return;
    checking = true;
    if (!silent) report("Checking finalized releases…");
    try {
      // release.json is never served from the service-worker cache.
      const response = await fetch(new URL("release.json", location.href), { cache: "no-store" });
      if (!response.ok) throw Error("Release metadata unavailable");
      const release = await response.json();
      if (release.status !== "final" || typeof release.version !== "string") {
        setReady(false);
        report("No finalized update available");
        return;
      }
      if (compareVersions(release.version, appVersion) <= 0) {
        setReady(false);
        report("Up to date · v" + appVersion);
        return;
      }
      const registration = await getRegistration();
      currentRegistration = registration;
      await registration.update();
      const installed = await waitForInstalled(registration);
      if (installed && registration.waiting) {
        setReady(true, release.version);
      } else {
        setReady(false);
        report("Version " + release.version + " is downloading. Check again shortly.");
      }
    } catch (error) {
      report("Couldn't check updates · try again online");
    } finally {
      checking = false;
    }
  }

  function applyUpdate() {
    if (!updateReady || applying || !currentRegistration?.waiting) {
      report("Update not ready. Check again.");
      return;
    }
    // The main editor flushes its local note state synchronously.
    window.dispatchEvent(new Event("digitalink:before-update"));
    applying = true;
    report("Installing update…");
    applyButton.disabled = true;
    toolbarButton.disabled = true;
    currentRegistration.waiting.postMessage({ type: "ACTIVATE_UPDATE" });
  }
  checkButton.addEventListener("click", () => checkForUpdates(false));
  applyButton.addEventListener("click", applyUpdate);
  toolbarButton.addEventListener("click", () => {
    // The toolbar is an explicit install action, not a background reload.
    applyUpdate();
  });
  if (supported) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (applying) location.reload();
    });
    navigator.serviceWorker.ready.then(reg => {
      currentRegistration = reg;
      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && reg.waiting && navigator.onLine) {
            checkForUpdates(true);
          }
        });
      });
    }).catch(() => {});
    window.addEventListener("online", () => checkForUpdates(true));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdates(true);
    });
    // Only check periodically while the app is open and visible.
    setInterval(() => {
      if (document.visibilityState === "visible") checkForUpdates(true);
    }, 30 * 60 * 1000);
    checkForUpdates(true);
  } else report("Install as a web app to receive updates");
})();
