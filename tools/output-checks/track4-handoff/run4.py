# Runs the Track 4 handoff script with stand-in database calls. Writes the handoff HTML page.
# Printouts and the page are the outputs shown in site/data/tracks/04-handoff.js.
import sys,types,io,contextlib,json,pandas as pd
from datetime import datetime
sys.path.insert(0,'.')
from steps4 import *
for fn,q in [('last_shift_counts.sql',Q2),('last_shift_faults.sql',Q3),('open_notes.sql',Q4)]: open(fn,'w').write(q)
log=[]
class Cur:
    rowcount=0
    def execute(self,sql,params): log.append((sql,params)); self.rowcount=3 if sql.startswith('UPDATE') else 1
class Conn:
    def cursor(self): return Cur()
    def commit(self): log.append('commit')
fake=types.ModuleType('pyodbc'); fake.connect=lambda s:Conn(); sys.modules['pyodbc']=fake
NOW=datetime(2026,11,7,14,5)
counts=pd.DataFrame({'machine':['Char Station 2','Conveyor 3','Hoop Driver 1'],'ideal_rate_hr':[50,60,55],'barrels':[301,352,274]})
# Shift A faults. The first two are the same fault_log records DB Pulls & Analytics ends on
# (track2-db/gen.py, "now" 10:15): the Conveyor 3 jam and the Hoop misfeed that was still open at 10:15.
# The misfeed closes at 10:17:10; the rest happen after 10:15.
F=[('Conveyor 3','Jam','2026-11-07 09:08:52','2026-11-07 09:13:29'),('Hoop Driver 1','Hoop misfeed','2026-11-07 10:09:40','2026-11-07 10:17:10'),
   ('Hoop Driver 1','Low air','2026-11-07 11:31:00','2026-11-07 11:49:30'),('Hoop Driver 1','Low air','2026-11-07 12:22:00','2026-11-07 12:37:00'),
   ('Char Station 2','Char flare','2026-11-07 13:41:15',None)]
faults=pd.DataFrame(F,columns=['machine','fault','start_ts','end_ts'])
faults['start_ts']=pd.to_datetime(faults.start_ts); faults['end_ts']=pd.to_datetime(faults.end_ts)
faults['minutes']=((faults.end_ts.fillna(pd.Timestamp(NOW))-faults.start_ts).dt.total_seconds())/60
notes=pd.DataFrame([('Char Station 2','T. Nguyen','Burner B igniter sparking weak on Char Station 2. Maintenance work order opened.',pd.Timestamp('2026-11-07 05:52:00')),
                    (None,'T. Nguyen','Hoop stock for 26" heads running low; 2 pallets left.',pd.Timestamp('2026-11-07 05:55:00')),
                    ('Hoop Driver 1','J. Ruiz','Low air twice on Hoop Driver 1. Compressor tech called.',pd.Timestamp('2026-11-07 14:06:12'))],columns=['machine','author','note','created_ts'])
def rs(q,c,params=None):
    if 'dim_machine' in q: return counts.copy()
    if 'fault_log' in q: return faults.copy()
    return notes.copy()
pd.read_sql=rs
g={};outs={}
for n in ['P5','P6','P7','P14','PULL','P8','P9','P10','P11','P12','P13','P15']:
    buf=io.StringIO()
    with contextlib.redirect_stdout(buf): exec(globals()[n],g)
    outs[n]=buf.getvalue().rstrip(); print('=====',n); print(outs[n])
outs['page']=g['page']
json.dump(outs,open('outs4.json','w'))
print(log)
