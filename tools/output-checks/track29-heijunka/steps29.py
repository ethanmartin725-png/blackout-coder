# Heijunka and Scheduling: every step's code, in order, with its language. SQL steps build
# heijunka.sql and run one at a time on a fresh PlantDB through foundations/sql_exec.py (those reading
# v_hourly_barrels get the OEE track's view first); Python steps build heijunka.py and run in sequence
# with the SMED track's changeover_log.csv beside them. build29.py writes site/data/tracks/29-heijunka.js.
CODE, LANG = {}, {}

def sql(title, code):
    CODE[title], LANG[title] = code, "sql"

def py(title, code):
    CODE[title], LANG[title] = code, "python"

sql("Demand by size", """SELECT size,
    SUM(barrels) AS eight_weeks,
    CAST(AVG(barrels * 1.0) AS DECIMAL(8,2)) AS per_week,
    CAST(AVG(barrels * 1.0) / 7 AS DECIMAL(8,2)) AS per_day,
    CAST(100.0 * SUM(barrels) / SUM(SUM(barrels)) OVER () AS DECIMAL(5,1)) AS mix_pct
FROM demand_plan
GROUP BY size
ORDER BY size DESC;""")

sql("Conveyor 3's week", """DECLARE @start DATETIME = '2026-10-31 06:00', @end DATETIME = '2026-11-07 06:00';

SELECT
    (SELECT SUM(made_this_hour) FROM v_hourly_barrels
     WHERE machine = 'Conveyor 3' AND ts > @start AND ts <= @end) AS barrels,
    (SELECT SUM(qty) FROM reject_log
     WHERE machine = 'Conveyor 3' AND ts >= @start AND ts < @end) AS rejects,
    (SELECT CAST(SUM(DATEDIFF(SECOND, start_ts, end_ts)) / 60.0 AS DECIMAL(7,2)) FROM fault_log
     WHERE machine = 'Conveyor 3' AND start_ts >= @start AND start_ts < @end) AS down_min;""")

py("Running rate", '''import math
import pandas as pd
import pyodbc

WEEK_START, WEEK_END = "2026-10-31 06:00", "2026-11-07 06:00"
PLANNED_MIN = 9450
CHANGEOVERS, CHANGEOVER_MIN = 5, 15.0  # a week, the TPM track's and the Savings Tracker's P5
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=plant-sql01;DATABASE=PlantDB;"
    "Trusted_Connection=yes;TrustServerCertificate=yes;"
)
made = int(pd.read_sql("SELECT SUM(made_this_hour) AS n FROM v_hourly_barrels WHERE machine = ? AND ts > ? AND ts <= ?",
                       conn, params=["Conveyor 3", WEEK_START, WEEK_END])["n"].iloc[0])
rejects = int(pd.read_sql("SELECT SUM(qty) AS n FROM reject_log WHERE machine = ? AND ts >= ? AND ts < ?",
                          conn, params=["Conveyor 3", WEEK_START, WEEK_END])["n"].iloc[0])
down = float(pd.read_sql("SELECT SUM(DATEDIFF(SECOND, start_ts, end_ts)) / 60.0 AS m FROM fault_log WHERE machine = ? AND start_ts >= ? AND start_ts < ?",
                         conn, params=["Conveyor 3", WEEK_START, WEEK_END])["m"].iloc[0])
running = PLANNED_MIN - down - CHANGEOVERS * CHANGEOVER_MIN
rate = made / running
yld = (made - rejects) / made
print(f"{PLANNED_MIN} planned - {down:.2f} down - {CHANGEOVERS} x {CHANGEOVER_MIN} changeover = {running:.2f} running minutes")
print(f"{made:,} barrels: {rate:.4f} a running minute ({rate * 60:.1f} an hour against the ideal 60); yield {yld:.1%}")''')

py("Time left for changeovers", '''LEVEL_PLAN = 6798  # good barrels a week, the S&OP track's level plan at Hoop Driver 1
gross = LEVEL_PLAN / yld
run_min = gross / rate
spare = PLANNED_MIN - down - run_min
print(f"{LEVEL_PLAN:,} good needs {gross:,.1f} made: {run_min:,.1f} running minutes")
print(f"Left for changeovers: {spare:.1f} min a week")''')

