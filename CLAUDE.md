# Blackout Coder: project context

## What this is

A static web app that teaches coding the way 90s typing tutors and math drills did. The learner copies reference code; as they rank up, more of it blacks out until they write it from the goal alone. The owner (Ethan) is an operations excellence lead in manufacturing building this to learn to code himself and to share with friends. Content is grounded in real plant work: PLC/HMI, SQL pulls, OEE loss reporting, shift handoffs, plant boards.

Deployed from `site/` as plain static files: GitLab Pages via `.gitlab-ci.yml`, or GitHub Pages via `.github/workflows/pages.yml`. Both run `node tools/verify.mjs` before deploying. No framework, no build step, no dependencies. Keep it that way unless there is a clear reason.

## How Ethan works

- Read and confirm the current state before generating. Propose a plan for anything larger than a small fix.
- Flag data inconsistencies proactively, including ones in existing lessons.
- Keep explanations concise and technically precise. Numbers must be defensible: show where they come from.

## Commands

- Check every lesson: `node tools/verify.mjs` (must pass before any commit; CI runs it before deploy)
- Run locally: `python3 -m http.server 8000 -d site`, or open `site/index.html` directly
- Regenerate track outputs: see `tools/output-checks/` (needs pandas and openpyxl; track 6 needs the .NET 8 SDK)
- PLC outputs: `node tools/output-checks/plc/run.mjs` runs every ladder and Structured Text lesson's `sim` scenario through the PLC interpreter and writes its `out`; `--check` reports stale ones. The verifier also runs them, plus `tools/plc-tests.mjs`.
- Foundations outputs: `node tools/output-checks/foundations/run.mjs` runs every Python, JavaScript, C#, C++, Java and SQL Foundations lesson and writes its `out`; `--check` reports stale ones. Run it after editing any of those lessons. SQL runs on a real SQL Server 2022 (Docker container; set `BC_SQL_PASSWORD`, needs `pip install pymssql`) against a fresh copy of the canonical sample database each time; see `sql_exec.py`.
- MES Helper track: edit `tools/output-checks/track6-mes/lessons6.py`, then `python3 build6.py` there. It compiles and runs the C# and writes `site/data/tracks/06-mes.js`. Do not edit the JS file by hand.
- Eye Counter track (C++): `node tools/output-checks/track9-eye/run.mjs` compiles each step with all earlier steps and that step's test `main` (kept in the script), runs it and writes its `out`; `--check` reports stale ones.
- ERP Export track (Java): `node tools/output-checks/track10-erp/run.mjs`, the same approach as Eye Counter: each step compiled with the earlier steps, its test `main` and a closing brace.
- Ignition outputs: `bash tools/output-checks/ignition/fetch.sh` once, then `node tools/output-checks/ignition/run.mjs` (`--check`, `--only=<title>`). Runs every Ignition script and expression lesson in real Jython 2.7 with a teaching model of `system.*`; database lessons need `BC_SQL_PASSWORD` and the SQL Server container. Scenarios are in `scenarios.mjs`. Semantics and limits: `docs/IGNITION_SIM.md`.
- Downtime Entry track: `node tools/output-checks/track7-downtime/run.mjs` builds each JavaScript step's page in Chromium (Playwright), drives it with the scenarios in that file and writes its `out`; `--check` reports stale ones.

## Architecture

Scripts load in the order listed in `site/index.html`:

1. `js/registry.js` creates `globalThis.BC` with `addLanguage`, `addLane`, `addTrack`.
2. `js/core.js` exposes `BCcore`: tokenizer, seeded RNG for blackout masks, and `analyzeText(text, targetLines, py)`, which grades typed text line by line. The verifier uses the same file, so grading in CI matches grading in the browser.
   `js/plc.js` exposes `BCplc`: ladder and Structured Text parsers and a Logix-style scan interpreter (no DOM). The diagram, the verifier and the ladder output tool all use it. Semantics and limits: `docs/PLC_INTERPRETER.md`.
