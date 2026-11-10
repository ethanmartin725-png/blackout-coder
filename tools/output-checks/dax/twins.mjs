// The SQL twin of every DAX lesson: the same question asked of SQL Server, in plain T-SQL. run.mjs
// runs them on the real PlantDB and fails if any number differs from the DAX model's (beyond the
// six-decimal rounding of minutes). Each returns the visual's rows: key, then each value in order,
// sorted by key, then the Total row. Totals are written the way DAX computes them: a ratio is
// recalculated from pooled numbers, a SUMX is a sum of per-machine values.

const NOW = "'2026-11-07 10:15'", WS = "'2026-10-31 06:00'", WE = "'2026-11-07 06:00'";
const FM = `SELECT fault_id, machine, fault, start_ts, CAST(DATEDIFF(SECOND, start_ts, ISNULL(end_ts, ${NOW})) AS FLOAT) / 60 AS minutes FROM fault_log`;
// Rows then a Total row: perRow selects k plus cols; total selects cols.
const withTotal = (cols, perRow, total, ctes = "") =>
  `${ctes} SELECT k, ${cols} FROM (SELECT k, ${cols}, 0 AS o FROM (${perRow}) a UNION ALL SELECT 'Total', ${cols}, 1 FROM (${total}) b) t ORDER BY o, k`;

// One row per machine with the OEE week's figures, as FLOATs.
const OEE_CTES = `WITH fm AS (${FM}),
down AS (SELECT machine, SUM(minutes) AS down_min FROM fm WHERE start_ts >= ${WS} AND start_ts < ${WE} GROUP BY machine),
made AS (SELECT machine, SUM(made_this_hour) AS barrels FROM v_hourly_barrels WHERE ts > ${WS} AND ts <= ${WE} GROUP BY machine),
rej AS (SELECT machine, SUM(qty) AS rejects FROM reject_log WHERE ts >= ${WS} AND ts < ${WE} GROUP BY machine),
b AS (SELECT m.machine AS k, CAST(m.ideal_rate_hr AS FLOAT) AS rate, CAST(m.margin_per_barrel AS FLOAT) AS margin, 9450.0 AS planned,
        ISNULL(d.down_min, 0) AS down_min, CAST(ISNULL(c.barrels, 0) AS FLOAT) AS barrels, CAST(ISNULL(r.rejects, 0) AS FLOAT) AS rejects
      FROM dim_machine AS m LEFT JOIN down AS d ON d.machine = m.machine LEFT JOIN made AS c ON c.machine = m.machine LEFT JOIN rej AS r ON r.machine = m.machine),
x AS (SELECT *, (planned - down_min) / 60 * rate AS ideal FROM b),
y AS (SELECT *, (planned - down_min) / planned AS avail, barrels / ideal AS perf, (barrels - rejects) / barrels AS qual FROM x),
z AS (SELECT *, avail * perf * qual AS oee FROM y),
tot AS (SELECT SUM(planned) AS planned, SUM(down_min) AS down_min, SUM(barrels) AS barrels, SUM(rejects) AS rejects, SUM(ideal) AS ideal, AVG(oee) AS oee_avg,
          SUM(planned / 60 * rate * 0.01 * margin) AS usd_pt, SUM((planned / 60 * rate - (barrels - rejects)) * margin) AS loss FROM z),
tz AS (SELECT *, (planned - down_min) / planned AS avail, barrels / ideal AS perf, (barrels - rejects) / barrels AS qual FROM tot),
t2 AS (SELECT *, avail * perf * qual AS oee FROM tz)`;
const status = (e) => `CASE WHEN ${e} >= 0.85 THEN 'World class' WHEN ${e} >= 0.6 THEN 'Typical' ELSE 'Needs work' END`;
const machineRows = (cols) => withTotal(cols.map(([n]) => n).join(", "), `SELECT k, ${cols.map(([n, r]) => `${r} AS ${n}`).join(", ")} FROM z`, `SELECT ${cols.map(([n, , t]) => `${t} AS ${n}`).join(", ")} FROM t2`, OEE_CTES);

