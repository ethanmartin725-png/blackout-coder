# Source for site/data/tracks/06-mes.js. Edit lessons here, then run:  python3 build6.py
# build6.py compiles and runs the C# (run6.mjs), pastes the real output into each step, and writes the JS file.

TRACK = {
    "id": "t-mes",
    "name": "MES Helper",
    "sub": "A .NET console tool that turns the shift's PLC faults into coded MES downtime events and a shift summary",
}

L = []

L.append(dict(
    lang="sql", file="schema_mes.sql", t="Create mes_downtime_event",
    goal="Create mes_downtime_event: auto-numbered event_id, machine, reason_code, start_ts, end_ts, minutes as DECIMAL(9,2), posted_ts defaulting to now, and a unique constraint on machine + start_ts.",
    code='''CREATE TABLE mes_downtime_event (
    event_id INT IDENTITY(1,1) PRIMARY KEY,
    machine VARCHAR(50) NOT NULL,
    reason_code VARCHAR(20) NOT NULL,
    start_ts DATETIME NOT NULL,
    end_ts DATETIME NOT NULL,
    minutes DECIMAL(9,2) NOT NULL,
    posted_ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_mes_event UNIQUE (machine, start_ts)
);''',
    about="This is the MES side: one row per downtime event, with a reason code instead of the raw PLC fault text. The table and codes in this track are a simplified stand-in, not any vendor's real schema. The unique constraint is the safety net: one machine cannot start two faults at the same second, so a second copy of an event is always a mistake.",
    terms=[
        ["reason_code", "reason_code", "The MES's own code for why the machine was down, e.g. MECH-JAM. Reports group by it."],
        ["end_ts", "end_ts … NOT NULL", "Only finished faults are posted. An open fault has no length yet."],
        ["UNIQUE", "CONSTRAINT … UNIQUE", "The database refuses a second row with the same machine and start time."],
    ],
))

L.append(dict(
    lang="csharp", file="Models.cs", t="A fault as a record",
    goal="In namespace MesHelper, declare record Fault(Machine, Name, Start, End) with End as a nullable DateTime. Add IsOpen, and MinutesIn(from, to) that counts only the minutes inside that window.",
    code='''namespace MesHelper;

public record Fault(string Machine, string Name, DateTime Start, DateTime? End)
{
    public bool IsOpen => End is null;

    public double MinutesIn(DateTime from, DateTime to)
    {
        DateTime s = Start > from ? Start : from;
        DateTime e = End is DateTime end && end < to ? end : to;
        return e > s ? (e - s).TotalMinutes : 0;
    }
}''',
    about="A record is a small class built to hold data: one line declares the properties, a constructor, and equality by value. DateTime? (with the question mark) can hold null, which is how an open fault looks. MinutesIn clips the fault to a window, so a fault that runs past the end of the shift only counts the part inside it. The Python handoff clips the same way, so both tools agree on down minutes.",
    terms=[
        ["namespace", "namespace MesHelper;", "Groups the project's types under one name. The semicolon form covers the whole file."],
        ["record", "record Fault(…)", "A data class in one line: properties, constructor and value equality."],
        ["DateTime?", "DateTime?", "A nullable DateTime. null means the fault has not ended."],
        ["=>", "=> expression", "A property or method whose body is a single expression."],
        ["is DateTime", "End is DateTime end", "Checks End is not null and names the value end in the same step."],
        ["TotalMinutes", "(e - s).TotalMinutes", "Subtracting two DateTimes gives a TimeSpan; TotalMinutes is its length with decimals."],
    ],
))

