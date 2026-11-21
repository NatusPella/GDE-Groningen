// Pure test van de kijkanker (#1141): wat de minimap, de grote kaart en de kompasboog als "jij" tekenen.
//   node scripts/viewanchor_test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getViewAnchor, mapUpRotation, easeAnchor, vehicleKind, wrapAngle } from '../game/js/viewanchor.js';

const body = (o = {}) => ({ x: 10, y: 20, z: 0, angle: 1, inVehicle: null, ...o });
const wereld = (o = {}, b = body()) => ({ player: b, camYaw: 2, ...o });
const PI = Math.PI;

// te voet: het lichaam, de kaart draait met de camera
let a = getViewAnchor(wereld());
assert.deepEqual([a.kind, a.x, a.y, a.heading, a.upYaw, a.camera], ['voet', 10, 20, 1, 2, false]);
assert.equal(getViewAnchor(wereld({ camYaw: undefined })).upYaw, 1, 'zonder camerahoek telt de eigen richting');
assert.equal(getViewAnchor(wereld({ camYaw: NaN })).upYaw, 1, 'NaN camerahoek: de eigen richting');
assert.equal(getViewAnchor(wereld({}, body({ swimming: true }))).kind, 'zwemmen');
assert.equal(getViewAnchor(null), null);
assert.equal(getViewAnchor({}), null);
assert.equal(getViewAnchor(wereld({ lokaalLichaam: body({ x: 99 }) })).x, 99, 'het lichaam van dit apparaat gaat voor (samen spelen)');

// voertuigen: plek en rijrichting komen van het voertuig, de camera mag meekijken (auto, boot, fiets) of niet (heli, vliegtuig)
const veh = (o) => body({ inVehicle: { x: 50, y: 60, z: 3, angle: -2, ...o } });
for (const [vlag, kind, upIsHeading] of [[{}, 'auto', false], [{ isBoat: true }, 'boot', false], [{ isBike: true }, 'fiets', false], [{ isScooter: true }, 'fiets', false],
  [{ _mount: 'horse' }, 'paard', false], [{ isHeli: true }, 'heli', true], [{ isPlane: true }, 'vliegtuig', true]]) {
  a = getViewAnchor(wereld({}, veh(vlag)));
  assert.equal(a.kind, kind, kind);
  assert.deepEqual([a.x, a.y, a.z, a.heading], [50, 60, 3, -2], kind + ': plek en richting van het voertuig, niet van het lichaam');
  assert.equal(a.upYaw, upIsHeading ? -2 : 2, kind + ': kaartrichting');
  assert.equal(vehicleKind(veh(vlag).inVehicle), kind);
}
assert.equal(vehicleKind(null), 'voet');
a = getViewAnchor(wereld({}, body({ x: 1, y: 2, angle: 0.5, inVehicle: { x: NaN, y: NaN, angle: NaN, isBoat: true } })));
assert.deepEqual([a.x, a.y, a.heading], [1, 2, 0.5], 'een voertuig met NaN valt terug op het lichaam');

// de duif: richting van de duif, nooit de camera; in de intro nog bij het lichaam
a = getViewAnchor(wereld({ pigeonMode: true }, body({ angle: 0.7 })));
assert.deepEqual([a.kind, a.heading, a.upYaw], ['duif', 0.7, 0.7]);
a = getViewAnchor(wereld({ pigeonMode: true }), { pigeon: { x: 300, y: 400, z: 30, yaw: -1.2, intro: false } });
assert.deepEqual([a.kind, a.x, a.y, a.z, a.heading, a.upYaw], ['duif', 300, 400, 30, -1.2, -1.2]);
a = getViewAnchor(wereld({ pigeonMode: true }), { pigeon: { x: 300, y: 400, z: 30, yaw: -1.2, intro: true } });
assert.deepEqual([a.x, a.y], [10, 20], 'duifintro: het lichaam is nog de plek');
assert.equal(getViewAnchor(wereld({ pigeonMode: true }, veh({}))).kind, 'duif', 'duif gaat voor voertuig');

// de trein: de wagenhoek (cabine en meerijden), te voet in de wagon het lichaam
a = getViewAnchor(wereld({ trainDriving: {}, trainCam: { angle: 2.5 } }, body({ angle: 0.1 })));
assert.deepEqual([a.kind, a.heading, a.upYaw], ['trein', 2.5, 2.5]);
a = getViewAnchor(wereld({ trainCam: { angle: -1 } }, body({ angle: 0.1 })));
assert.deepEqual([a.kind, a.heading], ['trein', -1], 'meerijden zonder trainDriving (stationtravel.js)');
a = getViewAnchor(wereld({ trainDriving: {}, trainWalk: { car: 0 }, trainCam: { angle: 2.5 } }, body({ angle: 0.1 })));
assert.equal(a.heading, 0.1, 'rondlopen in de wagon: het lichaam kijkt zelf');
assert.equal(a.upYaw, 0.1);
assert.equal(getViewAnchor(wereld({ trainDriving: {} }, body({ angle: 0.3 }))).heading, 0.3, 'trein zonder camproxy: het lichaam');

