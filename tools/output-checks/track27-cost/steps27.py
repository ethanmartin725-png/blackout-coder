# Barrel Cost Model: every step's code, in order, with its language. SQL steps build cost.sql and run
# one at a time on a fresh PlantDB through foundations/sql_exec.py (those reading v_hourly_barrels get
# the OEE track's view first); Python steps build cost.py and run in sequence. build27.py writes
# site/data/tracks/27-cost.js.
CODE, LANG = {}, {}

def sql(title, code):
    CODE[title], LANG[title] = code, "sql"

def py(title, code):
    CODE[title], LANG[title] = code, "python"

WEEK = "DECLARE @start DATETIME = '2026-10-31 06:00', @end DATETIME = '2026-11-07 06:00';\n"
PRICE_BOM = """WITH price AS (
    SELECT item_no, MIN(price) AS price
    FROM contract_price
    WHERE @on BETWEEN valid_from AND valid_to
    GROUP BY item_no
),
bom AS (
    SELECT * FROM (VALUES
        ('53-gal', 'STV-53', 33), ('53-gal', 'HP-53', 6),
        ('30-gal', 'STV-30', 22), ('30-gal', 'HP-30', 4)
    ) AS v(size, item_no, qty)
)"""

sql("Good barrels by station", WEEK + """
WITH b AS (
    SELECT machine, SUM(made_this_hour) AS barrels
    FROM v_hourly_barrels
    WHERE ts > @start AND ts <= @end
    GROUP BY machine
),
r AS (
    SELECT machine, SUM(qty) AS rejects
    FROM reject_log
    WHERE ts >= @start AND ts < @end
    GROUP BY machine
)
SELECT b.machine, b.barrels, r.rejects,
    b.barrels - r.rejects AS good,
    CAST(100.0 * (b.barrels - r.rejects) / b.barrels AS DECIMAL(5,1)) AS yield_pct
FROM b
JOIN r ON r.machine = b.machine
ORDER BY CASE b.machine WHEN 'Conveyor 3' THEN 1 WHEN 'Hoop Driver 1' THEN 2 ELSE 3 END;""")

sql("Material by barrel size", "DECLARE @on DATE = '2026-11-02';\n\n" + PRICE_BOM + """
SELECT bom.size,
    CAST(SUM(CASE WHEN bom.item_no LIKE 'STV%' THEN bom.qty * price.price END) AS DECIMAL(8,2)) AS staves,
    CAST(SUM(CASE WHEN bom.item_no LIKE 'HP%' THEN bom.qty * price.price END) AS DECIMAL(8,2)) AS hoops,
    CAST(SUM(bom.qty * price.price) AS DECIMAL(8,2)) AS material
FROM bom
JOIN price ON price.item_no = bom.item_no
GROUP BY bom.size
ORDER BY bom.size DESC;""")

sql("The blended barrel", "DECLARE @on DATE = '2026-11-02';\n\n" + PRICE_BOM + """,
mix AS (
    SELECT * FROM (VALUES ('53-gal', 4700), ('30-gal', 1710)) AS v(size, barrels)
),
per_size AS (
    SELECT bom.size,
        SUM(CASE WHEN bom.item_no LIKE 'STV%' THEN bom.qty * price.price END) AS staves,
        SUM(CASE WHEN bom.item_no LIKE 'HP%' THEN bom.qty * price.price END) AS hoops
    FROM bom
    JOIN price ON price.item_no = bom.item_no
    GROUP BY bom.size
)
SELECT SUM(mix.barrels) AS barrels,
    CAST(SUM(p.staves * mix.barrels) / SUM(mix.barrels) AS DECIMAL(8,2)) AS staves,
    CAST(SUM(p.hoops * mix.barrels) / SUM(mix.barrels) AS DECIMAL(8,2)) AS hoops,
    CAST(SUM((p.staves + p.hoops) * mix.barrels) / SUM(mix.barrels) AS DECIMAL(8,2)) AS material
FROM per_size AS p
JOIN mix ON mix.size = p.size;""")

