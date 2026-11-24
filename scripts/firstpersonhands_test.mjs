// Eerste-persoon-handen en -wapen (#943): de stand (pure rekenkunde), de wapens uit de
// wapenlijst en de bedrading van het viewmodel aan de camera. Het eigen figuur staat in eerste
// persoon niet in beeld, dus dit viewmodel is wat de speler ziet als hij slaat of schiet.
//   node scripts/firstpersonhands_test.mjs   (eenmalig: cd desktop && npm run stage)
import './node3d.mjs';
import assert from 'node:assert/strict';
const THREE = await import('three');
const {
  HANDS_REST, HANDS_MIN_DIST, AIM_Z, SWING_S,
  swingAmount, gunKick, handsPose, showFirstPersonWeapon, firstPersonWeaponKey,
  syncFirstPersonHands, hideFirstPersonHands, currentFirstPersonHands,
  weaponClass, HAND_CLASSES, muzzleFlash, firstPersonHandsHidden, HANDS_HIDE_FLAGS, disposeFirstPersonHands,
  VIEWMODEL_ORDER, VIEWMODEL_CLEAR_ORDER, viewmodelMaterial, shouldClearViewmodelDepth,
} = await import('../game/js/firstpersonhands.js');
const { buildWeaponMesh } = await import('../game/js/models3d_people.js');
const { WEAPON_KEYS } = await import('../game/js/weapons.js');
const { setCombatEffect } = await import('../game/js/combateffect.js');

let n = 0;
const t = (naam, f) => { n++; try { f(); } catch (e) { console.log('FAIL', naam, e && e.message); throw e; } };
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

// --- de uithaal en de terugslag -----------------------------------------------------------
t('een uithaal begint achter, slaat door en komt terug: -1 .. 0 .. +1', () => {
  assert.equal(swingAmount(-0.2), 0, 'voor de slag is er niets');
  assert.equal(swingAmount(1), 0, 'na de slag is er niets');
  assert.equal(swingAmount(NaN), 0);
  assert.ok(near(swingAmount(0.26), -1, 1e-9), 'op het eind van de wind-up staat de hand achter');
  assert.ok(near(swingAmount(0.4), 1, 1e-9), 'de klap zelf is +1');
  assert.ok(swingAmount(0.32) < 0 && swingAmount(0.36) > 0, 'de klap gaat door nul heen');
  assert.ok(swingAmount(0.7) > 0 && swingAmount(0.7) < 1, 'daarna zakt hij terug');
  // een kopstoot van boven (de klomp) heeft een langere aanloop
  assert.ok(swingAmount(0.26, 0.33) > -1, 'met een langere wind-up staat de hand daar nog niet achter');
  assert.ok(near(swingAmount(0.33, 0.33), -1, 1e-9));
});

t('de terugslag van een schot is een scherpe piek en dooft daarna uit', () => {
  assert.equal(gunKick(-1), 0);
  assert.equal(gunKick(0), 0);
  assert.equal(gunKick(0.03), 1);
  assert.ok(gunKick(0.1) < 0.5 && gunKick(0.1) > 0, 'na een tiende is het meeste weg');
  assert.ok(gunKick(0.4) < gunKick(0.1));
});

// --- de stand zelf ------------------------------------------------------------------------
t('de ruststand houdt de vuisten onder in beeld, buiten de near-plane', () => {
  const p = handsPose({}, {});
  assert.deepEqual({ x: p.r.x, y: p.r.y, z: p.r.z }, { x: HANDS_REST.rx, y: HANDS_REST.ry, z: HANDS_REST.rz });
  assert.deepEqual({ x: p.l.x, y: p.l.y, z: p.l.z }, { x: HANDS_REST.lx, y: HANDS_REST.ly, z: HANDS_REST.lz });
  assert.ok(p.r.z <= -HANDS_MIN_DIST && p.l.z <= -HANDS_MIN_DIST, 'verder dan de near-plane');
  assert.ok(p.r.x > 0 && p.l.x < 0, 'rechts staat rechts, links staat links');
  assert.ok(p.r.y < 0 && p.l.y < 0, 'de vuisten hangen onder het midden');
});

