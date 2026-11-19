// Bouwsteen G0b: de drie nieuwe binnensets (kroeg, woonkamer, garage; roomspec.js, rooms3d.js,
// stagesets.js, cutscenehost.js) en het publiek in een cutscene (def.crowd) met Samen spelen.
//   node scripts/binnensets_cine_test.mjs
import './node3d.mjs';
const THREE = await import('three');
const R = await import('../game/js/roomspec.js');
const { buildRoom } = await import('../game/js/rooms3d.js');
const { buildStageSet, updateStageSet, disposeStageSet, stageSetLayout, STAGE_SETS } = await import('../game/js/stagesets.js');
const { compileScene, validateScene } = await import('../game/js/cutscript.js');
const { raceFinishScene } = await import('../game/js/cinetemplates.js');
const { cutPakket, cutPakketMaat } = await import('../game/js/coopcut.js');
const { crowdClaimCount } = await import('../game/js/crowdplan.js');
await import('../game/js/cutscenehost.js');
const host = window.__cutHost;

let n = 0, fails = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };
const KINDS = ['kroeg', 'woonkamer', 'garage'];

function nanCount(group) {
  let bad = 0;
  group.updateMatrixWorld(true);
  group.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    const a = o.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) if (!Number.isFinite(a.getX(i)) || !Number.isFinite(a.getY(i)) || !Number.isFinite(a.getZ(i))) { bad++; break; }
  });
  return bad;
}
const lights = (g) => { let k = 0; g.traverse((o) => { if (o.isLight) k++; }); return k; };

// --- de specs en de fit-regels --------------------------------------------------
ok(R.ROOM_KINDS.join() === 'kroeg,woonkamer,garage' && KINDS.every((k) => STAGE_SETS.includes(k)), 'de drie kamers staan in de lijst van sets');
ok(['kantoor', 'serverkamer', 'loket', 'omakeuken'].every((k) => STAGE_SETS.includes(k)), 'de bestaande sets staan er nog in');
for (const kind of KINDS) {
  const spec = R.ROOMS[kind];
  ok(spec.w >= 7 && spec.d >= 5 && spec.h >= 2.6, kind + ': groot genoeg om in te spelen');
  ok(spec.furniture.length >= 4 && spec.npcs.length === 2, kind + ': meubilair en twee figuren');
  const bad = R.roomFit(kind, R.roomPeoplePoints(kind));
  ok(bad.length === 0, kind + ': de speler en de figuren passen in de kamer', bad.join(' | '));
  ok(spec.furniture.every((f) => Math.abs(f.u) + f.w / 2 <= spec.w / 2 + 1e-9 && Math.abs(f.v) + f.d / 2 <= spec.d / 2 + 1e-9), kind + ': het meubilair staat binnen de muren');
  // de fit-regels zelf: een punt in de muur of in een meubel wordt afgekeurd
  ok(R.roomFit(kind, [{ id: 'x', u: spec.w / 2 - 0.1, v: 0 }]).length === 1, kind + ': een punt tegen de muur past niet');
  const f = spec.furniture[0];
  ok(R.roomFit(kind, [{ id: 'y', u: f.u, v: f.v }]).length >= 1, kind + ': een punt in een meubel past niet');
  ok(R.roomFit(kind, [{ id: 'z', u: NaN, v: 0 }]).length === 1, kind + ': een kapot punt past niet');
  // de speler heeft vrij zicht naar +u: niets hoogs in een strook van 1 m vlak voor hem
  const sp = spec.player;
  ok(!spec.furniture.some((q) => q.h > 1.3 && q.u > sp.u && q.u - q.w / 2 < sp.u + 1.2 && Math.abs(q.v - sp.v) < q.d / 2 + 0.5), kind + ': geen hoog meubel vlak voor de speler');
}
ok(R.roomFit('kelder', []).length === 1, 'een onbekende kamer past nergens');

