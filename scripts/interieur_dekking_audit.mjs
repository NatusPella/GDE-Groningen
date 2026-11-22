// Dekkingsaudit van de interieurs (epic Interieurs, #1165): per pandtype hoeveel panden betreedbaar zijn en welke niet, en waarom niet
// (type zonder soort, hal te klein, te laag, geen deur, geen indeling), plus het dekkingsplan in vier fasen (docs/INTERIEURS-21-11.md):
//   fase 1  winkels en voorzieningen (soort uit het pand zelf: winkel, horeca, kantoor, kerk, station, bibliotheek, garage, publiek)
//   fase 2  variatie per soort (welke varianten een eigen recept hebben: school, ziekenhuis, museum, bioscoop, kapel ...)
//   fase 3  woningen (betreedbaar en daarvan open huis, met tweede verdieping)
//   fase 4  dorpen en de Ommelanden (betreedbaar buiten de stad)
// Twee standen:
//   node scripts/interieur_dekking_audit.mjs --typen [--json]      de typetabel: elk OSM-bouwtype en wat het wordt (zonder wereld)
//   node scripts/interieur_dekking_audit.mjs --matrix [--json]     de matrix gedaan/ontbreekt per variant (zonder wereld)
//   node scripts/interieur_dekking_audit.mjs [--world=<map met index-provincie.json>] [--sample=15] [--tiles=<max>] [--json] [--out=<bestand>]
// De wereldstand gebruikt dezelfde gevelbouwer en planInterior als het spel; alle panden met een winkel of voorziening worden volledig
// gemeten, de rest steekproefsgewijs (elk N-de pand) en opgeschaald per bouwtype. Zonder game/world: SKIP (uitgang 0).
// De pure delen (typeTable, recipeTable, aggregate, phases, render) worden door scripts/interieur_dekking_test.mjs getest.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { KINDS, KIND_IDS, NOT_ENTERABLE, NOT_ENTERABLE_WHY, BIJGEBOUW_SUBS, HOME_OPEN_SHARE, kindOfBuilding } from '../game/js/interiorkinds.js';
import { planInterior } from '../game/js/interiorrules.js';
import { SHOP_KINDS } from '../game/js/winkelkit.js';
import { mulberry32 } from '../game/js/rng.js';
import { building, subsFor } from './interior_fixtures.mjs';
import { generateLayout } from '../game/js/interiorlayout.js';
import { scriptOf, SCRIPTS } from '../game/js/interioractivity.js';
import { hasUpper } from '../game/js/interiorupper.js';
import { crowdCurves } from '../game/js/interiorcrowd.js';
import { roomTone } from '../game/js/sfx/binnenklank.js';
import { productFor, DESK_SUBS } from '../game/js/interiorbuy.js';
import { clerkLine } from '../game/js/interiortexts.js';
import { CLOTHING_ROLE, ROLES } from '../game/js/interiornpc.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// de OSM-typen die het spel kent (BY_TYPE staat niet geexporteerd: we vragen kindOfBuilding per type, dat is wat telt)
export const KNOWN_TYPES = [
  'house', 'detached', 'terrace', 'semidetached_house', 'bungalow', 'residential', 'apartments', 'dormitory',
  'retail', 'commercial', 'office', 'church', 'cathedral', 'chapel', 'train_station', 'station', 'transportation', 'library',
  'garage', 'garages', 'service', 'industrial', 'warehouse', 'factory', 'workshop',
  'civic', 'public', 'government', 'hospital', 'school', 'hotel', 'university', 'college', 'kindergarten', 'sports_centre', 'sports_hall', 'fitness_centre', 'museum', 'cinema',
  'farm', 'villa', 'chalet', 'hangar', 'riding_hall', 'data_center', 'religious', 'monastery', 'mosque', 'synagogue', 'temple',
  'shed', 'outbuilding', 'hut', 'cabin', 'boathouse', 'barn', 'farm_auxiliary', 'cowshed', 'stable', 'livestock', 'sty', 'agricultural', 'greenhouse', // r7: bijgebouwen met een kamer
  'yes', ...NOT_ENTERABLE,
];

