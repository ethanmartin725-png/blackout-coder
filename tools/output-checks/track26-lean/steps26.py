# Lean Basics: every step's code, in order, with its language. SQL steps build lean.sql and run one at
# a time on a fresh PlantDB through foundations/sql_exec.py; Python steps build lean.py and run in
# sequence. build26.py writes site/data/tracks/26-lean.js.
CODE, LANG = {}, {}

def sql(title, code):
    CODE[title], LANG[title] = code, "sql"

def py(title, code):
    CODE[title], LANG[title] = code, "python"

sql("Create wip_count", """CREATE TABLE wip_count (
    location VARCHAR(30) NOT NULL,
    counted_ts DATETIME NOT NULL,
    barrels INT NOT NULL,
    PRIMARY KEY (location, counted_ts)
);""")

sql("WIP in each buffer", """SELECT location,
    COUNT(*) AS counts,
    CAST(AVG(barrels * 1.0) AS DECIMAL(8,1)) AS avg_barrels,
    MIN(barrels) AS fewest,
    MAX(barrels) AS most
FROM wip_count
GROUP BY location
ORDER BY CASE location WHEN 'Before Hoop Driver 1' THEN 1 WHEN 'Before Char Station 2' THEN 2 ELSE 3 END;""")

sql("Raw material days", """DECLARE @now DATETIME = '2026-11-07 06:00';

WITH h AS (
    SELECT item_no, SUM(qty) AS on_hand FROM stock_move WHERE move_ts <= @now GROUP BY item_no
),
u AS (
    SELECT item_no, -SUM(qty) / 28.0 AS avg_day
    FROM stock_move
    WHERE kind = 'issue' AND move_ts > DATEADD(DAY, -28, @now) AND move_ts <= @now
    GROUP BY item_no
)
SELECT h.item_no, h.on_hand, CAST(u.avg_day AS DECIMAL(10,2)) AS avg_day,
    CAST(h.on_hand / u.avg_day AS DECIMAL(6,1)) AS days_cover
FROM h
JOIN u ON u.item_no = h.item_no
WHERE h.item_no IN ('STV-53', 'STV-30', 'HP-53', 'HP-30')
ORDER BY h.item_no DESC;""")

py("Little's Law", '''import pandas as pd
import pyodbc

conn = pyodbc.connect(
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=plant-sql01;DATABASE=PlantDB;"
    "Trusted_Connection=yes;TrustServerCertificate=yes;"
)
wip = pd.read_sql("SELECT location, AVG(barrels * 1.0) AS wip FROM wip_count GROUP BY location", conn).set_index("location")["wip"].astype(float)
# What drains each buffer, in barrels a week: the OEE week's output of the next machine, and the
# S&OP track's demand for finished goods. Hours are calendar hours: barrels wait through breaks too.
drain_week = pd.Series({"Before Hoop Driver 1": 6410, "Before Char Station 2": 6980, "Finished goods": 7000})
buffers = pd.DataFrame({"wip": wip, "per_hour": drain_week / 168})
buffers["wait_hours"] = buffers["wip"] / buffers["per_hour"]
print(buffers.reindex(drain_week.index).round(2).to_string())''')

py("The value stream timeline", '''raw_days = pd.read_sql(
    "SELECT (SELECT SUM(qty) FROM stock_move WHERE item_no = ? AND move_ts <= ?) AS on_hand, "
    "(SELECT -SUM(qty) / 28.0 FROM stock_move WHERE item_no = ? AND kind = 'issue' AND move_ts > ? AND move_ts <= ?) AS per_day",
    conn, params=["STV-53", "2026-11-07 06:00", "STV-53", "2026-10-10 06:00", "2026-11-07 06:00"],
).iloc[0].astype(float)
ideal_s = {"Conveyor 3": 60.0, "Hoop Driver 1": 3600 / 55, "Char Station 2": 72.0}
timeline = [
    ("Staves in the yard", raw_days["on_hand"] / raw_days["per_day"] * 24, "wait"),
    ("Conveyor 3", ideal_s["Conveyor 3"] / 3600, "process"),
    ("Before Hoop Driver 1", buffers.loc["Before Hoop Driver 1", "wait_hours"], "wait"),
    ("Hoop Driver 1", ideal_s["Hoop Driver 1"] / 3600, "process"),
    ("Before Char Station 2", buffers.loc["Before Char Station 2", "wait_hours"], "wait"),
    ("Char Station 2", ideal_s["Char Station 2"] / 3600, "process"),
    ("Finished goods", buffers.loc["Finished goods", "wait_hours"], "wait"),
]
vsm = pd.DataFrame(timeline, columns=["stage", "hours", "kind"])
lead_hours = vsm["hours"].sum()
for _, r in vsm.iterrows():
    print(f"{r['stage']:<22} {r['kind']:<8} {r['hours']:9.3f} h")
print(f"Lead time {lead_hours:,.1f} hours = {lead_hours / 24:.1f} days")''')

py("Value-added ratio", '''VALUE_ADDED_S = 30.0 + 45.0
process_s = vsm.loc[vsm["kind"] == "process", "hours"].sum() * 3600
ratio = VALUE_ADDED_S / (lead_hours * 3600)
print(f"Process time {process_s:.2f} s, of which value-added {VALUE_ADDED_S:.0f} s (driving the hoops, charring)")
print(f"Value-added ratio: {VALUE_ADDED_S:.0f} s of {lead_hours * 3600:,.0f} s = {ratio:.5%}")''')

