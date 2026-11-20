// Page half of scripts/qa/schermen_sweep.mjs (desktop --perf-script body; #988 #985, QA-sweep 20-11):
// opent de belangrijkste schermen en meet met detectors, zonder menselijk oog:
//   buiten beeld, afgekapte tekst, bedekte klikdoelen, contrast onder 4,5:1 (3:1 bij grote tekst), tekst onder 13 px,
//   focus (toets: tabindex/focuseerbaar; controller: de FOCUSABLE-selector van gamepad.js; zichtbare focusring), console-errors en NaN.
// window.__sw = { settle, schermen: [..], naam } (naam: label van het formaat). De detectors staan in scan() en werken op elk scherm.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const SW = window.__sw || {};
const fouten = [];
{ // console en fouten vanaf het begin van dit script
  const oe = console.error.bind(console), ow = console.warn.bind(console);
  console.error = (...a) => { fouten.push({ soort: 'error', tekst: a.map(String).join(' ').slice(0, 240) }); oe(...a); };
  console.warn = (...a) => { const t = a.map(String).join(' '); if (/NaN/.test(t)) fouten.push({ soort: 'nan', tekst: t.slice(0, 240) }); ow(...a); };
  window.addEventListener('error', (e) => fouten.push({ soort: 'window-error', tekst: String(e.message).slice(0, 240) }));
  window.addEventListener('unhandledrejection', (e) => fouten.push({ soort: 'rejection', tekst: String(e.reason && e.reason.message || e.reason).slice(0, 240) }));
}
const tap = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: code || k, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code: code || k, bubbles: true })); } };
const imp = (f) => import('/js/' + f + '.js');

// ---------- detectors (puur DOM, geen spelstaat) ----------
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, [tabindex]:not([tabindex="-1"])'; // gamepad.js
const KLIKBAAR = 'button, a[href], [role="button"], [role="tab"], [role="menuitem"], [role="option"], [role="radio"], input:not([type="hidden"]), select, textarea, summary, [data-action], [data-tab], [data-idx]';
const label = (el) => { const id = el.id ? '#' + el.id : ''; const c = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''; return (el.tagName.toLowerCase() + id + c + ' "' + (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 28) + '"'); };
const stijl = (el) => getComputedStyle(el);
const echtZichtbaar = (el) => { if (!el.getClientRects().length) return false; for (let a = el; a && a.nodeType === 1; a = a.parentElement) { const s = stijl(a); if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) < 0.05 || a.hidden) return false; if (a.getAttribute('aria-hidden') === 'true' && !a.matches(KLIKBAAR)) return false; } const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
// het stuk van het element dat niet door een scrolcontainer of overflow:hidden-ouder wordt weggeknipt
function geklipt(el) {
  let r = el.getBoundingClientRect(); let L = r.left, T = r.top, R = r.right, B = r.bottom;
  for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
    const s = stijl(a); if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
    const ar = a.getBoundingClientRect();
    if (s.overflowX !== 'visible') { L = Math.max(L, ar.left); R = Math.min(R, ar.right); }
    if (s.overflowY !== 'visible') { T = Math.max(T, ar.top); B = Math.min(B, ar.bottom); }
  }
  return { L, T, R, B, leeg: R - L <= 0 || B - T <= 0 };
}
const kleur = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const over = (boven, onder) => ({ r: boven.r * boven.a + onder.r * (1 - boven.a), g: boven.g * boven.a + onder.g * (1 - boven.a), b: boven.b * boven.a + onder.b * (1 - boven.a), a: 1 });
// de achtergrond onder een element: de lagen van binnen naar buiten opgeteld; null = een afbeelding of verloop (niet te meten)
function achtergrond(el) {
  const lagen = [];
  for (let a = el; a && a.nodeType === 1; a = a.parentElement) {
    const s = stijl(a);
    if (s.backgroundImage !== 'none' && /gradient|url/.test(s.backgroundImage)) { const k = kleur(s.backgroundColor); if (!k || k.a < 0.99) return null; lagen.push(k); break; }
    const k = kleur(s.backgroundColor); if (k && k.a > 0) { lagen.push(k); if (k.a >= 0.99) break; }
  }
  let uit = { r: 15, g: 36, b: 23, a: 1 }; // onder alles ligt het spelbeeld: onbekend, we nemen het donkere bordgroen
  for (let i = lagen.length - 1; i >= 0; i--) uit = over(lagen[i], uit);
  return { kleur: uit, zeker: lagen.some((k) => k.a >= 0.99) };
}
const heeftEigenTekst = (el) => [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim().length > 0);

