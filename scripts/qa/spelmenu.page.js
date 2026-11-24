// Paginascript voor scripts/qa/menuplekken_shots.mjs --page=spelmenu.page.js --nomenu (#416): het pauzemenu met Spel naast Instellingen.
// Opnames: shots-spel-<tab>.png (Opslaan & stoppen), shots-instellingen-<tab>.png (Spel met de moeilijkheid, Camera, Hints, Interface)
// en shots-voorstart.png (het hoofdmenu > Instellingen: Spel staat in de rail). Controleert ook dat een regelaar onder Instellingen
// dezelfde instelling verandert en bewaart (getSettings en gde-settings) en dat de rail op dit scherm niet onder de rand loopt.
// #979: Camera & richten en Hints & uitleg staan onder Instellingen, niet meer als tabbladen van Spel.
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

for (const sub of ['acties']) {
  PM.openPauseMenu('spel', { sub });
  await sleep(1100);
  const rij = [...root().querySelectorAll(`[data-of="spel"][data-sub="${sub}"] .pm-row`)].filter(zichtbaar).map((r) => (r.querySelector('.nm') || r).textContent.trim().slice(0, 40));
  check(`Spel > ${sub}: rijen zichtbaar`, rij.length >= 3, rij.join(' | '));
  if (sub === 'acties') {
    const acties = [...root().querySelectorAll('[data-panel="spel"] [data-action]')].filter(zichtbaar).map((b) => b.dataset.action);
    check('Opslaan & stoppen: de acties zijn zichtbaar', ['save', 'saves', 'menu', 'nieuw-vraag', 'terugzetten-vraag'].every((a) => acties.includes(a)), acties.join(','));
    check('de rail heeft geen opslaan, laden of afsluiten meer', !root().querySelector('.pm-rail [data-action="save"], .pm-rail [data-action="restart"], .pm-rail [data-action="menu"]'));
  }
  console.log('[capture] spel-' + sub);
  await sleep(500);
}
// #979: Camera & richten en Hints & uitleg zijn tabbladen van Instellingen geworden; die worden
// hieronder met de andere instellingentabbladen geopend en gecontroleerd.
// de knoppen werken: Spel opslaan meldt het, Opnieuw beginnen vraagt eerst, Annuleren sluit de vraag
{
  PM.openPauseMenu('spel', { sub: 'acties' });
  await sleep(900);
  const status = () => (root().querySelector('[data-game-status]') || {}).textContent || '';
  root().querySelector('[data-action="save"]').click();
  await sleep(500);
  check('Spel opslaan meldt dat het gelukt is', /Opgeslagen om|Laatst opgeslagen/.test(status()), status());
  const vraag = root().querySelector('[data-restart-confirm]');
  root().querySelector('[data-action="restart"]').click();
  await sleep(400);
  check('Opnieuw beginnen vraagt eerst (Laatste spel laden, Nieuw spel, Annuleren)', !vraag.hidden && !!vraag.querySelector('[data-action="load"]') && !!vraag.querySelector('[data-action="new"]'));
  {
    // #911-QA: de vraag en haar drie keuzes moeten helemaal in het blad passen, niet half eronder
    const paneel = root().querySelector('.pm-sheet').getBoundingClientRect();
    const knoppen = [...vraag.querySelectorAll('button')].map((b) => b.getBoundingClientRect());
    check('de vraag bij Opnieuw beginnen staat met al haar knoppen in het blad',
      knoppen.length >= 3 && knoppen.every((r) => r.top >= paneel.top && r.bottom <= paneel.bottom + 0.5),
      knoppen.map((r) => Math.round(r.top) + '-' + Math.round(r.bottom)).join(' ') + ' in ' + Math.round(paneel.top) + '-' + Math.round(paneel.bottom));
  }
  console.log('[capture] spel-acties-vraag');
  await sleep(500);
  root().querySelector('[data-action="cancel"]').click();
  await sleep(300);
  check('Annuleren sluit de vraag', vraag.hidden);
}
// de rail: alle knoppen binnen het scherm
{
  const rail = root().querySelector('.pm-rail');
  // de rail scrolt op een laag venster (pm-game: overflow-y auto, zoals voor Spel): na het naar beneden scrollen is de onderste knop in beeld
  const inner = rail.querySelector('.pm-game');
  const overloop = inner.scrollHeight - inner.clientHeight;
  inner.scrollTop = inner.scrollHeight;
  await sleep(200);
  const knoppen = [...rail.querySelectorAll('.ra, .m-bt')].filter(zichtbaar);
  const laagste = Math.max(...knoppen.map((b) => b.getBoundingClientRect().bottom));
  check('de rail scrolt hoogstens ' + Math.round(overloop) + ' px (info) en de onderste knop is dan in beeld', laagste <= innerHeight + 1, 'onderkant ' + Math.round(laagste) + ' van ' + innerHeight + ', scroll ' + Math.round(overloop) + ' px');
  inner.scrollTop = 0;
  const spelKnop = [...rail.querySelectorAll('.ra')].find((b) => b.dataset.goto === 'spel');
  check('de rail heeft een knop Spel', zichtbaar(spelKnop), spelKnop && spelKnop.textContent.trim());
  const volgorde = [...rail.querySelectorAll('.ra[data-goto]')].filter(zichtbaar).map((b) => b.dataset.goto);
  check('de rail: Spel, Verhaal, Loopbanen, Veroverd, Activiteiten, Kaart, Spullen, Garage, Prestaties, Foto’s, Instellingen, Cheats', volgorde.join(',') === 'spel,verhaal,loopbaan,veroverd,todo,map,spullen,garage,prestaties,fotos,settings,streken', volgorde.join(','));
  const koppen = [...rail.querySelectorAll('.pm-rail-h')].filter(zichtbaar).map((h) => h.textContent.trim().replace(/\s+/g, ' '));
  check('de rail heeft drie groepen met een kop en een telling (#911)', koppen.length === 3 && /^Spelen ?5$/.test(koppen[0]) && /^Jij ?5$/.test(koppen[1]) && /^Systeem ?2$/.test(koppen[2]), koppen.join(' | '));
  // #911-QA: op 1280x720 moeten alle twaalf onderdelen en de drie koppen in de rail passen
  const onderaan = Math.max(...[...rail.querySelectorAll('.ra[data-goto]')].filter(zichtbaar).map((b) => b.getBoundingClientRect().bottom));
  check('alle railrijen passen op dit venster (geen afgekapte onderkant)', onderaan <= innerHeight - 1, 'onderkant ' + Math.round(onderaan) + ' van ' + innerHeight);
}
// een regelaar onder Instellingen > Camera: dezelfde instelling, meteen bewaard (#979)
{
  PM.openPauseMenu('settings', { sub: 'camera' });
  await sleep(900);
  const box = root().querySelector('[data-setting="autoAim"]');
  const voor = ST.getSettings().autoAim;
  box.click();
  await sleep(300);
  const na = ST.getSettings().autoAim;
  const opgeslagen = JSON.parse(localStorage.getItem('gde-settings') || '{}');
  check('autoAim onder Instellingen > Camera verandert de instelling', voor !== na, `${voor} -> ${na}`);
  check('en bewaart die onder dezelfde sleutel (gde-settings)', opgeslagen.autoAim === na, JSON.stringify(opgeslagen.autoAim));
  box.click();
  await sleep(200);
  check('terugzetten werkt', ST.getSettings().autoAim === voor);
  const dist = root().querySelector('[data-setting="cameraDistance"]');
  check('de camera-afstand staat onder Instellingen > Camera met de huidige waarde', dist && Math.abs(Number(dist.value) - ST.getSettings().cameraDistance) < 1e-6, dist && dist.value);
  check('en niet meer onder Spel', !root().querySelector('[data-of="spel"] [data-setting="cameraDistance"]'));
}
// Q en E wisselen tussen de tabbladen van Spel
{
  PM.openPauseMenu('spel', { sub: 'acties' });
  await sleep(700);
  const sel = () => (root().querySelector('[data-of="spel"][data-subtab][aria-selected="true"]') || {}).dataset;
  const begin = sel() && sel().subtab;
  for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', code: 'KeyE', bubbles: true }));
  await sleep(300);
  check('E gaat naar het volgende tabblad van Spel', sel() && sel().subtab && sel().subtab !== begin, `${begin} -> ${sel() && sel().subtab}`);
}
// Instellingen: het Spel-tabblad met de verhuisde speelopties en de moeilijkheid (#891, #897),
// het Camera- en Hints-tabblad van #979, en Interface zonder die opties
for (const sub of ['spel', 'camera', 'hints', 'display']) {
  PM.openPauseMenu('settings', { sub });
  await sleep(1100);
  const keys = [...root().querySelectorAll(`[data-of="settings"][data-sub="${sub}"] [data-setting]`)].map((e) => e.dataset.setting);
  if (sub === 'spel') {
    check('Instellingen > Spel heeft de moeilijkheid bovenaan', keys[0] === 'difficulty', keys.slice(0, 3).join(','));
    check('Instellingen > Spel heeft de verhuisde speelopties', ['ruzie', 'gore', 'shiftMode', 'liveBussen'].every((k) => keys.includes(k)), keys.join(','));
    check('de uitleg van de drie standen staat ernaast', !!root().querySelector('[data-diff-now] [data-diff="uitdagend"]'));
    // #911-QA: de decoratieve rechterkolom valt op dit venster weg en de kaarten blijven binnen de lijst
    const zij = root().querySelector(`[data-of="settings"][data-sub="${sub}"] .m-pane`);
    check('de rechterkolom is verborgen op dit venster', !zij || getComputedStyle(zij).display === 'none', zij ? getComputedStyle(zij).display : 'geen');
    const lijst = root().querySelector(`[data-of="settings"][data-sub="${sub}"] .pm-slist`).getBoundingClientRect();
    const kaarten = [...root().querySelectorAll('[data-of="settings"][data-sub="spel"] .pm-diff-row')].map((c) => c.getBoundingClientRect());
    check('de drie moeilijkheidkaarten staan naast elkaar binnen de lijst', kaarten.length === 3 && kaarten.every((r) => r.left >= lijst.left - 0.5 && r.right <= lijst.right + 0.5), kaarten.map((r) => Math.round(r.left) + '-' + Math.round(r.right)).join(' ') + ' in ' + Math.round(lijst.left) + '-' + Math.round(lijst.right));
  } else if (sub === 'camera') {
    check('Instellingen > Camera heeft de cameraregelaars', ['firstPersoon', 'fov', 'cameraDistance', 'autoAim', 'cinematicMoments'].every((k) => keys.includes(k)), keys.join(','));
    check('en toont de stand van nu bovenaan (#980)', !!root().querySelector('[data-cam-now] [data-cam-fov]'));
    check('de camera-rijen zijn zichtbaar', [...root().querySelectorAll('[data-of="settings"][data-sub="camera"] .pm-row')].filter(zichtbaar).length >= 3);
  } else if (sub === 'hints') {
    check('Instellingen > Hints heeft de hintsregelaars', ['showHints', 'hintSource', 'onboardingTips', 'readingTime'].every((k) => keys.includes(k)), keys.join(','));
    check('en toont een hintvoorbeeld (#980)', !!root().querySelector('[data-hintprev] [data-hintprev-row]'));
    check('de hintsrijen zijn zichtbaar', [...root().querySelectorAll('[data-of="settings"][data-sub="hints"] .pm-row')].filter(zichtbaar).length >= 3);
  } else {
    check(`Instellingen > ${sub}: geen camera-, hints- of speelopties meer`, !['fov', 'cameraDistance', 'autoAim', 'showHints', 'hintSource', 'ruzie', 'gore', 'shiftMode', 'difficulty'].some((k) => keys.includes(k)), keys.join(','));
  }
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
  check('voor de start: Spel en Instellingen in de rail (Besturing hangt onder Instellingen)', volgorde.join(',') === 'spel,settings', volgorde.join(','));
  const missie = [...root().querySelectorAll('[data-of="spel"] .pm-ingame')].some(zichtbaar);
  check('voor de start staat Missie stoppen er niet', !missie);
}
console.log('[capture] voorstart');
await sleep(500);
PM.closePauseMenu();
clearInterval(skipper);
return JSON.stringify({ ...uit, beelden: [{ naam: 'spelmenu' }] });
