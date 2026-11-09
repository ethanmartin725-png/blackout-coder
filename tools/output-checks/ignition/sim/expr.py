# A teaching model of Ignition's expression language, for generating lesson outputs.
# Covers: numbers, strings, {tag} references, + - * / %, comparisons (= == != <> < > <= >=),
# && || !, and the functions in FUNCS below. Formatting uses Java's DecimalFormat and
# SimpleDateFormat, as Ignition does. Anything else raises NotModeled. See docs/IGNITION_SIM.md.
import re
from java.text import DecimalFormat, SimpleDateFormat
from java.util import Date
from system._state import NotModeled, clock
from system import tag as _tag

TOKEN = re.compile(r'\s*(?:(\d+\.\d*|\d*\.\d+|\d+)|("(?:[^"\\]|\\.)*")|(\{[^}]*\})|([A-Za-z_]\w*)|(&&|\|\||==|!=|<>|<=|>=|[-+*/%<>=!(),]))')


def tokenize(src):
    src = re.sub(r"//[^\n]*", "", src)
    out, i = [], 0
    while i < len(src):
        if src[i:].strip() == "":
            break
        m = TOKEN.match(src, i)
        if not m or m.end() == i:
            raise SyntaxError("cannot read the expression at: %s" % src[i:i + 20])
        num, s, path, ident, op = m.groups()
        if num is not None:
            out.append(("num", float(num) if "." in num else int(num)))
        elif s is not None:
            out.append(("str", s[1:-1].replace('\\"', '"')))
        elif path is not None:
            out.append(("tag", path[1:-1].strip()))
        elif ident is not None:
            out.append(("id", ident))
        else:
            out.append(("op", op))
        i = m.end()
    return out


class Parser(object):
    LEVELS = [["||"], ["&&"], ["=", "==", "!=", "<>", "<", ">", "<=", ">="], ["+", "-"], ["*", "/", "%"]]

    def __init__(self, toks):
        self.t, self.p = toks, 0

    def peek(self):
        return self.t[self.p] if self.p < len(self.t) else (None, None)

    def take(self, v=None):
        k, x = self.peek()
        if v is not None and x != v:
            raise SyntaxError("expected %s" % v)
        self.p += 1
        return k, x

    def parse(self):
        e = self.binary(0)
        if self.p != len(self.t):
            raise SyntaxError("unexpected %s" % (self.peek()[1],))
        return e

    def binary(self, lvl):
        if lvl == len(self.LEVELS):
            return self.unary()
        a = self.binary(lvl + 1)
        while self.peek()[0] == "op" and self.peek()[1] in self.LEVELS[lvl]:
            op = self.take()[1]
            a = ("bin", op, a, self.binary(lvl + 1))
        return a

    def unary(self):
        k, x = self.peek()
        if k == "op" and x in ("-", "!"):
            self.take()
            return ("un", x, self.unary())
        return self.primary()

    def primary(self):
        k, x = self.take()
        if k in ("num", "str"):
            return ("lit", x)
        if k == "tag":
            return ("tag", x)
        if k == "op" and x == "(":
            e = self.binary(0)
            self.take(")")
            return e
        if k == "id":
            if x in ("true", "false"):
                return ("lit", x == "true")
            if x == "null":
                return ("lit", None)
            self.take("(")
            args = []
            if self.peek()[1] != ")":
                args.append(self.binary(0))
                while self.peek()[1] == ",":
                    self.take()
                    args.append(self.binary(0))
            self.take(")")
            return ("call", x, args)
        raise SyntaxError("unexpected %s" % x)


def truth(v):
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, long, float)):
        return v != 0
    raise NotModeled("a condition must be true/false or a number, got %r" % (v,))


def text(v):
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, Date):
        return SimpleDateFormat("EEE MMM dd HH:mm:ss yyyy").format(v)
    return unicode(v)


