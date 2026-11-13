// Regie/techniek #734: de open punten F6, F8, F9, F10, F12, F14, F15, F17, F19.
// De bron hoeft hiervoor niet in het spel te draaien: dit zijn structurele regels
// plus de pure camera- en keyfuncties.
//   node scripts/cinematics_regie_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };
const bron = (p) => fs.readFileSync(new URL(`../game/js/${p}`, import.meta.url), 'utf8');
const cin = bron('cinematics.js');

t('F6: de wijk wordt pas na een gelukte kaart als gezien gemarkeerd', () => {
  assert.match(cin, /wijkCand = null;\s*\n\s*if \(showWijkCard\(w, p\)\) markWijk\(p\);/);
});

t('F8: finish, begin en skipAll resetten de skip-hold', () => {
  assert.match(cin, /function resetSkip\(\)/);
  assert.match(cin, /resetSkip\(\);\s*\n\s*if \(voicePaused\)/); // finish
  assert.match(cin, /resetSkip\(\);\s*\n\s*const tiles = holdShotTiles/); // begin
  assert.match(cin, /resetSkip\(\);\s*\n\s*if \(voicePaused\) \{ resumeStoryVoice\(\); voicePaused = false; \}\s*\n\s*clearCinematicUi\(\);/, 'skipAll');
});

t('F9: elke wereldpauze bevriest de scène en de stem; de eigen cinematicPause niet', () => {
  assert.match(cin, /const wereldPauze = !!\(w && w\.paused && !w\.cinematicPause\)/);
  assert.match(cin, /const frozen = menuOpen \|\| hold \|\| wereldPauze/);
  assert.match(cin, /pauseStoryVoice\(\)/);
  assert.match(cin, /resumeStoryVoice\(\)/);
  assert.match(bron('audio.js'), /export function pauseStoryVoice\(\)/);
  assert.match(bron('audio.js'), /export function resumeStoryVoice\(\)/);
});

t('F10: één clearCinematicUi ruimt banner, chip, hide-vlaggen en timeScale op', () => {
  assert.match(cin, /function clearCinematicUi\(\)/);
  assert.match(cin, /banner = null;/);
  assert.match(cin, /world\.timeScale = 1;/);
  assert.match(cin, /world\.cinematicHidePlayers = false;/);
  assert.match(cin, /world\.cinematicHideNav = false;/);
  assert.match(cin, /clearCinematicUi\(\);/);
});

