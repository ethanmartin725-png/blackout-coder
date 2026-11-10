# Energy / Utilities: every step's code, in order, with its language. SQL steps build energy.sql and
# run one at a time on a fresh PlantDB through foundations/sql_exec.py (those reading v_hourly_barrels
# get the OEE track's view first); Python steps build energy.py and run in sequence. build24.py writes
# site/data/tracks/24-energy.js.
CODE, LANG = {}, {}

def sql(title, code):
    CODE[title], LANG[title] = code, "sql"

def py(title, code):
    CODE[title], LANG[title] = code, "python"

WEEK = "DECLARE @start DATETIME = '2026-10-31 06:00', @end DATETIME = '2026-11-07 06:00';\n"

sql("Create energy_log", """CREATE TABLE energy_log (
    hour_end DATETIME NOT NULL PRIMARY KEY,
    kwh DECIMAL(7,2) NOT NULL,
    air_scf INT NOT NULL,
    avg_psi DECIMAL(5,1) NOT NULL,
    min_psi DECIMAL(5,1) NOT NULL,
    propane_gal DECIMAL(7,2) NOT NULL,
    run_c3 DECIMAL(4,1) NOT NULL,
    run_hd1 DECIMAL(4,1) NOT NULL,
    run_cs2 DECIMAL(4,1) NOT NULL
);""")

sql("A day of utilities", WEEK + """
SELECT CAST(DATEADD(HOUR, -7, hour_end) AS DATE) AS prod_day,
    SUM(kwh) AS kwh,
    SUM(air_scf) / 1000 AS air_kscf,
    SUM(propane_gal) AS propane_gal,
    MIN(min_psi) AS lowest_psi
FROM energy_log
WHERE hour_end > @start AND hour_end <= @end
GROUP BY CAST(DATEADD(HOUR, -7, hour_end) AS DATE)
ORDER BY prod_day;""")

sql("Energy per barrel", WEEK + """
WITH b AS (
    SELECT ts, SUM(made_this_hour) AS barrels
    FROM v_hourly_barrels
    WHERE ts > @start AND ts <= @end
    GROUP BY ts
)
SELECT COUNT(*) AS hours,
    SUM(e.kwh) AS kwh,
    SUM(b.barrels) AS barrels,
    CAST(SUM(e.kwh) / SUM(b.barrels) AS DECIMAL(6,3)) AS kwh_per_barrel,
    CAST(SUM(e.air_scf) * 1.0 / SUM(b.barrels) AS DECIMAL(7,1)) AS scf_per_barrel
FROM energy_log AS e
JOIN b ON b.ts = e.hour_end;""")

sql("Pressure dips and low-air stops", """SELECT e.hour_end, e.min_psi,
    f.machine, f.start_ts,
    CAST(DATEDIFF(SECOND, f.start_ts, f.end_ts) / 60.0 AS DECIMAL(6,2)) AS minutes
FROM energy_log AS e
LEFT JOIN fault_log AS f
    ON f.fault = 'Low air'
    AND f.start_ts >= DATEADD(HOUR, -1, e.hour_end) AND f.start_ts < e.hour_end
WHERE e.min_psi < 85 OR f.fault_id IS NOT NULL
ORDER BY e.hour_end;""")

py("Compressor specific power", '''import numpy as np
import pandas as pd
import pyodbc

WEEK_START, WEEK_END = "2026-10-31 06:00", "2026-11-07 06:00"
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=plant-sql01;DATABASE=PlantDB;"
    "Trusted_Connection=yes;TrustServerCertificate=yes;"
)
log = pd.read_sql("SELECT * FROM energy_log ORDER BY hour_end", conn, parse_dates=["hour_end"])
log = log.astype({c: float for c in log.columns if c != "hour_end"})
log["scfm"] = log["air_scf"] / 60
slope, intercept = np.polyfit(log["scfm"], log["kwh"], 1)
print(f"{len(log)} hours: kW = {intercept:.2f} + {slope:.4f} x scfm")
print(f"Specific power {slope * 100:.1f} kW per 100 scfm; {intercept:.1f} kW at no flow")''')

py("An air balance", '''DEMAND = {"run_c3": 35.0, "run_hd1": 120.0, "run_cs2": 45.0}
log["demand"] = sum(scfm * log[col] / 60 for col, scfm in DEMAND.items())
log["unaccounted"] = log["scfm"] - log["demand"]
week = log[(log["hour_end"] > WEEK_START) & (log["hour_end"] <= WEEK_END)]
print(f"OEE week: supplied {week['scfm'].mean():.1f} scfm, machines {week['demand'].mean():.1f}, "
      f"unaccounted {week['unaccounted'].mean():.1f} ({week['unaccounted'].mean() / week['scfm'].mean():.1%})")''')

py("What the leaks cost", '''USD_PER_KWH = 0.15
WEEKS_PER_YEAR = 50
leak = week["unaccounted"].mean()
leak_kw = leak * slope
per_week = leak_kw * 168 * USD_PER_KWH
print(f"{leak:.1f} scfm x {slope:.4f} kW/scfm = {leak_kw:.2f} kW, all week")
print(f"${per_week:,.2f} a week, ${per_week * WEEKS_PER_YEAR:,.2f} a year at ${USD_PER_KWH:.2f}/kWh")''')

sql("Pressure above need", WEEK + """DECLARE @need_psi DECIMAL(5,1) = 95.0;

SELECT CAST(AVG(avg_psi) AS DECIMAL(5,1)) AS avg_psi,
    @need_psi AS need_psi,
    CAST(AVG(avg_psi) - @need_psi AS DECIMAL(5,1)) AS excess_psi,
    CAST((AVG(avg_psi) - @need_psi) / 2 AS DECIMAL(5,1)) AS pct_more_energy,
    CAST(SUM(kwh) * (AVG(avg_psi) - @need_psi) / 2 / 100 AS DECIMAL(8,1)) AS kwh_a_week
FROM energy_log
WHERE hour_end > @start AND hour_end <= @end;""")

