// Pure grepen van de desktop-schil (#593): welke toetscombinaties de shell zelf
// afvangt, en of een app://-pad binnen de gamemap valt. Apart van main.js, zodat
// de regels zonder Electron te testen zijn.
const path = require('path');

// F12 en Ctrl+Shift+I openen de debugconsole. De aanroeper beslist of DevTools in
// deze build mogen (#593: alleen unpackaged of met GDE_DEV=1, net als devtools.js).
function devtoolsShortcut(input) {
  if (!input || input.type !== 'keyDown') return false;
  if (input.key === 'F12') return true;
  return !!(input.control && input.shift && String(input.key).toLowerCase() === 'i');
}

// Valt het bestand binnen de map? Ook als de mapnaam de prefix van een zustermap
// is: path.relative geeft '..' bij een buur, en dat is wat de oude startsWith miste
// (app://game/../game2/x werd zo toch geserveerd, #593).
function insideDir(dir, file) {
  const rel = path.relative(path.resolve(dir), path.resolve(file));
  return rel === '' || (rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel));
}

module.exports = { devtoolsShortcut, insideDir };
