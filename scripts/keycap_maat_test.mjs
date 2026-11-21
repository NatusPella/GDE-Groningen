// Toetsplaatjes als inline zetwerk (#1075, docs/KEYCAP-MAAT-21-11.md): de maat van een toets, muis of knopglyph is een factor van
// de omliggende tekst. Deze test bewaakt (1) de fontmetrics waarop de tokens rusten (Kenney Input Prompts: elke glyph staat op de
// basislijn en is 983/2048 hoog), (2) de regels in ds-keycap.css en de tokens (inline, regelhoogte 0, em-relatief, vloeren 13 en 18 px,
// plaatje <= 1.25 em in lopende tekst, geen animatie), (3) de markup van keyTextHtml (geen vaste px, toetsgroepen als nowrap-eenheid),
// (4) een lay-outmodel dat de regelbreking van zinnen met plaatjes nabootst (breedte per lettergroep, glyphbreedte uit het font, nowrap
// uit de CSS) en uitsluit dat een toetsgroep halverwege breekt of dat het plaatje de regel hoger of de volgende regel raakt, en
// (5) de px-bewaking op de context-CSS (scripts/ui/keycap_maat.mjs, ook in icon_sweep). Zonder Electron.
//   node scripts/keycap_maat_test.mjs [--toon]
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { keyTextHtml } from '../game/js/keycap.js';
import { INPUT_GLYPHS } from '../game/js/inputglyphs_data.js';
import { rulesOf, scanKeycapPx, scanSkipHints } from './ui/keycap_maat.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const rd = (p) => readFileSync(ROOT + p, 'utf8');
let fails = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };
const TOON = process.argv.includes('--toon');

// ---------- 1. fontmetrics (TTF-parser, alleen wat we nodig hebben) ----------
function parseFont(file) {
  const b = readFileSync(ROOT + 'game/fonts/input/' + file);
  const nt = b.readUInt16BE(4), t = {};
  for (let i = 0; i < nt; i++) { const o = 12 + i * 16; t[b.toString('latin1', o, o + 4)] = b.readUInt32BE(o + 8); }
  const upem = b.readUInt16BE(t.head + 18), locFmt = b.readInt16BE(t.head + 50), nh = b.readUInt16BE(t.hhea + 34);
  const c = t.cmap, nsub = b.readUInt16BE(c + 2), map = new Map();
  for (let i = 0; i < nsub; i++) {
    const so = c + b.readUInt32BE(c + 4 + i * 8 + 4), f = b.readUInt16BE(so);
    if (f === 4) {
      const sc = b.readUInt16BE(so + 6) / 2, e = so + 14, s = e + sc * 2 + 2, d = s + sc * 2, r = d + sc * 2;
      for (let k = 0; k < sc; k++) {
        const end = b.readUInt16BE(e + k * 2), st = b.readUInt16BE(s + k * 2), dl = b.readInt16BE(d + k * 2), ro = b.readUInt16BE(r + k * 2);
        for (let ch = st; ch <= end && ch < 0xffff; ch++) { let g; if (ro === 0) g = (ch + dl) & 0xffff; else { g = b.readUInt16BE(r + k * 2 + ro + (ch - st) * 2); if (g) g = (g + dl) & 0xffff; } if (g) map.set(ch, g); }
      }
    } else if (f === 12) {
      const ng = b.readUInt32BE(so + 12);
      for (let k = 0; k < ng; k++) { const o = so + 16 + k * 12, st = b.readUInt32BE(o), en = b.readUInt32BE(o + 4), g0 = b.readUInt32BE(o + 8); for (let ch = st; ch <= en; ch++) map.set(ch, g0 + ch - st); }
    }
  }
  const loca = (g) => (locFmt ? b.readUInt32BE(t.loca + g * 4) : b.readUInt16BE(t.loca + g * 2) * 2);
  return {
    upem,
    glyph(cp) {
      const g = map.get(cp); if (g == null) return null;
      const lo = loca(g), hi = loca(g + 1);
      const adv = b.readUInt16BE(t.hmtx + Math.min(g, nh - 1) * 4);
      if (lo === hi) return { adv: adv / upem, y0: 0, h: 0 };
      const o = t.glyf + lo;
      return { adv: adv / upem, y0: b.readInt16BE(o + 4) / upem, h: (b.readInt16BE(o + 8) - b.readInt16BE(o + 4)) / upem, w: (b.readInt16BE(o + 6) - b.readInt16BE(o + 2)) / upem };
    },
  };
}
const FONTS = { keys: 'input-keys.ttf', xbox: 'input-xbox.ttf', ps: 'input-ps.ttf', deck: 'input-deck.ttf' };
const SAMPLES = { keys: ['keyboard_w_outline', 'keyboard_a_outline', 'keyboard_e_outline', 'keyboard_escape_outline', 'keyboard_enter_outline', 'keyboard_arrow_up_outline'], xbox: ['xbox_button_a_outline', 'xbox_button_x_outline'], ps: ['playstation_button_cross_outline'], deck: ['steamdeck_button_a_outline'] };
const fonts = {};
for (const [set, file] of Object.entries(FONTS)) fonts[set] = parseFont(file);
const ink = (set, name) => fonts[set].glyph(INPUT_GLYPHS[set][name]);
for (const [set, names] of Object.entries(SAMPLES)) {
  for (const nm of names) {
    const g = ink(set, nm);
    ok(g && g.y0 === 0, `${set}/${nm}: de inkt staat op de basislijn (y0 = 0), dus de daling uit --ds-kc-mid is font-onafhankelijk`, JSON.stringify(g));
    ok(g && Math.abs(g.h - 983 / 2048) < 0.002 && Math.abs(g.adv - 0.5) < 0.001, `${set}/${nm}: inkthoogte 983/2048 en vooruitgang 0.5 em`, JSON.stringify(g));
  }
}
const mouseInk = ink('keys', 'mouse_left_outline') || ink('keys', 'mouse');
ok(mouseInk && Math.abs(mouseInk.h - 901 / 2048) < 0.002, 'muisglyph is 901/2048 hoog (kleiner dan een toets): optische correctie nodig', JSON.stringify(mouseInk));
const KEY_H = 983 / 2048;

