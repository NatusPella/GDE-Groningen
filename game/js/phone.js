// The phone: Tammo and Tessa's foldable, the Pixie Vouw 11. Unfolded it IS
// the pause menu (pausemenu.js draws the frame); this module fills its
// Telefoon section: Contacten (calls with an action or two) and Berichten
// (texts, calls and Kiekdoar news from world.phoneHistory, per sender, with
// unread counts). Incoming calls and texts are phonefeed.js (the folded cover
// screen); Esc while one is up opens its thread here.
import { dualHtml } from './subtitles.js';
import { speakerHtml } from './speakers.js';
import { noteSpoken, CHARACTERS, hasMet } from './characters.js';
import { initCinematics, updateCinematics, cinematicPausesGameplay } from './cinematics.js';
import { getNextMission } from './missions.js';
import { getMissionList } from './missionquery.js';
import { playMission, isPlayAheadOpen } from './todo.js';
import { isHelpOfferOpen } from './assistlive.js';
import { zachtePauze } from './coopgroep.js';
import { checkPhoneWhileMoving } from './trafficlaw.js';
import { isPauseMenuOpen, isPhoneOpen, openPauseMenu, closePauseMenu } from './pausestate.js';
export { isPhoneOpen };
import { setUserWaypoint } from './routing.js';
import { storyFlag } from './storyquery.js';
import { getHeroCar } from './hud_panel.js';
import { getGarageList, deliverOwnedVehicle } from './ownedvehicles.js';
import { nieuweDeelStaat, rechtVan, zetDeelRecht, wisselRecht, RECHT_TEKST } from './coopbezit.js';
import { missieMagVanuitMenu } from './coopgast.js';
import { initGarageStyles } from './garageui.js';
import { lineVoiceFor } from './linevoice.js';
// phone talk is a call on the speech.js channel
import { playContactVoice as playBanterVoice, stopContactVoice as stopBanterVoice } from './audio.js';
import { HERO_REPLACE_FEE as GARAGE_PRICE } from './economy.js';

export const PHONE_NAME = 'Pixie Vouw 11';
const RING_TIME = 0.9;
const MAX_DELIVER = 3;

let world = null;
// the call in progress: { contact, phase: 'ringing' | 'talk', t, line, actions, offer }
let call = null;
let callIdx = -1;
let thread = null;
let note = '';
let panelRef = null;
let api = null;

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const initials = (name) => String(name).replace(/\(.*\)/, '').trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase();

function buddyName(w) {
  return w.companion && w.companion.character === 'anita' ? 'Tessa' : w.companion ? 'Tammo' : w.player.character === 'tammo' ? 'Tessa' : 'Tammo';
}

function contacts(w) {
  return [
    { id: 'buddy', name: buddyName(w), sub: 'Maat', talk: buddyTalk },
    { id: 'berend', name: 'Berend Bos', sub: 'Opdrachtgever', talk: berendTalk },
    { id: 'garage', name: 'Garage Knalpot', speaker: 'Henk', sub: 'Henk, auto’s & excuses', talk: garageTalk },
    { id: 'mam', name: 'Mam', sub: 'Thuis', talk: mamTalk },
    ...(storyFlag('jelle') ? [{ id: 'jelle', name: 'Jelle Terpstra', sub: 'De Fryske Snackkening', talk: jelleTalk }] : []),
  ];
}

function buddyTalk(w) {
  const c = w.companion;
  const near = c && Math.hypot(c.x - w.player.x, c.y - w.player.y) < 15;
  if (near) return { line: pick(['Ik sta letterlijk naast je. Draai je eens om.', 'Waarom bel je mij? Ik zie je gewoon staan, gek.']) };
  return {
    line: pick([
      'Heb je eierballen gehaald? Nee? Waarom bel je dan?',
      'Moi! Kun je niet gewoon appen, net als ieder normaal mens?',
      'Sinds ik jou ken heb ik geen rustige dag meer gehad in Grunn.',
    ]),
    actions: c ? [{ label: 'Waar ben je?', primary: true, run: () => { setUserWaypoint(c.x, c.y, buddyName(w)); flashAndClose(`${buddyName(w)} staat op je kaart`); } }] : [],
  };
}

