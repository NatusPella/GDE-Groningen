// Paginascript voor scripts/qa/menuplekken_shots.mjs --page=menugeluid.page.js --audio-graph (#413): welk menugeluid hoor je bij welke handeling,
// per menu? De pagina meet de tonen van de UI-bus (OscillatorNode.start met type en toonhoogte) na elke handeling en benoemt ze:
//   tik (vierkant, 1,4 tot 1,9 kHz), keuze (driehoek 880 Hz, dan 1320 Hz), terug (driehoek 1100 Hz omlaag), vinkje (vierkant 700 of 1000 Hz),
//   schuif (sinus 0,4 tot 1,3 kHz), anders (het opengaan van het pauzemenu en al het andere).
// Toetsen zijn echte KeyboardEvents op de pagina, zoals het toetsenbord ze geeft en de controller ze via gamepad.js sendKey stuurt; de muis
// is een mousemove of een klik. Draait met GDE_MENU_TEST=1 (het hoofdmenu blijft staan) en --audio-graph (de geluidsgraaf loopt gedempt).
// Uitvoer: per menu en handeling hoeveel geluiden van elke soort, naar menuplekken.json.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tones = [];
const lastSet = new WeakMap();
const origSet = AudioParam.prototype.setValueAtTime;
AudioParam.prototype.setValueAtTime = function (v, t) { try { lastSet.set(this, v); } catch (e) { /* meting */ } return origSet.call(this, v, t); };
const origStart = OscillatorNode.prototype.start;
OscillatorNode.prototype.start = function (...a) {
  try {
    const f = lastSet.has(this.frequency) ? lastSet.get(this.frequency) : this.frequency.value;
    tones.push({ t: performance.now(), type: this.type, f: Math.round(f) });
  } catch (e) { /* meting */ }
  return origStart.apply(this, a);
};
const name = (x) => {
  if (x.type === 'square' && x.f >= 1350 && x.f <= 1950) return 'tik';
  if (x.type === 'triangle' && x.f === 880) return 'keuze';
  if (x.type === 'triangle' && x.f >= 1050 && x.f <= 1150) return 'terug';
  if (x.type === 'square' && (x.f === 700 || x.f === 1000)) return 'vinkje';
  if (x.type === 'sine' && x.f >= 400 && x.f <= 1300) return 'schuif';
  return null; // het tweede deel van een keuze (1320 Hz) en al het andere
};
const meet = async (wat, doe, wacht = 450) => {
  tones.length = 0;
  const t0 = performance.now();
  await doe();
  await sleep(wacht);
  const per = {};
  for (const x of tones.filter((q) => q.t >= t0)) { const n = name(x); if (n) per[n] = (per[n] || 0) + 1; }
  const rij = { wat, ...per, tonen: tones.length };
  uit.push(rij);
  return rij;
};
const uit = [];
const key = (k, doel) => {
  const t = doel || document.activeElement || document.body;
  const opt = { key: k, code: k === ' ' ? 'Space' : k, bubbles: true, cancelable: true };
  t.dispatchEvent(new KeyboardEvent('keydown', opt));
  t.dispatchEvent(new KeyboardEvent('keyup', opt));
};
for (let i = 0; i < 240 && !(window.__debug && window.__debug.world); i++) await sleep(500);
const ss = document.getElementById('start-screen');
for (let i = 0; i < 240 && !(ss && ss.classList.contains('visible')); i++) await sleep(500);
await sleep(1500);
// zachtjes: de eerste toets/klik ontgrendelt het geluid (audio.js unlockAudio)
key('ArrowDown'); await sleep(800);

// --- het hoofdmenu (zo was het al)
await meet('hoofdmenu: pijl omlaag', () => key('ArrowDown'));
await meet('hoofdmenu: pijl omhoog', () => key('ArrowUp'));
const items = [...ss.querySelectorAll('.ss-item')];
await meet('hoofdmenu: muis over een andere knop', () => { const b = items[3]; b.dispatchEvent(new MouseEvent('mousemove', { bubbles: true })); });
await meet('hoofdmenu: muis over dezelfde knop nog eens', () => { items[3].dispatchEvent(new MouseEvent('mousemove', { bubbles: true })); });

// --- Instellingen vanuit het hoofdmenu: het pauzemenu (met de kaart, de telefoon, loopbaan en de rest als onderdelen)
items[3].focus();
await meet('hoofdmenu: Enter op Instellingen (opent het pauzemenu)', () => key('Enter'), 700);
await sleep(600);
await meet('pauzemenu: pijl omlaag', () => key('ArrowDown'));
await meet('pauzemenu: pijl rechts', () => key('ArrowRight'));
const pm = document.getElementById('pause-menu');
const knop = pm && [...pm.querySelectorAll('button')].find((b) => b.getClientRects().length && !b.hasAttribute('data-back'));
await meet('pauzemenu: een klik op een knop (muis)', () => { if (knop) { knop.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); knop.click(); } }, 600);
await meet('pauzemenu: Escape (sluit)', () => key('Escape'), 700);
await sleep(500);

// --- Opgeslagen spellen (gm)
const SS = await import('/js/saveslotsui.js');
let geslot = 0;
SS.openSaveSlots({ mode: 'start', solo: true, eyebrow: 'Test', onLoad: () => { geslot++; }, onNew: () => { geslot++; }, onClose: () => {} });
await sleep(900);
await meet('opgeslagen spellen: pijl rechts', () => key('ArrowRight'));
await meet('opgeslagen spellen: pijl omlaag', () => key('ArrowDown'));
await meet('opgeslagen spellen: Escape (terug)', () => key('Escape'), 600);
await sleep(500);

// --- Samen spelen (gm)
const SK = await import('/js/samenkeuze.js');
SK.openSamenKeuze({ onKies: () => {}, onClose: () => {} });
await sleep(900);
await meet('samen spelen: pijl omlaag', () => key('ArrowDown'));
await meet('samen spelen: muis over een andere knop', () => { const b = document.querySelectorAll('#samenkeuze .sk-item')[1]; if (b) b.dispatchEvent(new MouseEvent('mousemove', { bubbles: true })); });
await meet('samen spelen: Escape (terug)', () => key('Escape'), 600);
await sleep(500);

// --- een spel starten voor de winkel
window.__menuStart && window.__menuStart('nieuw');
for (let i = 0; i < 60 && !document.body.classList.contains('game-started'); i++) await sleep(500);
const cine = await import('/js/cinematics.js');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
await sleep(6000);
const w = window.__debug.world;
const SH = await import('/js/shopui.js');
SH.openShopMenu(w, {
  type: 'test', icon: '', color: '#3fc97a', name: 'Testwinkel', tagline: 'Alleen voor de geluidsmeting',
  sections: () => [{ title: 'Te koop', items: [1, 2, 3].map((i) => ({ id: 't' + i, label: 'Ding ' + i, desc: 'Een ding', price: 0, swatch: ['#fff'], disabled: null, buy: () => 'Gekocht' })) }],
});
await sleep(900);
await meet('winkel: pijl omlaag', () => key('ArrowDown'));
await meet('winkel: pijl omlaag nog eens', () => key('ArrowDown'));
await meet('winkel: Escape (terug)', () => key('Escape'), 700);
await sleep(500);
SH.isShopOpen() && SH.closeShopMenu({ save: false });
clearInterval(skipper);
uit.push({ wat: 'opslag bleef leeg', geslot });
return JSON.stringify({ geluiden: uit, beelden: [{ naam: 'menugeluid' }] });
