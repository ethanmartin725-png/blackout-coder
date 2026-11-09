// High-Performance HMI track: generate each JavaScript step's `out` by running the page in Chromium.
// The page for step N is every HTML and CSS step plus JavaScript steps 1..N, as the app's preview builds it.
// Each scenario below drives the page and reports what it shows, including computed styles from the CSS steps.
//   node tools/output-checks/track13-hphmi/run.mjs           write outs
//   node tools/output-checks/track13-hphmi/run.mjs --check   report stale outs, change nothing
// Needs Playwright with Chromium (preinstalled in the dev container; not needed by CI).
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { setOut } from "../lib/lesson-file.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const FILE = path.join(ROOT, "site/data/tracks/13-hphmi.js");
const check = process.argv.includes("--check");

const ctx = { BC: { addTrack(t) { ctx.track = t; }, addLane() {}, addLanguage() {} } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(FILE, "utf8"), ctx);
const steps = ctx.track.lessons;

// The app's preview hands page scripts a stand-in document with only these methods (runJS in app.js).
const DOC_OK = new Set(["getElementById", "querySelector", "querySelectorAll", "createElement", "createTextNode"]);

const show = (v) => (typeof v === "string" ? v : JSON.stringify(v));
const ev = (label, expr) => [label, async (p) => show(await p.evaluate(expr))];
const alarms = (p) => p.evaluate(() => {
  const items = [...document.querySelectorAll("#alarmList li")].map((li) => {
    const words = li.children[1].textContent.split(" · ").slice(2).join(" · ");
    const cls = li.className.split(" ").join(" ");
    return `${li.querySelector(".icon").textContent} ${words} [${cls}]`;
  });
  return `${items.length ? items.join(" / ") : "(empty)"} | ${document.getElementById("alarmCount").textContent}`;
});
const flashing = (p) => p.evaluate(() => { const i = document.querySelector("#alarmList .icon"); return i ? getComputedStyle(i).animationName : "-"; });
const addAlarm = (p, a) => p.evaluate((a) => { SCREEN.alarms.push(a); drawAlarms(); }, a);
// Illustrative alarms added by the scenarios to show sorting and the ISA-18.2 states.
const LOW_AIR = { id: 2, priority: 2, machine: "Hoop Driver 1", text: "Low air", since: "14:03:10", active: true, acked: false };
const EYE = { id: 3, priority: 3, machine: "Conveyor 3", text: "Eye dirty", since: "14:04:00", active: true, acked: false };
const air = (p) => p.evaluate(() => {
  const b = document.querySelector("#air");
  const pct = (s) => +parseFloat(s).toFixed(2) + "%";
  return { pointer: pct(b.querySelector(".pointer").style.left), band: pct(b.querySelector(".band").style.left), width: pct(b.querySelector(".band").style.width), value: b.querySelector(".value").textContent, out: b.classList.contains("out") };
});
const detail = (p) => p.evaluate(() => {
  const t = (id) => document.getElementById(id).textContent;
  const faults = [...document.querySelectorAll("#dFaults li")].map((li) => li.textContent).join(" / ");
  return `${t("detailName")} | ${t("dBarrels")} | ${t("dPct")} | ${t("dDown")}\n${faults}`;
});

