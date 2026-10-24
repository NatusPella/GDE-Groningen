// The Opgeslagen spellen screen (#208, #34, #92): a calm grid of equal cards, each with a small screenshot,
// the name, the act, play time and when it was played. One clear action per card (Laden, or Doorgaan from the
// main menu); everything else (Spel opslaan, Hernoemen, Spel kopiëren, Spel exporteren, Spel verwijderen)
// sits behind the card's '…' button. Importing is a small row at the bottom.
// Keyboard (arrows, Enter, Esc), gamepad (d-pad / stick, A, B: gamepad.js sends them as keys) and touch / mouse
// all work on the same buttons. The storage side is saveslots.js; the world side savegame.js.
//
// openSaveSlots({ mode: 'start' | 'game', world, onLoad(n), onNew(), onClose(), pick, onPick(n) })
//   start: the main menu (a card loads that game and goes on; an empty card starts a new game)
//   solo: Alleen spelen (the main menu): Doorgaan (the game played last) on top, Nieuw spel as the first card,
//     a card loads that game; with every place in use Nieuw spel asks first, as it takes the place of the active game
//   game:  the pause menu (a card loads that game; an empty card saves the current game there)
//   eyebrow / titel / hint / loadLabel: optional texts (Samen spelen: 'Een spel openen')
//   pick + onPick(n): choosing a card only makes it the active game and calls onPick(n), without loading
//     (the host of Samen spelen picks the game to play with); an empty card calls onNew() as usual.
import * as S from './saveslots.js';
import { MAX_SLOTS } from './storagekeys.js';
import { saveGame, loadSlot, readSave, bindSlot, storySummary, onThumbKept, coopSessieLoopt, COOP_LADEN_TEKST, COOP_NIEUW_TEKST, COOP_WISSEN_TEKST } from './savegame.js';

const DESKTOP = typeof window !== 'undefined' && window.gdeDesktop && window.gdeDesktop.isDesktop ? window.gdeDesktop : null;

// snelle namen: hernoemen kan zo ook met alleen een controller (geen schermtoetsenbord)
const NAME_PRESETS = ['Hoofdspel', 'Proefrit', 'Voor de missie', 'Veilig', 'Zomerrit', 'Reservekopie'];

let rootEl = null;

