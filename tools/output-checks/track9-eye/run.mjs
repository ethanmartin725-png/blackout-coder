// Eye Counter track (C++): generate each step's `out`.
// Steps up to the last are a library with no main, so each one is compiled together with all
// earlier steps and the short test main below, then run. The last step has its own main.
//   node tools/output-checks/track9-eye/run.mjs           write outs
//   node tools/output-checks/track9-eye/run.mjs --check   report stale outs, change nothing
// Needs g++ (C++17). Compiled with -Wall -Wextra; any warning fails the step.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { setOut } from "../lib/lesson-file.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const FILE = path.join(ROOT, "site/data/tracks/09-eye.js");
const check = process.argv.includes("--check");
const ctx = { BC: { addTrack(t) { ctx.track = t; }, addLane() {}, addLanguage() {} } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(FILE, "utf8"), ctx);
const steps = ctx.track.lessons;

// One test main per step. Each prints what that step's new code does.
const TESTS = {
  "Constants": `
    std::cout << "sample every " << SAMPLE_MS << " ms, debounce " << DEBOUNCE_MS << " ms, jam after " << JAM_MS << " ms\\n";
    std::cout << "ideal cycle: " << 3600000.0 / IDEAL_PER_HOUR << " ms per barrel\\n";`,
  "A sample": `
    Sample s{1500, true};
    std::cout << "t=" << s.tMs << " raw=" << s.raw << "\\n";`,
  "Debounce state": `
    Debounce d;
    std::cout << "stable=" << d.stable << " candidate=" << d.candidate << " since=" << d.since << "\\n";`,
  "Debounce the eye": `
    Debounce d;
    std::cout << "raw: on 0-90 ms, off 100-290 ms, on 300-990 ms\\n";
    bool last = false;
    for (std::uint32_t t = 0; t <= 1000; t += SAMPLE_MS) {
        bool raw = t < 100 || (t >= 300 && t < 1000);
        bool out = debounce(d, {t, raw});
        if (out != last) std::cout << "t=" << t << " ms: stable " << out << "\\n";
        last = out;
    }`,
  "Rising edge": `
    Edge e;
    std::cout << "input:  ";
    for (bool v : {false, true, true, true, false, true}) std::cout << v;
    std::cout << "\\nrising: ";
    for (bool v : {false, true, true, true, false, true}) std::cout << rising(e, v);
    std::cout << "\\n";`,
  "A 16-bit count": `
    Counter c;
    c.count = 65534;
    for (int i = 0; i < 3; i++) { c.count++; std::cout << c.count << "\\n"; }
    std::cout << "made between 65530 and 3: " << madeSince(65530, 3) << "\\n";`,
  "Ring buffer of cycle times": `
    Ring r;
    for (std::uint32_t x : {61200u, 59800u, 64000u, 60400u, 60600u, 59000u}) r.push(x);
    std::cout << "slots: " << r.v[0] << " " << r.v[1] << " " << r.v[2] << " " << r.v[3] << " " << r.v[4] << "\\n";
    std::cout << "next=" << r.next << " filled=" << r.filled << "\\n";`,
  "Average of the ring": `
    Ring r;
    std::cout << "empty: " << average(r) << "\\n";
    for (std::uint32_t x : {61200u, 59800u, 64000u, 60400u}) r.push(x);
    std::cout << "4 cycles: " << average(r) << " ms\\n";`,
  "Rate per hour": `
    std::cout << ratePerHour(60000) << " " << ratePerHour(61350) << " " << ratePerHour(0) << "\\n";`,
  "Jam watch": `
    JamWatch j;
    for (std::uint32_t t = 0; t <= 3990; t += SAMPLE_MS) watchJam(j, true, true, t);
    std::cout << "blocked 3.99 s while running: jammed=" << j.jammed << "\\n";
    watchJam(j, true, true, 4000);
    std::cout << "blocked 4.00 s while running: jammed=" << j.jammed << "\\n";
    JamWatch k;
    for (std::uint32_t t = 0; t <= 10000; t += SAMPLE_MS) watchJam(k, true, false, t);
    std::cout << "blocked 10 s while stopped: jammed=" << k.jammed << "\\n";`,
  "Status bits": `
    std::printf("%02X %02X %02X\\n", statusWord(true, false, false, 58.7), statusWord(true, true, true, 0), statusWord(true, false, false, 55.0));`,
  "Serial line": `
    std::cout << serialLine(61190, 1, 0.0, ST_RUNNING) << "\\n";
    std::cout << serialLine(305990, 5, 58.67, ST_RUNNING | ST_BLOCKED) << "\\n";`,
  "The counter object": `
    EyeCounter c;
    std::cout << "count=" << c.counter.count << " filled=" << c.cycles.filled << " haveEdge=" << c.haveEdge << "\\n";`,
  "Process one sample": `
    EyeCounter c;
    for (std::uint32_t t = 0; t < 3000; t += SAMPLE_MS) process(c, {t, t < 1500}, true);
    std::cout << "count=" << c.counter.count << " lastEdgeMs=" << c.lastEdgeMs << " cycles=" << c.cycles.filled << "\\n";
    for (std::uint32_t t = 3000; t < 6000; t += SAMPLE_MS) process(c, {t, t < 4500}, true);
    std::cout << "count=" << c.counter.count << " lastEdgeMs=" << c.lastEdgeMs << " cycle=" << c.cycles.v[0] << " ms\\n";`,
  "Report line": `
    EyeCounter c;
    for (std::uint32_t t = 0; t < 122400; t += SAMPLE_MS) process(c, {t, t < 1500 || (t >= 61200 && t < 62700)}, true);
    std::cout << report(c, true) << "\\n";`,
  "Shift reset": `
    EyeCounter c;
    for (std::uint32_t t = 0; t < 122400; t += SAMPLE_MS) process(c, {t, t < 1500 || (t >= 61200 && t < 62700)}, true);
    std::cout << report(c, true) << "\\n";
    resetShift(c);
    std::cout << report(c, false) << "\\n";`,
  "Simulated barrels": `
    auto plain = barrel(0, 61200, 1500, false);
    auto flick = barrel(0, 61200, 1500, true);
    int onPlain = 0, onFlick = 0;
    for (const Sample& s : plain) onPlain += s.raw;
    for (const Sample& s : flick) onFlick += s.raw;
    std::cout << plain.size() << " samples, " << onPlain << " blocked; with flicker " << onFlick << " blocked\\n";`,
  "Replay a stream": `
    EyeCounter c;
    replay(c, barrel(0, 61200, 1500, false), true);
    replay(c, barrel(61200, 59800, 1500, true), true);
    std::cout << report(c, true) << "\\n";`,
  "Five barrels": `
    EyeCounter c;
    std::uint32_t end = fiveBarrels(c);
    std::cout << "ended at " << end << " ms\\n";`,
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bc-eye-"));
let src = fs.readFileSync(FILE, "utf8"), stale = 0, failed = 0, code = "";
for (const step of steps) {
  code += (code ? "\n" : "") + step.code;
  const test = TESTS[step.t];
  const last = step === steps[steps.length - 1];
  if (!last && test === undefined) { console.error(`FAIL  no test for "${step.t}"`); failed++; continue; }
  const program = last ? code : `${code}\n\nint main() {${test}\n}\n`;
  fs.writeFileSync(path.join(tmp, "step.cpp"), program);
  const b = spawnSync("g++", ["-std=c++17", "-Wall", "-Wextra", "-o", "step", "step.cpp"], { cwd: tmp, encoding: "utf8" });
  if (b.status !== 0 || b.stderr) { console.error(`FAIL  "${step.t}": ${b.stderr}`); failed++; continue; }
  const r = spawnSync("./step", [], { cwd: tmp, encoding: "utf8" });
  if (r.status !== 0) { console.error(`FAIL  "${step.t}": exit ${r.status} ${r.stderr}`); failed++; continue; }
  const out = r.stdout.replace(/\s+$/, "");
  if (step.out === out) { console.log(`ok    "${step.t}"`); continue; }
  stale++;
  console.log(`${check ? "STALE" : "write"} "${step.t}"\n${out.replace(/^/gm, "        ")}`);
  if (!check) src = setOut(src, step.t, out);
}
fs.rmSync(tmp, { recursive: true, force: true });
if (!check && stale) fs.writeFileSync(FILE, src);
console.log(`\n${steps.length} steps run, ${stale} output(s) ${check ? "stale" : "updated"}, ${failed} failed`);
process.exit(failed || (check && stale) ? 1 : 0);