t('slaan met rechts zet de rechtervuist naar voren en omhoog, links bijna niet', () => {
  const rust = handsPose({}, {});
  const klap = handsPose({}, { swing: 'jab', u: 0.4, side: 1 });
  assert.ok(klap.r.z < rust.r.z - 0.2, 'de rechtervuist gaat naar voren', { rust: rust.r.z, klap: klap.r.z });
  assert.ok(klap.r.y > rust.r.y, 'en iets omhoog');
  assert.ok(rust.l.z - klap.l.z < 0.1, 'de linkerhand gaat maar een klein stukje mee als tegenwicht');
  const links = handsPose({}, { swing: 'jab', u: 0.4, side: -1 });
  assert.ok(links.l.z < rust.l.z - 0.2, 'de andere vuist slaat om de beurt');
  assert.ok(rust.r.z - links.r.z < 0.1);
  assert.ok(links.r.z > klap.l.z, 'de niet-slaande hand blijft ver achter');
});

t('met een wapen slaat altijd de rechterhand, ook als de beurt links is', () => {
  const p = handsPose({}, { swing: 'bat', u: 0.4, side: -1, weapon: 'knuppel' });
  const rust = handsPose({}, {});
  assert.ok(p.r.z < rust.r.z - 0.2, 'de wapenhand haalt uit');
  assert.ok(rust.l.z - p.l.z < 0.1, 'de losse hand blijft ver achter');
  assert.ok(Math.abs(p.w.ay) > 0.5, 'en de knuppel zwaait zijwaarts', p.w.ay);
});

t('een klomp komt van boven: eerst omhoog, dan omlaag', () => {
  const achter = handsPose({}, { swing: 'overhead', u: 0.3, weapon: 'klomp' });
  const klap = handsPose({}, { swing: 'overhead', u: 0.45, weapon: 'klomp' });
  assert.ok(achter.w.ax > 0.4, 'in de aanloop wijst het wapen omhoog', achter.w.ax);
  assert.ok(klap.w.ax < -0.3, 'de klap gaat omlaag', klap.w.ax);
});

t('richten zet de handen omhoog naar het midden, met het wapen recht vooruit', () => {
  const rus = handsPose({}, { weapon: 'pistol' });
  const aim = handsPose({}, { weapon: 'pistol', aiming: true });
  assert.ok(aim.r.y > rus.r.y + 0.1, 'de rechterhand komt omhoog');
  assert.ok(Math.abs(aim.r.x) < Math.abs(rus.r.x), 'en naar het midden');
  assert.ok(near(aim.r.z, AIM_Z, 1e-9));
  assert.ok(near(aim.w.ax, 0, 1e-9) && near(aim.w.ay, 0, 1e-9), 'het wapen wijst recht vooruit');
  assert.ok(aim.l.x < aim.r.x && near(aim.l.z, AIM_Z - 0.06, 1e-9), 'de linkerhand steunt eronder');
});

t('de terugslag duwt de handen en het wapen naar achteren en omhoog', () => {
  const rust = handsPose({}, { weapon: 'pistol', aiming: true });
  const schot = handsPose({}, { weapon: 'pistol', aiming: true, kick: 1 });
  assert.ok(schot.r.z > rust.r.z, 'de hand komt dichterbij');
  assert.ok(schot.r.ax < rust.r.ax, 'en de pols klapt omhoog');
  assert.ok(schot.w.ax < rust.w.ax, 'het wapen ook');
});

t('de blokstand zet de vuisten omhoog voor het gezicht (#492)', () => {
  const rust = handsPose({}, {});
  const blok = handsPose({}, { block: true });
  assert.ok(blok.r.y > rust.r.y + 0.1 && blok.l.y > rust.l.y + 0.1, 'beide vuisten omhoog', [blok.r.y, blok.l.y]);
  assert.ok(Math.abs(blok.r.x) < Math.abs(rust.r.x) && Math.abs(blok.l.x) < Math.abs(rust.l.x), 'en naar het midden');
  assert.ok(blok.r.z <= -HANDS_MIN_DIST && blok.l.z <= -HANDS_MIN_DIST, 'buiten de near-plane');
});

t('geen enkele stand komt dichter bij de camera dan de near-plane', () => {
  for (const u of [0, 0.2, 0.3, 0.4, 0.6, 0.9]) {
    for (const swing of Object.keys(SWING_S)) {
      const p = handsPose({}, { swing, u, kick: 1, aiming: true, weapon: 'shotgun' });
      assert.ok(p.r.z <= -HANDS_MIN_DIST + 1e-9, `${swing} ${u}: rechts ${p.r.z}`);
      assert.ok(p.l.z <= -HANDS_MIN_DIST + 1e-9, `${swing} ${u}: links ${p.l.z}`);
    }
  }
});