function berendTalk(w, c) {
  const next = getNextMission();
  if (!next) return { line: 'Niks. Kom mor later.' };
  if (next.active) return { line: 'Je bent al bezig. Eerst afmaken.' };
  // Samen spelen: een gast begint zijn opdracht niet aan de telefoon, maar bij het startpunt (#452).
  if (!missieMagVanuitMenu(w)) {
    return {
      line: `Samen spelen: "${next.label}" vraag je bij het startpunt. Daar druk je op E.`,
      actions: [{ label: 'Wijs het startpunt', primary: true, run: () => { setUserWaypoint(next.start.x, next.start.y, next.label); flashAndClose('Het startpunt staat op je kaart'); } }],
    };
  }
  const list = getMissionList();
  const idx = c.offer != null ? c.offer : next.index;
  const m = list[idx];
  const done = m.done ? ' Al eens gedaan, dus klusloon. Geld is geld.' : '';
  const needs = m.needs ? ` Maar eerst: ${m.needs}` : '';
  return {
    line: `Kom mor. Klusje: "${m.label}". €${m.pay}, contant.${done}${needs}`,
    actions: [
      // a later story mission asks first (todo.js); the menu closes for that question
      { label: 'Klus aannemen', primary: true, run: () => { closePauseMenu(); playMission(w, idx, () => w.addMessage(`Route naar ${m.label}`, 3)); } },
      { label: 'Iets anders?', run: () => { c.offer = (idx + 1) % list.length; talk(c); } },
    ],
  };
}

// Samen spelen (#449): deel je dit voertuig met de groep waarin je speelt?
// De bezorging zelf gaat via "Breng de ..." en de gastheer zet de kopie neer.
function deelActie(w, id, naam) {
  const staat = w.coopBezit || (w.coopBezit = nieuweDeelStaat());
  const recht = rechtVan(staat, id);
  return {
    label: `Delen: ${RECHT_TEKST[recht] || RECHT_TEKST.iedereen}`,
    run: () => {
      const na = zetDeelRecht(staat, id, wisselRecht(recht));
      flashAndClose(na === 'ik' ? `Je ${naam} is weer alleen van jou` : `Je ${naam} deel je met de groep`);
    },
  };
}

// Henk: the hero car on the map or a new one, and any owned vehicle brought round.
function garageTalk(w) {
  const lijst = getGarageList(w);
  const hero = getHeroCar(w);
  const escapade = lijst.find((x) => x.hero);
  const actions = [];
  let line;
  if (hero && w.player.inVehicle === hero) line = 'Je zit er nu in, slimmerik. Hoor ik ’m nou rammelen?';
  else if (hero) {
    line = 'Je Escapade staat nog netjes waar je ’m liet. Zal ik ’m op je kaart zetten?';
    actions.push({ label: 'Op kaart zetten', primary: true, run: () => { setUserWaypoint(hero.x, hero.y, 'Jouw auto'); flashAndClose('Je auto staat op de kaart'); } });
  } else {
    line = `Afgeschreven? Wéér? Voor €${GARAGE_PRICE} zet ik een nieuwe bij je neer.`;
    actions.push({
      label: `Bezorgen (€${GARAGE_PRICE})`, primary: true,
      run: () => {
        if (w.money < GARAGE_PRICE) return say('Geen geld, geen Escapade. Zo werkt dat hier.');
        const res = deliverOwnedVehicle(w, 'hero');
        if (!res.ok) return say(res.text);
        closePauseMenu();
      },
    });
  }
  if (w.coopRole === 'client' && escapade && !escapade.lost) actions.push(deelActie(w, 'hero', 'Escapade'));
  let n = 0;
  for (const e of lijst) {
    if (e.hero || n >= MAX_DELIVER || ['driving', 'locked', 'forsale'].includes(e.status)) continue;
    n++;
    actions.push({
      label: `Breng de ${e.model || e.label} (${e.feeLabel})`,
      run: () => { const res = deliverOwnedVehicle(w, e.id); if (res.ok) closePauseMenu(); else say(res.text); },
    });
    if (w.coopRole === 'client') actions.push(deelActie(w, e.id, e.model || e.label));
  }
  return { line, actions };
}

