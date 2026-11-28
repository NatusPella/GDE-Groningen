// Samen spelen (#1011): de wizard in beeld, als HTML-tekst. Geen DOM en geen netwerk hier: lobbyui.js geeft de staat,
// de view van lobby.js en een paar tekenhulpjes mee en zet het resultaat in zijn vak. Zo kan de renderproef
// (scripts/ui/multiplayerflow_meet.mjs) dezelfde HTML met de echte CSS meten. De regels staan in multiplayerwizard.js.
//
// Opbouw van elk scherm (.sw): de stappenindicator bovenaan, een titel, de inhoud (.sw-body, past zonder scrollen),
// en onderaan een vaste voetzone (.sw-voet) met de knoppen: secundair links, de hoofdactie (geel, met Enter) rechts.
// Geen alinea's: één korte regel; de rest staat achter "Meer info".
import { WSTEP, WSTEPS, WIZ_TEKST, SHORT_PER_SCREEN, CONTENT_SCREENS, SCROLL_SCREENS, wizStep, indicator, isStatusCard, splitHint, footerOrder, progressLine, SESSION_NAME_MAX, HINT_MAX } from './multiplayerwizard.js';
import { escapeHtml as esc } from './htmlescape.js';


// De acties waar de voet er hoogstens twee secundaire van toont; de rest zit achter "Meer acties" (zo blijft de voet één rij).
const VOET_SECUNDAIR_MAX = 2;

