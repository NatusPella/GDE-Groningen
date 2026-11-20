// Weer, zomerambiance, onweer en autolussen met opnames (#988, ADR 0039): de sturing in sfx/weermap.js (kruisfade tussen motregen, bui en plensbui,
// binnen en buiten, zomerlagen overdag, donder op afstand), de drift- en motorlus (sfx/samples.js, audio.js) en de bestanden (naad, niveau, lengte,
// altijd zomer). Pure logica, zonder Web Audio.
//   node scripts/weer_sfx_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rainLayers, rainTargets, summerTargets, thunderPick, RAIN_KEYS, THUNDER_NEAR, THUNDER_FAR, RAIN_PEAKS } from '../game/js/sfx/weermap.js';
// ambience.js laadt three.js: zonder gestagede vendor-map (cd desktop && npm run stage) slaan we alleen de scenario's met de nagemaakte kit over
let initAmbience = null, updateAmbience = null;
try { await import('./node3d.mjs'); ({ initAmbience, updateAmbience } = await import('../game/js/sfx/ambience.js')); } catch (e) { console.log('overgeslagen: ambience-scenarios (' + String(e.message).slice(0, 60) + ')'); }
import { SAMPLE_INFO, DRIFT_SLIP, driftLoopNiveau, driftLoopRate } from '../game/js/sfx/samples.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };

// -- regen: kruisfade op de intensiteit ----------------------------------------------------------------------------------
const L = (r) => rainLayers(r, {});
ok(L(0).licht === 0 && L(0).bui === 0 && L(0).plens === 0, 'geen regen: alle lagen stil');
ok(L(RAIN_PEAKS[0]).licht > 0.999 && L(RAIN_PEAKS[1]).bui > 0.999 && L(RAIN_PEAKS[2]).plens > 0.999, 'elke laag heeft zijn eigen top');
ok(L(1).plens === 1 && L(1).licht === 0 && L(1).bui === 0, 'volle regen: alleen de plensbui');
{
  let max = 0, minPow = 9, maxPow = 0, prev = { ...L(0.2) };
  for (let r = 0.2; r <= 1.0001; r += 0.01) {
    const a = L(r), p = a.licht ** 2 + a.bui ** 2 + a.plens ** 2;
    minPow = Math.min(minPow, p); maxPow = Math.max(maxPow, p);
    max = Math.max(max, Math.abs(a.licht - prev.licht), Math.abs(a.bui - prev.bui), Math.abs(a.plens - prev.plens));
    prev = { ...a };
  }
  ok(minPow > 0.98 && maxPow < 1.02, `kruisfades houden het vermogen gelijk (${minPow.toFixed(3)} tot ${maxPow.toFixed(3)})`);
  ok(max < 0.1, `geen sprongen bij een regenstap van 0,01 (${max.toFixed(3)})`);
}
ok(L(0.1).licht < L(0.2).licht && L(0.35).licht > L(0.5).licht && L(0.5).bui > L(0.35).bui && L(0.7).plens > L(0.5).plens, 'motregen eerst, dan bui, dan plensbui');
ok(Number.isFinite(L(NaN).licht) && Number.isFinite(L(-1).bui) && L(5).plens === 1, 'rare waarden blijven eindig');

// -- binnen en buiten ------------------------------------------------------------------------------------------------------
const buiten = rainTargets(0.5, {}, 1, {}), auto = rainTargets(0.5, { closed: true }, 1, {}), flat = rainTargets(0.5, { indoors: true }, 1, {});
ok(buiten.bui > 0.1 && buiten.auto === 0 && buiten.dak === 0, 'buiten: de buitenlussen, geen dak of auto');
ok(auto.bui < buiten.bui * 0.2 && auto.auto > 0.1 && auto.dak === 0, 'in een gesloten voertuig: buiten bijna weg, regen op de auto ervoor in de plaats');
ok(flat.bui < buiten.bui * 0.2 && flat.dak > 0.1 && flat.auto === 0, 'in de flat: regen op het dak');
ok(rainTargets(0.5, { closed: true }, 0.45, {}).auto < auto.auto, 'pauze dempt');
ok(rainTargets(0, { closed: true }, 1, {}).auto === 0, 'zonder regen ook geen regen op de auto');