3. `data/languages.js`, then every file in `data/foundations/` and `data/tracks/`. A new data file must be added to `index.html`; the verifier fails if it is not.
4. `js/app.js`: the engine. One IIFE, plain DOM code, sectioned by `/* ---------- name ---------- */` comments.

Key engine behaviors:

- **Ranks**: the `RANKS` table in `app.js` sets the share of words (`w`) and symbols (`s`) masked and whether live coloring is on. Masks are seeded by lane id + lesson title, so they are stable between attempts.
- **Grading**: a line completes on an exact match or a matching token signature (whitespace-insensitive). Indentation is graded only for languages with `py: true`.
- **Track context**: earlier steps with the same `file` value show as locked, dimmed code above both panels; the learner types only the new lines.
- **Previews**: `preview: true` languages render in a shadow-DOM preview. In a track, all earlier HTML/CSS/JS steps are concatenated so the page builds up step by step. A CSS lesson in a lane styles the sample markup in its own `html` field. The learner's own JavaScript runs only on completion or Check, never while typing. `fetch` is blocked in the preview and intervals are clamped to at least 1 s.
- **Ladder**: `diagram: true` draws the typed rungs as an SVG ladder diagram, using `BCplc.parseRung`. Ladder outputs come from `sim` scenarios run in the interpreter, never typed by hand.
- **Simulator**: every ladder or Structured Text lesson with a `sim` gets a Simulate panel (`/* PLC simulator */` in `app.js`). It runs the learner's own code only after the step is finished or Check is pressed, with inputs from the scenario. `sim.scene` adds a machine from `SCENES` (`conveyor3`, `air1`, `char2`; see LESSON_FORMAT). "Compare with the reference" runs the scenario on the learner's code and the lesson's code. Energized paths use the `power` map from `BCplc`.
- **Progress**: `localStorage` key `blackout-coder-v1`, per lane/track id. Best scores are keyed by lesson **title**, so titles must be unique within a lane or track.

## Content conventions

