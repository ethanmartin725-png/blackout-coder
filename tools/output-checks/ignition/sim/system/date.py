# system.date on the scenario's fixed clock. Dates are java.util.Date, as in Ignition.
from java.text import SimpleDateFormat
from java.util import Calendar, Date
from system._state import clock


def now():
    return clock.now()


def _cal(d):
    c = Calendar.getInstance()
    c.setTime(d)
    return c


def _add(d, field, n):
    c = _cal(d)
    c.add(field, int(n))
    return c.getTime()


def addSeconds(d, n): return _add(d, Calendar.SECOND, n)
def addMinutes(d, n): return _add(d, Calendar.MINUTE, n)
def addHours(d, n): return _add(d, Calendar.HOUR_OF_DAY, n)
def addDays(d, n): return _add(d, Calendar.DAY_OF_MONTH, n)


def secondsBetween(a, b): return int((b.getTime() - a.getTime()) / 1000)
def minutesBetween(a, b): return int((b.getTime() - a.getTime()) / 60000)
def hoursBetween(a, b): return int((b.getTime() - a.getTime()) / 3600000)
def millisBetween(a, b): return b.getTime() - a.getTime()


def getHour24(d): return _cal(d).get(Calendar.HOUR_OF_DAY)
def getMinute(d): return _cal(d).get(Calendar.MINUTE)


def format(d, pattern="yyyy-MM-dd HH:mm:ss"):
    return SimpleDateFormat(pattern).format(d)


def parse(text, pattern="yyyy-MM-dd HH:mm:ss"):
    return SimpleDateFormat(pattern).parse(text)


def getDate(year, month, day):
    """month is 0-based, as in Ignition and java.util.Calendar."""
    c = Calendar.getInstance()
    c.clear()
    c.set(year, month, day)
    return c.getTime()


def setTime(d, hour, minute, second):
    c = _cal(d)
    c.set(Calendar.HOUR_OF_DAY, hour)
    c.set(Calendar.MINUTE, minute)
    c.set(Calendar.SECOND, second)
    c.set(Calendar.MILLISECOND, 0)
    return c.getTime()


def midnight(d):
    return setTime(d, 0, 0, 0)


def isAfter(a, b): return a.getTime() > b.getTime()
def isBefore(a, b): return a.getTime() < b.getTime()
