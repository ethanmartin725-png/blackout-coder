// Downtime Entry track: generate each JavaScript step's `out` by running the page in Chromium.
// The page for step N is every HTML and CSS step plus JavaScript steps 1..N, as the app's preview builds it.
// Each scenario below drives the page (fill fields, click) and reports what it shows.
//   node tools/output-checks/track7-downtime/run.mjs           write outs
//   node tools/output-checks/track7-downtime/run.mjs --check   report stale outs, change nothing
// Needs Playwright with Chromium (preinstalled in the dev container; not needed by CI).
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { setOut } from "../lib/lesson-file.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const FILE = path.join(ROOT, "site/data/tracks/07-downtime.js");
const check = process.argv.includes("--check");

const ctx = { BC: { addTrack(t) { ctx.track = t; }, addLane() {}, addLanguage() {} } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(FILE, "utf8"), ctx);
const steps = ctx.track.lessons;

// Illustrative manual stops (not in the canonical fault_log, which holds only PLC-detected stops).
const STOPS = [
  { machine: "Conveyor 3", reason: "Changeover", start: "07:30", end: "07:45", note: "53 to 30 gal" },
  { machine: "Hoop Driver 1", reason: "Material", start: "11:05", end: "11:17", note: "waiting on hoops" },
  { machine: "Char Station 2", reason: "Quality check", start: "12:40", end: "12:52", note: "char depth check" },
];
const fill = async (page, s) => {
  await page.selectOption("#machine", s.machine ?? "");
  await page.selectOption("#reason", s.reason ?? "");
  await page.fill("#start", s.start ?? "");
  await page.fill("#end", s.end ?? "");
  await page.fill("#note", s.note ?? "");
};
const text = (page, sel) => page.evaluate((s) => document.querySelector(s).textContent, sel);
const rows = (page) => page.evaluate(() => [...document.querySelectorAll("#rows tr")].map((tr) => [...tr.cells].map((c) => c.textContent).join(" | ")));
const totals = async (page) => [...(await page.evaluate(() => [...document.querySelectorAll("#totals li")].map((li) => li.textContent))), await text(page, "#total")];
const messages = async (page) => `error "${await text(page, "#error")}", status "${await text(page, "#status")}"`;
const show = (v) => (typeof v === "string" ? JSON.stringify(v) : JSON.stringify(v));
const ev = (expr) => [expr, async (page) => show(await page.evaluate(expr))];

