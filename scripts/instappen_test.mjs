// Het gedeelde in- en uitstapsysteem van bus en trein (instappen.js, wens eigenaar 23-11): deuren, perronkant,
// wachtplekken, planning met wachtenden, stand per tijd, stilstand bij een halte. Deterministisch.
import { INSTAP, zaad, maakRng, busDeurenWereld, treinDeuren, deurenLokaalRijtuig, perronKanten, wachtAantal, wachtplekken, planInstappen, figuurStand, treinBijHalte, makeStilteWacht, dichtsteDeur } from '../game/js/instappen.js';
import { haltedeuren } from '../game/js/haltefiguren.js';
// de rijtuigindeling van railway.js TRAIN_TYPES (dat bestand laadt three.js, dus hier overgenomen)
const TRAIN_TYPES = {
  gtw: { doubleDeck: false, gap: 0.35, segments: [{ len: 17.5, kind: 'car', cab: 1 }, { len: 4.6, kind: 'power' }, { len: 17.5, kind: 'car', cab: -1 }] },
  virm: { doubleDeck: true, gap: 1.0, segments: [{ len: 26.5, kind: 'car', cab: 1 }, { len: 26.5, kind: 'car' }, { len: 26.5, kind: 'car' }, { len: 26.5, kind: 'car', cab: -1 }] },
};

let fail = 0;
const check = (n, ok, x = '') => { if (!ok) { fail++; console.log('FAIL', n, x); } };

// zaad en rng: vast
check('zaad is vast', zaad('lijn1:3') === zaad('lijn1:3') && zaad('a') !== zaad('b'));
const r1 = maakRng(42), r2 = maakRng(42);
check('rng is deterministisch', r1() === r2() && r1() === r2());

// bus: deuren aan de stoepkant (rechts van de rijrichting), richting naar buiten
const bus = { x: 100, y: 50, angle: 0, isBus: true, model: { name: 'bus', len: 11.2, wid: 2.5 } };
const bd = busDeurenWereld(bus, haltedeuren(bus));
check('bus: deuren rechts (y groter bij hoek 0)', bd.every((d) => d.y > bus.y + 1 && d.ny > 0.99));
const bd2 = busDeurenWereld({ ...bus, angle: Math.PI / 2 }, haltedeuren(bus));
check('bus gedraaid: deuren volgen', bd2.every((d) => d.x < bus.x - 1 && d.nx < -0.99));

// trein: deuren per rijtuig, geen deuren in de tussenmodule
const cfg = TRAIN_TYPES.gtw;
let run = 0;
const cars = cfg.segments.map((g) => { const c = { x: 1000 + run + g.len / 2, y: 200, angle: 0, len: g.len, seg: g }; run += g.len + cfg.gap; return c; });
const trein = { cfg, cars };
check('tussenmodule zonder deuren', deurenLokaalRijtuig(cars[1], false).length === 0);
const tdL = treinDeuren(trein, 1), tdR = treinDeuren(trein, -1);
check('trein: vier deuren in een GTW', tdL.length === 4, tdL.length);
check('trein: deuren aan de gekozen kant', tdL.every((d) => d.y > 200 && d.ny > 0) && tdR.every((d) => d.y < 200 && d.ny < 0));
check('trein: deuren binnen het rijtuig', tdL.every((d) => d.x > 1000 && d.x < 1000 + run));
const virm = TRAIN_TYPES.virm;
const vc = virm.segments.map((g, i) => ({ x: i * 27, y: 0, angle: 0, len: g.len, seg: g }));
check('dubbeldekker: twee deuren per rijtuig', treinDeuren({ cfg: virm, cars: vc }, 1).length === 8);

// perronkant: alleen de kant waar perronvloer ligt
const perronLinks = (x, y) => y > 1.7 && y < 6 && x > -60 && x < 60;
check('perron links gevonden', JSON.stringify(perronKanten(perronLinks, 0, 0, 0)) === '[1]');
check('eilandperron: beide kanten', perronKanten((x, y) => Math.abs(y) > 1.7 && Math.abs(y) < 6, 0, 0, 0).length === 2);
check('geen perron: leeg', perronKanten(() => false, 0, 0, 0).length === 0);
check('perron bij een gedraaid spoor', JSON.stringify(perronKanten((x, y) => x < -1.7 && x > -6, 0, 0, Math.PI / 2)) === '[1]');

// wachtenden: bescheiden, vast, niet op elkaar
let lo = 9, hi = 0;
for (let i = 0; i < 200; i++) { const n = wachtAantal(zaad('h' + i), 0, 3); lo = Math.min(lo, n); hi = Math.max(hi, n); }
check('wachtAantal binnen de grenzen', lo === 0 && hi === 3);
check('wachtAantal vast per zaad', wachtAantal(7, 0, 3) === wachtAantal(7, 0, 3));
const anker = { x: 10, y: 10, ux: 1, uy: 0, nx: 0, ny: 1 };
const pl = wachtplekken(anker, 4, 99);
check('vier wachtplekken', pl.length === 4);
check('wachtplekken aan de stoepkant', pl.every((p) => p.y >= 10.3 - 1e-9 && p.y <= 11.4 + 1e-9 && Math.abs(p.x - 10) <= 2.5 + 1e-9));
check('wachtplekken niet op elkaar', pl.every((p, i) => pl.every((q, j) => i === j || Math.hypot(p.x - q.x, p.y - q.y) >= 0.8)));
check('wachtplekken vast per zaad', JSON.stringify(wachtplekken(anker, 4, 99)) === JSON.stringify(pl));

