// De regels van "Microanimaties (DS3)" als code (DESIGN_SYSTEM.md, ui-taal.md): een kleine CSS-lezer en de controle
// die game/js/ds-micro.css moet doorstaan. Pure functies, geen bestanden lezen; scripts/ds3_dekking_test.mjs gebruikt
// dit voor de echte css en voor opzettelijk foute voorbeelden. Geen browser nodig.

// Wat een overgang of keyframe mag veranderen: compositor-eigenschappen. Verf (box-shadow) alleen op de knop.
export const TOEGESTAAN = ['opacity', 'transform', 'translate', 'scale', 'rotate'];
export const VERF_KNOP = ['box-shadow'];
export const VERBODEN = ['width', 'height', 'top', 'left', 'right', 'bottom', 'margin', 'padding', 'filter', 'font-size', 'all', 'blur'];
export const MAX_MICRO_MS = 250;
export const MAX_MOMENT_MS = 1600;

export const stripReacties = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

// Splitst op een teken dat niet tussen haakjes staat.
export function splitBuiten(tekst, teken) {
  const delen = [];
  let diepte = 0, deel = '';
  for (const ch of tekst) {
    if (ch === '(') diepte++;
    if (ch === ')') diepte--;
    if (ch === teken && diepte === 0) { delen.push(deel); deel = ''; } else deel += ch;
  }
  if (deel.trim()) delen.push(deel);
  return delen;
}

export function declaraties(body) {
  const uit = [];
  for (const d of splitBuiten(body, ';')) {
    const i = d.indexOf(':');
    if (i < 0) continue;
    uit.push({ prop: d.slice(0, i).trim().toLowerCase(), waarde: d.slice(i + 1).trim() });
  }
  return uit;
}

// { regels: [{ selector, body, context: [] }], keyframes: [{ naam, frames: [{ selector, body }] }] }
export function leesCss(css, context = [], uit = { regels: [], keyframes: [] }) {
  const tekst = stripReacties(css);
  let i = 0;
  while (i < tekst.length) {
    const open = tekst.indexOf('{', i);
    if (open < 0) break;
    const prelude = tekst.slice(i, open).trim();
    let diepte = 1, j = open + 1;
    while (j < tekst.length && diepte > 0) { if (tekst[j] === '{') diepte++; else if (tekst[j] === '}') diepte--; j++; }
    const body = tekst.slice(open + 1, j - 1);
    if (/^@keyframes\s/.test(prelude)) {
      const frames = leesCss(body, [], { regels: [], keyframes: [] }).regels.map((r) => ({ selector: r.selector, body: r.body }));
      uit.keyframes.push({ naam: prelude.replace(/^@keyframes\s+/, '').trim(), frames });
    } else if (/^@(media|supports)/.test(prelude)) {
      leesCss(body, [...context, prelude.replace(/\s+/g, ' ')], uit);
    } else if (prelude) {
      uit.regels.push({ selector: prelude.replace(/\s+/g, ' '), body, context });
    }
    i = j;
  }
  return uit;
}

const klassenIn = (selector) => [...selector.matchAll(/\.(ds-(?:m|moment)-[a-z0-9_-]+)/g)].map((m) => m[1]);
const kaal = (waarde) => { let v = waarde; for (let k = 0; k < 6; k++) v = v.replace(/var\([^()]*\)/g, ' '); return v; };
const heeftBeweging = (body) => declaraties(body).some((d) => /^(transition|animation)/.test(d.prop) && !/^(transition|animation)(-duration|-delay)?$/.test(d.prop) === false);

export function microKlassen(css) {
  const { regels } = leesCss(css);
  const set = new Set();
  for (const r of regels) {
    if (r.context.length) continue;
    const beweging = declaraties(r.body).filter((d) => /^(transition|animation)/.test(d.prop));
    if (!beweging.length) continue;
    if (beweging.every((d) => d.prop === 'animation' && d.waarde === 'none')) continue; // een uit-regel (overslaan)
    for (const k of klassenIn(r.selector)) set.add(k);
  }
  return [...set].sort();
}

