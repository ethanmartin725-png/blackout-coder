// Foundations lane: DAX (Power BI measures and columns)
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
// Outputs: node tools/output-checks/dax/run.mjs (the DAX teaching model; every lesson also has a SQL twin). Semantics: docs/DAX_MODEL.md.
// Each lesson builds on the model so far: the measures of every earlier lesson are defined.
BC.addLane({
  id: "dax",
  name: "DAX",
  lang: "dax",
  lessons: [
    {
      t: "Count the faults",
      goal: "Write a measure Faults that counts the rows of fault_log.",
      code: `Faults = COUNTROWS(fault_log)`,
      about: "A measure is a formula Power BI works out for each cell of a visual. Here the visual has one row per machine, so each row counts only that machine's faults: the row filters fault_log through the relationship from dim_machine. The Total row has no machine filter, so it counts all 47 faults in the sample plant's fault_log (DB Pulls & Analytics). The measure never says \"per machine\"; the visual decides that.",
      terms: [
        ["COUNTROWS", "COUNTROWS(table)", "How many rows of the table are visible in the current filter."],
        ["Faults", "Measure name", "What the visual's column header shows."],
        [null, "Filter context", "The filters a cell is calculated under: here, one machine, or none on the Total row."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Faults"]},
      out: `machine         Faults
Char Station 2      10
Conveyor 3          19
Hoop Driver 1       18
Total               47`,
    },
    {
      t: "A down-minutes column",
      goal: "Add a calculated column minutes to fault_log: the seconds from start_ts to end_ts divided by 60, using 2026-11-07 10:15 for a fault that is still open.",
      code: `fault_log[minutes] = DATEDIFF(fault_log[start_ts], COALESCE(fault_log[end_ts], DATE(2026, 11, 7) + TIME(10, 15, 0)), SECOND) / 60`,
      about: "A calculated column is worked out once per row when the data loads, and stored like any other column. COALESCE uses the end time, or 10:15 (the sample plant's \"now\") for a fault still open: without it an open fault has no minutes at all. The fixed time stands in for NOW(), which in a column would freeze at the last refresh anyway. This is the same rule as the DB track's ISNULL(end_ts, @now).",
      terms: [
        ["DATEDIFF", "DATEDIFF(start, end, SECOND)", "Whole seconds between two times; divided by 60 gives minutes."],
        ["COALESCE", "COALESCE(a, b)", "The first value that is not blank: the end time, or now for an open fault."],
        ["fault_log[minutes]", "table[column] =", "Defines a calculated column, worked out for every row."],
      ],
      dax: {"table":"fault_log","columns":["fault_id","machine","fault","minutes"],"top":4,"format":{"minutes":"0.00"}},
      out: `fault_id  machine        fault         minutes
1         Hoop Driver 1  Hoop misfeed     5.70
2         Conveyor 3     E-stop           3.32
3         Hoop Driver 1  Hoop misfeed     4.03
4         Conveyor 3     Jam              4.62`,
    },
    {
      t: "Column or measure",
      goal: "Write a measure Down Minutes that sums the minutes column.",
      code: `Down Minutes = SUM(fault_log[minutes])`,
      about: "The column holds one value per fault; the measure adds up whichever faults the cell can see. Keep row-level facts in columns and anything that should follow the visual's filters in measures. The totals include every fault in fault_log up to 10:15, among them Hoop Driver 1's misfeed still open at 10:15 and the 09:08:52 jam on Conveyor 3, so they run past the OEE week's figures; lesson 9 narrows them to the week.",
      terms: [
        ["SUM", "SUM(column)", "Adds the column over the rows visible in the cell."],
        [null, "Column vs measure", "A column is stored per row; a measure is recalculated for each cell."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Faults","Down Minutes"],"format":{"Down Minutes":"0.00"}},
      out: `machine         Faults  Down Minutes
Char Station 2      10         87.05
Conveyor 3          19         99.35
Hoop Driver 1       18        114.18
Total               47        300.58`,
    },
    {
      t: "Longest stop by fault",
      goal: "Write a measure Longest: the largest value in the minutes column. Show it beside Down Minutes with one row per fault.",
      code: `Longest = MAX(fault_log[minutes])`,
      about: "The same measures work on any visual: this one has a row per fault instead of per machine, so each cell filters fault_log by fault. The Down Minutes column is the downtime Pareto: Low air 87.43, Char flare 70.05, Hoop misfeed 66.57, Jam 65.73, E-stop 10.80, the DB track's figures. The Total row's Longest is the longest of all, 24.08 minutes of low air, not a sum of the longest stops.",
      terms: [
        ["MAX", "MAX(column)", "The largest value visible in the cell."],
      ],
      dax: {"rows":"fault_log[fault]","values":["Down Minutes","Longest"],"format":{"Down Minutes":"0.00","Longest":"0.00"}},
      out: `fault         Down Minutes  Longest
Char flare           70.05    11.95
E-stop               10.80     3.32
Hoop misfeed         66.57     8.27
Jam                  65.73     5.33
Low air              87.43    24.08
Total               300.58    24.08`,
    },
    {
      t: "DIVIDE, not /",
      goal: "Write a measure Avg Minutes: Down Minutes divided by Faults, using DIVIDE.",
      code: `Avg Minutes = DIVIDE([Down Minutes], [Faults])`,
      about: "DIVIDE returns a blank instead of an error or infinity when the bottom is zero or blank, which is what a visual wants for a machine with no faults. Measures are referred to in square brackets, so one measure is built from others. The Total row is total minutes over total faults, 300.58 over 47, not an average of the three averages.",
      terms: [
        ["DIVIDE", "DIVIDE(top, bottom)", "Division that gives blank when the bottom is zero or blank."],
        ["[Down Minutes]", "[Measure]", "Uses another measure, worked out in the same cell."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Down Minutes","Faults","Avg Minutes"],"format":{"Down Minutes":"0.00","Avg Minutes":"0.0"}},
      out: `machine         Down Minutes  Faults  Avg Minutes
Char Station 2         87.05      10          8.7
Conveyor 3             99.35      19          5.2
Hoop Driver 1         114.18      18          6.3
Total                 300.58      47          6.4`,
    },
    {
      t: "Low air only",
      goal: "Write a measure Low Air Minutes: Down Minutes with fault_log[fault] filtered to \"Low air\", using CALCULATE.",
      code: `Low Air Minutes = CALCULATE([Down Minutes], fault_log[fault] = "Low air")`,
      about: "CALCULATE works out its first argument under changed filters. Here the machine filter from the visual stays and a fault filter is added, so each row shows that machine's low-air minutes. Compressed air is shared, so the seeded faults record low air on all three machines: 87.43 minutes in all, the Pareto's top bar.",
      terms: [
        ["CALCULATE", "CALCULATE(expression, filter)", "Works out the expression with the filters changed."],
        ["fault_log[fault] = \"Low air\"", "Filter argument", "Keeps only low-air rows, on top of the visual's own filters."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Down Minutes","Low Air Minutes"],"format":{"Down Minutes":"0.00","Low Air Minutes":"0.00"}},
      out: `machine         Down Minutes  Low Air Minutes
Char Station 2         87.05            15.92
Conveyor 3             99.35            36.90
Hoop Driver 1         114.18            34.62
Total                 300.58            87.43`,
    },
    {
      t: "Share of all down time",
      goal: "Write a measure Share of Down: Down Minutes over Down Minutes with every fault type included, using ALL(fault_log[fault]).",
      code: `Share of Down = DIVIDE([Down Minutes], CALCULATE([Down Minutes], ALL(fault_log[fault])))`,
      about: "ALL removes the filter on a column, so the bottom of the division is all fault types whatever row the visual is on, while the top stays this row's fault. That gives each fault's share of the whole: low air 29.1%, char flare 23.3%. The shares add up to 100% on the Total row.",
      terms: [
        ["ALL", "ALL(column)", "Removes the filter on that column inside CALCULATE."],
        [null, "Share of total", "This row over every row: the standard Pareto percentage."],
      ],
      dax: {"rows":"fault_log[fault]","values":["Down Minutes","Share of Down"],"format":{"Down Minutes":"0.00","Share of Down":"0.0%"}},
      out: `fault         Down Minutes  Share of Down
Char flare           70.05          23.3%
E-stop               10.80           3.6%
Hoop misfeed         66.57          22.1%
Jam                  65.73          21.9%
Low air              87.43          29.1%
Total               300.58         100.0%`,
    },
    {
      t: "VAR and RETURN",
      goal: "Rewrite Share of Down with two variables: mine for this row's Down Minutes and everything for all fault types, then RETURN their ratio.",
      code: `Share of Down =
    VAR mine = [Down Minutes]
    VAR everything = CALCULATE([Down Minutes], ALL(fault_log[fault]))
    RETURN DIVIDE(mine, everything)`,
      about: "Variables name the parts of a formula, so it reads like the reasoning behind it. A variable is worked out once, where it is defined, and never changes after: a CALCULATE further down cannot change it. Redefining Share of Down replaces the earlier version, and the output is the same as the last lesson's.",
      terms: [
        ["VAR", "VAR name = …", "Names a value, worked out once, where it is written."],
        ["RETURN", "RETURN", "The measure's result, which can use the variables."],
      ],
      dax: {"rows":"fault_log[fault]","values":["Down Minutes","Share of Down"],"format":{"Down Minutes":"0.00","Share of Down":"0.0%"}},
      out: `fault         Down Minutes  Share of Down
Char flare           70.05          23.3%
E-stop               10.80           3.6%
Hoop misfeed         66.57          22.1%
Jam                  65.73          21.9%
Low air              87.43          29.1%
Total               300.58         100.0%`,
    },
    {
      t: "The OEE week only",
      goal: "Write Week Down Min: Down Minutes for faults that start in the OEE week, from 2026-10-31 06:00 up to (not including) 2026-11-07 06:00.",
      code: `Week Down Min =
    VAR week_start = DATE(2026, 10, 31) + TIME(6, 0, 0)
    VAR week_end = DATE(2026, 11, 7) + TIME(6, 0, 0)
    RETURN CALCULATE([Down Minutes], fault_log[start_ts] >= week_start, fault_log[start_ts] < week_end)`,
      about: "The OEE Loss Report covers one week of 21 shifts, and 45 of the 47 faults fall inside it. Down Minutes, beside it, still counts all of them. Two conditions on the same column both apply, so start_ts must be on or after the start and before the end. The results are the OEE report's down minutes: 87.05, 94.73 and 108.85, 290.63 in all. (SQL Server shows 94.733327 because its view cuts each fault's minutes to six decimals; DAX keeps full precision.)",
      terms: [
        ["week_start", "Window start", "Shift A's start on 2026-10-31."],
        ["< week_end", "Up to, not including", "A fault starting at 06:00 on 2026-11-07 belongs to the next week."],
        ["DATE", "DATE(y, m, d) + TIME(h, m, s)", "A date and a time added together make one date-time."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Down Minutes","Week Down Min"],"format":{"Down Minutes":"0.00","Week Down Min":"0.00"}},
      out: `machine         Down Minutes  Week Down Min
Char Station 2         87.05          87.05
Conveyor 3             99.35          94.73
Hoop Driver 1         114.18         108.85
Total                 300.58         290.63`,
    },
    {
      t: "Barrels in the week",
      goal: "Write Barrels: the sum of v_hourly_barrels[made_this_hour] for readings after 2026-10-31 06:00 up to and including 2026-11-07 06:00.",
      code: `Barrels =
    VAR week_start = DATE(2026, 10, 31) + TIME(6, 0, 0)
    VAR week_end = DATE(2026, 11, 7) + TIME(6, 0, 0)
    RETURN CALCULATE(SUM(v_hourly_barrels[made_this_hour]), v_hourly_barrels[ts] > week_start, v_hourly_barrels[ts] <= week_end)`,
      about: "v_hourly_barrels is the OEE track's view, loaded as a table: each reading is the barrels made in the hour that ends at its time stamp. So the 06:00 reading on 2026-10-31 belongs to the week before, and the one at 06:00 on 2026-11-07 to this week: after the start, up to and including the end. The totals are the OEE report's: 6,980, 7,120 and 6,410 barrels.",
      terms: [
        ["v_hourly_barrels[ts] > week_start", "After the start", "A reading counts the hour that ends at its time."],
        ["<= week_end", "Including the end", "The 06:00 reading closes the week's last hour."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Barrels"],"format":{"Barrels":"#,0"}},
      out: `machine         Barrels
Char Station 2    6,980
Conveyor 3        7,120
Hoop Driver 1     6,410
Total            20,510`,
    },
    {
      t: "Availability",
      goal: "Write Planned Min: 7 days × 3 shifts × 450 minutes for each machine, with SUMX over dim_machine. Then Availability: planned minus Week Down Min, over planned.",
      code: `Planned Min = SUMX(dim_machine, 7 * 3 * 450)
Availability = DIVIDE([Planned Min] - [Week Down Min], [Planned Min])`,
      about: "SUMX walks a table row by row and adds up the expression for each row. Each machine plans 9,450 minutes (an 8-hour shift less a 30-minute break is 450), so the Total row plans 28,350 for three machines: a plain 9,450 would be wrong there. Availability runs about 99% because fault_log only holds stops the PLC detects; changeovers and waits for material are missing, as the other tracks point out.",
      terms: [
        ["SUMX", "SUMX(table, expression)", "Works out the expression for each row of the table and adds the results."],
        ["7 * 3 * 450", "Planned minutes", "7 days × 3 shifts × 450 paid minutes."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Planned Min","Availability"],"format":{"Planned Min":"#,0","Availability":"0.0%"}},
      out: `machine         Planned Min  Availability
Char Station 2        9,450         99.1%
Conveyor 3            9,450         99.0%
Hoop Driver 1         9,450         98.8%
Total                28,350         99.0%`,
    },
    {
      t: "Performance",
      goal: "Write Ideal Count: for each machine, run minutes over 60 times its ideal rate, with SUMX over dim_machine. Then Performance: Barrels over Ideal Count.",
      code: `Ideal Count = SUMX(dim_machine, ([Planned Min] - [Week Down Min]) / 60 * dim_machine[ideal_rate_hr])
Performance = DIVIDE([Barrels], [Ideal Count])`,
      about: "Inside SUMX, the measures are worked out for one machine at a time: referring to a measure inside an iterator turns the current row into a filter (context transition). That matters because the rates differ, 50, 60 and 55 an hour, so the total ideal count must be built machine by machine. Performance is 89.5%, 76.1% and 74.9%: nearly all of this plant's loss is speed, the OEE report's main finding.",
      terms: [
        ["dim_machine[ideal_rate_hr]", "Row value", "Inside SUMX, the current machine's ideal rate."],
        [null, "Context transition", "A measure inside an iterator sees only the current row."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Barrels","Ideal Count","Performance"],"format":{"Barrels":"#,0","Ideal Count":"#,0.0","Performance":"0.0%"}},
      out: `machine         Barrels  Ideal Count  Performance
Char Station 2    6,980      7,802.5        89.5%
Conveyor 3        7,120      9,355.3        76.1%
Hoop Driver 1     6,410      8,562.7        74.9%
Total            20,510     25,720.4        79.7%`,
    },
    {
      t: "Quality",
      goal: "Write Rejects: the sum of reject_log[qty] in the OEE week (on or after the start, before the end). Then Quality: good barrels, Barrels minus Rejects, over Barrels.",
      code: `Rejects =
    VAR week_start = DATE(2026, 10, 31) + TIME(6, 0, 0)
    VAR week_end = DATE(2026, 11, 7) + TIME(6, 0, 0)
    RETURN CALCULATE(SUM(reject_log[qty]), reject_log[ts] >= week_start, reject_log[ts] < week_end)
Quality = DIVIDE([Barrels] - [Rejects], [Barrels])`,
      about: "Rejects are 211, 142 and 96 in the week, from the OEE track's reject_log. Hoop Driver 1 has 6,314 good of 6,410, 98.5%, the Foundations lessons' quality example. The reject log is a different table, related to dim_machine like the others, so the same machine rows filter it.",
      terms: [
        ["reject_log[qty]", "Rejects", "Barrels scrapped or reworked, one row per event."],
        ["[Barrels] - [Rejects]", "Good count", "Barrels that passed."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Barrels","Rejects","Quality"],"format":{"Barrels":"#,0","Quality":"0.0%"}},
      out: `machine         Barrels  Rejects  Quality
Char Station 2    6,980      211    97.0%
Conveyor 3        7,120      142    98.0%
Hoop Driver 1     6,410       96    98.5%
Total            20,510      449    97.8%`,
    },
    {
      t: "OEE",
      goal: "Write OEE: Availability × Performance × Quality.",
      code: `OEE = [Availability] * [Performance] * [Quality]`,
      about: "The three factors multiply into OEE: Char Station 2 86.0%, Conveyor 3 73.8%, Hoop Driver 1 72.9%, the OEE Loss Report's figures to the decimal. The Total row is the plant's OEE with every machine's minutes and barrels pooled, 77.2%. The next lesson shows why that is not the average of the three.",
      terms: [
        ["[Availability] * [Performance] * [Quality]", "OEE", "The three factors multiplied."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Availability","Performance","Quality","OEE"],"format":{"Availability":"0.0%","Performance":"0.0%","Quality":"0.0%","OEE":"0.0%"}},
      out: `machine         Availability  Performance  Quality    OEE
Char Station 2         99.1%        89.5%    97.0%  86.0%
Conveyor 3             99.0%        76.1%    98.0%  73.8%
Hoop Driver 1          98.8%        74.9%    98.5%  72.9%
Total                  99.0%        79.7%    97.8%  77.2%`,
    },
    {
      t: "Why the Total is not an average",
      goal: "Write OEE Machine Avg: the average of OEE over each machine in VALUES(dim_machine[machine]), with AVERAGEX. Show it beside OEE.",
      code: `OEE Machine Avg = AVERAGEX(VALUES(dim_machine[machine]), [OEE])`,
      about: "On a machine's row both columns agree. On the Total row, OEE recalculates from pooled minutes and barrels, 77.2%, while OEE Machine Avg averages the three percentages, 77.6%. Neither is wrong, but they answer different questions: pooled OEE weighs each machine by its planned output, an average treats them as equal. A report should say which one it shows.",
      terms: [
        ["AVERAGEX", "AVERAGEX(table, expression)", "Works out the expression per row and averages the results."],
        ["VALUES", "VALUES(column)", "The column's values visible in the cell: one machine on a row, all three on the Total."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["OEE","OEE Machine Avg"],"format":{"OEE":"0.0%","OEE Machine Avg":"0.0%"}},
      out: `machine           OEE  OEE Machine Avg
Char Station 2  86.0%            86.0%
Conveyor 3      73.8%            73.8%
Hoop Driver 1   72.9%            72.9%
Total           77.2%            77.6%`,
    },
    {
      t: "Dollars per OEE point",
      goal: "Write Dollars per OEE Pt: for each machine, planned minutes over 60 × ideal rate × 1% × margin per barrel, summed with SUMX.",
      code: `Dollars per OEE Pt = SUMX(dim_machine, [Planned Min] / 60 * dim_machine[ideal_rate_hr] * 0.01 * dim_machine[margin_per_barrel])`,
      about: "One OEE point is 1% of the barrels a machine could make in its planned time, and each barrel is worth its margin, $42.50 (illustrative). That gives $3,347 for Char Station 2, $4,016 for Conveyor 3 and $3,682 for Hoop Driver 1, the OEE report's figures. A point on Conveyor 3 is worth most because it is the fastest machine.",
      terms: [
        ["0.01", "One point", "1% of the planned output."],
        ["dim_machine[margin_per_barrel]", "Margin", "$42.50 a barrel in the sample plant, illustrative."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Dollars per OEE Pt"],"format":{"Dollars per OEE Pt":"$#,0"}},
      out: `machine         Dollars per OEE Pt
Char Station 2              $3,347
Conveyor 3                  $4,016
Hoop Driver 1               $3,682
Total                      $11,045`,
    },
    {
      t: "Loss dollars by machine",
      goal: "Write Loss Dollars: for each machine, the barrels it could have made in planned time minus the good barrels it did make, times its margin, summed with SUMX.",
      code: `Loss Dollars = SUMX(dim_machine, ([Planned Min] / 60 * dim_machine[ideal_rate_hr] - ([Barrels] - [Rejects])) * dim_machine[margin_per_barrel])`,
      about: "Planned output minus good output is every barrel lost to availability, speed and quality together. At $42.50 a barrel that is $251,876 a week across the line, the OEE report's total, of which speed is $221,444. Conveyor 3 loses the most, $105,060, though its OEE is not the lowest: it is the fastest machine, so each lost point costs more.",
      terms: [
        ["[Barrels] - [Rejects]", "Good barrels", "What the machine actually delivered."],
        ["[Planned Min] / 60 * dim_machine[ideal_rate_hr]", "Could have made", "Planned hours at the ideal rate."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["OEE","Loss Dollars"],"format":{"OEE":"0.0%","Loss Dollars":"$#,0"}},
      out: `machine           OEE  Loss Dollars
Char Station 2  86.0%       $47,005
Conveyor 3      73.8%      $105,060
Hoop Driver 1   72.9%       $99,811
Total           77.2%      $251,876`,
    },
    {
      t: "Status with SWITCH",
      goal: "Write OEE Status: \"World class\" at 85% or more, \"Typical\" at 60% or more, otherwise \"Needs work\", using SWITCH(TRUE(), …).",
      code: `OEE Status =
    SWITCH(TRUE(),
        [OEE] >= 0.85, "World class",
        [OEE] >= 0.6, "Typical",
        "Needs work")`,
      about: "SWITCH(TRUE(), …) checks each condition in order and returns the first one that is true, a cleaner form of nested IFs. The 85% and 60% bands are the usual rule of thumb, the same as the Foundations lessons' rate_oee. Char Station 2 is world class; the other two, and the plant as a whole, are typical.",
      terms: [
        ["SWITCH", "SWITCH(TRUE(), cond, result, …, else)", "The result of the first true condition."],
        ["\"Needs work\"", "Else", "When no condition is true."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["OEE","OEE Status"],"format":{"OEE":"0.0%"}},
      out: `machine           OEE  OEE Status
Char Station 2  86.0%  World class
Conveyor 3      73.8%  Typical
Hoop Driver 1   72.9%  Typical
Total           77.2%  Typical`,
    },
    {
      t: "Pareto rank",
      goal: "Write Fault Rank: when the cell shows one fault, rank its Down Minutes among all fault types with RANKX over ALL(fault_log[fault]); on the Total row, show nothing.",
      code: `Fault Rank = IF(HASONEVALUE(fault_log[fault]), RANKX(ALL(fault_log[fault]), [Down Minutes]))`,
      about: "RANKX works out Down Minutes for every fault type and counts how many are larger, so the largest ranks 1. ALL makes the list every fault type, not just the row's own. On the Total row the rank would compare the grand total with single faults and always come out 1, which means nothing; HASONEVALUE is false there, so IF leaves it blank. Guarding the Total row like this is a common DAX habit.",
      terms: [
        ["RANKX", "RANKX(table, expression)", "This cell's value ranked against the expression over the table, largest first."],
        ["HASONEVALUE", "HASONEVALUE(column)", "True when the cell shows exactly one value of the column."],
      ],
      dax: {"rows":"fault_log[fault]","values":["Down Minutes","Fault Rank"],"format":{"Down Minutes":"0.00"}},
      out: `fault         Down Minutes  Fault Rank
Char flare           70.05           2
E-stop               10.80           5
Hoop misfeed         66.57           3
Jam                  65.73           4
Low air              87.43           1
Total               300.58`,
    },
    {
      t: "Minor stops with FILTER",
      goal: "Write Minor Stop Min: Week Down Min counting only faults under 5 minutes, using CALCULATE with FILTER over fault_log.",
      code: `Minor Stop Min = CALCULATE([Week Down Min], FILTER(fault_log, fault_log[minutes] < 5))`,
      about: "FILTER walks the fault rows visible in the cell and keeps those under 5 minutes; CALCULATE then works out Week Down Min on just those rows. Five minutes is the TPM Loss Hunt's line between a minor stop and a breakdown, a convention rather than a standard. The results are that track's figures: 1.08, 47.42 and 28.40 minutes. Conveyor 3's down time is half minor stops, which point to adjustment and cleaning, not repair.",
      terms: [
        ["FILTER", "FILTER(table, condition)", "The rows of the table that meet the condition."],
        ["fault_log[minutes] < 5", "Minor stop", "Under 5 minutes, the TPM track's threshold."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Week Down Min","Minor Stop Min"],"format":{"Week Down Min":"0.00","Minor Stop Min":"0.00"}},
      out: `machine         Week Down Min  Minor Stop Min
Char Station 2          87.05            1.08
Conveyor 3              94.73           47.42
Hoop Driver 1          108.85           28.40
Total                  290.63           76.90`,
    },
    {
      t: "Machines with faults",
      goal: "Write Machines Faulted: how many different machines appear in fault_log, with DISTINCTCOUNT. Show it with Faults, one row per fault type.",
      code: `Machines Faulted = DISTINCTCOUNT(fault_log[machine])`,
      about: "COUNTROWS counts rows; DISTINCTCOUNT counts different values. Low air hit all three machines in 5 events, which points at the shared compressed air, not one machine; Char flare and Hoop misfeed each belong to one machine. A count of machines tells a different story from a count of events.",
      terms: [
        ["DISTINCTCOUNT", "DISTINCTCOUNT(column)", "How many different values the column has in the cell."],
      ],
      dax: {"rows":"fault_log[fault]","values":["Faults","Machines Faulted"]},
      out: `fault         Faults  Machines Faulted
Char flare         8                 1
E-stop             5                 3
Hoop misfeed      12                 1
Jam               17                 2
Low air            5                 3
Total             47                 3`,
    },
    {
      t: "Average stop",
      goal: "Write Avg Stop: the average of the minutes column, with AVERAGE. Show it beside Avg Minutes, one row per fault type.",
      code: `Avg Stop = AVERAGE(fault_log[minutes])`,
      about: "AVERAGE adds the column and divides by the number of rows that have a value, so it gives the same answer as DIVIDE([Down Minutes], [Faults]) here: every fault has minutes. They would differ if some rows were blank, which AVERAGE skips. A low-air stop averages 17.49 minutes, the longest by far.",
      terms: [
        ["AVERAGE", "AVERAGE(column)", "The mean of the column's non-blank values in the cell."],
      ],
      dax: {"rows":"fault_log[fault]","values":["Avg Minutes","Avg Stop"],"format":{"Avg Minutes":"0.00","Avg Stop":"0.00"}},
      out: `fault         Avg Minutes  Avg Stop
Char flare           8.76      8.76
E-stop               2.16      2.16
Hoop misfeed         5.55      5.55
Jam                  3.87      3.87
Low air             17.49     17.49
Total                6.40      6.40`,
    },
    {
      t: "A shift column",
      goal: "Add a calculated column shift to fault_log: \"A\" when the start hour is 6 to 13, \"B\" when it is 14 to 21, otherwise \"C\".",
      code: `fault_log[shift] =
    SWITCH(TRUE(),
        HOUR(fault_log[start_ts]) >= 6 && HOUR(fault_log[start_ts]) < 14, "A",
        HOUR(fault_log[start_ts]) >= 14 && HOUR(fault_log[start_ts]) < 22, "B",
        "C")`,
      about: "HOUR takes the hour, 0 to 23, from a date-time. && is AND. Shift C covers 22:00 to 06:00, so it is whatever is left. This is the same rule as the DB track's \"Bucket by shift\" query and the Foundations lessons' shift_for; a fault belongs to the shift it started in.",
      terms: [
        ["HOUR", "HOUR(date-time)", "The hour of the day, 0 to 23."],
        ["&&", "&&", "And: both sides must be true."],
        ["fault_log[shift]", "Calculated column", "Worked out once per fault."],
      ],
      dax: {"table":"fault_log","columns":["fault_id","start_ts","shift"],"top":4},
      out: `fault_id  start_ts             shift
1         2026-10-31 14:37:59  B
2         2026-10-31 21:11:40  B
3         2026-11-01 01:04:59  C
4         2026-11-01 01:36:12  C`,
    },
    {
      t: "Down minutes by shift",
      goal: "Write Shift Share: Down Minutes over Down Minutes for every shift, with ALL(fault_log[shift]). Show it with Faults and Down Minutes, one row per shift.",
      code: `Shift Share = DIVIDE([Down Minutes], CALCULATE([Down Minutes], ALL(fault_log[shift])))`,
      about: "A new column can be a visual's rows straight away: one row per shift. The night shift, C, loses the most time, 123.93 minutes, 41% of all down time, in fewer faults than B; these are the DB track's shift figures. The share uses the same ALL pattern as the fault share, on a different column.",
      terms: [
        ["ALL(fault_log[shift])", "Every shift", "Removes the shift filter for the bottom of the share."],
      ],
      dax: {"rows":"fault_log[shift]","values":["Faults","Down Minutes","Shift Share"],"format":{"Down Minutes":"0.00","Shift Share":"0.0%"}},
      out: `shift  Faults  Down Minutes  Shift Share
A          13         71.02        23.6%
B          18        105.63        35.1%
C          16        123.93        41.2%
Total      47        300.58       100.0%`,
    },
    {
      t: "First fault of the week",
      goal: "Write First Fault: the earliest start_ts among faults in the OEE week, with MIN inside CALCULATE.",
      code: `First Fault =
    VAR week_start = DATE(2026, 10, 31) + TIME(6, 0, 0)
    VAR week_end = DATE(2026, 11, 7) + TIME(6, 0, 0)
    RETURN CALCULATE(MIN(fault_log[start_ts]), fault_log[start_ts] >= week_start, fault_log[start_ts] < week_end)`,
      about: "MIN works on dates as well as numbers: the earliest is the smallest. Hoop Driver 1 had the week's first fault, a misfeed at 14:37:59 on Saturday's B shift; Char Station 2's first came at 02:59 on Sunday morning, which still belongs to Saturday's C shift. The Total row is the earliest of all.",
      terms: [
        ["MIN", "MIN(column)", "The smallest value in the cell: for dates, the earliest."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Faults","First Fault"]},
      out: `machine         Faults  First Fault
Char Station 2      10  2026-11-01 02:59:50
Conveyor 3          19  2026-10-31 21:11:40
Hoop Driver 1       18  2026-10-31 14:37:59
Total               47  2026-10-31 14:37:59`,
    },
    {
      t: "Jam or misfeed",
      goal: "Write Feed Faults Min: Down Minutes for faults that are \"Jam\" or \"Hoop misfeed\", with IN { … }.",
      code: `Feed Faults Min = CALCULATE([Down Minutes], fault_log[fault] IN {"Jam", "Hoop misfeed"})`,
      about: "IN tests a value against a list, so one condition covers several fault types: here the faults where material did not feed through. Char Station 2 has neither, so its cell is blank; its row stays because Down Minutes has a value. Feed problems are 132.30 of the 300.58 minutes, 44%.",
      terms: [
        ["IN", "value IN {a, b}", "True when the value is any one in the list."],
        ["{\"Jam\", \"Hoop misfeed\"}", "List", "A list of values in braces."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Down Minutes","Feed Faults Min"],"format":{"Down Minutes":"0.00","Feed Faults Min":"0.00"}},
      out: `machine         Down Minutes  Feed Faults Min
Char Station 2         87.05
Conveyor 3             99.35            54.63
Hoop Driver 1         114.18            77.67
Total                 300.58           132.30`,
    },
    {
      t: "Everything but low air",
      goal: "Write Not Low Air Min: Down Minutes for every fault that is not \"Low air\", with NOT.",
      code: `Not Low Air Min = CALCULATE([Down Minutes], NOT(fault_log[fault] = "Low air"))`,
      about: "NOT flips the condition, so the filter keeps every fault type except low air. The two measures split Down Minutes exactly: 15.92 + 71.13 = 87.05 for Char Station 2. Setting the shared compressed air aside, Hoop Driver 1 still loses the most, 79.57 minutes.",
      terms: [
        ["NOT", "NOT(condition)", "True when the condition is false."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Down Minutes","Low Air Minutes","Not Low Air Min"],"format":{"Down Minutes":"0.00","Low Air Minutes":"0.00","Not Low Air Min":"0.00"}},
      out: `machine         Down Minutes  Low Air Minutes  Not Low Air Min
Char Station 2         87.05            15.92            71.13
Conveyor 3             99.35            36.90            62.45
Hoop Driver 1         114.18            34.62            79.57
Total                 300.58            87.43           213.15`,
    },
    {
      t: "Breakdowns, 5 minutes or more",
      goal: "Write Breakdown Min: Week Down Min counting only faults of 5 minutes or more, with FILTER. Show it beside Minor Stop Min.",
      code: `Breakdown Min = CALCULATE([Week Down Min], FILTER(fault_log, fault_log[minutes] >= 5))`,
      about: "The other half of the TPM Loss Hunt's split: breakdowns are stops of 5 minutes or more, minor stops are shorter, and the two add up to the week's down time. The figures are that track's: breakdowns 85.97, 47.32 and 80.45 minutes. Char Station 2 loses time in a few long stops, Conveyor 3 in many short ones, and the fixes differ.",
      terms: [
        ["fault_log[minutes] >= 5", "Breakdown", "5 minutes or more, the TPM track's threshold."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Week Down Min","Breakdown Min","Minor Stop Min"],"format":{"Week Down Min":"0.00","Breakdown Min":"0.00","Minor Stop Min":"0.00"}},
      out: `machine         Week Down Min  Breakdown Min  Minor Stop Min
Char Station 2          87.05          85.97            1.08
Conveyor 3              94.73          47.32           47.42
Hoop Driver 1          108.85          80.45           28.40
Total                  290.63         213.73           76.90`,
    },
    {
      t: "KEEPFILTERS or replace",
      goal: "Write two measures for jam minutes: Jam Min Replace with a plain condition, and Jam Min Keep with the condition wrapped in KEEPFILTERS. Show both by fault.",
      code: `Jam Min Replace = CALCULATE([Down Minutes], fault_log[fault] = "Jam")
Jam Min Keep = CALCULATE([Down Minutes], KEEPFILTERS(fault_log[fault] = "Jam"))`,
      about: "On a visual with one row per fault, the plain condition replaces the row's fault filter, so every row shows the jam minutes, 65.73. KEEPFILTERS keeps the row's filter and adds the condition on top, so only the Jam row has a value. Most \"why does every row show the same number?\" questions in DAX come down to this.",
      terms: [
        ["KEEPFILTERS", "KEEPFILTERS(condition)", "Adds the condition to the cell's filters instead of replacing them."],
        [null, "Replace", "A plain CALCULATE condition overrides the cell's filter on that column."],
      ],
      dax: {"rows":"fault_log[fault]","values":["Down Minutes","Jam Min Replace","Jam Min Keep"],"format":{"Down Minutes":"0.00","Jam Min Replace":"0.00","Jam Min Keep":"0.00"}},
      out: `fault         Down Minutes  Jam Min Replace  Jam Min Keep
Char flare           70.05            65.73
E-stop               10.80            65.73
Hoop misfeed         66.57            65.73
Jam                  65.73            65.73         65.73
Low air              87.43            65.73
Total               300.58            65.73         65.73`,
    },
    {
      t: "Share of the machine's time",
      goal: "Write Share of Machine: Down Minutes over the machine's own Down Minutes for every fault type, with ALLEXCEPT(fault_log, dim_machine[machine]). Show it by machine and fault.",
      code: `Share of Machine = DIVIDE([Down Minutes], CALCULATE([Down Minutes], ALLEXCEPT(fault_log, dim_machine[machine])))`,
      about: "ALLEXCEPT removes every filter on fault_log and the tables it reaches, except the ones named. The machine filter stays and the fault filter goes, so the bottom is the whole machine. Each machine's shares add up to 100%: the char flare is 80.5% of Char Station 2's down time. Name the column the visual uses, dim_machine[machine]; naming fault_log[machine] would drop the visual's machine filter too.",
      terms: [
        ["ALLEXCEPT", "ALLEXCEPT(table, column)", "Removes the table's filters except those on the named columns."],
      ],
      dax: {"rows":["dim_machine[machine]","fault_log[fault]"],"values":["Down Minutes","Share of Machine"],"format":{"Down Minutes":"0.00","Share of Machine":"0.0%"}},
      out: `machine         fault         Down Minutes  Share of Machine
Char Station 2  Char flare           70.05             80.5%
Char Station 2  E-stop                1.08              1.2%
Char Station 2  Low air              15.92             18.3%
Conveyor 3      E-stop                7.82              7.9%
Conveyor 3      Jam                  54.63             55.0%
Conveyor 3      Low air              36.90             37.1%
Hoop Driver 1   E-stop                1.90              1.7%
Hoop Driver 1   Hoop misfeed         66.57             58.3%
Hoop Driver 1   Jam                  11.10              9.7%
Hoop Driver 1   Low air              34.62             30.3%
Total                               300.58            100.0%`,
    },
    {
      t: "Share of the line",
      goal: "Write Share of Line: Week Down Min over Week Down Min for all machines, with ALL(dim_machine).",
      code: `Share of Line = DIVIDE([Week Down Min], CALCULATE([Week Down Min], ALL(dim_machine)))`,
      about: "ALL on the machine table removes the machine filter for the bottom of the division. Hoop Driver 1 has 37.5% of the line's down time in the OEE week, 108.85 of 290.63 minutes.",
      terms: [
        ["ALL(dim_machine)", "Every machine", "Removes the machine filter."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Week Down Min","Share of Line"],"format":{"Week Down Min":"0.00","Share of Line":"0.0%"}},
      out: `machine         Week Down Min  Share of Line
Char Station 2          87.05          30.0%
Conveyor 3              94.73          32.6%
Hoop Driver 1          108.85          37.5%
Total                  290.63         100.0%`,
    },
    {
      t: "REMOVEFILTERS",
      goal: "Write Line Down Min: Week Down Min with the machine table's filters removed, using REMOVEFILTERS.",
      code: `Line Down Min = CALCULATE([Week Down Min], REMOVEFILTERS(dim_machine))`,
      about: "Inside CALCULATE, REMOVEFILTERS does what ALL does, and its name says so; ALL is also a table function elsewhere, REMOVEFILTERS only ever removes. Every row shows the line's 290.63 minutes: a handy column for a \"this machine against the line\" comparison.",
      terms: [
        ["REMOVEFILTERS", "REMOVEFILTERS(table or column)", "Removes those filters inside CALCULATE."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Week Down Min","Line Down Min"],"format":{"Week Down Min":"0.00","Line Down Min":"0.00"}},
      out: `machine         Week Down Min  Line Down Min
Char Station 2          87.05         290.63
Conveyor 3              94.73         290.63
Hoop Driver 1          108.85         290.63
Total                  290.63         290.63`,
    },
    {
      t: "A shift-date column",
      goal: "Add a calculated column shift_date to fault_log: the date of start_ts minus 6 hours, so a C-shift fault after midnight belongs to the shift that started the evening before.",
      code: `fault_log[shift_date] =
    VAR t = fault_log[start_ts] - TIME(6, 0, 0)
    RETURN DATE(YEAR(t), MONTH(t), DAY(t))`,
      about: "A plant day starts at 06:00 with shift A, so a fault at 01:04 on Sunday belongs to Saturday's C shift. Taking 6 hours off the start time moves it into the right calendar day: 01:04 becomes 19:04 on Saturday, and 22:30 stays on its own day. DATE(YEAR, MONTH, DAY) then drops the time of day.",
      terms: [
        ["TIME(6, 0, 0)", "6 hours", "Taken off so the plant day starts at 06:00."],
        ["YEAR", "YEAR, MONTH, DAY", "The parts of a date, put back together by DATE to drop the time."],
        ["VAR", "VAR in a column", "Works in a calculated column too, once per row."],
      ],
      dax: {"table":"fault_log","columns":["fault_id","start_ts","shift","shift_date"],"top":6},
      out: `fault_id  start_ts             shift  shift_date
1         2026-10-31 14:37:59  B      2026-10-31
2         2026-10-31 21:11:40  B      2026-10-31
3         2026-11-01 01:04:59  C      2026-10-31
4         2026-11-01 01:36:12  C      2026-10-31
5         2026-11-01 02:54:37  C      2026-10-31
6         2026-11-01 02:59:50  C      2026-10-31`,
    },
    {
      t: "Down minutes by date",
      goal: "Write Down per Day: Down Minutes over the number of different shift dates, with DISTINCTCOUNT. Show it with Faults and Down Minutes, one row per shift date.",
      code: `Down per Day = DIVIDE([Down Minutes], DISTINCTCOUNT(fault_log[shift_date]))`,
      about: "On a date's row there is one date, so Down per Day equals Down Minutes; on the Total row it divides by 8 dates, 37.57 minutes a day. 2026-11-07 is a part day: the data stops at 10:15, so its 2 faults and 9.95 minutes are not a bad day's figures, they are an unfinished one.",
      terms: [
        ["DISTINCTCOUNT(fault_log[shift_date])", "Days", "How many different dates the cell covers."],
      ],
      dax: {"rows":"fault_log[shift_date]","values":["Faults","Down Minutes","Down per Day"],"format":{"Down Minutes":"0.00","Down per Day":"0.00"}},
      out: `shift_date  Faults  Down Minutes  Down per Day
2026-10-31       8         51.32         51.32
2026-11-01       6         31.77         31.77
2026-11-02       4         47.88         47.88
2026-11-03       5         24.17         24.17
2026-11-04       7         44.02         44.02
2026-11-05       9         53.13         53.13
2026-11-06       6         38.35         38.35
2026-11-07       2          9.95          9.95
Total           47        300.58         37.57`,
    },
    {
      t: "Barrels by date",
      goal: "Add a shift_date column to v_hourly_barrels: the date of ts minus 7 hours. Then write Barrels Made: the sum of made_this_hour. Show it by shift date.",
      code: `v_hourly_barrels[shift_date] =
    VAR t = v_hourly_barrels[ts] - TIME(7, 0, 0)
    RETURN DATE(YEAR(t), MONTH(t), DAY(t))
Barrels Made = SUM(v_hourly_barrels[made_this_hour])`,
      about: "A reading counts the hour that ends at its time stamp, so the 06:00 reading is the last hour of the night before: 7 hours, not 6, puts it in the right day. The first reading, 06:00 on 2026-10-31, has nothing before it to subtract from, so the view gives it 0 and it lands on 2026-10-30. Full days run about 2,900 to 2,980 barrels; 2026-11-07 stops at 10:00. With no date filter the total, 20,998, runs past the OEE week's 20,510.",
      terms: [
        ["TIME(7, 0, 0)", "7 hours", "6 for the plant day, plus the hour the reading closes."],
        ["Barrels Made", "No window", "Unlike Barrels, this measure has no week filter."],
      ],
      dax: {"rows":"v_hourly_barrels[shift_date]","values":["Barrels Made"],"format":{"Barrels Made":"#,0"}},
      out: `shift_date  Barrels Made
2026-10-30             0
2026-10-31         2,976
2026-11-01         2,954
2026-11-02         2,944
2026-11-03         2,924
2026-11-04         2,904
2026-11-05         2,904
2026-11-06         2,904
2026-11-07           488
Total             20,998`,
    },
    {
      t: "The last full day",
      goal: "Write Last Full Day: the latest shift date in fault_log, ignoring every filter with ALL(fault_log), minus 1 day. Then Down Last Day: Down Minutes for that shift date.",
      code: `Last Full Day = CALCULATE(MAX(fault_log[shift_date]), ALL(fault_log)) - 1
Down Last Day =
    VAR d = [Last Full Day]
    RETURN CALCULATE([Down Minutes], fault_log[shift_date] = d)`,
      about: "The data runs into 2026-11-07, a part day, so the last full day is the one before, 2026-11-06. ALL(fault_log) matters: without it, each machine row would find its own latest fault date, and a machine with no fault on the 7th would pick a different day. The variable holds the date, so the condition compares against one fixed value.",
      terms: [
        ["ALL(fault_log)", "Ignore the row", "The latest date in all of fault_log, whatever row the visual is on."],
        ["- 1", "One day back", "A date minus a number is that many days earlier."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Last Full Day","Down Last Day"],"format":{"Down Last Day":"0.00"}},
      out: `machine         Last Full Day  Down Last Day
Char Station 2  2026-11-06             11.95
Conveyor 3      2026-11-06             22.18
Hoop Driver 1   2026-11-06              4.22
Total           2026-11-06             38.35`,
    },
    {
      t: "The day before",
      goal: "Write Down Day Before: Down Minutes for the shift date one day before Last Full Day.",
      code: `Down Day Before =
    VAR d = [Last Full Day] - 1
    RETURN CALCULATE([Down Minutes], fault_log[shift_date] = d)`,
      about: "The same pattern, one day further back: 2026-11-05. Power BI's time-intelligence functions do this for a proper date table; this model teaches the pattern underneath, which works with any date column.",
      terms: [
        ["[Last Full Day] - 1", "Day before", "Measures that return dates can be shifted like dates."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Down Last Day","Down Day Before"],"format":{"Down Last Day":"0.00","Down Day Before":"0.00"}},
      out: `machine         Down Last Day  Down Day Before
Char Station 2          11.95            18.37
Conveyor 3              22.18            10.82
Hoop Driver 1            4.22            23.95
Total                   38.35            53.13`,
    },
    {
      t: "Change from the day before",
      goal: "Write Down Change: Down Last Day minus Down Day Before.",
      code: `Down Change = [Down Last Day] - [Down Day Before]`,
      about: "A negative change means less down time. The line lost 14.78 fewer minutes on 2026-11-06 than the day before, but Conveyor 3 went the other way, up 11.37 minutes. A total can improve while one machine gets worse, which is why a daily review looks at the rows, not only the Total.",
      terms: [
        ["Down Change", "Day-on-day change", "Last day minus the day before; negative is better."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Down Last Day","Down Day Before","Down Change"],"format":{"Down Last Day":"0.00","Down Day Before":"0.00","Down Change":"0.00"}},
      out: `machine         Down Last Day  Down Day Before  Down Change
Char Station 2          11.95            18.37        -6.42
Conveyor 3              22.18            10.82        11.37
Hoop Driver 1            4.22            23.95       -19.73
Total                   38.35            53.13       -14.78`,
    },
    {
      t: "Rank machines by loss",
      goal: "Write Loss Rank: when the cell shows one machine, rank its Loss Dollars among all machines with RANKX; on the Total row, nothing.",
      code: `Loss Rank = IF(HASONEVALUE(dim_machine[machine]), RANKX(ALL(dim_machine[machine]), [Loss Dollars]))`,
      about: "The same RANKX pattern as the fault rank, on machines and dollars. Conveyor 3 ranks first at $105,060 a week, although its OEE is not the lowest: it is the fastest machine, so every lost minute costs more barrels.",
      terms: [
        ["RANKX(ALL(dim_machine[machine]), [Loss Dollars])", "Rank by loss", "Largest loss ranks 1."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Loss Dollars","Loss Rank"],"format":{"Loss Dollars":"$#,0"}},
      out: `machine         Loss Dollars  Loss Rank
Char Station 2       $47,005          3
Conveyor 3          $105,060          1
Hoop Driver 1        $99,811          2
Total               $251,876`,
    },
    {
      t: "The worst machine",
      goal: "Write Worst Machine: the name of the machine with the largest Loss Dollars, from TOPN(1, …) and CONCATENATEX. Show it on a card with Loss Dollars.",
      code: `Worst Machine = CONCATENATEX(TOPN(1, VALUES(dim_machine[machine]), [Loss Dollars]), dim_machine[machine], ", ")`,
      about: "TOPN keeps the rows with the largest values, here the one machine with the biggest loss; CONCATENATEX turns the rows it kept into text. If two machines tied, TOPN would keep both and the card would list both. A card shows a measure with no filter, like the Total row of a table.",
      terms: [
        ["TOPN", "TOPN(n, table, expression)", "The n rows with the largest values, plus any tied with the last."],
        ["CONCATENATEX", "CONCATENATEX(table, expression, delimiter)", "Joins the expression for each row into one piece of text."],
      ],
      dax: {"card":["Worst Machine","Loss Dollars"],"format":{"Loss Dollars":"$#,0"}},
      out: `measure        value
Worst Machine  Conveyor 3
Loss Dollars   $251,876`,
    },
    {
      t: "Fault list per machine",
      goal: "Write Fault Types: the fault types of the cell's faults, joined with \", \" in alphabetical order.",
      code: `Fault Types = CONCATENATEX(VALUES(fault_log[fault]), fault_log[fault], ", ", fault_log[fault], ASC)`,
      about: "VALUES gives the fault types visible in the cell, and CONCATENATEX joins them. The last two arguments sort them; DAX promises no order without them, so a list could come out shuffled from one refresh to the next. Hoop Driver 1 has four kinds of fault, the most of the three.",
      terms: [
        ["ASC", "fault_log[fault], ASC", "Sort the list by fault name, A to Z."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Fault Types"]},
      out: `machine         Fault Types
Char Station 2  Char flare, E-stop, Low air
Conveyor 3      E-stop, Jam, Low air
Hoop Driver 1   E-stop, Hoop misfeed, Jam, Low air
Total           Char flare, E-stop, Hoop misfeed, Jam, Low air`,
    },
    {
      t: "Top fault per machine",
      goal: "Write Top Fault: the fault type with the most Down Minutes in the cell, from TOPN(1, VALUES(fault_log[fault]), [Down Minutes]).",
      code: `Top Fault = CONCATENATEX(TOPN(1, VALUES(fault_log[fault]), [Down Minutes]), fault_log[fault], ", ", fault_log[fault], ASC)`,
      about: "Each machine's biggest loss: the char flare on Char Station 2, jams on Conveyor 3, misfeeds on Hoop Driver 1. Inside TOPN, Down Minutes is worked out per fault type within the machine's row. The Total row's top fault is low air, though no machine's top fault is low air: it is second on all three, and adds up across them.",
      terms: [
        ["TOPN(1, VALUES(fault_log[fault]), [Down Minutes])", "Largest fault", "The fault type with the most minutes in the cell."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Down Minutes","Top Fault"],"format":{"Down Minutes":"0.00"}},
      out: `machine         Down Minutes  Top Fault
Char Station 2         87.05  Char flare
Conveyor 3             99.35  Jam
Hoop Driver 1         114.18  Hoop misfeed
Total                 300.58  Low air`,
    },
    {
      t: "Cumulative Pareto",
      goal: "Write Cumulative Share: Down Minutes of every fault type with at least this row's minutes, over all fault types. Show it on fault rows only.",
      code: `Cumulative Share =
    VAR mine = [Down Minutes]
    VAR upto = CALCULATE([Down Minutes], FILTER(ALL(fault_log[fault]), [Down Minutes] >= mine))
    RETURN IF(HASONEVALUE(fault_log[fault]), DIVIDE(upto, CALCULATE([Down Minutes], ALL(fault_log[fault]))))`,
      about: "The running total of a Pareto: each fault type plus every larger one, over the whole. FILTER walks all fault types and keeps those at least as large as this row's, which the variable mine holds fixed. Low air and the char flare together are 52.4%, the DB track's cumulative Pareto; three causes cover 74.5%.",
      terms: [
        ["mine", "This row's minutes", "Held in a variable, so FILTER compares each fault type against it."],
        ["[Down Minutes] >= mine", "This or larger", "The fault types at or above this row's."],
      ],
      dax: {"rows":"fault_log[fault]","values":["Down Minutes","Cumulative Share"],"format":{"Down Minutes":"0.00","Cumulative Share":"0.0%"}},
      out: `fault         Down Minutes  Cumulative Share
Char flare           70.05             52.4%
E-stop               10.80            100.0%
Hoop misfeed         66.57             74.5%
Jam                  65.73             96.4%
Low air              87.43             29.1%
Total               300.58`,
    },
    {
      t: "Availability loss in dollars",
      goal: "Write Avail Loss Dollars: for each machine, Week Down Min over 60 × ideal rate × margin, summed with SUMX.",
      code: `Avail Loss Dollars = SUMX(dim_machine, [Week Down Min] / 60 * dim_machine[ideal_rate_hr] * dim_machine[margin_per_barrel])`,
      about: "Every minute down is barrels not made at the ideal rate, each worth its margin. The line loses $11,349.80 a week to availability, the TPM track's breakdown and minor-stop dollars together ($8,190 + $3,160). It is the smallest of the three losses because fault_log only holds the stops the PLC detects.",
      terms: [
        ["[Week Down Min] / 60 * dim_machine[ideal_rate_hr]", "Barrels lost to stops", "Down hours at the ideal rate."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Week Down Min","Avail Loss Dollars"],"format":{"Week Down Min":"0.00","Avail Loss Dollars":"$#,0.00"}},
      out: `machine         Week Down Min  Avail Loss Dollars
Char Station 2          87.05           $3,083.02
Conveyor 3              94.73           $4,026.17
Hoop Driver 1          108.85           $4,240.61
Total                  290.63          $11,349.80`,
    },
    {
      t: "Performance loss in dollars",
      goal: "Write Perf Loss Dollars: for each machine, Ideal Count minus Barrels, times margin, summed with SUMX.",
      code: `Perf Loss Dollars = SUMX(dim_machine, ([Ideal Count] - [Barrels]) * dim_machine[margin_per_barrel])`,
      about: "The barrels a machine should have made while it was running, less the ones it made: running slow. At $221,444 a week this is 88% of the line's loss, the OEE report's main finding: this plant's money is in speed, not stops.",
      terms: [
        ["[Ideal Count] - [Barrels]", "Barrels lost to speed", "What it should have made while running, less what it made."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Ideal Count","Barrels","Perf Loss Dollars"],"format":{"Ideal Count":"#,0.0","Barrels":"#,0","Perf Loss Dollars":"$#,0"}},
      out: `machine         Ideal Count  Barrels  Perf Loss Dollars
Char Station 2      7,802.5    6,980            $34,954
Conveyor 3          9,355.3    7,120            $94,999
Hoop Driver 1       8,562.7    6,410            $91,491
Total              25,720.4   20,510           $221,444`,
    },
    {
      t: "Quality loss in dollars",
      goal: "Write Qual Loss Dollars: for each machine, Rejects times margin, summed with SUMX.",
      code: `Qual Loss Dollars = SUMX(dim_machine, [Rejects] * dim_machine[margin_per_barrel])`,
      about: "A rejected barrel was made and then lost, so it costs its whole margin. $19,082.50 a week, the OEE report's quality loss; Char Station 2's 211 rejects make it the largest, $8,967.50, though its OEE is the best.",
      terms: [
        ["[Rejects] * dim_machine[margin_per_barrel]", "Barrels lost to rejects", "Each reject costs one barrel's margin."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Rejects","Qual Loss Dollars"],"format":{"Qual Loss Dollars":"$#,0.00"}},
      out: `machine         Rejects  Qual Loss Dollars
Char Station 2      211          $8,967.50
Conveyor 3          142          $6,035.00
Hoop Driver 1        96          $4,080.00
Total               449         $19,082.50`,
    },
    {
      t: "The three losses add up",
      goal: "Write Loss Check: the three loss measures added together. Show the three, the check and Loss Dollars side by side.",
      code: `Loss Check = [Avail Loss Dollars] + [Perf Loss Dollars] + [Qual Loss Dollars]`,
      about: "Availability, performance and quality loss must add up to the whole gap between planned and good output, Loss Dollars, or one of the measures is wrong. They do, to the cent: $251,876.25. The OEE report makes the same check (\"Losses reconcile: True\"). Reconciling the parts against the whole is how a loss model earns trust.",
      terms: [
        ["Loss Check", "Reconciliation", "The parts added up, to compare with the whole."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Avail Loss Dollars","Perf Loss Dollars","Qual Loss Dollars","Loss Check","Loss Dollars"],"format":{"Avail Loss Dollars":"$#,0.00","Perf Loss Dollars":"$#,0.00","Qual Loss Dollars":"$#,0.00","Loss Check":"$#,0.00","Loss Dollars":"$#,0.00"}},
      out: `machine         Avail Loss Dollars  Perf Loss Dollars  Qual Loss Dollars   Loss Check  Loss Dollars
Char Station 2           $3,083.02         $34,954.48          $8,967.50   $47,005.00    $47,005.00
Conveyor 3               $4,026.17         $94,998.83          $6,035.00  $105,060.00   $105,060.00
Hoop Driver 1            $4,240.61         $91,490.64          $4,080.00   $99,811.25    $99,811.25
Total                   $11,349.80        $221,443.95         $19,082.50  $251,876.25   $251,876.25`,
    },
    {
      t: "Gap to 85%",
      goal: "Write Gap to 85: on a machine's row, how many OEE points it is below 85% (0 if above), using MAX(0, …); blank on the Total row.",
      code: `Gap to 85 = IF(HASONEVALUE(dim_machine[machine]), MAX(0, 0.85 - [OEE]) * 100)`,
      about: "85% is the usual world-class OEE benchmark. MAX(0, …) keeps a machine above target at 0 rather than a negative gap. Hoop Driver 1 is furthest away, 12.1 points, the Plant Board's \"biggest gap\" tile; Conveyor 3 is 11.2. The Total row is left blank because a line-level gap is not the sum of the machines'.",
      terms: [
        ["MAX(0, 0.85 - [OEE])", "Gap, never negative", "The larger of 0 and the shortfall."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["OEE","Gap to 85"],"format":{"OEE":"0.0%","Gap to 85":"0.0"}},
      out: `machine           OEE  Gap to 85
Char Station 2  86.0%        0.0
Conveyor 3      73.8%       11.2
Hoop Driver 1   72.9%       12.1
Total           77.2%`,
    },
    {
      t: "Dollars from closing the gap",
      goal: "Write Gap Dollars: for each machine, Gap to 85 times Dollars per OEE Pt, summed with SUMX.",
      code: `Gap Dollars = SUMX(dim_machine, [Gap to 85] * [Dollars per OEE Pt])`,
      about: "What reaching 85% would be worth each week. Conveyor 3's gap is worth $44,816, a little more than Hoop Driver 1's $44,588, though Hoop Driver 1's gap is bigger: Conveyor 3's points are worth more. Rank improvement work by dollars, not by points. The Total row adds the machines' dollars, which is meaningful even where adding their gaps is not.",
      terms: [
        ["[Gap to 85] * [Dollars per OEE Pt]", "Gap in dollars", "Points to target times dollars per point."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Gap to 85","Dollars per OEE Pt","Gap Dollars"],"format":{"Gap to 85":"0.0","Dollars per OEE Pt":"$#,0","Gap Dollars":"$#,0"}},
      out: `machine         Gap to 85  Dollars per OEE Pt  Gap Dollars
Char Station 2        0.0              $3,347           $0
Conveyor 3           11.2              $4,016      $44,816
Hoop Driver 1        12.1              $3,682      $44,588
Total                                 $11,045      $89,404`,
    },
    {
      t: "What if the margin were $45",
      goal: "Write Loss at 45: Loss Dollars worked out with a margin of $45 a barrel held in a variable, instead of each machine's margin.",
      code: `Loss at 45 =
    VAR margin = 45
    RETURN SUMX(dim_machine, ([Planned Min] / 60 * dim_machine[ideal_rate_hr] - ([Barrels] - [Rejects])) * margin)`,
      about: "A what-if: the same lost barrels, a different price. $45 is illustrative, not a forecast. Each dollar of margin is worth about $5,927 of weekly loss across the line, so a margin assumption changes the case for a project as much as the OEE does. In Power BI the 45 would usually come from a what-if parameter's slicer; a variable shows the idea.",
      terms: [
        ["VAR margin = 45", "Assumption", "One number to change, held in a variable."],
      ],
      dax: {"rows":"dim_machine[machine]","values":["Loss Dollars","Loss at 45"],"format":{"Loss Dollars":"$#,0.00","Loss at 45":"$#,0.00"}},
      out: `machine         Loss Dollars   Loss at 45
Char Station 2    $47,005.00   $49,770.00
Conveyor 3       $105,060.00  $111,240.00
Hoop Driver 1     $99,811.25  $105,682.50
Total            $251,876.25  $266,692.50`,
    },
  ],
});
