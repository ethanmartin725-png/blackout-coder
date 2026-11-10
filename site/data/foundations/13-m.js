// Foundations lane: Power Query M (Power BI's Get Data and Transform)
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
// Outputs: node tools/output-checks/pq/run.mjs (the M teaching model; every lesson also has a SQL twin in pq/mtwins.mjs). Semantics: docs/PQ_MODEL.md.
// Each lesson is one complete query; pq.query is its name in the Queries pane.
BC.addLane({
  id: "m",
  name: "Power Query M",
  lang: "m",
  lessons: [
    {
      t: "Steps in a let",
      goal: "Connect to PlantDB with Sql.Database, navigate to dim_machine, and return it.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Machines = Source{[Schema = "dbo", Item = "dim_machine"]}[Data]
in
    Machines`,
      about: "A query is a let expression: named steps, each built from the ones before, and in names the one to return. Sql.Database connects and returns a navigation table listing every table and view; the {[Schema = \"dbo\", Item = \"dim_machine\"]} part picks one row of it and [Data] opens that table. Power BI writes these first two steps for you when you choose a table in Get Data. The three machines and their illustrative rates are the sample plant's.",
      terms: [
        ["Sql.Database", "Sql.Database(server, database)", "Connects and returns the database's navigation table."],
        ["[Data]", "[Data]", "Opens the table the navigation row points to."],
      ],
      pq: {"query": "Machines"},
      out: `machine         area       ideal_rate_hr  margin_per_barrel
Char Station 2  Finishing             50               42.5
Conveyor 3      Assembly              60               42.5
Hoop Driver 1   Assembly              55               42.5
3 rows`,
    },
    {
      t: "Values in M",
      goal: "Make steps for a number (55), a text, a logical, null, the misfeed's start as a date-time and its length as a duration (end minus start), and return them in one record.",
      code: `let
    Rate = 55,
    Machine = "Hoop Driver 1",
    Running = true,
    Ended = null,
    Started = #datetime(2026, 11, 7, 10, 9, 40),
    Down = #datetime(2026, 11, 7, 10, 17, 10) - Started,
    Values = [rate = Rate, machine = Machine, running = Running, ended = Ended, started = Started, down = Down]
in
    Values`,
      about: "M has a handful of value types: numbers, text in double quotes, the logicals true and false, null for nothing, date-times, and durations, which are what you get when you subtract one date-time from another. The record at the end gathers them under field names. The misfeed lasted 0.00:07:30, M's days.hours:minutes:seconds: 7.5 minutes, shift A's canonical misfeed. Field names are kept lower-case here because a record's fields can see each other, so [Rate = Rate] would refer to itself.",
      terms: [
        ["#datetime", "#datetime(y, m, d, h, min, s)", "A date and time value."],
        ["null", "null", "No value."],
        ["- Started", "Date-time minus date-time", "Gives a duration."],
      ],
      pq: {"query": "Values"},
      out: `Field    Value
rate     55
machine  Hoop Driver 1
running  true
ended    null
started  2026-11-07 10:09:40
down     0.00:07:30
6 rows`,
    },
    {
      t: "Navigate to fault_log",
      goal: "Connect and navigate to fault_log.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Faults = Source{[Schema = "dbo", Item = "fault_log"]}[Data]
in
    Faults`,
      about: "The same two steps, pointed at fault_log. The preview shows the first rows and the row count: all 47 faults, the last one still open, so its end_ts is null. The editor previews a sample of the rows; the full table only loads when the query is applied.",
      terms: [
        ["Item = \"fault_log\"", "Item", "The table to open."],
      ],
      pq: {"query": "Faults", "top": 5},
      out: `fault_id  machine        fault         start_ts             end_ts
       1  Hoop Driver 1  Hoop misfeed  2026-10-31 14:37:59  2026-10-31 14:43:41
       2  Conveyor 3     E-stop        2026-10-31 21:11:40  2026-10-31 21:14:59
       3  Hoop Driver 1  Hoop misfeed  2026-11-01 01:04:59  2026-11-01 01:09:01
       4  Conveyor 3     Jam           2026-11-01 01:36:12  2026-11-01 01:40:49
       5  Hoop Driver 1  Low air       2026-11-01 02:54:37  2026-11-01 03:12:28
47 rows, first 5 shown`,
    },
    {
      t: "Choose and rename columns",
      goal: "From fault_log keep fault_id, machine and start_ts, then rename start_ts to started.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Faults = Source{[Schema = "dbo", Item = "fault_log"]}[Data],
    Kept = Table.SelectColumns(Faults, {"fault_id", "machine", "start_ts"}),
    Renamed = Table.RenameColumns(Kept, {{"start_ts", "started"}})
in
    Renamed`,
      about: "Table.SelectColumns keeps the columns listed, in that order; everything else is dropped, which keeps the model small. Table.RenameColumns takes a list of {old, new} pairs, so the double braces are a list of one pair. Each step names a whole new table: Kept and Renamed both exist, and you can click either in the editor's Applied Steps.",
      terms: [
        ["{{\"start_ts\", \"started\"}}", "A list of pairs", "Each pair is {old name, new name}."],
      ],
      pq: {"query": "Fault Starts", "top": 5},
      out: `fault_id  machine        started
       1  Hoop Driver 1  2026-10-31 14:37:59
       2  Conveyor 3     2026-10-31 21:11:40
       3  Hoop Driver 1  2026-11-01 01:04:59
       4  Conveyor 3     2026-11-01 01:36:12
       5  Hoop Driver 1  2026-11-01 02:54:37
47 rows, first 5 shown`,
    },
    {
      t: "Keep the rows you need",
      goal: "Keep Hoop Driver 1's misfeeds, then keep fault_id, start_ts and end_ts.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Faults = Source{[Schema = "dbo", Item = "fault_log"]}[Data],
    Misfeeds = Table.SelectRows(Faults, each [machine] = "Hoop Driver 1" and [fault] = "Hoop misfeed"),
    Shown = Table.SelectColumns(Misfeeds, {"fault_id", "start_ts", "end_ts"})
in
    Shown`,
      about: "each is shorthand for a function of one row, and [machine] reads that row's machine. Table.SelectRows keeps the rows where the function returns true. Hoop Driver 1 has 12 misfeeds in fault_log: the OEE week's 11 and the one open at 10:15 on 7 November. Faults 20 and 21 overlap by 11 seconds, a quirk of the sample data worth noticing when you scan a filtered table.",
      terms: [
        ["each", "each", "A function of the current row."],
        ["and", "and", "Both conditions must hold."],
      ],
      pq: {"query": "Misfeeds", "top": 5},
      out: `fault_id  start_ts             end_ts
       1  2026-10-31 14:37:59  2026-10-31 14:43:41
       3  2026-11-01 01:04:59  2026-11-01 01:09:01
      15  2026-11-02 06:17:43  2026-11-02 06:22:47
      20  2026-11-03 15:27:12  2026-11-03 15:33:26
      21  2026-11-03 15:33:15  2026-11-03 15:37:18
12 rows, first 5 shown`,
    },
    {
      t: "Sort",
      goal: "Sort fault_log newest first and keep fault_id, machine, fault and start_ts.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Faults = Source{[Schema = "dbo", Item = "fault_log"]}[Data],
    Latest = Table.Sort(Faults, {{"start_ts", Order.Descending}}),
    Shown = Table.SelectColumns(Latest, {"fault_id", "machine", "fault", "start_ts"})
in
    Shown`,
      about: "Table.Sort takes a list of {column, order} pairs; more pairs break ties. Order.Descending puts the newest first: the open misfeed at 10:09:40 on 7 November, then Conveyor 3's jam at 09:08:52, the same two faults the Shift Handoff starts from.",
      terms: [
        ["Order.Descending", "Order.Descending", "Largest or newest first."],
      ],
      pq: {"query": "Latest Faults", "top": 5},
      out: `fault_id  machine         fault         start_ts
      47  Hoop Driver 1   Hoop misfeed  2026-11-07 10:09:40
      46  Conveyor 3      Jam           2026-11-07 09:08:52
      45  Char Station 2  Char flare    2026-11-07 04:10:06
      44  Conveyor 3      Jam           2026-11-06 23:24:33
      43  Conveyor 3      E-stop        2026-11-06 20:45:52
47 rows, first 5 shown`,
    },
    {
      t: "A column with each",
      goal: "Keep the closed faults and add a minutes column: end minus start, in minutes.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Faults = Source{[Schema = "dbo", Item = "fault_log"]}[Data],
    Closed = Table.SelectRows(Faults, each [end_ts] <> null),
    Minutes = Table.AddColumn(Closed, "minutes", each Duration.TotalMinutes([end_ts] - [start_ts])),
    Shown = Table.SelectColumns(Minutes, {"fault_id", "machine", "fault", "minutes"})
in
    Shown`,
      about: "Subtracting two date-times gives a duration, and Duration.TotalMinutes turns it into minutes with the fraction kept. The open fault is filtered out first: its end_ts is null, and null minus a date-time is null, which would quietly vanish from any total later. 46 closed faults remain.",
      terms: [
        ["[end_ts] <> null", "Not null", "Keeps rows whose end time is filled in."],
        ["Duration.TotalMinutes", "Duration.TotalMinutes", "A duration as minutes, fraction included."],
      ],
      pq: {"query": "Fault Minutes", "top": 5, "format": {"minutes": "0.00"}},
      out: `fault_id  machine        fault         minutes
       1  Hoop Driver 1  Hoop misfeed     5.70
       2  Conveyor 3     E-stop           3.32
       3  Hoop Driver 1  Hoop misfeed     4.03
       4  Conveyor 3     Jam              4.62
       5  Hoop Driver 1  Low air         17.85
46 rows, first 5 shown`,
    },
    {
      t: "if, then, else",
      goal: "Add a shift column from the start hour (A 06:00 to 14:00, B to 22:00, else C), then count the faults in each shift.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Faults = Source{[Schema = "dbo", Item = "fault_log"]}[Data],
    Shifts = Table.AddColumn(Faults, "shift", each
        if Time.Hour([start_ts]) >= 6 and Time.Hour([start_ts]) < 14 then "A"
        else if Time.Hour([start_ts]) >= 14 and Time.Hour([start_ts]) < 22 then "B"
        else "C"),
    Counted = Table.Group(Shifts, {"shift"}, {{"faults", each Table.RowCount(_)}})
in
    Counted`,
      about: "M's if is an expression: it always has an else and always gives a value, so else if chains cleanly. The shift comes from the start hour: A from 06:00, B from 14:00, C from 22:00. Table.Group then counts rows per shift, with _ as each group's table. B shift has the most faults, 18 of 47. Groups come out in the order their key first appears, not sorted.",
      terms: [
        ["Time.Hour", "Time.Hour", "The hour of a date-time, 0 to 23."],
        ["Table.RowCount(_)", "Rows in the group", "_ is the group's own table."],
      ],
      pq: {"query": "Faults by Shift"},
      out: `shift  faults
B          18
C          16
A          13
3 rows`,
    },
    {
      t: "Text from parts",
      goal: "Add a label like F1 HOOP: Hoop misfeed: F and the fault_id as text, the machine's first four letters in capitals, and the fault.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Faults = Source{[Schema = "dbo", Item = "fault_log"]}[Data],
    Labels = Table.AddColumn(Faults, "label", each "F" & Text.From([fault_id]) & " " & Text.Upper(Text.Start([machine], 4)) & ": " & [fault]),
    Shown = Table.SelectColumns(Labels, {"label"})
in
    Shown`,
      about: "& joins text, and only text: M will not turn a number into text for you, so Text.From comes first. Text.Start takes the first characters and Text.Upper capitalises them. A label like this is handy as a slicer or tooltip in a report, built once in the query instead of in every visual.",
      terms: [
        ["&", "&", "Joins two pieces of text."],
        ["Text.From", "Text.From", "A number or date as text."],
      ],
      pq: {"query": "Fault Labels", "top": 5},
      out: `label
F1 HOOP: Hoop misfeed
F2 CONV: E-stop
F3 HOOP: Hoop misfeed
F4 CONV: Jam
F5 HOOP: Low air
47 rows, first 5 shown`,
    },
    {
      t: "Rounding, M's way",
      goal: "Make a table of 0.5, 1.5, 2.5, 3.5 and 87.049997 with Table.FromList, then add each rounded to a whole number and to 2 places.",
      code: `let
    Values = Table.FromList({0.5, 1.5, 2.5, 3.5, 87.049997}, Splitter.SplitByNothing(), {"x"}),
    Whole = Table.AddColumn(Values, "whole", each Number.Round([x])),
    TwoPlaces = Table.AddColumn(Whole, "two_places", each Number.Round([x], 2))
in
    TwoPlaces`,
      about: "Number.Round rounds a half to the even neighbour by default: 0.5 to 0, 2.5 to 2, 1.5 and 3.5 to 2 and 4. SQL Server's ROUND, Excel's ROUND and most people round halves up, giving 1, 2, 3, 4. Over thousands of rows, half-to-even keeps totals from drifting upward. The OEE view's 87.049997 rounds to 87.05 at two places either way. Table.FromList turns a list into a one-column table, a quick way to try a function on a few values.",
      terms: [
        ["Number.Round", "Number.Round", "Rounds half to even unless told otherwise."],
        ["Table.FromList", "Table.FromList", "A list into a table."],
      ],
      pq: {"query": "Rounding"},
      out: `        x  whole  two_places
      0.5      0         0.5
      1.5      2         1.5
      2.5      2         2.5
      3.5      4         3.5
87.049997     87       87.05
5 rows`,
    },
    {
      t: "Date parts",
      goal: "Add the year, month, date and hour of each fault's start.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Faults = Source{[Schema = "dbo", Item = "fault_log"]}[Data],
    Year = Table.AddColumn(Faults, "year", each Date.Year([start_ts])),
    Month = Table.AddColumn(Year, "month", each Date.Month([start_ts])),
    Day = Table.AddColumn(Month, "day", each Date.From([start_ts])),
    Hour = Table.AddColumn(Day, "hour", each Time.Hour([start_ts])),
    Shown = Table.SelectColumns(Hour, {"fault_id", "start_ts", "year", "month", "day", "hour"})
in
    Shown`,
      about: "Date.Year, Date.Month and Time.Hour pull one part out of a date-time; Date.From keeps the date and drops the time. Fault 3 started at 01:04 on 1 November, so its date is 1 November, though it belongs to shift C of 31 October's shift date: a shift date needs the six-hour shift first, as the Power BI track does.",
      terms: [
        ["Date.Year", "Date.Year", "The year."],
        ["Date.From", "Date.From", "The date part of a date-time."],
      ],
      pq: {"query": "Date Parts", "top": 5},
      out: `fault_id  start_ts             year  month  day         hour
       1  2026-10-31 14:37:59  2026     10  2026-10-31    14
       2  2026-10-31 21:11:40  2026     10  2026-10-31    21
       3  2026-11-01 01:04:59  2026     11  2026-11-01     1
       4  2026-11-01 01:36:12  2026     11  2026-11-01     1
       5  2026-11-01 02:54:37  2026     11  2026-11-01     2
47 rows, first 5 shown`,
    },
    {
      t: "An open fault and a threshold",
      goal: "Work out every fault's minutes, using 2026-11-07 10:15 for a fault still open, keep those of 5 minutes or more, and show the newest first.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Faults = Source{[Schema = "dbo", Item = "fault_log"]}[Data],
    Now = #datetime(2026, 11, 7, 10, 15, 0),
    Minutes = Table.AddColumn(Faults, "minutes", each Duration.TotalMinutes((if [end_ts] = null then Now else [end_ts]) - [start_ts])),
    Long = Table.SelectRows(Minutes, each [minutes] >= 5),
    Newest = Table.Sort(Long, {{"start_ts", Order.Descending}}),
    Shown = Table.SelectColumns(Newest, {"fault_id", "machine", "fault", "minutes"})
in
    Shown`,
      about: "An open fault has no end, so it is measured to the sample plant's \"now\", 10:15 on 7 November: the if inside the brackets picks Now when end_ts is null. The misfeed at 10:09:40 has been down 5.33 minutes, just over the 5-minute breakdown line the TPM and Maintenance tracks use, so it appears first. 23 of the 47 faults are breakdowns by that rule.",
      terms: [
        ["Now", "Now", "The fixed \"now\", 10:15, standing in for the current time."],
        ["[minutes] >= 5", "Breakdown", "The TPM track's 5-minute line."],
      ],
      pq: {"query": "Breakdowns", "top": 5, "format": {"minutes": "0.00"}},
      out: `fault_id  machine         fault         minutes
      47  Hoop Driver 1   Hoop misfeed     5.33
      45  Char Station 2  Char flare      11.95
      42  Conveyor 3      Low air         12.82
      38  Char Station 2  Char flare      10.53
      37  Hoop Driver 1   Hoop misfeed     5.10
23 rows, first 5 shown`,
    },
    {
      t: "A list and its totals",
      goal: "Take the minutes of Hoop Driver 1's closed misfeeds in the OEE week as a list, then return a record of their count, total, average and longest, rounded to 2 places.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Faults = Source{[Schema = "dbo", Item = "fault_log"]}[Data],
    Misfeeds = Table.SelectRows(Faults, each [machine] = "Hoop Driver 1" and [fault] = "Hoop misfeed" and [start_ts] >= #datetime(2026, 10, 31, 6, 0, 0) and [start_ts] < #datetime(2026, 11, 7, 6, 0, 0)),
    Minutes = Table.AddColumn(Misfeeds, "minutes", each Duration.TotalMinutes([end_ts] - [start_ts]))[minutes],
    Summary = [
        count = List.Count(Minutes),
        total = Number.Round(List.Sum(Minutes), 2),
        average = Number.Round(List.Average(Minutes), 2),
        longest = Number.Round(List.Max(Minutes), 2)
    ]
in
    Summary`,
      about: "A table column read with [minutes] is a list, and the List functions work on lists: count, sum, average, max. Hoop Driver 1's misfeeds in the OEE week are 11 events, 61.23 minutes, the TPM track's and the Savings Tracker's P2 baseline. The query returns a record, which the editor shows as fields and values.",
      terms: [
        ["List.Count", "List.Count", "How many items."],
        ["List.Average", "List.Average", "The mean."],
        ["[minutes]", "A column as a list", "After a table, [column] gives that column's values."],
      ],
      pq: {"query": "Misfeed Summary"},
      out: `Field    Value
count       11
total    61.23
average   5.57
longest   8.27
4 rows`,
    },
    {
      t: "Distinct values",
      goal: "Return the distinct fault names in fault_log as a list.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Faults = Source{[Schema = "dbo", Item = "fault_log"]}[Data],
    Kinds = List.Distinct(Faults[fault])
in
    Kinds`,
      about: "Faults[fault] is the fault column as a list, and List.Distinct keeps each value once, in the order first seen. Five kinds of fault: the five rows of the canonical Pareto. A list like this is what a parameter's allowed values or a validation check would use.",
      terms: [
        ["List.Distinct", "List.Distinct", "Each value once, first-seen order."],
      ],
      pq: {"query": "Fault Kinds"},
      out: `List
Hoop misfeed
E-stop
Jam
Low air
Char flare
5 rows`,
    },
    {
      t: "A row as a record",
      goal: "Navigate to dim_machine and pick Hoop Driver 1's row as a record.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Machines = Source{[Schema = "dbo", Item = "dim_machine"]}[Data],
    Hoop = Machines{[machine = "Hoop Driver 1"]}
in
    Hoop`,
      about: "Braces after a table pick a row: by number, {0} for the first, or by a record of key fields, which must match exactly one row. The row comes back as a record, so Hoop[ideal_rate_hr] would read 55. Picking a row errors if no row or more than one matches, which is a useful check that a key is really unique.",
      terms: [
        ["{[machine = \"Hoop Driver 1\"]}", "Pick a row", "The one row whose fields match."],
      ],
      pq: {"query": "Hoop Driver 1"},
      out: `Field              Value
machine            Hoop Driver 1
area               Assembly
ideal_rate_hr      55
margin_per_barrel  42.5
4 rows`,
    },
    {
      t: "A table from records",
      goal: "Build a table of each machine's shift target from a list of records: Conveyor 3 450, Hoop Driver 1 412.5, Char Station 2 375.",
      code: `let
    Targets = Table.FromRecords({
        [machine = "Conveyor 3", target = 450],
        [machine = "Hoop Driver 1", target = 412.5],
        [machine = "Char Station 2", target = 375]
    })
in
    Targets`,
      about: "Table.FromRecords turns a list of records into a table, one row per record, with the field names as columns. It is how small lookup tables are typed straight into a query. These are the shift targets from the High-Performance HMI track: each machine's ideal rate times 7.5 paid hours.",
      terms: [
        ["Table.FromRecords", "Table.FromRecords", "One row per record."],
      ],
      pq: {"query": "Shift Targets"},
      out: `machine         target
Conveyor 3         450
Hoop Driver 1    412.5
Char Station 2     375
3 rows`,
    },
    {
      t: "Group into a Pareto",
      goal: "Work out each fault's minutes (10:15 for an open one), group by fault with the number of events and the total minutes, and sort the largest first.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Faults = Source{[Schema = "dbo", Item = "fault_log"]}[Data],
    Now = #datetime(2026, 11, 7, 10, 15, 0),
    Minutes = Table.AddColumn(Faults, "minutes", each Duration.TotalMinutes((if [end_ts] = null then Now else [end_ts]) - [start_ts])),
    Grouped = Table.Group(Minutes, {"fault"}, {
        {"events", each Table.RowCount(_)},
        {"minutes", each List.Sum([minutes])}
    }),
    Sorted = Table.Sort(Grouped, {{"minutes", Order.Descending}})
in
    Sorted`,
      about: "Table.Group makes one row per fault with two aggregations: the number of rows in the group and the sum of its minutes. Sorted largest first it is the canonical Pareto: low air 87.43, char flare 70.05, hoop misfeed 66.57, jam 65.73, E-stop 10.80 minutes, with the open misfeed counted to 10:15, as DB Pulls & Analytics does.",
      terms: [
        ["Table.Group", "Table.Group", "One row per key, with aggregations."],
        ["List.Sum([minutes])", "Sum in a group", "Inside a group, [minutes] is that group's minutes as a list."],
      ],
      pq: {"query": "Pareto", "format": {"minutes": "0.00"}},
      out: `fault         events  minutes
Low air            5    87.43
Char flare         8    70.05
Hoop misfeed      12    66.57
Jam               17    65.73
E-stop             5    10.80
5 rows`,
    },
    {
      t: "Keep the top rows",
      goal: "Build the same Pareto and keep its first three rows.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Faults = Source{[Schema = "dbo", Item = "fault_log"]}[Data],
    Now = #datetime(2026, 11, 7, 10, 15, 0),
    Minutes = Table.AddColumn(Faults, "minutes", each Duration.TotalMinutes((if [end_ts] = null then Now else [end_ts]) - [start_ts])),
    Grouped = Table.Group(Minutes, {"fault"}, {
        {"events", each Table.RowCount(_)},
        {"minutes", each List.Sum([minutes])}
    }),
    Sorted = Table.Sort(Grouped, {{"minutes", Order.Descending}}),
    Top = Table.FirstN(Sorted, 3)
in
    Top`,
      about: "Table.FirstN keeps the first rows, so it means \"top 3\" only after the sort. The top three causes, low air, char flare and hoop misfeed, carry 224.05 of the 300.58 minutes, about 75%: where a Pareto says to start.",
      terms: [
        ["Table.FirstN", "Table.FirstN", "The first n rows."],
      ],
      pq: {"query": "Top Three", "format": {"minutes": "0.00"}},
      out: `fault         events  minutes
Low air            5    87.43
Char flare         8    70.05
Hoop misfeed      12    66.57
3 rows`,
    },
    {
      t: "Distinct rows",
      goal: "Keep machine and fault from fault_log and remove the duplicate rows, leaving each pair once.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Faults = Source{[Schema = "dbo", Item = "fault_log"]}[Data],
    Pairs = Table.Distinct(Table.SelectColumns(Faults, {"machine", "fault"}))
in
    Pairs`,
      about: "Table.Distinct removes rows that repeat across every column. Ten machine and fault pairs: low air hits all three machines, the shared cause the TPM track finds, while char flares belong to Char Station 2 alone.",
      terms: [
        ["Table.Distinct", "Table.Distinct", "Each row once."],
      ],
      pq: {"query": "Machine Faults"},
      out: `machine         fault
Hoop Driver 1   Hoop misfeed
Conveyor 3      E-stop
Conveyor 3      Jam
Hoop Driver 1   Low air
Char Station 2  Char flare
Hoop Driver 1   Jam
Char Station 2  E-stop
Hoop Driver 1   E-stop
Char Station 2  Low air
Conveyor 3      Low air
10 rows`,
    },
    {
      t: "Merge: keep every machine",
      goal: "Total shift A's rejects on 2026-11-07 by machine, merge them onto dim_machine with a left outer join, and expand the rejects.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Machines = Source{[Schema = "dbo", Item = "dim_machine"]}[Data],
    Rejects = Source{[Schema = "dbo", Item = "reject_log"]}[Data],
    Today = Table.SelectRows(Rejects, each [ts] >= #datetime(2026, 11, 7, 6, 0, 0)),
    Totals = Table.Group(Today, {"machine"}, {{"rejects", each List.Sum([qty])}}),
    Joined = Table.NestedJoin(Machines, {"machine"}, Totals, {"machine"}, "r", JoinKind.LeftOuter),
    Expanded = Table.ExpandTableColumn(Joined, "r", {"rejects"}),
    Shown = Table.SelectColumns(Expanded, {"machine", "rejects"})
in
    Shown`,
      about: "A merge joins two tables on matching keys. Table.NestedJoin puts each machine's matches in a column of tables, and Table.ExpandTableColumn opens it. With JoinKind.LeftOuter every machine stays, and Char Station 2, with no rejects yet on 7 November, gets null: in a report that null should read 0, a choice to make on purpose.",
      terms: [
        ["Table.NestedJoin", "Table.NestedJoin", "Matches go into a column of tables."],
        ["JoinKind.LeftOuter", "Left outer", "Every row of the first table stays."],
      ],
      pq: {"query": "Rejects Today"},
      out: `machine         rejects
Char Station 2     null
Conveyor 3            5
Hoop Driver 1         3
3 rows`,
    },
    {
      t: "Merge: matches only",
      goal: "The same merge with an inner join, which keeps only the machines with rejects.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Machines = Source{[Schema = "dbo", Item = "dim_machine"]}[Data],
    Rejects = Source{[Schema = "dbo", Item = "reject_log"]}[Data],
    Today = Table.SelectRows(Rejects, each [ts] >= #datetime(2026, 11, 7, 6, 0, 0)),
    Totals = Table.Group(Today, {"machine"}, {{"rejects", each List.Sum([qty])}}),
    Joined = Table.NestedJoin(Machines, {"machine"}, Totals, {"machine"}, "r", JoinKind.Inner),
    Expanded = Table.ExpandTableColumn(Joined, "r", {"rejects"}),
    Shown = Table.SelectColumns(Expanded, {"machine", "rejects"})
in
    Shown`,
      about: "The same merge with JoinKind.Inner keeps only machines that have a match, so Char Station 2 disappears. Inner is right for a list of what happened; left outer is right for a report that must show every machine. Conveyor 3's 5 and Hoop Driver 1's 3 are shift A's rejects in shift_log.csv.",
      terms: [
        ["JoinKind.Inner", "Inner", "Only rows with a match."],
      ],
      pq: {"query": "Machines With Rejects"},
      out: `machine        rejects
Conveyor 3           5
Hoop Driver 1        3
2 rows`,
    },
    {
      t: "Merge: what is missing",
      goal: "Find the machines with no fault since 06:00 on 2026-11-07, using a left anti join from dim_machine to those faults.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Machines = Source{[Schema = "dbo", Item = "dim_machine"]}[Data],
    Faults = Source{[Schema = "dbo", Item = "fault_log"]}[Data],
    Today = Table.SelectRows(Faults, each [start_ts] >= #datetime(2026, 11, 7, 6, 0, 0)),
    Missing = Table.NestedJoin(Machines, {"machine"}, Today, {"machine"}, "f", JoinKind.LeftAnti),
    Shown = Table.SelectColumns(Missing, {"machine", "area"})
in
    Shown`,
      about: "A left anti join keeps the rows of the first table with no match in the second: here, machines with no fault since 06:00. Char Station 2 had none before 10:15 (its char flare starts at 13:41). Anti joins answer \"what is missing?\": machines with no reading, orders with no invoice.",
      terms: [
        ["JoinKind.LeftAnti", "Left anti", "Only rows with no match."],
      ],
      pq: {"query": "No Faults Today"},
      out: `machine         area
Char Station 2  Finishing
1 row`,
    },
    {
      t: "Append two tables",
      goal: "From 06:00 on 2026-11-07, take the faults (machine, start time as ts, kind \"fault\") and the rejects (machine, ts, kind \"reject\"), append them with Table.Combine and sort by time.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Faults = Source{[Schema = "dbo", Item = "fault_log"]}[Data],
    Rejects = Source{[Schema = "dbo", Item = "reject_log"]}[Data],
    Since = #datetime(2026, 11, 7, 6, 0, 0),
    F = Table.RenameColumns(Table.SelectColumns(Table.SelectRows(Faults, each [start_ts] >= Since), {"machine", "start_ts"}), {{"start_ts", "ts"}}),
    R = Table.SelectColumns(Table.SelectRows(Rejects, each [ts] >= Since), {"machine", "ts"}),
    Events = Table.Combine({Table.AddColumn(F, "kind", each "fault"), Table.AddColumn(R, "kind", each "reject")}),
    Sorted = Table.Sort(Events, {{"ts", Order.Ascending}})
in
    Sorted`,
      about: "Table.Combine stacks tables, matching columns by name; a column missing from one gives null. Faults and rejects become one event list for shift A, in time order: the jam at 09:08:52, the 09:40 rejects, the misfeed at 10:09:40. Appending is how weekly files or several plants' extracts become one table.",
      terms: [
        ["Table.Combine", "Table.Combine", "Appends tables."],
        ["\"kind\"", "A source column", "Records which table each row came from."],
      ],
      pq: {"query": "Shift A Events"},
      out: `machine        ts                   kind
Conveyor 3     2026-11-07 09:08:52  fault
Conveyor 3     2026-11-07 09:40:00  reject
Hoop Driver 1  2026-11-07 09:40:00  reject
Hoop Driver 1  2026-11-07 10:09:40  fault
4 rows`,
    },
    {
      t: "A function of your own",
      goal: "Write LostDollars = (minutes, rate, margin) => minutes / 60 * rate * margin. Total each machine's down minutes in the OEE week, merge dim_machine's rate and margin, and add the lost dollars with your function.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Machines = Source{[Schema = "dbo", Item = "dim_machine"]}[Data],
    Faults = Source{[Schema = "dbo", Item = "fault_log"]}[Data],
    LostDollars = (minutes, rate, margin) => minutes / 60 * rate * margin,
    Week = Table.SelectRows(Faults, each [start_ts] >= #datetime(2026, 10, 31, 6, 0, 0) and [start_ts] < #datetime(2026, 11, 7, 6, 0, 0)),
    Down = Table.Group(Week, {"machine"}, {{"down_min", each List.Sum(Table.AddColumn(_, "m", each Duration.TotalMinutes([end_ts] - [start_ts]))[m])}}),
    Joined = Table.NestedJoin(Down, {"machine"}, Machines, {"machine"}, "d", JoinKind.LeftOuter),
    Expanded = Table.ExpandTableColumn(Joined, "d", {"ideal_rate_hr", "margin_per_barrel"}),
    Lost = Table.AddColumn(Expanded, "lost_usd", each LostDollars([down_min], [ideal_rate_hr], [margin_per_barrel])),
    Shown = Table.SelectColumns(Lost, {"machine", "down_min", "lost_usd"})
in
    Shown`,
      about: "(minutes, rate, margin) => … is a function with three named parameters; a step can hold it like any value and call it later. Writing the rule once means every column that prices lost time prices it the same way. Hoop Driver 1's 108.85 down minutes in the OEE week cost $4,240.61 at 55 barrels an hour and the illustrative $42.50 margin.",
      terms: [
        ["=>", "Function", "Parameters, then the body after =>."],
        ["LostDollars", "Your function", "Called like any M function."],
      ],
      pq: {"query": "Lost Dollars", "format": {"down_min": "0.00", "lost_usd": "0.00"}},
      out: `machine         down_min  lost_usd
Hoop Driver 1     108.85   4240.61
Conveyor 3         94.73   4026.17
Char Station 2     87.05   3083.02
3 rows`,
    },
    {
      t: "try and otherwise",
      goal: "Build the minutes four operators typed as text (12, 7.5, n/a, 15), convert each with Number.From inside try … otherwise null, and flag the rows that converted.",
      code: `let
    Entered = Table.FromRecords({
        [machine = "Conveyor 3", typed = "12"],
        [machine = "Hoop Driver 1", typed = "7.5"],
        [machine = "Char Station 2", typed = "n/a"],
        [machine = "Hoop Driver 1", typed = "15"]
    }),
    Parsed = Table.AddColumn(Entered, "minutes", each try Number.From([typed]) otherwise null),
    Flagged = Table.AddColumn(Parsed, "ok", each [minutes] <> null)
in
    Flagged`,
      about: "Number.From turns text into a number and raises an error when it cannot. try … otherwise catches the error and uses the fallback, here null, so one bad entry does not fail the whole refresh. The ok column then flags it for someone to fix. SQL Server's TRY_CAST does the same job. Catching errors without flagging them would hide bad data, which is worse than a failed refresh.",
      terms: [
        ["try", "try … otherwise", "The fallback when the expression errors."],
        ["Number.From", "Number.From", "Text to a number, or an error."],
      ],
      pq: {"query": "Typed Minutes"},
      out: `machine         typed  minutes  ok
Conveyor 3      12          12  true
Hoop Driver 1   7.5        7.5  true
Char Station 2  n/a       null  false
Hoop Driver 1   15          15  true
4 rows`,
    },
  ],
});
