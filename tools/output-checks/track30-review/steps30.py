# Weekly Ops Review: every step's code, in order, with its language. SQL steps build review.sql and run
# one at a time on a fresh PlantDB through foundations/sql_exec.py (those reading v_hourly_barrels get
# the OEE track's view first); Python steps build review.py and run in sequence. build30.py writes
# site/data/tracks/30-review.js.
CODE, LANG = {}, {}

def sql(title, code):
    CODE[title], LANG[title] = code, "sql"

def py(title, code):
    CODE[title], LANG[title] = code, "python"

WEEK = "DECLARE @start DATETIME = '2026-10-31 06:00', @end DATETIME = '2026-11-07 06:00', @planned FLOAT = 9450;\n"
PER_MACHINE = """WITH b AS (
    SELECT machine, SUM(made_this_hour) AS made
    FROM v_hourly_barrels WHERE ts > @start AND ts <= @end GROUP BY machine
),
r AS (
    SELECT machine, SUM(qty) AS rejects
    FROM reject_log WHERE ts >= @start AND ts < @end GROUP BY machine
),
d AS (
    SELECT machine, SUM(DATEDIFF(SECOND, start_ts, end_ts)) / 60.0 AS down_min
    FROM fault_log WHERE start_ts >= @start AND start_ts < @end GROUP BY machine
),
m AS (
    SELECT dm.machine, CAST(dm.ideal_rate_hr AS FLOAT) / 60 AS per_min, dm.margin_per_barrel AS margin,
        b.made, r.rejects, b.made - r.rejects AS good, d.down_min, @planned - d.down_min AS run_min
    FROM dim_machine AS dm
    JOIN b ON b.machine = dm.machine
    JOIN r ON r.machine = dm.machine
    JOIN d ON d.machine = dm.machine
)"""

sql("This week's OEE", WEEK + "\n" + PER_MACHINE + """
SELECT * FROM (
SELECT machine,
    CAST(run_min / @planned AS DECIMAL(5,3)) AS avail,
    CAST(made / (run_min * per_min) AS DECIMAL(5,3)) AS perf,
    CAST(good * 1.0 / made AS DECIMAL(5,3)) AS qual,
    CAST(100 * good / (@planned * per_min) AS DECIMAL(5,1)) AS oee_pct
FROM m
UNION ALL
SELECT 'Pooled', NULL, NULL, NULL, CAST(100 * SUM(good) / SUM(@planned * per_min) AS DECIMAL(5,1))
FROM m
) AS o
ORDER BY CASE WHEN machine = 'Pooled' THEN 1 ELSE 0 END, oee_pct DESC;""")

sql("Loss by type", WEEK + "\n" + PER_MACHINE + """
SELECT
    CAST(SUM(down_min * per_min * margin) AS DECIMAL(10,2)) AS availability,
    CAST(SUM((run_min * per_min - made) * margin) AS DECIMAL(10,2)) AS performance,
    CAST(SUM(rejects * margin) AS DECIMAL(10,2)) AS quality,
    CAST(SUM(@planned * per_min * margin - good * margin) AS DECIMAL(10,2)) AS total
FROM m;""")

sql("Top losses", """DECLARE @start DATETIME = '2026-10-31 06:00', @end DATETIME = '2026-11-07 06:00';

SELECT TOP 5 f.fault,
    COUNT(*) AS stops,
    CAST(SUM(DATEDIFF(SECOND, f.start_ts, f.end_ts)) / 60.0 AS DECIMAL(7,2)) AS minutes,
    CAST(SUM(DATEDIFF(SECOND, f.start_ts, f.end_ts) * CAST(dm.ideal_rate_hr AS FLOAT) * dm.margin_per_barrel / 3600) AS DECIMAL(9,2)) AS lost_usd
FROM fault_log AS f
JOIN dim_machine AS dm ON dm.machine = f.machine
WHERE f.start_ts >= @start AND f.start_ts < @end
GROUP BY f.fault
ORDER BY lost_usd DESC;""")

