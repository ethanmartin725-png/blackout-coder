// Foundations lane: Structured Text (Studio 5000 style)
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
// Outputs come from the PLC interpreter: node tools/output-checks/plc/run.mjs
BC.addLane({
  id: "structured-text",
  name: "Structured Text",
  lang: "st",
  lessons: [
    {
      t: "Assign a value",
      goal: "Make Run_Lamp follow Conv_Run.",
      code: `Run_Lamp := Conv_Run;`,
      about: "The := operator copies the value on the right into the tag on the left. The routine runs top to bottom and is scanned again and again, so Run_Lamp tracks Conv_Run within one scan. This one line does the same job as the rung XIC(Conv_Run) OTE(Run_Lamp).",
      terms: [
        [":=", ":=", "Assignment. Puts the value on the right into the tag on the left."],
        [";", ";", "Ends the statement. Every Structured Text statement needs one."],
      ],
      sim: {"types":{"Conv_Run":"BOOL","Run_Lamp":"BOOL"},"watch":["Run_Lamp"],"steps":[{"label":"Conv_Run on","set":{"Conv_Run":1}},{"label":"Conv_Run off","set":{"Conv_Run":0}}]},
      out: `Conv_Run on   →  Run_Lamp=1
Conv_Run off  →  Run_Lamp=0`,
    },
    {
      t: "AND, OR and NOT",
      goal: "Set Run_Permissive when Auto_Mode and Estop_OK are on and Jam_Fault is off.",
      code: `Run_Permissive := Auto_Mode AND Estop_OK AND NOT Jam_Fault;`,
      about: "AND needs every condition true, OR needs any one, and NOT flips a bit. This is the PLC track's run permissive as one Boolean line: contacts in series become AND, and an XIO becomes NOT. The output below matches the ladder version exactly.",
      terms: [
        ["AND", "AND", "True only when both sides are true."],
        ["NOT", "NOT", "Flips true to false and false to true. The ST version of XIO."],
      ],
      sim: {"watch":["Run_Permissive"],"steps":[{"label":"Auto_Mode=1, Estop_OK=1, Jam_Fault=0","set":{"Auto_Mode":1,"Estop_OK":1}},{"label":"E-stop pressed: Estop_OK=0","set":{"Estop_OK":0}},{"label":"E-stop reset: Estop_OK=1","set":{"Estop_OK":1}},{"label":"Jam_Fault=1","set":{"Jam_Fault":1}}],"sameAs":"t-plc/Run permissive"},
      out: `Auto_Mode=1, Estop_OK=1, Jam_Fault=0  →  Run_Permissive=1
E-stop pressed: Estop_OK=0            →  Run_Permissive=0
E-stop reset: Estop_OK=1              →  Run_Permissive=1
Jam_Fault=1                           →  Run_Permissive=0`,
    },
    {
      t: "Seal-in in one line",
      goal: "Start Motor_Run with Start_PB and keep it running after release until Stop_PB opens. Stop_PB is wired normally closed.",
      code: `Motor_Run := (Start_PB OR Motor_Run) AND Stop_PB;`,
      about: "The motor's own bit inside the parentheses holds it on after Start is released, exactly like the seal-in branch in ladder. The parentheses matter: AND is worked out before OR, so without them Stop_PB would only guard the Motor_Run term and pressing Start would override Stop.",
      terms: [
        ["OR", "OR", "True when either side is true. The ST version of a parallel branch."],
        ["(", "( … )", "Groups the OR so the AND with Stop_PB applies to all of it."],
      ],
      sim: {"start":{"Stop_PB":1},"watch":["Motor_Run"],"steps":[{"label":"Press and release Start_PB","pulse":{"Start_PB":1}},{"label":"Wait 5 s","runMs":5000},{"label":"Press and release Stop_PB","pulse":{"Stop_PB":0}},{"label":"Press and release Start_PB","pulse":{"Start_PB":1}},{"label":"Hold Start_PB and Stop_PB together","set":{"Start_PB":1,"Stop_PB":0}}],"sameAs":"ladder/Seal-in circuit"},
      out: `Press and release Start_PB          →  Motor_Run=1
Wait 5 s                            →  no change
Press and release Stop_PB           →  Motor_Run=0
Press and release Start_PB          →  Motor_Run=1
Hold Start_PB and Stop_PB together  →  Motor_Run=0`,
    },
    {
      t: "Comments",
      goal: "Make Jam_Lamp follow Jam_Fault, with a block comment above saying what the lamp is for and a line comment after it.",
      code: `(* Jam lamp on the operator panel *)
Jam_Lamp := Jam_Fault; // follows the latched fault`,
      about: "(* … *) can span several lines; // runs to the end of the line. Logix also accepts /* … */. Comments are ignored when the code runs, so they cost nothing. Use them to say why the code does something; the code already says what.",
      terms: [
        ["(*", "(* … *)", "A block comment. Can span lines."],
        ["//", "//", "A comment to the end of the line."],
      ],
      sim: {"types":{"Jam_Fault":"BOOL","Jam_Lamp":"BOOL"},"watch":["Jam_Lamp"],"steps":[{"label":"Jam_Fault on","set":{"Jam_Fault":1}},{"label":"Jam_Fault off","set":{"Jam_Fault":0}}]},
      out: `Jam_Fault on   →  Jam_Lamp=1
Jam_Fault off  →  Jam_Lamp=0`,
    },
    {
      t: "Whole numbers and decimals",
      goal: "Set Run_Hours to 7.5, then compute Rate as Barrels divided by Run_Hours.",
      code: `Run_Hours := 7.5;
Rate := Barrels / Run_Hours;`,
      about: "DINT tags hold whole numbers and REAL tags hold decimals. Run_Hours is a REAL because it is given 7.5, so the division keeps its decimals: 352 barrels over 7.5 paid hours is Conveyor 3's shift A rate. Divide two DINTs and the decimals are lost, a common cause of wrong rates.",
      terms: [
        ["7.5", "7.5", "A REAL literal. The decimal point makes it a REAL."],
        ["/", "/", "Division. With a REAL on either side, the result keeps its decimals."],
      ],
      sim: {"types":{"Barrels":"DINT"},"watch":["Rate"],"steps":[{"label":"Barrels = 352","set":{"Barrels":352}},{"label":"Barrels = 274","set":{"Barrels":274}}]},
      out: `Barrels = 352  →  Rate=46.93333
Barrels = 274  →  Rate=36.53333`,
    },
    {
      t: "Compare values",
      goal: "Set Air_Low_Now while Hoop1_Air_PSI is below 80, and Hoop1_Air_OK while it is between 85 and 110.",
      code: `Air_Low_Now := Hoop1_Air_PSI < 80.0;
Hoop1_Air_OK := Hoop1_Air_PSI >= 85.0 AND Hoop1_Air_PSI <= 110.0;`,
      about: "A comparison is a true or false value, so it can be assigned straight to a BOOL. Each line replaces a compare instruction from the ladder lane, LES and LIM. Comparisons are worked out before AND, so the second line needs no parentheses, though adding them never hurts.",
      terms: [
        ["<", "< > <= >=", "Comparisons. Each one is true or false."],
        ["AND", "AND", "Both comparisons must be true: inside the band."],
      ],
      sim: {"types":{"Hoop1_Air_PSI":"REAL"},"start":{"Hoop1_Air_PSI":92},"scene":"air1","watch":["Air_Low_Now","Hoop1_Air_OK"],"steps":[{"label":"Drops to 78 psi","set":{"Hoop1_Air_PSI":78}},{"label":"Back to 92 psi","set":{"Hoop1_Air_PSI":92}},{"label":"Rises to 112 psi","set":{"Hoop1_Air_PSI":112}}]},
      out: `Drops to 78 psi   →  Air_Low_Now=1  →  Hoop1_Air_OK=0
Back to 92 psi    →  Air_Low_Now=0  →  Hoop1_Air_OK=1
Rises to 112 psi  →  Hoop1_Air_OK=0`,
    },
    {
      t: "IF … THEN",
      goal: "Set Jam_Fault to 1 when Jam_Sensor is on, and to 0 when Reset_PB is pressed.",
      code: `IF Jam_Sensor THEN
    Jam_Fault := 1;
END_IF;
IF Reset_PB THEN
    Jam_Fault := 0;
END_IF;`,
      about: "An IF that only ever sets a bit to 1 behaves like a latch: when the condition goes false, nothing writes the bit back. That is the ST version of OTL and OTU, and the output matches the ladder lesson. Writing Jam_Fault := Jam_Sensor instead would follow the sensor rather than hold.",
      terms: [
        ["IF", "IF … THEN … END_IF;", "Runs the statements inside only while the condition is true."],
        ["END_IF", "END_IF;", "Closes the IF. It needs its own semicolon."],
      ],
      sim: {"watch":["Jam_Fault"],"steps":[{"label":"Jam_Sensor trips, then clears","pulse":{"Jam_Sensor":1}},{"label":"Press Reset_PB","pulse":{"Reset_PB":1}}],"types":{"Jam_Fault":"BOOL"},"sameAs":"ladder/Latch and unlatch"},
      out: `Jam_Sensor trips, then clears  →  Jam_Fault=1
Press Reset_PB                 →  Jam_Fault=0`,
    },
    {
      t: "IF … ELSE",
      goal: "While Conv_Run is on, turn Run_Lamp on and Idle_Lamp off; otherwise the reverse.",
      code: `IF Conv_Run THEN
    Run_Lamp := 1;
    Idle_Lamp := 0;
ELSE
    Run_Lamp := 0;
    Idle_Lamp := 1;
END_IF;`,
      about: "ELSE runs when the condition is false, so both lamps are written on every scan, one way or the other. That is the safe habit: a tag written only inside an IF keeps its last value when the condition goes false, which is how lamps get stuck on.",
      terms: [
        ["ELSE", "ELSE", "Runs when the IF condition is false."],
      ],
      sim: {"types":{"Run_Lamp":"BOOL","Idle_Lamp":"BOOL"},"scene":"conveyor3","watch":["Run_Lamp","Idle_Lamp"],"steps":[{"label":"Conv_Run on","set":{"Conv_Run":1}},{"label":"Conv_Run off","set":{"Conv_Run":0}}]},
      out: `Conv_Run on   →  Run_Lamp=1  →  Idle_Lamp=0
Conv_Run off  →  Run_Lamp=0  →  Idle_Lamp=1`,
    },
    {
      t: "ELSIF priority",
      goal: "Set Light to 3 for an active e-stop, else 2 for a jam, else 1 while running, else 0.",
      code: `IF Estop_Active THEN
    Light := 3; // red
ELSIF Jam_Fault THEN
    Light := 2; // amber
ELSIF Conv_Run THEN
    Light := 1; // green
ELSE
    Light := 0; // off
END_IF;`,
      about: "ELSIF checks its condition only when everything above it was false, so the first true line wins. Put the most important condition first: here an e-stop shows red even while a jam is also active. In the other order, a jam would hide the e-stop.",
      terms: [
        ["ELSIF", "ELSIF", "Checked only when every condition above it was false."],
        [null, "Order", "The first true condition wins. Most important first."],
      ],
      sim: {"watch":["Light"],"steps":[{"label":"Conveyor running","set":{"Conv_Run":1}},{"label":"Jam while running","set":{"Jam_Fault":1}},{"label":"E-stop during the jam","set":{"Estop_Active":1}},{"label":"E-stop released","set":{"Estop_Active":0}}]},
      out: `Conveyor running       →  Light=1
Jam while running      →  Light=2
E-stop during the jam  →  Light=3
E-stop released        →  Light=2`,
    },
    {
      t: "CASE on a state",
      goal: "Set Green_Lamp and Red_Lamp from Conv_State: 1 green only, 2 red only, any other value both off.",
      code: `CASE Conv_State OF
    1:
        Green_Lamp := 1;
        Red_Lamp := 0;
    2:
        Green_Lamp := 0;
        Red_Lamp := 1;
ELSE
    Green_Lamp := 0;
    Red_Lamp := 0;
END_CASE;`,
      about: "CASE picks one branch by a whole number, which reads better than a chain of ELSIF tests on the same tag. ELSE covers every value not listed, including states added later, so nothing is left on by accident. Conv_State uses the PLC track's codes: 1 running, 2 faulted, 3 idle.",
      terms: [
        ["CASE", "CASE … OF … END_CASE;", "Runs the branch whose label matches the value."],
        ["ELSE", "ELSE", "Any value without its own label."],
      ],
      sim: {"types":{"Green_Lamp":"BOOL","Red_Lamp":"BOOL"},"watch":["Green_Lamp","Red_Lamp"],"steps":[{"label":"Conv_State = 1","set":{"Conv_State":1}},{"label":"Conv_State = 2","set":{"Conv_State":2}},{"label":"Conv_State = 3","set":{"Conv_State":3}}]},
      out: `Conv_State = 1  →  Green_Lamp=1
Conv_State = 2  →  Green_Lamp=0  →  Red_Lamp=1
Conv_State = 3  →  Red_Lamp=0`,
    },
    {
      t: "CASE lists and ranges",
      goal: "Set Head_Tooling to 1 for 15 or 30 gallon barrels, 2 for 48 to 55 gallons, and 0 otherwise.",
      code: `CASE Barrel_Size_Gal OF
    15, 30:
        Head_Tooling := 1;
    48..55:
        Head_Tooling := 2;
ELSE
    Head_Tooling := 0;
END_CASE;`,
      about: "A CASE label can list values with commas, or give a range with two dots. Ranges include both ends, so 48..55 covers the 53-gallon barrel. The sizes and tooling numbers are illustrative; ELSE sets 0, no tooling, for any size the table does not know.",
      terms: [
        ["15, 30", "15, 30:", "A list: either value matches."],
        ["48..55", "48..55:", "A range, ends included."],
      ],
      sim: {"watch":["Head_Tooling"],"steps":[{"label":"30-gallon barrel","set":{"Barrel_Size_Gal":30}},{"label":"53-gallon barrel","set":{"Barrel_Size_Gal":53}},{"label":"40 gallons: not in the table","set":{"Barrel_Size_Gal":40}}]},
      out: `30-gallon barrel              →  Head_Tooling=1
53-gallon barrel              →  Head_Tooling=2
40 gallons: not in the table  →  Head_Tooling=0`,
    },
    {
      t: "XOR: exactly one",
      goal: "Set Selection_OK when exactly one of Size_30_Sel and Size_53_Sel is on.",
      code: `Selection_OK := Size_30_Sel XOR Size_53_Sel;`,
      about: "XOR is true when exactly one of its two inputs is on. A two-position selector should never report both positions at once; if it does, a contact is welded or a wire is crossed, and Selection_OK going false flags it before the machine acts on a bad selection.",
      terms: [
        ["XOR", "XOR", "Exclusive OR: true when one side is true, but not both."],
      ],
      sim: {"watch":["Selection_OK"],"steps":[{"label":"30 selected","set":{"Size_30_Sel":1}},{"label":"53 also on: both","set":{"Size_53_Sel":1}},{"label":"30 released","set":{"Size_30_Sel":0}}]},
      out: `30 selected       →  Selection_OK=1
53 also on: both  →  Selection_OK=0
30 released       →  Selection_OK=1`,
    },
    {
      t: "Set and reset priority",
      goal: "Set Run_Request with Start_PB and clear it with Stop_Pressed, so that holding both leaves it off.",
      code: `IF Start_PB THEN
    Run_Request := 1;
END_IF;
IF Stop_Pressed THEN
    Run_Request := 0;
END_IF;`,
      about: "When both IFs are true in the same scan, the later one writes last and wins. Putting the stop after the start makes it stop-dominant: holding both buttons leaves the machine stopped, the safe choice for a run request. Swap the two blocks and start would win.",
      terms: [
        [null, "Last write wins", "Later statements overwrite earlier ones in the same scan."],
      ],
      sim: {"types":{"Run_Request":"BOOL"},"watch":["Run_Request"],"steps":[{"label":"Press and release Start_PB","pulse":{"Start_PB":1}},{"label":"Press and release Stop_Pressed","pulse":{"Stop_Pressed":1}},{"label":"Hold both buttons","set":{"Start_PB":1,"Stop_Pressed":1}}]},
      out: `Press and release Start_PB      →  Run_Request=1
Press and release Stop_Pressed  →  Run_Request=0
Hold both buttons               →  no change`,
    },
    {
      t: "Make a one-shot",
      goal: "Add 1 to Reject_Count once per press of Reject_PB, using Reject_PB_Prev to find the rising edge.",
      code: `Reject_Edge := Reject_PB AND NOT Reject_PB_Prev;
Reject_PB_Prev := Reject_PB;
IF Reject_Edge THEN
    Reject_Count := Reject_Count + 1;
END_IF;`,
      about: "Structured Text has no ONS instruction, so you build the edge yourself: remember last scan's value, and the edge is on now and off before. The order matters: work out the edge first, then save the previous value. Without the edge, a held button would add 1 on every scan. The output matches the ladder one-shot lesson.",
      terms: [
        ["Reject_PB_Prev", "Previous value", "Last scan's state of the button, saved at the end of this scan's check."],
        ["Reject_Edge", "Rising edge", "On now AND NOT on before: true for exactly one scan per press."],
      ],
      sim: {"watch":["Reject_Count"],"steps":[{"label":"Press Reject_PB, hold 0.5 s","pulse":{"Reject_PB":1},"pulseMs":500},{"label":"Two more presses","pulse":{"Reject_PB":1},"repeat":2}],"sameAs":"ladder/One-shot for math"},
      out: `Press Reject_PB, hold 0.5 s  →  Reject_Count=1
Two more presses             →  Reject_Count=3`,
    },
    {
      t: "Add values",
      goal: "Set Shift_Total to the sum of Conv3_Barrels, Hoop1_Barrels and Char2_Barrels.",
      code: `Shift_Total := Conv3_Barrels + Hoop1_Barrels + Char2_Barrels;`,
      about: "+ adds whole numbers into a whole number. 352 + 274 + 301 is shift A's 927 barrels, the same total the Python lane arrives at. A DINT holds up to about 2.1 billion, plenty for barrel counts; this simulator stops with an error rather than guess at what happens past that.",
      terms: [
        ["+", "+", "Addition."],
        ["Shift_Total", "DINT result", "Whole numbers in, whole number out."],
      ],
      sim: {"types":{"Conv3_Barrels":"DINT","Hoop1_Barrels":"DINT","Char2_Barrels":"DINT"},"watch":["Shift_Total"],"steps":[{"label":"Shift A counts: 352, 274, 301","set":{"Conv3_Barrels":352,"Hoop1_Barrels":274,"Char2_Barrels":301}}]},
      out: `Shift A counts: 352, 274, 301  →  Shift_Total=927`,
    },
    {
      t: "On-delay timer",
      goal: "Time Jam_Timer (4000 ms) while Conv_Run and Eye_Blocked are both on, and copy its done bit to Jam_Alarm.",
      code: `Jam_Timer.PRE := 4000;
Jam_Timer.TimerEnable := Conv_Run AND Eye_Blocked;
TONR(Jam_Timer);
Jam_Alarm := Jam_Timer.DN;`,
      about: "TONR is the Structured Text on-delay timer. Set its preset and enable, then call it once per scan; .DN turns on once the enable has been true for the preset. Call it on every scan, not inside an IF: a timer that is not called is not updated, so its time freezes.",
      terms: [
        ["TONR", "TONR(timer);", "On-delay timer on an FBD_TIMER tag. Call it every scan."],
        ["TimerEnable", ".TimerEnable", "The timer runs while this is true and resets when it goes false."],
        ["PRE", ".PRE", "Preset in milliseconds."],
        ["DN", ".DN", "Done: on once the accumulated time reaches the preset."],
      ],
      sim: {"types":{"Jam_Alarm":"BOOL"},"start":{"Conv_Run":1},"scene":"conveyor3","watch":["Jam_Timer.DN","Jam_Alarm"],"steps":[{"label":"Eye blocked 3 s","set":{"Eye_Blocked":1},"runMs":3000},{"label":"Blocked 1.1 s more","runMs":1100},{"label":"Eye clears","set":{"Eye_Blocked":0}}]},
      out: `Eye blocked 3 s     →  no change
Blocked 1.1 s more  →  Jam_Timer.DN=1  →  Jam_Alarm=1
Eye clears          →  Jam_Timer.DN=0  →  Jam_Alarm=0`,
    },
    {
      t: "Debounce with a timer",
      goal: "Latch Hoop1_Low_Air when Hoop1_Air_PSI stays below 80 for 2 s (Low_Air_Timer).",
      code: `Low_Air_Timer.PRE := 2000;
Low_Air_Timer.TimerEnable := Hoop1_Air_PSI < 80.0;
TONR(Low_Air_Timer);
IF Low_Air_Timer.DN THEN
    Hoop1_Low_Air := 1;
END_IF;`,
      about: "The comparison feeds the timer directly, so pressure has to stay low for the whole 2 seconds before anything latches. A cylinder firing dips the header for a moment and is ignored. This is the ladder lane's compare-and-debounce lesson, and the output matches it exactly.",
      terms: [
        ["<", "Comparison as an enable", "A true/false comparison can drive TimerEnable directly."],
        [null, "Debounce", "Requires the condition to hold for a time before acting."],
      ],
      sim: {"types":{"Hoop1_Air_PSI":"REAL","Hoop1_Low_Air":"BOOL"},"start":{"Hoop1_Air_PSI":92},"watch":["Low_Air_Timer.DN","Hoop1_Low_Air"],"steps":[{"label":"Cylinder fires: 76 psi for 0.5 s","pulse":{"Hoop1_Air_PSI":76},"pulseMs":500,"runMs":1000},{"label":"Header drops to 74 psi for 2.1 s","set":{"Hoop1_Air_PSI":74},"runMs":2100}],"scene":"air1","sameAs":"ladder/Compare a value"},
      out: `Cylinder fires: 76 psi for 0.5 s  →  no change
Header drops to 74 psi for 2.1 s  →  Low_Air_Timer.DN=1  →  Hoop1_Low_Air=1`,
    },
    {
      t: "Off-delay timer",
      goal: "Run Char2_Exhaust_Fan while Char2_Burner_On is on and for 30 s after it goes off, using TOFR on Exhaust_Timer.",
      code: `Exhaust_Timer.PRE := 30000;
Exhaust_Timer.TimerEnable := Char2_Burner_On;
TOFR(Exhaust_Timer);
Char2_Exhaust_Fan := Exhaust_Timer.DN;`,
      about: "TOFR is the off-delay: its done bit turns on as soon as the enable is true and stays on until the enable has been false for the preset. The fan starts with the burner and runs on for 30 seconds to clear heat and smoke. The output matches the ladder TOF lesson.",
      terms: [
        ["TOFR", "TOFR(timer);", "Off-delay timer: .DN stays on for the preset after the enable goes false."],
      ],
      sim: {"watch":["Exhaust_Timer.DN","Char2_Exhaust_Fan"],"steps":[{"label":"Burner on","set":{"Char2_Burner_On":1}},{"label":"Burner off, first 29 s","set":{"Char2_Burner_On":0},"runMs":29000},{"label":"1 s more","runMs":1100}],"scene":"char2","sameAs":"ladder/Off-delay timer"},
      out: `Burner on               →  Exhaust_Timer.DN=1  →  Char2_Exhaust_Fan=1
Burner off, first 29 s  →  no change
1 s more                →  Exhaust_Timer.DN=0  →  Char2_Exhaust_Fan=0`,
    },
    {
      t: "Retentive hour meter",
      goal: "Count Run_Hours with RTOR on Hour_Timer (1 hour preset) while Conv_Run is on, resetting the timer after each hour. Set PM_Due at 500 hours.",
      code: `Hour_Timer.PRE := 3600000;
Hour_Timer.TimerEnable := Conv_Run;
Hour_Timer.Reset := Hour_Timer.DN;
RTOR(Hour_Timer);
IF Hour_Timer.DN THEN
    Run_Hours := Run_Hours + 1;
END_IF;
PM_Due := Run_Hours >= 500;`,
      about: "RTOR keeps its time when the enable goes false, so stops and restarts add up. Feeding the done bit back into Reset restarts the hour on the scan after the IF has counted it. Scheduling maintenance by run hours rather than calendar days is a core TPM habit; 500 hours is illustrative.",
      terms: [
        ["RTOR", "RTOR(timer);", "Retentive on-delay: keeps its time when the enable goes false."],
        ["Reset", ".Reset", "Clears the timer while true."],
      ],
      sim: {"scanMs":100,"start":{"Run_Hours":498},"watch":["Run_Hours","PM_Due"],"steps":[{"label":"Runs 40 min","set":{"Conv_Run":1},"runMs":2400000},{"label":"Stopped 15 min","set":{"Conv_Run":0},"runMs":900000},{"label":"Runs 21 min more","set":{"Conv_Run":1},"runMs":1260000},{"label":"Runs another 61 min","runMs":3660000}]},
      out: `Runs 40 min          →  no change
Stopped 15 min       →  no change
Runs 21 min more     →  Run_Hours=499
Runs another 61 min  →  Run_Hours=500  →  PM_Due=1`,
    },
    {
      t: "Pulse every 5 seconds",
      goal: "Make Sample_Timer restart itself every 5 s, and add 1 to Samples each time it is done.",
      code: `Sample_Timer.PRE := 5000;
Sample_Timer.TimerEnable := NOT Sample_Timer.DN;
TONR(Sample_Timer);
IF Sample_Timer.DN THEN
    Samples := Samples + 1;
END_IF;`,
      about: "A timer whose enable is NOT its own done bit restarts itself: the scan that sees DN counts, and the next scan turns the enable off, which resets it. Each cycle is the preset plus one scan, a small drift that adds up over a long shift. Long-running clocks often read the controller's time of day instead.",
      terms: [
        ["NOT Sample_Timer.DN", "Self-resetting timer", "The done bit switches the timer's own enable off, which restarts it."],
      ],
      sim: {"watch":["Samples"],"steps":[{"label":"Run 30 s","runMs":30000}]},
      out: `Run 30 s  →  Samples=5`,
    },
    {
      t: "No part for 5 seconds",
      goal: "Latch No_Feed_Fault when Conveyor_Run is on and Part_Seen stays off for 5 s (No_Feed_Timer).",
      code: `No_Feed_Timer.PRE := 5000;
No_Feed_Timer.TimerEnable := Conveyor_Run AND NOT Part_Seen;
TONR(No_Feed_Timer);
IF No_Feed_Timer.DN THEN
    No_Feed_Fault := 1;
END_IF;`,
      about: "Every part that passes resets the timer, because the enable goes false for a moment. Only a 5-second gap with the conveyor running lets the timer finish. This is the ladder lane's on-delay lesson, and the output matches it exactly.",
      terms: [
        ["NOT Part_Seen", "Reset by each part", "Any part makes the enable false, which restarts the timer."],
      ],
      sim: {"start":{"Conveyor_Run":1},"watch":["No_Feed_Timer.DN","No_Feed_Fault"],"steps":[{"label":"A part every 3 s","pulse":{"Part_Seen":1},"runMs":3000,"repeat":3},{"label":"Last part, then none for 5 s","pulse":{"Part_Seen":1},"runMs":5400}],"types":{"No_Feed_Fault":"BOOL"},"sameAs":"ladder/On-delay timer"},
      out: `A part every 3 s              →  no change
Last part, then none for 5 s  →  No_Feed_Timer.DN=1  →  No_Feed_Fault=1`,
    },
    {
      t: "Purge in Structured Text",
      goal: "Char Station 2: with Char2_Start on, run the fan, light Char2_Burner_On after a 5 s purge (Purge_Timer, TONR), and keep the fan running 30 s after the burner goes out (Post_Purge, TOFR).",
      code: `Purge_Timer.PRE := 5000;
Purge_Timer.TimerEnable := Char2_Start;
TONR(Purge_Timer);
Char2_Burner_On := Purge_Timer.DN;
Post_Purge.PRE := 30000;
Post_Purge.TimerEnable := Char2_Burner_On;
TOFR(Post_Purge);
Char2_Exhaust_Fan := Char2_Start OR Post_Purge.DN;`,
      about: "The ladder challenge lesson rewritten line for line: each rung becomes one or two statements, and the fan's OR branch becomes OR. The output matches the ladder version exactly. As there, the times are illustrative, and real burner safety belongs to a certified burner management system, not to code like this.",
      terms: [
        ["TONR", "Pre-purge", "5 s of fan before the burner may light."],
        ["TOFR", "Post-purge", "Keeps the fan running 30 s after the burner goes out."],
      ],
      sim: {"scene":"char2","watch":["Char2_Exhaust_Fan","Char2_Burner_On"],"steps":[{"label":"Char2_Start on, first 4 s","set":{"Char2_Start":1},"runMs":4000},{"label":"1 s more","runMs":1100},{"label":"Char2_Start off, first 29 s","set":{"Char2_Start":0},"runMs":29000},{"label":"1 s more","runMs":1100}],"sameAs":"ladder/Purge before and after the flame"},
      out: `Char2_Start on, first 4 s    →  Char2_Exhaust_Fan=1
1 s more                     →  Char2_Burner_On=1
Char2_Start off, first 29 s  →  Char2_Burner_On=0
1 s more                     →  Char2_Exhaust_Fan=0`,
    },
    {
      t: "Low-air protection in Structured Text",
      goal: "Latch Hoop1_Low_Air after 2 s below 80 psi, let Reset_PB clear it only at 85 psi or more, and run Hoop1_Run only in Hoop1_Auto with no fault.",
      code: `Low_Air_Timer.PRE := 2000;
Low_Air_Timer.TimerEnable := Hoop1_Air_PSI < 80.0;
TONR(Low_Air_Timer);
IF Low_Air_Timer.DN THEN
    Hoop1_Low_Air := 1;
END_IF;
IF Reset_PB AND Hoop1_Air_PSI >= 85.0 THEN
    Hoop1_Low_Air := 0;
END_IF;
Hoop1_Run := Hoop1_Auto AND NOT Hoop1_Low_Air;`,
      about: "The ladder challenge lesson as Structured Text. The reset interlock reads naturally as one condition: the button AND pressure back in the normal band. The output matches the ladder version exactly, and in the simulator you can trip the compressor and try resetting too early.",
      terms: [
        [">=", "Reset interlock", "The reset only works once pressure is back to 85 psi or more."],
        ["Hoop1_Run", "Run permissive", "Auto, and no latched low-air fault."],
      ],
      sim: {"types":{"Hoop1_Air_PSI":"REAL","Hoop1_Low_Air":"BOOL"},"start":{"Hoop1_Air_PSI":92,"Hoop1_Auto":1},"scene":"air1","watch":["Low_Air_Timer.DN","Hoop1_Low_Air","Hoop1_Run"],"steps":[{"label":"Cylinder fires: 78 psi for 0.4 s","pulse":{"Hoop1_Air_PSI":78},"pulseMs":400},{"label":"Compressor trips: 70 psi for 2.5 s","set":{"Hoop1_Air_PSI":70},"runMs":2500},{"label":"Reset_PB at 70 psi","pulse":{"Reset_PB":1}},{"label":"Air back to 92 psi, then Reset_PB","set":{"Hoop1_Air_PSI":92},"pulse":{"Reset_PB":1}}],"sameAs":"ladder/Stop on low air"},
      out: `Cylinder fires: 78 psi for 0.4 s    →  no change
Compressor trips: 70 psi for 2.5 s  →  Low_Air_Timer.DN=1  →  Hoop1_Low_Air=1  →  Hoop1_Run=0
Reset_PB at 70 psi                  →  no change
Air back to 92 psi, then Reset_PB   →  Low_Air_Timer.DN=0  →  Hoop1_Low_Air=0  →  Hoop1_Run=1`,
    },
    {
      t: "Scale an analog input",
      goal: "Convert Air_Raw (4000 to 20000 counts) into Hoop1_Air_PSI (0 to 150 psi).",
      code: `Hoop1_Air_PSI := (Air_Raw - 4000) * 150.0 / 16000.0;`,
      about: "A 4 to 20 mA transmitter arrives as a raw number, and scaling turns it into engineering units: subtract the zero, then multiply by span over range. The 4000 to 20000 counts and 0 to 150 psi are illustrative; real analog modules have their own raw ranges, and Logix modules can do this scaling in their configuration instead.",
      terms: [
        ["(", "( … )", "Subtract the zero offset first."],
        ["150.0", "Span", "The decimal points keep the math in REAL."],
      ],
      sim: {"types":{"Air_Raw":"DINT"},"start":{"Air_Raw":4000},"watch":["Hoop1_Air_PSI"],"steps":[{"label":"Raw 12000 (12 mA)","set":{"Air_Raw":12000}},{"label":"Raw 20000 (20 mA)","set":{"Air_Raw":20000}},{"label":"Raw 4000 (4 mA)","set":{"Air_Raw":4000}}]},
      out: `Raw 12000 (12 mA)  →  Hoop1_Air_PSI=75
Raw 20000 (20 mA)  →  Hoop1_Air_PSI=150
Raw 4000 (4 mA)    →  Hoop1_Air_PSI=0`,
    },
    {
      t: "Rate and percent of ideal",
      goal: "While Run_Minutes is above 0, compute Barrels_Per_Hr from Barrel_Count, then Pct_Of_Ideal against Conveyor 3's 60 per hour.",
      code: `IF Run_Minutes > 0 THEN
    Barrels_Per_Hr := Barrel_Count * 60.0 / Run_Minutes;
END_IF;
Pct_Of_Ideal := Barrels_Per_Hr / 60.0 * 100.0;`,
      about: "The IF guards against dividing by zero at the start of a shift. 352 barrels in 450 minutes is 46.9 per hour, 78.2% of Conveyor 3's ideal 60, the same performance figure as the OEE and Shift Handoff tracks. The output matches the ladder CPT lesson exactly.",
      terms: [
        ["IF", "Divide-by-zero guard", "Compute only when the divisor is above zero."],
        ["60.0", "REAL constant", "Keeps the decimals."],
      ],
      sim: {"watch":["Barrels_Per_Hr","Pct_Of_Ideal"],"steps":[{"label":"Shift starts: 0 min, 0 barrels","set":{"Run_Minutes":0,"Barrel_Count":0}},{"label":"After 450 min with 352 barrels","set":{"Run_Minutes":450,"Barrel_Count":352}}],"sameAs":"ladder/Compute a rate"},
      out: `Shift starts: 0 min, 0 barrels  →  no change
After 450 min with 352 barrels  →  Barrels_Per_Hr=46.93333  →  Pct_Of_Ideal=78.22222`,
    },
    {
      t: "OEE in the PLC",
      goal: "Compute OEE as Availability × Performance × Quality, and OEE_Pct as OEE × 100.",
      code: `OEE := Availability * Performance * Quality;
OEE_Pct := OEE * 100.0;`,
      about: "OEE is the product of its three factors. With Hoop Driver 1's weekly factors from the OEE Loss Report track, rounded to 0.988, 0.749 and 0.985, the PLC gets the same 72.9% as every other language lane. A REAL has about 7 significant digits, which is plenty for a percentage.",
      terms: [
        ["*", "*", "Multiplication."],
        ["OEE", "OEE", "Availability × performance × quality."],
      ],
      sim: {"types":{"Availability":"REAL","Performance":"REAL","Quality":"REAL"},"watch":["OEE","OEE_Pct"],"steps":[{"label":"Hoop Driver 1's week: 0.988, 0.749, 0.985","set":{"Availability":0.988,"Performance":0.749,"Quality":0.985}}]},
      out: `Hoop Driver 1's week: 0.988, 0.749, 0.985  →  OEE=0.7289118  →  OEE_Pct=72.89118`,
    },
    {
      t: "Every 50th barrel",
      goal: "Set Sample_Due on every 50th barrel: when Barrel_Count MOD 50 is 0 and the count is above 0.",
      code: `IF Barrel_Count MOD 50 = 0 AND Barrel_Count > 0 THEN
    Sample_Due := 1;
ELSE
    Sample_Due := 0;
END_IF;`,
      about: "MOD gives the remainder after division, so Barrel_Count MOD 50 is 0 on every 50th barrel. Pulling one barrel in fifty for a quality check is a common sampling plan; the 50 is illustrative. The second test stops a count of 0 from looking like a sample point.",
      terms: [
        ["MOD", "MOD", "The remainder after whole-number division."],
        ["=", "=", "Equal. Single equals compares; := assigns."],
      ],
      sim: {"types":{"Sample_Due":"BOOL"},"watch":["Sample_Due"],"steps":[{"label":"Barrel 49","set":{"Barrel_Count":49}},{"label":"Barrel 50","set":{"Barrel_Count":50}},{"label":"Barrel 51","set":{"Barrel_Count":51}},{"label":"Barrel 100","set":{"Barrel_Count":100}}]},
      out: `Barrel 49   →  no change
Barrel 50   →  Sample_Due=1
Barrel 51   →  Sample_Due=0
Barrel 100  →  Sample_Due=1`,
    },
    {
      t: "Clamp a setpoint",
      goal: "Copy Operator_SP into Speed_SP, limited to between 20 and 60 barrels per hour.",
      code: `Speed_SP := Operator_SP;
IF Speed_SP > 60.0 THEN
    Speed_SP := 60.0;
ELSIF Speed_SP < 20.0 THEN
    Speed_SP := 20.0;
END_IF;`,
      about: "Never trust a number typed at an HMI. Copying it and then clamping keeps the drive within the range the machine was rated for: here 20 to 60 barrels per hour, with Conveyor 3's ideal rate as the ceiling. Speed_SP is written twice in one scan, but only the final value is ever used.",
      terms: [
        [">", "Upper limit", "Anything above 60 becomes 60."],
        ["<", "Lower limit", "Anything below 20 becomes 20."],
      ],
      sim: {"types":{"Operator_SP":"REAL"},"watch":["Speed_SP"],"steps":[{"label":"Operator enters 45","set":{"Operator_SP":45}},{"label":"Operator enters 75","set":{"Operator_SP":75}},{"label":"Operator enters 5","set":{"Operator_SP":5}}]},
      out: `Operator enters 45  →  Speed_SP=45
Operator enters 75  →  Speed_SP=60
Operator enters 5   →  Speed_SP=20`,
    },
    {
      t: "Hysteresis",
      goal: "Set Hoop1_Low_Air below 80 psi and clear it above 85 psi; between them, leave it as it is.",
      code: `IF Hoop1_Air_PSI < 80.0 THEN
    Hoop1_Low_Air := 1;
ELSIF Hoop1_Air_PSI > 85.0 THEN
    Hoop1_Low_Air := 0;
END_IF;`,
      about: "With one threshold, a reading hovering around 80 flips the alarm on and off every few scans and floods the alarm log. Two thresholds, on below 80 and off above 85, leave a band where nothing changes. Between them the IF writes nothing, so the tag keeps its last value.",
      terms: [
        ["ELSIF", "Two thresholds", "On below 80, off above 85."],
        [null, "Deadband", "Between the thresholds nothing is written, so the state holds."],
      ],
      sim: {"types":{"Hoop1_Air_PSI":"REAL","Hoop1_Low_Air":"BOOL"},"start":{"Hoop1_Air_PSI":92},"scene":"air1","watch":["Hoop1_Low_Air"],"steps":[{"label":"Drops to 79 psi","set":{"Hoop1_Air_PSI":79}},{"label":"Recovers to 82 psi","set":{"Hoop1_Air_PSI":82}},{"label":"Recovers to 86 psi","set":{"Hoop1_Air_PSI":86}},{"label":"Sags to 82 psi","set":{"Hoop1_Air_PSI":82}}]},
      out: `Drops to 79 psi     →  Hoop1_Low_Air=1
Recovers to 82 psi  →  no change
Recovers to 86 psi  →  Hoop1_Low_Air=0
Sags to 82 psi      →  no change`,
    },
    {
      t: "State machine with CASE",
      goal: "Run Conveyor 3 from Conv_State: idle (3) goes to running (1) on Start_PB with no jam; running goes to idle on Stop_Pressed or faulted (2) on Jam_Fault; faulted goes to idle when the jam clears. Any other value goes to idle. Conv_Run is on only while running.",
      code: `CASE Conv_State OF
    3: (* idle *)
        IF Start_PB AND NOT Jam_Fault THEN
            Conv_State := 1;
        END_IF;
    1: (* running *)
        IF Stop_Pressed THEN
            Conv_State := 3;
        ELSIF Jam_Fault THEN
            Conv_State := 2;
        END_IF;
    2: (* faulted *)
        IF NOT Jam_Fault THEN
            Conv_State := 3;
        END_IF;
ELSE
    Conv_State := 3;
END_CASE;
Conv_Run := Conv_State = 1;`,
      about: "A state machine keeps one number for what the machine is doing and only lets it move along defined paths. Each branch handles one state and decides the next. ELSE catches any unexpected value, such as 0 at power-up, and sends it to a safe state. Outputs come from the state, which makes the logic easy to follow.",
      terms: [
        ["Conv_State", "State number", "One tag says what the machine is doing: 1 running, 2 faulted, 3 idle."],
        ["ELSE", "Safe default", "An unexpected value, such as 0 at power-up, goes to idle."],
        ["Conv_Run", "Output from state", "The motor runs only in the running state."],
      ],
      sim: {"watch":["Conv_State","Conv_Run"],"steps":[{"label":"Press and release Start_PB","pulse":{"Start_PB":1}},{"label":"Jam_Fault on","set":{"Jam_Fault":1}},{"label":"Jam_Fault cleared","set":{"Jam_Fault":0}},{"label":"Press and release Start_PB","pulse":{"Start_PB":1}},{"label":"Press and release Stop_Pressed","pulse":{"Stop_Pressed":1}}]},
      out: `Press and release Start_PB      →  Conv_State=1  →  Conv_Run=1
Jam_Fault on                    →  Conv_State=2  →  Conv_Run=0
Jam_Fault cleared               →  Conv_State=3
Press and release Start_PB      →  Conv_State=1  →  Conv_Run=1
Press and release Stop_Pressed  →  Conv_State=3  →  Conv_Run=0`,
    },
    {
      t: "Warning horn before start",
      goal: "From idle (3), Start_PB goes to a warning state (4) that sounds Start_Horn for 3 s (Horn_Timer) before running (1). Stop_Pressed returns to idle. Any other value goes to idle.",
      code: `CASE Conv_State OF
    3:
        IF Start_PB THEN
            Conv_State := 4;
        END_IF;
    4:
        IF Horn_Timer.DN THEN
            Conv_State := 1;
        END_IF;
    1:
        IF Stop_Pressed THEN
            Conv_State := 3;
        END_IF;
ELSE
    Conv_State := 3;
END_CASE;
Horn_Timer.PRE := 3000;
Horn_Timer.TimerEnable := Conv_State = 4;
TONR(Horn_Timer);
Start_Horn := Conv_State = 4;
Conv_Run := Conv_State = 1;`,
      about: "Many conveyors sound a horn for a few seconds before they move, so nobody is caught reaching in. A timed state does this cleanly: the timer runs only while the state is 4, and its done bit moves the machine on. 3 seconds is illustrative; site rules set the real time.",
      terms: [
        ["4", "Warning state", "A state that exists only to wait and warn."],
        ["Horn_Timer", "Timer per state", "Enabled only in state 4, so it restarts every time the state is entered."],
      ],
      sim: {"scene":"conveyor3","watch":["Conv_State","Start_Horn","Conv_Run"],"steps":[{"label":"Press and release Start_PB","pulse":{"Start_PB":1}},{"label":"3 s later","runMs":3100},{"label":"Press and release Stop_Pressed","pulse":{"Stop_Pressed":1}}]},
      out: `Press and release Start_PB      →  Conv_State=4  →  Start_Horn=1
3 s later                       →  Conv_State=1  →  Start_Horn=0  →  Conv_Run=1
Press and release Stop_Pressed  →  Conv_State=3  →  Conv_Run=0`,
    },
    {
      t: "Burner sequence as states",
      goal: "Char Station 2 as states: off (0) to purge (1) on Char2_Start; purge to burning (2) when Purge_Timer (5 s) is done, or back to off if Start drops; burning to post-purge (3) when Start drops; post-purge to off when Post_Timer (30 s) is done. Fan on in states 1 to 3, burner only in 2.",
      code: `CASE Char2_State OF
    0:
        IF Char2_Start THEN
            Char2_State := 1;
        END_IF;
    1:
        IF NOT Char2_Start THEN
            Char2_State := 0;
        ELSIF Purge_Timer.DN THEN
            Char2_State := 2;
        END_IF;
    2:
        IF NOT Char2_Start THEN
            Char2_State := 3;
        END_IF;
    3:
        IF Post_Timer.DN THEN
            Char2_State := 0;
        END_IF;
END_CASE;
Purge_Timer.PRE := 5000;
Purge_Timer.TimerEnable := Char2_State = 1;
TONR(Purge_Timer);
Post_Timer.PRE := 30000;
Post_Timer.TimerEnable := Char2_State = 3;
TONR(Post_Timer);
Char2_Burner_On := Char2_State = 2;
Char2_Exhaust_Fan := Char2_State >= 1 AND Char2_State <= 3;`,
      about: "The purge sequence again, this time as a state machine: each phase is a state and each timer runs only in its own state. It is longer than the direct version, but every allowed move is written down, which is easier to extend and to troubleshoot. The output matches the ladder lesson exactly. Real burner safety belongs to a certified burner management system.",
      terms: [
        ["Char2_State", "One state per phase", "0 off, 1 purge, 2 burning, 3 post-purge."],
        [null, "Same behavior", "A different structure, the same trace as the ladder and direct ST versions."],
      ],
      sim: {"scene":"char2","watch":["Char2_Exhaust_Fan","Char2_Burner_On"],"steps":[{"label":"Char2_Start on, first 4 s","set":{"Char2_Start":1},"runMs":4000},{"label":"1 s more","runMs":1100},{"label":"Char2_Start off, first 29 s","set":{"Char2_Start":0},"runMs":29000},{"label":"1 s more","runMs":1100}],"sameAs":"ladder/Purge before and after the flame"},
      out: `Char2_Start on, first 4 s    →  Char2_Exhaust_Fan=1
1 s more                     →  Char2_Burner_On=1
Char2_Start off, first 29 s  →  Char2_Burner_On=0
1 s more                     →  Char2_Exhaust_Fan=0`,
    },
    {
      t: "Jam lockout as states",
      goal: "Conveyor 3 as states: idle (3) to running (1) on Start_PB; running to faulted (2) when Jam_Timer (4 s of Eye_Blocked while running) is done, or to idle on Stop_Pressed; faulted to idle only on Reset_PB with the eye clear. Any other value goes to idle. Conv_Run and Jam_Fault come from the state.",
      code: `Jam_Timer.PRE := 4000;
Jam_Timer.TimerEnable := Conv_State = 1 AND Eye_Blocked;
TONR(Jam_Timer);
CASE Conv_State OF
    1:
        IF Jam_Timer.DN THEN
            Conv_State := 2;
        ELSIF Stop_Pressed THEN
            Conv_State := 3;
        END_IF;
    2:
        IF Reset_PB AND NOT Eye_Blocked THEN
            Conv_State := 3;
        END_IF;
    3:
        IF Start_PB THEN
            Conv_State := 1;
        END_IF;
ELSE
    Conv_State := 3;
END_CASE;
Conv_Run := Conv_State = 1;
Jam_Fault := Conv_State = 2;`,
      about: "The PLC track's whole jam cell, rebuilt as a state machine. The fault is no longer a separate latch: being in state 2 is the fault, and only a reset with a clear eye leaves it. Run it in the simulator, jam a barrel, and watch the state readout move through 1, 2 and 3.",
      terms: [
        ["Jam_Fault", "Fault from state", "No latch needed: the fault is simply being in state 2."],
        ["NOT Eye_Blocked", "Reset interlock", "Reset is refused while the barrel still blocks the eye."],
      ],
      sim: {"scene":"conveyor3","watch":["Conv_State","Conv_Run","Jam_Fault"],"steps":[{"label":"Press and release Start_PB","pulse":{"Start_PB":1}},{"label":"Eye blocked 4 s","set":{"Eye_Blocked":1},"runMs":4100},{"label":"Reset_PB while eye still blocked","pulse":{"Reset_PB":1}},{"label":"Eye cleared, then Reset_PB","set":{"Eye_Blocked":0},"pulse":{"Reset_PB":1}}]},
      out: `Press and release Start_PB        →  Conv_State=1  →  Conv_Run=1
Eye blocked 4 s                   →  Conv_State=2  →  Conv_Run=0  →  Jam_Fault=1
Reset_PB while eye still blocked  →  no change
Eye cleared, then Reset_PB        →  Conv_State=3  →  Jam_Fault=0`,
    },
    {
      t: "First-out fault",
      goal: "While First_Fault is 0, record the first active fault: 1 e-stop, 2 low air, 3 jam. Clear it to 0 on Reset_PB only when no fault is active.",
      code: `IF First_Fault = 0 THEN
    IF Estop_Active THEN
        First_Fault := 1;
    ELSIF Low_Air THEN
        First_Fault := 2;
    ELSIF Jam_Fault THEN
        First_Fault := 3;
    END_IF;
END_IF;
IF Reset_PB AND NOT Estop_Active AND NOT Low_Air AND NOT Jam_Fault THEN
    First_Fault := 0;
END_IF;`,
      about: "When one problem causes others, the fault list shows all of them, but only the first is the cause. Capturing the first fault code, and refusing to overwrite it until everything is clear and reset, tells maintenance where to start. Low air stopping a machine that then jams is exactly this case.",
      terms: [
        ["First_Fault = 0", "Record once", "Only an empty first-out is filled, so later faults cannot overwrite the cause."],
        ["Reset_PB", "Clear when healthy", "The record clears only when every fault is gone."],
      ],
      sim: {"watch":["First_Fault"],"steps":[{"label":"Low air","set":{"Low_Air":1}},{"label":"Then a jam","set":{"Jam_Fault":1}},{"label":"Reset_PB with faults still active","pulse":{"Reset_PB":1}},{"label":"Faults cleared, then Reset_PB","set":{"Low_Air":0,"Jam_Fault":0},"pulse":{"Reset_PB":1}}]},
      out: `Low air                            →  First_Fault=2
Then a jam                         →  no change
Reset_PB with faults still active  →  no change
Faults cleared, then Reset_PB      →  First_Fault=0`,
    },
    {
      t: "Alarm with acknowledge",
      goal: "When Low_Air comes on, set Alarm_Unacked until Ack_PB is pressed. Keep Alarm_Active equal to Low_Air. Sound Horn while unacknowledged; light Alarm_Lamp while active or unacknowledged.",
      code: `IF Low_Air AND NOT Alarm_Active THEN
    Alarm_Unacked := 1;
END_IF;
Alarm_Active := Low_Air;
IF Ack_PB THEN
    Alarm_Unacked := 0;
END_IF;
Horn := Alarm_Unacked;
Alarm_Lamp := Alarm_Active OR Alarm_Unacked;`,
      about: "An alarm has two separate facts: is the condition still there, and has someone seen it. The horn follows \"not acknowledged\"; the lamp stays on while either is true. So an alarm that comes and goes before anyone looks still waits to be acknowledged, as alarm systems following ISA-18.2 do.",
      terms: [
        ["NOT Alarm_Active", "New alarm", "Low air now but not last scan: a new alarm, which needs acknowledging."],
        ["Ack_PB", "Acknowledge", "Silences the horn. The lamp stays on while the condition is still there."],
      ],
      sim: {"types":{"Alarm_Unacked":"BOOL","Horn":"BOOL"},"watch":["Alarm_Unacked","Horn","Alarm_Lamp"],"steps":[{"label":"Low air","set":{"Low_Air":1}},{"label":"Operator acknowledges","pulse":{"Ack_PB":1}},{"label":"Low air clears","set":{"Low_Air":0}},{"label":"Low air comes and goes, nobody looks","pulse":{"Low_Air":1}},{"label":"Operator acknowledges","pulse":{"Ack_PB":1}}]},
      out: `Low air                               →  Alarm_Unacked=1  →  Horn=1  →  Alarm_Lamp=1
Operator acknowledges                 →  Alarm_Unacked=0  →  Horn=0
Low air clears                        →  Alarm_Lamp=0
Low air comes and goes, nobody looks  →  Alarm_Unacked=1  →  Horn=1  →  Alarm_Lamp=1
Operator acknowledges                 →  Alarm_Unacked=0  →  Horn=0  →  Alarm_Lamp=0`,
    },
    {
      t: "Hand, off, auto",
      goal: "With Mode 1 (hand), run Motor while Jog_PB is held; with Mode 2 (auto), run it on Auto_Request with no Fault; any other Mode keeps it off.",
      code: `CASE Mode OF
    1: (* hand *)
        Motor := Jog_PB;
    2: (* auto *)
        Motor := Auto_Request AND NOT Fault;
ELSE (* off *)
    Motor := 0;
END_CASE;`,
      about: "A hand/off/auto switch has three positions, so a CASE on one number fits it. In hand the motor runs only while the jog button is held; in auto it follows the program. Anything else, including a broken selector reporting an unexpected value, is off. Making off the ELSE makes the safe state the default.",
      terms: [
        ["Mode", "Selector position", "1 hand, 2 auto, anything else off."],
        ["ELSE", "Off by default", "Unexpected values stop the motor."],
      ],
      sim: {"types":{"Motor":"BOOL","Jog_PB":"BOOL"},"watch":["Motor"],"steps":[{"label":"Off: Jog_PB held","set":{"Jog_PB":1}},{"label":"Hand, Jog_PB still held","set":{"Mode":1}},{"label":"Jog_PB released","set":{"Jog_PB":0}},{"label":"Auto with a request","set":{"Mode":2,"Auto_Request":1}},{"label":"Fault","set":{"Fault":1}}]},
      out: `Off: Jog_PB held         →  no change
Hand, Jog_PB still held  →  Motor=1
Jog_PB released          →  Motor=0
Auto with a request      →  Motor=1
Fault                    →  Motor=0`,
    },
    {
      t: "Arrays",
      goal: "Fill Ideal_Rate with 60, 55 and 50 barrels per hour for machines 0, 1 and 2, then set Ideal to the rate of machine Machine_No.",
      code: `Ideal_Rate[0] := 60;
Ideal_Rate[1] := 55;
Ideal_Rate[2] := 50;
Ideal := Ideal_Rate[Machine_No];`,
      about: "An array is one tag holding several values of the same type, numbered from 0. Here the numbers are the canonical ideal rates: 0 is Conveyor 3, 1 is Hoop Driver 1, 2 is Char Station 2. In Studio 5000 the array is declared with its size, DINT[3]. An index outside 0 to 2 is not ignored: the controller stops with a major fault, which is why later lessons check the index first.",
      terms: [
        ["Ideal_Rate", "DINT[3]", "One tag with three whole-number elements, Ideal_Rate[0] to Ideal_Rate[2]."],
        ["[", "[ index ]", "Picks one element. The index can be a number or a tag."],
        ["Machine_No", "Index tag", "0 Conveyor 3, 1 Hoop Driver 1, 2 Char Station 2."],
      ],
      sim: {"types":{"Ideal_Rate":"DINT[3]","Machine_No":"DINT"},"watch":["Ideal"],"steps":[{"label":"Machine_No = 1","set":{"Machine_No":1}},{"label":"Machine_No = 2","set":{"Machine_No":2}},{"label":"Machine_No = 0","set":{"Machine_No":0}}]},
      out: `Machine_No = 1  →  Ideal=55
Machine_No = 2  →  Ideal=50
Machine_No = 0  →  Ideal=60`,
    },
    {
      t: "Total with a FOR loop",
      goal: "Add up the three shift counts in Barrels into Total.",
      code: `Total := 0;
FOR i := 0 TO 2 DO
    Total := Total + Barrels[i];
END_FOR;`,
      about: "FOR runs its body once for each value of i, from 0 to 2 inclusive, all inside one scan. The counts are shift A's: Conveyor 3 352, Hoop Driver 1 274, Char Station 2 301, which total 927. Total is set to 0 first on every scan; leave that line out and the total grows by 927 every scan.",
      terms: [
        ["FOR", "FOR … TO … DO", "Repeats the body once for each value of the loop variable, ends included."],
        ["END_FOR", "END_FOR;", "Closes the loop."],
        ["Total := 0;", "Start from zero", "Without it the sum keeps growing scan after scan."],
      ],
      sim: {"types":{"Barrels":"DINT[3]"},"watch":["Total"],"steps":[{"label":"Shift A counts arrive","set":{"Barrels[0]":352,"Barrels[1]":274,"Barrels[2]":301}},{"label":"Hoop Driver 1 makes 2 more","set":{"Barrels[1]":276}}]},
      out: `Shift A counts arrive       →  Total=927
Hoop Driver 1 makes 2 more  →  Total=929`,
    },
    {
      t: "Find the slowest machine",
      goal: "Set Slowest to the index of the lowest value in Pct, each machine's share of its shift target.",
      code: `Slowest := 0;
FOR i := 1 TO 2 DO
    IF Pct[i] < Pct[Slowest] THEN
        Slowest := i;
    END_IF;
END_FOR;`,
      about: "Assume the first element is the lowest, then let the loop replace it whenever it finds a lower one. The values are shift A counts over each target (ideal rate × 7.5 paid hours): Conveyor 3 352/450 = 0.782, Hoop Driver 1 274/412.5 = 0.664, Char Station 2 301/375 = 0.803. Hoop Driver 1 is furthest behind, matching BEHIND on the shift handoff.",
      terms: [
        ["Slowest := 0;", "Start with the first", "Machine 0 is the lowest until the loop finds lower."],
        ["Pct[Slowest]", "Lowest so far", "Each element is compared with the lowest found so far."],
      ],
      sim: {"types":{"Pct":"REAL[3]"},"watch":["Slowest"],"steps":[{"label":"Shift A shares arrive","set":{"Pct[0]":0.782,"Pct[1]":0.664,"Pct[2]":0.803}},{"label":"Hoop Driver 1 catches up to 0.85","set":{"Pct[1]":0.85}}]},
      out: `Shift A shares arrive             →  Slowest=1
Hoop Driver 1 catches up to 0.85  →  Slowest=0`,
    },
    {
      t: "Keep a history",
      goal: "Each time Barrel_Done turns on, move History[0] to [3] down one place and put Cycle_Time in History[0].",
      code: `IF Barrel_Done AND NOT Done_Last THEN
    FOR i := 4 TO 1 BY -1 DO
        History[i] := History[i - 1];
    END_FOR;
    History[0] := Cycle_Time;
END_IF;
Done_Last := Barrel_Done;`,
      about: "This keeps the last five cycle times, newest first. The loop counts down with BY -1 on purpose: copy upward instead and History[0] is copied into every element before anything moves. Done_Last makes it happen once per barrel, not once per scan. Cycle times are seconds per barrel; Conveyor 3's ideal of 60 per hour is 60 s.",
      terms: [
        ["BY", "BY -1", "Counts down. The step can be any whole number except 0."],
        ["History[i - 1]", "Shift down", "Each element takes the value from the one before it."],
        ["Done_Last", "Edge", "Last scan's value, so the shift happens once per barrel."],
      ],
      sim: {"types":{"History":"REAL[5]","Cycle_Time":"REAL","Barrel_Done":"BOOL"},"watch":["History[0]","History[1]","History[2]"],"steps":[{"label":"Barrel at 61.2 s","set":{"Cycle_Time":61.2},"pulse":{"Barrel_Done":1}},{"label":"Barrel at 59.8 s","set":{"Cycle_Time":59.8},"pulse":{"Barrel_Done":1}},{"label":"Barrel at 64.0 s","set":{"Cycle_Time":64},"pulse":{"Barrel_Done":1}}]},
      out: `Barrel at 61.2 s  →  History[0]=61.2
Barrel at 59.8 s  →  History[1]=61.2  →  History[0]=59.8
Barrel at 64.0 s  →  History[2]=61.2  →  History[1]=59.8  →  History[0]=64`,
    },
    {
      t: "Moving average",
      goal: "Keep the last five cycle times in History as before, then set Avg_Cycle to their average and Slow_Flag when it is over 63.0 s.",
      code: `IF Barrel_Done AND NOT Done_Last THEN
    FOR i := 4 TO 1 BY -1 DO
        History[i] := History[i - 1];
    END_FOR;
    History[0] := Cycle_Time;
END_IF;
Done_Last := Barrel_Done;
Sum := 0.0;
FOR i := 0 TO 4 DO
    Sum := Sum + History[i];
END_FOR;
Avg_Cycle := Sum / 5.0;
Slow_Flag := Avg_Cycle > 63.0;`,
      about: "One slow barrel should not raise a flag, but a slow trend should. Averaging the last five smooths single barrels out. The threshold, 63.0 s, is 5% over Conveyor 3's ideal 60 s and is illustrative. Watch the cost: the 76.0 s barrel holds the average, and the flag, up until five more barrels have pushed it out.",
      terms: [
        ["Sum := 0.0;", "Fresh sum", "Started at 0.0 every scan, so it is a REAL and does not grow."],
        ["/ 5.0", "Average", "The sum over the five values in the history."],
        ["Slow_Flag", "Trend flag", "On while the five-barrel average is over 63 s."],
      ],
      sim: {"types":{"History":"REAL[5]","Cycle_Time":"REAL","Barrel_Done":"BOOL"},"start":{"History[0]":61.2,"History[1]":59.8,"History[2]":64,"History[3]":60.4,"History[4]":60.6},"watch":["Avg_Cycle","Slow_Flag"],"steps":[{"label":"Slow barrel at 76.0 s","set":{"Cycle_Time":76},"pulse":{"Barrel_Done":1}},{"label":"Four barrels at 60.0 s","set":{"Cycle_Time":60},"pulse":{"Barrel_Done":1},"repeat":4},{"label":"One more at 60.0 s","pulse":{"Barrel_Done":1}}]},
      out: `Slow barrel at 76.0 s   →  Avg_Cycle=64.28  →  Slow_Flag=1
Four barrels at 60.0 s  →  Avg_Cycle=63.2
One more at 60.0 s      →  Avg_Cycle=60  →  Slow_Flag=0`,
    },
    {
      t: "Search with WHILE and EXIT",
      goal: "Set Next_Slot to the first empty slot in the ten-slot Rack_Full, or to -1 when every slot is full.",
      code: `Next_Slot := -1;
i := 0;
WHILE i <= 9 DO
    IF NOT Rack_Full[i] THEN
        Next_Slot := i;
        EXIT;
    END_IF;
    i := i + 1;
END_WHILE;`,
      about: "WHILE repeats as long as its condition is true, and EXIT leaves the loop at once, so the search stops at the first empty slot. -1 is a value no real slot can have, so it means \"none\". The bound check stays in the loop condition and the array read stays inside the body, so the code never reads Rack_Full[10], which would fault the controller.",
      terms: [
        ["WHILE", "WHILE … DO", "Repeats while the condition is true. Checked before every pass."],
        ["EXIT", "EXIT;", "Leaves the innermost loop immediately."],
        ["-1", "Not found", "A value no slot can have."],
        ["END_WHILE", "END_WHILE;", "Closes the loop."],
      ],
      sim: {"types":{"Rack_Full":"BOOL[10]"},"start":{"Rack_Full[0]":1,"Rack_Full[1]":1,"Rack_Full[2]":1},"watch":["Next_Slot"],"steps":[{"label":"Slot 3 filled","set":{"Rack_Full[3]":1}},{"label":"Slot 1 emptied","set":{"Rack_Full[1]":0}},{"label":"Every slot filled","set":{"Rack_Full[1]":1,"Rack_Full[4]":1,"Rack_Full[5]":1,"Rack_Full[6]":1,"Rack_Full[7]":1,"Rack_Full[8]":1,"Rack_Full[9]":1}}]},
      out: `Slot 3 filled      →  Next_Slot=4
Slot 1 emptied     →  Next_Slot=1
Every slot filled  →  Next_Slot=-1`,
    },
    {
      t: "REPEAT … UNTIL",
      goal: "Count the trailer Loads needed for Barrels_Waiting at 48 barrels per trailer, by taking 48 off until nothing is left.",
      code: `Loads := 0;
Left := Barrels_Waiting;
REPEAT
    Loads := Loads + 1;
    Left := Left - 48;
UNTIL Left <= 0
END_REPEAT;`,
      about: "REPEAT checks its condition after the body, so the body always runs at least once. That is right for 130 barrels (3 loads) and 96 (2), but with 0 barrels waiting it still books 1 load. Run the last step and see. When zero passes is possible, use WHILE, which checks first. 48 barrels per trailer is illustrative.",
      terms: [
        ["REPEAT", "REPEAT … UNTIL", "Runs the body, then stops when the UNTIL condition is true."],
        ["UNTIL", "UNTIL Left <= 0", "Checked after each pass, so there is always at least one."],
        ["END_REPEAT", "END_REPEAT;", "Closes the loop. UNTIL itself has no semicolon."],
      ],
      sim: {"types":{"Barrels_Waiting":"DINT"},"start":{"Barrels_Waiting":48},"watch":["Loads"],"steps":[{"label":"130 barrels waiting","set":{"Barrels_Waiting":130}},{"label":"96 barrels waiting","set":{"Barrels_Waiting":96}},{"label":"0 barrels waiting","set":{"Barrels_Waiting":0}}]},
      out: `130 barrels waiting  →  Loads=3
96 barrels waiting   →  Loads=2
0 barrels waiting    →  Loads=1`,
    },
    {
      t: "ABS for a deadband",
      goal: "Set Speed_Error to Speed_SP minus Speed_PV, and Speed_Alarm when the error is more than 2.0 barrels per hour either way.",
      code: `Speed_Error := Speed_SP - Speed_PV;
Speed_Alarm := ABS(Speed_Error) > 2.0;`,
      about: "ABS drops the sign, so one comparison covers too slow and too fast. Without it you need two: error > 2.0 OR error < -2.0. The setpoint is Conveyor 3's ideal 60 barrels per hour; the 2.0 band is illustrative. Speed_Error keeps its sign, so the HMI can still say which way the conveyor is off.",
      terms: [
        ["ABS", "ABS( )", "Absolute value: the number without its sign."],
        ["Speed_Error", "Signed error", "Positive when slow, negative when fast."],
      ],
      sim: {"types":{"Speed_SP":"REAL","Speed_PV":"REAL"},"start":{"Speed_SP":60,"Speed_PV":60},"watch":["Speed_Error","Speed_Alarm"],"steps":[{"label":"Runs at 58.5","set":{"Speed_PV":58.5}},{"label":"Slows to 57.5","set":{"Speed_PV":57.5}},{"label":"Overspeeds to 62.5","set":{"Speed_PV":62.5}},{"label":"Settles at 61.0","set":{"Speed_PV":61}}]},
      out: `Runs at 58.5        →  Speed_Error=1.5
Slows to 57.5       →  Speed_Error=2.5  →  Speed_Alarm=1
Overspeeds to 62.5  →  Speed_Error=-2.5
Settles at 61.0     →  Speed_Error=-1  →  Speed_Alarm=0`,
    },
    {
      t: "Conveyor 3 in Structured Text",
      goal: "Write all of Conveyor 3 in Structured Text: permissive, seal-in, 4 s jam fault with a reset interlock, a barrel count on the eye's leading edge cleared by Shift_Change, and Conv_State 2 jammed, 1 running, 3 idle.",
      code: `(* Permissive and seal-in *)
Run_Permissive := Auto_Mode AND Estop_OK AND NOT Jam_Fault;
Conv_Run := (Start_PB OR Conv_Run) AND Stop_PB AND Run_Permissive;

(* Jam: eye blocked 4 s while running *)
Jam_Timer.PRE := 4000;
Jam_Timer.TimerEnable := Conv_Run AND Eye_Blocked;
TONR(Jam_Timer);
IF Jam_Timer.DN THEN
    Jam_Fault := 1;
END_IF;
IF Reset_PB AND NOT Eye_Blocked THEN
    Jam_Fault := 0;
END_IF;

(* Count each barrel once *)
IF Eye_Blocked AND NOT Eye_Last THEN
    Barrel_Count := Barrel_Count + 1;
END_IF;
Eye_Last := Eye_Blocked;
IF Shift_Change THEN
    Barrel_Count := 0;
END_IF;

(* State for the HMI *)
IF Jam_Fault THEN
    Conv_State := 2;
ELSIF Conv_Run THEN
    Conv_State := 1;
ELSE
    Conv_State := 3;
END_IF;`,
      about: "The whole PLC track routine in one Structured Text routine, in the same order as the rungs. Its trace matches the ladder track step for step. One real difference: the count is a plain DINT with an edge check instead of a CTU, so an Ignition tag path ends in Barrel_Count, not Barrel_Count/ACC. Run it in the simulator, pass barrels, jam one, and reset.",
      terms: [
        ["Run_Permissive", "Permissive", "Auto, e-stop healthy and no jam."],
        ["TONR", "Jam timer", "4 s of a blocked eye while running."],
        ["Eye_Last", "Edge", "Counts each barrel once, on the leading edge."],
        ["Conv_State", "State", "2 jammed, 1 running, 3 idle, for the HMI and the hourly log."],
      ],
      sim: {"start":{"Auto_Mode":1,"Estop_OK":1,"Stop_PB":1},"watch":["Conv_Run","Jam_Fault","Conv_State"],"steps":[{"label":"Press and release Start_PB","pulse":{"Start_PB":1}},{"label":"Eye blocked 4 s","set":{"Eye_Blocked":1},"runMs":4100},{"label":"Eye cleared, then Reset_PB","set":{"Eye_Blocked":0},"pulse":{"Reset_PB":1}}],"scene":"conveyor3","sameAs":"t-plc/Machine state codes"},
      out: `Press and release Start_PB  →  Conv_Run=1  →  Conv_State=1
Eye blocked 4 s             →  Jam_Fault=1  →  Conv_State=2  →  Conv_Run=0
Eye cleared, then Reset_PB  →  Jam_Fault=0  →  Conv_State=3`,
    },
  ],
});
