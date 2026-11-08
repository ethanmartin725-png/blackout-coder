// Foundations lane: SQL
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
// Uses the canonical sample tables (fault_log, dim_machine, handoff_note). Outputs come from running each lesson
// on SQL Server: node tools/output-checks/foundations/run.mjs
BC.addLane({
  id: "sql",
  name: "SQL",
  lang: "sql",
  lessons: [
    {
      t: "Select columns",
      goal: "List machine, area and ideal_rate_hr from dim_machine.",
      code: `SELECT machine, area, ideal_rate_hr
FROM dim_machine;`,
      about: "The simplest query: pick columns, name the table. dim_machine holds one row per machine, so all three come back. It is the same table the DB Pulls & Analytics track builds. With no ORDER BY, SQL Server returns rows in whatever order is cheapest, here the primary key; add ORDER BY whenever order matters.",
      terms: [
        ["SELECT", "SELECT", "Names the columns you want back."],
        ["FROM", "FROM", "The table to read."],
        [";", ";", "Ends the statement."],
      ],
      out: `machine         area       ideal_rate_hr
Char Station 2  Finishing  50
Conveyor 3      Assembly   60
Hoop Driver 1   Assembly   55`,
    },
    {
      t: "Filter and sort",
      goal: "From fault_log, show machine, fault and start_ts for Low air faults, newest first.",
      code: `SELECT machine, fault, start_ts
FROM fault_log
WHERE fault = 'Low air'
ORDER BY start_ts DESC;`,
      about: "WHERE throws out rows before anything is returned. Text values go in single quotes. ORDER BY sorts what is left, and DESC puts the newest first.",
      terms: [
        ["WHERE", "WHERE", "Keeps only rows that pass the test."],
        ["'Low air'", "'text'", "Text values go in single quotes. Double quotes mean a name in SQL Server, not text."],
        ["DESC", "ORDER BY … DESC", "Sorts largest or newest first. ASC, the default, is smallest first."],
      ],
      out: `machine         fault    start_ts
Conveyor 3      Low air  2026-11-06 18:56:38
Hoop Driver 1   Low air  2026-11-04 11:42:21
Conveyor 3      Low air  2026-11-03 04:30:21
Char Station 2  Low air  2026-11-02 17:29:13
Hoop Driver 1   Low air  2026-11-01 02:54:37`,
    },
    {
      t: "Group and total",
      goal: "Count faults per machine as faults, most first.",
      code: `SELECT machine, COUNT(*) AS faults
FROM fault_log
GROUP BY machine
ORDER BY faults DESC;`,
      about: "GROUP BY collapses the fault rows into one row per machine. COUNT(*) counts the rows in each group. AS names the new column, and ORDER BY can sort by that name.",
      terms: [
        ["GROUP BY", "GROUP BY", "One output row per distinct value."],
        ["COUNT", "COUNT(*)", "How many rows are in each group."],
        ["AS", "AS", "Names a computed column."],
      ],
      out: `machine         faults
Conveyor 3      19
Hoop Driver 1   18
Char Station 2  10`,
    },
    {
      t: "Join two tables",
      goal: "Join fault_log (alias f) to dim_machine (alias m) on machine and count faults by area, most first.",
      code: `SELECT m.area, COUNT(*) AS faults
FROM fault_log AS f
JOIN dim_machine AS m
    ON m.machine = f.machine
GROUP BY m.area
ORDER BY faults DESC;`,
      about: "fault_log records events; dim_machine describes the machines. The join matches each fault to its machine's row, so faults can be totaled by area, a column fault_log does not have. The short aliases f and m keep every column reference clear about which table it comes from.",
      terms: [
        ["JOIN", "JOIN … ON", "Combines rows from two tables where the ON condition matches."],
        ["AS m", "Alias", "A short name for a table inside this query."],
        ["m.area", "m.area", "Table alias, dot, column. Needed when both tables could have the name."],
      ],
      out: `area       faults
Assembly   37
Finishing  10`,
    },
    {
      t: "Top 10 reasons",
      goal: "Top 10 fault types by event count since 2026-11-01, from fault_log. Break ties alphabetically.",
      code: `SELECT TOP 10 fault, COUNT(*) AS events
FROM fault_log
WHERE start_ts >= '2026-11-01'
GROUP BY fault
ORDER BY events DESC, fault;`,
      about: "A Pareto by count in one query: count events per fault, sort descending, keep the first ten. This plant logs only five fault types, so all five come back. The second sort column decides ties, so the order is the same on every run. Counting events and totaling minutes can rank faults differently; the DB track's Pareto ranks by minutes.",
      terms: [
        ["TOP", "TOP 10", "Returns at most the first 10 rows after sorting. SQL Server syntax; other databases use LIMIT."],
        ["'2026-11-01'", "Date literal", "A date in single quotes. The year-month-day form reads the same on every server."],
        ["fault;", "Tie-breaker", "A second ORDER BY column decides rows the first one ties on."],
      ],
      out: `fault         events
Jam           17
Hoop misfeed  11
Char flare    8
Low air       5
E-stop        4`,
    },
    {
      t: "Label with CASE",
      goal: "For each fault type, show its event count and a reason_group: Jam and Hoop misfeed are Mechanical, Low air is Utility, E-stop is Safety, anything else is Process.",
      code: `SELECT fault,
    COUNT(*) AS events,
    CASE
        WHEN fault IN ('Jam', 'Hoop misfeed') THEN 'Mechanical'
        WHEN fault = 'Low air' THEN 'Utility'
        WHEN fault = 'E-stop' THEN 'Safety'
        ELSE 'Process'
    END AS reason_group
FROM fault_log
GROUP BY fault
ORDER BY events DESC, fault;`,
      about: "CASE is if/else inside a query. Each row is tested against the WHEN lines in order, and the first match supplies the label. These are the same groups the MES Helper track maps PLC faults into. ELSE catches anything not listed, so a new fault type still gets a label instead of NULL.",
      terms: [
        ["CASE", "CASE … END", "If/else inside a query. Returns one value per row."],
        ["IN", "IN (…)", "True if the value matches any item in the list."],
        ["ELSE", "ELSE", "The value when no WHEN matched. Without it, the result is NULL."],
      ],
      out: `fault         events  reason_group
Jam           17      Mechanical
Hoop misfeed  12      Mechanical
Char flare    8       Process
E-stop        5       Safety
Low air       5       Utility`,
    },
    {
      t: "Create a table",
      goal: "Create dim_machine with machine (VARCHAR 50, primary key), area (VARCHAR 30), ideal_rate_hr (INT) and margin_per_barrel (DECIMAL 8,2), all required.",
      code: `CREATE TABLE dim_machine (
    machine VARCHAR(50) PRIMARY KEY,
    area VARCHAR(30) NOT NULL,
    ideal_rate_hr INT NOT NULL,
    margin_per_barrel DECIMAL(8,2) NOT NULL
);`,
      about: "This defines structure, not data. Each line inside the parentheses is a column: name, type, then rules. DECIMAL(8,2) stores money exactly with 2 decimal places, where FLOAT would round. The DB track creates this same table and fills it with the three machines every other lesson in this lane uses.",
      terms: [
        ["PRIMARY KEY", "PRIMARY KEY", "Uniquely identifies each row. No duplicates, no NULLs."],
        ["NOT NULL", "NOT NULL", "The column is required."],
        ["DECIMAL", "DECIMAL(8,2)", "An exact number: 8 digits in total, 2 after the decimal point."],
      ],
    },
    {
      t: "NULL means no value",
      goal: "Show machine, fault, start_ts and an ended column for every fault that is still open or started since 2026-11-07 06:00. Show the end time as text, or 'still open' if there is none. Oldest first.",
      code: `SELECT machine, fault, start_ts,
    ISNULL(CONVERT(VARCHAR(19), end_ts, 120), 'still open') AS ended
FROM fault_log
WHERE end_ts IS NULL
    OR start_ts >= '2026-11-07 06:00'
ORDER BY start_ts;`,
      about: "NULL means no value yet: not zero and not blank. A fault that is still running has no end time, so its end_ts is NULL. Test for it with IS NULL; end_ts = NULL is never true, not even when end_ts is NULL. ISNULL swaps in a value for display, and CONVERT style 120 turns the date into text first, so both choices are text.",
      terms: [
        ["IS NULL", "IS NULL", "The only reliable test for a missing value. = NULL never matches."],
        ["ISNULL", "ISNULL(value, fallback)", "Returns the fallback when the value is NULL. COALESCE does the same with more than two choices."],
        ["CONVERT", "CONVERT(VARCHAR(19), x, 120)", "Date to text. Style 120 is yyyy-mm-dd hh:mi:ss."],
      ],
      out: `machine        fault         start_ts             ended
Conveyor 3     Jam           2026-11-07 09:08:52  2026-11-07 09:13:29
Hoop Driver 1  Hoop misfeed  2026-11-07 10:09:40  still open`,
    },
    {
      t: "Minutes between two times",
      goal: "With @now set to 2026-11-07 10:15, list machine, fault, start_ts and minutes (2 decimals, open faults counted to @now) for faults that started in the last 12 hours, oldest first.",
      code: `DECLARE @now DATETIME = '2026-11-07 10:15';

SELECT machine, fault, start_ts,
    CAST(DATEDIFF(SECOND, start_ts, ISNULL(end_ts, @now)) / 60.0 AS DECIMAL(6,2)) AS minutes
FROM fault_log
WHERE start_ts >= DATEADD(HOUR, -12, @now)
ORDER BY start_ts;`,
      about: "DATEDIFF counts whole seconds between two times. Dividing by 60.0, not 60, keeps the decimals, and CAST rounds to 2 places. DATEADD moves a time by an amount, here back 12 hours. The variable @now stands in for GETDATE() so the results match the sample data, which ends at 10:15; on a live server you would use GETDATE().",
      terms: [
        ["DECLARE", "DECLARE @name TYPE = value", "A variable for the rest of the script. Names start with @."],
        ["DATEDIFF", "DATEDIFF(SECOND, a, b)", "How many second boundaries lie between a and b."],
        ["DATEADD", "DATEADD(HOUR, -12, x)", "x moved by 12 hours. Negative goes back."],
        ["CAST", "CAST(x AS DECIMAL(6,2))", "Converts to another type; here, rounds to 2 decimals."],
      ],
      out: `machine         fault         start_ts             minutes
Conveyor 3      Jam           2026-11-06 23:24:33  3.32
Char Station 2  Char flare    2026-11-07 04:10:06  11.95
Conveyor 3      Jam           2026-11-07 09:08:52  4.62
Hoop Driver 1   Hoop misfeed  2026-11-07 10:09:40  5.33`,
    },
    {
      t: "Keep every machine",
      goal: "For every machine in dim_machine, count its faults since 2026-11-07 06:00 as faults_this_shift, showing 0 for a machine with none.",
      code: `SELECT m.machine, COUNT(f.fault_id) AS faults_this_shift
FROM dim_machine AS m
LEFT JOIN fault_log AS f
    ON f.machine = m.machine
    AND f.start_ts >= '2026-11-07 06:00'
GROUP BY m.machine
ORDER BY m.machine;`,
      about: "A LEFT JOIN keeps every row from the left table, even when nothing on the right matches. Two details make the zero appear. The time filter sits in the ON clause, because a WHERE on f.start_ts would throw the unmatched machine away. And COUNT(f.fault_id) counts only matched rows, where COUNT(*) would count the empty match as 1.",
      terms: [
        ["LEFT JOIN", "LEFT JOIN", "Every row from the left table, plus matches from the right where they exist."],
        ["AND f.start_ts", "Filter in ON", "Keeps the unmatched machine. The same test in WHERE would drop it."],
        ["COUNT(f.fault_id)", "COUNT(column)", "Counts non-NULL values, so a machine with no match counts 0."],
      ],
      out: `machine         faults_this_shift
Char Station 2  0
Conveyor 3      1
Hoop Driver 1   1`,
    },
    {
      t: "Add and change rows",
      goal: "Insert J. Ruiz's shift A note for Hoop Driver 1 dated 2026-11-07, acknowledge every open note as D. Park at 14:20, then list author, machine and ack_by in the order the notes were made.",
      code: `INSERT INTO handoff_note (shift_date, shift, machine, author, note)
VALUES ('2026-11-07', 'A', 'Hoop Driver 1', 'J. Ruiz', 'Low air twice on Hoop Driver 1. Compressor tech called.');

UPDATE handoff_note
SET ack_by = 'D. Park', ack_ts = '2026-11-07 14:20'
WHERE ack_by IS NULL;

SELECT author, machine, ack_by
FROM handoff_note
ORDER BY note_id;`,
      about: "INSERT adds a row. Columns you leave out take their default or NULL, which is how created_ts gets filled in. UPDATE changes existing rows, and its WHERE decides which: without one, every row in the table changes. Run the same WHERE as a SELECT first to see what you are about to change. Typed values are fine in a script you run by hand; from Python or C#, pass them as parameters. This is the same note and acknowledgement as the Shift Handoff track.",
      terms: [
        ["INSERT", "INSERT INTO … VALUES", "Adds a row. List the columns, then their values in the same order."],
        ["UPDATE", "UPDATE … SET", "Changes columns in rows that already exist."],
        ["WHERE ack_by", "WHERE on UPDATE", "Limits which rows change. Leave it off and every row changes."],
      ],
      out: `(1 row affected)

(3 rows affected)

author     machine         ack_by
T. Nguyen  Char Station 2  D. Park
T. Nguyen  NULL            D. Park
J. Ruiz    Hoop Driver 1   D. Park`,
    },
    {
      t: "Build it in steps",
      goal: "With @now at 2026-11-07 10:15, use a CTE named down for each machine's total fault minutes (open faults counted to @now), then join dim_machine for down_min (1 decimal) and lost_dollars (2 decimals), largest first.",
      code: `DECLARE @now DATETIME = '2026-11-07 10:15';

WITH down AS (
    SELECT machine,
        SUM(DATEDIFF(SECOND, start_ts, ISNULL(end_ts, @now))) / 60.0 AS down_min
    FROM fault_log
    GROUP BY machine
)
SELECT d.machine,
    CAST(d.down_min AS DECIMAL(8,1)) AS down_min,
    CAST(d.down_min / 60.0 * m.ideal_rate_hr * m.margin_per_barrel AS DECIMAL(10,2)) AS lost_dollars
FROM down AS d
JOIN dim_machine AS m
    ON m.machine = d.machine
ORDER BY lost_dollars DESC;`,
      about: "A CTE (WITH … AS) names an intermediate result so the final query reads in steps: first minutes per machine, then dollars. Lost dollars are minutes ÷ 60 × ideal barrels per hour × margin per barrel, the same rule as the DB track. The three rows add up to $11,753.78, one cent under the DB track's $11,753.79 for all 47 faults, because here each machine is rounded before adding; round once at the end when the total is the number you report. The statement before WITH must end with a semicolon, or SQL Server reads WITH as part of it.",
      terms: [
        ["WITH", "WITH name AS (…)", "A common table expression: a named query the next statement can use like a table."],
        ["down", "down", "The CTE's name. It only exists for the statement right after it."],
        ["margin_per_barrel", "Dollars", "Minutes ÷ 60 × barrels per hour × margin per barrel."],
      ],
      out: `machine         down_min  lost_dollars
Hoop Driver 1   114.2     4448.39
Conveyor 3      99.4      4222.37
Char Station 2  87.1      3083.02`,
    },
    {
      t: "Time between failures",
      goal: "For Char Station 2, list start_ts, fault, and hours_since_last: hours (1 decimal) from the previous fault's end to this fault's start, oldest first.",
      code: `SELECT start_ts,
    fault,
    CAST(DATEDIFF(SECOND, LAG(end_ts) OVER (ORDER BY start_ts), start_ts) / 3600.0 AS DECIMAL(6,1)) AS hours_since_last
FROM fault_log
WHERE machine = 'Char Station 2'
ORDER BY start_ts;`,
      about: "LAG reads a value from the previous row without joining the table to itself. OVER (ORDER BY start_ts) defines what previous means, and the WHERE runs first, so previous means this machine's previous fault. The first row has no previous fault, so it gets NULL. The gaps are run time between failures: averaging them estimates mean time between failures directly, where the DB track's MTBF divides total uptime by the fault count.",
      terms: [
        ["LAG", "LAG(column)", "The value from the previous row in the window."],
        ["OVER", "OVER (ORDER BY …)", "Makes LAG a window function and sets the row order it looks back through."],
        ["3600.0", "3600.0", "Seconds per hour, written with a decimal so the result keeps its decimals."],
      ],
      out: `start_ts             fault       hours_since_last
2026-11-01 02:59:50  Char flare  NULL
2026-11-01 10:15:03  Char flare  7.1
2026-11-01 14:31:53  E-stop      4.1
2026-11-01 20:25:53  Char flare  5.9
2026-11-01 21:28:26  Char flare  0.9
2026-11-02 17:29:13  Low air     19.9
2026-11-03 21:15:10  Char flare  27.5
2026-11-06 01:14:26  Char flare  51.9
2026-11-06 05:22:19  Char flare  4.0
2026-11-07 04:10:06  Char flare  22.6`,
    },
  ],
});
