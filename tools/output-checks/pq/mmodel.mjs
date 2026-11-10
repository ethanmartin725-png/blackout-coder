// A teaching model of Power Query M, for the Power BI report track's outputs. M only runs inside
// Power BI / Excel, so query outputs come from this model over the same PlantDB snapshot the DAX
// model uses (tools/output-checks/dax/plantdb.json). Every M step also has a SQL twin that must
// return the same rows on the real SQL Server (run.mjs). Semantics and limits: docs/PQ_MODEL.md.
// Anything outside the modeled subset throws NotModeled instead of guessing.

export class NotModeled extends Error {}
// An error M itself raises (a bad conversion, a missing row): try … otherwise catches these, not NotModeled.
export class MError extends Error {}

/* ---------- values ---------- */
// date-times and dates are milliseconds since 1970 (UTC, no time zones); durations are milliseconds.
export class MDateTime { constructor(ms) { this.ms = ms; } }
export class MDate { constructor(ms) { this.ms = ms; } }
export class MDuration { constructor(ms) { this.ms = ms; } }
export class MTable { constructor(cols, rows) { this.cols = cols; this.rows = rows; } }
class MFunc { constructor(f) { this.f = f; } }
const isTable = (v) => v instanceof MTable;
const dayMs = 86400000;
const fromText = (s) => { const m = /^(\d{4})-(\d\d)-(\d\d)(?: (\d\d):(\d\d):(\d\d))?$/.exec(s); return Date.UTC(+m[1], m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)); };
export const text = (v) => {
  if (v === null) return "null";
  if (v instanceof MDateTime) return new Date(v.ms).toISOString().slice(0, 19).replace("T", " ");
  if (v instanceof MDate) return new Date(v.ms).toISOString().slice(0, 10);
  if (typeof v === "number") return String(Number(v.toPrecision(12)));
  if (v instanceof MDuration) { const t = Math.round(v.ms / 1000), a = Math.abs(t), p = (n) => String(n).padStart(2, "0"); return `${t < 0 ? "-" : ""}${Math.floor(a / 86400)}.${p(Math.floor(a / 3600) % 24)}:${p(Math.floor(a / 60) % 60)}:${p(a % 60)}`; }
  return String(v);
};

