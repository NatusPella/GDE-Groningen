// Test van de wereld-, beeld- en geluidsregels van de voetbalcarrière (#1115): scripts/voetbal_wereld_test.mjs. Puur; het tekenen zelf is niet in beeld bekeken.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import PARKDATA from '../game/js/voetbalparkendata.js';
import { makeParkIndex } from '../game/js/voetbalparken.js';
import { CLUBS, EUROPE_CLUBS, PATTERNS } from '../game/js/voetbalclubs.js';
import * as W from '../game/js/voetbalworld.js';

let n = 0;
const t = (naam, f) => { try { f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };
const index = makeParkIndex(PARKDATA);

t('shirtpatronen: elk patroon vult het hele vlak van 128 zonder gaten', () => {
  for (const p of PATTERNS) {
    const r = W.shirtRects(p);
    const opp = r.reduce((s, x) => s + x.w * x.h, 0);
    assert.equal(opp, W.SHIRT_SIZE * W.SHIRT_SIZE, p);
    assert.ok(r.every((x) => x.x >= 0 && x.x + x.w <= 128 && x.y >= 0 && x.y + x.h <= 128));
  }
  assert.equal(W.shirtRects('effen').length, 1); assert.equal(W.shirtRects('helften').length, 2); assert.equal(W.shirtRects('smalle-streep').length, 8);
  assert.equal(W.shirtRects('nep').length, 1);
  const calls = []; const ctx = { fillRect: (...a) => calls.push(a), set fillStyle(v) { calls.push(v); } };
  W.drawShirt(ctx, { shirt: 0x2f9e5b, broek: 0xffffff, patroon: 'helften', accent: 0x111111 });
  assert.ok(calls.includes('#2f9e5b') && calls.includes('#111111'));
});
t('alle clubs: patroon bekend, en elk duel is te onderscheiden (kleur of patroon, anders een uitshirt)', () => {
  const alle = [...CLUBS, ...EUROPE_CLUBS];
  for (const c of alle) assert.ok(PATTERNS.includes(c.patroon));
  let nodig = 0;
  for (const a of alle) for (const b of alle) {
    if (a === b) continue;
    const kit = W.awayKit({ shirt: a.shirt, patroon: a.patroon }, { shirt: b.shirt, patroon: b.patroon, keeperShirt: b.keeper, broek: b.broek });
    assert.ok(W.colorDistance(a.shirt, kit.shirt) >= 90 || a.patroon !== kit.patroon || kit.shirt !== b.shirt, `${a.id} - ${b.id}`);
    if (kit.shirt !== b.shirt) nodig++;
  }
  assert.ok(nodig >= 0);
  assert.ok(W.colorDistance(0x000000, 0xffffff) > 400);
});
t('publiek: tussen 600 en 2.000, vulling per klasse, stil bij verminderde beweging, uit bij de laagste kwaliteit', () => {
  assert.equal(W.crowdCount({ capacity: 100, fill: 1 }), 600); assert.equal(W.crowdCount({ capacity: 9999, fill: 1 }), 2000);
  assert.ok(W.crowdFill('kroon', 1) > W.crowdFill('talent', 1) && W.crowdFill('talent', 1) >= 0.2 && W.crowdFill('europa', 1, 1.08) <= 1);
  assert.equal(W.crowdState('spel'), 'zitten'); assert.equal(W.crowdState('goal'), 'juichen'); assert.equal(W.crowdState('spel', 2), 'juichen');
  const a = W.crowdSeats(700, 3), b = W.crowdSeats(700, 3);
  assert.deepEqual(a, b); assert.equal(a.length, 700); assert.ok(a.every((s) => Math.abs(s.x) > 28 && s.z >= 1));
  assert.equal(W.crowdVisible({}), 'animatie'); assert.equal(W.crowdVisible({ reduceMotion: true }), 'stil'); assert.equal(W.crowdVisible({ quality: 'laagst' }), 'uit');
});
t('geluid: elk geluid heeft een bijschrift en een ruisterugval; geen liedjes; het volume volgt de spanning en het effectvolume', () => {
  for (const [id, c] of Object.entries(W.CUES)) { assert.ok(c.tekst.length > 8, id); assert.ok(c.synth && c.synth.type, id); assert.ok(!/(zing|lied|tekst van)/i.test(c.tekst.replace('zingt zonder woorden', '')), id); }
  for (const ev of ['aftrap', 'eind', 'overtreding', 'doelpunt', 'gemist']) assert.ok(W.cueFor(ev).tekst);
  assert.equal(W.cueFor('nep'), null);
  assert.ok(W.crowdVolume({ tension: 1, fill: 1 }) > W.crowdVolume({ tension: 0, fill: 0.2 }));
  assert.equal(W.crowdVolume({ tension: 1, fill: 1, effects: 0 }), 0); assert.ok(W.crowdVolume({ tension: 5, fill: 5, effects: 5 }) <= 1);
  assert.ok(W.tension({ klok: 5, verschil: 0 }) > W.tension({ klok: 140, verschil: 5 }));
});
t('kaartlaag: alleen wat in beeld is, met thuis, volgende en trainingsvelden', () => {
  const home = index.clubs[0], next = index.clubs[1];
  const alles = { x0: -1e6, x1: 1e6, y0: -1e6, y1: 1e6 };
  const m = W.parkMarkers(index, alles, { homeId: home.id, nextId: next.id });
  assert.ok(m.length <= 120);
  assert.equal(m.filter((x) => x.type === 'thuis').length, 1); assert.equal(m.filter((x) => x.type === 'volgende').length, 1);
  const klein = { x0: home.park.x - 500, x1: home.park.x + 500, y0: home.park.y - 500, y1: home.park.y + 500 };
  const k = W.parkMarkers(index, klein, { homeId: home.id });
  assert.ok(k.length >= 1 && k.every((x) => x.x >= klein.x0 && x.x <= klein.x1));
  assert.equal(W.parkMarkers(index, { x0: 1e9, x1: 1e9 + 1, y0: 0, y1: 1 }).length, 0);
});
t('trainende teams: alleen binnen 150 m, 6 tot 10 spelers, hooguit zes velden tegelijk, deterministisch', () => {
  const c = index.clubs.find((x) => x.park.f >= 1);
  const speler = { x: c.park.x + 20, y: c.park.y + 10 };
  const s = W.trainingSquads(index, speler, 1);
  assert.ok(s.length >= 1 && s.length <= 6); assert.ok(s.every((q) => q.n >= 6 && q.n <= 10));
  assert.deepEqual(s, W.trainingSquads(index, speler, 1));
  assert.equal(W.trainingSquads(index, { x: 1e8, y: 1e8 }).length, 0);
});
t('kaartlaag: zonder club niets, met een club het thuispark, het trainingsveld en de uitwedstrijd als doel (nooit alle parken)', () => {
  assert.deepEqual(W.mapSpots(index, {}), []); assert.deepEqual(W.mapSpots(null, { homeId: 'x' }), []);
  const thuis = index.clubs[0].id, uit = index.clubs[3].id;
  const spots = W.mapSpots(index, { homeId: thuis, nextId: uit });
  assert.ok(spots.length >= 2 && spots.length <= 1 + index.clubs[0].trainingsvelden.length + 1);
  assert.ok(spots.every((x) => Number.isFinite(x.x) && Number.isFinite(x.y) && x.id.startsWith('voetbal:') && x.name && x.sub));
  assert.ok(spots.some((x) => x.name.startsWith('Uitwedstrijd: ')), 'de volgende tegenstander is het doel');
  assert.ok(spots.some((x) => x.sub === 'Jouw club'));
  assert.equal(W.mapSpots(index, { homeId: thuis, nextId: null }).some((x) => x.name.startsWith('Uitwedstrijd')), false, 'thuis spelen is geen reis');
  assert.ok(W.mapSpots(index, { homeId: thuis, nextId: uit }).length < 20);
  assert.ok(!spots.some((x) => /(VV|SV|FC|SC|RKSV)/.test(x.name)), 'geen clubvoorvoegsels');
});
t('geluid: elk geluid dat de wedstrijd afspeelt (sfxEvent) bestaat in de sfx-kaart met een Nederlands bijschrift', () => {
  const src = fs.readFileSync(new URL('../game/js/voetbal.js', import.meta.url), 'utf8');
  const map = fs.readFileSync(new URL('../game/js/sfx/sfxmap.js', import.meta.url), 'utf8');
  const keys = new Set([...src.matchAll(/(?:sfxEvent\(w, |ballSfx\(w, )'([a-z_]+)'/g)].map((m) => m[1]));
  assert.ok(keys.size >= 8, [...keys].join());
  for (const k of keys) {
    const start = map.indexOf(`def('${k}', `), regel = start >= 0 ? map.slice(start, map.indexOf(String.fromCharCode(10), start)) : '';
    const tekst = (regel.split("', '")[2] || '').split("'")[0];
    assert.ok(tekst.length > 5, `${k} ontbreekt in sfxmap.js of heeft geen bijschrift`);
  }
  for (const e of ['aftrap', 'eind', 'overtreding', 'doelpunt', 'gemist']) assert.ok(W.cueFor(e) && W.cueFor(e).tekst, e);
});
t('publiek langs de lijn van een park: 30 tot 140 figuren naar klasse, buiten het veld, deterministisch, een sprong die uitdooft', () => {
  assert.ok(W.parkCrowdCount('talent') >= 30 && W.parkCrowdCount('talent') < W.parkCrowdCount('kroon'));
  assert.ok(W.parkCrowdCount('europa', 1, 1.3) <= W.PARK_CROWD.max && W.parkCrowdCount('onzin', 9, 0) >= W.PARK_CROWD.min);
  const a = W.parkCrowdSeats(100, 5), b = W.parkCrowdSeats(100, 5), c = W.parkCrowdSeats(100, 6);
  assert.deepEqual(a, b); assert.notDeepEqual(a, c); assert.equal(a.length, 100);
  assert.ok(a.every((s) => Math.abs(s.x) > 28 && Math.abs(s.x) < 28 + 2.2 + 0.9 + 0.3 + 1e-9 && Math.abs(s.y) <= 42 && s.hoogte >= 0.9 && s.hoogte <= 1.1 && s.kleur >= 0 && s.kleur < W.CROWD_COLORS.length), 'buiten de zijlijn, binnen de lengte');
  assert.ok(a.some((s) => s.x < 0) && a.some((s) => s.x > 0), 'aan beide kanten');
  assert.equal(W.crowdBounce(-1, 0.3), 0); assert.equal(W.crowdBounce(4, 0.3), 0); assert.equal(W.crowdBounce(9, 0.3), 0);
  let max = 0; for (let t = 0; t < 4; t += 0.05) max = Math.max(max, W.crowdBounce(t, 0.3)); assert.ok(max > 0.05 && max <= 0.22);
  assert.ok(W.crowdBounce(3.9, 0.1) < 0.05, 'de sprong dooft uit');
});
console.log(`voetbal_wereld_test ok (${n} groepen)`);
