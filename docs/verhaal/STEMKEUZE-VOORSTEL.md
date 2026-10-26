# Stemkeuze: de zeventien sprekers zonder stem

Zeventien personages uit het nieuwe verhaal hebben regels maar geen stem in `CAST`
(`scripts/tts_lines_list.mjs`). Zonder stem maakt de takenlijst geen opdracht voor ze, dus
**155 verhaalregels kunnen nu niet worden ingesproken** — daarvan hebben er 153 ook nog een
Groningse spreektekst nodig (zie `DIALECT-CONCEPT.md`).

Hieronder een voorstel: per personage een van de dertig vooraf ingesproken stemmen van Gemini, met
dezelfde soort beschrijving als de bestaande cast (wie het is, hoe hij praat). De stemmen zijn met
het oor gekozen door de eigenaar; dit voorstel is op papier gedaan en moet dus nog langs dat oor.
Delen met een bestaand personage mag: `Leda` is nu bijvoorbeeld zowel Femke als het kind.

| Spreker | Regels | Voorstel | Personage | Waarom | Deelt stem met |
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

## Goedkeuren

- **Zo akkoord:** zeg het, dan zet ik deze zeventien in `CAST` met de beschrijving erbij, en dan komen
  hun 155 regels in de takenlijst. Hun Groningse spreekteksten schrijf ik in dezelfde ronde als de
  rest (het is dezelfde soort tekst als in `DIALECT-CONCEPT.md`).
- **Anders:** noem per persoon een andere stem uit de dertig (`Orus`, `Callirrhoe`, `Charon`, `Puck`,
  `Iapetus`, `Umbriel`, `Alnilam`, `Rasalgethi`, `Enceladus`, `Schedar`, `Sadaltager`,
  `Zubenelgenubi`, `Aoede`, `Leda`, `Autonoe`, `Despina`, `Erinome`, `Laomedeia`, `Pulcherrima`,
  `Vindemiatrix`, `Sulafat`, `Achernar`, `Gacrux`, `Kore`, `Fenrir`, `Algieba`, `Algenib`,
  `Sadachbia`, `Zephyr`, `Achird`), of een van de honderden stemmen uit de Extended Voice Library —
  die staan in AI Studio onder "Voices" en zijn met dezelfde `voice`-naam te gebruiken.
- **Niets zeggen:** dan blijven deze 155 regels stil, en dat is geen fout: ze staan als ondertitel in
  het spel.

Nog niet gedaan: geen enkele stem is beluisterd of opgenomen, en er is niets aan de code veranderd.
