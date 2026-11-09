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
