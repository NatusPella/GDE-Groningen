// Page half of scripts/qa/mensen_beeld.mjs (desktop --perf-script body, #985). Beelden en metingen van het lopen: een zijaanzicht van de speler die
// loopt (3 opnamen), een rennende bocht (2), een voetganger die opkijkt (1) en de metingen: hielcontacten per seconde bij drie snelheden
// (ud.footN; None bij een build zonder gait.js), de bochthelling en de gemiddelde frametijd tijdens het lopen. De speler wordt kinematisch
// verplaatst (positie, hoek en snelheid worden elk beeld gezet), dus er is geen echte invoer nodig. Raakt geen opslag.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const raf = () => new Promise((r) => requestAnimationFrame(r));
const out = { fouten: [], metingen: {}, opnamen: 0 };
const key = (type, k, code) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(type, { key: k, code: code || k, bubbles: true })); };
const tap = async (k, code, ms = 80) => { key('keydown', k, code); await sleep(ms); key('keyup', k, code); await sleep(80); };
for (let i = 0; i < 900 && !(window.__debug && window.__debug.world && window.__debug.world.map && window.__scene3d); i++) await sleep(100);
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) { if (i % 30 === 5) await tap('Enter', 'Enter'); await sleep(100); }
const D = window.__debug, w = D && D.world, p = w && w.player;
if (!p) return JSON.stringify({ results: { mensen: { fouten: ['geen speler'] } } });
const cine = await import('/js/cinematics.js');
for (let i = 0; i < 10 && cine.isCinematicActive(); i++) { key('keydown', ' ', 'Space'); await sleep(2500); key('keyup', ' ', 'Space'); await sleep(1500); }
await sleep(3000);
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
w.devInvuln = true;
const sc = window.__scene3d;
w.clock = 14;
w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
for (let i = 0; i < 25 && w.paused; i++) { await tap(' ', 'Space'); await sleep(200); }
let pm0 = null;
const mesh = () => { // het figuur van de speler: de mens in de scène die op zijn plek staat
  if (pm0 && pm0.parent) return pm0;
  let best = null, bd = 1.5;
  sc.scene.traverse((c) => { if (c.userData && c.userData.pelvis && c.userData.legL) { const d = Math.hypot(c.position.x - p.x, c.position.z - p.y); if (d < bd) { bd = d; best = c; } } });
  if (!best) out.diag = { zoek: 'geen mesh bij de speler', speler: [Math.round(p.x), Math.round(p.y)], inVoertuig: !!p.inVehicle };
  return (pm0 = best);
};
// de opening begint op een boot: te voet naar een open plek, naast de dichtstbijzijnde voetganger (die loopt op een voetpad of plein)
if (p.inVehicle) p.exitVehicle(w.map, w);
{
  const q = (w.pedestrians || []).filter((o) => o.state !== 'dead' && !o.isCop).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
  if (q) { p.x = q.x - Math.cos(q.angle) * 2; p.y = q.y - Math.sin(q.angle) * 2; p.angle = q.angle; p.gz = w.map.groundHeightAt ? w.map.groundHeightAt(p.x, p.y, 0) || 0 : 0; p.z = 0; p.vx = p.vy = 0; await sleep(6000); }
}
const ONLY = window.__mensenOnly || [];
const ON = (id) => !ONLY.length || ONLY.includes(id);
const home = { x: p.x, y: p.y, a: p.angle };
out.start = { x: Math.round(p.x), y: Math.round(p.y), binnen: !!(w.home && w.home.inside) };

let pose = null;
const cam = () => { if (!cine.isCinematicActive()) cine.playCinematic({ id: 'mensen-view', duration: 600000, priority: 9, letterbox: false, skippable: false, hidePlayers: false, shot: () => pose }); };
const camOff = () => { pose = null; if (cine.isCinematicActive()) cine.skipCinematic(); w.cameraOverride = null; };
// zijaanzicht: de camera rechts van de loper (richting a), op zijn hoogte; of schuin voor hem (front = true)
const place = (side, front) => {
  const a = p.angle, rx = -Math.sin(a), ry = Math.cos(a);
  const fx = Math.cos(a), fy = Math.sin(a);
  const m0 = mesh(), px = m0 ? m0.position.x : p.x, py = m0 ? m0.position.z : p.y, gz = m0 ? m0.position.y : (p.gz || 0) + (p.z || 0); // waar het figuur echt staat
  const d = side;
  const cx = px + rx * d + (front ? fx * 2.2 : 0), cy = py + ry * d + (front ? fy * 2.2 : 0);
  pose = { position: { x: cx, y: cy, z: gz + 1.0 }, lookAt: { x: px, y: py, z: gz + 0.95 }, fov: 38, cut: true };
};