// --- de wapens ----------------------------------------------------------------------------
t('elk wapen uit de wapenlijst heeft een model, behalve de blote vuisten', () => {
  for (const key of WEAPON_KEYS) {
    const mesh = buildWeaponMesh(key);
    if (key === 'fists') assert.equal(mesh, null, 'vuisten hebben geen model');
    else assert.ok(mesh && mesh.children.length > 0, `${key} heeft een model`);
  }
  assert.equal(buildWeaponMesh('bestaatniet'), null);
});

t('firstPersonWeaponKey: het wapen in de hand, maar niet in een voertuig', () => {
  assert.equal(firstPersonWeaponKey({ weapon: 'fists' }), null);
  assert.equal(firstPersonWeaponKey({ weapon: 'knuppel' }), 'knuppel');
  assert.equal(firstPersonWeaponKey({ weapon: 'knuppel' }, true), null, 'in een auto geen handwapen');
  assert.equal(firstPersonWeaponKey({ weapon: 'bestaatniet' }), null);
  assert.equal(firstPersonWeaponKey(null), null);
});

// --- de bedrading aan de camera -----------------------------------------------------------
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.5, 500);
const world = {
  time: 10, weapon: 'fists', scoped: false, pigeonMode: false,
  input: { mouse: { rightDown: false } },
};
const player = { character: 'tammo', vx: 0, vy: 0, inVehicle: null, swimming: false, carrying: false };

t('het viewmodel hangt aan de camera, en de camera aan de scène (anders wordt het niet getekend)', () => {
  const hands = syncFirstPersonHands(scene, cam, world, player);
  assert.ok(hands && hands.isObject3D, 'een groep');
  assert.equal(currentFirstPersonHands(), hands);
  assert.equal(hands.parent, cam, 'de handen hangen aan de camera');
  assert.equal(cam.parent, scene, 'de camera hangt in de scène');
  assert.equal(hands.visible, true, 'te voet met de vuisten in beeld');
  assert.ok(hands.userData.right && hands.userData.left, 'twee handen');
  assert.equal(hands.userData.right.children.filter((c) => c.isMesh).length >= 3, true, 'mouw, arm en vuist');
});

t('het wapen van de speler komt in de rechterhand en wisselt mee', () => {
  const hands = currentFirstPersonHands();
  assert.equal(showFirstPersonWeapon(hands, 'knuppel'), 'knuppel');
  assert.equal(hands.userData.weaponKey, 'knuppel');
  const w = hands.userData.weapons.knuppel;
  assert.ok(w && w.visible, 'de knuppel staat aan');
  assert.ok(w.children.length > 0, 'met geometrie');
  assert.equal(w.children[0].rotation.y, Math.PI / 2, 'de loop wijst vooruit (-z)');
  assert.equal(showFirstPersonWeapon(hands, 'pistol'), 'pistol');
  assert.equal(w.visible, false, 'het vorige wapen gaat weg');
  assert.equal(showFirstPersonWeapon(hands, null), null);
  assert.equal(hands.userData.weaponKey, null, 'zonder wapen blijven de vuisten over');
  assert.equal(hands.userData.weapons.pistol.visible, false);
  // een wapen zonder model valt terug op de vuisten
  assert.equal(showFirstPersonWeapon(hands, 'bestaatniet'), null);
});

t('de speler ziet zijn wapen als hij het draagt, en de vuist als hij slaat', () => {
  const hands = currentFirstPersonHands();
  setCombatEffect(null);
  world.weapon = 'knuppel';
  syncFirstPersonHands(scene, cam, world, player);
  assert.equal(hands.userData.weaponKey, 'knuppel');
  assert.equal(hands.userData.weapons.knuppel.visible, true);
  world.weapon = 'fists';
  syncFirstPersonHands(scene, cam, world, player);
  assert.equal(hands.userData.weaponKey, null, 'met blote vuisten geen wapen in de hand');
});

