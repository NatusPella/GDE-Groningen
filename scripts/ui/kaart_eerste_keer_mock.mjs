// Statische beeldmock van de eerste-keer-kaartuitleg en de reispopup (21-11, #1088): echte tokens en echte opmaak uit kaartactieui.js
// (uitlegHtml, reisPopupHtml, actiesHtml, KAART_ACTIE_CSS), een nagemaakte kaart eromheen. GEEN Electron: de wijzers staan er vast, de kaart is nep.
//   node scripts/ui/kaart_eerste_keer_mock.mjs                      schrijft docs/beeld-21-11/kaart-eerste-keer/mock.html (nieuw)
//   node scripts/ui/kaart_eerste_keer_mock.mjs --oud=<map> --uit=<bestand>   zelfde pagina met game/js uit een oude checkout (git archive), voor de vergelijking
// Daarna headless Chrome (geen Electron): chrome --headless --screenshot=<png> --window-size=1920,1080 "file:///...mock.html?scene=eerste-keer"
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3);
const oud = arg('oud');
const uit = arg('uit') || path.join(ROOT, 'docs/beeld-21-11/kaart-eerste-keer/mock.html');
const base = oud ? path.join(oud, 'game') : path.join(ROOT, 'game');
const js = pathToFileURL(path.join(base, 'js')).href;

const UI = await import(`${js}/kaartactieui.js`);
const K = await import(`${js}/kaartactie.js`);
const { reisOpties } = await import(`${js}/ovopties.js`);
const nieuw = typeof UI.reisPopupHtml === 'function';

const opts = reisOpties({ auto: { length: 3200, etaS: 260 }, trein: { length: 3500, etaS: 420, legs: [{ kind: 'train', length: 3500, line: 'Lijn 1' }] } }, { money: 50 });
const rijen = K.reisKeuzes(opts, 3200, {});
const gekozen = rijen.find((r) => r.aanbevolen && r.soort === 'snel').id;
const model = K.actieModel({ spot: { x: 3000, y: 400, name: 'Vismarkt' }, speler: { x: 0, y: 0 }, waypoint: null, opts });
const href = (f) => pathToFileURL(path.join(base, f)).href;

