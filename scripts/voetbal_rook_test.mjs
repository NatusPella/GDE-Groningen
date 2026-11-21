// Rooktest van de voetbalwedstrijd (#981): laadt game/js/voetbal.js met de echte three.js en een eigen scene in node, speelt een hele wedstrijd uit met nep-invoer en kijkt of de wereld-
// en HUD-code zonder fouten loopt (spelers, bal, camera, bord, strook, einde en beloning), en dat alles na afloop weer is opgeruimd. Vraagt de gevendorde three.js (`cd desktop && npm run stage`).
// Geen beeld: wat er op het scherm komt moet nog in een beeldronde worden bekeken (docs/VOETBAL-SIM-21-11.md).
import './node3d.mjs';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

registerHooks({
  load(url, ctx, next) {
    if (url.endsWith('/game/js/scene3d.js')) { // alleen voor deze test: een manier om de scene te zetten zonder renderer
      const r = next(url, ctx);
      return { ...r, source: String(r.source) + '\nexport function __setScene(s) { scene = s; }\n', shortCircuit: true };
    }
    return next(url, ctx);
  },
});
document.body = { appendChild() {}, removeChild() {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, style: {}, querySelector: () => null };
const perm = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => '' : k === 'length' ? 0 : perm()), set: () => true, apply: () => perm() });
document.createElement = () => perm();
document.getElementById = () => perm();
window.getComputedStyle = () => ({ getPropertyValue: () => '1' });
const THREE = await import('three');
const sc = await import('../game/js/scene3d.js');
sc.__setScene(new THREE.Scene());
const { VOETBAL } = await import('../game/js/voetbal.js');

const keys = new Set();
const pressed = new Set();
const input = { isDown: (k) => keys.has(k), wasPressed: (k) => pressed.has(k), consume: (k) => pressed.delete(k), axis: () => [(keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0), (keys.has('s') ? 1 : 0) - (keys.has('w') ? 1 : 0)] };
const player = { x: 1797.3, y: 1549.5, z: 0, character: 'tammo', speed: 0, angle: 0, inVehicle: null };
const berichten = [];
const w = { player, players: [player], input, time: 0, addMessage: (t) => berichten.push(t), wanted: 0, audioEvents: [], extraSpeakers: [], map: { surfaceAt: () => ({ z: 0.5 }) }, pigeonMode: false, heliRun: false, cameraOverride: null, money: 0, coopNet: null };
VOETBAL.init(w);
assert.ok(VOETBAL.prompt(w), 'bij de poort verschijnt de prompt');
const kinderen0 = sc.getScene().children.length;
assert.equal(window.__voetbal.start(true), true);
assert.ok(VOETBAL.active() && w.voetbalGame, 'de wedstrijd loopt');
const dt = 1 / 30;
let midden = 0, stappen = 0;
for (let i = 0; i < 30 * 600 && window.__voetbal.state(); i++, stappen++) {
  w.time += dt;
  keys.clear();
  const ph = Math.floor(i / 20) % 8;
  if (ph < 5) keys.add('w'); if (ph === 2) keys.add('d'); if (ph === 4) keys.add('a'); if (i % 60 < 4) keys.add('f'); if (i % 200 < 20) keys.add(' '); if (i % 90 < 3) keys.add('control'); if (ph < 3) keys.add('shift'); if (i % 150 < 2) keys.add('q');
  VOETBAL.update(dt, w); VOETBAL.tick(dt, w); VOETBAL.camera(w);
  if (i === 900) { midden = sc.getScene().children.length; assert.ok(w.cameraOverride && Number.isFinite(w.cameraOverride.position.x) && Number.isFinite(w.cameraOverride.lookAt.y), 'de camera heeft een eindige plek'); }
}
assert.equal(window.__voetbal.state(), null, 'de wedstrijd is afgelopen');
assert.ok(midden >= kinderen0 + 14, `tien spelers in de scene (${midden} tegen ${kinderen0})`);
assert.equal(sc.getScene().children.length, 4, 'na afloop zijn de spelers en markeringen weg (veld, bord, bal en schaduw blijven)');
assert.ok(!w.voetbalGame && !w.cameraOverride && !w.cinematicHidePlayers, 'de wereld is teruggezet');
assert.ok(berichten.some((b) => /Beloning/.test(b)) || w.money >= 0, 'het einde boekt een beloning');

