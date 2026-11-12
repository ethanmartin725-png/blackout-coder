# Root Cause: Char Flares. Every step's code, in order, with its language. SQL steps build rca.sql and
# run one at a time on a fresh PlantDB through foundations/sql_exec.py (steps after "Record the
# verdicts" get that step's UPDATE first); Python steps build rca.py and run in sequence. build28.py
# writes site/data/tracks/28-rca.js.
CODE, LANG = {}, {}

def sql(title, code):
    CODE[title], LANG[title] = code, "sql"

def py(title, code):
    CODE[title], LANG[title] = code, "python"

WEEK = "DECLARE @start DATETIME = '2026-10-31 06:00', @end DATETIME = '2026-11-07 06:00';\n"

sql("The flares in the week", WEEK + """
SELECT fault_id, start_ts,
    CAST(DATEDIFF(SECOND, start_ts, end_ts) / 60.0 AS DECIMAL(5,2)) AS minutes,
    CASE WHEN DATEPART(HOUR, start_ts) >= 22 OR DATEPART(HOUR, start_ts) < 6 THEN 'C'
         WHEN DATEPART(HOUR, start_ts) >= 14 THEN 'B' ELSE 'A' END AS shift,
    DATEPART(HOUR, start_ts) AS hour
FROM fault_log
WHERE machine = 'Char Station 2' AND fault = 'Char flare'
    AND start_ts >= @start AND start_ts < @end
ORDER BY start_ts;""")

sql("The problem in numbers", WEEK + """
WITH f AS (
    SELECT fault_id, DATEDIFF(SECOND, start_ts, end_ts) / 60.0 AS minutes
    FROM fault_log
    WHERE machine = 'Char Station 2' AND fault = 'Char flare'
        AND start_ts >= @start AND start_ts < @end
)
SELECT COUNT(*) AS flares,
    CAST(SUM(f.minutes) AS DECIMAL(6,2)) AS minutes,
    CAST(SUM(f.minutes) / 60 * m.ideal_rate_hr * m.margin_per_barrel AS DECIMAL(8,2)) AS lost_usd,
    COUNT(w.wo_id) AS work_orders,
    SUM(w.act_hours) AS relight_hours
FROM f
CROSS JOIN dim_machine AS m
LEFT JOIN work_order AS w ON w.fault_id = f.fault_id
WHERE m.machine = 'Char Station 2'
GROUP BY m.ideal_rate_hr, m.margin_per_barrel;""")

sql("Create rca_node", """CREATE TABLE rca_node (
    node_id INT PRIMARY KEY,
    parent_id INT NULL,
    kind VARCHAR(5) NOT NULL,
    category VARCHAR(12) NULL,
    text VARCHAR(100) NOT NULL,
    status VARCHAR(8) NOT NULL,
    evidence VARCHAR(100) NULL
);""")

sql("The fishbone", """SELECT category,
    COUNT(*) AS causes,
    STRING_AGG(text, '; ') WITHIN GROUP (ORDER BY node_id) AS candidate_causes
FROM rca_node
WHERE kind = 'cause'
GROUP BY category
ORDER BY MIN(node_id);""")

py("Shift or time of day", '''from math import comb
import pandas as pd
import pyodbc

WEEK_START, WEEK_END = "2026-10-31 06:00", "2026-11-07 06:00"
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=plant-sql01;DATABASE=PlantDB;"
    "Trusted_Connection=yes;TrustServerCertificate=yes;"
)
flares = pd.read_sql(
    "SELECT fault_id, start_ts, end_ts FROM fault_log WHERE machine = ? AND fault = ? AND start_ts >= ? AND start_ts < ?",
    conn, params=["Char Station 2", "Char flare", WEEK_START, WEEK_END], parse_dates=["start_ts", "end_ts"])
hour = flares["start_ts"].dt.hour
shift = pd.Series(["C" if h >= 22 or h < 6 else "B" if h >= 14 else "A" for h in hour])
counts = shift.value_counts().reindex(["A", "B", "C"])
expected = len(flares) / 3
chi2 = ((counts - expected) ** 2 / expected).sum()
print(f"By shift {counts.to_dict()}: chi-square {chi2:.2f}, p = {2.718281828 ** (-chi2 / 2):.2f}")

def binom_upper(k, n, p):
    return sum(comb(n, i) * p ** i * (1 - p) ** (n - i) for i in range(k, n + 1))

night = int(((hour >= 20) | (hour < 6)).sum())
print(f"20:00 to 06:00: {night} of {len(flares)} in 10 of 24 hours, p = {binom_upper(night, len(flares), 10 / 24):.3f}")''')