// Per variant (soort + sub): slaagt een indeling op een gewone hal, en met hoeveel items en mensen.
export function recipeTable(w = 14, d = 16, seed = 1165) {
  const rows = [];
  for (const kind of KIND_IDS) {
    const subs = kind === 'winkel' ? SHOP_KINDS.filter((s) => s !== 'kermiskraam') : subsFor(kind);
    for (const sub of subs) {
      const rnd = mulberry32(seed);
      let okN = 0, items = 0, people = 0;
      const tries = 6;
      for (let i = 0; i < tries; i++) {
        const r = building(kind, sub, w + i * 0.7, d + i * 0.9, rnd);
        const p = planInterior(r.b, { spot: r.spot, upper: false });
        if (p.ok) { okN++; items += p.layout.items.length; people += p.layout.npc.length; }
      }
      rows.push({ kind, sub, ok: okN, tries, items: Math.round(items / Math.max(1, okN)), people: Math.round((people / Math.max(1, okN)) * 10) / 10, minW: KINDS[kind].minW, minD: KINDS[kind].minD });
    }
  }
  return rows;
}

// De matrix gedaan/ontbreekt (docs/INTERIEURS-STAND-22-11.md): per variant wat er al is en wat nog de standaard van de soort deelt.
// Pure, zonder wereld en zonder THREE. Een rij: recept (slagers van 6), items en mensen, rollen met eigen schema en kledingpool, de use-id's die
// de layouts plaatsen, wat er aan de balie te koop is, of de kamertoon, de drukte en de balieregels eigen zijn, en of er een etage kan zijn.
export function variantMatrix(seed = 2211) {
  const rows = [], rec = recipeTable();
  const fallbackScript = scriptOf('__geen__');
  for (const r of rec) {
    const roles = new Set(), uses = new Set();
    for (let i = 0; i < 6; i++) {
      const rnd = mulberry32(seed + i);
      const x = building(r.kind, r.sub, 14 + i * 0.7, 16 + i * 0.9, rnd);
      const p = planInterior(x.b, { spot: x.spot, upper: false });
      if (!p.ok) continue;
      for (const n of p.layout.npc) roles.add(n.role);
      for (const u of p.layout.use) uses.add(u.id);
    }
    const key = r.kind + (r.sub ? ':' + r.sub : '');
    const sub = r.sub || (r.kind === 'garage' ? 'werkplaats' : null);
    const base = roomTone(r.kind), own = roomTone(r.kind, r.sub);
    const prod = productFor(r.kind, sub);
    const lines = (k, s) => Array.from({ length: 6 }, (_, n) => clerkLine(k, 0, n, s)).join('|');
    rows.push({
      kind: r.kind, sub: r.sub, ok: r.ok, tries: r.tries, items: r.items, people: r.people,
      rollen: [...roles].sort(), zonderSchema: [...roles].filter((x) => scriptOf(x) === fallbackScript && !SCRIPTS[x]).sort(),
      zonderKleding: [...roles].filter((x) => !CLOTHING_ROLE[x] && !(ROLES[x] && ROLES[x].pool)).sort(),
      use: [...uses].sort(),
      koop: prod ? prod.item : null, balieKoop: !!prod && (DESK_SUBS.has(sub) || r.kind === 'winkel' || r.kind === 'horeca'),
      eigenToon: JSON.stringify(own) !== JSON.stringify(base) || !r.sub,
      eigenDrukte: !!crowdCurves()[key],
      eigenBalieregels: r.sub ? lines(r.kind, r.sub) !== lines(r.kind, null) : true,
      etage: hasUpper(r.kind, r.sub),
    });
  }
  return rows;
}

export function renderMatrix(rows) {
  const jn = (b) => (b ? 'ja' : 'nee');
  const out = ['| Variant | Recept | Items | Mensen | Rollen | Koop aan de balie | Eigen toon | Eigen drukte | Etage |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |'];
  for (const r of rows) out.push('| ' + r.kind + (r.sub ? '/' + r.sub : '') + ' | ' + r.ok + '/' + r.tries + ' | ' + r.items + ' | ' + r.people + ' | ' + (r.rollen.join(', ') || '-') + ' | ' + (r.koop || '-') + ' | ' + jn(r.eigenToon) + ' | ' + jn(r.eigenDrukte) + ' | ' + jn(r.etage) + ' |');
  return out.join(String.fromCharCode(10));
}

// Elk OSM-type: wat wordt het (soort en variant, of niet betreedbaar). 'yes' zonder hoogte is een woning, met hoogte (5 m of meer) een kantoor.
export function typeTable() {
  const rows = [];
  for (const type of KNOWN_TYPES) {
    for (const h of type === 'yes' ? [3, 8] : [0]) {
      const k = kindOfBuilding({ type, pts: [], h });
      rows.push({ type: type === 'yes' ? 'yes (' + h + ' m)' : type, kind: k ? k.kind : null, sub: k ? k.sub : null, betreedbaar: !!k, reden: k ? '' : NOT_ENTERABLE.has(type) ? 'bewust niet: ' + (NOT_ENTERABLE_WHY[type] || 'geen kamer') : 'geen soort' });
    }
  }
  return rows;
}

