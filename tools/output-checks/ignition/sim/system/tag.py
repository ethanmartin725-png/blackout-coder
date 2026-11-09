# system.tag: an in-memory tag provider holding qualified values.
from system._state import tags, clock, NotModeled


class QualityCode(object):
    def __init__(self, name):
        self.name = name

    def isGood(self):
        return self.name == "Good"

    def isBad(self):
        return self.name.startswith("Bad")

    def getName(self):
        return self.name

    def __str__(self):
        return self.name

    __repr__ = __str__

    def __eq__(self, other):
        return str(self) == str(other)

    def __ne__(self, other):
        return not self.__eq__(other)


class QualifiedValue(object):
    def __init__(self, value, quality, timestamp):
        self.value = value
        self.quality = quality
        self.timestamp = timestamp

    def getValue(self):
        return self.value

    def getQuality(self):
        return self.quality

    def getTimestamp(self):
        return self.timestamp

    def __str__(self):
        return "[%s, %s, %s]" % (self.value, self.quality, self.timestamp)

    __repr__ = __str__


def normalize(path):
    path = path.strip()
    if not path.startswith("["):
        path = "[default]" + path
    if path.startswith("[.]") or path.startswith("[~]"):
        raise NotModeled("relative tag paths ([.] and [~]) are not modeled")
    return path


def readBlocking(tagPaths, timeout=45000):
    if isinstance(tagPaths, basestring):
        raise TypeError("readBlocking takes a list of tag paths")
    out = []
    for p in tagPaths:
        t = tags.get(normalize(p))
        if t is None:
            out.append(QualifiedValue(None, QualityCode("Bad_NotFound"), clock.now()))
        else:
            out.append(QualifiedValue(t[0], QualityCode(t[1]), t[2]))
    return out


def writeBlocking(tagPaths, values, timeout=45000):
    if isinstance(tagPaths, basestring):
        raise TypeError("writeBlocking takes a list of tag paths")
    if len(tagPaths) != len(values):
        raise ValueError("writeBlocking needs one value per tag path")
    out = []
    for p, v in zip(tagPaths, values):
        key = normalize(p)
        if key not in tags:
            out.append(QualityCode("Bad_NotFound"))
            continue
        tags[key][0] = v
        tags[key][1] = "Good"
        tags[key][2] = clock.now()
        out.append(QualityCode("Good"))
    return out


def exists(tagPath):
    return normalize(tagPath) in tags


def read(*a, **k):
    raise NotModeled("system.tag.read was removed in Ignition 8; use readBlocking")


def write(*a, **k):
    raise NotModeled("system.tag.write was removed in Ignition 8; use writeBlocking")
