// Plant Board track: generate each JavaScript step's `out` by running the page in Chromium.
// The page for step N is every HTML and CSS step plus JavaScript steps 1..N, as the app's preview
// builds it. The clock is fixed at the handoff run time, 2026-11-07 14:05, so times are repeatable,
// and the browser locale is en-US. Each scenario below reports what the page shows.
//   node tools/output-checks/track5-board/run.mjs           write outs
//   node tools/output-checks/track5-board/run.mjs --check   report stale outs, change nothing
// Needs Playwright with Chromium (preinstalled in the dev container; not needed by CI).
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { setOut } from "../lib/lesson-file.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const FILE = path.join(ROOT, "site/data/tracks/05-board.js");
const check = process.argv.includes("--check");
const NOW = new Date("2026-11-07T14:05:00Z"); // shown as 14:05: the page runs in UTC

const ctx = { BC: { addTrack(t) { ctx.track = t; }, addLane() {}, addLanguage() {} } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(FILE, "utf8"), ctx);
const steps = ctx.track.lessons;
const html = steps.filter((s) => s.lang === "html").map((s) => s.code).join("\n");
const css = steps.filter((s) => s.lang === "css").map((s) => s.code).join("\n");

const text = (p, sel) => p.evaluate((s) => document.querySelector(s)?.textContent.replace(/\s+/g, " ").trim() ?? null, sel);
const tiles = (p) => p.evaluate(() => [...document.querySelectorAll("#tiles .tile")].map((t) => `${t.className}: ${t.textContent.replace(/\s+/g, " ").trim()}`));
const bars = (p) => p.evaluate(() => [...document.querySelectorAll("#pareto .bar-row")].map((r) => `${r.children[0].textContent} | bar ${r.querySelector(".bar").style.width} | ${r.children[2].textContent}`));
const notes = (p) => p.evaluate(() => [...document.querySelectorAll("#notes li")].map((li) => li.textContent));
const counts = async (p) => `header "${await text(p, "#shift-info")}", ${(await tiles(p)).length} tiles, ${(await bars(p)).length} bars, ${(await notes(p)).length} notes`;
const ev = (expr) => [expr, async (p) => JSON.stringify(await p.evaluate(expr))];
const many = (label, fn) => [label, async (p, o) => (await fn(p, o)).map((x) => "\n    " + x).join("")];

// The app's preview has no network: fetch rejects. A scenario can instead serve /api/board.
const PREVIEW_FETCH = () => { window.fetch = () => Promise.reject(new Error("The preview has no network.")); };

const SCENARIOS = {
  "The board data": [ev("board.machines.length"), ev("board.pareto.length"), ev("board.notes.length"),
    ["Tiles on the page", async (p) => String((await tiles(p)).length)], ["Header text", async (p) => `"${await text(p, "#shift-info")}"`]],
  "Status class and header": [ev(`statusClass("DOWN")`), ev(`statusClass("BEHIND")`), ev(`statusClass("OK")`),
    ["Header before anything calls renderHeader", async (p) => `"${await text(p, "#shift-info")}"`],
    ["renderHeader()", async (p) => { await p.evaluate("renderHeader()"); return `"${await text(p, "#shift-info")}"`; }]],
  "Machine tiles": [many("renderTiles()", async (p) => { await p.evaluate("renderTiles()"); return tiles(p); })],
  "Biggest-gap tile": [["renderTiles(); renderSummary(): the last tile", async (p) => { await p.evaluate("renderTiles(); renderSummary()"); const t = await tiles(p); return t[t.length - 1]; }]],
  "Draw the Pareto": [many("renderPareto()", async (p) => { await p.evaluate("renderPareto()"); return bars(p); })],
  "Handoff notes": [many("renderNotes()", async (p) => { await p.evaluate("renderNotes()"); return notes(p); })],
  "Render the board": [["After the script runs", counts]],
  "Live clock": [["Clock at 14:05 (en-US browser)", async (p) => `"${await text(p, "#clock")}"`],
    ["90 seconds later", async (p) => { await p.clock.runFor(90000); return `"${await text(p, "#clock")}"`; }]],
  "Refresh from the server": [
    ["In the preview, at load", async (p) => `"${await text(p, "#shift-info")}"`],
    ["In the preview, after 60 s (fetch fails)", async (p) => { await p.clock.runFor(60000); return `"${await text(p, "#shift-info")}"`; }],
    ["Served /api/board with Char Station 2 back to OK, after 60 s", async (p, o) => {
      const q = await o.fresh({ fetch: "serve" });
      await Promise.all([q.waitForResponse("**/api/board"), q.clock.runFor(60000)]);
      await q.waitForTimeout(200); // let the response's JSON and the render finish
      const t = await tiles(q);
      return `"${await text(q, "#shift-info")}"; ${t[0]}`;
    }],
  ],
};

