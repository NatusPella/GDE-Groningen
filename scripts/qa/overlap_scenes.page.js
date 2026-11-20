// Scènelijst van de overlapdetector (scripts/qa/overlap.mjs zet overlap.page.js hiervoor; desktop --perf-script-body; #985, opdracht 20-11).
// Zet in het echte spel veel HUD-toestanden klaar (te voet, voertuig, doelkaart, tips en toasts tegelijk, politie, missie-intro, minigamebord, ritten,
// ondertitels, filmlaag, telefoon, ontdekking, controller-hints, lange teksten), wacht tot de animaties klaar zijn, en laat ovScan elke toestand meten.
// window.__ov = { naam: <formaatlabel>, only: [scenes], beeld: 'alles'|'fout'|'' , prefix: 'voor'|'na' }
// Uitvoer: een JSON-regel met per scène de bevindingen; [capture] ov-<prefix>-<scène> voor elke scène met een bevinding (met magenta markering).
// Raakt alleen het wegwerpprofiel. Elke synthetische keydown krijgt een keyup.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const OV = window.__ov || {};
const PRE = OV.prefix || 'x';
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const klaar = () => document.body.classList.contains('game-started') && window.__debug && window.__debug.world && window.__debug.world.map && !document.body.classList.contains('intro-montage') && !document.querySelector('#load-screen.on');
const fouten = [];
{
  const oe = console.error.bind(console);
  console.error = (...a) => { fouten.push(a.map(String).join(' ').slice(0, 200)); oe(...a); };
  window.addEventListener('error', (e) => fouten.push('error: ' + String(e.message).slice(0, 200)));
}
const cine0 = await imp('cinematics');
const skipper = setInterval(() => { if (cine0.isCinematicActive() && !window.__ovFilm) cine0.skipCinematic(); }, 100);
await sleep(1500);
if (document.querySelector('#start-screen.visible')) await sleep(2500);
for (let i = 0; i < 240 && !klaar(); i++) {
  if (!document.body.classList.contains('game-started') && document.querySelector('#start-screen.visible')) tap('Enter', 'Enter');
  if (window.__debug && window.__debug.world && window.__debug.world.paused) tap(' ', 'Space');
  await sleep(1000);
}
if (!(window.__debug && window.__debug.world)) return JSON.stringify({ fout: 'geen spel', body: document.body.className });
await sleep(3000);
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
w.devInvuln = true; D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const ss = document.getElementById('start-screen'); if (ss) ss.style.display = 'none';
const { P = (x, y) => [x, y] } = await imp('worldframe').catch(() => ({}));
const ST = await imp('settings');
ST.setSetting('hudMode', 'alles'); // het drukste geval: alle onderdelen zichtbaar
const HC = await imp('hudcards');
const PF = await imp('phonefeed');
const ACH = await imp('achievements');
const VEH = await imp('vehicle');
const ONLY = (OV.only || []).filter(Boolean);
const want = (n) => !ONLY.length || ONLY.includes(n);
const teleport = (x, y) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
  p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
};
const settle = async () => { await sleep(1500); for (let i = 0; i < 60 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500); await sleep(1500); };
const uit = { venster: [innerWidth, innerHeight], scenes: {}, fouten, overgeslagen: [] };
const [x0, y0] = P(100, 77);
teleport(x0, y0); await settle(); await sleep(5500); // de plaatsnaam van de aankomst is dan weg
const opruim = async () => {
  w.goal = null; w.wanted = 0; w.dimHud = false;
  document.body.classList.remove('cine-hide-hud');
  const c = document.getElementById('cine'); if (c) c.classList.remove('active', 'letterbox', 'has-sub', 'has-card', 'show-skip');
  const s = document.getElementById('banter-sub'); if (s) s.style.opacity = '0';
  window.__ovFilm = false;
  for (let i = 0; i < 40 && HC.cardsBusy(); i++) { await sleep(500); if (i === 6) break; }
};
const scene = async (naam, zet, { wacht = 1800, schoon, formaat } = {}) => {
  if (!want(naam)) return;
  try {
    if (p.inVehicle || Math.hypot(p.x - x0, p.y - y0) > 30) { teleport(x0, y0); await settle(); }
    await zet();
    await sleep(wacht);
    const r = ovScan();
    uit.scenes[naam] = r;
    const fout = r.overlap.length + r.buitenBeeld.length + r.afgekapt.length + r.tekstUit.length + r.filmHud.length;
    if (OV.beeld === 'alles' || (OV.beeld !== '' && fout)) {
      const af = ovMarkeer(r.overlap);
      await sleep(200); console.log('[capture] ov-' + PRE + '-' + naam); await sleep(700);
      af();
    }
  } catch (e) { uit.overgeslagen.push(naam + ': ' + (e && e.message)); }
  try { if (schoon) await schoon(); } catch (e) { uit.overgeslagen.push(naam + ' opruimen: ' + (e && e.message)); }
  await opruim();
};
const LANG = 'De gemeente Westerkwartier heeft aangekondigd dat de fietsenstalling bij het station voortaan alleen nog geopend is voor wie een geldig abonnement heeft, behalve op zondag';

