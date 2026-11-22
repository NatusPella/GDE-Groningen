// #956: a mission stage that plays indoors gets a real room around the player instead of a
// conversation in the open air. Four sets here, plus kroeg, woonkamer and garage (roomspec.js, rooms3d.js):
//   kantoor      the intake at Wiebelwerk (M18): the player stands at the visitor's side,
//                the account manager behind the desk, a colleague at work;
//   serverkamer  the server room (M18): the same long hall that builds the scene of M18.3;
//   loket        the Loket of the Stadhuis (M03): the counter with three windows, the queue
//                rope and the number screen, the clerk behind the glass;
//   omakeuken    Oma Trijntje's kitchen at the Noorderhaven (M25): the stove, the table with
//                the five ingredients and the recipe card by the window.
//
// The set stands on the map's floor height and is turned to the east (+u = +x), like the
// indoor scenes (cutscenehost.js keeps an indoor set square). A stage with a hold keeps the
// player at his chair or at the counter (`hold`) so he cannot walk out through a wall; the
// wait stage in the server room leaves him free (the hall is wide enough).
//
// The layout (stageSetLayout) is pure and tested; drawing needs three.js and the scene.
import * as THREE from 'three';
import { getScene } from './scene3d.js';
import { buildOffice, buildServerRoom } from './office3d.js';
import { buildLoket, LOKET } from './loket3d.js';
import { loketRij, loketRijAnim } from './akte1_plan.js';
import { buildOmaKitchen, OMA_KEUKEN } from './omakeuken3d.js';
import { buildPersonMesh, releasePersonGeometry } from './models3d_people.js';
import { animateActor } from './actoranim.js';
import { NPC } from './missionstory.js';
import { buildRoom } from './rooms3d.js';
import { ROOMS, ROOM_KINDS, isRoomKind, roomLayout, roomBaseHeight } from './roomspec.js';
import { isInsideBuilding } from './pedgeom.js';
import { isInWater } from './util.js';
import { addClearZone, removeClearZone } from './clearzone.js';
import { findSetSpot, setClearZone, roomCameraPose, hasRoomCamera, binnenStaat, setFootprint, SET_DIMS } from './binnenset.js';
import { resolveRealSet } from './realsetrun.js';
import { isRealSet, hallCameraPose, restorePlace, localToWorld } from './realsets.js';
import { hoofdspeler } from './players.js';
import { volumeOfRoom, CUT_FLOOR } from './interiorvolume.js';
import { openInteriorVolume, closeInteriorVolume } from './interiorisolation.js';

// kantoor, serverkamer, Loket en Oma's keuken, plus de kamers uit roomspec.js (kroeg, woonkamer, garage)
export const STAGE_SETS = ['kantoor', 'serverkamer', 'loket', 'omakeuken', ...ROOM_KINDS];

// Where the room goes: in the office the player stands 0.55 m before the middle (between the
// door and the visitor's chair, not on the table); the server room is centred on the player;
// at the Loket the player stands 0.8 m before the middle so the counter is a few metres
// ahead; in Oma's kitchen he stands 0.6 m before the middle, at the table.
// The player faces +x (the desk, the counter or the stove), as in the indoor scenes.
export function stageSetLayout(kind, player) {
  if (!STAGE_SETS.includes(kind) || !player) return null;
  if (isRoomKind(kind)) return roomLayout(kind, player);
  const x = Number.isFinite(player.x) ? player.x : 0;
  const y = Number.isFinite(player.y) ? player.y : 0;
  if (kind === 'kantoor') return { kind, x: x + 0.55, y, hold: { x, y, angle: 0 }, facing: 0 };
  if (kind === 'loket') return { kind, x: x + 0.8, y, hold: { x, y, angle: 0 }, facing: 0 };
  if (kind === 'omakeuken') return { kind, x: x + 0.6, y, hold: { x, y, angle: 0 }, facing: 0 };
  return { kind, x, y, hold: null, facing: 0 };
}

function buildPerson(key, at, face) {
  const look = NPC[key];
  const m = buildPersonMesh(look.shirt, look.skin, look);
  m.position.set(at[0], 0, at[1]);
  m.rotation.y = -face;
  return m;
}

