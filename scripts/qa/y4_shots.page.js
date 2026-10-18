// Beeldcheck voor #197 (windwijzer), #199 (fotomodus) en #203 (evenement): desktop --perf-script body.
// Elke synthetische keydown krijgt een keyup. Wegwerpprofiel, geen echte opslag.
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const imp = (f) => import('/js/' + f + '.js');
const cine = await imp('cinematics'); const VH = await imp('vehicle'); const BT = await imp('boattypes'); const WL = await imp('waterlevels');
const EV = await imp('evenementen'); const FU = await imp('fotomodusui'); const DN = await imp('daynight');
const out = { fouten: [] };
const origErr = console.error.bind(console); console.error = (...a) => { out.fouten.push(a.map(String).join(' ').slice(0, 200)); origErr(...a); };
window.addEventListener('error', (e) => out.fouten.push('error: ' + e.message));
setInterval(() => { if (!window.__keepCine && cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true; D.input.canLock = () => false;
const key = (type, k, code) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(type, { key: k, code: code || k, bubbles: true })); };
const tap = async (k, code, ms = 80) => { key('keydown', k, code); await sleep(ms); key('keyup', k, code); await sleep(120); };
const snap = async (name) => { await sleep(600); console.log('[capture] ' + name); await sleep(600); };
const teleport = (x, y) => { if (p.inVehicle) p.exitVehicle(map, w); p.x = x; p.y = y; p.vx = p.vy = 0; p.z = 0; p.vz = 0; p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0; };
const fix = (hour) => { w.clock = hour; w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity }; if (DN.refreshDayNight) DN.refreshDayNight(w); };
let hold = null;
const loop = () => { if (hold && !p.inVehicle) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; } requestAnimationFrame(loop); }; loop();
const go = async (x, y, ms = 9000) => { teleport(x, y); hold = { x, y }; await sleep(ms * 0.6); teleport(x, y); await sleep(ms * 0.4); };

// de start: Enter tot het spel loopt (de harnas-Enter kan te vroeg zijn)
for (let i = 0; i < 40 && !document.body.classList.contains('game-started'); i++) { await tap('Enter', 'Enter'); await sleep(1500); }
for (let i = 0; i < 25 && w.paused; i++) { await tap(' ', 'Space'); await sleep(700); }
out.gestart = document.body.classList.contains('game-started');
await sleep(3000);

// 1. evenement: Zomerkermis Zuidlaren
try {
  const ev = EV.AGENDA.find((e) => e.id === 'ev-kermis-leek'); const c = EV.centreOf(ev);
  // het verhaal begrenst de datum: spring naar een stap op 19 september
  out.jump = window.__story.jump('O6'); await sleep(1500);
  for (let i = 0; i < 20 && window.__calendar.get().day < 0; i++) await sleep(100);
  window.__calendar.set(EV.AGENDA.find((e) => e.id === 'ev-optocht-winschoten').from); fix(17); await sleep(500);
  out.dag = window.__calendar.get().info; out.bounds = window.__calendar.get().bounds;
  await go(c.x + 25, c.y + 25);
  await sleep(4000);
  out.evenement = { centre: c, actief: (w.eventsNow || []).map((e) => e.id), geluid: w.eventSound, markers: EV.mapMarkers(ev.from, 17).length, routeSig: w.eventRouteSig };
  await snap('evenement-kermis');
  const act = window.__activities.get('evenementen');
  out.evenement.spots = act.spots().map((s) => s.name);
  // 2. fotomodus op dezelfde plek
  out.foto = { gestart: FU.startPhotoMode(w) };
  await sleep(800);
  await tap('f', 'KeyF'); await tap('f', 'KeyF'); await tap('g', 'KeyG');
  for (let i = 0; i < 6; i++) await tap('w', 'KeyW', 200);
  await snap('fotomodus');
  await tap('Escape', 'Escape');
  out.foto.gestopt = !FU.isPhotoMode();
} catch (e) { out.fouten.push('evenement/foto: ' + e.message); }

// 3. zeilboot met windwijzer
try {
  hold = null; window.__calendar.set(10); fix(14);
  const GM = { x: 200.8, y: 45.4 }; let wat = null;
  for (let r = 20; r < 900 && !wat; r += 20) for (let k = 0; k < 24 && !wat; k++) {
    const a = k / 24 * Math.PI * 2, x = GM.x + Math.cos(a) * r, y = GM.y + Math.sin(a) * r;
    const wa = WL.waterAt(map, x, y);
    if (wa && wa.navigable && wa.depth > 1.5) wat = { x, y, a };
  }
  if (!wat) out.fouten.push('geen vaarwater');
  else {
    await go(wat.x, wat.y, 6000); hold = null;
    const v = new VH.Vehicle(wat.x, wat.y, wat.a, { ...BT.BOAT_KINDS.zeilboot }); v.isBoat = true; v.speed = 0; w.vehicles.push(v);
    p.enterVehicle(v, w); await sleep(1000);
    key('keydown', 'w', 'KeyW'); await tap('q', 'KeyQ', 600); await sleep(3000);
    const ww = document.getElementById('windwijzer');
    out.zeil = { wijzer: !!ww && !ww.hidden, tekst: ww && ww.textContent.trim(), snelheid: +(v.speed || 0).toFixed(2), sailTop: v.sailTop };
    await snap('zeilboot-windwijzer');
    key('keyup', 'w', 'KeyW');
    if (p.inVehicle) p.exitVehicle(map, w);
  }
} catch (e) { out.fouten.push('zeil: ' + e.message); }
return JSON.stringify(out);