t('een uithaal van combat.js beweegt de hand, een schot geeft terugslag', () => {
  const hands = currentFirstPersonHands();
  const rustZ = hands.userData.right.position.z;
  setCombatEffect({ type: 'melee', start: world.time, until: world.time + 0.15, side: 1, swing: 'jab', weapon: 'fists' });
  world.weapon = 'fists';
  world.time += 0.13; // midden in de uithaal
  syncFirstPersonHands(scene, cam, world, player);
  assert.ok(hands.userData.right.position.z < rustZ - 0.15, 'de rechtervuist haalt uit', hands.userData.right.position.z);
  setCombatEffect(null);
  world.weapon = 'pistol';
  syncFirstPersonHands(scene, cam, world, player);
  const aimZ = hands.userData.right.position.z;
  setCombatEffect({ type: 'muzzle', start: world.time, until: world.time + 0.06, weapon: 'pistol' });
  world.time += 0.03; // de piek van de terugslag
  syncFirstPersonHands(scene, cam, world, player);
  assert.ok(hands.userData.right.position.z > aimZ, 'de hand komt bij een schot naar achteren', hands.userData.right.position.z);
  setCombatEffect(null);
  world.time = 10;
});

t('een blokstand van combat.js zet de handen in de guard', () => {
  const hands = currentFirstPersonHands();
  setCombatEffect(null);
  world.weapon = 'knuppel';
  world.blok = { aan: true, sinds: world.time - 0.2, herstelTot: 0, ingedrukt: true };
  syncFirstPersonHands(scene, cam, world, player);
  assert.ok(hands.userData.right.position.y > -0.25, 'de vuist is omhoog', hands.userData.right.position.y);
  assert.ok(Math.abs(hands.userData.weaponPivot.rotation.z) > 0.2, 'het wapen staat schuin', hands.userData.weaponPivot.rotation.z);
  world.blok = null;
  world.weapon = 'fists';
  syncFirstPersonHands(scene, cam, world, player);
});

t('in een voertuig, in het water, met iets in de handen of in een filmpje geen viewmodel', () => {
  const hands = currentFirstPersonHands();
  for (const [naam, wijzig] of [
    ['in een voertuig', () => { player.inVehicle = {}; }],
    ['zwemmend', () => { player.inVehicle = null; player.swimming = true; }],
    ['iets dragend', () => { player.swimming = false; player.carrying = true; }],
    ['duif', () => { player.carrying = false; world.pigeonMode = true; }],
    ['door een scope', () => { world.pigeonMode = false; world.scoped = true; }],
  ]) {
    wijzig();
    syncFirstPersonHands(scene, cam, world, player);
    assert.equal(hands.visible, false, `verborgen ${naam}`);
  }
  world.scoped = false;
  syncFirstPersonHands(scene, cam, world, player);
  assert.equal(hands.visible, true, 'terug te voet weer in beeld');
  hideFirstPersonHands();
  assert.equal(hands.visible, false, 'hideFirstPersonHands haalt ze weg als de stand uit gaat');
});

t('zonder camera (of met een kale testcamera) doet het viewmodel niets', () => {
  assert.equal(syncFirstPersonHands(scene, null, world, player), null);
  assert.equal(syncFirstPersonHands(scene, { position: {} }, world, player), null);
});

t('geen enkel deel van de armen valt binnen de near-plane van 0,5 m', () => {
  // De camera staat in deze test op de oorsprong, dus wereldmaten zijn meteen cameramaten.
  const box = new THREE.Box3();
  world.input.mouse.rightDown = false;
  world.weapon = 'fists';
  setCombatEffect(null);
  syncFirstPersonHands(scene, cam, world, player);
  box.setFromObject(currentFirstPersonHands());
  assert.ok(box.min.z <= -0.5 + 1e-6, 'in de ruststand', box.min.z);
  world.weapon = 'pistol';
  world.input.mouse.rightDown = true; // richten: de handen komen het dichtst bij de camera
  syncFirstPersonHands(scene, cam, world, player);
  box.setFromObject(currentFirstPersonHands());
  assert.ok(box.min.z <= -0.5 + 1e-6, 'bij het richten', box.min.z);
  world.input.mouse.rightDown = false;
  world.weapon = 'fists';
});