L.append(dict(
    lang="csharp", file="Models.cs", t="Counts, reasons and events",
    goal="Add record ShiftCount(Machine, IdealRateHr, Barrels), enum ReasonGroup (Mechanical, Process, Utility, Safety), record Reason(Code, Group), and record DowntimeEvent(Machine, Code, Start, End) with a Minutes property.",
    code='''
public record ShiftCount(string Machine, int IdealRateHr, int Barrels);

public enum ReasonGroup { Mechanical, Process, Utility, Safety }

public record Reason(string Code, ReasonGroup Group);

public record DowntimeEvent(string Machine, string Code, DateTime Start, DateTime End)
{
    public double Minutes => (End - Start).TotalMinutes;
}''',
    about="Each record matches something the program handles: a machine's count for the shift, an MES reason, and the event that gets posted. ReasonGroup is an enum, a fixed list of named choices, so a typo becomes a compile error instead of a fifth group nobody reports on. DowntimeEvent has a non-nullable End: by the time a fault becomes an event, it must have finished.",
    terms=[
        ["enum", "enum ReasonGroup { … }", "A type with a fixed set of named values."],
        ["IdealRateHr", "int IdealRateHr", "Barrels per hour at full speed, from dim_machine. Matches the INT column."],
        ["Minutes", "Minutes =>", "Computed every time it is read, so it can never disagree with Start and End."],
    ],
))

L.append(dict(
    lang="csharp", file="Models.cs", t="PLC fault to reason code",
    goal="Add static class Reasons with a case-insensitive Dictionary Map from PLC fault name to Reason: Jam MECH-JAM, Hoop misfeed MECH-FEED, Char flare PROC-FLARE, Low air UTIL-AIR, E-stop SAFE-ESTOP.",
    code='''
public static class Reasons
{
    public static readonly Dictionary<string, Reason> Map = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Jam"] = new("MECH-JAM", ReasonGroup.Mechanical),
        ["Hoop misfeed"] = new("MECH-FEED", ReasonGroup.Mechanical),
        ["Char flare"] = new("PROC-FLARE", ReasonGroup.Process),
        ["Low air"] = new("UTIL-AIR", ReasonGroup.Utility),
        ["E-stop"] = new("SAFE-ESTOP", ReasonGroup.Safety),
    };
}''',
    about="The PLC names faults one way and the MES codes them another. This table is the translation, kept in one place so it can be reviewed with maintenance. OrdinalIgnoreCase means \"LOW AIR\" from a different PLC program still matches. The codes are made up for practice; in a real plant they come from the MES reason tree.",
    terms=[
        ["static class", "static class", "Holds shared members only. You never create one with new."],
        ["Dictionary", "Dictionary<string, Reason>", "Looks up a value by key. Here: PLC fault name to MES reason."],
        ["OrdinalIgnoreCase", "StringComparer.OrdinalIgnoreCase", "Compares keys without caring about upper or lower case."],
        ["readonly", "readonly", "The field cannot be pointed at a different dictionary after startup."],
        ["new(", "new(…)", "Target-typed new: the type comes from the left side, so it is not repeated."],
    ],
))

L.append(dict(
    lang="csharp", file="Db.cs", t="Open a connection",
    goal="In Db.cs, use System.Data and Microsoft.Data.SqlClient. Start class PlantDb that stores a connection string from its constructor and has a private Open() returning an opened SqlConnection.",
    code='''using System.Data;
using Microsoft.Data.SqlClient;

namespace MesHelper;

public class PlantDb
{
    private readonly string _connStr;

    public PlantDb(string connStr)
    {
        _connStr = connStr;
    }

    private SqlConnection Open()
    {
        var conn = new SqlConnection(_connStr);
        conn.Open();
        return conn;
    }''',
    about="All the SQL lives in this one class, so the rest of the program never builds query text. The class is left open on purpose: the next three steps add its methods, and the last of them closes the brace. Microsoft.Data.SqlClient is the current SQL Server driver for .NET, added to the project from NuGet.",
    terms=[
        ["SqlConnection", "SqlConnection", "A connection to SQL Server. Open() logs in; disposing it hands it back to the pool."],
        ["_connStr", "_connStr", "A private field. The leading underscore is the usual C# naming for one."],
        ["private", "private", "Only code inside PlantDb can call Open()."],
        ["var", "var", "Lets the compiler infer the type from the right-hand side."],
    ],
))

