# Builds site/data/tracks/30-review.js from steps30.py and lessons30.py. SQL steps run one at a time
# through foundations/sql_exec.py on a fresh PlantDB; a step that reads v_hourly_barrels gets the OEE
# track's view first. Python steps run in sequence, as one file. Needs python-pptx.
# Checks: the SQL OEE, losses, PM compliance, backlog, rejects and delivery equal their source tracks';
# every figure the steps quote (SOURCES) is still in its source step's output; the workbook and the
# deck read back equal to the measures table.
# Needs BC_SQL_PASSWORD and the SQL Server container. Do not edit the JS file by hand.
#   python3 build30.py            write the track
#   python3 build30.py --check    report a difference, change nothing
import shutil, contextlib, io, json, os, re, subprocess, sys, tempfile, warnings
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "lib" / "pydb"))
sys.path.insert(0, str(HERE.parent / "foundations"))
import plantdb
from steps30 import CODE, LANG

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
SITE = ROOT / "site/data"
def step_out(gid, title):
    js = ("const fs=require('fs'),vm=require('vm'),p=require('path'),c={};c.BC={addLanguage(){},addGlossary(){},addThreads(){},addLane(t){c[t.id]=t},addTrack(t){c[t.id]=t}};"
          "vm.createContext(c);const h=fs.readFileSync(p.join(process.argv[1],'index.html'),'utf8');for(const m of h.matchAll(/src=\"(data\\/[^\"]+)\"/g))vm.runInContext(fs.readFileSync(p.join(process.argv[1],m[1]),'utf8'),c);"
          "const g=c[process.argv[2]];const l=g&&g.lessons.find(l=>l.t===process.argv[3]);console.log(JSON.stringify(l?l.out:null))")
    return json.loads(subprocess.run(["node", "-e", js, str(ROOT / "site"), gid, title], capture_output=True, text=True, check=True).stdout)
oee = outs["This week's OEE"]
for m, pct in (("Char Station 2", "86.0"), ("Conveyor 3", "73.8"), ("Hoop Driver 1", "72.9"), ("Pooled", "77.2")):
    need(re.search(rf"{m}\s.*\s{pct}$", oee, re.M), f"{m} OEE is not {pct}%:\n{oee}")
need(re.search(r"11349\.80\s+221443\.95\s+19082\.50\s+251876\.25", outs["Loss by type"]), "loss by type is not the DAX lane's 11,349.80 / 221,443.95 / 19,082.50 / 251,876.25:\n" + outs["Loss by type"])
need(re.search(r"15\s+13\s+86\.7\s+7\s+27\.00\s+2\.25", outs["Maintenance health"]), "PM compliance and backlog are not the Maintenance track's 13 of 15, 86.7%, 7 orders, 27.0 h, 2.25 weeks:\n" + outs["Maintenance health"])
for fault, usd in (("Low air", "3480.57"), ("Char flare", "2480.94"), ("Hoop misfeed", "2385.55")):
    need(re.search(rf"{fault}\s.*\s{usd}$", outs["Top losses"], re.M), f"{fault} is not the Savings Tracker's ${usd}:\n" + outs["Top losses"])
need(re.search(r"6314\s+7000\s+449\s+20510", outs["Delivery and quality"]), "delivery and quality are not the Lean track's 6,314 / 7,000 and 449 of 20,510:\n" + outs["Delivery and quality"])
for gid, title, quote in g["SOURCES"]:
    out = step_out(gid, title)
    need(out is not None, f"{gid} has no step '{title}'")
    need(quote in out, f"'{quote}' is no longer in {gid} · {title}; update SOURCES and the measures")
need("Statuses match the table: True" in outs["Excel one-pager"], "the workbook does not read back")
need("Slide 2 statuses match the table: True" in outs["Read the deck back"], "the deck does not read back")

if "--outs" in sys.argv:
    for t, o in outs.items():
        print(f"===== {t}\n{o}")
    sys.exit(0)
print("Cross-checks: OEE, losses, maintenance, delivery and every quoted figure agree with their tracks; workbook and deck read back")

from lessons30 import TRACK, LESSONS
assert [t for t, *_ in LESSONS] == list(CODE), "lessons30.py and steps30.py list different steps"

def whole(k, code):
    pre = r"(?<!\w)" if re.match(r"\w", k) else ""
    post = r"(?!\w)" if re.search(r"\w$", k) else ""
    return re.search(pre + re.escape(k) + post, code) is not None

tpl = lambda x: "`" + x.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${") + "`"
js = lambda v: json.dumps(v, ensure_ascii=False)
lines = ["// Project track 30: Weekly Ops Review (SQL and Python on the plant database)",
         "// Generated by tools/output-checks/track30-review/build30.py from steps30.py and lessons30.py. Do not edit by hand.",
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
target = ROOT / "site/data/tracks/30-review.js"
if "--check" in sys.argv:
    same = target.exists() and target.read_text() == text
    print("30-review.js is current" if same else "30-review.js is stale: run python3 build30.py")
    sys.exit(0 if same else 1)
target.write_text(text)
print(f"wrote {target.relative_to(ROOT)}: {len(LESSONS)} steps")
