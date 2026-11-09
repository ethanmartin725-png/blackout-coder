// Project track 13: High-Performance HMI
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
// Outputs of the JavaScript steps: node tools/output-checks/track13-hphmi/run.mjs (runs each step's page in Chromium)
BC.addTrack({
  id: "t-hphmi",
  name: "High-Performance HMI",
  sub: "A Level 1 overview built on HMI design principles: a display hierarchy, grey for normal, color only for alarms, analog indicators with a normal band, and alarms that follow ISA-18.2",
  lessons: [
    {
      lang: "html",
      file: "overview.html",
      t: "Level 1 header",
      goal: "Add a header (class hdr) with an h1 \"Barrel Line · Overview\" and a paragraph \"Shift A end · Sat Nov 07 · as of 14:05\".",
      code: `<header class="hdr">
  <h1>Barrel Line · Overview</h1>
  <p>Shift A end · Sat Nov 07 · as of 14:05</p>
</header>`,
      about: "ANSI/ISA-101.01 organizes an HMI as a hierarchy of displays. Level 1 is the overview of the operator's whole area: is anything wrong, and where? Level 2 is one unit in more detail, Level 3 one piece of equipment, Level 4 diagnostics. This track builds a Level 1 overview of the three machines with a Level 2 panel behind each one. ISA-101 does not choose colors or layouts: it asks each site to write a style guide and follow it. The grey palette and alarm colors here come from high-performance HMI practice (the ASM Consortium guidelines and Hollifield's High Performance HMI Handbook) and are illustrative. The screen shows shift A's final numbers at 14:05, the handoff time used in every track.",
      terms: [
        ["header", "<header>", "The screen's top band: what this display is and when."],
        [null, "Level 1", "ISA-101's overview level: the whole area on one screen."],
      ],
    },
    {
      lang: "html",
      file: "overview.html",
      t: "Alarm summary",
      goal: "Add a section (class alarms, aria-label Alarms) with an h2 \"Alarms\" holding an empty span (id alarmCount), and an empty ordered list (class alarm-list, id alarmList).",
      code: `<section class="alarms" aria-label="Alarms">
  <h2>Alarms <span id="alarmCount"></span></h2>
  <ol class="alarm-list" id="alarmList"></ol>
</section>`,
      about: "The alarm summary sits right under the header, where the eye starts, and in the same place on every display. It lists only conditions the operator must act on. ISA-18.2, the alarm management standard, defines an alarm as a condition that needs a timely operator response. A machine running behind target is worth showing, but it is not an alarm, so it goes on the tile, not in this list. An ordered list fits: the order will mean something.",
      terms: [
        ["ol", "<ol>", "An ordered list. Here the order is priority, then time."],
        ["aria-label", "aria-label", "Names the region for screen readers."],
      ],
    },
    {
      lang: "html",
      file: "overview.html",
      t: "Air pressure indicator",
      goal: "Add a section (class analog, id air) with an h2 \"Hoop Driver 1 air\", a scale span holding a band span and a pointer span, an ends span with 60 and 130, and a reading paragraph: a b (class value) showing -- and a unit span \"psi · normal 85 to 110\".",
      code: `<section class="analog" id="air">
  <h2>Hoop Driver 1 air</h2>
  <span class="scale">
    <span class="band"></span>
    <span class="pointer"></span>
  </span>
  <span class="ends"><span>60</span><span>130</span></span>
  <p class="reading"><b class="value">--</b> <span class="unit">psi · normal 85 to 110</span></p>
</section>`,
      about: "A number alone makes the operator remember the limits and do the comparison. A pointer on a scale with the normal band shaded answers \"is it OK?\" before the number is read, and shows how close it is to the edge. 85 to 110 psi is Hoop Driver 1's air band from the AM Checklist. The 60 to 130 psi scale is illustrative. The value starts as -- so a broken script shows a placeholder, not a stale number.",
      terms: [
        ["band", "Normal band", "The shaded range where the value should sit."],
        ["pointer", "Pointer", "The live value's position on the scale."],
        ["--", "--", "A placeholder until the script fills in the value."],
      ],
    },
    {
      lang: "html",
      file: "overview.html",
      t: "Machine tiles",
      goal: "Add a section (aria-label Machines) with an h2 \"Machines · barrels this shift\" and an empty div (class tiles, id tiles). Then a template (id tileTpl) holding a button tile with spans for name, state, the value (b) of the target in bbl, and a bar holding fill and mark.",
      code: `<section aria-label="Machines">
  <h2>Machines · barrels this shift</h2>
  <div class="tiles" id="tiles"></div>
</section>
<template id="tileTpl">
  <button type="button" class="tile">
    <span class="name"></span>
    <span class="state"></span>
    <span><b class="value"></b> <span class="unit">of <span class="target"></span> bbl</span></span>
    <span class="bar"><span class="fill"></span><span class="mark"></span></span>
  </button>
</template>`,
      about: "Every tile shows a value next to its target, so it carries information and not just data: 274 means little, 274 of 412.5 says the machine is behind. The bar repeats it as a shape, and the mark on it is the 70% line where the Shift Handoff calls a machine BEHIND. A template is markup the browser parses but does not show; the script copies it once per machine. Each tile is a button, so it can be opened from a keyboard or a touch screen, not just a mouse.",
      terms: [
        ["template", "<template>", "Markup kept for the script to copy. Not shown on its own."],
        ["button", "<button>", "Clickable and reachable by keyboard."],
        ["bbl", "bbl", "Barrels."],
      ],
    },
    {
      lang: "html",
      file: "overview.html",
      t: "Level 2 detail panel",
      goal: "Add a hidden section (class detail, id detail) with an h2 (id detailName), a dl with Barrels, Of target and Down this shift (dd ids dBarrels, dPct, dDown), an h3 \"Faults this shift\", an empty ul (id dFaults) and a \"Back to overview\" button (id closeDetail).",
      code: `<section class="detail" id="detail" hidden>
  <h2 id="detailName"></h2>
  <dl>
    <dt>Barrels</dt><dd id="dBarrels"></dd>
    <dt>Of target</dt><dd id="dPct"></dd>
    <dt>Down this shift</dt><dd id="dDown"></dd>
  </dl>
  <h3>Faults this shift</h3>
  <ul id="dFaults"></ul>
  <button type="button" id="closeDetail">Back to overview</button>
</section>`,
      about: "Level 2 is one unit in detail, reached from its tile. Keeping detail off the overview is the point of the hierarchy: the overview stays readable at a glance, and the operator drills down only where something needs a look. hidden keeps the panel off the screen until the script opens it. A definition list (dl, dt, dd) pairs each label with its value.",
      terms: [
        ["hidden", "hidden", "Not shown until the script removes it."],
        ["dl", "<dl>, <dt>, <dd>", "A list of labels (dt) and their values (dd)."],
      ],
    },
    {
      lang: "css",
      file: "overview.css",
      t: "Grey palette as tokens",
      goal: "Define the tokens on :root: greys for bg, panel, well, line, text, muted, strong, fill and band, and alarm-1, alarm-2 and alarm-3. Set the body's background, color and font, and give every section a panel background, border, radius, padding and bottom margin.",
      code: `:root {
  --bg: #dcdcd8;
  --panel: #ebebe8;
  --well: #f6f6f4;
  --line: #9a9b97;
  --text: #222324;
  --muted: #55575a;
  --strong: #000000;
  --fill: #6f7174;
  --band: #a7a8a4;
  --alarm-1: #c8102e;
  --alarm-2: #f0b400;
  --alarm-3: #7a3fa0;
}
body {
  background: var(--bg);
  color: var(--text);
  font: 15px/1.4 Arial, Helvetica, sans-serif;
}
section {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 10px 12px;
  margin-bottom: 10px;
}`,
      about: "High-performance HMI practice keeps everything normal in muted greys, so color means one thing: something is wrong. A screen where running is green and stopped is red trains the eye to ignore color, because it is always there. The three alarm colors are reserved for the three alarm priorities and used nowhere else. All values are illustrative; a site's style guide fixes its own. Text is at least 5:1 against its background (WCAG asks 4.5:1), and the alarm icons' digits are 5.9:1 or better.",
      terms: [
        [":root", ":root", "The page itself. Variables set here apply everywhere."],
        ["--alarm-1", "--alarm-1", "Reserved for priority 1 alarms, and nothing else."],
        ["var", "var(--name)", "Uses a variable's value."],
      ],
    },
    {
      lang: "css",
      file: "overview.css",
      t: "Tiles and type hierarchy",
      goal: "Lay out the header with flex, size the h1, make h2 small, muted and uppercase, mute the header paragraph and units, grid the tiles with auto-fit, style a tile as a left-aligned button, make the name bold and the value 30px in the strong color.",
      code: `.hdr {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 2px solid var(--line);
  margin-bottom: 10px;
}
.hdr h1 { margin: 0; font-size: 18px; }
h2 {
  margin: 0 0 6px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.hdr p, h2, .unit { color: var(--muted); }
.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}
.tile {
  display: grid;
  gap: 4px;
  text-align: left;
  font: inherit;
  color: inherit;
  background: var(--well);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 10px;
  cursor: pointer;
}
.name { font-weight: bold; }
.value { font-size: 30px; color: var(--strong); }`,
      about: "Size and weight set the reading order: the barrel count is biggest because it is what the operator checks first; labels and units are small and muted because they are read once and then known. That is hierarchy inside one tile, matching the hierarchy across displays. A button brings its own font and colors, so font: inherit and color: inherit make the tile match the page.",
      terms: [
        ["auto-fit", "repeat(auto-fit, minmax(…))", "As many columns as fit, each at least 160px."],
        ["inherit", "inherit", "Take the parent's value instead of the button's default."],
        ["text-transform", "text-transform", "Shows the heading in capitals without retyping it."],
      ],
    },
    {
      lang: "css",
      file: "overview.css",
      t: "Detail panel layout",
      goal: "Lay the detail's dl out as a two-column grid (labels at their own width, values in the rest), drop the dd margin and bold the values, size the h3 like the h2s, and trim the fault list's spacing.",
      code: `.detail dl {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 4px 16px;
  margin: 0 0 10px;
}
.detail dt { color: var(--muted); }
.detail dd { margin: 0; font-weight: bold; }
.detail h3 { margin: 0 0 4px; font-size: 13px; color: var(--muted); }
.detail ul { margin: 0 0 10px; padding-left: 18px; }`,
      about: "A browser shows a dl as labels with indented values underneath, which wastes height and splits each pair. A two-column grid puts every label beside its value, so the panel reads like a faceplate: label, value, label, value. max-content sizes the label column to its longest label. The values are bold for the same reason the tile's count is big: they are what the operator came to read.",
      terms: [
        ["max-content", "max-content", "As wide as the widest content, no wider."],
        ["dd", "dd", "A value in a definition list; browsers indent it by default."],
      ],
    },
    {
      lang: "css",
      file: "overview.css",
      t: "Bar and analog indicator",
      goal: "Style .bar and .scale as relative blocks with a well background and a border, the scale taller. Place fill, mark, band and pointer absolutely. Make a behind tile's fill the text color, space the ends apart, and thicken the pointer and bold the reading when the analog is out of its band.",
      code: `.bar, .scale {
  position: relative;
  display: block;
  height: 10px;
  background: var(--well);
  border: 1px solid var(--line);
}
.scale { height: 18px; margin-top: 6px; }
.fill { position: absolute; top: 0; bottom: 0; left: 0; background: var(--fill); }
.mark { position: absolute; top: -4px; bottom: -4px; width: 2px; background: var(--text); }
.band { position: absolute; top: 0; bottom: 0; background: var(--band); }
.pointer {
  position: absolute;
  top: -5px;
  bottom: -5px;
  width: 4px;
  margin-left: -2px;
  background: var(--strong);
}
.behind .fill { background: var(--text); }
.ends { display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); }
.reading { margin: 4px 0 0; }
.out .pointer { width: 8px; margin-left: -4px; }
.out .reading { font-weight: bold; }`,
      about: "position: absolute places the fill, band and pointer inside their bar by percentages the script sets, so CSS only decides how they look. The pointer is black on a grey band, the strongest contrast on the screen, because it is what moves. A machine behind target or a reading outside its band gets weight, not color: it is worth noticing, but it is not an alarm. If low air needs action, the PLC's Low air alarm is what turns red, in the alarm list.",
      terms: [
        ["position: absolute", "position: absolute", "Placed inside the nearest positioned parent, here the bar."],
        ["position: relative", "position: relative", "Makes the bar the frame its children are placed in."],
        [".out", ".out", "Set by the script when the reading leaves the normal band."],
      ],
    },
    {
      lang: "css",
      file: "overview.css",
      t: "Alarm priority: color, shape and number",
      goal: "Remove the alarm list's bullets and spacing, lay each item out in a row with a top border, make .icon a 22px centered box, then give p1 a red square, p2 an amber triangle and p3 a violet diamond. Mute returned-to-normal alarms, push the Ack button right, and border an abnormal tile in alarm-1.",
      code: `.alarm-list { list-style: none; margin: 0; padding: 0; }
.alarm-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-top: 1px solid var(--line);
}
.icon {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 22px;
  height: 22px;
  font-weight: bold;
}
.p1 .icon { background: var(--alarm-1); color: #ffffff; }
.p2 .icon {
  background: var(--alarm-2);
  color: #000000;
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  align-content: end;
}
.p3 .icon {
  background: var(--alarm-3);
  color: #ffffff;
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
}
.rtn { color: var(--muted); }
.ack { margin-left: auto; }
.tile.abnormal { border: 3px solid var(--alarm-1); }`,
      about: "About 1 man in 12 has some color-vision deficiency, and a sunlit or washed-out panel loses color for everyone. So each priority is told three ways: color, a shape, and its number written in the shape. Red square for priority 1, amber triangle for 2 and violet diamond for 3 are illustrative; a site's style guide sets its own. Priority itself comes from ISA-18.2: how bad the consequence is and how little time there is to act. clip-path cuts the box to a shape, so the background color fills only the triangle or diamond.",
      terms: [
        ["clip-path", "clip-path: polygon(…)", "Cuts the element to a shape given by corner points."],
        ["place-items", "place-items: center", "Centers the number in the icon."],
        [".rtn", ".rtn", "Returned to normal: the condition has cleared but nobody has acknowledged it yet."],
      ],
    },
    {
      lang: "css",
      file: "overview.css",
      t: "Flash only what is new",
      goal: "Define a flash keyframe that hides the icon's color at 50%, run it on .unack .icon every 1 s in steps, and under prefers-reduced-motion replace it with a solid 3px outline.",
      code: `@keyframes flash {
  50% { background: transparent; color: var(--text); }
}
.unack .icon { animation: flash 1s steps(1) infinite; }
@media (prefers-reduced-motion: reduce) {
  .unack .icon {
    animation: none;
    outline: 3px solid var(--text);
    outline-offset: 2px;
  }
}`,
      about: "Motion is the strongest attention-getter on a screen, so it is spent on one thing: an alarm nobody has acknowledged yet. Once acknowledged it stops flashing but keeps its color while the condition is still active. steps(1) switches between the two states instead of fading. One flash a second stays far below the three a second WCAG warns can trigger seizures. Someone who has asked their device for less motion gets a solid outline instead, which still marks the alarm as unacknowledged.",
      terms: [
        ["@keyframes", "@keyframes", "Names an animation and what it changes."],
        ["steps(1)", "steps(1)", "Jump between states, no fade."],
        ["prefers-reduced-motion", "prefers-reduced-motion", "True when the viewer's device asks for less motion."],
      ],
    },
    {
      lang: "css",
      file: "overview.css",
      t: "Phone layout and tap targets",
      goal: "Under 600px wide: stack the header, put one tile per row, and make the Ack button at least 44 by 64 px.",
      code: `@media (max-width: 600px) {
  .hdr { display: block; }
  .tiles { grid-template-columns: 1fr; }
  .ack { min-height: 44px; min-width: 64px; }
}`,
      about: "The same hierarchy has to hold on a supervisor's phone: alarms first, then the air, then the machines, in one column. Only the arrangement changes. A gloved finger needs a bigger target than a mouse pointer; 44 px is the common minimum for touch.",
      terms: [
        ["@media", "@media (max-width: 600px)", "These rules apply only on screens 600px wide or narrower."],
        ["min-height", "min-height", "At least this tall, whatever the text inside."],
      ],
    },
    {
      lang: "js",
      file: "overview.js",
      t: "Screen data at 14:05",
      goal: "Define PAID_HOURS 7.5 and BEHIND 0.7, and SCREEN with now, the three machines (name, state, barrels, rate), the air reading and its scale and band, one active unacknowledged priority 1 alarm for the char flare, and shift A's five faults with their minutes.",
      code: `const PAID_HOURS = 7.5;
const BEHIND = 0.7;
const SCREEN = {
  now: "14:05",
  machines: [
    { name: "Char Station 2", state: "Down", barrels: 301, rate: 50 },
    { name: "Conveyor 3", state: "Running", barrels: 352, rate: 60 },
    { name: "Hoop Driver 1", state: "Running", barrels: 274, rate: 55 },
  ],
  air: { psi: 92, min: 60, max: 130, lo: 85, hi: 110 },
  alarms: [
    { id: 1, priority: 1, machine: "Char Station 2", text: "Char flare", since: "13:41:15", active: true, acked: false },
  ],
  faults: [
    { machine: "Conveyor 3", fault: "Jam", start: "09:08:52", end: "09:13:29", min: 4.62 },
    { machine: "Hoop Driver 1", fault: "Hoop misfeed", start: "10:09:40", end: "10:17:10", min: 7.5 },
    { machine: "Hoop Driver 1", fault: "Low air", start: "11:31:00", end: "11:49:30", min: 18.5 },
    { machine: "Hoop Driver 1", fault: "Low air", start: "12:22:00", end: "12:37:00", min: 15 },
    { machine: "Char Station 2", fault: "Char flare", start: "13:41:15", end: null, min: 18.75 },
  ],
};`,
      about: "Every number here comes from the shared sample plant at the handoff time. Barrels, states and faults are Shift Handoff's. Fault minutes are clipped to the shift window, so the open char flare counts 18.75 minutes for shift A even though it has been down 23.75 at 14:05. Rates are the ideal rates; 7.5 paid hours and the 70% BEHIND line are the Shift Handoff's. The air reading, 92 psi, is the Ignition track's tag value. The alarm's priority is illustrative, and it starts unacknowledged so the later steps have something to acknowledge. In a real HMI this object would be live tag values.",
      terms: [
        ["const", "const", "A name that cannot be reassigned. The object's contents can still change."],
        ["null", "null", "No end time: the fault is still open."],
        [null, "Paid hours", "8-hour shift less a 30-minute break."],
      ],
      out: `Machine targets (rate × PAID_HOURS)  →  ["Char Station 2 301 of 375","Conveyor 3 352 of 450","Hoop Driver 1 274 of 412.5"]
Down minutes by machine              →  {"Conveyor 3":4.62,"Hoop Driver 1":41,"Char Station 2":18.75}
Active alarms                        →  1`,
    },
    {
      lang: "js",
      file: "overview.js",
      t: "Draw the tiles",
      goal: "Write pctOfTarget(m) as barrels over rate × PAID_HOURS. Write drawTiles(): clear #tiles, then for each machine copy the template's button, fill name, state (adding \" · behind target\" under BEHIND), value and target, set the fill width (capped at 100%) and the mark at BEHIND, add class abnormal when Down and behind when under BEHIND, store the name in data-name and append it. Call drawTiles().",
      code: `function pctOfTarget(m) {
  return m.barrels / (m.rate * PAID_HOURS);
}

function drawTiles() {
  const box = document.getElementById("tiles");
  box.textContent = "";
  for (const m of SCREEN.machines) {
    const tile = document.getElementById("tileTpl").content.firstElementChild.cloneNode(true);
    const pct = pctOfTarget(m);
    tile.dataset.name = m.name;
    tile.querySelector(".name").textContent = m.name;
    tile.querySelector(".state").textContent = m.state + (pct < BEHIND ? " · behind target" : "");
    tile.querySelector(".value").textContent = m.barrels;
    tile.querySelector(".target").textContent = m.rate * PAID_HOURS;
    tile.querySelector(".fill").style.width = Math.min(pct, 1) * 100 + "%";
    tile.querySelector(".mark").style.left = BEHIND * 100 + "%";
    if (m.state === "Down") tile.classList.add("abnormal");
    if (pct < BEHIND) tile.classList.add("behind");
    box.appendChild(tile);
  }
}

drawTiles();`,
      about: "The script decides what is abnormal and the CSS decides how abnormal looks, so the style guide can change without touching this code. Only two things get emphasis: Char Station 2 is Down with an open alarm, so its tile gets the alarm border; Hoop Driver 1 is at 66.4% of target, under the 70% line, so its bar turns dark and its state says so in words. Conveyor 3 at 78.2% and Char Station 2 at 80.3% stay plain grey. Hoop Driver 1's target is 412.5 because 55 an hour times 7.5 hours is not a whole number; the Shift Handoff uses the same ideal.",
      terms: [
        ["content", "template.content", "The template's markup, ready to copy."],
        ["cloneNode", "cloneNode(true)", "A copy of the element and everything inside it."],
        ["dataset", "dataset.name", "Sets the data-name attribute, read back later to find the machine."],
        ["classList", "classList.add", "Adds a class without disturbing the others."],
      ],
      out: `Tiles                          →  Char Station 2 | Down | 301 of 375 bbl | fill 80.27% | abnormal
                                  Conveyor 3 | Running | 352 of 450 bbl | fill 78.22% | -
                                  Hoop Driver 1 | Running · behind target | 274 of 412.5 bbl | fill 66.42% | behind
Mark                           →  70% on every tile
Border (from the CSS steps)    →  3px rgb(200, 16, 46) / 1px rgb(154, 155, 151) / 1px rgb(154, 155, 151)
Fill color, plain then behind  →  rgb(111, 113, 116) / rgb(34, 35, 36)`,
    },
    {
      lang: "js",
      file: "overview.js",
      t: "Place the pointer",
      goal: "Write placeOnScale(v, a) giving v's position on a's scale as a percent. Write drawAir(): place and size the band from lo to hi, place the pointer at the reading clamped to the scale, show the value, and toggle class out when the reading is outside the band. Call drawAir().",
      code: `function placeOnScale(v, a) {
  return ((v - a.min) / (a.max - a.min)) * 100;
}

function drawAir() {
  const a = SCREEN.air;
  const box = document.getElementById("air");
  const band = box.querySelector(".band");
  band.style.left = placeOnScale(a.lo, a) + "%";
  band.style.width = placeOnScale(a.hi, a) - placeOnScale(a.lo, a) + "%";
  const shown = Math.min(Math.max(a.psi, a.min), a.max);
  box.querySelector(".pointer").style.left = placeOnScale(shown, a) + "%";
  box.querySelector(".value").textContent = a.psi;
  box.classList.toggle("out", a.psi < a.lo || a.psi > a.hi);
}

drawAir();`,
      about: "A reading's place on the scale is how far it is from the bottom, as a share of the whole range: 92 psi on a 60 to 130 scale is 32 of 70, about 45.7%. A reading off the scale pins the pointer at the end instead of drawing it outside the box, while the number still shows the real value. classList.toggle with a second argument adds the class when it is true and removes it when it is false, so the same call handles both directions.",
      terms: [
        ["Math.min", "Math.min(Math.max(v, lo), hi)", "Clamps v to the range lo to hi."],
        ["toggle", "classList.toggle(name, on)", "Adds the class when on is true, removes it when false."],
      ],
      out: `92 psi at load          →  {"pointer":"45.71%","band":"35.71%","width":"35.71%","value":"92","out":false}
Set psi 81, drawAir()   →  {"pointer":"30%","band":"35.71%","width":"35.71%","value":"81","out":true}
Set psi 150, drawAir()  →  {"pointer":"100%","band":"35.71%","width":"35.71%","value":"150","out":true}
Out of band styling     →  pointer 8px, reading weight 700`,
    },
    {
      lang: "js",
      file: "overview.js",
      t: "Sort the alarm list",
      goal: "Define PRIORITY names. Write drawAlarms(): clear the list, sort a copy of the alarms by priority, then newest first; for each build an li with classes for priority, unack and rtn, its id in data-id, an icon showing the priority number, the text, and an Ack button if unacknowledged. Show the active count. Call drawAlarms().",
      code: `const PRIORITY = { 1: "High", 2: "Medium", 3: "Low" };

function drawAlarms() {
  const list = document.getElementById("alarmList");
  list.textContent = "";
  const sorted = [...SCREEN.alarms].sort((a, b) => a.priority - b.priority || b.since.localeCompare(a.since));
  for (const al of sorted) {
    const li = document.createElement("li");
    li.className = "p" + al.priority + (al.acked ? "" : " unack") + (al.active ? "" : " rtn");
    li.dataset.id = al.id;
    const icon = document.createElement("span");
    icon.className = "icon";
    icon.textContent = al.priority;
    const words = document.createElement("span");
    words.textContent = \`\${PRIORITY[al.priority]} · \${al.since} · \${al.machine}: \${al.text}\${al.active ? "" : " (cleared)"}\`;
    li.append(icon, words);
    if (!al.acked) {
      const ack = document.createElement("button");
      ack.type = "button";
      ack.className = "ack";
      ack.textContent = "Ack";
      li.append(ack);
    }
    list.appendChild(li);
  }
  const n = SCREEN.alarms.filter((a) => a.active).length;
  document.getElementById("alarmCount").textContent = n ? \`· \${n} active\` : "· none active";
}

drawAlarms();`,
      about: "Priority first, because ISA-18.2 priority tells the operator what to deal with first; within a priority, newest first. The sort compares priorities, and only when they tie (a difference of 0, which counts as false) does || move on to compare times. Times as HH:MM:SS text sort correctly as text. [...] sorts a copy so the data keeps its own order. To show the order, the output adds illustrative alarms: Low air on Hoop Driver 1 (priority 2), a dirty eye on Conveyor 3 (priority 3) and an E-stop (priority 1), which goes to the top because it is newer than the char flare. The flash comes from the CSS step; the output reads it back from the browser.",
      terms: [
        ["sort", "sort((a, b) => …)", "Orders by the function: negative puts a first, positive puts b first."],
        ["localeCompare", "localeCompare", "Compares two strings; used here to put the later time first."],
        ["append", "append(a, b)", "Adds several children at once."],
        [null, "Unacknowledged", "Nobody has confirmed seeing it yet. It flashes until someone does."],
      ],
      out: `At 14:05                                      →  1 Char Station 2: Char flare [p1 unack] | · 1 active | animation flash
Add Low air (p2, 14:03:10) and Eye dirty (p3, 14:04:00)
                                              →  1 Char Station 2: Char flare [p1 unack] / 2 Hoop Driver 1: Low air [p2 unack] / 3 Conveyor 3: Eye dirty [p3 unack] | · 3 active
Add a second p1 at 14:04:30                   →  1 Conveyor 3: E-stop [p1 unack] / 1 Char Station 2: Char flare [p1 unack] / 2 Hoop Driver 1: Low air [p2 unack] / 3 Conveyor 3: Eye dirty [p3 unack] | · 4 active
Icon shapes p1 / p2 / p3                      →  none / polygon(50% 0px, 100% 100%, 0px 100%) / polygon(50% 0px, 100% 50%, 50% 100%, 0px 50%)
Same page with reduced motion                 →  animation none, outline 3px solid`,
    },
    {
      lang: "js",
      file: "overview.js",
      t: "Acknowledge and clear",
      goal: "Write prune() that keeps alarms still active or not yet acknowledged. Write acknowledge(id) and returnToNormal(id), each updating the alarm, pruning and redrawing. Listen for clicks on #alarmList and acknowledge the alarm whose Ack button was clicked.",
      code: `function prune() {
  SCREEN.alarms = SCREEN.alarms.filter((a) => a.active || !a.acked);
}

function acknowledge(id) {
  const al = SCREEN.alarms.find((a) => a.id === id);
  if (!al || al.acked) return;
  al.acked = true;
  prune();
  drawAlarms();
}

function returnToNormal(id) {
  const al = SCREEN.alarms.find((a) => a.id === id);
  if (!al) return;
  al.active = false;
  prune();
  drawAlarms();
}

document.getElementById("alarmList").addEventListener("click", (e) => {
  if (!e.target.classList.contains("ack")) return;
  acknowledge(Number(e.target.closest("li").dataset.id));
});`,
      about: "ISA-18.2 tracks two things for every alarm: is the condition still there, and has someone acknowledged it. Acknowledging stops the flash but the alarm stays listed while the condition lasts, because the problem is not fixed. A condition that clears before anyone acknowledges stays listed too, muted and marked cleared, so a brief alarm nobody saw is not lost. An alarm leaves the list only when it is both cleared and acknowledged; prune() is that rule. One click on the list handles every Ack button, including ones drawn later, because the click bubbles up to the list.",
      terms: [
        ["filter", "filter", "Keeps the items for which the function returns true."],
        ["find", "find", "The first item that matches, or undefined."],
        ["closest", "closest(\"li\")", "The nearest ancestor that matches: the button's list item."],
        [null, "Return to normal", "The condition has cleared. Not the same as acknowledged."],
      ],
      out: `Click Ack on the char flare              →  1 Char Station 2: Char flare [p1] | · 1 active | animation none
Add Low air (p2, 14:03:10)               →  1 Char Station 2: Char flare [p1] / 2 Hoop Driver 1: Low air [p2 unack] | · 2 active
returnToNormal(2) before anyone acks it  →  1 Char Station 2: Char flare [p1] / 2 Hoop Driver 1: Low air (cleared) [p2 unack rtn] | · 1 active
Click Ack on the cleared Low air         →  1 Char Station 2: Char flare [p1] | · 1 active
returnToNormal(1), already acknowledged  →  (empty) | · none active`,
    },
    {
      lang: "js",
      file: "overview.js",
      t: "Open the Level 2 detail",
      goal: "Write openDetail(name): find the machine and its faults, sum their minutes, fill the detail title, barrels of target, percent of target to 1 decimal and down minutes to 2, list each fault (start to end, or open), and show the panel. Open it when a tile is clicked, and hide it from the Back button.",
      code: `function openDetail(name) {
  const m = SCREEN.machines.find((x) => x.name === name);
  const faults = SCREEN.faults.filter((f) => f.machine === name);
  const down = faults.reduce((sum, f) => sum + f.min, 0);
  document.getElementById("detailName").textContent = \`\${m.name} · Level 2\`;
  document.getElementById("dBarrels").textContent = \`\${m.barrels} of \${m.rate * PAID_HOURS}\`;
  document.getElementById("dPct").textContent = (pctOfTarget(m) * 100).toFixed(1) + "%";
  document.getElementById("dDown").textContent = down.toFixed(2) + " min";
  const list = document.getElementById("dFaults");
  list.textContent = "";
  for (const f of faults) {
    const li = document.createElement("li");
    li.textContent = \`\${f.start} to \${f.end ?? "open"} · \${f.fault} · \${f.min.toFixed(2)} min\`;
    list.appendChild(li);
  }
  document.getElementById("detail").hidden = false;
}

document.getElementById("tiles").addEventListener("click", (e) => {
  const tile = e.target.closest(".tile");
  if (tile) openDetail(tile.dataset.name);
});

document.getElementById("closeDetail").addEventListener("click", () => {
  document.getElementById("detail").hidden = true;
});`,
      about: "The overview answers \"where?\"; the detail answers \"why?\". Hoop Driver 1 is behind, and its detail shows where the time went: 41 minutes down, 33.5 of them low air. That is the same 41 the Foundations loops add up and the Shift Handoff reports. ?? gives \"open\" only when end is null or undefined, so the open char flare reads \"13:41:15 to open\". The same listener pattern as the alarm list: one listener on the container, and closest() finds which tile was clicked, wherever inside it the click landed.",
      terms: [
        ["reduce", "reduce((sum, f) => …, 0)", "Walks the list keeping a running total, starting at 0."],
        ["??", "??", "The right side only when the left is null or undefined."],
        ["toFixed", "toFixed(2)", "A number as text with 2 decimals."],
        [null, "Level 2", "ISA-101's unit level: one machine in more detail."],
      ],
      out: `Detail hidden at load          →  true
Click the Hoop Driver 1 tile   →  Hoop Driver 1 · Level 2 | 274 of 412.5 | 66.4% | 41.00 min
                                  10:09:40 to 10:17:10 · Hoop misfeed · 7.50 min / 11:31:00 to 11:49:30 · Low air · 18.50 min / 12:22:00 to 12:37:00 · Low air · 15.00 min
Click the Char Station 2 tile  →  Char Station 2 · Level 2 | 301 of 375 | 80.3% | 18.75 min
                                  13:41:15 to open · Char flare · 18.75 min
Click Back to overview         →  hidden: true`,
    },
  ],
});