// ---- te voet
await scene('voet', async () => { await sleep(2500); });
await scene('voet-doelkaart', async () => { w.goal = { x: p.x + 300, y: p.y + 120, name: 'Café De Sleutel aan de Poelestraat', sub: 'Poelestraat 12, Groningen' }; await sleep(1200); });
await scene('doel-lang', async () => { w.goal = { x: p.x + 300, y: p.y + 120, name: 'Bezoekerscentrum en Informatiepunt Noordelijk Scheepvaartmuseum', sub: LANG.slice(0, 80) }; await sleep(1200); });
// tip + prestatie + toast + telefoon tegelijk, met een doel
await scene('tip-prestatie-toast', async () => {
  w.goal = { x: p.x + 300, y: p.y + 120, name: 'Café De Sleutel', sub: 'Poelestraat' };
  w.addMessage('Tip: met E stap je in een auto.', 12, { kind: 'tip', important: true });
  w.addMessage('Nieuwe streek: Hoogeland. De naam staat nu op je kaart.', 12, { kind: 'prestatie', kicker: 'Verkend', key: 'ov-streek' });
  const id = (ACH.ACHIEVEMENTS || []).map((a) => a.id).find((i) => !ACH.isUnlocked(i)); if (id) ACH.unlockAchievement(w, id);
  PF.notifyPhone(w, { text: 'Rikus: Waar blijf je nou?', from: 'Rikus', app: 'bericht', duration: 12 });
  await sleep(2500);
}, { wacht: 2500 });
await scene('toast-activiteit', async () => { // de Activiteit-kaart links met een lange body en daarna 'Nieuwe streek'
  HC.showCard(w, { kind: 'bijbaan', title: 'Kartbaan Ulrum', bodyHtml: 'Rijd drie rondes.<br>Wie het snelst is, wint de beker.<br>Houd je aan de banen en neem de bochten met verstand.<br>' + LANG.slice(0, 70), duration: 12 });
  w.addMessage('Nieuwe streek: Fivelingo. De naam staat nu op je kaart.', 12, { kind: 'prestatie', kicker: 'Verkend', key: 'ov-streek2' });
  await sleep(2500);
}, { wacht: 2500 });
await scene('geld-politie-kaart', async () => {
  w.wanted = 2;
  w.addMessage('Pas op, de politie let op je.', 10, { kind: 'politie' });
  w.addMessage('Je krijgt € 250 van de buurman.', 10, { kind: 'geld' });
});
await scene('gezocht-3', async () => { w.wanted = 3; await sleep(1200); });
await scene('gezocht-5-zoeken', async () => { w.wanted = 5; if (w.police) w.police.searching = true; await sleep(1200); }, { schoon: async () => { if (w.police) w.police.searching = false; } });
await scene('lange-tip', async () => { w.addMessage(LANG, 12, { kind: 'tip', important: true }); await sleep(1500); });
await scene('lange-melding-geld', async () => { w.addMessage('Je betaalt € 1.250,00 aan Boerderij De Overtocht voor de reparatie van de zware landbouwtrekker en de nieuwe banden', 12, { kind: 'geld' }); await sleep(1500); });
await scene('telefoon-lang', async () => { PF.notifyPhone(w, { text: 'Kiekdoar: ' + LANG, from: 'Kiekdoar', app: 'nieuws', duration: 12 }); await sleep(2500); }, { wacht: 2500 });
await scene('telefoon-gesprek', async () => { PF.startCall(w, { from: 'Rikus', lines: [{ text: 'Hé, met Rikus. Heb je even?' }, { text: 'Kom maar naar de Grote Markt, daar staat een bakfiets met een hele lading.' }] }); await sleep(3500); }, { wacht: 3000, schoon: async () => { if (PF.hangUp) PF.hangUp(); } });
// regelkaart
await scene('regelkaart', async () => {
  const K = await imp('regelkaart');
  const staat = K.startKaart({ kaart: { doel: 'Breng de eieren heel naar de bakker', druk: 'drie minuten', afloop: 'alle eieren stuk: opnieuw', regels: [
    { type: 'limiet', inv: { waarde: 38, limiet: 40, label: 'Snelheid' } }, { type: 'voorraad', inv: { heel: 42, totaal: 60, icoon: 'ei', label: 'Eieren' } }, { type: 'teller', inv: { rest: 40, totaal: 180, label: 'Tijd' } } ] } }, 'ov:eierrit');
  for (let i = 0; i < 3; i++) { K.toonRegelkaart(w, staat, 0.5); staat.t += 0.5; }
  await sleep(1500);
});

