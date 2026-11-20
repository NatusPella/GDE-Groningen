// Binnenmissies (M03 het Loket en de andere stappen met `set`): elke stap bereikbaar, de kamercamera nooit in een wand of een
// meubel, en de figuren (cast) binnen de kamer. Pure data: ROOMS (roomspec.js) en de echte stappen uit missions_nieuw.js.
//   node scripts/binnenmissies_test.mjs
import './node3d.mjs';

const B = await import('../game/js/binnenset.js');
const { ROOMS, ROOM_KINDS, roomLayout } = await import('../game/js/roomspec.js');
const { buildNieuwDefs, applyNieuw } = await import('../game/js/missions_nieuw.js');
const { STAGE_SETS, stageSetLayout } = await import('../game/js/stagesets.js');

let n = 0, bad = 0;
const ok = (naam, c, info = '') => { n++; if (!c) { bad++; console.log('FAIL', naam, info); } };

const defs = buildNieuwDefs({ map: null, walk: (x) => x, drive: (x) => x, models: {} });
applyNieuw(defs);
const stappen = [];
for (const d of defs) for (const [i, s] of (d.stages || []).entries()) if (s && s.set) stappen.push({ def: d, s, i });

// --- 1. elke stap met een kamer verwijst naar een bestaande kamer en variant, met een stapsoort die er te spelen is ---------------
ok(stappen.length >= 14, `er zijn stappen in een kamer (${stappen.length})`);
const SOORTEN = ['hold', 'choice', 'bake', 'goto'];
for (const { def, s, i } of stappen) {
  const naam = `${def.label} stap ${i}`;
  ok(STAGE_SETS.includes(s.set) && B.isSetKind(s.set), `${naam}: kamer ${s.set} bestaat`);
  ok(SOORTEN.includes(s.kind), `${naam}: stapsoort ${s.kind} is in een kamer te spelen`);
  if (s.setVariant) ok(!!(ROOMS[s.set] && ROOMS[s.set].varianten && ROOMS[s.set].varianten[s.setVariant]), `${naam}: variant ${s.setVariant} bestaat`);
  if (s.kind === 'choice') ok(Array.isArray(s.rounds) && s.rounds.length > 0 && s.rounds.every((r) => r.options && r.options.length >= 2), `${naam}: een keuze met opties (er is niets om naartoe te lopen)`);
  if (s.kind === 'hold') ok(s.target && Number.isFinite(s.target.x) && s.radius >= 3 && s.time > 0, `${naam}: een hold met doel, straal en tijd (de kamer houdt de speler op zijn plek)`);
}

// --- 2. de kamer zelf: speler, figuren en meubels ---------------------------------------------------------------------------------
const inBox = (m, u, v, marge = 0) => Math.abs(u - m.u) <= m.w / 2 + marge && Math.abs(v - m.v) <= m.d / 2 + marge;
function kamers() {
  const uit = [];
  for (const k of ROOM_KINDS) {
    uit.push({ naam: k, kind: k, spec: ROOMS[k], npcs: ROOMS[k].npcs });
    for (const [vn, npcs] of Object.entries(ROOMS[k].varianten || {})) uit.push({ naam: `${k}/${vn}`, kind: k, spec: ROOMS[k], npcs });
  }
  return uit;
}
for (const K of kamers()) {
  const { spec, npcs, naam } = K;
  ok(spec.furniture.every((m) => Math.abs(m.u) + m.w / 2 <= spec.w / 2 + 1e-9 && Math.abs(m.v) + m.d / 2 <= spec.d / 2 + 1e-9), `${naam}: alle meubels staan binnen de wanden`);
  ok(!spec.furniture.some((m) => inBox(m, spec.player.u, spec.player.v, 0.35)), `${naam}: de speler staat niet in een meubel`);
  ok(npcs.every((q) => !spec.furniture.some((m) => inBox(m, q.u, q.v, 0.25)) && Math.abs(q.u) < spec.w / 2 - 0.4 && Math.abs(q.v) < spec.d / 2 - 0.4), `${naam}: elke figuur staat vrij binnen de wanden`);
  ok(npcs.every((q) => Math.hypot(q.u - spec.player.u, q.v - spec.player.v) > 0.8), `${naam}: geen figuur op de speler`);

  // bereikbaarheid: raster van 0,2 m, meubels 0,3 m opgeblazen; alles wat vrij is hangt aan de plek van de speler
  const st = 0.2, nu = Math.round(spec.w / st), nv = Math.round(spec.d / st);
  const vrij = (iu, iv) => {
    const u = -spec.w / 2 + (iu + 0.5) * st, v = -spec.d / 2 + (iv + 0.5) * st;
    return Math.abs(u) < spec.w / 2 - 0.3 && Math.abs(v) < spec.d / 2 - 0.3 && !spec.furniture.some((m) => inBox(m, u, v, 0.3));
  };
  const cel = (u, v) => [Math.floor((u + spec.w / 2) / st), Math.floor((v + spec.d / 2) / st)];
  const [su, sv] = cel(spec.player.u, spec.player.v);
  const gezien = new Set([su * 1000 + sv]); const rij = [[su, sv]];
  while (rij.length) {
    const [a, b] = rij.pop();
    for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = a + da, y = b + db;
      if (x < 0 || y < 0 || x >= nu || y >= nv || gezien.has(x * 1000 + y) || !vrij(x, y)) continue;
      gezien.add(x * 1000 + y); rij.push([x, y]);
    }
  }
  let totaal = 0;
  for (let a = 0; a < nu; a++) for (let b = 0; b < nv; b++) if (vrij(a, b)) totaal++;
  ok(gezien.size >= totaal * 0.9, `${naam}: minstens 90% van de vrije vloer is te bereiken (${gezien.size}/${totaal})`);
  // naast elke figuur is een bereikbare plek (op 0,9 m: praten en kijken kan)
  ok(npcs.every((q) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([du, dv]) => { const [a, b] = cel(q.u + du * 0.9, q.v + dv * 0.9); return gezien.has(a * 1000 + b); })), `${naam}: bij elke figuur kun je komen`);

  // de kamercamera: binnen de wanden, onder het plafond, nooit in een meubel of in een figuur
  const lay = roomLayout(K.kind, { x: 100, y: 50, angle: 0 });
  let goed = true, inFig = false, inMeubel = false;
  for (const t of [0, 20, 60]) {
    const p = B.roomCameraPose(K.kind, lay, 0, t);
    if (!p || !B.cameraInside(K.kind, lay, 0, p.position) || !B.cameraInside(K.kind, lay, 0, { x: p.lookAt.x, y: p.lookAt.y, z: 1 })) goed = false;
    const u = p.position.x - lay.x, v = p.position.y - lay.y;
    if (spec.furniture.some((m) => inBox(m, u, v, 0.1) && m.h >= p.position.z - 0.3)) inMeubel = true;
    if (npcs.some((q) => Math.hypot(q.u - u, q.v - v) < 0.6)) inFig = true;
  }
  ok(goed, `${naam}: de kamercamera en zijn kijkpunt zitten binnen de wanden (${B.WALL_MARGIN} m) en onder het plafond`);
  ok(!inMeubel && !inFig, `${naam}: de kamercamera zit niet in een meubel of een figuur`, `meubel ${inMeubel} figuur ${inFig}`);
}

