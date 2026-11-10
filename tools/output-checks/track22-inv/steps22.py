# Inventory / WIP: every step's code, in order, with its language. SQL steps build inventory.sql and
# run one at a time on a fresh PlantDB through foundations/sql_exec.py (steps after "Daily usage view"
# get that view first); Python steps build inventory.py and run in sequence. build22.py writes
# site/data/tracks/22-inv.js.
CODE, LANG = {}, {}

def sql(title, code):
    CODE[title], LANG[title] = code, "sql"

def py(title, code):
    CODE[title], LANG[title] = code, "python"

NOW = "DECLARE @now DATETIME = '2026-11-07 06:00';\n"
AVG_COST = """(SELECT SUM(p.qty * p.unit_price) / SUM(p.qty) FROM po_line AS p WHERE p.item_no = s.item_no)"""

sql("Create stock_move", """CREATE TABLE stock_move (
    move_id INT IDENTITY(1,1) PRIMARY KEY,
    item_no VARCHAR(8) NOT NULL,
    move_ts DATETIME NOT NULL,
    kind VARCHAR(10) NOT NULL,
    qty DECIMAL(12,2) NOT NULL,
    po_no INT NULL,
    line INT NULL,
    wo_id INT NULL,
    note VARCHAR(60) NULL
);""")

sql("Stock on hand", NOW + """
SELECT s.item_no, i.description, i.uom, SUM(s.qty) AS on_hand
FROM stock_move AS s
JOIN item AS i ON i.item_no = s.item_no
WHERE s.move_ts <= @now
GROUP BY s.item_no, i.description, i.uom
ORDER BY s.item_no;""")

sql("A running balance", NOW + """
WITH b AS (
    SELECT move_ts, kind, qty,
        SUM(qty) OVER (ORDER BY move_ts, move_id ROWS UNBOUNDED PRECEDING) AS balance
    FROM stock_move
    WHERE item_no = 'STV-53' AND move_ts <= @now
)
SELECT move_ts, kind, qty, balance
FROM b
WHERE move_ts >= '2026-11-03'
ORDER BY move_ts;""")

sql("Three-way match", NOW + """
WITH r AS (
    SELECT po_no, line, SUM(qty) AS received
    FROM stock_move
    WHERE kind = 'receipt' AND move_ts <= @now
    GROUP BY po_no, line
)
SELECT p.po_no, p.line, p.item_no, p.qty AS ordered, r.received, v.qty AS invoiced,
    CAST((v.qty - r.received) * v.unit_price AS DECIMAL(12,2)) AS not_received_usd
FROM po_line AS p
JOIN r ON r.po_no = p.po_no AND r.line = p.line
JOIN invoice_line AS v ON v.po_no = p.po_no AND v.line = p.line
WHERE r.received <> v.qty OR p.qty <> r.received;""")

sql("Daily usage view", """CREATE VIEW v_daily_usage AS
WITH days AS (
    SELECT CAST('2026-10-10' AS DATE) AS prod_day
    UNION ALL
    SELECT DATEADD(DAY, 1, prod_day) FROM days WHERE prod_day < '2026-11-06'
),
used AS (
    SELECT item_no,
        CAST(DATEADD(HOUR, -6, DATEADD(SECOND, -1, move_ts)) AS DATE) AS prod_day,
        -SUM(qty) AS qty
    FROM stock_move
    WHERE kind = 'issue'
    GROUP BY item_no, CAST(DATEADD(HOUR, -6, DATEADD(SECOND, -1, move_ts)) AS DATE)
)
SELECT i.item_no, d.prod_day, ISNULL(u.qty, 0) AS used
FROM item AS i
CROSS JOIN days AS d
LEFT JOIN used AS u ON u.item_no = i.item_no AND u.prod_day = d.prod_day;""")