function disposePerson(m) {
  m.removeFromParent();
  m.traverse((o) => {
    if (!o.isMesh) return;
    if (o.geometry && typeof o.geometry.userData.personRefs === 'number') releasePersonGeometry(o);
    else if (o.geometry) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const mat of mats) if (mat && mat.dispose) mat.dispose();
  });
}

// De stap in een echt pand (realsets.js): de figuren (kit-coördinaten) en de plek van de speler (layout.hold) moeten in de hal van een pand
// bij de speler passen; dan staat de kit-groep daar (op de vloer van het pand, gedraaid zoals het anker) en wordt de speler erheen gezet.
// null: geen pand, geen interieur of de wereld is er niet (de aanroeper bouwt de losse kamer).
function realStage(world, kind, player, layout, people, deps = null) {
  if (!world || world.noRealSets || !layout || !layout.hold) return null;
  const hold = [layout.hold.x - layout.x, layout.hold.y - layout.y];
  const points = people.map((p) => ({ f: p.mesh.position.x, s: p.mesh.position.z })).concat([{ f: hold[0], s: hold[1] }]);
  const r = resolveRealSet(world, kind, { x: player.x, y: player.y }, points, [], deps);
  if (!r.ok) return null;
  const [hx, hy] = localToWorld(r.anchor, hold[0], hold[1]);
  const kitGroup = new THREE.Group();
  kitGroup.position.set(r.anchor.x, r.base, r.anchor.y);
  kitGroup.rotation.y = -r.anchor.facing;
  const pl = { kind, x: r.anchor.x, y: r.anchor.y, hold: { x: hx, y: hy, angle: r.anchor.facing }, facing: r.anchor.facing };
  return {
    kitGroup, layout: pl, base: r.base, shift: { x: hx - player.x, y: hy - player.y },
    handle: { plan: r.plan, b: r.b, gid: r.gid, world, origin: { x: player.x, y: player.y }, release: r.release },
  };
}

