# Roadmap

## Launch

- [ ] Push to GitHub, enable Pages (Source: GitHub Actions), confirm the deploy.
- [x] License: MIT (`LICENSE`).
- [ ] Test on the devices friends will actually use: a Windows laptop in Chrome/Edge, an iPhone, an Android phone.
- [ ] Share the link and collect feedback through GitHub Issues (a lesson-problem template is in `.github/ISSUE_TEMPLATE/`).

## Next content

- [ ] Work C#, C++ and Java into a project track (agreed: Foundations first, then a track). Candidates: C# for a Windows-side MES helper (TrakSYS runs on .NET), C++ for an embedded sensor counter, Java for a back-office integration.
- [ ] HMI design principles as their own steps: ISA-101 alarm colors, layout hierarchy, operator-first faceplates.
- [ ] More Structured Text: CASE state machines, arrays, user-defined types.

## Engine

- [ ] Progress export/import as a JSON file, since progress lives in one browser.
- [ ] A per-lesson "explain this line" view for the line under the cursor.
- [ ] Optional sound effects (keystroke, error, lesson complete), off by default.
- [ ] Track completion summary page: accuracy and WPM trend per step.

## Known limitations

- The trainer checks typed code against the reference; it does not execute Python, SQL, C#, C++ or Java.
- The page preview cannot trigger the phone-layout media query in Plant Board step 7, because media queries follow the browser window, not the preview box.
- The learner's own JavaScript runs only when the step is finished or Check is pressed.
- The verifier compiles Ignition scripts as Python 3, but Ignition runs Jython 2.7. Avoid Python-3-only syntax such as f-strings in Ignition steps; the verifier will not catch it.
