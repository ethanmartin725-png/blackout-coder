# system.dataset: Ignition's Dataset and PyDataSet, as far as the lessons need them.
from java.util import ArrayList
from system._state import NotModeled


class BasicDataset(object):
    def __init__(self, headers, rows):
        self.headers = list(headers)
        self.rows = [list(r) for r in rows]
        for r in self.rows:
            if len(r) != len(self.headers):
                raise ValueError("every row needs %d values" % len(self.headers))

    def getRowCount(self): return len(self.rows)
    def getColumnCount(self): return len(self.headers)
    def getColumnNames(self):
        # A Java list, as in Ignition: it prints as [a, b] without quotes
        out = ArrayList()
        for h in self.headers:
            out.add(h)
        return out
    def getColumnName(self, i): return self.headers[i]

    def getColumnIndex(self, name):
        return self.headers.index(name)

    def getValueAt(self, row, col):
        if isinstance(col, basestring):
            col = self.getColumnIndex(col)
        return self.rows[row][col]

    def __str__(self):
        return "Dataset [%dR x %dC]" % (len(self.rows), len(self.headers))

    __repr__ = __str__


class PyRow(object):
    def __init__(self, ds, i):
        self.ds, self.i = ds, i

    def __getitem__(self, k):
        if isinstance(k, basestring):
            return self.ds.rows[self.i][self.ds.getColumnIndex(k)]
        return self.ds.rows[self.i][k]

    def __len__(self): return len(self.ds.headers)

    def __iter__(self): return iter(self.ds.rows[self.i])

    def __str__(self): return str(self.ds.rows[self.i])

    __repr__ = __str__


class PyDataSet(object):
    def __init__(self, ds):
        self.ds = ds

    def __len__(self): return len(self.ds.rows)

    def __getitem__(self, i): return PyRow(self.ds, i)

    def __iter__(self):
        for i in range(len(self.ds.rows)):
            yield PyRow(self.ds, i)

    def getRowCount(self): return self.ds.getRowCount()
    def getColumnCount(self): return self.ds.getColumnCount()
    def getColumnNames(self): return self.ds.getColumnNames()
    def getUnderlyingDataset(self): return self.ds

    def __str__(self): return "<PyDataset rows:%d cols:%d>" % (len(self.ds.rows), len(self.ds.headers))

    __repr__ = __str__


def toDataSet(headers, rows=None):
    if rows is None:
        if isinstance(headers, PyDataSet):
            return headers.ds
        raise NotModeled("toDataSet(pyDataset) is the only one-argument form modeled")
    return BasicDataset(headers, rows)


def toPyDataSet(ds):
    if isinstance(ds, PyDataSet):
        return ds
    return PyDataSet(ds)
