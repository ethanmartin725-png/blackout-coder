# TPM Loss Hunt: every step's code, in order. All steps build one file, loss_hunt.py.
# build12.py runs them in sequence against the canonical database and writes site/data/tracks/12-tpm.js.
CODE = {}

CODE["Pull the week's faults"] = '''import pandas as pd
import pyodbc

WEEK_START = "2026-10-31 06:00"
WEEK_END = "2026-11-07 06:00"

conn = pyodbc.connect(
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=plant-sql01;DATABASE=PlantDB;"
    "Trusted_Connection=yes;TrustServerCertificate=yes;"
)
faults = pd.read_sql(
    "SELECT machine, fault, start_ts, DATEDIFF(SECOND, start_ts, end_ts) AS seconds "
    "FROM fault_log WHERE start_ts >= ? AND start_ts < ? ORDER BY start_ts",
    conn, params=[WEEK_START, WEEK_END],
)
faults["minutes"] = faults["seconds"] / 60
print(f"{len(faults)} faults, {faults['minutes'].sum():.2f} minutes")
print(faults.groupby("machine")["minutes"].sum().round(2))'''

CODE["Map faults to the six big losses"] = '''BIG_LOSS = {
    "Char flare": "Breakdown",
    "Low air": "Breakdown",
    "Jam": "Minor stop",
    "Hoop misfeed": "Minor stop",
    "E-stop": "Minor stop",
}
faults["loss"] = faults["fault"].map(BIG_LOSS)
print(faults.groupby("loss")["minutes"].agg(["count", "sum"]).round(1))'''

CODE["Minor stops vs breakdowns"] = '''MINOR_MAX_MIN = 5

long_stop = faults["loss"].eq("Minor stop") & (faults["minutes"] >= MINOR_MAX_MIN)
faults.loc[long_stop, "loss"] = "Breakdown"
print(f"{long_stop.sum()} stops of {MINOR_MAX_MIN} minutes or more moved to Breakdown")
print(faults.groupby(["loss", "fault"])["minutes"].agg(["count", "sum"]).round(1))'''

CODE["Losses by machine"] = '''by_loss = faults.pivot_table(
    index="loss", columns="machine", values="minutes",
    aggfunc="sum", fill_value=0,
)
print(by_loss.round(2))'''

CODE["One cause, three machines"] = '''machines = pd.read_sql(
    "SELECT machine, ideal_rate_hr, margin_per_barrel FROM dim_machine", conn
).set_index("machine")

air = faults[faults["fault"] == "Low air"].groupby("machine")["minutes"].sum().to_frame()
air["lost_barrels"] = air["minutes"] / 60 * machines["ideal_rate_hr"]
air["lost_usd"] = air["lost_barrels"] * machines["margin_per_barrel"]
print(air.round(1))
print(f"Low air, all machines: {air['minutes'].sum():.1f} min, ${air['lost_usd'].sum():,.2f} a week")'''

CODE["What the PLC can't see"] = '''PLANNED_MIN = 7 * 3 * 450
CHANGEOVER_MIN = 15
CHANGEOVERS_PER_WEEK = 5

logged = faults.groupby("machine")["minutes"].sum()
setup_min = CHANGEOVER_MIN * CHANGEOVERS_PER_WEEK
for label, down in [("PLC log only", logged["Conveyor 3"]),
                    ("plus changeovers", logged["Conveyor 3"] + setup_min)]:
    print(f"Conveyor 3 availability, {label}: {1 - down / PLANNED_MIN:.1%}")'''

CODE["Move minor stops to performance"] = '''counts = pd.read_sql(
    "SELECT machine, ts, barrels FROM count_log WHERE ts >= ? AND ts <= ? ORDER BY machine, ts",
    conn, params=[WEEK_START, WEEK_END],
)
prev = counts.groupby("machine")["barrels"].shift()
counts["made"] = (counts["barrels"] - prev).where(counts["barrels"] >= prev, counts["barrels"])
made = counts[counts["ts"] > WEEK_START].groupby("machine")["made"].sum()

rate = machines["ideal_rate_hr"]
all_down = by_loss.sum()
breakdown = by_loss.loc["Breakdown"]
view = pd.DataFrame({
    "A_oee_track": 1 - all_down / PLANNED_MIN,
    "P_oee_track": made / ((PLANNED_MIN - all_down) / 60 * rate),
    "A_tpm": 1 - breakdown / PLANNED_MIN,
    "P_tpm": made / ((PLANNED_MIN - breakdown) / 60 * rate),
})
view["AxP_same"] = (view["A_oee_track"] * view["P_oee_track"]).round(9) == (view["A_tpm"] * view["P_tpm"]).round(9)
print(made.astype(int).to_string())
print(view.round(3))'''

CODE["Quality loss"] = '''rejects = pd.read_sql(
    "SELECT machine, reason, SUM(qty) AS qty FROM reject_log "
    "WHERE ts >= ? AND ts < ? GROUP BY machine, reason ORDER BY machine, qty DESC",
    conn, params=[WEEK_START, WEEK_END],
)
print(rejects.to_string(index=False))
rejected = rejects.groupby("machine")["qty"].sum()
quality = (made - rejected) / made
print((quality * 100).round(1).to_string())'''

