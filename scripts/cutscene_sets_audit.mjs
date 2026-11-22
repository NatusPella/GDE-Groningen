// Inventaris en audit van de binnensets van cutscenes en binnenmissies (docs/CUTSCENE-INTERIEURS-22-11.md): welke set-sleutels er zijn, welke
// scènes en missiestappen ze spelen, waar in de wereld, welk soort pand ze nodig hebben en of er een echte-wereld-mapping (realsets.js) of een
// bewuste terugval is.
//   node scripts/cutscene_sets_audit.mjs [--json] [--strict]                       de inventaris en de mapping (zonder wereld)
//   node scripts/cutscene_sets_audit.mjs --world[=<map met index.json>] [--json]    ook de pandkeuze op de echte tegels (CPU, geen Electron)
// --strict: uitgang 1 als een set zonder tabelrij wordt gespeeld, een binnenset geen mapping en geen bewuste terugval heeft, of een vaste
// verhaalplek (REAL_SETS.<set>.fixed) niet meer overeenkomt met de wereld (alleen met --world).
// De pure delen (inventory, checkTable) worden door scripts/cutscene_sets_audit_test.mjs getest.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalog } from '../game/js/cutpreview.js';
import { REAL_SETS, REAL_SET_KEYS, PLAYED_SETS, isRealSet, sceneSamples, pickRealSet, centreOf } from '../game/js/realsets.js';
import { ROOMS } from '../game/js/roomspec.js';
import { VIGNETTEN } from '../game/js/terugkeerscenes.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const has = (k) => args.includes('--' + k);
const arg = (k, d = null) => { const a = args.find((x) => x === '--' + k || x.startsWith('--' + k + '=')); return a ? (a.includes('=') ? a.slice(k.length + 3) : true) : d; };

// Waar een missie-set in het verhaal hoort (voor de inventaris; de bron van de stappen staat in missions_*.js)
const MISSIE = {
  loket: { id: 'M03', waar: 'het Stadhuis aan de Grote Markt (stad)', wijk: 'Binnenstad' },
  kantoor: { id: 'M18', waar: 'het kantoor van Wiebelwerk aan de Laan Corpus den Hoorn 200 in de Stad', wijk: 'Hoornse Meer' },
  serverkamer: { id: 'M18.3', waar: 'de serverkamer bij het kantoor van Wiebelwerk aan de Laan Corpus den Hoorn', wijk: 'Hoornse Meer' },
  omakeuken: { id: 'M25', waar: 'Oma Trijntjes keuken aan de Noorderhaven', wijk: 'Noorderhaven' },
  kroeg: { id: 'M16', waar: 'de kroeg waar de toast valt (bij de speler)', wijk: 'wisselt' },
  woonkamer: { id: 'M27', waar: 'Willemiens huis aan de Hofstraat in Loppersum', wijk: 'Loppersum' },
  garage: { id: '-', waar: 'een werkplaats (geen scène of stap gebruikt hem nu)', wijk: '-' },
  kruitkelder: { id: 'M20', waar: 'het gewelf onder de vesting van Bourtange', wijk: 'Bourtange' },
  keuken: { id: 'opening, terugkeer', waar: 'Tessa\'s keuken in de flat (Paddepoel), nu 345 m boven de straat', wijk: 'Paddepoel' },
};
// Het tijdstip waarop de scène speelt: de wereldklok van het spel (de scène speelt op het uur van de speler; het licht door de ramen is dus wat buiten staat)
const UUR = { loket: 'dag (het loket sluit om twaalf uur)', kantoor: 'dag', serverkamer: 'nacht (00:00)', omakeuken: 'avond', kroeg: 'avond', woonkamer: 'dag', garage: 'dag', kruitkelder: 'nacht', keuken: 'ochtend' };

