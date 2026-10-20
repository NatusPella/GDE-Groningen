// Hoogteprofielen van provinciebruggen (#235): een viaduct over een straat krijgt een profiel
// (dek omhoog, straat blijft), het profiel gaat in de heights-sectie van de tegel en past bij
// het stuk weg dat erin ligt, en de echte extract (als die er is) blijft onder de drempel.
//   node scripts/province_profile_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as G from '../game/js/gdt.js';
import * as WB from '../game/js/worldbuilder.js';
import { worldToWgs } from '../game/js/rdnew.js';
import { features, tileBlob } from './world/build_corridor.mjs';
import { profileFeats, cutZ, isFlat } from './world/province_profile.mjs';
import { auditViaducts, MIN_SEP, LIMIT, auditProvince } from './world/viaduct_audit.mjs';

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

const X0 = 1000, Y0 = 1000; // ergens in de tegelwereld, ver van de oorsprong
const way = (id, tags, pts) => ({ type: 'way', id, tags, g: pts.map(([x, y]) => worldToWgs(X0 + x, Y0 + y)) });
const els = [
  way(1, { highway: 'trunk' }, [[-400, 0], [-120, 0]]),
  way(2, { highway: 'trunk', bridge: 'yes', layer: '1' }, [[-120, 0], [120, 0]]),
  way(3, { highway: 'trunk' }, [[120, 0], [400, 0]]),
  way(4, { highway: 'residential' }, [[3.3, -200], [3.3, 200]]),
  way(5, { highway: 'secondary', bridge: 'yes', layer: '1' }, [[300, 500], [300, 700]]), // brug over niets
];
const feats = features(els, { urbanAt: () => 0, village: () => false, signs: false });
const roads = () => feats.filter((f) => f.kind === 'roads').map((f) => f.row);
const byOsm = (id) => roads().find((r) => r.osm === id);
{
  const before = auditViaducts(roads(), []);
  ok(before.length === 1 && !before[0].separated, 'zonder profiel: één onscheiden viaduct', String(before.length));
  const info = profileFeats(feats);
  const deck = byOsm(2), street = byOsm(4);
  ok(info.profiled >= 1 && deck.z, 'het viaduct krijgt een profiel', JSON.stringify(info));
  const after = auditViaducts(roads(), []);
  ok(after.length === 1 && after[0].separated, 'met profiel: gescheiden', after[0] && after[0].sep.toFixed(2));
  ok(after[0].sep >= MIN_SEP, 'dek ruim boven de straat', after[0].sep.toFixed(2));
  ok(!street.z || isFlat(street.z) || Math.max(...street.z) < 0.3, 'de straat eronder blijft op de grond');
  ok(Math.abs(deck.z[0]) < 0.5 || deck.z.length > 2, 'het dek loopt aan de einden op de weg aan');
  ok(!byOsm(5).z, 'een brug over niets blijft vlak (geen profiel zonder reden)');
  const grade = (r) => { let m = 0; for (let i = 0; i + 1 < r.pts.length; i++) { const L = Math.hypot(r.pts[i + 1][0] - r.pts[i][0], r.pts[i + 1][1] - r.pts[i][1]); if (L > 2) m = Math.max(m, Math.abs(r.z[i + 1] - r.z[i]) / L); } return m; };
  ok(grade(deck) <= 0.06, 'helling van het dek binnen de grens van een N-weg', (grade(deck) * 100).toFixed(1) + ' %');
  for (const id of [1, 3]) { const r = byOsm(id); if (r.z) ok(grade(r) <= 0.06, `oprit ${id} binnen de grens`, (grade(r) * 100).toFixed(1) + ' %'); }
  // het stuk in een tegel: z hoort bij de punten
  const piece = deck.pts.slice(0, 3);
  const z = cutZ(deck, piece);
  ok(z.length === 3 && z.every((q, i) => Math.abs(q - deck.z[i]) < 0.011), 'cutZ geeft de hoogte op de hoekpunten');
  const mid = [(deck.pts[0][0] + deck.pts[1][0]) / 2, (deck.pts[0][1] + deck.pts[1][1]) / 2];
  const zm = cutZ(deck, [mid])[0];
  ok(Math.abs(zm - (deck.z[0] + deck.z[1]) / 2) < 0.02, 'cutZ interpoleert tussen twee hoekpunten');
}
// de tegel: roads zonder z, heights met z, gid's gelijk
{
  const [i, j] = G.tileIndexOf(X0, Y0);
  const gid = { buildings: 1, roads: 1, water: 1, green: 1, trees: 1, rails: 1, canopies: 1, furniture: 1, parcels: 1 };
  const tb = tileBlob(i, j, feats, gid, G.FLAG ? 0 : 0, 'test', { tiles: 0, hsrc: {}, buildings: 0 });
  ok(!!tb, 'tegel gebouwd');
  const blob = G.decodeBlob(tb.bytes);
  const sec = (t) => blob.sections.find((s) => s.type === t);
  const roadsSec = sec(G.SECTION.ROADS), hs = sec(G.SECTION.HEIGHTS);
  ok(roadsSec && hs, 'ROADS- en HEIGHTS-sectie', String(!!hs));
  if (roadsSec && hs) {
    ok(roadsSec.rows.every((r) => r.z === undefined), 'het profiel staat niet in de wegrij zelf');
    const ids = new Set(roadsSec.rows.map((r) => r.gid));
    ok(hs.rows.length >= 1 && hs.rows.every((r) => ids.has(r.gid) && r.z.length >= 2 && Array.isArray(r.st) && r.st.length === r.z.length - 1), 'heights-rijen horen bij wegen van de tegel');
    const deckRow = roadsSec.rows.find((r) => r.osm === 2);
    const h = deckRow && hs.rows.find((r) => r.gid === deckRow.gid);
    ok(h && h.z.length === deckRow.pts.length && Math.max(...h.z) > 3, 'het dek heeft een profiel van gelijke lengte, hoger dan 3 m', h && Math.max(...h.z).toFixed(1));
  }
}
// de echte extract (alleen als die er is): onder de drempel
{
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/cache/province');
  const use = fs.existsSync(dir) ? dir : null;
  if (use && process.env.GDE_VIADUCT_FULL) {
    const r = auditProvince(use, {});
    ok(r.open.length <= LIMIT, 'provincie: onscheiden viaducten onder de drempel', `${r.open.length} > ${LIMIT}`);
  } else console.log(`SKIP provincie-extract (zet GDE_VIADUCT_FULL=1 en data/cache/province; die map bestaat alleen in de hoofdmap)`);
}
console.log(`${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
