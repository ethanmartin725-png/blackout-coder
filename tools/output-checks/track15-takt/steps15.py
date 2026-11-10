# Takt and Line Balance: every step's code, in order. All steps build one file, line_balance.py.
# build15.py runs them in sequence against the canonical database and writes site/data/tracks/15-takt.js.
CODE = {}

CODE["Takt time"] = '''DEMAND_PER_DAY = 1000
SHIFTS_PER_DAY = 3
PAID_MIN_PER_SHIFT = 450

available_s = SHIFTS_PER_DAY * PAID_MIN_PER_SHIFT * 60
takt = available_s / DEMAND_PER_DAY
print(f"Available: {available_s:,} s a day; demand {DEMAND_PER_DAY:,} barrels")
print(f"Takt: {takt:.1f} s a barrel")'''

CODE["Ideal cycle times"] = '''import pandas as pd
import pyodbc

LINE = ["Conveyor 3", "Hoop Driver 1", "Char Station 2"]

conn = pyodbc.connect(
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=plant-sql01;DATABASE=PlantDB;"
    "Trusted_Connection=yes;TrustServerCertificate=yes;"
)
machines = pd.read_sql(
    "SELECT machine, ideal_rate_hr, margin_per_barrel FROM dim_machine", conn
).set_index("machine").loc[LINE]
machines["ideal_s"] = 3600 / machines["ideal_rate_hr"]
print(machines[["ideal_rate_hr", "ideal_s"]].round(2).to_string())'''

CODE["Actual cycle times"] = '''WEEK_START = "2026-10-31 06:00"
WEEK_END = "2026-11-07 06:00"
PLANNED_MIN = 7 * SHIFTS_PER_DAY * PAID_MIN_PER_SHIFT

down = pd.read_sql(
    "SELECT machine, SUM(DATEDIFF(SECOND, start_ts, end_ts)) / 60.0 AS down_min "
    "FROM fault_log WHERE start_ts >= ? AND start_ts < ? GROUP BY machine",
    conn, params=[WEEK_START, WEEK_END],
).set_index("machine")["down_min"]
made = pd.read_sql(
    "SELECT machine, SUM(made_this_hour) AS barrels FROM v_hourly_barrels "
    "WHERE ts > ? AND ts <= ? GROUP BY machine",
    conn, params=[WEEK_START, WEEK_END],
).set_index("machine")["barrels"]
machines["run_min"] = PLANNED_MIN - down.astype(float)
machines["barrels"] = made
machines["actual_s"] = machines["run_min"] * 60 / machines["barrels"]
print(machines[["run_min", "barrels", "ideal_s", "actual_s"]].round(2).to_string())'''

CODE["Against takt"] = '''machines["vs_takt_s"] = machines["actual_s"] - takt
machines["over_takt"] = machines["actual_s"] > takt
print(machines[["ideal_s", "actual_s", "vs_takt_s", "over_takt"]].round(2).to_string())'''

CODE["The bottleneck"] = '''bottleneck = machines["actual_s"].idxmax()
line_s = machines["actual_s"].max()
per_day = available_s / line_s
print(f"Bottleneck: {bottleneck} at {line_s:.2f} s")
print(f"Line output at the bottleneck: {per_day:.1f} barrels a day against {DEMAND_PER_DAY:,} demand")
print(f"Short by {DEMAND_PER_DAY - per_day:.1f} a day, {(DEMAND_PER_DAY - per_day) * 7:.0f} a week")'''

CODE["Balance efficiency"] = '''def balance(cycle):
    return cycle.sum() / (len(cycle) * cycle.max())

print(f"Ideal:  {balance(machines['ideal_s']):.1%} (slowest {machines['ideal_s'].idxmax()})")
print(f"Actual: {balance(machines['actual_s']):.1%} (slowest {machines['actual_s'].idxmax()})")'''

CODE["Work elements"] = '''elements = pd.DataFrame([
    ("Conveyor 3", "Receive the raised barrel", 12.0, "required", True),
    ("Conveyor 3", "Square and center", 14.0, "required", True),
    ("Conveyor 3", "Inspect joints at the eye", 10.0, "required", True),
    ("Conveyor 3", "Index to Hoop Driver 1", 24.0, "required", True),
    ("Hoop Driver 1", "Walk to the hoop rack", 4.0, "waste", False),
    ("Hoop Driver 1", "Stage the next hoop", 8.0, "required", False),
    ("Hoop Driver 1", "Clamp the barrel", 6.0, "required", True),
    ("Hoop Driver 1", "Drive the hoops", 30.0, "value-added", True),
    ("Hoop Driver 1", "Inspect the hoop seat", 8.0, "required", True),
    ("Hoop Driver 1", "Unclamp and index", 3600 / 55 - 56.0, "required", True),
    ("Char Station 2", "Load the char booth", 10.0, "required", True),
    ("Char Station 2", "Fire and char", 45.0, "value-added", True),
    ("Char Station 2", "Check char depth", 7.0, "required", True),
    ("Char Station 2", "Unload to cooling", 10.0, "required", True),
], columns=["station", "element", "seconds", "kind", "fixed"])
elements["order"] = range(len(elements))

work = elements.groupby("station", sort=False)["seconds"].sum()
print(pd.DataFrame({"elements": work, "ideal_s": machines["ideal_s"]}).round(2).to_string())
print("Elements match the ideal cycle:", ((work - machines["ideal_s"]).abs() < 0.01).all())'''

