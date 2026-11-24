// Eén webpagina met de voor- en na-beelden van de ruimtes van akte 1 (sets_render.mjs --tag=voor/--tag=na), per scène naast elkaar,
// met wat er veranderd is en wat niet in beeld is gezien.
//   node scripts/akte1/sets_pagina.mjs [--out=docs/beeld-23-11/akte1]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(ROOT, arg('out', 'docs/beeld-23-11/akte1'));
const stats = (tag) => { try { return JSON.parse(fs.readFileSync(path.join(OUT, `stats-${tag}.json`), 'utf8')); } catch { return {}; } };
const sv = stats('voor'), sn = stats('na');

const SCENES = [
  { kop: 'De keuken van de opening (Zolderkeuken, C00.2)', items: [
    ['keuken-breed', 'Wijd vanaf de deur', 'Gestuukte muren in plaats van strepen, plafond, plinten en tegels; spoelkast, fornuis, wasmachine, koelkast, plank met cactus, tafel met twee houten stoelen op een kleed, hanglamp, raamkozijn en plant uit de CC0-packs van Quaternius.'],
    ['keuken-schouder', 'Over de schouder op Tessa', 'De radio is een echte prop (buisradio) op de vensterbank; het raam met de dageraad blijft vrij.'],
    ['keuken-aanrecht', 'Het aanrecht', 'Kastjes en apparaten in plaats van groene vlakken; licht van de tafellamp valt over de tegels.'],
    ['keuken-deur', 'Naar de deur', 'De deur kijkt een verlichte gang in (planken, lamp, plant, deur naar het trappenhuis) in plaats van een zwart vlak (VQA 23-11 #4).'],
    ['keuken-raam', 'Naar het raam', 'Echt kozijn met glas voor de dageraad; licht per ruimte: tafellamp, dageraad door het raam, ganglamp.'],
    ['keuken-deurshot', 'Het deurshot van de naamkaart (maatpop 1,78 m, letterbox 2,39:1)', 'In de video (VQA 23-11 #2) raakte de kin van Tammo de bovenrand. Met een maatpop van 1,78 m staat het hoofd in beide beelden; na de fix staat de camera op ooghoogte en verder weg, met ruim twee keer zoveel hoofdruimte, zodat ook een grotere figuur heel in beeld blijft. Met het echte personage niet bekeken.'],
  ] },
  { kop: 'De flat van Tammo en Tessa (Paddepoel)', items: [
    ['flat-overzicht', 'Overzicht (cutaway)', 'Elke kamer ingericht; de zwevende lampvlakken boven de cutaway zijn weg, drie warme lampen per kamergroep.'],
    ['flat-woonkamer', 'Woonkamer', 'Woonkamer van twee net-afgestudeerden: de bank recht tegenover de tv, beide op een groot kleed met de bijzettafel ertussen; boekenkast, bureau met laptop en lamp, een stapel verhuisdozen, een droogrek met was, een verzonnen print en poster, planten, een staande lamp. Looproutes van de gangdeur naar het raam en tussen tv en tafel blijven vrij (akte1_sets_test). Geen gordijnen: in de cutaway zakt de glasgevel tot heuphoogte en een gordijn van 2,4 m zou los in de lucht hangen.'],
    ['flat-keuken', 'Keuken', 'Spoelkast, fornuis met de frituurpan (propregister), wasmachine, koelkast, tafel met twee stoelen.'],
    ['flat-slaapkamers', 'Slaapkamers', 'Twee bedden met nachtkastje en lamp, kledingkasten, bureau met stoel bij Tessa.'],
  ] },
];

