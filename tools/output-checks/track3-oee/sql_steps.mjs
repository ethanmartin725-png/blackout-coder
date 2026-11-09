// OEE Loss Report: generate the SQL steps' outputs by running them on SQL Server against the
// canonical sample database (tools/output-checks/foundations/sql_exec.py).
// Steps 3 to 5 are one file, oee_inputs.sql, so step 5 runs all three together. It reads two views
// that earlier steps create (v_hourly_barrels here, v_fault_minutes in DB Pulls & Analytics), so
// those are created first, in their own batches, exactly as the lessons write them.
//   node tools/output-checks/track3-oee/sql_steps.mjs           write outs
//   node tools/output-checks/track3-oee/sql_steps.mjs --check   report stale outs, change nothing
// Needs BC_SQL_PASSWORD and a running SQL Server (see sql_exec.py).
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { setOut } from "../lib/lesson-file.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const FILE = path.join(ROOT, "site/data/tracks/03-oee.js");
const check = process.argv.includes("--check");
const load = (f) => { const c = { BC: { addTrack(t) { c.t = t; }, addLane() {}, addLanguage() {} } }; vm.createContext(c); vm.runInContext(fs.readFileSync(path.join(ROOT, "site/data/tracks", f), "utf8"), c); return c.t; };
const oee = load("03-oee.js"), db = load("02-db.js");
const code = (t, title) => t.lessons.find((l) => l.t === title).code;
const views = [code(oee, "Hourly barrels view"), code(db, "Save it as a view")].join("\nGO\n") + "\nGO\n";
const schema = (table) => `SELECT COLUMN_NAME AS column_name, DATA_TYPE AS type, CHARACTER_MAXIMUM_LENGTH AS max_len,
    IS_NULLABLE AS nullable, COLUMN_DEFAULT AS default_value,
    COLUMNPROPERTY(OBJECT_ID('${table}'), COLUMN_NAME, 'IsIdentity') AS is_identity
FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}' ORDER BY ORDINAL_POSITION;`;
const STEPS = {
  "Create reject_log": { sql: () => code(oee, "Create reject_log"), after: schema("reject_log") },
  "Hourly barrels view": { sql: () => code(oee, "Hourly barrels view"), after: "SELECT TOP 4 * FROM v_hourly_barrels ORDER BY ts, machine;" },
  "One row per machine": { sql: () => views + ["Week window and counts", "Rejects and downtime CTEs", "One row per machine"].map((t) => code(oee, t)).join("\n") },
};

let src = fs.readFileSync(FILE, "utf8"), stale = 0, failed = 0;
for (const [title, opt] of Object.entries(STEPS)) {
  const step = oee.lessons.find((l) => l.t === title);
  const r = spawnSync("python3", [path.join(ROOT, "tools/output-checks/foundations/sql_exec.py")], { input: opt.sql(), encoding: "utf8", env: { ...process.env, BC_SQL_AFTER: opt.after || "" } });
  if (r.status !== 0) { console.error(`FAIL  "${title}": ${r.stderr.trim()}`); failed++; continue; }
  const out = r.stdout.replace(/\s+$/, "");
  if (step.out === out) { console.log(`ok    "${title}"`); continue; }
  stale++;
  console.log(`${check ? "STALE" : "write"} "${title}"\n${out.replace(/^/gm, "        ")}`);
  if (!check) src = setOut(src, title, out);
}
if (!check && stale) fs.writeFileSync(FILE, src);
console.log(`\n${Object.keys(STEPS).length} steps run, ${stale} output(s) ${check ? "stale" : "updated"}, ${failed} failed`);
process.exit(failed || (check && stale) ? 1 : 0);