// Alle plekken in de broncode waar een missiestap een set vraagt (set: '...' en toastSet: '...')
export function stageUses(root = ROOT) {
  const dir = path.join(root, 'game/js');
  const out = [];
  for (const f of fs.readdirSync(dir).filter((x) => /^missions.*\.js$/.test(x))) {
    fs.readFileSync(path.join(dir, f), 'utf8').split('\n').forEach((line, i) => {
      const m = /\b(set|toastSet):\s*'([a-z]+)'/.exec(line);
      if (m) out.push({ file: f, line: i + 1, soort: m[1], set: m[2], variant: (/setVariant:\s*'([a-z]+)'/.exec(line) || [])[1] || null });
    });
  }
  return out;
}

export function inventory({ root = ROOT } = {}) {
  const script = JSON.parse(fs.readFileSync(path.join(root, 'game/storydata/script.json'), 'utf8'));
  const cat = buildCatalog({ script, npcSource: fs.readFileSync(path.join(root, 'game/js/missionstory.js'), 'utf8') });
  const rows = {};
  const row = (k) => rows[k] || (rows[k] = { set: k, cutscenes: [], stappen: [], terugkeer: [], tabel: REAL_SETS[k] || null });
  for (const e of cat) {
    const k = e.def && e.def.set;
    if (!k) continue;
    row(k).cutscenes.push({ id: e.id, duur: Math.round(e.duration), scene: e.scene || null });
  }
  for (const u of stageUses(root)) row(u.set).stappen.push(u);
  for (const v of VIGNETTEN) if (v.set) row(v.set).terugkeer.push(v.id);
  for (const k of PLAYED_SETS) row(k);
  return Object.values(rows).sort((a, b) => a.set.localeCompare(b.set));
}

// Elke set die gespeeld wordt heeft een rij; elke echte set heeft soort, straal en hal; een terugval heeft een reden.
export function checkTable(inv) {
  const out = [];
  for (const r of inv) {
    const used = r.cutscenes.length + r.stappen.length + r.terugkeer.length;
    if (!r.tabel) { if (used) out.push({ set: r.set, fout: 'wordt gespeeld maar staat niet in REAL_SETS' }); continue; }
    if (used && r.tabel.status === 'geen-set') out.push({ set: r.set, fout: 'wordt gespeeld maar staat als geen-set in de tabel' });
    if (r.tabel.status === 'terugval' && !r.tabel.why) out.push({ set: r.set, fout: 'bewuste terugval zonder reden' });
    if (r.tabel.status === 'echt' && (!r.tabel.kinds.length || !r.tabel.minHall)) out.push({ set: r.set, fout: 'echte set zonder soort of hal' });
  }
  return out;
}

export function render(inv) {
  const lines = [];
  for (const r of inv) {
    const t = r.tabel, m = MISSIE[r.set] || {};
    lines.push(`${r.set.padEnd(12)} ${(t ? t.status : '?').padEnd(9)} ${t ? t.label : '(geen tabelrij)'}`);
    lines.push(`             waar: ${m.waar || '-'} (${m.wijk || '-'}); tijd: ${UUR[r.set] || '-'}`);
    if (t && t.status === 'echt') lines.push(`             pand: ${t.kinds.map((k) => k.kind + (k.sub ? '/' + k.sub : '')).join(' of ')} binnen ${t.r} m, hal vanaf ${t.minHall.w} x ${t.minHall.d} m${t.fixed.length ? '; vast: ' + t.fixed.map((f) => f.place + ' = pand ' + f.gid).join(', ') : ''}`);
    else if (t && t.why) lines.push(`             ${t.status}: ${t.why}`);
    if (r.cutscenes.length) lines.push(`             cutscenes (${r.cutscenes.length}): ${r.cutscenes.map((c) => c.id).join(', ')}`);
    if (r.stappen.length) lines.push(`             missiestappen (${r.stappen.length}): ${[...new Set(r.stappen.map((s) => s.file.replace(/^missions_?|\.js$/g, '') + ':' + s.line + (s.variant ? '/' + s.variant : '')))].join(', ')}`);
    if (r.terugkeer.length) lines.push(`             terugkeervignetten (${r.terugkeer.length}): ${r.terugkeer.join(', ')}`);
  }
  return lines.join('\n');
}