t('F12: de scène wacht kort op de shottegels', () => {
  assert.match(cin, /_tilesDone/);
  assert.match(cin, /Promise\.race\(/);
  assert.match(cin, /setTimeout\(resolve, 1500\)/);
});

t('F14: de landmark-orbit kadert de top met hoogte, look en fov', () => {
  assert.match(cin, /const lookY = h \* 0\.52/);
  assert.match(cin, /const height = h \* 0\.62 \+ 5/);
  assert.match(cin, /shot: orbitShot\(w, \{ fixed: lm, radius, height, lookY, sweep: 1\.3, start, fov \}\)/);
  assert.match(cin, /\.\.\.\(fov != null \? \{ fov \} : \{\}\)/);
});

t('F15: landmark, crash en wanted5 hebben een stem/mumble (ducking via voiced)', () => {
  for (const id of ['landmark', 'crash', 'wanted5']) {
    const start = cin.lastIndexOf(`id: '${id}'`);
    assert.ok(start > 0, id + ' bestaat');
    const blok = cin.slice(start, start + 1200);
    assert.match(blok, /mumble: true/, id + ' heeft mumble');
  }
  assert.match(cin, /active\.voiced = .* \|\| !!active\.mumble/);
});

t('F17: aria-live alleen op de ondertitel; reduced motion stopt de camerapaden', () => {
  assert.ok(!/root\.setAttribute\('aria-live'/.test(cin), 'niet meer op #cine-root');
  assert.match(cin, /sub\.setAttribute\('role', 'status'\)/);
  assert.match(cin, /sub\.setAttribute\('aria-atomic', 'true'\)/);
  assert.match(bron('camerapath.js'), /reducedMotion\(\) \? 0 : u/);
  assert.match(cin, /easeInOut\(reducedMotion\(\) \? 0 : u\)/);
});

t('F19: de wijkkaart stopt als de speler niet meer in die wijk staat', () => {
  assert.match(cin, /const hier = currentWijk\(w\);\s*\n\s*if \(!hier \|\| hier\.name !== wijk\.name\) return false;/);
});

t('F11: handgemaakte camera’s gaan door de fitCamera-env', () => {
  assert.match(cin, /function cameraFit\(w, shot\)/);
  assert.match(cin, /const env = \{ solid: \(x, y, z\) => roofAt\(w\.map, x, y\) > z - 0\.2 \}/);
  for (const id of ["id: 'mission-intro'", "id: 'mission-fail'", "id: 'death'", "id: 'crash'", "id: 'wanted5'"]) {
    const start = cin.indexOf(id);
    assert.ok(start > 0, id);
    assert.match(cin.slice(start, start + 400), /cameraFit\(w,/, id + ' gebruikt cameraFit');
  }
});

t('F16: de shotgrammatica is uitgebreid met de zeven ontbrekende soorten', () => {
  const cut = bron('cutscript.js');
  for (const s of ['close', 'reaction', 'ots', 'insert', 'tracking', 'crane', 'handheld']) assert.ok(new RegExp(`case '${s}'`).test(cut), s);
  assert.match(cut, /export const SHOTS = \[[^\]]*'close'[^\]]*'handheld'/);
});

// #738: de M00-opening hergebruikt de opgenomen trailer (zon, fietsers, meeuw
// met frikandel, werkboot, naam- en titelkaart) en speelt daarna keuken en
// verhuisdag uit cutscenes.js.
t('#738: de standaardopening speelt de trailer-montage; de montage-API blijft beschikbaar', () => {
  const story = bron('story.js');
  const intro = bron('intromontage.js');
  assert.match(story, /playTrailerMontage\(world/, 'de montage speelt de standaardopening');
  assert.match(story, /for \(const id of \['C00\.1', 'C00\.2', 'C00\.3'\]\)/);
  assert.match(intro, /export function playTrailerMontage/);
  assert.match(intro, /maxShots: 12/);
  for (const beeld of ['buildWetBike', 'buildFrikandel']) assert.ok(intro.includes(beeld), beeld);
  assert.match(intro, /const sun = \{/);
  assert.match(intro, /const boat = \{/);
  const cut = bron('cutscenes.js');
  assert.match(cut, /GDE, GRONINGEN, Zomer vol misdaad/);
  assert.match(cut, /text: 'Tessa'/);
  assert.match(cut, /text: 'Tammo'/);
});

// pure controle: een gebouw op 25% van het segment moet de keys liften
const { clearKeys } = await import('../game/js/camerapath.js');
const map = {
  buildingsNear(x, y) {
    const inBuilding = Math.abs(x - 25) < 4 && Math.abs(y - 0) < 4;
    return inBuilding ? [{ bounds: [21, -4, 29, 4], pts: [[21, -4], [29, -4], [29, 4], [21, 4]], h: 10 }] : [];
  },
};
const keys = [{ pos: { x: 0, y: 0, z: 2 }, look: { x: 0, y: 0, z: 1 } }, { pos: { x: 100, y: 0, z: 2 }, look: { x: 100, y: 0, z: 1 } }];
clearKeys({ map }, keys);
t('F11: een gebouw op een kwart van het pad telt mee', () => assert.ok(keys[0].pos.z > 20 && keys[1].pos.z > 20, JSON.stringify(keys.map((k) => k.pos.z))));

// reduced motion: het pad blijft op het eerste kader staan
globalThis.document = { documentElement: { classList: { contains: (c) => c === 'reduce-motion' } } };
const { pathShot } = await import('../game/js/camerapath.js');
const shot = pathShot([{ pos: { x: 0, y: 0, z: 0 }, look: { x: 0, y: 0, z: 0 } }, { pos: { x: 100, y: 0, z: 0 }, look: { x: 100, y: 0, z: 0 } }]);
t('F17: reduced motion houdt de camera stil', () => assert.equal(shot(1).position.x, 0));

console.log(`cinematics_regie_test: ${n}/${n} ok`);
