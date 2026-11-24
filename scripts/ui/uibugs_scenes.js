// Beeldcontrole van de UI-bugs van 24-11 (#1228, #1222, #1200, #1182, #1189, #1198, #1075): per issue een paar schermen in de
// echte app, voor en na een wijziging. Draait als --perf-script via scripts/qa/uibugs_beeld.mjs (electronrunner: slot, wegwerpprofiel).
// '[capture] <naam>' maakt een screenshot (<size>-<naam>.png); '[uibugs] <json>' is wat een scene mat. Een scene die faalt stopt de rest niet.
// Samen spelen: alles lokaal in één spel; er gaat niets over het netwerk.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const ONLY = (window.__shotsOnly || '').split(',').filter(Boolean);
const loading = () => document.querySelector('.ls.on:not(.out)');
const ready = () => window.__debug && window.__debug.world && window.__debug.world.map && document.body.classList.contains('game-started') && !loading();
const report = [];

for (let i = 0; i < 240 && !ready(); i++) { if (!document.body.classList.contains('game-started') && i % 8 === 7) tap('Enter', 'Enter'); await sleep(1000); }
const cine = await imp('cinematics');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
for (let i = 0; i < 40 && cine.isCinematicActive(); i++) await sleep(250);
for (let k = 0; k < 8 && window.__debug.world.paused; k++) { tap(' ', 'Space'); await sleep(700); }
await sleep(3000);
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
w.devInvuln = true; D.input.canLock = () => false; if (document.pointerLockElement) document.exitPointerLock();
const PM = await imp('pausemenu'); const SHUI = await imp('shopui');
const { P } = await imp('worldframe'); const DN = await imp('daynight');
const stad = P(100, 77);
const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
const fix = (hour = 14) => { w.clock = hour; w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity }; if (DN.refreshDayNight) DN.refreshDayNight(w); };
let ev = null;
const shot = async (name, wait = 1200) => { await sleep(wait); fix(); console.log('[capture] ' + name); ev.shots.push(name); await sleep(700); };
const meet = (k, v) => { ev.metrics[k] = v; };
const rect = (sel) => { const e = typeof sel === 'string' ? document.querySelector(sel) : sel; if (!e || e.offsetParent === null && getComputedStyle(e).position !== 'fixed') return null; const r = e.getBoundingClientRect(); return r.width ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null; };
const sluit = async () => { for (let i = 0; i < 3; i++) { tap('Escape', 'Escape'); await sleep(300); } try { PM.closePauseMenu(); } catch (e) { /* weg */ } try { SHUI.closeShopMenu({ save: false }); } catch (e) { /* weg */ } await sleep(400); };
const jump = async (x, y, settle = 5000) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = p.vy = 0; p.z = 0; p.vz = 0;
  for (let i = 0; i < 40 && !loading(); i++) await sleep(100);
  for (let i = 0; i < 400 && loading(); i++) await sleep(100);
  await sleep(settle); p.x = x; p.y = y; p.gz = gh(x, y); fix();
};
const SCENES = [];
const scene = (id, run) => SCENES.push({ id, run });

