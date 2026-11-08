// Foundations lane: SQL
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
BC.addLane({
  id: "sql",
  name: "SQL",
  lang: "sql",
  lessons: [
    {
      t: "Select columns",
      goal: "List machine_name and area from dim_machine.",
      code: `SELECT machine_name, area
FROM dim_machine;`,
      about: "The simplest query: pick columns, name the table. Every row in dim_machine comes back.",
      terms: [
        ["SELECT", "SELECT", "Names the columns you want back."],
        ["FROM", "FROM", "Names the table to read."],
        [",", ",", "Separates columns in the list."],
        [";", ";", "Ends the statement."],
      ],
    },
    {
      t: "Filter and sort",
      goal: "From fact_downtime, show machine_name and downtime_min where downtime_min is over 30, longest first.",
      code: `SELECT machine_name, downtime_min
FROM fact_downtime
WHERE downtime_min > 30
ORDER BY downtime_min DESC;`,
      about: "WHERE throws out rows before anything is returned. ORDER BY sorts what is left.",
      terms: [
        ["WHERE", "WHERE", "Filters rows. Only rows where the condition is true come back."],
        ["ORDER", "ORDER BY", "Sorts the result by one or more columns."],
        ["DESC", "DESC", "Descending, largest first. ASC is the default."],
      ],
    },
    {
      t: "Group and total",
      goal: "Total downtime_min per machine_id as total_min, biggest first.",
      code: `SELECT machine_id, SUM(downtime_min) AS total_min
FROM fact_downtime
GROUP BY machine_id
ORDER BY total_min DESC;`,
      about: "GROUP BY collapses many event rows into one row per machine. SUM adds up the minutes inside each group.",
      terms: [
        ["SUM", "SUM()", "Adds up a column across the rows in each group."],
        ["GROUP", "GROUP BY", "Collapses rows into one row per distinct value."],
        ["AS", "AS", "Gives a column or table an alias (a short name)."],
      ],
    },
    {
      t: "Join two tables",
      goal: "Join fact_downtime (alias d) to dim_machine (alias m) on machine_id and total downtime by machine_name.",
      code: `SELECT m.machine_name, SUM(d.downtime_min) AS total_min
FROM fact_downtime AS d
JOIN dim_machine AS m
    ON m.machine_id = d.machine_id
GROUP BY m.machine_name;`,
      about: "The fact table holds events with IDs. The dimension table holds names. The join matches them on machine_id so the totals show readable names.",
      terms: [
        ["JOIN", "JOIN", "Combines rows from two tables. Plain JOIN keeps only rows that match on both sides."],
        ["ON", "ON", "The matching rule for the join, usually key = key."],
        ["m", "m. / d.", "Table aliases. m.machine_name means machine_name from the table aliased m."],
      ],
    },
    {
      t: "Top 10 reasons",
      goal: "Top 10 downtime reasons by event count since 2026-10-01, from fact_downtime.",
      code: `SELECT TOP 10 reason, COUNT(*) AS events
FROM fact_downtime
WHERE event_date >= '2026-10-01'
GROUP BY reason
ORDER BY events DESC;`,
      about: "A Pareto in one query: count events per reason, sort descending, keep the first ten.",
      terms: [
        ["TOP", "TOP 10", "SQL Server syntax to return only the first N rows. MySQL and PostgreSQL use LIMIT 10 at the end instead."],
        ["COUNT", "COUNT(*)", "Counts rows in each group."],
        ["'2026-10-01'", "'2026-10-01'", "A date literal. SQL strings use single quotes."],
      ],
    },
    {
      t: "Label with CASE",
      goal: "From fact_oee_daily, show machine_id, oee, and a rating: 0.85+ \"World class\", 0.60+ \"Typical\", else \"Needs work\".",
      code: `SELECT machine_id,
    oee,
    CASE
        WHEN oee >= 0.85 THEN 'World class'
        WHEN oee >= 0.60 THEN 'Typical'
        ELSE 'Needs work'
    END AS rating
FROM fact_oee_daily;`,
      about: "CASE is if/else inside a query. Each row is tested against the WHEN lines in order, and the first match supplies the rating.",
      terms: [
        ["CASE", "CASE", "Starts an if/then expression inside a query."],
        ["WHEN", "WHEN … THEN", "A condition and the value returned when it is true. Checked top to bottom."],
        ["ELSE", "ELSE", "The value when no WHEN matched."],
        ["END", "END AS", "Closes the CASE and names the new column."],
      ],
    },
    {
      t: "Create a table",
      goal: "Create dim_machine with machine_id (INT, primary key), machine_name (VARCHAR 50, required), and area (VARCHAR 30).",
      code: `CREATE TABLE dim_machine (
    machine_id INT PRIMARY KEY,
    machine_name VARCHAR(50) NOT NULL,
    area VARCHAR(30)
);`,
      about: "This defines structure, not data. Each line inside the parentheses is a column: name, type, then rules.",
      terms: [
        ["CREATE", "CREATE TABLE", "Defines a new table and its columns."],
        ["INT", "INT", "Whole-number column type."],
        ["VARCHAR", "VARCHAR(50)", "Text up to 50 characters."],
        ["PRIMARY", "PRIMARY KEY", "Unique ID for each row. It cannot repeat or be empty."],
        ["NOT", "NOT NULL", "The column must always have a value."],
      ],
    },
  ],
});
