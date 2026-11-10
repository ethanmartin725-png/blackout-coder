// Turns the DAX lane's lessons into outputs with the teaching model. Shared by run.mjs (writes outs,
// checks SQL twins) and tools/verify.mjs (fails on a stale out), so both always agree.
// A lesson's `dax` field says what to show:
//   { rows: "dim_machine[machine]", values: ["Measure", …], format: { Measure: "0.0%" } }   a table visual
//   { table: "fault_log", columns: ["fault_id", …], top: 4, format: { column: "0.00" } }   a table's first rows
import fs from "node:fs";
import path from "node:path";
import { createModel, renderTable, BLANK, DT, format } from "./model.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname);
export const RELATIONSHIPS = [
  ["fault_log", "machine", "dim_machine", "machine"],
  ["v_hourly_barrels", "machine", "dim_machine", "machine"],
  ["reject_log", "machine", "dim_machine", "machine"],
];
export const snapshot = () => JSON.parse(fs.readFileSync(path.join(HERE, "plantdb.json"), "utf8"));

const plain = (v) => (v === BLANK ? null : v instanceof DT ? format(v) : v);

export function lessonOutputs(lessons) {
  const snap = snapshot();
  return lessons.map((l, i) => {
    try {
      if (!l.dax) throw new Error("no dax field: say what the lesson shows");
      const m = createModel(snap, RELATIONSHIPS);
      for (const earlier of lessons.slice(0, i + 1)) m.define(earlier.code);
      const view = l.dax.rows ? m.visual(l.dax) : m.columnRows(l.dax);
      return { t: l.t, out: renderTable(view, l.dax.format || {}), raw: view.rows.map((r) => r.map(plain)) };
    } catch (e) {
      return { t: l.t, error: e.message };
    }
  });
}
