// #959: over sommige objecten kon je niet heen springen of erop klimmen. Een hooibaal
// (rond, 1,5 m) en een vaste kist met een bovenkant lieten je niet over of erop:
// vaultDecision kende alleen `top` voor voertuigdaken. Nu klimt een speler op een vast
// voorwerp tot LEDGE_MAX_H (2,2 m), staat erop, loopt eroverheen en stapt er weer af;
// hoger (een container van 2,6 m) blijft een muur. Dit draait de echte Player.
//   node scripts/vault_ledge_test.mjs
import './node3d.mjs';
import { vaultDecision, ledgeOfSolid, ledgeOfProp, ledgeSpot, onLedge, LEDGE_MAX_H, VAULT_MAX_H } from '../game/js/vaultkit.js';
import { baleSolid, BALE_HEIGHT, BALE_RADIUS } from '../game/js/bales.js';
import { setTileSolids, clearTileSolids, solidAhead, pushOutOfSolids } from '../game/js/countrywalls.js';

const { Player } = await import('../game/js/player.js');
const { addStaticCollider, removeProp } = await import('../game/js/breakables.js');

let n = 0, fails = 0;
const check = (name, ok, extra = '') => { n++; if (!ok) { fails++; console.log('FAIL', name, extra); } else console.log('ok  ', name); };

// ---- de regel ----------------------------------------------------------------------
check('een baal (1,5 m) is te hoog om over te stappen', vaultDecision(BALE_HEIGHT) === 'block');
check('maar met een vlakke bovenkant klim je erop', vaultDecision(BALE_HEIGHT, { ledge: true }) === 'ledge');
check('tot LEDGE_MAX_H', vaultDecision(LEDGE_MAX_H, { ledge: true }) === 'ledge');
check('een container (2,6 m) blijft te hoog', vaultDecision(2.6, { ledge: true }) === 'block');
check('laag blijft gewoon over te stappen', vaultDecision(1.0, { ledge: true }) === 'vault');
check('is de overkant dicht, dan klim je erop', vaultDecision(1.0, { ledge: true, landing: { blocked: true } }) === 'ledge');
check('een voertuigdak blijft een klim, geen ledge', vaultDecision(1.45, { top: true, ledge: true }) === 'climb');
check('de grens ligt boven het overstapbare', LEDGE_MAX_H > VAULT_MAX_H);

// ---- de vorm -------------------------------------------------------------------------
{
  const L = ledgeOfSolid(10, 0, 0.95, 1.5);
  check('midden en rand van een ronde ledge', onLedge(L, 10, 0) && onLedge(L, 10.9, 0) && !onLedge(L, 11.2, 0));
  const spot = ledgeSpot(L, 8.5, 0);
  check('de landingsplek ligt op de ledge, aan de kant van waaruit je klimt', onLedge(L, spot.x, spot.y) && spot.x < 10 && Math.hypot(spot.x - 10, spot.y) <= L.r - 0.4);
  const K = ledgeOfProp({ x: 0, y: 0, hx: 0, hy: 4, r: 1.2, h: 1.8 });
  const ks = ledgeSpot(K, 3, 2);
  check('langwerpig: de plek ligt bij de dichtstbijzijnde plek van de lengteas', onLedge(K, ks.x, ks.y) && Math.abs(ks.y - 2) < 1e-9 && ks.x > 0 && ks.x < 1.2);
  check('ook midden erboven geeft een plek op de ledge', (() => { const s = ledgeSpot(L, 10, 0); return onLedge(L, s.x, s.y); })());
}

// ---- de speler -----------------------------------------------------------------------
function makeMap() {
  return {
    waterNear: () => [], water: [], greenNear: () => [], buildingNear: () => [], buildingsNear: () => [], roadsNear: () => [], roads: [],
    propsNear: () => [], isOnBridge: () => false, coveredAt: () => false,
  };
}
function makeInput() {
  const st = { down: new Set(), pressed: new Set(), ay: 0 };
  return {
    st, wasPressed: (k) => st.pressed.has(k), isDown: (k) => st.down.has(k), axis: () => [0, st.ay],
    lookActive: () => false, padAxis: [0, 0], mouse: { dx: 0, dy: 0, down: false, rightDown: false, wheel: 0 },
  };
}
function scene(x = 0, y = 0) {
  const p = new Player(x, y);
  p.angle = 0;
  const input = makeInput();
  const world = { input, map: makeMap(), vehicles: [], time: 0, camYaw: 0, audioEvents: [], pedestrians: [], companion: null, health: 100, armor: 0, ammo: {}, weapon: null, particles: [], addMessage() {} };
  return { p, world, input };
}
function step(s, count = 1, keys = {}) {
  for (let i = 0; i < count; i++) {
    s.input.st.ay = keys.fwd ? -1 : 0;
    s.input.st.pressed = new Set(i === 0 && keys.space ? [' '] : []);
    s.p.update(1 / 60, s.world);
    s.world.time += 1 / 60;
  }
}

