# Wereldkleuren: inventaris en een subtiele stap naar het designsysteem (21-11)

Werkdocument bij de vraag van de eigenaar (21-11): "ook een beetje meer richting ons design system bewegen, wel subtiel".
Naslag voor ADR [0040](../.specs-fire/standards/adr/0040-zomerse-zeefdruk-als-designsysteem.md) en [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md); de kleurplaat staat in
[beeld-21-11/wereldkleur/kleurplaat.html](beeld-21-11/wereldkleur/kleurplaat.html) (vlakken met hex, oud tegen nieuw) en het voor-en-na-overzicht in
[beeld-21-11/wereldkleur/overzicht.png](beeld-21-11/wereldkleur/overzicht.png).

## 1. Waar de kleuren van de wereld vandaan komen

Er is geen centrale wereldpalet-module geweest: de kleur wordt op een tiental plekken vastgelegd. Hoofdkleuren per categorie (main, v0.64.0):

| Categorie | Bron | Hoofdkleuren (hex) |
|---|---|---|
| Gevels en bakstenen | `HABBO_PALETTE` in `pixelart3d.js`, families in `models3d_buildings.js`, plus losse hexen in `landmarkkit.js`, `marktgebouwen.js`, `countrymodels.js` | baksteenrood `8f4634`, oranje `a9623f`, donker `6e3a2c`, bruin `7d4b37`, geel `b08a5e`, pleisterwit `e3ddd0`, crème `d6cab0`, roze `c2a293`, mint `a3b2a0`, okergeel `cfb46c` |
| Daken | idem, `INDUSTRIAL_ROOF` | terracotta `8a4a33`, leisteen `464b52`, bruinrood `5b3a2e`, blauwgrijs `3e4449`, industrie `5a5d60` |
| Wegdek en stoep | `SURFACES` in `roadsurface.js` (de tegelwereld), `ROAD_COLORS3D`/`SIDEWALK_COLOR` in `scene3d.js` (terugval, niet aangeraakt) | asfalt `57595c`/`4b4d50`/`505255`, fietspad `823b2d`, klinker rood `6c4236`, klinker grijs `7a766e`, tegels `837e74`, stoep `7b776d`, grind `9a8f78` |
| Gras en velden | `KINDS` en vaste tinten in `grass.js` | park/gras `4f7234`, weide `557434`, bos `405e2c`, gazon `4a6c31`, droog `9c9153`, mos `3b5a2c`, rand `3b5529` |
| Bomen | `SPECIES` in `greenery.js` | linde `4f7d3a`, plataan `5d8a42`, eik `48703a`, beuk `527a33`, es `6a9148`, populier `6a9352`, wilg `82a35e`, den `2e4d2a`, kers `e58fb4`; stammen `4a3a2c` tot `8c8778` |
| Water | `WATER_TONES` in `watertones.js` (mesh en veldschaduwer delen hem) | diep `0b2420`, ondiep `2c4a38`, kroos `5d7f2c`, schuim `b9c2b0` |
| Voertuigen en kleine props | verfkleuren in de voertuigtabellen, `cityprops.js`, `countrymodels.js`, `kermis.js` | luifels `2f5a3a`/`7a2424`/`8a6a2a`, parasols `8f2f2a`, kramen `c99a3a`, metaal `7b7e82`, plastic `232323` |
| Lucht, mist en licht | `KEYS` in `daynight.js` per zonshoogte, `sky3d.js` | zon hoog `fff4e2`, zenit `3a78c4`, horizon `c8d9e2`, mist `c6d4dc`; avond horizon `f1ae74`, mist `d9a67e`; schaduwtint `f6f6f6` (hoog) tot `d6eaf2` (avond) |
| Kleurgrading | `postfx3d.js` (`uSat`, `uShadowTint`, `uHighTint` uit `computeLighting`) | verzadiging 1,05 tot 1,12 overdag, 0,9 tot 0,94 's nachts; geen eigen vaste kleur |
| Kaart | `MAP_PALETTE` en `MINI_PALETTE` in `mapstyle.js` | minikaart weide `3e4c39`, park `5a8445`, water `3a86a8`, weg `a8ada2`, gebouw `b98a6a` |

De volledige lijst met oud tegen nieuw staat in de kleurplaat. Alles van de wereld loopt voor het tekenen door `GeoBuilder` (`linearRGB`) of `habboMaterial`, behalve gras, bomen,
het wegdek, het water, de dagkleuren en de kaartpaletten; die zes plekken krijgen de wereldkleur aan de bron.

## 2. Richting

