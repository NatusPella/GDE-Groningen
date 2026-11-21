// Page half van scripts/qa/menufoto.mjs (desktop --perf-script body; beeldopdracht 21-11 voor feedback van de eigenaar).
// Maakt per scherm een beeld van de menu's en HUD-onderdelen die in de ronde na 0.64.0 zijn aangepast. Wijzigt geen spelcode.
// window.__mf = { size: '1920x1080', sets: ['esc','kaart','samen','hud','laad','reis','duif','bench'], kern: false }.
// Elke set draait in een eigen try, zodat één scherm dat omvalt de andere niet tegenhoudt. Alleen het wegwerpprofiel wordt geraakt;
// elke synthetische keydown krijgt een keyup.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const CFG = window.__mf || { size: '1920x1080', sets: ['esc'], kern: false };
const SIZE = CFG.size;
const wil = (s) => CFG.sets.includes(s);
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const laadt = () => !!document.querySelector('#loading:not([hidden]):not(.done), .ls.on:not(.out)');
const klaar = () => document.body.classList.contains('game-started') && window.__debug && window.__debug.world && window.__debug.world.map && !laadt();
const done = [];
const notities = {};
for (let i = 0; i < 240 && !klaar(); i++) {
  if (!document.body.classList.contains('game-started')) tap('Enter', 'Enter');
  if (window.__debug && window.__debug.world && window.__debug.world.paused) tap(' ', 'Space');
  await sleep(1000);
}
await sleep(3000);
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const cine = await imp('cinematics'); const PM = await imp('pausemenu'); const MV = await imp('mapview');
const { P } = await imp('worldframe');
const skipOpening = async () => { for (let i = 0; i < 40 && cine.isCinematicActive(); i++) { cine.skipCinematic(); await sleep(250); } };
await skipOpening();
w.devInvuln = true; D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
await document.fonts.ready;
const cap = async (name, wait = 1500) => { await sleep(wait); console.log('[capture] ' + name + '-' + SIZE.split('x')[0]); await sleep(900); done.push(name); };
const probeer = async (naam, fn) => { try { await fn(); } catch (e) { done.push(naam + ' FOUT ' + (e && e.message)); try { PM.closePauseMenu(); } catch (e2) { /* niet open */ } } };
const sluit = async () => { try { PM.closePauseMenu(); } catch (e) { /* niet open */ } await sleep(700); };
const teleport = (x, y) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
  p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
};
const settle = async () => { await sleep(1500); for (let i = 0; i < 60 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500); await sleep(2500); };
// vaste dag, helder weer, klok op een prettig uur: zo zijn de beelden onderling vergelijkbaar
const DN = await imp('daynight');
const vast = () => { w.clock = 13; w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity }; if (DN.refreshDayNight) DN.refreshDayNight(w); };
vast(); setInterval(vast, 800);
const STADS = P(100, 77);
teleport(...STADS);
await settle();

// ---------- 1. Escape-menu ----------
if (wil('esc')) {
  const tabs = CFG.kern
    ? [['04-escape-loopbanen', 'loopbaan'], ['06-escape-spullen', 'spullen'], ['08-escape-boerderij', 'boerderij']]
    : [['01-escape-overzicht', 'spel', { sub: 'overzicht' }], ['02-escape-verhaal', 'verhaal'], ['03-escape-activiteiten', 'todo'], ['04-escape-loopbanen', 'loopbaan'],
      ['06-escape-spullen', 'spullen'], ['07-escape-garage', 'garage'], ['08-escape-boerderij', 'boerderij'], ['09-escape-veroverd', 'veroverd'], ['10-escape-prestaties', 'prestaties'],
      ['11-escape-fotos', 'fotos'], ['12-escape-instellingen-beeld', 'settings', { sub: 'video' }], ['13-escape-instellingen-camera-terugkeerscene', 'settings', { sub: 'camera' }],
      ['14-escape-cheats', 'streken'], ['15-escape-besturing-toetsen', 'controls', { sub: 'toetsen' }], ['16-escape-besturing-toetsenoverzicht', 'controls', { sub: 'overzicht' }],
      ['17-escape-besturing-controller', 'controls', { sub: 'knoppen' }]];
  for (const [naam, tab, opts] of tabs) await probeer(naam, async () => { PM.openPauseMenu(tab, opts || {}); await cap(naam, 1800); await sluit(); });
}

