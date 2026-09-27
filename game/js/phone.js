import { dualHtml } from './subtitles.js';
import { initCinematics, updateCinematics, cinematicPausesGameplay, isCinematicActive } from './cinematics.js';
import { getMissionList, getNextMission, trackMission } from './missions.js';
import { openPauseMenu, isPauseMenuOpen } from './pausemenu.js';
import { saveGame } from './savegame.js';
import { setUserWaypoint } from './routing.js';
import { storyFlag } from './story.js';
import { getHeroCar, getClockText } from './hud_panel.js';
import { getGarageList, deliverOwnedVehicle, locateOwnedVehicle, whereText } from './ownedvehicles.js';
import { initGarageStyles } from './garageui.js';
import { getSideJobOffers, quitSideJob } from './sidejobs.js';

const RING_TIME = 0.9;
const GARAGE_PRICE = 100;

const ICONS = {
  contacten: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8c0-3.3 3.1-6 7-6s7 2.7 7 6v1H5z"/>',
  missies: '<path d="M6 3h2v18H6zM8 4h11l-2.5 4L19 12H8z"/>',
  sikkom: '<path d="M12 3a6 6 0 0 0-6 6v4l-2 3v1h16v-1l-2-3V9a6 6 0 0 0-6-6zm-2 16a2 2 0 0 0 4 0z"/>',
  kaart: '<path d="M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2zm6 0v12l6 2V7z"/>',
  instellingen: '<path d="M4 6h9v2H4zm13 0h3v2h-3zM4 16h3v2H4zm7 0h9v2h-9zM13 4h4v6h-4zM7 14h4v6H7zM4 11h5v2H4zm9 0h7v2h-7zM9 9h4v6H9z"/>',
  opslaan: '<path d="M4 3h13l4 4v14H3V3h1zm2 2v5h10V5H6zm1 9v5h10v-5H7zm7-8h2v3h-2V6z"/>',
  ubbo: '<path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zM9 6h2v4a1 1 0 0 0 2 0V6h2v4a3 3 0 0 1-6 0z"/>',
  voertuigen: '<path d="M5 11l1.6-4.3A2 2 0 0 1 8.5 5.4h7a2 2 0 0 1 1.9 1.3L19 11h1a1 1 0 0 1 1 1v5h-2v1.5a1.5 1.5 0 0 1-3 0V17H8v1.5a1.5 1.5 0 0 1-3 0V17H3v-5a1 1 0 0 1 1-1zm2.2 0h9.6l-1.1-3.2a.6.6 0 0 0-.6-.4H8.9a.6.6 0 0 0-.6.4zM6.5 12.6a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zm11 0a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6z"/>',
};
const APPS = [
  { id: 'contacten', label: 'Contacten' },
  { id: 'missies', label: 'Missies' },
  { id: 'sikkom', label: 'Sikkom' },
  { id: 'kaart', label: 'Kaart' },
  { id: 'voertuigen', label: 'Voertuigen' },
  { id: 'ubbo', label: 'Ubbo' },
  { id: 'instellingen', label: 'Instellingen' },
  { id: 'opslaan', label: 'Opslaan' },
];
const COLS = 3;

let world = null;
let root = null;
let screenEl = null;
let clockEl = null;
let open = false;
let st = { screen: 'home', sel: 0, flash: '', call: null };
let clockText = '';

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const icon = (id) => `<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor">${ICONS[id]}</g></svg>`;

export function isPhoneOpen() {
  return open;
}

function buddyName(w) {
  return w.companion && w.companion.character === 'anita' ? 'Anita' : w.companion ? 'Tammo' : w.player.character === 'tammo' ? 'Anita' : 'Tammo';
}

