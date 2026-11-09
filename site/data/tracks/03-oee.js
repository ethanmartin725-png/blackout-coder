// Project track 3: OEE Loss Report
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
BC.addTrack({
  id: "t-oee",
  name: "OEE Loss Report",
  sub: "One SQL query for time, count and quality, then A/P/Q, dollarized losses and a formatted Excel report",
  lessons: [
    {
      lang: "sql",
      file: "schema_quality.sql",
      t: "Create reject_log",
      goal: "Create reject_log: an auto-numbered reject_id, machine, reason and qty (all required), and ts defaulting to now.",
      code: `CREATE TABLE reject_log (
    reject_id INT IDENTITY(1,1) PRIMARY KEY,
    machine VARCHAR(50) NOT NULL,
    reason VARCHAR(50) NOT NULL,
    qty INT NOT NULL,
    ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
      about: "OEE needs three inputs: time, count and quality. The first two tracks logged time (faults) and count (barrels). This table holds the third: barrels scrapped or sent to rework, by reason.",
      terms: [
        ["reject_log", "reject_log", "One row per quality event. qty lets one row cover a batch of rejects."],
        ["reason", "reason", "Leaker, Bad char, Hoop misfit. Keep the list short and fixed so it Paretos cleanly."],
        ["IDENTITY", "IDENTITY(1,1)", "Auto-numbered key, same pattern as fault_log."],
      ],
      out: `Commands completed successfully.

SELECT COLUMN_NAME AS column_name, DATA_TYPE AS type, CHARACTER_MAXIMUM_LENGTH AS max_len,
    IS_NULLABLE AS nullable, COLUMN_DEFAULT AS default_value,
    COLUMNPROPERTY(OBJECT_ID('reject_log'), COLUMN_NAME, 'IsIdentity') AS is_identity
FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'reject_log' ORDER BY ORDINAL_POSITION;
column_name  type      max_len  nullable  default_value  is_identity
reject_id    int       NULL     NO        NULL           1
machine      varchar   50       NO        NULL           0
reason       varchar   50       NO        NULL           0
qty          int       NULL     NO        NULL           0
ts           datetime  NULL     NO        (getdate())    0`,
    },
    {
      lang: "sql",
      file: "views.sql",
      t: "Hourly barrels view",
      goal: "Save the reset-safe hourly barrel logic as v_hourly_barrels, using 0 instead of NULL for each machine's first reading.",
      code: `CREATE VIEW v_hourly_barrels AS
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
        WHEN prev IS NULL THEN 0
        WHEN barrels < prev THEN barrels
        ELSE barrels - prev
    END AS made_this_hour
FROM c;`,
      about: "This is step 10 of DB Pulls & Analytics saved as a view. The first reading now returns 0 instead of NULL, so the weekly SUM in the next step never comes back empty for a machine with only one reading.",
      terms: [
        ["VIEW", "CREATE VIEW … AS", "Saves the query by name. The CTE travels inside the view."],
        ["made_this_hour", "made_this_hour", "Barrels since the previous reading, with counter resets handled."],
        ["0", "THEN 0", "A first reading has nothing to compare to. 0 keeps sums clean; NULL would be more honest for analysis. Choose deliberately."],
      ],
      out: `Commands completed successfully.

SELECT TOP 4 * FROM v_hourly_barrels ORDER BY ts, machine;
machine         ts                   made_this_hour
Char Station 2  2026-10-31 06:00:00  0
Conveyor 3      2026-10-31 06:00:00  0
Hoop Driver 1   2026-10-31 06:00:00  0
Char Station 2  2026-10-31 07:00:00  44`,
    },
    {
      lang: "sql",
      file: "oee_inputs.sql",
      t: "Week window and counts",
      goal: "Turn off row-count messages, declare @week_start 2026-10-31 06:00 and @week_end 2026-11-07 06:00, and start a CTE named made that totals barrels per machine.",
      code: `SET NOCOUNT ON;
DECLARE @week_start DATETIME = '2026-10-31 06:00';
DECLARE @week_end DATETIME = '2026-11-07 06:00';

WITH made AS (
    SELECT machine, SUM(made_this_hour) AS total_count
    FROM v_hourly_barrels
    WHERE ts > @week_start AND ts <= @week_end
    GROUP BY machine
),`,
      about: "Variables put the date range in one place, so changing the week means changing two lines. The week starts at 06:00, the start of A shift. Each hourly reading counts the hour before it, so the made filter uses > start and <= end. SET NOCOUNT ON stops SQL Server sending \"rows affected\" messages that can confuse Python drivers. The trailing comma means more CTEs follow.",
      terms: [
        ["DECLARE", "DECLARE @name TYPE = value", "Creates a variable for this batch. Names start with @."],
        ["NOCOUNT", "SET NOCOUNT ON", "Suppresses row-count messages. Good habit for any query called from code."],
        ["@week_start", "@week_start", "Used in every CTE so all three inputs cover the exact same window."],
        [">", "> start AND <= end", "Matches the reading to the hour it describes. Off-by-one-hour errors hide here."],
      ],
      out: `Not runnable yet. The statement finishes in step 5.`,
    },
    {
      lang: "sql",
      file: "oee_inputs.sql",
      t: "Rejects and downtime CTEs",
      goal: "Add CTEs rej (total qty per machine from reject_log) and down (total minutes per machine from v_fault_minutes), both inside the week window.",
      code: `rej AS (
    SELECT machine, SUM(qty) AS rejects
    FROM reject_log
    WHERE ts >= @week_start AND ts < @week_end
    GROUP BY machine
),
down AS (
    SELECT machine, SUM(minutes) AS down_min
    FROM v_fault_minutes
    WHERE start_ts >= @week_start AND start_ts < @week_end
    GROUP BY machine
)`,
      about: "Each CTE boils one log down to one number per machine. Rejects and faults are stamped when they happen, so these filters use >= start and < end. Faults are counted by start time; a fault that runs across the week boundary is counted fully in the week it started.",
      terms: [
        ["rej", "Chained CTEs", "Separate CTEs with commas after one WITH. Only the last has no comma."],
        ["v_fault_minutes", "v_fault_minutes", "The view from DB Pulls & Analytics. Its minute math is reused, not retyped."],
        [null, "Boundary rule", "Decide how events that cross the window edge are counted, and write it down."],
      ],
      out: `Not runnable yet. One more step.`,
    },
    {
      lang: "sql",
      file: "oee_inputs.sql",
      t: "One row per machine",
      goal: "Select every machine from dim_machine with its rate, margin, down_min, total_count and rejects, LEFT JOINing the three CTEs and using 0 for missing values.",
      code: `SELECT m.machine,
    m.ideal_rate_hr,
    m.margin_per_barrel,
    ISNULL(d.down_min, 0) AS down_min,
    ISNULL(c.total_count, 0) AS total_count,
    ISNULL(r.rejects, 0) AS rejects
FROM dim_machine AS m
LEFT JOIN made AS c ON c.machine = m.machine
LEFT JOIN rej AS r ON r.machine = m.machine
LEFT JOIN down AS d ON d.machine = m.machine
ORDER BY m.machine;`,
      about: "Start from the dimension so every machine appears even if it logged nothing. A plain JOIN would silently drop a machine with zero faults, which is the best machine you have. ISNULL turns the gaps into 0. Look closely at down_min: 87.049997, not 87.05. The view divides each fault's seconds by 60.0, SQL Server keeps 6 decimals and drops the rest, and 45 slightly-short values add up short. Summing seconds first and dividing once gives exactly 87.05; at one decimal it makes no difference.",
      terms: [
        ["LEFT", "LEFT JOIN", "Keeps every row from the left table, matched or not."],
        ["ISNULL", "ISNULL(d.down_min, 0)", "No faults logged means 0 down minutes, not a missing row."],
        ["dim_machine", "Start from the dimension", "The machine list drives the report, not whichever logs happen to have data."],
      ],
      out: `machine         ideal_rate_hr  margin_per_barrel  down_min    total_count  rejects
Char Station 2  50             42.50              87.049997   6980         211
Conveyor 3      60             42.50              94.733327   7120         142
Hoop Driver 1   55             42.50              108.849994  6410         96`,
    },
    {
      lang: "python",
      file: "oee_report.py",
      t: "Load the inputs",
      goal: "Connect to PlantDB, read oee_inputs.sql from disk, run it into df, and print it without the index.",
      code: `import pandas as pd
import pyodbc

conn = pyodbc.connect(
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=plant-sql01;DATABASE=PlantDB;"
    "Trusted_Connection=yes;TrustServerCertificate=yes;"
)
with open("oee_inputs.sql") as f:
    query = f.read()

df = pd.read_sql(query, conn)
print(df.to_string(index=False))`,
      about: "Keeping the SQL in its own file means you can test it in SSMS and run the same text from Python. The with block opens the file, reads it, and closes it.",
      terms: [
        ["open", "open(\"…\") as f", "Opens a file for reading. f.read() returns the whole thing as one string."],
        ["read_sql", "pd.read_sql", "Runs the query and returns a DataFrame."],
        ["to_string", ".to_string(index=False)", "Prints the whole table without the row numbers."],
      ],
      out: `       machine  ideal_rate_hr  margin_per_barrel   down_min  total_count  rejects
Char Station 2             50               42.5  87.049997         6980      211
    Conveyor 3             60               42.5  94.733327         7120      142
 Hoop Driver 1             55               42.5 108.849994         6410       96`,
    },
    {
      lang: "python",
      file: "oee_report.py",
      t: "Availability",
      goal: "Set PLANNED_MIN for 7 days × 3 shifts × (480 − 30 minutes of breaks), then add planned_min, run_min and availability columns.",
      code: `PLANNED_MIN = 7 * 3 * (8 * 60 - 30)

df["planned_min"] = PLANNED_MIN
df["run_min"] = df["planned_min"] - df["down_min"]
df["availability"] = df["run_min"] / df["planned_min"]`,
      about: "Planned production time excludes planned stops like breaks, so a machine is not penalized for lunch. Availability is the share of planned time the machine was actually able to run. The fault log only captures PLC-detected jams, which is why availability is near 99% here; real sites also log breakdowns and changeovers.",
      terms: [
        ["PLANNED_MIN", "PLANNED_MIN", "All caps marks a constant: a value set once and not changed."],
        ["run_min", "run_min", "Planned minutes minus down minutes."],
        ["availability", "Availability", "Run time ÷ planned time."],
      ],
      out: `After this step:
planned_min   9,450 for every machine
run_min       Char Station 2 9,362.95 · Conveyor 3 9,355.27 · Hoop Driver 1 9,341.15
availability  99.1% · 99.0% · 98.8%`,
    },
    {
      lang: "python",
      file: "oee_report.py",
      t: "Performance, quality, OEE",
      goal: "Add ideal_count, performance, good_count, quality and oee columns, then print the four ratios per machine to 3 decimals.",
      code: `df["ideal_count"] = df["run_min"] / 60 * df["ideal_rate_hr"]
df["performance"] = df["total_count"] / df["ideal_count"]
df["good_count"] = df["total_count"] - df["rejects"]
df["quality"] = df["good_count"] / df["total_count"]
df["oee"] = df["availability"] * df["performance"] * df["quality"]

cols = ["machine", "availability", "performance", "quality", "oee"]
print(df[cols].round(3).to_string(index=False))`,
      about: "Performance compares what was made with what the run time should have produced at ideal rate. Quality is good ÷ total. OEE multiplies all three. Look where the gap is: availability and quality are high everywhere, and performance is where the loss lives.",
      terms: [
        ["ideal_count", "ideal_count", "Run hours × ideal rate. The most the machine could have made in the time it ran."],
        ["performance", "Performance", "Total count ÷ ideal count. Slow cycles and small stops land here."],
        ["quality", "Quality", "Good count ÷ total count."],
        ["oee", "OEE", "A × P × Q. 85% is the classic world-class benchmark."],
      ],
      out: `       machine  availability  performance  quality   oee
Char Station 2         0.991        0.895    0.970 0.860
    Conveyor 3         0.990        0.761    0.980 0.738
 Hoop Driver 1         0.988        0.749    0.985 0.729`,
    },
    {
      lang: "python",
      file: "oee_report.py",
      t: "Data-quality flags",
      goal: "Loop over every machine and collect warnings for no counts, performance over 100%, or rejects above total. Print the list, or \"No data problems found\".",
      code: `problems = []
for _, row in df.iterrows():
    name = row["machine"]
    if row["total_count"] == 0:
        problems.append(f"{name}: no counts logged")
    if row["performance"] > 1:
        problems.append(f"{name}: performance over 100%, check ideal rate")
    if row["rejects"] > row["total_count"]:
        problems.append(f"{name}: rejects exceed total count")

print(problems or "No data problems found")`,
      about: "Never publish OEE you have not sanity-checked. Performance over 100% almost always means the ideal rate is wrong, not that the crew is heroic. Zero counts usually means a tag or logging failure.",
      terms: [
        ["iterrows", ".iterrows()", "Loops over rows as (index, row) pairs. _ is the name for a value you will not use."],
        ["append", "problems.append(…)", "Adds an item to the end of a list."],
        ["or", "problems or \"…\"", "An empty list counts as false, so this prints the message instead of []."],
        ["f", "f\"{name}: …\"", "f-string. Builds the warning text with the machine name inserted."],
      ],
      out: `No data problems found`,
    },
    {
      lang: "python",
      file: "oee_report.py",
      t: "Losses in barrels",
      goal: "Compute availability, performance and quality losses in barrels, then check they add up to planned ideal output minus good count.",
      code: `df["avail_loss"] = df["down_min"] / 60 * df["ideal_rate_hr"]
df["perf_loss"] = df["ideal_count"] - df["total_count"]
df["qual_loss"] = df["rejects"]

check = df["avail_loss"] + df["perf_loss"] + df["qual_loss"]
target = df["planned_min"] / 60 * df["ideal_rate_hr"] - df["good_count"]
print("Losses reconcile:", (check - target).abs().max() < 0.001)`,
      about: "Each OEE factor has a matching loss: barrels not made while down, barrels not made while running slow, and barrels made but rejected. The check proves the three explain the whole gap and nothing is double counted. Finance will trust a number that reconciles.",
      terms: [
        ["avail_loss", "avail_loss", "Down hours × ideal rate."],
        ["perf_loss", "perf_loss", "Ideal count minus what was actually made."],
        ["qual_loss", "qual_loss", "Rejected barrels."],
        ["abs", ".abs().max() < 0.001", "Largest gap between the two totals, allowing for floating-point rounding."],
      ],
      out: `Losses reconcile: True`,
    },
    {
      lang: "python",
      file: "oee_report.py",
      t: "Losses in dollars",
      goal: "Convert each loss to dollars at margin per barrel, compute the dollar value of one OEE point per machine, and print the table and the weekly total.",
      code: `for loss in ["avail_loss", "perf_loss", "qual_loss"]:
    df[loss + "_usd"] = df[loss] * df["margin_per_barrel"]

df["usd_per_oee_pt"] = (
    df["planned_min"] / 60 * df["ideal_rate_hr"] * 0.01 * df["margin_per_barrel"]
)
usd_cols = ["avail_loss_usd", "perf_loss_usd", "qual_loss_usd"]
total_usd = df[usd_cols].sum().sum()
print(df[["machine"] + usd_cols + ["usd_per_oee_pt"]].round(0).to_string(index=False))
print(f"Total weekly loss: \${total_usd:,.0f}")`,
      about: "One OEE point is 1% of planned ideal output, times margin. That gives each machine a price tag per point, so an improvement project can be valued before it starts. Check it against the table: Conveyor 3 is 26.2 points below 100% × $4,016 per point ≈ $105,060, the sum of its three losses.",
      terms: [
        ["for", "for loss in [ … ]:", "Repeats the conversion for each loss column instead of writing it three times."],
        ["usd_per_oee_pt", "$ per OEE point", "Planned hours × ideal rate × 1% × margin."],
        ["sum", ".sum().sum()", "Sum each column, then sum those totals."],
        [":,.0f", ":,.0f", "Format with thousands separators and no decimals."],
      ],
      out: `       machine  avail_loss_usd  perf_loss_usd  qual_loss_usd  usd_per_oee_pt
Char Station 2          3083.0        34954.0         8968.0          3347.0
    Conveyor 3          4026.0        94999.0         6035.0          4016.0
 Hoop Driver 1          4241.0        91491.0         4080.0          3682.0
Total weekly loss: $251,876`,
    },
    {
      lang: "python",
      file: "oee_report.py",
      t: "Find the biggest lever",
      goal: "Melt the three dollar-loss columns into long rows (machine, loss, usd), sort largest first, and print the top three.",
      code: `losses = df.melt(
    id_vars="machine",
    value_vars=usd_cols,
    var_name="loss",
    value_name="usd",
)
losses = losses.sort_values("usd", ascending=False)
print(losses.head(3).round(0).to_string(index=False))`,
      about: "melt turns a wide table into one row per machine-and-loss pair, so you can rank across all of them at once. All three top spots are performance loss. Before chasing it, confirm the ideal rates in dim_machine are real, because an optimistic rate inflates this number.",
      terms: [
        ["melt", ".melt(…)", "Wide to long: several columns become rows of label and value."],
        ["id_vars", "id_vars", "Columns kept as-is on every row."],
        ["value_vars", "value_vars", "Columns that get stacked into rows."],
      ],
      out: `       machine          loss     usd
    Conveyor 3 perf_loss_usd 94999.0
 Hoop Driver 1 perf_loss_usd 91491.0
Char Station 2 perf_loss_usd 34954.0`,
    },
    {
      lang: "python",
      file: "oee_report.py",
      t: "Start the workbook",
      goal: "Import openpyxl's Workbook, styles and get_column_letter, create a sheet named \"OEE Summary\", write the header row, and style it navy with bold gold text.",
      code: `from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

wb = Workbook()
ws = wb.active
ws.title = "OEE Summary"
headers = [
    "Machine", "Availability", "Performance", "Quality", "OEE",
    "Avail $", "Perf $", "Qual $", "$ per OEE pt",
]
ws.append(headers)

NAVY = PatternFill("solid", fgColor="1F2A44")
for cell in ws[1]:
    cell.fill = NAVY
    cell.font = Font(bold=True, color="D6AA47")
    cell.alignment = Alignment(horizontal="center")`,
      about: "openpyxl builds a real formatted Excel file, not a CSV. ws[1] is the first row. Colors are hex without the #.",
      terms: [
        ["Workbook", "Workbook()", "A new, empty workbook with one sheet."],
        ["active", "wb.active", "The current sheet."],
        ["PatternFill", "PatternFill(\"solid\", fgColor=…)", "A solid cell background."],
        ["Font", "Font(bold=True, color=…)", "Text style for a cell."],
      ],
      out: `After this step:
Sheet "OEE Summary", row 1: Machine, Availability, Performance, Quality, OEE, Avail $, Perf $, Qual $, $ per OEE pt
A1: fill #1F2A44, font #D6AA47, bold True, center`,
    },
    {
      lang: "python",
      file: "oee_report.py",
      t: "Write the rows",
      goal: "Append one row per machine in header order, then format columns B–E as 0.0% and F–I as whole dollars.",
      code: `fields = ["machine", "availability", "performance", "quality", "oee"]
fields += usd_cols + ["usd_per_oee_pt"]
for _, r in df.iterrows():
    ws.append([r[f] for f in fields])

last = ws.max_row
for row in ws.iter_rows(min_row=2, max_row=last):
    for cell in row[1:5]:
        cell.number_format = "0.0%"
    for cell in row[5:9]:
        cell.number_format = "$#,##0"`,
      about: "The list comprehension pulls the fields in the same order as the headers. row[1:5] is columns B through E because Python counts from 0 and stops before the end number.",
      terms: [
        ["for", "[r[f] for f in fields]", "List comprehension: builds a list by looping in one line."],
        ["iter_rows", ".iter_rows(min_row=2, …)", "Loops over sheet rows, skipping the header."],
        ["number_format", ".number_format", "Excel display format. The cell keeps the full value."],
        ["[", "row[1:5]", "A slice: items 1, 2, 3 and 4."],
      ],
      out: `After this step:
Row 2: Char Station 2 | OEE 0.8596 as 0.0% | Avail $ 3,083.02 as $#,##0
Row 3: Conveyor 3 | OEE 0.7384 as 0.0% | Avail $ 4,026.17 as $#,##0
Row 4: Hoop Driver 1 | OEE 0.7289 as 0.0% | Avail $ 4,240.61 as $#,##0`,
    },
    {
      lang: "python",
      file: "oee_report.py",
      t: "Total row with formulas",
      goal: "Add a bold Total row under the data with =SUM formulas for the three loss columns, formatted as dollars.",
      code: `total_row = last + 1
ws.cell(row=total_row, column=1, value="Total").font = Font(bold=True)
for col in "FGH":
    c = ws[f"{col}{total_row}"]
    c.value = f"=SUM({col}2:{col}{last})"
    c.number_format = "$#,##0"
    c.font = Font(bold=True)`,
      about: "Writing a formula instead of a computed number keeps the sheet live: if someone edits a cell, the total updates. Anyone opening the file can click the cell and see how it was built.",
      terms: [
        ["cell", "ws.cell(row=, column=, value=)", "Write to a cell by row and column number."],
        ["=SUM", "\"=SUM(F2:F4)\"", "A string that starts with = is stored as an Excel formula."],
        ["FGH", "for col in \"FGH\"", "Looping over a string visits each letter."],
      ],
      out: `After this step:
Row 5: Total | =SUM(F2:F4) | =SUM(G2:G4) | =SUM(H2:H4)
The SUMs over rows 2 to 4: 11,349.80   221,443.95   19,082.50
Excel shows them as $11,350   $221,444   $19,083`,
    },
    {
      lang: "python",
      file: "oee_report.py",
      t: "Finish and save",
      goal: "Set column widths, freeze the header row, save oee_loss_week.xlsx, and print a confirmation.",
      code: `widths = [16, 13, 13, 10, 9, 11, 11, 11, 13]
for i, w in enumerate(widths, start=1):
    ws.column_dimensions[get_column_letter(i)].width = w

ws.freeze_panes = "A2"
wb.save("oee_loss_week.xlsx")
print("Saved oee_loss_week.xlsx")`,
      about: "enumerate(…, start=1) gives Excel-style column numbers. Freezing at A2 keeps the header visible while scrolling. The Shift Handoff track builds on these same numbers.",
      terms: [
        ["enumerate", "enumerate(list, start=1)", "Loops with a counter alongside each item."],
        ["get_column_letter", "get_column_letter(i)", "1 → A, 2 → B, and so on."],
        ["freeze_panes", "ws.freeze_panes = \"A2\"", "Locks everything above row 2 in place."],
        ["save", "wb.save(…)", "Writes the file to disk."],
      ],
      out: `Saved oee_loss_week.xlsx

After this step:
Reopened: 5 rows x 9 columns, frozen at A2, column A width 16`,
    },
  ],
});
