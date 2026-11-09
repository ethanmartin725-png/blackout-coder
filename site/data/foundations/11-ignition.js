// Foundations lane: Ignition scripting (Jython 2.7)
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
// Outputs: node tools/output-checks/ignition/run.mjs (real Jython 2.7, a teaching model of system.*; scenarios in scenarios.mjs)
BC.addLane({
  id: "ignition",
  name: "Ignition",
  lang: "ignition",
  lessons: [
    {
      t: "Print and log",
      goal: "Print \"Shift A is running\", then get a logger named Conveyor3 and write an info, a warn and a debug message.",
      code: `print("Shift A is running")

logger = system.util.getLogger("Conveyor3")
logger.info("Barrel count read")
logger.warn("Hoop Driver 1 is behind target")
logger.debug("only shown when debug logging is on")`,
      about: "print goes to the Script Console while you test, and to a wrapper log file on the gateway, where nobody looks. A logger writes to the gateway's log, where each entry has a level and a name you can filter by. debug is switched off by default, so that line prints nothing. Outputs in this lane come from real Jython 2.7 with a teaching model of system.*; loggers print as LEVEL [name] message.",
      terms: [
        ["print", "print(…)", "Script Console output while testing."],
        ["getLogger", "system.util.getLogger", "A named logger in the gateway log."],
        ["debug", "debug", "Off unless the logger's level is set to debug."],
      ],
      out: `Shift A is running
INFO  [Conveyor3] Barrel count read
WARN  [Conveyor3] Hoop Driver 1 is behind target`,
    },
    {
      t: "Jython is Python 2.7",
      goal: "Print 7 / 2, 7 / 2.0, 7 // 2, then 352 * 100 / 450, and 352 / 450 with one side made a float.",
      code: `print(7 / 2)
print(7 / 2.0)
print(7 // 2)
print(352 * 100 / 450)
print(float(352) / 450)`,
      about: "Ignition scripts run in Jython, a Python 2.7 that runs on Java. In Python 2, dividing two whole numbers drops the remainder: 7 / 2 is 3, and 352 / 450 would be 0. Make one side a float to keep decimals. Another trap: print(\"Barrels:\", 352) prints a tuple, ('Barrels:', 352), so this lane always prints one string. No f-strings either; the verifier refuses both.",
      terms: [
        ["7 / 2", "Whole-number division", "In Python 2.7, 7 / 2 is 3."],
        ["float", "float(352)", "Makes the division keep its decimals."],
        ["//", "//", "Floor division, the same in Python 2 and 3."],
      ],
      out: `3
3.5
3
78
0.782222222222`,
    },
    {
      t: "String formatting",
      goal: "Print Conveyor 3's barrels, target and share with % formatting, then with .format(), then as fixed-width columns.",
      code: `machine = "Conveyor 3"
barrels = 352
target = 450.0

print("%s: %d of %.0f (%.1f%%)" % (machine, barrels, target, barrels / target * 100))
print("{0}: {1} barrels".format(machine, barrels))
print("%-15s|%6d|" % (machine, barrels))`,
      about: "Jython 2.7 has no f-strings, so scripts use % or .format(). %s inserts text, %d a whole number, %.1f a number with one decimal, and %% a percent sign. %-15s pads to 15 characters, left-aligned. target is written 450.0 so the share is worked out in floats.",
      terms: [
        ["%s", "%s / %d / %.1f", "Text, whole number, one decimal."],
        ["%%", "%%", "A literal percent sign."],
        ["format", ".format()", "Fills {0}, {1} in order."],
      ],
      out: `Conveyor 3: 352 of 450 (78.2%)
Conveyor 3: 352 barrels
Conveyor 3     |   352|`,
    },
    {
      t: "Read a tag",
      goal: "Read [default]Conveyor3/Conv_State with readBlocking and print its value, quality and timestamp.",
      code: `path = "[default]Conveyor3/Conv_State"
qv = system.tag.readBlocking([path])[0]

print("value: %s" % qv.value)
print("quality: %s" % qv.quality)
print("timestamp: %s" % system.date.format(qv.timestamp, "yyyy-MM-dd HH:mm:ss"))`,
      about: "readBlocking takes a list of paths and returns a list of qualified values, one per path, so [0] takes the first. A qualified value carries the value, its quality and when it last changed. [default] is the tag provider. Conv_State 1 is running, the code the PLC lessons use. Tag folders in this lane are illustrative.",
      terms: [
        ["readBlocking", "system.tag.readBlocking", "Reads tags and waits for the values."],
        ["[0]", "[0]", "The first qualified value in the list."],
        ["quality", ".quality", "Whether the value can be trusted."],
      ],
      out: `value: 1
quality: Good
timestamp: 2026-11-07 14:05:00`,
    },
    {
      t: "Check the quality",
      goal: "Read Conv_State and a misspelled Conv_Stat. Print the value of each good read, and the quality of each bad one.",
      code: `paths = ["[default]Conveyor3/Conv_State", "[default]Conveyor3/Conv_Stat"]

for path, qv in zip(paths, system.tag.readBlocking(paths)):
    if qv.quality.isGood():
        print("%s = %s" % (path, qv.value))
    else:
        print("%s is %s; value not used" % (path, qv.quality))`,
      about: "A misspelled path does not raise an error: it returns a value of None with a Bad_NotFound quality. Code that skips the quality check quietly treats None as data. Lost PLC communication gives a bad quality too, so always check isGood() before acting on a value. zip pairs each path with its result.",
      terms: [
        ["isGood", "isGood()", "True only for a trustworthy value."],
        ["zip", "zip", "Pairs the paths with their results."],
      ],
      out: `[default]Conveyor3/Conv_State = 1
[default]Conveyor3/Conv_Stat is Bad_NotFound; value not used`,
    },
    {
      t: "Read many tags at once",
      goal: "Build the barrel-count path for each machine, read them all in one readBlocking call, and print each count and the total.",
      code: `machines = ["CharStation2", "Conveyor3", "HoopDriver1"]
paths = ["[default]%s/Barrel_Count/ACC" % m for m in machines]

total = 0
for m, qv in zip(machines, system.tag.readBlocking(paths)):
    print("%s: %d" % (m, qv.value))
    total += qv.value
print("Total: %d" % total)`,
      about: "One call with three paths is one round trip to the tag system; three separate calls are three. Results come back in the same order as the paths, which is what makes zip safe. The counts are shift A's, 927 in all.",
      terms: [
        ["[\"[default]%s/Barrel_Count/ACC\" % m for m in machines]", "List comprehension", "One path per machine."],
        ["total", "Running total", "Adds each count."],
      ],
      out: `CharStation2: 301
Conveyor3: 352
HoopDriver1: 274
Total: 927`,
    },
    {
      t: "Write a tag",
      goal: "Write 55.0 to Conveyor3/Speed_SP, print the write result and the new value, then write to a path that does not exist.",
      code: `results = system.tag.writeBlocking(["[default]Conveyor3/Speed_SP"], [55.0])
print("write: %s" % results[0])
print("now: %s" % system.tag.readBlocking(["[default]Conveyor3/Speed_SP"])[0].value)

bad = system.tag.writeBlocking(["[default]Conveyor3/Speed_Setpoint"], [55.0])
print("wrong path: %s" % bad[0])`,
      about: "writeBlocking takes a list of paths and a list of values and returns one quality per write. A bad path does not raise an error, so check the result. Writing a setpoint from a script should be rare and deliberate; the Line Status Screen track adds a range check first. 60 is Conveyor 3's ideal rate.",
      terms: [
        ["writeBlocking", "system.tag.writeBlocking", "Writes tags and waits for the result."],
        ["results[0]", "Write quality", "Good, or why the write failed."],
      ],
      out: `write: Good
now: 55.0
wrong path: Bad_NotFound`,
    },
    {
      t: "Build tag paths",
      goal: "Write tagPath(machine, tag, provider=\"default\") that turns a machine name into a tag path, and print three paths.",
      code: `def tagPath(machine, tag, provider="default"):
    return "[%s]%s/%s" % (provider, machine.replace(" ", ""), tag)

print(tagPath("Conveyor 3", "Conv_State"))
print(tagPath("Hoop Driver 1", "Air_PSI"))
print(tagPath("Char Station 2", "Barrel_Count/ACC", "edge"))`,
      about: "Building paths in one function means a renamed folder or provider is a one-line change, instead of a search through every script. The folder convention here, the machine name without spaces, is illustrative; use your project's. A default argument covers the usual provider.",
      terms: [
        ["replace", "replace(\" \", \"\")", "Removes the spaces."],
        ["provider=\"default\"", "Default argument", "Used when the caller leaves it out."],
      ],
      out: `[default]Conveyor3/Conv_State
[default]HoopDriver1/Air_PSI
[edge]CharStation2/Barrel_Count/ACC`,
    },
    {
      t: "Lists and dictionaries",
      goal: "Store the ideal rates in a dictionary, print each machine's rate and 7.5-hour target in name order, and look up a machine that is not there with get.",
      code: `rates = {"Conveyor 3": 60, "Hoop Driver 1": 55, "Char Station 2": 50}

for machine in sorted(rates.keys()):
    print("%s: %d per hour, target %.1f" % (machine, rates[machine], rates[machine] * 7.5))

print(rates.get("Hoop Driver 2", "unknown"))`,
      about: "A Python 2.7 dictionary keeps no order, so loop over sorted(keys) for output that is the same every time. get returns a default for a missing key instead of raising a KeyError. The rates are the canonical ideal rates.",
      terms: [
        ["sorted", "sorted(rates.keys())", "The keys in order."],
        ["get", ".get(key, default)", "The value, or the default if missing."],
      ],
      out: `Char Station 2: 50 per hour, target 375.0
Conveyor 3: 60 per hour, target 450.0
Hoop Driver 1: 55 per hour, target 412.5
unknown`,
    },
    {
      t: "Loop over machines",
      goal: "Read each machine's State tag in one call and print its state text from a lookup dictionary.",
      code: `STATE_TEXT = {1: "RUNNING", 2: "JAMMED", 3: "IDLE"}
machines = ["CharStation2", "Conveyor3", "HoopDriver1"]

values = system.tag.readBlocking(["[default]%s/State" % m for m in machines])
for m, qv in zip(machines, values):
    print("%-13s %s" % (m, STATE_TEXT.get(qv.value, "UNKNOWN")))`,
      about: "The same state codes as the PLC lessons. At the end of shift A, Char Station 2 is in state 2 because its char flare is still open. A lookup table is easier to keep right than a chain of if statements, and get with a default covers any code the PLC sends that the table does not know.",
      terms: [
        ["STATE_TEXT", "Lookup table", "Code to text."],
        ["UNKNOWN", "Default", "For a code not in the table."],
      ],
      out: `CharStation2  JAMMED
Conveyor3     RUNNING
HoopDriver1   RUNNING`,
    },
    {
      t: "Dates",
      goal: "Print the gateway time, parse the char flare's start, and print the minutes since then with minutesBetween and with secondsBetween / 60.0. Then print the time 30 minutes from now.",
      code: `now = system.date.now()
print(system.date.format(now, "yyyy-MM-dd HH:mm"))

start = system.date.parse("2026-11-07 13:41:15", "yyyy-MM-dd HH:mm:ss")
print("%d min" % system.date.minutesBetween(start, now))
print(system.date.secondsBetween(start, now) / 60.0)
print(system.date.format(system.date.addMinutes(now, 30), "HH:mm"))`,
      about: "Dates in Ignition are Java Date objects, and system.date works with them. minutesBetween counts whole minutes only, 23, while seconds divided by 60.0 gives 23.75, the open char flare's time down so far at 14:05 on the Shift Handoff report. Format patterns are Java's: HH is the 24-hour clock, mm minutes.",
      terms: [
        ["minutesBetween", "minutesBetween", "Whole minutes only."],
        ["secondsBetween", "secondsBetween", "Seconds; divide by 60.0 for exact minutes."],
        ["addMinutes", "addMinutes", "A new date, minutes later."],
      ],
      out: `2026-11-07 14:05
23 min
23.75
14:35`,
    },
    {
      t: "Which shift is it?",
      goal: "Write shiftFor(date) that returns A from 06:00, B from 14:00 and C from 22:00, and print it for now, an hour from now and nine hours from now.",
      code: `def shiftFor(d):
    h = system.date.getHour24(d)
    if 6 <= h < 14:
        return "A"
    elif 14 <= h < 22:
        return "B"
    return "C"

now = system.date.now()
print(shiftFor(now))
print(shiftFor(system.date.addHours(now, 1)))
print(shiftFor(system.date.addHours(now, 9)))`,
      about: "At 14:05 it is already shift B, which is why the Shift Handoff track reports the shift that just ended rather than the current one. Shift C crosses midnight, so it is the fall-through case: anything not A or B. 6 <= h < 14 is Python's chained comparison.",
      terms: [
        ["getHour24", "getHour24", "The hour, 0 to 23."],
        ["6 <= h < 14", "Chained comparison", "Both comparisons at once."],
      ],
      out: `B
B
C`,
    },
    {
      t: "Count rows with a scalar query",
      goal: "Count each machine's faults in fault_log with runScalarPrepQuery and a ? parameter.",
      code: `query = "SELECT COUNT(*) FROM fault_log WHERE machine = ?"

for machine in ["Char Station 2", "Conveyor 3", "Hoop Driver 1"]:
    n = system.db.runScalarPrepQuery(query, [machine], "PlantDB")
    print("%s: %d faults" % (machine, n))`,
      about: "runScalarPrepQuery returns the first column of the first row, the right call for a COUNT. The ? is filled from the list, so the machine name never becomes part of the SQL text. PlantDB is the database connection name. These are the DB Pulls track's 47 faults; the outputs run real T-SQL on SQL Server.",
      terms: [
        ["runScalarPrepQuery", "runScalarPrepQuery", "One value back."],
        ["?", "? parameter", "Filled safely from the list."],
        ["\"PlantDB\"", "Connection name", "Which database to query."],
      ],
      out: `Char Station 2: 10 faults
Conveyor 3: 19 faults
Hoop Driver 1: 18 faults`,
    },
    {
      t: "Query rows",
      goal: "Select the faults that started since 06:00 today, oldest first, and print how many there are and each one's time, machine and fault.",
      code: `query = """SELECT machine, fault, start_ts
FROM fault_log
WHERE start_ts >= ?
ORDER BY start_ts"""

since = system.date.parse("2026-11-07 06:00:00", "yyyy-MM-dd HH:mm:ss")
rows = system.db.runPrepQuery(query, [since], "PlantDB")
print("%d rows" % len(rows))
for row in rows:
    print("%s  %-14s %s" % (system.date.format(row["start_ts"], "HH:mm:ss"), row["machine"], row["fault"]))`,
      about: "runPrepQuery returns a PyDataSet: loop over it and read each column by name. A date passes straight in as a parameter. The database holds faults up to 10:15, the DB Pulls track's \"now\", so shift A so far is the 09:08 jam and the 10:09 misfeed. Triple quotes let the SQL span lines.",
      terms: [
        ["runPrepQuery", "runPrepQuery", "Rows back, as a PyDataSet."],
        ["row[\"start_ts\"]", "Column by name", "One value from the row."],
        ["len", "len(rows)", "The number of rows."],
      ],
      out: `2 rows
09:08:52  Conveyor 3     Jam
10:09:40  Hoop Driver 1  Hoop misfeed`,
    },
    {
      t: "Insert with parameters",
      goal: "Insert a shift A handoff note for Hoop Driver 1 with runPrepUpdate and ? parameters, then print the rows inserted and the notes now in the table.",
      code: `query = "INSERT INTO handoff_note (shift_date, shift, machine, author, note, created_ts) VALUES (?, ?, ?, ?, ?, ?)"
now = system.date.now()
args = [system.date.midnight(now), "A", "Hoop Driver 1", "J. Ruiz", "Low air twice. Compressor tech called.", now]

n = system.db.runPrepUpdate(query, args, "PlantDB")
print("%d row inserted" % n)
print("%d notes" % system.db.runScalarPrepQuery("SELECT COUNT(*) FROM handoff_note", [], "PlantDB"))`,
      about: "runPrepUpdate runs an INSERT, UPDATE or DELETE and returns how many rows it changed. Every value goes in the argument list, in the order of the ? marks. midnight gives the date with no time, for the DATE column. The note is J. Ruiz's from the Plant Board; the table started with the two notes from shift C.",
      terms: [
        ["runPrepUpdate", "runPrepUpdate", "Changes rows; returns how many."],
        ["midnight", "midnight", "The date at 00:00, for a DATE column."],
        ["args", "Argument list", "One value per ?, in order."],
      ],
      out: `1 row inserted
3 notes`,
    },
    {
      t: "Apostrophes and parameters",
      goal: "Insert a note containing an apostrophe and a double quote, then read the newest note back and print it.",
      code: `note = "Operator's check: 26\\" hoops low"
query = "INSERT INTO handoff_note (shift_date, shift, machine, author, note, created_ts) VALUES (?, ?, ?, ?, ?, ?)"
now = system.date.now()

system.db.runPrepUpdate(query, [system.date.midnight(now), "A", None, "J. Ruiz", note, now], "PlantDB")
print(system.db.runScalarPrepQuery("SELECT TOP 1 note FROM handoff_note ORDER BY note_id DESC", [], "PlantDB"))`,
      about: "Pasted into SQL text, the apostrophe in Operator's would end the string early and break the query; a crafted note could change it entirely. As a parameter, the text arrives as data and is stored exactly as typed. None becomes NULL, for a note that is not about one machine. Ignition's runQuery and runUpdateQuery take SQL text only; avoid them for anything an operator typed.",
      terms: [
        ["None", "None", "Stored as NULL."],
        ["note", "Typed text", "Any characters, safely, as a parameter."],
      ],
      out: `Operator's check: 26" hoops low`,
    },
    {
      t: "Transactions",
      goal: "Write closeAndNote(machine, note) that closes the machine's open fault and adds a handoff note in one transaction, rolling back on any error. Call it for Hoop Driver 1 with a missing note, then with a good one.",
      code: `import java.lang

def closeAndNote(machine, note):
    now = system.date.now()
    tx = system.db.beginTransaction("PlantDB")
    try:
        system.db.runPrepUpdate("UPDATE fault_log SET end_ts = ? WHERE machine = ? AND end_ts IS NULL", [now, machine], tx=tx)
        system.db.runPrepUpdate("INSERT INTO handoff_note (shift_date, shift, machine, author, note, created_ts) VALUES (?, ?, ?, ?, ?, ?)", [system.date.midnight(now), "A", machine, "J. Ruiz", note, now], tx=tx)
        system.db.commitTransaction(tx)
        print("%s: closed and noted" % machine)
    except (Exception, java.lang.Exception):
        system.db.rollbackTransaction(tx)
        print("%s: rolled back" % machine)
    finally:
        system.db.closeTransaction(tx)

closeAndNote("Hoop Driver 1", None)
closeAndNote("Hoop Driver 1", "Misfeed cleared, feed rail wiped.")`,
      about: "Two writes that belong together go in one transaction: either both happen or neither does. The first call has no note, which the table refuses, so its fault update is rolled back with it and the misfeed stays open. The second succeeds and closes the misfeed at 10:17:10, as on the Shift Handoff report. Database errors arrive as Java exceptions, which a plain except Exception does not catch in Jython; catching both is the safe habit. finally always closes the transaction.",
      terms: [
        ["beginTransaction", "beginTransaction", "Starts a transaction; returns its id."],
        ["tx=tx", "tx=tx", "Runs the statement inside the transaction."],
        ["rollbackTransaction", "rollbackTransaction", "Undoes everything since begin."],
        ["java.lang.Exception", "Java exceptions", "Database errors come from Java."],
      ],
      out: `Hoop Driver 1: rolled back
Hoop Driver 1: closed and noted
machine        fault         start_ts             end_ts
Hoop Driver 1  Hoop misfeed  2026-11-07 10:09:40  2026-11-07 10:17:10`,
    },
    {
      t: "Build a dataset",
      goal: "Build a dataset of shift A's machines, barrels and targets with toDataSet, then print it, its column names and Conveyor 3's barrels.",
      code: `headers = ["machine", "barrels", "target"]
rows = [
    ["Char Station 2", 301, 375.0],
    ["Conveyor 3", 352, 450.0],
    ["Hoop Driver 1", 274, 412.5],
]

ds = system.dataset.toDataSet(headers, rows)
print(ds)
print(ds.getColumnNames())
print(ds.getValueAt(1, "barrels"))`,
      about: "A dataset is Ignition's table type: what a Table component shows, a query returns, and a dataset tag holds. toDataSet builds one from a header list and a list of rows. Printing a dataset only shows its size. Rows and columns are numbered from 0, and a column can also be named.",
      terms: [
        ["toDataSet", "system.dataset.toDataSet", "Headers and rows into a dataset."],
        ["getValueAt", "getValueAt(row, col)", "One cell."],
      ],
      out: `Dataset [3R x 3C]
[machine, barrels, target]
352`,
    },
    {
      t: "Loop over a dataset",
      goal: "Convert the dataset with toPyDataSet, print each machine's share of target, and print the row and column counts.",
      code: `ds = system.dataset.toDataSet(["machine", "barrels", "target"], [
    ["Char Station 2", 301, 375.0],
    ["Conveyor 3", 352, 450.0],
    ["Hoop Driver 1", 274, 412.5],
])

py = system.dataset.toPyDataSet(ds)
for row in py:
    print("%s: %.1f%%" % (row["machine"], row["barrels"] / row["target"] * 100))
print("%d rows, %d columns" % (py.getRowCount(), py.getColumnCount()))`,
      about: "A plain dataset needs getValueAt for every cell; a PyDataSet can be looped with for and read by column name, which is far easier to read. The targets are floats, so the division keeps its decimals even in Python 2.7.",
      terms: [
        ["toPyDataSet", "toPyDataSet", "A dataset you can loop over."],
        ["row[\"machine\"]", "Column by name", "One value from the row."],
      ],
      out: `Char Station 2: 80.3%
Conveyor 3: 78.2%
Hoop Driver 1: 66.4%
3 rows, 3 columns`,
    },
    {
      t: "Python and Java exceptions",
      goal: "Catch a ValueError from int(\"n/a\"), then catch the Java exception from a query on a misspelled table.",
      code: `import java.lang

for text in ["352", "n/a"]:
    try:
        print(int(text))
    except ValueError:
        print("not a number: %s" % text)

try:
    system.db.runScalarPrepQuery("SELECT COUNT(*) FROM fault_logg", [], "PlantDB")
except java.lang.Exception as e:
    print("database error: %s" % e.getMessage())`,
      about: "Errors from Python code, like int(\"n/a\"), are Python exceptions. Errors from Ignition and the database come from Java, and in Jython they are not caught by except Exception. Name java.lang.Exception to catch them. The message is SQL Server's own; in Ignition it arrives wrapped in a longer gateway message.",
      terms: [
        ["ValueError", "ValueError", "Python's error for a bad value."],
        ["java.lang.Exception", "java.lang.Exception", "Catches errors raised by Java."],
        ["getMessage", "getMessage()", "The Java error's message."],
      ],
      out: `352
not a number: n/a
database error: Invalid object name 'fault_logg'.`,
    },
    {
      t: "JSON",
      goal: "Encode the shift A status as JSON with jsonEncode, print it, decode it back and print Char Station 2's status.",
      code: `status = {
    "shift": "A",
    "machines": {"Char Station 2": "DOWN", "Conveyor 3": "OK", "Hoop Driver 1": "BEHIND"},
    "openFault": True,
}

text = system.util.jsonEncode(status)
print(text)
back = system.util.jsonDecode(text)
print(back["machines"]["Char Station 2"])`,
      about: "jsonEncode turns Python data into JSON text, for a web API, a JSON tag or a file, and jsonDecode reads it back. True becomes true. The statuses are the Shift Handoff track's. This model sorts the keys so outputs are repeatable; Ignition's own key order may differ, so never depend on it.",
      terms: [
        ["jsonEncode", "system.util.jsonEncode", "Python data to JSON text."],
        ["jsonDecode", "system.util.jsonDecode", "JSON text to Python data."],
      ],
      out: `{"machines":{"Char Station 2":"DOWN","Conveyor 3":"OK","Hoop Driver 1":"BEHIND"},"openFault":true,"shift":"A"}
DOWN`,
    },
    {
      t: "A library function",
      goal: "Write oee(a, p, q) and rating(score), as a project library script would hold them, and print Hoop Driver 1's OEE and rating.",
      code: `def oee(availability, performance, quality):
    return availability * performance * quality

def rating(score):
    if score >= 0.85:
        return "World class"
    if score >= 0.60:
        return "Typical"
    return "Needs work"

score = oee(0.988, 0.749, 0.985)
print("%.1f%% %s" % (score * 100, rating(score)))`,
      about: "Logic used in more than one place belongs in a project library script. Saved in a script named plant, these are called from anywhere in the project as plant.oee(...) and plant.rating(...), and a fix is made once. The factors are Hoop Driver 1's week: 72.9%, the same in every lane.",
      terms: [
        ["def", "def", "Defines a function."],
        ["return", "return", "Hands the result back."],
      ],
      out: `72.9% Typical`,
    },
    {
      t: "Tag change script",
      goal: "Write a valueChanged script that ignores the initial change and logs the tag path with the old and new values.",
      code: `def valueChanged(tag, tagPath, previousValue, currentValue, initialChange, missedEvents):
    if initialChange:
        return
    logger = system.util.getLogger("Conveyor3")
    logger.info("%s: %s -> %s" % (tagPath, previousValue.value, currentValue.value))`,
      about: "Ignition calls valueChanged on a tag's value change event with the old and new qualified values. When the tag first loads, or the gateway restarts, initialChange is true; that is not a real change, so a script that logs or writes must skip it. The output fires three events: the load, idle to running, running to jammed.",
      terms: [
        ["valueChanged", "valueChanged", "Runs on every change of this tag."],
        ["initialChange", "initialChange", "True on first load: not a real event."],
        ["previousValue", "previousValue / currentValue", "Qualified values before and after."],
      ],
      out: `INFO  [Conveyor3] [default]Conveyor3/Conv_State: 3 -> 1
INFO  [Conveyor3] [default]Conveyor3/Conv_State: 1 -> 2`,
    },
    {
      t: "Guard the quality",
      goal: "Write a valueChanged script for Hoop Driver 1's air pressure that skips the initial change and bad qualities, notes missed events, and warns below 80 psi.",
      code: `def valueChanged(tag, tagPath, previousValue, currentValue, initialChange, missedEvents):
    if initialChange:
        return
    logger = system.util.getLogger("Air")
    if not currentValue.quality.isGood():
        logger.warn("skipped: quality %s" % currentValue.quality)
        return
    if missedEvents:
        logger.warn("events were missed before this one")
    if currentValue.value < 80:
        logger.warn("low air: %.1f psi" % currentValue.value)`,
      about: "When the PLC drops off the network the tag goes bad with no usable value, and comparing None with 80 would act on garbage. Check quality first. missedEvents is true when changes came faster than scripts could run and some were dropped; the latest value is still right, but a count of events would not be. 80 psi is the low-air limit from the PLC lessons.",
      terms: [
        ["missedEvents", "missedEvents", "Some changes were dropped."],
        ["isGood", "isGood()", "Only act on good values."],
      ],
      out: `WARN  [Air] skipped: quality Bad_Disconnected
WARN  [Air] events were missed before this one
WARN  [Air] low air: 78.0 psi`,
    },
    {
      t: "Hourly snapshot for every machine",
      goal: "In a gateway timer script, read each machine's count and state and insert one count_log row per machine with the gateway time.",
      code: `machines = [("Char Station 2", "CharStation2"), ("Conveyor 3", "Conveyor3"), ("Hoop Driver 1", "HoopDriver1")]
query = "INSERT INTO count_log (machine, barrels, state, ts) VALUES (?, ?, ?, ?)"
now = system.date.now()

for name, folder in machines:
    count, state = [qv.value for qv in system.tag.readBlocking(["[default]%s/Barrel_Count/ACC" % folder, "[default]%s/State" % folder])]
    system.db.runPrepUpdate(query, [name, count, state, now], "PlantDB")`,
      about: "A gateway timer script runs on the server on a fixed delay, here once an hour, whether or not any screen is open. One now for all three rows means they share a timestamp, so a report can group them. The output runs it at 14:00, the end of shift A, with the shift's final counts.",
      terms: [
        ["now", "One timestamp", "All rows in this run share it."],
        ["count, state", "Unpacking", "Two values from one list."],
      ],
      out: `machine         barrels  state  ts
Char Station 2  301      2      2026-11-07 14:00:00
Conveyor 3      352      1      2026-11-07 14:00:00
Hoop Driver 1   274      1      2026-11-07 14:00:00`,
    },
    {
      t: "Rate across a rollover",
      goal: "Write madeSince(before, now, rollover=65536) that counts barrels between two counter readings even after a rollover, and print three cases.",
      code: `def madeSince(before, now, rollover=65536):
    return (now - before) % rollover

print(madeSince(305, 352))
print(madeSince(65530, 3))
print("%.1f per hour" % (madeSince(65530, 41) * 60.0 / 60))`,
      about: "A 16-bit PLC counter rolls over after 65535, and a script that subtracts readings would then see a huge negative number. Python's % always returns a positive remainder, so the difference wraps correctly. 47 barrels between readings taken 60 minutes apart is 47.0 per hour, about shift A's 46.9.",
      terms: [
        ["%", "% rollover", "Wraps the difference into 0 to 65535."],
        ["rollover=65536", "16-bit range", "The counter wraps after 65535."],
      ],
      out: `47
9
47.0 per hour`,
    },
    {
      t: "Machine from the tag path",
      goal: "Write machineFromPath(tagPath) that takes the folder from a tag path and maps it to the machine's display name, and print it for three paths.",
      code: `NAMES = {"Conveyor3": "Conveyor 3", "HoopDriver1": "Hoop Driver 1", "CharStation2": "Char Station 2"}

def machineFromPath(tagPath):
    folder = str(tagPath).split("]")[1].split("/")[0]
    return NAMES.get(folder, folder)

for p in ["[default]Conveyor3/Jam_Fault", "[default]HoopDriver1/Air_PSI", "[default]Press4/Jam_Fault"]:
    print(machineFromPath(p))`,
      about: "One tag event script, defined once in a UDT, can serve every machine if it works out which machine it is from tagPath instead of having the name typed in. str() turns Ignition's tag path object into text. An unknown folder falls back to the folder name rather than failing. Press4 is a made-up machine.",
      terms: [
        ["split", "split(\"]\")", "Cuts the provider off."],
        ["str(tagPath)", "str()", "The tag path as text."],
      ],
      out: `Conveyor 3
Hoop Driver 1
Press4`,
    },
    {
      t: "Deadband before logging",
      goal: "Write a valueChanged script that logs Hoop Driver 1's air pressure only when it has moved 2 psi or more from the last logged value, kept in a memory tag.",
      code: `LAST = "[default]HoopDriver1/Air_PSI_Logged"

def valueChanged(tag, tagPath, previousValue, currentValue, initialChange, missedEvents):
    if initialChange or not currentValue.quality.isGood():
        return
    psi = currentValue.value
    last = system.tag.readBlocking([LAST])[0].value
    if abs(psi - last) >= 2.0:
        system.tag.writeBlocking([LAST], [psi])
        system.util.getLogger("Air").info("logged %.1f psi" % psi)`,
      about: "Air pressure moves every few seconds as cylinders fire. Logging every change floods the database; logging only moves of 2 psi or more keeps the shape of the trend at a fraction of the rows. The last logged value lives in a memory tag, because a script keeps nothing between runs. The 2 psi deadband is illustrative.",
      terms: [
        ["abs", "abs(psi - last)", "How far it moved, either way."],
        ["LAST", "Memory tag", "Remembers the last logged value."],
      ],
      out: `INFO  [Air] logged 89.9 psi
INFO  [Air] logged 92.6 psi`,
    },
    {
      t: "Count events in a memory tag",
      goal: "Write a valueChanged script on Jam_Fault that adds 1 to a Jam_Count memory tag on each jam start, and a shift-change function that saves and clears it.",
      code: `COUNT = "[default]Conveyor3/Jam_Count"

def valueChanged(tag, tagPath, previousValue, currentValue, initialChange, missedEvents):
    if initialChange or not currentValue.quality.isGood():
        return
    if currentValue.value and not previousValue.value:
        n = system.tag.readBlocking([COUNT])[0].value
        system.tag.writeBlocking([COUNT], [n + 1])

def shiftChange():
    n = system.tag.readBlocking([COUNT])[0].value
    system.tag.writeBlocking([COUNT], [0])
    return n`,
      about: "Only a change from off to on is a new jam; a change from on to off is the jam clearing. The count lives in a memory tag so a screen can show it and it survives between script runs. shiftChange returns the shift's count before clearing it, so nothing is lost, the same save-then-clear order as the ladder lesson.",
      terms: [
        ["not previousValue.value", "Rising edge", "Off before, on now."],
        ["shiftChange", "Save, then clear", "Returns the count before zeroing it."],
      ],
      out: `Jam_Count: 2
shift change saved 2
Jam_Count: 0`,
    },
    {
      t: "Shift summary",
      goal: "At the end of shift A, read each machine's count, compute its share of target, print a summary line each, and save the summary as one handoff note.",
      code: `RATES = {"Char Station 2": 50, "Conveyor 3": 60, "Hoop Driver 1": 55}
FOLDERS = {"Char Station 2": "CharStation2", "Conveyor 3": "Conveyor3", "Hoop Driver 1": "HoopDriver1"}

now = system.date.now()
machines = sorted(RATES.keys())
counts = system.tag.readBlocking(["[default]%s/Barrel_Count/ACC" % FOLDERS[m] for m in machines])
lines = []
for m, qv in zip(machines, counts):
    share = qv.value / (RATES[m] * 7.5)
    lines.append("%s %d (%.1f%%)" % (m, qv.value, share * 100))
    print(lines[-1])

query = "INSERT INTO handoff_note (shift_date, shift, machine, author, note, created_ts) VALUES (?, ?, ?, ?, ?, ?)"
system.db.runPrepUpdate(query, [system.date.midnight(now), "A", None, "Shift summary", "; ".join(lines), now], "PlantDB")`,
      about: "The lane in one script: read tags in one call, compute from them, and write the result with parameters. RATES[m] * 7.5 is a float, so the share keeps its decimals in Jython 2.7. The shares are shift A's: 80.3%, 78.2% and 66.4%, Hoop Driver 1 BEHIND. The note goes in the same table the Shift Handoff track reads.",
      terms: [
        ["\"; \".join(lines)", "join", "One note from the three lines."],
        ["RATES[m] * 7.5", "Float target", "Keeps the division exact in Jython."],
      ],
      out: `Char Station 2 301 (80.3%)
Conveyor 3 352 (78.2%)
Hoop Driver 1 274 (66.4%)
shift  author         note
A      Shift summary  Char Station 2 301 (80.3%); Conveyor 3 352 (78.2%); Hoop Driver 1 274 (66.4%)`,
    },
  ],
});
