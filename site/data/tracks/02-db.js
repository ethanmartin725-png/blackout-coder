// Project track 2: DB Pulls & Analytics
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
BC.addTrack({
  id: "t-db",
  name: "DB Pulls & Analytics",
  sub: "Schema for the Conveyor 3 logs, SQL pulls from simple to window functions, then pandas analytics",
  lessons: [
    {
      lang: "sql",
      file: "schema.sql",
      t: "Create fault_log",
      goal: "Create fault_log: an auto-numbered fault_id key, machine and fault (required text), start_ts defaulting to now, and a nullable end_ts.",
      code: `CREATE TABLE fault_log (
    fault_id INT IDENTITY(1,1) PRIMARY KEY,
    machine VARCHAR(50) NOT NULL,
    fault VARCHAR(50) NOT NULL,
    start_ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_ts DATETIME NULL
);`,
      about: "This is the table the Jam_Fault tag script in the PLC & HMI track writes to. The default on start_ts is why that INSERT only had to send machine and fault. end_ts stays NULL while a fault is open.",
      terms: [
        ["IDENTITY", "IDENTITY(1,1)", "Auto-numbers the column: starts at 1, adds 1 per row. You never insert it yourself."],
        ["DATETIME", "DATETIME", "A date and time column."],
        ["DEFAULT", "DEFAULT CURRENT_TIMESTAMP", "Fills the column with the current time when an INSERT leaves it out."],
        ["NULL", "NULL / NOT NULL", "NULL allows an empty value. Open faults have no end time yet."],
      ],
      out: `Commands completed successfully.

SELECT COLUMN_NAME AS column_name, DATA_TYPE AS type, CHARACTER_MAXIMUM_LENGTH AS max_len,
    IS_NULLABLE AS nullable, COLUMN_DEFAULT AS default_value,
    COLUMNPROPERTY(OBJECT_ID('fault_log'), COLUMN_NAME, 'IsIdentity') AS is_identity
FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'fault_log' ORDER BY ORDINAL_POSITION;
column_name  type      max_len  nullable  default_value  is_identity
fault_id     int       NULL     NO        NULL           1
machine      varchar   50       NO        NULL           0
fault        varchar   50       NO        NULL           0
start_ts     datetime  NULL     NO        (getdate())    0
end_ts       datetime  NULL     YES       NULL           0`,
    },
    {
      lang: "sql",
      file: "schema.sql",
      t: "Create count_log",
      goal: "Create count_log with an auto-numbered log_id, machine, barrels, state (all required), and ts defaulting to now.",
      code: `CREATE TABLE count_log (
    log_id INT IDENTITY(1,1) PRIMARY KEY,
    machine VARCHAR(50) NOT NULL,
    barrels INT NOT NULL,
    state INT NOT NULL,
    ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
      about: "The hourly gateway script writes one row here per machine. barrels is the counter reading at that moment, not barrels made that hour. That difference matters in step 10.",
      terms: [
        ["INT", "INT", "Whole-number column. Counts and state codes."],
        ["ts", "ts", "Short for timestamp. A naming habit worth keeping consistent across tables."],
        [null, "Snapshot table", "Stores readings at fixed times. To get activity between readings, compare each row with the one before it."],
      ],
      out: `Commands completed successfully.

SELECT COLUMN_NAME AS column_name, DATA_TYPE AS type, CHARACTER_MAXIMUM_LENGTH AS max_len,
    IS_NULLABLE AS nullable, COLUMN_DEFAULT AS default_value,
    COLUMNPROPERTY(OBJECT_ID('count_log'), COLUMN_NAME, 'IsIdentity') AS is_identity
FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'count_log' ORDER BY ORDINAL_POSITION;
column_name  type      max_len  nullable  default_value  is_identity
log_id       int       NULL     NO        NULL           1
machine      varchar   50       NO        NULL           0
barrels      int       NULL     NO        NULL           0
state        int       NULL     NO        NULL           0
ts           datetime  NULL     NO        (getdate())    0`,
    },
    {
      lang: "sql",
      file: "schema.sql",
      t: "Machine dimension",
      goal: "Create dim_machine (machine key, area, ideal_rate_hr, margin_per_barrel) and insert Conveyor 3, Hoop Driver 1 and Char Station 2.",
      code: `CREATE TABLE dim_machine (
    machine VARCHAR(50) PRIMARY KEY,
    area VARCHAR(30) NOT NULL,
    ideal_rate_hr INT NOT NULL,
    margin_per_barrel DECIMAL(8,2) NOT NULL
);

INSERT INTO dim_machine (machine, area, ideal_rate_hr, margin_per_barrel)
VALUES ('Conveyor 3', 'Assembly', 60, 42.50),
    ('Hoop Driver 1', 'Assembly', 55, 42.50),
    ('Char Station 2', 'Finishing', 50, 42.50);`,
      about: "Logs are facts: things that happened. A dimension describes the things they happened to. Keeping ideal rate and margin here means every report converts minutes to barrels and dollars the same way. The rates and margin are sample numbers for practice.",
      terms: [
        ["DECIMAL", "DECIMAL(8,2)", "Exact number: 8 digits total, 2 after the point. Use it for money, never FLOAT."],
        ["INSERT", "INSERT INTO … VALUES", "Adds rows. Several rows can go in one statement, separated by commas."],
        ["dim_machine", "Dimension table", "One row per machine with its attributes. Fact tables join to it by key."],
      ],
      out: `Commands completed successfully.

SELECT * FROM dim_machine ORDER BY machine;
machine         area       ideal_rate_hr  margin_per_barrel
Char Station 2  Finishing  50             42.50
Conveyor 3      Assembly   60             42.50
Hoop Driver 1   Assembly   55             42.50`,
    },
    {
      lang: "sql",
      file: "open_faults.sql",
      t: "Open faults right now",
      goal: "List machine, fault and start_ts for every fault that has not cleared, oldest first.",
      code: `SELECT machine, fault, start_ts
FROM fault_log
WHERE end_ts IS NULL
ORDER BY start_ts;`,
      about: "The simplest useful pull: what is down right now. This is the query a shift lead or a live board would run every minute.",
      terms: [
        ["IS", "IS NULL", "Matches rows with no end time. = NULL would match nothing."],
        ["ORDER", "ORDER BY start_ts", "Oldest first, so the longest-running problem is on top."],
      ],
      out: `machine        fault         start_ts
Hoop Driver 1  Hoop misfeed  2026-11-07 10:09:40`,
    },
    {
      lang: "sql",
      file: "fault_minutes.sql",
      t: "Fault durations",
      goal: "For the last 7 days, list each fault with its minutes. Count open faults up to now.",
      code: `DECLARE @now DATETIME = '2026-11-07 10:15';

SELECT machine,
    fault,
    start_ts,
    end_ts,
    DATEDIFF(SECOND, start_ts, ISNULL(end_ts, @now)) / 60.0 AS minutes
FROM fault_log
WHERE start_ts >= DATEADD(DAY, -7, @now);`,
      about: "DATEDIFF counts whole seconds between two times; dividing by 60.0 turns that into minutes with decimals. ISNULL swaps in the current time for faults still open, so they count instead of disappearing. SQL Server keeps 6 decimals in the division; wrap it in CAST(… AS DECIMAL(8,2)) when the result is for display. @now stands in for GETDATE() so the results match the sample data, which ends at 2026-11-07 10:15; on a live server, use GETDATE().",
      terms: [
        ["DATEDIFF", "DATEDIFF(SECOND, a, b)", "Time between a and b in the unit you name."],
        ["ISNULL", "ISNULL(x, y)", "Returns x, or y when x is NULL."],
        ["@now", "@now", "The server's current date and time."],
        ["DATEADD", "DATEADD(DAY, -7, …)", "Shifts a date. Here: seven days back."],
        ["60.0", "/ 60.0", "Dividing by 60.0 instead of 60 keeps the decimals. Integer ÷ integer drops them."],
      ],
      out: `machine         fault         start_ts             end_ts               minutes
Hoop Driver 1   Hoop misfeed  2026-10-31 14:37:59  2026-10-31 14:43:41  5.700000
Conveyor 3      E-stop        2026-10-31 21:11:40  2026-10-31 21:14:59  3.316666
Hoop Driver 1   Hoop misfeed  2026-11-01 01:04:59  2026-11-01 01:09:01  4.033333
Conveyor 3      Jam           2026-11-01 01:36:12  2026-11-01 01:40:49  4.616666
… 47 rows in all`,
    },
    {
      lang: "sql",
      file: "pareto.sql",
      t: "Downtime Pareto",
      goal: "Total events and minutes per fault for the last 7 days, most minutes first.",
      code: `DECLARE @now DATETIME = '2026-11-07 10:15';

SELECT fault,
    COUNT(*) AS events,
    SUM(DATEDIFF(SECOND, start_ts, ISNULL(end_ts, @now))) / 60.0 AS minutes
FROM fault_log
WHERE start_ts >= DATEADD(DAY, -7, @now)
GROUP BY fault
ORDER BY minutes DESC;`,
      about: "Look at the two columns together. Jam happens most often, but Low air costs the most time. Ranking by events and ranking by minutes send you to different problems, so always show both.",
      terms: [
        ["COUNT", "COUNT(*)", "Number of rows in each group: how often."],
        ["SUM", "SUM(…)", "Total of the expression in each group: how long."],
        ["GROUP", "GROUP BY fault", "One output row per fault type."],
      ],
      out: `fault         events  minutes
Low air       5       87.433333
Char flare    8       70.050000
Hoop misfeed  12      66.566666
Jam           17      65.733333
E-stop        5       10.800000`,
    },
    {
      lang: "sql",
      file: "shift_summary.sql",
      t: "Bucket by shift",
      goal: "Using a CTE, tag each fault with shift A (06–13), B (14–21) or C (otherwise), then total events and minutes per shift.",
      code: `DECLARE @now DATETIME = '2026-11-07 10:15';

WITH f AS (
    SELECT machine,
        fault,
        DATEDIFF(SECOND, start_ts, ISNULL(end_ts, @now)) / 60.0 AS minutes,
        CASE
            WHEN DATEPART(HOUR, start_ts) BETWEEN 6 AND 13 THEN 'A'
            WHEN DATEPART(HOUR, start_ts) BETWEEN 14 AND 21 THEN 'B'
            ELSE 'C'
        END AS shift
    FROM fault_log
)
SELECT shift, COUNT(*) AS events, SUM(minutes) AS minutes
FROM f
GROUP BY shift
ORDER BY shift;`,
      about: "The CTE works out minutes and shift once, then the outer query groups by the new column. Without it you would repeat the whole CASE inside GROUP BY. One caution for real reports: a C shift that starts at 22:00 belongs to the next production day, so date-based rollups need their own rule.",
      terms: [
        ["WITH", "WITH name AS ( … )", "A CTE: a named, temporary result you can query like a table."],
        ["DATEPART", "DATEPART(HOUR, ts)", "Pulls one part out of a date: the hour, 0 to 23."],
        ["BETWEEN", "BETWEEN 6 AND 13", "Inclusive range. 13 covers 13:00–13:59."],
        ["CASE", "CASE … END AS shift", "Builds the new shift column row by row."],
      ],
      out: `shift  events  minutes
A      13      71.016661
B      18      105.633328
C      16      123.933328`,
    },
    {
      lang: "sql",
      file: "downtime_dollars.sql",
      t: "Downtime in dollars",
      goal: "Join fault_log to dim_machine and show down hours and lost dollars (hours × ideal rate × margin) by area and machine, biggest first.",
      code: `DECLARE @now DATETIME = '2026-11-07 10:15';

SELECT m.area,
    f.machine,
    SUM(DATEDIFF(SECOND, f.start_ts, ISNULL(f.end_ts, @now))) / 3600.0 AS down_hr,
    SUM(DATEDIFF(SECOND, f.start_ts, ISNULL(f.end_ts, @now))) / 3600.0
        * m.ideal_rate_hr * m.margin_per_barrel AS lost_dollars
FROM fault_log AS f
JOIN dim_machine AS m
    ON m.machine = f.machine
GROUP BY m.area, f.machine, m.ideal_rate_hr, m.margin_per_barrel
ORDER BY lost_dollars DESC;`,
      about: "This is where downtime becomes money: hours down × barrels per hour at ideal rate = barrels not made, × margin = dollars. Every non-summed column in SELECT has to appear in GROUP BY, which is why the rate and margin are listed there. Round only at the end: the three rows rounded to cents add to $11,753.78, but the exact total, $11,753.785, rounds to $11,753.79, the figure the other tracks use.",
      terms: [
        ["JOIN", "JOIN … ON", "Pulls the rate and margin from the dimension for each fault row."],
        ["3600.0", "/ 3600.0", "Seconds to hours."],
        ["GROUP", "GROUP BY rule", "Any column you select without SUM/COUNT must be grouped."],
        ["lost_dollars", "Lost dollars", "Lost barrels × margin. Defensible because every input is visible in the query."],
      ],
      out: `area       machine         down_hr   lost_dollars
Assembly   Hoop Driver 1   1.903055  4448.39106250
Assembly   Conveyor 3      1.655833  4222.37415000
Finishing  Char Station 2  1.450833  3083.02012500`,
    },
    {
      lang: "sql",
      file: "hourly_barrels.sql",
      t: "Barrels per hour with LAG",
      goal: "Declare @now as 2026-11-07 10:15. From the last 6 hours of count_log, show each reading and barrels made since the previous reading for the same machine.",
      code: `DECLARE @now DATETIME = '2026-11-07 10:15';

SELECT machine,
    ts,
    barrels,
    barrels - LAG(barrels) OVER (PARTITION BY machine ORDER BY ts) AS made_this_hour
FROM count_log
WHERE ts >= DATEADD(HOUR, -6, @now)
ORDER BY machine, ts;`,
      about: "LAG reaches back one row. PARTITION BY restarts the look-back for each machine, and ORDER BY sets what \"previous\" means. @now stands in for GETDATE() so the result matches the sample data, which ends at 10:15, as in the SQL lane. Two things to see: the 07:00 rows go negative, because the counter reset at the 06:00 shift change; and the 05:00 rows are NULL, because WHERE removes the earlier rows before LAG can look back at them. Step 10 fixes both.",
      terms: [
        ["LAG", "LAG(col)", "The value from the previous row in the window."],
        ["OVER", "OVER ( … )", "Turns a function into a window function: it sees neighboring rows without grouping them away."],
        ["PARTITION", "PARTITION BY machine", "Each machine gets its own sequence."],
      ],
      out: `machine         ts                   barrels  made_this_hour
Char Station 2  2026-11-07 05:00:00  287      NULL
Char Station 2  2026-11-07 06:00:00  328      41
Char Station 2  2026-11-07 07:00:00  40       -288
Char Station 2  2026-11-07 08:00:00  80       40
Char Station 2  2026-11-07 09:00:00  121      41
Char Station 2  2026-11-07 10:00:00  161      40
Conveyor 3      2026-11-07 05:00:00  294      NULL
Conveyor 3      2026-11-07 06:00:00  336      42
Conveyor 3      2026-11-07 07:00:00  47       -289
Conveyor 3      2026-11-07 08:00:00  94       47
Conveyor 3      2026-11-07 09:00:00  141      47
Conveyor 3      2026-11-07 10:00:00  184      43
Hoop Driver 1   2026-11-07 05:00:00  266      NULL
Hoop Driver 1   2026-11-07 06:00:00  304      38
Hoop Driver 1   2026-11-07 07:00:00  37       -267
Hoop Driver 1   2026-11-07 08:00:00  72       35
Hoop Driver 1   2026-11-07 09:00:00  108      36
Hoop Driver 1   2026-11-07 10:00:00  143      35`,
    },
    {
      lang: "sql",
      file: "hourly_barrels_fixed.sql",
      t: "Handle the counter reset",
      goal: "Put the LAG over all of count_log in a CTE as prev. Then, for the last 6 hours before @now, output made_this_hour: NULL for the first reading, the raw reading after a reset, otherwise the difference.",
      code: `DECLARE @now DATETIME = '2026-11-07 10:15';

WITH c AS (
    SELECT machine,
        ts,
        barrels,
        LAG(barrels) OVER (PARTITION BY machine ORDER BY ts) AS prev
    FROM count_log
)
SELECT machine,
    ts,
    CASE
        WHEN prev IS NULL THEN NULL
        WHEN barrels < prev THEN barrels
        ELSE barrels - prev
    END AS made_this_hour
FROM c
WHERE ts >= DATEADD(HOUR, -6, @now)
ORDER BY machine, ts;`,
      about: "A drop in the counter means it was reset, so the reading itself is what was made since the reset. That slightly undercounts the hour the reset happened in: barrels made between the 06:00 reading and the reset just after it are lost. Flag it in any report, or log the count just before the PLC resets it. The time filter now sits outside the CTE, so LAG still sees the reading before the window and the 05:00 rows have values.",
      terms: [
        ["prev", "prev", "The previous reading, named once in the CTE so the CASE stays readable."],
        ["CASE", "Reset rule", "barrels < prev can only happen after a reset."],
        [null, "Data caveat", "Write down every assumption a number depends on. Finance will ask."],
      ],
      out: `machine         ts                   made_this_hour
Char Station 2  2026-11-07 05:00:00  40
Char Station 2  2026-11-07 06:00:00  41
Char Station 2  2026-11-07 07:00:00  40
Char Station 2  2026-11-07 08:00:00  40
Char Station 2  2026-11-07 09:00:00  41
Char Station 2  2026-11-07 10:00:00  40
Conveyor 3      2026-11-07 05:00:00  41
Conveyor 3      2026-11-07 06:00:00  42
Conveyor 3      2026-11-07 07:00:00  47
Conveyor 3      2026-11-07 08:00:00  47
Conveyor 3      2026-11-07 09:00:00  47
Conveyor 3      2026-11-07 10:00:00  43
Hoop Driver 1   2026-11-07 05:00:00  37
Hoop Driver 1   2026-11-07 06:00:00  38
Hoop Driver 1   2026-11-07 07:00:00  37
Hoop Driver 1   2026-11-07 08:00:00  35
Hoop Driver 1   2026-11-07 09:00:00  36
Hoop Driver 1   2026-11-07 10:00:00  35`,
    },
    {
      lang: "sql",
      file: "pareto_cumulative.sql",
      t: "Cumulative Pareto",
      goal: "Total minutes per fault in a CTE, then add cum_pct: the running share of all downtime, largest first.",
      code: `DECLARE @now DATETIME = '2026-11-07 10:15';

WITH p AS (
    SELECT fault,
        SUM(DATEDIFF(SECOND, start_ts, ISNULL(end_ts, @now))) / 60.0 AS minutes
    FROM fault_log
    GROUP BY fault
)
SELECT fault,
    minutes,
    SUM(minutes) OVER (ORDER BY minutes DESC ROWS UNBOUNDED PRECEDING) * 100.0
        / SUM(minutes) OVER () AS cum_pct
FROM p
ORDER BY minutes DESC;`,
      about: "Two window sums: a running total down the sorted list, and a grand total with an empty OVER(). Their ratio is the Pareto line. ROWS UNBOUNDED PRECEDING keeps the running total correct even when two faults tie on minutes. Here the losses are spread out: it takes four of five causes to pass 80%.",
      terms: [
        ["ROWS", "ROWS UNBOUNDED PRECEDING", "Running total from the first row through the current one."],
        ["OVER", "OVER ()", "An empty window: the whole result set. Gives the grand total on every row."],
        ["cum_pct", "cum_pct", "Cumulative percent. Where it crosses 80% marks the vital few."],
      ],
      out: `fault         minutes    cum_pct
Low air       87.433333  29.087884
Char flare    70.050000  52.392570
Hoop misfeed  66.566666  74.538397
Jam           65.733333  96.406986
E-stop        10.800000  100.000000`,
    },
    {
      lang: "sql",
      file: "views.sql",
      t: "Save it as a view",
      goal: "Create v_fault_minutes: machine, area, fault, start_ts and minutes, joining fault_log to dim_machine.",
      code: `CREATE VIEW v_fault_minutes AS
SELECT f.machine,
    m.area,
    f.fault,
    f.start_ts,
    DATEDIFF(SECOND, f.start_ts, ISNULL(f.end_ts, GETDATE())) / 60.0 AS minutes
FROM fault_log AS f
JOIN dim_machine AS m
    ON m.machine = f.machine;`,
      about: "You have typed the same DATEDIFF logic six times. A view saves the query under a name so Python, Power BI and anyone else get identical minutes. In SQL Server, CREATE VIEW must be the only statement in its batch, so it lives in its own file or after a GO. A view cannot use a variable, so it goes back to GETDATE(): open faults count up to the moment the view is queried.",
      terms: [
        ["VIEW", "CREATE VIEW … AS", "Saves a SELECT under a name. Query it like a table; it stores no data itself."],
        ["v_fault_minutes", "v_ prefix", "Naming habit that tells readers it is a view, not a table."],
        [null, "One definition", "Every report built on the view counts minutes the same way, so numbers reconcile."],
      ],
      out: `Commands completed successfully.

SELECT TOP 3 * FROM v_fault_minutes ORDER BY start_ts;
machine        area      fault         start_ts             minutes
Hoop Driver 1  Assembly  Hoop misfeed  2026-10-31 14:37:59  5.700000
Conveyor 3     Assembly  E-stop        2026-10-31 21:11:40  3.316666
Hoop Driver 1  Assembly  Hoop misfeed  2026-11-01 01:04:59  4.033333`,
    },
    {
      lang: "python",
      file: "analysis.py",
      t: "Pull the view into pandas",
      goal: "Import pandas and pyodbc, connect to PlantDB on plant-sql01 with Windows login, read the last 7 days of v_fault_minutes into df, and print the first rows.",
      code: `import pandas as pd
import pyodbc

conn = pyodbc.connect(
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=plant-sql01;DATABASE=PlantDB;"
    "Trusted_Connection=yes;TrustServerCertificate=yes;"
)
query = (
    "SELECT * FROM v_fault_minutes "
    "WHERE start_ts >= DATEADD(DAY, -7, GETDATE())"
)
df = pd.read_sql(query, conn)
print(df.head())`,
      about: "pyodbc opens the database connection; pandas.read_sql runs the query and returns a DataFrame, a table you can compute on. Trusted_Connection uses your Windows login, so no password lives in the script. pandas may warn that it prefers SQLAlchemy connections; pyodbc still works.",
      terms: [
        ["import", "import … as pd", "Loads a library under a short alias. pd is the universal nickname for pandas."],
        ["connect", "pyodbc.connect(…)", "Opens a connection using an ODBC connection string."],
        ["read_sql", "pd.read_sql(query, conn)", "Runs the SQL and returns the rows as a DataFrame."],
        ["head", "df.head()", "Shows the first 5 rows. Always look at your data before computing on it."],
      ],
      out: `         machine      area         fault             start_ts    minutes
0  Hoop Driver 1  Assembly  Hoop misfeed  2026-10-31 14:37:59   5.700000
1     Conveyor 3  Assembly        E-stop  2026-10-31 21:11:40   3.316667
2  Hoop Driver 1  Assembly  Hoop misfeed  2026-11-01 01:04:59   4.033333
3     Conveyor 3  Assembly           Jam  2026-11-01 01:36:12   4.616667
4  Hoop Driver 1  Assembly       Low air  2026-11-01 02:54:37  17.850000`,
    },
    {
      lang: "python",
      file: "analysis.py",
      t: "Add shift columns",
      goal: "Convert start_ts to a datetime, add an hour column, and set shift to A for hours 6–13, B for 14–21, C otherwise.",
      code: `df["start_ts"] = pd.to_datetime(df["start_ts"])
df["hour"] = df["start_ts"].dt.hour
df["shift"] = "C"
df.loc[df["hour"].between(6, 13), "shift"] = "A"
df.loc[df["hour"].between(14, 21), "shift"] = "B"
print(df[["fault", "hour", "shift"]].head())`,
      about: "Same shift rule as the SQL CTE, done in pandas. Start everything at C, then overwrite the rows that match A and B. .loc[rows, column] selects and assigns in one step.",
      terms: [
        ["to_datetime", "pd.to_datetime", "Turns text or database timestamps into real datetimes."],
        ["dt", ".dt.hour", "Datetime accessor. Also .dt.date, .dt.dayofweek and more."],
        ["loc", "df.loc[rows, col] = x", "Assign x to the column only on rows where the condition is true."],
        ["between", ".between(6, 13)", "Inclusive range check, like SQL BETWEEN."],
      ],
      out: `          fault  hour shift
0  Hoop misfeed    14     B
1        E-stop    21     B
2  Hoop misfeed     1     C
3           Jam     1     C
4       Low air     2     C`,
    },
    {
      lang: "python",
      file: "analysis.py",
      t: "Fault × shift pivot",
      goal: "Build a pivot of total minutes with faults as rows and shifts as columns, filling gaps with 0, and print it to 1 decimal.",
      code: `pivot = df.pivot_table(
    index="fault",
    columns="shift",
    values="minutes",
    aggfunc="sum",
    fill_value=0,
)
print(pivot.round(1))`,
      about: "A pivot is the Excel PivotTable in code. Reading across a row shows which shift each fault hits hardest: Char flare and Low air pile up on C shift, which points at nights.",
      terms: [
        ["pivot_table", ".pivot_table(…)", "Groups by index and columns, then aggregates values."],
        ["aggfunc", "aggfunc=\"sum\"", "How to combine values in each cell. \"mean\" and \"count\" also work."],
        ["fill_value", "fill_value=0", "Puts 0 in empty cells instead of NaN."],
      ],
      out: `shift            A     B     C
fault                         
Char flare     8.0  23.0  39.0
E-stop         0.0   7.6   3.2
Hoop misfeed  13.8  36.4  16.4
Jam           32.5   9.9  23.3
Low air       16.8  28.7  41.9`,
    },
    {
      lang: "python",
      file: "analysis.py",
      t: "Pareto with the vital few",
      goal: "Sum minutes by fault, largest first, add cum_pct, and flag vital_few for every fault that starts below 80% cumulative.",
      code: `pareto = df.groupby("fault")["minutes"].sum().sort_values(ascending=False)
pareto = pareto.to_frame()
pareto["cum_pct"] = pareto["minutes"].cumsum() / pareto["minutes"].sum() * 100
pareto["vital_few"] = pareto["cum_pct"].shift(fill_value=0) < 80
print(pareto.round(1))`,
      about: "cumsum gives the running total. The vital_few test uses shift() so each fault is judged by where the line stood before it, which includes the fault that crosses 80%. Same numbers as the SQL version, which is the point: two methods, one answer.",
      terms: [
        ["groupby", ".groupby(\"fault\")", "Split rows into groups by fault."],
        ["cumsum", ".cumsum()", "Running total down the column."],
        ["shift", ".shift(fill_value=0)", "Moves values down one row. The first row gets 0."],
        ["to_frame", ".to_frame()", "Turns a single column (Series) into a table so you can add columns."],
      ],
      out: `              minutes  cum_pct  vital_few
fault                                    
Low air          87.4     29.1       True
Char flare       70.0     52.4       True
Hoop misfeed     66.6     74.5       True
Jam              65.7     96.4       True
E-stop           10.8    100.0      False`,
    },
    {
      lang: "python",
      file: "analysis.py",
      t: "MTTR and MTBF",
      goal: "Per machine, count faults and total down minutes, then compute MTTR in minutes and MTBF in hours for a 7-day, 3-shift, 8-hour schedule.",
      code: `per_machine = df.groupby("machine").agg(
    faults=("minutes", "count"),
    down_min=("minutes", "sum"),
)
per_machine["mttr_min"] = per_machine["down_min"] / per_machine["faults"]

scheduled_min = 7 * 3 * 8 * 60
run_min = scheduled_min - per_machine["down_min"]
per_machine["mtbf_hr"] = run_min / per_machine["faults"] / 60
print(per_machine.round(1))`,
      about: "MTTR (mean time to repair) is how long a stop lasts on average. MTBF (mean time between failures) is how long the machine runs between stops. Conveyor 3 stops most often but recovers fastest; Char Station 2 stops least but each stop runs long. They need different fixes: prevention for one, faster recovery for the other.",
      terms: [
        ["agg", ".agg(name=(col, func))", "Several named summaries in one pass."],
        ["mttr_min", "MTTR", "Down minutes ÷ faults."],
        ["mtbf_hr", "MTBF", "Run time ÷ faults. Run time is scheduled time minus downtime."],
        ["scheduled_min", "scheduled_min", "7 days × 3 shifts × 8 hours × 60 = 10,080 minutes."],
      ],
      out: `                faults  down_min  mttr_min  mtbf_hr
machine                                            
Char Station 2      10      87.0       8.7     16.7
Conveyor 3          19      99.4       5.2      8.8
Hoop Driver 1       18     114.2       6.3      9.2`,
    },
    {
      lang: "python",
      file: "analysis.py",
      t: "Export for the report",
      goal: "Write the Pareto, the shift pivot and the reliability table to downtime_week.xlsx as three sheets.",
      code: `with pd.ExcelWriter("downtime_week.xlsx") as xl:
    pareto.to_excel(xl, sheet_name="Pareto")
    pivot.to_excel(xl, sheet_name="By Shift")
    per_machine.to_excel(xl, sheet_name="Reliability")
print("Saved downtime_week.xlsx")`,
      about: "ExcelWriter opens one workbook and each to_excel call adds a sheet. The with block saves and closes the file when it ends. The next track, OEE Loss Report, picks up from here.",
      terms: [
        ["ExcelWriter", "pd.ExcelWriter", "Opens a workbook for writing several sheets. Uses openpyxl under the hood."],
        ["with", "with … as xl:", "Closes and saves the file automatically at the end of the block."],
        ["to_excel", ".to_excel(xl, sheet_name=…)", "Writes a DataFrame to one sheet."],
      ],
      out: `Saved downtime_week.xlsx

downtime_week.xlsx → sheets: Pareto, By Shift, Reliability`,
    },
  ],
});
