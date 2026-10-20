// Scenes for scripts/ui_shots.mjs --scenes=scripts/ui/kanalen_scenes.js (#104): what asks for the
// player's eyes, one channel at a time and then a few together, so the order of the planner
// (hudbus.js) shows: cards (tip, money, police), the result banner, a phone message and a call,
// the achievement toast under a banner. Same harness as shots_scenes.js; nothing writes a save.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
for (let i = 0; i < 40 && !document.body.classList.contains('game-started'); i++) {
  for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); }
  await sleep(2500);
  for (let k = 0; k < 6 && window.__debug && window.__debug.world.paused; k++) {
    for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); }
    await sleep(700);
  }
}
// the start screen stays up over the live world in this harness (also in shots_scenes.js): take it away for the pictures
const ss = document.getElementById('start-screen');
if (ss) ss.style.display = 'none';
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const cine = await imp('cinematics');
const PF = await imp('phonefeed');
const ACH = await imp('achievements');
const { P = (x, y) => [x, y] } = await imp('worldframe').catch(() => ({}));
const ONLY = (window.__shotsOnly || '').split(',').filter(Boolean);
const want = (n) => !ONLY.length || ONLY.includes(n);
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const shot = async (name, wait = 1200) => { await sleep(wait); console.log('[capture] ' + name); await sleep(600); };
const done = [`viewport ${innerWidth}x${innerHeight} dpr ${devicePixelRatio}`, 'body: ' + document.body.className];
const [x, y] = P(100, 77);
p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
await sleep(4000);

// one card at a time, in the order of the planner: the police first, then money, the tip last
if (want('kaarten')) {
  w.addMessage('Pas op, de politie let op je.', 8, { kind: 'politie' });
  w.addMessage('Je krijgt € 250 van de buurman.', 8, { kind: 'geld' });
  w.addMessage('Tip: met E stap je in een auto.', 8, { kind: 'tip' });
  await shot('kanaal-kaart-politie', 1500);
  await sleep(5000);
  await shot('kanaal-kaart-volgende', 500);
  done.push('kaarten');
}
// the result banner: holds the small things
if (want('banner')) {
  cine.showBanner({ kind: 'pass', title: 'Missie geslaagd', reason: 'Ze hebben je niet gezien.', reward: 800, stats: [['Tijd', '2:41'], ['Schade', '€ 40']] });
  await shot('kanaal-banner', 1200);
  done.push('banner');
}
// an achievement while the banner is up must wait; after the banner it shows
if (want('prestatie')) {
  cine.showBanner({ kind: 'pass', title: 'Bijbaan klaar', reason: 'Netjes.', reward: 120, stats: [] });
  const ids = (ACH.ACHIEVEMENTS || []).map((a) => a.id);
  const id = ids.find((i) => !ACH.isUnlocked(i));
  if (id) ACH.unlockAchievement(w, id);
  await shot('kanaal-prestatie-onder-banner', 1200);
  await sleep(9000);
  await shot('kanaal-prestatie-na-banner', 1500);
  done.push('prestatie:' + (id || 'geen'));
}
// a phone message and a call
if (want('telefoon')) {
  PF.notifyPhone(w, { text: 'Kiekdoar: Er is een nieuwe kroeg open in de Poelestraat', from: 'Kiekdoar', app: 'nieuws' });
  await shot('kanaal-telefoon-bericht', 2500);
  PF.startCall(w, { from: 'Rikus', lines: [{ text: 'Hé, met Rikus. Heb je even?' }, { text: 'Kom maar naar de Grote Markt.' }] });
  await shot('kanaal-telefoon-gesprek', 4000);
  w.addMessage('Tip: een kaart tijdens het bellen wacht.', 6, { kind: 'tip' });
  await shot('kanaal-telefoon-met-tip', 2000);
  done.push('telefoon');
}
clearInterval(skipper);
console.log('[scenes] ' + done.join(' | '));
