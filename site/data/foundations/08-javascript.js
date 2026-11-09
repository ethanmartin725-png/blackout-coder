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
  ],
});
