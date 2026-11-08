// Project track 1: PLC & HMI
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
BC.addTrack({
  id: "t-plc",
  name: "PLC & HMI",
  sub: "Conveyor 3 jam cell: ladder, Structured Text, Ignition scripts, operator faceplate",
  lessons: [
    {
      lang: "ladder",
      file: "Conveyor3 · MainRoutine",
      t: "Run permissive",
      goal: "Energize Run_Permissive only when Auto_Mode is on, Estop_OK is on, and Jam_Fault is off.",
      code: `XIC(Auto_Mode) XIC(Estop_OK) XIO(Jam_Fault) OTE(Run_Permissive);`,
      about: "A permissive gathers every condition the conveyor needs before it may run. Later rungs check this one bit instead of repeating the list. Estop_OK is 1 while the e-stop circuit is healthy, so it uses XIC.",
      terms: [
        ["XIC", "XIC", "True when the bit is 1."],
        ["XIO", "XIO", "True when the bit is 0. Here: no jam fault present."],
        ["Run_Permissive", "Permissive", "One bit that means \"all run conditions met\". Keeps later rungs short and gives maintenance one place to look."],
      ],
      out: `Auto_Mode=1  Estop_OK=1  Jam_Fault=0   →  Run_Permissive=1
Any one of those wrong                 →  Run_Permissive=0`,
    },
    {
      lang: "ladder",
      file: "Conveyor3 · MainRoutine",
      t: "Start/stop seal-in",
      goal: "Start Conv_Run with Start_PB and seal it in. Drop it when Stop_PB opens or Run_Permissive goes false.",
      code: `BST XIC(Start_PB) NXB XIC(Conv_Run) BND XIC(Stop_PB) XIC(Run_Permissive) OTE(Conv_Run);`,
      about: "The branch lets either the start button or the running bit hold the rung true. Stop_PB is wired normally closed, so its XIC is true until someone presses it. The permissive in series means a jam or e-stop drops the motor even if nobody touches Stop.",
      terms: [
        ["BST", "BST / NXB / BND", "Branch start, next leg, branch end. Parallel legs are OR logic."],
        ["Conv_Run", "Seal-in", "The output's own bit in the branch holds the rung after Start is released."],
        ["Stop_PB", "Normally closed stop", "The stop button reads 1 at rest. Pressing it, or a broken wire, reads 0 and stops the motor. That is the fail-safe choice."],
      ],
      out: `Press Start_PB          →  Conv_Run=1
Release Start_PB        →  Conv_Run stays 1 (sealed in)
Press Stop_PB           →  Conv_Run=0
Run_Permissive drops    →  Conv_Run=0`,
    },
    {
      lang: "ladder",
      file: "Conveyor3 · MainRoutine",
      t: "Jam detection",
      goal: "If the eye stays blocked 4 seconds while running, latch Jam_Fault. Clear it with Reset_PB only after the eye clears.",
      code: `XIC(Conv_Run) XIC(Eye_Blocked) TON(Jam_Timer,4000,0);
XIC(Jam_Timer.DN) OTL(Jam_Fault);
XIC(Reset_PB) XIO(Eye_Blocked) OTU(Jam_Fault);`,
      about: "A barrel normally clears the photo eye in about a second, so 4 seconds blocked means it is stuck. The fault latches so it survives the conveyor stopping. The reset rung refuses to clear it while the barrel is still in the way.",
      terms: [
        ["TON", "TON(timer,preset,accum)", "Timer On Delay. Times while the rung is true, resets when false. Preset is in ms."],
        ["DN", ".DN", "Done bit. On when the accumulator reaches the preset."],
        ["OTL", "OTL / OTU", "Latch and unlatch. The bit stays set until the unlatch rung clears it."],
        ["Eye_Blocked", "Reset interlock", "XIO(Eye_Blocked) on the reset rung blocks a reset until the jam is physically cleared."],
      ],
      out: `Eye blocked 4.0 s while running   →  Jam_Timer.DN=1  →  Jam_Fault=1
Jam_Fault=1  →  Run_Permissive=0  →  Conv_Run=0
Reset_PB while eye still blocked   →  no change
Reset_PB with eye clear            →  Jam_Fault=0`,
    },
    {
      lang: "ladder",
      file: "Conveyor3 · MainRoutine",
      t: "Count barrels",
      goal: "Count each barrel once in Barrel_Count as it blocks the eye, and reset the count on Shift_Change.",
      code: `XIC(Eye_Blocked) CTU(Barrel_Count,9999,0);
XIC(Shift_Change) RES(Barrel_Count);`,
      about: "CTU counts only when its rung goes from false to true, so a slow barrel that blocks the eye for many scans still counts once. No one-shot is needed in front of it. The preset is set high because this counter totals the shift rather than flagging a lot size. This count feeds the performance and quality math in later tracks.",
      terms: [
        ["CTU", "CTU(counter,preset,accum)", "Count Up. Adds 1 each time the rung goes false to true. It remembers the last rung state in its .CU bit, which is how it sees the edge."],
        ["RES", "RES", "Reset. Zeroes the counter's accumulator and status bits."],
        ["Barrel_Count", ".ACC", "The counter's running total. This is the number Ignition will read."],
      ],
      out: `3 barrels pass the eye   →  Barrel_Count.ACC = 3
Shift_Change pulse       →  Barrel_Count.ACC = 0`,
    },
    {
      lang: "ladder",
      file: "Conveyor3 · MainRoutine",
      t: "Machine state codes",
      goal: "Write Conv_State: 1 when running, 2 when jammed, 3 when stopped with no fault.",
      code: `XIC(Conv_Run) MOV(1,Conv_State);
XIC(Jam_Fault) MOV(2,Conv_State);
XIO(Conv_Run) XIO(Jam_Fault) MOV(3,Conv_State);`,
      about: "A single integer that says what the machine is doing is what an OEE system logs. Rungs execute top to bottom each scan, so if two are true in the same scan, the later one wins. That ordering is why a jam always reads as 2.",
      terms: [
        ["MOV", "MOV(source,dest)", "Move. Copies the source value into the destination tag."],
        ["Conv_State", "State code", "An INT tag. 1 Running, 2 Faulted, 3 Idle. These codes become your downtime categories."],
        [null, "Scan order", "Later rungs overwrite earlier ones in the same scan. Order rungs so the highest-priority state is last."],
      ],
      out: `Running             →  Conv_State = 1
Jammed              →  Conv_State = 2
Stopped, no fault   →  Conv_State = 3`,
    },
    {
      lang: "st",
      file: "Conveyor3 · ST_Logic",
      t: "Permissive in Structured Text",
      goal: "Rewrite the permissive and the start/stop seal-in as two Structured Text statements.",
      code: `Run_Permissive := Auto_Mode AND Estop_OK AND NOT Jam_Fault;
Conv_Run := (Start_PB OR Conv_Run) AND Stop_PB AND Run_Permissive;`,
      about: "The same logic as ladder rungs 0 and 1, written as Boolean math. Series contacts become AND, a parallel branch becomes OR inside parentheses, and XIO becomes NOT. Many sites keep ladder for anything maintenance troubleshoots and use Structured Text for math and long logic.",
      terms: [
        [":", ":=", "Assignment in Structured Text. A plain = is a comparison."],
        ["AND", "AND", "Series contacts. Both sides must be true."],
        ["OR", "OR", "A parallel branch. Either side may be true."],
        ["NOT", "NOT", "Inverts a bit. NOT Jam_Fault works like XIO(Jam_Fault)."],
      ],
      out: `Same behavior as ladder rungs 0 and 1.`,
    },
    {
      lang: "st",
      file: "Conveyor3 · ST_Logic",
      t: "Timers in Structured Text",
      goal: "Run Jam_Timer (4000 ms) while running with the eye blocked, set Jam_Fault when it is done, and clear it on reset with the eye clear.",
      code: `Jam_Timer.PRE := 4000;
Jam_Timer.TimerEnable := Conv_Run AND Eye_Blocked;
TONR(Jam_Timer);

IF Jam_Timer.DN THEN
    Jam_Fault := 1;
END_IF;

IF Reset_PB AND NOT Eye_Blocked THEN
    Jam_Fault := 0;
END_IF;`,
      about: "In Studio 5000 Structured Text the on-delay timer is TONR, using an FBD_TIMER tag: set .PRE and .TimerEnable, then call it every scan. An IF that only ever sets a bit to 1 behaves like a latch. Generic IEC controllers write the same timer as Jam_Timer(IN := ..., PT := T#4S).",
      terms: [
        ["TONR", "TONR(timer)", "Rockwell's Structured Text on-delay timer. Call it every scan."],
        ["TimerEnable", ".TimerEnable", "The timer's input. True means time; false resets."],
        ["IF", "IF … THEN … END_IF;", "Runs the statements inside only when the condition is true."],
        ["Jam_Fault", "Latch by IF", "Setting a bit inside an IF, and clearing it only in another IF, holds it like OTL/OTU."],
      ],
      out: `Same behavior as ladder rungs 2, 3 and 4.`,
    },
    {
      lang: "st",
      file: "Conveyor3 · ST_Logic",
      t: "State with IF / ELSIF",
      goal: "Set Conv_State to 2 if jammed, else 1 if running, else 3.",
      code: `IF Jam_Fault THEN
    Conv_State := 2;
ELSIF Conv_Run THEN
    Conv_State := 1;
ELSE
    Conv_State := 3;
END_IF;`,
      about: "The ladder version relied on rung order to let the jam win. Here priority is explicit: the first true branch wins, so the most important condition goes first.",
      terms: [
        ["ELSIF", "ELSIF", "Checked only if every condition above it was false."],
        ["ELSE", "ELSE", "Runs when nothing above matched."],
        ["END_IF", "END_IF;", "Closes the IF block. Note the semicolon."],
      ],
      out: `Jammed   →  Conv_State = 2
Running  →  Conv_State = 1
Otherwise → Conv_State = 3`,
    },
    {
      lang: "ignition",
      file: "Jam_Fault tag · valueChanged script",
      t: "Log a fault start",
      goal: "In the Jam_Fault tag's value-changed script, skip the initial change, and when the fault turns on insert a Jam row for \"Conveyor 3\" into fault_log on PlantDB.",
      code: `def valueChanged(tag, tagPath, previousValue, currentValue, initialChange, missedEvents):
    if initialChange:
        return
    if currentValue.value:
        query = "INSERT INTO fault_log (machine, fault) VALUES (?, ?)"
        system.db.runPrepUpdate(query, ["Conveyor 3", "Jam"], "PlantDB")`,
      about: "Ignition runs this every time the Jam_Fault tag changes. initialChange is true when the tag first loads, which is not a real event, so the script exits. The ? marks are parameters that Ignition fills safely from the list. The fault_log table fills start_ts itself with a default of the current time.",
      terms: [
        ["valueChanged", "def valueChanged(…)", "The tag event Ignition calls on every value change. Ignition supplies this line; the body is yours."],
        ["initialChange", "initialChange", "True on startup or tag reload. Skipping it avoids fake fault rows."],
        ["value", "currentValue.value", "The new tag value. currentValue also carries quality and timestamp."],
        ["runPrepUpdate", "system.db.runPrepUpdate", "Runs an INSERT/UPDATE with ? parameters against a named database connection."],
        ["?", "?", "A parameter placeholder. Never paste values into SQL text; pass them in the list."],
      ],
      out: `fault_log after a jam starts:
machine     fault  start_ts             end_ts
Conveyor 3  Jam    2026-11-07 06:42:10  NULL`,
    },
    {
      lang: "ignition",
      file: "Jam_Fault tag · valueChanged script",
      t: "Close the fault",
      goal: "When the fault clears, stamp end_ts on the open Conveyor 3 row.",
      code: `    else:
        query = (
            "UPDATE fault_log SET end_ts = CURRENT_TIMESTAMP "
            "WHERE machine = ? AND end_ts IS NULL"
        )
        system.db.runPrepUpdate(query, ["Conveyor 3"], "PlantDB")`,
      about: "This else pairs with if currentValue.value, so it runs when the fault goes off. Two strings side by side inside parentheses join into one, which keeps long SQL readable. end_ts IS NULL targets only the open fault. Now every jam has a start and an end, which is what a downtime report needs.",
      terms: [
        ["else", "else:", "Runs when the if above it was false. Its indent must match that if."],
        ["(", "( \"…\" \"…\" )", "Adjacent strings inside parentheses join into one string."],
        ["UPDATE", "UPDATE … SET", "Changes existing rows instead of adding new ones."],
        ["NULL", "IS NULL", "Matches empty values. = NULL never matches anything in SQL."],
      ],
      out: `machine     fault  start_ts             end_ts
Conveyor 3  Jam    2026-11-07 06:42:10  2026-11-07 06:44:55

Downtime for this event: 2 min 45 s`,
    },
    {
      lang: "ignition",
      file: "Gateway timer script · hourly",
      t: "Hourly count snapshot",
      goal: "Every hour, read Conveyor 3's Barrel_Count/ACC and Conv_State tags and insert them into count_log on PlantDB.",
      code: `paths = [
    "[default]Conveyor3/Barrel_Count/ACC",
    "[default]Conveyor3/Conv_State",
]
values = system.tag.readBlocking(paths)
count = values[0].value
state = values[1].value

query = "INSERT INTO count_log (machine, barrels, state) VALUES (?, ?, ?)"
system.db.runPrepUpdate(query, ["Conveyor 3", count, state], "PlantDB")`,
      about: "A gateway timer script runs on the server on a fixed delay you set, here 3,600,000 ms. readBlocking reads several tags in one trip and returns values in the same order as the paths. .value pulls the number out of each result.",
      terms: [
        ["readBlocking", "system.tag.readBlocking", "Reads a list of tag paths and waits for the results."],
        ["default", "[default]", "The tag provider name. Most gateways use default."],
        ["paths", "paths list", "One string per tag. The result list comes back in the same order."],
        ["value", "values[0].value", "First result, then its value. Each result also has .quality and .timestamp."],
      ],
      out: `count_log, one row per hour:
machine     barrels  state  ts
Conveyor 3  412      1      2026-11-07 07:00:00
Conveyor 3  398      1      2026-11-07 08:00:00`,
    },
    {
      lang: "ignexpr",
      file: "State label · text binding",
      t: "Status text binding",
      goal: "Bind a label's text to Conv_State: 1 is \"RUNNING\", 2 is \"JAMMED\", 3 is \"IDLE\", anything else is \"UNKNOWN\".",
      code: `case({[default]Conveyor3/Conv_State},
    1, "RUNNING",
    2, "JAMMED",
    3, "IDLE",
    "UNKNOWN")`,
      about: "An expression binding is one formula that updates the moment a referenced tag changes, with no script or polling. case() compares the first value against each pair and returns the match. The final lone argument is the default.",
      terms: [
        ["case", "case(value, k1, r1, …, default)", "Returns the result paired with the matching key, or the default."],
        ["{", "{[default]…}", "A tag reference inside an expression."],
        ["\"UNKNOWN\"", "Default value", "Always include one. A bad tag quality or a new state code shows UNKNOWN instead of a blank."],
      ],
      out: `Conv_State = 1  →  RUNNING
Conv_State = 2  →  JAMMED
Conv_State = 0  →  UNKNOWN`,
    },
    {
      lang: "html",
      file: "faceplate.html",
      t: "Faceplate layout",
      goal: "Lay out a Conveyor 3 faceplate: title, a state banner reading RUNNING, rows for Barrels 412 and Jam faults 2, and a Reset Jam button.",
      code: `<div class="faceplate">
  <h3>Conveyor 3</h3>
  <div class="state">RUNNING</div>
  <div class="row"><span>Barrels</span><b>412</b></div>
  <div class="row"><span>Jam faults</span><b>2</b></div>
  <button>Reset Jam</button>
</div>`,
      about: "A faceplate is the small panel an operator uses for one machine. Structure comes first: name, the one thing that matters most (state), the counts, then the single action. A Perspective view is built the same way, as a tree of containers holding components.",
      terms: [
        ["div", "<div class>", "A container. class names hook it to style rules."],
        ["h3", "<h3>", "A heading for the panel."],
        ["b", "<span> / <b>", "Inline text. Here: a label and a bold value."],
        ["button", "<button>", "The operator action. One clear action per faceplate."],
      ],
    },
    {
      lang: "css",
      file: "faceplate.css",
      t: "High-performance styling",
      goal: "Style the faceplate gray with dark text, a darker state banner, label/value rows spread apart, and a red .state.alarm style for faults.",
      code: `.faceplate {
  background: #d4d4d4;
  color: #1a1a1a;
  width: 220px;
  padding: 12px;
  font-family: Arial, sans-serif;
}
.state {
  background: #bdbdbd;
  padding: 6px;
  font-weight: bold;
}
.row {
  display: flex;
  justify-content: space-between;
}
.state.alarm {
  background: #d32f2f;
  color: #ffffff;
}`,
      about: "This follows high-performance HMI practice (ISA-101): normal operation is muted gray, and color is saved for abnormal states, so a red banner stands out across the floor. In Ignition Perspective you would create \"alarm\" as a Style Class; the idea is the same.",
      terms: [
        ["faceplate", ".faceplate { }", "A class selector and its block of rules."],
        ["background", "property: value;", "Each rule is a property name, a colon, a value, a semicolon."],
        ["#", "#d4d4d4", "A hex color: red, green, blue pairs. Equal pairs make gray."],
        ["flex", "display: flex", "Lays children out in a row. space-between pushes label and value apart."],
        ["alarm", ".state.alarm", "Matches elements that have both classes. Adding \"alarm\" turns the banner red."],
      ],
    },
    {
      lang: "ignexpr",
      file: "State banner · style.classes binding",
      t: "Alarm color binding",
      goal: "Bind the state banner's style classes to \"state alarm\" when Jam_Fault is on, otherwise \"state\".",
      code: `if({[default]Conveyor3/Jam_Fault}, "state alarm", "state")`,
      about: "if() takes a condition, a value when true, and a value when false. Binding the class list instead of a color keeps the look in one place (the style) and the logic in another. This closes the loop from PLC bit to operator screen.",
      terms: [
        ["if", "if(cond, a, b)", "Returns a when the condition is true, b when false."],
        ["\"state alarm\"", "Class list", "Space-separated class names. Both apply at once."],
        [null, "style.classes", "The Perspective property that holds a component's style classes."],
      ],
      out: `Jam_Fault = 0  →  classes: state         (gray banner)
Jam_Fault = 1  →  classes: state alarm   (red banner)`,
    },
  ],
});
