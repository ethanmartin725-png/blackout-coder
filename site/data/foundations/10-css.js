// Foundations lane: CSS
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
// Each lesson carries the markup it styles in `html`; the learner types only the CSS.
BC.addLane({
  id: "css",
  name: "CSS",
  lang: "css",
  lessons: [
    {
      t: "Selectors",
      goal: "Make every h2 navy, everything with class note grey and italic, and the element with id alarm red and bold.",
      html: `<h2>Shift A</h2>
<p class="note">Updated at 14:05.</p>
<p id="alarm">Char Station 2 is down.</p>
<p class="note">Next update at 15:00.</p>`,
      code: `h2 {
  color: #1d3557;
}
.note {
  color: #666;
  font-style: italic;
}
#alarm {
  color: #c62828;
  font-weight: bold;
}`,
      about: "A selector picks elements and the declarations in braces style them. A bare name like h2 picks every h2; a dot picks a class, which many elements can share; a # picks the one element with that id. Use classes for styling and keep ids for things a script or a link must find exactly.",
      terms: [
        ["h2", "Element selector", "Every h2 on the page."],
        [".note", ".class", "Every element with class=\"note\"."],
        ["#alarm", "#id", "The one element with id=\"alarm\"."],
      ],
    },
    {
      t: "Colors and variables",
      goal: "Define --ok, --warn and --bad on :root, then color .ok, .warn and .bad text with them.",
      html: `<p class="ok">Conveyor 3: OK</p>
<p class="warn">Hoop Driver 1: BEHIND</p>
<p class="bad">Char Station 2: DOWN</p>`,
      code: `:root {
  --ok: #2e7d32;
  --warn: #b26a00;
  --bad: #c62828;
}
.ok { color: var(--ok); }
.warn { color: var(--warn); }
.bad { color: var(--bad); }`,
      about: "A custom property, a name starting with --, holds a value that var() reads anywhere below it. Defining the status colors once on :root means a site-wide color change is one edit, and every page agrees on what \"bad\" looks like. Colors are written as hex: two digits each for red, green and blue.",
      terms: [
        [":root", ":root", "The top of the page; variables here apply everywhere."],
        ["--ok", "--name", "A custom property."],
        ["var", "var(--ok)", "Reads a custom property."],
      ],
    },
    {
      t: "The box model",
      goal: "Give .card 16px padding, a 2px solid border, an 8px bottom margin and a light background.",
      html: `<div class="card">Conveyor 3: 352 barrels</div>
<div class="card">Hoop Driver 1: 274 barrels</div>`,
      code: `.card {
  padding: 16px;
  border: 2px solid #1d3557;
  margin-bottom: 8px;
  background: #eef2f7;
}`,
      about: "Every element is a box: content, then padding inside the border, then the border, then margin outside it. Padding takes the background color; margin stays transparent and pushes neighbors away. Most layout problems are one of these four being bigger or smaller than expected; the browser's developer tools show all four.",
      terms: [
        ["padding", "padding", "Space inside the border."],
        ["border", "border", "Width, style and color of the edge."],
        ["margin-bottom", "margin", "Space outside the border."],
      ],
    },
    {
      t: "Border-box sizing",
      goal: "Give both boxes width 240px, 20px padding and a 4px border. Make only .sized use box-sizing: border-box, so it is exactly 240px wide.",
      html: `<div class="box">content-box: wider than 240px</div>
<div class="box sized">border-box: exactly 240px</div>`,
      code: `.box {
  width: 240px;
  padding: 20px;
  border: 4px solid #1d3557;
  margin-bottom: 8px;
}
.sized {
  box-sizing: border-box;
}`,
      about: "By default width sets only the content, so padding and border are added on top: 240 + 40 + 8 = 288px. border-box makes width include them, so the box is the size you wrote. Most stylesheets set *, *::before, *::after { box-sizing: border-box; } once at the top for that reason.",
      terms: [
        ["box-sizing", "box-sizing: border-box", "Width includes padding and border."],
        ["width", "width", "The box's width."],
      ],
    },
    {
      t: "Type and rem",
      goal: "Set the page font, then make h1 2rem, p 1rem with line-height 1.5, and .small 0.8rem in grey.",
      html: `<h1>Shift A Report</h1>
<p>Conveyor 3 made 352 barrels, 78.2% of its 450 target. Hoop Driver 1 is behind at 66.4%.</p>
<p class="small">Rates are illustrative.</p>`,
      code: `body {
  font-family: Arial, sans-serif;
}
h1 {
  font-size: 2rem;
}
p {
  font-size: 1rem;
  line-height: 1.5;
}
.small {
  font-size: 0.8rem;
  color: #666;
}`,
      about: "rem is a multiple of the root font size, usually 16px, so 2rem is 32px. If a user sets a larger default size for readability, everything in rem grows with it; px does not. line-height 1.5 gives each line 1.5 times its font size, which makes paragraphs much easier to read. A fallback list ends with a generic family.",
      terms: [
        ["2rem", "rem", "A multiple of the root font size."],
        ["line-height", "line-height", "Height of each line, as a multiple of the font size."],
        ["font-family", "font-family", "Fonts to try, in order."],
      ],
    },
    {
      t: "Units",
      goal: "Make .half 50% wide, .fixed 200px wide, .screen 30vw wide and .text 20ch wide, each with a background so you can compare.",
      html: `<div class="bar half">50%</div>
<div class="bar fixed">200px</div>
<div class="bar screen">30vw</div>
<div class="bar text">20ch</div>`,
      code: `.bar {
  background: #e3a72f;
  margin: 4px 0;
  padding: 4px;
}
.half { width: 50%; }
.fixed { width: 200px; }
.screen { width: 30vw; }
.text { width: 20ch; }`,
      about: "% is relative to the parent, px is fixed, vw is a percentage of the window's width, and ch is the width of a zero in the current font. Resize the window: 50% and 30vw change, 200px does not. ch is handy for text columns, since readable lines run about 60 to 75 characters.",
      terms: [
        ["%", "%", "Relative to the parent element."],
        ["30vw", "vw", "1vw is 1% of the window width."],
        ["20ch", "ch", "The width of the character 0."],
      ],
    },
    {
      t: "Display",
      goal: "Show the spans as inline-blocks with padding, the divs as inline elements, and hide .hidden.",
      html: `<span class="tag">Jam</span>
<span class="tag">Low air</span>
<div class="inline">Conveyor 3</div>
<div class="inline">Hoop Driver 1</div>
<p class="hidden">You should not see this.</p>`,
      code: `.tag {
  display: inline-block;
  padding: 2px 8px;
  background: #1d3557;
  color: white;
  border-radius: 4px;
}
.inline {
  display: inline;
}
.hidden {
  display: none;
}`,
      about: "Block elements, like div and p, start on a new line and fill the width. Inline elements, like span, flow inside text and ignore width and vertical margins. inline-block flows like text but takes padding and size like a box, which is how tags and badges are made. display: none removes an element completely.",
      terms: [
        ["inline-block", "inline-block", "In the line of text, but sized like a box."],
        ["inline", "inline", "Flows with text; no width."],
        ["none", "display: none", "Not shown and takes no space."],
      ],
    },
    {
      t: "Flexbox row",
      goal: "Make .tiles a flex row with a 12px gap, and give each .tile padding, a border and a flex value of 1 so they share the width.",
      html: `<div class="tiles">
  <div class="tile"><b>Char Station 2</b><span>86.0%</span></div>
  <div class="tile"><b>Conveyor 3</b><span>73.8%</span></div>
  <div class="tile"><b>Hoop Driver 1</b><span>72.9%</span></div>
</div>`,
      code: `.tiles {
  display: flex;
  gap: 12px;
}
.tile {
  flex: 1;
  padding: 12px;
  border: 2px solid #1d3557;
  border-radius: 6px;
}
.tile span {
  display: block;
  font-size: 1.6rem;
}`,
      about: "display: flex lines up the children in a row. gap puts space between them, never at the edges. flex: 1 tells each tile to take an equal share of the space left over, so three tiles split the row evenly. The values are the canonical weekly OEE for each machine.",
      terms: [
        ["display: flex", "display: flex", "Lays the children out in a row."],
        ["gap", "gap", "Space between the children."],
        ["flex: 1", "flex: 1", "Take an equal share of spare space."],
      ],
    },
    {
      t: "Flex alignment",
      goal: "Make .bar a flex row that pushes the title left and the clock right, with both centered vertically.",
      html: `<div class="bar">
  <h1>Cooperage Line</h1>
  <span class="clock">14:05</span>
</div>`,
      code: `.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #1d3557;
  color: white;
}
.bar h1 {
  margin: 0;
  font-size: 1.4rem;
}`,
      about: "justify-content spreads items along the row: space-between puts the first at the start and the last at the end. align-items lines them up across it: center keeps a big title and a small clock on one middle line. Those two properties build most header bars. 14:05 is the handoff run time.",
      terms: [
        ["justify-content", "justify-content", "Spacing along the row."],
        ["space-between", "space-between", "First at the start, last at the end."],
        ["align-items", "align-items: center", "Centers the items vertically."],
      ],
    },
    {
      t: "Flex wrap",
      goal: "Make .tags a wrapping flex row with an 8px gap, so the fault tags flow onto new lines when space runs out.",
      html: `<div class="tags">
  <span>Low air 87.4</span><span>Char flare 70.0</span><span>Hoop misfeed 66.6</span>
  <span>Jam 65.7</span><span>E-stop 10.8</span>
</div>`,
      code: `.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-width: 320px;
}
.tags span {
  padding: 4px 10px;
  background: #fde7b0;
  border-radius: 12px;
}`,
      about: "By default flex squeezes everything onto one line. flex-wrap: wrap lets items move to the next line instead, and gap spaces the lines too. max-width keeps the box narrow here so the wrapping shows. The tags are the Pareto minutes.",
      terms: [
        ["flex-wrap", "flex-wrap: wrap", "Items move to a new line when they do not fit."],
        ["max-width", "max-width", "The box never gets wider than this."],
      ],
    },
    {
      t: "Grid columns",
      goal: "Make .board a grid with two columns, the first twice as wide as the second, a 12px gap, and give each child padding and a background.",
      html: `<div class="board">
  <div>Tiles</div>
  <div>Clock</div>
  <div>Pareto</div>
  <div>Notes</div>
</div>`,
      code: `.board {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 12px;
}
.board > div {
  padding: 16px;
  background: #eef2f7;
}`,
      about: "Grid places children in rows and columns. fr is a fraction of the free space, so 2fr 1fr gives two thirds and one third. Children fill the cells in order, wrapping to a new row after the last column. > picks only direct children, so a div nested deeper is not affected.",
      terms: [
        ["display: grid", "display: grid", "Lays out children in a grid."],
        ["2fr 1fr", "fr", "A share of the free space."],
        [">", "> (child)", "Only direct children."],
      ],
    },
    {
      t: "Named grid areas",
      goal: "Lay out .page with grid-template-areas: a header across the top, tiles and notes side by side, then pareto under tiles. Assign each child its area.",
      html: `<div class="page">
  <header>Header</header>
  <section class="tiles">Tiles</section>
  <aside>Notes</aside>
  <section class="pareto">Pareto</section>
</div>`,
      code: `.page {
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-template-areas:
    "head head"
    "tiles side"
    "pareto side";
  gap: 8px;
}
header { grid-area: head; }
.tiles { grid-area: tiles; }
aside { grid-area: side; }
.pareto { grid-area: pareto; }
.page > * {
  padding: 12px;
  background: #eef2f7;
}`,
      about: "grid-template-areas draws the layout as a picture in text: each quoted string is a row and each word a cell. A name repeated across cells makes one area span them, so head covers the top row and side covers two rows. Moving a block is then a matter of editing the picture, not the markup.",
      terms: [
        ["grid-template-areas", "grid-template-areas", "The layout drawn as rows of names."],
        ["grid-area", "grid-area", "Puts an element in a named area."],
        ["*", "* (universal)", "Every element."],
      ],
    },
    {
      t: "Auto-fit tiles",
      goal: "Make .tiles a grid that fits as many 160px-or-wider columns as the width allows.",
      html: `<div class="tiles">
  <div class="tile"><b>Char Station 2</b><span>86.0%</span></div>
  <div class="tile"><b>Conveyor 3</b><span>73.8%</span></div>
  <div class="tile"><b>Hoop Driver 1</b><span>72.9%</span></div>
</div>`,
      code: `.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}
.tile {
  padding: 12px;
  border: 2px solid #1d3557;
  border-radius: 6px;
}
.tile span {
  display: block;
  font-size: 1.6rem;
}`,
      about: "repeat(auto-fit, minmax(160px, 1fr)) means: as many columns as fit, each at least 160px and sharing any extra. Three tiles sit in a row on a desktop and stack on a phone, with no media query. The Plant Board track uses exactly this for its tiles.",
      terms: [
        ["auto-fit", "auto-fit", "As many columns as fit."],
        ["minmax", "minmax(160px, 1fr)", "At least 160px, at most a share of the space."],
        ["repeat", "repeat", "Repeats a column pattern."],
      ],
    },
    {
      t: "Media queries",
      goal: "Show .tiles as three columns, then switch to one column when the window is 600px wide or less.",
      html: `<div class="tiles">
  <div class="tile"><b>Char Station 2</b><span>86.0%</span></div>
  <div class="tile"><b>Conveyor 3</b><span>73.8%</span></div>
  <div class="tile"><b>Hoop Driver 1</b><span>72.9%</span></div>
</div>`,
      code: `.tiles {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}
.tile {
  padding: 12px;
  border: 2px solid #1d3557;
}
@media (max-width: 600px) {
  .tiles {
    grid-template-columns: 1fr;
  }
}`,
      about: "A media query applies its rules only when its condition is true, here a window 600px wide or narrower. Rules inside it override the same rules above. Media queries follow the browser window, not this preview box, so narrow the whole window to see the switch, as the Plant Board track notes.",
      terms: [
        ["@media", "@media", "Rules that apply only when the condition is true."],
        ["max-width", "max-width: 600px", "600px wide or narrower."],
      ],
    },
    {
      t: "Relative and absolute position",
      goal: "Make .tile position: relative and pin .badge to its top-right corner with position: absolute.",
      html: `<div class="tile">
  <b>Char Station 2</b>
  <span class="badge">DOWN</span>
  <p>Char flare open since 13:41</p>
</div>`,
      code: `.tile {
  position: relative;
  max-width: 280px;
  padding: 16px;
  border: 2px solid #1d3557;
}
.badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  background: #c62828;
  color: white;
  font-size: 0.75rem;
}`,
      about: "An absolutely positioned element leaves the normal flow and is placed by top, right, bottom and left, measured from its nearest positioned ancestor. position: relative on the tile makes the tile that ancestor; without it the badge would fly to the corner of the page. This pairing is how badges and corner labels are made.",
      terms: [
        ["relative", "position: relative", "Makes this the reference box for absolute children."],
        ["absolute", "position: absolute", "Placed by top/right/bottom/left; out of the flow."],
        ["top", "top / right", "Distance from the reference box's edges."],
      ],
    },
    {
      t: "Sticky header",
      goal: "Make the table's header cells stick to the top of .scroll, a 160px-tall scrolling box.",
      html: `<div class="scroll">
<table>
  <tr><th>Machine</th><th>Fault</th><th>Min</th></tr>
  <tr><td>Conveyor 3</td><td>Jam</td><td>4.62</td></tr>
  <tr><td>Hoop Driver 1</td><td>Hoop misfeed</td><td>7.50</td></tr>
  <tr><td>Hoop Driver 1</td><td>Low air</td><td>18.50</td></tr>
  <tr><td>Hoop Driver 1</td><td>Low air</td><td>15.00</td></tr>
  <tr><td>Char Station 2</td><td>Char flare</td><td>18.75</td></tr>
</table>
</div>`,
      code: `.scroll {
  height: 160px;
  overflow-y: auto;
  border: 1px solid #999;
}
.scroll th {
  position: sticky;
  top: 0;
  background: #1d3557;
  color: white;
}`,
      about: "sticky behaves normally until scrolling would move it past top: 0, then it stays put. Scroll the box: the header row stays visible over the fault list. A sticky element needs a background, or the rows show through it. These are shift A's five faults.",
      terms: [
        ["sticky", "position: sticky", "Scrolls normally, then sticks at top."],
        ["overflow-y", "overflow-y: auto", "A scroll bar appears when content is too tall."],
      ],
    },
    {
      t: "Borders and radius",
      goal: "Give .ok a solid green left border, .warn a dashed amber border, .bad a thick red border with rounded corners, and .pill fully rounded ends.",
      html: `<p class="ok">Conveyor 3: OK</p>
<p class="warn">Hoop Driver 1: BEHIND</p>
<p class="bad">Char Station 2: DOWN</p>
<span class="pill">Shift A</span>`,
      code: `p {
  padding: 8px;
}
.ok { border-left: 6px solid #2e7d32; }
.warn { border: 2px dashed #b26a00; }
.bad {
  border: 4px solid #c62828;
  border-radius: 8px;
}
.pill {
  padding: 4px 14px;
  background: #1d3557;
  color: white;
  border-radius: 999px;
}`,
      about: "A border takes a width, a style and a color, on all sides or one side at a time. A thick left border is a quiet way to mark status. border-radius rounds the corners; a value bigger than the box height, like 999px, gives fully round ends.",
      terms: [
        ["border-left", "border-left", "Only the left edge."],
        ["dashed", "dashed", "A dashed line. Also solid, dotted, double."],
        ["border-radius", "border-radius", "Rounds the corners."],
      ],
    },
    {
      t: "Shadows",
      goal: "Give .card a soft drop shadow and .card:hover a bigger one, and add a text shadow to the h2.",
      html: `<h2>Weekly OEE</h2>
<div class="card">Char Station 2: 86.0%</div>
<div class="card">Conveyor 3: 73.8%</div>`,
      code: `h2 {
  text-shadow: 1px 1px 2px #aaa;
}
.card {
  max-width: 260px;
  margin: 12px 0;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}
.card:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
}`,
      about: "box-shadow takes a horizontal offset, a vertical offset, a blur and a color. rgba adds transparency, so the shadow darkens what is behind it instead of painting grey. A deeper shadow on hover makes a card feel clickable. Keep shadows soft; heavy ones look dated and blur at a distance.",
      terms: [
        ["box-shadow", "box-shadow", "x offset, y offset, blur, color."],
        ["rgba", "rgba( … , 0.2)", "A color with 20% opacity."],
        ["text-shadow", "text-shadow", "A shadow behind text."],
      ],
    },
    {
      t: "Hover and focus",
      goal: "Style the buttons: a darker background on :hover, a thick amber outline on :focus-visible, and a grey look on :disabled.",
      html: `<button>Save</button>
<button>Reset jam</button>
<button disabled>Post to MES</button>`,
      code: `button {
  padding: 8px 16px;
  background: #1d3557;
  color: white;
  border: 0;
  border-radius: 4px;
}
button:hover {
  background: #0b1f3a;
}
button:focus-visible {
  outline: 3px solid #e3a72f;
  outline-offset: 2px;
}
button:disabled {
  background: #999;
}`,
      about: "A pseudo-class styles a state. :hover is the mouse over it; :focus-visible is keyboard focus, shown when someone tabs to the button, so keyboard users can see where they are; :disabled is a switched-off button. Never remove the focus outline without replacing it. Press Tab in the preview to see it.",
      terms: [
        [":hover", ":hover", "While the pointer is over it."],
        [":focus-visible", ":focus-visible", "Keyboard focus, shown when it helps."],
        [":disabled", ":disabled", "While the element is disabled."],
      ],
    },
    {
      t: "Zebra stripes",
      goal: "Collapse the table's borders, shade every even row, and right-align the last column.",
      html: `<table class="faults">
  <tr><th>Machine</th><th>Fault</th><th>Min</th></tr>
  <tr><td>Conveyor 3</td><td>Jam</td><td>4.62</td></tr>
  <tr><td>Hoop Driver 1</td><td>Hoop misfeed</td><td>7.50</td></tr>
  <tr><td>Hoop Driver 1</td><td>Low air</td><td>18.50</td></tr>
  <tr><td>Hoop Driver 1</td><td>Low air</td><td>15.00</td></tr>
  <tr><td>Char Station 2</td><td>Char flare</td><td>18.75</td></tr>
</table>`,
      code: `.faults {
  border-collapse: collapse;
}
.faults tr:nth-child(even) {
  background: #eef2f7;
}
.faults td:last-child {
  text-align: right;
}`,
      about: "nth-child(even) picks the 2nd, 4th and 6th rows; the header row counts as the 1st. Stripes help the eye follow a row across a wide table. :last-child picks the minutes column without adding a class to every cell. The rows are shift A's faults.",
      terms: [
        ["nth-child", "nth-child(even)", "Every second child, starting with the 2nd."],
        ["last-child", ":last-child", "The last child of its parent."],
        ["border-collapse", "border-collapse", "Neighboring cells share one border."],
      ],
    },
    {
      t: "Attribute selectors",
      goal: "Color each machine by its data-status: DOWN red, BEHIND amber, OK green, with a left border in the same color.",
      html: `<ul class="machines">
  <li data-status="DOWN">Char Station 2</li>
  <li data-status="OK">Conveyor 3</li>
  <li data-status="BEHIND">Hoop Driver 1</li>
</ul>`,
      code: `.machines li {
  list-style: none;
  margin: 4px 0;
  padding: 6px 10px;
  border-left: 6px solid;
}
[data-status="DOWN"] { color: #c62828; }
[data-status="BEHIND"] { color: #b26a00; }
[data-status="OK"] { color: #2e7d32; }`,
      about: "[data-status=\"DOWN\"] picks elements by an attribute's value, so a script that sets data-status changes the color with no class juggling. border-left with no color uses the text color, so one rule draws every status bar. The statuses are shift A's from the Shift Handoff track.",
      terms: [
        ["[data-status=\"DOWN\"]", "[attr=\"value\"]", "Elements whose attribute has that value."],
        ["list-style", "list-style: none", "Removes the bullets."],
      ],
    },
    {
      t: "Status dots with ::before",
      goal: "Put a colored dot before each machine with ::before, colored by data-status.",
      html: `<ul class="machines">
  <li data-status="DOWN">Char Station 2</li>
  <li data-status="OK">Conveyor 3</li>
  <li data-status="BEHIND">Hoop Driver 1</li>
</ul>`,
      code: `.machines li {
  list-style: none;
  margin: 4px 0;
}
.machines li::before {
  content: "";
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 8px;
  border-radius: 50%;
  background: #2e7d32;
}
[data-status="DOWN"]::before { background: #c62828; }
[data-status="BEHIND"]::before { background: #b26a00; }`,
      about: "::before adds a box at the start of an element's content that is not in the HTML. It only appears if content is set, even to an empty string. Sized and rounded to 50%, it becomes a status dot. Decoration belongs here, so the markup stays plain data.",
      terms: [
        ["::before", "::before", "A generated box before the content."],
        ["content", "content: \"\"", "Required for ::before to appear."],
        ["50%", "border-radius: 50%", "Makes a square into a circle."],
      ],
    },
    {
      t: "Specificity",
      goal: "Write three rules for the same paragraph, by element, class and id, then see which color wins. Add a later class rule to see order break a tie.",
      html: `<p class="status" id="char2">Char Station 2: DOWN</p>`,
      code: `#char2 {
  color: #c62828;
}
.status {
  color: #2e7d32;
}
p {
  color: #1d3557;
}
.status {
  font-weight: bold;
}`,
      about: "When rules disagree, the more specific selector wins: an id beats a class, and a class beats an element name, whatever their order. So the text is red. Order only decides between equally specific rules, which is why both .status rules apply. Leaning on ids makes styles hard to override later; classes keep the fights fair.",
      terms: [
        ["#char2", "id: most specific", "Beats any number of classes."],
        [".status", "class", "Beats element names."],
        ["p", "element: least specific", "Loses to classes and ids."],
      ],
    },
    {
      t: "Transitions",
      goal: "Make the .bar widths animate over 0.6 s when the box is hovered, growing from 20% to their full value.",
      html: `<div class="chart">
  <div class="bar" style="--w: 100%">Low air 87.4</div>
  <div class="bar" style="--w: 80%">Char flare 70.0</div>
  <div class="bar" style="--w: 76%">Hoop misfeed 66.6</div>
</div>`,
      code: `.bar {
  width: 20%;
  margin: 4px 0;
  padding: 4px;
  white-space: nowrap;
  background: #e3a72f;
  transition: width 0.6s ease-out;
}
.chart:hover .bar {
  width: var(--w);
}`,
      about: "transition animates a property whenever its value changes, here width when the chart is hovered. Each bar's full width comes from a --w variable set in its style attribute: its minutes over Low air's 87.4. ease-out starts fast and slows down, which feels natural. Hover the chart to see it.",
      terms: [
        ["transition", "transition", "Animates a property's change."],
        ["ease-out", "ease-out", "Fast at first, slow at the end."],
        ["var(--w)", "var(--w)", "Each bar's own width, from its style attribute."],
      ],
    },
    {
      t: "Alarm animation",
      goal: "Make .alarm blink between red and dark red every second with @keyframes, and switch the animation off for users who prefer reduced motion.",
      html: `<p class="alarm">Char Station 2: CHAR FLARE</p>`,
      code: `.alarm {
  display: inline-block;
  padding: 8px 16px;
  color: white;
  font-weight: bold;
  animation: blink 1s steps(2) infinite;
}
@keyframes blink {
  from { background: #c62828; }
  to { background: #5c1010; }
}
@media (prefers-reduced-motion: reduce) {
  .alarm {
    animation: none;
    background: #c62828;
  }
}`,
      about: "@keyframes names an animation and animation runs it: 1 second per cycle, forever. steps(2) jumps between the two colors instead of fading, like a beacon. Some people get headaches or worse from flashing; prefers-reduced-motion is their system setting, and honoring it costs three lines. WCAG also says nothing on a page should flash more than three times a second; this one changes once a second.",
      terms: [
        ["@keyframes", "@keyframes", "Defines an animation's stages."],
        ["animation", "animation", "Runs a keyframes animation."],
        ["prefers-reduced-motion", "prefers-reduced-motion", "The user asked for less motion."],
      ],
    },
    {
      t: "Overflow and ellipsis",
      goal: "Keep each note on one line inside a 260px box, cutting long ones off with an ellipsis.",
      html: `<ul class="notes">
  <li>Burner B igniter sparking weak on Char Station 2.</li>
  <li>Low air twice on Hoop Driver 1. Compressor tech called.</li>
  <li>OK.</li>
</ul>`,
      code: `.notes {
  width: 260px;
  padding-left: 18px;
}
.notes li {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}`,
      about: "All three properties are needed: nowrap keeps the text on one line, overflow: hidden clips what does not fit, and text-overflow: ellipsis shows … where it was cut. Good for list views on a board; put the full text somewhere it can be read, such as a tooltip or a detail view, since a cut note can hide the important half.",
      terms: [
        ["white-space", "white-space: nowrap", "No line breaks."],
        ["overflow", "overflow: hidden", "Clips anything outside the box."],
        ["text-overflow", "text-overflow: ellipsis", "Shows … where text is cut."],
      ],
    },
    {
      t: "Fluid sizes",
      goal: "Make the h1 font size grow with the window but stay between 1.5rem and 3rem with clamp, and size .panel with calc and min.",
      html: `<h1>Cooperage Line Board</h1>
<div class="panel">Panel: the window width minus 48px, but never more than 600px.</div>`,
      code: `h1 {
  font-size: clamp(1.5rem, 4vw, 3rem);
}
.panel {
  width: min(600px, calc(100vw - 48px));
  padding: 12px;
  background: #eef2f7;
}`,
      about: "clamp(min, preferred, max) picks the preferred value but keeps it in range, so the title scales with the window yet never gets tiny on a phone or huge on a TV. calc mixes units, here the window width minus a fixed margin. min takes the smaller of its values. Together they replace several media queries.",
      terms: [
        ["clamp", "clamp(min, preferred, max)", "The preferred value, kept within limits."],
        ["calc", "calc", "Arithmetic with mixed units."],
        ["min", "min( … )", "The smallest of the values."],
      ],
    },
    {
      t: "Not by color alone",
      goal: "Style the statuses so each has a color and a different symbol and shape: DOWN a red square with ✖, BEHIND an amber triangle with ▲, OK a green circle with ✔.",
      html: `<ul class="machines">
  <li data-status="DOWN">Char Station 2</li>
  <li data-status="OK">Conveyor 3</li>
  <li data-status="BEHIND">Hoop Driver 1</li>
</ul>`,
      code: `.machines li {
  list-style: none;
  margin: 6px 0;
}
.machines li::before {
  display: inline-block;
  width: 1.4em;
  margin-right: 6px;
  text-align: center;
  color: white;
}
[data-status="DOWN"]::before { content: "✖"; background: #c62828; }
[data-status="BEHIND"]::before { content: "▲"; background: #b26a00; border-radius: 4px; }
[data-status="OK"]::before { content: "✔"; background: #2e7d32; border-radius: 50%; }`,
      about: "About 1 in 12 men has some color vision deficiency, and red and green are the hardest pair to tell apart. Pairing each color with its own symbol and shape means status still reads in grey, on a faded printout or through a dirty screen. The machine name and status text stay in the HTML, so nothing depends on the decoration.",
      terms: [
        ["content", "content: \"✖\"", "A symbol generated before the text."],
        ["::before", "::before", "Holds the symbol and its shape."],
      ],
    },
  ],
});
