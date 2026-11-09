# Runs one T-SQL lesson (read from stdin) against a fresh copy of the canonical sample database
# on a real SQL Server, and prints what it returns: one aligned text table per result set, and
# "(n rows affected)" for INSERT/UPDATE/DELETE. Called by run.mjs for the SQL lane.
#
# The sample database is built from the lessons themselves, so it cannot drift from them:
#   - tables: the CREATE TABLE steps of DB Pulls & Analytics (fault_log, count_log, dim_machine,
#     including its INSERT of the three machines) and Shift Handoff (handoff_note)
#   - fault_log rows: the 47 seeded faults from tools/output-checks/track2-db/gen.py
#   - handoff_note rows: the two open notes the Shift Handoff track starts with
#   - count_log rows: hourly counter readings from seeded_counts() below
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
DB = "PlantDB"  # the name the Python and C# lessons connect to, so error messages read naturally

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


def seeded_counts():
    """Hourly count_log readings for the three machines, 2026-10-31 06:00 to 2026-11-07 10:00.

    barrels is the PLC's shift counter at the reading, as the DB Pulls track defines it. The counter
    resets at 06:00, 14:00 and 22:00, just after the reading on the hour, so a shift-change reading is
    the ending shift's total and the next reading starts again from that hour's output.
      - The week 2026-10-31 06:00 to 2026-11-07 06:00 adds up to the OEE Loss Report's counts:
        Char Station 2 6,980, Conveyor 3 7,120, Hoop Driver 1 6,410 (through v_hourly_barrels).
      - Shift A on 2026-11-07 runs to the DB track's "now", 10:15: Conveyor 3 reads 47, 94, 141, 184,
        the 47 and 94 the PLC & HMI track's hourly snapshot logs.
    The hour-by-hour split is illustrative: an even share of the week with a small repeating wobble."""
    week = {"Char Station 2": 6980, "Conveyor 3": 7120, "Hoop Driver 1": 6410}
    shift_a = {"Char Station 2": [40, 40, 41, 40], "Conveyor 3": [47, 47, 47, 43], "Hoop Driver 1": [37, 35, 36, 35]}
    wobble = [2, -1, 1, -2, 0, 1, -1, 0]  # sums to 0 over each 8-hour shift
    start = datetime.datetime(2026, 10, 31, 6)
    rows = []
    for machine, total in week.items():
        base, extra = divmod(total, 168)
        made = [base + wobble[h % 8] + (1 if h < extra else 0) for h in range(168)] + shift_a[machine]
        assert sum(made[:168]) == total
        count = base * 8  # 06:00 on 10-31: shift C's total, before the reset
        rows.append((machine, count, 1, start))
        for h, n in enumerate(made):
            t = start + datetime.timedelta(hours=h + 1)
            if (t.hour - 1) % 24 in (6, 14, 22):
                count = 0  # the counter reset just after the previous reading
            count += n
            rows.append((machine, count, 1, t))
    return rows


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


# --reset: only build the fresh sample database, for tools that connect to it themselves (Ignition).
RESET_ONLY = "--reset" in sys.argv
lesson = "" if RESET_ONLY else sys.stdin.read()
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
    cur.executemany("INSERT INTO count_log (machine, barrels, state, ts) VALUES (%s, %s, %s, %s)", seeded_counts())
    cur.executemany(
        "INSERT INTO handoff_note (shift_date, shift, machine, author, note, created_ts) VALUES (%s, %s, %s, %s, %s, %s)",
        [(datetime.date(2026, 11, 6), "C", "Char Station 2", "T. Nguyen", "Burner B igniter sparking weak on Char Station 2. Maintenance work order opened.", datetime.datetime(2026, 11, 7, 5, 52)),
         (datetime.date(2026, 11, 6), "C", None, "T. Nguyen", 'Hoop stock for 26" heads running low; 2 pallets left.', datetime.datetime(2026, 11, 7, 5, 55))])
if RESET_ONLY:
    conn.close()
    print("PlantDB reset")
    sys.exit(0)

# Run the lesson. GO on its own line separates batches, as in SSMS and sqlcmd. A batch that
# declares variables, uses TRY/CATCH or creates a procedure, function, view or trigger runs whole,
# so its variables stay in scope and its body stays intact. Any other batch runs one statement
# at a time, so each INSERT, UPDATE or DELETE can report its row count.
WHOLE = re.compile(r"^\s*(DECLARE\b|BEGIN\s+TRY\b|CREATE\s+(PROC|PROCEDURE|FUNCTION|VIEW|TRIGGER)\b)", re.I | re.M)
blocks = []
try:
    batches = []
    for batch in re.split(r"^\s*GO\s*$", lesson, flags=re.I | re.M):
        if batch.strip():
            batches += [batch.strip()] if WHOLE.search(batch) else statements(batch)
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