// --- de indeling, de hoogte en de terugval ---------------------------------------
{
  const player = { x: 10, y: 20, angle: 1.2 };
  for (const kind of KINDS) {
    const l = stageSetLayout(kind, player), sp = R.ROOMS[kind].player;
    ok(l && Math.abs(l.x + sp.u - 10) < 1e-9 && Math.abs(l.y + sp.v - 20) < 1e-9, kind + ': de speler staat op zijn plek in de kamer');
    ok(l.hold && l.hold.x === 10 && l.hold.y === 20 && l.hold.angle === 0, kind + ': de speler blijft op zijn plek staan');
    ok(l.facing === 0, kind + ': de kamer staat naar het oosten');
  }
  ok(stageSetLayout('kroeg', null) === null && stageSetLayout('kroeg', { x: NaN, y: 0 }) === null, 'zonder speler of positie geen kamer');
  const lay = R.roomLayout('kroeg', player);
  const flat = R.roomBaseHeight('kroeg', lay, { groundAt: () => 2 });
  ok(flat && flat.z === 2 && !flat.lifted, 'de kamer staat op de grondhoogte');
  const slope = R.roomBaseHeight('kroeg', lay, { groundAt: (x) => x * 0.1 });
  ok(slope.z > 0 && Math.abs(slope.z - Math.max(...[0, -5.5, 5.5].map((du) => (lay.x + du) * 0.1))) < 1e-9, 'op een helling staat de vloer op de hoogste grond');
  ok(R.roomBaseHeight('kroeg', lay, { groundAt: () => NaN }) === null, 'onbekende grond: geen kamer (terugval)');
  ok(R.roomBaseHeight('kroeg', lay, { groundAt: () => 0, blockedAt: () => true }) === null, 'in een gebouw of in water past een missiestapkamer niet (terugval)');
  const lifted = R.roomBaseHeight('kroeg', lay, { groundAt: () => 0, blockedAt: () => true, allowLift: true });
  ok(lifted && lifted.lifted && lifted.z === R.ROOM_LIFT, 'een cutscene-kamer hangt dan hoog boven de straat');
  const c = R.roomClamp('woonkamer', { x: 0, y: 0, z: 5 }, 99, -99, 99);
  ok(Math.abs(c.x - (7.5 / 2 - 0.45)) < 1e-9 && Math.abs(c.y + (5.6 / 2 - 0.45)) < 1e-9 && c.z < 5 + 2.7, 'de camera blijft binnen de muren en onder het plafond');
}

// --- de kamers tekenen ------------------------------------------------------------
for (const kind of KINDS) {
  const kit = buildRoom(kind, 0, 0, 0);
  ok(kit && kit.group.children.length > 25, kind + ': de kamer heeft inhoud', String(kit && kit.group.children.length));
  ok(lights(kit.group) >= 3, kind + ': de kamer is verlicht', String(lights(kit.group)));
  ok(nanCount(kit.group) === 0, kind + ': geen NaN');
  ok(typeof kit.frame === 'function' && typeof kit.dispose === 'function', kind + ': eigen frame en opruimer');
  for (let t = 0; t < 1; t += 0.1) kit.frame(t);
  kit.dispose();
}
ok(buildRoom('kelder', 0, 0, 0) === null, 'een onbekende kamer bouwt niets');