sql("Air pressure at each flare", """SELECT f.fault_id, f.start_ts, e.min_psi,
    CASE WHEN e.min_psi < 85 THEN 'dip' ELSE '' END AS dip,
    (SELECT TOP 1 a.machine FROM fault_log AS a
     WHERE a.fault = 'Low air' AND a.start_ts >= DATEADD(HOUR, -1, e.hour_end) AND a.start_ts < e.hour_end) AS low_air_on
FROM fault_log AS f
JOIN energy_log AS e
    ON e.hour_end = DATEADD(HOUR, DATEDIFF(HOUR, 0, f.start_ts) + 1, 0)
WHERE f.machine = 'Char Station 2' AND f.fault = 'Char flare'
    AND f.start_ts >= '2026-10-31 06:00' AND f.start_ts < '2026-11-07 06:00'
ORDER BY f.start_ts;""")

py("Low air by chance", '''energy = pd.read_sql("SELECT hour_end, min_psi FROM energy_log WHERE hour_end > ? AND hour_end <= ?",
                     conn, params=[WEEK_START, WEEK_END], parse_dates=["hour_end"])
dip_share = (energy["min_psi"].astype(float) < 85).mean()
flare_hours = flares["start_ts"].dt.floor("h") + pd.Timedelta(hours=1)
hit = energy.set_index("hour_end").loc[flare_hours, "min_psi"].astype(float).lt(85).sum()
chance = 1 - (1 - dip_share) ** len(flares)
print(f"Dip hours: {dip_share:.1%} of the week; flares in a dip hour: {hit} of {len(flares)}")
print(f"Chance of at least one by luck: {chance:.0%}")''')

py("Before and after the burner PM", '''pm = pd.read_sql("SELECT done_ts FROM work_order WHERE machine = ? AND description LIKE ?",
                 conn, params=["Char Station 2", "Monthly PM%"], parse_dates=["done_ts"])["done_ts"].iloc[0]
days_before = (pm - pd.Timestamp(WEEK_START)).total_seconds() / 86400
days_after = 7 - days_before
before = int((flares["start_ts"] < pm).sum())
after = len(flares) - before
p = binom_upper(before, len(flares), days_before / 7)
print(f"PM done {pm}: {before} flares in {days_before:.2f} days ({before / days_before:.2f}/day), "
      f"{after} in {days_after:.2f} ({after / days_after:.2f}/day)")
print(f"p = {p:.2f} that {before} or more of {len(flares)} land before it by chance")''')

sql("Create flame_signal", """CREATE TABLE flame_signal (
    hour_end DATETIME NOT NULL,
    burner CHAR(1) NOT NULL,
    avg_ua DECIMAL(4,2) NOT NULL,
    min_ua DECIMAL(4,2) NOT NULL,
    relights TINYINT NOT NULL,
    PRIMARY KEY (hour_end, burner)
);""")

sql("Flame signal by burner", WEEK + """
SELECT CAST(DATEADD(HOUR, -7, hour_end) AS DATE) AS prod_day,
    CAST(AVG(CASE WHEN burner = 'A' THEN avg_ua END) AS DECIMAL(4,2)) AS a_avg,
    CAST(AVG(CASE WHEN burner = 'B' AND DATEPART(HOUR, DATEADD(HOUR, -1, hour_end)) BETWEEN 6 AND 19 THEN avg_ua END) AS DECIMAL(4,2)) AS b_day,
    CAST(AVG(CASE WHEN burner = 'B' AND DATEPART(HOUR, DATEADD(HOUR, -1, hour_end)) NOT BETWEEN 6 AND 19 THEN avg_ua END) AS DECIMAL(4,2)) AS b_night,
    MIN(CASE WHEN burner = 'B' THEN min_ua END) AS b_lowest
FROM flame_signal
WHERE hour_end > @start AND hour_end <= @end
GROUP BY CAST(DATEADD(HOUR, -7, hour_end) AS DATE)
ORDER BY prod_day;""")

sql("Flame signal at each flare", """SELECT f.fault_id, f.start_ts,
    a.min_ua AS a_min, b.min_ua AS b_min, b.relights AS b_relights
FROM fault_log AS f
JOIN flame_signal AS a
    ON a.burner = 'A' AND a.hour_end = DATEADD(HOUR, DATEDIFF(HOUR, 0, f.start_ts) + 1, 0)
JOIN flame_signal AS b
    ON b.burner = 'B' AND b.hour_end = a.hour_end
WHERE f.machine = 'Char Station 2' AND f.fault = 'Char flare'
ORDER BY f.start_ts;""")

py("How well the signal predicts", '''DROPOUT_UA = 1.5
sig = pd.read_sql("SELECT hour_end, min_ua FROM flame_signal WHERE burner = ? AND hour_end > ? AND hour_end <= ?",
                  conn, params=["B", WEEK_START, WEEK_END], parse_dates=["hour_end"]).set_index("hour_end")
sig["low"] = sig["min_ua"].astype(float) < DROPOUT_UA
sig["flare"] = sig.index.isin(flare_hours)
table = pd.crosstab(sig["low"], sig["flare"]).rename(index={False: "signal ok", True: "under 1.5 uA"},
                                                     columns={False: "no flare", True: "flare"})
table = table.rename_axis(index=None, columns=None)
print(table.to_string())
caught = table.loc["under 1.5 uA", "flare"] / table["flare"].sum()
right = table.loc["under 1.5 uA", "flare"] / table.loc["under 1.5 uA"].sum()
print(f"Flare hours caught {caught:.0%}; low-signal hours that flared {right:.0%}")''')