const browser = await chromium.launch();
async function open(js, opts = {}) {
  const page = await browser.newPage({ locale: "en-US", timezoneId: "UTC" });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.clock.install({ time: NOW });
  await page.route("http://board.test/", (r) => r.fulfill({ contentType: "text/html", body: "<!doctype html>" }));
  if (opts.fetch === "serve") {
    await page.route("**/api/board", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({
      machines: [{ name: "Char Station 2", oee: 0.86, status: "OK" }, { name: "Conveyor 3", oee: 0.738, status: "OK" }, { name: "Hoop Driver 1", oee: 0.729, status: "BEHIND" }] }) }));
    await page.goto("http://board.test/");
  } else {
    await page.addInitScript(PREVIEW_FETCH);
    await page.goto("http://board.test/");
  }
  await page.setContent(`<!doctype html><style>${css}</style>${html}`);
  if (opts.fetch !== "serve") await page.evaluate(PREVIEW_FETCH);
  await page.addScriptTag({ content: js });
  page._errs = errs;
  return page;
}

let src = fs.readFileSync(FILE, "utf8"), stale = 0, failed = 0;
for (let i = 0; i < steps.length; i++) {
  const step = steps[i];
  if (step.lang !== "js") continue;
  const sc = SCENARIOS[step.t];
  if (!sc) { console.error(`FAIL  no scenario for "${step.t}"`); failed++; continue; }
  const js = steps.slice(0, i + 1).filter((s) => s.lang === "js").map((s) => s.code).join("\n");
  const pages = [];
  const o = { fresh: async (opts) => { const q = await open(js, opts); pages.push(q); return q; } };
  const page = await o.fresh();
  const lines = [];
  try {
    for (const [label, run] of sc) lines.push([label, await run(page, o)]);
  } catch (e) { page._errs.push(e.message); }
  const errs = pages.flatMap((q) => q._errs);
  for (const q of pages) await q.close();
  if (errs.length) { console.error(`FAIL  "${step.t}": ${errs.join("; ")}`); failed++; continue; }
  const w = Math.min(Math.max(...lines.map((l) => l[0].length)), 44);
  const out = lines.map(([l, r]) => (r.startsWith("\n") ? `${l}:${r}` : l.length > w ? `${l}\n${"".padEnd(w)}  →  ${r}` : `${l.padEnd(w)}  →  ${r}`)).join("\n");
  if (step.out === out) { console.log(`ok    "${step.t}"`); continue; }
  stale++;
  console.log(`${check ? "STALE" : "write"} "${step.t}"\n${out.replace(/^/gm, "        ")}`);
  if (!check) src = setOut(src, step.t, out);
}
await browser.close();
if (!check && stale) fs.writeFileSync(FILE, src);
console.log(`\n${steps.filter((s) => s.lang === "js").length} steps run, ${stale} output(s) ${check ? "stale" : "updated"}, ${failed} failed`);
process.exit(failed || (check && stale) ? 1 : 0);
