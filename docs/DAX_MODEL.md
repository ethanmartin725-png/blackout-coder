# DAX teaching model

The DAX lane's outputs come from `tools/output-checks/dax/model.mjs`, a model of a subset of DAX. DAX itself only runs inside Power BI Desktop, the Power BI service or Analysis Services, none of which run here. So the model is held to two checks:

1. **Its own tests** (`tools/dax-tests.mjs`, 30 tests, run by the verifier): one per rule below, on a tiny hand-made model where every answer can be worked out by hand.
2. **SQL twins** (`tools/output-checks/dax/twins.mjs`): every lesson asks the same question of the real PlantDB on SQL Server in plain T-SQL. `run.mjs` fails if any number differs beyond the six-decimal rounding of minutes. All 20 lessons match, OEE to the decimal and dollars to the cent.

Anything outside the subset throws `NotModeled` with the reason. The model refuses rather than guesses.

## Data

`plantdb.json` is a snapshot of the canonical PlantDB: `dim_machine`, `fault_log`, `v_hourly_barrels` (the OEE track's view, loaded as a table) and `reject_log`. `python3 tools/output-checks/dax/sql.py export` rebuilds PlantDB from the lessons (the same `sql_exec.py --reset` the other SQL tools use), creates the view from its lesson's code, and writes the snapshot. It is committed, so the verifier and CI need no database.

Relationships, filtering from the one side to the many side only (single direction, as Power BI creates them by default): `fault_log[machine]`, `v_hourly_barrels[machine]` and `reject_log[machine]` to `dim_machine[machine]`.

Date-times are serial days since 1899-12-30, as in DAX; comparisons and `DATEDIFF` work in whole seconds.

## Lessons build one model

Each lesson's code is one or more definitions: `Name = expression` for a measure, `table[column] = expression` for a calculated column; indented lines continue the definition above. A lesson is evaluated with the definitions of every lesson before it in the lane, like one Power BI file built up step by step. A later definition of the same name replaces the earlier one.

## Semantics

- **Filter context.** A visual cell's filters are a list of column filters (a set of allowed values) and table filters (a set of allowed rows). A row of a table is visible when it passes every filter on that table, and its related one-side row is visible.
- **Table visual.** One row per value of the rows column, sorted; each cell is the measure under a filter on that value. Rows where every value is blank are hidden. The Total row is the measure with no filter at all: recalculated, never added up.
- **Measures** are referenced as `[Name]`. A measure reference is an implicit `CALCULATE`, so inside an iterator it triggers context transition.
- **CALCULATE**: (1) filter arguments are evaluated in the outer context; (2) context transition turns each row context into a filter on that row; (3) `ALL` / `REMOVEFILTERS` arguments remove filters; (4) the new filters replace existing filters on the same columns, and filter arguments on the same column intersect. A boolean argument must use exactly one column and no measure; it means `FILTER(ALL(column), condition)`.
- **ALL(table)** removes filters on that table and on the tables it expands to (its one-side tables). **ALL(column)** removes filters on that column.
- **Iterators** (`SUMX`, `AVERAGEX`, `MINX`, `MAXX`, `FILTER`, `RANKX`) add a row context per row of their table, evaluated in the current filter context.
- **Variables** are evaluated once, where they are defined, and do not change inside a later `CALCULATE`.
- **BLANK**: `+` and `-` treat it as 0 (blank + blank is blank); `*` and `/` with a blank operand give blank; comparisons treat it as 0, "" or false. `SUM` and `COUNTROWS` over no rows give blank. `DIVIDE` gives blank (or its alternate) for a zero or blank divisor.
- **RANKX** ranks largest first and ties skip (two firsts, then third), the defaults.
- **DATEDIFF** counts unit boundaries crossed, as DAX and SQL Server do.

## Refused

- `/` by zero or blank: DAX returns infinity; lessons use `DIVIDE`.
- A filter on whole rows of a fact table (from `FILTER(fault_log, …)` or context transition over `fault_log`) also filters `dim_machine` in real DAX, because a table filter applies to the expanded table. The model does not follow that, so it refuses to read `dim_machine` under such a filter. Reading the fact table itself is unaffected and is modeled.
- `ALL(column)` on top of a whole-row filter of the same table.
- A value exactly on a half at its display precision (70.05 shown with one decimal): tools round such values differently, so the lesson must show another decimal.
- Functions outside the list in `ev()`: time intelligence (`TOTALYTD`, `SAMEPERIODLASTYEAR`), `USERELATIONSHIP`, `KEEPFILTERS`, bidirectional filtering, many-to-many, and `RANKX` order and ties arguments.

## Formats

The lessons use Power BI format strings: `0`, `0.00`, `#,0`, `#,0.0`, `$#,0`, `0.0%`. Numbers align right, text left.