py("Changeover time per cycle", '''log = pd.read_csv("changeover_log.csv", parse_dates=["start_ts"], dtype={"from_gal": str, "to_gal": str})
avg = log.groupby(["from_gal", "to_gal"])["minutes"].mean()
to30, to53 = avg[("53", "30")], avg[("30", "53")]
stages = pd.Series({"Today": to30 + to53, "SMED 9.0": 9.0 * 2, "SMED 6.0": 6.0 * 2})
print(f"53 -> 30 {to30:.2f} min, 30 -> 53 {to53:.2f} min (the SMED log)")
print(stages.rename("cycle_min").to_string())
print(f"Log changeovers involving 15-gal: {(log[['from_gal', 'to_gal']] == '15').any(axis=1).sum()} of {len(log)}")''')

py("Every part every interval", '''epei = pd.DataFrame({"cycle_min": stages})
epei["cycles_a_week"] = spare / epei["cycle_min"]
epei["epei_days"] = 7 / epei["cycles_a_week"]
print(epei.round(2).to_string())''')

py("Which cycle fits", '''FREQ = {"Weekly": 1, "Today (5 a week)": 2.5, "Daily": 7, "Every shift": 21}
fits = pd.DataFrame({stage: {f: n * c for f, n in FREQ.items()} for stage, c in stages.items()})
print(fits.round(1).to_string())
print(f"Spare: {spare:.1f} min a week")
for stage in stages.index:
    ok = [f for f, n in FREQ.items() if n * stages[stage] <= spare]
    print(f"{stage:<9} fits: {', '.join(ok)}")''')

py("Batch sizes and cycle stock", '''demand = pd.read_sql("SELECT size, AVG(barrels * 1.0) AS per_week FROM demand_plan GROUP BY size", conn).set_index("size")["per_week"].astype(float)
plan = (LEVEL_PLAN * demand / demand.sum()).reindex(["53-gal", "30-gal"])
HOLD = 1.50  # a barrel-week, the S&OP track's
rows = []
for f, n in FREQ.items():
    batch = plan / n
    stock = batch.sum() / 2  # a batch is used up evenly before the next one arrives
    rows.append((f, round(batch["53-gal"]), round(batch["30-gal"]), round(stock), stock * HOLD))
cycle = pd.DataFrame(rows, columns=["frequency", "batch_53", "batch_30", "cycle_stock", "holding_usd"]).set_index("frequency")
print(f"Plan a week: {plan['53-gal']:,.1f} 53-gal and {plan['30-gal']:,.1f} 30-gal")
print(cycle.round(2).to_string())''')

py("What a changeover costs", '''MARGIN, IDEAL_PER_MIN = 42.50, 1.0  # Conveyor 3: 60 an hour
CREW_PER_MIN = (32.00 + 48.00) / 60  # an operator and a mechanic
per_change = stages / 2
cost = pd.DataFrame({
    "minutes": per_change,
    "sold_out": per_change * IDEAL_PER_MIN * MARGIN,
    "spare_time": per_change * CREW_PER_MIN,
})
print(cost.round(2).to_string())''')

py("Economic batch", '''def eoq(d, s, h):
    return math.sqrt(2 * d * s / h)

for view in ("sold_out", "spare_time"):
    s = cost.loc["Today", view]
    q = {size: eoq(plan[size], s, HOLD) for size in plan.index}
    print(f"{view:<10} ${s:7.2f} a change: " + ", ".join(f"{k} {v:,.0f} ({plan[k] / v:.1f} a week)" for k, v in q.items()))''')

