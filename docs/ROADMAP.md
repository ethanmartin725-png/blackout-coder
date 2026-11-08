# Roadmap

## Launch

- [x] Push to GitHub, enable Pages (Source: GitHub Actions), confirm the deploy. Live at https://ethanmartin725-png.github.io/blackout-coder/
- [x] License: MIT (`LICENSE`).
- [ ] Move hosting: the GitHub account was suspended on 2026-11-08 (appeal pending). `.gitlab-ci.yml` is ready for GitLab Pages; the GitHub workflow is kept in case access returns.
- [ ] Test on the devices friends will actually use: a Windows laptop in Chrome/Edge, an iPhone, an Android phone.
- [ ] Share the link and collect feedback through GitHub Issues (a lesson-problem template is in `.github/ISSUE_TEMPLATE/`).

## Next content

- [x] C# project track: MES Helper (`t-mes`), 17 steps.
- [ ] C++ and Java project tracks. Candidates: C++ for an embedded sensor counter, Java for a back-office integration.
- [x] Real outputs for the Python, C#, C++ and Java Foundations lessons (`tools/output-checks/foundations/run.mjs`).
- [ ] Foundations SQL outputs. The SQL lane uses its own tables (`fact_downtime`, `fact_oee_daily`, and a `dim_machine` keyed by `machine_id`) that conflict with the tracks' `dim_machine`. Move it onto the canonical tables first, then generate outputs from the seeded data.
- [ ] Move the Foundations examples onto the canonical machines (they use Line 1/2/3 and Jointer 2).
- [x] Ladder Foundations gap: 8 lessons added (TOF, RTO hour meter, LES with debounce, LIM, MOV/EQU, ONS with ADD, CPT rate, CTU/CTD WIP with an output branch). The diagram draws RTO, LIM, CPT, GEQ/LEQ and SUB/MUL/DIV.
- [ ] Close the remaining Foundations gaps before the tracks: SQL (NULLs, LEFT JOIN, dates, INSERT/UPDATE, CTE, window functions), Python (f-strings, comprehensions, try/except, datetime, defaults, pandas), and new JavaScript and Structured Text lanes.
- [ ] Many more lessons across every lane and track. Owner's goal: a large library, so keep new content on the canonical sample plant and generate outputs by running the code.
- [ ] HMI design principles as their own steps: ISA-101 alarm colors, layout hierarchy, operator-first faceplates.
- [ ] More Structured Text: CASE state machines, arrays, user-defined types.

## Engine

- [ ] Progress export/import as a JSON file, since progress lives in one browser.
- [ ] A per-lesson "explain this line" view for the line under the cursor.
- [ ] Optional sound effects (keystroke, error, lesson complete), off by default.
- [ ] Track completion summary page: accuracy and WPM trend per step.
- [ ] Ladder simulation: animate a small piece of equipment (e.g. the conveyor jam cell) driven by the learner's own typed ladder logic, so a rung change makes a visible difference. Needs a scan-cycle interpreter for the ladder subset the lessons use (XIC, XIO, OTE, OTL/OTU, TON, CTU, branches), simulated inputs the learner can toggle, and an equipment view bound to the tags.

## Known limitations

- The trainer checks typed code against the reference; it does not execute Python, SQL, C#, C++ or Java in the browser. The verifier compiles Python, JavaScript, C#, C++ and Java.
- PLC & HMI track outputs (ladder, Structured Text, Ignition) are hand-written scenario traces, because nothing here runs PLC logic. A ladder interpreter in `js/core.js` would let the verifier generate them, and is the first piece of the ladder simulation.
- The page preview cannot trigger the phone-layout media query in Plant Board step 7, because media queries follow the browser window, not the preview box.
- The learner's own JavaScript runs only when the step is finished or Check is pressed.
- The verifier compiles Ignition scripts as Python 3, but Ignition runs Jython 2.7. Avoid Python-3-only syntax such as f-strings in Ignition steps; the verifier will not catch it.
