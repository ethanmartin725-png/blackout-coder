# Procurement Spend: every step's code, in order, with its language. SQL steps build spend.sql and
# run one at a time on a fresh PlantDB through foundations/sql_exec.py, as the SQL lane does; Python
# steps build spend.py and run in sequence. build17.py writes site/data/tracks/17-spend.js.
CODE, LANG = {}, {}

def sql(title, code):
    CODE[title], LANG[title] = code, "sql"

def py(title, code):
    CODE[title], LANG[title] = code, "python"

INV = """FROM invoice_line AS v
JOIN po_line AS p ON p.po_no = v.po_no AND p.line = v.line
JOIN item AS i ON i.item_no = p.item_no"""

sql("Spend by category", f"""SELECT i.category,
    COUNT(*) AS lines,
    CAST(SUM(v.qty * v.unit_price) AS DECIMAL(12,2)) AS spend
{INV}
GROUP BY i.category
ORDER BY spend DESC;""")

sql("Category and supplier with ROLLUP", f"""SELECT CASE WHEN GROUPING(i.category) = 1 THEN 'All' ELSE i.category END AS category,
    CASE WHEN GROUPING(s.name) = 1 THEN 'All' ELSE s.name END AS supplier,
    CAST(SUM(v.qty * v.unit_price) AS DECIMAL(12,2)) AS spend
{INV}
JOIN supplier AS s ON s.supplier_id = p.supplier_id
GROUP BY ROLLUP(i.category, s.name)
ORDER BY GROUPING(i.category), i.category, GROUPING(s.name), spend DESC;""")

sql("Spend by month", f"""SELECT CONVERT(CHAR(7), v.invoice_date, 120) AS month,
    i.category,
    CAST(SUM(v.qty * v.unit_price) AS DECIMAL(12,2)) AS spend
{INV}
GROUP BY CONVERT(CHAR(7), v.invoice_date, 120), i.category
ORDER BY month, spend DESC;""")

sql("Price against contract", """SELECT p.po_date, p.item_no, p.supplier_id, p.qty,
    p.unit_price, c.price AS contract,
    CAST((p.unit_price - c.price) * p.qty AS DECIMAL(12,2)) AS variance
FROM po_line AS p
JOIN contract_price AS c
    ON c.item_no = p.item_no AND c.supplier_id = p.supplier_id
    AND p.po_date BETWEEN c.valid_from AND c.valid_to
WHERE p.unit_price <> c.price
ORDER BY variance DESC;""")

sql("Off-contract spend", """SELECT p.po_date, p.item_no, p.supplier_id, p.qty, p.unit_price,
    CAST(p.qty * p.unit_price AS DECIMAL(12,2)) AS spend
FROM po_line AS p
LEFT JOIN contract_price AS c
    ON c.item_no = p.item_no AND c.supplier_id = p.supplier_id
    AND p.po_date BETWEEN c.valid_from AND c.valid_to
WHERE c.item_no IS NULL
ORDER BY spend DESC;""")

sql("Invoice against PO", """SELECT v.invoice_no, p.item_no, p.qty AS po_qty, v.qty AS inv_qty,
    p.unit_price AS po_price, v.unit_price AS inv_price,
    CAST(v.qty * v.unit_price - p.qty * p.unit_price AS DECIMAL(12,2)) AS billed_over_po
FROM invoice_line AS v
JOIN po_line AS p ON p.po_no = v.po_no AND p.line = v.line
WHERE v.qty <> p.qty OR v.unit_price <> p.unit_price
ORDER BY billed_over_po DESC;""")

py("The cube in pandas", '''import pandas as pd
import pyodbc

conn = pyodbc.connect(
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=plant-sql01;DATABASE=PlantDB;"
    "Trusted_Connection=yes;TrustServerCertificate=yes;"
)
lines = pd.read_sql(
    "SELECT p.po_no, p.line, p.po_date, p.item_no, i.category, p.supplier_id, s.name AS supplier, "
    "p.qty AS po_qty, p.unit_price AS po_price, v.qty AS inv_qty, v.unit_price AS inv_price, v.invoice_date "
    "FROM po_line AS p JOIN item AS i ON i.item_no = p.item_no "
    "JOIN supplier AS s ON s.supplier_id = p.supplier_id "
    "JOIN invoice_line AS v ON v.po_no = p.po_no AND v.line = p.line",
    conn, parse_dates=["po_date", "invoice_date"],
)
for col in ["po_price", "inv_price"]:
    lines[col] = lines[col].astype(float)
lines["spend"] = lines["inv_qty"] * lines["inv_price"]
by_cat = lines.groupby("category")["spend"].sum().sort_values(ascending=False)
print(by_cat.map("${:,.2f}".format).to_string())
print(f"Total ${by_cat.sum():,.2f} over {len(lines)} invoice lines")''')

py("Supplier concentration", '''share = lines.groupby(["category", "supplier"])["spend"].sum()
share = share / share.groupby(level="category").transform("sum")
hhi = (share ** 2).groupby(level="category").sum() * 10000
top = share.groupby(level="category").max()
print(pd.DataFrame({"suppliers": share.groupby(level="category").size(),
                    "top_share": top.map("{:.1%}".format), "hhi": hhi.round(0)}).to_string())''')

