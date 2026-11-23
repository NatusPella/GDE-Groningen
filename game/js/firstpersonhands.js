// Eerste-persoon-handen en -wapen (#943): wat je zelf ziet als je slaat, blokkeert of schiet.
// Het eigen figuur staat in eerste persoon niet in beeld (scene3d.js verbergt het), dus zonder
// dit viewmodel zag je alleen de wereld. Twee onderarmen met vuisten in de kleding en huid van
// de speler hangen als kind aan de camera; in de rechtervuist zit het wapen, met dezelfde
// vormen als het figuur in de hand heeft (models3d_people.js buildWeaponMesh).
//
// De stand is pure rekenkunde (handsPose, swingAmount, gunKick) zodat
// scripts/firstpersonhands_test.mjs hem in gewone node kan narekenen; syncFirstPersonHands zet
// hem op de three-objecten. Behalve de three-objecten leest dit bestand alleen world.weapon,
// world.time en het laatste gevechtseffect (combateffect.js).
import * as THREE from 'three';
import { buildWeaponMesh, TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { getCombatEffect } from './combateffect.js';
import { isRangedWeapon, WEAPONS } from './weapons.js';
import { blokActief } from './blockregels.js';
import { FLAGS } from './devflags.js';
import { mensenFase, modularReady, bakeModularForearm, modularLookFromAppearance } from './modularpeople.js';

// De camera kijkt in three.js langs -z; x is rechts, y omhoog. Alles hier is in die
// cameraruimte, in meters. De ruststand houdt de vuisten onder in beeld, net als bij het
// derde-persoonfiguur de armen langs het lijf hangen.
export const HANDS_REST = { rx: 0.2, ry: -0.3, rz: -0.72, lx: -0.24, ly: -0.33, lz: -0.8 };
// De eerstepersoonscamera heeft near 0,08 m (cameranear.js NEAR_FIRST_PERSON); de vuisten blijven
// toch zo ver weg dat ook de mouw (ongeveer 0,11 m achter de vuist) ruim vóór de lens staat.
// Muren knippen de handen niet meer af: de materialen testen de diepte niet (zie buildArm),
// zoals een viewmodel in een overlay.
export const HANDS_MIN_DIST = 0.62;
// Duur van een uithaal per slagsoort; dezelfde namen als de derde-persoonstanden
// (models3d_people.js SWING_S), zodat beeld en stand gelijk lopen.
export const SWING_S = { jab: 0.32, bat: 0.55, slap: 0.45, sweep: 0.5, stab: 0.3, overhead: 0.55, thrust: 0.9, throw: 0.45 };
export const AIM_Z = -0.66;

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a || 1)));
  return t * t * (3 - 2 * t);
};

// Uithaal van een slag: eerst naar achteren (wind-up), dan de klap, dan terug naar de ruststand.
// Geeft -1 (verst achteruit) .. 0 (rust) .. +1 (de klap). Dezelfde curve als swingCurve in
// models3d_people.js, zodat eerste en derde persoon hetzelfde ritme hebben.
export function swingAmount(u, windup = 0.26) {
  const w = Number.isFinite(windup) ? windup : 0.26;
  if (!(u >= 0) || u >= 1) return 0;
  if (u < w) return -smoothstep(0, w, u);
  if (u < w + 0.14) return -1 + 2 * smoothstep(w, w + 0.14, u);
  return 1 - smoothstep(w + 0.14, 1, u);
}

// Terugslag van een schot: een scherpe piek vlak na het schot, daarna snel weg (0..1).
export function gunKick(dt) {
  if (!(dt >= 0)) return 0;
  return dt < 0.03 ? dt / 0.03 : Math.exp(-(dt - 0.03) * 14);
}