VERDICTS = """UPDATE rca_node SET status = v.status, evidence = v.evidence
FROM rca_node
JOIN (VALUES
    (1, 'rejected', 'By shift 1 / 3 / 4, p = 0.42'),
    (2, 'verified', 'B under 1.5 uA in every flare hour; handoff note 05:52'),
    (3, 'rejected', 'Shared gas train, but Burner A never dips'),
    (4, 'verified', 'WO 2 lists no igniter gap or flame-signal check'),
    (5, 'open', 'No stave moisture data'),
    (6, 'open', 'Check the rod at the igniter change'),
    (7, 'rejected', '1 of 8 flares in a dip hour; 21% by chance'),
    (8, 'open', '7 of 8 at night, p = 0.011 but the window was picked after looking')
) AS v(node_id, status, evidence) ON v.node_id = rca_node.node_id;"""
sql("Record the verdicts", VERDICTS)

sql("The 5-Why chain", """WITH chain AS (
    SELECT node_id, 0 AS why, text, evidence
    FROM rca_node
    WHERE kind = 'why' AND parent_id IS NULL
    UNION ALL
    SELECT n.node_id, c.why + 1, n.text, n.evidence
    FROM rca_node AS n
    JOIN chain AS c ON n.parent_id = c.node_id
)
SELECT why, text, evidence
FROM chain
ORDER BY why;""")

sql("Verified, rejected, open", """SELECT status,
    COUNT(*) AS causes,
    STRING_AGG(category, ', ') WITHIN GROUP (ORDER BY node_id) AS categories
FROM rca_node
WHERE kind = 'cause'
GROUP BY status
ORDER BY CASE status WHEN 'verified' THEN 1 WHEN 'open' THEN 2 ELSE 3 END;""")

py("Action register", '''from openpyxl import Workbook, load_workbook

actions = pd.DataFrame([
    ("Contain", "Replace Burner B igniter (WO 42)", "Maintenance", "2026-11-08", "B over 1.5 uA every hour"),
    ("Fix the root", "Add igniter gap and flame-signal checks to the monthly burner PM", "Maintenance planner", "2026-11-20", "New PM sheet in use"),
    ("Detect", "Alarm when B averages under 2.5 uA for an hour", "Controls", "2026-11-27", "Alarm tested"),
    ("Close out", "Finish the gas pressure switch calibration (WO 14)", "Maintenance", "2026-11-13", "WO 14 closed"),
    ("Check", "Stave moisture on the night shift for two weeks", "Quality", "2026-11-27", "Cause 5 closed"),
], columns=["type", "action", "owner", "due", "done_when"])
print(actions.to_string(index=False))

wb = Workbook()
ws = wb.active
ws.title = "A3"
ws.append(["Problem", "Char Station 2: 8 char flares, 70.05 min a week"])
ws.append(["Root cause", "Monthly burner PM has no igniter or flame check"])
ws.append([])
ws.append(list(actions.columns))
for row in actions.itertuples(index=False):
    ws.append(list(row))
wb.save("rca_a3.xlsx")
back = load_workbook("rca_a3.xlsx")["A3"]
print(f"A3 sheet: {back.max_row - 4} actions read back; root cause: {back['B2'].value}")''')

sql("After the igniter", """DECLARE @changed DATETIME = '2026-11-08 14:00';

SELECT CASE WHEN hour_end <= @changed THEN 'before' ELSE 'after' END AS period,
    COUNT(*) AS hours,
    CAST(AVG(avg_ua) AS DECIMAL(4,2)) AS avg_ua,
    MIN(min_ua) AS lowest,
    SUM(CASE WHEN min_ua < 1.5 THEN 1 ELSE 0 END) AS dropout_hours,
    SUM(relights) AS relights
FROM flame_signal
WHERE burner = 'B'
GROUP BY CASE WHEN hour_end <= @changed THEN 'before' ELSE 'after' END
ORDER BY MIN(hour_end);""")

py("What it is worth", '''MARGIN, RATE, LPG = 42.50, 50, 2.35
minutes = (flares["end_ts"] - flares["start_ts"]).dt.total_seconds().sum() / 60
lost = minutes / 60 * RATE * MARGIN
propane = 0.5 * minutes
shifts = sorted({int((s - pd.Timestamp(WEEK_START)).total_seconds() // 28800) for s in flares["start_ts"]})
print(f"Downtime {minutes:.2f} min: ${lost:,.2f} a week at ideal rate and margin (P4's baseline)")
print(f"Flare propane {propane:.2f} gal: ${propane * LPG:,.2f} a week at ${LPG:.2f}")
print(f"Shifts with a flare, from {WEEK_START}: {shifts} (the SPC track's deep-char shifts)")''')
