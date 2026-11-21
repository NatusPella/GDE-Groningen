// Interieurs en Samen spelen (epic #1150): het interieur is deterministisch uit de gebouwsleutel, dus host, gast, een gast die later
// aansluit en een nieuwe host na een hostwissel bouwen precies dezelfde kamer; de mensen erin zijn lokaal decor en deterministisch;
// kopen is per speler (geen host-recht, niets over het netwerk); en twee spelers in een pand botsen op dezelfde hal. Puur.
// Draai: node scripts/interior_coop_test.mjs
import { planInterior, interiorSeed, doorState } from '../game/js/interiorrules.js';
import { makeWalk } from '../game/js/interiorwalk.js';
import { npcLook } from '../game/js/interiornpc.js';
import { buyProduct, productFor } from '../game/js/interiorbuy.js';
import { toWorld, toLocal } from '../game/js/interiorframe.js';
import { building } from './interior_fixtures.mjs';
import { mulberry32 } from '../game/js/rng.js';

let bad = 0, n = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.error('FAIL', m + (info ? ` (${info})` : '')); } };

const cases = [['winkel', 'supermarkt'], ['horeca', 'cafe'], ['woning', null], ['kantoor', null], ['kerk', null], ['publiek', 'politie']];
for (const [kind, sub] of cases) {
  const { b, spot } = building(kind, sub, 9, 13, mulberry32(8));
  // host en gast hebben elk hun eigen kopie van het pand (uit dezelfde tegel), in een andere volgorde
  const host = JSON.parse(JSON.stringify(b)), guest = JSON.parse(JSON.stringify(b)), late = JSON.parse(JSON.stringify(b));
  const ph = planInterior(host, { spot });
  // de gast heeft eerst ander werk gedaan en Math.random gebruikt: geen verborgen RNG-toestand
  for (let i = 0; i < 50; i++) Math.random();
  planInterior(building('woning', null, 7, 10, mulberry32(99)).b);
  const pg = planInterior(guest, { spot });
  const pl = planInterior(late, { spot });
  const strip = (p) => JSON.stringify({ k: p.kind, s: p.sub, seed: p.seed, hall: p.hall, door: p.door, layout: p.layout, floorH: p.floorH, stairs: p.stairs });
  ok(strip(ph) === strip(pg), `${kind}/${sub}: host en gast delen dezelfde indeling`);
  ok(strip(ph) === strip(pl), `${kind}/${sub}: een gast die later aansluit bouwt dezelfde kamer`);
  ok(interiorSeed(host) === interiorSeed(guest) && interiorSeed(host) === ph.seed, `${kind}/${sub}: het zaad is de gebouwsleutel`);
  // de mensen: dezelfde winkelier op dezelfde plek, bij elke speler
  const looks = (p) => JSON.stringify(p.layout.npc.map((np, i) => [np.role, np.u, np.v, npcLook(np.role, p.seed, i, p.layout.palette.accent, p.sub)]));
  ok(looks(ph) === looks(pg), `${kind}/${sub}: de mensen staan en zien er bij elke speler hetzelfde uit`);
  // open of op slot: afgeleid uit het zaad van het pand, nooit uit een host-toestand
  ok(JSON.stringify(doorState(ph, 12)) === JSON.stringify(doorState(pg, 12)) && JSON.stringify(doorState(ph, 3)) === JSON.stringify(doorState(pg, 3)), `${kind}/${sub}: de deur is bij iedereen even open of dicht`);
}

// de zaden verschillen per pand (geen gedeelde RNG-staat tussen panden)
{
  const a = planInterior(building('woning', null, 8, 12, mulberry32(1)).b), b2 = planInterior(building('woning', null, 8, 12, mulberry32(2)).b);
  ok(a.seed !== b2.seed, 'twee panden hebben elk hun zaad');
}

// twee spelers in een pand: dezelfde hal, dezelfde meubels; wat de een niet kan, kan de ander ook niet
{
  const { b, spot } = building('winkel', 'bakker', 8, 11, mulberry32(3));
  b.passages = [];
  const p1 = planInterior(JSON.parse(JSON.stringify(b)), { spot }), p2 = planInterior(JSON.parse(JSON.stringify(b)), { spot });
  const w1 = makeWalk(p1, b.pts, () => true), w2 = makeWalk(p2, b.pts, () => true);
  let same = 0, total = 0;
  const rnd = mulberry32(5);
  for (let i = 0; i < 300; i++) {
    const [x, y] = toWorld(p1.frame, p1.hall.u0 + rnd() * (p1.hall.u1 - p1.hall.u0), p1.hall.v0 + rnd() * (p1.hall.v1 - p1.hall.v0));
    const r1 = w1.resolve(x, y, 0.4), r2 = w2.resolve(x, y, 0.4);
    total++;
    if (JSON.stringify(r1) === JSON.stringify(r2)) same++;
  }
  ok(same === total, 'twee spelers in een pand botsen op dezelfde muren en meubels', `${same}/${total}`);
  // een tweede speler in de kamer loopt door de deur zoals de eerste
  const [dx, dy] = toWorld(p1.frame, 0, -0.5);
  ok(w1.resolve(dx, dy, 0.4) === true && w2.resolve(dx, dy, 0.4) === true, 'de deur is voor beide spelers open');
}

// kopen is per speler: twee spelers kopen elk uit hun eigen geld, de een raakt de ander niet, en er is geen host-recht in
{
  const a = { money: 50, health: 40 }, c = { money: 1, health: 90 };
  const prod = productFor('winkel', 'bakker');
  const ra = buyProduct(a, prod), rc = buyProduct(c, prod);
  ok(ra.ok && a.money === 50 - prod.price && a.health > 40, 'speler A koopt uit eigen geld');
  ok(!rc.ok && c.money === 1 && c.health === 90, 'speler B heeft te weinig geld en verliest niets');
  ok(ra.ok && !('host' in prod) && !('toHost' in ra), 'de aankoop kent geen hostrecht');
}

// een speler die binnen is bij een hostwissel: het interieur hangt aan het pand en de speler, niet aan de host
{
  const src = (await import('node:fs')).readFileSync(new URL('../game/js/interiors.js', import.meta.url), 'utf8');
  ok(!/coopRole|isHost|world\.host|hostId/.test(src.replace(/\/\/.*$/gm, '')), 'interiors.js kent geen host: het draait voor iedereen lokaal');
  ok(!/\bfetch\(|WebSocket|mqtt|sendCoop|coopnet/i.test(src), 'interiors.js stuurt niets over het netwerk');
  ok(/\bhoofdspeler\b/.test(src) && !/world\.player\b/.test(src), 'interiors.js leest de speler via hoofdspeler, geen world.player');
}

console.log(bad ? `interior_coop_test: ${bad} van ${n} mislukt` : `interior_coop_test: ${n} controles ok`);
if (bad) process.exitCode = 1;