// Houdingsklasse per wapen (#943): elk wapen uit weapons.js valt in een klasse en elke klasse heeft
// zijn eigen kleine houding in handsPose. 'tool' is het gereedschap (bezem, fietspomp).
export const HAND_CLASSES = ['fists', 'melee', 'tool', 'pistol', 'long', 'throw', 'rocket'];
const TOOL_KEYS = { bezem: 1, fietspomp: 1 };
export function weaponClass(key) {
  const w = key ? WEAPONS[key] : null;
  if (!w || key === 'fists') return 'fists';
  if (TOOL_KEYS[key]) return 'tool';
  switch (w.kind) {
    case 'melee': return 'melee';
    case 'throw': return 'throw';
    case 'rocket': return 'rocket';
    case 'water': return 'pistol';
    case 'gun': return w.slot === 3 ? 'long' : 'pistol';
    default: return 'melee';
  }
}

// Muzzle flash: een kort, rustig lichtje (geen vuur- of bloedeffect). dt = seconden sinds het
// schot; geeft 1 (vol) .. 0 (uit), in 0,07 s weg.
export function muzzleFlash(dt) {
  if (!(dt >= 0) || dt >= 0.07) return 0;
  return 1 - dt / 0.07;
}

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const fin = (v, d = 0) => (Number.isFinite(v) ? v : d);

// De greep per klasse: een verschuiving van de rustpositie van de rechter- en linkerhand en een
// kanteling van het wapen. [rx, ry, rz, rax, lx, ly, lz, wax]
const CLASS_GRIP = {
  fists: [0, 0, 0, 0, 0, 0, 0, 0],
  melee: [-0.02, 0.06, -0.04, 0.1, 0, 0, 0, 0.45],
  tool: [-0.04, 0.03, -0.06, 0.1, 0.1, 0.1, -0.16, 0.6],
  pistol: [-0.08, 0.05, -0.05, 0.2, 0.1, 0.06, -0.02, 0.05],
  long: [-0.1, 0.05, -0.06, 0.12, 0.26, 0.12, -0.3, 0.02],
  throw: [-0.05, 0.1, -0.02, 0.4, 0, 0, 0, 0.1],
  rocket: [-0.1, 0.06, -0.05, 0.3, 0.2, 0.1, -0.14, 0.05],
};