export function isSaveSlotsOpen() {
  return !!rootEl;
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function dateText(ms) {
  if (!ms) return 'Nog niet opgeslagen';
  const d = new Date(ms);
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
}

const IC = {
  more: '<circle cx="5.5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18.5" cy="12" r="1.6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  person: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.5-4 3.3-6 7-6s6.5 2 7 6"/>',
  save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
  rename: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  export: '<path d="M12 15V4M8 8l4-4 4 4M5 14v6h14v-6"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  import: '<path d="M12 4v11M8 11l4 4 4-4M5 20h14"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  resume: '<path d="M8 5l11 7-11 7z"/>',
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

export function openSaveSlots(opts = {}) {
  if (rootEl) return;
  ensureCss();
  const mode = opts.mode === 'game' ? 'game' : 'start';
  const world = opts.world || null;
  let sel = S.activeSlot();
  // the card with its '…' menu open, or a question on it: { n, kind: 'menu' | 'rename' | 'delete' | 'overwrite' }
  let over = null;
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
    const pic = rootEl && rootEl.querySelector(`.ssl-card[data-slot="${n}"] .ssl-pic`);
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

  const solo = mode === 'start' && !!opts.solo && !opts.pick;
  const primaryLabel = opts.loadLabel || (opts.pick ? 'Kiezen' : mode === 'start' && !solo ? 'Doorgaan' : 'Laden');

  const mi = (act, ic, label, extra = '') => `<button type="button" class="ssl-mi${extra}" role="menuitem" data-grp="menu" data-do="${act}">${svg(IC[ic])}<span>${label}</span></button>`;

  // the layer over a card: the '…' menu, or one question
  const overHtml = (s) => {
    const bad = !s.summary;
    if (over.kind === 'rename') {
      return `<div class="ssl-over" role="group" aria-label="Hernoemen"><label class="ssl-lbl">Nieuwe naam<input class="ssl-input" data-grp="menu" data-input maxlength="${S.NAME_MAX}" value="${esc(s.name)}" autocomplete="off"></label>` +
        `<div class="ssl-presets" aria-label="Snelle namen (ook met de controller)">${NAME_PRESETS.map((nm) => `<button type="button" class="ssl-chipbtn" data-grp="menu" data-do="preset" data-name="${esc(nm)}">${esc(nm)}</button>`).join('')}</div>` +
        '<div class="ssl-qacts"><button type="button" class="m-bt" data-grp="menu" data-do="back">Annuleren</button><button type="button" class="m-bp" data-grp="menu" data-do="rename-ok">Bewaren</button></div></div>';
    }
    if (over.kind === 'delete') {
      return '<div class="ssl-over ssl-q" role="alertdialog" aria-label="Verwijderen"><p>Dit opgeslagen spel verwijderen? Ook de herstelkopie gaat weg. Dat kan niet ongedaan worden gemaakt.</p>' +
        '<div class="ssl-qacts"><button type="button" class="m-bp" data-grp="menu" data-do="back">Nee, bewaren</button><button type="button" class="m-bg danger" data-grp="menu" data-do="delete-ok">Ja, verwijderen</button></div></div>';
    }
    if (over.kind === 'overwrite') {
      return '<div class="ssl-over ssl-q" role="alertdialog" aria-label="Overschrijven"><p>Je huidige spel komt over dit opgeslagen spel heen. Weet je het zeker?</p>' +
        '<div class="ssl-qacts"><button type="button" class="m-bp" data-grp="menu" data-do="back">Nee</button><button type="button" class="m-bg danger" data-grp="menu" data-do="overwrite-ok">Ja, overschrijven</button></div></div>';
    }
    const full = S.freeSlot(null) === 0;
    return '<div class="ssl-over" role="menu">' + 
      (mode === 'game' ? mi('save-here', 'save', 'Spel opslaan') : '') +
      mi('rename', 'rename', 'Hernoemen') +
      (bad || full ? `<button type="button" class="ssl-mi" role="menuitem" data-grp="menu" disabled>${svg(IC.copy)}<span>Spel kopiëren</span></button>` : mi('copy', 'copy', 'Spel kopiëren')) +
      (bad ? `<button type="button" class="ssl-mi" role="menuitem" data-grp="menu" disabled>${svg(IC.export)}<span>Spel exporteren</span></button>` : mi('export', 'export', 'Spel exporteren')) +
      mi('delete', 'trash', 'Spel verwijderen', ' danger') + `<button type="button" class="ssl-x" data-grp="menu" data-do="back" aria-label="Sluiten">${svg(IC.x)}</button></div>`;
  };

  const card = (s) => {
    const sm = s.summary;
    const data = S.readSlot(null, s.n).data;
    const story = data ? storySummary(data) : null;
    const thumb = S.readThumb(null, s.n);
    const bad = s.state === 'kapot' || s.state === 'nieuwer' || s.state === 'ander-verhaal';
    const chips = [];
    if (s.active) chips.push('<span class="ssl-chip on" title="Het spel slaat vanzelf op in dit opgeslagen spel">Autosave</span>');
    if (s.state === 'hersteld') chips.push('<span class="ssl-chip warn">Hersteld</span>');
    if (bad) chips.push('<span class="ssl-chip warn">Kan niet laden</span>');
    const pic = thumb ? `<img src="${thumb}" alt="" draggable="false">` : `<span class="ssl-nopic">${svg(IC.person, 'ssl-nopic-ic')}</span>`;
    const part = bad ? S.stateText(s.state) : story ? (story.ended ? 'Het verhaal is uit' : story.part) : sm ? 'Het begin' : '';
    const ago = sm ? S.agoText(sm.savedAt) || dateText(sm.savedAt) : '';
    const meta = sm ? `${S.formatPlaytime(sm.playSeconds)} · ${ago}` : '';
    const tip = story && story.next && !bad ? `Volgende stap: ${story.next}` : '';
    const open = over && over.n === s.n;
    return `<div class="ssl-card${s.n === sel ? ' sel' : ''}${bad ? ' bad' : ''}${open ? ' open' : ''}" role="listitem" data-slot="${s.n}">` +
      `<button type="button" class="ssl-main" data-grp="list" data-slot="${s.n}" data-do="load"${bad || !sm ? ' disabled' : ''} aria-label="${esc(s.name)}: ${primaryLabel}"${tip ? ` title="${esc(tip)}"` : ''}>` +
      `<span class="ssl-pic">${pic}<span class="ssl-chips">${chips.join('')}</span><span class="ssl-go">${esc(primaryLabel)}</span></span>` +
      `<span class="ssl-body"><span class="ssl-nm">${esc(s.name)}</span><span class="ssl-part one">${esc(part)}</span><span class="ssl-meta one mut">${esc(meta)}</span></span></button>` +
      `<button type="button" class="ssl-more" data-grp="list" data-more="${s.n}" aria-haspopup="menu" aria-expanded="${!!open}" aria-label="Meer voor ${esc(s.name)}" title="Meer">${svg(IC.more)}</button>` +
      (open ? overHtml(s) : '') + '</div>';
  };

  const emptyCard = (n) => `<div class="ssl-card empty" role="listitem" data-slot="${n}">` +
    `<button type="button" class="ssl-main" data-grp="list" data-do="new" data-want="${n}" aria-label="Lege plek ${n}: ${mode === 'start' ? 'nieuw spel' : 'spel opslaan'}">` +
    '<span class="ssl-pic"><span class="ssl-nopic">' + svg(IC.plus, 'ssl-nopic-ic') + '</span></span>' +
    `<span class="ssl-body"><span class="ssl-nm mut">Leeg</span><span class="ssl-part mut one">${mode === 'start' ? 'Nieuw spel' : 'Spel opslaan'}</span><span class="ssl-meta">&nbsp;</span></span></button></div>`;

  // Alleen spelen: Nieuw spel is the first card. With every place in use it asks first (it takes the place of the active game)
  const newCard = (n, active) => {
    const ask = over && over.kind === 'newfull';
    const q = ask ? `<div class="ssl-over ssl-q" role="alertdialog" aria-label="Nieuw spel"><p>Alle ${MAX_SLOTS} plekken zijn in gebruik. Je nieuwe spel komt op de plek van "${esc(active ? active.name : '')}". Dat spel wordt gewist, alleen de herstelkopie blijft bewaard.</p>` +
      '<div class="ssl-qacts"><button type="button" class="m-bp" data-grp="menu" data-do="back">Nee, terug</button><button type="button" class="m-bg danger" data-grp="menu" data-do="newfull-ok">Ja, nieuw spel</button></div></div>' : '';
    return `<div class="ssl-card ssl-new${ask ? ' open' : ''}" role="listitem" data-slot="0">` +
      `<button type="button" class="ssl-main" data-grp="list" data-slot="0" data-do="${n ? 'new' : 'new-ask'}" data-want="${n}" aria-label="Nieuw spel">` +
      `<span class="ssl-pic"><span class="ssl-nopic">${svg(IC.plus, 'ssl-nopic-ic')}</span><span class="ssl-go">Beginnen</span></span>` +
      '<span class="ssl-body"><span class="ssl-nm">Nieuw spel</span><span class="ssl-part one">Moi! Stap in en rij</span><span class="ssl-meta">&nbsp;</span></span></button>' + q + '</div>';
  };

  // the game played last: the active one, else the one saved last; Doorgaan on top
  const lastPlayed = (slots) => {
    const ok = slots.filter((s) => s.summary && s.state !== 'kapot' && s.state !== 'nieuwer' && s.state !== 'ander-verhaal');
    return ok.find((s) => s.active) || ok.sort((a, b) => b.summary.savedAt - a.summary.savedAt)[0] || null;
  };
  const heroHtml = (s) => {
    const data = S.readSlot(null, s.n).data;
    const story = data ? storySummary(data) : null;
    const thumb = S.readThumb(null, s.n);
    const part = story ? (story.ended ? 'Het verhaal is uit' : story.part) : 'Het begin';
    const ago = S.agoText(s.summary.savedAt) || dateText(s.summary.savedAt);
    const prog = story && story.total ? Math.round((story.done / story.total) * 100) : null;
    const pic = thumb ? `<img src="${thumb}" alt="" draggable="false">` : `<span class="ssl-nopic">${svg(IC.person, 'ssl-nopic-ic')}</span>`;
    return `<button type="button" class="ssl-hero" data-grp="hero" data-do="load" data-slot="${s.n}" aria-label="Doorgaan: ${esc(s.name)}">` +
      `<span class="ssl-hero-pic">${pic}</span><span class="ssl-hero-body"><span class="ssl-hero-lab">${svg(IC.resume, 'ssl-hero-ic')}Doorgaan</span>` +
      `<span class="ssl-hero-nm one">${esc(s.name)} · ${esc(part)}</span><span class="ssl-hero-meta one mut">${esc(S.formatPlaytime(s.summary.playSeconds))} · ${esc(ago)}</span>` +
      (prog != null ? `<span class="ssl-hero-prog"><span class="m-bar"><i style="width:${prog}%"></i></span><span class="bebas">${prog}%</span></span>` : '') + '</span></button>';
  };

  let intro = true;
  const render = (focus) => {
    const slots = S.listSlots();
    if (!slots.some((s) => s.n === sel)) sel = slots.length ? (slots.find((s) => s.active) || slots[0]).n : 0;
    const byN = new Map(slots.map((s) => [s.n, s]));
    const tiles = [];
    // the games there are, then one empty card: the other empty places stay out of sight (calm)
    let emptyShown = solo;
    if (solo) tiles.push(newCard(S.freeSlot(null), slots.find((s) => s.active)));
    for (let n = 1; n <= MAX_SLOTS; n++) {
      if (byN.has(n)) tiles.push(card(byN.get(n)));
      else if (!emptyShown) { tiles.push(emptyCard(n)); emptyShown = true; }
    }
    const last = solo ? lastPlayed(slots) : null;
    const full = slots.length >= MAX_SLOTS;
    rootEl.querySelector('.gm-stage')?.remove();
    const stage = document.createElement('div');
    stage.className = 'gm-stage';
    stage.innerHTML = `<section class="m-panel ssl-panel">
      <header class="m-head"><div><span class="m-eb">${esc(opts.eyebrow || (mode === 'start' ? 'Hoofdmenu' : 'Pauze'))}</span><h1 class="m-h1" id="ssl-title">${esc(opts.titel || 'Opgeslagen spellen')}</h1>${opts.hint ? `<p class="mut ssl-intro">${esc(opts.hint)}</p>` : ''}</div><div class="m-hr"><span class="mut">${slots.length} van ${MAX_SLOTS}</span></div></header>
      ${last ? `<div class="ssl-hero-wrap">${heroHtml(last)}</div>` : ''}
      <div class="ssl-scroll"><div class="ssl-grid" role="list" aria-label="Opgeslagen spellen">${tiles.join('')}</div></div>
      <p class="ssl-msg" role="status">${esc(message)}</p>
      <footer class="ssl-foot"><button type="button" class="ssl-fb" data-grp="foot" data-do="import"${full ? ' disabled title="Alle plekken zijn in gebruik"' : ''}>${svg(IC.import)}<span>Spel importeren</span></button>
        <span class="ssl-fgrow"></span><button type="button" class="ssl-fb" data-grp="foot" data-do="close">${svg(IC.back)}<span>Terug</span></button></footer>
    </section>`;
    rootEl.insertBefore(stage, file);
    const q = (s) => stage.querySelector(s);
    let el = null;
    if (over) {
      if (over.kind === 'rename') { el = q('[data-input]'); if (el) { el.focus(); el.select(); return; } }
      el = q('.ssl-over [data-grp="menu"]:not(:disabled)');
      if (over.kind === 'delete' || over.kind === 'overwrite' || over.kind === 'newfull') el = q('.ssl-over [data-do="back"]');
    } else if (focus && focus.more) el = q(`[data-more="${focus.more}"]`);
    else if (focus && focus.newcard) el = q('.ssl-new .ssl-main');
    else if (intro && !focus && q('.ssl-hero')) el = q('.ssl-hero');
    else el = q(`.ssl-main[data-slot="${(focus && focus.slot) || sel}"]:not(:disabled)`) || q(`.ssl-more[data-more="${sel}"]`) || q('[data-grp="list"]:not(:disabled)');
    intro = false;
    if (el) { el.focus(); if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); }
  };

  const say = (t) => { message = t; const p = rootEl && rootEl.querySelector('.ssl-msg'); if (p) p.textContent = t; };

  const doAction = (act, want, n) => {
    const slot = n || sel;
    const cur = S.listSlots().find((s) => s.n === slot);
    if (act === 'close') { close(); return; }
    if (act === 'back') { const m = over && over.n; const nf = over && over.kind === 'newfull'; over = null; render(nf ? { newcard: true } : { more: m }); return; }
    if (act === 'new-ask') { over = { n: 0, kind: 'newfull' }; render(); return; }
    if ((act === 'newfull-ok' || (act === 'new' && mode === 'start')) && coopSessieLoopt(world)) { say(COOP_NIEUW_TEKST); return; }
    if (act === 'newfull-ok') { close(() => { if (opts.onNew) opts.onNew(); }); return; }
    if (act === 'new') {
      if (mode === 'start') { close(() => { if (opts.onNew) opts.onNew(); }); return; }
      if (world && world.pigeonMode) { say('Je bent een duif. Stop de duif-modus om op te slaan.'); return; }
      const m = S.freeSlot() ? S.createSlot(null, '', want) : 0;
      if (!m) { say('Alle plekken zijn in gebruik.'); return; }
      bindSlot();
      if (!saveGame(world, { toast: false })) { S.deleteSlot(null, m); say('Opslaan mislukt.'); return; }
      sel = m; message = 'Opgeslagen.'; render({ slot: m });
      return;
    }
    if (act === 'import') { file.value = ''; file.click(); return; }
    if (act === 'load' && cur) {
      if (coopSessieLoopt(world)) { say(COOP_LADEN_TEKST); return; }
      sel = cur.n;
      if (opts.pick) {
        if (!readSave(cur.n)) { say('Dit opgeslagen spel kan niet geladen worden.'); return; }
        S.setActive(null, cur.n);
        close(() => { if (opts.onPick) opts.onPick(cur.n); });
      } else if (mode === 'start') {
        if (!readSave(cur.n)) { say('Dit opgeslagen spel kan niet geladen worden.'); return; }
        S.setActive(null, cur.n);
        close(() => { if (opts.onLoad) opts.onLoad(cur.n); });
      } else if (loadSlot(world, cur.n)) {
        close(() => { if (opts.onLoad) opts.onLoad(cur.n); });
      } else say('Dit opgeslagen spel kan niet geladen worden.');
      return;
    }
    if (act === 'more' && cur) { sel = cur.n; over = { n: cur.n, kind: 'menu' }; message = ''; render(); return; }
    if (act === 'copy' && cur) {
      const r = S.copySlot(null, cur.n);
      over = null;
      if (!r.ok) { message = r.why === 'vol' ? S.importErrorText('vol') : 'Kopiëren mislukt.'; render({ more: cur.n }); return; }
      sel = r.n; message = `Gekopieerd als "${r.name}".`; render({ slot: r.n });
      return;
    }
    if (act === 'save-here' && cur) {
      if (world && world.pigeonMode) { over = null; message = 'Je bent een duif. Stop de duif-modus om op te slaan.'; render({ more: cur.n }); return; }
      if (!cur.active && cur.state !== 'leeg') { over = { n: cur.n, kind: 'overwrite' }; render(); return; }
      S.setActive(null, cur.n);
      bindSlot();
      over = null;
      message = saveGame(world, { toast: false }) ? 'Opgeslagen.' : 'Opslaan mislukt.';
      render({ slot: cur.n });
      return;
    }
    if (act === 'overwrite-ok' && cur) {
      S.setActive(null, cur.n);
      bindSlot();
      over = null;
      message = saveGame(world, { toast: false }) ? 'Overschreven.' : 'Opslaan mislukt.';
      render({ slot: cur.n });
      return;
    }
    if (act === 'rename' && cur) { over = { n: cur.n, kind: 'rename' }; render(); return; }
    if (act === 'rename-ok' && cur) {
      S.renameSlot(null, cur.n, rootEl.querySelector('[data-input]').value);
      over = null; message = 'Naam bewaard.'; render({ slot: cur.n });
      return;
    }
    if (act === 'export' && cur) {
      const ex = S.exportSlot(null, cur.n);
      over = null;
      if (!ex.ok) { message = 'Dit opgeslagen spel kan niet geëxporteerd worden.'; render({ more: cur.n }); return; }
      try { download(ex.filename, ex.text); message = `Bestand gemaakt: ${ex.filename}`; } catch (e) { message = 'Exporteren mislukt.'; }
      render({ more: cur.n });
      return;
    }
    if (act === 'delete' && cur) {
      if (cur.active && coopSessieLoopt(world)) { over = null; message = COOP_WISSEN_TEKST; render({ more: cur.n }); return; } over = { n: cur.n, kind: 'delete' }; render(); return; }
    if (act === 'delete-ok' && cur) {
      over = null;
      if (cur.active && coopSessieLoopt(world)) { message = COOP_WISSEN_TEKST; render(); return; }
      message = S.deleteSlot(null, cur.n) ? 'Opgeslagen spel verwijderd.' : 'Verwijderen mislukt.';
      render();
    }
  };

  file.addEventListener('change', () => {
    const f = file.files && file.files[0];
    if (!f) return;
    if (f.size > S.MAX_IMPORT_CHARS) { say(S.importErrorText('groot')); return; }
    const rd = new FileReader();
    rd.onerror = () => { say(S.importErrorText('kapot')); };
    rd.onload = () => {
      const r = S.importAsNewSlot(null, String(rd.result || ''));
      if (r.ok) { sel = r.n; message = `Geïmporteerd als "${r.name}".`; } else message = S.importErrorText(r.why);
      if (rootEl) render(r.ok ? { slot: r.n } : undefined);
    };
    rd.readAsText(f);
  });

  rootEl.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('button');
    if (!b || b.disabled || !rootEl.contains(b)) return;
    if (b.dataset.more) { doAction('more', 0, Number(b.dataset.more)); return; }
    if (b.dataset.do === 'preset') { const inp = rootEl.querySelector('[data-input]'); if (inp) { inp.value = b.dataset.name || ''; doAction('rename-ok'); } return; }
    if (b.dataset.do) doAction(b.dataset.do, Number(b.dataset.want) || 0, Number(b.dataset.slot) || 0);
  });
  // focus on a card chooses it (the border follows the arrows)
  rootEl.addEventListener('focusin', (e) => {
    const c = e.target.closest && e.target.closest('.ssl-card[data-slot]');
    if (!c || over) return;
    const n = Number(c.dataset.slot);
    if (n === sel) return;
    sel = n;
    for (const x of rootEl.querySelectorAll('.ssl-card')) x.classList.toggle('sel', Number(x.dataset.slot) === n);
  });

  // focus order: along the cards (each: the card, then its '…'), up and down by columns; the footer below
  const columns = () => {
    const g = rootEl.querySelector('.ssl-grid');
    return Math.max(1, g ? getComputedStyle(g).gridTemplateColumns.split(' ').filter(Boolean).length : 1);
  };
  const move = (dir) => {
    const cur = document.activeElement;
    const first = (g) => rootEl.querySelector(`[data-grp="${g}"]:not(:disabled)`);
    if (!cur || !rootEl.contains(cur) || !cur.dataset.grp) { const f = first('list') || first('foot'); if (f) f.focus(); return; }
    const grp = cur.dataset.grp;
    if (grp === 'hero') {
      if (dir === 'down' || dir === 'right') { const m = rootEl.querySelector('.ssl-card .ssl-main:not(:disabled)'); if (m) m.focus(); }
      return;
    }
    if (grp === 'menu') {
      const items = [...rootEl.querySelectorAll('.ssl-over [data-grp="menu"]:not(:disabled)')];
      const i = items.indexOf(cur);
      const step = dir === 'up' || dir === 'left' ? -1 : 1;
      if (items.length) items[Math.max(0, Math.min(items.length - 1, i + step))].focus();
      return;
    }
    if (grp === 'foot') {
      const items = [...rootEl.querySelectorAll('[data-grp="foot"]:not(:disabled)')];
      const i = items.indexOf(cur);
      if (dir === 'left' || dir === 'right') { const nx = items[i + (dir === 'right' ? 1 : -1)]; if (nx) nx.focus(); }
      else if (dir === 'up') { const m = rootEl.querySelector(`.ssl-main[data-slot="${sel}"]:not(:disabled)`) || first('list'); if (m) m.focus(); }
      return;
    }
    const cards = [...rootEl.querySelectorAll('.ssl-card')];
    const ci = cards.indexOf(cur.closest('.ssl-card'));
    const onMore = cur.classList.contains('ssl-more');
    const cols = columns();
    const focusCard = (k, more) => {
      const c = cards[k];
      if (!c) return false;
      const t = (more && c.querySelector('.ssl-more')) || c.querySelector('.ssl-main:not(:disabled)') || c.querySelector('.ssl-more');
      if (t) { t.focus(); if (t.scrollIntoView) t.scrollIntoView({ block: 'nearest' }); return true; }
      return false;
    };
    const moreOf = (k) => cards[k] && cards[k].querySelector('.ssl-more');
    if (dir === 'right') { if (!onMore && moreOf(ci)) moreOf(ci).focus(); else focusCard(ci + 1, false); }
    else if (dir === 'left') { if (onMore) focusCard(ci, false); else if (ci > 0) focusCard(ci - 1, !!moreOf(ci - 1)); }
    else if (dir === 'up') { if (!focusCard(ci - cols, onMore)) { const h = first('hero'); if (h) h.focus(); } }
    else if (dir === 'down') { if (!focusCard(ci + cols, onMore)) { const f = first('foot'); if (f) f.focus(); } }
  };

  const onKey = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    const inInput = e.target && e.target.tagName === 'INPUT' && e.target.dataset.input !== undefined;
    if (k === 'Escape' || k === 'Backspace' && !inInput) {
      e.preventDefault(); e.stopPropagation();
      if (over) doAction('back'); else close();
      return;
    }
    if (inInput) {
      if (k === 'Enter') { e.preventDefault(); e.stopPropagation(); doAction('rename-ok'); }
      else if (k === 'ArrowDown' || k === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); move(k === 'ArrowDown' ? 'down' : 'up'); }
      else e.stopPropagation();
      return;
    }
    const dirs = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    if (dirs[k]) { e.preventDefault(); e.stopPropagation(); move(dirs[k]); return; }
    // Enter clicks the focused button here itself (and keeps the click from happening twice): a pad or a test script sends it as a key
    if (k === 'Enter' && !e.repeat) {
      const b = document.activeElement;
      if (b && b.tagName === 'BUTTON' && rootEl.contains(b) && !b.disabled) { e.preventDefault(); e.stopPropagation(); b.click(); return; }
    }
    // the menu key / M open the '…' of the chosen card
    if ((k === 'ContextMenu' || k === 'm' || k === 'M') && !over) { e.preventDefault(); e.stopPropagation(); doAction('more', 0, sel); return; }
    if (k === 'Tab') { e.stopPropagation(); return; }
    // Enter / Space click the focused button natively; keep the keys from the menus below
    e.stopPropagation();
  };
  window.addEventListener('keydown', onKey, true);

  // gamepad: gamepad.js (menu situation) sends arrows, Enter and Escape as keys;
  // a poll of our own here moved and clicked twice (#151)

  render();
}
