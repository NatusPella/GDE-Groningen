// Bouwt de statische mockups van Samen spelen (ontwerp 24-11) naar <repo>/.scr/multiplayer-ontwerp/scherm/*.html (lokaal, niet in git).
// Gebruik: node docs/ontwerp/multiplayer-ui-24-11/bouw.mjs, dan node schiet.mjs (beelden) en node index.mjs (de pagina). Alleen DS3-CSS uit game/js, geen nieuwe kleur of lettertype.
// De gedeelde set van het club- en bezitontwerp (ds-z-segment, -status, -tussenkop, -stapper, -kopband, -tabel, -link) wordt uit game/js/ds-components.css gelezen als ze daar staan,
// anders uit de branch bezit-ui-24-11 (diff op integratie-0.66); bij de bouw is dat de merge van die branches.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export let ROOT = HERE;
while (!fs.existsSync(path.join(ROOT, 'game', 'js', 'ds-tokens.css'))) { const up = path.dirname(ROOT); if (up === ROOT) throw new Error('repo-root niet gevonden'); ROOT = up; }
export const WERK = path.join(ROOT, '.scr', 'multiplayer-ontwerp');
export const OUT = path.join(WERK, 'scherm');
export const GAME = path.relative(OUT, path.join(ROOT, 'game')).split(path.sep).join('/');
const { icoon } = await import(pathToFileURL(path.join(ROOT, 'game', 'js', 'icons.js')).href);
fs.mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------- hulpjes
export const I = (n, cls = '') => icoon(n, { cls: 'mp-ic ' + cls });
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const toets = (t) => `<span class="ds-z-toets">${t}</span>`;
export const knop = (t, mod = '', extra = '') => `<button type="button" class="ds-z-knop${mod ? ' ds-z-knop--' + mod : ''}${extra ? ' ' + extra : ''}">${t}</button>`;
export const klein = (t, mod = 'secundair') => knop(t, mod, 'mp-klein');
export const link = (t) => `<button type="button" class="ds-z-link">${t}</button>`;
export const tussenkop = (t, rechts = '') => `<h3 class="ds-z-tussenkop">${t}${rechts}</h3>`;
export const status = (soort, tekst, ic) => `<span class="ds-z-status ds-z-status--${soort}">${ic ? I(ic, 'mp-ic--s') : ''}${esc(tekst)}</span>`;
export const blokStatus = (label, waarde, ic, soort = '') => `<span class="ds-z-status ds-z-status--blok${soort ? ' ds-z-status--' + soort : ''}"><span class="ds-z-status__l">${esc(label)}</span><span class="ds-z-status__w">${ic ? I(ic, 'mp-ic--s') : ''}${waarde}</span></span>`;
export const seg = (opties, actief, extra = '', label = '') => `<div class="ds-z-segment ${extra}" role="radiogroup"${label ? ` aria-label="${esc(label)}"` : ''}>${opties.map(([id, t, uit]) => `<button type="button" role="radio" aria-checked="${id === actief}"${uit ? ' aria-disabled="true"' : ''}>${t}</button>`).join('')}</div>`;
export const stapper = (w) => `<span class="ds-z-stapper"><button type="button" aria-label="min">−</button><output>${w}</output><button type="button" aria-label="plus">+</button></span>`;
export const feiten = (rijen) => `<dl class="mp-feiten">${rijen.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>`;
export const notitie = (tekst, ic = 'info', mod = '') => `<div class="mp-notitie${mod ? ' mp-notitie--' + mod : ''}">${I(ic)}<span>${tekst}</span></div>`;
export const vink = (tekst, aan) => `<span class="mp-vink"><i class="${aan ? 'is-aan' : ''}">${aan ? I('vinkje', 'mp-ic--s') : ''}</i>${tekst}</span>`;

// verbinding in gewone woorden: drie streepjes en een woord, nooit milliseconden
export const SIG = { goed: 'Goed', matig: 'Matig', slecht: 'Slecht', weg: 'Weg', bezig: 'Verbindt' };
export const sig = (niveau) => `<span class="mp-sig mp-sig--${niveau}"><i><b></b><b></b><b></b></i>${SIG[niveau]}</span>`;
export const vorm = (k, glyph, mod = '') => `<span class="mp-vorm${mod ? ' mp-vorm--' + mod : ''}" style="--k:${k}" aria-hidden="true">${glyph}</span>`;
export const standTekst = (s) => (s === 'actief' ? `<span class="mp-stand mp-stand--actief">${I('zwaard', 'mp-ic--s')}Actief</span>` : `<span class="mp-stand mp-stand--passief">${I('schild', 'mp-ic--s')}Passief</span>`);

// de spelers van het scenario (verzonnen namen; kleur en vorm uit de profielkleuren en vormen van het spel, coopidentiteit.js en coopspelers.js)
export const P = [
  { id: 0, naam: 'Sem', k: '#4fb3ff', v: '●', doet: 'Loopt', plek: 'Vismarkt', afstand: '', sig: 'goed', stand: 'passief', opener: true },
  { id: 1, naam: 'Iris', k: '#5bd6a0', v: '★', doet: 'Hengelt', plek: 'Noorderplantsoen', afstand: '120 m oost', sig: 'goed', stand: 'passief' },
  { id: 2, naam: 'Tijn', k: '#f2b134', v: '✚', doet: 'Rijdt', plek: 'Zuiderdiep', afstand: '340 m zuid', sig: 'matig', stand: 'passief' },
  { id: 3, naam: 'Liv', k: '#ff9a62', v: '♥', doet: 'Weg', plek: 'laatst bij het Hoofdstation', afstand: '', sig: 'weg', stand: 'passief' },
  { id: 4, naam: 'Gijs', k: '#ff7ab8', v: '☾', doet: 'Loopt', plek: 'Grote Markt', afstand: '90 m west', sig: 'goed', stand: 'actief' },
];

