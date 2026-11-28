// Het dossier van Verhaal > Personages als markup (personages-ui 22-11): een vaste kop (portret, naam, rol, status), korte
// feiten met een icoon, "Samen in" als missie-chips per akte, de rest van de tekst achter "Meer". Puur: tekenreeksen in, tekenreeksen
// uit, geen DOM, zodat de test (scripts/personagedossier_test.mjs) de opbouw en het tekstdieet in Node kan nakijken.
// verhaalui.js haalt de gegevens op (personage, feiten uit characterdossiers.js, verhaalstappen) en zet het portret in de kop.
import { icoon } from './icons.js';
import { dsButtonKey, KNOP_TOETSEN } from './dsbutton.js';
import { escapeHtml as esc } from './htmlescape.js';


// Tekstdieet: wat direct zichtbaar is, blijft kort; de rest staat achter "Meer".
export const BIO_MAX = 170;      // tekens van de alinea onder de kop (op een zinsgrens)
export const FEIT_MAX = 44;      // tekens van een feit dat direct zichtbaar is
export const DUO_MAX = 100;      // tekens van "In het duo" dat direct zichtbaar is
export const PARAGRAPH_LINES = 3;  // elke zichtbare alinea telt hooguit drie regels (de meting in scripts/ui/personages_render.mjs)

// De iconen van de feitenrijen: Phosphor via icons.js (betekenisnamen uit iconmap.js).
export const FEIT_ICOON = { Leeftijd: 'taart', Woont: 'thuis', Werk: 'tas', 'Komt uit': 'plek', 'Voor Tammo': 'hart', 'Voor Tessa': 'hart' };

/** De bio in twee delen: de eerste zinnen tot BIO_MAX tekens (minstens één zin), en de rest. */
export function splitBio(bio, max = BIO_MAX) {
  const zinnen = String(bio || '').trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  let kort = '';
  let i = 0;
  while (i < zinnen.length && (i === 0 || (kort + ' ' + zinnen[i]).length <= max)) { kort = kort ? kort + ' ' + zinnen[i] : zinnen[i]; i++; }
  return { kort, rest: zinnen.slice(i).join(' ') };
}

/** De feiten (label, text) in korte (direct zichtbaar) en lange (achter Meer). */
export function splitFeiten(facts, max = FEIT_MAX) {
  const kort = [], lang = [];
  for (const f of facts || []) (String(f.text).length <= max ? kort : lang).push(f);
  return { kort, lang };
}

/** De stappen van dit personage per akte, in verhaalvolgorde: [{ akte, stappen: [{ id, title, st: 'klaar'|'nu'|'later' }] }]. */
export function actGroups(steps, ids, aktenaam) {
  const byId = new Map((steps || []).map((s) => [s.id, s]));
  const groups = [];
  for (const s of (steps || [])) {
    if (!ids.includes(s.id) || byId.get(s.id) !== s) continue;
    const akte = aktenaam(s.part) || 'Verhaal';
    let g = groups.find((x) => x.akte === akte);
    if (!g) groups.push(g = { akte, stappen: [] });
    g.stappen.push({ id: s.id, title: s.title, st: s.done ? 'klaar' : s.current ? 'nu' : 'later' });
  }
  return groups;
}

const STEP_ICON = { klaar: 'vinkje', nu: 'vlag', later: '' }; // nog niet gespeeld: geen icoon, de stippellijn zegt het
const STEP_WORD = { klaar: 'gedaan', nu: 'nu', later: 'nog niet gespeeld' };
const STEP_CLASS = { klaar: ' ds-z-chip--succes', nu: ' ds-z-chip--primair', later: ' ds-z-chip--uit' };

/** "Samen in": een rij per akte met de missies als chips. Vorm en woord zeggen de stand (gedaan, nu, nog niet gespeeld), niet de kleur alleen. */
export function togetherInHtml(groups) {
  if (!groups.length) return '';
  return '<section class="vh-samen" aria-label="Samen in"><h4 class="vh-kopje">Samen in</h4>' + groups.map((g) =>
    `<div class="vh-akte"><span class="vh-akte-n">${esc(g.akte)}</span><ul class="vh-miss">` + g.stappen.map((s) =>
      `<li><span class="ds-z-chip vh-stap${STEP_CLASS[s.st]}" data-st="${s.st}" title="${esc(s.title)} (${STEP_WORD[s.st]})">${STEP_ICON[s.st] ? icoon(STEP_ICON[s.st], { cls: 'ds-z-chip__icoon' }) : ''}<span class="vh-stap-t">${esc(s.title)}</span>${s.st === 'nu' ? '<b class="vh-stap-nu">nu</b>' : ''}<span class="vh-sr"> (${STEP_WORD[s.st]})</span></span></li>`).join('') +
    '</ul></div>').join('') + '</section>';
}

const feitHtml = (f) => `<li class="vh-feit">${icoon(FEIT_ICOON[f.label] || 'info', { cls: 'vh-feit-ic' })}<span class="vh-feit-k">${esc(f.label)}</span><span class="vh-feit-t">${esc(f.text)}</span></li>`;

