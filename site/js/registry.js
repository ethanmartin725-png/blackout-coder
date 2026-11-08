// Lesson registry. Data files in site/data call these; app.js reads BC after they load.
(function (g) {
  const BC = g.BC = g.BC || { languages: {}, lanes: [], tracks: [] };
  BC.addLanguage = (id, def) => { BC.languages[id] = Object.assign({ id }, def); };
  BC.addLane = (lane) => { BC.lanes.push(lane); };
  BC.addTrack = (track) => { BC.tracks.push(track); };
})(globalThis);
