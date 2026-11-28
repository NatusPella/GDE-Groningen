// Instellingen > Moeilijkheid (#1169): het niveau van deze save en de opties eronder, in het pauzemenu.
// pausemenu.js haalt hier de HTML en de bediening vandaan; dit bestand kent geen opslag en geen netwerk:
// alles gaat via difficulty.js (de actieve stand, die savegame.js in de save schrijft).
// Een optie is een kiezer (‹ waarde ›) zoals de andere instellingen en volgt dus dezelfde toetsen, muis en controller.
import { icoon } from './icons.js';
import { escapeHtml as esc } from './htmlescape.js';
import {
  DIFFICULTY, DIFFICULTY_MODES, LEVEL_TEXT, OPTION_DEFS, OPTION_GROUPS, OPTIONS_NEXT_START,
  getDifficulty, setActiveOption, resetActiveOptions, optionDef,
} from './difficulty.js';


export const DIFFICULTY_TAB_TEXT = Object.freeze({
  intro: 'Hoe pittig het is in dit spel. Het niveau stelt alle opties in de lijst in; daarna kun je elke optie zelf anders zetten.',
  levelNote: 'Je keuze geldt meteen; records en medailles zijn per niveau gescheiden. Een ander niveau zet de eigen aanpassingen terug.',
  later: 'Sommige wijzigingen gaan pas in bij de volgende missie, race of wedstrijd.',
  samen: 'Samen spelen: de wereld (politie en verkeer) kies je samen: iedereen moet akkoord zijn. Schade, hulp, quicktime-events, geld en wedstrijden zijn van jezelf.',
  story: 'Nooit weg uit het verhaal: elke missie blijft te halen, op elk niveau.',
  reset: 'Terug naar het niveau',
  custom: 'aangepast',
});

const stepLabels = (def) => def.stappen.map((s) => [String(s.v), s.label]);

// Een kiezer voor één optie. De sleutel staat in data-diffopt (niet data-setting: de waarde komt uit de save, niet uit gde-settings).
function optionRow(def) {
  const name = def.label;
  const later = OPTIONS_NEXT_START.has(def.key) ? ' Gaat in bij de volgende start.' : '';
  const scope = def.scope === 'wereld' ? ' Bij Samen spelen kiest de groep dit samen: iedereen moet akkoord zijn.' : '';
  return `<div class="m-li pm-row" data-diffopt-row="${def.key}"><span class="nm" id="pm-d-${def.key}">${esc(name)}<span class="mut">${esc(def.uitleg + later + scope)}</span></span>` +
    `<span class="m-pk" role="group" aria-labelledby="pm-d-${def.key}" data-diffopt="${def.key}" data-options="${esc(JSON.stringify(stepLabels(def)))}">` +
    `<button type="button" data-pick="-1" aria-label="${esc(name)}: vorige">${icoon('terug')}</button><output aria-live="polite"></output>` +
    `<button type="button" data-pick="1" aria-label="${esc(name)}: volgende">${icoon('volgende')}</button></span></div>`;
}

// Het niveau zelf is de gewone kiezer van de instellingen (data-setting="difficulty"): setSetting zet het niveau van de save.
export function levelPickerHtml(plain = (t) => t) {
  const options = DIFFICULTY_MODES.map((m) => [m, DIFFICULTY[m].label]);
  const name = plain('Niveau');
  return `<div class="m-li pm-row"><span class="nm" id="pm-l-difficulty">Niveau<span class="mut">${esc(DIFFICULTY_TAB_TEXT.levelNote)}</span></span>` +
    `<span class="m-pk" role="group" aria-labelledby="pm-l-difficulty" data-setting="difficulty" data-options="${esc(JSON.stringify(options))}">` +
    `<button type="button" data-pick="-1" aria-label="${esc(name)}: vorige">${icoon('terug')}</button><output aria-live="polite"></output>` +
    `<button type="button" data-pick="1" aria-label="${esc(name)}: volgende">${icoon('volgende')}</button></span></div>`;
}

// #1275: under the picker only the chosen level is explained (the picker is the one way to choose); the comparison of
// all three levels lives in the side pane (difficultyPaneHtml), not as a second row of cards that look like buttons.
function levelRows() {
  const rij = (m) => `<div class="pm-diff-row" data-diff="${m}"><b>${esc(LEVEL_TEXT[m].naam)}</b><span>${esc(LEVEL_TEXT[m].uitleg)}</span></div>`;
  return `<div class="pm-diff pm-diff-een" data-diff-now aria-live="polite">${DIFFICULTY_MODES.map(rij).join('')}</div>`;
}

