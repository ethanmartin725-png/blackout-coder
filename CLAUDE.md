# Blackout Coder: project context

## What this is

A static web app that teaches coding the way 90s typing tutors and math drills did. The learner copies reference code; as they rank up, more of it blacks out until they write it from the goal alone. The owner (Ethan) is an operations excellence lead in manufacturing building this to learn to code himself and to share with friends. Content is grounded in real plant work: PLC/HMI, SQL pulls, OEE loss reporting, shift handoffs, plant boards.

Deployed with GitHub Pages from `site/`. No framework, no build step, no dependencies. Keep it that way unless there is a clear reason.

## How Ethan works

- Read and confirm the current state before generating. Propose a plan for anything larger than a small fix.
- Flag data inconsistencies proactively, including ones in existing lessons.
- Keep explanations concise and technically precise. Numbers must be defensible: show where they come from.

## Commands

- Check every lesson: `node tools/verify.mjs` (must pass before any commit; CI runs it before deploy)
- Run locally: `python3 -m http.server 8000 -d site`, or open `site/index.html` directly
- Regenerate track outputs: see `tools/output-checks/` (needs pandas and openpyxl; track 6 needs the .NET 8 SDK)
- MES Helper track: edit `tools/output-checks/track6-mes/lessons6.py`, then `python3 build6.py` there. It compiles and runs the C# and writes `site/data/tracks/06-mes.js`. Do not edit the JS file by hand.

## Architecture

Scripts load in the order listed in `site/index.html`:

1. `js/registry.js` creates `globalThis.BC` with `addLanguage`, `addLane`, `addTrack`.
2. `js/core.js` exposes `BCcore`: tokenizer, seeded RNG for blackout masks, and `analyzeText(text, targetLines, py)`, which grades typed text line by line. The verifier uses the same file, so grading in CI matches grading in the browser.
3. `data/languages.js`, then every file in `data/foundations/` and `data/tracks/`. A new data file must be added to `index.html`; the verifier fails if it is not.
4. `js/app.js`: the engine. One IIFE, plain DOM code, sectioned by `/* ---------- name ---------- */` comments.

Key engine behaviors:

- **Ranks**: the `RANKS` table in `app.js` sets the share of words (`w`) and symbols (`s`) masked and whether live coloring is on. Masks are seeded by lane id + lesson title, so they are stable between attempts.
- **Grading**: a line completes on an exact match or a matching token signature (whitespace-insensitive). Indentation is graded only for languages with `py: true`.
- **Track context**: earlier steps with the same `file` value show as locked, dimmed code above both panels; the learner types only the new lines.
- **Previews**: `preview: true` languages render in a shadow-DOM preview. In a track, all earlier HTML/CSS/JS steps are concatenated so the page builds up step by step. The learner's own JavaScript runs only on completion or Check, never while typing. `fetch` is blocked in the preview and intervals are clamped to at least 1 s.
- **Ladder**: `diagram: true` draws the typed rungs as an SVG ladder diagram.
- **Progress**: `localStorage` key `blackout-coder-v1`, per lane/track id. Best scores are keyed by lesson **title**, so titles must be unique within a lane or track.

## Content conventions

- **PLC ladder**: Rockwell neutral text with spaces between instructions, e.g. `XIC(A) XIO(B) OTE(C);`. Branches use `BST … NXB … BND`.
- **Structured Text**: Studio 5000 style (`:=`, `TONR` with FBD_TIMER, `END_IF;`).
- **Ignition scripts**: Jython 2.7. No f-strings. `system.tag.readBlocking`, `system.db.runPrepUpdate` with `?` parameters.
- **SQL**: T-SQL (SQL Server). Parameterized `?` placeholders when called from Python, named `@name` parameters from C#.
- **C#**: .NET 8, top-level statements in `Program.cs`, nullable enabled, `Microsoft.Data.SqlClient` 7.1.1. Typed `SqlDbType` parameters, `using` on connections, writes inside a transaction. The verifier compiles every C# lesson.
- **Python**: pandas + pyodbc + openpyxl. Never paste values into SQL text; pass parameters.
- **Copy**: plain, direct sentences. Explain why, not just what. Call out assumptions a number depends on. No em-dash asides.
- **Design**: dark navy with gold accents. Caladea display, Public Sans body, JetBrains Mono code, VT323 for the LCD stat readouts. Every color is a CSS token in `css/app.css`.
- **Outputs**: every `out` or `outHtml` must come from actually running the code, never typed by hand. SQL that cannot run here is mirrored in pandas to produce its result.

## Canonical sample data

The tracks share one sample plant. Keep new content consistent with it, or deliberately change it everywhere.

| Machine | Area | Ideal rate | Margin |
|---|---|---|---|
| Conveyor 3 | Assembly | 60 barrels/hr | $42.50 |
| Hoop Driver 1 | Assembly | 55 barrels/hr | $42.50 |
| Char Station 2 | Finishing | 50 barrels/hr | $42.50 |

Rates and margin are illustrative, not real plant figures.

- **DB Pulls & Analytics**: 47 seeded faults, "now" = 2026-11-07 10:15. Pareto minutes: Low air 87.4, Char flare 70.0, Hoop misfeed 66.6, Jam 65.7, E-stop 10.8. Lost dollars across all 47 faults: $11,753.79.
- **OEE Loss Report**: week 2026-10-31 06:00 to 2026-11-07 06:00 (45 of the 47 faults fall inside it). Planned 9,450 min per machine (7 days × 3 shifts × 450 min). OEE: Char Station 2 86.0%, Conveyor 3 73.8%, Hoop Driver 1 72.9%. Dollars per OEE point: $3,347 / $4,016 / $3,682. Weekly loss $251,876, of which performance $221,444.
- **Shift Handoff**: shift A, 2026-11-07 06:00–14:00, run at 14:05. Barrels 301 / 352 / 274. Status DOWN (open char flare) / OK / BEHIND. Faults this shift: 5. The first two (Conveyor 3 jam 09:08:52, Hoop Driver 1 misfeed 10:09:40) are the same `fault_log` records DB Pulls ends on; the misfeed, open at 10:15 there, closes at 10:17:10. Down minutes 23.75 / 4.62 / 41.00.
- **Plant Board**: reuses the OEE, Pareto and handoff numbers above. Biggest gap to 85%: Hoop Driver 1, 12.1 pts.
- **MES Helper**: same shift A data as Shift Handoff, run at 2026-11-07T14:05. Down minutes are clipped to the shift window: 18.75 / 4.62 / 41.00 (Char Station 2 is 18.75, not the handoff's 23.75, because the open flare stops counting at 14:00). 4 closed faults coded and posted, 1 open held back; a rerun posts 0. Reason codes and `mes_downtime_event` are illustrative, not a real MES schema.

Known simplification worth keeping visible to learners: `fault_log` holds only PLC-detected jams, so availability runs about 99% and nearly all loss lands in performance. The lessons say so.

## Before you change things

- Run `node tools/verify.mjs` first to confirm a clean baseline.
- Changing a lesson title resets learners' saved best score for it.
- Changing a lane or track `id` resets all progress for it.
- After any engine change, test in a browser: type one Foundations lesson, one ladder step, and one Plant Board JavaScript step to completion, and check phone width for sideways scrolling.

See `docs/ROADMAP.md` for open work.
