// Bouwsteen G0b: het publiek (crowdplan.js en crowd.js). Gedrag, geen bronregex: de plaatsing
// (nooit in water, gebouw of op de weg), de seed, de aantallen, de reactie bij het passeren, de
// LOD, het register tegen een dubbel publiek en het opruimen.
//   node scripts/crowd_test.mjs
import './node3d.mjs';
const THREE = await import('three');
const P = await import('../game/js/crowdplan.js');
const { buildCrowd, updateCrowd, disposeCrowd, crowdGround } = await import('../game/js/crowd.js');

let n = 0, fails = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };

// Een wereldje: een gebouw, een gracht en een weg. Alleen daarbuiten mag iemand staan.
const BUILDING = { x0: 20, y0: 6, x1: 32, y1: 18 };
const LAKE = { x: 0, y: 40, r: 9 };
const inBuilding = (x, y) => x > BUILDING.x0 && x < BUILDING.x1 && y > BUILDING.y0 && y < BUILDING.y1;
const inLake = (x, y) => Math.hypot(x - LAKE.x, y - LAKE.y) < LAKE.r;
const onRoad = (x, y) => Math.abs(y) < 4 && x > -100 && x < 100;
const ground = (x, y) => !inBuilding(x, y) && !inLake(x, y) && !onRoad(x, y);
const bad = (m) => inBuilding(m.x, m.y) || inLake(m.x, m.y) || onRoad(m.x, m.y);

// --- de plaatsing langs een parcours ------------------------------------------
{
  const spec = { shape: 'line', pts: [[-40, 0], [0, 0], [40, 0]], count: 30, seed: 7, side: 6 };
  const a = P.crowdPlan(spec, ground);
  ok(a.members.length >= 20 && a.members.length <= 30, 'een publiek van 20 tot 60 langs het parcours', String(a.members.length));
  ok(a.members.every((m) => !bad(m)), 'niemand staat in water, een gebouw of op de weg');
  ok(a.members.every((m) => Math.abs(m.y) >= 4), 'niemand staat op de rijbaan langs het parcours');
  ok(new Set(a.members.map((m) => `${m.x.toFixed(1)},${m.y.toFixed(1)}`)).size === a.members.length, 'geen twee figuren op dezelfde plek');
  let minGap = Infinity;
  for (let i = 0; i < a.members.length; i++) for (let j = i + 1; j < a.members.length; j++) minGap = Math.min(minGap, Math.hypot(a.members[i].x - a.members[j].x, a.members[i].y - a.members[j].y));
  ok(minGap >= 0.89, 'de figuren staan minstens 0,9 m uit elkaar', minGap.toFixed(2));
  ok(a.members.some((m) => m.y > 0) && a.members.some((m) => m.y < 0), 'aan beide kanten van het parcours');
  ok(a.members.every((m) => Number.isFinite(m.a) && m.look >= 0 && m.look < P.CROWD_LOOKS && m.h > 0.9 && m.h < 1.05), 'kijkrichting, look en lengte zijn geldig');
  // dichtbij het parcours kijken ze naar het parcours
  const m0 = a.members[0], toRoad = Math.atan2(-m0.y, 0);
  ok(Math.abs(Math.cos(m0.a) * Math.cos(toRoad) + Math.sin(m0.a) * Math.sin(toRoad)) <= 1.0 && Math.abs(Math.sin(m0.a)) > 0.6, 'ze kijken naar het parcours');

  const b = P.crowdPlan(spec, ground);
  ok(JSON.stringify(a.members) === JSON.stringify(b.members), 'dezelfde seed geeft dezelfde crowd (host en gast bouwen hetzelfde)');
  const c = P.crowdPlan({ ...spec, seed: 8 }, ground);
  ok(JSON.stringify(a.members) !== JSON.stringify(c.members), 'een andere seed geeft een andere crowd');
  ok(P.seedFromKey('M05.finish') === P.seedFromKey('M05.finish') && P.seedFromKey('M05.finish') !== P.seedFromKey('M05.start'), 'seedFromKey is vast per sleutel');
}

// --- ring rond een plein ------------------------------------------------------
{
  const spec = { shape: 'ring', x: 25, y: 12, radius: 9, depth: 3, count: 40, seed: 3, gapA: Math.PI, gapW: 1.0 };
  const r = P.crowdPlan(spec, ground);
  ok(r.members.length >= 20, 'een ring heeft een flink publiek', String(r.members.length));
  ok(r.members.every((m) => !bad(m)), 'de ring mijdt het gebouw (het staat er middenin)');
  ok(r.members.every((m) => Math.hypot(m.x - 25, m.y - 12) >= 9 - 1e-9), 'niemand staat binnen de straal');
  const wrap = (x) => { while (x > Math.PI) x -= Math.PI * 2; while (x < -Math.PI) x += Math.PI * 2; return x; };
  ok(r.members.every((m) => Math.abs(wrap(Math.atan2(m.y - 12, m.x - 25) - Math.PI)) >= 0.5 - 1e-9), 'de opening voor de actie blijft vrij');
  const free = P.crowdPlan({ ...spec, x: -200, y: 200 }, null);
  ok(free.members.length === free.requested && !free.short, 'op open terrein past de hele ring');
}

