// Project track 8: AM Checklist
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
BC.addTrack({
  id: "t-am",
  name: "AM Checklist",
  sub: "A daily Autonomous Maintenance check sheet for Hoop Driver 1: clean, inspect and lubricate checklists, readings, an abnormality tag, styled for tablet and print",
  lessons: [
    {
      lang: "html",
      file: "am-check.html",
      t: "Sheet header",
      goal: "Add a header (class sheet-head) with an h1 \"Daily AM Check: Hoop Driver 1\", a paragraph (class meta) \"Assembly · Shift A · Sat Nov 07\", and a paragraph (class note) saying the standards are illustrative except the air band.",
      code: `<header class="sheet-head">
  <h1>Daily AM Check: Hoop Driver 1</h1>
  <p class="meta">Assembly · Shift A · Sat Nov 07</p>
  <p class="note">Standards are illustrative, except the 85 to 110 psi air band.</p>
</header>`,
      about: "Autonomous Maintenance is the first pillar of TPM: operators clean, inspect and lubricate their own machine every shift, and catch small problems before they become breakdowns. This page is the daily check sheet for Hoop Driver 1. The air band is the one used in the PLC lessons; every other standard here is illustrative and would come from the machine's own AM standards.",
      terms: [
        ["sheet-head", "class=\"sheet-head\"", "A class the CSS styles later."],
        ["meta", "Context line", "Area, shift and date: what every check sheet needs."],
      ],
    },
    {
      lang: "html",
      file: "am-check.html",
      t: "Machine facts",
      goal: "Add a description list (class facts) with Machine, Area, Ideal rate (55 barrels/hr), Air band (85 to 110 psi) and Owner.",
      code: `<dl class="facts">
  <dt>Machine</dt><dd>Hoop Driver 1</dd>
  <dt>Area</dt><dd>Assembly</dd>
  <dt>Ideal rate</dt><dd>55 barrels/hr</dd>
  <dt>Air band</dt><dd>85 to 110 psi</dd>
  <dt>Owner</dt><dd>Shift A operator</dd>
</dl>`,
      about: "Pairs of label and value are a description list. These facts orient anyone picking up the sheet, including a relief operator or an auditor. Hoop Driver 1's area and ideal rate are the canonical plant's.",
      terms: [
        ["dl", "<dl>", "Term and value pairs."],
        ["dt", "<dt>", "The label."],
        ["dd", "<dd>", "The value."],
      ],
    },
    {
      lang: "html",
      file: "am-check.html",
      t: "Standards table",
      goal: "Add a table (class standards) with the caption \"Standards\", a header row Item, Standard, Method, and four rows: air header pressure, hoop feed rails, ram guide and cylinder hoses.",
      code: `<table class="standards">
  <caption>Standards</caption>
  <tr><th>Item</th><th>Standard</th><th>Method</th></tr>
  <tr><td>Air header pressure</td><td>85 to 110 psi</td><td>Gauge G-1</td></tr>
  <tr><td>Hoop feed rails</td><td>Clean, no burrs</td><td>Look, gloved touch</td></tr>
  <tr><td>Ram guide</td><td>Greased, no dry spots</td><td>Look</td></tr>
  <tr><td>Cylinder hoses</td><td>No leaks, no kinks</td><td>Listen, look</td></tr>
</table>`,
      about: "A check is only as good as its standard. \"Check the hoses\" means different things to different people; \"no leaks, no kinks, by listening and looking\" does not. Every AM item states what good looks like and how to check it. Gauge G-1 is an illustrative tag.",
      terms: [
        ["caption", "<caption>", "The table's title."],
        ["th", "<th>", "A header cell."],
      ],
    },
    {
      lang: "html",
      file: "am-check.html",
      t: "Clean checklist",
      goal: "Open a section (class cil) with the h2 \"Clean\" and a list (class checks) of three checkbox items, each a label holding an input and a span: wipe the hoop feed rails, blow chips from the ram area, clean the photo-eye lens.",
      code: `<div class="cil">
  <section>
    <h2>Clean</h2>
    <ul class="checks">
      <li><label><input type="checkbox"> <span>Wipe the hoop feed rails</span></label></li>
      <li><label><input type="checkbox"> <span>Blow chips from the ram area</span></label></li>
      <li><label><input type="checkbox"> <span>Clean the photo-eye lens</span></label></li>
    </ul>
  </section>`,
      about: "In TPM, cleaning is inspection: wiping a rail by hand is how you find the burr or the loose bolt. Each item is a checkbox inside its label, so the whole line is a big target. The text sits in a span right after the input, which lets CSS strike it through once it is checked. The div opened here holds all three CIL sections and closes after Lubricate.",
      terms: [
        ["type=\"checkbox\"", "checkbox", "A box the operator ticks."],
        ["span", "<span>", "The item text, placed right after the box for CSS."],
        ["cil", "Clean, inspect, lubricate", "The three daily AM tasks."],
      ],
    },
    {
      lang: "html",
      file: "am-check.html",
      t: "Inspect checklist",
      goal: "Add a second section with the h2 \"Inspect\" and three checkbox items: hoses, guards, and ram bolts with their paint marks lined up.",
      code: `  <section>
    <h2>Inspect</h2>
    <ul class="checks">
      <li><label><input type="checkbox"> <span>Hoses: no leaks, no kinks</span></label></li>
      <li><label><input type="checkbox"> <span>Guards closed and latched</span></label></li>
      <li><label><input type="checkbox"> <span>Ram bolts tight: paint marks line up</span></label></li>
    </ul>
  </section>`,
      about: "Visual controls make inspection fast. A paint line across a bolt and its base shows at a glance if the bolt has turned, no wrench needed. Good AM items are things an operator can check in seconds without tools.",
      terms: [
        ["section", "<section>", "One CIL task with its items."],
        ["Ram bolts tight: paint marks line up", "Match marks", "A visual control: a moved mark means a loose bolt."],
      ],
    },
    {
      lang: "html",
      file: "am-check.html",
      t: "Lubricate checklist",
      goal: "Add a third section with the h2 \"Lubricate\" and two checkbox items, then close the cil div.",
      code: `  <section>
    <h2>Lubricate</h2>
    <ul class="checks">
      <li><label><input type="checkbox"> <span>Grease the ram guide: 2 pumps, red fitting</span></label></li>
      <li><label><input type="checkbox"> <span>Oil the feed chain</span></label></li>
    </ul>
  </section>
</div>`,
      about: "A lubrication item names the point, the amount and how to find it: 2 pumps at the red fitting. Color-coded fittings and fixed amounts stop both dry bearings and over-greasing, which blows seals. The closing div ends the group of three CIL sections.",
      terms: [
        ["</div>", "</div>", "Closes the cil group opened in the Clean step."],
      ],
    },
    {
      lang: "html",
      file: "am-check.html",
      t: "Readings",
      goal: "Add a section (class readings) with the h2 \"Readings\" and two required number inputs with placeholders: air header psi (85 to 110, steps of 0.5) and hoop bundles on hand (at least 2).",
      code: `<section class="readings">
  <h2>Readings</h2>
  <label>Air header, psi
    <input type="number" min="85" max="110" step="0.5" required placeholder="85 to 110">
  </label>
  <label>Hoop bundles on hand
    <input type="number" min="2" step="1" required placeholder="2 or more">
  </label>
</section>`,
      about: "Readings turn a tick box into data. min and max put the standard into the field itself, so the browser knows 78 psi is out of range; the CSS step will make that visible. The placeholder shows the standard where the number goes. 2 bundles is an illustrative minimum.",
      terms: [
        ["min", "min / max", "The standard, built into the field."],
        ["required", "required", "The reading cannot be skipped."],
        ["placeholder", "placeholder", "Shows the standard until a value is typed."],
      ],
    },
    {
      lang: "html",
      file: "am-check.html",
      t: "Abnormality tag",
      goal: "Add an aside (class tag) with the h2 \"Abnormality tag\", a tag number, a textarea for the problem, an input for who found it, and a fieldset choosing who fixes it: operator or maintenance.",
      code: `<aside class="tag">
  <h2>Abnormality tag</h2>
  <p class="tag-no">Tag HD1-0107</p>
  <label>Problem <textarea rows="2"></textarea></label>
  <label>Found by <input type="text"></label>
  <fieldset>
    <legend>Who fixes it</legend>
    <label><input type="radio" name="fixer" value="operator"> Operator</label>
    <label><input type="radio" name="fixer" value="maintenance" checked> Maintenance</label>
  </fieldset>
</aside>`,
      about: "When a check finds a problem, the operator hangs a tag on the machine and logs it. Tags make problems visible and are counted and closed like work orders. Sites usually use two colors, one for problems the operator can fix and one for maintenance; which color means which varies, so here it is a choice on the tag. The tag number is illustrative.",
      terms: [
        ["aside", "<aside>", "Content set apart from the main flow."],
        ["type=\"radio\"", "radio", "One of two choices with the same name."],
        ["legend", "<legend>", "Names the choice."],
      ],
    },
    {
      lang: "html",
      file: "am-check.html",
      t: "Sign-off",
      goal: "Add a section (class signoff) with two sign boxes: operator and time, and shift lead.",
      code: `<section class="signoff">
  <div class="sign">Operator</div>
  <div class="sign">Time</div>
  <div class="sign">Shift lead</div>
</section>`,
      about: "A signature turns \"someone probably checked\" into \"this person checked at this time\". The lead's signature is the check on the check: if the lead never looks, the sheet slowly becomes a form people tick without doing the work. The boxes are left empty to be signed on paper.",
      terms: [
        ["signoff", "Sign-off", "Who did the check, when, and who reviewed it."],
        ["sign", "Sign box", "An empty line to sign on."],
      ],
    },
    {
      lang: "html",
      file: "am-check.html",
      t: "Footer and revision",
      goal: "Add a footer with the revision, owner and review interval.",
      code: `<footer class="rev">
  Rev 3 · Owner: Hoop Driver 1 AM team · Review every 90 days
</footer>`,
      about: "Standards change: a new hose, a better grease point, a check that keeps finding nothing. A revision number shows which version is on the clipboard, and a review interval makes sure someone looks at the sheet again. Rev 3 and 90 days are illustrative.",
      terms: [
        ["footer", "<footer>", "The closing band of the page."],
        ["Rev 3", "Revision", "Which version of the sheet this is."],
      ],
    },
    {
      lang: "css",
      file: "am-check.css",
      t: "Colors and page",
      goal: "Define the sheet's colors on :root (ink, paper, line, navy, gold, ok, bad, muted) and ask for light form controls, then give body the paper background, the ink color, a 16px system font and a max width of 900px.",
      code: `:root {
  --ink: #1b1b1b;
  --paper: #ffffff;
  --line: #c9ced6;
  --navy: #1d3557;
  --gold: #c9a227;
  --ok: #2e7d32;
  --bad: #c62828;
  --muted: #666666;
  color-scheme: light;
}
body {
  max-width: 900px;
  margin: 0 auto;
  padding: 16px;
  background: var(--paper);
  color: var(--ink);
  font: 16px/1.4 Arial, sans-serif;
}`,
      about: "A check sheet lives on a clipboard and a tablet, so it is dark text on white: easy to read in a bright plant and cheap to print. Navy and gold mark headings and accents. color-scheme: light tells the browser to draw checkboxes and inputs in their light style even when the device is in dark mode. max-width with auto side margins keeps lines readable on a wide screen. The font shorthand sets size, line height and family at once.",
      terms: [
        ["--navy", "--navy", "Heading color."],
        ["--gold", "--gold", "Accent color."],
        ["font", "font: 16px/1.4 …", "Size / line height, then family."],
        ["color-scheme", "color-scheme: light", "Light-style form controls, even in dark mode."],
      ],
    },
    {
      lang: "css",
      file: "am-check.css",
      t: "Header styling",
      goal: "Give .sheet-head a gold bottom border, the h1 a navy serif font, and .meta and .note muted text, with .note in italics.",
      code: `.sheet-head {
  border-bottom: 4px solid var(--gold);
  margin-bottom: 12px;
}
.sheet-head h1 {
  margin: 0;
  color: var(--navy);
  font-family: Cambria, Georgia, serif;
  font-size: 1.8rem;
}
.meta, .note {
  margin: 4px 0;
  color: var(--muted);
}
.note {
  font-style: italic;
  font-size: 0.85rem;
}`,
      about: "A serif title and a gold rule make the sheet's identity, and repeating them across every AM sheet in the plant makes them recognizable at a distance. A comma between selectors applies one rule to both. The note about illustrative standards stays small but visible.",
      terms: [
        ["border-bottom", "border-bottom", "A rule under the header."],
        ["Cambria", "Cambria, Georgia, serif", "Serif fonts, in order of preference."],
        [".meta, .note", "Selector list", "One rule for both classes."],
      ],
    },
    {
      lang: "css",
      file: "am-check.css",
      t: "Facts grid",
      goal: "Lay out .facts as a two-column grid of label and value pairs, with labels bold and navy and no default margins.",
      code: `.facts {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 4px 16px;
  margin: 0 0 16px;
}
.facts dt {
  font-weight: bold;
  color: var(--navy);
}
.facts dd {
  margin: 0;
}`,
      about: "Each dt and dd fills one grid cell in turn, so pairs line up in rows. max-content makes the label column exactly as wide as the longest label, and 1fr gives the values the rest. gap takes a row gap, then a column gap.",
      terms: [
        ["max-content", "max-content", "As wide as the widest content."],
        ["gap", "gap: 4px 16px", "Row gap, then column gap."],
      ],
    },
    {
      lang: "css",
      file: "am-check.css",
      t: "Table styling",
      goal: "Give .standards full width and collapsed borders, a left-aligned bold navy caption, navy header cells with white text, cell borders and padding, and shading on every other row.",
      code: `.standards {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
}
.standards caption {
  text-align: left;
  font-weight: bold;
  color: var(--navy);
  padding-bottom: 4px;
}
.standards th {
  background: var(--navy);
  color: white;
  text-align: left;
}
.standards th, .standards td {
  padding: 6px 8px;
  border: 1px solid var(--line);
}
.standards tr:nth-child(odd) td {
  background: #f3f5f8;
}`,
      about: "Stripes help the eye follow a row across. The header row is the first child, so odd rows after it are shaded starting from the second data row; the th cells keep their navy because the stripe rule only targets td. border-collapse joins the cell borders into single lines.",
      terms: [
        ["border-collapse", "border-collapse", "Neighboring cells share one border."],
        ["nth-child", "nth-child(odd)", "Every other row."],
      ],
    },
    {
      lang: "css",
      file: "am-check.css",
      t: "CIL sections",
      goal: "Lay out .cil as a grid of columns at least 220px wide, and give each section a border, padding, rounded corners and a navy h2 with a gold underline. Give the Readings h2 the same look.",
      code: `.cil {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.cil section {
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 10px 12px;
}
.cil h2, .readings h2 {
  margin: 0 0 8px;
  font-size: 1.1rem;
  color: var(--navy);
  border-bottom: 2px solid var(--gold);
}`,
      about: "Clean, Inspect and Lubricate sit side by side on a tablet and stack on a phone, with no media query: auto-fit fits as many 220px columns as there is room for. One box per task keeps the sheet scannable.",
      terms: [
        ["auto-fit", "repeat(auto-fit, minmax(220px, 1fr))", "As many columns as fit, each at least 220px."],
      ],
    },
    {
      lang: "css",
      file: "am-check.css",
      t: "Check items",
      goal: "Remove the bullets from .checks, lay each label out as a flex row with a gap, and make the checkboxes 22px with the ok color as their accent.",
      code: `.checks {
  list-style: none;
  margin: 0;
  padding: 0;
}
.checks li {
  margin: 6px 0;
}
.checks label {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  cursor: pointer;
}
.checks input {
  width: 22px;
  height: 22px;
  margin: 0;
  flex: none;
  accent-color: var(--ok);
}`,
      about: "A 22px box is easy to hit on a tablet with gloves on. accent-color colors the browser's own checkbox without rebuilding it. flex: none stops a long item's text from squeezing the box smaller.",
      terms: [
        ["accent-color", "accent-color", "Colors native checkboxes and radios."],
        ["flex: none", "flex: none", "Keeps the box at its size."],
      ],
    },
    {
      lang: "css",
      file: "am-check.css",
      t: "Checked items",
      goal: "When a checkbox is checked, strike through the span right after it and grey it out.",
      code: `.checks input:checked + span {
  text-decoration: line-through;
  color: var(--muted);
}`,
      about: "No script needed: :checked matches a ticked box and + picks the element right after it, the span, which is why the HTML put the text there. Tick a box in the preview and the item crosses itself off, so what is left to do stands out.",
      terms: [
        [":checked", ":checked", "A ticked checkbox or chosen radio."],
        ["+", "+ (next sibling)", "The element right after."],
        ["line-through", "line-through", "Strikes the text through."],
      ],
    },
    {
      lang: "css",
      file: "am-check.css",
      t: "Out-of-range readings",
      goal: "Stack the reading labels, then give an input a red border and pink background when it is invalid and has a value, and a green border when valid.",
      code: `.readings label {
  display: flex;
  flex-direction: column;
  max-width: 260px;
  margin-bottom: 8px;
}
.readings input {
  padding: 6px;
  font-size: 1rem;
  border: 2px solid var(--line);
}
.readings input:valid {
  border-color: var(--ok);
}
.readings input:invalid:not(:placeholder-shown) {
  border-color: var(--bad);
  background: #fdecea;
}`,
      about: ":invalid matches a value outside min and max, so typing 78 psi turns the field red with no script. An empty required field is also invalid, which would paint the sheet red before anyone starts; :not(:placeholder-shown) waits until something has been typed. Try 78, then 92, in the preview.",
      terms: [
        [":invalid", ":invalid", "The value breaks the field's rules."],
        [":placeholder-shown", ":placeholder-shown", "Still empty, showing its placeholder."],
        [":valid", ":valid", "The value meets the rules."],
      ],
    },
    {
      lang: "css",
      file: "am-check.css",
      t: "Tag styling",
      goal: "Style .tag like a hanging tag: red with white text, a dashed white inner border, a slight tilt, a punched hole made with ::before, and its text fields stacked full width.",
      code: `.tag {
  position: relative;
  max-width: 340px;
  margin: 16px 0;
  padding: 24px 16px 12px;
  background: var(--bad);
  color: white;
  outline: 2px dashed white;
  outline-offset: -8px;
  transform: rotate(-1deg);
}
.tag::before {
  content: "";
  position: absolute;
  top: 8px;
  left: 50%;
  width: 12px;
  height: 12px;
  margin-left: -6px;
  border-radius: 50%;
  background: var(--paper);
}
.tag h2 {
  margin: 0;
}
.tag label {
  display: block;
  margin: 8px 0;
}
.tag textarea, .tag input[type="text"] {
  display: block;
  width: 100%;
  box-sizing: border-box;
}
.tag fieldset {
  border-color: white;
}`,
      about: "Making the digital tag look like the physical one means operators recognize it at once. outline-offset with a negative value draws the dashed line inside the edge. The hole is a ::before circle the color of the paper, centered with left: 50% and a negative half-width margin. rotate(-1deg) is just enough to look hung.",
      terms: [
        ["outline-offset", "outline-offset: -8px", "Draws the outline inside the edge."],
        ["transform", "rotate(-1deg)", "Tilts the tag slightly."],
        ["::before", "::before", "Draws the punched hole."],
      ],
    },
    {
      lang: "css",
      file: "am-check.css",
      t: "Sign-off boxes",
      goal: "Lay out .signoff as a flex row of boxes that wrap, each with a bottom border to sign on and its label in small muted capitals. Give the footer muted small text.",
      code: `.signoff {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin: 16px 0;
}
.sign {
  flex: 1 1 160px;
  padding-top: 32px;
  border-bottom: 1px solid var(--ink);
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--muted);
}
.rev {
  font-size: 0.8rem;
  color: var(--muted);
  border-top: 1px solid var(--line);
  padding-top: 6px;
}`,
      about: "flex: 1 1 160px lets each box grow and shrink but wrap below 160px, so sign lines fit a phone and a printed page. padding-top leaves room to write above the line. Uppercase small labels read as form labels, not content.",
      terms: [
        ["flex: 1 1 160px", "flex: grow shrink basis", "Grows and shrinks from a 160px start."],
        ["text-transform", "text-transform: uppercase", "Shows the text in capitals."],
      ],
    },
    {
      lang: "css",
      file: "am-check.css",
      t: "Phone layout",
      goal: "Under 600px wide, stack the facts into one column and shrink the table text.",
      code: `@media (max-width: 600px) {
  .facts {
    grid-template-columns: 1fr;
  }
  .facts dd {
    margin-bottom: 6px;
  }
  .standards {
    font-size: 0.85rem;
  }
}`,
      about: "On a phone two columns of facts get cramped, so labels go above their values. The CIL sections already stack by themselves. Media queries follow the browser window, not the preview box, so narrow the whole window to see this.",
      terms: [
        ["@media", "@media (max-width: 600px)", "Rules for narrow windows."],
      ],
    },
    {
      lang: "css",
      file: "am-check.css",
      t: "Print stylesheet",
      goal: "For print: set page margins, drop the max width and use black on white, keep each CIL section and the tag on one page, turn the tag into a black outlined box, and hide the placeholders.",
      code: `@media print {
  @page {
    margin: 12mm;
  }
  body {
    max-width: none;
    color: black;
  }
  .cil section, .tag {
    break-inside: avoid;
  }
  .tag {
    background: none;
    color: black;
    outline: 2px dashed black;
    transform: none;
  }
  ::placeholder {
    color: transparent;
  }
}`,
      about: "Many plants still run AM on paper. @media print rules apply only when printing, so the screen version is untouched. break-inside: avoid stops a section splitting across pages. A solid red tag wastes toner and prints muddy in black and white, so it becomes an outline. Use the browser's print preview to see this; the preview here shows the screen version.",
      terms: [
        ["@media print", "@media print", "Rules used only when printing."],
        ["@page", "@page", "Sets the printed page's margins."],
        ["break-inside", "break-inside: avoid", "Keeps the block on one page."],
      ],
    },
  ],
});