// ctx: { v, state, wz, esc?, icoon, keyTextHtml, kleurKlasse, VORM_TEKEN, EXTRA_CHARS, PROFIEL_KLEUREN, stukken: { code, chips, startHint, sessies, ww, error, uitleg, toestemming, profielFout }, uitlegOpen, meerOpen, klein }
export function wizardHtml(ctx) {
  const { v, state: s, wz, icoon } = ctx;
  const step = wizStep(s, wz);
  const statusCard = isStatusCard(s);
  const ind = indicator(s, wz);
  const kop = indicatorHtml(ind);
  let titel = v.title, kort = '', body = '', voet = [], info = [], inhoud = '', rol = false;

  if (s.step === 'start') {
    titel = WIZ_TEKST.keuze.titel; kort = WIZ_TEKST.keuze.kort;
    body = `<div class="sw-kaarten sw-kaarten--2 sw-kaarten--groot" role="group" aria-label="Wat wil je doen">
      ${choiceCard(icoon, 'spelers', 'Meedoen', 'Sluit aan bij het spel van een ander.', 'kies-gast')}
      ${choiceCard(icoon, 'plus', 'Open je spel', 'Anderen doen mee in jouw wereld.', 'kies-host')}
    </div>`;
    voet = [{ act: 'diag', label: 'Verbinding testen' }];
    info = ctx.stukken.uitleg;
    if (s.consentSaved) voet.push({ act: 'consent-vergeet', label: 'Toestemming intrekken', meer: true });
  } else if (step === WSTEP.WHO) {
    titel = WIZ_TEKST.wie.titel; kort = v.profiel ? v.profiel.tekst : WIZ_TEKST.wie.kort;
    body = wieHtml(ctx);
    voet = [{ act: 'wie-terug', label: 'Terug' }, { act: 'wie-verder', label: 'Verder', primary: true }];
    info = ['Je naam en kleur zijn wat de anderen bij je figuur zien. Je speelt lokaal je eigen verhaal.', 'Je staat standaard op passief: medespelers kunnen je geen schade doen. Je naam, kleur en die stand pas je later aan bij Spelers in het pauzemenu.', 'Laat je de naam leeg, dan zien de anderen de naam van je figuur.'];
  } else if (s.step === 'gast-typt') {
    titel = WIZ_TEKST.gast.titel; kort = WIZ_TEKST.gast.kort;
    body = gastKiezenHtml(ctx);
    voet = [{ act: 'wie-terug', label: 'Terug' }, { act: 'koppel', label: 'Verbinden', primary: true }];
    info = ['Voer de kamercode in die je van de ander kreeg, of kies een openbare sessie uit de lijst.', ...ctx.stukken.uitleg];
  } else if (s.step === 'methode') {
    titel = WIZ_TEKST.host.titel; kort = wz.openbaar ? 'Zet de sessie in de lijst, met een naam.' : WIZ_TEKST.host.kort;
    body = hostKiezenHtml(ctx);
    voet = [{ act: 'wie-terug', label: 'Terug' }, ...(s.caps.direct && !wz.openbaar ? [{ act: 'route-direct', label: 'IP-adres (direct)' }] : []), { act: 'host-open', label: 'Open je spel', primary: true }];
    info = ['Een privé sessie staat nergens in een lijst: alleen wie de kamercode kent, komt erbij. Een wachtwoord is niet verplicht.', 'Openbaar: de naam van je sessie, het aantal spelers, de versie en een sessie-id staan in de lijst. Je IP-adres, wachtwoord en kamercode staan er nooit in.'];
  } else {
    // stap 2 (lijst, toestemming, ...) en stap 3 (verbinden, wachten, verbonden, fouten) en de statuskaart: de lobby levert de inhoud
    const { kort: k1, meer } = splitHint(v.lines.slice(0, Number.isInteger(v.kern) ? v.kern : v.lines.length));
    const rest = v.lines.slice(Number.isInteger(v.kern) ? v.kern : v.lines.length);
    kort = k1; info = [...meer, ...rest];
    const pr = progressLine(s);
    if (typeof SHORT_PER_SCREEN[s.step] === 'string') { kort = SHORT_PER_SCREEN[s.step]; info = v.lines.slice(); } // de wizard zegt het kort; de volledige tekst blijft achter Meer info
    if (CONTENT_SCREENS.includes(s.step)) { kort = ''; info = []; inhoud = v.lines.map((l) => `<p class="sw-regel">${esc(l)}</p>`).join(''); } // hier ZIJN de regels de inhoud (uitslag, fout)
    if (s.step === 'verbinden') titel = WIZ_TEKST.verbinden.titel;
    if (s.rol === 'host' && ['host-maakt-code', 'host-wacht', 'toestemming'].includes(s.step)) titel = WIZ_TEKST.host.titel;
    if (s.rol === 'gast' && s.step === 'toestemming') titel = WIZ_TEKST.gast.titel;
    if (statusCard) titel = WIZ_TEKST.statuskaart.titel;
    if (SCROLL_SCREENS.includes(s.step)) rol = true;
    const progress = ['verbinden', 'host-maakt-code', 'host-wacht', 'verbroken', 'geweigerd'].includes(s.step) && pr.tekst
      ? `<p class="sw-voortgang" role="status"${pr.bezig ? ' aria-busy="true"' : ''}>${pr.bezig ? icoon('zandloper', { maat: 'm' }) + ' ' : ''}<b>${esc(pr.tekst)}</b></p>` : '';
    const st = ctx.stukken;
    const wacht = ['host-wacht', 'verbonden'].includes(s.step);
    const kopieerInBon = wacht && st.code && v.buttons.some((b) => b.act === 'kopieer' && !b.primary);
    const bon = st.code ? (kopieerInBon ? `<div class="sw-codebon">${st.code}<button type="button" class="ds-z-knop ds-z-knop--secundair coop-btn sw-knop" data-act="kopieer"><span class="ss-label">Kopieer de code</span></button></div>` : st.code) : '';
    // wie het spel opende ziet in de wachtkamer altijd of de sessie privé of openbaar is (en of er een wachtwoord op zit)
    const state = wacht && s.rol === 'host' && s.route !== 'direct'
      ? `<p class="sw-staat">${s.openbaar ? `<span class="ds-z-chip ds-z-chip--selectie">${icoon('wifi', { maat: 's' })} Openbaar: ${esc(s.openbaarNaam)}</span>` : `<span class="ds-z-chip">${icoon('slot', { maat: 's' })} Privé</span>`}${s.wachtwoord ? `<span class="ds-z-chip">${icoon('slot', { maat: 's' })} Met wachtwoord</span>` : ''}</p>` : '';
    body = [progress, inhoud, bon, state, st.chips, st.startHint, st.toestemming, st.sessies, s.step === 'openbaar-vraag' ? st.invoer : '', wacht ? '' : st.ww, st.profielFout].filter(Boolean).join('');
    voet = kopieerInBon ? v.buttons.filter((b) => b.act !== 'kopieer') : s.step === 'lijst' ? v.buttons.filter((b) => b.act !== 'koppel').map((b) => ({ ...b, primary: false })) : v.buttons; // de rijen zijn de actie; de kamercode staat in de vorige stap
  }

  // de voetzone: Terug/Stoppen links, de hoofdactie rechts; wat niet past in "Meer acties"
  const gesorteerd = footerOrder(voet);
  const primair = gesorteerd.filter((b) => b.primary);
  const rest = gesorteerd.filter((b) => !b.primary);
  const max = rest.length <= VOET_SECUNDAIR_MAX ? VOET_SECUNDAIR_MAX : 1; // een volle voet houdt één secundaire knop en zet de rest achter "Meer acties"
  const vast = rest.filter((b) => !b.meer); // een zeldzame actie (Toestemming intrekken) staat altijd achter "Meer acties"
  const visible = vast.slice(0, max), meerActies = [...vast.slice(max), ...rest.filter((b) => b.meer)];
  const knop = (b) => `<button type="button" class="ds-z-knop${b.primary ? '' : ' ds-z-knop--secundair'} coop-btn sw-knop" data-act="${b.act}"${b.primary ? ' data-primary="1"' : ''}${b.disabled ? ' disabled aria-disabled="true"' : ''}${b.busy ? ' aria-busy="true"' : ''}><span class="ss-label">${b.busy ? icoon('zandloper', { maat: 's' }) + ' ' : ''}${esc(b.label)}${b.primary && !b.disabled ? ` <span class="coop-toets">${ctx.keyTextHtml('{ENTER}')}</span>` : ''}</span></button>`;
  const meerHtml = meerActies.length ? `<details class="sw-acties"${ctx.meerOpen ? ' open' : ''}><summary class="ds-z-knop ds-z-knop--ghost sw-knop">Meer acties</summary><div class="sw-acties-lijst">${meerActies.map(knop).join('')}</div></details>` : '';
  const infoHtml = info.length ? `<details class="sw-info"${ctx.uitlegOpen ? ' open' : ''}><summary class="sw-info-knop">${icoon('info', { maat: 's' })} Meer info</summary><div class="sw-info-tekst">${info.map((l) => `<p>${esc(l)}</p>`).join('')}</div></details>` : '';
  const voetHtml = `<div class="sw-voet coop-btns" role="group" aria-label="Acties">${visible.map(knop).join('')}${infoHtml}${meerHtml}<span class="sw-voet-ruimte"></span>${primair.map(knop).join('')}</div>`;

  const kortHtml = kort ? `<p class="sw-uitleg">${esc(kort)}</p>` : '';
  const fout = s.error || wz.fout ? `<p class="sw-fout coop-error" role="alert">${esc(s.error || wz.fout)}</p>` : '';

  return `<div class="sw" data-sw-stap="${step}" data-sw-scherm="${esc(s.step)}"${statusCard ? ' data-sw-status="1"' : ''}>`
    + kop
    + `<div class="sw-kop"><h3 class="coop-title sw-titel">${esc(titel)}</h3>${kortHtml}</div>`
    + `<div class="sw-body${rol ? ' sw-body--rol' : ''}">${body}${fout}</div>`
    + voetHtml
    + '</div>';
}