// ---------- 2. Kaart ----------
if (wil('kaart')) await probeer('kaart', async () => {
  teleport(...STADS); await settle();
  MV.vergeetKaartUitleg();
  for (const k of Object.keys(localStorage)) if (/uitleg|mapview|kaartuitleg/i.test(k) && !/gde-save-v1|gde-settings|gde-prestaties-v1/.test(k)) localStorage.removeItem(k);
  PM.openPauseMenu('map'); await sleep(3500);
  notities.uitleg = !!document.querySelector('.mv-help');
  await cap('24-kaart-zo-werkt-de-kaart-open', 800);
  for (const b of document.querySelectorAll('button')) if (/begrepen/i.test(b.textContent)) { b.click(); await sleep(900); }
  notities.uitlegNaSluiten = !!document.querySelector('.mv-help');
  for (const [nr, z] of [[20, 1], [21, 3], [22, 6]]) { MV.setMapView(p.x, p.y, z); await sleep(8000); await cap(nr + '-kaart-zoom-' + z, 1200); }
  MV.setMapView(p.x, p.y, 3); await sleep(4000);
  const lagen = document.querySelector('.mv-layers'); if (lagen) { lagen.click(); await sleep(1200); }
  await cap('23-kaart-lagenpaneel', 1500);
  if (lagen) { lagen.click(); await sleep(600); }
  await cap('25-kaart-zo-werkt-de-kaart-gesloten', 600);
  await sluit(); await sleep(1500);
  await cap('26-minikaart-hud', 3000);
});

// ---------- 3. Spelersmenu en Samen spelen ----------
if (wil('samen')) {
  const px = p.x, py = p.y;
  const rooster = [
    { slot: 0, avatar: { naam: 'Tammo', kleur: '#4fb3ff' }, verbinding: 'ok' }, { slot: 1, avatar: { naam: 'Rik', kleur: '#f2b134' }, verbinding: 'ok' },
    { slot: 2, avatar: { naam: 'Sanne', kleur: '#5bd6a0' }, verbinding: 'lag' }, { slot: 3, avatar: { naam: 'Bram', kleur: '#b78cff' }, verbinding: 'lost' },
  ];
  const rijen = (rol) => rooster.map((r) => ({
    slot: r.slot, naam: r.avatar.naam, kleur: r.avatar.kleur, vorm: { 0: 'driehoek', 1: 'vierkant', 2: 'cirkel', 3: 'vijfhoek' }[r.slot], jij: rol === 'host' ? r.slot === 0 : r.slot === 1,
    verbinding: r.verbinding, verbindingTekst: { ok: 'goed', lag: 'haperd', lost: 'weg' }[r.verbinding], ms: { 0: null, 1: 34, 2: 180, 3: null }[r.slot],
    passief: r.slot !== 1, pvpInSpel: true, groep: r.slot === 0 ? 'leidt Het Loket' : '', leidt: r.slot === 0, doet: ['te voet', 'in een voertuig', 'aan het stuur', 'onbekend'][r.slot],
    afstand: [null, 40, 420, null][r.slot], afstandTekst: ['', 'bij je', '420 m', ''][r.slot] || (r.slot === 1 ? '40 m' : ''), x: r.slot === 3 ? null : px + 40 * r.slot, y: r.slot === 3 ? null : py - 30 * r.slot,
  }));
  const maakSessie = (rol) => {
    const hub = { roster: { max: 4, spelers: rooster }, cfg: {}, publiek: () => null, announce() {}, tick() {}, release() {}, zetOpenbaar: () => ({ ok: true }), on() {}, off() {} };
    w.coopSolo = false; w.coopRole = rol; w.coopPvp = { aan: true, passief: {} };
    w.coopRoster = rooster; w.coopSpelers = rijen(rol);
    w.coopNet = rol === 'host' ? { role: 'host', hub, route: 'kamer', info: {}, removing: {} } : { role: 'client', route: 'kamer', session: { slot: 1, caps: ['pvp'], welcome: { max: 4, lijst: rooster }, sendEvent: () => true, setInput() {} }, info: {} };
  };
  const weg = () => { w.coopNet = null; w.coopRole = null; w.coopSpelers = []; };
  const esc2 = async () => { tap('Escape', 'Escape'); await sleep(400); tap('Escape', 'Escape'); await sleep(600); };
  await probeer('samen-zonder', async () => { PM.openPauseMenu('samen'); await sleep(1800); await cap('30-samen-keuze-zonder-sessie', 600); await esc2(); });
  await probeer('samen-host', async () => { maakSessie('host'); await sleep(300); PM.openPauseMenu('samen'); await sleep(1800); await cap('31-samen-wachtkamer-host', 600); await esc2(); weg(); });
  await probeer('spelers-host', async () => {
    maakSessie('host'); await sleep(300); PM.openPauseMenu('spelers'); await sleep(1800); await cap('32-samen-spelerslijst-host', 600);
    const k = document.querySelector('#pause-menu .cs-eruit'); if (k) { k.click(); await sleep(700); await cap('33-samen-spelerslijst-verwijder-bevestig', 400); }
    await esc2(); weg();
  });
  await probeer('gast', async () => {
    maakSessie('gast'); await sleep(300);
    PM.openPauseMenu('samen'); await sleep(1800); await cap('34-samen-wachtkamer-gast', 600); await esc2();
    PM.openPauseMenu('spelers'); await sleep(1800); await cap('35-samen-spelerslijst-gast', 600); await esc2(); weg();
  });
  await probeer('tab', async () => {
    maakSessie('host'); await sleep(300);
    const U = await imp('coopspelersui'); w.paused = false; w.uiPaused = false;
    await cap('36-hud-samen-sessie-zonder-tab', 2500);
    const oud = w.input.isDown; w.input.isDown = (k) => k === 'tab' || (oud && oud.call(w.input, k));
    U.updateSpelersOverlay(w); await sleep(300); U.updateSpelersOverlay(w); await cap('37-hud-spelers-overlay-tab-hint', 800);
    w.input.isDown = oud; U.updateSpelersOverlay(w); weg();
  });
}

