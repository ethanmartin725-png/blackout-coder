// Checks every lesson before it ships. Run from the repo root:  node tools/verify.mjs
// Exit code 1 if anything fails, so CI blocks the deploy.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import os from "node:os";
import { spawnSync, execFile } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site");
const errors = [];
const warns = [];
const fail = (m) => errors.push(m);

// 1. Load scripts in the same order as index.html
const index = fs.readFileSync(path.join(SITE, "index.html"), "utf8");
const srcs = [...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const ctx = { console };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const s of srcs) {
  if (s === "js/app.js") continue;
  const file = path.join(SITE, s);
  if (!fs.existsSync(file)) { fail(`index.html references missing file ${s}`); continue; }
  try { vm.runInContext(fs.readFileSync(file, "utf8"), ctx, { filename: s }); }
  catch (e) { fail(`${s}: ${e.message}`); }
}

// 2. Every data file must be listed in index.html
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of walk(path.join(SITE, "data"))) {
  const rel = path.relative(SITE, f).split(path.sep).join("/");
  if (rel.endsWith(".js") && !srcs.includes(rel)) fail(`${rel} exists but is not loaded in index.html`);
}

const { BC, BCcore } = ctx;
if (!BC || !BCcore) { console.error("Registry or core failed to load."); console.error(errors.join("\n")); process.exit(1); }

// 3. Lesson checks
const pyFiles = [];
const jsFiles = [];
const csProjects = {};
const nativeFiles = []; // C++ and Java: one compile per lesson, or per track file once finished
let lessons = 0;
const ids = new Set();
const groups = [...BC.lanes.map((l) => ({ kind: "lane", g: l })), ...BC.tracks.map((t) => ({ kind: "track", g: t }))];
for (const { kind, g } of groups) {
  if (!g.id || !g.name) { fail(`${kind} missing id or name`); continue; }
  if (ids.has(g.id)) fail(`duplicate lane/track id ${g.id}`);
  ids.add(g.id);
  if (g.soon) continue;
  if (!Array.isArray(g.lessons) || !g.lessons.length) { fail(`${g.id}: no lessons`); continue; }
  const titles = new Set();
  const fileText = {};
  g.lessons.forEach((l, i) => {
    lessons++;
    const where = `${g.id} #${i + 1} "${l.t}"`;
    for (const k of ["t", "goal", "code", "about", "terms"]) if (!l[k]) fail(`${where}: missing ${k}`);
    if (titles.has(l.t)) fail(`${where}: duplicate title in ${g.id} (progress is keyed by title)`);
    titles.add(l.t);
    const langId = kind === "lane" ? g.lang : l.lang;
    const ld = BC.languages[langId];
    if (!ld) { fail(`${where}: unknown language "${langId}"`); return; }
    if (kind === "track" && !l.file) fail(`${where}: track steps need a file name`);
    (l.terms || []).forEach((t, j) => {
      if (!Array.isArray(t) || t.length !== 3) fail(`${where}: term ${j + 1} must be [key, label, definition]`);
      else if (t[0] !== null && !l.code.includes(t[0])) warns.push(`${where}: term key "${t[0]}" not found in this step's code`);
    });
    if (/\t/.test(l.code)) fail(`${where}: code contains a tab character; use spaces`);
    // The lesson must be completable by typing its own code
    const T = BCcore.targetLines(l.code);
    const a = BCcore.analyzeText(l.code, T, ld.py);
    if (!BCcore.isCompleteFor(a, T)) fail(`${where}: typing the target code does not complete the lesson`);
    // Collect code for compile checks; track steps in the same file build on each other
    const key = kind === "track" ? `${g.id}::${l.file}` : `${g.id}::${i}`;
    fileText[key] = (fileText[key] ? fileText[key] + "\n" : "") + l.code;
    if (ld.py) pyFiles.push({ where, code: fileText[key] });
    if (langId === "js") jsFiles.push({ where, code: fileText[key] });
    if (langId === "cpp" || langId === "java") nativeFiles.push({ where, lang: langId, key, code: fileText[key] });
    if (langId === "csharp") {
      // One program per Foundations lesson; one project per track, built from each file's finished code
      const proj = kind === "track" ? g.id : `${g.id}-${i + 1}`;
      const p = (csProjects[proj] = csProjects[proj] || { files: {} });
      const f = (p.files[kind === "track" ? l.file : "Program.cs"] = p.files[kind === "track" ? l.file : "Program.cs"] || { text: "", steps: [] });
      const first = f.text ? f.text.split("\n").length + 1 : 1;
      f.text = f.text ? f.text + "\n" + l.code : l.code;
      f.steps.push({ where, first, last: f.text.split("\n").length });
    }
  });
}