function contacts(w) {
  return [
    { id: 'buddy', name: buddyName(w), sub: 'Maat', talk: buddyTalk },
    { id: 'berend', name: 'Bommen Berend', sub: 'Opdrachtgever', talk: berendTalk },
    { id: 'garage', name: 'Garage Knalpot', sub: 'Henk, auto’s & excuses', talk: garageTalk },
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
    actions: c ? [{ label: 'Waar ben je?', run: () => { setUserWaypoint(c.x, c.y, buddyName(w)); flashAndClose(`${buddyName(w)} staat op je kaart`); } }] : [],
  };
}

function berendTalk(w, call) {
  const next = getNextMission();
  if (!next) return { line: 'Ik heb even niks voor je. Bel later maar terug.' };
  if (next.active) return { line: 'Je bent al bezig, man. Eerst dat afmaken, dan praten we verder.' };
  const list = getMissionList();
  const idx = call.offer != null ? call.offer : next.index;
  const m = list[idx];
  const done = m.status === 'geklaard' ? ' Die heb je al eens gedaan, maar geld is geld.' : '';
  const needs = m.needs ? ` Maar eerst: ${m.needs}` : '';
  return {
    line: `Moi. Ik heb een klusje: "${m.label}". €${m.reward}, contant.${done}${needs}`,
    actions: [
      { label: 'Klus aannemen', run: () => { trackMission(w, idx); flashAndClose(`Route naar ${m.label}`); } },
      { label: 'Iets anders?', run: () => { call.offer = (idx + 1) % list.length; talk(call); } },
    ],
  };
}

function garageTalk(w) {
  const hero = getHeroCar(w);
  if (hero && w.player.inVehicle === hero) return { line: 'Je zit er nu in, slimmerik. Hoor ik ’m nou rammelen?' };
  if (hero) {
    return {
      line: 'Je Escapade staat nog netjes waar je ’m liet. Zal ik ’m op je kaart zetten?',
      actions: [{ label: 'Op kaart zetten', run: () => { setUserWaypoint(hero.x, hero.y, 'Jouw auto'); flashAndClose('Je auto staat op de kaart'); } }],
    };
  }
  return {
    line: `Total loss? Wéér? Voor €${GARAGE_PRICE} zet ik een nieuwe bij je neer.`,
    actions: [{
      label: `Bezorgen (€${GARAGE_PRICE})`,
      run: () => {
        if (w.money < GARAGE_PRICE) { st.call.line = 'Geen geld, geen Escapade. Zo werkt dat hier.'; st.call.actions = []; render(); return; }
        const res = deliverOwnedVehicle(w, 'hero');
        if (!res.ok) { st.call.line = res.text; st.call.actions = []; render(); return; }
        setOpen(false);
      },
    }],
  };
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
      actions: o ? [{ label: `${o.name} op kaart`, run: () => { setUserWaypoint(o.x, o.y, o.where); flashAndClose(`${o.name} staat op je kaart`); } }] : [],
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
      'Ik zag je op Sikkom. Ik zeg niks. Je vader zag het ook.',
      'Kom je zondag eten? Er is hutspot. En neem die Anita ook mee.',
    ]),
  };
}

function flashAndClose(msg) {
  if (world) world.addMessage(msg, 3);
  setOpen(false);
}

export function initPhone(w) {
  world = w;
  initCinematics(w);
  initGarageStyles();
  if (root) return;
  root = document.createElement('div');
  root.className = 'phone';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', 'Telefoon');
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML =
    '<div class="phone-frame">' +
    '<div class="phone-status"><span class="ph-clock"></span><span class="ph-carrier">Grunn Mobiel</span><span class="ph-batt" aria-hidden="true"></span></div>' +
    '<div class="phone-screen"></div>' +
    '<div class="phone-hints"><span class="hud-key">↑↓←→</span>kiezen <span class="hud-key">ENTER</span>ok <span class="hud-key">⌫</span>terug <span class="hud-key">T</span>weg</div>' +
    '</div>';
  (document.getElementById('hud') || document.body).appendChild(root);
  screenEl = root.querySelector('.phone-screen');
  clockEl = root.querySelector('.ph-clock');

  for (const type of ['mousedown', 'mouseup', 'wheel']) root.addEventListener(type, (e) => e.stopPropagation());
  root.addEventListener('click', (e) => {
    const item = e.target.closest('[data-idx]');
    if (item) { st.sel = Number(item.dataset.idx); activate(); return; }
    if (e.target.closest('[data-back]')) back();
  });

  window.addEventListener('keydown', onKey, true);
}