/* ---------- tokens and parser ---------- */
const TOK = /\s+|\/\/[^\n]*|\/\*[\s\S]*?\*\/|("(?:[^"]|"")*")|(#"(?:[^"]|"")*")|(#(?:datetime|date|duration))|(\d+(?:\.\d+)?)|([A-Za-z_][\w.]*)|(<>|<=|>=|=>|[-+*/&=<>(),{}\[\]])/y;
function tokenize(src) {
  const out = []; let m; TOK.lastIndex = 0;
  while (TOK.lastIndex < src.length) {
    const at = TOK.lastIndex;
    if (!(m = TOK.exec(src))) throw new Error(`cannot read "${src.slice(at, at + 12)}"`);
    if (m[1]) out.push({ k: "str", v: m[1].slice(1, -1).replace(/""/g, '"') });
    else if (m[2]) out.push({ k: "id", v: m[2].slice(2, -1).replace(/""/g, '"') });
    else if (m[3]) out.push({ k: "id", v: m[3] });
    else if (m[4]) out.push({ k: "num", v: Number(m[4]) });
    else if (m[5]) out.push({ k: "id", v: m[5] });
    else if (m[6]) out.push({ k: "op", v: m[6] });
  }
  return out;
}
const KW = new Set(["let", "in", "each", "if", "then", "else", "and", "or", "not", "null", "true", "false", "type", "try", "otherwise"]);
export function parse(src) {
  const t = tokenize(src); let p = 0;
  const isOp = (v) => t[p] && t[p].k === "op" && t[p].v === v, isKw = (v) => t[p] && t[p].k === "id" && t[p].v === v;
  const expect = (v) => { if (!isOp(v)) throw new Error(`expected "${v}"${t[p] ? ` before "${t[p].v}"` : " at the end"}`); p++; };
  const name = () => { const k = t[p++]; if (!k || k.k !== "id" || KW.has(k.v)) throw new Error(`expected a name${k ? ` at "${k.v}"` : ""}`); return k.v; };
  function expr() {
    if (isKw("let")) {
      p++; const binds = [];
      do { const n = name(); expect("="); binds.push([n, expr()]); } while (isOp(",") && ++p);
      if (!isKw("in")) throw new Error("expected in after the let steps");
      p++; return { let: binds, body: expr() };
    }
    if (isKw("each")) { p++; return { each: expr() }; }
    if (isKw("try")) { p++; const a = expr(); if (!isKw("otherwise")) throw new Error("expected otherwise after try: the model handles try … otherwise"); p++; return { try: a, otherwise: expr() }; }
    if (isKw("if")) { p++; const c = expr(); if (!isKw("then")) throw new Error("expected then"); p++; const a = expr(); if (!isKw("else")) throw new Error("expected else: M's if always has one"); p++; return { if: c, then: a, else: expr() }; }
    return or();
  }
  const bin = (next, ops) => () => { let e = next(); for (;;) { const k = t[p]; if (k && ((k.k === "op" && ops.includes(k.v)) || (k.k === "id" && ops.includes(k.v)))) { p++; e = { op: k.v, a: e, b: next() }; } else return e; } };
  const unary = () => { if (isKw("not")) { p++; return { not: unary() }; } if (isOp("-")) { p++; return { neg: unary() }; } return postfix(); };
  const mul = bin(unary, ["*", "/"]), add = bin(mul, ["+", "-", "&"]), cmp = bin(add, ["=", "<>", "<", ">", "<=", ">="]);
  const and = bin(cmp, ["and"]), or = bin(and, ["or"]);
  function postfix() {
    let e = primary();
    for (;;) {
      if (isOp("(")) { p++; const args = []; if (!isOp(")")) { do { args.push(expr()); } while (isOp(",") && ++p); } expect(")"); e = { call: e, args }; }
      else if (isOp("[")) { p++; const f = name(); expect("]"); e = { field: f, of: e }; }
      else if (isOp("{")) { p++; const sel = expr(); expect("}"); e = { item: sel, of: e }; }
      else return e;
    }
  }
  function primary() {
    const k = t[p];
    if (!k) throw new Error("the query ends early");
    if (k.k === "num") { p++; return { lit: k.v }; }
    if (k.k === "str") { p++; return { lit: k.v }; }
    if (isKw("null")) { p++; return { lit: null }; }
    if (isKw("true") || isKw("false")) { p++; return { lit: k.v === "true" }; }
    if (isKw("type")) { p++; return { type: name() }; }
    if (isOp("(")) {
      // (a, b) => body: a function with named parameters
      let q = p + 1; const params = [], types = [];
      const typeAt = () => { if (!(t[q] && t[q].v === "as")) return null; q++; let ty = t[q] && t[q].v; q++; if (ty === "nullable") { ty = "nullable " + (t[q] && t[q].v); q++; } return ty; };
      while (t[q] && t[q].k === "id" && !KW.has(t[q].v)) { params.push(t[q].v); q++; types.push(typeAt()); if (t[q] && t[q].k === "op" && t[q].v === ",") q++; else break; }
      if (t[q] && t[q].v === ")") { q++; const ret = typeAt(); if (t[q] && t[q].v === "=>") { p = q + 1; return { params, types, ret, body: expr() }; } }
      p++; const e = expr(); expect(")"); return e;
    }
    if (isOp("{")) { p++; const items = []; if (!isOp("}")) { do { items.push(expr()); } while (isOp(",") && ++p); } expect("}"); return { list: items }; }
    if (isOp("[")) {
      p++;
      if (t[p] && t[p].k === "id" && t[p + 1] && t[p + 1].v === "]") { const f = name(); expect("]"); return { field: f, of: { name: "_" } }; }
      const fields = [];
      if (!isOp("]")) { do { const n = name(); expect("="); fields.push([n, expr()]); } while (isOp(",") && ++p); }
      expect("]"); return { record: fields };
    }
    if (k.k === "id") { p++; return { name: k.v }; }
    throw new Error(`unexpected "${k.v}"`);
  }
  const e = expr();
  if (p < t.length) throw new Error(`unexpected "${t[p].v}"`);
  return e;
}

/* ---------- evaluation ---------- */
const DATE_COLS = new Set(["start_ts", "end_ts", "ts"]);
export function createEngine(snapshot) {
  const queries = new Map(), results = new Map();
  const loadTable = (name) => {
    const t = snapshot[name];
    if (!t) throw new Error(`PlantDB has no table ${name}`);
    return new MTable([...t.columns], t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i] === null ? null : DATE_COLS.has(c) ? new MDateTime(fromText(r[i])) : r[i]]))));
  };
  const navigation = new MTable(["Schema", "Item", "Data"], Object.keys(snapshot).map((n) => ({ Schema: "dbo", Item: n, Data: { lazy: n } })));
  const unlazy = (v) => (v && v.lazy ? loadTable(v.lazy) : v);
  const fn = (f) => new MFunc(f);
  const call = (f, ...args) => { if (!(f instanceof MFunc)) throw new Error("expected a function, such as each …"); return f.f(...args); };
  const num = (v, w) => { if (typeof v !== "number") throw new NotModeled(`${w}: expected a number, got ${text(v)}`); return v; };
  const col = (t, c) => { if (!t.cols.includes(c)) throw new Error(`the table has no column "${c}" (it has ${t.cols.join(", ")})`); return t.rows.map((r) => r[c]); };
  function compare(op, a, b) {
    if (a === null || b === null) { if (op === "=") return a === b; if (op === "<>") return a !== b; return null; }
    const x = a.ms !== undefined ? a.ms : a, y = b.ms !== undefined ? b.ms : b;
    if (typeof x !== typeof y || (a.constructor !== b.constructor && (a instanceof MDateTime || b instanceof MDateTime || a instanceof MDate || b instanceof MDate))) throw new NotModeled(`comparing ${text(a)} with ${text(b)}: M refuses to compare different types`);
    return { "=": x === y, "<>": x !== y, "<": x < y, ">": x > y, "<=": x <= y, ">=": x >= y }[op];
  }
  function arith(op, a, b) {
    if (a === null || b === null) return null;
    if (op === "&") { if (typeof a !== "string" || typeof b !== "string") throw new NotModeled("& joins text; use Text.From for numbers"); return a + b; }
    if (a instanceof MDateTime && b instanceof MDateTime && op === "-") return new MDuration(a.ms - b.ms);
    if ((a instanceof MDateTime || a instanceof MDate) && b instanceof MDuration) return new a.constructor(op === "+" ? a.ms + b.ms : op === "-" ? a.ms - b.ms : (() => { throw new NotModeled(`date ${op} duration`); })());
    if (a instanceof MDate && b instanceof MDate && op === "-") return new MDuration(a.ms - b.ms);
    const x = num(a, op), y = num(b, op);
    return { "+": x + y, "-": x - y, "*": x * y, "/": x / y }[op];
  }
  // A type annotation on a function: number, text and so on exclude null; nullable number allows it.
  const TYPES = { number: (v) => typeof v === "number", text: (v) => typeof v === "string", logical: (v) => typeof v === "boolean",
    date: (v) => v instanceof MDate, datetime: (v) => v instanceof MDateTime, duration: (v) => v instanceof MDuration,
    list: (v) => Array.isArray(v), table: (v) => isTable(v), record: (v) => v && typeof v === "object" && !Array.isArray(v) && !isTable(v), any: () => true };
  function checkType(v, ty, what) {
    if (!ty) return v;
    const nullable = ty.startsWith("nullable "), base = nullable ? ty.slice(9) : ty;
    if (!TYPES[base]) throw new NotModeled(`type ${base} is not modeled`);
    if (v === null ? !(nullable || base === "any") : !TYPES[base](v)) throw new MError(`${what}: ${text(v)} is not of type ${ty}`);
    return v;
  }
  const truthy = (v) => { if (typeof v !== "boolean") throw new NotModeled(`a condition must be true or false, not ${text(v)}`); return v; };
  const recOf = (cols, row) => ({ rec: true, row });

  const LIB = {
    "Sql.Database": () => navigation,
    "Table.SelectRows": (t, f) => new MTable(t.cols, t.rows.filter((r) => truthy(call(f, recOf(t.cols, r))))),
    "Table.AddColumn": (t, n, f) => { if (t.cols.includes(n)) throw new Error(`column "${n}" already exists`); return new MTable([...t.cols, n], t.rows.map((r) => ({ ...r, [n]: call(f, recOf(t.cols, r)) }))); },
    "Table.RowCount": (t) => t.rows.length,
    "Table.SelectColumns": (t, cs) => { cs.forEach((c) => col(t, c)); return new MTable([...cs], t.rows.map((r) => Object.fromEntries(cs.map((c) => [c, r[c]])))); },
    "Table.RemoveColumns": (t, cs) => { cs.forEach((c) => col(t, c)); const keep = t.cols.filter((c) => !cs.includes(c)); return new MTable(keep, t.rows.map((r) => Object.fromEntries(keep.map((c) => [c, r[c]])))); },
    "Table.RenameColumns": (t, pairs) => { const map = new Map(pairs.map(([a, b]) => { col(t, a); return [a, b]; })); const cols = t.cols.map((c) => map.get(c) || c); return new MTable(cols, t.rows.map((r) => Object.fromEntries(t.cols.map((c) => [map.get(c) || c, r[c]])))); },
    "Table.Sort": (t, spec) => {
      const keys = spec.map((s) => (Array.isArray(s) ? s : [s, 0]));
      const rows = [...t.rows].sort((a, b) => { for (const [c, dir] of keys) { const x = a[c], y = b[c]; const o = compare("<", x, y) ? -1 : compare(">", x, y) ? 1 : 0; if (o) return dir === 1 ? -o : o; } return 0; });
      return new MTable(t.cols, rows);
    },
    "Table.TransformColumnTypes": (t, pairs) => {
      pairs.forEach(([c]) => col(t, c));
      return new MTable(t.cols, t.rows.map((r) => { const o = { ...r }; for (const [c, ty] of pairs) o[c] = convert(o[c], ty); return o; }));
    },
    "Table.Group": (t, keys, aggs) => {
      keys.forEach((k) => col(t, k));
      const groups = new Map();
      for (const r of t.rows) { const k = JSON.stringify(keys.map((c) => text(r[c]))); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
      const cols = [...keys, ...aggs.map((a) => a[0])];
      return new MTable(cols, [...groups.values()].map((rows) => {
        const sub = new MTable(t.cols, rows), o = Object.fromEntries(keys.map((c) => [c, rows[0][c]]));
        for (const [n, f] of aggs) o[n] = call(f, sub);
        return o;
      }));
    },
    "Table.NestedJoin": (a, ka, b, kb, n, kind) => {
      if (!["LeftOuter", "Inner", "LeftAnti"].includes(kind)) throw new NotModeled(`JoinKind.${kind} is not modeled; use LeftOuter, Inner or LeftAnti`);
      ka.forEach((c) => col(a, c)); kb.forEach((c) => col(b, c));
      const joined = a.rows.map((r) => ({ ...r, [n]: new MTable(b.cols, b.rows.filter((x) => ka.every((c, i) => text(r[c]) === text(x[kb[i]])))) }));
      const keep = kind === "Inner" ? (r) => r[n].rows.length > 0 : kind === "LeftAnti" ? (r) => r[n].rows.length === 0 : () => true;
      return new MTable([...a.cols, n], joined.filter(keep));
    },
    "Table.ExpandTableColumn": (t, n, cs, names) => {
      const out = names || cs, keep = t.cols.filter((c) => c !== n), rows = [];
      for (const r of t.rows) {
        const nested = r[n]; if (!isTable(nested)) throw new Error(`"${n}" is not a column of tables`);
        cs.forEach((c) => col(nested, c));
        const base = Object.fromEntries(keep.map((c) => [c, r[c]]));
        if (!nested.rows.length) rows.push({ ...base, ...Object.fromEntries(out.map((c) => [c, null])) });
        for (const x of nested.rows) rows.push({ ...base, ...Object.fromEntries(cs.map((c, i) => [out[i], x[c]])) });
      }
      return new MTable([...keep, ...out], rows);
    },
    "Table.FromList": (list, split, names) => { if (split !== "SplitByNothing") throw new NotModeled("Table.FromList is modeled with Splitter.SplitByNothing()"); return new MTable([...names], list.map((v) => ({ [names[0]]: v }))); },
    "Splitter.SplitByNothing": () => "SplitByNothing",
    "List.Sum": (l) => { const xs = l.filter((x) => x !== null); return xs.length ? xs.reduce((a, b) => a + num(b, "List.Sum"), 0) : null; },
    "List.Dates": (start, n, step) => { if (!(start instanceof MDate) || !(step instanceof MDuration)) throw new Error("List.Dates(date, count, duration)"); return Array.from({ length: n }, (_, i) => new MDate(start.ms + i * step.ms)); },
    "Duration.TotalMinutes": (d) => (d === null ? null : d.ms / 60000),
    "Time.Hour": (d) => (d === null ? null : new Date(d.ms).getUTCHours()),
    "Date.From": (d) => (d === null ? null : new MDate(Math.floor(d.ms / dayMs) * dayMs)),
    "Date.DayOfWeekName": (d) => (d === null ? null : new Date(d.ms).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })),
    // M rounds half to even by default (RoundingMode.ToEven): 2.5 -> 2, 3.5 -> 4.
    "Number.Round": (x, d) => {
      if (x === null) return null;
      const f = 10 ** (d ?? 0), y = num(x, "Number.Round") * f, lo = Math.floor(y), frac = y - lo;
      const r = frac === 0.5 ? (lo % 2 === 0 ? lo : lo + 1) : Math.round(y);
      return Number((r / f).toFixed(d ?? 0));
    },
    "Number.From": (v) => {
      if (v === null || typeof v === "number") return v;
      const x = typeof v === "string" && /^\s*-?\d+(\.\d+)?\s*$/.test(v) ? Number(v) : NaN;
      if (Number.isNaN(x)) throw new MError(`We couldn't convert to Number: ${text(v)}`);
      return x;
    },
    "Text.From": (v) => (v === null ? null : text(v)),
    "Text.Upper": (v) => (v === null ? null : String(v).toUpperCase()),
    "Text.Start": (v, n) => (v === null ? null : String(v).slice(0, n)),
    "Date.Year": (d) => (d === null ? null : new Date(d.ms).getUTCFullYear()),
    "Date.Month": (d) => (d === null ? null : new Date(d.ms).getUTCMonth() + 1),
    "List.Count": (l) => l.length,
    "List.Average": (l) => { const xs = l.filter((x) => x !== null); return xs.length ? xs.reduce((a, b) => a + num(b, "List.Average"), 0) / xs.length : null; },
    "List.Max": (l) => { const xs = l.filter((x) => x !== null); return xs.length ? xs.reduce((a, b) => (compare(">", b, a) ? b : a)) : null; },
    "List.Min": (l) => { const xs = l.filter((x) => x !== null); return xs.length ? xs.reduce((a, b) => (compare("<", b, a) ? b : a)) : null; },
    "List.Distinct": (l) => { const seen = new Set(); return l.filter((x) => { const k = text(x); if (seen.has(k)) return false; seen.add(k); return true; }); },
    // Table.Pivot(table, values, attributeColumn, valueColumn, aggregation): one new column per value, in
    // the list's order; the other columns group the rows. Two values for one cell with no aggregation is an error.
    "Table.Pivot": (t, values, attr, val, agg) => {
      col(t, attr); col(t, val);
      const keys = t.cols.filter((c) => c !== attr && c !== val), groups = new Map();
      for (const r of t.rows) { const k = JSON.stringify(keys.map((c) => text(r[c]))); if (!groups.has(k)) groups.set(k, { base: r, cells: new Map() }); const g = groups.get(k); const a = text(r[attr]); if (!g.cells.has(a)) g.cells.set(a, []); g.cells.get(a).push(r[val]); }
      return new MTable([...keys, ...values], [...groups.values()].map(({ base, cells }) => {
        const o = Object.fromEntries(keys.map((c) => [c, base[c]]));
        for (const v of values) { const xs = cells.get(text(v)); o[v] = !xs ? null : agg ? call(agg, xs) : xs.length === 1 ? xs[0] : (() => { throw new MError(`more than one value for ${v}: give Table.Pivot an aggregation`); })(); }
        return o;
      }));
    },
    // Table.UnpivotOtherColumns(table, keep, attributeColumn, valueColumn): every other column becomes a row; nulls are dropped.
    "Table.UnpivotOtherColumns": (t, keep, attr, val) => {
      keep.forEach((c) => col(t, c));
      const other = t.cols.filter((c) => !keep.includes(c));
      return new MTable([...keep, attr, val], t.rows.flatMap((r) => other.filter((c) => r[c] !== null).map((c) => ({ ...Object.fromEntries(keep.map((k) => [k, r[k]])), [attr]: c, [val]: r[c] }))));
    },
    // The replacer is a function of (value, old, new), called on each cell of the listed columns.
    "Table.ReplaceValue": (t, oldV, newV, replacer, cols) => {
      cols.forEach((c) => col(t, c));
      return new MTable(t.cols, t.rows.map((r) => { const o = { ...r }; for (const c of cols) o[c] = call(replacer, o[c], oldV, newV); return o; }));
    },
    "Replacer.ReplaceValue": (v, oldV, newV) => (text(v) === text(oldV) && (v === null) === (oldV === null) ? newV : v),
    "Table.FillDown": (t, cols) => { cols.forEach((c) => col(t, c)); const last = {}; return new MTable(t.cols, t.rows.map((r) => { const o = { ...r }; for (const c of cols) { if (o[c] === null) o[c] = last[c] ?? null; else last[c] = o[c]; } return o; })); },
    "Table.TransformColumns": (t, pairs) => { pairs.forEach(([c]) => col(t, c)); return new MTable(t.cols, t.rows.map((r) => { const o = { ...r }; for (const [c, f] of pairs) o[c] = call(f, o[c]); return o; })); },
    "Table.AddIndexColumn": (t, n, start, step) => { if (t.cols.includes(n)) throw new Error(`column "${n}" already exists`); return new MTable([...t.cols, n], t.rows.map((r, i) => ({ ...r, [n]: (start ?? 0) + i * (step ?? 1) }))); },
    "Text.Contains": (v, sub) => (v === null ? null : String(v).includes(sub)),
    "Text.PadStart": (v, n, ch) => (v === null ? null : String(v).padStart(n, ch ?? " ")),
    "Text.Replace": (v, a, b) => (v === null ? null : String(v).split(a).join(b)),
    "List.Contains": (l, x) => l.some((y) => text(y) === text(x) && (y === null) === (x === null)),
    "List.FirstN": (l, n) => l.slice(0, n),
    "List.Range": (l, offset, count) => l.slice(offset, count === undefined ? undefined : offset + count),
    "List.Accumulate": (l, seed, f) => l.reduce((state, x) => call(f, state, x), seed),
    // The week functions need the first day passed in: M's default depends on the culture, and the
    // model does not guess it. Day.Sunday is 0 through Day.Saturday 6.
    "Date.DayOfWeek": (d, first) => {
      if (first === undefined) throw new NotModeled("Date.DayOfWeek without a first day of the week: pass one, such as Day.Saturday");
      return d === null ? null : (new Date(d.ms).getUTCDay() - first + 7) % 7;
    },
    "Date.StartOfWeek": (d, first) => {
      if (first === undefined) throw new NotModeled("Date.StartOfWeek without a first day of the week: pass one, such as Day.Saturday");
      if (d === null) return null;
      const day = Math.floor(d.ms / dayMs) * dayMs, back = (new Date(d.ms).getUTCDay() - first + 7) % 7;
      return new d.constructor(day - back * dayMs);
    },
    "Date.AddDays": (d, n) => (d === null ? null : new d.constructor(d.ms + num(n, "Date.AddDays") * dayMs)),
    "Time.Minute": (d) => (d === null ? null : new Date(d.ms).getUTCMinutes()),
    "Duration.Minutes": (d) => (d === null ? null : Math.trunc(d.ms / 60000) % 60),
    "Duration.TotalSeconds": (d) => (d === null ? null : d.ms / 1000),
    "Duration.Hours": (d) => (d === null ? null : Math.trunc(d.ms / 3600000) % 24),
    "Record.ToTable": (r) => new MTable(["Name", "Value"], Object.entries(r && r.rec ? r.row : r).map(([k, v]) => ({ Name: k, Value: v }))),
    "Record.FieldNames": (r) => Object.keys(r && r.rec ? r.row : r),
    "Table.FirstN": (t, n) => new MTable(t.cols, t.rows.slice(0, n)),
    "Table.Distinct": (t) => { const seen = new Set(); return new MTable(t.cols, t.rows.filter((r) => { const k = JSON.stringify(t.cols.map((c) => text(r[c]))); if (seen.has(k)) return false; seen.add(k); return true; })); },
    "Table.Combine": (ts) => { const cols = [...new Set(ts.flatMap((t) => t.cols))]; return new MTable(cols, ts.flatMap((t) => t.rows.map((r) => Object.fromEntries(cols.map((c) => [c, c in r ? r[c] : null]))))); },
    "Table.FromRecords": (recs) => { const cols = [...new Set(recs.flatMap((r) => Object.keys(r)))]; return new MTable(cols, recs.map((r) => Object.fromEntries(cols.map((c) => [c, c in r ? r[c] : null])))); },
  };
  function convert(v, ty) {
    if (v === null) return null;
    if (ty === "number") return typeof v === "number" ? v : Number(v);
    if (ty === "text") return text(v);
    if (ty === "Int64.Type") { if (!Number.isInteger(v)) throw new NotModeled(`${text(v)} into Int64: rounding is not modeled`); return v; }
    if (ty === "date") { if (v instanceof MDate) return v; if (v instanceof MDateTime) return new MDate(Math.floor(v.ms / dayMs) * dayMs); }
    if (ty === "datetime" && v instanceof MDateTime) return v;
    throw new NotModeled(`changing ${text(v)} to type ${ty} is not modeled`);
  }
  const ENUMS = { "Day.Sunday": 0, "Day.Monday": 1, "Day.Tuesday": 2, "Day.Wednesday": 3, "Day.Thursday": 4, "Day.Friday": 5, "Day.Saturday": 6, "JoinKind.LeftOuter": "LeftOuter", "JoinKind.Inner": "Inner", "JoinKind.LeftAnti": "LeftAnti", "JoinKind.RightOuter": "RightOuter", "JoinKind.FullOuter": "FullOuter", "JoinKind.RightAnti": "RightAnti", "Order.Ascending": 0, "Order.Descending": 1, "Int64.Type": "Int64.Type" };

  function ev(e, env) {
    if ("lit" in e) return e.lit;
    if (e.type) return e.type;
    if (e.list) return e.list.map((x) => ev(x, env));
    if (e.record) return Object.fromEntries(e.record.map(([n, x]) => [n, ev(x, env)]));
    if (e.let) { const scope = new Map(env); for (const [n, x] of e.let) scope.set(n, ev(x, scope)); return ev(e.body, scope); }
    if (e.each) return fn((arg) => ev(e.each, new Map([...env, ["_", arg]])));
    if (e.params) return fn((...args) => {
      if (args.length !== e.params.length) throw new MError(`the function takes ${e.params.length} argument(s), got ${args.length}`);
      e.params.forEach((n, i) => checkType(args[i], e.types[i], `argument ${n}`));
      return checkType(ev(e.body, new Map([...env, ...e.params.map((n, i) => [n, args[i]])])), e.ret, "the result");
    });
    if ("try" in e) { try { return ev(e.try, env); } catch (err) { if (err instanceof MError) return ev(e.otherwise, env); throw err; } }
    if (e.if) return truthy(ev(e.if, env)) ? ev(e.then, env) : ev(e.else, env);
    if (e.not) return !truthy(ev(e.not, env));
    if (e.neg) return -num(ev(e.neg, env), "-");
    if (e.name) {
      if (env.has(e.name)) return env.get(e.name);
      if (e.name in ENUMS) return ENUMS[e.name];
      if (LIB[e.name]) return fn(LIB[e.name]);
      if (queries.has(e.name)) return result(e.name);
      if (/^[A-Z]\w*\.\w+$/.test(e.name)) throw new NotModeled(`${e.name} is not in this model`);
      throw new Error(`${e.name} is not a step, a query or a function`);
    }
    if (e.call) {
      if (e.call.name === "#datetime") { const a = e.args.map((x) => num(ev(x, env), "#datetime")); return new MDateTime(Date.UTC(a[0], a[1] - 1, a[2], a[3], a[4], a[5])); }
      if (e.call.name === "#date") { const a = e.args.map((x) => num(ev(x, env), "#date")); return new MDate(Date.UTC(a[0], a[1] - 1, a[2])); }
      if (e.call.name === "#duration") { const a = e.args.map((x) => num(ev(x, env), "#duration")); return new MDuration(((a[0] * 24 + a[1]) * 60 + a[2]) * 60000 + a[3] * 1000); }
      const f = ev(e.call, env);
      return call(f, ...e.args.map((x) => ev(x, env)));
    }
    if (e.field) {
      const of = ev(e.of, env);
      if (of && of.rec) { if (!(e.field in of.row)) throw new Error(`the row has no field "${e.field}"`); return unlazy(of.row[e.field]); }
      if (isTable(of)) return col(of, e.field);
      if (of && typeof of === "object" && !Array.isArray(of)) { if (!(e.field in of)) throw new Error(`no field "${e.field}"`); return unlazy(of[e.field]); }
      throw new Error(`[${e.field}] needs a row, a record or a table`);
    }
    if (e.item) {
      const of = ev(e.of, env), sel = ev(e.item, env);
      if (!isTable(of)) throw new Error("{…} picks a row from a table");
      if (typeof sel === "number") return recOf(of.cols, of.rows[sel]);
      const hits = of.rows.filter((r) => Object.entries(sel).every(([k, v]) => r[k] === v));
      if (hits.length !== 1) throw new Error(`expected exactly one row matching ${JSON.stringify(sel)}, found ${hits.length}`);
      return recOf(of.cols, hits[0]);
    }
    if (e.op === "and") return truthy(ev(e.a, env)) && truthy(ev(e.b, env));
    if (e.op === "or") return truthy(ev(e.a, env)) || truthy(ev(e.b, env));
    if (e.op) {
      const a = ev(e.a, env), b = ev(e.b, env);
      if (["=", "<>", "<", ">", "<=", ">="].includes(e.op)) return compare(e.op, a, b);
      return arith(e.op, a, b);
    }
    throw new Error("cannot evaluate this expression");
  }
  function result(name) {
    if (!results.has(name)) {
      results.set(name, "pending");
      const v = ev(queries.get(name), new Map());
      results.set(name, v);
    }
    const r = results.get(name);
    if (r === "pending") throw new Error(`query ${name} refers to itself`);
    return r;
  }
  return {
    // Add or replace a query by name (the lesson gives the name, as the Queries pane does).
    define(name, src) { queries.set(name, parse(src)); results.clear(); },
    run(name) { const v = result(name); if (!isTable(v)) throw new Error(`query ${name} returns ${text(v)}, not a table`); return v; },
    // Any value, as the editor shows it: a table, a list, a record or a single value.
    value(name) { const v = result(name); return v && v.rec ? v.row : v; },
    LIB,
  };
}