sql("Usage and days of cover", NOW + """
WITH u AS (
    SELECT item_no, COUNT(*) AS days, AVG(used) AS avg_day, STDEV(used) AS sd_day
    FROM v_daily_usage
    GROUP BY item_no
),
h AS (
    SELECT item_no, SUM(qty) AS on_hand FROM stock_move WHERE move_ts <= @now GROUP BY item_no
)
SELECT u.item_no, u.days,
    CAST(u.avg_day AS DECIMAL(10,2)) AS avg_day,
    CAST(u.sd_day AS DECIMAL(10,2)) AS sd_day,
    CAST(u.sd_day / NULLIF(u.avg_day, 0) AS DECIMAL(5,3)) AS cv,
    h.on_hand,
    CAST(h.on_hand / NULLIF(u.avg_day, 0) AS DECIMAL(8,1)) AS days_cover
FROM u
JOIN h ON h.item_no = u.item_no
ORDER BY u.item_no;""")

py("Safety stock and order-up-to", '''import math
import pandas as pd
import pyodbc

NOW = "2026-11-07 06:00"
REVIEW_DAYS, LEAD_DAYS, Z = 7, 2, 1.65
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=plant-sql01;DATABASE=PlantDB;"
    "Trusted_Connection=yes;TrustServerCertificate=yes;"
)
usage = pd.read_sql("SELECT item_no, prod_day, used FROM v_daily_usage", conn)
usage["used"] = usage["used"].astype(float)
stats = usage.groupby("item_no")["used"].agg(avg="mean", sd="std")
stock = pd.read_sql("SELECT item_no, kind, qty, move_ts FROM stock_move", conn, parse_dates=["move_ts"])
stock["qty"] = stock["qty"].astype(float)
stats["on_hand"] = stock[stock["move_ts"] <= NOW].groupby("item_no")["qty"].sum()
stats["on_order"] = stock[stock["move_ts"] > NOW].groupby("item_no")["qty"].sum()
stats = stats.fillna(0)

t = REVIEW_DAYS + LEAD_DAYS
stats["safety"] = Z * stats["sd"] * math.sqrt(t)
stats["order_up_to"] = stats["avg"] * t + stats["safety"]
stats["above_safety"] = stats["on_hand"] - stats["safety"]
bulk = stats.loc[["STV-53", "STV-30", "HP-53", "HP-30", "LPG"]]
print(bulk[["avg", "sd", "safety", "order_up_to", "on_hand", "above_safety"]].round(0).astype(int).to_string())''')

py("The standing order", '''NEXT_REVIEW = "2026-11-12 06:00"
po = pd.read_sql(
    "SELECT item_no, SUM(qty) AS weekly_po FROM po_line WHERE po_date = ? GROUP BY item_no",
    conn, params=["2026-11-05"],
).set_index("item_no")["weekly_po"].astype(float)
days_to_review = (pd.Timestamp(NEXT_REVIEW) - pd.Timestamp(NOW)).days
bulk = bulk.assign(
    weekly_po=po, weekly_use=bulk["avg"] * 7,
    at_review=bulk["on_hand"] + bulk["on_order"] - bulk["avg"] * days_to_review,
)
bulk["next_order"] = (bulk["order_up_to"] - bulk["at_review"]).clip(lower=0)
print(f"Next review {NEXT_REVIEW[:10]}, {days_to_review} days of use away")
print(bulk[["weekly_po", "weekly_use", "at_review", "order_up_to", "next_order"]].round(0).astype(int).to_string())''')

py("ABC by spend", '''WEEKS_PER_YEAR = 50
spend = pd.read_sql(
    "SELECT p.item_no, i.category, SUM(p.qty * p.unit_price) AS spend "
    "FROM po_line AS p JOIN item AS i ON i.item_no = p.item_no GROUP BY p.item_no, i.category",
    conn,
)
spend["annual"] = spend["spend"].astype(float) / 6 * WEEKS_PER_YEAR
spend = spend.sort_values("annual", ascending=False)
spend["share"] = spend["annual"] / spend["annual"].sum()
spend["starts_at"] = spend["share"].cumsum() - spend["share"]
spend["abc"] = spend["starts_at"].apply(lambda c: "A" if c < 0.80 else "B" if c < 0.95 else "C")
spend["annual"] = spend["annual"].map("${:,.0f}".format)
print(spend[["item_no", "category", "annual", "share", "starts_at", "abc"]].round(3).to_string(index=False))''')

