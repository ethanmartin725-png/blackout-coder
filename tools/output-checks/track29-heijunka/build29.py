# Builds site/data/tracks/29-heijunka.js from steps29.py and lessons29.py. SQL steps run one at a time
# through foundations/sql_exec.py on a fresh PlantDB; a step that reads v_hourly_barrels gets the OEE
# track's view first. Python steps run in sequence, as one file, with the SMED track's
# changeover_log.csv beside them.
# Checks: demand is the S&OP track's; Conveyor 3's barrels, rejects and down minutes are the OEE week's;
# the 53/30 changeover times are the SMED track's; the 6,798 level plan, the 81 s takt and the standard
# costs are still in their tracks' outputs; 5 x 15 min is the Savings Tracker's P5 baseline; the board
# adds up to the plan.
# Needs BC_SQL_PASSWORD and the SQL Server container. Do not edit the JS file by hand.
#   python3 build29.py            write the track
#   python3 build29.py --check    report a difference, change nothing
import shutil, contextlib, io, json, os, re, subprocess, sys, tempfile, warnings
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "lib" / "pydb"))
sys.path.insert(0, str(HERE.parent / "foundations"))
import plantdb
from steps29 import CODE, LANG

def lesson_code(track_file, title):
    js = ("const fs=require('fs'),vm=require('vm'),c={};c.BC={addLanguage(){},addGlossary(){},addLane(){},addTrack(t){c.t=t}};"
          "vm.createContext(c);vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),c);"
          "console.log(JSON.stringify(c.t.lessons.find(l=>l.t===process.argv[2]).code))")
    return json.loads(subprocess.run(["node", "-e", js, str(ROOT / "site/data/tracks" / track_file), title], capture_output=True, text=True, check=True).stdout)

# A CREATE prints nothing, so its output is a check query on what it made, printed above its result.
schema = lambda t: ("SELECT COLUMN_NAME AS column_name, DATA_TYPE AS type, IS_NULLABLE AS nullable\n"
                     f"FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '{t}' ORDER BY ORDINAL_POSITION;")
AFTER = {}
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
    shutil.copy(HERE.parent / "track16-smed/changeover_log.csv", d)  # the steps read it, as a learner's script would
    os.chdir(d)  # the workbook step saves an .xlsx; 
    for title, lang in LANG.items():
        if lang != "python":
            continue
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            exec(CODE[title], g)
        outs[title] = buf.getvalue().rstrip()

# Cross-checks against the tracks these numbers come from.
def need(cond, msg):
    if not cond:
        sys.exit(msg)
TR = ROOT / "site/data/tracks"
sop, smed = (TR / "25-sop.js").read_text(), (TR / "16-smed.js").read_text()
need("41062   14938   56000" in sop and "41062" in outs["Demand by size"] and "14938" in outs["Demand by size"], "demand is not the S&OP track's 41,062 / 14,938")
need(g["made"] == 7120 and g["rejects"] == 142 and abs(g["down"] - 94.733) < 0.01, "Conveyor 3's week is not the OEE track's 7,120 / 142 / 94.73")
need(round(g["to30"], 2) == 15.0 and round(g["to53"], 2) == 14.25 and "53            -  15.0" in smed and "14.25" in smed, "the changeover times are not the SMED track's")
need(re.search(r"2026-11-07\s+6600\s+6798", sop) is not None, "6,798 is no longer the S&OP level plan")
need("81.0 s" in (TR / "15-takt.js").read_text() or "81.0" in (TR / "15-takt.js").read_text(), "the takt is no longer 81.0 s")
cost = (TR / "27-cost.js").read_text()
need("$107.23" in cost and "$55.06" in cost, "the standard costs are no longer the Cost track's")
need("3187.50" in (TR / "14-savings.js").read_text() or "3,187.50" in (TR / "14-savings.js").read_text(), "5 x 15 min is no longer the Savings Tracker's P5 baseline")
cells = re.search(r"Cells add to (\d+) and (\d+) pallets \(board (\d+) and (\d+)\)", outs["Heijunka board workbook"])
need(cells.group(1) == cells.group(3) and cells.group(2) == cells.group(4), "the workbook does not add up to the board")
need(round(g["pallets"]["53-gal"]) == g["board"]["53-gal"].sum() and round(g["pallets"]["30-gal"]) == g["board"]["30-gal"].sum(), "the board does not add up to the plan")

if "--outs" in sys.argv:
    for t, o in outs.items():
        print(f"===== {t}\n{o}")
    sys.exit(0)
print("Cross-checks: demand, Conveyor 3, changeover times, level plan, takt, standard costs and P5 agree; the board adds up")

from lessons29 import TRACK, LESSONS
assert [t for t, *_ in LESSONS] == list(CODE), "lessons29.py and steps29.py list different steps"

def whole(k, code):
    pre = r"(?<!\w)" if re.match(r"\w", k) else ""
    post = r"(?!\w)" if re.search(r"\w$", k) else ""
    return re.search(pre + re.escape(k) + post, code) is not None

tpl = lambda x: "`" + x.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${") + "`"
js = lambda v: json.dumps(v, ensure_ascii=False)
lines = ["// Project track 29: Heijunka and Scheduling (SQL and Python on the plant database)",
         "// Generated by tools/output-checks/track29-heijunka/build29.py from steps29.py and lessons29.py. Do not edit by hand.",
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
target = ROOT / "site/data/tracks/29-heijunka.js"
if "--check" in sys.argv:
    same = target.exists() and target.read_text() == text
    print("29-heijunka.js is current" if same else "29-heijunka.js is stale: run python3 build29.py")
    sys.exit(0 if same else 1)
target.write_text(text)
print(f"wrote {target.relative_to(ROOT)}: {len(LESSONS)} steps")