// --- de kamer van een missiestap ---------------------------------------------------
{
  const scene = new THREE.Scene();
  const world = { map: { groundHeightAt: () => 1.5 } };
  const player = { x: 4, y: -2, angle: 0.5 };
  for (const kind of KINDS) {
    const s = buildStageSet(world, kind, player, scene);
    ok(s && s.kind === kind && s.group.parent === scene, kind + ': de stap bouwt de kamer');
    ok(s && s.people.length === 2, kind + ': twee figuren in de kamer', String(s && s.people.length));
    ok(s && s.hold && s.hold.x === 4 && s.hold.y === -2, kind + ': de speler blijft op zijn plek');
    if (!s) continue;
    ok(Math.abs(s.kit.group.position.y - 1.5) < 1e-9, kind + ': de vloer staat op de hoogte van de kaart');
    for (let t = 0; t < 1.2; t += 0.1) updateStageSet(s, 0.1);
    ok(s.t > 1, kind + ': de kamertijd loopt');
    disposeStageSet(s);
    ok(s.group.parent === null && scene.children.length === 0, kind + ': de kamer gaat weer weg');
  }
  // de terugval: een gebouw in de voetafdruk, onbekende grond
  const inBuilding = { map: { groundHeightAt: () => 0, buildingsNear: () => [{ bounds: [-100, -100, 100, 100], pts: [[-100, -100], [100, -100], [100, 100], [-100, 100]] }] } };
  ok(buildStageSet(inBuilding, 'woonkamer', player, scene) === null && scene.children.length === 0, 'in een gebouw bouwt de stap geen kamer (terugval op de open lucht)');
  ok(buildStageSet({ map: { groundHeightAt: () => NaN } }, 'garage', player, scene) === null, 'zonder bekende grond bouwt de stap geen kamer');
  const inWater = { map: { groundHeightAt: () => 0, waterNear: () => [{ bounds: [-100, -100, 100, 100], pts: [[-100, -100], [100, -100], [100, 100], [-100, 100]] }] } };
  ok(buildStageSet(inWater, 'kroeg', player, scene) === null, 'in het water bouwt de stap geen kamer');
  ok(buildStageSet({}, 'kroeg', player, scene) !== null, 'zonder kaart bouwt de kamer gewoon (de bestaande sets doen dat ook)');
  scene.clear();
}

// --- de sets in een cutscene -------------------------------------------------------
ok(!!host && typeof host.buildScriptRun === 'function', 'de cutscenehost is in Node te bouwen');
if (host) {
  const look = { shirt: 0x336699, skin: 0xd0a080, variant: 'male' };
  for (const kind of KINDS) {
    const sp = R.ROOMS[kind];
    const def = {
      id: 'test-' + kind, set: kind,
      actors: {
        a: { look, at: [0, 0], face: 0, anim: 'talk' },
        b: { look: { ...look, shirt: 0x993333 }, at: [1.6, 0.3], face: 180, anim: 'idle' },
      },
      props: {}, cues: [{ t: 1, actor: 'b', anim: 'talk' }, { t: 3, actor: 'a', anim: 'nod' }],
      shots: [
        { t: 0, shot: 'cut', at: [-2.2, -1.6, 1.5], look: 'mid:a,b@1.4', fov: 42 },
        { t: 3, shot: 'dolly', from: [-1.6, 1.4, 1.5], to: [-1.0, 1.0, 1.55], look: 'mid:a,b@1.4', fov: 40 },
      ],
      duration: 6,
    };
    ok(validateScene(def, { lines: [], duration: 6 }).length === 0, kind + ': een dialoogscène in de kamer is geldig', validateScene(def, { lines: [], duration: 6 }).join('|'));
    const sc = compileScene(def, { lines: [], duration: 6 });
    const anchor = { x: 500, y: -300, facing: 0, z: 3 };
    const env = { solid: () => false, clamp: (x, y, z, k) => (k === 'camera' ? R.roomClamp(kind, anchor, x, y, z) : null) };
    // de camera blijft in de kamer, ook als het shot erbuiten wilde
    let inside = true;
    for (let t = 0; t < 6; t += 0.25) { const c = sc.sample(t, anchor, env).camera.position; if (Math.abs(c.x - 500) > sp.w / 2 || Math.abs(c.y + 300) > sp.d / 2 || c.z > 3 + sp.h) inside = false; }
    ok(inside, kind + ': de camera blijft binnen de muren');
    const run = host.buildScriptRun(def, sc, anchor, env, { map: {} });
    ok(run.kit && run.kit.group.parent === run.group, kind + ': de host bouwt de kamer als set');
    ok(Math.abs(run.kit.group.position.y - 3) < 1e-9, kind + ': de kamer staat op de ankerhoogte');
    ok(crowdClaimCount() === 0, kind + ': binnen staat geen publiek');
    run.frame(1.5, 0.1);
    ok(nanCount(run.group) === 0, kind + ': geen NaN in de scène');
    run.dispose();
  }
  const bad = validateScene({ id: 'x', set: 'kroeg', actors: {}, props: {}, crowd: { shape: 'ring', x: 0, y: 0, radius: 8 }, shots: [{ t: 0, shot: 'cut', at: [0, 0, 1], look: [1, 0, 1] }] }, { duration: 3 });
  ok(bad.some((m) => /crowd/.test(m)), 'een publiek in een binnenset wordt afgekeurd');
}

