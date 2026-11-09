// DB Pulls & Analytics: generate the outputs of the SQL steps that read count_log by running them
// on SQL Server against the canonical sample database (tools/output-checks/foundations/sql_exec.py).
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
const STEPS = ["Barrels per hour with LAG", "Handle the counter reset"];
const check = process.argv.includes("--check");

const ctx = { BC: { addTrack(t) { ctx.track = t; }, addLane() {}, addLanguage() {} } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(FILE, "utf8"), ctx);
let src = fs.readFileSync(FILE, "utf8"), stale = 0, failed = 0;
for (const title of STEPS) {
  const step = ctx.track.lessons.find((l) => l.t === title);
  const r = spawnSync("python3", [path.join(ROOT, "tools/output-checks/foundations/sql_exec.py")], { input: step.code, encoding: "utf8" });
  if (r.status !== 0) { console.error(`FAIL  "${title}": ${r.stderr.trim()}`); failed++; continue; }
  const out = r.stdout.replace(/\s+$/, "");
  if (step.out === out) { console.log(`ok    "${title}"`); continue; }
  stale++;
  console.log(`${check ? "STALE" : "write"} "${title}"\n${out.replace(/^/gm, "        ")}`);
  if (!check) src = setOut(src, title, out);
}
if (!check && stale) fs.writeFileSync(FILE, src);
console.log(`\n${STEPS.length} steps run, ${stale} output(s) ${check ? "stale" : "updated"}, ${failed} failed`);
process.exit(failed || (check && stale) ? 1 : 0);