sql("Maintenance health", """DECLARE @now DATETIME = '2026-11-07 06:00';

WITH pm AS (
    SELECT COUNT(*) AS due,
        SUM(CASE WHEN done_ts IS NOT NULL
                  AND done_ts <= DATEADD(MINUTE, DATEDIFF(MINUTE, created_ts, due_ts) / 10, due_ts)
            THEN 1 ELSE 0 END) AS on_time
    FROM work_order
    WHERE wo_type = 'PM' AND due_ts <= @now
),
open_wo AS (
    SELECT COUNT(*) AS orders, SUM(est_hours) AS hours
    FROM work_order
    WHERE done_ts IS NULL AND created_ts <= @now
)
SELECT pm.due, pm.on_time,
    CAST(100.0 * pm.on_time / pm.due AS DECIMAL(5,1)) AS pm_compliance_pct,
    open_wo.orders AS open_orders, open_wo.hours AS open_hours,
    CAST(open_wo.hours / 12.0 AS DECIMAL(5,2)) AS backlog_weeks
FROM pm CROSS JOIN open_wo;""")

sql("Delivery and quality", """DECLARE @start DATETIME = '2026-10-31 06:00', @end DATETIME = '2026-11-07 06:00';

WITH b AS (
    SELECT machine, SUM(made_this_hour) AS made
    FROM v_hourly_barrels WHERE ts > @start AND ts <= @end GROUP BY machine
),
r AS (
    SELECT machine, SUM(qty) AS rejects
    FROM reject_log WHERE ts >= @start AND ts < @end GROUP BY machine
)
SELECT
    (SELECT b.made - r.rejects FROM b JOIN r ON r.machine = b.machine WHERE b.machine = 'Hoop Driver 1') AS bottleneck_good,
    (SELECT AVG(week_total) FROM (SELECT SUM(barrels) AS week_total FROM demand_plan GROUP BY week_start) AS w) AS demand_week,
    (SELECT SUM(rejects) FROM r) AS rejects,
    (SELECT SUM(made) FROM b) AS made;""")

py("One table of measures", '''import pandas as pd
import pyodbc

WEEK_START, WEEK_END = "2026-10-31 06:00", "2026-11-07 06:00"
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=plant-sql01;DATABASE=PlantDB;"
    "Trusted_Connection=yes;TrustServerCertificate=yes;"
)
per = pd.read_sql("""
    SELECT dm.machine, dm.ideal_rate_hr / 60.0 AS per_min,
        (SELECT SUM(made_this_hour) FROM v_hourly_barrels v WHERE v.machine = dm.machine AND v.ts > ? AND v.ts <= ?) AS made,
        (SELECT SUM(qty) FROM reject_log r WHERE r.machine = dm.machine AND r.ts >= ? AND r.ts < ?) AS rejects
    FROM dim_machine AS dm""", conn, params=[WEEK_START, WEEK_END] * 2).set_index("machine")
per = per.astype(float)
per["good"] = per["made"] - per["rejects"]
per["oee"] = per["good"] / (9450 * per["per_min"])
pooled = per["good"].sum() / (9450 * per["per_min"]).sum()
ppm = per["rejects"].sum() / per["made"].sum() * 1e6
delivery = per.loc["Hoop Driver 1", "good"] / 7000

OEE_WEEK, SAVINGS_ASOF = "2026-11-07", "2026-12-05"
rows = [  # measure, value, unit, target, better, owner, source, as of
    ("OEE Char Station 2", per.loc["Char Station 2", "oee"] * 100, "%", 85, "high", "Finishing lead", "this track", OEE_WEEK),
    ("OEE Conveyor 3", per.loc["Conveyor 3", "oee"] * 100, "%", 85, "high", "Assembly lead", "this track", OEE_WEEK),
    ("OEE Hoop Driver 1", per.loc["Hoop Driver 1", "oee"] * 100, "%", 85, "high", "Assembly lead", "this track", OEE_WEEK),
    ("OEE pooled", pooled * 100, "%", 85, "high", "Plant manager", "this track", OEE_WEEK),
    ("Rejects", ppm, "ppm", 15000, "low", "Quality", "this track", OEE_WEEK),
    ("Delivery at the bottleneck", delivery * 100, "% of 7,000", 100, "high", "Planner", "this track; demand from S&OP", OEE_WEEK),
    ("PM compliance", 86.7, "%", 90, "high", "Maintenance", "Maintenance / CMMS · PM compliance", OEE_WEEK),
    ("Maintenance backlog", 2.25, "weeks", 4, "low", "Maintenance", "Maintenance / CMMS · Backlog in weeks", OEE_WEEK),
    ("Savings realized", 243446, "$ a year", 250000, "high", "CI lead", "Savings Tracker · The pipeline", SAVINGS_ASOF),
    ("P2 misfeed saving", 807.74, "$ a week", 1192.77, "high", "J. Ruiz", "Kaizen / A3 · Dollars against the target", SAVINGS_ASOF),
    ("Stock above safety", 639741.09, "$", 400000, "low", "Materials", "Inventory / WIP · Cash tied up", OEE_WEEK),
]
kpi = pd.DataFrame(rows, columns=["measure", "value", "unit", "target", "better", "owner", "source", "as_of"])
print(kpi[["measure", "value", "unit", "target"]].round(2).to_string(index=False))''')

