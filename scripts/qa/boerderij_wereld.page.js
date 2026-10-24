// Paginascript (#415 stap 2): de eigen boerderij in de echte wereld. Koop een trekker, werktuigen en een maaidorser, bekijk het erf, stap in, koppel met E, hef en aftakas,
// rij de rijen van het perceel (ploegen: de rijen veranderen), zet het gewas in de groei en bekijk het veld en de maaidorser. Beelden: shots-*.png ('[capture] <naam>').
// Elke synthetische keydown krijgt een keyup. Het wegwerpprofiel van de run is het enige dat beschreven wordt; de boerderij leeft in de opslag van dat profiel.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 240 && !(window.__debug && window.__debug.world && window.__debug.world.player && window.__debug.world.map); i++) await sleep(500);
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const imp = (f) => import('/js/' + f + '.js');
const uit = { controles: [], meldingen: [], fouten: [] };
const check = (naam, ok, info = '') => { uit.controles.push({ naam, ok: !!ok, info: String(info).slice(0, 200) }); };
const origErr = console.error.bind(console);
console.error = (...a) => { uit.fouten.push(a.map(String).join(' ').slice(0, 200)); origErr(...a); };
window.addEventListener('error', (e) => uit.fouten.push('error: ' + e.message));


const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const DN = await imp('daynight');
const RD = await imp('rdnew');
const PC = await imp('percelen');
const B = await imp('boerderij');
const M = await imp('machines');
const WT = await imp('werktuigen');
const WW = await imp('boerderijwereld');
const Live = await imp('boerderijlive');
const { akkerRijen } = await imp('bietenrules');

const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
for (let i = 0; i < 20 && w.paused; i++) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } await sleep(300); }
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const key = (type, k, code) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(type, { key: k, code: code || k, bubbles: true })); };
const tap = async (k, code, ms = 90) => { key('keydown', k, code); await sleep(ms); key('keyup', k, code); await sleep(120); };
const shot = async (naam, ms = 1500) => { await sleep(ms); console.log('[capture] ' + naam); await sleep(900); };
const fix = (uur = 14) => {
  w.clock = uur;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};
const teleport = (x, y, a = 0) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0; p.angle = a; w.camYaw = a;
  p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
};
let hold = null;
const houd = () => { if (hold && !p.inVehicle) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.angle = hold.a; w.camYaw = hold.a; } requestAnimationFrame(houd); };
requestAnimationFrame(houd);
const msgsVan = () => (w.messages || []).map((m) => (typeof m === 'string' ? m : m.text || m.msg || '')).filter(Boolean);
const laatsteMeldingen = () => uit.meldingen.slice(-6);
const origAdd = w.addMessage ? w.addMessage.bind(w) : null;
if (origAdd) w.addMessage = (t, d) => { uit.meldingen.push(String(t).slice(0, 160)); return origAdd(t, d); };

fix(14);
const [ex, ey] = RD.wgsToWorld(PC.erfDef(PC.START_ERF).lat, PC.erfDef(PC.START_ERF).lon);
w.money = 500000;
const kopen = ['trekker-klein', 'ploeg-3', 'zaaimachine', 'aanhanger', 'cultivator', 'maaidorser'].map((t) => Live.koopMachineCat(w, t, PC.START_ERF));
check('alles gekocht', kopen.every((r) => r.ok), JSON.stringify(kopen.map((r) => r.ok || r.reden)));