function jelleTalk() {
  // after the story (postgame.js): the friendly rival wants a rematch
  const pg = world && world.postgame && world.postgameActions;
  if (pg) {
    const offers = pg.offers().filter((o) => o.id !== 'fjord').sort((a, b) => a.dist - b.dist);
    const o = offers[0];
    return {
      line: pick([
        'Moai, Grinzers! Revanche? Elf bruggen, een fierljep of een skûtsje. Kies mar.',
        'Ik heb geoefend, hear. Deze keer win ik. Wis en wrachtich.',
        'Mijn mem zegt: Jelle, laat die Grinzers maar winnen. Maar mijn mem is er niet.',
      ]),
      actions: o ? [{ label: `${o.name} op kaart`, primary: true, run: () => { setUserWaypoint(o.x, o.y, o.where); flashAndClose(`${o.name} staat op je kaart`); } }] : [],
    };
  }
  return {
    line: pick([
      'Moai! Jullie hebben mijn kaartje gevonden? Tige tank voor het wachten.',
      'Grunn is een aardig groot dorp. Mar wat Grunn kin, kin Fryslân better.',
      'De Eierbal? Nooit van gehoord. Oant sjen op Gronings Ontzet!',
    ]),
  };
}

function mamTalk() {
  return {
    line: pick([
      'Heb je wel een jas aan? Het waait weer flink in Grunn.',
      'Ik zag je op Kiekdoar. Ik zeg niks. Je vader zag het ook.',
      'Kom je zondag eten? Er is hutspot. En neem die Tessa ook mee.',
    ]),
  };
}

function flashAndClose(msg) {
  if (world) world.addMessage(msg, 3);
  hangUp();
  closePauseMenu();
}

function say(text) {
  if (!call) return;
  call.line = text;
  call.actions = call.actions.filter((a) => a.hangup);
  renderDetail(true);
}

function talk(c) {
  const res = c.contact.talk(world, c) || {};
  c.phase = 'talk';
  c.line = res.line || '';
  c.actions = [...(res.actions || []), { label: 'Ophangen', hangup: true, run: () => { hangUp(); renderDetail(true); } }];
  if (c.line) noteSpoken(world, c.contact.speaker || c.contact.name);
  // Jelle answers in his own voice (the lines manifest)
  const v = c.contact.id === 'jelle' && lineVoiceFor('Jelle Terpstra', c.line);
  if (v) playBanterVoice(v.src);
  renderDetail(true);
}

function hangUp() {
  if (call) stopBanterVoice();
  call = null;
}

// --- Berichten: world.phoneHistory per sender ----------------------------------------------

// An entry: { text, at, from?, body?, read? }. Older entries (before `from`)
// carry the sender in the text: "Henk: ...", "Gesprek · Henk: ...".
function senderOf(e) {
  if (e.from) return e.from;
  const m = /^(?:(?:Gesprek|Live) · )?([^:]{2,32}?)(?: (?:belde|sprak in|was live|op Kiekdoar|liet een kaartje achter|op Nachtstreek))?: /.exec(e.text || '');
  return m ? m[1] : 'Kiekdoar';
}
function bodyOf(e) {
  if (e.body) return e.body;
  const m = /^(?:(?:Gesprek|Live) · )?[^:]{2,32}: (.*)$/s.exec(e.text || '');
  return m ? m[1] : String(e.text || '');
}

