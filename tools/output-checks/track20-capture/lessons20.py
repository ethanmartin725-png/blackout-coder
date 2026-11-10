# Automated Capture: the track's steps (code and words). python3 lessons20.py writes
# site/data/tracks/20-capture.js; then sql_steps.mjs and ../ignition/run.mjs write the outputs.
import json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[3]
S = []
def step(lang, file, t, goal, code, about, terms): S.append(dict(lang=lang, file=file, t=t, goal=goal, code=code, about=about, terms=terms))

INSERT = '"INSERT INTO machine_event (machine, tag, value, quality, ts, logged_ts) VALUES (?, ?, ?, ?, ?, ?)"'
step("sql", "capture_tables.sql", "Create the capture tables",
 "Create machine_event (event_id identity key, machine, tag, value as a nullable FLOAT, quality, the PLC timestamp ts and the gateway's logged_ts, both DATETIME2(3)) and hourly_summary (machine, hour_end, barrels, keyed on machine and hour_end).",
 """CREATE TABLE machine_event (
    event_id INT IDENTITY(1,1) PRIMARY KEY,
    machine VARCHAR(50) NOT NULL,
    tag VARCHAR(50) NOT NULL,
    value FLOAT NULL,
    quality VARCHAR(30) NOT NULL,
    ts DATETIME2(3) NOT NULL,
    logged_ts DATETIME2(3) NOT NULL
);
CREATE TABLE hourly_summary (
    machine VARCHAR(50) NOT NULL,
    hour_end DATETIME2(0) NOT NULL,
    barrels INT NOT NULL,
    PRIMARY KEY (machine, hour_end)
);""",
 "Automated capture means the PLC's own values land in SQL with no clipboard in between. machine_event keeps every change raw, one row each, with two times: ts, when the PLC saw it, and logged_ts, when the gateway wrote it. Keeping both is what lets later steps spot late or out-of-order data. hourly_summary is the clean, small table a Power BI report reads. DATETIME2(3) keeps milliseconds; value allows NULL because a bad-quality reading may have none.",
 [["DATETIME2(3)", "DATETIME2(3)", "A date-time to the millisecond."], ["logged_ts", "Gateway time", "When the row was written, as opposed to when the PLC saw the change."], ["PRIMARY KEY (machine, hour_end)", "Composite key", "One row per machine per hour, so a summary can never hold an hour twice."]])
step("ignition", "Conveyor3/State · value changed", "Log state changes",
 "In Conveyor 3's State tag value-changed script, skip the initial change and any value whose quality is not good; otherwise insert machine, tag, value, quality, the value's own timestamp and the gateway's time into machine_event with ? parameters.",
 f"""def valueChanged(tag, tagPath, previousValue, currentValue, initialChange, missedEvents):
    if initialChange or not currentValue.quality.isGood():
        return
    system.db.runPrepUpdate(
        {INSERT},
        ["Conveyor 3", "State", currentValue.value, str(currentValue.quality), currentValue.timestamp, system.date.now()]
    )""",
 "A tag event script runs on the gateway every time the tag changes. initialChange is the first event after the script starts, not a real change, so it is skipped; so is a value with bad quality, which only says the connection to the PLC dropped. The timestamp written is the value's own, from the PLC side, not system.date.now(): if the gateway is busy or the network slow, the gateway's clock is later than when the conveyor actually jammed. The output starts the script at 05:50 with the conveyor stopped for the shift change (skipped), then fires the start at 06:00, the canonical jam at 09:08:52, a bad-quality read at 09:11 (skipped) and the jam's end at 09:13:29. The 05:50 start and the gateway running a second behind the PLC are illustrative.",
 [["initialChange", "initialChange", "True on the first event after the script starts."], ["isGood", "quality.isGood()", "False when the value cannot be trusted."], ["currentValue.timestamp", "Source time", "When the value changed at the PLC."], ["system.date.now", "Gateway time", "When this script ran."]])
