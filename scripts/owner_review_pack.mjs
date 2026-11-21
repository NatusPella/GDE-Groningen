// Maakt de eigenaar-reviewpagina (docs/RELEASEGATE.md, "Eigenaar-review: 20 screenshots"): ÉÉN webpagina met alle beelden,
// een korte vraag per beeld en klikbare keuzes, plus het bewijsbestand release/owner-review.json met status "wacht op eigenaar".
//   node scripts/owner_review_pack.mjs --beelden=<map met 1920x1080-png's> [--uit=<map voor de pagina>] [--datum=JJJJ-MM-DD]
// De pagina wordt NIET geopend door dit script. De keuzes staan in de browser (localStorage van de pagina zelf, niet het spel);
// "Kopieer antwoorden" geeft een tekst die de coördinator in owner-review.json verwerkt. Alleen Nederlands voor wat de eigenaar ziet.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const beeldDir = path.resolve(arg('beelden', ''));
const uitDir = path.resolve(arg('uit', beeldDir));
const datum = arg('datum', new Date().toISOString().slice(0, 10));
if (!arg('beelden', '') || !fs.existsSync(beeldDir)) { console.error('Geef --beelden=<map> mee.'); process.exit(2); }

// De vragen per beeld: sleutel = deel van de bestandsnaam (zonder de grootte en het volgnummer).
export const VRAGEN = {
  keuzekaart: ['Keuzekaart Alleen spelen / Samen spelen', 'Is meteen duidelijk wat je kiest? Staat het logo goed, en is er geen tekstmuur?'],
  laadscherm: ['Laadscherm', 'Loopt de balk door met één statusregel? Geen Enter-knop en geen tipregel meer, klopt dat?'],
  opening: ['Opening (film)', 'Staat de overslaan-hint op de tekstregel en is hij leesbaar?'],
  naamkaart: ['Naamkaart voor Samen spelen ("Je naam voor Samen spelen")', 'Is de kaart rustig en is duidelijk wat je invult en waar je mee akkoord gaat?'],
  'hud-minimap': ['HUD onderweg met minimap en politie', 'Overlapt niets? Zegt de doelbalk wat je moet doen en wijzen de pijlen op de kaart de goede kant op?'],
  'pauzemenu-spel': ['Pauzemenu', 'Staat Doorgaan bovenaan en is het menu compact en rustig?'],
  loopbaan: ['Loopbanen', 'Is te zien wat je vakken en bijbanen zijn en wat je hierna kunt doen?'],
  spullen: ['Spullen', 'Zijn de plaatjes van wat je hebt duidelijk, zonder vraagtekens?'],
  kaart: ['Kaart', 'Zijn de popups, de knop Reis erheen en Zet waypoint duidelijk, en overspoelt horeca de kaart niet?'],
  'bezit-overzicht': ['Bezit: Land en bedrijf, overzicht', 'Is in één oogopslag te zien wat je bezit en wat het oplevert?'],
  'bezit-tekoop': ['Bezit: Te koop', 'Zijn prijs en soort pand duidelijk, en is de lijst niet te lang?'],
  'voetbal-carriere': ['Voetbalcarrière', 'Zijn selectie, kalender en stand goed te lezen? (De kaarten staan een beetje scheef en overlappen elkaar licht: is dat de bedoeling?)'],
  'instellingen-toegankelijkheid': ['Instellingen: toegankelijkheid', 'Vind je hier wat je zoekt en zijn de opties begrijpelijk?'],
  radiokeuze: ['Radiokeuze (geluid)', 'Is de zenderkeuze duidelijk en past de uitleg?'],
  prestaties: ['Prestaties', 'Is duidelijk wat je gehaald hebt en wat nog kan?'],
  pashokje: ['Kleding: pashokje', 'Is de 3D-voorvertoning goed te zien en zijn stukken, outfits en kapsels te vinden?'],
  'tuning-showroom': ['Tuning: de showroom met draaitafel', 'Zijn categorieën, uitleg en de toets in de knop duidelijk?'],
  'voetbal-uitzending': ['Voetbalwedstrijd met tv-presentatie', 'Is de tv-laag (opstelling, stand, commentaar) leesbaar en overlapt niets?'],
  'zomerdag-middag': ['Zomerdag, middag', 'Is de kleur rustig en is het duidelijk zomer?'],
  prestatietoast: ['Prestatietoast', 'Is de melding goed te lezen (naam, voortgang, zeldzaamheid) en staat hij niet in de weg?'],
  zomeravond: ['Zomeravond', 'Is de avond mooi en is het nog steeds zomer?'],
};
const sleutelVan = (f) => f.replace(/\.png$/i, '').replace(/^\d+-?\d*x?\d*-?/, '').replace(/^\d{2}-/, '').replace(/^\d+x\d+-/, '');
const png = fs.readdirSync(beeldDir).filter((f) => /\.png$/i.test(f) && /\d{2}-/.test(f)).sort();
const items = png.map((f) => {
  const k = Object.keys(VRAGEN).find((s) => f.replace(/\.png$/i, '').endsWith('-' + s) || f.replace(/\.png$/i, '').endsWith(s));
  const [titel, vraag] = k ? VRAGEN[k] : [sleutelVan(f), 'Ziet dit er goed uit en klopt het met wat je verwacht?'];
  return { bestand: f, titel, vraag };
});
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const html = `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><title>GDE Groningen 0.65.0: eigenaar-review</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{margin:0;background:#15181c;color:#eef1f3;font:16px/1.45 system-ui,sans-serif}
header{position:sticky;top:0;z-index:5;background:#15181cf2;padding:12px 20px;border-bottom:1px solid #2c333a;display:flex;gap:16px;align-items:center;flex-wrap:wrap}
header h1{font-size:18px;margin:0}header .tel{opacity:.8}
button{font:inherit;color:inherit;background:#252b32;border:1px solid #3a434c;border-radius:8px;padding:8px 14px;cursor:pointer}
button:hover{background:#2f3740}button[aria-pressed=true]{background:#2f6b3c;border-color:#4a9a5c}
button.rood[aria-pressed=true]{background:#8a2f2f;border-color:#c25b5b}button.geel[aria-pressed=true]{background:#8a6a1f;border-color:#c9a447}
main{max-width:1500px;margin:0 auto;padding:12px 20px 80px}
article{margin:28px 0;padding-bottom:24px;border-bottom:1px solid #2c333a}
article h2{margin:0 0 4px;font-size:20px}article p{margin:0 0 10px;opacity:.9}
img{width:100%;height:auto;border-radius:10px;border:1px solid #2c333a;display:block;background:#000}
.keuzes{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;align-items:center}
textarea{flex:1;min-width:260px;background:#0f1215;color:inherit;border:1px solid #3a434c;border-radius:8px;padding:8px;font:inherit}
.noot{opacity:.75;font-size:14px}
</style></head><body>
<header><h1>GDE Groningen 0.65.0: ${items.length} schermen uit het echte spel</h1><span class="tel" id="tel"></span>
<button id="kopieer">Kopieer antwoorden</button><span class="noot" id="melding"></span></header>
<main>
<p class="noot">Alle beelden komen uit het draaiende spel (1920x1080). Geen mens heeft ze bekeken voordat jij kijkt. Kies per beeld: Goed, Kan beter of Fout, en typ zo nodig een opmerking. Je keuzes blijven in deze browser staan; "Kopieer antwoorden" geeft een tekst die je terug kunt sturen.</p>
${items.map((it, i) => `<article id="b${i}" data-bestand="${esc(it.bestand)}"><h2>${i + 1}. ${esc(it.titel)}</h2><p>${esc(it.vraag)}</p>
<img src="${esc(it.bestand)}" alt="${esc(it.titel)}" loading="${i < 3 ? 'eager' : 'lazy'}">
<div class="keuzes"><button data-k="goed" aria-pressed="false">Goed</button><button class="geel" data-k="beter" aria-pressed="false">Kan beter</button><button class="rood" data-k="fout" aria-pressed="false">Fout</button>
<textarea rows="2" placeholder="Opmerking (niet verplicht)"></textarea></div></article>`).join('\n')}
</main>
<script>
const KEY = 'gde-owner-review-0.65.0';
const st = JSON.parse(localStorage.getItem(KEY) || '{}');
const arts = [...document.querySelectorAll('article')];
const tel = () => { const n = arts.filter((a) => (st[a.dataset.bestand] || {}).k).length; document.getElementById('tel').textContent = n + ' van ' + arts.length + ' beoordeeld'; };
const bewaar = () => { localStorage.setItem(KEY, JSON.stringify(st)); tel(); };
arts.forEach((a) => {
  const f = a.dataset.bestand; const s = st[f] || (st[f] = {});
  const ta = a.querySelector('textarea'); ta.value = s.opm || '';
  a.querySelectorAll('button').forEach((b) => { b.setAttribute('aria-pressed', String(s.k === b.dataset.k)); b.onclick = () => { s.k = s.k === b.dataset.k ? '' : b.dataset.k; a.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(s.k === x.dataset.k))); bewaar(); }; });
  ta.oninput = () => { s.opm = ta.value; bewaar(); };
});
document.getElementById('kopieer').onclick = async () => {
  const t = arts.map((a, i) => { const s = st[a.dataset.bestand] || {}; return (i + 1) + '. ' + a.querySelector('h2').textContent.replace(/^\\d+\\.\\s*/, '') + ' [' + a.dataset.bestand + ']: ' + ({ goed: 'goed', beter: 'kan beter', fout: 'fout' }[s.k] || 'niet beoordeeld') + (s.opm ? ' - ' + s.opm : ''); }).join('\\n');
  try { await navigator.clipboard.writeText(t); document.getElementById('melding').textContent = 'Gekopieerd'; } catch (e) { prompt('Kopieer deze tekst:', t); }
};
tel();
</script></body></html>
`;
fs.mkdirSync(uitDir, { recursive: true });
const pagina = path.join(uitDir, 'eigenaar-review.html');
fs.writeFileSync(pagina, html);
// Het bewijsbestand (scripts/release/ownerreview.mjs): zolang de eigenaar niet gekeken heeft is de status "wacht op eigenaar" en keurt --verify het niet goed.
const bewijsPad = path.join(root, 'release', 'owner-review.json');
fs.mkdirSync(path.dirname(bewijsPad), { recursive: true });
fs.writeFileSync(bewijsPad, JSON.stringify({ datum, aantal: items.length, status: 'wacht op eigenaar', pagina: pagina.replace(/\\/g, '/'), bestanden: items.map((i) => i.bestand) }, null, 2) + '\n');
console.log(`pagina: ${pagina}\nbewijs: ${bewijsPad}\nbeelden: ${items.length}`);
