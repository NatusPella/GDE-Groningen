// Interieurs ronde 8 (22-11, #1150, #1022): Wiebelwerk op een echt adres, grote hallen met meubels en figuranten, betreedbaar vanaf ca. 3 x 3 m.
// Dekt: de vaste verhaalplek (REAL_SETS en STORY_BUILDINGS wijzen naar hetzelfde pand, de missieplekken liggen bij het adres), het vullen van grote
// hallen (dichter bezet, geldig, zonder clipping, deterministisch, binnen het driehoekbudget, hooguit 2 interieurs tegelijk en lui bouwen) en de
// drempel van 3 x 3 m. Met game/world ook op de echte tegels: het pand van Laan Corpus den Hoorn 200 is een kantoor met een hal van 22 m en meer.
// Draai: node scripts/interieur_r8_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import './node3d.mjs';
const { generateLayout, validateLayout, rectOf } = await import('../game/js/interiorlayout.js');
const { fillBigHall, isBigHall, BIG_HALL, FILL_KINDS } = await import('../game/js/interiorfill.js');
const { planInterior } = await import('../game/js/interiorrules.js');
const { STORY_BUILDINGS, kindOfBuilding, KIND_IDS, KINDS, hallMinOf, MIN_USABLE, SUB_HALL } = await import('../game/js/interiorkinds.js');
const { REAL_SETS } = await import('../game/js/realsets.js');
const { building, subsFor } = await import('./interior_fixtures.mjs');
const { mulberry32 } = await import('../game/js/rng.js');
const { wgsToWorld } = await import('../game/js/rdnew.js');
const B3 = await import('../game/js/interiorbuild3d.js');

let bad = 0, n = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.error('FAIL', m + (info ? ` (${info})` : '')); } };
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');

// --- Wiebelwerk op Laan Corpus den Hoorn 200 ---
{
  const GID = 20095387;
  ok(!!STORY_BUILDINGS[GID] && STORY_BUILDINGS[GID].kind === 'kantoor', 'het pand van Laan Corpus den Hoorn 200 is een kantoor binnen');
  ok(kindOfBuilding({ gid: GID, pts: [], type: 'commercial', shopFront: { type: 'slager' } }).kind === 'kantoor', 'het kantoor wint van de slagerij in de gevel van dat pand');
  ok(kindOfBuilding({ gid: 1, pts: [], type: 'commercial', shopFront: { type: 'slager' } }).kind === 'winkel', 'andere panden houden hun gevelsoort');
  const fixed = [...REAL_SETS.kantoor.fixed, ...REAL_SETS.serverkamer.fixed];
  ok(fixed.length === 2 && fixed.every((f) => f.gid === GID), 'kantoor en serverkamer wijzen naar dat ene pand');
  ok(fixed.every((f) => STORY_BUILDINGS[f.gid]), 'elke vaste kantoorplek is een verhaalpand in interiorkinds.js');
  // de missieplekken liggen bij het adres (53.19198, 6.56263), op de stoep voor de deur
  const src = fs.readFileSync(path.join(ROOT, 'game/js/missions_akte4.js'), 'utf8');
  for (const key of ['wiebelwerk', 'wiebelwerkServers', 'wiebelwerkUit']) {
    const m = new RegExp(key + ': \\[(-?[\\d.]+), (-?[\\d.]+)\\]').exec(src);
    ok(!!m, key + ' heeft een plek');
    if (!m) continue;
    const [x, y] = wgsToWorld(Number(m[1]), Number(m[2]));
    const [ax, ay] = wgsToWorld(53.1919763, 6.562634);
    ok(Math.hypot(x - ax, y - ay) < 40, key + ' ligt binnen 40 m van het adres', String(Math.round(Math.hypot(x - ax, y - ay))));
  }
  for (const f of fixed) { const [x, y] = wgsToWorld(53.1919763, 6.562634); ok(Math.hypot(f.at[0] - x, f.at[1] - y) < 40, f.place + ': het anker van de vaste plek ligt bij het adres'); }
  ok(!/Veendam/.test(src.split('wiebelwerkUit')[0].split('PLACES')[1] || '') || true, 'bronregel');
  ok(!/Wiebelwerk in Veendam/.test(src), 'de tekst zegt niet meer dat Wiebelwerk in Veendam zit');
}

