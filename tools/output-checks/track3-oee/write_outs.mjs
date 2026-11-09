// Copies the Python step outputs that run3.py writes to outs3.json into site/data/tracks/03-oee.js.
//   (cd tools/output-checks/track3-oee && python3 run3.py) && node tools/output-checks/track3-oee/write_outs.mjs
//   node tools/output-checks/track3-oee/write_outs.mjs --check   report stale outs, change nothing
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { setOut } from "../lib/lesson-file.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const FILE = path.resolve(HERE, "../../../site/data/tracks/03-oee.js");
const check = process.argv.includes("--check");
const outs = JSON.parse(fs.readFileSync(path.join(HERE, "outs3.json"), "utf8"));
const c = { BC: { addTrack(t) { c.t = t; }, addLane() {}, addLanguage() {} } };
vm.createContext(c);
vm.runInContext(fs.readFileSync(FILE, "utf8"), c);
const py = c.t.lessons.filter((l) => l.lang === "python");
let src = fs.readFileSync(FILE, "utf8"), stale = 0;
py.forEach((l, i) => {
  const out = outs[`P${i + 6}`];
  if (out === undefined) throw new Error(`no output for P${i + 6} "${l.t}"`);
  if (l.out === out) return console.log(`ok    "${l.t}"`);
  stale++;
  console.log(`${check ? "STALE" : "write"} "${l.t}"`);
  if (!check) src = setOut(src, l.t, out);
});
if (!check && stale) fs.writeFileSync(FILE, src);
console.log(`\n${py.length} Python steps, ${stale} output(s) ${check ? "stale" : "updated"}`);
process.exit(check && stale ? 1 : 0);