// De rijen van het tabblad (de aanroeper stopt ze in een tab).
export function difficultyTabHtml() {
  const groups = OPTION_GROUPS.map(([id, naam]) => {
    const defs = OPTION_DEFS.filter((d) => d.groep === id);
    return defs.length ? `<div class="m-gh"><span>${esc(naam)}</span></div>${defs.map(optionRow).join('')}` : '';
  }).join('');
  // #1275: no wall of text before the first choice: the intro moved to the side pane, the Samen spelen rule is one chip
  return levelPickerHtml() + levelRows() +
    `<div class="m-li pm-row"><span class="nm">Eigen aanpassingen<span class="mut" data-diff-state></span></span><button type="button" class="m-bg" data-diff-reset>${esc(DIFFICULTY_TAB_TEXT.reset)}</button></div>` +
    `<p class="pm-diff-note">${esc(DIFFICULTY_TAB_TEXT.story)} ${esc(DIFFICULTY_TAB_TEXT.later)}</p>` +
    `<p class="pm-diff-note"><span class="m-chip">Samen spelen</span> ${esc(DIFFICULTY_TAB_TEXT.samen.replace(/^Samen spelen: /, ''))}</p>` +
    groups;
}

const difficultyPaneText = 'Alles wordt meteen bewaard in dit spel; een ander opgeslagen spel heeft zijn eigen niveau.';

// #1275: the side pane compares the three levels (what changes) instead of repeating the intro of the list.
export function difficultyPaneHtml() {
  const rij = (m) => `<li><b>${esc(LEVEL_TEXT[m].naam)}</b> <span class="mut">${esc(LEVEL_TEXT[m].uitleg)}</span></li>`;
  return `<p>${esc(DIFFICULTY_TAB_TEXT.intro)}</p><ul class="pm-diff-vgl" aria-label="Wat de drie niveaus doen">${DIFFICULTY_MODES.map(rij).join('')}</ul><p class="mut">${esc(difficultyPaneText)}</p>`;
}

// De waarde van een optie in de menukiezer: de stap van het profiel.
function pickerIndex(pk) {
  const options = JSON.parse(pk.dataset.options);
  const cur = String(getDifficulty().options[pk.dataset.diffopt]);
  return { options, i: Math.max(0, options.findIndex(([v]) => v === cur)) };
}

// Eén stap langs de opties van een kiezer (zonder rondgaan). Geeft true als de waarde veranderde.
export function stepDifficultyPicker(pk, dir) {
  if (!pk || pk.getAttribute('aria-disabled') === 'true') return false;
  const def = optionDef(pk.dataset.diffopt);
  if (!def) return false;
  const { i } = pickerIndex(pk);
  const next = Math.min(def.stappen.length - 1, Math.max(0, i + dir));
  if (next === i) return false;
  return setActiveOption(def.key, def.stappen[next].v);
}

// De knop "Terug naar het niveau". Geeft true als hij de klik afhandelde.
export function handleDifficultyClick(target) {
  const btn = target && target.closest ? target.closest('[data-diff-reset]') : null;
  if (!btn) return false;
  resetActiveOptions();
  return true;
}

// De kiezers, de niveaurijen en de regel "aangepast" bijwerken na elke verandering.
export function syncDifficultyTab(root) {
  if (!root) return;
  const d = getDifficulty();
  for (const pk of root.querySelectorAll('[data-diffopt]')) {
    const { options, i } = pickerIndex(pk);
    pk.querySelector('output').textContent = options[i][1];
    const [prev, next] = pk.querySelectorAll('[data-pick]');
    prev.setAttribute('aria-disabled', String(i === 0));
    next.setAttribute('aria-disabled', String(i === options.length - 1));
    const row = pk.closest('.pm-row');
    if (row) row.toggleAttribute('data-custom', Object.prototype.hasOwnProperty.call(d.custom, pk.dataset.diffopt));
  }
  for (const row of root.querySelectorAll('[data-diff-now] [data-diff]')) row.toggleAttribute('data-on', row.dataset.diff === d.level);
  const state = root.querySelector('[data-diff-state]');
  const n = Object.keys(d.custom).length;
  if (state) state.textContent = n ? `${n} ${n === 1 ? 'optie wijkt' : 'opties wijken'} af van ${DIFFICULTY[d.level].label}.` : `Alles staat zoals ${DIFFICULTY[d.level].label} het instelt.`;
  const reset = root.querySelector('[data-diff-reset]');
  if (reset) reset.setAttribute('aria-disabled', String(!n));
}
