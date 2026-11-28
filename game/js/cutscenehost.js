import { hoofdspeler } from './players.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { buildPersonMesh, seatPose, seatedY, releasePersonGeometry, speakMouth, TAMMO_APPEARANCE, ANITA_APPEARANCE, PERSON_RIG } from './models3d_people.js';
import { jawFromLevel, lipsyncStep, babbleEnvelope } from './actorlife.js';
import { buildKitchen } from './introkitchen3d.js';
import { buildOffice, OFFICE, buildServerRoom, SERVER } from './office3d.js';
import { buildLoket, LOKET } from './loket3d.js';
import { buildOmaKitchen, OMA_KEUKEN } from './omakeuken3d.js';
import { buildRoom } from './rooms3d.js';
import { isRoomKind, roomBaseHeight, roomClamp } from './roomspec.js';
import { isInsideBuilding } from './pedgeom.js';
import { isInWater } from './util.js';
import { crowdSpecToWorld, seedFromKey } from './crowdplan.js';
import { duplicateOfProps } from './cinehide.js';
import { buildCrowd, updateCrowd, disposeCrowd } from './crowd.js';
import { roadPropPaths, pathClearCircles } from './cinetemplates.js';
import { playCinematic, setNameCard, setCinematicRate, setCinematicTime, skipCinematic, isCinematicActive } from './cinematics.js';
import { buildVehicleMesh, releaseVehicleGeometries } from './models3d_vehicles.js';
import { treeBlocksPoint } from './greenery.js';
import { buildWildlifeMesh3D } from './wildlife.js';
import { HERO_CAR_MODEL, TRACTOR_MODEL, POLICE_MODEL, FOODTRUCK_MODEL, TRAFFIC_MODELS } from './vehicle.js';
import { carModel } from './trafficfleet.js';
import { propSource, TABLE_SIT, CARRY_LOW } from './cutscenemodels.js';
import { DECOR_MAKERS, shadowDisc } from './storyprops.js';
import { compileScene, fitAnchor, resolveTime, shotPoints, roadPathDef } from './cutscript.js';
import { jumpsFromScene } from './cutscenewarm.js';
import { sceneSamples, isRealSet } from './realsets.js';
import { roofAt } from './camerapath.js';
import { createCamGuard, nudgeFromWalls } from './camguard.js';
import { animateActor, beginSceneActors, setVoiceLevelSource } from './actoranim.js';
import { buildModularFromAppearance, modularReady, mensenFase, modularSeatContact } from './modularpeople.js';
import { FLAGS } from './devflags.js';
import { voiceLevel } from './audio.js';

// lipsync (actorlife.js): de kaak van wie spreekt volgt het niveau van de stemclip die nu klinkt
setVoiceLevelSource(voiceLevel);
import { applyClipsHuman, applyClipsCat, resetCat } from './poseclips.js';
import { showNameCard } from './namecard.js';
import { audioPlan, planEvent, warmKeys, sceneAmbience } from './cutaudio.js';
import { lineVoiceFor } from './linevoice.js';
import { plannedVoiceLines } from './voicetiming.js';
import { applyShotLight, resolveShotLight, rimOf, rimPosition } from './shotlight.js';
import { adoptSetLight } from './setlights.js';
import { getSettings } from './settings.js';
import { cutPakket, cutHostId, cutHostStart, cutHostEnd, cutHostTik, cutGastTik, cutsceneScene, cutsceneVerdeling, acteurRol, cutSpoor } from './coopcut.js';

const STEL = { tempo: setCinematicRate, tijd: setCinematicTime };

// Licht per shot (#1323, shotlight.js): world.lightMood krijgt het licht van het huidige shot bovenop een eventuele andere stemming
// (een cutscene zonder licht laat het wereldlicht staan). Het tegenlicht is één geleende lamp (setlights.js), alleen als een shot er
// een heeft en niet op kwaliteit 'laag' (daar zou hij een echt extra licht zijn: een nieuw programma per materiaal).
const _rimAt = { x: 0, y: 0, z: 0 };
function shotLightRig(def, group, w) {
  const specs = [def.light, ...(def.shots || []).map((s) => s.light)].filter((l) => l != null);
  if (!specs.length || !w) return null;
  const prev = w.lightMood || null;
  let cur = null, cam = null;
  const mood = (L) => { if (prev) prev(L); if (cur) applyShotLight(L, cur, cam); };
  w.lightMood = mood;
  let rim = null;
  if (specs.some((l) => rimOf(resolveShotLight(l, null))) && getSettings().quality !== 'laag') {
    rim = adoptSetLight(new THREE.PointLight(0xffffff, 0, 7, 1.8));
    group.add(rim);
  }
  return {
    frame(camera) {
      cur = (camera && camera.light) || null;
      cam = camera;
      if (!rim) return;
      const r = rimOf(cur);
      if (!r || !camera) { rim.intensity = 0; return; }
      rim.color.setRGB(r.r, r.g, r.b, THREE.SRGBColorSpace);
      rim.intensity = r.intensity * 4;
      rimPosition(camera, _rimAt);
      rim.position.set(_rimAt.x, _rimAt.z, _rimAt.y);
    },
    dispose() { if (w.lightMood === mood) w.lightMood = prev; },
  };
}

