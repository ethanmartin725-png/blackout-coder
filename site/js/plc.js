/* PLC interpreter for teaching: Rockwell-style ladder in neutral text. Pure code, no DOM.
   Used by the trainer (the ladder diagram, later the simulator), tools/verify.mjs and
   tools/output-checks/plc. Design, semantics and limits: docs/PLC_INTERPRETER.md.
   Not a PLC emulator and no safety meaning: a rung that behaves here proves nothing about a machine. */
(function (root) {
"use strict";

/* ---------- instruction set ---------- */
const ARITY = {
  XIC: 1, XIO: 1, OTE: 1, OTL: 1, OTU: 1, ONS: 1,
  TON: 3, TOF: 3, RTO: 3, CTU: 3, CTD: 3, RES: 1,
  MOV: 2, ADD: 3, SUB: 3, MUL: 3, DIV: 3, CPT: 2,
  GRT: 2, GEQ: 2, LES: 2, LEQ: 2, EQU: 2, NEQ: 2, LIM: 3,
};
const OPS = new Set(Object.keys(ARITY));

/* Behavior this model does not define yet. Raised instead of guessing (docs, open questions). */
class NotModeled extends Error {}

/* ---------- parser ---------- */
// One rung of neutral text -> { items, errors }. items is a sequence of instructions
// { op, args } and branches { br: 1, rows: [sequence, ...] }. The parse is best effort,
// so the diagram can draw a half-typed rung; errors says what is wrong, for the verifier.
function parseRung(text) {
  const errors = [];
  const top = { rows: [[]] }, stack = [top];
  let row = top.rows[0], i = 0, ended = false;
  const s = String(text);
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === ";") {
      ended = true; i++;
      if (s.slice(i).trim()) errors.push("text after the semicolon; put one rung per line");
      break;
    }
    const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i));
    if (!m) { errors.push(`unexpected "${ch}"`); i++; continue; }
    const word = m[0];
    i += word.length;
    if (word === "BST") { const b = { br: 1, rows: [[]] }; row.push(b); stack.push(b); row = b.rows[0]; continue; }
    if (word === "NXB") {
      const b = stack[stack.length - 1];
      if (b === top) errors.push("NXB outside a branch"); else { row = []; b.rows.push(row); }
      continue;
    }
    if (word === "BND") {
      if (stack.length === 1) errors.push("BND without a BST");
      else { stack.pop(); const t = stack[stack.length - 1]; row = t.rows[t.rows.length - 1]; }
      continue;
    }
    let args = [];
    while (i < s.length && /[ \t]/.test(s[i])) i++;
    if (s[i] === "(") {
      // Read to the matching ")", splitting on top-level commas. Nested parentheses belong
      // to the argument, so a CPT expression like (A+B)/C stays whole.
      let depth = 0, cur = "", j = i;
      const parts = [];
      for (; j < s.length; j++) {
        const c = s[j];
        if (c === "(") { depth++; if (depth === 1) continue; }
        else if (c === ")") { depth--; if (depth === 0) break; }
        else if (c === "," && depth === 1) { parts.push(cur.trim()); cur = ""; continue; }
        cur += c;
      }
      parts.push(cur.trim());
      if (depth !== 0) { errors.push(`${word}: missing )`); i = s.length; } else i = j + 1;
      args = parts.length === 1 && parts[0] === "" ? [] : parts;
    }
    if (!OPS.has(word)) { errors.push(`unknown instruction ${word}`); continue; }
    if (args.length !== ARITY[word]) errors.push(`${word} takes ${ARITY[word]} operand${ARITY[word] > 1 ? "s" : ""}, found ${args.length}`);
    if (args.some((a) => a === "")) errors.push(`${word}: empty operand`);
    row.push({ op: word, args });
  }
  if (stack.length > 1) errors.push("BST without a BND");
  if (!ended && s.trim()) errors.push("missing ; at the end of the rung");
  return { items: top.rows[0], errors };
}

// A routine: one rung per non-blank line.
function parseRoutine(code) {
  const rungs = [], errors = [];
  String(code).split("\n").forEach((line, n) => {
    if (!line.trim()) return;
    const r = parseRung(line);
    rungs.push({ items: r.items, line: n + 1 });
    for (const e of r.errors) errors.push({ line: n + 1, msg: e });
  });
  return { rungs, errors };
}

