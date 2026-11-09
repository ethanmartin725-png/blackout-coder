// ERP Export track (Java): generate each step's `out`.
// The class opened in step 1 is closed only in the last step, so each earlier step is compiled
// with all steps before it plus the test main below and a closing brace, then run.
//   node tools/output-checks/track10-erp/run.mjs           write outs
//   node tools/output-checks/track10-erp/run.mjs --check   report stale outs, change nothing
// Needs a JDK (17 or newer).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { setOut } from "../lib/lesson-file.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const FILE = path.join(ROOT, "site/data/tracks/10-erp.js");
const check = process.argv.includes("--check");
const ctx = { BC: { addTrack(t) { ctx.track = t; }, addLane() {}, addLanguage() {} } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(FILE, "utf8"), ctx);
const steps = ctx.track.lessons;
const env = { ...process.env };
delete env.JAVA_TOOL_OPTIONS; // otherwise the JVM prints a notice on stderr

const ROWS = `readAll(SHIFT_CSV).rows()`;
const TESTS = {
  "Imports and constants": `
        System.out.println("margin " + MARGIN + ", paid hours " + PAID_HOURS);
        System.out.println("Conveyor 3 ideal " + IDEAL_RATE.get("Conveyor 3") + " per hour");`,
  "The input file": `
        SHIFT_CSV.lines().forEach(System.out::println);`,
  "A shift row": `
        ShiftRow r = new ShiftRow("A", "Conveyor 3", 347, 352);
        System.out.println(r);
        System.out.println(r.machine() + " made " + r.total());`,
  "Parse one line": `
        System.out.println(parse("A, Conveyor 3, 347, 352"));
        for (String bad : new String[] {"A,Conveyer 3,12", "A,Conveyor 3,x,352"}) {
            try {
                parse(bad);
            } catch (IllegalArgumentException e) {
                System.out.println(e.getClass().getSimpleName() + ": " + e.getMessage());
            }
        }`,
  "Check a row": `
        System.out.println(problem(new ShiftRow("A", "Conveyor 3", 347, 352)));
        System.out.println(problem(new ShiftRow("A", "Char Station 2", 310, 301)));
        System.out.println(problem(new ShiftRow("A", "Conveyer 3", 12, 12)));`,
  "Read every row": `
        Parsed p = readAll(SHIFT_CSV);
        p.rows().forEach(System.out::println);
        p.errors().forEach(System.out::println);`,
  "Target": `
        for (String m : new String[] {"Char Station 2", "Conveyor 3", "Hoop Driver 1"}) System.out.println(m + ": " + target(m));`,
  "Shortfall": `
        for (ShiftRow r : ${ROWS}) System.out.println(r.machine() + ": " + behind(r) + " short");
        System.out.println("Conveyor 3 at 460: " + behind(new ShiftRow("A", "Conveyor 3", 455, 460)) + " short");`,
  "Lost margin": `
        for (ShiftRow r : ${ROWS}) System.out.println(r.machine() + ": $" + lostMargin(r));`,
  "Work-center codes": `
        for (String m : new String[] {"Char Station 2", "Conveyor 3", "Hoop Driver 1"}) System.out.println(m + " -> " + WORK_CENTER.get(m));`,
  "An export line": `
        System.out.println(new ExportLine("ASM-CV3", "20261107", 347, 5, new BigDecimal("4165.00")));`,
  "Map a row": `
        for (ShiftRow r : ${ROWS}) System.out.println(toExport(r, "20261107"));`,
  "Fixed-width line": `
        for (ShiftRow r : ${ROWS}) {
            String line = fixedWidth(toExport(r, "20261107"));
            System.out.println(line + "  (" + line.length() + " chars)");
        }`,
  "Header record": `
        String h = header("20261107", "A");
        System.out.println("[" + h + "] " + h.length() + " chars");`,
  "Trailer record": `
        String t = trailer(2, new BigDecimal("10051.25"));
        System.out.println("[" + t + "] " + t.length() + " chars");`,
  "Build the file": `
        buildFile(${ROWS}, "20261107", "A").forEach(System.out::println);`,
  "Error report": `
        errorReport(readAll(SHIFT_CSV).errors(), "20261107", "A").forEach(System.out::println);`,
  "Batch id": `
        System.out.println(batchId("20261107", "A"));`,
  "Run the export": `
        Path dir = Files.createTempDirectory("erp");
        Set<String> sent = new HashSet<>();
        run(SHIFT_CSV, "20261107", "A", sent, dir);
        run(SHIFT_CSV, "20261107", "A", sent, dir);
        try (var files = Files.list(dir)) {
            files.map(f -> f.getFileName().toString()).sorted().forEach(System.out::println);
        }`,
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bc-erp-"));
let src = fs.readFileSync(FILE, "utf8"), stale = 0, failed = 0, code = "";
for (const step of steps) {
  code += (code ? "\n" : "") + step.code;
  const last = step === steps[steps.length - 1];
  const test = TESTS[step.t];
  if (!last && test === undefined) { console.error(`FAIL  no test for "${step.t}"`); failed++; continue; }
  const program = last ? code : `${code}\n\n    public static void main(String[] args) throws Exception {${test}\n    }\n}\n`;
  fs.writeFileSync(path.join(tmp, "ShiftExport.java"), program);
  const b = spawnSync("javac", ["-d", tmp, "ShiftExport.java"], { cwd: tmp, encoding: "utf8", env });
  if (b.status !== 0 || b.stderr) { console.error(`FAIL  "${step.t}": ${b.stderr}`); failed++; continue; }
  const r = spawnSync("java", ["-cp", tmp, "ShiftExport"], { cwd: tmp, encoding: "utf8", env });
  if (r.status !== 0 || r.stderr) { console.error(`FAIL  "${step.t}": exit ${r.status} ${r.stderr}`); failed++; continue; }
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