// ---------- 6. HUD ----------
if (wil('hud') || wil('hud2')) {
  await sluit(); w.uiPaused = false; w.paused = false;
  const VEH = await imp('vehicle');
  const HC = await imp('hudcards'); const PF = await imp('phonefeed');
  if (wil('hud')) await probeer('hud-voet', async () => { teleport(...STADS); await settle(); await cap('50-hud-te-voet', 3000); });
  if (wil('hud')) await probeer('hud-auto', async () => {
    teleport(...STADS); await sleep(800);
    const pt = map.nearestRoadPoint(p.x, p.y, 60, true, true);
    const v = VEH.spawnVehicleOnRoad(map, pt.road, false, Math.random, false, false, pt, false, null);
    if (!v) { done.push('51 geen voertuig'); return; }
    v.road = null; v.perfTemp = true; w.vehicles.push(v); p.x = v.x; p.y = v.y; p.enterVehicle(v, w); await sleep(900);
    const houd = setInterval(() => { v.speed = 14; }, 50);
    await cap('51-hud-rijden-compacte-snelheidsmeter', 800);
    w.wanted = 3; await cap('52-hud-rijden-politie-wanted-minikaartlabel', 2500); w.wanted = 0;
    clearInterval(houd); p.exitVehicle(map, w); const i = w.vehicles.indexOf(v); if (i >= 0) w.vehicles.splice(i, 1);
  });
  if (wil('hud')) await probeer('hud-wanted-voet', async () => { teleport(...STADS); await sleep(1500); w.wanted = 3; await cap('53-hud-te-voet-politie-wanted', 2500); w.wanted = 0; });
  const NIEUWS = 'Een snelle auto en drie politiewagens maken een rondje Groningen. Het verkeer vraagt vriendelijk om ruimte voor iedereen die vandaag onderweg is, ook als het even later wordt.';
  if (wil('hud')) await probeer('hud-telefoon', async () => { PF.notifyPhone(w, { text: 'Kiekdoar: ' + NIEUWS, from: 'Kiekdoar', app: 'nieuws', duration: 8 }); await cap('54-hud-telefoon-nieuws-lange-kop', 2500); await sleep(9000); });
  await probeer('hud-kaarten', async () => {
    HC.showCard(w, { kind: 'tip', kicker: 'Tip', title: 'Tip: ruimte voor iedereen', body: 'Houd Shift ingedrukt om te sprinten en laat los om adem te halen.', duration: 9, key: 'mf-tip', voice: false });
    HC.showCard(w, { kind: 'missie', kicker: 'Missie', title: 'Een kleine gunst voor Tammo', body: 'Breng het pakket naar de Grote Markt.', duration: 9, key: 'mf-missie', voice: false });
    HC.showCard(w, { kind: 'geld', kicker: 'Geld', title: 'Betaald', body: 'Je ontvangt € 120.', duration: 9, key: 'mf-geld', voice: false });
    await cap('55-hud-kaarten-tip-missie-geld', 2600); await sleep(9500);
  });
  await probeer('hud-hints', async () => {
    teleport(...STADS); await sleep(800);
    const pt = map.nearestRoadPoint(p.x, p.y, 60, true, true);
    const v = VEH.spawnVehicleOnRoad(map, pt.road, false, Math.random, false, false, pt, false, null);
    if (v) { v.road = null; v.perfTemp = true; v.speed = 0; w.vehicles.push(v); p.x = v.x + 2.6; p.y = v.y; await sleep(2500); }
    await cap('56-hud-toetshints-instappen', 1500);
    if (v) { const i = w.vehicles.indexOf(v); if (i >= 0) w.vehicles.splice(i, 1); }
  });
}