py("Status against target", '''AMBER_BAND = 0.05  # within 5% of target on the wrong side

def status(value, target, better):
    if (better == "high" and value >= target) or (better == "low" and value <= target):
        return "green"
    miss = (target - value) / target if better == "high" else (value - target) / target
    return "amber" if miss <= AMBER_BAND else "red"

kpi["status"] = [status(v, t, b) for v, t, b in zip(kpi["value"], kpi["target"], kpi["better"])]
print(kpi[["measure", "status"]].to_string(index=False))
print(kpi["status"].value_counts().reindex(["green", "amber", "red"]).to_dict())''')

py("Sources and as-of dates", '''SOURCES = [  # track id, step, the text the figure must still match in that step's output
    ("t-maint", "PM compliance", "86.7"),
    ("t-maint", "Backlog in weeks", "2.25"),
    ("t-savings", "The pipeline", "243446.0"),
    ("t-kaizen", "Dollars against the target", "807.74"),
    ("t-kaizen", "Dollars against the target", "1,192.77"),
    ("t-inv", "Cash tied up", "639,741.09"),
    ("t-cost", "Cost of a finished barrel", "107.23"),
    ("t-heijunka", "What it is worth", "81,558.80"),
    ("dax", "Dollars from closing the gap", "44,588"),
    ("dax", "Dollars from closing the gap", "44,816"),
    ("t-rca", "Verified, rejected, open", "verified  2"),
]
print(kpi.groupby("as_of")["measure"].apply(", ".join).to_string())
late = kpi[kpi["as_of"] != OEE_WEEK]
print(f"{len(late)} of {len(kpi)} measures are not as of the review week ({OEE_WEEK}): " + ", ".join(late["measure"]))
print(f"{len(SOURCES)} quoted figures; build30.py checks each is still in its source step")''')

py("Biggest gaps in dollars", '''gaps = pd.DataFrame([
    ("OEE to 85%, Conveyor 3 (sold out)", 44816, "a week", "DAX · Dollars from closing the gap"),
    ("OEE to 85%, Hoop Driver 1 (sold out)", 44588, "a week", "DAX · Dollars from closing the gap"),
    ("Stock released by daily levelling", 81558.80, "once", "Heijunka · What it is worth"),
    ("P2 misfeeds below target", 1192.77 - 807.74, "a week", "Kaizen / A3"),
    ("Savings identified, not yet validated", 62023, "a year", "Savings Tracker · The pipeline"),
], columns=["gap", "usd", "per", "source"])
for per_unit, g in gaps.groupby("per", sort=False):
    print(f"{per_unit}:")
    for r in g.sort_values("usd", ascending=False).itertuples():
        print(f"  ${r.usd:>11,.2f}  {r.gap}")''')

