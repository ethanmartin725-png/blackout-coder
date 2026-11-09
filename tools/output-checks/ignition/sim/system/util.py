# system.util: loggers (printed as LEVEL [name] message) and JSON.
import json as _json
from java.util import Date


class Logger(object):
    def __init__(self, name):
        self.name = name

    def _log(self, level, msg):
        print("%-5s [%s] %s" % (level, self.name, msg))

    def info(self, msg): self._log("INFO", msg)
    def warn(self, msg): self._log("WARN", msg)
    def error(self, msg): self._log("ERROR", msg)
    def debug(self, msg): pass  # debug is off by default in Ignition, so nothing prints
    def infof(self, fmt, *args): self._log("INFO", fmt % args)
    def warnf(self, fmt, *args): self._log("WARN", fmt % args)


def getLogger(name):
    return Logger(name)


def jsonEncode(obj, indentFactor=None):
    # Keys are sorted so outputs are stable; Ignition's own key order may differ.
    if indentFactor:
        return _json.dumps(obj, sort_keys=True, indent=indentFactor, separators=(",", ": "))
    return _json.dumps(obj, sort_keys=True, separators=(",", ":"))


def jsonDecode(text):
    return _json.loads(text)