/* ---------- CPT expressions: + - * / and parentheses over numbers and tags ---------- */
function parseExpr(src) {
  const toks = String(src).match(/\d+\.\d+|\d+|[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z]+)?|[-+*/()]|\S/g) || [];
  let p = 0;
  const peek = () => toks[p], next = () => toks[p++];
  function primary() {
    const t = next();
    if (t === undefined) throw new Error(`expression ends early: ${src}`);
    if (t === "(") { const e = sum(); if (next() !== ")") throw new Error(`missing ) in ${src}`); return e; }
    if (t === "-") return { neg: primary() };
    if (/^\d/.test(t)) return { num: Number(t), real: t.includes(".") };
    if (/^[A-Za-z_]/.test(t)) return { tag: t };
    throw new Error(`unexpected "${t}" in ${src}`);
  }
  function product() { let e = primary(); while (peek() === "*" || peek() === "/") e = { op: next(), a: e, b: primary() }; return e; }
  function sum() { let e = product(); while (peek() === "+" || peek() === "-") e = { op: next(), a: e, b: product() }; return e; }
  const e = sum();
  if (p < toks.length) throw new Error(`unexpected "${toks[p]}" in ${src}`);
  return e;
}
const exprTags = (e) => e.tag ? [e.tag] : e.neg ? exprTags(e.neg) : e.op ? [...exprTags(e.a), ...exprTags(e.b)] : [];
const exprHasRealLiteral = (e) => e.num !== undefined ? e.real : e.neg ? exprHasRealLiteral(e.neg) : e.op ? exprHasRealLiteral(e.a) || exprHasRealLiteral(e.b) : false;

/* ---------- Structured Text parser (Studio 5000 subset) ---------- */
// Statements: assignment (:=), IF/ELSIF/ELSE/END_IF, CASE … OF … END_CASE with ranges, and the
// timer blocks TONR, TOFR, RTOR on FBD_TIMER tags. Expressions: OR, XOR, AND (&), NOT, = <> < >
// <= >=, + - * / MOD, unary minus, parentheses. Comments: (* *), /* */ and //.
// Keywords are case-insensitive, as in Logix; tag names are kept as written.
const ST_KW = new Set(["IF", "THEN", "ELSIF", "ELSE", "END_IF", "CASE", "OF", "END_CASE", "AND", "OR", "XOR", "NOT", "MOD"]);
const ST_FB = { TONR: "FBD_TIMER", TOFR: "FBD_TIMER", RTOR: "FBD_TIMER" };

function tokenizeST(src) {
  const toks = [], errors = [];
  const s = String(src);
  let i = 0, line = 1, m;
  while (i < s.length) {
    const c = s[i];
    if (c === "\n") { line++; i++; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (s.startsWith("(*", i) || s.startsWith("/*", i)) {
      const close = s.startsWith("(*", i) ? "*)" : "*/";
      const j = s.indexOf(close, i + 2), end = j < 0 ? s.length : j + 2;
      if (j < 0) errors.push({ line, msg: "a comment is never closed" });
      line += (s.slice(i, end).match(/\n/g) || []).length;
      i = end; continue;
    }
    if (s.startsWith("//", i)) { while (i < s.length && s[i] !== "\n") i++; continue; }
    if ((m = /^\d+\.\d+(?:[eE][-+]?\d+)?|^\d+/.exec(s.slice(i)))) { toks.push({ k: "num", v: m[0], line }); i += m[0].length; continue; }
    if ((m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i)))) {
      const up = m[0].toUpperCase();
      toks.push(ST_KW.has(up) ? { k: "kw", v: up, line } : { k: "id", v: m[0], line });
      i += m[0].length; continue;
    }
    const two = s.slice(i, i + 2);
    if ([":=", "<=", ">=", "<>", "..", "**"].includes(two)) { toks.push({ k: "op", v: two, line }); i += 2; continue; }
    if (c === "&") { toks.push({ k: "kw", v: "AND", line }); i++; continue; }
    if ("+-*/()=<>;:,.".includes(c)) { toks.push({ k: "op", v: c, line }); i++; continue; }
    errors.push({ line, msg: `unexpected "${c}"` }); i++;
  }
  return { toks, errors };
}