// -- zomer: overdag, droog, groen of stad ----------------------------------------------------------------------------------
const park = { green: 0.8, trees: 0.6, density: 0.1, rural: 0, open: 0.1 }, stad = { green: 0, trees: 0, density: 0.9, rural: 0, open: 0 }, polder = { green: 0.2, trees: 0, density: 0, rural: 1, open: 1 };
const middag = summerTargets(13, 0, park, 1, 1, {}), nacht = summerTargets(2, 0, park, 1, 1, {}), regen = summerTargets(13, 0.8, park, 1, 1, {});
ok(middag.vogels > 0.05 && middag.insecten > 0.03, 'middag in het park: vogels en insecten');
ok(nacht.vogels === 0 && nacht.insecten === 0 && nacht.stadsvogels === 0, 'nacht: geen vogels of insecten');
ok(regen.vogels < middag.vogels * 0.3 && regen.insecten < middag.insecten * 0.3, 'regen dempt de zomerlagen');
ok(summerTargets(13, 0, park, 0.45, 1, {}).vogels < middag.vogels, 'in een gesloten voertuig zachter');
const st = summerTargets(13, 0, stad, 1, 1, {});
ok(st.stadsvogels > st.vogels && st.stadsvogels > 0.05, 'in de stad: stadsvogels, nauwelijks bosvogels');
ok(summerTargets(13, 0, polder, 1, 1, {}).insecten > 0.05, 'in de polder: insecten');
ok(summerTargets(6, 0, park, 1, 1, {}).insecten < summerTargets(14, 0, park, 1, 1, {}).insecten, 'insecten komen later op dan vogels');
ok(summerTargets(7, 0, park, 1, 1, {}).vogels > 0, 'vogels in de ochtend');
for (const k of ['vogels', 'stadsvogels', 'insecten']) ok(Object.values({ middag, st }).every((o) => o[k] >= 0 && o[k] <= 0.35 && Number.isFinite(o[k])), `${k}: zacht en eindig`);

// -- donder ----------------------------------------------------------------------------------------------------------------
const dicht = thunderPick(300, 0.1, 0.5, {}), ver = thunderPick(3000, 0.9, 0.5, {}), midden = thunderPick(899, 0, 0, {}), net = thunderPick(900, 0, 0, {});
ok(THUNDER_NEAR.includes(dicht.key) && dicht.near && THUNDER_FAR.includes(ver.key) && !ver.near, 'dichtbij en ver: de juiste bestanden');
ok(midden.near && !net.near, 'de grens ligt op 900 m');
ok(Math.abs(dicht.delay - 300 / 343) < 0.01 && ver.delay === 7 && Math.abs(thunderPick(2000, 0, 0).delay - 2000 / 343) < 0.01 && thunderPick(9000, 0, 0).delay === 7 && thunderPick(10, 0, 0).delay === 0.3, 'vertraging: geluid doet 343 m/s, begrensd op 0,3 tot 7 s');
ok(ver.lp < dicht.lp && ver.gain < dicht.gain, 'verre donder is dof en zachter');
const bin = thunderPick(300, 0.1, 0.5, { closed: true });
ok(bin.lp < dicht.lp * 0.5 && bin.gain < dicht.gain, 'binnen is donder gedempt en zachter');
{
  const seen = new Set();
  for (let i = 0; i < 100; i++) seen.add(thunderPick(300, i / 100, 0.5).key);
  for (let i = 0; i < 100; i++) seen.add(thunderPick(3000, i / 100, 0.5).key);
  ok(seen.size === THUNDER_NEAR.length + THUNDER_FAR.length, 'alle donderbestanden komen aan bod');
  ok([0, 0.3, 0.6, 0.99].every((r) => { const t = thunderPick(2000, 0, r); return t.rate > 0.85 && t.rate < 1.1; }), 'kleine variatie in toonhoogte');
}

// -- drift en motor ---------------------------------------------------------------------------------------------------------
ok(driftLoopNiveau(DRIFT_SLIP) === 0 && driftLoopNiveau(1) === 1 && driftLoopNiveau(0.8) > driftLoopNiveau(0.7), 'driftlus: niveau groeit met de slip');
ok(driftLoopRate(0.9, 20) > driftLoopRate(0.65, 5) && driftLoopRate(5, 99) <= 1.3 && driftLoopRate(0, 0) >= 0.8, 'driftlus: toonhoogte volgt slip en snelheid, begrensd');

