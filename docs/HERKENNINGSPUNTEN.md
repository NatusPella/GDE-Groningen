# Herkenningspunten: het album van de provincie (#820)

> **Naslag.** De regels voor de wereld staan in de canonieke spec
> [`.specs-fire/standards/wereld.md`](../.specs-fire/standards/wereld.md); dit document is uitleg en
> naslag. Bij verschil wint de spec (en bij twijfel `AGENTS.md`).

De provincie staat vol kerken, molens, borgen en andere herkenningspunten die al als model in het
spel staan (`game/landmarkkits.json`). Ze waren alleen model: je reed er langs zonder dat er iets
gebeurde. Dit album geeft ze een doel. Er komt **geen nieuwe werelddata** bij: naam, plek en soort
komen uit de bestaande kits.

## Het databestand

`game/js/herkenningspunten.js` wordt gegenereerd uit `game/landmarkkits.json`:

```bash
node scripts/gen_herkenningspunten.mjs          # schrijf het bestand
node scripts/gen_herkenningspunten.mjs --check  # faal als het achterloopt
```

Alleen kits met een naam worden een album-punt: **583** van de 707 kits. De verdeling:

| Soort | Aantal | Nederlands |
|---|---|---|
| kerk | 353 | kerken |
| molen | 96 | molens |
| fabriek | 40 | fabrieken |
| borg | 23 | borgen |
| school | 23 | scholen |
| station | 22 | stations |
| toren | 10 | torens |
| museum | 5 | musea |
| kapel | 3 | kapellen |
| flat | 3 | flats |
| boerderij | 2 | boerderijen |
| vuurtoren | 2 | vuurtorens |
| watertoren | 1 | watertorens |

`scripts/herkenningspunten_test.mjs` vergelijkt het databestand met `landmarkkits.json`, zodat de
twee niet uit elkaar lopen.

## Het album

`game/js/herkenningsalbum.js` is puur (geen DOM, geen opslag):

- `binnenStraal(punten, x, y, straal)` — de punten binnen de straal, dichtstbij eerst;
- `albumStand(punten, gezien)` — totaal, gezien en per soort (Nederlandse naam en meervoud);
- `dichtstbijzijndeOpen(punten, gezien, x, y)` — het dichtstbijzijnde nog niet geziene punt;
- `ontdekkingen(...)` en `melding(punt, stand)` — wat er nu voor het eerst gezien wordt en de korte
  melding erbij.

`gezien` is een `Set`, een array met id's of een functie `(id) => boolean`; de tracker en "Te doen"
geven allebei dezelfde prestatieset mee.

## Ontdekken in het spel

`game/js/achievementtracker.js` kijkt elke halve seconde of de speler binnen **zeventig meter (70 m)** van een
punt staat. Het eerste bezoek voegt het punt eenmalig toe aan de bestaande prestatieset
`herkenningspunten` (via `recordUnique`, dus save-compatibel) en geeft één korte melding met de naam,
de soort en de stand van die soort. Daarna zegt hetzelfde punt niets meer.

De ontdekkingen zijn **per speler**: de teller staat in de eigen prestatieset en de melding is lokaal.
Er gaat geen netwerkbericht over en er verandert niets aan de wereld of de beloning; een gast kan dus
zijn eigen album vullen terwijl hij meespeelt.

## In "Te doen"

Onder **Verzamelen** staat de rij **Herkenningspunten**: `x van 583 gezien`, met in het detail de
stand per soort en de route naar het dichtstbijzijnde punt dat nog niet gezien is (als gewoon
kaartdoel, net als de eierballen en geheimpjes).

## Testen

```bash
node scripts/herkenningspunten_test.mjs   # data drift, albumregels en de bedrading
node scripts/docs_index_test.mjs         # deze pagina staat in de index
```
