// Regie-poorten (#732): een landmark-orbit of Ommelanden-scène zet de camera over en
// pauzeert de wereld, dus nooit midden in een race, in de lucht, in duifmodus of op
// snelheid. De regels staan puur in game/js/cutgates.js; cinematics.js leest ze bij
// beide momenten. Deze test doet de regels zelf en bewaakt de bedrading in de bron.
//   node scripts/cinematics_gates_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const G = await import(pathToFileURL(path.join(ROOT, 'game/js/cutgates.js')).href);
const bron = fs.readFileSync(path.join(ROOT, 'game/js/cinematics.js'), 'utf8');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ` (${info})` : ''}`); } };

// --- de poorten zelf
ok(G.MOMENT_MAX_SPEED === 12, 'de snelheidsdrempel is 12 m/s', String(G.MOMENT_MAX_SPEED));
const w = (o = {}) => ({ time: 100, ...o });
const auto = (speed) => ({ speed, isBoat: false });
ok(G.momentReason(w()) === '', 'een rustige speler op de grond: het moment mag');
ok(G.momentReason(null) === 'geen-world', 'zonder world geen scène');
ok(G.momentReason(w({ pigeonMode: true })) === 'duif', 'in duifmodus geen scène');
ok(G.momentReason(w({ race: { pos: 1 } })) === 'race', 'tijdens een race geen scène');
ok(G.momentReason(w({ wedstrijd: { actief: true } })) === 'wedstrijd', 'tijdens een wedstrijd geen scène');
ok(G.momentReason(w({ wedstrijd: { baam: true } })) === '', 'een lege wedstrijdstand telt niet', 'baam');
ok(G.momentReason(w({ wedstrijd: { baam: true } })) === '', 'een onbekend veld telt niet');
ok(G.momentReason(w({ wedstrijd: { baan: [1, 2] } })) === 'wedstrijd', 'een baan op de kaart telt als wedstrijd');
ok(G.momentReason(w(), { vehicle: auto(11.9) }) === '', 'net onder de drempel mag nog');
ok(G.momentReason(w(), { vehicle: auto(12.1) }) === 'snelheid', 'erboven wacht het moment');
ok(G.momentReason(w(), { vehicle: auto(-30) }) === 'snelheid', 'ook achteruit op snelheid');
ok(G.momentReason(w(), { vehicle: { speed: 0 } }) === '', 'stilstaan in de auto mag');
ok(G.momentReason(w(), { vehicle: auto(G.MOMENT_MAX_SPEED) }) === '', 'precies op de drempel mag');
ok(G.momentReason(w(), { vehicle: auto(20), speed: 30 }) === '', 'de drempel is per aanroep te verruimen');
ok(G.momentAllowed(w()) === true && G.momentAllowed(w({ pigeonMode: true })) === false, 'momentAllowed is dezelfde regel');

// --- de bedrading: beide momenten gebruiken de poort, en racen telt als bezig
const blok = (naam) => {
  const i = bron.indexOf(`function ${naam}(w)`);
  if (i < 0) return '';
  const j = bron.indexOf('\n}\n', i);
  return bron.slice(i, j > i ? j : i + 400);
};
for (const naam of ['checkLandmarks', 'checkOmmelanden']) {
  const b = blok(naam);
  ok(!!b, `${naam} staat in cinematics.js`);
  ok(/momentReason\(w, \{ vehicle: hoofdspeler\(w\)\.inVehicle \}\)/.test(b), `${naam} gebruikt de poort (duif/race/wedstrijd/snelheid)`);
}
ok(/playerBusy\(w, \['missionPhase', 'sideJob', 'challenge', 'activeRace'\]\)/.test(bron), 'een race telt als bezig voor alle momenten');
// #709: de wijk is een korte kaart met de highlights, geen flyover meer (de verover-intocht is het filmmoment)
ok(!/wijkFilm|playWijk|prepWijk/.test(bron), 'de wijkflyover is weg');
ok(/showWijkCard\(w, p\)/.test(bron), 'de wijkkaart gaat altijd af');
ok(/import \{ momentReason \} from '\.\/cutgates\.js';/.test(bron), 'cinematics laadt de poortregels');

console.log(fails ? `cinematics_gates_test: ${fails} van ${n} mislukt` : `cinematics_gates_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
