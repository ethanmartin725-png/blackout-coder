// Power BI report track and the Power Query M lane: generate each step's or lesson's `out` with the
// M and DAX teaching models, and prove it with SQL twins on SQL Server (twins.mjs for the track,
// mtwins.mjs for the lane).
//   node tools/output-checks/pq/run.mjs            write outs, then run every SQL twin
//   node tools/output-checks/pq/run.mjs --check    report stale outs (no database needed)
//   node tools/output-checks/pq/run.mjs --no-sql   write outs, skip the twins
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { setOut } from "../lib/lesson-file.mjs";
import { trackOutputs, laneOutputs } from "./lane.mjs";
import { TWINS } from "./twins.mjs";
import { TWINS as LANE_TWINS } from "./mtwins.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, "../../..");
const check = process.argv.includes("--check"), noSql = check || process.argv.includes("--no-sql");
const close = (a, b) => (a === null || b === null ? a === b : typeof a === "number" && typeof b === "number" ? Math.abs(a - b) <= (Math.abs(b) >= 1 ? 1e-4 : 1e-7) : String(a) === String(b));
let stale = 0, failed = 0, twinFails = 0, total = 0;

function runFile(rel, outputs, twins, kind) {
  const file = path.join(ROOT, rel);
  const ctx = { BC: { addLanguage() {}, addGlossary() {}, addLane(l) { ctx.group = l; }, addTrack(t) { ctx.group = t; } } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(file, "utf8"), ctx);
  const steps = ctx.group.lessons, results = outputs(steps);
  total += results.length;
  let src = fs.readFileSync(file, "utf8"), changed = false;
  for (const r of results) {
    if (r.error) { console.error(`FAIL  ${kind} "${r.t}": ${r.error}`); failed++; continue; }
    if (steps.find((s) => s.t === r.t).out === r.out) { console.log(`ok    ${kind} "${r.t}"`); continue; }
    stale++;
    console.log(`${check ? "STALE" : "write"} ${kind} "${r.t}"\n${r.out.replace(/^/gm, "        ")}`);
    if (!check) { src = setOut(src, r.t, r.out); changed = true; }
  }
  if (changed) fs.writeFileSync(file, src);
  if (noSql) return;
  const missing = steps.filter((s) => !twins[s.t]).map((s) => s.t);
  if (missing.length) { console.error(`FAIL  ${kind}: no SQL twin for: ${missing.join(", ")}`); failed++; }
  const p = spawnSync("python3", [path.join(HERE, "../dax/sql.py"), "twins"], { input: JSON.stringify(twins), encoding: "utf8", env: process.env });
  if (p.status !== 0) { console.error(p.stderr || p.stdout); process.exit(1); }
  const sql = JSON.parse(p.stdout);
  for (const r of results) {
    if (r.error || !twins[r.t]) continue;
    const mine = r.raw, theirs = sql[r.t];
    const bad = mine.length !== theirs.length ? `${mine.length} rows vs ${theirs.length} from SQL`
      : mine.map((row, i) => (row.length !== theirs[i].length ? 0 : row.findIndex((v, j) => !close(v, theirs[i][j])))).map((j, i) => (j < 0 ? null : `row ${i + 1}, column ${j + 1}: model ${JSON.stringify(mine[i][j])}, SQL ${JSON.stringify(theirs[i][j])}`)).find(Boolean);
    if (bad) { console.error(`TWIN  ${kind} "${r.t}": ${bad}`); twinFails++; } else console.log(`twin  ${kind} "${r.t}" matches SQL Server`);
  }
}

runFile("site/data/tracks/18-pbi.js", trackOutputs, TWINS, "track");
runFile("site/data/foundations/13-m.js", laneOutputs, LANE_TWINS, "lane");
console.log(`\n${total} steps and lessons, ${stale} output(s) ${check ? "stale" : "updated"}, ${failed} failed${noSql ? "" : `, ${twinFails} twin mismatch(es)`}`);
process.exit(failed || twinFails || (check && stale) ? 1 : 0);