L.append(dict(
    lang="csharp", file="Db.cs", t="Read the shift's faults",
    goal="Add ReadFaults(from, to): select machine, fault, start_ts, end_ts from fault_log for every fault that overlaps the window, with @from and @to parameters, and return a List of Fault. A NULL end_ts becomes null.",
    code='''
    public List<Fault> ReadFaults(DateTime from, DateTime to)
    {
        const string sql = """
            SELECT machine, fault, start_ts, end_ts
            FROM fault_log
            WHERE start_ts < @to
                AND (end_ts IS NULL OR end_ts > @from)
            ORDER BY start_ts;
            """;
        using var conn = Open();
        using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.Add("@from", SqlDbType.DateTime).Value = from;
        cmd.Parameters.Add("@to", SqlDbType.DateTime).Value = to;

        var faults = new List<Fault>();
        using var rd = cmd.ExecuteReader();
        while (rd.Read())
        {
            faults.Add(new Fault(
                rd.GetString(0),
                rd.GetString(1),
                rd.GetDateTime(2),
                rd.IsDBNull(3) ? null : rd.GetDateTime(3)));
        }
        return faults;
    }''',
    about="The WHERE is the standard overlap test: a fault touches the window if it started before the window ends and had not ended before it began. That catches a fault carried over from the previous shift, which the handoff's \"started during the shift\" filter would miss. In .NET, parameters are named (@from) instead of the ? marks pyodbc uses; the values still travel separately from the SQL text. using disposes the connection, command and reader when the method returns, even on an error.",
    terms=[
        ['"""', '""" raw string', "A raw string literal: multi-line SQL with no escaping. Indentation up to the closing quotes is removed."],
        ["@from", "@from / @to", "Named parameters. The value is sent separately, so it can never change the SQL."],
        ["using var", "using var", "Disposes the object at the end of the method: closes the connection even if a line throws."],
        ["ExecuteReader", "ExecuteReader / Read()", "Runs the query and walks the rows one at a time. Read() returns false after the last row."],
        ["IsDBNull", "rd.IsDBNull(3)", "SQL NULL is not C# null. Check it before reading the column."],
    ],
))

L.append(dict(
    lang="csharp", file="Db.cs", t="Read the shift's barrels",
    goal="Add ReadCounts(from, to): for every machine in dim_machine, total made_this_hour from v_hourly_barrels in (@from, @to], 0 if none, and return a List of ShiftCount.",
    code='''
    public List<ShiftCount> ReadCounts(DateTime from, DateTime to)
    {
        const string sql = """
            SELECT m.machine, m.ideal_rate_hr, ISNULL(SUM(h.made_this_hour), 0) AS barrels
            FROM dim_machine AS m
            LEFT JOIN v_hourly_barrels AS h
                ON h.machine = m.machine AND h.ts > @from AND h.ts <= @to
            GROUP BY m.machine, m.ideal_rate_hr
            ORDER BY m.machine;
            """;
        using var conn = Open();
        using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.Add("@from", SqlDbType.DateTime).Value = from;
        cmd.Parameters.Add("@to", SqlDbType.DateTime).Value = to;

        var counts = new List<ShiftCount>();
        using var rd = cmd.ExecuteReader();
        while (rd.Read())
        {
            counts.Add(new ShiftCount(rd.GetString(0), rd.GetInt32(1), rd.GetInt32(2)));
        }
        return counts;
    }''',
    about="The same query as the Shift Handoff track, with named parameters. The time filter stays in the ON clause so a machine that made nothing still gets a row with 0. GetInt32 matches the INT columns; asking for the wrong type throws instead of quietly converting.",
    terms=[
        ["LEFT JOIN", "LEFT JOIN … ON", "Keeps every machine, even with no readings in the window."],
        ["ISNULL", "ISNULL(SUM(…), 0)", "No readings means 0 barrels, not NULL."],
        ["GetInt32", "rd.GetInt32(i)", "Reads column i as an int. The column must really be an integer type."],
    ],
))

