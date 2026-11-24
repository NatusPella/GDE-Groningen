// De start-flow van het hoofdmenu in Electron, vier keer achter elkaar met hetzelfde profiel (--profile) zodat de opslag blijft staan:
//   c1: koude start zonder save: hoofdmenu (Nieuw spel is de held), Nieuw spel, de niveaukaart, het spel loopt, een save
//   c2: met een save: Doorgaan als held, Doorgaan, de recapkaart, een tweede plek erbij
//   c3: Opgeslagen spellen kiezen en laden: de gekozen plek wordt geladen, niet de laatst bewaarde
//   c4: Nieuw spel met saves: een verse plek erbij, de oude saves ongewijzigd
//   hm: alleen het hoofdmenu fotograferen (voor 1280x720 en 1280x800)
// Draait als --perf-script met GDE_STARTKEUZE=vraag en GDE_MOEILIJKHEID=vraag (zie start_queue.sh). Welke fase: window.__dsOnly[0].
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const FASE = (window.__dsOnly || [])[0] || 'c1';
const out = [FASE];
const shot = async (name, wait = 700) => { await sleep(wait); console.log('[capture] ' + FASE + '-' + name); await sleep(900); };
const wacht = async (fn, max = 240) => { for (let i = 0; i < max; i++) { try { if (fn()) return true; } catch (e) { /* nog niet */ } await sleep(500); } return false; };
const spelKlaar = () => window.__debug && window.__debug.world && window.__debug.world.map && document.body.classList.contains('game-started') && !document.querySelector('.ls.on:not(.out)') && !document.querySelector('#online-start');
const slotsStand = async () => { const S = await imp('saveslots'); return S.listSlots(null).map((x) => ({ n: x.n, naam: x.name, state: x.state, money: x.summary ? x.summary.money : null, savedAt: x.summary ? x.summary.savedAt : null, active: !!x.active })); };

await sleep(1500);
const heeftMenu = await wacht(() => document.querySelector('#online-start.sp-hm .sp-menu'), 300);
out.push('menu ' + heeftMenu);
if (!heeftMenu) return JSON.stringify(out);
out.push('start-stand ' + JSON.stringify(await slotsStand()));
out.push('held ' + (document.querySelector('.sp-doorgaan') ? document.querySelector('.sp-doorgaan').textContent.replace(/\s+/g, ' ').slice(0, 160) : 'geen'));
out.push('rijen ' + [...document.querySelectorAll('.sp-menu [data-hm]')].map((b) => b.dataset.hm).join(','));
await shot('hoofdmenu', 1200);
if (FASE === 'hm') {
  // Instellingen vanuit het hoofdmenu (prestart): opent, Escape brengt je terug in het hoofdmenu
  const i = [...document.querySelectorAll('.sp-menu [data-hm]')].findIndex((b) => b.dataset.hm === 'instellingen');
  tap(String(i + 1), 'Digit' + (i + 1));
  const open = await wacht(() => document.querySelector('#pause-menu') && getComputedStyle(document.querySelector('#pause-menu')).display !== 'none', 20);
  out.push('instellingen open ' + open);
  await shot('instellingen', 1200);
  tap('Escape', 'Escape'); await sleep(1200);
  out.push('terug in hoofdmenu ' + !!document.querySelector('#online-start.sp-hm .sp-menu'));
  return JSON.stringify(out);
}

const naSpel = async () => {
  const ok = await wacht(spelKlaar, 360);
  out.push('spel klaar ' + ok);
  const cine = await imp('cinematics');
  for (let i = 0; i < 60 && cine.isCinematicActive(); i++) { cine.skipCinematic(); await sleep(250); }
  await sleep(2500);
  return ok;
};
const kiesNiveau = async (toets, code) => {
  const k = await wacht(() => document.querySelector('#online-start') && /pittig/.test(document.querySelector('#online-start').textContent), 120);
  out.push('niveaukaart ' + k);
  if (k) { await shot('niveau', 1000); tap(toets, code); }
};

if (FASE === 'c1') {
  tap('Enter', 'Enter');
  await kiesNiveau('2', 'Digit2');
  if (!(await naSpel())) return JSON.stringify(out);
  const w = window.__debug.world; const SG = await imp('savegame');
  w.money = 5000; SG.saveGame(w, { manual: true, toast: false }); await sleep(3500);
  out.push('na-spel ' + JSON.stringify(await slotsStand()));
}
if (FASE === 'c2') {
  tap('Enter', 'Enter'); // Doorgaan
  if (!(await naSpel())) return JSON.stringify(out);
  await sleep(1500);
  out.push('recap ' + !!(document.querySelector('#recapkaart') && !document.querySelector('#recapkaart').hidden));
  await shot('recap', 600);
  tap('Enter', 'Enter'); await sleep(600);
  const w = window.__debug.world; const SG = await imp('savegame'); const S = await imp('saveslots');
  out.push('geld na doorgaan ' + w.money + ' slot ' + SG.currentSlot());
  const k = S.copySlot(null, SG.currentSlot()); if (k.ok) S.renameSlot(null, k.n, 'Reservekopie');
  w.money = 7000; SG.saveGame(w, { manual: true, toast: false }); await sleep(3500);
  out.push('na-spel ' + JSON.stringify(await slotsStand()));
}
if (FASE === 'c3') {
  tap('3', 'Digit3'); // Opgeslagen spellen
  const kaarten = await wacht(() => document.querySelector('#saveslots .ssl-card'), 40);
  out.push('slotsscherm ' + kaarten);
  await shot('slots', 1200);
  const stand = await slotsStand();
  const nieuwste = [...stand].sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))[0];
  const doel = stand.find((x) => x.n !== nieuwste.n && x.money != null && x.money !== nieuwste.money) || stand.find((x) => x.n !== nieuwste.n);
  out.push('doel ' + JSON.stringify(doel) + ' nieuwste ' + nieuwste.n);
  const knop = [...document.querySelectorAll('#saveslots [data-do="load"]')].find((b) => Number(b.dataset.slot) === doel.n && !b.disabled);
  out.push('laadknop ' + !!knop);
  if (knop) knop.click();
  if (!(await naSpel())) return JSON.stringify(out);
  const w = window.__debug.world; const SG = await imp('savegame');
  out.push('geladen slot ' + SG.currentSlot() + ' verwacht ' + doel.n + ' geld ' + w.money + ' verwacht ' + doel.money);
  out.push('na-spel ' + JSON.stringify(await slotsStand()));
}
if (FASE === 'c4') {
  const voor = await slotsStand();
  tap('2', 'Digit2'); // Nieuw spel
  await kiesNiveau('1', 'Digit1');
  if (!(await naSpel())) return JSON.stringify(out);
  const SG = await imp('savegame');
  const na = await slotsStand();
  const w = window.__debug.world;
  const ongewijzigd = voor.every((v) => { const x = na.find((q) => q.n === v.n); return x && x.money === v.money && x.savedAt === v.savedAt && x.state === v.state; });
  out.push('oude saves ongewijzigd ' + ongewijzigd + ' plekken ' + voor.length + ' naar ' + na.length + ' huidige plek ' + SG.currentSlot() + ' geld ' + w.money);
  out.push('na-spel ' + JSON.stringify(na));
}
await shot('spel', 800);
return JSON.stringify(out);
