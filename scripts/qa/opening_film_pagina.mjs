// Bouwt de voor/na-pagina van de openingsfilm (docs/beeld-28-11/regie/opening/index.html) uit twee runs van opening_film_beelden.mjs.
//   node scripts/qa/opening_film_pagina.mjs --voor=voor,voor2 --na=na,na2 [--out=docs/beeld-28-11/regie/opening]
// Per shot een rij: de stills van voor en na naast elkaar (kopie in de uitvoermap), met de spreker(s) van dat shot aangeduid.
import fs from 'node:fs';
import path from 'node:path';
import { SEQUENCE, LINES } from '../../game/js/openingfilm.js';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const arg = (k, d = '') => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const out = path.join(ROOT, arg('out', 'docs/beeld-28-11/regie/opening'));
const lees = (labels) => labels.split(',').filter(Boolean).flatMap((l) => {
  const dir = path.join(ROOT, '.scr', 'film', l), f = path.join(dir, 'result.json');
  if (!fs.existsSync(f)) return [];
  return (JSON.parse(fs.readFileSync(f, 'utf8')).shots || []).map((s) => ({ ...s, dir }));
});
const voor = lees(arg('voor')), na = lees(arg('na'));
const lineById = (id) => LINES.find((l) => l.id === id);
const kopieer = (run, naam) => { const to = path.join(out, run, naam + '.jpg'); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(path.join(run === 'voor' ? voorDir(naam) : naDir(naam), naam + '.jpg'), to); return `${run}/${naam}.jpg`; };
const voorMap = new Map(voor.map((s) => [s.name, s.dir])), naMap = new Map(na.map((s) => [s.name, s.dir]));
const voorDir = (n) => voorMap.get(n), naDir = (n) => naMap.get(n);
const ids = [...new Set([...SEQUENCE.map((s) => s.id)])];
// komt een shot in meer runs voor, dan telt de laatste run (de nieuwste stand van de camera)
const laatste = (lijst, id) => { const alle = lijst.filter((s) => s.id === id); const dir = alle.length ? alle[alle.length - 1].dir : null; return alle.filter((s) => s.dir === dir); };
const cel = (run, lijst, id) => laatste(lijst, id).filter((s) => fs.existsSync(path.join(run === 'voor' ? voorDir(s.name) : naDir(s.name), s.name + '.jpg')))
  .map((s) => `<figure><img loading="lazy" src="${kopieer(run, s.name)}" alt="${id} ${Math.round(s.f * 100)}%"><figcaption>${Math.round(s.f * 100)}% van het shot</figcaption></figure>`).join('') || '<em>geen beeld (shot bestond niet)</em>';
const spreker = (s) => { const w = [...new Set(s.lines.map((i) => lineById(i)).filter((l) => !l.channel).map((l) => l.speaker))]; const r = s.lines.some((i) => lineById(i).channel === 'radio'); return [...w, ...(r ? ['Rikus (radio, uit beeld)'] : [])].join(', ') || 'niemand praat'; };
let html = `<!doctype html><meta charset="utf-8"><title>Opening: voor en na (28-11)</title><style>body{font:14px system-ui;background:#16140f;color:#f2ead6;margin:20px}h1{font-size:20px}.rij{border-top:1px solid #5a523c;padding:10px 0}.rij h2{font-size:15px;margin:0 0 4px}.kolommen{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0 0 6px}img{width:100%;display:block;border:1px solid #333}figcaption{font-size:12px;opacity:.7}.spr{color:#f5c25c}</style><h1>De opening van een nieuw spel: voor en na</h1><p>Voor: de film zoals hij op de basis stond (alleen achter <code>?openingfilm</code>). Na: de nieuwe openingssequentie (establishing shots, titelkaart voor de mensen). Beelden uit Electron, 1920x1080, tijd stilgezet per shot (lock-step). Per shot staat wie praat.</p>`;
for (const id of ids) {
  const s = SEQUENCE.find((q) => q.id === id);
  html += `<div class="rij"><h2>${id} <span class="spr">spreker: ${spreker(s)}</span></h2><div>${s.cam || s.note || ''}</div><div class="kolommen"><div><b>voor</b>${cel('voor', voor, id)}</div><div><b>na</b>${cel('na', na, id)}</div></div></div>`;
}
html += `<h2>Lintvondsten voor en na</h2><p>De film zelf is geen lint-eenheid: hij heeft eigen controles in <code>scripts/openingfilm_test.mjs</code> (regie-bijbel R-01 tot R-30, geen reactie of insert midden in een regel, de spatie-regel van #1341, de veiligheidswacht). De drie oude opening-acts uit <code>cutscenes.js</code> (nu de terugval) zijn in deze ronde niet gewijzigd.</p><table border="1" cellpadding="4" style="border-collapse:collapse"><tr><th>eenheid</th><th>score voor</th><th>score na</th><th>regievondsten voor</th><th>na</th></tr><tr><td>story-opening-trailer</td><td>99</td><td>99</td><td>C14 1</td><td>C14 1 (terugval, ongewijzigd)</td></tr><tr><td>story-opening-keuken</td><td>95</td><td>95</td><td>C06 2, C07 2, C14 1</td><td>gelijk (terugval)</td></tr><tr><td>story-opening-verhuisdag</td><td>66</td><td>66</td><td>C06 2, C13 2, C12 2</td><td>gelijk (terugval)</td></tr><tr><td>de film: reactie of insert midden in een regel</td><td>6 plaatsen (c2-bank, c2-wagen, c2-plan, c2-thuis, c2-huur, c3-geld)</td><td>0 (test)</td><td colspan="2">controle in openingfilm_test: verboden camerawissels staan niet meer in de bron</td></tr><tr><td>de film: spreker van achteren</td><td>Tessa (c3-toren, c3-geld) en Tammo (c3-toren) van achteren</td><td>0 op het beeld</td><td colspan="2">Tessa nu driekwart van voren; Tammo draait zich om voor hij praat</td></tr></table>`;
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log('pagina', path.join(out, 'index.html'));
