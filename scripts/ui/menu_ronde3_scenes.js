// Menu-ronde 21-11 (#1010, #1013, #980): Loopbanen met kaarten, Spullen als raster met weggooien, Boerderij als veldkaarten.
// node scripts/ui_shots.mjs --sizes=1280x720,1920x1080 --scenes=scripts/ui/menu_ronde3_scenes.js --out=<map>
// Niets hier schrijft saves: de run gebruikt een wegwerpprofiel. Geeft de bevindingen (overflow, tekstgrootte) terug als tekst.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const laadt = () => !!document.querySelector('#loading:not([hidden]), .ls.on:not(.out)');
const klaar = () => document.body.classList.contains('game-started') && window.__debug && window.__debug.world && window.__debug.world.map && !laadt();
for (let i = 0; i < 240 && !klaar(); i++) {
  if (!document.body.classList.contains('game-started')) tap('Enter', 'Enter');
  if (window.__debug && window.__debug.world && window.__debug.world.paused) tap(' ', 'Space');
  await sleep(1000);
}
await sleep(3000);
const D = window.__debug; const w = D.world;
const cine = await imp('cinematics'); const PM = await imp('pausemenu');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true; D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
await document.fonts.ready;
const shot = async (name, wait = 1200) => { await sleep(wait); console.log('[capture] ' + name); await sleep(700); };
const done = [`viewport ${innerWidth}x${innerHeight}`];
const probeer = async (naam, fn) => { try { await fn(); } catch (e) { done.push(naam + ' FOUT ' + (e && e.message)); } };

// Meetlat per scherm: wat loopt buiten zijn vak, en is er tekst onder 13 px?
const meet = (naam, scope) => {
  const root = document.querySelector(scope);
  if (!root) { done.push(naam + ': scope mist'); return; }
  let klein = 0; let uit = 0; const voorbeelden = [];
  for (const el of root.querySelectorAll('*')) {
    if (!el.getClientRects().length) continue;
    const cs = getComputedStyle(el);
    const tekst = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (tekst && parseFloat(cs.fontSize) < 12.9) { klein++; if (voorbeelden.length < 3) voorbeelden.push(el.className + ':' + cs.fontSize); }
    if (el.scrollWidth > el.clientWidth + 2 && cs.overflowX === 'visible' && el.clientWidth > 0 && tekst) { uit++; if (voorbeelden.length < 6) voorbeelden.push('breed:' + el.className); }
  }
  done.push(`${naam}: tekst<13px ${klein}, horizontaal overflow ${uit} ${voorbeelden.join(' ')}`);
};

// ---- Loopbanen ----
const A = D.achievements.loopbaan;
const geef = (vak, xp, n, uniek) => { A.tel(vak, { xp, n }); (uniek || []).forEach((u) => A.tel(vak, { uniek: u })); };
await probeer('loopbaan-leeg', async () => { PM.openPauseMenu('loopbaan'); await shot('loopbaan-leeg', 1500); meet('loopbaan-leeg', '#pause-menu [data-panel="loopbaan"]'); });
geef('trein', 330, 214, ['Haren', 'Zuidhorn', 'Winsum']);
geef('bus', 150, 61, ['lijn']);
geef('bezorg', 560, 44, ['bezorger', 'vracht']);
geef('padel', 960, 31, ['baan-1', 'baan-2']);
geef('golf', 20, 2, []);
await sleep(300);
await probeer('loopbaan', async () => { PM.closePauseMenu(); await sleep(300); PM.openPauseMenu('loopbaan'); await shot('loopbaan', 1500); meet('loopbaan', '#pause-menu [data-panel="loopbaan"]'); });
await probeer('loopbaan-nieuw', async () => {
  const nog = [...document.querySelectorAll('#pause-menu [data-vak].nul')][0];
  if (nog) { nog.focus(); await shot('loopbaan-nu-starten', 900); }
});

// ---- Spullen ----
await probeer('spullen', async () => {
  w.eten = { kroket: 3, frikandel: 1, krentenbol: 12 };
  PM.closePauseMenu(); await sleep(300); PM.openPauseMenu('spullen'); await shot('spullen', 1500); meet('spullen', '#pause-menu [data-panel="spullen"]');
  const chip = (id) => document.querySelector('#pause-menu [data-spul-deel="' + id + '"]');
  chip('voedsel').click(); await shot('spullen-voedsel', 900);
  const kroket = document.querySelector('#pause-menu [data-spul="e:kroket"]');
  if (kroket) { kroket.click(); await sleep(300); const weg = document.querySelector('#pause-menu [data-spul-weg]:not([data-alles])'); if (weg) { weg.click(); await shot('spullen-weggooien-vraag', 700); meet('spullen-vraag', '#pause-menu [data-panel="spullen"]'); } }
  const nee = document.querySelector('#pause-menu [data-spul-weg-nee]'); if (nee) nee.click(); await sleep(300);
  chip('upgrades').click(); await shot('spullen-leeg', 700);
  chip('alles').click(); document.querySelector('#pause-menu [data-spul-sort]').click(); await shot('spullen-op-naam', 700);
});

// ---- Boerderij ----
await probeer('boerderij', async () => {
  const BL = await imp('boerderijlive'); const PC = await imp('percelen'); const B = await imp('boerderij');
  const b = BL.getBoerderij();
  PC.huur(b.bedrijf, 'perceel', 'dijkweide', 'dag', b.uren, 1e6);
  PC.koop(b.bedrijf, 'perceel', 'zandkamp', 1e6);
  b.velden['dijkweide'] = { ...B.nieuwVeld(), fase: 'gezaaid', gewas: 'gras', gezaaidOp: b.uren - 4, bodem: 0.9, zaai: 0.9 };
  b.velden['zandkamp'] = { ...B.nieuwVeld(), fase: 'geploegd', bodem: 0.8 };
  b.bedrijf.machinepark.machines.push({ uid: 'm1', type: 'trekker-klein', erf: 'zonnehoek', bezit: 'gekocht', sinds: 0, brandstof: 5, slijtage: 80, uren: 12 });
  b.bedrijf.machinepark.werktuigen.push({ uid: 'w1', type: 'ploeg-3', erf: 'zonnehoek', bezit: 'gehuurd', sinds: 0, volgende: 24, achterstand: 0, slijtage: 10, uren: 3 });
  PM.closePauseMenu(); await sleep(300); PM.openPauseMenu('boerderij'); await shot('boerderij', 1600); meet('boerderij', '#pause-menu [data-panel="boerderij"]');
  const pane = document.querySelector('#pause-menu [data-panel="boerderij"] .bd-pane'); if (pane) { pane.scrollTop = 600; await shot('boerderij-onder', 700); }
});
PM.closePauseMenu();
clearInterval(skipper);
return done;