CODE["Yamazumi in Excel"] = '''from openpyxl import Workbook
from openpyxl.chart import BarChart, LineChart, Reference

machines["speed_loss_s"] = machines["actual_s"] - machines["ideal_s"]
kinds = ["value-added", "required", "waste"]
stack = elements.pivot_table(index="station", columns="kind", values="seconds", aggfunc="sum", fill_value=0)
stack = stack.reindex(index=LINE, columns=kinds, fill_value=0)
stack["speed loss"] = machines["speed_loss_s"]

wb = Workbook()
ws = wb.active
ws.title = "Yamazumi"
ws.append(["Station", *stack.columns, "Takt"])
for station, row in stack.iterrows():
    ws.append([station, *[round(v, 2) for v in row], round(takt, 2)])

bars = BarChart()
bars.type, bars.grouping, bars.overlap = "col", "stacked", 100
bars.title, bars.y_axis.title = "Hoop line: seconds per barrel", "seconds"
bars.add_data(Reference(ws, min_col=2, max_col=5, min_row=1, max_row=4), titles_from_data=True)
bars.set_categories(Reference(ws, min_col=1, min_row=2, max_row=4))
takt_line = LineChart()
takt_line.add_data(Reference(ws, min_col=6, min_row=1, max_row=4), titles_from_data=True)
bars += takt_line
ws.add_chart(bars, "H2")
wb.save("line_balance.xlsx")
print(stack.round(2).to_string())'''

CODE["Value-added share"] = '''va = stack["value-added"] / machines["actual_s"]
print((va * 100).round(1).astype(str).add("%").to_string())
print(f"Line: {stack['value-added'].sum() / machines['actual_s'].sum():.1%} of each barrel's time adds value")'''

CODE["Move work upstream"] = '''def rebalance(moves, drop=()):
    """Seconds per station after moving elements to another station and dropping waste.
    Speed loss stays with its station's equipment."""
    e = elements[~elements["element"].isin(drop)].copy()
    for name, to in moves.items():
        e.loc[e["element"] == name, "station"] = to
    ideal = e.groupby("station")["seconds"].sum().reindex(LINE, fill_value=0)
    return ideal + machines["speed_loss_s"]

after = rebalance({"Stage the next hoop": "Conveyor 3"}, drop=["Walk to the hoop rack"])
print(pd.DataFrame({"before_s": machines["actual_s"], "after_s": after, "takt": takt}).round(2).to_string())
print(f"Slowest: {machines['actual_s'].max():.2f} s -> {after.max():.2f} s at {after.idxmax()}")'''

CODE["Precedence check"] = '''def can_move(name, to):
    el = elements.set_index("element").loc[name]
    if el["fixed"]:
        return f"refused: {name} needs {el['station']}'s equipment"
    if LINE.index(to) > LINE.index(el["station"]):
        return f"refused: {to} is downstream; {name} must happen before the barrel reaches it"
    earlier = elements[(elements["station"] == el["station"]) & (elements["order"] < el["order"])]
    stuck = earlier[~earlier["fixed"] & (earlier["kind"] != "waste")]
    if len(stuck):
        return f"refused: {', '.join(stuck['element'])} must come first and stays behind"
    return "allowed"

for name, to in [("Clamp the barrel", "Conveyor 3"), ("Stage the next hoop", "Char Station 2"), ("Stage the next hoop", "Conveyor 3")]:
    print(f"{name} -> {to}: {can_move(name, to)}")'''

CODE["How many stations"] = '''import math

ideal_work = machines["ideal_s"].sum()
actual_work = machines["actual_s"].sum()
print(f"Ideal work {ideal_work:.1f} s / takt {takt:.1f} s = {ideal_work / takt:.2f} -> {math.ceil(ideal_work / takt)} stations")
print(f"Actual work {actual_work:.1f} s / takt {takt:.1f} s = {actual_work / takt:.2f} -> {math.ceil(actual_work / takt)} stations")'''

CODE["What it is worth"] = '''margin = machines["margin_per_barrel"].iloc[0]
before_day = available_s / machines["actual_s"].max()
after_day = available_s / after.max()
at_takt = DEMAND_PER_DAY
print(f"Line output: {before_day:.1f} -> {after_day:.1f} barrels a day after the move")
print(f"Worth {(after_day - before_day) * 7 * margin:,.2f} a week at ${margin:.2f} a barrel")
print(f"Reaching takt ({at_takt:,} a day) would be worth {(at_takt - before_day) * 7 * margin:,.2f} a week")'''

CODE["Check the workbook"] = '''import zipfile
import xml.etree.ElementTree as ET

C = "{http://schemas.openxmlformats.org/drawingml/2006/chart}"
with zipfile.ZipFile("line_balance.xlsx") as z:
    chart = ET.fromstring(z.read("xl/charts/chart1.xml"))
bar, line = chart.find(f".//{C}barChart"), chart.find(f".//{C}lineChart")
sheet = wb["Yamazumi"]
name = lambda ser: sheet[ser.find(f"{C}tx//{C}f").text.split("!")[1].replace("$", "")].value
print("Stacked bars:", [name(s) for s in bar.findall(f"{C}ser")])
print("Line:", [name(s) for s in line.findall(f"{C}ser")])
print("Stacked:", bar.find(f"{C}grouping").get("val"))'''
