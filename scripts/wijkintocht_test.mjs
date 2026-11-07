// De intocht na een verovering (#704 epic): het fundament (#705: wachtrij en rust-poort), de
// stops en camera-baan (#706), de scenecatalogus (#707, één bewezen wijk), de eenmalig-per-
// speler-regel (#708), de terminologie (#716) en de geliefde buurten (#736). Puur: geen DOM,
// geen THREE, geen opslag en geen echte localStorage.
//   node scripts/wijkintocht_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as W from '../game/js/wijkintocht.js';
import * as G from '../game/js/gebieden.js';
import { ontvouw } from '../game/js/grenzen.js';
import { puntInGebied } from '../game/js/grenzen.js';
import { veroverTourShot } from '../game/js/camerapath.js';
import { MOMENTS, LEVEL } from '../game/js/hudbus.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };

// Een kleine wereld met echte grenzen: een provincie, gemeente, woonplaats, wijk Oud-Oost en de
// buurt Oosterparkwijk, met taken op de juiste plek.
const vlak = (id, naam, x0, y0, x1, y1, extra = {}) => ({ id, naam, c: [(x0 + x1) / 2, (y0 + y1) / 2], p: [[[x0, y0, x1 - x0, 0, 0, y1 - y0, -(x1 - x0), 0]]], ...extra });
const grenzen = ontvouw({
  v: 1, jaar: 2025, bron: ['test'],
  provincie: vlak('PV20', 'Groningen', -6000, -6000, 6000, 6000),
  gemeenten: [vlak('GM0014', 'Groningen', -5000, -5000, 5000, 5000)],
  woonplaatsen: [vlak('WP0001', 'Groningen', -4500, -4500, 4500, 4500, { gm: 'GM0014' })],
  wijken: [vlak('WK01', 'Oud-Oost', -1500, -1500, 1500, 1500, { gm: 'GM0014' })],
  buurten: [vlak('BU01', 'Oosterparkwijk', -500, -500, 500, 500, { wk: 'WK01' })],
});
const taken = [
  { id: 'm:1', soort: 'missie', naam: 'De stoep', x: -200, y: -100, sleutels: ['m:1'] },
  { id: 'b:1', soort: 'baan', naam: 'Padel Vogelbuurt', x: 200, y: 100, sleutels: ['u:padel'] },
  { id: 's:1', soort: 'spel', naam: 'Skatepark', x: 300, y: -300, sleutels: ['s:skate'] },
  { id: 'v:1', soort: 'vondst', naam: 'Een vondst', x: -300, y: 300, sleutels: ['v:1'] },
];
const ind = G.bouwIndeling({ grenzen, taken });
const wk = ind.gebied.get('wk:WK01');
const bu = ind.gebied.get('bu:BU01');
const beloning = G.beloningVan(ind, wk.id);
const punten = [{ name: 'Oosterparkwijk', x: 0, y: 0 }, { name: 'Korrewegwijk', x: 3000, y: 0 }, { name: 'Stadspark', x: 100, y: 100 }];