// All faults to 10:15, by machine or by fault.
const byMachine = (cols) => withTotal(cols.map(([n]) => n).join(", "),
  `SELECT m.machine AS k, ${cols.map(([n, e]) => `${e} AS ${n}`).join(", ")} FROM dim_machine AS m JOIN fm ON fm.machine = m.machine GROUP BY m.machine`,
  `SELECT ${cols.map(([n, e]) => `${e} AS ${n}`).join(", ")} FROM fm`, `WITH fm AS (${FM})`);
const byFault = (cols, totalCols) => withTotal(cols.map(([n]) => n).join(", "),
  `SELECT fault AS k, ${cols.map(([n, e]) => `${e} AS ${n}`).join(", ")} FROM fm GROUP BY fault`,
  `SELECT ${cols.map(([n, e], i) => `${(totalCols && totalCols[i]) || e} AS ${n}`).join(", ")} FROM fm`, `WITH fm AS (${FM})`);
const SHARE = "SUM(minutes) / (SELECT SUM(minutes) FROM fm)";

// Stage 2 helpers. Shift and shift date as the lessons' calculated columns define them.
const SHIFT = "CASE WHEN DATEPART(HOUR, start_ts) BETWEEN 6 AND 13 THEN 'A' WHEN DATEPART(HOUR, start_ts) BETWEEN 14 AND 21 THEN 'B' ELSE 'C' END";
const FM2 = `SELECT *, DATEADD(DAY, -1, MAX(shift_date) OVER ()) AS last_d, DATEADD(DAY, -2, MAX(shift_date) OVER ()) AS before_d
  FROM (SELECT *, ${SHIFT} AS shift, CAST(DATEADD(HOUR, -6, start_ts) AS DATE) AS shift_date FROM (${FM}) AS f0) AS f1`;
const byKey = (keyExpr, cols, where = "") => withTotal(cols.map(([n]) => n).join(", "),
  `SELECT ${keyExpr} AS k, ${cols.map(([n, e]) => `${e} AS ${n}`).join(", ")} FROM fm ${where} GROUP BY ${keyExpr}`,
  `SELECT ${cols.map(([n, e, t]) => `${t || e} AS ${n}`).join(", ")} FROM fm ${where}`, `WITH fm AS (${FM2})`);
