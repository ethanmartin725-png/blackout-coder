// The SQL twin of every lesson of the Power Query M lane: the same rows, asked of SQL Server in plain
// T-SQL. run.mjs compares every row and column with the M model's. Values are shown the way the model
// shows them: a record or list as rows, a date-time as yyyy-mm-dd hh:mm:ss, a logical as true/false.
const WS = "'2026-10-31 06:00'", WE = "'2026-11-07 06:00'", NOW = "'2026-11-07 10:15'", TODAY = "'2026-11-07 06:00'";
const MIN = "CAST(DATEDIFF(SECOND, start_ts, end_ts) AS FLOAT) / 60";
const MIN_NOW = `CAST(DATEDIFF(SECOND, start_ts, ISNULL(end_ts, ${NOW})) AS FLOAT) / 60`;
const kv = (pairs) => pairs.map(([k, v], i) => `SELECT ${i} AS o, '${k}' AS k, ${v} AS v`).join(" UNION ALL ");
const rec = (pairs) => `SELECT k, v FROM (${kv(pairs)}) q ORDER BY o`;
const PARETO = `SELECT fault, COUNT(*) AS events, SUM(${MIN_NOW}) AS minutes FROM fault_log GROUP BY fault`;
const TOTALS = `SELECT machine, SUM(qty) AS rejects FROM reject_log WHERE ts >= ${TODAY} GROUP BY machine`;
const HALF_EVEN = (x) => `CASE WHEN ${x} - FLOOR(${x}) = 0.5 THEN CASE WHEN CAST(FLOOR(${x}) AS INT) % 2 = 0 THEN FLOOR(${x}) ELSE FLOOR(${x}) + 1 END ELSE ROUND(${x}, 0) END`;
const MIS = `SELECT ${MIN} AS m FROM fault_log WHERE machine = 'Hoop Driver 1' AND fault = 'Hoop misfeed' AND start_ts >= ${WS} AND start_ts < ${WE}`;