// --- aantallen, spec en terugval ----------------------------------------------
{
  const line = [[0, 10], [50, 10]];
  ok(P.crowdPlan({ shape: 'line', pts: line, count: 100, seed: 1 }, null).members.length === P.CROWD_MAX, 'een te groot aantal wordt 60');
  ok(P.crowdPlan({ shape: 'line', pts: line, count: 3, seed: 1 }, null).members.length === P.CROWD_MIN, 'een te klein aantal wordt het minimum');
  const nothing = P.crowdPlan({ shape: 'line', pts: line, count: 30, seed: 1 }, () => false);
  ok(nothing.members.length === 0 && nothing.short, 'waar niemand mag staan, staat niemand (liever geen publiek dan in de gracht)');
  const keep = P.crowdPlan({ shape: 'line', pts: [[-40, 10], [40, 10]], count: 30, seed: 2, clear: [{ x: 0, y: 10, r: 12 }] }, null);
  ok(keep.members.every((m) => Math.hypot(m.x, m.y - 10) >= 12 - 1e-9), 'een vrij te houden cirkel (finishlijn, voertuigpad) blijft leeg');
  ok(P.crowdSpecIssue({ shape: 'cirkel' }) && P.crowdSpecIssue({ shape: 'line', pts: [[0, 0]] }) && P.crowdSpecIssue({ shape: 'ring', x: 0, y: 0, radius: 1 }), 'een ongeldige spec wordt afgekeurd');
  ok(P.crowdSpecIssue({ shape: 'line', pts: line, count: 30 }) === null && P.crowdSpecIssue({ shape: 'ring', x: 0, y: 0, radius: 8 }) === null, 'een geldige spec mag');
  const w = P.crowdSpecToWorld({ shape: 'line', pts: [[0, 0], [10, 0]] }, { x: 100, y: 50, facing: Math.PI / 2 });
  ok(Math.abs(w.pts[1][0] - 100) < 1e-9 && Math.abs(w.pts[1][1] - 60) < 1e-9, 'lokale maten worden wereldmaten (f vooruit = langs het anker)');
}

// --- de reactie bij het passeren ----------------------------------------------
{
  const m = { id: 1, x: 0, y: 5, a: -Math.PI / 2, delay: 0.2 };
  const focusAt = (x) => ({ x, y: 0 });
  let st = null, t = 0;
  const seq = [];
  for (let x = -60; x <= 60; x += 2) { t += 0.15; st = P.crowdReact(st, m, focusAt(x), t); seq.push({ x, anim: st.anim }); }
  const at = (x) => seq.find((s) => s.x === x).anim;
  ok(at(-60) === 'idle', 'ver weg doet het publiek niets');
  ok(at(-14) === 'look', 'een naderend voertuig wordt nagekeken');
  ok(at(0) === 'cheer', 'bij het passeren juichen ze');
  ok(['cheer', 'wave', 'clap'].includes(seq.find((s) => s.x === 6).anim), 'ook net daarna nog');
  ok(seq[seq.length - 1].anim === 'idle', 'later staat het publiek weer stil');
  const m3 = { ...m, id: 3 };
  let s3 = null;
  for (let tt = 0; tt < 2; tt += 0.1) s3 = P.crowdReact(s3, m3, { x: 0, y: 0 }, tt);
  ok(s3.anim === 'wave', 'sommigen zwaaien in plaats van juichen');
  ok(Math.abs(P.crowdReact(null, m, { x: 8, y: 0 }, 0).gaze) <= 1.1, 'de blik is begrensd');
  ok(P.crowdReact(null, m, null, 0).anim === 'idle', 'zonder onderwerp staan ze stil');
}

// --- LOD en register ----------------------------------------------------------
{
  ok(P.crowdLod(5) === 0 && P.crowdLod(60) === 1 && P.crowdLod(200) === 2, 'dichtbij volle animatie, verder zuinig, ver weg niet getekend');
  ok(P.claimCrowd('k1') === true && P.claimCrowd('k1') === false, 'één publiek per sleutel');
  P.releaseCrowd('k1');
  ok(P.claimCrowd('k1') === true, 'na het opruimen mag de sleutel weer');
  P.releaseCrowd('k1');
  ok(P.crowdClaimCount() === 0, 'het register is leeg');
}

// --- crowdGround met een nagebootste kaart ------------------------------------
{
  const map = {
    buildingsNear: () => [{ bounds: [20, 6, 32, 18], pts: [[20, 6], [32, 6], [32, 18], [20, 18]] }],
    waterNear: () => [{ bounds: [-9, 31, 9, 49], pts: [[-9, 31], [9, 31], [9, 49], [-9, 49]] }],
    roadsNear: () => [{ cat: 'normal', width: 8, pts: [[-100, 0], [100, 0]], bounds: [-100, -4, 100, 4] }, { cat: 'foot', width: 3, pts: [[-100, 8], [100, 8]], bounds: [-100, 6.5, 100, 9.5] }],
  };
  const g = crowdGround(map);
  ok(!g(26, 12), 'crowdGround: niet in een gebouw');
  ok(!g(0, 40), 'crowdGround: niet in het water');
  ok(!g(10, 1), 'crowdGround: niet op de rijbaan');
  ok(g(10, 8), 'crowdGround: een voetpad mag wel (daar hoort publiek)');
  ok(g(10, 20), 'crowdGround: open grond mag');
}

