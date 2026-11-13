// Het plekje van het eerbetoon (#832): de plaats, de afstanden, de regio
// (Groningen vs Friesland), de eenmaligheid en de markerdata. Puur: dit leest
// game/js/beppe_rules.js (geen THREE, geen DOM, geen klok) en de bron van
// achievements.js, zodat het ook zonder game/world en zonder browser draait.
// Draai: node scripts/beppe_garden_test.mjs
import { readFileSync } from 'node:fs';
import { wgsToWorld } from '../game/js/rdnew.js';
import { regionAt } from '../game/js/regions.js';
import { HOUSE_ARRIVAL, TODO, FAREWELL } from '../game/js/beppe_texts.js';
import {
  BEPPE_END_ID, TRIBUTE, LAYOUT, sideOffsets, pickTributeEnd, nearestOnPath, walkPath,
  crossingOnRoad, crossingAhead, layoutTribute, housePoint, markerOf, tributeTodo, farewellGuide, TODO_KEY, once,
} from '../game/js/beppe_rules.js';

let bad = 0;
const ok = (c, m, info = '') => { if (!c) { bad++; console.error('FAIL', m + (info ? ` (${info})` : '')); } };
const close = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

// --- het anker: het wereldeinde 'friesland' -----------------------------------
ok(BEPPE_END_ID === 'friesland', 'het anker is de friesland-route');
ok(TRIBUTE.set === 'eerbetoon' && TRIBUTE.achievement === 'goed_eten', 'set en prestatie-id');
{
  const e = pickTributeEnd([
    { id: 'bord', name: 'Het laatste bord', x: 10, y: 20 },
    { id: 'friesland', name: 'Welkom in Friesland', road: 'N355', x: -20000, y: -5000 },
  ]);
  ok(!!e && e.x === -20000 && e.y === -5000 && e.road === 'N355', 'het friesland-einde wordt gevonden');
  ok(pickTributeEnd(null) === null && pickTributeEnd([]) === null, 'zonder lijst geen anker');
  ok(pickTributeEnd([{ id: 'friesland', x: NaN, y: 1 }]) === null, 'een half punt is geen anker');
}

// --- langs de weg naar de grens ----------------------------------------------
{
  const P = [[0, 0], [100, 0], [100, 100]];
  const n = nearestOnPath(P, 50, 10);
  ok(n && n.i === 0 && close(n.x, 50) && close(n.y, 0) && close(n.d, 10), 'dichtstbijzijnde punt op de weg', JSON.stringify(n));
  ok(nearestOnPath([[0, 0]], 1, 1) === null, 'een weg heeft twee punten nodig');
  const b = walkPath(P, { i: 0, t: 0.25 }, 1, 30);
  ok(b && close(b.x, 55), 'vooruit langs de weg');
  const f = walkPath(P, { i: 0, t: 0.25 }, -1, 10);
  ok(f && close(f.x, 15), 'terug langs de weg');
  ok(walkPath(P, { i: 0, t: 0 }, -1, 5) === null, 'niet voorbij het begin van de weg');

  // Een synthetische weg: Groningen tot x = 1500, Friesland daarna, en de
  // datarand op x = 2400 (de plek waar het wereldeinde staat).
  const road = [[0, 0], [2400, 0]];
  const regionOf = (x) => (x < 1500 ? 'groningen' : 'friesland');
  const inData = (x) => x < 2400;
  const border = crossingOnRoad(road, { x: 2390, y: 0 }, { regionOf, inData, step: 3 });
  ok(!!border, 'de weg terug naar de provinciegrens wordt gevonden', JSON.stringify(border));
  if (border) {
    ok(Math.abs(border.x - 1500) <= 4, 'de grens ligt op de overgang', String(border.x));
    ok(close(border.ux, 1, 0.02) && close(border.uy, 0, 0.02), 'de uitwaartse richting wijst naar Friesland');
    const cross = layoutTribute({ border, ux: border.ux, uy: border.uy });
    ok(!!cross && regionOf(cross.bench.x) === 'groningen' && regionOf(cross.house.x) === 'friesland', 'bankje in Grunn, huis in Friesland');
  }
  ok(crossingOnRoad(road, { x: 100, y: 0 }, { regionOf, inData }) === null, 'een plek die al in Grunn ligt heeft geen grens');
  ok(crossingOnRoad(road, { x: 2390, y: 0 }, {}) === null, 'zonder regiovraag geen grens');
  // een wegrij die vóór de grens ophoudt: de rechte terugval (die de game op de
  // dichtstbijzijnde weg vastzet)
  const ahead = crossingAhead({ x: 2390, y: 0 }, { x: -1, y: 0 }, { regionOf, step: 4 });
  ok(!!ahead, 'de rechte terugval vindt de grens', JSON.stringify(ahead));
  ok(!!ahead && Math.abs(ahead.x - 1500) <= 6, 'de rechte terugval ligt op de overgang', String(ahead && ahead.x));
  ok(!!ahead && close(ahead.ux, 1, 0.02) && close(ahead.uy, 0, 0.02), 'de rechte terugval wijst naar Friesland');
  ok(crossingAhead({ x: 100, y: 0 }, { x: -1, y: 0 }, { regionOf }) === null, 'de terugval doet niets als je al in Grunn staat');
  ok(crossingAhead({ x: 2390, y: 0 }, { x: 0, y: 0 }, { regionOf }) === null, 'de terugval heeft een richting nodig');
}

