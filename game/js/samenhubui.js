// Samen spelen (#527): de hub met drie stappen in beeld. De regels staan in samenhub.js (getest zonder browser);
// dit bestand tekent ze en is lijm naar de bestaande lobby (lobbyui.js via samenpanel.js). Het leeft in het
// onderdeel Spel > Samen spelen van het pauzemenu en gebruikt daar de gewone knoppen (m-bp, m-bg, m-tab), zodat de
// pijlen, Tab, Enter en de muis van pausemenu.js ongewijzigd blijven werken. Escape vraagt dit scherm eerst om een
// stap terug (hubTerug) en beëindigt nooit een sessie: dat is de knop Ontsnappen naar besloten (#527).
// #903: de hub heeft een eigen kop, genummerde stappen met een verbindingslijn en keuzekaarten met een duidelijke
// stand. De gegevens blijven die van samenhub.js; dit bestand voegt geen regel toe aan het netwerk of de opslag.
import { icoon } from './icons.js';
import { keepFocus } from './focusbehoud.js';
import { braceKeysHtml } from './keycap.js';
import { STAP, STAPPEN, hubView, escapeStap, isStap, volgendeStap, vorigeStap, ACT } from './samenhub.js';
import { escapeHtml as esc } from './htmlescape.js';


// De keuzes dragen de namen die de lobby al gebruikt (data-act), zodat de co-op-testbank en een speler die de oude
// knop kent dezelfde ingang houden; data-hub-keuze is de naam waar dit scherm zelf naar luistert. "Meedoen" heet
// daarom 'kies-gast' en "Zelf openen" 'kies-host': dezelfde twee knoppen als het oude beginscherm van de lobby.
const ACT_NAAM = { [ACT.MEEDOEN]: 'kies-gast', [ACT.HOSTEN]: 'kies-host', [ACT.BESLOTEN]: 'besloten', [ACT.ALLEEN]: 'alleen', [ACT.CODE]: 'kies-gast' };

// #1222: het teken naast een keuze is een icoon uit de ene iconenset (icons.js, ADR 0041), geen los tekstteken.
const KEUZE_ICOON = { [ACT.MEEDOEN]: 'spelers', [ACT.HOSTEN]: 'plus', [ACT.BESLOTEN]: 'slot' };

// Eén hub tegelijk: dezelfde module-stand als samenkeuze.js, zodat de Escape van het pauzemenu weet of de hub
// open is zonder het DOM te hoeven vragen.
let open = null;

export const isHubOpen = () => !!open;
export const hubStap = () => (open ? open.stap() : null);
export const closeSamenHub = () => { if (open) open.close(); };

// Eén stap terug (Escape). Geeft false als de hub de toets niet gebruikt: dan doet het pauzemenu wat het altijd deed.
export function hubTerug() {
  if (!open) return false;
  const vorige = escapeStap(open.stap());
  if (!vorige) return false;
  open.zet(vorige);
  return true;
}

