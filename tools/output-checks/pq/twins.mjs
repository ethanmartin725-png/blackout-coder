// The SQL twin of every step of the Power BI report track: the same rows, asked of SQL Server in
// plain T-SQL. run.mjs compares every row and column with the M or DAX model's.
const WS = "'2026-10-31 06:00'", WE = "'2026-11-07 06:00'";
const FAULTS = `SELECT fault_id, machine, fault, start_ts, end_ts FROM fault_log`;
const WEEK = `${FAULTS} WHERE start_ts >= ${WS} AND start_ts < ${WE}`;
const MIN = "CAST(DATEDIFF(SECOND, start_ts, end_ts) AS FLOAT) / 60";
const SHIFT = "CASE WHEN DATEPART(HOUR, start_ts) BETWEEN 6 AND 13 THEN 'A' WHEN DATEPART(HOUR, start_ts) BETWEEN 14 AND 21 THEN 'B' ELSE 'C' END";
const F = `SELECT fault_id, machine, fault, start_ts, ${MIN} AS minutes, ${SHIFT} AS shift, CAST(DATEADD(HOUR, -6, start_ts) AS DATE) AS shift_date FROM fault_log WHERE start_ts >= ${WS} AND start_ts < ${WE}`;
const DOWN = `SELECT machine, COUNT(*) AS faults, SUM(${MIN}) AS down_min FROM fault_log WHERE start_ts >= ${WS} AND start_ts < ${WE} GROUP BY machine`;
const BARRELS = `SELECT machine, SUM(made_this_hour) AS barrels FROM v_hourly_barrels WHERE ts > ${WS} AND ts <= ${WE} GROUP BY machine`;
const REJECTS = `SELECT machine, SUM(qty) AS rejects FROM reject_log WHERE ts >= ${WS} AND ts < ${WE} GROUP BY machine`;
// One row per machine with the week's figures, then OEE and loss, as FLOATs.
const OEE = `WITH d AS (${DOWN}), b AS (${BARRELS}), r AS (${REJECTS}),
x AS (SELECT m.machine AS k, CAST(m.ideal_rate_hr AS FLOAT) AS rate, CAST(m.margin_per_barrel AS FLOAT) AS margin, 9450.0 AS planned,
        ISNULL(d.down_min, 0) AS down_min, CAST(b.barrels AS FLOAT) AS barrels, CAST(r.rejects AS FLOAT) AS rejects
      FROM dim_machine AS m LEFT JOIN d ON d.machine = m.machine LEFT JOIN b ON b.machine = m.machine LEFT JOIN r ON r.machine = m.machine),
y AS (SELECT *, (planned - down_min) / 60 * rate AS ideal FROM x),
z AS (SELECT *, (planned - down_min) / planned AS avail, barrels / ideal AS perf, (barrels - rejects) / barrels AS qual FROM y),
z2 AS (SELECT *, avail * perf * qual AS oee FROM z),
t AS (SELECT SUM(planned) AS planned, SUM(down_min) AS down_min, SUM(barrels) AS barrels, SUM(rejects) AS rejects, SUM(ideal) AS ideal,
        SUM((planned / 60 * rate - (barrels - rejects)) * margin) AS loss FROM z2),
t2 AS (SELECT *, (planned - down_min) / planned * (barrels / ideal) * ((barrels - rejects) / barrels) AS oee,
        (planned - down_min) / planned AS avail, barrels / ideal AS perf, (barrels - rejects) / barrels AS qual FROM t)`;
const rows = (cols, totals) => `${OEE} SELECT k, ${cols.join(", ")} FROM (SELECT k, ${cols.join(", ")}, 0 AS o FROM z2 UNION ALL SELECT 'Total', ${totals.join(", ")}, 1 FROM t2) q ORDER BY o, k`;
const LOSS = "(planned / 60 * rate - (barrels - rejects)) * margin";
const COLOR = (e) => `CASE WHEN ${e} >= 0.85 THEN '#5F6368' WHEN ${e} >= 0.75 THEN '#B26A00' ELSE '#C62828' END`;
const DAYS = `WITH days AS (SELECT CAST('2026-10-31' AS DATE) AS d UNION ALL SELECT DATEADD(DAY, 1, d) FROM days WHERE d < '2026-11-06')`;

