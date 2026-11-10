# S&OP / Capacity: every step's code, in order, with its language. SQL steps build sop.sql and run one
# at a time on a fresh PlantDB through foundations/sql_exec.py (a step reading v_hourly_barrels gets the
# OEE track's view first); Python steps build sop.py and run in sequence beside savings_actuals.csv.
# build25.py writes site/data/tracks/25-sop.js.
CODE, LANG = {}, {}

def sql(title, code):
    CODE[title], LANG[title] = code, "sql"

def py(title, code):
    CODE[title], LANG[title] = code, "python"

WEEK = "DECLARE @start DATETIME = '2026-10-31 06:00', @end DATETIME = '2026-11-07 06:00';\n"

sql("Create demand_plan", """CREATE TABLE demand_plan (
    week_start DATE NOT NULL,
    size VARCHAR(6) NOT NULL,
    barrels INT NOT NULL,
    PRIMARY KEY (week_start, size)
);""")

sql("Demand by week", """SELECT ISNULL(CONVERT(VARCHAR(10), week_start, 23), 'Total') AS week_start,
    SUM(CASE WHEN size = '53-gal' THEN barrels ELSE 0 END) AS gal_53,
    SUM(CASE WHEN size = '30-gal' THEN barrels ELSE 0 END) AS gal_30,
    SUM(barrels) AS barrels
FROM demand_plan
GROUP BY ROLLUP (week_start);""")

sql("Demonstrated capacity", WEEK + """
WITH b AS (
    SELECT machine, SUM(made_this_hour) AS barrels FROM v_hourly_barrels
    WHERE ts > @start AND ts <= @end GROUP BY machine
),
r AS (
    SELECT machine, SUM(qty) AS rejects FROM reject_log
    WHERE ts >= @start AND ts < @end GROUP BY machine
),
d AS (
    SELECT machine, SUM(DATEDIFF(SECOND, start_ts, end_ts)) / 60.0 AS down_min FROM fault_log
    WHERE start_ts >= @start AND start_ts < @end GROUP BY machine
)
SELECT b.machine, b.barrels, r.rejects, b.barrels - r.rejects AS good,
    CAST(d.down_min AS DECIMAL(8,2)) AS down_min
FROM b
JOIN r ON r.machine = b.machine
JOIN d ON d.machine = b.machine
ORDER BY good;""")

py("Three kinds of capacity", '''import pandas as pd
import pyodbc

WEEK_START, WEEK_END = "2026-10-31 06:00", "2026-11-07 06:00"
PLANNED_MIN = 9450
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=plant-sql01;DATABASE=PlantDB;"
    "Trusted_Connection=yes;TrustServerCertificate=yes;"
)
cap = pd.read_sql(
    "SELECT m.machine, m.ideal_rate_hr, m.margin_per_barrel, "
    "(SELECT SUM(made_this_hour) FROM v_hourly_barrels v WHERE v.machine = m.machine AND v.ts > ? AND v.ts <= ?) AS barrels, "
    "(SELECT SUM(qty) FROM reject_log r WHERE r.machine = m.machine AND r.ts >= ? AND r.ts < ?) AS rejects, "
    "(SELECT SUM(DATEDIFF(SECOND, start_ts, end_ts)) / 60.0 FROM fault_log f WHERE f.machine = m.machine AND f.start_ts >= ? AND f.start_ts < ?) AS down_min "
    "FROM dim_machine AS m",
    conn, params=[WEEK_START, WEEK_END] * 3,
).set_index("machine").astype(float)
cap["theoretical"] = PLANNED_MIN / 60 * cap["ideal_rate_hr"]
cap["avail"] = (PLANNED_MIN - cap["down_min"]) / PLANNED_MIN
cap["perf"] = cap["barrels"] / ((PLANNED_MIN - cap["down_min"]) / 60 * cap["ideal_rate_hr"])
cap["qual"] = (cap["barrels"] - cap["rejects"]) / cap["barrels"]
cap["oee"] = cap["avail"] * cap["perf"] * cap["qual"]
cap["good"] = cap["barrels"] - cap["rejects"]
cap["effective"] = cap["theoretical"] * cap["oee"]
print(cap[["theoretical", "oee", "effective", "good"]].round({"theoretical": 1, "oee": 4, "effective": 1, "good": 0}).to_string())''')