// kinematisch lopen: hoek a(t), snelheid v; roept per beeld fn(dt, t) aan
async function loop(secs, v, turn, fn) {
  let t = 0, last = performance.now(); const dts = [];
  p.x = home.x; p.y = home.y; forced.a = home.a; forced.vx = forced.vy = 0; // elke gang vanaf dezelfde plek, zodat de weg vrij blijft
  while (t < secs) {
    await raf();
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now; t += dt; dts.push(dt);
    forced.a += turn * dt;
    forced.vx = Math.cos(forced.a) * v; forced.vy = Math.sin(forced.a) * v;
    if (fn) fn(dt, t);
  }
  forced.vx = forced.vy = 0;
  return dts;
}
// de speler loopt door het spel zelf (botsingen, hoogte): alleen snelheid en hoek zijn vastgezet, zodat de invoer ze niet terugzet
const forced = { vx: 0, vy: 0, a: p.angle };
const force = (on) => {
  for (const [k, g] of [['vx', () => forced.vx], ['vy', () => forced.vy], ['angle', () => forced.a]]) {
    if (on) Object.defineProperty(p, k, { get: g, set: () => {}, configurable: true, enumerable: true });
    else Object.defineProperty(p, k, { value: k === 'angle' ? forced.a : 0, writable: true, configurable: true, enumerable: true });
  }
};
const ud = () => { const m = mesh(); return m && m.userData; };
const cap = async (name) => { await sleep(150); console.log('[capture] ' + name); out.opnamen++; await sleep(500); };

forced.a = home.a;
if (ON('lopen')) {
force(true);
// metingen: hielcontacten per seconde en de bochthelling
for (const v of [1.4, 3.5, 6.0]) {
  const u0 = ud(); const n0 = u0 && u0.footN || 0; let maxLean = 0;
  const secs = v > 5 ? 2 : 3;
  const dts = await loop(secs, v, 0, () => { const u = ud(); if (u && Math.abs(u.turnLean || 0) > maxLean) maxLean = Math.abs(u.turnLean); });
  const u1 = ud();
  out.metingen['rechtdoor_' + v] = { contactenPerSeconde: u1 && u1.footN !== undefined ? +(((u1.footN || 0) - n0) / secs).toFixed(2) : null, verwacht: +(2 * Math.min(2.1, 0.42 + 0.3 * v)).toFixed(2), frametijdMs: +(1000 * dts.reduce((a, b) => a + b, 0) / dts.length).toFixed(2), frames: dts.length };
}
{
  let maxLean = 0, maxHead = 0, n = 0;
  const dts = await loop(2.5, 4, 1.6, () => { const u = ud(); if (u) { maxLean = Math.max(maxLean, Math.abs(u.turnLean || 0)); maxHead = Math.max(maxHead, Math.abs(u.turnHead || 0)); n++; } });
  out.metingen.bocht_4 = { maxHelling: +maxLean.toFixed(3), maxHoofd: +maxHead.toFixed(3), frametijdMs: +(1000 * dts.reduce((a, b) => a + b, 0) / dts.length).toFixed(2) };
}

// beelden: zijaanzicht, lopen (3 opnamen zodat verschillende fasen in beeld komen)
cam();
// de opname valt tijdens het lopen (de figuur zakt binnen 0,3 s terug in de stilstand); de fase verschilt per opname
const capIn = (name, at) => { let done = false; return (dt, t) => { if (!done && t >= at) { done = true; console.log('[capture] ' + name); out.opnamen++; } }; };
for (let k = 0; k < 3; k++) { place(3.0, false); const c = capIn('lopen-zij-' + k, 1.0 + k * 0.13); await loop(1.5 + k * 0.13, 1.5, 0, (dt, t) => { place(3.0, false); c(dt, t); }); await sleep(500); }
// rennen in een bocht, schuin van voren
for (let k = 0; k < 2; k++) { place(3.4, true); const c = capIn('ren-bocht-' + k, 0.9 + k * 0.25); await loop(1.4 + k * 0.25, 5.5, 0.8, (dt, t) => { place(3.4, true); c(dt, t); }); await sleep(500); }
camOff();
force(false);
}
p.x = home.x; p.y = home.y; p.angle = home.a;