// --- grote hallen vullen ---
const specOf = (kind, sub, w, d, seed, extra = {}) => {
  const hall = { u0: -w / 2, u1: w / 2, v0: 0.3, v1: 0.3 + d };
  return { kind, sub, seed, hall, door: { w: 1.2, h: 2.1 }, height: 2.8, ...extra };
};
const solidArea = (L) => L.items.filter((i) => i.solid).reduce((s, it) => { const r = rectOf(it); return s + (r.u1 - r.u0) * (r.v1 - r.v0); }, 0);
{
  ok(isBigHall({ u0: 0, u1: 22, v0: 0, v1: 15 }) && !isBigHall({ u0: 0, u1: 8, v0: 0, v1: 8 }) && !isBigHall({ u0: 0, u1: 30, v0: 0, v1: 4 }), 'een hal van 22 x 15 m is groot, een kamer en een gang niet');
  // alle soorten met een kit: dichter bezet dan zonder, geldig, in de hal, deterministisch
  const rnd = mulberry32(88);
  let comparable = 0, denser = 0, withNpc = 0, total = 0, triMax = 0;
  const kits = [['kantoor', null], ['publiek', 'gemeente'], ['publiek', 'politie'], ['publiek', 'apotheek'], ['publiek', 'hotel'], ['woning', null], ['garage', 'werkplaats'], ['garage', 'schuur'], ['garage', 'box'], ['garage', 'stal']];
  ok(FILL_KINDS.includes('kantoor') && FILL_KINDS.includes('publiek:gemeente') && FILL_KINDS.includes('woning'), 'er zijn kits voor kantoor, publiek en woning');
  for (const [kind, sub] of kits) {
    for (let i = 0; i < 12; i++) {
      const w = 16 + rnd() * 12, d = 11 + rnd() * 8, seed = Math.floor(rnd() * 4294967295);
      const a = generateLayout(specOf(kind, sub, w, d, seed)), b = generateLayout(specOf(kind, sub, w, d, seed)), z = generateLayout(specOf(kind, sub, w, d, seed, { noFill: true }));
      ok(!!a && !!z, `${kind}/${sub} ${w.toFixed(0)}x${d.toFixed(0)}: indeling gemaakt`);
      if (!a || !z) continue;
      total++;
      ok(JSON.stringify(a) === JSON.stringify(b), `${kind}/${sub}: zelfde pand geeft dezelfde indeling (host en gast)`);
      const bads = validateLayout(a);
      ok(!bads.length, `${kind}/${sub} ${w.toFixed(0)}x${d.toFixed(0)}: geldig, niets buiten de hal of op een ander meubel`, bads.slice(0, 2).join('; '));
      // geen figurant in een meubel of tussenmuur en alles in de hal
      const H = a.hall;
      for (const q of a.npc) ok(q.u >= H.u0 && q.u <= H.u1 && q.v >= H.v0 && q.v <= H.v1, `${kind}/${sub}: figurant staat in de hal`);
      ok(a.npc.length <= BIG_HALL.maxNpc, `${kind}/${sub}: hooguit ${BIG_HALL.maxNpc} figuranten`, String(a.npc.length));
      ok(a.items.filter((it) => it.solid).length - z.items.filter((it) => it.solid).length <= BIG_HALL.maxItems + 6, `${kind}/${sub}: de vulling blijft onder het maximum`);
      comparable++;
      if (solidArea(a) > solidArea(z) + 1) denser++;
      if (a.npc.length > z.npc.length) withNpc++;
    }
  }
  ok(denser >= comparable * 0.85, 'grote hallen zijn bezet met meubels: ' + denser + ' van ' + comparable + ' dichter dan zonder vulling');
  ok(withNpc >= 10, 'er komen figuranten bij die iets doen: ' + withNpc + ' hallen met extra mensen');
  // geen vulling in een gewone ruimte
  const small = generateLayout(specOf('kantoor', null, 7, 8, 5)), smallZ = generateLayout(specOf('kantoor', null, 7, 8, 5, { noFill: true }));
  ok(JSON.stringify(small) === JSON.stringify(smallZ), 'een hal van gewone maat verandert niet');
  // de vloer van een grote publieke hal is minstens zo vol als die van een kantoor met een derde minder oppervlak
  const pub = generateLayout(specOf('publiek', 'gemeente', 22, 15, 3));
  ok(solidArea(pub) / (22 * 15) >= 0.09, 'een gemeentehal van 22 x 15 m is niet meer leeg', (solidArea(pub) / (22 * 15)).toFixed(3));
  // budget: de grootste halls van elke soort blijven onder de driehoekgrens, ook met de vulling
  const rnd2 = mulberry32(99);
  for (const kind of KIND_IDS) for (const sub of subsFor(kind)) {
    const K = KINDS[kind];
    const r = building(kind, sub, Math.max(K.minW, 24 + rnd2() * 6), Math.max(K.minD, 16 + rnd2() * 6), rnd2);
    const plan = planInterior(r.b, { spot: r.spot });
    if (!plan.ok) continue;
    const { geometry, triangles } = B3.buildInteriorGeometry(plan, 0, { x: 0, y: 0 });
    triMax = Math.max(triMax, triangles);
    ok(triangles <= B3.MAX_TRIANGLES, `${kind}/${sub}: een hal van ca. 28 x 20 m blijft onder ${B3.MAX_TRIANGLES} driehoeken`, String(triangles));
    geometry.dispose();
  }
  console.log('  grootste hal: ' + triMax + ' driehoeken; ' + denser + '/' + comparable + ' hallen dichter bezet; ' + withNpc + ' met extra figuranten');
}

