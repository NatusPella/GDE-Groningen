# Cutscene-issues 23-11: visuele en regievondsten

> Opdracht van de eigenaar: "sommige cutscenes hebben hele duidelijke issues". Branch `cutscenes-visueel-23-11`. De camera-as-sprongen en de lange dialoogbeurten
> zijn van de andere agent (`cutscene-kwaliteit-23-11`) en staan hier niet in.
> Voor/na-beelden: [docs/beeld-23-11/cutscenes-visueel/vergelijk.html](beeld-23-11/cutscenes-visueel/vergelijk.html).

## Hoe gevonden

1. **Bestaande audits** (`cutscene_lint`, `cutscene_sets_audit`, `cutscenes_anim_audit`, `cutscene_locaties_audit`): 0 blokkerend, de sets staan gemapt. Die controleren
   timing, shots en locaties, niet of een figuur in een voertuig staat of de goede plek op een boot heeft.
2. **Nieuw: `scripts/cutscene_regie_audit.mjs`.** Samplet alle 117 scènes per 0,2 s en meldt figuren die in een voertuig of in elkaar staan, een camera in een figuur of
   voertuig, sprekers die van hun gesprekspartner af kijken, en voor elke boot of de scène-plek onder het dak of buiten de romp valt. `--strict` en `--boot-strict` voor de release.
3. **Beeld:** `scripts/qa/cutscene_shots_web.mjs` draait dezelfde pagina-scripts als de Electron-run (`cutscene_shots.page.js`, nieuw `cutscene_boot.page.js`) in een eigen
   headless Chrome met wegwerpprofiel tegen een gestagede game. Electron zelf startte in deze sessie niet (afsluitcode 3 zonder uitvoer, ook `--version`), dus er is geen Electron-slot gebruikt.
   Alleen de scènes in de tabel met "gezien" zijn op beeld bekeken; alles anders is alleen uit de data gemeten.

## De lijst (gerangschikt)

Ernst: **ernstig** = de scène leest als kapot (figuur in een voertuig of op het dak), **middel** = valt op, **laag** = smaak of nog te beoordelen.

| # | Cutscene | Probleem | Ernst | Stand |
|---|---|---|---|---|
| 1 | elke missie-intro, -outro, herhaling en mislukscène die start terwijl je in de **rondvaartboot** zit (`quickScene` deck) | Tammo en Tessa staan dwars op het dek-eind van het glazen dak (1,6 m), hoofden door het glas, blik opzij: op beeld bovenop het dak. Tweede deel: de camera hing boven het dak. | ernstig | **opgelost, gezien** |
| 2 | dekmoment op de rondvaartboot (`playDeckMoment`, de opbouw naar de kus) | De camera stond op 1,5 m voor het paar met een smalle lens: hoofden afgekapt. De "reling" bestaat niet in het bootmodel: de handen liggen op niets. | middel | camera **opgelost, gezien**; reling (model) **open** |
| 3 | scènes op kano, kajak, SUP, skiff, acht, roeiboot, dinghy | Het paar loopt 0,9 m uit elkaar en staat dwars op een romp van 0,5 tot 1,3 m breed: figuren staan in het water (41 auditregels). | ernstig | **opgelost** (zitplaatsen uit `boatSeats`), **niet in beeld gezien** |
| 4 | `M30.outro` | Tinus loopt naar (4,6; -1,8) en staat 34,6 s midden in de snackwagen. | ernstig | **opgelost** (loopt om de staart heen), niet in beeld gezien |
| 5 | `M01.intro` | Berend loopt bij "Nul krassen" naar (4,0; 1,9): 46 s midden in de bakkie. | ernstig | **opgelost** (langs de flank), niet in beeld gezien |
| 6 | `M10.intro` | Jelle, Durk en Douwe beginnen midden in de limo (alleen hun voeten zijn te zien) en Jelle loopt er dwars doorheen. | ernstig | **opgelost, gezien** (stappen aan de zijkant uit) |
| 7 | `M15.outro` | De jurylid loopt in een rechte lijn door de limo. | middel | **opgelost** (voor de limo langs), niet in beeld gezien |
| 8 | `M01.outro` | Berend "loopt rond de bakkie" maar twee punten van het pad liggen in de bakkie. | middel | **opgelost** (pad 1,45 m naast de wagen), niet in beeld gezien |
| 9 | `carriere-bezit-start` | Buurman Aldert loopt voor koffie de trekker in (6,6 s). | middel | **opgelost**, niet in beeld gezien |
| 10 | intro's op een boot | De camera begint ruim 16 m hoog (de volgcamera) en zakt in zes seconden naar het paar: de eerste seconden zien de speler niet wie praat. Nog niet uitgezocht of dit voor alle intro's geldt (`playStaged`/`cinematics.js`). | middel | **open**, gezien |
| 11 | 41 meldingen "spreker kijkt weg" (o.a. `F4` Jelle 19,8 s van Mem af, `M10.intro` Jelle 24,6 s van Durk af, `M15.outro` Roelfien 20 s van Jelle af, `M03.2`, `M26.6`, `F3`) | Het lichaam van de spreker staat meer dan 100 graden van de dichtstbijzijnde figuur af terwijl hij praat. Veel zijn waarschijnlijk figuranten of een blik naar een prop (de audit kent geen "praat tegen het publiek"), dus eerst beoordelen. | laag | **open**, niet in beeld gezien |
| 12 | `intromontage.js`, `missionstory.js`, `cutscenehost.js` | 14 losse primitieven in scènecode (de automaat met scherm en aanhanger, het blik, de paal, het glas, de voetbal, twee schaduwcirkels, een kiosk met sticker). Tegen de nieuwe regel (zie onder). | middel | **open** (de baseline houdt het vast) |
| 13 | `story-opening-keuken` en de 19 terugkeervignetten | Spelen nog in de keukenkit en niet in de flat (zie [CUTSCENE-INTERIEURS-22-11.md](CUTSCENE-INTERIEURS-22-11.md), "De keuken en de flat"). | laag | **open**, bewust |

