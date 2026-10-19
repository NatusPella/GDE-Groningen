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

// zeilboot in open water, de kop naar de ruimste kant, met de wind van opzij
try {
  hold = null; fix(14);
  const GM = { x: 200.8, y: 45.4 }; let best = null;
  const open = (x, y, a, d) => { for (let r = 10; r <= d; r += 10) { const wa = WL.waterAt(map, x + Math.cos(a) * r, y + Math.sin(a) * r); if (!(wa && wa.navigable && wa.depth > 1.5)) return r - 10; } return d; };
  for (let r = 30; r < 1500; r += 30) for (let k = 0; k < 24; k++) {
    const a = k / 24 * Math.PI * 2, x = GM.x + Math.cos(a) * r, y = GM.y + Math.sin(a) * r;
    const wa = WL.waterAt(map, x, y); if (!(wa && wa.navigable && wa.depth > 1.5)) continue;
    let bo = 0, bd = 0; for (let j = 0; j < 16; j++) { const h = j / 16 * Math.PI * 2, d = open(x, y, h, 120); if (d > bd) { bd = d; bo = h; } }
    if (!best || bd > best.bd) best = { x, y, bd, a: bo };
    if (best.bd >= 120) break;
  }
  out.plek = best;
  await go(best.x, best.y, 7000); hold = null;
  const v = new VH.Vehicle(best.x, best.y, best.a, { ...BT.BOAT_KINDS.zeilboot }); v.isBoat = true; v.speed = 0; w.vehicles.push(v);
  p.enterVehicle(v, w); await sleep(1000);
  const SR = await imp('zeilrules');
  const trace = [];
  // zet de boot dwars op de wind (halve wind): de koers is windrichting + 90 graden
  const wind0 = window.__wind || null; const dagN2 = 9;
  key('keydown', 'w', 'KeyW');
  for (let i = 0; i < 10; i++) { await sleep(1200); const wd = w.wind; trace.push({ v: +(v.speed || 0).toFixed(2), top: +(v.sailTop || 0).toFixed(2), hoek: wd ? Math.round(SR.windHoek(v.angle, wd) * 180 / Math.PI) : null, trim: +(v.zeilTrim || 0).toFixed(2) }); if (i === 3) await snap('zeil-vaart'); if (i === 4) await tap('q', 'KeyQ', 700); }
  key('keyup', 'w', 'KeyW');
  out.zeil = { trace, wijzer: !!(document.getElementById('windwijzer') || {}).hidden === false };
  await snap('zeil-eind');
  if (p.inVehicle) p.exitVehicle(map, w);
} catch (e) { out.fouten.push('zeil: ' + e.message); }
return JSON.stringify(out);
