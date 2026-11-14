// Draws the app icons (site/icons/*.png) in Chromium with the site's own fonts, so they match the
// brand: the gold "out" bar on navy. Run after changing the design: node tools/make-icons.mjs
// Needs Playwright with Chromium (the browser-test setup). The PNGs are committed.
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const NAVY = "#0a1528", GOLD = "#d6aa47", INK = "#ece6d4"; // the site's --bg, --gold and --ink
// pad: share of the edge kept clear; maskable icons need a safe zone (the inner 80%).
const page = (size, pad) => `<!doctype html><html><head><link rel="stylesheet" href="file://${ROOT}/site/fonts/fonts.css">
<style>html,body{margin:0}body{width:${size}px;height:${size}px;background:${NAVY};display:grid;place-items:center}
.i{width:${size * (1 - 2 * pad)}px;display:grid;gap:${size * 0.045}px;font:700 ${size * 0.34}px/1 Caladea,serif;color:${INK}}
.b{display:flex;align-items:baseline;gap:${size * 0.03}px}
.bar{display:inline-block;background:${GOLD};height:${size * 0.24}px;border-radius:${size * 0.02}px}
.l{height:${size * 0.055}px;border-radius:${size * 0.03}px;background:${GOLD};opacity:.55}</style></head>
<body><div class="i"><div class="b">B<span class="bar" style="width:${size * 0.3}px"></span></div>
<div class="l" style="width:72%"></div><div class="l" style="width:48%"></div></div></body></html>`;
const browser = await chromium.launch();
for (const [file, size, pad] of [["icon-192.png", 192, 0.16], ["icon-512.png", 512, 0.16], ["icon-maskable-512.png", 512, 0.24], ["apple-touch-icon.png", 180, 0.16]]) {
  const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(page(size, pad), { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(ROOT, "site/icons", file) });
  await p.close();
  console.log("wrote site/icons/" + file);
}
await browser.close();
