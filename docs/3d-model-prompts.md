# 3D-modelprompts voor GDE Groningen

Kant-en-klare prompts voor Claude Design, om de procedurele wereld uit
`game/js/models3d_buildings.js` / `models3d_vehicles.js` / `models3d_people.js`
stukje bij beetje te vervangen door echte, hand-af 3D-modellen in de stijl van het
Martinitoren-model (zie status hieronder) - GEEN Habbo Hotel/cartoon-stijl meer,
die richting is expliciet losgelaten ("negeer de habbo stijl, die werkt duidelijk
niet"). Elke sectie is zelfstandig te gebruiken - kopieer de gedeelde stijl-brief +
de specifieke prompt in Claude Design, download als GLB, zet het bestand in
`game/models/`.

**Belangrijk (copyright):** dit is een *stijl-eigen* interpretatie (silhouet, hoogte,
verhoudingen, kleur), geen 1-op-1 kopie van een foto, bouwtekening of bestaand model
van het echte gebouw/voertuig. Geen echte merk-/kenteken-/gemeentelogo's, geen
getraceerde foto's als textuur.

**Status (25 oktober 2026):** de Martinitoren is het enige model dat af is en al ingebouwd
(`game/models/martinitoren.glb`, geladen via `game/js/landmarkmodels.js`) - dit IS de
referentiestijl voor alles hierna. Alle andere gebouwen, voertuigen en mensen komen nog
uit de procedurele bouwers (`models3d_buildings.js`, `models3d_vehicles.js`,
`models3d_people.js`); de prompts hieronder staan klaar om te genereren zodra er weer
Claude Design-credits zijn.

## Gedeelde stijl-brief (kopieer dit boven ELKE prompt hieronder)

```
Stijl: low-poly 3D architectuur/voertuigen/personen in de stijl van het bestaande
Martinitoren-model in dit project (zie dat bestand als referentie) - GEEN Habbo
Hotel/cartoon-stijl, GEEN dikke zwarte contourlijnen, GEEN platte "toy-achtige"
vormen.
- Herkenbare architecturale geleding: aparte, benoemde onderdelen die de echte
  bouwstructuur volgen (zoals de Martinitoren's plint/toren-etages/steunberen/
  lijsten/lantaarn/spits) in plaats van 1 simpele doos.
- Materialen mogen een lichte textuur/kleurvariatie hebben (steen-, bakstenen- of
  metaalachtige tint), geen felle platte cartoon-kleuren, geen zware outline-shader.
- Detail komt uit de vorm/geleding zelf (randen, lijsten, uitstekende delen), niet
  uit een dikke contourlijn.
- Vormtaal: kantig en gefacetteerd, ook bij mensen en voertuigen; geen ronde,
  glanzende cartoon-vormen (DESIGN_SYSTEM.md, "Vormtaal").
- Palet: rustige, aardse/steenachtige tinten (zandsteen/beige/grijsbruin voor
  gevels, leigrijs/donkerblauw voor daken, goud/messing voor sierdelen) - dezelfde
  soort tinten als het Martinitoren-model, niet de felle Habbo-kleuren van eerder.
- Schaal: 1 eenheid = 1 meter, Y-as omhoog (Three.js-conventie), model gecentreerd
  op X/Z=0 met Y=0 op het laagste punt (de voet/wielen/voeten).
- Export: glTF (.glb), losse benoemde meshes (zoals het Martinitoren-model dat al
  doet), polycount laag houden (few-hundred tot low-thousands triangles per object
  - dit zijn objecten waarvan er tientallen tegelijk in beeld kunnen staan).
- Materialen: standaard PBR (MeshStandardMaterial) is prima, zelfde als het
  Martinitoren-model gebruikt - geen speciale unlit/toon-shader nodig.
```

---

## A. Landmark-gebouwen (9 stuks, elk 1x uniek model)

### A1. Martinitoren - AF, al ingebouwd

Zie `game/models/martinitoren.glb`. Prompt die daarvoor gebruikt is (voor referentie/
bijstellen):

```
[gedeelde stijl-brief]

Onderwerp: de Martinitoren, de bekende vrijstaande kerktoren in het centrum van
Groningen ("de Olle Grieze") - los van de kerk zelf (apart model, zie A2).

Silhouet (van voet naar top):
1. Brede vierkante bakstenen schacht (basis ~13 x 13m), rood/oranje baksteen.
2. Op ~60% van de hoogte versmalt de schacht in 1-2 duidelijke trappen.
3. Daarboven een leigrijze/blauwgrijze ingesnoerde spits (getrapte kegelvorm, iets
   bollere "ui-achtige" onderkant).
4. Helemaal boven: een klein goud/geel bolletje + dunne piek.
5. Rond 2/3 hoogte: een simpele wijzerplaat (wit vlak, zwarte outline) op alle 4 zijden.

Hoogte: ~95 meter totaal. Voetafdruk: vierkant, ~13 x 13 meter.
Losse benoemde meshes: schacht, trap-secties, spits, piek, klok-vlakken.
```

### A2. Martinikerk (church)

```
[gedeelde stijl-brief]

Onderwerp: de Martinikerk, de grote middeleeuwse hoofdkerk naast de Martinitoren
in het centrum van Groningen (de toren zelf is een apart model, A1 - dit is alleen
het kerkgebouw).

Silhouet:
- Kruisvormig grondplan: een lang hoofdschip met een kortere dwarsbeuk die het
  ongeveer op 2/3 van de lengte kruist (basiliek-vorm).
- Steil zadeldak over het hele hoofdschip, dezelfde leigrijs/roofBlue-achtige
  dakkleur als de Martinitoren-spits voor visuele eenheid.
- Bakstenen gevels (brickRed/brickOrange), hoge spitsboogvormige raampartijen
  als platte, donkere (glassBlue) vlakken met een dunne lichte omlijsting -
  geen los glas-in-lood-detail, gewoon een herkenbare spitsboogvorm.
- Geen aparte torenspits nodig (die staat los, A1) - wel een klein driehoekig
  gevelfronton aan de voorkant.

Hoogte: nokhoogte ~20-24 meter. Voetafdruk: ~84 x 61 meter (lang, smal kruis).
Losse benoemde meshes: hoofdschip, dwarsbeuk, dakvlakken, gevelfronton, raamvlakken.
```

### A3. Goudkantoor (historic)

```
[gedeelde stijl-brief]

Onderwerp: het Goudkantoor, een klein, sierlijk 16e-eeuws renaissancegebouwtje aan
de Grote Markt in Groningen - één van de oudste en meest versierde gevels van de stad.

Silhouet:
- Compact, bijna vierkant volume (~14 x 13m), 2 bouwlagen.
- Lichte natuursteen-achtige gevel (wallCream of stoneGrey), geen baksteen.
- Trapgevel of duidelijk geornamenteerde topgevel aan de straatzijde (een gevel die
  in blokjes/treden omhoog loopt naar een punt, i.p.v. een rechte rand) - dit is het
  meest herkenbare silhouet-element, hou het als een paar simpele gestapelde
  rechthoekige "treden", geen fijne ornamenten.
- Rijen kleine, regelmatige rechthoekige raamvlakken (glassBlue) over de hele gevel.

Hoogte: ~11-13 meter (2 lagen + trapgevel-top). Voetafdruk: ~14 x 13 meter.
Losse benoemde meshes: hoofdvolume, trapgevel-secties, raamvlakken.
```

### A4. Hoofdstation Groningen (station)

```
[gedeelde stijl-brief]

Onderwerp: het hoofdstation van Groningen - een laag, langgerekt stationsgebouw
met een losstaande overkapping over de perrons.

Silhouet:
- Laag, lang hoofdgebouw (~121 x 25m), 1-2 bouwlagen, bakstenen gevel (brickRed),
  met een licht getrapt/symmetrisch dak (een middenrisaliet iets hoger dan de
  zijvleugels is genoeg, geen fijne torentjes).
- Losstaande overkapping (metalGrey vlak dak) op een rij dunne pilaren, evenwijdig
  aan het hoofdgebouw, die over de spoorzijde/perrons steekt.
- Grote rechthoekige raamvlakken (glassBlue) in de gevel, vooral in het midden-
  risaliet (stationshal-gevoel).

Hoogte: hoofdgebouw ~10-12m nok, overkapping lager (~6-8m). Voetafdruk hoofdgebouw
~121 x 25 meter, overkapping erlangs.
Losse benoemde meshes: hoofdgebouw, dakvlakken, overkapping, pilaren.
```

### A5. Forum Groningen (modern)

```
[gedeelde stijl-brief]

Onderwerp: Forum Groningen, het moderne cultuurgebouw aan de Grote Markt - een
grote, gefacetteerde moderne kubus/bergvorm.

Silhouet:
- Grote, hoge rechthoekige hoofdmassa (~86 x 37m voetafdruk) die niet helemaal
  recht omhoog gaat maar in een paar grote, schuine facetten/trappen naar boven
  versmalt of juist overhelt (het "bergachtige" silhouet) - houd dit tot 2-3 grote
  geometrische stappen, geen fijne facettering.
- Overwegend lichte/witte gevel (wit/wallCream) met 1-2 brede, horizontale
  glasbanden (glassBlue/roofBlue) die om het gebouw heen lopen.
- Plat dak, geen puntige elementen - dit gebouw is juist "massief en modern"
  tegenover de kerktorens.

Hoogte: ~25-28 meter (het hoogste gebouw in het centrum na de Martinitoren).
Voetafdruk: ~86 x 37 meter.
Losse benoemde meshes: hoofdmassa-secties (onder/boven het facet), glasbanden, dak.
```

### A6. Academiegebouw RUG (university)

```
[gedeelde stijl-brief]

Onderwerp: het Academiegebouw, het neoclassicistische hoofdgebouw van de
Rijksuniversiteit Groningen.

Silhouet:
- Grote, symmetrische rechthoekige hoofdmassa (~101 x 151m voetafdruk - een
  gesloten of bijna-gesloten blok rond een binnenplaats mag, hoeft niet solide).
- Lichte natuursteen/stucwerk-gevel (wallCream/stoneGrey), symmetrische voorgevel
  met een licht vooruitstekend middendeel (risaliet).
- Op het middendeel: een klein driehoekig timpaan (fronton) bovenop een paar
  vlakke, brede "zuil-achtige" verticale banden (geen ronde zuilen nodig, platte
  rechthoekige stroken zijn genoeg voor het silhouet).
- Een kleine ronde koepel (halve bol of lage cilinder + kegeltje) precies in het
  midden van het dak, iets hoger dan de rest van het gebouw.

Hoogte: hoofdgebouw ~15-18m nok, koepel steekt daar ~5-8m boven uit. Voetafdruk
~101 x 151 meter.
Losse benoemde meshes: hoofdmassa, risaliet/timpaan, zuilbanden, koepel.
```

### A7. Groot warenhuis/mall (kind: mall, geen naam in de data)

```
[gedeelde stijl-brief]

Onderwerp: geen specifiek bekend gebouw (de data heeft geen naam voor dit
gebouw) - een generiek, herkenbaar "groot winkelcentrum"-silhouet in dezelfde stijl
als de rest van de stad.

Silhouet:
- Groot, plat, laag volume (~13 x 17m voetafdruk in dit specifieke geval, maar dit
  model wordt voor meerdere warenhuis-achtige panden herbruikt - houd de vorm dus
  liever "generiek breed en laag" dan aan deze exacte maat vastgeplakt).
- Weinig verticale geleding - 1-2 bouwlagen, plat dak, brede gevel.
- Een bredere, opvallende toegangsluifel (metalGrey) die over de ingang uitsteekt.
- Grote vlakke gevelvlakken in 1-2 felle palet-kleuren (brickOrange/wallYellow) als
  "reclamevlak", geen echte tekst/logo's.

Hoogte: ~5-8 meter. Voetafdruk: schaalbaar, richt op ~15-25m breed/diep als basis.
Losse benoemde meshes: hoofdvolume, luifel, gevelvlak-accent.
```

### A8. Museum (kind: museum, geen naam in de data)

```
[gedeelde stijl-brief]

Onderwerp: geen specifiek bekend gebouw in de data (mogelijk geïnspireerd op het
Groninger Museum qua ligging bij het station, maar NIET als doel om dat exacte
gebouw te kopiëren) - een speels, kleurrijk "museum"-silhouet: onregelmatige,
niet-symmetrische geometrische massa's die duidelijk als kunst/cultuurgebouw lezen,
in tegenstelling tot de rechte gevels van gewone gebouwen.

Silhouet:
- 2-3 los ogende geometrische massa's (een kubus, een cilinder, een lage brede
  doos) die elkaar overlappen/aansluiten, NIET symmetrisch geplaatst.
- Elke massa een eigen felle palet-kleur (wallYellow, wallPink, roofBlue) - het
  contrast tussen de massa's is het hele punt.
- Eén van de massa's mag een torenachtig, iets hoger accent zijn (bijv. de cilinder).

Hoogte: hoofdmassa's ~6-10m, het hogere accent tot ~14m. Voetafdruk: compact,
gebruik het huidige gebouw als basis (~3-4m van de data is een plaatshouder-maat,
schaal dit op naar een leesbaar, herkenbaar museum-volume van ~15-20m breed).
Losse benoemde meshes: elke massa apart.
```

### A9. Buurtkerk (kind: church, tweede/onbenoemde kerk)

```
[gedeelde stijl-brief]

Onderwerp: geen specifiek bekend gebouw - een bescheidener buurtkerk, kleinere
versie van hetzelfde basiliek-silhouet als de Martinikerk (A2), voor een andere
plek in de stad.

Silhouet: zelfde opzet als A2 (Martinikerk) maar compacter en soberder - kleiner
kruisvormig of gewoon rechthoekig grondplan, zadeldak, spitsboogramen als platte
vlakken, geen apart torentje nodig (of hoogstens een klein dakruitertje - een dun
vierkant torentje midden op het dak, veel kleiner dan de Martinitoren).

Hoogte: nok ~10-14 meter. Voetafdruk: ~11 x 16 meter.
Losse benoemde meshes: hoofdvolume, dakvlakken, raamvlakken, (optioneel) dakruiter.
```

---

## B. Generieke gebouw-bouwstenen (modulair kit, voor de NIET-landmark gebouwen)

Dit vervangt uiteindelijk de procedurele extrusie in `models3d_buildings.js` voor
gewone huizen/appartementen/winkels/kerken/industrie (35.000+ gebouwen, dus dit
moet een klein aantal HERGEBRUIKBARE modules zijn, geen 1 model per gebouw).

```
[gedeelde stijl-brief]

Maak een set van kleine, modulaire bouwstenen voor generieke stadsgebouwen, elk als
EIGEN los glb-bestand (of aparte named meshes in 1 bestand - beide werkt, benoem ze
duidelijk), bedoeld om herhaald/geschaald te worden over duizenden verschillende
gebouw-voetafdrukken:

1. "wall_module" - een rechte gevelwand-sectie van 1 bouwlaag hoog (~3.1m) en 1m
   breed, met 1 raamopening als vlak kleurvlak (glassBlue) - bedoeld om side-by-side
   herhaald én verticaal gestapeld te worden voor elke gevellengte/hoogte.
2. "roof_ridge" - een simpel zadeldak-segment (driehoekig doorsnede), lengte 1m,
   bedoeld om herhaald te worden over de gevellengte.
3. "roof_flat_cap" - een platte dakrand/eave-trim strip, 1m lengte.
4. "door_module" - een deurinzet (rechthoekig kader + vlak deurpaneel, woodDark),
   op gevelbreedte-schaal (~1m breed, grondniveau).
5. "window_row" - een horizontale rij van 3-4 raamvlakken (glassBlue/wallCream
   kader), 1 bouwlaag hoog, bedoeld voor appartementen/kantoren.
6. "shopfront_band" - een brede glazen pui-band (glassBlue, vloer-tot-plafond) voor
   winkelpanden op de begane grond.

Elke module: exact 1 meter breed (X), zodat ze in code side-by-side herhaald kunnen
worden zonder gaten/overlap, en een vaste hoogte die exact 1 bouwlaag is (3.1m) voor
de wand/raam-modules. Simpele vlakke geometrie, geen ronde vormen. Dit is bewust
saai/herbruikbaar in plaats van decoratief - het silhouet-plezier komt van de
landmarks (sectie A), dit is de "achtergrond-stad".
```

---

## C. Voertuigen

Huidige archetypes + echte in-game afmetingen (lengte x breedte in meter, uit
`game/js/vehicle.js`) - hou de nieuwe modellen op deze schaal, anders passen ze niet
in de bestaande weg-/parkeerlogica:

| Archetype | len x wid (m) | Opmerking |
|---|---|---|
| Auto (hatchback/sedan/wagon/van/sport) | 3.8-5.0 x 1.65-2.0 | 5-6 kleurvarianten genoeg |
| Hero-auto (speelbaar, een vierkante Nederlandse gezinsauto uit de jaren 90) | 4.0 x 1.65 | 1 uniek, herkenbaar model |
| Politieauto | 4.3 x 1.8 | zelfde als sedan + lichtbalk + blauw/wit |
| Motor/scooter | 1.75-1.95 x 0.5-0.62 | incl. een "dikke"/chopper-variant |
| Scooter (klein) | 1.1-1.15 x 0.4-0.42 | |
| Bus | 11 x 2.35 | met stripe-accent |
| Boot | 4-4.2 x 1.6-1.7 | incl. een politie-bootvariant |

```
[gedeelde stijl-brief]

Maak een low-poly personenauto in de stijl van het Martinitoren-model (zie gedeelde stijl-brief), bedoeld als 1 van 5-6
kleurvarianten van hetzelfde silhouet (hatchback-achtig): simpele, kantige doos-
carrosserie met vlakke facetten, 4 losse wielen (cilinder, zwart rubber + metalGrey velg-accent), platte
gekleurde ruiten (glassBlue voorruit/achterruit, roofBlue zijruiten iets
transparant), simpele koplamp/achterlicht-vlakken (wit/brickRed).

Afmetingen: lengte 3.8-4.3 meter, breedte 1.65-1.8 meter, hoogte ~1.4-1.6 meter
(exclusief wielen). Wielen: straal ~0.32m.

Losse benoemde meshes: chassis (carrosserie-hoofdvorm), cabine/dak (mag apart zijn
voor kleurcontrast), 4x wiel (of 1 wiel-mesh die 4x geïnstantieerd wordt), voorruit,
zijruiten, koplampen, achterlichten.

BELANGRIJK voor het spel: exporteer het chassis met de voorkant richting +X en het
midden van het model op de grond (Y=0) precies op het midden van de wielbasis, zodat
het rechtstreeks op de bestaande rij-/wielrotatie-code aansluit.
```

Herhaal dezelfde prompt-structuur (silhouet + exacte maten uit de tabel) voor:
motor, scooter, bus (met een simpele stripe/accent-band langs de zijkant) en boot
(romp + lage stuurhut, geen wielen, vlak op het wateroppervlak).

---

## D. Mensen (pedestrians + Tammo/Anita) - en waarom "animaties" hier anders werkt

**Belangrijk technisch detail:** dit spel gebruikt GEEN skeletal/bone-animatie met clips. De
loopanimatie (`game/js/models3d_people.js` → `animatePersonWalk`) draait de onderdelen van de pop met
code, per frame: de heupen, de romp, het hoofd, de dijbenen en knieën en de bovenarmen en ellebogen
(`BONE` en `userData` in dat bestand). Er is dus GEEN rig/skinning/animation-clip nodig in de GLB - wel
moeten die onderdelen als **losse, aanspreekbare objecten/groepen** in de model-hierarchy staan (niet
samengevoegd tot 1 mesh), met hun eigen pivot/oorsprong op het gewricht (niet op het midden van het
onderdeel zelf) - anders draait het onderdeel om het verkeerde punt.

Huidige verhoudingen en gewrichten (uit `game/js/models3d_people.js`, `PERSON_RIG`):
heupen 0.93 m, knieën 0.49, enkels 0.08, borst 1.07, schouders 1.40, nek 1.49,
hoofdcentrum 1.655; samen ongeveer 1.8 m tot de bovenkant van het hoofd. Het hoofd is
geen bol maar een gefacetteerde vorm van ~0.19 x 0.24 x 0.17 m.

```
[gedeelde stijl-brief]

Maak een low-poly mens-figuur van ~1.8 meter in de stijl van het Martinitoren-model:
kantig en gefacetteerd, geen groot rond cartoonhoofd en geen kort lijfje - GEEN
skeletal rig, GEEN animatie-clips.

Onderdelen als LOSSE, benoemde objecten (elk zijn eigen pivot-punt op het gewricht,
niet op het object-midden):
- "pelvis" - heupen, oorsprong op 0.93m.
- "chest" - romp van ~0.93m tot de nek (1.49m), ~0.40m breed op schouderhoogte,
  ~0.19m diep.
- "head" - gefacetteerd hoofd van ~0.19m breed, ~0.24m hoog en ~0.17m diep, met
  het centrum op 1.655m.
- "legL" / "legR" - elk een dijbeen, lengte ~0.44m, pivot-punt (oorsprong van het
  object) bovenaan bij de heup op 0.93m.
- "kneeL" / "kneeR" - elk een onderbeen+schoen, pivot-punt bovenaan bij de knie op
  0.49m.
- "armL" / "armR" - elk een bovenarm, lengte 0.29m, pivot-punt bovenaan bij de
  schouder op 1.40m.
- "elbowL" / "elbowR" - elk een onderarm+hand, lengte 0.25m, pivot-punt bovenaan
  bij de elleboog.

Totale hoogte (rechtop, voeten op Y=0 tot bovenkant hoofd): ~1.8 meter.
Kleding/huid: gebruik alleen het gedeelde palet - 1 hemdkleur, 1 broek/schoenkleur,
1 huidtint (woodLight/woodMid), 1 haarkleur (zwart of woodDark).

Exporteer als losse GLB-nodes met exact deze namen: pelvis, chest, head, legL, legR,
kneeL, kneeR, armL, armR, elbowL, elbowR - dat zijn de namen die de loopanimatie
gebruikt. Een loader voor een mensen-GLB bestaat nog niet (alleen
`landmarkmodels.js` laadt gebouwen); die komt erbij zodra het eerste model er is.
```

Voor Tammo en Anita specifiek: zelfde structuur, plus 1 extra los onderdeel
("cap" voor Tammo - een pet, brickOrange; "fringe" voor Anita - een haarlok/pony,
zwart) boven op de basis-figuur, en hun eigen kleren-kleuren (Tammo: roofBlue shirt;
Anita: brickRed shirt) - zie `TAMMO_APPEARANCE`/`ANITA_APPEARANCE` in
`models3d_people.js` voor de exacte huidige kleurkeuzes als referentie.
