# Kaizen / A3: every step's code, in order, with its language. SQL steps build kaizen.sql and run one
# at a time on a fresh PlantDB through foundations/sql_exec.py; Python steps build kaizen.py and run in
# sequence. build23.py writes site/data/tracks/23-kaizen.js.
CODE, LANG = {}, {}

def sql(title, code):
    CODE[title], LANG[title] = code, "sql"

def py(title, code):
    CODE[title], LANG[title] = code, "python"

sql("Create misfeed_event", """CREATE TABLE misfeed_event (
    event_id INT IDENTITY(1,1) PRIMARY KEY,
    fault_id INT NULL,
    start_ts DATETIME NOT NULL,
    end_ts DATETIME NOT NULL,
    hoop_size VARCHAR(6) NOT NULL,
    cause VARCHAR(30) NOT NULL,
    phase VARCHAR(8) NOT NULL
);""")

sql("The problem in numbers", """DECLARE @start DATETIME = '2026-10-31 06:00', @end DATETIME = '2026-11-07 06:00';

SELECT COUNT(*) AS events,
    CAST(SUM(DATEDIFF(SECOND, f.start_ts, f.end_ts)) / 60.0 AS DECIMAL(8,2)) AS minutes,
    CAST(SUM(DATEDIFF(SECOND, f.start_ts, f.end_ts)) / 3600.0 * m.ideal_rate_hr * m.margin_per_barrel
        AS DECIMAL(10,2)) AS usd_per_week
FROM fault_log AS f
JOIN dim_machine AS m ON m.machine = f.machine
WHERE f.machine = 'Hoop Driver 1' AND f.fault = 'Hoop misfeed'
    AND f.start_ts >= @start AND f.start_ts < @end
GROUP BY m.ideal_rate_hr, m.margin_per_barrel;""")

sql("Stratify the baseline", """SELECT
    CASE WHEN GROUPING(s.shift) = 0 THEN 'shift ' + s.shift ELSE e.hoop_size END AS stratum,
    COUNT(*) AS events,
    CAST(SUM(DATEDIFF(SECOND, e.start_ts, e.end_ts)) / 60.0 AS DECIMAL(8,2)) AS minutes
FROM misfeed_event AS e
CROSS APPLY (SELECT CASE
    WHEN DATEPART(HOUR, e.start_ts) >= 6 AND DATEPART(HOUR, e.start_ts) < 14 THEN 'A'
    WHEN DATEPART(HOUR, e.start_ts) >= 14 AND DATEPART(HOUR, e.start_ts) < 22 THEN 'B'
    ELSE 'C' END AS shift) AS s
WHERE e.phase = 'baseline'
GROUP BY GROUPING SETS ((s.shift), (e.hoop_size))
ORDER BY GROUPING(s.shift), stratum;""")

sql("Pareto of causes", """WITH c AS (
    SELECT cause, COUNT(*) AS events,
        SUM(DATEDIFF(SECOND, start_ts, end_ts)) / 60.0 AS minutes
    FROM misfeed_event
    WHERE phase = 'baseline'
    GROUP BY cause
)
SELECT cause, events,
    CAST(minutes AS DECIMAL(8,2)) AS minutes,
    CAST(100.0 * SUM(minutes) OVER (ORDER BY minutes DESC) / SUM(minutes) OVER () AS DECIMAL(5,1)) AS cum_pct
FROM c
ORDER BY minutes DESC;""")

py("Fishbone tally", '''import math
import pandas as pd
import pyodbc

conn = pyodbc.connect(
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=plant-sql01;DATABASE=PlantDB;"
    "Trusted_Connection=yes;TrustServerCertificate=yes;"
)
ev = pd.read_sql("SELECT start_ts, end_ts, hoop_size, cause, phase FROM misfeed_event", conn, parse_dates=["start_ts", "end_ts"])
ev["minutes"] = (ev["end_ts"] - ev["start_ts"]).dt.total_seconds() / 60
BONES = {"Machine": ["Feed rail worn", "Sensor late"], "Material": ["Hoop out of round"],
         "Method": ["Wrong size loaded"], "Man": [], "Measurement": [], "Mother Nature": []}
branch = {cause: bone for bone, causes in BONES.items() for cause in causes}
base = ev[ev["phase"] == "baseline"].assign(bone=lambda d: d["cause"].map(branch).fillna("Unassigned"))
tally = base.groupby("bone").agg(events=("cause", "size"), minutes=("minutes", "sum"))
tally = tally.reindex(list(BONES) + ["Unassigned"]).fillna(0)
print(tally.astype({"events": int}).round(2).to_string())''')

