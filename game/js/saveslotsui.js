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
//   nieuwEerst (met pick): Nieuw spel als eerste kaart, zoals bij solo
//   eyebrow / titel / hint / loadLabel: optional texts (Samen spelen: 'Een spel openen')
//   pick + onPick(n): choosing a card only makes it the active game and calls onPick(n), without loading
//     (the host of Samen spelen picks the game to play with); an empty card calls onNew() as usual.
import * as S from './saveslots.js';
import { oskKnop } from './oskview.js';
import { MAX_SLOTS } from './storagekeys.js';
import { saveGame, loadSlot, readSave, bindSlot, onThumbKept, coopSessieLoopt, currentSlot, GAST_BEWAARD_TEKST, markLegacyCardSeen } from './savegame.js';
import { forkScope } from './savescope.js';
import { LEGACY_CARD } from './legacysave.js'; // 22-11: de kaart "Nieuw verhaal" bij een oude save
import { keyLabelHtml } from './keycap.js';
const CONFIRM_KEY = 'Enter'; // de toets in de knop Doorgaan (zoals bij de moeilijkheidskaart: een label voor keyLabelHtml, geen spelertekst)
import { saveProgress } from './progress.js';
import { stopCoopNet } from './coopnet.js';
import { groepAkkoord, meerSpelers } from './coopgroep.js';
import { coopLoadTekst, coopActieTekst, COOP_LOAD_FAIL, COOP_ACTIE_FAIL, runCoopLoad, runCoopStop } from './cooploadrules.js';
import { getPlaySeconds } from './savegame.js';
import { getMissionDefs, isMissionCompleted } from './missions.js';
import { hoofdspeler } from './players.js';
import { toonBevestiging, isBevestigOpen } from './spelbevestig.js';
import { verliesSinds, verliesTekst, slotVergelijk, euro } from './spelstatus.js';
import { escapeHtml as esc } from './htmlescape.js';

const DESKTOP = typeof window !== 'undefined' && window.gdeDesktop && window.gdeDesktop.isDesktop ? window.gdeDesktop : null;

// snelle namen: hernoemen kan zo ook met alleen een controller (geen schermtoetsenbord)
const NAME_PRESETS = ['Hoofdspel', 'Proefrit', 'Voor de missie', 'Veilig', 'Zomerrit', 'Reservekopie'];
// #564: het spel dat je nu speelt kan niet weg: de autosave zou de verwijderde plek meteen weer aanmaken.
const NU_SPEL_NIET_WEG = 'Dit is het spel dat je nu speelt. Speel eerst een ander spel om het te kunnen verwijderen.';
// #565: een gast bewaart zijn eigen verdiensten in de save die hij al heeft; een lege plek kan hij niet vullen.
const GAST_LEGE_PLEK_TEKST = 'Een lege plek kan een gast niet vullen: je verdiensten worden in je eigen opgeslagen spel bewaard. Kies een bestaand opgeslagen spel.';

let rootEl = null;

