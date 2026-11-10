"""SQL Server side of the DAX lane's checks.

  python3 sql.py export          rebuild PlantDB, write plantdb.json (the snapshot the DAX model reads)
  python3 sql.py twins < in.json run each lesson's SQL twin, print {title: [[key, v1, v2, ...], ...]}

PlantDB is rebuilt from the canonical lessons by foundations/sql_exec.py --reset, then the OEE
track's v_hourly_barrels view is created from that lesson's own code. Needs BC_SQL_PASSWORD and
the SQL Server container, like the other SQL tools.
"""
import datetime
import decimal
import json
import os
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE.parent / "foundations"))
os.environ.setdefault("BC_SQL_PASSWORD", "")


def lesson_code(track_file, track_id, title):
    js = ("const fs=require('fs'),vm=require('vm'),c={};c.BC={addLanguage(){},addGlossary(){},addLane(){},addTrack(t){c.t=t}};"
          "vm.createContext(c);vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),c);"
          "console.log(JSON.stringify(c.t.lessons.find(l=>l.t===process.argv[2]).code))")
    out = subprocess.run(["node", "-e", js, str(ROOT / "site/data/tracks" / track_file), title], capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def fresh_db():
    subprocess.run([sys.executable, str(HERE.parent / "foundations/sql_exec.py"), "--reset"], check=True, capture_output=True)
    import sql_exec  # noqa: E402  (its connect() reads the same environment)
    conn = sql_exec.connect("PlantDB")
    conn.cursor().execute(lesson_code("03-oee.js", "t-oee", "Hourly barrels view"))
    return conn


def plain(v):
    if isinstance(v, decimal.Decimal):
        return float(v)
    if isinstance(v, datetime.datetime):
        return v.strftime("%Y-%m-%d %H:%M:%S")
    return v


TABLES = {
    "dim_machine": "SELECT machine, area, ideal_rate_hr, margin_per_barrel FROM dim_machine ORDER BY machine",
    "fault_log": "SELECT fault_id, machine, fault, start_ts, end_ts FROM fault_log ORDER BY fault_id",
    "v_hourly_barrels": "SELECT machine, ts, made_this_hour FROM v_hourly_barrels ORDER BY machine, ts",
    "reject_log": "SELECT reject_id, machine, reason, qty, ts FROM reject_log ORDER BY reject_id",
}


def export():
    conn = fresh_db()
    cur = conn.cursor()
    snap = {}
    for name, q in TABLES.items():
        cur.execute(q)
        cols = [d[0] for d in cur.description]
        snap[name] = {"columns": cols, "rows": [[plain(v) for v in r] for r in cur.fetchall()]}
    path = HERE / "plantdb.json"
    text = "{\n" + ",\n".join(
        f' "{n}": {{"columns": {json.dumps(t["columns"])}, "rows": [\n' + ",\n".join("  " + json.dumps(r) for r in t["rows"]) + "\n ]}"
        for n, t in snap.items()) + "\n}\n"
    path.write_text(text)
    print(f"wrote {path.relative_to(ROOT)}: " + ", ".join(f"{n} {len(t['rows'])} rows" for n, t in snap.items()))


def twins():
    wanted = json.load(sys.stdin)
    conn = fresh_db()
    cur = conn.cursor()
    out = {}
    for title, q in wanted.items():
        cur.execute(q)
        out[title] = [[plain(v) for v in r] for r in cur.fetchall()]
    print(json.dumps(out))


if __name__ == "__main__":
    {"export": export, "twins": twins}[sys.argv[1]]()
