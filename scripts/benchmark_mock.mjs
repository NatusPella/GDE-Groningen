// Headless mocks van de nieuwe schermen (zonder Electron): het keuzescherm en de rapportkaart van de benchmark en de titelkaarten van de opening en de
// trailer, gemaakt uit het echte model en de echte markup (benchmarkmodel.js, benchmarkui.js, openingfilm.js) met de echte DS3-stijlen.
//   node scripts/benchmark_mock.mjs            schrijft docs/beeld-21-11/opening-trailer-benchmark/*.html
// Open ze in een browser (file://); de coördinator beoordeelt de echte beelden bij de Electron-sweep (docs/OPENING-TRAILER-BENCHMARK-VERIFICATIE-21-11.md).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { choiceModel, DEFAULT_CHOICE, frameReport, fpsSeries, reportCard } from '../game/js/benchmarkmodel.js';
import { choiceHtml, reportHtml } from '../game/js/benchmarkui.js';
import { TITLE, NAME_CARDS, skipHint } from '../game/js/openingfilm.js';
import { keyTextHtml } from '../game/js/keycap.js';
import { packRun } from '../game/js/benchstats.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'beeld-21-11', 'opening-trailer-benchmark');
fs.mkdirSync(OUT, { recursive: true });
const css = ['fonts/fonts.css', 'js/ds-tokens.css', 'js/ds-components.css', 'js/ds-keycap.css', 'js/ds-micro.css', 'js/ds-schermen.css'].map((f) => `<link rel="stylesheet" href="../../../game/${f}">`).join('\n');
const page = (title, body, extra = '') => `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<!-- Gegenereerd door scripts/benchmark_mock.mjs uit het echte model en de echte markup. Alleen een voorbeeld; geen spelstaat. -->
${css}
<style>html, body { margin: 0; min-height: 100vh; background: var(--ds-c-glas); color: var(--ds-c-creme); font-family: var(--ds-font-tekst); }
.mock-scene { position: relative; min-height: 100vh; background: linear-gradient(160deg, var(--ds-c-glas), var(--ds-c-glas-3)); }
${extra}</style></head><body class="ds-zeef-pagina">${body}</body></html>\n`;

// deterministic synthetic frame times (no random): a smooth run and a rough run with hitches
const wave = (n, base, amp, hitchEvery, hitchMs) => Array.from({ length: n }, (_, i) => base + amp * Math.sin(i / 37) + (hitchEvery && i % hitchEvery === 0 ? hitchMs : 0));
const shot = (id, label, ms) => ({ id, label, ms });
const good = [shot('sunrise', 'Zonsopgang', wave(240, 12, 1.2, 0)), shot('vismarkt', 'Vismarkt', wave(240, 13.5, 1.5, 120, 14)), shot('ommeland', 'De Ommelanden', wave(240, 11.5, 1, 0)), shot('boat', 'Rondvaartboot', wave(240, 14, 2, 90, 18)), shot('storm', 'Storm', wave(240, 15, 2, 0))];
const rough = [shot('sunrise', 'Zonsopgang', wave(160, 22, 3, 40, 30)), shot('vismarkt', 'Vismarkt', wave(160, 28, 5, 25, 40)), shot('ommeland', 'De Ommelanden', wave(160, 20, 3, 0)), shot('boat', 'Rondvaartboot', wave(160, 36, 6, 20, 45)), shot('storm', 'Storm', wave(160, 24, 4, 33, 35))];
const mkStats = (shots, cats) => { const all = shots.flatMap((s) => s.ms); const rep = frameReport(all); return { rep, series: fpsSeries(shots), avg: rep.avg, p95: rep.p95, low1: rep.low1, cats, hitches: shots.map((s) => { const n = s.ms.filter((x) => x > 33.4).length; return { id: s.label, slow33: n, share: n / s.ms.length }; }).sort((a, b) => b.share - a.share), memory: 812 }; };
const prev = packRun({ stats: { avg: 58, p95: 21, low1: 40, slow33Share: 0.004 }, preset: 'vlot', at: 1, course: 'film' });

const wrap = (inner, id) => `<div class="mock-scene"><div id="${id}" role="dialog" ${id === 'trailer-result' ? '' : ''}>${inner}</div></div>`;

fs.writeFileSync(path.join(OUT, 'benchmark-keuze.html'), page('Benchmark: keuze', `<div class="mock-scene"><div id="bench-choice" role="dialog" aria-modal="true" aria-labelledby="bm-titel">${choiceHtml(choiceModel(DEFAULT_CHOICE, { preset: 'vlot', presetLabel: 'Hoog' }))}</div></div>`));
const cardGood = reportCard({ stats: mkStats(good, { stad: { avg: 88 }, provincie: { avg: 82 }, water: { avg: 66 }, weer: { avg: 61 } }), preset: 'vlot', course: 'film', length: 'volledig', prev, size: [1920, 1080], presetFps: { laag: 142, middel: 104, vlot: 80, hoog: 61 } });
const cardRough = reportCard({ stats: mkStats(rough, { stad: { avg: 41 }, provincie: { avg: 49 }, water: { avg: 27 }, weer: { avg: 38 } }), preset: 'hoog', course: 'film', length: 'kort', prev, size: [1280, 720], presetFps: { laag: 62, middel: 48, vlot: 40, hoog: 31 } });
fs.writeFileSync(path.join(OUT, 'benchmark-rapportkaart.html'), page('Benchmark: rapportkaart (soepel)', `<div class="mock-scene"><div id="trailer-result" role="dialog" aria-modal="true" aria-labelledby="tr-res-title">${reportHtml(cardGood)}</div></div>`, '#trailer-result { position: static; min-height: 100vh; }'));
fs.writeFileSync(path.join(OUT, 'benchmark-rapportkaart-ruw.html'), page('Benchmark: rapportkaart (haperend)', `<div class="mock-scene"><div id="trailer-result" role="dialog" aria-modal="true" aria-labelledby="tr-res-title">${reportHtml(cardRough)}</div></div>`, '#trailer-result { position: static; min-height: 100vh; }'));