// --- aggregeren: records van gemeten panden naar tabellen -----------------------------------------------------
// record: { type, poi (heeft een winkel of voorziening: altijd gemeten), ok, why, kind, sub, city, levels }
// totals: { [type]: { all, poi } }: alle panden van dat type, en hoeveel daarvan een voorziening hebben
export function aggregate(records, totals) {
  const byType = {};
  for (const [type, t] of Object.entries(totals)) byType[type] = { type, n: t.all, poiN: t.poi, poiOk: 0, sampled: 0, sampledOk: 0, why: {}, kinds: {} };
  for (const r of records) {
    const t = byType[r.type] || (byType[r.type] = { type: r.type, n: 0, poiN: 0, poiOk: 0, sampled: 0, sampledOk: 0, why: {}, kinds: {} });
    if (r.poi) { if (r.ok) t.poiOk++; } else { t.sampled++; if (r.ok) t.sampledOk++; }
    if (r.ok) { const kk = r.kind + (r.sub ? '/' + r.sub : ''); t.kinds[kk] = (t.kinds[kk] || 0) + 1; } else t.why[r.why] = (t.why[r.why] || 0) + 1;
  }
  const rows = Object.values(byType).map((t) => {
    const rest = Math.max(0, t.n - t.poiN);
    const rate = t.sampled ? t.sampledOk / t.sampled : 0;
    const est = Math.round(t.poiOk + rest * rate);
    return { ...t, rate: Math.round(rate * 1000) / 10, est, notEst: Math.max(0, t.n - est) };
  }).sort((a, b) => b.n - a.n);
  const all = rows.reduce((n, r) => n + r.n, 0), est = rows.reduce((n, r) => n + r.est, 0);
  const why = {};
  for (const r of rows) for (const [k, v] of Object.entries(r.why)) why[k] = (why[k] || 0) + v;
  return { panden: all, geschatBetreedbaar: est, aandeel: all ? Math.round(est / all * 1000) / 10 : 0, perType: rows, redenNiet: why };
}

// de vier fasen uit de records (gemeten panden, per soort opgeschaald met de steekproefverhouding van hun bouwtype)
export function phases(records, agg, recipes = recipeTable()) {
  const scale = new Map(agg.perType.map((r) => [r.type, r.sampled ? Math.max(0, r.n - r.poiN) / r.sampled : 1]));
  const w = (r) => (r.poi ? 1 : scale.get(r.type) || 1);
  const sum = (f) => Math.round(records.reduce((n, r) => n + (f(r) ? w(r) : 0), 0));
  const homes = sum((r) => r.ok && r.kind === 'woning');
  const kinds = {};
  for (const r of records) if (r.ok && r.kind !== 'woning') kinds[r.kind] = (kinds[r.kind] || 0) + w(r);
  const subsSeen = new Set(records.filter((r) => r.ok && r.sub).map((r) => r.kind + '/' + r.sub));
  const subsWithRecipe = new Set(recipes.filter((r) => r.sub && r.ok > 0).map((r) => r.kind + '/' + r.sub));
  const cityOk = sum((r) => r.ok && r.city), ruralOk = sum((r) => r.ok && !r.city);
  const cityAll = sum((r) => r.city), ruralAll = sum((r) => !r.city);
  return {
    fase1: { naam: 'Winkels en voorzieningen', betreedbaar: sum((r) => r.ok && r.kind !== 'woning'), poiBetreedbaar: records.filter((r) => r.poi && r.ok).length, poiNiet: records.filter((r) => r.poi && !r.ok).length, perSoort: Object.fromEntries(Object.entries(kinds).map(([k, v]) => [k, Math.round(v)])) },
    fase2: { naam: 'Variatie per soort', varianten: recipes.filter((r) => r.sub).length, metRecept: subsWithRecipe.size, gezien: subsSeen.size, zonderRecept: recipes.filter((r) => r.ok === 0).map((r) => r.kind + '/' + r.sub) },
    fase3: { naam: 'Woningen', betreedbaar: homes, openHuis: Math.round(homes * HOME_OPEN_SHARE), metEtage: sum((r) => r.ok && r.kind === 'woning' && r.levels === 2) },
    fase5: { naam: 'Bijgebouwen en portieken (r7; betreedbaar vanaf 3 x 3 m binnen, r8)', bijgebouwen: sum((r) => r.ok && r.kind === 'garage' && BIJGEBOUW_SUBS.includes(r.sub)), perSoort: Object.fromEntries(BIJGEBOUW_SUBS.map((s) => [s, sum((r) => r.ok && r.kind === 'garage' && r.sub === s)])), portieken: sum((r) => r.ok && r.kind === 'woning' && r.sub === 'appartement') },
    fase4: { naam: 'Dorpen en de Ommelanden', stadBetreedbaar: cityOk, buitenBetreedbaar: ruralOk, stadPanden: cityAll, buitenPanden: ruralAll, buitenAandeel: ruralAll ? Math.round(ruralOk / ruralAll * 1000) / 10 : 0 },
  };
}