t('elk wapen uit de wapenlijst valt in een houdingsklasse, en elke klasse geeft een eindige stand', () => {
  const { WEAPONS } = { WEAPONS: null };
  for (const k of WEAPON_KEYS) {
    const c = weaponClass(k);
    assert.ok(HAND_CLASSES.includes(c), k + ' -> ' + c);
    for (const st of [{}, { swing: 'jab', u: 0.4, side: -1 }, { aiming: true }, { block: true }, { kick: 1 }, { reach: 0.5 }, { jump: 1 }, { jump: -1 }, { sprint: 1, bobX: 1, bob: 1, move: 1, t: 3.3 }]) {
      const p = handsPose({}, { ...st, weapon: k === 'fists' ? null : k });
      for (const h of [p.r, p.l, p.w]) for (const v of Object.values(h)) assert.ok(Number.isFinite(v), k + ' NaN');
    }
  }
  assert.equal(weaponClass('pistol'), 'pistol');
  assert.equal(weaponClass('shotgun'), 'long');
  assert.equal(weaponClass('jachtgeweer'), 'long');
  assert.equal(weaponClass('knuppel'), 'melee');
  assert.equal(weaponClass('bezem'), 'tool');
  assert.equal(weaponClass('carbidbus'), 'throw');
  assert.equal(weaponClass('vuurwerk'), 'rocket');
  assert.equal(weaponClass('fists'), 'fists');
  assert.equal(weaponClass('bestaatniet'), 'fists');
});

t('elke klasse heeft een eigen houding (rechterhand of wapen wijkt af van de lege vuist)', () => {
  const base = handsPose({}, {});
  for (const k of ['knuppel', 'bezem', 'pistol', 'jachtgeweer', 'carbidbus', 'vuurwerk']) {
    const p = handsPose({}, { weapon: k });
    assert.ok(Math.abs(p.r.y - base.r.y) + Math.abs(p.w.ax) + Math.abs(p.l.z - base.l.z) > 0.01, k);
  }
  const a = handsPose({}, { weapon: 'pistol' }), b = handsPose({}, { weapon: 'jachtgeweer' });
  assert.ok(b.l.z < a.l.z, 'het lange geweer wordt met de linkerhand verder voor ondersteund');
});

t('idle sway beweegt rustig en staat stil in beweging; lopen en springen verschuiven de handen', () => {
  const a = handsPose({}, { t: 0 }), b = handsPose({}, { t: 1.1 });
  assert.ok(a.r.y !== b.r.y && Math.abs(a.r.y - b.r.y) < 0.02, 'zachte deining');
  const m = handsPose({}, { t: 1.1, move: 1 }), m2 = handsPose({}, { t: 0, move: 1 });
  assert.equal(m.r.y, m2.r.y, 'in beweging doet de deining niet mee');
  assert.ok(handsPose({}, { sprint: 1 }).r.y < handsPose({}, {}).r.y, 'rennen: lager');
  assert.ok(handsPose({}, { jump: 1 }).r.y < handsPose({}, { jump: -1 }).r.y, 'stijgen: lager dan vallen');
});

t('pakken: de rechterhand reikt naar voren en komt terug (u 0 en 1 = rust)', () => {
  const r0 = handsPose({}, { reach: 0 }).r.z, rm = handsPose({}, { reach: 0.5 }).r.z, r1 = handsPose({}, { reach: 1 }).r.z;
  assert.ok(rm < r0 - 0.2 && Math.abs(r1 - r0) < 1e-9);
  assert.ok(handsPose({}, { reach: 0.5, block: true }).r.z === handsPose({}, { block: true }).r.z, 'blokkeren wint');
});

t('muzzle flash: vol bij het schot, weg na 0,07 s, NaN geeft uit', () => {
  assert.equal(muzzleFlash(0), 1);
  assert.equal(muzzleFlash(0.07), 0);
  assert.equal(muzzleFlash(-1), 0);
  assert.equal(muzzleFlash(NaN), 0);
});

