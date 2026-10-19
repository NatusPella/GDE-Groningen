// Opgevangen gebabbel (game/js/gebabbel.js, #190): dekking per streek x tijd x weer, herhaling, tekstregels.
import { GEBABBEL, AREAS, PARTS, WETS, partOf, wetOf, areaOf, gebabbelFor, rollGebabbel } from '../game/js/gebabbel.js';
import { WEATHER_KINDS } from '../game/js/weatherstate.js';
import { mulberry32 } from '../game/js/rng.js';
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };

ok(new Set(GEBABBEL.map((g) => g.id)).size === GEBABBEL.length, 'unieke id\'s');
for (const g of GEBABBEL) {
  ok(AREAS.includes(g.area) && (g.part === null || PARTS.includes(g.part)) && (g.wet === null || WETS.includes(g.wet)), 'geldige velden', g.id);
  ok(g.lines.length >= 1 && g.lines.length <= 3 && g.lines.every(([who, t]) => who && t && t.length <= 110), 'lengte', g.id);
  const text = g.lines.map((l) => l.join(' ')).join(' ');
  ok(!/de Grunn/i.test(text), 'Grunn, nooit "de Grunn"', g.id);
  ok(!/sneeuw|ijs\b|vorst|winter|kerst|schaatsen/i.test(text), 'altijd zomer', g.id);
  ok(!/\b(google|facebook|whatsapp|coca|albert heijn|jumbo|ikea|netflix|instagram|tiktok|mcdonald)/i.test(text), 'geen echte merken', g.id);
  ok(!/\b(hello|the|you|thanks)\b/i.test(text), 'Nederlands', g.id);
}
// dekking: elke streek heeft voor elk deel van de dag en elk weer minstens één gesprek
for (const a of AREAS) for (const p of PARTS) for (const w of WETS) ok(gebabbelFor(a, p, w).length >= 1, 'dekking', `${a} ${p} ${w}`);
// elke streek heeft eigen weerlijnen (regen, mist en onweer) en minstens 8 gesprekken
for (const a of AREAS) {
  ok(GEBABBEL.filter((g) => g.area === a).length >= 8, 'genoeg per streek', a);
  for (const w of ['regen', 'mist', 'onweer']) ok(GEBABBEL.some((g) => g.area === a && g.wet === w), 'weerlijn', `${a} ${w}`);
}
// hulpfuncties
ok(partOf(7) === 'ochtend' && partOf(13) === 'middag' && partOf(20) === 'avond' && partOf(2) === 'nacht' && partOf(26) === 'nacht', 'partOf');
ok(WEATHER_KINDS.every((k) => WETS.includes(wetOf(k))), 'wetOf dekt alle soorten');
ok(areaOf('hogeland', 0) === 'hogeland' && areaOf(null, 0) === 'stad' && areaOf('hogeland', -30000) === 'wadden' && areaOf('onzin') === 'stad', 'areaOf');
// herhaling: tien rolls achter elkaar op één plek geven niet twee keer hetzelfde als er keus is
for (const a of AREAS) for (const w of WETS) for (const p of PARTS) {
  const rng = mulberry32(a.length * 31 + w.length * 7 + p.length);
  const recent = [];
  let repeats = 0;
  for (let i = 0; i < 12; i++) {
    const g = rollGebabbel(a, p, w, rng, recent);
    ok(g && g.area === a, 'roll geeft gesprek', `${a} ${p} ${w}`);
    if (recent.includes(g.id) && gebabbelFor(a, p, w).length > recent.length) repeats++;
    recent.push(g.id); if (recent.length > 2) recent.shift();
  }
  ok(repeats === 0, 'geen herhaling met keus', `${a} ${p} ${w}`);
}
// variatie: bij regen in de stad komen meer dan één gesprek langs
const seen = new Set(); const r2 = mulberry32(3);
for (let i = 0; i < 60; i++) seen.add(rollGebabbel('stad', 'middag', 'regen', r2, []).id);
ok(seen.size >= 3, 'variatie', [...seen].join());
console.log(`gebabbel_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
