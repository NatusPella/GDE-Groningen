// Scenes for scripts/ui/alleenspelen_shots.mjs (run by desktop --perf-script with GDE_MENU_TEST=1: the script gets the main menu).
// 'seed:N' fills the throwaway profile with N saves and stops; 'shots:N' takes the pictures of the main menu and of Alleen spelen
// (Opgeslagen spellen with Doorgaan and Nieuw spel) and checks keyboard focus, the grid and the texts. Never touches real storage.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const [what, countText, how] = String(window.__shotsOnly || 'shots:0').split(':');
const count = Number(countText) || 0;
const ss = document.getElementById('start-screen');
for (let i = 0; i < 120 && !(ss && ss.classList.contains('visible')); i++) await sleep(1000);
await sleep(1500);
if (what === 'seed') {
  const S = await imp('saveslots');
  const { SAVE_VERSION } = await imp('savemigrate');
  const { ARC_ID } = await imp('storyarc');
  const c = document.createElement('canvas');
  c.width = 320; c.height = 180;
  const NAMES = ['Mijn eerste zomer', 'Tessa-route', '', 'Proefrit', 'Reservekopie', 'Een heel lange naam voor een spel', '', 'Veilig'];
  for (let n = 1; n <= count; n++) {
    const g = c.getContext('2d');
    const hue = 90 + n * 22;
    const grad = g.createLinearGradient(0, 0, 0, 180);
    grad.addColorStop(0, `hsl(${hue}, 45%, 62%)`); grad.addColorStop(1, `hsl(${hue + 30}, 40%, 28%)`);
    g.fillStyle = grad; g.fillRect(0, 0, 320, 180);
    g.fillStyle = 'rgba(20,30,20,0.55)'; g.fillRect(40 + n * 6, 110, 90, 60); g.fillRect(150, 90, 60 + n * 3, 80);
    const url = c.toDataURL('image/jpeg', 0.7);
    S.writeSlot(null, n, { v: SAVE_VERSION, arc: ARC_ID, savedAt: Date.now() - (n - 1) * 5 * 3600000 - 600000, money: 250 * n, speeltijd: 900 + n * 2300, missions: { index: n, completed: Array.from({ length: n }, (_, k) => k), seen: [] }, character: n % 2 ? 'tammo' : 'anita' });
    S.writeThumb(null, n, url);
    S.renameSlot(null, n, NAMES[n - 1]);
  }
  if (count) S.setActive(null, 1);
  return ['gezaaid ' + count + ': ' + JSON.stringify(S.listSlots(null).map((s) => s.n + ':' + s.name))];
}

if (what === 'play') {
  // really start a game through the screen: no menu may stay over the world
  const solo = ss.querySelector('.ss-item[data-act="solo"]');
  solo.click(); await sleep(900);
  const root = document.getElementById('saveslots');
  const btn = how === 'doorgaan' ? root.querySelector('.ssl-hero') : root.querySelector('.ssl-new .ssl-main');
  btn.click(); await sleep(700);
  if (how === 'nieuw' && count >= 8) { const ja = document.querySelector('[data-do="newfull-ok"]'); if (!ja) return ['geen vraag bij 8 spellen']; ja.click(); await sleep(700); }
  let gone = false;
  for (let i = 0; i < 60 && !gone; i++) { await sleep(1000); gone = !ss.classList.contains('visible') && !document.getElementById('saveslots') && document.body.classList.contains('game-started'); }
  await sleep(3000);
  const left = [ss.classList.contains('visible'), !!document.getElementById('saveslots'), getComputedStyle(ss).display];
  console.log('[capture] spel-' + count + '-' + how);
  await sleep(800);
  return [`play ${count} ${how}: menu weg ${gone}; start-screen zichtbaar ${left[0]}, saveslots ${left[1]}, display ${left[2]}`];
}

const log = [`viewport ${innerWidth}x${innerHeight}; ${count} opgeslagen spellen`];
const bad = [];
const check = (c, msg) => { if (!c) bad.push(msg); };
const key = (k) => { for (const t of [window]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true })); } };
const shot = async (name, wait = 700) => { await sleep(wait); console.log('[capture] ' + name); await sleep(500); };
const items = () => [...document.querySelectorAll('#start-screen .ss-item')].map((e) => ({ act: e.dataset.act, text: e.querySelector('.ss-label').textContent.trim() }));

// the main menu
const it = items();
log.push('hoofdmenu: ' + it.map((x) => x.text).join(' | '));
check(it[0].act === 'solo' && it[0].text === 'Alleen spelen' && it[1].act === 'samen' && it[1].text === 'Samen spelen', 'de twee hoofdkeuzes ontbreken of staan niet bovenaan');
check(!it.some((x) => /Nieuw spel|Hervatten|Doorgaan|Opgeslagen spellen/.test(x.text)), 'Nieuw spel / Doorgaan / Opgeslagen spellen staan nog los in het hoofdmenu');
check(document.activeElement && document.activeElement.dataset.act === 'solo', 'Alleen spelen heeft niet de focus');
const menuBox = document.querySelector('#start-screen .ss-menu').getBoundingClientRect();
const lastBtn = [...document.querySelectorAll('#start-screen .ss-item')].pop().getBoundingClientRect();
check(lastBtn.bottom <= innerHeight - 8 && menuBox.top >= 0, `het menu valt buiten beeld (laatste knop tot ${Math.round(lastBtn.bottom)} van ${innerHeight})`);
await shot('hoofdmenu-' + count);

