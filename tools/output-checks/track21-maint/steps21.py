# Maintenance / CMMS: every step's code, in order, with its language. SQL steps build maint.sql and
# run one at a time on a fresh PlantDB through foundations/sql_exec.py; Python steps build maint.py
# and run in sequence. build21.py writes site/data/tracks/21-maint.js.
CODE, LANG = {}, {}

def sql(title, code):
    CODE[title], LANG[title] = code, "sql"

def py(title, code):
    CODE[title], LANG[title] = code, "python"

WEEK = """DECLARE @start DATETIME = '2026-10-31 06:00', @end DATETIME = '2026-11-07 06:00';
"""
SECS = """CROSS APPLY (SELECT DATEDIFF(SECOND, f.start_ts, f.end_ts) AS secs) AS d"""

sql("Create work_order", """CREATE TABLE work_order (
    wo_id INT IDENTITY(1,1) PRIMARY KEY,
    machine VARCHAR(50) NOT NULL,
    wo_type VARCHAR(12) NOT NULL,
    description VARCHAR(100) NOT NULL,
    failure_mode VARCHAR(30) NULL,
    fault_id INT NULL,
    priority TINYINT NOT NULL,
    created_ts DATETIME NOT NULL,
    due_ts DATETIME NULL,
    done_ts DATETIME NULL,
    est_hours DECIMAL(5,2) NULL,
    act_hours DECIMAL(5,2) NULL,
    parts_cost DECIMAL(8,2) NOT NULL DEFAULT 0
);""")

sql("Breakdowns and minor stops", WEEK + f"""
SELECT f.machine,
    SUM(CASE WHEN d.secs >= 300 THEN 1 ELSE 0 END) AS breakdowns,
    CAST(SUM(CASE WHEN d.secs >= 300 THEN d.secs ELSE 0 END) / 60.0 AS DECIMAL(8,2)) AS breakdown_min,
    SUM(CASE WHEN d.secs < 300 THEN 1 ELSE 0 END) AS minor_stops,
    CAST(SUM(CASE WHEN d.secs < 300 THEN d.secs ELSE 0 END) / 60.0 AS DECIMAL(8,2)) AS minor_min
FROM fault_log AS f
{SECS}
WHERE f.start_ts >= @start AND f.start_ts < @end
GROUP BY f.machine
ORDER BY f.machine;""")

sql("MTBF and MTTR", WEEK + f"""DECLARE @planned_min FLOAT = 9450;

WITH m AS (
    SELECT f.machine,
        SUM(d.secs) / 60.0 AS down_min,
        SUM(CASE WHEN d.secs >= 300 THEN 1 ELSE 0 END) AS breakdowns,
        SUM(CASE WHEN d.secs >= 300 THEN d.secs ELSE 0 END) / 60.0 AS breakdown_min
    FROM fault_log AS f
    {SECS}
    WHERE f.start_ts >= @start AND f.start_ts < @end
    GROUP BY f.machine
)
SELECT machine, breakdowns,
    CAST(@planned_min - down_min AS DECIMAL(8,2)) AS operating_min,
    CAST((@planned_min - down_min) / NULLIF(breakdowns, 0) AS DECIMAL(8,1)) AS mtbf_min,
    CAST(breakdown_min / NULLIF(breakdowns, 0) AS DECIMAL(6,2)) AS mttr_min
FROM m
ORDER BY machine;""")

py("Two kinds of availability", '''import pandas as pd
import pyodbc

WEEK_START, WEEK_END, NOW = "2026-10-31 06:00", "2026-11-07 06:00", "2026-11-07 06:00"
PLANNED_MIN = 9450
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=plant-sql01;DATABASE=PlantDB;"
    "Trusted_Connection=yes;TrustServerCertificate=yes;"
)
faults = pd.read_sql(
    "SELECT fault_id, machine, fault, start_ts, end_ts FROM fault_log WHERE start_ts >= ? AND start_ts < ?",
    conn, params=[WEEK_START, WEEK_END], parse_dates=["start_ts", "end_ts"],
)
faults["minutes"] = (faults["end_ts"] - faults["start_ts"]).dt.total_seconds() / 60
faults["breakdown"] = faults["minutes"] >= 5
m = faults.groupby("machine").agg(down=("minutes", "sum"), n=("breakdown", "sum"),
                                  bd_min=("minutes", lambda s: s[s >= 5].sum()))
m["mtbf"] = (PLANNED_MIN - m["down"]) / m["n"]
m["mttr"] = m["bd_min"] / m["n"]
m["inherent"] = m["mtbf"] / (m["mtbf"] + m["mttr"])
m["measured"] = (PLANNED_MIN - m["down"]) / PLANNED_MIN
for machine, r in m.iterrows():
    print(f"{machine:<15} inherent {r['inherent']:.4f}  measured {r['measured']:.4f}  "
          f"gap {(r['inherent'] - r['measured']) * PLANNED_MIN:6.2f} min")''')