## Wat er is veranderd (en waarom zo)

- **`game/js/boatdeck.js`** (puur): het dak van de rondvaartboot (`CANOPY`: 1,6 m, 1,25 m vanaf de achtersteven, 1,35 m vanaf de boeg) is nu één bron voor het model
  (`models3d_vehicles.js rondvaartFit`) en voor de plaatsing. `deckPlan(model)` kiest `bench` (rondvaart: derde bank van voren, twee zitplaatsen naast elkaar), `seats`
  (een romp te smal om op te staan) of `stand`. `spotIssues` zegt of een figuur door het dak steekt of buiten de romp valt.
- **Regie van de bank** (`cutscenes_akte1.js benchSpec`): zittend (zithoogte 0,27 m boven de vloer), de lijven naar de boeg, alleen de hoofden draaien naar de spreker
  (`gaze`). Eerst draaiden de lijven naar elkaar en lagen handen en knieën tegen elkaar: dat las als hand in hand, een romantiek die het verhaal op dat moment nog niet
  heeft (canon: net student af, al vrienden; de kus is M16, zie [verhaal.md](../.specs-fire/standards/verhaal.md)). Een brede opening vanaf de boeg, daarna een korte opname en een
  zachte dolly per beurt, steeds aan één kant van de as en onder het dak (camera hoogstens 1,15 m boven de vloer). Er verandert niets aan wat de speler te weten komt: de scène laat
  alleen het paar op de bank zien, geen kaart, geen tekst, geen reactie die het verhaal vooruit loopt.
- **Staan blijft kunnen**: de kus en het dekmoment staan op het open voordek, net voor het dak (`boatStage(v, true)`).
- **Voertuigpaden** in vijf scènes (zie tabel) lopen nu om het voertuig heen of langs de deur.

## Audits en tests

| Wat | Waar | Bewaakt |
|---|---|---|
| `scripts/cutscene_regie_audit.mjs [--strict] [--boot-strict]` | nieuw | figuren in voertuigen en in elkaar, camera in figuur of voertuig, sprekers die wegkijken, elke boot tegen dak en romp |
| `scripts/boatdeck_test.mjs` | nieuw (27 controles) | het dak is één bron, de oude plek wordt afgekeurd, elke bootsoort heeft een plek, de echte scène geeft geen vondst |
| `scripts/cutscene_assets_audit.mjs [--strict]` + `_test` | nieuw (60 controles) | register en regel hieronder |
| `scripts/qa/cutscene_shots_web.mjs`, `cutscene_boot.page.js` | nieuw | stills in headless Chrome, scènes op de boot |

Stand van `cutscene_regie_audit`: voor 48 vondsten (7 ernstig), na 41 (0 ernstig, de rest is nummer 11).

## Regel: alleen echte assets (eigenaar, 23-11)

Opgenomen in [verhaal.md](../.specs-fire/standards/verhaal.md) ("Cutscenes en assets"). Kort: mensen uit het personage- en kledingsysteem, dieren uit het dierenregister, voertuigen uit de
echte voertuigmodellen (`PROP_SOURCES`), voorwerpen en kamers uit de gedeelde bibliotheken (`storyprops.js DECOR_MAKERS`, `realsets.js`, `interiorfill.js`). Een nieuw voorwerp mag, maar
alleen in het register, met de kwaliteitsnorm `PROP_NORM` (zes punten in `cutscenemodels.js`: één bouwer, afmeting, herkenbaar silhouet van dichtbij, materialen en budget, juiste registers,
verhaalfunctie) en het budget `DECOR_BUDGET`.

**Stand:** de architectuur voldoet al grotendeels: 12 propsoorten komen uit de wereld (voertuigen en dieren) en 39 uit het ene register met 39 bouwers; mensen komen uit `buildPersonMesh`.
De schuld zit in 14 losse primitieven in `missionstory.js` (9), `intromontage.js` (4) en `cutscenehost.js` (1, de schaduwcirkel). `cutscene_assets_audit` faalt zodra een propsoort niet in
een register staat, een bouwer ontbreekt, of scènecode meer primitieven bouwt dan de baseline; de baseline mag alleen omlaag.

Afstemming met `objecten-aaa-23-11`: het register is `storyprops.js` + `cutscenemodels.js` (klein, zonder nieuwe bestanden); die agent kan voertuigen en voorwerpen daar aan toevoegen en
`PROP_NORM` gebruiken. De 14 schuldregels zijn de eerste kandidaten om naar het register te verhuizen (de automaat, het blik en de paal als bouwers, de schaduwcirkel als gedeelde fabriek).

## Samen spelen

Iedereen lokaal, zoals de scène zelf: een scène op een boot speelt in het eigen spel van wie de missie start; een gast speelt zijn eigen kopie (docs/COOP-GAST.md). Er verandert niets aan
voortgang of beloning. De bank en de zitplaatsen zijn pure plaatsing (`boatdeck.js`), de test dekt ze zonder wereld.

## Niet in beeld gezien

Alles in de tabel zonder "gezien": de zitplaatsen op kleine boten, M30.outro, M01.intro/outro, M15.outro en carriere-bezit-start (alleen de data is gemeten: de audit meldt geen
overlap meer). Niet gedraaid: de volledige suite, `province_test` en de Electron-verhaaltest (coördinator). De rest van de 117 scènes is niet op beeld bekeken.
