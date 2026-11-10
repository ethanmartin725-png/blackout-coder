// Tests for the Power Query M teaching model (tools/output-checks/pq/mmodel.mjs), one per rule.
// Run by tools/verify.mjs; also runnable alone: node tools/pq-tests.mjs
import { createEngine, text, NotModeled, asTable } from "./output-checks/pq/mmodel.mjs";

export function runPqTests() {
  const fails = [];
  const t = (name, fn) => { try { const m = fn(); if (m) fails.push(`${name}: ${m}`); } catch (e) { fails.push(`${name}: threw ${e.message}`); } };
  const throws = (fn, txt, cls) => { try { fn(); return "no error"; } catch (e) { return (!cls || e instanceof cls) && e.message.includes(txt) ? "" : `wrong error: ${e.message}`; } };
  const snap = {
    f: { columns: ["id", "m", "mins", "start_ts"], rows: [[1, "A", 4, "2026-11-01 05:30:00"], [2, "A", 6, "2026-11-01 06:00:00"], [3, "B", 10, "2026-11-01 14:10:00"], [4, "B", 1, "2026-11-01 23:59:00"]] },
    d: { columns: ["m", "rate"], rows: [["A", 10], ["B", 20], ["C", 30]] },
  };
  const run = (queries, name) => { const e = createEngine(snap); for (const [n, src] of Object.entries(queries)) e.define(n, src); return e.run(name); };
  const NAV = 'Source = Sql.Database("s", "db")';
  const F = { f: `let ${NAV}, f = Source{[Schema = "dbo", Item = "f"]}[Data] in f` };
  const rows = (tb) => tb.rows.map((r) => tb.cols.map((c) => text(r[c])).join(":")).join(" ");

  t("navigation picks a table by schema and item", () => (run(F, "f").rows.length === 4 ? "" : "wrong rows"));
  t("a query can refer to another query by name", () => (run({ ...F, g: 'let S = f, B = Table.SelectRows(S, each [m] = "B") in B' }, "g").rows.map((r) => r.id).join() === "3,4" ? "" : "wrong rows"));
  t("Table.SelectRows with each and a field", () => {
    const got = rows(run({ ...F, g: "let S = Table.SelectRows(f, each [mins] >= 5) in S" }, "g"));
    return got === "2:A:6:2026-11-01 06:00:00 3:B:10:2026-11-01 14:10:00" ? "" : got;
  });
  t("a datetime window with and", () => {
    const got = run({ ...F, g: "let S = Table.SelectRows(f, each [start_ts] >= #datetime(2026, 11, 1, 6, 0, 0) and [start_ts] < #datetime(2026, 11, 1, 22, 0, 0)) in S" }, "g").rows.map((r) => r.id).join();
    return got === "2,3" ? "" : got;
  });
  t("Table.AddColumn with nested if, Time.Hour and Date.From", () => {
    const got = run({ ...F, g: 'let S = Table.AddColumn(f, "s", each if Time.Hour([start_ts]) >= 6 and Time.Hour([start_ts]) < 14 then "A" else if Time.Hour([start_ts]) >= 14 and Time.Hour([start_ts]) < 22 then "B" else "C"), D = Table.AddColumn(S, "sd", each Date.From([start_ts] - #duration(0, 6, 0, 0))) in Table.SelectColumns(D, {"id", "s", "sd"})' }, "g");
    return rows(got) === "1:C:2026-10-31 2:A:2026-11-01 3:B:2026-11-01 4:C:2026-11-01" ? "" : rows(got);
  });
  t("a date-time minus a date-time is a duration", () => {
    const got = run({ g: 'let L = {#datetime(2026, 1, 1, 6, 0, 0)}, T = Table.FromList(L, Splitter.SplitByNothing(), {"a"}), M = Table.AddColumn(T, "m", each Duration.TotalMinutes([a] - #datetime(2026, 1, 1, 5, 30, 30))) in M' }, "g");
    return got.rows[0].m === 29.5 ? "" : String(got.rows[0].m);
  });
  t("Table.Group: _ is the group's table, [col] its column as a list", () => {
    const got = rows(run({ ...F, g: 'let G = Table.Group(f, {"m"}, {{"n", each Table.RowCount(_), Int64.Type}, {"s", each List.Sum([mins]), type number}}) in G' }, "g"));
    return got === "A:2:10 B:2:11" ? "" : got;
  });
  t("Table.Sort descending", () => (rows(run({ ...F, g: 'let S = Table.Sort(Table.SelectColumns(f, {"id", "mins"}), {{"mins", Order.Descending}}) in S' }, "g")) === "3:10 2:6 1:4 4:1" ? "" : "wrong order"));
  t("a left outer join keeps unmatched rows as null", () => {
    const got = rows(run({ ...F, g: 'let G = Table.Group(f, {"m"}, {{"s", each List.Sum([mins])}}), J = Table.NestedJoin(Table.SelectColumns(Sql.Database("s", "db"){[Schema = "dbo", Item = "d"]}[Data], {"m"}), {"m"}, G, {"m"}, "x", JoinKind.LeftOuter), E = Table.ExpandTableColumn(J, "x", {"s"}) in E' }, "g"));
    return got === "A:10 B:11 C:null" ? "" : got;
  });
  t("other join kinds are refused", () => throws(() => run({ ...F, g: 'let J = Table.NestedJoin(f, {"m"}, f, {"m"}, "x", JoinKind.FullOuter) in J' }, "g"), "not modeled", NotModeled));
  const D = 'Table.SelectColumns(Sql.Database("s", "db"){[Schema = "dbo", Item = "d"]}[Data], {"m"})';
  t("an inner join keeps only rows with a match", () => {
    const got = run({ ...F, g: `let J = Table.NestedJoin(${D}, {"m"}, f, {"m"}, "x", JoinKind.Inner) in Table.SelectColumns(J, {"m"})` }, "g").rows.map((r) => r.m).join();
    return got === "A,B" ? "" : got;
  });
  t("a left anti join keeps only rows with no match", () => {
    const got = run({ ...F, g: `let J = Table.NestedJoin(${D}, {"m"}, f, {"m"}, "x", JoinKind.LeftAnti) in Table.SelectColumns(J, {"m"})` }, "g").rows.map((r) => r.m).join();
    return got === "C" ? "" : got;
  });
  const val = (src) => { const e = createEngine(snap); e.define("q", src); return e.value("q"); };
  t("Number.Round rounds half to even, as M does by default", () => {
    const got = val("let L = {Number.Round(0.5), Number.Round(1.5), Number.Round(2.5), Number.Round(3.5), Number.Round(87.049997, 2)} in L").join();
    return got === "0,2,2,4,87.05" ? "" : got;
  });
  t("a function with named parameters", () => (val("let Price = (rate, minutes) => minutes / 60 * rate, P = Price(60, 30) in P") === 30 ? "" : "wrong value"));
  t("calling a function with the wrong number of arguments is an M error", () => (val("let F = (a, b) => a + b, R = try F(1) otherwise -1 in R") === -1 ? "" : "not caught"));
  t("try … otherwise catches an M error", () => (val('let R = try Number.From("n/a") otherwise null, S = try Number.From("7.5") otherwise null in {R, S}').map(text).join() === "null,7.5" ? "" : "wrong"));
  t("try does not hide something the model cannot do", () => throws(() => val("let R = try Table.Pivot(1) otherwise 0 in R"), "not in this model", NotModeled));
  t("List.Count, Sum, Average, Max, Min and Distinct", () => {
    const got = val('let L = {3, 1, null, 3, 5} in {List.Count(L), List.Sum(L), List.Average(L), List.Max(L), List.Min(L), List.Count(List.Distinct(L))}').map(text).join();
    return got === "5,12,3,5,1,4" ? "" : got;
  });
  t("Table.FirstN, Distinct and Combine", () => {
    const a = run({ ...F, g: 'let S = Table.FirstN(Table.Distinct(Table.SelectColumns(f, {"m"})), 1), C = Table.Combine({S, Table.SelectColumns(f, {"id"})}) in C' }, "g");
    return a.cols.join() === "m,id" && a.rows.length === 5 && a.rows[0].m === "A" && a.rows[1].m === null ? "" : JSON.stringify(a.rows);
  });
  t("text and date functions", () => {
    const got = val('let D = #datetime(2026, 11, 7, 10, 9, 40) in {Text.Upper("jam"), Text.Start("Hoop Driver 1", 4), Text.From(87.05), Date.Year(D), Date.Month(D)}').map(text).join();
    return got === "JAM,Hoop,87.05,2026,11" ? "" : got;
  });
  t("a record previews as fields and a duration as d.hh:mm:ss", () => {
    const tb = asTable(val("let R = [Rate = 55, Down = #datetime(2026, 11, 7, 10, 17, 10) - #datetime(2026, 11, 7, 10, 9, 40)] in R"));
    const got = tb.rows.map((r) => r.Field + "=" + text(r.Value)).join();
    return got === "Rate=55,Down=0.00:07:30" ? "" : got;
  });
  t("List.Dates, Table.FromList and the day name", () => {
    const got = rows(run({ g: 'let L = List.Dates(#date(2026, 10, 31), 3, #duration(1, 0, 0, 0)), T = Table.FromList(L, Splitter.SplitByNothing(), {"Date"}), Y = Table.TransformColumnTypes(T, {{"Date", type date}}), N = Table.AddColumn(Y, "day", each Date.DayOfWeekName([Date])) in N' }, "g"));
    return got === "2026-10-31:Saturday 2026-11-01:Sunday 2026-11-02:Monday" ? "" : got;
  });
  t("comparing a date with a date-time is refused, as in M", () => throws(() => run({ ...F, g: "let S = Table.SelectRows(f, each [start_ts] >= #date(2026, 11, 1)) in S" }, "g"), "different types", NotModeled));
  t("if without else is a syntax error", () => throws(() => run({ g: "let x = if true then 1 in x" }, "g"), "else"));
  t("an unknown column names the ones that exist", () => throws(() => run({ ...F, g: "let S = Table.SelectColumns(f, {\"minutes\"}) in S" }, "g"), "has no column"));
  t("a function outside the model is refused", () => throws(() => run({ ...F, g: "let S = Table.Pivot(f) in S" }, "g"), "not in this model", NotModeled));
  t("a query that refers to itself is caught", () => throws(() => run({ g: "let S = g in S" }, "g"), "refers to itself"));
  return fails;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fails = runPqTests();
  for (const f of fails) console.error("FAIL  " + f);
  console.log(fails.length ? `${fails.length} M test(s) failed` : "All M model tests pass");
  process.exit(fails.length ? 1 : 0);
}