// #1228: de keuzekaarten in een lopend spel (zonder laadscherm) horen in het midden te staan
scene('1228', async () => {
  await jump(...stad, 3000);
  const kaart = () => rect('.os-overlay .os-kaart, .os-overlay [class*="kaart"], .os-overlay > *');
  const LC = await imp('launchchoiceui');
  LC.openLaunchChoice({ index: 0 }); await shot('1228-startkeuze', 1200); meet('startkeuze', kaart()); tap('Escape', 'Escape'); await sleep(600);
  const Q = await imp('quitconfirmui'); Q.askQuitConfirm({ onYes: () => {}, onNo: () => {} }); await shot('1228-afsluiten', 900); meet('afsluiten', kaart()); tap('Escape', 'Escape'); await sleep(600);
  const L = await imp('legacysavecardui'); L.askLegacyCard({}); await shot('1228-oudspel', 900); meet('oudspel', kaart()); tap('Escape', 'Escape'); await sleep(600);
  const DU = await imp('difficultyui'); DU.openDifficultyCard({}); await shot('1228-moeilijkheid', 900); meet('moeilijkheid', kaart()); tap('Escape', 'Escape'); await sleep(600);
  LC.openToestemming({}); await shot('1228-toestemming', 900); meet('toestemming', kaart()); tap('Escape', 'Escape'); await sleep(600);
  const OC = await imp('onlineconsentui'); OC.openOnlineStart({ naam: '', terug: true }); await shot('1228-naamkaart', 900); meet('naamkaart', kaart());
  const terug = document.querySelector('[data-terug]'); if (terug) terug.click(); else tap('Escape', 'Escape'); await sleep(600);
  for (const e of document.querySelectorAll('.os-overlay')) e.remove();
});
// #1222: Samen spelen, Waar speel je
scene('1222', async () => {
  // met een naam (wegwerpprofiel), anders opent eerst de naamkaart in plaats van Waar speel je
  // met naam en akkoord in het wegwerpprofiel, anders komt eerst de naam- of toestemmingskaart. Er wordt niets gekozen, dus er
  // start geen sessie; de webrunner blokkeert bovendien elke host behalve 127.0.0.1
  const S = await imp('settings'); S.setSetting('onlineNaam', 'Proefspeler'); S.setSetting('onlineMeedoen', true); S.setSetting('multiplayerConsentRemembered', true); await sleep(300);
  PM.openPauseMenu('samen'); await shot('1222-samen', 1800);
  meet('stapZichtbaar', [...document.querySelectorAll('.pm-hub *')].some((e) => e.children.length === 0 && e.offsetParent !== null && /Stap \d van \d/.test(e.textContent || '') && !e.closest('.pm-sr')));
  await sluit();
});
// #1200: Instellingen, tabbalk, beschrijvingen en de kop Hulp
scene('1200', async () => {
  PM.openPauseMenu('settings', { sub: 'a11y' }); await shot('1200-toegankelijkheid', 1800);
  const sc = document.querySelector('[data-panel="settings"] .m-main, [data-panel="settings"] .pm-inner'); if (sc) { sc.scrollTop = sc.scrollHeight; await sleep(300); }
  await shot('1200-toegankelijkheid-onder', 600);
  const tabs = [...document.querySelectorAll('[data-of="settings"][data-subtab]')].map((b) => rect(b)).filter(Boolean);
  meet('tabRijen', new Set(tabs.map((r) => r.y)).size); meet('tabHoogte', tabs.length ? tabs[0].h : null);
  await sluit();
  PM.openPauseMenu('controls', { sub: 'hulp' }); await shot('1200-hulp', 1800); await sluit();
});
// #1182: een plaatsstempel die al in beeld staat, mag niet over een kaart of pauzemenu hangen
scene('1182', async () => {
  const zichtbaar = () => [...document.querySelectorAll('.bm, #wijk-card.on')].filter((e) => { const st = getComputedStyle(e); return st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity) > 0.05 && e.getBoundingClientRect().width > 0; }).length;
  // een echte verre sprong naar een dorp dat je nog niet zag: de plaatsstempel komt vanzelf (cinematics.js checkWijk)
  const doelen = [[-19954, 8661], [42473, 22807], [2776, -20413]];
  let gezien = 0;
  for (const [x, y] of doelen) {
    await jump(x, y, 500);
    for (let i = 0; i < 80 && !(gezien = zichtbaar()); i++) await sleep(100);
    if (gezien) break;
  }
  meet('stempelVoor', gezien);
  await shot('1182-stempel', 100);
  PM.openPauseMenu('map'); await shot('1182-kaart', 900); meet('stempelOverKaart', zichtbaar()); await sluit();
});
// #1189: 'Fluit een duif' met een doel in beeld (te voet), en het duivenplaatje in een trekker
scene('1189', async () => {
  const PS = await imp('pigeonspots');
  const spots = PS.getPigeonSpotsForRender ? PS.getPigeonSpotsForRender() : [];
  let s = null, bd = 1e9; for (const q of spots || []) { const d = Math.hypot(q.x - stad[0], q.y - stad[1]); if (d < bd) { bd = d; s = q; } }
  meet('spot', s ? { x: Math.round(s.x), y: Math.round(s.y), d: Math.round(bd) } : null);
  await jump(...stad, 4000);
  try { window.__goal.set({ kind: 'waypoint', x: stad[0] + 400, y: stad[1] + 300, name: 'Nul krassen, vijftienhonderd punten' }); } catch (e) { meet('doel', e.message); }
  await shot('1189-tevoet', 2500);
  meet('prompt', rect('.hud-prompt, .wprompt, [class*="prompt"].on'));
  meet('doelbalk', rect('#hud .hud-mission'));
  const VH = await imp('vehicle');
  const v = new VH.Vehicle(p.x + 3, p.y, 0, { ...VH.TRACTOR_MODEL }); v.speed = 0; w.vehicles.push(v);
  try { p.enterVehicle(v, w); } catch (e) { meet('instappen', e.message); }
  await shot('1189-trekker', 2500);
  try { p.exitVehicle(map, w); } catch (e) { /* weg */ }
  const k = w.vehicles.indexOf(v); if (k >= 0) w.vehicles.splice(k, 1);
  try { window.__goal.clear(); } catch (e) { /* weg */ }
});
// #1198: spraakbubbels bij een nieuwskaart, aan de rand van het beeld en bij sprekers op verschillende hoogte
scene('1198', async () => {
  await jump(...stad, 3000);
  const MG = await imp('minigamekit'); const PF = await imp('phonefeed');
  PF.notifyPhone(w, { from: 'Kiekdoar', app: 'sikkom', text: 'KIEKDOAR: Het Noorderplantsoen ligt vol kleedjes, speakers en wegwerpbarbecues.' });
  const yaw = p.angle || p.heading || 0; const fx = Math.cos(yaw), fy = Math.sin(yaw), rx = -fy, ry = fx;
  const at = (f, r) => ({ x: p.x + fx * f + rx * r, y: p.y + fy * f + ry * r });
  const sp = [[8, -9, 'Links', 'Moi, nog een bakkie?'], [9, 0, 'Midden', 'Hej, kiek uut!'], [9, 1.2, 'Buur', 'Ja, lekker weertje!'], [7, 12, 'Rechts', 'Politie? Der wordt hier een auto jat!']];
  for (const [f, r, name, text] of sp) { const q = at(f, r); MG.bubble(w, { x: q.x, y: q.y, name, text, ttl: 30, tag: 'uibugs', h: 2.1 }); }
  // de peds bij de speler: hun eigen bel, zoals straatpraat
  await shot('1198-bubbels', 2500);
  meet('bellen', [...document.querySelectorAll('.bubble, .speech-bubble, [class*="bubble"]')].filter((e) => e.offsetParent !== null).map((e) => rect(e)).filter(Boolean).slice(0, 8));
  MG.clearBubbles(w, 'uibugs');
});
// #1075: toetsplaatjes in de doelkaart (gezocht: Pak een bak en smeer hem) en in het menu
scene('1075', async () => {
  await jump(...stad, 3000);
  // de toetsregel staat alleen de eerste seconden van een nieuw doel (obj-fresh): meten en vastleggen zodra hij er is
  w.wanted = 2;
  for (let i = 0; i < 40 && !document.querySelector('#hud .hud-mission.obj-fresh .hud-obj-keys:not([hidden]) .pad-g'); i++) await sleep(100);
  await sleep(300);
  const sub = rect('#hud .hud-mission-progress');
  const glyphs = [...document.querySelectorAll('#hud .hud-obj-keys .pad-g, #hud .hud-obj-keys .hud-key')].map((e) => rect(e)).filter(Boolean);
  meet('sub', sub); meet('glyphs', glyphs);
  meet('overlapPx', sub && glyphs.length ? Math.max(0, ...glyphs.map((g) => sub.y + sub.h - g.y)) : null);
  await shot('1075-doelkaart', 0);
  w.wanted = 0; await sleep(800);
  PM.openPauseMenu('controls', { sub: 'overzicht' }); await shot('1075-toetsenoverzicht', 1800); await sluit();
});

