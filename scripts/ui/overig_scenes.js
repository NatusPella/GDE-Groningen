// Beelden van de overige schermen in zeefdruk (#985, opdracht 20-11): minigamebord, keuzepaneel, stopvenster,
// verhaal-overslaan, cutscene-ondertitel, ondertitel in het spel, treincabine, toasts, aanraak, heist.
//   node scripts/ui_shots.mjs --sizes=1280x720 --scenes=scripts/ui/overig_scenes.js --out=docs/beeld-20-11/ui
// Alleen scene, geen codewijziging; het profiel is een wegwerpprofiel (zie ui_shots.mjs).
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const klaar = () => document.body.classList.contains('game-started') && window.__debug && window.__debug.world && window.__debug.world.map && !document.body.classList.contains('intro-montage') && !document.querySelector('#load-screen.on');
const cine0 = await imp('cinematics');
const skipper = setInterval(() => { if (cine0.isCinematicActive()) cine0.skipCinematic(); }, 100);
const done = [];
await sleep(1500);
if (document.querySelector('#start-screen.visible')) { await sleep(2500); console.log('[capture] titel'); await sleep(800); done.push('titel'); }
for (let i = 0; i < 240 && !klaar(); i++) {
  if (!document.body.classList.contains('game-started') && document.querySelector('#start-screen.visible')) tap('Enter', 'Enter');
  if (window.__debug && window.__debug.world && window.__debug.world.paused) tap(' ', 'Space');
  await sleep(1000);
}
done.push('klaar: ' + klaar() + ' ' + document.body.className);
if (!(window.__debug && window.__debug.world)) return done;
await sleep(3000);
const D = window.__debug; const w = D.world; const p = w.player;
w.devInvuln = true; D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const ONLY = (window.__shotsOnly || '').split(',').filter(Boolean);
const want = (n) => !ONLY.length || ONLY.includes(n);
const shot = async (name, wait = 900) => { await sleep(wait); console.log('[capture] ' + name); await sleep(700); done.push(name); };
const probeer = async (naam, fn) => { if (!want(naam)) return; try { await fn(); } catch (e) { console.log('[scene] ' + naam + ': ' + (e && e.message)); done.push(naam + ' FOUT ' + (e && e.message)); } };
const hud = document.getElementById('hud') || document.body;