// De stand van de twee vuisten en het wapen voor dit beeld. `out` is een module-tijdelijk
// object, zodat een frame niets alloceert. state: { swing, u, aiming, kick, bob, side, weapon }.
// swing = null of de slagsoort; u = 0..1 door de uithaal; side = 1 rechts, -1 links (vuisten
// wisselen elkaar af); weapon = wapen in de rechterhand of null.
export function handsPose(out, state = {}) {
  const o = out || {};
  const r = o.r || (o.r = {});
  const l = o.l || (o.l = {});
  const w = o.w || (o.w = {});
  const aiming = !!state.aiming;
  const bob = Number.isFinite(state.bob) ? state.bob : 0;
  r.x = HANDS_REST.rx; r.y = HANDS_REST.ry + bob * 0.02; r.z = HANDS_REST.rz;
  r.ax = -0.12; r.ay = 0; r.az = -0.05;
  l.x = HANDS_REST.lx; l.y = HANDS_REST.ly + bob * 0.02; l.z = HANDS_REST.lz;
  l.ax = -0.18; l.ay = 0; l.az = 0.05;
  w.ax = 0; w.ay = 0; w.az = 0;
  const cls = state.cls || (state.weapon ? weaponClass(state.weapon) : 'fists');
  const grip = CLASS_GRIP[cls] || CLASS_GRIP.fists;
  r.x += grip[0]; r.y += grip[1]; r.z += grip[2]; r.ax += grip[3];
  l.x += grip[4]; l.y += grip[5]; l.z += grip[6];
  w.ax = grip[7];
  // stilstaan: een trage deining (alleen als de tijd meegegeven is; in beweging neemt de bob het over)
  if (Number.isFinite(state.t)) {
    const calm = 1 - clamp(fin(state.move), 0, 1);
    r.y += Math.sin(state.t * 1.4) * 0.006 * calm;
    l.y += Math.sin(state.t * 1.4 + 0.8) * 0.006 * calm;
    r.x += Math.sin(state.t * 0.7) * 0.004 * calm;
    l.x += Math.sin(state.t * 0.7 + 0.8) * 0.004 * calm;
  }
  // lopen en rennen: zijwaartse bob; bij rennen de handen lager en naar voren gekanteld
  const bobX = fin(state.bobX), run = clamp(fin(state.sprint), 0, 1);
  r.x += bobX * 0.012; l.x += bobX * 0.012;
  r.y -= 0.03 * run; l.y -= 0.03 * run;
  r.ax -= 0.15 * run; l.ax -= 0.15 * run;
  // springen: stijgend zakken de handen in beeld, vallend komen ze omhoog
  const jump = clamp(fin(state.jump), -1, 1);
  r.y -= 0.035 * jump; l.y -= 0.035 * jump;
  // wie slaat: met een wapen altijd de rechterhand, met blote vuisten om en om
  const striking = state.weapon ? 1 : (state.side > 0 ? 1 : -1);
  const f = state.swing ? swingAmount(state.u, state.swing === 'overhead' ? 0.33 : state.swing === 'thrust' ? 0.38 : 0.26) : 0;
  const hit = Math.max(0, f), back = Math.max(0, -f);
  if (f !== 0) {
    const h = striking > 0 ? r : l;
    h.x -= 0.07 * hit - 0.02 * back;
    h.y += 0.1 * hit + 0.05 * back;
    h.z -= 0.34 * hit - 0.1 * back;
    h.ax += -0.5 * hit + 0.25 * back;
    // de andere hand gaat mee naar voren als de slag landt (tegenwicht)
    const g = striking > 0 ? l : r;
    g.y += 0.04 * hit;
    g.z -= 0.06 * hit;
    if (state.weapon) {
      switch (state.swing) {
        case 'overhead': // de klomp van boven
          w.ax = 1.1 * back - 0.75 * hit;
          w.az = 0.2 * hit;
          break;
        case 'bat': // de knuppel zijwaarts door de borst
          w.ay = 0.7 * back - 1.3 * hit;
          w.ax = -0.25 * hit;
          break;
        case 'slap': // de hockeystick laag
          w.ay = 0.5 * back - 0.9 * hit;
          w.ax = 0.35 * hit;
          break;
        case 'sweep': // de bezem
          w.ay = -0.4 * back + 0.9 * hit;
          break;
        case 'stab': // de fietspomp vooruit
          w.ax = 0.1 * hit;
          break;
        case 'thrust': // de polsstok met twee handen
          w.ax = -0.35 * back + 0.2 * hit;
          l.x += -0.06 * hit;
          l.z -= 0.14 * hit;
          break;
        default:
          w.ax = -0.4 * hit;
      }
    }
  }
  // richten met een vuurwapen: de rechterhand naar het midden en omhoog, de linker eronder
  if (aiming) {
    r.x = 0.11; r.y = -0.14; r.z = AIM_Z;
    r.ax = -0.02; r.az = 0.02;
    l.x = -0.02; l.y = -0.19; l.z = AIM_Z - 0.06;
    l.ax = 0.1; l.az = -0.25;
    w.ax = 0; w.ay = 0; w.az = 0;
  }
  // de blokstand (#492): de vuisten omhoog voor het gezicht, het wapen schuin ervoor
  if (state.block) {
    r.x = 0.12; r.y = -0.16; r.z = -0.62;
    r.ax = -0.1; r.ay = 0; r.az = -0.5;
    l.x = -0.1; l.y = -0.2; l.z = -0.6;
    l.ax = -0.15; l.ay = 0; l.az = 0.5;
    w.ax = 0.15; w.ay = 0.35; w.az = -0.5;
  }
  // pakken en deur of ander gebruik (E): de rechterhand reikt naar voren en omhoog en komt terug
  const reach = clamp(fin(state.reach), 0, 1);
  if (reach > 0 && !state.swing && !aiming && !state.block) {
    const bell = Math.sin(Math.PI * reach);
    r.x -= 0.08 * bell; r.y += 0.14 * bell; r.z -= 0.3 * bell;
    r.ax += 0.35 * bell;
  }
  // de terugslag van een schot: het wapen en de handen een tik naar achteren
  const kick = Number.isFinite(state.kick) ? state.kick : 0;
  if (kick > 0) {
    r.z += 0.045 * kick;
    r.ax -= 0.22 * kick;
    w.ax -= 0.3 * kick;
  }
  // nooit dichter bij de camera dan de near-plane
  if (r.z > -HANDS_MIN_DIST) r.z = -HANDS_MIN_DIST;
  if (l.z > -HANDS_MIN_DIST) l.z = -HANDS_MIN_DIST;
  return o;
}

