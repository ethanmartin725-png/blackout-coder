// Service worker: keeps a copy of the whole site so it works with no connection (an installed app,
// or the browser on a plane). No build step and no file list to keep up to date: on install it reads
// index.html and fonts/fonts.css for every file they load, and caches those with the manifest and icons.
// Every request then tries the network first, so an online visit always gets the latest lessons and
// refreshes the copy; if the network fails, or takes over 4 s, the saved copy answers instead.
const CACHE = "blackout-coder";
const WAIT_MS = 4000;
const EXTRA = ["./", "index.html", "manifest.webmanifest", "fonts/fonts.css", "fonts/OFL.txt",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png"];

async function siteFiles() {
  const files = new Set(EXTRA);
  const html = await (await fetch("index.html", { cache: "no-cache" })).text();
  for (const m of html.matchAll(/(?:src|href)="([^"#:?]+)"/g)) files.add(m[1]);
  const css = await (await fetch("fonts/fonts.css", { cache: "no-cache" })).text();
  for (const m of css.matchAll(/url\(([^)]+)\)/g)) files.add("fonts/" + m[1]); // relative to fonts.css
  return [...files];
}

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll((await siteFiles()).map((f) => new Request(f, { cache: "no-cache" })));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => { e.waitUntil(self.clients.claim()); });

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const net = fetch(req).then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    });
    net.catch(() => {}); // if the timeout wins and the network then fails, that is expected
    const timeout = new Promise((resolve) => setTimeout(resolve, WAIT_MS));
    try {
      const res = await Promise.race([net, timeout]);
      if (res) return res;
    } catch (err) { /* offline: fall through to the saved copy */ }
    const saved = await cache.match(req, { ignoreSearch: true });
    return saved || net; // nothing saved: wait for the network after all
  })());
});
