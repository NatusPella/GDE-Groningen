// The savegame screen (#208, #34, #92): cards with a small screenshot, the part of the story, play time,
// money and when it was played; choose, load, save here, copy, rename, export, import and delete
// savegames, from the main menu (mode 'start') and the pause menu (mode 'game').
// Keyboard (arrows, Enter, Esc), gamepad (d-pad / stick, A, B) and touch / mouse all work
// on the same buttons. The storage side is saveslots.js; the world side savegame.js.
import * as S from './saveslots.js';
import { MAX_SLOTS } from './storagekeys.js';
import { saveGame, loadSlot, readSave, bindSlot, storySummary, onThumbKept } from './savegame.js';

const DESKTOP = typeof window !== 'undefined' && window.gdeDesktop && window.gdeDesktop.isDesktop ? window.gdeDesktop : null;

let rootEl = null;

export function isSaveSlotsOpen() {
  return !!rootEl;
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const euro = (n) => `€${Number(n).toLocaleString('nl-NL')}`;

function dateText(ms) {
  if (!ms) return 'Nog niet opgeslagen';
  const d = new Date(ms);
  return `${d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`;
}

const IC = {
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.4 0-2.4.7-2.4 1.8 0 2.5 5 1.2 5 3.8 0 1.1-1 1.9-2.6 1.9-1.2 0-2.1-.5-2.6-1.3M12 6.5V8M12 16v1.5"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  tammo: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.5-4 3.300-6 7-6s6.500 2 7 6"/>',
};
const svg = (d, cls = 'ssl-ic') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;

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

  // a picture arrives after the frame that follows a save: put it on its card
  onThumbKept((n) => {
    const pic = rootEl && rootEl.querySelector(`[data-slot="${n}"] .ssl-pic`);
    const url = S.readThumb(null, n);
    if (!pic || !url) return;
    const old = pic.querySelector('img, .ssl-nopic');
    const img = document.createElement('img');
    img.src = url; img.alt = ''; img.draggable = false;
    if (old) old.replaceWith(img); else pic.prepend(img);
  });

  const close = (afterClose) => {
    onThumbKept(null);
    window.removeEventListener('keydown', onKey, true);
    rootEl.remove();
    rootEl = null;
    try { if (lastFocus && lastFocus.focus) lastFocus.focus(); } catch (e) { /* gone */ }
    if (afterClose) afterClose();
    else if (opts.onClose) opts.onClose();
  };

  // one card: picture, state, the part of the story, then play time / money / when
  const card = (s) => {
    const sm = s.summary;
    const data = S.readSlot(null, s.n).data;
    const story = data ? storySummary(data) : null;
    const thumb = S.readThumb(null, s.n);
    const bad = s.state === 'kapot' || s.state === 'nieuwer' || s.state === 'ander-verhaal';
    const chips = [];
    if (s.active) chips.push('<span class="ssl-chip on" title="Het spel slaat vanzelf op in deze savegame">Autosave</span>');
    if (s.state === 'hersteld') chips.push('<span class="ssl-chip warn">Hersteld</span>');
    if (bad) chips.push('<span class="ssl-chip warn">Kan niet laden</span>');
    const pic = thumb ? `<img src="${thumb}" alt="" draggable="false">` : `<span class="ssl-nopic">${svg(IC.tammo, 'ssl-nopic-ic')}</span>`;
    const pct = story && story.total ? Math.round((story.done / story.total) * 100) : 0;
    const part = bad ? S.stateText(s.state) : story ? (story.ended ? 'Het verhaal is uit' : story.part) : sm ? 'Het begin' : '';
    const lines = sm ? `<span class="ssl-facts">${svg(IC.clock)}${esc(S.formatPlaytime(sm.playSeconds))}${svg(IC.coin)}${esc(euro(sm.money))}</span>` : '';
    const ago = sm ? S.agoText(sm.savedAt) : '';
    return `<button type="button" class="ssl-card${s.n === sel ? ' sel' : ''}${bad ? ' off' : ''}" role="listitem" data-grp="list" data-slot="${s.n}" aria-current="${s.n === sel}">` +
      `<span class="ssl-pic">${pic}<span class="ssl-chips">${chips.join('')}</span></span>` +
      `<span class="ssl-body"><span class="ssl-nm">${esc(s.name)}</span><span class="ssl-part one">${esc(part)}</span>` +
      (story && !story.ended && !bad ? `<span class="m-bar ssl-bar"><i style="width:${pct}%"></i></span>` : '') +
      `${lines}<span class="ssl-when mut">${esc(ago ? `${ago} · ${dateText(sm.savedAt)}` : sm ? dateText(sm.savedAt) : '')}</span></span></button>`;
  };

  const emptyCard = (n) => `<button type="button" class="ssl-card empty" role="listitem" data-grp="list" data-do="new" data-want="${n}">` +
    `<span class="ssl-pic"><span class="ssl-nopic">${svg(IC.plus, 'ssl-nopic-ic')}</span></span>` +
    `<span class="ssl-body"><span class="ssl-nm">Lege plek</span><span class="ssl-part mut">${mode === 'start' ? 'Begin een nieuw spel' : 'Bewaar je spel hier'}</span></span></button>`;

  const detailHtml = (cur) => {
    if (!cur) return '<p class="mut ssl-hint">Nog geen savegames. Begin een nieuw spel of importeer een savegame uit een bestand.</p>';
    const sm = cur.summary;
    const head = `<h2 class="m-h2 ssl-h">${esc(cur.name)}</h2>`;
    const warn = cur.state !== 'ok'
      ? `<p class="ssl-warn" role="alert">${esc(S.stateText(cur.state))}.${cur.state === 'hersteld' ? ' Je savegame was beschadigd; de vorige opslag is teruggezet. Sla opnieuw op om het te bevestigen.' : cur.state === 'kapot' ? ' Verwijder deze savegame, of importeer een eerder gemaakt bestand op een nieuwe plek.' : ''}</p>` : '';
    if (view === 'rename') {
      return `${head}<label class="ssl-lbl">Nieuwe naam<input class="ssl-input" data-grp="pane" data-input maxlength="${S.NAME_MAX}" value="${esc(cur.name)}" autocomplete="off"></label>` +
        '<div class="m-acts"><button type="button" class="m-bp" data-grp="pane" data-do="rename-ok">Bewaren</button><button type="button" class="m-bt" data-grp="pane" data-do="back">Annuleren</button></div>';
    }
    if (view === 'delete') {
      return `${head}<div class="ssl-confirm"><p>Deze savegame verwijderen? Ook de herstelkopie gaat weg. Dit kan niet ongedaan worden gemaakt.</p>` +
        '<div class="m-acts"><button type="button" class="m-bt" data-grp="pane" data-do="back">Nee, bewaren</button><button type="button" class="m-bg danger" data-grp="pane" data-do="delete-ok">Ja, spel verwijderen</button></div></div>';
    }
    if (view === 'overwrite') {
      return `${head}<div class="ssl-confirm"><p>Je huidige spel komt over deze savegame heen. Weet je het zeker?</p>` +
        '<div class="m-acts"><button type="button" class="m-bt" data-grp="pane" data-do="back">Nee</button><button type="button" class="m-bg danger" data-grp="pane" data-do="overwrite-ok">Ja, overschrijven</button></div></div>';
    }
    const loadable = !!sm;
    const full = S.freeSlot(null) === 0;
    const acts = [`<button type="button" class="m-bp" data-grp="pane" data-do="load"${loadable ? '' : ' disabled'}>Spel laden</button>`];
    if (mode === 'game') acts.push('<button type="button" class="m-bg" data-grp="pane" data-do="save-here">Spel opslaan</button>');
    acts.push(`<button type="button" class="m-bg" data-grp="pane" data-do="copy"${loadable && !full ? '' : ' disabled'} title="${full ? 'Alle plekken zijn in gebruik' : 'Maakt een kopie op een lege plek'}">Spel kopiëren</button>`);
    acts.push('<button type="button" class="m-bg" data-grp="pane" data-do="rename">Hernoemen</button>');
    acts.push(`<button type="button" class="m-bg" data-grp="pane" data-do="export"${loadable ? '' : ' disabled'}>Spel exporteren</button>`);
    acts.push('<button type="button" class="m-bg danger" data-grp="pane" data-do="delete">Spel verwijderen</button>');
    const goal = sm && sm.goal ? `<span class="ssl-goal mut">${svg(IC.flag)}Doel: ${esc(sm.goal)}</span>` : '';
    const who = sm ? `<span class="ssl-goal mut">${svg(IC.tammo)}${esc(sm.character)} · ${sm.missionsDone} ${sm.missionsDone === 1 ? 'missie' : 'missies'} klaar</span>` : '';
    return `<div class="ssl-dhead">${head}<span class="ssl-dmeta">${who}${goal}</span></div>${warn}<div class="m-acts ssl-acts">${acts.join('')}</div>`;
  };

  const detailEl = () => rootEl.querySelector('.ssl-detail');
  const say = (t) => { message = t; const p = rootEl && rootEl.querySelector('.ssl-msg'); if (p) p.textContent = t; };

  const render = (focusSel) => {
    const slots = S.listSlots();
    if (!slots.some((s) => s.n === sel)) sel = slots.length ? (slots.find((s) => s.active) || slots[0]).n : 0;
    const cur = slots.find((s) => s.n === sel) || null;
    const byN = new Map(slots.map((s) => [s.n, s]));
    const tiles = [];
    for (let n = 1; n <= MAX_SLOTS; n++) tiles.push(byN.has(n) ? card(byN.get(n)) : emptyCard(n));
    const full = slots.length >= MAX_SLOTS;
    rootEl.querySelector('.gm-stage')?.remove();
    const stage = document.createElement('div');
    stage.className = 'gm-stage';
    stage.innerHTML = `<section class="m-panel ssl-panel">
      <header class="m-head"><div><span class="m-eb">${mode === 'start' ? 'Hoofdmenu' : 'Pauze'}</span><h1 class="m-h1" id="ssl-title">Opgeslagen spellen</h1></div><div class="m-hr"><span class="mut">${slots.length} van ${MAX_SLOTS} plekken in gebruik</span></div></header>
      <div class="ssl-scroll"><div class="ssl-grid" role="list" aria-label="Opgeslagen spellen">${tiles.join('')}</div></div>
      <aside class="ssl-detail" aria-label="Details" aria-live="polite">${detailHtml(cur)}</aside>
      <p class="ssl-msg" role="status">${esc(message)}</p>
      <footer class="ssl-foot"><span class="mut ssl-keys">Pijltjes kiezen · Enter bevestigt · Esc sluit · Controller: richtingen, A, B. Je spel slaat vanzelf op in de savegame met het label Autosave.</span>
        <span class="ssl-footbtns"><button type="button" class="m-bg" data-grp="foot" data-do="import"${full ? ' disabled' : ''} title="${full ? 'Alle plekken zijn in gebruik' : 'Een spel uit een bestand, op een lege plek'}">Spel importeren</button><button type="button" class="m-bt" data-grp="foot" data-do="close">Terug</button></span></footer>
    </section>`;
    rootEl.insertBefore(stage, file);
    if (view === 'rename') { const inp = stage.querySelector('[data-input]'); inp.focus(); inp.select(); return; }
    const first = focusSel === 'pane' ? stage.querySelector('[data-grp="pane"]:not(:disabled)') : stage.querySelector(`[data-slot="${sel}"]`) || stage.querySelector('[data-grp="list"]:not(:disabled)');
    if (first) { first.focus(); if (first.scrollIntoView) first.scrollIntoView({ block: 'nearest' }); }
  };

  // a card chosen (click, or focus by arrows): only the details change, the focus stays
  const select = (n) => {
    if (n === sel && view === 'detail') return;
    sel = n; view = 'detail'; message = '';
    const slots = S.listSlots();
    for (const c of rootEl.querySelectorAll('[data-slot]')) { const on = Number(c.dataset.slot) === n; c.classList.toggle('sel', on); c.setAttribute('aria-current', String(on)); }
    detailEl().innerHTML = detailHtml(slots.find((s) => s.n === n) || null);
    const m = rootEl.querySelector('.ssl-msg'); if (m) m.textContent = '';
  };

  const doAction = (act, want) => {
    const cur = S.listSlots().find((s) => s.n === sel);
    if (act === 'close') { close(); return; }
    if (act === 'back') { view = 'detail'; render('pane'); return; }
    if (act === 'new') {
      if (mode === 'start') { close(() => { if (opts.onNew) opts.onNew(); }); return; }
      if (world && world.pigeonMode) { say('Je bent een duif. Stop de duif-modus om op te slaan.'); return; }
      const n = S.freeSlot() ? S.createSlot(null, '', want) : 0;
      if (!n) { say('Alle plekken zijn in gebruik.'); return; }
      bindSlot();
      if (!saveGame(world, { toast: false })) { S.deleteSlot(null, n); say('Opslaan mislukt.'); return; }
      sel = n; view = 'detail'; message = 'Opgeslagen op een lege plek.'; render('pane');
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
    if (act === 'copy' && cur) {
      const r = S.copySlot(null, cur.n);
      if (!r.ok) { say(r.why === 'vol' ? S.importErrorText('vol') : 'Kopiëren mislukt.'); return; }
      sel = r.n; view = 'detail'; message = `Gekopieerd als "${r.name}". Je eerste savegame is niet veranderd.`; render('pane');
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
      if (r.ok) { sel = r.n; view = 'detail'; message = `Geïmporteerd als "${r.name}". Kies Spel laden om te spelen.`; } else message = S.importErrorText(r.why);
      if (rootEl) render('pane');
    };
    rd.readAsText(f);
  });

  rootEl.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('button');
    if (!b || b.disabled || !rootEl.contains(b)) return;
    if (b.dataset.slot) {
      select(Number(b.dataset.slot));
      const p = rootEl.querySelector('[data-grp="pane"]:not(:disabled)');
      if (p && e.detail === 0) p.focus(); // Enter / Space / A: on to the actions; a click keeps the card
      return;
    }
    if (b.dataset.do) doAction(b.dataset.do, Number(b.dataset.want) || 0);
  });
  // focus by the arrows shows that card's details
  rootEl.addEventListener('focusin', (e) => {
    const c = e.target.closest && e.target.closest('[data-slot]');
    if (c) select(Number(c.dataset.slot));
  });

  // focus order: the cards (a grid), the buttons of the details, then the footer
  const columns = () => {
    const g = rootEl.querySelector('.ssl-grid');
    const n = g ? getComputedStyle(g).gridTemplateColumns.split(' ').filter(Boolean).length : 1;
    return Math.max(1, n);
  };
  const move = (dir) => {
    const cur = document.activeElement;
    const all = () => [...rootEl.querySelectorAll('[data-grp]:not(:disabled)')];
    if (!cur || !rootEl.contains(cur) || !cur.dataset.grp) { const f = all()[0]; if (f) f.focus(); return; }
    const grp = cur.dataset.grp;
    const items = [...rootEl.querySelectorAll(`[data-grp="${grp}"]:not(:disabled)`)];
    const i = items.indexOf(cur);
    const first = (g) => rootEl.querySelector(`[data-grp="${g}"]:not(:disabled)`);
    if (grp === 'list') {
      const cols = columns();
      const step = { left: -1, right: 1, up: -cols, down: cols }[dir];
      const j = i + step;
      if (dir === 'down' && j >= items.length) { const p = first('pane') || first('foot'); if (p) p.focus(); return; }
      if (j >= 0 && j < items.length) items[j].focus();
      return;
    }
    if (grp === 'pane' || grp === 'foot') {
      if (dir === 'left' || dir === 'right') {
        const nx = items[i + (dir === 'right' ? 1 : -1)];
        if (nx) nx.focus();
      } else if (dir === 'down') {
        const nx = grp === 'pane' ? first('foot') : null;
        if (nx) nx.focus();
      } else if (dir === 'up') {
        const prev = grp === 'foot' ? (first('pane') || rootEl.querySelector(`[data-slot="${sel}"]`)) : (rootEl.querySelector(`[data-slot="${sel}"]`) || first('list'));
        if (prev) prev.focus();
      }
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