// De twee armen: mouw (kleding), onderarm en vuist (huid), plus een pivot voor het wapen.
// Alles in één groep met gedeelde materialen; de vuisten zijn losse boxen, geen skelet.
function buildArm(mats, mirror) {
  const g = new THREE.Group();
  const s = mirror ? -1 : 1;
  const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.1), mats.shirt);
  sleeve.position.set(0, 0, 0.06);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.085, 0.22), mats.skin);
  arm.position.set(0, 0, -0.01);
  const fist = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.1, 0.13), mats.skin);
  fist.position.set(0, 0, -0.15);
  const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.04, 0.07), mats.skin);
  thumb.position.set(-0.06 * s, 0.03, -0.14);
  // overlay: geen dieptetest, dus volgorde via renderOrder (mouw, arm, [wapen 32], vuist, duim)
  [sleeve, arm, fist, thumb].forEach((m, i) => {
    m.userData.box = true;
    m.castShadow = false;
    m.receiveShadow = false;
    m.frustumCulled = false;
    m.renderOrder = [30, 31, 33, 34][i];
    g.add(m);
  });
  return g;
}

function handsMaterials(character) {
  const app = character === 'anita' ? ANITA_APPEARANCE : TAMMO_APPEARANCE;
  const skin = new THREE.MeshLambertMaterial({ color: app.skin, emissive: 0x1c1a18, flatShading: true, depthTest: false, depthWrite: false });
  const shirt = new THREE.MeshLambertMaterial({ color: app.shirt, emissive: 0x14161a, flatShading: true, depthTest: false, depthWrite: false });
  return { skin, shirt };
}

function buildFirstPersonHands(character = 'tammo') {
  const mats = handsMaterials(character);
  const root = new THREE.Group();
  root.name = 'eerstepersoonhanden';
  root.userData.character = character === 'anita' ? 'anita' : 'tammo';
  root.userData.mats = mats;
  const right = buildArm(mats, false);
  const left = buildArm(mats, true);
  // de handen staan aan de binnenkant van hun eigen as; het wapen hangt aan de rechtervuist
  const weaponPivot = new THREE.Group();
  weaponPivot.position.set(0, 0, -0.15);
  right.add(weaponPivot);
  // de muzzle flash: een klein laag-poly lichtje aan de loop, zonder dieptetest (overlay)
  const flash = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), new THREE.MeshBasicMaterial({ color: 0xffe9a8, depthTest: false, depthWrite: false }));
  flash.renderOrder = 40; flash.frustumCulled = false; flash.visible = false;
  weaponPivot.add(flash);
  root.userData.flash = flash;
  root.add(right, left);
  root.userData.right = right;
  root.userData.left = left;
  root.userData.weaponPivot = weaponPivot;
  root.userData.weapons = {};
  root.userData.weaponKey = null;
  return root;
}