py("Direct labour", '''import numpy as np
import pandas as pd
import pyodbc

WEEK_START, WEEK_END = "2026-10-31 06:00", "2026-11-07 06:00"
ROUTE = ["Conveyor 3", "Hoop Driver 1", "Char Station 2"]
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=plant-sql01;DATABASE=PlantDB;"
    "Trusted_Connection=yes;TrustServerCertificate=yes;"
)
barrels = pd.read_sql(
    "SELECT machine, SUM(made_this_hour) AS barrels FROM v_hourly_barrels WHERE ts > ? AND ts <= ? GROUP BY machine",
    conn, params=[WEEK_START, WEEK_END]).set_index("machine")["barrels"]
rejects = pd.read_sql(
    "SELECT machine, SUM(qty) AS rejects FROM reject_log WHERE ts >= ? AND ts < ? GROUP BY machine",
    conn, params=[WEEK_START, WEEK_END]).set_index("machine")["rejects"]
st = pd.DataFrame({"barrels": barrels, "rejects": rejects}).reindex(ROUTE)
st["good"] = st["barrels"] - st["rejects"]

CREW, RATE, SHIFTS, PAID_HOURS = 1, 32.00, 21, 7.5
st["labour"] = CREW * SHIFTS * PAID_HOURS * RATE
print(f"{CREW} operator x {SHIFTS} shifts x {PAID_HOURS} h x ${RATE:.2f} = ${CREW * SHIFTS * PAID_HOURS * RATE:,.2f} a station")
print((st["labour"] / st["good"]).round(4).rename("labour_per_good").to_string())''')

sql("Maintenance by work order type", WEEK + """
SELECT machine, wo_type,
    COUNT(*) AS orders,
    SUM(act_hours) AS hours,
    CAST(SUM(act_hours) * 48.00 AS DECIMAL(8,2)) AS labour,
    SUM(parts_cost) AS parts,
    CAST(SUM(act_hours) * 48.00 + SUM(parts_cost) AS DECIMAL(8,2)) AS total
FROM work_order
WHERE done_ts >= @start AND done_ts < @end
GROUP BY machine, wo_type
ORDER BY machine, wo_type;""")

py("Maintenance in the standard", '''MAINT_RATE = 48.00
wo = pd.read_sql(
    "SELECT machine, wo_type, act_hours, parts_cost FROM work_order WHERE done_ts >= ? AND done_ts < ?",
    conn, params=[WEEK_START, WEEK_END])
wo["cost"] = wo["act_hours"].astype(float) * MAINT_RATE + wo["parts_cost"].astype(float)
run_rate = wo[wo["wo_type"] != "Improvement"]
st["maint"] = run_rate.groupby("machine")["cost"].sum().reindex(ROUTE)
print(f"All work orders ${wo['cost'].sum():,.2f}; Improvement ${wo.loc[wo['wo_type'] == 'Improvement', 'cost'].sum():,.2f}; "
      f"run rate ${st['maint'].sum():,.2f}")
print((st["maint"] / st["good"]).round(4).rename("maint_per_good").to_string())''')

py("Compressor energy by machine", '''USD_PER_KWH = 0.15
SCFM = {"Conveyor 3": ("run_c3", 35.0), "Hoop Driver 1": ("run_hd1", 120.0), "Char Station 2": ("run_cs2", 45.0)}
log = pd.read_sql("SELECT * FROM energy_log ORDER BY hour_end", conn, parse_dates=["hour_end"])
log = log.astype({c: float for c in log.columns if c != "hour_end"})
slope, intercept = np.polyfit(log["air_scf"] / 60, log["kwh"], 1)
week = log[(log["hour_end"] > WEEK_START) & (log["hour_end"] <= WEEK_END)]

machine_scf = pd.Series({m: (week[col] * scfm).sum() for m, (col, scfm) in SCFM.items()})
st["air"] = machine_scf / 60 * slope * USD_PER_KWH
leak = (week["air_scf"].sum() - machine_scf.sum()) / 60 * slope * USD_PER_KWH
base = week["kwh"].sum() * USD_PER_KWH - st["air"].sum() - leak
print(f"Compressor ${week['kwh'].sum() * USD_PER_KWH:,.2f}: machines ${st['air'].sum():,.2f}, "
      f"leaks ${leak:,.2f}, base load ${base:,.2f}")
print((st["air"] / st["good"]).round(4).rename("air_per_good").to_string())
print(f"kWh per station-barrel {week['kwh'].sum() / st['barrels'].sum():.3f}, "
      f"per finished good barrel {week['kwh'].sum() / st.loc['Char Station 2', 'good']:.3f}")''')