await probeer('bord', async () => {
  const K = await imp('minigamekit');
  const b = K.createBoard('discgolf');
  b.set({ row: 'Worp <b>3</b> van 9 &middot; Par 3', cells: [{ t: 'Hole 1', cls: 'good' }, { t: 'Hole 2', cls: 'bad' }, { t: 'Hole 3', cls: 'on' }, { t: 'Hole 4' }], meter: { v: 0.62, mark: 0.78, text: '62%' }, flash: 'Mooie worp!', help: K.key('SPATIE') + ' werpen &middot; ' + K.key('ESC') + ' stoppen' });
  b.show(); await shot('bord-discgolf');
  b.set({ row: 'Tussenstand', cells: null, extra: '<table class="mg-stand"><thead><tr><th>Speler</th><th>Score</th></tr></thead><tbody><tr class="on"><th scope="row">Jij</th><td>12</td></tr><tr><th scope="row">Tessa</th><td>14</td></tr><tr class="weg"><th scope="row">Tammo</th><td>-</td></tr></tbody></table>', meter: null, flash: 'Fout: buiten de baan', bad: true, help: K.key('ESC') + ' stoppen' });
  await shot('bord-stand');
  b.hide(); b.root.remove();
});
await probeer('keuze', async () => {
  const C = await imp('choicepanel');
  const c = C.createChoicePanel();
  c.set({ kicker: 'ZAAK 2 VAN 5', text: 'Een fiets staat open op de Grote Markt. Wat doe je?', rule: 'Je krijgt punten voor een eerlijke keuze.', options: [{ key: '1', label: 'Meenemen', cls: 'pick' }, { key: '2', label: 'Doorfietsen', note: 'Eerlijk en rustig', cls: 'good' }, { key: '3', label: 'Aan de politie melden', cls: 'bad' }], meter: { v: 0.4, from: 0.5, to: 0.8 }, flash: 'Goed gekozen', help: C.keycap('1') + ' tot ' + C.keycap('3') + ' kiezen' });
  c.show(); await shot('keuzepaneel');
  c.hide(); c.root.remove();
});
await probeer('stop', async () => {
  const K = await imp('minigamekit');
  K.stopPressed({ wasPressed: (k) => k === 'escape', consume() {} });
  await shot('stopvenster');
  document.querySelectorAll('.mg-stopask').forEach((e) => e.remove());
});
await probeer('overslaan', async () => {
  const r = document.createElement('div'); r.id = 'story-skip'; // story.js verbergt zijn eigen element elk frame; deze kloon heeft dezelfde opmaak
  r.innerHTML = '<button type="button"><span class="hud-key">O</span><span class="ss-label">Sla deze missie over, verder met het verhaal</span></button>';
  document.body.appendChild(r); await shot('verhaal-overslaan'); r.remove();
});
await probeer('cutscene', async () => {
  const c = document.getElementById('cine');
  if (!c) throw new Error('geen #cine');
  c.classList.add('active', 'letterbox', 'has-sub', 'show-skip');
  c.querySelector('.cine-speaker').textContent = 'Tessa:'; c.querySelector('.cine-line').textContent = 'Zullen we eerst een kop koffie nemen, voordat Tammo weer iets stuk maakt?';
  document.body.classList.add('cine-hide-hud');
  await shot('cutscene-ondertitel', 1200);
  c.classList.remove('active', 'letterbox', 'has-sub', 'show-skip'); document.body.classList.remove('cine-hide-hud');
});
await probeer('ondertitel', async () => {
  let s = document.getElementById('banter-sub');
  if (!s) { // dezelfde opbouw en inline stijl als banter.js subtitleEl
    s = document.createElement('div'); s.id = 'banter-sub';
    Object.assign(s.style, { position: 'fixed', left: '50%', bottom: '27vh', transform: 'translateX(-50%)', width: 'min(86vw, 760px)', textAlign: 'center', font: "clamp(15px, 1.5vw, 20px) 'Arial Narrow', Arial, sans-serif", color: '#fff', letterSpacing: '0.3px', textShadow: '0 1px 3px rgba(0,0,0,0.95), 0 0 12px rgba(0,0,0,0.6)', pointerEvents: 'none', opacity: '0', transition: 'opacity 0.25s', zIndex: '40' });
    s.innerHTML = '<span class="bt-speaker" style="font-weight:bold;margin-right:6px"></span><span class="bt-line"></span>'; document.body.appendChild(s);
  }
  s.querySelector('.bt-speaker').textContent = 'Tammo:'; s.querySelector('.bt-line').textContent = 'Zeg, dit was niet de afslag naar de Ring, hè?';
  s.style.opacity = '1';
  await shot('ondertitel-spel', 1000);
  s.style.opacity = '0';
});
await probeer('cabine', async () => {
  const T = await imp('treincabine');
  const h = T.createCabHud();
  const cab = T.newCab(); cab.lever = 2;
  h.show();
  h.set({ kmh: 82, maxKmh: 120, lever: 2, leverText: 'Tractie 2', emergency: false, dm: null, limitKmh: 80, next: { name: 'Groningen Europapark', toStop: 640, dueIn: 40, depIn: null, delay: 0, tooFast: false, index: 2, count: 5, late: 0 }, doors: false, storing: null, service: true, faults: 0 }, T.leverLabel ? 'Pijltjes hendel' : '');
  h.intro('<b>MACHINIST</b>Rij op tijd naar het volgende station en houd je aan het bord.');
  await shot('treincabine');
  h.result({ medalName: 'Zilver', score: 812, made: 4, stops: 5, punct: 88, comfort: 71, veilig: 55, faultless: false }, 120, false, 'Druk op Enter');
  h.intro('');
  await shot('treincabine-eind');
  h.hide(); h.root.remove();
});
await probeer('uitje', async () => {
  const U = await imp('uitjepaneel');
  U.toonUitje(w, 'hoogvlieger', { titel: 'Reuzenrad Hoogvlieger', regel: 'Je zit in de gondel, nog twee rondjes.', hint: '{SPACE} verder', secs: 8 });
  await shot('uitjekaart', 900);
  U.verbergUitje();
});
await probeer('cinekaart', async () => {
  const c = document.getElementById('cine');
  c.classList.add('active', 'letterbox', 'has-card');
  c.querySelector('.cine-kicker').textContent = 'Woensdag 26 augustus'; c.querySelector('.cine-title').textContent = "De schuur van Tinus";
  const n = c.querySelector('.cine-name'); n.textContent = 'Tammo'; n.classList.add('visible');
  const sk = c.querySelector('.cine-chip'); sk.textContent = 'Dag 3'; sk.classList.add('visible');
  await shot('cinekaart', 1300);
  c.classList.remove('active', 'letterbox', 'has-card'); n.classList.remove('visible'); sk.classList.remove('visible');
});
await probeer('stunt', async () => {
  const S = await imp('stunthud');
  S.showStuntHud(1500, [], {});
  for (let i = 0; i < 12; i++) { S.updateStuntHud(0.25, { score: 820, target: 1500, combo: 3, comboLeft: 0.6, timeLeft: 48 }, false); await sleep(250); }
  S.stuntPopup('+120 Fietsenrek', 'pts'); S.chipPopup && S.chipPopup('x3', 'combo');
  await shot('stunthud', 400);
  S.hideStuntHud();
});
await probeer('heist', async () => {
  const H = await imp('heistui');
  H.fusePanel({ center: 0.55, width: 0.2, x: 0.3, hits: 1 }, 3);
  await shot('heist-zekering', 900);
  H.lockPanel({ pins: [{ y: 0.2 }, { y: 0.5 }, { y: 0.7 }, { y: 0.3 }], cur: 1, zone: 0.18 });
  await shot('heist-slot', 900);
  H.closePanel(); await sleep(500);
  H.showNote('Iemand was ze voor.'); await shot('heist-briefje', 1200); H.hideNote(); await sleep(400);
  H.roleChip('Jij houdt de bewaker bezig'); H.skipChip(true, 0.4); await shot('heist-chips', 900); H.skipChip(false); H.disposeHeistUi();
});
for (const mode of ['trein']) {
  await probeer('rit-' + mode, async () => {
    const M = await imp('reisrit');
    M.startMeerijden(w, { id: mode, etaS: 20, price: 0, label: mode === 'taxi' ? 'Taxi naar Station' : 'Stoptrein naar Assen', lines: [{ name: 'Stoptrein' }], stops: [] }, { x: p.x + 60, y: p.y + 60, name: 'Station' });
    await shot('rit-' + mode, 9000);
    for (let i = 0; i < 60 && document.querySelector('.reisrit, .reisrit3d'); i++) { tap(' ', 'Space'); await sleep(1000); }
    for (let i = 0; i < 60 && document.querySelector('#load-screen.on'); i++) await sleep(1000);
    await sleep(2000);
  });
}
await probeer('duif', async () => {
  const P = await imp('pigeonmode');
  P.startPigeonMode(w);
  await shot('duivenmodus', 3500);
  P.stopPigeonMode(w); await sleep(1500);
});
clearInterval(skipper);
return done;
