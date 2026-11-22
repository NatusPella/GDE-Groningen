// Controlleraudit van alle kaarten, popups en korte overlays (22-11, #1011 en #495). Draait zonder Electron:
//  1. de kaarten met een eigen open...()-functie draaien echt in een nep-DOM (scripts/qa/overlay_minidom.mjs): beginfocus, elke richting
//     vanaf de focus (met de echte spatialNext en de terugval van gamepad.js menuFallback), A, B, Tab en de focus na het sluiten;
//  2. de pure HTML-bouwers (winkelkaart, reiskaart, radiokeuze, Samen-overlay, ...) worden opgebouwd en gecontroleerd op bereikbaarheid,
//     toetsplaatjes in de knop en rolkenmerken;
//  3. de bronnen van alle andere schermen (keuzepaneel, QTE, eindkaarten, meldingen, winkel, telefoon, minigames, ...) krijgen de
//     bronregels: B/Esc-uitweg, klikbare niet-knoppen, hold zonder tik, minigametoetsen die de controller niet heeft.
//   node scripts/controller_audit_overlays.mjs [--json]
// De test (scripts/controller_overlays_test.mjs) eist nul bevindingen buiten de lijst met onderbouwde uitzonderingen.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { installMiniDom, mkEvent } from './qa/overlay_minidom.mjs';

// GDE_AUDIT_ROOT: een andere uitcheck van de repo (voor de meting 'voor' op origin/main); standaard deze
const ROOT = process.env.GDE_AUDIT_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const JS = path.join(ROOT, 'game', 'js');
const read = (f) => fs.readFileSync(path.join(JS, f), 'utf8');
const imp = (f) => import(pathToFileURL(path.join(JS, f)).href);

const dom = installMiniDom();
const { doc } = dom;

// ---- de focusregels van gamepad.js, uit de bron gehaald zodat een wijziging daar hier meetelt
const padSrc = read('gamepad.js');
const FOCUSABLE = (padSrc.match(/const FOCUSABLE = '([^']+)';/) || [])[1] || '';
const { spatialNext } = await imp('padlogic.js');
const { PAD_MAPS } = await imp('controls.js');
const { padCan } = await imp('padscreens.js');

const KEYNAME = { arrowup: 'ArrowUp', arrowdown: 'ArrowDown', arrowleft: 'ArrowLeft', arrowright: 'ArrowRight', enter: 'Enter', escape: 'Escape', backspace: 'Backspace', ' ': ' ', tab: 'Tab', q: 'q', e: 'e' };

