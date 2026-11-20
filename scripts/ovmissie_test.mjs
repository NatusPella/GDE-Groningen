// OV-missies per halte en station (#985): pure regels van ovmissie.js.
import assert from 'node:assert';
import { prepareLine } from '../game/js/busroutes.js';
import { planRide, makeRide } from '../game/js/busride.js';
import { haltesNabij, dichtsteHalte, halteOpties, haltePrompt, halteKaart, stationOpties, treinPlek, stationKaart, stationRegel, HALTE_ZIEN_R } from '../game/js/ovmissie.js';

const a = prepareLine({ id: 'a', ref: '7', pts: [[0, 0], [1000, 0], [2000, 0]], stops: [{ x: 0, y: 0 }, { x: 900, y: 0 }, { x: 2000, y: 0 }] });
const b = prepareLine({ id: 'b', ref: '9', pts: [[900, -500], [900, 0], [900, 600]], stops: [{ x: 900, y: -500 }, { x: 905, y: 3 }, { x: 900, y: 600 }] });
const far = prepareLine({ id: 'c', ref: '1', pts: [[50000, 0], [51000, 0], [52000, 0]], stops: [{ x: 50000, y: 0 }, { x: 51000, y: 0 }, { x: 52000, y: 0 }] });
const lines = [a, b, far];

// zoeken: alleen wat dichtbij ligt, ook met veel lijnen
const rond = haltesNabij(lines, 900, 0, HALTE_ZIEN_R);
assert.strictEqual(rond.length, 1, 'twee lijnen op een plek zijn een halte');
assert.strictEqual(rond[0].ingangen.length, 2);
assert.strictEqual(haltesNabij(lines, 25000, 0, 500).length, 0, 'leeg gebied');
assert.strictEqual(haltesNabij(lines, 50000, 0, 100).length, 1, 'verre lijn gevonden');
assert.strictEqual(haltesNabij(lines, 800, 0, HALTE_ZIEN_R)[0].id, haltesNabij(lines, 1000, 0, HALTE_ZIEN_R)[0].id, 'stabiele id');
assert.strictEqual(dichtsteHalte(lines, 902, 0).naam, rond[0].naam);
assert.strictEqual(dichtsteHalte(lines, 400, 0), null, 'te ver van elke paal');

// opties: elke richting met een halte verder
const h = dichtsteHalte(lines, 900, 0);
const o = halteOpties(h);
assert.ok(o.length >= 3, 'lijn a heen en terug, lijn b heen en terug');
assert.ok(o.every((x) => x.bestemming && x.volgende && x.haltes >= 1));
const eind = halteOpties(dichtsteHalte(lines, 0, 0));
assert.strictEqual(eind.length, 1, 'bij de beginhalte maar een richting');
assert.strictEqual(eind[0].dir, 1);

// de optie past op de bestaande rit (planRide/makeRide)
const ride = makeRide(o[0].line, { dir: o[0].dir, first: o[0].eerst, max: 8 });
assert.ok(ride.table.length >= 2 && ride.table[0].arrive === 0);
assert.strictEqual(planRide(a, 0, 0).dir, 1);

// prompt en kaart
const p = haltePrompt(h);
assert.strictEqual(p.key, 'E');
assert.ok(/Halte /.test(p.label) && !p.dim);
assert.ok(haltePrompt(h, 'Niet nu').dim);
assert.strictEqual(haltePrompt(null), null);
const k = halteKaart(o[0]);
assert.ok(k.doel && k.afloop && k.regels.length <= 3 && k.regels[0].inv.stappen.every((s) => s.icoon && s.label));

// stations
const route = { name: 'Noord', len: 20000, stops: [{ name: 'Weg', s: 0, offmap: true }, { name: 'Alpha', s: 3000 }, { name: 'Beta', s: 6000 }, { name: 'Gamma', s: 9000 }, { name: 'Delta', s: 12000 }, { name: 'Ver', s: 20000, offmap: true }] };
const st = { name: 'Beta', stops: [{ route, idx: 2, s: 6000 }] };
const so = stationOpties(st);
assert.strictEqual(so.length, 2);
assert.deepStrictEqual(so.find((x) => x.dir > 0).namen, ['Gamma', 'Delta', 'Ver'].slice(0, 2), 'buiten de kaart telt niet');
assert.strictEqual(so.find((x) => x.dir < 0).bestemming, 'Alpha');
assert.ok(so.every((x) => /^Noorderspoor naar /.test(x.tekst) && x.spoor >= 1));
const eindstation = stationOpties({ name: 'Delta', stops: [{ route, idx: 4, s: 12000 }] });
assert.strictEqual(eindstation.length, 1, 'aan het eind van de kaart maar een richting');
assert.strictEqual(stationOpties(null).length, 0);
const pl = treinPlek(so.find((x) => x.dir > 0));
assert.strictEqual(pl.cab, 1);
assert.strictEqual(pl.c, 6000);
assert.ok(stationKaart(so[0]).doel && stationRegel(so[0]).includes('Noorderspoor'));
console.log('ovmissie_test: ok');
