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
};