py("Excel one-pager", '''from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill

NAVY, GOLD = "0F1F3A", "D6AA47"
FILL = {"green": "C6EFCE", "amber": "FFEB9C", "red": "FFC7CE"}
wb = Workbook()
ws = wb.active
ws.title = "Weekly review"
ws.append(["Weekly ops review: OEE week of 31 Oct 2026"])
ws["A1"].font = Font(name="Cambria", size=16, bold=True, color=NAVY)
cols = ["measure", "value", "unit", "target", "status", "owner", "source", "as_of"]
ws.append([c.replace("_", " ").title() for c in cols])
for cell in ws[2]:
    cell.font = Font(bold=True, color=GOLD)
    cell.fill = PatternFill("solid", fgColor=NAVY)
for r in kpi[cols].itertuples(index=False):
    ws.append(list(r))
    row = ws.max_row
    ws.cell(row, 2).number_format = "#,##0.0" if r.value < 1000 else "#,##0"
    ws.cell(row, 5).fill = PatternFill("solid", fgColor=FILL[r.status])
wb.save("weekly_review.xlsx")
back = load_workbook("weekly_review.xlsx")["Weekly review"]
got = [(back.cell(i, 1).value, back.cell(i, 5).value) for i in range(3, back.max_row + 1)]
print(f"{back['A1'].value}; {len(got)} measures read back")
print(f"Statuses match the table: {got == list(zip(kpi['measure'], kpi['status']))}")''')

py("Deck: title slide", '''from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.util import Inches, Pt

NAVY_RGB, GOLD_RGB, WHITE = RGBColor(0x0F, 0x1F, 0x3A), RGBColor(0xD6, 0xAA, 0x47), RGBColor(0xFF, 0xFF, 0xFF)
deck = Presentation()
deck.slide_width, deck.slide_height = Inches(13.333), Inches(7.5)
BLANK = deck.slide_layouts[6]

def navy_slide(title):
    s = deck.slides.add_slide(BLANK)
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = NAVY_RGB
    bar = s.shapes.add_shape(1, Inches(0.6), Inches(1.25), Inches(1.2), Inches(0.08))
    bar.fill.solid(); bar.fill.fore_color.rgb = GOLD_RGB; bar.line.fill.background()
    tb = s.shapes.add_textbox(Inches(0.6), Inches(0.4), Inches(12), Inches(0.9))
    p = tb.text_frame.paragraphs[0]
    p.text = title
    p.font.name, p.font.size, p.font.bold, p.font.color.rgb = "Cambria", Pt(32), True, WHITE
    return s

def style_header(table):
    for j in range(len(table.columns)):
        cell = table.cell(0, j)
        cell.fill.solid(); cell.fill.fore_color.rgb = NAVY_RGB
        font = cell.text_frame.paragraphs[0].font
        font.bold, font.color.rgb, font.size = True, GOLD_RGB, Pt(13)

def fmt(v):
    return f"{v:,.0f}" if abs(v) >= 1000 else f"{v:,.2f}" if abs(v) < 10 else f"{v:,.1f}"

s = navy_slide("Weekly ops review")
tb = s.shapes.add_textbox(Inches(0.6), Inches(1.6), Inches(12), Inches(1.5))
p = tb.text_frame.paragraphs[0]
p.text = f"OEE week of 31 Oct 2026: pooled OEE {pooled:.1%}, loss ${251876:,} a week"
p.font.size, p.font.color.rgb = Pt(20), GOLD_RGB
print(f"Slide 1: {len(s.shapes)} shapes, title '{s.shapes[1].text_frame.text}'")''')

py("Deck: the measures", '''STATUS_RGB = {"green": RGBColor(0x2E, 0x7D, 0x32), "amber": RGBColor(0xB2, 0x8A, 0x00), "red": RGBColor(0xC6, 0x28, 0x28)}
s = navy_slide("Measures against target")
show = kpi[["measure", "value", "unit", "target", "status", "as_of"]]
table = s.shapes.add_table(len(show) + 1, len(show.columns), Inches(0.6), Inches(1.6), Inches(12.1), Inches(5.2)).table
for j, c in enumerate(show.columns):
    table.cell(0, j).text = c.replace("_", " ").title()
for i, r in enumerate(show.itertuples(index=False), start=1):
    vals = [r.measure, fmt(r.value), r.unit, fmt(r.target), r.status, r.as_of]
    for j, v in enumerate(vals):
        cell = table.cell(i, j)
        cell.text = str(v)
        cell.text_frame.paragraphs[0].font.size = Pt(12)
    table.cell(i, 4).fill.solid()
    table.cell(i, 4).fill.fore_color.rgb = STATUS_RGB[r.status]
    table.cell(i, 4).text_frame.paragraphs[0].font.color.rgb = WHITE
style_header(table)
print(f"Slide 2: a {len(table.rows)} x {len(table.columns)} table")''')

