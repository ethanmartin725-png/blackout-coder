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
#   - reject_log rows: rejects from seeded_rejects() below (table from OEE Loss Report's CREATE step)
#   - purchasing tables (supplier, item, contract_price, po_line, invoice_line) for the Procurement
#     Spend track: PURCHASING_DDL and seeded_purchasing() below, all illustrative
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
for(const f of ['02-db','03-oee','04-handoff'])vm.runInContext(fs.readFileSync(process.argv[1]+'/site/data/tracks/'+f+'.js','utf8'),c);
const pick=(id,t)=>{const l=c.T[id].lessons.find(x=>x.t===t);if(!l)throw new Error('missing '+t);return l.code};
console.log(JSON.stringify([pick('t-db','Create fault_log'),pick('t-db','Create count_log'),pick('t-db','Machine dimension'),pick('t-oee','Create reject_log'),pick('t-handoff','Create handoff_note')]));
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


def seeded_rejects():
    """reject_log rows: barrels scrapped or sent to rework, by reason.

    - The week 2026-10-31 06:00 to 2026-11-07 06:00 adds up to the OEE Loss Report's rejects:
      Char Station 2 211, Conveyor 3 142, Hoop Driver 1 96 (Hoop Driver 1's 6,314 good of 6,410).
    - It includes the two sample rows the OEE track's CREATE step shows.
    - Shift A on 2026-11-07 matches shift_log.csv: Conveyor 3 5 (347 good of 352) and Hoop Driver 1 3
      (271 of 274). Char Station 2's row there is the known bad one (310 good of 301), so it gets none.
    Reasons, times and the split into entries are illustrative: one entry per machine per shift,
    logged 3 h 25 min into the shift, the week's total spread as evenly as whole barrels allow."""
    reasons = {"Char Station 2": ["Bad char", "Bad char", "Scorched head"],
               "Conveyor 3": ["Leaker", "Damaged stave", "Leaker"],
               "Hoop Driver 1": ["Loose hoop", "Leaker", "Loose hoop"]}
    week = {"Char Station 2": 211, "Conveyor 3": 142, "Hoop Driver 1": 96}
    samples = [("Char Station 2", "Bad char", 4, datetime.datetime(2026, 11, 2, 23, 18, 5)),
               ("Conveyor 3", "Leaker", 2, datetime.datetime(2026, 11, 3, 9, 41, 50))]
    start = datetime.datetime(2026, 10, 31, 6)
    rows = list(samples)
    for machine, total in week.items():
        left = total - sum(q for m, _, q, _ in samples if m == machine)
        base, extra = divmod(left, 21)  # 21 shifts in the week
        for k in range(21):
            qty = base + (1 if k < extra else 0)
            if qty:
                ts = start + datetime.timedelta(hours=8 * k, minutes=205)
                rows.append((machine, reasons[machine][k % 3], qty, ts))
    rows += [("Conveyor 3", "Leaker", 5, datetime.datetime(2026, 11, 7, 9, 40)),
             ("Hoop Driver 1", "Loose hoop", 3, datetime.datetime(2026, 11, 7, 9, 40))]
    for machine, total in week.items():
        assert sum(q for m, _, q, t in rows if m == machine and start <= t < datetime.datetime(2026, 11, 7, 6)) == total
    return sorted(rows, key=lambda r: r[3])


# Purchasing tables for the Procurement Spend track. Not created by any lesson, so defined here.
# Everything in them is illustrative, and every supplier name is fictional.
PURCHASING_DDL = """
CREATE TABLE supplier (supplier_id VARCHAR(4) PRIMARY KEY, name VARCHAR(50) NOT NULL);
CREATE TABLE item (item_no VARCHAR(8) PRIMARY KEY, description VARCHAR(60) NOT NULL, category VARCHAR(20) NOT NULL, uom VARCHAR(8) NOT NULL);
CREATE TABLE contract_price (item_no VARCHAR(8) NOT NULL, supplier_id VARCHAR(4) NOT NULL, price DECIMAL(10,4) NOT NULL, valid_from DATE NOT NULL, valid_to DATE NOT NULL);
CREATE TABLE po_line (po_no INT NOT NULL, line INT NOT NULL, item_no VARCHAR(8) NOT NULL, supplier_id VARCHAR(4) NOT NULL, qty INT NOT NULL, unit_price DECIMAL(10,4) NOT NULL, po_date DATE NOT NULL, PRIMARY KEY (po_no, line));
CREATE TABLE invoice_line (invoice_no INT NOT NULL, po_no INT NOT NULL, line INT NOT NULL, qty INT NOT NULL, unit_price DECIMAL(10,4) NOT NULL, invoice_date DATE NOT NULL);
"""