// Structured Text -> { stmts, errors }. Parsing stops at the first syntax error.
function parseST(src) {
  const { toks, errors } = tokenizeST(src);
  let p = 0;
  class Stop extends Error {}
  const at = (k, v) => { const t = toks[p]; return !!t && t.k === k && (v === undefined || t.v === v); };
  const isKw = (v) => at("kw", v), isOp = (v) => at("op", v);
  const where = () => (toks[p] ? ` before "${toks[p].v}"` : " at the end");
  const fail = (msg) => { const t = toks[Math.min(p, toks.length - 1)]; errors.push({ line: t ? t.line : 1, msg }); throw new Stop(); };
  const expectOp = (v) => { if (!isOp(v)) fail(`expected "${v}"${where()}`); p++; };
  const expectKw = (v) => { if (!isKw(v)) fail(`expected ${v}${where()}`); p++; };

  function path() {
    if (!at("id")) fail(`expected a tag name${where()}`);
    let name = toks[p++].v;
    if (isOp(".")) { p++; if (!at("id")) fail("expected a member name after ."); name += "." + toks[p++].v; }
    return name;
  }
  const LEVELS = [["OR"], ["XOR"], ["AND"], ["=", "<>"], ["<", ">", "<=", ">="], ["+", "-"], ["*", "/", "MOD"]];
  function binary(level) {
    if (level === LEVELS.length) return unary();
    let e = binary(level + 1);
    for (;;) {
      const t = toks[p];
      if (!t || (t.k !== "op" && t.k !== "kw") || !LEVELS[level].includes(t.v)) return e;
      p++;
      e = { op: t.v, a: e, b: binary(level + 1) };
    }
  }
  function unary() {
    if (isOp("-")) { p++; return { neg: unary() }; }
    if (isKw("NOT")) { p++; return { not: unary() }; }
    const e = primary();
    if (isOp("**")) fail("** is not supported");
    return e;
  }
  function primary() {
    const t = toks[p];
    if (!t) fail("the expression ends early");
    if (t.k === "num") { p++; return { num: Number(t.v), real: t.v.includes(".") }; }
    if (isOp("(")) { p++; const e = binary(0); expectOp(")"); return e; }
    if (t.k === "id") {
      if (toks[p + 1] && toks[p + 1].v === "(") fail(`function ${t.v}() is not supported in expressions`);
      return { tag: path() };
    }
    fail(`unexpected "${t.v}" in an expression`);
  }
  const block = (stop) => { const out = []; while (p < toks.length && !stop()) out.push(statement()); return out; };
  function caseNum() {
    let neg = false;
    if (isOp("-")) { p++; neg = true; }
    if (!at("num") || toks[p].v.includes(".")) fail(`CASE labels must be whole numbers${where()}`);
    const v = Number(toks[p++].v);
    return neg ? -v : v;
  }
  function statement() {
    const t = toks[p];
    if (isOp(";")) { p++; return { empty: 1 }; }
    if (isKw("IF")) {
      p++;
      const arms = [], endArm = () => isKw("ELSIF") || isKw("ELSE") || isKw("END_IF");
      let cond = binary(0); expectKw("THEN"); arms.push({ cond, body: block(endArm) });
      while (isKw("ELSIF")) { p++; cond = binary(0); expectKw("THEN"); arms.push({ cond, body: block(endArm) }); }
      let otherwise = [];
      if (isKw("ELSE")) { p++; otherwise = block(() => isKw("END_IF")); }
      expectKw("END_IF"); expectOp(";");
      return { ifArms: arms, otherwise, line: t.line };
    }
    if (isKw("CASE")) {
      p++;
      const sel = binary(0); expectKw("OF");
      const arms = [], atLabel = () => at("num") || (isOp("-") && toks[p + 1] && toks[p + 1].k === "num");
      while (atLabel()) {
        const labels = [];
        for (;;) {
          const lo = caseNum();
          let hi = lo;
          if (isOp("..")) { p++; hi = caseNum(); }
          labels.push([lo, hi]);
          if (isOp(",")) { p++; continue; }
          break;
        }
        expectOp(":");
        arms.push({ labels, body: block(() => atLabel() || isKw("ELSE") || isKw("END_CASE")) });
      }
      let otherwise = [];
      if (isKw("ELSE")) { p++; otherwise = block(() => isKw("END_CASE")); }
      expectKw("END_CASE"); expectOp(";");
      return { caseOf: sel, arms, otherwise, line: t.line };
    }
    if (t.k === "id" && toks[p + 1] && toks[p + 1].v === "(") {
      const fb = t.v.toUpperCase();
      if (!ST_FB[fb]) fail(`${t.v}() is not supported; the interpreter knows ${Object.keys(ST_FB).join(", ")}`);
      p += 2;
      const tag = path(); expectOp(")"); expectOp(";");
      return { fb, tag, line: t.line };
    }
    if (t.k === "id") {
      const target = path(); expectOp(":=");
      const value = binary(0); expectOp(";");
      return { set: target, value, line: t.line };
    }
    fail(`unexpected "${t.v}"`);
  }
  let stmts = [];
  if (!errors.length) {
    try { stmts = block(() => false); } catch (e) { if (!(e instanceof Stop)) throw e; }
  }
  return { stmts, errors };
}

/* ---------- runtime ---------- */
const DINT_MIN = -2147483648, DINT_MAX = 2147483647;
const STRUCT = {
  TIMER: () => ({ PRE: 0, ACC: 0, EN: 0, TT: 0, DN: 0 }),
  COUNTER: () => ({ PRE: 0, ACC: 0, CU: 0, CD: 0, DN: 0, OV: 0, UN: 0 }),
  // Structured Text timer block. EnableIn defaults to 1, as in Logix.
  FBD_TIMER: () => ({ EnableIn: 1, TimerEnable: 0, PRE: 0, Reset: 0, ACC: 0, EN: 0, TT: 0, DN: 0 }),
};
const NUMERIC_MEMBERS = new Set(["PRE", "ACC"]); // every other member is a bit
const isNum = (s) => /^[-+]?\d+(\.\d+)?$/.test(String(s).trim());

