// Paginascript voor scripts/qa/menuplekken_shots.mjs --page=spelmenu.page.js --nomenu (#416): het pauzemenu met Spel naast Instellingen.
// Opnames: shots-spel-<tab>.png (Spelen, Camera & richten, Hints & uitleg), shots-instellingen-<tab>.png (Muis & controller, Interface) en
// shots-voorstart.png (het hoofdmenu > Instellingen: Spel staat in de rail). Controleert ook dat een regelaar onder Spel dezelfde instelling
// verandert en bewaart (getSettings en gde-settings) en dat de rail op dit scherm niet onder de rand loopt.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 240 && !(window.__debug && window.__debug.world); i++) await sleep(500);
const w = window.__debug.world;
const cine = await import('/js/cinematics.js');
const PM = await import('/js/pausemenu.js');
const ST = await import('/js/settings.js');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
for (let i = 0; i < 20 && w.paused; i++) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } await sleep(500); }
await sleep(3000);
w.devInvuln = true;
window.__debug.input.canLock = () => false;
const uit = { controles: [] };
const check = (naam, ok, info = '') => uit.controles.push({ naam, ok: !!ok, info: String(info) });
const root = () => document.getElementById('pause-menu');
const zichtbaar = (el) => !!el && el.getClientRects().length > 0 && !el.closest('[hidden]');

for (const sub of ['spelen', 'camera', 'hints']) {
  PM.openPauseMenu('spel', { sub });
  await sleep(1100);
  const rij = [...root().querySelectorAll(`[data-of="spel"][data-sub="${sub}"] .pm-row`)].filter(zichtbaar).map((r) => (r.querySelector('.nm') || r).textContent.trim().slice(0, 40));
  check(`Spel > ${sub}: rijen zichtbaar`, rij.length >= 3, rij.join(' | '));
  console.log('[capture] spel-' + sub);
  await sleep(500);
}
// de rail: alle knoppen binnen het scherm
{
  const rail = root().querySelector('.pm-rail');
  const knoppen = [...rail.querySelectorAll('.ra, .m-bt')].filter(zichtbaar);
  const laagste = Math.max(...knoppen.map((b) => b.getBoundingClientRect().bottom));
  const spelKnop = [...rail.querySelectorAll('.ra')].find((b) => b.dataset.goto === 'spel');
  check('de rail heeft een knop Spel', zichtbaar(spelKnop), spelKnop && spelKnop.textContent.trim());
  check('de onderste knop van de rail blijft in beeld', laagste <= innerHeight + 1, `onderkant ${Math.round(laagste)} van ${innerHeight}`);
  const volgorde = [...rail.querySelectorAll('.ra[data-goto]')].filter(zichtbaar).map((b) => b.dataset.goto);
  check('Spel staat vóór Instellingen in de rail', volgorde.indexOf('spel') >= 0 && volgorde.indexOf('spel') + 1 === volgorde.indexOf('settings'), volgorde.join(','));
}
// een regelaar onder Spel: dezelfde instelling, meteen bewaard
{
  PM.openPauseMenu('spel', { sub: 'camera' });
  await sleep(900);
  const box = root().querySelector('[data-setting="autoAim"]');
  const voor = ST.getSettings().autoAim;
  box.click();
  await sleep(300);
  const na = ST.getSettings().autoAim;
  const opgeslagen = JSON.parse(localStorage.getItem('gde-settings') || '{}');
  check('autoAim onder Spel verandert de instelling', voor !== na, `${voor} -> ${na}`);
  check('en bewaart die onder dezelfde sleutel (gde-settings)', opgeslagen.autoAim === na, JSON.stringify(opgeslagen.autoAim));
  box.click();
  await sleep(200);
  check('terugzetten werkt', ST.getSettings().autoAim === voor);
  const dist = root().querySelector('[data-setting="cameraDistance"]');
  check('de camera-afstand staat onder Spel met de huidige waarde', dist && Math.abs(Number(dist.value) - ST.getSettings().cameraDistance) < 1e-6, dist && dist.value);
  check('en niet meer onder Instellingen', !root().querySelector('[data-of="settings"] [data-setting="cameraDistance"]'));
}
// Q en E wisselen tussen de tabbladen van Spel
{
  const sel = () => (root().querySelector('[data-of="spel"][data-subtab][aria-selected="true"]') || {}).dataset;
  const begin = sel() && sel().subtab;
  for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', code: 'KeyE', bubbles: true }));
  await sleep(300);
  check('E gaat naar het volgende tabblad van Spel', sel() && sel().subtab && sel().subtab !== begin, `${begin} -> ${sel() && sel().subtab}`);
}
// Instellingen: de camera- en interfacetab zonder de verhuisde opties
for (const sub of ['camera', 'display']) {
  PM.openPauseMenu('settings', { sub });
  await sleep(1100);
  const keys = [...root().querySelectorAll(`[data-of="settings"][data-sub="${sub}"] [data-setting]`)].map((e) => e.dataset.setting);
  check(`Instellingen > ${sub}: geen speelopties meer`, !['fov', 'cameraDistance', 'autoAim', 'showHints', 'ruzie', 'gore', 'shiftMode'].some((k) => keys.includes(k)), keys.join(','));
  console.log('[capture] instellingen-' + sub);
  await sleep(500);
}
PM.closePauseMenu();
await sleep(600);
// het hoofdmenu: Spel is er ook bereikbaar (voor de start)
PM.openPauseMenu('spel', { prestart: true });
await sleep(1100);
{
  const volgorde = [...root().querySelectorAll('.pm-rail .ra[data-goto]')].filter(zichtbaar).map((b) => b.dataset.goto);
  check('voor de start: Spel, Instellingen en Besturing in de rail', volgorde.join(',') === 'spel,settings,controls', volgorde.join(','));
  const missie = [...root().querySelectorAll('[data-of="spel"] .pm-ingame')].some(zichtbaar);
  check('voor de start staat Missie stoppen er niet', !missie);
}
console.log('[capture] voorstart');
await sleep(500);
PM.closePauseMenu();
clearInterval(skipper);
return JSON.stringify({ ...uit, beelden: [{ naam: 'spelmenu' }] });
