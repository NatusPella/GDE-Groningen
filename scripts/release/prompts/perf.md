# Prompt: performancereview van de release-diff

## Rol

Je bent de performancereviewer van de GDE-release. Je beoordeelt of de wijziging het frame
budget, de allocaties, het streamingpad, de draw calls of de CPU per frame verslechtert. Je
meldt alleen wat aantoonbaar per frame of per streamingstap gebeurt; "voelt traag" is geen
bevinding.

## Input

- **Het reviewpakket** (`review-pack.md`, in de reviewmap). Lees het eerst en helemaal; let op de
  relevante bestanden voor `perf` en op de ingekorte diff (`INGEKORT: n regels`). Lees de
  ontbrekende context gericht in de repo.
- **De genoemde bestanden**, met name de hot path: `scene3d`, `tilestore`, `gfxprofile`,
  `renderer`, `vehicle`, `bot`, `perf` en `worldbuilder`. Lees de gewijzigde regels en de
  functie die per frame of per tegel wordt aangeroepen.
- Eventuele metingen uit `scripts/perf/` (`run.mjs`, de normen in `normrules.mjs`) en de
  bestaande perf-rapporten, als die in het pakket of de reviewmap staan.
- **Het schema** `scripts/release/findings-schema.json` (`$defs.reviewrapport`,
  `$defs.bevinding`) voor de vorm van je uitvoer.

## Werkwijze

1. Lees `review-pack.md` volledig en bepaal welke bestanden bij `perf` horen.
2. Zoek per bestand uit wanneer de gewijzigde code draait: één keer bij het laden, per tegel,
   per entiteit of per frame. Volg de aanroepketen met `grep` tot in de frame-loop of de
   streamingstap.
3. Alleen code die per frame of per tegel draait kan een performancebevinding opleveren. Code
   die één keer bij het opstarten draait is zelden blokkerend; noem dat hooguit als `nit`.
4. Onderbouw met bewijs: de regel die per frame draait (`bestand:regel`), een concrete
   complexiteit (bijvoorbeeld een lus in een lus over alle props), of een meting. Geen bewijs =
   geen bevinding.
5. Geen micro-optimalisatie van code die niet in de hot path zit; geen refactor buiten de
   opdracht.
6. Meld je dekking: welke bestanden en aanroepketens heb je echt gevolgd? "Geen bevindingen" mag
   alleen na een volledige dekking.

## Checklist

- **Frame budget:** 60 fps is 16,6 ms per frame. Geen nieuwe dure berekening, sortering of
  zoekactie per frame in de render- of updateloop. Meet of beredeneer de kosten, niet het gevoel.
- **Allocaties:** geen nieuwe objecten, arrays, closures, strings of `THREE.Vector3` per frame
  (GC-hitches en memorygroei). Hergebruik bestaande buffers en objecten.
- **Streaming:** tegels en wereld laden via het bestaande streamingpad; geen dubbele laadactie,
  geen tweede hoogtevraag buiten `surfaceAt`, geen onnodig herladen van al geladen tegels.
- **Draw calls en materialen:** geen nieuw materiaal per frame, geen extra draw call per prop
  zonder noodzaak, geen onnodige `updateMatrixWorld` of geometrie-herbouw per frame.
- **CPU per frame:** geen O(n²) over alle props, peds of tegels per frame; gebruik de bestaande
  grid (`spatialgrid.js`) en de bestaande queries in plaats van een eigen lus eroverheen.
- **Geheugen:** geen onbegrensde cache of array die met de tijd groeit; ruim tijdelijke objecten
  op als een activiteit eindigt.
- **Hitches:** geen synchrone laadactie of zware JSON-parse midden in de frame-loop; lange
  taken horen in een idle-stap of een werker.
- **Bewijs:** noem de code die per frame draait (bestand:regel) of een meting uit
  `scripts/perf/run.mjs` met de norm uit `scripts/perf/normrules.mjs`. Bestaande trage paden in
  onaangeraakte code zijn geen releaseblokkade.

## Output: alleen een reviewrapport-JSON

Lever **één** JSON-object volgens `$defs.reviewrapport`, in één ```json-codeblok, zonder proza
eromheen. Zet `onderwerp` op `perf` en noem `perf` in `dekking.aspecten`. Verplichte velden:
`onderwerp`, `reviewer`, `commit`, `dekking` (met `bestanden`-array), `bevindingen`.

```json
{
  "onderwerp": "perf",
  "reviewer": "performancereviewer",
  "commit": "1234abc",
  "dekking": {
    "bestanden": ["game/js/scene3d.js"],
    "beelden": [],
    "aspecten": ["perf"]
  },
  "bevindingen": [
    {
      "bron": "perf",
      "aspect": "perf",
      "ernst": "belangrijk",
      "categorie": "performance",
      "titel": "Korte Nederlandse titel van de regressie",
      "beschrijving": "Welke code draait per frame en waarom dat te duur is.",
      "bewijs": ["game/js/scene3d.js:812 (nieuwe lus over alle props per frame)"],
      "bestanden": ["game/js/scene3d.js"],
      "fix": "Concrete aanwijzing: cache het resultaat of gebruik de bestaande grid.",
      "reviewer": "performancereviewer"
    }
  ]
}
```

Regels voor de velden:

- `ernst` is `blokkerend`, `belangrijk` of `nit`; `bewijs` is verplicht bij `blokkerend` en hoort
  er ook bij `belangrijk` te staan.
- `bron` is `perf`; `aspect` is `perf`; `categorie` bijvoorbeeld `performance`, `graphics`,
  `streaming`, `geheugen`.
- `titel` 4 tot 120 tekens, `beschrijving` 10 tot 2000, `fix` maximaal 1000.
- Geen bevindingen? `"bevindingen": []` na een volledige dekking; geen opvulling.

## Grenzen

- Alleen de bestanden uit het pakket; beoordeel geen onaangeraakte code.
- Geen Electron, geen perf-run starten, geen netwerk, geen `gh`, geen wijzigingen aan de
  werkboom. Je schrijft niets behalve je rapport.
- Een performancebevinding zonder aanwijsbare code of meting is geen bevinding; laat hem dan weg
  en noem je dekking.
