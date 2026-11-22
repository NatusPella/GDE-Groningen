// Echte-wereld-sets (realsets.js, realsetrun.js; docs/CUTSCENE-INTERIEURS-22-11.md): de tabel, de pandkeuze (deterministisch, vaste
// verhaalplekken, wachten op de gevel), de scène in de hal (vrij van meubels, zitplekken), de camera- en acteursgrenzen op 13 echte
// scènes in CPU-geometrie (de camera blijft in de hal, onder het plafond, niet in een muur), de kamercamera van binnenmissies, het
// terugzetten van de speler en de terugval. Geen Electron en geen wereld: panden komen uit interior_fixtures.mjs.
//   node scripts/realsets_test.mjs
import { readFileSync } from 'node:fs';
import './node3d.mjs';
const R = await import('../game/js/realsets.js');
const { planInterior } = await import('../game/js/interiorrules.js');
const { building } = await import('./interior_fixtures.mjs');
const { mulberry32 } = await import('../game/js/rng.js');
const { buildCatalog } = await import('../game/js/cutpreview.js');
const { toLocal } = await import('../game/js/interiorframe.js');
const { SET_DIMS } = await import('../game/js/binnenset.js');
const { STAGE_SETS } = await import('../game/js/stagesets.js');

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.error('FAIL', m + (info ? ` (${info})` : '')); } };
const src = (f) => readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');

// --- een pand uit de fixtures op een plek met een gid --------------------------------------------------------------------------
function pand(kind, sub, w, d, ox, oy, gid, seed = 7) {
  const { b, spot } = building(kind, sub, w, d, mulberry32(seed + gid));
  const mv = (p) => [p[0] + ox, p[1] + oy];
  const en = { ...b.entrance, ax: b.entrance.ax + ox, ay: b.entrance.ay + oy };
  const out = { ...b, gid, pts: b.pts.map(mv), bounds: [b.bounds[0] + ox, b.bounds[1] + oy, b.bounds[2] + ox, b.bounds[3] + oy], entrance: en, sd: [b.sd[0] + ox, b.sd[1] + oy] };
  return { b: out, spot };
}
const planOfFor = (list) => {
  const spots = new Map(list.map((p) => [p.b, p.spot]));
  const cache = new Map();
  return (b) => {
    if (!spots.has(b)) return null;
    if (!cache.has(b)) { const plan = planInterior(b, { spot: spots.get(b) }); cache.set(b, { ok: plan.ok, plan, why: plan.why }); }
    return cache.get(b);
  };
};

// --- de tabel ---------------------------------------------------------------------------------------------------------------
{
  for (const k of R.PLAYED_SETS) ok(!!R.REAL_SETS[k], 'de gespeelde set ' + k + ' staat in de tabel');
  ok(STAGE_SETS.every((k) => !!R.REAL_SETS[k]), 'elke stap-set (stagesets.js) staat in de tabel');
  ok(R.PLAYED_SETS.every((k) => !!SET_DIMS[k] || k === 'keuken'), 'elke gespeelde set heeft maten (binnenset.js) of is de keuken');
  for (const [k, s] of Object.entries(R.REAL_SETS)) {
    ok(['echt', 'terugval', 'geen-set'].includes(s.status), k + ': een bekende status');
    ok(typeof s.label === 'string' && s.label.length > 3, k + ': een naam');
    if (s.status === 'echt') {
      ok(s.kinds.length > 0 && s.r >= 40 && s.minHall.w > 2 && s.minHall.d > 2, k + ': soorten, straal en minimale hal');
      for (const f of s.fixed) ok(Number.isFinite(f.gid) && f.at.length === 2 && f.c.length === 2, k + ': een vaste plek heeft gid, anker en middelpunt');
    } else if (s.status === 'terugval') ok(typeof s.why === 'string' && s.why.length > 20, k + ': een bewuste terugval heeft een reden');
  }
  ok(R.isRealSet('loket') && !R.isRealSet('keuken') && !R.isRealSet('kruitkelder') && !R.isRealSet('kapper'), 'loket is echt; keuken, kruitkelder en kapper (nog geen set) niet');
}