// Het nieuwe model (ADR 0050, ?mensen=q3): de echte onderarm met mouw en gesloten hand van de speler (modularpeople.js
// bakeModularForearm) in plaats van de blokjes. De pols staat 8 cm voor de as van de arm, zodat de vuist waar het blokje zat uitkomt.
// character null zet de blokjes terug.
const Q_WRIST_Z = -0.08;
function applyModularHands(h, character) {
  const ud = h.userData;
  if (ud.qKey === character) return;
  ud.qKey = character;
  for (const side of ['right', 'left']) {
    const arm = ud[side];
    const old = arm.userData.qArm;
    if (old) { arm.remove(old); old.geometry.dispose(); arm.userData.qArm = null; }
    let mesh = null;
    if (character) {
      const look = modularLookFromAppearance(character === 'anita' ? ANITA_APPEARANCE : TAMMO_APPEARANCE);
      const g = look && bakeModularForearm(look, side === 'right' ? 'R' : 'L');
      if (g && g.attributes.position.count) {
        if (!ud.qMat) ud.qMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, depthTest: false, depthWrite: false, emissive: 0x1c1a18 });
        mesh = new THREE.Mesh(g, ud.qMat);
        mesh.position.set(0, 0, Q_WRIST_Z);
        mesh.renderOrder = 33; mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false;
        mesh.name = 'onderarm-' + side;
        arm.add(mesh);
        arm.userData.qArm = mesh;
      }
    }
    for (const c of arm.children) if (c.userData.box) c.visible = !mesh;
  }
}

// Laat het wapen in de rechterhand zien; null (of 'fists') houdt de handen leeg. De geometrie
// komt uit models3d_people.js, dus de eerste-persoonknuppel is dezelfde als die op je rug.
export function showFirstPersonWeapon(hands, key) {
  const ud = hands && hands.userData;
  if (!ud || (ud.weaponKey || null) === (key || null)) return ud ? ud.weaponKey : null;
  ud.weaponKey = key || null;
  for (const k in ud.weapons) { const m = ud.weapons[k]; if (m) m.visible = false; }
  if (!ud.weaponKey) return null;
  let g = ud.weapons[ud.weaponKey];
  if (g === undefined) {
    const mesh = buildWeaponMesh(ud.weaponKey);
    if (!mesh) { ud.weapons[ud.weaponKey] = null; ud.weaponKey = null; return null; }
    // buildWeaponMesh legt de loop langs +x; in de camera is vooruit -z
    mesh.rotation.y = Math.PI / 2;
    // de materialen zijn gedeeld met het derde-persoonfiguur: kopieer ze voor de overlay
    let i = 0;
    mesh.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false;
      o.renderOrder = 32 + 0.01 * i++;
      o.material = o.material.clone();
      o.material.depthTest = false; o.material.depthWrite = false;
    });
    g = new THREE.Group();
    g.add(mesh);
    // het uiteinde van de loop (voor de muzzle flash): de verste -z van het model
    mesh.updateMatrixWorld(true);
    g.userData.tipZ = new THREE.Box3().setFromObject(mesh).min.z;
    ud.weaponPivot.add(g);
    ud.weapons[ud.weaponKey] = g;
  }
  if (!g) { ud.weaponKey = null; return null; }
  g.visible = true;
  return ud.weaponKey;
}

// Welk wapen hoort bij de speler nu? 'fists' (en een wapen dat geen model heeft) is null.
// Of een wapen een model heeft, wordt één keer per sleutel opgezocht: buildWeaponMesh maakt een
// groep, en dat hoort niet elk beeld te gebeuren.
const weaponModels = new Map();
function hasWeaponModel(key) {
  if (!weaponModels.has(key)) weaponModels.set(key, !!buildWeaponMesh(key));
  return weaponModels.get(key);
}
export function firstPersonWeaponKey(world, inVehicle = false) {
  const key = world && world.weapon;
  if (!key || key === 'fists' || inVehicle) return null;
  return hasWeaponModel(key) ? key : null;
}