py("Halve a buffer", '''for stage in ["Staves in the yard", "Before Hoop Driver 1", "Before Char Station 2", "Finished goods"]:
    saved = vsm.loc[vsm["stage"] == stage, "hours"].iloc[0] / 2
    print(f"Halve {stage:<22} lead time {lead_hours - saved:7.1f} h ({saved / lead_hours:5.1%} shorter)")''')

py("Standard work for Hoop Driver 1", '''TAKT_S = 81.0
hd1 = pd.DataFrame([
    ("Walk to the hoop rack", 4.0, "walk", True),
    ("Stage the next hoop", 8.0, "manual", True),
    ("Clamp the barrel", 6.0, "manual", False),
    ("Drive the hoops", 30.0, "machine", False),
    ("Inspect the hoop seat", 8.0, "manual", False),
    ("Unclamp and index", 3600 / 55 - 56.0, "machine", False),
], columns=["element", "seconds", "kind", "during_machine"])
by_kind = hd1.groupby("kind")["seconds"].sum()
operator = by_kind["manual"] + by_kind["walk"]
cycle = hd1["seconds"].sum() - hd1.loc[hd1["during_machine"], "seconds"].sum()
print(by_kind.round(2).to_string())
print(f"Sequential cycle {hd1['seconds'].sum():.2f} s; staging and walking while the hoops drive: {cycle:.2f} s")
print(f"Operator busy {operator:.0f} s of the {TAKT_S} s takt ({operator / TAKT_S:.0%})")''')

sql("Create audit_5s", """CREATE TABLE audit_5s (
    audit_date DATE NOT NULL,
    area VARCHAR(20) NOT NULL,
    s_name VARCHAR(20) NOT NULL,
    score TINYINT NOT NULL,
    PRIMARY KEY (audit_date, area, s_name)
);""")

sql("5S scores by area", """SELECT area, audit_date,
    SUM(CASE WHEN s_name = 'Sort' THEN score END) AS sort,
    SUM(CASE WHEN s_name = 'Set in order' THEN score END) AS set_in_order,
    SUM(CASE WHEN s_name = 'Shine' THEN score END) AS shine,
    SUM(CASE WHEN s_name = 'Standardize' THEN score END) AS standardize,
    SUM(CASE WHEN s_name = 'Sustain' THEN score END) AS sustain,
    SUM(score) AS total
FROM audit_5s
GROUP BY area, audit_date
ORDER BY area, audit_date;""")

py("Trend and weakest S", '''audit = pd.read_sql("SELECT audit_date, area, s_name, score FROM audit_5s", conn, parse_dates=["audit_date"])
audit["score"] = audit["score"].astype(int)
totals = audit.pivot_table(index="audit_date", columns="area", values="score", aggfunc="sum")
first, last = totals.index.min(), totals.index.max()
latest = audit[audit["audit_date"] == last]
for area in totals.columns:
    now = latest[latest["area"] == area]
    low = now["score"].min()
    weakest = ", ".join(now.loc[now["score"] == low, "s_name"])
    print(f"{area:<11} {totals.loc[first, area]:>2} -> {totals.loc[last, area]:>2} of 20; lowest now ({low}): {weakest}")''')

py("An SQDC board", '''week = pd.read_sql(
    "SELECT (SELECT SUM(made_this_hour) FROM v_hourly_barrels WHERE ts > ? AND ts <= ?) AS barrels, "
    "(SELECT SUM(qty) FROM reject_log WHERE ts >= ? AND ts < ?) AS rejects",
    conn, params=["2026-10-31 06:00", "2026-11-07 06:00"] * 2,
).iloc[0].astype(float)
hd1_good = 6410 - 96
board = {
    "Safety (5S, not a safety measure)": f"{latest['score'].sum()} of 60",
    "Quality": f"{week['rejects'] / week['barrels'] * 1e6:,.0f} rejects per million ({week['rejects']:.0f} of {week['barrels']:,.0f})",
    "Delivery": f"{hd1_good:,} good at the bottleneck against 7,000 ({hd1_good / 7000:.1%})",
    "Cost": "$251,876 of OEE loss a week",
}
for k, v in board.items():
    print(f"{k:<34} {v}")''')

py("VSM workbook", '''from openpyxl import Workbook, load_workbook

wb = Workbook()
ws = wb.active
ws.title = "VSM"
ws.append(["Stage", "Kind", "Hours"])
for _, r in vsm.iterrows():
    ws.append([r["stage"], r["kind"], r["hours"]])
last = ws.max_row
ws.append(["Lead time", None, f"=SUM(C2:C{last})"])
ws.append(["Value-added seconds", None, VALUE_ADDED_S])
wb.save("vsm.xlsx")
back = load_workbook("vsm.xlsx")["VSM"]
rows = list(back.iter_rows(min_row=2, max_row=last, values_only=True))
print(f"{len(rows)} stages; lead time cell {back.cell(last + 1, 3).value}")
print(f"Stages add to {sum(r[2] for r in rows):,.2f} h (pandas {lead_hours:,.2f} h)")''')

py("Where to start", '''levers = pd.DataFrame([
    ("Run through the breaks", 425.8, 0.0, "S&OP"),
    ("P1 and P2 at the bottleneck", 57.9, 0.0, "S&OP, Savings"),
    ("Halve the stave yard", 0.0, vsm.loc[0, "hours"] / 2 / 24, "this track"),
    ("Halve finished goods", 0.0, buffers.loc["Finished goods", "wait_hours"] / 2 / 24, "this track"),
    ("SMED on Conveyor 3", 0.0, 0.0, "S&OP"),
], columns=["lever", "barrels_week", "lead_days_saved", "from"])
print(levers.round(2).to_string(index=False))''')