// planning: wachtenden stappen in bij de dichtstbijzijnde deur, uitstappers lopen naar buiten
const rng = maakRng(5);
const wacht = [{ x: bd[0].x + 0.5, y: bd[0].y + 2 }, { x: bd[1].x - 0.3, y: bd[1].y + 2.5 }];
const fig = planInstappen(bd, { board: -1, alight: 2 }, { rng, wachtenden: wacht });
const inst = fig.filter((f) => f.kind === 'in'), uit = fig.filter((f) => f.kind === 'uit');
check('board -1: precies de wachtenden', inst.length === 2 && inst.every((f) => f.w >= 0));
check('wachtende loopt naar de dichtste deur', inst[0].id === bd[0].id && inst[1].id === bd[1].id);
check('wachtende begint op zijn eigen plek', inst[0].from.x === wacht[0].x && inst[0].from.y === wacht[0].y);
check('uitstappers lopen de stoep op', uit.length === 2 && uit.every((f) => f.to.y > f.from.y + 5));
check('instappen na het uitstappen', inst.every((f) => f.delay >= INSTAP.IN_NA));
check('nooit meer dan het maximum', planInstappen(bd, { board: 40, alight: 40 }, { rng }).length <= INSTAP.MAX_BUS);
check('trein: maximum hoger', planInstappen(tdL, { board: 40, alight: 40 }, { rng, max: INSTAP.MAX_TREIN, maxUit: INSTAP.MAX_UIT_TREIN }).length === INSTAP.MAX_TREIN);
check('geen deuren: niemand', planInstappen([], { board: 3, alight: 3 }, { rng }).length === 0);
check('meer instappers dan wachtenden: de rest van de stoep', planInstappen(bd, { board: 4, alight: 0 }, { rng, wachtenden: wacht }).filter((f) => f.w < 0).length === 2);
check('dichtsteDeur', dichtsteDeur(tdL, tdL[3].x + 0.2, tdL[3].y + 3) === 3);

// stand: zonder allocatie, instapper verdwijnt in de deur, uitstapper komt eruit
const st = { x: 0, y: 0, zichtbaar: false, lopen: false, klaar: false };
const f0 = inst[0];
check('figuurStand schrijft in hetzelfde object', figuurStand(f0, 0, st) === st);
check('instapper wacht zichtbaar op zijn beurt', figuurStand(f0, 0, st).zichtbaar && !st.lopen);
check('instapper loopt', figuurStand(f0, f0.delay + f0.duur / 2, st).lopen);
check('instapper weg bij de deur', !figuurStand(f0, f0.delay + f0.duur + 0.1, st).zichtbaar && st.klaar);
const u0 = uit[0];
check('uitstapper eerst onzichtbaar', !figuurStand(u0, 0, st).zichtbaar);
check('uitstapper blijft even staan en is dan klaar', figuurStand(u0, u0.delay + u0.duur + 0.1, st).zichtbaar && !st.klaar && figuurStand(u0, u0.delay + u0.duur + INSTAP.NA_S + 0.1, st).klaar);

// trein bij de halte: stil en met zijn midden bij een halte, niet buiten de kaart
const route = { stops: [{ s: 0, offmap: true }, { s: 500 }, { s: 1200 }] };
check('trein stil bij een halte', treinBijHalte(route, { c: 501, v: 0 }) === 1);
check('rijdende trein telt niet', treinBijHalte(route, { c: 500, v: 3 }) === -1);
check('trein tussen haltes telt niet', treinBijHalte(route, { c: 800, v: 0 }) === -1);
check('halte buiten de kaart telt niet', treinBijHalte(route, { c: 0, v: 0 }) === -1);

// stilstand-teller: één melding per stilstand
const sw = makeStilteWacht(1);
let n = 0;
for (let i = 0; i < 90; i++) if (sw.tik('b1', true, 1 / 30)) n++;
check('één melding na een seconde stilstand', n === 1);
sw.tik('b1', false, 1 / 30);
for (let i = 0; i < 40; i++) if (sw.tik('b1', true, 1 / 30)) n++;
check('na rijden opnieuw', n === 2);
for (let i = 0; i < 5; i++) sw.ruim();
check('niet meer gezien: opgeruimd', sw.grootte === 0);

console.log(fail ? `instappen_test: ${fail} fout` : 'instappen_test ok');
process.exit(fail ? 1 : 0);