Uit het designsysteem (ADR 0040): papier `f3ead3`, inkt `1d1b17`, bordgroen `0e6b3c`, zomergeel `f9c80e` en misdrukroze `e8505b`. Voor de wereld:

- **Warmere, minder verzadigde basis.** Gevels, daken, klinkers, tegels en grind schuiven naar papier-crème (op dezelfde helderheid).
- **Bordgroen** als gras- en boomaccent: gras en loof worden iets koeler en gedempter en meer één familie; kers (roze bloei) volgt de roze rol.
- **Zomergeel en misdrukroze als gerichte accenten.** Alleen verzadigde gele en rode kleuren (luifels, markers, kleine props, fietspad) krijgen een zachte trek naar het eigen geel en roze; wit (de wegmarkering) wordt papier.
- **Inktblauwgroen** voor water: `1f4654` is het enige niet-designsysteemdoel (het designsysteem kent geen blauw; het water heeft er een rustige toon nodig); minder neon, nog steeds donker.
- **Inkt in plaats van zwart:** bijna zwart (plastic, banden, kozijnen) gaat naar `1d1b17`; de schaduwtint van de dag krijgt een inktblauwe schuif; de dagmist en -horizon worden een tikje crèmer.
- **Wat niet verandert:** helderheid (dus het contrast van wegen, stoepen en gevaren), politieblauw en andere verzadigde kleuren buiten geel en rood, schemering en nacht (alleen de schaduwtint en de grondweerkaatsing), en alle structuur (materialen, merging, instancing, drawcalls). Altijd zomer: er is geen koude tint toegevoegd.

## 3. Hoe het is doorgevoerd

- `game/js/worldpalette.js` (nieuw, blad, geen THREE): de inkten, de rollen (`bouw`, `steen`, `weg`, `donker`, `groen`, `loof`, `water`, `blauw`, `papier`, `geel`, `roze`) met doel, gewicht en of de helderheid behouden blijft, en
  `dsWereld(hex, rol, meng)`. Een kleur zonder vaste rol krijgt de rol uit tint, verzadiging en helderheid (`wereldRol`).
- **Eén regelaar:** `WERELD_DS_MENG` (0 tot 1; nu 0,4, besluit 21-11). Vergelijken met `?dswereld=0` (oud) of `?dswereld=1` (volledig), ook via `--url-flags=dswereld=0.5` in Electron. De waarde wordt eenmalig uit de URL gelezen bij het laden van de module.
- Doorgevoerd in `pixelart3d.js` (`GeoBuilder` en `habboMaterial`: gevels, daken, props, landmarks), `grass.js`, `greenery.js` (alleen in de browser), `roadsurface.js`, `watertones.js` (ook het verre water), `daynight.js` en `mapstyle.js` (kaart en minikaart).
- **Gratis:** het is een rekensom op een hex op het moment dat de kleur wordt vastgelegd. Geen extra materialen, programma's of drawcalls; materiaalstructuur, merging en instancing zijn niet aangeraakt. Een Electron-frametijd is niet gemeten (CPU gedeeld in het perfvenster).
- **Wereldcache:** de tegels (`.gdt`) bevatten geen kleuren van deze bronnen (kleur wordt bij het tekenen gekozen), dus er is **geen wereldbouw nodig**. De voorgerenderde provinciepiramide (kaartpyramide) heeft het oude land en krijgt de nieuwe kleuren pas bij de eerstvolgende bouw (`province_map.mjs` leest `mapstyle.js`). Tot dan wijkt de uitgezoomde provinciekaart een tikje af van de minikaart.
- **Test:** `scripts/worldpalette_test.mjs` (waarden binnen bereik, helderheid en contrast van wegen en stoepen, herkenbaarheid, richting, determinisme, de kaartpaletten).
- **Beelden:** `scripts/qa/wereldkleur_beeld.mjs` (één Electron per menging, negen plekken op 1280x720), `scripts/world/wereldkleur_plaat.mjs` en `.cjs` (kleurplaat en overzicht).

## 4. Beoordeling

Negen plekken op 1280x720 uit het echte spel (Grote Markt overdag, avond en nacht, binnenstad overdag en in de regen, Ommeland bij Usquert, haven en water, kermis, woonwijk), elk bij meng 0, 0,25 en 0,5, in [overzicht.png](beeld-21-11/wereldkleur/overzicht.png) met de losse beelden ernaast.