// 4. JavaScript steps must parse
for (const f of jsFiles) {
  try { new vm.Script(f.code); } catch (e) { fail(`${f.where}: JavaScript syntax error: ${e.message}`); }
}

// 5. Python and Ignition steps must compile (skipped with a warning if python3 is missing)
const py = ["python3", "python"].find((c) => spawnSync(c, ["--version"]).status === 0);
if (!py) warns.push("python not found; skipped Python compile checks");
else {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bc-verify-"));
  const list = pyFiles.map((f, i) => { const p = path.join(dir, `l${i}.py`); fs.writeFileSync(p, f.code); return p; });
  const r = spawnSync(py, ["-c", "import sys,py_compile\nbad=0\nfor p in sys.argv[1:]:\n try: py_compile.compile(p,doraise=True)\n except py_compile.PyCompileError as e: print(p+'|'+str(e).splitlines()[-1]); bad+=1\n"].concat(list), { encoding: "utf8" });
  for (const line of (r.stdout || "").trim().split("\n").filter(Boolean)) {
    const [p, msg] = line.split("|");
    const i = list.indexOf(p);
    fail(`${pyFiles[i] ? pyFiles[i].where : p}: Python does not compile: ${msg}`);
  }
  fs.rmSync(dir, { recursive: true, force: true });
}

// 6. C# must compile (skipped with a warning if the .NET SDK is missing)
const csNames = Object.keys(csProjects);
let csBuilt = 0;
if (csNames.length && spawnSync("dotnet", ["--version"]).status !== 0) warns.push("dotnet not found; skipped C# compile checks");
else if (csNames.length) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bc-cs-"));
  const env = { ...process.env, DOTNET_CLI_TELEMETRY_OPTOUT: "1", DOTNET_NOLOGO: "1" };
  const jobs = csNames.map((name) => {
    const p = csProjects[name];
    const d = path.join(dir, name);
    fs.mkdirSync(d);
    const sql = Object.values(p.files).some((f) => f.text.includes("Microsoft.Data.SqlClient"));
    fs.writeFileSync(path.join(d, "Check.csproj"), `<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net8.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings><Nullable>enable</Nullable></PropertyGroup>${sql ? '<ItemGroup><PackageReference Include="Microsoft.Data.SqlClient" Version="7.1.1" /></ItemGroup>' : ""}</Project>`);
    for (const [fname, f] of Object.entries(p.files)) fs.writeFileSync(path.join(d, fname), f.text + "\n");
    return () => new Promise((resolve) => {
      const build = (extra, done) => execFile("dotnet", ["build", "-nologo", "-v", "q", "-clp:NoSummary;ErrorsOnly", ...extra], { cwd: d, env, maxBuffer: 1 << 24 }, (err, stdout) => done(!err, stdout || String(err)));
      build([], (ok, out) => {
        // A lesson that only defines a class has no entry point (CS5001). Check it as a library instead.
        const errs = out.split("\n").filter((x) => /error [A-Z]+\d+/.test(x));
        if (!ok && errs.length && errs.every((x) => x.includes("CS5001"))) build(["-p:OutputType=Library"], (ok2, out2) => resolve({ name, p, ok: ok2, out: out2 }));
        else resolve({ name, p, ok, out });
      });
    });
  });
  // Build a few at a time: each build is a separate process
  const results = [];
  for (let i = 0; i < jobs.length; i += 4) results.push(...(await Promise.all(jobs.slice(i, i + 4).map((run) => run()))));
  for (const r of results) {
    if (r.ok) { csBuilt++; continue; }
    const msgs = [...new Set(r.out.split("\n").filter((x) => /error [A-Z]+\d+/.test(x)))];
    if (!msgs.length) { fail(`${r.name}: C# build failed: ${r.out.trim().split("\n").slice(-3).join(" ")}`); continue; }
    for (const m of msgs) {
      const hit = m.match(/([\w.]+\.cs)\((\d+),\d+\): error (\w+): (.*?)(?: \[.*)?$/);
      if (!hit) { fail(`${r.name}: ${m.trim()}`); continue; }
      const [, fname, line, codeId, text] = hit;
      const f = r.p.files[fname];
      const step = f && f.steps.find((s) => +line >= s.first && +line <= s.last);
      fail(`${step ? step.where : r.name} (${fname} line ${line}): C# ${codeId}: ${text}`);
    }
  }
  fs.rmSync(dir, { recursive: true, force: true });
}