// #1243 (hertest 24-11): Land en bedrijf > Boerderij, de lage sfeerband en de veldkaart
scene('1243', async () => {
  PM.openPauseMenu('boerderij', { sub: 'boerderij' }); await shot('1243-boerderij', 1800);
  const band = rect('.bd-pane .lb-sfeer'), klein = rect('.bd-pane .lb-sfeer-klein'), groot = rect('.bd-pane .lb-sfeer-groot');
  meet('band', band); meet('klein', klein); meet('groot', groot);
  meet('overlapPx', klein && groot ? Math.max(0, klein.y + klein.h - groot.y) : null);
  const titel = document.querySelector('.bd-veld .ds-z-kaart__titel');
  meet('veldTitelAfgekapt', titel ? titel.scrollWidth > titel.clientWidth + 1 || titel.getBoundingClientRect().right > titel.closest('.bd-veld').getBoundingClientRect().right : null);
  await sluit();
});

for (const s of SCENES) {
  if (ONLY.length && !ONLY.includes(s.id)) continue;
  ev = { id: s.id, size: innerWidth + 'x' + innerHeight, status: 'ok', notes: [], metrics: {}, shots: [] };
  console.error('[uibugs] scene ' + s.id);
  try { await s.run(); } catch (e) { ev.status = 'error'; ev.notes.push('FOUT: ' + (e && e.message)); }
  try { w.wanted = 0; await sluit(); } catch (e) { /* weg */ }
  report.push(ev); console.log('[uibugs] ' + JSON.stringify(ev));
}
clearInterval(skipper);
console.log('[uibugs-klaar] ' + JSON.stringify(report.map((r) => r.id + ':' + r.status)));
return JSON.stringify(report);
