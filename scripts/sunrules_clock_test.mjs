// Een onbruikbare klokstand (NaN of oneindig) mag het beeld niet zwart maken (#520).
//
// De melding: bij M02 bleef het 3D-beeld 3,9 s pikzwart terwijl de ondertitel gewoon
// doorliep, en daarna kwam het beeld hard terug. Een scene die niets tekent is het
// niet: scene.background staat vast op SKY_HORIZON, dus een lege frame is luchtblauw.
// Wat wel pikzwart wordt is het beeld als de belichting zelf niet klopt: exposure,
// zon, hemel, mist en de hemelkleuren komen allemaal uit computeLighting(hour) en
// worden met dezelfde t geinterpoleerd. Is hour geen getal, dan wordt die t NaN, en
// dan is elke kleur en de exposure NaN; de sanitize-shader maakt daar zwart van.
//
// Zo'n hour blijft ook hangen: NaN % 24 is nog steeds NaN, dus zolang niets anders de
// klok zet, blijft het beeld zwart. Daarom moet de uurregel zelf een onbruikbare
// waarde opvangen, en moeten beide funnels naar de belichting die regel gebruiken.
//   node scripts/sunrules_clock_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { wrapHour, sunElevationDeg, nightFactor, nightAtHour, isNightAtHour } from '../game/js/sunrules.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let n = 0, fails = 0;
const ok = (voorwaarde, wat, info = '') => { n++; if (!voorwaarde) { fails++; console.log(`FAIL ${wat}${info ? ' (' + info + ')' : ''}`); } };
const eindig = (v) => typeof v === 'number' && Number.isFinite(v);

// 1. een gewone klokstand blijft waar hij was (op de float-ruis van het wikkelen na,
//    die er voor deze wijziging ook al was: geen verschuiving van de zon)
for (const h of [0, 5.62, 12, 17.5, 23.999]) ok(Math.abs(wrapHour(h) - h) < 1e-9, `een geldige klokstand ${h} blijft staan`, String(wrapHour(h)));
ok(wrapHour(24) === 0, 'middernacht wikkelt naar 0');
ok(wrapHour(25.5) === 1.5, 'over middernacht wikkelt door');
ok(wrapHour(-1) === 23, 'een negatieve stand wikkelt naar de avond');

// 2. een onbruikbare stand wordt een geldig uur, geen NaN die blijft hangen
for (const h of [NaN, Infinity, -Infinity, undefined, null, 'het is avond']) {
  const w = wrapHour(h);
  ok(eindig(w) && w >= 0 && w < 24, `${String(h)} wordt een uur tussen 0 en 24`, String(w));
}
ok(wrapHour(NaN) === 12, 'NaN valt terug op 12:00 (dezelfde stand-in als dayState en de 3D-belichting)');

// 2b. en dat is echt het verschil: de oude wikkel liet de NaN door naar de interpolatie
const oudeWikkel = (h) => ((h % 24) + 24) % 24;
for (const h of [NaN, Infinity]) {
  const oud = Math.max(0, Math.min(1, (sunElevationDeg(oudeWikkel(h)) - 6) / (14 - 6)));
  const nieuw = Math.max(0, Math.min(1, (sunElevationDeg(wrapHour(h)) - 6) / (14 - 6)));
  ok(!eindig(oud), `de oude regel gaf een onbruikbare t voor ${String(h)} (dit is het gat)`, String(oud));
  ok(eindig(nieuw), `de nieuwe regel geeft een echte t voor ${String(h)}`, String(nieuw));
}

// 3. de kern van de belichting blijft eindig, dus exposure en kleuren ook
//    (dit is precies de interpolatie die computeLighting doet: t uit de zonshoogte)
for (const h of [NaN, Infinity, -Infinity]) {
  const hour = wrapHour(h);
  const elev = sunElevationDeg(hour);
  const t = Math.max(0, Math.min(1, (elev - 6) / (14 - 6)));
  ok(eindig(hour) && eindig(elev) && eindig(t), `de zonshoogte en t blijven eindig voor ${String(h)}`, `${hour}/${elev}/${t}`);
  ok(eindig(1.1 + (1.06 - 1.1) * t), `de exposure blijft eindig voor ${String(h)}`);
  ok(eindig(1 + (0.5 - 1) * t), `een kleurkanaal blijft eindig voor ${String(h)}`);
  ok(eindig(nightFactor(elev)), `de nachtfactor blijft eindig voor ${String(h)}`);
  ok(eindig(nightAtHour(h)), `nightAtHour blijft eindig voor ${String(h)}`);
  ok(isNightAtHour(h) === false, `een onbruikbare stand is geen nacht (${String(h)})`);
}

// 4. beide funnels naar de belichting gebruiken die regel: daynight.js kan niet
//    in Node geladen worden (three.js), dus dit toetst de bron, net als safety_cine_test
const bron = fs.readFileSync(path.join(ROOT, 'game', 'js', 'daynight.js'), 'utf8');
const body = (naam) => {
  const start = bron.indexOf(`export function ${naam}(`);
  const eind = bron.indexOf('\n}', start);
  return start > 0 && eind > start ? bron.slice(start, eind) : '';
};
const compute = body('computeLighting');
const refresh = body('refreshDayNight');
ok(compute.length > 0, 'computeLighting is te vinden');
ok(refresh.length > 0, 'refreshDayNight is te vinden');
ok(/hour = wrapHour\(hour\)/.test(compute), 'computeLighting haalt het uur door wrapHour');
ok(/const hour = wrapHour\(world\.clock\)/.test(refresh), 'refreshDayNight haalt de klok door wrapHour');
ok(!/\(\(hour % 24\) \+ 24\) % 24/.test(compute), 'de oude wikkel zonder vangnet staat niet meer in computeLighting');
ok(!/\(\(world\.clock % 24\) \+ 24\) % 24/.test(refresh), 'de oude wikkel zonder vangnet staat niet meer in refreshDayNight');

// 5. de 3D-laag blijft bij die ene functie: geen tweede belichtingspad dat eromheen gaat
const scene = fs.readFileSync(path.join(ROOT, 'game', 'js', 'scene3d.js'), 'utf8');
ok(/computeLighting\(/.test(scene), 'scene3d.js haalt de belichting uit computeLighting');
ok(/renderer\.toneMappingExposure = L\.exp/.test(scene), 'de exposure komt uit diezelfde L');

console.log(`sunrules_clock: ${n - fails}/${n} checks`);
process.exit(fails ? 1 : 0);
