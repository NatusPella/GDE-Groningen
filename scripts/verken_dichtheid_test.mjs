// #807: de verkenlaag van de provincie toetsen op de bestaande data.
// - per streek één uitkijkpunt (MENU_PLEKKEN of landmarkkits);
// - het album: aantallen kerk/molen/borg per streek;
// - langs de reisbeats: de grootste afstand tot het eerstvolgende herkenningspunt, als ratchet.
// Wat deze test niet kan: de echte route over de weg (we nemen de rechte lijn tussen de
// eindpunten; de volgende stap is de routepunten uit de kaart halen).
//   node scripts/verken_dichtheid_test.mjs
import fs from 'node:fs';
import { uitkijkpunten, albumStand, installeerUitkijkpunten } from '../game/js/verkenpunten.js';
import { mapCategory, mapPriority } from '../game/js/mapicons.js';
import { MENU_PLEKKEN } from '../game/js/menuplekken.js';
import { STREKEN, streekAt } from '../game/js/regioleven.js';
import { REISBEATS } from '../game/js/reisbeats.js';

let n = 0, fails = 0;
const ok = (c, naam, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', naam, extra); } };
const kits = JSON.parse(fs.readFileSync(new URL('../game/landmarkkits.json', import.meta.url), 'utf8')).items;
const dest = kits.filter((k) => Number.isFinite(k.x) && Number.isFinite(k.y));

// 1. Per streek een uitkijkpunt, zonder nieuwe data.
const punten = uitkijkpunten(kits, MENU_PLEKKEN, STREKEN);
ok(punten.length === STREKEN.length, 'elke streek heeft een uitkijkpunt', String(punten.length));
ok(STREKEN.every((s) => punten.some((p) => p.streek === s.id)), 'geen streek overgeslagen');
ok(punten.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.naam), 'uitkijkpunten hebben een naam en een plek');
ok(punten.some((p) => p.bron === 'menuplek'), 'bestaande menupiek gebruikt');

// 1b. Dezelfde acht punten als kaartlaag (#807 A15): op de kaart, zonder nieuwe data.
{
  const map = { meta: {} };
  const gezet = installeerUitkijkpunten(map, kits, { plekken: MENU_PLEKKEN, streken: STREKEN });
  ok(map.meta.uitkijkpunten === gezet && gezet.length === STREKEN.length, 'de kaartlaag krijgt één uitkijkpunt per streek', String(gezet.length));
  ok(new Set(gezet.map((p) => p.streek)).size === STREKEN.length, 'geen dubbele streek in de kaartlaag');
  ok(gezet.every((p) => p.naam && /^[A-Z]/.test(p.naam) && !p.naam.includes('-')), 'leesbare namen uit bestaande ids', gezet.map((p) => p.naam).join(', '));
  ok(gezet.every((p) => p.streekNaam && Number.isFinite(p.x) && Number.isFinite(p.y)), 'elke punt heeft een streeknaam en coördinaten');
  ok(mapCategory('uitkijkpunt') === 'ommeland' && mapPriority('uitkijkpunt') > 0, 'het icoon valt onder de Ommeland-laag');
  const view = fs.readFileSync(new URL('../game/js/mapview.js', import.meta.url), 'utf8');
  ok(view.includes("layerOn('uitkijkpunt')") && view.includes('meta.uitkijkpunten'), 'de kaart tekent de laag');
  ok(view.includes("kind: 'uitkijkpunt'") && view.includes("layers: ['uitkijkpunt']"), 'de legendarij heeft een schakelaar');
  const hud = fs.readFileSync(new URL('../game/js/hud_panel.js', import.meta.url), 'utf8');
  ok(/case 'uitkijkpunt':/.test(hud) && hud.includes("add('uitkijkpunt'"), 'het icoon en de minimap kennen de laag');
  const oml = fs.readFileSync(new URL('../game/js/ommelandlandmarks.js', import.meta.url), 'utf8');
  ok(oml.includes('installeerUitkijkpunten(world.map, j.items)'), 'de kits zetten de punten op de kaart');
}

// 2. Het album: de aantallen die de bestaande herkenningspunten nu al opleveren (ratchet).
const album = albumStand(kits, STREKEN, streekAt);
ok(album.length === STREKEN.length, 'album per streek');
ok(album.every((r) => r.totaal >= 10), 'elke streek heeft minstens tien herkenningspunten', JSON.stringify(album));
const kerken = album.reduce((a, r) => a + r.kerk, 0), molens = album.reduce((a, r) => a + r.molen, 0), borgen = album.reduce((a, r) => a + r.borg, 0);
ok(kerken >= 380, 'kerkenpad: minstens 380 kerken in de bestaande kit', String(kerken));
ok(molens >= 90, 'molenaar: minstens 90 molens in de bestaande kit', String(molens));
ok(borgen >= 20, 'borgen: minstens 20 borgen in de bestaande kit', String(borgen));

// 3. Langs de reisbeats: de grootste gap tot het eerstvolgende herkenningspunt (rechte lijn,
//    tot de routepunten beschikbaar zijn). De gemeten waarden zijn de ratchet: alleen beter.
const BASIS = { T2: 1662, T3: 3617, M13: 5432, M17: 2693, T4: 2204, M27: 3286, T5: 3063 };
function plek(naam) {
  const n2 = String(naam).toLowerCase().replace(/^station /, '').trim();
  const p = MENU_PLEKKEN.find((q) => q.id.includes(n2.replace(/\s+/g, '-')));
  if (p) return [p.x, p.y];
  const hits = dest.filter((k) => (k.n || '').toLowerCase().includes(n2.split(' ')[0]));
  if (!hits.length) return null;
  const h = hits.find((k) => k.k === 'station') || hits[0];
  return [h.x, h.y];
}
function grootsteGap(a, z, lengte) {
  const N = Math.ceil(lengte / 250);
  let max = 0;
  for (let i = 1; i < N; i++) {
    const t = i / N, x = a[0] + (z[0] - a[0]) * t, y = a[1] + (z[1] - a[1]) * t;
    let d = Infinity;
    for (const k of dest) d = Math.min(d, Math.hypot(k.x - x, k.y - y));
    max = Math.max(max, d);
  }
  return Math.round(max);
}
const beats = [];
for (const [id, b] of Object.entries(REISBEATS)) {
  const a = plek(b.from), z = plek(b.to);
  if (!a || !z) continue;
  const gap = grootsteGap(a, z, b.length);
  beats.push({ id, gap });
  ok(gap <= (BASIS[id] ?? 6000) + 250, `reisbeat ${id}: geen groter gat dan de basis (${gap} vs ${BASIS[id]})`);
}
ok(beats.length >= 7, 'genoeg reisbeats met herkenbare eindpunten voor de audit', String(beats.length));

console.log(fails ? `${fails} of ${n} verken-checks failed` : `verken_dichtheid_test: ${n} checks ok (${beats.length} reisbeats gemeten, ${kerken} kerken/${molens} molens/${borgen} borgen)`);
process.exit(fails ? 1 : 0);