step("ignition", "Gateway timer · on the hour", "Log the counter every hour",
 "In a gateway scheduled script that runs on the hour, read Conveyor 3's Barrel_Count/ACC. If its quality is good, log an info message when it is below the last good reading logged (a reset), then insert it into machine_event with its own timestamp; if not, log a warning instead.",
 f"""qv = system.tag.readBlocking(["[default]Conveyor3/Barrel_Count/ACC"])[0]
log = system.util.getLogger("Capture")
if qv.quality.isGood():
    last = system.db.runScalarPrepQuery(
        "SELECT TOP 1 value FROM machine_event WHERE machine = ? AND tag = ? AND quality = 'Good' ORDER BY ts DESC",
        ["Conveyor 3", "Barrel_Count"]
    )
    if last is not None and qv.value < last:
        log.info("Conveyor 3 counter reset: %d -> %d" % (last, qv.value))
    system.db.runPrepUpdate(
        {INSERT},
        ["Conveyor 3", "Barrel_Count", qv.value, str(qv.quality), qv.timestamp, system.date.now()]
    )
else:
    log.warn("Conveyor 3 counter unreadable: %s" % qv.quality)""",
 "A counter changes with every barrel, so a value-changed script on it would write a row per barrel. A reading on the hour is enough to know each hour's output, and it matches count_log. The raw reading is logged, not a difference: differences are worked out later in SQL, where a mistake can be fixed and rerun. A reading below the last one is a reset. The counter resets just after each shift change, so 06:00 still reads shift C's 336 and 07:00 reads 47; a reset at any other time is worth a look. The output runs shift A's readings to 10:00, then one hour the counter cannot be read.",
 [["readBlocking", "system.tag.readBlocking", "Reads tags now; returns qualified values."], ["TOP 1", "Last good reading", "The newest good reading already logged."], ["qv.value < last", "Reset", "The counter went down."], ["getLogger", "system.util.getLogger", "Writes to the gateway log."]])
step("ignition", "Project library · capture", "Store and forward",
 "Write log_event(machine, tagName, qv): insert the event, or if the database refuses, keep the row in pending and warn. Write flush(): insert every pending row in one transaction, commit and clear the list, roll back on an error, and always close the transaction.",
 f"""import java.lang

INSERT = {INSERT}
pending = []

def log_event(machine, tagName, qv):
    row = [machine, tagName, qv.value, str(qv.quality), qv.timestamp, system.date.now()]
    try:
        system.db.runPrepUpdate(INSERT, row)
    except (Exception, java.lang.Exception):
        pending.append(row)
        system.util.getLogger("Capture").warn("Database unavailable: %d event(s) held" % len(pending))

def flush():
    tx = system.db.beginTransaction()
    try:
        for row in pending:
            system.db.runPrepUpdate(INSERT, row, tx=tx)
        system.db.commitTransaction(tx)
        del pending[:]
    except (Exception, java.lang.Exception):
        system.db.rollbackTransaction(tx)
    finally:
        system.db.closeTransaction(tx)""",
 "If the database is down for a minute, a capture script that simply fails loses the data for good. Store and forward holds the rows and writes them later: Ignition's own transaction groups do this with a disk cache. The held rows keep their PLC timestamps, so they land in the right hours even though they arrive late; that is why the table keeps logged_ts separately. Writing the backlog in one transaction means it lands all or nothing. Database errors are Java exceptions, so both kinds are caught, which needs import java.lang. The output logs the jam, then takes the table away from 09:13 to 10:00 to simulate the outage: the jam's end and the 10:00 reading are held, and land at 10:01 with their own PLC times.",
 [["pending", "Held rows", "Events waiting for the database."], ["beginTransaction", "Transaction", "The backlog is written all or nothing."], ["java.lang.Exception", "Java exceptions", "Database errors come from Java."]])
step("ignition", "Gateway timer · every minute", "A stale-data watchdog",
 "In a gateway timer script, read the latest logged_ts for Conveyor 3, work out its age in minutes, and write True to Conveyor3/Data_Stale when it is over 15 minutes old, False otherwise.",
 """last = system.db.runScalarPrepQuery("SELECT MAX(logged_ts) FROM machine_event WHERE machine = ?", ["Conveyor 3"])
age = system.date.minutesBetween(last, system.date.now())
stale = age > 15
system.tag.writeBlocking(["[default]Conveyor3/Data_Stale"], [stale])
print("Last event %d min ago, Data_Stale = %s" % (age, stale))""",
 "A capture pipeline fails quietly: the screens still show numbers, they just stop changing. A watchdog checks that data is still arriving and raises a flag a screen or an alarm can use. The counter logs at least once an hour and the state on every change; 15 minutes is an illustrative limit for this machine, which would be set from how often events normally arrive.",
 [["runScalarPrepQuery", "runScalarPrepQuery", "One value from a query."], ["minutesBetween", "system.date.minutesBetween", "Whole minutes between two dates."], ["Data_Stale", "Stale flag", "A memory tag a screen or alarm can watch."]])
