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
    {
      t: "Sort with a key",
      goal: "Sort the fault Pareto minutes largest first. For each fault print its minutes, the running percent of the total, and \"vital\" if the running total before it was under 80%.",
      code: `pareto = {"Jam": 65.7, "Low air": 87.4, "E-stop": 10.8, "Char flare": 70.0, "Hoop misfeed": 66.6}
total = sum(pareto.values())

running = 0
for fault, minutes in sorted(pareto.items(), key=lambda item: item[1], reverse=True):
    vital = running / total < 0.80
    running += minutes
    line = f"{fault:<13}{minutes:>6.1f}{running / total:>7.1%}"
    if vital:
        line += "  vital"
    print(line)`,
      about: "sorted() takes a key: a small function that says what to sort by. Here each item is a (fault, minutes) pair and the key picks the minutes. The minutes are the DB Pulls track's Pareto across all 47 faults, 300.5 in total. A fault counts as vital when the line stood under 80% before it, the same rule and the same four faults as that track's pandas step.",
      terms: [
        ["sorted", "sorted(…, key=…)", "Returns a new sorted list. key says what to compare."],
        ["lambda", "lambda item: item[1]", "A one-line function with no name. Here it returns the minutes."],
        ["reverse=True", "reverse=True", "Largest first."],
        ["running", "Running total", "Minutes so far, used for the cumulative percent."],
      ],
      out: `Low air        87.4  29.1%  vital
Char flare     70.0  52.4%  vital
Hoop misfeed   66.6  74.5%  vital
Jam            65.7  96.4%  vital
E-stop         10.8 100.0%`,
    },
    {
      t: "zip and enumerate",
      goal: "Pair each machine with its shift A barrels and target, compute the share of target, then print the machines ranked best first as \"1. <machine> <pct>\".",
      code: `machines = ["Char Station 2", "Conveyor 3", "Hoop Driver 1"]
barrels = [301, 352, 274]
targets = [375, 450, 412.5]

shares = [b / t for b, t in zip(barrels, targets)]
ranked = sorted(zip(machines, shares), key=lambda pair: pair[1], reverse=True)

for rank, (machine, share) in enumerate(ranked, start=1):
    print(f"{rank}. {machine:<15}{share:.1%}")`,
      about: "zip walks several lists side by side, one item from each at a time, so the barrels and targets stay lined up. Each target is the ideal rate times 7.5 paid hours: 50, 60 and 55 per hour. enumerate numbers the items as you loop; start=1 makes the ranks read 1, 2, 3 instead of starting at 0.",
      terms: [
        ["zip", "zip(a, b)", "Pairs items from each list by position."],
        ["enumerate", "enumerate(…, start=1)", "Gives a count with each item, starting from 1 here."],
        ["(machine, share)", "Unpacking", "Splits each (machine, share) pair into two names."],
      ],
      out: `1. Char Station 2 80.3%
2. Conveyor 3     78.2%
3. Hoop Driver 1  66.4%`,
    },
    {
      t: "Group and total with pandas",
      goal: "Put shift A's five faults in a DataFrame. Group by machine to get the number of faults and total minutes, largest first, then print the total for Hoop Driver 1.",
      code: `import pandas as pd

faults = pd.DataFrame({
    "machine": ["Conveyor 3", "Hoop Driver 1", "Hoop Driver 1", "Hoop Driver 1", "Char Station 2"],
    "fault": ["Jam", "Hoop misfeed", "Low air", "Low air", "Char flare"],
    "minutes": [4.62, 7.5, 18.5, 15.0, 18.75],
})

by_machine = faults.groupby("machine")["minutes"].agg(["count", "sum"])
by_machine = by_machine.sort_values("sum", ascending=False)
print(by_machine)
print(by_machine.loc["Hoop Driver 1", "sum"])`,
      about: "groupby splits the rows by machine, agg runs count and sum on each group, and the result has one row per machine. These are the Shift Handoff track's down minutes: 41.00, 18.75 and 4.62, with the open char flare clipped at the 14:00 shift end. The DB Pulls track's fault-by-shift pivot is the same idea with two keys.",
      terms: [
        ["groupby", "groupby(\"machine\")", "Splits the rows into one group per machine."],
        ["agg", "agg([\"count\", \"sum\"])", "Runs each summary on every group."],
        ["sort_values", "sort_values(\"sum\", …)", "Orders the rows by a column."],
        ["loc", "loc[row, column]", "Looks up one value by its row label and column."],
      ],
      out: `                count    sum
machine                     
Hoop Driver 1       3  41.00
Char Station 2      1  18.75
Conveyor 3          1   4.62
41.0`,
    },
    {
      t: "Split a text line",
      goal: "Split the line \" Conveyor 3 | JAM | 2026-11-07 09:08:52 | 4.62 \" on \"|\", strip the spaces, and print the machine, the fault code in title case, the time of day, and the minutes plus 1.",
      code: `line = " Conveyor 3 | JAM | 2026-11-07 09:08:52 | 4.62 "

parts = [p.strip() for p in line.split("|")]
machine, code, start, minutes = parts
minutes = float(minutes)

print(parts)
print(machine, code.title(), start[11:], minutes + 1)`,
      about: "Text from a scanner, a log file or a serial device arrives as one string. split cuts it into a list at each separator, strip trims the spaces around each piece, and unpacking names the four pieces at once. Everything is still text until float() converts it: \"4.62\" + 1 is an error, 4.62 + 1 is 5.62. start[11:] slices from the 12th character, the time.",
      terms: [
        ["split", "split(\"|\")", "Cuts a string into a list at each separator."],
        ["strip", "strip()", "Removes spaces and line breaks from both ends."],
        ["float", "float()", "Turns text such as \"4.62\" into a number."],
        ["start[11:]", "Slice", "Characters from position 11 to the end."],
      ],
      out: `['Conveyor 3', 'JAM', '2026-11-07 09:08:52', '4.62']
Conveyor 3 Jam 09:08:52 5.62`,
    },
    {
      t: "Write a CSV file",
      goal: "Write shift A's machine, barrels and target to shift_summary.csv with a header row, then read the file back and print it.",
      code: `import csv

rows = [
    {"machine": "Char Station 2", "barrels": 301, "target": 375},
    {"machine": "Conveyor 3", "barrels": 352, "target": 450},
    {"machine": "Hoop Driver 1", "barrels": 274, "target": 412.5},
]

with open("shift_summary.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["machine", "barrels", "target"])
    writer.writeheader()
    writer.writerows(rows)

with open("shift_summary.csv") as f:
    print(f.read())`,
      about: "DictWriter writes one line per dictionary, in the column order given by fieldnames, and adds quotes only where a value needs them. Open the file with newline=\"\": without it, Windows gets a blank line between rows. The with block closes the file when it ends, so the read below sees everything written.",
      terms: [
        ["DictWriter", "csv.DictWriter", "Writes dictionaries as CSV rows."],
        ["fieldnames", "fieldnames=[…]", "The columns and their order."],
        ["writeheader", "writeheader()", "Writes the header row."],
        ["newline=\"\"", "newline=\"\"", "Lets the csv module control line endings."],
      ],
      out: `machine,barrels,target
Char Station 2,301,375
Conveyor 3,352,450
Hoop Driver 1,274,412.5`,
    },
    {
      t: "JSON in and out",
      goal: "Build the shift A status as a dictionary, turn it into JSON text and print it. Then read it back and print Char Station 2's status and whether a fault is open.",
      code: `import json

status = {
    "shift": "A",
    "machines": {"Char Station 2": "DOWN", "Conveyor 3": "OK", "Hoop Driver 1": "BEHIND"},
    "open_fault": True,
    "note": None,
}

text = json.dumps(status)
print(text)

back = json.loads(text)
print(back["machines"]["Char Station 2"], back["open_fault"])`,
      about: "JSON is the text format web APIs, MES systems and Ignition's web endpoints exchange. dumps turns Python data into JSON text and loads turns it back. Look at the printed text: True became true and None became null, JSON's spellings. The statuses are the Shift Handoff track's: the char flare is still open at 14:05.",
      terms: [
        ["dumps", "json.dumps", "Python data to JSON text."],
        ["loads", "json.loads", "JSON text back to Python data."],
        ["None", "None → null", "Python's None is written null in JSON; True is written true."],
      ],
      out: `{"shift": "A", "machines": {"Char Station 2": "DOWN", "Conveyor 3": "OK", "Hoop Driver 1": "BEHIND"}, "open_fault": true, "note": null}
DOWN True`,
    },
    {
      t: "A class for a machine",
      goal: "Define a Machine dataclass with name and rate_hr, and methods target(hours=7.5) and share(barrels). Print each machine's target and shift A share.",
      code: `from dataclasses import dataclass

@dataclass
class Machine:
    name: str
    rate_hr: float

    def target(self, hours=7.5):
        return self.rate_hr * hours

    def share(self, barrels):
        return barrels / self.target()

plant = [Machine("Conveyor 3", 60), Machine("Hoop Driver 1", 55), Machine("Char Station 2", 50)]
barrels = {"Conveyor 3": 352, "Hoop Driver 1": 274, "Char Station 2": 301}

for m in plant:
    print(f"{m.name:<15}{m.target():>6}{m.share(barrels[m.name]):>7.1%}")
print(plant[0])`,
      about: "A class bundles data with the functions that use it. @dataclass writes the setup code for you: Machine(\"Conveyor 3\", 60) stores the name and rate, and printing one shows its fields. self is the machine the method was called on. The rates are the canonical ideal rates, so the targets are 450, 412.5 and 375 barrels. The type hints are notes, not checks: rate_hr=60 stays a whole number, as the last line shows.",
      terms: [
        ["@dataclass", "@dataclass", "Generates the code that stores the fields."],
        ["self", "self", "The object the method was called on."],
        ["class", "class Machine:", "Defines a new type of object."],
        ["rate_hr: float", "Field", "A value every Machine holds, with its type."],
      ],
      out: `Conveyor 3      450.0  78.2%
Hoop Driver 1   412.5  66.4%
Char Station 2  375.0  80.3%
Machine(name='Conveyor 3', rate_hr=60)`,
    },
    {
      t: "Query with parameters",
      goal: "In an in-memory SQLite database, create fault_log, insert shift A's five faults with ? parameters, then select Hoop Driver 1's faults longest first.",
      code: `import sqlite3

con = sqlite3.connect(":memory:")
con.execute("CREATE TABLE fault_log (machine TEXT, fault TEXT, minutes REAL)")

faults = [
    ("Conveyor 3", "Jam", 4.62),
    ("Hoop Driver 1", "Hoop misfeed", 7.5),
    ("Hoop Driver 1", "Low air", 18.5),
    ("Hoop Driver 1", "Low air", 15.0),
    ("Char Station 2", "Char flare", 18.75),
]
con.executemany("INSERT INTO fault_log VALUES (?, ?, ?)", faults)

query = "SELECT fault, minutes FROM fault_log WHERE machine = ? ORDER BY minutes DESC"
for row in con.execute(query, ("Hoop Driver 1",)):
    print(row)
con.close()`,
      about: "Each ? is a placeholder; the values travel separately from the SQL text, so a value can never change the query. Paste a value into the text instead and a machine name with an apostrophe breaks it, or a crafted one rewrites it. SQLite is built into Python, so this runs anywhere; the plant code uses pyodbc against SQL Server with the same ? style, and only the connect line changes.",
      terms: [
        ["?", "? placeholder", "Where a value goes. The value is passed separately."],
        ["executemany", "executemany", "Runs one statement once for each row in a list."],
        ["(\"Hoop Driver 1\",)", "One-item tuple", "The trailing comma makes it a tuple, which execute expects."],
        ["connect", "sqlite3.connect", "Opens a database. \":memory:\" is a throwaway one."],
      ],
      out: `('Low air', 18.5)
('Low air', 15.0)
('Hoop misfeed', 7.5)`,
    },
  ],
});