// -- de bestanden ----------------------------------------------------------------------------------------------------------
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'game', 'audio', 'sfx', 'manifest.json'), 'utf8')).geluiden;
const LUSSEN = ['regen_motregen', 'regen_bui', 'regen_plens', 'regen_dak', 'regen_auto', 'wind_gras', 'zomer_insecten', 'zomer_vogels', 'zomer_stadsvogels', 'band_drift', 'motor_auto_stationair'];
const KLANKEN = [...THUNDER_NEAR, ...THUNDER_FAR];
let bytes = 0;
for (const k of [...LUSSEN, ...KLANKEN]) {
  const m = man[k];
  ok(m, `${k}: staat in het manifest`);
  if (!m) continue;
  ok(SAMPLE_INFO[k], `${k}: heeft een regel in SAMPLE_INFO`);
  const f = path.join(ROOT, 'game', 'audio', 'sfx', m.bestand);
  ok(fs.existsSync(f), `${k}: bestand bestaat`);
  if (fs.existsSync(f)) bytes += fs.statSync(f).size;
  ok(m.niveau && m.niveau.piek_db <= -1 && m.niveau.piek_db >= -20, `${k}: niet clippend (${m.niveau && m.niveau.piek_db} dB piek)`);
  ok(!/sneeuw|ijs|vorst|winter|snow|ice|frozen/i.test(`${m.gebruik} ${m.herkomst.titel}`), `${k}: altijd zomer (geen winterbron)`);
}
for (const k of LUSSEN) {
  const m = man[k];
  if (!m) continue;
  ok(m.loop === true && m.naad, `${k}: is een naadloze lus met naadmeting`);
  ok(m.naad && m.naad.kruisfade_ms >= 150 && m.naad.kruisfade_ms <= 500, `${k}: kruisfade 150 tot 500 ms`);
  ok(m.naad && Math.abs(m.naad.niveaustap_db) <= 3 && m.naad.sprong_ratio <= 2, `${k}: naad zonder klik of niveausprong (${m.naad && m.naad.niveaustap_db} dB, x${m.naad && m.naad.sprong_ratio})`);
  ok(m.duur_s >= 2 && m.duur_s <= 32, `${k}: lengte van een lus (${m.duur_s} s)`);
}
for (const k of RAIN_KEYS) ok(man[k] && man[k].loop, `${k}: regenlus`);
for (const k of KLANKEN) ok(man[k] && man[k].loop === false && man[k].duur_s <= 14, `${k}: eenmalige donderslag`);
ok(bytes < 3 * 1024 * 1024, `weer, zomer en onweer samen onder 3 MB (${Math.round(bytes / 1024)} kB)`);