// --- #705: de wachtrij en de rust-poort -----------------------------------------------------
t('#705: de beloning gaat de wachtrij in, dezelfde verovering maar één keer, FIFO eruit', () => {
  const w = {};
  assert.deepEqual(W.wachtrij(w), [], 'zonder wachtrij niets');
  assert.equal(W.wachtOpIntocht(w, beloning, 10), true);
  assert.equal(W.wachtOpIntocht(w, beloning, 11), false, 'dezelfde verovering komt er niet twee keer in');
  const tweede = G.beloningVan(ind, bu.id);
  assert.equal(W.wachtOpIntocht(w, tweede, 20), true);
  assert.deepEqual(W.wachtrij(w).map((b) => b.gebied), [wk.id, bu.id]);
  assert.equal(W.wachtrij(w)[0].in, 10, 'de speltijd van de beloning gaat mee');
  assert.equal(W.neemIntocht(w).gebied, wk.id, 'FIFO');
  assert.equal(W.neemIntocht(w).gebied, bu.id);
  assert.equal(W.neemIntocht(w), null);
  assert.equal(W.wachtOpIntocht(w, null), false);
  assert.equal(W.wachtOpIntocht(w, { naam: 'zonder id' }), false);
  assert.equal(W.wachtOpIntocht(null, beloning), false);
});
t('#705: de rust-poort blokkeert op alles wat de speler van de film afhoudt', () => {
  const w = {};
  W.wachtOpIntocht(w, beloning, 0);
  assert.equal(W.magIntocht(w, { sindsFilm: 10, sindsBeloning: 10 }), true, 'rustig: de film mag');
  for (const blok of ['cinematic', 'banner', 'respawn', 'busy', 'menu', 'map']) {
    assert.equal(W.magIntocht(w, { ...{ sindsFilm: 10, sindsBeloning: 10 }, [blok]: true }), false, blok + ' blokkeert');
  }
  assert.equal(W.magIntocht(w, { sindsFilm: 10, sindsBeloning: 10, wanted: 2 }), false, 'gezocht: niet filmen');
  assert.equal(W.magIntocht(w, { sindsFilm: W.RUST_S - 0.1, sindsBeloning: 10 }), false, 'net na een film nog wachten');
  assert.equal(W.magIntocht(w, { sindsFilm: 10, sindsBeloning: W.NA_BELONING_S - 0.1 }), false, 'net na de beloning nog wachten');
  assert.equal(W.magIntocht(w, { sindsFilm: W.RUST_S, sindsBeloning: W.NA_BELONING_S }), true, 'op de grens mag het');
  // zonder wachtrij nooit
  assert.equal(W.magIntocht({}, { sindsFilm: 100, sindsBeloning: 100 }), false);
});
t('#705: het veroverd-moment is verhaal, geen ontdekking (dus geen 210 s cooldown)', () => {
  assert.ok(MOMENTS.veroverd, 'MOMENTS.veroverd bestaat');
  assert.equal(MOMENTS.veroverd.level, 'story');
  assert.equal(MOMENTS.veroverd.cooldown, 0);
  assert.equal(LEVEL[MOMENTS.veroverd.level], LEVEL.story);
  // het moment wordt door gebiedenlive bij de beloning genoteerd en de beloning gaat de wachtrij in
  const bron = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
  const live = bron('gebiedenlive.js');
  assert.match(live, /wachtOpIntocht\(w, b, w\.time\)/, 'de beloning gaat de wachtrij in');
  assert.match(live, /noteMoment\(MOMENT\)/, 'het veroverd-moment wordt genoteerd');
});