// Alleen spelen opens Opgeslagen spellen
key('Enter');
await sleep(900);
const root = document.getElementById('saveslots');
check(!!root, 'Enter op Alleen spelen opent Opgeslagen spellen niet');
if (root) {
  const title = root.querySelector('#ssl-title').textContent;
  const eb = root.querySelector('.m-eb').textContent;
  log.push(`scherm: ${eb} / ${title}`);
  check(title === 'Opgeslagen spellen' && /^hoofdmenu$/i.test(eb), 'kop van het scherm klopt niet');
  const first = root.querySelector('.ssl-grid .ssl-card');
  check(first && first.classList.contains('ssl-new'), 'Nieuw spel is niet de eerste kaart');
  const hero = root.querySelector('.ssl-hero');
  check(!!hero === (count > 0), count > 0 ? 'Doorgaan ontbreekt' : 'Doorgaan staat er zonder spel');
  if (count > 0) check(document.activeElement === hero, 'Doorgaan heeft niet de focus');
  else check(document.activeElement && document.activeElement.dataset.do === 'new', 'Nieuw spel heeft niet de focus');
  // grid: equal cards, on a grid, inside the panel
  const panel = root.querySelector('.ssl-panel').getBoundingClientRect();
  const rd = (x) => Math.round(x * 10) / 10;
  const cards = [...root.querySelectorAll('.ssl-card')].map((c) => c.getBoundingClientRect());
  cards.forEach((r, i) => { if (rd(r.width) !== rd(cards[0].width) || rd(r.height) !== rd(cards[0].height)) bad.push(`kaart ${i + 1} is anders groot`); if (r.left < panel.left - 0.5 || r.right > panel.right + 0.5) bad.push(`kaart ${i + 1} valt buiten het paneel`); });
  const heroBox = hero ? hero.getBoundingClientRect() : null;
  if (heroBox) check(heroBox.left >= panel.left && heroBox.right <= panel.right + 0.5, 'Doorgaan valt buiten het paneel');
  for (const el of root.querySelectorAll('.ssl-nm, .ssl-part, .ssl-meta, .ssl-hero-nm, .ssl-hero-meta')) if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).textOverflow !== 'ellipsis') bad.push('tekst loopt over: ' + el.textContent.slice(0, 20));
  const foot = root.querySelector('.ssl-foot').getBoundingClientRect();
  check(foot.bottom <= innerHeight && foot.top >= 0, 'de voetregel valt buiten beeld');
  log.push(`kaarten: ${cards.length}, hero: ${heroBox ? Math.round(heroBox.height) + 'px hoog' : 'geen'}, voetregel tot ${Math.round(foot.bottom)}`);
  await shot('alleen-' + count);

  // keyboard: down from Doorgaan -> Nieuw spel; up again -> Doorgaan
  if (hero) {
    key('ArrowDown'); await sleep(200);
    check(document.activeElement && document.activeElement.dataset.do && document.activeElement.closest('.ssl-new'), 'pijl omlaag vanaf Doorgaan gaat niet naar Nieuw spel');
    key('ArrowUp'); await sleep(200);
    check(document.activeElement === hero, 'pijl omhoog vanaf Nieuw spel gaat niet terug naar Doorgaan');
  }
  // full: Nieuw spel asks first
  if (count >= 8) {
    key('ArrowDown'); await sleep(200);
    const desc = (e) => (e ? `${e.tagName}.${String(e.className).slice(0, 40)} do=${e.dataset && e.dataset.do} in=${e.closest && e.closest('.ssl-card') ? e.closest('.ssl-card').className : ''}` : 'geen');
    log.push('focus voor Enter: ' + desc(document.activeElement));
    key('Enter'); await sleep(500);
    let q = root.querySelector('.ssl-new .ssl-over');
    if (!q && document.activeElement && document.activeElement.click) { log.push('Enter gaf geen vraag; klik op het focuselement'); document.activeElement.click(); await sleep(500); q = root.querySelector('.ssl-new .ssl-over'); log.push('na klik: vraag ' + (q ? 'ja' : 'nee') + '; focus ' + desc(document.activeElement)); }
    check(!!q, 'bij 8 spellen vraagt Nieuw spel niets');
    if (q) { log.push('vraag: ' + q.textContent.trim().slice(0, 120)); await shot('alleen-' + count + '-vol'); key('Escape'); await sleep(300); check(!root.querySelector('.ssl-new .ssl-over') && !!document.getElementById('saveslots'), 'Escape sluit de vraag niet (of het hele scherm)'); }
  }
  // Escape closes the screen and gives the focus back to Alleen spelen
  key('Escape'); await sleep(500);
  check(!document.getElementById('saveslots'), 'Escape sluit Opgeslagen spellen niet');
  check(document.activeElement && document.activeElement.dataset.act === 'solo', 'na Escape heeft Alleen spelen niet de focus');
}
log.push(bad.length ? 'PROBLEMEN: ' + bad.join(' ; ') : 'alle controles goed');
return log;
