// Fietsers met een Bluetooth-speakertje (#401) in het echte spel, zonder geluid (de graaf loopt in een gedempte uitgang):
//   GDE_GAME_DIR=<stage>\game GDE_TEST_PROFILE=gde-test-bikespk ELECTRON_EXE=... electron desktop --windowed --stil --audio-graph \
//     --smoke-test=<map>\bs.png --perf-script=scripts/bikespeaker_check.page.js
// Zet een NPC-fiets met een speakertje op 60 m van de speler, laat hem op 6 m/s langs rijden en leest elke 250 ms de stem uit
// window.__audio.state().bikeSpeakers: het record uit de bibliotheek, de afstand, de afspeelsnelheid (Doppler) en het volume.
// Daarna drie fietsen tegelijk (hooguit twee stemmen), en weg = de stem is opgeruimd. Logt "BIKESPEAKER CHECK PASS|FAIL ...".
const A = window.__audio;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = [];
let fails = 0;
const ok = (cond, name, info = '') => { if (!cond) fails++; out.push(`${cond ? 'ok' : 'XX'} ${name}${info ? ' (' + info + ')' : ''}`); };
const until = async (fn, ms = 8000) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (fn()) return true; } catch (e) { /* nog niet */ } await sleep(150); } return false; };

if (!A) return 'BIKESPEAKER CHECK FAIL: geen window.__audio';
ok(await until(() => A.state().ctx === 'running'), 'context loopt in graph-test');
ok(await until(() => A.state().gmusic.started && A.state().gmusic.tracks > 0, 15000), 'G-Music loopt en de bibliotheek is geladen', JSON.stringify(A.state().gmusic.tracks));
// de opening (of een gesprek) moet eerst klaar zijn: Spatie ingedrukt houden slaat een filmpje over
const quiet = () => !A.state().sceneLive && !A.state().speech.holds.length && !A.state().speech.talking && A.state().speech.silentFor > 1.5;
for (let i = 0; i < 6 && A.state().sceneLive; i++) {
  for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
  await sleep(2200);
  for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true }));
  await sleep(800);
}
ok(await until(quiet, 60000), 'kanaal stil');
ok(await until(() => A.state().musicTarget > 0.5, 30000), 'de muziekbus staat open', String(A.state().musicTarget));

const w = window.__debug.world, p = w.player, map = w.map;
const V = await import('/js/vehicle.js');
const rp = map.nearestRoadPoint(p.x, p.y, 200, true);
ok(!!rp, 'een weg bij de speler');
// de fietsers van het echte verkeer kunnen zelf een speakertje hebben (12%): die zetten we uit, de check meet alleen de eigen fietsen
const mijn = new Set();
const overigenUit = () => { for (const v of w.vehicles) if (v.isBike && !mijn.has(v)) v.btSpeaker = false; };
const nieuw = (x, y, speed) => {
  const v = V.spawnVehicleOnRoad(map, rp.road, false, Math.random, true, false, { x, y });
  v.countryDrive = true; v.road = null; v.driver = null; v.parked = false; v.btSpeaker = true; // de AI laat hem met rust: de check stuurt hem zelf
  v.x = x; v.y = y; v.angle = 0; v.speed = speed; w.vehicles.push(v); mijn.add(v);
  return v;
};
const weg = (v) => { const i = w.vehicles.indexOf(v); if (i >= 0) w.vehicles.splice(i, 1); };
const stem = () => A.state().bikeSpeakers;
overigenUit();
ok(await until(() => { overigenUit(); return stem().length === 0; }, 8000), 'begin zonder andere speakertjes');