// The room for this stage, or null when the scene or the map is not there. `targetScene` is
// for the test: without a running game there is no scene to put the room in yet.
// opts.gebouwOk (en altijd bij de kroeg en de kruitkelder): een kamer die een kroeg of een kelder voorstelt mag in een gebouw staan (de kroeg zit in dat gebouw, de kruitkelder onder de vesting); alleen water keurt hem af.
export function buildStageSet(world, kind, player, targetScene = null, opts = {}) {
  let layout = stageSetLayout(kind, player);
  const scene = targetScene || getScene();
  if (!layout || !scene) return null;
  let base = 0;
  try {
    if (world && world.map && world.map.groundHeightAt) base = world.map.groundHeightAt(layout.x, layout.y, 50) || 0;
  } catch (e) { base = 0; }
  let noKit = false; // geen plek voor de losse kamer: alleen een echt pand kan nog (hieronder)
  let shift = null; // hoe ver de kamer is verschoven t.o.v. de speler (de hold-stap meet het doel mee, binnenset.js verschoveDoel)
  if (isRoomKind(kind)) {
    // de nieuwe kamers: passen ze niet (grond onbekend, water of een gebouw in de voetafdruk),
    // dan geen kamer en speelt de stap in de open lucht, zoals voor de sets bestonden
    const m = world && world.map;
    const fitAt = (lay) => roomBaseHeight(kind, lay, {
      groundAt: m && m.groundHeightAt ? (x, y) => m.groundHeightAt(x, y, 50) : () => 0,
      blockedAt: m ? (x, y) => (!(opts.gebouwOk || kind === 'kroeg' || kind === 'kruitkelder') && typeof m.buildingsNear === 'function' && isInsideBuilding(m, x, y)) || isInWater(m, x, y) : null,
    });
    let fit = fitAt(layout);
    if (!fit) {
      // echt binnen: past de kamer hier niet, dan op de dichtstbijzijnde plek eromheen die wel past; de speler wordt daarheen gezet
      // (de hold van de set houdt hem er) in plaats van de stap buiten te laten spelen (binnenset.js findSetSpot)
      const spot = opts.noSearch ? null : findSetSpot(player.x, player.y, (x, y) => !!fitAt(stageSetLayout(kind, { x, y, angle: player.angle })));
      if (!spot) {
        // geen plek voor de losse kamer: misschien wel een echt pand (hieronder); zo niet, dan niets (de stap speelt buiten)
        if ((targetScene && opts.real !== true) || opts.noReal || !isRealSet(kind)) return null;
        noKit = true;
      } else {
        layout = stageSetLayout(kind, { x: spot.x, y: spot.y, angle: player.angle });
        fit = fitAt(layout);
        shift = { x: spot.x - player.x, y: spot.y - player.y };
      }
    }
    if (fit) base = fit.z;
  }
  const people = [];
  if (kind === 'kantoor') {
    // the account manager behind the desk (local 3.25 / -0.4), a colleague at work
    people.push({ mesh: buildPerson('accountmanager', [3.25, -0.4], Math.PI), anim: () => 'talk', gaze: 0 });
    people.push({ mesh: buildPerson('student', [1.2, 2.4], 250 * Math.PI / 180), anim: (t) => (Math.sin(t * 0.8) > 0 ? 'phone' : 'look'), gaze: 0 });
  } else if (kind === 'loket') {
    // the clerk behind the middle window, and one person still in the queue
    people.push({ mesh: buildPerson('loketbediende', [LOKET.clerkU, 0], Math.PI), anim: () => 'talk', gaze: 0 });
    people.push({ mesh: buildPerson('student', [-2.7, 2.5], 0.4), anim: (t) => (Math.sin(t * 0.6) > 0 ? 'phone' : 'idle'), gaze: 0 });
    // AAA akte 1 (M03): de rij zelf, zes mensen die wachten (akte1_plan.js loketRij): vier voor je, twee achter je
    for (const q of loketRij()) {
      const m = buildPersonMesh(q.shirt, q.skin, { seed: q.seed, variant: q.variant });
      m.position.set(q.u, 0, q.v);
      m.rotation.y = -q.face;
      people.push({ mesh: m, anim: (t) => loketRijAnim(q, t), gaze: 0 });
    }
  } else if (kind === 'omakeuken') {
    // Oma at the stove (she keeps an eye on the pan), Mem at the table
    people.push({ mesh: buildPerson('trijntje', [OMA_KEUKEN.stoveU - 0.85, 0.5], 0), anim: () => 'talk', gaze: 0 });
    people.push({ mesh: buildPerson('mem', [OMA_KEUKEN.tableU + 0.2, -1.75], -0.7), anim: (t) => (Math.sin(t * 0.7) > 0.2 ? 'talk' : 'idle'), gaze: 0 });
  }
  if (isRoomKind(kind)) {
    // figuren op hun plek in de kamer (roomspec.js houdt ze uit het meubilair)
    ((opts.variant && ROOMS[kind].varianten && ROOMS[kind].varianten[opts.variant]) || ROOMS[kind].npcs).forEach((q, i) => people.push({ mesh: buildPerson(q.key, [q.u, q.v], q.face), anim: (t) => (i === 0 ? 'talk' : (Math.sin(t * 0.7 + i) > 0.2 ? 'talk' : 'idle')), gaze: 0 }));
  }
  // echte-wereld-set (realsets.js): een kamer in een ECHT pand bij de speler, met de figuren van deze stap erin, en de speler daarheen; past er
  // geen pand of is er geen interieur (of een testscène zonder wereld), dan de losse kamer hieronder, met een logregel
  const real = (!targetScene || opts.real === true) && !opts.noReal && isRealSet(kind) ? realStage(world, kind, player, layout, people, opts.realDeps || null) : null;
  if (!real && noKit) { for (const p of people) disposePerson(p.mesh); return null; }
  const kit = real ? { group: real.kitGroup } : isRoomKind(kind) ? buildRoom(kind, layout.x, layout.y, base) : kind === 'kantoor' ? buildOffice(layout.x, layout.y, base)
    : kind === 'serverkamer' ? buildServerRoom(layout.x, layout.y, base)
      : kind === 'loket' ? buildLoket(layout.x, layout.y, base)
        : buildOmaKitchen(layout.x, layout.y, base);
  const group = new THREE.Group();
  group.add(kit.group);
  for (const p of people) kit.group.add(p.mesh);
  if (real) {
    scene.add(group);
    fadeIntoSet();
    return { kind, layout: real.layout, base: real.base, variant: opts.variant || null, group, kit, people, t: 0, hold: real.layout.hold, shift: real.shift, zone: false, real: real.handle };
  }
  scene.add(group);
  fadeIntoSet();
  // echt binnen: de wereld blijft buiten de kamer (voetgangers, verkeer en losse props wijken; de sweep ruimt ze op)
  const zone = setClearZone(kind, layout);
  if (zone) addClearZone(zone.id, zone.pts, zone.r, zone.closed);
  // en de vaste wereldlagen (meubilair, bomen, stadsprops, lantaarns) tekenen niets binnen de kamer (interiorisolation.js)
  const fp = setFootprint(kind, layout), dim = SET_DIMS[kind];
  if (fp) openInteriorVolume('binnenset', volumeOfRoom(fp.cx, fp.cy, fp.hw, fp.hd, 0, base + CUT_FLOOR, base + dim.h + 0.4));
  return { kind, layout, base, variant: opts.variant || null, group, kit, people, t: 0, hold: layout.hold, shift, zone: !!zone };
}

