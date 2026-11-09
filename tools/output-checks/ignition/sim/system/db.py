# system.db over JDBC to the lesson's SQL Server database (PlantDB), with real T-SQL.
# ? parameters are bound with PreparedStatement, exactly as Ignition does.
import uuid
from java.sql import DriverManager, Statement, Timestamp, Types
from java.util import Date
from system._state import db_url, default_db, NotModeled
from system.dataset import BasicDataset, PyDataSet

_tx = {}


def _connect(database):
    if database not in ("", None, default_db[0]):
        raise NotModeled("only the %s database connection is modeled" % default_db[0])
    return DriverManager.getConnection(db_url[0])


def _bind(ps, args):
    for i, a in enumerate(args or []):
        if a is None:
            ps.setNull(i + 1, Types.NULL)
        elif isinstance(a, Date):
            ps.setTimestamp(i + 1, Timestamp(a.getTime()))
        elif isinstance(a, bool):
            ps.setBoolean(i + 1, a)
        elif isinstance(a, (int, long)):
            ps.setLong(i + 1, a)
        elif isinstance(a, float):
            ps.setDouble(i + 1, a)
        else:
            ps.setString(i + 1, unicode(a))


def _value(rs, i, t):
    v = rs.getObject(i)
    if v is None:
        return None
    if t in (Types.TIMESTAMP, Types.DATE):
        return Date(rs.getTimestamp(i).getTime())
    if t in (Types.DECIMAL, Types.NUMERIC):
        return float(v.doubleValue())
    return v


def _query(conn, query, args):
    ps = conn.prepareStatement(query)
    _bind(ps, args)
    rs = ps.executeQuery()
    md = rs.getMetaData()
    n = md.getColumnCount()
    headers = [md.getColumnLabel(i) for i in range(1, n + 1)]
    types = [md.getColumnType(i) for i in range(1, n + 1)]
    rows = []
    while rs.next():
        rows.append([_value(rs, i, types[i - 1]) for i in range(1, n + 1)])
    ps.close()
    return BasicDataset(headers, rows)


def _with(database, tx, fn):
    if tx:
        return fn(_tx[tx])
    conn = _connect(database)
    try:
        return fn(conn)
    finally:
        conn.close()


def runPrepQuery(query, args=None, database="", tx=None):
    return PyDataSet(_with(database, tx, lambda c: _query(c, query, args)))


def runScalarPrepQuery(query, args=None, database="", tx=None):
    ds = _with(database, tx, lambda c: _query(c, query, args))
    return ds.getValueAt(0, 0) if ds.getRowCount() else None


def runPrepUpdate(query, args=None, database="", tx=None, getKey=False, skipAudit=True):
    def run(conn):
        ps = conn.prepareStatement(query, Statement.RETURN_GENERATED_KEYS if getKey else Statement.NO_GENERATED_KEYS)
        _bind(ps, args)
        n = ps.executeUpdate()
        if getKey:
            keys = ps.getGeneratedKeys()
            key = keys.getLong(1) if keys.next() else None
            ps.close()
            return int(key)
        ps.close()
        return n
    return _with(database, tx, run)


def beginTransaction(database="", isolationLevel=None, timeout=None):
    conn = _connect(database)
    conn.setAutoCommit(False)
    tx = str(uuid.uuid4())
    _tx[tx] = conn
    return tx


def commitTransaction(tx):
    _tx[tx].commit()


def rollbackTransaction(tx):
    _tx[tx].rollback()


def closeTransaction(tx):
    conn = _tx.pop(tx)
    conn.close()


def runQuery(*a, **k):
    raise NotModeled("runQuery pastes values into SQL text; the lessons use runPrepQuery")


def runUpdateQuery(*a, **k):
    raise NotModeled("runUpdateQuery pastes values into SQL text; the lessons use runPrepUpdate")


def runNamedQuery(*a, **k):
    raise NotModeled("named queries live in an Ignition project and are not modeled")
