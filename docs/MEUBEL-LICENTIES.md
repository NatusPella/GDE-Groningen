# Meubels en huisraad: bron en licentie

De meubels en het huisraad in de ruimtes van akte 1 (de keuken van de opening, de flat van Tammo en Tessa) komen uit twee packs van
**Quaternius**. Beide zijn **CC0 1.0** (publiek domein): naamsvermelding is niet verplicht, we doen het toch. Het besluit dat
CC0- en CC-BY-modellen tijdens de ontwikkeling in de repo mogen staat in ADR 0050 (branch `personages-leven-23-11`, gemaakt voor de
mensmodellen; dit document volgt hem voor meubels).

| Pack | Bron | Licentie | Gecontroleerd |
|---|---|---|---|
| Ultimate House Interior Pack | poly.pizza/bundle/Ultimate-House-Interior-Pack-2SXnFbwFzm (quaternius.com) | CC0 1.0 | 23-11 (download door de eigenaar) |
| Ultimate Furniture Pack | quaternius.com (poly.pizza) | CC0 1.0 | 23-11 (download door de eigenaar) |

Handle voor de credits: **Quaternius**.

## Wat er in git staat

Alleen de omgezette meubels die het spel gebruikt, in ons eigen formaat: `game/js/interiorprops_data.js` (gegenereerd, ongeveer
300 kB). De glb's zelf staan buiten git (`%USERPROFILE%/gde-assets/quaternius/`). Welke meubels, uit welk bestand, met welke schaal en
welke norm, staat in `game/js/propregister.js` (`INTERIEUR_REGISTER`).

- Omzetten: `node scripts/akte1/meubels_converteer.mjs` (leest de glb's, bakt de materiaalkleuren in vertexkleuren, zet de voorkant op
  +x en de oorsprong midden op de grond, schaalt per pack (`PACK_SCHAAL`) en maakt twee LOD-niveaus).
- Keuren: `node scripts/interiorprops_test.mjs` (norm, LOD, schaal tegen echte maten: deur 2,05, aanrecht 0,9, tafel 0,75,
  stoelzitting 0,45, bankzitting 0,42, bed 0,5, koelkast 1,8 m).
- Een meubel toevoegen: een regel in `INTERIEUR_REGISTER`, het script draaien, de test draaien. Geen glb in git.

Het spel haalt niets op: de modellen zijn tijdens de ontwikkeling gedownload en omgezet (constitutie 4).
