// DAX lane: generate each lesson's `out` with the DAX teaching model, and prove it with SQL twins.
//   node tools/output-checks/dax/run.mjs            write outs, then run every SQL twin on SQL Server
//   node tools/output-checks/dax/run.mjs --check    report stale outs (no database needed; the verifier does the same)
//   node tools/output-checks/dax/run.mjs --no-sql   write outs, skip the twins
// The model reads plantdb.json, a snapshot of the canonical PlantDB (python3 sql.py export).
// Lessons build one model in lane order: a lesson can use the measures of every lesson before it.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { setOut } from "../lib/lesson-file.mjs";
import { lessonOutputs } from "./lane.mjs";
import { TWINS } from "./twins.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, "../../..");
const FILE = path.join(ROOT, "site/data/foundations/12-dax.js");
const check = process.argv.includes("--check"), noSql = check || process.argv.includes("--no-sql");

const ctx = { BC: { addLanguage() {}, addGlossary() {}, addTrack() {}, addLane(l) { ctx.lane = l; } } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(FILE, "utf8"), ctx);
const lessons = ctx.lane.lessons;
const results = lessonOutputs(lessons);

let src = fs.readFileSync(FILE, "utf8"), stale = 0, failed = 0;
for (const r of results) {
  if (r.error) { console.error(`FAIL  "${r.t}": ${r.error}`); failed++; continue; }
  const l = lessons.find((x) => x.t === r.t);
  if (l.out === r.out) { console.log(`ok    "${r.t}"`); continue; }
  stale++;
  console.log(`${check ? "STALE" : "write"} "${r.t}"\n${r.out.replace(/^/gm, "        ")}`);
  if (!check) src = setOut(src, r.t, r.out);
}
if (!check && stale) fs.writeFileSync(FILE, src);

// SQL twins: the same question asked of SQL Server must give the same numbers.
let twinFails = 0;
if (!noSql) {
  const missing = lessons.filter((l) => !TWINS[l.t]).map((l) => l.t);
  if (missing.length) { console.error(`FAIL  no SQL twin for: ${missing.join(", ")}`); failed++; }
  const p = spawnSync("python3", [path.join(HERE, "sql.py"), "twins"], { input: JSON.stringify(TWINS), encoding: "utf8", env: process.env });
  if (p.status !== 0) { console.error(p.stderr || p.stdout); process.exit(1); }
  const sql = JSON.parse(p.stdout);
  const close = (a, b) => {
    if (a === null || b === null) return a === b;
    if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= (Math.abs(b) >= 1 ? 1e-4 : 1e-7);
    return String(a) === String(b);
  };
  for (const r of results) {
    if (r.error || !TWINS[r.t]) continue;
    const mine = r.raw, theirs = sql[r.t];
    const bad = mine.length !== theirs.length ? `${mine.length} rows vs ${theirs.length} from SQL`
      : mine.map((row, i) => row.findIndex((v, j) => !close(v, theirs[i][j]))).map((j, i) => (j < 0 ? null : `row ${i + 1}, column ${j + 1}: DAX ${JSON.stringify(mine[i][j])}, SQL ${JSON.stringify(theirs[i][j])}`)).find(Boolean);
    if (bad) { console.error(`TWIN  "${r.t}": ${bad}`); twinFails++; } else console.log(`twin  "${r.t}" matches SQL Server`);
  }
}
console.log(`\n${results.length} lessons, ${stale} output(s) ${check ? "stale" : "updated"}, ${failed} failed${noSql ? "" : `, ${twinFails} twin mismatch(es)`}`);
process.exit(failed || twinFails || (check && stale) ? 1 : 0);