// Wanneer de speler geen handen heeft of de camera niet van hem is: geen viewmodel (geen meshes, schaduw of hand-hud). Een duif (of een andere
// niet-menselijke gedaante: player.vorm of player.nonHuman) heeft vleugels, geen handen; een voertuig, het water, een filmpje, de treincamera, het
// menu en de scope laten de handen ook weg. Eén plek, zodat een nieuwe niet-menselijke stand maar op één lijst hoeft.
export const HANDS_HIDE_FLAGS = ['pigeonMode', 'pigeonIntro', 'scoped', 'menuCam', 'cinematicHidePlayers', 'cameraOverride', 'trainCam', 'trainDriving'];
export function firstPersonHandsHidden(world, player) {
  if (!player || player.inVehicle || player.swimming || player.carrying || player.ragdoll || player.nonHuman || player.vorm === 'duif') return true;
  if (world) for (const f of HANDS_HIDE_FLAGS) if (world[f]) return true;
  return false;
}

let hands = null;
const _pose = { r: {}, l: {}, w: {} };
let wasE = false, reachAt = -9;
const REACH_S = 0.4;
const _state = { swing: null, u: 0, aiming: false, block: false, kick: 0, bob: 0, side: 0, weapon: null };

// Per beeld, vlak bij de camera: hang de handen aan de camera (en de camera aan de scène, anders
// wordt een kind van de camera niet getekend), kies het wapen en zet de stand. De uithaal of het
// schot van dit moment komt uit combat.js (combateffect.js). Geeft de groep terug (voor de
// test), of null als er niets te tonen is.
export function syncFirstPersonHands(scene, cam, world, player) {
  // een kale testcamera (zonder add) of een camera die nog niet bestaat: niets te doen
  if (!cam || typeof cam.add !== 'function' || !cam.position) return null;
  if (!hands) hands = buildFirstPersonHands(player && player.character);
  // huid- en kledingkleur van de speler volgen (ook na een verkleedpartij, heist.js): twee
  // hex-waarden per beeld, geen nieuwe materialen
  const app = (player && player.character) === 'anita' ? ANITA_APPEARANCE : TAMMO_APPEARANCE;
  hands.userData.character = (player && player.character) === 'anita' ? 'anita' : 'tammo';
  hands.userData.mats.skin.color.setHex(app.skin);
  hands.userData.mats.shirt.color.setHex(app.shirt);
  // spelerfase van de modulaire mensen: de echte onderarmen (alleen als de rigs er zijn; anders de blokjes)
  applyModularHands(hands, mensenFase(FLAGS.mensen) >= 3 && modularReady() ? hands.userData.character : null);
  if (hands.parent !== cam) {
    cam.add(hands);
    // een kind van de camera wordt alleen getekend als de camera zelf in de scène hangt
    if (scene && cam.parent !== scene) scene.add(cam);
  }
  const inVehicle = !!(player && player.inVehicle);
  const hidden = firstPersonHandsHidden(world, player);
  hands.visible = !hidden;
  if (hidden) return hands;
  const key = firstPersonWeaponKey(world, inVehicle);
  showFirstPersonWeapon(hands, key);
  const fx = getCombatEffect();
  const now = (world && world.time) || 0;
  let swing = null, u = 0;
  if (fx && fx.type === 'melee' && fx.start !== undefined && now >= fx.start) {
    const dur = SWING_S[fx.swing] || SWING_S.jab;
    u = (now - fx.start) / dur;
    if (u >= 0 && u < 1) swing = SWING_S[fx.swing] ? fx.swing : 'jab';
  }
  // werpwapens (carbidbus): een gooibeweging met de rechterhand
  if (fx && fx.type === 'throw' && fx.start !== undefined && now >= fx.start) {
    u = (now - fx.start) / SWING_S.throw;
    if (u >= 0 && u < 1) swing = 'throw';
  }
  let kick = 0;
  if (fx && (fx.type === 'muzzle' || fx.type === 'squirt') && fx.start !== undefined) kick = gunKick(now - fx.start);
  const inp = world && world.input;
  const mouse = inp && inp.mouse;
  const aiming = !!key && isRangedWeapon(key) && !!(mouse && mouse.rightDown) && !(world && world.scoped);
  // blokkeren met rechts (#492): de handen gaan omhoog, ook met blote vuisten
  const block = !!(world && world.blok && blokActief(world.blok, now)) && !aiming;
  const speed = player ? Math.hypot(player.vx || 0, player.vy || 0) : 0;
  // geen object per frame: de stand gaat via module-tijdelijke velden
  _state.swing = swing;
  _state.u = u;
  _state.aiming = aiming;
  _state.block = block;
  _state.kick = kick;
  _state.bob = Math.sin(now * 9) * Math.min(1, speed / 4);
  _state.side = fx && fx.type === 'melee' ? fx.side : 0;
  _state.weapon = key;
  _state.cls = weaponClass(key);
  _state.t = now;
  _state.move = Math.min(1, speed / 2);
  _state.bobX = Math.cos(now * 4.5) * Math.min(1, speed / 4);
  _state.sprint = speed > 4.5 && inp && typeof inp.isDown === 'function' && inp.isDown('shift') ? 1 : 0;
  const vz = player.vz || 0;
  _state.jump = (player.z || 0) > 0.05 ? Math.max(-1, Math.min(1, vz / 6)) : 0;
  // E of F: de hand reikt naar voren (pakken, deur, praten), 0,4 s
  const eDown = !!(inp && typeof inp.isDown === 'function' && (inp.isDown('e') || inp.isDown('f')));
  if (eDown && !wasE) reachAt = now;
  wasE = eDown;
  const ru = (now - reachAt) / REACH_S;
  _state.reach = ru >= 0 && ru < 1 ? ru : 0;
  handsPose(_pose, _state);
  const r = hands.userData.right, l = hands.userData.left, wp = hands.userData.weaponPivot;
  r.position.set(_pose.r.x, _pose.r.y, _pose.r.z);
  r.rotation.set(_pose.r.ax, _pose.r.ay, _pose.r.az);
  l.position.set(_pose.l.x, _pose.l.y, _pose.l.z);
  l.rotation.set(_pose.l.ax, _pose.l.ay, _pose.l.az);
  wp.rotation.set(_pose.w.ax, _pose.w.ay, _pose.w.az);
  // de muzzle flash: alleen bij een vuurwapenschot, aan het eind van de loop
  const fl = hands.userData.flash;
  const wg = key ? hands.userData.weapons[key] : null;
  const fa = fx && fx.type === 'muzzle' && wg && WEAPONS[key] && WEAPONS[key].kind === 'gun' ? muzzleFlash(now - fx.start) : 0;
  fl.visible = fa > 0;
  if (fa > 0) { fl.position.set(0, 0, wg.userData.tipZ - 0.04); fl.scale.setScalar(0.5 + fa); }
  return hands;
}

// Voor de test en de QA: de groep zoals hij nu bestaat (of null).
export function currentFirstPersonHands() { return hands; }

// De eerste-persoonstand ging uit (menu, filmpje, trein, duif): het viewmodel mag niet in beeld
// blijven hangen. fpSync roept dit elk beeld dat de camera niet in eerste persoon staat.
export function hideFirstPersonHands() {
  if (hands) hands.visible = false;
}

// Haalt het viewmodel helemaal weg (uit de camera, geometrieën en materialen vrij); de volgende sync bouwt het opnieuw. Voor een wissel van
// personage of een opruimronde; de handen komen daarna vanzelf terug als de speler weer een mens in eerste persoon is.
export function disposeFirstPersonHands() {
  if (!hands) return;
  if (hands.parent) hands.parent.remove(hands);
  const seen = new Set();
  hands.traverse((o) => {
    if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
    const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of ms) if (!seen.has(m)) { seen.add(m); m.dispose(); }
  });
  hands = null;
}