L.append(dict(
    lang="csharp", file="Db.cs", t="Post events in one transaction",
    goal="Add PostEvents(events): in one transaction, insert each event into mes_downtime_event only if that machine + start_ts is not already there, commit, and return how many rows were inserted. Close the class.",
    code='''
    public int PostEvents(IEnumerable<DowntimeEvent> events)
    {
        const string sql = """
            INSERT INTO mes_downtime_event (machine, reason_code, start_ts, end_ts, minutes)
            SELECT @machine, @code, @start, @end, @minutes
            WHERE NOT EXISTS (
                SELECT 1 FROM mes_downtime_event
                WHERE machine = @machine AND start_ts = @start);
            """;
        using var conn = Open();
        using var tx = conn.BeginTransaction();
        int posted = 0;
        foreach (var e in events)
        {
            using var cmd = new SqlCommand(sql, conn, tx);
            cmd.Parameters.Add("@machine", SqlDbType.VarChar, 50).Value = e.Machine;
            cmd.Parameters.Add("@code", SqlDbType.VarChar, 20).Value = e.Code;
            cmd.Parameters.Add("@start", SqlDbType.DateTime).Value = e.Start;
            cmd.Parameters.Add("@end", SqlDbType.DateTime).Value = e.End;
            cmd.Parameters.Add("@minutes", SqlDbType.Decimal).Value = Math.Round((decimal)e.Minutes, 2);
            posted += cmd.ExecuteNonQuery();
        }
        tx.Commit();
        return posted;
    }
}''',
    about="Two protections. The transaction makes the post all or nothing: if the third insert fails, the first two are rolled back when tx is disposed without Commit. NOT EXISTS makes it safe to run twice: an event already in the MES inserts 0 rows, so a rerun after a crash cannot double the downtime. The unique constraint from step 1 is the backstop if two copies ever run at once.",
    terms=[
        ["BeginTransaction", "BeginTransaction / Commit", "Groups the inserts. Nothing is permanent until Commit; disposing without it rolls back."],
        ["NOT EXISTS", "INSERT … WHERE NOT EXISTS", "Inserts only if no matching row is there. Makes the post safe to repeat."],
        ["ExecuteNonQuery", "ExecuteNonQuery()", "Runs a statement that returns no rows and gives back how many rows it changed."],
        ["IEnumerable", "IEnumerable<T>", "Anything you can loop over: a List, an array, a LINQ query."],
        ["(decimal)", "(decimal)e.Minutes", "Converts the double to decimal to match the DECIMAL(9,2) column, then rounds to 2 places."],
    ],
))

L.append(dict(
    lang="csharp", file="Program.cs", t="Read the run time",
    goal="Use System.Globalization, Microsoft.Data.SqlClient, System.Text and MesHelper. Fix the culture to en-US. Set now from the first command-line argument if there is one, else the clock, and print it.",
    code='''using System.Globalization;
using System.Text;
using Microsoft.Data.SqlClient;
using MesHelper;

CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo("en-US");

DateTime now = args.Length > 0
    ? DateTime.Parse(args[0], CultureInfo.InvariantCulture)
    : DateTime.Now;
Console.WriteLine($"Run time: {now:yyyy-MM-dd HH:mm}");''',
    about="Program.cs uses top-level statements: the file is the program, with no Main method to write. Taking the time as an argument is what makes the tool testable and lets you rerun a missed shift; on the plant server it runs with no argument and uses the clock. Servers often run with a neutral culture that prints 80 % with a space, so the culture is set once at the top. The sample outputs come from running it with 2026-11-07T14:05.",
    terms=[
        ["args", "args", "The command-line arguments, as a string array. Available anywhere in top-level statements."],
        ["?", "cond ? a : b", "The conditional operator: a if the condition is true, else b."],
        ["InvariantCulture", "CultureInfo.InvariantCulture", "Fixed, culture-neutral parsing rules, so 2026-11-07T14:05 reads the same on every server."],
        ["GetCultureInfo", "CurrentCulture = en-US", "Sets how numbers and dates are formatted for the rest of the run."],
        ["yyyy-MM-dd HH:mm", "{now:yyyy-MM-dd HH:mm}", "A custom date format. MM is month, mm is minutes, HH is 24-hour."],
    ],
))