py("Hoops bought and used", '''WEEK_START, WEEK_END = "2026-10-31 06:00", "2026-11-07 06:00"
MIX_53 = 4700
HOOPS_PER_BARREL = {"HP-53": 6, "HP-30": 4}

barrels = pd.read_sql(
    "SELECT SUM(made_this_hour) AS barrels FROM v_hourly_barrels "
    "WHERE machine = ? AND ts > ? AND ts <= ?",
    conn, params=["Hoop Driver 1", WEEK_START, WEEK_END],
)["barrels"].iloc[0]
made = {"HP-53": MIX_53, "HP-30": barrels - MIX_53}
in_week = lines["invoice_date"].between("2026-10-31", "2026-11-06")
bought = lines[in_week].groupby("item_no")["inv_qty"].sum()
for item, per in HOOPS_PER_BARREL.items():
    used = made[item] * per
    print(f"{item}: {made[item]:,} barrels x {per} = {used:,} used, {bought[item]:,} bought, {bought[item] - used:+,}")
print(f"Hoop Driver 1 barrels in the OEE week: {barrels:,}")''')

py("Material cost per barrel", '''BOM = {
    "53-gal": {"STV-53": 33, "HP-53": 6},
    "30-gal": {"STV-30": 22, "HP-30": 4},
}
contracts = pd.read_sql(
    "SELECT item_no, MIN(price) AS price FROM contract_price "
    "WHERE ? BETWEEN valid_from AND valid_to GROUP BY item_no",
    conn, params=["2026-11-02"],
).set_index("item_no")["price"].astype(float)
for size, parts in BOM.items():
    cost = sum(qty * contracts[item] for item, qty in parts.items())
    print(f"{size}: " + " + ".join(f"{q} x ${contracts[i]:.2f}" for i, q in parts.items()) + f" = ${cost:,.2f}")''')

py("A better hoop price", '''WEEKS_PER_YEAR = 50
NEW_HP53_PRICE = 1.38

weekly_use = made["HP-53"] * HOOPS_PER_BARREL["HP-53"]
saving = (contracts["HP-53"] - NEW_HP53_PRICE) * weekly_use * WEEKS_PER_YEAR
print(f"HP-53: ${contracts['HP-53']:.2f} -> ${NEW_HP53_PRICE:.2f} on {weekly_use:,} a week x {WEEKS_PER_YEAR} weeks")
print(f"Price reduction: ${saving:,.2f} a year")''')

py("Reduction or avoidance", '''LPG_PER_WEEK = 3200
OLD, ASKED, AGREED = 2.20, 2.50, 2.35

avoided = (ASKED - AGREED) * LPG_PER_WEEK * WEEKS_PER_YEAR
increase = (AGREED - OLD) * LPG_PER_WEEK * WEEKS_PER_YEAR
print(f"Cost avoidance (not in the P&L): ${avoided:,.2f} a year")
print(f"Cost increase still paid:        ${increase:,.2f} a year")
print(f"Net change in propane spend:     {'+' if increase >= 0 else '-'}${abs(increase):,.2f} a year")''')

py("Exceptions for the buyer", '''prices = pd.read_sql("SELECT * FROM contract_price", conn, parse_dates=["valid_from", "valid_to"])
prices["price"] = prices["price"].astype(float)
m = lines.merge(prices, on=["item_no", "supplier_id"], how="left")
m = m[m["price"].isna() | m["po_date"].between(m["valid_from"], m["valid_to"])]
out = []
for _, r in m.iterrows():
    if pd.isna(r.price):
        out.append((r.po_no, r.item_no, "No contract", r.po_qty * r.po_price))
    elif r.po_price > r.price:
        out.append((r.po_no, r.item_no, "Price over contract", (r.po_price - r.price) * r.po_qty))
    if r.inv_qty * r.inv_price != r.po_qty * r.po_price:
        out.append((r.po_no, r.item_no, "Invoice differs from PO", r.inv_qty * r.inv_price - r.po_qty * r.po_price))
exceptions = pd.DataFrame(out, columns=["po_no", "item_no", "issue", "usd"]).sort_values("usd", ascending=False)
print(exceptions.to_string(index=False, formatters={"usd": "${:,.2f}".format}))''')

py("Spend report in Excel", '''from openpyxl import Workbook, load_workbook

wb = Workbook()
ws = wb.active
ws.title = "Spend"
ws.append(["Category", "Spend $"])
for cat, usd in by_cat.items():
    ws.append([cat, usd])
ws.append(["Total", f"=SUM(B2:B{ws.max_row})"])
ex = wb.create_sheet("Exceptions")
ex.append(["PO", "Item", "Issue", "$"])
for row in exceptions.itertuples(index=False):
    ex.append(list(row))
for sheet in wb:
    for row in sheet.iter_rows(min_row=2, min_col=sheet.max_column):
        for cell in row:
            cell.number_format = "$#,##0.00"
wb.save("spend_report.xlsx")

back = load_workbook("spend_report.xlsx")
spend = back["Spend"]
cells = sum(spend.cell(r, 2).value for r in range(2, spend.max_row))
print(f"Spend total {spend.cell(spend.max_row, 2).value} = ${cells:,.2f}; pandas ${by_cat.sum():,.2f}")
print(f"Exceptions sheet: {back['Exceptions'].max_row - 1} rows")''')