const pad = (s, n) => String(s).padEnd(n), lpad = (s, n) => String(s).padStart(n);
const lst = (o) => Object.entries(o).map(([k, v]) => k + ' ' + v).join(', ');
export function render(agg, ph, recipes) {
  const out = [];
  out.push(agg.panden + ' panden, geschat betreedbaar ' + agg.geschatBetreedbaar + ' (' + agg.aandeel + '%)');
  out.push('reden dat een gemeten pand niet kan: ' + (lst(agg.redenNiet) || 'geen'));
  out.push(pad('bouwtype', 20) + lpad('panden', 9) + lpad('gemeten', 9) + lpad('bet.%', 7) + lpad('geschat', 9) + lpad('niet', 9) + '  waarom niet, of wat het wordt');
  for (const r of agg.perType.slice(0, 30)) out.push(pad(r.type, 20) + lpad(r.n, 9) + lpad(r.sampled + r.poiN, 9) + lpad(r.rate, 7) + lpad(r.est, 9) + lpad(r.notEst, 9) + '  ' + (lst(r.why) || Object.keys(r.kinds).join(' ')));
  if (ph) {
    const f = ph.fase1, g = ph.fase2, h = ph.fase3, i = ph.fase4;
    out.push('');
    out.push('Fase 1 ' + f.naam + ': ' + f.betreedbaar + ' betreedbaar; panden met een plek: ' + f.poiBetreedbaar + ' betreedbaar, ' + f.poiNiet + ' niet; ' + lst(f.perSoort));
    out.push('Fase 2 ' + g.naam + ': ' + g.metRecept + ' van ' + g.varianten + ' varianten hebben een recept; ' + g.gezien + ' in de data gezien' + (g.zonderRecept.length ? '; zonder recept: ' + g.zonderRecept.join(', ') : ''));
    out.push('Fase 3 ' + h.naam + ': ' + h.betreedbaar + ' betreedbaar, ca. ' + h.openHuis + ' open huis (' + Math.round(HOME_OPEN_SHARE * 100) + '%), ' + h.metEtage + ' met tweede verdieping');
    if (ph.fase5) out.push('Fase 5 ' + ph.fase5.naam + ': ' + ph.fase5.bijgebouwen + ' bijgebouwen (' + lst(ph.fase5.perSoort) + '), ' + ph.fase5.portieken + ' appartementencomplexen met een portiek');
    out.push('Fase 4 ' + i.naam + ': stad ' + i.stadBetreedbaar + ' van ' + i.stadPanden + ', buiten de stad ' + i.buitenBetreedbaar + ' van ' + i.buitenPanden + ' (' + i.buitenAandeel + '%)');
  }
  if (recipes) {
    out.push('');
    out.push('recepten (soort/variant: indelingen die slaagden op een gewone hal):');
    out.push(recipes.map((r) => r.kind + (r.sub ? '/' + r.sub : '') + ' ' + r.ok + '/' + r.tries).join(', '));
  }
  return out.join('\n');
}

