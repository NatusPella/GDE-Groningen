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

// alle evenementen van de agenda: elk op een eigen dag en klokuur, twee opnames (boven, dichtbij)
const seen0 = w.calendar ? w.calendar.seen : [];
out.evenementen = {};
for (const ev of EV.AGENDA) {
  try {
    const c = EV.centreOf(ev); const dagN = ev.from; const hr = (ev.hours[0] + Math.min(ev.hours[1], 23.5)) / 2;
    w.calendar = { seen: seen0, get day() { return dagN; }, set day(v) {} }; fix(hr); w.devInvuln = true;
    await go(c.x + 30, c.y + 30, 9000); await sleep(3500);
    const gz = map.groundHeightAt ? map.groundHeightAt(c.x, c.y, 0) || 0 : 0;
    window.__keepCine = true;
    cine.playCinematic({ id: 'y4-view', duration: 60, priority: 9, shot: () => ({ position: { x: c.x + 70, y: c.y - 70, z: gz + 45 }, lookAt: { x: c.x, y: c.y, z: gz + 2 }, cut: true }) });
    await sleep(2500); console.log('[capture] ' + ev.id); await sleep(600); cine.skipCinematic(); window.__keepCine = false; await sleep(400);
    out.evenementen[ev.id] = { uur: hr, actief: (w.eventsNow || []).map((e) => e.id), geluid: w.eventSound && w.eventSound.sound };
  } catch (e) { out.fouten.push(ev.id + ': ' + e.message); }
}
return JSON.stringify(out);