export const RAIL = [['Spel', ['Spel']], ['Doen', ['Verhaal', 'Activiteiten', 'Loopbanen', 'Kaart']], ['Bezit', ['Spullen', 'Garage', 'Land en bedrijf']], ['Voortgang', ['Veroverd', 'Prestaties', 'Foto’s']], ['Systeem', ['Instellingen']]];
export function hints(lijst) {
  return `<div class="hints">${lijst.map(([t, w]) => `<span>${t.split('+').map((x) => toets(x)).join('')} ${esc(w)}</span>`).join('')}</div>`;
}
export const HINT_STD = [['↑+↓', 'kiezen'], ['Enter', 'doen'], ['Q+E', 'tabblad'], ['Esc', 'terug']];

// de tabrij van Spel: zonder sessie Overzicht, Samen spelen, Opslaan & stoppen; in een sessie vervangen Spelers, Uitnodigen en Sessie het ene tabblad Samen spelen (geen tweede tabrij meer)
export const TABS_ZONDER = [['overzicht', 'Overzicht'], ['samen', 'Samen spelen'], ['opslaan', 'Opslaan & stoppen']];
export const tabsMet = (n) => [['overzicht', 'Overzicht'], ['spelers', 'Spelers', n], ['uitnodigen', 'Uitnodigen'], ['sessie', 'Sessie'], ['praten', 'Praten · later', null, 'uit'], ['opslaan', 'Opslaan & stoppen']];

// de kopband: eyebrow, titel, onderregel en rechts de statusblokken
export function kop({ eb = 'Spel', titel = 'Samen spelen', sub = '', rechts = '' }) {
  return `<header class="ds-z-kopband"><div><div class="ds-z-kopband__eb">${esc(eb)}</div><h1 class="ds-z-kopband__titel">${esc(titel)}</h1>${sub ? `<p class="ds-z-kopband__sub">${sub}</p>` : ''}</div>${rechts ? `<div class="ds-z-kopband__rechts">${rechts}</div>` : ''}</header>`;
}
export const kopRechts = ({ n = 4, max = 8, verb = 'goed', zicht = 'Privé' } = {}) =>
  blokStatus('Spelers', `${n}<small>van ${max}</small>`, 'spelers') + blokStatus('Jouw verbinding', SIG[verb], null, verb === 'goed' ? 'goed' : verb === 'matig' ? '' : 'probleem') + blokStatus('Zichtbaar', zicht, zicht === 'Privé' ? 'slot' : 'wifi');

export function tabrij(tabs, actief) {
  return `<nav class="mp-tabs" role="tablist" aria-label="Spel"><span class="mp-tabs__q">${toets('Q')}</span>` + tabs.map(([id, t, n, uit, aandacht]) => `<button type="button" role="tab" class="mp-tab${aandacht ? ' mp-tab--aandacht' : ''}" aria-selected="${id === actief}"${uit ? ' aria-disabled="true"' : ''}>${esc(t)}${n != null ? `<small>${n}</small>` : ''}</button>`).join('') + `<span class="mp-tabs__e">${toets('E')}</span></nav>`;
}

// het pauzemenu eromheen: rail en paneel (bestaand, nagebootst); in een sessie toont Spel het aantal spelers
export function frame({ tabs = TABS_ZONDER, actief = 'samen', koptekst, inhoud, hint = HINT_STD, overlay = '', rail = 'Spel', sessieN = 0, rust = false }) {
  const railHtml = `<aside class="rail"><span class="rail__logo">GDE</span><span class="rail__datum">Vrijdag 14 augustus · 08:07</span>` +
    RAIL.map(([g, items]) => `<div class="rail__groep">${g}</div>` + items.map((t) => `<div class="rail__item"${t === rail ? ' aria-current="true"' : ''}>${t}${t === 'Spel' && sessieN ? `<small>${I('spelers', 'mp-ic--s')}${sessieN}</small>` : ''}</div>`).join('')).join('') + '</aside>';
  return `<div class="stage ds-zeef${rust ? ' ds-rustig' : ''}">${railHtml}<main class="pane">${koptekst}${tabrij(tabs, actief)}${inhoud}</main>${hints(hint)}${overlay}</div>`;
}
// een scherm van de sessie (Spelers, Uitnodigen, Sessie): kopband met drie statusblokken, tabrij, inhoud
export function sessieFrame({ actief, rol = 'opener', n = 4, verb = 'goed', zicht = 'Privé', naam = 'Zomeravond', inhoud, hint = HINT_STD, overlay = '', tabs = null, sub = null }) {
  const onderregel = sub || (rol === 'opener' ? `<b>${esc(naam)}</b> · jij opende het spel` : `<b>${esc(naam)}</b> · Sem opende het spel`);
  return frame({ tabs: tabs || tabsMet(n), actief, koptekst: kop({ sub: onderregel, rechts: kopRechts({ n, verb, zicht }) }), inhoud, hint, overlay, sessieN: n });
}

// in het spel (HUD): de schermfoto van de wereld als achtergrond
export function hudFrame({ inhoud, achtergrond = '../wereld.png', klas = '' }) {
  return `<div class="stage ds-zeef ${klas}"><div class="wereld" style="background-image:url('${achtergrond}');background-size:100% 100%"></div>${inhoud}</div>`;
}

