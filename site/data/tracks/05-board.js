// Project track 5: Plant Board Page
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
BC.addTrack({
  id: "t-board",
  name: "Plant Board Page",
  sub: "A live line board: HTML skeleton, CSS layout and status colors, JavaScript that renders the data from every earlier track",
  lessons: [
    {
      lang: "html",
      file: "board.html",
      t: "Board header",
      goal: "Add a header (class top) with an h1 \"Cooperage Line Board\", a paragraph with id shift-info reading Loading, and an empty paragraph with id clock.",
      code: `<header class="top">
  <h1>Cooperage Line Board</h1>
  <p id="shift-info">Loading</p>
  <p id="clock"></p>
</header>`,
      about: "Every element JavaScript will fill later gets an id now. \"Loading\" is what shows if the script fails, which is better than a blank space on a TV across the plant floor.",
      terms: [
        ["header", "<header>", "The page's top band. Semantic tags like header and main describe what a block is for."],
        ["id", "id=\"shift-info\"", "A unique name JavaScript uses to find this element."],
        ["clock", "Empty placeholders", "Elements that start empty and get filled by code."],
      ],
    },
    {
      lang: "html",
      file: "board.html",
      t: "Board layout",
      goal: "Add a main element (class board) with a tiles section (id tiles), a Pareto panel with an h2 and a div (id pareto), and a notes panel with an h2 and a ul (id notes).",
      code: `<main class="board">
  <section class="tiles" id="tiles"></section>
  <section class="panel">
    <h2>Downtime Pareto, this week</h2>
    <div id="pareto"></div>
  </section>
  <section class="panel">
    <h2>Handoff notes</h2>
    <ul id="notes"></ul>
  </section>
</main>`,
      about: "The HTML is a skeleton: three empty containers with labels. All the numbers will be added by JavaScript, so the same page can show any shift without editing the HTML.",
      terms: [
        ["main", "<main>", "The page's main content."],
        ["section", "<section>", "A themed block of the page."],
        ["ul", "<ul id=\"notes\">", "An empty list that JavaScript fills with notes."],
      ],
    },
    {
      lang: "css",
      file: "board.css",
      t: "Colors as variables",
      goal: "Define the board palette as CSS variables on :root (bg, panel, text, muted, ok, warn, bad), then set the body to use them with no margin and Arial.",
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
}`,
      about: "Variables put every color in one place. A dark background suits a TV board: less glare, and colored status marks stand out. Green, amber and red are reserved for status only, the same rule as the HMI faceplate.",
      terms: [
        ["--bg", "--name: value;", "A CSS variable. Define it once, use it anywhere."],
        ["var", "var(--bg)", "Reads a variable's value."],
        [":", ":root", "The top of the page. Variables set here apply everywhere."],
      ],
    },
    {
      lang: "css",
      file: "board.css",
      t: "Header and grid layout",
      goal: "Lay out the header as a spaced flex row, make the board a two-column grid (2fr / 1fr) with 16px gaps, and let the tiles row span both columns and fill with 180px-minimum tiles.",
      code: `.top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
  padding: 16px 24px;
}
.top h1 {
  margin: 0;
  font-size: 28px;
}
.board {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
  padding: 0 24px 24px;
}
.tiles {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}`,
      about: "Flex lines things up in one direction; grid places them in rows and columns. auto-fit with minmax adds as many tile columns as fit, so three machines or ten both look right without code changes.",
      terms: [
        ["flex", "display: flex", "Lays children in a row. justify-content spreads them out."],
        ["grid", "display: grid", "Rows and columns. fr units share the leftover space."],
        ["grid-column", "grid-column: 1 / -1", "Span from the first line to the last: full width."],
        ["minmax", "repeat(auto-fit, minmax(180px, 1fr))", "As many columns as fit, each at least 180px."],
      ],
    },
    {
      lang: "css",
      file: "board.css",
      t: "Tiles and panels",
      goal: "Give panels and tiles the panel background, rounded corners and padding. Style tile values large and bold, labels small, muted and uppercase, and add a colored top border for ok, warn and bad tiles.",
      code: `.panel, .tile {
  background: var(--panel);
  border-radius: 8px;
  padding: 16px;
}
.panel h2 {
  margin: 0 0 12px;
  font-size: 16px;
}
.tile .value {
  font-size: 44px;
  font-weight: bold;
}
.tile .label {
  color: var(--muted);
  text-transform: uppercase;
  font-size: 12px;
}
.tile.ok { border-top: 4px solid var(--ok); }
.tile.warn { border-top: 4px solid var(--warn); }
.tile.bad { border-top: 4px solid var(--bad); }`,
      about: "The number is the biggest thing on the tile because it is what someone reads from 30 feet away. Status shows as a colored bar, not a colored tile, so a whole wall of red never happens.",
      terms: [
        [".panel, .tile", ".panel, .tile", "A comma applies one rule to several selectors."],
        [".tile .value", ".tile .value", "A space means \"inside\": value elements within a tile."],
        [".tile.ok", ".tile.ok", "No space means \"both classes on the same element\"."],
        ["border-top", "border-top: 4px solid …", "A colored bar along the top edge."],
      ],
    },
    {
      lang: "css",
      file: "board.css",
      t: "Pareto bar styles",
      goal: "Style each Pareto row as a 3-column grid (label, bar, number), the bar as an 18px amber block, the number right-aligned and muted, and pad the notes list.",
      code: `.bar-row {
  display: grid;
  grid-template-columns: 110px 1fr 50px;
  gap: 8px;
  align-items: center;
  margin: 6px 0;
}
.bar {
  height: 18px;
  background: var(--warn);
  border-radius: 3px;
}
.bar-row .num {
  text-align: right;
  color: var(--muted);
}
#notes {
  padding-left: 18px;
  line-height: 1.6;
}`,
      about: "The bar's width will be set by JavaScript as a percent of the biggest loss, so CSS only decides how a bar looks, not how long it is. #notes targets the element by id.",
      terms: [
        ["bar-row", "grid-template-columns: 110px 1fr 50px", "Fixed label width, flexible bar, fixed number width."],
        ["#", "#notes", "An id selector. Matches the one element with id=\"notes\"."],
        ["text-align", "text-align: right", "Lines up numbers on their right edge."],
      ],
    },
    {
      lang: "css",
      file: "board.css",
      t: "Phone layout",
      goal: "Below 700px wide, stack the board into one column and shrink tile values to 32px.",
      code: `@media (max-width: 700px) {
  .board {
    grid-template-columns: 1fr;
  }
  .tile .value {
    font-size: 32px;
  }
}`,
      about: "A media query applies rules only when the condition is true. The same page works on the break-room TV and on a supervisor's phone.",
      terms: [
        ["@media", "@media (max-width: 700px)", "Rules inside apply only on screens 700px wide or narrower."],
        ["1fr", "grid-template-columns: 1fr", "One full-width column."],
      ],
    },
    {
      lang: "js",
      file: "board.js",
      t: "The board data",
      goal: "Define a const board object with shift, window, a machines list (name, oee, status), a pareto list (fault, minutes) and a notes list (author, text), using the numbers from the earlier tracks.",
      code: `const board = {
  shift: "A",
  window: "Sat Nov 07, 06:00 to 14:00",
  machines: [
    { name: "Char Station 2", oee: 0.860, status: "DOWN" },
    { name: "Conveyor 3", oee: 0.738, status: "OK" },
    { name: "Hoop Driver 1", oee: 0.729, status: "BEHIND" },
  ],
  pareto: [
    { fault: "Low air", minutes: 87.4 },
    { fault: "Char flare", minutes: 70.0 },
    { fault: "Hoop misfeed", minutes: 66.6 },
    { fault: "Jam", minutes: 65.7 },
    { fault: "E-stop", minutes: 10.8 },
  ],
  notes: [
    { author: "T. Nguyen", text: "Burner B igniter sparking weak on Char Station 2." },
    { author: "J. Ruiz", text: "Low air twice on Hoop Driver 1. Compressor tech called." },
  ],
};`,
      about: "This object is the contract between the data and the page. OEE comes from the OEE Loss Report, status and notes from Shift Handoff, and the Pareto from DB Pulls & Analytics. In production a server would send this as JSON; step 16 adds that.",
      terms: [
        ["const", "const", "A name that will not be reassigned. The object inside can still change."],
        ["{", "{ key: value }", "An object: named values. Like a Python dict."],
        ["[", "[ … ]", "An array: an ordered list."],
        [",", "Trailing comma", "Allowed after the last item. Makes adding rows cleaner."],
      ],
      out: `board.machines.length  →  3
board.pareto.length    →  5
board.notes.length     →  2
Tiles on the page      →  0
Header text            →  "Loading"`,
    },
    {
      lang: "js",
      file: "board.js",
      t: "Status class and header",
      goal: "Write statusClass(status) that maps DOWN to bad, BEHIND to warn, else ok. Write renderHeader() that sets the shift-info text to \"Shift A · <window>\".",
      code: `function statusClass(status) {
  if (status === "DOWN") return "bad";
  if (status === "BEHIND") return "warn";
  return "ok";
}

function renderHeader() {
  document.getElementById("shift-info").textContent =
    \`Shift \${board.shift} · \${board.window}\`;
}`,
      about: "statusClass is the same rule as the handoff page, expressed once. Template literals use backticks and ${} to insert values, the JavaScript version of an f-string.",
      terms: [
        ["function", "function name(args) { }", "Defines a reusable block of code."],
        ["===", "===", "Strict equality. Always use === in JavaScript, not ==."],
        ["getElementById", "document.getElementById(\"…\")", "Finds the one element with that id."],
        ["textContent", ".textContent =", "Sets an element's text. Treats everything as plain text, never HTML."],
      ],
      out: `statusClass("DOWN")                        →  "bad"
statusClass("BEHIND")                      →  "warn"
statusClass("OK")                          →  "ok"
Header before anything calls renderHeader  →  "Loading"
renderHeader()                             →  "Shift A · Sat Nov 07, 06:00 to 14:00"`,
    },
    {
      lang: "js",
      file: "board.js",
      t: "Machine tiles",
      goal: "Write renderTiles(): clear the tiles section, then for each machine create a div with class tile plus its status class, holding the name, OEE as a 1-decimal percent, and \"OEE this week · STATUS\".",
      code: `function renderTiles() {
  const tiles = document.getElementById("tiles");
  tiles.innerHTML = "";
  for (const m of board.machines) {
    const tile = document.createElement("div");
    tile.className = \`tile \${statusClass(m.status)}\`;
    tile.innerHTML = \`
      <div class="label">\${m.name}</div>
      <div class="value">\${(m.oee * 100).toFixed(1)}%</div>
      <div class="label">OEE this week · \${m.status}</div>\`;
    tiles.appendChild(tile);
  }
}`,
      about: "Clearing first means render can run again on new data without duplicating tiles. createElement makes a new element, and appendChild puts it on the page.",
      terms: [
        ["for", "for (const m of list)", "Loops over each item in an array."],
        ["createElement", "document.createElement(\"div\")", "Makes a new element that is not on the page yet."],
        ["className", ".className =", "Sets the element's classes, which hooks it to the CSS."],
        ["toFixed", ".toFixed(1)", "Formats a number with 1 decimal place, as text."],
      ],
      out: `renderTiles():
    tile bad: Char Station 2 86.0% OEE this week · DOWN
    tile ok: Conveyor 3 73.8% OEE this week · OK
    tile warn: Hoop Driver 1 72.9% OEE this week · BEHIND`,
    },
    {
      lang: "js",
      file: "board.js",
      t: "Biggest-gap tile",
      goal: "Write renderSummary(): find the machine with the lowest OEE using reduce, compute its gap to 85% in points, and append an amber tile showing the gap and the machine name.",
      code: `function renderSummary() {
  const worst = board.machines.reduce((a, b) => (a.oee < b.oee ? a : b));
  const gap = (0.85 - worst.oee) * 100;
  const tile = document.createElement("div");
  tile.className = "tile warn";
  tile.innerHTML = \`
    <div class="label">Biggest gap to 85%</div>
    <div class="value">\${gap.toFixed(1)} pts</div>
    <div class="label">\${worst.name}</div>\`;
  document.getElementById("tiles").appendChild(tile);
}`,
      about: "reduce walks the list keeping whichever of two items wins the comparison. Hoop Driver 1 is lowest at 72.9%, so the tile reads 12.1 pts. One tile that answers \"where should we look?\" is worth more than another chart.",
      terms: [
        ["reduce", ".reduce((a, b) => …)", "Collapses a list to one value by comparing items pairwise."],
        ["=>", "(a, b) => …", "An arrow function: a short way to write a small function."],
        ["?", "cond ? x : y", "Returns x if the condition is true, otherwise y."],
      ],
      out: `renderTiles(); renderSummary(): the last tile
                                              →  tile warn: Biggest gap to 85% 12.1 pts Hoop Driver 1`,
    },
    {
      lang: "js",
      file: "board.js",
      t: "Draw the Pareto",
      goal: "Write renderPareto(): clear the panel, find the largest minutes, and for each fault add a row with the label, a bar whose width is its share of the largest, and the minutes.",
      code: `function renderPareto() {
  const pareto = document.getElementById("pareto");
  pareto.innerHTML = "";
  const max = Math.max(...board.pareto.map((p) => p.minutes));
  for (const p of board.pareto) {
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = \`
      <span>\${p.fault}</span>
      <div class="bar" style="width: \${(p.minutes / max) * 100}%"></div>
      <span class="num">\${p.minutes.toFixed(0)} min</span>\`;
    pareto.appendChild(row);
  }
}`,
      about: "Bars are scaled to the biggest loss, not the total, so the top bar always fills the row and the rest compare against it. map pulls the minutes out into a plain list; the ... spreads it into Math.max.",
      terms: [
        ["map", ".map((p) => p.minutes)", "Builds a new array from each item."],
        ["...", "Math.max(...list)", "Spread: passes each array item as a separate argument."],
        ["style", "style=\"width: …%\"", "An inline style. Here it sets each bar's length."],
      ],
      out: `renderPareto():
    Low air | bar 100% | 87 min
    Char flare | bar 80.0915% | 70 min
    Hoop misfeed | bar 76.2014% | 67 min
    Jam | bar 75.1716% | 66 min
    E-stop | bar 12.357% | 11 min`,
    },
    {
      lang: "js",
      file: "board.js",
      t: "Handoff notes",
      goal: "Write renderNotes(): empty the list, then for each note add a list item with the author in bold and the note text, using textContent and append, not innerHTML.",
      code: `function renderNotes() {
  const notes = document.getElementById("notes");
  notes.replaceChildren();
  for (const n of board.notes) {
    const li = document.createElement("li");
    const who = document.createElement("b");
    who.textContent = n.author + ": ";
    li.append(who, n.text);
    notes.appendChild(li);
  }
}`,
      about: "Notes are typed by people, so they never go in through innerHTML. textContent and append insert text as text, which is the JavaScript version of html.escape from the handoff track.",
      terms: [
        ["replaceChildren", ".replaceChildren()", "Removes all children. Called with nothing, it empties the element."],
        ["append", ".append(a, b)", "Adds elements or plain text to the end."],
        ["textContent", "textContent vs innerHTML", "User-typed text: textContent. Your own trusted markup: innerHTML."],
      ],
      out: `renderNotes():
    T. Nguyen: Burner B igniter sparking weak on Char Station 2.
    J. Ruiz: Low air twice on Hoop Driver 1. Compressor tech called.`,
    },
    {
      lang: "js",
      file: "board.js",
      t: "Render the board",
      goal: "Write render() that calls the header, tiles, summary, Pareto and notes functions in order, then call it once.",
      code: `function render() {
  renderHeader();
  renderTiles();
  renderSummary();
  renderPareto();
  renderNotes();
}

render();`,
      about: "One function redraws everything. When new data arrives, call render() again. This is the moment the board fills in: check the Target page preview below.",
      terms: [
        ["render", "render()", "The single entry point for drawing the page."],
        [null, "Order matters", "Summary runs after tiles because it appends to the tiles section that renderTiles just cleared."],
      ],
      out: `After the script runs  →  header "Shift A · Sat Nov 07, 06:00 to 14:00", 4 tiles, 5 bars, 2 notes`,
    },
    {
      lang: "js",
      file: "board.js",
      t: "Live clock",
      goal: "Write tick() that shows the current time as hours and minutes in the clock element, call it once, and repeat it every 30 seconds.",
      code: `function tick() {
  const now = new Date();
  document.getElementById("clock").textContent =
    now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

tick();
setInterval(tick, 30000);`,
      about: "A clock on a board tells everyone the page is alive. If it freezes, the TV or the browser has stalled. setInterval repeats a function every N milliseconds. toLocaleTimeString follows the viewer's locale: an en-US browser shows 02:05 PM, a UK one 14:05.",
      terms: [
        ["Date", "new Date()", "The current date and time."],
        ["toLocaleTimeString", ".toLocaleTimeString([], {…})", "Formats a time for the viewer's locale. The options pick hour and minute only."],
        ["setInterval", "setInterval(fn, 30000)", "Runs fn every 30,000 ms (30 seconds)."],
      ],
      out: `Clock at 14:05 (en-US browser)  →  "02:05 PM"
90 seconds later                →  "02:06 PM"`,
    },
    {
      lang: "js",
      file: "board.js",
      t: "Refresh from the server",
      goal: "Write async refresh(): fetch /api/board, throw on a bad status, merge the JSON into board and re-render. On any error, redraw the header and add \" · offline\". Run it every 60 seconds.",
      code: `async function refresh() {
  try {
    const res = await fetch("/api/board");
    if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
    Object.assign(board, await res.json());
    render();
  } catch (err) {
    renderHeader();
    document.getElementById("shift-info").textContent += " · offline";
  }
}

setInterval(refresh, 60000);`,
      about: "In production the board pulls fresh numbers from a small API that runs the SQL from the earlier tracks. The preview has no network, so this shows the failure path, which matters just as much: the board keeps its last numbers and says it is offline instead of going blank. The output also serves an illustrative /api/board reply with Char Station 2 back to OK, to show the success path redrawing the tiles.",
      terms: [
        ["async", "async / await", "Lets you wait for slow things like network calls without freezing the page."],
        ["fetch", "fetch(url)", "Requests data from a server."],
        ["try", "try { } catch (err) { }", "Runs the code and catches any error instead of crashing."],
        ["assign", "Object.assign(board, data)", "Copies the new values into the existing board object."],
      ],
      out: `In the preview, at load                       →  "Shift A · Sat Nov 07, 06:00 to 14:00"
In the preview, after 60 s (fetch fails)      →  "Shift A · Sat Nov 07, 06:00 to 14:00 · offline"
Served /api/board with Char Station 2 back to OK, after 60 s
                                              →  "Shift A · Sat Nov 07, 06:00 to 14:00"; tile ok: Char Station 2 86.0% OEE this week · OK`,
    },
  ],
});