// The game side of the cutscene direction language (cutscript.js): puts the
// sampled actors and props on meshes, feeds the camera pose to cinematics.js
// and cleans up afterwards. Scenes are data (cutscenes.js).
//
// playScript(w, def, { lines, duration, anchor, cine }) -> boolean
//   anchor: { x, y, facing, z }  (default: the player, facing the way they look)
//   fit:    { radii, ground, dirs } the anchor may move to free ground when no turn is clean (cutscript.js fitAnchor)
//   env:    { solid, clamp } keeps the set out of buildings (cutscript.js fitCamera/fitAnchor); default: the building layer
//   cine:   extra playCinematic fields (id, priority, kicker, title, tint, ...)
//   lines:  [{ speaker, text, at, dur, voice? }], untouched: they stay the story's own
//   def.set 'keuken': Tessa's kitchen (introkitchen3d.js) is built at the anchor (anchor.z = floor height) and the camera is kept inside it;
//   def.set 'kantoor': het kantoorset van Wiebelwerk (#950, office3d.js), eveneens op de vloerhoogte van de kaart, camera binnen;
//   def.set 'serverkamer': de serverkamer van Wiebelwerk (#956, office3d.js), een lange hal met rekken en een terminal, camera binnen;
//   def.set 'loket': de hal van het Loket in het Stadhuis (#956, loket3d.js), met de balie, de rij en het nummerscherm;
//   def.set 'omakeuken': Oma Trijntje's keuken aan de Noorderhaven (#956, omakeuken3d.js), met het fornuis en de tafel;
//   def.set 'kroeg' | 'woonkamer' | 'garage': de kamers van roomspec.js/rooms3d.js (bouwsteen G0b); op de vloerhoogte van de kaart, of 40 m boven de straat als de grond water of een gebouw is;
//   def.crowd: een publiek (crowdplan.js, lokale maten f/s) of een lijst daarvan; buildCrowd tekent het, het kijkt en juicht mee met het eerste voertuig (anders de eerste acteur) en gaat met de scène weg
//   def.fx: host effects on the set: buzz { dur } (the phone), door { open: 0-1, dur }, cups { actor, on, hands }, tablecups { on },
//   sfx { kind } (a world sound), pulse { dur } (the radio), naam { text, dur } (a name card, any set)


// #864: an actor's hand (wrist/palm) in world coordinates: the end of the forearm on the
// elbow bone. The mesh matrices are updated first (the animation was just set). Returns null
// when the character has no arm bones (then the old carry offset in cutscript.js still applies).
const HAND_V = new THREE.Vector3();
function handOf(mesh) {
  const ud = mesh && mesh.userData;
  const elbow = ud && (ud.elbowR || ud.elbowL);
  if (!elbow) return null;
  mesh.updateMatrixWorld(true);
  HAND_V.set(0, -(PERSON_RIG.FOREARM || 0.25) * 1.25, 0);
  elbow.localToWorld(HAND_V);
  return HAND_V;
}


function makeActor(spec) {
  const look = spec === 'tammo' ? TAMMO_APPEARANCE : spec === 'anita' ? ANITA_APPEARANCE : spec;
  // cutscene-fase (?mensen=q2): de vaste looks (Tammo, Tessa, Jelle, bijrollen) als modulaire mens, met dezelfde kleding-identiteit
  const q = mensenFase(FLAGS.mensen) >= 2 && modularReady() ? buildModularFromAppearance(look) : null;
  const m = q || buildPersonMesh(look.shirt, look.skin, look);
  m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const sh = shadowDisc(); // de gedeelde schaduwvlek (storyprops.js)
  sh.position.y = 0.03;
  m.add(sh);
  m.userData.shadow = sh;
  return m;
}

// Vehicles and animals are the world's own (cutscenemodels.js lists which); only loose objects are built here.
// Props have their origin on the ground, +x is "forward".
let propVehicleN = 0;
function vehicleModel(src) {
  if (src.model) return { ...src.model };
  if (src.vehicle === 'foodtruck') return { ...FOODTRUCK_MODEL };
  const base = src.vehicle === 'escort' ? HERO_CAR_MODEL
    : src.vehicle === 'tractor' ? TRACTOR_MODEL
      : src.vehicle === 'police' ? POLICE_MODEL
        : src.vehicle === 'bike' ? { ...TRAFFIC_MODELS().find((m) => m.name === 'bike' && !m.fat), rider: null }
          : carModel(src.vehicle, () => 0);
  return src.color ? { ...base, color: src.color } : { ...base };
}
function worldProp(src) {
  if (src.animal) {
    const g = buildWildlifeMesh3D({ kind: src.animal, variant: 0, bobSeed: 0, lod: 'hi' }); // een filmpje komt dichtbij: de duif en de meeuw in het hoogste niveau (duifmodel.js)
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.userData.shared = true; } }); // geometries are the world's cache: never disposed here
    return g;
  }
  const g = buildVehicleMesh({ id: 'cut-prop-' + (propVehicleN++ % 64), model: vehicleModel(src), isBike: src.vehicle === 'bike', health: 100 });
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.userData.shared = true; } }); // geometries are the world's cache: never disposed here
  return g;
}

function disposeTree(o) {
  o.traverse((c) => {
    // #796: gedeelde voertuig- en persoonsgeometrie gaat terug naar de teller in plaats van
    // hier gedisposed te worden; de wereld-caches (gedeelde geometrie van props en dieren) blijven staan.
    if (c.userData && c.userData.cachedGeometries) releaseVehicleGeometries(c);
    const g = c.geometry;
    if (!c.isMesh || !g) return;
    if (typeof g.userData.personRefs === 'number') {
      releasePersonGeometry(c);
      if (c.isSkinnedMesh && c.skeleton) c.skeleton.dispose();
      return;
    }
    if (c.userData.shared || (g.userData && g.userData.shared)) return;
    g.dispose();
  });
}

