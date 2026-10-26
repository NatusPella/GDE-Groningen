// Samen spelen (#95): het uitnodigscherm voor N spelers, getekend in de menustijl. De
// logica en teksten staan in lobby.js (getest); de routes in net/rtcroom.js, net/brokers.js
// en de IPC-brug (net/ipctransport.js, desktop/coopcore.cjs); de spelers in net/hub.js.
// Dit bestand is DOM en lijm; het is niet in beeld bekeken. Het wordt ook gebruikt voor het
// wacht-scherm tijdens het spel (opts.start = 'verbroken'). Alleen bereikbaar via ?coop.
//
// Wie het spel opende houdt de uitnodiging open zolang er plek is: na elke gast die verbindt,
// wordt er een nieuw aanbod klaargezet onder dezelfde kamercode (of luistert de TCP-poort verder).
//
// hooks: { startHost(route, onChange) -> hub, addGuest(transport), startClient(transport, route, wens) -> session,
//          setMax(n), kick(slot), overdragen(slot) -> { ok } | { ok: false, tekst } (#439), joined(rol), disconnect(act, rol, slot), onCode(code), canJoin() -> {ok, reason}, laatsteCode, resumed() }
// opts:  { start: 'verbroken', rol, route, session (gast), hub (host), holdSlot, holdNaam }  (hervatten in het spel)
//        { adopt: { code, route }, rol, session | hub }  (de sessie loopt al: na het overdragen van het spel kent het paneel rol, kamercode en spelers)
import { createLobby, reduce, view, profielNaam, ROLES, ROUTES } from './lobby.js';
import { getSettings, setSetting } from './settings.js';
import { ipcTransport, listenForGuests, onlineSupported } from './net/ipctransport.js';
import { hostRoom, joinRoom, rtcSupported } from './net/rtcroom.js';
import { MultiSignaler, LijstSignaler } from './net/brokers.js';
import * as CONFIG from './net/netconfig.js';
import { makeRoom, formatRoom, topicFor } from './net/sigcrypto.js';
import { LIJST, Serverlijst, maakAankondiger } from './net/serverlijst.js';
import { PROTO } from './net/protocol.js';
import { lijst as rosterLijst, charInfo } from './coopplayers.js';
import { meet, beoordeel, foutrapport, verbindingslog } from './net/diagnose.js';
import { maakEnv } from './net/diagnoseenv.js';
import { VERSION } from './version.js';

const newLijstSignaler = () => new LijstSignaler(CONFIG, { socket: (url) => { const ws = new WebSocket(url); ws.binaryType = 'arraybuffer'; return ws; } }, { brokerTimeout: CONFIG.TIMEOUTS.broker, interval: LIJST.interval });
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

const newSignaler = () => new MultiSignaler(CONFIG, { socket: (url) => { const ws = new WebSocket(url); ws.binaryType = 'arraybuffer'; return ws; } },
  { fallbackAfter: CONFIG.TIMEOUTS.fallbackAfter, brokerTimeout: CONFIG.TIMEOUTS.broker });

