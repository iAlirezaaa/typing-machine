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
