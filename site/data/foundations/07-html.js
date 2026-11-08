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
  ],
});