// --- #706: de stops en de camera-baan -------------------------------------------------------
t('#706: de stops komen uit de catalogus: ankers, taken (afwisselend), landmarks en het huis', () => {
  const scene = W.intochtVoor('Oud-Oost');
  const stops = W.kiesStops(ind, wk.id, { scene, landmarks: [{ name: 'Martinitoren', x: 0, y: 0 }, { name: 'Ver weg', x: 9000, y: 9000 }] });
  assert.ok(stops.length >= W.MIN_STOPS && stops.length <= W.MAX_STOPS, 'drie tot vijf stops: ' + stops.length);
  assert.deepEqual(stops.slice(0, 3).map((s) => s.naam), ['Korenbloemstraat', 'Trompsingel', 'Kop van Oost'], 'de vaste ankers eerst');
  assert.ok(stops.some((s) => s.soort === 'missie' || s.soort === 'baan' || s.soort === 'spel'), 'taken uit de wijk');
  assert.ok(stops.some((s) => s.soort === 'landmark' && s.naam === 'Martinitoren'), 'een landmark binnen de wijk');
  assert.ok(!stops.some((s) => s.naam === 'Ver weg'), 'een landmark buiten de polygoon valt af');
  assert.ok(stops.every((s) => Number.isFinite(s.x) && Number.isFinite(s.y)), 'elke stop heeft een plek');
  // zonder scène: taken, dan een landmark, dan het safehouse (en nooit meer dan vijf)
  const kaal = W.kiesStops(ind, wk.id, { landmarks: [{ name: 'Martinitoren', x: 0, y: 0 }] });
  assert.equal(kaal.length, W.MAX_STOPS, 'gevuld tot vijf: ' + kaal.length);
  assert.ok(kaal.some((s) => s.soort === 'landmark'), 'een landmark uit de catalogus');
  const klein = G.bouwIndeling({ grenzen, taken: taken.slice(0, 2) });
  const huis = W.kiesStops(klein, 'wk:WK01', { landmarks: [{ name: 'Martinitoren', x: 0, y: 0 }] });
  assert.ok(huis.some((s) => s.soort === 'huis'), 'het safehouse is er ook');
  assert.equal(huis[huis.length - 1].soort, 'huis', 'en staat achteraan');
  assert.deepEqual(W.kiesStops(ind, 'wk:bestaatniet'), []);
  assert.deepEqual(W.kiesStops(null, wk.id), []);
});
t('#706: tourKeys en veroverTourShot geven een vloeiende baan van overzicht tot achter de speler', () => {
  const stops = W.kiesStops(ind, wk.id, { scene: W.intochtVoor('Oud-Oost') });
  const behind = { pos: { x: -40, y: 40, z: 3.8 }, look: { x: 0, y: 0, z: 1.4 } };
  const keys = W.tourKeys(wk, stops, behind);
  assert.equal(keys.length, stops.length + 2, 'overzicht, elke stop, eindbeeld');
  assert.ok(keys.every((k) => Number.isFinite(k.pos.x) && Number.isFinite(k.pos.y) && Number.isFinite(k.pos.z) && Number.isFinite(k.look.x) && Number.isFinite(k.look.y) && Number.isFinite(k.look.z)));
  assert.deepEqual(keys[keys.length - 1], { pos: behind.pos, look: behind.look, fov: 60 }, 'het eindbeeld is de pose achter de speler');
  const map = { buildingsNear: () => [], roadsNear: () => [], meta: {} };
  const shot = veroverTourShot({ map }, { x: wk.x, y: wk.y }, stops, behind);
  assert.equal(typeof shot, 'function', 'de baan is een functie van 0..1');
  for (const u of [0, 0.25, 0.5, 0.75, 1]) {
    const pose = shot(u);
    assert.ok(Number.isFinite(pose.position.x) && Number.isFinite(pose.position.y) && Number.isFinite(pose.position.z), 'pose ' + u);
    assert.ok(Number.isFinite(pose.lookAt.x) && Number.isFinite(pose.lookAt.y), 'kijklijn ' + u);
  }
  assert.equal(veroverTourShot(null, wk, stops, behind), null);
  assert.equal(veroverTourShot({ map }, wk, [], behind), null);
  // #706: prewarm over de hele baan, niet alleen de stops
  const pre = W.tourPrewarm(wk, stops, behind);
  assert.ok(pre.length > stops.length && pre.length <= 8, 'prewarm-punten: ' + pre.length);
  assert.ok(pre.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)));
});

