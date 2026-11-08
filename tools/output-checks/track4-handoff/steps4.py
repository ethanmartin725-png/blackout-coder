# Track 4 SQL and Python steps, exactly as they appear in the lessons. Keep in sync with site/data/tracks/04-handoff.js.
Q1 = '''CREATE TABLE handoff_note (
    note_id INT IDENTITY(1,1) PRIMARY KEY,
    shift_date DATE NOT NULL,
    shift CHAR(1) NOT NULL,
    machine VARCHAR(50) NULL,
    author VARCHAR(50) NOT NULL,
    note VARCHAR(500) NOT NULL,
    created_ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ack_by VARCHAR(50) NULL,
    ack_ts DATETIME NULL
);'''
Q2 = '''SELECT m.machine,
    m.ideal_rate_hr,
    ISNULL(SUM(h.made_this_hour), 0) AS barrels
FROM dim_machine AS m
LEFT JOIN v_hourly_barrels AS h
    ON h.machine = m.machine
    AND h.ts > ?
    AND h.ts <= ?
GROUP BY m.machine, m.ideal_rate_hr
ORDER BY m.machine;'''
Q3 = '''SELECT machine,
    fault,
    start_ts,
    end_ts,
    DATEDIFF(SECOND, start_ts, ISNULL(end_ts, GETDATE())) / 60.0 AS minutes
FROM fault_log
WHERE (start_ts >= ? AND start_ts < ?)
    OR end_ts IS NULL
ORDER BY start_ts;'''
Q4 = '''SELECT machine, author, note, created_ts
FROM handoff_note
WHERE ack_by IS NULL
ORDER BY created_ts;'''
P5 = '''import html
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
    return name, start, start + timedelta(hours=8)'''
P6 = '''now = datetime(2026, 11, 7, 14, 5)
shift, start, end = last_shift(now)
print(f"Handing off shift {shift}: {start:%a %b %d %H:%M} to {end:%H:%M}")
print(last_shift(datetime(2026, 11, 7, 3, 0))[0])'''
P7 = '''conn = pyodbc.connect(
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=plant-sql01;DATABASE=PlantDB;"
    "Trusted_Connection=yes;TrustServerCertificate=yes;"
)


def run(sql_file, params=None):
    with open(sql_file) as f:
        return pd.read_sql(f.read(), conn, params=params)'''
PULL = '''counts = run("last_shift_counts.sql", [start, end])
faults = run("last_shift_faults.sql", [start, end])
notes = run("open_notes.sql")
print(len(counts), "machines,", len(faults), "faults,", len(notes), "open notes")'''
P8 = '''SHIFT_HOURS = 8 - 0.5

counts["ideal"] = counts["ideal_rate_hr"] * SHIFT_HOURS
counts["pct_of_ideal"] = counts["barrels"] / counts["ideal"]
in_start = faults["start_ts"].clip(lower=start)
in_end = faults["end_ts"].fillna(end).clip(upper=end)
faults["shift_min"] = (in_end - in_start).dt.total_seconds().clip(lower=0) / 60
down = faults.groupby("machine")["shift_min"].sum()
counts["down_min"] = counts["machine"].map(down).fillna(0)'''
P9 = '''open_faults = faults[faults["end_ts"].isna()]

counts["status"] = "OK"
counts.loc[counts["pct_of_ideal"] < 0.70, "status"] = "BEHIND"
counts.loc[counts["machine"].isin(open_faults["machine"]), "status"] = "DOWN"
print(counts[["machine", "barrels", "pct_of_ideal", "down_min", "status"]].round(2))'''
P10 = '''rows = ""
for _, r in counts.iterrows():
    rows += (
        f"<tr class='{r['status'].lower()}'><td>{r['machine']}</td>"
        f"<td>{r['barrels']:.0f}</td><td>{r['pct_of_ideal']:.0%}</td>"
        f"<td>{r['down_min']:.0f}</td><td>{r['status']}</td></tr>\\n"
    )'''
P11 = '''fault_items = ""
for _, f in faults.iterrows():
    state = "OPEN" if pd.isna(f["end_ts"]) else f"{f['minutes']:.0f} min"
    fault_items += (
        f"<li>{f['machine']}: {f['fault']} at {f['start_ts']:%H:%M} ({state})</li>\\n"
    )

note_items = ""
for _, n in notes.iterrows():
    who = html.escape(n["author"])
    text = html.escape(n["note"])
    note_items += f"<li><b>{who}</b>: {text}</li>\\n"'''
P12 = '''page = f"""<!doctype html>
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
</body></html>"""'''
P13 = '''file_name = f"handoff_{start:%Y%m%d}_{shift}.html"
with open(file_name, "w", encoding="utf-8") as f:
    f.write(page)
print("Saved", file_name)'''
P14 = '''def add_note(author, note, machine=None):
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO handoff_note (shift_date, shift, machine, author, note) "
        "VALUES (?, ?, ?, ?, ?)",
        [start.date(), shift, machine, author, note],
    )
    conn.commit()


add_note("J. Ruiz", "Low air twice on Hoop Driver 1. Compressor tech called.", "Hoop Driver 1")'''
P15 = '''def ack_notes(reader):
    cur = conn.cursor()
    cur.execute(
        "UPDATE handoff_note SET ack_by = ?, ack_ts = CURRENT_TIMESTAMP "
        "WHERE ack_by IS NULL",
        [reader],
    )
    conn.commit()
    return cur.rowcount


print(ack_notes("D. Park"), "notes acknowledged")'''