function buildScriptRun(def, scene, anchor, env = null, w = null, noKit = false) {
  const group = new THREE.Group();
  group.name = 'cutscript-' + def.id;
  const lightRig = shotLightRig(def, group, w);
  const actors = {}, props = {};
  const propVehicleNames = [];
  for (const [id, a] of Object.entries(def.actors || {})) {
    const m = makeActor(a.look);
    group.add(m);
    actors[id] = m;
  }
  // (#434) elke rol één keer: de eigen rol is de speler, de andere verhaalrol de
  // metgezel. Een tweede kopie van een rol wordt niet getekend, en elke rol krijgt één
  // acteurstaat in de animatielaag (actoranim.js), zodat de metgezel niet meebeweegt.
  const eigen = w && w.coopCutRol && w.coopCutRol.defId === def.id ? w.coopCutRol : null;
  const rolScene = eigen || cutsceneScene({}, (w && hoofdspeler(w)) || {});
  const verdeling = rolScene.verdeling || cutsceneVerdeling(def, rolScene);
  const verberg = new Set(verdeling.verberg);
  const rolVan = (id) => { const r = verdeling.perActeur[id]; return r === 'speler' || r === 'metgezel' ? acteurRol(id, (def.actors || {})[id]) : null; };
  beginSceneActors();
  for (const [id, p] of Object.entries(def.props || {})) {
    const src = propSource(p.kind);
    const m = src ? worldProp(src) : DECOR_MAKERS[p.kind]();
    group.add(m);
    props[id] = m;
    if (src && src.vehicle) propVehicleNames.push(vehicleModel(src).name);
  }
  // #955: het echte missievoertuig van dezelfde soort bij het anker wordt tijdens de scène niet getekend
  const verborgen = w && w.vehicles ? duplicateOfProps(w.vehicles, anchor, propVehicleNames) : [];
  for (const v of verborgen) v.hideInScene = true;
  // the kitchen set and its effects
  let kit = null;
  const authored = (def.fx || []).map((f) => ({ ...f, t0: resolveTime(f.t, scene.lines, scene.duration) ?? 0 }));
  // vehicles, bikes and pigeons that move get their sound from the plan (cutaudio.js, #117)
  // plus the scene's own sound moments (cutscenesfx.js): each one the game's own sound for it, at its place in the set (planEvent)
  const plan = audioPlan(def, scene.lines, scene.duration);
  const planned = plan.map((p) => ({ t: p.t, t0: p.t, fx: 'sfx', kind: p.kind, name: p.name, plan: p }));
  // the ambience bed of the scene (cutscenesfx.js): sfx/ambience.js reads world.cutsceneAmb while the scene runs (binnen: the room tone)
  const amb = sceneAmbience(def.id);
  const warm = warmKeys(plan);
  if (w && warm.length) (w.audioEvents || (w.audioEvents = [])).push({ kind: 'warm', keys: warm, x: anchor.x, y: anchor.y });
  const fx = [...authored, ...planned].sort((a, b) => a.t0 - b.t0);
  const fired = new Set();
  const cupState = {}, cupKey = {};
  if (noKit) {
    // echte set (realsets.js): het pand zelf is de kamer, er is geen kit en dus geen kitfx (alleen sfx en naamkaarten)
  } else if (def.set === 'keuken') {
    kit = buildKitchen(anchor.x, anchor.y, anchor.z || 0);
    group.add(kit.group);
    kit.reset();
  } else if (def.set === 'kantoor') {
    // #950: het kantoorset van Wiebelwerk, op de plek van het echte pand
    kit = buildOffice(anchor.x, anchor.y, anchor.z || 0);
    group.add(kit.group);
  } else if (def.set === 'serverkamer') {
    // #956: de serverkamer van Wiebelwerk, op de plek van de servers (M18.3)
    kit = buildServerRoom(anchor.x, anchor.y, anchor.z || 0);
    group.add(kit.group);
  } else if (def.set === 'loket') {
    // #956: de hal van het Loket in het Stadhuis (M03)
    kit = buildLoket(anchor.x, anchor.y, anchor.z || 0);
    group.add(kit.group);
  } else if (def.set === 'omakeuken') {
    // #956: Oma Trijntje's keuken (M25)
    kit = buildOmaKitchen(anchor.x, anchor.y, anchor.z || 0);
    group.add(kit.group);
  } else if (isRoomKind(def.set)) {
    // bouwsteen G0b: kroeg, woonkamer of garage
    kit = buildRoom(def.set, anchor.x, anchor.y, anchor.z || 0);
    group.add(kit.group);
  }
  // het publiek (def.crowd): een per sleutel per apparaat (een gast die de scène naspeelt krijgt het niet dubbel), nooit binnen,
  // en uit de buurt van het pad van de voertuigen (dat is hier al op de echte weg gezet, roadPathDef)
  const crowds = [];
  if (!def.set && def.crowd) {
    const c0 = Math.cos(anchor.facing || 0), s0 = Math.sin(anchor.facing || 0);
    const clear = pathClearCircles(roadPropPaths(def).map((p) => p.map(([f, s]) => [anchor.x + f * c0 - s * s0, anchor.y + f * s0 + s * c0])), 3.2);
    (Array.isArray(def.crowd) ? def.crowd : [def.crowd]).forEach((cs, i) => {
      const key = cs.key || ('cut:' + def.id + ':' + i);
      const c = buildCrowd(w, { ...crowdSpecToWorld(cs, anchor), seed: seedFromKey(key), clear: [...clear, ...(cs.clear || [])] }, { key, scene: group });
      if (c) crowds.push(c);
    });
  }
  const focusId = Object.keys(def.props || {}).find((id) => { const s = propSource(def.props[id].kind); return s && s.vehicle; });
  const doorFx = fx.filter((f) => f.fx === 'door');
  const sfx = (f) => { if (w) (w.audioEvents || (w.audioEvents = [])).push(f.plan ? planEvent(f.plan, anchor) : f.name ? { kind: f.kind, name: f.name, x: anchor.x, y: anchor.y } : { kind: f.kind, x: anchor.x, y: anchor.y }); };
  // De effecten van de set (en de sfx van elke set); de keuken heeft daarnaast
  // zijn eigen radio, deur en kopjes. Het kantoorset heeft die niet (#950).
  const setFrame = (t) => {
    if (w && amb) w.cutsceneAmb = amb;
    let buzz = false;
    for (const f of fx) {
      if (f.t0 > t) break;
      // een geluid dat al voorbij is (een gast die later instapt, een sprong in de scènetijd) klinkt niet meer: geen salvo van cues tegelijk
      if (f.fx === 'sfx' && !fired.has(f)) { fired.add(f); if (t - f.t0 < 1) sfx(f); }
      if (!kit || def.set !== 'keuken') continue;
      if (f.fx === 'buzz' && t < f.t0 + (f.dur ?? 2)) buzz = true;
      if (f.fx === 'pulse' && t < f.t0 + (f.dur ?? 2)) kit.radio.rotation.z = Math.sin(t * 9) * 0.05;
      if (f.fx === 'cups') cupState[f.actor] = f;
      if (f.fx === 'tablecups') for (const c of kit.tableCups) c.visible = f.on !== false;
    }
    if (!kit || def.set !== 'keuken') return;
    kit.buzz(t, buzz);
    if (!buzz) kit.radio.rotation.z = 0;
    // the door: nearly shut until the first door effect, then eased to its target
    let ang = doorFx.length ? -0.25 : -1.25;
    for (const f of doorFx) {
      if (f.t0 > t) break;
      const to = -0.25 - 1.0 * (f.open ?? 1), k = Math.max(0, Math.min(1, (t - f.t0) / (f.dur ?? 0.8)));
      ang = ang + (to - ang) * k * k * (3 - 2 * k);
    }
    kit.hinge.rotation.y = ang;
    for (const [id, f] of Object.entries(cupState)) {
      const key = f.on === false ? 'off' : (f.hands || 'LR');
      if (actors[id] && cupKey[id] !== key) { cupKey[id] = key; kit.holdCups(actors[id], f.on !== false, 1.6, f.hands || 'LR'); }
    }
  };
  return {
    scene, group, actors, props, anchor, env, kit,
    frame(t, dt) {
      const s = scene.sample(t, anchor, env);
      if (lightRig) lightRig.frame(s.camera);
      setFrame(t);
      // #956: de serverkamer heeft eigen beweging (knipperende ledjes, koel licht)
      if (kit && typeof kit.frame === 'function') kit.frame(t);
      if (crowds.length) {
        const fm = (focusId && props[focusId]) || Object.values(actors)[0];
        const focus = fm ? { x: fm.position.x, y: fm.position.z } : null;
        for (const c of crowds) updateCrowd(c, dt, focus, focus);
      }
      for (const [id, m] of Object.entries(actors)) {
        const st = s.actors[id];
        if (verberg.has(id)) { m.visible = false; continue; } // (#434) een dubbele kopie van een rol danst niet mee
        m.visible = st.visible !== false;
        m.position.set(st.x, st.h + (st.anim === 'ride' ? 0.4 : 0), st.y);
        m.rotation.set(0, -st.a, 0);
        if (m.userData.shadow) m.userData.shadow.visible = !st.sit;
        if (st.sit) seatedFrame(m, st, t);
        else animateActor(m, { anim: st.anim, speed: st.speed, gaze: st.gaze, t, dt, rol: rolVan(id), voiced: st.speaking !== false });
        // pose-clips (poseclips.js): a function of the scene time, on top of the base pose; moving, seated or carrying people only use their upper body
        if (st.clips && st.clips.length) applyClipsHuman(m.userData, st.clips, { upper: !!st.sit || st.speed > 0.05 || !!st.carrying });
      }
      for (const [id, m] of Object.entries(props)) {
        const st = s.props[id];
        m.visible = st.visible;
        m.position.set(st.x, st.h, st.y);
        m.rotation.y = -st.a;
        // a pigeon's wings (the world's mesh) beat while it moves
        // the cat (Sien) is the world's cat mesh: a cat clip, or a quiet tail while nothing is cued
        if (def.props[id].kind === 'kat' && m.userData.tail && m.userData.legs && m.userData.bones) {
          const has = st.clips && st.clips.length;
          if (has || m.userData.clipped || st.visible) {
            resetCat(m.userData);
            applyClipsCat(m.userData, has ? st.clips : [{ name: 'kat-staan', lt: t, dur: 1e9, fade: 1 }]);
            m.userData.clipped = true;
          }
        }
        if (m.userData.wings && st.h > 0.5) for (const w of m.userData.wings) w.rotation.x = -(w.userData.sign || 1) * (0.5 + Math.sin(t * 22) * 0.7);
      }
      // #864: a carried prop follows the carrier's hand (with the offset from cutscript.js as a fallback)
      for (const [cid, sa] of Object.entries(s.actors)) {
        if (!sa || !sa.carrying || sa.visible === false) continue;
        const pm = props[sa.carrying], am = actors[cid];
        if (!pm || !am || !am.visible) continue;
        const hand = handOf(am);
        if (!hand) continue;
        const kind = def.props[sa.carrying] && def.props[sa.carrying].kind;
        const laag = CARRY_LOW.includes(kind);
        pm.position.set(hand.x, hand.y + (laag ? -0.08 : 0.03), hand.z);
      }
      return s.camera;
    },
    dispose() {
      // #734 (F13): de keukenset heeft eigen materialen en canvas-textures (introkitchen3d.js `own`);
      // die gingen nooit mee de deur uit. `kit.dispose()` ruimt ze op, zoals intromontage.js al doet.
      if (kit && typeof kit.dispose === 'function') kit.dispose();
      if (w && w.cutsceneAmb === amb) w.cutsceneAmb = null;
      if (lightRig) lightRig.dispose();
      for (const c of crowds) disposeCrowd(c);
      for (const v of verborgen) v.hideInScene = false;
      group.removeFromParent();
      disposeTree(group);
    },
  };
}

