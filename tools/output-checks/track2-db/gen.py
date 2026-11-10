# Generates the sample fault week used by DB Pulls & Analytics (seeded, so it is the same every run).
# Run: python gen.py  then  python run.py
import random, pandas as pd, numpy as np
from datetime import datetime, timedelta
random.seed(27)
NOW=datetime(2026,11,7,10,15,0)
start=NOW-timedelta(days=7)
machines={'Conveyor 3':('Assembly',60),'Hoop Driver 1':('Assembly',55),'Char Station 2':('Finishing',50)}
MARGIN=42.50
types={'Jam':(2,6),'Hoop misfeed':(3,9),'Char flare':(5,15),'Low air':(10,30),'E-stop':(1,4)}
freq={'Conveyor 3':{'Jam':14,'Low air':2,'E-stop':3},
      'Hoop Driver 1':{'Hoop misfeed':11,'Jam':3,'Low air':2,'E-stop':1},
      'Char Station 2':{'Char flare':8,'Low air':1,'E-stop':1}}
rows=[]
for m,fs in freq.items():
    for f,n in fs.items():
        for _ in range(n):
            t=start+timedelta(seconds=random.randint(0,7*86400-3600))
            d=random.uniform(*types[f])
            rows.append([m,f,t.replace(microsecond=0),(t+timedelta(minutes=d)).replace(microsecond=0)])
df=pd.DataFrame(rows,columns=['machine','fault','start_ts','end_ts']).sort_values('start_ts').reset_index(drop=True)
# A machine cannot start a new stop while it is still stopped: a fault that would begin before the
# same machine's previous fault ends is moved to start when that one ends, keeping its length, so no
# downtime total changes. Only fault 21 (Hoop Driver 1, 2026-11-03) moves: it would otherwise start
# 11 s before fault 20 ends.
last_end={}
for i,r in df.iterrows():
    if r.machine in last_end and r.start_ts<last_end[r.machine]:
        shift=last_end[r.machine]-r.start_ts
        df.at[i,'start_ts']=r.start_ts+shift; df.at[i,'end_ts']=r.end_ts+shift
    last_end[r.machine]=max(last_end.get(r.machine,df.at[i,'end_ts']),df.at[i,'end_ts'])
# one open fault right now on Hoop Driver 1
df=pd.concat([df,pd.DataFrame([['Hoop Driver 1','Hoop misfeed',datetime(2026,11,7,10,9,40),pd.NaT]],columns=df.columns)],ignore_index=True)
df['start_ts']=pd.to_datetime(df['start_ts']);df['end_ts']=pd.to_datetime(df['end_ts'])
df['minutes']=((df['end_ts'].fillna(NOW)-df['start_ts']).dt.total_seconds()//1)/60.0
df.to_pickle('faults.pkl')
print(len(df))
pd.set_option('display.width',200)
print('--- open'); print(df[df.end_ts.isna()][['machine','fault','start_ts']])
print('--- durations head'); print(df[['machine','fault','start_ts','end_ts','minutes']].head(4))
print('--- pareto')
p=df.groupby('fault').agg(events=('minutes','count'),minutes=('minutes','sum')).sort_values('minutes',ascending=False)
print(p.round(1))
p['cum_pct']=p['minutes'].cumsum()/p['minutes'].sum()*100
print(p.round(1))
h=df['start_ts'].dt.hour
df['shift']=np.where(h.between(6,13),'A',np.where(h.between(14,21),'B','C'))
print('--- shift'); print(df.groupby('shift').agg(events=('minutes','count'),minutes=('minutes','sum')).round(1))
print('--- area $')
g=df.groupby('machine')['minutes'].sum()/60
for m,v in g.sort_values(ascending=False).items():
    a,r=machines[m]; print(a,m,round(v,2),round(v*r*MARGIN,2))
piv=df.pivot_table(index='fault',columns='shift',values='minutes',aggfunc='sum',fill_value=0)
print('--- pivot'); print(piv.round(1))
pm=df.groupby('machine').agg(faults=('minutes','count'),down_min=('minutes','sum'))
pm['mttr_min']=pm.down_min/pm.faults
sched=7*3*8*60
pm['mtbf_hr']=(sched-pm.down_min)/pm.faults/60
print('--- reliability'); print(pm.round(1))
pp=p[['minutes','cum_pct']].copy(); pp['vital_few']=pp['cum_pct'].shift(fill_value=0)<80
print('--- vital'); print(pp.round(1))