function scan(root, opties = {}) {
  const vw = window.innerWidth, vh = window.innerHeight;
  const uit = { buitenBeeld: [], afgekapt: [], afgekaptEllips: [], bedekt: [], contrast: [], klein: [], geenFocus: [], geenControllerFocus: [], geenFocusring: [], kleinDoel: [], hoeken: [], teller: {} };
  const alle = [...root.querySelectorAll('*')].filter((e) => !['SCRIPT', 'STYLE', 'SVG', 'PATH', 'CANVAS'].includes(e.tagName.toUpperCase()) && echtZichtbaar(e));
  const doelen = alle.filter((e) => e.matches(KLIKBAAR) && !e.disabled && stijl(e).pointerEvents !== 'none');
  uit.teller = { elementen: alle.length, klikdoelen: doelen.length };
  const gezien = new Set(); const eenmaal = (lijst, sleutel, item) => { if (gezien.has(lijst + sleutel)) return; gezien.add(lijst + sleutel); uit[lijst].push(item); };
  for (const el of alle) {
    const k = geklipt(el); if (k.leeg) continue; // weggescrold of weggeknipt: niet in beeld, dus geen fout
    const r = el.getBoundingClientRect();
    // buiten beeld: het zichtbare deel loopt buiten het venster
    if ((k.R > vw + 1 || k.B > vh + 1 || k.L < -1 || k.T < -1) && (el.matches(KLIKBAAR) || heeftEigenTekst(el))) eenmaal('buitenBeeld', label(el), { el: label(el), rect: [Math.round(k.L), Math.round(k.T), Math.round(k.R), Math.round(k.B)], venster: [vw, vh] });
    if (heeftEigenTekst(el)) {
      const s = stijl(el); const px = parseFloat(s.fontSize);
      const tekst = el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40);
      if (px < 13) eenmaal('klein', label(el) + px, { el: label(el), px: +px.toFixed(1) });
      // afgekapt: de tekst past niet en de rest wordt weggeknipt (hidden/clip of ellipsis), geen scrolcontainer
      const knipX = s.overflowX === 'hidden' || s.overflowX === 'clip', knipY = s.overflowY === 'hidden' || s.overflowY === 'clip';
      if ((knipX && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 2) || (knipY && el.scrollHeight > el.clientHeight + 4 && el.clientHeight > 2 && s.display !== 'flex' && !(s.webkitLineClamp && s.webkitLineClamp !== 'none'))) eenmaal(s.textOverflow === 'ellipsis' ? 'afgekaptEllips' : 'afgekapt', label(el), { el: label(el), scroll: [el.scrollWidth, el.scrollHeight], client: [el.clientWidth, el.clientHeight], ellipsis: s.textOverflow === 'ellipsis' });
      // contrast
      const fg = kleur(s.color); const bg = achtergrond(el);
      if (fg && bg && bg.zeker) {
        const voor = fg.a < 1 ? over({ ...fg, a: fg.a * parseFloat(s.opacity || 1) }, bg.kleur) : fg;
        const cr = ratio(voor, bg.kleur); const groot = px >= 24 || (px >= 18.66 && parseInt(s.fontWeight, 10) >= 700);
        if (cr < (groot ? 3 : 4.5) && !el.matches(':disabled') && el.getAttribute('aria-disabled') !== 'true') eenmaal('contrast', label(el) + s.color + s.backgroundColor, { el: label(el), ratio: +cr.toFixed(2), eis: groot ? 3 : 4.5, px: +px.toFixed(1), kleur: s.color });
      }
    }
  }
  // bedekt: het midden van het klikdoel is van iets anders (niet een kind of ouder ervan)
  for (const el of doelen) {
    const k = geklipt(el); if (k.leeg) continue;
    const cx = (Math.max(k.L, 0) + Math.min(k.R, vw)) / 2, cy = (Math.max(k.T, 0) + Math.min(k.B, vh)) / 2;
    if (cx < 0 || cy < 0 || cx > vw || cy > vh) continue;
    const top = document.elementFromPoint(cx, cy);
    if (top && top !== el && !(top.closest && top.closest('#loading, #load-screen, #start-screen') && !el.closest('#loading, #load-screen, #start-screen')) && !el.contains(top) && !top.contains(el) && !(top.closest && top.closest('label') === el.closest('label') && top.closest('label'))) eenmaal('bedekt', label(el) + label(top), { el: label(el), bedektDoor: label(top) });
    const r = el.getBoundingClientRect();
    if (opties.touch && (r.width < 36 || r.height < 36)) eenmaal('kleinDoel', label(el), { el: label(el), px: [Math.round(r.width), Math.round(r.height)] });
  }
  // focus: toets (focuseerbaar) en controller (FOCUSABLE) en een zichtbare ring
  const vorige = document.activeElement;
  for (const el of doelen) {
    if (geklipt(el).leeg) continue;
    if (el.matches('input[type="hidden"]') || el.closest('.t-btn, #touch-controls')) continue; // raakknoppen zijn alleen voor vingers
    if (!el.matches(FOCUSABLE)) eenmaal('geenControllerFocus', label(el), { el: label(el) });
    const voorStijl = stijl(el); const voor = [voorStijl.outlineStyle, voorStijl.outlineWidth, voorStijl.boxShadow, voorStijl.backgroundColor, voorStijl.borderColor, voorStijl.transform].join('|');
    const oudeTr = el.style.transition; el.style.transition = 'none'; // anders meten we het begin van een overgang
    try { el.focus({ preventScroll: true }); } catch { /* */ }
    if (document.activeElement !== el) { eenmaal('geenFocus', label(el), { el: label(el), tabindex: el.getAttribute('tabindex') }); el.style.transition = oudeTr; continue; }
    // :focus-visible volgt of de laatste invoer een toets was; een script-focus telt soms niet mee, dan is de ring niet te beoordelen
    if (!el.matches(':focus-visible')) { uit.teller.focusOnbepaald = (uit.teller.focusOnbepaald || 0) + 1; el.style.transition = oudeTr; continue; }
    const na = stijl(el); void el.offsetWidth; const naStijl = [na.outlineStyle, na.outlineWidth, na.boxShadow, na.backgroundColor, na.borderColor, na.transform].join('|');
    const ring = (na.outlineStyle !== 'none' && parseFloat(na.outlineWidth) > 0) || (na.boxShadow !== 'none' && na.boxShadow !== voorStijl.boxShadow);
    el.style.transition = oudeTr;
    if (!ring && naStijl === voor) eenmaal('geenFocusring', label(el), { el: label(el) });
  }
  try { uit.hoeken = hoekScan(root); } catch (e) { uit.teller.hoekFout = e.message; } // vierkante vlakken in afgeronde hoeken (hoeken.page.js)
  if (vorige && vorige.focus) try { vorige.focus({ preventScroll: true }); } catch { /* */ } else if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  return uit;
}