// --- 3. de vier oudere kamers (kantoor, serverkamer, loket, omakeuken): camera en speler binnen de wanden, figuren van de scenes -----
for (const kind of STAGE_SETS.filter((k) => !ROOM_KINDS.includes(k))) {
  const lay = stageSetLayout(kind, { x: 100, y: 50, angle: 0 });
  const fp = B.setFootprint(kind, lay);
  if (lay.hold) {
    ok(B.inFootprint(fp, lay.hold.x, lay.hold.y, -B.WALL_MARGIN), `${kind}: de speler staat binnen de wanden`);
    const p = B.roomCameraPose(kind, lay, 0, 0);
    ok(p && B.cameraInside(kind, lay, 0, p.position) && B.inFootprint(fp, p.lookAt.x, p.lookAt.y, -B.WALL_MARGIN + 1e-9), `${kind}: camera en kijkpunt binnen de wanden`);
  }
}
for (const { def, s, i } of stappen.filter((x) => x.s.kind === 'scene' || x.s.cast)) {
  const d = B.SET_DIMS[s.set];
  ok(!d || (s.cast || []).every((c) => !c.at || (Math.abs(c.at[0]) < d.w / 2 - 0.4 && Math.abs(c.at[1]) < d.d / 2 - 0.4)), `${def.label} stap ${i}: de figuren van de scene staan binnen de kamer`);
}
// M03: de scene tussen de hold en de keuzes speelt in dezelfde kamer als zijn buren
{
  const loket = defs.find((d) => d.label === 'Het Loket');
  const rij = loket.stages;
  const scene = rij.find((s) => s.kind === 'scene');
  ok(scene && scene.cast.every((c) => Math.abs(c.at[0]) < B.SET_DIMS.loket.w / 2 - 0.4 && Math.abs(c.at[1]) < B.SET_DIMS.loket.d / 2 - 0.4), 'M03: Jelle en de bewaarder staan in de hal');
  ok(rij.filter((s) => s.set === 'loket').length === 4 && rij[0].kind === 'goto' && !rij[0].set, 'M03: de aanloop is buiten, daarna vier stappen in de hal');
}

// --- 4. elke binnenmissie heeft een beat en een nasleep (AAA) -------------------------------------------------------------------
{
  const { tussenBeats, slotRij } = await import('../game/js/missionbeats.js');
  for (const d of new Set(stappen.map((x) => x.def))) {
    const beat = tussenBeats(d.label).length > 0 || d.stages.some((s) => Array.isArray(s.beats) && s.beats.length);
    const nasleep = !!slotRij(d.label) || (Array.isArray(d.nasleep) && d.nasleep.length > 0);
    ok(beat, `${d.label}: een beat in de kamer`);
    ok(nasleep, `${d.label}: een nasleep na de uitslag`);
  }
}

console.log(`binnenmissies_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
