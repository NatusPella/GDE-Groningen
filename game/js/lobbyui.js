// Samen spelen (#95): het uitnodigscherm voor N spelers, getekend in de menustijl. De
// logica en teksten staan in lobby.js (getest); de routes in net/rtcroom.js, net/brokers.js
// en de IPC-brug (net/ipctransport.js, desktop/coopcore.cjs); de spelers in net/hub.js.
// Dit bestand is DOM en lijm; het is niet in beeld bekeken. Het wordt ook gebruikt voor het
// wacht-scherm tijdens het spel (opts.start = 'verbroken'). Alleen bereikbaar via ?coop.
//
// Wie het spel opende houdt de uitnodiging open zolang er plek is: na elke gast die verbindt,
// wordt er een nieuw aanbod klaargezet onder dezelfde kamercode (of luistert de TCP-poort verder).
// Een gast die via de openbare lijst binnenkomt, krijgt een eigen eenmalige kamer (net/joingate.js, #583):
// de lijst draagt geen kamercode meer, zodat niemand met alleen de lijst het aanbod kan ontsleutelen.
//
// hooks: { startHost(route, onChange) -> hub, addGuest(transport), startClient(transport, route, wens, { wachtwoord }) -> session,
//          setMax(n), kick(slot), overdragen(slot) -> { ok } | { ok: false, tekst } (#439), joined(rol), disconnect(act, rol, slot), onCode(code), canJoin() -> {ok, reason}, laatsteCode, resumed() }
// Het wachtwoord van een sessie (#450) hoort bij de hub: de gastheer zet het hier, een gast geeft het mee aan de kennismaking.
// opts:  { start: 'verbroken', rol, route, session (gast), hub (host), holdSlot, holdNaam }  (hervatten in het spel)
//        { adopt: { code, route }, rol, session | hub }  (de sessie loopt al: na het overdragen van het spel kent het paneel rol, kamercode en spelers)
import { createLobby, reduce, view, profielNaam, ROLES, ROUTES, PROFIEL_KLEUREN } from './lobby.js';
import { consentOnthoudenHtml } from './onlineconsentui.js';
import { getSettings, setSetting } from './settings.js';
import { ipcTransport, listenForGuests, onlineSupported } from './net/ipctransport.js';
import { hostRoom, joinRoom, rtcSupported } from './net/rtcroom.js';
import { MultiSignaler, LijstSignaler } from './net/brokers.js';
import * as CONFIG from './net/netconfig.js';
import { makeRoom, formatRoom, topicFor } from './net/sigcrypto.js';
import { LIJST, Serverlijst, maakAankondiger } from './net/serverlijst.js';
import { JOIN, bedienKamer, vraagKamer } from './net/joingate.js';
import { PROTO } from './net/protocol.js';
import { lijst as rosterLijst, charInfo } from './coopplayers.js';
import { meet, beoordeel, foutrapport, verbindingslog } from './net/diagnose.js';
import { maakEnv } from './net/diagnoseenv.js';
import { VERSION } from './version.js';

const newLijstSignaler = (interval = LIJST.interval) => new LijstSignaler(CONFIG, { socket: (url) => { const ws = new WebSocket(url); ws.binaryType = 'arraybuffer'; return ws; } }, { brokerTimeout: CONFIG.TIMEOUTS.broker, interval });
// Gemelde sessies (#438) blijven op dit apparaat verborgen: alleen id's, hoogstens 50, en nooit stuk als de opslag ontbreekt
const VERBORGEN_SLEUTEL = 'gde-serverlijst-verborgen';
const leesVerborgen = () => { try { const a = JSON.parse(localStorage.getItem(VERBORGEN_SLEUTEL) || '[]'); return Array.isArray(a) ? a.filter((x) => typeof x === 'string').slice(-50) : []; } catch (e) { return []; } };
const schrijfVerborgen = (ids) => { try { localStorage.setItem(VERBORGEN_SLEUTEL, JSON.stringify(ids.slice(-50))); } catch (e) { /* geen opslag: dan alleen in dit scherm */ } };
// Favorieten (#464): lokaal, per speler, alleen de id's van sessies die je zelf een ster gaf. Geen naam, geen IP-adres,
// hoogstens 100; een id dat niet op een aankondiging lijkt wordt bij het lezen weggegooid. De sleutel staat in storagekeys.js.
const FAVORIETEN_SLEUTEL = 'gde-serverlijst-favorieten';
const ID_RE = /^[a-z0-9]{8,16}$/;
const leesFavorieten = () => { try { const a = JSON.parse(localStorage.getItem(FAVORIETEN_SLEUTEL) || '[]'); return Array.isArray(a) ? a.filter((x) => typeof x === 'string' && ID_RE.test(x)).slice(-100) : []; } catch (e) { return []; } };
const schrijfFavorieten = (ids) => { try { localStorage.setItem(FAVORIETEN_SLEUTEL, JSON.stringify(ids.filter((x) => typeof x === 'string' && ID_RE.test(x)).slice(-100))); } catch (e) { /* geen opslag: dan alleen in dit scherm */ } };

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// #634: de identiteitskleur als CSS-klasse (de tabel staat in coopidentiteit.js) in plaats van een inline style
const kleurKlasse = (hex) => {
  const i = PROFIEL_KLEUREN.findIndex((c) => c.hex === String(hex || '').toLowerCase());
  return `coop-kleur-${i >= 0 ? i : 0}`;
};

const newSignaler = () => new MultiSignaler(CONFIG, { socket: (url) => { const ws = new WebSocket(url); ws.binaryType = 'arraybuffer'; return ws; } },
  { fallbackAfter: CONFIG.TIMEOUTS.fallbackAfter, brokerTimeout: CONFIG.TIMEOUTS.broker });