// --- #707: de scenecatalogus (één bewezen wijk) ---------------------------------------------
t('#707: de catalogus heeft vier pilotscènes met ankers, regels en een duur', () => {
  assert.deepEqual(W.INTOCHTEN.map((s) => s.wijk).sort(), ['Centrum', 'Nieuw-Noord', 'Oud-Oost', 'Oud-Zuid'], 'de vier pilots');
  for (const scene of W.INTOCHTEN) {
    assert.ok(scene.titel && Number.isFinite(scene.seconden) && scene.seconden >= 20 && scene.seconden <= W.MAX_INTOCHT_SECONDEN, scene.wijk + ': duur');
    assert.ok(Array.isArray(scene.ankers) && scene.ankers.length >= 2 && scene.ankers.length <= 3, scene.wijk + ': ankers');
    assert.ok(scene.ankers.every((a) => a.naam && Number.isFinite(a.x) && Number.isFinite(a.y)), scene.wijk + ': ankerplekken');
    assert.ok(Array.isArray(scene.regels) && scene.regels.length >= 3, scene.wijk + ': regels');
  }
  const scene = W.intochtVoor('Oud-Oost');
  assert.ok(scene, 'Oud-Oost "De stoep" staat in de catalogus');
  assert.equal(scene.titel, 'De stoep');
  assert.ok(Number.isFinite(scene.seconden) && scene.seconden >= 20 && scene.seconden <= W.MAX_INTOCHT_SECONDEN, '20-40 s: ' + scene.seconden);
  assert.ok(Array.isArray(scene.regels) && scene.regels.length >= 3, 'minstens drie regels');
  assert.ok(scene.regels.every((r) => r.stem && r.tekst && r.tekst.length > 8), 'elke regel heeft een stem en tekst');
  assert.ok(scene.ankers.length >= 2 && scene.ankers.length <= 3, 'twee of drie ankers');
  assert.ok(scene.ankers.every((a) => a.naam && Number.isFinite(a.x) && Number.isFinite(a.y)), 'elke anker heeft een plek');
  assert.equal(new Set(W.INTOCHTEN.map((s) => s.wijk)).size, W.INTOCHTEN.length, 'geen dubbele wijken');
  // de generieke variant voor alle andere veroveringen
  const gen = W.generiekVoor(G.beloningVan(ind, bu.id));
  assert.ok(gen.titel && gen.regels.length >= 3 && gen.seconden >= 20 && gen.seconden <= W.MAX_INTOCHT_SECONDEN);
  assert.ok(gen.regels.some((r) => r.tekst.includes('Oosterparkwijk')), 'de generieke regel noemt het gebied');
});
t('#707: maakIntocht kiest de eigen scène of de generieke en levert altijd drie tot vijf stops', () => {
  const film = W.maakIntocht(ind, beloning, { landmarks: [{ name: 'Martinitoren', x: 0, y: 0 }] });
  assert.equal(film.titel, beloning.titel);
  assert.equal(film.gebied, wk.id);
  assert.ok(film.stops.length >= W.MIN_STOPS && film.stops.length <= W.MAX_STOPS);
  assert.ok(Number.isFinite(film.x) && Number.isFinite(film.y), 'het midden van het gebied voor het overzicht');
  const geen = W.maakIntocht(ind, G.beloningVan(ind, bu.id));
  assert.equal(geen.wijk, 'Oosterparkwijk');
  assert.ok(geen.titel.startsWith('Buurtheld') || geen.titel === 'Intocht', 'de generieke titel of de buurttitel: ' + geen.titel);
  assert.equal(W.maakIntocht(ind, null), null);
});

// --- #716: één term per laag ----------------------------------------------------------------
t('#716: buurt en wijk zijn twee lagen met elk hun eigen term en uitleg', () => {
  assert.equal(W.termVoor('buurt'), 'buurt');
  assert.equal(W.termVoor('wijk'), 'wijk');
  assert.equal(W.termVoor('onbekend'), 'onbekend');
  assert.match(W.termUitleg('buurt'), /woont/, 'de buurt is waar je woont');
  assert.match(W.termUitleg('wijk'), /verover-eenheid/, 'de wijk is de verover-eenheid');
  assert.equal(W.termUitleg('gemeente'), '');
  assert.ok(Object.isFrozen(W.TERMEN), 'de termen staan vast');
});

