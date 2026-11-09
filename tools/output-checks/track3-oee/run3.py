# Runs the Track 3 report end to end against the canonical sample database on SQL Server
# (BC_SQL_PASSWORD and the container from sql_exec.py). Writes oee_loss_week.xlsx.
# Printouts are the "What it produces" text in site/data/tracks/03-oee.js.
# The lesson's pyodbc.connect goes to PlantDB through tools/output-checks/lib/pydb. The two views
# the query reads are created first, as the earlier steps do: v_hourly_barrels (this track, step 2)
# and v_fault_minutes (DB Pulls & Analytics, "Save it as a view").
import sys,io,contextlib,json,subprocess,warnings,pandas as pd
from pathlib import Path
sys.path.insert(0,'.')
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'lib'/'pydb'))
import plantdb
from steps3 import *
warnings.filterwarnings('ignore', message='pandas only supports SQLAlchemy')
ROOT=Path(__file__).resolve().parents[3]
view_db=json.loads(subprocess.run(['node','-e',"const fs=require('fs'),vm=require('vm'),c={};c.BC={addLanguage(){},addLane(){},addTrack(t){c.t=t}};vm.createContext(c);vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),c);console.log(JSON.stringify(c.t.lessons.find(l=>l.t==='Save it as a view').code))",str(ROOT/'site/data/tracks/02-db.js')],capture_output=True,text=True,check=True).stdout)
plantdb.reset([Q2, view_db])
plantdb.use_real_database()
open('oee_inputs.sql','w').write(Q3+'\n'+Q4+'\n'+Q5)
# Steps that print nothing (they build df columns or the workbook) get a check, run after the step in
# the same session, that shows what the step produced. Its lines appear under "After this step:".
CHECKS = {
    'P7': '''print(f"planned_min   {PLANNED_MIN:,} for every machine")
print("run_min       " + " · ".join(f"{m} {v:,.2f}" for m, v in zip(df.machine, df.run_min)))
print("availability  " + " · ".join(f"{v:.1%}" for v in df.availability))''',
    'P13': '''print(f'Sheet "{ws.title}", row 1: ' + ", ".join(c.value for c in ws[1]))
print(f"A1: fill #{ws['A1'].fill.fgColor.rgb[-6:]}, font #{ws['A1'].font.color.rgb[-6:]}, bold {ws['A1'].font.bold}, {ws['A1'].alignment.horizontal}")''',
    'P14': '''for row in ws.iter_rows(min_row=2, max_row=last):
    print(f"Row {row[0].row}: {row[0].value} | OEE {row[4].value:.4f} as {row[4].number_format} | Avail $ {row[5].value:,.2f} as {row[5].number_format}")''',
    'P15': '''print(f"Row {total_row}: " + " | ".join(str(c.value) for c in ws[total_row] if c.value is not None))
from decimal import Decimal, ROUND_HALF_UP
sums = [sum(ws[f"{col}{r}"].value for r in range(2, last + 1)) for col in "FGH"]
print("The SUMs over rows 2 to 4: " + "   ".join(f"{v:,.2f}" for v in sums))
print("Excel shows them as " + "   ".join("${:,}".format(int(Decimal(str(v)).quantize(Decimal(1), ROUND_HALF_UP))) for v in sums))''',
    'P16': '''from openpyxl import load_workbook
saved = load_workbook("oee_loss_week.xlsx")["OEE Summary"]
print(f"Reopened: {saved.max_row} rows x {saved.max_column} columns, frozen at {saved.freeze_panes}, column A width {saved.column_dimensions['A'].width:g}")''',
}
g={};outs={}
for n in ['P6','P7','P8','P9','P10','P11','P12','P13','P14','P15','P16']:
    buf=io.StringIO()
    with contextlib.redirect_stdout(buf): exec(globals()[n],g)
    out=buf.getvalue().rstrip()
    if n in CHECKS:
        cbuf=io.StringIO()
        with contextlib.redirect_stdout(cbuf): exec(CHECKS[n],g)
        out=(out+'\n\n' if out else '')+'After this step:\n'+cbuf.getvalue().rstrip()
    outs[n]=out; print('=====',n); print(outs[n])
json.dump(outs,open('outs3.json','w'))
import openpyxl
wb=openpyxl.load_workbook('oee_loss_week.xlsx'); ws=wb.active
for r in ws.iter_rows(values_only=True): print(r)
