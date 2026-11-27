// Uitleg met iconen en animatie (#989): het dunne component .ds-uitleg (ds-components.css). Pure model + markup, geen DOM bij het bouwen,
// zodat een test het zonder document kan nakijken. Stappen zijn data (uitlegdata.js of het UITLEG-lijstje van een light sim): een groot
// beeld (toetsplaatje of Phosphor-icoon), een korte CSS-lus en hooguit MAX_WOORDEN woorden tekst. Het toetsplaatje volgt de echte
// keymap (herbinding) en op een controller de knop (glyphs.js leest data-gk). Gaat er iets mis, dan blijft de tekst staan.
//   node scripts/uitleg_test.mjs
import { icoon, iconBekend } from './icons.js';
import { physicalKey, keyName, tokenKey, padSlotFor } from './controls.js';
import { getSettings } from './settings.js';
import { KEYS } from './storagekeys.js';
import { ANIMATIES, MAX_WOORDEN, uitlegDef } from './uitlegdata.js';
import { escapeHtml as esc } from './htmlescape.js';

const TOKEN = /\{([A-Z0-9]+)\}/g;
// #1212: de leestekst (aria-label) zegt "linkermuisknop", niet het Engelse "LMB"; de andere toetsen houden hun naam.
export const MUIS_NAMEN = Object.freeze({ LMB: 'linkermuisknop', RMB: 'rechtermuisknop', MMB: 'middelste muisknop', WHEEL: 'muiswiel', MOUSE: 'muis', DRAG: 'muis slepen' }); // keywords-ok: de leesnaam van een muisknop voor schermlezers, geen zichtbare spelertekst
export const leesTekst = (t) => String(t || '').replace(/\{([A-Z0-9]+)\}/g, (m, k) => (MUIS_NAMEN[k] || k) + ' ').replace(/\s{2,}/g, ' ').trim();
export const woordenTelling = (t) => String(t || '').replace(TOKEN, '').split(/\s+/).filter(Boolean).length;

// ---- 'niet meer tonen' per uitleg (gde-uitleg-niet-meer, alleen dit apparaat, geen savegame) ----
export function parseNietMeer(raw) {
  try { const d = JSON.parse(raw || '[]'); return new Set(Array.isArray(d) ? d.filter((x) => typeof x === 'string') : []); } catch (e) { return new Set(); }
}
export const uitlegNietMeer = (id) => { try { return typeof localStorage !== 'undefined' && parseNietMeer(localStorage.getItem(KEYS.uitlegNietMeer)).has(id); } catch (e) { return false; } };
export function zetUitlegNietMeer(id) {
  try { const s = parseNietMeer(localStorage.getItem(KEYS.uitlegNietMeer)); s.add(id); localStorage.setItem(KEYS.uitlegNietMeer, JSON.stringify([...s])); } catch (e) { /* geen opslag is geen ramp */ }
}
export function resetUitlegNietMeer() { try { localStorage.removeItem(KEYS.uitlegNietMeer); } catch (e) { /* ignore */ } }
// Staat de uitleg met iconen aan in Instellingen? (uit = de oude tekstregels)
export const uitlegIconenAan = () => { try { return getSettings().uitlegIconen !== false; } catch (e) { return true; } };

// ---- de gok op een animatie voor een stap zonder eigen `animatie` (een light sim levert alleen { icoon, tekst }) ----
export function raadAnimatie(stap) {
  const t = String(stap.tekst || '').toLowerCase();
  if (/\bhoud\b|vasthouden|\bvast\b/.test(t)) return 'houd';
  if (/muis|rond kijken|kijk rond/.test(t)) return 'stick';
  if (/\bwacht|stil|duurt|langzaam|gaat vanzelf|koelt/.test(t)) return 'vul';
  if (/\{[A-Za-z0-9]+\}/.test(String(stap.tekst || ''))) return 'druk';
  return 'beweeg';
}

