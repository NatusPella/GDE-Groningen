// UI-kritiekharnas: bouwt de statische HTML-pagina voor een scherm: de echte CSS van het spel (volgorde van
// game/index.html, daarna de overige game/js/*.css), een neutrale achtergrond en een module-script dat het scherm
// met nepdata opbouwt (de echte UI-module uit game/js, in een echte browser, dus met echte lay-out).
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const NEUTRAL_BG = '#6b7280';

export function cssList(gameDir) {
  const html = readFileSync(join(gameDir, 'index.html'), 'utf8');
  const fromIndex = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
  const all = readdirSync(join(gameDir, 'js')).filter((f) => f.endsWith('.css')).map((f) => 'js/' + f);
  return [...new Set([...fromIndex, ...all])];
}

// De pagina meet zichzelf niet: render.mjs wacht op window.__scherm (een promise) en draait daarna de verzamelaar.
export function pageHtml(screen, { gameDir, prelude, uiScale = 1 }) {
  const css = cssList(gameDir).map((h) => `<link rel="stylesheet" href="/${h}">`).join('\n');
  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><title>${screen.id}</title>
${css}
<style>html,body{margin:0;height:100%;background:${NEUTRAL_BG};overflow:hidden}</style>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script>
</head><body class="${screen.bodyClass || ''}">
<canvas id="game3d" style="display:none"></canvas>
<div id="hud"></div>
<div id="stage"></div>
<script type="module">
const params = new URLSearchParams(location.search);
const uiScale = Number(params.get('uiScale')) || ${uiScale};
window.__scherm = (async () => {
  window.__stap = 'hudlook';
  const { uiScaleFor } = await import('/js/hudlook.js');
  window.__stap = 'setup';
  const ui = uiScaleFor(innerWidth, innerHeight, uiScale, false);
  document.documentElement.style.setProperty('--ui', String(ui));
  document.documentElement.style.setProperty('--ui-fit', '1');
  document.documentElement.style.setProperty('--mz-fit', String(Math.max(0.5, Math.min(4, Math.min(innerHeight / 1080, innerWidth / 1920) * uiScale))));
  const imp = (f) => import('/js/' + f.replace(/[.]js$/, '') + '.js');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const ctx = { imp, wait, stage: document.getElementById('stage'), hud: document.getElementById('hud'), body: document.body };
  ${prelude}
  ${screen.setup}
  await wait(${screen.wait ?? 500});
  return { ok: true };
})().catch((e) => ({ ok: false, fout: String((e && e.stack) || e).slice(0, 600) }));
</script></body></html>`;
}
