# Power Query M teaching model

The Power Query M lane's lessons and the OEE Report in Power BI track's M steps run in `tools/output-checks/pq/mmodel.mjs`, a model of a subset of Power Query M, over the same PlantDB snapshot the DAX model uses (`tools/output-checks/dax/plantdb.json`). M only runs inside Power BI and Excel, so the model is held to two checks, as the DAX model is:

1. **Its own tests** (`tools/pq-tests.mjs`, 38 tests, run by the verifier): one per rule below.
2. **SQL twins** (`tools/output-checks/pq/twins.mjs` for the track, `mtwins.mjs` for the lane): every step and lesson asks SQL Server the same question; `node tools/output-checks/pq/run.mjs` compares every row and column and fails on any difference.

Anything outside the subset throws `NotModeled` with the reason.

## How the track runs

Each M step is a named query (the step's `file` and `pq.query`), a complete `let … in` expression that may refer to earlier queries by name, as in the Queries pane. A query marked `pq.load: true` becomes a table of the DAX model the DAX steps run in (`tools/output-checks/pq/lane.mjs`), with relationships Faults, Barrels and Rejects to Machines on machine, and Faults[shift_date] to Dates[Date]. So the DAX steps measure exactly what the M steps shaped. An M step's output is a preview: the first rows (`pq.top`) and the row count.

## How the lane runs

Each lesson of the M lane (`site/data/foundations/13-m.js`) is one complete query named by `pq.query`, run on its own (`laneOutputs` in `tools/output-checks/pq/lane.mjs`). A lane query may return a table, a list, a record or a single value; the output is the editor's preview: a list as one column headed List, a record as Field and Value rows, a single value as Value.

## Semantics

- **Values**: numbers, text, logical, null, date-time, date and duration (no time zones), lists, records, tables, functions. `#datetime`, `#date`, `#duration` build them.
- **let … in**: steps are evaluated in order; each may use the ones before. `#"…"` names a step or query with spaces.
- **each**: a one-argument function; inside it `[col]` is the argument's field. When the argument is a table (inside `Table.Group`), `[col]` is that column as a list and `_` is the table.
- **Navigation**: `Sql.Database` returns a table of every table and view (Schema, Item, Data); `{[Schema = "dbo", Item = "…"]}` picks exactly one row and `[Data]` opens it.
- **Operators**: arithmetic, `&` on text, comparisons, `and`, `or`, `not`, `if … then … else` (else is required). A date-time minus a date-time is a duration; a date-time plus or minus a duration is a date-time. Comparing values of different types, a date with a date-time, is refused, as M refuses it.
- **null**: arithmetic with null is null; `=` and `<>` compare it; ordering comparisons with null give null.
- **Functions**: `Table.SelectRows`, `AddColumn`, `SelectColumns`, `RemoveColumns`, `RenameColumns`, `Sort`, `TransformColumnTypes` (number, text, date, datetime, Int64), `Group`, `NestedJoin` (LeftOuter, Inner and LeftAnti), `ExpandTableColumn` (an unmatched row gives nulls), `FromList` (SplitByNothing), `FromRecords`, `FirstN`, `Distinct`, `Combine` (a missing column gives null), `RowCount`, `Pivot`, `UnpivotOtherColumns`, `ReplaceValue`, `FillDown`, `TransformColumns`, `AddIndexColumn`; `List.Sum`, `Count`, `Average`, `Max`, `Min`, `Distinct` (first-seen order), `Dates`, `Contains`, `FirstN`, `Range`, `Accumulate`; `Duration.TotalMinutes`, `TotalSeconds`, `Hours`, `Minutes`; `Time.Hour`, `Time.Minute`, `Date.From`, `Date.Year`, `Date.Month`, `Date.AddDays`, `Date.StartOfWeek`, `Date.DayOfWeek`, `Date.DayOfWeekName` (English names); `Text.From`, `Text.Upper`, `Text.Start`, `Text.Contains` (case-sensitive), `Text.PadStart` (pads with spaces unless given a character), `Text.Replace`; `Number.From`, `Number.Round`; `Record.ToTable`, `Record.FieldNames`.
- **Table.Pivot** makes one column per value in the list given, in that order; the other columns group the rows. With an aggregation function, a cell's values go to it as a list; without one, more than one value for a cell is an M error. **Table.UnpivotOtherColumns** turns every column not kept into attribute and value rows and drops null values. **Table.ReplaceValue** calls the replacer on each cell of the listed columns; `Replacer.ReplaceValue` replaces a value equal to the old one. **Table.FillDown** fills nulls only. **List.Accumulate** calls the function with the state, then the item.
- **Week functions**: `Date.StartOfWeek` and `Date.DayOfWeek` must be given the first day of the week (`Day.Saturday` and so on, `Day.Sunday` = 0 to `Day.Saturday` = 6); the model refuses them without it, because M's default depends on the culture setting. `Date.DayOfWeek` counts from 0 on that first day; `Date.StartOfWeek` returns midnight of that day, keeping a date-time a date-time. These rules, and the Day numbering, are from the M function reference as remembered: Microsoft Learn could not be reached from the environment that built them, so they have not been checked against it. The lessons pass the first day explicitly.
- **Duration.Hours** and **Duration.Minutes** are the clock-face parts of a duration, not totals.
- **Type annotations** on function parameters and results (`x as number`, `) as number =>`) are checked when the function is called: a value of another type, or null for a type that is not `nullable`, is an M error that `try` catches. `number`, `text`, `logical`, `date`, `datetime`, `duration`, `list`, `record`, `table`, `any` and `nullable` forms are modeled.
- **Number.Round** rounds half to even, M's default (`RoundingMode.ToEven`): it scales by the power of ten and rounds an exact half to the even neighbour, as .NET does. A value whose scaled double is not exactly a half rounds normally. Whether Power Query's own result differs from this for decimals like 2.675 has not been checked against Power BI, so the lessons avoid them.
- **Functions with parameters**: `(a, b) => body`; calling one with the wrong number of arguments is an M error.
- **Errors**: `try x otherwise y` gives `y` when `x` raises an M error: a failed conversion (`Number.From("n/a")`) or a function called with the wrong arguments. It does not hide a `NotModeled` refusal, which is the model's limit, not M's.
- **Values shown**: a duration as days.hours:minutes:seconds (`0.00:07:30`); a logical as true or false.
- **Types** written after a column (`type number`) are accepted and not enforced; `Table.TransformColumnTypes` does convert.
- **Table.Group** keeps groups in the order their key first appears.

## Refused

Other join kinds (RightOuter, FullOuter, RightAnti), query folding and anything about the source's own SQL (the model reads the snapshot), the week functions without a first day, `error` records, `try` without `otherwise`, a record's fields referring to each other, other replacers, and any library function not listed above.

## DAX additions for this track

`createModel` takes `dateCols` for date columns with other names (`shift_date`, `Date`), and `FORMAT` handles the lessons' number formats and dates with `d`, `dd`, `mmm`, `mmmm` and `yyyy`. See `docs/DAX_MODEL.md`.