// -- ambience.js met een nagemaakte kit: welke opname start bij welk weer ------------------------------------------------------
function scenario({ rain = 0, hour = 13, vehicle = null, have = true, secs = 14 }) {
  const mk = () => ({ gain: { value: 0, setTargetAtTime() {}, cancelScheduledValues() {} }, frequency: { value: 0, setTargetAtTime() {} }, connect(x) { return x; }, disconnect() {}, start() {}, stop() {}, playbackRate: { value: 1, setTargetAtTime() {} } });
  const names = new Set();
  const ctx = { currentTime: 0, createGain: mk, createBiquadFilter: mk, createBufferSource: () => { const s = mk(); const set = (b) => { s._b = b; names.add(b && b.name); }; Object.defineProperty(s, 'buffer', { set, get: () => s._b }); return s; } };
  const files = new Set(['regen_motregen', 'regen_bui', 'regen_plens', 'regen_dak', 'regen_auto', 'wind_gras', 'zomer_vogels', 'zomer_stadsvogels', 'zomer_insecten']);
  const kit = { ctx, bank: { get: (k) => ({ duration: 5, name: 'bank:' + k }), warm() {} }, samples: { has: (k) => have && files.has(k), buffer: (k) => (have && files.has(k) ? { duration: 8, name: k } : null) },
    buses: { amb: {}, sfx: {} }, muted: () => false, makePanner: () => mk(), setPannerPos() {}, spatial: () => null, buf() { return {}; }, duckAmb() {}, setReverb() {}, speech: () => 0, listener: { x: 0, y: 0, z: 0 }, dist: () => 0 };
  const green = [{ bounds: [-50, -50, 50, 50], pts: [[-50, -50], [50, -50], [50, 50], [-50, 50], [-50, -50]], kind: 'park' }];
  const map = { meta: {}, greenNear: () => green, treesNear: () => [{ x: 5, y: 5 }, { x: -5, y: 8 }, { x: 9, y: -9 }], buildingsNear: () => [], waterNear: () => [], roadsNear: () => [], isOnBridge: () => false };
  const world = { map, vehicles: vehicle ? [vehicle] : [], pedestrians: [], player: { x: 0, y: 0, vx: 0, vy: 0, inVehicle: vehicle }, weather: { intensity: rain, active: rain > 0 }, dayNight: { hour, night: hour < 6 || hour > 21 ? 1 : 0 }, paused: false, time: 0 };
  initAmbience(kit, world);
  for (let i = 0; i < secs * 20; i++) { ctx.currentTime += 0.05; updateAmbience(0.05, world); }
  return names;
}
if (initAmbience) {
  const licht = scenario({ rain: 0.15 }), bui = scenario({ rain: 0.5 }), plens = scenario({ rain: 0.95 }), droog = scenario({ rain: 0 });
  ok(licht.has('regen_motregen') && !licht.has('regen_plens') && !licht.has('bank:bed_rain'), 'ambience: lichte regen klinkt met de motregenlus, niet met de synth');
  ok(bui.has('regen_bui'), 'ambience: een bui met de builus');
  ok(plens.has('regen_plens') && !plens.has('regen_motregen'), 'ambience: een plensbui met de plenslus');
  ok(!droog.has('regen_motregen') && !droog.has('regen_bui') && !droog.has('regen_plens'), 'ambience: droog weer zonder regenlussen');
  ok(droog.has('zomer_vogels') && droog.has('zomer_insecten'), 'ambience: een droge middag in het park met vogels en insecten');
  ok(!scenario({ rain: 0, hour: 2 }).has('zomer_vogels'), 'ambience: nachts geen vogelbed');
  const auto = scenario({ rain: 0.6, vehicle: { x: 0, y: 0, speed: 0, model: { name: 'sedan' } } });
  ok(auto.has('regen_auto') && !auto.has('regen_dak'), 'ambience: in een auto regen op de auto');
  const zonder = scenario({ rain: 0.6, have: false });
  ok(zonder.has('bank:bed_rain') && ![...zonder].some((x) => /^regen_|^zomer_|^wind_gras/.test(x || '')), 'ambience: zonder opnames de procedurele lagen als terugval');
}

// -- de koppeling in de code ------------------------------------------------------------------------------------------------
const amb = fs.readFileSync(path.join(ROOT, 'game', 'js', 'sfx', 'ambience.js'), 'utf8'), aud = fs.readFileSync(path.join(ROOT, 'game', 'js', 'audio.js'), 'utf8');
for (const k of ['regen_motregen', 'regen_bui', 'regen_plens', 'regen_dak', 'regen_auto', 'wind_gras', 'zomer_vogels', 'zomer_stadsvogels', 'zomer_insecten']) ok(amb.includes(`'${k}'`), `ambience.js gebruikt ${k}`);
ok(/thunderPick\(/.test(amb) && /thunder_0/.test(amb), 'ambience.js speelt de opgenomen donder en houdt de synth als terugval');
ok(/motor_auto_stationair/.test(aud) && /band_drift/.test(aud) && /ENGINE_LAYER_ON/.test(aud), 'audio.js gebruikt de motor- en driftlus (met een schakelaar voor de motorlaag)');
ok(/bed_rain/.test(amb) && /bed_roof/.test(amb) && /bed_wind/.test(amb), 'de procedurele lagen blijven de terugval');

console.log(fails ? `${fails} van ${n} controles mislukt` : `ok: ${n} controles`);
process.exit(fails ? 1 : 0);