// ---------- 5. Laadscherm ----------
if (wil('laad')) await probeer('laad', async () => {
  await sluit();
  const LS = await imp('loadscreen'); const LL = await imp('loadlogic');
  teleport(...STADS); await settle();
  const maak = async (soort, naamBestemming, nr) => {
    const act = LS.startLoadScreen(w, { kind: soort, name: naamBestemming });
    await sleep(500);
    const kloon = act.el.cloneNode(true); kloon.id = 'ls-foto'; kloon.classList.add('on'); kloon.classList.remove('out'); kloon.style.zIndex = '99999';
    document.body.appendChild(kloon); act.el.style.visibility = 'hidden';
    const stappen = soort === 'snel' ? [{ bar: 0.3 }] : LL.LOAD_STEPS.map((s, i) => ({ bar: Math.min(0.97, s.from + 0.1 + (i === 0 ? 0 : 0)) }));
    let i = 0;
    for (const s of stappen) {
      const st = LL.loadStepAt(s.bar, soort), n = LL.loadStepNr(s.bar, soort);
      const fill = kloon.querySelector('.ls-bar i'); if (fill) fill.style.transform = 'scaleX(' + s.bar + ')';
      const te = kloon.querySelector('.ls-step'); if (te) te.textContent = n.total > 1 ? `Stap ${n.nr} van ${n.total}: ${st.label}` : st.label;
      const tipB = kloon.querySelector('.ls-tip'); if (tipB) tipB.hidden = false;
      const skip = kloon.querySelector('.ls-skip'); if (skip) skip.hidden = i < stappen.length - 1;
      await cap(`${nr + i}-laadscherm-${soort}-stap-${i + 1}`, 700); i++;
    }
    kloon.remove(); act.el.style.visibility = '';
    await Promise.race([act.done, sleep(25000)]);
    await sleep(1500);
  };
  await maak('save', 'Het Forum', 70);
  await maak('snel', 'De Grote Markt', 75);
  notities.laadnoot = 'laadscherm: de balk en stap per beeld handmatig gezet op een kopie van het echte scherm (echte stapteksten uit loadlogic); het eerste laadscherm (boot) staat in boot-NN.png';
});