py("Propane at standard", '''LPG_STANDARD = 2.35
gal = week["propane_gal"].sum()
st["propane"] = 0.0
st.loc["Char Station 2", "propane"] = gal * LPG_STANDARD
cs2 = st.loc["Char Station 2"]
print(f"{gal:,.2f} gal x ${LPG_STANDARD:.2f} = ${cs2['propane']:,.2f}")
print(f"Per barrel charred ${cs2['propane'] / cs2['barrels']:.4f}; per good barrel ${cs2['propane'] / cs2['good']:.4f}")''')

py("Shared overhead", '''OVERHEAD = 6000.00  # supervision, quality tech and yard driver a week (illustrative)
PLANNED_MIN = pd.Series(9450, index=ROUTE)
shared = OVERHEAD + base + leak
st["overhead"] = shared * PLANNED_MIN / PLANNED_MIN.sum()
print(f"Shared ${shared:,.2f} = overhead ${OVERHEAD:,.2f} + base load ${base:,.2f} + leaks ${leak:,.2f}")
print(f"By planned minutes: ${st['overhead'].iloc[0]:,.2f} a station")''')

py("Station cost roll-up", '''COSTS = ["labour", "maint", "air", "propane", "overhead"]
st["conversion"] = st[COSTS].sum(axis=1)
st["per_good"] = st["conversion"] / st["good"]
print(st[COSTS + ["conversion", "good", "per_good"]].round(2).to_string())
print(f"Conversion ${st['conversion'].sum():,.2f} a week")''')

py("Cost of a finished barrel", '''MATERIAL = {"53-gal": 102.57, "30-gal": 50.40}
MIX = {"53-gal": 4700, "30-gal": 1710}
conversion = st["per_good"].sum()
for size, m in MATERIAL.items():
    print(f"{size}: material ${m:.2f} + conversion ${conversion:.2f} = ${m + conversion:.2f}")
blended = sum(MATERIAL[s] * n for s, n in MIX.items()) / sum(MIX.values())
print(f"Blended: ${blended:.2f} + ${conversion:.2f} = ${blended + conversion:.2f}")''')

py("Fixed and variable", '''st["variable"] = st["air"] + st["propane"]
st["fixed"] = st["labour"] + st["maint"] + st["overhead"]
print(st[["variable", "fixed"]].round(2).to_string())
share = st["fixed"].sum() / st["conversion"].sum()
print(f"Fixed is {share:.1%} of conversion; material is variable, ${blended:.2f} a barrel")''')

py("The OEE lever", '''dim = pd.read_sql("SELECT machine, ideal_rate_hr FROM dim_machine", conn).set_index("machine")
st["theoretical"] = dim["ideal_rate_hr"].reindex(ROUTE) * PLANNED_MIN / 60
st["oee"] = st["good"] / st["theoretical"]
st["fixed_per_good"] = st["fixed"] / st["good"]
st["one_point_more"] = st["fixed"] / (st["theoretical"] * (st["oee"] + 0.01))
st["change"] = st["one_point_more"] - st["fixed_per_good"]
print(st[["theoretical", "oee", "fixed_per_good", "one_point_more", "change"]].round(4).to_string())''')

py("Absorption or cash", '''MARGIN = 42.50
SOLD_OUT = {"Conveyor 3": True, "Hoop Driver 1": True, "Char Station 2": False}
point = st["theoretical"] * 0.01
view = pd.DataFrame({
    "barrels_per_point": point,
    "absorbed": -st["change"] * (st["good"] + point),
    "cash_if_sold": [point[m] * MARGIN if SOLD_OUT[m] else 0.0 for m in ROUTE],
})
print(view.round(2).to_string())''')

