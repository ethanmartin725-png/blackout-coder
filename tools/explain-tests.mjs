// Tests for the explain panel's matcher in site/js/core.js (codeOnly, findKey, explainLine).
// Run by tools/verify.mjs; also runnable alone: node tools/explain-tests.mjs
// Returns a list of failure messages (empty when everything passes).

export function runExplainTests(C) {
  const fails = [];
  const t = (name, fn) => { try { const m = fn(); if (m) fails.push(`${name}: ${m}`); } catch (e) { fails.push(`${name}: threw ${e.message}`); } };
  const keys = (line, lang, terms, gloss) => C.explainLine(line, lang, terms, gloss, 9).map((e) => e.key).join(" ");

  t("whole words only", () => (C.findKey("in", "print(minutes)") === -1 && C.findKey("in", "for m in rows:") === 6 ? "" : "matched inside a word"));
  t("hyphens are part of a word", () => (C.findKey("color", "background-color: red;") === -1 && C.findKey("color", "color: red;") === 0 ? "" : "color matched background-color"));
  t("a method after a dot still matches", () => (C.findKey("append", "faults.append(x)") === 7 ? "" : "missed .append"));
  t("keys with symbols match as written", () => (C.findKey(":=", "Run := 1;") === 4 && C.findKey("<tr", "<tr><td>") === 0 && C.findKey("<tr", "<track>") === -1 ? "" : "symbol key"));
  t("a key named like a built-in property is not confused with it", () => (C.findKey("toString", "x.toString()") === 2 && C.findKey("constructor", "a b") === -1 ? "" : "cache returned a built-in"));
  t("words inside strings are not explained", () => (keys('print("for the shift")', "python", [], [["for", "for", "loop"], ["print", "print", "out"]]) === "print" ? "" : keys('print("for the shift")', "python", [], [["for", "for", "loop"], ["print", "print", "out"]])));
  t("an f-string keeps its opening quote, so f\" can match", () => (C.codeOnly('f"{x} in"', "python") === 'f"      "' ? "" : JSON.stringify(C.codeOnly('f"{x} in"', "python"))));
  t("comments are not explained", () => (keys("x = 1  # for later", "python", [], [["for", "for", "loop"]]) === "" && keys("-- SELECT", "sql", [], [["SELECT", "SELECT", "s"]]) === "" ? "" : "matched a comment"));
  t("C++ #include is not a comment", () => (keys("#include <iostream>", "cpp", [], [["#include", "#include", "i"]]) === "#include" ? "" : "lost #include"));
  t("HTML text with an apostrophe does not hide the tags after it", () => (keys("<p>Today's count</p><b>", "html", [], [["<b", "<b>", "bold"]]) === "<b" ? "" : "apostrophe swallowed the line"));
  t("order follows the line", () => (keys("SELECT a FROM t WHERE x", "sql", [], [["WHERE", "WHERE", "w"], ["SELECT", "SELECT", "s"], ["FROM", "FROM", "f"]]) === "SELECT FROM WHERE" ? "" : "out of order"));
  t("the lesson's term wins over the glossary for the same key", () => {
    const e = C.explainLine("XIC(A);", "ladder", [["XIC", "XIC", "lesson words"]], [["XIC", "XIC", "glossary words"]], 9);
    return e.length === 1 && e[0].src === "lesson" && e[0].def === "lesson words" ? "" : JSON.stringify(e);
  });
  t("a glossary entry with a lesson term's label is dropped", () => {
    const e = C.explainLine("XIC(T.DN);", "ladder", [["T.DN", ".DN", "lesson"]], [[".DN", ".DN", "glossary"], ["XIC", "XIC", "x"]], 9);
    return e.map((x) => x.src + ":" + x.label).join(" ") === "glossary:XIC lesson:.DN" ? "" : JSON.stringify(e);
  });
  t("two glossary keys with one label show once", () => (keys("IF a THEN", "st", [], [["IF", "IF … THEN", "i"], ["THEN", "IF … THEN", "i"]]) === "IF" ? "" : "shown twice"));
  t("a glossary word inside a lesson term adds nothing", () => (keys('print(f"x")', "python", [['print(f"', "print(f…)", "l"]], [["print", "print()", "g"]]) === 'print(f"' ? "" : "duplicate inside lesson term"));
  t("line enders show only when nothing else does", () => (keys("x = 1;", "jscon", [], [[";", ";", "end"], ["=", "=", "a", "="]]) === "=" && keys(";", "jscon", [], [[";", ";", "end"]]) === ";" ? "" : "filler handling"));
  t("a catch-all shows only when nothing specific matched", () => (keys("print(m)", "python", [], [["call", "Function call", "c", "^\\s*\\w+\\("], ["print", "print()", "p"]]) === "print" && keys("f(m)", "python", [], [["call", "Function call", "c", "^\\s*\\w+\\("], ["print", "print()", "p"]]) === "call" ? "" : "catch-all shown beside a specific entry"));
  t("a pattern entry matches by its pattern", () => (keys('  { name: "C3", rate: 60 },', "jscon", [], [["prop", "Property", "p", "^\\s*\\{?\\s*[A-Za-z_]\\w*\\s*:"]]) === "prop" ? "" : "pattern missed"));
  t("at most max entries", () => (C.explainLine("a b c d e f", "python", [], ["a", "b", "c", "d", "e", "f"].map((k) => [k, k, k]), 5).length === 5 ? "" : "no cap"));
  return fails;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { createRequire } = await import("node:module");
  const path = await import("node:path");
  const require = createRequire(import.meta.url);
  require(path.resolve(path.dirname(new URL(import.meta.url).pathname), "../site/js/core.js"));
  const fails = runExplainTests(globalThis.BCcore);
  for (const f of fails) console.error("FAIL  " + f);
  console.log(fails.length ? `${fails.length} explain test(s) failed` : "All explain tests pass");
  process.exit(fails.length ? 1 : 0);
}
