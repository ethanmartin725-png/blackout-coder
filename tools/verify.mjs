// Checks every lesson before it ships. Run from the repo root:  node tools/verify.mjs
// Exit code 1 if anything fails, so CI blocks the deploy.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import os from "node:os";
import { spawnSync, execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runPlcTests } from "./plc-tests.mjs";
import { runProgressTests } from "./progress-tests.mjs";
import { runExplainTests } from "./explain-tests.mjs";
import { runDaxTests } from "./dax-tests.mjs";
import { runPqTests } from "./pq-tests.mjs";
import { trackOutputs as pbiOutputs, laneOutputs as mLaneOutputs } from "./output-checks/pq/lane.mjs";
import { lessonOutputs as daxOutputs } from "./output-checks/dax/lane.mjs";
import { routineCode, PLC_LANGS } from "./output-checks/plc/lessons.mjs";

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

// 1b. Offline: everything index.html and fonts.css load is a local file that exists (the service worker
// caches exactly these), the manifest is valid with its icons present, and the font licence ships.
for (const m of index.matchAll(/(?:src|href)="([^"#?]+)"/g)) {
  const ref = m[1];
  if (/^[a-z]+:/i.test(ref)) { if (!ref.startsWith("https://github.com/")) fail(`index.html loads ${ref} from the network; keep it local so the site works offline`); continue; }
  if (ref === "blackout-coder-offline.zip") continue; // built by the deploy (pages.yml, .gitlab-ci.yml), not committed
  if (!fs.existsSync(path.join(SITE, ref))) fail(`index.html references missing file ${ref}`);
}
{
  const css = fs.readFileSync(path.join(SITE, "fonts/fonts.css"), "utf8");
  for (const m of css.matchAll(/url\(([^)]+)\)/g))
    if (!fs.existsSync(path.join(SITE, "fonts", m[1]))) fail(`fonts/fonts.css references missing font ${m[1]} (paths are relative to fonts/)`);
  if (!fs.existsSync(path.join(SITE, "fonts/OFL.txt"))) fail("fonts/OFL.txt is missing: the fonts' licence must ship with them");
  let man = null;
  try { man = JSON.parse(fs.readFileSync(path.join(SITE, "manifest.webmanifest"), "utf8")); } catch (e) { fail(`manifest.webmanifest is not valid JSON: ${e.message}`); }
  if (man) for (const ic of man.icons || []) if (!fs.existsSync(path.join(SITE, ic.src))) fail(`manifest icon ${ic.src} is missing`);
  if (!fs.existsSync(path.join(SITE, "sw.js"))) fail("sw.js is missing: the site would not work offline");
}

// 2. Every data file must be listed in index.html
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of walk(path.join(SITE, "data"))) {
  const rel = path.relative(SITE, f).split(path.sep).join("/");
  if (rel.endsWith(".js") && !srcs.includes(rel)) fail(`${rel} exists but is not loaded in index.html`);
}

const { BC, BCcore, BCplc } = ctx;
if (!BC || !BCcore) { console.error("Registry or core failed to load."); console.error(errors.join("\n")); process.exit(1); }