// Create a controller. opts.scanMs: simulated scan time (default 10 ms).
// opts.types: { tagName: "BOOL" | "DINT" | "REAL" | "TIMER" | "COUNTER" } for tags the code
// alone cannot type, e.g. a REAL analog input or a counter that is only read.
function createPLC(opts = {}) {
  const scanMs = opts.scanMs || 10;
  const tags = Object.create(null);
  let rungs = [], now = 0, scans = 0;
  const listeners = [];

  function declare(name, type) {
    const t = tags[name];
    if (!t) { tags[name] = { type, v: STRUCT[type] ? STRUCT[type]() : 0 }; return; }
    if (t.type === type) return;
    if (t.type === "DINT" && type === "REAL") { t.type = "REAL"; return; } // widen
    if (t.type === "REAL" && type === "DINT") return;
    throw new Error(`tag ${name} is used as both ${t.type} and ${type}`);
  }
  function notify(path, value) { for (const f of listeners) f(path, value); }

  function split(path) {
    const k = String(path).trim().indexOf(".");
    return k < 0 ? [String(path).trim(), null] : [String(path).trim().slice(0, k), String(path).trim().slice(k + 1)];
  }
  function read(x) {
    if (isNum(x)) return Number(x);
    const [n, m] = split(x);
    const t = tags[n];
    if (!t) throw new Error(`tag ${n} was never given a type`);
    if (m) {
      if (!STRUCT[t.type] || !(m in t.v)) throw new Error(`${n} (${t.type}) has no member .${m}`);
      return t.v[m];
    }
    if (STRUCT[t.type]) throw new Error(`${n} is a ${t.type}; read a member such as ${n}.DN`);
    return t.v;
  }
  function coerce(type, val, where) {
    if (type === "BOOL") return val ? 1 : 0;
    if (type === "REAL") return Math.fround(val);
    if (!Number.isFinite(val)) throw new NotModeled(`${where}: result is not a finite number (division by zero is not modeled)`);
    if (!Number.isInteger(val)) throw new NotModeled(`${where}: storing ${val} in a DINT needs Logix rounding rules, which are not modeled yet`);
    if (val < DINT_MIN || val > DINT_MAX) throw new NotModeled(`${where}: DINT overflow is not modeled`);
    return val;
  }
  function write(path, val) {
    const [n, m] = split(path);
    const t = tags[n];
    if (!t) throw new Error(`tag ${n} was never given a type`);
    if (m) {
      if (!STRUCT[t.type] || !(m in t.v)) throw new Error(`${n} (${t.type}) has no member .${m}`);
      const v = NUMERIC_MEMBERS.has(m) ? coerce("DINT", val, path) : (val ? 1 : 0);
      if (t.v[m] !== v) { t.v[m] = v; notify(`${n}.${m}`, v); }
      return;
    }
    if (STRUCT[t.type]) throw new Error(`cannot write a whole ${t.type} (${n})`);
    const v = coerce(t.type, val, n);
    if (t.v !== v) { t.v = v; notify(n, v); }
  }

  // Give every tag a type, from how the instructions use it (docs: Tags).
  function typeTags(program) {
    const all = [];
    const walk = (seq) => { for (const it of seq) it.br ? it.rows.forEach(walk) : all.push(it); };
    program.rungs.forEach((r) => walk(r.items));
    for (const [n, ty] of Object.entries(opts.types || {})) declare(n, ty);
    for (const it of all) {
      const a = it.args;
      if (["TON", "TOF", "RTO", "CTU", "CTD"].includes(it.op)) {
        declare(a[0], it.op.startsWith("CT") ? "COUNTER" : "TIMER");
        const t = tags[a[0]];
        if (isNum(a[1])) t.v.PRE = Number(a[1]);
        if (isNum(a[2])) t.v.ACC = Number(a[2]);
      }
    }
    for (const it of all) {
      const a = it.args;
      const bit = (x) => { if (!x.includes(".") && !isNum(x)) declare(x, "BOOL"); };
      if (["XIC", "XIO", "OTE", "OTL", "OTU", "ONS"].includes(it.op)) bit(a[0]);
    }
    const isReal = (x) => isNum(x) ? String(x).includes(".") : (() => { const [n] = split(x); return tags[n] && tags[n].type === "REAL"; })();
    const numeric = (x) => { if (!isNum(x) && !String(x).includes(".")) declare(x, "DINT"); };
    for (let pass = 0; pass < 3; pass++) {
      for (const it of all) {
        const a = it.args;
        if (["GRT", "GEQ", "LES", "LEQ", "EQU", "NEQ", "LIM"].includes(it.op)) a.forEach(numeric);
        if (it.op === "MOV") { numeric(a[0]); declare(a[1], isReal(a[0]) ? "REAL" : "DINT"); }
        if (["ADD", "SUB", "MUL", "DIV"].includes(it.op)) { numeric(a[0]); numeric(a[1]); declare(a[2], isReal(a[0]) || isReal(a[1]) ? "REAL" : "DINT"); }
        if (it.op === "CPT") {
          const e = it.expr || (it.expr = parseExpr(a[1]));
          exprTags(e).forEach((x) => { if (!x.includes(".")) numeric(x); });
          declare(a[0], exprHasRealLiteral(e) || exprTags(e).some(isReal) ? "REAL" : "DINT");
        }
      }
    }
    for (const it of all) if (it.op === "RES") {
      const t = tags[it.args[0]];
      if (!t || !STRUCT[t.type]) throw new Error(`RES(${it.args[0]}): ${it.args[0]} must be a timer or counter`);
    }
  }

  // Returns [value, isReal]. Integer-only division with a remainder is refused, not guessed.
  function evalExpr(e) {
    if (e.num !== undefined) return [e.num, e.real];
    if (e.tag) {
      const [n, m] = split(e.tag);
      return [read(e.tag), !m && tags[n] && tags[n].type === "REAL"];
    }
    if (e.neg) { const [v, r] = evalExpr(e.neg); return [-v, r]; }
    const [a, ra] = evalExpr(e.a), [b, rb] = evalExpr(e.b), real = ra || rb;
    if (e.op === "+") return [a + b, real];
    if (e.op === "-") return [a - b, real];
    if (e.op === "*") return [a * b, real];
    if (b === 0) throw new NotModeled("division by zero: Logix fault behavior not modeled");
    if (!real && a % b !== 0) throw new NotModeled("integer division with a remainder: Logix rules not modeled yet");
    return [a / b, real];
  }

  /* One instruction: rung-condition-in -> rung-condition-out (docs: Semantics). */
  function exec(it, rin) {
    const a = it.args, dt = scanMs;
    switch (it.op) {
      case "XIC": return rin && read(a[0]) !== 0;
      case "XIO": return rin && read(a[0]) === 0;
      case "OTE": write(a[0], rin ? 1 : 0); return rin;
      case "OTL": if (rin) write(a[0], 1); return rin;
      case "OTU": if (rin) write(a[0], 0); return rin;
      case "ONS": {
        if (!rin) { write(a[0], 0); return false; }
        if (read(a[0])) return false;
        write(a[0], 1); return true;
      }
      case "TON": case "RTO": {
        const n = a[0], t = tags[n].v;
        if (rin) {
          const was = t.EN;
          write(`${n}.EN`, 1);
          if (!t.DN) {
            if (was) write(`${n}.ACC`, t.ACC + dt);
            if (t.ACC >= t.PRE) write(`${n}.DN`, 1);
          }
          write(`${n}.TT`, t.DN ? 0 : 1);
        } else if (it.op === "TON") {
          write(`${n}.EN`, 0); write(`${n}.TT`, 0); write(`${n}.DN`, 0); write(`${n}.ACC`, 0);
        } else {
          write(`${n}.EN`, 0); write(`${n}.TT`, 0); // RTO keeps ACC and DN
        }
        return rin;
      }
      case "TOF": {
        const n = a[0], t = tags[n].v;
        if (rin) {
          write(`${n}.EN`, 1); write(`${n}.TT`, 0); write(`${n}.DN`, 1); write(`${n}.ACC`, 0);
        } else {
          const was = t.EN;
          write(`${n}.EN`, 0);
          if (t.DN) {
            if (!was) write(`${n}.ACC`, t.ACC + dt);
            if (t.ACC >= t.PRE) { write(`${n}.DN`, 0); write(`${n}.TT`, 0); } else write(`${n}.TT`, 1);
          } else write(`${n}.TT`, 0);
        }
        return rin;
      }
      case "CTU": case "CTD": {
        const n = a[0], c = tags[n].v, up = it.op === "CTU", edge = up ? "CU" : "CD";
        if (rin && !c[edge]) {
          if (up) {
            if (c.ACC === DINT_MAX) { write(`${n}.ACC`, DINT_MIN); write(`${n}.OV`, 1); } else write(`${n}.ACC`, c.ACC + 1);
          } else {
            if (c.ACC === DINT_MIN) { write(`${n}.ACC`, DINT_MAX); write(`${n}.UN`, 1); } else write(`${n}.ACC`, c.ACC - 1);
          }
        }
        write(`${n}.${edge}`, rin ? 1 : 0);
        write(`${n}.DN`, c.ACC >= c.PRE ? 1 : 0);
        return rin;
      }
      case "RES": {
        if (rin) {
          const n = a[0], t = tags[n];
          write(`${n}.ACC`, 0); write(`${n}.DN`, 0);
          if (t.type === "TIMER") { write(`${n}.EN`, 0); write(`${n}.TT`, 0); }
          else { write(`${n}.OV`, 0); write(`${n}.UN`, 0); } // .CU/.CD kept: open question in the docs
        }
        return rin;
      }
      case "GRT": return rin && read(a[0]) > read(a[1]);
      case "GEQ": return rin && read(a[0]) >= read(a[1]);
      case "LES": return rin && read(a[0]) < read(a[1]);
      case "LEQ": return rin && read(a[0]) <= read(a[1]);
      case "EQU": return rin && read(a[0]) === read(a[1]);
      case "NEQ": return rin && read(a[0]) !== read(a[1]);
      case "LIM": {
        if (!rin) return false;
        const lo = read(a[0]), x = read(a[1]), hi = read(a[2]);
        return lo <= hi ? lo <= x && x <= hi : x >= lo || x <= hi;
      }
      case "MOV": if (rin) write(a[1], read(a[0])); return rin;
      case "ADD": if (rin) write(a[2], read(a[0]) + read(a[1])); return rin;
      case "SUB": if (rin) write(a[2], read(a[0]) - read(a[1])); return rin;
      case "MUL": if (rin) write(a[2], read(a[0]) * read(a[1])); return rin;
      case "DIV": {
        if (!rin) return rin;
        const x = read(a[0]), y = read(a[1]);
        if (y === 0) throw new NotModeled("DIV by zero: Logix fault behavior not modeled");
        if (tags[split(a[2])[0]].type !== "REAL") throw new NotModeled("DIV into a DINT: Logix rounding rules not modeled yet");
        write(a[2], x / y);
        return rin;
      }
      case "CPT": if (rin) write(a[0], evalExpr(it.expr || (it.expr = parseExpr(a[1])))[0]); return rin;
    }
    throw new Error(`instruction ${it.op} has no behavior`);
  }
  function seq(items, rin) {
    let r = rin;
    for (const it of items) r = it.br ? branch(it, r) : exec(it, r);
    return r;
  }
  function branch(b, rin) {
    let out = false;
    for (const leg of b.rows) if (seq(leg, rin)) out = true; // every leg runs; no short circuit
    return out;
  }

  /* ---------- Structured Text: typing, expressions, statements ---------- */
  const walkST = (list, f) => {
    for (const s of list) {
      f(s);
      if (s.ifArms) { s.ifArms.forEach((a) => walkST(a.body, f)); walkST(s.otherwise, f); }
      if (s.arms) { s.arms.forEach((a) => walkST(a.body, f)); walkST(s.otherwise, f); }
    }
  };
  const BOOL_OPS = ["AND", "OR", "XOR", "=", "<>", "<", ">", "<=", ">="];
  function memberKind(path) {
    const [n, m] = split(path), t = tags[n];
    if (!t) return null;
    if (m) return NUMERIC_MEMBERS.has(m) ? "int" : "bool";
    return t.type === "BOOL" ? "bool" : t.type === "REAL" ? "real" : STRUCT[t.type] ? null : "int";
  }
  // Give every tag a type: timer blocks from their call, then each tag from its context
  // (a condition or AND/OR/NOT operand is a BOOL, a compared or calculated value is a DINT),
  // then assignment targets from their value.
  function typeST(stmts) {
    for (const [n, ty] of Object.entries(opts.types || {})) declare(n, ty);
    walkST(stmts, (s) => { if (s.fb) declare(s.tag, ST_FB[s.fb]); });
    const mark = (e, ctx) => {
      if (!e || e.num !== undefined) return;
      if (e.tag) { if (!e.tag.includes(".") && !tags[e.tag] && ctx) declare(e.tag, ctx === "bool" ? "BOOL" : "DINT"); return; }
      if (e.not) return mark(e.not, "bool");
      if (e.neg) return mark(e.neg, "num");
      const logical = ["AND", "OR", "XOR"].includes(e.op);
      mark(e.a, logical ? "bool" : "num"); mark(e.b, logical ? "bool" : "num");
    };
    const isBoolExpr = (e) => !!e.not || BOOL_OPS.includes(e.op) || (!!e.tag && memberKind(e.tag) === "bool");
    const isRealExpr = (e) => e.num !== undefined ? e.real : e.tag ? memberKind(e.tag) === "real"
      : e.neg ? isRealExpr(e.neg) : e.op && !isBoolExpr(e) ? isRealExpr(e.a) || isRealExpr(e.b) : false;
    for (let pass = 0; pass < 3; pass++) {
      walkST(stmts, (s) => {
        if (s.ifArms) s.ifArms.forEach((a) => mark(a.cond, "bool"));
        if (s.arms) mark(s.caseOf, "num");
        if (s.set) {
          // The value takes its context from the target: a bit member or BOOL makes it a
          // BOOL, a numeric member or number makes it a number. Untyped targets give none.
          const tk = memberKind(s.set);
          mark(s.value, tk === "bool" ? "bool" : tk ? "num" : null);
          if (s.set.includes(".")) return;
          if (isBoolExpr(s.value)) declare(s.set, "BOOL");
          else if (!(s.value.num !== undefined && !s.value.real)) declare(s.set, isRealExpr(s.value) ? "REAL" : "DINT");
        }
      });
    }
    // Still untyped and only ever given a whole number: a DINT.
    walkST(stmts, (s) => { if (s.set && !s.set.includes(".") && !tags[s.set]) declare(s.set, "DINT"); });
  }

  // Evaluate to [value, kind], kind "bool" | "int" | "real". Cases whose Logix rules are not
  // confirmed raise NotModeled instead of guessing.
  function evalST(e) {
    if (e.num !== undefined) return [e.num, e.real ? "real" : "int"];
    if (e.tag) {
      const k = memberKind(e.tag);
      if (!k) throw new Error(`${e.tag}: read a member such as ${e.tag}.DN`);
      return [read(e.tag), k];
    }
    if (e.not) {
      const [v, k] = evalST(e.not);
      if (k !== "bool") throw new NotModeled("NOT on a number is bitwise in Logix; not modeled yet");
      return [v ? 0 : 1, "bool"];
    }
    if (e.neg) {
      const [v, k] = evalST(e.neg);
      if (k === "bool") throw new NotModeled("minus on a BOOL is not modeled");
      return [-v, k];
    }
    const [a, ka] = evalST(e.a), [b, kb] = evalST(e.b);
    if (["AND", "OR", "XOR"].includes(e.op)) {
      if (ka !== "bool" || kb !== "bool") throw new NotModeled(`${e.op} on numbers is bitwise in Logix; not modeled yet`);
      const r = e.op === "AND" ? a && b : e.op === "OR" ? a || b : !!a !== !!b;
      return [r ? 1 : 0, "bool"];
    }
    if (BOOL_OPS.includes(e.op)) {
      const r = { "=": a === b, "<>": a !== b, "<": a < b, ">": a > b, "<=": a <= b, ">=": a >= b }[e.op];
      return [r ? 1 : 0, "bool"];
    }
    if (ka === "bool" || kb === "bool") throw new NotModeled("arithmetic on a BOOL is not modeled");
    const real = ka === "real" || kb === "real";
    if (e.op === "+") return [a + b, real ? "real" : "int"];
    if (e.op === "-") return [a - b, real ? "real" : "int"];
    if (e.op === "*") return [a * b, real ? "real" : "int"];
    if (b === 0) throw new NotModeled("division by zero: Logix fault behavior not modeled");
    if (e.op === "MOD") {
      if (real || a < 0 || b < 0) throw new NotModeled("MOD on REALs or negative numbers is not modeled");
      return [a % b, "int"];
    }
    if (!real && a % b !== 0) throw new NotModeled("integer division with a remainder: Logix rules not modeled yet");
    return [a / b, real ? "real" : "int"];
  }
  function assign(target, [v, k], line) {
    const kind = memberKind(target);
    if (kind === "bool" && !(k === "bool" || v === 0 || v === 1)) {
      throw new NotModeled(`line ${line}: assigning ${v} to a BOOL is not modeled (only 0 or 1)`);
    }
    write(target, v);
  }
  // Timer blocks on FBD_TIMER: same timing rules as TON / TOF / RTO in ladder.
  function fbTimer(kind, n) {
    const t = tags[n].v, dt = scanMs, W = (m, v) => write(`${n}.${m}`, v);
    if (!t.EnableIn) return;
    if (t.Reset) { W("ACC", 0); W("EN", 0); W("TT", 0); W("DN", 0); return; }
    if (kind === "TOFR") {
      if (t.TimerEnable) { W("EN", 1); W("TT", 0); W("DN", 1); W("ACC", 0); return; }
      const was = t.EN;
      W("EN", 0);
      if (t.DN) {
        if (!was) W("ACC", t.ACC + dt);
        if (t.ACC >= t.PRE) { W("DN", 0); W("TT", 0); } else W("TT", 1);
      } else W("TT", 0);
      return;
    }
    if (t.TimerEnable) {
      const was = t.EN;
      W("EN", 1);
      if (!t.DN) { if (was) W("ACC", t.ACC + dt); if (t.ACC >= t.PRE) W("DN", 1); }
      W("TT", t.DN ? 0 : 1);
    } else if (kind === "TONR") { W("EN", 0); W("TT", 0); W("DN", 0); W("ACC", 0); }
    else { W("EN", 0); W("TT", 0); } // RTOR keeps ACC and DN
  }
  function execST(list) {
    for (const s of list) {
      if (s.set) assign(s.set, evalST(s.value), s.line);
      else if (s.fb) fbTimer(s.fb, s.tag);
      else if (s.ifArms) {
        const arm = s.ifArms.find((a) => { const [v, k] = evalST(a.cond); if (k !== "bool") throw new NotModeled(`line ${s.line}: an IF condition must be true or false`); return v; });
        execST(arm ? arm.body : s.otherwise);
      } else if (s.arms) {
        const [v, k] = evalST(s.caseOf);
        if (k !== "int") throw new NotModeled(`line ${s.line}: CASE needs a whole-number selector`);
        const arm = s.arms.find((a) => a.labels.some(([lo, hi]) => v >= lo && v <= hi));
        execST(arm ? arm.body : s.otherwise);
      }
    }
  }

  let stProgram = null;
  return {
    scanMs,
    // lang: "ladder" (default) or "st". One routine per controller.
    load(code, lang = "ladder") {
      if (lang === "st") {
        const program = parseST(code);
        if (program.errors.length) throw new Error(program.errors.map((e) => `line ${e.line}: ${e.msg}`).join("; "));
        typeST(program.stmts);
        stProgram = program.stmts;
        return;
      }
      const program = parseRoutine(code);
      if (program.errors.length) throw new Error(program.errors.map((e) => `line ${e.line}: ${e.msg}`).join("; "));
      typeTags(program);
      rungs = program.rungs;
    },
    scan() {
      if (stProgram) execST(stProgram); else for (const r of rungs) seq(r.items, true);
      now += scanMs; scans++;
    },
    run(ms) { const n = Math.round(ms / scanMs); for (let k = 0; k < n; k++) this.scan(); },
    read, write,
    has: (name) => !!tags[split(name)[0]],
    typeOf: (name) => (tags[split(name)[0]] || {}).type,
    get time() { return now; },
    get scans() { return scans; },
    onChange(f) { listeners.push(f); },
  };
}

