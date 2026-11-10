// A teaching model of DAX, for the DAX lane's outputs. DAX itself only runs in Power BI / Analysis
// Services, so lesson outputs come from this model over a snapshot of the canonical PlantDB
// (plantdb.json, exported from SQL Server by sql.py). Every lesson also has a SQL twin that must
// give the same numbers on the real database (run.mjs). Semantics and limits: docs/DAX_MODEL.md.
// Anything outside the modeled subset throws NotModeled instead of guessing.

export class NotModeled extends Error {}
export const BLANK = Symbol("BLANK");
const isBlank = (v) => v === BLANK;

// Date/times are DAX-style serial days since 1899-12-30, wrapped so functions can tell them apart.
export class DT { constructor(d) { this.d = d; } }
const EPOCH = Date.UTC(1899, 11, 30);
const dtFromText = (s) => { const m = /^(\d{4})-(\d\d)-(\d\d)(?: (\d\d):(\d\d):(\d\d))?$/.exec(s); return new DT((Date.UTC(+m[1], m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)) - EPOCH) / 86400000); };
const secs = (dt) => Math.round(dt.d * 86400);
const dtText = (dt) => new Date(EPOCH + secs(dt) * 1000).toISOString().slice(0, 19).replace("T", " ");

/* ---------- tokens and parser ---------- */
const TOK = /\s+|\/\/[^\n]*|--[^\n]*|\/\*[\s\S]*?\*\/|("(?:[^"]|"")*")|('(?:[^']|'')+'|[A-Za-z_][\w.]*)?\[([^\]]+)\]|(\d+(?:\.\d+)?)|([A-Za-z_][\w.]*)|(<>|<=|>=|==|&&|\|\||[-+*/&=<>(),^])/y;
function tokenize(src) {
  const out = []; let m; TOK.lastIndex = 0;
  while (TOK.lastIndex < src.length) {
    const at = TOK.lastIndex;
    if (!(m = TOK.exec(src))) throw new Error(`cannot read "${src.slice(at, at + 12)}"`);
    if (m[1]) out.push({ k: "str", v: m[1].slice(1, -1).replace(/""/g, '"') });
    else if (m[3] !== undefined) out.push({ k: "ref", table: m[2] ? m[2].replace(/^'|'$/g, "").replace(/''/g, "'") : null, name: m[3] });
    else if (m[4]) out.push({ k: "num", v: Number(m[4]) });
    else if (m[5]) out.push({ k: "id", v: m[5] });
    else if (m[6]) out.push({ k: "op", v: m[6] });
  }
  return out;
}
// Lower to higher precedence. NOT is written as a function in these lessons.
const LEVELS = [["||"], ["&&"], ["=", "==", "<>", "<", ">", "<=", ">="], ["&"], ["+", "-"], ["*", "/"], ["^"]];
export function parse(src) {
  const t = tokenize(src); let p = 0;
  const peek = () => t[p], isOp = (v) => t[p] && t[p].k === "op" && t[p].v === v, isId = (v) => t[p] && t[p].k === "id" && t[p].v.toUpperCase() === v;
  const expectOp = (v) => { if (!isOp(v)) throw new Error(`expected "${v}"${t[p] ? ` before "${t[p].v ?? t[p].name}"` : " at the end"}`); p++; };
  function expr() {
    if (isId("VAR")) {
      const vars = [];
      while (isId("VAR")) { p++; const n = t[p++]; if (!n || n.k !== "id") throw new Error("expected a variable name after VAR"); expectOp("="); vars.push([n.v, expr()]); }
      if (!isId("RETURN")) throw new Error("expected RETURN after the VAR lines");
      p++;
      return { vars, body: expr() };
    }
    return bin(0);
  }
  function bin(l) {
    if (l === LEVELS.length) return unary();
    let e = bin(l + 1);
    while (t[p] && t[p].k === "op" && LEVELS[l].includes(t[p].v)) { const op = t[p++].v; e = { op, a: e, b: bin(l + 1) }; }
    return e;
  }
  function unary() {
    if (isOp("-")) { p++; return { neg: unary() }; }
    if (isOp("+")) { p++; return unary(); }
    return primary();
  }
  function primary() {
    const k = t[p];
    if (!k) throw new Error("the formula ends early");
    if (k.k === "num") { p++; return { num: k.v }; }
    if (k.k === "str") { p++; return { str: k.v }; }
    if (k.k === "ref") { p++; return k.table ? { col: [k.table, k.name] } : { bare: k.name }; }
    if (isOp("(")) { p++; const e = expr(); expectOp(")"); return e; }
    if (k.k === "id") {
      p++;
      if (isOp("(")) {
        p++; const args = [];
        if (!isOp(")")) { do { args.push(expr()); } while (isOp(",") && ++p); }
        expectOp(")");
        return { fn: k.v.toUpperCase(), args };
      }
      return { name: k.v };
    }
    throw new Error(`unexpected "${k.v}"`);
  }
  const e = expr();
  if (p < t.length) throw new Error(`unexpected "${t[p].v ?? t[p].name}"`);
  return e;
}

