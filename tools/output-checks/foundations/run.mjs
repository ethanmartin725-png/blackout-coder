// Runs every Foundations lesson that is a complete program and writes what it prints into the
// lesson's `out` field, so "What it produces" always comes from running the code.
//
//   node tools/output-checks/foundations/run.mjs           write outputs into site/data/foundations/*.js
//   node tools/output-checks/foundations/run.mjs --check   report lessons whose stored output is stale
//
// Toolchains: node (JavaScript, always present), python3, dotnet (.NET 8), g++ (C++17), javac/java. A missing toolchain skips its lane.
// SQL runs on a real SQL Server through sql_exec.py, against a fresh copy of the canonical sample database
// (see that file for the server setup; without a reachable server the SQL lane is skipped).
// Not run: ladder (drawn as a diagram), HTML (rendered as a preview). A lesson that prints nothing,
// such as a class with no entry point or a CREATE TABLE, gets no output.
// Fixture: Python "Read a CSV file" runs next to shift_log.csv from this folder.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { setOut } from "../lib/lesson-file.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const DIR = path.join(ROOT, "site/data/foundations");
const CHECK = process.argv.includes("--check");
// LANG=en_US.UTF-8 makes .NET format like a US Windows PC (76.7%, not the neutral culture's 76.7 %),
// which is what a learner running these lessons will see.
const env = { ...process.env, DOTNET_CLI_TELEMETRY_OPTOUT: "1", DOTNET_NOLOGO: "1", PYTHONDONTWRITEBYTECODE: "1", LANG: "en_US.UTF-8" };
delete env.JAVA_TOOL_OPTIONS; // keeps the JVM from printing "Picked up JAVA_TOOL_OPTIONS" on stderr

const has = (cmd, arg = "--version") => spawnSync(cmd, [arg], { env }).status === 0;
const sqlReady = () => {
  const r = spawnSync("python3", [path.join(HERE, "sql_exec.py")], { env, input: "SELECT 1 AS ok;", encoding: "utf8", timeout: 120000 });
  if (r.status !== 0) console.warn(`SQL Server not available: ${(r.stderr || "").trim()}`);
  return r.status === 0;
};
const tools = { jscon: true, python: has("python3"), csharp: has("dotnet"), cpp: has("g++"), java: has("javac", "-version"), sql: sqlReady() };

function sh(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, env, encoding: "utf8", timeout: 120000 });
  return { ok: r.status === 0, out: (r.stdout || "").replace(/\s+$/, ""), err: (r.stderr || "").trim() };
}

// Each runner returns { out } or { skip: reason }; it throws on a real failure.
const runners = {
  jscon(code, d) {
    fs.writeFileSync(path.join(d, "main.js"), code + "\n");
    const r = sh(process.execPath, ["main.js"], d);
    if (!r.ok || r.err) throw new Error(r.err || "exit code not 0");
    return { out: r.out };
  },
  python(code, d) {
    fs.writeFileSync(path.join(d, "main.py"), code + "\n");
    if (code.includes("shift_log.csv")) fs.copyFileSync(path.join(HERE, "shift_log.csv"), path.join(d, "shift_log.csv"));
    const r = sh("python3", ["-I", "main.py"], d);
    if (!r.ok || r.err) throw new Error(r.err || "exit code not 0");
    return { out: r.out };
  },
  csharp(code, d) {
    fs.writeFileSync(path.join(d, "Lesson.csproj"), '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net8.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings><Nullable>enable</Nullable></PropertyGroup></Project>');
    fs.writeFileSync(path.join(d, "Program.cs"), code + "\n");
    const b = sh("dotnet", ["build", "-nologo", "-v", "q", "-clp:NoSummary;ErrorsOnly"], d);
    if (!b.ok) {
      if (/CS5001/.test(b.out)) return { skip: "no entry point (defines a class only)" };
      throw new Error(b.out.split("\n").filter((l) => /error/.test(l)).slice(0, 3).join("\n"));
    }
    const r = sh("dotnet", ["run", "--no-build"], d);
    if (!r.ok || r.err) throw new Error(r.err || "exit code not 0");
    return { out: r.out };
  },
  cpp(code, d) {
    fs.writeFileSync(path.join(d, "main.cpp"), code + "\n");
    const b = sh("g++", ["-std=c++17", "-Wall", "-Wextra", "-o", "main", "main.cpp"], d);
    if (!b.ok || b.err) throw new Error(b.err || "compile failed");
    const r = sh("./main", [], d);
    if (!r.ok || r.err) throw new Error(r.err || "exit code not 0");
    return { out: r.out };
  },
  sql(code) {
    const r = spawnSync("python3", [path.join(HERE, "sql_exec.py")], { env, input: code, encoding: "utf8", timeout: 120000 });
    if (r.status !== 0) throw new Error((r.stderr || "").trim() || "sql_exec failed");
    return { out: (r.stdout || "").replace(/\s+$/, "") };
  },
  java(code, d) {
    const cls = (code.match(/public\s+class\s+(\w+)/) || [])[1];
    if (!cls) throw new Error("no public class");
    fs.writeFileSync(path.join(d, cls + ".java"), code + "\n");
    const b = sh("javac", [cls + ".java"], d);
    if (!b.ok || b.err) throw new Error(b.err || "compile failed");
    const r = sh("java", [cls], d);
    if (!r.ok || r.err) throw new Error(r.err || "exit code not 0");
    return { out: r.out };
  },
};

// Load the lanes exactly as the site does
const ctx = { lanes: [] };
ctx.BC = { addLanguage() {}, addLane(l) { ctx.lanes.push(l); }, addTrack() {} };
vm.createContext(ctx);
const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".js")).sort();
const laneFile = {};
for (const f of files) {
  const before = ctx.lanes.length;
  vm.runInContext(fs.readFileSync(path.join(DIR, f), "utf8"), ctx);
  for (const l of ctx.lanes.slice(before)) laneFile[l.id] = f;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bc-found-"));
let changed = 0, failed = 0, ran = 0;
const sources = {};
for (const lane of ctx.lanes) {
  const run = runners[lane.lang];
  if (!run) continue;
  if (!tools[lane.lang]) { console.warn(`skip  ${lane.id}: toolchain not found`); continue; }
  const file = laneFile[lane.id];
  sources[file] = sources[file] || fs.readFileSync(path.join(DIR, file), "utf8");
  lane.lessons.forEach((l, i) => {
    const where = `${lane.id} #${i + 1} "${l.t}"`;
    const d = path.join(tmp, `${lane.id}-${i + 1}`);
    fs.mkdirSync(d);
    let res;
    try { res = run(l.code, d); }
    catch (e) { failed++; console.error(`FAIL  ${where}: ${e.message}`); return; }
    const out = res.skip || !res.out ? null : res.out;
    if (res.skip) console.log(`none  ${where}: ${res.skip}`);
    else if (out === null) console.log(`none  ${where}: prints nothing`);
    else { ran++; console.log(`ok    ${where}\n${out.replace(/^/gm, "        ")}`); }
    if ((l.out ?? null) !== out) {
      changed++;
      if (CHECK) console.error(`STALE ${where}: stored output does not match`);
      else sources[file] = setOut(sources[file], l.t, out);
    }
  });
}
fs.rmSync(tmp, { recursive: true, force: true });

if (!CHECK) for (const [f, s] of Object.entries(sources)) fs.writeFileSync(path.join(DIR, f), s);
console.log(`\n${ran} lessons run, ${changed} output(s) ${CHECK ? "stale" : "updated"}, ${failed} failed`);
process.exit(failed || (CHECK && changed) ? 1 : 0);
