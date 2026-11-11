// Lesson registry. Data files in site/data call these; app.js reads BC after they load.
(function (g) {
  const BC = g.BC = g.BC || { languages: {}, lanes: [], tracks: [], glossary: {}, threads: [] };
  BC.addLanguage = (id, def) => { BC.languages[id] = Object.assign({ id }, def); };
  BC.addLane = (lane) => { BC.lanes.push(lane); };
  BC.addTrack = (track) => { BC.tracks.push(track); };
  // Glossary entries for the explain panel: [key, label, definition], per language id.
  // Threads for "How it connects": one problem followed across lanes and tracks (data/threads.js).
  BC.addThreads = (threads) => { BC.threads.push(...threads); };
  BC.addGlossary = (lang, entries) => { BC.glossary[lang] = (BC.glossary[lang] || []).concat(entries); };
})(globalThis);
