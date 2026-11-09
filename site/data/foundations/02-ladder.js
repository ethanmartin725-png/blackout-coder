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
      goal: "If Conveyor_Run is on and Part_Seen stays off for 5 seconds, latch Jam_Fault. Timer tag: Jam_Timer.",
      code: `XIC(Conveyor_Run) XIO(Part_Seen) TON(Jam_Timer,5000,0);
XIC(Jam_Timer.DN) OTL(Jam_Fault);`,
      about: "The timer accumulates while the conveyor runs without seeing a part. Any part resets it. If it reaches 5000 ms, the done bit latches the fault.",
      terms: [
        ["TON", "TON(tag,preset,accum)", "Timer On Delay. Times while the rung is true; resets when false."],
        ["5000", "5000", "Preset in milliseconds. 5000 ms is 5 seconds."],
        ["DN", ".DN", "The Done bit. On when the accumulator reaches the preset."],
      ],
      sim: {"start":{"Conveyor_Run":1},"watch":["Jam_Timer.DN","Jam_Fault"],"steps":[{"label":"A part every 3 s","pulse":{"Part_Seen":1},"runMs":3000,"repeat":3},{"label":"Last part, then none for 5 s","pulse":{"Part_Seen":1},"runMs":5400}]},
      out: `A part every 3 s              →  no change
Last part, then none for 5 s  →  Jam_Timer.DN=1  →  Jam_Fault=1`,
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
  ],
});
