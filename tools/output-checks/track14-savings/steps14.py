# Savings Tracker: every step's code, in order. All steps build one file, savings.py.
# build14.py runs them in sequence against the canonical database (with savings_actuals.csv beside
# them) and writes site/data/tracks/14-savings.js.
CODE = {}

CODE["The project list"] = '''import pandas as pd
import pyodbc

AS_OF = "2026-12-05"
projects = pd.DataFrame([
    ("P1", "Compressor: stop the low-air trips", "All", "Low air", "M. Patel", True, 0.90),
    ("P2", "Hoop Driver 1 misfeeds", "Hoop Driver 1", "Hoop misfeed", "J. Ruiz", True, 0.50),
    ("P3", "Conveyor 3 minor stops", "Conveyor 3", "Minor stop", "A. Brooks", True, 0.40),
    ("P4", "Char Station 2 flares", "Char Station 2", "Char flare", "T. Nguyen", False, 0.50),
    ("P5", "SMED on Conveyor 3", "Conveyor 3", "Changeover", "A. Brooks", True, 0.40),
    ("P6", "Hoop Driver 1 air regulator", "Hoop Driver 1", "Low air", "J. Ruiz", True, 0.80),
], columns=["id", "project", "machine", "scope", "owner", "baseline_signed", "target_pct"]).set_index("id")
print(projects[["project", "machine", "scope", "owner"]].to_string())'''

CODE["Baseline from the database"] = '''WEEK_START = "2026-10-31 06:00"
WEEK_END = "2026-11-07 06:00"
MINOR_MAX_MIN = 5
CHANGEOVER_MIN, CHANGEOVERS_PER_WEEK = 15, 5

conn = pyodbc.connect(
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=plant-sql01;DATABASE=PlantDB;"
    "Trusted_Connection=yes;TrustServerCertificate=yes;"
)
faults = pd.read_sql(
    "SELECT machine, fault, DATEDIFF(SECOND, start_ts, end_ts) AS seconds "
    "FROM fault_log WHERE start_ts >= ? AND start_ts < ?",
    conn, params=[WEEK_START, WEEK_END],
)
faults["minutes"] = faults["seconds"] / 60

def baseline_by_machine(row):
    if row.scope == "Changeover":
        return pd.Series({row.machine: float(CHANGEOVER_MIN * CHANGEOVERS_PER_WEEK)})
    if row.scope == "Minor stop":
        hit = faults["fault"].isin(["Jam", "E-stop"]) & (faults["minutes"] < MINOR_MAX_MIN)
    else:
        hit = faults["fault"] == row.scope
    if row.machine != "All":
        hit &= faults["machine"] == row.machine
    return faults[hit].groupby("machine")["minutes"].sum()

base_min = {pid: baseline_by_machine(row) for pid, row in projects.iterrows()}
projects["baseline_min"] = [m.sum() for m in base_min.values()]
print(projects[["scope", "machine", "baseline_min"]].round(2).to_string())'''

CODE["Baseline in dollars"] = '''machines = pd.read_sql(
    "SELECT machine, ideal_rate_hr, margin_per_barrel FROM dim_machine", conn
).set_index("machine")
usd_per_min = machines["ideal_rate_hr"] / 60 * machines["margin_per_barrel"]

base_usd = {pid: m * usd_per_min[m.index] for pid, m in base_min.items()}
projects["baseline_usd"] = [u.sum() for u in base_usd.values()]
projects["usd_per_min"] = projects["baseline_usd"] / projects["baseline_min"]
print(projects[["baseline_min", "baseline_usd", "usd_per_min"]].round(2).to_string())'''

CODE["Load the actuals"] = '''actuals = pd.read_csv("savings_actuals.csv", parse_dates=["week_start"])
actuals = actuals[actuals["week_start"] < AS_OF]
print(actuals.pivot_table(index="week_start", columns="project_id", values="actual_min").to_string())
print(f"{len(actuals)} weekly results, weeks of {actuals['week_start'].min():%Y-%m-%d} to {actuals['week_start'].max():%Y-%m-%d}")'''

