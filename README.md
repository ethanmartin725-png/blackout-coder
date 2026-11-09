# Blackout Coder

A typing-tutor-style trainer that teaches coding by copying real plant code, then writing it yourself as more of it blacks out.

The goal sits in the top bar. The code to match is on the right; you type it on the left. At **Beginner** you copy every character. As you rank up through **Dabbler, Hobbyist, Student, Apprentice, Professional and Master**, more of the reference code is replaced with solid bars until you are writing from the goal alone. The bottom of the page explains what the code does and defines every command on screen.

## What's inside

**Foundations**: nine single-language lanes (Python, PLC ladder, SQL, C#, C++, Java, HTML, JavaScript, Structured Text), 145 lessons.

**Projects**: six tracks, 98 steps, that build one connected system for a sample cooperage line:

| Track | Steps | Builds |
|---|---|---|
| PLC & HMI | 15 | Conveyor jam cell in ladder and Structured Text, Ignition tag and gateway scripts, an operator faceplate |
| DB Pulls & Analytics | 18 | Schema for the PLC logs, SQL from simple pulls to window functions, pandas analysis |
| OEE Loss Report | 16 | A/P/Q from one SQL query, losses in barrels and dollars, a formatted Excel report |
| Shift Handoff | 16 | Shift window logic, a generated one-page handoff, notes written back to SQL |
| Plant Board Page | 16 | A live line board in HTML, CSS and JavaScript |
| MES Helper | 17 | A .NET console tool in C#: PLC faults to coded MES downtime events, posted in one transaction, plus a shift summary and CSV |

Three clean runs (90%+ accuracy, no peeks) at a rank unlock the next one. Each lane and track keeps its own rank. Progress saves in the browser, per device.

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