sql("Breakdowns with no work order", WEEK + f"""
SELECT f.fault_id, f.machine, f.fault, f.start_ts,
    CAST(d.secs / 60.0 AS DECIMAL(6,2)) AS minutes
FROM fault_log AS f
{SECS}
LEFT JOIN work_order AS w ON w.fault_id = f.fault_id
WHERE f.start_ts >= @start AND f.start_ts < @end
    AND d.secs >= 300
    AND w.wo_id IS NULL
ORDER BY f.start_ts;""")

sql("PM compliance", """DECLARE @now DATETIME = '2026-11-07 06:00';

SELECT ISNULL(machine, 'All') AS machine,
    COUNT(*) AS pms_due,
    SUM(c.on_time) AS on_time,
    CAST(100.0 * SUM(c.on_time) / COUNT(*) AS DECIMAL(5,1)) AS compliance_pct
FROM work_order AS w
CROSS APPLY (SELECT CASE
    WHEN w.done_ts <= DATEADD(MINUTE, DATEDIFF(MINUTE, w.created_ts, w.due_ts) / 10, w.due_ts) THEN 1
    ELSE 0 END AS on_time) AS c
WHERE w.wo_type = 'PM' AND w.due_ts < @now
GROUP BY ROLLUP (machine);""")

sql("Planned and reactive hours", WEEK + """
SELECT CASE WHEN wo_type = 'Corrective' THEN 'Reactive' ELSE 'Planned' END AS kind,
    COUNT(*) AS orders,
    SUM(act_hours) AS hours,
    CAST(100.0 * SUM(act_hours) / SUM(SUM(act_hours)) OVER () AS DECIMAL(5,1)) AS share_pct
FROM work_order
WHERE done_ts >= @start AND done_ts < @end
GROUP BY CASE WHEN wo_type = 'Corrective' THEN 'Reactive' ELSE 'Planned' END;""")

sql("Backlog in weeks", """DECLARE @now DATETIME = '2026-11-07 06:00';
DECLARE @crew_hours_week DECIMAL(5,1) = 12.0;

SELECT COUNT(*) AS open_orders,
    SUM(est_hours) AS open_hours,
    @crew_hours_week AS crew_hours_week,
    CAST(SUM(est_hours) / @crew_hours_week AS DECIMAL(5,2)) AS backlog_weeks
FROM work_order
WHERE done_ts IS NULL AND created_ts < @now;""")

sql("Backlog aging", """DECLARE @now DATETIME = '2026-11-07 06:00';

SELECT wo_id, machine, wo_type, description, priority,
    DATEDIFF(DAY, created_ts, @now) AS age_days,
    CASE
        WHEN DATEDIFF(DAY, created_ts, @now) <= 7 THEN '0-7'
        WHEN DATEDIFF(DAY, created_ts, @now) <= 30 THEN '8-30'
        ELSE 'over 30'
    END AS bucket,
    CASE WHEN due_ts < @now THEN 'overdue' ELSE '' END AS status
FROM work_order
WHERE done_ts IS NULL AND created_ts < @now
ORDER BY age_days DESC;""")

sql("Repeat failures", WEEK + f"""
WITH r AS (
    SELECT f.machine, f.fault, COUNT(*) AS events,
        CAST(SUM(d.secs) / 60.0 AS DECIMAL(8,2)) AS minutes
    FROM fault_log AS f
    {SECS}
    WHERE f.start_ts >= @start AND f.start_ts < @end
    GROUP BY f.machine, f.fault
    HAVING COUNT(*) >= 3
)
SELECT r.machine, r.fault, r.events, r.minutes,
    (SELECT COUNT(*) FROM work_order AS w
     WHERE w.machine = r.machine AND w.failure_mode = r.fault
         AND w.wo_type IN ('PM', 'Improvement')) AS preventive_orders
FROM r
ORDER BY r.minutes DESC;""")

py("Before and after the PM", '''pm = pd.read_sql(
    "SELECT machine, done_ts FROM work_order WHERE wo_type = 'PM' AND description LIKE ? AND done_ts >= ? AND done_ts < ?",
    conn, params=["Monthly PM%", WEEK_START, WEEK_END], parse_dates=["done_ts"],
)
bd = faults[faults["breakdown"]]
for machine, done in pm.set_index("machine")["done_ts"].items():
    when = bd.loc[bd["machine"] == machine, "start_ts"]
    before, after = (when < done).sum(), (when >= done).sum()
    days_before = (done - pd.Timestamp(WEEK_START)).total_seconds() / 86400
    days_after = (pd.Timestamp(WEEK_END) - done).total_seconds() / 86400
    print(f"{machine:<15} before {before} in {days_before:.2f} d ({before / days_before:.2f}/day)  "
          f"after {after} in {days_after:.2f} d ({after / days_after:.2f}/day)")''')