// Split lesson code into definitions. A definition starts at a line with no indent:
//   Measure Name = <expression>        a measure
//   table[column] = <expression>       a calculated column
// Indented lines continue the definition above.
export function definitions(code) {
  const defs = [];
  for (const line of code.split("\n")) {
    if (!line.trim()) continue;
    if (/^\S/.test(line)) {
      const m = /^(?:([A-Za-z_]\w*)\[([^\]]+)\]|([A-Za-z][\w ]*?))\s*=\s*(.*)$/.exec(line);
      if (!m) throw new Error(`"${line}" does not start a definition: write Name = … or table[column] = …`);
      defs.push(m[3] ? { measure: m[3], src: m[4] } : { table: m[1], column: m[2], src: m[4] });
    } else {
      if (!defs.length) throw new Error("an indented line needs a definition above it");
      defs[defs.length - 1].src += "\n" + line;
    }
  }
  return defs.map((d) => ({ ...d, ast: parse(d.src) }));
}

/* ---------- the model ---------- */
// snapshot: { table: { columns, rows } }; dates are "YYYY-MM-DD HH:MM:SS" text.
// relationships: [[manyTable, manyColumn, oneTable, oneColumn]], filtering one -> many only.
const DATE_COLS = new Set(["start_ts", "end_ts", "ts"]);
export function createModel(snapshot, relationships) {
  const T = {};
  for (const [name, t] of Object.entries(snapshot)) {
    T[name] = { name, cols: [...t.columns], rows: t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i] === null ? BLANK : DATE_COLS.has(c) ? dtFromText(r[i]) : r[i]]))) };
  }
  const rels = relationships.map(([mt, mc, ot, oc]) => ({ mt, mc, ot, oc }));
  const measures = new Map();
  const table = (n) => { if (!T[n]) throw new Error(`there is no table ${n}`); return T[n]; };
  const hasCol = (t, c) => table(t).cols.includes(c);
  const colCheck = (t, c) => { if (!hasCol(t, c)) throw new Error(`${t} has no column [${c}]`); };
  const keyOf = (v) => (v instanceof DT ? `d${secs(v)}` : isBlank(v) ? "\u0000blank" : typeof v + ":" + v);
  // Tables a table's filters reach (itself and the one-side tables it expands to).
  const expands = (t) => [t, ...rels.filter((r) => r.mt === t).flatMap((r) => expands(r.ot))];

  // Rows of table t visible under filters. read: the caller reads t's own rows (see the refusal).
  function visible(t, filters, read = true) {
    if (read) for (const f of filters) if (f.kind === "rows" && f.table !== t && expands(f.table).includes(t)) {
      throw new NotModeled(`a filter on whole ${f.table} rows would also filter ${t} in real DAX (expanded tables); this model does not cover reading ${t} under it`);
    }
    const tb = table(t);
    const ups = rels.filter((r) => r.mt === t).map((r) => ({ r, keys: new Set(visible(r.ot, filters, false).map((i) => keyOf(table(r.ot).rows[i][r.oc]))) }));
    const out = [];
    tb.rows.forEach((row, i) => {
      for (const f of filters) {
        if (f.table !== t) continue;
        if (f.kind === "col" && !f.values.has(keyOf(row[f.col]))) return;
        if (f.kind === "rows" && !f.rows.has(i)) return;
      }
      for (const u of ups) if (!u.keys.has(keyOf(row[u.r.mc]))) return;
      out.push(i);
    });
    return out;
  }

  /* values */
  const num = (v, what) => {
    if (isBlank(v)) return 0;
    if (typeof v === "boolean") return v ? 1 : 0;
    if (typeof v !== "number") throw new NotModeled(`${what}: expected a number, got ${v instanceof DT ? "a date" : JSON.stringify(v)}`);
    return v;
  };
  const truthy = (v) => (isBlank(v) ? false : typeof v === "boolean" ? v : typeof v === "number" ? v !== 0 : (() => { throw new NotModeled(`a condition must be true or false, not ${JSON.stringify(v)}`); })());
  function arith(op, a, b) {
    if (a instanceof DT || b instanceof DT) {
      if (op === "+" && a instanceof DT && b instanceof DT) return new DT(a.d + b.d); // DATE(…) + TIME(…)
      if (op === "+" && a instanceof DT && typeof b === "number") return new DT(a.d + b);
      throw new NotModeled(`date arithmetic ${op} is not modeled beyond DATE(…) + TIME(…)`);
    }
    if (op === "+" || op === "-") { if (isBlank(a) && isBlank(b)) return BLANK; const x = num(a, op), y = num(b, op); return op === "+" ? x + y : x - y; }
    if (op === "*") { if (isBlank(a) || isBlank(b)) return BLANK; return num(a, op) * num(b, op); }
    if (op === "/") {
      if (isBlank(a)) return BLANK;
      if (isBlank(b) || num(b, op) === 0) throw new NotModeled("division by zero or blank with /: DAX gives infinity; use DIVIDE");
      return num(a, op) / num(b, op);
    }
    if (op === "^") { if (isBlank(a) || isBlank(b)) return BLANK; return Math.pow(num(a, op), num(b, op)); }
  }
  function compare(op, a, b) {
    const norm = (v, o) => (isBlank(v) ? (typeof o === "string" ? "" : o instanceof DT ? new DT(0) : typeof o === "boolean" ? false : 0) : v);
    let x = norm(a, b), y = norm(b, a);
    if (x instanceof DT && y instanceof DT) { x = secs(x); y = secs(y); }
    if (typeof x !== typeof y) throw new NotModeled(`comparing ${typeof x} with ${typeof y} is not modeled`);
    switch (op) { case "=": case "==": return x === y; case "<>": return x !== y; case "<": return x < y; case ">": return x > y; case "<=": return x <= y; case ">=": return x >= y; }
  }

  /* row context helpers */
  function colValue(ctx, t, c) {
    for (let i = ctx.rows.length - 1; i >= 0; i--) {
      const r = ctx.rows[i];
      if (r.kind === "phys" && r.table === t) { colCheck(t, c); return table(t).rows[r.idx][c]; }
      if (r.kind === "col" && r.table === t && r.col === c) return r.value;
    }
    throw new Error(`${t}[${c}] is used where there is no row of ${t}: wrap it in an aggregation such as SUM, or iterate ${t}`);
  }
  // A table expression -> { kind: "phys", table, rows: [idx] } or { kind: "col", table, col, values: [v] }
  function tableOf(e, ctx) {
    if (e.name) { table(e.name); return { kind: "phys", table: e.name, rows: visible(e.name, ctx.filters) }; }
    if (e.fn === "ALL") {
      const a = e.args[0];
      if (a.col) { const [t, c] = a.col; colCheck(t, c); return { kind: "col", table: t, col: c, values: distinct(table(t).rows.map((r) => r[c])) }; }
      if (a.name) return { kind: "phys", table: a.name, rows: table(a.name).rows.map((_, i) => i) };
    }
    if (e.fn === "VALUES") {
      const a = e.args[0];
      if (!a.col) throw new NotModeled("VALUES of a table is not modeled; use VALUES(table[column])");
      const [t, c] = a.col; colCheck(t, c);
      return { kind: "col", table: t, col: c, values: distinct(visible(t, ctx.filters).map((i) => table(t).rows[i][c])) };
    }
    if (e.fn === "FILTER") {
      const src = tableOf(e.args[0], ctx), keep = [];
      for (const item of src.kind === "phys" ? src.rows : src.values) {
        const rc = src.kind === "phys" ? { kind: "phys", table: src.table, idx: item } : { kind: "col", table: src.table, col: src.col, value: item };
        if (truthy(ev(e.args[1], { ...ctx, rows: [...ctx.rows, rc] }))) keep.push(item);
      }
      return src.kind === "phys" ? { ...src, rows: keep } : { ...src, values: keep };
    }
    throw new NotModeled(`a table expression ${e.fn || e.name || "here"} is not modeled`);
  }
  const distinct = (vals) => { const seen = new Map(); for (const v of vals) if (!seen.has(keyOf(v))) seen.set(keyOf(v), v); return [...seen.values()]; };
  const iterate = (tv) => (tv.kind === "phys" ? tv.rows.map((idx) => ({ kind: "phys", table: tv.table, idx })) : tv.values.map((value) => ({ kind: "col", table: tv.table, col: tv.col, value })));

  /* CALCULATE */
  // 1. filter arguments are evaluated in the outer context; 2. context transition turns each row
  // context into a filter; 3. ALL removes filters; 4. the new filters replace any on the same columns.
  function calculate(exprNode, args, ctx) {
    const removals = [], adds = [];
    for (const a of args) {
      if (a.fn === "ALL" || a.fn === "REMOVEFILTERS") {
        const x = a.args[0];
        if (x.col) removals.push({ table: x.col[0], col: x.col[1] });
        else if (x.name) { table(x.name); removals.push({ table: x.name, col: null }); }
        else throw new NotModeled("ALL here needs a table or a column");
        continue;
      }
      if (a.fn === "FILTER" || a.fn === "VALUES" || (a.fn === "ALL")) {
        const tv = tableOf(a, ctx);
        adds.push(tv.kind === "phys" ? { kind: "rows", table: tv.table, rows: new Set(tv.rows) } : { kind: "col", table: tv.table, col: tv.col, values: new Set(tv.values.map(keyOf)) });
        continue;
      }
      // A boolean on one column: FILTER(ALL(table[column]), condition).
      const cols = new Map(); let measureRef = false;
      (function walk(n) {
        if (!n || typeof n !== "object") return;
        if (n.col) cols.set(n.col.join("|"), n.col);
        if (n.bare && measures.has(n.bare)) measureRef = true;
        for (const v of Object.values(n)) if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") walk(v);
      })(a);
      if (measureRef) throw new NotModeled("a measure inside a CALCULATE condition is not allowed in DAX; use FILTER");
      if (cols.size !== 1) throw new NotModeled("a CALCULATE condition must use exactly one column; use FILTER for more");
      const [t, c] = [...cols.values()][0]; colCheck(t, c);
      const all = distinct(table(t).rows.map((r) => r[c]));
      const keep = all.filter((v) => truthy(ev(a, { ...ctx, rows: [...ctx.rows, { kind: "col", table: t, col: c, value: v }] })));
      adds.push({ kind: "col", table: t, col: c, values: new Set(keep.map(keyOf)) });
    }
    let filters = [...ctx.filters];
    for (const r of ctx.rows) {
      if (r.kind === "phys") filters.push({ kind: "rows", table: r.table, rows: new Set([r.idx]) });
      else filters = [...filters.filter((f) => !(f.kind === "col" && f.table === r.table && f.col === r.col)), { kind: "col", table: r.table, col: r.col, values: new Set([keyOf(r.value)]) }];
    }
    for (const rm of removals) {
      if (rm.col === null) { const gone = expands(rm.table); filters = filters.filter((f) => !gone.includes(f.table)); }
      else {
        if (filters.some((f) => f.kind === "rows" && f.table === rm.table)) throw new NotModeled(`ALL(${rm.table}[${rm.col}]) on top of a filter on whole ${rm.table} rows is not modeled`);
        filters = filters.filter((f) => !(f.kind === "col" && f.table === rm.table && f.col === rm.col));
      }
    }
    for (const a of adds) if (a.kind === "col") filters = filters.filter((f) => !(f.kind === "col" && f.table === a.table && f.col === a.col));
    filters.push(...adds);
    return ev(exprNode, { filters, rows: [], vars: ctx.vars, depth: (ctx.depth || 0) + 1 });
  }

  /* expressions */
  const AGG = { SUM: "sum", AVERAGE: "avg", MIN: "min", MAX: "max" };
  const ITER = { SUMX: "sum", AVERAGEX: "avg", MINX: "min", MAXX: "max" };
  function reduce(kind, vals) {
    const xs = vals.filter((v) => !isBlank(v));
    if (!xs.length) return BLANK;
    if (xs.some((v) => v instanceof DT)) { if (kind === "min" || kind === "max") return xs.reduce((a, b) => ((kind === "min" ? secs(b) < secs(a) : secs(b) > secs(a)) ? b : a)); throw new NotModeled(`${kind} of dates is not modeled`); }
    const ns = xs.map((v) => num(v, kind));
    if (kind === "sum") return ns.reduce((a, b) => a + b, 0);
    if (kind === "avg") return ns.reduce((a, b) => a + b, 0) / ns.length;
    return kind === "min" ? Math.min(...ns) : Math.max(...ns);
  }
  function ev(e, ctx) {
    if ((ctx.depth || 0) > 60) throw new Error("measures refer to each other in a loop");
    if (e.num !== undefined) return e.num;
    if (e.str !== undefined) return e.str;
    if (e.vars) { const vars = new Map(ctx.vars); for (const [n, x] of e.vars) vars.set(n, ev(x, { ...ctx, vars })); return ev(e.body, { ...ctx, vars }); }
    if (e.name) { if (ctx.vars && ctx.vars.has(e.name)) return ctx.vars.get(e.name); throw new Error(`${e.name} is not a variable; a table name alone is not a value`); }
    if (e.bare !== undefined) {
      if (measures.has(e.bare)) return calculate(measures.get(e.bare), [], ctx); // a measure reference is an implicit CALCULATE
      for (let i = ctx.rows.length - 1; i >= 0; i--) { const r = ctx.rows[i]; if (r.kind === "phys" && hasCol(r.table, e.bare)) return table(r.table).rows[r.idx][e.bare]; }
      throw new Error(`[${e.bare}] is not a measure, and no row in context has that column`);
    }
    if (e.col) return colValue(ctx, e.col[0], e.col[1]);
    if (e.neg) { const v = ev(e.neg, ctx); return isBlank(v) ? BLANK : -num(v, "-"); }
    if (e.op) {
      if (e.op === "&&") return truthy(ev(e.a, ctx)) && truthy(ev(e.b, ctx));
      if (e.op === "||") return truthy(ev(e.a, ctx)) || truthy(ev(e.b, ctx));
      const a = ev(e.a, ctx), b = ev(e.b, ctx);
      if (e.op === "&") return (isBlank(a) ? "" : String(a)) + (isBlank(b) ? "" : String(b));
      if (["=", "==", "<>", "<", ">", "<=", ">="].includes(e.op)) return compare(e.op, a, b);
      return arith(e.op, a, b);
    }
    const A = e.args, f = e.fn, n = (i) => ev(A[i], ctx);
    if (AGG[f] && A.length === 1) {
      if (!A[0].col) throw new NotModeled(`${f} takes a column here`);
      const [t, c] = A[0].col; colCheck(t, c);
      return reduce(AGG[f], visible(t, ctx.filters).map((i) => table(t).rows[i][c]));
    }
    if ((f === "MIN" || f === "MAX") && A.length === 2) { const x = n(0), y = n(1); return reduce(AGG[f], [x, y]); }
    if (ITER[f]) {
      const tv = tableOf(A[0], ctx);
      return reduce(ITER[f], iterate(tv).map((rc) => ev(A[1], { ...ctx, rows: [...ctx.rows, rc] })));
    }
    switch (f) {
      case "COUNTROWS": { const tv = tableOf(A[0], ctx), k = tv.kind === "phys" ? tv.rows.length : tv.values.length; return k ? k : BLANK; }
      case "DIVIDE": { const a = n(0), b = n(1); if (isBlank(b) || num(b, "DIVIDE") === 0) return A[2] ? n(2) : BLANK; if (isBlank(a)) return BLANK; return num(a, "DIVIDE") / num(b, "DIVIDE"); }
      case "CALCULATE": return calculate(A[0], A.slice(1), ctx);
      case "IF": return truthy(n(0)) ? n(1) : A.length > 2 ? n(2) : BLANK;
      case "SWITCH": {
        const v = n(0);
        for (let i = 1; i + 1 < A.length; i += 2) if (compare("=", v, n(i))) return n(i + 1);
        return A.length % 2 === 0 ? n(A.length - 1) : BLANK;
      }
      case "TRUE": return true;
      case "FALSE": return false;
      case "AND": return truthy(n(0)) && truthy(n(1));
      case "OR": return truthy(n(0)) || truthy(n(1));
      case "NOT": return !truthy(n(0));
      case "BLANK": return BLANK;
      case "ISBLANK": return isBlank(n(0));
      case "COALESCE": { for (let i = 0; i < A.length; i++) { const v = n(i); if (!isBlank(v)) return v; } return BLANK; }
      case "ROUND": { const v = n(0); if (isBlank(v)) return BLANK; const k = 10 ** num(n(1), "ROUND"), x = num(v, "ROUND") * k; return Math.sign(x) * Math.round(Math.abs(x) + 1e-9) / k; }
      case "DATE": return new DT((Date.UTC(num(n(0)), num(n(1)) - 1, num(n(2))) - EPOCH) / 86400000);
      case "TIME": return new DT((num(n(0)) * 3600 + num(n(1)) * 60 + num(n(2))) / 86400);
      case "DATEDIFF": {
        const a = n(0), b = n(1), unit = A[2].name && A[2].name.toUpperCase();
        if (isBlank(a) || isBlank(b)) return BLANK;
        if (!(a instanceof DT && b instanceof DT)) throw new NotModeled("DATEDIFF needs two dates");
        const per = { SECOND: 1, MINUTE: 60, HOUR: 3600, DAY: 86400 }[unit];
        if (!per) throw new NotModeled(`DATEDIFF unit ${unit} is not modeled`);
        return Math.floor(secs(b) / per) - Math.floor(secs(a) / per); // boundaries crossed, as in DAX and SQL
      }
      case "RELATED": {
        const [t, c] = A[0].col || []; if (!t) throw new Error("RELATED takes a column");
        colCheck(t, c);
        for (let i = ctx.rows.length - 1; i >= 0; i--) {
          const r = ctx.rows[i]; if (r.kind !== "phys") continue;
          const rel = rels.find((x) => x.mt === r.table && x.ot === t);
          if (!rel) continue;
          const key = keyOf(table(r.table).rows[r.idx][rel.mc]), row = table(t).rows.find((x) => keyOf(x[rel.oc]) === key);
          return row ? row[c] : BLANK;
        }
        throw new Error(`RELATED(${t}[${c}]) needs a row of a table related to ${t}`);
      }
      case "HASONEVALUE": { const [t, c] = A[0].col; return distinct(visible(t, ctx.filters).map((i) => table(t).rows[i][c])).length === 1; }
      case "SELECTEDVALUE": { const [t, c] = A[0].col, vs = distinct(visible(t, ctx.filters).map((i) => table(t).rows[i][c])); return vs.length === 1 ? vs[0] : A[1] ? n(1) : BLANK; }
      case "RANKX": {
        if (A.length > 3) throw new NotModeled("RANKX with an order or ties argument is not modeled; the default is largest first, ties skip");
        const tv = tableOf(A[0], ctx);
        const vals = iterate(tv).map((rc) => ev(A[1], { ...ctx, rows: [...ctx.rows, rc] }));
        const mine = A[2] ? n(2) : ev(A[1], ctx);
        return 1 + vals.filter((v) => num(v, "RANKX") > num(mine, "RANKX")).length;
      }
    }
    throw new NotModeled(`${f}() is not in this model`);
  }

  return {
    // Add one lesson's definitions: columns are computed now, measures stored.
    define(code) {
      for (const d of definitions(code)) {
        if (d.measure) { measures.set(d.measure, d.ast); continue; }
        const t = table(d.table);
        const vals = t.rows.map((_, i) => ev(d.ast, { filters: [], rows: [{ kind: "phys", table: d.table, idx: i }], vars: new Map() }));
        if (!t.cols.includes(d.column)) t.cols.push(d.column);
        t.rows.forEach((r, i) => { r[d.column] = vals[i]; });
      }
    },
    measure: (name) => measures.has(name),
    evaluate(src, filters = []) { return ev(parse(src), { filters, rows: [], vars: new Map() }); },
    // A table visual: one row per value of the rows column (sorted, rows where every value is
    // blank hidden, as Power BI does), then the Total row, evaluated with no filter at all.
    visual({ rows, values }) {
      const [t, c] = /^(\w+)\[([^\]]+)\]$/.exec(rows).slice(1);
      colCheck(t, c);
      const keys = distinct(table(t).rows.map((r) => r[c])).sort((a, b) => (keyOf(a) < keyOf(b) ? -1 : 1));
      const run = (filters) => values.map((m) => { if (!measures.has(m)) throw new Error(`there is no measure [${m}]`); return calculate(measures.get(m), [], { filters, rows: [], vars: new Map() }); });
      const out = [];
      for (const k of keys) { const vs = run([{ kind: "col", table: t, col: c, values: new Set([keyOf(k)]) }]); if (vs.some((v) => !isBlank(v))) out.push([k, ...vs]); }
      out.push(["Total", ...run([])]);
      return { header: [c, ...values], rows: out };
    },
    columnRows({ table: t, columns, top }) {
      const tb = table(t); columns.forEach((c) => colCheck(t, c));
      return { header: columns, rows: tb.rows.slice(0, top).map((r) => columns.map((c) => r[c])) };
    },
  };
}