py("Five whys with evidence", '''def one(sql, params=None):
    return pd.read_sql(sql, conn, params=params or []).iloc[0, 0]

WHYS = [
    ("Why does Hoop Driver 1 stop?", "Hoops misfeed: 11 stops in the baseline week",
     "SELECT COUNT(*) FROM misfeed_event WHERE phase = ?", ["baseline"]),
    ("Why do hoops misfeed?", "The worn feed rail steers them off centre",
     "SELECT COUNT(*) FROM misfeed_event WHERE phase = ? AND cause = ?", ["baseline", "Feed rail worn"]),
    ("Why is the rail worn?", "No PM or improvement targets misfeeds",
     "SELECT COUNT(*) FROM work_order WHERE failure_mode = ? AND wo_type IN ('PM', 'Improvement')", ["Hoop misfeed"]),
    ("Why is there no PM?", "Repairs recorded only 'cleared feed', so nothing pointed at the rail",
     "SELECT COUNT(*) FROM work_order WHERE failure_mode = ? AND description LIKE ?", ["Hoop misfeed", "%cleared feed"]),
]
for n, (why, because, sql, params) in enumerate(WHYS, start=1):
    print(f"{n}. {why}\\n   {because}  [evidence: {one(sql, params)}]")''')

py("Countermeasure plan", '''plan = pd.DataFrame([
    ("Feed rail worn", "Realign and hard-face the feed rail", "Maintenance", "2026-11-11"),
    ("Sensor late", "Rebuild the misfeed sensor, reset its timing", "Maintenance", "2026-11-12"),
    ("Feed rail worn", "Weekly feed-rail check added to the PM", "J. Ruiz", "2026-11-17"),
    ("Hoop out of round", "Incoming inspection of hoop lots", "Purchasing", "2026-11-20"),
    ("Wrong size loaded", "Colour-coded hoop racks by size", "J. Ruiz", "2026-11-24"),
], columns=["cause", "action", "owner", "done"])
at_stake = base.groupby("cause")["minutes"].sum()
plan["baseline_min"] = plan["cause"].map(at_stake).round(2)
print(plan.to_string(index=False))
print(f"Causes with an action: {plan['cause'].nunique()} of {base['cause'].nunique()}, "
      f"{at_stake[plan['cause'].unique()].sum():.2f} of {at_stake.sum():.2f} baseline minutes")''')

sql("Weekly results", """DECLARE @from DATETIME = '2026-11-07 06:00';

SELECT CAST(DATEADD(DAY, 7 * w.k, @from) AS DATE) AS week_start,
    COUNT(*) AS events,
    CAST(SUM(DATEDIFF(SECOND, e.start_ts, e.end_ts)) / 60.0 AS DECIMAL(8,1)) AS minutes
FROM misfeed_event AS e
CROSS APPLY (SELECT DATEDIFF(SECOND, @from, e.start_ts) / 604800 AS k) AS w
WHERE e.phase = 'after'
GROUP BY w.k
ORDER BY w.k;""")

py("Is the drop real?", '''after = ev[ev["phase"] == "after"].copy()
after["week"] = ((after["start_ts"] - pd.Timestamp("2026-11-07 06:00")) // pd.Timedelta(days=7)).astype(int)
before_n = len(base)
late_n = int((after["week"] >= 2).sum())
n, p = before_n + late_n, 1 / 3
p_value = sum(math.comb(n, k) * p ** k * (1 - p) ** (n - k) for k in range(before_n, n + 1))
print(f"Baseline {before_n} in 1 week; weeks 3 and 4: {late_n} in 2 weeks ({late_n / 2:.1f} a week)")
print(f"If the rate had not changed, {before_n} or more of {n} would land in the baseline week "
      f"with probability {p_value:.4f}")''')

