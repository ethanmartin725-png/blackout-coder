# SPC and Control Charts: every step's code, in order. All steps build one file, spc.py.
# build19.py runs them in sequence against the canonical database and writes site/data/tracks/19-spc.js.
CODE = {}

CODE["Read the samples"] = '''import pandas as pd
import pyodbc

WEEK_START, WEEK_END = "2026-10-31 06:00", "2026-11-07 06:00"
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=plant-sql01;DATABASE=PlantDB;"
    "Trusted_Connection=yes;TrustServerCertificate=yes;"
)
depth = pd.read_sql(
    "SELECT sample_ts, barrel_seq, depth_mm FROM char_depth "
    "WHERE sample_ts >= ? AND sample_ts < ? ORDER BY sample_ts, barrel_seq",
    conn, params=[WEEK_START, WEEK_END], parse_dates=["sample_ts"],
)
depth["depth_mm"] = depth["depth_mm"].astype(float)
depth["shift_no"] = ((depth["sample_ts"] - pd.Timestamp(WEEK_START)) // pd.Timedelta(hours=8)).astype(int)
print(f"{len(depth)} barrels in {depth['shift_no'].nunique()} subgroups of {depth.groupby('shift_no').size().iloc[0]}")
print(depth.head(5).to_string(index=False))'''

CODE["Means and ranges"] = '''sub = depth.groupby("shift_no")["depth_mm"].agg(xbar="mean", r=lambda s: s.max() - s.min())
print(sub.round(3).T.to_string())'''

CODE["Control limits"] = '''A2, D3, D4 = 0.577, 0.0, 2.114

def limits(s):
    center, rbar = s["xbar"].mean(), s["r"].mean()
    return {"center": center, "ucl": center + A2 * rbar, "lcl": center - A2 * rbar,
            "rbar": rbar, "r_ucl": D4 * rbar, "r_lcl": D3 * rbar}

lim = limits(sub)
for name, value in lim.items():
    print(f"{name:<7}{value:.3f}")'''

CODE["Points outside the limits"] = '''out_x = sub[(sub["xbar"] > lim["ucl"]) | (sub["xbar"] < lim["lcl"])]
out_r = sub[(sub["r"] > lim["r_ucl"]) | (sub["r"] < lim["r_lcl"])]
print("X-bar outside:", out_x.index.tolist(), out_x["xbar"].round(3).tolist())
print("R outside:    ", out_r.index.tolist())'''

CODE["Western Electric rules"] = '''def we_signals(x, center, sigma):
    z = ((x - center) / sigma).tolist()
    hits = {}
    for i in range(len(z)):
        side = 1 if z[i] > 0 else -1
        if abs(z[i]) > 3:
            hits.setdefault(i, []).append("1: beyond 3 sigma")
        if i >= 2 and sum(1 for v in z[i - 2:i + 1] if v * side > 2) >= 2:
            hits.setdefault(i, []).append("2: 2 of 3 beyond 2 sigma")
        if i >= 4 and sum(1 for v in z[i - 4:i + 1] if v * side > 1) >= 4:
            hits.setdefault(i, []).append("3: 4 of 5 beyond 1 sigma")
        if i >= 7 and all(v * side > 0 for v in z[i - 7:i + 1]):
            hits.setdefault(i, []).append("4: 8 in a row on one side")
    return {x.index[i]: rules for i, rules in hits.items()}

sigma_xbar = (lim["ucl"] - lim["center"]) / 3
signals = we_signals(sub["xbar"], lim["center"], sigma_xbar)
for shift_no, rules in signals.items():
    print(f"shift {shift_no:2d}: {'; '.join(rules)}")'''

CODE["Signals against fault_log"] = '''flares = pd.read_sql(
    "SELECT start_ts FROM fault_log WHERE machine = ? AND fault = ? AND start_ts >= ? AND start_ts < ?",
    conn, params=["Char Station 2", "Char flare", WEEK_START, WEEK_END], parse_dates=["start_ts"],
)
flare_shifts = sorted({int(k) for k in (flares["start_ts"] - pd.Timestamp(WEEK_START)) // pd.Timedelta(hours=8)})
flagged = sorted(int(k) for k in signals)
print("Shifts with a char flare:", flare_shifts)
print("Shifts the chart flagged:", flagged)
print("Every flagged shift had a flare:", set(flagged) <= set(flare_shifts))
print("Flare shifts the chart missed:", sorted(set(flare_shifts) - set(flagged)))'''

CODE["Recompute without the causes"] = '''clean = sub.drop(index=flare_shifts)
lim_clean = limits(clean)
print(f"{len(clean)} subgroups with no assignable cause")
print(f"center {lim['center']:.3f} -> {lim_clean['center']:.3f}, UCL {lim['ucl']:.3f} -> {lim_clean['ucl']:.3f}, "
      f"LCL {lim['lcl']:.3f} -> {lim_clean['lcl']:.3f}")
signals_clean = we_signals(sub["xbar"], lim_clean["center"], (lim_clean["ucl"] - lim_clean["center"]) / 3)
flagged_clean = sorted(int(k) for k in signals_clean)
print("Flagged against the clean limits:", flagged_clean)
print("Every flare shift caught:", set(flare_shifts) <= set(flagged_clean))
for k in sorted(set(flagged_clean) - set(flare_shifts)):
    print(f"Also flagged: shift {k}, {'; '.join(signals_clean[k])}")'''

