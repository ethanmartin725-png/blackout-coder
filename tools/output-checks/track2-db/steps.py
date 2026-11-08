# Track 2 Python steps, exactly as they appear in the lessons. Keep in sync with site/data/tracks/02-db.js.
S13 = '''import pandas as pd
import pyodbc

conn = pyodbc.connect(
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=plant-sql01;DATABASE=PlantDB;"
    "Trusted_Connection=yes;TrustServerCertificate=yes;"
)
query = (
    "SELECT * FROM v_fault_minutes "
    "WHERE start_ts >= DATEADD(DAY, -7, GETDATE())"
)
df = pd.read_sql(query, conn)
print(df.head())'''
S14 = '''df["start_ts"] = pd.to_datetime(df["start_ts"])
df["hour"] = df["start_ts"].dt.hour
df["shift"] = "C"
df.loc[df["hour"].between(6, 13), "shift"] = "A"
df.loc[df["hour"].between(14, 21), "shift"] = "B"
print(df[["fault", "hour", "shift"]].head())'''
S15 = '''pivot = df.pivot_table(
    index="fault",
    columns="shift",
    values="minutes",
    aggfunc="sum",
    fill_value=0,
)
print(pivot.round(1))'''
S16 = '''pareto = df.groupby("fault")["minutes"].sum().sort_values(ascending=False)
pareto = pareto.to_frame()
pareto["cum_pct"] = pareto["minutes"].cumsum() / pareto["minutes"].sum() * 100
pareto["vital_few"] = pareto["cum_pct"].shift(fill_value=0) < 80
print(pareto.round(1))'''
S17 = '''per_machine = df.groupby("machine").agg(
    faults=("minutes", "count"),
    down_min=("minutes", "sum"),
)
per_machine["mttr_min"] = per_machine["down_min"] / per_machine["faults"]

scheduled_min = 7 * 3 * 8 * 60
run_min = scheduled_min - per_machine["down_min"]
per_machine["mtbf_hr"] = run_min / per_machine["faults"] / 60
print(per_machine.round(1))'''
S18 = '''with pd.ExcelWriter("downtime_week.xlsx") as xl:
    pareto.to_excel(xl, sheet_name="Pareto")
    pivot.to_excel(xl, sheet_name="By Shift")
    per_machine.to_excel(xl, sheet_name="Reliability")
print("Saved downtime_week.xlsx")'''