// ---------- spel starten en schermen openen ----------
const uit = { formaat: SW.naam, venster: [window.innerWidth, window.innerHeight], touch: !!SW.touch, schermen: {}, fouten: [], overgeslagen: [] };
const aanbevolen = (naam, r) => { uit.schermen[naam] = r; console.log('[capture] ' + naam); };
const wachtOp = async (f, n = 120) => { for (let i = 0; i < n; i++) { if (f()) return true; await sleep(250); } return false; };
// het laadscherm (#loading, #load-screen) en het startscherm liggen soms nog over het spel: een klikdoel daaronder is geen fout, en we melden het per scherm
const OVERLAY = '#loading, #load-screen, #start-screen';
const meet = async (naam, root, touch) => { await sleep(900); try { const r = scan(root || document.body, { touch }); r.overlay = [...document.querySelectorAll(OVERLAY)].filter(echtZichtbaar).map((e) => e.id || e.className); aanbevolen(naam, r); if (SW.beeld && r.hoeken.length) { const weg = hoekMarkeer(r.hoeken); await sleep(400); console.log('[capture] hoeken-' + naam + '-' + SW.naam); await sleep(900); weg(); } } catch (e) { uit.overgeslagen.push(naam + ': ' + e.message); } };

// het startscherm (GDE_MENU_TEST=1 laat het staan)
const start = document.querySelector('#start-screen');
if (start && !document.body.classList.contains('game-started') && echtZichtbaar(start)) {
  await sleep(2500);
  await meet('start', start, SW.touch);
}
await wachtOp(() => document.body.classList.contains('game-started') || (window.__debug && window.__debug.world), 400);
for (let i = 0; i < 400 && !document.body.classList.contains('game-started'); i++) {
  const b = document.querySelector('#start-screen [data-action="new"], #start-screen [data-action="newgame"], #start-screen button');
  if (i % 20 === 5 && start && b) { try { const nieuw = [...start.querySelectorAll('button')].find((x) => /nieuw spel/i.test(x.textContent)); (nieuw || b).click(); } catch { /* */ } }
  await sleep(500);
}
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tap(' ', 'Space'); await sleep(700); }
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true; D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
w.clock = 14;
await sleep(SW.settle || 6000);
const wil = (n) => !SW.schermen || !SW.schermen.length || SW.schermen.includes(n);
const pm = () => document.querySelector('#pause-menu');

