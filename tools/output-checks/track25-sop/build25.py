# Builds site/data/tracks/25-sop.js from steps25.py and lessons25.py. SQL steps run one at a time
# through foundations/sql_exec.py on a fresh PlantDB (demand_plan included); a step that reads
# v_hourly_barrels gets the OEE track's view first. Python steps run in sequence, as one file, with the
# same view and the Savings Tracker's savings_actuals.csv beside them. Checks: the first step's CREATE
# equals DEMAND_DDL in sql_exec.py; theoretical capacity times OEE is each machine's good barrels;
# Hoop Driver 1's good barrels are 6,314; demand averages the Takt track's 1,000 a day; and the
# bottleneck's no-stop rate is the Takt track's 926.4 barrels a day.
# Needs BC_SQL_PASSWORD and the SQL Server container. Do not edit the JS file by hand.
#   python3 build25.py            write the track
#   python3 build25.py --check    report a difference, change nothing
import shutil, contextlib, io, json, os, re, subprocess, sys, tempfile, warnings
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "lib" / "pydb"))
sys.path.insert(0, str(HERE.parent / "foundations"))
import plantdb
from steps25 import CODE, LANG

def ddl():
    src = (HERE.parent / "foundations/sql_exec.py").read_text()
    return re.search(r'DEMAND_DDL = """(.*?)"""', src, re.S).group(1)

if CODE["Create demand_plan"] != ddl():
    sys.exit("Create demand_plan differs from DEMAND_DDL in sql_exec.py: keep them the same")

def lesson_code(track_file, title):
    js = ("const fs=require('fs'),vm=require('vm'),c={};c.BC={addLanguage(){},addGlossary(){},addLane(){},addTrack(t){c.t=t}};"
          "vm.createContext(c);vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),c);"
          "console.log(JSON.stringify(c.t.lessons.find(l=>l.t===process.argv[2]).code))")
    return json.loads(subprocess.run(["node", "-e", js, str(ROOT / "site/data/tracks" / track_file), title], capture_output=True, text=True, check=True).stdout)

# A CREATE prints nothing, so its output is a check query on what it made, printed above its result.
AFTER = {"Create demand_plan": "SELECT COLUMN_NAME AS column_name, DATA_TYPE AS type, IS_NULLABLE AS nullable\n"
         "FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'demand_plan' ORDER BY ORDINAL_POSITION;"}
OEE_VIEW = lesson_code("03-oee.js", "Hourly barrels view")
outs = {}
for title, lang in LANG.items():
    if lang == "sql":
        src = (OEE_VIEW + "\nGO\n" + CODE[title]) if "v_hourly_barrels" in CODE[title] else CODE[title]
        r = subprocess.run([sys.executable, str(HERE.parent / "foundations/sql_exec.py")], input=src, capture_output=True, text=True,
                           env={**os.environ, "BC_SQL_AFTER": AFTER.get(title, "")})
        if r.returncode:
            sys.exit(f"{title}: {r.stderr}")
        outs[title] = r.stdout.rstrip()

plantdb.reset([OEE_VIEW])
plantdb.use_real_database()
warnings.filterwarnings("ignore", message="pandas only supports SQLAlchemy")
g = {}
with tempfile.TemporaryDirectory() as d:
    os.chdir(d)  # the workbook step saves an .xlsx; the projects step reads the Savings Tracker's actuals
    shutil.copy(HERE.parent / "track14-savings/savings_actuals.csv", d)
    for title, lang in LANG.items():
        if lang != "python":
            continue
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            exec(CODE[title], g)
        outs[title] = buf.getvalue().rstrip()

# Cross-checks.
cap = g["cap"]
if ((cap["theoretical"] * cap["oee"] - cap["good"]).abs() > 1e-6).any():
    sys.exit("Theoretical capacity times OEE is not the good barrels")
if cap.loc["Hoop Driver 1", "good"] != 6314:
    sys.exit(f"Hoop Driver 1's good barrels are {cap.loc['Hoop Driver 1', 'good']}, not 6,314")
takt = (HERE.parent / "track15-takt/steps15.py").read_text()
per_day = int(re.search(r"DEMAND_PER_DAY = (\d+)", takt).group(1))
if g["plan"]["demand"].mean() != per_day * 7:
    sys.exit(f"Demand averages {g['plan']['demand'].mean()}, not the Takt track's {per_day} a day")
takt_out = (ROOT / "site/data/tracks/15-takt.js").read_text()
bn = float(re.search(r"Line output at the bottleneck: ([\d.]+) barrels a day", takt_out).group(1))
if round(cap.loc["Hoop Driver 1", "no_stop_gross"] / 7, 1) != bn:
    sys.exit(f"No-stop rate {cap.loc['Hoop Driver 1', 'no_stop_gross'] / 7:.1f} a day is not the Takt track's {bn}")

if "--outs" in sys.argv:
    for t, o in outs.items():
        print(f"===== {t}\n{o}")
    sys.exit(0)
print("Cross-checks: CREATE matches the seed's DDL; capacity x OEE = good; 6,314 good; demand is the Takt track's; no-stop rate matches Takt")

from lessons25 import TRACK, LESSONS
assert [t for t, *_ in LESSONS] == list(CODE), "lessons25.py and steps25.py list different steps"

def whole(k, code):
    pre = r"(?<!\w)" if re.match(r"\w", k) else ""
    post = r"(?!\w)" if re.search(r"\w$", k) else ""
    return re.search(pre + re.escape(k) + post, code) is not None

tpl = lambda x: "`" + x.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${") + "`"
js = lambda v: json.dumps(v, ensure_ascii=False)
lines = ["// Project track 25: S&OP / Capacity (SQL and Python on the plant database)",
         "// Generated by tools/output-checks/track25-sop/build25.py from steps25.py and lessons25.py. Do not edit by hand.",
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
target = ROOT / "site/data/tracks/25-sop.js"
if "--check" in sys.argv:
    same = target.exists() and target.read_text() == text
    print("25-sop.js is current" if same else "25-sop.js is stale: run python3 build25.py")
    sys.exit(0 if same else 1)
target.write_text(text)
print(f"wrote {target.relative_to(ROOT)}: {len(LESSONS)} steps")
