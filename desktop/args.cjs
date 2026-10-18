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

module.exports = { argValue, hasFlag, findArg };