py("Deck: loss by type", '''from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE

loss = pd.Series({"Availability": 11349.80, "Performance": 221443.95, "Quality": 19082.50})
s = navy_slide("Where the week's $251,876 went")
data = CategoryChartData()
data.categories = list(loss.index)
data.add_series("Loss, $ a week", list(loss.values))
chart = s.shapes.add_chart(XL_CHART_TYPE.BAR_CLUSTERED, Inches(0.6), Inches(1.6), Inches(12), Inches(5.2), data).chart
chart.has_legend = False
chart.has_title = False  # the slide title says what it is
plot = chart.plots[0]
plot.has_data_labels = True
plot.data_labels.number_format, plot.data_labels.number_format_is_linked = '$#,##0', False
plot.data_labels.font.color.rgb, plot.data_labels.font.size = WHITE, Pt(14)
chart.value_axis.tick_labels.number_format, chart.value_axis.tick_labels.number_format_is_linked = '$#,##0', False
chart.plots[0].series[0].format.fill.solid()
chart.plots[0].series[0].format.fill.fore_color.rgb = GOLD_RGB
for axis in (chart.category_axis, chart.value_axis):
    axis.tick_labels.font.color.rgb = WHITE
print(f"Slide 3: a bar chart of {len(loss)} losses, ${loss.sum():,.2f} in all")''')

py("Deck: open actions", '''actions = [
    ("Char Station 2 flares", "Fix the burner PM standard; 5 actions on the A3", "Maintenance planner", "11-20"),
    ("Overdue work orders", "Photo eye bracket (50 days), pressure switch calibration, a missed PM", "Maintenance", "11-13"),
    ("Conveyor 3 schedule", "Level 53 and 30-gal by day; every shift after the clamps", "Planner", "11-14"),
    ("P3 minor stops", "One more week of actuals to move from Validated to Realized", "A. Brooks", "11-21"),
]
s = navy_slide("Open actions")
table = s.shapes.add_table(len(actions) + 1, 4, Inches(0.6), Inches(1.6), Inches(12.1), Inches(3.6)).table
for j, (h, width) in enumerate([("Topic", 2.6), ("Action", 6.2), ("Owner", 2.3), ("Due", 1.0)]):
    table.cell(0, j).text = h
    table.columns[j].width = Inches(width)
for i, row in enumerate(actions, start=1):
    for j, v in enumerate(row):
        table.cell(i, j).text = v
style_header(table)
deck.save("weekly_review.pptx")
print(f"Slide 4: {len(actions)} actions; deck saved with {len(deck.slides)} slides")''')

py("Read the deck back", '''back = Presentation("weekly_review.pptx")
for n, slide in enumerate(back.slides, start=1):
    title = next(sh.text_frame.text for sh in slide.shapes if sh.has_text_frame and sh.text_frame.text)
    kinds = sorted({"table" if sh.has_table else "chart" if sh.has_chart else "text" for sh in slide.shapes if sh.has_text_frame or sh.has_table or sh.has_chart})
    print(f"{n}. {title}  [{', '.join(kinds)}]")
t = next(sh.table for sh in back.slides[1].shapes if sh.has_table)
statuses = [t.cell(i, 4).text for i in range(1, len(t.rows))]
print(f"Slide 2 statuses match the table: {statuses == list(kpi['status'])}")
c = next(sh.chart for sh in back.slides[2].shapes if sh.has_chart)
print(f"Slide 3 chart: {dict(zip(c.plots[0].categories, c.plots[0].series[0].values))}")''')
