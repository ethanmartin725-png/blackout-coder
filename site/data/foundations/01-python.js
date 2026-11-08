// Foundations lane: Python
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
BC.addLane({
  id: "python",
  name: "Python",
  lang: "python",
  lessons: [
    {
      t: "Print a message",
      goal: "Print two lines: \"Good morning, cooperage\" and \"Shift A is running\".",
      code: `print("Good morning, cooperage")
print("Shift A is running")`,
      about: "Each print() call writes one line to the screen. The text inside the quotes is a string: Python treats it as data, not as code to run.",
      terms: [
        ["print", "print()", "Built-in function that writes values to the screen, then moves to a new line."],
        ["\"Good morning, cooperage\"", "\"…\" string", "Text wrapped in quotes. Single or double quotes both work; they must match."],
        [null, "( )", "Parentheses hold the inputs (arguments) you pass into a function."],
      ],
    },
    {
      t: "Variables and math",
      goal: "Set availability 0.86, performance 0.91, quality 0.98. Multiply them into oee and print it as a percent, 1 decimal.",
      code: `availability = 0.86
performance = 0.91
quality = 0.98

oee = availability * performance * quality
print(round(oee * 100, 1))`,
      about: "Three variables hold the OEE factors. The fourth line multiplies them. round() trims the result to one decimal after scaling to a percent, so this prints 76.7.",
      terms: [
        ["=", "=", "Assignment. Stores the value on the right in the name on the left."],
        ["*", "*", "Multiplication. + adds, - subtracts, / divides."],
        ["round", "round(x, 1)", "Rounds a number. The second argument is how many decimal places to keep."],
        ["oee", "variable", "A name that holds a value so you can reuse it. Lowercase with underscores is the Python convention."],
      ],
    },
    {
      t: "Write a function",
      goal: "Define oee(a, p, q) that returns a * p * q. Call it with 0.86, 0.91, 0.98 and print \"OEE is\" with the score as a 1-decimal percent.",
      code: `def oee(a, p, q):
    return a * p * q

score = oee(0.86, 0.91, 0.98)
print(f"OEE is {score:.1%}")`,
      about: "def creates a reusable function. The indented line is its body. Calling oee(...) runs the body and hands back the product. The f-string formats it as 76.7%.",
      terms: [
        ["def", "def name(args):", "Starts a function definition: name, inputs in parentheses, then a colon."],
        ["return", "return", "Sends a value back to whoever called the function and ends the function."],
        [null, "Indentation", "The 4 spaces under def mark which lines belong to the function. Python requires it."],
        ["f", "f\"…{x:.1%}\"", "An f-string. Anything in {braces} is evaluated and inserted. :.1% formats as a percent with 1 decimal."],
      ],
    },
    {
      t: "Make decisions",
      goal: "Define rate_oee(score): 0.85+ returns \"World class\", 0.60+ returns \"Typical\", else \"Needs work\". Print the rating for 0.72.",
      code: `def rate_oee(score):
    if score >= 0.85:
        return "World class"
    elif score >= 0.60:
        return "Typical"
    else:
        return "Needs work"

print(rate_oee(0.72))`,
      about: "Python checks each condition top to bottom and runs the first block that is true. 0.72 fails the first test and passes the second, so it prints Typical.",
      terms: [
        ["if", "if condition:", "Runs the indented block only when the condition is true."],
        ["elif", "elif", "\"Else if\". Checked only when every condition above it was false."],
        ["else", "else:", "Runs when nothing above matched. No condition needed."],
        [">=", ">=", "Greater than or equal to. Also: <=, ==, != (not equal), <, >."],
      ],
    },
    {
      t: "Loop over a list",
      goal: "Put downtime minutes 42, 15, 88, 7, 30 in a list, add them up with a for loop, and print \"Total downtime:\" with the total and \"min\".",
      code: `downtime = [42, 15, 88, 7, 30]

total = 0
for minutes in downtime:
    total += minutes

print("Total downtime:", total, "min")`,
      about: "The loop runs once per item. Each pass, minutes holds the current value and gets added to total. The result is 182.",
      terms: [
        ["[", "[ … ] list", "An ordered collection of values, separated by commas."],
        ["for", "for x in items:", "Repeats the indented block once for each item, naming the current item x."],
        ["+=", "+=", "Adds to the existing value. total += 5 means total = total + 5."],
        ["print", "print(a, b, c)", "Commas print several values separated by spaces."],
      ],
    },
    {
      t: "Dictionaries",
      goal: "Store barrels per line {\"Line 1\": 412, \"Line 2\": 389, \"Line 3\": 455}. Print each line and count, then print \"Top line:\" with the highest.",
      code: `barrels = {"Line 1": 412, "Line 2": 389, "Line 3": 455}

for line, count in barrels.items():
    print(line, count)

best = max(barrels, key=barrels.get)
print("Top line:", best)`,
      about: "A dictionary maps keys to values. .items() hands the loop both at once. max() with key=barrels.get compares lines by their counts, so best is \"Line 3\".",
      terms: [
        ["{", "{ key: value }", "A dictionary. Look values up by key, like barrels[\"Line 1\"]."],
        ["items", ".items()", "Gives each key and value together so a loop can unpack both."],
        ["max", "max(…, key=)", "Returns the largest item. key= says what to compare by."],
        ["get", ".get", "Dictionary method that returns the value for a key."],
      ],
    },
    {
      t: "Read a CSV file",
      goal: "Open shift_log.csv, read rows by header name, and print \"Bad row:\" for any row where good is greater than total.",
      code: `import csv

with open("shift_log.csv") as f:
    reader = csv.DictReader(f)
    for row in reader:
        if int(row["good"]) > int(row["total"]):
            print("Bad row:", row)`,
      about: "This is a data-quality check: a good count above the total count means the row was keyed wrong. DictReader uses the header row as keys, and int() converts the text values to numbers before comparing.",
      terms: [
        ["import", "import", "Loads a library. csv ships with Python."],
        ["with", "with open() as f:", "Opens a file and closes it automatically when the block ends."],
        ["DictReader", "csv.DictReader", "Reads each row as a dictionary keyed by the header row."],
        ["int", "int()", "Converts text like \"940\" to the number 940. CSV values always arrive as text."],
      ],
    },
  ],
});