sql("Propane per barrel", WEEK + """
WITH b AS (
    SELECT ts, made_this_hour AS barrels
    FROM v_hourly_barrels
    WHERE machine = 'Char Station 2' AND ts > @start AND ts <= @end
),
flare AS (
    SELECT DISTINCT DATEADD(HOUR, DATEDIFF(HOUR, 0, start_ts) + 1, 0) AS hour_end
    FROM fault_log
    WHERE fault = 'Char flare' AND start_ts >= @start AND start_ts < @end
)
SELECT CASE WHEN f.hour_end IS NULL THEN 'normal' ELSE 'flare' END AS hours,
    COUNT(*) AS n,
    SUM(e.propane_gal) AS propane_gal,
    SUM(b.barrels) AS barrels,
    CAST(SUM(e.propane_gal) / SUM(b.barrels) AS DECIMAL(6,4)) AS gal_per_barrel
FROM energy_log AS e
JOIN b ON b.ts = e.hour_end
LEFT JOIN flare AS f ON f.hour_end = e.hour_end
GROUP BY ROLLUP (CASE WHEN f.hour_end IS NULL THEN 'normal' ELSE 'flare' END);""")

py("Propane cost per barrel", '''char = pd.read_sql(
    "SELECT SUM(made_this_hour) AS barrels FROM v_hourly_barrels WHERE machine = ? AND ts > ? AND ts <= ?",
    conn, params=["Char Station 2", WEEK_START, WEEK_END],
)["barrels"].iloc[0]
gal = week["propane_gal"].sum()
STANDARD = 0.46
prices = pd.read_sql("SELECT valid_from, price FROM contract_price WHERE item_no = ? ORDER BY valid_from",
                     conn, params=["LPG"])
print(f"Metered {gal:,.2f} gal for {char:,} barrels: {gal / char:.4f} gal a barrel against the {STANDARD} standard")
for _, r in prices.iterrows():
    print(f"From {r['valid_from']}: ${float(r['price']):.2f}/gal = ${gal / char * float(r['price']):.4f} a barrel")''')

py("After the leak repairs", '''REPAIRED = "2026-11-09 06:00"
after = log[log["hour_end"] > REPAIRED]
cut = week["unaccounted"].mean() - after["unaccounted"].mean()
saved = cut * slope * 168 * USD_PER_KWH
print(f"Unaccounted air: {week['unaccounted'].mean():.1f} scfm in the OEE week, "
      f"{after['unaccounted'].mean():.1f} after {REPAIRED[:10]} ({len(after)} hours)")
print(f"{cut:.1f} scfm less: {cut * slope:.2f} kW, ${saved:,.2f} a week")''')

py("Energy per running hour", '''log["run_hours"] = log[list(DEMAND)].sum(axis=1) / 60
for name, part in [("OEE week", week.index), ("After repairs", after.index)]:
    p = log.loc[part]
    print(f"{name:<14} {p['kwh'].sum() / p['run_hours'].sum():.2f} kWh per machine running hour, "
          f"{p['run_hours'].sum() / len(p):.2f} machines running on average")''')

py("Payback", '''SURVEY_HOURS, LABOUR_RATE, FITTINGS = 8, 48.00, 450.00
cost = SURVEY_HOURS * LABOUR_RATE + FITTINGS
low_air = pd.read_sql(
    "SELECT SUM(DATEDIFF(SECOND, f.start_ts, f.end_ts) / 3600.0 * m.ideal_rate_hr * m.margin_per_barrel) "
    "FROM fault_log AS f JOIN dim_machine AS m ON m.machine = f.machine "
    "WHERE f.fault = ? AND f.start_ts >= ? AND f.start_ts < ?",
    conn, params=["Low air", WEEK_START, WEEK_END],
).iloc[0, 0]
print(f"Survey and fittings: {SURVEY_HOURS} h x ${LABOUR_RATE:.2f} + ${FITTINGS:,.2f} = ${cost:,.2f}")
print(f"Energy alone: ${saved:,.2f} a week, payback {cost / saved:.1f} weeks")
print(f"Low-air downtime at baseline: ${float(low_air):,.2f} a week (P1); energy is the smaller part")''')

py("Energy KPI workbook", '''from openpyxl import Workbook, load_workbook

barrels = pd.read_sql("SELECT SUM(made_this_hour) AS b FROM v_hourly_barrels WHERE ts > ? AND ts <= ?",
                      conn, params=[WEEK_START, WEEK_END])["b"].iloc[0]
kpis = [
    ("kWh per barrel (OEE week)", round(week["kwh"].sum() / barrels, 3)),
    ("Specific power, kW per 100 scfm", round(slope * 100, 1)),
    ("Leak load before, scfm", round(week["unaccounted"].mean(), 1)),
    ("Leak load after, scfm", round(after["unaccounted"].mean(), 1)),
    ("Energy saved, $ a week", round(saved, 2)),
    ("Propane, gal per barrel", round(gal / char, 4)),
]
wb = Workbook()
ws = wb.active
ws.title = "Energy KPIs"
ws.append(["KPI", "Value"])
for row in kpis:
    ws.append(list(row))
wb.save("energy_kpis.xlsx")
back = load_workbook("energy_kpis.xlsx")["Energy KPIs"]
for name, value in back.iter_rows(min_row=2, values_only=True):
    print(f"{name:<34} {value}")
print(f"Matches what was written: {[r for r in back.iter_rows(min_row=2, values_only=True)] == kpis}")''')