if (wil('hud')) await meet('hud', document.body, SW.touch);
// pauzemenu: [naam, openPauseMenu-argumenten]
const MENU = [
  ['pauze-spel', ['spel', { sub: 'overzicht' }]], ['spel-rail-acties', ['spel', { sub: 'acties' }]], ['samen-hub', ['samen']],
  ['te-doen', ['todo']], ['kaart', ['map']], ['prestaties', ['prestaties']], ['instellingen', ['settings']],
  ['spullen', ['spullen']], ['garage', ['garage']], ['verhaal-telefoon', ['telefoon']], ['loopbaan', ['loopbaan']], ['besturing', ['controls']],
  ['veroverd', ['veroverd']], ['foto-s', ['fotos']], ['over-credits', ['over']],
];
for (const [naam, args] of MENU) {
  if (!wil(naam)) continue;
  try { PM.openPauseMenu(...args); await sleep(1500); await meet(naam, pm(), SW.touch); } catch (e) { uit.overgeslagen.push(naam + ': ' + e.message); }
  try { PM.closePauseMenu(); } catch { /* */ }
  await sleep(500);
}
// winkel
if (wil('winkel')) {
  try {
    const SH = await imp('shops'); const SU = await imp('shopui');
    const s = SH.getShopsForRender()[0];
    w.money = 5000;
    for (let i = 0; i < 12 && !SU.isShopOpen(); i++) { if (p.inVehicle) p.exitVehicle(map, w); p.x = s.x; p.y = s.y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0; await sleep(250); tap('e', 'KeyE'); await sleep(700); }
    if (SU.isShopOpen()) { await sleep(900); await meet('winkel', document.querySelector('#shop-menu'), SW.touch); SU.closeShopMenu({ save: false }); await sleep(500); } else uit.overgeslagen.push('winkel: ging niet open');
  } catch (e) { uit.overgeslagen.push('winkel: ' + e.message); }
}
// kaart: legenda, zoekresultaten, plekkaartje, reisstap, route, hoverbalkje en het ontdekkaartje (mapview.js; de kaart zelf staat al in MENU)
const klikOp = (cv, x, y) => { cv.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: x, clientY: y })); window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0, clientX: x, clientY: y })); };
if (wil('kaart-extra')) {
  try {
    PM.openPauseMenu('map'); await sleep(4000);
    const ov = document.querySelector('.mapview-overlay'); const cv = ov && ov.querySelector('canvas');
    if (!ov || !cv) throw new Error('geen kaart');
    const lagen = ov.querySelector('.mv-layers');
    if (lagen) { lagen.click(); await meet('kaart-legenda', ov, SW.touch); lagen.click(); await sleep(300); }
    const si = ov.querySelector('.mapview-search input');
    if (si) { si.focus(); si.value = 'Groningen'; si.dispatchEvent(new Event('input', { bubbles: true })); await meet('kaart-zoek', ov, SW.touch); si.value = ''; si.dispatchEvent(new Event('input', { bubbles: true })); si.blur(); }
    const nk = ov.querySelector('.mv-naamkaart');
    if (nk) { nk.innerHTML = '<span class="mv-nk-k">Nieuw ontdekt</span><b class="mv-nk-n">Oosterpoort</b><span class="mv-nk-r">3 van 8 streken verkend</span>'; nk.hidden = false; nk.classList.add('show'); await meet('kaart-ontdekt', ov, SW.touch); nk.classList.remove('show'); nk.hidden = true; }
    const rc = cv.getBoundingClientRect(); const px = rc.left + rc.width / 2 + 90, py = rc.top + rc.height / 2 + 70;
    cv.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: rc.left + rc.width / 2, clientY: rc.top + rc.height / 2 })); await sleep(300);
    const tip = ov.querySelector('.mapview-tooltip'); if (tip && getComputedStyle(tip).display !== 'none' && tip.textContent.trim()) await meet('kaart-hover', ov, SW.touch);
    klikOp(cv, px, py); await sleep(800);
    const kaart = ov.querySelector('.mapview-card');
    if (kaart && !kaart.hidden) {
      await meet('kaart-plekkaartje', ov, SW.touch);
      const reis = kaart.querySelector('[data-card="reis"]'); if (reis) { reis.click(); await sleep(500); await meet('kaart-reisstap', ov, SW.touch); }
      const wp = kaart.querySelector('[data-card="waypoint"]'); if (wp) { wp.click(); await sleep(600); await meet('kaart-route', ov, SW.touch); }
    } else uit.overgeslagen.push('kaart-plekkaartje: geen kaartje na een klik');
    klikOp(cv, rc.left + rc.width / 2, rc.top + rc.height / 2); await sleep(600);
    if (kaart && !kaart.hidden) await meet('kaart-ikzelf', ov, SW.touch);
    const wis = ov.querySelector('[data-act="clear"]'); if (wis && !wis.hidden) wis.click();
  } catch (e) { uit.overgeslagen.push('kaart-extra: ' + e.message); }
  try { PM.closePauseMenu(); } catch { /* */ }
  await sleep(500);
}
// regelkaarten (regelkaart.js + regelwidget.js), toast en fotomodus
if (wil('regelkaart')) {
  try {
    const K = await imp('regelkaart');
    const stap = { kaart: { doel: 'Breng de eieren heel naar de bakker', druk: 'drie minuten', afloop: 'alle eieren stuk: opnieuw', regels: [
      { type: 'limiet', inv: { waarde: 38, limiet: 40, label: 'Snelheid' } }, { type: 'voorraad', inv: { heel: 42, totaal: 60, icoon: 'ei', label: 'Eieren' } },
      { type: 'toets', inv: { toetsen: ['A', 'D'], handeling: 'houd', label: 'Klimmen' } }, { type: 'wijzer', inv: { afstand: 120, hoek: -1.2, label: 'Doel' } } ] } };
    const staat = K.startKaart(stap, 'qa:hoeken');
    let n = 0;
    for (let i = 0; staat && i < 40 && !staat.klaar && n < 3; i++) { const spec = K.toonRegelkaart(w, staat, 0.5); if (spec) { n++; await meet('regelkaart-' + n, document.body, SW.touch); } staat.t += 0.5; }
    if (!n) uit.overgeslagen.push('regelkaart: geen kaartje getoond');
  } catch (e) { uit.overgeslagen.push('regelkaart: ' + e.message); }
}
if (wil('toast')) {
  try {
    w.addMessage('Pas op: de brug gaat open', 6); w.addMessage('Je hebt een nieuwe app op je telefoon', 6); await sleep(700);
    await meet('toast', document.body, SW.touch);
    const A = await imp('achievements'); const a = (A.ACHIEVEMENTS || []).find((x) => !A.isUnlocked(x.id));
    if (a) { A.unlockAchievement(w, a.id); await sleep(900); await meet('toast-prestatie', document.body, SW.touch); }
  } catch (e) { uit.overgeslagen.push('toast: ' + e.message); }
}
if (wil('fotomodus')) {
  try { tap('F8', 'F8'); await sleep(1800); if (document.querySelector('.foto-bar')) await meet('fotomodus', document.body, SW.touch); else uit.overgeslagen.push('fotomodus: geen paneel na F8 (uiPaused ' + !!w.uiPaused + ', cameraOverride ' + !!w.cameraOverride + ')'); tap('Escape', 'Escape'); await sleep(600); tap('F8', 'F8'); await sleep(500); } catch (e) { uit.overgeslagen.push('fotomodus: ' + e.message); }
}
// dialoog: een melding en het wachtscherm zijn geen dialoog; een dialoogscherm openen vraagt een NPC en blijft handwerk
uit.overgeslagen.push('dialoog: geen vaste ingang zonder NPC (niet gemeten)');
clearInterval(skipper);
uit.fouten = fouten;
return JSON.stringify(uit);