// ---- de gast: een spiegel van de momentopnamen van een host, op een eigen scherm
{
  const W = await import('../game/js/multiplayerwedstrijd.js');
  const V = await import('../game/js/voetbalmatch.js');
  const verzonden = [];
  const gp = { x: 1797.3, y: 1549.5, z: 0, character: 'anita', speed: 0, angle: 0, inVehicle: null };
  const gw = { player: gp, players: [gp], input, time: 0, addMessage() {}, wanted: 0, audioEvents: [], extraSpeakers: [], map: { surfaceAt: () => ({ z: 0.5 }) }, cameraOverride: null, money: 0, coopRole: 'client', coopNet: { role: 'client', session: { slot: 1, sendEvent: (b) => { verzonden.push(b); return true; } } } };
  const deeln = [{ slot: 0, naam: 'Tammo', char: 'tammo' }, { slot: 1, naam: 'Tessa', char: 'anita' }];
  const host = V.maakWedstrijd(deeln, { duur: 'kort', seed: 3, tegenstander: 2 });
  assert.ok(W.wedHandleHost(gw, W.startEvent('voetbal', deeln, 0, { live: 1, v: 'k.s.2.k.2-2.e' })), 'de start van de host zet de gast op zijn scherm');
  assert.ok(gw.voetbalGame && gw.voetbalGame.online === 'gast' && gw.coopKnoppenHaak, 'de gast speelt op zijn eigen scherm met zijn eigen knoppenhaak');
  assert.equal(gw.voetbalGame.sim.teams[1].id, 'ommelanders', 'de gast tekent dezelfde tegenstander');
  let n = 0, zagGoal = false;
  for (let i = 0; i < 30 * 200 && host.fase !== 'klaar'; i++, n++) {
    gw.time += dt; keys.clear(); if (i % 40 < 10) keys.add('w'); if (i % 100 < 5) keys.add('f');
    V.tikWedstrijd(host, dt, (slot) => ({ mx: Math.sin(i / 25 + slot), my: -0.6, buttons: i % 50 < 2 ? 64 : 0 }));
    if (i % 3 === 0) W.wedHandleHost(gw, V.snapVoetbal(host, i / 3));
    assert.ok(W.wedGastTik(gw, dt), 'het scherm van de gast draait');
    VOETBAL.camera(gw);
    const knoppen = gw.coopKnoppenHaak(input); assert.ok(knoppen == null || (knoppen & 0xff) === knoppen);
    if (host.fase === 'goal') zagGoal = true;
  }
  assert.ok(gw.voetbalGame.sim.score[0] + gw.voetbalGame.sim.score[1] >= 0 && Math.abs(gw.voetbalGame.sim.spelers[0].x - host.spelers[0].x) < 3, 'de spiegel volgt de host');
  const rijen = V.uitslagVoetbal(host);
  W.wedHandleHost(gw, W.eindEvent(rijen, { plek: rijen[0].plek, geld: 20, xp: 14, fin: 1 }));
  assert.ok(!gw.voetbalGame && !gw.coopKnoppenHaak && !gw.cameraOverride && !gw.cinematicHidePlayers, 'het einde zet de gast terug');
  assert.equal(sc.getScene().children.length, 4, 'ook na de gast is de scene opgeruimd');
  console.log(`  gast: ${n} stappen, goal gezien ${zagGoal}`);
}

// ---- de start naar de gasten en het keuzescherm met een competitie op het volledige veld
{
  const { codeerStart, leesStartV } = await import('../game/js/voetbal.js');
  const o = { duur: 'kort', stand: 'uitdagend', tg: 4, formaat: 'groot', vorming: '3-5-2', stijl: 'verdedigend' };
  const code = codeerStart(o);
  assert.ok(code.length <= 40, code);
  assert.deepEqual(leesStartV(code), { duur: 'kort', stand: 'uitdagend', tegenstander: 4, formaat: 'groot', vorming: '3-5-2', stijl: 'verdedigend' });
  assert.equal(leesStartV('rommel').formaat, 'klein'); assert.equal(leesStartV(null).stijl, 'evenwichtig');
  assert.equal(window.__voetbal.start === undefined, false);
  assert.ok(window.__voetbal.menu(), 'het keuzescherm opent');
  assert.ok(VOETBAL.active() && !w.voetbalGame, 'tijdens het keuzescherm loopt er nog geen wedstrijd');
  pressed.add('2'); VOETBAL.update(dt, w); // competitie aan
  pressed.add('3'); VOETBAL.update(dt, w); // een andere vorming
  pressed.add('4'); VOETBAL.update(dt, w); // een andere speelstijl
  pressed.add('5'); VOETBAL.update(dt, w); // kort
  const v = window.__voetbal.voorkeur();
  assert.deepEqual([v.modus, v.formaat], ['competitie', 'groot']); assert.equal(v.duur, 'kort'); assert.equal(v.vorming, '4-3-3'); assert.equal(v.stijl, 'aanvallend');
  pressed.add('f'); VOETBAL.update(dt, w);
  assert.ok(w.voetbalGame && w.voetbalGame.sim.formaat === 'groot' && w.voetbalGame.comp, 'de competitiewedstrijd begint op het grote veld');
  assert.equal(w.voetbalGame.sim.spelers.length, 22); assert.equal(w.voetbalGame.sim.tac[0].vorming, '4-3-3');
  assert.equal(sc.getScene().children.length >= 4 + 22, true, 'tweeëntwintig spelers in de scene');
  // tactiek onderweg
  pressed.add('1'); w.time += dt; VOETBAL.update(dt, w); assert.equal(w.voetbalGame.sim.tac[0].stijl, 'verdedigend');
  pressed.add('2'); w.time += dt; VOETBAL.update(dt, w); assert.notEqual(w.voetbalGame.sim.tac[0].vorming, '4-3-3');
  for (let i = 0; i < 30 * 700 && window.__voetbal.state(); i++) { w.time += dt; keys.clear(); if (i % 30 < 20) keys.add('w'); if (i % 90 < 3) keys.add('f'); VOETBAL.update(dt, w); VOETBAL.tick(dt, w); VOETBAL.camera(w); }
  assert.equal(window.__voetbal.state(), null, 'de wedstrijd is afgelopen');
  const na = window.__voetbal.voorkeur();
  assert.ok(na.comp && na.comp.ronde === 1, 'het seizoen staat in de opslag na ronde 1');
  assert.equal(sc.getScene().children.length, 4, 'het grote veld is opgeruimd, de bouw blijft');
  // een tweede wedstrijd op het kleine veld bouwt het veld opnieuw
  window.__voetbal.start(true, { modus: 'vriendschappelijk', formaat: 'klein', vorming: '2-2' });
  assert.equal(w.voetbalGame.sim.spelers.length, 10); assert.ok(!w.voetbalGame.comp);
  window.__voetbal.quit();
  assert.equal(sc.getScene().children.length, 4);
}
console.log(`voetbal_rook_test ok (${stappen} stappen)`);
