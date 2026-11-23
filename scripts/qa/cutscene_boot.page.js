// Page-script voor scripts/qa/cutscene_shots_web.mjs --page=cutscene_boot.page.js: scenes op het dek van de rondvaartboot
// (missionstory.js boatStage: playDeckMoment, playStoryIntro/Outro/Fail met de speler in een boot). Per scene een reeks stills.
// window.__cs = { only: ['deck', 'intro', 'outro', 'fail', 'kort'] , n: stills per scene, every: seconden tussen stills }
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const CS = window.__cs || {};
const cine = await imp('cinematics');
const rv = await imp('rondvaartchase');
const kit = await imp('sidejobkit');
const ms = await imp('missionstory');
D.input.canLock = () => false;
{ const ss0 = document.querySelector('#start-screen'); if (ss0) ss0.style.display = 'none'; }
// de openingsfilm van een nieuw spel speelt eerst: wegklikken tot de wereld vrij is
for (let i = 0; i < 100 && cine.isCinematicActive(); i++) { cine.skipCinematic(); await sleep(400); }
w.devInvuln = true; w.clock = 14;
w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
const berth = rv.rondvaartBerth(map);
if (p.inVehicle) p.exitVehicle(map, w);
p.x = berth.start.x; p.y = berth.start.y; p.vx = p.vy = 0; p.z = 0;
const hold = setInterval(() => { if (!p.inVehicle) { p.x = berth.start.x; p.y = berth.start.y; p.vx = p.vy = 0; } }, 100);
await sleep(CS.settle || 22000);
const boat = kit.spawnJobBoat(w, berth.boat.x, berth.boat.y, berth.boat.angle, { ...rv.TOUR_BOAT });
if (!boat) return JSON.stringify({ fout: 'geen boot' });
w.vehicles.push(boat);
p.enterVehicle(boat, w);
const c = w.companion;
if (c && c.state !== 'dead') { c.inVehicle = boat; boat.passenger = 'companion'; c.x = boat.x; c.y = boat.y; }
await sleep(6000);
const out = { boat: { x: boat.x, y: boat.y, a: boat.angle, len: boat.model.len }, scenes: {} };
const want = (k) => !CS.only || !CS.only.length || CS.only.includes(k);
const L2 = [['T', 'Kijk, daar. Dat is toch de Martinitoren?'], ['A', 'Tammo, je staat er al een kwartier naar te kijken.'], ['T', 'Het is een mooie toren, Tessa.']];
const play = async (key, fn) => {
  if (!want(key)) return;
  const ok = fn();
  out.scenes[key] = { ok: !!ok, stills: 0 };
  if (!ok) return;
  const every = CS.every || 1.2;
  for (let k = 0; k < (CS.n || 7); k++) {
    await sleep(every * 1000);
    if (!cine.isCinematicActive()) break;
    const cm = window.__scene3d.cam; (out.scenes[key].cam ||= []).push([cm.position.x, cm.position.z, cm.position.y].map((v) => +v.toFixed(2)).join(','));
    await window.__cap('boot-' + key + '-' + String(k).padStart(2, '0'));
    out.scenes[key].stills++;
  }
  cine.skipCinematic && cine.skipCinematic();
  await sleep(3500);
};
await play('deck', () => ms.playDeckMoment(w, { boat, lines: L2, kicker: 'Rondvaart' }));
// de eerste missiestap met een verhaal: probeer elk nummer tot een scène speelt
const stepOk = (fn) => { for (let i = 0; i < 40; i++) { if (fn(i)) return i; } return -1; };
await play('intro', () => { const i = stepOk((q) => ms.playStoryIntro(w, q, { stage: q, kicker: 'Test', title: 'Test' })); out.step = i; CS.step = i; return i >= 0; });
await play('outro', () => ms.playStoryOutro(w, CS.step, { stage: CS.step }));
await play('kort', () => ms.playStoryIntro(w, CS.step, { stage: CS.step, short: true, kicker: 'Test', title: 'Test' }));
await play('fail', () => ms.playStoryFail(w, CS.step, { reason: 'test' }));
clearInterval(hold);
return JSON.stringify(out);
