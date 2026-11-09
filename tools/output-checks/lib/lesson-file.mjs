// Edit one lesson's generated fields in a site/data/*.js file, found by its title
// (titles are unique within a lane or track, and each file holds one lane or track).
// Used by foundations/run.mjs and plc/run.mjs.

export const tpl = (s) => "`" + s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${") + "`";

// [start, end) of one lesson's body: from its title line to just before its closing "    },".
// The end is searched from the terms block, because code samples can contain "    }," but terms cannot.
function lessonSpan(src, title) {
  const at = src.indexOf(`      t: ${JSON.stringify(title)},`);
  if (at < 0) throw new Error(`cannot find lesson "${title}" in source`);
  const terms = src.indexOf("\n      terms: [", at);
  const termsEnd = src.indexOf("\n      ],", terms);
  const end = src.indexOf("\n    },", termsEnd);
  if (terms < 0 || termsEnd < 0 || end < 0) throw new Error(`cannot find the end of lesson "${title}"`);
  return [at, end];
}

// Replace, add or (with null) remove the lesson's out field. It always goes last.
export function setOut(src, title, out) {
  const [at, end] = lessonSpan(src, title);
  let body = src.slice(at, end).replace(/\n      out: `(?:[^`\\]|\\.)*`,/, "");
  if (out !== null) body += `\n      out: ${tpl(out)},`;
  return src.slice(0, at) + body + src.slice(end);
}

// Replace, add or (with null) remove the lesson's sim field: one line of JSON, placed before out.
export function setSim(src, title, sim) {
  const [at, end] = lessonSpan(src, title);
  let body = src.slice(at, end).replace(/\n      sim: \{.*\},(?=\n)/, "");
  if (sim !== null) {
    const line = `\n      sim: ${JSON.stringify(sim)},`;
    const o = body.indexOf("\n      out: `");
    body = o < 0 ? body + line : body.slice(0, o) + line + body.slice(o);
  }
  return src.slice(0, at) + body + src.slice(end);
}