/* ---------- scenarios: generate a lesson's "What it produces" ---------- */
// REAL values print with 7 significant digits, close to how Studio 5000 shows them.
function formatValue(v, type) {
  if (type === "REAL") return String(Number(v.toPrecision(7)));
  return String(v);
}

// sim: { scanMs, types, start: {tag: value}, settleMs, steps: [step], watch: [tag] }
// step: { label, set: {tag: value}, pulse: {tag: value}, pulseMs, runMs, repeat }
//   set   holds its values from the start of the step
//   pulse holds its values for pulseMs (default 300), then puts the previous values back
//   runMs is how long one repetition lasts (default 1000); repeat runs it several times
// Each step prints its label and, in the order they happened, the watched tags that changed.
// Consecutive changes of the same tag show only the last value; a tag that ends where it
// started within such a run is dropped.
function runScenario(code, sim, lang = "ladder") {
  const plc = createPLC({ scanMs: sim.scanMs, types: sim.types });
  plc.load(code, lang);
  for (const w of sim.watch) if (!plc.has(w)) throw new Error(`watched tag ${w} is not used by the code`);
  const typeOf = (p) => { const t = plc.typeOf(p); return p.includes(".") ? (/(ACC|PRE)$/.test(p) ? "DINT" : "BOOL") : t; };
  const setAll = (vals) => { for (const [k, v] of Object.entries(vals || {})) { if (!plc.has(k)) throw new Error(`scenario sets ${k}, which the code never uses`); plc.write(k, v); } };
  setAll(sim.start);
  plc.run(sim.settleMs === undefined ? 100 : sim.settleMs);

  const watched = new Set(sim.watch);
  let events = [];
  plc.onChange((path, value) => { if (watched.has(path)) events.push([path, value]); });

  const lines = [];
  for (const st of sim.steps) {
    events = [];
    const before = {};
    for (const w of sim.watch) before[w] = plc.read(w);
    setAll(st.set);
    const reps = st.repeat || 1, runMs = st.runMs || 1000, pulseMs = st.pulseMs || 300;
    for (let k = 0; k < reps; k++) {
      if (st.pulse) {
        const prev = {};
        for (const p of Object.keys(st.pulse)) prev[p] = plc.read(p);
        setAll(st.pulse);
        plc.run(Math.min(pulseMs, runMs));
        setAll(prev);
        plc.run(runMs - Math.min(pulseMs, runMs));
      } else plc.run(runMs);
    }
    // collapse runs of the same tag; drop a run that ends where it started
    const out = [];
    let last = { ...before };
    for (const [p, v] of events) {
      if (out.length && out[out.length - 1][0] === p) out[out.length - 1][1] = v;
      else out.push([p, v, last[p]]);
      last[p] = v;
    }
    const shown = out.filter(([p, v, from]) => v !== from).map(([p, v]) => `${p}=${formatValue(v, typeOf(p))}`);
    lines.push([st.label, shown.length ? shown.join("  →  ") : "no change"]);
  }
  const w = Math.max(...lines.map((l) => l[0].length));
  return lines.map(([l, r]) => `${l.padEnd(w)}  →  ${r}`).join("\n");
}

root.BCplc = { OPS, ARITY, parseRung, parseRoutine, parseExpr, parseST, createPLC, runScenario, formatValue, NotModeled };
})(typeof globalThis !== "undefined" ? globalThis : this);
