# Builds site/data/tracks/28-rca.js from steps28.py and lessons28.py. SQL steps run one at a time
# through foundations/sql_exec.py on a fresh PlantDB; steps after "Record the verdicts" get that UPDATE
# first. Python steps run in sequence, as one file.
# Checks: both CREATEs equal RCA_DDL and FLAME_DDL in sql_exec.py; the flares are fault_log's 8 in the
# OEE week, 70.05 min; their dollars are the Savings Tracker's P4 baseline; every flare hour, the
# handoff's 13:41 flare included, has Burner B under 1.5 uA; work orders 2, 14 and 42 and the 05:52
# handoff note say what the lessons quote; the flare shifts are the SPC track's; the flare propane is
# the Cost track's usage variance.
# Needs BC_SQL_PASSWORD and the SQL Server container. Do not edit the JS file by hand.
#   python3 build28.py            write the track
#   python3 build28.py --check    report a difference, change nothing
import shutil, contextlib, io, json, os, re, subprocess, sys, tempfile, warnings
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "lib" / "pydb"))
sys.path.insert(0, str(HERE.parent / "foundations"))
import plantdb
from steps28 import CODE, LANG, VERDICTS

def lesson_code(track_file, title):
    js = ("const fs=require('fs'),vm=require('vm'),c={};c.BC={addLanguage(){},addGlossary(){},addLane(){},addTrack(t){c.t=t}};"
          "vm.createContext(c);vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),c);"
          "console.log(JSON.stringify(c.t.lessons.find(l=>l.t===process.argv[2]).code))")
    return json.loads(subprocess.run(["node", "-e", js, str(ROOT / "site/data/tracks" / track_file), title], capture_output=True, text=True, check=True).stdout)

# A CREATE prints nothing, so its output is a check query on what it made, printed above its result.
schema = lambda t: ("SELECT COLUMN_NAME AS column_name, DATA_TYPE AS type, IS_NULLABLE AS nullable\n"
                     f"FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '{t}' ORDER BY ORDINAL_POSITION;")
def ddl(name):
    src = (HERE.parent / "foundations/sql_exec.py").read_text()
    return re.search(name + r' = """(.*?)"""', src, re.S).group(1)

for title, name in (("Create rca_node", "RCA_DDL"), ("Create flame_signal", "FLAME_DDL")):
    if CODE[title] != ddl(name):
        sys.exit(f"{title} differs from {name} in sql_exec.py: keep them the same")
AFTER = {"Create rca_node": schema("rca_node"), "Create flame_signal": schema("flame_signal"),
         "Record the verdicts": "SELECT node_id, category, status FROM rca_node WHERE kind = 'cause' ORDER BY node_id;"}
titles = list(LANG)
after_verdicts = set(titles[titles.index("Record the verdicts") + 1:])
OEE_VIEW = lesson_code("03-oee.js", "Hourly barrels view")
outs = {}
for title, lang in LANG.items():
    if lang == "sql":
        src = (VERDICTS + "\n" + CODE[title]) if title in after_verdicts else CODE[title]
        r = subprocess.run([sys.executable, str(HERE.parent / "foundations/sql_exec.py")], input=src, capture_output=True, text=True,
                           env={**os.environ, "BC_SQL_AFTER": AFTER.get(title, "")})
        if r.returncode:
            sys.exit(f"{title}: {r.stderr}")
        out = r.stdout.rstrip()
        if title in after_verdicts:  # the prepended UPDATE's own row count is not this step's output
            out = re.sub(r"^\(8 rows affected\)\n\n", "", out)
        outs[title] = out

plantdb.reset([])
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

# Cross-checks against the records and tracks these numbers come from.
def need(cond, msg):
    if not cond:
        sys.exit(msg)
TR = ROOT / "site/data/tracks"
need("8       70.05    2480.94" in outs["The problem in numbers"].replace("  ", "  "), "the flares are not 8, 70.05 min, $2,480.94:\n" + outs["The problem in numbers"])
need("2480.94" in (TR / "14-savings.js").read_text(), "$2,480.94 is no longer the Savings Tracker's P4 baseline")
cur = g["conn"].cursor()
cur.execute("""SELECT COUNT(*) FROM fault_log AS f JOIN flame_signal AS b ON b.burner = 'B'
    AND b.hour_end = DATEADD(HOUR, DATEDIFF(HOUR, 0, f.start_ts) + 1, 0)
    WHERE f.fault = 'Char flare' AND b.min_ua < 1.5""")
need(cur.fetchone()[0] == 8, "a fault_log flare hour has Burner B at or over 1.5 uA")
cur.execute("SELECT min_ua FROM flame_signal WHERE burner = 'B' AND hour_end = '2026-11-07 14:00'")
need(float(cur.fetchone()[0]) < 1.5, "the handoff's 13:41 flare hour has Burner B at or over 1.5 uA")
for wo, words in ((2, "Monthly PM: burner inspection"), (14, "Gas train pressure switch calibration"), (42, "Burner B igniter replacement")):
    cur.execute("SELECT description FROM work_order WHERE wo_id = ?", [wo])
    need(cur.fetchone()[0] == words, f"WO {wo} is no longer '{words}'")
cur.execute("SELECT COUNT(*) FROM handoff_note WHERE created_ts = '2026-11-07 05:52' AND note LIKE 'Burner B igniter sparking weak%'")
need(cur.fetchone()[0] == 1, "the 05:52 handoff note has changed")
need("[2, 3, 4, 10, 17, 20]" in outs["What it is worth"] and "2, 3, 4, 10, 17, 20" in (TR / "19-spc.js").read_text(), "the flare shifts are not the SPC track's")
usage = float(re.search(r"Propane usage variance \$([\d.]+) unfavourable", (TR / "27-cost.js").read_text()).group(1))
flare_usd = float(re.search(r"Flare propane [\d.]+ gal: \$([\d.]+)", outs["What it is worth"]).group(1))
need(abs(usage - flare_usd) <= 0.02, f"flare propane ${flare_usd} is not the Cost track's ${usage} usage variance")

if "--outs" in sys.argv:
    for t, o in outs.items():
        print(f"===== {t}\n{o}")
    sys.exit(0)
print("Cross-checks: CREATEs match the seeds; flares, P4, flame signal, work orders, handoff note, SPC shifts and Cost variance all agree")

from lessons28 import TRACK, LESSONS
assert [t for t, *_ in LESSONS] == list(CODE), "lessons28.py and steps27.py list different steps"

def whole(k, code):
    pre = r"(?<!\w)" if re.match(r"\w", k) else ""
    post = r"(?!\w)" if re.search(r"\w$", k) else ""
    return re.search(pre + re.escape(k) + post, code) is not None

tpl = lambda x: "`" + x.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${") + "`"
js = lambda v: json.dumps(v, ensure_ascii=False)
lines = ["// Project track 28: Root Cause: Char Flares (SQL and Python on the plant database)",
         "// Generated by tools/output-checks/track28-rca/build28.py from steps27.py and lessons28.py. Do not edit by hand.",
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
target = ROOT / "site/data/tracks/28-rca.js"
if "--check" in sys.argv:
    same = target.exists() and target.read_text() == text
    print("28-rca.js is current" if same else "28-rca.js is stale: run python3 build28.py")
    sys.exit(0 if same else 1)
target.write_text(text)
print(f"wrote {target.relative_to(ROOT)}: {len(LESSONS)} steps")