// --- de plek zelf: afstanden en kanten ---------------------------------------
const HW = 3.5;
const OFF = sideOffsets(HW);
const site = layoutTribute({ border: { x: 1500, y: 0 }, ux: 1, uy: 0, hw: HW });
ok(!!site, 'de plek wordt neergelegd');
if (site) {
  const d = (p) => Math.hypot(p.x - 1500, p.y);
  ok(site.bench.x < 1500, 'het laatste bankje staat op Groningse bodem', JSON.stringify(site.bench));
  ok(close(d(site.bench), Math.hypot(LAYOUT.benchIn, OFF.bench)), 'de bankje-afstand tot de grens');
  ok(site.sign.x < 1500, 'het Kollum-bordje staat aan de Groningse kant');
  ok(close(d(site.sign), Math.hypot(LAYOUT.signIn, OFF.sign)), 'de bordje-afstand tot de grens');
  ok(site.house.x > 1500, 'Beppes huis staat over de grens', JSON.stringify(site.house));
  ok(close(d(site.house), Math.hypot(LAYOUT.houseOut, OFF.house)), 'de huis-afstand tot de grens');
  ok(site.gardenBench.x > 1500 && d(site.gardenBench) < LAYOUT.houseOut, 'het tuinbankje ligt net over de grens');
  ok(LAYOUT.arrivalR >= d(site.bench), 'de aankomstkaart haalt het bankje');
  ok(LAYOUT.leaveR > d(site.house) + 30, 'de duiven vliegen pas op als je echt wegloopt');
  // de tuin staat in het huis-frame: het prieelpad en de heg horen bij het huis
  const bird = housePoint(site, 9.4, -2.6);
  ok(!!bird && Number.isFinite(bird.x) && Number.isFinite(bird.y), 'het vogelhuisje heeft een plek in het huis-frame');
  ok(housePoint(null, 1, 1) === null && housePoint(site, 0, 0).x === site.house.x, 'het huis-frame rekent vanaf het huis');
  const again = layoutTribute({ border: { x: 1500, y: 0 }, ux: 1, uy: 0, hw: HW });
  ok(JSON.stringify(again) === JSON.stringify(site), 'dezelfde grens geeft dezelfde plek');
  const dry = layoutTribute({ border: { x: 1500, y: 0 }, ux: 1, uy: 0, dry: (x, y) => y <= 0.01 });
  ok(!!dry && dry.side === -1 && dry.bench.y < 0, 'een natte berm laat de plek naar de andere kant gaan');
  const bothWet = layoutTribute({ border: { x: 1500, y: 0 }, ux: 1, uy: 0, dry: () => false });
  ok(!!bothWet && bothWet.wet === true, 'blijft het nat, dan meldt de plek dat');
  ok(layoutTribute({}) === null && layoutTribute({ border: { x: 0, y: 0 }, ux: 0, uy: 0 }) === null, 'zonder grens of richting geen plek');
  // een bredere weg schuift de bank van het asfalt
  const wide = layoutTribute({ border: { x: 1500, y: 0 }, ux: 1, uy: 0, hw: 9 });
  ok(!!wide && Math.abs(wide.bench.y) >= 11, 'een brede weg houdt het bankje van de rijbaan', JSON.stringify(wide && wide.bench));
}