// 1. een rit langs de speler: x van -60 tot +60, 6 m afstand opzij
const bike = nieuw(p.x - 60, p.y + 6, 6);
const rit = [];
for (let k = 0; k < 520; k++) {
  overigenUit();
  bike.x += 6 * 0.04; bike.y = p.y + 6; bike.angle = 0; bike.speed = 6;
  await sleep(40);
  if (k % 6 === 0) { const s = stem(); rit.push({ dx: Math.round(bike.x - p.x), n: s.length, rate: s[0] && s[0].rate, level: s[0] && s[0].vol, d: s[0] && s[0].d, track: s[0] && s[0].track, ending: s[0] && s[0].ending, lis: s[0] && s[0].lis, pv: [+(p.vx || 0).toFixed(1), +(p.vy || 0).toFixed(1)], px: Math.round(p.x), bike: [+bike.speed.toFixed(1), +bike.angle.toFixed(2), !!bike.wrecked, !!bike.sinking, +(bike.y - p.y).toFixed(1), +(bike.z || 0).toFixed(1)], d: s[0] && s[0].d, lvl: s[0] && s[0].level }); }
  if (bike.x - p.x > 60) break;
}
const met = rit.filter((r) => r.n >= 1);
ok(met.length > 10, 'er klinkt een speakertje tijdens de rit', `${met.length} metingen van ${rit.length}`);
ok(met.length && !!met[0].track, 'het nummer komt uit de bibliotheek', String(met[0] && met[0].track));
const aan = met.filter((r) => r.dx < -10), weg2 = met.filter((r) => r.dx > 10), langs = met.filter((r) => Math.abs(r.dx) <= 3);
const max = (a, k) => Math.max(...a.map((r) => r[k]));
const min = (a, k) => Math.min(...a.map((r) => r[k]));
ok(aan.length && max(aan, 'rate') > 1.02, 'aankomend is de toon hoger', aan.length ? String(max(aan, 'rate')) : 'geen metingen');
ok(weg2.length && min(weg2, 'rate') < 0.98, 'wegrijdend is de toon lager', weg2.length ? String(min(weg2, 'rate')) : 'geen metingen');
// de luisteraar is de camera (een paar meter van de speler) en de snelheid loopt zacht bij: ruim rond 1 in plaats van precies 1
ok(langs.length && Math.abs(langs[0].rate - 1) < 0.06, 'langs de speler is de toon weer ongeveer gewoon', langs.length ? String(langs[0].rate) : 'geen metingen');
// tot 55 m (waar het speakertje aan hoort te staan); het allerlaatste meetpunt aan de rand kan door het verwijderen van de testfiets afwijken
const stijgt = met.filter((r) => Math.abs(r.dx) <= 55).map((r, i, q) => [i ? +(r.rate - q[i - 1].rate).toFixed(3) : 0, r.dx, r.rate, i ? q[i - 1].rate : null]).filter((x) => x[0] > 0.012);
ok(stijgt.length === 0, 'de toon zakt tijdens de rit en stijgt nooit', JSON.stringify(stijgt));
ok(langs.length && aan.length && weg2.length && max(langs, 'level') > max(aan.filter((r) => r.dx < -35), 'level') && max(langs, 'level') > max(weg2.filter((r) => r.dx > 35), 'level'), 'het is hard langs de speler en zachter ver weg', langs.length ? `${max(langs, 'level')}` : '');
out.push('  rit (dx:rate/volume): ' + rit.filter((_, i) => i % 3 === 0).map((r) => `${r.dx}m:${r.rate}/${r.level}`).join(' '));
out.push('  luisteraar [x, y, vx, vy], speler, fiets [snelheid, hoek, kapot, zinkt, dy, z], d, niveau: ' + rit.filter((_, i) => i % 8 === 0).map((r) => JSON.stringify([r.lis, r.pv, r.bike, r.d, r.lvl])).join(' '));
weg(bike);
ok(await until(() => { overigenUit(); return stem().length === 0; }, 4000), 'zonder fiets is de stem opgeruimd', JSON.stringify(stem()));

// 2. drie fietsen tegelijk: hooguit twee stemmen
const drie = [nieuw(p.x + 12, p.y + 5, 1.5), nieuw(p.x + 20, p.y + 5, 1.5), nieuw(p.x + 28, p.y + 5, 1.5)];
let maxStemmen = 0;
for (let k = 0; k < 60; k++) { overigenUit(); for (const v of drie) { v.speed = 1.5; v.angle = 0; } await sleep(100); maxStemmen = Math.max(maxStemmen, stem().length); }
ok(maxStemmen === 2, 'drie fietsen met een speakertje: precies twee stemmen tegelijk', String(maxStemmen));
for (const v of drie) weg(v);
ok(await until(() => { overigenUit(); return stem().length === 0; }, 4000), 'alle stemmen opgeruimd');

// 3. een fiets die te ver weg blijft, laat niets horen
const ver = nieuw(p.x + 200, p.y + 5, 5);
for (let k = 0; k < 15; k++) { overigenUit(); await sleep(100); }
ok(stem().length === 0, 'een fiets op 200 m laat niets horen');
weg(ver);
ok(A.state().watchdog.nan === 0, 'geen NaN in de mix');
ok(A.state().voiceEls < 14, 'geen media-elementen die zich ophopen', String(A.state().voiceEls));
return `BIKESPEAKER CHECK ${fails ? 'FAIL' : 'PASS'}\n${out.join('\n')}`;