let current = null;

// Seated at a table (the kitchen): feet on the floor, hands on lap/tabletop (#859: no steering
// pose); a gesture is a head or chest movement. The pose itself lives in cutscenemodels.js, so
// the opening and the intro montage cannot drift apart.
function seatedFrame(m, st, t) {
  const ud = m.userData;
  if (ud.qRig) {
    // modulaire mens: de zit-clip uit de state-machine, het zitvlak op de zitting, praten met lipsync
    m.position.y = st.h + st.sit - modularSeatContact(m);
    const dt = Math.max(0, Math.min(0.1, t - (ud.qSitT ?? t)));
    ud.qSitT = t;
    animateActor(m, { anim: st.speaking || st.anim === 'talk' ? 'talk' : 'idle', speaking: !!st.speaking, gaze: st.gaze, t, dt, seated: true });
    return;
  }
  if (!ud.pelvis || !ud.head) return;
  seatPose(m, TABLE_SIT);
  m.position.y = st.h + seatedY(m, st.sit);
  const talk = st.speaking || st.anim === 'talk';
  ud.head.rotation.y = st.gaze;
  if (talk) { ud.head.rotation.z += Math.sin(t * 3.1) * 0.04; ud.head.rotation.y += Math.sin(t * 1.7) * 0.07; ud.chest.rotation.z += Math.sin(t * 2.3) * 0.015; }
  switch (st.anim) {
    case 'nod': ud.head.rotation.z += Math.sin(t * 6) * 0.14; break;
    case 'shake': ud.head.rotation.y += Math.sin(t * 8) * 0.3; break;
    case 'laugh': ud.chest.rotation.z += Math.sin(t * 15) * 0.035; ud.head.rotation.z -= 0.12 + Math.sin(t * 15) * 0.05; break;
    case 'shrug': ud.chest.rotation.z += 0.06 * Math.sin(t * 4); ud.head.rotation.x = Math.sin(t * 3) * 0.12; break;
    case 'lean': case 'point': ud.chest.rotation.z -= 0.13; ud.head.rotation.z += 0.08; break;
    case 'look': ud.head.rotation.z += 0.18; break;
    case 'phone': ud.head.rotation.z += 0.2; ud.chest.rotation.z -= 0.05; break;
    default: break;
  }
  // lipsync aan tafel (actorlife.js): dezelfde kaak als bij een staande acteur, op de stemclip of de lettergreepcurve
  const dtl = Math.max(0, Math.min(0.1, t - (ud.lipT ?? t)));
  ud.lipT = t;
  const lvl = st.speaking ? voiceLevel() : null;
  const target = talk ? (Number.isFinite(lvl) ? jawFromLevel(lvl) : babbleEnvelope(t, (ud.animOffset || 0) % 1)) : 0;
  ud.jawS = lipsyncStep(ud.jawS || 0, target, dtl);
  speakMouth(ud, ud.jawS, st.anim === 'laugh' ? 'lach' : null);
}

