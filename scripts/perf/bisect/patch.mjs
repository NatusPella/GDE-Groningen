// harness-only patch in a throwaway tag checkout: GDE_TEST_PROFILE may be an absolute path
// usage: node patch.mjs <name>...
import fs from 'node:fs';
import path from 'node:path';
const B = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ''));
for (const v of process.argv.slice(2)) {
  const f = path.join(B, 't' + v, 'desktop', 'main.js');
  let s = fs.readFileSync(f, 'utf8');
  if (/path\.isAbsolute\(process\.env\.GDE_TEST_PROFILE/.test(s)) { console.log(v, 'already ok'); continue; }
  const re = /path\.join\(require\('os'\)\.tmpdir\(\), process\.env\.GDE_TEST_PROFILE \|\| 'gde-test-profile'\)/;
  if (re.test(s)) { s = s.replace(re, "(path.isAbsolute(process.env.GDE_TEST_PROFILE || '') ? process.env.GDE_TEST_PROFILE : path.join(require('os').tmpdir(), process.env.GDE_TEST_PROFILE || 'gde-test-profile'))"); fs.writeFileSync(f, s); console.log(v, 'patched'); } else console.log(v, 'no match');
}
