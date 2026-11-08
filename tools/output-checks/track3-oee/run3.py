# Runs the Track 3 report end to end on the sample OEE inputs. Writes oee_loss_week.xlsx.
# Printouts are the "What it produces" text in site/data/tracks/03-oee.js.
import sys,types,io,contextlib,json,pandas as pd
sys.path.insert(0,'.')
from steps3 import *
open('oee_inputs.sql','w').write(Q3+'\n'+Q4+'\n'+Q5)
fake=types.ModuleType('pyodbc'); fake.connect=lambda s:None; sys.modules['pyodbc']=fake
inp=pd.DataFrame({'machine':['Char Station 2','Conveyor 3','Hoop Driver 1'],'ideal_rate_hr':[50,60,55],
 'margin_per_barrel':[42.50,42.50,42.50],'down_min':[87.05,94.733333,108.85],'total_count':[6980,7120,6410],'rejects':[211,142,96]})
pd.read_sql=lambda q,c: inp.copy()
g={};outs={}
for n in ['P6','P7','P8','P9','P10','P11','P12','P13','P14','P15','P16']:
    buf=io.StringIO()
    with contextlib.redirect_stdout(buf): exec(globals()[n],g)
    outs[n]=buf.getvalue().rstrip(); print('=====',n); print(outs[n])
json.dump(outs,open('outs3.json','w'))
import openpyxl
wb=openpyxl.load_workbook('oee_loss_week.xlsx'); ws=wb.active
for r in ws.iter_rows(values_only=True): print(r)