/**
 * Het hele dossier van een personage dat je kent.
 * c: { id, name, role, bio, quote, relation, always } · feiten: [{ label, text }] · groups: actGroups() · stage: de binnenkant van het portretvlak
 * opties: spk (kleur), nieuw (nog niet bekeken), quoteNl (vertaling), meerOpen
 */
export function dossierHtml(c, { feiten = [], groups = [], stage = '', spk = 'var(--g)', nieuw = false, quoteNl = '', meerOpen = false } = {}) {
  const bio = splitBio(c.bio);
  const { kort, lang } = splitFeiten(feiten);
  const duoLabel = c.always ? 'In het duo' : 'Voor het duo';
  const duoKort = String(c.relation || '').length <= DUO_MAX;
  const duo = c.relation ? `<li class="vh-feit vh-feit-duo">${icoon('samen', { cls: 'vh-feit-ic' })}<span class="vh-feit-k">${duoLabel}</span><span class="vh-feit-t">${esc(c.relation)}</span></li>` : '';
  const meerInhoud = (bio.rest ? `<p class="vh-bio vh-bio-meer">${esc(bio.rest)}</p>` : '') +
    ((lang.length || (duo && !duoKort)) ? `<ul class="vh-feiten vh-feiten-lang">${lang.map(feitHtml).join('')}${duo && !duoKort ? duo : ''}</ul>` : '');
  const heeftMeer = !!meerInhoud;
  return `<article class="vh-dossier" style="--spk:${spk}" data-char-dossier="${esc(c.id)}">` +
    `<header class="vh-kop ds-zeef ds-z-kaart" aria-label="${esc(c.name)}"><div class="vh-stage" style="--spk:${spk}">${stage}</div>` +
    `<div class="vh-kop-tekst"><h3>${esc(c.name)}</h3><p class="vh-rol">${esc(c.role)}</p>` +
    `<div class="vh-status"><span class="ds-z-chip ds-z-chip--succes">${icoon('vinkje', { cls: 'ds-z-chip__icoon' })}Ontmoet</span>${nieuw ? '<span class="ds-z-chip ds-z-chip--primair vh-nieuw">Nieuw</span>' : ''}</div></div></header>` +
    `<p class="vh-bio">${esc(bio.kort)}</p>` +
    (c.quote ? `<p class="vh-quote">“${esc(c.quote)}”${quoteNl ? `<small>${esc(quoteNl)}</small>` : ''}</p>` : '') +
    ((kort.length || (duo && duoKort)) ? `<ul class="vh-feiten">${kort.map(feitHtml).join('')}${duo && duoKort ? duo : ''}</ul>` : '') +
    togetherInHtml(groups) +
    (heeftMeer ? `<div class="vh-meerblok">${dsButtonKey({ label: meerOpen ? 'Minder' : 'Meer', toets: KNOP_TOETSEN.bevestig, klasse: 'ds-z-knop ds-z-knop--secundair vh-meerknop', attrs: `data-vh-meer aria-expanded="${meerOpen ? 'true' : 'false'}"` })}<div class="vh-meer"${meerOpen ? '' : ' hidden'}>${meerInhoud}</div></div>` : '') +
    '<section class="vh-klets ds-zeef ds-z-kaart" aria-label="Klets maar"><div class="vh-phone" data-vh-phone></div></section></article>';
}

/** Het dossier van wie je nog niet kent: één mededeling, geen feiten (geen spoilers). */
export function unknownHtml(stage, spk = 'var(--g)') {
  return `<div class="vh-stage vh-stage-slot" data-locked style="--spk:${spk}">${stage}</div><p class="vh-bio">Deze persoon ontmoet je nog in het verhaal.</p>`;
}

/** "Nieuws & meldingen": wat geen personage is (Kiekdoar, meldingen). Een kop met een envelop in plaats van een portret. */
export function otherHtml() {
  return '<article class="vh-dossier" data-char-dossier="overig"><header class="vh-kop vh-kop-overig ds-zeef ds-z-kaart" aria-label="Nieuws en meldingen">' +
    `<div class="vh-stage vh-stage-icoon" aria-hidden="true">${icoon('mail', { cls: 'vh-kop-ic' })}</div>` +
    '<div class="vh-kop-tekst"><h3>Nieuws &amp; meldingen</h3><p class="vh-rol">Berichten van wie geen personage is.</p></div></header>' +
    '<section class="vh-klets ds-zeef ds-z-kaart" aria-label="Meldingen"><div class="vh-phone" data-vh-phone></div></section></article>';
}

/** De kaart in de lijst links voor Overig: een envelop en de naam, geen "…". */
export function otherCardHtml({ selected = false, nieuw = false, id = 'overig' } = {}) {
  return `<button type="button" class="vh-card${selected ? ' sel' : ''}" data-char="${esc(id)}"${nieuw ? ' data-new' : ''}><span class="vh-pic vh-pic-icoon">${icoon('mail', { cls: 'vh-kop-ic' })}</span>` +
    '<span class="vh-name vh-name-lang"><b>Nieuws &amp; meldingen</b><small>Berichten en meldingen</small></span></button>';
}
