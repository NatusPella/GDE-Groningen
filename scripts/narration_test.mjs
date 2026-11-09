// Schermnarratie-wachtrij (#802):  node scripts/narration_test.mjs
import { createNarrator, NARRATION_GAP } from '../game/js/narration.js';

let fails = 0;
const ok = (c, name, extra) => { if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };

const n = createNarrator({ gap: 1.2, maxQueue: 4 });
ok(NARRATION_GAP === 1.2, 'de standaardafstand is 1,2 s');
ok(n.next(0) === null, 'lege wachtrij zegt niets');
ok(n.push('Doel: volg de route') === true, 'een bericht in de wachtrij');
ok(n.push('   ') === false && n.push('') === false, 'lege tekst telt niet');
ok(n.push('Doel: volg de route') === false, 'dezelfde tekst niet dubbel');
ok(n.next(0) === 'Doel: volg de route', 'meteen het eerste bericht');
ok(n.next(0.4) === null, 'binnen de afstand niets');
ok(n.next(1.2) === null, 'niets meer in de wachtrij');

n.push('Politie: 2 van 5 sterren');
n.push('Gezondheid laag', { important: true });
ok(n.next(2) === 'Gezondheid laag', 'belangrijk gaat voor');
ok(n.next(3.3) === 'Politie: 2 van 5 sterren', 'daarna het gewone bericht');
ok(n.next(9) === null, 'wachtrij leeg');

const vol = createNarrator({ gap: 0, maxQueue: 3 });
vol.push('een'); vol.push('twee'); vol.push('drie'); vol.push('vier');
ok(vol.size === 3, 'de wachtrij is begrensd', vol.size);
const rij = [vol.next(0), vol.next(0), vol.next(0)];
ok(rij.join(',') === 'een,twee,drie', 'de oudste blijven staan', rij);
ok(vol.size === 0, 'daarna leeg');

const herstart = createNarrator({ gap: 5 });
herstart.push('iets'); herstart.clear();
ok(herstart.next(100) === null && herstart.size === 0, 'clear() leegt alles');

console.log(fails ? `${fails} FAIL` : 'narration_test ok');
process.exit(fails ? 1 : 0);