sql("Slow and excess stock", NOW + """
WITH h AS (
    SELECT item_no, SUM(qty) AS on_hand,
        MAX(CASE WHEN kind = 'issue' THEN move_ts END) AS last_issue
    FROM stock_move
    WHERE move_ts <= @now
    GROUP BY item_no
),
u AS (
    SELECT item_no, AVG(used) AS avg_day FROM v_daily_usage GROUP BY item_no
)
SELECT h.item_no, h.on_hand, h.last_issue,
    DATEDIFF(DAY, h.last_issue, @now) AS days_since_issue,
    CAST(h.on_hand / NULLIF(u.avg_day, 0) AS DECIMAL(8,1)) AS days_cover
FROM h
JOIN u ON u.item_no = h.item_no
WHERE h.on_hand > 0
    AND (h.last_issue IS NULL OR h.last_issue < DATEADD(DAY, -21, @now)
         OR h.on_hand / NULLIF(u.avg_day, 0) > 60);""")

sql("Cycle count adjustments", NOW + f"""
SELECT s.item_no, s.move_ts, s.qty, s.note,
    CAST({AVG_COST} AS DECIMAL(10,4)) AS avg_cost,
    CAST(s.qty * {AVG_COST} AS DECIMAL(12,2)) AS value_usd
FROM stock_move AS s
WHERE s.kind = 'count' AND s.move_ts <= @now;""")

py("Cash tied up", '''cost = pd.read_sql(
    "SELECT p.item_no, i.category, SUM(p.qty * p.unit_price) / SUM(p.qty) AS avg_cost "
    "FROM po_line AS p JOIN item AS i ON i.item_no = p.item_no GROUP BY p.item_no, i.category",
    conn,
).set_index("item_no")
cost["avg_cost"] = cost["avg_cost"].astype(float)
stats["value"] = stats["on_hand"] * cost["avg_cost"]
stats["excess_value"] = stats["above_safety"].clip(lower=0) * cost["avg_cost"]
by_cat = stats.join(cost["category"]).groupby("category")[["value", "excess_value"]].sum().sort_values("value", ascending=False)
for category, r in by_cat.iterrows():
    print(f"{category:<10} on hand ${r['value']:>12,.2f}   above safety stock ${r['excess_value']:>12,.2f}")
print(f"{'Total':<10} on hand ${by_cat['value'].sum():>12,.2f}   above safety stock ${by_cat['excess_value'].sum():>12,.2f}")''')

py("Turns and days on hand", '''stats["use_value_day"] = stats["avg"] * cost["avg_cost"]
total_value = stats["value"].sum()
use_per_day = stats["use_value_day"].sum()
turns = use_per_day * 365 / total_value
print(f"Stock ${total_value:,.2f}; used ${use_per_day:,.2f} a day")
print(f"Days on hand {total_value / use_per_day:.1f}; turns {turns:.1f} a year")
excess = stats.loc[["GD-30", "EYE-PE"], "value"].sum()
print(f"Slow and excess MRO: ${excess:,.2f}")''')

py("Reorder workbook", '''from openpyxl import Workbook, load_workbook

wb = Workbook()
ws = wb.active
ws.title = "Reorder"
ws.append(["Item", "Avg a day", "Safety stock", "Order-up-to", "At review", "Next order", "Avg cost", "Order value"])
for item, r in bulk.iterrows():
    qty = math.ceil(r["next_order"])
    ws.append([item, round(r["avg"], 1), round(r["safety"]), round(r["order_up_to"]), round(r["at_review"]), qty,
               round(cost.loc[item, "avg_cost"], 4), round(qty * cost.loc[item, "avg_cost"], 2)])
last = ws.max_row
ws.append(["Total", None, None, None, None, None, None, f"=SUM(H2:H{last})"])
wb.save("reorder.xlsx")

back = load_workbook("reorder.xlsx")["Reorder"]
rows = list(back.iter_rows(min_row=2, max_row=last, values_only=True))
for r in rows:
    print(f"{r[0]:<7} next order {r[5]:>7,}  ${r[7]:>11,.2f}")
print(f"Total row: {back.cell(last + 1, 8).value}; rows add to ${sum(r[7] for r in rows):,.2f}")''')
