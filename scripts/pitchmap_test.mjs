// De kaartlaag Standplaatsen: de pure view (standen, prijs, wagen, schaal), het aanklikken, het kaartje met bevestiging en de bronregels van de tekenkant en de koppeling in mapview.js.
// node scripts/pitchmap_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as M from '../game/js/pitchmap.js';
import * as C from '../game/js/pitchcard.js';
import * as SP from '../game/js/pitch.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const rows = SP.SPOTS.map((s) => ({ id: s.id, name: s.name, short: s.short, place: s.place, ...SP.spotXY(s.id), foot: s.foot, status: s.id === 'markt' ? 'usmem' : s.id === 'park' ? 'jij' : s.id === 'dorp' ? 'medespeler' : 'vrij',
  price: SP.permitPrice(s.id, 0), ask: 25000, daysLeft: 12, renew: 1200, claim: s.id === 'dorp' ? { name: 'lotte', color: '#c0c' } : null, wagon: s.id === 'park' ? 'own' : null }));
const WIDE = [-30000, -30000, 30000, 30000];

t('uitgezoomd zijn alle zestien punten er, zonder naam; ingezoomd met naam en alleen wat in beeld is', () => {
  const v = M.pitchMarkerView(rows, WIDE, 0.005);
  assert.equal(v.mode, 'markers'); assert.equal(v.markers.length, 16); assert.ok(v.markers.every((m) => !m.showLabel));
  const z = M.pitchMarkerView(rows, [-200, -200, 400, 400], 0.1);
  assert.ok(z.markers.length >= 1 && z.markers.length < 8 && z.markers.every((m) => m.showLabel));
  assert.ok(z.markers.some((m) => m.id === 'markt'));
  assert.equal(M.pitchMarkerView(rows, WIDE, 0.001).mode, 'none'); assert.equal(M.pitchMarkerView([], WIDE, 0.1).mode, 'none'); assert.equal(M.pitchMarkerView(null, WIDE, 0.1).mode, 'none');
});
t('elke stand heeft een eigen vorm en lijnpatroon (nooit alleen kleur) en geen geel', () => {
  const shapes = Object.values(M.STATES).map((s) => s.shape);
  assert.equal(new Set(shapes).size, 4);
  for (const s of Object.values(M.STATES)) { assert.ok(!/yellow|amber|ring/i.test(s.ink)); assert.ok(s.label); }
  assert.equal(M.LEGEND.length, 4);
});
t('de markers: stand, subtekst met prijs of overname, wagen en de kleur van een medespeler', () => {
  const v = M.pitchMarkerView(rows, WIDE, 0.05), by = Object.fromEntries(v.markers.map((m) => [m.id, m]));
  assert.equal(by.markt.state, 'usmem'); assert.match(by.markt.sub, /overnemen €25\.000/);
  assert.equal(by.park.wagon, 'own'); assert.match(by.park.sub, /TAM & TES/);
  assert.equal(by.dorp.color, '#c0c'); assert.equal(by.dorp.sub, 'lotte');
  assert.match(by.leek.sub, /vergunning €/);
});
t('aanklikken: het dichtstbijzijnde punt binnen 16 pixels, anders niets', () => {
  const v = M.pitchMarkerView(rows, WIDE, 0.05), m = rows.find((r) => r.id === 'markt');
  assert.equal(M.pickMarker(v.markers, m.x + 100, m.y, 0.05).id, 'martini');     // het dichtstbijzijnde punt wint, ook als 100 m (5 px) naast een ander punt
  assert.equal(M.pickMarker(v.markers, m.x + 5, m.y, 0.05).id, 'markt');
  assert.equal(M.pickMarker(v.markers, m.x + 2000, m.y + 2000, 0.05), null);
  assert.equal(M.pickMarker(null, 0, 0, 0.05), null);
});
t('het kaartje: vrij vraagt een tweede druk met het bedrag, Us Mem heeft overnemen, van jou zet de wagen, medespeler geen knoppen', () => {
  const r = (id) => rows.find((x) => x.id === id);
  let h = C.spotCardHtml(r('leek'), { money: 1e6 });
  assert.match(h, /data-card="sp-koop"/); assert.match(h, /vergunning van 40 speldagen/);
  h = C.spotCardHtml(r('leek'), { stap: 'koop', money: 1e6 });
  assert.match(h, /data-card="sp-ok"/); assert.match(h, /data-card="sp-annuleer"/); assert.match(h, /Je houdt/);
  assert.match(C.spotCardHtml(r('leek'), { stap: 'koop', money: 10 }), /Je mist nog/);
  h = C.spotCardHtml(r('markt'), { money: 1e6 });
  assert.match(h, /Neem over/); assert.match(h, /Jelle Terpstra/);
  assert.match(C.spotCardHtml(r('markt'), { stap: 'koop', money: 1e6 }), /Ja, neem over/);
  assert.ok(!/sp-zet/.test(C.spotCardHtml(r('park'), { hasWagon: true })));            // de wagen staat er al
  assert.match(C.spotCardHtml({ ...r('park'), wagon: null }, { hasWagon: true }), /data-card="sp-zet"/);
  assert.ok(!/data-card=/.test(C.spotCardHtml(r('dorp'), {}))); assert.match(C.spotCardHtml(r('dorp'), {}), /lotte/);
  assert.match(C.spotCardHtml(r('leek'), { melding: 'Klaar <b>' }), /Klaar &lt;b&gt;/);
  assert.equal(C.spotCardHtml(null), '');
  assert.match(C.pitchTipLine(r('leek')), /^Vrij · vergunning/);
});
t('de tekenkant tekent alleen: geen rekenwerk, geen fetch, geen Math.random, en geen geel', () => {
  const src = fs.readFileSync(new URL('../game/js/pitchdraw.js', import.meta.url), 'utf8').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  assert.ok(!/Math\.random|fetch\(|localStorage/.test(src)); assert.ok(!/yellow|amber|ringNext/.test(src));
  assert.match(src, /export function drawPitchMarkers/);
});
t('mapview.js: minimale koppeling (de laag, de klik, het kaartje, de acties, de legenda)', () => {
  const m = fs.readFileSync(new URL('../game/js/mapview.js', import.meta.url), 'utf8');
  for (const s of ["layerOn('standplaats')", 'drawPitchMarkers(', 'pickMarker(state.standMarkers', 'spotCardHtml(', "act.startsWith('sp-')", 'function standActie', "layers: ['standplaats']"]) assert.ok(m.includes(s), s);
});
t('standplaatskaart: Vergunning kopen met spatie voor de prijs en drukte in woorden (#1234, #1256)', () => {
  const h = C.spotCardHtml({ id: 1, status: 'vrij', price: 450, place: 'Vismarkt', foot: 1.2, ask: 900, renew: 200, daysLeft: 12, claim: null });
  assert.ok(h.includes('Vergunning kopen</span> <small>'), 'spatie tussen label en prijs');
  assert.ok(!/gewone drukke plek|1,20/.test(h), 'geen jargon of ruw getal');
  assert.equal(C.crowdWord(0.5), 'Rustig');
  assert.equal(C.crowdWord(1), 'Gewoon druk');
  assert.equal(C.crowdWord(1.2), 'Druk');
  assert.equal(C.crowdWord(2), 'Erg druk');
});
console.log(`pitchmap_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
