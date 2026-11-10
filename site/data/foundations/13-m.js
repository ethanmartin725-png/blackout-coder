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
    {
      t: "Pivot",
      goal: "In the OEE week, work out each fault's minutes, keep fault, machine and minutes, and pivot the machines into columns, summing the minutes of each fault on each machine.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Faults = Source{[Schema = "dbo", Item = "fault_log"]}[Data],
    Week = Table.SelectRows(Faults, each [start_ts] >= #datetime(2026, 10, 31, 6, 0, 0) and [start_ts] < #datetime(2026, 11, 7, 6, 0, 0)),
    Minutes = Table.AddColumn(Week, "minutes", each Duration.TotalMinutes([end_ts] - [start_ts])),
    Slim = Table.SelectColumns(Minutes, {"fault", "machine", "minutes"}),
    Pivoted = Table.Pivot(Slim, {"Conveyor 3", "Hoop Driver 1", "Char Station 2"}, "machine", "minutes", List.Sum)
in
    Pivoted`,
      about: "Table.Pivot turns the values of one column into columns: here each machine becomes a column of minutes, one row per fault. List.Sum adds the minutes when a fault happened more than once on a machine; without an aggregation, a cell with two values is an error. A blank cell is null: Conveyor 3 never misfed and only Char Station 2 has char flares. Low air reaches all three machines, 36.90 + 34.62 + 15.92 minutes. The machines are listed in the call, so their column order is yours to choose.",
      terms: [
        ["Table.Pivot", "Table.Pivot(table, values, attribute, value, aggregation)", "One column per value, filled from another column."],
        ["List.Sum", "Aggregation", "How two values for one cell are combined."],
      ],
      pq: {"query": "Minutes by Machine", "format": {"Conveyor 3": "0.00", "Hoop Driver 1": "0.00", "Char Station 2": "0.00"}},
      out: `fault         Conveyor 3  Hoop Driver 1  Char Station 2
Hoop misfeed        null          61.23            null
E-stop              7.82           1.90            1.08
Jam                50.02          11.10            null
Low air            36.90          34.62           15.92
Char flare          null           null           70.05
5 rows`,
    },
    {
      t: "Unpivot",
      goal: "Build the same pivot, then unpivot every column except fault back into machine and minutes rows.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Faults = Source{[Schema = "dbo", Item = "fault_log"]}[Data],
    Week = Table.SelectRows(Faults, each [start_ts] >= #datetime(2026, 10, 31, 6, 0, 0) and [start_ts] < #datetime(2026, 11, 7, 6, 0, 0)),
    Minutes = Table.AddColumn(Week, "minutes", each Duration.TotalMinutes([end_ts] - [start_ts])),
    Slim = Table.SelectColumns(Minutes, {"fault", "machine", "minutes"}),
    Pivoted = Table.Pivot(Slim, {"Conveyor 3", "Hoop Driver 1", "Char Station 2"}, "machine", "minutes", List.Sum),
    Unpivoted = Table.UnpivotOtherColumns(Pivoted, {"fault"}, "machine", "minutes")
in
    Unpivoted`,
      about: "Unpivoting goes the other way: every column except fault becomes a machine and minutes row. 15 cells come back as 10 rows because unpivot drops nulls, so a fault that never happened on a machine leaves no row at all. Reports want this long shape: one fact per row, with machine as a column a slicer can filter. When a spreadsheet arrives wide, with a column per machine or per day, unpivot is the first step.",
      terms: [
        ["Table.UnpivotOtherColumns", "Table.UnpivotOtherColumns(table, keep, attribute, value)", "Every column not kept becomes rows."],
        ["{\"fault\"}", "Columns to keep", "The rest are unpivoted."],
      ],
      pq: {"query": "Minutes Long", "format": {"minutes": "0.00"}},
      out: `fault         machine         minutes
Hoop misfeed  Hoop Driver 1     61.23
E-stop        Conveyor 3         7.82
E-stop        Hoop Driver 1      1.90
E-stop        Char Station 2     1.08
Jam           Conveyor 3        50.02
Jam           Hoop Driver 1     11.10
Low air       Conveyor 3        36.90
Low air       Hoop Driver 1     34.62
Low air       Char Station 2    15.92
Char flare    Char Station 2    70.05
10 rows`,
    },
    {
      t: "Replace null with zero",
      goal: "Total shift A's rejects on 2026-11-07 by machine, merge them onto every machine, and replace the null for a machine with none with 0.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Machines = Source{[Schema = "dbo", Item = "dim_machine"]}[Data],
    Rejects = Source{[Schema = "dbo", Item = "reject_log"]}[Data],
    Today = Table.SelectRows(Rejects, each [ts] >= #datetime(2026, 11, 7, 6, 0, 0)),
    Totals = Table.Group(Today, {"machine"}, {{"rejects", each List.Sum([qty])}}),
    Joined = Table.NestedJoin(Machines, {"machine"}, Totals, {"machine"}, "r", JoinKind.LeftOuter),
    Expanded = Table.SelectColumns(Table.ExpandTableColumn(Joined, "r", {"rejects"}), {"machine", "rejects"}),
    Zeroed = Table.ReplaceValue(Expanded, null, 0, Replacer.ReplaceValue, {"rejects"})
in
    Zeroed`,
      about: "After the left join, Char Station 2's rejects were null: no rejects row exists for it. Table.ReplaceValue swaps that null for 0 in the rejects column. Whether to do this is a decision: 0 means \"we checked and there were none\", null means \"no data\". For rejects on a running shift, 0 is the honest answer; for a meter that failed to report, null is.",
      terms: [
        ["Table.ReplaceValue", "Table.ReplaceValue(table, old, new, replacer, columns)", "Replaces one value with another in the columns listed."],
        ["Replacer.ReplaceValue", "Replacer.ReplaceValue", "Replaces whole values that match exactly."],
      ],
      pq: {"query": "Rejects Today, Zeros"},
      out: `machine         rejects
Char Station 2        0
Conveyor 3            5
Hoop Driver 1         3
3 rows`,
    },
    {
      t: "Fill down",
      goal: "Type shift A's stops as a hand sheet where the machine is written only on its first stop, fill the machine down, and total the minutes per machine.",
      code: `let
    Sheet = Table.FromRecords({
        [machine = "Conveyor 3", fault = "Jam", minutes = 4.62],
        [machine = "Hoop Driver 1", fault = "Hoop misfeed", minutes = 7.5],
        [machine = null, fault = "Low air", minutes = 18.5],
        [machine = null, fault = "Low air", minutes = 15.0],
        [machine = "Char Station 2", fault = "Char flare", minutes = 18.75]
    }),
    Filled = Table.FillDown(Sheet, {"machine"}),
    Totals = Table.Group(Filled, {"machine"}, {{"minutes", each List.Sum([minutes])}})
in
    Totals`,
      about: "A hand-kept sheet often writes the machine once and leaves the rows under it blank. Table.FillDown copies the last value down into the nulls, so every stop has its machine again. The totals are shift A's down minutes from the Shift Handoff: Conveyor 3 4.62, Hoop Driver 1 41.00 (7.5 + 18.5 + 15.0), Char Station 2 18.75, its open flare clipped at 14:00. Fill down only fills nulls, never an empty text, so check how blanks arrive from Excel first.",
      terms: [
        ["Table.FillDown", "Table.FillDown(table, columns)", "Each null takes the value above it."],
        ["machine = null", "A blank cell", "The machine was not written on this row."],
      ],
      pq: {"query": "Shift A Sheet", "format": {"minutes": "0.00"}},
      out: `machine         minutes
Conveyor 3         4.62
Hoop Driver 1     41.00
Char Station 2    18.75
3 rows`,
    },
    {
      t: "Search text and lists",
      goal: "Keep the faults whose name contains \"air\" on Hoop Driver 1 or Char Station 2, using Text.Contains and List.Contains, and show fault_id, machine and start_ts.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Faults = Source{[Schema = "dbo", Item = "fault_log"]}[Data],
    Machines = {"Hoop Driver 1", "Char Station 2"},
    Air = Table.SelectRows(Faults, each Text.Contains([fault], "air") and List.Contains(Machines, [machine])),
    Shown = Table.SelectColumns(Air, {"fault_id", "machine", "start_ts"})
in
    Shown`,
      about: "Text.Contains finds \"air\" inside \"Low air\"; it is case-sensitive, so \"Air\" would find nothing. List.Contains checks a value against a list, the M way of writing SQL's IN. Low air has 5 events in all; these are the 3 on Hoop Driver 1 and Char Station 2. Keeping the machine list in its own step makes it one place to change.",
      terms: [
        ["Text.Contains", "Text.Contains", "Whether the text includes a piece; case matters."],
        ["List.Contains", "List.Contains", "Whether the list holds the value, like IN."],
      ],
      pq: {"query": "Low Air on Two Machines"},
      out: `fault_id  machine         start_ts
       5  Hoop Driver 1   2026-11-01 02:54:37
      17  Char Station 2  2026-11-02 17:29:13
      24  Hoop Driver 1   2026-11-04 11:42:21
3 rows`,
    },
    {
      t: "Codes with padding",
      goal: "Add a code F and the fault_id padded to four digits with zeros, and a key from the fault name with spaces replaced by underscores.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Faults = Source{[Schema = "dbo", Item = "fault_log"]}[Data],
    Code = Table.AddColumn(Faults, "code", each "F" & Text.PadStart(Text.From([fault_id]), 4, "0")),
    Key = Table.AddColumn(Code, "key", each Text.Replace([fault], " ", "_")),
    Shown = Table.SelectColumns(Key, {"code", "machine", "key"})
in
    Shown`,
      about: "Text.PadStart pads on the left to a fixed width, so fault 1 becomes F0001 and codes sort the same as text and as numbers. Text.Replace swaps every space for an underscore, a key a system that dislikes spaces can take. Padded codes like these are common in ERP and MES exports; four digits allow 9,999 faults before the width has to change.",
      terms: [
        ["Text.PadStart", "Text.PadStart(text, width, pad)", "Pads on the left to the width."],
        ["Text.Replace", "Text.Replace", "Replaces every occurrence."],
      ],
      pq: {"query": "Fault Codes", "top": 5},
      out: `code   machine        key
F0001  Hoop Driver 1  Hoop_misfeed
F0002  Conveyor 3     E-stop
F0003  Hoop Driver 1  Hoop_misfeed
F0004  Conveyor 3     Jam
F0005  Hoop Driver 1  Low_air
47 rows, first 5 shown`,
    },
    {
      t: "Weeks that start on Saturday",
      goal: "Add each fault's week start and day of the week, both with Saturday as the first day, then count the faults for each week and day.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Faults = Source{[Schema = "dbo", Item = "fault_log"]}[Data],
    WeekStart = Table.AddColumn(Faults, "week_start", each Date.StartOfWeek([start_ts], Day.Saturday)),
    Day = Table.AddColumn(WeekStart, "day", each Date.DayOfWeek([start_ts], Day.Saturday)),
    Counted = Table.Group(Day, {"week_start", "day"}, {{"faults", each Table.RowCount(_)}})
in
    Counted`,
      about: "The OEE week starts on Saturday, so the week functions are given Day.Saturday. Day 0 is Saturday and 6 is Friday. The first calendar week holds 44 faults, not the OEE week's 45: fault 45 started at 04:10 on Saturday 7 November, which is the new calendar week but still the OEE week, because that week runs 06:00 to 06:00. A week start from Date.StartOfWeek follows the calendar; a production week needs the six-hour shift first. This model requires the first day to be passed in, because M's default depends on the culture setting.",
      terms: [
        ["Day.Saturday", "Day.Saturday", "The day the week starts."],
        ["Date.StartOfWeek", "Date.StartOfWeek", "Midnight on the week's first day."],
        ["Date.DayOfWeek", "Date.DayOfWeek", "0 for the first day of the week."],
      ],
      pq: {"query": "Faults by Week Day"},
      out: `week_start           day  faults
2026-10-31 00:00:00    0       2
2026-10-31 00:00:00    1      12
2026-10-31 00:00:00    2       3
2026-10-31 00:00:00    3       6
2026-10-31 00:00:00    4       6
2026-10-31 00:00:00    5       5
2026-10-31 00:00:00    6      10
2026-11-07 00:00:00    0       3
8 rows`,
    },
    {
      t: "A duration in hours and minutes",
      goal: "Total each machine's down seconds in the OEE week, turn them into a duration, and pull out its hours and minutes.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Faults = Source{[Schema = "dbo", Item = "fault_log"]}[Data],
    Week = Table.SelectRows(Faults, each [start_ts] >= #datetime(2026, 10, 31, 6, 0, 0) and [start_ts] < #datetime(2026, 11, 7, 6, 0, 0)),
    Seconds = Table.AddColumn(Week, "secs", each Duration.TotalSeconds([end_ts] - [start_ts])),
    Totals = Table.Group(Seconds, {"machine"}, {{"secs", each List.Sum([secs])}}),
    Down = Table.AddColumn(Totals, "down", each #duration(0, 0, 0, [secs])),
    Hours = Table.AddColumn(Down, "hours", each Duration.Hours([down])),
    Mins = Table.AddColumn(Hours, "minutes", each Duration.Minutes([down]))
in
    Mins`,
      about: "Durations carry their own parts: Duration.Hours and Duration.Minutes are the hours and minutes on the clock face, not totals. Hoop Driver 1's 6,531 seconds of stops in the OEE week are 1 hour 48 minutes 51 seconds, the 108.85 minutes of the OEE track. #duration(0, 0, 0, seconds) builds one from seconds. Use Duration.TotalMinutes for arithmetic and the parts only for display.",
      terms: [
        ["Duration.Hours", "Duration.Hours", "The hours part, not total hours."],
        ["Duration.TotalSeconds", "Duration.TotalSeconds", "The whole duration in seconds."],
        ["#duration(0, 0, 0, [secs])", "Build a duration", "Days, hours, minutes, seconds."],
      ],
      pq: {"query": "Down as Hours"},
      out: `machine         secs  down        hours  minutes
Hoop Driver 1   6531  0.01:48:51      1       48
Conveyor 3      5684  0.01:34:44      1       34
Char Station 2  5223  0.01:27:03      1       27
3 rows`,
    },
    {
      t: "Change a column in place",
      goal: "Work out the closed faults' minutes, then round the minutes column to one place in place with Table.TransformColumns.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Faults = Source{[Schema = "dbo", Item = "fault_log"]}[Data],
    Closed = Table.SelectRows(Faults, each [end_ts] <> null),
    Minutes = Table.AddColumn(Closed, "minutes", each Duration.TotalMinutes([end_ts] - [start_ts])),
    Rounded = Table.TransformColumns(Minutes, {{"minutes", each Number.Round(_, 1)}}),
    Shown = Table.SelectColumns(Rounded, {"fault_id", "fault", "minutes"})
in
    Shown`,
      about: "Table.TransformColumns changes a column's values where they are, with _ standing for each value, instead of adding a new column and removing the old. Look at fault 5: 17.85 minutes rounds to 17.8, because M rounds half to even and 8 is even. SQL Server's ROUND and Excel's give 17.9. Round only for display; keep the full minutes for totals.",
      terms: [
        ["Table.TransformColumns", "Table.TransformColumns(table, {{column, function}})", "Changes a column in place."],
        ["_", "_", "The value being transformed."],
      ],
      pq: {"query": "Rounded Minutes", "top": 5},
      out: `fault_id  fault         minutes
       1  Hoop misfeed      5.7
       2  E-stop            3.3
       3  Hoop misfeed        4
       4  Jam               4.6
       5  Low air          17.8
46 rows, first 5 shown`,
    },
    {
      t: "Rank the Pareto",
      goal: "Build the Pareto of all 47 faults to 10:15 (minutes by fault, largest first) and number its rows from 1 with Table.AddIndexColumn.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Faults = Source{[Schema = "dbo", Item = "fault_log"]}[Data],
    Now = #datetime(2026, 11, 7, 10, 15, 0),
    Minutes = Table.AddColumn(Faults, "minutes", each Duration.TotalMinutes((if [end_ts] = null then Now else [end_ts]) - [start_ts])),
    Grouped = Table.Group(Minutes, {"fault"}, {{"minutes", each List.Sum([minutes])}}),
    Sorted = Table.Sort(Grouped, {{"minutes", Order.Descending}}),
    Ranked = Table.AddIndexColumn(Sorted, "rank", 1, 1)
in
    Ranked`,
      about: "Table.AddIndexColumn numbers the rows from a start by a step: 1, 2, 3 after the sort, so the number is the rank. The index follows the rows as they are, so sort first. Low air ranks first with 87.43 minutes.",
      terms: [
        ["Table.AddIndexColumn", "Table.AddIndexColumn(table, name, start, step)", "Numbers the rows."],
      ],
      pq: {"query": "Ranked Pareto", "format": {"minutes": "0.00"}},
      out: `fault         minutes  rank
Low air         87.43     1
Char flare      70.05     2
Hoop misfeed    66.57     3
Jam             65.73     4
E-stop          10.80     5
5 rows`,
    },
    {
      t: "A running total",
      goal: "Rank the Pareto, take its minutes as a list, and add each row's cumulative share: the sum of the first rank minutes over the sum of all.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Faults = Source{[Schema = "dbo", Item = "fault_log"]}[Data],
    Now = #datetime(2026, 11, 7, 10, 15, 0),
    Minutes = Table.AddColumn(Faults, "minutes", each Duration.TotalMinutes((if [end_ts] = null then Now else [end_ts]) - [start_ts])),
    Grouped = Table.Group(Minutes, {"fault"}, {{"minutes", each List.Sum([minutes])}}),
    Sorted = Table.Sort(Grouped, {{"minutes", Order.Descending}}),
    Ranked = Table.AddIndexColumn(Sorted, "rank", 1, 1),
    Mins = Sorted[minutes],
    Cumulative = Table.AddColumn(Ranked, "cum_share", each List.Sum(List.FirstN(Mins, [rank])) / List.Sum(Mins))
in
    Cumulative`,
      about: "The cumulative share adds each row's minutes to all those above it: List.FirstN takes the first rank minutes of the list and List.Sum adds them. Low air and char flare are 52.4% of the minutes; with hoop misfeeds, 74.5%: three causes of five carry three quarters of the loss. This works row by row, so it is fine for a Pareto of five; for thousands of rows, List.Accumulate or a running total in DAX scales better.",
      terms: [
        ["List.FirstN", "List.FirstN", "The first n items of a list."],
        ["Sorted[minutes]", "The minutes as a list", "Read once, used on every row."],
      ],
      pq: {"query": "Cumulative Pareto", "format": {"minutes": "0.00", "cum_share": "0.0%"}},
      out: `fault         minutes  rank  cum_share
Low air         87.43     1      29.1%
Char flare      70.05     2      52.4%
Hoop misfeed    66.57     3      74.5%
Jam             65.73     4      96.4%
E-stop          10.80     5     100.0%
5 rows`,
    },
    {
      t: "Fold a list",
      goal: "Take the OEE week's fault minutes as a list and fold it with List.Accumulate into a record of the count and the total, starting from zero.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Faults = Source{[Schema = "dbo", Item = "fault_log"]}[Data],
    Week = Table.SelectRows(Faults, each [start_ts] >= #datetime(2026, 10, 31, 6, 0, 0) and [start_ts] < #datetime(2026, 11, 7, 6, 0, 0)),
    Mins = Table.AddColumn(Week, "m", each Duration.TotalMinutes([end_ts] - [start_ts]))[m],
    Folded = List.Accumulate(Mins, [n = 0, total = 0], (state, m) => [n = state[n] + 1, total = state[total] + m]),
    Result = [faults = Folded[n], minutes = Number.Round(Folded[total], 2)]
in
    Result`,
      about: "List.Accumulate walks a list carrying a state: here a record of the count so far and the total so far, starting from zero. The function takes the state and the next item and returns the new state. 45 faults, 290.63 minutes: the OEE week, the TPM track's total. Any running calculation, a running maximum or a reset at each shift, can be written as a fold.",
      terms: [
        ["List.Accumulate", "List.Accumulate(list, seed, (state, item) => …)", "Folds a list into one value."],
        ["[n = 0, total = 0]", "Seed", "The state before the first item."],
      ],
      pq: {"query": "Week Totals"},
      out: `Field     Value
faults       45
minutes  290.63
2 rows`,
    },
    {
      t: "A record as a table",
      goal: "Pick Hoop Driver 1's row from dim_machine and turn the record into a Name and Value table with Record.ToTable.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Machines = Source{[Schema = "dbo", Item = "dim_machine"]}[Data],
    Hoop = Machines{[machine = "Hoop Driver 1"]},
    Fields = Record.ToTable(Hoop)
in
    Fields`,
      about: "Record.ToTable turns a record into Name and Value rows, which is how to show one item's details as a list or join them to something else. These are Hoop Driver 1's dim_machine fields: Assembly, 55 barrels an hour, the illustrative $42.50 margin.",
      terms: [
        ["Record.ToTable", "Record.ToTable", "Name and Value rows."],
      ],
      pq: {"query": "Hoop Driver 1 Fields"},
      out: `Name               Value
machine            Hoop Driver 1
area               Assembly
ideal_rate_hr      55
margin_per_barrel  42.5
4 rows`,
    },
    {
      t: "Typed functions",
      goal: "Write LostDollars with every parameter typed as number and a number result, then return a list of its result for Hoop Driver 1's week, rounded to 2 places, and of calling it with text, caught by try.",
      code: `let
    LostDollars = (minutes as number, rate as number, margin as number) as number => minutes / 60 * rate * margin,
    Checks = {
        Number.Round(LostDollars(108.85, 55, 42.5), 2),
        try LostDollars("108.85", 55, 42.5) otherwise "not a number"
    }
in
    Checks`,
      about: "as number on each parameter and after the brackets makes the function check its arguments and its result. Given the text \"108.85\", it raises an error instead of quietly returning nonsense, and try catches it. A type like number does not include null; nullable number does. Types are worth adding to any function other queries call, because the error lands where the bad value enters.",
      terms: [
        ["as number", "Type annotation", "The value must be a number, and not null."],
        ["try", "try … otherwise", "Catches the type error."],
      ],
      pq: {"query": "Typed Check"},
      out: `List
4240.61
not a number
2 rows`,
    },
    {
      t: "Keep the rows that converted",
      goal: "Convert the four typed minutes with try, keep the rows that converted, and total their minutes.",
      code: `let
    Entered = Table.FromRecords({
        [machine = "Conveyor 3", typed = "12"],
        [machine = "Hoop Driver 1", typed = "7.5"],
        [machine = "Char Station 2", typed = "n/a"],
        [machine = "Hoop Driver 1", typed = "15"]
    }),
    Parsed = Table.AddColumn(Entered, "minutes", each try Number.From([typed]) otherwise null),
    Good = Table.SelectRows(Parsed, each [minutes] <> null),
    Total = [rows = Table.RowCount(Good), skipped = Table.RowCount(Parsed) - Table.RowCount(Good), minutes = List.Sum(Good[minutes])]
in
    Total`,
      about: "Converting with try leaves null where a value would not convert; keeping only the non-null rows and counting what was skipped means a refresh never silently drops data. 3 rows convert, 1 is skipped (the n/a), and the minutes total 34.5. Report the skipped count beside the total so someone fixes the source.",
      terms: [
        ["Table.RowCount", "Table.RowCount", "Rows in the table."],
        ["Good[minutes]", "Column as a list", "The converted minutes."],
      ],
      pq: {"query": "Typed Minutes Total"},
      out: `Field    Value
rows         3
skipped      1
minutes   34.5
3 rows`,
    },
    {
      t: "Shift summary",
      goal: "For the OEE week, add each fault's minutes and shift, pivot the shifts A, B and C into columns by machine, add a total across them, and sort by machine.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Faults = Source{[Schema = "dbo", Item = "fault_log"]}[Data],
    Week = Table.SelectRows(Faults, each [start_ts] >= #datetime(2026, 10, 31, 6, 0, 0) and [start_ts] < #datetime(2026, 11, 7, 6, 0, 0)),
    Minutes = Table.AddColumn(Week, "minutes", each Duration.TotalMinutes([end_ts] - [start_ts])),
    Shifts = Table.AddColumn(Minutes, "shift", each
        if Time.Hour([start_ts]) >= 6 and Time.Hour([start_ts]) < 14 then "A"
        else if Time.Hour([start_ts]) >= 14 and Time.Hour([start_ts]) < 22 then "B"
        else "C"),
    Slim = Table.SelectColumns(Shifts, {"machine", "shift", "minutes"}),
    Pivoted = Table.Pivot(Slim, {"A", "B", "C"}, "shift", "minutes", List.Sum),
    Total = Table.AddColumn(Pivoted, "total", each List.Sum({[A], [B], [C]})),
    Sorted = Table.Sort(Total, {{"machine", Order.Ascending}})
in
    Sorted`,
      about: "Everything together: a column worked out per row, a shift from the hour, a pivot of the shifts into columns, and a total across them. The totals are the OEE week's down minutes, 87.05 / 94.73 / 108.85. Shift B and C match the DAX lane's 105.63 and 123.93; shift A is 61.06 here against its 71.02 because the DAX figure includes shift A's two faults on 7 November, after the OEE week. List.Sum skips nulls, so a machine with no stops in a shift still totals correctly.",
      terms: [
        ["Table.Pivot", "Pivot the shifts", "A, B and C become columns."],
        ["List.Sum({[A], [B], [C]})", "Total across", "Adds the row's shift columns, skipping nulls."],
      ],
      pq: {"query": "Shift Summary", "format": {"A": "0.00", "B": "0.00", "C": "0.00", "total": "0.00"}},
      out: `machine             A      B      C   total
Char Station 2   7.98  40.03  39.03   87.05
Conveyor 3      20.83  27.28  46.62   94.73
Hoop Driver 1   32.25  38.32  38.28  108.85
3 rows`,
    },
  ],
});