VAL = "validation.sql"
step("sql", VAL, "What landed",
 "List Conveyor 3's events in machine_event: id, tag, value, quality, ts and logged_ts, in PLC time order.",
 """SELECT event_id, tag, value, quality, ts, logged_ts
FROM machine_event
WHERE machine = 'Conveyor 3'
ORDER BY ts, event_id;""",
 "This is shift A on 2026-11-07 as the capture scripts wrote it, up to the DB track's \"now\" of 10:15: state running, the jam at 09:08:52 and its end at 09:13:29, the same jam as fault_log, and hourly counter readings matching count_log's 336 (shift C's total, read just before the 06:00 reset), 47, 94, 141 and 184. It also holds the four things that go wrong with real capture, planted for the next steps to find. The rows are illustrative, built from the canonical shift; milliseconds are not shown.",
 [["ORDER BY ts, event_id", "PLC order", "Sorted by when things happened, not when they arrived."]])
step("sql", VAL, "Bad-quality readings",
 "List the events whose quality is not Good.",
 """SELECT event_id, tag, value, quality, ts
FROM machine_event
WHERE quality <> 'Good';""",
 "A reading with bad quality says the gateway lost the PLC, not that the counter read 0. Treated as data, this 0 would look like a counter reset and wreck the hourly numbers after it. The logging scripts in this track skip bad quality, but other sources (an older script, a transaction group, a manual insert) may not, so the database checks too.",
 [["quality <> 'Good'", "Not good", "Bad or uncertain readings."]])
step("sql", VAL, "Duplicates",
 "Find events that appear more than once with the same machine, tag, value and ts, with how many copies and the lowest id to keep.",
 """SELECT machine, tag, value, ts, COUNT(*) AS copies, MIN(event_id) AS keep_id
FROM machine_event
GROUP BY machine, tag, value, ts
HAVING COUNT(*) > 1;""",
 "The jam start was written twice, a quarter of a second apart: a retry after a slow insert, or two scripts listening to the same tag. Counted twice, the jam would look like two stops. HAVING filters groups after they are counted; keeping the lowest id is a simple, repeatable choice.",
 [["HAVING COUNT(*) > 1", "HAVING", "Keeps only the groups with more than one row."], ["keep_id", "Keep the first", "The copy the clean view keeps."]])
step("sql", VAL, "Late arrivals",
 "List the events written more than 60 seconds after their PLC timestamp, with the delay in seconds, longest first.",
 """SELECT event_id, tag, value, ts, logged_ts, DATEDIFF(SECOND, ts, logged_ts) AS delay_s
FROM machine_event
WHERE DATEDIFF(SECOND, ts, logged_ts) > 60
ORDER BY delay_s DESC;""",
 "The 09:00 reading arrived at 09:42, held by store and forward during an outage. Late is not wrong: the value is good and its timestamp is right, so it stays in the clean data. But a report run at 09:30 would have been missing an hour, and this query tells you how often that can happen. Reports group by ts, never by logged_ts.",
 [["DATEDIFF(SECOND, ts, logged_ts)", "Delay", "How long the event took to arrive."]])
step("sql", VAL, "Impossible jumps",
 "For Conveyor 3's good counter readings in time order, compare each with the one before, and list those that rise faster than 1.5 times the machine's ideal rate.",
 """WITH c AS (
    SELECT e.event_id, e.ts, e.value,
        LAG(e.value) OVER (ORDER BY e.ts) AS prev,
        LAG(e.ts) OVER (ORDER BY e.ts) AS prev_ts
    FROM machine_event AS e
    WHERE e.machine = 'Conveyor 3' AND e.tag = 'Barrel_Count' AND e.quality = 'Good'
)
SELECT c.event_id, c.prev_ts, c.prev, c.ts, c.value
FROM c
JOIN dim_machine AS m ON m.machine = 'Conveyor 3'
WHERE c.value - c.prev > 1.5 * m.ideal_rate_hr * DATEDIFF(MILLISECOND, c.prev_ts, c.ts) / 3600000.0;""",
 "Conveyor 3 cannot make 905 barrels in half a second. A reading of 999 is a glitch: a bad register read, a test value, a counter that briefly read garbage. The check uses the machine's own ideal rate from dim_machine, 60 an hour, with 50% headroom, so a fast hour is not flagged but a jump no machine could make is. 1.5 is a choice; set it from the machine's real best rate.",
 [["LAG", "LAG(value) OVER (ORDER BY ts)", "The reading before this one."], ["1.5 * m.ideal_rate_hr", "Plausible limit", "Half again the ideal rate, per hour of elapsed time."]])