L.append(dict(
    lang="csharp", file="Program.cs", t="Which shift just ended?",
    goal="Write LastShift(t), returning a (Name, Start, End) tuple for the most recent 8-hour shift (A 06, B 14, C 22) that has finished by t. Call it with now and print the window.",
    code='''
(string Name, DateTime Start, DateTime End) LastShift(DateTime t)
{
    var shifts = new[] { ("A", 6), ("B", 14), ("C", 22) };
    var finished = new List<(string Name, DateTime Start)>();
    foreach (var day in new[] { t.Date.AddDays(-1), t.Date })
    {
        foreach (var (name, hour) in shifts)
        {
            var start = day.AddHours(hour);
            if (start.AddHours(8) <= t) finished.Add((name, start));
        }
    }
    var (n, s) = finished[^1];
    return (n, s, s.AddHours(8));
}

var shift = LastShift(now);
Console.WriteLine($"Shift {shift.Name}: {shift.Start:ddd MMM dd HH:mm} to {shift.End:HH:mm}");''',
    about="The same logic as last_shift in the Python handoff: list yesterday's and today's shift starts, keep those whose 8 hours are over, take the last. Writing it twice in two languages is a good check that you understand the rule, not the syntax. A tuple with named parts returns three values without declaring a class.",
    terms=[
        ["(string Name", "(string Name, DateTime Start, …)", "A named tuple: several values returned together, read as shift.Name, shift.Start."],
        ["AddHours", "AddHours / AddDays", "Return a new DateTime; DateTime itself never changes."],
        ["t.Date", "t.Date", "The same day at midnight."],
        ["^1", "finished[^1]", "Index from the end: ^1 is the last item."],
        ["var (n, s)", "var (n, s) = …", "Deconstruction: unpacks a tuple into separate variables."],
    ],
))

L.append(dict(
    lang="csharp", file="Program.cs", t="Pull the shift data",
    goal="Create a PlantDb from the PLANT_DB environment variable, falling back to plant-sql01 with Windows authentication. Read the faults and counts for the shift and print how many of each.",
    code='''
var db = new PlantDb(Environment.GetEnvironmentVariable("PLANT_DB")
    ?? "Server=plant-sql01;Database=PlantDB;Integrated Security=true;TrustServerCertificate=true");
var faults = db.ReadFaults(shift.Start, shift.End);
var counts = db.ReadCounts(shift.Start, shift.End);
Console.WriteLine($"{counts.Count} machines, {faults.Count} faults");''',
    about="The connection string can be overridden without recompiling, which is how the same build runs against a test database. Integrated Security logs in as the Windows account the scheduled task runs under, so no password sits in the code. The outputs here come from a stand-in PlantDb that returns the Shift Handoff sample data.",
    terms=[
        ["GetEnvironmentVariable", "Environment.GetEnvironmentVariable", "Reads a setting from the machine or service account. Returns null if it is not set."],
        ["??", "a ?? b", "The null-coalescing operator: a unless it is null, then b."],
        ["Integrated Security", "Integrated Security=true", "Windows authentication: the process's own account, no password in the string."],
        ["Count", ".Count", "How many items a List holds."],
    ],
))

L.append(dict(
    lang="csharp", file="Program.cs", t="Down minutes with LINQ",
    goal="Group the faults by machine into a dictionary of down minutes inside the shift window, then print each machine and its minutes to 2 decimals, sorted by machine.",
    code='''
var downMin = faults
    .GroupBy(f => f.Machine)
    .ToDictionary(g => g.Key, g => g.Sum(f => f.MinutesIn(shift.Start, shift.End)));

foreach (var (machine, min) in downMin.OrderBy(kv => kv.Key))
{
    Console.WriteLine($"{machine,-16}{min,6:F2}");
}''',
    about="LINQ chains small steps the way a SQL GROUP BY does: group by machine, then sum each group. Char Station 2 shows 18.75: its flare is still open, and MinutesIn stops counting at the 14:00 shift end, not the 14:05 run time. It has been down 23.75 minutes, but the last 5 belong to shift B. These match the Python handoff's down_min.",
    terms=[
        ["GroupBy", "GroupBy(f => f.Machine)", "Splits the list into groups that share a key."],
        ["=>", "f => …", "A lambda: a small inline function. Read it as \"f goes to\"."],
        ["ToDictionary", "ToDictionary(key, value)", "Turns the groups into a lookup from machine to minutes."],
        ["Sum", "g.Sum(…)", "Adds up a value across the group."],
        ["-16", "{x,-16}", "Alignment: pad to 16 characters, left-aligned. A positive number right-aligns."],
    ],
))

