// Project track 7: Downtime Entry
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
// Outputs of the JavaScript steps: node tools/output-checks/track7-downtime/run.mjs (runs each step's page in Chromium)
BC.addTrack({
  id: "t-downtime",
  name: "Downtime Entry",
  sub: "An operator form for the stops the PLC never sees: HTML fields, CSS layout, JavaScript that validates, logs and totals each entry",
  lessons: [
    {
      lang: "html",
      file: "downtime.html",
      t: "Page header",
      goal: "Add a header (class top) with an h1 \"Manual Downtime Entry\" and a paragraph reading \"Shift A · Sat Nov 07, 06:00 to 14:00\".",
      code: `<header class="top">
  <h1>Manual Downtime Entry</h1>
  <p>Shift A · Sat Nov 07, 06:00 to 14:00</p>
</header>`,
      about: "fault_log only holds stops the PLC detects, which is why availability runs near 99% in the other tracks. A changeover, a wait for hoops, a quality hold: the PLC sees none of them. This form lets an operator log those stops by hand. The stops logged in this track are illustrative; they are not in the canonical sample data.",
      terms: [
        ["header", "<header>", "The page's top band."],
        ["h1", "<h1>", "The page title. One per page."],
      ],
    },
    {
      lang: "html",
      file: "downtime.html",
      t: "Machine and reason",
      goal: "Add a section (class entry) with a label and select (id machine) offering Choose…, Char Station 2, Conveyor 3 and Hoop Driver 1, and a label and select (id reason) offering Choose…, Changeover, Material, Quality check and No operator. The Choose… options have an empty value.",
      code: `<section class="entry">
  <label>Machine
    <select id="machine">
      <option value="">Choose…</option>
      <option>Char Station 2</option>
      <option>Conveyor 3</option>
      <option>Hoop Driver 1</option>
    </select>
  </label>
  <label>Reason
    <select id="reason">
      <option value="">Choose…</option>
      <option>Changeover</option>
      <option>Material</option>
      <option>Quality check</option>
      <option>No operator</option>
    </select>
  </label>
</section>`,
      about: "A select limits the answer to a fixed list, so the log never holds \"conv 3\" or \"Conveyer 3\". Choose… has an empty value on purpose: the script can tell \"not picked yet\" from a real choice. An option with no value attribute uses its text as its value.",
      terms: [
        ["select", "<select>", "A drop-down list."],
        ["value=\"\"", "value=\"\"", "An empty value: nothing chosen yet."],
        ["label", "<label>", "Names the field; clicking it focuses the field."],
      ],
    },
    {
      lang: "html",
      file: "downtime.html",
      t: "Times, note and buttons",
      goal: "Add a second entry section with time inputs start and end, a text input note with a placeholder, a Save button (id save), an Undo button (id undo), and two empty paragraphs: error (class error) and status.",
      code: `<section class="entry">
  <label>Start <input type="time" id="start"></label>
  <label>End <input type="time" id="end"></label>
  <label>Note <input type="text" id="note" placeholder="optional"></label>
  <button id="save" type="button">Save</button>
  <button id="undo" type="button">Undo last</button>
  <p id="error" class="error"></p>
  <p id="status"></p>
</section>`,
      about: "type=\"time\" gives a time picker and always hands the script a value like \"07:30\", whatever the operator's clock format. type=\"button\" makes sure a click only runs the script. The two empty paragraphs are placeholders the script fills: one for problems, one for confirmations.",
      terms: [
        ["type=\"time\"", "type=\"time\"", "A time field. Its value is \"HH:MM\" in 24-hour time."],
        ["placeholder", "placeholder", "Grey hint text shown while the field is empty."],
        ["type=\"button\"", "type=\"button\"", "A plain button that only runs script."],
      ],
    },
    {
      lang: "html",
      file: "downtime.html",
      t: "Log table and totals",
      goal: "Add a section (class panel) with an h2 \"Logged this shift\", a table with a header row Machine, Start, End, Min, Reason, Note and an empty tbody (id rows), an empty ul (id totals) and an empty paragraph (id total).",
      code: `<section class="panel">
  <h2>Logged this shift</h2>
  <table>
    <thead>
      <tr><th>Machine</th><th>Start</th><th>End</th><th>Min</th><th>Reason</th><th>Note</th></tr>
    </thead>
    <tbody id="rows"></tbody>
  </table>
  <ul id="totals"></ul>
  <p id="total"></p>
</section>`,
      about: "The header row is fixed; the body starts empty and the script adds one row per stop. Keeping the tbody separate means redrawing the rows never touches the header. The list and the paragraph below will show minutes per machine and for the whole shift.",
      terms: [
        ["thead", "<thead>", "The table's header rows."],
        ["tbody", "<tbody>", "The body rows. The script fills this one."],
        ["th", "<th>", "A header cell."],
      ],
    },
    {
      lang: "css",
      file: "downtime.css",
      t: "Colors and page",
      goal: "Define the Plant Board's colors as variables on :root (bg, panel, text, muted, ok, warn, bad), then give body no margin, the bg background, the text color and Arial. Style .top as a padded flex row.",
      code: `:root {
  --bg: #0e1726;
  --panel: #17233a;
  --text: #e8edf5;
  --muted: #8c9ab3;
  --ok: #3fb67a;
  --warn: #e3a72f;
  --bad: #e5484d;
}
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: Arial, sans-serif;
}
.top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 16px 24px;
}`,
      about: "The same colors as the Plant Board, so the form looks like part of the same system on the plant floor. Defining them once as variables means a color changes in one place. In the preview, :root and body are applied to the preview box instead of the whole app.",
      terms: [
        ["--bg", "--bg", "A CSS variable. Read it with var(--bg)."],
        ["var", "var(…)", "Uses a variable's value."],
      ],
    },
    {
      lang: "css",
      file: "downtime.css",
      t: "Form layout",
      goal: "Make each .entry a padded panel-colored grid of columns at least 160px wide. Stack each label's text above its field, and give select and input full width, padding, a muted border and the bg background.",
      code: `.entry {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  align-items: end;
  margin: 0 24px 12px;
  padding: 16px;
  background: var(--panel);
  border-radius: 8px;
}
.entry label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--muted);
  font-size: 13px;
}
select, input {
  padding: 8px;
  font-size: 15px;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--muted);
  border-radius: 4px;
}`,
      about: "auto-fit with minmax fits as many 160px columns as the width allows, so the form is two or three fields wide on a desktop and one on a phone, with no media query. Big fields and 15px text matter here: this form gets used with gloves on, at a terminal by the line.",
      terms: [
        ["auto-fit", "repeat(auto-fit, minmax(…))", "As many columns as fit, each at least 160px."],
        ["flex-direction", "flex-direction: column", "Stacks the label text above its field."],
      ],
    },
    {
      lang: "css",
      file: "downtime.css",
      t: "Buttons and messages",
      goal: "Style buttons with the ok color, dark text, bold and a pointer. Make a disabled button grey and not clickable-looking. Color .error with the bad color and #status with the ok color, and make both span the whole row.",
      code: `button {
  padding: 10px 16px;
  font-size: 15px;
  font-weight: bold;
  color: #0e1726;
  background: var(--ok);
  border: 0;
  border-radius: 4px;
  cursor: pointer;
}
button:disabled {
  background: var(--muted);
  cursor: not-allowed;
}
.error {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--bad);
}
#status {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--ok);
}`,
      about: ":disabled styles the button only while the script has switched it off, so the operator can see Save is not available yet rather than clicking and wondering. grid-column: 1 / -1 stretches the messages across every column, so they sit under the fields instead of squeezing into one cell.",
      terms: [
        [":disabled", ":disabled", "Applies while the button is disabled."],
        ["grid-column", "grid-column: 1 / -1", "Spans from the first grid line to the last."],
      ],
    },
    {
      lang: "css",
      file: "downtime.css",
      t: "Table and totals",
      goal: "Make the panel padded and panel-colored. Give the table full width with collapsed borders, left-aligned muted headers, and a bottom border on every cell. Right-align the fourth column.",
      code: `.panel {
  margin: 0 24px 24px;
  padding: 16px;
  background: var(--panel);
  border-radius: 8px;
}
.panel table {
  width: 100%;
  border-collapse: collapse;
}
.panel th {
  text-align: left;
  color: var(--muted);
}
.panel th, .panel td {
  padding: 6px 8px;
  border: 0;
  border-bottom: 1px solid var(--bg);
}
.panel td:nth-child(4) {
  text-align: right;
}`,
      about: "Numbers line up on the right so the digits compare at a glance. nth-child(4) picks the fourth cell of every row, the minutes, without adding a class to each cell from the script. border: 0 first clears the preview's default grid lines before adding the bottom rule.",
      terms: [
        ["border-collapse", "border-collapse", "Neighboring cells share one border."],
        ["nth-child", "nth-child(4)", "Every fourth child: the minutes column."],
      ],
    },
    {
      lang: "js",
      file: "downtime.js",
      t: "Shift window and minutes",
      goal: "Define SHIFT (name A, start 06:00, end 14:00), an empty entries array, and toMinutes(hhmm) that turns \"HH:MM\" into minutes after midnight.",
      code: `const SHIFT = { name: "A", start: "06:00", end: "14:00" };
const entries = [];

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}`,
      about: "Every time comes from a time input as \"HH:MM\". Turning each into minutes after midnight makes comparing and subtracting simple whole-number math. entries holds every stop logged this shift; it lives only in this page, so a reload empties it. A real form would post each entry to a database.",
      terms: [
        ["const", "const", "A name that cannot be reassigned. The array's contents can still change."],
        ["split", "split(\":\")", "\"07:30\" becomes [\"07\", \"30\"]."],
        ["map(Number)", "map(Number)", "Turns each piece into a number."],
      ],
      out: `toMinutes("07:30")                             →  450
toMinutes(SHIFT.end) - toMinutes(SHIFT.start)  →  480
entries.length                                 →  0`,
    },
    {
      lang: "js",
      file: "downtime.js",
      t: "Read the form",
      goal: "Write readForm() that returns an object with machine, reason, start, end and note (trimmed) from the fields' values.",
      code: `function readForm() {
  return {
    machine: document.getElementById("machine").value,
    reason: document.getElementById("reason").value,
    start: document.getElementById("start").value,
    end: document.getElementById("end").value,
    note: document.getElementById("note").value.trim(),
  };
}`,
      about: "One function reads every field, so the rest of the script works with a plain object and never touches the page. Every field's value is a string; an unpicked select and an empty time are both \"\". trim removes stray spaces typed around the note.",
      terms: [
        ["value", ".value", "The field's current contents, always a string."],
        ["trim", "trim()", "Removes spaces at both ends."],
      ],
      out: `Fill Conveyor 3, Changeover, 07:30, 07:45, note "  53 to 30 gal  "
                                                      →  filled
readForm()                                            →  {"machine":"Conveyor 3","reason":"Changeover","start":"07:30","end":"07:45","note":"53 to 30 gal"}`,
    },
    {
      lang: "js",
      file: "downtime.js",
      t: "Validate an entry",
      goal: "Write validate(e) returning a message: choose a machine and reason; enter both times; end after start; both inside the shift window. Return \"\" when the entry is good.",
      code: `function validate(e) {
  if (!e.machine || !e.reason) return "Choose a machine and a reason.";
  if (!e.start || !e.end) return "Enter a start and an end time.";
  const s = toMinutes(e.start);
  const f = toMinutes(e.end);
  if (f <= s) return "End must be after start.";
  if (s < toMinutes(SHIFT.start) || f > toMinutes(SHIFT.end)) {
    return \`Times must fall inside shift \${SHIFT.name}, \${SHIFT.start} to \${SHIFT.end}.\`;
  }
  return "";
}`,
      about: "Each check returns a message that tells the operator what to fix, not just that something is wrong. An empty string means valid, which keeps the caller simple. A stop that crosses 14:00 is refused: it belongs partly to shift B and should be logged as two entries, the same clipping rule the Shift Handoff report uses.",
      terms: [
        ["return", "return", "Leaves the function with the message."],
        ["!e.machine", "!value", "True when the value is empty."],
        ["||", "||", "Either condition is enough."],
      ],
      out: `validate({ machine: "Conveyor 3", reason: "Changeover", start: "07:30", end: "07:45" })
                                                      →  ""
validate({ machine: "Conveyor 3", reason: "", start: "07:30", end: "07:45" })
                                                      →  "Choose a machine and a reason."
validate({ machine: "Conveyor 3", reason: "Changeover", start: "", end: "07:45" })
                                                      →  "Enter a start and an end time."
validate({ machine: "Conveyor 3", reason: "Changeover", start: "07:30", end: "07:20" })
                                                      →  "End must be after start."
validate({ machine: "Char Station 2", reason: "Quality check", start: "13:50", end: "14:10" })
                                                      →  "Times must fall inside shift A, 06:00 to 14:00."`,
    },
    {
      lang: "js",
      file: "downtime.js",
      t: "Show a message",
      goal: "Write showError(message) that puts the message in the error paragraph and clears the status, and showStatus(message) that does the reverse.",
      code: `function showError(message) {
  document.getElementById("error").textContent = message;
  document.getElementById("status").textContent = "";
}

function showStatus(message) {
  document.getElementById("status").textContent = message;
  document.getElementById("error").textContent = "";
}`,
      about: "Only one message shows at a time, so an old error never sits next to a new confirmation. textContent puts the message in as plain text. Anything that came from a user, even a message built from their input, should go in through textContent.",
      terms: [
        ["textContent", "textContent", "Sets the element's text. Never parsed as HTML."],
      ],
      out: `showError("End must be after start.")  →  error "End must be after start.", status ""
showStatus("Saved.")                   →  error "", status "Saved."`,
    },
    {
      lang: "js",
      file: "downtime.js",
      t: "Draw the log rows",
      goal: "Write renderRows(): empty the rows tbody, then for each entry add a row with its machine, start, end, minutes, reason and note, each set with textContent.",
      code: `function renderRows() {
  const rows = document.getElementById("rows");
  rows.replaceChildren();
  for (const e of entries) {
    const tr = document.createElement("tr");
    for (const value of [e.machine, e.start, e.end, e.minutes, e.reason, e.note]) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }
    rows.appendChild(tr);
  }
}`,
      about: "The table is redrawn from entries every time, so the page can never drift from the data. The note is typed by an operator; built with innerHTML, a note containing <b> or a script tag would become part of the page. textContent shows it as plain text, whatever it says.",
      terms: [
        ["replaceChildren", "replaceChildren()", "Removes every child: an empty tbody."],
        ["createElement", "createElement", "Makes a new element, not yet on the page."],
        ["appendChild", "appendChild", "Adds it as the last child."],
      ],
      out: `Push one entry whose note contains <b> tags, then renderRows()
                                                      →  Conveyor 3 | 07:30 | 07:45 | 15 | Changeover | <b>53</b> to 30 gal
document.querySelectorAll("#rows b").length           →  0`,
    },
    {
      lang: "js",
      file: "downtime.js",
      t: "Totals by machine",
      goal: "Write renderTotals(): sum the minutes per machine into an object, list each as \"machine: N min\" in the totals list, and put the shift total in the total paragraph.",
      code: `function renderTotals() {
  const byMachine = {};
  for (const e of entries) {
    byMachine[e.machine] = (byMachine[e.machine] ?? 0) + e.minutes;
  }
  const list = document.getElementById("totals");
  list.replaceChildren();
  for (const [machine, minutes] of Object.entries(byMachine)) {
    const li = document.createElement("li");
    li.textContent = \`\${machine}: \${minutes} min\`;
    list.appendChild(li);
  }
  const total = entries.reduce((sum, e) => sum + e.minutes, 0);
  document.getElementById("total").textContent = \`Manual downtime this shift: \${total} min\`;
}`,
      about: "Grouping with an object is the same move as the Foundations lane's reduce lesson. These are minutes the PLC never saw, so they come straight off availability: a machine with 450 paid minutes that logs 15 minutes of changeover has 15 fewer minutes to make barrels.",
      terms: [
        ["byMachine", "Group", "One running total per machine."],
        ["??", "?? 0", "Starts a machine's total at 0."],
        ["reduce", "reduce", "Adds up every entry's minutes."],
      ],
      out: `Push the three illustrative stops (15, 12 and 12 min), then renderTotals()
                                                      →  Conveyor 3: 15 min / Hoop Driver 1: 12 min / Char Station 2: 12 min / Manual downtime this shift: 39 min`,
    },
    {
      lang: "js",
      file: "downtime.js",
      t: "Clear the form",
      goal: "Write clearForm() that sets machine, reason, start, end and note back to empty.",
      code: `function clearForm() {
  for (const id of ["machine", "reason", "start", "end", "note"]) {
    document.getElementById(id).value = "";
  }
}`,
      about: "After a save the form should be ready for the next stop. Setting a select's value to \"\" picks the Choose… option, because that is the option whose value is empty. Looping over the ids keeps the list of fields in one place.",
      terms: [
        ["value = \"\"", "value = \"\"", "Empties a field; on a select, picks the empty option."],
      ],
      out: `Fill the Conveyor 3 stop, then clearForm()  →  {"machine":"","reason":"","start":"","end":"","note":""}`,
    },
    {
      lang: "js",
      file: "downtime.js",
      t: "Save an entry",
      goal: "Write save(): read the form, validate it and show any error. If it is good, add its minutes, push it to entries, redraw the rows and totals, clear the form and confirm with showStatus. Run save when Save is clicked.",
      code: `function save() {
  const e = readForm();
  const message = validate(e);
  if (message) {
    showError(message);
    return;
  }
  e.minutes = toMinutes(e.end) - toMinutes(e.start);
  entries.push(e);
  renderRows();
  renderTotals();
  clearForm();
  showStatus(\`Saved: \${e.machine}, \${e.minutes} min \${e.reason.toLowerCase()}.\`);
}

document.getElementById("save").addEventListener("click", save);`,
      about: "Every earlier step comes together here. Nothing is saved unless validate passes, and the minutes are worked out by the script, never typed, so they always match the start and end. addEventListener connects the button to the function; the script runs once, but the listener runs on every click. Finish the step, then try a stop in the preview.",
      terms: [
        ["addEventListener", "addEventListener", "Runs a function every time the event happens."],
        ["\"click\"", "\"click\"", "The event: a mouse click, tap or Enter on the button."],
        ["push", "push", "Adds the entry to the end of the array."],
      ],
      out: `Click Save with nothing filled in                     →  error "Choose a machine and a reason.", status ""
Fill Conveyor 3 07:30 to 07:20, click Save            →  error "End must be after start.", status ""
Fill Conveyor 3 07:30 to 07:45 Changeover, click Save
                                                      →  error "", status "Saved: Conveyor 3, 15 min changeover."
Fill Hoop Driver 1 11:05 to 11:17 Material, click Save
                                                      →  error "", status "Saved: Hoop Driver 1, 12 min material."
Fill Char Station 2 12:40 to 12:52 Quality check, click Save
                                                      →  error "", status "Saved: Char Station 2, 12 min quality check."
Rows                                                  →  Conveyor 3 | 07:30 | 07:45 | 15 | Changeover | 53 to 30 gal / Hoop Driver 1 | 11:05 | 11:17 | 12 | Material | waiting on hoops / Char Station 2 | 12:40 | 12:52 | 12 | Quality check | char depth check
Totals                                                →  Conveyor 3: 15 min / Hoop Driver 1: 12 min / Char Station 2: 12 min / Manual downtime this shift: 39 min
Form after the last save                              →  {"machine":"","reason":"","start":"","end":"","note":""}`,
    },
    {
      lang: "js",
      file: "downtime.js",
      t: "Save only when ready",
      goal: "Write updateSave() that disables Save while the form would fail validation. Run it on every input event of machine, reason, start and end, after each Save click, and once now.",
      code: `function updateSave() {
  document.getElementById("save").disabled = validate(readForm()) !== "";
}

for (const id of ["machine", "reason", "start", "end"]) {
  document.getElementById(id).addEventListener("input", updateSave);
}
document.getElementById("save").addEventListener("click", updateSave);
updateSave();`,
      about: "A disabled button tells the operator the form is not ready before they press anything. The input event fires on every change to a field. Listeners run in the order they were added, so the click listener here runs after save has cleared the form, and Save switches off again. The error text still matters for a reason the button cannot explain, so keep both.",
      terms: [
        ["disabled", "disabled", "When true, the button cannot be clicked."],
        ["\"input\"", "\"input\"", "Fires every time a field's value changes."],
        ["!==", "!==", "Not equal: any message means not ready."],
      ],
      out: `Page loads                              →  save disabled: true
Pick Conveyor 3 and Changeover          →  save disabled: true
Enter 07:30 and 07:45                   →  save disabled: false
Change the end to 07:20                 →  save disabled: true
Change it back to 07:45 and click Save  →  error "", status "Saved: Conveyor 3, 15 min changeover.", save disabled: true`,
    },
    {
      lang: "js",
      file: "downtime.js",
      t: "Undo the last entry",
      goal: "Write undo(): remove the last entry; if there was none, show \"Nothing to undo.\" Otherwise redraw the rows and totals and confirm what was removed. Run it when Undo is clicked.",
      code: `function undo() {
  const removed = entries.pop();
  if (!removed) {
    showError("Nothing to undo.");
    return;
  }
  renderRows();
  renderTotals();
  showStatus(\`Removed: \${removed.machine} \${removed.start} to \${removed.end}.\`);
}

document.getElementById("undo").addEventListener("click", undo);`,
      about: "Mistakes happen at a terminal by the line, and an undo is quicker and safer than asking someone to edit a database. pop removes and returns the last entry, or undefined when the list is empty, which is what the first check catches. Because rows and totals are always drawn from entries, removing one entry and redrawing is all it takes.",
      terms: [
        ["pop", "pop()", "Removes and returns the last item, or undefined."],
        ["removed", "Removed entry", "Used in the confirmation message."],
      ],
      out: `Save the Conveyor 3 and Hoop Driver 1 stops  →  2 rows
Click Undo last                              →  error "", status "Removed: Hoop Driver 1 11:05 to 11:17.", 1 row, Manual downtime this shift: 15 min
Click Undo last                              →  error "", status "Removed: Conveyor 3 07:30 to 07:45.", 0 rows, Manual downtime this shift: 0 min
Click Undo last                              →  error "Nothing to undo.", status ""`,
    },
  ],
});