py("Cost of poor quality", '''staves = {"53-gal": 33 * 2.85, "30-gal": 22 * 2.10}
stave_cost = sum(staves[s] * n for s, n in MIX.items()) / sum(MIX.values())
# What a reject has used by the time it leaves: staves from Conveyor 3, hoops from Hoop Driver 1,
# then the variable costs of each station it went through.
spent = pd.Series({"Conveyor 3": stave_cost, "Hoop Driver 1": blended, "Char Station 2": blended})
spent += (st["variable"] / st["barrels"]).cumsum()
q = pd.DataFrame({"rejects": st["rejects"], "spent_each": spent})
q["scrap_cash"] = q["rejects"] * q["spent_each"]
q["lost_margin"] = [q.loc[m, "rejects"] * MARGIN if SOLD_OUT[m] else 0.0 for m in ROUTE]
q["full_loss"] = q["scrap_cash"] + q["lost_margin"]
print(q.round(2).to_string())
print(f"Scrap ${q['scrap_cash'].sum():,.2f} if nothing is recovered; full loss ${q['full_loss'].sum():,.2f}; "
      f"at margin alone ${st['rejects'].sum() * MARGIN:,.2f} (the OEE track's)")''')

py("Price and usage variances", '''lpg_actual = np.where(week["hour_end"] <= "2026-11-01 00:00", 2.20, 2.35)
standard_gal = 0.46 * cs2["barrels"]
price_var = ((lpg_actual - LPG_STANDARD) * week["propane_gal"]).sum()
usage_var = (gal - standard_gal) * LPG_STANDARD
fav = lambda v: f"${abs(v):,.2f} {'favourable' if v < 0 else 'unfavourable'}"
print(f"Propane price variance {fav(price_var)} (gallons burned before 11-01 at $2.20)")
print(f"Propane usage variance {fav(usage_var)} ({gal:,.2f} gal against {standard_gal:,.2f} standard)")
hoops = pd.read_sql(
    "SELECT p.supplier_id, i.qty, i.unit_price FROM invoice_line AS i "
    "JOIN po_line AS p ON p.po_no = i.po_no AND p.line = i.line "
    "WHERE p.item_no = 'HP-53' AND i.invoice_date >= ? AND i.invoice_date < ?",
    conn, params=["2026-10-31", "2026-11-07"])
hoops[["qty", "unit_price"]] = hoops[["qty", "unit_price"]].astype(float)
hoops["ppv"] = (hoops["unit_price"] - 1.42) * hoops["qty"]
print(hoops.round(2).to_string(index=False))
over = ((hoops["unit_price"] - 1.48) * hoops["qty"])[hoops["supplier_id"] == "S4"].sum()
print(f"HP-53 price variance {fav(hoops['ppv'].sum())} against the $1.42 standard: "
      f"${over:,.2f} over Ironbend's own $1.48 contract, ${hoops['ppv'].sum() - over:,.2f} for buying from a second source")''')

py("Cost sheet workbook", '''from openpyxl import Workbook, load_workbook

wb = Workbook()
ws = wb.active
ws.title = "Cost sheet"
ws.append(["Station"] + COSTS + ["Conversion", "Good", "Per good"])
for i, m in enumerate(ROUTE, start=2):
    ws.append([m] + [round(st.loc[m, c], 2) for c in COSTS] + [f"=SUM(B{i}:F{i})", int(st.loc[m, "good"]), f"=G{i}/H{i}"])
ws.append(["Total", None, None, None, None, None, "=SUM(G2:G4)", None, "=SUM(I2:I4)"])
wb.save("barrel_cost.xlsx")
back = load_workbook("barrel_cost.xlsx")["Cost sheet"]
rows = list(back.iter_rows(min_row=2, max_row=4, values_only=True))
print(f"Row 2: {back['G2'].value}  {back['I2'].value}; total {back['G5'].value}")
print(f"Cells add to ${sum(sum(r[1:6]) for r in rows):,.2f} (pandas ${st['conversion'].sum():,.2f})")''')

py("The cost bridge", '''bridge = [("Staves", staves["53-gal"]), ("Hoops", MATERIAL["53-gal"] - staves["53-gal"])]
LABEL = {"labour": "Labour", "maint": "Maintenance", "air": "Air", "propane": "Propane", "overhead": "Overhead"}
bridge += [(LABEL[c], (st[c] / st["good"]).sum()) for c in COSTS]
running = 0.0
for name, v in bridge:
    running += v
    print(f"{name:<12} {v:8.4f}  {running:9.4f}")
print(f"Standard cost of a 53-gal barrel ${running:.2f}")''')