const SCENARIOS = {
  "Screen data at 14:05": [
    ev("Machine targets (rate × PAID_HOURS)", `SCREEN.machines.map((m) => m.name + " " + m.barrels + " of " + m.rate * PAID_HOURS)`),
    ev("Down minutes by machine", `SCREEN.faults.reduce((o, f) => ({ ...o, [f.machine]: +((o[f.machine] || 0) + f.min).toFixed(2) }), {})`),
    ev("Active alarms", `SCREEN.alarms.filter((a) => a.active).length`),
  ],
  "Draw the tiles": [
    ["Tiles", async (p) => (await p.evaluate(() => [...document.querySelectorAll("#tiles .tile")].map((t) => {
      const q = (s) => t.querySelector(s).textContent;
      const cls = [...t.classList].filter((c) => c !== "tile").join(" ") || "-";
      return `${q(".name")} | ${q(".state")} | ${t.querySelector(".value").parentElement.textContent} | fill ${+parseFloat(t.querySelector(".fill").style.width).toFixed(2)}% | ${cls}`;
    }))).join("\n")],
    ev("Mark", `[...new Set([...document.querySelectorAll("#tiles .mark")].map((m) => m.style.left))].join(", ") + " on every tile"`),
    ev("Border (from the CSS steps)", `[...document.querySelectorAll("#tiles .tile")].map((t) => getComputedStyle(t).borderTopWidth + " " + getComputedStyle(t).borderTopColor).join(" / ")`),
    ev("Fill color, plain then behind", `[getComputedStyle(document.querySelectorAll("#tiles .fill")[1]).backgroundColor, getComputedStyle(document.querySelectorAll("#tiles .fill")[2]).backgroundColor].join(" / ")`),
  ],
  "Place the pointer": [
    ["92 psi at load", async (p) => show(await air(p))],
    ["Set psi 81, drawAir()", async (p) => { await p.evaluate(() => { SCREEN.air.psi = 81; drawAir(); }); return show(await air(p)); }],
    ["Set psi 150, drawAir()", async (p) => { await p.evaluate(() => { SCREEN.air.psi = 150; drawAir(); }); return show(await air(p)); }],
    ["Out of band styling", async (p) => p.evaluate(() => { const b = document.querySelector("#air"); return `pointer ${getComputedStyle(b.querySelector(".pointer")).width}, reading weight ${getComputedStyle(b.querySelector(".reading")).fontWeight}`; })],
  ],
  "Sort the alarm list": [
    ["At 14:05", async (p) => `${await alarms(p)} | animation ${await flashing(p)}`],
    ["Add Low air (p2, 14:03:10) and Eye dirty (p3, 14:04:00)", async (p) => { await addAlarm(p, LOW_AIR); await addAlarm(p, EYE); return alarms(p); }],
    ["Add a second p1 at 14:04:30", async (p) => { await addAlarm(p, { id: 4, priority: 1, machine: "Conveyor 3", text: "E-stop", since: "14:04:30", active: true, acked: false }); return alarms(p); }],
    ["Icon shapes p1 / p2 / p3", async (p) => p.evaluate(() => ["p1", "p2", "p3"].map((c) => getComputedStyle(document.querySelector(`#alarmList .${c} .icon`)).clipPath).join(" / "))],
    ["Same page with reduced motion", async (p) => { await p.emulateMedia({ reducedMotion: "reduce" }); return p.evaluate(() => { const s = getComputedStyle(document.querySelector("#alarmList .icon")); return `animation ${s.animationName}, outline ${s.outlineWidth} ${s.outlineStyle}`; }); }],
  ],
  "Acknowledge and clear": [
    ["Click Ack on the char flare", async (p) => { await p.click("#alarmList .ack"); return `${await alarms(p)} | animation ${await flashing(p)}`; }],
    ["Add Low air (p2, 14:03:10)", async (p) => { await addAlarm(p, LOW_AIR); return alarms(p); }],
    ["returnToNormal(2) before anyone acks it", async (p) => { await p.evaluate(() => returnToNormal(2)); return alarms(p); }],
    ["Click Ack on the cleared Low air", async (p) => { await p.click("#alarmList .ack"); return alarms(p); }],
    ["returnToNormal(1), already acknowledged", async (p) => { await p.evaluate(() => returnToNormal(1)); return alarms(p); }],
  ],
  "Open the Level 2 detail": [
    ev("Detail hidden at load", `document.getElementById("detail").hidden`),
    ["Click the Hoop Driver 1 tile", async (p) => { await p.click(".tile[data-name='Hoop Driver 1'] .name"); return detail(p); }],
    ["Click the Char Station 2 tile", async (p) => { await p.click(".tile[data-name='Char Station 2'] .bar"); return detail(p); }],
    ["Click Back to overview", async (p) => { await p.click("#closeDetail"); return `hidden: ${await p.evaluate(() => document.getElementById("detail").hidden)}`; }],
  ],
};

const browser = await chromium.launch();
let src = fs.readFileSync(FILE, "utf8"), stale = 0, failed = 0;
const html = steps.filter((s) => s.lang === "html").map((s) => s.code).join("\n");
const css = steps.filter((s) => s.lang === "css").map((s) => s.code).join("\n");
for (let i = 0; i < steps.length; i++) {
  const step = steps[i];
  if (step.lang !== "js") continue;
  const bad = [...step.code.matchAll(/document\.(\w+)/g)].map((m) => m[1]).filter((m) => !DOC_OK.has(m));
  if (bad.length) { console.error(`FAIL  "${step.t}": the preview's document has no ${[...new Set(bad)].join(", ")}`); failed++; continue; }
  const sc = SCENARIOS[step.t];
  if (!sc) { console.error(`FAIL  no scenario for "${step.t}"`); failed++; continue; }
  const js = steps.slice(0, i + 1).filter((s) => s.lang === "js").map((s) => s.code).join("\n");
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
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
  const w = Math.min(Math.max(...lines.map((l) => l[0].length)), 44);
  const out = lines.map(([l, r]) => {
    const body = r.split("\n").join("\n" + "".padEnd(w + 5));
    return l.length > w ? `${l}\n${"".padEnd(w)}  →  ${body}` : `${l.padEnd(w)}  →  ${body}`;
  }).join("\n");
  if (step.out === out) { console.log(`ok    "${step.t}"`); continue; }
  stale++;
  console.log(`${check ? "STALE" : "write"} "${step.t}"\n${out.replace(/^/gm, "        ")}`);
  if (!check) src = setOut(src, step.t, out);
}
await browser.close();
if (!check && stale) fs.writeFileSync(FILE, src);
console.log(`\n${steps.filter((s) => s.lang === "js").length} steps run, ${stale} output(s) ${check ? "stale" : "updated"}, ${failed} failed`);
process.exit(failed || (check && stale) ? 1 : 0);