// Eén stap uit de data: de { toetsen, icoon, animatie, tekst } van het model. Een sim-regel met {SPATIE} in de tekst krijgt zijn
// toets als groot beeld en de tekst zonder token (het toetsplaatje IS het woord).
export function stapModel(s, opts = {}) {
  const bron = s && typeof s === 'object' ? s : {};
  let tekst = String(bron.tekst || '');
  let toetsen = [].concat(bron.toets || []).filter((t) => typeof t === 'string' && t);
  // inline (de kaartuitleg, 21-11): de toetsen blijven als toetskap in de zin staan en het beeld is één icoon, zodat elke rij gelijk uitlijnt
  if (!toetsen.length && !opts.inline) {
    const inTekst = [...tekst.matchAll(TOKEN)].map((m) => m[1]);
    if (inTekst.length && inTekst.length <= 2) toetsen = inTekst;
    if (inTekst.length && inTekst.length <= 2) tekst = tekst.replace(TOKEN, '').replace(/^[\s:·,]+|[\s:·,]+$/g, '').replace(/\s{2,}/g, ' ').replace(/\s+([,.;:!?])/g, '$1');
  }
  const ic = bron.icoon && iconBekend(bron.icoon) ? bron.icoon : null;
  const animatie = ANIMATIES.includes(bron.animatie) ? bron.animatie : raadAnimatie({ ...bron, tekst: String(bron.tekst || '') });
  const ctx = opts.controller || 'foot';
  const binds = opts.binds || (opts.binds === null ? {} : safeBinds());
  const varianten = toetsen.map((t) => {
    let kb = t; let pad = '';
    try { kb = keyName(physicalKey(binds, tokenKey(t))) || t; pad = padSlotFor(t, ctx) || ''; } catch (e) { /* onbekende token: het token zelf */ }
    return { token: t, toetsenbord: kb, controller: pad };
  });
  return { toetsen, varianten, icoon: ic, wijs: typeof bron.wijs === 'string' ? bron.wijs : '', animatie, tekst: tekst.trim(), woorden: woordenTelling(tekst), alt: leesTekst(tekst) };
}
// De instellingen die de uitleg-markup bepalen (Uitleg met iconen aan/uit en de toetsindeling): een strook die hierop wacht, tekent opnieuw als ze wijzigen (review 21-11, simhud).
export function uitlegInstellingSleutel() { try { return (uitlegIconenAan() ? '1' : '0') + JSON.stringify(safeBinds()); } catch (e) { return ''; } }
function safeBinds() { try { return getSettings().keyBinds || {}; } catch (e) { return {}; } }

// Een uitleg-definitie (of een sim-lijstje [{ icoon, tekst }]) naar het model. Meer dan 4 stappen worden afgekapt; minder dan 1 geeft null.
export function uitlegModel(def, opts = {}) {
  const lijst = Array.isArray(def) ? def : def && Array.isArray(def.stappen) ? def.stappen : [];
  const stappen = lijst.slice(0, 4).map((s) => stapModel(s, { controller: def && def.controller, ...opts }));
  if (!stappen.length) return null;
  const meer = def && !Array.isArray(def) ? String(def.meer || '') : '';
  const titel = def && !Array.isArray(def) ? String(def.titel || '') : String(opts.titel || '');
  const id = def && !Array.isArray(def) ? String(def.id || '') : String(opts.id || '');
  return { id, titel, stappen, meer, alt: `${titel ? titel + ': ' : ''}${stappen.map((s, i) => `stap ${i + 1}, ${[...s.varianten.map((v) => MUIS_NAMEN[v.token] || v.toetsenbord), s.alt].filter(Boolean).join(' ')}`).join('; ')}` };
}

let glyph = (token) => `<span class="hud-key" data-gk="${esc(token)}">${esc(token)}</span>`;
// de HUD zet hier glyphHtml (prompts.js) in, zodat het plaatje de herbinding en de controller volgt; een test houdt de canonieke vorm
export const zetUitlegGlyph = (fn) => { if (typeof fn === 'function') glyph = fn; };
export const tekstMetToetsen = (t) => esc(t).replace(/\{([A-Z0-9]+)\}/g, (_, k) => glyph(k));

