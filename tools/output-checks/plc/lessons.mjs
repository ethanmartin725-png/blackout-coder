// Shared by tools/verify.mjs and run.mjs: the PLC code a lesson's scenario runs.
// A Foundations lesson runs on its own. A track step runs together with every earlier step
// in the same routine (same `file` and language), the way the trainer shows them as context.
export const PLC_LANGS = ["ladder", "st"];

export function routineCode(group, index, isTrack) {
  const l = group.lessons[index];
  if (!isTrack) return l.code;
  return group.lessons
    .slice(0, index + 1)
    .filter((x) => x.lang === l.lang && x.file === l.file)
    .map((x) => x.code)
    .join("\n");
}