// camera and people stay inside the kitchen (a room of 4.4 x 3.6 x 2.6 m around the anchor)
function kitchenEnv(at) {
  return {
    solid: () => false,
    clamp(x, y, z, kind) {
      if (kind !== 'camera') return null;
      const base = at.z || 0;
      return { x: Math.max(at.x - 1.95, Math.min(at.x + 1.95, x)), y: Math.max(at.y - 1.55, Math.min(at.y + 1.55, y)), z: Math.max(base + 0.25, Math.min(base + 2.35, z)) };
    },
  };
}

// #950: het kantoorset is groter (7,8 x 5,6 x 2,9 m); de camera blijft binnen.
function officeEnv(at) {
  return {
    solid: () => false,
    clamp(x, y, z, kind) {
      if (kind !== 'camera') return null;
      const base = at.z || 0;
      return {
        x: Math.max(at.x - (OFFICE.w / 2 - 0.45), Math.min(at.x + (OFFICE.w / 2 - 0.45), x)),
        y: Math.max(at.y - (OFFICE.d / 2 - 0.45), Math.min(at.y + (OFFICE.d / 2 - 0.45), y)),
        z: Math.max(base + 0.3, Math.min(base + OFFICE.h - 0.3, z)),
      };
    },
  };
}

// #956: de serverkamer is een lange hal (11 x 6,4 x 2,9 m); de camera blijft binnen de wanden.
function serverEnv(at) {
  return {
    solid: () => false,
    clamp(x, y, z, kind) {
      if (kind !== 'camera') return null;
      const base = at.z || 0;
      return {
        x: Math.max(at.x - (SERVER.w / 2 - 0.45), Math.min(at.x + (SERVER.w / 2 - 0.45), x)),
        y: Math.max(at.y - (SERVER.d / 2 - 0.45), Math.min(at.y + (SERVER.d / 2 - 0.45), y)),
        z: Math.max(base + 0.3, Math.min(base + SERVER.h - 0.3, z)),
      };
    },
  };
}