// De markup. compact: een kleiner beeld voor een HUD-strook; nietMeer: een knop 'Niet meer tonen' (alleen waar een klik kan).
export function uitlegHtml(model, opts = {}) {
  if (!model) return '';
  const rij = (s, i) => {
    const beeld = s.toetsen.length ? s.toetsen.map((t) => glyph(t)).join('') : s.icoon ? icoon(s.icoon, { cls: 'ds-uitleg__icoon' }) : '';
    const balk = s.animatie === 'houd' || s.animatie === 'vul' ? '<span class="ds-uitleg__balk" aria-hidden="true"><i></i></span>' : '';
    const rimpel = s.animatie === 'klik' ? '<span class="ds-uitleg__rimpel" aria-hidden="true"></span>' : '';
    const pijl = s.animatie === 'beweeg' || s.animatie === 'stick' ? '<span class="ds-uitleg__pijl" aria-hidden="true"></span>' : '';
    // genummerd: het cijfer staat ook bij het onderdeel dat de stap aanwijst (data-wijs; mapview.js plaatst de wijzers)
    const nr = opts.genummerd ? `<span class="ds-uitleg__nr" aria-hidden="true">${i + 1}</span>` : '';
    const wijs = s.wijs ? ` data-wijs="${esc(s.wijs)}"` : '';
    return `<li class="ds-uitleg__stap" data-anim="${esc(s.animatie)}"${wijs}>${nr}<span class="ds-uitleg__beeld" data-n="${s.toetsen.length}">${beeld}${rimpel}${pijl}${balk}</span>` +
      `<span class="ds-uitleg__tekst">${tekstMetToetsen(s.tekst)}</span></li>`;
  };
  const meer = model.meer && !opts.zonderMeer ?`<details class="ds-uitleg__meer"><summary>Meer uitleg</summary><p>${tekstMetToetsen(model.meer)}</p></details>` : '';
  const weg = opts.nietMeer && model.id ? `<button type="button" class="ds-z-knop ds-z-knop--secundair ds-uitleg__weg" data-uitleg-niet-meer="${esc(model.id)}">Niet meer tonen</button>` : '';
  return `<div class="ds-uitleg${opts.compact ? ' ds-uitleg--compact' : ''}${opts.inline ? ' ds-uitleg--rij' : ''}" role="group" aria-label="${esc(model.alt)}">` +
    (model.titel && opts.titel !== false ? `<p class="ds-uitleg__titel">${esc(model.titel)}</p>` : '') +
    `<ol class="ds-uitleg__lijst">${model.stappen.map(rij).join('')}</ol>${meer}${weg}</div>`;
}

// Gemak: een id uit uitlegdata.js (of een losse definitie) rechtstreeks naar markup; leeg als de uitleg uit staat of weggeklikt is.
export function uitlegBlok(idOfDef, opts = {}) {
  const def = typeof idOfDef === 'string' ? uitlegDef(idOfDef) : idOfDef;
  if (!def || !uitlegIconenAan()) return '';
  if (def.id && opts.nietMeer && uitlegNietMeer(def.id)) return '';
  return uitlegHtml(uitlegModel(def, opts), opts);
}

// 'Niet meer tonen' kan overal waar het component staat: een enkele gedelegeerde luisteraar.
let luistert = false;
export function startUitleg() {
  if (luistert || typeof document === 'undefined') return;
  luistert = true;
  document.addEventListener('click', (e) => {
    const b = e.target && e.target.closest && e.target.closest('[data-uitleg-niet-meer]');
    if (!b) return;
    zetUitlegNietMeer(b.dataset.uitlegNietMeer);
    const blok = b.closest('.ds-uitleg');
    if (blok) blok.remove();
  });
}
