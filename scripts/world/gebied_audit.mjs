// Gebiedsaudit (#gebiedsnaam): de gebiedsdata en de wijknaam-keuze met de echte gegevens.
//   node scripts/world/gebied_audit.mjs [--stap=250] [--json]
// 1. data: polygonen die zonder reden groter zijn dan hun bbox-verwachting (omhullende groter dan de provincie of de gemeente),
//    niet gesloten of te korte ringen, gaten buiten hun buitenring, buurten buiten hun wijk, centroide buiten het gebied;
// 2. de keuze: een raster over de provincie; per punt wat het oude gedrag (dichtstbijzijnde wijkpunt) en het nieuwe gedrag
//    (districtAt) teruggeven, en hoeveel punten buiten de stad toch een stadswijk kregen.
// Puur lezen: geen netwerk, geen schrijven. Exit 1 bij een datafout of als het nieuwe gedrag nog stadswijken buiten de stad geeft.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const { ontvouw, grensVan, puntInGebied, puntInRing } = await imp('game/js/grenzen.js');
const { districtAt, CITY_LOCALITY } = await imp('game/js/wijkat.js');

const arg = (n, d) => { const a = process.argv.find((s) => s.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const stap = Number(arg('stap', 250));
const gr = ontvouw(JSON.parse(fs.readFileSync(path.join(root, 'game/grenzen.json'), 'utf8')));
const stad = JSON.parse(fs.readFileSync(path.join(root, 'game/stad.json'), 'utf8'));
const pts = (stad.meta && stad.meta.neighbourhoodPoints) || stad.neighbourhoodPoints || [];
const fouten = [];
const waarsch = [];
const fout = (s) => fouten.push(s);

// --- 1. de data ---
const pb = gr.provincie.b;
const provBreed = pb[2] - pb[0], provHoog = pb[3] - pb[1];
const area = (r) => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return Math.abs(a / 2); };
const gemById = new Map(gr.gemeenten.map((g) => [g.id, g]));
for (const laag of ['gemeenten', 'woonplaatsen', 'wijken', 'buurten']) {
  for (const g of gr[laag]) {
    const b = g.b;
    if (![...b].every(Number.isFinite)) { fout(`${laag} ${g.id} ${g.naam}: omhullende heeft NaN`); continue; }
    if (b[2] - b[0] > provBreed * 1.05 || b[3] - b[1] > provHoog * 1.05) fout(`${laag} ${g.id} ${g.naam}: omhullende groter dan de provincie`);
    if (laag !== 'gemeenten' && g.gm && gemById.has(g.gm)) {
      const gb = gemById.get(g.gm).b;
      const ruim = 800;
      if (b[0] < gb[0] - ruim || b[1] < gb[1] - ruim || b[2] > gb[2] + ruim || b[3] > gb[3] + ruim) fout(`${laag} ${g.id} ${g.naam}: steekt meer dan ${ruim} m buiten zijn gemeente`);
    }
    if (!g.c || !Number.isFinite(g.c[0]) || !Number.isFinite(g.c[1])) fout(`${laag} ${g.id} ${g.naam}: geen middelpunt`);
    else if (!puntInGebied(g, g.c[0], g.c[1])) fout(`${laag} ${g.id} ${g.naam}: middelpunt ligt niet in het gebied`);
    for (const p of g.p) {
      if (p[0].length < 3) fout(`${laag} ${g.id} ${g.naam}: buitenring met minder dan 3 punten`);
      else if (p[0].length === 3) waarsch.push(`${laag} ${g.id} ${g.naam}: buitenring is een driehoek (vereenvoudigd tot drie punten, ca. ${Math.round(area(p[0]))} m2)`);
      if (area(p[0]) < 1) fout(`${laag} ${g.id} ${g.naam}: buitenring zonder oppervlak`);
      for (let k = 1; k < p.length; k++) {
        const gat = p[k];
        const mx = gat.reduce((a, q) => a + q[0], 0) / gat.length, my = gat.reduce((a, q) => a + q[1], 0) / gat.length;
        if (gat.length >= 3 && !puntInRing(mx, my, p[0]) && !puntInRing(gat[0][0] + 0.5, gat[0][1] + 0.5, p[0])) fout(`${laag} ${g.id} ${g.naam}: gat ${k} ligt buiten zijn buitenring`);
      }
    }
  }
}
// een buurt hoort in de wijk van zijn code
const wijkIds = new Set(gr.wijken.map((w) => w.id));
let buurtZonderWijk = 0;
for (const bu of gr.buurten) if (bu.wk && !wijkIds.has(bu.wk)) buurtZonderWijk++;
if (buurtZonderWijk) fout(`${buurtZonderWijk} buurten verwijzen naar een wijk die niet bestaat`);
// de wijkpunten van de stad liggen in de stad (woonplaats Groningen)
for (const p of pts) {
  const r = grensVan(gr, p.x, p.y);
  if (!r.woonplaats || r.woonplaats.naam !== CITY_LOCALITY) fout(`wijkpunt ${p.name} ligt niet in woonplaats ${CITY_LOCALITY}`);
}

// --- 2. de keuze op een raster ---
let inProv = 0, buitenStad = 0, oudFout = 0, nieuwFout = 0, nieuwStad = 0;
const oudPlekken = new Map(), oudNamen = new Map();
let maxAfstand = 0, minNaarWoonplaats = Infinity;
const voorbeelden = [];
for (let x = pb[0]; x <= pb[2]; x += stap) {
  for (let y = pb[1]; y <= pb[3]; y += stap) {
    const r = grensVan(gr, x, y);
    if (!r.provincie) continue;
    inProv++;
    const inStad = !!r.woonplaats && r.woonplaats.naam === CITY_LOCALITY;
    let best = null, bd = Infinity;
    for (const p of pts) { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } }
    const nieuw = districtAt(pts, x, y, { grenzen: gr });
    if (!inStad) {
      buitenStad++;
      oudFout++;
      oudNamen.set(best.name, (oudNamen.get(best.name) || 0) + 1);
      const sleutel = `${Math.round(x / 2000)},${Math.round(y / 2000)}`;
      oudPlekken.set(sleutel, (oudPlekken.get(sleutel) || 0) + 1);
      if (bd > maxAfstand) maxAfstand = bd;
      if (nieuw) { nieuwFout++; if (voorbeelden.length < 8) voorbeelden.push({ x, y, naam: nieuw.name, woonplaats: r.woonplaats && r.woonplaats.naam }); }
    } else if (nieuw) nieuwStad++;
  }
}
const uit = { stap, punten: inProv, buitenStad, oudFoutBuitenStad: oudFout, nieuwFoutBuitenStad: nieuwFout, nieuweStadspunten: nieuwStad, maxAfstandTotWijkpunt: Math.round(maxAfstand), topOudeNamen: [...oudNamen].sort((a, b) => b[1] - a[1]).slice(0, 6), voorbeelden, datafouten: fouten.length };
if (process.argv.includes('--json')) console.log(JSON.stringify({ ...uit, fouten }, null, 1));
else {
  console.log(`Raster ${stap} m over de provincie: ${inProv} punten, ${buitenStad} buiten woonplaats ${CITY_LOCALITY}.`);
  console.log(`Oud gedrag (dichtstbijzijnde wijkpunt, geen grens): ${oudFout} punten buiten de stad kregen een stadswijk (verste: ${uit.maxAfstandTotWijkpunt} m van het wijkpunt). Meest genoemd: ${uit.topOudeNamen.map(([n, c]) => `${n} ${c}`).join(', ')}.`);
  console.log(`Nieuw gedrag (districtAt): ${nieuwFout} punten buiten de stad met een stadswijk; ${nieuwStad} punten in de stad met een wijk.`);
  for (const v of voorbeelden) console.log(`  voorbeeld: (${v.x}, ${v.y}) ${v.naam} in ${v.woonplaats}`);
  console.log(`Datafouten: ${fouten.length}, waarschuwingen: ${waarsch.length}`);
  for (const w of waarsch.slice(0, 20)) console.log('  ! ' + w);
  for (const f of fouten.slice(0, 40)) console.log('  - ' + f);
}
process.exit(fouten.length || nieuwFout ? 1 : 0);
