// Beelden van de overige schermen in zeefdruk (#985, opdracht 20-11): minigamebord, keuzepaneel, stopvenster,
// verhaal-overslaan, cutscene-ondertitel, ondertitel in het spel, treincabine, toasts, aanraak, heist.
//   node scripts/ui_shots.mjs --sizes=1280x720 --scenes=scripts/ui/overig_scenes.js --out=docs/beeld-20-11/ui
// Alleen scene, geen codewijziging; het profiel is een wegwerpprofiel (zie ui_shots.mjs).
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const klaar = () => document.body.classList.contains('game-started') && window.__debug && window.__debug.world && window.__debug.world.map && !document.querySelector('#loading:not([hidden]), .ls.on:not(.out)');
const done = [];
for (let i = 0; i < 240 && !klaar(); i++) {
  if (!document.body.classList.contains('game-started')) tap('Enter', 'Enter');
  if (window.__debug && window.__debug.world && window.__debug.world.paused) tap(' ', 'Space');
  await sleep(1000);
}
done.push('klaar: ' + klaar());
await sleep(3000);
const D = window.__debug; const w = D.world; const p = w.player;
const cine = await imp('cinematics');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
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
  if (!document.getElementById('story-skip')) {
    const r = document.createElement('div'); r.id = 'story-skip';
    r.innerHTML = '<button type="button"><span class="hud-key">O</span><span class="ss-label">Sla deze missie over, verder met het verhaal</span></button>';
    document.body.appendChild(r);
  }
  const r = document.getElementById('story-skip'); r.hidden = false; await shot('verhaal-overslaan'); r.hidden = true;
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
  if (!s) {
    const B = await imp('banter');
    s = document.getElementById('banter-sub');
  }
  if (!s) { s = document.createElement('div'); s.id = 'banter-sub'; s.innerHTML = '<span class="bt-speaker"></span><span class="bt-line"></span>'; document.body.appendChild(s); }
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
clearInterval(skipper);
return done;