// --- de regio: Groningen tegenover Friesland ---------------------------------
{
  const G = wgsToWorld(53.2194, 6.5665);
  const F = wgsToWorld(53.1, 6.1);
  ok(regionAt(G[0], G[1]).id === 'groningen', 'Groningen stad is Groningen');
  ok(regionAt(F[0], F[1]).id === 'friesland', 'Drachten is Friesland');

  // De echte westgrens uit de regiobron: zoek de overgang en leg het plekje er
  // op; het bankje moet in Grunn blijven, het huis en de tuin in Friesland.
  let flip = null;
  for (const y of [-4000, -5000, -6000, -8000, -10000]) {
    for (let x = -10000; x > -30000; x -= 2) {
      if (regionAt(x, y).id === 'groningen' && regionAt(x - 2, y).id === 'friesland') { flip = { x: x - 1, y }; break; }
    }
    if (flip) break;
  }
  ok(!!flip, 'de westgrens is te vinden in de regiobron', JSON.stringify(flip));
  if (flip) {
    const real = layoutTribute({ border: flip, ux: -1, uy: 0 });
    ok(real && regionAt(real.bench.x, real.bench.y).id === 'groningen', 'bankje aan de Groningse kant van de echte grens');
    ok(real && regionAt(real.sign.x, real.sign.y).id === 'groningen', 'bordje aan de Groningse kant van de echte grens');
    ok(real && regionAt(real.house.x, real.house.y).id === 'friesland', 'huis aan de Friese kant van de echte grens');
    ok(real && regionAt(real.gardenBench.x, real.gardenBench.y).id === 'friesland', 'tuinbankje aan de Friese kant van de echte grens');
  }
}

// --- de marker, de Te-doen-kaart en het eenmalige ---------------------------
{
  const mk = markerOf(site);
  ok(!!mk && mk.kind === 'beppe', 'de kaart-marker heeft een eigen soort');
  ok(!!mk && mk.name === HOUSE_ARRIVAL.title && mk.sub === TODO.sub, 'de marker leest de tekst uit de tekstmodule', JSON.stringify(mk));
  ok(!!mk && mk.x === site.gardenBench.x && mk.y === site.gardenBench.y, 'de marker staat op het tuinbankje');
  ok(!!mk && mk.todo === TODO_KEY, 'de marker verwijst naar de Te-doen-kaart');
  ok(!!mk && !!mk.goal && mk.goal.kind === 'place' && mk.goal.name === TODO.title && mk.goal.x === mk.x && mk.goal.y === mk.y,
    'klikken op de marker biedt een plek-doel voor de route', JSON.stringify(mk && mk.goal));
  ok(markerOf(null) === null && markerOf({}) === null, 'zonder plek geen marker');

  const todo = tributeTodo(site, false);
  ok(!!todo && todo.key === TODO_KEY && todo.group === 'ommeland', 'de Te-doen-kaart staat in het Ommeland');
  ok(!!todo && todo.status === '' && todo.goal.kind === 'place' && todo.goal.name === TODO.title, 'open Te-doen-kaart met een plek-doel');
  ok(!!todo && todo.title === TODO.title && todo.meta === TODO.meta, 'de Te-doen-kaart leest de tekst uit de module');
  ok(!!todo && todo.x === site.gardenBench.x && todo.y === site.gardenBench.y, 'de Te-doen-kaart wijst naar het bankje');
  const done = tributeTodo(site, true);
  ok(!!done && done.status === 'klaar' && done.record === TODO.done, 'gevonden: de Te-doen-kaart is klaar');
  ok(tributeTodo(null, false) === null && tributeTodo({}, false) === null, 'zonder plek geen Te-doen-kaart');

  // De postgame-gids (#832): ná het verhaal wijst de automatische route één keer
  // naar het huis, tot de herinnering daar gelezen is.
  const farewell = farewellGuide(site, false);
  ok(!!farewell && farewell.name === FAREWELL.guideName && farewell.x === site.gardenBench.x && farewell.y === site.gardenBench.y,
    'de postgame-gids wijst naar het tuinbankje', JSON.stringify(farewell));
  ok(farewellGuide(site, true) === null, 'na het lezen van de herinnering geen gids meer');
  ok(farewellGuide(null, false) === null && farewellGuide({}, false) === null, 'zonder plek geen gids');

  const state = {};
  ok(once(state, 'a') === true, 'de eerste keer telt');
  ok(once(state, 'a') === false, 'de tweede keer niet');
  ok(once(state, 'b') === true, 'een andere sleutel telt weer');
  ok(once(null, 'a') === false && once(state, '') === false, 'zonder staat of sleutel telt niets');
}

// --- de prestatie staat echt in de lijst ------------------------------------
{
  const src = readFileSync(new URL('../game/js/achievements.js', import.meta.url), 'utf8');
  const def = new RegExp(`\\{ id: '${TRIBUTE.achievement}', cat: 'verkennen', title: '[^']*', desc: HOUSE_ARRIVAL\\.body, hidden: true \\}`).test(src);
  ok(def, 'de verborgen prestatie "Goed eten" staat in achievements.js');
  ok(/id: 'goed_eten'/.test(src), 'de prestatie-id klopt');
}

if (bad) { console.error(`${bad} mislukt`); process.exit(1); }
console.log('beppe_garden_test: ok');

