// De perronvloer van alle stations (#1348): geen gat in een perron, de hoogtevraag houdt je erop, het perron ligt op zijn spoor.
//   node scripts/perron_vloer_test.mjs   (het deel op de echte kaart: zonder game/world met de provincie: SKIP)
import fs from 'node:fs';
import './node3d.mjs';
import { auditPerronVloer } from './world/perron_vloer_audit.mjs';
import { addPerrons } from '../game/js/elevation.js';
import { heeftStationkaart, laadStationKaart } from './lib/stationkaart.mjs';

let n = 0, bad = 0;
const ok = (c, m, i = '') => { n++; if (!c) { bad++; console.log('FAIL', m, i); } };
const strook = (id, x0, x1, y, hs, z) => { const p = []; for (let x = x0; x <= x1 + 1e-9; x += 4) p.push([x, y, hs, z]); return { id, nm: 'Perron', st: 'Proef', p, r: [] }; };
const bouw = (rows) => addPerrons({ perrons: rows, roads: [], terrainOn: false }, { has: false });
const spoorY = 0;   // een recht spoor langs de x-as op z = 0
const trackDist = (x, y) => Math.abs(y - spoorY);
const railZ = () => 0;
const audit = (rows, elev = bouw(rows)) => auditPerronVloer({ rows, elev, railZ, trackDist });

// een gewoon perron, 3,2 m breed, 1,7 m van het spoor (rand), op de spoorvloer + 1,02
{
  const goed = [strook('goed', 0, 80, 3.3, 1.6, 1.02)];
  ok(audit(goed).length === 0, 'een gewoon perron is in orde', JSON.stringify(audit(goed)));
}
// een gat: een stuk van de vloer ontbreekt (de rij is er, maar het hoogtemodel heeft het stuk niet)
{
  const rij = strook('gat', 0, 80, 3.3, 1.6, 1.02);
  // het model heeft de strook in twee stukken met 20 m ertussen (zoals een stuk dat niet in de bouw kwam); de audit kijkt naar de hele strook
  const elev = bouw([{ ...rij, id: 'gat-a', p: rij.p.filter((q, i) => i <= 7) }, { ...rij, id: 'gat-b', p: rij.p.filter((q, i) => i >= 13) }]);
  const res = audit([rij], elev);
  ok(res.some((r) => /zonder perronvloer/.test(r.wat)), 'een stuk zonder vloer in het hoogtemodel wordt gevonden', JSON.stringify(res));
  ok(res.some((r) => /laat vallen/.test(r.wat)), 'en de hoogtevraag laat daar vallen', JSON.stringify(res));
}
// een hals en een dubbel punt
{
  const hals = strook('hals', 0, 40, 3.3, 1.6, 1.02); hals.p[5][2] = 0.3;
  ok(audit([hals]).some((r) => /hals/.test(r.wat)), 'een hals in een perron wordt gevonden');
  const dubbel = strook('dubbel', 0, 40, 3.3, 1.6, 1.02); dubbel.p.splice(4, 0, dubbel.p[4].slice());
  ok(audit([dubbel]).some((r) => /dubbel punt/.test(r.wat)), 'een dubbel punt wordt gevonden');
}
// een verkeerde hoogte, een perron op het spoor en een perron dat van zijn spoor is losgeraakt
{
  ok(audit([strook('hoog', 0, 80, 3.3, 1.6, 1.4)]).some((r) => /spoorvloer/.test(r.wat)), 'een perron op de verkeerde hoogte wordt gevonden');
  ok(audit([strook('opspoor', 0, 80, 1.0, 1.6, 1.02)]).some((r) => /dichter dan/.test(r.wat)), 'een perron dat tegen het spoor ligt wordt gevonden');
  ok(audit([strook('weg', 0, 80, 9, 1.6, 1.02)]).some((r) => /van zijn spoor af/.test(r.wat)), 'een perron dat van het spoor af ligt wordt gevonden');
  ok(audit([{ id: 'leeg', st: 'Proef', p: [[0, 3, 1.6, 1.02]], r: [] }]).some((r) => /geen vloer/.test(r.wat)), 'een perron van één punt heeft geen vloer');
}

// de echte kaart: elk perron van elk station, en een landhalte volgt zijn lijn
if (!heeftStationkaart()) {
  console.log('SKIP perron_vloer_test (echte kaart): geen game/world met de provincie');
} else {
  const K = await laadStationKaart();
  ok(K.rows.length >= 30, 'de kaart heeft de perrons van de stad en van de landhaltes', String(K.rows.length));
  ok(K.landhaltes.length >= 20 && K.landhaltes.every((h) => h.route), 'elke landhalte staat op een lijn', K.landhaltes.filter((h) => !h.route).map((h) => h.naam).join(', '));
  const res = auditPerronVloer({ rows: K.rows, elev: K.elev, railZ: K.railZ, trackDist: K.trackDist, spoorRij: (r) => /^halte-/.test(r.id) });
  for (const r of res) console.log('  ', r.st, r.id, r.wat);
  // #1346: het perronkit van de streekplekken (een plaat van 0,9 m op maaiveld) lag onder het hoge perron van Noord over de Kastanjelaan
  const SP = await import('../game/js/streekplekken.js');
  const PF = await import('../game/js/propfilter.js');
  const kits = JSON.parse(fs.readFileSync(new URL('../game/streekplekken.json', import.meta.url), 'utf8')).plekken.filter((p) => p.t === 'perron' && Math.hypot(p.x + 575, p.y + 1190) < 60);
  ok(kits.length >= 2, 'de kits bij Groningen Noord zijn er', String(kits.length));
  for (const p of kits) {
    const parts = SP.partsToWorld(p);
    ok(PF.perronKitDubbel(K.map, parts), `het kit ${p.id} bij Noord is een dubbel van het echte perron`);
    const over = PF.dropStreekParts(parts, K.map, 'perron').filter((q) => q.w >= 8 && q.h < 2 && PF.plaatOverWeg(K.map, q));
    ok(over.length === 0, `geen plaat van kit ${p.id} ligt over een weg`);
  }
  ok(res.length === 0, `alle perrons van alle stations hebben een vloer, hoogte en spoor (${K.rows.length} stroken)`, `${res.length} problemen`);
}

console.log(bad ? `${bad} van ${n} mislukt` : `perron_vloer_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);
