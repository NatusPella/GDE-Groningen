// Pure regels voor GPU- en renderproces-meldingen van Electron (los van main.js,
// zodat ze zonder Electron te testen zijn). Een GPU-proces dat wegvalt laat de
// pagina een verloren WebGL-context zien (game/js/gpuherstel.js herstelt die
// zacht); een renderproces dat wegvalt laadt de pagina hoogstens twee keer per minuut opnieuw.

// details.reason: https://www.electronjs.org/docs/latest/api/structures/render-process-gone-details
function describeGone(kind, details) {
  const d = details || {};
  const reason = String(d.reason || 'onbekend');
  if (reason === 'clean-exit') return null;
  const code = d.exitCode !== undefined ? `, code ${d.exitCode}` : '';
  if (kind === 'child') {
    if (d.type && d.type !== 'GPU') return null; // alleen het GPU-proces zegt iets over het beeld
    return `GPU-proces weggevallen (${reason}${code})`;
  }
  return `Renderproces weggevallen (${reason}${code})`;
}

// Een renderproces dat telkens opnieuw valt, mag geen herlaadlus worden.
function reloadAllowed(history, nowMs) {
  const recent = history.filter((t) => nowMs - t < 60000);
  return { ok: recent.length < 2, history: recent };
}

module.exports = { describeGone, reloadAllowed };
