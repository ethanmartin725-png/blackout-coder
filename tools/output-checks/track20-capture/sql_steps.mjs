// Automated Capture: generate the SQL steps' outputs by running them on SQL Server against the
// canonical sample database (tools/output-checks/foundations/sql_exec.py), which seeds
// machine_event with seeded_events(). Steps after "A clean view" read v_event_clean, so the view is
// created first, in its own batch, exactly as that step writes it. "Load the summary twice" runs
// its MERGE twice, then shows the table: the second run must change nothing.
//   node tools/output-checks/track20-capture/sql_steps.mjs           write outs
//   node tools/output-checks/track20-capture/sql_steps.mjs --check   report stale outs, change nothing
// Needs BC_SQL_PASSWORD and a running SQL Server (see sql_exec.py). The Ignition steps' outputs
// come from tools/output-checks/ignition/run.mjs.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { setOut } from "../lib/lesson-file.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const FILE = path.join(ROOT, "site/data/tracks/20-capture.js");
const check = process.argv.includes("--check");
const c = { BC: { addTrack(t) { c.t = t; }, addLane() {}, addLanguage() {} } };
vm.createContext(c);
vm.runInContext(fs.readFileSync(FILE, "utf8"), c);
const track = c.t;
const code = (title) => track.lessons.find((l) => l.t === title).code;
const view = () => code("A clean view") + "\nGO\n";
const schema = `SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name, DATA_TYPE AS type, IS_NULLABLE AS nullable
FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME IN ('machine_event', 'hourly_summary')
ORDER BY TABLE_NAME DESC, ORDINAL_POSITION;`;
const plain = (title) => ({ sql: () => code(title) });
const STEPS = {
  "Create the capture tables": { sql: () => code("Create the capture tables"), after: schema },
  "What landed": plain("What landed"),
  "Bad-quality readings": plain("Bad-quality readings"),
  "Duplicates": plain("Duplicates"),
  "Late arrivals": plain("Late arrivals"),
  "Impossible jumps": plain("Impossible jumps"),
  "A clean view": { sql: () => code("A clean view"), after: "SELECT event_id, tag, value, ts FROM v_event_clean ORDER BY ts, event_id;" },
  "State durations": { sql: () => view() + code("State durations") },
  "Hourly barrels from events": { sql: () => view() + code("Hourly barrels from events") },
  "Load the summary twice": {
    sql: () => view() + code("Load the summary twice") + "\nGO\n" + code("Load the summary twice"),
    after: "SELECT machine, hour_end, barrels FROM hourly_summary ORDER BY hour_end;",
  },
};

let src = fs.readFileSync(FILE, "utf8"), stale = 0, failed = 0;
for (const [title, opt] of Object.entries(STEPS)) {
  const step = track.lessons.find((l) => l.t === title);
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
