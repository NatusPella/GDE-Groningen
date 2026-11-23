// Echte meting van toetsplaatjes naast tekst (#1075, 21-11): rendert de HTML van de hint-varianten met de echte CSS en de echte
// glyphfonts (GDE Toetsen, Kenney) in headless Chrome (GEEN Electron), meet per glyph de verticale posities en maakt een PNG.
// Gemeten per glyph: het midden van de inkt (canvas actualBoundingBox op de basislijn van de glyph) tegen het midden van de tekst
// (basislijn min de helft van het gemiddelde van x-hoogte en hoofdletterhoogte, uit het tekstfont). dy > 0 is lager dan de tekst.
//   node scripts/ui/keycap_meet.mjs [--png=<map>] [--toon] [--oud=<map met game/>]
//   node scripts/ui/keycap_meet.mjs --opening [--zonder-ink] [--png=<voorvoegsel>]   de overslaan-hint van de openings-/montagefilm, 1280x720 en 1920x1080, --ui 1 / 1,25 / 1,5
// Exporteert meet() voor scripts/keycap_maat_test.mjs. Zonder Chrome geeft meet() null terug (de test slaat dan over, met melding).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
export const KEYS = ['SPACE', 'ENTER', 'SHIFT', 'TAB', 'ESC', 'W'];
export const TOL_PX = 1;
const CSS = ['fonts/fonts.css', 'js/menu.css', 'js/ds-tokens.css', 'js/ds-components.css', 'js/ds-keycap.css', 'js/a11y.css', 'js/hud_panel.css', 'js/subtitle.css', 'js/prompts.css', 'js/hudcards.css', 'js/pausemenu.css', 'js/heist.css', 'js/onlineconsent.css', 'js/loadscreen.css'];

