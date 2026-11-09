// Tests for the progress file functions in site/js/core.js (progressFile, readProgressFile,
// mergeProgress). Run by tools/verify.mjs; also runnable alone: node tools/progress-tests.mjs
// Returns a list of failure messages (empty when everything passes).

export function runProgressTests(C) {
  const fails = [];
  const t = (name, fn) => { try { const m = fn(); if (m) fails.push(`${name}: ${m}`); } catch (e) { fails.push(`${name}: threw ${e.message}`); } };
  const groups = [
    { id: "python", name: "Python", lessons: [{ t: "Print a message" }, { t: "Variables and math" }, { t: "Write a function" }] },
    { id: "t-plc", name: "PLC & HMI", lessons: [{ t: "Run permissive" }, { t: "Start/stop seal-in" }] },
  ];
  const read = (o) => C.readProgressFile(typeof o === "string" ? o : JSON.stringify(o), groups, 3, 6);
  const file = (progress, extra = {}) => ({ app: "blackout-coder", format: 1, exported: "2026-11-09T18:00:00Z", progress, ...extra });
  const py = (o = {}) => ({ lesson: 1, earned: 2, rank: 2, prog: 1, best: { "Print a message": { acc: 96, wpm: 41 } }, ...o });

  t("a file round-trips", () => {
    const per = { python: py() };
    const r = read(C.progressFile(per, "2026-11-09T18:00:00Z"));
    return r.ok && JSON.stringify(r.per) === JSON.stringify(per) && r.skipped.length === 0 ? "" : JSON.stringify(r);
  });
  t("not JSON is refused", () => (read("hello").ok ? "accepted" : ""));
  t("another app's JSON is refused", () => (read({ app: "other", format: 1, progress: {} }).ok ? "accepted" : ""));
  t("a newer format is refused", () => { const r = read(file({}, { format: 2 })); return !r.ok && /format 2/.test(r.error) ? "" : JSON.stringify(r); });
  t("rank above earned is refused", () => (read(file({ python: py({ rank: 3 }) })).ok ? "accepted" : ""));
  t("earned above Master is refused", () => (read(file({ python: py({ earned: 7, rank: 7 }) })).ok ? "accepted" : ""));
  t("progress past a promotion is refused", () => (read(file({ python: py({ prog: 3 }) })).ok ? "accepted" : ""));
  t("a damaged score is refused", () => (read(file({ python: py({ best: { "Print a message": { acc: 140, wpm: 1 } } }) })).ok ? "accepted" : ""));
  t("one damaged entry refuses the whole file", () => (read(file({ python: py(), "t-plc": { lesson: 0 } })).ok ? "accepted" : ""));
  t("unknown lanes are skipped, not refused", () => {
    const r = read(file({ python: py(), "t-gone": py() }));
    return r.ok && r.skipped.join() === "t-gone" && r.per.python ? "" : JSON.stringify(r);
  });
  t("scores for titles this version lacks are dropped", () => {
    const r = read(file({ python: py({ best: { "Print a message": { acc: 90, wpm: 30 }, "Renamed lesson": { acc: 99, wpm: 50 } } }) }));
    return r.ok && Object.keys(r.per.python.best).join() === "Print a message" ? "" : JSON.stringify(r.per);
  });
  t("a lesson position past the end is clamped", () => { const r = read(file({ python: py({ lesson: 40 }) })); return r.per.python.lesson === 2 ? "" : String(r.per.python.lesson); });

  t("merge: the higher rank wins, with its progress", () => {
    const m = C.mergeProgress({ python: py({ earned: 1, rank: 1, prog: 2 }) }, { python: py({ earned: 3, rank: 2, prog: 0 }) });
    const p = m.python;
    return p.earned === 3 && p.rank === 2 && p.prog === 0 ? "" : JSON.stringify(p);
  });
  t("merge: a lower rank does not demote", () => {
    const m = C.mergeProgress({ python: py({ earned: 4, rank: 4, prog: 0 }) }, { python: py({ earned: 1, rank: 1, prog: 2 }) });
    return m.python.earned === 4 && m.python.prog === 0 ? "" : JSON.stringify(m.python);
  });
  t("merge: same rank keeps the further progress", () => {
    const m = C.mergeProgress({ python: py({ prog: 0 }) }, { python: py({ prog: 2 }) });
    return m.python.prog === 2 ? "" : JSON.stringify(m.python);
  });
  t("merge: each lesson keeps its better score", () => {
    const cur = { python: py({ best: { "Print a message": { acc: 96, wpm: 41 }, "Variables and math": { acc: 88, wpm: 30 } } }) };
    const inc = { python: py({ best: { "Print a message": { acc: 92, wpm: 60 }, "Variables and math": { acc: 88, wpm: 35 }, "Write a function": { acc: 100, wpm: 20 } } }) };
    const b = C.mergeProgress(cur, inc).python.best;
    return b["Print a message"].acc === 96 && b["Variables and math"].wpm === 35 && b["Write a function"].acc === 100 ? "" : JSON.stringify(b);
  });
  t("merge: keeps this browser's lesson position", () => {
    const m = C.mergeProgress({ python: py({ lesson: 2 }) }, { python: py({ lesson: 0 }) });
    return m.python.lesson === 2 ? "" : String(m.python.lesson);
  });
  t("merge: adds lanes this browser has not started", () => {
    const m = C.mergeProgress({ python: py() }, { "t-plc": { lesson: 1, earned: 1, rank: 0, prog: 2, best: {} } });
    return m["t-plc"] && m["t-plc"].earned === 1 && m.python ? "" : JSON.stringify(m);
  });
  t("merge: does not change its inputs", () => {
    const cur = { python: py({ earned: 1, rank: 1 }) }, inc = { python: py({ earned: 3, rank: 3 }) }, before = JSON.stringify(cur);
    C.mergeProgress(cur, inc);
    return JSON.stringify(cur) === before ? "" : "current progress was modified";
  });

  // Scores with the rank they were typed at and the step's first run.
  t("record: the first run is kept as both best and first", () => {
    const best = {}; C.recordRun(best, "A", { acc: 84, wpm: 22, rank: 0 });
    return JSON.stringify(best.A) === JSON.stringify({ acc: 84, wpm: 22, rank: 0, first: { acc: 84, wpm: 22, rank: 0 } }) ? "" : JSON.stringify(best.A);
  });
  t("record: a better run replaces the best and keeps the first", () => {
    const best = {}; C.recordRun(best, "A", { acc: 84, wpm: 22, rank: 0 }); const r = C.recordRun(best, "A", { acc: 97, wpm: 30, rank: 1 });
    return r && best.A.acc === 97 && best.A.rank === 1 && best.A.first.acc === 84 ? "" : JSON.stringify(best.A);
  });
  t("record: equal accuracy and faster replaces the best (matches the merge)", () => {
    const best = { A: { acc: 96, wpm: 30 } }; const r = C.recordRun(best, "A", { acc: 96, wpm: 35, rank: 2 });
    return r && best.A.wpm === 35 ? "" : JSON.stringify(best.A);
  });
  t("record: a worse run changes nothing", () => {
    const best = { A: { acc: 96, wpm: 30, rank: 1, first: { acc: 80, wpm: 20, rank: 0 } } }, before = JSON.stringify(best);
    return !C.recordRun(best, "A", { acc: 96, wpm: 29, rank: 2 }) && JSON.stringify(best) === before ? "" : JSON.stringify(best);
  });
  t("record: an old score with no first run never gets one invented", () => {
    const best = { A: { acc: 90, wpm: 30 } }; C.recordRun(best, "A", { acc: 99, wpm: 31, rank: 1 });
    return best.A.first === undefined ? "" : JSON.stringify(best.A);
  });
  t("file: rank and first run round-trip", () => {
    const per = { python: py({ best: { "Print a message": { acc: 96, wpm: 41, rank: 2, first: { acc: 80, wpm: 25, rank: 0 } } } }) };
    const r = read(C.progressFile(per, "2026-11-09T18:00:00Z"));
    return r.ok && JSON.stringify(r.per) === JSON.stringify(per) ? "" : JSON.stringify(r);
  });
  t("file: a damaged first run is refused", () => (read(file({ python: py({ best: { "Print a message": { acc: 96, wpm: 41, first: { acc: 101, wpm: 3 } } } }) })).ok ? "accepted" : ""));
  t("file: a rank past Master is refused", () => (read(file({ python: py({ best: { "Print a message": { acc: 96, wpm: 41, rank: 7 } } }) })).ok ? "accepted" : ""));
  t("merge: the better score keeps this browser's first run", () => {
    const cur = { python: py({ best: { "Print a message": { acc: 90, wpm: 30, rank: 0, first: { acc: 70, wpm: 20, rank: 0 } } } }) };
    const inc = { python: py({ best: { "Print a message": { acc: 98, wpm: 40, rank: 3, first: { acc: 85, wpm: 28, rank: 1 } } } }) };
    const b = C.mergeProgress(cur, inc).python.best["Print a message"];
    return b.acc === 98 && b.rank === 3 && b.first.acc === 70 ? "" : JSON.stringify(b);
  });
  t("merge: a first run from the file fills one this browser lacks", () => {
    const cur = { python: py({ best: { "Print a message": { acc: 99, wpm: 50 } } }) };
    const inc = { python: py({ best: { "Print a message": { acc: 90, wpm: 30, first: { acc: 75, wpm: 22 } } } }) };
    const b = C.mergeProgress(cur, inc).python.best["Print a message"];
    return b.acc === 99 && b.first && b.first.acc === 75 ? "" : JSON.stringify(b);
  });

  // The summary page's numbers.
  const lessons = [{ t: "S1", lang: "html" }, { t: "S2", lang: "html" }, { t: "S3", lang: "css" }, { t: "S4", lang: "js" }, { t: "S5", lang: "html" }];
  const best = {
    S1: { acc: 100, wpm: 40, rank: 0, first: { acc: 92, wpm: 31, rank: 0 } },
    S2: { acc: 88, wpm: 36, rank: 0, first: { acc: 88, wpm: 36, rank: 0 } },
    S3: { acc: 95, wpm: 28 },
    S5: { acc: 88, wpm: 30, rank: 1, first: { acc: 70, wpm: 18, rank: 1 } },
  };
  const s = C.trackSummary(lessons, best);
  t("summary: counts steps done", () => (s.total === 5 && s.done === 4 ? "" : `${s.done} of ${s.total}`));
  t("summary: overall means over steps done", () => (s.overall.acc === 92.8 && s.overall.wpm === 34 ? "" : JSON.stringify(s.overall)));
  t("summary: language groups follow step order", () => {
    const g = s.groups.map((x) => `${x.lang}${x.from}-${x.to}`).join(" ");
    return g === "html0-1 css2-2 js3-3 html4-4" ? "" : g;
  });
  t("summary: per-language means, a language with nothing done has none", () => {
    const b = Object.fromEntries(s.byLang.map((x) => [x.lang, x]));
    return b.html.steps === 3 && b.html.done === 3 && b.html.acc === 92 && b.html.wpm === 35 && b.js.done === 0 && b.js.acc === null ? "" : JSON.stringify(s.byLang);
  });
  t("summary: first-to-best only where a first run exists", () => {
    const g = s.gains.map((x) => `${x.t}:${x.dAcc}/${x.dWpm}`).join(" ");
    return g === "S1:8/9 S2:0/0 S5:18/12" && s.noFirst === 1 ? "" : `${g} noFirst ${s.noFirst}`;
  });
  t("summary: revisit the lowest accuracy, then the slowest, never a perfect step", () => {
    const r = s.revisit.map((x) => x.t).join(" ");
    return r === "S5 S2 S3" ? "" : r;
  });
  t("summary: nothing done gives empty lists and no means", () => {
    const e = C.trackSummary(lessons, {});
    return e.done === 0 && e.overall.acc === null && e.revisit.length === 0 && e.gains.length === 0 ? "" : JSON.stringify(e.overall);
  });
  return fails;
}

// Standalone: node tools/progress-tests.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
  const { createRequire } = await import("node:module");
  const path = await import("node:path");
  const require = createRequire(import.meta.url);
  require(path.resolve(path.dirname(new URL(import.meta.url).pathname), "../site/js/core.js"));
  const fails = runProgressTests(globalThis.BCcore);
  for (const f of fails) console.error("FAIL  " + f);
  console.log(fails.length ? `${fails.length} progress test(s) failed` : "All progress tests pass");
  process.exit(fails.length ? 1 : 0);
}