// hooibaal in tegel (0,0) op (3, 0)
setTileSolids(0, 0, [baleSolid(3, 0)]);
check('de baal wordt recht vooruit gevonden, met zijn midden en straal', (() => { const a = solidAhead(1.2, 0, 1, 0, 1.05, 0.2); return a && Math.abs(a.cx - 3) < 1e-9 && a.rad === BALE_RADIUS && a.h === BALE_HEIGHT && a.dist < 1; })());
check('naast de baal is er niets', solidAhead(1.2, 4, 1, 0, 1.05, 0.2) === null);

{
  const s = scene(1.2, 0);
  step(s, 2, { space: true });
  check('Spatie voor een baal: een klim, geen sprong op de plek', !!(s.p.vault && s.p.vault.ledge), JSON.stringify(s.p.vault && { ledge: !!s.p.vault.ledge }));
  step(s, 60);
  const L = s.p.perch && s.p.perch.ledge;
  check('na de klim sta je op de baal', !!L && !s.p.vault, `perch=${!!s.p.perch}`);
  check('op 1,5 m hoogte', Math.abs(s.p.gz + s.p.z - BALE_HEIGHT) < 1e-9, `z=${s.p.z.toFixed(3)}`);
  check('binnen de omtrek van de baal', !!L && onLedge(L, s.p.x, s.p.y) && Math.hypot(s.p.x - 3, s.p.y) < BALE_RADIUS);
  const x = s.p.x;
  step(s, 60);
  check('zonder toetsen blijf je staan', !!s.p.perch && Math.abs(s.p.x - x) < 1e-9);
  // de baal over: vooruit lopen tot je er aan de andere kant afstapt en op de grond staat
  let off = -1;
  for (let i = 0; i < 300; i++) { step(s, 1, { fwd: true }); if (!s.p.perch) { off = i; break; } }
  check('over de rand lopen: je stapt van de baal af', off >= 0);
  step(s, 120, { fwd: false });
  check('en komt op de grond terecht, voorbij de baal', s.p.z === 0 && s.p.x > 3 + BALE_RADIUS - 0.2, `x=${s.p.x.toFixed(2)} z=${s.p.z.toFixed(2)}`);
  check('zonder gevallen te zijn (geen schade)', s.world.health === 100);
}
{
  // Spatie op de baal is een afstapje
  const s = scene(1.2, 0);
  step(s, 2, { space: true });
  step(s, 60);
  let top = 0;
  for (let i = 0; i < 40; i++) { step(s, 1, { space: i === 0 }); top = Math.max(top, s.p.z); }
  check('Spatie op de baal: een afstapje, geen sprong', top - BALE_HEIGHT < 0.25, `stijging=${(top - BALE_HEIGHT).toFixed(3)}`);
  step(s, 120);
  check('en daarna sta je op de grond naast of op de baal, zonder schade', (!!s.p.perch || s.p.z === 0) && s.world.health === 100, `z=${s.p.z.toFixed(2)}`);
}
{
  // ernaast: niets
  const s = scene(1.2, 5);
  step(s, 2, { space: true });
  check('ernaast: een gewone sprong', !s.p.vault);
}
{
  // een springende of staande speler boven de baal wordt niet teruggeduwd
  const bale = { x: 3.4, y: 0 };
  check('hoog genoeg boven een baal word je niet uit de baal geduwd', pushOutOfSolids({ ...bale }, 0.35, 1.5) === false);
  check('op de grond wel', pushOutOfSolids({ ...bale }, 0.35, 0) === true);
  check('een lage sprong (0,6 m) komt er niet overheen', pushOutOfSolids({ ...bale }, 0.35, 0.6) === true);
}
clearTileSolids(0, 0);

// ---- vaste voorwerpen met een bovenkant (kist, container) -------------------------------
{
  const kist = addStaticCollider('kist', 20, 0, 0.7, 0.5, 0, false, 1.8);
  const s = scene(18.3, 0);
  step(s, 2, { space: true });
  check('een vaste kist van 1,8 m: erop klimmen', !!(s.p.vault && s.p.vault.ledge), s.p.vault ? 'vault zonder ledge' : 'geen vault');
  step(s, 60);
  check('en erop staan op 1,8 m', !!s.p.perch && !!s.p.perch.ledge && Math.abs(s.p.gz + s.p.z - 1.8) < 1e-9, `z=${s.p.z.toFixed(2)}`);
  removeProp(kist);
}
{
  const bak = addStaticCollider('container', 40, 0, 1.2, 6, Math.PI / 2, false, 2.6);
  const s = scene(38.5, 0);
  step(s, 2, { space: true });
  check('een container van 2,6 m is te hoog: geen klim', !s.p.vault);
  removeProp(bak);
}
{
  const rol = addStaticCollider('kabelrol', 60, 0, 0.6, 0, 0, false, 1.0);
  const s = scene(58.4, 0);
  step(s, 2, { space: true });
  check('een lage vaste rol van 1,0 m: er gewoon overheen', !!s.p.vault && !s.p.vault.ledge, s.p.vault ? 'ledge' : 'geen vault');
  removeProp(rol);
}

console.log(fails ? `${fails} failed` : `all ${n} passed`);
process.exit(fails ? 1 : 0);
