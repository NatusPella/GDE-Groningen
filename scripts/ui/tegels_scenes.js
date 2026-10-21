// De tegels van het pauzemenu-overzicht meten (#351): loopt een lange waarde ('net begonnen', een groot bedrag) over de rand of de buurtegel?
//   node scripts/ui_shots.mjs --scenes=scripts/ui/tegels_scenes.js --out=<map> --sizes=1280x720,1920x1080
// Levert per grootte per tegel: de tekst, het lettertype, de breedte van tegel en tekst en hoeveel de tekst over de rand loopt.
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
const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
window.__debug.world.devInvuln = true;
const shot = async (name, wait = 900) => { await sleep(wait); console.log('[capture] ' + name); await sleep(600); };
const out = [];
// een lange waarde in een tegel ('net begonnen', een groot bedrag, 12 u 05) mag niet over de buurtegel lopen (#351)
const meet = (label) => {
  const tiles = [...document.querySelectorAll('#pause-menu .ov-tile')];
  const rows = tiles.map((t, i) => {
    const tv = t.querySelector('.ov-tv'), r = t.getBoundingClientRect(), rg = document.createRange();
    rg.selectNodeContents(tv);
    const tx = rg.getBoundingClientRect(), next = tiles[i + 1] ? tiles[i + 1].getBoundingClientRect() : null;
    const over = tx.right - r.right;
    return { tekst: tv.textContent, font: getComputedStyle(tv).fontSize, tegel: Math.round(r.width), tekstBreed: Math.round(tx.width), over: +over.toFixed(1), opBuur: next && next.top === r.top ? +(tx.right - next.left).toFixed(1) : null };
  });
  const slecht = rows.filter((x) => x.over > 0.5 || (x.opBuur !== null && x.opBuur > 0));
  out.push(`${label} @${innerWidth}x${innerHeight}: ${rows.length} tegels, over de rand: ${slecht.length ? JSON.stringify(slecht) : 'geen'}; ${JSON.stringify(rows.map((x) => [x.tekst, x.font, x.tegel, x.tekstBreed]))}`);
};
PM.openPauseMenu('overzicht');
await shot('tegels-net-begonnen', 1500);
meet('net begonnen');
// lang speeltijd-getal en een groot bedrag
window.__debug.world.money = 12345678;
PM.closePauseMenu(); await sleep(300);
PM.openPauseMenu('overzicht');
await shot('tegels-groot-bedrag', 1500);
meet('groot bedrag');
PM.closePauseMenu();
clearInterval(skipper);
return out;
