// De pure controles van scripts/menu_tabs_audit.mjs (tekst in, bevindingen uit), apart zodat menu_tabs_audit_test.mjs ze met proefregels kan aanroepen.
// ---- 1. motion ----
export function duurChecks(src, tokens = {}) {
  const uit = [];
  const regels = src.split('\n');
  for (let i = 0; i < regels.length; i++) {
    const r = regels[i];
    if (/ds3-dwell|ds3-film|animation:\s*none|transition:\s*none/.test(r)) continue;
    for (const m of r.matchAll(/(?:^|[\s;{`'"])(transition|animation)(?:-duration)?\s*:\s*([^;}`]*)/g)) {
      if (/\binfinite\b/.test(m[2])) continue; // een lus is geen overgang (ds3 telt hem apart)
      for (const t of m[2].matchAll(/var\((--ds-m-[a-z-]+)(?:,\s*([\d.]+m?s))?\)|(\d*\.?\d+)(ms|s)\b/g)) {
        let ms;
        if (t[1]) ms = tokens[t[1]] ?? (t[2] ? parseFloat(t[2]) * (t[2].endsWith('ms') ? 1 : 1000) : 0);
        else ms = t[4] === 's' ? +t[3] * 1000 : +t[3];
        if (/animation-delay/.test(r)) continue;
        if (ms > 250) uit.push({ regel: i + 1, tekst: r.trim().slice(0, 100), ms });
      }
    }
  }
  return uit;
}

// ---- 2. lettergrootte ----
export function kleineLetters(src) {
  const uit = [];
  src.split('\n').forEach((r, i) => {
    for (const m of r.matchAll(/font-size:\s*(?:max\()?\s*(\d+(?:\.\d+)?)px/g)) if (+m[1] < 13) uit.push({ regel: i + 1, tekst: r.trim().slice(0, 100) });
  });
  return uit;
}

// ---- 5. listnav ----
export function klikbaarZonderFocus(src) {
  const uit = [];
  src.split('\n').forEach((r, i) => {
    for (const m of r.matchAll(/<(div|span|li|p|a|section)\b([^>]*)>/g)) {
      const a = m[2];
      const klik = /\bdata-(?:action|goto|act|spul-act|doel|gk-act)\b/.test(a) || /role="button"/.test(a);
      if (klik && !/tabindex=/.test(a)) uit.push({ regel: i + 1, tekst: m[0].slice(0, 100) });
    }
  });
  return uit;
}

// ---- 6. tekstdieet ----
export function langeAlinea(src) {
  const uit = [];
  src.split('\n').forEach((r, i) => {
    for (const m of r.matchAll(/<p\b[^>]*>([^<${}]{151,})<\/p>/g)) uit.push({ regel: i + 1, tekst: m[1].slice(0, 80) + '...' });
  });
  return uit;
}
export function dubbeleZin(src) {
  const teller = new Map();
  for (const m of src.matchAll(/<(?:p|small|span)\b[^>]*>([A-Z][^<${}]{34,})<\/(?:p|small|span)>/g)) teller.set(m[1], (teller.get(m[1]) || 0) + 1);
  return [...teller].filter(([, n]) => n > 1).map(([t, n]) => ({ tekst: t.slice(0, 80), n }));
}

// ---- 8. schaal ----
export const BLADEN = [[1280, 720, 1.0], [1280, 720, 1.5], [1920, 1080, 1.0], [1920, 1080, 1.5]];
export function blad(w, h, ui) {
  const mz = Math.max(0.5, Math.min(4, Math.min(h / 1080, w / 1920) * ui)); // uiscale.js: --mz-fit
  const stage = { w: w / mz, h: h / mz };
  const mb = h <= 820 ? 0.10 : 0.111, mt = h <= 820 ? 0.05 : 0.074;   // menu.css: --mt/--mb achter @media (max-height: 820px)
  return { stage, breed: stage.w - 416 - 80, hoog: stage.h * (1 - mt - mb), mz };
}
// Vaste breedtes op basisniveau (buiten @media): { sel, prop, px }. Een px-breedte die later op basisniveau door een relatieve breedte
// (clamp, min, %) wordt overschreven telt niet; position:absolute/fixed-overlays (kaart) ook niet.
export function vasteBreedtes(css) {
  const s = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const regels = [];
  const stack = [];
  let buf = '';
  for (const ch of s) {
    if (ch === '{') { if (stack.length) stack[stack.length - 1].kids = true; stack.push({ sel: buf.trim(), kids: false }); buf = ''; }
    else if (ch === '}') {
      const blok = stack.pop();
      if (blok && !blok.kids) regels.push({ sel: blok.sel, body: buf, ouders: stack.map((x) => x.sel) });
      buf = '';
    } else buf += ch;
  }
  const uit = [];
  const basis = regels.filter((r) => !r.ouders.some((o) => /^@/.test(o)) && !/position:\s*(absolute|fixed)/.test(r.body));
  basis.forEach((r, i) => {
    for (const d of r.body.matchAll(/(?:^|[;\s])(min-width|width)\s*:\s*([^;]+)/g)) {
      const px = /^(\d+)px\s*$/.exec(d[2].trim());
      if (!px) continue;
      const later = basis.slice(i + 1).some((x) => x.sel === r.sel && new RegExp('(?:^|[;\\s])' + d[1] + '\\s*:\\s*(?!\\d+px\\s*(?:;|$))').test(x.body));
      if (!later) uit.push({ sel: r.sel.slice(-70), prop: d[1], px: +px[1] });
    }
  });
  return uit;
}