step("sql", VAL, "A clean view",
 "Create v_event_clean: good-quality events, one copy of each duplicate (the lowest id), without counter readings that jump faster than 1.5 times the ideal rate.",
 """CREATE VIEW v_event_clean AS
WITH good AS (
    SELECT event_id, machine, tag, value, ts,
        ROW_NUMBER() OVER (PARTITION BY machine, tag, value, ts ORDER BY event_id) AS copy_no
    FROM machine_event
    WHERE quality = 'Good'
),
c AS (
    SELECT g.*, LAG(g.value) OVER (PARTITION BY g.machine, g.tag ORDER BY g.ts) AS prev,
        LAG(g.ts) OVER (PARTITION BY g.machine, g.tag ORDER BY g.ts) AS prev_ts
    FROM good AS g
    WHERE g.copy_no = 1
)
SELECT c.event_id, c.machine, c.tag, c.value, c.ts
FROM c
JOIN dim_machine AS m ON m.machine = c.machine
WHERE NOT (c.tag = 'Barrel_Count' AND c.prev IS NOT NULL
    AND c.value - c.prev > 1.5 * m.ideal_rate_hr * DATEDIFF(MILLISECOND, c.prev_ts, c.ts) / 3600000.0);""",
 "Every report reads the clean view, never the raw table, so the rules live in one place and every report applies them the same way. The raw rows stay untouched, so a rule can be changed and everything rerun. c.prev IS NOT NULL matters: the first reading has no previous one, so its comparison is unknown, and NOT unknown is still unknown, which WHERE treats as false and drops the 06:00 reading. Testing for NULL first makes the whole condition plainly false, so NOT keeps the row. The late reading stays; it was never wrong.",
 [["ROW_NUMBER", "ROW_NUMBER() OVER (PARTITION BY …)", "Numbers the copies of each event: 1 is kept."], ["c.prev IS NOT NULL", "No previous reading", "The first reading has nothing to compare with; never call it a jump."], ["CREATE VIEW", "View", "A saved query every report can use."]])
RPT = "reports.sql"
step("sql", RPT, "State durations",
 "From v_event_clean, list Conveyor 3's states with each one's start, its end (the next state's start, or 10:15 for the last) and its minutes, using LEAD.",
 """DECLARE @now DATETIME2(3) = '2026-11-07 10:15';

WITH s AS (
    SELECT CAST(value AS INT) AS state, ts,
        LEAD(ts, 1, @now) OVER (ORDER BY ts) AS next_ts
    FROM v_event_clean
    WHERE machine = 'Conveyor 3' AND tag = 'State'
)
SELECT state, ts AS from_ts, next_ts AS to_ts,
    CAST(DATEDIFF(SECOND, ts, next_ts) / 60.0 AS DECIMAL(8,2)) AS minutes
FROM s
ORDER BY ts;""",
 "Each state lasts until the next one starts: LEAD reads the next row's time, and its third argument gives the last state an end of 10:15. State 2, jammed, lasted 4.62 minutes, exactly the jam in fault_log from 09:08:52 to 09:13:29. With the duplicate left in, the jam would have split in two, one of them lasting 0 seconds.",
 [["LEAD", "LEAD(ts, 1, @now)", "The next row's time; @now when there is none."], ["state", "State codes", "1 running, 2 jammed, as on the Line Status Screen."]])
step("sql", RPT, "Hourly barrels from events",
 "From v_event_clean, list Conveyor 3's on-the-hour counter readings with the reading before and the barrels made that hour: the difference, or the reading itself when the counter went down (a reset), and NULL for the first reading.",
 """WITH r AS (
    SELECT ts, value, LAG(value) OVER (ORDER BY ts) AS prev
    FROM v_event_clean
    WHERE machine = 'Conveyor 3' AND tag = 'Barrel_Count' AND DATEPART(MINUTE, ts) = 0
)
SELECT ts AS hour_end, value AS reading, prev,
    CASE
        WHEN prev IS NULL THEN NULL
        WHEN value < prev THEN value
        ELSE value - prev
    END AS made
FROM r
ORDER BY ts;""",
 "The barrels made each hour are the differences between hourly readings, except after a reset: at 07:00 the counter reads 47 against 336, because it reset just after 06:00, so the hour made 47, the reading itself. That is the same rule the OEE track's v_hourly_barrels uses. The first reading has no previous one: without the NULL line, a comparison with NULL is unknown, CASE falls to the reading itself, and 06:00 would claim 336 barrels in an hour. Shift A gives 47, 47, 47 and 43, exactly what count_log gives. The 999 glitch was on the hour too, half a second after 08:00; without the clean view, that hour would show 905 barrels and the next 141, taken as a reset.",
 [["DATEPART(MINUTE, ts) = 0", "On the hour", "The readings that close each hour."], ["WHEN value < prev THEN value", "Made this hour", "After a reset the reading is the whole hour; otherwise the difference."], ["WHEN prev IS NULL THEN NULL", "No reading before", "The first hour has nothing to subtract, so its output is unknown, not the whole reading."]])