py("Find the bottleneck", '''cap["running_rate"] = cap["barrels"] / (PLANNED_MIN - cap["down_min"])
cap["no_stop_gross"] = cap["running_rate"] * PLANNED_MIN
bottleneck = cap["good"].idxmin()
print(cap[["good", "no_stop_gross"]].sort_values("good").round(1).to_string())
print(f"Bottleneck: {bottleneck}, {cap.loc[bottleneck, 'good']:,.0f} good barrels a week "
      f"({cap.loc[bottleneck, 'no_stop_gross'] / 7:.1f} a day gross if it never stopped)")''')

py("Demand against capacity", '''demand = pd.read_sql("SELECT week_start, SUM(barrels) AS demand FROM demand_plan GROUP BY week_start ORDER BY week_start",
                     conn).set_index("week_start")["demand"].astype(float)
base = cap.loc[bottleneck, "good"]
plan = pd.DataFrame({"demand": demand, "capacity": base})
plan["short"] = (plan["demand"] - plan["capacity"]).clip(lower=0)
print(plan.round(0).astype(int).to_string())
print(f"Short {plan['short'].sum():,.0f} barrels over {len(plan)} weeks, {plan['short'].mean():,.1f} a week on average")''')

py("The OEE the demand needs", '''theo = cap.loc[bottleneck, "theoretical"]
plan["oee_needed"] = plan["demand"] / theo
print(f"{bottleneck}: {theo:,.1f} barrels a week at the ideal rate; OEE now {cap.loc[bottleneck, 'oee']:.1%}")
print(plan["oee_needed"].map("{:.1%}".format).to_string())''')

py("What the projects buy", '''act = pd.read_csv("savings_actuals.csv", parse_dates=["week_start"])
late = act[act["week_start"] >= "2026-11-21"].groupby("project_id")["actual_min"].mean()
faults = pd.read_sql(
    "SELECT machine, fault, DATEDIFF(SECOND, start_ts, end_ts) / 60.0 AS minutes FROM fault_log WHERE start_ts >= ? AND start_ts < ?",
    conn, params=[WEEK_START, WEEK_END],
).astype({"minutes": float})
low_air = faults[faults["fault"] == "Low air"]
hd1_share = low_air.loc[low_air["machine"] == bottleneck, "minutes"].sum() / low_air["minutes"].sum()
misfeed = faults[(faults["machine"] == bottleneck) & (faults["fault"] == "Hoop misfeed")]["minutes"].sum()
saved_min = {
    "P1 low air (its share)": (low_air["minutes"].sum() - late["P1"]) * hd1_share,
    "P2 misfeeds": misfeed - late["P2"],
    "P5 SMED (Conveyor 3)": 0.0,
}
per_min = cap.loc[bottleneck, "ideal_rate_hr"] / 60 * cap.loc[bottleneck, "qual"]
gains = pd.Series({k: v * per_min for k, v in saved_min.items()})
print(f"{bottleneck}'s share of low air: {hd1_share:.1%}")
for k, v in saved_min.items():
    print(f"{k:<24} {v:6.2f} min a week -> {gains[k]:5.1f} good barrels")
print(f"Projects add {gains.sum():.1f} good barrels a week")''')

