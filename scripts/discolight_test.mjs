// Disco-zwaailicht en Spiegelstad (#61): de kleurkeuze (game/js/discolight.js) en de schakelaars in cheats.js.
//   node scripts/discolight_test.mjs
import './node3d.mjs';
await import('../game/js/mapdata.js');
await import('../game/js/player.js');
const { discoHue, discoPulse, updateDiscoLamp, DISCO_PERIOD } = await import('../game/js/discolight.js');
const { initCheats, setCheat, updateCheats } = await import('../game/js/cheats.js');
const { MODS } = await import('../game/js/cheatmods.js');
const THREE = await import('three');

let n = 0, fails = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL ' + name); } };

// de tint: 0..1, loopt rond, elk voertuig begint ergens anders
for (let id = 0; id < 20; id++) for (let t = 0; t < 10; t += 0.37) { const h = discoHue(t, id); if (!(h >= 0 && h < 1)) ok(false, `tint ${h} buiten 0..1`); }
ok(Math.abs(discoHue(0.5, 3) - discoHue(0.5 + DISCO_PERIOD, 3)) < 1e-9, 'na een ronde dezelfde tint');
const verschil = new Set(Array.from({ length: 12 }, (_, id) => discoHue(0, id).toFixed(2)));
ok(verschil.size >= 10, 'voertuigen hebben een eigen begintint (' + verschil.size + ')');
let beweegt = 0, vorige = discoHue(0, 1);
for (let t = 0.1; t < DISCO_PERIOD; t += 0.1) { const h = discoHue(t, 1); if (Math.abs(h - vorige) > 1e-6) beweegt++; vorige = h; }
ok(beweegt > 15, 'de tint schuift steeds op');
for (let t = 0; t < 5; t += 0.05) { const p = discoPulse(t, 2); if (!(p >= 0.35 && p <= 1.0001)) ok(false, 'pulse ' + p); }
ok(discoPulse(0, 0) !== discoPulse(0.3, 0), 'de glans knippert');
ok(Number.isFinite(discoHue(NaN, 1)) === false || true, 'rare tijd laat niets crashen');

// het lampje op een mesh: aan maakt hem, uit verbergt hem, een boot krijgt er geen
const mesh = () => new THREE.Group();
const auto = { id: 7, model: { name: 'sedan' } };
let m = mesh();
updateDiscoLamp(m, auto, 1, true);
ok(m.userData.disco && m.userData.disco.group.visible && m.children.length === 1, 'aan: een lampje op het dak');
ok(m.userData.disco.group.position.y > 1.5, 'het lampje zit boven het dak');
const c1 = m.userData.disco.mat.color.getHex();
updateDiscoLamp(m, auto, 1.5, true);
ok(m.userData.disco.mat.color.getHex() !== c1, 'de kleur verandert in de tijd');
updateDiscoLamp(m, auto, 2, false);
ok(!m.userData.disco.group.visible, 'uit: het lampje is verborgen');
updateDiscoLamp(m, auto, 3, true);
ok(m.userData.disco.group.visible && m.children.length === 1, 'weer aan: hetzelfde lampje, geen tweede');
m = mesh(); updateDiscoLamp(m, { id: 1, isBoat: true, model: {} }, 1, true);
ok(!m.userData.disco, 'een boot krijgt geen lampje');
m = mesh(); updateDiscoLamp(m, auto, 1, false);
ok(!m.userData.disco && m.children.length === 0, 'uit en nooit aan geweest: niets gemaakt');

// de schakelaars: cosmetisch (ook in een missie), en weer uit
const w = { player: { inVehicle: null, x: 0, y: 0 }, vehicles: [], clock: 12, wanted: 0, wantedDecayTimer: 0, health: 100, ammo: {}, weather: { active: false }, addMessage() {}, time: 0 };
initCheats(w);
ok(setCheat('disco', true) && setCheat('spiegelstad', true), 'beide zijn vanaf het begin te kiezen');
updateCheats(0.016, w);
ok(MODS.disco === true && MODS.mirror === true, 'MODS.disco en MODS.mirror staan aan');
setCheat('disco', false); setCheat('spiegelstad', false);
updateCheats(0.016, w);
ok(MODS.disco === false && MODS.mirror === false, 'uit: alles terug');
ok(setCheat('trekkerlimo', true), 'de trekker-limo is te kiezen');
setCheat('trekkerlimo', false);

console.log(`${n - fails}/${n} checks passed`);
process.exit(fails ? 1 : 0);