const img = (f) => (fs.existsSync(path.join(OUT, f)) ? `<img src="${f}" alt="${f}" loading="lazy">` : '<div class="leeg">niet gemaakt</div>');
const telling = (s, k) => (s[k] ? `${s[k].calls} draw calls, ${s[k].tris} driehoeken` : '');
let body = '';
for (const sc of SCENES) {
  body += `<h2>${sc.kop}</h2>\n`;
  for (const [k, titel, wat] of sc.items) {
    body += `<section><h3>${titel}</h3><p>${wat}</p><div class="paar"><figure>${img(`${k}-voor.jpg`)}<figcaption>Voor · ${telling(sv, k)}</figcaption></figure><figure>${img(`${k}-na.jpg`)}<figcaption>Na · ${telling(sn, k)}</figcaption></figure></div></section>\n`;
  }
}
// in de echte wereld (Electron, scripts/qa/akte1_sets_beeld.mjs via de veilige runner): ochtend 7,4 en avond 21,5
const wereld = fs.readdirSync(OUT).filter((f) => /^wereld-.+-7\.4\.jpg$/.test(f)).map((f) => f.replace(/^wereld-/, '').replace(/-7\.4\.jpg$/, ''));
if (wereld.length) {
  body += `<h2>In de wereld (Electron): ochtend en avond</h2><p>De keuken hoog boven de straat zoals de opening hem neerzet, met de geleende setlampen; de flat op zijn plek in de toren in Paddepoel (de toren erboven verborgen zoals in het spel). Gemaakt met <code>scripts/qa/akte1_sets_beeld.mjs</code> (veilige runner, --no-sandbox, wegwerpprofiel), omgezet met <code>scripts/akte1/png_naar_jpg.mjs</code>.</p>\n`;
  for (const k of wereld) body += `<section><h3>${k}</h3><div class="paar"><figure>${img(`wereld-${k}-7.4.jpg`)}<figcaption>Ochtend (7,4)</figcaption></figure><figure>${img(`wereld-${k}-21.5.jpg`)}<figcaption>Avond (21,5)</figcaption></figure></div></section>\n`;
}
body += `<h2>De meubels uit het register</h2><p>Lod 0 (het model) en lod 1 (van het centrale LOD-systeem, lodkit3d.js, soort interior). Blauwe paal: 1,8 m; rode pijl: de voorkant (+x).</p><div class="paar"><figure>${img('meubelblad-lod0-na.jpg')}<figcaption>Lod 0</figcaption></figure><figure>${img('meubelblad-lod1-na.jpg')}<figcaption>Lod 1</figcaption></figure></div>`;

const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Akte 1 op eindniveau: voor en na</title>
<style>body{font:15px/1.45 system-ui,sans-serif;margin:24px auto;max-width:1500px;padding:0 16px;background:#f4f1ea;color:#1d1d1d}
h1{margin:0 0 4px}h2{margin-top:36px;border-bottom:2px solid #c9b48a}section{margin:18px 0 28px}.paar{display:grid;grid-template-columns:1fr 1fr;gap:12px}
figure{margin:0}img{width:100%;border-radius:4px;display:block}figcaption{font-size:13px;color:#555;margin-top:4px}.leeg{background:#ddd;aspect-ratio:16/9;display:grid;place-items:center}
.let{background:#fff7e0;border-left:4px solid #d9a53a;padding:8px 12px}</style></head><body>
<h1>Akte 1 op eindniveau: de keuken en de flat, voor en na</h1>
<p>Branch <code>akte1-eindniveau-23-11</code>. Gemaakt met <code>scripts/akte1/sets_render.mjs</code> (headless Chrome, three.js uit de vendor-cache, de set alleen, met het licht van de wereld nagebootst) en <code>scripts/akte1/sets_pagina.mjs</code>.</p>
<p class="let">Niet in beeld gezien: de sets tijdens het echte spelen (de opening met de personages op de stoelen, de speler in de flat met de volgcamera), de stand Laag (daar zijn de setlampen echte lampen), de LOD-wissel tijdens het spelen (scene3d.js roept updateLodObjects pas aan op perf-ultra-23-11).</p>
${body}
</body></html>`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
console.log('geschreven:', path.relative(ROOT, path.join(OUT, 'index.html')));
