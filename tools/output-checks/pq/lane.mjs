// Turns the Power BI report track's steps into outputs. M steps run in the M teaching model
// (mmodel.mjs); the queries marked load: true become the tables of the DAX model the DAX steps
// run in (dax/model.mjs), as a .pbix loads its queries. Shared by run.mjs and tools/verify.mjs.
import { createEngine, preview, plainRows, text, asTable, MTable, MDateTime, MDate } from "./mmodel.mjs";
import { createModel, renderTable, format, BLANK, DT } from "../dax/model.mjs";
import { snapshot } from "../dax/lane.mjs";

export const RELATIONSHIPS = [
  ["Faults", "machine", "Machines", "machine"],
  ["Barrels", "machine", "Machines", "machine"],
  ["Rejects", "machine", "Machines", "machine"],
  ["Faults", "shift_date", "Dates", "Date"],
];
const DATE_COLS = ["start_ts", "end_ts", "ts", "shift_date", "Date"];

// A loaded M table in the snapshot shape the DAX model reads: columns, and rows with dates as text.
const asSnapshot = (t) => ({ columns: [...t.cols], rows: t.rows.map((r) => t.cols.map((c) => (r[c] instanceof MDateTime || r[c] instanceof MDate ? text(r[c]) : r[c]))) });
const plain = (v) => (v === BLANK ? null : v instanceof DT ? format(v) : v);

export function trackOutputs(steps) {
  const engine = createEngine(snapshot());
  const loaded = {};
  return steps.map((s, i) => {
    try {
      if (s.lang === "m") {
        engine.define(s.pq.query, s.code);
        const t = engine.run(s.pq.query);
        if (s.pq.load) loaded[s.pq.query] = asSnapshot(t);
        return { t: s.t, out: preview(t, s.pq, format), raw: plainRows(t) };
      }
      const model = createModel(loaded, RELATIONSHIPS, { dateCols: DATE_COLS });
      for (const earlier of steps.slice(0, i + 1)) if (earlier.lang === "dax") model.define(earlier.code);
      const view = s.dax.rows ? model.visual(s.dax) : model.card(s.dax);
      return { t: s.t, out: renderTable(view, s.dax.format || {}), raw: view.rows.map((r) => r.map(plain)) };
    } catch (e) {
      return { t: s.t, error: e.message };
    }
  });
}

// The M lane: each lesson is one complete query, run on its own over the PlantDB snapshot. A query
// may return a table, a list, a record or a single value; the output is the editor's preview of it.
export function laneOutputs(lessons) {
  return lessons.map((l) => {
    try {
      if (!l.pq || !l.pq.query) throw new Error("no pq.query: name the query");
      const engine = createEngine(snapshot());
      engine.define(l.pq.query, l.code);
      const t = asTable(engine.value(l.pq.query));
      return { t: l.t, out: preview(t, l.pq, format), raw: plainRows(t) };
    } catch (e) {
      return { t: l.t, error: e.message };
    }
  });
}
