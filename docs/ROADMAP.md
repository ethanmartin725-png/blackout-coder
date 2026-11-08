# Roadmap

## Launch

- [x] Push to GitHub, enable Pages (Source: GitHub Actions), confirm the deploy. Live at https://ethanmartin725-png.github.io/blackout-coder/
- [x] License: MIT (`LICENSE`).
- [ ] Test on the devices friends will actually use: a Windows laptop in Chrome/Edge, an iPhone, an Android phone.
- [ ] Share the link and collect feedback through GitHub Issues (a lesson-problem template is in `.github/ISSUE_TEMPLATE/`).

## Next content

- [x] C# project track: MES Helper (`t-mes`), 17 steps.
- [ ] C++ and Java project tracks. Candidates: C++ for an embedded sensor counter, Java for a back-office integration.
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

- The trainer checks typed code against the reference; it does not execute Python, SQL, C#, C++ or Java in the browser. The verifier compiles Python, JavaScript and C#; C++ and Java are not compiled yet.
- The page preview cannot trigger the phone-layout media query in Plant Board step 7, because media queries follow the browser window, not the preview box.
- The learner's own JavaScript runs only when the step is finished or Check is pressed.
- The verifier compiles Ignition scripts as Python 3, but Ignition runs Jython 2.7. Avoid Python-3-only syntax such as f-strings in Ignition steps; the verifier will not catch it.
