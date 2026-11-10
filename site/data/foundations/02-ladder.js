// Foundations lane: PLC Ladder
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
BC.addLane({
  id: "ladder",
  name: "PLC Ladder",
  lang: "ladder",
  lessons: [
    {
      t: "Contact to coil",
      goal: "When Start_PB is on, energize Conveyor_Run.",
      code: `XIC(Start_PB) OTE(Conveyor_Run);`,
      about: "One rung. Logic flows from the left rail to the right rail. If the contact is true, power reaches the coil and the output turns on. The semicolon ends the rung.",
      terms: [
        ["XIC", "XIC(tag)", "Examine If Closed. True when the bit is 1. Drawn as -[ ]-."],
        ["OTE", "OTE(tag)", "Output Energize. Bit is 1 while the rung is true, 0 when false. Drawn as -( )-."],
        [";", ";", "Ends the rung."],
      ],
      sim: {"watch":["Conveyor_Run"],"steps":[{"label":"Press Start_PB","set":{"Start_PB":1}},{"label":"Release Start_PB","set":{"Start_PB":0}}]},
      out: `Press Start_PB    →  Conveyor_Run=1
Release Start_PB  →  Conveyor_Run=0`,
    },
    {
      t: "Series logic (AND)",
      goal: "Run Feeder_Run only when Auto_Mode is on, Part_Present is on, and Jam_Fault is off.",
      code: `XIC(Auto_Mode) XIC(Part_Present) XIO(Jam_Fault) OTE(Feeder_Run);`,
      about: "Instructions in a row are AND logic: every one must be true. XIO on Jam_Fault is true only while there is no jam.",
      terms: [
        ["XIO", "XIO(tag)", "Examine If Open. True when the bit is 0. Drawn as -[/]-."],
        ["XIC", "Series", "Instructions side by side on one rung are AND logic. All must be true."],
        ["Part_Present", "Tag names", "Names like Part_Present point to memory in the controller. Underscores, no spaces."],
      ],
      sim: {"start":{"Auto_Mode":1},"watch":["Feeder_Run"],"steps":[{"label":"Part arrives","set":{"Part_Present":1}},{"label":"Jam_Fault on","set":{"Jam_Fault":1}},{"label":"Jam cleared","set":{"Jam_Fault":0}},{"label":"Auto_Mode off","set":{"Auto_Mode":0}}]},
      out: `Part arrives   →  Feeder_Run=1
Jam_Fault on   →  Feeder_Run=0
Jam cleared    →  Feeder_Run=1
Auto_Mode off  →  Feeder_Run=0`,
    },
    {
      t: "Seal-in circuit",
      goal: "Start Motor_Run with Start_PB and keep it running after release, until Stop_PB opens.",
      code: `BST XIC(Start_PB) NXB XIC(Motor_Run) BND XIC(Stop_PB) OTE(Motor_Run);`,
      about: "The branch is OR logic: Start_PB or the motor's own run bit. Once running, Motor_Run holds the rung true. Stop_PB is wired normally closed, so its XIC is true until someone presses Stop.",
      terms: [
        ["BST", "BST", "Branch Start. Opens a parallel branch."],
        ["NXB", "NXB", "Next Branch. Starts the next parallel leg. Parallel legs are OR logic."],
        ["BND", "BND", "Branch End. Closes the branch and rejoins the rung."],
        ["Motor_Run", "Seal-in", "The output's own bit in the branch holds the rung true after Start is released."],
      ],
      sim: {"start":{"Stop_PB":1},"watch":["Motor_Run"],"steps":[{"label":"Press and release Start_PB","pulse":{"Start_PB":1}},{"label":"Wait 5 s","runMs":5000},{"label":"Press and release Stop_PB","pulse":{"Stop_PB":0}},{"label":"Press and release Start_PB","pulse":{"Start_PB":1}},{"label":"Hold Start_PB and Stop_PB together","set":{"Start_PB":1,"Stop_PB":0}}]},
      out: `Press and release Start_PB          →  Motor_Run=1
Wait 5 s                            →  no change
Press and release Stop_PB           →  Motor_Run=0
Press and release Start_PB          →  Motor_Run=1
Hold Start_PB and Stop_PB together  →  Motor_Run=0`,
    },
    {
      t: "Latch and unlatch",
      goal: "Latch Jam_Fault when Jam_Sensor trips. Clear it only with Reset_PB.",
      code: `XIC(Jam_Sensor) OTL(Jam_Fault);
XIC(Reset_PB) OTU(Jam_Fault);`,
      about: "Two rungs. The controller scans them top to bottom every cycle. The fault stays set after the sensor clears, so an operator has to acknowledge it.",
      terms: [
        ["OTL", "OTL(tag)", "Output Latch. Sets the bit to 1 and leaves it there, even after the rung goes false."],
        ["OTU", "OTU(tag)", "Output Unlatch. Clears a latched bit to 0."],
        [null, "Scan", "Each line is a rung. The PLC evaluates every rung in order, then repeats, many times a second."],
      ],
      sim: {"watch":["Jam_Fault"],"steps":[{"label":"Jam_Sensor trips, then clears","pulse":{"Jam_Sensor":1}},{"label":"Press Reset_PB","pulse":{"Reset_PB":1}}]},
      out: `Jam_Sensor trips, then clears  →  Jam_Fault=1
Press Reset_PB                 →  Jam_Fault=0`,
    },
    {
      t: "On-delay timer",
      goal: "If Conveyor_Run is on and Part_Seen stays off for 5 seconds, latch No_Feed_Fault. Timer tag: No_Feed_Timer.",
      code: `XIC(Conveyor_Run) XIO(Part_Seen) TON(No_Feed_Timer,5000,0);
XIC(No_Feed_Timer.DN) OTL(No_Feed_Fault);`,
      about: "The timer accumulates while the conveyor runs without seeing a part. Any part resets it. If it reaches 5000 ms, the done bit latches the fault. A running belt with no parts means it is starved or blocked upstream, not jammed: the PLC track's jam is the opposite case, a barrel blocking the eye for 4 s, so the two faults get different names.",
      terms: [
        ["TON", "TON(tag,preset,accum)", "Timer On Delay. Times while the rung is true; resets when false."],
        ["5000", "5000", "Preset in milliseconds. 5000 ms is 5 seconds."],
        ["DN", ".DN", "The Done bit. On when the accumulator reaches the preset."],
      ],
      sim: {"start":{"Conveyor_Run":1},"watch":["No_Feed_Timer.DN","No_Feed_Fault"],"steps":[{"label":"A part every 3 s","pulse":{"Part_Seen":1},"runMs":3000,"repeat":3},{"label":"Last part, then none for 5 s","pulse":{"Part_Seen":1},"runMs":5400}]},
      out: `A part every 3 s              →  no change
Last part, then none for 5 s  →  No_Feed_Timer.DN=1  →  No_Feed_Fault=1`,
    },
    {
      t: "Count barrels",
      goal: "Count each Barrel_Eye pulse once in Barrel_Count, turn on Lot_Complete at 500, and reset the count on Shift_Reset.",
      code: `XIC(Barrel_Eye) CTU(Barrel_Count,500,0);
XIC(Barrel_Count.DN) OTE(Lot_Complete);
XIC(Shift_Reset) RES(Barrel_Count);`,
      about: "CTU only counts when its rung goes from false to true, so a barrel sitting in front of the eye for many scans still counts once. The done bit flags the lot. RES zeroes the counter at shift change.",
      terms: [
        ["CTU", "CTU(tag,preset,accum)", "Count Up. Adds 1 on each false-to-true transition of the rung. Its .CU bit remembers the last rung state, which is how it sees the edge."],
        ["RES", "RES(tag)", "Reset. Clears a counter or timer accumulator and its status bits."],
        ["DN", ".DN", "Counter done bit: on when the count is at or above the preset."],
      ],
      sim: {"watch":["Barrel_Count.ACC","Lot_Complete"],"steps":[{"label":"498 barrels pass the eye","pulse":{"Barrel_Eye":1},"runMs":600,"repeat":498},{"label":"2 more barrels","pulse":{"Barrel_Eye":1},"runMs":600,"repeat":2},{"label":"Press Shift_Reset","pulse":{"Shift_Reset":1}}]},
      out: `498 barrels pass the eye  →  Barrel_Count.ACC=498
2 more barrels            →  Barrel_Count.ACC=500  →  Lot_Complete=1
Press Shift_Reset         →  Barrel_Count.ACC=0  →  Lot_Complete=0`,
    },
    {
      t: "Off-delay timer",
      goal: "Run Char2_Exhaust_Fan while Char2_Burner_On is on, and keep it running for 30 seconds after the burner shuts off. Timer tag: Exhaust_Timer.",
      code: `XIC(Char2_Burner_On) TOF(Exhaust_Timer,30000,0);
XIC(Exhaust_Timer.DN) OTE(Char2_Exhaust_Fan);`,
      about: "TOF is the mirror image of TON. Its done bit turns on the moment the rung goes true and stays on until the rung has been false for the preset time. Here the fan starts with the burner and runs on for 30 seconds to clear smoke and heat after it stops. The 30 seconds is illustrative; a real purge time comes from the burner's safety requirements, not from the programmer.",
      terms: [
        ["TOF", "TOF(timer,preset,accum)", "Timer Off Delay. Starts timing when the rung goes false; resets when the rung goes true again."],
        ["DN", ".DN on a TOF", "On while the rung is true, and for the preset time after it goes false."],
        ["30000", "30000", "30,000 ms is 30 seconds."],
      ],
      sim: {"watch":["Exhaust_Timer.DN","Char2_Exhaust_Fan"],"steps":[{"label":"Burner on","set":{"Char2_Burner_On":1}},{"label":"Burner off, first 29 s","set":{"Char2_Burner_On":0},"runMs":29000},{"label":"1 s more","runMs":1100}],"scene":"char2"},
      out: `Burner on               →  Exhaust_Timer.DN=1  →  Char2_Exhaust_Fan=1
Burner off, first 29 s  →  no change
1 s more                →  Exhaust_Timer.DN=0  →  Char2_Exhaust_Fan=0`,
    },
    {
      t: "Retentive timer",
      goal: "Build a Conveyor 3 hour meter: an RTO times Conv_Run for one hour, then adds 1 to Conv3_Run_Hours and resets itself. Turn on Conv3_PM_Due at 500 hours.",
      code: `XIC(Conv_Run) RTO(Conv3_Hour_Timer,3600000,0);
XIC(Conv3_Hour_Timer.DN) BST CTU(Conv3_Run_Hours,500,0) NXB RES(Conv3_Hour_Timer) BND;
XIC(Conv3_Run_Hours.DN) OTE(Conv3_PM_Due);`,
      about: "An RTO keeps its time when the rung goes false, so stops and restarts add up instead of starting over. That is what an hour meter needs. When an hour is reached, one branch counts it and the other resets the timer to time the next hour. Scheduling preventive maintenance by run hours instead of calendar days is a core TPM habit: a machine that ran half the month should not be serviced as often as one that ran all month. 500 hours is an illustrative interval.",
      terms: [
        ["RTO", "RTO(timer,preset,accum)", "Retentive Timer On. Times while the rung is true and holds its time when it goes false. Only RES clears it."],
        ["3600000", "3600000", "The preset in ms: 3,600,000 ms is one hour."],
        ["BST", "Output branch", "Branches can hold outputs too. Both legs run when the rung is true."],
        ["RES", "RES(timer)", "Clears the timer so it starts the next hour from zero."],
      ],
      sim: {"scanMs":100,"start":{"Conv3_Run_Hours.ACC":498},"watch":["Conv3_Run_Hours.ACC","Conv3_PM_Due"],"steps":[{"label":"Runs 40 min","set":{"Conv_Run":1},"runMs":2400000},{"label":"Stopped 15 min","set":{"Conv_Run":0},"runMs":900000},{"label":"Runs 21 min more","set":{"Conv_Run":1},"runMs":1260000},{"label":"Runs another 61 min","runMs":3660000}]},
      out: `Runs 40 min          →  no change
Stopped 15 min       →  no change
Runs 21 min more     →  Conv3_Run_Hours.ACC=499
Runs another 61 min  →  Conv3_Run_Hours.ACC=500  →  Conv3_PM_Due=1`,
    },
    {
      t: "Compare a value",
      goal: "If Hoop1_Air_PSI stays below 80 for 2 seconds, latch Hoop1_Low_Air. Timer tag: Low_Air_Timer.",
      code: `LES(Hoop1_Air_PSI,80) TON(Low_Air_Timer,2000,0);
XIC(Low_Air_Timer.DN) OTL(Hoop1_Low_Air);`,
      about: "LES is true while its first value is less than its second. Hoop1_Air_PSI is the scaled reading from a pressure transmitter, a number rather than a bit. Air pressure dips for a moment every time a large cylinder fires, so the timer requires 2 seconds of low pressure before calling it a fault. Without that filter, the Low air bar in the downtime Pareto would fill with blips nobody can act on. 80 psi is an illustrative threshold.",
      terms: [
        ["LES", "LES(a,b)", "Less Than. True when A is less than B. GRT is greater than; LEQ and GEQ include equal."],
        ["Hoop1_Air_PSI", "Analog value", "A REAL tag holding a measurement, not an on/off bit."],
        ["TON", "Debounce", "A timer after a compare makes the condition hold for a while before anything acts on it."],
      ],
      sim: {"types":{"Hoop1_Air_PSI":"REAL"},"start":{"Hoop1_Air_PSI":92},"watch":["Low_Air_Timer.DN","Hoop1_Low_Air"],"steps":[{"label":"Cylinder fires: 76 psi for 0.5 s","pulse":{"Hoop1_Air_PSI":76},"pulseMs":500,"runMs":1000},{"label":"Header drops to 74 psi for 2.1 s","set":{"Hoop1_Air_PSI":74},"runMs":2100}],"scene":"air1"},
      out: `Cylinder fires: 76 psi for 0.5 s  →  no change
Header drops to 74 psi for 2.1 s  →  Low_Air_Timer.DN=1  →  Hoop1_Low_Air=1`,
    },
    {
      t: "Limit test",
      goal: "Turn on Hoop1_Air_OK while Hoop1_Air_PSI is between 85 and 110.",
      code: `LIM(85,Hoop1_Air_PSI,110) OTE(Hoop1_Air_OK);`,
      about: "LIM checks a value against a band in one instruction: true when low <= test <= high. Operators see Hoop1_Air_OK as the green light on the faceplate, and maintenance can spot a header running high as well as low. If the low limit is ever set above the high limit, LIM flips and is true outside the band instead, a common source of confusion.",
      terms: [
        ["LIM", "LIM(low,test,high)", "Limit Test. True when the test value is inside the band, ends included."],
        ["110", "Band limits", "Typed numbers here for clarity. Real programs usually use tags so the band can be changed from the HMI."],
      ],
      sim: {"types":{"Hoop1_Air_PSI":"REAL"},"watch":["Hoop1_Air_OK"],"steps":[{"label":"Header comes up to 92 psi","set":{"Hoop1_Air_PSI":92}},{"label":"Drops to 84 psi","set":{"Hoop1_Air_PSI":84}},{"label":"Back to 85 psi, the low limit","set":{"Hoop1_Air_PSI":85}},{"label":"Rises to 112 psi","set":{"Hoop1_Air_PSI":112}}],"scene":"air1"},
      out: `Header comes up to 92 psi      →  Hoop1_Air_OK=1
Drops to 84 psi                →  Hoop1_Air_OK=0
Back to 85 psi, the low limit  →  Hoop1_Air_OK=1
Rises to 112 psi               →  Hoop1_Air_OK=0`,
    },
    {
      t: "Move a value",
      goal: "When Size_53_Sel is on, move 53 into Barrel_Size_Gal; when Size_30_Sel is on, move 30. Turn on Big_Head_Tooling while the size equals 53.",
      code: `XIC(Size_53_Sel) MOV(53,Barrel_Size_Gal);
XIC(Size_30_Sel) MOV(30,Barrel_Size_Gal);
EQU(Barrel_Size_Gal,53) OTE(Big_Head_Tooling);`,
      about: "MOV copies a value into a tag on every scan its rung is true, and the destination keeps that value after the rung goes false. A selector loads the barrel size once, and every other rung reads Barrel_Size_Gal instead of the buttons. EQU then picks the tooling. 53 and 30 gallons are common barrel sizes; the tooling bit is illustrative.",
      terms: [
        ["MOV", "MOV(source,dest)", "Move. Copies the source into the destination. The destination keeps it until something writes it again."],
        ["EQU", "EQU(a,b)", "Equal. True when A equals B. Use it on whole numbers; exact equality on REAL values is unreliable."],
        ["Barrel_Size_Gal", "One source of truth", "One tag holds the selection, so the rest of the program does not care which button set it."],
      ],
      sim: {"watch":["Barrel_Size_Gal","Big_Head_Tooling"],"steps":[{"label":"Press Size_53_Sel","pulse":{"Size_53_Sel":1}},{"label":"Press Size_30_Sel","pulse":{"Size_30_Sel":1}}]},
      out: `Press Size_53_Sel  →  Barrel_Size_Gal=53  →  Big_Head_Tooling=1
Press Size_30_Sel  →  Barrel_Size_Gal=30  →  Big_Head_Tooling=0`,
    },
    {
      t: "One-shot for math",
      goal: "Each press of Reject_PB adds 1 to Reject_Count with ADD, exactly once per press. One-shot storage bit: Reject_ONS.",
      code: `XIC(Reject_PB) ONS(Reject_ONS) ADD(Reject_Count,1,Reject_Count);`,
      about: "ADD runs on every scan its rung is true. With a 10 ms scan, a button held for half a second would add 50. ONS passes true for exactly one scan when the rung goes from false to true, so each press adds 1. CTU does not need this because it already counts only the transition; ADD, MOV and CPT do. Reject counts feed the quality part of OEE, so a double count here becomes lost dollars on a report.",
      terms: [
        ["ONS", "ONS(storage bit)", "One Shot. True for a single scan on the rising edge. The storage bit remembers the last rung state; do not use it anywhere else."],
        ["ADD", "ADD(a,b,dest)", "Add. Dest = A + B. Here the destination is also a source, so the tag adds 1 to itself."],
        [null, "When to one-shot", "In front of instructions that act every scan: ADD, MOV, CPT. Not in front of CTU, CTD or timers."],
      ],
      sim: {"watch":["Reject_Count"],"steps":[{"label":"Press Reject_PB, hold 0.5 s","pulse":{"Reject_PB":1},"pulseMs":500},{"label":"Two more presses","pulse":{"Reject_PB":1},"repeat":2}]},
      out: `Press Reject_PB, hold 0.5 s  →  Reject_Count=1
Two more presses             →  Reject_Count=3`,
    },
    {
      t: "Compute a rate",
      goal: "While Run_Minutes is above 0, compute Barrels_Per_Hr as Barrel_Count.ACC × 60 ÷ Run_Minutes. Then compute Pct_Of_Ideal against Conveyor 3's ideal rate of 60 barrels per hour.",
      code: `GRT(Run_Minutes,0) CPT(Barrels_Per_Hr,Barrel_Count.ACC*60.0/Run_Minutes);
CPT(Pct_Of_Ideal,Barrels_Per_Hr/60.0*100.0);`,
      about: "CPT evaluates a whole expression and stores the result. The GRT in front guards against dividing by zero at the start of a shift, which would log a math overflow fault and store a meaningless value. Writing 60.0 and storing into REAL tags keeps the decimals; integer math would drop them. This is the performance figure from the OEE and Shift Handoff tracks, computed live in the PLC: 352 barrels in 450 minutes is 46.9 per hour, 78.2% of Conveyor 3's ideal 60.",
      terms: [
        ["CPT", "CPT(dest,expression)", "Compute. Evaluates the expression and stores the result in dest."],
        ["GRT", "Divide-by-zero guard", "Compute only when the divisor is above zero."],
        ["60.0", "60.0", "A REAL constant. Keeps the math in decimals."],
        ["ACC", ".ACC", "A counter's current count, usable as a number in math."],
      ],
      sim: {"types":{"Barrel_Count":"COUNTER"},"watch":["Barrels_Per_Hr","Pct_Of_Ideal"],"steps":[{"label":"Shift starts: 0 min, 0 barrels","set":{"Run_Minutes":0,"Barrel_Count.ACC":0}},{"label":"After 450 min with 352 barrels","set":{"Run_Minutes":450,"Barrel_Count.ACC":352}}]},
      out: `Shift starts: 0 min, 0 barrels  →  no change
After 450 min with 352 barrels  →  Barrels_Per_Hr=46.93333  →  Pct_Of_Ideal=78.22222`,
    },
    {
      t: "Count in and out",
      goal: "Track barrels on Conveyor 3 in Conv3_WIP (capacity 12): Entry_Eye counts up, Exit_Eye counts down. When it is full, turn on both Infeed_Hold and Conv3_Full_Light from one rung.",
      code: `XIC(Entry_Eye) CTU(Conv3_WIP,12,0);
XIC(Exit_Eye) CTD(Conv3_WIP,12,0);
XIC(Conv3_WIP.DN) BST OTE(Infeed_Hold) NXB OTE(Conv3_Full_Light) BND;`,
      about: "CTU and CTD can share one counter: entries add, exits subtract, and the accumulator is the number of barrels on the conveyor right now. Each instruction keeps its own edge bit (.CU and .CD), so both work on the same tag. The done bit is on at 12 or more, which holds the infeed so barrels stop piling in. A missed eye pulse leaves the count wrong until it is reset, so real systems also reset WIP when the conveyor is confirmed empty. A capacity of 12 is illustrative.",
      terms: [
        ["CTD", "CTD(counter,preset,accum)", "Count Down. Subtracts 1 on each false-to-true transition of its rung."],
        ["Conv3_WIP", "Work in process", "Barrels between the entry and exit eyes. The accumulator can go negative if the eyes disagree."],
        ["BST", "Output branch", "Parallel legs at the end of a rung, each with its own output. One condition, two actions."],
        ["DN", ".DN", "On when the count is at or above the preset: the conveyor is full."],
      ],
      sim: {"watch":["Conv3_WIP.ACC","Infeed_Hold","Conv3_Full_Light"],"steps":[{"label":"12 barrels enter","pulse":{"Entry_Eye":1},"runMs":600,"repeat":12},{"label":"1 barrel leaves","pulse":{"Exit_Eye":1},"runMs":600}]},
      out: `12 barrels enter  →  Conv3_WIP.ACC=12  →  Infeed_Hold=1  →  Conv3_Full_Light=1
1 barrel leaves   →  Conv3_WIP.ACC=11  →  Infeed_Hold=0  →  Conv3_Full_Light=0`,
    },
    {
      t: "Stop on low air",
      goal: "Latch Hoop1_Low_Air when Hoop1_Air_PSI stays below 80 for 2 s (Low_Air_Timer). Let Reset_PB clear it only at 85 psi or more. Run Hoop1_Run only in Hoop1_Auto with no low-air fault.",
      code: `LES(Hoop1_Air_PSI,80) TON(Low_Air_Timer,2000,0);
XIC(Low_Air_Timer.DN) OTL(Hoop1_Low_Air);
XIC(Reset_PB) GEQ(Hoop1_Air_PSI,85) OTU(Hoop1_Low_Air);
XIC(Hoop1_Auto) XIO(Hoop1_Low_Air) OTE(Hoop1_Run);`,
      about: "This puts the compare, timer and latch lessons together into the logic that protects Hoop Driver 1. A cylinder firing dips the header for a moment, which the 2-second timer ignores; a real loss of air latches the fault and stops the machine. The reset only works once pressure is back in the normal band, the same idea as the jam reset that refuses to clear while a barrel blocks the eye. In the simulator, trip the compressor, watch the machine stop, and try resetting before the pressure recovers.",
      terms: [
        ["GEQ", "GEQ(a,b)", "Greater Than or Equal. True when A is at least B."],
        ["Hoop1_Run", "Run permissive", "The machine runs only in auto and with no latched low-air fault."],
        ["Reset_PB", "Reset interlock", "The reset only works once the cause is gone: pressure back to 85 psi or more."],
      ],
      sim: {"types":{"Hoop1_Air_PSI":"REAL"},"start":{"Hoop1_Air_PSI":92,"Hoop1_Auto":1},"scene":"air1","watch":["Low_Air_Timer.DN","Hoop1_Low_Air","Hoop1_Run"],"steps":[{"label":"Cylinder fires: 78 psi for 0.4 s","pulse":{"Hoop1_Air_PSI":78},"pulseMs":400},{"label":"Compressor trips: 70 psi for 2.5 s","set":{"Hoop1_Air_PSI":70},"runMs":2500},{"label":"Reset_PB at 70 psi","pulse":{"Reset_PB":1}},{"label":"Air back to 92 psi, then Reset_PB","set":{"Hoop1_Air_PSI":92},"pulse":{"Reset_PB":1}}]},
      out: `Cylinder fires: 78 psi for 0.4 s    →  no change
Compressor trips: 70 psi for 2.5 s  →  Low_Air_Timer.DN=1  →  Hoop1_Low_Air=1  →  Hoop1_Run=0
Reset_PB at 70 psi                  →  no change
Air back to 92 psi, then Reset_PB   →  Low_Air_Timer.DN=0  →  Hoop1_Low_Air=0  →  Hoop1_Run=1`,
    },
    {
      t: "Purge before and after the flame",
      goal: "Char Station 2: with Char2_Start on, run Char2_Exhaust_Fan and light Char2_Burner_On only after a 5 s purge (Purge_Timer). After the burner goes out, keep the fan running 30 s (Post_Purge).",
      code: `XIC(Char2_Start) TON(Purge_Timer,5000,0);
XIC(Purge_Timer.DN) OTE(Char2_Burner_On);
XIC(Char2_Burner_On) TOF(Post_Purge,30000,0);
BST XIC(Char2_Start) NXB XIC(Post_Purge.DN) BND OTE(Char2_Exhaust_Fan);`,
      about: "The fan runs before the burner lights, to clear anything that could ignite, and keeps running after it goes out, to clear heat and smoke. The fan rung is an OR: the start switch, or the post-purge timer still timing. The 5 and 30 seconds are illustrative. Real burner safety is handled by a certified burner management system built to the applicable safety standard, never by ordinary PLC rungs like these; this lesson is about timer logic, not burner safety.",
      terms: [
        ["Purge_Timer", "Pre-purge", "5 s of fan before the burner may light."],
        ["TOF", "Post-purge", "Keeps the fan running 30 s after the burner goes out."],
        ["BST", "Fan OR", "The fan runs for the start switch or the post-purge, whichever is on."],
      ],
      sim: {"scene":"char2","watch":["Char2_Exhaust_Fan","Char2_Burner_On"],"steps":[{"label":"Char2_Start on, first 4 s","set":{"Char2_Start":1},"runMs":4000},{"label":"1 s more","runMs":1100},{"label":"Char2_Start off, first 29 s","set":{"Char2_Start":0},"runMs":29000},{"label":"1 s more","runMs":1100}]},
      out: `Char2_Start on, first 4 s    →  Char2_Exhaust_Fan=1
1 s more                     →  Char2_Burner_On=1
Char2_Start off, first 29 s  →  Char2_Burner_On=0
1 s more                     →  Char2_Exhaust_Fan=0`,
    },
    {
      t: "Two start stations",
      goal: "Start Conv_Run from either Local_Start_PB or Remote_Start_PB, hold it on with a seal-in, and stop it with Stop_PB (wired normally closed).",
      code: `BST XIC(Local_Start_PB) NXB XIC(Remote_Start_PB) NXB XIC(Conv_Run) BND XIC(Stop_PB) OTE(Conv_Run);`,
      about: "A branch can have more than two legs. Each start button is one leg and the seal-in contact is the third, so any of them powers the coil. Every stop button goes in series instead: one stop anywhere must stop the conveyor. That is the general rule, starts in parallel and stops in series.",
      terms: [
        ["NXB", "Third leg", "Each NXB adds another parallel path."],
        ["Remote_Start_PB", "Second station", "A start button at the far end of the conveyor."],
        ["Stop_PB", "Stops in series", "One stop anywhere breaks the rung."],
      ],
      sim: {"start":{"Stop_PB":1},"scene":"conveyor3","watch":["Conv_Run"],"steps":[{"label":"Press and release Local_Start_PB","pulse":{"Local_Start_PB":1}},{"label":"Press and release Stop_PB","pulse":{"Stop_PB":0}},{"label":"Press and release Remote_Start_PB","pulse":{"Remote_Start_PB":1}}]},
      out: `Press and release Local_Start_PB   →  Conv_Run=1
Press and release Stop_PB          →  Conv_Run=0
Press and release Remote_Start_PB  →  Conv_Run=1`,
    },
    {
      t: "Wired normally closed",
      goal: "Seal in Hoop1_Run from Start_PB through Stop_PB, which is wired normally closed. Light Stop_Lamp whenever the stop circuit is open.",
      code: `BST XIC(Start_PB) NXB XIC(Hoop1_Run) BND XIC(Stop_PB) OTE(Hoop1_Run);
XIO(Stop_PB) OTE(Stop_Lamp);`,
      about: "A normally closed stop button sends 1 to the input while nobody presses it, so the program uses XIC: true means healthy. The payoff is failure: a cut wire or a loose terminal reads 0, exactly like pressing Stop, so the machine stops. Wire it normally open with an XIO instead and a broken wire leaves a Stop button that does nothing.",
      terms: [
        ["XIC(Stop_PB)", "XIC on a closed contact", "True while the button is not pressed and the wire is intact."],
        ["XIO(Stop_PB)", "Open stop circuit", "True when the button is pressed or the wire is broken."],
      ],
      sim: {"start":{"Stop_PB":1},"watch":["Hoop1_Run","Stop_Lamp"],"steps":[{"label":"Press and release Start_PB","pulse":{"Start_PB":1}},{"label":"Stop wire breaks","set":{"Stop_PB":0}},{"label":"Wire repaired","set":{"Stop_PB":1}},{"label":"Press and release Start_PB","pulse":{"Start_PB":1}}]},
      out: `Press and release Start_PB  →  Hoop1_Run=1
Stop wire breaks            →  Hoop1_Run=0  →  Stop_Lamp=1
Wire repaired               →  Stop_Lamp=0
Press and release Start_PB  →  Hoop1_Run=1`,
    },
    {
      t: "Forward and reverse interlock",
      goal: "Jog Conveyor 3 forward with Fwd_PB and reverse with Rev_PB. Each direction must be off before the other can come on.",
      code: `XIC(Fwd_PB) XIO(Conv_Rev) OTE(Conv_Fwd);
XIC(Rev_PB) XIO(Conv_Fwd) OTE(Conv_Rev);`,
      about: "Reversing a conveyor a few inches is a common way to free a jammed barrel. Both contactors on at once would short two motor phases, so each rung checks that the other direction is off. Real reversing starters also have a mechanical interlock and auxiliary contacts wired in hardware; the PLC interlock is one layer, never the only one.",
      terms: [
        ["XIO(Conv_Rev)", "Interlock", "Forward is blocked while reverse is on."],
        ["XIO(Conv_Fwd)", "Interlock", "Reverse is blocked while forward is on."],
      ],
      sim: {"watch":["Conv_Fwd","Conv_Rev"],"steps":[{"label":"Hold Fwd_PB","set":{"Fwd_PB":1}},{"label":"Also press Rev_PB","set":{"Rev_PB":1}},{"label":"Release Fwd_PB, Rev_PB still held","set":{"Fwd_PB":0}},{"label":"Release Rev_PB","set":{"Rev_PB":0}}]},
      out: `Hold Fwd_PB                        →  Conv_Fwd=1
Also press Rev_PB                  →  no change
Release Fwd_PB, Rev_PB still held  →  Conv_Fwd=0  →  Conv_Rev=1
Release Rev_PB                     →  Conv_Rev=0`,
    },
    {
      t: "Flashing beacon",
      goal: "Run Flash_Timer as a 1 s timer that restarts itself. While Jam_Fault is on, turn Jam_Beacon on for the first half of each second.",
      code: `XIO(Flash_Timer.DN) TON(Flash_Timer,1000,0);
XIC(Jam_Fault) LES(Flash_Timer.ACC,500) OTE(Jam_Beacon);`,
      about: "The timer's own done bit resets it: when it reaches 1000 ms the rung goes false for one scan, the timer clears, and timing starts again. Comparing the accumulator with 500 splits each second into on and off halves. A flashing light draws the eye more than a steady one, which is why new alarms usually flash.",
      terms: [
        ["XIO(Flash_Timer.DN)", "Self-reset", "The done bit drops the rung for one scan, which restarts the timer."],
        ["LES", "LES(ACC, 500)", "True for the first half of each cycle."],
      ],
      sim: {"watch":["Jam_Beacon"],"steps":[{"label":"Jam_Fault on","set":{"Jam_Fault":1},"runMs":250},{"label":"0.5 s later","runMs":500},{"label":"0.5 s later","runMs":500},{"label":"Jam_Fault off","set":{"Jam_Fault":0},"runMs":500}]},
      out: `Jam_Fault on   →  Jam_Beacon=1
0.5 s later    →  Jam_Beacon=0
0.5 s later    →  Jam_Beacon=1
Jam_Fault off  →  Jam_Beacon=0`,
    },
    {
      t: "Push on, push off",
      goal: "Each press of Lamp_PB turns Work_Light on if it was off and off if it was on, however long the button is held.",
      code: `XIC(Lamp_PB) ONS(Lamp_ONS) OTE(Lamp_Edge);
BST XIC(Lamp_Edge) XIO(Work_Light) NXB XIO(Lamp_Edge) XIC(Work_Light) BND OTE(Work_Light);`,
      about: "The first rung turns a press into a one-scan pulse. The second keeps the light as it is, except on that pulse, when it flips. The tempting one-rung version, an OTL leg and an OTU leg on the same edge, fails: the first leg turns the light on and the second leg, evaluated next in the same scan, sees it on and turns it straight off.",
      terms: [
        ["ONS", "One-shot", "Lamp_Edge is on for one scan per press."],
        ["XIO(Lamp_Edge)", "Hold", "With no press, the light keeps its state."],
      ],
      sim: {"watch":["Work_Light"],"steps":[{"label":"Press and release Lamp_PB","pulse":{"Lamp_PB":1}},{"label":"Press and hold Lamp_PB 1 s","pulse":{"Lamp_PB":1},"pulseMs":1000,"runMs":1500},{"label":"Press and release Lamp_PB","pulse":{"Lamp_PB":1}}]},
      out: `Press and release Lamp_PB   →  Work_Light=1
Press and hold Lamp_PB 1 s  →  Work_Light=0
Press and release Lamp_PB   →  Work_Light=1`,
    },
    {
      t: "Falling edge",
      goal: "Add 1 to Barrels_Out each time Barrel_Eye goes from blocked to clear, using Eye_Was_Blocked to remember last scan.",
      code: `XIC(Eye_Was_Blocked) XIO(Barrel_Eye) ADD(Barrels_Out,1,Barrels_Out);
XIC(Barrel_Eye) OTE(Eye_Was_Blocked);`,
      about: "Counting when a barrel leaves the eye, not when it arrives, means the count only moves once the barrel is really past. The first rung asks: blocked last scan and clear now? The second rung then remembers this scan for the next one. The order matters: swap the rungs and Eye_Was_Blocked is already updated, so the edge is never seen.",
      terms: [
        ["Eye_Was_Blocked", "Last scan", "What the eye was on the previous scan."],
        ["XIO(Barrel_Eye)", "Clear now", "Blocked before and clear now is a falling edge."],
        ["ADD", "ADD", "Adds 1 to the count, once per falling edge."],
      ],
      sim: {"watch":["Barrels_Out"],"steps":[{"label":"Barrel blocks the eye","set":{"Barrel_Eye":1}},{"label":"Barrel leaves","set":{"Barrel_Eye":0}},{"label":"2 more barrels pass","pulse":{"Barrel_Eye":1},"pulseMs":400,"runMs":1000,"repeat":2}]},
      out: `Barrel blocks the eye  →  no change
Barrel leaves          →  Barrels_Out=1
2 more barrels pass    →  Barrels_Out=3`,
    },
    {
      t: "Lamp test",
      goal: "Light Run_Lamp from Conv_Run, Jam_Lamp from Jam_Fault and Air_Lamp from Low_Air. Holding Lamp_Test_PB lights all three.",
      code: `BST XIC(Lamp_Test_PB) NXB XIC(Conv_Run) BND OTE(Run_Lamp);
BST XIC(Lamp_Test_PB) NXB XIC(Jam_Fault) BND OTE(Jam_Lamp);
BST XIC(Lamp_Test_PB) NXB XIC(Low_Air) BND OTE(Air_Lamp);`,
      about: "A burned-out fault lamp looks exactly like no fault. A lamp test button, pressed at the start of a shift, proves every bulb works. Each lamp gets the test button as a parallel leg, so the test cannot hide a real condition: when it is released, each lamp goes back to its own signal.",
      terms: [
        ["Lamp_Test_PB", "Lamp test", "A parallel leg on every lamp rung."],
        ["BST", "One branch per lamp", "Test OR the lamp's own condition."],
      ],
      sim: {"start":{"Conv_Run":1},"watch":["Run_Lamp","Jam_Lamp","Air_Lamp"],"steps":[{"label":"Hold Lamp_Test_PB","set":{"Lamp_Test_PB":1}},{"label":"Release Lamp_Test_PB","set":{"Lamp_Test_PB":0}},{"label":"Jam_Fault on","set":{"Jam_Fault":1}}]},
      out: `Hold Lamp_Test_PB     →  Jam_Lamp=1  →  Air_Lamp=1
Release Lamp_Test_PB  →  Jam_Lamp=0  →  Air_Lamp=0
Jam_Fault on          →  Jam_Lamp=1`,
    },
    {
      t: "Debounce an input",
      goal: "Set Eye_Blocked only after Eye_Raw has been on for 200 ms, and clear it only after Eye_Raw has been off for 200 ms.",
      code: `XIC(Eye_Raw) TON(Eye_On_Delay,200,0);
XIO(Eye_Raw) TON(Eye_Off_Delay,200,0);
XIC(Eye_On_Delay.DN) OTL(Eye_Blocked);
XIC(Eye_Off_Delay.DN) OTU(Eye_Blocked);`,
      about: "A photo-eye can flicker: a gap between barrel staves, a reflection, dust. Each flicker counted as a barrel corrupts the count. Two timers filter both edges: a blip shorter than 200 ms never reaches either done bit, so Eye_Blocked does not change. 200 ms is illustrative; it has to be shorter than the real gap between barrels.",
      terms: [
        ["Eye_On_Delay", "On filter", "The raw eye must stay on for 200 ms."],
        ["Eye_Off_Delay", "Off filter", "The raw eye must stay off for 200 ms."],
        ["OTL", "Holds between", "Between the two filters the clean bit keeps its state."],
      ],
      sim: {"watch":["Eye_Blocked"],"steps":[{"label":"Flicker on for 100 ms","pulse":{"Eye_Raw":1},"pulseMs":100},{"label":"Barrel blocks the eye","set":{"Eye_Raw":1}},{"label":"Dropout for 100 ms","pulse":{"Eye_Raw":0},"pulseMs":100},{"label":"Barrel leaves","set":{"Eye_Raw":0}}]},
      out: `Flicker on for 100 ms  →  no change
Barrel blocks the eye  →  Eye_Blocked=1
Dropout for 100 ms     →  no change
Barrel leaves          →  Eye_Blocked=0`,
    },
    {
      t: "Minimum off time",
      goal: "Let Comp_Start_PB start Comp_Run only after the compressor has been off for 10 s (Off_Timer). Comp_Stop_PB is wired normally closed.",
      code: `XIO(Comp_Run) TON(Off_Timer,10000,0);
BST XIC(Comp_Start_PB) XIC(Off_Timer.DN) NXB XIC(Comp_Run) BND XIC(Comp_Stop_PB) OTE(Comp_Run);`,
      about: "Restarting a motor seconds after it stopped stresses the windings, and a compressor restarting against full head pressure can stall. A minimum off time blocks the restart until the timer is done. The start leg needs the done bit; the seal-in leg does not, so a running compressor is not affected. 10 s is illustrative: the compressor maker sets the real value.",
      terms: [
        ["XIO(Comp_Run)", "Times while off", "The timer only runs while the compressor is stopped."],
        ["Off_Timer.DN", "Restart allowed", "Start works only after 10 s off."],
      ],
      sim: {"start":{"Comp_Stop_PB":1},"watch":["Off_Timer.DN","Comp_Run"],"steps":[{"label":"Press Start at power-up","pulse":{"Comp_Start_PB":1}},{"label":"Wait 10 s","runMs":10000},{"label":"Press and release Comp_Start_PB","pulse":{"Comp_Start_PB":1}},{"label":"Press and release Comp_Stop_PB","pulse":{"Comp_Stop_PB":0}},{"label":"Press Start 3 s later","pulse":{"Comp_Start_PB":1},"runMs":3000}]},
      out: `Press Start at power-up          →  no change
Wait 10 s                        →  Off_Timer.DN=1
Press and release Comp_Start_PB  →  Comp_Run=1  →  Off_Timer.DN=0
Press and release Comp_Stop_PB   →  Comp_Run=0
Press Start 3 s later            →  no change`,
    },
    {
      t: "Measure cycle time",
      goal: "Time between barrels with Cycle_Timer. On each barrel at Barrel_Eye, copy the elapsed time into Last_Cycle_ms and restart the timer.",
      code: `TON(Cycle_Timer,600000,0);
XIC(Barrel_Eye) ONS(Eye_ONS) BST MOV(Cycle_Timer.ACC,Last_Cycle_ms) NXB RES(Cycle_Timer) BND;`,
      about: "A rung with no conditions is always true, so the timer always runs. On each barrel the branch copies the time first and then resets it: swap the legs and you always save 0. Conveyor 3's ideal is 60 barrels per hour, one every 60,000 ms. Two details show in the output. The first barrel after power-up saves a meaningless time, so ignore the first reading. And each reading is 10 ms short: after the reset, the timer's first scan starts from zero, so one 10 ms scan is lost.",
      terms: [
        ["TON(Cycle_Timer,600000,0)", "Free-running timer", "No conditions, so it always times. Preset 10 minutes."],
        ["MOV", "Save first", "Copies the elapsed time before the reset clears it."],
        ["RES", "Restart", "Clears the accumulator for the next barrel."],
      ],
      sim: {"watch":["Last_Cycle_ms"],"steps":[{"label":"First barrel after power-up","pulse":{"Barrel_Eye":1},"runMs":61200},{"label":"Next barrel, 61.2 s later","pulse":{"Barrel_Eye":1},"runMs":59800},{"label":"Next barrel, 59.8 s later","pulse":{"Barrel_Eye":1}}]},
      out: `First barrel after power-up  →  Last_Cycle_ms=100
Next barrel, 61.2 s later    →  Last_Cycle_ms=61190
Next barrel, 59.8 s later    →  Last_Cycle_ms=59790`,
    },
    {
      t: "Downtime accumulator",
      goal: "During the shift (In_Shift), add up the time Conveyor 3 is not running with an RTO, show it as Down_Min in minutes, and clear it at Shift_Change.",
      code: `XIC(In_Shift) XIO(Conv_Run) RTO(Down_Timer,28800000,0);
CPT(Down_Min,Down_Timer.ACC/60000.0);
XIC(Shift_Change) RES(Down_Timer);`,
      about: "An RTO keeps its time when the rung goes false, so every stop adds to the total. Dividing by 60000.0 turns milliseconds into REAL minutes. The preset is the 8-hour shift. The stop here is Conveyor 3's shift A jam, 09:08:52 to 09:13:29: 4 min 37 s, the 4.62 minutes on the Shift Handoff report. The output reads 4.6165 because the timer's first scan adds nothing, losing 10 ms; it still rounds to 4.62.",
      terms: [
        ["RTO", "Retentive timer", "Keeps its time between stops."],
        ["28800000", "8 hours", "28,800,000 ms is one 8-hour shift."],
        ["60000.0", "To minutes", "The .0 keeps the division in REAL."],
      ],
      sim: {"start":{"In_Shift":1,"Conv_Run":1},"watch":["Down_Min"],"steps":[{"label":"Jam: stopped 4 min 37 s","set":{"Conv_Run":0},"runMs":277000},{"label":"Running 10 min","set":{"Conv_Run":1},"runMs":600000},{"label":"Shift_Change pulse","pulse":{"Shift_Change":1}}]},
      out: `Jam: stopped 4 min 37 s  →  Down_Min=4.6165
Running 10 min           →  no change
Shift_Change pulse       →  Down_Min=0`,
    },
    {
      t: "Horn before start",
      goal: "Conveyor 3 states in ladder: idle (3) goes to warning (4) on Start_PB; warning sounds Start_Horn and goes to running (1) when Horn_Timer (3 s) is done; running goes to idle on Stop_Pressed. Any other value goes to idle.",
      code: `EQU(Conv_State,1) XIC(Stop_Pressed) MOV(3,Conv_State);
EQU(Conv_State,4) XIC(Horn_Timer.DN) MOV(1,Conv_State);
EQU(Conv_State,3) XIC(Start_PB) MOV(4,Conv_State);
NEQ(Conv_State,1) NEQ(Conv_State,3) NEQ(Conv_State,4) MOV(3,Conv_State);
EQU(Conv_State,4) TON(Horn_Timer,3000,0);
EQU(Conv_State,4) OTE(Start_Horn);
EQU(Conv_State,1) OTE(Conv_Run);`,
      about: "The Structured Text horn lesson, in ladder. Each transition is one rung: an EQU picks the state, the condition follows, and a MOV writes the next state. The rungs run in reverse order of the sequence, so a state entered on one rung is not acted on by a later rung in the same scan. The output matches the Structured Text version exactly.",
      terms: [
        ["EQU", "EQU(state, n)", "True while the machine is in state n."],
        ["MOV", "MOV(n, state)", "Moves the machine to state n."],
        ["NEQ", "Safe default", "Any unexpected value goes to idle."],
      ],
      sim: {"scene":"conveyor3","watch":["Conv_State","Start_Horn","Conv_Run"],"steps":[{"label":"Press and release Start_PB","pulse":{"Start_PB":1}},{"label":"3 s later","runMs":3100},{"label":"Press and release Stop_Pressed","pulse":{"Stop_Pressed":1}}],"sameAs":"structured-text/Warning horn before start"},
      out: `Press and release Start_PB      →  Conv_State=4  →  Start_Horn=1
3 s later                       →  Conv_State=1  →  Start_Horn=0  →  Conv_Run=1
Press and release Stop_Pressed  →  Conv_State=3  →  Conv_Run=0`,
    },
    {
      t: "Preset from a recipe",
      goal: "When Recipe_Load is pressed, copy Trailer_Qty into Load_Count.PRE. Count Barrel_Loaded with Load_Count and turn on Trailer_Full when it is done.",
      code: `XIC(Recipe_Load) MOV(Trailer_Qty,Load_Count.PRE);
XIC(Barrel_Loaded) CTU(Load_Count,48,0);
XIC(Load_Count.DN) OTE(Trailer_Full);`,
      about: "The preset typed into an instruction is only its starting value; .PRE is a tag member the program can change. Writing it from a recipe lets one routine serve a full trailer and a half load. 48 barrels per trailer is illustrative. Change the preset only between loads: lowering it below the count sets the done bit at once.",
      terms: [
        ["Load_Count.PRE", ".PRE", "The counter's preset, which the program can write."],
        ["Trailer_Qty", "Recipe value", "How many barrels this load needs."],
      ],
      sim: {"types":{"Trailer_Qty":"DINT"},"start":{"Trailer_Qty":48},"watch":["Load_Count.PRE","Load_Count.ACC","Trailer_Full"],"steps":[{"label":"Half-load recipe: 24","set":{"Trailer_Qty":24},"pulse":{"Recipe_Load":1}},{"label":"24 barrels loaded","pulse":{"Barrel_Loaded":1},"runMs":600,"repeat":24}]},
      out: `Half-load recipe: 24  →  Load_Count.PRE=24
24 barrels loaded     →  Load_Count.ACC=24  →  Trailer_Full=1`,
    },
    {
      t: "Save, then clear",
      goal: "Count barrels at Barrel_Eye in Barrel_Count. On Shift_Change, copy the count into Last_Shift_Barrels and then reset the counter.",
      code: `XIC(Barrel_Eye) CTU(Barrel_Count,9999,0);
XIC(Shift_Change) ONS(Shift_ONS) BST MOV(Barrel_Count.ACC,Last_Shift_Barrels) NXB RES(Barrel_Count) BND;`,
      about: "Clearing a count at shift change loses it unless something saves it first. The legs of an output branch run top to bottom, so MOV copies 352, Conveyor 3's shift A count, before RES clears it. Swap the legs and Last_Shift_Barrels is always 0. The ONS keeps a long Shift_Change signal from saving 0 on the next scan.",
      terms: [
        ["MOV", "Save", "Copies the count before it is cleared."],
        ["RES", "Clear", "Resets the counter for the new shift."],
        ["ONS", "Once", "Saves only on the first scan of Shift_Change."],
      ],
      sim: {"watch":["Barrel_Count.ACC","Last_Shift_Barrels"],"steps":[{"label":"Shift A: 352 barrels","pulse":{"Barrel_Eye":1},"runMs":600,"repeat":352},{"label":"Shift_Change held 2 s","pulse":{"Shift_Change":1},"pulseMs":2000,"runMs":2500}]},
      out: `Shift A: 352 barrels   →  Barrel_Count.ACC=352
Shift_Change held 2 s  →  Last_Shift_Barrels=352  →  Barrel_Count.ACC=0`,
    },
    {
      t: "Scale a 4-20 mA signal",
      goal: "Convert Air_mA (4 to 20 mA) into Hoop1_Air_PSI on a 0 to 150 psi range, and set Air_Signal_Fault below 3.6 mA.",
      code: `CPT(Hoop1_Air_PSI,(Air_mA-4.0)*150.0/16.0);
LES(Air_mA,3.6) OTE(Air_Signal_Fault);`,
      about: "A 4-20 mA transmitter sends 4 mA at the bottom of its range and 20 mA at the top, so the span is 16 mA. Starting at 4 instead of 0 means a broken wire, 0 mA, is clearly not a real reading. Below 3.6 mA is the usual failure limit (NAMUR NE 43). The 0 to 150 psi range is illustrative; use the transmitter's nameplate.",
      terms: [
        ["16.0", "Span", "20 mA − 4 mA."],
        ["150.0", "Range", "psi at 20 mA."],
        ["3.6", "Failure limit", "Below this the signal is not a real reading."],
      ],
      sim: {"types":{"Air_mA":"REAL"},"start":{"Air_mA":4},"watch":["Hoop1_Air_PSI","Air_Signal_Fault"],"steps":[{"label":"12.0 mA","set":{"Air_mA":12}},{"label":"13.6 mA","set":{"Air_mA":13.6}},{"label":"20.0 mA","set":{"Air_mA":20}},{"label":"Wire breaks: 0 mA","set":{"Air_mA":0}}]},
      out: `12.0 mA            →  Hoop1_Air_PSI=75
13.6 mA            →  Hoop1_Air_PSI=90
20.0 mA            →  Hoop1_Air_PSI=150
Wire breaks: 0 mA  →  Hoop1_Air_PSI=-37.5  →  Air_Signal_Fault=1`,
    },
    {
      t: "OEE in ladder",
      goal: "Compute OEE_Pct from Availability, Performance and Quality, and set World_Class at 85% or more.",
      code: `CPT(OEE_Pct,Availability*Performance*Quality*100.0);
GEQ(OEE_Pct,85.0) OTE(World_Class);`,
      about: "The same formula as every Foundations lane, here in the controller. Hoop Driver 1's week, 0.988 × 0.749 × 0.985, gives 72.9%. The REAL shows 72.89118, where the other lanes round to one decimal when they print. A Logix REAL holds about 7 significant digits, which is plenty for a percentage. The second step asks what performance of 0.875 would do.",
      terms: [
        ["CPT", "CPT", "Computes a whole expression in one instruction."],
        ["GEQ", "GEQ(OEE_Pct, 85.0)", "85% is the usual world-class benchmark."],
      ],
      sim: {"types":{"Availability":"REAL","Performance":"REAL","Quality":"REAL"},"watch":["OEE_Pct","World_Class"],"steps":[{"label":"Hoop Driver 1: 0.988, 0.749, 0.985","set":{"Availability":0.988,"Performance":0.749,"Quality":0.985}},{"label":"Performance 0.875","set":{"Performance":0.875}}]},
      out: `Hoop Driver 1: 0.988, 0.749, 0.985  →  OEE_Pct=72.89118
Performance 0.875                   →  OEE_Pct=85.15325  →  World_Class=1`,
    },
    {
      t: "Barrels behind target",
      goal: "Compute Target_Now as Run_Minutes × Ideal_Rate ÷ 60, Behind as Target_Now minus Barrels, and light Behind_Lamp when more than 10 barrels behind.",
      code: `CPT(Target_Now,Run_Minutes*Ideal_Rate/60.0);
SUB(Target_Now,Barrels,Behind);
GRT(Behind,10.0) OTE(Behind_Lamp);`,
      about: "A board that shows how far behind the line is right now gets a reaction during the shift, not after it. Conveyor 3's ideal is 60 per hour, one barrel a minute. At the end of shift A, 450 paid minutes and 352 barrels, it is 98 behind, the same gap as 78.2% of target. The 10-barrel threshold is illustrative.",
      terms: [
        ["Target_Now", "Target so far", "What the ideal rate would have made by now."],
        ["SUB", "SUB(a, b, dest)", "dest = a − b."],
        ["GRT", "GRT(Behind, 10.0)", "More than 10 behind lights the lamp."],
      ],
      sim: {"types":{"Run_Minutes":"DINT","Ideal_Rate":"DINT","Barrels":"DINT"},"start":{"Ideal_Rate":60},"watch":["Target_Now","Behind","Behind_Lamp"],"steps":[{"label":"2 h in, 114 barrels","set":{"Run_Minutes":120,"Barrels":114}},{"label":"4 h in, 196 barrels","set":{"Run_Minutes":240,"Barrels":196}},{"label":"End of shift: 450 min, 352 barrels","set":{"Run_Minutes":450,"Barrels":352}}]},
      out: `2 h in, 114 barrels                 →  Target_Now=120  →  Behind=6
4 h in, 196 barrels                 →  Target_Now=240  →  Behind=44  →  Behind_Lamp=1
End of shift: 450 min, 352 barrels  →  Target_Now=450  →  Behind=98`,
    },
    {
      t: "Speed deadband",
      goal: "Set Speed_Error to Speed_SP minus Speed_PV, and Speed_Alarm when the error is outside -2.0 to 2.0.",
      code: `SUB(Speed_SP,Speed_PV,Speed_Error);
LIM(-2.0,Speed_Error,2.0) OTE(In_Band);
XIO(In_Band) OTE(Speed_Alarm);`,
      about: "Logix ladder has an ABS instruction too, but LIM tests the band in one step: true while the error is between -2.0 and 2.0, ends included. The alarm is simply not in band. This is the Structured Text ABS lesson, and the output matches it exactly: ABS(error) > 2.0 and outside -2.0 to 2.0 are the same test.",
      terms: [
        ["LIM", "LIM(low, value, high)", "True while value is between low and high, inclusive."],
        ["In_Band", "In band", "Error within ±2.0."],
      ],
      sim: {"types":{"Speed_SP":"REAL","Speed_PV":"REAL"},"start":{"Speed_SP":60,"Speed_PV":60},"watch":["Speed_Error","Speed_Alarm"],"steps":[{"label":"Runs at 58.5","set":{"Speed_PV":58.5}},{"label":"Slows to 57.5","set":{"Speed_PV":57.5}},{"label":"Overspeeds to 62.5","set":{"Speed_PV":62.5}},{"label":"Settles at 61.0","set":{"Speed_PV":61}}],"sameAs":"structured-text/ABS for a deadband"},
      out: `Runs at 58.5        →  Speed_Error=1.5
Slows to 57.5       →  Speed_Error=2.5  →  Speed_Alarm=1
Overspeeds to 62.5  →  Speed_Error=-2.5
Settles at 61.0     →  Speed_Error=-1  →  Speed_Alarm=0`,
    },
    {
      t: "State lamps",
      goal: "Light Green_Lamp when Conv_State is 1 (running), Red_Lamp when it is 2 (jammed) and Amber_Lamp when it is 3 (idle).",
      code: `EQU(Conv_State,1) OTE(Green_Lamp);
EQU(Conv_State,2) OTE(Red_Lamp);
EQU(Conv_State,3) OTE(Amber_Lamp);`,
      about: "One state number drives every lamp, so the lamps can never disagree with each other. An unexpected value, such as 0 before the state logic has run, lights nothing, which is itself a clue. Lamp colors are a site standard; these are common choices.",
      terms: [
        ["EQU", "EQU(Conv_State, n)", "True while the state equals n."],
        ["Conv_State", "State code", "1 running, 2 jammed, 3 idle, as in the PLC track."],
      ],
      sim: {"types":{"Conv_State":"DINT"},"watch":["Green_Lamp","Red_Lamp","Amber_Lamp"],"steps":[{"label":"Conv_State = 3","set":{"Conv_State":3}},{"label":"Conv_State = 1","set":{"Conv_State":1}},{"label":"Conv_State = 2","set":{"Conv_State":2}},{"label":"Conv_State = 0","set":{"Conv_State":0}}]},
      out: `Conv_State = 3  →  Amber_Lamp=1
Conv_State = 1  →  Green_Lamp=1  →  Amber_Lamp=0
Conv_State = 2  →  Green_Lamp=0  →  Red_Lamp=1
Conv_State = 0  →  Red_Lamp=0`,
    },
    {
      t: "Clamp a setpoint",
      goal: "Copy Operator_SP into Speed_SP, then limit Speed_SP to between 20 and 60 barrels per hour.",
      code: `MOV(Operator_SP,Speed_SP);
GRT(Speed_SP,60.0) MOV(60.0,Speed_SP);
LES(Speed_SP,20.0) MOV(20.0,Speed_SP);`,
      about: "The Structured Text clamp in ladder: copy the operator's number, then overwrite it if it is out of range. The two limit rungs come after the copy, so the last write in the scan wins and nothing outside 20 to 60 is ever used. The output matches the Structured Text version exactly.",
      terms: [
        ["GRT", "Upper limit", "Above 60 becomes 60."],
        ["LES", "Lower limit", "Below 20 becomes 20."],
      ],
      sim: {"types":{"Operator_SP":"REAL"},"watch":["Speed_SP"],"steps":[{"label":"Operator enters 45","set":{"Operator_SP":45}},{"label":"Operator enters 75","set":{"Operator_SP":75}},{"label":"Operator enters 5","set":{"Operator_SP":5}}],"sameAs":"structured-text/Clamp a setpoint"},
      out: `Operator enters 45  →  Speed_SP=45
Operator enters 75  →  Speed_SP=60
Operator enters 5   →  Speed_SP=20`,
    },
    {
      t: "Hysteresis",
      goal: "Latch Hoop1_Low_Air below 80 psi and unlatch it above 85 psi; between them, leave it alone.",
      code: `LES(Hoop1_Air_PSI,80.0) OTL(Hoop1_Low_Air);
GRT(Hoop1_Air_PSI,85.0) OTU(Hoop1_Low_Air);`,
      about: "OTL and OTU do nothing on a false rung, so between 80 and 85 neither rung writes and the bit keeps its state. That gap is the deadband that stops a reading hovering at 80 from flooding the alarm log. The output matches the Structured Text version exactly.",
      terms: [
        ["OTL", "Set below 80", "Latches the alarm."],
        ["OTU", "Clear above 85", "Unlatches it."],
      ],
      sim: {"types":{"Hoop1_Air_PSI":"REAL","Hoop1_Low_Air":"BOOL"},"start":{"Hoop1_Air_PSI":92},"scene":"air1","watch":["Hoop1_Low_Air"],"steps":[{"label":"Drops to 79 psi","set":{"Hoop1_Air_PSI":79}},{"label":"Recovers to 82 psi","set":{"Hoop1_Air_PSI":82}},{"label":"Recovers to 86 psi","set":{"Hoop1_Air_PSI":86}},{"label":"Sags to 82 psi","set":{"Hoop1_Air_PSI":82}}],"sameAs":"structured-text/Hysteresis"},
      out: `Drops to 79 psi     →  Hoop1_Low_Air=1
Recovers to 82 psi  →  no change
Recovers to 86 psi  →  Hoop1_Low_Air=0
Sags to 82 psi      →  no change`,
    },
    {
      t: "Speed by mode",
      goal: "Set Speed_SP to 30.0 in mode 1 (thread), 60.0 in mode 2 (production) and 45.0 in mode 3 (reduced). Any other mode sets 0.0.",
      code: `EQU(Speed_Mode,1) MOV(30.0,Speed_SP);
EQU(Speed_Mode,2) MOV(60.0,Speed_SP);
EQU(Speed_Mode,3) MOV(45.0,Speed_SP);
LIM(1,Speed_Mode,3) OTE(Mode_Valid);
XIO(Mode_Valid) MOV(0.0,Speed_SP);`,
      about: "A selector switch or HMI picks a mode and each mode has its own setpoint. Production is Conveyor 3's ideal of 60 barrels per hour; the other two are illustrative. MOV does nothing on a false rung, so without the last rung an unexpected mode would leave the old speed in place. Mode_Valid turns that into a deliberate 0.",
      terms: [
        ["MOV", "One setpoint per mode", "Only the rung for the current mode writes."],
        ["Mode_Valid", "Known mode", "True for modes 1 to 3."],
        ["0.0", "Safe default", "Unknown mode stops the conveyor."],
      ],
      sim: {"types":{"Speed_Mode":"DINT","Speed_SP":"REAL"},"start":{"Speed_Mode":2},"watch":["Speed_SP"],"steps":[{"label":"Mode 1: thread","set":{"Speed_Mode":1}},{"label":"Mode 3: reduced","set":{"Speed_Mode":3}},{"label":"Mode 7: unexpected","set":{"Speed_Mode":7}},{"label":"Mode 2: production","set":{"Speed_Mode":2}}]},
      out: `Mode 1: thread      →  Speed_SP=30
Mode 3: reduced     →  Speed_SP=45
Mode 7: unexpected  →  Speed_SP=0
Mode 2: production  →  Speed_SP=60`,
    },
    {
      t: "State machine with MOV and EQU",
      goal: "Conveyor 3 from Conv_State, as the Structured Text CASE lesson: idle (3) to running (1) on Start_PB with no jam; running to idle on Stop_Pressed or faulted (2) on Jam_Fault; faulted to idle when the jam clears; any other value to idle. Work in Next_State and copy it at the end.",
      code: `MOV(Conv_State,Next_State);
EQU(Conv_State,3) XIC(Start_PB) XIO(Jam_Fault) MOV(1,Next_State);
EQU(Conv_State,1) BST XIC(Stop_Pressed) MOV(3,Next_State) NXB XIO(Stop_Pressed) XIC(Jam_Fault) MOV(2,Next_State) BND;
EQU(Conv_State,2) XIO(Jam_Fault) MOV(3,Next_State);
NEQ(Conv_State,1) NEQ(Conv_State,2) NEQ(Conv_State,3) MOV(3,Next_State);
MOV(Next_State,Conv_State);
EQU(Conv_State,1) OTE(Conv_Run);`,
      about: "The ladder trap: rungs see each other's writes in the same scan, so a machine can move through two states in one scan, and a state it passes through for no time at all never gets to act. A CASE runs one branch per scan. Every rung here tests the state as it was at the start of the scan and writes Next_State, copied once at the end, so the ladder also takes one step per scan. The output matches the CASE exactly.",
      terms: [
        ["Next_State", "Next state", "Every transition writes here, not to Conv_State."],
        ["MOV(Next_State,Conv_State)", "Apply once", "The new state takes effect once, at the end."],
        ["NEQ", "Safe default", "Unexpected values go to idle."],
      ],
      sim: {"watch":["Conv_State","Conv_Run"],"steps":[{"label":"Press and release Start_PB","pulse":{"Start_PB":1}},{"label":"Jam_Fault on","set":{"Jam_Fault":1}},{"label":"Jam_Fault cleared","set":{"Jam_Fault":0}},{"label":"Press and release Start_PB","pulse":{"Start_PB":1}},{"label":"Press and release Stop_Pressed","pulse":{"Stop_Pressed":1}}],"sameAs":"structured-text/State machine with CASE"},
      out: `Press and release Start_PB      →  Conv_State=1  →  Conv_Run=1
Jam_Fault on                    →  Conv_State=2  →  Conv_Run=0
Jam_Fault cleared               →  Conv_State=3
Press and release Start_PB      →  Conv_State=1  →  Conv_Run=1
Press and release Stop_Pressed  →  Conv_State=3  →  Conv_Run=0`,
    },
    {
      t: "First-out fault",
      goal: "While First_Fault is 0, record the first active fault: 1 e-stop, 2 low air, 3 jam. Clear it on Reset_PB only when no fault is active.",
      code: `EQU(First_Fault,0) BST XIC(Estop_Active) MOV(1,First_Fault) NXB XIO(Estop_Active) XIC(Low_Air) MOV(2,First_Fault) NXB XIO(Estop_Active) XIO(Low_Air) XIC(Jam_Fault) MOV(3,First_Fault) BND;
XIC(Reset_PB) XIO(Estop_Active) XIO(Low_Air) XIO(Jam_Fault) MOV(0,First_Fault);`,
      about: "The EQU in front is checked once, before the branch, so every leg sees First_Fault as 0 and only one fault can be recorded. The XIO contacts give the priority: low air counts only without an e-stop, a jam only without either. The output matches the Structured Text version exactly.",
      terms: [
        ["EQU(First_Fault,0)", "Record once", "Only an empty first-out is filled."],
        ["XIO(Estop_Active)", "Priority", "A lower-priority leg needs the higher faults off."],
      ],
      sim: {"watch":["First_Fault"],"steps":[{"label":"Low air","set":{"Low_Air":1}},{"label":"Then a jam","set":{"Jam_Fault":1}},{"label":"Reset_PB with faults still active","pulse":{"Reset_PB":1}},{"label":"Faults cleared, then Reset_PB","set":{"Low_Air":0,"Jam_Fault":0},"pulse":{"Reset_PB":1}}],"sameAs":"structured-text/First-out fault"},
      out: `Low air                            →  First_Fault=2
Then a jam                         →  no change
Reset_PB with faults still active  →  no change
Faults cleared, then Reset_PB      →  First_Fault=0`,
    },
    {
      t: "Alarm with acknowledge",
      goal: "When Low_Air comes on, latch Alarm_Unacked until Ack_PB. Keep Alarm_Active equal to Low_Air. Sound Horn while unacknowledged; light Alarm_Lamp while active or unacknowledged.",
      code: `XIC(Low_Air) XIO(Alarm_Active) OTL(Alarm_Unacked);
XIC(Low_Air) OTE(Alarm_Active);
XIC(Ack_PB) OTU(Alarm_Unacked);
XIC(Alarm_Unacked) OTE(Horn);
BST XIC(Alarm_Active) NXB XIC(Alarm_Unacked) BND OTE(Alarm_Lamp);`,
      about: "The first rung reads Alarm_Active before the second rung updates it, so it means \"low air now, but not last scan\": a new alarm. An alarm that comes and goes before anyone looks still waits for acknowledgement. The output matches the Structured Text version exactly.",
      terms: [
        ["XIO(Alarm_Active)", "New alarm", "Last scan's value, read before it is updated."],
        ["Ack_PB", "Acknowledge", "Silences the horn; the lamp stays while low air remains."],
      ],
      sim: {"types":{"Alarm_Unacked":"BOOL","Horn":"BOOL"},"watch":["Alarm_Unacked","Horn","Alarm_Lamp"],"steps":[{"label":"Low air","set":{"Low_Air":1}},{"label":"Operator acknowledges","pulse":{"Ack_PB":1}},{"label":"Low air clears","set":{"Low_Air":0}},{"label":"Low air comes and goes, nobody looks","pulse":{"Low_Air":1}},{"label":"Operator acknowledges","pulse":{"Ack_PB":1}}],"sameAs":"structured-text/Alarm with acknowledge"},
      out: `Low air                               →  Alarm_Unacked=1  →  Horn=1  →  Alarm_Lamp=1
Operator acknowledges                 →  Alarm_Unacked=0  →  Horn=0
Low air clears                        →  Alarm_Lamp=0
Low air comes and goes, nobody looks  →  Alarm_Unacked=1  →  Horn=1  →  Alarm_Lamp=1
Operator acknowledges                 →  Alarm_Unacked=0  →  Horn=0  →  Alarm_Lamp=0`,
    },
    {
      t: "Hand, off, auto",
      goal: "With Mode 1 (hand), run Motor while Jog_PB is held; with Mode 2 (auto), run it on Auto_Request with no Fault; any other Mode keeps it off.",
      code: `BST EQU(Mode,1) XIC(Jog_PB) NXB EQU(Mode,2) XIC(Auto_Request) XIO(Fault) BND OTE(Motor);`,
      about: "One rung with two legs, one per running mode. OTE writes 0 whenever neither leg is true, so off, and any unexpected Mode value, needs no rung of its own: the safe state is the default. The Structured Text version needs a CASE with an ELSE; the output is the same.",
      terms: [
        ["EQU(Mode,1)", "Hand leg", "Runs only while the jog button is held."],
        ["EQU(Mode,2)", "Auto leg", "Runs on request with no fault."],
        ["OTE", "Off by default", "No true leg writes 0."],
      ],
      sim: {"types":{"Motor":"BOOL","Jog_PB":"BOOL"},"watch":["Motor"],"steps":[{"label":"Off: Jog_PB held","set":{"Jog_PB":1}},{"label":"Hand, Jog_PB still held","set":{"Mode":1}},{"label":"Jog_PB released","set":{"Jog_PB":0}},{"label":"Auto with a request","set":{"Mode":2,"Auto_Request":1}},{"label":"Fault","set":{"Fault":1}}],"sameAs":"structured-text/Hand, off, auto"},
      out: `Off: Jog_PB held         →  no change
Hand, Jog_PB still held  →  Motor=1
Jog_PB released          →  Motor=0
Auto with a request      →  Motor=1
Fault                    →  Motor=0`,
    },
    {
      t: "Jam lockout as states",
      goal: "Conveyor 3 as states, as the Structured Text lesson: idle (3) to running (1) on Start_PB; running to faulted (2) after 4 s of Eye_Blocked (Jam_Timer) or to idle on Stop_Pressed; faulted to idle only on Reset_PB with the eye clear. Conv_Run and Jam_Fault come from the state.",
      code: `EQU(Conv_State,1) XIC(Eye_Blocked) TON(Jam_Timer,4000,0);
MOV(Conv_State,Next_State);
EQU(Conv_State,1) BST XIC(Jam_Timer.DN) MOV(2,Next_State) NXB XIO(Jam_Timer.DN) XIC(Stop_Pressed) MOV(3,Next_State) BND;
EQU(Conv_State,2) XIC(Reset_PB) XIO(Eye_Blocked) MOV(3,Next_State);
EQU(Conv_State,3) XIC(Start_PB) MOV(1,Next_State);
LIM(1,Conv_State,3) OTE(State_Valid);
XIO(State_Valid) MOV(3,Next_State);
MOV(Next_State,Conv_State);
EQU(Conv_State,1) OTE(Conv_Run);
EQU(Conv_State,2) OTE(Jam_Fault);`,
      about: "The whole jam cell as a ladder state machine, with Next_State applied once at the end. The fault needs no latch: being in state 2 is the fault, and only a reset with a clear eye leaves it. Run it in the simulator, jam a barrel, try Reset with the barrel still there, and watch the state readout. The output matches the Structured Text version exactly.",
      terms: [
        ["Jam_Timer", "Jam timer", "Times only while running with the eye blocked."],
        ["State_Valid", "Known state", "LIM catches anything outside 1 to 3."],
        ["Jam_Fault", "Fault from state", "On only in state 2."],
      ],
      sim: {"scene":"conveyor3","watch":["Conv_State","Conv_Run","Jam_Fault"],"steps":[{"label":"Press and release Start_PB","pulse":{"Start_PB":1}},{"label":"Eye blocked 4 s","set":{"Eye_Blocked":1},"runMs":4100},{"label":"Reset_PB while eye still blocked","pulse":{"Reset_PB":1}},{"label":"Eye cleared, then Reset_PB","set":{"Eye_Blocked":0},"pulse":{"Reset_PB":1}}],"sameAs":"structured-text/Jam lockout as states"},
      out: `Press and release Start_PB        →  Conv_State=1  →  Conv_Run=1
Eye blocked 4 s                   →  Conv_State=2  →  Conv_Run=0  →  Jam_Fault=1
Reset_PB while eye still blocked  →  no change
Eye cleared, then Reset_PB        →  Conv_State=3  →  Jam_Fault=0`,
    },
    {
      t: "Flame-failure lockout",
      goal: "Char Station 2: purge 5 s (Purge_Timer) before Char2_Burner_On. If Flame_OK is off for 1 s while burning (Flame_Fail_Timer), latch Flame_Lockout, which stops the burner and can only be reset with Char2_Start off. Run the fan while started, during the 30 s post-purge, and during a lockout.",
      code: `XIC(Char2_Start) XIO(Flame_Lockout) TON(Purge_Timer,5000,0);
XIC(Purge_Timer.DN) OTE(Char2_Burner_On);
XIC(Char2_Burner_On) XIO(Flame_OK) TON(Flame_Fail_Timer,1000,0);
XIC(Flame_Fail_Timer.DN) OTL(Flame_Lockout);
XIC(Reset_PB) XIO(Char2_Start) OTU(Flame_Lockout);
XIC(Char2_Burner_On) TOF(Post_Purge,30000,0);
BST XIC(Char2_Start) NXB XIC(Post_Purge.DN) NXB XIC(Flame_Lockout) BND OTE(Char2_Exhaust_Fan);`,
      about: "If the flame goes out while gas still flows, unburned gas builds up in the char chamber. A lockout stops the burner and holds it off. Requiring Start to be off before reset means the next light-off begins with a fresh 5 s purge. The 1 s and 5 s times are illustrative; real burners are protected by a certified burner management system, not by a teaching rung.",
      terms: [
        ["Flame_Fail_Timer", "Flame failure", "Flame lost for 1 s while burning."],
        ["Flame_Lockout", "Lockout", "Latched; blocks the purge timer, so the burner cannot relight."],
        ["XIO(Char2_Start)", "Reset rule", "Reset only works with Start off, forcing a new purge."],
      ],
      sim: {"start":{"Flame_OK":1},"scene":"char2","watch":["Char2_Burner_On","Flame_Lockout","Char2_Exhaust_Fan"],"steps":[{"label":"Char2_Start on, 5 s purge","set":{"Char2_Start":1},"runMs":5100},{"label":"Flame lost for 1 s","set":{"Flame_OK":0},"runMs":1100},{"label":"Flame_OK back, Start still on","set":{"Flame_OK":1}},{"label":"Reset_PB with Start on","pulse":{"Reset_PB":1}},{"label":"Start off, then Reset_PB","set":{"Char2_Start":0},"pulse":{"Reset_PB":1}},{"label":"Start on again, 5 s purge","set":{"Char2_Start":1},"runMs":5100}]},
      out: `Char2_Start on, 5 s purge      →  Char2_Exhaust_Fan=1  →  Char2_Burner_On=1
Flame lost for 1 s             →  Flame_Lockout=1  →  Char2_Burner_On=0
Flame_OK back, Start still on  →  no change
Reset_PB with Start on         →  no change
Start off, then Reset_PB       →  Flame_Lockout=0
Start on again, 5 s purge      →  Char2_Burner_On=1`,
    },
    {
      t: "Auto-restart after low air",
      goal: "Hoop Driver 1: latch Hoop1_Low_Air after 2 s below 80 psi and clear it at 85 psi or more. If the machine was running when low air tripped, restart it 5 s after the air recovers. Stop_PB (wired normally closed) cancels the restart.",
      code: `LES(Hoop1_Air_PSI,80.0) TON(Low_Air_Timer,2000,0);
XIC(Low_Air_Timer.DN) OTL(Hoop1_Low_Air);
GEQ(Hoop1_Air_PSI,85.0) OTU(Hoop1_Low_Air);
XIC(Hoop1_Low_Air) XIC(Hoop1_Run) OTL(Restart_Pending);
XIO(Stop_PB) OTU(Restart_Pending);
XIO(Hoop1_Low_Air) XIC(Restart_Pending) TON(Restart_Timer,5000,0);
XIC(Restart_Timer.DN) OTU(Restart_Pending);
BST XIC(Start_PB) NXB XIC(Restart_Timer.DN) NXB XIC(Hoop1_Run) BND XIC(Stop_PB) XIO(Hoop1_Low_Air) OTE(Hoop1_Run);`,
      about: "A short air dip should not need an operator to restart the machine, but only a machine that was running should restart. Restart_Pending remembers that: it latches on the scan low air trips, before the run rung drops Hoop1_Run. Automatic restart is a safety decision: use it only where the risk assessment allows, usually with a warning horn first.",
      terms: [
        ["Restart_Pending", "Was running", "Latched when low air stops a running machine."],
        ["Restart_Timer", "Recovery delay", "5 s of good air before the restart."],
        ["XIO(Stop_PB)", "Operator wins", "A stop cancels any pending restart."],
      ],
      sim: {"types":{"Hoop1_Air_PSI":"REAL"},"start":{"Stop_PB":1,"Hoop1_Air_PSI":92},"scene":"air1","watch":["Hoop1_Low_Air","Restart_Pending","Hoop1_Run"],"steps":[{"label":"Press and release Start_PB","pulse":{"Start_PB":1}},{"label":"Air drops to 70 psi for 3 s","set":{"Hoop1_Air_PSI":70},"runMs":3000},{"label":"Air back to 92 psi for 6 s","set":{"Hoop1_Air_PSI":92},"runMs":6000},{"label":"Press and release Stop_PB","pulse":{"Stop_PB":0}},{"label":"Air drops to 70 psi for 3 s","set":{"Hoop1_Air_PSI":70},"runMs":3000},{"label":"Air back to 92 psi for 6 s","set":{"Hoop1_Air_PSI":92},"runMs":6000}]},
      out: `Press and release Start_PB   →  Hoop1_Run=1
Air drops to 70 psi for 3 s  →  Hoop1_Low_Air=1  →  Restart_Pending=1  →  Hoop1_Run=0
Air back to 92 psi for 6 s   →  Hoop1_Low_Air=0  →  Restart_Pending=0  →  Hoop1_Run=1
Press and release Stop_PB    →  Hoop1_Run=0
Air drops to 70 psi for 3 s  →  Hoop1_Low_Air=1
Air back to 92 psi for 6 s   →  Hoop1_Low_Air=0`,
    },
    {
      t: "Clamp before you press",
      goal: "Hoop Driver 1 by hand: Clamp_PB seals in Clamp_Cmd while a barrel is in place; Unclamp_PB releases it only with the press up. Press_Extend runs only while Press_PB is held with the clamp closed and a hoop fed.",
      code: `BST XIC(Clamp_PB) NXB XIC(Clamp_Cmd) BND XIC(Barrel_In_Place) BST XIO(Unclamp_PB) NXB XIO(Press_Up) BND OTE(Clamp_Cmd);
XIC(Press_PB) XIC(Clamp_Closed) XIC(Hoop_Fed) OTE(Press_Extend);`,
      about: "Interlocks make the wrong order impossible: the press cannot come down on a barrel that is not clamped, or with no hoop to drive, and the clamp cannot open while the press is down. The unclamp branch passes power when Unclamp_PB is not pressed OR the press is not up, so pressing Unclamp_PB breaks the seal only with the press at the top. Press_PB is hold-to-run: release it and the press stops extending. The simulator's press scene drives the sensors; its travel times are compressed and illustrative (a real cycle at 55 barrels/hr takes about 65 s).",
      terms: [
        ["Clamp_Cmd", "Seal-in", "Clamp_PB starts it; the contact on its own output keeps it on."],
        ["XIO(Press_Up)", "Unclamp interlock", "Unclamp_PB is ignored while the press is away from the top."],
        ["Press_PB", "Hold to run", "The press extends only while the button is held."],
      ],
      sim: {"start":{"Barrel_In_Place":1,"Hoop_Fed":1,"Press_Up":1},"watch":["Clamp_Cmd","Press_Extend"],"steps":[{"label":"Press_PB before clamping","pulse":{"Press_PB":1}},{"label":"Press and release Clamp_PB","pulse":{"Clamp_PB":1}},{"label":"Clamp closes; hold Press_PB","set":{"Clamp_Closed":1,"Press_PB":1}},{"label":"Press leaves the top; Unclamp_PB","set":{"Press_Up":0},"pulse":{"Unclamp_PB":1}},{"label":"Release Press_PB; press back up","set":{"Press_PB":0,"Press_Up":1}},{"label":"Unclamp_PB with the press up","pulse":{"Unclamp_PB":1}}],"scene":"hoop1"},
      out: `Press_PB before clamping          →  no change
Press and release Clamp_PB        →  Clamp_Cmd=1
Clamp closes; hold Press_PB       →  Press_Extend=1
Press leaves the top; Unclamp_PB  →  no change
Release Press_PB; press back up   →  Press_Extend=0
Unclamp_PB with the press up      →  Clamp_Cmd=0`,
    },
    {
      t: "Press step sequence",
      goal: "Run Hoop Driver 1 as a step sequence in Step: 0 idle until Auto with a barrel in place and a hoop fed; 10 clamp until Clamp_Closed; 20 press until Press_Down; 30 return until Press_Up; 40 unclamp until the clamp is open and the barrel gone, then 0. Clamp_Cmd is on in steps 10 to 30, Press_Extend in step 20.",
      code: `EQU(Step,0) XIC(Auto) XIC(Barrel_In_Place) XIC(Hoop_Fed) MOV(10,Step);
EQU(Step,10) XIC(Clamp_Closed) MOV(20,Step);
EQU(Step,20) XIC(Press_Down) MOV(30,Step);
EQU(Step,30) XIC(Press_Up) MOV(40,Step);
EQU(Step,40) XIO(Clamp_Closed) XIO(Barrel_In_Place) MOV(0,Step);
LIM(10,Step,30) OTE(Clamp_Cmd);
EQU(Step,20) OTE(Press_Extend);`,
      about: "A step sequence is how most machines are programmed: each step turns on its outputs and waits for one sensor before moving to the next. One rung per transition: EQU checks the step, the contacts are what it waits for, MOV moves on. The outputs are written once, from the step number, so no two rungs ever fight over Clamp_Cmd. Steps go up in 10s so a step can be added later without renumbering. Rungs run top to bottom, so a sequence can pass through two steps in one scan when both waits are already met; this one never does, because each step waits for something the step before has to change. The simulator's press scene drives the sensors; its travel times are compressed and illustrative (a real cycle at 55 barrels/hr takes about 65 s).",
      terms: [
        ["EQU(Step,10)", "In step 10", "This rung only acts while the sequence is in step 10."],
        ["MOV(20,Step)", "Next step", "Moves the sequence on once the step's sensor is made."],
        ["LIM(10,Step,30)", "Steps 10 to 30", "True for any step from 10 to 30: the clamp stays on through them."],
      ],
      sim: {"start":{"Barrel_In_Place":1,"Hoop_Fed":1,"Press_Up":1},"watch":["Step","Clamp_Cmd","Press_Extend"],"steps":[{"label":"Auto on, barrel in place, hoop fed","set":{"Auto":1}},{"label":"Clamp closes","set":{"Clamp_Closed":1}},{"label":"Press leaves the top","set":{"Press_Up":0}},{"label":"Press reaches the bottom","set":{"Press_Down":1}},{"label":"Press back at the top","set":{"Press_Down":0,"Press_Up":1}},{"label":"Clamp opens; barrel rolls out","set":{"Clamp_Closed":0,"Barrel_In_Place":0}},{"label":"Next barrel arrives","set":{"Barrel_In_Place":1}}],"scene":"hoop1"},
      out: `Auto on, barrel in place, hoop fed  →  Step=10  →  Clamp_Cmd=1
Clamp closes                        →  Step=20  →  Press_Extend=1
Press leaves the top                →  no change
Press reaches the bottom            →  Step=30  →  Press_Extend=0
Press back at the top               →  Step=40  →  Clamp_Cmd=0
Clamp opens; barrel rolls out       →  Step=0
Next barrel arrives                 →  Step=10  →  Clamp_Cmd=1`,
    },
    {
      t: "Hoop misfeed fault",
      goal: "Add a misfeed fault to the press sequence: if Press_Down has not come 3 s into step 20 (Misfeed_Timer), latch Hoop_Misfeed and go to step 90, where the press retracts and the clamp holds. Reset_PB, with the press up and a hoop fed, clears the fault and retries from step 10.",
      code: `EQU(Step,0) XIC(Auto) XIC(Barrel_In_Place) XIC(Hoop_Fed) MOV(10,Step);
EQU(Step,10) XIC(Clamp_Closed) MOV(20,Step);
EQU(Step,20) XIC(Press_Down) MOV(30,Step);
EQU(Step,20) XIC(Misfeed_Timer.DN) OTL(Hoop_Misfeed) MOV(90,Step);
EQU(Step,30) XIC(Press_Up) MOV(40,Step);
EQU(Step,40) XIO(Clamp_Closed) XIO(Barrel_In_Place) MOV(0,Step);
EQU(Step,90) XIC(Reset_PB) XIC(Press_Up) XIC(Hoop_Fed) OTU(Hoop_Misfeed) MOV(10,Step);
EQU(Step,20) TON(Misfeed_Timer,3000,0);
BST LIM(10,Step,30) NXB EQU(Step,90) BND OTE(Clamp_Cmd);
EQU(Step,20) OTE(Press_Extend);`,
      about: "Every step that waits on a sensor needs a time limit, or a jam leaves the machine waiting forever with the press bearing down on a bent hoop. Hoop misfeed is one of the canonical faults in fault_log. Step 90 is a fault step: the press output is off, so the ram returns, while the clamp keeps the barrel still for the operator. The reset needs the press back up and a new hoop, so a retry starts from a known state. On the retry the clamp is still closed, so step 10 passes straight to 20 on the next scan, which is why the output shows Step=20. The timer rung sits after the step rungs, so the step that sees .DN is the scan after it was set, as in the Structured Text version. The simulator's press scene drives the sensors; its travel times are compressed and illustrative (a real cycle at 55 barrels/hr takes about 65 s).",
      terms: [
        ["Misfeed_Timer", "Step time limit", "Runs only in step 20; done at 3 s if Press_Down never came."],
        ["MOV(90,Step)", "Fault step", "Press off, clamp held, until a reset."],
        ["OTU(Hoop_Misfeed)", "Reset", "Only with the press up and a hoop fed; then retry from step 10."],
      ],
      sim: {"start":{"Barrel_In_Place":1,"Hoop_Fed":1,"Press_Up":1},"watch":["Step","Hoop_Misfeed","Clamp_Cmd","Press_Extend"],"steps":[{"label":"Auto on, barrel in place, hoop fed","set":{"Auto":1}},{"label":"Clamp closes","set":{"Clamp_Closed":1}},{"label":"Press leaves the top, stalls 3 s","set":{"Press_Up":0,"Hoop_Fed":0},"runMs":3100},{"label":"Press back at the top","set":{"Press_Up":1}},{"label":"Reset_PB with no hoop fed","pulse":{"Reset_PB":1}},{"label":"Hoop fed; Reset_PB","set":{"Hoop_Fed":1},"pulse":{"Reset_PB":1}},{"label":"Press leaves the top","set":{"Press_Up":0}},{"label":"Press reaches the bottom","set":{"Press_Down":1}}],"scene":"hoop1"},
      out: `Auto on, barrel in place, hoop fed  →  Step=10  →  Clamp_Cmd=1
Clamp closes                        →  Step=20  →  Press_Extend=1
Press leaves the top, stalls 3 s    →  Hoop_Misfeed=1  →  Step=90  →  Press_Extend=0
Press back at the top               →  no change
Reset_PB with no hoop fed           →  no change
Hoop fed; Reset_PB                  →  Hoop_Misfeed=0  →  Step=20  →  Press_Extend=1
Press leaves the top                →  no change
Press reaches the bottom            →  Step=30  →  Press_Extend=0`,
    },
    {
      t: "Three jams lock out",
      goal: "Conveyor 3: run with Start_PB and Stop_PB (normally closed), latch Jam_Fault after 4 s of a blocked eye, clear it with Reset_PB once the eye is clear. Count jams with Jam_Count; three inside 10 minutes latch Jam_Lockout, which blocks running until Super_Reset_PB. The 10-minute Jam_Window starts at the first jam and clears the count when it ends.",
      code: `BST XIC(Start_PB) NXB XIC(Conv_Run) BND XIC(Stop_PB) XIO(Jam_Fault) XIO(Jam_Lockout) OTE(Conv_Run);
XIC(Conv_Run) XIC(Eye_Blocked) TON(Jam_Timer,4000,0);
XIC(Jam_Timer.DN) OTL(Jam_Fault);
XIC(Reset_PB) XIO(Eye_Blocked) OTU(Jam_Fault);
XIC(Jam_Fault) CTU(Jam_Count,3,0);
GRT(Jam_Count.ACC,0) XIO(Jam_Lockout) TON(Jam_Window,600000,0);
XIC(Jam_Window.DN) RES(Jam_Count);
XIC(Jam_Count.DN) OTL(Jam_Lockout);
XIC(Super_Reset_PB) BST OTU(Jam_Lockout) NXB RES(Jam_Count) BND;`,
      about: "A jam that keeps coming back is not fixed by the operator pressing reset again; it needs someone to find the cause. Three jams inside ten minutes lock the cell out until a supervisor resets it. The window matters: without it, the third jam of the whole shift would lock the line, which is why the output waits ten minutes after the first jam and then counts from zero. CTU counts on the rising edge of Jam_Fault, so a fault that stays latched counts once. The 3 and 10 minutes are illustrative; the 4 s jam rule is the PLC track's.",
      terms: [
        ["Jam_Count", "Jam counter", "Counts each new jam; done at 3."],
        ["Jam_Window", "Ten-minute window", "Starts at the first jam; clears the count when it ends."],
        ["Super_Reset_PB", "Supervisor reset", "The only way out of the lockout."],
      ],
      sim: {"scanMs": 100, "start": {"Stop_PB": 1}, "types": {"Jam_Fault": "BOOL", "Jam_Lockout": "BOOL"}, "scene": "conveyor3", "watch": ["Conv_Run", "Jam_Fault", "Jam_Lockout"], "steps": [{"label": "Press and release Start_PB", "pulse": {"Start_PB": 1}}, {"label": "Eye blocked 4.5 s: a jam", "set": {"Eye_Blocked": 1}, "runMs": 4500}, {"label": "Eye cleared, Reset_PB", "set": {"Eye_Blocked": 0}, "pulse": {"Reset_PB": 1}}, {"label": "Ten minutes later", "runMs": 600100}, {"label": "Press and release Start_PB", "pulse": {"Start_PB": 1}}, {"label": "Eye blocked 4.5 s: a jam", "set": {"Eye_Blocked": 1}, "runMs": 4500}, {"label": "Eye cleared, Reset_PB", "set": {"Eye_Blocked": 0}, "pulse": {"Reset_PB": 1}}, {"label": "Press and release Start_PB", "pulse": {"Start_PB": 1}}, {"label": "Eye blocked 4.5 s: a jam", "set": {"Eye_Blocked": 1}, "runMs": 4500}, {"label": "Eye cleared, Reset_PB", "set": {"Eye_Blocked": 0}, "pulse": {"Reset_PB": 1}}, {"label": "Press and release Start_PB", "pulse": {"Start_PB": 1}}, {"label": "Eye blocked 4.5 s: a jam", "set": {"Eye_Blocked": 1}, "runMs": 4500}, {"label": "Eye cleared, Reset_PB", "set": {"Eye_Blocked": 0}, "pulse": {"Reset_PB": 1}}, {"label": "Start_PB while locked out", "pulse": {"Start_PB": 1}}, {"label": "Supervisor resets", "pulse": {"Super_Reset_PB": 1}}, {"label": "Press and release Start_PB", "pulse": {"Start_PB": 1}}]},
      out: `Press and release Start_PB  →  Conv_Run=1
Eye blocked 4.5 s: a jam    →  Jam_Fault=1  →  Conv_Run=0
Eye cleared, Reset_PB       →  Jam_Fault=0
Ten minutes later           →  no change
Press and release Start_PB  →  Conv_Run=1
Eye blocked 4.5 s: a jam    →  Jam_Fault=1  →  Conv_Run=0
Eye cleared, Reset_PB       →  Jam_Fault=0
Press and release Start_PB  →  Conv_Run=1
Eye blocked 4.5 s: a jam    →  Jam_Fault=1  →  Conv_Run=0
Eye cleared, Reset_PB       →  Jam_Fault=0
Press and release Start_PB  →  Conv_Run=1
Eye blocked 4.5 s: a jam    →  Jam_Fault=1  →  Jam_Lockout=1  →  Conv_Run=0
Eye cleared, Reset_PB       →  Jam_Fault=0
Start_PB while locked out   →  no change
Supervisor resets           →  Jam_Lockout=0
Press and release Start_PB  →  Conv_Run=1`,
    },
    {
      t: "Behind the shift target",
      goal: "Conveyor 3: count barrels in Barrel_Count while running, reset it at Shift_Change, and time the shift with Shift_Timer (7.5 h). Behind_Line is 70% of a barrel a minute so far; light Behind while the count is below it.",
      code: `BST XIC(Start_PB) NXB XIC(Conv_Run) BND XIC(Stop_PB) OTE(Conv_Run);
XIC(Conv_Run) XIC(Eye_Blocked) CTU(Barrel_Count,450,0);
XIC(Shift_Change) RES(Barrel_Count);
XIO(Shift_Change) TON(Shift_Timer,27000000,0);
CPT(Behind_Line,Shift_Timer.ACC * 0.7 / 60000.0);
LES(Barrel_Count.ACC,Behind_Line) OTE(Behind);`,
      about: "Conveyor 3's shift target is 450 barrels, 60 an hour for 7.5 paid hours: one a minute. Behind_Line grows with the shift at 70% of that pace, the same 70% line the Shift Handoff and HMI tracks use for BEHIND, so the lamp lights while the shift is happening rather than in the report afterwards. Thirty barrels in thirty minutes is on pace; after the belt stops, the line catches up with the count about 43 minutes in. The shift change resets both the count and the timer. Behind_Line is a REAL so the 0.7 and the division stay exact.",
      terms: [
        ["Shift_Timer", "Shift clock", "27,000,000 ms is 7.5 hours."],
        ["Behind_Line", "Pace line", "70% of one barrel a minute, so far this shift."],
        ["RES(Barrel_Count)", "Shift reset", "The count starts again at the shift change."],
      ],
      sim: {"scanMs": 1000, "start": {"Stop_PB": 1}, "types": {"Behind_Line": "REAL", "Behind": "BOOL"}, "scene": "conveyor3", "watch": ["Conv_Run", "Behind"], "steps": [{"label": "Press and release Start_PB", "pulse": {"Start_PB": 1}, "pulseMs": 1000}, {"label": "30 barrels, one a minute", "pulse": {"Eye_Blocked": 1}, "pulseMs": 1000, "runMs": 60000, "repeat": 30}, {"label": "Belt stopped for 20 minutes", "pulse": {"Stop_PB": 0}, "pulseMs": 1000, "runMs": 1200000}, {"label": "Shift change", "pulse": {"Shift_Change": 1}, "pulseMs": 1000}]},
      out: `Press and release Start_PB   →  Conv_Run=1
30 barrels, one a minute     →  no change
Belt stopped for 20 minutes  →  Conv_Run=0  →  Behind=1
Shift change                 →  Behind=0`,
    },
    {
      t: "Warn, then trip",
      goal: "Hoop Driver 1's air: latch Air_Warn after 1 s below 88 psi and clear it at 90 psi or more. Latch Hoop1_Low_Air after 3 s below 85 psi; Reset_PB clears it only at 90 psi or more. Hoop1_Run needs Hoop1_Auto and no low air.",
      code: `LES(Hoop1_Air_PSI,88.0) TON(Warn_Timer,1000,0);
XIC(Warn_Timer.DN) OTL(Air_Warn);
GEQ(Hoop1_Air_PSI,90.0) OTU(Air_Warn);
LES(Hoop1_Air_PSI,85.0) TON(Low_Air_Timer,3000,0);
XIC(Low_Air_Timer.DN) OTL(Hoop1_Low_Air);
XIC(Reset_PB) GEQ(Hoop1_Air_PSI,90.0) OTU(Hoop1_Low_Air);
XIC(Hoop1_Auto) XIO(Hoop1_Low_Air) OTE(Hoop1_Run);`,
      about: "A warning before the trip gives someone time to act. Two details stop it crying wolf: a 1 s delay, because every press stroke dips the header for 0.4 s, and hysteresis, because air hovering at 88 to 89 psi would otherwise switch the warning on and off every scan. The warning sets below 88 and clears only at 90; the trip clears only at 90 too, so a reset at 88 does nothing. 85 psi is the bottom of Hoop Driver 1's canonical 85 to 110 band; the 88 and 90 psi lines and the delays are illustrative.",
      terms: [
        ["Warn_Timer", "Warning delay", "Ignores dips shorter than 1 s."],
        ["GEQ(Hoop1_Air_PSI,90.0)", "Hysteresis", "Clears at 90, two psi above where it set."],
        ["Low_Air_Timer", "Trip delay", "3 s below 85 psi."],
      ],
      sim: {"types": {"Hoop1_Air_PSI": "REAL", "Air_Warn": "BOOL", "Hoop1_Low_Air": "BOOL"}, "start": {"Hoop1_Air_PSI": 92, "Hoop1_Auto": 1}, "scene": "air1", "watch": ["Air_Warn", "Hoop1_Low_Air", "Hoop1_Run"], "steps": [{"label": "Cylinder fires: 78 psi for 0.4 s", "pulse": {"Hoop1_Air_PSI": 78}, "pulseMs": 400}, {"label": "Header sags to 87 psi for 1.1 s", "set": {"Hoop1_Air_PSI": 87}, "runMs": 1100}, {"label": "Recovers to 89 psi", "set": {"Hoop1_Air_PSI": 89}}, {"label": "Back to 91 psi", "set": {"Hoop1_Air_PSI": 91}}, {"label": "Falls to 84 psi for 2 s", "set": {"Hoop1_Air_PSI": 84}, "runMs": 2000}, {"label": "84 psi for 1.1 s more", "runMs": 1100}, {"label": "Reset_PB at 88 psi", "set": {"Hoop1_Air_PSI": 88}, "pulse": {"Reset_PB": 1}}, {"label": "Air at 92 psi, then Reset_PB", "set": {"Hoop1_Air_PSI": 92}, "pulse": {"Reset_PB": 1}}]},
      out: `Cylinder fires: 78 psi for 0.4 s  →  no change
Header sags to 87 psi for 1.1 s   →  Air_Warn=1
Recovers to 89 psi                →  no change
Back to 91 psi                    →  Air_Warn=0
Falls to 84 psi for 2 s           →  Air_Warn=1
84 psi for 1.1 s more             →  Hoop1_Low_Air=1  →  Hoop1_Run=0
Reset_PB at 88 psi                →  no change
Air at 92 psi, then Reset_PB      →  Air_Warn=0  →  Hoop1_Low_Air=0  →  Hoop1_Run=1`,
    },
    {
      t: "Two trips need maintenance",
      goal: "Hoop Driver 1: latch Hoop1_Low_Air after 2 s below 85 psi; Reset_PB clears it at 85 psi or more unless Maint_Lock is on. Count trips in Trip_Count; a second trip inside an hour (Trip_Window) latches Maint_Lock, which only Maint_Reset_PB clears, with the air back.",
      code: `LES(Hoop1_Air_PSI,85.0) TON(Low_Air_Timer,2000,0);
XIC(Low_Air_Timer.DN) OTL(Hoop1_Low_Air);
XIC(Reset_PB) GEQ(Hoop1_Air_PSI,85.0) XIO(Maint_Lock) OTU(Hoop1_Low_Air);
XIC(Hoop1_Low_Air) CTU(Trip_Count,2,0);
GRT(Trip_Count.ACC,0) TON(Trip_Window,3600000,0);
XIC(Trip_Window.DN) RES(Trip_Count);
XIC(Trip_Count.DN) OTL(Maint_Lock);
XIC(Maint_Reset_PB) GEQ(Hoop1_Air_PSI,85.0) BST OTU(Maint_Lock) NXB OTU(Hoop1_Low_Air) NXB RES(Trip_Count) BND;
XIC(Hoop1_Auto) XIO(Hoop1_Low_Air) OTE(Hoop1_Run);`,
      about: "One low-air trip can be a blip; two inside an hour mean the air system has a problem, a leak or a failing compressor, and restarting again just waits for the third. So the second trip locks the reset until maintenance has looked. The Energy track found 30% of the compressed air leaking, which is exactly how trips start to repeat. The output shows a trip an hour after the first counting from zero again. The hour and the count are illustrative.",
      terms: [
        ["Trip_Count", "Trip counter", "Done at the second trip."],
        ["Trip_Window", "One hour", "Clears the count an hour after the first trip."],
        ["XIO(Maint_Lock)", "Reset blocked", "The operator's reset does nothing while locked."],
      ],
      sim: {"scanMs": 100, "types": {"Hoop1_Air_PSI": "REAL", "Hoop1_Low_Air": "BOOL", "Maint_Lock": "BOOL"}, "start": {"Hoop1_Air_PSI": 92, "Hoop1_Auto": 1}, "scene": "air1", "watch": ["Hoop1_Low_Air", "Maint_Lock", "Hoop1_Run"], "steps": [{"label": "Compressor trips: 70 psi for 2.1 s", "set": {"Hoop1_Air_PSI": 70}, "runMs": 2100}, {"label": "Air back to 92 psi, Reset_PB", "set": {"Hoop1_Air_PSI": 92}, "pulse": {"Reset_PB": 1}}, {"label": "An hour later", "runMs": 3600500}, {"label": "Compressor trips: 70 psi for 2.1 s", "set": {"Hoop1_Air_PSI": 70}, "runMs": 2100}, {"label": "Air back to 92 psi, Reset_PB", "set": {"Hoop1_Air_PSI": 92}, "pulse": {"Reset_PB": 1}}, {"label": "Compressor trips: 70 psi for 2.1 s", "set": {"Hoop1_Air_PSI": 70}, "runMs": 2100}, {"label": "Air back to 92 psi, Reset_PB", "set": {"Hoop1_Air_PSI": 92}, "pulse": {"Reset_PB": 1}}, {"label": "Maintenance resets", "pulse": {"Maint_Reset_PB": 1}}]},
      out: `Compressor trips: 70 psi for 2.1 s  →  Hoop1_Low_Air=1  →  Hoop1_Run=0
Air back to 92 psi, Reset_PB        →  Hoop1_Low_Air=0  →  Hoop1_Run=1
An hour later                       →  no change
Compressor trips: 70 psi for 2.1 s  →  Hoop1_Low_Air=1  →  Hoop1_Run=0
Air back to 92 psi, Reset_PB        →  Hoop1_Low_Air=0  →  Hoop1_Run=1
Compressor trips: 70 psi for 2.1 s  →  Hoop1_Low_Air=1  →  Maint_Lock=1  →  Hoop1_Run=0
Air back to 92 psi, Reset_PB        →  no change
Maintenance resets                  →  Maint_Lock=0  →  Hoop1_Low_Air=0  →  Hoop1_Run=1`,
    },
    {
      t: "One relight, then lockout",
      goal: "Char Station 2: purge 5 s before Char2_Burner_On. The first flame failure (Flame_OK off 1 s while burning) sets Retry_Used and drops the burner for a fresh purge and relight; a failure with Retry_Used on latches Flame_Lockout. 60 s of steady flame clears Retry_Used. Reset needs Char2_Start off. Run the fan while started, during the 30 s post-purge, and in a lockout.",
      code: `XIC(Char2_Start) XIO(Flame_Lockout) XIO(Flame_Fail_Timer.DN) TON(Purge_Timer,5000,0);
XIC(Purge_Timer.DN) OTE(Char2_Burner_On);
XIC(Char2_Burner_On) XIO(Flame_OK) TON(Flame_Fail_Timer,1000,0);
XIC(Flame_Fail_Timer.DN) XIC(Retry_Used) OTL(Flame_Lockout);
XIC(Flame_Fail_Timer.DN) OTL(Retry_Used);
XIC(Char2_Burner_On) XIC(Flame_OK) TON(Stable_Timer,60000,0);
XIC(Stable_Timer.DN) OTU(Retry_Used);
XIC(Reset_PB) XIO(Char2_Start) BST OTU(Flame_Lockout) NXB OTU(Retry_Used) BND;
XIC(Char2_Burner_On) TOF(Post_Purge,30000,0);
BST XIC(Char2_Start) NXB XIC(Post_Purge.DN) NXB XIC(Flame_Lockout) BND OTE(Char2_Exhaust_Fan);`,
      about: "A single flame-out is often a gust or a slug of wet gas; one automatic relight, after a full purge, saves a call to the operator. A second failure soon after is a real problem and locks out. The lockout rung comes before the rung that sets Retry_Used, so the first failure only uses up the retry. Sixty seconds of steady flame earns the retry back, which is why the failure after the steady burn relights again instead of locking out. All the times are illustrative, and real burners are protected by a certified burner management system, not by a teaching rung.",
      terms: [
        ["Retry_Used", "Retry spent", "Set by the first failure; cleared by 60 s of steady flame or a reset."],
        ["XIO(Flame_Fail_Timer.DN)", "Re-purge", "A failure drops the purge timer, so the relight starts with a full purge."],
        ["Stable_Timer", "Earn the retry back", "60 s burning with flame."],
      ],
      sim: {"start": {"Flame_OK": 1}, "types": {"Retry_Used": "BOOL", "Flame_Lockout": "BOOL"}, "scene": "char2", "watch": ["Char2_Burner_On", "Retry_Used", "Flame_Lockout"], "steps": [{"label": "Char2_Start on, 5 s purge", "set": {"Char2_Start": 1}, "runMs": 5100}, {"label": "Flame lost for 1 s", "set": {"Flame_OK": 0}, "runMs": 1100}, {"label": "Flame back; 5 s purge", "set": {"Flame_OK": 1}, "runMs": 5100}, {"label": "Burns steadily for 60 s", "runMs": 60100}, {"label": "Flame lost for 1 s", "set": {"Flame_OK": 0}, "runMs": 1100}, {"label": "Flame back; 5 s purge", "set": {"Flame_OK": 1}, "runMs": 5100}, {"label": "Flame lost for 1 s", "set": {"Flame_OK": 0}, "runMs": 1100}, {"label": "Reset_PB with Start on", "pulse": {"Reset_PB": 1}}, {"label": "Start off, then Reset_PB", "set": {"Char2_Start": 0}, "pulse": {"Reset_PB": 1}}]},
      out: `Char2_Start on, 5 s purge  →  Char2_Burner_On=1
Flame lost for 1 s         →  Retry_Used=1  →  Char2_Burner_On=0
Flame back; 5 s purge      →  Char2_Burner_On=1
Burns steadily for 60 s    →  Retry_Used=0
Flame lost for 1 s         →  Retry_Used=1  →  Char2_Burner_On=0
Flame back; 5 s purge      →  Char2_Burner_On=1
Flame lost for 1 s         →  Flame_Lockout=1  →  Char2_Burner_On=0
Reset_PB with Start on     →  no change
Start off, then Reset_PB   →  Flame_Lockout=0  →  Retry_Used=0`,
    },
    {
      t: "Time the press cycle",
      goal: "Hoop Driver 1: find the rising edge of Barrel_In_Place in Barrel_Edge (with Barrel_Prev), copy Cycle_Timer.ACC into Last_Cycle_ms on the edge, run Cycle_Timer in Auto except on the edge scan so it restarts from 0, and light Slow_Cycle when the last cycle took over 72 s.",
      code: `XIC(Barrel_In_Place) XIO(Barrel_Prev) OTE(Barrel_Edge);
XIC(Barrel_In_Place) OTE(Barrel_Prev);
XIC(Barrel_Edge) MOV(Cycle_Timer.ACC,Last_Cycle_ms);
XIC(Auto) XIO(Barrel_Edge) TON(Cycle_Timer,600000,0);
GRT(Last_Cycle_ms,72000) OTE(Slow_Cycle);`,
      about: "A cycle runs from one barrel arriving to the next. Copying the timer on the arrival edge and restarting it on that same scan measures each cycle without a second timer. The Takt track's ideal cycle for Hoop Driver 1 is 65.45 s (55 an hour) and its OEE-week actual 87.44 s; the 72 s slow line, 10% over ideal, is illustrative. The measured cycles read 65,980 and 79,980 ms, not 66,000 and 80,000: each is two 10 ms scans short, because the arrival scan resets the timer and a timer adds no time on the scan it starts. The first arrival reads 0 because nothing was being timed yet.",
      terms: [
        ["Barrel_Edge", "Arrival edge", "On for one scan when a barrel arrives."],
        ["MOV(Cycle_Timer.ACC,Last_Cycle_ms)", "Capture", "Copies the cycle time before the restart."],
        ["72000", "Slow line", "10% over the 65.45 s ideal (illustrative)."],
      ],
      sim: {"types": {"Last_Cycle_ms": "DINT", "Slow_Cycle": "BOOL"}, "watch": ["Last_Cycle_ms", "Slow_Cycle"], "steps": [{"label": "Auto on; first barrel arrives, clamped 60 s", "set": {"Auto": 1, "Barrel_In_Place": 1}, "runMs": 60000}, {"label": "Hooped barrel leaves; 6 s gap", "set": {"Barrel_In_Place": 0}, "runMs": 6000}, {"label": "Next barrel arrives, clamped 70 s", "set": {"Barrel_In_Place": 1}, "runMs": 70000}, {"label": "Barrel leaves; 10 s gap", "set": {"Barrel_In_Place": 0}, "runMs": 10000}, {"label": "Next barrel arrives", "set": {"Barrel_In_Place": 1}}]},
      out: `Auto on; first barrel arrives, clamped 60 s  →  no change
Hooped barrel leaves; 6 s gap                →  no change
Next barrel arrives, clamped 70 s            →  Last_Cycle_ms=65980
Barrel leaves; 10 s gap                      →  no change
Next barrel arrives                          →  Last_Cycle_ms=79980  →  Slow_Cycle=1`,
    },
    {
      t: "Guard interlock and rundown",
      goal: "Stave Jointer 1: Saw_Run seals in from Start_PB with Stop_PB (normally closed) and Guard_Closed. Keep Guard_Lock on while the saw runs and for 5 s after (Rundown, an off-delay), and light Guard_Open_Lamp while the guard is open.",
      code: `BST XIC(Start_PB) NXB XIC(Saw_Run) BND XIC(Stop_PB) XIC(Guard_Closed) OTE(Saw_Run);
XIC(Saw_Run) TOF(Rundown,5000,0);
XIC(Rundown.DN) OTE(Guard_Lock);
XIO(Guard_Closed) OTE(Guard_Open_Lamp);`,
      about: "A saw blade keeps turning after the motor stops, so the guard stays locked through the 5 s rundown; the off-delay timer's done bit is on while the saw runs and for 5 s after. Opening the guard drops the seal-in, and closing it again does not restart the saw: someone has to press Start, knowing the guard is shut. The last step forces the guard open while running, as a failed lock would, and the saw still stops. Stave Jointer 1 is a stave-mill machine outside the sample plant; its times are illustrative. Real machine guarding uses safety-rated devices and logic designed to ISO 13849, not a standard PLC rung.",
      terms: [
        ["Guard_Closed", "Guard switch", "In the seal-in rung: opening it stops the saw."],
        ["Rundown", "Off-delay", "Done for 5 s after the saw stops."],
        ["Guard_Lock", "Guard lock", "Held until the blade has stopped."],
      ],
      sim: {"start": {"Stop_PB": 1, "Guard_Closed": 1}, "types": {"Saw_Run": "BOOL"}, "scene": "jointer1", "watch": ["Saw_Run", "Guard_Lock", "Guard_Open_Lamp"], "steps": [{"label": "Press and release Start_PB", "pulse": {"Start_PB": 1}}, {"label": "Press and release Stop_PB", "pulse": {"Stop_PB": 0}}, {"label": "Blade runs down 5.1 s", "runMs": 5100}, {"label": "Guard opened", "set": {"Guard_Closed": 0}}, {"label": "Start_PB with the guard open", "pulse": {"Start_PB": 1}}, {"label": "Guard closed", "set": {"Guard_Closed": 1}}, {"label": "Press and release Start_PB", "pulse": {"Start_PB": 1}}, {"label": "Guard forced open while running", "set": {"Guard_Closed": 0}}]},
      out: `Press and release Start_PB       →  Saw_Run=1  →  Guard_Lock=1
Press and release Stop_PB        →  Saw_Run=0
Blade runs down 5.1 s            →  Guard_Lock=0
Guard opened                     →  Guard_Open_Lamp=1
Start_PB with the guard open     →  no change
Guard closed                     →  Guard_Open_Lamp=0
Press and release Start_PB       →  Saw_Run=1  →  Guard_Lock=1
Guard forced open while running  →  Saw_Run=0  →  Guard_Open_Lamp=1`,
    },
    {
      t: "Feed after spin-up",
      goal: "Stave Jointer 1: run the saw as in the guard lesson. Feed_Run only after Saw_Run has been on 3 s (Spinup_Timer) and with no Feed_Jam. A stave on the infeed sensor for 2 s while feeding latches Feed_Jam; Reset_PB clears it once the sensor is clear. Count staves into Stave_Count as they reach the sensor.",
      code: `BST XIC(Start_PB) NXB XIC(Saw_Run) BND XIC(Stop_PB) XIC(Guard_Closed) OTE(Saw_Run);
XIC(Saw_Run) TON(Spinup_Timer,3000,0);
XIC(Spinup_Timer.DN) XIO(Feed_Jam) OTE(Feed_Run);
XIC(Feed_Run) XIC(Stave_At_Infeed) TON(Infeed_Timer,2000,0);
XIC(Infeed_Timer.DN) OTL(Feed_Jam);
XIC(Reset_PB) XIO(Stave_At_Infeed) OTU(Feed_Jam);
XIC(Feed_Run) XIC(Stave_At_Infeed) CTU(Stave_Count,9999,0);`,
      about: "Feeding wood into a blade that is still spinning up stalls it or throws the stave back, so the feed waits 3 s for full speed. A stave that sits on the sensor too long means it has caught on something; latching the jam stops the feed before the next stave rides up behind it. Opening the guard stops the saw, which resets the spin-up timer, which stops the feed: one interlock covers both motors. The 3 s and 2 s are illustrative.",
      terms: [
        ["Spinup_Timer", "Spin-up", "3 s of saw running before the feed starts."],
        ["Infeed_Timer", "Stuck stave", "2 s on the sensor while feeding is a jam."],
        ["Stave_Count", "Stave counter", "One count per stave reaching the sensor."],
      ],
      sim: {"start": {"Stop_PB": 1, "Guard_Closed": 1}, "types": {"Feed_Jam": "BOOL"}, "scene": "jointer1", "watch": ["Saw_Run", "Feed_Run", "Feed_Jam"], "steps": [{"label": "Press and release Start_PB", "pulse": {"Start_PB": 1}}, {"label": "Saw spins up 3.1 s", "runMs": 3100}, {"label": "A stave passes the sensor in 1 s", "pulse": {"Stave_At_Infeed": 1}, "pulseMs": 1000}, {"label": "A stave sticks on the sensor 2.1 s", "set": {"Stave_At_Infeed": 1}, "runMs": 2100}, {"label": "Reset_PB with the stave still there", "pulse": {"Reset_PB": 1}}, {"label": "Stave cleared, then Reset_PB", "set": {"Stave_At_Infeed": 0}, "pulse": {"Reset_PB": 1}}, {"label": "Guard opened", "set": {"Guard_Closed": 0}}]},
      out: `Press and release Start_PB           →  Saw_Run=1
Saw spins up 3.1 s                   →  Feed_Run=1
A stave passes the sensor in 1 s     →  no change
A stave sticks on the sensor 2.1 s   →  Feed_Jam=1  →  Feed_Run=0
Reset_PB with the stave still there  →  no change
Stave cleared, then Reset_PB         →  Feed_Jam=0  →  Feed_Run=1
Guard opened                         →  Saw_Run=0  →  Feed_Run=0`,
    },
  ],
});