CODE["Savings per week"] = '''actuals = actuals.join(projects[["baseline_min", "usd_per_min"]], on="project_id")
actuals["saved_min"] = actuals["baseline_min"] - actuals["actual_min"]
actuals["saved_usd"] = actuals["saved_min"] * actuals["usd_per_min"]
print(actuals.pivot_table(index="week_start", columns="project_id", values="saved_usd").round(2).to_string())'''

CODE["Annualize"] = '''WEEKS_PER_YEAR = 50

def annualize(rows):
    weekly = rows.groupby("project_id")["saved_usd"].mean()
    return weekly, weekly * WEEKS_PER_YEAR

weekly, annual = annualize(actuals)
print(pd.DataFrame({"avg_per_week": weekly, "annualized": annual}).round(2).to_string())
print(f"Assumption: {WEEKS_PER_YEAR} running weeks a year")'''

CODE["Hard or soft"] = '''SOLD_OUT = {"Conveyor 3": True, "Hoop Driver 1": True, "Char Station 2": False}
ENERGY_USD_PER_WEEK = {"P1": 165.0}

def hard_share(pid):
    usd = base_usd[pid]
    return usd[[SOLD_OUT[m] for m in usd.index]].sum() / usd.sum()

projects["hard_share"] = [hard_share(pid) for pid in projects.index]
print(projects[["machine", "hard_share"]].round(3).to_string())
print("Energy (hard, $ a week):", ENERGY_USD_PER_WEEK)'''

CODE["No double counting"] = '''def overlaps(a, b):
    pa, pb = projects.loc[a], projects.loc[b]
    same_scope = pa.scope == pb.scope
    same_machine = "All" in (pa.machine, pb.machine) or pa.machine == pb.machine
    return same_scope and same_machine

counted_in = {}
for b in projects.index:
    for a in projects.index:
        if a < b and overlaps(a, b) and a not in counted_in:
            counted_in[b] = a
            break
for b, a in counted_in.items():
    print(f"{b} overlaps {a} ({projects.loc[b, 'scope']} on {projects.loc[b, 'machine']}): counted once, in {a}")
actuals = actuals[~actuals["project_id"].isin(counted_in)]'''

CODE["Claims cannot beat the baseline"] = '''too_big = actuals["saved_min"] > actuals["baseline_min"]
for _, r in actuals[too_big].iterrows():
    print(f"Refused: {r.project_id} week of {r.week_start:%Y-%m-%d}, actual {r.actual_min} min "
          f"would save {r.saved_min:.2f} of a {r.baseline_min:.2f}-minute baseline")
actuals = actuals[~too_big]
weekly, annual = annualize(actuals)
print(f"{len(actuals)} weekly results count")'''

CODE["Stage gates"] = '''REALIZED_WEEKS = 4

def stage(pid, rows):
    if pid in counted_in:
        return "Counted in " + counted_in[pid]
    if not projects.loc[pid, "baseline_signed"]:
        return "Identified"
    mine = rows[rows["project_id"] == pid]
    if len(mine) >= REALIZED_WEEKS and mine["saved_usd"].mean() > 0:
        return "Realized"
    return "Validated"

projects["stage"] = [stage(pid, actuals) for pid in projects.index]
projects["weeks"] = actuals.groupby("project_id").size().reindex(projects.index, fill_value=0)
print(projects[["project", "stage", "weeks"]].to_string())'''

CODE["The pipeline"] = '''def value(pid):
    if projects.loc[pid, "stage"] == "Realized":
        return annual[pid]
    if projects.loc[pid, "stage"].startswith("Counted"):
        return 0.0
    return projects.loc[pid, "baseline_usd"] * projects.loc[pid, "target_pct"] * WEEKS_PER_YEAR

capacity = pd.Series({pid: value(pid) for pid in projects.index})
energy = pd.Series({pid: ENERGY_USD_PER_WEEK.get(pid, 0) * WEEKS_PER_YEAR if projects.loc[pid, "stage"] == "Realized" else 0.0
                    for pid in projects.index})
projects["hard_usd"] = capacity * projects["hard_share"] + energy
projects["soft_usd"] = capacity * (1 - projects["hard_share"])
projects["annual_usd"] = projects["hard_usd"] + projects["soft_usd"]
pipeline = projects.groupby("stage")[["annual_usd", "hard_usd", "soft_usd"]].sum()
print(pipeline.round(0).to_string())
print(f"Realized, hard: ${pipeline.loc['Realized', 'hard_usd']:,.0f} a year")'''