// ---------- 2. tokens en componentregels ----------
const tokensCss = rd('game/js/ds-tokens.css');
const tok = (name) => { const m = new RegExp(`--${name}:\\s*([^;]+);`).exec(tokensCss.slice(tokensCss.lastIndexOf('Toetsplaatjes als inline zetwerk'))); return m ? m[1].trim() : null; };
const T = { cap: parseFloat(tok('ds-kc-cap')), ink: parseFloat(tok('ds-kc-ink')), floor: parseFloat(tok('ds-kc-floor')), mid: parseFloat(tok('ds-kc-mid')), letter: parseFloat(tok('ds-kc-letter')), letterMin: parseFloat(tok('ds-kc-letter-min')), lift: parseFloat(tok('ds-kc-lift')), gap: parseFloat(tok('ds-kc-gap')), opt: parseFloat(tok('ds-kc-opt')) };
for (const [k, v] of Object.entries(T)) ok(Number.isFinite(v), `token --ds-kc-${k} staat in ds-tokens.css`, String(v));
ok(Math.abs(T.ink - KEY_H) < 0.005, `--ds-kc-ink (${T.ink}) volgt de fontinkt (${KEY_H.toFixed(3)})`);
ok(T.cap <= 1.25, `in lopende tekst is het plaatje hoogstens 1.25 em (nu ${T.cap})`);
ok(T.floor >= 18 && T.letterMin >= 13, `vloeren: plaatje minstens 18 px (${T.floor}), letter minstens 13 px (${T.letterMin})`);
ok(T.letter * 16 >= 12 && T.cap / T.letter > 1, 'tekstplaatje: letter kleiner dan het plaatje');
T.drop = T.ink * (T.mid / T.cap - 0.5); // de daling uit de CSS-formule, in glyph-em
const TEXT_MID = 0.30; // halve letterhoogte van gemengde tekst (x-hoogte 0.5, kapitaal 0.7), in tekst-em boven de basislijn
const centre = (cap) => (cap / T.ink) * (T.drop + T.ink / 2); // midden van het glyph boven de basislijn, in tekst-em
ok(Math.abs(centre(T.cap) - TEXT_MID) < 0.04, `het glyph staat op de halve letterhoogte van de regel (${centre(T.cap).toFixed(3)} em, doel ${TEXT_MID})`);
ok(Math.abs(centre(1.5) - TEXT_MID) < 0.08, `ook in een hintrij (cap 1.5): ${centre(1.5).toFixed(3)} em`);
const kcCss = rd('game/js/ds-keycap.css');
const kcRules = rulesOf(kcCss);
const ruleFor = (selPart) => kcRules.find((r) => r.sel.split(',').some((s) => s.trim() === selPart));
const decl = (r, prop) => { const m = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(r.body); return m ? m[1].trim() : null; };
const glyphRule = ruleFor('.pad-g.pad-kn');
ok(glyphRule, 'ds-keycap.css heeft de glyphregel .pad-g.pad-kn');
if (glyphRule) {
  ok(/^inline\b/.test(decl(glyphRule, 'display')), 'glyph: display inline (staat in de regel, geen blok)');
  ok(/^0\b/.test(decl(glyphRule, 'line-height')), 'glyph: line-height 0, de regel wordt er niet hoger van');
  ok(/var\(--ds-kc-mid\)/.test(decl(glyphRule, 'vertical-align')) && /1em/.test(decl(glyphRule, 'vertical-align')), 'glyph: vertical-align komt uit --ds-kc-mid (in glyph-em)');
  const fs = decl(glyphRule, 'font-size');
  ok(/var\(--ds-kc-cap\)/.test(fs) && /var\(--ds-kc-ink\)/.test(fs) && /var\(--ds-kc-floor\)/.test(fs) && /1em/.test(fs), 'glyph: font-size = cap / ink in tekst-em, met de vloer uit --ds-kc-floor', fs);
  ok(/!important/.test(decl(glyphRule, 'font-size')), 'glyph: font-size !important (contextregels als "#hud .hc-text span" raken ook de plaatjes)');
  ok(/letter-spacing:\s*0/.test(glyphRule.body), 'glyph: erft de letterspatiëring van de tekst niet');
  ok(!/\d+px/.test(glyphRule.body.replace(/var\(--ds-kc-floor\)/g, '')), 'glyph: geen px in de regel');
}
const plateRule = kcRules.find((r) => r.sel.startsWith('.hud-key:not(.is-kbg)'));
ok(plateRule, 'ds-keycap.css heeft de tekstplaatregel (toets zonder glyph)');
if (plateRule) {
  ok(/inline-block/.test(decl(plateRule, 'display')), 'tekstplaatje: inline-block');
  ok(/var\(--ds-kc-letter-min\)/.test(decl(plateRule, 'font-size')), 'tekstplaatje: letter met vloer 13 px (--ds-kc-letter-min)');
  ok(/var\(--ds-kc-floor\)/.test(decl(plateRule, 'min-height')), 'tekstplaatje: minimaal 18 px hoog');
  ok(/var\(--ds-kc-lift\)/.test(decl(plateRule, 'vertical-align')), 'tekstplaatje: vertical-align uit het token');
  ok(/nowrap/.test(decl(plateRule, 'white-space')), 'tekstplaatje: nowrap');
  ok(!/box-shadow|border-bottom/.test(plateRule.body), 'tekstplaatje: geen schaduw of diepte in lopende tekst');
}
const nowrapSel = (cls) => kcRules.some((r) => r.sel.split(',').some((s) => s.includes(cls)) && /white-space:\s*nowrap/.test(r.body));
for (const c of ['.ds-kc-eenheid', '.hud-wasd', '.pad-g.pad-kn', '.hud-mouse-g']) ok(nowrapSel(c), `${c} is nowrap in ds-keycap.css`);
ok(!/animation|transition/.test(kcCss.replace(/\/\*[\s\S]*?\*\//g, '')), 'ds-keycap.css heeft geen animatie of overgang (Rustig drukwerk, verminderde beweging)');
ok(!/box-shadow|text-shadow/.test(kcCss.replace(/\/\*[\s\S]*?\*\//g, '')), 'ds-keycap.css: geen schaduw (de context geeft kleur en schaduw)');
const rowRule = kcRules.find((r) => /--ds-kc-cap:\s*1\.5/.test(r.body));
ok(rowRule && /\.m-foot/.test(rowRule.sel) && /\.ctx-glyphs/.test(rowRule.sel), 'hintrijen (voetbalk, HUD-hints) hebben een eigen cap 1.5 via het token');
ok(/index\.html/ && /ds-keycap\.css/.test(rd('game/index.html')), 'index.html laadt ds-keycap.css');
ok(/ds-keycap\.css/.test(rd('game/js/shopui.js')), 'het winkelvenster laadt ds-keycap.css');
ok(rd('game/index.html').indexOf('ds-keycap.css') > rd('game/index.html').indexOf('ds-tokens.css'), 'ds-keycap.css volgt op ds-tokens.css');

// ---------- 3. markup ----------
const SENT = [
  'Houd {SPACE} ingedrukt om te rennen',
  '{W}{A}{S}{D} sturen, {SPACE} klapwieken',
  'Landingsgestel uit met {G}!',
  'Gas: {W}. Stijgen: {SPACE}. Rollen: {A} / {D}.',
  'Gas: {W}. Stijgen: {SPACE}. Rollen: {A}/{D}. Kleppen: {K}. Gestel: {G}. Landen: zacht.',
  '{W} en {S} gas · {A} en {D} rollen · {ARROWUP}/{SPACE} neus omhoog · {Q} en {E} roer · {SHIFT} remmen op de baan · {K} kleppen · {G} landingsgestel',
  'Schiet met {SHIFT} + {LMB}, richt met {MOUSE}.',
  'Druk op E om met Roelf te praten',
  'Druk [E] om te praten',
];
for (const s of SENT) {
  const h = keyTextHtml(s);
  ok(!/\sstyle=|\swidth=|\sheight=/.test(h.replace(/<svg[^>]*>/g, '')), `markup zonder style/width/height: ${s}`);
  ok(!/\d\s?px\b/.test(h), `markup zonder px: ${s}`);
  ok(!/[{}]/.test(h.replace(/<[^>]*>/g, '')), `geen losse accolades over: ${s}`);
  ok(!/[\u0001\u0002]/.test(h), `geen markers over: ${s}`);
  const open = (h.match(/<span/g) || []).length, close = (h.match(/<\/span>/g) || []).length;
  ok(open === close, `evenveel <span> als </span>: ${s}`);
}
const html = (s) => keyTextHtml(s);
ok(/<span class="ds-kc-eenheid">[^<]*<span[^>]*data-gk="A"[\s\S]*?data-gk="D"[\s\S]*?<\/span><\/span>\./.test(html('Rollen: {A} / {D}.')), '{A} / {D} is één nowrap-eenheid');
ok(/<span class="ds-kc-eenheid">[^<]*<span[^>]*data-gk="A"[\s\S]*?data-gk="D"/.test(html('Rollen: {A}/{D}.')), '{A}/{D} (zonder spaties) is één nowrap-eenheid');
ok(/ds-kc-eenheid">[\s\S]*?data-gk="SHIFT"[\s\S]*?data-gk="LMB"/.test(html('Schiet met {SHIFT} + {LMB}')), 'modifier + toets is één eenheid');
ok(/<span class="hud-wasd"/.test(html('{WASD} sturen')) && nowrapSel('.hud-wasd'), '{WASD} is een eigen nowrap-eenheid (vier toetsen naast elkaar)');
ok(/ds-kc-eenheid">Druk op <span/.test(html('Druk op E om')), '"Druk op E" is één eenheid (woorden en toets)');
ok(/ds-kc-eenheid">ingedrukt <span|ds-kc-eenheid">Houd <span/.test(html('Houd {SPACE} ingedrukt')), 'het woord voor het plaatje hangt eraan vast');

// ---------- 4. lay-outmodel ----------
// de regels uit de CSS die het model nodig heeft: welke elementen nowrap zijn
const NOWRAP = new Set();
for (const r of kcRules) if (/white-space:\s*nowrap/.test(r.body)) for (const s of r.sel.split(',')) { const m = /\.([\w-]+)/.exec(s.trim()); if (m) NOWRAP.add(m[1]); }
const W = (ch) => (/[iljtf.,:;'!|()\[\]/]/.test(ch) ? 0.3 : /[mwMW]/.test(ch) ? 0.85 : /[A-Z]/.test(ch) ? 0.62 : /\d/.test(ch) ? 0.52 : ch === ' ' ? 0.27 : 0.5);
const textW = (s) => [...s].reduce((a, c) => a + W(c), 0);
const keysAdv = (cls, set) => (/pad-mouse/.test(cls) ? 778 / 2048 : 0.5);
function scale(ctx, cls) { // glyph-schaal in tekst-em (zoals de font-size-regel)
  const opt = T.opt;
  return Math.max((ctx.cap / T.ink) * opt, (ctx.floor / ctx.fs / T.ink) * opt);
}
// HTML -> lijst van tokens: { t:'tekst', s } | { t:'box', w, label, kind } | { t:'in', nowrap } | { t:'uit' }
function tokenize(h, ctx) {
  const out = [], stack = [];
  const re = /<(\/?)(span|svg|path|rect|b)([^>]*?)(\/?)>|([^<]+)/g;
  let m;
  let skip = 0;
  while ((m = re.exec(h))) {
    if (m[5] !== undefined) { if (!skip) out.push({ t: 'tekst', s: m[5].replace(/&amp;/g, '&') }); continue; }
    const [, closing, tag, attrs, selfc] = m;
    if (closing) {
      const top = stack.pop();
      if (!top) continue;
      if (top.skipRoot) skip--;
      if (top.group) out.push({ t: 'uit' });
      if (top.plate) { out.push({ t: 'box', kind: 'plaat', label: top.plateText, w: Math.max(ctx.cap, ctx.floor / ctx.fs, textW(top.plateText) * T.letter + 0.8), nowrap: true }); }
      continue;
    }
    if (tag === 'svg' || tag === 'path' || tag === 'rect') { if (tag === 'svg') { out.push({ t: 'box', kind: 'muis', label: '(muis)', w: ctx.cap * 0.7 + 2 * T.gap * 0.5, nowrap: true }); skip++; stack.push({ skipRoot: true }); } continue; }
    const cls = (/class="([^"]*)"/.exec(attrs) || [])[1] || '';
    const el = { cls };
    if (/\bds-kc-eenheid\b/.test(cls)) { el.group = true; out.push({ t: 'in', nowrap: NOWRAP.has('ds-kc-eenheid') }); }
    else if (/\bhud-wasd\b/.test(cls)) { el.group = true; out.push({ t: 'in', nowrap: NOWRAP.has('hud-wasd') }); }
    else if (/\bpad-kn\b/.test(cls)) {
      const set = (/data-set="(\w+)"/.exec(attrs) || [])[1] || 'keys';
      const s = scale(ctx, cls);
      const label = (/aria-label="([^"]*)"/.exec(attrs) || [])[1] || '?';
      out.push({ t: 'box', kind: 'glyph', label, w: s * (keysAdv(cls, set) + 2 * T.gap), nowrap: NOWRAP.has('pad-kn') || NOWRAP.has('pad-g'), cls });
      el.skipRoot = true; skip++;
    } else if (/\bhud-key\b/.test(cls) && !/\bis-(kbg|pad)\b/.test(cls)) { el.plate = true; el.plateText = ''; el.skipRoot = true; skip++; const idx = out.length; el.collect = idx; }
    stack.push(el);
  }
  return out;
}
// regelbreking: breekmogelijkheden zijn spaties buiten een nowrap-groep; een groep zonder nowrap breekt dus wel
function layout(tokens, widthEm) {
  const items = []; // { w, label, group, brk:boolean (spatie ervoor) }
  let depth = [], gid = 0, pendingSpace = false;
  for (const tk of tokens) {
    if (tk.t === 'in') { depth.push({ id: ++gid, nowrap: tk.nowrap }); continue; }
    if (tk.t === 'uit') { depth.pop(); continue; }
    const g = depth.length ? depth[depth.length - 1] : null;
    const push = (w, label, extra) => { items.push({ w, label, gid: g ? g.id : 0, gnowrap: g ? g.nowrap : false, space: pendingSpace, ...extra }); pendingSpace = false; };
    if (tk.t === 'box') { push(tk.w, '[' + tk.label + ']', { box: true }); continue; }
    // tekst: woorden en spaties
    const parts = tk.s.split(/( )/);
    for (const p of parts) {
      if (p === ' ') { pendingSpace = true; continue; }
      if (p === '') continue;
      push(textW(p), p, {});
    }
  }
  // greedy
  const lines = [[]]; let x = 0;
  // een breekmogelijkheid ligt voor een item met een spatie ervoor, tenzij het item en zijn voorganger in dezelfde nowrap-groep staan
  const lineIdx = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i], prev = items[i - 1];
    const canBreak = it.space && !(prev && it.gid && prev.gid === it.gid && it.gnowrap);
    const sp = it.space ? W(' ') : 0;
    // woord = dit item plus alle volgende zonder breekmogelijkheid
    let wordW = it.w, j = i + 1;
    while (j < items.length && !(items[j].space && !(items[j - 1].gid && items[j].gid === items[j - 1].gid && items[j].gnowrap))) { wordW += items[j].w + (items[j].space ? W(' ') : 0); j++; }
    const first = i === 0 || lines[lines.length - 1].length === 0;
    const startOfWord = i === 0 || canBreak || !it.space && !(prev && !items[i - 1]);
    if (canBreak || i === 0 || it.space === false && false) { /* begin van een woord */ }
    if (canBreak && lines[lines.length - 1].length && x + sp + wordW > widthEm) { lines.push([]); x = 0; }
    x += (lines[lines.length - 1].length ? sp : 0) + it.w;
    lines[lines.length - 1].push(it);
    lineIdx[i] = lines.length - 1;
  }
  return { lines, items, lineIdx };
}
const render = (lines) => lines.map((l) => l.map((i, k) => (k && i.space ? ' ' : '') + i.label).join('')).join(' / ');

// contexten: tekstgrootte (px), regelhoogte, cap, vloer, breedte (px); fs en lh zoals de CSS ze op 1280x720 geeft
const CTX = [
  { naam: 'doelkaart / hintkaart (.hc-text, 16 px, lh 1.3)', fs: 16, lh: 1.3, cap: T.cap, floor: T.floor, px: [220, 300, 360] },
  { naam: 'uitleg (.ds-uitleg__tekst, 16 px, lh 1.3)', fs: 16, lh: 1.3, cap: T.cap, floor: T.floor, px: [200, 260, 340] },
  { naam: 'uitleg compact (13 px)', fs: 13, lh: 1.3, cap: T.cap, floor: T.floor, px: [200, 260] },
  { naam: 'ondertitel (#cine .cine-sub, 21 px, lh 1.4)', fs: 21, lh: 1.4, cap: T.cap, floor: T.floor, px: [420, 600, 820] },
  { naam: 'missiekaart / doelregel (16 px)', fs: 16, lh: 1.3, cap: T.cap, floor: T.floor, px: [240, 320] },
  { naam: 'titel (24 px)', fs: 24, lh: 1.1, cap: T.cap, floor: T.floor, px: [360, 520] },
  { naam: 'tooltip / laadtip (14 px)', fs: 14, lh: 1.35, cap: T.cap, floor: T.floor, px: [180, 260, 340] },
];
const SIZES = [0.55, 0.7, 0.85, 1, 1.2];
for (const ctx of CTX) {
  for (const s of SENT) {
    const h = keyTextHtml(s);
    const tk = tokenize(h, ctx);
    const boxes = tk.filter((t) => t.t === 'box');
    ok(boxes.length > 0, `model ziet de plaatjes in: ${s}`);
    for (const px of ctx.px) {
      for (const f of SIZES) {
        const widthEm = (px * f) / ctx.fs;
        const { lines, items, lineIdx } = layout(tk, widthEm);
        // groepen: alle items van een groep op dezelfde regel (als de groep op een regel past)
        const byG = new Map();
        items.forEach((it, i) => { if (it.gid) { const g = byG.get(it.gid) || { idx: [], w: 0 }; g.idx.push(i); g.w += it.w + (it.space ? W(' ') : 0); byG.set(it.gid, g); } });
        for (const g of byG.values()) {
          const regels = new Set(g.idx.map((i) => lineIdx[i]));
          if (g.w <= widthEm) ok(regels.size === 1, `[${ctx.naam}] ${px * f | 0} px: een toetsgroep breekt niet halverwege: ${s}`, render(lines));
        }
        // geen regel begint met een scheidingsteken van een toetsgroep ('/', '+', 'en') of een los leesteken na een plaatje
        for (const l of lines.slice(1)) ok(!/^[/+]$/.test(l[0] ? l[0].label : ''), `[${ctx.naam}] ${px * f | 0} px: een regel begint niet met een scheidingsteken: ${s}`, render(lines));
        // een plaatje staat nooit alleen op zijn regel als zijn voorgaande woord op de vorige regel blijft ('om te rennen' mag, 'Houd' + plaatje niet gescheiden)
        for (let i = 1; i < items.length; i++) {
          const it = items[i];
          if (it.box && items[i - 1] && items[i - 1].space === false && items[i - 1].gid === 0 && !items[i - 1].box && /[A-Za-z]$/.test(items[i - 1].label) && it.space === false) ok(lineIdx[i] === lineIdx[i - 1], 'plaatje direct achter een woord (zonder spatie) blijft bij dat woord', s);
        }
      }
    }
    // regelhoogte: het glyph (regelhoogte 0) maakt de regel niet hoger; het plaatje raakt de volgende regel niet
    const sGl = scale(ctx, 'pad-kn');
    const centre1 = sGl * (T.drop + T.ink / 2);
    const inkTop = centre1 + (sGl * T.ink) / 2, inkBottom = centre1 - (sGl * T.ink) / 2; // t.o.v. de basislijn, in tekst-em
    const aboveStrut = 0.8 + (ctx.lh - 1) / 2, belowStrut = 0.2 + (ctx.lh - 1) / 2;
    const clearance = ctx.lh - 0.7 - (-inkBottom);   // ruimte tussen de onderkant van het plaatje en de bovenkant van de hoofdletters van de volgende regel
    ok(clearance >= -0.02, `[${ctx.naam}] het plaatje raakt de volgende regel niet (ruimte ${clearance.toFixed(2)} em)`);
    const plate = boxes.find((b) => b.kind === 'plaat');
    if (plate) ok(inkTop <= aboveStrut + 0.01 && -inkBottom <= belowStrut + 0.01, `[${ctx.naam}] het tekstplaatje maakt de regel niet hoger`);
  }
}
// regelhoogte per context: hoe ver steekt het plaatje buiten de regelstrut (alleen inkt, geen verplaatsing van tekst)
const STRUT_NOTE = CTX.map((ctx) => { const s = scale(ctx, 'pad-kn'); const c = s * (T.drop + T.ink / 2); const top = c + (s * T.ink) / 2, bot = -(c - (s * T.ink) / 2); const above = 0.8 + (ctx.lh - 1) / 2, below = 0.2 + (ctx.lh - 1) / 2; return `${ctx.naam}: plaatje ${Math.max(ctx.cap * ctx.fs, ctx.floor).toFixed(1)} px, boven de strut ${Math.max(0, top - above).toFixed(2)} em, onder ${Math.max(0, bot - below).toFixed(2)} em`; });

// de drie voorbeelden van de eigenaar, als tekstmodel
function toon(titel, s, ctx, px) {
  const { lines } = layout(tokenize(keyTextHtml(s), ctx), px / ctx.fs);
  return `${titel} (${ctx.naam.split(' (')[0]}, ${px} px breed)\n` + lines.map((l) => '  | ' + l.map((i, k) => (k && i.space ? ' ' : '') + i.label).join('')).join('\n');
}
const uitlegCtx = CTX[1];
const VOORB = [
  toon('1. Kist Kees-instaptip (UITLEG_INSTAPPEN)', 'Gas: {W}. Stijgen: {SPACE}. Rollen: {A}/{D}. Kleppen: {K}. Gestel: {G}. Landen: zacht.', uitlegCtx, 260),
  toon('1b. dezelfde tip, smal', 'Gas: {W}. Stijgen: {SPACE}. Rollen: {A}/{D}. Kleppen: {K}. Gestel: {G}. Landen: zacht.', uitlegCtx, 200),
  toon('2. bediening in een hintkaart', '{W} en {S} gas · {A} en {D} rollen · {ARROWUP}/{SPACE} neus omhoog · {Q} en {E} roer', CTX[0], 300),
  toon('3. ondertitel', 'Houd {SPACE} ingedrukt om te rennen, {W}{A}{S}{D} sturen.', CTX[3], 420),
];
// de eerste regel van voorbeeld 1b mag eindigen op 'Rollen: [A]/[D].', maar 'D' staat nooit alleen op een nieuwe regel
{
  const { lines } = layout(tokenize(keyTextHtml('Gas: {W}. Stijgen: {SPACE}. Rollen: {A}/{D}. Kleppen: {K}. Gestel: {G}. Landen: zacht.'), uitlegCtx), 200 / uitlegCtx.fs);
  const alleenD = lines.some((l) => l.length === 1 && /\[D\]/.test(l[0].label));
  ok(!alleenD, 'Kist Kees-instaptip: [D] staat nooit alleen op een nieuwe regel');
  ok(lines.every((l, i) => i === 0 || !/^\[D\]/.test(l[0] ? l[0].label : '')), 'Kist Kees-instaptip: een regel begint niet met [D] van "A/D"');
}
// de modelcontrole is niet vacuüm: zonder nowrap breekt de groep wel
{
  const saved = new Set(NOWRAP);
  NOWRAP.delete('ds-kc-eenheid');
  const s = 'Gas: {W}. Stijgen: {SPACE}. Rollen: {A} / {D}. Kleppen: {K}.';
  let gesplitst = false;
  for (let px = 120; px <= 400 && !gesplitst; px += 8) {
    const { items, lineIdx } = layout(tokenize(keyTextHtml(s), uitlegCtx), px / uitlegCtx.fs);
    const g = new Map();
    items.forEach((it, i) => { if (it.gid) { const a = g.get(it.gid) || new Set(); a.add(lineIdx[i]); g.set(it.gid, a); } });
    if ([...g.values()].some((a) => a.size > 1)) gesplitst = true;
  }
  ok(gesplitst, 'lay-outmodel: zonder nowrap voor .ds-kc-eenheid zou een toetsgroep wel breken (de test kan falen)');
  for (const c of saved) NOWRAP.add(c);
}

// ---------- 5. de px-bewaking zelf ----------
{
  const dir = mkdtempSync(tmpdir().replace(/\\/g, '/') + '/kcmaat-');
  writeFileSync(dir + '/x.css', '#hud .nieuw .hud-key { min-width: 26px; height: 26px; }\n.m-kc { height: 32px; }\n#hud .tekst .hud-key { margin: 0 2px; }\n.anders { width: 10px; }\n@media (max-width: 700px) { .pad-g.pad-kn { font-size: 28px; } }\n');
  const hits = scanKeycapPx(dir + '/');
  ok(hits.length === 4, 'px-bewaking vindt de nieuwe plekken met een vaste px-maat (min-width, height, margin, font-size) en laat .m-kc en .anders met rust', JSON.stringify(hits));
  writeFileSync(dir + '/x.css', '#hud .nieuw .hud-key { min-width: max(1.2em, var(--ds-kc-floor)); height: 1.25em; margin: 0 0.1em; }\n.pad-g.pad-kn { font-size: max(calc(1.25em / 0.48), 38px); }\n');
  ok(scanKeycapPx(dir + '/').length === 0, 'px-bewaking laat em-maten en px in een max()-vloer toe');
  writeFileSync(dir + '/x.css', ['#cine .cine-skip { display: flex; align-items: flex-end; }', '#x .hx-skip .hud-key { vertical-align: middle; }', '#cine .cine-skip-ring { vertical-align: middle; }', '#y .ls-skip { display: block; text-align: center; }'].join(' '));
  const sk = scanSkipHints(dir + '/');
  ok(sk.length === 3 && sk.every((x) => !/ring|ls-skip/.test(x.sel)), 'skip-bewaking vindt flex, align-items en vertical-align op een overslaan-hint en laat de ring en een blokcontainer met rust', JSON.stringify(sk));
  rmSync(dir, { recursive: true, force: true });
}
const real = scanKeycapPx();
for (const x of real.slice(0, 15)) console.log(`  ${x.f}: ${x.sel} { ${x.prop}: ${x.value} }`);
const realSkip = scanSkipHints();
for (const x of realSkip) console.log(`  ${x.f}: ${x.sel} { ${x.prop}: ${x.value} }`);
ok(realSkip.length === 0, `overslaan-hints (cine, heist, verhaal, trailer) zijn lopende tekst: geen flex, align-items of vertical-align (${realSkip.length})`);
ok(real.length === 0, `de game-CSS heeft geen vaste px-maat voor een toetsplaatje (${real.length})`);

// ---------- 6. inkthoogte per glyph, vaste fontmetrics, flexrijen op de basislijn (#1075, overslaan-hint 21-11) ----------
{
  const ink = await import('./input_glyph_ink.mjs');
  const uit = ink.meetUit();
  const lf = (x) => x.replace(/\r\n/g, '\n');
  ok(lf(rd('game/js/inputglyphs_ink.js')) === ink.jsTekst(uit), 'inputglyphs_ink.js klopt met de fonts (node scripts/input_glyph_ink.mjs)');
  ok(lf(rd('game/js/ds-keycap.css')) === ink.cssMet(lf(rd('game/js/ds-keycap.css')), uit), 'het ink-blok in ds-keycap.css klopt met de fonts');
  ok(uit.keys[(INPUT_GLYPHS.keys.keyboard_space_outline).toString(16)] === 573, 'Spatie is 573/2048 hoog: een lage toets krijgt data-ink');
  const { glyphHtml } = await import('../game/js/keycap.js');
  ok(/data-ink="573"/.test(glyphHtml('SPACE')) && !/data-ink/.test(glyphHtml('W')), 'glyphHtml: Spatie heeft data-ink, W (standaardhoogte) niet');
  ok(/data-ink="901"/.test(glyphHtml('LMB')), 'de muisglyph heeft data-ink (901): even hoge inkt als een toets');
  const fontsCss = rd('game/fonts/fonts.css');
  for (const fam of ['GDE Toetsen', 'GDE Knoppen A', 'GDE Knoppen B', 'GDE Knoppen Deck', 'GDE Knoppen Algemeen', 'GDE Aanraking']) {
    const regel = fontsCss.split('\n').find((l) => l.includes(`font-family: '${fam}'`)) || '';
    ok(/ascent-override:\s*10%/.test(regel) && /descent-override:\s*0%/.test(regel) && /line-gap-override:\s*0%/.test(regel), `${fam}: vaste fontmetrics (ascent 10%, descent 0): een glyph met line-height 0 maakt de regel op geen enkel platform hoger`);
  }
  ok(/align-items:\s*baseline\s*!important/.test(kcCss) && /\.ctx-row/.test(kcCss), 'hintrijen met flex staan op de basislijn (ds-keycap.css)');
  ok(/\.cine-skip-ring[^{]*\{[^}]*vertical-align:\s*calc\(var\(--ds-kc-mid\)/.test(kcCss), 'de ring van een overslaan-hint staat op --ds-kc-mid, zoals de glyph');
}

// ---------- 7. echte meting in headless Chrome (scripts/ui/keycap_meet.mjs; geen Electron) ----------
{
  const { meet, TOL_PX, KEYS } = await import('./ui/keycap_meet.mjs');
  const png = process.argv.includes('--png') ? ROOT + 'docs/beeld-21-11/keycap-skip/na.png' : undefined;
  const res = await meet({ png });
  if (!res) console.log('  (keycap_meet: geen Chrome gevonden, echte meting overgeslagen)');
  else {
    const g = res.rijen.filter((x) => x.soort === 'glyph'), ringen = res.rijen.filter((x) => x.soort === 'ring');
    ok(g.length >= KEYS.length * 10, `de meting ziet de glyphs van alle hintvarianten (${g.length})`);
    const namen = new Set(g.map((x) => x.naam));
    for (const v of ['cine-skip', 'heist-skipchip', 'hud-hold', 'prompts', 'hintkaart', 'uitleg', 'knop met glyph', 'launchchoice-pil', 'menu-voetbalk', 'ondertitel']) ok([...namen].some((x) => x.startsWith(v)), `de meting dekt de variant ${v}`);
    for (const x of g) {
      ok(x.gfont, `${x.naam} ${x.k}: de glyph staat in het echte glyphfont`);
      ok(Math.abs(x.dy) <= TOL_PX + 0.5, `${x.naam} ${x.k}: het midden van de glyph ligt binnen ${TOL_PX + 0.5} px van het midden van de tekst (nu ${x.dy.toFixed(1)} px bij ${x.tekstPx} px tekst)`);
      ok(x.inkH >= 19.5, `${x.naam} ${x.k}: de inkt is minstens 20 px hoog, het label leesbaar (nu ${x.inkH.toFixed(1)} px)`);
      ok(x.inkH <= x.tekstPx * 2.2, `${x.naam} ${x.k}: de inkt blijft binnen 2,2 keer de tekst (nu ${(x.inkH / x.tekstPx).toFixed(2)})`);
    }
    for (const x of g.filter((y) => y.k === 'SPACE')) {
      const w = g.find((y) => y.naam === x.naam && y.k === 'W');
      if (w) ok(Math.abs(x.inkH - w.inkH) <= 1.5, `${x.naam}: Spatie en W zijn even hoog (${x.inkH.toFixed(1)} tegen ${w.inkH.toFixed(1)} px)`);
    }
    for (const x of ringen.filter((y) => /skip/.test(y.naam))) ok(Math.abs(x.dy) <= TOL_PX, `${x.naam}: de ring staat op de tekstregel (nu ${x.dy.toFixed(1)} px)`);
  }
}

if (TOON) { console.log(VOORB.join('\n\n')); console.log('\n' + STRUT_NOTE.join('\n')); }
console.log(fails ? `keycap_maat_test: ${fails} FAIL` : `keycap_maat_test: ok (${n} controles)`);
process.exit(fails ? 1 : 0);