// 7. C++ and Java must compile (each skipped with a warning if its compiler is missing)
// A track file is checked once, with all of its steps; a Foundations lesson on its own.
const lastByKey = new Map();
for (const f of nativeFiles) lastByKey.set(f.key, f);
const natives = [...lastByKey.values()];
const quiet = { ...process.env };
delete quiet.JAVA_TOOL_OPTIONS; // otherwise the JVM prints a notice on stderr
const compilers = {
  cpp: { ok: spawnSync("g++", ["--version"]).status === 0, name: "g++",
    run: (d, code) => { fs.writeFileSync(path.join(d, "main.cpp"), code + "\n"); return spawnSync("g++", ["-std=c++17", "-Wall", "-fsyntax-only", "main.cpp"], { cwd: d, encoding: "utf8" }); } },
  java: { ok: spawnSync("javac", ["-version"], { env: quiet }).status === 0, name: "javac",
    run: (d, code) => { const cls = (code.match(/public\s+class\s+(\w+)/) || [])[1] || "Main"; fs.writeFileSync(path.join(d, cls + ".java"), code + "\n"); return spawnSync("javac", ["-d", d, cls + ".java"], { cwd: d, encoding: "utf8", env: quiet }); } },
};
const nativeCount = { cpp: 0, java: 0 };
for (const lang of ["cpp", "java"]) {
  const list = natives.filter((f) => f.lang === lang);
  if (!list.length) continue;
  if (!compilers[lang].ok) { warns.push(`${compilers[lang].name} not found; skipped ${lang === "cpp" ? "C++" : "Java"} compile checks`); continue; }
  for (const f of list) {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), `bc-${lang}-`));
    const r = compilers[lang].run(d, f.code);
    if (r.status !== 0) fail(`${f.where}: ${lang === "cpp" ? "C++" : "Java"} does not compile: ${(r.stderr || "").split("\n").filter((x) => /error/.test(x)).slice(0, 2).join(" | ")}`);
    else nativeCount[lang]++;
    fs.rmSync(d, { recursive: true, force: true });
  }
}

const summary = `${BC.lanes.length} lanes, ${BC.tracks.length} tracks, ${lessons} lessons, ${pyFiles.length} Python checks, ${jsFiles.length} JavaScript checks, ${csBuilt} C# builds, ${nativeCount.cpp} C++ and ${nativeCount.java} Java compiles`;
for (const w of warns) console.warn("warn  " + w);
if (errors.length) { for (const e of errors) console.error("FAIL  " + e); console.error(`\n${errors.length} problem(s). ${summary}`); process.exit(1); }
console.log(`All lessons pass. ${summary}`);