// Every frame: the server room's leds and the people in the room live.
export function updateStageSet(set, dt) {
  if (!set) return;
  set.t += dt;
  if (set.kit && typeof set.kit.frame === 'function') set.kit.frame(set.t);
  for (const p of set.people) animateActor(p.mesh, { anim: p.anim(set.t), speed: 0, gaze: p.gaze, t: set.t, dt });
}

// De kamercamera van deze set op dit moment (binnenset.js), of null (geen hold: de speler loopt vrij rond).
export function stageSetCamera(set) {
  if (!set || !hasRoomCamera(set.kind, set.layout)) return null;
  if (set.real) return hallCameraPose(set.real.plan, set.layout, set.base || 0, set.t);
  return roomCameraPose(set.kind, set.layout, set.base || 0, set.t);
}

// De plek 'binnen' voor missiestaat en save.
export function stageSetBinnen(set) {
  return set ? binnenStaat(set.kind, set.variant, set.layout) : null;
}

export function disposeStageSet(set) {
  if (!set) return;
  if (set.zone) { removeClearZone('binnenset'); set.zone = false; }
  if (set.real) {
    // echt pand: de speler komt terug op zijn beginplek (of vlak buiten de deur) en het pand valt onder de gewone afstandsregels
    const h = set.real;
    try {
      const p = h.world ? hoofdspeler(h.world) : null;
      const at = p ? restorePlace(h.plan, h.origin, p) : null;
      if (at) {
        p.x = at.x; p.y = at.y; p.vx = 0; p.vy = 0;
        if (typeof at.angle === 'number') p.angle = at.angle;
        const m = h.world.map;
        if (m && m.groundHeightAt) p.gz = m.groundHeightAt(at.x, at.y, 50) || 0;
      }
    } catch (e) { console.error('echte set terugzetten', e); }
    h.release();
    set.real = null;
  }
  closeInteriorVolume('binnenset');
  if (set.kit && typeof set.kit.dispose === 'function') set.kit.dispose();
  for (const p of set.people) disposePerson(p.mesh);
  set.group.removeFromParent();
  set.people.length = 0;
  set.kit = null;
}

// #955: the transition indoors: a short fade from black into the room, under the HUD
// (z-index 12, the choice panel sits at 15). Without a DOM (test) nothing happens.
let fadeEl = null;
function fadeIntoSet() {
  if (typeof document === 'undefined' || !document.body || typeof document.createElement !== 'function') return;
  try {
    if (!fadeEl) {
      fadeEl = document.createElement('div');
      fadeEl.id = 'stage-set-fade';
      fadeEl.style.cssText = 'position:fixed;inset:0;z-index:12;background:var(--ds-c-glas);opacity:0;pointer-events:none';
      document.body.appendChild(fadeEl);
    }
    fadeEl.style.transition = 'none';
    fadeEl.style.opacity = '1';
    const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (f) => setTimeout(f, 16);
    raf(() => {
      fadeEl.style.transition = 'opacity .45s';
      fadeEl.style.opacity = '0';
    });
  } catch (e) { /* no DOM: the room works without the transition too */ }
}