- **Eerlijk oordeel:** bij 0,25 is het verschil in een kort voor-en-na nauwelijks te zien (een tikje warmere, minder verzadigde gevels en stoepen, iets gedempter gras); dat past bij "subtiel", maar de eigenaar zal het pas merken als hij de twee naast elkaar legt. Bij 0,5 is het wel te zien en nog ordelijk, niet rommelig: gevels bruiner, gras blauwer en gedempter (bordgroen), daken en straatstenen grijzer-warm, het water donkerder en blauwer. Herkenbare plekken (de straten rond de Grote Markt; de Martinitoren en de Euroborg zelf zijn niet apart in beeld gebracht) blijven herkenbaar en het contrast tussen weg, stoep en gevel is niet veranderd. Avond en nacht blijven zoals ze waren (daar verandert alleen de schaduwtint en de grondweerkaatsing).
- **Besluit (21-11, de eigenaar gaf toestemming): standaard 0,4.** Onderbouwing: (1) contrast: elke rol voor gevel, weg, stoep en water behoudt de helderheid (luma), dus het contrast tussen weg, stoep en gevel is bij 0,4 gelijk aan dat bij 0 (`worldpalette_test`); (2) leesbaarheid en rust: in het overzicht is 0,25 nauwelijks van 0 te onderscheiden, terwijl 0,5 al ordelijk bleek (gevels bruiner, gras gedempter, geen rommel, herkenbare plekken blijven herkenbaar); 0,4 ligt binnen het bekeken bereik en geeft het verschil dat de eigenaar zonder naast elkaar leggen kan merken, zonder de verschuiving van 0,5; (3) boven 0,5 is niet in beeld bekeken, dus daar blijven we onder. Terug naar subtiel of zichtbaarder: `?dswereld=0,3` of `0,5`. De keuze is op de beelden hierboven gemaakt, niet op een nieuwe run (geen Electron deze ronde).
- **Eerlijke kanttekeningen bij de beelden:** voorbijgangers, auto's en struiken verschillen per run (elk beeld is een eigen run), dus kijk naar gevels, gras, straat en water; bij de Grote Markt en het water staat de camera dicht bij de gebouwen; in het kermisbeeld staat een boom voor de helft van het beeld; de melding "Houd spatie ingedrukt" is in het overzicht weggesneden. Verbeterpunt: een standaard-NPC-vrije scène of vaste seed.
- Gevonden en gefixt tijdens het werk: gras werd bij een eerste versie *verzadigder* (bordgroen op dezelfde helderheid); het doel is nu bordgroen gemengd met papier (`bordzacht`), met een test.

## 5. Niet gedaan en niet gezien

- Geen instelling in het menu (UI-agents zijn bezig); alleen de constante en de URL-schakelaar.
- Vegetatie die door `scene3d.js` met eigen kleuren wordt getekend (de terugvalkleuren `ROAD_COLORS3D`, `GREEN_COLOR`, `SIDEWALK_COLOR`, de basismateriaal van de kronen) is niet aangeraakt, omdat `scene3d.js` onder de 4500 regels moet blijven; de tegelwereld, waar de speler het meeste ziet, loopt wel via de bronnen hierboven.
- De postfx-shader (vignet in inkt in plaats van zwart) is niet aangepast: dat is een shaderwijziging.
- Geen perf-meting (gedeelde CPU).

## 6. Kaart en minikaart volgen de wereldmenging (21-11, tweede ronde)

De kaartlagen-merge had het land van de kaart uit de tokens gezet (`kaartLand()` in `kaartkleuren.js`) en daarmee de menging uit `mapstyle.js` laten vallen; de kaart stond dus op 0 terwijl de wereld op 0,3 stond.
Nu loopt `kaartLand()` het land en de gebouwen door dezelfde rollen als de wereld (`groen` voor weide, park, bos, bomen, volkstuinen, sport en dorp; `steen` voor wegen, voetpaden, spoor en bedrijventerrein; `bouw` voor gebouwen en kerken), op dezelfde regelaar (`WERELD_DS_MENG`, `?dswereld=`).
- **Afweging:** de rollen behouden de helderheid, dus het contrast tussen land, wegen en het glas blijft wat `kaartkleuren_test` meet (180 controles, ook bij het nieuwe standaard 0,4). Bewust niet gemengd: het water (`WATER_BLAUW`, vastgelegd in DESIGN_SYSTEM.md en getest; op donker glas moet het lichter blijven dan het inktblauwgroen van de wereld), de hoofdwegen en windturbines (moeten op het glas oplichten) en de fietspaden (al een roze menging).
- **Bekende afwijking:** de voorgerenderde provinciepiramide (`KAART_PALET_VERSIE` zeef-1) is nog in de ongemengde kleuren gebakken; de uitgezoomde provinciekaart wijkt een tikje af tot de eerstvolgende bouw (`province_map.mjs`). Niet in beeld gezien.
