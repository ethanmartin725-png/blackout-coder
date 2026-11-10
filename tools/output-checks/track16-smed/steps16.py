# Changeover / SMED: every step's code, in order. All steps build one file, smed.py.
# build16.py runs them in sequence against the canonical database (with changeover_log.csv beside
# them) and writes site/data/tracks/16-smed.js.
CODE = {}

CODE["The time study"] = '''import pandas as pd

study = pd.DataFrame([
    ("Fetch 30-gal guides from the crib", 3.0, "internal"),
    ("Fetch tools", 1.5, "internal"),
    ("Stop and lock out the conveyor", 1.0, "internal"),
    ("Remove 53-gal side guides", 2.5, "internal"),
    ("Fit 30-gal side guides", 3.0, "internal"),
    ("Adjust the eye height", 2.0, "internal"),
    ("Check the first barrel", 2.0, "internal"),
], columns=["element", "minutes", "done"])

def stopped(s):
    return s.loc[s["done"] == "internal", "minutes"].sum()

print(study.to_string(index=False))
print(f"Changeover today: {study['minutes'].sum():.1f} min, all of it with the conveyor stopped ({stopped(study):.1f} min)")'''

CODE["Internal or external"] = '''EXTERNAL = ["Fetch 30-gal guides from the crib", "Fetch tools"]

stage1 = study.copy()
stage1.loc[stage1["element"].isin(EXTERNAL), "done"] = "external"
print(stage1.groupby("done")["minutes"].sum().to_string())
print(f"Stopped: {stopped(study):.1f} -> {stopped(stage1):.1f} min")'''

CODE["Convert internal to external"] = '''stage2 = stage1.copy()
eye = stage2["element"] == "Adjust the eye height"
stage2.loc[eye, ["element", "minutes"]] = ["Set the preset eye bracket", 0.5]
preset = pd.DataFrame([("Preset the eye on the spare bracket", 1.5, "external")], columns=stage2.columns)
stage2 = pd.concat([preset, stage2], ignore_index=True)
print(f"Stopped: {stopped(stage1):.1f} -> {stopped(stage2):.1f} min")
print(f"Total work: {stage1['minutes'].sum():.1f} -> {stage2['minutes'].sum():.1f} min")'''

CODE["Streamline what is left"] = '''QUICK_RELEASE = {"Remove 53-gal side guides": 1.0, "Fit 30-gal side guides": 1.5}

stage3 = stage2.copy()
for element, minutes in QUICK_RELEASE.items():
    stage3.loc[stage3["element"] == element, "minutes"] = minutes
print(stage3[stage3["done"] == "internal"].to_string(index=False))
print(f"Stopped: {stopped(stage2):.1f} -> {stopped(stage3):.1f} min")'''

CODE["The SMED waterfall"] = '''waterfall = pd.Series({
    "Today": stopped(study),
    "Separate external": stopped(stage1),
    "Convert to external": stopped(stage2),
    "Streamline internal": stopped(stage3),
})
step = waterfall.diff().fillna(waterfall)
print(pd.DataFrame({"stopped_min": waterfall, "change": step}).to_string())
print(f"Stopped time cut {1 - waterfall.iloc[-1] / waterfall.iloc[0]:.0%}")'''

CODE["What it is worth"] = '''import pyodbc

CHANGEOVERS_PER_WEEK = 5
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=plant-sql01;DATABASE=PlantDB;"
    "Trusted_Connection=yes;TrustServerCertificate=yes;"
)
c3 = pd.read_sql(
    "SELECT ideal_rate_hr, margin_per_barrel FROM dim_machine WHERE machine = ?", conn, params=["Conveyor 3"]
).iloc[0]

def weekly_usd(stopped_min):
    saved = (waterfall["Today"] - stopped_min) * CHANGEOVERS_PER_WEEK
    return saved / 60 * c3["ideal_rate_hr"] * c3["margin_per_barrel"]

for stage, minutes in waterfall.items():
    print(f"{stage:<20} {minutes:4.1f} min  ${weekly_usd(minutes):>8,.2f} a week")'''

CODE["Tie to the Savings Tracker"] = '''P5_BASELINE_MIN, P5_SETTLED_MIN = 75.0, 45.0

print(f"P5 baseline {P5_BASELINE_MIN} min a week = {CHANGEOVERS_PER_WEEK} x {waterfall['Today']:.1f}: "
      f"{P5_BASELINE_MIN == CHANGEOVERS_PER_WEEK * waterfall['Today']}")
print(f"P5 settled at {P5_SETTLED_MIN} min a week = {CHANGEOVERS_PER_WEEK} x {waterfall['Convert to external']:.1f}: "
      f"{P5_SETTLED_MIN == CHANGEOVERS_PER_WEEK * waterfall['Convert to external']}")
print(f"Streamlining next would take P5 to {CHANGEOVERS_PER_WEEK * waterfall['Streamline internal']:.0f} min a week")'''

