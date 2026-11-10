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

// Automated Capture helpers
const CLEAR_EVENTS = `system.db.runPrepUpdate("DELETE FROM machine_event", [])`;
const EV = `def ev(t, v, q="Good"):
    return system.tag.QualifiedValue(v, system.tag.QualityCode(q), system.date.parse("2026-11-07 " + t))`;
const SHOW_EVENTS = `show("SELECT tag, value, quality, ts, logged_ts FROM machine_event ORDER BY ts, event_id")`;

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
    before: `system.db.runPrepUpdate("DELETE FROM count_log WHERE ts >= '2026-11-07 07:00'", [])`,
    after: `set_clock("2026-11-07 08:00:00")
set_tag("Conveyor3/Barrel_Count/ACC", 94)
rerun()
print("count_log, one row per hour:")
show("SELECT machine, barrels, state, ts FROM count_log WHERE machine = 'Conveyor 3' AND ts >= '2026-11-07 06:00' ORDER BY ts")`,
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
  "ignition/Hourly snapshot for every machine": { db: true, clock: "2026-11-07 14:00:00", after: `show("SELECT machine, barrels, state, ts FROM count_log WHERE ts = '2026-11-07 14:00' ORDER BY machine")` },
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
  // >>> hmi
  // ---------- Line Status Screen track ----------
  "t-hmi/State text with switch": { cases: [{"label": "Conv_State = 1", "tags": {"Conveyor3/Conv_State": 1}}, {"label": "Conv_State = 2", "tags": {"Conveyor3/Conv_State": 2}}, {"label": "Conv_State = 3", "tags": {"Conveyor3/Conv_State": 3}}, {"label": "Conv_State = 0", "tags": {"Conveyor3/Conv_State": 0}}] },
  "t-hmi/Banner color": { cases: [{"label": "Jam_Fault 0, state 1", "tags": {"Conveyor3/Jam_Fault": 0, "Conveyor3/Conv_State": 1}}, {"label": "Jam_Fault 0, state 3", "tags": {"Conveyor3/Jam_Fault": 0, "Conveyor3/Conv_State": 3}}, {"label": "Jam_Fault 1, state 1", "tags": {"Conveyor3/Jam_Fault": 1, "Conveyor3/Conv_State": 1}}, {"label": "Jam_Fault 0, state 2", "tags": {"Conveyor3/Jam_Fault": 0, "Conveyor3/Conv_State": 2}}] },
  "t-hmi/OEE as a percent": { cases: [{"label": "OEE = 0.738", "tags": {"Conveyor3/OEE": 0.738}}, {"label": "OEE = 0.86", "tags": {"Conveyor3/OEE": 0.86}}, {"label": "OEE = 0.7", "tags": {"Conveyor3/OEE": 0.7}}] },
  "t-hmi/Minutes since the last fault": { tags: {"Conveyor3/Last_Fault_End": {"$date": "2026-11-07 09:13:29"}}, cases: [{"label": "at 09:20", "clock": "2026-11-07 09:20:00"}, {"label": "at 11:45", "clock": "2026-11-07 11:45:00"}, {"label": "at 14:05", "clock": "2026-11-07 14:05:00"}] },
  "t-hmi/Behind target": { cases: [{"label": "2 h: 116 of 120", "tags": {"Conveyor3/Barrel_Count/ACC": 116, "Conveyor3/Target_Now": 120}}, {"label": "4 h: 196 of 240", "tags": {"Conveyor3/Barrel_Count/ACC": 196, "Conveyor3/Target_Now": 240}}, {"label": "end: 352 of 450", "tags": {"Conveyor3/Barrel_Count/ACC": 352, "Conveyor3/Target_Now": 450}}] },
  "t-hmi/Shift from the clock": { cases: [{"label": "at 05:59", "clock": "2026-11-07 05:59:00"}, {"label": "at 06:00", "clock": "2026-11-07 06:00:00"}, {"label": "at 14:05", "clock": "2026-11-07 14:05:00"}, {"label": "at 22:30", "clock": "2026-11-07 22:30:00"}] },
  "t-hmi/Fallback for a missing value": { cases: [{"label": "Operator = J. Ruiz", "tags": {"Conveyor3/Operator": "J. Ruiz"}}, {"label": "Operator = null", "tags": {"Conveyor3/Operator": null}}] },
  "t-hmi/Log the fault and keep its id": { db: true, clock: "2026-11-07 09:08:52", tags: {"Conveyor3/Open_Fault_Id": 0}, before: `system.db.runPrepUpdate("DELETE FROM fault_log WHERE start_ts >= '2026-11-07 09:08:52'", [])`, after: `valueChanged(None, "[default]Conveyor3/Jam_Fault", qv(False), qv(True), False, False)
print("Open_Fault_Id: %d" % system.tag.readBlocking(["[default]Conveyor3/Open_Fault_Id"])[0].value)
show("SELECT fault_id, machine, fault, start_ts, end_ts FROM fault_log WHERE start_ts >= '2026-11-07 09:00'")` },
  "t-hmi/Close the fault by id": { db: true, clock: "2026-11-07 09:08:52", tags: {"Conveyor3/Open_Fault_Id": 0}, before: `system.db.runPrepUpdate("DELETE FROM fault_log WHERE start_ts >= '2026-11-07 09:08:52'", [])`, after: `p = "[default]Conveyor3/Jam_Fault"
valueChanged(None, p, qv(False), qv(True), False, False)
set_clock("2026-11-07 09:13:29")
valueChanged(None, p, qv(True), qv(False), False, False)
print("Open_Fault_Id: %d" % system.tag.readBlocking(["[default]Conveyor3/Open_Fault_Id"])[0].value)
show("SELECT fault_id, machine, fault, start_ts, end_ts FROM fault_log WHERE start_ts >= '2026-11-07 09:00'")` },
  "t-hmi/Reset button with an interlock": { tags: {"Conveyor3/Eye_Blocked": true, "Conveyor3/Reset_Request": false}, after: `print(runAction(None, None))
set_tag("Conveyor3/Eye_Blocked", False)
print(runAction(None, None))
print("Reset_Request: %s" % system.tag.readBlocking(["[default]Conveyor3/Reset_Request"])[0].value)` },
  "t-hmi/Setpoint with a range check": { after: `for v in [45, 75, 5.5, 60]:
    print(setSpeed(v))
print("Speed_SP: %.1f" % system.tag.readBlocking(["[default]Conveyor3/Speed_SP"])[0].value)` },
  "t-hmi/Audit the operator's actions": { after: `changeSpeed("J. Ruiz", 55)
changeSpeed("J. Ruiz", 72)` },
  "t-hmi/Pareto query": { db: true, clock: "2026-11-07 10:15:00" },
  "t-hmi/Hourly output with a rollover": { clock: "2026-11-07 07:00:00", tags: {"Conveyor3/Barrel_Total": 65500, "Conveyor3/Total_Last_Hour": 65453, "Conveyor3/Made_Last_Hour": 0}, after: `set_clock("2026-11-07 08:00:00"); set_tag("Conveyor3/Barrel_Total", 11); rerun()
set_clock("2026-11-07 09:00:00"); set_tag("Conveyor3/Barrel_Total", 58); rerun()` },
  "t-hmi/Shift change": { db: true, clock: "2026-11-07 14:00:00", tags: {"Shift/Name": "A", "Shift/Reset_Counts": false}, after: `shiftChange("B")
show("SELECT machine, barrels, state, ts FROM count_log WHERE ts = '2026-11-07 14:00' ORDER BY machine")
for qv, p in zip(system.tag.readBlocking(["[default]Shift/Name", "[default]Shift/Reset_Counts"]), ["Shift/Name", "Shift/Reset_Counts"]):
    print("%s: %s" % (p, qv.value))` },
  // <<< hmi
  // ---------- Automated Capture track ----------
  // The canonical database already holds shift A's capture rows; each scenario clears them and logs them live.
  // The PLC times are canonical; the gateway running a second behind is illustrative.
  "t-capture/Log state changes": {
    db: true, clock: "2026-11-07 05:50:00", before: CLEAR_EVENTS,
    after: `${EV}
p = "[default]Conveyor3/State"
valueChanged(None, p, None, ev("05:50:00", 0), True, False)
set_clock("2026-11-07 06:00:01")
valueChanged(None, p, ev("05:50:00", 0), ev("06:00:00", 1), False, False)
set_clock("2026-11-07 09:08:53")
valueChanged(None, p, ev("06:00:00", 1), ev("09:08:52", 2), False, False)
set_clock("2026-11-07 09:11:00")
valueChanged(None, p, ev("09:08:52", 2), ev("09:11:00", 0, "Bad_Disconnected"), False, False)
set_clock("2026-11-07 09:13:30")
valueChanged(None, p, ev("09:11:00", 0, "Bad_Disconnected"), ev("09:13:29", 1), False, False)
${SHOW_EVENTS}`,
  },
  "t-capture/Log the counter every hour": {
    db: true, clock: "2026-11-07 06:00:00", tags: { "Conveyor3/Barrel_Count/ACC": 336 }, before: CLEAR_EVENTS,
    after: `for t, v in [("07", 47), ("08", 94), ("09", 141), ("10", 184)]:
    set_clock("2026-11-07 %s:00:00" % t)
    set_tag("Conveyor3/Barrel_Count/ACC", v)
    rerun()
set_tag("Conveyor3/Barrel_Count/ACC", 0, "Bad_Disconnected")
rerun()
${SHOW_EVENTS}`,
  },
  "t-capture/Store and forward": {
    db: true, clock: "2026-11-07 09:08:53", before: CLEAR_EVENTS,
    after: `${EV}
log_event("Conveyor 3", "State", ev("09:08:52", 2))
system.db.runPrepUpdate("EXEC sp_rename 'machine_event', 'machine_event_offline'", [])
set_clock("2026-11-07 09:13:30")
log_event("Conveyor 3", "State", ev("09:13:29", 1))
set_clock("2026-11-07 10:00:01")
log_event("Conveyor 3", "Barrel_Count", ev("10:00:00", 184))
system.db.runPrepUpdate("EXEC sp_rename 'machine_event_offline', 'machine_event'", [])
set_clock("2026-11-07 10:01:00")
flush()
print("Held after flush: %d" % len(pending))
${SHOW_EVENTS}`,
  },
  "t-capture/A stale-data watchdog": {
    db: true, clock: "2026-11-07 10:15:00", tags: { "Conveyor3/Data_Stale": false },
    after: `set_clock("2026-11-07 10:20:00")
rerun()
print("Data_Stale tag: %s" % system.tag.readBlocking(["[default]Conveyor3/Data_Stale"])[0].value)`,
  },
};