py("Cost by frequency", '''rows = []
for stage in stages.index:
    for f, n in FREQ.items():
        need = n * stages[stage]
        change = n * 2 * cost.loc[stage, "spare_time"]
        total = change + cycle.loc[f, "holding_usd"]
        rows.append((stage, f, need <= spare, round(change, 2), round(cycle.loc[f, "holding_usd"], 2), round(total, 2)))
tc = pd.DataFrame(rows, columns=["stage", "frequency", "fits", "changeover_usd", "holding_usd", "total_usd"])
print(tc.to_string(index=False))
best = tc[tc["fits"]].sort_values("total_usd").groupby("stage").head(1).set_index("stage").reindex(stages.index)
print(best[["frequency", "total_usd"]].to_string())''')

py("Pitch", '''TAKT_S, PALLET = 81.0, 12  # the Takt track's takt; barrels a pallet (illustrative)
SHIFT_MIN = 450
pitch_min = TAKT_S * PALLET / 60
print(f"Pitch {TAKT_S} s x {PALLET} = {pitch_min:.1f} min; {SHIFT_MIN / pitch_min:.2f} pitches a shift, {int(SHIFT_MIN // pitch_min)} whole")
pallets = plan / PALLET
print(f"Plan a week: {pallets['53-gal']:.2f} 53-gal and {pallets['30-gal']:.2f} 30-gal pallets")''')

py("The heijunka pattern", '''def spread(total, slots):
    """Whole pallets in each slot, carrying the remainder so the slots add to round(total)."""
    out, carry = [], 0.0
    for _ in range(slots):
        carry += total / slots
        n = round(carry)
        out.append(n)
        carry -= n
    return out

days = pd.date_range("2026-11-07", periods=7).strftime("%a %m-%d")
shifts = [f"{d} {s}" for d in days for s in "ABC"]
total = spread(pallets.sum(), 21)  # whole pallets a shift first, so no shift is over-filled
b53 = spread(pallets["53-gal"], 21)
board = pd.DataFrame({"53-gal": b53, "30-gal": [t - n for t, n in zip(total, b53)]}, index=shifts)
print(board.head(6).to_string())
print(f"Week: {board['53-gal'].sum()} and {board['30-gal'].sum()} pallets, "
      f"{(board['53-gal'].sum() + board['30-gal'].sum()) * PALLET:,} barrels; a shift holds {int(SHIFT_MIN // pitch_min)} pitches, the most used {board.sum(axis=1).max()}")''')

py("Heijunka board workbook", '''from openpyxl import Workbook, load_workbook

wb = Workbook()
ws = wb.active
ws.title = "Heijunka"
ws.append(["Shift", "53-gal pallets", "30-gal pallets", "Barrels"])
for i, (shift, row) in enumerate(board.iterrows(), start=2):
    ws.append([shift, int(row["53-gal"]), int(row["30-gal"]), f"=(B{i}+C{i})*{PALLET}"])
last = ws.max_row
ws.append(["Week", f"=SUM(B2:B{last})", f"=SUM(C2:C{last})", f"=SUM(D2:D{last})"])
wb.save("heijunka_board.xlsx")
back = load_workbook("heijunka_board.xlsx")["Heijunka"]
rows = list(back.iter_rows(min_row=2, max_row=last, values_only=True))
print(f"{len(rows)} shifts; week row {back.cell(last + 1, 2).value}, {back.cell(last + 1, 4).value}")
print(f"Cells add to {sum(r[1] for r in rows)} and {sum(r[2] for r in rows)} pallets (board {board['53-gal'].sum()} and {board['30-gal'].sum()})")''')

py("What it is worth", '''STANDARD = {"53-gal": 107.23, "30-gal": 55.06}  # the Cost track's standard cost
def stock_value(n):
    return sum(plan[s] / n / 2 * STANDARD[s] for s in plan.index)

today, daily, shift = (stock_value(FREQ[f]) for f in ("Today (5 a week)", "Daily", "Every shift"))
for name, v in (("Today", today), ("Daily", daily), ("Every shift", shift)):
    print(f"{name:<12} cycle stock worth ${v:,.2f}")
print(f"Daily frees ${today - daily:,.2f} of stock once, and ${cycle.loc['Today (5 a week)', 'holding_usd'] - cycle.loc['Daily', 'holding_usd']:,.2f} a week of holding")
print(f"Every shift frees ${today - shift:,.2f}, but only once SMED reaches 6.0 min")''')