L.append(dict(
    lang="csharp", file="Program.cs", t="Code the closed faults",
    goal="For each closed fault, look up its reason code. Mapped faults become DowntimeEvents; the rest go on an unmapped list. Print the counts, including faults still open, then list each event.",
    code='''
var events = new List<DowntimeEvent>();
var unmapped = new List<Fault>();
foreach (var f in faults.Where(f => !f.IsOpen))
{
    if (Reasons.Map.TryGetValue(f.Name, out var reason))
    {
        events.Add(new DowntimeEvent(f.Machine, reason.Code, f.Start, f.End!.Value));
    }
    else
    {
        unmapped.Add(f);
    }
}
Console.WriteLine($"{events.Count} coded, {unmapped.Count} unmapped, {faults.Count(f => f.IsOpen)} still open");
foreach (var e in events)
{
    Console.WriteLine($"  {e.Machine,-14} {e.Code,-10} {e.Start:HH:mm:ss}  {e.Minutes,5:F2}");
}''',
    about="Open faults are held back: they have no length yet, and the overlap query will pick them up on the next shift's run once they close. An unmapped fault is a data-quality flag, not something to guess at: it means the PLC sent a name the reason table does not know. Here all four closed faults map. Event minutes are the full fault length, because the MES records the event, not the shift's share of it.",
    terms=[
        ["Where", "Where(f => !f.IsOpen)", "Keeps only items that pass the test. ! means not."],
        ["TryGetValue", "TryGetValue(key, out var x)", "Looks up a key without throwing. Returns false if it is missing; out var receives the value."],
        ["!.Value", "f.End!.Value", "! tells the compiler End is not null here (open faults were filtered out); .Value unwraps the DateTime?."],
        ["HH:mm:ss", "{e.Start:HH:mm:ss}", "Time to the second."],
    ],
))

L.append(dict(
    lang="csharp", file="Program.cs", t="Performance and status",
    goal="With 7.5 paid hours, compute each machine's % of ideal. Status is DOWN if it has an open fault, BEHIND under 70%, else OK. Build a list of rows with machine, barrels, pct, down minutes and status.",
    code='''
const double PaidHours = 7.5;

string StatusOf(string machine, double pct) =>
    faults.Any(f => f.IsOpen && f.Machine == machine) ? "DOWN"
    : pct < 0.70 ? "BEHIND"
    : "OK";

var rows = counts
    .Select(c => (c.Machine, c.Barrels, Pct: c.Barrels / (c.IdealRateHr * PaidHours)))
    .Select(r => (r.Machine, r.Barrels, r.Pct,
        Down: downMin.GetValueOrDefault(r.Machine),
        Status: StatusOf(r.Machine, r.Pct)))
    .ToList();''',
    about="The same rules as the Python handoff, so both tools agree on what BEHIND means: 8 hours less a 30-minute break is 7.5 paid hours, and under 70% of ideal is behind. A machine with an open fault is DOWN whatever its count. GetValueOrDefault returns 0 for a machine with no faults instead of throwing.",
    terms=[
        ["const", "const double", "A value fixed at compile time. Name it once, use it everywhere."],
        ["Any", "Any(…)", "True if at least one item passes the test."],
        ["Select", "Select(c => …)", "Transforms each item into something new, like a computed column."],
        ["Pct:", "(…, Pct: …)", "Names a tuple element so later code can read r.Pct."],
        ["GetValueOrDefault", "GetValueOrDefault(key)", "The value for key, or 0 if the key is missing."],
    ],
))