// --- #736: geliefde buurten ------------------------------------------------------------------
t('#736: de dichtstbijzijnde geliefde buurt binnen de straal, geen andere buurt', () => {
  assert.deepEqual(W.geliefdeBuurt(punten, 10, 10), { naam: 'Oosterparkwijk', x: 0, y: 0, afstand: Math.hypot(10, 10) });
  assert.equal(W.geliefdeBuurt(punten, 5000, 5000), null, 'buiten de straal');
  assert.equal(W.geliefdeBuurt([{ name: 'Stadspark', x: 0, y: 0 }], 0, 0), null, 'niet elke buurt is geliefd');
  assert.equal(W.geliefdeBuurt(null, 0, 0), null);
  assert.ok(W.GELIEFDE_BUURTEN.includes('Oosterparkwijk') && W.GELIEFDE_BUURTEN.includes('Korrewegwijk'));
  // een andere geliefde buurt op dezelfde plek: de dichtstbijzijnde wint
  const twee = [{ name: 'Oosterparkwijk', x: 0, y: 0 }, { name: 'Korrewegwijk', x: 10, y: 0 }];
  assert.equal(W.geliefdeBuurt(twee, 8, 0).naam, 'Korrewegwijk');
});
t('#736: de thuiskomst vuurt pas als de ouder-wijk veroverd is, je er bent en je hem nog niet zag', () => {
  const p = G.nieuwProfiel();
  assert.equal(W.thuiskomstVoor(ind, p, punten, 0, 0), null, 'de wijk is nog niet veroverd');
  p.beloond = [wk.id];
  const film = W.thuiskomstVoor(ind, p, punten, 0, 0);
  assert.ok(film, 'de wijk is veroverd: de thuiskomst mag');
  assert.equal(film.gebied, bu.id);
  assert.equal(film.titel, 'Thuiskomst');
  assert.equal(film.seconden, W.THUISKOMST_SECONDEN);
  assert.ok(film.stops.length >= W.MIN_STOPS, 'drie stops: ' + film.stops.length);
  assert.equal(W.thuiskomstVoor(ind, p, punten, 4000, 4000), null, 'niet in de buurt');
  p.intochten = [bu.id];
  assert.equal(W.thuiskomstVoor(ind, p, punten, 0, 0), null, 'al gezien: één keer');
  const geenProfiel = G.nieuwProfiel();
  assert.equal(W.thuiskomstVoor(ind, geenProfiel, punten, 0, 0), null, 'zonder verovering geen film');
});

