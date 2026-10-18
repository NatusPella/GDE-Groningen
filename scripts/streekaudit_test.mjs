// streekaudit.js (#61, #66, #67, #68): the pure checks behind scripts/world/streekaudit.mjs,
// plus the tallies of the checked-in data. No packs needed.
//   node scripts/streekaudit_test.mjs
import fs from 'node:fs';
import { distM, distToSegment, distToLine, inRing, normName, checkFind, suggestSpot, checkStreets, tally, gaps } from '../game/js/streekaudit.js';
import { STREKEN, streekAt, FINDS } from '../game/js/regioleven.js';
import { TOWN_PROFILES, townAt, townCentre } from '../game/js/stadsprofielen.js';
import { wgsToWorld } from '../game/js/rdnew.js';

let n = 0, bad = 0;
const ok = (c, name) => { n++; if (!c) { bad++; console.log('FAIL', name); } };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// geometry
ok(near(distM([53, 6], [53.001, 6]), 111.2, 0.5), 'one millidegree of latitude is 111 m');
ok(near(distToSegment([53.0005, 6.001], [53, 6], [53.001, 6]), distM([53, 6.001], [53, 6]), 1), 'distance to a segment from the side');
ok(near(distToSegment([53.002, 6], [53, 6], [53.001, 6]), 111.2, 0.5), 'distance past the end of a segment');
ok(near(distToLine([53, 6], [[53, 6]]), 0, 0.001), 'a one-point line');
const sq = [[53, 6], [53, 6.001], [53.001, 6.001], [53.001, 6]];
ok(inRing([53.0005, 6.0005], sq) && !inRing([53.002, 6.0005], sq), 'point in ring');
ok(normName('Beneden Oosterdiep') === normName('beneden  oosterdiep!') && normName('Zuid-Oost') === 'zuid oost' && normName('Één') === 'een', 'names compare without case, accents or punctuation');

// finds
const road = [[53, 6], [53, 6.01]];
const f = { id: 'x', at: [53.0002, 6.005] };
ok(checkFind(f, { roads: [road] }).issues.length === 0, 'a find by a road passes');
ok(checkFind({ id: 'y', at: [53.01, 6.005] }, { roads: [road] }).issues[0].includes('van de dichtstbijzijnde weg'), 'a find far from any road fails');
ok(checkFind(f, { roads: [road], buildings: [sq.map(([a, b]) => [a + 0.0001, b + 0.005])] }).issues.includes('in een gebouw'), 'a find in a building fails');
ok(checkFind(f, { roads: [road], water: [sq.map(([a, b]) => [a + 0.0001, b + 0.005])] }).issues.includes('in water'), 'a find in water fails');
ok(checkFind(f, { roads: [road], waterLines: [[[53.0002, 6.004], [53.0002, 6.006]]] }).issues.includes('op een waterloop'), 'a find on a ditch fails');
ok(checkFind({ id: 'z', at: [53.01, 6.005] }, { roads: [road] }, { maxRoad: 2000 }).issues.length === 0, 'maxRoad is adjustable');
{
  const bld = [[52.9999, 6.0049], [52.9999, 6.0051], [53.0001, 6.0051], [53.0001, 6.0049]];
  const s = suggestSpot([53, 6.005], { roads: [[[53, 6.005], [53, 6.006]]], buildings: [bld] });
  ok(s && s.at[1] === 6.006, 'a suggestion skips road nodes inside a building');
  ok(suggestSpot([53, 6.005], { roads: [] }) === null, 'no road, no suggestion');
}

// streets
{
  const t = { id: 't', streets: ['Hoofdstraat', 'Kerkplein'] };
  const r = checkStreets(t, new Set(['hoofdstraat']));
  ok(r.found.length === 1 && r.missing[0] === 'Kerkplein', 'streets found and missing');
}

// tallies and gaps
{
  const r = tally([{ kind: 'winkel', x: 1, y: 1 }, { kind: 'winkel', x: 2, y: 2 }, { kind: 'golf', x: 9, y: 9 }], (x) => (x < 5 ? { id: 'a' } : null), ['a', 'b']);
  ok(r.perStreek.a.winkel === 2 && r.buiten.golf === 1 && Object.keys(r.perStreek.b).length === 0, 'tally per streek and outside');
  const g = gaps({ a: { winkel: 1, restaurant: 0, vondsten: 3, geheimen: 1, events: 1, ontmoetingen: 3, steden: 1 } });
  ok(g.length === 1 && g[0].what === 'restaurant', 'a missing horeca is a gap');
}

// the checked-in content: every streek has its identity
{
  const content = (id) => ({
    vondsten: FINDS.filter((x) => x.streek === id && x.kind === 'verzamel').length,
    geheimen: FINDS.filter((x) => x.streek === id && x.kind === 'geheim').length,
    steden: TOWN_PROFILES.filter((t) => { const [x, y] = wgsToWorld(t.at[0], t.at[1]); const s = streekAt(x, y); return s && s.id === id; }).length,
  });
  for (const s of STREKEN) {
    const c = content(s.id);
    ok(c.vondsten === 3 && c.geheimen === 1 && c.steden >= 1, `${s.id}: three finds, a secret and a town profile`);
  }
  for (const t of TOWN_PROFILES) { const c = townCentre(t); ok(streekAt(c.x, c.y) !== null && townAt(c.x, c.y) === t, `${t.id}: lies in a streek`); }
}

// the shops and the venues in the data fall into the streken (most of them), with a count per streek
{
  const sp = JSON.parse(fs.readFileSync(new URL('../game/shopplaces.json', import.meta.url), 'utf8'));
  const items = [];
  for (const rows of Object.values(sp.tiles)) for (const r of rows) { const [x, y] = wgsToWorld(r[0], r[1]); items.push({ kind: 'winkel', x, y }); }
  const { perStreek, buiten } = tally(items, streekAt, STREKEN.map((s) => s.id));
  for (const s of STREKEN) ok((perStreek[s.id].winkel || 0) >= 20, `${s.id}: at least twenty real shop places`);
  ok((buiten.winkel || 0) / items.length < 0.45, 'under 45% of the shops lie outside every streek (the rest is the city)');
}

console.log(`${n - bad}/${n} checks passed`);
process.exit(bad ? 1 : 0);