export function mountLobby(root, hooks, opts = {}) {
  const direct = onlineSupported();
  const api = direct ? window.gdeDesktop.coop : null;
  const prof = getSettings(); // online-avatar (#455): per apparaat bewaard
  let state = createLobby({ direct, rtc: rtcSupported(), laatsteCode: hooks.laatsteCode, versie: VERSION, lijst: !!opts.lijst, opslaan: !!(typeof window !== 'undefined' && window.gdeDesktop && window.gdeDesktop.saveTextFile), start: opts.start, rol: opts.rol, keuze: opts.keuze, holdNaam: opts.holdNaam, startGate: opts.startGate, spelNaam: opts.spelNaam, onlineNaam: prof.onlineNaam, onlineKleur: prof.onlineKleur, favorieten: leesFavorieten() });
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
          if (state.step === 'gast-typt' && code) { set({ t: 'invoer', text: code }); if (state.step === 'toestemming') { set({ t: 'akkoord' }); await guestStart(); } }
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
    const wensen = v.wensen ? `<div class="coop-wensen" role="group" aria-label="Kies je figuur">${v.wensen.map((w) => `<button type="button" class="m-bg coop-wens" data-act="${w.act}" aria-pressed="${w.gekozen}"><span class="ss-label"><span style="color:${w.kleur}" aria-hidden="true">●</span> ${esc(w.naam)}${w.gekozen ? ' ✓' : ''}</span></button>`).join('')}</div>` : '';
    const chip = (act, label, aan) => `<button type="button" class="m-chip coop-chip" data-act="${act}" aria-pressed="${aan}"${aan ? ' style="background:rgba(240,237,228,.12);color:var(--ink)"' : ''}>${esc(label)}</button>`;
    const li = v.lijstInfo;
    const sessies = li ? `<div class="coop-lijst" role="region" aria-label="Openbare sessies">
      <div class="coop-lijst-balk" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0">
        <label class="m-inp" style="flex:1;min-width:180px"><span class="ss-label">Zoeken</span><input class="coop-lijst-zoek" type="search" placeholder="Zoek op naam" aria-label="Zoek in openbare sessies" autocomplete="off" spellcheck="false" maxlength="60" value="${esc(li.zoek)}"></label>
      </div>
      <div class="coop-lijst-filters" role="group" aria-label="Filters" style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0">
        ${chip('lijst-filter-alleenAansluitbaar', 'Aansluitbaar', li.filters.alleenAansluitbaar)}
        ${chip('lijst-filter-alleenFavorieten', 'Favorieten', li.filters.alleenFavorieten)}
        ${chip('lijst-filter-alleenVers', 'Vers', li.filters.alleenVers)}
        ${chip('lijst-filter-verbergOnbruikbaar', 'Verberg vol en andere versie', li.filters.verbergOnbruikbaar)}
        ${chip('lijst-plek-vrij', 'Vrij', li.filters.plek === 'vrij')}
        ${chip('lijst-plek-vol', 'Vol', li.filters.plek === 'vol')}
      </div>
      <div class="coop-lijst-sorteren" role="group" aria-label="Sorteren" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0 10px">
        <span class="mut">Sorteren:</span>${li.sorteringen.map((x) => chip('lijst-sorteer-' + x.id, x.label, x.gekozen)).join('')}
      </div>
      <p class="coop-lijst-teller mut" role="status"${li.telling ? '' : ' hidden'}>${esc(li.telling)}</p>
      <div class="coop-sessies" role="list">${v.sessies.map((x) => `<div class="coop-sessie" role="listitem" style="display:flex;gap:8px;align-items:stretch;margin:6px 0${x.dim ? ';opacity:.55' : ''}"><button type="button" class="m-bt coop-btn coop-ster" data-act="${x.ster}" aria-pressed="${x.favoriet}" aria-label="${x.favoriet ? 'Favoriet af: ' : 'Favoriet: '}${esc(x.naam)}" title="Favoriet"><span class="ss-label" aria-hidden="true">${x.favoriet ? '★' : '☆'}</span></button><button type="button" class="${x.kan ? 'm-bp' : 'm-bg'} coop-btn coop-sessie-knop" data-act="${x.act}" style="flex:1;text-align:left"${x.kan ? '' : ' aria-disabled="true"'}><span class="ss-label">${esc(x.tekst)}</span>${x.leeftijd ? `<span class="coop-leeftijd mut" aria-label="${esc(x.leeftijdLang)}"> · ${esc(x.leeftijd)}</span>` : ''}</button><button type="button" class="m-bt coop-btn" data-act="${x.meld}" aria-label="Melden: ${esc(x.naam)}"><span class="ss-label">Melden</span></button></div>`).join('')}</div>
      ${li.meer ? `<div style="margin:10px 0"><button type="button" class="m-bg coop-btn" data-act="lijst-meer"><span class="ss-label">Meer laden</span></button></div>` : ''}
    </div>` : '';
    // het kleine formulier voor je online-avatar (#455): naam (hoogstens 16 tekens) en een kleur uit de vaste set
    const prof = v.profiel ? `<div class="coop-profiel" style="display:flex;flex-direction:column;gap:8px;margin:10px 0"><label class="coop-profiel-label" style="display:flex;gap:8px;align-items:center"><span>Online naam</span><input class="coop-profiel-naam" type="text" spellcheck="false" autocomplete="off" maxlength="${v.profiel.maxLength}" placeholder="Je figuur" value="${esc(v.profiel.naam)}" style="min-width:0;flex:1;max-width:260px"></label><div class="coop-kleuren" role="group" aria-label="Kleur" style="display:flex;flex-wrap:wrap;gap:6px">${v.profiel.kleuren.map((c) => `<button type="button" class="m-bg coop-kleur" data-kleur="${c.hex}" aria-pressed="${c.hex === v.profiel.kleur}" title="${esc(c.naam)}"><span class="ss-label"><span style="color:${c.hex}" aria-hidden="true">●</span> ${esc(c.naam)}</span></button>`).join('')}</div><p class="coop-profiel-hint" style="margin:0">${esc(v.profiel.tekst)} Laat je de naam leeg, dan zien de anderen de naam van je figuur. Je staat standaard op passief: medespelers kunnen je geen schade doen.</p>${v.profiel.fout ? `<p class="coop-error" role="alert">${esc(v.profiel.fout)}</p>` : ''}</div>` : '';
    root.innerHTML =
      `<h3 class="coop-title">${esc(v.title)}</h3>` +
      v.lines.map((l) => `<p>${esc(l)}</p>`).join('') +
      prof +
      sessies +
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
  const roomTekst = () => { // de kamercode van deze sessie: die van dit paneel, of die uit de overname
    const c = String(state.code || (opts.adopt && opts.adopt.code) || '').replace(/-/g, '');
    return /^[A-HJ-NP-Z2-9]{10}$/.test(c) ? c : null;
  };
  async function startAankondiging() {
    stopAankondiging();
    const p = hub && hub.publiek ? hub.publiek() : null, room = roomTekst();
    if (!p || !room) return; // geen hub, geen kamercode of niet openbaar: niets plaatsen
    const sig = newLijstSignaler();
    aankondiger = sig;
    const maak = maakAankondiger({ naam: p.naam, versie: VERSION, proto: PROTO, room, id: p.id,
      hub: () => (hub && hub.publiek ? hub.publiek() : null) });
    const topic = await topicFor(LIJST.sleutel);
    if (aankondiger === sig) sig.kondig(topic, maak); // intussen weer privé gemaakt: niets plaatsen
  }
  function stopAankondiging() { const s = aankondiger; aankondiger = null; if (s) { try { s.close(); } catch (e) { /* weg */ } } }
  // Weer privé: de oude kamercode is openbaar geweest en werkt niet meer; wie nog kan aansluiten krijgt een nieuwe
  async function nieuweKamer() {
    room = null; wacht = false;
    if (handle && handle.cancel) handle.cancel();
    handle = null;
    if (hub && hub.vrijePlekken) await openRoom();
  }

  // ----- de lijst met openbare sessies bekijken (#438)
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
      if (kern !== l.laatste || nu - l.getekend >= 5000) { l.laatste = kern; l.getekend = nu; set({ t: 'lijst-data', lijst: rijen }); }
      if (sig.alleFout() && !state.error) set({ t: 'fout', msg: 'Er is geen verbinding met de openbare servers. Controleer je internet en probeer het later opnieuw.' });
    };
    l.ververs = () => { // Lijst verversen: geen nieuw abonnement, alleen opnieuw lezen en tekenen
      if (luis !== l) return;
      l.laatste = ''; l.getekend = Date.now();
      set({ t: 'lijst-data', lijst: lijst.lijst() });
    };
    l.timer = setInterval(tik, opts.lijstMs || 2000);
    setTimeout(tik, 400);
  }
  function stopLuisteren() { const l = luis; luis = null; if (l) { clearInterval(l.timer); try { l.sig.close(); } catch (e) { /* weg */ } } }

  // ----- gast
  const nameOf = (char) => (charInfo(char) || {}).naam || '?';
  const naamVan = (p) => (p && p.avatar && p.avatar.naam) || nameOf(p && p.char); // (#455) de online-avatar gaat voor de figuur
  function watch(sess) {
    session = sess;
    sess.onstatus = (st) => {
      set({ t: 'status', status: st, reason: sess.rejected, ander: sess.remoteVersion, partner: { slot: sess.slot } });
      if (st === 'ok') {
        if (sess.sessie) set({ t: 'sessie', sessie: sess.sessie }); // bij welke sessie je hoort (#450)
        if (!sess.lijstGezien && sess.welcome && Array.isArray(sess.welcome.lijst)) set({ t: 'spelers', lijst: sess.welcome.lijst.map((x) => ({ ...x, naam: naamVan(x) })), max: sess.welcome.max });
        if (!joinedOnce) { joinedOnce = true; if (hooks.joined) hooks.joined(ROLES.GAST); }
        if (opts.start && hooks.resumed) hooks.resumed();
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
    const bind = (tr) => { if (opts.session) { opts.session.rebind(tr); watch(opts.session); } else watch(hooks.startClient(tr, inv.route, state.wens)); };
    if (inv.route === ROUTES.DIRECT) {
      const tr = ipcTransport(api, 0);
      const r = await api.join(inv.code);
      if (!r.ok) { set({ t: 'kies', rol: ROLES.GAST }); return set({ t: 'fout', msg: r.reason }); }
      if (hooks.onCode) hooks.onCode(inv.code);
      set({ t: 'laatste-code', code: inv.code });
      return bind(tr);
    }
    handle = await joinRoom(inv.room, {
      signaler: newSignaler(), timeouts: CONFIG.TIMEOUTS,
      onstate: (s, info) => { if (s === 'fout') { set({ t: 'kies', rol: ROLES.GAST }); set({ t: 'fout', msg: info }); } },
    });
    if (hooks.onCode) hooks.onCode(inv.room.slice(0, 5) + '-' + inv.room.slice(5));
    set({ t: 'laatste-code', code: inv.room.slice(0, 5) + '-' + inv.room.slice(5) }); // wordt de gast eruit gezet, dan staat de code klaar om opnieuw aan te sluiten
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
      if (a === 'start-spel') { if (hooks.startSpel) hooks.startSpel(); if (state.rol === ROLES.HOST) set({ t: 'gate', aan: false }); } // het spel loopt: Spel starten verdwijnt (#434)
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
      else if (a === 'lijst') set({ t: 'lijst-vraag' });
      else if (a === 'lijst-go') { set({ t: 'lijst-go' }); await startLuisteren(); }
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
      else if (a.startsWith('sluit-')) set({ t: 'lijst-kies', i: +a.slice(6) });
      else if (a.startsWith('meld-')) {
        const e = state.lijst[+a.slice(5)];
        if (e && luis) { schrijfVerborgen(luis.lijst.meld(e.id)); luis.laatste = ''; luis.getekend = 0; set({ t: 'lijst-data', lijst: luis.lijst.lijst() }); }
      }
      else if (a === 'diag') set({ t: 'diag' });
      else if (a === 'diag-go') await diagnose();
      else if (a === 'diag-terug') set({ t: 'diag-terug' });
      else if (a === 'rapport') { if (navigator.clipboard) await navigator.clipboard.writeText(rapportTekst()); verbindingslog.add('rapport', 'gekopieerd'); set({ t: 'fout', msg: 'Het rapport is gekopieerd. Plak het in een bericht.' }); }
      else if (a === 'logbestand') { const d = window.gdeDesktop; if (d && d.saveTextFile) await d.saveTextFile('GDE-verbindingsrapport.txt', rapportTekst()); }
      else if (a === 'kies-host') set({ t: 'kies', rol: ROLES.HOST });
      else if (a === 'kies-gast') set({ t: 'kies', rol: ROLES.GAST });
      else if (a === 'route-kamer') set({ t: 'route', route: ROUTES.KAMER });
      else if (a === 'route-direct') set({ t: 'route', route: ROUTES.DIRECT });
      else if (a.startsWith('wens-')) set({ t: 'wens', char: a.slice(5) });
      else if (a === 'koppel') { bewaarProfiel(); set({ t: 'invoer', text: input ? input.value : '' }); }
      else if (a === 'akkoord') {
        bewaarProfiel(); // de avatar die anderen straks zien (#455), vóór de verbinding
        set({ t: 'akkoord' });
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
        // het spel aan deze speler overdragen: coophostwisselnet.js doet het werk, coophostwisselui.js tekent de vraag en de pauze
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
  root.addEventListener('change', (e) => { if (e.target && e.target.classList && e.target.classList.contains('coop-profiel-naam')) bewaarProfiel(); });
  if (hub) koppelAankondiging();
  draw();
  if (state.step === 'verbonden' && state.openbaar && hub) startAankondiging(); // een lopende openbare sessie staat weer in de lijst, met dezelfde regel (#450)
  if (state.step === 'verbroken') planAuto(AUTO_EERSTE);
  return { event: set, state: () => state, close() { cleanup(); root.innerHTML = ''; } };
}