// 3. Lesson checks
const pyFiles = [];
const jsFiles = [];
const csProjects = {};
const nativeFiles = []; // C++ and Java: one compile per lesson, or per track file once finished
// A term key that starts or ends with a letter must not be part of a longer word ("int" inside "println")
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wholeToken = (k, code) => new RegExp((/^\w/.test(k) ? "(?<!\\w)" : "") + reEsc(k) + (/\w$/.test(k) ? "(?!\\w)" : "")).test(code);
function jythonProblems(code) {
  const out = [];
  // Blank out strings first, so text inside them is never mistaken for code
  const s = code
    .replace(/"""[\s\S]*?"""|'''[\s\S]*?'''/g, '""')
    .replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, (m, i, all) => (/(^|[^\w])([rR]?[fF]|[fF][rR])$/.test(all.slice(Math.max(0, i - 3), i)) ? "F" : '""'))
    .replace(/#[^\n]*/g, "");
  if (/(^|[^\w.])([rR]?[fF]|[fF][rR])F/.test(s)) out.push("f-strings do not exist in Jython 2.7; use % or .format()");
  if (/\bnonlocal\b/.test(s)) out.push("nonlocal does not exist in Jython 2.7");
  if (/:=/.test(s)) out.push(":= does not exist in Jython 2.7");
  if (/^\s*print\s+[^(\s]/m.test(s)) out.push("print statement: write print(...) with one argument, which works in both Python 2 and 3");
  // print("a", b) prints a tuple in Python 2.7, so print(...) may take a single argument only
  for (const m of s.matchAll(/\bprint\s*\(/g)) {
    let depth = 1;
    for (let i = m.index + m[0].length; i < s.length && depth; i++) {
      const c = s[i];
      if ("([{".includes(c)) depth++;
      else if (")]}".includes(c)) depth--;
      else if (c === "," && depth === 1) { out.push("print(a, b) prints a tuple in Jython 2.7; build one string with % instead"); break; }
    }
  }
  return [...new Set(out)];
}
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
    // A CSS lesson in a lane styles sample markup it carries in l.html; nothing else carries markup
    if (kind === "lane" && langId === "css" && typeof l.html !== "string") fail(`${where}: a CSS lane lesson needs html (the markup it styles)`);
    if (l.html !== undefined && !(kind === "lane" && langId === "css")) fail(`${where}: only CSS lane lessons take an html field`);
    if (langId === "css") {
      const bare = l.code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/"[^"]*"|'[^']*'/g, "");
      let depth = 0;
      for (const ch of bare) { if (ch === "{") depth++; else if (ch === "}" && --depth < 0) break; }
      if (depth !== 0) fail(`${where}: CSS braces do not balance`);
    }
    (l.terms || []).forEach((t, j) => {
      if (!Array.isArray(t) || t.length !== 3) fail(`${where}: term ${j + 1} must be [key, label, definition]`);
      else if (t[0] !== null && !l.code.includes(t[0])) warns.push(`${where}: term key "${t[0]}" not found in this step's code`);
      else if (t[0] !== null && !wholeToken(t[0], l.code)) warns.push(`${where}: term key "${t[0]}" only appears inside a longer word, so clicking it outlines the wrong text`);
    });
    if (/\t/.test(l.code)) fail(`${where}: code contains a tab character; use spaces`);
    // Ignition runs Jython 2.7. Scripts are compiled below as Python 3, so also refuse code that
    // compiles there but fails, or means something else, in Python 2.7.
    if (langId === "ignition") for (const m of jythonProblems(l.code)) fail(`${where}: ${m}`);
    // The lesson must be completable by typing its own code
    const T = BCcore.targetLines(l.code);
    const a = BCcore.analyzeText(l.code, T, ld.py);
    if (!BCcore.isCompleteFor(a, T)) fail(`${where}: typing the target code does not complete the lesson`);
    // Collect code for compile checks; track steps in the same file build on each other
    const key = kind === "track" ? `${g.id}::${l.file}` : `${g.id}::${i}`;
    fileText[key] = (fileText[key] ? fileText[key] + "\n" : "") + l.code;
    if (ld.py) pyFiles.push({ where, code: fileText[key] });
    if (langId === "js" || langId === "jscon") jsFiles.push({ where, code: fileText[key] });
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
  // The builds need no HTTPS dev certificate or global-tools PATH entry, two of the first-run steps
  const env = { ...process.env, DOTNET_CLI_TELEMETRY_OPTOUT: "1", DOTNET_NOLOGO: "1", DOTNET_GENERATE_ASPNET_CERTIFICATE: "false", DOTNET_ADD_GLOBAL_TOOLS_TO_PATH: "false" };
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
  // The first build runs alone: on a fresh machine (a CI runner) the first dotnet call does one-time
  // setup, and several builds starting at once can collide in it and crash. Then a few at a time,
  // since each build is a separate process.
  const results = [await jobs[0]()];
  for (let i = 1; i < jobs.length; i += 4) results.push(...(await Promise.all(jobs.slice(i, i + 4).map((run) => run()))));
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

// 7b. Progress files: export, import and merge (site/js/core.js)
for (const f of runProgressTests(BCcore)) fail(`Progress file test: ${f}`);
for (const f of runExplainTests(BCcore)) fail(`Explain test: ${f}`);

// DAX lane: the teaching model's own tests, then every lesson's output from the model over the
// PlantDB snapshot. The SQL twins need SQL Server, so they run in tools/output-checks/dax/run.mjs.
for (const f of runDaxTests()) fail(`DAX model test: ${f}`);
let daxRun = 0;
for (const f of runPqTests()) fail(`M model test: ${f}`);
// Tracks whose steps carry pq (Power Query) fields: outputs from the M and DAX models.
for (const tr of BC.tracks.filter((t) => t.lessons.some((l) => l.pq))) {
  for (const r of pbiOutputs(tr.lessons)) {
    daxRun++;
    const where = `${tr.id} "${r.t}"`;
    if (r.error) fail(`${where}: the M/DAX model refused it: ${r.error}`);
    else if (r.out !== tr.lessons.find((l) => l.t === r.t).out) fail(`${where}: stored output does not match the models. Run node tools/output-checks/pq/run.mjs`);
  }
}
for (const lane of BC.lanes.filter((l) => l.lang === "m")) {
  for (const r of mLaneOutputs(lane.lessons)) {
    daxRun++;
    const where = `${lane.id} "${r.t}"`;
    if (r.error) fail(`${where}: the M model refused it: ${r.error}`);
    else if (r.out !== lane.lessons.find((l) => l.t === r.t).out) fail(`${where}: stored output does not match the M model. Run node tools/output-checks/pq/run.mjs`);
  }
}
for (const lane of BC.lanes.filter((l) => l.lang === "dax")) {
  for (const r of daxOutputs(lane.lessons)) {
    daxRun++;
    const where = `${lane.id} "${r.t}"`;
    if (r.error) fail(`${where}: the DAX model refused it: ${r.error}`);
    else if (r.out !== lane.lessons.find((l) => l.t === r.t).out) fail(`${where}: stored output does not match the DAX model. Run node tools/output-checks/dax/run.mjs`);
  }
}

// Threads ("How it connects", data/threads.js): every station must name a real lane or track and
// step, and its quote must appear word for word in that step's generated output, so a thread
// cannot drift from the numbers the tracks produce.
let threadStations = 0;
const threadIds = new Set();
for (const th of BC.threads || []) {
  if (!th.id || !th.name || !Array.isArray(th.stations) || th.stations.length < 2) { fail(`thread ${th.id || "?"}: needs an id, a name and at least two stations`); continue; }
  if (threadIds.has(th.id)) fail(`thread ${th.id}: duplicate id`);
  threadIds.add(th.id);
  for (const [gid, title, quote, note] of th.stations) {
    threadStations++;
    const where = `thread ${th.id}, station ${gid} "${title}"`;
    const g = [...BC.lanes, ...BC.tracks].find((x) => x.id === gid);
    const l = g && g.lessons.find((x) => x.t === title);
    if (!g) fail(`${where}: no lane or track ${gid}`);
    else if (!l) fail(`${where}: no step with that title`);
    else if (!quote || !(l.out || "").includes(quote)) fail(`${where}: "${quote}" is not in the step's output; update the thread or the step`);
    if (!note || /\u2014/.test(note)) fail(`${where}: needs a note, without em-dash asides`);
  }
}

// Glossary for the explain panel (data/glossary.js): well-formed entries, unique keys, no em-dash
// asides, every entry used by some lesson in its language, and most lines explained.
let glossLines = 0, glossHit = 0;
{
  const all = [...BC.lanes, ...BC.tracks];
  const lessonsOf = (lang) => all.flatMap((g) => g.lessons.filter((l) => (l.lang || g.lang) === lang));
  const trivial = (ln) => /^[\s{}()\[\];,)]*$/.test(ln) || /^\s*(END_IF|END_FOR|END_CASE|END_WHILE|end|<\/[\w-]+>|\}\)?;?|\]\)?;?|`;?)\s*;?\s*$/.test(ln);
  for (const [lang, list] of Object.entries(BC.glossary || {})) {
    if (!BC.languages[lang]) { fail(`glossary: unknown language ${lang}`); continue; }
    const seen = new Set(), lines = lessonsOf(lang).flatMap((l) => l.code.split("\n").map((x) => BCcore.codeOnly(x, lang)));
    for (const e of list) {
      const where = `glossary ${lang} "${e && e[0]}"`;
      if (!Array.isArray(e) || (e.length !== 3 && e.length !== 4) || e.slice(0, 3).some((x) => typeof x !== "string" || !x.trim())) { fail(`${where}: expected [key, label, definition] or [key, label, definition, pattern]`); continue; }
      if (seen.has(e[0])) fail(`${where}: key listed twice`);
      seen.add(e[0]);
      if (/—/.test(e[1] + e[2])) fail(`${where}: no em dashes in glossary copy`);
      if (e[3] !== undefined) { try { new RegExp(e[3]); } catch (x) { fail(`${where}: bad pattern: ${x.message}`); continue; } }
      if (!lines.some((ln) => BCcore.findEntry(e, ln) >= 0)) fail(`${where}: matches no lesson line; remove it or fix the key`);
    }
  }
  for (const g of all) for (const l of g.lessons) {
    const lang = l.lang || g.lang;
    for (const ln of l.code.split("\n")) {
      if (!ln.trim() || trivial(ln)) continue;
      glossLines++;
      if (BCcore.explainLine(ln, lang, l.terms, (BC.glossary || {})[lang] || [], 1).length) glossHit++;
    }
  }
  if (glossLines && glossHit / glossLines < 0.95) fail(`glossary: only ${(100 * glossHit / glossLines).toFixed(1)}% of code lines get an explanation (floor 95%). Add glossary entries for the new lessons' languages.`);
}

