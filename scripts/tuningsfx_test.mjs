// Geluid van de pimp-werkplaats en de kapper (game/js/tuningsfx.js, epic Autotuning ronde 4, #1155): welk geluid bij welke wissel, de terugval als
// sfxEvent ontbreekt, nooit een fout, en de uitleg per categorie (showroomplan.js). Pure test.
import fs from 'node:fs';
import { CHANGE_SFX, installSfx, hairSfx, play, playChange, playInstall, playHair, sfxForChange } from '../game/js/tuningsfx.js';
import { CATEGORY_BLURB, blurbOf, TAB_ICON } from '../game/js/showroomplan.js';
import { navIndex } from '../game/js/listnav.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };

// de tabel: elke categorie van de werkplaats heeft een geluid, en de drie die de eigenaar noemde zitten erin
ok(sfxForChange('lak') === 'spray_can' && sfxForChange('velgen') === 'wrench_ratchet' && sfxForChange('onderdelen') === 'impact_wrench' && sfxForChange('licht') === 'neon_buzz_on', 'spuitbus, ratel, slagmoersleutel en neon');
ok(sfxForChange('bestaatniet') === null, 'onbekende categorie: stil');
for (const id of Object.keys(TAB_ICON).filter((t) => t !== 'builds')) ok(!!CHANGE_SFX[id], 'elke categorie klinkt', id);
const sfxmap = new URL('../game/js/sfx/sfxmap.js', import.meta.url);
if (fs.existsSync(sfxmap)) {
  const src = fs.readFileSync(sfxmap, 'utf8');
  for (const k of new Set([...Object.values(CHANGE_SFX), 'hairdryer_blast', 'hair_clipper', 'scissors_snip'])) ok(src.includes(`'${k}'`), 'de sleutel staat in de centrale tabel', k);
}

// installeren
ok(installSfx(['body']).join() === 'spray_can', 'alleen lak: spuitbus');
ok(installSfx(['glow']).join() === 'neon_buzz_on', 'alleen underglow: neon');
ok(installSfx(['spoiler']).join() === 'wrench_ratchet', 'een spoiler: ratel');
ok(installSfx([], true).join() === 'impact_wrench', 'onderdelen: slagmoersleutel');
ok(installSfx(['body', 'rimStyle'], true).join() === 'impact_wrench,spray_can,wrench_ratchet', 'lak, velgen en onderdelen: alle drie');
ok(installSfx([]).join() === 'wrench_ratchet', 'zonder velden: de ratel (niet stil)');

// kapper
ok(hairSfx('bob') === 'scissors_snip' && hairSfx('bald') === 'hair_clipper' && hairSfx('buzz') === 'hair_clipper' && hairSfx('bob', true) === 'hairdryer_blast', 'schaar, tondeuse en föhn');

// afspelen: de terugval op een audio-gebeurtenis in de rij, en nooit een fout
const w = { audioEvents: [] };
const queued = play(w, 'spray_can', 5, 6);
ok(queued === true && w.audioEvents.length === 1 && w.audioEvents[0].name === 'spray_can' && w.audioEvents[0].x === 5, 'een geluid komt in de rij', JSON.stringify(w.audioEvents));
ok(playChange(w, 'lak') === false || playChange(w, 'lak') === true, 'een wissel geeft een boolean');
ok(playChange(w, 'nietbestaand') === false, 'een onbekende categorie klinkt niet');
ok(play(null, 'spray_can') === false && play(w, '') === false && play({}, 'x', NaN, NaN) === false, 'zonder wereld of naam: niets en geen fout');
ok(typeof playInstall(w, ['body'], false) === 'boolean' && typeof playHair(w, 'bob', false) === 'boolean', 'install en kapper geven een boolean');
const full = { audioEvents: new Array(64).fill({}) };
ok(play(full, 'spray_can', 1, 1) === false, 'een volle rij: niets en geen fout');

// de uitleg per categorie
for (const id of Object.keys(TAB_ICON)) ok(blurbOf(id).length > 15 && blurbOf(id).length < 110, 'uitleg van redelijke lengte', id);
ok(blurbOf('nope') === '' && Object.keys(CATEGORY_BLURB).length >= Object.keys(TAB_ICON).length, 'onbekend: leeg');
const verboden = /\b(winter|sneeuw|bmw|audi|ford|volkswagen|mercedes|tesla)\b/i;
ok(Object.values(CATEGORY_BLURB).every((t) => !verboden.test(t)), 'geen merken of winter in de uitleg');

// navigatie (listnav.js) zoals de werkplaats hem gebruikt: rijen clampen, tabbladen wikkelen
ok(navIndex(5, 0, 'ArrowUp') === 0 && navIndex(5, 4, 'ArrowDown') === 4 && navIndex(5, 2, 'ArrowDown') === 3, 'rijen: aan de rand blijft staan');
ok(navIndex(5, 4, 'ArrowRight', { wrap: true }) === 0 && navIndex(5, 0, 'ArrowLeft', { wrap: true }) === 4, 'tabbladen: wikkelen');
ok(navIndex(6, -1, 'End') === 5 && navIndex(6, 3, 'Home') === 0 && navIndex(0, 0, 'Home') === -1, 'Home en End');

console.log(`tuningsfx_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