// --- tekenen, reageren, opruimen ---------------------------------------------
{
  const scene = new THREE.Scene();
  const world = { map: { groundHeightAt: (x, y) => 0.5 + Math.sin(x * 0.05) * 0.3 } };
  const spec = { shape: 'ring', x: 0, y: 0, radius: 10, count: 40, seed: 5 };
  const c = buildCrowd(world, spec, { key: 'test:plein', scene });
  ok(!!c && c.members.length >= 20, 'buildCrowd bouwt een publiek', String(c && c.members.length));
  ok(c.group.parent === scene, 'het publiek hangt in de scène');
  ok(buildCrowd(world, spec, { key: 'test:plein', scene }) === null, 'dezelfde sleutel bouwt geen tweede publiek (een gast ziet het niet dubbel)');
  ok(scene.children.length === 1, 'en er staat er één in de scène');
  const geos = new Set(c.members.map((m) => (m.mesh.userData.body || m.mesh).geometry));
  ok(geos.size <= P.CROWD_LOOKS, 'de rompgeometrie wordt gedeeld (hooguit acht modellen)', String(geos.size));
  let nan = 0;
  c.group.updateMatrixWorld(true);
  for (const m of c.members) { const p = m.mesh.getWorldPosition(new THREE.Vector3()); if (!Number.isFinite(p.x + p.y + p.z)) nan++; }
  ok(nan === 0, 'geen NaN in de posities');
  ok(c.members.every((m) => Math.abs(m.mesh.position.y - (0.5 + Math.sin(m.x * 0.05) * 0.3)) < 1e-9), 'iedereen staat op de grond');
  // een voertuig dat voorbijkomt: de dichtstbijzijnde figuren juichen
  const near = c.members.reduce((a, b) => (Math.hypot(a.x - 10, a.y) < Math.hypot(b.x - 10, b.y) ? a : b));
  for (let i = 0; i < 20; i++) updateCrowd(c, 0.1, { x: near.x, y: near.y + 2 }, { x: 0, y: 0 });
  ok(near.state && ['cheer', 'wave', 'clap'].includes(near.state.anim), 'de figuur naast het voertuig juicht', near.state && near.state.anim);
  // ver weg van de camera: niet getekend
  updateCrowd(c, 0.1, null, { x: 5000, y: 5000 });
  ok(c.members.every((m) => m.mesh.visible === false), 'ver van de camera wordt het publiek niet getekend');
  updateCrowd(c, 0.1, null, { x: 0, y: 0 });
  ok(c.members.every((m) => m.mesh.visible === true), 'dichtbij weer wel');
  disposeCrowd(c);
  ok(scene.children.length === 0 && c.members.length === 0, 'het publiek is opgeruimd');
  ok(!P.crowdClaimed('test:plein'), 'de sleutel is weer vrij');
  ok(buildCrowd(world, spec, { key: 'test:plein', scene }) !== null, 'na het opruimen kan het publiek opnieuw');
  P.releaseCrowd('test:plein');
  ok(buildCrowd(world, spec, { key: 'leeg', scene, ground: () => false }) === null && !P.crowdClaimed('leeg'), 'een publiek zonder plek laat geen sleutel achter');
}

// --- klappen en verschillende wachthoudingen (#985) -------------------------------------------------------------
{
  const ids = Array.from({ length: 40 }, (_, i) => i);
  const idle = new Set(ids.map((id) => P.idleFor({ id })));
  ok(idle.has('idle') && idle.has('phone') && idle.has('hips'), 'het publiek staat niet allemaal hetzelfde stil', [...idle].join(','));
  ok(ids.filter((id) => P.idleFor({ id }) === 'idle').length > ids.length / 2, 'de meesten staan gewoon');
  const reacts = new Set(ids.map((id) => P.crowdReact(null, { id, x: 0, y: 0, a: 0, delay: 0 }, { x: 1, y: 0 }, 5).anim));
  ok(reacts.has('clap') && reacts.has('cheer') && reacts.has('wave'), 'bij het passeren juichen, zwaaien en klappen ze', [...reacts].join(','));
  const A = await import('../game/js/actoranim.js');
  ok(A.ANIMS.includes('clap') && A.REACTIONS.klap, 'actoranim kent clap en de klap-reactie');
  const pose = A.neutralPose(); A.REACTIONS.klap.fn(pose, 1, 0.5, 0.1);
  ok(Number.isFinite(pose.armL.z) && pose.armL.z > 0.9 && pose.armR.e > 1.2, 'de handen komen voor de borst');
}

console.log(fails ? `${fails} van ${n} mislukt` : `crowd_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