// #956: het Loket is een brede hal (12 x 7,4 x 3 m); de camera blijft binnen de wanden.
function loketEnv(at) {
  return {
    solid: () => false,
    clamp(x, y, z, kind) {
      if (kind !== 'camera') return null;
      const base = at.z || 0;
      return {
        x: Math.max(at.x - (LOKET.w / 2 - 0.45), Math.min(at.x + (LOKET.w / 2 - 0.45), x)),
        y: Math.max(at.y - (LOKET.d / 2 - 0.45), Math.min(at.y + (LOKET.d / 2 - 0.45), y)),
        z: Math.max(base + 0.3, Math.min(base + LOKET.h - 0.3, z)),
      };
    },
  };
}

// #956: Oma's keuken (8,4 x 6 x 2,8 m); de camera blijft binnen de keuken.
function omaKeukenEnv(at) {
  return {
    solid: () => false,
    clamp(x, y, z, kind) {
      if (kind !== 'camera') return null;
      const base = at.z || 0;
      return {
        x: Math.max(at.x - (OMA_KEUKEN.w / 2 - 0.45), Math.min(at.x + (OMA_KEUKEN.w / 2 - 0.45), x)),
        y: Math.max(at.y - (OMA_KEUKEN.d / 2 - 0.45), Math.min(at.y + (OMA_KEUKEN.d / 2 - 0.45), y)),
        z: Math.max(base + 0.3, Math.min(base + OMA_KEUKEN.h - 0.3, z)),
      };
    },
  };
}

// #955: de bomen rond een punt (map.treesNear), met dezelfde vorm die de wereld tekent
// (greenery.js treeDims). Een camera in een kroon of tegen een stam telt als bedekt: de
// camera stapt eruit (cutscript.js clearOfTrees) en de ankerstand zoekt vrije grond.
function treeEnv(map) {
  return (x, y, z) => {
    if (!map || typeof map.treesNear !== 'function') return false;
    for (const t of map.treesNear(x, y, 12)) if (treeBlocksPoint(t, x, y, z, 0.35)) return true;
    return false;
  };
}


// QA-haak (scripts/qa/cutscene_shots.page.js): speelt een scène stil per tijdstip af; geen export, zodat de dode-code-telling gelijk blijft
if (typeof window !== 'undefined') window.__cutHost = { buildScriptRun };

// (#502) Het einde van een scène aan de gasten. Er zijn drie manieren waarop een scène eindigt, en de gasten
// horen het verschil te merken:
//  - de scène speelde af: 'cutend' zonder skip (cutHostEnd, coopcut.js);
//  - de speler sloeg zelf over met Spatie/Esc: 'cutend' met skip, dan stoppen de gasten ook (#434);
//  - een scène met hogere prioriteit nam hem over (cinematics.js playCinematic -> finish(true, true)). Dat is
//    géén overslaan: er komt meteen een nieuwe scène aan (cutHostStart onderaan playScript) en de gasten horen
//    daarin mee te gaan. Een 'cutend' zou ze juist laten stoppen -- coopnet.js cutGastStop kijkt niet naar skip --
//    en dan zagen ze de nieuwe scène niet meer. Daarom gaat er een eigen bericht uit: 'cutvervang' met skip: false.
//    Een gast die dat bericht niet kent laat het liggen (coopnet.js negeert onbekende soorten) en speelt zijn eigen
//    kopie gewoon uit tot de nieuwe scène hem overneemt (coopcut.js cutGastSpeel): het protocol blijft dus
//    achterwaarts compatibel en er valt niemand stil.
export function cutHostEinde(w, id, { skipped = false, replaced = false } = {}) {
  const n = w && w.coopNet;
  if (!n || n.role !== 'host' || !n.hub || n.cutNu !== id) return false;
  // zelf overgeslagen gaat altijd voor: dan is het echt een overslaan, ook als er toevallig net een nieuwe scène klaarstaat
  if (skipped || !replaced) return cutHostEnd(w, id, skipped);
  // vervangen: dezelfde boekhouding als cutHostEnd (coopcut.js), maar zonder 'cutend' dat de gasten stopt
  n.cutNu = null;
  w.coopCutRol = null;
  cutSpoor(w, 'host-vervangen', id);
  return n.hub.announce({ k: 'cutvervang', id, skip: false });
}

// replay: een gast speelt de scène van de gastheer na (coopcut.js); die stuurt niets door en slaat niets over
// voices: de opnames die de scène zelf afspeelt (missionstory.js), op volgorde van lines; ze gaan alleen mee in het
// pakket voor de gasten (#711), zodat die dezelfde stem horen en dezelfde ondertiteltijden houden.
// De echte-wereld-sets (realsetrun.js) hangen aan het interieursysteem, dat weer aan de winkels en bijbanen hangt: main.js geeft de resolver mee
// (assignRealSetResolver) zodat dit bestand er niet in een importcirkel aan vastzit. Zonder resolver speelt elke scène in zijn kit zoals voorheen.
let realSetResolver = null;
export function assignRealSetResolver(fn) { realSetResolver = typeof fn === 'function' ? fn : null; }