// ---------- 7. Reizen: kaart-reisopties, taxi, trein ----------
if (wil('reis')) {
  const RK = await imp('reiskaart'); const RR = await imp('reisrit');
  const index = await fetch('/world/index-provincie.json').then((r) => r.json()).then((j) => j.global);
  const plaats = (n) => index.places.find((x) => x.name === n);
  const van = plaats('Groningen') || index.places[0];
  await probeer('reisopties', async () => {
    teleport(...STADS); await settle();
    const dest = plaats('Winsum') || plaats('Zuidhorn') || index.places[5];
    const toets = (type, el, x, y) => el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
    for (const [nr, wanted, naam] of [[60, 2, 'taxi-uitgeschakeld-met-reden'], [61, 0, 'taxi-beschikbaar']]) {
      w.wanted = wanted;
      PM.openPauseMenu('map'); await sleep(2500);
      for (const b of document.querySelectorAll('button')) if (/begrepen/i.test(b.textContent)) { b.click(); await sleep(600); }
      MV.setMapView(dest.x, dest.y, 3); await sleep(5000);
      const cv = document.querySelector('.mapview-canvas'); const r = cv.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      toets('mousedown', cv, x, y); toets('mouseup', window, x, y); await sleep(1200);
      const reis = document.querySelector('.mv-card [data-card="reis"], [data-card="reis"]');
      if (reis) { reis.click(); await sleep(1200); }
      notities['reiskaart' + nr] = { kaart: !!document.querySelector('.mv-card:not([hidden])'), reisKnop: !!reis, tekst: ((document.querySelector('.mv-card') || {}).innerText || '').replace(/\s+/g, ' ').slice(0, 400) };
      await cap(nr + '-kaart-reisopties-' + naam, 800);
      await sluit(); w.wanted = 0;
    }
  });
  const rit = async (soort, naam, nr, momenten) => {
    const dest = plaats(naam); if (!dest) { done.push(soort + ' geen plaats ' + naam); return; }
    if (p.inVehicle) p.exitVehicle(map, w);
    p.x = van.x; p.y = van.y; p.vx = p.vy = 0; p.z = 0; p.vz = 0; w.money = 900; w.wanted = 0;
    await sleep(6000);
    const o = RK.reisOptiesVoor(w, { x: dest.x, y: dest.y, name: dest.name }).find((q) => q.id === soort);
    if (!o) { done.push(soort + ' geen optie'); return; }
    let uitkomst = null; const t0 = performance.now();
    RR.startMeerijden(w, o, { x: dest.x, y: dest.y, name: dest.name }).then((r) => { uitkomst = r; });
    const lijst = [...momenten]; let i = 0;
    while (!uitkomst && (performance.now() - t0) / 1000 < 60) {
      const s = (performance.now() - t0) / 1000;
      if (lijst.length && s >= lijst[0]) { lijst.shift(); await cap(`${nr + i}-${soort}rit-${Math.round(s)}s`, 100); i++; }
      await sleep(100);
    }
    notities[soort + 'rit'] = { uitkomst: String(uitkomst), duur: Math.round((performance.now() - t0) / 1000) };
    await sleep(2500);
  };
  await probeer('taxirit', () => rit('taxi', 'Winsum', 62, [3, 6.5, 10]));
  await probeer('treinrit', () => rit('trein', 'Delfzijl', 66, [4, 9, 14]));
  teleport(...STADS); await sleep(3000);
}