function phoneThreads(w = world) {
  const by = new Map();
  for (const e of (w && w.phoneHistory) || []) {
    const from = senderOf(e);
    let t = by.get(from);
    if (!t) { t = { from, items: [], unread: 0 }; by.set(from, t); }
    t.items.push(e);
    if (!e.read) t.unread++;
  }
  return [...by.values()];
}

export function phoneUnread(w = world) {
  return ((w && w.phoneHistory) || []).filter((e) => !e.read).length;
}

function markRead(from) {
  for (const e of (world && world.phoneHistory) || []) if (senderOf(e) === from) e.read = true;
}

// --- the Telefoon section (pausemenu.js) ---------------------------------------------------

function contactCard(c, i) {
  const cur = callIdx === i && call;
  return `<button type="button" class="m-li ph-card" data-ph-contact="${i}"${cur ? ' aria-current="true"' : ''}>` +
    `<span class="av">${esc(initials(c.name))}</span>` +
    `<span class="nm"><span class="one">${esc(c.name)}</span><span class="mut one">${dualHtml(c.sub)}</span></span>` +
    `${cur ? `<span class="t g">${call.phase === 'ringing' ? 'Bellen…' : 'In gesprek'}</span>` : ''}</button>`;
}

function threadCard(t) {
  const last = t.items[0];
  return `<button type="button" class="m-li ph-card" data-ph-thread="${esc(t.from)}"${thread === t.from ? ' aria-current="true"' : ''}>` +
    `<span class="av">${esc(initials(t.from))}</span>` +
    `<span class="nm"><span class="one">${esc(t.from)}</span><span class="mut one">${dualHtml(bodyOf(last))}</span></span>` +
    `${t.unread ? `<span class="v g" aria-label="${t.unread} ongelezen">${t.unread}</span>` : `<span class="t">${esc(last.at || '')}</span>`}</button>`;
}

function callHtml() {
  const c = call;
  const name = c.contact.name;
  const acts = c.phase === 'talk' ? c.actions.map((a, i) => `<button type="button" class="${a.hangup ? 'm-bt danger' : a.primary ? 'm-bp' : 'm-bg'}" data-ph-act="${i}">${esc(a.label)}</button>`).join('') : '';
  return `<div class="ph-head"><span class="av lg">${esc(initials(name))}</span><div class="pm-pane-top"><span class="m-eb">${c.phase === 'ringing' ? 'Bellen…' : 'Verbonden'}</span><h2 class="m-h2 td-h2">${esc(name)}</h2></div></div>` +
    (c.phase === 'talk' && c.line ? `<p class="ph-bubble">${speakerHtml(c.contact.speaker || name)}${dualHtml(c.line)}</p>` : '') +
    '<span class="m-grow"></span>' + (acts ? `<div class="m-acts ph-acts">${acts}</div>` : '');
}

function threadHtml(from) {
  const t = phoneThreads().find((x) => x.from === from);
  if (!t) return '<p class="mut">Kies een gesprek.</p>';
  return `<div class="ph-head"><span class="av lg">${esc(initials(t.from))}</span><div class="pm-pane-top"><span class="m-eb">${t.from === 'Kiekdoar' ? 'Nieuws' : 'Berichten'}</span><h2 class="m-h2 td-h2">${esc(t.from)}</h2></div></div>` +
    `<div class="ph-thread">${[...t.items].reverse().map((e) => `<div class="ph-msg"><span class="mut">${esc(e.at || '')}</span><p>${dualHtml(bodyOf(e))}</p></div>`).join('')}</div>`;
}