// --- de wereldstand -----------------------------------------------------------------------------------------------
async function runWorld(opts) {
  await import('./node3d.mjs');
  const { loadTiles } = await import('./world/prop_conflict_audit.mjs');
  const { buildBuildingMesh } = await import('../game/js/models3d_buildings.js');
  const { makeSpotIndex, spotFor } = await import('../game/js/interiorspots.js');
  const Fac = await import('../game/js/facilities.js');
  const { setShopSpots, spotsFrom } = await import('../game/js/shopspots.js');
  const G = await import('../game/js/gdt.js');
  const index = JSON.parse(fs.readFileSync(path.join(opts.world, 'index-provincie.json'), 'utf8'));
  const readJson = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'game', f), 'utf8'));
  const meta = readJson('stad.json').meta;
  Fac.setExtraBuiltWorld((x, y) => { const [i, j] = G.tileIndexOf(x, y); const t = index.tiles[G.tileKey(i, j)]; return !!t && !!(t.flags & 4); });
  const map = { meta };
  Fac.initFacilities(map, readJson('facilities.json'));
  Fac.initShopPlaces(map, readJson('shopplaces.json'));
  setShopSpots(spotsFrom(Fac.FAC.all));
  const spotIdx = makeSpotIndex(Fac.FAC.all);
  const inCity = (x, y) => { const b = meta.bounds; return !!b && x > b[0] && x < b[2] && y > b[1] && y < b[3]; };
  const keys = Object.keys(index.tiles).slice(0, opts.tiles);
  const totals = {}, records = [], seen = new Set();
  let cnt = 0;
  const t0 = Date.now();
  for (let i = 0; i < keys.length; i += 8) {
    const tiles = loadTiles(opts.world, index, keys.slice(i, i + 8));
    for (const t of tiles.values()) {
      for (const b of t.buildings) {
        if (seen.has(b.gid)) continue;
        seen.add(b.gid);
        const type = b.type || 'yes';
        const tot = totals[type] || (totals[type] = { all: 0, poi: 0 });
        tot.all++;
        if (!b.pts || b.pts.length < 4) continue;
        const poi = !!spotFor(spotIdx, b.pts, null, 6);
        if (poi) tot.poi++;
        if (!poi && cnt++ % opts.sample !== 0) continue;
        try { buildBuildingMesh(b); } catch (e) { continue; }
        const en = b.entrance;
        const spot = en ? spotFor(spotIdx, b.pts, en, 4) : null;
        const p = planInterior(b, { spot });
        records.push({ type, poi, ok: p.ok, why: p.ok ? '' : p.why, kind: p.kind || null, sub: p.sub || null, city: inCity(b.pts[0][0], b.pts[0][1]), levels: p.ok ? p.levels : 0 });
        b._geo3dParts = null;
      }
    }
    if ((i / 8) % 40 === 0) process.stderr.write('  tegel ' + i + '/' + keys.length + ', ' + seen.size + ' panden, ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s\n');
  }
  return { totals, records, seconden: Math.round((Date.now() - t0) / 1000) };
}

const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const has = (k) => process.argv.includes('--' + k);

async function main() {
  const json = has('json');
  if (has('typen')) {
    const types = typeTable(), recipes = recipeTable();
    if (json) { console.log(JSON.stringify({ types, recipes }, null, 1)); return; }
    console.log(pad('bouwtype', 22) + pad('soort', 14) + pad('variant', 14) + 'reden');
    for (const r of types) console.log(pad(r.type, 22) + pad(r.kind || '-', 14) + pad(r.sub || '', 14) + r.reden);
    console.log('');
    console.log('betreedbare typen: ' + types.filter((r) => r.betreedbaar).length + ' van ' + types.length + '; recepten die slagen: ' + recipes.filter((r) => r.ok > 0).length + ' van ' + recipes.length);
    console.log(recipes.map((r) => r.kind + (r.sub ? '/' + r.sub : '') + ' ' + r.ok + '/' + r.tries).join(', '));
    return;
  }
  if (has('matrix')) { const m = variantMatrix(); console.log(json ? JSON.stringify(m, null, 1) : renderMatrix(m)); return; }
  const world = path.resolve(arg('world', path.join(ROOT, 'game/world')));
  if (!fs.existsSync(path.join(world, 'index-provincie.json'))) { console.log('SKIP geen game/world met de provinciegegevens (--world=<map>); --typen draait zonder wereld'); return; }
  const res = await runWorld({ world, sample: Math.max(1, Number(arg('sample', 15))), tiles: Number(arg('tiles', 1e9)) });
  const agg = aggregate(res.records, res.totals), recipes = recipeTable(), ph = phases(res.records, agg, recipes);
  const full = { ...agg, fasen: ph, recepten: recipes, gemeten: res.records.length, seconden: res.seconden };
  if (arg('out')) fs.writeFileSync(path.resolve(arg('out')), JSON.stringify(full, null, 1));
  if (json) console.log(JSON.stringify(full, null, 1));
  else console.log(render(agg, ph, recipes) + '\n(' + res.records.length + ' panden gemeten in ' + res.seconden + ' s)');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