// ---- voertuigen
const MOTO = await imp('motomodels');
const rij = async (naam, make, speed, extra = {}) => {
  if (!want(naam)) return;
  let v = null;
  await scene(naam, async () => {
    if (extra.ver) { /* geen sprong */ }
    v = make(); if (!v) throw new Error('geen voertuig');
    v.road = null; v.perfTemp = true; w.vehicles.push(v);
    p.x = v.x; p.y = v.y; p.enterVehicle(v, w);
    if (extra.goal) w.goal = { x: p.x + 400, y: p.y + 100, name: 'Station Groningen', sub: 'Stationsplein' };
    if (extra.wanted) w.wanted = extra.wanted;
    await sleep(800);
    window.__ovHold = setInterval(() => { v.speed = speed; }, 50);
  }, { wacht: 1800, schoon: async () => { clearInterval(window.__ovHold); if (p.inVehicle) p.exitVehicle(map, w); const k = w.vehicles.indexOf(v); if (k >= 0) w.vehicles.splice(k, 1); await sleep(400); } });
};
const opWeg = (e = {}) => () => { const pt = map.nearestRoadPoint(p.x, p.y, 60, true, true); return VEH.spawnVehicleOnRoad(map, pt.road, false, Math.random, false, false, pt, e.scooter || false, e.model || null); };
await rij('auto', opWeg(), 14);
await rij('auto-doel-gps', opWeg(), 12, { goal: true });
await rij('auto-politie', opWeg(), 16, { wanted: 3, goal: true });
await rij('motor', opWeg({ scooter: true, model: MOTO.MOTORBIKE_MODELS.sport }), 6);
if (want('boot')) {
  const poly = map.water && map.water.find((q) => q.bounds && q.bounds[2] - q.bounds[0] > 40);
  if (poly) {
    let v = null;
    await scene('boot', async () => { v = VEH.spawnBoatOnWater(map, poly); v.road = null; v.perfTemp = true; w.vehicles.push(v); p.x = v.x; p.y = v.y; p.enterVehicle(v, w); await settle(); window.__ovHold = setInterval(() => { v.speed = 6; }, 50); },
      { wacht: 1500, schoon: async () => { clearInterval(window.__ovHold); if (p.inVehicle) p.exitVehicle(map, w); const k = w.vehicles.indexOf(v); if (k >= 0) w.vehicles.splice(k, 1); teleport(x0, y0); await settle(); } });
  } else uit.overgeslagen.push('boot: geen water');
}

