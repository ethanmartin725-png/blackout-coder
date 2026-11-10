# Builds site/data/tracks/22-inv.js from steps22.py and lessons22.py. SQL steps run one at a time
# through foundations/sql_exec.py on a fresh PlantDB (stock_move included), as the SQL lane does; the
# steps after "Daily usage view" get that view first, in its own batch. Python steps run in sequence,
# as one file, on PlantDB with the same view. Checks: the first step's CREATE equals STOCK_MOVE_DDL in
# sql_exec.py; receipts equal po_line quantities line by line; the OEE week's hoop issues are the
# Procurement track's 28,200 and 6,840; the Python daily averages and deviations equal the SQL step's.
# Needs BC_SQL_PASSWORD and the SQL Server container. Do not edit the JS file by hand.
#   python3 build22.py            write the track
#   python3 build22.py --check    report a difference, change nothing
import contextlib, io, json, os, re, subprocess, sys, tempfile, warnings
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "lib" / "pydb"))
sys.path.insert(0, str(HERE.parent / "foundations"))
import plantdb
from steps22 import CODE, LANG

def ddl():
    src = (HERE.parent / "foundations/sql_exec.py").read_text()
    return re.search(r'STOCK_MOVE_DDL = """(.*?)"""', src, re.S).group(1)

if CODE["Create stock_move"] != ddl():
    sys.exit("Create stock_move differs from STOCK_MOVE_DDL in sql_exec.py: keep them the same")

def lesson_code(track_file, title):
    js = ("const fs=require('fs'),vm=require('vm'),c={};c.BC={addLanguage(){},addGlossary(){},addLane(){},addTrack(t){c.t=t}};"
          "vm.createContext(c);vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),c);"
          "console.log(JSON.stringify(c.t.lessons.find(l=>l.t===process.argv[2]).code))")
    return json.loads(subprocess.run(["node", "-e", js, str(ROOT / "site/data/tracks" / track_file), title], capture_output=True, text=True, check=True).stdout)

# A CREATE prints nothing, so its output is a check query on what it made, printed above its result.
AFTER = {"Create stock_move": "SELECT COLUMN_NAME AS column_name, DATA_TYPE AS type, IS_NULLABLE AS nullable\n"
         "FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_move' ORDER BY ORDINAL_POSITION;",
         "Daily usage view": "SELECT item_no, prod_day, used FROM v_daily_usage\n"
         "WHERE item_no IN ('EYE-PE', 'HP-53') AND prod_day >= '2026-11-02' ORDER BY item_no, prod_day;"}
VIEW = CODE["Daily usage view"]
after_view = False
outs = {}
for title, lang in LANG.items():
    if lang == "sql":
        src = (VIEW + "\nGO\n" + CODE[title]) if after_view else CODE[title]
        after_view = after_view or title == "Daily usage view"
        r = subprocess.run([sys.executable, str(HERE.parent / "foundations/sql_exec.py")], input=src, capture_output=True, text=True,
                           env={**os.environ, "BC_SQL_AFTER": AFTER.get(title, "")})
        if r.returncode:
            sys.exit(f"{title}: {r.stderr}")
        outs[title] = r.stdout.rstrip()

plantdb.reset([VIEW])
plantdb.use_real_database()
warnings.filterwarnings("ignore", message="pandas only supports SQLAlchemy")
g = {}
with tempfile.TemporaryDirectory() as d:
    os.chdir(d)  # the reorder step saves an .xlsx
    for title, lang in LANG.items():
        if lang != "python":
            continue
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            exec(CODE[title], g)
        outs[title] = buf.getvalue().rstrip()

# Cross-checks on the same database the Python steps used.
cur = g["conn"].cursor()
cur.execute("""SELECT COUNT(*) FROM po_line AS p
               FULL JOIN (SELECT po_no, line, SUM(qty) AS q FROM stock_move WHERE kind = 'receipt' GROUP BY po_no, line) AS r
                 ON r.po_no = p.po_no AND r.line = p.line
               WHERE r.q IS NULL OR p.qty IS NULL OR r.q <> p.qty""")
if cur.fetchone()[0]:
    sys.exit("Receipts do not match po_line quantities")
cur.execute("""SELECT item_no, -SUM(qty) FROM stock_move WHERE kind = 'issue' AND item_no IN ('HP-53', 'HP-30')
               AND move_ts > '2026-10-31 06:00' AND move_ts <= '2026-11-07 06:00' GROUP BY item_no""")
if {k: float(v) for k, v in cur.fetchall()} != {"HP-53": 28200.0, "HP-30": 6840.0}:
    sys.exit("OEE-week hoop issues are not the Procurement track's 28,200 and 6,840")
for row in outs["Usage and days of cover"].splitlines()[1:]:
    item, _days, avg, sd = row.split()[:4]
    st = g["stats"].loc[item]
    if round(st["avg"], 2) != float(avg) or round(st["sd"], 2) != float(sd):
        sys.exit(f"{item}: Python avg/sd {st['avg']}/{st['sd']} differ from SQL {avg}/{sd}")

if "--outs" in sys.argv:
    for t, o in outs.items():
        print(f"===== {t}\n{o}")
    sys.exit(0)
print("Cross-checks: CREATE matches the seed's DDL; receipts match po_line; hoop issues match Procurement; Python usage matches SQL")

from lessons22 import TRACK, LESSONS
assert [t for t, *_ in LESSONS] == list(CODE), "lessons22.py and steps22.py list different steps"

def whole(k, code):
    pre = r"(?<!\w)" if re.match(r"\w", k) else ""
    post = r"(?!\w)" if re.search(r"\w$", k) else ""
    return re.search(pre + re.escape(k) + post, code) is not None

tpl = lambda x: "`" + x.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${") + "`"
js = lambda v: json.dumps(v, ensure_ascii=False)
lines = ["// Project track 22: Inventory / WIP (SQL and Python on the plant database)",
         "// Generated by tools/output-checks/track22-inv/build22.py from steps22.py and lessons22.py. Do not edit by hand.",
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
target = ROOT / "site/data/tracks/22-inv.js"
if "--check" in sys.argv:
    same = target.exists() and target.read_text() == text
    print("22-inv.js is current" if same else "22-inv.js is stale: run python3 build22.py")
    sys.exit(0 if same else 1)
target.write_text(text)
print(f"wrote {target.relative_to(ROOT)}: {len(LESSONS)} steps")
