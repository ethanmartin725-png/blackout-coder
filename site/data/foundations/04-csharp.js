// Foundations lane: C#
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
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
      goal: "Declare availability 0.86, performance 0.91, quality 0.98 as doubles. Multiply into oee and print \"OEE:\" as a 1-decimal percent.",
      code: `double availability = 0.86;
double performance = 0.91;
double quality = 0.98;

double oee = availability * performance * quality;
Console.WriteLine($"OEE: {oee:P1}");`,
      about: "C# makes you state each variable's type. The interpolated string formats oee with P1, a percent with one decimal.",
      terms: [
        ["double", "double", "A number type with decimals."],
        ["$", "$\"…{x}\"", "Interpolated string. Values in {braces} are inserted."],
        ["P1", ":P1", "Format code: percent with 1 decimal. N2 is a number with 2 decimals."],
      ],
      out: `OEE: 76.7%`,
    },
    {
      t: "Write a method",
      goal: "Write static double Oee(a, p, q) that returns a * p * q, then print Oee(0.86, 0.91, 0.98).",
      code: `static double Oee(double a, double p, double q)
{
    return a * p * q;
}

Console.WriteLine(Oee(0.86, 0.91, 0.98));`,
      about: "A method packages a calculation. The first double is the return type; each parameter also gets a type. Braces mark the body.",
      terms: [
        ["static", "static", "Belongs to the program itself, not to an object."],
        ["Oee", "double Oee(…)", "Return type, method name, then typed parameters."],
        ["{", "{ }", "Braces mark where a block starts and ends."],
        ["return", "return", "Sends a value back to the caller."],
      ],
      out: `0.766948`,
    },
    {
      t: "If and else",
      goal: "Set barrels 412 and target 450. Print \"Target hit\" if barrels meets target, else \"Short by\" and the gap.",
      code: `int barrels = 412;
int target = 450;

if (barrels >= target)
{
    Console.WriteLine("Target hit");
}
else
{
    Console.WriteLine($"Short by {target - barrels}");
}`,
      about: "The condition goes in parentheses. 412 is below 450, so the else block runs and prints Short by 38.",
      terms: [
        ["int", "int", "Whole-number type."],
        ["if", "if (condition)", "The condition must be in parentheses."],
        ["else", "else", "Runs when the if condition is false."],
      ],
      out: `Short by 38`,
    },
    {
      t: "Loop a list",
      goal: "Make a List<int> of downtime 42, 15, 88, 7, 30. Sum it with foreach and print \"Total:\" with the minutes.",
      code: `var downtime = new List<int> { 42, 15, 88, 7, 30 };
int total = 0;

foreach (int minutes in downtime)
{
    total += minutes;
}

Console.WriteLine($"Total: {total} min");`,
      about: "foreach visits each item once. var lets the compiler infer the type from the right side.",
      terms: [
        ["var", "var", "Lets the compiler infer the type from the right side."],
        ["List", "List<int>", "A resizable list of ints. Lives in System.Collections.Generic, included by default in .NET 6+ projects."],
        ["foreach", "foreach (x in items)", "Loops over every item in a collection."],
        ["new", "new", "Creates an object."],
      ],
      out: `Total: 182 min`,
    },
    {
      t: "Define a class",
      goal: "Define a public class Machine with Name, GoodCount, TotalCount properties and a Quality() method returning good / total as a double.",
      code: `public class Machine
{
    public string Name { get; set; }
    public int GoodCount { get; set; }
    public int TotalCount { get; set; }

    public double Quality()
    {
        return (double)GoodCount / TotalCount;
    }
}`,
      about: "A class bundles data and behavior. The cast to double matters: int divided by int drops the decimals, so 940 / 1000 would be 0.",
      terms: [
        ["class", "class", "A blueprint for objects: data plus behavior."],
        ["public", "public", "Visible to code outside the class."],
        ["get", "{ get; set; }", "An auto-property: a value with a built-in getter and setter."],
        ["(", "(double)", "A cast. Converts the value to double before dividing."],
      ],
    },
  ],
});