// ---- minigamebord, activiteiten
const K = await imp('minigamekit');
const bord = async (naam, titel, set) => scene(naam, async () => {
  const b = K.createBoard(titel);
  window.__ovBord = b;
  b.set(set); b.show();
  await sleep(800);
}, { wacht: 1500, schoon: async () => { const b = window.__ovBord; if (b) { b.hide(); b.root.remove(); } window.__ovBord = null; } });
// zoals discgolf.js: het aantal worpen per hole, de huidige met een stip, de rest het nummer
const CELLEN = [{ t: '3', cls: 'good' }, { t: '5', cls: 'bad' }, { t: '·', cls: 'on' }, { t: '4' }, { t: '5' }, { t: '6' }, { t: '7' }, { t: '8' }, { t: '9' }];
await bord('bord-discgolf', 'discgolf', { row: 'Worp <b>3</b> van 9 &middot; Par 3', cells: CELLEN, meter: { v: 0.62, mark: 0.78, text: '62%' }, flash: 'Mooie worp!', help: K.key('SPATIE') + ' werpen &middot; ' + K.key('ESC') + ' stoppen' });
await bord('bord-kart', 'kartbaan', { row: 'Ronde <b>2</b> van 3 &middot; Plek 2 van 4', cells: [{ t: '1', cls: 'good' }, { t: '2', cls: 'on' }, { t: '3' }], meter: { v: 0.4, text: '40%' }, flash: 'Nieuwe snelste ronde!', help: K.key('W') + ' gas &middot; ' + K.key('ESC') + ' stoppen' });
await bord('bord-skatepark', 'skatepark', { row: 'Trucs <b>4</b> &middot; Combo x3', cells: null, flash: 'Mooie combo', help: K.key('SPATIE') + ' springen &middot; ' + K.key('ESC') + ' stoppen' });
await bord('bord-lang', 'discgolf', { row: LANG, cells: CELLEN, meter: { v: 0.3, text: '30%' }, flash: 'Dit is een wel erg lange melding die over het hele bord loopt zonder dat iemand dat bedoeld had', help: K.key('SPATIE') + ' werpen &middot; ' + K.key('ESC') + ' stoppen &middot; ' + K.key('TAB') + ' tussenstand &middot; ' + K.key('H') + ' hulp' });
await scene('bord-discgolf-met-kaarten', async () => {
  const b = K.createBoard('discgolf'); window.__ovBord = b;
  b.set({ row: 'Worp <b>3</b> van 9', cells: CELLEN, meter: { v: 0.5, text: '50%' }, flash: 'Mooie worp!', help: K.key('ESC') + ' stoppen' }); b.show();
  w.addMessage('Tip: een tip tijdens een bord.', 10, { kind: 'tip' });
  w.addMessage('Je krijgt € 20 van de baanwachter.', 10, { kind: 'geld' });
  await sleep(2000);
}, { wacht: 1500, schoon: async () => { const b = window.__ovBord; if (b) { b.hide(); b.root.remove(); } window.__ovBord = null; } });
await scene('keuzepaneel', async () => {
  const C = await imp('choicepanel'); const c = C.createChoicePanel(); window.__ovC = c;
  c.set({ kicker: 'ZAAK 2 VAN 5', text: 'Een fiets staat open op de Grote Markt. Wat doe je?', rule: 'Je krijgt punten voor een eerlijke keuze.', options: [{ key: '1', label: 'Meenemen', cls: 'pick' }, { key: '2', label: 'Doorfietsen', note: 'Eerlijk en rustig', cls: 'good' }, { key: '3', label: 'Aan de politie melden', cls: 'bad' }], meter: { v: 0.4 }, flash: 'Goed gekozen', help: C.keycap('1') + ' tot ' + C.keycap('3') + ' kiezen' });
  c.show(); await sleep(800);
}, { schoon: async () => { const c = window.__ovC; if (c) { c.hide(); c.root.remove(); } } });

// ---- ritten
await scene('taxirit', async () => {
  const M = await imp('reisrit');
  M.startMeerijden(w, { id: 'taxi', etaS: 40, price: 12, label: 'Taxi naar Station', lines: [{ name: 'Taxi' }], stops: [] }, { x: p.x + 160, y: p.y + 160, name: 'Station' });
  await sleep(6000);
}, { wacht: 2500, schoon: async () => { for (let i = 0; i < 60 && document.querySelector('.reisrit, .reisrit3d'); i++) { tap(' ', 'Space'); await sleep(800); } for (let i = 0; i < 60 && document.querySelector('#load-screen.on'); i++) await sleep(800); teleport(x0, y0); await settle(); } });