function indicatorHtml(ind) {
  if (!ind.length) return '';
  return `<ol class="sw-stappen" aria-label="Stappen van Samen spelen">${ind.map((st) => `<li class="sw-stap" data-staat="${st.staat}"${st.staat === 'nu' ? ' aria-current="step"' : ''}><span class="sw-nr">${st.nr}</span><span class="sw-stap-t">${esc(st.label)}</span></li>`).join('')}</ol>`;
}

function choiceCard(icoon, ico, titel, tekst, act, { gekozen, uit } = {}) {
  return `<button type="button" class="ds-z-kaart ds-z-kaart--recht ds-z-kaart--klik sw-kaart" data-act="${act}"${gekozen != null ? ` aria-pressed="${!!gekozen}"` : ''}${uit ? ' disabled aria-disabled="true"' : ''}><span class="sw-kaart-ico" aria-hidden="true">${icoon(ico, { maat: 'l' })}</span><span class="sw-kaart-kol"><b class="sw-kaart-t">${esc(titel)}</b><span class="sw-kaart-tekst">${esc(tekst)}</span></span></button>`;
}

// ---- stap 1: Wie ben jij? naam, kleur en figuur in één compacte kaart met een live voorbeeld
function wieHtml(ctx) {
  const { v, state: s, kleurKlasse, VORM_TEKEN, EXTRA_CHARS, PROFIEL_KLEUREN, icoon } = ctx;
  const p = v.profiel || { naam: '', kleur: PROFIEL_KLEUREN[0].hex, maxLength: 16 };
  const gast = s.rol === 'gast';
  const figuur = gast && s.wens ? EXTRA_CHARS.find((c) => c.id === s.wens) : null;
  const glyph = (figuur && VORM_TEKEN[figuur.vorm]) || '●';
  const toon = p.naam || (figuur && figuur.naam) || 'Je figuur';
  const colors = PROFIEL_KLEUREN.map((c, i) => `<button type="button" class="sw-kleur ${kleurKlasse(c.hex)}" data-kleur="${c.hex}" aria-pressed="${c.hex === p.kleur}" aria-label="${esc(c.naam)}" title="${esc(c.naam)}"><span class="sw-kleur-bol" aria-hidden="true"></span><span class="sw-kleur-naam">${esc(c.naam)}</span></button>`).join('');
  const figuren = gast && ctx.v.wensen ? `<label class="sw-veld sw-figuren"><span class="sw-label">Figuur</span><select class="sw-figuur-kies" aria-label="Kies je figuur"><option value="">Standaard</option>${ctx.v.wensen.map((w) => `<option value="${esc(w.id)}"${w.gekozen ? ' selected' : ''}>${esc(w.naam)}</option>`).join('')}</select></label>` : '';
  return `<div class="sw-wie">
    <div class="sw-voorbeeld" aria-live="polite" aria-label="Zo zien de anderen je"><span class="coop-id sw-schijf ${kleurKlasse(p.kleur)}" aria-hidden="true">${glyph}</span><span class="sw-voorbeeld-naam">${esc(toon)}</span></div>
    <div class="sw-velden">
      <label class="sw-veld"><span class="sw-label">Je naam</span><input class="coop-profiel-naam" type="text" data-osk="naam" data-osk-check="online-naam" data-osk-label="Online naam" spellcheck="false" autocomplete="off" maxlength="${p.maxLength}" placeholder="Je figuur" value="${esc(p.naam)}"></label>
      <div class="sw-kleurrij" role="group" aria-label="Kleur"><span class="sw-label">Kleur</span><div class="sw-kleuren">${colors}</div></div>
      ${figuren}
    </div>
  </div>`;
}