function renderDetail(focusActs = false) {
  const panel = panelRef;
  if (!panel || !panel.isConnected) return;
  const aside = panel.querySelector('.td-detail');
  const sub = panel.dataset.phSub;
  if (sub === 'personage') aside.innerHTML = call ? callHtml() : note ? `<p class="mut">${esc(note)}</p>` : '';
  else if (sub === 'berichten') aside.innerHTML = thread ? threadHtml(thread) : '<p class="mut">Kies een gesprek om het te lezen.</p>';
  else if (call) aside.innerHTML = callHtml();
  else aside.innerHTML = `<p class="mut">${note ? esc(note) : 'Kies iemand om te bellen.'}</p>`;
  for (const b of panel.querySelectorAll('[data-ph-contact]')) {
    const on = !!call && Number(b.dataset.phContact) === callIdx;
    b.toggleAttribute('aria-current', on);
  }
  if (focusActs && call && call.phase === 'talk') {
    const active = document.activeElement;
    const keep = active && panel.contains(active) && !active.closest('.td-detail') && !active.dataset.phContact;
    const first = aside.querySelector('[data-ph-act]');
    if (first && !keep) first.focus({ preventScroll: true });
  }
}

// --- Verhaal > Personages (#430): de berichten, sms's, app-teksten en gesprekken staan bij het personage zelf; wat van niemand
// is (nieuws, meldingen, een contact dat geen personage is) staat onder Overig. De telefoon is geen eigen onderdeel meer.
export const OVERIG = '__overig';
const lc = (x) => String(x || '').toLowerCase();
// het personage (dat je kent) bij een afzender of contactnaam, of null
function characterOf(name) {
  const n = lc(name);
  const c = CHARACTERS.find((ch) => lc(ch.name) === n || ch.speakers.some((sp) => lc(sp) === n) || lc(ch.name).split(' ')[0] === n);
  return c && hasMet(c.id) ? c.id : null;
}
export const characterForSender = (name) => characterOf(name) || OVERIG;
export function phoneUnreadFor(w, id) {
  return ((w && w.phoneHistory) || []).filter((e) => !e.read && characterForSender(senderOf(e)) === id).length;
}
function markReadFor(id) {
  for (const e of (world && world.phoneHistory) || []) if (characterForSender(senderOf(e)) === id) e.read = true;
}
function messagesHtml(id) {
  const items = ((world && world.phoneHistory) || []).filter((e) => characterForSender(senderOf(e)) === id);
  if (!items.length) return '<p class="m-note">Nog geen berichten.</p>';
  let last = null;
  return '<div class="ph-thread">' + items.map((e) => {
    const from = senderOf(e);
    const kop = id === OVERIG && from !== last ? `<h4 class="m-eb">${esc(from === 'Kiekdoar' ? 'Nieuws (Kiekdoar)' : from)}</h4>` : '';
    last = from;
    return `${kop}<div class="ph-msg"><span class="mut">${esc(e.at || '')}</span><p>${dualHtml(bodyOf(e))}</p></div>`;
  }).join('') + '</div>';
}
// Het blok onder een personage: bellen (als het een contact is), het gesprek, en de berichten, nieuwste eerst.
export function renderCharacterPhone(block, w, id) {
  if (!block) return;
  world = w;
  panelRef = block;
  block.dataset.phSub = 'personage';
  block.dataset.phChar = id;
  markReadFor(id);
  const bel = contacts(w).map((c, i) => ({ c, i })).filter(({ c }) => characterForSender(c.speaker || c.name) === id)
    .map(({ c, i }) => `<button type="button" class="m-bg ph-bel" data-ph-contact="${i}"${callIdx === i && call ? ' aria-current="true"' : ''}>Bel ${esc(c.name)}</button>`).join('');
  block.innerHTML = `<h3 class="m-eb">${id === OVERIG ? 'Berichten en contacten' : 'Berichten'}</h3>${bel ? `<div class="m-acts ph-acts">${bel}</div>` : ''}<div class="td-detail ph-detail" aria-live="polite"></div>${messagesHtml(id)}`;
  renderDetail();
}

