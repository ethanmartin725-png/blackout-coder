# Power Query M teaching model

The OEE Report in Power BI track's M steps run in `tools/output-checks/pq/mmodel.mjs`, a model of a subset of Power Query M, over the same PlantDB snapshot the DAX model uses (`tools/output-checks/dax/plantdb.json`). M only runs inside Power BI and Excel, so the model is held to two checks, as the DAX model is:

1. **Its own tests** (`tools/pq-tests.mjs`, 16 tests, run by the verifier): one per rule below.
2. **SQL twins** (`tools/output-checks/pq/twins.mjs`): every step, M and DAX, asks SQL Server the same question; `node tools/output-checks/pq/run.mjs` compares every row and column and fails on any difference.

Anything outside the subset throws `NotModeled` with the reason.

## How the track runs

Each M step is a named query (the step's `file` and `pq.query`), a complete `let … in` expression that may refer to earlier queries by name, as in the Queries pane. A query marked `pq.load: true` becomes a table of the DAX model the DAX steps run in (`tools/output-checks/pq/lane.mjs`), with relationships Faults, Barrels and Rejects to Machines on machine, and Faults[shift_date] to Dates[Date]. So the DAX steps measure exactly what the M steps shaped. An M step's output is a preview: the first rows (`pq.top`) and the row count.

## Semantics

- **Values**: numbers, text, logical, null, date-time, date and duration (no time zones), lists, records, tables, functions. `#datetime`, `#date`, `#duration` build them.
- **let … in**: steps are evaluated in order; each may use the ones before. `#"…"` names a step or query with spaces.
- **each**: a one-argument function; inside it `[col]` is the argument's field. When the argument is a table (inside `Table.Group`), `[col]` is that column as a list and `_` is the table.
- **Navigation**: `Sql.Database` returns a table of every table and view (Schema, Item, Data); `{[Schema = "dbo", Item = "…"]}` picks exactly one row and `[Data]` opens it.
- **Operators**: arithmetic, `&` on text, comparisons, `and`, `or`, `not`, `if … then … else` (else is required). A date-time minus a date-time is a duration; a date-time plus or minus a duration is a date-time. Comparing values of different types, a date with a date-time, is refused, as M refuses it.
- **null**: arithmetic with null is null; `=` and `<>` compare it; ordering comparisons with null give null.
- **Functions**: `Table.SelectRows`, `AddColumn`, `SelectColumns`, `RemoveColumns`, `RenameColumns`, `Sort`, `TransformColumnTypes` (number, text, date, datetime, Int64), `Group`, `NestedJoin` (LeftOuter only), `ExpandTableColumn` (an unmatched row gives nulls), `FromList` (SplitByNothing), `RowCount`; `List.Sum`, `List.Dates`; `Duration.TotalMinutes`, `Time.Hour`, `Date.From`, `Date.DayOfWeekName` (English names); `Number.Round`.
- **Types** written after a column (`type number`) are accepted and not enforced; `Table.TransformColumnTypes` does convert.
- **Table.Group** keeps groups in the order their key first appears.

## Refused

Other join kinds, query folding and anything about the source's own SQL (the model reads the snapshot), `Table.Pivot`, custom functions with parameters, error handling (`try … otherwise`), and any library function not listed above.

## DAX additions for this track

`createModel` takes `dateCols` for date columns with other names (`shift_date`, `Date`), and `FORMAT` handles the lessons' number formats and dates with `d`, `dd`, `mmm`, `mmmm` and `yyyy`. See `docs/DAX_MODEL.md`.
