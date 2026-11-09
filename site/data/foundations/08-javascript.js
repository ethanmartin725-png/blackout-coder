// Foundations lane: JavaScript (console)
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
// Runs on its own in Node or a browser console; the Plant Board track uses the same language on a page.
// Numbers come from the canonical sample plant. Outputs: node tools/output-checks/foundations/run.mjs
BC.addLane({
  id: "javascript",
  name: "JavaScript",
  lang: "jscon",
  lessons: [
    {
      t: "Print to the console",
      goal: "Print two lines: \"Good morning, cooperage\" and \"Shift A is running\".",
      code: `console.log("Good morning, cooperage");
console.log("Shift A is running");`,
      about: "console.log prints one line. Run it with node in a terminal, or paste it into a browser's developer console (F12). The text in quotes is a string. The semicolons are optional in JavaScript, but most teams write them.",
      terms: [
        ["console.log", "console.log()", "Prints its arguments on one line."],
        ["\"Shift A is running\"", "\"…\" string", "Text. Single or double quotes both work; pick one and stay consistent."],
        [";", ";", "Ends a statement."],
      ],
      out: `Good morning, cooperage
Shift A is running`,
    },
    {
      t: "Variables and math",
      goal: "Set availability 0.988, performance 0.749, quality 0.985 as constants. Multiply them into oee and print \"OEE:\" with it as a 1-decimal percent using a template literal.",
      code: `const availability = 0.988;
const performance = 0.749;
const quality = 0.985;

const oee = availability * performance * quality;
console.log(\`OEE: \${(oee * 100).toFixed(1)}%\`);`,
      about: "const names a value that will not be reassigned. The factors are Hoop Driver 1's sample week from the OEE Loss Report track, rounded to 3 places. Backticks make a template literal: anything inside ${ } is evaluated and inserted. toFixed(1) rounds to one decimal and returns text, so this prints OEE: 72.9%, the same as every other language lane.",
      terms: [
        ["const", "const", "A name whose value cannot be reassigned. Use it by default."],
        ["${", "`…${x}…`", "A template literal. Backticks, with expressions inside ${ }."],
        ["toFixed", "toFixed(1)", "Rounds a number to 1 decimal and returns it as text."],
      ],
      out: `OEE: 72.9%`,
    },
    {
      t: "Write a function",
      goal: "Write function oee(a, p, q) that returns a * p * q. Call it with 0.988, 0.749, 0.985 and print \"OEE is\" with the score as a 1-decimal percent.",
      code: `function oee(a, p, q) {
  return a * p * q;
}

const score = oee(0.988, 0.749, 0.985);
console.log(\`OEE is \${(score * 100).toFixed(1)}%\`);`,
      about: "function defines reusable code with named inputs. Braces mark the body, and return hands the result back to the caller. JavaScript does not check types, so passing text by mistake would not fail here; it would just produce a wrong answer later. That is one reason the Plant Board track keeps its data in one object.",
      terms: [
        ["function", "function name(args) { }", "Defines a function."],
        ["return", "return", "Sends a value back and ends the function."],
        ["oee", "oee(…)", "Calling the function: its name, then the inputs in parentheses."],
      ],
      out: `OEE is 72.9%`,
    },
    {
      t: "Make decisions",
      goal: "Write rateOee(score): 0.85 or more returns \"World class\", 0.60 or more returns \"Typical\", else \"Needs work\". Print the rating for 0.729.",
      code: `function rateOee(score) {
  if (score >= 0.85) {
    return "World class";
  } else if (score >= 0.60) {
    return "Typical";
  } else {
    return "Needs work";
  }
}

console.log(rateOee(0.729));`,
      about: "Conditions are checked top to bottom and the first true one wins. Hoop Driver 1's 0.729 fails the first test and passes the second, so this prints Typical. Char Station 2's 0.860 would rate World class. JavaScript names usually run words together with capitals, like rateOee, where Python would write rate_oee.",
      terms: [
        ["if", "if (…) { }", "Runs the block when the condition in parentheses is true."],
        ["else if", "else if", "Checked only when every test above it failed."],
        [">=", ">=", "Greater than or equal to."],
      ],
      out: `Typical`,
    },
    {
      t: "Loop over an array",
      goal: "Put Hoop Driver 1's shift A fault minutes 7.5, 18.5 and 15.0 in an array, add them up with a for...of loop, and print \"Total downtime:\" with the total and \"min\".",
      code: `const downtime = [7.5, 18.5, 15.0];

let total = 0;
for (const minutes of downtime) {
  total += minutes;
}

console.log(\`Total downtime: \${total} min\`);`,
      about: "An array is an ordered list in square brackets. for...of visits each item once. total uses let because its value changes on every pass; const would refuse. JavaScript has one number type, so a whole result prints without a decimal point: 41, the Shift Handoff track's figure.",
      terms: [
        ["[", "[ … ] array", "An ordered list of values."],
        ["let", "let", "A name whose value can change."],
        ["of", "for (const x of items)", "Loops over the values of an array."],
        ["+=", "+=", "Adds to the variable in place."],
      ],
      out: `Total downtime: 41 min`,
    },
    {
      t: "Objects",
      goal: "Store shift A barrels in an object keyed by machine name. Print each machine and count with Object.entries, then print Conveyor 3's count on its own.",
      code: `const barrels = { "Char Station 2": 301, "Conveyor 3": 352, "Hoop Driver 1": 274 };

for (const [machine, count] of Object.entries(barrels)) {
  console.log(\`\${machine}: \${count}\`);
}

console.log(barrels["Conveyor 3"]);`,
      about: "An object maps keys to values, like a Python dictionary. Keys with spaces need quotes, and you read them with square brackets. Object.entries turns the object into [key, value] pairs, and the square brackets in the loop unpack each pair into two names.",
      terms: [
        ["{", "{ key: value }", "An object: values looked up by key."],
        ["Object.entries", "Object.entries(obj)", "Every [key, value] pair, ready to loop over."],
        ["[machine, count]", "Destructuring", "Unpacks a pair into two names in one step."],
      ],
      out: `Char Station 2: 301
Conveyor 3: 352
Hoop Driver 1: 274
352`,
    },
    {
      t: "Map and filter",
      goal: "Make an array of shift A machines with name, barrels and rateHr. Use map for each machine's % of ideal over 7.5 hours, print them as 1-decimal percents, then use filter and map to print the names under 70%.",
      code: `const machines = [
  { name: "Char Station 2", barrels: 301, rateHr: 50 },
  { name: "Conveyor 3", barrels: 352, rateHr: 60 },
  { name: "Hoop Driver 1", barrels: 274, rateHr: 55 },
];

const pcts = machines.map((m) => m.barrels / (m.rateHr * 7.5));
console.log(pcts.map((p) => (p * 100).toFixed(1) + "%"));

const behind = machines.filter((m) => m.barrels / (m.rateHr * 7.5) < 0.7).map((m) => m.name);
console.log(behind);`,
      about: "An array of objects is how the Plant Board track holds its data. map builds a new array by transforming every item; filter keeps only the items that pass a test. (m) => … is an arrow function, a short function written inline. Under 70% of ideal is the Shift Handoff track's BEHIND rule.",
      terms: [
        ["map", "map(fn)", "A new array with fn applied to every item."],
        ["filter", "filter(fn)", "A new array of only the items where fn returns true."],
        ["=>", "(m) => …", "An arrow function: inputs, arrow, result."],
      ],
      out: `[ '80.3%', '78.2%', '66.4%' ]
[ 'Hoop Driver 1' ]`,
    },
    {
      t: "Add up with reduce",
      goal: "Total shift A's fault minutes with reduce, and print the raw total and the total to 2 decimals. Then total the minutes per machine into an object and print it.",
      code: `const faults = [
  { machine: "Conveyor 3", minutes: 4.62 },
  { machine: "Hoop Driver 1", minutes: 7.5 },
  { machine: "Hoop Driver 1", minutes: 18.5 },
  { machine: "Hoop Driver 1", minutes: 15.0 },
  { machine: "Char Station 2", minutes: 18.75 },
];

const total = faults.reduce((sum, f) => sum + f.minutes, 0);
console.log(total);
console.log(total.toFixed(2));

const byMachine = {};
for (const f of faults) {
  byMachine[f.machine] = (byMachine[f.machine] ?? 0) + f.minutes;
}
console.log(byMachine);`,
      about: "reduce walks the array carrying a running result: here a sum that starts at 0. The total, 64.37, is shift A's down time across all three machines, the same as the Python lane. It prints cleanly this time, but decimal sums can pick up tiny errors (0.1 + 0.2 gives 0.30000000000000004), so toFixed is the safe way to show money and minutes. The per-machine object shows Hoop Driver 1's 41 minutes and Char Station 2's 18.75, clipped at the shift end.",
      terms: [
        ["reduce", "reduce(fn, start)", "Walks the array carrying a running result. Here the result is a sum that starts at 0."],
        ["??", "a ?? b", "b when a is null or undefined. Gives a machine's first fault a starting total of 0."],
        ["toFixed", "toFixed(2)", "Rounds for display. Format at the end, not in the middle of the math."],
      ],
      out: `64.37
64.37
{ 'Conveyor 3': 4.62, 'Hoop Driver 1': 41, 'Char Station 2': 18.75 }`,
    },
    {
      t: "Dates and times",
      goal: "Make Dates for the char flare's start, 2026-11-07 13:41:15, and the 14:00 shift end. Print the minutes between them, then print the start time as hh:mm.",
      code: `const start = new Date("2026-11-07T13:41:15");
const shiftEnd = new Date("2026-11-07T14:00:00");

const minutes = (shiftEnd - start) / 60000;
console.log(minutes, "min");

const hh = String(start.getHours()).padStart(2, "0");
const mm = String(start.getMinutes()).padStart(2, "0");
console.log(\`Started \${hh}:\${mm}\`);`,
      about: "Subtracting two Dates gives milliseconds, so dividing by 60,000 gives minutes: the 18.75 shift A is charged for the open char flare. A date string with a T and no Z is read as local time, and so are getHours and getMinutes, so this prints the same on any computer. Functions like toLocaleTimeString change with the computer's region settings, which makes them a poor choice for logs.",
      terms: [
        ["new Date", "new Date(\"…T…\")", "Creates a date from text. With no Z on the end, it is local time."],
        ["60000", "/ 60000", "Milliseconds per minute."],
        ["padStart", "padStart(2, \"0\")", "Pads text on the left to a length: 9 becomes 09."],
      ],
      out: `18.75 min
Started 13:41`,
    },
    {
      t: "Read JSON",
      goal: "Parse a board JSON string with the shift and each machine's name and oee. Print the shift and machine count, then find the machine furthest below 85% OEE and print its gap in points.",
      code: `const text = '{"shift":"A","machines":[{"name":"Char Station 2","oee":0.860},{"name":"Conveyor 3","oee":0.738},{"name":"Hoop Driver 1","oee":0.729}]}';

const board = JSON.parse(text);
console.log(board.shift, board.machines.length);

const gaps = board.machines.map((m) => ({ name: m.name, gap: Math.max(0, 0.85 - m.oee) }));
const worst = gaps.reduce((a, b) => (b.gap > a.gap ? b : a));
console.log(\`\${worst.name}: \${(worst.gap * 100).toFixed(1)} pts below 85%\`);`,
      about: "JSON is how a server sends data to a page: text that looks like JavaScript objects. JSON.parse turns it into real objects; JSON.stringify goes the other way. This is the shape the Plant Board track's refresh step expects from /api/board, with that track's OEE numbers, and it finds the same biggest gap the board shows. Math.max(0, …) keeps a machine above 85% from counting as a negative gap.",
      terms: [
        ["JSON.parse", "JSON.parse(text)", "Turns JSON text into objects and arrays."],
        ["Math.max", "Math.max(0, x)", "The larger value. Floors the gap at 0."],
        ["?", "cond ? a : b", "The conditional operator: a if true, else b."],
      ],
      out: `A 3
Hoop Driver 1: 12.1 pts below 85%`,
    },
    {
      t: "Handle bad data",
      goal: "Loop over three JSON responses, the middle one cut off. Print \"OEE\" and the value for each good one, and \"Skipped bad data:\" with the error's name for the bad one.",
      code: `const responses = ['{"oee":0.738}', '{"oee":', '{"oee":0.729}'];

for (const text of responses) {
  try {
    const data = JSON.parse(text);
    console.log("OEE", data.oee);
  } catch (err) {
    console.log("Skipped bad data:", err.name);
  }
}`,
      about: "A cut-off network response is normal on a plant floor. JSON.parse throws a SyntaxError on text that is not valid JSON, and without try/catch the whole script stops at the first bad one. catch receives the error object; err.name says what kind of error it was. Printing what was skipped keeps the problem visible instead of silently showing old numbers.",
      terms: [
        ["try", "try { }", "Runs the block, watching for errors."],
        ["catch", "catch (err) { }", "Runs only if something in try threw. err is the error."],
        ["err.name", "err.name", "The kind of error, such as SyntaxError."],
      ],
      out: `OEE 0.738
Skipped bad data: SyntaxError
OEE 0.729`,
    },
    {
      t: "Template literals and padding",
      goal: "Print a header and one aligned row per shift A machine: name padded to 15, barrels and share of target right-aligned in 8 characters.",
      code: `const rows = [
  { machine: "Char Station 2", barrels: 301, target: 375 },
  { machine: "Conveyor 3", barrels: 352, target: 450 },
  { machine: "Hoop Driver 1", barrels: 274, target: 412.5 },
];

console.log(\`\${"Machine".padEnd(15)}\${"Barrels".padStart(8)}\${"Share".padStart(8)}\`);
for (const r of rows) {
  const share = ((r.barrels / r.target) * 100).toFixed(1) + "%";
  console.log(\`\${r.machine.padEnd(15)}\${String(r.barrels).padStart(8)}\${share.padStart(8)}\`);
}`,
      about: "Backtick strings insert any expression inside ${…}. padEnd adds spaces after text to reach a width and padStart adds them before, which right-aligns numbers. padStart only exists on strings, so the barrels go through String() first. Each target is the ideal rate times 7.5 paid hours.",
      terms: [
        ["padEnd", "padEnd(15)", "Adds spaces after the text until it is 15 long."],
        ["padStart", "padStart(8)", "Adds spaces before it: right-aligns."],
        ["toFixed", "toFixed(1)", "A number as text with 1 decimal."],
      ],
      out: `Machine         Barrels   Share
Char Station 2      301   80.3%
Conveyor 3          352   78.2%
Hoop Driver 1       274   66.4%`,
    },
    {
      t: "Equality and truthiness",
      goal: "For the readings 352, 0, \"\", null, \"0\" and undefined, print each one, whether it is truthy, and how it compares to 0 with === and ==. Then count the readings that are really present.",
      code: `const readings = [352, 0, "", null, "0", undefined];

for (const r of readings) {
  const truth = r ? "truthy" : "falsy";
  const shown = JSON.stringify(r) ?? "undefined";
  console.log(shown.padEnd(10), truth.padEnd(7), r === 0, r == 0);
}

const present = readings.filter((r) => r !== null && r !== undefined && r !== "");
console.log(present.length, "readings present");`,
      about: "In an if, 0, an empty string, null and undefined all count as false. That is a trap for plant data: 0 barrels is a real count, not a missing one, so if (barrels) treats a stopped machine as no data. == also converts types, so \"\" and \"0\" both equal 0. Use === and test for missing values by name.",
      terms: [
        ["===", "===", "Strict equality: same type and same value."],
        ["==", "==", "Loose equality: converts types first. Avoid it."],
        ["filter", "filter", "Keeps the items that pass the test."],
      ],
      out: `352        truthy  false false
0          falsy   true true
""         falsy   false true
null       falsy   false false
"0"        truthy  false true
undefined  falsy   false false
3 readings present`,
    },
    {
      t: "switch and lookup objects",
      goal: "Write stateText(state) with a switch: 1 RUNNING, 2 JAMMED, 3 IDLE, otherwise UNKNOWN. Also make a STATE_TEXT lookup object. Print both for 1, 2, 3 and 0.",
      code: `function stateText(state) {
  switch (state) {
    case 1:
      return "RUNNING";
    case 2:
      return "JAMMED";
    case 3:
      return "IDLE";
    default:
      return "UNKNOWN";
  }
}

const STATE_TEXT = { 1: "RUNNING", 2: "JAMMED", 3: "IDLE" };

for (const s of [1, 2, 3, 0]) {
  console.log(s, stateText(s), STATE_TEXT[s] ?? "UNKNOWN");
}`,
      about: "The codes are Conv_State from the PLC lessons. switch compares with ===, and return leaves the function, so no break is needed here. A lookup object does the same job in one line and is easy to load from a file. ?? supplies \"UNKNOWN\" when the code has no entry.",
      terms: [
        ["switch", "switch", "Jumps to the case that equals the value."],
        ["default", "default", "Runs when no case matches."],
        ["??", "??", "Uses the right side when the left is null or undefined."],
      ],
      out: `1 RUNNING RUNNING
2 JAMMED JAMMED
3 IDLE IDLE
0 UNKNOWN UNKNOWN`,
    },
    {
      t: "while loops",
      goal: "Load 130 waiting barrels into 48-barrel trailers with a while loop, printing each trailer's load and what is left.",
      code: `let waiting = 130;
let trailer = 0;

while (waiting > 0) {
  const load = Math.min(48, waiting);
  waiting -= load;
  trailer++;
  console.log(\`Trailer \${trailer}: \${load} barrels, \${waiting} left\`);
}`,
      about: "while repeats as long as its condition is true and checks before each pass, so 0 barrels waiting books no trailers. Every pass must move toward the end; forget waiting -= load and the loop never stops. 48 barrels per trailer is illustrative, as in the PLC and C# lessons.",
      terms: [
        ["while", "while (…)", "Repeats while the condition is true."],
        ["Math.min", "Math.min", "The smaller of the numbers."],
        ["-=", "-=", "Subtracts and stores in one step."],
      ],
      out: `Trailer 1: 48 barrels, 82 left
Trailer 2: 48 barrels, 34 left
Trailer 3: 34 barrels, 0 left`,
    },
    {
      t: "find, some, every, includes",
      goal: "From the three machines with their status and weekly OEE, print the DOWN machine's name, whether any is DOWN, whether all are at 85%, whether any status is BEHIND, and what find returns when nothing matches.",
      code: `const machines = [
  { name: "Char Station 2", status: "DOWN", oee: 0.86 },
  { name: "Conveyor 3", status: "OK", oee: 0.738 },
  { name: "Hoop Driver 1", status: "BEHIND", oee: 0.729 },
];

console.log(machines.find((m) => m.status === "DOWN").name);
console.log(machines.some((m) => m.status === "DOWN"));
console.log(machines.every((m) => m.oee >= 0.85));
console.log(machines.map((m) => m.status).includes("BEHIND"));
console.log(machines.find((m) => m.status === "IDLE"));`,
      about: "find returns the first match, some asks whether any item passes, every whether all do, and includes whether a value is in an array. They stop as soon as the answer is known. find returns undefined when nothing matches, so reading .name on that result would throw. These are the Plant Board's statuses and OEE.",
      terms: [
        ["find", "find", "The first item that passes, or undefined."],
        ["some", "some", "True if any item passes."],
        ["every", "every", "True if all items pass."],
        ["includes", "includes", "True if the value is in the array."],
      ],
      out: `Char Station 2
true
false
true
undefined`,
    },
    {
      t: "Sort numbers correctly",
      goal: "Sort Hoop Driver 1 and the other shift A fault minutes with sort() and no compare function, then smallest first and largest first with one.",
      code: `const minutes = [4.62, 7.5, 18.5, 15, 18.75];

console.log([...minutes].sort());
console.log([...minutes].sort((a, b) => a - b));
console.log([...minutes].sort((a, b) => b - a));`,
      about: "sort() with no compare function sorts as text, so \"15\" comes before \"4.62\" the way \"1\" comes before \"4\" in a dictionary. A compare function fixes it: a - b is negative when a should come first. sort also changes the array it is called on, so [...minutes] sorts a copy and leaves the original alone.",
      terms: [
        ["sort", "sort()", "Sorts in place. Without a compare function, as text."],
        ["(a, b) => a - b", "Compare function", "Negative puts a first: smallest first."],
        ["[...minutes]", "Copy", "A new array, so the original order is kept."],
      ],
      out: `[ 15, 18.5, 18.75, 4.62, 7.5 ]
[ 4.62, 7.5, 15, 18.5, 18.75 ]
[ 18.75, 18.5, 15, 7.5, 4.62 ]`,
    },
    {
      t: "Destructuring and spread",
      goal: "Pull machine and barrels out of shift A's Conveyor 3 record, make a recount copy with 354 barrels, split a minutes list into first and rest, and take the max of the rest.",
      code: `const shiftA = { machine: "Conveyor 3", rateHr: 60, barrels: 352 };

const { machine, barrels } = shiftA;
console.log(machine, barrels);

const recount = { ...shiftA, barrels: 354 };
console.log(shiftA.barrels, recount.barrels);

const [first, ...rest] = [7.5, 18.5, 15.0];
console.log(first, rest);
console.log(Math.max(...rest));`,
      about: "Destructuring names several values in one line. Spread, the three dots, copies an object's fields into a new one, and a field listed after it replaces the copy, so the recorded count stays 352 while the recount is 354, an illustrative correction. In a function call, spread passes an array's items as separate arguments.",
      terms: [
        ["{ machine, barrels }", "Object destructuring", "Takes fields out by name."],
        ["...shiftA", "Spread", "Copies every field into the new object."],
        ["...rest", "Rest", "Collects the remaining items into an array."],
      ],
      out: `Conveyor 3 352
352 354
7.5 [ 18.5, 15 ]
18.5`,
    },
    {
      t: "Optional chaining and ??",
      goal: "The char flare has no end time yet. Measure it to 14:05 with ??, print its note with ?. and a fallback, look up a repair tech that is not there, and compare 0 || 99 with 0 ?? 99.",
      code: `const flare = { machine: "Char Station 2", start: "2026-11-07T13:41:15", end: null };

const end = new Date(flare.end ?? "2026-11-07T14:05:00");
const minutes = (end - new Date(flare.start)) / 60000;
console.log(minutes);

console.log(flare.note?.trim() ?? "no note");
console.log(flare.repair?.tech ?? "no tech assigned");
console.log(0 || 99, 0 ?? 99);`,
      about: "?? falls back only for null and undefined, so the open fault is measured to the 14:05 run time: 23.75 minutes, the Shift Handoff report's time down so far. ?. stops and gives undefined instead of throwing when the thing before it is missing. || falls back for any falsy value, including a real 0; ?? does not.",
      terms: [
        ["??", "??", "Fallback for null or undefined only."],
        ["?.", "?.", "Stops safely if the left side is missing."],
        ["||", "||", "Fallback for any falsy value, even 0."],
      ],
      out: `23.75
no note
no tech assigned
99 0`,
    },
    {
      t: "Map and Set",
      goal: "From shift A's five fault names, build a Set of unique names and a Map of counts. Print the set's size and items, the map, and the count for Low air.",
      code: `const faults = ["Jam", "Hoop misfeed", "Low air", "Low air", "Char flare"];

const unique = new Set(faults);
console.log(unique.size, [...unique]);

const counts = new Map();
for (const f of faults) {
  counts.set(f, (counts.get(f) ?? 0) + 1);
}
console.log(counts);
console.log(counts.get("Low air"));`,
      about: "A Set keeps each value once, which makes it the quickest way to drop duplicates. A Map stores key-value pairs like an object, but any value can be a key and it keeps the order keys were added. Low air hit Hoop Driver 1 twice in shift A, and the C# and Python lanes count the same faults.",
      terms: [
        ["Set", "new Set", "A collection with no duplicates."],
        ["Map", "new Map", "Key-value pairs in insertion order."],
        ["size", "size", "How many items a Set or Map holds."],
      ],
      out: `4 [ 'Jam', 'Hoop misfeed', 'Low air', 'Char flare' ]
Map(4) {
  'Jam' => 1,
  'Hoop misfeed' => 1,
  'Low air' => 2,
  'Char flare' => 1
}
2`,
    },
    {
      t: "Group with reduce",
      goal: "Group shift A's faults by machine with reduce into total minutes, then print each machine largest first with 2 decimals.",
      code: `const faults = [
  { machine: "Conveyor 3", fault: "Jam", minutes: 4.62 },
  { machine: "Hoop Driver 1", fault: "Hoop misfeed", minutes: 7.5 },
  { machine: "Hoop Driver 1", fault: "Low air", minutes: 18.5 },
  { machine: "Hoop Driver 1", fault: "Low air", minutes: 15.0 },
  { machine: "Char Station 2", fault: "Char flare", minutes: 18.75 },
];

const byMachine = faults.reduce((acc, f) => {
  acc[f.machine] = (acc[f.machine] ?? 0) + f.minutes;
  return acc;
}, {});

const sorted = Object.entries(byMachine).sort((a, b) => b[1] - a[1]);
for (const [machine, minutes] of sorted) {
  console.log(machine.padEnd(15), minutes.toFixed(2).padStart(6));
}`,
      about: "reduce carries one value through the whole array; here it is an object with one total per machine, starting empty. These are the Shift Handoff track's down minutes: 41.00, 18.75 and 4.62, with the open char flare clipped at 14:00. Newer JavaScript also has Object.groupBy, which builds the groups in one call.",
      terms: [
        ["reduce", "reduce(fn, {})", "Carries an accumulator through every item."],
        ["acc", "Accumulator", "The object being built, returned each pass."],
        ["Object.entries", "Object.entries", "The object's [key, value] pairs, so they can be sorted."],
      ],
      out: `Hoop Driver 1    41.00
Char Station 2   18.75
Conveyor 3        4.62`,
    },
    {
      t: "Cumulative Pareto",
      goal: "Sort the fault Pareto largest first. Print each fault's minutes, the running percent of the total, and \"vital\" if the running total before it was under 80%.",
      code: `const pareto = [
  { fault: "Jam", minutes: 65.7 },
  { fault: "Low air", minutes: 87.4 },
  { fault: "E-stop", minutes: 10.8 },
  { fault: "Char flare", minutes: 70.0 },
  { fault: "Hoop misfeed", minutes: 66.6 },
];

const total = pareto.reduce((sum, p) => sum + p.minutes, 0);
let running = 0;
for (const p of [...pareto].sort((a, b) => b.minutes - a.minutes)) {
  const vital = running / total < 0.8;
  running += p.minutes;
  const pct = ((running / total) * 100).toFixed(1) + "%";
  console.log(\`\${p.fault.padEnd(13)}\${p.minutes.toFixed(1).padStart(6)}\${pct.padStart(8)}\${vital ? "  vital" : ""}\`);
}`,
      about: "The vital few are the faults that start while the line is under 80%, so the fault that crosses 80% counts. Same rule, same four faults as every other lane and the DB Pulls track: Low air, Char flare, Hoop misfeed and Jam, out of 300.5 minutes. The Plant Board draws these bars.",
      terms: [
        ["running", "Running total", "Minutes so far."],
        ["vital", "Vital few", "Under 80% before this fault."],
        ["0.8", "0.8", "The 80% line of the 80/20 rule."],
      ],
      out: `Low air        87.4   29.1%  vital
Char flare     70.0   52.4%  vital
Hoop misfeed   66.6   74.5%  vital
Jam            65.7   96.4%  vital
E-stop         10.8  100.0%`,
    },
    {
      t: "String methods",
      goal: "Split \" Conveyor 3 | JAM | 2026-11-07 09:08:52 | 4.62 \" on \"|\", trim each part, then print the parts, a sentence with the time of day and the minutes plus 1, and what happens if you add 1 without converting.",
      code: `const line = " Conveyor 3 | JAM | 2026-11-07 09:08:52 | 4.62 ";

const parts = line.split("|").map((p) => p.trim());
const [machine, code, start, minutes] = parts;
console.log(parts);

console.log(\`\${machine} \${code.toLowerCase()} at \${start.slice(11)} for \${Number(minutes) + 1} min\`);
console.log(minutes + 1);`,
      about: "split cuts text at each separator, trim removes the spaces around each piece, and slice(11) takes everything from position 11, the time. Every piece is still a string, and + with a string joins text: \"4.62\" + 1 is \"4.621\". Convert with Number before doing math. The Python and C# lanes parse the same line.",
      terms: [
        ["split", "split(\"|\")", "Cuts the string into an array."],
        ["trim", "trim()", "Removes spaces from both ends."],
        ["slice", "slice(11)", "The text from index 11 on."],
      ],
      out: `[ 'Conveyor 3', 'JAM', '2026-11-07 09:08:52', '4.62' ]
Conveyor 3 jam at 09:08:52 for 5.62 min
4.621`,
    },
    {
      t: "Parse numbers safely",
      goal: "For \"4.62\", \"4.62 min\", \"\", \" 18.5 \", \"n/a\" and \"1,234\", print what Number and parseFloat each return. Then test for NaN properly.",
      code: `const inputs = ["4.62", "4.62 min", "", " 18.5 ", "n/a", "1,234"];

for (const text of inputs) {
  console.log(JSON.stringify(text).padEnd(11), Number(text), parseFloat(text));
}

console.log(Number.isNaN(Number("n/a")), NaN === NaN);`,
      about: "Number rejects anything that is not wholly a number, except that an empty string becomes 0: a blank cell turns into a zero reading. parseFloat reads as far as it can, so \"4.62 min\" gives 4.62 and \"1,234\" gives 1, silently. NaN is not equal even to itself, so test it with Number.isNaN. For counts from a form, Number plus a blank check is the safer pair.",
      terms: [
        ["Number", "Number(text)", "The whole text as a number, or NaN. Empty text gives 0."],
        ["parseFloat", "parseFloat", "Reads a number from the start of the text and stops."],
        ["isNaN", "Number.isNaN", "The reliable NaN test."],
      ],
      out: `"4.62"      4.62 4.62
"4.62 min"  NaN 4.62
""          0 NaN
" 18.5 "    18.5 18.5
"n/a"       NaN NaN
"1,234"     NaN 1
true false`,
    },
    {
      t: "Floating point and money",
      goal: "Print 0.1 + 0.2 and whether it equals 0.3, round 1.005 to 2 places two ways, then compute 98 barrels × $42.50 in whole cents.",
      code: `console.log(0.1 + 0.2);
console.log(0.1 + 0.2 === 0.3);

console.log((1.005).toFixed(2));
console.log(Math.round(1.005 * 100) / 100);

const marginCents = 4250;
const lostCents = 98 * marginCents;
console.log(lostCents, (lostCents / 100).toFixed(2));`,
      about: "JavaScript numbers are binary doubles, so 0.1 and 0.2 are stored slightly off and 1.005 is really 1.00499…, which rounds down both ways. JavaScript has no decimal type, so money is usually kept in whole cents, which add exactly, and divided by 100 only for display. 98 barrels behind at the illustrative $42.50 margin is $4,165.00.",
      terms: [
        ["toFixed", "toFixed(2)", "Text with 2 decimals, rounded from the stored binary value."],
        ["Math.round", "Math.round", "Rounds to the nearest whole number."],
        ["marginCents", "Whole cents", "Integers add exactly; convert to dollars only to show."],
      ],
      out: `0.30000000000000004
false
1.00
1
416500 4165.00`,
    },
    {
      t: "Classes",
      goal: "Write class Machine with a constructor (name, rateHr), target(hours = 7.5) and share(barrels). Print each machine's target and shift A share.",
      code: `class Machine {
  constructor(name, rateHr) {
    this.name = name;
    this.rateHr = rateHr;
  }

  target(hours = 7.5) {
    return this.rateHr * hours;
  }

  share(barrels) {
    return barrels / this.target();
  }
}

const plant = [new Machine("Conveyor 3", 60), new Machine("Hoop Driver 1", 55), new Machine("Char Station 2", 50)];
const barrels = { "Conveyor 3": 352, "Hoop Driver 1": 274, "Char Station 2": 301 };

for (const m of plant) {
  const pct = (m.share(barrels[m.name]) * 100).toFixed(1) + "%";
  console.log(m.name.padEnd(15), String(m.target()).padStart(6), pct.padStart(6));
}`,
      about: "A class is a blueprint: the constructor runs for each new Machine and stores its fields on this. Methods are shared by every machine and read that machine's own fields through this. The rates are the canonical ideal rates, so the targets are 450, 412.5 and 375 barrels.",
      terms: [
        ["class", "class Machine", "Defines a type of object."],
        ["constructor", "constructor", "Runs once when new Machine(…) is called."],
        ["this", "this", "The object the method was called on."],
      ],
      out: `Conveyor 3         450  78.2%
Hoop Driver 1    412.5  66.4%
Char Station 2     375  80.3%`,
    },
    {
      t: "Closures",
      goal: "Write makeCounter(machine) that keeps a private count and returns add() and a total getter. Count 3 barrels on Conveyor 3 and 1 on Hoop Driver 1, print both, then try to read count directly.",
      code: `function makeCounter(machine) {
  let count = 0;
  return {
    add() {
      count += 1;
      return count;
    },
    get total() {
      return \`\${machine}: \${count}\`;
    },
  };
}

const c3 = makeCounter("Conveyor 3");
c3.add();
c3.add();
c3.add();
const hoop = makeCounter("Hoop Driver 1");
hoop.add();

console.log(c3.total);
console.log(hoop.total);
console.log(c3.count);`,
      about: "The returned functions keep access to count after makeCounter has finished; that kept access is a closure. Each call makes a separate count, and nothing outside can reach it: c3.count is undefined. The only way to change the count is add(), so a stray line of code cannot reset a barrel count by accident.",
      terms: [
        ["let count", "Private variable", "Visible only to the functions made in this call."],
        ["get total", "Getter", "Read like a property, computed by a function."],
        ["makeCounter", "Factory", "Each call makes an independent counter."],
      ],
      out: `Conveyor 3: 3
Hoop Driver 1: 1
undefined`,
    },
    {
      t: "Throwing errors",
      goal: "Write barrelsPerHour(barrels, runMinutes) that throws a RangeError when there is no run time. Call it for 352 in 450 minutes and 0 in 0 inside try/catch/finally, then print 0 / 0 and 352 / 0.",
      code: `function barrelsPerHour(barrels, runMinutes) {
  if (runMinutes <= 0) throw new RangeError("no run time yet");
  return (barrels * 60) / runMinutes;
}

for (const [b, m] of [[352, 450], [0, 0]]) {
  try {
    console.log(barrelsPerHour(b, m).toFixed(1));
  } catch (err) {
    console.log(\`\${err.name}: \${err.message}\`);
  } finally {
    console.log("checked", b, m);
  }
}

console.log(0 / 0, 352 / 0);`,
      about: "JavaScript never throws on division: 0 / 0 is NaN and 352 / 0 is Infinity, and both flow into reports unnoticed. Throwing your own error at the start of a shift stops a bad rate where it starts. finally runs either way. 352 barrels in 450 minutes is Conveyor 3's shift A rate, 46.9 per hour.",
      terms: [
        ["throw", "throw", "Stops the function and hands an error to the caller."],
        ["RangeError", "RangeError", "A built-in error type for values out of range."],
        ["finally", "finally", "Runs whether or not an error was thrown."],
      ],
      out: `46.9
checked 352 450
RangeError: no run time yet
checked 0 0
NaN Infinity`,
    },
    {
      t: "Promises and async/await",
      goal: "Write readCount(machine, value) that logs the read, waits 100 ms and returns the value. Await one read, then read three machines at once with Promise.all and print the counts and total.",
      code: `const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readCount(machine, value) {
  console.log("reading", machine);
  await delay(100);
  return value;
}

async function main() {
  const one = await readCount("Conveyor 3", 352);
  console.log("one read:", one);

  const counts = await Promise.all([
    readCount("Char Station 2", 301),
    readCount("Conveyor 3", 352),
    readCount("Hoop Driver 1", 274),
  ]);
  console.log(counts, counts.reduce((a, b) => a + b, 0));
}

main();`,
      about: "A Promise is a result that arrives later; await pauses the async function until it does, without freezing anything else. Promise.all starts all three reads at once, so they take about 100 ms together instead of 300, and the results come back in the order listed. The Plant Board's refresh step uses await with fetch.",
      terms: [
        ["async", "async function", "A function that can await; it returns a Promise."],
        ["await", "await", "Waits for a Promise's result."],
        ["Promise.all", "Promise.all", "Waits for every Promise in the list."],
      ],
      out: `reading Conveyor 3
one read: 352
reading Char Station 2
reading Conveyor 3
reading Hoop Driver 1
[ 301, 352, 274 ] 927`,
    },
    {
      t: "Intl.NumberFormat",
      goal: "Format 98 × 42.5 as US dollars, 352 / 450 as a 1-decimal percent in en-US and de-DE, and the weekly loss 251876 with separators.",
      code: `const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const pct = new Intl.NumberFormat("en-US", { style: "percent", minimumFractionDigits: 1 });
const pctDe = new Intl.NumberFormat("de-DE", { style: "percent", minimumFractionDigits: 1 });

console.log(usd.format(98 * 42.5));
console.log(pct.format(352 / 450));
console.log(pctDe.format(352 / 450));
console.log(new Intl.NumberFormat("en-US").format(251876));`,
      about: "Intl.NumberFormat formats numbers the way a locale writes them: currency symbol, separators, decimal mark. Naming the locale fixes the output; leave it out and it follows the viewer's browser, so a German operator sees 78,2 %. $251,876 is the OEE Loss Report's weekly loss across the three machines.",
      terms: [
        ["Intl.NumberFormat", "Intl.NumberFormat", "A reusable formatter for one locale and style."],
        ["currency", "style: \"currency\"", "Formats as money with the currency's symbol."],
        ["de-DE", "Locale", "German: comma decimals, space before %."],
      ],
      out: `$4,165.00
78.2%
78,2 %
251,876`,
    },
    {
      t: "JSON.stringify",
      goal: "Build a downtime event object with machine, reason, start, minutes, an undefined note and an internal field. Print it as JSON, then only machine, reason and minutes indented by 2.",
      code: `const event = {
  machine: "Conveyor 3",
  reason: "MECH-JAM",
  start: "2026-11-07 09:08:52",
  minutes: 4.62,
  note: undefined,
  internal: "debug",
};

console.log(JSON.stringify(event));
console.log(JSON.stringify(event, ["machine", "reason", "minutes"], 2));`,
      about: "JSON.stringify drops fields that are undefined, so a missing note disappears instead of being sent as null. A list of keys as the second argument sends only those fields, which keeps internal data out of an API payload. The third argument indents for reading. MECH-JAM is the MES Helper track's illustrative reason code.",
      terms: [
        ["JSON.stringify", "JSON.stringify", "An object to JSON text."],
        ["[\"machine\", \"reason\", \"minutes\"]", "Key list", "Only these fields are written."],
        ["2", "Indent", "Spaces per level, for readable output."],
      ],
      out: `{"machine":"Conveyor 3","reason":"MECH-JAM","start":"2026-11-07 09:08:52","minutes":4.62,"internal":"debug"}
{
  "machine": "Conveyor 3",
  "reason": "MECH-JAM",
  "minutes": 4.62
}`,
    },
  ],
});