// ---- ondertitels, cutscene, grote momenten
await scene('ondertitel-banter', async () => {
  let s = document.getElementById('banter-sub');
  if (!s) { s = document.createElement('div'); s.id = 'banter-sub'; Object.assign(s.style, { position: 'fixed', left: '50%', bottom: '27vh', transform: 'translateX(-50%)', width: 'min(86vw, 760px)', textAlign: 'center', font: "clamp(15px, 1.5vw, 20px) 'Arial Narrow', Arial, sans-serif", color: '#fff', pointerEvents: 'none', opacity: '0', transition: 'opacity 0.25s', zIndex: '40' }); s.innerHTML = '<span class="bt-speaker" style="font-weight:bold;margin-right:6px"></span><span class="bt-line"></span>'; document.body.appendChild(s); }
  s.querySelector('.bt-speaker').textContent = 'Tammo:'; s.querySelector('.bt-line').textContent = 'Zeg, dit was niet de afslag naar de Ring, hè? ' + LANG.slice(0, 100); s.style.opacity = '1';
  w.goal = { x: p.x + 300, y: p.y + 120, name: 'Café De Sleutel', sub: 'Poelestraat' };
  await sleep(1200);
});
await scene('cutscene-ondertitel', async () => {
  window.__ovFilm = true;
  const c = document.getElementById('cine'); if (!c) throw new Error('geen #cine');
  c.classList.add('active', 'letterbox', 'has-sub', 'show-skip');
  c.querySelector('.cine-speaker').textContent = 'Tessa:'; c.querySelector('.cine-line').textContent = 'Zullen we eerst een kop koffie nemen, voordat Tammo weer iets stuk maakt?';
  document.body.classList.add('cine-hide-hud');
  await sleep(1200);
}, { wacht: 800 });
await scene('cinekaart', async () => {
  window.__ovFilm = true;
  const c = document.getElementById('cine');
  c.classList.add('active', 'letterbox', 'has-card');
  document.body.classList.add('cine-hide-hud'); // zoals de echte filmlaag (cinematics.js hideHud)
  c.querySelector('.cine-kicker').textContent = 'Woensdag 26 augustus'; c.querySelector('.cine-title').textContent = 'De schuur van Tinus';
  const n = c.querySelector('.cine-name'); n.textContent = 'Tammo'; n.classList.add('visible');
  const sk = c.querySelector('.cine-chip'); sk.textContent = 'Dag 3'; sk.classList.add('visible');
  PF.notifyPhone(w, { text: 'Rikus: Waar blijf je nou?', from: 'Rikus', app: 'bericht', duration: 12 });
  await sleep(1500);
}, { wacht: 1000, schoon: async () => { const c = document.getElementById('cine'); c.querySelector('.cine-name').classList.remove('visible'); c.querySelector('.cine-chip').classList.remove('visible'); } });
await scene('missie-intro', async () => {
  window.__ovFilm = true;
  cine0.playMissionIntro(w, { title: 'De bakfiets', kicker: 'MISSIE 3', lines: ['Tammo heeft weer iets verzonnen.', 'Haal de bakfiets bij de Grote Markt op.'], objective: { x: p.x + 80, y: p.y + 40 }, duration: 6 });
  await sleep(2500);
}, { wacht: 1000, schoon: async () => { cine0.skipCinematic && cine0.skipCinematic(); await sleep(1000); } });
await scene('banner-missie-geslaagd', async () => {
  cine0.showBanner({ kind: 'pass', title: 'Missie geslaagd', reason: 'Ze hebben je niet gezien.', reward: 800, stats: [['Tijd', '2:41'], ['Schade', '€ 40']] });
  w.addMessage('Je krijgt € 800.', 8, { kind: 'geld' });
  await sleep(1500);
}, { wacht: 1000, schoon: async () => { await sleep(500); } });
await scene('wijkkaart', async () => { cine0.showWijkCard(w, { name: 'Metalenkwartier' }); await sleep(1600); }, { wacht: 600 });
await scene('wijkkaart-met-kaarten', async () => {
  w.addMessage('Tip: met E stap je in een auto.', 12, { kind: 'tip', important: true });
  w.addMessage('Nieuwe streek: Hoogeland. De naam staat nu op je kaart.', 12, { kind: 'prestatie', kicker: 'Verkend', key: 'ov-streek3' });
  cine0.showWijkCard(w, { name: 'Oostergast' }); await sleep(1600);
}, { wacht: 800 });

// ---- controller-hints en lange hints
await scene('pad-hints', async () => {
  ST.setSetting('hintSource', 'pad');
  w.goal = { x: p.x + 300, y: p.y + 120, name: 'Café De Sleutel', sub: 'Poelestraat' };
  await sleep(1500);
}, { schoon: async () => { ST.setSetting('hintSource', 'auto'); } });
await scene('pad-hints-auto', async () => {
  ST.setSetting('hintSource', 'pad');
  w.addMessage('Tip: houd ' + '{SPRINT}' + ' ingedrukt om te sprinten en druk op {E} om in te stappen.', 12, { kind: 'tip', important: true });
  await sleep(1500);
}, { schoon: async () => { ST.setSetting('hintSource', 'auto'); } });

clearInterval(skipper);
return JSON.stringify(uit);
