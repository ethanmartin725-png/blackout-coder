# Builds site/data/tracks/27-cost.js from steps27.py and lessons27.py. SQL steps run one at a time
# through foundations/sql_exec.py on a fresh PlantDB; a step that reads v_hourly_barrels gets the OEE
# track's view first. Python steps run in sequence, as one file.
# Checks: good barrels are the S&OP track's; material is the Procurement track's; all work orders
# total the Maintenance track's $1,238.72; the leak dollars are the Energy track's $348.86; kWh and
# propane are the Energy track's; each station's OEE is the OEE track's; a sold-out point is worth the
# OEE track's dollars per point; the workbook's cells add to pandas to the cent.
# Needs BC_SQL_PASSWORD and the SQL Server container. Do not edit the JS file by hand.
#   python3 build27.py            write the track
#   python3 build27.py --check    report a difference, change nothing
import shutil, contextlib, io, json, os, re, subprocess, sys, tempfile, warnings
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "lib" / "pydb"))
sys.path.insert(0, str(HERE.parent / "foundations"))
import plantdb
from steps27 import CODE, LANG

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
st = g["st"]
need(list(st["good"]) == [6978, 6314, 6769], f"good barrels {list(st['good'])}, not the S&OP track's 6,978 / 6,314 / 6,769")
spend = (ROOT / "site/data/tracks/17-spend.js").read_text()
for size in ("53-gal", "30-gal"):
    mine = re.search(rf"{size}\s+\S+\s+\S+\s+([\d.]+)", outs["Material by barrel size"]).group(1)
    need(f"{size}: " in spend and f"= ${mine}" in spend, f"{size} material ${mine} is not the Procurement track's")
    need(g["MATERIAL"][size] == float(mine), f"{size}: MATERIAL in the Python steps differs from the SQL step")
need("$1,238.72" in outs["Maintenance in the standard"] and "$1,238.72" in (ROOT / "site/data/tracks/21-maint.js").read_text(), "work orders do not total the Maintenance track's $1,238.72")
energy = (ROOT / "site/data/tracks/24-energy.js").read_text()
leak = f"{g['leak']:,.2f}"
need(f"${leak} a week" in energy, f"leak dollars ${leak} are not in the Energy track's outputs")
need(f"{g['week']['kwh'].sum():.2f}" in energy and f"{g['gal']:,.2f}" in energy, "kWh or propane differ from the Energy track's")
for m, pct in (("Conveyor 3", 73.8), ("Hoop Driver 1", 72.9), ("Char Station 2", 86.0)):
    need(round(st.loc[m, "oee"] * 100, 1) == pct, f"{m} OEE {st.loc[m, 'oee']:.4f}, not the OEE track's {pct}%")
for m, usd in (("Conveyor 3", 4016), ("Hoop Driver 1", 3682)):
    need(round(g["view"].loc[m, "cash_if_sold"]) == usd, f"{m}: a point is ${g['view'].loc[m, 'cash_if_sold']:.2f}, not the OEE track's ${usd:,}")
cells = re.search(r"Cells add to \$([\d,.]+) \(pandas \$([\d,.]+)\)", outs["Cost sheet workbook"])
need(cells.group(1) == cells.group(2), "the workbook's cells do not add to the pandas total")

if "--outs" in sys.argv:
    for t, o in outs.items():
        print(f"===== {t}\n{o}")
    sys.exit(0)
print("Cross-checks: good barrels match S&OP, material Procurement, work orders Maintenance, leaks and kWh Energy, OEE and $ per point the OEE track; workbook adds up")

from lessons27 import TRACK, LESSONS
assert [t for t, *_ in LESSONS] == list(CODE), "lessons27.py and steps27.py list different steps"

def whole(k, code):
    pre = r"(?<!\w)" if re.match(r"\w", k) else ""
    post = r"(?!\w)" if re.search(r"\w$", k) else ""
    return re.search(pre + re.escape(k) + post, code) is not None

tpl = lambda x: "`" + x.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${") + "`"
js = lambda v: json.dumps(v, ensure_ascii=False)
lines = ["// Project track 27: Barrel Cost Model (SQL and Python on the plant database)",
         "// Generated by tools/output-checks/track27-cost/build27.py from steps27.py and lessons27.py. Do not edit by hand.",
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
target = ROOT / "site/data/tracks/27-cost.js"
if "--check" in sys.argv:
    same = target.exists() and target.read_text() == text
    print("27-cost.js is current" if same else "27-cost.js is stale: run python3 build27.py")
    sys.exit(0 if same else 1)
target.write_text(text)
print(f"wrote {target.relative_to(ROOT)}: {len(LESSONS)} steps")