// een voetganger die opkijkt: de dichtstbijzijnde (levende) voetganger, de speler staat 4 m voor hem
if (ON('blik')) {
  const peds = (w.pedestrians || []).filter((q) => q.state !== 'dead' && !q.hideMesh && !q.isCop);
  peds.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
  const q = peds[0];
  out.metingen.voetgangers = peds.length;
  if (q) {
    p.x = q.x + Math.cos(q.angle) * 4 - Math.sin(q.angle) * 2.5; p.y = q.y + Math.sin(q.angle) * 4 + Math.cos(q.angle) * 2.5; p.vx = p.vy = 0;
    await sleep(4000);
    let seen = 0;
    cam();
    for (let i = 0; i < 20; i++) {
      p.x = q.x + Math.cos(q.angle) * 4 - Math.sin(q.angle) * 2.5; p.y = q.y + Math.sin(q.angle) * 4 + Math.cos(q.angle) * 2.5; p.vx = p.vy = 0; // blijf voor hem staan
      const a = q.angle, rx = -Math.sin(a), ry = Math.cos(a);
      pose = { position: { x: q.x + Math.cos(a) * 2.6 + rx * 1.1, y: q.y + Math.sin(a) * 2.6 + ry * 1.1, z: (q.gz || 0) + 1.55 }, lookAt: { x: q.x, y: q.y, z: (q.gz || 0) + 1.5 }, fov: 34, cut: true };
      await sleep(250);
      const pmesh = sc.actors().peds.get(q);
      const u = pmesh && pmesh.userData;
      if (u && Math.abs(u.gazeS || 0) > 0.2) { seen++; if (seen === 2) await cap('voetganger-kijkt-op'); }
    }
    out.metingen.blikFrames = seen;
    camOff();
  }
}

// de speler staat lang stil: na 5 tot 10 s komt er een wachtclip; opname zodra de arm omhoog is (horloge) of na 25 s
if (ON('stil')) {
  p.x = home.x; p.y = home.y; p.angle = home.a; p.vx = p.vy = 0;
  cam();
  let got = null; const t0 = performance.now();
  while (performance.now() - t0 < 25000 && !got) {
    place(2.6, true);
    await sleep(200);
    const u = ud();
    if (u && u.armL.rotation.z > 0.9) got = 'horloge';
  }
  out.metingen.stilstaan = { clip: got, stillT: ud() ? +(ud().stillT || 0).toFixed(1) : null };
  if (got) await cap('stilstaan-horloge');
  camOff();
}

// het publiek: klappen, juichen, zwaaien, telefoon en handen in de zij (missiedecor.js, zoals bouwsteen_publiek_beeld)
if (ON('publiek')) {
  const M = await import('/js/missiedecor.js');
  const a = (d) => ({ x: p.x + Math.cos(p.angle) * d, y: p.y + Math.sin(p.angle) * d });
  const c0 = a(12);
  const set = M.buildMissionDressing(w, 'plein', { x: c0.x, y: c0.y, a: p.angle }, null);
  if (!set || !set.crowd) out.fouten.push('geen publiek');
  else {
    const mem = set.crowd.members;
    const near = mem.reduce((s, m) => (Math.hypot(m.x - p.x, m.y - p.y) < Math.hypot(s.x - p.x, s.y - p.y) ? m : s));
    // eerst verder weg (wachtstand), dan er vlak naast (reactie)
    let t = 0, last = performance.now();
    const run = async (secs) => { let tt = 0; while (tt < secs) { await raf(); const nw = performance.now(), dt = Math.min(0.1, (nw - last) / 1000); last = nw; tt += dt; M.updateMissionDressing(set, dt); } };
    cam();
    pose = { position: { x: near.x - 6, y: near.y - 6, z: (p.gz || 0) + 2.2 }, lookAt: { x: near.x, y: near.y, z: (p.gz || 0) + 1.2 }, fov: 55, cut: true };
    await run(2);
    const idle = {}; for (const m of mem) idle[m.state ? m.state.anim : '-'] = (idle[m.state ? m.state.anim : '-'] || 0) + 1;
    out.metingen.publiekWacht = idle;
    await cap('publiek-wacht');
    p.x = near.x + 1.5; p.y = near.y + 1.5; p.vx = p.vy = 0;
    await run(3);
    const react = {}; for (const m of mem) react[m.state ? m.state.anim : '-'] = (react[m.state ? m.state.anim : '-'] || 0) + 1;
    out.metingen.publiekReactie = react;
    await cap('publiek-reactie');
    camOff();
    M.disposeMissionDressing(set);
  }
}
p.x = home.x; p.y = home.y; p.angle = home.a; p.vx = p.vy = 0;
console.log('[mensen] opnamen ' + out.opnamen);
return JSON.stringify({ results: { mensen: out } });