// A table as the Power Query editor's preview would show it: the first rows, then the row count.
export function preview(t, { top, format: fmt = {} } = {}, fmtNumber) {
  const rows = t.rows.slice(0, top ?? t.rows.length);
  const cell = (v, c) => (v === null ? "null" : typeof v === "number" && fmt[c] ? fmtNumber(v, fmt[c]) : text(v));
  const cells = [t.cols, ...rows.map((r) => t.cols.map((c) => cell(r[c], c)))];
  const w = t.cols.map((_, i) => Math.max(...cells.map((r) => r[i].length)));
  const right = t.cols.map((c) => rows.every((r) => typeof r[c] === "number" || r[c] === null));
  const body = cells.map((r) => r.map((s, i) => (right[i] ? s.padStart(w[i]) : s.padEnd(w[i]))).join("  ").trimEnd()).join("\n");
  return `${body}\n${t.rows.length} row${t.rows.length === 1 ? "" : "s"}${rows.length < t.rows.length ? `, first ${rows.length} shown` : ""}`;
}
// A list, record or single value as a one- or two-column table, the way the editor previews them.
export function asTable(v) {
  if (isTable(v)) return v;
  if (Array.isArray(v)) return new MTable(["List"], v.map((x) => ({ List: x })));
  if (v && typeof v === "object" && !(v instanceof MDateTime || v instanceof MDate || v instanceof MDuration)) return new MTable(["Field", "Value"], Object.entries(v).map(([k, x]) => ({ Field: k, Value: x })));
  return new MTable(["Value"], [{ Value: v }]);
}
export const plainRows = (t) => t.rows.map((r) => t.cols.map((c) => (r[c] === null ? null : typeof r[c] === "object" ? text(r[c]) : r[c])));
