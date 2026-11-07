// #572: de release-documentatie en de versiebron moeten kloppen. Geen runtime,
// alleen de bestanden die een releaser leest.
//   node scripts/release_docs_test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };
const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

t('de changelog heeft een kloppende 0.56.2 en een eerlijke 0.56.1', () => {
  const c = read('CHANGELOG.md');
  assert.match(c, /## \[0\.56\.2\] - 2026-11-06/);
  assert.match(c, /0\.56\.1[\s\S]{0,500}teruggedraaid/i);
  assert.match(c, /## \[0\.56\.1\] - 2026-11-06[\s\S]{0,500}teruggedraaid/i);
  assert.match(c, /PERF-LAADHANG-0\.56\.1/);
});

t('RELEASEN.md noemt de huidige android-versiebron, niet de oude testwaarde', () => {
  const r = read('docs/RELEASEN.md');
  assert.match(r, /android\/scripts\/version\.mjs/);
  assert.match(r, /android\/version\.properties/);
  assert.ok(!/0\.35\.0-android-test/.test(r));
  assert.match(read('android/android/app/build.gradle'), /version\.properties|versionName.*version\.properties/);
});

t('de android-toolpakketversie loopt gelijk met de releaseversie', () => {
  const desktop = json('desktop/package.json').version;
  assert.equal(json('android/package.json').version, desktop);
  assert.equal(json('android/package-lock.json').version, desktop);
  assert.equal(json('android/package-lock.json').packages[''].version, desktop);
});

t('de releasecomment claimt geen immutable releases die uit staan', () => {
  const sh = read('desktop/release.sh');
  assert.match(sh, /immutable:false/);
  assert.ok(!/dan staan latere uploads en vervangingen niet meer toe/.test(sh));
});

console.log(`release_docs_test: ${n}/${n} ok`);
