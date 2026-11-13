# Blackout Coder

A typing-tutor-style trainer that teaches coding by copying real plant code, then writing it yourself as more of it blacks out.

The goal sits in the top bar. The code to match is on the right; you type it on the left. At **Beginner** you copy every character. As you rank up through **Dabbler, Hobbyist, Student, Apprentice, Professional and Master**, more of the reference code is replaced with solid bars until you are writing from the goal alone. The bottom of the page explains what the code does and defines every command on screen.

## What's inside

**Foundations**: thirteen single-language lanes (Python, PLC ladder, SQL, C#, C++, Java, HTML, JavaScript, Structured Text, CSS, Ignition, DAX, Power Query M), 472 lessons.

**Projects**: thirty tracks, 477 steps, that build one connected system for a sample cooperage line:

| Track | Steps | Builds |
|---|---|---|
| PLC & HMI | 15 | Conveyor jam cell in ladder and Structured Text, Ignition tag and gateway scripts, an operator faceplate |
| DB Pulls & Analytics | 18 | Schema for the PLC logs, SQL from simple pulls to window functions, pandas analysis |
| OEE Loss Report | 16 | A/P/Q from one SQL query, losses in barrels and dollars, a formatted Excel report |
| Shift Handoff | 16 | Shift window logic, a generated one-page handoff, notes written back to SQL |
| Plant Board Page | 16 | A live line board in HTML, CSS and JavaScript |
| MES Helper | 17 | A .NET console tool in C#: PLC faults to coded MES downtime events, posted in one transaction, plus a shift summary and CSV |
| AM Checklist | 22 | A daily Autonomous Maintenance check sheet in HTML and CSS: CIL checklists, readings that flag out-of-range values, an abnormality tag, print styles |
| Eye Counter | 20 | Firmware-style C++ for a barrel counter on Conveyor 3's photo-eye: debounce, edge counting, a cycle-time ring buffer, jam detection, status bits, a serial line |
| ERP Export | 20 | A Java back-office job: shift counts to a fixed-width ERP file with header and trailer control totals, bad rows held back with reasons, safe to rerun |
| Line Status Screen | 15 | The Ignition logic behind Conveyor 3's operator screen: expression bindings for state, color, OEE and shift; scripts for fault logging by id, an interlocked reset, setpoints, an audit trail, the Pareto query and the shift change |
| TPM Loss Hunt | 15 | Python on the plant database: the six big losses, one cause across three machines, the OEE week rebuilt as a loss waterfall, a SMED study and a one-page A3 |
| Downtime Entry | 18 | An operator form for the stops the PLC never sees, in HTML, CSS and JavaScript: validation, a log table, totals and undo |
| High-Performance HMI | 18 | A Level 1 overview in HTML, CSS and JavaScript: a display hierarchy, grey for normal, analog indicators with a normal band, and ISA-18.2 alarms |
| Savings Tracker | 15 | Cost-savings projects from baseline to realized: weekly actuals, hard and soft savings, overlap, and a workbook with live totals |
| Takt and Line Balance | 14 | Takt, ideal and actual cycles, the bottleneck, a Yamazumi chart in Excel and a rebalance |
| Changeover / SMED | 14 | Conveyor 3's guide change from 15 to 6 minutes: internal and external work, a changeover log and the dollars |
| Procurement Spend | 14 | Spend cubes, price compliance, a three-way match and material cost per barrel from purchasing tables |
| OEE Report in Power BI | 16 | Power Query shaping and DAX measures that rebuild the OEE week, each held to SQL Server by a twin query |
| SPC and Control Charts | 14 | X-bar and R, I-MR and p charts on char depth and barrels, capability, and limits set from clean data |
| Automated Capture | 14 | PLC events to SQL through Ignition: cleaning glitches, late and duplicate rows, and an idempotent MERGE |
| Maintenance / CMMS | 14 | Work orders: MTBF, MTTR, PM compliance, the backlog and maintenance cost per barrel |
| Inventory / WIP | 14 | Stock moves: days of cover, safety stock, order-up-to levels, cash tied up and ABC |
| Kaizen / A3 | 14 | Hoop Driver 1's misfeeds through an A3: cause Pareto, before and after with an exact rate test, and the saving |
| Energy / Utilities | 14 | Compressed air and propane: specific power, an air balance, the leaks, and payback |
| S&OP / Capacity | 14 | Demand against capacity: the bottleneck, levers in good barrels and a level plan with stock |
| Lean Basics | 14 | WIP counts, Little's Law, a value stream timeline, standard work, 5S audits and an SQDC board |
| Barrel Cost Model | 18 | A standard cost per barrel by station: material, labour, maintenance, energy and overhead, what an OEE point does to cost and to cash, scrap and variances |
| Root Cause: Char Flares | 18 | A root cause analysis tested against the data: a fishbone as rows, causes rejected by test, a flame signal that finds the cause, a 5-Why chain and an action register |
| Heijunka and Scheduling | 15 | Levelling Conveyor 3's 53 and 30-gal mix: the changeover budget, EPEI, batch size against cycle stock, what a changeover really costs, a levelled pattern and board |
| Weekly Ops Review | 15 | The capstone: a weekly review pack from the plant's data and every track's results, with sources and as-of dates, an Excel one-pager and a PowerPoint deck built with python-pptx |

Three clean runs (90%+ accuracy, no peeks) at a rank unlock the next one. Each lane and track keeps its own rank. Progress saves in the browser, per device; Save progress and Load progress at the bottom of each lesson move it between devices as a JSON file.

**Daily drill** picks five lessons you have already typed to revisit, weakest and longest-untouched first, at most two from one lane or track. Each is typed at its lane's current rank and counts like any run. **How it connects** follows one problem (Hoop Driver 1's misfeeds, low air, the bottleneck, char flares, staves) through every track that works on it. Keyboard and screen readers work throughout: Escape then Tab leaves the editor, and blacked-out code reads as "blank".