// 8. PLC ladder and Structured Text: every lesson parses, the interpreter passes its tests, and
// every lesson with a scenario (sim) still produces its stored output. See docs/PLC_INTERPRETER.md.
let ladderParsed = 0, stParsed = 0, plcSims = 0;
if (!BCplc) fail("js/plc.js did not load; is it listed in index.html?");
else {
  for (const f of runPlcTests(BCplc)) fail(`PLC interpreter test: ${f}`);
  for (const { kind, g } of groups) {
    if (g.soon) continue;
    g.lessons.forEach((l, i) => {
      const lang = kind === "lane" ? g.lang : l.lang;
      if (!PLC_LANGS.includes(lang)) return;
      const where = `${g.id} #${i + 1} "${l.t}"`;
      const parsed = lang === "st" ? BCplc.parseST(l.code) : BCplc.parseRoutine(l.code);
      for (const e of parsed.errors) fail(`${where}: ${lang === "st" ? "Structured Text" : "ladder"} line ${e.line}: ${e.msg}`);
      if (lang === "st") stParsed++; else ladderParsed++;
      if (!l.sim) return;
      try {
        const out = BCplc.runScenario(routineCode(g, i, kind === "track"), l.sim, lang);
        plcSims++;
        if (out !== (l.out || "")) fail(`${where}: stored output does not match the scenario. Run node tools/output-checks/plc/run.mjs`);
        // sameAs: this step rewrites another step (e.g. ladder as Structured Text); their traces must match
        // "Title" names a lesson in the same lane or track; "lane-or-track-id/Title" one elsewhere.
        if (l.sim.sameAs) {
          // A prefix only counts as a lane or track if one has that id: titles can contain "/" too.
          const k = l.sim.sameAs.indexOf("/");
          const other = k < 0 ? null : groups.map((x) => x.g).find((x) => x.id === l.sim.sameAs.slice(0, k));
          const home = other || g;
          const title = other ? l.sim.sameAs.slice(k + 1) : l.sim.sameAs;
          const twin = home && home.lessons.find((x) => x.t === title);
          if (!twin) fail(`${where}: sameAs names "${l.sim.sameAs}", which does not exist`);
          else if (twin.out !== out) fail(`${where}: its trace no longer matches "${l.sim.sameAs}"`);
        }
      } catch (e) {
        fail(`${where}: scenario failed: ${e.message}`);
      }
    });
  }
}

const summary = `${BC.lanes.length} lanes, ${BC.tracks.length} tracks, ${lessons} lessons, ${pyFiles.length} Python checks, ${jsFiles.length} JavaScript checks, ${csBuilt} C# builds, ${nativeCount.cpp} C++ and ${nativeCount.java} Java compiles, ${ladderParsed} ladder and ${stParsed} Structured Text parses, ${plcSims} PLC scenarios, ${daxRun} DAX and M outputs, ${threadStations} thread stations, ${glossHit}/${glossLines} code lines explained (${(100 * glossHit / Math.max(1, glossLines)).toFixed(1)}%)`;
for (const w of warns) console.warn("warn  " + w);
if (errors.length) { for (const e of errors) console.error("FAIL  " + e); console.error(`\n${errors.length} problem(s). ${summary}`); process.exit(1); }
console.log(`All lessons pass. ${summary}`);
