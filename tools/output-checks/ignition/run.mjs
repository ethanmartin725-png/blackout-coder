// Ignition lessons: generate each script and expression lesson's `out` by running it in
// real Jython 2.7 with a teaching model of system.* (sim/system) and the expression language
// (sim/expr.py). system.db talks to the SQL Server the SQL lane uses, reset to the canonical
// sample database before every lesson that touches it.
//   bash tools/output-checks/ignition/fetch.sh             once: download Jython and the JDBC driver
//   node tools/output-checks/ignition/run.mjs              write outs
//   node tools/output-checks/ignition/run.mjs --check      report stale outs, change nothing
// Needs Java, and for database lessons BC_SQL_PASSWORD and a running SQL Server (see sql_exec.py).
// Scenarios (tags, clock, what to call afterwards) are in scenarios.mjs. Limits: docs/IGNITION_SIM.md.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { setOut } from "../lib/lesson-file.mjs";
import { BASE_TAGS, SCENARIOS } from "./scenarios.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, "../../..");
const check = process.argv.includes("--check");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
const VENDOR = path.join(HERE, "vendor");
const CP = ["jython-standalone-2.7.4.jar", "mssql-jdbc-12.8.1.jre11.jar"].map((j) => path.join(VENDOR, j));
if (!CP.every((j) => fs.existsSync(j))) { console.error("Run bash tools/output-checks/ignition/fetch.sh first."); process.exit(3); }
const env = { ...process.env };
delete env.JAVA_TOOL_OPTIONS;
const PW = process.env.BC_SQL_PASSWORD;
const DB_URL = PW && `jdbc:sqlserver://${process.env.BC_SQL_SERVER || "localhost"}:${process.env.BC_SQL_PORT || "1433"};databaseName=PlantDB;user=${process.env.BC_SQL_USER || "sa"};password=${PW};encrypt=false`;

// Every data file, with the lanes and tracks it defines
const files = [];
for (const dir of ["site/data/foundations", "site/data/tracks"]) {
  for (const f of fs.readdirSync(path.join(ROOT, dir)).sort()) {
    const file = path.join(ROOT, dir, f), groups = [];
    const c = { BC: { addLanguage() {}, addLane(l) { groups.push({ ...l, kind: "lane" }); }, addTrack(t) { groups.push({ ...t, kind: "track" }); } } };
    vm.createContext(c);
    vm.runInContext(fs.readFileSync(file, "utf8"), c);
    files.push({ file, groups });
  }
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bc-ign-"));
let run = 0, stale = 0, failed = 0, skipped = 0;
for (const { file, groups } of files) {
  let src = fs.readFileSync(file, "utf8"), changed = false;
  for (const g of groups) {
    const ctx = {};
    for (const l of g.lessons) {
      const lang = g.kind === "lane" ? g.lang : l.lang;
      if (lang !== "ignition" && lang !== "ignexpr") continue;
      const key = `${g.id}/${l.t}`;
      // track steps in the same file build on each other; a lane lesson stands alone
      const fileKey = g.kind === "track" ? l.file : key;
      ctx[fileKey] = (ctx[fileKey] ? ctx[fileKey] + "\n" : "") + l.code;
      if (only && !key.includes(only)) continue;
      const sc = SCENARIOS[key];
      if (!sc) { console.error(`FAIL  no scenario for ${key}`); failed++; continue; }
      if (sc.db && !DB_URL) { console.log(`skip  ${key} (needs BC_SQL_PASSWORD and SQL Server)`); skipped++; continue; }
      if (sc.db) {
        const r = spawnSync("python3", [path.join(ROOT, "tools/output-checks/foundations/sql_exec.py"), "--reset"], { encoding: "utf8" });
        if (r.status !== 0) { console.error(`FAIL  ${key}: database reset: ${r.stderr}`); failed++; continue; }
      }
      const job = lang === "ignexpr"
        ? { kind: "expr", code: l.code, clock: sc.clock, tags: { ...BASE_TAGS, ...(sc.tags || {}) }, cases: sc.cases }
        : { kind: "script", code: ctx[fileKey], clock: sc.clock, tags: { ...BASE_TAGS, ...(sc.tags || {}) }, before: sc.before, after: sc.after, dbUrl: sc.db ? DB_URL : undefined };
      const jf = path.join(tmp, "job.json");
      fs.writeFileSync(jf, JSON.stringify(job));
      const r = spawnSync("java", ["-cp", CP.join(":"), "org.python.util.jython", path.join(HERE, "sim/runner.py"), jf, path.join(HERE, "sim")], { encoding: "utf8", env, cwd: tmp });
      run++;
      if (r.status !== 0) { console.error(`FAIL  ${key}\n${(r.stderr || r.stdout).trim().split("\n").slice(-4).join("\n")}`); failed++; continue; }
      const out = r.stdout.replace(/\s+$/, "");
      if (l.out === out) { console.log(`ok    ${key}`); continue; }
      stale++;
      console.log(`${check ? "STALE" : "write"} ${key}\n${out.replace(/^/gm, "        ")}`);
      if (!check) { src = setOut(src, l.t, out); changed = true; }
    }
  }
  if (changed) fs.writeFileSync(file, src);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${run} lessons run, ${stale} output(s) ${check ? "stale" : "updated"}, ${skipped} skipped, ${failed} failed`);
process.exit(failed || (check && stale) ? 1 : 0);