export function isSaveSlotsOpen() {
  return !!rootEl;
}


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
  rootEl.className = 'gm gm-zeef';
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
    const pic = rootEl && rootEl.querySelector(`.ssl-card[data-slot="${n}"] .sp-thumb`);
    const url = S.readThumb(null, n);
    if (!pic || !url) return;
    pic.classList.remove('sp-thumb--leeg');
    pic.style.backgroundImage = `url('${url}')`;
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
  // 28-11: Samen spelen kiest eerst een spel (pick): Nieuw spel staat dan als eerste kaart, zonder Doorgaan-held (hoofdmenu.js samenKeuzePlan)
  const nieuwEerst = mode === 'start' && !!opts.pick && !!opts.nieuwEerst;
  // #606: de boot opent dit scherm als de laatste save niet automatisch te laden viel; er is dan geen
  // titelscherm om naar terug te gaan, dus Terug valt weg.
  const noBack = !!opts.noBack;
  const primaryLabel = opts.loadLabel || (opts.pick ? 'Kiezen' : mode === 'start' && !solo ? 'Doorgaan' : 'Laden');
  // #564: de plek waaraan deze sessie gebonden is (currentSlot) is het spel dat nu loopt; verwijderen zou
  // niets opleveren, want de autosave schrijft hem meteen weer.
  const spelDatNuLoopt = (s) => mode === 'game' && !opts.pick && !!s && s.n === currentSlot();
  // #565: een gast speelt in de wereld van de gastheer en bewaart alleen zijn eigen verdiensten in zijn
  // eigen save; een lege plek zou een dode schrijfplek zijn waar elke checkpoint op stukloopt.
  const gastInSessie = () => !!(world && world.coopRole === 'client' && coopSessieLoopt(world));
  // #606: een gast bewaart alleen zijn eigen verdiensten in zijn eigen opgeslagen spel; de bevestiging zegt dat.
  const saveMelding = (ok, normaal) => (ok ? (gastInSessie() ? GAST_BEWAARD_TEKST : normaal) : 'Opslaan mislukt.');

  const mi = (act, ic, label, extra = '') => `<button type="button" class="ssl-mi${extra}" role="menuitem" data-grp="menu" data-do="${act}">${svg(IC[ic])}<span>${label}</span></button>`;

  // the layer over a card: the '…' menu, or one question
  const overHtml = (s) => {
    const bad = !s.summary;
    if (over.kind === 'rename') {
      return `<div class="ssl-over" role="group" aria-label="Hernoemen"><label class="ssl-lbl">Nieuwe naam<input class="ssl-input" data-grp="menu" data-input data-osk="tekst" data-osk-label="Nieuwe naam" data-osk-chips="@datum|Hoofdspel|Proefrit|Veilig" maxlength="${S.NAME_MAX}" value="${esc(s.name)}" autocomplete="off">${oskKnop('de naam')}</label>` +
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

  // Een vraag die niet in een kaartje past (hij is te lang voor vier kolommen): over het hele
  // paneel, met een eigen vak, zodat de bevestiging altijd met muis, touch en toetsenbord te
  // bereiken is (#492). Laden en een nieuw spel/verwijderen gebruiken dezelfde vorm.
  const coopQuestion = () => {
    if (!over || (over.kind !== 'coop-load' && over.kind !== 'coop-actie')) return '';
    const tekst = over.kind === 'coop-load' ? coopLoadTekst(world) : coopActieTekst(world, over.wat || 'Dit');
    const okDo = over.kind === 'coop-load' ? 'coop-load-ok' : 'coop-actie-ok';
    const okLabel = over.kind === 'coop-load' ? 'Ja, sessie beëindigen en laden' : over.act === 'new' ? 'Ja, sessie beëindigen en nieuw spel' : 'Ja, sessie beëindigen en verwijderen';
    return `<div class="ssl-over ssl-modal" role="alertdialog" aria-label="Sessie beëindigen"><div class="ssl-box"><p>${esc(tekst)}</p>` +
      `<div class="ssl-qacts"><button type="button" class="m-bp" data-grp="menu" data-do="back">Nee</button><button type="button" class="m-bg danger" data-grp="menu" data-do="${okDo}">${esc(okLabel)}</button></div></div></div>`;
  };

  // 22-11: de kaart "Nieuw verhaal": een save van een eerdere versie, eenmaal per save, vóór het laden. Doorgaan laadt hem zoals hij is
  // (alles open); Nieuw spel begint een nieuwe plek en wist niets. In het pauzemenu (geen Nieuw spel) is de tweede knop Terug.
  const legacyAsk = () => {
    if (!over || over.kind !== 'legacy') return '';
    const tweede = mode === 'start' ? `<button type="button" class="m-bg" data-grp="menu" data-do="legacy-new">${esc(LEGACY_CARD.nieuw)}</button>` : `<button type="button" class="m-bg" data-grp="menu" data-do="back">Terug</button>`;
    return `<div class="ssl-over ssl-modal" role="alertdialog" aria-labelledby="ssl-legacy-title" aria-describedby="ssl-legacy-text"><div class="ssl-box"><h2 class="m-h2" id="ssl-legacy-title">${esc(LEGACY_CARD.titel)}</h2><p id="ssl-legacy-text">${esc(LEGACY_CARD.tekst)} ${esc(LEGACY_CARD.gevolg)}</p>` +
      `<div class="ssl-qacts"><button type="button" class="m-bp" data-grp="menu" data-do="legacy-continue">${esc(LEGACY_CARD.doorgaan)} <span class="sk-toets-in">${keyLabelHtml(CONFIRM_KEY)}</span></button>${tweede}</div></div></div>`;
  };
  // de kaart is voor deze plek afgehandeld (ook als het bewaren van de vlag mislukte: dan vraagt hij niet nog eens in deze opening)
  const cardDone = new Set();

  const card = (s) => {
    const sm = s.summary;
    const thumb = S.readThumb(null, s.n);
    const bad = s.state === 'kapot' || s.state === 'nieuwer' || s.state === 'ander-verhaal';
    const inSessie = coopSessieLoopt(world);
    const isCurrent = mode === 'game' && !opts.pick && s.n === currentSlot();
    // bij de host is het eigen spel echt het spel dat al loopt; een gast laadt zijn eigen
    // opgeslagen spel juist door de sessie te verlaten (#492)
    const currentBlocked = isCurrent && !(inSessie && world.coopRole !== 'host');
    const label = isCurrent ? 'Huidig spel' : primaryLabel;
    const ago = sm ? S.agoText(sm.savedAt) || dateText(sm.savedAt) : '';
    const meta = bad ? S.stateText(s.state) : sm ? [S.formatPlaytime(sm.playSeconds), sm.plek, ago].filter(Boolean).join(' · ') : '';
    const open = over && over.n === s.n && over.kind !== 'coop-load' && over.kind !== 'coop-actie' && over.kind !== 'legacy';
    const pic = `<div class="sp-thumb${thumb ? '' : ' sp-thumb--leeg'}"${thumb ? ` style="background-image:url('${thumb}')"` : ''}>${isCurrent ? '<span class="sp-thumb__tag">Huidig</span>' : ''}</div>`;
    const niveau = sm && sm.niveau && !bad ? `<span class="sp-hulp" title="Moeilijkheid van dit spel">${esc(sm.niveau)}</span>` : '';
    const oud = sm && sm.legacyStory && !bad ? `<span class="ds-z-status ds-z-status--zacht">${esc(LEGACY_CARD.tag)}</span>` : '';
    const vanzelf = isCurrent ? '<span class="ds-z-status ds-z-status--goed">Bewaard vanzelf</span>' : '';
    const hersteld = s.state === 'hersteld' ? '<span class="ds-z-status ds-z-status--probleem">Hersteld</span>' : '';
    const kapot = bad ? '<span class="ds-z-status ds-z-status--probleem">Kan niet laden</span>' : '';
    const primair = mode === 'start' && !solo && !opts.pick;
    const laadKnop = `<button type="button" class="ds-z-knop${primair && !bad ? '' : ' ds-z-knop--secundair'} sp-kleinknop ssl-main" data-grp="list" data-slot="${s.n}" data-do="load"${bad || !sm || currentBlocked ? ' disabled' : ''} aria-label="${esc(s.name)}: ${label}">${esc(label)}</button>`;
    const hierOpslaan = mode === 'game' && !opts.pick && !bad && !gastInSessie() ? `<button type="button" class="ds-z-knop ds-z-knop--secundair sp-kleinknop" data-grp="list" data-slot="${s.n}" data-do="save-here" aria-label="Hier opslaan: ${esc(s.name)}">Hier opslaan</button>` : '';
    return `<div class="ssl-card sp-slot${s.n === sel ? ' sel' : ''}${bad ? ' sp-slot--kapot bad' : ''}${open ? ' open' : ''}" role="listitem" data-slot="${s.n}"${isCurrent ? ' aria-current="true"' : ''}>${pic}` +
      `<div class="sp-slot__naam"><span>${esc(s.name)}</span>${niveau}</div><div class="sp-slot__meta">${esc(meta)}${[vanzelf, hersteld, kapot, oud].filter(Boolean).length ? '<br>' + [vanzelf, hersteld, kapot, oud].filter(Boolean).join(' ') : ''}</div>` +
      `<div class="sp-slot__acties">${laadKnop}${hierOpslaan}<button type="button" class="ds-z-knop ds-z-knop--secundair sp-kleinknop sp-slot__meer ssl-more" data-grp="list" data-more="${s.n}" aria-haspopup="menu" aria-expanded="${!!open}" aria-label="Meer voor ${esc(s.name)}" title="Meer">${svg(IC.more)}</button></div>` +
      (open ? overHtml(s) : '') + '</div>';
  };

  const emptyCard = (n) => `<div class="ssl-card sp-slot sp-slot--leeg empty" role="listitem" data-slot="${n}"><span class="sp-ikoon">${svg(IC.plus, 'ssl-ic')}</span><b class="sp-getal" style="font-size:22px">Lege plek</b>` +
    `<button type="button" class="ds-z-knop ds-z-knop--secundair sp-kleinknop ssl-main" data-grp="list" data-do="new" data-want="${n}" aria-label="Lege plek ${n}: ${mode === 'start' ? 'nieuw spel' : 'spel opslaan'}">${mode === 'start' ? 'Nieuw spel' : 'Hier opslaan'}</button></div>`;

  // Alleen spelen: Nieuw spel is the first card. With every place in use it asks first (it takes the place of the active game)
  const newCard = (n, active) => {
    const ask = over && over.kind === 'newfull';
    // #780: de vraag belooft niets wat deleteSlot niet doet: sinds #562 gaat ook de herstelkopie weg,
    // anders blijft de oude save als "herstel" opduiken en kan de boot hem alsnog laden.
    const q = ask ? `<div class="ssl-over ssl-q" role="alertdialog" aria-label="Nieuw spel"><p>Alle ${MAX_SLOTS} plekken zijn in gebruik. Je nieuwe spel komt op de plek van "${esc(active ? active.name : '')}". Dat spel wordt gewist, inclusief de herstelkopie. Dat kan niet ongedaan worden gemaakt.</p>` +
      '<div class="ssl-qacts"><button type="button" class="m-bp" data-grp="menu" data-do="back">Nee, terug</button><button type="button" class="m-bg danger" data-grp="menu" data-do="newfull-ok">Ja, nieuw spel</button></div></div>' : '';
    return `<div class="ssl-card sp-slot sp-slot--leeg ssl-new${ask ? ' open' : ''}" role="listitem" data-slot="0"><span class="sp-ikoon">${svg(IC.plus, 'ssl-ic')}</span><b class="sp-getal" style="font-size:22px">Nieuw spel</b>` +
      `<button type="button" class="ds-z-knop ds-z-knop--secundair sp-kleinknop ssl-main" data-grp="list" data-slot="0" data-do="${n ? 'new' : 'new-ask'}" data-want="${n}" aria-label="Nieuw spel">Beginnen</button>${q}</div>`;
  };

  // the game played last: the active one, else the one saved last; Doorgaan on top
  const lastPlayed = (slots) => {
    const ok = slots.filter((s) => s.summary && s.state !== 'kapot' && s.state !== 'nieuwer' && s.state !== 'ander-verhaal');
    return ok.find((s) => s.active) || ok.sort((a, b) => b.summary.savedAt - a.summary.savedAt)[0] || null;
  };
  const heroHtml = (s) => {
    const data = S.readSlot(null, s.n).data;
    const thumb = S.readThumb(null, s.n);
    const ago = S.agoText(s.summary.savedAt) || dateText(s.summary.savedAt);
    const prog = data ? saveProgress(data) : null;
    const pic = thumb ? `<img src="${thumb}" alt="" draggable="false">` : `<span class="ssl-nopic">${svg(IC.person, 'ssl-nopic-ic')}</span>`;
    return `<button type="button" class="ssl-hero" data-grp="hero" data-do="load" data-slot="${s.n}" aria-label="Doorgaan: ${esc(s.name)}">` +
      `<span class="ssl-hero-pic">${pic}</span><span class="ssl-hero-body"><span class="ssl-hero-lab">${svg(IC.resume, 'ssl-hero-ic')}Doorgaan</span>` +
      `<span class="ssl-hero-nm one">${esc(s.name)}</span><span class="ssl-hero-meta one mut">${[S.formatPlaytime(s.summary.playSeconds), s.summary.plek, ago].filter(Boolean).map(esc).join(' · ')}</span>` +
      (prog != null ? `<span class="ssl-hero-prog"><span class="m-bar"><i style="width:${prog}%"></i></span><span class="bebas">${prog}% verhaal</span></span>` : '') + '</span></button>';
  };

  let intro = true;
  const render = (focus) => {
    const slots = S.listSlots();
    if (!slots.some((s) => s.n === sel)) sel = slots.length ? (slots.find((s) => s.active) || slots[0]).n : 0;
    const byN = new Map(slots.map((s) => [s.n, s]));
    const tiles = [];
    // the games there are, then one empty card: the other empty places stay out of sight (calm)
    // #565: een gast ziet geen lege kaart: die kan hij niet vullen.
    let emptyShown = solo || nieuwEerst || gastInSessie();
    if (solo || nieuwEerst) tiles.push(newCard(S.freeSlot(null), slots.find((s) => s.active)));
    for (let n = 1; n <= MAX_SLOTS; n++) {
      if (byN.has(n)) tiles.push(card(byN.get(n)));
      else if (!emptyShown) { tiles.push(emptyCard(n)); emptyShown = true; }
    }
    const last = solo ? lastPlayed(slots) : null;
    const full = slots.length >= MAX_SLOTS;
    // #590: the pre-migration backup (saveslots.js readBackup) is the last resort when a save is
    // broken. It goes into a free place and never over an existing save.
    const backup = slots.some((s) => s.state === 'kapot') ? S.readBackup(null) : null;
    rootEl.querySelector('.gm-stage')?.remove();
    const stage = document.createElement('div');
    stage.className = 'gm-stage';
    // #1229: met een of twee kaarten krimpt het paneel om zijn inhoud in plaats van voor 80% leeg te staan
    stage.innerHTML = `<section class="m-panel ssl-panel${tiles.length <= 2 ? ' ssl-weinig' : ''}">
      <header class="m-head"><div><span class="m-eb">${esc(opts.eyebrow || (mode === 'start' ? 'Spel' : 'Pauze'))}</span><h1 class="m-h1" id="ssl-title">${esc(opts.titel || 'Opgeslagen spellen')}</h1>${opts.hint ? `<p class="mut ssl-intro">${esc(opts.hint)}</p>` : ''}</div><div class="m-hr"><span class="mut">${slots.length} van ${MAX_SLOTS}</span></div></header>
      ${last ? `<div class="ssl-hero-wrap">${heroHtml(last)}</div>` : ''}
      <div class="ssl-scroll"><div class="ssl-grid sp-slots" role="list" aria-label="Opgeslagen spellen">${tiles.join('')}</div></div>
      ${mode === 'game' ? '<p class="ssl-note">Het spel bewaart vanzelf.</p>' : ''}
      <p class="ssl-msg" role="status">${esc(message)}</p>
      <footer class="ssl-foot"><button type="button" class="ssl-fb" data-grp="foot" data-do="import"${full ? ' disabled title="Alle plekken zijn in gebruik"' : ''}>${svg(IC.import)}<span>Spel importeren</span></button>
        ${backup ? `<button type="button" class="ssl-fb" data-grp="foot" data-do="restore-backup"${full ? ' disabled title="Alle plekken zijn in gebruik"' : ''}>${svg(IC.save)}<span>Reservekopie herstellen</span></button>` : ''}
        <span class="ssl-fgrow"></span>${noBack ? '' : `<button type="button" class="ssl-fb" data-grp="foot" data-do="close">${svg(IC.back)}<span>Terug</span></button>`}</footer>
      ${coopQuestion()}${legacyAsk()}
    </section>`;
    rootEl.insertBefore(stage, file);
    const q = (s) => stage.querySelector(s);
    let el = null;
    if (over) {
      if (over.kind === 'rename') { el = q('[data-input]'); if (el) { el.focus(); el.select(); return; } }
      el = q('.ssl-over [data-grp="menu"]:not(:disabled)');
      if (over.kind === 'delete' || over.kind === 'overwrite' || over.kind === 'newfull' || over.kind === 'coop-load') el = q('.ssl-over [data-do="back"]');
    } else if (focus && focus.more) el = q(`[data-more="${focus.more}"]`);
    else if (focus && focus.newcard) el = q('.ssl-new .ssl-main');
    else if (intro && !focus && q('.ssl-hero')) el = q('.ssl-hero');
    else el = q(`.ssl-main[data-slot="${(focus && focus.slot) || sel}"]:not(:disabled)`) || q(`.ssl-more[data-more="${sel}"]`) || q('[data-grp="list"]:not(:disabled)');
    intro = false;
    if (el) { el.focus(); if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); }
  };

  const say = (t) => { message = t; const p = rootEl && rootEl.querySelector('.ssl-msg'); if (p) p.textContent = t; };

  // Wat een nieuw bewaarde stand van het lopende spel zou zijn tegenover wat in een plek staat (spelstatus.js).
  const stageHost = () => rootEl.querySelector('.gm-stage') || document.body;
  const nuStand = () => {
    let missies = 0;
    try { for (let i = 0, k = getMissionDefs().length; i < k; i++) if (isMissionCompleted(i)) missies++; } catch (e) { missies = 0; }
    let character = 'tammo';
    try { character = hoofdspeler(world).character === 'anita' ? 'anita' : 'tammo'; } catch (e) { /* geen wereld */ }
    return { speeltijd: getPlaySeconds(), money: world ? world.money : 0, missies, character };
  };
  const slotStand = (sl) => ({ speeltijd: sl.summary ? sl.summary.playSeconds : 0, money: sl.summary ? sl.summary.money : 0, missies: sl.summary ? sl.summary.missionsDone : 0, character: sl.summary ? (sl.summary.character === 'Tessa' ? 'anita' : 'tammo') : '' });
  const thumbBlok = (n) => { const t = S.readThumb(null, n); return `<div class="sp-thumb${t ? '' : ' sp-thumb--leeg'}"${t ? ` style="background-image:url('${t}')"` : ''}></div>`; };
  const kort = (sl) => sl.summary ? `${S.formatPlaytime(sl.summary.playSeconds)}${sl.summary.plek ? ' · ' + esc(sl.summary.plek) : ''}<br>${esc(euro(sl.summary.money))} · ${esc(S.agoText(sl.summary.savedAt) || dateText(sl.summary.savedAt))}` : '';

  const doAction = (act, want, n) => {
    const slot = n || sel;
    const cur = S.listSlots().find((s) => s.n === slot);
    if (act === 'close') { close(); return; }
    if (act === 'back') { const m = over && over.n; const nf = over && over.kind === 'newfull'; over = null; render(nf ? { newcard: true } : { more: m }); return; }
    if (act === 'new-ask') { over = { n: 0, kind: 'newfull' }; render(); return; }
    // #492 slices 1-2: een nieuw spel tijdens een echte sessie vraagt eerst om bevestiging; daarna
    // stopt de sessie, wordt de voortgang bewaard en pas dan begint het nieuwe spel (dezelfde
    // volgorde als bij laden en stoppen, cooploadrules.js).
    if (act === 'newfull-ok' && coopSessieLoopt(world)) {
      over = { n: 0, kind: 'coop-actie', act: 'new', wat: 'Een nieuw spel beginnen' };
      render();
      return;
    }
    if (act === 'newfull-ok') {
      // #562: de speler bevestigde dat het nieuwe spel de plek van het actieve spel overneemt; die save gaat
      // nu echt weg (met zijn herstelkopie), zodat er een vrije plek is en de boot niet de oude save laadt.
      const active = S.listSlots().find((s) => s.active);
      if (active && !S.deleteSlot(null, active.n)) { say('Verwijderen mislukt; er is geen plek vrijgemaakt.'); return; }
      close(() => { if (opts.onNew) opts.onNew(); });
      return;
    }
    if (act === 'new') {
      if (mode === 'start') { close(() => { if (opts.onNew) opts.onNew(); }); return; }
      if (world && world.pigeonMode) { say('Je bent een duif. Stop de duif-modus om op te slaan.'); return; }
      // #565: een gast bewaart alleen in een bestaand opgeslagen spel; een lege plek wordt een dode
      // schrijfplek omdat zijn eigen save al bestaat.
      if (gastInSessie()) { say(GAST_LEGE_PLEK_TEKST); return; }
      const was = S.activeSlot();
      const m = S.freeSlot() ? S.createSlot(null, S.newSlotName(S.takenNames(null)), want) : 0;
      if (!m) { say('Alle plekken zijn in gebruik.'); return; }
      bindSlot();
      if (!saveGame(world, { toast: false, manual: true })) {
        // de nieuwe plek gaat weer weg en de oude actieve plek (en de schrijfplek) komt terug
        S.deleteSlot(null, m);
        S.setActive(null, was);
        bindSlot();
        say('Opslaan mislukt.');
        render();
        return;
      }
      forkScope(localStorage, m); // 22-11: pas na het opslaan: het lopende spel gaat verder als de nieuwe save en erft de voortgang
      sel = m; message = 'Opgeslagen.'; render({ slot: m });
      return;
    }
    if (act === 'import') { file.value = ''; file.click(); return; }
    if (act === 'restore-backup') {
      const b = S.readBackup(null);
      if (!b) { say('Er is geen reservekopie meer.'); render(); return; }
      const r = S.importAsNewSlot(null, b.raw);
      if (!r.ok) { message = S.importErrorText(r.why); render(); return; }
      sel = r.n; message = `Reservekopie hersteld in "${r.name}".`; render({ slot: r.n });
      return;
    }
    if (act === 'load' && cur) {
      const inSessie = coopSessieLoopt(world);
      const isHost = inSessie && world.coopRole === 'host';
      // het spel dat al loopt eerst opslaan en dan "laden" zou het met zichzelf overschrijven
      if (mode === 'game' && !opts.pick && cur.n === currentSlot() && (!inSessie || isHost)) { say('Dit is het spel dat je nu speelt.'); return; }
      if (inSessie) { sel = cur.n; over = { n: cur.n, kind: 'coop-load' }; render(); return; }
      sel = cur.n;
      // 22-11: een oude save vraagt eenmaal naar het nieuwe verhaal (lokaal; ook de plek kiezen voor Samen spelen blijft zoals hij was)
      if (!opts.pick && cur.summary && cur.summary.legacyCard && !cardDone.has(cur.n)) { over = { n: cur.n, kind: 'legacy' }; render(); return; }
      if (opts.pick) {
        if (!readSave(cur.n)) { say('Dit opgeslagen spel kan niet geladen worden.'); return; }
        S.setActive(null, cur.n);
        close(() => { if (opts.onPick) opts.onPick(cur.n); });
      } else if (mode === 'start') {
        if (!readSave(cur.n)) { say('Dit opgeslagen spel kan niet geladen worden.'); return; }
        S.setActive(null, cur.n);
        close(() => { if (opts.onLoad) opts.onLoad(cur.n); });
      } else {
        // eerst de huidige voortgang bewaren; mislukt dat, dan blijft het huidige spel staan
        const laad = (metOpslaan) => {
          if (metOpslaan && !saveGame(world, { toast: false })) { say('Opslaan mislukt; het spel is niet geladen.'); return; }
          if (loadSlot(world, cur.n)) close(() => { if (opts.onLoad) opts.onLoad(cur.n); });
          else say('Dit opgeslagen spel kan niet geladen worden.');
        };
        const hui = S.listSlots().find((x) => x.n === currentSlot());
        const v = hui && hui.summary ? verliesSinds(nuStand(), slotStand(hui)) : null;
        if (v && !v.leeg) {
          toonBevestiging({
            titel: `“${cur.name}” laden?`, breed: 820, tekst: `Je speelt verder vanaf dit spel. Je huidige spel “${esc(hui.name)}” heeft <b>nog niet opgeslagen</b> wat je sinds de laatste opslag deed.`,
            verlies: [{ soort: 'weg', label: 'Anders weg', tekst: verliesTekst(v), icoon: 'waarschuwing' }],
            acties: [{ label: 'Opslaan en laden', soort: 'veilig', toets: 'ENTER', kies: () => laad(true) }, { label: 'Laden zonder opslaan', soort: 'neutraal', kies: () => { laad(false); } }, { label: 'Annuleren', soort: 'neutraal', toets: 'ESC' }],
          }, stageHost());
          return;
        }
        laad(true);
      }
      return;
    }
    if (act === 'legacy-continue' && cur) {
      cardDone.add(cur.n);
      markLegacyCardSeen(cur.n);
      over = null;
      doAction('load', 0, cur.n);
      return;
    }
    if (act === 'legacy-new' && cur) {
      // Nieuw spel wist niets: zonder vrije plek zegt het dat, het neemt de plek van deze oude save niet in
      const vrij = S.freeSlot(null);
      over = null;
      if (!vrij) { message = 'Alle plekken zijn in gebruik. Verwijder eerst een ander spel.'; render({ slot: cur.n }); return; }
      cardDone.add(cur.n);
      markLegacyCardSeen(cur.n);
      doAction('new', vrij, 0);
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
      if (!cur.active && cur.state !== 'leeg') {
        // oud tegenover nieuw, met vasthouden (Spel-UI 24-11): de plek en het lopende spel naast elkaar, en of het veilig is
        const huidig = S.listSlots().find((x) => x.n === currentSlot()) || null;
        const nu = nuStand();
        const vgl = slotVergelijk(slotStand(cur), nu);
        const zij = (kop, thumbHtml, tekst, weg) => `<div class="sp-vergelijk__zij${weg ? ' sp-vergelijk__zij--weg' : ''}"><b>${kop}</b>${thumbHtml}<span>${tekst}</span></div>`;
        const vergelijk = '<div class="sp-vergelijk">' + zij('Nu in deze plek', thumbBlok(cur.n), kort(cur), true) + '<div class="sp-vergelijk__pijl">→</div>' +
          zij('Straks in deze plek', huidig ? thumbBlok(huidig.n) : '<div class="sp-thumb sp-thumb--leeg"></div>', `${S.formatPlaytime(nu.speeltijd)}<br>${esc(euro(nu.money))} · nu`, false) + '</div>';
        const lege = S.freeSlot(null);
        toonBevestiging({
          titel: `“${cur.name}” overschrijven?`, breed: 1040, tekst: 'Dit opgeslagen spel wordt vervangen door je huidige spel. Het oude spel is daarna <b>weg</b>.', vergelijk,
          verlies: [vgl.veilig ? { soort: 'blijft', label: 'Veilig', tekst: 'Je verliest alleen de oudere stand in deze plek.', icoon: 'vinkje' } : { soort: 'weg', label: 'Let op', tekst: vgl.waarschuwing, icoon: 'waarschuwing' }],
          acties: [{ label: 'Nee, bewaar allebei', soort: 'veilig', toets: 'ENTER' }, ...(lege ? [{ label: 'Naar een lege plek', soort: 'neutraal', kies: () => doAction('new', lege, 0) }] : []), { label: 'Houd vast om te overschrijven', soort: 'gevaar', vasthouden: true, toets: 'ENTER', kies: () => { sel = cur.n; doAction('overwrite-ok', 0, cur.n); } }],
        }, stageHost());
        return;
      }
      S.setActive(null, cur.n);
      bindSlot();
      over = null;
      message = saveMelding(saveGame(world, { toast: false, manual: true }), 'Opgeslagen.');
      render({ slot: cur.n });
      return;
    }
    if (act === 'overwrite-ok' && cur) {
      S.setActive(null, cur.n);
      bindSlot();
      over = null;
      message = saveMelding(saveGame(world, { toast: false, manual: true }), 'Overschreven.');
      render({ slot: cur.n });
      return;
    }
    if (act === 'coop-load-ok' && cur) {
      const gaLaden = () => {
        const res = runCoopLoad(world, cur.n, { stop: stopCoopNet, save: saveGame, load: loadSlot });
        if (res.ok) { close(() => { if (opts.onLoad) opts.onLoad(cur.n); }); return; }
        over = null; message = COOP_LOAD_FAIL[res.reason] || 'Laden mislukt.'; render({ slot: cur.n });
      };
      // wie het laden de sessie voor iedereen laat stoppen, stelt het eerst voor (24-11); een gast verlaat alleen zelf de sessie
      if (world.coopRole === 'host' && meerSpelers(world)) { over = null; message = 'Je stelt voor om te laden. Iedereen moet akkoord zijn.'; render({ slot: cur.n }); groepAkkoord(world, 'laden', null, gaLaden, () => { message = 'Niet iedereen is akkoord; er wordt niets geladen.'; render({ slot: cur.n }); }); return; }
      const res = runCoopLoad(world, cur.n, { stop: stopCoopNet, save: saveGame, load: loadSlot });
      if (res.ok) { close(() => { if (opts.onLoad) opts.onLoad(cur.n); }); return; }
      // ook bij een mislukte stap eerlijk opnieuw tekenen: na het stoppen is de sessie weg
      over = null;
      message = COOP_LOAD_FAIL[res.reason] || 'Laden mislukt.';
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
      // #564/#606: het spel dat je nu speelt kan er niet onder je vandaan: de autosave zou de verwijderde
      // plek meteen weer aanmaken. Verwijderen kan pas als je een ander spel speelt.
      if (spelDatNuLoopt(cur)) { over = null; message = NU_SPEL_NIET_WEG; render({ more: cur.n }); return; }
      // #492 slices 1-2: het actieve spel verwijderen tijdens een echte sessie vraagt eerst om
      // bevestiging; daarna stopt de sessie, wordt de voortgang bewaard en pas dan wordt het spel gewist.
      if (cur.active && coopSessieLoopt(world)) { over = { n: cur.n, kind: 'coop-actie', act: 'delete', wat: 'Dit opgeslagen spel verwijderen' }; render(); return; }
      toonBevestiging({
        titel: `“${cur.name}” verwijderen?`, breed: 820, tekst: 'Dit spel en zijn reservekopie gaan weg. Dat kan niet ongedaan worden gemaakt.',
        vergelijk: `<div class="sp-vergelijk" style="grid-template-columns:1fr"><div class="sp-vergelijk__zij sp-vergelijk__zij--weg" style="flex-direction:row;gap:14px;align-items:center"><div style="width:220px">${thumbBlok(cur.n)}</div><span><b>${esc(cur.name)}</b><br>${kort(cur)}</span></div></div>`,
        acties: [{ label: 'Nee, bewaren', soort: 'veilig', toets: 'ENTER' }, { label: 'Houd vast om te verwijderen', soort: 'gevaar', vasthouden: true, toets: 'ENTER', kies: () => { sel = cur.n; doAction('delete-ok', 0, cur.n); } }],
      }, stageHost());
      return; }
    if (act === 'delete-ok' && cur) {
      over = null;
      if (spelDatNuLoopt(cur)) { message = NU_SPEL_NIET_WEG; render(); return; }
      if (cur.active && coopSessieLoopt(world)) { over = { n: cur.n, kind: 'coop-actie', act: 'delete', wat: 'Dit opgeslagen spel verwijderen' }; render(); return; }
      message = S.deleteSlot(null, cur.n) ? 'Opgeslagen spel verwijderd.' : 'Verwijderen mislukt.';
      render();
    }
    if (act === 'coop-actie-ok' && over) {
      const doel = over;
      const doelSlot = S.listSlots().find((s) => s.n === doel.n) || null;
      const res = runCoopStop(world, {
        stop: stopCoopNet,
        save: () => saveGame(world, { toast: false }),
        go: () => {
          over = null;
          if (doel.act === 'new') {
            // #562: dezelfde route als Nieuw spel bij een volle lijst: de actieve save maakt plaats
            const active = S.listSlots().find((s) => s.active);
            if (active && !S.deleteSlot(null, active.n)) { message = 'Verwijderen mislukt; er is geen plek vrijgemaakt.'; render({ newcard: true }); return; }
            close(() => { if (opts.onNew) opts.onNew(); });
            return;
          }
          if (!doelSlot) { message = 'Dit opgeslagen spel bestaat niet meer.'; render(); return; }
          message = S.deleteSlot(null, doelSlot.n) ? 'Opgeslagen spel verwijderd.' : 'Verwijderen mislukt.';
          render();
        },
      });
      if (!res.ok) { over = null; message = COOP_ACTIE_FAIL[res.reason] || 'De actie is niet doorgegaan.'; render(); }
      return;
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
    // elke kaart heeft meerdere knoppen (Laden, Hier opslaan, …): links en rechts lopen erdoor, omhoog en omlaag naar dezelfde knop van de kaart erboven of eronder
    const cards = [...rootEl.querySelectorAll('.ssl-card')];
    const ci = cards.indexOf(cur.closest('.ssl-card'));
    const knoppenVan = (c) => [...c.querySelectorAll('[data-grp="list"]:not(:disabled)')];
    const mine = knoppenVan(cards[ci]);
    const bi = mine.indexOf(cur);
    const cols = columns();
    const naar = (k, idx) => {
      const c = cards[k];
      if (!c) return false;
      const kn = knoppenVan(c);
      if (!kn.length) return false;
      const t = kn[Math.max(0, Math.min(kn.length - 1, idx))];
      t.focus(); if (t.scrollIntoView) t.scrollIntoView({ block: 'nearest' });
      return true;
    };
    if (dir === 'right') { if (bi < mine.length - 1) mine[bi + 1].focus(); else naar(ci + 1, 0); }
    else if (dir === 'left') { if (bi > 0) mine[bi - 1].focus(); else if (ci > 0) naar(ci - 1, 99); }
    else if (dir === 'up') { if (!naar(ci - cols, bi)) { const h = first('hero'); if (h) h.focus(); } }
    else if (dir === 'down') { if (!naar(ci + cols, bi)) { const f = first('foot'); if (f) f.focus(); } }
  };

  const onKey = (e) => {
    if (isBevestigOpen()) return; // de bevestigingskaart (spelbevestig.js) heeft de toetsen
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    const inInput = e.target && e.target.tagName === 'INPUT' && e.target.dataset.input !== undefined;
    if (k === 'Escape' || k === 'Backspace' && !inInput) {
      e.preventDefault(); e.stopPropagation();
      if (over) doAction('back');
      else if (!noBack) close();
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
