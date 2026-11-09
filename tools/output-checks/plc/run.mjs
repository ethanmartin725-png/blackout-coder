// Runs every ladder and Structured Text lesson that has a scenario (sim) through the interpreter in site/js/plc.js
// and writes the trace into the lesson's out field, so PLC outputs come from running the code.
//
//   node tools/output-checks/plc/run.mjs           write outputs into site/data
//   node tools/output-checks/plc/run.mjs --check   report lessons whose stored output is stale
//
// A scenario says which inputs change over time and which tags to report; see runScenario in
// site/js/plc.js and docs/PLC_INTERPRETER.md (Scenarios).
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { setOut } from "../lib/lesson-file.mjs";
import { routineCode, PLC_LANGS } from "./lessons.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SITE = path.join(ROOT, "site");
const CHECK = process.argv.includes("--check");

const ctx = { lanes: [], tracks: [] };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(SITE, "js/plc.js"), "utf8"), ctx);
const fileOf = new Map();
ctx.BC = {
  addLanguage() {},
  addLane(l) { ctx.lanes.push(l); fileOf.set(l, ctx.current); },
  addTrack(t) { ctx.tracks.push(t); fileOf.set(t, ctx.current); },
};
const index = fs.readFileSync(path.join(SITE, "index.html"), "utf8");
for (const [, rel] of index.matchAll(/<script src="(data\/[^"]+)"><\/script>/g)) {
  ctx.current = rel;
  vm.runInContext(fs.readFileSync(path.join(SITE, rel), "utf8"), ctx);
}

const sources = {};
let ran = 0, changed = 0, failed = 0;
for (const [g, isTrack] of [...ctx.lanes.map((l) => [l, false]), ...ctx.tracks.map((t) => [t, true])]) {
  g.lessons.forEach((l, i) => {
    const lang = isTrack ? l.lang : g.lang;
    if (!PLC_LANGS.includes(lang) || !l.sim) return;
    const where = `${g.id} #${i + 1} "${l.t}"`;
    let out;
    try { out = ctx.BCplc.runScenario(routineCode(g, i, isTrack), l.sim, lang); }
    catch (e) { failed++; console.error(`FAIL  ${where}: ${e.message}`); return; }
    ran++;
    console.log(`ok    ${where}\n${out.replace(/^/gm, "        ")}`);
    if ((l.out || "") !== out) {
      changed++;
      const rel = fileOf.get(g);
      if (CHECK) console.error(`STALE ${where}: stored output does not match`);
      else {
        sources[rel] = sources[rel] || fs.readFileSync(path.join(SITE, rel), "utf8");
        sources[rel] = setOut(sources[rel], l.t, out);
      }
    }
  });
}
if (!CHECK) for (const [rel, s] of Object.entries(sources)) fs.writeFileSync(path.join(SITE, rel), s);
console.log(`\n${ran} scenarios run, ${changed} output(s) ${CHECK ? "stale" : "updated"}, ${failed} failed`);
process.exit(failed || (CHECK && changed) ? 1 : 0);
