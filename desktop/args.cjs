// Command-line switches of the desktop shell: one parser instead of loose
// process.argv scans. A switch is "--naam" or "--naam=waarde". Every function
// takes an optional argv (default process.argv), so the test can feed its own.

// the raw argument for --naam or --naam=waarde, or undefined
function findArg(name, argv = process.argv) {
  return argv.find((a) => a === name || a.startsWith(name + '='));
}

// true for --naam and for --naam=waarde
function hasFlag(name, argv = process.argv) {
  return findArg(name, argv) !== undefined;
}

// the text after --naam=, or null when the switch is absent or has no "="
// (everything after the first "=" counts, so a value may contain "=")
function argValue(name, argv = process.argv) {
  const a = argv.find((x) => x.startsWith(name + '='));
  return a ? a.slice(name.length + 1) : null;
}

// The text of a script file named by a switch (--bench-eval, --perf-script, --perf-exp), or null with a warning when it
// does not exist: a missing file must never be an uncaught exception in the main process (that opens an error dialog nobody
// can click away). A relative path is tried from the current folder, then from the repo root (`root`), because
// the desktop shell runs in desktop/ while the scripts are written as scripts/qa/x.js.
function readArgFile(file, what, root, fs = require('fs'), warn = (m) => console.warn(m)) {
  const path = require('path');
  const tries = path.isAbsolute(file) || !root ? [file] : [file, path.resolve(root, file)];
  for (const f of tries) {
    try { if (fs.existsSync(f) && fs.statSync(f).isFile()) return fs.readFileSync(f, 'utf8'); } catch (e) { /* unreadable: try the next, then warn */ }
  }
  warn(`[devtools] ${what}: bestand niet gevonden, overgeslagen: ${file}`);
  return null;
}

module.exports = { argValue, hasFlag, findArg, readArgFile };