/* ---------- formatting ---------- */
// Power BI-style format strings used by the lessons: "0", "0.00", "#,0", "#,0.00", "$#,0", "$#,0.00", "0.0%".
export function format(v, fmt) {
  if (isBlank(v)) return "";
  if (v instanceof DT) return dtText(v);
  if (typeof v === "boolean") return v ? "True" : "False";
  if (typeof v === "string") return v;
  if (!fmt) return String(Number(v.toPrecision(12)));
  const m = /^(\$?)(#,)?0(?:\.(0+))?(%?)$/.exec(fmt);
  if (!m) throw new Error(`format "${fmt}" is not supported`);
  const dec = m[3] ? m[3].length : 0, x = m[4] ? v * 100 : v;
  // A value on an exact half at this precision (70.05 at one decimal) rounds differently in
  // different tools, so the lesson must show another decimal rather than rely on either rule.
  const scaled = Math.abs(x) * 10 ** dec;
  if (Math.abs(scaled - Math.floor(scaled) - 0.5) < 1e-6) throw new Error(`${v} is on a half at format "${fmt}"; show one more decimal`);
  const neg = x < 0, r = (Math.round(Math.abs(x) * 10 ** dec) / 10 ** dec).toFixed(dec);
  let [i, f] = r.split(".");
  if (m[2]) i = i.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (neg ? "-" : "") + m[1] + i + (f ? "." + f : "") + m[4];
}
export function renderTable({ header, rows }, formats = {}) {
  const cells = [header, ...rows.map((r) => r.map((v, i) => (i === 0 ? format(v) : format(v, formats[header[i]]))))];
  const w = header.map((_, i) => Math.max(...cells.map((r) => r[i].length)));
  // Numbers line up on the right, text on the left, as in a Power BI table.
  const right = header.map((_, i) => i > 0 && rows.every((r) => typeof r[i] === "number" || r[i] === BLANK));
  return cells.map((r) => r.map((s, i) => (right[i] ? s.padStart(w[i]) : s.padEnd(w[i]))).join("  ").trimEnd()).join("\n");
}
export { isBlank, dtFromText };