// Eén lijst met overtredingen: { regel, bericht }.
export function controleerMicroCss(css, { tokensCss = '' } = {}) {
  const f = [];
  const fout = (regel, bericht) => f.push({ regel, bericht });
  const { regels, keyframes } = leesCss(css);
  const kaalCss = stripReacties(css);

  if (/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/.test(kaalCss)) fout('kleur', 'een losse kleur: gebruik een inkt-token (var(--ds-c-ink-...))');

  for (const r of regels) {
    if (r.context.some((c) => /prefers-reduced-motion/.test(c)) || /^html\.(reduce-motion|rustig-drukwerk)/.test(r.selector)) continue; // de takken
    const decls = declaraties(r.body);
    const heeftKnop = /\.ds-m-knop\b/.test(r.selector);
    const microFamilie = /\.ds-m-/.test(r.selector) && !/\.ds-moment-/.test(r.selector);
    for (const d of decls) {
      if (d.prop === 'transition' || d.prop === 'transition-property') {
        const props = d.prop === 'transition'
          ? splitBuiten(d.waarde, ',').map((p) => p.trim().split(/\s+/)[0])
          : splitBuiten(d.waarde, ',').map((p) => p.trim());
        for (const p of props) {
          if (VERBODEN.includes(p)) fout(r.selector, `transition op ${p} (layout, filter of alles)`);
          else if (!TOEGESTAAN.includes(p) && !(VERF_KNOP.includes(p) && heeftKnop)) fout(r.selector, `transition op ${p}: alleen ${TOEGESTAAN.join(', ')} (box-shadow alleen op .ds-m-knop)`);
        }
      }
      if (/^(transition|animation)/.test(d.prop)) {
        const k = kaal(d.waarde);
        for (const m of k.matchAll(/(?<![\w.-])(\d*\.?\d+)(ms|s)\b/g)) {
          const ms = m[2] === 's' ? Number(m[1]) * 1000 : Number(m[1]);
          if (ms !== 0) fout(r.selector, `een letterlijke tijd (${m[0]}): gebruik een --ds-m-* of --ds-moment-* token`);
        }
        const tokens = [...d.waarde.matchAll(/var\(--ds-(m|moment)-([a-z]+)/g)].map((m) => `--ds-${m[1]}-${m[2]}`);
        if (microFamilie && !/stip--live/.test(r.selector) && tokens.some((t) => t.startsWith('--ds-moment-'))) fout(r.selector, 'een .ds-m-* regel gebruikt een --ds-moment-* tijd (boven 250 ms)');
        if (/\binfinite\b/.test(d.waarde) && !/stip--live/.test(r.selector)) fout(r.selector, 'een lus (infinite) buiten .ds-m-stip--live');
      }
      if (d.prop === 'animation-iteration-count' && !/^1$/.test(d.waarde) && !/stip--live/.test(r.selector)) fout(r.selector, 'animation-iteration-count is niet 1');
    }
  }
  for (const k of keyframes) {
    for (const fr of k.frames) for (const d of declaraties(fr.body)) {
      if (!TOEGESTAAN.includes(d.prop)) fout(`@keyframes ${k.naam}`, `animeert ${d.prop}: alleen ${TOEGESTAAN.join(', ')}`);
    }
  }

  // Reduced motion: elke klasse met beweging staat in alle drie de takken, en de tak zet alles uit.
  const klassen = microKlassen(css);
  const takken = {
    'html.reduce-motion': regels.filter((r) => !r.context.length && r.selector.startsWith('html.reduce-motion')),
    'html.rustig-drukwerk': regels.filter((r) => !r.context.length && r.selector.startsWith('html.rustig-drukwerk')),
    'prefers-reduced-motion': regels.filter((r) => r.context.some((c) => /prefers-reduced-motion:\s*reduce/.test(c))),
  };
  for (const [naam, lijst] of Object.entries(takken)) {
    if (!lijst.length) { fout(naam, 'de reduced-motion-tak ontbreekt'); continue; }
    const tekst = lijst.map((r) => r.selector).join(' ');
    const gedekt = new Set(klassenIn(tekst));
    for (const k of klassen) if (!gedekt.has(k)) fout(naam, `.${k} heeft geen reduced-motion-tegenhanger in deze tak`);
    for (const r of lijst) {
      const d = declaraties(r.body);
      const uit = d.some((x) => x.prop === 'animation' && x.waarde === 'none');
      const dur = d.some((x) => x.prop === 'transition-duration' && x.waarde === '0ms');
      const del = d.some((x) => x.prop === 'transition-delay' && x.waarde === '0ms');
      if (!uit || !dur || !del) fout(naam, `de regel voor ${r.selector.slice(0, 60)}... zet niet animation: none, transition-duration: 0ms en transition-delay: 0ms`);
      if (d.some((x) => x.prop === 'opacity' && x.waarde === '0')) fout(naam, 'een reduced-motion-regel verbergt iets');
    }
  }

  // De tokens: --ds-m-* hooguit 250 ms, --ds-moment-* hooguit 1,6 s (de ademhaling van de live-stip uitgezonderd).
  if (tokensCss) {
    for (const m of tokensCss.matchAll(/^\s*--ds-(m|moment)-([a-z-]+):\s*(\d+)ms/gm)) {
      const [, fam, naam, ms] = m;
      const max = fam === 'm' ? MAX_MICRO_MS : (naam === 'leven' ? 2000 : MAX_MOMENT_MS);
      // alleen de eerste definitie (:root) telt; de 0 ms-takken zijn altijd goed
      if (Number(ms) > max) fout(`--ds-${fam}-${naam}`, `${ms} ms is meer dan ${max} ms`);
    }
  }
  return f;
}

// Eén tijd in ms uit een token-waarde, of null.
export const tokenMs = (tokensCss, naam) => {
  const m = tokensCss.match(new RegExp(`^\\s*${naam.replace(/[-]/g, '\\-')}:\\s*(\\d+)ms`, 'm'));
  return m ? Number(m[1]) : null;
};