def seeded_purchasing():
    """Rows for the purchasing tables: (table, rows). Illustrative, built by rule, not at random.

    - Weekly POs every Thursday, 2026-10-01 to 2026-11-05, invoiced two days later. The PO of
      2026-10-29 is the only one invoiced in the OEE week (2026-10-31 to 2026-11-06): 28,000 53-gal
      hoops and 7,000 30-gal hoops, against the week's use of 28,200 and 6,840 (Hoop Driver 1's
      6,410 barrels, an illustrative mix of 4,700 53-gal and 1,710 30-gal, at 6 and 4 hoops).
    - Planted findings the track must find: Ironbend's 53-gal hoops ordered at $1.55 against a $1.48
      contract on 10-22 and 10-29; photo eyes at $104 against $96 on 10-29; two buys with no
      contract (30-gal staves from Hollow Creek on 10-15, quick-release clamps on 10-22); an invoice
      for 36,000 staves against a PO for 35,000 (10-15); 30-gal hoops invoiced at $1.08 against a PO at
      $1.05 (10-22); propane ordered on 11-05 at the old $2.20, invoiced at the new contract $2.35."""
    d = datetime.date
    suppliers = [("S1", "Ridgeline Stave Co."), ("S2", "Hollow Creek Timber"), ("S3", "Tri-County Hoop Steel"),
                 ("S4", "Ironbend Hoop & Wire"), ("S5", "Eastfork Propane"), ("S6", "Millbrook Industrial Supply")]
    items = [("STV-53", "White oak stave, 53-gal", "Staves", "each"), ("STV-30", "White oak stave, 30-gal", "Staves", "each"),
             ("HP-53", "Steel hoop, 53-gal", "Hoops", "each"), ("HP-30", "Steel hoop, 30-gal", "Hoops", "each"),
             ("LPG", "Propane for the char booth", "Char gas", "gal"), ("GD-30", "30-gal side guide set", "MRO parts", "each"),
             ("EYE-PE", "Photo eye sensor", "MRO parts", "each"), ("QR-CL", "Quick-release guide clamp", "MRO parts", "each")]
    year = (d(2026, 1, 1), d(2026, 12, 31))
    contracts = [("STV-53", "S1", 2.85, *year), ("STV-53", "S2", 2.95, *year), ("STV-30", "S1", 2.10, *year),
                 ("HP-53", "S3", 1.42, *year), ("HP-53", "S4", 1.48, *year), ("HP-30", "S3", 1.05, *year),
                 ("LPG", "S5", 2.20, d(2026, 1, 1), d(2026, 10, 31)), ("LPG", "S5", 2.35, d(2026, 11, 1), d(2026, 12, 31)),
                 ("GD-30", "S6", 185.00, *year), ("EYE-PE", "S6", 96.00, *year)]
    po, inv = [], []
    po_no = 4100
    for week in range(6):
        when = d(2026, 10, 1) + datetime.timedelta(days=7 * week)
        lines = [("STV-53", "S1", 120000, 2.85), ("STV-53", "S2", 35000, 2.95), ("STV-30", "S1", 38000, 2.10),
                 ("HP-53", "S3", 24000, 1.42), ("HP-53", "S4", 4000, 1.55 if when in (d(2026, 10, 22), d(2026, 10, 29)) else 1.48),
                 ("HP-30", "S3", 7000, 1.05), ("LPG", "S5", 3200, 2.20)]
        extra = {d(2026, 10, 8): [("GD-30", "S6", 2, 185.00)],
                 d(2026, 10, 15): [("STV-30", "S2", 6000, 2.25), ("EYE-PE", "S6", 3, 96.00)],
                 d(2026, 10, 22): [("QR-CL", "S6", 8, 42.00)],
                 d(2026, 10, 29): [("EYE-PE", "S6", 2, 104.00)]}.get(when, [])
        for supplier in ["S1", "S2", "S3", "S4", "S5", "S6"]:
            mine = [x for x in lines + extra if x[1] == supplier]
            if not mine:
                continue
            po_no += 1
            for n, (item, sup, qty, price) in enumerate(mine, start=1):
                po.append((po_no, n, item, sup, qty, price, when))
                i_qty, i_price = qty, price
                if when == d(2026, 10, 15) and item == "STV-53" and sup == "S2":
                    i_qty = 36000
                if when == d(2026, 10, 22) and item == "HP-30":
                    i_price = 1.08
                if when == d(2026, 11, 5) and item == "LPG":
                    i_price = 2.35
                inv.append((po_no + 50000, po_no, n, i_qty, i_price, when + datetime.timedelta(days=2)))
    return [("supplier", suppliers), ("item", items), ("contract_price", contracts), ("po_line", po), ("invoice_line", inv)]


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
    cur.executemany("INSERT INTO reject_log (machine, reason, qty, ts) VALUES (%s, %s, %s, %s)", seeded_rejects())
    for s in statements(PURCHASING_DDL):
        cur.execute(s)
    for name, rows in seeded_purchasing():
        cur.executemany(f"INSERT INTO {name} VALUES ({', '.join(['%s'] * len(rows[0]))})", rows)
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

# BC_SQL_AFTER: a check query run after the lesson in the same database (track tools use it to show
# what a CREATE did). Its text is printed above its result, so the output says what was run.
# A lesson that returned nothing reports "Commands completed successfully.", as SSMS does.
after = os.environ.get("BC_SQL_AFTER", "").strip()
if after:
    if not blocks:
        blocks.append("Commands completed successfully.")
    try:
        cur.execute(after)
        blocks.append(after + "\n" + table(cur))
    except pymssql.Error as e:
        print(f"SQL error in the check query: {e}", file=sys.stderr)
        sys.exit(1)
conn.close()
print("\n\n".join(blocks))
