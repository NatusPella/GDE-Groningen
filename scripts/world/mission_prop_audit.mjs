// De plekken van de missierekwisieten tegen de echte wereldtegels (#1035): de kraan van M13 stond in een
// weiland en de container op de weg, omdat de plekken losse offsets van een gok waren.
//
//   node scripts/world/mission_prop_audit.mjs [--strict] [--json] [--world=<map met index-provincie.json>]
//
// Twee delen:
//  1. Het containerplan van M13 (kade, kraan, rollen, stapel, pad, kadevloer): niet op een weg, niet in water, niet in
//     een gebouw, niet op het spoor, kraan aan de kade (8 tot 60 m van het water), alles binnen M13_MAX_ANCHOR_DIST van
//     het anker.
//  2. Alle missieplekken van de nieuwe verhaalboog (start, doel, stapdoelen, finish, aankleding) die zonder wegsnap zijn
//     gekozen (road: null, dus losse coordinaten in de provincie): te voet niet op een weg, nergens in water, in een
//     gebouw of op het spoor. Plekken die de runner op een weg snapt (road gezet) horen op de weg en tellen niet mee.
//
// Zonder wereldtegels lokaal (game/world of GDE_WORLD_DIR, ook in de hoofdmap van een worktree) meet de audit niets en
// zegt dat eerlijk: "niet op echte wereld gemeten" (exit 0; de pure logica staat in scripts/containerplan_test.mjs).
import '../node3d.mjs';
import { findWorldDir, loadWorldMap, distToWater } from './mission_prop_lib.mjs';

const { spotProblems, nearestClearSpot } = await import('../../game/js/missionplace.js');
const { m13Problems, M13_CRANE, M13_ANCHOR_WGS, M13_MAX_ANCHOR_DIST, M13_QUAY, M13_CONTAINER, M13_LAMMERT } = await import('../../game/js/containerplan.js');
const { wgsToWorld } = await import('../../game/js/rdnew.js');
const { buildNieuwDefs } = await import('../../game/js/missions_nieuw.js');

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const json = args.includes('--json');
const worldArg = (args.find((a) => a.startsWith('--world=')) || '').slice(8) || null;

// Wat --strict toestaat: een plek die hoogstens GRENS_M van de dichtstbijzijnde vrije plek ligt is een grensgeval (de plek hoort
// bij een sluis, een perron of een gevel; de runner zet de speler bij een start op open grond). Verder niets: elke afwijker
// daarboven is fout. Een grensgeval staat in de uitvoer, zodat het niet stil blijft.
export const GRENS_M = 15;
export const ALLOW = {};

// Alle spots van de nieuwe boog met road: null, als [missie, soort, x, y, voet].
export function collectSpots() {
  const id = (x, y) => ({ x, y, road: 'snap' }); // de runner snapt deze op een weg: de audit slaat ze over
  const map = new Proxy({}, { get: (t, k) => (k === 'then' ? undefined : () => []) });
  const defs = buildNieuwDefs({ map, walk: id, drive: id, models: {} });
  const out = [];
  const add = (def, kind, p, foot) => {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.road) return;
    out.push([def.label, kind, p.x, p.y, foot]);
  };
  for (const def of defs) {
    const foot = !!def.onFoot;
    add(def, 'start', def.start, foot);
    add(def, 'dest', def.dest, foot);
    for (const [i, st] of (def.stages || []).entries()) {
      const f = foot && st.mode !== 'car' && !st.race && st.kind !== 'chase';
      add(def, `stap${i}:${st.kind}`, st.target, f);
      add(def, `stap${i}:finish`, st.finish, false);
      add(def, `stap${i}:aankleding`, st.dressingAt, f);
    }
  }
  return out;
}

const result = { gemeten: false, wereld: null, m13: [], spots: [], afwijkers: [], grensgevallen: [], nietBekeken: [] };

const dir = findWorldDir(worldArg);
if (!dir) {
  result.nietBekeken.push('geen wereldtegels lokaal (game/world of GDE_WORLD_DIR): niet op echte wereld gemeten');
} else {
  result.gemeten = true;
  result.wereld = dir;
  const spots = collectSpots();
  // 1. M13
  {
    const cx = M13_CONTAINER.x, cy = M13_CONTAINER.y;
    const map = loadWorldMap(dir, cx, cy, 400);
    for (const [n, x, y] of m13Problems(map)) result.afwijkers.push(`M13 ${n} staat op een weg, in water, in een gebouw of op het spoor (${x.toFixed(0)}, ${y.toFixed(0)})`);
    const dw = distToWater(map, M13_CRANE.x, M13_CRANE.y, 200);
    result.m13.push(['kraan tot water', Math.round(dw)]);
    if (!(dw >= 8 && dw <= 60)) result.afwijkers.push(`M13 kraan staat ${Number.isFinite(dw) ? dw.toFixed(0) + ' m' : 'ver'} van het water (hoort op de kade: 8 tot 60 m)`);
    const [ax, ay] = wgsToWorld(M13_ANCHOR_WGS[0], M13_ANCHOR_WGS[1]);
    for (const [n, p] of [['kade', M13_QUAY], ['kraan', M13_CRANE], ['container', M13_CONTAINER], ['Lammert', M13_LAMMERT]]) {
      const d = Math.hypot(p.x - ax, p.y - ay);
      result.m13.push([`${n} tot anker`, Math.round(d)]);
      if (d > M13_MAX_ANCHOR_DIST) result.afwijkers.push(`M13 ${n} staat ${d.toFixed(0)} m van het anker (hoogstens ${M13_MAX_ANCHOR_DIST})`);
    }
  }
  // 2. alle missieplekken zonder wegsnap
  const maps = new Map();
  const mapAt = (x, y) => {
    const k = `${Math.round(x / 500)}_${Math.round(y / 500)}`;
    if (!maps.has(k)) maps.set(k, loadWorldMap(dir, Math.round(x / 500) * 500, Math.round(y / 500) * 500, 400));
    return maps.get(k);
  };
  for (const [missie, soort, x, y, foot] of spots) {
    const map = mapAt(x, y);
    const p = spotProblems(map, x, y, 1).filter((q) => foot || q !== 'weg');
    result.spots.push({ missie, soort, x: Math.round(x), y: Math.round(y), problemen: p });
    if (p.length && !ALLOW[`${missie}|${soort}`]) {
      const near = nearestClearSpot(map, x, y, { r: 3, maxD: 60, step: 3 });
      const txt = `${missie} ${soort} (${x.toFixed(0)}, ${y.toFixed(0)}): ${p.join(', ')}; vrije plek ${near ? near.moved + ' m' : 'niet binnen 60 m'} verder`;
      if (near && near.moved <= GRENS_M) result.grensgevallen.push(txt); else result.afwijkers.push(txt);
    }
  }
}

if (json) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`mission_prop_audit: ${result.gemeten ? 'gemeten op ' + result.wereld : 'NIET gemeten'}`);
  for (const [n, v] of result.m13) console.log(`  M13 ${n}: ${v} m`);
  console.log(`  missieplekken zonder wegsnap: ${result.spots.length}, afwijkers: ${result.afwijkers.length}, grensgevallen: ${result.grensgevallen.length}`);
  for (const a of result.grensgevallen) console.log(`  grensgeval ${a}`);
  for (const a of result.afwijkers) console.log(`  AFWIJKER ${a}`);
  for (const a of result.nietBekeken) console.log(`  ${a}`);
}
if (strict && result.afwijkers.length) process.exit(1);