t('viewmodel: eerst de wereld (ook de routestrook), dan diepte leeg, dan handen en wapen met dieptetest; gedeelde wapenmaterialen blijven heel', () => {
  world.weapon = 'jachtgeweer';
  setCombatEffect({ type: 'muzzle', start: world.time, until: world.time + 0.06, weapon: 'jachtgeweer' });
  syncFirstPersonHands(scene, cam, world, player);
  const h = currentFirstPersonHands();
  const clear = h.userData.clear;
  let meshes = 0;
  h.traverse((o) => {
    if (!o.isMesh || o === clear || o === h.userData.flash) return;
    meshes++;
    // de vuist dekt nu met diepte de arm af in plaats van zijn achtervlak eroverheen te tekenen (hertest 22-11)
    assert.equal(o.material.depthTest, true, o.name || 'mesh');
    assert.equal(o.material.depthWrite, true);
    // doorschijnende lijst, dus na de routestrook (renderOrder 1, transparent) en na het merkje dat de diepte leegmaakt
    assert.equal(o.material.transparent, true);
    assert.equal(o.material.opacity, 1);
    assert.ok(o.renderOrder >= VIEWMODEL_ORDER && o.renderOrder > clear.renderOrder);
  });
  assert.ok(meshes > 8);
  assert.equal(clear.material.colorWrite, false, 'het merkje tekent niets');
  assert.equal(clear.material.transparent, true);
  assert.equal(clear.renderOrder, VIEWMODEL_CLEAR_ORDER);
  assert.ok(VIEWMODEL_CLEAR_ORDER > 20, 'boven de routestrook en de Samen-pings');
  assert.equal(h.userData.flash.material.transparent, true, 'de flash komt na de handen');
  // alleen de camera waar de handen aan hangen maakt de diepte leeg
  let cleared = 0;
  const fake = { clearDepth: () => { cleared++; } };
  clear.onBeforeRender(fake, scene, cam);
  assert.equal(cleared, 1);
  clear.onBeforeRender(fake, scene, new THREE.PerspectiveCamera());
  assert.equal(cleared, 1, 'een andere camera (foto, spiegel) laat de diepte staan');
  assert.equal(shouldClearViewmodelDepth(cam, h), true);
  assert.equal(shouldClearViewmodelDepth(cam, { visible: false, parent: cam }), false, 'verborgen handen: niets leegmaken');
  assert.equal(shouldClearViewmodelDepth(null, h), false);
  const pm = viewmodelMaterial(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5 }));
  assert.equal(pm.opacity, 0.5, 'een glazen deel van een wapen blijft doorschijnend');
  assert.equal(h.userData.flash.visible, true, 'flash bij een vuurwapenschot');
  const orig = buildWeaponMesh('jachtgeweer');
  orig.traverse((o) => { if (o.isMesh) assert.notEqual(o.material.depthTest, false, 'derde-persoonmateriaal onaangeroerd'); });
  setCombatEffect({ type: 'squirt', start: world.time, until: world.time + 0.06, weapon: 'jachtgeweer' });
  syncFirstPersonHands(scene, cam, world, player);
  assert.equal(h.userData.flash.visible, false, 'geen flash bij water of melee');
  setCombatEffect(null);
  world.weapon = 'fists';
});

t('verborgen in cutscene, filmcamera, treincamera, duif en menucamera', () => {
  for (const f of ['cameraOverride', 'cinematicHidePlayers', 'trainCam', 'trainDriving', 'pigeonMode', 'menuCam', 'scoped']) {
    world[f] = true;
    syncFirstPersonHands(scene, cam, world, player);
    assert.equal(currentFirstPersonHands().visible, false, f);
    world[f] = false;
  }
  syncFirstPersonHands(scene, cam, world, player);
  assert.equal(currentFirstPersonHands().visible, true);
});


// --- een duif heeft vleugels, geen handen (22-11) ------------------------------------------
// Geen mesh van het viewmodel (ook het wapen en de muzzle flash niet) staat in beeld zolang de speler een duif is, in elke toestand.
const zichtbaar = (o) => { for (let p = o; p; p = p.parent) { if (p.visible === false) return false; if (p === cam) return true; } return true; };
const meshesIn = (root) => { const l = []; root.traverse((o) => { if (o.isMesh) l.push(o); }); return l; };