// de regels van het pauzemenu die de uitleg en de popup raken (de rest van pausemenu.css is niet nodig)
const pmCss = fs.readFileSync(path.join(base, 'js/pausemenu.css'), 'utf8').split('\n').filter((l) => /mv-help|mv-reispop/.test(l) && /^#pause-menu/.test(l)).join('\n');

const lagen = `<div class="m-lagen-paneel"><h3>Op de kaart</h3><p class="m-grp">Altijd <i>+</i></p><p class="m-grp">Te doen <i>-</i></p>${['Minigames', 'Bijbaantjes', 'Klussen', 'Ommeland', 'Percelen', 'Je velden', 'Na het verhaal'].map((t) => `<p class="m-lijn">${t}<span class="m-sw"></span></p>`).join('')}<p class="m-grp">Diensten <i>+</i></p><p class="m-grp">Onderweg <i>+</i></p></div>`;
const kaartChroom = (lagenOpen) => `
  <div class="m-kaart"></div>
  <div class="m-streek">0 VAN 8 STREKEN ONTDEKT</div>
  <div class="m-titel">Kaart</div>
  <div class="m-zoek">Zoek een plek, missie of minigame</div>
  <div class="m-lagenknop">Lagen <b>26/27</b></div>
  ${lagenOpen ? lagen : ''}
  ${lagenOpen ? '<div class="m-legenda"><b>Veroverd · wijken</b><p>Nog onzichtbaar</p><p>Zichtbaar</p><p>Aan het veroveren</p><p>Veroverd</p></div>' : ''}
  <div class="m-zoom"><span>+</span><span>-</span></div>
  <div class="m-hints">plek kiezen &nbsp; Q E onderdeel &nbsp; M sluiten &nbsp; Esc doorgaan</div>`;

const css = `
html, body { margin: 0; background: #0c140e; font-family: var(--ds-font-zeef-tekst, 'Atkinson Hyperlegible', Arial, sans-serif); }
section[data-scene] { display: none; }
.scene-eerste-keer section[data-scene="eerste-keer"], .scene-plekkaart section[data-scene="plekkaart"] { display: block; }
.m-wrap { position: relative; width: 100vw; height: 100vh; overflow: hidden; }
.mapview-overlay { position: absolute; inset: 0; }
.mapview-body { position: absolute; inset: 0; }
.m-kaart { position: absolute; inset: 0; background: radial-gradient(circle at 30% 30%, #1d3a2a, #0e1d15 70%); }
.m-kaart::after { content: ''; position: absolute; inset: 0; background-image: linear-gradient(120deg, transparent 48%, #2c4a38 49%, #2c4a38 50%, transparent 51%), linear-gradient(35deg, transparent 60%, #2c4a38 61%, #2c4a38 62%, transparent 63%); background-size: 340px 300px, 520px 440px; opacity: 0.7; }
.m-streek, .m-titel, .m-zoek, .m-lagenknop, .m-lagen-paneel, .m-legenda, .m-zoom span, .m-hints { position: absolute; background: #f3ead3; color: #1b1a17; border: 2px solid #1b1a17; border-radius: 10px; box-shadow: 4px 4px 0 #1b1a17; font-size: 16px; }
.m-streek { left: 4%; top: 7%; padding: 4px 10px; font-size: 14px; font-weight: 700; color: #0f5b34; }
.m-titel { left: 4%; top: 12%; padding: 4px 16px; font: 800 44px/1.1 'Bebas Neue', sans-serif; }
.m-zoek { left: 4%; top: 22%; width: 26%; padding: 12px 16px; }
.m-lagenknop { right: 4%; top: 7%; padding: 10px 20px; font: 800 24px 'Bebas Neue', sans-serif; }
.m-lagenknop b { font-size: 16px; margin-left: 10px; }
.m-lagen-paneel { right: 4%; top: 15%; width: 20%; padding: 14px 18px; }
.m-lagen-paneel h3 { margin: 0 0 8px; font: 800 22px 'Bebas Neue', sans-serif; color: #0f5b34; }
.m-lagen-paneel p { margin: 6px 0; } .m-grp { font-weight: 800; display: flex; justify-content: space-between; } .m-lijn { display: flex; justify-content: space-between; padding-left: 20px; }
.m-sw { width: 40px; height: 20px; border-radius: 10px; background: #0f5b34; }
.m-legenda { left: 1%; bottom: 6%; padding: 8px 12px; font-size: 14px; } .m-legenda p { margin: 2px 0; }
.m-zoom span { right: 4%; width: 44px; height: 44px; display: grid; place-items: center; font-size: 26px; } .m-zoom span:first-child { bottom: 22%; } .m-zoom span:last-child { bottom: 16%; }
.m-hints { right: 4%; bottom: 3%; padding: 8px 16px; }
.ds-uitleg-wijzer { z-index: 13; }
.m-wijzer-zoek { left: calc(4% - 6px); top: calc(22% - 6px); width: calc(26% + 12px); height: 52px; }
.m-wijzer-lagen { right: calc(4% - 6px); top: calc(7% - 6px); width: 190px; height: 52px; }
/* de plekkaart (nagemaakt; de echte staat in mapview.js) */
.mapview-card { --ink: #1b1a17; --mut: #4a463d; --g: #0f5b34; --line2: #1b1a17; --redtx: #a01b1b; position: absolute; left: 36%; top: 30%; width: 400px; display: flex; gap: 12px; padding: 14px; background: var(--ds-zeef-bg); color: var(--ds-zeef-tx); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); box-shadow: var(--ds-schaduw-hard); font-size: 18px; }
.mapview-card .mv-ico { width: 52px; height: 52px; flex: none; border: 1px solid #1b1a17; border-radius: 10px; background: #fff7; }
.mapview-card > div { display: flex; flex-direction: column; gap: 5px; min-width: 0; flex: 1; }
.mapview-card b { font: 800 26px/1.05 'Bebas Neue', sans-serif; } .mapview-card small { font-size: 16px; color: var(--ds-tx-zacht); }
.mapview-card .mv-link { font: inherit; font-size: 15px; background: none; border: 0; text-decoration: underline; padding: 4px 2px; color: inherit; width: max-content; }
.mapview-btn { min-height: 48px; font: 800 20px 'Bebas Neue', sans-serif; background: var(--ds-zeef-primair); border: 2px solid #1b1a17; border-radius: 10px; }
`;

const eerste = (nieuw ? '' : '') + `<div class="m-wrap"><div id="pause-menu" class="gm"><div class="mapview-overlay"><div class="mapview-body">${kaartChroom(!nieuw)}${nieuw ? '<span class="ds-uitleg-wijzer m-wijzer-zoek"><span class="ds-uitleg-wijzer__nr">1</span></span><span class="ds-uitleg-wijzer m-wijzer-lagen"><span class="ds-uitleg-wijzer__nr">2</span></span>' : ''}${UI.uitlegHtml({ gast: false })}</div></div></div></div>`;

const kaartKop = (stapHtml) => `<span class="mv-ico"></span><div><b>Vismarkt</b><small>Binnenstad · 3,2 km</small>${UI.actiesHtml(model, nieuw ? 'reis' : 'reis')}${stapHtml}<div><button type="button" class="mv-link">Sluiten</button></div></div>`;
const popup = nieuw ? UI.reisPopupHtml({ naam: 'Vismarkt', afstand: '3,2 km', rijen, gekozen, kleur: {}, gast: false, melding: '', reis: { label: 'Reis nu · € 12 · 4 min', uitgeschakeld: false } }) : '';
const oudStap = nieuw ? '' : UI.reisHtml(rijen, gekozen, {}) + `<button type="button" class="mapview-btn" data-card="rij">Reis nu · € 12 · 4 min</button>`;
const plekkaart = `<div class="m-wrap"><div id="pause-menu" class="gm"><div class="mapview-overlay"><div class="mapview-body">${kaartChroom(false)}<div class="mapview-card">${kaartKop(oudStap)}</div>${popup}</div></div></div></div>`;

const html = `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><title>Kaart: eerste keer en Reis erheen (mock ${nieuw ? 'nieuw' : 'oud'})</title>
<!-- Statische mock (scripts/ui/kaart_eerste_keer_mock.mjs). Echte tokens en echte opmaak, nagemaakte kaart. Open met ?scene=eerste-keer of ?scene=plekkaart. -->
<link rel="stylesheet" href="${href('fonts/fonts.css')}">
<link rel="stylesheet" href="${href('js/ds-tokens.css')}">
<link rel="stylesheet" href="${href('js/ds-components.css')}">
<link rel="stylesheet" href="${href('js/a11y.css')}">
<style>${css}
${UI.KAART_ACTIE_CSS}
${pmCss}</style></head>
<body class="scene-eerste-keer"><section data-scene="eerste-keer">${eerste}</section><section data-scene="plekkaart">${plekkaart}</section>
<script>const sc = new URLSearchParams(location.search).get('scene') || 'eerste-keer'; document.body.className = 'scene-' + sc; if (new URLSearchParams(location.search).get('rustig')) document.documentElement.classList.add('rustig-drukwerk'); const ui = new URLSearchParams(location.search).get('ui'); if (ui) document.body.style.zoom = ui;</script>
</body></html>`;
fs.mkdirSync(path.dirname(uit), { recursive: true });
fs.writeFileSync(uit, html);
console.log(`kaart_eerste_keer_mock: ${nieuw ? 'nieuw' : 'oud'} -> ${path.relative(ROOT, uit) || uit}`);
