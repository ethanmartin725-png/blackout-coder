// DB Pulls & Analytics: generate every SQL step's output by running it on SQL Server against the
// canonical sample database (tools/output-checks/foundations/sql_exec.py). A step that only creates
// something gets a check query run after it, printed above its result; a long result can show its
// first rows and say how many there are.
//   node tools/output-checks/track2-db/sql_steps.mjs           write outs
//   node tools/output-checks/track2-db/sql_steps.mjs --check   report stale outs, change nothing
// Needs BC_SQL_PASSWORD and a running SQL Server (see sql_exec.py).
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { setOut } from "../lib/lesson-file.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const FILE = path.join(ROOT, "site/data/tracks/02-db.js");
const schema = (table) => `SELECT COLUMN_NAME AS column_name, DATA_TYPE AS type, CHARACTER_MAXIMUM_LENGTH AS max_len,
    IS_NULLABLE AS nullable, COLUMN_DEFAULT AS default_value,
    COLUMNPROPERTY(OBJECT_ID('${table}'), COLUMN_NAME, 'IsIdentity') AS is_identity
FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}' ORDER BY ORDINAL_POSITION;`;
// title -> { after: check query, first: show only the first N rows }
const STEPS = {
  "Create fault_log": { after: schema("fault_log") },
  "Create count_log": { after: schema("count_log") },
  "Machine dimension": { after: "SELECT * FROM dim_machine ORDER BY machine;" },
  "Open faults right now": {},
  "Fault durations": { first: 4 },
  "Downtime Pareto": {},
  "Bucket by shift": {},
  "Downtime in dollars": {},
  "Barrels per hour with LAG": {},
  "Handle the counter reset": {},
  "Cumulative Pareto": {},
  "Save it as a view": { after: "SELECT TOP 3 * FROM v_fault_minutes ORDER BY start_ts;" },
};
// Keep the header and the first n rows of a one-table result
function firstRows(out, n) {
  const lines = out.split("\n"), rows = lines.length - 1;
  return rows <= n ? out : [...lines.slice(0, n + 1), `… ${rows} rows in all`].join("\n");
}
const check = process.argv.includes("--check");

const ctx = { BC: { addTrack(t) { ctx.track = t; }, addLane() {}, addLanguage() {} } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(FILE, "utf8"), ctx);
let src = fs.readFileSync(FILE, "utf8"), stale = 0, failed = 0;
const sqlSteps = ctx.track.lessons.filter((l) => l.lang === "sql").map((l) => l.t);
for (const t of sqlSteps) if (!STEPS[t]) { console.error(`FAIL  no entry for SQL step "${t}"`); failed++; }
for (const [title, opt] of Object.entries(STEPS)) {
  const step = ctx.track.lessons.find((l) => l.t === title);
  if (!step) { console.error(`FAIL  no step "${title}"`); failed++; continue; }
  const env = { ...process.env, BC_SQL_AFTER: opt.after || "" };
  const r = spawnSync("python3", [path.join(ROOT, "tools/output-checks/foundations/sql_exec.py")], { input: step.code, encoding: "utf8", env });
  if (r.status !== 0) { console.error(`FAIL  "${title}": ${r.stderr.trim()}`); failed++; continue; }
  let out = r.stdout.replace(/\s+$/, "");
  if (opt.first) out = firstRows(out, opt.first);
  if (step.out === out) { console.log(`ok    "${title}"`); continue; }
  stale++;
  console.log(`${check ? "STALE" : "write"} "${title}"\n${out.replace(/^/gm, "        ")}`);
  if (!check) src = setOut(src, title, out);
}
if (!check && stale) fs.writeFileSync(FILE, src);
console.log(`\n${Object.keys(STEPS).length} steps run, ${stale} output(s) ${check ? "stale" : "updated"}, ${failed} failed`);
process.exit(failed || (check && stale) ? 1 : 0);