// heli-run en scenecamera: de camera (cameraOverride) zegt niets over jou, dus de kaart tolt niet met een filmstand
const heli = { x: 5, y: 6, z: 70, angle: 0.4, isHeli: true };
a = getViewAnchor(wereld({ heliRun: true, camYaw: 3, cameraOverride: { position: {} } }, body({ inVehicle: heli })));
assert.deepEqual([a.kind, a.heading, a.upYaw, a.camera], ['heli', 0.4, 0.4, true]);
a = getViewAnchor(wereld({ cameraOverride: {} }, body({ angle: 1.1 })));
assert.deepEqual([a.kind, a.upYaw, a.camera], ['voet', 1.1, true], 'fotomodus of scene te voet: eigen richting, niet de camerahoek');
a = getViewAnchor(wereld({ cameraOverride: {} }, veh({ angle: 0.9 })));
assert.equal(a.upYaw, 0.9, 'scene in een auto: rijrichting');

// kaartdraaiing: beide standen van de instelling "noorden boven"
const A = { upYaw: 0.8 };
assert.equal(mapUpRotation(A, false), -PI / 2 - 0.8, 'draait mee: upYaw omhoog');
assert.equal(mapUpRotation(A, true), 0, 'noorden boven: geen draaiing');
assert.equal(mapUpRotation(null, false), 0);
assert.equal(mapUpRotation({ upYaw: NaN }, false), 0);
// de driehoek op het scherm (heading + draaiing) wijst omhoog als heading = upYaw (duif, heli, trein)
for (const k of [{ pigeonMode: true }, { trainCam: { angle: 1.3 } }]) {
  const an = getViewAnchor(wereld(k, body({ angle: 1.3 })));
  assert.ok(Math.abs(wrapAngle(an.heading + mapUpRotation(an, false) + PI / 2)) < 1e-9, 'de driehoek staat rechtop op de meedraaiende kaart');
}
// noorden boven: de driehoek draait met de wereldhoek
a = getViewAnchor(wereld({ pigeonMode: true }, body({ angle: 0.6 })));
assert.equal(a.heading + mapUpRotation(a, true), 0.6);

// wissel van soort: geen sprong, kortste weg, nooit NaN
const st = { heading: null, kind: null, t: 0 };
const duif = getViewAnchor(wereld({ pigeonMode: true }, body({ angle: 3.0 })));
const voet = getViewAnchor(wereld({}, body({ angle: -3.0 })));
assert.equal(easeAnchor(st, duif, 0.016).heading, 3.0, 'eerste aanroep: meteen goed');
assert.equal(easeAnchor(st, duif, 0.016).heading, 3.0, 'zelfde soort: ongewijzigd');
let h = easeAnchor(st, voet, 0.016).heading; // 3,0 naar -3,0 is 0,283 rad over de rand van pi, niet 6 rad de lange kant
assert.ok(Math.abs(wrapAngle(h - 3.0)) < 0.3, 'korte weg over de rand van pi');
let vorig = h;
for (let i = 0; i < 60; i++) { h = easeAnchor(st, voet, 0.016).heading; assert.ok(Number.isFinite(h)); assert.ok(Math.abs(wrapAngle(h - vorig)) < 0.3, 'geen sprong'); vorig = h; }
assert.ok(Math.abs(wrapAngle(h - voet.heading)) < 1e-6, 'na een tel is de richting aangekomen');
// 180 graden: geen sprong
const s2 = { heading: null, kind: null, t: 0 };
easeAnchor(s2, getViewAnchor(wereld({}, body({ angle: 0 }))), 0.016);
const eerste = easeAnchor(s2, getViewAnchor(wereld({ pigeonMode: true }, body({ angle: PI }))), 0.016).heading;
assert.ok(Math.abs(wrapAngle(eerste)) < 1.0, 'een wissel van 180 graden begint zacht: ' + eerste);
// ongeldige dt of NaN-stand
const s3 = { heading: NaN, kind: 'voet', t: 0 };
assert.ok(Number.isFinite(easeAnchor(s3, duif, NaN).heading));
assert.equal(easeAnchor({ heading: 1, kind: 'x', t: 0 }, null, 0.1), null);
for (const w of [wereld({ pigeonMode: true }, body({ angle: NaN, x: NaN })), wereld({ trainCam: { angle: NaN } }, body({ angle: Infinity }))]) {
  const an = getViewAnchor(w);
  assert.ok(['x', 'y', 'z', 'heading', 'upYaw'].every((k) => Number.isFinite(an[k])), 'NaN-vrij');
}

// aansluiting: de HUD en de grote kaart lezen jij alleen nog via de kijkanker, niet meer los uit camYaw of pigeonMode
const src = (f) => readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
const hud = src('hud_panel.js'), kaart = src('mapview.js');
assert.ok(/getViewAnchor\(world, \{ body \}\)/.test(hud) && /mapUpRotation\(anchor, northUp\(st\.minimapNorth, mmMode\)\)/.test(hud), 'minimap draait via de kijkanker');
assert.ok(/easeAnchor\(mmEase/.test(hud), 'minimap: zachte overgang');
assert.ok(!/world\.pigeonMode \? [a-zA-Z]+\.angle : world\.camYaw/.test(hud), 'geen eigen camYaw- of duifkeuze meer in hud_panel.js');
assert.ok(!/const ik = hoofdspeler\(world\)/.test(kaart) && /jijVan\(world\)/.test(kaart), 'grote kaart: jij via de kijkanker');
console.log('viewanchor_test: ok');
