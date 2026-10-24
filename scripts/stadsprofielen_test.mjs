// stadsprofielen.js (#67): the seven towns of the province as data. Pure.
//   node scripts/stadsprofielen_test.mjs
import { TOWN_PROFILES, townProfile, townAt, townCentre, winkelhart, sfeerLine, daypart, DAYPARTS } from '../game/js/stadsprofielen.js';
import { ankerVan, ANKERPUNTEN } from '../game/js/ankerpunten.js';
import { wgsToWorld } from '../game/js/rdnew.js';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

let n = 0, bad = 0;
const ok = (c, name) => { n++; if (!c) { bad++; console.log('FAIL', name); } };

ok(TOWN_PROFILES.length === 10, 'ten towns');
const names = TOWN_PROFILES.map((t) => t.name);
for (const want of ['Delfzijl', 'Appingedam', 'Veendam', 'Winschoten', 'Hoogezand-Sappemeer', 'Leek', 'Uithuizen', 'Stadskanaal', 'Zoutkamp', 'Winsum']) ok(names.includes(want), `${want} has a profile`);
ok(new Set(TOWN_PROFILES.map((t) => t.id)).size === TOWN_PROFILES.length, 'unique ids');

const BANNED = /\b(de Grunn|winter|sneeuw|ijs)\b/i;
for (const t of TOWN_PROFILES) {
  ok(t.at[0] > 52.9 && t.at[0] < 53.5 && t.at[1] > 6.2 && t.at[1] < 7.3, `${t.id}: inside the province`);
  ok(t.teaser && t.teaser.length > 20, `${t.id}: teaser`);
  ok(t.streets.length >= 4 && new Set(t.streets).size === t.streets.length, `${t.id}: at least four distinct streets`);
  ok(DAYPARTS.every((d) => Array.isArray(t.sfeer[d]) && t.sfeer[d].length >= 2), `${t.id}: two sfeer lines per daypart`);
  ok(t.props.length >= 3 && t.props.every((p) => p.kind && p.per > 0), `${t.id}: props`);
  ok(t.shops.length >= 3 && new Set(t.shops.map((s) => s.name)).size === t.shops.length, `${t.id}: shops with distinct names`);
  ok(['garage', 'schuilplaats', 'bijbaan', 'racebord'].every((k) => t.shops.some((x) => x.kind === k)), `${t.id}: garage, schuilplaats, bijbaan en racebord`);
  const text = [t.teaser, ...t.shops.flatMap((s) => [s.name, s.line]), ...DAYPARTS.flatMap((d) => t.sfeer[d])].join(' ');
  ok(!BANNED.test(text), `${t.id}: no winter, no "de Grunn"`);
  ok(!/\b(Albert Heijn|Jumbo|Hema|Action|Kruidvat|Coca|McDonald|Rabobank|ING)\b/i.test(text), `${t.id}: no real brands`);
  const c = townCentre(t);
  ok(townAt(c.x, c.y) === t, `${t.id}: its centre is in it`);
}
ok(townProfile('Delfzijl').id === 'delfzijl' && townProfile('Sappemeer').id === 'hoogezand' && townProfile('Hoogezand').id === 'hoogezand', 'place names resolve');
// #422: de winkelborden staan in het winkelmidden; Delfzijl wijst daarvoor naar het ankerpunt
{
  const d = townProfile('Delfzijl');
  const h = winkelhart(d), c = townCentre(d);
  ok(h.x === 23852 && h.y === -13004, 'Delfzijl: winkelmidden is het ankerpunt');
  ok(h.x !== c.x && Math.hypot(h.x - c.x, h.y - c.y) > 400, 'Delfzijl: het profielhart blijft de oude plek');
  for (const t of TOWN_PROFILES) {
    if (ankerVan(t.name)) continue;
    const w = winkelhart(t), q = townCentre(t);
    ok(w.x === q.x && w.y === q.y, `${t.id}: zonder ankerpunt is het winkelmidden het profielhart`);
  }
  ok(TOWN_PROFILES.filter((t) => ankerVan(t.name)).length === Object.keys(ANKERPUNTEN).length, 'elk ankerpunt hoort bij een profielstad');
}
ok(townProfile('Nergensdam') === null && townProfile('') === null && townProfile(null) === null, 'unknown names give null');
{ const [x, y] = wgsToWorld(52.6, 6.2); ok(townAt(x, y) === null, 'far away is no town'); }
ok(daypart(7) === 'ochtend' && daypart(13) === 'middag' && daypart(21) === 'avond' && daypart(-1) === 'avond' && daypart(25) === 'ochtend', 'dayparts');
{
  const t = TOWN_PROFILES[0];
  const a = sfeerLine(t, 8, () => 0), b = sfeerLine(t, 8, () => 0, a);
  ok(t.sfeer.ochtend.includes(a) && b !== a, 'sfeer avoids the last line');
  ok(t.sfeer.avond.includes(sfeerLine(t, 22, () => 0.999)), 'sfeer by the hour, rng at the edge');
}
// het hart van elk profiel ligt op land, niet in een waterpolygoon van de provinciegegevens (#346: Zoutkamp lag in het Reitdiep)
{
  const dir = new URL('../game/world/', import.meta.url), idx = new URL('index-provincie.json', dir);
  if (!fs.existsSync(idx)) console.log('SKIP waterhart: geen game/world');
  else {
    const { loadAround } = await import('./world/tegelprobe.mjs');
    const world = { dir: fileURLToPath(dir), index: JSON.parse(fs.readFileSync(idx, 'utf8')) };
    const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    for (const t of TOWN_PROFILES) {
      const c = townCentre(t), d = loadAround(world, c.x, c.y, 30);
      const wet = d.water.some((q) => q.bounds[0] <= c.x && q.bounds[2] >= c.x && q.bounds[1] <= c.y && q.bounds[3] >= c.y && q.pts.length > 2 && inPoly(c.x, c.y, q.pts));
      ok(d.tiles.length > 0, `${t.id}: er zijn tegels bij het hart`);
      ok(d.buildings.some((q) => Math.hypot((q.bounds[0] + q.bounds[2]) / 2 - c.x, (q.bounds[1] + q.bounds[3]) / 2 - c.y) < 150), `${t.id}: gebouwen binnen 150 m van het hart`);
      ok(!wet, `${t.id}: het hart ligt niet in het water`);
    }
  }
}
console.log(`${n - bad}/${n} checks passed`);
process.exit(bad ? 1 : 0);