- **PLC ladder**: Rockwell neutral text with spaces between instructions, e.g. `XIC(A) XIO(B) OTE(C);`. Branches use `BST … NXB … BND`.
- **Structured Text**: Studio 5000 style (`:=`, `TONR` with FBD_TIMER, `END_IF;`).
- **Ignition scripts**: Jython 2.7. No f-strings, and `print(...)` takes one argument (in 2.7, `print("a", b)` prints a tuple); the verifier refuses both. Whole-number `/` drops the remainder. `system.tag.readBlocking`, `system.db.runPrepUpdate` with `?` parameters, timestamps passed from `system.date.now()`.
- **SQL**: T-SQL (SQL Server). Parameterized `?` placeholders when called from Python, named `@name` parameters from C#.
- **C#**: .NET 8, top-level statements in `Program.cs`, nullable enabled, `Microsoft.Data.SqlClient` 7.1.1. Typed `SqlDbType` parameters, `using` on connections, writes inside a transaction. The verifier compiles every C# lesson; C++ (g++, C++17) and Java lessons are compiled too.
- **Python**: pandas + pyodbc + openpyxl. Never paste values into SQL text; pass parameters.
- **JavaScript**: two language modes. `js` is page JavaScript with a live preview (Plant Board track); `jscon` is console JavaScript run in Node, with `console.log` output (Foundations lane). Use `jscon` for anything that does not touch a page.
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
- **Shift Handoff**: shift A, 2026-11-07 06:00–14:00, run at 14:05. Barrels 301 / 352 / 274. Status DOWN (open char flare) / OK / BEHIND. Faults this shift: 5. The first two (Conveyor 3 jam 09:08:52, Hoop Driver 1 misfeed 10:09:40) are the same `fault_log` records DB Pulls ends on; the misfeed, open at 10:15 there, closes at 10:17:10. Down minutes 18.75 / 4.62 / 41.00, clipped to the shift window (the open char flare has been down 23.75 min at 14:05, but stops counting for shift A at 14:00). The fault list still shows 23.75 as time down so far.
- **Plant Board**: reuses the OEE, Pareto and handoff numbers above. Biggest gap to 85%: Hoop Driver 1, 12.1 pts.
- **Foundations**: every language uses the same sample numbers, so a learner sees the same answer in each. OEE examples use Hoop Driver 1's weekly factors 0.988 / 0.749 / 0.985 (72.9%; Char Station 2's 0.860 is the world-class example). Loops sum its shift A fault minutes 7.5 + 18.5 + 15.0 = 41. Quality examples use its 6,314 good of 6,410 (98.5%). Shift A barrels 301 / 352 / 274; Conveyor 3's shift target is 450 (60/hr × 7.5 paid hours).
- **MES Helper**: same shift A data as Shift Handoff, run at 2026-11-07T14:05. Down minutes clipped to the shift window, same as Shift Handoff: 18.75 / 4.62 / 41.00. 4 closed faults coded and posted, 1 open held back; a rerun posts 0. Reason codes and `mes_downtime_event` are illustrative, not a real MES schema.
- **AM Checklist**: Hoop Driver 1's daily AM sheet. Only the 85 to 110 psi air band, the area and the 55/hr rate are canonical; every other standard, tag number and revision is illustrative, and the page says so.
- **Eye Counter**: Conveyor 3's eye sampled every 10 ms (illustrative), 200 ms debounce (illustrative), jam after 4 s (the PLC track's rule). Test cycles are the ST history lesson's 61.2 / 59.8 / 64.0 / 60.4 / 60.6 s, giving about 58.7 barrels/hr against the ideal 60.
- **ERP Export**: shift A's rows from `shift_log.csv` (Conveyor 3 347/352, Hoop Driver 1 271/274, Char Station 2 310/301, the known bad row) plus one deliberately broken line. Exported: Conveyor 3 98 short, $4,165.00; Hoop Driver 1 138.5 short, $5,886.25; trailer total $10,051.25; 2 rows held back. Lost margin counts output shortfall only, at $42.50, rounded HALF_UP. Work-center codes, the 43-character layout and batch ids are illustrative.
- **Ignition**: tags at the handoff run time (2026-11-07 14:05) with shift A's values: counts 301 / 352 / 274, State 2 / 1 / 1 (Char Station 2's flare still open), Hoop Driver 1 air 92 psi, Conveyor 3 Speed_SP 60. Folder names (Conveyor3, HoopDriver1, CharStation2) are illustrative. The PLC track's jam is shift A's 09:08:52 to 09:13:29; its hourly snapshot logs 47 then 94 barrels (illustrative, at shift A's 46.9/hr). Database lessons use the canonical PlantDB, whose "now" is 10:15. Line Status Screen: OEE 0.738 (Conveyor 3's week), last fault ended 09:13:29, its Pareto query at 10:15 returns the canonical Pareto; the hourly rollover counts (65,500 → 11 → 58, 47 an hour) and colors are illustrative.
- **Downtime Entry**: manual stops the PLC cannot see, for shift A (06:00–14:00). The three logged in the outputs are illustrative and not in `fault_log`: Conveyor 3 changeover 07:30–07:45 (15 min), Hoop Driver 1 material 11:05–11:17 (12), Char Station 2 quality check 12:40–12:52 (12); 39 min in all. A stop crossing 14:00 is refused, matching the Shift Handoff clipping rule.

Known simplification worth keeping visible to learners: `fault_log` holds only PLC-detected jams, so availability runs about 99% and nearly all loss lands in performance. The lessons say so.

## Before you change things

- Run `node tools/verify.mjs` first to confirm a clean baseline.
- Changing a lesson title resets learners' saved best score for it.
- Changing a lane or track `id` resets all progress for it.
- After any engine change, test in a browser: type one Foundations lesson, one ladder step, and one Plant Board JavaScript step to completion, and check phone width for sideways scrolling.

See `docs/ROADMAP.md` for open work.