// --- een publiek in een cutscene, ook bij Samen spelen -------------------------------
if (host) {
  const fin = raceFinishScene([[1000, 500], [1120, 500], [1160, 530], [1160, 600]], { id: 'test.coop' });
  const sc = compileScene(fin.def, { lines: [], duration: fin.def.duration });
  const world = { map: { groundHeightAt: () => 0 } };
  const run = host.buildScriptRun(fin.def, sc, fin.anchor, null, world);
  const crowdGroups = () => run.group.children.filter((o) => o.name.startsWith('crowd'));
  ok(crowdGroups().length === 1 && crowdGroups()[0].children.length >= 20, 'de finishscène bouwt een publiek van minstens 20', String(crowdGroups().length && crowdGroups()[0].children.length));
  const positions = () => crowdGroups()[0].children.map((m) => `${m.position.x.toFixed(2)},${m.position.z.toFixed(2)}`).join(';');
  const hostPos = positions();
  // een tweede run in dezelfde sessie (een gast die dezelfde scène ook nog eens naspeelt) bouwt geen dubbel publiek
  const sc2 = compileScene(fin.def, { lines: [], duration: fin.def.duration });
  const dup = host.buildScriptRun(fin.def, sc2, fin.anchor, null, world);
  ok(dup.group.children.filter((o) => o.name.startsWith('crowd')).length === 0, 'een tweede run bouwt geen tweede publiek (geen dubbele crowd)');
  dup.dispose();
  ok(crowdClaimCount() === 1, 'het opruimen van de tweede run laat het publiek van de eerste staan');
  for (let t = 0; t < 8; t += 0.2) run.frame(t, 0.2);
  ok(nanCount(run.group) === 0, 'geen NaN tijdens de scène');
  run.dispose();
  ok(crowdClaimCount() === 0 && !run.group.parent, 'het publiek gaat met de scène weg');
  // de gast: het pakket gaat als JSON over het net en zijn eigen run bouwt hetzelfde publiek
  const pak = JSON.parse(JSON.stringify(cutPakket({ def: fin.def, lines: [], duration: fin.def.duration, anchor: fin.anchor, cine: { id: fin.def.id } })));
  ok(cutPakketMaat(pak).past, 'het pakket met publiek past op het net', String(cutPakketMaat(pak).tekens));
  const sc3 = compileScene(pak.def, { lines: [], duration: pak.duration });
  const gast = host.buildScriptRun(pak.def, sc3, pak.anchor, null, world);
  const gp = gast.group.children.find((o) => o.name.startsWith('crowd'));
  ok(!!gp && gp.children.map((m) => `${m.position.x.toFixed(2)},${m.position.z.toFixed(2)}`).join(';') === hostPos, 'de gast ziet precies hetzelfde publiek als de gastheer');
  gast.dispose();
  ok(crowdClaimCount() === 0, 'alles is opgeruimd');
}

console.log(fails ? `${fails} van ${n} mislukt` : `binnensets_cine_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