def arith(op, a, b):
    if op == "+" and (isinstance(a, basestring) or isinstance(b, basestring)):
        return text(a) + text(b)
    if a is None or b is None:
        return None
    if isinstance(a, bool) or isinstance(b, bool):
        raise NotModeled("arithmetic on true/false is not modeled")
    if op == "/":
        if isinstance(a, (int, long)) and isinstance(b, (int, long)) and a % b != 0:
            raise NotModeled("whole-number division with a remainder is not modeled; write 7.0 / 2")
        return a / b if isinstance(a, float) or isinstance(b, float) else a // b
    return {"+": lambda: a + b, "-": lambda: a - b, "*": lambda: a * b, "%": lambda: a % b}[op]()


def compare(op, a, b):
    if op in ("=", "=="):
        return a == b
    if op in ("!=", "<>"):
        return a != b
    if a is None or b is None:
        return False
    return {"<": a < b, ">": a > b, "<=": a <= b, ">=": a >= b}[op]


UNITS = {"ms": 1, "millisecond": 1, "second": 1000, "sec": 1000, "minute": 60000, "min": 60000,
         "hour": 3600000, "hr": 3600000, "day": 86400000}


def f_case(v, *rest):
    if len(rest) % 2 != 1:
        raise SyntaxError("case() needs value, then pairs, then a default")
    for i in range(0, len(rest) - 1, 2):
        if v == rest[i]:
            return rest[i + 1]
    return rest[-1]


def f_switch(v, *rest):
    if len(rest) % 2 != 1:
        raise SyntaxError("switch() needs value, cases, the same number of results, then a default")
    n = (len(rest) - 1) // 2
    for i in range(n):
        if v == rest[i]:
            return rest[n + i]
    return rest[-1]


def f_dateDiff(a, b, field):
    if field not in UNITS:
        raise NotModeled("dateDiff field %r is not modeled" % field)
    return (b.getTime() - a.getTime()) / float(UNITS[field])


def f_toInt(v):
    if isinstance(v, (int, long)) and not isinstance(v, bool):
        return v
    if isinstance(v, float) and v == int(v):
        return int(v)
    if isinstance(v, basestring) and re.match(r"^-?\d+$", v.strip()):
        return int(v)
    raise NotModeled("toInt(%r): rounding rules are not modeled" % (v,))


FUNCS = {
    "case": f_case,
    "switch": f_switch,
    "numberFormat": lambda n, p: None if n is None else DecimalFormat(p).format(n),
    "dateFormat": lambda d, p: None if d is None else SimpleDateFormat(p).format(d),
    "dateDiff": f_dateDiff,
    "now": lambda *a: clock.now(),
    "toStr": lambda v: text(v),
    "toString": lambda v: text(v),
    "toInt": f_toInt,
    "coalesce": lambda *a: next((x for x in a if x is not None), None),
    "isNull": lambda v: v is None,
    "upper": lambda s: s.upper(),
    "lower": lambda s: s.lower(),
    "len": lambda s: len(s),
    "concat": lambda *a: u"".join(text(x) for x in a),
    "abs": lambda x: abs(x),
    "min": lambda a, b: min(a, b),
    "max": lambda a, b: max(a, b),
}


def ev(e):
    k = e[0]
    if k == "lit":
        return e[1]
    if k == "tag":
        return _tag.readBlocking([e[1]])[0].value
    if k == "un":
        v = ev(e[2])
        return (not truth(v)) if e[1] == "!" else -v
    if k == "bin":
        op = e[1]
        if op == "&&":
            return truth(ev(e[2])) and truth(ev(e[3]))
        if op == "||":
            return truth(ev(e[2])) or truth(ev(e[3]))
        a, b = ev(e[2]), ev(e[3])
        if op in ("+", "-", "*", "/", "%"):
            return arith(op, a, b)
        return compare(op, a, b)
    if k == "call":
        name, args = e[1], e[2]
        if name == "if":
            if len(args) != 3:
                raise SyntaxError("if() takes a condition, a true value and a false value")
            return ev(args[1]) if truth(ev(args[0])) else ev(args[2])
        if name not in FUNCS:
            raise NotModeled("expression function %s() is not modeled" % name)
        return FUNCS[name](*[ev(a) for a in args])
    raise NotModeled("unknown node %r" % (k,))


def compile_expr(src):
    return Parser(tokenize(src)).parse()


def evaluate(tree):
    return ev(tree)
