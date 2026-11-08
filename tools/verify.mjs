// Checks every lesson before it ships. Run from the repo root:  node tools/verify.mjs
// Exit code 1 if anything fails, so CI blocks the deploy.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import os from "node:os";
import { spawnSync } from "node:child_process";
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

const summary = `${BC.lanes.length} lanes, ${BC.tracks.length} tracks, ${lessons} lessons, ${pyFiles.length} Python checks, ${jsFiles.length} JavaScript checks`;
for (const w of warns) console.warn("warn  " + w);
if (errors.length) { for (const e of errors) console.error("FAIL  " + e); console.error(`\n${errors.length} problem(s). ${summary}`); process.exit(1); }
console.log(`All lessons pass. ${summary}`);