// Wat gamepad.js doet bij een menuknop: de toets naar het element met de focus (of window), en als niemand hem opeet de terugval.
function padKey(name) {
  const el = doc.activeElement || doc.body;
  const ev = mkEvent('keydown', { key: KEYNAME[name] || name, __gde: 'pad' });
  el.dispatchEvent(ev);
  if (ev.defaultPrevented) return ev;
  const a = name;
  const cur = doc.activeElement;
  if ((a === 'enter' || a === ' ') && cur && cur !== doc.body) {
    if (cur.matches('button, a, [role="button"], [role="tab"], [role="radio"], summary, input[type="checkbox"]')) cur.click();
    return ev;
  }
  if (!a.startsWith('arrow')) return ev;
  const scope = (cur && cur.closest && cur.closest('[role="dialog"], [role="alertdialog"]')) || doc.querySelector('[role="dialog"]:not([hidden]), [role="alertdialog"]:not([hidden])') || doc.body;
  const list = scope.querySelectorAll(FOCUSABLE).filter((b) => b.getClientRects().length && !b.closest('[hidden]'));
  if (!list.length) return ev;
  const i = list.indexOf(cur);
  const rects = list.map((b) => { const r = b.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  let j = spatialNext(rects, i, a.slice(5));
  if (j < 0) j = i < 0 ? 0 : (i + (a === 'arrowup' || a === 'arrowleft' ? -1 : 1) + list.length) % list.length;
  list[j].focus();
  list[j].scrollIntoView({ block: 'nearest' });
  return ev;
}
// Een toetsenbordtoets (Tab) zonder pad-vlag: de terugval is dan de browser zelf (niet nagebootst; alleen de kaart-eigen val telt).
function tabKey(shift = false) { const el = doc.activeElement || doc.body; const ev = mkEvent('keydown', { key: 'Tab', shiftKey: shift }); el.dispatchEvent(ev); return ev; }

const findings = []; // { screen, check, detail }
const screens = [];  // { id, titel, soort, via, checks: [{ check, ok, detail }] }
function screen(id, titel, soort, via) {
  const s = { id, titel, soort, via, checks: [] };
  screens.push(s);
  const rec = (check, ok, detail = '') => { s.checks.push({ check, ok, detail }); if (!ok) findings.push({ screen: id, check, detail }); };
  return { s, rec };
}

// ---- gedeelde controles op een opgebouwde kaart (de DOM staat in doc.body)
const focusables = (root) => root.querySelectorAll(FOCUSABLE).filter((b) => b.getClientRects().length && !b.closest('[hidden]'));
// Alles wat een speler met Tab of de muis zou bereiken (de browserdefinitie), om te zien wat de D-pad mist.
const browserFocusables = (root) => root.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select, textarea, summary, [tabindex]:not([tabindex="-1"])').filter((b) => b.getClientRects().length && !b.closest('[hidden]'));

function exploreReach(startCount = 60, reeksen = null) {
  // loopt vanaf de beginfocus met elke richting (en een vaste wissel) en geeft de bezochte elementen
  const seen = new Set(); if (doc.activeElement) seen.add(doc.activeElement);
  const reeks = reeksen || [['arrowdown'], ['arrowup'], ['arrowright'], ['arrowleft'], ['arrowdown', 'arrowright'], ['arrowup', 'arrowleft']];
  for (const r of reeks) for (let i = 0; i < startCount; i++) { padKey(r[i % r.length]); if (doc.activeElement) seen.add(doc.activeElement); }
  return seen;
}

function checkKeycaps(rec, root) {
  // een knop met een sneltoets (aria-keyshortcuts of data-key) heeft het toetsplaatje IN de knop (.hud-key, data-gk, kbd, .m-kc)
  const zonder = root.querySelectorAll('button').filter((b) => (b.hasAttribute('aria-keyshortcuts') || b.hasAttribute('data-key')) && !b.querySelector('.hud-key, [data-gk], kbd, .m-kc'));
  rec('plaatje', zonder.length === 0, zonder.map((b) => (b.attrs['data-ok'] || b.attrs['data-qc'] || b.attrs['data-keuze'] || b.attrs.class || 'knop')).join(', '));
  const dubbel = {}; for (const b of root.querySelectorAll('[aria-keyshortcuts]')) { const k = b.attrs['aria-keyshortcuts']; dubbel[k] = (dubbel[k] || 0) + 1; }
  const botst = Object.entries(dubbel).filter(([, n]) => n > 1).map(([k]) => k);
  rec('botsing', botst.length === 0, 'dubbele sneltoets: ' + botst.join(', '));
}

function checkModalRoot(rec, root) {
  const dlg = root.querySelector('[role="dialog"], [role="alertdialog"]');
  rec('focusval', !!dlg && dlg.getAttribute('aria-modal') === 'true', 'geen role=dialog/alertdialog met aria-modal: de D-pad zoekt dan in heel de pagina');
}

function checkClickables(rec, root) {
  // klikbaar maar niet focusbaar: een element met een actie-attribuut dat geen knop, link of invoerveld is en geen tabindex of rol heeft
  const bad = root.querySelectorAll('[onclick], [data-act], [data-action], [data-klik]').filter((e) => !/^(BUTTON|A|INPUT|SELECT|SUMMARY|TEXTAREA)$/.test(e.tagName) && !e.hasAttribute('tabindex') && !/^(button|tab|radio|option|menuitem|checkbox)$/.test(e.getAttribute('role') || ''));
  rec('klikdiv', bad.length === 0, bad.map((e) => e.tagName.toLowerCase() + '.' + (e.attrs.class || '')).join(', '));
}

// ============================================================== 1. de kaarten met een open...()-functie, echt gedraaid
async function flow(id, titel, soort, opener, { open, terugKey = 'escape', verwachtTerug, restoreFocus = false, extra }) {
  const { rec, s } = screen(id, titel, soort, 'draaien');
  // een knop op de pagina die de focus had toen de kaart openging
  const opener_ = doc.createElement('button'); opener_.id = 'audit-opener'; opener_.attrs.class = 'opener'; doc.body.appendChild(opener_); opener_.focus();
  let uitkomst; let klaar = false;
  const p = open(); Promise.resolve(p).then((v) => { uitkomst = v; klaar = true; });
  await dom.tick();
  const card = doc.body.children.find((c) => /os-overlay|quit-confirm|legacy-save-card/.test(c.attrs.class || '') || c.id === 'online-start') || doc.body.children[doc.body.children.length - 1];
  const kaart = card && card !== opener_ ? card : null;
  rec('open', !!kaart, 'de kaart staat niet op het scherm');
  if (!kaart) return s;
  checkModalRoot(rec, kaart);
  checkKeycaps(rec, kaart);
  checkClickables(rec, kaart);
  const fs0 = focusables(kaart);
  rec('focusstart', !!doc.activeElement && kaart.contains(doc.activeElement), 'de focus staat bij openen niet in de kaart');
  const gezien = exploreReach();
  const mist = browserFocusables(kaart).filter((e) => !gezien.has(e));
  rec('bereik', mist.length === 0, 'niet met D-pad/stick te bereiken: ' + mist.map((e) => e.tagName.toLowerCase() + '.' + (e.attrs.class || e.attrs.type || '')).join(', '));
  // de focus blijft binnen de kaart bij elke richting (geen lek naar het menu eronder)
  rec('focuslek', [...gezien].every((e) => kaart.contains(e)), 'de focus verliet de kaart');
  // A activeert: Enter op de focus doet iets of is bewust een invoerveld (opent het schermtoetsenbord)
  if (extra) await extra({ rec, kaart, p });
  // B
  const eind = () => klaar;
  if (verwachtTerug === 'sluit') { padKey(terugKey); await dom.tick(); rec('terug', eind(), 'B/Esc sluit de kaart niet'); } else if (verwachtTerug === 'nee') { rec('terug', true, 'bewust geen uitweg'); } else if (verwachtTerug === 'geen-effect') { const voor = doc.body.children.includes(kaart); padKey(terugKey); await dom.tick(); rec('terug-blijft', doc.body.children.includes(kaart) === voor, ''); }
  // de focus terug naar waar hij was
  if (klaar && restoreFocus) rec('focusterug', doc.activeElement === opener_, 'na het sluiten staat de focus niet op de knop die de kaart opende');
  // opruimen
  if (!klaar) { for (const k of ['escape', 'escape']) { padKey(k); await dom.tick(); } }
  if (!klaar) { const b = kaart.querySelector('[data-keuze], [data-ok], [data-qc], [data-doorgaan], [data-geef], [data-klaar]'); if (b) { b.click(); await dom.tick(); } }
  opener_.remove(); kaart.remove(); void fs0; void uitkomst;
  doc.activeElement = null;
  return s;
}

async function dynamischeKaarten() {
  const L = await imp('launchchoiceui.js');
  const D = await imp('difficultyui.js');
  const G = await imp('legacysavecardui.js');
  const Q = await imp('quitconfirmui.js');
  const O = await imp('onlineconsentui.js');

  await flow('startkeuze', 'Startkeuze Alleen/Samen', 'kaart', null, { open: () => L.openLaunchChoice(), verwachtTerug: 'sluit', restoreFocus: false });
  await flow('toestemming', 'Toestemmingskaart Samen spelen', 'kaart', null, { open: () => L.openToestemming(), verwachtTerug: 'sluit', restoreFocus: true });
  await flow('moeilijkheid', 'Moeilijkheidskaart (niveau)', 'kaart', null, { open: () => D.openDifficultyCard(), verwachtTerug: 'sluit' });
  // B in het aanpassen-scherm gaat een niveau terug, niet uit de kaart: apart nagelopen
  {
    const { rec } = screen('moeilijkheid-b', 'Moeilijkheidskaart: B in aanpassen', 'kaart', 'draaien');
    let klaar = false; const p = D.openDifficultyCard(); p.then(() => { klaar = true; }); await dom.tick();
    const kaart = doc.body.children[doc.body.children.length - 1];
    kaart.querySelector('[data-aanpassen]').focus(); padKey('enter'); await dom.tick();
    rec('opties-open', !!kaart.querySelector('[data-klaar]'), 'Aanpassen opent de optielijst niet');
    const gezien = exploreReach(40, [['arrowdown'], ['arrowup']]);
    const rijen = kaart.querySelectorAll('[data-optie]');
    rec('bereik', rijen.length > 5 && kaart.querySelectorAll('[data-optie]').every((r) => r.focused > 0) && gezien.has(kaart.querySelector('[data-klaar]')), 'niet alle optierijen en Klaar zijn met de D-pad te bereiken');
    padKey('escape'); await dom.tick();
    rec('terug', !klaar && !!kaart.querySelector('[data-niveau]'), 'B in de optielijst hoort een niveau terug te gaan naar de niveaukeuze');
    padKey('escape'); await dom.tick(); rec('terug-uit', klaar, 'B in de niveaukeuze sluit de kaart niet');
    kaart.remove(); doc.activeElement = null;
  }
  // de oude-saves-kaart: kiezen is verplicht, B doet bewust niets
  {
    let gekozen = null;
    await flow('oudesaves', 'Oude-saves-kaart', 'kaart', null, {
      open: () => { G.askLegacyCard({ onDoorgaan: () => { gekozen = 'door'; }, onNieuw: () => { gekozen = 'nieuw'; } }); return new Promise(() => {}); },
      verwachtTerug: 'geen-effect',
    });
    void gekozen;
  }
  {
    let antw = null; let focusTerug = false;
    const opener = doc.createElement('button'); opener.attrs.class = 'menuknop'; doc.body.appendChild(opener);
    const { rec } = screen('afsluiten', 'Afsluit-bevestiging', 'kaart', 'draaien');
    opener.focus();
    Q.askQuitConfirm({ onYes: () => { antw = 'ja'; }, onNo: () => { antw = 'nee'; opener.focus(); focusTerug = doc.activeElement === opener; } });
    const kaart = doc.body.children.find((c) => c.id === 'quit-confirm');
    rec('open', !!kaart, 'geen kaart');
    checkModalRoot(rec, kaart); checkKeycaps(rec, kaart);
    rec('focusstart', doc.activeElement && doc.activeElement.attrs['data-qc'] === 'nee', 'de focus hoort op Annuleren te staan (een verdwaalde A sluit niets)');
    const gezien = exploreReach(10);
    rec('bereik', kaart.querySelectorAll('[data-qc]').every((b) => gezien.has(b)), 'Ja of Nee onbereikbaar');
    padKey('escape'); await dom.tick();
    rec('terug', antw === 'nee', 'B/Esc annuleert niet');
    rec('focusterug', focusTerug, 'de focus gaat niet terug naar het menu');
    opener.remove(); doc.activeElement = null;
  }
  // de naamkaart voor Samen spelen (met en zonder Terug)
  await flow('naamkaart-samen', 'Naam- en akkoordkaart Samen spelen (met Terug)', 'kaart', null, { open: () => O.openOnlineStart({ naam: '', terug: true }), verwachtTerug: 'sluit', restoreFocus: true });
  await flow('naamkaart-zonder-terug', 'Naam- en akkoordkaart zonder Terug', 'kaart', null, { open: () => O.openOnlineStart({ naam: '', terug: false }), verwachtTerug: 'nee' });
}

// ============================================================== 2. pure HTML-bouwers
// Een opgebouwde kaart (HTML-bouwer) in de nep-DOM: bereikbaarheid vanaf de eerste focus, toetsplaatjes in de knoppen, klikbare niet-knoppen.
function htmlScherm(id, titel, html, { modal = false, soort = 'kaart' } = {}) {
  const { rec } = screen(id, titel, soort, 'bouwer');
  const wrap = doc.createElement('div'); wrap.id = 'audit-' + id; doc.body.appendChild(wrap);
  wrap.innerHTML = html;
  if (modal) checkModalRoot(rec, wrap);
  checkKeycaps(rec, wrap); checkClickables(rec, wrap);
  const alle = browserFocusables(wrap);
  rec('focusbaar', alle.length > 0, 'geen enkel focusbaar element');
  if (alle.length) {
    alle[0].focus();
    const gezien = exploreReach(40);
    const mist = alle.filter((e) => !gezien.has(e) && !(e.getAttribute('aria-disabled') === 'true'));
    rec('bereik', mist.length === 0, 'niet met D-pad/stick te bereiken: ' + mist.map((e) => e.tagName.toLowerCase() + '.' + (e.attrs.class || '')).join(', '));
  }
  wrap.remove(); doc.activeElement = null;
}

async function bouwSchermen() {
  const O = await imp('coopoverlay.js');
  const K = await imp('kaartactieui.js');
  const R = await imp('radiokeuze.js');
  const C = await imp('onlineconsentui.js');
  htmlScherm('samen-overlay-vraag', 'Samen-overlay: het spel overnemen (Ja/Nee)', O.overlayHtml({ title: 'Het spel overnemen?', text: 'Test', buttons: [{ action: 'ja', label: 'Ja', toets: 'J', primary: true }, { action: 'nee', label: 'Nee', toets: 'N' }] }), { modal: true });
  htmlScherm('samen-overlay-wacht', 'Samen-overlay: even wachten', O.overlayHtml({ title: 'Even wachten', text: 'Test', buttons: [{ action: 'stop', label: 'Stoppen', primary: true }] }), { modal: true });
  htmlScherm('kaart-reispopup', 'Kaart: reiskeuze (OV-planner)', K.reisPopupHtml({ naam: 'Station', afstand: '3 km', gekozen: 'trein', rijen: [{ id: 'trein', label: 'Trein', toets: '1', kosten: '€4', duur: '10 min', icoon: 'trein' }, { id: 'bus', label: 'Bus', toets: '2', kosten: '€3', duur: '20 min', icoon: 'bus' }], reis: { label: 'Reis nu' } }), { modal: true });
  htmlScherm('kaart-uitleg', 'Kaart: eenmalige uitleg', K.uitlegHtml(), { modal: true });
  htmlScherm('kaart-acties', 'Kaart: plekkaart met drie acties', K.actiesHtml({ acties: [{ id: 'reis', label: 'Reis erheen', sub: 'trein', icoon: 'trein', toets: '1' }, { id: 'info', label: 'Info', sub: 'meer', icoon: 'info', toets: '2' }] }, null) + K.sluitHtml());
  htmlScherm('radio-zenders', 'Zenderkeuze (radio)', R.channelPickerHtml([{ id: 'a', name: 'Zender A', sub: 'sub', dj: 'DJ', tracks: 3, status: 'open', active: true }, { id: 'b', name: 'Zender B', sub: 'sub', dj: 'DJ', tracks: 3, status: 'open', active: false }]), { soort: 'paneel' });
  htmlScherm('samen-naam-instelling', 'Spelerspaneel: naam en akkoord', C.onlineInstellingHtml({ naam: '', meedoen: false }), { soort: 'paneel' });
}

// ============================================================== 3. bronregels voor de rest
const readOr = (f) => { try { return read(f); } catch (e) { return ''; } };
const STAP = /(Escape|Backspace|'escape'|'backspace'|"escape"|data-key="ESC"|key\('(?:ESC|BACKSPACE)'\)|wasPressed\('(?:escape|backspace)'\)|keyTerug|TERUG)/i;
const TIK = /(tikStand|holdlatch|makeLatch|tapActions|holdAlt|tikAlt)/;
const HOLD = /(holdTime|holdT\b|HOLD_S\b|holdSec|houd .*ingedrukt|holdMs|HOLD_MS|vasthouden)/i;

function bronChecks(def) {
  const { rec } = screen(def.id, def.titel, def.soort, 'bron');
  const src = def.files.map(readOr).join('\n');
  rec('bron', src.length > 0, 'geen bronbestand gevonden: ' + def.files.join(', '));
  if (!src) return;
  if (def.soort === 'paneel' || def.soort === 'minigame' || def.soort === 'kaart') rec('terug', STAP.test(src) || !!def.terugVia, 'geen B/Esc/Backspace-uitweg in ' + def.files.join(', '));
  // klikbare niet-knoppen via createElement: een eigen tabindex of rol nodig
  const bad = [];
  for (const m of src.matchAll(/const (\w+) = document\.createElement\('(div|span|li|p|img)'\)/g)) {
    const v = m[1];
    const klik = new RegExp(`\\b${v}\\.(onclick\\s*=|addEventListener\\('click')`).test(src);
    const focus = new RegExp(`\\b${v}\\.(tabIndex\\s*=|setAttribute\\('(tabindex|role)')`).test(src);
    if (klik && !focus) bad.push(v);
  }
  for (const m of src.matchAll(/<(div|span|li|p)\b[^>]*\sonclick=/g)) bad.push('inline onclick ' + m[1]);
  rec('klikdiv', bad.length === 0, 'klikbaar maar niet focusbaar (div/span): ' + bad.join(', '));
  const preventOnly = /preventScroll:\s*true/.test(src) && !/scrollIntoView/.test(src) && /overflow(-y|Y)?['"]?\s*[:=]\s*['"]?(auto|scroll)/.test(src);
  rec('scroll', !preventOnly || !!def.scrollUit, 'focus met preventScroll zonder scrollIntoView: een lijst scrolt niet mee met de focus');
  if (HOLD.test(src)) rec('tik', TIK.test(src) || !!def.tikVia, 'houd-actie zonder tik-alternatief (tikStand/holdlatch)');
  if (def.soort === 'minigame') {
    const ctx = def.ctx || 'minigame';
    const map = PAD_MAPS[ctx];
    const tokens = new Set(); for (const m of src.matchAll(/key\('([A-Z0-9;,.\[\]]{1,9}|SPATIE|BACKSPACE|ESC|ENTER|SHIFT|CTRL)'\)/g)) tokens.add(m[1]);
    for (const m of src.matchAll(/\{(SPACE|SPATIE|ESC|ENTER|SHIFT|CTRL|BACKSPACE|[A-Z0-9])\}/g)) tokens.add(m[1]);
    const naarToets = (t) => ({ SPATIE: ' ', SPACE: ' ', BACKSPACE: 'backspace', ESC: 'escape', ENTER: 'enter', SHIFT: 'shift', CTRL: 'control' }[t] || t.toLowerCase());
    for (const t of def.viaPagina || []) tokens.delete(t); // het keuzescherm van de wedstrijd: 5 tot 8 via de tweede pagina (E/Y), zie hieronder
    if (def.viaPagina) rec('tweede-pagina', /panel.pagina/.test(src), 'de opties ' + def.viaPagina.join(', ') + ' hebben geen padroute (tweede pagina met E/Y)');
    const mist = [...tokens].filter((t) => { const k = naarToets(t); return !(['w', 'a', 's', 'd'].includes(k) && ['move', 'steer', 'arrows'].includes(map.stick)) && !padCan(ctx, k) && !Object.values(map).includes(k) && !(def.ctxExtra && (padCan(def.ctxExtra, k) || Object.values(PAD_MAPS[def.ctxExtra]).includes(k))) && !(k === 'lmb' || k === 'rmb'); });
    rec('toetsen-op-pad', mist.length === 0, `toets in een hint die de controller niet heeft (context ${ctx}): ${mist.join(', ')}`);
    rec('stop-op-pad', !!(padCan(ctx, 'backspace') || padCan(ctx, 'escape')), 'geen stopknop in de padindeling ' + ctx);
  }
}

// De schermen zonder eigen open()-functie: hun bronbestanden en wat ze moeten kunnen. soort: kaart (interactief, eigen uitweg),
// paneel (interactief in het spel), melding (alleen tonen, geen focus), minigame (toetsen via de padindeling), hud (alleen tonen).
const BRON = [
  { id: 'laadscherm', titel: 'Laadscherm en startkaart', soort: 'melding', files: ['startkaart.js'] },
  { id: 'keuzepaneel', titel: 'Keuzepaneel tijdens bijbanen en scenes', soort: 'paneel', files: ['choicepanel.js', 'casework.js'], terugVia: 'cijfertoetsen 1-4 via de D-pad, B is Backspace (PAD_MAPS.minigame)' },
  { id: 'qte', titel: 'Quicktime-stappen (QTE)', soort: 'melding', files: ['qte.js'] },
  { id: 'eindkaart-impact', titel: 'Eindkaart (resultaat)', soort: 'melding', files: ['endcardimpact.js'] },
  { id: 'recapkaart', titel: 'Terugblik-kaart', soort: 'kaart', files: ['recapcard.js', 'recapcardrun.js'] },
  { id: 'aftiteling', titel: 'Aftiteling', soort: 'melding', files: ['credits.js'] },
  { id: 'melding', titel: 'Meldingen met aflopend balkje', soort: 'melding', files: ['melding.js', 'menumelding.js'] },
  { id: 'fouttoast', titel: 'Foutmelding (toast)', soort: 'melding', files: ['fouttoast.js'] },
  { id: 'busmelding', titel: 'Busmelding', soort: 'melding', files: ['busmelding.js'] },
  { id: 'winkel', titel: 'Winkelmenu (kopen/verkopen)', soort: 'kaart', files: ['shopui.js'] },
  { id: 'verkoopkaart', titel: 'Aanbodkaart (erf te koop)', soort: 'kaart', files: ['forsalecard.js', 'pitchcard.js'] },
  { id: 'pashokje', titel: 'Pashokje en kledingwinkel', soort: 'paneel', files: ['clothingpanel.js', 'winkelkit.js'], terugVia: 'het winkelmenu (shopui.js onKey): Esc, Backspace en Q sluiten' },
  { id: 'kappersstoel', titel: 'Kappersstoel (keuze)', soort: 'paneel', files: ['kapperkeuze.js'], terugVia: 'het winkelmenu (shopui.js onKey): Esc en Backspace sluiten' },
  { id: 'balie', titel: 'Balie en loket (interieur)', soort: 'paneel', files: ['loket3d.js', 'snackui.js'], terugVia: 'de balie opent het winkelmenu of een tekstpaneel; B is Backspace in de minigame-indeling' },
  { id: 'telefoon', titel: 'Telefoon met parodie-apps', soort: 'paneel', files: ['phone.js', 'phoneapp.js'] },
  { id: 'vertrekbord', titel: 'Vertrekbord en OV-planner', soort: 'melding', files: ['departuretimelineui.js', 'ovkaart.js', 'reiskaart.js'] },
  { id: 'radiomelding', titel: 'Radio-melding en zenderkeuze', soort: 'melding', files: ['radio.js', 'radiokeuze.js'], tikVia: 'N kort is aan of uit, vasthouden is het zenderwiel (radiocontrol createNKey); de tekst in radio.js noemt dat alleen' },
  { id: 'samenwiel', titel: 'Samen-wiel (zinnen en emotes)', soort: 'paneel', files: ['multiplayerphrasesradial.js', 'multiplayerphrases.js'] },
  { id: 'doelvoorstel', titel: 'Gedeeld doel-voorstel (J/N)', soort: 'kaart', files: ['multiplayergoal.js'], terugVia: 'coopvraag-indeling: A is J, B is N' },
  { id: 'meedoen', titel: 'Meedoen?-kaart', soort: 'kaart', files: ['coopmeedoen.js'], terugVia: 'coopvraag-indeling: A is J, B is N' },
  { id: 'samen-overlay', titel: 'Samen-overlay (wachten, wegvallen, overnemen)', soort: 'kaart', files: ['coopoverlay.js', 'coophold.js'] },
  { id: 'kaartactie', titel: 'Kaart: acties, reizen en uitleg', soort: 'paneel', files: ['kaartactieui.js'] },
  { id: 'mg-kart', titel: 'Kart: HUD en toetsen', soort: 'minigame', files: ['kartrace.js', 'kartstatus.js'], ctx: 'vehicle' },
  { id: 'mg-padel', titel: 'Padel: HUD en toetsen', soort: 'minigame', files: ['padel.js', 'padelstatus.js'] },
  { id: 'mg-golf', titel: 'Discgolf: HUD en toetsen', soort: 'minigame', files: ['discgolf.js', 'golfhud.js', 'golfbeurt.js'] },
  { id: 'mg-klimtoren', titel: 'Klimtoren: HUD en toetsen', soort: 'minigame', files: ['klimtoren.js'], ctx: 'klimtoren' },
  { id: 'mg-penalty', titel: 'Penalty\'s: HUD en toetsen', soort: 'minigame', files: ['penalty.js', 'penaltystatus.js'] },
  { id: 'mg-training', titel: 'Voetbaltraining: HUD en toetsen', soort: 'minigame', files: ['voetbaltraining.js', 'voetbaltrainingrun.js'], ctx: 'voetbal' },
  { id: 'voetbal-tv', titel: 'Voetbalwedstrijd: tv-UI, pauze- en rustscherm', soort: 'melding', files: ['voetbaltvlayer.js', 'voetbalpresentatie.js'] },
  { id: 'mg-voetbal', titel: 'Voetbalwedstrijd: toetsen en stoppen', soort: 'minigame', files: ['voetbal.js', 'voetbalrules.js'], ctx: 'voetbal', viaPagina: ['5', '6', '7', '8'], ctxExtra: 'minigame' },
];

// Regels die over alle schermen gaan: platte sneltoetsen in knoplabels en de LB/RB-route naar tabbladen in kaarten.
function globaleChecks() {
  {
    const { rec } = screen('knoplabels', 'Knoppen: sneltoets in het label (geen toets-in-de-knop)', 'globaal', 'bron');
    const hits = [];
    for (const f of fs.readdirSync(JS).filter((x) => x.endsWith('.js'))) {
      const src = read(f);
      for (const m of src.matchAll(/label:\s*['"][^'"\n]*\((?:J|N|E|F|Q|Esc|Enter|Spatie)\)['"]/g)) hits.push(f + ': ' + m[0]);
      for (const m of src.matchAll(/<button[^>]*>[^<>\n]{1,40}\((?:J|N|E|F|Esc|Enter)\)<\/button>/g)) hits.push(f + ': ' + m[0].slice(0, 60));
    }
    rec('plaatje', hits.length === 0, hits.join(' | '));
  }
  {
    const { rec } = screen('tabbladen-lbrb', 'Kaarten met tabbladen: LB en RB wisselen ze', 'globaal', 'bron');
    // een kaart met role="tablist" buiten het pauzemenu moet een eigen LB/RB-route hebben in gamepad.js (menuKey): zonder die route stuurt het pad niets
    const zonder = [];
    const KLASSE = { 'shopui.js': 'shop-open', 'tuningworkshopui.js': 'shop-open' }; // beide zetten body.shop-open zolang ze open zijn
    const pauze = read('pausemenu.js');
    for (const f of fs.readdirSync(JS).filter((x) => x.endsWith('.js') && !/^(pausemenu|pausestate|mapview|spullen|todo|gamepad|a11y)/.test(x))) {
      const src = read(f);
      if (!/role="tablist"|m-tablist/.test(src) || /export const \w*CSS/.test(f)) continue;
      if (!KLASSE[f] && pauze.includes(`'./${f}'`)) continue; // een paneel in het pauzemenu: daar zijn LB en RB al de tabbladen (menuKey: pauseOpen)
      const k = KLASSE[f];
      if (!k || !padSrc.includes(`classList.contains('${k}')`)) zonder.push(f);
    }
    rec('lbrb', zonder.length === 0, 'tabbladen zonder LB/RB-route: ' + zonder.join(', '));
  }
}

export async function runAudit() {
  findings.length = 0; screens.length = 0;
  await dynamischeKaarten();
  await bouwSchermen();
  for (const def of BRON) bronChecks(def);
  globaleChecks();
  return { screens, findings: [...findings] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = await runAudit();
  if (process.argv.includes('--json')) console.log(JSON.stringify(r, null, 1));
  else {
    for (const s of r.screens) console.log(`${s.checks.every((c) => c.ok) ? 'OK  ' : 'FOUT'} ${s.id.padEnd(24)} (${s.via}) ${s.checks.filter((c) => !c.ok).map((c) => c.check + ': ' + c.detail).join(' | ')}`);
    console.log(`\n${r.screens.length} schermen, ${r.findings.length} bevindingen`);
  }
}
void mkEvent;
