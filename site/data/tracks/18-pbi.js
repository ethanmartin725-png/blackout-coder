// Project track 18: OEE Report in Power BI (Power Query M and DAX)
// Outputs: node tools/output-checks/pq/run.mjs (teaching models of M and DAX; every step has a SQL twin). Semantics: docs/PQ_MODEL.md, docs/DAX_MODEL.md.
// M steps are named queries (file = the query name); their outputs with load: true become the DAX steps' model tables.
BC.addTrack({
  id: "t-pbi",
  name: "OEE Report in Power BI",
  sub: "Power Query shapes PlantDB into a model, then DAX measures, a date table, a dynamic title, high-performance color and a refresh check build the OEE report",
  lessons: [
    {
      lang: "m",
      file: "fault_log",
      t: "Connect and navigate",
      goal: "Write a query fault_log: connect to PlantDB on plant-sql01 with Sql.Database, then pick the dbo.fault_log table from the navigation table.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    fault_log = Source{[Schema = "dbo", Item = "fault_log"]}[Data]
in
    fault_log`,
      about: "Power Query is the part of Power BI that gets and shapes data before it reaches the model. A query is a let expression: named steps, each built on the one before, and in names the result. Sql.Database returns a navigation table of everything in the database; {[Schema = \"dbo\", Item = \"fault_log\"]} picks one row of it and [Data] opens its table. The 47 faults are the DB Pulls track's. Power Query only runs inside Power BI and Excel, so these outputs come from a teaching model of M, and each step is checked against the same question asked of SQL Server.",
      terms: [
        ["Sql.Database", "Sql.Database(server, database)", "Connects to SQL Server and returns its navigation table."],
        ["Source", "Step name", "Each line of the let is a named step."],
        ["[Data]", "[Data]", "Opens the table from the navigation row."],
      ],
      pq: {"query":"fault_log","top":4,"load":false},
      out: `fault_id  machine        fault         start_ts             end_ts
       1  Hoop Driver 1  Hoop misfeed  2026-10-31 14:37:59  2026-10-31 14:43:41
       2  Conveyor 3     E-stop        2026-10-31 21:11:40  2026-10-31 21:14:59
       3  Hoop Driver 1  Hoop misfeed  2026-11-01 01:04:59  2026-11-01 01:09:01
       4  Conveyor 3     Jam           2026-11-01 01:36:12  2026-11-01 01:40:49
47 rows, first 4 shown`,
    },
    {
      lang: "m",
      file: "Week Faults",
      t: "Keep the OEE week",
      goal: "Write a query Week Faults that starts from fault_log and keeps faults starting on or after 2026-10-31 06:00 and before 2026-11-07 06:00, with Table.SelectRows.",
      code: `let
    Source = fault_log,
    Week = Table.SelectRows(Source, each [start_ts] >= #datetime(2026, 10, 31, 6, 0, 0) and [start_ts] < #datetime(2026, 11, 7, 6, 0, 0))
in
    Week`,
      about: "A query can start from another query by name, so each stage of the shaping is its own query you can preview. each [start_ts] >= … is a small function run on every row; [start_ts] is that row's field. 45 of the 47 faults fall in the OEE week. Filtering here, before the data loads, means every visual and measure in the report uses the same week without repeating the dates.",
      terms: [
        ["Table.SelectRows", "Table.SelectRows(table, condition)", "Keeps the rows where the condition is true."],
        ["each", "each", "A function of the current row; [column] reads its fields."],
        ["#datetime", "#datetime(y, m, d, h, min, s)", "A date and time value."],
      ],
      pq: {"query":"Week Faults","top":4,"load":false},
      out: `fault_id  machine        fault         start_ts             end_ts
       1  Hoop Driver 1  Hoop misfeed  2026-10-31 14:37:59  2026-10-31 14:43:41
       2  Conveyor 3     E-stop        2026-10-31 21:11:40  2026-10-31 21:14:59
       3  Hoop Driver 1  Hoop misfeed  2026-11-01 01:04:59  2026-11-01 01:09:01
       4  Conveyor 3     Jam           2026-11-01 01:36:12  2026-11-01 01:40:49
45 rows, first 4 shown`,
    },
    {
      lang: "m",
      file: "Fault Minutes",
      t: "Add the minutes",
      goal: "Write a query Fault Minutes from Week Faults that adds a minutes column: end_ts minus start_ts, as total minutes, typed as a number.",
      code: `let
    Source = #"Week Faults",
    Minutes = Table.AddColumn(Source, "minutes", each Duration.TotalMinutes([end_ts] - [start_ts]), type number)
in
    Minutes`,
      about: "Subtracting two date-times gives a duration; Duration.TotalMinutes turns it into minutes with decimals. #\"Week Faults\" is how M writes a name with a space in it. type number tells the model the column's type, which Power BI uses for sorting and summing. All 45 week faults have closed, so no row needs a fallback for a missing end time.",
      terms: [
        ["Table.AddColumn", "Table.AddColumn(table, name, each …, type)", "Adds a column worked out row by row."],
        ["Duration.TotalMinutes", "Duration.TotalMinutes", "A duration as minutes, with decimals."],
        ["#\"Week Faults\"", "#\"…\"", "A name with spaces in it."],
      ],
      pq: {"query":"Fault Minutes","top":4,"load":false,"format":{"minutes":"0.00"}},
      out: `fault_id  machine        fault         start_ts             end_ts               minutes
       1  Hoop Driver 1  Hoop misfeed  2026-10-31 14:37:59  2026-10-31 14:43:41     5.70
       2  Conveyor 3     E-stop        2026-10-31 21:11:40  2026-10-31 21:14:59     3.32
       3  Hoop Driver 1  Hoop misfeed  2026-11-01 01:04:59  2026-11-01 01:09:01     4.03
       4  Conveyor 3     Jam           2026-11-01 01:36:12  2026-11-01 01:40:49     4.62
45 rows, first 4 shown`,
    },
    {
      lang: "m",
      file: "Faults",
      t: "Shift and shift date",
      goal: "Write a query Faults from Fault Minutes: add shift (A from 06:00, B from 14:00, C otherwise) and shift_date (the date of start_ts less 6 hours), then keep fault_id, machine, fault, start_ts, minutes, shift and shift_date. This query loads into the report.",
      code: `let
    Source = #"Fault Minutes",
    Shift = Table.AddColumn(Source, "shift", each if Time.Hour([start_ts]) >= 6 and Time.Hour([start_ts]) < 14 then "A" else if Time.Hour([start_ts]) >= 14 and Time.Hour([start_ts]) < 22 then "B" else "C", type text),
    ShiftDate = Table.AddColumn(Shift, "shift_date", each Date.From([start_ts] - #duration(0, 6, 0, 0)), type date),
    Kept = Table.SelectColumns(ShiftDate, {"fault_id", "machine", "fault", "start_ts", "minutes", "shift", "shift_date"})
in
    Kept`,
      about: "The same shift and shift-date rules as the DAX lane, done once in Power Query so the model gets them as plain columns. M's if always has an else; nesting a second if gives three shifts. Taking 6 hours off the start puts a fault after midnight on the plant day it belongs to. Table.SelectColumns drops end_ts: a model with fewer columns is smaller and faster. This is the first query that loads into the report, as the table Faults.",
      terms: [
        ["Time.Hour", "Time.Hour", "The hour of a date-time, 0 to 23."],
        ["#duration", "#duration(days, hours, minutes, seconds)", "A length of time."],
        ["Date.From", "Date.From", "The date part of a date-time."],
        ["Table.SelectColumns", "Table.SelectColumns", "Keeps only the columns listed, in that order."],
      ],
      pq: {"query":"Faults","top":4,"load":true,"format":{"minutes":"0.00"}},
      out: `fault_id  machine        fault         start_ts             minutes  shift  shift_date
       1  Hoop Driver 1  Hoop misfeed  2026-10-31 14:37:59     5.70  B      2026-10-31
       2  Conveyor 3     E-stop        2026-10-31 21:11:40     3.32  B      2026-10-31
       3  Hoop Driver 1  Hoop misfeed  2026-11-01 01:04:59     4.03  C      2026-10-31
       4  Conveyor 3     Jam           2026-11-01 01:36:12     4.62  C      2026-10-31
45 rows, first 4 shown`,
    },
    {
      lang: "m",
      file: "Down by Machine",
      t: "Group by machine",
      goal: "Write a query Down by Machine from Faults: group by machine, counting rows as faults and summing minutes as down_min, then sort by machine.",
      code: `let
    Source = Faults,
    Grouped = Table.Group(Source, {"machine"}, {{"faults", each Table.RowCount(_), Int64.Type}, {"down_min", each List.Sum([minutes]), type number}}),
    Sorted = Table.Sort(Grouped, {{"machine", Order.Ascending}})
in
    Sorted`,
      about: "Table.Group is Power Query's GROUP BY. Each aggregation gets a name, a function and a type; inside it, _ is the group's rows as a table and [minutes] is that column as a list. The down minutes are the OEE report's: 87.05, 94.73 and 108.85. This query is a check, not loaded: the model works from the detail, and measures do the summing.",
      terms: [
        ["Table.Group", "Table.Group(table, keys, aggregations)", "One row per key, with each aggregation worked out on its rows."],
        ["_", "_", "The group's rows, as a table."],
        ["List.Sum", "List.Sum", "Adds up a list."],
      ],
      pq: {"query":"Down by Machine","load":false,"format":{"down_min":"0.00"}},
      out: `machine         faults  down_min
Char Station 2      10     87.05
Conveyor 3          18     94.73
Hoop Driver 1       17    108.85
3 rows`,
    },
    {
      lang: "m",
      file: "Machines",
      t: "Merge the machine rates",
      goal: "Write a query Machines: navigate to dbo.dim_machine, merge Down by Machine onto it by machine with a left outer join, and expand faults and down_min. This query loads into the report.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    dim_machine = Source{[Schema = "dbo", Item = "dim_machine"]}[Data],
    Merged = Table.NestedJoin(dim_machine, {"machine"}, #"Down by Machine", {"machine"}, "Down", JoinKind.LeftOuter),
    Expanded = Table.ExpandTableColumn(Merged, "Down", {"faults", "down_min"})
in
    Expanded`,
      about: "A merge is Power Query's join. Table.NestedJoin puts each machine's matching rows in a new column as a small table, and Table.ExpandTableColumn opens it into ordinary columns. A left outer join keeps every machine, so one with no faults would show null rather than vanish. The result loads as Machines, the dimension every fact table relates to, with the week's faults and down minutes alongside the rate and margin.",
      terms: [
        ["Table.NestedJoin", "Table.NestedJoin", "Joins two tables; matches go into a column of tables."],
        ["JoinKind.LeftOuter", "JoinKind.LeftOuter", "Keep every row of the first table."],
        ["Table.ExpandTableColumn", "Table.ExpandTableColumn", "Opens the nested tables into columns."],
      ],
      pq: {"query":"Machines","load":true,"format":{"down_min":"0.00","margin_per_barrel":"0.00"}},
      out: `machine         area       ideal_rate_hr  margin_per_barrel  faults  down_min
Char Station 2  Finishing             50              42.50      10     87.05
Conveyor 3      Assembly              60              42.50      18     94.73
Hoop Driver 1   Assembly              55              42.50      17    108.85
3 rows`,
    },
    {
      lang: "m",
      file: "Barrels",
      t: "Barrels in the week",
      goal: "Write a query Barrels: navigate to dbo.v_hourly_barrels, keep readings after 2026-10-31 06:00 up to and including 2026-11-07 06:00, and group by machine, summing made_this_hour as barrels. This query loads into the report.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    Hourly = Source{[Schema = "dbo", Item = "v_hourly_barrels"]}[Data],
    Week = Table.SelectRows(Hourly, each [ts] > #datetime(2026, 10, 31, 6, 0, 0) and [ts] <= #datetime(2026, 11, 7, 6, 0, 0)),
    Grouped = Table.Group(Week, {"machine"}, {{"barrels", each List.Sum([made_this_hour]), Int64.Type}})
in
    Grouped`,
      about: "Views show up in the navigator like tables, so the OEE track's v_hourly_barrels is one click away. A reading counts the hour that ends at its time, so the window is after the start and up to the end, as in the OEE report. Grouping before loading leaves the model 3 rows instead of 504, which is fine because no visual needs the hours. The totals are the canonical 6,980, 7,120 and 6,410.",
      terms: [
        ["v_hourly_barrels", "A view", "Listed in the navigator alongside the tables."],
        ["Int64.Type", "Int64.Type", "A whole-number column type."],
      ],
      pq: {"query":"Barrels","load":true},
      out: `machine         barrels
Char Station 2     6980
Conveyor 3         7120
Hoop Driver 1      6410
3 rows`,
    },
    {
      lang: "m",
      file: "Rejects",
      t: "Rejects in the week",
      goal: "Write a query Rejects: navigate to dbo.reject_log, keep rows from 2026-10-31 06:00 up to (not including) 2026-11-07 06:00, and group by machine, summing qty as rejects. This query loads into the report.",
      code: `let
    Source = Sql.Database("plant-sql01", "PlantDB"),
    reject_log = Source{[Schema = "dbo", Item = "reject_log"]}[Data],
    Week = Table.SelectRows(reject_log, each [ts] >= #datetime(2026, 10, 31, 6, 0, 0) and [ts] < #datetime(2026, 11, 7, 6, 0, 0)),
    Grouped = Table.Group(Week, {"machine"}, {{"rejects", each List.Sum([qty]), Int64.Type}})
in
    Grouped`,
      about: "The same pattern for rejects: a reject is logged at a moment, so the window includes the start and stops before the end. 211, 142 and 96, the OEE report's figures. Three small queries, each one table, each related to Machines in the model.",
      terms: [
        ["reject_log", "reject_log", "Barrels scrapped or reworked."],
        ["List.Sum([qty])", "Sum of qty", "The group's rejects added up."],
      ],
      pq: {"query":"Rejects","load":true},
      out: `machine         rejects
Char Station 2      211
Conveyor 3          142
Hoop Driver 1        96
3 rows`,
    },
    {
      lang: "m",
      file: "Dates",
      t: "A date table",
      goal: "Write a query Dates: a list of the 7 dates from 2026-10-31 with List.Dates, turned into a table with a Date column, typed as date, plus a day column with the weekday name. This query loads into the report.",
      code: `let
    Days = List.Dates(#date(2026, 10, 31), 7, #duration(1, 0, 0, 0)),
    AsTable = Table.FromList(Days, Splitter.SplitByNothing(), {"Date"}),
    Typed = Table.TransformColumnTypes(AsTable, {{"Date", type date}}),
    DayName = Table.AddColumn(Typed, "day", each Date.DayOfWeekName([Date]), type text)
in
    DayName`,
      about: "Reports slice by day, so the model needs a date table with one row per date, built here rather than taken from the faults (a day with no faults would otherwise be missing). List.Dates makes the dates, Table.FromList turns the list into a one-column table, and the type step makes Power BI treat it as dates. The plant week starts on a Saturday.",
      terms: [
        ["List.Dates", "List.Dates(start, count, step)", "A list of dates."],
        ["Table.FromList", "Table.FromList", "A list into a one-column table."],
        ["Date.DayOfWeekName", "Date.DayOfWeekName", "The weekday's name."],
      ],
      pq: {"query":"Dates","load":true},
      out: `Date        day
2026-10-31  Saturday
2026-11-01  Sunday
2026-11-02  Monday
2026-11-03  Tuesday
2026-11-04  Wednesday
2026-11-05  Thursday
2026-11-06  Friday
7 rows`,
    },
    {
      lang: "dax",
      file: "Measures",
      t: "Measures on the shaped data",
      goal: "In the model, write Down Minutes as the sum of Faults[minutes] and Faults Count as the rows of Faults. Show them by machine.",
      code: `Down Minutes = SUM(Faults[minutes])
Faults Count = COUNTROWS(Faults)`,
      about: "The loaded queries are now tables in the model, related to Machines on machine and to Dates on shift_date. Because Power Query already kept only the OEE week, these measures need no date filter at all: compare the DAX lane, where every measure carried the week's dates. Filtering once, in Power Query, is simpler; the cost is that the report can only ever show this week.",
      terms: [
        ["Faults[minutes]", "Loaded column", "The minutes column the Faults query made."],
        [null, "Model", "The loaded queries as related tables."],
      ],
      dax: {"rows":"Machines[machine]","values":["Faults Count","Down Minutes"],"format":{"Down Minutes":"0.00"}},
      out: `machine         Faults Count  Down Minutes
Char Station 2            10         87.05
Conveyor 3                18         94.73
Hoop Driver 1             17        108.85
Total                     45        290.63`,
    },
    {
      lang: "dax",
      file: "Measures",
      t: "OEE measures",
      goal: "Write Planned Min (7 × 3 × 450 per machine), Availability, Barrels Made, Rejected, Ideal Count, Performance, Quality and OEE.",
      code: `Planned Min = SUMX(Machines, 7 * 3 * 450)
Availability = DIVIDE([Planned Min] - [Down Minutes], [Planned Min])
Barrels Made = SUM(Barrels[barrels])
Rejected = SUM(Rejects[rejects])
Ideal Count = SUMX(Machines, ([Planned Min] - [Down Minutes]) / 60 * Machines[ideal_rate_hr])
Performance = DIVIDE([Barrels Made], [Ideal Count])
Quality = DIVIDE([Barrels Made] - [Rejected], [Barrels Made])
OEE = [Availability] * [Performance] * [Quality]`,
      about: "The DAX lane's OEE measures on Power Query's tables: 86.0%, 73.8% and 72.9%, and 77.2% for the plant, the same figures as the OEE Loss Report. Barrels Made and Rejected are measures, not plain SUMs inside SUMX: a measure inside an iterator sees one machine at a time, a bare SUM would see them all.",
      terms: [
        ["Barrels[barrels]", "Barrels table", "One row per machine, from the Barrels query."],
        ["[Barrels Made]", "Measure in SUMX", "Worked out per machine inside the iterator."],
      ],
      dax: {"rows":"Machines[machine]","values":["Availability","Performance","Quality","OEE"],"format":{"Availability":"0.0%","Performance":"0.0%","Quality":"0.0%","OEE":"0.0%"}},
      out: `machine         Availability  Performance  Quality    OEE
Char Station 2         99.1%        89.5%    97.0%  86.0%
Conveyor 3             99.0%        76.1%    98.0%  73.8%
Hoop Driver 1          98.8%        74.9%    98.5%  72.9%
Total                  99.0%        79.7%    97.8%  77.2%`,
    },
    {
      lang: "dax",
      file: "Measures",
      t: "Loss dollars",
      goal: "Write Loss Dollars: for each machine, planned output minus good barrels, times its margin, summed with SUMX.",
      code: `Loss Dollars = SUMX(Machines, ([Planned Min] / 60 * Machines[ideal_rate_hr] - ([Barrels Made] - [Rejected])) * Machines[margin_per_barrel])`,
      about: "The OEE report's weekly loss, $251,876, now in the report itself. Margin comes from the Machines query, so a change to dim_machine flows into the dollars at the next refresh.",
      terms: [
        ["Machines[margin_per_barrel]", "Margin", "From dim_machine, through the Machines query."],
      ],
      dax: {"rows":"Machines[machine]","values":["OEE","Loss Dollars"],"format":{"OEE":"0.0%","Loss Dollars":"$#,0"}},
      out: `machine           OEE  Loss Dollars
Char Station 2  86.0%       $47,005
Conveyor 3      73.8%      $105,060
Hoop Driver 1   72.9%       $99,811
Total           77.2%      $251,876`,
    },
    {
      lang: "dax",
      file: "Measures",
      t: "Down minutes by day",
      goal: "Write Faults per Day: Faults Count over the number of rows in Dates. Show Down Minutes and Faults per Day by date and day name.",
      code: `Faults per Day = DIVIDE([Faults Count], COUNTROWS(Dates))`,
      about: "The Dates table filters Faults through shift_date, so a visual by date needs no date logic in the measure. On a day's row there is one date, so Faults per Day is that day's count; on the Total row it is 45 faults over 7 days. A day with no faults would still have its row in Dates, which is the reason to build a date table rather than use the fault dates.",
      terms: [
        ["COUNTROWS(Dates)", "Days in view", "One on a day's row, seven on the Total row."],
      ],
      dax: {"rows":["Dates[Date]","Dates[day]"],"values":["Down Minutes","Faults per Day"],"format":{"Down Minutes":"0.00","Faults per Day":"0.00"}},
      out: `Date        day        Down Minutes  Faults per Day
2026-10-31  Saturday          51.32            8.00
2026-11-01  Sunday            31.77            6.00
2026-11-02  Monday            47.88            4.00
2026-11-03  Tuesday           24.17            5.00
2026-11-04  Wednesday         44.02            7.00
2026-11-05  Thursday          53.13            9.00
2026-11-06  Friday            38.35            6.00
Total                        290.63            6.43`,
    },
    {
      lang: "dax",
      file: "Measures",
      t: "A dynamic title",
      goal: "Write Report Title: \"OEE week of \", the first date in Dates as d mmm yyyy, \": \", and OEE as 0.0%, using FORMAT. Show it on a card.",
      code: `Report Title = "OEE week of " & FORMAT(MIN(Dates[Date]), "d mmm yyyy") & ": " & FORMAT([OEE], "0.0%")`,
      about: "A visual's title can come from a measure, so the heading always says what the page shows: \"OEE week of 31 Oct 2026: 77.2%\". FORMAT turns a number or date into text with a format string; & joins text. When the data refreshes for a new week, the title follows without anyone editing the report.",
      terms: [
        ["FORMAT", "FORMAT(value, format)", "A number or date as text, by format string."],
        ["&", "&", "Joins text."],
      ],
      dax: {"card":["Report Title"]},
      out: `measure       value
Report Title  OEE week of 31 Oct 2026: 77.2%`,
    },
    {
      lang: "dax",
      file: "Measures",
      t: "Color only what is off target",
      goal: "Write OEE Color: a grey (#5F6368) at 85% or more, amber (#B26A00) at 75% or more, otherwise red (#C62828). Show it beside OEE by machine.",
      code: `OEE Color =
    SWITCH(TRUE(),
        [OEE] >= 0.85, "#5F6368",
        [OEE] >= 0.75, "#B26A00",
        "#C62828")`,
      about: "Conditional formatting by field value takes a color from a measure. The rule is the High-Performance HMI track's: normal is grey, and color is spent only on what needs attention, so Char Station 2 at 86.0% stays grey and the two machines below 75% turn red. The 85% and 75% bands and the hex colors are illustrative; a site's report standard sets its own.",
      terms: [
        ["\"#5F6368\"", "Normal", "Grey: on target, nothing to look at."],
        ["SWITCH", "SWITCH(TRUE(), …)", "The first band the OEE falls in."],
      ],
      dax: {"rows":"Machines[machine]","values":["OEE","OEE Color"],"format":{"OEE":"0.0%"}},
      out: `machine           OEE  OEE Color
Char Station 2  86.0%  #5F6368
Conveyor 3      73.8%  #C62828
Hoop Driver 1   72.9%  #C62828
Total           77.2%  #B26A00`,
    },
    {
      lang: "dax",
      file: "Measures",
      t: "A refresh check",
      goal: "Write Rows Loaded (rows of Faults), Days Loaded (distinct shift dates) and Data Check: \"OK\" when 45 rows over 7 days were loaded, otherwise \"Check the refresh\". Show them on a card.",
      code: `Rows Loaded = COUNTROWS(Faults)
Days Loaded = DISTINCTCOUNT(Faults[shift_date])
Data Check = IF([Rows Loaded] = 45 && [Days Loaded] = 7, "OK", "Check the refresh")`,
      about: "A report that silently shows half a week is worse than no report. A small card that checks what loaded, here the 45 faults the Week Faults query returned and all 7 days, catches a failed or partial refresh before anyone acts on the numbers. In a live report the expected counts would come from the source, not be typed in; the pattern is the same.",
      terms: [
        ["DISTINCTCOUNT", "DISTINCTCOUNT", "Different values: the days that loaded."],
        ["&&", "&&", "Both checks must pass."],
      ],
      dax: {"card":["Rows Loaded","Days Loaded","Data Check"]},
      out: `measure      value
Rows Loaded  45
Days Loaded  7
Data Check   OK`,
    },
  ],
});
