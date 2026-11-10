// Tests for the DAX teaching model (tools/output-checks/dax/model.mjs), one per rule it claims.
// Run by tools/verify.mjs; also runnable alone: node tools/dax-tests.mjs
import { createModel, format, NotModeled, BLANK } from "./output-checks/dax/model.mjs";

export function runDaxTests() {
  const fails = [];
  const t = (name, fn) => { try { const m = fn(); if (m) fails.push(`${name}: ${m}`); } catch (e) { fails.push(`${name}: threw ${e.message}`); } };
  const throws = (fn, text, cls) => { try { fn(); return "no error"; } catch (e) { return (!cls || e instanceof cls) && e.message.includes(text) ? "" : `wrong error: ${e.message}`; } };
  // Two machines, five faults. A has rate 10, B rate 20.
  const snap = () => ({
    dim: { columns: ["m", "rate"], rows: [["A", 10], ["B", 20]] },
    fact: { columns: ["id", "m", "kind", "mins", "ts"], rows: [[1, "A", "Jam", 4, "2026-11-01 06:00:00"], [2, "A", "Air", 6, "2026-11-02 06:00:00"], [3, "B", "Jam", 10, "2026-11-03 06:00:00"], [4, "B", "Jam", 1, "2026-11-04 06:00:00"], [5, "B", "Air", 3, "2026-11-05 06:00:00"]] },
  });
  const model = (code) => { const m = createModel(snap(), [["fact", "m", "dim", "m"]]); m.define(code); return m; };
  const vis = (m, rows, values) => m.visual({ rows, values }).rows.map((r) => r.map((v) => (v === BLANK ? "_" : v)).join(":")).join(" ");

  t("each visual row is filtered by its value; the Total row has no filter", () => {
    const got = vis(model("Mins = SUM(fact[mins])"), "dim[m]", ["Mins"]);
    return got === "A:10 B:14 Total:24" ? "" : got;
  });
  t("a filter on the one side reaches the many side, not the other way", () => {
    const m = model("Machines = COUNTROWS(dim)\nJam Machines = CALCULATE([Machines], fact[kind] = \"Jam\")");
    return m.evaluate("[Jam Machines]") === 2 ? "" : "a fact column filter reached dim";
  });
  t("a CALCULATE condition replaces the visual's filter on the same column", () => {
    const got = vis(model("Mins = SUM(fact[mins])\nJam Mins = CALCULATE([Mins], fact[kind] = \"Jam\")"), "fact[kind]", ["Mins", "Jam Mins"]);
    return got === "Air:9:15 Jam:15:15 Total:24:15" ? "" : got;
  });
  t("two conditions on one column both apply", () => {
    const m = model("Mins = SUM(fact[mins])\nMid = CALCULATE([Mins], fact[mins] > 2, fact[mins] < 10)");
    return m.evaluate("[Mid]") === 13 ? "" : String(m.evaluate("[Mid]"));
  });
  t("ALL(column) removes that column's filter", () => {
    const got = vis(model("Mins = SUM(fact[mins])\nShare = DIVIDE([Mins], CALCULATE([Mins], ALL(fact[kind])))"), "fact[kind]", ["Share"]);
    return got === "Air:0.375 Jam:0.625 Total:1" ? "" : got;
  });
  t("ALL(fact) also removes filters on the tables fact expands to", () => {
    const got = vis(model("Mins = SUM(fact[mins])\nAll Mins = CALCULATE([Mins], ALL(fact))"), "dim[m]", ["All Mins"]);
    return got === "A:24 B:24 Total:24" ? "" : got;
  });
  t("context transition: a measure inside SUMX sees one row", () => {
    const got = vis(model("Mins = SUM(fact[mins])\nBy Machine = SUMX(dim, [Mins] * dim[rate])"), "dim[m]", ["By Machine"]);
    return got === "A:100 B:280 Total:380" ? "" : got;
  });
  t("no context transition without a measure or CALCULATE", () => {
    const got = vis(model("No Transition = SUMX(dim, SUM(fact[mins]))"), "dim[m]", ["No Transition"]);
    return got === "A:10 B:14 Total:48" ? "" : got;
  });
  t("a Total row is recalculated, not added up", () => {
    const got = vis(model("Mins = SUM(fact[mins])\nFaults = COUNTROWS(fact)\nAvg = DIVIDE([Mins], [Faults])"), "dim[m]", ["Avg"]);
    return got === "A:5 B:4.666666666666667 Total:4.8" ? "" : got;
  });
  t("rows where every value is blank are hidden", () => {
    const got = vis(model("Big = CALCULATE(SUM(fact[mins]), fact[mins] >= 7)"), "dim[m]", ["Big"]);
    return got === "B:10 Total:10" ? "" : got;
  });
  t("a condition on the visual's own column overrides it on every row", () => {
    const got = vis(model("Air Mins = CALCULATE(SUM(fact[mins]), fact[kind] = \"Air\")\nA Only = CALCULATE([Air Mins], dim[m] = \"A\")"), "dim[m]", ["A Only"]);
    return got === "A:6 B:6 Total:6" ? "" : got;
  });
  t("DIVIDE gives blank, or the alternate, for a zero or blank divisor", () => {
    const m = model("Z = DIVIDE(5, 0)\nAlt = DIVIDE(5, BLANK(), -1)");
    return m.evaluate("[Z]") === BLANK && m.evaluate("[Alt]") === -1 ? "" : "wrong";
  });
  t("/ by zero is refused: DAX gives infinity", () => throws(() => model("Bad = 5 / 0").evaluate("[Bad]"), "use DIVIDE", NotModeled));
  t("BLANK: + treats it as 0, * keeps it blank", () => {
    const m = model("P = BLANK() + 3\nT = BLANK() * 3");
    return m.evaluate("[P]") === 3 && m.evaluate("[T]") === BLANK ? "" : "wrong";
  });
  t("SUM over no rows is blank, not 0", () => (model("None = CALCULATE(SUM(fact[mins]), fact[kind] = \"Fire\")").evaluate("[None]") === BLANK ? "" : "not blank"));
  t("a variable is computed once, where it is defined", () => {
    const m = model("Mins = SUM(fact[mins])\nV = VAR x = [Mins] RETURN CALCULATE(x, fact[kind] = \"Air\")");
    return m.evaluate("[V]") === 24 ? "" : String(m.evaluate("[V]"));
  });
  t("a measure inside a CALCULATE condition is refused", () => throws(() => model("Mins = SUM(fact[mins])\nBad = CALCULATE([Mins], fact[mins] > [Mins])").evaluate("[Bad]"), "measure inside a CALCULATE condition", NotModeled));
  t("FILTER keeps rows; the table filter applies to its table", () => {
    const got = vis(model("Mins = SUM(fact[mins])\nShort = CALCULATE([Mins], FILTER(fact, fact[mins] < 5))"), "dim[m]", ["Short"]);
    return got === "A:4 B:4 Total:8" ? "" : got;
  });
  t("reading the dimension under a fact-table filter is refused (expanded tables)", () => throws(() => model("Bad = CALCULATE(COUNTROWS(dim), FILTER(fact, fact[mins] < 5))").evaluate("[Bad]"), "expanded tables", NotModeled));
  t("RELATED follows the row to its dimension", () => (model("R = SUMX(fact, fact[mins] * RELATED(dim[rate]))").evaluate("[R]") === 4 * 10 + 6 * 10 + 14 * 20 ? "" : "wrong"));
  t("a calculated column is computed row by row", () => {
    const m = model("fact[long] = IF(fact[mins] >= 5, 1, 0)\nLong = SUM(fact[long])");
    return m.evaluate("[Long]") === 2 ? "" : String(m.evaluate("[Long]"));
  });
  t("RANKX ranks largest first; ties share a rank and skip the next", () => {
    const got = vis(model("Faults = COUNTROWS(fact)\nRank = RANKX(ALL(fact[kind]), [Faults])"), "fact[kind]", ["Rank"]);
    return got === "Air:2 Jam:1 Total:1" ? "" : got;
  });
  t("HASONEVALUE is false on the Total row", () => {
    const got = vis(model("One = IF(HASONEVALUE(dim[m]), 1, 0)"), "dim[m]", ["One"]);
    return got === "A:1 B:1 Total:0" ? "" : got;
  });
  t("VALUES gives the visible values; AVERAGEX averages per value", () => {
    const got = vis(model("Mins = SUM(fact[mins])\nAvg Machine = AVERAGEX(VALUES(dim[m]), [Mins])"), "dim[m]", ["Avg Machine"]);
    return got === "A:10 B:14 Total:12" ? "" : got;
  });
  t("SWITCH(TRUE(), …) returns the first true branch", () => {
    const got = vis(model("Mins = SUM(fact[mins])\nBand = SWITCH(TRUE(), [Mins] >= 20, \"high\", [Mins] >= 12, \"mid\", \"low\")"), "dim[m]", ["Band"]);
    return got === "A:low B:mid Total:high" ? "" : got;
  });
  t("DATEDIFF counts boundaries crossed", () => {
    const m = model("S = DATEDIFF(DATE(2026,11,1) + TIME(6,0,59), DATE(2026,11,1) + TIME(6,1,0), MINUTE)");
    return m.evaluate("[S]") === 1 ? "" : String(m.evaluate("[S]"));
  });
  t("a condition on dates compares the instant", () => (model("Late = CALCULATE(COUNTROWS(fact), fact[ts] >= DATE(2026,11,3) + TIME(6,0,0))").evaluate("[Late]") === 3 ? "" : "wrong"));
  t("formats: percent, thousands, currency", () => [format(0.7381, "0.0%"), format(251876.4, "$#,0"), format(20510, "#,0"), format(87.049997, "0.00")].join(" ") === "73.8% $251,876 20,510 87.05" ? "" : "wrong");
  t("a value on an exact half is refused rather than rounded one way", () => throws(() => format(70.05, "0.0"), "on a half"));
  t("a function outside the model is refused", () => throws(() => model("X = TOTALYTD(1, 2)").evaluate("[X]"), "not in this model", NotModeled));
  return fails;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fails = runDaxTests();
  for (const f of fails) console.error("FAIL  " + f);
  console.log(fails.length ? `${fails.length} DAX test(s) failed` : "All DAX model tests pass");
  process.exit(fails.length ? 1 : 0);
}
