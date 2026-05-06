// FH Enterprise Service Worker v2
// Network-first for pages — never serves stale HTML
const CACHE_NAME = "fh-enterprise-v2";

// ─── INSTALL ────────────────────────────────────────────────
self.addEventListener("install", () => {
  console.log("[SW] Installing v2...");
  self.skipWaiting();
});

// ─── ACTIVATE: Delete ALL old caches ────────────────────────
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating v2...");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log("[SW] Deleting old cache:", key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// ─── FETCH ──────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET
  if (request.method !== "GET") return;

  // Skip Convex, Clerk, extensions
  if (url.hostname.includes("convex.cloud")) return;
  if (url.hostname.includes("clerk")) return;
  if (url.protocol === "chrome-extension:") return;

  // ── Pages: ALWAYS network-first, cache ONLY for offline fallback ──
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache latest copy for offline use
          const clone = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached;
            return caches.match("/").then((root) => {
              if (root) return root;
              return new Response(offlineHTML(), {
                headers: { "Content-Type": "text/html" },
              });
            });
          })
        )
    );
    return;
  }

  // ── Immutable static assets (hashed filenames): cache-first ──
  // Only cache /_next/static/ which has content hashes in filenames
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return response;
        }).catch(() => new Response("", { status: 408 }));
      })
    );
    return;
  }

  // ── Everything else: network-first ──
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        return response;
      })
      .catch(() =>
        caches.match(request).then((c) => c || new Response("", { status: 408 }))
      )
  );
});

// ─── MESSAGE ────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ─── OFFLINE PAGE ───────────────────────────────────────────
function offlineHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FH Enterprise — Offline</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,sans-serif;background:#f8fafc;color:#1e293b;display:flex;align-items:center;justify-content:center;min-height:100vh}
    .c{text-align:center;padding:2rem;max-width:400px}
    .i{font-size:3rem;margin-bottom:1rem}
    h1{font-size:1.5rem;margin-bottom:.5rem}
    p{color:#64748b;font-size:.875rem;line-height:1.5;margin-bottom:1.5rem}
    button{background:#3b82f6;color:#fff;border:none;padding:.625rem 1.5rem;border-radius:.5rem;font-size:.875rem;cursor:pointer}
    button:hover{background:#2563eb}
  </style>
</head>
<body>
  <div class="c">
    <div class="i">📡</div>
    <h1>You're Offline</h1>
    <p>FH Enterprise needs an internet connection to sync data. Your recent changes will be saved automatically when you reconnect.</p>
    <button onclick="location.reload()">Try Again</button>
  </div>
</body>
</html>`;
}