const dateText = (e) => `CONVERT(VARCHAR(10), ${e}, 23)`;
// Per machine, all faults to 10:15, with a fault filter.
const machineFaults = (cols) => byKey("machine", cols);
// The last full day is computed from the data, as the DAX does, not typed in.
const LAST = "last_d", BEFORE = "before_d";
const dayMin = (d) => `SUM(CASE WHEN shift_date = ${d} THEN minutes END)`;
const OEE2 = (cols) => machineRows(cols);
const GAP = "CASE WHEN 0.85 - oee > 0 THEN (0.85 - oee) * 100 ELSE 0 END";
export const TWINS = {
  "Count the faults": byMachine([["faults", "COUNT(*)"]]),
  "A down-minutes column": `SELECT TOP 4 fault_id, machine, fault, minutes FROM (${FM}) AS f ORDER BY fault_id`,
  "Column or measure": byMachine([["faults", "COUNT(*)"], ["down_min", "SUM(minutes)"]]),
  "Longest stop by fault": byFault([["down_min", "SUM(minutes)"], ["longest", "MAX(minutes)"]]),
  "DIVIDE, not /": byMachine([["down_min", "SUM(minutes)"], ["faults", "COUNT(*)"], ["avg_min", "SUM(minutes) / COUNT(*)"]]),
  "Low air only": byMachine([["down_min", "SUM(minutes)"], ["low_air", "SUM(CASE WHEN fault = 'Low air' THEN minutes END)"]]),
  "Share of all down time": byFault([["down_min", "SUM(minutes)"], ["share", SHARE]]),
  "VAR and RETURN": byFault([["down_min", "SUM(minutes)"], ["share", SHARE]]),
  "The OEE week only": machineRows([["all_min", "(SELECT SUM(minutes) FROM fm WHERE fm.machine = z.k)", "(SELECT SUM(minutes) FROM fm)"], ["down_min", "down_min", "down_min"]]),
  "Barrels in the week": machineRows([["barrels", "barrels", "barrels"]]),
  "Availability": machineRows([["planned", "planned", "planned"], ["avail", "avail", "avail"]]),
  "Performance": machineRows([["barrels", "barrels", "barrels"], ["ideal", "ideal", "ideal"], ["perf", "perf", "perf"]]),
  "Quality": machineRows([["barrels", "barrels", "barrels"], ["rejects", "rejects", "rejects"], ["qual", "qual", "qual"]]),
  "OEE": machineRows([["avail", "avail", "avail"], ["perf", "perf", "perf"], ["qual", "qual", "qual"], ["oee", "oee", "oee"]]),
  "Why the Total is not an average": machineRows([["oee", "oee", "oee"], ["oee_avg", "oee", "oee_avg"]]),
  "Dollars per OEE point": machineRows([["usd_pt", "planned / 60 * rate * 0.01 * margin", "usd_pt"]]),
  "Loss dollars by machine": machineRows([["oee", "oee", "oee"], ["loss", "(planned / 60 * rate - (barrels - rejects)) * margin", "loss"]]),
  "Status with SWITCH": machineRows([["oee", "oee", "oee"], ["status", status("oee"), status("oee")]]),
  "Pareto rank": byFault([["down_min", "SUM(minutes)"], ["fault_rank", "CAST(RANK() OVER (ORDER BY SUM(minutes) DESC) AS INT)"]], [null, "NULL"]),
  "Minor stops with FILTER": machineRows([["down_min", "down_min", "down_min"],
    ["minor", `(SELECT SUM(minutes) FROM fm WHERE fm.machine = z.k AND minutes < 5 AND start_ts >= ${WS} AND start_ts < ${WE})`, `(SELECT SUM(minutes) FROM fm WHERE minutes < 5 AND start_ts >= ${WS} AND start_ts < ${WE})`]]),

  // ---------- Stage 2 ----------
  "Machines with faults": byKey("fault", [["faults", "COUNT(*)"], ["machines", "COUNT(DISTINCT machine)"]]),
  "Average stop": byKey("fault", [["avg_min", "SUM(minutes) / COUNT(*)"], ["avg_stop", "AVG(minutes)"]]),
  "A shift column": `SELECT TOP 4 fault_id, CONVERT(VARCHAR(19), start_ts, 120), shift FROM (${FM2}) AS f ORDER BY fault_id`,
  "Down minutes by shift": byKey("shift", [["faults", "COUNT(*)"], ["down_min", "SUM(minutes)"], ["share", "SUM(minutes) / (SELECT SUM(minutes) FROM fm)"]]),
  "First fault of the week": byKey("machine", [["faults", "COUNT(*)"], ["first_fault", `CONVERT(VARCHAR(19), MIN(CASE WHEN start_ts >= ${WS} AND start_ts < ${WE} THEN start_ts END), 120)`]]),
  "Jam or misfeed": machineFaults([["down_min", "SUM(minutes)"], ["feed", "SUM(CASE WHEN fault IN ('Jam', 'Hoop misfeed') THEN minutes END)"]]),
  "Everything but low air": machineFaults([["down_min", "SUM(minutes)"], ["low_air", "SUM(CASE WHEN fault = 'Low air' THEN minutes END)"], ["not_low_air", "SUM(CASE WHEN fault <> 'Low air' THEN minutes END)"]]),
  "Breakdowns, 5 minutes or more": machineRows([["down_min", "down_min", "down_min"],
    ["breakdown", `(SELECT SUM(minutes) FROM fm WHERE fm.machine = z.k AND minutes >= 5 AND start_ts >= ${WS} AND start_ts < ${WE})`, `(SELECT SUM(minutes) FROM fm WHERE minutes >= 5 AND start_ts >= ${WS} AND start_ts < ${WE})`],
    ["minor", `(SELECT SUM(minutes) FROM fm WHERE fm.machine = z.k AND minutes < 5 AND start_ts >= ${WS} AND start_ts < ${WE})`, `(SELECT SUM(minutes) FROM fm WHERE minutes < 5 AND start_ts >= ${WS} AND start_ts < ${WE})`]]),
  "KEEPFILTERS or replace": byKey("fault", [["down_min", "SUM(minutes)"], ["jam_replace", "(SELECT SUM(minutes) FROM fm WHERE fault = 'Jam')"], ["jam_keep", "SUM(CASE WHEN fault = 'Jam' THEN minutes END)"]]),
  "Share of the machine's time": `WITH fm AS (${FM2}) SELECT k1, k2, down_min, share FROM (
      SELECT machine AS k1, fault AS k2, SUM(minutes) AS down_min, SUM(minutes) / (SELECT SUM(minutes) FROM fm AS x WHERE x.machine = fm.machine) AS share, 0 AS o FROM fm GROUP BY machine, fault
      UNION ALL SELECT 'Total', '', SUM(minutes), 1.0, 1 FROM fm) t ORDER BY o, k1, k2`,
  "Share of the line": machineRows([["down_min", "down_min", "down_min"], ["share", "down_min / (SELECT down_min FROM t2)", "1.0"]]),
  "REMOVEFILTERS": machineRows([["down_min", "down_min", "down_min"], ["line", "(SELECT down_min FROM t2)", "down_min"]]),
  "A shift-date column": `SELECT TOP 6 fault_id, CONVERT(VARCHAR(19), start_ts, 120), shift, ${dateText("shift_date")} FROM (${FM2}) AS f ORDER BY fault_id`,
  "Down minutes by date": byKey(dateText("shift_date"), [["faults", "COUNT(*)"], ["down_min", "SUM(minutes)"], ["per_day", "SUM(minutes) / COUNT(DISTINCT shift_date)"]]),
  "Barrels by date": `WITH h AS (SELECT ${dateText("CAST(DATEADD(HOUR, -7, ts) AS DATE)")} AS k, made_this_hour FROM v_hourly_barrels)
    SELECT k, made FROM (SELECT k, SUM(made_this_hour) AS made, 0 AS o FROM h GROUP BY k UNION ALL SELECT 'Total', SUM(made_this_hour), 1 FROM h) t ORDER BY o, k`,
  "The last full day": byKey("machine", [["last_day", dateText("MAX(last_d)")], ["down_last", dayMin(LAST)]]),
  "The day before": byKey("machine", [["down_last", dayMin(LAST)], ["down_before", dayMin(BEFORE)]]),
  "Change from the day before": byKey("machine", [["down_last", dayMin(LAST)], ["down_before", dayMin(BEFORE)], ["change", `ISNULL(${dayMin(LAST)}, 0) - ISNULL(${dayMin(BEFORE)}, 0)`]]),
  "Rank machines by loss": machineRows([["loss", "(planned / 60 * rate - (barrels - rejects)) * margin", "loss"],
    ["loss_rank", "CAST(RANK() OVER (ORDER BY (planned / 60 * rate - (barrels - rejects)) * margin DESC) AS INT)", "NULL"]]),
  "The worst machine": `${OEE_CTES} SELECT 'Worst Machine', (SELECT TOP 1 k FROM z ORDER BY (planned / 60 * rate - (barrels - rejects)) * margin DESC)
    UNION ALL SELECT 'Loss Dollars', LTRIM(STR((SELECT loss FROM t2), 20, 2))`,
  "Fault list per machine": `WITH fm AS (${FM2}), d AS (SELECT DISTINCT machine, fault FROM fm)
    SELECT k, list FROM (SELECT machine AS k, STRING_AGG(fault, ', ') WITHIN GROUP (ORDER BY fault) AS list, 0 AS o FROM d GROUP BY machine
      UNION ALL SELECT 'Total', (SELECT STRING_AGG(fault, ', ') WITHIN GROUP (ORDER BY fault) FROM (SELECT DISTINCT fault FROM fm) AS a), 1) t ORDER BY o, k`,
  "Top fault per machine": `WITH fm AS (${FM2}), s AS (SELECT machine, fault, SUM(minutes) AS m FROM fm GROUP BY machine, fault),
    r AS (SELECT machine, fault, RANK() OVER (PARTITION BY machine ORDER BY m DESC) AS rk FROM s),
    t AS (SELECT fault, SUM(minutes) AS m FROM fm GROUP BY fault)
    SELECT k, down_min, top_fault FROM (SELECT machine AS k, (SELECT SUM(minutes) FROM fm WHERE fm.machine = r.machine) AS down_min,
        STRING_AGG(fault, ', ') WITHIN GROUP (ORDER BY fault) AS top_fault, 0 AS o FROM r WHERE rk = 1 GROUP BY machine
      UNION ALL SELECT 'Total', (SELECT SUM(minutes) FROM fm), (SELECT TOP 1 fault FROM t ORDER BY m DESC), 1) x ORDER BY o, k`,
  "Cumulative Pareto": `WITH fm AS (${FM2}), p AS (SELECT fault, SUM(minutes) AS m FROM fm GROUP BY fault)
    SELECT k, m, cum FROM (SELECT fault AS k, m, (SELECT SUM(m) FROM p AS q WHERE q.m >= p.m) / (SELECT SUM(m) FROM p) AS cum, 0 AS o FROM p
      UNION ALL SELECT 'Total', (SELECT SUM(m) FROM p), NULL, 1) t ORDER BY o, k`,
  "Availability loss in dollars": machineRows([["down_min", "down_min", "down_min"], ["avail_usd", "down_min / 60 * rate * margin", "(SELECT SUM(down_min / 60 * rate * margin) FROM z)"]]),
  "Performance loss in dollars": machineRows([["ideal", "ideal", "ideal"], ["barrels", "barrels", "barrels"], ["perf_usd", "(ideal - barrels) * margin", "(SELECT SUM((ideal - barrels) * margin) FROM z)"]]),
  "Quality loss in dollars": machineRows([["rejects", "rejects", "rejects"], ["qual_usd", "rejects * margin", "(SELECT SUM(rejects * margin) FROM z)"]]),
  "The three losses add up": machineRows([["avail_usd", "down_min / 60 * rate * margin", "(SELECT SUM(down_min / 60 * rate * margin) FROM z)"],
    ["perf_usd", "(ideal - barrels) * margin", "(SELECT SUM((ideal - barrels) * margin) FROM z)"], ["qual_usd", "rejects * margin", "(SELECT SUM(rejects * margin) FROM z)"],
    ["check_usd", "down_min / 60 * rate * margin + (ideal - barrels) * margin + rejects * margin", "(SELECT SUM(down_min / 60 * rate * margin + (ideal - barrels) * margin + rejects * margin) FROM z)"],
    ["loss", "(planned / 60 * rate - (barrels - rejects)) * margin", "loss"]]),
  "Gap to 85%": machineRows([["oee", "oee", "oee"], ["gap", GAP, "NULL"]]),
  "Dollars from closing the gap": machineRows([["gap", GAP, "NULL"], ["usd_pt", "planned / 60 * rate * 0.01 * margin", "usd_pt"], ["gap_usd", `${GAP} * planned / 60 * rate * 0.01 * margin`, `(SELECT SUM(${GAP} * planned / 60 * rate * 0.01 * margin) FROM z)`]]),
  "What if the margin were $45": machineRows([["loss", "(planned / 60 * rate - (barrels - rejects)) * margin", "loss"], ["loss45", "(planned / 60 * rate - (barrels - rejects)) * 45", "(SELECT SUM((planned / 60 * rate - (barrels - rejects)) * 45) FROM z)"]]),
};