// --- #708: eenmalig per speler en terugkijken -------------------------------------------------
t('#708: de intocht is één keer per speler en terug te kijken vanuit Veroverd', () => {
  const bron = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
  // het profiel bewaart de geziene intochten en de replay-lijst komt uit gebieden.js
  const p = G.nieuwProfiel();
  assert.deepEqual(p.intochten, [], 'een nieuw profiel begint leeg');
  assert.equal(G.markeerIntocht(p, 'wk:WK01'), true);
  assert.equal(G.markeerIntocht(p, 'wk:WK01'), false);
  assert.equal(G.intochtGezien(p, 'wk:WK01'), true);
  // het paneel toont de knop, en die roept de speler van int ochten.js aan
  const ui = bron('gebiedenui.js');
  assert.match(ui, /Bekijk de intocht/, 'de knop staat in Veroverd');
  assert.match(ui, /data-intocht=/, 'met het gebied erbij');
  assert.match(bron('veroverdpanel.js'), /bekijkIntocht\(i\.dataset\.intocht\)/, 'de klik speelt de intocht');
  assert.match(bron('intochten.js'), /export function bekijkIntocht\(/, 'de terugkijk-functie bestaat');
  assert.match(bron('intochten.js'), /cinematicWorld\(\)/, 'de wereld komt van de cinematics');
  // de intocht speelt één keer: een gezien gebied wordt uit de wachtrij overgeslagen
  const it = bron('intochten.js');
  assert.match(it, /intochtGezien\(front\.gebied\)/, 'een geziene intocht gaat uit de wachtrij');
  assert.match(it, /noteerIntocht\(film\.gebied\)/, 'na de film wordt hij als gezien bewaard');
});

// --- #724: de intocht op de echte data en na zaaien -----------------------------------------
t('#724: elke veroverbare wijk in de echte grenzen levert een geldige intocht', () => {
  const echteGrenzen = ontvouw(JSON.parse(fs.readFileSync(new URL('../game/grenzen.json', import.meta.url), 'utf8')));
  const stad = JSON.parse(fs.readFileSync(new URL('../game/stad.json', import.meta.url), 'utf8'));
  const landmarks = stad.meta.landmarks || [];
  // twee taken in het midden van elke wijk: dan is elke wijk veroverbaar (MIN_TAKEN)
  const echteTaken = [];
  for (const g of echteGrenzen.wijken) {
    for (let k = 0; k < G.MIN_TAKEN; k++) echteTaken.push({ id: `taak:${g.id}:${k}`, soort: 'spel', naam: 'Klus', x: g.c[0], y: g.c[1], sleutels: [`s:${g.id}:${k}`] });
  }
  const echt = G.bouwIndeling({ grenzen: echteGrenzen, taken: echteTaken });
  const map = { buildingsNear: () => [], roadsNear: () => [], meta: {} };
  let gedaan = 0;
  for (const wijk of echt.gebieden.filter((g) => g.niveau === 'wijk' && g.veroverbaar)) {
    const film = W.maakIntocht(echt, G.beloningVan(echt, wijk.id), { landmarks });
    assert.ok(film, `${wijk.naam}: geen intocht`);
    assert.ok(film.stops.length >= W.MIN_STOPS && film.stops.length <= W.MAX_STOPS, `${wijk.naam}: ${film.stops.length} stops`);
    for (const stop of film.stops) {
      assert.ok(Number.isFinite(stop.x) && Number.isFinite(stop.y), `${wijk.naam}: stop ${stop.naam} is niet eindig`);
      assert.ok(puntInGebied(wijk.grens, stop.x, stop.y), `${wijk.naam}: stop ${stop.naam} ligt buiten de wijk`);
    }
    const behind = { pos: { x: wijk.x - 8, y: wijk.y - 8, z: 3.4 }, look: { x: wijk.x, y: wijk.y, z: 1.3 } };
    const shot = veroverTourShot({ map }, { x: wijk.x, y: wijk.y }, film.stops, behind);
    assert.equal(typeof shot, 'function', `${wijk.naam}: geen baan`);
    for (const u of [0, 0.25, 0.5, 0.75, 1]) {
      const pose = shot(u);
      assert.ok(Number.isFinite(pose.position.x) && Number.isFinite(pose.position.y) && Number.isFinite(pose.position.z), `${wijk.naam}: pose ${u}`);
      assert.ok(Number.isFinite(pose.lookAt.x) && Number.isFinite(pose.lookAt.y), `${wijk.naam}: kijklijn ${u}`);
    }
    gedaan++;
  }
  assert.ok(gedaan > 50, 'te weinig veroverbare wijken in de echte data: ' + gedaan);
});
t('#724: een gezaaide speler (bestaande voortgang) zet niets in de intochtwachtrij', () => {
  const echteGrenzen = ontvouw(JSON.parse(fs.readFileSync(new URL('../game/grenzen.json', import.meta.url), 'utf8')));
  const echteTaken = [];
  for (const g of echteGrenzen.wijken) {
    for (let k = 0; k < G.MIN_TAKEN; k++) echteTaken.push({ id: `taak:${g.id}:${k}`, soort: 'spel', naam: 'Klus', x: g.c[0], y: g.c[1], sleutels: [`s:${g.id}:${k}`] });
  }
  const echt = G.bouwIndeling({ grenzen: echteGrenzen, taken: echteTaken });
  const p = G.nieuwProfiel();
  const w = {};
  const aantal = G.zaai(p, echt, new Set(echteTaken.map((x) => x.sleutels[0])));
  assert.ok(aantal > 50, 'zaaien neemt de oude voortgang over: ' + aantal);
  assert.deepEqual(W.wachtrij(w), [], 'zaaien zet geen intocht in de wachtrij');
  assert.deepEqual(p.intochten, [], 'zaaien markeert geen intochten als gezien');
  // en de bedrading: alleen het echte einde van een verovering (betalen) gaat de wachtrij in
  const live = fs.readFileSync(new URL('../game/js/gebiedenlive.js', import.meta.url), 'utf8');
  const zaaiPad = live.slice(live.indexOf('function zaaiAlsNodig'), live.indexOf('function meldVoortgang'));
  assert.ok(!/wachtOpIntocht/.test(zaaiPad), 'zaaien roept de intochtwachtrij niet aan');
  assert.match(live, /wachtOpIntocht\(w, b, w\.time\)/, 'de beloning gaat de wachtrij in');
});

console.log(`wijkintocht_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