export const TWINS = {
  "Connect and navigate": `${FAULTS} ORDER BY fault_id`,
  "Keep the OEE week": `${WEEK} ORDER BY fault_id`,
  "Add the minutes": `SELECT fault_id, machine, fault, start_ts, end_ts, ${MIN} AS minutes FROM fault_log WHERE start_ts >= ${WS} AND start_ts < ${WE} ORDER BY fault_id`,
  "Shift and shift date": `${F} ORDER BY fault_id`,
  "Group by machine": `${DOWN} ORDER BY machine`,
  "Merge the machine rates": `WITH d AS (${DOWN}) SELECT m.machine, m.area, m.ideal_rate_hr, CAST(m.margin_per_barrel AS FLOAT), d.faults, d.down_min FROM dim_machine AS m LEFT JOIN d ON d.machine = m.machine ORDER BY m.machine`,
  "Barrels in the week": `${BARRELS} ORDER BY machine`,
  "Rejects in the week": `${REJECTS} ORDER BY machine`,
  "A date table": `${DAYS} SELECT d, DATENAME(WEEKDAY, d) FROM days ORDER BY d`,
  "Measures on the shaped data": rows(["faults", "down_min"], ["(SELECT COUNT(*) FROM fault_log WHERE start_ts >= " + WS + " AND start_ts < " + WE + ")", "down_min"]).replace("WITH d AS", "WITH d AS").replace("SELECT k, faults, down_min FROM (SELECT k, faults", "SELECT k, faults, down_min FROM (SELECT k, (SELECT faults FROM d WHERE d.machine = z2.k) AS faults"),
  "OEE measures": rows(["avail", "perf", "qual", "oee"], ["avail", "perf", "qual", "oee"]),
  "Loss dollars": rows(["oee", "loss"], ["oee", "loss"]).replace("SELECT k, oee, loss FROM (SELECT k, oee, loss, 0", `SELECT k, oee, loss FROM (SELECT k, oee, ${LOSS} AS loss, 0`),
  "Down minutes by day": `${DAYS}, f AS (${F}) SELECT k, n, mins, per FROM (
      SELECT CONVERT(VARCHAR(10), days.d, 23) AS k, DATENAME(WEEKDAY, days.d) AS n, SUM(f.minutes) AS mins, CAST(COUNT(f.fault_id) AS FLOAT) AS per, 0 AS o
      FROM days LEFT JOIN f ON f.shift_date = days.d GROUP BY days.d
      UNION ALL SELECT 'Total', '', (SELECT SUM(minutes) FROM f), (SELECT COUNT(*) FROM f) / 7.0, 1) q ORDER BY o, k`,
  "A dynamic title": `${OEE} SELECT 'Report Title', 'OEE week of 31 Oct 2026: ' + FORMAT(oee, 'P1', 'en-US') FROM t2`,
  "Color only what is off target": rows(["oee", "color"], ["oee", COLOR("oee")]).replace("SELECT k, oee, color FROM (SELECT k, oee, color, 0", `SELECT k, oee, color FROM (SELECT k, oee, ${COLOR("oee")} AS color, 0`),
  "A refresh check": `WITH f AS (${F}) SELECT 'Rows Loaded', CAST(COUNT(*) AS VARCHAR(10)) FROM f
      UNION ALL SELECT 'Days Loaded', CAST(COUNT(DISTINCT shift_date) AS VARCHAR(10)) FROM f
      UNION ALL SELECT 'Data Check', CASE WHEN COUNT(*) = 45 AND COUNT(DISTINCT shift_date) = 7 THEN 'OK' ELSE 'Check the refresh' END FROM f`,
};