L.append(dict(
    lang="csharp", file="Program.cs", t="Print the shift summary",
    goal="Print a header (Machine, Barrels, % ideal, Down min, Status) and one aligned row per machine: barrels as a whole number, pct as a whole percent, down minutes to 2 decimals.",
    code='''
Console.WriteLine();
Console.WriteLine($"{"Machine",-16}{"Barrels",8}{"% ideal",9}{"Down min",10}  Status");
foreach (var r in rows)
{
    Console.WriteLine($"{r.Machine,-16}{r.Barrels,8}{r.Pct,9:P0}{r.Down,10:F2}  {r.Status}");
}''',
    about="Alignment and format go inside the braces: {value,width:format}. Using the same widths in the header and the rows lines up the columns. These are the same barrels, percentages and statuses as the Python handoff, from the same data, which is a good cross-check between the two tools.",
    terms=[
        ["P0", ":P0", "Percent with no decimals: 0.8027 prints as 80%."],
        ["F2", ":F2", "Fixed-point with 2 decimals."],
        ["8", "{x,8}", "Right-align in 8 characters, so numbers line up on the right."],
        ["WriteLine()", "Console.WriteLine()", "With no argument, writes a blank line."],
    ],
))

L.append(dict(
    lang="csharp", file="Program.cs", t="Save a CSV for the shift",
    goal="Build a CSV with a header and one line per row (pct to 3 decimals, down minutes to 2, both with invariant formatting). Save it as shift_<yyyyMMdd>_<shift>.csv and print the file name.",
    code='''
var csv = new StringBuilder();
csv.AppendLine("machine,barrels,pct_of_ideal,down_min,status");
foreach (var r in rows)
{
    csv.AppendLine(string.Join(",",
        r.Machine,
        r.Barrels,
        r.Pct.ToString("F3", CultureInfo.InvariantCulture),
        r.Down.ToString("F2", CultureInfo.InvariantCulture),
        r.Status));
}
var file = $"shift_{shift.Start:yyyyMMdd}_{shift.Name}.csv";
File.WriteAllText(file, csv.ToString());
Console.WriteLine($"Saved {file}");''',
    about="A CSV is what Excel, Power BI or another tool picks up. Numbers use invariant formatting so a decimal point is always a point, whatever the server's region. string.Join is fine here because no machine name contains a comma; a field that might would need quoting.",
    terms=[
        ["StringBuilder", "StringBuilder", "Builds a long string piece by piece without copying it on every addition."],
        ["AppendLine", "AppendLine", "Adds text and a line break."],
        ["string.Join", "string.Join(\",\", …)", "Puts the separator between the values."],
        ["WriteAllText", "File.WriteAllText", "Creates or overwrites the file with the whole string in one call."],
    ],
))

L.append(dict(
    lang="csharp", file="Program.cs", t="Post to the MES and exit",
    goal="Post the events inside try/catch. Print how many were new and how many were already in the MES. On a SqlException, write the error to stderr and return 2. Otherwise return 0.",
    code='''
try
{
    int posted = db.PostEvents(events);
    Console.WriteLine($"Posted {posted} new events, {events.Count - posted} already in the MES");
}
catch (SqlException ex)
{
    Console.Error.WriteLine($"MES post failed, nothing written: {ex.Message}");
    return 2;
}

return 0;''',
    about="The exit code is how Windows Task Scheduler, or whatever runs this, knows it worked: 0 is success, anything else is a failure it can alert on. Because PostEvents is one transaction, \"nothing written\" is true when it fails. Running the tool a second time for the same shift posts 0 new events, which is the NOT EXISTS from step 8 doing its job.",
    terms=[
        ["try", "try / catch", "Runs the block; if it throws, control jumps to a matching catch."],
        ["SqlException", "catch (SqlException ex)", "Catches database errors only. Anything else still stops the program loudly."],
        ["Error", "Console.Error", "Standard error: kept separate from normal output so logs can tell them apart."],
        ["return", "return 2; / return 0;", "In top-level statements, the program's exit code."],
    ],
))
