# Track 3 SQL and Python steps, exactly as they appear in the lessons. Keep in sync with site/data/tracks/03-oee.js.
Q1 = '''CREATE TABLE reject_log (
    reject_id INT IDENTITY(1,1) PRIMARY KEY,
    machine VARCHAR(50) NOT NULL,
    reason VARCHAR(50) NOT NULL,
    qty INT NOT NULL,
    ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);'''
Q2 = '''CREATE VIEW v_hourly_barrels AS
WITH c AS (
    SELECT machine,
        ts,
        barrels,
        LAG(barrels) OVER (PARTITION BY machine ORDER BY ts) AS prev
    FROM count_log
)
SELECT machine,
    ts,
    CASE
        WHEN prev IS NULL THEN 0
        WHEN barrels < prev THEN barrels
        ELSE barrels - prev
    END AS made_this_hour
FROM c;'''
Q3 = '''SET NOCOUNT ON;
DECLARE @week_start DATETIME = '2026-10-31 06:00';
DECLARE @week_end DATETIME = '2026-11-07 06:00';

WITH made AS (
    SELECT machine, SUM(made_this_hour) AS total_count
    FROM v_hourly_barrels
    WHERE ts > @week_start AND ts <= @week_end
    GROUP BY machine
),'''
Q4 = '''rej AS (
    SELECT machine, SUM(qty) AS rejects
    FROM reject_log
    WHERE ts >= @week_start AND ts < @week_end
    GROUP BY machine
),
down AS (
    SELECT machine, SUM(minutes) AS down_min
    FROM v_fault_minutes
    WHERE start_ts >= @week_start AND start_ts < @week_end
    GROUP BY machine
)'''
Q5 = '''SELECT m.machine,
    m.ideal_rate_hr,
    m.margin_per_barrel,
    ISNULL(d.down_min, 0) AS down_min,
    ISNULL(c.total_count, 0) AS total_count,
    ISNULL(r.rejects, 0) AS rejects
FROM dim_machine AS m
LEFT JOIN made AS c ON c.machine = m.machine
LEFT JOIN rej AS r ON r.machine = m.machine
LEFT JOIN down AS d ON d.machine = m.machine
ORDER BY m.machine;'''
P6 = '''import pandas as pd
import pyodbc

conn = pyodbc.connect(
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=plant-sql01;DATABASE=PlantDB;"
    "Trusted_Connection=yes;TrustServerCertificate=yes;"
)
with open("oee_inputs.sql") as f:
    query = f.read()

df = pd.read_sql(query, conn)
print(df.to_string(index=False))'''
P7 = '''PLANNED_MIN = 7 * 3 * (8 * 60 - 30)

df["planned_min"] = PLANNED_MIN
df["run_min"] = df["planned_min"] - df["down_min"]
df["availability"] = df["run_min"] / df["planned_min"]'''
P8 = '''df["ideal_count"] = df["run_min"] / 60 * df["ideal_rate_hr"]
df["performance"] = df["total_count"] / df["ideal_count"]
df["good_count"] = df["total_count"] - df["rejects"]
df["quality"] = df["good_count"] / df["total_count"]
df["oee"] = df["availability"] * df["performance"] * df["quality"]

cols = ["machine", "availability", "performance", "quality", "oee"]
print(df[cols].round(3).to_string(index=False))'''
P9 = '''problems = []
for _, row in df.iterrows():
    name = row["machine"]
    if row["total_count"] == 0:
        problems.append(f"{name}: no counts logged")
    if row["performance"] > 1:
        problems.append(f"{name}: performance over 100%, check ideal rate")
    if row["rejects"] > row["total_count"]:
        problems.append(f"{name}: rejects exceed total count")

print(problems or "No data problems found")'''
P10 = '''df["avail_loss"] = df["down_min"] / 60 * df["ideal_rate_hr"]
df["perf_loss"] = df["ideal_count"] - df["total_count"]
df["qual_loss"] = df["rejects"]

check = df["avail_loss"] + df["perf_loss"] + df["qual_loss"]
target = df["planned_min"] / 60 * df["ideal_rate_hr"] - df["good_count"]
print("Losses reconcile:", (check - target).abs().max() < 0.001)'''
P11 = '''for loss in ["avail_loss", "perf_loss", "qual_loss"]:
    df[loss + "_usd"] = df[loss] * df["margin_per_barrel"]

df["usd_per_oee_pt"] = (
    df["planned_min"] / 60 * df["ideal_rate_hr"] * 0.01 * df["margin_per_barrel"]
)
usd_cols = ["avail_loss_usd", "perf_loss_usd", "qual_loss_usd"]
total_usd = df[usd_cols].sum().sum()
print(df[["machine"] + usd_cols + ["usd_per_oee_pt"]].round(0).to_string(index=False))
print(f"Total weekly loss: ${total_usd:,.0f}")'''
P12 = '''losses = df.melt(
    id_vars="machine",
    value_vars=usd_cols,
    var_name="loss",
    value_name="usd",
)
losses = losses.sort_values("usd", ascending=False)
print(losses.head(3).round(0).to_string(index=False))'''
P13 = '''from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

wb = Workbook()
ws = wb.active
ws.title = "OEE Summary"
headers = [
    "Machine", "Availability", "Performance", "Quality", "OEE",
    "Avail $", "Perf $", "Qual $", "$ per OEE pt",
]
ws.append(headers)

NAVY = PatternFill("solid", fgColor="1F2A44")
for cell in ws[1]:
    cell.fill = NAVY
    cell.font = Font(bold=True, color="D6AA47")
    cell.alignment = Alignment(horizontal="center")'''
P14 = '''fields = ["machine", "availability", "performance", "quality", "oee"]
fields += usd_cols + ["usd_per_oee_pt"]
for _, r in df.iterrows():
    ws.append([r[f] for f in fields])

last = ws.max_row
for row in ws.iter_rows(min_row=2, max_row=last):
    for cell in row[1:5]:
        cell.number_format = "0.0%"
    for cell in row[5:9]:
        cell.number_format = "$#,##0"'''
P15 = '''total_row = last + 1
ws.cell(row=total_row, column=1, value="Total").font = Font(bold=True)
for col in "FGH":
    c = ws[f"{col}{total_row}"]
    c.value = f"=SUM({col}2:{col}{last})"
    c.number_format = "$#,##0"
    c.font = Font(bold=True)'''
P16 = '''widths = [16, 13, 13, 10, 9, 11, 11, 11, 13]
for i, w in enumerate(widths, start=1):
    ws.column_dimensions[get_column_letter(i)].width = w

ws.freeze_panes = "A2"
wb.save("oee_loss_week.xlsx")
print("Saved oee_loss_week.xlsx")'''
