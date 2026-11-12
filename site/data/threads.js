// "How it connects": one problem followed across the lanes and tracks that use it.
// Each station is [lane or track id, step title, quote, note]. The quote must appear word for word in
// that step's generated output; tools/verify.mjs fails if it does not, so a thread cannot drift from
// the numbers the tracks actually produce.
BC.addThreads([
  {
    id: "misfeeds",
    name: "Hoop Driver 1's misfeeds",
    sub: "From the first Pareto to barrels bought back at the bottleneck.",
    stations: [
      ["t-db", "Downtime Pareto", "66.566666", "Hoop misfeed is third on the Pareto: 12 stops to 10:15, one still open."],
      ["t-tpm", "Minor stops vs breakdowns", "45.8", "Split by length: 7 of the OEE week's misfeeds are breakdowns, 4 are minor stops."],
      ["t-savings", "Baseline in dollars", "2385.55", "P2's baseline: 61.23 minutes, $2,385.55 a week."],
      ["t-maint", "Repeat failures", "61.23", "11 misfeeds and not one PM or improvement aimed at them."],
      ["t-kaizen", "Pareto of causes", "Feed rail worn", "The kaizen codes each misfeed: the worn feed rail is over half the minutes."],
      ["t-kaizen", "Dollars against the target", "807.74", "Four weeks later: $807.74 a week saved, the Savings Tracker's P2 figure."],
      ["t-inv", "Cycle count adjustments", "-66.00", "66 bent 53-gal hoops found in the count: about a set per misfeed."],
      ["t-sop", "What the projects buy", "28.9", "The minutes P2 gives back at the bottleneck: 28.9 good barrels a week."],
    ],
  },
  {
    id: "low-air",
    name: "Low air",
    sub: "One cause on three machines, from the Pareto to the compressor's electricity bill.",
    stations: [
      ["t-db", "Downtime Pareto", "87.433333", "Top of the Pareto: 87.43 minutes in five stops."],
      ["t-tpm", "One cause, three machines", "3,480.57", "The same cause stops all three machines: $3,480.57 a week."],
      ["t-savings", "Baseline in dollars", "3480.57", "P1, the compressor fix, takes that as its baseline."],
      ["t-energy", "An air balance", "30.2%", "Why the header sags: 30.2% of the compressed air is unaccounted for, mostly leaks."],
      ["t-energy", "After the leak repairs", "165.35", "The leak repairs save $165.35 a week of electricity, P1's energy figure."],
      ["t-cost", "Compressor energy by machine", "348.86", "In the cost model the leaks are $348.86 of shared overhead, spread over every barrel."],
      ["ladder", "Two trips need maintenance", "Maint_Lock=1", "In the PLC: a second trip inside an hour locks the reset until maintenance looks."],
      ["t-sop", "What the projects buy", "29.0", "P1's share at Hoop Driver 1: 29.0 good barrels a week."],
    ],
  },
  {
    id: "bottleneck",
    name: "The bottleneck",
    sub: "Why Hoop Driver 1 sets the plant's output, and what moves it.",
    stations: [
      ["t-oee", "Write the rows", "OEE 0.7289", "The lowest OEE of the three: 72.9%."],
      ["t-takt", "The bottleneck", "926.4", "At its running rate it makes 926.4 barrels a day against a demand of 1,000."],
      ["t-sop", "Find the bottleneck", "6,314", "6,314 good barrels a week, the fewest of the three machines."],
      ["t-cost", "Absorption or cash", "3681.56", "A point of OEE on the sold-out bottleneck is $3,681.56 of cash, against $103.79 of absorbed cost."],
      ["t-sop", "Demand against capacity", "686", "686 barrels a week short of demand on average."],
      ["t-lean", "Standard work for Hoop Driver 1", "53.45", "Staging and walking during the hoop drive cut its cycle to 53.45 s."],
      ["ladder", "Time the press cycle", "65980", "The PLC times every cycle against the 65.45 s ideal."],
    ],
  },
  {
    id: "char-flares",
    name: "Char flares",
    sub: "Lost minutes, deep char, wasted gas and a weak igniter.",
    stations: [
      ["t-savings", "Baseline in dollars", "2480.94", "Char Station 2's flares: 70.05 minutes, $2,480.94 a week (P4)."],
      ["t-spc", "Signals against fault_log", "[2, 3, 4, 10, 17, 20]", "Char depth runs deep in exactly the shifts that had a flare."],
      ["t-energy", "Propane per barrel", "0.5535", "Flare hours burn 0.5535 gallons of propane a barrel against 0.46."],
      ["t-cost", "Price and usage variances", "82.32", "The extra gallons show up as an $82.32 unfavourable usage variance, all 35 of them the flares."],
      ["t-maint", "Backlog aging", "Burner B", "The Burner B igniter work order, opened at 05:52 in the handoff note."],
      ["ladder", "One relight, then lockout", "Retry_Used=1", "In the PLC: one automatic relight after a full purge, then lockout."],
      ["t-rca", "Flame signal at each flare", "0.66", "Every flare hour has Burner B under 1.5 uA and Burner A steady: the igniter, not the gas train."],
      ["t-rca", "The 5-Why chain", "burner maker", "Five whys end at the monthly PM standard, which checks neither the igniter nor the flame."],
    ],
  },
  {
    id: "staves",
    name: "Staves",
    sub: "The biggest spend, the biggest stock and most of the lead time.",
    stations: [
      ["t-spend", "The cube in pandas", "3,166,750", "Staves are $3.17 million of the six weeks' spend."],
      ["t-inv", "Usage and days of cover", "8.1", "8.1 days of 53-gal staves at the weekly low point."],
      ["t-inv", "Cash tied up", "639,741.09", "$639,741 of stock above safety stock, almost all of it staves."],
      ["t-lean", "The value stream timeline", "195.050", "195 of a barrel's 235 hours are staves waiting in the yard."],
      ["t-cost", "The cost bridge", "94.0500", "Staves are $94.05 of a 53-gal barrel's $107.23 standard cost."],
    ],
  },
]);
