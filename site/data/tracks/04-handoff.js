// Project track 4: Shift Handoff
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
BC.addTrack({
  id: "t-handoff",
  name: "Shift Handoff",
  sub: "Shift window logic, shift-scoped SQL, a generated one-page handoff, and notes written back to the database",
  lessons: [
    {
      lang: "sql",
      file: "schema_handoff.sql",
      t: "Create handoff_note",
      goal: "Create handoff_note: auto-numbered note_id, shift_date, one-letter shift, optional machine, author, note text (up to 500 characters), created_ts defaulting to now, and empty ack_by / ack_ts.",
      code: `CREATE TABLE handoff_note (
    note_id INT IDENTITY(1,1) PRIMARY KEY,
    shift_date DATE NOT NULL,
    shift CHAR(1) NOT NULL,
    machine VARCHAR(50) NULL,
    author VARCHAR(50) NOT NULL,
    note VARCHAR(500) NOT NULL,
    created_ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ack_by VARCHAR(50) NULL,
    ack_ts DATETIME NULL
);`,
      about: "A handoff is only as good as what carries over. This table holds the free-text notes a lead leaves for the next shift, plus who acknowledged them and when. A note with no ack_by is still open, which is how nothing gets lost between shifts.",
      terms: [
        ["DATE", "DATE", "A date with no time. The production day the shift belongs to."],
        ["CHAR", "CHAR(1)", "Exactly one character: A, B or C."],
        ["machine", "machine … NULL", "Optional. Some notes are about a machine, some about the whole line."],
        ["ack_by", "ack_by / ack_ts", "Who read the note and when. Empty means not yet acknowledged."],
      ],
      out: `Commands completed successfully.`,
    },
    {
      lang: "sql",
      file: "last_shift_counts.sql",
      t: "Barrels for the shift",
      goal: "For every machine, total made_this_hour from v_hourly_barrels between two parameters (start, end], using 0 for machines with no readings.",
      code: `SELECT m.machine,
    m.ideal_rate_hr,
    ISNULL(SUM(h.made_this_hour), 0) AS barrels
FROM dim_machine AS m
LEFT JOIN v_hourly_barrels AS h
    ON h.machine = m.machine
    AND h.ts > ?
    AND h.ts <= ?
GROUP BY m.machine, m.ideal_rate_hr
ORDER BY m.machine;`,
      about: "The ? marks are filled in by Python with the shift start and end. Note where the time filter sits: in the ON clause, not a WHERE. With a LEFT JOIN, a WHERE on the right-hand table would throw away machines that made nothing, which is exactly the machine the next lead needs to hear about.",
      terms: [
        ["?", "? parameters", "Placeholders. Python passes the values in order: start, then end."],
        ["ON", "Filter in ON", "Keeps the LEFT JOIN a LEFT JOIN. A WHERE on h.ts would turn it back into an inner join."],
        ["ISNULL", "ISNULL(SUM(…), 0)", "No readings means 0 barrels, not a missing row."],
      ],
      out: `With start = 2026-11-07 06:00, end = 14:00:
machine         ideal_rate_hr  barrels
Char Station 2  50             301
Conveyor 3      60             352
Hoop Driver 1   55             274`,
    },
    {
      lang: "sql",
      file: "last_shift_faults.sql",
      t: "Faults for the shift",
      goal: "List machine, fault, start, end and minutes for faults that started during the shift, plus any fault still open, oldest first.",
      code: `SELECT machine,
    fault,
    start_ts,
    end_ts,
    DATEDIFF(SECOND, start_ts, ISNULL(end_ts, GETDATE())) / 60.0 AS minutes
FROM fault_log
WHERE (start_ts >= ? AND start_ts < ?)
    OR end_ts IS NULL
ORDER BY start_ts;`,
      about: "Two groups belong in a handoff: what happened this shift, and anything still broken no matter when it started. The parentheses matter. AND binds tighter than OR, so without them the date window would only apply to half the condition.",
      terms: [
        ["OR", "OR end_ts IS NULL", "Adds still-open faults even if they started on an earlier shift."],
        ["(", "( … AND … )", "Groups the date window so it reads as one condition."],
        [null, "AND before OR", "SQL evaluates AND first. When mixing them, always add parentheses."],
      ],
      out: `machine         fault         start_ts             end_ts               minutes
Conveyor 3      Jam           2026-11-07 09:08:52  2026-11-07 09:13:29  4.62
Hoop Driver 1   Hoop misfeed  2026-11-07 10:09:40  2026-11-07 10:17:10  7.50
Hoop Driver 1   Low air       2026-11-07 11:31:00  2026-11-07 11:49:30  18.50
Hoop Driver 1   Low air       2026-11-07 12:22:00  2026-11-07 12:37:00  15.00
Char Station 2  Char flare    2026-11-07 13:41:15  NULL                 23.75`,
    },
    {
      lang: "sql",
      file: "open_notes.sql",
      t: "Unacknowledged notes",
      goal: "List machine, author, note and created_ts for every handoff note nobody has acknowledged, oldest first.",
      code: `SELECT machine, author, note, created_ts
FROM handoff_note
WHERE ack_by IS NULL
ORDER BY created_ts;`,
      about: "Notes stay on every handoff until someone acknowledges them. A weak igniter mentioned once at 05:52 keeps showing up until a lead signs off on it.",
      terms: [
        ["ack_by", "WHERE ack_by IS NULL", "Open notes only."],
        ["ORDER", "ORDER BY created_ts", "Oldest first, so long-standing issues stay at the top."],
      ],
      out: `machine         author     note
Char Station 2  T. Nguyen  Burner B igniter sparking weak on Char Station 2. Maintenance work order opened.
NULL            T. Nguyen  Hoop stock for 26" heads running low; 2 pallets left.`,
    },
    {
      lang: "python",
      file: "handoff.py",
      t: "Which shift just ended?",
      goal: "Import html, datetime/timedelta, pandas and pyodbc. Define SHIFTS (A 06, B 14, C 22) and last_shift(now), which returns the name, start and end of the most recent shift that has finished.",
      code: `import html
from datetime import datetime, timedelta

import pandas as pd
import pyodbc

SHIFTS = [("A", 6), ("B", 14), ("C", 22)]


def last_shift(now):
    starts = []
    for day in (now.date() - timedelta(days=1), now.date()):
        for name, hour in SHIFTS:
            starts.append((name, datetime(day.year, day.month, day.day, hour)))
    finished = [(n, s) for n, s in starts if s + timedelta(hours=8) <= now]
    name, start = finished[-1]
    return name, start, start + timedelta(hours=8)`,
      about: "The function lists every shift start for yesterday and today, keeps those whose 8 hours are over, and takes the last one. Including yesterday is what makes 3 a.m. work: the last finished shift is then yesterday's B. Two blank lines before a top-level def is Python's style convention.",
      terms: [
        ["timedelta", "timedelta(hours=8)", "A length of time you can add to or subtract from a datetime."],
        ["def", "def last_shift(now):", "A function that takes the current time and returns three values."],
        ["finished", "[x for x in … if …]", "A filtered list comprehension: keep only items that pass the test."],
        ["[", "finished[-1]", "Index -1 is the last item in a list."],
      ],
    },
    {
      lang: "python",
      file: "handoff.py",
      t: "Test the shift window",
      goal: "Set now to 2026-11-07 14:05, unpack last_shift into shift, start and end, print the window, then check that 3:00 a.m. returns B.",
      code: `now = datetime(2026, 11, 7, 14, 5)
shift, start, end = last_shift(now)
print(f"Handing off shift {shift}: {start:%a %b %d %H:%M} to {end:%H:%M}")
print(last_shift(datetime(2026, 11, 7, 3, 0))[0])`,
      about: "A fixed now makes the lesson repeatable. In the real script use datetime.now(). The second print is a quick test of the tricky overnight case; testing edge cases like this is cheaper than finding them on a Monday morning.",
      terms: [
        ["shift", "a, b, c = func()", "Unpacking: three returned values go into three names."],
        ["%a", "{start:%a %b %d %H:%M}", "Date format codes: weekday, month, day, hour, minute."],
        ["now", "datetime.now()", "Swap the fixed date for this when the script runs for real."],
      ],
      out: `Handing off shift A: Sat Nov 07 06:00 to 14:00
B`,
    },
    {
      lang: "python",
      file: "handoff.py",
      t: "Connection and a helper",
      goal: "Connect to PlantDB, then define run(sql_file, params) that reads a .sql file and returns pd.read_sql with those parameters.",
      code: `conn = pyodbc.connect(
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=plant-sql01;DATABASE=PlantDB;"
    "Trusted_Connection=yes;TrustServerCertificate=yes;"
)


def run(sql_file, params=None):
    with open(sql_file) as f:
        return pd.read_sql(f.read(), conn, params=params)`,
      about: "Three queries, one helper. The params list fills the ? marks in order, and the driver handles quoting, so a value can never break or inject into the SQL.",
      terms: [
        ["run", "def run(sql_file, params=None):", "params=None makes the argument optional."],
        ["params", "params=[start, end]", "Values for the ? placeholders, in order."],
        ["read_sql", "pd.read_sql(sql, conn, params=…)", "Runs a parameterized query and returns a DataFrame."],
      ],
    },
    {
      lang: "python",
      file: "handoff.py",
      t: "Log the outgoing note",
      goal: "Define add_note(author, note, machine=None) that inserts a handoff_note row for this shift and commits. Call it for J. Ruiz about low air on Hoop Driver 1.",
      code: `def add_note(author, note, machine=None):
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO handoff_note (shift_date, shift, machine, author, note) "
        "VALUES (?, ?, ?, ?, ?)",
        [start.date(), shift, machine, author, note],
    )
    conn.commit()


add_note("J. Ruiz", "Low air twice on Hoop Driver 1. Compressor tech called.", "Hoop Driver 1")`,
      about: "The outgoing lead's notes go in before the pull, so they appear on the page the incoming lead reads. A cursor runs statements that change data; commit makes the change permanent. Without commit, the row disappears when the script ends.",
      terms: [
        ["cursor", "conn.cursor()", "An object for running statements one at a time."],
        ["execute", "cur.execute(sql, params)", "Runs one statement with ? parameters."],
        ["commit", "conn.commit()", "Saves the change. Until then it is not visible to anyone else."],
        ["date", "start.date()", "Just the date part, for the shift_date column."],
      ],
      out: `handoff_note gets:
shift_date  shift  machine        author   note
2026-11-07  A      Hoop Driver 1  J. Ruiz  Low air twice on Hoop Driver 1. Compressor tech called.`,
    },
    {
      lang: "python",
      file: "handoff.py",
      t: "Pull the shift data",
      goal: "Run the three .sql files: counts and faults with [start, end], notes with no parameters. Print how many rows each returned.",
      code: `counts = run("last_shift_counts.sql", [start, end])
faults = run("last_shift_faults.sql", [start, end])
notes = run("open_notes.sql")
print(len(counts), "machines,", len(faults), "faults,", len(notes), "open notes")`,
      about: "One line per query, because the helper did the work. The count line is a quick sanity check before building anything on top of the data.",
      terms: [
        ["counts", "counts / faults / notes", "Three DataFrames, one per query."],
        ["len", "len(df)", "Number of rows."],
      ],
      out: `3 machines, 5 faults, 3 open notes`,
    },
    {
      lang: "python",
      file: "handoff.py",
      t: "Shift performance",
      goal: "Set SHIFT_HOURS to 7.5 (8 minus a break), add ideal and pct_of_ideal to counts, and map each machine's fault minutes into down_min.",
      code: `SHIFT_HOURS = 8 - 0.5

counts["ideal"] = counts["ideal_rate_hr"] * SHIFT_HOURS
counts["pct_of_ideal"] = counts["barrels"] / counts["ideal"]
down = faults.groupby("machine")["minutes"].sum()
counts["down_min"] = counts["machine"].map(down).fillna(0)`,
      about: "pct_of_ideal is a quick shift-level performance read, not full OEE. .map() looks each machine up in the fault totals; machines with no faults come back NaN, so fillna(0) turns that into 0 minutes.",
      terms: [
        ["map", ".map(series)", "Looks each value up in another Series by its index."],
        ["fillna", ".fillna(0)", "Replaces missing values."],
        ["SHIFT_HOURS", "SHIFT_HOURS", "Run hours available in one shift."],
      ],
    },
    {
      lang: "python",
      file: "handoff.py",
      t: "Status flags",
      goal: "Find open faults, then set status: OK by default, BEHIND under 70% of ideal, and DOWN for any machine with an open fault. Print the summary.",
      code: `open_faults = faults[faults["end_ts"].isna()]

counts["status"] = "OK"
counts.loc[counts["pct_of_ideal"] < 0.70, "status"] = "BEHIND"
counts.loc[counts["machine"].isin(open_faults["machine"]), "status"] = "DOWN"
print(counts[["machine", "barrels", "pct_of_ideal", "down_min", "status"]].round(2))`,
      about: "Order sets priority: DOWN is assigned last, so it wins over BEHIND. Char Station 2 is ahead on count but has a char flare still open, so the next lead needs to see DOWN first.",
      terms: [
        ["isna", ".isna()", "True where end_ts is empty: still open."],
        ["isin", ".isin(list)", "True for machines that appear in the open-fault list."],
        [null, "Last write wins", "Assign the most important status last."],
      ],
      out: `          machine  barrels  pct_of_ideal  down_min  status
0  Char Station 2      301          0.80     23.75    DOWN
1      Conveyor 3      352          0.78      4.62      OK
2   Hoop Driver 1      274          0.66     41.00  BEHIND`,
    },
    {
      lang: "python",
      file: "handoff.py",
      t: "Table rows",
      goal: "Build an HTML table row for each machine with a class named after its status, showing machine, barrels, % of ideal, down minutes and status.",
      code: `rows = ""
for _, r in counts.iterrows():
    rows += (
        f"<tr class='{r['status'].lower()}'><td>{r['machine']}</td>"
        f"<td>{r['barrels']:.0f}</td><td>{r['pct_of_ideal']:.0%}</td>"
        f"<td>{r['down_min']:.0f}</td><td>{r['status']}</td></tr>\\n"
    )`,
      about: "Each pass adds one <tr>. The class (down, behind, ok) is what the page's CSS uses to color the row. Adjacent f-strings inside parentheses join into one, the same trick as the SQL strings in the PLC & HMI track.",
      terms: [
        ["lower", ".lower()", "DOWN becomes down, to match the CSS class name."],
        [":.0%", "{x:.0%}", "Format 0.78 as 78%."],
        ["+=", "rows += …", "Appends to the string each loop."],
      ],
    },
    {
      lang: "python",
      file: "handoff.py",
      t: "Fault and note lists",
      goal: "Build a list item for each fault (OPEN, or minutes if closed) and for each note. Escape author and note text with html.escape.",
      code: `fault_items = ""
for _, f in faults.iterrows():
    state = "OPEN" if pd.isna(f["end_ts"]) else f"{f['minutes']:.0f} min"
    fault_items += (
        f"<li>{f['machine']}: {f['fault']} at {f['start_ts']:%H:%M} ({state})</li>\\n"
    )

note_items = ""
for _, n in notes.iterrows():
    who = html.escape(n["author"])
    text = html.escape(n["note"])
    note_items += f"<li><b>{who}</b>: {text}</li>\\n"`,
      about: "Notes are typed by people, so they can contain characters like < or \" that would break the page. html.escape converts them to safe codes. Anything a person typed gets escaped before it goes into HTML.",
      terms: [
        ["isna", "pd.isna(x)", "True if x is missing."],
        ["escape", "html.escape(text)", "Makes text safe to put inside HTML."],
        ["if", "a if cond else b", "A one-line if/else that returns a value."],
      ],
    },
    {
      lang: "python",
      file: "handoff.py",
      t: "The page template",
      goal: "Build page as one f-string: a full HTML document with a small style block, the shift heading and window, the machine table, the fault list and the notes list.",
      code: `page = f"""<!doctype html>
<html><head><meta charset="utf-8"><title>Shift {shift} handoff</title>
<style>
  body {{ font-family: Arial, sans-serif; margin: 24px; }}
  table {{ border-collapse: collapse; }}
  td, th {{ border: 1px solid #999; padding: 4px 10px; }}
  .down td {{ background: #f4c7c3; }}
  .behind td {{ background: #fbe7b5; }}
</style></head><body>
<h1>Shift {shift} handoff</h1>
<p>{start:%a %b %d %H:%M} to {end:%H:%M}</p>
<table>
<tr><th>Machine</th><th>Barrels</th><th>% of ideal</th><th>Down min</th><th>Status</th></tr>
{rows}</table>
<h2>Faults this shift</h2>
<ul>{fault_items or "<li>None</li>"}</ul>
<h2>Open notes</h2>
<ul>{note_items or "<li>None</li>"}</ul>
</body></html>"""`,
      about: "Triple quotes let a string span many lines. Inside an f-string, braces mean \"insert a value\", so CSS braces have to be doubled: {{ becomes a literal {. The red and yellow row colors come from the status classes added in the table rows step.",
      terms: [
        ["\"\"\"", "f\"\"\"…\"\"\"", "A multi-line f-string."],
        ["{{", "{{ }}", "Doubled braces print as single braces. Needed for CSS inside an f-string."],
        ["or", "{x or \"<li>None</li>\"}", "Shows None when a list is empty instead of a blank section."],
      ],
      outHtml: `<!doctype html>
<html><head><meta charset="utf-8"><title>Shift A handoff</title>
<style>
  body { font-family: Arial, sans-serif; margin: 24px; }
  table { border-collapse: collapse; }
  td, th { border: 1px solid #999; padding: 4px 10px; }
  .down td { background: #f4c7c3; }
  .behind td { background: #fbe7b5; }
</style></head><body>
<h1>Shift A handoff</h1>
<p>Sat Nov 07 06:00 to 14:00</p>
<table>
<tr><th>Machine</th><th>Barrels</th><th>% of ideal</th><th>Down min</th><th>Status</th></tr>
<tr class='down'><td>Char Station 2</td><td>301</td><td>80%</td><td>24</td><td>DOWN</td></tr>
<tr class='ok'><td>Conveyor 3</td><td>352</td><td>78%</td><td>5</td><td>OK</td></tr>
<tr class='behind'><td>Hoop Driver 1</td><td>274</td><td>66%</td><td>41</td><td>BEHIND</td></tr>
</table>
<h2>Faults this shift</h2>
<ul><li>Conveyor 3: Jam at 09:08 (5 min)</li>
<li>Hoop Driver 1: Hoop misfeed at 10:09 (8 min)</li>
<li>Hoop Driver 1: Low air at 11:31 (18 min)</li>
<li>Hoop Driver 1: Low air at 12:22 (15 min)</li>
<li>Char Station 2: Char flare at 13:41 (OPEN)</li>
</ul>
<h2>Open notes</h2>
<ul><li><b>T. Nguyen</b>: Burner B igniter sparking weak on Char Station 2. Maintenance work order opened.</li>
<li><b>T. Nguyen</b>: Hoop stock for 26&quot; heads running low; 2 pallets left.</li>
<li><b>J. Ruiz</b>: Low air twice on Hoop Driver 1. Compressor tech called.</li>
</ul>
</body></html>`,
    },
    {
      lang: "python",
      file: "handoff.py",
      t: "Save the page",
      goal: "Name the file handoff_YYYYMMDD_<shift>.html, write the page with UTF-8 encoding, and print the file name.",
      code: `file_name = f"handoff_{start:%Y%m%d}_{shift}.html"
with open(file_name, "w", encoding="utf-8") as f:
    f.write(page)
print("Saved", file_name)`,
      about: "The date and shift in the name keep every handoff as a record you can find later. The page opens in any browser and prints to one sheet.",
      terms: [
        ["w", "open(…, \"w\", encoding=\"utf-8\")", "Opens for writing. UTF-8 handles any character a lead might type."],
        ["write", "f.write(page)", "Writes the string to the file."],
        ["%Y%m%d", "%Y%m%d", "Year, month, day with no separators: 20261107. Sorts correctly by name."],
      ],
      out: `Saved handoff_20261107_A.html`,
      outHtml: `<!doctype html>
<html><head><meta charset="utf-8"><title>Shift A handoff</title>
<style>
  body { font-family: Arial, sans-serif; margin: 24px; }
  table { border-collapse: collapse; }
  td, th { border: 1px solid #999; padding: 4px 10px; }
  .down td { background: #f4c7c3; }
  .behind td { background: #fbe7b5; }
</style></head><body>
<h1>Shift A handoff</h1>
<p>Sat Nov 07 06:00 to 14:00</p>
<table>
<tr><th>Machine</th><th>Barrels</th><th>% of ideal</th><th>Down min</th><th>Status</th></tr>
<tr class='down'><td>Char Station 2</td><td>301</td><td>80%</td><td>24</td><td>DOWN</td></tr>
<tr class='ok'><td>Conveyor 3</td><td>352</td><td>78%</td><td>5</td><td>OK</td></tr>
<tr class='behind'><td>Hoop Driver 1</td><td>274</td><td>66%</td><td>41</td><td>BEHIND</td></tr>
</table>
<h2>Faults this shift</h2>
<ul><li>Conveyor 3: Jam at 09:08 (5 min)</li>
<li>Hoop Driver 1: Hoop misfeed at 10:09 (8 min)</li>
<li>Hoop Driver 1: Low air at 11:31 (18 min)</li>
<li>Hoop Driver 1: Low air at 12:22 (15 min)</li>
<li>Char Station 2: Char flare at 13:41 (OPEN)</li>
</ul>
<h2>Open notes</h2>
<ul><li><b>T. Nguyen</b>: Burner B igniter sparking weak on Char Station 2. Maintenance work order opened.</li>
<li><b>T. Nguyen</b>: Hoop stock for 26&quot; heads running low; 2 pallets left.</li>
<li><b>J. Ruiz</b>: Low air twice on Hoop Driver 1. Compressor tech called.</li>
</ul>
</body></html>`,
    },
    {
      lang: "python",
      file: "handoff.py",
      t: "Incoming lead acknowledges",
      goal: "Define ack_notes(reader) that stamps ack_by and ack_ts on every open note, commits, and returns how many rows changed. Call it for D. Park.",
      code: `def ack_notes(reader):
    cur = conn.cursor()
    cur.execute(
        "UPDATE handoff_note SET ack_by = ?, ack_ts = CURRENT_TIMESTAMP "
        "WHERE ack_by IS NULL",
        [reader],
    )
    conn.commit()
    return cur.rowcount


print(ack_notes("D. Park"), "notes acknowledged")`,
      about: "This closes the loop. Once the incoming lead acknowledges, open notes drop off the next handoff. rowcount tells you how many rows the UPDATE touched: a quick way to confirm it did what you expected.",
      terms: [
        ["UPDATE", "UPDATE … SET … WHERE", "Changes existing rows that match the condition."],
        ["rowcount", "cur.rowcount", "How many rows the last statement changed."],
        ["return", "return cur.rowcount", "Hands the count back to the caller."],
      ],
      out: `3 notes acknowledged`,
    },
  ],
});
