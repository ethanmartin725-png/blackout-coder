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
    },
    {
      t: "Count barrels",
      goal: "Count each Barrel_Eye pulse once in Barrel_Count, turn on Lot_Complete at 500, and reset the count on Shift_Reset.",
      code: `XIC(Barrel_Eye) ONS(Barrel_ONS) CTU(Barrel_Count,500,0);
XIC(Barrel_Count.DN) OTE(Lot_Complete);
XIC(Shift_Reset) RES(Barrel_Count);`,
      about: "The one-shot makes sure a barrel sitting in front of the eye counts once, not once per scan. The done bit flags the lot. RES zeroes the counter at shift change.",
      terms: [
        ["ONS", "ONS(bit)", "One Shot. Passes true for a single scan on the rising edge."],
        ["CTU", "CTU(tag,preset,accum)", "Count Up. Adds 1 on each false-to-true transition of the rung."],
        ["RES", "RES(tag)", "Reset. Clears a counter or timer accumulator and its status bits."],
        ["DN", ".DN", "Counter done bit: on when the count is at or above the preset."],
      ],
    },
  ],
});
