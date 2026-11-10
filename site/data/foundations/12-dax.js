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
  ],
});
