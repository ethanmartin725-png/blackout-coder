# Runs one Ignition lesson job under Jython 2.7 and prints its output.
# Job (JSON file given as argv[1]):
#   kind      "script" or "expr"
#   code      the lesson code
#   clock     "yyyy-MM-dd HH:mm:ss", the gateway time
#   tags      {path: value} or {path: [value, quality]}
#   dbUrl     JDBC URL, if the lesson uses system.db
#   after     script code run after the lesson code in the same namespace (scripts)
#   cases     [{label, tags, clock}] evaluated one by one (expressions)
import sys, json
sys.path.insert(0, sys.argv[2])
import system
from system import _state
from java.text import SimpleDateFormat


def set_clock(text):
    _state.clock.ms = SimpleDateFormat("yyyy-MM-dd HH:mm:ss").parse(text).getTime()


def load_tags(tags):
    for path, v in (tags or {}).items():
        value, quality = (v[0], v[1]) if isinstance(v, list) else (v, "Good")
        _state.tags[system.tag.normalize(path)] = [value, quality, _state.clock.now()]


job = json.load(open(sys.argv[1]))
set_clock(job.get("clock", "2026-11-07 14:05:00"))
load_tags(job.get("tags"))
if job.get("dbUrl"):
    _state.db_url[0] = job["dbUrl"]

def qv(value, quality="Good"):
    """A qualified value, as Ignition passes to tag event scripts."""
    return system.tag.QualifiedValue(value, system.tag.QualityCode(quality), _state.clock.now())


def show(query, args=None):
    """Print a query's result as an aligned table, the way the SQL lane prints them."""
    ds = system.db.runPrepQuery(query, args or []).getUnderlyingDataset()
    def cell(v):
        if v is None:
            return "NULL"
        if hasattr(v, "getTime"):
            return system.date.format(v, "yyyy-MM-dd HH:mm:ss")
        if isinstance(v, float) and v == int(v):
            return "%d" % v
        return unicode(v)
    rows = [[cell(v) for v in r] for r in ds.rows]
    w = [max([len(h)] + [len(r[i]) for r in rows]) for i, h in enumerate(ds.headers)]
    line = lambda vals: u"  ".join(v.ljust(w[i]) for i, v in enumerate(vals)).rstrip()
    print(line(ds.headers).encode("utf-8"))
    for r in rows:
        print(line(r).encode("utf-8"))


if job["kind"] == "script":
    ns = {"system": system, "__name__": "__main__"}
    if job.get("before"):
        exec compile(job["before"], "<scenario>", "exec") in {"system": system, "show": show}
    exec compile(job["code"], "<lesson>", "exec") in ns
    def rerun():
        """Run the lesson code again, as a timer script runs on its next tick."""
        exec compile(job["code"], "<lesson>", "exec") in ns

    def set_tag(path, value, quality="Good"):
        _state.tags[system.tag.normalize(path)] = [value, quality, _state.clock.now()]

    ns.update({"qv": qv, "show": show, "set_clock": set_clock, "rerun": rerun, "set_tag": set_tag})
    if job.get("after"):
        exec compile(job["after"], "<scenario>", "exec") in ns
else:
    import expr
    tree = expr.compile_expr(job["code"])
    lines = []
    for c in job["cases"]:
        if c.get("clock"):
            set_clock(c["clock"])
        load_tags(c.get("tags"))
        v = expr.evaluate(tree)
        lines.append((c["label"], expr.text(v)))
    w = max(len(l) for l, _ in lines)
    for l, v in lines:
        print((u"%s  \u2192  %s" % (l.ljust(w), v)).encode("utf-8"))
