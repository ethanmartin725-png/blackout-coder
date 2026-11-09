// Project track 11: Line Status Screen (Ignition)
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
// Outputs: node tools/output-checks/ignition/run.mjs (scenarios in tools/output-checks/ignition/scenarios.mjs)
BC.addTrack({
  id: "t-hmi",
  name: "Line Status Screen",
  sub: "The Ignition logic behind Conveyor 3's operator screen: expression bindings for state, color, OEE and shift, and scripts for fault logging, an interlocked reset, setpoints, an audit trail, a Pareto query and the shift change",
  lessons: [
    {
      lang: "ignexpr",
      file: "State label · text binding",
      t: "State text with switch",
      goal: "Bind the state label's text with switch(): Conv_State 1, 2, 3 give RUNNING, JAMMED, IDLE, anything else UNKNOWN.",
      code: `switch({[default]Conveyor3/Conv_State},
    1, 2, 3,
    "RUNNING", "JAMMED", "IDLE",
    "UNKNOWN")`,
      about: "This track builds the logic behind Conveyor 3's operator screen: bindings that show state, and scripts behind the buttons and tags. switch() lists every value to match first, then the results in the same order, then the default; case() pairs each value with its result. Both re-evaluate the moment the tag changes. Outputs come from the expression model in tools/output-checks/ignition.",
      terms: [
        ["switch", "switch(value, cases…, results…, default)", "Values first, then results in the same order."],
        ["\"UNKNOWN\"", "Default", "For any code not listed."],
      ],
      out: `Conv_State = 1  →  RUNNING
Conv_State = 2  →  JAMMED
Conv_State = 3  →  IDLE
Conv_State = 0  →  UNKNOWN`,
    },
    {
      lang: "ignexpr",
      file: "State banner · background binding",
      t: "Banner color",
      goal: "Bind the banner background: red when Jam_Fault is on or the state is 2, green when running, grey otherwise.",
      code: `if({[default]Conveyor3/Jam_Fault} || {[default]Conveyor3/Conv_State} = 2,
    "#c62828",
    if({[default]Conveyor3/Conv_State} = 1, "#2e7d32", "#8c9ab3"))`,
      about: "if() picks one of two values; nesting a second if() gives three. || is or, and a single = compares, unlike a script. The fault wins over everything else, so it is tested first. High-performance HMI practice keeps normal states grey and saves bright color for what needs attention; green for running is a common compromise. The colors are illustrative.",
      terms: [
        ["||", "||", "Or."],
        ["=", "= (compare)", "Equal. In an expression, = compares."],
        ["if", "if(cond, a, b)", "a when true, b when false."],
      ],
      out: `Jam_Fault 0, state 1  →  #2e7d32
Jam_Fault 0, state 3  →  #8c9ab3
Jam_Fault 1, state 1  →  #c62828
Jam_Fault 0, state 2  →  #c62828`,
    },
    {
      lang: "ignexpr",
      file: "OEE label · text binding",
      t: "OEE as a percent",
      goal: "Show the OEE tag as a percent with one decimal: numberFormat of OEE × 100 with the pattern 0.0, then a percent sign.",
      code: `numberFormat({[default]Conveyor3/OEE} * 100, "0.0") + "%"`,
      about: "numberFormat uses Java's DecimalFormat: 0 forces a digit, so 0.0 always shows one decimal, and + joins the text. Formatting in the binding leaves the tag a plain number that trends and alarms can use. 0.738 is Conveyor 3's weekly OEE from the OEE Loss Report; DecimalFormat rounds a half to even, which can differ from Excel at exactly .5.",
      terms: [
        ["numberFormat", "numberFormat(value, pattern)", "A number as text, by pattern."],
        ["\"0.0\"", "Pattern 0.0", "Always one decimal."],
      ],
      out: `OEE = 0.738  →  73.8%
OEE = 0.86   →  86.0%
OEE = 0.7    →  70.0%`,
    },
    {
      lang: "ignexpr",
      file: "Last fault label · text binding",
      t: "Minutes since the last fault",
      goal: "Show how long since the last fault ended: dateDiff from Last_Fault_End to now() in minutes, formatted with no decimals, then \" min\".",
      code: `numberFormat(dateDiff({[default]Conveyor3/Last_Fault_End}, now(), "minute"), "#,##0") + " min"`,
      about: "dateDiff gives the gap between two dates in the unit named, with decimals; numberFormat then rounds it for display. now() keeps the binding updating as time passes. Conveyor 3's last fault, the shift A jam, ended at 09:13:29, so at 14:05 it has run 291.5 minutes without one.",
      terms: [
        ["dateDiff", "dateDiff(a, b, \"minute\")", "b minus a, in minutes."],
        ["now", "now()", "The current time; re-evaluates."],
        ["\"#,##0\"", "Pattern #,##0", "Whole number with separators."],
      ],
      out: `at 09:20  →  7 min
at 11:45  →  152 min
at 14:05  →  292 min`,
    },
    {
      lang: "ignexpr",
      file: "Behind lamp · visible binding",
      t: "Behind target",
      goal: "Show the behind lamp when the barrel count is under 95% of the target so far.",
      code: `{[default]Conveyor3/Barrel_Count/ACC} < {[default]Conveyor3/Target_Now} * 0.95`,
      about: "A comparison is already true or false, so it can drive a visible property with no if(). Target_Now is the PLC's running target, as in the ladder lesson: 60 per hour of paid run time. 95% is an illustrative threshold. At 4 hours, 196 barrels against 240 is well behind; at the end of shift, 352 of 450 is 78.2%.",
      terms: [
        ["<", "<", "Less than: true or false."],
        ["0.95", "95%", "The illustrative behind threshold."],
      ],
      out: `2 h: 116 of 120  →  false
4 h: 196 of 240  →  true
end: 352 of 450  →  true`,
    },
    {
      lang: "ignexpr",
      file: "Shift label · text binding",
      t: "Shift from the clock",
      goal: "Show the current shift from the hour: A from 06:00, B from 14:00, C otherwise.",
      code: `if(getHour24(now()) >= 6 && getHour24(now()) < 14, "A",
    if(getHour24(now()) >= 14 && getHour24(now()) < 22, "B", "C"))`,
      about: "The same rule as the scripting lane's shiftFor(), as one expression. && is and. Shift C crosses midnight, so it is whatever is left. Defining shifts in two places invites them to drift apart: in a real project, keep the rule in one place, such as a gateway script that writes a Shift tag, and bind to that.",
      terms: [
        ["&&", "&&", "And."],
        ["getHour24", "getHour24(date)", "The hour, 0 to 23."],
      ],
      out: `at 05:59  →  C
at 06:00  →  A
at 14:05  →  B
at 22:30  →  C`,
    },
    {
      lang: "ignexpr",
      file: "Operator label · text binding",
      t: "Fallback for a missing value",
      goal: "Show the logged-in operator, or \"No operator logged in\" when the tag has no value.",
      code: `coalesce({[default]Conveyor3/Operator}, "No operator logged in")`,
      about: "A tag with no value, or one that has gone bad, gives null, and a label showing null looks broken. coalesce returns its first non-null argument, so the screen says something useful instead. J. Ruiz is the shift A lead from the handoff notes.",
      terms: [
        ["coalesce", "coalesce(a, b)", "a, unless it is null."],
      ],
      out: `Operator = J. Ruiz  →  J. Ruiz
Operator = null     →  No operator logged in`,
    },
    {
      lang: "ignition",
      file: "Jam_Fault tag · valueChanged script",
      t: "Log the fault and keep its id",
      goal: "On a jam start, insert the fault with the gateway time, get its new fault_id with getKey, and store it in the Open_Fault_Id memory tag.",
      code: `def valueChanged(tag, tagPath, previousValue, currentValue, initialChange, missedEvents):
    if initialChange or not currentValue.quality.isGood():
        return
    if currentValue.value and not previousValue.value:
        query = "INSERT INTO fault_log (machine, fault, start_ts) VALUES (?, ?, ?)"
        faultId = system.db.runPrepUpdate(query, ["Conveyor 3", "Jam", system.date.now()], "PlantDB", getKey=True)
        system.tag.writeBlocking(["[default]Conveyor3/Open_Fault_Id"], [faultId])`,
      about: "The PLC track closed a fault by finding the machine's open row. Keeping the new row's id is more exact: if two faults ever overlapped, an update by machine would close the wrong one. getKey=True makes runPrepUpdate return the generated key instead of the row count. The jam is shift A's, at 09:08:52.",
      terms: [
        ["getKey=True", "getKey=True", "Returns the new row's id."],
        ["Open_Fault_Id", "Memory tag", "Remembers which row to close."],
      ],
      out: `Open_Fault_Id: 48
fault_id  machine     fault  start_ts             end_ts
48        Conveyor 3  Jam    2026-11-07 09:08:52  NULL`,
    },
    {
      lang: "ignition",
      file: "Jam_Fault tag · valueChanged script",
      t: "Close the fault by id",
      goal: "When the jam clears, close the row whose id is in Open_Fault_Id with the gateway time, then set the memory tag back to 0.",
      code: `    elif previousValue.value and not currentValue.value:
        faultId = system.tag.readBlocking(["[default]Conveyor3/Open_Fault_Id"])[0].value
        if faultId:
            query = "UPDATE fault_log SET end_ts = ? WHERE fault_id = ? AND end_ts IS NULL"
            system.db.runPrepUpdate(query, [system.date.now(), faultId], "PlantDB")
            system.tag.writeBlocking(["[default]Conveyor3/Open_Fault_Id"], [0])`,
      about: "elif pairs with the start check, so this runs only on the change from on to off. if faultId skips the update when no id was stored, for example after a gateway restart while a jam was open; that case needs the machine-based close from the PLC track as a fallback. AND end_ts IS NULL stops a repeat event closing the row twice.",
      terms: [
        ["elif", "elif", "On to off: the jam cleared."],
        ["fault_id = ?", "By id", "Closes exactly the row that was opened."],
      ],
      out: `Open_Fault_Id: 0
fault_id  machine     fault  start_ts             end_ts
48        Conveyor 3  Jam    2026-11-07 09:08:52  2026-11-07 09:13:29`,
    },
    {
      lang: "ignition",
      file: "Reset button · onActionPerformed script",
      t: "Reset button with an interlock",
      goal: "Write runAction(self, event) for the Reset button: refuse while the eye is still blocked, otherwise write True to Reset_Request for the PLC, and return a message either way.",
      code: `def runAction(self, event):
    blocked = system.tag.readBlocking(["[default]Conveyor3/Eye_Blocked"])[0].value
    if blocked:
        return "Reset refused: clear the barrel from the eye first"
    system.tag.writeBlocking(["[default]Conveyor3/Reset_Request"], [True])
    return "Reset requested"`,
      about: "The screen checks the same interlock as the PLC's reset rung, so the operator gets a clear reason instead of a button that seems to do nothing. The PLC still has the final say. The script writes a request bit that the PLC clears once it has acted, rather than pulsing a bit on and off from the screen, which a slow network can turn into a pulse the PLC never sees.",
      terms: [
        ["runAction", "runAction(self, event)", "A Perspective button's action script."],
        ["Reset_Request", "Request bit", "Set by the screen, cleared by the PLC."],
      ],
      out: `Reset refused: clear the barrel from the eye first
Reset requested
Reset_Request: True`,
    },
    {
      lang: "ignition",
      file: "Project library · plant",
      t: "Setpoint with a range check",
      goal: "Write setSpeed(value) that refuses anything outside 20 to 60 barrels per hour, writes Speed_SP otherwise, and returns what happened.",
      code: `def setSpeed(value):
    if not 20.0 <= value <= 60.0:
        return "refused: %.1f is outside 20 to 60" % value
    quality = system.tag.writeBlocking(["[default]Conveyor3/Speed_SP"], [float(value)])[0]
    return "set to %.1f (%s)" % (value, quality)`,
      about: "The same 20 to 60 limits as the PLC lessons' clamp, checked before the write so the operator learns at once that the number was refused. The PLC should still clamp it: a screen is one of several ways a value can arrive. float() makes 45 from a numeric field into 45.0 for a REAL tag. 60 is Conveyor 3's ideal rate.",
      terms: [
        ["20.0 <= value <= 60.0", "Range check", "Inside the machine's rated range."],
        ["float", "float(value)", "A REAL tag gets a float."],
      ],
      out: `set to 45.0 (Good)
refused: 75.0 is outside 20 to 60
refused: 5.5 is outside 20 to 60
set to 60.0 (Good)
Speed_SP: 60.0`,
    },
    {
      lang: "ignition",
      file: "Project library · plant",
      t: "Audit the operator's actions",
      goal: "Write audit(user, action, detail) that logs to an Audit logger, and call it from setSpeed's caller for two setpoint changes.",
      code: `def audit(user, action, detail):
    system.util.getLogger("Audit").info("%s | %s | %s" % (user, action, detail))

def changeSpeed(user, value):
    result = setSpeed(value)
    audit(user, "Speed_SP", "%.1f: %s" % (value, result))
    return result`,
      about: "Who changed a setpoint, to what and when is the first question after any quality or safety event. Every change goes through one function that records it, refused attempts included. The log line keeps fields in a fixed order split by bars, so it can be searched. A regulated process would write this to a database table instead; the gateway log is where it starts.",
      terms: [
        ["audit", "audit(user, action, detail)", "One line per operator action."],
        ["changeSpeed", "changeSpeed", "Sets the speed and records it."],
      ],
      out: `INFO  [Audit] J. Ruiz | Speed_SP | 55.0: set to 55.0 (Good)
INFO  [Audit] J. Ruiz | Speed_SP | 72.0: refused: 72.0 is outside 20 to 60`,
    },
    {
      lang: "ignition",
      file: "Pareto chart · data script",
      t: "Pareto query",
      goal: "Write paretoRows() that sums each fault's minutes in fault_log, counting an open fault up to the gateway time, largest first, and print each fault's minutes.",
      code: `def paretoRows():
    query = """SELECT fault, SUM(DATEDIFF(SECOND, start_ts, ISNULL(end_ts, ?))) / 60.0 AS minutes
FROM fault_log
GROUP BY fault
ORDER BY minutes DESC"""
    return system.db.runPrepQuery(query, [system.date.now()], "PlantDB")

for row in paretoRows():
    print("%-13s %5.1f" % (row["fault"], row["minutes"]))`,
      about: "The DB Pulls track's Pareto query, with one change: an open fault is counted up to the gateway's time, passed as a parameter, rather than the database's GETDATE(). Every number on the screen then uses one clock, and the query can be tested at a fixed time. At 10:15 it returns the canonical Pareto: Low air 87.4, Char flare 70.0, Hoop misfeed 66.6, Jam 65.7, E-stop 10.8.",
      terms: [
        ["ISNULL(end_ts, ?)", "Open faults", "Counted up to the gateway time."],
        ["runPrepQuery", "runPrepQuery", "Rows for the chart."],
      ],
      out: `Low air        87.4
Char flare     70.0
Hoop misfeed   66.6
Jam            65.7
E-stop         10.8`,
    },
    {
      lang: "ignition",
      file: "Gateway timer · hourly",
      t: "Hourly output with a rollover",
      goal: "Each hour, read Conveyor 3's lifetime barrel counter and last hour's reading from a memory tag, work out the barrels made with a 16-bit rollover, show it in Made_Last_Hour, and store the new reading.",
      code: `LAST = "[default]Conveyor3/Total_Last_Hour"
total, last = [qv.value for qv in system.tag.readBlocking(["[default]Conveyor3/Barrel_Total", LAST])]
made = (total - last) % 65536

system.tag.writeBlocking(["[default]Conveyor3/Made_Last_Hour", LAST], [made, total])
system.util.getLogger("Conveyor3").info("%d barrels last hour" % made)`,
      about: "The shift counter resets every shift and never gets near 65,535, so a rollover comes from a lifetime counter, one that only ever counts up and wraps every 65,536 barrels, a few weeks of running. The difference is taken modulo 65536, so it stays right across the wrap. The screen shows it in a memory tag; count_log keeps the raw shift counter for the database's reset-safe view. The lifetime readings are illustrative, 47 an hour as in shift A's first hours.",
      terms: [
        ["% 65536", "Rollover", "Wraps the difference into the counter's range."],
        ["Barrel_Total", "Lifetime counter", "Never reset; wraps after 65,535."],
        ["Made_Last_Hour", "Memory tag", "Barrels made in the last hour, for the screen."],
      ],
      out: `INFO  [Conveyor3] 47 barrels last hour
INFO  [Conveyor3] 47 barrels last hour
INFO  [Conveyor3] 47 barrels last hour`,
    },
    {
      lang: "ignition",
      file: "Gateway scheduled · 06:00, 14:00, 22:00",
      t: "Shift change",
      goal: "At each shift change, save each machine's final count as a count_log row stamped with the shift end, write the new shift name to the Shift/Name tag, and request a counter reset from the PLC.",
      code: `def shiftChange(newShift):
    now = system.date.now()
    machines = [("Char Station 2", "CharStation2"), ("Conveyor 3", "Conveyor3"), ("Hoop Driver 1", "HoopDriver1")]
    query = "INSERT INTO count_log (machine, barrels, state, ts) VALUES (?, ?, ?, ?)"
    for name, folder in machines:
        count, state = [qv.value for qv in system.tag.readBlocking(["[default]%s/Barrel_Count/ACC" % folder, "[default]%s/State" % folder])]
        system.db.runPrepUpdate(query, [name, count, state, now], "PlantDB")
    system.tag.writeBlocking(["[default]Shift/Name", "[default]Shift/Reset_Counts"], [newShift, True])`,
      about: "Save, then clear, as in the ladder and memory-tag lessons: the final counts are stored before the reset is requested, and the PLC does the reset itself when it sees the request. One timestamp for all three rows makes them one shift's record. The output runs it at 14:00 with shift A's final counts: 301, 352 and 274.",
      terms: [
        ["shiftChange", "shiftChange(newShift)", "Runs at 06:00, 14:00 and 22:00."],
        ["Reset_Counts", "Reset request", "The PLC clears its counters and this bit."],
      ],
      out: `machine         barrels  state  ts
Char Station 2  301      2      2026-11-07 14:00:00
Conveyor 3      352      1      2026-11-07 14:00:00
Hoop Driver 1   274      1      2026-11-07 14:00:00
Shift/Name: B
Shift/Reset_Counts: True`,
    },
  ],
});