// Staat het punt in een voertuig van de wereld (geparkeerd of rijdend; het voertuig van de scène zelf is een prop van de scène)?
function vehicleHit(w, x, y, z) {
  const list = w && w.vehicles;
  if (!list) return false;
  for (const v of list) {
    if (!v || !v.model || v.isBoat) continue;
    const dx = x - v.x, dy = y - v.y;
    if (dx * dx + dy * dy > 64) continue;
    const c = Math.cos(v.angle), sn = Math.sin(v.angle);
    const lx = dx * c + dy * sn, ly = -dx * sn + dy * c;
    const base = v.z || 0;
    if (Math.abs(lx) < v.model.len / 2 + 0.25 && Math.abs(ly) < v.model.wid / 2 + 0.25 && z > base - 0.2 && z < base + (v.isBus ? 3.4 : 1.9)) return true;
  }
  return false;
}

export function playScript(w, def, { lines, duration, anchor, cine = {}, env: envIn = null, fit = null, replay = false, voices = null, realSet = true } = {}) {
  if (current) return false;
  const root = getScene();
  if (!root) return false;
  const p = hoofdspeler(w);
  let a = anchor ? { ...anchor } : { x: p.x, y: p.y, facing: p.angle || 0, z: 0 };
  const anchor0 = { ...a }; // het anker zoals de aanroeper het gaf: bij een echte set stuurt de gastheer dit mee, zodat de gast dezelfde keuze maakt
  // (#950) een kantoorset staat op de begane grond: de vloerhoogte komt van de kaart
  if ((def.set === 'kantoor' || def.set === 'serverkamer' || def.set === 'loket' || def.set === 'omakeuken') && !a.z && w && w.map && w.map.groundHeightAt) {
    try { a.z = w.map.groundHeightAt(a.x, a.y, 50) || 0; } catch (e) { a.z = 0; }
  }
  // de nieuwe kamers: op de grond, of hoog boven de straat als daar water of een gebouw is (roomspec.js roomBaseHeight)
  if (isRoomKind(def.set) && !a.z) {
    const m = w && w.map;
    let fit = null;
    try {
      fit = roomBaseHeight(def.set, { x: a.x, y: a.y }, {
        groundAt: m && m.groundHeightAt ? (x, y) => m.groundHeightAt(x, y, 50) : () => 0,
        blockedAt: m ? (x, y) => (typeof m.buildingsNear === 'function' && isInsideBuilding(m, x, y)) || isInWater(m, x, y) : null,
        allowLift: true,
      });
    } catch (e) { fit = null; }
    a.z = fit ? fit.z : 0;
  }
  // (#731) De stemmen plannen vóór het compileren: shots, cues en L-tijden horen dezelfde
  // (opgerekte) duur te hebben als de stemmen. Anders lopen beeld en stem aan het eind uit
  // elkaar en vuren deuren/props op de oude tijd. attachVoices in cinematics.js doet
  // hetzelfde werk en ziet daarna niets meer te doen (de regels hebben al een opname).
  const vt = plannedVoiceLines(lines, duration, lineVoiceFor);
  const sceneLines = vt.lines, sceneDur = vt.duration;
  let scene;
  try {
    scene = compileScene(def, { lines: sceneLines, duration: sceneDur });
  } catch (e) {
    console.error('cutscript', e);
    return false;
  }
  // echte-wereld-set (realsets.js): speelt de scène in een kamer, dan in een ECHT pand bij het anker (met zijn gevel en ramen naar de straat)
  // en niet in een decor in de lucht; geen geschikt pand, geen interieur of de wereld is er niet: de bestaande kit, met een logregel
  let real = null;
  if (realSet && realSetResolver && isRealSet(def.set) && w && !w.noRealSets) {
    const smp = sceneSamples(scene);
    const r = realSetResolver(w, def.set, { x: anchor0.x, y: anchor0.y }, smp.actors, smp.cams);
    if (r.ok) real = r;
  }
  if (real) a = real.anchor;
  // nobody and no camera inside a building: the anchor turns to free ground, a camera in a wall moves (cutscript.js)
  const indoors =isRoomKind(def.set) || def.set === 'keuken' || def.set === 'kantoor' || def.set === 'serverkamer' || def.set === 'loket' || def.set === 'omakeuken';
  const env = envIn ? { ...envIn, tree: envIn.tree || (def.set ? null : treeEnv(w && w.map)) } : real ? real.env : (isRoomKind(def.set)
    ? { solid: () => false, clamp: (x, y, z, kind) => (kind === 'camera' ? roomClamp(def.set, { x: a.x, y: a.y, z: a.z || 0 }, x, y, z) : null) }
    : def.set === 'keuken'
    ? kitchenEnv({ x: a.x, y: a.y, z: a.z || 0 })
    : def.set === 'kantoor'
      ? officeEnv({ x: a.x, y: a.y, z: a.z || 0 })
      : def.set === 'serverkamer'
        ? serverEnv({ x: a.x, y: a.y, z: a.z || 0 })
        : def.set === 'loket'
          ? loketEnv({ x: a.x, y: a.y, z: a.z || 0 })
          : def.set === 'omakeuken'
            ? omaKeukenEnv({ x: a.x, y: a.y, z: a.z || 0 })
            : { solid: (x, y, z) => roofAt(w.map, x, y) > z - 0.2, tree: treeEnv(w && w.map) });
  const at = real ? real.anchor : indoors ? { ...a, facing: 0 } : fitAnchor(scene, a, env, fit || {});
  // #862/#863: een rijdend voertuig of een fietser volgt de echte weg in plaats van een rechte lijn
  // in het ankerframe. De scene wordt één keer bij de start omgezet (niet per frame); de gasten
  // krijgen dezelfde definitie en zetten die met hun eigen kaart opnieuw om.
  let useDef = def, useScene = scene;
  if (!indoors && w && w.map) {
    try {
      const routed = roadPathDef(def, at, w.map, { duration: sceneDur });
      if (routed) {
        useDef = routed;
        useScene = compileScene(routed, { lines: sceneLines, duration: sceneDur });
      }
    } catch (e) {
      console.error('cutscript road', e);
      useDef = def; useScene = scene;
    }
  }
  let run = null, lastT = 0, buildFailed = false, buildFailSkipped = false;
  // camerabescherming (camguard.js, aaa30): buiten (geen kamerset, geen echt pand) gaat de camera nooit door een gebouw, boom of
  // geparkeerd voertuig, ook niet tijdens een dolly of kraan
  const guard = !indoors && !real && !def.set && env && env.solid ? createCamGuard({ blocked: (x, y, z) => env.solid(x, y, z) || (env.tree && env.tree(x, y, z)) || vehicleHit(w, x, y, z), nudge: (q) => nudgeFromWalls(env.solid, q) }) : null;
  // name cards (fx 'naam' { text, dur }): a character is introduced at the lower left (#159); a line's own `card`
  // (missionstory.js, #711) counts too, so a guest's replay shows the same name card as the host.
  const cards = [
    ...(useDef.fx || []).filter((f) => f.fx === 'naam').map((f) => ({ text: f.text, t0: resolveTime(f.t, sceneLines, sceneDur) ?? 0, dur: f.dur ?? 2.4 })),
  ];
  // (#711) een gast ziet de naamkaarten die de gastheer bij zijn regie toont (missionstory.js speelt ze daar zelf af):
  // een regel met `card` (de sleutel uit storyarc.js CHARACTERS) komt mee in het pakket en verschijnt alleen bij de replay,
  // zodat de gastheer hem niet twee keer ziet.
  const lineCards = replay ? (sceneLines || []).filter((l) => l && l.card).map((l) => ({ key: l.card, t0: Number.isFinite(l.at) ? l.at : 0, dur: Number.isFinite(l.dur) ? l.dur : 2.4 })) : [];
  let lineCardNow = null;
  let cardNow = null;
  // the tiles round the camera's path are built ahead and held, so no shot cuts to the far LOD or a hole (#157, #20)
  const prewarm = cine.prewarm || shotPoints(useScene, at, sceneDur);
  // springt de scène tussen twee shots naar een andere plek (cutscenewarm.js), dan warmt de engine die vooruit en wacht hij onder zwart (#1016)
  const jumps = cine.jumps || jumpsFromScene(useScene, at, sceneDur);
  const cutId = replay ? 0 : cutHostId();
  const ok = playCinematic({
    priority: 4, pause: true, letterbox: true, skippable: true, hideHud: true, hidePlayers: true, mumble: true,
    prewarm, jumps,
    ...cine, id: cine.id || useDef.id, duration: sceneDur, lines: sceneLines,
    onStart() {
      if (cine.onStart) cine.onStart();
      try {
        run = buildScriptRun(useDef, useScene, at, env, w, !!real);
        root.add(run.group);
        current = run;
        w.cinematicHidePlayers = true;
        w.cinematicHideNav = true;
      } catch (e) {
        console.error('cutscript', useDef.id, e);
        run = null;
        buildFailed = true;
      }
    },
    shot(u, t) {
      if (!run) {
        // de set kon niet gebouwd worden: geen lege scène van minuten met alleen ondertitels, maar meteen terug naar het spel (als overgeslagen)
        if (buildFailed && !buildFailSkipped) { buildFailSkipped = true; queueMicrotask(() => { if (isCinematicActive(cine.id || useDef.id)) skipCinematic(); }); }
        return null;
      }
      const dt = Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      if (cine.frame) cine.frame(t, dt);
      if (replay) cutGastTik(w, cine.cutId, t, STEL); else cutHostTik(w, cutId, t);
      if (cards.length) {
        const cur = cards.find((k) => t >= k.t0 && t < k.t0 + k.dur) || null;
        if (cur !== cardNow) { cardNow = cur; setNameCard(cur ? cur.text : null); }
      }
      if (lineCards.length) {
        const cur = lineCards.find((k) => t >= k.t0 && t < k.t0 + k.dur) || null;
        if (cur !== lineCardNow) { lineCardNow = cur; if (cur) showNameCard(cur.key); }
      }
      const pose = run.frame(t, dt);
      // a hand-made camera for part of the scene (cine.shotOverride(t): a pose, or null to leave it to the script), e.g. the falling flag (M24.3)
      const own = cine.shotOverride ? cine.shotOverride(t) : null;
      const out = own || pose;
      if (guard && out && out.position) guard.apply(out, dt);
      if (real && out) out.interior = true; // de camera staat in een hal: niet over het dak tillen (scene3d.js guardCinematicCamera)
      return out;
    },
    onEnd(skipped, replaced) {
      if (run) { run.dispose(); run = null; }
      if (real) real.release();
      current = null;
      if (cardNow) setNameCard(null);
      w.cinematicHidePlayers = false;
      w.cinematicHideNav = false;
      // (#502) vervangen is geen overslaan: cutHostEinde stuurt dan 'cutvervang' in plaats van 'cutend'
      if (!replay) cutHostEinde(w, cutId, { skipped, replaced });
      if (cine.onEnd) cine.onEnd(skipped, replaced);
    },
  });
  // samen spelen: de gasten spelen dezelfde scène (na de start, zodat een scène die niet begint ook niet wordt doorgestuurd)
  if (!ok && real) real.release();
  if (ok && !replay && w.coopNet && w.coopNet.role === 'host') cutHostStart(w, cutId, cutPakket({ def: useDef, lines: sceneLines, duration: sceneDur, anchor: real ? anchor0 : at, cine, voices }));
  return ok;
}

