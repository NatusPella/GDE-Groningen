// De lokale kaart van de minimap (24-11): transformatie, bijsnijden, draaiing, begin en einde van de context, en de bouwers van veld, baan en circuit.
//   node scripts/localmap_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as L from '../game/js/localmap.js';
import { maakVoetbalKaart, maakPadelKaart, maakKartKaart } from '../game/js/localmapvelden.js';
import { PITCH } from '../game/js/voetbalrules.js';
import { KARTBAAN_TRACK, KARTBAAN_FRAME, KARTBAAN_WIDTH } from '../game/js/kartbaanspoor.js';

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const bij = (a, b, m, e = 1e-6) => ok(Math.abs(a - b) < e, `${m}: ${a} vs ${b}`);
const lees = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
const P = [0, 0];

// een opnemend ctx: de vaste laag tekent zonder fouten en alleen met geldige kleuren
function paintProef(d) {
  const log = { n: 0, kleuren: new Set() };
  const g = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => { log.n++; }), set: (t, k, v) => { if (k === 'fillStyle' || k === 'strokeStyle') log.kleuren.add(String(v)); t[k] = v; return true; } });
  d.paint(g, 5); ok(log.n > 10, 'de vaste laag tekent');
  for (const k of log.kleuren) ok(/^#[0-9a-f]{6}$/i.test(k) || /^rgba\(/.test(k), 'een geldige kleur: ' + k);
}

// 1. de draaiing: de gekozen wereldhoek wijst op het scherm omhoog
for (const up of [0, 1, Math.PI / 2, -2.5, Math.PI]) {
  const rot = L.rotatieOmhoog(up), d = { cx: 100, cy: 50, ax: 0, hw: 10, hh: 10 };
  L.naarKaart(d, rot, 2, 250, d.cx + Math.cos(up) * 5, d.cy + Math.sin(up) * 5, P);
  bij(P[0], 125, `omhoog (x) bij ${up}`); ok(P[1] < 125 - 9.9, `omhoog (y) bij ${up}`);
}
// 2. het midden van het vak is het midden van de kaart, ook gedraaid
{ const d = { cx: 7, cy: -3, ax: 0.4, hw: 5, hh: 9 }; L.naarKaart(d, 1.1, 3, 250, 7, -3, P); bij(P[0], 125, 'midden x'); bij(P[1], 125, 'midden y'); }
// 3. de schaal: het gedraaide vak past met de rand
{
  const d = { cx: 0, cy: 0, ax: 0, hw: 15, hh: 25 };
  bij(L.passendeSchaal(d, 0, 250, 8), (125 - 8) / 25, 'staand veld: de lengte begrenst');
  bij(L.passendeSchaal(d, Math.PI / 2, 250, 8), (125 - 8) / 25, 'een kwartslag: dezelfde schaal');
  ok(L.passendeSchaal(d, Math.PI / 4, 250, 8) < L.passendeSchaal(d, 0, 250, 8), 'schuin past kleiner');
  for (const rot of [0, 0.3, 1.2, 2.9]) {
    const s = L.passendeSchaal(d, rot, 250, 8);
    for (const [x, y] of [[-15, -25], [15, -25], [15, 25], [-15, 25]]) { L.naarKaart(d, rot, s, 250, x, y, P); ok(P[0] >= 8 - 1e-6 && P[0] <= 242 + 1e-6 && P[1] >= 8 - 1e-6 && P[1] <= 242 + 1e-6, `hoek binnen de kaart bij ${rot}`); }
  }
}
// 4. bijsnijden: een punt buiten het vak blijft aan de rand
{ const o = [-40, 300]; ok(L.klemOpKaart(o, 250, 6) === false && o[0] === 6 && o[1] === 244, 'buiten: op de rand geklemd'); const q = [100, 100]; ok(L.klemOpKaart(q, 250, 6) === true && q[0] === 100, 'binnen blijft staan'); }
// 5. de vaste laag: begrensd, en alleen opnieuw bij een andere sleutel of een echt andere maat
{
  const d = { key: 'a', hw: 15, hh: 25 }, m = L.vasteMaat(d, 4, 1); ok(m.h <= L.VAST_MAX_PX + 2, 'maat binnen de grens');
  ok(!L.vasteVerouderd({ key: 'a', res: m.res }, d, m), 'dezelfde laag blijft'); ok(L.vasteVerouderd({ key: 'b', res: m.res }, d, m), 'een andere sleutel: opnieuw'); ok(L.vasteVerouderd({ key: 'a', res: m.res * 2 }, d, m), 'een andere schaal: opnieuw'); ok(L.vasteVerouderd(null, d, m), 'leeg: opnieuw');
  ok(L.vasteMaat({ key: 'x', hw: 500, hh: 500 }, 4, 2).w <= L.VAST_MAX_PX + 1, 'een enorm vak blijft begrensd');
}
// 6. de hoek: de kortste kant
bij(L.kortsteHoek(3, -3), 2 * Math.PI - 6, 'kortste hoek over de naad'); bij(L.kortsteHoek(0, 0.5), 0.5, 'kortste hoek recht');

