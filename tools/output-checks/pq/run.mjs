// Power BI report track: generate each step's `out` with the M and DAX teaching models, and prove
// it with SQL twins on SQL Server.
//   node tools/output-checks/pq/run.mjs            write outs, then run every SQL twin
//   node tools/output-checks/pq/run.mjs --check    report stale outs (no database needed)
//   node tools/output-checks/pq/run.mjs --no-sql   write outs, skip the twins
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { setOut } from "../lib/lesson-file.mjs";
import { trackOutputs } from "./lane.mjs";
import { TWINS } from "./twins.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, "../../..");
const FILE = path.join(ROOT, "site/data/tracks/18-pbi.js");
const check = process.argv.includes("--check"), noSql = check || process.argv.includes("--no-sql");

const ctx = { BC: { addLanguage() {}, addGlossary() {}, addLane() {}, addTrack(t) { ctx.track = t; } } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(FILE, "utf8"), ctx);
const steps = ctx.track.lessons;
const results = trackOutputs(steps);

let src = fs.readFileSync(FILE, "utf8"), stale = 0, failed = 0;
for (const r of results) {
  if (r.error) { console.error(`FAIL  "${r.t}": ${r.error}`); failed++; continue; }
  if (steps.find((s) => s.t === r.t).out === r.out) { console.log(`ok    "${r.t}"`); continue; }
  stale++;
  console.log(`${check ? "STALE" : "write"} "${r.t}"\n${r.out.replace(/^/gm, "        ")}`);
  if (!check) src = setOut(src, r.t, r.out);
}
if (!check && stale) fs.writeFileSync(FILE, src);

let twinFails = 0;
if (!noSql) {
  const missing = steps.filter((s) => !TWINS[s.t]).map((s) => s.t);
  if (missing.length) { console.error(`FAIL  no SQL twin for: ${missing.join(", ")}`); failed++; }
  const p = spawnSync("python3", [path.join(HERE, "../dax/sql.py"), "twins"], { input: JSON.stringify(TWINS), encoding: "utf8", env: process.env });
  if (p.status !== 0) { console.error(p.stderr || p.stdout); process.exit(1); }
  const sql = JSON.parse(p.stdout);
  const close = (a, b) => (a === null || b === null ? a === b : typeof a === "number" && typeof b === "number" ? Math.abs(a - b) <= (Math.abs(b) >= 1 ? 1e-4 : 1e-7) : String(a) === String(b));
  for (const r of results) {
    if (r.error || !TWINS[r.t]) continue;
    const mine = r.raw, theirs = sql[r.t];
    const bad = mine.length !== theirs.length ? `${mine.length} rows vs ${theirs.length} from SQL`
      : mine.map((row, i) => row.findIndex((v, j) => !close(v, theirs[i][j]))).map((j, i) => (j < 0 ? null : `row ${i + 1}, column ${j + 1}: model ${JSON.stringify(mine[i][j])}, SQL ${JSON.stringify(theirs[i][j])}`)).find(Boolean);
    if (bad) { console.error(`TWIN  "${r.t}": ${bad}`); twinFails++; } else console.log(`twin  "${r.t}" matches SQL Server`);
  }
}
console.log(`\n${results.length} steps, ${stale} output(s) ${check ? "stale" : "updated"}, ${failed} failed${noSql ? "" : `, ${twinFails} twin mismatch(es)`}`);
process.exit(failed || twinFails || (check && stale) ? 1 : 0);