function canOpen() {
  return document.body.classList.contains('game-started') && !isPauseMenuOpen() && !isCinematicActive()
    && !(world && (world.pendingRespawn || world.pigeonMode)) && !(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName));
}

function onKey(e) {
  const k = e.key;
  if (!open) {
    if ((k === 't' || k === 'T') && !e.repeat && !e.metaKey && !e.ctrlKey && canOpen()) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(true);
    }
    return;
  }
  if (e.metaKey || e.ctrlKey) return;
  e.stopPropagation();
  if (k.length === 1 || k.startsWith('Arrow') || ['Enter', 'Backspace', 'Escape', 'Tab'].includes(k)) e.preventDefault();
  if (e.repeat && !k.startsWith('Arrow')) return;
  if (k === 'Escape' || k === 't' || k === 'T') setOpen(false);
  else if (k === 'Backspace') back();
  else if (k === 'Enter' || k === ' ') activate();
  else if (k.startsWith('Arrow')) move(k);
}

function setOpen(v) {
  if (!root || open === v) return;
  open = v;
  if (world) world.input.reset();
  root.classList.toggle('open', open);
  root.setAttribute('aria-hidden', String(!open));
  if (open) {
    st = { screen: 'home', sel: 0, flash: '', call: null };
    render();
  }
  refreshPause();
}

function refreshPause() {
  if (world) world.uiPaused = open || cinematicPausesGameplay();
}

function itemCount() {
  if (st.screen === 'home') return APPS.length;
  if (st.screen === 'contacten') return contacts(world).length;
  if (st.screen === 'missies') return getMissionList().length;
  if (st.screen === 'call') return st.call && st.call.phase === 'talk' ? st.call.actions.length : 0;
  if (st.screen === 'voertuigen') return getGarageList(world).length;
  if (st.screen === 'voertuig') return vehicleActions().length;
  if (st.screen === 'ubbo') return ubboRows().length;
  return 0;
}

function move(k) {
  const n = itemCount();
  if (!n) return;
  let s = st.sel;
  if (st.screen === 'home') {
    if (k === 'ArrowLeft') s -= 1;
    else if (k === 'ArrowRight') s += 1;
    else if (k === 'ArrowUp') s -= COLS;
    else s += COLS;
  } else {
    if (k === 'ArrowLeft' || k === 'ArrowRight') return;
    s += k === 'ArrowUp' ? -1 : 1;
  }
  st.sel = (s + n) % n;
  render();
  const el = screenEl.querySelector('.sel');
  if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
}

function back() {
  if (st.screen === 'home') setOpen(false);
  else if (st.screen === 'voertuig') { st.screen = 'voertuigen'; st.sel = Math.max(0, st.vehIdx || 0); st.vehMsg = ''; render(); }
  else goHome(APPS.findIndex((a) => a.id === (st.screen === 'call' ? 'contacten' : st.screen)));
}

function goHome(sel = 0) {
  if (st.screen === 'call') { st.screen = 'contacten'; st.sel = Math.max(0, st.callIdx || 0); st.call = null; render(); return; }
  st.screen = 'home';
  st.sel = Math.max(0, sel);
  render();
}

function openApp(id) {
  const w = world;
  if (id === 'kaart') { setOpen(false); openPauseMenu('map'); return; }
  if (id === 'instellingen') { setOpen(false); openPauseMenu('settings'); return; }
  if (id === 'opslaan') {
    st.flash = saveGame(w) ? 'Opgeslagen' : 'Opslaan mislukt';
    st.flashT = 2;
    render();
    return;
  }
  st.screen = id;
  st.sel = 0;
  if (id === 'missies') {
    const i = getMissionList().findIndex((m) => m.status === 'actief' || m.status === 'volgende');
    st.sel = Math.max(0, i);
  }
  render();
}

