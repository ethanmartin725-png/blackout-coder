// Instruction-level tests for site/js/plc.js. Each test pins one behavior from
// docs/PLC_INTERPRETER.md (Semantics). Run by tools/verify.mjs; also runnable alone:
//   node tools/plc-tests.mjs
// Returns a list of failure messages (empty when everything passes).

export function runPlcTests(P) {
  const fails = [];
  const t = (name, fn) => { try { const m = fn(); if (m) fails.push(`${name}: ${m}`); } catch (e) { fails.push(`${name}: threw ${e.message}`); } };
  const plc = (code, opts) => { const p = P.createPLC(opts); p.load(code); return p; };
  const eq = (p, path, want) => { const got = p.read(path); return got === want ? "" : `${path} is ${got}, expected ${want}`; };
  const all = (...ms) => ms.filter(Boolean).join("; ");

  // ---------- parser ----------
  t("parser accepts a nested branch", () => P.parseRung("BST XIC(A) NXB BST XIC(B) NXB XIC(C) BND BND OTE(D);").errors.join() || "");
  t("parser flags unknown instructions", () => P.parseRung("XYZ(A) OTE(B);").errors.length ? "" : "no error");
  t("parser flags a missing semicolon", () => P.parseRung("XIC(A) OTE(B)").errors.some((e) => e.includes(";")) ? "" : "no error");
  t("parser flags BST without BND", () => P.parseRung("BST XIC(A) NXB XIC(B) OTE(C);").errors.some((e) => e.includes("BND")) ? "" : "no error");
  t("parser flags the wrong operand count", () => P.parseRung("TON(T,1000);").errors.some((e) => e.includes("3 operands")) ? "" : "no error");
  t("parser keeps a CPT expression with parentheses whole", () => {
    const it = P.parseRung("CPT(X,(A+B)/C);").items[0];
    return it.args[1] === "(A+B)/C" ? "" : `got ${it.args[1]}`;
  });

  // ---------- bits ----------
  t("XIC/XIO in series are AND", () => {
    const p = plc("XIC(A) XIO(B) OTE(Y);");
    p.write("A", 1); p.scan(); const m1 = eq(p, "Y", 1);
    p.write("B", 1); p.scan(); return all(m1, eq(p, "Y", 0));
  });
  t("OTE writes 0 when its rung goes false", () => {
    const p = plc("XIC(A) OTE(Y);"); p.write("A", 1); p.scan(); p.write("A", 0); p.scan(); return eq(p, "Y", 0);
  });
  t("OTL holds after its rung goes false; OTU clears", () => {
    const p = plc("XIC(S) OTL(F);\nXIC(R) OTU(F);");
    p.write("S", 1); p.scan(); p.write("S", 0); p.scan(); const m1 = eq(p, "F", 1);
    p.write("R", 1); p.scan(); return all(m1, eq(p, "F", 0));
  });
  t("branch is OR and every leg runs", () => {
    const p = plc("BST XIC(A) NXB XIC(B) BND OTE(Y);");
    p.write("B", 1); p.scan(); return eq(p, "Y", 1);
  });
  t("output branch drives both outputs", () => {
    const p = plc("XIC(A) BST OTE(X) NXB OTE(Y) BND;");
    p.write("A", 1); p.scan(); return all(eq(p, "X", 1), eq(p, "Y", 1));
  });
  t("seal-in holds after Start is released", () => {
    const p = plc("BST XIC(Start) NXB XIC(Run) BND XIC(Stop) OTE(Run);");
    p.write("Stop", 1); p.write("Start", 1); p.scan(); p.write("Start", 0); p.scan(); const m1 = eq(p, "Run", 1);
    p.write("Stop", 0); p.scan(); return all(m1, eq(p, "Run", 0));
  });
  t("tags update immediately: a later rung sees an earlier rung's write in the same scan", () => {
    const p = plc("XIC(A) OTE(B);\nXIC(B) OTE(C);"); p.write("A", 1); p.scan(); return eq(p, "C", 1);
  });
  t("later rung wins when two rungs write the same tag", () => {
    const p = plc("XIC(A) MOV(1,S);\nXIC(B) MOV(2,S);"); p.write("A", 1); p.write("B", 1); p.scan(); return eq(p, "S", 2);
  });
  t("ONS is true for exactly one scan per rising edge", () => {
    const p = plc("XIC(PB) ONS(PB_ONS) ADD(N,1,N);");
    p.write("PB", 1); for (let k = 0; k < 50; k++) p.scan(); const m1 = eq(p, "N", 1);
    p.write("PB", 0); p.scan(); p.write("PB", 1); p.scan(); return all(m1, eq(p, "N", 2));
  });
  t("without ONS, ADD adds on every scan", () => {
    const p = plc("XIC(PB) ADD(N,1,N);"); p.write("PB", 1); for (let k = 0; k < 50; k++) p.scan(); return eq(p, "N", 50);
  });

  // ---------- timers (10 ms scans) ----------
  t("TON: DN exactly 4.00 s after the rung goes true", () => {
    const p = plc("XIC(A) TON(T,4000,0);"); p.write("A", 1);
    p.run(4000); const m1 = eq(p, "T.DN", 0); // scans at 0..3990 ms: ACC reaches 3990
    p.scan(); return all(m1, eq(p, "T.DN", 1), eq(p, "T.ACC", 4000));
  });
  t("TON resets ACC and DN when the rung goes false", () => {
    const p = plc("XIC(A) TON(T,1000,0);"); p.write("A", 1); p.run(2000); p.write("A", 0); p.scan();
    return all(eq(p, "T.DN", 0), eq(p, "T.ACC", 0), eq(p, "T.EN", 0));
  });
  t("TOF: DN on while true, off 30.00 s after the rung goes false", () => {
    const p = plc("XIC(A) TOF(T,30000,0);"); p.write("A", 1); p.scan(); const m1 = eq(p, "T.DN", 1);
    p.write("A", 0); p.run(30000); const m2 = eq(p, "T.DN", 1);
    p.scan(); return all(m1, m2, eq(p, "T.DN", 0));
  });
  t("TOF never energized stays off", () => { const p = plc("XIC(A) TOF(T,1000,0);"); p.run(2000); return eq(p, "T.DN", 0); });
  t("RTO keeps ACC while the rung is false", () => {
    const p = plc("XIC(A) RTO(T,10000,0);");
    p.write("A", 1); p.run(3000); p.write("A", 0); p.run(5000); const m1 = eq(p, "T.ACC", 2990);
    p.write("A", 1); p.run(8000); return all(m1, eq(p, "T.DN", 1));
  });
  t("RES clears a timer", () => {
    const p = plc("XIC(A) RTO(T,1000,0);\nXIC(R) RES(T);"); p.write("A", 1); p.run(2000); p.write("A", 0); p.write("R", 1); p.scan();
    return all(eq(p, "T.ACC", 0), eq(p, "T.DN", 0));
  });

  // ---------- counters ----------
  t("CTU counts the false-to-true edge, not every scan", () => {
    const p = plc("XIC(Eye) CTU(C,100,0);"); p.write("Eye", 1); p.run(5000); const m1 = eq(p, "C.ACC", 1);
    p.write("Eye", 0); p.scan(); p.write("Eye", 1); p.scan(); return all(m1, eq(p, "C.ACC", 2));
  });
  t("CTU sets DN at the preset", () => {
    const p = plc("XIC(Eye) CTU(C,3,0);");
    for (let k = 0; k < 3; k++) { p.write("Eye", 1); p.scan(); p.write("Eye", 0); p.scan(); }
    return eq(p, "C.DN", 1);
  });
  t("CTU and CTD share one accumulator", () => {
    const p = plc("XIC(In) CTU(W,12,0);\nXIC(Out) CTD(W,12,0);");
    for (let k = 0; k < 5; k++) { p.write("In", 1); p.scan(); p.write("In", 0); p.scan(); }
    for (let k = 0; k < 2; k++) { p.write("Out", 1); p.scan(); p.write("Out", 0); p.scan(); }
    return eq(p, "W.ACC", 3);
  });
  t("RES clears a counter's ACC and DN", () => {
    const p = plc("XIC(Eye) CTU(C,1,0);\nXIC(R) RES(C);");
    p.write("Eye", 1); p.scan(); p.write("Eye", 0); p.write("R", 1); p.scan(); return all(eq(p, "C.ACC", 0), eq(p, "C.DN", 0));
  });

  // ---------- compare and math ----------
  t("LES with a REAL tag", () => {
    const p = plc("LES(PSI,80) OTE(Low);", { types: { PSI: "REAL" } });
    p.write("PSI", 79.5); p.scan(); const m1 = eq(p, "Low", 1); p.write("PSI", 80); p.scan(); return all(m1, eq(p, "Low", 0));
  });
  t("LIM includes both ends of the band", () => {
    const p = plc("LIM(85,PSI,110) OTE(Ok);", { types: { PSI: "REAL" } });
    const at = (v) => { p.write("PSI", v); p.scan(); return p.read("Ok"); };
    const got = [at(84.9), at(85), at(110), at(110.1)].join("");
    return got === "0110" ? "" : `in-band pattern ${got}, expected 0110`;
  });
  t("LIM with low above high is true outside the band", () => {
    const p = plc("LIM(110,PSI,85) OTE(Out);", { types: { PSI: "REAL" } });
    p.write("PSI", 100); p.scan(); const m1 = eq(p, "Out", 0); p.write("PSI", 120); p.scan(); return all(m1, eq(p, "Out", 1));
  });
  t("MOV and EQU", () => {
    const p = plc("XIC(Sel) MOV(53,Size);\nEQU(Size,53) OTE(Big);"); p.write("Sel", 1); p.scan(); return all(eq(p, "Size", 53), eq(p, "Big", 1));
  });
  t("CPT computes in REAL when a literal has a decimal point", () => {
    const p = plc("XIC(Go) CPT(Rate,Count*60.0/Minutes);"); p.write("Count", 352); p.write("Minutes", 450); p.write("Go", 1); p.scan();
    return Math.abs(p.read("Rate") - 46.9333) < 0.001 ? "" : `Rate is ${p.read("Rate")}`;
  });
  t("REAL tags have 32-bit precision", () => {
    const p = plc("XIC(Go) CPT(X,0.1+0.2);"); p.write("Go", 1); p.scan(); return p.read("X") === Math.fround(0.3) ? "" : `X is ${p.read("X")}`;
  });
  t("integer division with a remainder is refused, not guessed", () => {
    const p = plc("XIC(Go) CPT(X,7/2);"); p.write("Go", 1);
    try { p.scan(); return "no error"; } catch (e) { return e instanceof P.NotModeled ? "" : `wrong error: ${e.message}`; }
  });
  t("a tag used as two types is an error", () => {
    try { plc("XIC(A) OTE(B);\nXIC(Go) MOV(5,A);"); return "no error"; } catch (e) { return e.message.includes("both") ? "" : e.message; }
  });

  // ---------- scenarios ----------
  t("scenario collapses repeated changes and orders the rest by time", () => {
    const out = P.runScenario("XIC(Eye) CTU(C,3,0);\nXIC(C.DN) OTE(Full);", {
      watch: ["C.ACC", "Full"], steps: [{ label: "3 barrels", pulse: { Eye: 1 }, runMs: 600, repeat: 3 }],
    });
    return out === "3 barrels  →  C.ACC=3  →  Full=1" ? "" : `got "${out}"`;
  });
  // ---------- Structured Text ----------
  const st = (code, opts) => { const p = P.createPLC(opts); p.load(code, "st"); return p; };
  t("ST parses comments of all three kinds", () => P.parseST("(* a *) A := B; /* b */ // c\nC := A;").errors.map((e) => e.msg).join() || "");
  t("ST flags a missing END_IF", () => P.parseST("IF A THEN B := 1;").errors.some((e) => e.msg.includes("END_IF")) ? "" : "no error");
  t("ST flags a missing semicolon", () => P.parseST("A := B").errors.length ? "" : "no error");
  t("ST refuses an unknown function block", () => P.parseST("CTUD(C);").errors.length ? "" : "no error");
  t("ST AND / OR / NOT and parentheses", () => {
    const p = st("Y := (A OR B) AND NOT C;"); p.write("B", 1); p.scan(); const m1 = eq(p, "Y", 1);
    p.write("C", 1); p.scan(); return all(m1, eq(p, "Y", 0));
  });
  t("ST & is AND; keywords are case-insensitive", () => { const p = st("y := a & b;\nif y then z := 1; end_if;"); p.write("a", 1); p.write("b", 1); p.scan(); return eq(p, "z", 1); });
  t("ST seal-in matches the ladder seal-in, scan for scan", () => {
    const lad = P.runScenario("BST XIC(Start) NXB XIC(Run) BND XIC(Stop) OTE(Run);", seal);
    const stt = P.runScenario("Run := (Start OR Run) AND Stop;", seal, "st");
    return lad === stt ? "" : `ladder:\n${lad}\nST:\n${stt}`;
  });
  t("ST IF / ELSIF / ELSE: the first true arm wins", () => {
    const p = st("IF Jam THEN S := 2;\nELSIF Run THEN S := 1;\nELSE S := 3;\nEND_IF;");
    p.scan(); const m1 = eq(p, "S", 3); p.write("Run", 1); p.scan(); const m2 = eq(p, "S", 1);
    p.write("Jam", 1); p.scan(); return all(m1, m2, eq(p, "S", 2));
  });
  t("ST CASE with a list, a range and ELSE", () => {
    const p = st("CASE S OF\n1: L := 10;\n2, 3: L := 20;\n4..6: L := 30;\nELSE L := 0;\nEND_CASE;");
    const at = (v) => { p.write("S", v); p.scan(); return p.read("L"); };
    const got = [at(1), at(3), at(5), at(9)].join(",");
    return got === "10,20,30,0" ? "" : `got ${got}`;
  });
  t("ST TONR: DN exactly 4.00 s after TimerEnable, reset when disabled", () => {
    const p = st("T.PRE := 4000;\nT.TimerEnable := A;\nTONR(T);");
    p.write("A", 1); p.run(4000); const m1 = eq(p, "T.DN", 0); p.scan(); const m2 = eq(p, "T.DN", 1);
    p.write("A", 0); p.scan(); return all(m1, m2, eq(p, "T.DN", 0), eq(p, "T.ACC", 0));
  });
  t("ST TOFR: DN off 30.00 s after TimerEnable drops", () => {
    const p = st("T.PRE := 30000;\nT.TimerEnable := A;\nTOFR(T);");
    p.write("A", 1); p.scan(); p.write("A", 0); p.run(30000); const m1 = eq(p, "T.DN", 1); p.scan(); return all(m1, eq(p, "T.DN", 0));
  });
  t("ST RTOR keeps ACC; Reset clears it", () => {
    const p = st("T.PRE := 10000;\nT.TimerEnable := A;\nT.Reset := R;\nRTOR(T);");
    p.write("A", 1); p.run(3000); p.write("A", 0); p.run(1000); const m1 = eq(p, "T.ACC", 2990);
    p.write("R", 1); p.scan(); return all(m1, eq(p, "T.ACC", 0));
  });
  t("ST REAL math and comparison", () => {
    const p = st("Rate := Count * 60.0 / Minutes;\nBehind := Rate < 50.0;"); p.write("Count", 352); p.write("Minutes", 450); p.scan();
    return all(Math.abs(p.read("Rate") - 46.9333) < 0.001 ? "" : `Rate is ${p.read("Rate")}`, eq(p, "Behind", 1));
  });
  t("ST refuses AND on numbers (bitwise in Logix)", () => {
    const p = st("X := A + 1;\nY := X AND 3;");
    try { p.scan(); return "no error"; } catch (e) { return e instanceof P.NotModeled ? "" : `wrong error: ${e.message}`; }
  });
  t("ST refuses integer division with a remainder", () => {
    const p = st("X := 7;\nY := X / 2;");
    try { p.scan(); return "no error"; } catch (e) { return e instanceof P.NotModeled ? "" : `wrong error: ${e.message}`; }
  });
  return fails;
}
const seal = {
  start: { Stop: 1 }, watch: ["Run"],
  steps: [{ label: "Press Start", set: { Start: 1 } }, { label: "Release Start", set: { Start: 0 } }, { label: "Press Stop", pulse: { Stop: 0 } }],
};

// Standalone: node tools/plc-tests.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
  const { createRequire } = await import("node:module");
  const path = await import("node:path");
  const require = createRequire(import.meta.url);
  require(path.resolve(path.dirname(new URL(import.meta.url).pathname), "../site/js/plc.js"));
  const fails = runPlcTests(globalThis.BCplc);
  for (const f of fails) console.error("FAIL  " + f);
  console.log(fails.length ? `${fails.length} PLC test(s) failed` : "All PLC tests pass");
  process.exit(fails.length ? 1 : 0);
}