py("Run chart", '''events = pd.concat([base, after])
prod_day = (events["start_ts"] - pd.Timedelta(hours=6)).dt.normalize()
days = pd.date_range("2026-10-31", "2026-12-04", freq="D")
daily = prod_day.value_counts().reindex(days, fill_value=0)
median = daily.median()
run, best, best_end = 0, 0, None
for day, v in daily.items():
    if v == median:
        continue
    run = run + 1 if v < median else 0
    if run > best:
        best, best_end = run, day
print(f"{len(daily)} production days, median {median:g} misfeeds a day")
print("By week: " + " ".join(str(int(daily[i:i + 7].sum())) for i in range(0, len(daily), 7)))
print(f"Longest run below the median: {best} days, ending {best_end:%Y-%m-%d}")
print(f"Shift signal (6 or more in a row): {best >= 6}")''')

py("Cause mix before and after", '''mix = pd.DataFrame({
    "baseline_per_week": base["cause"].value_counts(),
    "weeks_3_4_per_week": after[after["week"] >= 2]["cause"].value_counts() / 2,
}).fillna(0)
mix["change"] = mix["weeks_3_4_per_week"] - mix["baseline_per_week"]
print(mix.sort_values("baseline_per_week", ascending=False).to_string())''')

py("Dollars against the target", '''rate = pd.read_sql("SELECT ideal_rate_hr, margin_per_barrel FROM dim_machine WHERE machine = ?",
                   conn, params=["Hoop Driver 1"]).iloc[0].astype(float)
usd_per_min = rate["ideal_rate_hr"] * rate["margin_per_barrel"] / 60
baseline_min = base["minutes"].sum()
target = baseline_min * 0.50 * usd_per_min
weekly = after.groupby("week")["minutes"].sum()
saved = (baseline_min - weekly) * usd_per_min
for week, usd in saved.items():
    print(f"week {week + 1}: {weekly[week]:5.1f} min, saved ${usd:8,.2f}  {'meets' if usd >= target else 'below'} target")
print(f"Target ${target:,.2f} a week; average ${saved.mean():,.2f} a week over {len(saved)} weeks")''')

py("Sustain check", '''c_bar = after[after["week"] >= 2].groupby("week").size().mean()
ucl = c_bar + 3 * math.sqrt(c_bar)
lcl = max(0.0, c_bar - 3 * math.sqrt(c_bar))
print(f"New process: {c_bar:.1f} misfeeds a week (weeks 3 and 4)")
print(f"c-chart limits: {lcl:.1f} to {ucl:.1f}; a week with {math.floor(ucl) + 1} or more says the fix has slipped")
print(f"Baseline week's {before_n} would {'be' if before_n > ucl else 'not be'} outside")''')

py("A3 workbook", '''from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font

wb = Workbook()
ws = wb.active
ws.title = "A3"
ws.append(["Kaizen A3: Hoop Driver 1 misfeeds (Savings Tracker P2)"])
ws["A1"].font = Font(bold=True, size=14)
ws.append(["Problem", f"{before_n} misfeeds, {baseline_min:.2f} min, ${baseline_min * usd_per_min:,.2f} a week"])
ws.append(["Root cause", WHYS[1][1] + "; " + WHYS[3][1]])
ws.append(["Target", f"Half the minutes: ${target:,.2f} a week"])
ws.append([])
ws.append(["Countermeasure", "Owner", "Done"])
for _, r in plan.iterrows():
    ws.append([r["action"], r["owner"], r["done"]])
ws.append([])
ws.append(["Week", "Minutes", "Saved $"])
for week, usd in saved.items():
    ws.append([week + 1, round(weekly[week], 1), round(usd, 2)])
ws.append(["Sustain", f"c-chart UCL {ucl:.1f} misfeeds a week"])
wb.save("kaizen_a3.xlsx")

back = load_workbook("kaizen_a3.xlsx")["A3"]
print(back["A1"].value)
print(f"{back.max_row} rows; saved $ on the sheet add to "
      f"${sum(r[2] for r in back.iter_rows(min_row=back.max_row - 4, max_row=back.max_row - 1, values_only=True)):,.2f}"
      f" (pandas ${saved.sum():,.2f})")''')
