// The saves screen (#208): choose, load, save here, rename, export, import and delete
// savegames, from the main menu (mode 'start') and the pause menu (mode 'game').
// Keyboard (arrows, Enter, Esc), gamepad (d-pad / stick, A, B) and touch / mouse all work
// on the same buttons. The storage side is saveslots.js; the world side savegame.js.
import * as S from './saveslots.js';
import { MAX_SLOTS } from './storagekeys.js';
import { saveGame, loadSlot, readSave, startNewSlot, bindSlot } from './savegame.js';

const DESKTOP = typeof window !== 'undefined' && window.gdeDesktop && window.gdeDesktop.isDesktop ? window.gdeDesktop : null;

let rootEl = null;

export function isSaveSlotsOpen() {
  return !!rootEl;
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function whenText(ms) {
  if (!ms) return 'Nog niet opgeslagen';
  const d = new Date(ms);
  return `${d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`;
}

function ensureCss() {
  for (const css of ['menu.css', 'saveslots.css']) {
    if (document.getElementById('style-' + css)) continue;
    const link = document.createElement('link');
    link.id = 'style-' + css;
    link.rel = 'stylesheet';
    link.href = new URL('./' + css, import.meta.url).href;
    document.head.appendChild(link);
  }
}

function download(filename, text) {
  if (DESKTOP && DESKTOP.saveTextFile) { DESKTOP.saveTextFile(filename, text); return; }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// opts: { mode: 'start' | 'game', world, onLoad(n) (start: the caller continues with the chosen
// slot, already active), onNew() (start: the caller starts a new game), onClose() }
export function openSaveSlots(opts = {}) {
  if (rootEl) return;
  ensureCss();
  const mode = opts.mode === 'game' ? 'game' : 'start';
  const world = opts.world || null;
  let sel = S.activeSlot();
  let view = 'detail'; // 'detail' | 'rename' | 'delete' | 'overwrite'
  let message = '';
  let lastFocus = document.activeElement;

  rootEl = document.createElement('div');
  rootEl.id = 'saveslots';
  rootEl.className = 'gm';
  rootEl.setAttribute('role', 'dialog');
  rootEl.setAttribute('aria-modal', 'true');
  rootEl.setAttribute('aria-labelledby', 'ssl-title');
  document.body.appendChild(rootEl);
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = '.json,application/json';
  file.hidden = true;
  rootEl.appendChild(file);

  const close = (afterClose) => {
    window.removeEventListener('keydown', onKey, true);
    rootEl.remove();
    rootEl = null;
    try { if (lastFocus && lastFocus.focus) lastFocus.focus(); } catch (e) { /* gone */ }
    if (afterClose) afterClose();
    else if (opts.onClose) opts.onClose();
  };

  const slotRow = (s) => {
    const sm = s.summary;
    const sub = s.state !== 'ok' && S.stateText(s.state) ? S.stateText(s.state) : sm ? `${whenText(sm.savedAt)} · ${S.formatPlaytime(sm.playSeconds)}` : '';
    return `<button type="button" class="m-li ssl-row${s.n === sel ? ' sel' : ''}${s.state === 'kapot' ? ' off' : ''}" data-grp="list" data-slot="${s.n}" aria-current="${s.n === sel}">` +
      `<span class="nm"><span>${esc(s.name)}${s.active ? ' <small class="mut">(in gebruik)</small>' : ''}</span><span class="mut">${esc(sub)}</span></span>` +
      (sm ? `<span class="v">€${sm.money.toLocaleString('nl-NL')}</span>` : '') + '</button>';
  };

  const detailHtml = (cur, slots) => {
    if (!cur) return '<p class="mut">Nog geen savegames. Begin een nieuw spel of importeer een savegame uit een bestand.</p>';
    const sm = cur.summary;
    const lines = [];
    if (sm) lines.push(`<dl class="ssl-facts"><div><dt>Laatst opgeslagen</dt><dd>${esc(whenText(sm.savedAt))}</dd></div><div><dt>Speeltijd</dt><dd>${esc(S.formatPlaytime(sm.playSeconds))}</dd></div>` +
      `<div><dt>Geld</dt><dd>€${sm.money.toLocaleString('nl-NL')}</dd></div><div><dt>Missies klaar</dt><dd>${sm.missionsDone}</dd></div><div><dt>Je speelt als</dt><dd>${esc(sm.character)}</dd></div></dl>`);
    if (cur.state !== 'ok') lines.push(`<p class="ssl-warn" role="alert">${esc(S.stateText(cur.state))}.${cur.state === 'hersteld' ? ' Je savegame was beschadigd; de vorige opslag is teruggezet. Sla opnieuw op om het te bevestigen.' : cur.state === 'kapot' ? ' Verwijder deze savegame, of importeer een eerder gemaakt bestand op een nieuwe opslagplek.' : ''}</p>`);
    const loadable = !!sm;
    if (view === 'rename') {
      return `<h2 class="m-h2 ssl-h">${esc(cur.name)}</h2><label class="ssl-lbl">Nieuwe naam<input class="ssl-input" data-grp="pane" data-input maxlength="${S.NAME_MAX}" value="${esc(cur.name)}" autocomplete="off"></label>` +
        '<div class="m-acts"><button type="button" class="m-bp" data-grp="pane" data-do="rename-ok">Bewaren</button><button type="button" class="m-bt" data-grp="pane" data-do="back">Annuleren</button></div>';
    }
    if (view === 'delete') {
      return `<h2 class="m-h2 ssl-h">${esc(cur.name)}</h2><div class="ssl-confirm"><p>Weet je zeker dat je deze savegame verwijdert? Ook de herstelkopie gaat weg. Dit kan niet ongedaan worden gemaakt.</p>` +
        '<div class="m-acts"><button type="button" class="m-bg danger" data-grp="pane" data-do="delete-ok">Ja, verwijderen</button><button type="button" class="m-bt" data-grp="pane" data-do="back">Annuleren</button></div></div>';
    }
    if (view === 'overwrite') {
      return `<h2 class="m-h2 ssl-h">${esc(cur.name)}</h2><div class="ssl-confirm"><p>Je huidige spel overschrijft deze savegame. Weet je het zeker?</p>` +
        '<div class="m-acts"><button type="button" class="m-bg danger" data-grp="pane" data-do="overwrite-ok">Ja, overschrijven</button><button type="button" class="m-bt" data-grp="pane" data-do="back">Annuleren</button></div></div>';
    }
    const acts = [];
    if (mode === 'start') acts.push(`<button type="button" class="m-bp" data-grp="pane" data-do="load"${loadable ? '' : ' disabled'}>Laden</button>`);
    else {
      acts.push(`<button type="button" class="m-bp" data-grp="pane" data-do="load"${loadable ? '' : ' disabled'}>Laden</button>`);
      acts.push('<button type="button" class="m-bg" data-grp="pane" data-do="save-here">Hier opslaan</button>');
    }
    acts.push('<button type="button" class="m-bg" data-grp="pane" data-do="rename">Hernoemen</button>');
    acts.push(`<button type="button" class="m-bg" data-grp="pane" data-do="export"${loadable ? '' : ' disabled'}>Exporteren</button>`);
    acts.push('<button type="button" class="m-bg danger" data-grp="pane" data-do="delete">Verwijderen</button>');
    return `<h2 class="m-h2 ssl-h">${esc(cur.name)}</h2>${lines.join('')}<div class="m-acts ssl-acts">${acts.join('')}</div>`;
  };

  const render = (focusSel) => {
    const slots = S.listSlots();
    if (!slots.some((s) => s.n === sel)) sel = slots.length ? (slots.find((s) => s.active) || slots[0]).n : 0;
    const cur = slots.find((s) => s.n === sel) || null;
    const full = slots.length >= MAX_SLOTS;
    const newLabel = mode === 'start' ? 'Nieuw spel' : 'Nieuwe savegame van nu';
    rootEl.querySelector('.gm-stage')?.remove();
    const stage = document.createElement('div');
    stage.className = 'gm-stage';
    stage.innerHTML = `<section class="m-panel ssl-panel">
      <header class="m-head"><div><span class="m-eb">${mode === 'start' ? 'Hoofdmenu' : 'Pauze'}</span><h1 class="m-h1" id="ssl-title">Savegames</h1></div><div class="m-hr"><span class="mut">${slots.length} van ${MAX_SLOTS} plekken in gebruik</span></div></header>
      <div class="m-main"><div class="m-list ssl-list" role="list">${slots.map(slotRow).join('')}
        <button type="button" class="m-li ssl-row" data-grp="list" data-do="new"${full ? ' disabled' : ''}><span class="nm"><span>${newLabel}</span><span class="mut">${mode === 'start' ? 'Begint op een nieuwe opslagplek, je andere savegames blijven staan' : 'Bewaart wat je nu speelt op een nieuwe opslagplek'}</span></span></button>
        <button type="button" class="m-li ssl-row" data-grp="list" data-do="import"${full ? ' disabled' : ''}><span class="nm"><span>Importeren</span><span class="mut">Een savegame uit een bestand, op een nieuwe opslagplek</span></span></button>
      </div><aside class="m-pane ssl-pane" aria-label="Details" aria-live="polite">${detailHtml(cur, slots)}<p class="ssl-msg" role="status">${esc(message)}</p></aside></div>
      <footer class="ssl-foot"><span class="mut">Pijltjes kiezen, Enter bevestigt, Esc sluit · Op de controller: richtingen, A, B</span><button type="button" class="m-bt" data-grp="list" data-do="close">Terug</button></footer>
    </section>`;
    rootEl.insertBefore(stage, file);
    if (view === 'rename') { const inp = stage.querySelector('[data-input]'); inp.focus(); inp.select(); return; }
    const first = focusSel === 'pane' ? stage.querySelector('[data-grp="pane"]:not(:disabled)') : stage.querySelector(`[data-slot="${sel}"]`) || stage.querySelector('[data-grp="list"]:not(:disabled)');
    if (first) first.focus();
  };

  const say = (t) => { message = t; const p = rootEl && rootEl.querySelector('.ssl-msg'); if (p) p.textContent = t; };

  const doAction = (act) => {
    const cur = S.listSlots().find((s) => s.n === sel);
    if (act === 'close') { close(); return; }
    if (act === 'back') { view = 'detail'; render('pane'); return; }
    if (act === 'new') {
      if (mode === 'start') { close(() => { if (opts.onNew) opts.onNew(); }); return; }
      const n = S.freeSlot();
      if (!n) { say('Alle plekken zijn in gebruik.'); return; }
      S.createSlot(null, '');
      bindSlot();
      if (!saveGame(world, { toast: false })) { S.deleteSlot(null, n); say('Opslaan mislukt.'); return; }
      sel = n; message = 'Opgeslagen op een nieuwe opslagplek.'; render('pane');
      return;
    }
    if (act === 'import') { file.value = ''; file.click(); return; }
    if (act === 'load' && cur) {
      if (mode === 'start') {
        if (!readSave(cur.n)) { say('Deze savegame kan niet geladen worden.'); return; }
        S.setActive(null, cur.n);
        close(() => { if (opts.onLoad) opts.onLoad(cur.n); });
      } else if (loadSlot(world, cur.n)) {
        close(() => { if (opts.onLoad) opts.onLoad(cur.n); });
      } else say('Deze savegame kan niet geladen worden.');
      return;
    }
    if (act === 'save-here' && cur) {
      if (world && world.pigeonMode) { say('Je bent een duif. Stop de duif-modus om op te slaan.'); return; }
      if (!cur.active && cur.state !== 'leeg') { view = 'overwrite'; render('pane'); return; }
      S.setActive(null, cur.n);
      bindSlot();
      message = saveGame(world, { toast: false }) ? 'Opgeslagen.' : 'Opslaan mislukt.';
      render('pane');
      return;
    }
    if (act === 'overwrite-ok' && cur) {
      S.setActive(null, cur.n);
      bindSlot();
      view = 'detail';
      message = saveGame(world, { toast: false }) ? 'Overschreven.' : 'Opslaan mislukt.';
      render('pane');
      return;
    }
    if (act === 'rename' && cur) { view = 'rename'; render('pane'); return; }
    if (act === 'rename-ok' && cur) {
      S.renameSlot(null, cur.n, rootEl.querySelector('[data-input]').value);
      view = 'detail'; message = 'Naam bewaard.'; render('pane');
      return;
    }
    if (act === 'export' && cur) {
      const ex = S.exportSlot(null, cur.n);
      if (!ex.ok) { say('Deze savegame kan niet geëxporteerd worden.'); return; }
      try { download(ex.filename, ex.text); say(`Bestand gemaakt: ${ex.filename}`); } catch (e) { say('Exporteren mislukt.'); }
      return;
    }
    if (act === 'delete' && cur) { view = 'delete'; render('pane'); return; }
    if (act === 'delete-ok' && cur) {
      view = 'detail';
      message = S.deleteSlot(null, cur.n) ? 'Savegame verwijderd.' : 'Verwijderen mislukt.';
      render();
    }
  };

  file.addEventListener('change', () => {
    const f = file.files && file.files[0];
    if (!f) return;
    if (f.size > S.MAX_IMPORT_CHARS) { say(S.importErrorText('groot')); render(); return; }
    const rd = new FileReader();
    rd.onerror = () => { say(S.importErrorText('kapot')); };
    rd.onload = () => {
      const r = S.importAsNewSlot(null, String(rd.result || ''));
      if (r.ok) { sel = r.n; view = 'detail'; message = `Geïmporteerd als "${r.name}". Kies Laden om te spelen.`; } else message = S.importErrorText(r.why);
      if (rootEl) render('pane');
    };
    rd.readAsText(f);
  });

  rootEl.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('button');
    if (!b || b.disabled || !rootEl.contains(b)) return;
    if (b.dataset.slot) { sel = Number(b.dataset.slot); view = 'detail'; message = ''; render(); return; }
    if (b.dataset.do) doAction(b.dataset.do);
  });

  // focus order: the list, then the buttons of the detail pane
  const move = (dir) => {
    const cur = document.activeElement;
    if (!cur || !rootEl.contains(cur)) { const f = rootEl.querySelector('[data-grp]:not(:disabled)'); if (f) f.focus(); return; }
    const grp = cur.dataset.grp;
    const items = [...rootEl.querySelectorAll(`[data-grp="${grp}"]:not(:disabled)`)];
    const i = items.indexOf(cur);
    if (dir === 'up' || dir === 'down') {
      const nx = items[(i + (dir === 'down' ? 1 : -1) + items.length) % items.length];
      if (nx) nx.focus();
    } else if (dir === 'right' && grp === 'list') {
      const p = rootEl.querySelector('[data-grp="pane"]:not(:disabled)');
      if (p) p.focus();
    } else if (dir === 'left' && grp === 'pane') {
      const l = rootEl.querySelector(`[data-slot="${sel}"]`) || rootEl.querySelector('[data-grp="list"]');
      if (l) l.focus();
    }
  };
  const confirmOrCancel = () => {
    if (view !== 'detail') { view = 'detail'; render('pane'); return true; }
    return false;
  };

  const onKey = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    const inInput = e.target && e.target.tagName === 'INPUT' && e.target.dataset.input !== undefined;
    if (k === 'Escape' || k === 'Backspace' && !inInput) {
      e.preventDefault(); e.stopPropagation();
      if (!confirmOrCancel()) close();
      return;
    }
    if (inInput) {
      if (k === 'Enter') { e.preventDefault(); e.stopPropagation(); doAction('rename-ok'); } else e.stopPropagation();
      return;
    }
    const dirs = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    if (dirs[k]) { e.preventDefault(); e.stopPropagation(); move(dirs[k]); return; }
    if (k === 'Tab') { e.stopPropagation(); return; }
    // Enter / Space click the focused button natively; keep the keys from the menus below
    e.stopPropagation();
  };
  window.addEventListener('keydown', onKey, true);

  // gamepad: gamepad.js (menu situation) sends arrows, Enter and Escape as keys;
  // a poll of our own here moved and clicked twice (#151)

  render();
}
