// Streeksfeer (game/js/areamood.js): Waddenkust, Lauwersmeer en Veenkoloniën hebben een eigen licht, ook bij helder weer.
// Getoetst: de juiste plek krijgt de juiste sfeer, de Stad blijft zoals hij was, er is nergens een grens te zien
// (het gewicht is continu in de plek), de nevel is begrensd, de nacht blijft nacht, en het is altijd zomer.
//   node scripts/areamood_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MOOD_AREAS, MOOD_IDS, MOOD_LOOK, MOOD_HAZE_MAX, MOOD_EASE_S, areaMoodWeights, areaMoodId, areaMoodLook } from '../game/js/areamood.js';
import { wgsToWorld } from '../game/js/rdnew.js';
import { easeTo } from '../game/js/weersmooth.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, fails = 0;
const ok = (c, wat, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${wat}${info ? ' (' + info + ')' : ''}`); } };
const op = (lat, lon) => wgsToWorld(lat, lon);

// echte plekken (breedte, lengte) en de sfeer die er hoort
const PLEKKEN = [
  ['Grote Markt', 53.2187, 6.5675, ''],
  ['Haren', 53.17, 6.60, ''],
  ['Winsum', 53.33, 6.52, ''],
  ['Delfzijl', 53.33, 6.92, ''],
  ['Bourtange', 53.01, 7.19, ''],
  ['wad boven Pieterburen', 53.44, 6.45, 'wad'],
  ['Eemshaven', 53.44, 6.83, 'wad'],
  ['kwelder bij Uithuizen', 53.44, 6.67, 'wad'],
  ['Lauwersmeer', 53.36, 6.22, 'lauwers'],
  ['Veendam', 53.105, 6.875, 'veen'],
  ['Stadskanaal', 52.99, 6.95, 'veen'],
  ['Ter Apel', 52.875, 7.06, 'veen'],
];
for (const [naam, lat, lon, sfeer] of PLEKKEN) {
  const [x, y] = op(lat, lon);
  ok(areaMoodId(x, y) === sfeer, `${naam} heeft sfeer '${sfeer || 'geen'}'`, `kreeg '${areaMoodId(x, y)}' ${JSON.stringify(areaMoodWeights(x, y))}`);
}
// de Stad en een ruime kring eromheen: precies het oude beeld
{
  let schoon = true;
  for (let x = -9000; x <= 9000; x += 1500) for (let y = -9000; y <= 9000; y += 1500) {
    if (Math.hypot(x, y) > 9000) continue;
    const l = areaMoodLook(areaMoodWeights(x, y), 5);
    if (l.tint[0] !== 1 || l.tint[1] !== 1 || l.tint[2] !== 1 || l.haze !== 0 || l.glow !== 1) schoon = false;
  }
  ok(schoon, 'binnen 9 km van de Stad verandert er niets');
}
// Lauwersoog ligt aan het meer en aan het wad: beide tellen mee
{
  const w = areaMoodWeights(...op(53.405, 6.20));
  ok(w.wad > 0.3 && w.lauwers > 0.3, 'Lauwersoog mengt wad en meer', JSON.stringify(w));
}

// geen grens in beeld: over de hele provincie verandert elk gewicht hooguit 4 % per 100 m, en blijft binnen 0..1
{
  let ergste = 0, binnen = true;
  const a = {}, b = {};
  for (let x = -45000; x <= 50000; x += 900) for (let y = -32000; y <= 45000; y += 900) {
    areaMoodWeights(x, y, a);
    for (const [dx, dy] of [[100, 0], [0, 100]]) {
      areaMoodWeights(x + dx, y + dy, b);
      for (const id of MOOD_IDS) {
        ergste = Math.max(ergste, Math.abs(a[id] - b[id]));
        if (!(a[id] >= 0 && a[id] <= 1)) binnen = false;
      }
    }
  }
  ok(binnen, 'gewichten blijven tussen 0 en 1');
  ok(ergste < 0.04, 'geen sprong in het gewicht per 100 m', ergste.toFixed(4));
  console.log(`  grootste verandering per 100 m: ${(ergste * 100).toFixed(1)} %`);
}

// een onbruikbare plek geeft geen sfeer en geen NaN
{
  const w = areaMoodWeights(NaN, undefined);
  ok(w.wad === 0 && w.lauwers === 0 && w.veen === 0, 'een plek die geen getal is heeft geen sfeer');
  const l = areaMoodLook(null, NaN);
  ok(l.tint.every((v) => v === 1) && l.haze === 0 && l.glow === 1, 'zonder gewichten het oude beeld');
}

// de look: elke sfeer een eigen kleurrichting, begrensd, en sterker met een lage zon
const alleen = (id) => ({ wad: 0, lauwers: 0, veen: 0, [id]: 1 });
{
  const wad = areaMoodLook(alleen('wad'), 5), meer = areaMoodLook(alleen('lauwers'), 5), veen = areaMoodLook(alleen('veen'), 5);
  ok(wad.tint[2] > wad.tint[0], 'het wad is zilverblauw', wad.tint.join(' '));
  ok(meer.tint[1] > meer.tint[0] && meer.tint[1] > meer.tint[2], 'het Lauwersmeer is zacht groen', meer.tint.join(' '));
  ok(veen.tint[0] > veen.tint[2], 'de Veenkoloniën zijn warm amber', veen.tint.join(' '));
  ok(wad.glow > veen.glow && veen.glow >= 1, 'de gloed aan de horizon is aan het wad het sterkst');
  ok(wad.haze > meer.haze - 0.08 && wad.haze > veen.haze, 'de zoute nevel aan het wad is de dichtste van de drie overdag');
}
for (const id of MOOD_IDS) {
  const laag = areaMoodLook(alleen(id), 5, {}), hoog = areaMoodLook(alleen(id), 55, {}), nacht = areaMoodLook(alleen(id), -20, {});
  const afstand = (l) => Math.max(...l.tint.map((v) => Math.abs(v - 1)));
  ok(afstand(laag) > afstand(hoog) && afstand(hoog) > 0.02, `${id}: gouden uur sterker dan de middag, de middag nog zichtbaar`, `${afstand(laag).toFixed(3)} ${afstand(hoog).toFixed(3)}`);
  ok(afstand(nacht) < afstand(hoog), `${id}: de nacht blijft nacht`, afstand(nacht).toFixed(3));
  ok(Math.abs(afstand(laag) - Math.max(...MOOD_LOOK[id].tint.map((v) => Math.abs(v - 1)))) < 0.01, `${id}: met lage zon de tint uit de tabel`);
  // nooit een kleurzweem die de mist verkleurt tot iets anders: hooguit 15 % per kanaal
  for (let e = -30; e <= 62; e += 2) {
    const l = areaMoodLook(alleen(id), e, {});
    ok(l.tint.every((v) => v >= 0.85 && v <= 1.15) && l.haze >= 0 && l.haze <= MOOD_HAZE_MAX && l.glow >= 1 && l.glow <= 1.35, `${id}: begrensd bij zon ${e}`);
  }
  // altijd zomer: een sfeer maakt de lucht nooit grauw of koud-wit (de helderheid van de tint blijft binnen 4 %)
  const lum = 0.2126 * laag.tint[0] + 0.7152 * laag.tint[1] + 0.0722 * laag.tint[2];
  ok(Math.abs(lum - 1) < 0.04, `${id}: de tint is kleur, geen belichting`, lum.toFixed(3));
}
// het Lauwersmeer krijgt rond zonsopgang en -ondergang een dunne sluier
ok(areaMoodLook(alleen('lauwers'), 3, {}).haze > areaMoodLook(alleen('lauwers'), 50, {}).haze + 0.05, 'ochtendsluier boven het Lauwersmeer');
// stapelen blijft begrensd
ok(areaMoodLook({ wad: 1, lauwers: 1, veen: 1 }, 3, {}).haze === MOOD_HAZE_MAX, 'gestapelde nevel is begrensd');
// continu in de zonshoogte (geen sprong bij een dagdeel)
{
  let ergste = 0, prev = null;
  for (let e = -30; e <= 62; e += 0.25) {
    const l = areaMoodLook(alleen('veen'), e, {});
    if (prev) ergste = Math.max(ergste, Math.abs(l.tint[2] - prev.tint[2]), Math.abs(l.haze - prev.haze));
    prev = l;
  }
  ok(ergste < 0.01, 'geen sprong over de dag', ergste.toFixed(4));
}
// dezelfde uitvoer hergebruikt: geen nieuwe objecten per beeld
{
  const out = { tint: [1, 1, 1] }; const t = out.tint;
  ok(areaMoodLook(alleen('wad'), 10, out) === out && out.tint === t, 'de uitvoer wordt hergebruikt');
  const w = {}; ok(areaMoodWeights(0, 0, w) === w, 'de gewichten worden hergebruikt');
}
// een sprong in plek (snelreizen) schuift in ongeveer MOOD_EASE_S seconden mee, niet in een beeld
{
  let v = 0;
  v = easeTo(v, 1, 1 / 60, MOOD_EASE_S);
  ok(v < 0.01, 'een beeld na de sprong is er nog bijna niets veranderd', v.toFixed(4));
  for (let i = 0; i < 60 * MOOD_EASE_S * 3; i++) v = easeTo(v, 1, 1 / 60, MOOD_EASE_S);
  ok(v > 0.94, 'na drie tijdconstanten is de sfeer er', v.toFixed(3));
}

// de bedrading in weather.js: de plek van het eigen beeld (px, py), bestaande mist- en hemelkleuren, geen eigen mesh of licht
{
  const src = fs.readFileSync(path.join(ROOT, 'game/js/weather.js'), 'utf8');
  ok(/areaMoodWeights\(px, py, _moodTarget\)/.test(src), 'de sfeer volgt de plek van het eigen beeld, niet een vaste speler');
  ok(/scene\.fog\.color\.copy\(base\.fog\)\.multiply\(_moodTint\)/.test(src), 'de mistkleur krijgt de tint');
  ok(/u\.uHorizon\.value\.copy\(base\.horizon\)\.multiply\(_moodTint\)/.test(src), 'de horizon krijgt de tint');
  ok(/\* \(1 - _mood\.haze\)/.test(src), 'de nevel verkort het zicht');
  const mod = fs.readFileSync(path.join(ROOT, 'game/js/areamood.js'), 'utf8');
  ok(!/import /.test(mod), 'areamood.js is puur (geen imports, geen THREE)');
  ok(!/sneeuw|snow|ijs\b|frost|vorst|winter/i.test(mod), 'altijd zomer: geen winterwoord in de module');
}
ok(Object.keys(MOOD_AREAS).join() === MOOD_IDS.join() && Object.keys(MOOD_LOOK).join() === MOOD_IDS.join(), 'elke zone heeft een look');

// #1291 (hertest 24-11): de luchtkleur zelf (het zenit) verschilt per streek, niet alleen de nevel en de horizon
{
  const src = fs.readFileSync(path.join(ROOT, 'game/js/weather.js'), 'utf8');
  ok(/u\.uZenith\.value\.copy\(base\.zenith\)\.multiply\(_moodZenith\)/.test(src), 'het zenit krijgt de streektint');
  const k = Number((src.match(/MOOD_ZENITH_K = ([\d.]+)/) || [])[1]);
  ok(k > 0 && k < 1, 'zachter dan de horizon', String(k));
  const wad = areaMoodLook({ wad: 1 }, 2), veen = areaMoodLook({ veen: 1 }, 2);
  const zen = (l) => l.tint.map((t) => 1 + (t - 1) * k);
  ok(Math.abs(zen(wad)[2] - zen(veen)[2]) > 0.05, 'de avondlucht aan de Waddenkust is blauwer dan in de Veenkoloniën', JSON.stringify([zen(wad), zen(veen)]));
}

console.log(`areamood_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
