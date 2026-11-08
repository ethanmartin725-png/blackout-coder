# Runs the Track 2 pandas steps on the sample week with the database call stubbed out.
# Prints each step's output; those printouts are the "What it produces" text in site/data/tracks/02-db.js.
import sys, types, io, contextlib, json, pandas as pd
sys.path.insert(0,'.')
from steps import *
fake=types.ModuleType('pyodbc'); fake.connect=lambda s: None; sys.modules['pyodbc']=fake
src=pd.read_pickle('faults.pkl')
area={'Conveyor 3':'Assembly','Hoop Driver 1':'Assembly','Char Station 2':'Finishing'}
src['area']=src.machine.map(area)
view=src[['machine','area','fault','start_ts','minutes']].copy()
view['start_ts']=view['start_ts'].dt.strftime('%Y-%m-%d %H:%M:%S')  # as text, to make to_datetime meaningful
pd.read_sql=lambda q,c: view.copy()
pd.set_option('display.width',120)
g={}
outs={}
for name in ['S13','S14','S15','S16','S17','S18']:
    buf=io.StringIO()
    with contextlib.redirect_stdout(buf):
        exec(globals()[name], g)
    outs[name]=buf.getvalue().rstrip()
    print('=====',name); print(outs[name])
json.dump(outs,open('outs.json','w'))
import openpyxl; print(openpyxl.load_workbook('downtime_week.xlsx').sheetnames)
