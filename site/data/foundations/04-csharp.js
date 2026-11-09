// Foundations lane: C#
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
// Numbers come from the canonical sample plant. Outputs: node tools/output-checks/foundations/run.mjs
BC.addLane({
  id: "csharp",
  name: "C#",
  lang: "csharp",
  lessons: [
    {
      t: "Write to the console",
      goal: "Write two lines: \"Good morning, cooperage\" and \"Shift A is running\".",
      code: `using System;

Console.WriteLine("Good morning, cooperage");
Console.WriteLine("Shift A is running");`,
      about: "Console.WriteLine writes text and a line break. Every statement ends with a semicolon.",
      terms: [
        ["using", "using", "Brings in a namespace, so you can write Console instead of System.Console."],
        ["WriteLine", "Console.WriteLine", "Writes text, then a line break."],
        [";", ";", "Ends a statement. C# requires it."],
      ],
      out: `Good morning, cooperage
Shift A is running`,
    },
    {
      t: "Typed variables",
      goal: "Declare availability 0.988, performance 0.749, quality 0.985 as doubles. Multiply into oee and print \"OEE:\" as a 1-decimal percent.",
      code: `double availability = 0.988;
double performance = 0.749;
double quality = 0.985;

double oee = availability * performance * quality;
Console.WriteLine($"OEE: {oee:P1}");`,
      about: "C# makes you state each variable's type. The factors are Hoop Driver 1's sample week from the OEE Loss Report track, rounded to 3 places. The interpolated string formats oee with P1, a percent with one decimal: 72.9%, the same OEE that track reports.",
      terms: [
        ["double", "double", "A number type with decimals."],
        ["$", "$\"…{x}\"", "Interpolated string. Values in {braces} are inserted."],
        ["P1", ":P1", "Format code: percent with 1 decimal. N2 is a number with 2 decimals."],
      ],
      out: `OEE: 72.9%`,
    },
    {
      t: "Write a method",
      goal: "Write static double Oee(a, p, q) that returns a * p * q, then print \"OEE is\" with Oee(0.988, 0.749, 0.985) as a 1-decimal percent.",
      code: `static double Oee(double a, double p, double q)
{
    return a * p * q;
}

Console.WriteLine($"OEE is {Oee(0.988, 0.749, 0.985):P1}");`,
      about: "A method packages a calculation. The first double is the return type; each parameter also gets a type. Braces mark the body. The call can go straight inside the interpolated string, with its format after the colon.",
      terms: [
        ["static", "static", "Belongs to the program itself, not to an object."],
        ["Oee", "double Oee(…)", "Return type, method name, then typed parameters."],
        ["{", "{ }", "Braces mark where a block starts and ends."],
        ["return", "return", "Sends a value back to the caller."],
      ],
      out: `OEE is 72.9%`,
    },
    {
      t: "If and else",
      goal: "Set barrels 352 and target 450. Print \"Target hit\" if barrels meets target, else \"Short by\" and the gap.",
      code: `int barrels = 352;
int target = 450;

if (barrels >= target)
{
    Console.WriteLine("Target hit");
}
else
{
    Console.WriteLine($"Short by {target - barrels}");
}`,
      about: "The condition goes in parentheses. Conveyor 3 made 352 barrels in shift A against a target of 450, its ideal 60 per hour over 7.5 paid hours, so the else block runs and prints Short by 98.",
      terms: [
        ["int", "int", "Whole-number type."],
        ["if", "if (condition)", "The condition must be in parentheses."],
        ["else", "else", "Runs when the if condition is false."],
      ],
      out: `Short by 98`,
    },
    {
      t: "Loop a list",
      goal: "Make a List<double> of Hoop Driver 1's shift A fault minutes 7.5, 18.5, 15.0. Sum it with foreach and print \"Total:\" with the minutes.",
      code: `var downtime = new List<double> { 7.5, 18.5, 15.0 };
double total = 0;

foreach (double minutes in downtime)
{
    total += minutes;
}

Console.WriteLine($"Total: {total} min");`,
      about: "foreach visits each item once. var lets the compiler infer the type from the right side. The list holds doubles because fault minutes have decimals. C# prints a whole-number double without a decimal point, so the 41 minutes from the Shift Handoff track prints as 41.",
      terms: [
        ["var", "var", "Lets the compiler infer the type from the right side."],
        ["List", "List<int>", "A resizable list of ints. Lives in System.Collections.Generic, included by default in .NET 6+ projects."],
        ["foreach", "foreach (x in items)", "Loops over every item in a collection."],
        ["new", "new", "Creates an object."],
      ],
      out: `Total: 41 min`,
    },
    {
      t: "Define a class",
      goal: "Define a public class Machine with Name, GoodCount, TotalCount properties and a Quality() method returning good / total as a double. Create Hoop Driver 1 with 6314 good of 6410 and print its quality as a 1-decimal percent.",
      code: `var hoop = new Machine { Name = "Hoop Driver 1", GoodCount = 6314, TotalCount = 6410 };
Console.WriteLine($"{hoop.Name}: {hoop.Quality():P1}");

public class Machine
{
    public string Name { get; set; } = "";
    public int GoodCount { get; set; }
    public int TotalCount { get; set; }

    public double Quality()
    {
        return (double)GoodCount / TotalCount;
    }
}`,
      about: "A class bundles data and behavior. The program's own statements come first and the class goes after them; that order is required with top-level statements. The cast to double matters: int divided by int drops the decimals, so 6314 / 6410 would be 0. The counts are Hoop Driver 1's week from the OEE Loss Report track, 96 rejects out of 6410.",
      terms: [
        ["class", "class", "A blueprint for objects: data plus behavior."],
        ["public", "public", "Visible to code outside the class."],
        ["get", "{ get; set; }", "An auto-property: a value with a built-in getter and setter."],
        ["new Machine", "new Machine { … }", "Creates an object and sets its properties in one step."],
        ["(double)", "(double)", "A cast. Converts the value to double before dividing."],
      ],
      out: `Hoop Driver 1: 98.5%`,
    },
    {
      t: "Format strings",
      goal: "Fix the culture to en-US. Print Conveyor 3's 352 barrels against its 450 target with N1 and P1, then the same values in aligned columns, then three more format codes.",
      code: `using System.Globalization;

CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo("en-US");

string machine = "Conveyor 3";
int barrels = 352;
double target = 60 * 7.5;
double share = barrels / target;

Console.WriteLine($"{machine}: {barrels} of {target:N1} ({share:P1})");
Console.WriteLine($"[{machine,-15}][{barrels,6}][{share,8:P1}]");
Console.WriteLine($"{1234567.891:N2} | {0.5:P0} | {42.5:C}");`,
      about: "After the colon comes a format code: N1 is a number with 1 decimal, P1 a percent with 1 decimal, C currency. A number after a comma sets the width, and a minus sign aligns left, which is how text reports line up. Formats follow the computer's culture: a German PC prints 78,2 %. Fixing the culture makes the output the same everywhere, which matters for anything another program reads.",
      terms: [
        ["N1", ":N1", "Number with thousands separators and 1 decimal."],
        ["P1", ":P1", "Percent with 1 decimal. The value is multiplied by 100."],
        ["-15", ",-15", "Width 15, aligned left. A positive width aligns right."],
        ["CultureInfo", "CultureInfo", "Decides decimal marks, separators and currency symbols."],
      ],
      out: `Conveyor 3: 352 of 450.0 (78.2%)
[Conveyor 3     ][   352][   78.2%]
1,234,567.89 | 50% | $42.50`,
    },
    {
      t: "for and while",
      goal: "Print Conveyor 3's cumulative target for each of the first 4 hours with a for loop. Then load 130 waiting barrels into 48-barrel trailers with a while loop, printing each trailer.",
      code: `int ratePerHour = 60;
for (int hour = 1; hour <= 4; hour++)
{
    Console.WriteLine($"Hour {hour}: target {hour * ratePerHour}");
}

int waiting = 130;
int trailers = 0;
while (waiting > 0)
{
    int load = Math.Min(48, waiting);
    waiting -= load;
    trailers++;
    Console.WriteLine($"Trailer {trailers}: {load} barrels");
}`,
      about: "for suits a known number of passes: start, test, step, all in one line. while suits \"keep going until something is true\": here, until no barrels are waiting. Math.Min stops the last trailer taking more than is left. Unlike a REPEAT loop, while checks first, so 0 barrels waiting books 0 trailers. 48 per trailer is illustrative, as in the PLC lessons.",
      terms: [
        ["for", "for (…; …; …)", "Start, condition and step for a counting loop."],
        ["while", "while (…)", "Repeats while the condition is true. Checked before each pass."],
        ["Math.Min", "Math.Min", "The smaller of two numbers."],
        ["++", "++", "Adds 1."],
      ],
      out: `Hour 1: target 60
Hour 2: target 120
Hour 3: target 180
Hour 4: target 240
Trailer 1: 48 barrels
Trailer 2: 48 barrels
Trailer 3: 34 barrels`,
    },
    {
      t: "Arrays",
      goal: "Store shift A machine names and barrels in two arrays. Print each pair, the total, and the last machine using ^1.",
      code: `string[] machines = { "Char Station 2", "Conveyor 3", "Hoop Driver 1" };
int[] barrels = { 301, 352, 274 };

int total = 0;
for (int i = 0; i < barrels.Length; i++)
{
    Console.WriteLine($"{machines[i]}: {barrels[i]}");
    total += barrels[i];
}

Console.WriteLine($"Total: {total}");
Console.WriteLine($"Last: {machines[^1]}");`,
      about: "An array holds a fixed number of values of one type, numbered from 0. Length is how many there are, so the loop runs while i is less than it. Going one past the end throws an IndexOutOfRangeException. ^1 counts from the end: the last element. Two arrays kept in step like this are fragile; later lessons use a dictionary or a record instead.",
      terms: [
        ["int[]", "int[]", "An array of whole numbers."],
        ["Length", ".Length", "How many elements the array holds."],
        ["^1", "[^1]", "The last element. ^2 is the one before it."],
      ],
      out: `Char Station 2: 301
Conveyor 3: 352
Hoop Driver 1: 274
Total: 927
Last: Hoop Driver 1`,
    },
    {
      t: "switch expressions",
      goal: "Write StateText(state) with a switch expression: 1 RUNNING, 2 JAMMED, 3 IDLE, anything else UNKNOWN. Print it for 1, 2, 3 and 0.",
      code: `string StateText(int state) => state switch
{
    1 => "RUNNING",
    2 => "JAMMED",
    3 => "IDLE",
    _ => "UNKNOWN",
};

foreach (int s in new[] { 1, 2, 3, 0 })
{
    Console.WriteLine($"{s} -> {StateText(s)}");
}`,
      about: "A switch expression turns one value into another, one arm per case. The codes are Conv_State from the PLC lessons, and the text matches the Ignition status binding. _ catches everything else; without it the compiler warns that some values are not handled, and an unmatched value throws at run time.",
      terms: [
        ["switch", "value switch { … }", "Picks the first arm whose pattern matches."],
        ["=>", "=>", "Arm: pattern on the left, result on the right."],
        ["_", "_", "Discard pattern. Matches anything not matched above."],
      ],
      out: `1 -> RUNNING
2 -> JAMMED
3 -> IDLE
0 -> UNKNOWN`,
    },
    {
      t: "Parse with TryParse",
      goal: "Add up the readings \"352\", \"301\", \"\", \"274\" and \"n/a\". Skip any that are not whole numbers, printing \"Skipped:\" with the text, then print the total.",
      code: `string[] readings = { "352", "301", "", "274", "n/a" };

int total = 0;
foreach (string text in readings)
{
    if (int.TryParse(text, out int value))
    {
        total += value;
    }
    else
    {
        Console.WriteLine($"Skipped: \\"{text}\\"");
    }
}

Console.WriteLine($"Barrels: {total}");`,
      about: "int.Parse throws an exception on bad text; TryParse returns false instead and puts the number in an out variable when it works. Bad readings are normal on a plant floor, a blank cell, an \"n/a\" typed by hand, so TryParse is the everyday choice. This is the Python lane's bad-data lesson, with the same total, 927.",
      terms: [
        ["TryParse", "int.TryParse", "Returns true and the number if the text is a valid whole number."],
        ["out int value", "out int value", "Declares the variable TryParse fills in."],
        ["\\\"", "\\\"", "An escaped quote inside a string."],
      ],
      out: `Skipped: ""
Skipped: "n/a"
Barrels: 927`,
    },
    {
      t: "Nullable values",
      goal: "The char flare started 13:41:15 and has no end time yet. Use DateTime? for the end, measure to 14:05 with ??, and print the minutes and the end as text.",
      code: `DateTime start = new DateTime(2026, 11, 7, 13, 41, 15);
DateTime? end = null;
DateTime now = new DateTime(2026, 11, 7, 14, 5, 0);

double minutes = ((end ?? now) - start).TotalMinutes;

Console.WriteLine($"Open: {end is null}");
Console.WriteLine($"Down so far: {minutes:F2} min");
Console.WriteLine($"End: {end?.ToString("HH:mm") ?? "still open"}");`,
      about: "A ? after the type lets a value be missing: an open fault has no end time. ?? supplies a fallback, here the run time 14:05, so the open fault is measured up to now: 23.75 minutes, the time down so far on the Shift Handoff report. ?. calls a method only when the value is there and gives null otherwise.",
      terms: [
        ["DateTime?", "DateTime?", "A DateTime that may be null."],
        ["??", "a ?? b", "a if it has a value, otherwise b."],
        ["?.", "x?.Method()", "Calls the method only if x is not null."],
      ],
      out: `Open: True
Down so far: 23.75 min
End: still open`,
    },
    {
      t: "DateTime and TimeSpan",
      goal: "Parse the char flare's start, subtract it from the 14:00 shift end, and print the TimeSpan, its minutes, the start as weekday and time, and the next shift's end.",
      code: `using System.Globalization;

DateTime start = DateTime.Parse("2026-11-07 13:41:15", CultureInfo.InvariantCulture);
DateTime shiftEnd = new DateTime(2026, 11, 7, 14, 0, 0);

TimeSpan down = shiftEnd - start;
Console.WriteLine(down);
Console.WriteLine($"{down.TotalMinutes} min");
Console.WriteLine(start.ToString("ddd HH:mm", CultureInfo.InvariantCulture));
Console.WriteLine(shiftEnd.AddHours(8).ToString("yyyy-MM-dd HH:mm"));`,
      about: "Subtracting two DateTimes gives a TimeSpan. TotalMinutes is the whole span in minutes with decimals; Minutes alone would give only the minutes part, 18, and drop the seconds. 18.75 is the char flare's down time inside shift A, clipped at the 14:00 end as on the Shift Handoff report. Parse with the invariant culture so dates read the same on every PC.",
      terms: [
        ["TimeSpan", "TimeSpan", "A length of time: the difference between two DateTimes."],
        ["TotalMinutes", ".TotalMinutes", "The whole span in minutes, with decimals."],
        ["AddHours", ".AddHours(8)", "A new DateTime 8 hours later."],
      ],
      out: `00:18:45
18.75 min
Sat 13:41
2026-11-07 22:00`,
    },
    {
      t: "decimal for money",
      goal: "Add 0.1 ten times as a double and as a decimal and print both. Then compute Conveyor 3's 98 barrels behind × $42.50 as a decimal.",
      code: `double asDouble = 0;
decimal asDecimal = 0;
for (int i = 0; i < 10; i++)
{
    asDouble += 0.1;
    asDecimal += 0.1m;
}
Console.WriteLine(asDouble);
Console.WriteLine(asDecimal);
Console.WriteLine(asDouble == 1.0);

int behind = 98;
decimal margin = 42.50m;
Console.WriteLine($"Margin lost: {behind * margin:N2}");`,
      about: "double stores numbers in binary, where 0.1 cannot be held exactly, so ten of them make 0.9999999999999999. decimal stores decimal digits, so it adds money the way a ledger does. Use decimal for dollars and double for measurements. 98 barrels is Conveyor 3's shift A gap to target; at the illustrative $42.50 margin that is $4,165.00.",
      terms: [
        ["decimal", "decimal", "A base-10 number type for money."],
        ["0.1m", "m suffix", "Marks a decimal literal. Without it, 0.1 is a double."],
        ["==", "asDouble == 1.0", "False: the double total is a hair under 1."],
      ],
      out: `0.9999999999999999
1.0
False
Margin lost: 4,165.00`,
    },
    {
      t: "Dictionaries",
      goal: "Store shift A barrels by machine in a Dictionary. Print each entry, the count of machines, and look up Hoop Driver 2 safely with TryGetValue.",
      code: `var barrels = new Dictionary<string, int>
{
    ["Char Station 2"] = 301,
    ["Conveyor 3"] = 352,
    ["Hoop Driver 1"] = 274,
};

foreach (var (machine, count) in barrels)
{
    Console.WriteLine($"{machine}: {count}");
}
Console.WriteLine($"Machines: {barrels.Count}");

if (barrels.TryGetValue("Hoop Driver 2", out int n))
    Console.WriteLine(n);
else
    Console.WriteLine("No Hoop Driver 2 in this shift");`,
      about: "A Dictionary maps keys to values, so a machine's count is found by name instead of by position. Reading a missing key with barrels[\"Hoop Driver 2\"] throws a KeyNotFoundException; TryGetValue returns false instead. Each entry is a key-value pair that splits into two names in the foreach.",
      terms: [
        ["Dictionary", "Dictionary<string, int>", "Maps string keys to int values."],
        ["TryGetValue", "TryGetValue", "Looks up a key without throwing if it is missing."],
        ["var (machine, count)", "Deconstruction", "Splits each entry into its key and value."],
      ],
      out: `Char Station 2: 301
Conveyor 3: 352
Hoop Driver 1: 274
Machines: 3
No Hoop Driver 2 in this shift`,
    },
    {
      t: "List methods",
      goal: "Start a List<double> with Hoop Driver 1's fault minutes. Add the Conveyor 3 jam's 4.62 by mistake, sort and print, remove it, then print the count, the longest and whether 18.5 is in the list.",
      code: `var minutes = new List<double> { 7.5, 18.5, 15.0 };

minutes.Add(4.62);
minutes.Sort();
Console.WriteLine(string.Join(", ", minutes));

minutes.Remove(4.62);
Console.WriteLine($"{minutes.Count} faults, longest {minutes[^1]}");
Console.WriteLine(minutes.Contains(18.5));`,
      about: "A List grows and shrinks, unlike an array. Sort puts the values in order in place, so after sorting the last element is the longest. Remove takes out the first matching value. string.Join prints a whole list on one line. Comparing doubles for equality, as Remove and Contains do, is safe here only because the values were typed, not calculated.",
      terms: [
        ["Add", ".Add", "Appends a value to the end."],
        ["Sort", ".Sort()", "Sorts the list in place, smallest first."],
        ["Remove", ".Remove", "Removes the first matching value."],
        ["string.Join", "string.Join", "Joins values into one string with a separator."],
      ],
      out: `4.62, 7.5, 15, 18.5
3 faults, longest 18.5
True`,
    },
    {
      t: "Tuples",
      goal: "Keep Hoop Driver 1's faults as a List of (Fault, Minutes) tuples. Find the longest, then write Summary() returning a (Total, Count) tuple and print both.",
      code: `var faults = new List<(string Fault, double Minutes)>
{
    ("Hoop misfeed", 7.5),
    ("Low air", 18.5),
    ("Low air", 15.0),
};

var longest = faults[0];
foreach (var f in faults)
{
    if (f.Minutes > longest.Minutes) longest = f;
}
var (name, mins) = longest;
Console.WriteLine($"Longest: {name}, {mins} min");

var (total, count) = Summary(faults);
Console.WriteLine($"{count} faults, {total} min");

(double Total, int Count) Summary(List<(string Fault, double Minutes)> list)
{
    double t = 0;
    foreach (var f in list) t += f.Minutes;
    return (t, list.Count);
}`,
      about: "A tuple groups a few values without declaring a class, and naming its parts makes f.Minutes readable. A method can return a tuple to hand back two results at once. Hoop Driver 1's three shift A faults total 41 minutes, the same number in every Foundations lane.",
      terms: [
        ["(string Fault, double Minutes)", "Named tuple", "Two values with names, used like a tiny record."],
        ["var (name, mins)", "Deconstruction", "Splits a tuple into separate variables."],
        ["Summary", "Tuple return", "Returns total and count together."],
      ],
      out: `Longest: Low air, 18.5 min
3 faults, 41 min`,
    },
    {
      t: "LINQ Where and Select",
      goal: "From shift A's five faults, list \"machine: fault\" for those lasting 15 minutes or more, then count Hoop Driver 1's faults.",
      code: `var faults = new List<(string Machine, string Fault, double Minutes)>
{
    ("Conveyor 3", "Jam", 4.62),
    ("Hoop Driver 1", "Hoop misfeed", 7.5),
    ("Hoop Driver 1", "Low air", 18.5),
    ("Hoop Driver 1", "Low air", 15.0),
    ("Char Station 2", "Char flare", 18.75),
};

var longOnes = faults
    .Where(f => f.Minutes >= 15)
    .Select(f => $"{f.Machine}: {f.Fault}");

foreach (string s in longOnes)
{
    Console.WriteLine(s);
}
Console.WriteLine(faults.Count(f => f.Machine == "Hoop Driver 1"));`,
      about: "LINQ chains small steps over a collection. Where keeps the items that pass a test and Select turns each one into something else. The f => … parts are lambdas, small functions written in place. The chain runs when the foreach asks for results, not when it is written. Count with a test counts only matching items.",
      terms: [
        ["Where", ".Where", "Keeps items for which the test is true."],
        ["Select", ".Select", "Turns each item into a new value."],
        ["f => f.Minutes >= 15", "Lambda", "A small inline function: takes f, returns true or false."],
      ],
      out: `Hoop Driver 1: Low air
Hoop Driver 1: Low air
Char Station 2: Char flare
3`,
    },
    {
      t: "LINQ Sum, Max and OrderBy",
      goal: "From the fault Pareto minutes, print the total, the longest, and each fault largest first.",
      code: `var pareto = new Dictionary<string, double>
{
    ["Jam"] = 65.7,
    ["Low air"] = 87.4,
    ["E-stop"] = 10.8,
    ["Char flare"] = 70.0,
    ["Hoop misfeed"] = 66.6,
};

Console.WriteLine($"Total: {pareto.Values.Sum():F1} min");
Console.WriteLine($"Longest: {pareto.Values.Max()} min");

foreach (var (fault, minutes) in pareto.OrderByDescending(p => p.Value))
{
    Console.WriteLine($"{fault,-13}{minutes,6:F1}");
}`,
      about: "Sum and Max reduce a collection to one number. OrderByDescending sorts by a key, here each entry's minutes, largest first, without changing the dictionary itself. These are the DB Pulls track's Pareto minutes across all 47 faults, 300.5 in total.",
      terms: [
        ["Sum", ".Sum()", "Adds up the values."],
        ["Max", ".Max()", "The largest value."],
        ["OrderByDescending", ".OrderByDescending", "Sorts largest first by the key you give."],
      ],
      out: `Total: 300.5 min
Longest: 87.4 min
Low air        87.4
Char flare     70.0
Hoop misfeed   66.6
Jam            65.7
E-stop         10.8`,
    },
    {
      t: "LINQ GroupBy",
      goal: "Group shift A's faults by machine and print each machine's fault count and total minutes, largest first.",
      code: `var faults = new List<(string Machine, string Fault, double Minutes)>
{
    ("Conveyor 3", "Jam", 4.62),
    ("Hoop Driver 1", "Hoop misfeed", 7.5),
    ("Hoop Driver 1", "Low air", 18.5),
    ("Hoop Driver 1", "Low air", 15.0),
    ("Char Station 2", "Char flare", 18.75),
};

var byMachine = faults
    .GroupBy(f => f.Machine)
    .Select(g => new { Machine = g.Key, Count = g.Count(), Minutes = g.Sum(f => f.Minutes) })
    .OrderByDescending(m => m.Minutes);

foreach (var m in byMachine)
{
    Console.WriteLine($"{m.Machine,-15}{m.Count,3}{m.Minutes,8:F2}");
}`,
      about: "GroupBy splits the faults into one group per machine; Key is the machine and the group holds its faults. Select then summarizes each group into an anonymous object. These are the Shift Handoff track's down minutes, 41.00, 18.75 and 4.62, with the open char flare clipped at 14:00. The MES Helper track does the same grouping on real query results.",
      terms: [
        ["GroupBy", ".GroupBy", "Splits items into groups that share a key."],
        ["g.Key", "g.Key", "The value the group shares: the machine."],
        ["new {", "new { … }", "An anonymous object, a quick unnamed record."],
      ],
      out: `Hoop Driver 1    3   41.00
Char Station 2   1   18.75
Conveyor 3       1    4.62`,
    },
    {
      t: "Cumulative Pareto",
      goal: "Sort the Pareto minutes largest first. Print each fault's minutes, the running percent of the total, and \"vital\" if the running total before it was under 80%.",
      code: `using System.Globalization;

CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo("en-US");

var pareto = new Dictionary<string, double>
{
    ["Jam"] = 65.7,
    ["Low air"] = 87.4,
    ["E-stop"] = 10.8,
    ["Char flare"] = 70.0,
    ["Hoop misfeed"] = 66.6,
};

double total = pareto.Values.Sum();
double running = 0;
foreach (var (fault, minutes) in pareto.OrderByDescending(p => p.Value))
{
    bool vital = running / total < 0.80;
    running += minutes;
    string flag = vital ? "  vital" : "";
    Console.WriteLine($"{fault,-13}{minutes,6:F1}{running / total,8:P1}{flag}");
}`,
      about: "A fault counts as one of the vital few when the line stood under 80% before it, so the fault that crosses 80% is included. Same rule, same four faults, as the Python lane and the DB Pulls track: Low air, Char flare, Hoop misfeed and Jam. E-stop, 3.6% of the minutes, is not where the time goes.",
      terms: [
        ["running", "Running total", "Minutes so far."],
        ["vital", "Vital few", "True when the line was under 80% before this fault."],
        ["?", "cond ? a : b", "a if the condition is true, otherwise b."],
      ],
      out: `Low air        87.4   29.1%  vital
Char flare     70.0   52.4%  vital
Hoop misfeed   66.6   74.5%  vital
Jam            65.7   96.4%  vital
E-stop         10.8  100.0%`,
    },
    {
      t: "Split and Join",
      goal: "Split \" Conveyor 3 | JAM | 2026-11-07 09:08:52 | 4.62 \" on '|' with trimmed entries, join the parts back with \" / \", then print the machine, the code in lower case, the time of day, and the minutes plus 1.",
      code: `using System.Globalization;

string line = " Conveyor 3 | JAM | 2026-11-07 09:08:52 | 4.62 ";

string[] parts = line.Split('|', StringSplitOptions.TrimEntries);
Console.WriteLine(string.Join(" / ", parts));

string machine = parts[0];
string code = parts[1];
double minutes = double.Parse(parts[3], CultureInfo.InvariantCulture);

Console.WriteLine($"{machine} {code.ToLower()} at {parts[2][11..]} for {minutes + 1} min");`,
      about: "Split cuts a string into an array at each separator; TrimEntries removes the spaces around each piece. Everything is still text until double.Parse converts it, and with the invariant culture \"4.62\" reads the same on a German PC. [11..] is a range: from position 11 to the end, the time. The Python lane parses the same line.",
      terms: [
        ["Split", ".Split('|', …)", "Cuts the string at each separator."],
        ["TrimEntries", "TrimEntries", "Trims spaces from every piece."],
        ["[11..]", "Range", "Characters from index 11 to the end."],
      ],
      out: `Conveyor 3 / JAM / 2026-11-07 09:08:52 / 4.62
Conveyor 3 jam at 09:08:52 for 5.62 min`,
    },
    {
      t: "Enums",
      goal: "Declare enum MachineState with Running = 1, Jammed = 2, Idle = 3. Convert 2 to a state, print Idle's number, list every state, and check whether 0 is defined.",
      code: `MachineState state = (MachineState)2;
Console.WriteLine(state);
Console.WriteLine((int)MachineState.Idle);

foreach (MachineState s in Enum.GetValues<MachineState>())
{
    Console.WriteLine($"{(int)s} {s}");
}
Console.WriteLine(Enum.IsDefined((MachineState)0));

enum MachineState { Running = 1, Jammed = 2, Idle = 3 }`,
      about: "An enum gives names to fixed numbers, here the same Conv_State codes the PLC sends. Casting a number to the enum never fails, even for a value with no name, so check with IsDefined before trusting a number read from a PLC or a database. Printing an enum prints its name.",
      terms: [
        ["enum", "enum", "A type whose values are named numbers."],
        ["(MachineState)2", "Cast", "Turns the number 2 into MachineState.Jammed."],
        ["IsDefined", "Enum.IsDefined", "True only if the value has a name in the enum."],
      ],
      out: `Jammed
3
1 Running
2 Jammed
3 Idle
False`,
    },
    {
      t: "Records and with",
      goal: "Declare record ShiftCount(Machine, IdealRateHr, Barrels) with a Share() method. Make shift A's Conveyor 3 count, a copy with 354 barrels using with, compare a fresh copy for equality, and print the corrected share.",
      code: `var shiftA = new ShiftCount("Conveyor 3", 60, 352);
var corrected = shiftA with { Barrels = 354 };

Console.WriteLine(shiftA);
Console.WriteLine(corrected);
Console.WriteLine(shiftA == new ShiftCount("Conveyor 3", 60, 352));
Console.WriteLine($"{corrected.Share():P1}");

record ShiftCount(string Machine, int IdealRateHr, int Barrels)
{
    public double Share(double hours = 7.5) => Barrels / (IdealRateHr * hours);
}`,
      about: "A record is a class built for data: one line declares the fields, printing shows them, and two records with the same values are equal. Records are read-only, so with makes a changed copy instead of editing the original; the shift A count stays as recorded. The recount of 354 is illustrative. The MES Helper track uses records for faults and counts.",
      terms: [
        ["record", "record", "A data class with value equality and built-in printing."],
        ["with", "with { … }", "A copy with some fields changed."],
        ["==", "Value equality", "Equal when every field is equal."],
      ],
      out: `ShiftCount { Machine = Conveyor 3, IdealRateHr = 60, Barrels = 352 }
ShiftCount { Machine = Conveyor 3, IdealRateHr = 60, Barrels = 354 }
True
78.7%`,
    },
    {
      t: "Constructors that validate",
      goal: "Write class Machine whose constructor rejects an ideal rate of 0 or less with ArgumentOutOfRangeException. Create Conveyor 3, print its target, then try Hoop Driver 1 at -55 and print the rejection.",
      code: `var conveyor = new Machine("Conveyor 3", 60);
Console.WriteLine($"{conveyor.Name} target {conveyor.Target(7.5)}");

try
{
    var bad = new Machine("Hoop Driver 1", -55);
}
catch (ArgumentOutOfRangeException ex)
{
    Console.WriteLine($"Rejected: {ex.Message}");
}

public class Machine
{
    public string Name { get; }
    public double RateHr { get; }

    public Machine(string name, double rateHr)
    {
        if (rateHr <= 0)
            throw new ArgumentOutOfRangeException(nameof(rateHr), "ideal rate must be above 0");
        Name = name;
        RateHr = rateHr;
    }

    public double Target(double hours) => RateHr * hours;
}`,
      about: "A constructor runs when an object is created, so it is the one place to refuse bad data. Once rejected there, a negative rate can never reach a target or an OEE calculation. Properties with only get can be set in the constructor and nowhere else. nameof(rateHr) puts the parameter name in the message, which .NET adds in brackets.",
      terms: [
        ["throw", "throw", "Stops and reports an error to the caller."],
        ["nameof", "nameof(rateHr)", "The name of a variable as text, checked by the compiler."],
        ["get;", "{ get; }", "Read-only property: set in the constructor only."],
      ],
      out: `Conveyor 3 target 450
Rejected: ideal rate must be above 0 (Parameter 'rateHr')`,
    },
    {
      t: "Interfaces",
      goal: "Define interface IReportLine with Text(). Implement it in records CountLine and FaultLine, put one of each in a List<IReportLine>, and print every line.",
      code: `var report = new List<IReportLine>
{
    new CountLine("Conveyor 3", 352, 450),
    new FaultLine("Conveyor 3", "Jam", 4.62),
    new CountLine("Hoop Driver 1", 274, 412.5),
};

foreach (IReportLine line in report)
{
    Console.WriteLine(line.Text());
}

interface IReportLine
{
    string Text();
}

record CountLine(string Machine, int Barrels, double Target) : IReportLine
{
    public string Text() => $"{Machine}: {Barrels} of {Target} ({Barrels / Target:P1})";
}

record FaultLine(string Machine, string Fault, double Minutes) : IReportLine
{
    public string Text() => $"{Machine}: {Fault}, {Minutes} min";
}`,
      about: "An interface is a promise: every IReportLine has a Text() method. The report loop does not care which kind of line it holds, so adding a third kind, a note from the shift lead, needs no change to the loop. The counts and the jam are Conveyor 3 and Hoop Driver 1's shift A figures.",
      terms: [
        ["interface", "interface", "A list of members a type promises to have."],
        [": IReportLine", ": IReportLine", "This record keeps the interface's promise."],
        ["List<IReportLine>", "List of the interface", "Holds any type that implements it."],
      ],
      out: `Conveyor 3: 352 of 450 (78.2%)
Conveyor 3: Jam, 4.62 min
Hoop Driver 1: 274 of 412.5 (66.4%)`,
    },
    {
      t: "Extension methods",
      goal: "Write a static class Format with extension methods ToPct(this double x, int decimals = 1) and ToTitle(this string s). Print 0.782.ToPct(), 352 / 450.0 to 2 decimals, and \"hoop driver 1\" in title case.",
      code: `using System.Globalization;

Console.WriteLine(0.782.ToPct());
Console.WriteLine((352 / 450.0).ToPct(2));
Console.WriteLine("hoop driver 1".ToTitle());

static class Format
{
    public static string ToPct(this double x, int decimals = 1) =>
        (x * 100).ToString("F" + decimals, CultureInfo.InvariantCulture) + "%";

    public static string ToTitle(this string s) =>
        CultureInfo.InvariantCulture.TextInfo.ToTitleCase(s);
}`,
      about: "this before the first parameter makes a static method callable as if it belonged to the type: 0.782.ToPct(). It adds nothing to double itself; it only reads well. Keeping report formatting in one static class means every report rounds and labels the same way. The invariant culture keeps the decimal point a point.",
      terms: [
        ["this double x", "this", "Makes the method an extension of double."],
        ["static class", "static class", "A class that only holds static members."],
        ["ToTitleCase", "ToTitleCase", "Capitalizes the first letter of each word."],
      ],
      out: `78.2%
78.22%
Hoop Driver 1`,
    },
    {
      t: "A generic method",
      goal: "Write Clamp<T>(value, min, max) for any T that implements IComparable<T>. Clamp 75.0 and 5.0 to 20 to 60, then the whole number 45, then a string.",
      code: `Console.WriteLine(Clamp(75.0, 20.0, 60.0));
Console.WriteLine(Clamp(5.0, 20.0, 60.0));
Console.WriteLine(Clamp(45, 20, 60));
Console.WriteLine(Clamp("Zulu", "Alpha", "Mike"));

static T Clamp<T>(T value, T min, T max) where T : IComparable<T>
{
    if (value.CompareTo(max) > 0) return max;
    if (value.CompareTo(min) < 0) return min;
    return value;
}`,
      about: "<T> makes one method work for doubles, ints and strings. where T : IComparable<T> limits T to types that can be compared, which is what CompareTo needs. The 20 to 60 limits are the setpoint clamp from the PLC lessons. .NET already has Math.Clamp for numbers; this shows how such a method is built.",
      terms: [
        ["<T>", "Clamp<T>", "A type parameter: T is filled in by each call."],
        ["where", "where T : IComparable<T>", "T must be comparable."],
        ["CompareTo", "CompareTo", "Below 0 if smaller, 0 if equal, above 0 if larger."],
      ],
      out: `60
20
45
Mike`,
    },
    {
      t: "Pattern matching",
      goal: "For each of shift A's faults, pick an action with property patterns: Char Station 2 gets \"burner check\", anything over 15 minutes \"root cause\", a jam or misfeed \"log only\", the rest \"review\".",
      code: `var faults = new List<Fault>
{
    new("Conveyor 3", "Jam", 4.62),
    new("Hoop Driver 1", "Hoop misfeed", 7.5),
    new("Hoop Driver 1", "Low air", 18.5),
    new("Hoop Driver 1", "Low air", 15.0),
    new("Char Station 2", "Char flare", 18.75),
};

foreach (var f in faults)
{
    string action = f switch
    {
        { Machine: "Char Station 2" } => "burner check",
        { Minutes: > 15 } => "root cause",
        { Name: "Jam" or "Hoop misfeed" } => "log only",
        _ => "review",
    };
    Console.WriteLine($"{f.Machine,-15}{f.Name,-13}{action}");
}

record Fault(string Machine, string Name, double Minutes);`,
      about: "Property patterns test an object's fields inside a switch. The first matching arm wins, so order is the rule's priority: the char flare is over 15 minutes but gets a burner check first. The 15.0-minute low air is not over 15, so it falls through to review. The actions are illustrative; the faults are shift A's.",
      terms: [
        ["{ Minutes: > 15 }", "Property pattern", "Matches when Minutes is over 15."],
        ["or", "or", "Matches either value."],
        ["new(", "new( … )", "Target-typed new: the type comes from the list."],
      ],
      out: `Conveyor 3     Jam          log only
Hoop Driver 1  Hoop misfeed log only
Hoop Driver 1  Low air      root cause
Hoop Driver 1  Low air      review
Char Station 2 Char flare   burner check`,
    },
    {
      t: "Exceptions",
      goal: "With 0 barrels and 0 run minutes, compute barrels per hour as whole numbers inside try/catch/finally. Then do the same in double, and finally with a guard.",
      code: `int barrels = 0;
int runMinutes = 0;

try
{
    int perHour = barrels * 60 / runMinutes;
    Console.WriteLine(perHour);
}
catch (DivideByZeroException)
{
    Console.WriteLine("No run time yet: rate not computed");
}
finally
{
    Console.WriteLine("Rate check done");
}

double rate = barrels * 60.0 / runMinutes;
Console.WriteLine(rate);
Console.WriteLine(runMinutes > 0 ? barrels * 60.0 / runMinutes : 0.0);`,
      about: "At the start of a shift there is no run time yet. Whole-number division by zero throws, which catch handles; finally runs either way. Double division by zero does not throw: 0.0 / 0 is NaN, \"not a number\", which flows silently into averages and reports. A guard that checks first is clearer than either, as the PLC lane's GRT before CPT does.",
      terms: [
        ["try", "try { … }", "Code that might throw."],
        ["catch", "catch (DivideByZeroException)", "Runs only for that kind of error."],
        ["finally", "finally", "Runs whether or not anything was thrown."],
        [null, "NaN", "Not a number: the double result of 0.0 / 0."],
      ],
      out: `No run time yet: rate not computed
Rate check done
NaN
0`,
    },
    {
      t: "Write and read a file",
      goal: "Write shift A's summary to shift_summary.csv with File.WriteAllLines, read it back skipping the header, and print each machine's share of target.",
      code: `using System.Globalization;

string[] lines =
{
    "machine,barrels,target",
    "Char Station 2,301,375",
    "Conveyor 3,352,450",
    "Hoop Driver 1,274,412.5",
};
File.WriteAllLines("shift_summary.csv", lines);

foreach (string line in File.ReadAllLines("shift_summary.csv").Skip(1))
{
    string[] p = line.Split(',');
    double share = int.Parse(p[1]) / double.Parse(p[2], CultureInfo.InvariantCulture);
    Console.WriteLine($"{p[0]}: {share:P1}");
}
Console.WriteLine(File.Exists("shift_summary.csv"));`,
      about: "WriteAllLines writes a whole file in one call and closes it; ReadAllLines reads it back as an array of lines. Skip(1) drops the header. Splitting on commas works here because no field contains a comma; real CSV with quoted fields needs a CSV library. The file lands in the program's working folder.",
      terms: [
        ["WriteAllLines", "File.WriteAllLines", "Writes every line and closes the file."],
        ["ReadAllLines", "File.ReadAllLines", "Reads the whole file as an array of lines."],
        ["Skip", "Skip(1)", "Skips the header line."],
      ],
      out: `Char Station 2: 80.3%
Conveyor 3: 78.2%
Hoop Driver 1: 66.4%
True`,
    },
    {
      t: "JSON",
      goal: "Declare record ShiftStatus(Shift, Machines, OpenFault, Note). Serialize shift A's status to JSON, print it, read it back and print Char Station 2's status and OpenFault.",
      code: `using System.Text.Json;

var status = new ShiftStatus(
    "A",
    new Dictionary<string, string>
    {
        ["Char Station 2"] = "DOWN",
        ["Conveyor 3"] = "OK",
        ["Hoop Driver 1"] = "BEHIND",
    },
    true,
    null);

string json = JsonSerializer.Serialize(status);
Console.WriteLine(json);

var back = JsonSerializer.Deserialize<ShiftStatus>(json)!;
Console.WriteLine($"{back.Machines["Char Station 2"]} {back.OpenFault}");

record ShiftStatus(string Shift, Dictionary<string, string> Machines, bool OpenFault, string? Note);`,
      about: "System.Text.Json turns objects into JSON text and back, the format web APIs and MES systems exchange. Property names come out as written, OpenFault; an API that expects openFault needs JsonSerializerOptions with a camel-case policy. The ! tells the compiler the result is not null. The statuses are the Shift Handoff track's.",
      terms: [
        ["Serialize", "JsonSerializer.Serialize", "Object to JSON text."],
        ["Deserialize", "Deserialize<ShiftStatus>", "JSON text back to an object."],
        ["!", ")!", "Null-forgiving: asserts the value is not null."],
      ],
      out: `{"Shift":"A","Machines":{"Char Station 2":"DOWN","Conveyor 3":"OK","Hoop Driver 1":"BEHIND"},"OpenFault":true,"Note":null}
DOWN True`,
    },
    {
      t: "async and await",
      goal: "Read three air-pressure samples one after another with an async method, then read three machines' counts at the same time with Task.WhenAll and print the total.",
      code: `double[] psiSamples = { 92.0, 78.0, 91.5 };

for (int i = 0; i < psiSamples.Length; i++)
{
    double psi = await ReadAirAsync(i);
    Console.WriteLine($"Sample {i + 1}: {psi} psi");
}

int[] counts = await Task.WhenAll(
    ReadCountAsync(352),
    ReadCountAsync(274),
    ReadCountAsync(301));
Console.WriteLine($"Total: {counts.Sum()}");

async Task<double> ReadAirAsync(int i)
{
    await Task.Delay(100);
    return psiSamples[i];
}

async Task<int> ReadCountAsync(int value)
{
    await Task.Delay(200);
    return value;
}`,
      about: "Reading a tag server, a database or an API takes time, and await lets the program wait without freezing. Task.Delay stands in for that wait. Awaiting in a loop reads one at a time; WhenAll starts all three reads and waits for the slowest, about 200 ms instead of 600. The results come back in the order the tasks were listed, not the order they finished.",
      terms: [
        ["async", "async Task<double>", "A method that can await and returns its result later."],
        ["await", "await", "Waits for the task without blocking the thread."],
        ["WhenAll", "Task.WhenAll", "Runs tasks together and waits for all of them."],
        ["Task.Delay", "Task.Delay", "An awaitable pause; stands in for a slow read."],
      ],
      out: `Sample 1: 92 psi
Sample 2: 78 psi
Sample 3: 91.5 psi
Total: 927`,
    },
    {
      t: "Rounding",
      goal: "Round 2.5, 3.5 and 10.125 with Math.Round's default, then 10.125 away from zero. Then round the double 1.005 to 2 places away from zero.",
      code: `Console.WriteLine(Math.Round(2.5m));
Console.WriteLine(Math.Round(3.5m));
Console.WriteLine(Math.Round(10.125m, 2));
Console.WriteLine(Math.Round(10.125m, 2, MidpointRounding.AwayFromZero));
Console.WriteLine(Math.Round(1.005, 2, MidpointRounding.AwayFromZero));`,
      about: "Math.Round's default is banker's rounding: an exact half goes to the even digit, so 2.5 becomes 2 and 10.125 becomes 10.12. Excel's ROUND and SQL Server's ROUND go away from zero, 10.13, so a C# report can disagree with a spreadsheet by a cent. Say which rule you use. The last line is a double trap: 1.005 is stored as 1.00499…, so it rounds to 1.",
      terms: [
        ["Math.Round", "Math.Round", "Rounds to the given number of decimals."],
        ["AwayFromZero", "MidpointRounding.AwayFromZero", "Halves round up in size, as Excel does."],
        ["10.125m", "decimal", "Exact, so the half really is a half."],
      ],
      out: `2
4
10.12
10.13
1`,
    },
  ],
});