const SCENARIOS = {
  "Shift window and minutes": [ev(`toMinutes("07:30")`), ev(`toMinutes(SHIFT.end) - toMinutes(SHIFT.start)`), ev(`entries.length`)],
  "Read the form": [
    ["Fill Conveyor 3, Changeover, 07:30, 07:45, note \"  53 to 30 gal  \"", async (p) => { await fill(p, { ...STOPS[0], note: "  53 to 30 gal  " }); return "filled"; }],
    ev(`readForm()`),
  ],
  "Validate an entry": [
    ev(`validate({ machine: "Conveyor 3", reason: "Changeover", start: "07:30", end: "07:45" })`),
    ev(`validate({ machine: "Conveyor 3", reason: "", start: "07:30", end: "07:45" })`),
    ev(`validate({ machine: "Conveyor 3", reason: "Changeover", start: "", end: "07:45" })`),
    ev(`validate({ machine: "Conveyor 3", reason: "Changeover", start: "07:30", end: "07:20" })`),
    ev(`validate({ machine: "Char Station 2", reason: "Quality check", start: "13:50", end: "14:10" })`),
  ],
  "Show a message": [
    [`showError("End must be after start.")`, async (p) => { await p.evaluate(`showError("End must be after start.")`); return messages(p); }],
    [`showStatus("Saved.")`, async (p) => { await p.evaluate(`showStatus("Saved.")`); return messages(p); }],
  ],
  "Draw the log rows": [
    ["Push one entry whose note contains <b> tags, then renderRows()", async (p) => {
      await p.evaluate(`entries.push({ machine: "Conveyor 3", start: "07:30", end: "07:45", minutes: 15, reason: "Changeover", note: "<b>53</b> to 30 gal" }); renderRows();`);
      return (await rows(p)).join(" / ");
    }],
    ev(`document.querySelectorAll("#rows b").length`),
  ],
  "Totals by machine": [
    ["Push the three illustrative stops (15, 12 and 12 min), then renderTotals()", async (p) => {
      await p.evaluate((stops) => { const m = { "07:30": 15, "11:05": 12, "12:40": 12 }; for (const s of stops) entries.push({ ...s, minutes: m[s.start] }); renderTotals(); }, STOPS);
      return (await totals(p)).join(" / ");
    }],
  ],
  "Clear the form": [
    ["Fill the Conveyor 3 stop, then clearForm()", async (p) => { await fill(p, STOPS[0]); await p.evaluate(`clearForm()`); return show(await p.evaluate(`readForm()`)); }],
  ],
  "Save an entry": [
    ["Click Save with nothing filled in", async (p) => { await p.click("#save"); return messages(p); }],
    ["Fill Conveyor 3 07:30 to 07:20, click Save", async (p) => { await fill(p, { ...STOPS[0], end: "07:20" }); await p.click("#save"); return messages(p); }],
    ...STOPS.map((s) => [`Fill ${s.machine} ${s.start} to ${s.end} ${s.reason}, click Save`, async (p) => { await fill(p, s); await p.click("#save"); return messages(p); }]),
    ["Rows", async (p) => (await rows(p)).join(" / ")],
    ["Totals", async (p) => (await totals(p)).join(" / ")],
    ["Form after the last save", async (p) => show(await p.evaluate(`readForm()`))],
  ],
  "Save only when ready": [
    ["Page loads", async (p) => `save disabled: ${await p.evaluate(`document.getElementById("save").disabled`)}`],
    ["Pick Conveyor 3 and Changeover", async (p) => { await p.selectOption("#machine", "Conveyor 3"); await p.selectOption("#reason", "Changeover"); return `save disabled: ${await p.evaluate(`document.getElementById("save").disabled`)}`; }],
    ["Enter 07:30 and 07:45", async (p) => { await p.fill("#start", "07:30"); await p.fill("#end", "07:45"); return `save disabled: ${await p.evaluate(`document.getElementById("save").disabled`)}`; }],
    ["Change the end to 07:20", async (p) => { await p.fill("#end", "07:20"); return `save disabled: ${await p.evaluate(`document.getElementById("save").disabled`)}`; }],
    ["Change it back to 07:45 and click Save", async (p) => { await p.fill("#end", "07:45"); await p.click("#save"); return `${await messages(p)}, save disabled: ${await p.evaluate(`document.getElementById("save").disabled`)}`; }],
  ],
  "Undo the last entry": [
    ["Save the Conveyor 3 and Hoop Driver 1 stops", async (p) => { for (const s of STOPS.slice(0, 2)) { await fill(p, s); await p.click("#save"); } return (await rows(p)).length + " rows"; }],
    ["Click Undo last", async (p) => { await p.click("#undo"); return `${await messages(p)}, ${(await rows(p)).length} row, ${await text(p, "#total")}`; }],
    ["Click Undo last", async (p) => { await p.click("#undo"); return `${await messages(p)}, ${(await rows(p)).length} rows, ${await text(p, "#total")}`; }],
    ["Click Undo last", async (p) => { await p.click("#undo"); return messages(p); }],
  ],
};

const browser = await chromium.launch();
let src = fs.readFileSync(FILE, "utf8"), stale = 0, failed = 0;
const html = steps.filter((s) => s.lang === "html").map((s) => s.code).join("\n");
const css = steps.filter((s) => s.lang === "css").map((s) => s.code).join("\n");
for (let i = 0; i < steps.length; i++) {
  const step = steps[i];
  if (step.lang !== "js") continue;
  const sc = SCENARIOS[step.t];
  if (!sc) { console.error(`FAIL  no scenario for "${step.t}"`); failed++; continue; }
  const js = steps.slice(0, i + 1).filter((s) => s.lang === "js").map((s) => s.code).join("\n");
  const page = await browser.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent(`<!doctype html><style>${css}</style>${html}`);
  await page.addScriptTag({ content: js });
  const lines = [];
  try {
    for (const [label, run] of sc) lines.push([label, await run(page)]);
  } catch (e) { errs.push(e.message); }
  await page.close();
  if (errs.length) { console.error(`FAIL  "${step.t}": ${errs.join("; ")}`); failed++; continue; }
  const w = Math.min(Math.max(...lines.map((l) => l[0].length)), 52);
  const out = lines.map(([l, r]) => (l.length > w ? `${l}\n${"".padEnd(w)}  →  ${r}` : `${l.padEnd(w)}  →  ${r}`)).join("\n");
  if (step.out === out) { console.log(`ok    "${step.t}"`); continue; }
  stale++;
  console.log(`${check ? "STALE" : "write"} "${step.t}"\n${out.replace(/^/gm, "        ")}`);
  if (!check) src = setOut(src, step.t, out);
}
await browser.close();
if (!check && stale) fs.writeFileSync(FILE, src);
console.log(`\n${steps.filter((s) => s.lang === "js").length} steps run, ${stale} output(s) ${check ? "stale" : "updated"}, ${failed} failed`);
process.exit(failed || (check && stale) ? 1 : 0);