// --- de wereldstand ---------------------------------------------------------------------------------------------------------------
// Voorbeeldankers voor sets zonder vaste plek of zonder scène: [x, y, naam]
const SAMPLE = {
  kroeg: [[108, 108, 'Grote Markt'], [-1290, -1080, 'Paddepoel']], woonkamer: [[-1290, -1080, 'Paddepoel']], garage: [[-1290, -1080, 'Paddepoel'], [108, 108, 'Grote Markt']],
};
const ROOM_POINTS = (k) => (ROOMS[k] ? [[ROOMS[k].player.u, ROOMS[k].player.v], ...ROOMS[k].npcs.map((q) => [q.u, q.v])] : []);

async function runWorld(opts) {
  await import('./node3d.mjs');
  const { loadTiles } = await import('./world/prop_conflict_audit.mjs');
  const { buildBuildingMesh } = await import('../game/js/models3d_buildings.js');
  const { planInterior, planReady } = await import('../game/js/interiorrules.js');
  const { makeSpotIndex, spotFor } = await import('../game/js/interiorspots.js');
  const Fac = await import('../game/js/facilities.js');
  const { setShopSpots, spotsFrom } = await import('../game/js/shopspots.js');
  const G = await import('../game/js/gdt.js');
  const readJson = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'game', f), 'utf8'));
  const meta = readJson('stad.json').meta;
  const idx = (n) => (fs.existsSync(path.join(opts.world, n)) ? JSON.parse(fs.readFileSync(path.join(opts.world, n), 'utf8')) : null);
  const indexes = [idx('index.json'), idx('index-provincie.json')].filter(Boolean);
  const map = { meta };
  Fac.initFacilities(map, readJson('facilities.json'));
  Fac.initShopPlaces(map, readJson('shopplaces.json'));
  setShopSpots(spotsFrom(Fac.FAC.all));
  const spotIdx = makeSpotIndex(Fac.FAC.all);
  const inv = inventory();
  const results = [];
  for (const k of REAL_SET_KEYS) {
    const spec = REAL_SETS[k];
    if (spec.status !== 'echt') continue;
    const row = inv.find((r) => r.set === k);
    const scenes = (row ? row.cutscenes : []).filter((c) => c.scene);
    const anchors = spec.fixed.length ? spec.fixed.map((f) => [f.at[0], f.at[1], f.place]) : (SAMPLE[k] || []);
    for (const [x, y, naam] of anchors) {
      // de tegels rond het anker: eerst de stadsindex, dan de provincie
      let blds = [];
      for (const index of indexes) {
        const keys = new Set();
        const R = spec.r + 20;
        for (const dx of [-R, 0, R]) for (const dy of [-R, 0, R]) { const [i, j] = G.tileIndexOf(x + dx, y + dy); if (index.tiles[G.tileKey(i, j)]) keys.add(G.tileKey(i, j)); }
        if (!keys.size) continue;
        const tiles = loadTiles(opts.world, index, [...keys]);
        const seen = new Set();
        for (const t of tiles.values()) for (const b of t.buildings) if (!seen.has(b.gid)) { seen.add(b.gid); blds.push(b); }
        break;
      }
      blds = blds.filter((b) => { const c = centreOf(b); return c && Math.hypot(c[0] - x, c[1] - y) <= spec.r + 20; });
      let errs = 0; for (const b of blds) { try { buildBuildingMesh(b); } catch (e) { errs++; if (errs === 1) console.error('buildBuildingMesh:', e.message); } }
      const planOf = (b) => {
        if (!planReady(b)) return null;
        const spot = spotFor(spotIdx, b.pts, b.entrance || null);
        const plan = planInterior(b, { spot });
        return { ok: plan.ok, plan, why: plan.why };
      };
      const sets = scenes.length ? scenes.map((c) => ({ id: c.id, ...sceneSamples(c.scene) })) : [{ id: 'kamer', actors: ROOM_POINTS(k).map(([f, s]) => ({ f, s, sit: false })), cams: [] }];
      for (const sc of sets) {
        const pick = pickRealSet({ key: k, anchor: { x, y }, buildings: blds, planOf, points: sc.actors, cams: sc.cams });
        results.push({ set: k, plek: naam, scene: sc.id, panden: blds.length, ok: pick.ok, gid: pick.gid ?? null, d: pick.d ?? null, vast: pick.place || null, kind: pick.ok ? pick.plan.kind + (pick.plan.sub ? '/' + pick.plan.sub : '') : null, hal: pick.ok ? [Math.round((pick.plan.hall.u1 - pick.plan.hall.u0) * 10) / 10, Math.round((pick.plan.hall.v1 - pick.plan.hall.v0) * 10) / 10] : null, why: pick.ok ? '' : (pick.skipped && pick.skipped.length ? 'geen geschikt pand: ' + pick.skipped.join(', ') : pick.why), c: pick.ok ? centreOf(pick.b).map((v) => Math.round(v * 10) / 10) : null });
      }
    }
  }
  return results;
}

