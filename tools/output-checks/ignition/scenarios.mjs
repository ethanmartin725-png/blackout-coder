// Scenarios for the Ignition lessons, keyed "<lane or track id>/<title>".
//   clock   gateway time for the run ("yyyy-MM-dd HH:mm:ss"); default 2026-11-07 14:05:00, the handoff run time
//   tags    tag values on top of BASE_TAGS: {path: value} or {path: [value, quality]}
//   db      true: reset PlantDB to the canonical sample database first and connect system.db to it
//   before  Jython run before the lesson (setup), with system and show() available
//   after   Jython run after the lesson in its namespace, with qv(), show(), set_clock(), set_tag(), rerun()
//   cases   expressions only: [{label, tags, clock}], evaluated one after another
// Folder names (Conveyor3, HoopDriver1, CharStation2) are illustrative; values are the canonical shift A ones.

export const BASE_TAGS = {
  "Conveyor3/Conv_State": 1,
  "Conveyor3/State": 1,
  "Conveyor3/Jam_Fault": false,
  "Conveyor3/Barrel_Count/ACC": 352,
  "Conveyor3/Speed_SP": 60.0,
  "HoopDriver1/State": 1,
  "HoopDriver1/Barrel_Count/ACC": 274,
  "HoopDriver1/Air_PSI": 92.0,
  "CharStation2/State": 2,
  "CharStation2/Barrel_Count/ACC": 301,
};

// The canonical database holds faults up to 10:15. Removing those from the jam on lets the jam be logged live.
const BEFORE_JAM = `system.db.runPrepUpdate("DELETE FROM fault_log WHERE start_ts >= '2026-11-07 09:08:52'", [])`;
const JAM_ROWS = `show("SELECT machine, fault, start_ts, end_ts FROM fault_log WHERE start_ts >= '2026-11-07 09:00' ORDER BY start_ts")`;

export const SCENARIOS = {
  // ---------- PLC & HMI track ----------
  "t-plc/Log a fault start": {
    db: true, clock: "2026-11-07 09:08:52", before: BEFORE_JAM,
    after: `valueChanged(None, "[default]Conveyor3/Jam_Fault", qv(False), qv(True), False, False)
print("fault_log after the jam starts:")
${JAM_ROWS}`,
  },
  "t-plc/Close the fault": {
    db: true, clock: "2026-11-07 09:08:52", before: BEFORE_JAM,
    after: `valueChanged(None, "[default]Conveyor3/Jam_Fault", qv(False), qv(True), False, False)
set_clock("2026-11-07 09:13:29")
valueChanged(None, "[default]Conveyor3/Jam_Fault", qv(True), qv(False), False, False)
${JAM_ROWS}
row = system.db.runPrepQuery("SELECT start_ts, end_ts FROM fault_log WHERE start_ts >= '2026-11-07 09:00'", [])[0]
s = system.date.secondsBetween(row["start_ts"], row["end_ts"])
print("")
print("Downtime for this event: %d min %d s (%.2f min)" % (s // 60, s % 60, s / 60.0))`,
  },
  "t-plc/Hourly count snapshot": {
    db: true, clock: "2026-11-07 07:00:00", tags: { "Conveyor3/Barrel_Count/ACC": 47 },
    after: `set_clock("2026-11-07 08:00:00")
set_tag("Conveyor3/Barrel_Count/ACC", 94)
rerun()
print("count_log, one row per hour:")
show("SELECT machine, barrels, state, ts FROM count_log ORDER BY ts")`,
  },
  "t-plc/Status text binding": {
    cases: [1, 2, 0].map((v) => ({ label: `Conv_State = ${v}`, tags: { "Conveyor3/Conv_State": v } })),
  },
  "t-plc/Alarm color binding": {
    cases: [0, 1].map((v) => ({ label: `Jam_Fault = ${v}`, tags: { "Conveyor3/Jam_Fault": v } })),
  },
  // >>> lane
  // ---------- Ignition lane ----------
  "ignition/Print and log": {  },
  "ignition/Jython is Python 2.7": {  },
  "ignition/String formatting": {  },
  "ignition/Read a tag": {  },
  "ignition/Check the quality": {  },
  "ignition/Read many tags at once": {  },
  "ignition/Write a tag": {  },
  "ignition/Build tag paths": {  },
  "ignition/Lists and dictionaries": {  },
  "ignition/Loop over machines": {  },
  "ignition/Dates": {  },
  "ignition/Which shift is it?": {  },
  "ignition/Count rows with a scalar query": { db: true },
  "ignition/Query rows": { db: true },
  "ignition/Insert with parameters": { db: true },
  "ignition/Apostrophes and parameters": { db: true },
  "ignition/Transactions": { db: true, clock: "2026-11-07 10:17:10", after: `show("SELECT machine, fault, start_ts, end_ts FROM fault_log WHERE machine = 'Hoop Driver 1' AND start_ts >= '2026-11-07 10:00'")` },
  "ignition/Build a dataset": {  },
  "ignition/Loop over a dataset": {  },
  "ignition/Python and Java exceptions": { db: true },
  "ignition/JSON": {  },
  "ignition/A library function": {  },
  "ignition/Tag change script": { after: `p = "[default]Conveyor3/Conv_State"
valueChanged(None, p, qv(None), qv(3), True, False)
valueChanged(None, p, qv(3), qv(1), False, False)
valueChanged(None, p, qv(1), qv(2), False, False)` },
  "ignition/Guard the quality": { after: `p = "[default]HoopDriver1/Air_PSI"
valueChanged(None, p, qv(92.0), qv(91.5), False, False)
valueChanged(None, p, qv(91.5), qv(None, "Bad_Disconnected"), False, False)
valueChanged(None, p, qv(None, "Bad_Disconnected"), qv(78.0), False, True)` },
  "ignition/Hourly snapshot for every machine": { db: true, clock: "2026-11-07 14:00:00", after: `show("SELECT machine, barrels, state, ts FROM count_log ORDER BY machine")` },
  "ignition/Rate across a rollover": {  },
  "ignition/Machine from the tag path": {  },
  "ignition/Deadband before logging": { tags: {"HoopDriver1/Air_PSI_Logged": 92.0}, after: `p = "[default]HoopDriver1/Air_PSI"
prev = 92.0
for psi in [91.5, 90.4, 89.9, 88.0, 91.0, 92.6]:
    valueChanged(None, p, qv(prev), qv(psi), False, False)
    prev = psi` },
  "ignition/Count events in a memory tag": { tags: {"Conveyor3/Jam_Count": 0}, after: `p = "[default]Conveyor3/Jam_Fault"
for before, now in [(False, True), (True, False), (False, True), (True, False)]:
    valueChanged(None, p, qv(before), qv(now), False, False)
print("Jam_Count: %d" % system.tag.readBlocking([COUNT])[0].value)
print("shift change saved %d" % shiftChange())
print("Jam_Count: %d" % system.tag.readBlocking([COUNT])[0].value)` },
  "ignition/Shift summary": { db: true, clock: "2026-11-07 14:00:00", after: `show("SELECT TOP 1 shift, author, note FROM handoff_note ORDER BY note_id DESC")` },
  // <<< lane
};