// Draws the section's list for `sub` ('contacten' | 'berichten').
export function renderPhonePanel(panel, w, sub) {
  world = w;
  panelRef = panel;
  panel.dataset.phSub = sub;
  const list = panel.querySelector(`[data-of="telefoon"][data-sub="${sub}"]`);
  if (sub === 'berichten') {
    if (thread) markRead(thread);
    const ts = phoneThreads(w);
    if (thread && !ts.some((t) => t.from === thread)) thread = null;
    list.innerHTML = ts.length
      ? `<div class="m-gh"><span>Berichten</span><span>nieuwste eerst</span></div>${ts.map(threadCard).join('')}`
      : '<p class="m-note">Nog geen berichten. Grunn is rustig… nog wel.</p>';
  } else {
    list.innerHTML = `<div class="m-gh"><span>Contacten</span><span>bel voor een rit, een klus of een praatje</span></div>${contacts(w).map(contactCard).join('')}`;
  }
  for (const el of panel.querySelectorAll('[data-of="telefoon"][data-sub]')) if (el.dataset.sub !== sub) el.innerHTML = '';
  renderDetail();
}

// Clicks in the section; a: { rerender(keep) }.
export function phoneClick(e, w, panel, a) {
  world = w;
  api = a;
  const t = e.target;
  const ct = t.closest('[data-ph-contact]');
  if (ct) {
    const i = Number(ct.dataset.phContact);
    const c = contacts(w)[i];
    if (!c) return true;
    if (call && callIdx === i) { renderDetail(true); return true; }
    hangUp();
    note = '';
    callIdx = i;
    call = { contact: c, phase: 'ringing', t: 0, line: '', actions: [] };
    renderDetail();
    for (const b of panel.querySelectorAll('[data-ph-contact]')) b.toggleAttribute('aria-current', b === ct);
    return true;
  }
  const act = t.closest('[data-ph-act]');
  if (act) {
    const x = call && call.actions[Number(act.dataset.phAct)];
    if (x) x.run();
    if (!call && isPauseMenuOpen()) { const b = panel.querySelector(`[data-ph-contact="${callIdx}"]`); if (b) b.focus({ preventScroll: true }); }
    return true;
  }
  const th = t.closest('[data-ph-thread]');
  if (th) {
    thread = th.dataset.phThread;
    markRead(thread);
    a.rerender(th);
    return true;
  }
  return false;
}

// Esc on a call or text card (pausemenu.js), or the trailer: the thread of `from`.
export function selectPhoneThread(from) {
  thread = from || null;
}

// The Steam trailer (trailer.js) showed the phone over a gameplay shot: now
// the unfolded phone on Te doen's nearby list (null closes it again).
export function trailerPhone(app) {
  if (!app) { closePauseMenu(); return; }
  openPauseMenu(app === 'berichten' ? 'telefoon' : 'todo', app === 'berichten' ? { sub: 'berichten' } : { view: 'dichtbij' });
}

export function initPhone(w) {
  world = w;
  initCinematics(w);
  initGarageStyles();
}

function refreshPause() {
  if (!world) return;
  // een filmpje dat iedereen ziet pauzeert voor iedereen (uiHard); de dialogen en andere schermen alleen voor jou (#452, coopgroep.js)
  const hard = cinematicPausesGameplay();
  world.uiHard = hard;
  zachtePauze(world, 'afspeelvooruit', isPlayAheadOpen());
  zachtePauze(world, 'hulpaanbod', isHelpOfferOpen());
  world.uiPaused = hard || isPlayAheadOpen() || isHelpOfferOpen();
}

let phoneWasOpen = false;
export function updatePhone(dt, w) {
  world = w;
  const open = isPhoneOpen();
  if (open && !phoneWasOpen) checkPhoneWhileMoving(w);
  phoneWasOpen = open;
  updateCinematics(dt, w);
  refreshPause();
  if (call && !isPauseMenuOpen()) hangUp();
  if (call && call.phase === 'ringing') {
    call.t += dt;
    if (call.t >= RING_TIME) talk(call);
  }
}