// --- de pandkeuze ---------------------------------------------------------------------------------------------------------------
{
  const A = { x: 0, y: 0 };
  const list = [
    pand('woning', null, 12, 14, -30, 10, 101), pand('kantoor', null, 14, 16, 5, -5, 102), pand('kantoor', null, 16, 18, -10, -40, 103),
    pand('winkel', 'bakker', 12, 14, 5, 30, 104), pand('kantoor', null, 14, 16, 40, 40, 105),
  ];
  const buildings = list.map((p) => p.b);
  const planOf = planOfFor(list);
  const pts = [[0, 0], [3.25, -0.4], [1.2, 2.4]];
  const p1 = R.pickRealSet({ key: 'kantoor', anchor: A, buildings, planOf, points: pts });
  ok(p1.ok && p1.gid === 102, 'het nabijste kantoor wint (niet de woning, niet de bakker)', JSON.stringify([p1.ok, p1.gid, p1.why]));
  // deterministisch: volgorde van de lijst, een omgekeerde lijst en een tweede aanroep geven hetzelfde pand en hetzelfde anker (host = gast)
  const p2 = R.pickRealSet({ key: 'kantoor', anchor: A, buildings: [...buildings].reverse(), planOf, points: pts });
  const p3 = R.pickRealSet({ key: 'kantoor', anchor: { ...A }, buildings: [...buildings].sort((a, b) => b.gid - a.gid), planOf: planOfFor(list), points: pts });
  ok(p2.gid === p1.gid && p3.gid === p1.gid, 'dezelfde wereld geeft bij elke volgorde hetzelfde pand', [p1.gid, p2.gid, p3.gid].join());
  ok(p2.fit.x === p1.fit.x && p2.fit.y === p1.fit.y && p2.fit.facing === p1.fit.facing && p3.fit.x === p1.fit.x, 'en hetzelfde anker in de hal');
  // gelijke afstand: de laagste gid wint
  const t1 = pand('kantoor', null, 14, 16, 20, -8, 201), t2 = pand('kantoor', null, 14, 16, 20, -8, 200);
  const pt = R.pickRealSet({ key: 'kantoor', anchor: A, buildings: [t1.b, t2.b], planOf: planOfFor([t1, t2]), points: pts });
  ok(pt.ok && pt.gid === 200, 'bij gelijke afstand wint de laagste gid', String(pt.gid));
  // een pand zonder gevel (geen deur getekend) telt niet mee: het volgende pand wint
  const noFacade = R.pickRealSet({ key: 'kantoor', anchor: A, buildings, planOf: (b) => (b.gid === 102 ? null : planOf(b)), points: pts });
  ok(noFacade.ok && noFacade.gid === 103, 'een pand zonder getekende gevel telt niet mee', JSON.stringify([noFacade.ok, noFacade.gid]));
  // te ver (buiten r)
  const far = R.pickRealSet({ key: 'kantoor', anchor: { x: 5000, y: 5000 }, buildings, planOf, points: pts });
  ok(!far.ok && /geen pand binnen/.test(far.why), 'geen pand binnen de straal: terugval met reden', far.why);
  // de vaste verhaalplek wacht op zijn gevel (pending)
  {
    const fx0 = R.REAL_SETS.kantoor.fixed[0];
    const fb = pand('kantoor', null, 16, 18, fx0.c[0] - 8, fx0.c[1] - 9, fx0.gid);
    const pp = R.pickRealSet({ key: 'kantoor', anchor: { x: fx0.at[0], y: fx0.at[1] }, buildings: [fb.b], planOf: () => null, points: pts });
    ok(!pp.ok && pp.pending === true, 'de vaste verhaalplek zonder getekende gevel geeft pending', JSON.stringify([pp.ok, pp.pending, pp.why]));
    const lm = { gid: 0, landmark: true, name: 'Stadhuis', pts: [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]], bounds: [0, 0, 10, 10], type: 'yes' };
    const pl = R.pickRealSet({ key: 'kantoor', anchor: { x: 5, y: 5 }, buildings: [lm, ...buildings], planOf, points: pts });
    ok(pl.ok && pl.gid !== 0 && !pl.pending, 'een bezienswaardigheid (landmark) wordt overgeslagen, er wordt niet op gewacht');
  }
  // een scène die niet past valt op het volgende pand of op de terugval
  const huge = R.pickRealSet({ key: 'kantoor', anchor: A, buildings, planOf, points: [[0, 0], [40, 0]] });
  ok(!huge.ok && /past niet|geen geschikt/.test(huge.why), 'een scène van 40 m past in geen hal', huge.why);
  // vaste verhaalplek: de gid wint ook als hij verder weg staat, mits zijn middelpunt klopt
  const spec = R.REAL_SETS.kantoor, fx = spec.fixed[0];
  const fixedPand = pand('kantoor', null, 16, 18, fx.c[0] - 8 - fx.at[0] + 30, fx.c[1] - 9 - fx.at[1] - 28, fx.gid);
  const near = pand('kantoor', null, 14, 16, 4, -10, 9001);
  // het anker ligt op de vaste plek; het vaste pand ligt 40 m weg, een ander kantoor 10 m
  const Af = { x: fx.at[0], y: fx.at[1] };
  const place = pand('kantoor', null, 16, 18, 0, 0, fx.gid);
  const shifted = (p, ox, oy) => pand('kantoor', null, 16, 18, ox, oy, p);
  const fixedB = shifted(fx.gid, fx.c[0] - 8, fx.c[1] - 9), nearB = shifted(9001, Af.x + 14, Af.y - 6);
  void fixedPand; void near; void place;
  const pf = R.pickRealSet({ key: 'kantoor', anchor: Af, buildings: [nearB.b, fixedB.b], planOf: planOfFor([fixedB, nearB]), points: pts });
  ok(pf.ok && pf.gid === fx.gid && pf.place === fx.place, 'de vaste verhaalplek kiest zijn vaste pand', JSON.stringify([pf.ok, pf.gid, pf.place, pf.why]));
  // klopt het middelpunt niet (de wereld is hernummerd), dan de gewone regel
  const wrongB = shifted(fx.gid, fx.c[0] + 300, fx.c[1] + 300);
  const pw = R.pickRealSet({ key: 'kantoor', anchor: Af, buildings: [nearB.b, wrongB.b], planOf: planOfFor([wrongB, nearB]), points: pts });
  ok(pw.ok && pw.gid === 9001 && !pw.place, 'een vaste gid met een verkeerd middelpunt telt niet: het nabijste pand', JSON.stringify([pw.ok, pw.gid, pw.place]));
  // bewuste terugvallen en sets zonder binnenset
  const k = R.pickRealSet({ key: 'keuken', anchor: A, buildings, planOf, points: pts });
  ok(!k.ok && /keukenkit/.test(k.why), 'keuken: bewuste terugval met reden');
  ok(!R.pickRealSet({ key: 'kruitkelder', anchor: A, buildings, planOf, points: pts }).ok, 'kruitkelder: bewuste terugval');
  ok(!R.pickRealSet({ key: 'kapper', anchor: A, buildings, planOf, points: pts }).ok, 'kapper: nog geen binnenset');
  ok(!R.pickRealSet({ key: 'bestaatniet', anchor: A, buildings, planOf, points: pts }).ok, 'een onbekende set valt terug');
  ok(!R.pickRealSet({ key: 'kantoor', anchor: null, buildings, planOf, points: pts }).ok && !R.pickRealSet({ key: 'kantoor', anchor: A, buildings, planOf: null, points: pts }).ok, 'zonder anker of zonder planOf valt hij terug');
}

