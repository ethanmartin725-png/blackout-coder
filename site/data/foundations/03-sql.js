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
    {
      t: "Filter groups with HAVING",
      goal: "Count faults by type and keep only the types with more than 5 events, most first.",
      code: `SELECT fault, COUNT(*) AS events
FROM fault_log
GROUP BY fault
HAVING COUNT(*) > 5
ORDER BY events DESC;`,
      about: "WHERE filters rows before they are grouped; HAVING filters the groups after. A condition on a total, like COUNT(*) > 5, can only go in HAVING, because the total does not exist until the rows are grouped.",
      terms: [
        ["HAVING", "HAVING", "A filter on groups, applied after GROUP BY."],
        ["COUNT(*) > 5", "Condition on a total", "Uses the aggregate. WHERE cannot see it."],
      ],
      out: `fault         events
Jam           17
Hoop misfeed  12
Char flare    8`,
    },
    {
      t: "Distinct values",
      goal: "List each distinct fault name once, alphabetically. Then for each machine show its fault count and how many different fault types it had.",
      code: `SELECT DISTINCT fault
FROM fault_log
ORDER BY fault;

SELECT machine,
    COUNT(*) AS faults,
    COUNT(DISTINCT fault) AS fault_types
FROM fault_log
GROUP BY machine
ORDER BY machine;`,
      about: "DISTINCT removes duplicate rows from a result. COUNT(DISTINCT x) counts different values instead of rows. A machine with many faults of one type has a single problem to chase; one with many types needs a broader look.",
      terms: [
        ["DISTINCT", "SELECT DISTINCT", "Returns each different row once."],
        ["COUNT(DISTINCT fault)", "COUNT(DISTINCT x)", "How many different values, ignoring repeats."],
      ],
      out: `fault
Char flare
E-stop
Hoop misfeed
Jam
Low air

machine         faults  fault_types
Char Station 2  10      3
Conveyor 3      19      3
Hoop Driver 1   18      4`,
    },
    {
      t: "Date ranges done right",
      goal: "With @week_start 2026-10-31 06:00 and @week_end 2026-11-07 06:00, count the faults that started in the week using >= and <, next to the count of all faults.",
      code: `DECLARE @week_start DATETIME = '2026-10-31 06:00';
DECLARE @week_end DATETIME = '2026-11-07 06:00';

SELECT COUNT(*) AS in_week,
    (SELECT COUNT(*) FROM fault_log) AS all_faults
FROM fault_log
WHERE start_ts >= @week_start
    AND start_ts < @week_end;`,
      about: "A time window should include its start and exclude its end: >= start and < end. Then back-to-back windows never share a moment, and nothing is counted twice or dropped. BETWEEN includes both ends, so a fault starting exactly at 06:00 would land in two weeks. This is the OEE Loss Report track's week: 45 of the 47 faults fall inside it.",
      terms: [
        [">=", ">= start AND < end", "A half-open window. Back-to-back windows meet without overlapping."],
        [null, "BETWEEN (the trap)", "Includes both ends. Fine for whole numbers, risky for times."],
      ],
      out: `in_week  all_faults
45       47`,
    },
    {
      t: "Match text",
      goal: "List machine, fault and start_ts for every fault whose name contains \"air\", plus E-stops on Conveyor 3 or Char Station 2, oldest first.",
      code: `SELECT machine, fault, start_ts
FROM fault_log
WHERE fault LIKE '%air%'
    OR (machine IN ('Conveyor 3', 'Char Station 2') AND fault = 'E-stop')
ORDER BY start_ts;`,
      about: "LIKE matches a pattern: % stands for any run of characters, so '%air%' finds air anywhere in the name. The default SQL Server collation ignores case, so it also matches \"Air\". IN is shorthand for several = tests joined by OR. The parentheses keep the AND with its own machine list.",
      terms: [
        ["LIKE", "LIKE '%air%'", "Pattern match. % is any characters, _ is exactly one."],
        ["IN", "IN (…)", "Matches any value in the list."],
        ["(machine", "Parentheses", "Group the AND so it does not swallow the OR."],
      ],
      out: `machine         fault    start_ts
Conveyor 3      E-stop   2026-10-31 21:11:40
Hoop Driver 1   Low air  2026-11-01 02:54:37
Char Station 2  E-stop   2026-11-01 14:31:53
Char Station 2  Low air  2026-11-02 17:29:13
Conveyor 3      Low air  2026-11-03 04:30:21
Hoop Driver 1   Low air  2026-11-04 11:42:21
Conveyor 3      E-stop   2026-11-05 04:24:39
Conveyor 3      Low air  2026-11-06 18:56:38
Conveyor 3      E-stop   2026-11-06 20:45:52`,
    },
    {
      t: "Subquery in WHERE",
      goal: "Print the average length of a closed fault in minutes, then list the closed faults longer than that average with their minutes, longest first.",
      code: `SELECT CAST(AVG(DATEDIFF(SECOND, start_ts, end_ts) / 60.0) AS DECIMAL(6,2)) AS avg_min
FROM fault_log
WHERE end_ts IS NOT NULL;

SELECT machine, fault, start_ts,
    CAST(DATEDIFF(SECOND, start_ts, end_ts) / 60.0 AS DECIMAL(6,2)) AS minutes
FROM fault_log
WHERE end_ts IS NOT NULL
    AND DATEDIFF(SECOND, start_ts, end_ts) / 60.0 >
        (SELECT AVG(DATEDIFF(SECOND, start_ts, end_ts) / 60.0) FROM fault_log WHERE end_ts IS NOT NULL)
ORDER BY minutes DESC;`,
      about: "A subquery is a query inside another one. This one returns a single value, the average, which the outer WHERE compares each fault against. Dividing by 60.0 inside the AVG keeps the decimals; averaging whole seconds first would truncate. The open fault is left out because it has no length yet.",
      terms: [
        ["(SELECT AVG", "Scalar subquery", "A query that returns one value, used like a number."],
        ["AVG", "AVG()", "The mean of a column."],
        ["IS NOT NULL", "IS NOT NULL", "Closed faults only."],
      ],
      out: `avg_min
6.42

machine         fault         start_ts             minutes
Conveyor 3      Low air       2026-11-03 04:30:21  24.08
Hoop Driver 1   Low air       2026-11-01 02:54:37  17.85
Hoop Driver 1   Low air       2026-11-04 11:42:21  16.77
Char Station 2  Low air       2026-11-02 17:29:13  15.92
Conveyor 3      Low air       2026-11-06 18:56:38  12.82
Char Station 2  Char flare    2026-11-07 04:10:06  11.95
Char Station 2  Char flare    2026-11-01 20:25:53  10.85
Char Station 2  Char flare    2026-11-06 05:22:19  10.53
Char Station 2  Char flare    2026-11-01 02:59:50  8.72
Hoop Driver 1   Hoop misfeed  2026-11-04 18:20:57  8.27
Hoop Driver 1   Hoop misfeed  2026-11-05 17:44:06  8.23
Char Station 2  Char flare    2026-11-01 10:15:03  7.98
Char Station 2  Char flare    2026-11-06 01:14:26  7.83
Hoop Driver 1   Hoop misfeed  2026-11-06 00:06:36  7.23
Char Station 2  Char flare    2026-11-03 21:15:10  7.15`,
    },
    {
      t: "Check for a match",
      goal: "For every machine, show DOWN if fault_log has an open fault for it and running otherwise.",
      code: `SELECT m.machine,
    CASE WHEN EXISTS (
        SELECT 1
        FROM fault_log AS f
        WHERE f.machine = m.machine
            AND f.end_ts IS NULL
    ) THEN 'DOWN' ELSE 'running' END AS status
FROM dim_machine AS m
ORDER BY m.machine;`,
      about: "EXISTS is true as soon as the subquery finds one row, so it answers yes-or-no questions without counting. The subquery refers to m.machine from the outer query, so it is re-checked for each machine. The sample data ends at 10:15 on 2026-11-07, with the Hoop Driver 1 misfeed still open.",
      terms: [
        ["EXISTS", "EXISTS (…)", "True if the subquery returns at least one row."],
        ["SELECT 1", "SELECT 1", "What the subquery returns does not matter, only whether it returns anything."],
        ["m.machine", "Correlated subquery", "Uses a column from the outer query, so it runs once per outer row."],
      ],
      out: `machine         status
Char Station 2  running
Conveyor 3      running
Hoop Driver 1   DOWN`,
    },
    {
      t: "Stack results",
      goal: "Build one timeline since midnight on 2026-11-07: fault starts labelled \"Fault: \" plus the fault, and handoff notes labelled \"Note: \" plus the author, with ts and machine, in time order.",
      code: `SELECT start_ts AS ts, machine, 'Fault: ' + fault AS event
FROM fault_log
WHERE start_ts >= '2026-11-07'
UNION ALL
SELECT created_ts, machine, 'Note: ' + author
FROM handoff_note
ORDER BY ts;`,
      about: "UNION ALL stacks the rows of two queries. Both must return the same number of columns in compatible types, and the column names come from the first query. ORDER BY goes once, at the very end, and sorts the combined result. UNION without ALL also removes duplicate rows, which costs a sort you rarely need.",
      terms: [
        ["UNION ALL", "UNION ALL", "Appends the second result's rows to the first."],
        ["AS ts", "Column names", "Taken from the first query. Name them there."],
        ["ORDER BY ts", "One ORDER BY", "Sorts the combined rows. It must be last."],
      ],
      out: `ts                   machine         event
2026-11-07 04:10:06  Char Station 2  Fault: Char flare
2026-11-07 05:52:00  Char Station 2  Note: T. Nguyen
2026-11-07 05:55:00  NULL            Note: T. Nguyen
2026-11-07 09:08:52  Conveyor 3      Fault: Jam
2026-11-07 10:09:40  Hoop Driver 1   Fault: Hoop misfeed`,
    },
    {
      t: "Build labels",
      goal: "Make board labels like \"Conveyor 3: Jam at 09:08\" for faults since 2026-11-07 06:00. Then compare joining author, \" re \" and machine with + and with CONCAT for each handoff note.",
      code: `SELECT CONCAT(machine, ': ', fault, ' at ', FORMAT(start_ts, 'HH:mm')) AS label
FROM fault_log
WHERE start_ts >= '2026-11-07 06:00'
ORDER BY start_ts;

SELECT author + ' re ' + machine AS with_plus,
    CONCAT(author, ' re ', machine) AS with_concat
FROM handoff_note
ORDER BY note_id;`,
      about: "CONCAT joins text and treats NULL as empty. The + operator returns NULL if any piece is NULL, which is why the note about hoop stock, with no machine, vanishes in the first column. FORMAT turns a date into text with a .NET-style pattern; HH is the 24-hour clock. FORMAT is slow on large tables, so use it for display, not filtering.",
      terms: [
        ["CONCAT", "CONCAT(a, b, …)", "Joins text. NULL pieces count as empty."],
        ["FORMAT", "FORMAT(date, 'HH:mm')", "Date or number to text with a pattern."],
        ["+", "a + b with NULL", "Any NULL piece makes the whole result NULL."],
      ],
      out: `label
Conveyor 3: Jam at 09:08
Hoop Driver 1: Hoop misfeed at 10:09

with_plus                    with_concat
T. Nguyen re Char Station 2  T. Nguyen re Char Station 2
NULL                         T. Nguyen re`,
    },
    {
      t: "Number traps",
      goal: "Show 7 / 2, 7 / 2.0, Conveyor 3's 352 / 450 as integers, the same with a DECIMAL cast, and 352 × 100.0 / 450 rounded to 1 decimal.",
      code: `SELECT 7 / 2 AS int_division,
    7 / 2.0 AS decimal_division,
    352 / 450 AS pct_wrong,
    CAST(352 AS DECIMAL(9,4)) / 450 AS pct_right,
    ROUND(352 * 100.0 / 450, 1) AS pct_rounded;`,
      about: "When both sides are integers, SQL Server divides as integers and drops the remainder, so 352 / 450 is 0 and Conveyor 3's performance silently reads as zero. Making either side a decimal, with a CAST or a literal like 100.0, keeps the fraction. ROUND rounds the value but keeps the column's decimal places, which is why 78.2 still shows trailing zeros.",
      terms: [
        ["7 / 2", "Integer division", "Both sides whole numbers: the result is whole too, truncated."],
        ["2.0", "Decimal literal", "One decimal side makes the whole division decimal."],
        ["ROUND", "ROUND(x, 1)", "Rounds to 1 decimal place. The type and its scale stay the same."],
      ],
      out: `int_division  decimal_division  pct_wrong  pct_right   pct_rounded
3             3.500000          0          0.78222222  78.200000`,
    },
    {
      t: "Delete safely",
      goal: "Inside a transaction, delete every E-stop fault, count the faults left, roll back, and count again.",
      code: `BEGIN TRANSACTION;

DELETE FROM fault_log
WHERE fault = 'E-stop';

SELECT COUNT(*) AS faults_left
FROM fault_log;

ROLLBACK;

SELECT COUNT(*) AS faults_after_rollback
FROM fault_log;`,
      about: "A DELETE with the wrong WHERE cannot be undone once committed. Inside a transaction you can check the result and back out with ROLLBACK, or keep it with COMMIT. Write the WHERE as a SELECT first, check the row count it reports, then change SELECT to DELETE. A transaction left open also holds locks, so always finish it one way or the other.",
      terms: [
        ["BEGIN TRANSACTION", "BEGIN TRANSACTION", "Starts a unit of work that is not permanent until COMMIT."],
        ["DELETE", "DELETE FROM … WHERE", "Removes the rows the WHERE matches. No WHERE removes every row."],
        ["ROLLBACK", "ROLLBACK", "Undoes everything since BEGIN TRANSACTION."],
      ],
      out: `(5 rows affected)

faults_left
42

faults_after_rollback
47`,
    },
    {
      t: "Rules the database enforces",
      goal: "Add a foreign key from fault_log.machine to dim_machine and a check that end_ts is not before start_ts. Then try inserting a fault for Conveyor 9 and a fault that ends before it starts, catching each error and showing its number and message.",
      code: `ALTER TABLE fault_log
ADD CONSTRAINT fk_fault_machine FOREIGN KEY (machine) REFERENCES dim_machine (machine);

ALTER TABLE fault_log
ADD CONSTRAINT ck_fault_times CHECK (end_ts IS NULL OR end_ts >= start_ts);
GO

BEGIN TRY
    INSERT INTO fault_log (machine, fault, start_ts)
    VALUES ('Conveyor 9', 'Jam', '2026-11-07 10:20');
END TRY
BEGIN CATCH
    SELECT ERROR_NUMBER() AS error_number, ERROR_MESSAGE() AS message;
END CATCH;

BEGIN TRY
    INSERT INTO fault_log (machine, fault, start_ts, end_ts)
    VALUES ('Conveyor 3', 'Jam', '2026-11-07 10:20', '2026-11-07 10:10');
END TRY
BEGIN CATCH
    SELECT ERROR_NUMBER() AS error_number, ERROR_MESSAGE() AS message;
END CATCH;`,
      about: "Constraints are rules the database checks on every insert and update, from any program. The foreign key means a fault must name a machine that exists in dim_machine, so a typo like Conveyor 9 is refused instead of quietly creating a machine no report knows about. The CHECK refuses a fault that ends before it starts. TRY…CATCH lets the script handle the error instead of stopping. GO ends a batch, so the new constraints exist before the inserts are compiled.",
      terms: [
        ["FOREIGN KEY", "FOREIGN KEY … REFERENCES", "The value must exist in the other table."],
        ["CHECK", "CHECK (…)", "Every row must pass this test."],
        ["BEGIN TRY", "BEGIN TRY … BEGIN CATCH", "Runs the TRY block; on an error, runs the CATCH block instead of stopping."],
        ["GO", "GO", "Ends a batch in SSMS and sqlcmd. Not T-SQL itself, but every SQL Server tool understands it."],
      ],
      out: `error_number  message
547           The INSERT statement conflicted with the FOREIGN KEY constraint "fk_fault_machine". The conflict occurred in database "PlantDB", table "dbo.dim_machine", column 'machine'.

error_number  message
547           The INSERT statement conflicted with the CHECK constraint "ck_fault_times". The conflict occurred in database "PlantDB", table "dbo.fault_log".`,
    },
    {
      t: "Top one per group",
      goal: "For each machine, show its single longest closed fault: machine, fault, start_ts and minutes (2 decimals), longest first.",
      code: `WITH ranked AS (
    SELECT machine, fault, start_ts,
        DATEDIFF(SECOND, start_ts, end_ts) / 60.0 AS minutes,
        ROW_NUMBER() OVER (PARTITION BY machine ORDER BY DATEDIFF(SECOND, start_ts, end_ts) DESC) AS rn
    FROM fault_log
    WHERE end_ts IS NOT NULL
)
SELECT machine, fault, start_ts, CAST(minutes AS DECIMAL(6,2)) AS minutes
FROM ranked
WHERE rn = 1
ORDER BY minutes DESC;`,
      about: "ROW_NUMBER numbers rows 1, 2, 3 within each PARTITION BY group, in the order given. Keeping rn = 1 keeps each machine's top row. The filter has to go in an outer query, because window functions are calculated after WHERE. This is the standard answer to \"the worst one for each machine\".",
      terms: [
        ["ROW_NUMBER", "ROW_NUMBER()", "Numbers the rows in each partition, starting at 1."],
        ["PARTITION BY", "PARTITION BY machine", "Restarts the numbering for each machine."],
        ["rn = 1", "rn = 1", "Keeps the first row of each group."],
      ],
      out: `machine         fault    start_ts             minutes
Conveyor 3      Low air  2026-11-03 04:30:21  24.08
Hoop Driver 1   Low air  2026-11-01 02:54:37  17.85
Char Station 2  Low air  2026-11-02 17:29:13  15.92`,
    },
    {
      t: "Running totals",
      goal: "For Char Station 2's closed faults, oldest first, show start_ts and running_min: the down minutes so far, to 2 decimals.",
      code: `SELECT machine, start_ts,
    CAST(SUM(DATEDIFF(SECOND, start_ts, end_ts))
        OVER (PARTITION BY machine ORDER BY start_ts ROWS UNBOUNDED PRECEDING) / 60.0 AS DECIMAL(8,2)) AS running_min
FROM fault_log
WHERE machine = 'Char Station 2'
    AND end_ts IS NOT NULL
ORDER BY start_ts;`,
      about: "SUM with OVER (… ORDER BY …) adds up every row so far instead of collapsing them into one total. ROWS UNBOUNDED PRECEDING says \"from the first row to this one\". PARTITION BY machine restarts the total for each machine, so removing the WHERE gives every machine its own running line. The last row is Char Station 2's week, the 87.05 minutes the OEE track uses.",
      terms: [
        ["OVER", "SUM(…) OVER (…)", "A window sum: one total per row, without grouping rows away."],
        ["ROWS UNBOUNDED PRECEDING", "ROWS UNBOUNDED PRECEDING", "From the first row of the partition through the current row."],
        ["PARTITION BY", "PARTITION BY machine", "Each machine gets its own running total."],
      ],
      out: `machine         start_ts             running_min
Char Station 2  2026-11-01 02:59:50  8.72
Char Station 2  2026-11-01 10:15:03  16.70
Char Station 2  2026-11-01 14:31:53  17.78
Char Station 2  2026-11-01 20:25:53  28.63
Char Station 2  2026-11-01 21:28:26  33.67
Char Station 2  2026-11-02 17:29:13  49.58
Char Station 2  2026-11-03 21:15:10  56.73
Char Station 2  2026-11-06 01:14:26  64.57
Char Station 2  2026-11-06 05:22:19  75.10
Char Station 2  2026-11-07 04:10:06  87.05`,
    },
    {
      t: "Crosstab by shift",
      goal: "Count each machine's faults by the shift they started in, as columns shift_a (06:00-13:59), shift_b (14:00-21:59) and shift_c (22:00-05:59).",
      code: `SELECT machine,
    SUM(CASE WHEN DATEPART(HOUR, start_ts) BETWEEN 6 AND 13 THEN 1 ELSE 0 END) AS shift_a,
    SUM(CASE WHEN DATEPART(HOUR, start_ts) BETWEEN 14 AND 21 THEN 1 ELSE 0 END) AS shift_b,
    SUM(CASE WHEN DATEPART(HOUR, start_ts) >= 22 OR DATEPART(HOUR, start_ts) < 6 THEN 1 ELSE 0 END) AS shift_c
FROM fault_log
GROUP BY machine
ORDER BY machine;`,
      about: "Each SUM(CASE …) counts only the rows that match its condition, which turns one column of values into one column per value. DATEPART(HOUR, …) pulls the hour out of a time. BETWEEN is safe here because it compares whole hours, not times. The column totals match the DB Pulls track's shift buckets: 13, 18 and 16 faults.",
      terms: [
        ["SUM(CASE", "SUM(CASE WHEN … THEN 1 ELSE 0 END)", "Counts the rows that meet one condition."],
        ["DATEPART", "DATEPART(HOUR, x)", "One part of a date: the hour, as a number from 0 to 23."],
      ],
      out: `machine         shift_a  shift_b  shift_c
Char Station 2  1        5        4
Conveyor 3      6        6        7
Hoop Driver 1   6        7        5`,
    },
    {
      t: "Reusable query",
      goal: "Create procedure dbo.shift_downtime with @start and @end that returns each machine's fault count and down minutes clipped to the window. Run it for 2026-11-07 06:00 to 10:15.",
      code: `CREATE PROCEDURE dbo.shift_downtime
    @start DATETIME,
    @end DATETIME
AS
BEGIN
    SELECT machine,
        COUNT(*) AS faults,
        CAST(SUM(DATEDIFF(SECOND, GREATEST(start_ts, @start), LEAST(ISNULL(end_ts, @end), @end))) / 60.0 AS DECIMAL(8,2)) AS down_min
    FROM fault_log
    WHERE start_ts < @end
        AND (end_ts IS NULL OR end_ts > @start)
    GROUP BY machine
    ORDER BY machine;
END;
GO

EXEC dbo.shift_downtime @start = '2026-11-07 06:00', @end = '2026-11-07 10:15';`,
      about: "A stored procedure saves a query on the server with named parameters, so Python, C#, Ignition and SSMS all call the same logic. The WHERE is the overlap test from the MES Helper track, and GREATEST and LEAST clip each fault to the window, the rule the Shift Handoff track uses. GREATEST and LEAST need SQL Server 2022; older servers write the same thing with CASE.",
      terms: [
        ["CREATE PROCEDURE", "CREATE PROCEDURE … AS", "Stores a named, parameterized query on the server."],
        ["@start", "@start DATETIME", "A parameter. The caller supplies the value."],
        ["GREATEST", "GREATEST / LEAST", "The larger or smaller of the values. Clips each fault to the window."],
        ["EXEC", "EXEC name @p = value", "Runs a stored procedure."],
      ],
      out: `machine        faults  down_min
Conveyor 3     1       4.62
Hoop Driver 1  1       5.33`,
    },
  ],
});
