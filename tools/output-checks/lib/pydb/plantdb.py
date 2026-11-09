# Helpers for output tools whose Python lessons read the database:
#   reset(batches)        rebuild the canonical PlantDB (sql_exec.py --reset), then run extra T-SQL
#                         batches, such as the CREATE VIEW steps earlier lessons perform
#   use_real_database()   make `import pyodbc` load the stand-in in this folder
import os, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]  # tools/output-checks/lib/pydb -> repo root


def reset(batches=()):
    subprocess.run([sys.executable, str(ROOT / "tools/output-checks/foundations/sql_exec.py"), "--reset"], check=True, capture_output=True)
    if batches:
        import pymssql
        conn = pymssql.connect(server=os.environ.get("BC_SQL_SERVER", "localhost"), port=int(os.environ.get("BC_SQL_PORT", "1433")),
                               user=os.environ.get("BC_SQL_USER", "sa"), password=os.environ["BC_SQL_PASSWORD"], database="PlantDB", autocommit=True)
        cur = conn.cursor()
        for b in batches:
            cur.execute(b)
        conn.close()


def use_real_database():
    sys.modules.pop("pyodbc", None)
    sys.path.insert(0, str(HERE))
