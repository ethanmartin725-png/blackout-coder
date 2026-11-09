# Lesson format

All lesson content lives in `site/data/`. Each file calls one registry function. After any edit, run `node tools/verify.mjs`.

## Foundations lane

```js
BC.addLane({
  id: "python",          // stable; progress is saved under it
  name: "Python",        // tab label
  lang: "python",        // language id from data/languages.js; applies to every lesson
  lessons: [ /* lessons */ ],
});
```

## Project track

```js
BC.addTrack({
  id: "t-plc",
  name: "PLC & HMI",
  sub: "One-line description shown above the step map",
  lessons: [ /* lessons, each with lang and file */ ],
});
```

Add `soon: true` with no lessons to show a greyed-out placeholder tab.

## Lesson

| Field | Required | Meaning |
|---|---|---|
| `t` | yes | Title. Must be unique within its lane or track: best scores are keyed by it. |
| `goal` | yes | The task, shown in the top bar. Write it so a Master-rank learner could produce the code from it alone. |
| `code` | yes | The exact code to type. Spaces, not tabs. |
| `about` | yes | What the code does and why, shown in the reference panel. |
| `terms` | yes | Command definitions. See below. |
| `lang` | tracks | Language id for this step. |
| `file` | tracks | The file this step belongs to. Consecutive steps with the same `file` build on each other: earlier code shows as locked context. |
| `out` | no | Plain-text result, shown under "What it produces". Must come from running the code. |
| `outHtml` | no | A generated HTML page, rendered as a preview. |
| `sim` | no | Ladder and Structured Text: a scenario the PLC interpreter runs to generate `out`. See below. |

### PLC scenarios (`sim`)

A ladder or Structured Text lesson's output comes from running it in the interpreter (`site/js/plc.js`). The `sim` field says what happens over time and what to report:

```js
sim: {
  start: { Auto_Mode: 1, Estop_OK: 1, Stop_PB: 1 },   // values before the first step
  watch: ["Jam_Timer.DN", "Jam_Fault", "Conv_Run"],    // tags reported when they change
  steps: [
    { label: "Press and release Start_PB", pulse: { Start_PB: 1 } },
    { label: "Eye blocked 4 s while running", set: { Eye_Blocked: 1 }, runMs: 4100 },
  ],
}
```

- `set` holds its values from the start of the step; `pulse` holds them for `pulseMs` (default 300) and then restores the old values, like a pushbutton.
- `runMs` is how long the step runs (default 1000); `repeat` runs it several times, for example once per barrel.
- `types` declares tags the code alone cannot type, such as a REAL analog input (`{ Hoop1_Air_PSI: "REAL" }`) or a counter that is only read. `scanMs` sets the simulated scan time (default 10).
- A track step runs together with the earlier steps in the same routine (same `file` and language).
- `scene` shows a machine in the simulator. Scenes live in `SCENES` in `app.js`; each declares the tags it drives, which are then not offered as manual inputs.
  - `"conveyor3"`: Conveyor 3 jam cell. Barrels drive `Eye_Blocked`; reads `Conv_Run`, `Jam_Fault`, `Barrel_Count`, `Conv_State`. Buttons: jam a barrel, clear the jam.
  - `"air1"`: Hoop Driver 1 air header. Drives `Hoop1_Air_PSI` (cylinder dips every 2.5 s while running); reads `Hoop1_Air_OK`, `Hoop1_Low_Air`, `Hoop1_Run`. Buttons: compressor trips, regulator sticks high, back to normal.
  - `"char2"`: Char Station 2 burner and fan. Reads `Char2_Burner_On`, `Char2_Exhaust_Fan` and the timers `Purge_Timer`, `Post_Purge`, `Exhaust_Timer`; shows smoke building without the fan.
- The simulator's "Compare with the reference" button runs the scenario on the learner's code and on the lesson's code and shows the first step where they differ, so logic written differently still passes if it behaves the same.
- The simulator panel takes its inputs from the scenario: tags in `start`, `set` and `pulse`. Pulsed tags and tags named `*_PB` become hold-to-press buttons; other bits become switches; numbers become number boxes.
- `sameAs: "<step title>"` marks a step that rewrites another one, such as ladder rewritten as Structured Text. The verifier fails if their traces ever differ.

Each step prints `label  →  tag=value  →  …` in the order things changed. Then run `node tools/output-checks/plc/run.mjs` to write the outputs; the verifier fails if a stored output no longer matches its scenario.

### Terms

Each term is `[key, label, definition]`:

- `key`: the exact token in `code` that clicking the term outlines, e.g. `"readBlocking"`. Use `null` for a concept with no single token (scan order, indentation).
- `label`: what the card shows, e.g. `"system.tag.readBlocking"`.
- `definition`: one or two plain sentences.

The verifier warns when a key is not found in that step's code.

## Language mode

```js
BC.addLanguage("ignition", {
  name: "Ignition script",   // shown in the reference panel and goal line
  short: "IGN",              // step-map chip label
  tab: 4,                    // spaces per Tab key
  py: true,                  // grade indentation; auto-indent after a trailing colon
  kw: "def return if ...",   // space-separated keywords for coloring
  note: "One-paragraph description shown under every lesson in this language.",
  // optional:
  markup: "html" | "css",    // markup-aware coloring
  preview: true,             // live page preview (html, css, js)
  diagram: true,             // ladder diagram drawing
});
```

JavaScript has two modes. `js` previews a page and only makes sense in a track, where earlier HTML and CSS steps build the page it runs on. `jscon` has no preview: it is for console lessons whose output comes from running them in Node.

## Grading rules worth knowing when writing code

- A line completes on an exact match, or when its tokens match ignoring whitespace. So `a=b` and `a = b` both pass, except where `py: true` makes leading indentation count.
- Blank lines in `code` are skipped; learners don't type them.
- Long lines are harder on phones. Break them where the language allows.
- Ladder: one rung per line, ending in `;`.