async function main() {
  const inv = inventory();
  const fouten = checkTable(inv);
  const world = has('world') ? path.resolve(typeof arg('world') === 'string' ? arg('world') : path.join('C:/Users/abuis/GIT/GDE-Groningen/game/world')) : null;
  let res = null;
  if (world) {
    if (!fs.existsSync(path.join(world, 'index.json'))) console.log('SKIP geen game/world (--world=<map met index.json>)');
    else res = await runWorld({ world });
  }
  if (has('json')) { console.log(JSON.stringify({ inventaris: inv.map((r) => ({ ...r, cutscenes: r.cutscenes.map((c) => ({ id: c.id, duur: c.duur })) })), fouten, wereld: res }, null, 1)); }
  else {
    console.log(render(inv));
    const echt = inv.filter((r) => r.tabel && r.tabel.status === 'echt' && PLAYED_SETS.includes(r.set)), terug = inv.filter((r) => r.tabel && r.tabel.status === 'terugval');
    console.log(`\n${inv.length} sets: ${echt.length} met een echte-wereld-mapping, ${terug.length} bewuste terugval, ${inv.filter((r) => r.tabel && r.tabel.status === 'geen-set').length} nog zonder binnenset; ${inv.reduce((n, r) => n + r.cutscenes.length, 0)} cutscenes, ${inv.reduce((n, r) => n + r.stappen.length, 0)} missiestappen, ${inv.reduce((n, r) => n + r.terugkeer.length, 0)} terugkeervignetten`);
    for (const f of fouten) console.log('FOUT ' + f.set + ': ' + f.fout);
    if (res) {
      console.log('\nPandkeuze op de echte tegels:');
      for (const r of res) console.log(`  ${r.set.padEnd(11)} ${r.plek.padEnd(22)} ${r.scene.padEnd(10)} ${r.ok ? `pand ${r.gid} (${r.kind}, hal ${r.hal.join(' x ')}) op ${r.d} m${r.vast ? ', vast: ' + r.vast : ''}, middelpunt ${r.c.join(',')}` : 'TERUGVAL: ' + r.why}`);
    }
  }
  let strict = false;
  if (has('strict')) {
    if (fouten.length) strict = true;
    if (res) for (const k of REAL_SET_KEYS) for (const f of REAL_SETS[k].fixed) {
      const r = res.find((x) => x.set === k && x.plek === f.place && x.ok);
      if (res.some((x) => x.set === k && x.plek === f.place) && (!r || r.gid !== f.gid)) { strict = true; console.log(`FOUT ${k}: de vaste plek ${f.place} (pand ${f.gid}) komt niet uit de wereld`); }
    }
  }
  process.exit(strict ? 1 : 0);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
export { isRealSet };