py("Run through the breaks", '''BREAK_MIN = 10080 - PLANNED_MIN
RELIEF_OPERATORS, RELIEF_RATE = 3, 32.00
breaks = BREAK_MIN * cap.loc[bottleneck, "running_rate"] * cap.loc[bottleneck, "qual"]
relief = RELIEF_OPERATORS * BREAK_MIN / 60 * RELIEF_RATE
margin = breaks * cap.loc[bottleneck, "margin_per_barrel"]
print(f"{BREAK_MIN} unplanned minutes a week at {cap.loc[bottleneck, 'running_rate']:.4f} barrels a running minute: {breaks:.1f} good barrels")
print(f"Relief: {RELIEF_OPERATORS} operators x {BREAK_MIN / 60} h x ${RELIEF_RATE:.2f} = ${relief:,.2f}; margin ${margin:,.2f} a week")''')

py("A level plan", '''START_STOCK = 1500
plan["capacity"] = base + gains.sum() + breaks
plan["stock"] = START_STOCK + (plan["capacity"] - plan["demand"]).cumsum()
print(plan[["demand", "capacity", "stock"]].round(0).astype(int).to_string())
low = plan["stock"].min()
print(f"Lowest stock {low:,.0f} in the week of {plan['stock'].idxmin()}; "
      f"{'never short' if low >= 0 else f'short {-low:,.0f} barrels'}")''')

py("Stock to cover the peak", '''HOLD_USD = 1.50
extra = max(0.0, -plan["stock"].min())
need = START_STOCK + extra
covered = plan.assign(stock=plan["stock"] + extra)
print(f"Starting stock needed: {need:,.0f} barrels ({extra:,.0f} more than the {START_STOCK:,} on hand)")
print(f"Capacity is short of demand in {(plan['capacity'] < plan['demand']).sum()} of {len(plan)} weeks, so the extra cannot be built inside the plan")
print(f"Holding it through the plan: {covered['stock'].sum():,.0f} barrel-weeks at ${HOLD_USD:.2f} = ${covered['stock'].sum() * HOLD_USD:,.2f}")''')

py("Capacity off the bottleneck", '''c3 = "Conveyor 3"
smed_min = 5 * 15.0 - late["P5"]
c3_gain = smed_min * cap.loc[c3, "ideal_rate_hr"] / 60 * cap.loc[c3, "qual"]
print(f"P5 frees {smed_min:.1f} min a week on {c3}: {c3_gain:.1f} more good barrels it could make")
print(f"{c3} already makes {cap.loc[c3, 'good'] - base:,.0f} more good barrels a week than {bottleneck}")
print("Plant output gained: 0 barrels, until the bottleneck moves")''')

py("The gap that is left", '''left = plan["demand"].mean() - plan["capacity"].mean()
q, a = cap.loc[bottleneck, "qual"], cap.loc[bottleneck, "avail"]
need_perf = (plan["demand"].mean() - gains.sum() - breaks) / (theo * a * q)
print(f"Average demand {plan['demand'].mean():,.0f}; capacity with every lever {plan['capacity'].mean():,.1f}; gap {left:,.1f} a week")
print(f"Holding availability and quality, performance must rise from {cap.loc[bottleneck, 'perf']:.1%} to {need_perf:.1%}")''')

py("S&OP workbook", '''from openpyxl import Workbook, load_workbook

wb = Workbook()
ws = wb.active
ws.title = "S&OP"
ws.append(["Week", "Demand", "Capacity", "Stock at end"])
for week, r in plan.iterrows():
    ws.append([str(week), int(r["demand"]), r["capacity"], r["stock"]])
last = ws.max_row
ws.append(["Total", f"=SUM(B2:B{last})", f"=SUM(C2:C{last})", None])
wb.save("sop.xlsx")
back = load_workbook("sop.xlsx")["S&OP"]
rows = list(back.iter_rows(min_row=2, max_row=last, values_only=True))
print(f"{len(rows)} weeks; totals {back.cell(last + 1, 2).value} and {back.cell(last + 1, 3).value}")
print(f"Demand {sum(r[1] for r in rows):,} (pandas {plan['demand'].sum():,.0f}); capacity {sum(r[2] for r in rows):,.1f} (pandas {plan['capacity'].sum():,.1f})")''')
