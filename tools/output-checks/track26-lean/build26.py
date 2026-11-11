# Builds site/data/tracks/26-lean.js from steps26.py and lessons26.py. SQL steps run one at a time
# through foundations/sql_exec.py on a fresh PlantDB (wip_count and audit_5s included); a step that
# reads v_hourly_barrels gets the OEE track's view first. Python steps run in sequence, as one file.
# Checks: both CREATEs equal WIP_DDL and AUDIT_DDL in sql_exec.py; the stave and hoop days of cover
# are the Inventory track's; Hoop Driver 1's work elements are the Takt track's; the last finished-
# goods count is the S&OP track's starting stock; and the levers' barrels are the S&OP track's.
# Needs BC_SQL_PASSWORD and the SQL Server container. Do not edit the JS file by hand.
#   python3 build26.py            write the track
#   python3 build26.py --check    report a difference, change nothing
import shutil, contextlib, io, json, os, re, subprocess, sys, tempfile, warnings
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "lib" / "pydb"))
sys.path.insert(0, str(HERE.parent / "foundations"))
import plantdb
from steps26 import CODE, LANG

def ddl(name):
    src = (HERE.parent / "foundations/sql_exec.py").read_text()
    return re.search(name + r' = """(.*?)"""', src, re.S).group(1)

for title, name in (("Create wip_count", "WIP_DDL"), ("Create audit_5s", "AUDIT_DDL")):
    if CODE[title] != ddl(name):
        sys.exit(f"{title} differs from {name} in sql_exec.py: keep them the same")

def lesson_code(track_file, title):
    js = ("const fs=require('fs'),vm=require('vm'),c={};c.BC={addLanguage(){},addGlossary(){},addLane(){},addTrack(t){c.t=t}};"
          "vm.createContext(c);vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),c);"
          "console.log(JSON.stringify(c.t.lessons.find(l=>l.t===process.argv[2]).code))")
    return json.loads(subprocess.run(["node", "-e", js, str(ROOT / "site/data/tracks" / track_file), title], capture_output=True, text=True, check=True).stdout)

# A CREATE prints nothing, so its output is a check query on what it made, printed above its result.
schema = lambda t: ("SELECT COLUMN_NAME AS column_name, DATA_TYPE AS type, IS_NULLABLE AS nullable\n"
                     f"FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '{t}' ORDER BY ORDINAL_POSITION;")
AFTER = {"Create wip_count": schema("wip_count"), "Create audit_5s": schema("audit_5s")}
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
inv = (ROOT / "site/data/tracks/22-inv.js").read_text()
for item in ("STV-53", "STV-30", "HP-53", "HP-30"):
    mine = re.search(rf"\n{item}\s+\S+\s+\S+\s+([\d.]+)", outs["Raw material days"]).group(1)
    theirs = re.search(rf"\n{item}\s+28\s+\S+\s+\S+\s+\S+\s+\S+\s+([\d.]+)", inv).group(1)
    if mine != theirs:
        sys.exit(f"{item}: {mine} days of cover here, {theirs} in the Inventory track")
takt = (HERE.parent / "track15-takt/steps15.py").read_text()
want = [(n, eval(sec)) for n, sec in re.findall(r'\("Hoop Driver 1", "([^"]+)", ([^,]+), "', takt)]
got = list(zip(g["hd1"]["element"], g["hd1"]["seconds"]))
if [(n, round(v, 6)) for n, v in want] != [(n, round(v, 6)) for n, v in got]:
    sys.exit(f"Hoop Driver 1's elements differ from the Takt track's: {want} vs {got}")
cur = g["conn"].cursor()
cur.execute("SELECT barrels FROM wip_count WHERE location = 'Finished goods' AND counted_ts = '2026-11-07 06:00'")
sop = (HERE.parent / "track25-sop/steps25.py").read_text()
if cur.fetchone()[0] != int(re.search(r"START_STOCK = (\d+)", sop).group(1)):
    sys.exit("The last finished-goods count is not the S&OP track's starting stock")
sop_out = (ROOT / "site/data/tracks/25-sop.js").read_text()
for lever, val in (("Run through the breaks", "425.8"), ("P1 and P2 at the bottleneck", "57.9")):
    if val not in sop_out:
        sys.exit(f"{lever}: {val} is no longer in the S&OP track's outputs")

if "--outs" in sys.argv:
    for t, o in outs.items():
        print(f"===== {t}\n{o}")
    sys.exit(0)
print("Cross-checks: CREATEs match the seeds; days of cover match Inventory; elements match Takt; stock and levers match S&OP")

from lessons26 import TRACK, LESSONS
assert [t for t, *_ in LESSONS] == list(CODE), "lessons26.py and steps26.py list different steps"

def whole(k, code):
    pre = r"(?<!\w)" if re.match(r"\w", k) else ""
    post = r"(?!\w)" if re.search(r"\w$", k) else ""
    return re.search(pre + re.escape(k) + post, code) is not None

tpl = lambda x: "`" + x.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${") + "`"
js = lambda v: json.dumps(v, ensure_ascii=False)
lines = ["// Project track 26: Lean Basics (SQL and Python on the plant database)",
         "// Generated by tools/output-checks/track26-lean/build26.py from steps26.py and lessons26.py. Do not edit by hand.",
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
target = ROOT / "site/data/tracks/26-lean.js"
if "--check" in sys.argv:
    same = target.exists() and target.read_text() == text
    print("26-lean.js is current" if same else "26-lean.js is stale: run python3 build26.py")
    sys.exit(0 if same else 1)
target.write_text(text)
print(f"wrote {target.relative_to(ROOT)}: {len(LESSONS)} steps")
