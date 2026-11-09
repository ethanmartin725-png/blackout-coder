# A stand-in for pyodbc that connects to the local SQL Server the output tools use, so Python
# lessons that call pyodbc.connect(...) and pandas.read_sql run against real data.
# Put this folder first on sys.path (plantdb.use_real_database() does it). The connection string
# the lesson passes is ignored: every connection goes to PlantDB on BC_SQL_SERVER, as sql_exec.py does.
# Parameters: pyodbc uses ? placeholders, pymssql uses %s, so ? becomes %s (and a literal % becomes %%)
# whenever parameters are passed. The lessons never put ? or % inside SQL string literals.
import os
import pymssql


class Error(Exception):
    pass


def _qmark(sql):
    return sql.replace("%", "%%").replace("?", "%s")


class Cursor:
    def __init__(self, cur):
        self._c = cur

    def execute(self, sql, *params):
        if len(params) == 1 and isinstance(params[0], (list, tuple)):
            params = params[0]
        if params:
            self._c.execute(_qmark(sql), tuple(params))
        else:
            self._c.execute(sql)
        return self

    def executemany(self, sql, seq):
        self._c.executemany(_qmark(sql), [tuple(p) for p in seq])
        return self

    def __getattr__(self, name):
        return getattr(self._c, name)

    def __iter__(self):
        return iter(self._c.fetchall())


class Connection:
    def __init__(self, conn):
        self._c = conn

    def cursor(self):
        return Cursor(self._c.cursor())

    def execute(self, sql, *params):
        return self.cursor().execute(sql, *params)

    def commit(self):
        self._c.commit()

    def rollback(self):
        self._c.rollback()

    def close(self):
        self._c.close()

    def __enter__(self):
        return self

    def __exit__(self, *a):
        self.close()


def connect(conn_str="", autocommit=False, **kwargs):
    return Connection(pymssql.connect(server=os.environ.get("BC_SQL_SERVER", "localhost"), port=int(os.environ.get("BC_SQL_PORT", "1433")),
                                      user=os.environ.get("BC_SQL_USER", "sa"), password=os.environ["BC_SQL_PASSWORD"],
                                      database="PlantDB", autocommit=autocommit))