CODE["The changeover log"] = '''log = pd.read_csv("changeover_log.csv", parse_dates=["start_ts"], dtype={"from_gal": str, "to_gal": str})
log["change"] = log["from_gal"] + " -> " + log["to_gal"]
print(f"{len(log)} changeovers, {log['start_ts'].min():%Y-%m-%d} to {log['start_ts'].max():%Y-%m-%d}, "
      f"{len(log) / 4:.0f} a week, {log['minutes'].mean():.2f} min on average")
print(log.groupby("change")["minutes"].agg(["count", "mean"]).round(2).to_string())'''

CODE["Changeover matrix"] = '''SIZES = ["53", "30", "15"]
matrix = log.pivot_table(index="from_gal", columns="to_gal", values="minutes", aggfunc="mean")
matrix = matrix.reindex(index=SIZES, columns=SIZES)
print("Average minutes, from (down) -> to (across):")
print(matrix.round(2).fillna("-").to_string())'''

CODE["Operator variation"] = '''same = log[log["change"] == "53 -> 30"]
by_op = same.groupby("operator")["minutes"].agg(["count", "mean", "min", "max"])
print(by_op.round(2).to_string())
print(f"Slowest operator {by_op['mean'].max() - by_op['mean'].median():.2f} min over the median on the same change")'''

CODE["Best sequence"] = '''from itertools import permutations

def route_minutes(order):
    stops = ["53", *order, "53"]
    return sum(matrix.loc[a, b] for a, b in zip(stops, stops[1:]))

options = {" -> ".join(["53", *o, "53"]): route_minutes(o) for o in permutations(["30", "15"])}
for route, minutes in sorted(options.items(), key=lambda kv: kv[1]):
    print(f"{route}: {minutes:.2f} min")'''

CODE["Batch size trade-off"] = '''WEEKLY_BARRELS = 7120
budget = CHANGEOVERS_PER_WEEK * waterfall["Today"]

for stage in ["Today", "Convert to external", "Streamline internal"]:
    n = int(budget // waterfall[stage])
    print(f"{stage:<20} {n:2d} changeovers in {budget:.0f} min, batches of {WEEKLY_BARRELS / n:,.0f} barrels")'''

CODE["SMED sheet in Excel"] = '''from openpyxl import Workbook, load_workbook

wb = Workbook()
ws = wb.active
ws.title = "SMED"
ws.append(["Element", "Before min", "Before", "After min", "After"])
before = study.set_index("element")
after = stage3.set_index("element")
for element in dict.fromkeys([*study["element"], *stage3["element"]]):
    b = before["minutes"].get(element)
    a = after["minutes"].get(element)
    ws.append([element, b, before["done"].get(element), a, after["done"].get(element)])
ws.append([])
ws.append(["Stopped minutes", stopped(study), "", stopped(stage3), ""])
ws.append(["Assumptions: 5 changeovers a week; quick-release clamp times and the eye preset are estimates"])
wb.save("smed.xlsx")

back = load_workbook("smed.xlsx")["SMED"]
stopped_row = [r for r in back.iter_rows(values_only=True) if r[0] == "Stopped minutes"][0]
print(f"{back.max_row} rows; stopped {stopped_row[1]} -> {stopped_row[3]} min, as computed: {stopped_row[3] == stopped(stage3)}")'''

CODE["Standard work"] = '''ORDER = [
    "Fetch 30-gal guides from the crib", "Fetch tools", "Preset the eye on the spare bracket",
    "Stop and lock out the conveyor", "Remove 53-gal side guides", "Fit 30-gal side guides",
    "Set the preset eye bracket", "Check the first barrel",
]
sw = stage3.set_index("element").loc[ORDER].reset_index()
sw["stopped_clock"] = sw["minutes"].where(sw["done"] == "internal", 0).cumsum()
print("Before the stop (conveyor running):")
for _, r in sw[sw["done"] == "external"].iterrows():
    print(f"  {r.element:<38} {r.minutes:3.1f} min")
print("Conveyor stopped:")
for _, r in sw[sw["done"] == "internal"].iterrows():
    print(f"  {r.element:<38} {r.minutes:3.1f} min  clock {r.stopped_clock:3.1f}")'''