## Run it locally

No build step and no install. Either:

- Open `site/index.html` in a browser, or
- Serve it: `python3 -m http.server 8000 -d site`, then open http://localhost:8000

## Publish on GitHub Pages

1. Create a repository on GitHub and push this folder to the `main` branch.
2. In the repository, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. The workflow in `.github/workflows/pages.yml` checks every lesson, then deploys `site/`. The site appears at `https://<your-username>.github.io/<repo-name>/`.

On a free GitHub account, Pages requires the repository to be public.

## Publish on GitLab Pages

1. Create a project on GitLab and push this folder to the `main` branch.
2. `.gitlab-ci.yml` runs the same lesson check on every merge request and on `main`, then publishes `site/` from `main`. No settings change is needed.
3. The site appears at `https://<your-username>.gitlab.io/<project-name>/`. The exact address is under **Deploy → Pages** in the project.

## Publish anywhere else

`site/` is plain static files with relative paths. Run `node tools/verify.mjs`, then upload the `site` folder to any static host (for example Netlify Drop or Cloudflare Pages direct upload).

## Add or change a lesson

1. Edit the lane or track file in `site/data/`. The format is in `docs/LESSON_FORMAT.md`.
2. Run `node tools/verify.mjs`. It checks that every lesson can be completed by typing its own code, that Python, JavaScript, C#, C++ and Java steps compile (C# needs the .NET 8 SDK, C++ needs g++, Java needs a JDK; a missing compiler skips its check with a warning), that titles are unique, and that every data file is loaded.
3. If the step shows output, regenerate it with the scripts in `tools/output-checks/` rather than typing it by hand. Ladder outputs come from a `sim` scenario run by `tools/output-checks/plc/run.mjs`. The MES Helper track is generated whole: edit `tools/output-checks/track6-mes/lessons6.py` and run `build6.py`.

## Repository layout

```
site/                 Everything that gets deployed
  index.html          Page shell; loads the scripts below in order
  css/app.css         All styles
  js/registry.js      BC.addLanguage / addLane / addTrack
  js/core.js          Pure tokenize/compare functions (shared with the verifier)
  js/app.js           The trainer engine
  data/languages.js   Language modes
  data/foundations/   One file per Foundations lane
  data/tracks/        One file per project track
tools/verify.mjs      Lesson checker, run in CI before every deploy
tools/output-checks/  Scripts that produce the "What it produces" text for tracks 2–4
docs/                 Lesson format and roadmap
CLAUDE.md             Context for Claude Code
```

## Starting in Claude Code

Open this folder in Claude Code. It reads `CLAUDE.md` automatically. A good first prompt:

> Read CLAUDE.md and docs/ROADMAP.md, run `node tools/verify.mjs`, then help me create a GitHub repo for this folder, push it, and confirm the Pages deploy. Don't change any lesson content yet.

## License

MIT. See `LICENSE`.