export const TWINS = {
  "Steps in a let": "SELECT machine, area, ideal_rate_hr, CAST(margin_per_barrel AS FLOAT) FROM dim_machine ORDER BY machine",
  "Values in M": rec([["rate", "'55'"], ["machine", "'Hoop Driver 1'"], ["running", "'true'"], ["ended", "NULL"], ["started", "'2026-11-07 10:09:40'"], ["down", "'0.00:07:30'"]]),
  "Navigate to fault_log": "SELECT fault_id, machine, fault, start_ts, end_ts FROM fault_log ORDER BY fault_id",
  "Choose and rename columns": "SELECT fault_id, machine, start_ts AS started FROM fault_log ORDER BY fault_id",
  "Keep the rows you need": "SELECT fault_id, start_ts, end_ts FROM fault_log WHERE machine = 'Hoop Driver 1' AND fault = 'Hoop misfeed' ORDER BY fault_id",
  "Sort": "SELECT fault_id, machine, fault, start_ts FROM fault_log ORDER BY start_ts DESC",
  "A column with each": `SELECT fault_id, machine, fault, ${MIN} FROM fault_log WHERE end_ts IS NOT NULL ORDER BY fault_id`,
  "if, then, else": `WITH s AS (SELECT fault_id, CASE WHEN DATEPART(HOUR, start_ts) >= 6 AND DATEPART(HOUR, start_ts) < 14 THEN 'A' WHEN DATEPART(HOUR, start_ts) >= 14 AND DATEPART(HOUR, start_ts) < 22 THEN 'B' ELSE 'C' END AS shift FROM fault_log)
    SELECT shift, COUNT(*) FROM s GROUP BY shift ORDER BY MIN(fault_id)`,
  "Text from parts": "SELECT 'F' + CAST(fault_id AS VARCHAR(10)) + ' ' + UPPER(LEFT(machine, 4)) + ': ' + fault FROM fault_log ORDER BY fault_id",
  "Rounding, M's way": `SELECT x, ${HALF_EVEN("x")}, ROUND(x, 2) FROM (VALUES (0, CAST(0.5 AS FLOAT)), (1, 1.5), (2, 2.5), (3, 3.5), (4, 87.049997)) AS v(o, x) ORDER BY o`,
  "Date parts": "SELECT fault_id, start_ts, YEAR(start_ts), MONTH(start_ts), CONVERT(VARCHAR(10), start_ts, 23), DATEPART(HOUR, start_ts) FROM fault_log ORDER BY fault_id",
  "An open fault and a threshold": `SELECT fault_id, machine, fault, ${MIN_NOW} FROM fault_log WHERE ${MIN_NOW} >= 5 ORDER BY start_ts DESC`,
  "A list and its totals": `SELECT k, v FROM (SELECT 0 AS o, 'count' AS k, CAST(COUNT(*) AS FLOAT) AS v FROM (${MIS}) a
    UNION ALL SELECT 1, 'total', ROUND(SUM(m), 2) FROM (${MIS}) a UNION ALL SELECT 2, 'average', ROUND(AVG(m), 2) FROM (${MIS}) a
    UNION ALL SELECT 3, 'longest', ROUND(MAX(m), 2) FROM (${MIS}) a) q ORDER BY o`,
  "Distinct values": "SELECT fault FROM fault_log GROUP BY fault ORDER BY MIN(fault_id)",
  "A row as a record": `SELECT k, v FROM (SELECT 0 AS o, 'machine' AS k, machine AS v FROM dim_machine WHERE machine = 'Hoop Driver 1'
    UNION ALL SELECT 1, 'area', area FROM dim_machine WHERE machine = 'Hoop Driver 1'
    UNION ALL SELECT 2, 'ideal_rate_hr', CONVERT(VARCHAR(20), ideal_rate_hr) FROM dim_machine WHERE machine = 'Hoop Driver 1'
    UNION ALL SELECT 3, 'margin_per_barrel', CONVERT(VARCHAR(20), CAST(margin_per_barrel AS FLOAT)) FROM dim_machine WHERE machine = 'Hoop Driver 1') q ORDER BY o`,
  "A table from records": "SELECT machine, target FROM (VALUES (0, 'Conveyor 3', CAST(450 AS FLOAT)), (1, 'Hoop Driver 1', 412.5), (2, 'Char Station 2', 375)) AS v(o, machine, target) ORDER BY o",
  "Group into a Pareto": `${PARETO} ORDER BY minutes DESC`,
  "Keep the top rows": `SELECT TOP 3 * FROM (${PARETO}) p ORDER BY minutes DESC`,
  "Distinct rows": "SELECT machine, fault FROM fault_log GROUP BY machine, fault ORDER BY MIN(fault_id)",
  "Merge: keep every machine": `SELECT m.machine, t.rejects FROM dim_machine AS m LEFT JOIN (${TOTALS}) AS t ON t.machine = m.machine ORDER BY m.machine`,
  "Merge: matches only": `SELECT m.machine, t.rejects FROM dim_machine AS m JOIN (${TOTALS}) AS t ON t.machine = m.machine ORDER BY m.machine`,
  "Merge: what is missing": `SELECT m.machine, m.area FROM dim_machine AS m WHERE NOT EXISTS (SELECT 1 FROM fault_log AS f WHERE f.machine = m.machine AND f.start_ts >= ${TODAY}) ORDER BY m.machine`,
  "Append two tables": `SELECT machine, ts, kind FROM (SELECT machine, start_ts AS ts, 'fault' AS kind, 0 AS o, fault_id AS n FROM fault_log WHERE start_ts >= ${TODAY}
    UNION ALL SELECT machine, ts, 'reject', 1, reject_id FROM reject_log WHERE ts >= ${TODAY}) q ORDER BY ts, o, n`,
  "A function of your own": `SELECT f.machine, SUM(${MIN}) AS down_min, SUM(${MIN}) / 60 * m.ideal_rate_hr * CAST(m.margin_per_barrel AS FLOAT)
    FROM fault_log AS f JOIN dim_machine AS m ON m.machine = f.machine WHERE f.start_ts >= ${WS} AND f.start_ts < ${WE}
    GROUP BY f.machine, m.ideal_rate_hr, m.margin_per_barrel ORDER BY MIN(f.fault_id)`,
  "try and otherwise": `SELECT machine, typed, TRY_CAST(typed AS FLOAT), CASE WHEN TRY_CAST(typed AS FLOAT) IS NULL THEN 'false' ELSE 'true' END
    FROM (VALUES (0, 'Conveyor 3', '12'), (1, 'Hoop Driver 1', '7.5'), (2, 'Char Station 2', 'n/a'), (3, 'Hoop Driver 1', '15')) AS v(o, machine, typed) ORDER BY o`,
};
