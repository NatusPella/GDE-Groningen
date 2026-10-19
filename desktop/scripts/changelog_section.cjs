// Prints the notes of one version from ../CHANGELOG.md (the lines under "## [X.Y.Z]" up to the next
// "## [" heading), for release.sh. Empty when there is no such section.
//   node scripts/changelog_section.cjs 0.36.0
const fs = require('fs');
const path = require('path');

function section(text, version) {
  const lines = text.split(/\r?\n/);
  const from = lines.findIndex((l) => l.startsWith('## [' + version + ']'));
  if (from < 0) return '';
  let to = lines.findIndex((l, i) => i > from && l.startsWith('## ['));
  if (to < 0) to = lines.length;
  return lines.slice(from + 1, to).join('\n').trim();
}

module.exports = { section };
if (require.main === module) {
  process.stdout.write(section(fs.readFileSync(path.join(__dirname, '..', '..', 'CHANGELOG.md'), 'utf8'), process.argv[2] || ''));
}