// 7. begin en einde van de context: de wereldkaart komt terug zodra de aanmelder null geeft, op welke manier de activiteit ook eindigde
{
  const gaat = { v: null };
  L.registerLocalMap('proef', () => gaat.v);
  const w = {};
  ok(L.activeLocalMap(w) === null, 'zonder activiteit: de wereldkaart');
  const d = { id: 'proef', cx: 0, cy: 0, ax: 0, hw: 5, hh: 5, up: 0, dots: [], n: 0 };
  for (const reden of ['afbreken', 'sterven', 'verbinding weg', 'laden', 'host-wissel', 'einde']) { gaat.v = d; ok(L.activeLocalMap(w) === d, `${reden}: ervoor lokaal`); gaat.v = null; ok(L.activeLocalMap(w) === null, `${reden}: erna de wereldkaart`); }
  gaat.v = { id: 'kapot', cx: NaN, cy: 0, hw: 1, hh: 1 }; ok(L.activeLocalMap(w) === null, 'een kapotte beschrijving valt terug op de wereldkaart');
  L.registerLocalMap('stuk', () => { throw new Error('kapot'); }); gaat.v = null; ok(L.activeLocalMap(w) === null, 'een aanmelder met een fout laat de wereldkaart staan');
  L.unregisterLocalMap('stuk'); L.unregisterLocalMap('proef'); ok(!L.localMapIds().includes('proef'), 'afgemeld');
}
// 8. de bron: de minimap vraagt elke tekenbeurt opnieuw (geen vlag die blijft hangen) en zet de wereldkaart terug; elke activiteit meldt zich aan
{
  const hud = lees('hud_panel.js');
  ok(/const lokaal = activeLocalMap\(world\);\s*\n\s*if \(lokaal\) \{[\s\S]*?return;\s*\n\s*\}\s*\n\s*if \(mmLokaal\)/.test(hud), 'drawMinimap vraagt elke beurt activeLocalMap en keert terug naar de wereldkaart als die null is');
  for (const [f, id] of [['voetbal.js', 'voetbal'], ['padel.js', 'padel'], ['kartbaan.js', 'kartbaan']]) ok(new RegExp(`registerLocalMap\\('${id}'`).test(lees(f)), `${f} meldt zijn lokale kaart aan`);
  ok(/if \(!g \|\| !g\.f\) return null/.test(lees('padel.js')), 'padel geeft null zonder potje');
  ok(/if \(!g \|\| !g\.karts/.test(lees('kartbaan.js')), 'de kartbaan geeft null zonder race');
  ok(/registerLocalMap\('voetbal', \(\) => game && game\.sim/.test(lees('voetbal.js')), 'voetbal geeft null zonder wedstrijd');
  ok(!/activeLocalMap|localmap/.test(lees('mapview.js')), 'de volledige kaart (M) blijft de wereldkaart');
}

// 9. voetbal: stippen, kleuren, richting
{
  const site = { x: 1804.3, y: 1458.1, a: 0 };
  const toWorld = (fx, fy) => { const lx = -fx, ca = Math.cos(site.a), sa = Math.sin(site.a); return { x: site.x + lx * ca - fy * sa, y: site.y + lx * sa + fy * ca }; };
  const mk = (id, team, x, y, rol = 'veld') => ({ id, team, x, y, face: team === 0 ? Math.PI / 2 : -Math.PI / 2, rol });
  const sim = { teams: [{ shirt: 0x2f9e5b, keeperShirt: 0xf0c020 }, { shirt: 0xc0482b, keeperShirt: 0x4aa3d8 }], bal: { x: 3, y: 4 }, spelers: [mk(0, 0, 0, -20, 'keeper'), mk(1, 0, 2, 0), mk(2, 1, -2, 5), mk(3, 1, 0, 20, 'keeper')] };
  const kaart = maakVoetbalKaart();
  const d = kaart.zet(sim, { site, toWorld, team: 0, eigenId: 1, pitch: PITCH });
  ok(d.n === 5, 'drie anderen, jijzelf en de bal: ' + d.n);
  ok(d.dots.slice(0, d.n).filter((s) => s.eigen).length === 1 && d.dots.slice(0, d.n).filter((s) => s.vorm === 'bal').length === 1, 'één pijl en één bal');
  ok(d.dots.slice(0, d.n).filter((s) => s.keeper).length === 2, 'beide keepers onderscheidbaar');
  ok(d.dots.some((s) => s.kleur === '#f0c020' && s.keeper) && d.dots.some((s) => s.kleur === '#c0482b' && s.vorm === 'ruit'), 'clubkleuren: keepershirt en de andere ploeg als ruit');
  L.naarKaart(d, L.rotatieOmhoog(d.up), 5, 250, toWorld(0, 10).x, toWorld(0, 10).y, P); ok(P[1] < 125 && Math.abs(P[0] - 125) < 1e-6, 'de aanvalsrichting van team 0 wijst omhoog');
  const d1 = kaart.zet(sim, { site, toWorld, team: 1, eigenId: 2, pitch: PITCH });
  L.naarKaart(d1, L.rotatieOmhoog(d1.up), 5, 250, toWorld(0, -10).x, toWorld(0, -10).y, P); ok(P[1] < 125, 'team 1 (derby) valt aan naar -y: dat wijst omhoog');
  const d3 = kaart.zet(sim, { site, toWorld, team: 0, eigenId: 1, pitch: PITCH }); ok(d3 === d && d3.dots === d.dots, 'dezelfde objecten per beeld (geen allocatie)');
  const eig = d.dots.find((s) => s.eigen); const f = toWorld(2, 1), q = toWorld(2, 0); bij(eig.hoek, Math.atan2(f.y - q.y, f.x - q.x), 'de pijl kijkt waar je speler kijkt');
  const rot = L.rotatieOmhoog(d.up), s = L.passendeSchaal(d, rot, 250, 10);
  for (const fy of [-PITCH.L / 2 - 1.3, PITCH.L / 2 + 1.3]) { const w = toWorld(0, fy); L.naarKaart(d, rot, s, 250, w.x, w.y, P); ok(P[1] > 0 && P[1] < 250, 'de doelen liggen in beeld'); }
  ok(s * PITCH.L >= 150, 'het veld vult de kaart (leesbaar): ' + (s * PITCH.L).toFixed(0) + ' px lang');
  const site2 = { x: 500, y: -200, a: 0.7 }; const tw2 = (fx, fy) => { const lx = -fx; return { x: site2.x + lx * Math.cos(0.7) - fy * Math.sin(0.7), y: site2.y + lx * Math.sin(0.7) + fy * Math.cos(0.7) }; };
  const d2 = kaart.zet(sim, { site: site2, toWorld: tw2, team: 0, eigenId: 1, pitch: PITCH }); const r2 = L.rotatieOmhoog(d2.up), s2 = L.passendeSchaal(d2, r2, 250, 10);
  for (const [fx, fy] of [[13, 21], [-13, 21], [13, -21], [-13, -21]]) { const w = tw2(fx, fy); L.naarKaart(d2, r2, s2, 250, w.x, w.y, P); ok(P[0] > 0 && P[0] < 250 && P[1] > 0 && P[1] < 250, 'een gedraaid park: de hoeken in beeld'); }
  L.naarKaart(d2, r2, s2, 250, tw2(0, 10).x, tw2(0, 10).y, P); ok(P[1] < 125 && Math.abs(P[0] - 125) < 1e-6, 'ook gedraaid wijst de aanval omhoog');
  paintProef(d); paintProef(d2);
}
// 10. padel: eigen kant onderaan, net in het midden
{
  const f = { cx: 300, cy: 100, rot: 0.5 }; const c = Math.cos(f.rot), s = Math.sin(f.rot);
  const toMap = (u, v) => ({ x: f.cx - s * u + c * v, y: f.cy + c * u + s * v });
  const kaart = maakPadelKaart();
  const o = { f, toMap, team: 0, jij: { u: 1, v: -8 }, anderen: [{ u: -2, v: -3, team: 0 }, { u: 2, v: 8, team: 1 }, { u: -2, v: 8, team: 1 }], nAnderen: 3, bal: { u: 0, v: 2 } };
  const d = kaart.zet(o); ok(d.n === 5, 'drie anderen, jij en de bal');
  const rot = L.rotatieOmhoog(d.up), sc = L.passendeSchaal(d, rot, 250, 10);
  L.naarKaart(d, rot, sc, 250, toMap(0, -8).x, toMap(0, -8).y, P); ok(P[1] > 125, 'jouw helft staat onderaan');
  L.naarKaart(d, rot, sc, 250, toMap(0, 8).x, toMap(0, 8).y, P); ok(P[1] < 125, 'de tegenstander bovenaan');
  for (const [u, v] of [[5, 10], [-5, 10], [5, -10], [-5, -10]]) { L.naarKaart(d, rot, sc, 250, toMap(u, v).x, toMap(u, v).y, P); ok(P[0] > 0 && P[0] < 250 && P[1] > 0 && P[1] < 250, 'de hoeken van de baan in beeld'); }
  bij(d.ax, f.rot - Math.PI / 2, 'x-as van het vak'); const e0 = toMap(0, 0), e1 = toMap(0, 1); bij(Math.atan2(e1.y - e0.y, e1.x - e0.x), d.ax + Math.PI / 2, 'de y-as van het vak is +v');
  const d2 = kaart.zet({ ...o, team: 1 }); L.naarKaart(d2, L.rotatieOmhoog(d2.up), sc, 250, toMap(0, 8).x, toMap(0, 8).y, P); ok(P[1] > 125, 'team 1 ziet zijn eigen helft (v > 0) onderaan');
  paintProef(d);
}
// 11. kartbaan: alleen het circuit, noord boven, alle karts in beeld
{
  const T = KARTBAAN_TRACK, toW = (u, v) => KARTBAAN_FRAME.toW(u, v);
  const kaart = maakKartKaart(T, toW, KARTBAAN_WIDTH);
  const karts = [0, 1, 2, 3].map((i) => { const q = toW(T.u[i * 30], T.v[i * 30]); return { x: q.x, y: q.y, a: 0 }; });
  const d = kaart.zet({ karts }); ok(d.n === 4 && d.dots.slice(0, 4).filter((s) => s.eigen).length === 1, 'vier karts, één van jou');
  ok(d.up === -Math.PI / 2 && L.rotatieOmhoog(d.up) === 0, 'het circuit staat noord boven en stil');
  const sc = L.passendeSchaal(d, 0, 250, 10);
  for (let i = 0; i < T.N; i += 7) { const q = toW(T.u[i], T.v[i]); L.naarKaart(d, 0, sc, 250, q.x, q.y, P); ok(P[0] > 0 && P[0] < 250 && P[1] > 0 && P[1] < 250, 'elk punt van de baan in beeld'); }
  ok(Math.max(d.hw, d.hh) * sc >= 100, 'het circuit vult de kaart');
  paintProef(d);
}
console.log(`localmap_test: ${n} controles ok`);