// ---- stap 2 voor de gast: drie grote opties naast elkaar
function gastKiezenHtml(ctx) {
  const { v, state: s, wz, icoon } = ctx;
  const heeftFav = wz.favorieten > 0 && wz.rtc;
  const wijze = wz.wijze === 'code' || !wz.wijze ? 'code' : wz.wijze;
  const cards = [
    choiceCard(icoon, 'slot_open', 'Kamercode', 'Van een vriend gekregen.', 'wijze-code', { gekozen: wijze === 'code' }),
    wz.rtc ? choiceCard(icoon, 'wifi', 'Openbare sessies', 'Kies uit de lijst.', 'lijst', { gekozen: false }) : '',
    heeftFav ? choiceCard(icoon, 'ster', 'Favorieten', 'Je favoriete sessies.', 'favorieten', { gekozen: false }) : '',
  ].filter(Boolean);
  const inv = v.input || { placeholder: 'Kamercode', value: '', maxLength: 64, label: 'Kamercode' };
  const wwOpen = wz.wwOpen || !!s.wachtwoord;
  const ww = v.wachtwoord ? (wwOpen
    ? `<label class="sw-veld sw-ww"><span class="sw-label">Wachtwoord van de sessie</span><input class="coop-wachtwoord" type="password" data-osk="wachtwoord" spellcheck="false" autocomplete="off" maxlength="${v.wachtwoord.maxLength}" placeholder="Alleen als de sessie er een heeft" value="${esc(v.wachtwoord.value)}"></label>`
    : '<button type="button" class="sw-link" data-act="ww-open">Vraagt de sessie een wachtwoord?</button>') : '';
  const paneel = `<div class="sw-paneel"><label class="sw-veld"><span class="sw-label">Kamercode</span><input class="coop-input" type="text" data-osk="${esc(inv.osk || 'code')}" spellcheck="false" autocomplete="off" aria-label="${esc(inv.label || inv.placeholder)}" placeholder="Bijvoorbeeld K3J9D-8F2MN" maxlength="${inv.maxLength || 64}" value="${esc(inv.value || '')}"></label>${ww}</div>`;
  return `<div class="sw-kaarten sw-kaarten--${cards.length}" role="group" aria-label="Hoe sluit je aan">${cards.join('')}</div>${paneel}`;
}