CODE["The loss waterfall"] = '''for m in machines.index:
    r = rate[m] / 60
    stops = by_loss[m]
    speed_min = PLANNED_MIN - stops.sum() - made[m] / r
    quality_min = rejected[m] / r
    good_min = (made[m] - rejected[m]) / r
    print(f"{m}: planned {PLANNED_MIN:,}"
          f" - breakdown {stops['Breakdown']:.2f} - minor {stops['Minor stop']:.2f}"
          f" - speed {speed_min:,.1f} - quality {quality_min:.1f}"
          f" = {good_min:,.1f} good min, OEE {good_min / PLANNED_MIN:.1%}")'''

CODE["Dollars by big loss"] = '''usd = pd.DataFrame(index=machines.index)
per_min = rate / 60 * machines["margin_per_barrel"]
usd["breakdown"] = by_loss.loc["Breakdown"] * per_min
usd["minor_stop"] = by_loss.loc["Minor stop"] * per_min
usd["speed"] = (PLANNED_MIN - all_down - made / (rate / 60)) * per_min
usd["quality"] = rejected * machines["margin_per_barrel"]
print(usd.round(0))
print(usd.sum().round(0).to_string())
print(f"Total: ${usd.to_numpy().sum():,.0f} a week")'''

CODE["SMED time study"] = '''smed = pd.DataFrame([
    ("Fetch 30-gal guides from the crib", 3.0, "external"),
    ("Fetch tools", 1.5, "external"),
    ("Stop and lock out the conveyor", 1.0, "internal"),
    ("Remove 53-gal side guides", 2.5, "internal"),
    ("Fit 30-gal side guides", 3.0, "internal"),
    ("Adjust the eye height", 2.0, "internal"),
    ("Check the first barrel", 2.0, "internal"),
], columns=["element", "minutes", "can_be"])
print(f"Changeover today: {smed['minutes'].sum():.1f} min, machine stopped throughout")
print(smed.groupby("can_be")["minutes"].sum().to_string())'''

CODE["SMED payback"] = '''EYE_PRESET_SAVES = 1.5

after = smed.loc[smed["can_be"] == "internal", "minutes"].sum() - EYE_PRESET_SAVES
saved = CHANGEOVER_MIN - after
weekly_barrels = saved * CHANGEOVERS_PER_WEEK / 60 * rate["Conveyor 3"]
weekly_usd = weekly_barrels * machines.loc["Conveyor 3", "margin_per_barrel"]
print(f"Stopped time per changeover: {CHANGEOVER_MIN:.1f} -> {after:.1f} min")
print(f"Saved {saved:.1f} min x {CHANGEOVERS_PER_WEEK} a week = {weekly_barrels:.1f} barrels, ${weekly_usd:,.2f} a week")'''

CODE["Random or wear-out?"] = '''air_events = faults[faults["fault"] == "Low air"].sort_values("start_ts")
gaps = air_events["start_ts"].diff().dropna().dt.total_seconds() / 3600
cv = gaps.std() / gaps.mean()
print("Hours between low-air events:", gaps.round(1).tolist())
print(f"Mean {gaps.mean():.1f} h, spread (CV) {cv:.2f}, from {len(gaps)} gaps")'''

CODE["Kaizen priority"] = '''misfeed = faults[faults["fault"] == "Hoop misfeed"]["minutes"].sum()
ideas = pd.DataFrame([
    ("Compressor: stop the low-air trips", air["lost_usd"].sum(), 2),
    ("Conveyor 3 jams: minor stops", usd.loc["Conveyor 3", "minor_stop"], 3),
    ("Hoop Driver 1 misfeeds", misfeed * per_min["Hoop Driver 1"], 3),
    ("Char Station 2 flares", faults[faults["fault"] == "Char flare"]["minutes"].sum() * per_min["Char Station 2"], 4),
    ("SMED on Conveyor 3", weekly_usd, 2),
    ("Speed loss, all machines", usd["speed"].sum(), 5),
], columns=["idea", "usd_per_week", "effort"])
ideas["usd_per_effort"] = ideas["usd_per_week"] / ideas["effort"]
print(ideas.sort_values("usd_per_effort", ascending=False).round(0).to_string(index=False))'''

CODE["A3 summary in Excel"] = '''from openpyxl import Workbook
from openpyxl.styles import Font

wb = Workbook()
ws = wb.active
ws.title = "A3"
ws.append(["TPM loss hunt, week of 2026-10-31"])
ws["A1"].font = Font(bold=True, size=14)
ws.append(["Machine", "Breakdown $", "Minor stop $", "Speed $", "Quality $"])
for m, row in usd.round(0).iterrows():
    ws.append([m, *row.tolist()])
ws.append([])
ws.append(["Next actions", "$ per week", "Effort"])
for _, idea in ideas.sort_values("usd_per_effort", ascending=False).head(3).iterrows():
    ws.append([idea["idea"], round(idea["usd_per_week"]), idea["effort"]])
wb.save("tpm_a3.xlsx")
print(f"Saved tpm_a3.xlsx: {ws.max_row} rows")'''
