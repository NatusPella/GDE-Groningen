# Stemkeuze: de zeventien sprekers van het nieuwe verhaal

Zeventien personages uit het nieuwe verhaal hebben regels maar hadden geen stem in `CAST`
(`scripts/tts_lines_list.mjs`); zonder stem maakt de takenlijst geen opdracht voor ze. Op
**6-11-2026** heeft de eigenaar de keuze aan de agent overgelaten. Hieronder de gekozen stemmen,
meteen vastgelegd in `CAST` met stem, wie-beschrijving, stijlpoelen en `accent: GRO_ACCENT`; ze
spreken dus Gronings, net als hun regels.

De keuze is op papier gedaan: per stem is de beschrijving van de dertig vaste Gemini-stemmen
gevolgd. Er is nog niets beluisterd of opgenomen. Delen met een bestaand personage mag: `Leda` is
nu bijvoorbeeld zowel Femke, het kind als "Kind in het publiek".

| Spreker | Regels | Stem | Personage | Waarom | Deelt stem met |
|---|---:|---|---|---|---|
| Wubbo | 24 | `Sadaltager` | brugwachter met een werkfilosofie | "Knowledgeable": droog en bedachtzaam, past bij iemand die zijn hele werk in twee zinnen vat | Henk |
| Willemien | 24 | `Aoede` | gastvrouw, nuchter en hartelijk | "Breezy": warm zonder zoetig te worden | Boerin Geesje |
| Lammert | 19 | `Iapetus` | havenmeester Delfzijl, verteller | "Clear": droog, op leeftijd, vertelt graag | Schipper Lammert |
| Jurylid | 19 | `Umbriel` | verontwaardigd jurylid | "Easy-going": gelooft het allemaal net niet | Sjoerd, Kroegbaas Tjakko |
| Tinus | 18 | `Enceladus` | oude boer met een trekker | "Breathy": schor, boers | Kapitein Klaas, Boer Hindrik |
| Roelfien | 14 | `Laomedeia` | kordate vrouw met een sleepvliegtuigje | "Upbeat": doet en denkt tegelijk | Ubbo (app-stem) |
| Accountmanager | 12 | `Zubenelgenubi` | gladde verkoper van Wiebelwerk | "Casual": soepel, verkoperig | Geert, Kroegbaas Roelf |
| Loketbediende | 9 | `Autonoe` | gemeenteloket | "Bright": vriendelijk en volstrekt onverschillig | — |
| Mevrouw Hoving | 5 | `Gacrux` | deftig, bewaart de Gouden Eierbal | "Mature": statig, op leeftijd | Mem Terpstra |
| Boer | 2 | `Charon` | boer bij het erf | "Gravelly": alle andere boeren hebben hem ook | Berend, Ome Jan, Boer Roelf |
| Buschauffeur | 2 | `Alnilam` | buschauffeur die omroept | "Firm": zakelijk door de speaker | Harm, Schipper Wiebe |
| Student | 2 | `Puck` | aangeschoten student | "Upbeat": jong, uitbundig | Jelmer, Verdwaalde Fries |
| Kustwachter | 1 | `Achird` | melding van de kustwacht | "Friendly": rustig door de radio | Verkeersinformatie, Rotor Roelf |
| Deurwaarder | 1 | `Rasalgethi` | ambtelijk, formeel | "Informative": vlak en onherroepelijk | Sjabbe, Snackbarhouder |
| Kermisexploitant | 1 | `Erinome` | kermishouder | "Clear": schreeuwt over de kermis heen | Terrasgast, Kroegbaas Wilma |
| Kind in het publiek | 1 | `Leda` | kind | "Youthful": dezelfde stem als Kind | Femke, Kind |
| Buurvrouw | 1 | `Despina` | buurvrouw die voor twintig kookt | "Smooth": hartelijk en kletserig | Hilly, Strandtent Tineke |

## Wat dit betekent

- De 155 regels van deze zeventien staan niet meer op "wacht op een stemkeuze": **2** hadden al een
  Groningse spreektekst en staan sinds 6-11 in de wachtrij (65 jobs), voor de andere **153** staat
  het concept in `docs/verhaal/DIALECT-CONCEPT.md`. Na het nalezen en `node scripts/gronings_merge_draft.mjs
  --write` komen ook die in de wachtrij, samen met de overige regels zonder spreektekst.
- De stemkeuze verandert niets aan het model of de route: nog steeds Gemini Flash-Lite TTS via de
  LiteLLM-gateway (ADR 0019, #689).
- Een andere stem later is één regel in `CAST`; bestaande opnames blijven geldig zolang het model in
  `ACCEPTED` staat, maar de stem vraagt wel een nieuwe opname.

## Wat nu nog moet (stand na v0.60.2, 9-11-2026)

De stemkeuze is klaar: **0 regels wachten nog op een stem**. Wat overblijft zijn **20 verhaalregels van
Geesje (18) en Rotor Roelf (2)** die nog een **Groningse spreektekst** nodig hebben; hun stem staat al in
`CAST` (`Pulcherrima` en `Achird`). De open lijst met per regel de bestaande precedenten en het knooppunt
voor een kenner staat in [`GRONINGS-20-SPREEKTEKSTEN.md`](GRONINGS-20-SPREEKTEKSTEN.md); daar is bewust
geen dialect gegenereerd.

1. Een kenner schrijft of keurt de 20 spreekteksten en vult ze in `scripts/gronings_spoken_draft.json`.
2. `node scripts/gronings_merge_draft.mjs --write` voegt ze samen; daarna `node scripts/tts_lines_list.mjs`
   en de opnameronde volgens [`OPNAMERONDE-735.md`](OPNAMERONDE-735.md).
3. De rest van het concept (`DIALECT-CONCEPT.md`) nalopen en samenvoegen zoals daar beschreven.

Nog niet gedaan: geen van deze stemmen is beluisterd of opgenomen.