py("Maintenance cost per barrel", '''LABOUR_RATE = 48.00
wo = pd.read_sql(
    "SELECT machine, act_hours, parts_cost FROM work_order WHERE done_ts >= ? AND done_ts < ?",
    conn, params=[WEEK_START, WEEK_END],
)
wo[["act_hours", "parts_cost"]] = wo[["act_hours", "parts_cost"]].astype(float)
barrels = pd.read_sql(
    "SELECT machine, SUM(made_this_hour) AS barrels FROM v_hourly_barrels WHERE ts > ? AND ts <= ? GROUP BY machine",
    conn, params=[WEEK_START, WEEK_END],
).set_index("machine")["barrels"]
cost = wo.groupby("machine").agg(hours=("act_hours", "sum"), parts=("parts_cost", "sum"))
cost["labour"] = cost["hours"] * LABOUR_RATE
cost["total"] = cost["labour"] + cost["parts"]
cost["barrels"] = barrels
cost["per_barrel"] = cost["total"] / cost["barrels"]
print(cost.round({"hours": 2, "labour": 2, "parts": 2, "total": 2, "per_barrel": 4}).to_string())
print(f"All: ${cost['total'].sum():,.2f} for {cost['barrels'].sum():,} barrels, "
      f"${cost['total'].sum() / cost['barrels'].sum():.4f} a barrel")''')

py("Weekly KPI workbook", '''from openpyxl import Workbook, load_workbook

pmc = pd.read_sql(
    "SELECT machine, done_ts, created_ts, due_ts FROM work_order WHERE wo_type = 'PM' AND due_ts < ?",
    conn, params=[NOW], parse_dates=["done_ts", "created_ts", "due_ts"],
)
pmc["on_time"] = pmc["done_ts"] <= pmc["due_ts"] + (pmc["due_ts"] - pmc["created_ts"]) / 10
compliance = pmc.groupby("machine")["on_time"].mean()

wb = Workbook()
ws = wb.active
ws.title = "Maintenance KPIs"
ws.append(["Machine", "Breakdowns", "MTBF (min)", "MTTR (min)", "PM compliance", "Labour hours", "Cost per barrel"])
for machine, r in m.iterrows():
    ws.append([machine, int(r["n"]), round(r["mtbf"], 1), round(r["mttr"], 2), round(compliance[machine], 3),
               round(cost.loc[machine, "hours"], 2), round(cost.loc[machine, "per_barrel"], 4)])
last = ws.max_row
ws.append(["All", f"=SUM(B2:B{last})", None, None, None, f"=SUM(F2:F{last})", None])
wb.save("maintenance_kpis.xlsx")

back = load_workbook("maintenance_kpis.xlsx")["Maintenance KPIs"]
rows = list(back.iter_rows(min_row=2, max_row=last, values_only=True))
print(f"{len(rows)} machines; totals row: {[c.value for c in back[last + 1]][:2]} ... {back.cell(last + 1, 6).value}")
print(f"Breakdowns {sum(r[1] for r in rows)} (pandas {int(m['n'].sum())}), "
      f"labour hours {sum(r[5] for r in rows):.2f} (pandas {cost['hours'].sum():.2f})")''')

py("From repeat failure to PM task", '''rate = pd.read_sql(
    "SELECT ideal_rate_hr, margin_per_barrel FROM dim_machine WHERE machine = ?", conn, params=["Hoop Driver 1"]
).iloc[0].astype(float)
misfeed = faults[(faults["machine"] == "Hoop Driver 1") & (faults["fault"] == "Hoop misfeed")]
baseline = misfeed["minutes"].sum() / 60 * rate["ideal_rate_hr"] * rate["margin_per_barrel"]
TARGET_CUT = 0.50
PM_HOURS_WEEK = 0.5
saving = baseline * TARGET_CUT
pm_cost = PM_HOURS_WEEK * LABOUR_RATE
print(f"Hoop Driver 1 misfeeds: {len(misfeed)} events, {misfeed['minutes'].sum():.2f} min, ${baseline:,.2f} a week")
print(f"Weekly feed-rail PM: {PM_HOURS_WEEK} h at ${LABOUR_RATE:.2f} = ${pm_cost:.2f} a week")
print(f"At P2's 50% target: ${saving:,.2f} a week saved, ${saving - pm_cost:,.2f} net")
print("Savings Tracker: countermeasure for P2 (same baseline), not a new project")''')
