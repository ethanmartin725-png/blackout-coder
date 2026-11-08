# Runs one T-SQL lesson (read from stdin) against a fresh copy of the canonical sample database
# on a real SQL Server, and prints what it returns: one aligned text table per result set, and
# "(n rows affected)" for INSERT/UPDATE/DELETE. Called by run.mjs for the SQL lane.
#
# The sample database is built from the lessons themselves, so it cannot drift from them:
#   - tables: the CREATE TABLE steps of DB Pulls & Analytics (fault_log, count_log, dim_machine,
#     including its INSERT of the three machines) and Shift Handoff (handoff_note)
#   - fault_log rows: the 47 seeded faults from tools/output-checks/track2-db/gen.py
#   - handoff_note rows: the two open notes the Shift Handoff track starts with
#   - count_log: no rows (no Foundations lesson reads it yet)
# A lesson that itself creates a table runs against an empty database instead.
#
# Server: a local SQL Server 2022, e.g.
#   docker run -d --name bc-sql -e ACCEPT_EULA=Y -e MSSQL_SA_PASSWORD="$BC_SQL_PASSWORD" -p 1433:1433 \
#     mcr.microsoft.com/mssql/server:2022-latest
# Settings: BC_SQL_PASSWORD (required), BC_SQL_SERVER (default localhost), BC_SQL_PORT (1433), BC_SQL_USER (sa).
# Needs: pip install pymssql pandas.  Exit code 3 means the server or driver is not available.
import datetime, decimal, json, os, re, subprocess, sys, tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
DB = "bc_lesson"

try:
    import pymssql
except ImportError:
    print("pymssql is not installed", file=sys.stderr)
    sys.exit(3)
if not os.environ.get("BC_SQL_PASSWORD"):
    print("BC_SQL_PASSWORD is not set", file=sys.stderr)
    sys.exit(3)


def connect(database="master"):
    try:
        return pymssql.connect(server=os.environ.get("BC_SQL_SERVER", "localhost"), port=int(os.environ.get("BC_SQL_PORT", "1433")),
                               user=os.environ.get("BC_SQL_USER", "sa"), password=os.environ["BC_SQL_PASSWORD"],
                               database=database, autocommit=True, login_timeout=5)
    except pymssql.Error as e:
        print(f"cannot reach SQL Server: {e}", file=sys.stderr)
        sys.exit(3)


def canonical_ddl():
    """CREATE TABLE code from the track lessons, by title."""
    js = r"""
const fs=require('fs'),vm=require('vm'),c={T:{}};
c.BC={addLanguage(){},addLane(){},addTrack(t){c.T[t.id]=t}};vm.createContext(c);
for(const f of ['02-db','04-handoff'])vm.runInContext(fs.readFileSync(process.argv[1]+'/site/data/tracks/'+f+'.js','utf8'),c);
const pick=(id,t)=>{const l=c.T[id].lessons.find(x=>x.t===t);if(!l)throw new Error('missing '+t);return l.code};
console.log(JSON.stringify([pick('t-db','Create fault_log'),pick('t-db','Create count_log'),pick('t-db','Machine dimension'),pick('t-handoff','Create handoff_note')]));
"""
    r = subprocess.run(["node", "-e", js, str(ROOT)], capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def seeded_faults():
    """The 47 faults from track2-db/gen.py, oldest first."""
    import pandas as pd
    with tempfile.TemporaryDirectory() as d:
        src = (ROOT / "tools/output-checks/track2-db/gen.py").read_text()
        subprocess.run([sys.executable, "-c", src], cwd=d, capture_output=True, check=True)
        df = pd.read_pickle(Path(d) / "faults.pkl").sort_values("start_ts")
    return [(r.machine, r.fault, r.start_ts.to_pydatetime(), None if pd.isna(r.end_ts) else r.end_ts.to_pydatetime()) for r in df.itertuples()]


def statements(sql):
    """Split on a semicolon at the end of a line. Fine for these lessons; not a general SQL parser."""
    return [s.strip() for s in re.split(r";[ \t]*(?:\n|$)", sql) if s.strip()]


def fmt(v):
    if v is None:
        return "NULL"
    if isinstance(v, datetime.datetime):
        return v.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(v, datetime.date):
        return v.strftime("%Y-%m-%d")
    if isinstance(v, decimal.Decimal):
        return format(v, "f")
    return str(v)


def table(cur):
    cols = [d[0] for d in cur.description]
    rows = [[fmt(v) for v in r] for r in cur.fetchall()]
    w = [max([len(c)] + [len(r[i]) for r in rows]) for i, c in enumerate(cols)]
    line = lambda vals: "  ".join(v.ljust(w[i]) for i, v in enumerate(vals)).rstrip()
    return "\n".join([line(cols)] + [line(r) for r in rows])


lesson = sys.stdin.read()
creates_table = re.match(r"\s*CREATE\s+TABLE", lesson, re.I) is not None

# Fresh database for every lesson
m = connect()
c = m.cursor()
c.execute(f"IF DB_ID('{DB}') IS NOT NULL BEGIN ALTER DATABASE {DB} SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE {DB}; END")
c.execute(f"CREATE DATABASE {DB}")
m.close()
conn = connect(DB)
cur = conn.cursor()
if not creates_table:
    for ddl in canonical_ddl():
        for s in statements(ddl):
            cur.execute(s)
    cur.executemany("INSERT INTO fault_log (machine, fault, start_ts, end_ts) VALUES (%s, %s, %s, %s)", seeded_faults())
    cur.executemany(
        "INSERT INTO handoff_note (shift_date, shift, machine, author, note, created_ts) VALUES (%s, %s, %s, %s, %s, %s)",
        [(datetime.date(2026, 11, 6), "C", "Char Station 2", "T. Nguyen", "Burner B igniter sparking weak on Char Station 2. Maintenance work order opened.", datetime.datetime(2026, 11, 7, 5, 52)),
         (datetime.date(2026, 11, 6), "C", None, "T. Nguyen", 'Hoop stock for 26" heads running low; 2 pallets left.', datetime.datetime(2026, 11, 7, 5, 55))])

# Run the lesson. A script that declares variables runs as one batch so they stay in scope;
# otherwise each statement runs on its own so its row count can be reported.
blocks = []
try:
    batches = [lesson] if re.search(r"^\s*DECLARE\b", lesson, re.I | re.M) else statements(lesson)
    for b in batches:
        cur.execute(b)
        while True:
            if cur.description:
                blocks.append(table(cur))
            elif not creates_table and cur.rowcount >= 0 and re.match(r"\s*(INSERT|UPDATE|DELETE|MERGE)\b", b, re.I):
                blocks.append(f"({cur.rowcount} row{'' if cur.rowcount == 1 else 's'} affected)")
            if not cur.nextset():
                break
except pymssql.Error as e:
    print(f"SQL error: {e}", file=sys.stderr)
    sys.exit(1)
conn.close()
print("\n\n".join(blocks))
