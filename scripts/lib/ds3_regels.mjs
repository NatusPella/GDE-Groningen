// Pure kern van de ds3-telling (zonder fs of git), zodat ook de regelaudit (scripts/release/design_rules.mjs) hem per diffregel kan gebruiken.
// Zie ds3_telling.mjs voor het lezen van de bestanden en ds3_dekking_test.mjs voor de ratel.

export const SOORTEN = ['kleur', 'glas', 'oud', 'font', 'klein'];

// Bestanden die bewust buiten de telling vallen: definitie, 3D, canvas in de wereld, debug.
// Elke regel heeft een reden; een bestand dat hier niet staat telt mee.
export const BEWUST = {
  'game/js/ds-tokens.css': 'de definitie van het palet (hex hoort hier, en alleen hier)',
  'game/js/ds-galerij.js': 'de galerij toont de oude set als referentie naast de zeefdruk',
  'game/ds-galerij.html': 'de galerij toont de oude set als referentie',
  'game/fonts/fonts.css': 'de @font-face-regels van de zelf gehoste lettertypen',
  'game/cutpreview.html': 'ontwikkelaarstool voor het bekijken van cutscenes, geen speler-UI',
};
// Kaartstijl op canvas en identiteitstabellen: data, geen UI-oppervlak. (3D-materialen en canvas tellen niet mee: de telling kijkt in JS alleen naar CSS-declaraties.)
export const BEWUST_PATROON = [
  [/^game\/js\/(?:mapstyle|kaartkleuren|minimap\w*|mapview|mapdraw\w*|mapicons?|kaarticons?)\.js$/, 'kaartstijl op canvas (eigen kaartpalet, ADR/WERELDKLEUREN)'],
  [/^game\/js\/(?:a11y|colorblind|kleurenblind)\.js$/, 'de kleurenblindpaletten zijn data'],
  [/^game\/js\/(?:coopidentiteit|ctxidentiteit|minigamekit)\.js$/, 'identiteitskleuren per speler en context (een tabel, bewust)'],
];

export function bewustReden(f) {
  if (BEWUST[f]) return BEWUST[f];
  for (const [re, reden] of BEWUST_PATROON) if (reden && re.test(f)) return reden;
  return null;
}

// Commentaar eruit; in JS blijven strings staan (daar zit de CSS in).
function zonderCommentaar(src, css) {
  let s = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  if (!css) s = s.replace(/(^|[^:\\'"`])\/\/.*$/gm, '$1');
  s = s.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
  return s;
}

const KLEUR_CONTEXT = /(?:color|background(?:-color)?|border(?:-[a-z]+)?|outline(?:-color)?|box-shadow|text-shadow|fill|stroke|--[\w-]+|stopColor|fillStyle|strokeStyle|\.style\b|cssText|style\s*=)\s*[:=(]?/i;
const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])/g;
const RGB = /\brgba?\(\s*\d/g;

/** Telt per regel; `regel` geeft de regelnummers terug voor de lijst. */
export function telBestand(f, src) {
  const css = /\.css$/.test(f);
  const html = /\.html$/.test(f);
  const schoon = zonderCommentaar(src, css);
  const n = { kleur: 0, glas: 0, oud: 0, font: 0, klein: 0 };
  const regels = [];
  schoon.split('\n').forEach((l, i) => {
    if (!l.trim()) return;
    // een var(--x, #hex)-terugval is de token; die telt niet
    const k = l.replace(/var\(\s*--[\w-]+\s*,\s*[^)]*\)/g, 'var()');
    let kleur = 0;
    // CSS en HTML: elke regel. JS: alleen een echte CSS-declaratie (`color: #abc;`, ook in een sjabloon) of een
    // `.style.x = '#abc'`; een datatabel (`color: '#abc'`), 3D-materiaal of canvas (fillStyle) telt niet.
    const kleurTeksten = [];
    if (css) kleurTeksten.push(k);
    else {
      for (const m of k.matchAll(/(?:^|[\s;{"'`])(?:color|background(?:-color|-image)?|border(?:-[a-z]+)?|outline(?:-color)?|box-shadow|text-shadow|fill|stroke|--[\w-]+)\s*:\s*([^'"`,;{}]*(?:\([^)]*\)[^'"`,;{}]*)*)/gi)) kleurTeksten.push(m[1]);
      for (const m of k.matchAll(/\.style(?:\.\w+|\[[^\]]+\])\s*=\s*(['"`])([^'"`]*)\1/g)) kleurTeksten.push(m[2]);
      for (const m of k.matchAll(/style\s*=\s*\\?["']([^"']*)["']/g)) kleurTeksten.push(m[1]);
    }
    for (const kt of kleurTeksten) {
      for (const m of kt.matchAll(HEX)) {
        if (/^#(?:000|000000|fff|ffffff)$/i.test(m[0]) && /shadow|filter/i.test(k)) continue; // slagschaduw is chroom
        kleur++;
      }
      for (const m of kt.matchAll(RGB)) {
        const r = kt.slice(m.index).match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (r && r[1] === '0' && r[2] === '0' && r[3] === '0' && /shadow|filter/i.test(k)) continue; // slagschaduw
        kleur++;
      }
    }
    const stijl = css || html || kleurTeksten.length > 0 || /\.style\b|cssText|<style/.test(k);
    let glas = 0;
    if (/--gron-green/.test(k)) glas++;
    if (/backdrop-filter/.test(k)) glas++;
    if (/(?:radial|linear|conic)-gradient\(/.test(k) && stijl) glas++;
    if (/(?:^|[\s"'`{,.>+~(])\.gm(?![\w-])|class\s*=\s*["'`][^"'`]*\bgm\b|classList\.(?:add|toggle)\(\s*['"]gm['"]/.test(k)) glas++;
    let oud = 0;
    if (/\bds-(?:kaart|knop|chip|papier|glas|streep)\b/.test(k)) oud++;
    let font = 0;
    for (const m of k.matchAll(/font-family\s*:\s*([^;}`'"]+(?:['"][^;}]*)?)/gi)) {
      const v = m[1].trim();
      if (v && !/^var\(/.test(v) && !/^(?:inherit|initial|unset|revert|monospace)\b/.test(v)) font++;
    }
    for (const m of k.matchAll(/\bfont\s*:\s*[^;}]*?\d+(?:\.\d+)?px[^;}]*?['"]?[A-Za-z][A-Za-z ]+['"]?\s*(?:,|;|\}|$)/gi)) { if (!/var\(/.test(m[0])) font++; }
    let klein = 0;
    if (!/keycap|toetsplaatje|\.key\b|m-kc|\bkbd\b|key-chip|hud-key/i.test(k)) {
      for (const m of k.matchAll(/font-size\s*:\s*([^;}]{1,60})/gi)) {
        if (/max\(\s*1[3-9]|var\(/.test(m[1])) continue;
        const px = [...m[1].matchAll(/(\d+(?:\.\d+)?)px/g)].map((x) => Number(x[1]));
        if (px.some((v) => v < 13)) klein++;
      }
      for (const m of k.matchAll(/\bfont\s*:\s*(?:[a-z0-9 ]+\s)?(\d+(?:\.\d+)?)px/gi)) if (Number(m[1]) < 13) klein++;
    }
    const tel = { kleur, glas, oud, font, klein };
    tel.kleur = kleur;
    for (const s of SOORTEN) n[s] += tel[s] || 0;
    if (SOORTEN.some((s) => tel[s])) regels.push({ r: i + 1, t: l.trim().slice(0, 150), ...tel });
  });
  return { n, regels };
}
