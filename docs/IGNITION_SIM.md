# Ignition outputs: how they are generated

Status: built. `tools/output-checks/ignition/` runs every Ignition script and expression lesson and writes its `out`. Like the PLC interpreter, it is a teaching model, not Ignition.

## Why

Ignition scripts call `system.*`, which only exists inside an Ignition gateway, and expressions are evaluated by the gateway too. Hand-written outputs broke the rule that every output comes from running the code, and checking scripts as Python 3 hid real differences: in Jython 2.7, `7 / 2` is 3 and `print("a", 1)` prints a tuple.

## How

- **Real Jython 2.7.4** runs each lesson (Ignition 8.1 ships Jython 2.7.2 or 2.7.3). `fetch.sh` downloads it, and the Microsoft JDBC driver, from Maven Central into `vendor/` (git-ignored) and checks their SHA-256.
- **`sim/system/`** is a teaching model of the parts of `system.*` the lessons use, written in Jython:
  - `system.tag`: an in-memory provider of qualified values (value, quality, timestamp). `readBlocking` and `writeBlocking` take lists; a missing path reads as `None` with `Bad_NotFound` and writes return `Bad_NotFound`, as in Ignition 8. `[default]` is assumed when no provider is given.
  - `system.db`: `runPrepQuery`, `runScalarPrepQuery`, `runPrepUpdate` (with `getKey`) and transactions, over JDBC to the same SQL Server 2022 the SQL lane uses. `?` parameters are bound with a PreparedStatement, so the SQL is real T-SQL. Before every lesson that uses the database, `sql_exec.py --reset` rebuilds the canonical PlantDB. Errors arrive as Java exceptions, as they do in Ignition, so `except Exception` does not catch them.
  - `system.date`: Java `Date`s on a fixed clock set by each scenario (default 2026-11-07 14:05, the handoff run time).
  - `system.dataset`: `toDataSet`, `toPyDataSet`, datasets and PyDataSets with the methods the lessons call.
  - `system.util`: loggers print `LEVEL [name] message`; `debug` prints nothing, as with Ignition's default level. `jsonEncode` sorts keys so outputs are repeatable; Ignition's own key order may differ.
- **`sim/expr.py`** evaluates expressions: numbers, strings, `{tag}` references, `+ - * / %`, comparisons, `&& || !`, and `if`, `case`, `switch`, `numberFormat`, `dateFormat`, `dateDiff`, `now`, `getHour24`, `getMinute`, `toStr`, `toInt`, `coalesce`, `isNull`, `upper`, `lower`, `len`, `concat`, `abs`, `min`, `max`. Formats use Java's DecimalFormat and SimpleDateFormat, as Ignition does.
- **`scenarios.mjs`** gives each lesson its tags, clock, database setup and what to call afterwards (for example, firing `valueChanged` with qualified values).

## Not modeled

These raise an error instead of guessing: relative tag paths (`[.]`, `[~]`), the removed `system.tag.read`/`write`, `runQuery`/`runUpdateQuery` (the lessons never paste values into SQL), named queries, databases other than PlantDB, unknown expression functions, whole-number division with a remainder in expressions, and `toInt` rounding. Tag paths are matched exactly; Ignition matches them without regard to case.

## Checks without Jython

CI does not run Jython. The verifier compiles every Ignition script as Python 3 and also refuses code that would behave differently in Jython 2.7: f-strings, `nonlocal`, `:=`, print statements, and `print(...)` with more than one argument.

## Commands

```bash
bash tools/output-checks/ignition/fetch.sh
BC_SQL_PASSWORD=... node tools/output-checks/ignition/run.mjs           # write outs
BC_SQL_PASSWORD=... node tools/output-checks/ignition/run.mjs --check   # report stale ones
node tools/output-checks/ignition/run.mjs --only=Transactions           # one lesson
```
