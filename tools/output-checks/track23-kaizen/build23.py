# Builds site/data/tracks/23-kaizen.js from steps23.py and lessons23.py. SQL steps run one at a time
# through foundations/sql_exec.py on a fresh PlantDB (misfeed_event included); Python steps run in
# sequence, as one file. Checks: the first step's CREATE equals MISFEED_DDL in sql_exec.py; the
# baseline rows are fault_log's OEE-week misfeeds; the after weeks' minutes are the Savings Tracker's
# P2 actuals (savings_actuals.csv); the average weekly saving is the Savings Tracker's P2 figure.
# Needs BC_SQL_PASSWORD and the SQL Server container. Do not edit the JS file by hand.
#   python3 build23.py            write the track
#   python3 build23.py --check    report a difference, change nothing
import contextlib, io, json, os, re, subprocess, sys, tempfile, warnings
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "lib" / "pydb"))
sys.path.insert(0, str(HERE.parent / "foundations"))
import plantdb
from steps23 import CODE, LANG

def ddl():
    src = (HERE.parent / "foundations/sql_exec.py").read_text()
    return re.search(r'MISFEED_DDL = """(.*?)"""', src, re.S).group(1)

if CODE["Create misfeed_event"] != ddl():
    sys.exit("Create misfeed_event differs from MISFEED_DDL in sql_exec.py: keep them the same")

def lesson_code(track_file, title):
    js = ("const fs=require('fs'),vm=require('vm'),c={};c.BC={addLanguage(){},addGlossary(){},addLane(){},addTrack(t){c.t=t}};"
          "vm.createContext(c);vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),c);"
          "console.log(JSON.stringify(c.t.lessons.find(l=>l.t===process.argv[2]).code))")
    return json.loads(subprocess.run(["node", "-e", js, str(ROOT / "site/data/tracks" / track_file), title], capture_output=True, text=True, check=True).stdout)

# A CREATE prints nothing, so its output is a check query on what it made, printed above its result.
AFTER = {"Create misfeed_event": "SELECT COLUMN_NAME AS column_name, DATA_TYPE AS type, IS_NULLABLE AS nullable\n"
         "FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'misfeed_event' ORDER BY ORDINAL_POSITION;"}
outs = {}
for title, lang in LANG.items():
    if lang == "sql":
        src = CODE[title]
        r = subprocess.run([sys.executable, str(HERE.parent / "foundations/sql_exec.py")], input=src, capture_output=True, text=True,
                           env={**os.environ, "BC_SQL_AFTER": AFTER.get(title, "")})
        if r.returncode:
            sys.exit(f"{title}: {r.stderr}")
        outs[title] = r.stdout.rstrip()

plantdb.reset()
plantdb.use_real_database()
warnings.filterwarnings("ignore", message="pandas only supports SQLAlchemy")
g = {}
with tempfile.TemporaryDirectory() as d:
    os.chdir(d)  # the A3 step saves an .xlsx
    for title, lang in LANG.items():
        if lang != "python":
            continue
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            exec(CODE[title], g)
        outs[title] = buf.getvalue().rstrip()

# Cross-checks on the same database the Python steps used.
import csv
cur = g["conn"].cursor()
cur.execute("""SELECT COUNT(*) FROM fault_log AS f
               FULL JOIN (SELECT * FROM misfeed_event WHERE phase = 'baseline') AS e ON e.fault_id = f.fault_id
               WHERE (f.fault_id IS NULL OR e.event_id IS NULL OR f.start_ts <> e.start_ts OR f.end_ts <> e.end_ts)
                 AND ISNULL(f.machine, 'Hoop Driver 1') = 'Hoop Driver 1' AND ISNULL(f.fault, 'Hoop misfeed') = 'Hoop misfeed'
                 AND ISNULL(f.start_ts, e.start_ts) >= '2026-10-31 06:00' AND ISNULL(f.start_ts, e.start_ts) < '2026-11-07 06:00'""")
if cur.fetchone()[0]:
    sys.exit("Baseline misfeeds do not match fault_log")
p2 = [float(r["actual_min"]) for r in csv.DictReader(open(HERE.parent / "track14-savings/savings_actuals.csv")) if r["project_id"] == "P2"]
if [round(v, 6) for v in g["weekly"].tolist()] != p2:
    sys.exit(f"After weeks {g['weekly'].tolist()} are not P2's actuals {p2}")
sav = (ROOT / "site/data/tracks/14-savings.js").read_text()
m = re.search(r"\nP2\s+([\d.]+)\s+[\d.]+\n", sav)
if not m or float(m.group(1)) != round(g["saved"].mean(), 2):
    sys.exit(f"Average P2 saving {g['saved'].mean():.2f} differs from the Savings Tracker's {m and m.group(1)}")

if "--outs" in sys.argv:
    for t, o in outs.items():
        print(f"===== {t}\n{o}")
    sys.exit(0)
print("Cross-checks: CREATE matches the seed's DDL; baseline is fault_log's misfeeds; after weeks and average saving match the Savings Tracker's P2")

from lessons23 import TRACK, LESSONS
assert [t for t, *_ in LESSONS] == list(CODE), "lessons23.py and steps23.py list different steps"

def whole(k, code):
    pre = r"(?<!\w)" if re.match(r"\w", k) else ""
    post = r"(?!\w)" if re.search(r"\w$", k) else ""
    return re.search(pre + re.escape(k) + post, code) is not None

tpl = lambda x: "`" + x.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${") + "`"
js = lambda v: json.dumps(v, ensure_ascii=False)
lines = ["// Project track 23: Kaizen / A3 (SQL and Python on the plant database)",
         "// Generated by tools/output-checks/track23-kaizen/build23.py from steps23.py and lessons23.py. Do not edit by hand.",
         "BC.addTrack({", f"  id: {js(TRACK['id'])},", f"  name: {js(TRACK['name'])},", f"  sub: {js(TRACK['sub'])},", "  lessons: ["]
for title, goal, about, terms in LESSONS:
    code = CODE[title]
    for k, *_ in terms:
        if k is not None and not whole(k, code):
            sys.exit(f"{title}: term key {k!r} is not in the code")
    lines += ["    {", f"      lang: {js(LANG[title])},", f"      file: {js(TRACK['files'][LANG[title]])},", f"      t: {js(title)},", f"      goal: {js(goal)},",
              f"      code: {tpl(code)},", f"      about: {js(about)},", "      terms: ["]
    lines += [f"        [{'null' if k is None else js(k)}, {js(a)}, {js(b)}]," for k, a, b in terms]
    lines += ["      ],", f"      out: {tpl(outs[title])},", "    },"]
lines += ["  ],", "});", ""]
text = "\n".join(lines)
target = ROOT / "site/data/tracks/23-kaizen.js"
if "--check" in sys.argv:
    same = target.exists() and target.read_text() == text
    print("23-kaizen.js is current" if same else "23-kaizen.js is stale: run python3 build23.py")
    sys.exit(0 if same else 1)
target.write_text(text)
print(f"wrote {target.relative_to(ROOT)}: {len(LESSONS)} steps")