export function mountLobby(root, hooks, opts = {}) {
  const direct = onlineSupported();
  const api = direct ? window.gdeDesktop.coop : null;
  const prof = getSettings(); // online-avatar (#455): per apparaat bewaard
  let state = createLobby({ direct, rtc: rtcSupported(), laatsteCode: hooks.laatsteCode, versie: VERSION, lijst: !!opts.lijst, opslaan: !!(typeof window !== 'undefined' && window.gdeDesktop && window.gdeDesktop.saveTextFile), start: opts.start, rol: opts.rol, keuze: opts.keuze, holdNaam: opts.holdNaam, startGate: opts.startGate, spelNaam: opts.spelNaam, onlineNaam: prof.onlineNaam, onlineKleur: prof.onlineKleur, favorieten: leesFavorieten(), consentSaved: !!prof.multiplayerConsentRemembered, consented: !!(opts.adopt || opts.start) }); // (#526) een lopende sessie (adopt) of het wachtscherm in het spel is al eens toegestemd
  state.route = opts.route || null;
  if (opts.holdSlot != null) state = reduce(state, { t: 'hold', slot: opts.holdSlot, naam: opts.holdNaam });
  if (opts.adopt) { // de sessie loopt al (coophostwisselnet.js wisselde hem om): geen beginscherm, wel de kamercode, de spelers en Iedereen stoppen of Spel verlaten
    const host = opts.rol === ROLES.HOST, bron = host ? opts.hub : opts.session;
    const lijst = host ? (bron && bron.roster ? rosterLijst(bron.roster) : []) : (bron && bron.welcome && Array.isArray(bron.welcome.lijst) ? bron.welcome.lijst : []);
    const max = host ? (bron && bron.roster ? bron.roster.max : 0) : (bron && bron.welcome ? bron.welcome.max : 0);
    // (#450) de lopende sessie houdt zijn naam en vaste id: de hub kent ze (openbaar), de gast kreeg ze in het welkom
    const pub = host && opts.hub && opts.hub.publiek ? opts.hub.publiek() : null;
    const sessie = host ? (pub ? { id: pub.id, naam: pub.naam } : null) : (opts.session && opts.session.sessie ? opts.session.sessie : null);
    state = reduce(state, { t: 'adopteer', rol: opts.rol, route: opts.adopt.route, code: opts.adopt.code, lijst, max, slot: host ? 0 : bron && bron.slot, openbaar: pub, sessie });
  }
  // Een lopende sessie met een wachtwoord (#450): het paneel laat zien dat de deur op slot is en kan hem weer openzetten.
  if (opts.hub && opts.hub.cfg && typeof opts.hub.cfg.wachtwoord === 'string' && opts.hub.cfg.wachtwoord) {
    state = reduce(state, { t: 'wachtwoord', tekst: opts.hub.cfg.wachtwoord });
  }
  let lastDiag = null;
  let hub = opts.hub || null, session = opts.session || null, handle = null, room = null, stopListen = null, joinedOnce = !!opts.adopt, wacht = false;

  const LOGT = { kies: 'rol gekozen', route: 'route gekozen', akkoord: 'toestemming gegeven', code: 'code gemaakt', fout: 'fout', status: 'status', verbinden: 'verbinden', hervat: 'opnieuw verbinden', verbreek: 'verbroken door speler', spelers: 'spelerslijst', 'openbaar-ja': 'sessie openbaar gemaakt', privaat: 'sessie weer privé', 'lijst-go': 'lijst met openbare sessies geopend' };
  // Automatisch herstel (kamercode-route, wachtscherm in het spel): wie het spel opende zet na een paar seconden zelf een nieuw aanbod klaar onder
  // dezelfde kamercode, de gast voert die code zelf opnieuw in; beide met hetzelfde token, dus dezelfde plek. Een paar pogingen, daarna handmatig.
  let aankondiger = null, luis = null;
  let autoTimer = null, autoTries = 0;
  const AUTO = { eerste: 3000, tussen: 20000, max: 5, ...(opts.auto || {}) };
  const AUTO_EERSTE = AUTO.eerste, AUTO_TUSSEN = AUTO.tussen, AUTO_MAX = AUTO.max;
  function planAuto(ms) {
    if (autoTimer || !opts.start || state.route !== ROUTES.KAMER || autoTries >= AUTO_MAX) return;
    autoTimer = setTimeout(async () => {
      autoTimer = null;
      if (state.step === 'verbonden' || autoTries >= AUTO_MAX) return;
      autoTries++; verbindingslog.add('herstel', `automatische poging ${autoTries}`);
      try {
        if (state.rol === ROLES.HOST) {
          if (state.step === 'verbroken') await act('hervat');
          else if (state.step === 'host-maakt-code') await hostStart();
        } else {
          const code = hooks.laatsteCode || state.caps.laatsteCode;
          if (state.step === 'verbroken') set({ t: 'hervat' });
          if (state.step === 'gast-typt' && code) {
            set({ t: 'invoer', text: code });
            // (#526) een lopende sessie heeft al toestemming: meteen door, en anders blijft het scherm staan tot de speler akkoord gaat
            if (state.step === 'verbinden') await guestStart();
          }
        }
      } catch (e) { verbindingslog.add('herstel', 'poging mislukt'); }
      if (state.step !== 'verbonden') planAuto(AUTO_TUSSEN);
    }, ms);
  }
  const set = (ev) => {
    const was = state.step;
    state = reduce(state, ev);
    if (luis && state.step !== 'lijst') stopLuisteren(); // de lijst wordt alleen opgehaald zolang je hem bekijkt
    if (aankondiger && !state.openbaar) stopAankondiging(); // en een sessie staat alleen in de lijst zolang dit scherm hem openbaar houdt
    if (state.step === 'verbroken' && was !== 'verbroken') planAuto(AUTO_EERSTE);
    if (state.step === 'verbonden') autoTries = 0;
    if (LOGT[ev.t]) verbindingslog.add(LOGT[ev.t], ev.t === 'fout' ? ev.msg : ev.t === 'status' ? `${ev.status}${ev.reason ? ' (' + ev.reason + ')' : ''}` : ev.t === 'route' || ev.t === 'kies' ? String(ev.route || ev.rol) : ev.t === 'spelers' ? `${(ev.lijst || []).length} spelers` : '');
    draw();
  };
  async function diagnose() {
    set({ t: 'diag-go' });
    verbindingslog.add('diagnose', 'gestart');
    let beoordeling = null;
    try { const ms = opts.diagMs || 6000;
      beoordeling = beoordeel(await meet(maakEnv({ api, ms }), { limiet: ms * 3 })); } catch (e) { verbindingslog.add('diagnose', 'mislukt'); }
    if (beoordeling) verbindingslog.add('diagnose', beoordeling.items.map((i) => `${i.id}=${i.status}`).join(' '));
    lastDiag = beoordeling;
    set({ t: 'diag-klaar', beoordeling });
  }
  const rapportTekst = () => foutrapport({ beoordeling: lastDiag, log: verbindingslog, versie: VERSION, platform: typeof navigator !== 'undefined' ? navigator.platform : '', stand: `${state.rol || '-'} / ${state.route || '-'} / ${state.step}` });

  function draw() {
    const v = view(state);
    // het zoekveld van de lijst (#464): na een nieuwe tekening de focus en de cursor terugzetten, zodat je
    // tijdens het typen niet uit het veld valt (de waarde zelf staat in de state)
    const actief = typeof document !== 'undefined' ? document.activeElement : null;
    const zoekFocus = !!(actief && actief.classList && actief.classList.contains('coop-lijst-zoek'));
    const cursor = zoekFocus && typeof actief.selectionStart === 'number' ? actief.selectionStart : null;
    const wensen = v.wensen ? `<div class="coop-wensen" role="group" aria-label="Kies je figuur">${v.wensen.map((w) => `<button type="button" class="m-bg coop-wens" data-act="${w.act}" aria-pressed="${w.gekozen}"><span class="ss-label"><span class="coop-kleur-stip ${kleurKlasse(w.kleur)}" aria-hidden="true">●</span> ${esc(w.naam)}${w.gekozen ? ' ✓' : ''}</span></button>`).join('')}</div>` : '';
    const chip = (act, label, aan) => `<button type="button" class="m-chip coop-chip" data-act="${act}" aria-pressed="${aan}">${esc(label)}</button>`;
    const li = v.lijstInfo;
    const sessies = li ? `<div class="coop-lijst" role="region" aria-label="Openbare sessies">
      <div class="coop-lijst-balk">
        <label class="m-inp coop-lijst-zoek-veld"><span class="ss-label">Zoeken</span><input class="coop-lijst-zoek" type="search" placeholder="Zoek op naam" aria-label="Zoek in openbare sessies" autocomplete="off" spellcheck="false" maxlength="60" value="${esc(li.zoek)}"></label>
      </div>
      <div class="coop-lijst-filters" role="group" aria-label="Filters">
        ${chip('lijst-filter-alleenAansluitbaar', 'Aansluitbaar', li.filters.alleenAansluitbaar)}
        ${chip('lijst-filter-alleenFavorieten', 'Favorieten', li.filters.alleenFavorieten)}
        ${chip('lijst-filter-alleenVers', 'Vers', li.filters.alleenVers)}
        ${chip('lijst-filter-verbergOnbruikbaar', 'Verberg vol en andere versie', li.filters.verbergOnbruikbaar)}
        ${chip('lijst-plek-vrij', 'Vrij', li.filters.plek === 'vrij')}
        ${chip('lijst-plek-vol', 'Vol', li.filters.plek === 'vol')}
      </div>
      <div class="coop-lijst-sorteren" role="group" aria-label="Sorteren">
        <span class="mut">Sorteren:</span>${li.sorteringen.map((x) => chip('lijst-sorteer-' + x.id, x.label, x.gekozen)).join('')}
      </div>
      <p class="coop-lijst-teller mut" role="status"${li.telling ? '' : ' hidden'}>${esc(li.telling)}</p>
      <div class="coop-sessies" role="list">${v.sessies.map((x) => `<div class="coop-sessie" role="listitem"${x.dim ? ' data-dim="1"' : ''}><button type="button" class="m-bt coop-btn coop-ster" data-act="${x.ster}" aria-pressed="${x.favoriet}" aria-label="${x.favoriet ? 'Favoriet af: ' : 'Favoriet: '}${esc(x.naam)}" title="Favoriet"><span class="ss-label" aria-hidden="true">${x.favoriet ? '★' : '☆'}</span></button><button type="button" class="${x.kan ? 'm-bp' : 'm-bg'} coop-btn coop-sessie-knop" data-act="${x.act}"${x.kan ? '' : ' aria-disabled="true"'}><span class="ss-label">${esc(x.tekst)}</span>${x.leeftijd ? `<span class="coop-leeftijd mut" aria-label="${esc(x.leeftijdLang)}"> · ${esc(x.leeftijd)}</span>` : ''}</button><button type="button" class="m-bt coop-btn" data-act="${x.meld}" aria-label="Melden: ${esc(x.naam)}"><span class="ss-label">Melden</span></button></div>`).join('')}</div>
      ${li.meer ? `<div class="coop-meer"><button type="button" class="m-bg coop-btn" data-act="lijst-meer"><span class="ss-label">Meer laden</span></button></div>` : ''}
    </div>` : '';
    // het kleine formulier voor je online-avatar (#455): naam (hoogstens 16 tekens) en een kleur uit de vaste set
    const prof = v.profiel ? `<div class="coop-profiel"><label class="coop-profiel-label"><span>Online naam</span><input class="coop-profiel-naam" type="text" spellcheck="false" autocomplete="off" maxlength="${v.profiel.maxLength}" placeholder="Je figuur" value="${esc(v.profiel.naam)}"></label><div class="coop-kleuren" role="group" aria-label="Kleur">${v.profiel.kleuren.map((c, i) => `<button type="button" class="m-bg coop-kleur" data-kleur="${c.hex}" aria-pressed="${c.hex === v.profiel.kleur}" title="${esc(c.naam)}"><span class="ss-label"><span class="coop-kleur-stip coop-kleur-${i}" aria-hidden="true">●</span> ${esc(c.naam)}</span></button>`).join('')}</div><p class="coop-profiel-hint">${esc(v.profiel.tekst)} Laat je de naam leeg, dan zien de anderen de naam van je figuur. Je staat standaard op passief: medespelers kunnen je geen schade doen.</p>${v.profiel.fout ? `<p class="coop-error" role="alert">${esc(v.profiel.fout)}</p>` : ''}</div>` : '';
    // het vinkje op het toestemmingsscherm (#526): "Niet meer vragen" geldt per apparaat en wordt pas bewaard
    // als de speler daarna akkoord gaat (settings.js: multiplayerConsentRemembered)
    const toestemming = v.consent ? consentOnthoudenHtml(v.consent) : '';
    // het wachtwoordveld (#450): dezelfde stijl als het zoekveld (m-inp + ss-label), met de uitleg eronder
    const ww = v.wachtwoord ? `<div class="coop-wachtwoord-veld"><label class="m-inp coop-wachtwoord-label"><span class="ss-label">${esc(v.wachtwoord.label)}</span><input class="coop-wachtwoord" type="password" spellcheck="false" autocomplete="off" maxlength="${v.wachtwoord.maxLength}" placeholder="${esc(v.wachtwoord.placeholder)}" value="${esc(v.wachtwoord.value)}"></label><p class="coop-wachtwoord-hint mut">${esc(v.wachtwoord.hint)}</p></div>` : '';
    root.innerHTML =
      `<h3 class="coop-title">${esc(v.title)}</h3>` +
      v.lines.map((l) => `<p>${esc(l)}</p>`).join('') +
      prof +
      toestemming +
      sessies +
      ww +
      (v.code ? `<pre class="coop-code" tabindex="0" aria-label="Jouw code">${esc(v.code)}</pre>` : '') +
      (v.input ? `<input class="coop-input" type="text" spellcheck="false" autocomplete="off" placeholder="${esc(v.input.placeholder)}"${v.input.maxLength ? ` maxlength="${v.input.maxLength}"` : ''} value="${esc(v.input.value || '')}">` : '') +
      wensen +
      (v.error ? `<p class="coop-error" role="alert">${esc(v.error)}</p>` : '') +
      `<div class="coop-btns">${v.buttons.map((b) => `<button type="button" class="${b.primary ? 'm-bp' : 'm-bg'} coop-btn" data-act="${b.act}"${b.disabled ? ' disabled aria-disabled="true"' : ''}><span class="ss-label">${esc(b.label)}</span></button>`).join('')}</div>`;
    if (zoekFocus && root.querySelector) {
      const veld = root.querySelector('.coop-lijst-zoek');
      if (veld && veld.focus) {
        veld.focus();
        if (cursor != null && veld.setSelectionRange) { try { veld.setSelectionRange(cursor, cursor); } catch (e) { /* niet elk veld */ } }
      }
    }
  }

  // ----- online-avatar (#455): het formulier bewaren in de gewone instellingen
  function bewaarProfiel() {
    const invoer = root.querySelector('.coop-profiel-naam');
    state = reduce(state, { t: 'profiel', naam: invoer ? invoer.value : state.profiel.naam });
    state = reduce(state, { t: 'profiel-klaar' });
    if (!state.profielFout) { setSetting('onlineNaam', state.profiel.naam); setSetting('onlineKleur', state.profiel.kleur); }
    draw();
    return !state.profielFout;
  }

  // ----- toestemming (#526): de keuze "Niet meer vragen" gaat naar de gewone instellingen, pas als de speler
  // akkoord is gegaan. Alleen op dit apparaat; er gaat niets van naar een server.
  // Het schrijven hangt aan het akkoord van deze sessie: openen, sluiten of annuleren van een scherm mag de
  // opgeslagen keuze nooit veranderen, ook niet als er ergens een vinkje is blijven staan (constitutie 4).
  function bewaarToestemming() {
    if (!state.consented) return;
    setSetting('multiplayerConsentRemembered', !!state.consentSaved);
  }
  // Wie deze sessie al toestemming gaf, komt niet meer op het toestemmingsscherm: de stap die daarop zou wachten
  // begint hier. Zonder dat akkoord komt de stap nooit verder dan 'toestemming' en gebeurt er niets (#526).
  async function startAlsKlaar() {
    if (state.step === 'host-maakt-code') await hostStart();
    else if (state.step === 'verbinden') await guestStart();
    else if (state.step === 'diag-bezig') await diagnose();
  }

  // ----- het wachtwoord van deze sessie (#450)
  // De hub leest cfg.wachtwoord bij elke nieuwe kennismaking (net/hub.js): precies het veld dat coopnet.zetWachtwoord zet.
  // Leeg betekent open. Wie al meespeelt blijft zitten: het is geen reden om iemand eruit te gooien.
  function pasWachtwoordToe() {
    if (!hub) return;
    if (typeof hub.zetWachtwoord === 'function') { hub.zetWachtwoord(state.wachtwoord); return; }
    if (hub.cfg) hub.cfg.wachtwoord = state.wachtwoord;
  }
  // De gastkant: het wachtwoord gaat mee in de kennismaking (session.cfg.info). startClient krijgt het als vierde argument
  // mee; geeft de aanroeper dat (nog) niet door, dan zetten we het hier vóór de eerste kennismaking op de sessie.
  function metWachtwoord(sess) {
    const woord = state.wachtwoord;
    if (woord && sess && sess.cfg && sess.cfg.info && sess.cfg.info.wachtwoord !== woord) sess.cfg.info.wachtwoord = woord;
    return sess;
  }

  // ----- host
  function onRoster(roster) {
    set({ t: 'spelers', lijst: rosterLijst(roster), max: roster.max });
    if (opts.start && opts.holdSlot != null) { // wacht-scherm: klaar zodra die speler weer meedoet
      const p = roster.spelers.find((x) => x.slot === opts.holdSlot);
      if (p && p.verbinding === 'ok' && hooks.resumed) hooks.resumed();
    }
    if (!joinedOnce && roster.spelers.length > 1) { joinedOnce = true; if (hooks.joined) hooks.joined(ROLES.HOST); }
    if (hub && hub.vrijePlekken && !wacht && state.route === ROUTES.KAMER && !opts.start && !opts.adopt) openRoom().catch((e) => set({ t: 'fout', msg: e.message }));
  }
  function ensureHub() {
    if (hub) return hub;
    hub = hooks.startHost(state.route, onRoster);
    koppelKamerRotatie(); // #779: een kick vanaf het tabblad Spelers laat de kamercode ook rouleren
    koppelAankondiging();
    return hub;
  }
  async function openRoom() { // een aanbod voor de eerstvolgende gast, onder dezelfde kamercode
    wacht = true;
    if (handle && handle.cancel) handle.cancel();
    room = room || makeRoom();
    handle = await hostRoom(room, {
      signaler: newSignaler(), timeouts: CONFIG.TIMEOUTS,
      onstate: (s, info) => {
        if (s === 'fout') { wacht = false; set({ t: 'fout', msg: info }); }
        if (s === 'open') { wacht = false; if (hub && hub.vrijePlekken) openRoom().catch((e) => set({ t: 'fout', msg: e.message })); }
      },
    });
    hooks.addGuest(handle.transport);
    set({ t: 'code', code: formatRoom(room) });
    if (hub) set({ t: 'spelers', lijst: rosterLijst(hub.roster), max: hub.roster.max });
  }
  async function hostStart() {
    ensureHub();
    pasWachtwoordToe(); // een wachtwoord dat de gastheer al invulde, geldt meteen voor de eerste gast (#450)
    if (state.route === ROUTES.DIRECT) {
      if (stopListen) stopListen();
      stopListen = listenForGuests(api, (tr) => hooks.addGuest(tr));
      const r = await api.host(hub.roster.max);
      if (!r.ok) return set({ t: 'fout', msg: r.text || 'Het spel openen lukte niet.' });
      return set({ t: 'code', code: r.code, lanCode: r.lanCode, note: r.online ? '' : r.text });
    }
    await openRoom();
  }

  // ----- openbare sessie (#438, #450): de hub houdt de regel van deze sessie vast (naam, een vast id en het echte aantal
  // spelers); dit scherm plaatst hem. De hub zegt wanneer het aan- of uitgaat, zodat de sessie dezelfde regel houdt als het
  // paneel opnieuw opent of het spel wordt overgenomen.
  function koppelAankondiging() {
    if (!hub || !hub.zetOpenbaar) return;
    hub.opOpenbaar = (p) => { if (p) startAankondiging(); else stopAankondiging(); };
  }
  async function startAankondiging() {
    stopAankondiging();
    const p = hub && hub.publiek ? hub.publiek() : null;
    if (!p || !p.id) return; // geen hub of niet openbaar: niets plaatsen
    const sig = newLijstSignaler();
    aankondiger = sig;
    // De lijst draagt alleen naam, spelers, versie en het sessie-id; de kamercode staat er niet in (#583).
    const maak = maakAankondiger({ naam: p.naam, versie: VERSION, proto: PROTO, id: p.id,
      hub: () => (hub && hub.publiek ? hub.publiek() : null) });
    const topic = await topicFor(LIJST.sleutel);
    if (aankondiger !== sig) return; // intussen weer privé gemaakt: niets plaatsen
    sig.kondig(topic, maak);
    openGate(p.id); // een gast die op de rij klikt, vraagt hier een eenmalige kamer aan
  }
  function stopAankondiging() { const s = aankondiger; aankondiger = null; if (s) { try { s.close(); } catch (e) { /* weg */ } } stopGate(); }

  // ----- deelnemen via de lijst zonder de kamercode te publiceren (#583)
  // De host antwoordt op een verzoek met een eenmalige kamer, versleuteld voor die gast (net/joingate.js).
  // Wie alleen de lijst leest, krijgt geen sleutel en geen kamercode, en kan het aanbod dus niet ontsleutelen.
  //
  // #778: een openbare host krijgt join-verzoeken van iedereen, en elk verzoek zet een volledige signalering
  // op (tracker + MQTT, meerdere sockets). Met de gewone uitnodigingstijd van 15 minuten loopt een vloed aan
  // verzoeken de host leeg: de browser raakt zijn verbindingen kwijt en echte gasten kunnen niet meer binnen.
  // Daarom staan er hoogstens een paar aanbiedingen tegelijk open, en elk verdwijnt weer als er niemand komt.
  const GATE_MAX_OFFERS = 4;
  const GATE_OFFER_MS = JOIN.wacht + 20000; // ruim boven wat een gast nodig heeft om te verbinden, ver onder TIMEOUTS.wait
  let gate = null;
  const gateHandles = [];
  let gateBusy = 0; // aanbiedingen die nog klaargezet worden en dus nog niet in gateHandles staan (#778)
  function openGate(id) {
    stopGate();
    if (!id || !rtcSupported()) return;
    const g = bedienKamer({
      id,
      maakSignaler: () => newLijstSignaler(JOIN.interval),
      mag: () => { // de hub weigert zelf als er geen plek is; #778: en een vloed krijgt geen kamer als er al genoeg openstaan
        const p = hub && hub.publiek ? hub.publiek() : null;
        return !!(p && p.spelers < p.max) && gateHandles.length + gateBusy < GATE_MAX_OFFERS;
      },
      onKamer: (room) => openGateKamer(room),
    });
    if (g) gate = g;
  }
  // #783: een aanbod dat verbonden of afgelopen is, hoort niet meer in gateHandles; anders houdt de
  // gastheer elk gesloten handle-object vast tot de sessie weer privé gaat.
  function dropGateHandle(h) {
    const i = h ? gateHandles.indexOf(h) : -1;
    if (i >= 0) gateHandles.splice(i, 1);
  }
  async function openGateKamer(room) {
    // #778: staan er al genoeg aanbiedingen open, dan geen kamer en dus ook geen antwoord: de vloed wacht maar.
    if (gateHandles.length + gateBusy >= GATE_MAX_OFFERS) throw new Error('Te veel open aanbiedingen.');
    const eigen = gate; // hoort dit aanbod nog bij de open gate? (de host kan de sessie intussen privé hebben gemaakt)
    let h = null, settled = false;
    gateBusy++;
    try {
      h = await hostRoom(room, {
        signaler: newSignaler(),
        timeouts: { ...CONFIG.TIMEOUTS, wait: GATE_OFFER_MS }, // #778: een aanbod via de lijst staat kort open, geen 15 minuten
        onstate: (s, info) => {
          if (s !== 'open' && s !== 'fout') return; // de aanbieding zelf duurt nog: hij blijft staan tot hij open- of afgaat
          settled = true;
          if (s === 'fout') console.warn('sessie', info);
          dropGateHandle(h);
        },
      });
    } finally { gateBusy = Math.max(0, gateBusy - 1); }
    // Geen antwoord publiceren met een kamer die al is afgegaan of niet meer bij deze gate hoort: de gast
    // zou een code krijgen waar niemand op wacht. Door te gooien slaat net/joingate.js het antwoord over.
    if (settled) throw new Error('Het aanbod ging al af voordat de kamer klaar was.');
    if (gate !== eigen) { try { h.cancel(); } catch (e) { /* al weg */ } throw new Error('De sessie is niet meer openbaar.'); }
    gateHandles.push(h);
    hooks.addGuest(h.transport);
  }
  function stopGate() {
    const g = gate; gate = null;
    if (g) { try { g.stop(); } catch (e) { /* al weg */ } }
    for (const h of gateHandles.splice(0)) { try { h.cancel(); } catch (e) { /* al weg */ } }
  }
  // Weer privé: de oude kamercode is openbaar geweest en werkt niet meer; wie nog kan aansluiten krijgt een nieuwe
  async function nieuweKamer() {
    room = null; wacht = false;
    if (handle && handle.cancel) handle.cancel();
    handle = null;
    if (hub && hub.vrijePlekken) await openRoom();
  }
  // #779: na een kick vervalt de oude kamercode, want de gekickte speler kent hem. De gastheer krijgt meteen
  // een nieuwe code en een nieuw aanbod. Dat gebeurt ook als de gekickte plek pas na REMOVE_DELAY vrijkomt:
  // een gast die in die tussentijd verbindt, weigert de hub, en daarna gaat het aanbod vanzelf opnieuw open.
  async function rondeerKamer() {
    room = null; wacht = false;
    if (handle && handle.cancel) handle.cancel();
    handle = null;
    await openRoom();
  }
  // De hub vraagt hierom na een geslaagde kick (game/js/coopnet.js removeGuest), zodat de code ook rouleert
  // als de gastheer kickt vanaf het tabblad Spelers (coopspelersui.js) en niet via deze spelerslijst.
  function koppelKamerRotatie() {
    if (!hub || hub.kamerRouleer) return;
    hub.kamerRouleer = () => { if (state.rol === ROLES.HOST && state.route === ROUTES.KAMER) rondeerKamer().catch(() => {}); };
  }

  // ----- de lijst met openbare sessies bekijken (#438)
  // Een rij draagt geen kamercode (#583); het sessie-id is de ingang. De lobby geeft de rij een
  // `room` mee in de vorm '@<id>', zodat de bestaande stap in lobby.js er een verwijzing van maakt
  // en guestStart hieronder eerst een eenmalige kamer vraagt.
  const lijstRijen = (rijen) => (Array.isArray(rijen) ? rijen : []).map((r) => (r && r.room ? r : { ...r, room: '@' + r.id }));
  async function startLuisteren() {
    stopLuisteren();
    const sig = newLijstSignaler(), lijst = new Serverlijst({ proto: PROTO, versie: VERSION, verborgen: leesVerborgen() });
    const l = { sig, lijst, timer: null, laatste: '', getekend: 0 };
    luis = l;
    const topic = await topicFor(LIJST.sleutel);
    if (luis !== l) return; // intussen terug: niet verbinden
    sig.luister(topic, (tekst) => lijst.ontvang(tekst));
    const tik = () => {
      if (luis !== l || state.step !== 'lijst') return;
      const rijen = lijst.lijst();
      // alleen de inhoud telt voor "er is iets veranderd"; de leeftijd telt mee met de klok, dus elke paar seconden
      // opnieuw tekenen zodat "12 s" ook echt ouder wordt (het zoekveld houdt zijn focus, zie draw())
      const kern = rijen.map((r) => [r.id, r.naam, r.spelers, r.max, r.versie, r.kan ? 1 : 0, r.anders ? 1 : 0, r.vol ? 1 : 0].join('|')).join(';');
      const nu = Date.now();
      if (kern !== l.laatste || nu - l.getekend >= 5000) { l.laatste = kern; l.getekend = nu; set({ t: 'lijst-data', lijst: lijstRijen(rijen) }); }
      if (sig.alleFout() && !state.error) set({ t: 'fout', msg: 'Er is geen verbinding met de openbare servers. Controleer je internet en probeer het later opnieuw.' });
    };
    l.ververs = () => { // Lijst verversen: geen nieuw abonnement, alleen opnieuw lezen en tekenen
      if (luis !== l) return;
      l.laatste = ''; l.getekend = Date.now();
      set({ t: 'lijst-data', lijst: lijstRijen(lijst.lijst()) });
    };
    l.timer = setInterval(tik, opts.lijstMs || 2000);
    setTimeout(tik, 400);
  }
  function stopLuisteren() { const l = luis; luis = null; if (l) { clearInterval(l.timer); try { l.sig.close(); } catch (e) { /* weg */ } } }

  // ----- gast
  const nameOf = (char) => (charInfo(char) || {}).naam || '?';
  const naamVan = (p) => (p && p.avatar && p.avatar.naam) || nameOf(p && p.char); // (#455) de online-avatar gaat voor de figuur
  // (#777) Het antwoord op een join-verzoek is niet cryptografisch aan de host gebonden (zie net/joingate.js):
  // wie het openbare verzoek ziet, kan zelf een geldig uitziend antwoord publiceren. De eerste controle die de
  // gast wél kan doen is het welkom: daarin staan het vaste sessie-id en de naam van de sessie (net/hub.js).
  // Klopt het id niet met de rij waarop geklikt is, dan is dit de kamer van iemand anders: verbinding loslaten.
  // Een andere naam bij hetzelfde id is geen aanval maar een gewijzigde sessienaam: waarschuwen, niet blokkeren.
  function hostIdentityCheck(expected, actual) {
    if (!actual || typeof actual.id !== 'string' || !actual.id) {
      return { hard: true, msg: 'Let op: het spel kon niet controleren of deze kamer bij de sessie uit de lijst hoort. De verbinding is verbroken. Kies de sessie opnieuw uit de lijst.' };
    }
    if (String(actual.id) !== expected.id) {
      return { hard: true, msg: 'Let op: deze kamer hoort niet bij de sessie waarop je klikte: iemand anders beantwoordde het verzoek. De verbinding is verbroken. Kies de sessie opnieuw uit de lijst of vraag de kamercode.' };
    }
    if (expected.naam != null && String(actual.naam || '') !== expected.naam) {
      return { hard: false, msg: `Let op: deze sessie heet nu "${String(actual.naam || 'zonder naam')}" in plaats van "${expected.naam}". Je bent met dezelfde sessie verbonden (het sessie-id klopt), maar de naam is intussen veranderd.` };
    }
    return null;
  }
  function watch(sess, expected = null) {
    session = sess;
    let rejectedIdentity = false; // na een identiteitsfout de rest negeren, zodat de waarschuwing blijft staan
    sess.onstatus = (st) => {
      if (rejectedIdentity) return;
      const check = st === 'ok' && expected ? hostIdentityCheck(expected, sess.sessie) : null;
      if (check && check.hard) {
        rejectedIdentity = true;
        // Meteen loslaten: niet in het spel van iemand anders belanden (constitutie 10).
        try { if (hooks.disconnect) hooks.disconnect('verbreek', ROLES.GAST, opts.holdSlot); } catch (e) { /* al weg */ }
        cleanup();
        set({ t: 'kies', rol: ROLES.GAST });
        set({ t: 'fout', msg: check.msg });
        return;
      }
      set({ t: 'status', status: st, reason: sess.rejected, ander: sess.remoteVersion, partner: { slot: sess.slot } });
      if (st === 'ok') {
        if (sess.sessie) set({ t: 'sessie', sessie: sess.sessie }); // bij welke sessie je hoort (#450)
        if (!sess.lijstGezien && sess.welcome && Array.isArray(sess.welcome.lijst)) set({ t: 'spelers', lijst: sess.welcome.lijst.map((x) => ({ ...x, naam: naamVan(x) })), max: sess.welcome.max });
        if (!joinedOnce) { joinedOnce = true; if (hooks.joined) hooks.joined(ROLES.GAST); }
        if (opts.start && hooks.resumed) hooks.resumed();
        if (check) set({ t: 'fout', msg: check.msg }); // zelfde sessie-id, andere naam: alleen een waarschuwing
      }
    };
    const prev = sess.onevent;
    sess.onevent = (b) => {
      if (b && b.k === 'hek') { // wie het spel opende start het spel (of er was geen wachtkamer): de wachtkamer van de gast sluit
        const was = state.caps.startGate; set({ t: 'gate', aan: !!b.aan });
        if (was && !b.aan && hooks.startSpel) hooks.startSpel();
      }
      if (b && b.k === 'spelers' && Array.isArray(b.lijst)) sess.lijstGezien = true; if (b && b.k === 'spelers' && Array.isArray(b.lijst)) set({ t: 'spelers', lijst: b.lijst.map((x) => ({ ...x, naam: naamVan(x) })), max: b.max }); if (prev) prev(b); };
  }

  async function guestStart() {
    const inv = state.invoer;
    const kan = hooks.canJoin ? hooks.canJoin() : { ok: true };
    if (!kan.ok) { set({ t: 'kies', rol: ROLES.GAST }); return set({ t: 'fout', msg: kan.reason }); }
    // (#777) Bij een rij uit de lijst hoort een sessie-id en een naam; na het verbinden controleert de gast
    // of het welkom daarbij hoort (hostIdentityCheck). Bij de kamercode-route valt er niets te vergelijken.
    let expected = null;
    const bind = (tr) => { if (opts.session) { opts.session.rebind(tr); watch(opts.session); } else watch(metWachtwoord(hooks.startClient(tr, inv.route, state.wens, { wachtwoord: state.wachtwoord })), expected); };
    if (inv.route === ROUTES.DIRECT) {
      const tr = ipcTransport(api, 0);
      const r = await api.join(inv.code);
      if (!r.ok) { set({ t: 'kies', rol: ROLES.GAST }); return set({ t: 'fout', msg: r.reason }); }
      if (hooks.onCode) hooks.onCode(inv.code);
      set({ t: 'laatste-code', code: inv.code });
      return bind(tr);
    }
    // Een rij uit de lijst draagt geen kamercode (#583): de lobby gaf hem '@<sessie-id>' mee. Eerst
    // vraagt de gast hier een eenmalige kamer aan (net/joingate.js); daarna loopt het gewone pad.
    let kamer = inv.room;
    const viaLijst = typeof kamer === 'string' && kamer.startsWith('@');
    if (viaLijst) {
      const id = kamer.slice(1);
      expected = { id }; // het sessie-id uit de rij waarop de speler klikte (lobby.js: 'lijst-kies')
      const rij = Array.isArray(state.lijst) ? state.lijst.find((x) => x && x.id === id) : null;
      if (rij && typeof rij.naam === 'string') expected.naam = rij.naam;
      try { kamer = await (opts.haalKamer ? opts.haalKamer(id) : vraagKamer({ id, maakSignaler: () => newLijstSignaler(JOIN.interval) })); }
      catch (e) { set({ t: 'kies', rol: ROLES.GAST }); return set({ t: 'fout', msg: 'Deze sessie antwoordt niet. Kies opnieuw uit de lijst of vraag de kamercode.' }); }
      if (!kamer) { set({ t: 'kies', rol: ROLES.GAST }); return set({ t: 'fout', msg: 'Deze sessie antwoordt niet. Kies opnieuw uit de lijst of vraag de kamercode.' }); }
    }
    handle = await joinRoom(kamer, {
      signaler: newSignaler(), timeouts: CONFIG.TIMEOUTS,
      onstate: (s, info) => { if (s === 'fout') { set({ t: 'kies', rol: ROLES.GAST }); set({ t: 'fout', msg: info }); } },
    });
    if (viaLijst) {
      // Een eenmalige kamer is geen code om te bewaren: opnieuw aansluiten gaat via de lijst.
    } else {
      if (hooks.onCode) hooks.onCode(formatRoom(kamer));
      set({ t: 'laatste-code', code: formatRoom(kamer) }); // wordt de gast eruit gezet, dan staat de code klaar om opnieuw aan te sluiten
    }
    handle.opened.then(bind).catch((e) => set({ t: 'fout', msg: e && e.message ? e.message : 'Er ging iets mis.' }));
  }

  function cleanup() {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    autoTries = AUTO_MAX; // na sluiten geen pogingen meer
    if (handle && handle.cancel) handle.cancel();
    handle = null; wacht = false;
    stopAankondiging(); stopLuisteren();
    if (hub && hub.opOpenbaar) hub.opOpenbaar = null; // dit scherm plaatst niets meer; de sessie houdt wel zijn naam en id (#450)
    if (stopListen) { stopListen(); stopListen = null; }
    if (api && state.route === ROUTES.DIRECT && !opts.start && !opts.adopt) api.stop();
  }

  async function act(a) {
    const input = root.querySelector('.coop-input');
    try {
      if (a === 'start-spel') {
        // #642: de gastheer start het spel; een gast vraagt het hem (de knop in de wachtkamer)
        if (state.rol === ROLES.GAST) { if (hooks.vraagStart) hooks.vraagStart(); }
        else { if (hooks.startSpel) hooks.startSpel(); set({ t: 'gate', aan: false }); }
      }
      else if (a === 'stop-iedereen') { if (hooks.stopIedereen) hooks.stopIedereen(); } // #642: gast vraagt de groep om akkoord
      else if (a === 'openbaar') set({ t: 'openbaar-vraag' });
      else if (a === 'openbaar-ja') {
        const naam = input ? input.value : '';
        // de hub houdt naam en het vaste id van deze sessie vast (#450); hij filtert de naam ook (constitutie 10)
        const r = hub && hub.zetOpenbaar ? hub.zetOpenbaar(true, naam) : { ok: true };
        set({ t: 'openbaar-ja', naam, id: r.id });
        if (r.ok && state.openbaar && !aankondiger) await startAankondiging();
      }
      else if (a === 'openbaar-terug') set({ t: 'openbaar-terug' });
      else if (a === 'privaat') { if (hub && hub.zetOpenbaar) hub.zetOpenbaar(false); set({ t: 'privaat' }); await nieuweKamer(); }
      else if (a === 'lijst') { set({ t: 'lijst-vraag' }); if (state.step === 'lijst') await startLuisteren(); } // (#526) met toestemming meteen de lijst in
      else if (a === 'lijst-go') { set({ t: 'lijst-go' }); bewaarToestemming(); await startLuisteren(); } // (#526) dit akkoord geldt ook voor de rest van de sessie
      else if (a === 'lijst-terug') set({ t: 'lijst-terug' });
      else if (a === 'lijst-ververs') { set({ t: 'lijst-ververs' }); if (luis && luis.ververs) luis.ververs(); }
      else if (a === 'lijst-meer') set({ t: 'lijst-meer' });
      else if (a === 'lijst-filters-wissen') set({ t: 'lijst-filters-wissen' });
      else if (a.startsWith('lijst-filter-')) set({ t: 'lijst-filter', filter: a.slice('lijst-filter-'.length) });
      else if (a === 'lijst-plek-vrij') set({ t: 'lijst-plek', plek: 'vrij' });
      else if (a === 'lijst-plek-vol') set({ t: 'lijst-plek', plek: 'vol' });
      else if (a.startsWith('lijst-sorteer-')) set({ t: 'lijst-sorteer', sortering: a.slice('lijst-sorteer-'.length) });
      else if (a.startsWith('ster-')) {
        const e = state.lijst[+a.slice(5)];
        if (e) { set({ t: 'lijst-ster', id: e.id }); schrijfFavorieten(state.lijstFavorieten); }
      }
      else if (a.startsWith('sluit-')) { set({ t: 'lijst-kies', i: +a.slice(6) }); await startAlsKlaar(); }
      else if (a.startsWith('meld-')) {
        const e = state.lijst[+a.slice(5)];
        if (e && luis) { schrijfVerborgen(luis.lijst.meld(e.id)); luis.laatste = ''; luis.getekend = 0; set({ t: 'lijst-data', lijst: lijstRijen(luis.lijst.lijst()) }); }
      }
      else if (a === 'diag') { set({ t: 'diag' }); await startAlsKlaar(); } // (#526) met toestemming meteen meten, anders eerst de vraag
      else if (a === 'diag-go') { const vraag = state.step === 'diag-vraag'; set({ t: 'diag-go' }); if (vraag) bewaarToestemming(); await diagnose(); } // (#526) wie de test start, is akkoord: de rest van de sessie vraagt het niet meer
      else if (a === 'diag-terug') set({ t: 'diag-terug' });
      else if (a === 'rapport') { if (navigator.clipboard) await navigator.clipboard.writeText(rapportTekst()); verbindingslog.add('rapport', 'gekopieerd'); set({ t: 'fout', msg: 'Het rapport is gekopieerd. Plak het in een bericht.' }); }
      else if (a === 'logbestand') { const d = window.gdeDesktop; if (d && d.saveTextFile) await d.saveTextFile('GDE-verbindingsrapport.txt', rapportTekst()); }
      else if (a === 'kies-host') set({ t: 'kies', rol: ROLES.HOST });
      else if (a === 'kies-gast') set({ t: 'kies', rol: ROLES.GAST });
      else if (a === 'consent-vergeet') { set({ t: 'consent-vergeet' }); setSetting('multiplayerConsentRemembered', false); } // (#526) de speler wil de vraag weer zien
      // (#526) gaf deze sessie al toestemming, dan gaat de route meteen door; anders komt eerst het scherm
      else if (a === 'route-kamer') { set({ t: 'route', route: ROUTES.KAMER }); await startAlsKlaar(); }
      else if (a === 'route-direct') { set({ t: 'route', route: ROUTES.DIRECT }); await startAlsKlaar(); }
      else if (a.startsWith('wens-')) set({ t: 'wens', char: a.slice(5) });
      else if (a === 'koppel') { bewaarProfiel(); set({ t: 'invoer', text: input ? input.value : '' }); await startAlsKlaar(); }
      else if (a === 'probeer') set({ t: 'probeer' }); // een gast met een verkeerd wachtwoord probeert het opnieuw (#450)
      else if (a === 'akkoord') {
        bewaarProfiel(); // de avatar die anderen straks zien (#455), vóór de verbinding
        set({ t: 'akkoord' });
        bewaarToestemming(); // (#526) "Niet meer vragen" geldt pas nu echt; zonder vinkje één keer per sessie
        if (state.step === 'host-maakt-code') await hostStart();
        else if (state.step === 'verbinden') await guestStart();
      } else if (a === 'kopieer') {
        if (state.code && navigator.clipboard) await navigator.clipboard.writeText(state.code);
      } else if (a.startsWith('kick-')) {
        if (hooks.kick) hooks.kick(+a.slice(5));
      } else if (a === 'overdragen') {
        set({ t: 'overdragen' }); // wie het spel opende kiest een speler (#439)
      } else if (a === 'overdragen-terug') {
        set({ t: 'overdragen-terug' });
      } else if (a.startsWith('overdragen-')) {
        // het spel aan deze speler overdragen: coophostwisselnet.js doet het werk, multiplayerhostwisselui.js tekent de vraag en de pauze
        const r = hooks.overdragen ? hooks.overdragen(+a.slice('overdragen-'.length)) : { ok: false, tekst: 'Overdragen kan alleen in het spel zelf.' };
        if (r && r.ok) set({ t: 'overdragen-terug' });
        else set({ t: 'fout', msg: (r && r.tekst) || 'Overdragen lukte niet.' });
      } else if (a.startsWith('max-')) {
        const gekozen = hooks.setMax ? hooks.setMax(+a.slice(4)) : +a.slice(4);
        if (api && state.route === ROUTES.DIRECT) api.setMax(gekozen);
        if (hub && state.route === ROUTES.KAMER) onRoster(hub.roster);
      } else if (a === 'terug' || a === 'verbreek') {
        // eerst netjes afmelden (BYE naar de anderen), dan pas de verbinding en de poort sluiten: andersom komt het afmelden nooit aan en houdt de host de plek nog tot de pauze
        if (hooks.disconnect) hooks.disconnect(a, state.rol, opts.holdSlot);
        cleanup();
        set({ t: a === 'terug' ? 'terug' : 'verbreek' });
      } else if (a === 'hervat') {
        set({ t: 'hervat' }); // opnieuw uitwisselen; de terugkerende speler vindt zijn plek via zijn token
        if (state.step === 'host-maakt-code') await hostStart();
      }
    } catch (e) {
      set({ t: 'fout', msg: e && e.message ? e.message : 'Er ging iets mis.' });
    }
  }

  if (hub && (opts.start || opts.adopt)) { const prev = hub.onchange; hub.onchange = (r) => { if (prev) prev(r); onRoster(r); }; }
  if (session && (opts.start || opts.adopt)) watch(session); // wachtscherm van een gast: zodra de verbinding van zelf terugkomt (zelfde token), sluit het scherm
  root.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-act]');
    if (b && root.contains(b)) act(b.dataset.act);
    const k = e.target.closest && e.target.closest('[data-kleur]');
    if (k && k.dataset && k.dataset.kleur && root.contains(k)) { set({ t: 'profiel', kleur: k.dataset.kleur }); bewaarProfiel(); } // een kleur meteen bewaren
  });
  root.addEventListener('input', (e) => { // tijdens het typen geen nieuwe tekening: anders raakt het veld zijn focus kwijt
    if (e.target && e.target.classList && e.target.classList.contains('coop-profiel-naam')) state = reduce(state, { t: 'profiel', naam: e.target.value });
    // het wachtwoord (#450): meteen bewaren en bij de gastheer meteen laten gelden voor de volgende kennismaking
    else if (e.target && e.target.classList && e.target.classList.contains('coop-wachtwoord')) { state = reduce(state, { t: 'wachtwoord', tekst: e.target.value }); pasWachtwoordToe(); }
    // de lijst (#464): de waarde staat in de state, draw() zet de focus en de cursor terug
    else if (e.target && e.target.classList && e.target.classList.contains('coop-lijst-zoek')) { state = reduce(state, { t: 'lijst-zoek', tekst: e.target.value }); draw(); }
  });
  root.addEventListener('keydown', (e) => { // Escape wist het zoekveld; pijltjes gaan langs de sessies
    if (!e || !e.target) return;
    if (e.key === 'Escape' && e.target.classList && e.target.classList.contains('coop-lijst-zoek')) {
      e.preventDefault(); state = reduce(state, { t: 'lijst-zoek', tekst: '' }); draw(); return;
    }
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && e.target.classList && e.target.classList.contains('coop-sessie-knop')) {
      if (!root.querySelectorAll) return;
      const knoppen = [...root.querySelectorAll('.coop-sessie-knop')];
      const i = knoppen.indexOf(e.target);
      if (i < 0) return;
      e.preventDefault();
      const volgende = knoppen[i + (e.key === 'ArrowDown' ? 1 : -1)];
      if (volgende && volgende.focus) volgende.focus();
    }
  });
  root.addEventListener('change', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('coop-profiel-naam')) bewaarProfiel();
    // het wachtwoord (#450): na het typen de regel eronder bijwerken (open of op slot)
    else if (e.target && e.target.classList && e.target.classList.contains('coop-wachtwoord')) { state = reduce(state, { t: 'wachtwoord', tekst: e.target.value }); pasWachtwoordToe(); draw(); }
    // het vinkje "Niet meer vragen" (#526): de keuze geldt bij het akkoord en wordt dan op dit apparaat bewaard
    else if (e.target && e.target.classList && e.target.classList.contains('coop-consent-vink')) { state = reduce(state, { t: 'consent-vink', aan: !!e.target.checked }); draw(); }
  });
  if (hub) koppelAankondiging();
  if (hub) koppelKamerRotatie(); // #779: ook een lopende of overgedragen sessie laat de kamercode na een kick rouleren
  draw();
  if (state.step === 'lijst') startLuisteren().catch((e) => set({ t: 'fout', msg: e.message })); // (#526) dit apparaat gaf al toestemming: de lijst opent meteen
  if (state.step === 'verbonden' && state.openbaar && hub) startAankondiging(); // een lopende openbare sessie staat weer in de lijst, met dezelfde regel (#450)
  if (state.step === 'verbroken') planAuto(AUTO_EERSTE);
  return { event: set, state: () => state, close() { cleanup(); root.innerHTML = ''; } };
}