// --- de scène in de hal ---------------------------------------------------------------------------------------------------------
{
  const p = pand('woning', null, 12, 14, 0, 0, 1), plan = planInterior(p.b, { spot: p.spot });
  ok(plan.ok, 'fixture-woning is planbaar');
  const fit = R.fitSceneInHall(plan, [[0, 0], [2, 1], [-1, -1.5]]);
  ok(!!fit, 'drie figuren passen in een woning van 12 x 14');
  if (fit) {
    for (const [f, s] of [[0, 0], [2, 1], [-1, -1.5]]) {
      const [x, y] = R.localToWorld(fit, f, s);
      const [u, v] = toLocal(plan.frame, x, y);
      ok(u >= plan.hall.u0 + R.ACTOR_MARGIN - 1e-6 && u <= plan.hall.u1 - R.ACTOR_MARGIN + 1e-6 && v >= plan.hall.v0 + R.ACTOR_MARGIN - 1e-6 && v <= plan.hall.v1 - R.ACTOR_MARGIN + 1e-6, 'het punt ' + f + ',' + s + ' staat in de hal');
      ok(R.pointInBlock(plan, x, y, 0.9, 0) === null, 'het punt staat niet in een meubel of een muur');
    }
  }
  ok(R.fitSceneInHall(plan, [[0, 0], [60, 0]]) === null, 'een punt 60 m weg past nergens');
  ok(R.fitSceneInHall(null, [[0, 0]]) === null && R.fitSceneInHall({ ok: false }, [[0, 0]]) === null, 'zonder plan geen plek');
  // een zittende figuur: alleen bij een zitplek
  const seat = plan.layout.items.find((i) => ['chair', 'stool', 'bench', 'sofa'].includes(i.type));
  const sit = R.fitSceneInHall(plan, [{ f: 0, s: 0, sit: true }]);
  if (seat) ok(!!sit, 'een zittende figuur past bij een zitplek van de woning');
  const sit2 = R.fitSceneInHall({ ...plan, layout: { ...plan.layout, items: plan.layout.items.filter((i) => !['chair', 'stool', 'bench', 'sofa'].includes(i.type)) } }, [{ f: 0, s: 0, sit: true }]);
  ok(sit2 === null, 'zonder zitplek past een zittende figuur nergens');
  ok(R.hallBigEnough(plan, { w: 4, d: 4 }) && !R.hallBigEnough(plan, { w: 40, d: 40 }), 'hallBigEnough');
}