function activate() {
  const w = world;
  if (st.screen === 'home') return openApp(APPS[st.sel].id);
  if (st.screen === 'contacten') {
    const c = contacts(w)[st.sel];
    st.callIdx = st.sel;
    st.screen = 'call';
    st.sel = 0;
    st.call = { contact: c, phase: 'ringing', t: 0, line: '', actions: [] };
    render();
    return;
  }
  if (st.screen === 'missies') {
    const m = getMissionList()[st.sel];
    if (!m) return;
    if (m.status === 'actief') { flashAndClose('Deze missie loopt al'); return; }
    if (getMissionList().some((x) => x.status === 'actief')) { flashAndClose('Maak eerst je huidige missie af'); return; }
    trackMission(w, m.index);
    flashAndClose(m.needs ? 'Eerst naar de winkel: staat op je kaart' : `Route naar ${m.label}`);
    return;
  }
  if (st.screen === 'call' && st.call && st.call.phase === 'talk') {
    const a = st.call.actions[st.sel];
    if (a) a.run();
  }
  if (st.screen === 'voertuigen') {
    const e = getGarageList(w)[st.sel];
    if (!e) return;
    st.vehIdx = st.sel;
    st.vehId = e.id;
    st.vehMsg = '';
    st.screen = 'voertuig';
    st.sel = 0;
    render();
    return;
  }
  if (st.screen === 'voertuig') {
    const a = vehicleActions()[st.sel];
    if (a) a.run();
  }
  if (st.screen === 'ubbo') {
    const r = ubboRows()[st.sel];
    if (r) r.run();
  }
}