// opts: { sessie, meedoen, laatsteCode, gasten, genoeg, wachtOpAnder,
//         onKeuze(act), onSpelers(), onStart(), onOntsnap(), onLobby() }
export function mountSamenHub(root, opts = {}, stap = STAP.WAAR) {
  if (!root) return null;
  // het paneel kan het vak zelf zijn (.pm-samen-inner) of het onderdeel eromheen; teken altijd in dat vak
  const tree = (root.classList && root.classList.contains('pm-samen-inner')) ? root : (root.querySelector && root.querySelector('.pm-samen-inner')) || root;
  let nu = isStap(stap) ? stap : STAP.WAAR;

  const nietChip = '<span class="ds-z-chip ds-z-chip--uit pm-hub-staat">' + icoon('slot', { cls: 'ds-z-chip__icoon', maat: 's' }) + 'Kan nu niet</span>';
  const keuzes = (v) => `<div class="pm-hub-keuzes" role="group" aria-label="Waar speel je">${v.keuzes.map((k) => `
    <button type="button" class="ds-zeef ds-z-kaart ds-z-kaart--recht ${k.kan ? 'ds-z-kaart--klik' : 'ds-z-kaart--uit pm-hub-uit'} pm-hub-keuze" data-hub-keuze="${k.act}" data-act="${ACT_NAAM[k.act] || k.act}" data-keuze="${k.act}"${k.kan ? '' : ' aria-disabled="true"'}>
      <span class="pm-hub-ico" aria-hidden="true">${icoon(KEUZE_ICOON[k.act] || 'info', { maat: 'm' })}</span>
      <span class="pm-hub-kt">${esc(k.label)}</span>
      ${k.kan ? '' : nietChip}
      <small>${esc(k.uitleg)}${k.meer ? ` <span class="pm-hub-meer" title="${esc(k.meer)}">${icoon('info', { maat: 's' })}<span class="pm-sr">${esc(k.meer)}</span></span>` : ''}</small></button>`).join('')}</div>`;
  const rijen = (v) => `<ul class="pm-hub-rijen">${(v.rijen || []).map((r) => `<li data-hub-rij="${r.soort}"><span>${esc(r.tekst)}</span></li>`).join('')}</ul>`;
  const knoppen = (v) => (v.knoppen || []).map((k) => `<button type="button" class="ds-z-knop${k.primary ? ' pm-hub-primary' : ' ds-z-knop--secundair'} pm-hub-knop" data-hub-act="${k.act}"${k.disabled ? ' disabled aria-disabled="true"' : ''}>${esc(k.label)}</button>`).join('')
    + (nu === STAP.WAAR ? '' : '<button type="button" class="ds-z-knop ds-z-knop--secundair pm-hub-knop" data-hub-act="terug-stap">Vorige stap</button>');

  const teken = () => {
    const v = hubView(nu, opts);
    const stap = STAPPEN.find((s) => s.id === nu) || {};
    tree.classList.add('pm-hub');
    // De stappen zijn een wizard, geen tabs (#571): er is één zichtbare stap en de teller is een
    // statusregel die de wissel aankondigt. aria-current="step" markeert waar je staat; role="tab"
    // zou panelen beloven die er niet zijn, en "tabpanel" past niet bij één zichtbare stap.
    for (const b of tree.querySelectorAll('[data-hub-stap]')) {
      const i = STAPPEN.findIndex((s) => s.id === b.getAttribute('data-hub-stap'));
      const eigen = b.getAttribute('data-hub-stap') === nu;
      b.setAttribute('aria-current', eigen ? 'step' : 'false');
      b.setAttribute('data-staat', eigen ? 'nu' : i < STAPPEN.findIndex((s) => s.id === nu) ? 'klaar' : 'straks');
    }
    const teller = tree.querySelector('.pm-hub-teller');
    if (teller) teller.textContent = `Stap ${v.nummer} van ${v.totaal}: ${stap.hint || ''}`;
    const titel = tree.querySelector('.pm-hub-hero-t');
    if (titel) titel.textContent = stap.label || 'Samen spelen';
    const hint = tree.querySelector('.pm-hub-hero-hint');
    if (hint) hint.textContent = stap.hint || '';
    const inhoud = tree.querySelector('.pm-hub-inhoud');
    if (inhoud) {
      const restore = keepFocus(inhoud); // de knop die je net koos wordt vervangen: de focus gaat naar dezelfde plek (22-11)
      inhoud.innerHTML = `${nu === STAP.WAAR ? keuzes(v) : nu === STAP.METWIE ? rijen(v) : ''}
      <p class="pm-hub-uitleg">${esc(v.uitleg || '')}</p>
      <div class="pm-hub-knoppen">${knoppen(v)}</div>`;
      restore();
    }
  };

  // Het geraamte komt één keer in de boom: de statusregel en de inhoud wisselen van tekst, maar
  // worden niet vervangen. Een schermlezer hoort daardoor de stapwissel, en de focus blijft op de
  // gekozen stapknop staan (zonder dit begint het toetsenbord na elke stap weer bovenaan).
  const bouw = () => {
    tree.classList.add('pm-hub');
    tree.innerHTML = `
      <div class="ds-zeef ds-z-kaart ds-z-kaart--recht pm-hub-hero">
        <div class="ds-z-kaart__kop"><span class="ds-z-kaart__titel pm-hub-hero-t">Waar speel je</span><span class="pm-hub-hero-oog">Samen spelen</span></div>
        <p class="ds-z-kaart__tekst pm-hub-hero-hint"></p>
      </div>
      <div class="pm-hub-stappen" role="group" aria-label="Stappen van Samen spelen">
        ${STAPPEN.map((s, i) => `<button type="button" class="m-tab pm-hub-stap" data-hub-stap="${s.id}"${s.id === nu ? ' aria-current="step"' : ' aria-current="false"'}><span class="pm-hub-nr">${i + 1}</span>${esc(s.label)}</button>`).join('')}
      </div>
      <p class="pm-hub-teller pm-sr" id="pm-hub-teller" role="status" aria-live="polite"></p>
      <div class="pm-hub-inhoud" aria-labelledby="pm-hub-teller"></div>
      <p class="pm-hub-veilig">${braceKeysHtml('{ESC} gaat een stap terug en beëindigt nooit een sessie. Je kunt altijd terug naar je eigen spel.')}</p>`;
  };

  // De stapknoppen blijven staan; alleen de inhoud en de statusregel wisselen. Deze focus zet de
  // nadruk expliciet op de gekozen stap, zodat Tab, Enter en de pijlen van pausemenu.js daar
  // doorlopen en een klik met de muis dezelfde stand geeft als een toets.
  const focusStap = (id) => {
    const b = tree.querySelector(`[data-hub-stap="${id}"]`);
    if (b && b.focus) b.focus();
  };
  const zet = (stapNieuws) => {
    if (!isStap(stapNieuws)) return;
    nu = stapNieuws;
    teken();
    focusStap(nu);
    if (opts.onStap) opts.onStap(nu);
  };

  let handler = null;

  tree.addEventListener('click', handler = (e) => {
    const st = e.target.closest && e.target.closest('[data-hub-stap]');
    if (st) { zet(st.dataset.hubStap); return; }
    const k = e.target.closest && e.target.closest('[data-hub-keuze]');
    if (k) { if (k.getAttribute('aria-disabled') !== 'true' && opts.onKeuze) opts.onKeuze(k.dataset.hubKeuze); return; }
    const a = e.target.closest && e.target.closest('[data-hub-act]');
    if (!a) return;
    const act = a.dataset.hubAct;
    if (act === 'volgende') return zet(volgendeStap(nu));
    if (act === 'terug-stap') return zet(vorigeStap(nu));
    if (act === ACT.TERUG) return zet(STAP.WAAR);
    // De rest hoort bij de aanroeper: alleen spelen, een kamercode intypen, de spelerslijst, starten, ontsnappen.
    if (opts.onActie) opts.onActie(act);
    else if (opts.onKeuze) opts.onKeuze(act);
  });

  // Het paneel van het pauzemenu blijft staan als je naar een ander onderdeel gaat: zonder opruimen zou een tweede
  // opening de klikken dubbel tellen.
  const sluit = () => {
    if (open && open.close === sluit) open = null;
    tree.removeEventListener('click', handler);
    tree.classList.remove('pm-hub');
    tree.innerHTML = '';
  };
  open = { zet, stap: () => nu, close: sluit };
  bouw();
  teken();
  return { stap: () => nu, zet, close: sluit };
}