CODE["Tracker sheet"] = '''from openpyxl import Workbook
from openpyxl.styles import Font

BASIS = {
    "Realized": "avg weekly saving x 50 weeks",
    "Validated": "baseline x target % x 50 weeks",
    "Identified": "baseline x target % x 50 weeks (baseline not signed)",
}
wb = Workbook()
ws = wb.active
ws.title = "Tracker"
ws.append(["ID", "Project", "Owner", "Stage", "Baseline $/wk", "Annualized $", "Hard $", "Soft $", "Basis"])
for pid, p in projects.iterrows():
    basis = BASIS.get(p.stage, "overlap: " + p.stage.lower())
    ws.append([pid, p.project, p.owner, p.stage, p.baseline_usd, p.annual_usd, p.hard_usd, p.soft_usd, basis])
for row in ws.iter_rows(min_row=2, min_col=5, max_col=8):
    for cell in row:
        cell.number_format = "$#,##0"
for cell in ws[1]:
    cell.font = Font(bold=True)
ws.freeze_panes = "A2"
print(f"{ws.max_row - 1} projects, columns {[c.value for c in ws[1]]}")'''

CODE["Totals as formulas"] = '''last = ws.max_row
ws.append(["", "Total", "", "", *[f"=SUM({c}2:{c}{last})" for c in "EFGH"], ""])
for cell in ws[ws.max_row]:
    cell.font = Font(bold=True)
    if cell.column in (5, 6, 7, 8):
        cell.number_format = "$#,##0"
wb.save("savings_tracker.xlsx")

from openpyxl import load_workbook

check = load_workbook("savings_tracker.xlsx")["Tracker"]
for col, name in zip("EFGH", ["baseline_usd", "annual_usd", "hard_usd", "soft_usd"]):
    formula = check[f"{col}{check.max_row}"].value
    from_cells = sum(check[f"{col}{r}"].value for r in range(2, check.max_row))
    print(f"{col}: {formula} = {from_cells:,.2f}, pandas {projects[name].sum():,.2f}, match {abs(from_cells - projects[name].sum()) < 0.005}")'''

CODE["Finance summary"] = '''fs = wb.create_sheet("Finance")
fs.append(["Stage", "Annualized $", "Hard $", "Soft $"])
for stage_name, row in pipeline.iterrows():
    fs.append([stage_name, row.annual_usd, row.hard_usd, row.soft_usd])
fs.append([])
fs.append(["Assumptions"])
for line in [
    f"Running weeks a year: {WEEKS_PER_YEAR}",
    f"Realized: {REALIZED_WEEKS} or more weeks of actuals and a positive average saving",
    "Margin: $42.50 a barrel; lost minutes valued at each machine's ideal rate",
    "Hard: sold-out machines (Conveyor 3, Hoop Driver 1) and the compressor's energy",
    "Baseline: OEE week 2026-10-31 06:00 to 2026-11-07 06:00, from fault_log",
]:
    fs.append([line])
wb.save("savings_tracker.xlsx")
print(f"Sheets: {wb.sheetnames}; Finance has {fs.max_row} rows")'''

CODE["What changed this month"] = '''LAST_REPORT = "2026-11-07"
before = actuals[actuals["week_start"] < LAST_REPORT]
was = pd.Series({pid: stage(pid, before) for pid in projects.index})
moved = projects[projects["stage"] != was]
for pid, p in moved.iterrows():
    print(f"{pid} {p.project}: {was[pid]} -> {p.stage}")
realized_now = projects.loc[projects["stage"] == "Realized", "annual_usd"].sum()
print(f"Realized since {LAST_REPORT}: ${realized_now:,.0f} a year")'''