// ---- stap 2 voor wie het spel opent: privé (standaard) of openbaar, wachtwoord optioneel
function hostKiezenHtml(ctx) {
  const { v, state: s, wz, icoon } = ctx;
  const cards = [
    choiceCard(icoon, 'slot', 'Privé', 'Alleen met de kamercode.', 'wijze-prive', { gekozen: !wz.openbaar }),
    wz.rtc ? choiceCard(icoon, 'wifi', 'Openbaar maken', 'Staat in de lijst.', 'wijze-openbaar', { gekozen: !!wz.openbaar }) : '',
  ].filter(Boolean);
  const ww = v.wachtwoord ? `<label class="sw-veld"><span class="sw-label">Wachtwoord (niet verplicht)</span><input class="coop-wachtwoord" type="password" data-osk="wachtwoord" spellcheck="false" autocomplete="off" maxlength="${v.wachtwoord.maxLength}" placeholder="Leeg: geen wachtwoord" value="${esc(v.wachtwoord.value)}"></label>` : '';
  const openbaar = wz.openbaar
    ? `<label class="sw-veld"><span class="sw-label">Naam van je sessie</span><input class="coop-sessienaam" type="text" data-osk="tekst" spellcheck="false" autocomplete="off" maxlength="${SESSION_NAME_MAX}" placeholder="Bijvoorbeeld Zomeravond" value="${esc(wz.sessienaam)}"></label>`
      + `<label class="sw-vink"><input type="checkbox" class="coop-openbaar-vink"${wz.bevestigd ? ' checked' : ''}><span>Naam, spelers en versie staan voor iedereen in de lijst.</span></label>`
    : '';
  return `<div class="sw-kaarten sw-kaarten--${cards.length}" role="group" aria-label="Wie mag meedoen">${cards.join('')}</div><div class="sw-paneel${wz.openbaar ? ' sw-paneel--2' : ''}">${ww}${openbaar}</div>`;
}

export { HINT_MAX, WSTEPS };