CODE["Control limits are not spec limits"] = '''LSL, USL = 3.0, 4.0
out_of_spec = depth[(depth["depth_mm"] < LSL) | (depth["depth_mm"] > USL)]
print(f"Spec {LSL}-{USL} mm; control limits {lim_clean['lcl']:.3f}-{lim_clean['ucl']:.3f} mm (for subgroup means)")
print(f"Barrels out of spec: {len(out_of_spec)} of {len(depth)}, in shifts {sorted(out_of_spec['shift_no'].unique().tolist())}")'''

CODE["Cp and Cpk"] = '''D2 = 2.326
sigma_within = lim_clean["rbar"] / D2
mu = lim_clean["center"]
cp = (USL - LSL) / (6 * sigma_within)
cpk = min(USL - mu, mu - LSL) / (3 * sigma_within)
print(f"sigma within = R-bar / d2 = {lim_clean['rbar']:.4f} / {D2} = {sigma_within:.4f} mm")
print(f"Cp {cp:.2f}, Cpk {cpk:.2f}")'''

CODE["Ppk"] = '''sigma_overall = depth["depth_mm"].std()
mu_all = depth["depth_mm"].mean()
ppk = min(USL - mu_all, mu_all - LSL) / (3 * sigma_overall)
print(f"Overall: mean {mu_all:.3f} mm, sigma {sigma_overall:.4f} mm")
print(f"Ppk {ppk:.2f} against Cpk {cpk:.2f}")'''

CODE["Individuals chart"] = '''hourly = pd.read_sql(
    "SELECT ts, made_this_hour FROM v_hourly_barrels WHERE machine = ? AND ts > ? AND ts <= ? ORDER BY ts",
    conn, params=["Char Station 2", WEEK_START, WEEK_END],
)
x = hourly["made_this_hour"].astype(float)
mr = x.diff().abs()
i_center, mr_bar = x.mean(), mr.mean()
i_ucl, i_lcl = i_center + 2.66 * mr_bar, i_center - 2.66 * mr_bar
print(f"{len(x)} hours: center {i_center:.2f}, MR-bar {mr_bar:.3f}, limits {i_lcl:.2f} to {i_ucl:.2f} barrels")
print(f"Hours outside the limits: {((x > i_ucl) | (x < i_lcl)).sum()}")'''

CODE["p-chart on rejects"] = '''rej = pd.read_sql(
    "SELECT ts, qty FROM reject_log WHERE machine = ? AND ts >= ? AND ts < ?",
    conn, params=["Char Station 2", WEEK_START, WEEK_END], parse_dates=["ts"],
)
rej["shift_no"] = ((rej["ts"] - pd.Timestamp(WEEK_START)) // pd.Timedelta(hours=8)).astype(int)
hourly["ts"] = pd.to_datetime(hourly["ts"])
hourly["shift_no"] = ((hourly["ts"] - pd.Timedelta(seconds=1) - pd.Timestamp(WEEK_START)) // pd.Timedelta(hours=8)).astype(int)
p = pd.DataFrame({"n": hourly.groupby("shift_no")["made_this_hour"].sum(), "rejects": rej.groupby("shift_no")["qty"].sum()}).fillna(0)
p["p"] = p["rejects"] / p["n"]
p_bar = p["rejects"].sum() / p["n"].sum()
p["ucl"] = p_bar + 3 * (p_bar * (1 - p_bar) / p["n"]) ** 0.5
p["lcl"] = (p_bar - 3 * (p_bar * (1 - p_bar) / p["n"]) ** 0.5).clip(lower=0)
print(f"p-bar {p_bar:.4f} ({p['rejects'].sum():.0f} of {p['n'].sum():.0f})")
print(f"Limits vary with n: UCL {p['ucl'].min():.4f} to {p['ucl'].max():.4f}")
print(f"Shifts outside: {((p['p'] > p['ucl']) | (p['p'] < p['lcl'])).sum()} of {len(p)}")'''

CODE["Control chart in Excel"] = '''from openpyxl import Workbook
from openpyxl.chart import LineChart, Reference
import zipfile
import xml.etree.ElementTree as ET

wb = Workbook()
ws = wb.active
ws.title = "X-bar"
ws.append(["Shift", "X-bar", "Center", "UCL", "LCL"])
for shift_no, row in sub.iterrows():
    ws.append([shift_no, round(row["xbar"], 3), round(lim["center"], 3), round(lim["ucl"], 3), round(lim["lcl"], 3)])
chart = LineChart()
chart.title, chart.y_axis.title = "Char depth, subgroup means (mm)", "mm"
chart.add_data(Reference(ws, min_col=2, max_col=5, min_row=1, max_row=ws.max_row), titles_from_data=True)
chart.set_categories(Reference(ws, min_col=1, min_row=2, max_row=ws.max_row))
ws.add_chart(chart, "G2")
wb.save("spc.xlsx")

C = "{http://schemas.openxmlformats.org/drawingml/2006/chart}"
with zipfile.ZipFile("spc.xlsx") as z:
    xml = ET.fromstring(z.read("xl/charts/chart1.xml"))
names = [ws[s.find(f"{C}tx//{C}f").text.split("!")[1].replace("$", "")].value for s in xml.iter(f"{C}ser")]
print(f"{ws.max_row - 1} subgroups; chart lines: {names}")'''

CODE["Reaction plan"] = '''ACTION = {
    "1": "Stop charring. Check the burner and the flame, then the last barrels' char depth.",
    "2": "Check the next 5 barrels now. Look for a burner or gas pressure change.",
    "3": "Note it on the shift log. Check the burner settings at the next barrel change.",
    "4": "The process has shifted. Tell the shift lead; review burner settings and gas supply.",
}
for shift_no, rules in signals_clean.items():
    first = sorted(r.split(":")[0] for r in rules)[0]
    print(f"shift {shift_no:2d} rule {first}: {ACTION[first]}")'''
