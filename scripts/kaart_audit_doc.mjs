// Schrijft docs/KAART-DS3-AUDIT-22-11.md uit de audit-data (scripts/lib/kaart_audit.mjs), zodat doc en code gelijk blijven.
//   node scripts/kaart_audit_doc.mjs --write
import './node3d.mjs';
import fs from 'node:fs';
import { bouwAudit, LAGEN, LEGENDA } from './lib/kaart_audit.mjs';

const A = await bouwAudit();
const rij = (m) => `| ${m.kind} | ${m.categorie} | ${m.bron === 'phosphor' ? 'Phosphor: ' + m.icoon : 'eigen (' + (m.eigenReden || '').slice(0, 60) + ')'} | ${m.vorm} | ${m.kleurToken} | ${m.minZoom} | ${m.legenda || '-'} |`;
const fas = A.markers.filter((m) => m.bron === 'phosphor').length;
const tekst = `# Kaart en DS3: audit van alle markers en lagen (22-11, #1009)

Vraag van de eigenaar: zijn de iconen op de kaart al aangepast aan Design System v3 (iconenset, kleuren)? Dit document is de audit; de data staat in
\`scripts/lib/kaart_audit.mjs\` en \`scripts/kaart_ds3_test.mjs\` loopt hem na. Het document wordt gemaakt door \`node scripts/kaart_audit_doc.mjs --write\`.

## Voor en na

| | voor (21-11) | na (22-11) |
|---|---|---|
| soorten met een Phosphor-icoon | ca. 45 van ${A.markers.length} (de rest: getekende glyph, uitgesneden uit een eigen tekening) | ${fas} van ${A.markers.length} |
| bewust eigen teken (met reden) | niet vastgelegd | ${A.markers.length - fas} |
| badgevulling uit DS3-tokens | ja (vijf rollen) | ja, zelfde rollen |
| basiskaart | donker glas, crème wegen | crème papier, inktlijnen (docs/KAART-PALETTEN-22-11.md) |
| ruwe hex in kaartcode buiten de palettabellen | niet gemeten | 0 (test) |
| vormen kleurenblind | station en horeca delen een vorm, flitspaal en winkel ook | alle paren met dezelfde vorm liggen minstens 25 apart bij elke kleurenblindheid |

## Markers

Kolommen: soort, categorie (mapicons.js), icoonbron, vorm, kleurtoken, zichtbaar vanaf zoom, legendarij.

| soort | categorie | icoon | vorm | kleur | zoom | legenda |
|---|---|---|---|---|---|---|
${A.markers.map(rij).join('\n')}

Wat bewust eigen blijft, en waarom, staat in \`EIGEN_SYMBOOL\` in \`game/js/mapmarkers.js\`: je eigen richtingspijl (draait), de vorm per medespeler (kleurenblind),
de doelmarkeringen en ringen, de politie-eenheden, de percelen (een letter per stand) en je eigen voertuig.

## Lagen, routelijnen en overige kaartelementen

| laag | kleur | bron | toelichting |
|---|---|---|---|
${LAGEN.map((l) => `| ${l.naam} | ${l.token} | ${l.bron} | ${l.toelichting} |`).join('\n')}

## Legenda

Gegroepeerd per categorie (Altijd, Te doen, Diensten, Onderweg), als DS3-zeefdrukkaart. Rijen: ${LEGENDA.map((r) => r.label).join(', ')}.

## Afspraken en afwijkingen

- Geel is het actieve routedoel en het doel van een missie; het staat altijd met een inktrand (op papier haalt geel maar 1,4:1). Afwijking: de perceelmarker "te koop" is nog geel.
- Eigen route is paars (a11y-palet \`user\`), klus oranje, opknappen roze: de kleurenblindpaletten van \`a11y.js\` zijn bewust geen DS-tokens.
- Overige iconen: gevuld in de categoriekleur met een crème of inkt glyph (hol zijn alleen de crème categorieën: activiteit en rest).
- Het actieve doel pulseert één keer 250 ms bij het verschijnen, daarna stil; bij Minder beweging nooit.
- Nog niet in beeld bekeken in het echte spel: zie het rapport onderaan docs/KAART-MARKERSTIJL-22-11.md.
`;
if (process.argv.includes('--write')) { fs.writeFileSync(new URL('../docs/KAART-DS3-AUDIT-22-11.md', import.meta.url), tekst); console.log('geschreven'); } else console.log(tekst);