try {
// --- het erf --------------------------------------------------------------------------
teleport(ex, ey + 45, -Math.PI / 2);
hold = { x: ex, y: ey + 45, a: -Math.PI / 2 };
await sleep(9000);
const st1 = WW.boerderijWereldStand();
check('machines en werktuigen staan op het erf', st1.voertuigen.length === 2 && st1.werktuigen.length === 4, JSON.stringify({ v: st1.voertuigen.length, w: st1.werktuigen.length, erven: st1.erven }));
await shot('erf-overzicht');
const erfPos = WW._staat().erven.get(PC.START_ERF);
if (erfPos) { teleport(erfPos.x + 25, erfPos.y + 35, -2.4); hold = { x: erfPos.x + 25, y: erfPos.y + 35, a: -2.4 }; await shot('erf-schuin', 2500); }

// --- instappen ---------------------------------------------------------------------------
const trek = w.vehicles.find((v) => v.farm && v.model.name === 'tractor');
check('de trekker is een voertuig in de wereld', !!trek, trek ? `${trek.model.len} m` : 'geen');
hold = null;
teleport(trek.x + 3.2, trek.y, Math.PI);
await sleep(1200);
await tap('e', 'KeyE');
await sleep(1200);
check('E zet je in de trekker', p.inVehicle === trek, String(!!p.inVehicle) + ' ' + JSON.stringify(WW.boerderijPrompt(w)));
if (p.inVehicle !== trek) { teleport(trek.x + 2.4, trek.y + 1.4, Math.PI); await sleep(1000); await tap('e', 'KeyE'); await sleep(1200); check('tweede poging E in de trekker', p.inVehicle === trek, String(!!p.inVehicle)); }
check('prompt in de trekker', true, JSON.stringify(WW.boerderijPrompt(w)));

// --- koppelen met E -----------------------------------------------------------------------
const ploegRec = PC.MACHINE_CATALOGUS['ploeg-3'] && Live.getBedrijf().machinepark.werktuigen.find((m) => m.type === 'ploeg-3');
const ploegImp = WW._staat().werktuigen.get(ploegRec.uid);
trek.angle = Math.PI; trek.x = ploegImp.x - 3.55 - 0.6; trek.y = ploegImp.y; trek.speed = 0;
await sleep(1500);
await shot('trekker-bij-ploeg');
await tap('e', 'KeyE');
await sleep(900);
const rig = WW._staat().rigs.get(trek.farm);
check('E koppelt de ploeg', rig && rig.werktuig === ploegRec.uid, JSON.stringify(rig));
await shot('ploeg-gekoppeld', 800);
await tap('t', 'KeyT'); await sleep(500);
check('T zet de hef omlaag', rig.hef === 'omlaag', rig.hef);
await tap('g', 'KeyG'); await sleep(400);
check('G doet niets voor de ploeg', rig.pto === false, String(rig.pto));
check('prompt toont de stand', /hef omlaag/.test((WW.boerderijPrompt(w) || {}).sub || ''), JSON.stringify(WW.boerderijPrompt(w)));
await shot('prompt-stand', 600);
await tap('t', 'KeyT'); await sleep(300);

// --- echt rijden: de topsnelheid van de trekker, de diesel loopt leeg ------------------------------
const m0 = M.vind(Live.getBedrijf(), trek.farm);
const b0 = m0.brandstof;
const p0 = { x: trek.x, y: trek.y };
key('keydown', 'w', 'KeyW');
const diag = [];
for (let i = 0; i < 7; i++) { await sleep(500); diag.push({ sp: +trek.speed.toFixed(2), down: D.input.isDown('w'), axis: D.input.axis ? D.input.axis() : null, drv: trek.driver, pause: !!(w.paused || w.uiPaused), top: trek.model.maxSpeed, dis: !!trek.disabled, wr: !!trek.wrecked, x: Math.round(trek.x), cap: w.coopHold || null }); }
uit.diag = diag;
const snel = Math.abs(trek.speed);
key('keyup', 'w', 'KeyW');
await sleep(2500);
check('de trekker rijdt met gas', Math.hypot(trek.x - p0.x, trek.y - p0.y) > 8, `${Math.round(Math.hypot(trek.x - p0.x, trek.y - p0.y))} m, ${snel.toFixed(1)} m/s`);
check('de snelheid blijft onder het maximum', snel <= trek.model.maxSpeed + 0.5, `${snel.toFixed(1)} van ${trek.model.maxSpeed}`);
await sleep(1500);
check('rijden kost diesel', m0.brandstof < b0, `${b0.toFixed(2)} -> ${m0.brandstof.toFixed(2)}`);

// --- het veld ----------------------------------------------------------------------------------------
const b = Live.getBoerderij();
teleport(ex, ey + 45, 0);
let pos = null;
for (let i = 0; i < 60 && !pos; i++) { pos = B.veldPositie(b, b.bedrijf.actief); if (!pos) await sleep(1000); }
check('het veld is gevonden bij het erf', !!pos, JSON.stringify(pos));
if (pos) {
  const rijen = akkerRijen({ x: pos.x, y: pos.y }, pos.a);
  // de trekker naar het veld, de hef omlaag; dan kinematisch de rijen rijden (zoals de speelbot: stuurgevoel is niet gemeten)
  const v = trek;
  if (!p.inVehicle) { teleport(v.x + 2.0, v.y + 0.8, 0); await sleep(800); await tap('e', 'KeyE'); await sleep(800); }
  check('in de trekker voor het veldwerk', p.inVehicle === v, '');
  await tap('t', 'KeyT'); await sleep(300);
  const imp = WW._staat().werktuigen.get(ploegRec.uid);
  const d = WT.WERKTUIG.ploeg;
  const af = v.model.len / 2 + d.achter;
  const zet = (r, l, speed) => { const ang = Math.atan2(r.uy, r.ux); const px = r.ax + r.ux * l, py = r.ay + r.uy * l; v.angle = ang; v.x = px + Math.cos(ang) * af; v.y = py + Math.sin(ang) * af; v.speed = speed; v.vx = 0; };
  zet(rijen[0], -8, 4);
  await sleep(2500);
  await shot('veld-voor-het-ploegen', 800);
  const geld0 = w.money;
  for (let ri = 0; ri < rijen.length; ri++) {
    for (let l = -6; l <= 106; l += 0.5) { zet(rijen[ri], l, 4); await sleep(100); }
    if (ri === 1) await shot('veld-ploegen-halverwege', 300);
    // naar het begin van de volgende rij door de keerstrook: werkt niet (buiten de rij)
  }
  await sleep(1500);
  check('ploegen is klaar', B.fase(b) === 'geploegd', B.fase(b));
  check('ploegen met je eigen ploeg kost niets (alleen diesel)', w.money === geld0, `${geld0} -> ${w.money}`);
  check('melding Geploegd', uit.meldingen.some((m) => /Geploegd/.test(m)), JSON.stringify(laatsteMeldingen()));
  // de volgende fasen bekijk je te voet vanaf een standpunt schuin voor het veld (kleur, strepen, gewas en groei)
  const vantage = async (naam, wacht = 3000) => {
    const ux = Math.cos(pos.a), uy = Math.sin(pos.a), nx = -uy, ny = ux;
    const px = pos.x - ux * 55 + nx * 42, py = pos.y - uy * 55 + ny * 42;
    const hoek = Math.atan2(pos.y - py, pos.x - px);
    teleport(px, py, hoek);
    hold = { x: px, y: py, a: hoek };
    await sleep(wacht); await shot(naam, 300);
    hold = null;
  };
  uit.velden = WW.boerderijWereldStand().velden;
  await vantage('veld-geploegd', 4000);
  Live.rondAf(w, 'cultiveren', 0.9, { vrij: true });
  await vantage('veld-gecultiveerd');
  Live.rondAf(w, 'zaaien', 0.9, { vrij: true });
  await vantage('veld-gezaaid');
  Live.rondAf(w, 'bemesten', 0.9, { vrij: true });
  B.tikUren(b, 18);
  await vantage('veld-groeit');
  B.tikUren(b, 40);
  await vantage('veld-rijp');
  // de maaidorser oogst
  teleport(v.x + 5, v.y, 0);
  const dorser = w.vehicles.find((x) => x.farm && x.model.name === 'maaidorser');
  check('de maaidorser staat in de wereld', !!dorser && dorser.model.len > 7, dorser ? String(dorser.model.len) : 'geen');
  if (dorser) {
    teleport(dorser.x + 2.6, dorser.y, 0); await sleep(1000);
    await tap('e', 'KeyE'); await sleep(1000);
    check('E zet je in de maaidorser', p.inVehicle === dorser, '');
    await tap('t', 'KeyT'); await tap('g', 'KeyG'); await sleep(400);
    const r2 = WW._staat().rigs.get(dorser.farm);
    check('maaitafel omlaag en dorsen aan', r2.hef === 'omlaag' && r2.pto === true, JSON.stringify(r2));
    const zetD = (r, l) => { const ang = Math.atan2(r.uy, r.ux); const px = r.ax + r.ux * l, py = r.ay + r.uy * l; dorser.angle = ang; dorser.x = px - Math.cos(ang) * (dorser.model.len / 2 - 0.5); dorser.y = py - Math.sin(ang) * (dorser.model.len / 2 - 0.5); dorser.speed = 4; };
    for (let ri = 0; ri < rijen.length; ri++) {
      for (let l = -6; l <= 106; l += 0.5) { zetD(rijen[ri], l); await sleep(100); }
      if (ri === 1) await shot('veld-oogsten-halverwege', 300);
    }
    await sleep(1500);
    check('oogst in de schuur', b.schuur.kg > 500, String(b.schuur.kg));
    await shot('veld-geoogst', 800);
    const geld1 = w.money;
    uit.kgGeoogst = b.schuur.kg;
    // laden en afleveren
    if (p.inVehicle) p.exitVehicle(map, w); await sleep(300);
    check('uitgestapt', !p.inVehicle, '');
    void geld1;
  }
}

} catch (e) { uit.fouten.push("script: " + String(e && e.stack || e).slice(0, 400)); }
clearInterval(skipper);
hold = null;
const slecht = uit.controles.filter((c) => !c.ok);
return JSON.stringify({ ...uit, controles: uit.controles, mislukt: slecht.map((c) => c.naam), beelden: [{ naam: 'boerderij_wereld' }] });
