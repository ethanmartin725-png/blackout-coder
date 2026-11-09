// Foundations lane: HTML
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
BC.addLane({
  id: "html",
  name: "HTML",
  lang: "html",
  lessons: [
    {
      t: "Heading and paragraph",
      goal: "Add a top heading \"Cooperage Daily Board\" and a paragraph \"Shift A is running.\"",
      code: `<h1>Cooperage Daily Board</h1>
<p>Shift A is running.</p>`,
      about: "Tags wrap content and say what it is. The browser decides how a heading and a paragraph look unless CSS says otherwise.",
      terms: [
        ["h1", "<h1>", "Top-level heading. h2 through h6 are smaller levels."],
        ["p", "<p>", "A paragraph of text."],
        ["/", "</…>", "Closing tag. Most elements need one."],
      ],
    },
    {
      t: "Numbered list",
      goal: "Under an h2 \"Top Downtime\", make a numbered list: Jointer jam, Char flare, Hoop driver fault.",
      code: `<h2>Top Downtime</h2>
<ol>
  <li>Jointer jam</li>
  <li>Char flare</li>
  <li>Hoop driver fault</li>
</ol>`,
      about: "Elements nest. The list items live inside the ol, and the browser numbers them for you.",
      terms: [
        ["ol", "<ol>", "Ordered (numbered) list. <ul> is a bulleted list."],
        ["li", "<li>", "One list item."],
        ["h2", "<h2>", "Second-level heading."],
      ],
    },
    {
      t: "Links and images",
      goal: "Link \"Learn Python\" to https://www.python.org and add barrel.png with alt text \"Charred barrel\".",
      code: `<a href="https://www.python.org">Learn Python</a>
<img src="barrel.png" alt="Charred barrel">`,
      about: "Attributes go inside the opening tag as name=\"value\". The image file does not exist here, so the preview shows its alt text instead.",
      terms: [
        ["a", "<a href>", "A link. href is the destination."],
        ["img", "<img>", "Shows an image. It has no closing tag."],
        ["src", "src", "The file or URL of the image."],
        ["alt", "alt", "Text read aloud or shown when the image can't load."],
      ],
    },
    {
      t: "Tables",
      goal: "Build a table with headers Line and Barrels, and one row: Line 1, 412.",
      code: `<table>
  <tr>
    <th>Line</th>
    <th>Barrels</th>
  </tr>
  <tr>
    <td>Line 1</td>
    <td>412</td>
  </tr>
</table>`,
      about: "Tables are built row by row. Each tr holds cells; th cells are headers, td cells are data.",
      terms: [
        ["table", "<table>", "Wraps the whole table."],
        ["tr", "<tr>", "Table row."],
        ["th", "<th>", "Header cell, bold and centered by default."],
        ["td", "<td>", "Data cell."],
      ],
    },
    {
      t: "A form",
      goal: "Make a form with a label \"Good count\" tied to a number input (id count) and a submit button \"Log it\".",
      code: `<form>
  <label for="count">Good count</label>
  <input id="count" type="number">
  <button type="submit">Log it</button>
</form>`,
      about: "The label's for matches the input's id, so clicking the label focuses the box. Submitting is switched off in the preview.",
      terms: [
        ["form", "<form>", "Groups inputs that are submitted together."],
        ["label", "<label for>", "Ties a caption to an input by id."],
        ["input", "<input type=\"number\">", "A numeric entry box. type sets the kind of field."],
        ["id", "id", "A unique name for one element on the page."],
        ["button", "<button type=\"submit\">", "Sends the form."],
      ],
    },
    {
      t: "Style with CSS",
      goal: "Add a CSS class kpi with gold text at 32px, and a div using it that reads \"OEE 72%\".",
      code: `<style>
  .kpi {
    color: gold;
    font-size: 32px;
  }
</style>
<div class="kpi">OEE 72%</div>`,
      about: "CSS rules pick elements with a selector and set properties. The dot means class, so the rule applies to anything with class=\"kpi\".",
      terms: [
        ["style", "<style>", "Holds CSS rules for the page."],
        ["kpi", ".kpi", "A class selector. Applies to any element with class=\"kpi\"."],
        ["color", "color / font-size", "CSS properties: name, colon, value, semicolon."],
        ["div", "<div class>", "A generic box. class links it to the CSS rule."],
      ],
    },
    {
      t: "Page skeleton",
      goal: "Write a complete page: doctype, html with lang=\"en\", a head with UTF-8 charset, a viewport meta tag and the title \"Cooperage Board\", and a body with an h1.",
      code: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cooperage Board</title>
</head>
<body>
  <h1>Cooperage Board</h1>
</body>
</html>`,
      about: "Every page starts like this. The doctype switches the browser to standards mode. lang tells screen readers and translators the language. The charset line makes ° and ± display correctly. Without the viewport line a phone shows the page zoomed out as if it were a desktop. The title appears on the browser tab; only the body is shown in the preview.",
      terms: [
        ["<!doctype html>", "<!doctype html>", "Tells the browser this is modern HTML."],
        ["lang", "lang=\"en\"", "The page's language."],
        ["viewport", "viewport", "Makes phones use their real width."],
        ["title", "<title>", "The text on the browser tab."],
      ],
    },
    {
      t: "Semantic sections",
      goal: "Lay out a page with a header (h1 \"Cooperage Line\"), a nav with three links, a main holding one section with an h2 and a paragraph, and a footer.",
      code: `<header>
  <h1>Cooperage Line</h1>
  <nav>
    <a href="#board">Board</a>
    <a href="#faults">Faults</a>
    <a href="#handoff">Handoff</a>
  </nav>
</header>
<main>
  <section id="board">
    <h2>Board</h2>
    <p>Three machines running on shift A.</p>
  </section>
</main>
<footer>Updated 14:05</footer>`,
      about: "header, nav, main, section and footer look like plain blocks, but they say what each part of the page is for. Screen readers let users jump straight to main or the nav, and search engines weigh them. A div says nothing about its content; use it only when no meaningful element fits. Links are switched off in the preview.",
      terms: [
        ["nav", "<nav>", "A block of navigation links."],
        ["main", "<main>", "The page's main content. One per page."],
        ["section", "<section>", "A themed part of the page, usually with a heading."],
        ["footer", "<footer>", "The closing band: dates, owner, contact."],
      ],
    },
    {
      t: "Heading levels",
      goal: "Build an outline: h1 \"Shift A Report\", h2 \"Output\" with h3s \"Conveyor 3\" and \"Hoop Driver 1\", then h2 \"Downtime\".",
      code: `<h1>Shift A Report</h1>
<h2>Output</h2>
<h3>Conveyor 3</h3>
<p>352 barrels, 78.2% of target.</p>
<h3>Hoop Driver 1</h3>
<p>274 barrels, 66.4% of target.</p>
<h2>Downtime</h2>
<p>5 faults this shift.</p>`,
      about: "Headings form an outline, like numbered sections in an SOP: h2s sit under the h1 and h3s under an h2. Pick the level by position in the outline, not by how big it looks; CSS controls size. Screen-reader users move through a page by its headings, so skipping from h1 to h4 leaves gaps. The numbers are shift A's.",
      terms: [
        ["h2", "<h2>", "A section heading under the h1."],
        ["h3", "<h3>", "A sub-section under an h2."],
      ],
    },
    {
      t: "Emphasis and highlights",
      goal: "Write a paragraph with \"Do not\" in strong, \"before\" in em, and a mark around \"Hoop Driver 1 is behind\".",
      code: `<p><strong>Do not</strong> reset a jam fault <em>before</em> the eye is clear.</p>
<p>Shift A: <mark>Hoop Driver 1 is behind</mark> at 66.4% of target.</p>`,
      about: "strong means important, em means stressed, and mark means highlighted for attention, like a highlighter pen on a printout. Browsers show them bold, italic and yellow by default, but the meaning is what counts: a screen reader can stress em text. Use CSS, not strong, when you only want bold for looks.",
      terms: [
        ["strong", "<strong>", "Important text. Bold by default."],
        ["em", "<em>", "Stressed text. Italic by default."],
        ["mark", "<mark>", "Highlighted text, like a highlighter."],
      ],
    },
    {
      t: "Nested lists",
      goal: "Write an ordered list of three jam-clearing steps where the second step has an unordered list of two sub-steps.",
      code: `<ol>
  <li>Stop Conveyor 3 and wait for it to come to rest.</li>
  <li>Check the eye:
    <ul>
      <li>Is a barrel still blocking it?</li>
      <li>Is the lens dirty?</li>
    </ul>
  </li>
  <li>Clear the eye, then press Reset.</li>
</ol>`,
      about: "A list inside an li makes sub-steps, the way a work instruction breaks a step into checks. The inner ul sits inside the second li, before its closing tag. Steps where order matters use ol; checks where it does not use ul. The steps are illustrative; your site's lockout procedure decides when a machine is safe to reach into.",
      terms: [
        ["ol", "<ol>", "Ordered list: numbered steps."],
        ["ul", "<ul>", "Unordered list: bullets."],
        ["li", "<li>", "One item. A nested list goes inside it."],
      ],
    },
    {
      t: "Description list",
      goal: "Write a dl defining Availability, Performance and Quality, each with a dt and a dd.",
      code: `<dl>
  <dt>Availability</dt>
  <dd>Run time over planned time. Hoop Driver 1: 98.8%.</dd>
  <dt>Performance</dt>
  <dd>Actual output over ideal output in the run time: 74.9%.</dd>
  <dt>Quality</dt>
  <dd>Good units over total units: 98.5%.</dd>
</dl>`,
      about: "A description list pairs terms with their meanings: a glossary, a spec sheet, machine settings. dt is the term and dd its description. These are Hoop Driver 1's weekly factors from the OEE Loss Report, which multiply to its 72.9% OEE.",
      terms: [
        ["dl", "<dl>", "Description list: term and description pairs."],
        ["dt", "<dt>", "The term."],
        ["dd", "<dd>", "Its description."],
      ],
    },
    {
      t: "Table head, body and foot",
      goal: "Make a table of shift A barrels with a thead row, a tbody with the three machines, and a tfoot with the total 927.",
      code: `<table>
  <thead>
    <tr><th>Machine</th><th>Barrels</th></tr>
  </thead>
  <tbody>
    <tr><td>Char Station 2</td><td>301</td></tr>
    <tr><td>Conveyor 3</td><td>352</td></tr>
    <tr><td>Hoop Driver 1</td><td>274</td></tr>
  </tbody>
  <tfoot>
    <tr><th>Total</th><td>927</td></tr>
  </tfoot>
</table>`,
      about: "thead, tbody and tfoot split a table into header, data and totals. A long table printed over several pages repeats its head and foot on each page, and scripts can redraw the body without touching the rest. th marks a header cell; the Total label is a header for its row.",
      terms: [
        ["thead", "<thead>", "The header rows."],
        ["tbody", "<tbody>", "The data rows."],
        ["tfoot", "<tfoot>", "Totals and summary rows."],
      ],
    },
    {
      t: "Caption and scope",
      goal: "Add a caption \"Shift A down minutes\" to a table, mark the column headers with scope=\"col\" and each machine name as a row header with scope=\"row\".",
      code: `<table>
  <caption>Shift A down minutes</caption>
  <tr><th scope="col">Machine</th><th scope="col">Faults</th><th scope="col">Minutes</th></tr>
  <tr><th scope="row">Hoop Driver 1</th><td>3</td><td>41.00</td></tr>
  <tr><th scope="row">Char Station 2</th><td>1</td><td>18.75</td></tr>
  <tr><th scope="row">Conveyor 3</th><td>1</td><td>4.62</td></tr>
</table>`,
      about: "A caption is the table's title, tied to the table itself. scope tells a screen reader whether a header labels its column or its row, so a cell is read as \"Hoop Driver 1, Minutes, 41.00\" rather than a bare number. These are the Shift Handoff track's down minutes.",
      terms: [
        ["caption", "<caption>", "The table's title."],
        ["scope=\"col\"", "scope=\"col\"", "This header labels its column."],
        ["scope=\"row\"", "scope=\"row\"", "This header labels its row."],
      ],
    },
    {
      t: "colspan and rowspan",
      goal: "Make a table where a top header \"Shift A\" spans two columns (Barrels, Target), and the Machine header spans both header rows.",
      code: `<table>
  <tr>
    <th rowspan="2">Machine</th>
    <th colspan="2">Shift A</th>
  </tr>
  <tr><th>Barrels</th><th>Target</th></tr>
  <tr><td>Conveyor 3</td><td>352</td><td>450</td></tr>
  <tr><td>Hoop Driver 1</td><td>274</td><td>412.5</td></tr>
</table>`,
      about: "colspan stretches a cell across columns and rowspan down rows, which is how grouped headers are built. The second row has only two cells because Machine already fills its first column from above. Count cells carefully: a row with one cell too many pushes everything out of line.",
      terms: [
        ["colspan", "colspan=\"2\"", "Spans two columns."],
        ["rowspan", "rowspan=\"2\"", "Spans two rows."],
      ],
    },
    {
      t: "Number inputs",
      goal: "Make a labeled number input for a barrel count (0 to 999, whole numbers) and one for air pressure (0 to 150, steps of 0.5, starting at 92).",
      code: `<label>Barrels counted
  <input type="number" min="0" max="999" step="1">
</label>
<label>Air pressure, psi
  <input type="number" min="0" max="150" step="0.5" value="92">
</label>`,
      about: "type=\"number\" shows a numeric keypad on a phone and up and down arrows on a desktop. min, max and step set what the browser accepts; the form will not submit an out-of-range value, and CSS can highlight it. 92 psi is Hoop Driver 1's normal header pressure. The browser's checks help the operator, but a server must still check again.",
      terms: [
        ["type=\"number\"", "type=\"number\"", "A field for numbers."],
        ["min", "min / max", "The lowest and highest accepted values."],
        ["step", "step", "The allowed increment. 0.5 allows halves."],
        ["value", "value", "The starting value."],
      ],
    },
    {
      t: "Date and time inputs",
      goal: "Make labeled inputs for a shift date (date, starting 2026-11-07), a start time (time, starting 06:00), and a fault timestamp (datetime-local).",
      code: `<label>Shift date <input type="date" value="2026-11-07"></label>
<label>Start <input type="time" value="06:00"></label>
<label>Fault at <input type="datetime-local" value="2026-11-07T09:08"></label>`,
      about: "These give a date or time picker, and the value is always in one fixed format, 2026-11-07 or 06:00, whatever the operator's regional settings show. That makes the value safe to send to SQL. datetime-local has no time zone, which suits a plant clock but needs care across sites. 09:08 is the Conveyor 3 jam from shift A.",
      terms: [
        ["type=\"date\"", "type=\"date\"", "A date picker. Value: YYYY-MM-DD."],
        ["type=\"time\"", "type=\"time\"", "A time picker. Value: HH:MM."],
        ["datetime-local", "datetime-local", "Date and time together, with no time zone."],
      ],
    },
    {
      t: "Checkboxes and radios",
      goal: "In a fieldset with the legend \"Start-up checks\", add two checkboxes. In a second fieldset \"Shift\", add radio buttons A, B and C sharing the name shift, with A checked.",
      code: `<fieldset>
  <legend>Start-up checks</legend>
  <label><input type="checkbox"> Guards closed</label>
  <label><input type="checkbox"> Air at 85 to 110 psi</label>
</fieldset>
<fieldset>
  <legend>Shift</legend>
  <label><input type="radio" name="shift" value="A" checked> A</label>
  <label><input type="radio" name="shift" value="B"> B</label>
  <label><input type="radio" name="shift" value="C"> C</label>
</fieldset>`,
      about: "Checkboxes are independent yes/no answers; radios with the same name are one choice, so picking B clears A. A fieldset groups related fields and its legend names the group, which a screen reader announces with each field. Wrapping the input in its label makes the text clickable, a bigger target with gloves on. 85 to 110 psi is the air band from the PLC lessons.",
      terms: [
        ["type=\"checkbox\"", "checkbox", "An independent yes/no box."],
        ["type=\"radio\"", "radio", "One choice from a group with the same name."],
        ["legend", "<legend>", "The fieldset's title."],
        ["checked", "checked", "Selected when the page loads."],
      ],
    },
    {
      t: "Required fields and patterns",
      goal: "Make a required text input for a machine tag that must match two capital letters, a dash and two digits (like HD-01), with a title explaining the format.",
      code: `<form>
  <label>Machine tag
    <input type="text" required pattern="[A-Z]{2}-[0-9]{2}" title="Two capital letters, a dash, two digits: HD-01" placeholder="HD-01">
  </label>
  <button>Check</button>
</form>`,
      about: "required refuses an empty field and pattern refuses text that does not match the regular expression, here two capitals, a dash and two digits. Press Check with a bad value and the browser explains, using the title. The tag format is illustrative. Browser checks are a convenience; a database or server must check again, because anyone can bypass a form.",
      terms: [
        ["required", "required", "The field cannot be empty."],
        ["pattern", "pattern", "A regular expression the whole value must match."],
        ["title", "title", "Shown when the pattern does not match."],
      ],
    },
    {
      t: "Text areas",
      goal: "Make a labeled textarea for a handoff note, 4 rows tall, limited to 280 characters, with a placeholder.",
      code: `<label for="note">Handoff note</label>
<textarea id="note" rows="4" maxlength="280" placeholder="What does the next shift need to know?"></textarea>`,
      about: "A textarea takes several lines of text. maxlength stops typing at 280 characters, which keeps notes short enough to read at a shift change. Here the label is linked with for and id instead of wrapping the field; both work, and for/id is handy when the label and field sit in different places in a layout.",
      terms: [
        ["textarea", "<textarea>", "A multi-line text field."],
        ["maxlength", "maxlength", "The most characters allowed."],
        ["for", "for=\"note\"", "Links the label to the field with that id."],
      ],
    },
    {
      t: "Suggestions with datalist",
      goal: "Make a text input for a fault name linked to a datalist suggesting Jam, Hoop misfeed, Low air, Char flare and E-stop.",
      code: `<label>Fault
  <input list="fault-names">
</label>
<datalist id="fault-names">
  <option value="Jam">
  <option value="Hoop misfeed">
  <option value="Low air">
  <option value="Char flare">
  <option value="E-stop">
</datalist>`,
      about: "A datalist suggests values as the operator types but still allows something new, unlike a select. That suits fault names: the five from the Pareto cover most stops, and a rare one can still be entered. The input's list attribute names the datalist's id.",
      terms: [
        ["datalist", "<datalist>", "A list of suggestions for an input."],
        ["list", "list=\"fault-names\"", "Links the input to the datalist with that id."],
      ],
    },
    {
      t: "Grouped options",
      goal: "Make a select of machines grouped with optgroup: Assembly (Conveyor 3, Hoop Driver 1) and Finishing (Char Station 2).",
      code: `<label>Machine
  <select>
    <optgroup label="Assembly">
      <option>Conveyor 3</option>
      <option>Hoop Driver 1</option>
    </optgroup>
    <optgroup label="Finishing">
      <option>Char Station 2</option>
    </optgroup>
  </select>
</label>`,
      about: "optgroup puts headings inside a drop-down that cannot be picked themselves. The areas are the canonical plant's: Conveyor 3 and Hoop Driver 1 in Assembly, Char Station 2 in Finishing. With dozens of machines, grouping by area is the difference between scanning and hunting.",
      terms: [
        ["optgroup", "<optgroup>", "A labeled group of options."],
        ["label", "label=\"Assembly\"", "The group's heading."],
      ],
    },
    {
      t: "Button types",
      goal: "In a form with a text input, add a submit button \"Save\", a reset button \"Clear\" and a plain button \"Preview\".",
      code: `<form>
  <input value="Conveyor 3">
  <button type="submit">Save</button>
  <button type="reset">Clear</button>
  <button type="button">Preview</button>
</form>`,
      about: "A button inside a form submits it unless told otherwise, so always set type. submit sends the form, reset puts every field back to its starting value (try it after editing the text), and button does nothing until a script gives it a job. An accidental Reset is a common way to lose a half-filled form, so many forms leave it out.",
      terms: [
        ["type=\"submit\"", "submit", "Sends the form."],
        ["type=\"reset\"", "reset", "Restores every field's starting value."],
        ["type=\"button\"", "button", "Does nothing until a script handles it."],
      ],
    },
    {
      t: "Progress and meter",
      goal: "Show a progress bar for 352 of 450 barrels, and a meter for OEE 0.729 from 0 to 1, with low 0.6, high 0.85 and optimum 0.9.",
      code: `<p>Conveyor 3 shift target:
  <progress value="352" max="450">352 of 450</progress> 352 of 450
</p>
<p>Hoop Driver 1 OEE:
  <meter value="0.729" min="0" max="1" low="0.6" high="0.85" optimum="0.9">72.9%</meter> 72.9%
</p>`,
      about: "progress shows how far a task has got: 352 of the 450-barrel target. meter shows a measurement within a known range, and low, high and optimum let the browser color it: 72.9% sits between low and high, so it shows as acceptable but not ideal. 0.85 is the usual world-class OEE. The text inside shows only in browsers without support.",
      terms: [
        ["progress", "<progress>", "Completion of a task."],
        ["meter", "<meter>", "A measurement within a range."],
        ["optimum", "optimum", "The best value; sets how the bar is colored."],
      ],
    },
    {
      t: "Details and summary",
      goal: "Make a details block with the summary \"Char flare, Char Station 2, 13:41\" that opens to show two paragraphs of detail. Make a second one open by default.",
      code: `<details>
  <summary>Char flare, Char Station 2, 13:41</summary>
  <p>Still open at 14:05: 23.75 minutes so far.</p>
  <p>Burner B igniter sparking weak.</p>
</details>
<details open>
  <summary>Jam, Conveyor 3, 09:08</summary>
  <p>Cleared at 09:13. 4.62 minutes.</p>
</details>`,
      about: "details hides its content behind the summary line until clicked, with no script. It keeps a long fault list short: one line each, detail on demand. open starts it expanded. The faults are shift A's from the Shift Handoff track.",
      terms: [
        ["details", "<details>", "A block that opens and closes."],
        ["summary", "<summary>", "The always-visible line you click."],
        ["open", "open", "Starts expanded."],
      ],
    },
    {
      t: "Figure and caption",
      goal: "Wrap a small table of the top three Pareto faults in a figure with a figcaption naming the source.",
      code: `<figure>
  <table>
    <tr><td>Low air</td><td>87.4 min</td></tr>
    <tr><td>Char flare</td><td>70.0 min</td></tr>
    <tr><td>Hoop misfeed</td><td>66.6 min</td></tr>
  </table>
  <figcaption>Top three faults by minutes, all 47 faults in fault_log.</figcaption>
</figure>`,
      about: "A figure is a self-contained exhibit, a chart, photo, table or diagram, and figcaption is its caption. A caption that says where the numbers came from makes an exhibit defensible when it is copied into a report. These are the DB Pulls track's Pareto minutes.",
      terms: [
        ["figure", "<figure>", "A self-contained exhibit."],
        ["figcaption", "<figcaption>", "The exhibit's caption."],
      ],
    },
    {
      t: "Machine-readable times",
      goal: "Write a sentence where \"09:08 on Nov 7\" is a time element with datetime=\"2026-11-07T09:08\", and a duration \"4 min 37 s\" with datetime=\"PT4M37S\".",
      code: `<p>Conveyor 3 jammed at
  <time datetime="2026-11-07T09:08">09:08 on Nov 7</time>
  and was down for
  <time datetime="PT4M37S">4 min 37 s</time>.
</p>`,
      about: "People read the text; programs read the datetime attribute. That lets a calendar, a search engine or a script pick up the exact time however the text is worded. PT4M37S is the standard way to write a duration: a period of 4 minutes 37 seconds, the Conveyor 3 jam's length from shift A.",
      terms: [
        ["time", "<time>", "A date, time or duration."],
        ["datetime", "datetime", "The exact value in a standard format."],
        ["PT4M37S", "PT4M37S", "ISO 8601 duration: 4 minutes 37 seconds."],
      ],
    },
    {
      t: "Abbreviations",
      goal: "Write two sentences using abbr for OEE and MTTR, each with its expansion in title.",
      code: `<p>Hoop Driver 1's <abbr title="Overall Equipment Effectiveness">OEE</abbr> was 72.9% this week.</p>
<p>Track <abbr title="Mean Time To Repair">MTTR</abbr> for every machine.</p>`,
      about: "abbr marks an abbreviation, and title gives the full words, shown on hover. Plants run on abbreviations, and a new operator, an auditor or a visitor from finance will not know them all. Spelling each out once per page is a small courtesy that saves questions.",
      terms: [
        ["abbr", "<abbr>", "An abbreviation."],
        ["title", "title", "The full words, shown on hover."],
      ],
    },
    {
      t: "Code, preformatted text and keys",
      goal: "Write a paragraph with the tag name Jam_Fault in code and the keys Ctrl and F in kbd, then a pre block holding a two-line rung.",
      code: `<p>Find <code>Jam_Fault</code> with <kbd>Ctrl</kbd>+<kbd>F</kbd>.</p>
<pre>XIC(Jam_Timer.DN) OTL(Jam_Fault);
XIC(Reset_PB) XIO(Eye_Blocked) OTU(Jam_Fault);</pre>`,
      about: "code marks a tag name or a bit of code in a sentence, kbd a key to press, and pre keeps text exactly as typed, spaces and line breaks included, in a fixed-width font. All three matter in work instructions and troubleshooting guides, where a tag name has to be copied letter for letter. The rungs are from the PLC track's jam cell.",
      terms: [
        ["code", "<code>", "Code or a tag name inside text."],
        ["kbd", "<kbd>", "A key to press."],
        ["pre", "<pre>", "Text kept exactly as typed."],
      ],
    },
    {
      t: "Character entities",
      goal: "Write three lines using entities: air at 92 &plusmn; 2 psi, a char temperature in &deg;F, and the comparison PSI &lt; 80 &amp;&amp; running.",
      code: `<p>Header air: 92 &plusmn; 2 psi</p>
<p>Char chamber: 800&deg;F</p>
<p>Low air when <code>PSI &lt; 80 &amp;&amp; running</code></p>`,
      about: "< and & start tags and entities, so to show them as text write &lt; and &amp;. Entities also give symbols that are hard to type, like ± and °. With a UTF-8 page you can type ± and ° directly, but &lt; and &amp; are always needed in text. 800°F and ±2 psi are illustrative values.",
      terms: [
        ["&plusmn;", "&plusmn;", "±"],
        ["&deg;", "&deg;", "°"],
        ["&lt;", "&lt;", "A literal < that is not a tag."],
        ["&amp;", "&amp;", "A literal &."],
      ],
    },
    {
      t: "Data attributes",
      goal: "Make three list items for the machines with data-status (DOWN, OK, BEHIND) and data-rate (50, 60, 55) attributes.",
      code: `<ul>
  <li data-status="DOWN" data-rate="50">Char Station 2</li>
  <li data-status="OK" data-rate="60">Conveyor 3</li>
  <li data-status="BEHIND" data-rate="55">Hoop Driver 1</li>
</ul>`,
      about: "data- attributes carry your own facts on an element without inventing tags. Nothing shows on the page, but CSS can style by them ([data-status=\"DOWN\"] in the CSS lane) and JavaScript reads them as element.dataset.status. The statuses are shift A's and the rates are the canonical ideal rates.",
      terms: [
        ["data-status", "data-status", "A custom fact. JavaScript reads it as dataset.status."],
        ["data-rate", "data-rate", "Another custom fact on the same element."],
      ],
    },
    {
      t: "Alt text and labels",
      goal: "Write an img with alt text describing a jammed barrel, a decorative img with empty alt, and an icon-only button with an aria-label.",
      code: `<img src="eye-jam.jpg" alt="A barrel stuck sideways in front of the Conveyor 3 photo-eye">
<img src="divider.png" alt="">
<button aria-label="Reset jam fault">&#x21bb;</button>`,
      about: "alt text is read aloud, and shown if the image fails to load, so describe what matters: the barrel is stuck at the eye. A purely decorative image gets alt=\"\" so it is skipped. A button showing only a symbol needs aria-label, or a screen reader announces nothing useful. The image files do not exist here, so the alt text is what the preview shows.",
      terms: [
        ["alt", "alt", "Text that replaces the image."],
        ["alt=\"\"", "alt=\"\"", "Decorative: skipped by screen readers."],
        ["aria-label", "aria-label", "An accessible name for an element with no text."],
      ],
    },
    {
      t: "Inline SVG bars",
      goal: "Draw an inline SVG 300 wide and 90 tall with three bars for Low air (87.4), Char flare (70.0) and Hoop misfeed (66.6), scaled so 87.4 is 280 wide, each with a text label.",
      code: `<svg width="300" height="90" role="img" aria-label="Top three faults by minutes">
  <rect x="0" y="5" width="280" height="20" fill="#e3a72f"></rect>
  <rect x="0" y="35" width="224" height="20" fill="#e3a72f"></rect>
  <rect x="0" y="65" width="213" height="20" fill="#e3a72f"></rect>
  <text x="6" y="20">Low air 87.4</text>
  <text x="6" y="50">Char flare 70.0</text>
  <text x="6" y="80">Hoop misfeed 66.6</text>
</svg>`,
      about: "SVG draws shapes from numbers, so a chart can be written straight into the page. Each bar's width is its minutes scaled to the longest: 70.0 / 87.4 × 280 = 224 and 66.6 / 87.4 × 280 = 213. y moves each bar down; text is drawn after the bars so it sits on top. role and aria-label give the picture a name for screen readers.",
      terms: [
        ["svg", "<svg>", "A drawing area for vector shapes."],
        ["rect", "<rect>", "A rectangle: x, y, width, height."],
        ["text", "<text>", "Text placed at x, y (its baseline)."],
        ["fill", "fill", "The shape's color."],
      ],
    },
  ],
});
