// Eén ondertitelcomponent (23-11): elke ondertitel in het spel is een `.ds-sub` uit subtitleui.js met de stijl van
// subtitle.css. Deze test keurt een eigen ondertitel-DOM of een eigen ondertitelstijl af, zodat een nieuw
// ondertitelpunt het gedeelde component moet gebruiken. Alleen lezen, geen browser.
//   node scripts/subtitleui_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUBTITLE_LAYERS, SUBTITLE_SELECTORS, SUB_CLASS } from '../game/js/subtitlegate.js';
import { WORD_BUDGET } from '../game/js/hudtext.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JS = path.join(ROOT, 'game/js');
let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info ? ` (${info})` : ''}`); } };
const lees = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

const bronnen = fs.readdirSync(JS).filter((f) => /\.(js|css)$/.test(f)).map((f) => ({ f, tekst: lees(path.join(JS, f)) }));
const bron = (f) => bronnen.find((b) => b.f === f)?.tekst ?? '';
const css = bron('subtitle.css');
const ui = bron('subtitleui.js');

// 1. het component en zijn stylesheet bestaan en dekken de instellingen
ok(css.length > 0 && ui.length > 0, 'subtitleui.js en subtitle.css bestaan');
ok(/export function createSubtitle/.test(ui) && /export function subtitleMarkup/.test(ui) && /export function ensureSubtitleCss/.test(ui), 'de module biedt createSubtitle, subtitleMarkup en ensureSubtitleCss');
for (const regel of ['html.sub-box .ds-sub', 'html.subc-hoog .ds-sub', 'html.sub-uit .ds-sub', '--sub-scale', '--sub-vlak']) ok(css.includes(regel), `subtitle.css volgt de instelling ${regel}`);
ok(/safe-area-inset-bottom/.test(css) && /--ds-rand-hud/.test(css), 'veilige randen: de ondertitel blijft binnen de HUD-marge en de safe-area');
ok(/transition: opacity var\(--ds-m-lang\) var\(--ds-m-uit\)/.test(css), 'in en uit: opacity met de DS3-tokens (nul bij Beweging beperken)');
ok(/\.ds-sub\.on, #cine\.has-sub \.ds-sub \{ opacity: 1; \}/.test(css), 'zichtbaar via opacity 1 (inline, .on of #cine.has-sub)');

// 2. de stijl is DS3: geen losse kleur, geen eigen lettertype of lettergrootte buiten de tokens
const blok = (sel) => { const m = css.match(new RegExp('(?:^|\\n)' + sel.replace(/[.#]/g, '\\$&') + ' \\{([^}]*)\\}')); return m ? m[1] : ''; };
const kaart = blok('.ds-sub');
ok(kaart.length > 0, 'het .ds-sub-blok staat in subtitle.css');
ok(!/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), 'subtitle.css heeft geen losse kleur (hex, rgb of hsl): alleen tokens');
ok(/color: var\(--ds-c-ink-inkt\)/.test(kaart) && /background: var\(--ds-c-ink-papier\)/.test(kaart), 'tekst en vlak: inkt op papier (tokens)');
ok(/font-family: var\(--ds-font-zeef-tekst\)/.test(kaart) && /font-size: calc\(var\(--ds-sub-size\) \* var\(--sub-scale, 1\)\)/.test(kaart), 'lettertype en maat uit de tokens, met de ondertitelgrootte erin');
ok(/border: var\(--ds-lijn-zeef\) solid/.test(kaart) && /box-shadow: var\(--ds-schaduw-hard\)/.test(kaart), 'inktrand en harde schaduw uit de tokens');
ok(/width: max-content; max-width: min\(var\(--ds-sub-max\)/.test(kaart), 'één maximale breedte: --ds-sub-max, nooit breder dan het scherm min de randen');
ok(!/\b(?:font-size|bottom|max-width):\s*[^;]*[1-9]\d*px/.test(kaart.replace(/var\([^)]*\)/g, '')), 'het .ds-sub-blok heeft geen eigen px voor maat, plek of breedte');
ok((WORD_BUDGET.subtitle ?? WORD_BUDGET.ondertitel) <= 18, 'de ondertitel houdt het woordbudget (hoogstens 18 woorden)', String(WORD_BUDGET.subtitle));

// 3. elke laag van de ene-tegelijk-regel is een component: subtitlegate.js en de dragers
ok(SUB_CLASS === 'ds-sub', 'de klasse is ds-sub');
ok(SUBTITLE_LAYERS.every((id) => SUBTITLE_SELECTORS[id]), 'elke laag heeft een selector (overlayhold.js verbergt hem bij een menu of het laadscherm)');
const drager = { 'story-talk': 'storytalk.js', 'rv-sub': 'rondvaartchase.js', 'pg-sub': 'postgame.js', 'banter-sub': 'banter.js', 'radio-sub': 'radiosub.js' };
for (const [id, f] of Object.entries(drager)) ok(new RegExp(`createSubtitle\\(\\{ id: '${id}'`).test(bron(f)), `${id} is een createSubtitle in ${f}`);
ok(/class="ds-sub ds-sub--film cine-sub">' \+ subtitleMarkup\(/.test(bron('cinematics.js')), 'de filmondertitel (cine) is het component, met de gedeelde markup');
for (const [f, k] of [['intromontage.js', 'im-sub'], ['trailer.js', 'tr-sub']]) ok(new RegExp(`class="ds-sub ds-sub--film ${k}"`).test(bron(f)) && /ensureSubtitleCss\(\)/.test(bron(f)), `${k} (${f}) is het component en laadt subtitle.css`);
ok(/ensureSubtitleCss\(\)/.test(bron('soundcaptions.js')), 'geluidsondertitels delen de kaartstijl uit subtitle.css');

// 4. geen eigen ondertitel-DOM of -stijl buiten het component (dit keurt een nieuw los ondertitelpunt af)
const LOS_ID = /\.id\s*=\s*'([a-z0-9-]*(?:sub|subtitle|ondertitel|caption|talk)[a-z0-9-]*)'|createElement\([^)]*\)[\s\S]{0,120}?\bid\s*=\s*'([a-z0-9-]*(?:subtitle|ondertitel|caption)[a-z0-9-]*)'/g;
const TOEGESTAAN_ID = new Set(['sound-captions']); // geluiden, geen gesproken tekst: eigen element, kaartstijl uit subtitle.css
const eigenDom = [];
for (const { f, tekst } of bronnen) {
  if (!f.endsWith('.js') || f === 'subtitleui.js') continue;
  for (const m of tekst.matchAll(LOS_ID)) { const id = m[1] || m[2]; if (!TOEGESTAAN_ID.has(id)) eigenDom.push(`${f}: id ${id}`); }
  // een eigen ondertitel-div in een HTML-sjabloon zonder ds-sub
  for (const m of tekst.matchAll(/<div class="([^"]*)"/g)) {
    const kl = m[1].split(/\s+/);
    if (kl.some((k) => /^(?:cine|im|tr|rv|pg|bt|st|rs)-sub$/.test(k)) && !kl.includes('ds-sub')) eigenDom.push(`${f}: class ${m[1]}`);
  }
  // een ondertitel met inline plek en schaduw (de oude Object.assign(el.style, { position: 'fixed' ... textShadow }))
  if (/Object\.assign\([A-Za-z.]*[sS]ub[A-Za-z]*\.style/.test(tekst)) eigenDom.push(`${f}: inline stijl op een ondertitel`);
}
ok(eigenDom.length === 0, 'geen eigen ondertitel-DOM of inline ondertitelstijl buiten subtitleui.js', eigenDom.join(' | '));

// 5. geen tweede stijl: de oude ondertitelselectors hebben geen eigen regel meer (de stijl staat alleen in subtitle.css)
const OUD = /(?:#banter-sub|#radio-sub|#rv-sub|#pg-sub|#story-talk|\.cine-sub|\.im-sub|\.tr-sub)(?=\s*[,{:.])/;
const dubbel = [];
for (const { f, tekst } of bronnen) {
  if (f === 'subtitle.css') continue;
  // alleen css: een .css-bestand of een stylesheet-sjabloon (backticks) in een .js; zoeklijsten met quotes tellen niet
  const cssDelen = f.endsWith('.css') ? [tekst] : [...tekst.matchAll(/`([^`]*\{[^`]*\})`/g)].map((m) => m[1]);
  for (const d of cssDelen) for (const regel of d.split('\n')) if (OUD.test(regel) && /\{/.test(regel) && !/^\s*(?:\/\*|\*|\/\/)/.test(regel)) dubbel.push(`${f}: ${regel.trim().slice(0, 70)}`);
}
ok(dubbel.length === 0, 'geen dubbele ondertitelstijl: de oude ondertitelselectors staan alleen nog in subtitle.css', dubbel.slice(0, 3).join(' | '));

// 6. de kleurtokens die subtitle.css gebruikt bestaan
const tokens = lees(path.join(JS, 'ds-tokens.css'));
for (const t of new Set([...css.matchAll(/var\((--ds-[a-z0-9-]+)/g)].map((m) => m[1]))) {
  if (/^--ds-sub-/.test(t)) continue; // de eigen tokens van het component staan bovenin subtitle.css
  ok(new RegExp(`${t}:`).test(tokens), `token ${t} bestaat in ds-tokens.css`);
}

console.log(`subtitleui_test: ${n - fails}/${n} controles${fails ? ' (' + fails + ' mislukt)' : ' ok'}`);
process.exit(fails ? 1 : 0);