t('duif: de handen en het wapen zijn verborgen bij stilstaan, vliegen, landen, pikken en wisselen van modus', () => {
  setCombatEffect(null);
  world.weapon = 'knuppel';
  for (const f of HANDS_HIDE_FLAGS) world[f] = false;
  player.inVehicle = null; player.swimming = false; player.carrying = false;
  const hands = syncFirstPersonHands(scene, cam, world, player);
  assert.ok(meshesIn(hands).some(zichtbaar), 'te voet zijn de handen er wel');
  const toestanden = [
    ['stilstaan op de grond', { vx: 0, vy: 0, z: 0 }], ['vliegen', { vx: 9, vy: 2, z: 12, vz: 3 }], ['landen', { vx: 2, vy: 0, z: 0.3, vz: -2 }],
    ['pikken', { vx: 0, vy: 0, z: 0 }], ['rijden op een voertuig', { vx: 5, vy: 0, z: 1 }],
  ];
  world.pigeonMode = true;
  for (const [naam, st] of toestanden) {
    Object.assign(player, { vx: 0, vy: 0, z: 0, vz: 0 }, st);
    syncFirstPersonHands(scene, cam, world, player);
    assert.equal(meshesIn(hands).filter(zichtbaar).length, 0, `geen enkele hand-mesh in beeld bij ${naam}`);
  }
  // de intro (de speler sluit zijn ogen, de duif nog niet in de lucht) en een gedaante-vlag zonder pigeonMode
  world.pigeonMode = false; world.pigeonIntro = true;
  syncFirstPersonHands(scene, cam, world, player);
  assert.equal(meshesIn(hands).filter(zichtbaar).length, 0, 'ook in de intro');
  world.pigeonIntro = false; player.vorm = 'duif';
  syncFirstPersonHands(scene, cam, world, player);
  assert.equal(meshesIn(hands).filter(zichtbaar).length, 0, 'ook met een duif als gedaante');
  player.vorm = null; player.nonHuman = true;
  assert.equal(firstPersonHandsHidden(world, player), true);
  player.nonHuman = false;
  // wisselen van modus: duif -> voertuig -> uitstappen -> duif -> mens
  world.pigeonMode = true; syncFirstPersonHands(scene, cam, world, player);
  player.inVehicle = {}; syncFirstPersonHands(scene, cam, world, player);
  assert.equal(meshesIn(hands).filter(zichtbaar).length, 0, 'duif in een voertuig');
  player.inVehicle = null; syncFirstPersonHands(scene, cam, world, player);
  assert.equal(meshesIn(hands).filter(zichtbaar).length, 0, 'uitgestapt, nog duif');
  // terug naar de mens: de handen en het wapen komen terug
  world.pigeonMode = false;
  syncFirstPersonHands(scene, cam, world, player);
  assert.ok(meshesIn(hands).some(zichtbaar), 'weer een mens: de handen zijn terug');
  assert.ok(hands.userData.weapons.knuppel && zichtbaar(hands.userData.weapons.knuppel), 'en de knuppel ook');
  world.weapon = 'fists';
  syncFirstPersonHands(scene, cam, world, player);
});

t('duif: de lijst van niet-menselijke standen bevat de duif, de intro en de filmstanden', () => {
  for (const f of ['pigeonMode', 'pigeonIntro', 'cameraOverride', 'trainCam', 'menuCam', 'scoped']) assert.ok(HANDS_HIDE_FLAGS.includes(f), f);
  assert.equal(firstPersonHandsHidden(null, null), true, 'zonder speler geen handen');
  assert.equal(firstPersonHandsHidden({}, { character: 'tammo' }), false, 'een gewone speler te voet heeft ze');
});

t('geen lek: steeds wisselen tussen duif en mens bouwt niets bij, opruimen geeft alles vrij', () => {
  const hands = currentFirstPersonHands();
  const tel = () => { let n = 0; hands.traverse(() => n++); return n; };
  const voor = tel();
  for (let i = 0; i < 40; i++) {
    world.pigeonMode = i % 2 === 0;
    syncFirstPersonHands(scene, cam, world, player);
  }
  world.pigeonMode = false;
  syncFirstPersonHands(scene, cam, world, player);
  assert.equal(tel(), voor, 'het aantal objecten blijft gelijk');
  assert.equal(cam.children.filter((c) => c.name === 'eerstepersoonhanden').length, 1, 'één viewmodel aan de camera');
  const geos = new Set(), mats = new Set();
  hands.traverse((o) => { if (o.geometry) geos.add(o.geometry); if (o.material) mats.add(o.material); });
  let vrij = 0;
  for (const x of [...geos, ...mats]) x.addEventListener('dispose', () => vrij++);
  disposeFirstPersonHands();
  assert.equal(vrij, geos.size + mats.size, 'alle geometrieën en materialen zijn vrijgegeven');
  assert.equal(currentFirstPersonHands(), null);
  assert.equal(cam.children.some((c) => c.name === 'eerstepersoonhanden'), false, 'de camera heeft geen handen meer');
  const nieuw = syncFirstPersonHands(scene, cam, world, player);
  assert.equal(nieuw.visible, true, 'als mens bouwt de volgende sync ze weer op');
});

console.log(`firstpersonhands_test: ${n}/${n} ok`);
