// Zichtbare voertuigschade (#205): zones, losse onderdelen, fases (game/js/vehicledamage.js).
//   node scripts/vehicledamage_test.mjs
import { zoneOf, zoneTotals, losseOnderdelen, nieuwLos, onderdelenPrijs, schadeFase, faseEffect, schadeTekst, kapRookt, ONDERDELEN, SMOKE_HEALTH, FIRE_HEALTH } from '../game/js/vehicledamage.js';

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const L = 4, W = 1.8;

check('neus is voor', zoneOf(2, 0, L, W) === 'voor');
check('staart is achter', zoneOf(-2, 0.1, L, W) === 'achter');
check('flank is zijkant', zoneOf(0.2, 0.9, L, W) === 'zijkant' && zoneOf(0, -0.9, L, W) === 'zijkant');
check('hoek naar de langste as', zoneOf(1.9, 0.5, L, W) === 'voor');
check('rare maten blijven heel', ['voor', 'achter', 'zijkant'].includes(zoneOf(1, 1, 0, 0)));

const t = zoneTotals([[2, 0, 0.5], [2, 0.1, 0.6], [0, 0.9, 1], [-2, 0, 0.3], null, [NaN, 0, 1], [1, 1, 'x']], L, W);
check('sommen per zone', Math.abs(t.voor - 1.1) < 1e-9 && t.zijkant === 1 && Math.abs(t.achter - 0.3) < 1e-9, JSON.stringify(t));
check('rommel geeft nullen', zoneTotals(null).voor === 0 && zoneTotals('x').achter === 0);

check('geen schade, geen losse delen', losseOnderdelen(zoneTotals([], L, W)).length === 0);
check('spiegels bij zijkant 0.9', losseOnderdelen({ voor: 0, achter: 0, zijkant: 0.9 }).join() === 'spiegels');
check('alles los bij zware schade', losseOnderdelen({ voor: 3, achter: 3, zijkant: 3 }).length === Object.keys(ONDERDELEN).length);
const log1 = [[2, 0, 0.6]], log2 = [[2, 0, 0.6], [2, 0.2, 0.6]];
check('nieuw los door de klap', nieuwLos(log1, log2, L, W).join() === 'grille' && nieuwLos(log2, log2, L, W).length === 0);
check('prijs van losse delen', onderdelenPrijs(['grille', 'uitlaat', 'bestaatniet']) === 35);

const mk = (o) => ({ health: 100, dentLog: [], ...o });
check('heel', schadeFase(mk({}), L, W) === 'heel');
check('gedeukt door een deuk', schadeFase(mk({ dentLog: [[2, 0, 0.5]] }), L, W) === 'gedeukt');
check('gedeukt door gezondheid', schadeFase(mk({ health: 80 }), L, W) === 'gedeukt');
check('rook op de grens', schadeFase(mk({ health: SMOKE_HEALTH }), L, W) === 'rook' && schadeFase(mk({ health: SMOKE_HEALTH + 1 }), L, W) === 'gedeukt');
check('brand op de grens', schadeFase(mk({ health: FIRE_HEALTH }), L, W) === 'brand' && schadeFase(mk({ health: FIRE_HEALTH + 1 }), L, W) === 'rook');
check('uitgevallen = brand', schadeFase(mk({ health: 50, disabled: true }), L, W) === 'brand');
check('wrak wint', schadeFase(mk({ health: 0, wrecked: true, disabled: true }), L, W) === 'wrak');
check('zonder voertuig heel', schadeFase(null) === 'heel' && schadeFase({ health: NaN }, L, W) === 'heel');
check('effecten', faseEffect('heel').rook === 0 && faseEffect('rook').vlam === 0 && faseEffect('rook').rook > 0 && faseEffect('brand').vlam === 1 && faseEffect('wrak').vlam === 1);
check('na reparatie (leeg logboek, 100) weer heel', schadeFase(mk({ health: 100, dentLog: [] }), L, W) === 'heel' && losseOnderdelen(zoneTotals([], L, W)).length === 0);

const tekst = schadeTekst(mk({ health: 70, dentLog: [[2, 0, 1.2], [0, 0.9, 1]] }), L, W);
check('schadetekst', tekst === 'Rookt (deuken voor en zijkant). Los: grille en spiegels', tekst);
check('schadetekst heel', schadeTekst(mk({}), L, W) === 'Heel');

// scheve kap: rook al bij matige schade
const kapV = (health, voor) => ({ health, dentLog: voor ? [[1.8, 0, voor]] : [] });
check('kap scheef + matige schade rookt', kapRookt(kapV(70, 0.9), L, W) && schadeFase(kapV(70, 0.9), L, W) === 'rook');
check('zonder kapschade geen rook bij 70', !kapRookt(kapV(70, 0), L, W) && schadeFase(kapV(70, 0), L, W) === 'gedeukt');
check('kap scheef maar bijna heel: geen rook', !kapRookt(kapV(95, 0.9), L, W));
check('wrak rookt niet via de kap', !kapRookt({ health: 10, wrecked: true, dentLog: [[1.8, 0, 2]] }, L, W));

console.log(bad ? `${bad} mislukt` : 'vehicledamage_test: alles goed');
process.exit(bad ? 1 : 0);