// --- de camera en de acteurs op 13 echte scènes -------------------------------------------------------------------------------------
{
  const script = JSON.parse(readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
  const cat = buildCatalog({ script, npcSource: src('missionstory.js') });
  const KINDOF = { kantoor: ['kantoor', null, 16, 18], serverkamer: ['kantoor', null, 18, 20], loket: ['publiek', 'gemeente', 16, 18], omakeuken: ['woning', null, 12, 14], kroeg: ['horeca', 'kroeg', 14, 14], woonkamer: ['woning', null, 12, 14], garage: ['garage', 'werkplaats', 14, 14] };
  let scenes = 0, picked = 0, fell = 0;
  const falls = [];
  for (const e of cat) {
    const set = e.def && e.def.set;
    if (!set || !e.scene || !R.isRealSet(set)) continue;
    scenes++;
    const [kind, sub, w, d] = KINDOF[set];
    // een rij panden rond het anker: een te klein vlakbij en twee goede
    const list = [pand('woning', null, 5, 5, 6, 4, 900), pand(kind, sub, w, d, 10, -8, 901 + scenes * 3), pand(kind, sub, w + 3, d + 2, -25, 12, 902 + scenes * 3)];
    const A = { x: 0, y: 0 };
    const samples = R.sceneSamples(e.scene);
    const pick = R.pickRealSet({ key: set, anchor: A, buildings: list.map((q) => q.b), planOf: planOfFor(list), points: samples.actors, cams: samples.cams });
    if (!pick.ok) { fell++; falls.push(e.id + ' (' + pick.why + ')'); continue; }
    picked++;
    const plan = pick.plan, base = 0.4, env = R.hallEnv(plan, base);
    const anchor = { x: pick.fit.x, y: pick.fit.y, facing: pick.fit.facing, z: base };
    let camBad = 0, actBad = 0, wallBad = 0, sightBad = 0, frames = 0;
    for (let t = 0; t <= e.scene.duration; t += 0.2) {
      const s = e.scene.sample(t, anchor, env);
      frames++;
      const c = s.camera.position;
      if (!R.inHallXY(plan, c.x, c.y, 0.44) || c.z > base + plan.height - 0.29 || c.z < base + 0.29) camBad++;
      if (R.pointInBlock(plan, c.x, c.y, c.z, base)) wallBad++;
      for (const a of Object.values(s.actors)) if (a.visible !== false && !R.inHallXY(plan, a.x, a.y, 0.3)) actBad++;
      if (R.sightBlocked(plan, c.x, c.y, s.camera.lookAt.x, s.camera.lookAt.y)) sightBad++;
    }
    ok(camBad === 0, e.id + ' (' + set + '): de camera blijft in de hal en onder het plafond', camBad + ' van ' + frames);
    ok(actBad === 0, e.id + ': de figuren blijven in de hal', String(actBad));
    ok(wallBad <= Math.ceil(frames * 0.1), e.id + ': de camera staat hoogstens 10% van de tijd in een tussenmuur of meubel', wallBad + ' van ' + frames);
    ok(sightBad <= Math.ceil(frames * 0.1), e.id + ': de zichtlijn gaat hoogstens 10% van de tijd door een tussenmuur', sightBad + ' van ' + frames);
  }
  ok(scenes >= 10, 'minstens 10 scènes met een echte set gemeten', String(scenes));
  ok(picked >= 8, 'minstens 8 van de scènes vinden een plek in een pand met een fixture-hal', picked + ' van ' + scenes + '; terugval: ' + falls.join('; '));
  console.log(`  scènes ${scenes}, in een echt pand ${picked}, terugval ${fell}${falls.length ? ' (' + falls.join('; ') + ')' : ''}`);
}

// --- de kamercamera van een binnenmissie ----------------------------------------------------------------------------------------------
{
  const p = pand('publiek', 'gemeente', 16, 18, 3, 2, 5), plan = planInterior(p.b, { spot: p.spot });
  const [cx, cy] = [(plan.hall.u0 + plan.hall.u1) / 2, (plan.hall.v0 + plan.hall.v1) / 2];
  let camBad = 0, n2 = 0;
  const fr = plan.frame;
  for (let i = 0; i < 40; i++) {
    const u = plan.hall.u0 + 0.5 + (plan.hall.u1 - plan.hall.u0 - 1) * ((i * 7) % 13) / 12, v = plan.hall.v0 + 0.5 + (plan.hall.v1 - plan.hall.v0 - 1) * ((i * 5) % 11) / 10;
    const hx = fr.ox + fr.tx * u - fr.nx * v, hy = fr.oy + fr.ty * u - fr.ny * v;
    for (const facing of [0, 1.2, 3.1, -2]) {
      const cam = R.hallCameraPose(plan, { hold: { x: hx, y: hy }, facing }, 0.3, i * 3);
      n2++;
      if (!cam || !R.inHallXY(plan, cam.position.x, cam.position.y, 0.44) || cam.position.z > 0.3 + plan.height - 0.29 || cam.cut !== true || cam.interior !== undefined) camBad++;
    }
  }
  void cx; void cy;
  ok(camBad === 0, 'de kamercamera staat altijd in de hal, onder het plafond, als snee', camBad + ' van ' + n2);
  ok(R.hallCameraPose(plan, { hold: null }, 0, 0) === null && R.hallCameraPose(null, { hold: { x: 0, y: 0 } }, 0, 0) === null, 'de kamercamera zonder hold of plan is null');
  const c0 = R.hallCameraPose(plan, { hold: { x: fr.ox, y: fr.oy }, facing: 0 }, 0, 0), c1 = R.hallCameraPose(plan, { hold: { x: fr.ox, y: fr.oy }, facing: 0 }, 40, 40);
  ok(c0.fov > c1.fov && c1.fov === 56, 'de camera zoomt een beetje in');
}

// --- de speler terugzetten ---------------------------------------------------------------------------------------------------------------
{
  const p = pand('woning', null, 12, 14, 0, 0, 9), plan = planInterior(p.b, { spot: p.spot });
  const fr = plan.frame, inside = { x: fr.ox - fr.nx * 4, y: fr.oy - fr.ny * 4 };
  const out = { x: fr.ox + fr.nx * 6, y: fr.oy + fr.ny * 6 };
  ok(R.restorePlace(plan, out, inside) && R.restorePlace(plan, out, inside).bron === 'begin', 'de speler gaat terug naar zijn beginplek buiten de hal');
  const d = R.restorePlace(plan, inside, inside);
  ok(d && d.bron === 'deur' && !R.inHallXY(plan, d.x, d.y, -0.3), 'lag de beginplek zelf in de hal, dan komt hij buiten de deur');
  ok(R.restorePlace(plan, out, out) === null, 'wie al buiten staat blijft staan');
  ok(R.restorePlace(null, out, inside) === null && R.restorePlace(plan, out, { x: NaN, y: 0 }) === null, 'een kapotte invoer zet niemand ergens neer');
}


// --- een binnenmissie in een echt pand (stagesets.js buildStageSet met het pand van de fixtures) ----------------------------------------------
{
  const THREE = await import('three');
  const SS = await import('../game/js/stagesets.js');
  const list = [pand('woning', null, 5, 5, 6, 4, 900), pand('publiek', 'gemeente', 16, 18, 14, -10, 910)];
  const planOf = planOfFor(list);
  const base = 0.4;
  const player = { x: 0, y: 0, angle: 0.5, vx: 3, vy: 1, gz: 0 };
  const world = { map: { buildingsNear: () => list.map((q) => q.b), groundHeightAt: () => base }, lokaalLichaam: player };
  let released = 0;
  const deps = { planOf, hold: (w, b) => { const rec = planOf(b); return rec && rec.ok ? { plan: rec.plan, ground: base } : null; }, release: () => { released++; } };
  const scene = new THREE.Scene();
  const set = SS.buildStageSet(world, 'loket', player, scene, { real: true, realDeps: deps });
  ok(!!set && !!set.real, 'een Loket-stap vindt een echt pand (gemeentepand) bij de speler', set ? String(!!set.real) : 'null');
  if (set && set.real) {
    ok(set.real.gid === 910 && set.kind === 'loket' && set.group.parent === scene, 'het gekozen pand is het gemeentepand en de groep hangt in de scène');
    ok(R.inHallXY(set.real.plan, set.hold.x, set.hold.y, 0.3), 'de plek waar de speler staat (hold) ligt in de hal');
    ok(Math.abs(set.shift.x - (set.hold.x - player.x)) < 1e-9 && Math.abs(set.shift.y - (set.hold.y - player.y)) < 1e-9, 'de verschuiving is hold min speler (de hold-stap meet het doel mee)');
    ok(set.people.length >= 8 && set.people.every((q) => q.mesh.parent === set.kit.group), 'de figuren (clerk, rij) hangen in de groep van het pand');
    ok(set.zone === false && set.layout.facing === set.real.plan.frame.ox * 0 + set.layout.facing, 'geen clearzone nodig: het pand is er al');
    set.people.forEach((q, i) => {
      const wp = new THREE.Vector3(); q.mesh.getWorldPosition(wp);
      ok(R.inHallXY(set.real.plan, wp.x, wp.z, 0.2), 'figuur ' + i + ' staat in de hal');
    });
    SS.updateStageSet(set, 0.1);
    let bad = 0;
    for (let t = 0; t < 60; t += 2) {
      set.t = t;
      const cam = SS.stageSetCamera(set);
      if (!cam || !R.inHallXY(set.real.plan, cam.position.x, cam.position.y, 0.44) || cam.position.z > base + set.real.plan.height - 0.29) bad++;
    }
    ok(bad === 0, 'de kamercamera van de stap blijft in de hal');
    const b = SS.stageSetBinnen(set);
    ok(b && b.kind === 'loket' && Number.isFinite(b.x) && Number.isFinite(b.y), 'de binnenplek voor missiestaat en save is er');
    // de speler staat in de hal als de stap klaar is: hij komt terug op zijn beginplek
    player.x = set.hold.x; player.y = set.hold.y;
    SS.disposeStageSet(set);
    ok(released === 1 && !set.real, 'het pand gaat los bij het opruimen');
    ok(Math.hypot(player.x, player.y) < 1e-9 && player.vx === 0 && player.vy === 0, 'de speler staat weer op zijn beginplek en staat stil', JSON.stringify([player.x, player.y]));
  }
  // geen pand: de stap valt terug op de losse kamer (of op niets) zonder te falen
  const empty = { map: { buildingsNear: () => [], groundHeightAt: () => 0 }, lokaalLichaam: { x: 0, y: 0, angle: 0 } };
  const fb = SS.buildStageSet(empty, 'loket', empty.lokaalLichaam, scene, { real: true, realDeps: { planOf, hold: deps.hold, release: deps.release } });
  ok(!!fb && !fb.real, 'zonder pand speelt de stap in de losse kamer (terugval)');
  if (fb) SS.disposeStageSet(fb);
  const none = SS.buildStageSet({ map: { buildingsNear: () => [], groundHeightAt: () => 0 } }, 'kroeg', { x: 0, y: 0, angle: 0 }, scene, { real: true, realDeps: deps });
  ok(none === null || !none.real, 'een kroeg zonder pand valt terug');
  if (none) SS.disposeStageSet(none);
}

// --- de koppeling aan het spel en de terugval ------------------------------------------------------------------------------------------
{
  let run = null;
  try { run = await import('../game/js/realsetrun.js'); } catch (e) { console.log('  realsetrun.js niet te laden zonder spel (' + String(e && e.message).slice(0, 80) + '): alleen broncontrole'); }
  if (run) {
    const A = { x: 0, y: 0 };
    ok(run.resolveRealSet(null, 'loket', A).ok === false, 'zonder wereld: terugval');
    ok(run.resolveRealSet({ map: null }, 'loket', A).ok === false, 'zonder kaart: terugval');
    ok(run.resolveRealSet({ noRealSets: true, map: { buildingsNear: () => [] } }, 'loket', A).ok === false, 'de schakelaar noRealSets zet het uit');
    const none = run.resolveRealSet({ map: { buildingsNear: () => [] } }, 'loket', A);
    ok(none.ok === false && /geen pand/.test(none.why), 'geen panden in de buurt: terugval met reden', none.why);
    const kit = run.resolveRealSet({ map: { buildingsNear: () => [] } }, 'keuken', A);
    ok(kit.ok === false && kit.quiet === true, 'de keuken is een bewuste terugval (geen logregel per scène)');
    const log = (typeof window !== 'undefined' && window.__realSets) || [];
    ok(log.length >= 3 && log.every((x) => x.key && (x.ok ? Number.isFinite(x.gid) : typeof x.why === 'string')) && log.filter((x) => !x.ok).length >= 3, 'elke beslissing (pand of terugval met reden) laat een regel achter in window.__realSets', String(log.length));
  }
  const host = src('cutscenehost.js'), stage = src('stagesets.js'), scene3d = src('scene3d.js'), ints = src('interiors.js');
  ok(/resolveRealSet\(w, def\.set/.test(host) && /buildScriptRun\(useDef, useScene, at, env, w, !!real\)/.test(host), 'cutscenehost: de scène vraagt een echt pand en bouwt dan geen kit');
  ok(/anchor: real \? anchor0 : at/.test(host), 'cutscenehost: de gastheer stuurt het oorspronkelijke anker mee, zodat de gast dezelfde keuze maakt');
  ok(/real\.release\(\)/.test(host) && /out\.interior = true/.test(host), 'cutscenehost: het pand gaat los bij het einde en de camera krijgt interior');
  ok(/cameraOverride\.interior/.test(scene3d), 'scene3d: een camera in een hal wordt niet over het dak getild');
  ok(/export function holdInterior/.test(ints) && /sceneHeld/.test(ints), 'interiors: holdInterior en geen eigen mensen bij een vastgehouden scène');
  ok(stage.includes('realStage(world, kind, player, layout, people, ') && /restorePlace/.test(stage) && /hallCameraPose/.test(stage), 'stagesets: een stap in een echt pand, camera en terugzetten');
}

console.log(`${n - bad}/${n} controles in orde${bad ? ', ' + bad + ' MISLUKT' : ''}`);
process.exit(bad ? 1 : 0);