// Ubbo: klusjes op afroep, the side jobs as a gig-economy app.
const fmtDist = (m) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`);

function ubboRows() {
  const rows = [];
  const offers = getSideJobOffers(world);
  const active = offers.find((o) => o.active);
  if (active) rows.push({ quit: true, name: 'Dienst stoppen', sub: `Nu bezig: ${active.name}`, run: () => { quitSideJob(); flashAndClose('Dienst gestopt. Ubbo geeft je een sterretje minder'); } });
  const pg = world.postgameActions;
  if (pg && world.postgame) {
    for (const o of pg.offers()) {
      rows.push({ name: o.name, sub: `${o.blurb} · ${fmtDist(o.dist)}${o.medal ? ` · ${o.medal.toLowerCase()}` : ''}`, run: () => { setUserWaypoint(o.x, o.y, o.where); flashAndClose(`Route naar ${o.where}`); } });
    }
    for (const u of pg.upgrades()) {
      rows.push({ name: `Fjord Frituur: ${u.name}`, sub: u.owned ? `${u.blurb} · gekocht` : `${u.blurb} · €${u.price}`, run: () => flashAndClose(u.buy()) });
    }
  }
  for (const o of offers) {
    rows.push({
      ...o, sub: `${o.blurb} · ${fmtDist(o.dist)}`,
      run: () => {
        if (o.active) { flashAndClose('Daar ben je al mee bezig'); return; }
        setUserWaypoint(o.x, o.y, `Ubbo: ${o.name}`);
        flashAndClose(o.blocked ? `Route naar ${o.name}. Let op: ${o.blocked.toLowerCase()}` : `Route naar ${o.name}: loop erheen en druk E`);
      },
    });
  }
  return rows;
}

function currentVehicle() {
  return getGarageList(world).find((e) => e.id === st.vehId) || null;
}

function vehicleActions() {
  const e = currentVehicle();
  if (!e) return [];
  const out = [];
  if (e.status !== 'driving') {
    out.push({ label: `Laten afleveren (${e.feeLabel})`, run: () => {
      const res = deliverOwnedVehicle(world, e.id);
      if (res.ok) setOpen(false);
      else { st.vehMsg = res.text; render(); }
    } });
  }
  if (e.status === 'near' || e.status === 'far') {
    out.push({ label: 'Waar staat hij?', run: () => {
      const res = locateOwnedVehicle(world, e.id);
      if (res.ok) flashAndClose(res.text + '. Staat op je kaart');
      else { st.vehMsg = res.text; render(); }
    } });
  }
  return out;
}

function talk(call) {
  const res = call.contact.talk(world, call) || {};
  call.phase = 'talk';
  call.line = res.line || '';
  call.actions = [...(res.actions || []), { label: 'Ophangen', run: () => goHome() }];
  st.sel = 0;
  render();
}

const STATUS_LABEL = { actief: 'Actief', volgende: 'Volgende', geklaard: 'Geklaard', open: 'Open' };

function render() {
  if (!screenEl) return;
  const w = world;
  let html = '';
  if (st.screen === 'home') {
    html = `<div class="ph-home"><div class="ph-bigclock">${esc(clockText)}</div><div class="ph-date">Grunn</div>` +
      `<div class="ph-grid">${APPS.map((a, i) => `<button type="button" class="ph-app${i === st.sel ? ' sel' : ''}" data-idx="${i}">` +
        `<span class="ph-icon">${icon(a.id)}</span><span>${a.label}</span></button>`).join('')}</div>` +
      `<div class="ph-flash">${esc(st.flash || '')}</div></div>`;
  } else if (st.screen === 'call') {
    const c = st.call;
    const initials = c.contact.name.split(' ').map((s) => s[0]).slice(0, 2).join('');
    html = header(c.contact.name) + `<div class="ph-call"><div class="ph-avatar">${esc(initials)}</div>` +
      `<div class="ph-callname">${esc(c.contact.name)}</div>` +
      `<div class="ph-callstate">${c.phase === 'ringing' ? 'Bellen…' : 'Verbonden'}</div>` +
      (c.phase === 'talk' ? `<div class="ph-bubble">${dualHtml(c.line)}</div>` : '') +
      `<div class="ph-actions">${c.phase === 'talk' ? c.actions.map((a, i) => `<button type="button" class="ph-row ph-action${i === st.sel ? ' sel' : ''}${a.label === 'Ophangen' ? ' hangup' : ''}" data-idx="${i}">${esc(a.label)}</button>`).join('') : ''}</div></div>`;
  } else if (st.screen === 'contacten') {
    html = header('Contacten') + `<div class="ph-list">${contacts(w).map((c, i) =>
      `<button type="button" class="ph-row${i === st.sel ? ' sel' : ''}" data-idx="${i}"><span class="ph-avatar sm">${esc(c.name[0])}</span>` +
      `<span class="ph-rowtext"><b>${esc(c.name)}</b><small>${dualHtml(c.sub)}</small></span></button>`).join('')}</div>`;
  } else if (st.screen === 'missies') {
    html = header('Missies') + `<div class="ph-list">${getMissionList().map((m, i) =>
      `<button type="button" class="ph-row${i === st.sel ? ' sel' : ''}" data-idx="${i}"><span class="ph-rowtext"><b>${m.code ? esc(m.code) + ' · ' : ''}${esc(m.label)}</b>` +
      `<small>€${m.reward}</small></span><span class="ph-chip" data-status="${m.status}">${STATUS_LABEL[m.status]}</span></button>`).join('')}</div>` +
      '<div class="ph-foot">Enter: route erheen</div>';
  } else if (st.screen === 'voertuigen') {
    html = header('Mijn voertuigen') + `<div class="ph-list">${getGarageList(w).map((e, i) =>
      `<button type="button" class="ph-row${i === st.sel ? ' sel' : ''}" data-idx="${i}"><span class="ph-swatch" style="background:${esc(e.color)}"></span>` +
      `<span class="ph-rowtext"><b>${esc(e.label)}</b><small>${esc(whereText(e) || e.kindLabel)}</small></span>` +
      `<span class="ph-chip" data-status="${e.status === 'lost' ? 'lost' : e.status === 'near' || e.status === 'driving' ? 'geklaard' : 'open'}">${esc(e.statusLabel)}</span></button>`).join('')}</div>` +
      '<div class="ph-foot">Koop er meer bij Ome Harm of Trap & Toeter</div>';
  } else if (st.screen === 'voertuig') {
    const e = currentVehicle();
    if (!e) { st.screen = 'voertuigen'; render(); return; }
    const facts = [e.kindLabel, `${e.topSpeed} km/u`, e.paint, ...(e.upgrades.length ? e.upgrades : [])].join(' · ');
    html = header(e.hero ? 'Escapade' : e.model) + `<div class="ph-list"><div class="ph-veh">` +
      `<div class="ph-veh-top"><span class="ph-swatch lg" style="background:${esc(e.color)}"></span><span class="ph-rowtext"><b>${esc(e.label)}</b><small>${esc(e.statusLabel)}${whereText(e) ? ' · ' + esc(whereText(e)) : ''}</small></span></div>` +
      `<p class="ph-veh-meme">${esc(e.meme)}</p><p class="ph-veh-facts">${esc(facts)}</p>` +
      (st.vehMsg ? `<p class="ph-veh-msg">${esc(st.vehMsg)}</p>` : '') + '</div>' +
      vehicleActions().map((a, i) => `<button type="button" class="ph-row ph-action${i === st.sel ? ' sel' : ''}" data-idx="${i}">${esc(a.label)}</button>`).join('') +
      '</div><div class="ph-foot">Afgeleverd buiten beeld, om de hoek</div>';
  } else if (st.screen === 'ubbo') {
    html = header('Ubbo') + '<div class="ph-foot">Klusjes op afroep. Ubbo Emmius zou trots zijn.</div>' +
      `<div class="ph-list">${ubboRows().map((r, i) =>
        `<button type="button" class="ph-row${i === st.sel ? ' sel' : ''}${r.quit ? ' hangup' : ''}" data-idx="${i}">` +
        `<span class="ph-rowtext"><b>${esc(r.name)}</b><small>${esc(r.sub)}${r.level ? ` · niv. ${r.level}` : ''}</small></span>` +
        (r.pay ? `<span class="ph-chip" data-status="${r.active ? 'actief' : r.blocked ? 'open' : 'geklaard'}">€${r.pay[0]}-${r.pay[1]}</span>` : '') +
        '</button>').join('')}</div>` +
      '<div class="ph-foot">Enter: route erheen · verdiensten per rit, geschat</div>';
  } else if (st.screen === 'sikkom') {
    const items = w.phoneHistory || [];
    html = header('Sikkom') + `<div class="ph-list ph-feed">${items.length ? items.map((n) =>
      `<div class="ph-news"><small>${esc(n.at || '')}</small><p>${dualHtml(n.text)}</p></div>`).join('')
      : '<p class="ph-empty">Nog geen nieuws. Grunn is rustig… nog wel.</p>'}</div>`;
  }
  screenEl.innerHTML = html;
}

function header(title) {
  return `<div class="ph-head"><button type="button" class="ph-back" data-back aria-label="Terug">‹</button><span>${esc(title)}</span></div>`;
}

export function updatePhone(dt, w) {
  world = w;
  updateCinematics(dt, w);
  if (open && (!document.body.classList.contains('game-started') || isPauseMenuOpen() || w.pendingRespawn)) setOpen(false);
  refreshPause();
  const text = getClockText(w) || new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  if (text !== clockText) {
    clockText = text;
    if (clockEl) clockEl.textContent = text;
    if (open && st.screen === 'home') render();
  }
  if (!open) return;
  if (st.flashT > 0 && (st.flashT -= dt) <= 0) { st.flash = ''; if (st.screen === 'home') render(); }
  const c = st.call;
  if (st.screen === 'call' && c && c.phase === 'ringing') {
    c.t += dt;
    if (c.t >= RING_TIME) talk(c);
  }
}