export async function bouwMock(base = path.join(ROOT, 'game'), opts = {}) {
  const js = pathToFileURL(path.join(base, 'js')).href;
  const { glyphHtml, keyTextHtml, keyLabelGlyph } = await import(`${js}/keycap.js`);
  const ring = '<svg class="cine-skip-ring" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle class="fill" cx="12" cy="12" r="10"/></svg>';
  const hxRing = '<svg viewBox="0 0 20 20"><circle class="bg" cx="10" cy="10" r="8"/><circle class="fg" cx="10" cy="10" r="8"/></svg>';
  const tok = (k) => '{' + k + '}';
  const V = [];
  const add = (naam, k, html, box = '') => V.push({ naam, k, html, box });
  for (const k of KEYS) {
    const g = glyphHtml(k);
    add('cine-skip (rechtsonder)', k, `<div id="cine" class="show-skip active" style="position:relative;inset:auto;height:56px;background:#2a2218"><div class="cine-skip" style="position:relative;right:auto;bottom:auto;transform:none;display:block;top:12px;left:12px;text-align:left"><span>Houd</span> ${g.replace('class="hud-key', 'class="hud-key')} <span>ingedrukt om over te slaan</span></div></div>`.replace('<span>Houd</span>', ring + '<span>Houd</span>'));
    add('heist-skipchip', k, `<div id="heist-ui" style="position:relative;inset:auto;height:50px;background:#1d211f"><div class="hx-skipchip on" style="position:relative;left:auto;top:8px;transform:none;display:inline-block">${hxRing} ${g} <span>ingedrukt houden: sla dit stuk over</span></div></div>`);
    add('hud-hold (wp-chip)', k, `<div id="hud" style="position:relative;inset:auto;height:56px;background:#1d211f"><div class="wp-chip" style="position:relative;left:10px;top:8px;display:inline-flex"><span class="wp-glyph">${glyphHtml(k, { ring: true })}</span><span class="wp-text"><b>Instappen</b></span></div></div>`);
    add('prompts (ctx-row)', k, `<div id="hud" style="position:relative;inset:auto;height:50px;background:#1d211f"><div class="hud-ctx" style="position:relative;right:auto;bottom:auto;left:10px;top:8px"><div class="ctx-row" style="flex-direction:row"><span class="ctx-glyphs">${g}</span><span class="ctx-text"><b>Instappen</b></span></div></div></div>`);
    add('hintkaart (hc-text)', k, `<div id="hud" style="position:relative;inset:auto;background:#f3ead3"><div class="hud-card on" style="position:relative;transform:none;opacity:1"><div class="hc-text"><small>Tip</small><span>${keyTextHtml(`Houd ${tok(k)} ingedrukt om te rennen`)}</span></div></div></div>`);
    add('uitleg (.ds-uitleg)', k, `<div class="ds-uitleg"><p class="ds-uitleg__tekst" style="margin:0">${keyTextHtml(`Houd ${tok(k)} ingedrukt om te rennen`)}</p></div>`, 'papier');
    add('knop met glyph', k, `<button type="button" class="ds-z-knop">Begrepen ${g}</button>`, 'papier');
    add('launchchoice-pil (sk-hulp)', k, `<p class="sk-hulp" style="margin:0">${[`${tok(k)} starten`, `${tok('ESC')} alleen spelen`].map((h) => `<span>${keyTextHtml(h)}</span>`).join('')}</p>`, 'papier');
    add('menu-voetbalk (m-hint)', k, `<div class="m-foot" style="position:relative;right:auto;bottom:auto;height:auto"><span class="m-hint"><span class="m-kc is-kbg">${keyLabelGlyph({ SPACE: 'Spatie', ENTER: 'Enter', SHIFT: 'Shift', TAB: 'Tab', ESC: 'Esc', W: 'W' }[k]) || ''}</span>Terug</span></div>`, 'donker');
    add('ondertitel (cine-sub)', k, `<div id="cine" style="position:relative;inset:auto;height:60px;background:#2a2218"><div class="ds-sub ds-sub--film cine-sub" style="position:relative;opacity:1;left:auto;bottom:auto;transform:none;top:8px"><span class="ds-sub-line cine-line">${keyTextHtml(`Houd ${tok(k)} ingedrukt om te rennen`)}</span></div></div>`);
  }
  if (opts.opening) {
    // de echte overslaan-hint van de openings-/montagefilm: de markup van cinematics.js (de toets als tekst 'SPATIE', door glyphs.js een glyph),
    // in de echte #cine met letterbox (balken 11vh, zwart) en --ui; zonder en met ondertitel (dan staat de hint boven de balk).
    V.length = 0;
    const cineHtml = (extra) => `<div id="cine" class="letterbox show-skip active ${extra}"><div class="cine-bar top"></div><div class="cine-bar bottom"></div><div class="ds-sub ds-sub--film cine-sub"><span class="ds-sub-speaker cine-speaker"></span><span class="ds-sub-line cine-line">Een ondertitel</span></div><div class="cine-skip">${ring}<span>Houd</span> <span class="hud-key">SPATIE</span> <span>ingedrukt om over te slaan</span></div></div>`;
    add('opening/montage (balk)', 'SPACE', cineHtml(''), 'opening');
    add('opening/montage (met ondertitel)', 'SPACE', cineHtml('has-sub'), 'opening');
  }
  const rijen = V.map((v, i) => `<section class="v ${v.box}" data-i="${i}"><h6>${v.naam} · ${v.k}</h6><div class="vb">${v.html}</div></section>`).join('\n');
  const links = CSS.map((c) => `<link rel="stylesheet" href="${pathToFileURL(path.join(base, c)).href}">`).join('\n');
  const mock = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>keycap-meet</title>${links}
<style>html,body{background:#4a4a4a;margin:0;padding:8px;font-family:Arial,sans-serif;overflow:visible!important;height:auto!important}.v{display:inline-block;width:420px;margin:4px;vertical-align:top;font:11px Arial;color:#ddd}.v h6{margin:0 0 2px;font:10px Arial;color:#bbb}.v .vb{position:relative;overflow:visible}.v.papier .vb{background:#f3ead3;color:#1d1b17;padding:6px}.v.donker .vb{background:#1d211f;padding:6px}.v.opening{display:block;width:auto;margin:0}.v.opening h6{display:none}.v.opening .vb{position:static}</style></head><body class="cine-hide-hud">
${rijen}
<pre id="res" style="display:none"></pre>
${opts.opening ? `<script type="module">import { refreshGlyphs } from '${pathToFileURL(path.join(base, 'js/glyphs.js')).href}'; document.documentElement.style.setProperty('--ui', '${opts.opening.ui || 1}'); refreshGlyphs();${opts.opening.zonderInk ? " document.querySelectorAll('[data-ink]').forEach((e) => e.removeAttribute('data-ink'));" : ''} window.__glyphs = 1;</script>` : ''}
<script>
(${meetInPagina.toString()})(${JSON.stringify(V.map((v) => ({ naam: v.naam, k: v.k })))});
</script></body></html>`;
  return { mock, V };
}

// draait in de pagina: meet elke variant
function meetInPagina(V) {
  const cv = document.createElement('canvas').getContext('2d');
  const m = (font, txt) => { cv.font = font; return cv.measureText(txt); };
  const klaar = async () => {
    const fams = ['GDE Toetsen', 'Bebas Neue', 'Arial Narrow', 'Atkinson Hyperlegible', 'Barlow Condensed'];
    try { await Promise.all(fams.map((f) => document.fonts.load('20px "' + f + '"', 'Hx\uE000'))); await document.fonts.ready; } catch (e) { /* font ontbreekt: de meting meldt het */ }
    const uit = [];
    document.querySelectorAll('.v').forEach((sec) => {
      const i = +sec.dataset.i;
      const root = sec.querySelector('.vb');
      const tekstKnopen = [];
      const w = document.createTreeWalker(root, 4);
      while (w.nextNode()) { const n = w.currentNode; if (/[A-Za-z]{3}/.test(n.nodeValue) && !n.parentElement.closest('.pad-g')) tekstKnopen.push(n); }
      const glyphs = [...root.querySelectorAll('.pad-g.pad-kn')];
      glyphs.forEach((gl) => {
        const gcs = getComputedStyle(gl);
        const gtn = [...gl.childNodes].find((c) => c.nodeType === 3);
        const gr = document.createRange(); gr.selectNodeContents(gtn);
        const grect = gr.getClientRects()[0];
        const gfont = `${gcs.fontStyle} ${gcs.fontWeight} ${gcs.fontSize} ${gcs.fontFamily}`;
        const gm = m(gfont, gtn.nodeValue);
        const gbase = grect.top + gm.fontBoundingBoxAscent;
        const inkTop = gbase - gm.actualBoundingBoxAscent, inkBot = gbase + gm.actualBoundingBoxDescent;
        // dichtstbijzijnde tekstknoop in documentvolgorde
        let beste = null, bd = 1e9;
        for (const tn of tekstKnopen) { const d = Math.abs((tn.compareDocumentPosition(gl) & 4 ? -1 : 1) * 0) + Math.abs(tn.getBoundingClientRect ? 0 : 0); const r0 = document.createRange(); r0.selectNodeContents(tn); const rr = r0.getBoundingClientRect(); const dx = Math.abs((rr.left + rr.right) / 2 - (grect.left + grect.right) / 2) + Math.abs((rr.top + rr.bottom) / 2 - (grect.top + grect.bottom) / 2) * 6; if (dx + d < bd) { bd = dx + d; beste = tn; } }
        if (!beste) return;
        const tcs = getComputedStyle(beste.parentElement);
        const tfont = `${tcs.fontStyle} ${tcs.fontWeight} ${tcs.fontSize} ${tcs.fontFamily}`;
        const tr = document.createRange(); tr.selectNodeContents(beste);
        const trect = tr.getClientRects()[0];
        const tm = m(tfont, 'x'), cm = m(tfont, 'H');
        const tbase = trect.top + tm.fontBoundingBoxAscent;
        const xh = tm.actualBoundingBoxAscent, caph = cm.actualBoundingBoxAscent;
        const hoofd = !/[a-z]/.test(beste.nodeValue) || tcs.textTransform === 'uppercase';
        const mid = hoofd ? tbase - caph / 2 : tbase - (xh + caph) / 4;
        const gmid = (inkTop + inkBot) / 2;
        uit.push({ i, naam: V[i].naam, k: V[i].k, soort: 'glyph', tekstPx: parseFloat(tcs.fontSize), glyphPx: parseFloat(gcs.fontSize), inkH: inkBot - inkTop, inkW: gm.width, dy: gmid - mid, dyX: gmid - (tbase - xh / 2), tekstMid: mid, gfont: gm.fontBoundingBoxAscent > 0 && /Toetsen|GDE/.test(gcs.fontFamily), tekst: beste.nodeValue.trim().slice(0, 20), lh: gcs.lineHeight });
        // de ring naast de tekst (cine-skip-ring, hx-skipchip svg, hud-hold-ring)
      });
      root.querySelectorAll('.cine-skip-ring, .hx-skipchip > svg, .hud-hold-ring').forEach((ring) => {
        const rr = ring.getBoundingClientRect();
        const beste = tekstKnopen.find((tn) => ring.parentElement && ring.parentElement.contains(tn)) || tekstKnopen[0]; if (!beste) return;
        const tcs = getComputedStyle(beste.parentElement);
        const tfont = `${tcs.fontStyle} ${tcs.fontWeight} ${tcs.fontSize} ${tcs.fontFamily}`;
        const tr = document.createRange(); tr.selectNodeContents(beste); const trect = tr.getClientRects()[0];
        const tm = m(tfont, 'x'), cm = m(tfont, 'H');
        const tbase = trect.top + tm.fontBoundingBoxAscent;
        const mid = tbase - (tm.actualBoundingBoxAscent + cm.actualBoundingBoxAscent) / 4;
        uit.push({ i, naam: V[i].naam, k: V[i].k, soort: 'ring', tekstPx: parseFloat(tcs.fontSize), ringH: rr.height, dy: (rr.top + rr.bottom) / 2 - mid });
      });
    });
    document.getElementById('res').textContent = JSON.stringify(uit);
    document.title = 'klaar';
  };
  window.addEventListener('load', () => setTimeout(klaar, 400));
}

function chrome(args) {
  return spawnSync(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars', '--virtual-time-budget=6000', ...args], { encoding: 'utf8', maxBuffer: 1e9, timeout: 60000 });
}

/** { rijen: [...], png } of null zonder Chrome. */
export async function meet({ base, png, breedte = 1400, hoogte = 1700, opening } = {}) {
  if (!CHROME) return null;
  const { mock } = await bouwMock(base, { opening });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kcmeet-'));
  const file = path.join(dir, 'mock.html');
  fs.writeFileSync(file, mock);
  const url = pathToFileURL(file).href;
  const r = chrome([`--user-data-dir=${path.join(dir, 'p')}`, `--window-size=${breedte},${hoogte}`, '--dump-dom', url]);
  const m = /<pre id="res"[^>]*>([\s\S]*?)<\/pre>/.exec(r.stdout || '');
  let rijen = [];
  try { rijen = JSON.parse((m ? m[1] : '[]').replace(/&quot;/g, '"').replace(/&amp;/g, '&')); } catch (e) { rijen = []; }
  let pngPad = null;
  if (png) {
    pngPad = path.resolve(png);
    fs.mkdirSync(path.dirname(pngPad), { recursive: true });
    chrome([`--user-data-dir=${path.join(dir, 'p2')}`, `--screenshot=${pngPad}`, `--window-size=${breedte},${hoogte}`, '--force-device-scale-factor=2', url]);
    fs.copyFileSync(file, path.join(path.dirname(pngPad), 'mock.html'));
  }
  fs.rmSync(dir, { recursive: true, force: true });
  return { rijen, png: pngPad };
}

/** De overslaan-hint van de openings-/montagefilm per scherm en --ui: [{ b, h, ui, rijen }] of null zonder Chrome. */
export const OPENING_SCHERMEN = [[1280, 720], [1920, 1080]];
export const OPENING_UI = [1, 1.25, 1.5];
export async function meetOpening({ base, png, zonderInk = false } = {}) {
  if (!CHROME) return null;
  const uit = [];
  for (const [b, h] of OPENING_SCHERMEN) for (const ui of OPENING_UI) {
    const r = await meet({ base, breedte: b, hoogte: h, opening: { ui, zonderInk }, png: png && ui === 1 ? `${png}-${b}.png` : undefined });
    uit.push({ b, h, ui, rijen: r.rijen });
  }
  return uit;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3);
  if (process.argv.includes('--opening')) {
    const res = await meetOpening({ base: arg('oud') ? path.join(arg('oud'), 'game') : undefined, png: arg('png') || undefined, zonderInk: process.argv.includes('--zonder-ink') });
    if (!res) { console.log('keycap_meet: geen Chrome gevonden'); process.exit(0); }
    for (const { b, h, ui, rijen } of res) for (const x of rijen) console.log(`  ${b}x${h} ui ${ui} ${x.naam.padEnd(34)} ${x.soort}: dy ${x.dy >= 0 ? '+' : ''}${x.dy.toFixed(1)} px` + (x.soort === 'glyph' ? ` (ink ${x.inkH.toFixed(0)} px, tekst ${x.tekstPx}px)` : ''));
    process.exit(0);
  }
  const res = await meet({ base: arg('oud') ? path.join(arg('oud'), 'game') : undefined, png: arg('png') || undefined });
  if (!res) { console.log('keycap_meet: geen Chrome gevonden'); process.exit(0); }
  const g = res.rijen.filter((x) => x.soort === 'glyph'), ri = res.rijen.filter((x) => x.soort === 'ring');
  console.log(`keycap_meet: ${g.length} glyphs, ${ri.length} ringen gemeten`);
  if (process.argv.includes('--toon') || true) {
    const by = new Map();
    for (const x of g) { const k = x.naam; (by.get(k) || by.set(k, []).get(k)).push(x); }
    for (const [naam, l] of by) console.log(`  ${naam.padEnd(28)} ` + l.map((x) => `${x.k}:${x.dy >= 0 ? '+' : ''}${x.dy.toFixed(1)}/${x.inkH.toFixed(0)}px`).join('  ') + `   (tekst ${l[0].tekstPx}px)`);
    for (const x of ri) console.log(`  ring ${x.naam}: dy ${x.dy.toFixed(1)} px, ${x.ringH.toFixed(0)} px hoog`);
  }
}