// titelkaarten: de opening, de trailer, de naamkaarten en de overslaan-hint, op tokens
const hint = keyTextHtml(skipHint().text);
const titles = `<div class="mock-scene tk">
<section class="tk-kaart"><div class="tk-kicker">${TITLE.kicker}</div><div class="tk-titel">${TITLE.title}</div><div class="tk-slogan">${TITLE.tagline}</div><div class="tk-sub">${TITLE.sub}</div><span class="tk-label">Opening: titelkaart (C00.3, 88,0 s)</span></section>
<section class="tk-kaart"><div class="tk-kicker">Gratis · voor pc en Mac</div><div class="tk-titel">GDE Groningen – Zomer vol misdaad</div><div class="tk-slogan">${TITLE.tagline}</div><span class="tk-label">Trailer ontdek: slotkaart (70 s)</span></section>
<section class="tk-naam"><b>${NAME_CARDS.tammo.name}</b><i>${NAME_CARDS.tammo.line}</i><span class="tk-label">Naamkaart Tammo (C00.1, 15,0 s)</span></section>
<section class="tk-naam"><b>${NAME_CARDS.tessa.name}</b><i>${NAME_CARDS.tessa.line}</i><span class="tk-label">Naamkaart Tessa (C00.2, 28,8 s)</span></section>
<section class="tk-hint"><div class="ds-z-chip">${hint}</div><span class="tk-label">Overslaan-hint (toets in de knop; houd 0,9 s)</span></section>
<section class="tk-prog"><span class="tk-p">Scène 5 van 15 · De Ommelanden</span><div class="ds-z-balk" style="--ds-z-w:33%"><div class="ds-z-balk__baan"><div class="ds-z-balk__vul"></div></div></div><span class="tk-label">Benchmark: voortgangsstrook tijdens de meting</span></section></div>`;
const tkCss = `.tk { display: grid; gap: var(--ds-s-5); padding: var(--ds-s-5); }
.tk section { position: relative; padding: var(--ds-s-6); border: var(--ds-lijn) solid var(--ds-c-glas-3); border-radius: var(--ds-r); text-align: center; background: var(--ds-c-glas); }
.tk-kicker { font-family: var(--ds-font-zeef-kop); letter-spacing: var(--ds-ls-label); text-transform: uppercase; color: var(--ds-c-ink-papier); }
.tk-titel { font-family: var(--ds-font-zeef-kop); font-size: var(--ds-t-cijfer); line-height: var(--ds-lh-kop); text-transform: uppercase; text-shadow: var(--ds-misdruk); color: var(--ds-c-ink-papier); }
.tk-slogan { margin-top: var(--ds-s-3); font-family: var(--ds-font-zeef-kop); font-size: var(--ds-t-kop); color: var(--ds-c-ink-papier); }
.tk-sub { margin-top: var(--ds-s-2); font-family: var(--ds-font-zeef-tekst); font-size: var(--ds-t-subkop); color: var(--ds-c-ink-papier); }
.tk-naam { text-align: left !important; } .tk-naam b { display: block; font-family: var(--ds-font-zeef-kop); font-size: var(--ds-t-cijfer); text-transform: uppercase; text-shadow: var(--ds-misdruk); color: var(--ds-c-ink-papier); }
.tk-naam i { display: block; border-left: var(--ds-lijn-dik) solid var(--ds-c-ink-roze); padding-left: var(--ds-s-3); font-family: var(--ds-font-zeef-tekst); font-size: var(--ds-t-subkop); font-style: normal; color: var(--ds-c-ink-papier); }
.tk-prog { display: flex; align-items: center; gap: var(--ds-s-3); } .tk-p { font-family: var(--ds-font-zeef-kop); font-weight: 800; letter-spacing: var(--ds-ls-label); color: var(--ds-c-ink-papier); }
.tk-label { position: absolute; right: var(--ds-s-3); bottom: var(--ds-s-2); font-size: var(--ds-t-hulp); color: var(--ds-c-creme-zacht); }`;
fs.writeFileSync(path.join(OUT, 'titelkaarten.html'), page('Titelkaarten en hints', titles, tkCss));
console.log(`geschreven in ${path.relative(ROOT, OUT)}: benchmark-keuze, benchmark-rapportkaart, benchmark-rapportkaart-ruw, titelkaarten (${cardGood.label} ${cardGood.cijfer} en ${cardRough.label} ${cardRough.cijfer})`);