step("sql", RPT, "Load the summary twice",
 "MERGE the hourly barrels from the clean view into hourly_summary: update an hour whose barrels changed, insert a new one, and leave the rest.",
 """MERGE hourly_summary AS t
USING (
    SELECT machine, hour_end, barrels
    FROM (
        SELECT machine, ts AS hour_end,
            CAST(CASE WHEN prev IS NULL THEN NULL WHEN value < prev THEN value ELSE value - prev END AS INT) AS barrels
        FROM (
            SELECT machine, ts, value, LAG(value) OVER (PARTITION BY machine ORDER BY ts) AS prev
            FROM v_event_clean
            WHERE tag = 'Barrel_Count' AND DATEPART(MINUTE, ts) = 0
        ) AS r
    ) AS h
    WHERE barrels IS NOT NULL
) AS s
    ON t.machine = s.machine AND t.hour_end = s.hour_end
WHEN MATCHED AND t.barrels <> s.barrels THEN
    UPDATE SET barrels = s.barrels
WHEN NOT MATCHED THEN
    INSERT (machine, hour_end, barrels) VALUES (s.machine, s.hour_end, s.barrels);""",
 "The summary job runs every hour, and sometimes twice: a retry, a manual rerun. An INSERT would double the hours; MERGE makes the load idempotent, so running it again changes nothing that is already right. The output runs it twice: 4 rows the first time, 0 the second, and the table still holds one row per hour. This table is what the Power BI report reads, small, clean and safe to reload.",
 [["MERGE", "MERGE", "Insert, update or skip each row in one statement."], ["USING", "USING (…) AS s", "The rows to merge in: each hour's barrels from the clean view."], ["WHEN MATCHED AND t.barrels <> s.barrels", "Only real changes", "An hour that already matches is left alone."], [None, "Idempotent", "Running it twice gives the same result as once."]])

def tpl(s): return "`" + s.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${") + "`"
out = ["// Project track 20: Automated Capture (Ignition scripts and SQL)",
       "// Lesson format: docs/LESSON_FORMAT.md. Edit tools/output-checks/track20-capture/lessons20.py and run it; do not edit by hand.",
       "// Outputs: node tools/output-checks/track20-capture/sql_steps.mjs (SQL) and node tools/output-checks/ignition/run.mjs (Ignition).",
       "BC.addTrack({", '  id: "t-capture",', '  name: "Automated Capture",',
       '  sub: "PLC to Ignition to SQL to Power BI: tag-change scripts that log with source timestamps, store and forward, a watchdog, then SQL that finds bad quality, duplicates, late and impossible data, and loads a clean hourly summary safely",',
       "  lessons: ["]
old = {}
target = ROOT / "site/data/tracks/20-capture.js"
if target.exists():  # keep generated outputs
    import re
    src = target.read_text()
    for m in re.finditer(r'      t: ("(?:[^"\\]|\\.)*"),[\s\S]*?\n(      out: `(?:[^`\\]|\\.)*`,)\n    },', src):
        old[json.loads(m.group(1))] = m.group(2)
for l in S:
    terms = ",\n".join("        [" + ", ".join("null" if x is None else json.dumps(x, ensure_ascii=False) for x in tr) + "]" for tr in l["terms"])
    out.append(f"""    {{
      lang: {json.dumps(l['lang'])},
      file: {json.dumps(l['file'], ensure_ascii=False)},
      t: {json.dumps(l['t'])},
      goal: {json.dumps(l['goal'], ensure_ascii=False)},
      code: {tpl(l['code'])},
      about: {json.dumps(l['about'], ensure_ascii=False)},
      terms: [
{terms},
      ],""" + (f"\n{old[l['t']]}" if l['t'] in old else "") + "\n    },")
out += ["  ],", "});", ""]
target.write_text("\n".join(out))
print(len(S), "steps")