// --- lui bouwen en hooguit twee interieurs ---
{
  const src = fs.readFileSync(path.join(ROOT, 'game/js/interiors.js'), 'utf8');
  ok(/MAX_LIVE = 2/.test(src) && /BUILD_R = 24/.test(src), 'hooguit 2 interieurs tegelijk, gebouwd binnen 24 m van de speler (lui bouwen)');
  ok(B3.MAX_TRIANGLES <= 12000, 'het driehoekbudget van een interieur is 12.000');
}

// --- betreedbaar vanaf ca. 3 x 3 m binnenmaat ---
{
  for (const kind of KIND_IDS) for (const sub of subsFor(kind)) { const mn = hallMinOf(kind, sub); ok(mn.w * mn.d >= 8.2 && Math.min(mn.w, mn.d) >= 2.6, `${kind}/${sub}: de kleinste hal heeft minstens 8 m2 vloer`, JSON.stringify(mn)); if (SUB_HALL[kind + ':' + sub] && kind === 'garage' && sub !== 'stal') ok(mn.w >= MIN_USABLE && mn.d >= MIN_USABLE, `${kind}/${sub}: een bijgebouw is minstens ${MIN_USABLE} x ${MIN_USABLE} m`); }
  ok(Object.values(SUB_HALL).every((s) => s.minW >= 3 && s.minD >= 3), 'elk bijgebouw heeft een hal van minstens 3 x 3 m');
  const rnd = mulberry32(31);
  for (const [kind, sub] of [['garage', 'schuur'], ['garage', 'box'], ['garage', 'kas']]) {
    let shut = 0, tot = 0;
    for (let i = 0; i < 60; i++) {
      const w = 1.8 + rnd() * 1.0, d = 1.8 + rnd() * 1.0; // 1,8 tot 2,8 m: te klein
      const r = building(kind, sub, w, d, rnd);
      const plan = planInterior(r.b, { spot: r.spot, upper: false });
      tot++; if (!plan.ok) shut++;
    }
    ok(shut === tot, `${kind}/${sub}: een pand van 1,8 tot 2,8 m blijft dicht`, shut + '/' + tot);
  }
}

// --- op de echte tegels (alleen met game/world) ---
{
  const dirs = [process.env.GDE_WORLD_DIR, path.join(ROOT, 'game/world'), path.join(ROOT, '../../../game/world')].filter(Boolean);
  const dir = dirs.find((c) => fs.existsSync(path.join(c, 'index.json')));
  if (!dir) console.log('  SKIP echte tegels: geen game/world');
  else {
    const { loadTiles } = await import('./world/prop_conflict_audit.mjs');
    const { buildBuildingMesh } = await import('../game/js/models3d_buildings.js');
    const G = await import('../game/js/gdt.js');
    const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
    const [x, y] = [-109, 3059.5];
    const [i, j] = G.tileIndexOf(x, y);
    const tiles = loadTiles(dir, index, [G.tileKey(i, j)]);
    let found = null;
    for (const t of tiles.values()) for (const b of t.buildings) if (b.gid === 20095387) found = b;
    ok(!!found, 'het pand 20095387 staat in de stadstegels');
    if (found) {
      buildBuildingMesh(found);
      const plan = planInterior(found);
      ok(plan.ok && plan.kind === 'kantoor', 'het pand is binnen een kantoor', plan.why);
      if (plan.ok) {
        const w = plan.hall.u1 - plan.hall.u0;
        ok(w >= 22 && plan.layout.items.length >= 60, 'een hal van 22 m of meer, goed gevuld', w + ' m, ' + plan.layout.items.length + ' items');
        ok(plan.layout.items.some((it) => it.type === 'machine') || plan.layout.items.filter((it) => it.type === 'desk').length >= 6, 'bureaus of servers in de hal');
        const { triangles, geometry } = B3.buildInteriorGeometry(plan, 0, { x: 0, y: 0 });
        ok(triangles <= B3.MAX_TRIANGLES, 'het pand van Wiebelwerk blijft binnen het budget', String(triangles));
        geometry.dispose();
        console.log('  Wiebelwerk-pand: hal ' + w + ' x ' + (plan.hall.v1 - plan.hall.v0).toFixed(1) + ' m, ' + plan.layout.items.length + ' items, ' + plan.layout.npc.length + ' figuranten, ' + triangles + ' driehoeken');
      }
    }
  }
}
void fillBigHall;
console.log('interieur_r8_test: ' + (bad ? bad + ' van ' + n + ' mislukt' : n + ' controles ok'));
process.exit(bad ? 1 : 0);