// ---------- 8. Duivenspot-HUD ----------
if (wil('duif')) await probeer('duif', async () => {
  const MQ = await imp('missionquery'); const MS = await imp('missions');
  teleport(...STADS); await settle();
  const i = MQ.getMissionDefs().findIndex((d) => d.label === 'Kieken van boven');
  if (i < 0) { done.push('duif: missie niet gevonden'); return; }
  for (let k = 0; k < 60 && !MQ.getMissionDefs()[i].start; k++) await sleep(500);
  notities.duifGestart = MS.missionDebug.start(w, i);
  for (let k = 0; k < 120 && !(D.pigeon && w.pigeonMode && !w.pigeonIntro); k++) await sleep(500);
  await sleep(3500);
  const lm = (map.meta.landmarks || []).find((l) => l.name === 'Groninger Museum');
  const PG = D.pigeon && D.pigeon.P;
  if (!lm || !PG) { done.push('duif: geen museum of duif'); return; }
  const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
  let houd = null;
  const tick = () => { if (houd && PG) { PG.x = houd.x; PG.y = houd.y; PG.z = houd.z; PG.speed = 11; PG.yaw = houd.yaw; } requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const zet = (x, y, hoog) => { PG.x = x; PG.y = y; PG.z = gh(x, y) + hoog; PG.mode = 'fly'; PG.speed = 11; PG.pitch = 0; PG.yaw = Math.atan2(lm.y - y, lm.x - x); p.x = x; p.y = y; houd = { x, y, z: PG.z, yaw: PG.yaw }; };
  zet(lm.x - 60, lm.y + 260, 45); await sleep(9000); await cap('80-duivenspot-hud-ver', 600);
  zet(lm.x - 20, lm.y + 95, 38); await sleep(3500); await cap('81-duivenspot-hud-dichtbij-museum', 600);
  houd = null;
});

// ---------- 4. Benchmark ----------
if (wil('bench')) {
  await probeer('bench-instellingen', async () => {
    teleport(...STADS); await settle();
    PM.openPauseMenu('settings', { sub: 'video' }); await sleep(1800);
    const b = [...document.querySelectorAll('#pause-menu button')].find((x) => /benchmark|meting/i.test(x.textContent));
    if (b) { b.scrollIntoView({ block: 'center' }); await sleep(600); }
    notities.benchKnop = b ? b.textContent.trim() : null;
    await cap('40-benchmark-start-in-instellingen-beeld', 600); await sluit();
  });
  await probeer('bench-lopend', async () => {
    const T = await imp('trailer');
    const pr = T.runTrailer(w, { mode: 'benchmark', cut: 'bench', shot: 1, env: {} });
    await sleep(6000); await cap('41-benchmark-lopend', 300);
    tap('Escape', 'Escape'); await Promise.race([pr, sleep(20000)]); await sleep(2500);
    try { await T.fadeOutTrailer(false); } catch (e) { /* al weg */ }
    document.body.classList.remove('trailer-on');
  });
  await probeer('bench-resultaat', async () => {
    const B = await imp('benchstats'); const T = await imp('trailer');
    const stats = (fps) => Array.from({ length: 240 }, (_, i) => 1000 / fps + (i % 40 === 0 ? 25 : 0) + (i % 7));
    const shots = B.BENCH_ROUTE.map(([id], i) => ({ id, label: id, ms: stats(i % 3 === 0 ? 38 : 62) }));
    const all = shots.flatMap((s) => s.ms); const fs = B.frameStats(all); const mean = all.reduce((a, b) => a + b, 0) / all.length;
    const res = { stats: { avg: 1000 / mean, low: fs.low1, low1: fs.low1, p95: fs.p95, slow33: fs.slow33, hitches: B.routeHitches(shots), cats: B.categoryStats(shots), memory: 310, heaviest: null, frames: all.length, shots: [], spikes: [0, 0, 0] } };
    document.body.classList.add('trailer-on');
    const pr = T.showBenchmarkResults(res); await sleep(1500);
    const kaart = document.getElementById('trailer-result');
    notities.benchKnoppen = kaart ? [...kaart.querySelectorAll('button')].map((x) => x.textContent.trim()) : null;
    await cap('42-benchmark-resultaatscherm', 600);
    if (kaart) { kaart.scrollTop = kaart.scrollHeight; const inner = kaart.querySelector('.tr-res, .tr-card, div'); if (inner) inner.scrollTop = inner.scrollHeight; await sleep(500); }
    await cap('43-benchmark-resultaatscherm-onderkant-knoppen', 400);
    if (kaart && kaart.querySelector('[data-act="back"]')) kaart.querySelector('[data-act="back"]').click();
    await Promise.race([pr, sleep(2500)]); document.body.classList.remove('trailer-on');
  });
}
return JSON.stringify({ size: SIZE, done, notities });
