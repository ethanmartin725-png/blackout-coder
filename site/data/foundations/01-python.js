// Foundations lane: Python
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
// Numbers come from the canonical sample plant. Outputs: node tools/output-checks/foundations/run.mjs
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
      out: `Good morning, cooperage
Shift A is running`,
    },
    {
      t: "Variables and math",
      goal: "Set availability 0.988, performance 0.749, quality 0.985. Multiply them into oee and print it as a percent, 1 decimal.",
      code: `availability = 0.988
performance = 0.749
quality = 0.985

oee = availability * performance * quality
print(round(oee * 100, 1))`,
      about: "Three variables hold the OEE factors: Hoop Driver 1's sample week from the OEE Loss Report track, rounded to 3 places. The fourth line multiplies them. round() trims the result to one decimal after scaling to a percent, so this prints 72.9, the same OEE that track reports.",
      terms: [
        ["=", "=", "Assignment. Stores the value on the right in the name on the left."],
        ["*", "*", "Multiplication."],
        ["round", "round(x, 1)", "Rounds x to 1 decimal place."],
        ["oee", "variable", "A name that holds a value so later lines can use it."],
      ],
      out: `72.9`,
    },
    {
      t: "Write a function",
      goal: "Define oee(a, p, q) that returns a * p * q. Call it with 0.988, 0.749, 0.985 and print \"OEE is\" with the score as a 1-decimal percent.",
      code: `def oee(a, p, q):
    return a * p * q

score = oee(0.988, 0.749, 0.985)
print(f"OEE is {score:.1%}")`,
      about: "def creates a reusable function. The indented line is its body. Calling oee(...) runs the body and hands back the product. The f-string formats it as a percent with one decimal: 72.9%.",
      terms: [
        ["def", "def name(args):", "Defines a function: a name, its inputs, and a colon."],
        ["return", "return", "Sends a value back to whoever called the function."],
        [null, "Indentation", "The 4 spaces under def mark which lines belong to the function. Python requires it."],
        ["f", "f\"…{x:.1%}\"", "An f-string. Anything in {braces} is evaluated and inserted. :.1% formats as a percent with 1 decimal."],
      ],
      out: `OEE is 72.9%`,
    },
    {
      t: "Make decisions",
      goal: "Define rate_oee(score): 0.85+ returns \"World class\", 0.60+ returns \"Typical\", else \"Needs work\". Print the rating for 0.729.",
      code: `def rate_oee(score):
    if score >= 0.85:
        return "World class"
    elif score >= 0.60:
        return "Typical"
    else:
        return "Needs work"

print(rate_oee(0.729))`,
      about: "Python checks each condition top to bottom and runs the first block that is true. Hoop Driver 1's 0.729 fails the first test and passes the second, so it prints Typical. Char Station 2's 0.860 would rate World class. The 85% line is the common world-class OEE benchmark; it is a convention, not a law.",
      terms: [
        ["if", "if condition:", "Runs the indented block only when the condition is true."],
        ["elif", "elif", "Else-if: checked only when every test above it failed."],
        ["else", "else:", "Runs when nothing above it matched."],
        [">=", ">=", "Greater than or equal to."],
      ],
      out: `Typical`,
    },
    {
      t: "Loop over a list",
      goal: "Put Hoop Driver 1's shift A fault minutes 7.5, 18.5 and 15.0 in a list, add them up with a for loop, and print \"Total downtime:\" with the total and \"min\".",
      code: `downtime = [7.5, 18.5, 15.0]

total = 0
for minutes in downtime:
    total += minutes

print("Total downtime:", total, "min")`,
      about: "The loop runs once per item. Each pass, minutes holds the current value and gets added to total. These are Hoop Driver 1's three faults in shift A on 2026-11-07, the hoop misfeed and two low-air stops, and the 41.0 minutes matches the Shift Handoff track.",
      terms: [
        ["[", "[ … ] list", "An ordered collection. Square brackets, items separated by commas."],
        ["for", "for x in items:", "Repeats the indented block once per item."],
        ["+=", "+=", "Adds to the variable in place: total = total + minutes."],
        ["print", "print(a, b, c)", "Prints several values separated by spaces."],
      ],
      out: `Total downtime: 41.0 min`,
    },
    {
      t: "Dictionaries",
      goal: "Store shift A barrels {\"Char Station 2\": 301, \"Conveyor 3\": 352, \"Hoop Driver 1\": 274}. Print each machine and count, then print \"Top machine:\" with the highest.",
      code: `barrels = {"Char Station 2": 301, "Conveyor 3": 352, "Hoop Driver 1": 274}

for machine, count in barrels.items():
    print(machine, count)

best = max(barrels, key=barrels.get)
print("Top machine:", best)`,
      about: "A dictionary maps keys to values. .items() hands the loop both at once. max() with key=barrels.get compares machines by their counts, so best is Conveyor 3. Highest count is not the same as best performance: each machine has a different ideal rate, which the f-string lesson below accounts for.",
      terms: [
        ["{", "{ key: value }", "A dictionary: looks up a value by its key."],
        ["items", ".items()", "Gives (key, value) pairs for looping."],
        ["max", "max(…, key=)", "Largest item. key= says what to compare by."],
        ["get", ".get", "Looks up a key's value. Passed to max without calling it, so max can call it on each key."],
      ],
      out: `Char Station 2 301
Conveyor 3 352
Hoop Driver 1 274
Top machine: Conveyor 3`,
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
      about: "This is a data-quality check: a good count above the total count means the row was keyed wrong. DictReader uses the header row as keys, and int() converts the text values to numbers before comparing. The sample output comes from a three-row shift_log.csv (columns shift, machine, good, total) where Char Station 2 was keyed as 310 good out of 301.",
      terms: [
        ["import", "import", "Loads a library. csv ships with Python."],
        ["with", "with open() as f:", "Opens a file and closes it automatically when the block ends."],
        ["DictReader", "csv.DictReader", "Reads each row as a dictionary keyed by the header row."],
        ["int", "int()", "Converts text like \"940\" to the number 940. CSV values always arrive as text."],
      ],
      out: `Bad row: {'shift': 'A', 'machine': 'Char Station 2', 'good': '310', 'total': '301'}`,
    },
    {
      t: "Format with f-strings",
      goal: "For Hoop Driver 1 (274 barrels, ideal 55 per hour over 7.5 hours), print \"<machine>: <barrels> of <ideal> barrels (<pct>)\" with ideal to 1 decimal and pct to 1 decimal. Then print the same values as fixed-width columns.",
      code: `machine = "Hoop Driver 1"
barrels = 274
ideal = 55 * 7.5

pct = barrels / ideal
print(f"{machine}: {barrels} of {ideal:.1f} barrels ({pct:.1%})")
print(f"{machine:<16}|{barrels:>6}|{pct:>7.1%}|")`,
      about: "Inside the braces, a colon starts a format code. .1f is 1 decimal, .1% multiplies by 100 and adds the percent sign, < and > align text in a fixed width. Fixed widths are how report columns line up. Ideal is 412.5 barrels: 55 per hour for 7.5 paid hours, the same assumption as the Shift Handoff track.",
      terms: [
        [":.1f", "{x:.1f}", "Fixed-point with 1 decimal."],
        [":.1%", "{x:.1%}", "Percent with 1 decimal. 0.664 prints as 66.4%."],
        ["<16", "{x:<16}", "Left-align in 16 characters. > right-aligns."],
      ],
      out: `Hoop Driver 1: 274 of 412.5 barrels (66.4%)
Hoop Driver 1   |   274|  66.4%|`,
    },
    {
      t: "List comprehensions",
      goal: "From shift A's (fault, minutes) pairs, build a list of just the minutes and a list of fault names lasting 15 minutes or more. Print both, then the total minutes to 2 decimals.",
      code: `faults = [("Jam", 4.62), ("Hoop misfeed", 7.5), ("Low air", 18.5), ("Low air", 15.0), ("Char flare", 18.75)]

minutes = [m for _, m in faults]
long_ones = [name for name, m in faults if m >= 15]

print(minutes)
print(long_ones)
print(round(sum(minutes), 2))`,
      about: "A list comprehension builds a new list in one line: an expression, a for, and an optional if. Each pair unpacks into two names; _ is the usual name for a value you do not need. These are shift A's five faults with the Shift Handoff track's clipped minutes, and 64.37 is that shift's total down time across all three machines.",
      terms: [
        ["for", "[expr for x in items]", "Builds a list from every item."],
        ["if", "… if condition]", "Keeps only the items that pass."],
        ["_", "_", "A throwaway name for a value you will not use."],
        ["sum", "sum()", "Adds up a list of numbers."],
      ],
      out: `[4.62, 7.5, 18.5, 15.0, 18.75]
['Low air', 'Low air', 'Char flare']
64.37`,
    },
    {
      t: "Handle bad data",
      goal: "Add up the barrel readings \"352\", \"301\", \"\", \"274\" and \"n/a\". Skip any that are not whole numbers, printing \"Skipped:\" with the bad value, then print \"Barrels:\" with the total.",
      code: `readings = ["352", "301", "", "274", "n/a"]

total = 0
for text in readings:
    try:
        total += int(text)
    except ValueError:
        print("Skipped:", repr(text))

print("Barrels:", total)`,
      about: "Real logs have gaps and junk. int() raises a ValueError when the text is not a whole number, and without try the whole script would stop at the first bad value. Catching only ValueError still lets any other kind of error stop the script, which is what you want. Printing what was skipped matters: a total that silently drops readings is not defensible. The good readings are shift A's 352, 301 and 274 barrels.",
      terms: [
        ["try", "try:", "Runs the block, watching for errors."],
        ["except", "except ValueError:", "Runs only if that kind of error happened. Name the error you expect."],
        ["repr", "repr(x)", "Shows a value the way Python writes it, so an empty string prints as '' instead of nothing."],
      ],
      out: `Skipped: ''
Skipped: 'n/a'
Barrels: 927`,
    },
    {
      t: "Dates and times",
      goal: "Parse the char flare's start \"2026-11-07 13:41:15\", subtract it from the 14:00 shift end, and print the difference, the same in minutes, and the start as a weekday and time.",
      code: `from datetime import datetime

start = datetime.strptime("2026-11-07 13:41:15", "%Y-%m-%d %H:%M:%S")
shift_end = datetime(2026, 11, 7, 14, 0)

down = shift_end - start
print(down)
print(down.total_seconds() / 60, "min")
print(start.strftime("%a %H:%M"))`,
      about: "strptime reads a date out of text using a format; strftime writes one back out. Subtracting two datetimes gives a timedelta, a length of time. This is Char Station 2's open flare clipped to the shift end, the 18.75 minutes shift A is charged in the Shift Handoff and MES Helper tracks.",
      terms: [
        ["strptime", "datetime.strptime(text, format)", "Parses text into a datetime. %Y-%m-%d %H:%M:%S matches 2026-11-07 13:41:15."],
        ["total_seconds", ".total_seconds()", "A timedelta's length in seconds, with decimals."],
        ["strftime", ".strftime(format)", "Formats a datetime as text. %a is the weekday name."],
      ],
      out: `0:18:45
18.75 min
Sat 13:41`,
    },
    {
      t: "Default arguments",
      goal: "Define pct_of_ideal(barrels, rate_hr, hours=7.5). Print Conveyor 3's 352 barrels at 60 per hour as a 1-decimal percent, then again with hours=8.",
      code: `def pct_of_ideal(barrels, rate_hr, hours=7.5):
    return barrels / (rate_hr * hours)

print(f"{pct_of_ideal(352, 60):.1%}")
print(f"{pct_of_ideal(352, 60, hours=8):.1%}")`,
      about: "A default value is used when the caller leaves that argument out, so the common case stays short. Naming it in the call, hours=8, overrides it and makes the assumption visible. The same 352 barrels read 78.2% against 7.5 paid hours and 73.3% against the full 8: forgetting the break costs almost 5 points, which is why every report should state its hours.",
      terms: [
        ["hours=7.5", "hours=7.5", "A default: used when the caller does not pass hours."],
        ["hours=8", "Keyword argument", "Passes a value by name. Clearer than a bare number, and order does not matter."],
      ],
      out: `78.2%
73.3%`,
    },
    {
      t: "First look at pandas",
      goal: "Build a DataFrame of shift A machine, barrels and rate_hr. Add pct as barrels over rate_hr × 7.5, print it rounded to 3 places, then print the machines under 70% as a list.",
      code: `import pandas as pd

shift = pd.DataFrame({
    "machine": ["Char Station 2", "Conveyor 3", "Hoop Driver 1"],
    "barrels": [301, 352, 274],
    "rate_hr": [50, 60, 55],
})

shift["pct"] = shift["barrels"] / (shift["rate_hr"] * 7.5)
print(shift.round(3))
print(shift.loc[shift["pct"] < 0.70, "machine"].tolist())`,
      about: "A DataFrame is a table: named columns, numbered rows. One line computes pct for every row at once, with no loop. .loc takes a row filter and a column, here every machine under 70%, the Shift Handoff track's BEHIND rule. pandas is the library the DB Pulls, OEE and Shift Handoff tracks are built on.",
      terms: [
        ["DataFrame", "pd.DataFrame({…})", "A table built from a dictionary of columns."],
        ["shift[\"pct\"]", "New column", "Assigning to a new column name computes it for every row."],
        ["loc", ".loc[rows, column]", "Selects rows by a true/false filter and a column by name."],
        ["tolist", ".tolist()", "Turns a pandas column into a plain Python list."],
      ],
      out: `          machine  barrels  rate_hr    pct
0  Char Station 2      301       50  0.803
1      Conveyor 3      352       60  0.782
2   Hoop Driver 1      274       55  0.664
['Hoop Driver 1']`,
    },
  ],
});
