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
| 2 | dekmoment op de rondvaartboot (`playDeckMoment`, de opbouw naar de kus) | De camera stond op 1,5 m voor het paar met een smalle lens: hoofden afgekapt. De "reling" bestaat niet in het bootmodel: de handen liggen op niets. | middel | camera en reling **opgelost, gezien** (ronde 2) |
| 3 | scènes op kano, kajak, SUP, skiff, acht, roeiboot, dinghy | Het paar loopt 0,9 m uit elkaar en staat dwars op een romp van 0,5 tot 1,3 m breed: figuren staan in het water (41 auditregels). | ernstig | **opgelost** (zitplaatsen uit `boatSeats`), **niet in beeld gezien** |
| 4 | `M30.outro` | Tinus loopt naar (4,6; -1,8) en staat 34,6 s midden in de snackwagen. | ernstig | **opgelost** (loopt om de staart heen), niet in beeld gezien |
| 5 | `M01.intro` | Berend loopt bij "Nul krassen" naar (4,0; 1,9): 46 s midden in de bakkie. | ernstig | **opgelost** (langs de flank), niet in beeld gezien |
| 6 | `M10.intro` | Jelle, Durk en Douwe beginnen midden in de limo (alleen hun voeten zijn te zien) en Jelle loopt er dwars doorheen. | ernstig | **opgelost, gezien** (stappen aan de zijkant uit) |
| 7 | `M15.outro` | De jurylid loopt in een rechte lijn door de limo. | middel | **opgelost** (voor de limo langs), niet in beeld gezien |
| 8 | `M01.outro` | Berend "loopt rond de bakkie" maar twee punten van het pad liggen in de bakkie. | middel | **opgelost** (pad 1,45 m naast de wagen), niet in beeld gezien |
| 9 | `carriere-bezit-start` | Buurman Aldert loopt voor koffie de trekker in (6,6 s). | middel | **opgelost**, niet in beeld gezien |
| 10 | intro's op een boot | De camera begint ruim 16 m hoog (de volgcamera) en zakt in zes seconden naar het paar: de eerste seconden zien de speler niet wie praat. Nog niet uitgezocht of dit voor alle intro's geldt (`playStaged`/`cinematics.js`). | middel | **opgelost, gezien** (ronde 2: harde snee bij een ver begin) |
| 11 | 41 meldingen "spreker kijkt weg" (o.a. `F4` Jelle 19,8 s van Mem af, `M10.intro` Jelle 24,6 s van Durk af, `M15.outro` Roelfien 20 s van Jelle af, `M03.2`, `M26.6`, `F3`) | Het lichaam van de spreker staat meer dan 100 graden van de dichtstbijzijnde figuur af terwijl hij praat. Veel zijn waarschijnlijk figuranten of een blik naar een prop (de audit kent geen "praat tegen het publiek"), dus eerst beoordelen. | laag | **opgelost** (ronde 2: 28 meetfouten, 2 echte oorzaken in de regietaal, 4 bewust) |
| 12 | `intromontage.js`, `missionstory.js`, `cutscenehost.js` | 14 losse primitieven in scènecode (de automaat met scherm en aanhanger, het blik, de paal, het glas, de voetbal, twee schaduwcirkels, een kiosk met sticker). Tegen de nieuwe regel (zie onder). | middel | **opgelost** (ronde 2: alles naar het register, baseline 0) |
| 13 | `M30.outro` (het slot van het spel) | Na de brede opening ziet de speler de snackwagen "Tam & Tes" en de gasten niet meer: de close-ups kijken van de wagen af naar het Stadhuis, en Tammo en Tessa staan met idle armen in de lens. Het eindbeeld van de held van het verhaal verdwijnt uit beeld. Gezien op beeld, nog niet aangepast. | middel | **opgelost** (ronde 2), niet in beeld na de wijziging |
| 14 | `story-opening-keuken` en de 19 terugkeervignetten | Spelen nog in de keukenkit en niet in de flat (zie [CUTSCENE-INTERIEURS-22-11.md](CUTSCENE-INTERIEURS-22-11.md), "De keuken en de flat"). | laag | **open**, bewust |

## Ronde 2 (23-11, op verzoek van de coördinator)

| # | Vraag | Uitkomst | Stand |
|---|---|---|---|
| R1 | Kaart "TEST / TEST" linksonder in rondvaart-gesprek-na.png | Een artefact van het testscript (`cutscene_boot.page.js` gaf kicker en titel 'Test' mee), geen speltekst. Het script zegt nu Rondvaart. Nieuw: `scripts/speltekst_placeholder_test.mjs` keurt TEST, TODO, FIXME, lorem ipsum en dergelijke af in de verhaaldata en in de spelerzichtbare letterlijke teksten van game/js (kicker, title, caption, text, label, desc, addMessage, showBanner). | opgelost, getest |
| R2a | Los groen vierkant op straat in m10-intro (en in M01 en M30) | Het staat op de vaste testplek van het harnas (Grote Markt, 200,8 / 45,4), niet bij het anker van een verhaalscène. Een vierhoek van 4 hoekpunten in de wortel van de scène op (198,9 / 46,1), 0,1 m boven de straat. Een vergelijking met en zonder scène (dezelfde opbouw, `_diag`-run) laat zien dat de scène hem niet maakt; in de vrije wereld rond die plek vond ik hem niet terug. Waarschijnlijk iets van de harnasplek of de stream (grond- of spelersmarkering). | **open**, niet opgelost; niet van de cutscenecode |
| R2b | Zwevend zwart bord met paal boven de trekker (m10-intro) | De kijkstraal raakt het pand zelf (`building`, schaduwwerper, 4,6 m hoog): een luifel van het gele pand met een lantaarnpaal ervoor, wereldgeometrie en ook zo in het spel. | geen cutsceneprobleem; doorgegeven als wereldpunt |
| R3 | 41 meldingen "spreker kijkt weg" | De audit meet nu tegen wie de spreker aanspreekt (de vorige andere spreker) en telt de blik mee: 13 over. Twee echte oorzaken in de regietaal (`cutscript.js`): een spreker met gaze 'speaker' keek recht vooruit (nu naar wie hij aanspreekt) en een draai tijdens het lopen ging verloren bij aankomst (M25.outro: Jelle tegen Mem). De laatste vier zijn bewust (telefoon, stream, wegrennen, weglopen) en staan met reden in `ALLOW`. `cutscript_blik_test.mjs`. | opgelost |
| R4a | Reling op de rondvaartboot | `boatdeck.js RAIL` (één bron), getekend in `models3d_vehicles.js rondvaartFit`: staanders langs de boord en een bovenregel die bij de steven samenkomt; de handen van het dekmoment liggen erop. | opgelost, gezien |
| R4b | Camera die bij boot-intro's van 16 m afdaalt | `scene3d.js`: begint een filmpje meer dan 10 m van de spelcamera (ook als het vorige nog uitblendt), dan is het eerste beeld een harde snee en vervalt de daklift van de vorige plek. Gemeten: eerst 16,8 → 0,6 m over zes seconden, nu meteen op ooghoogte. | opgelost, gezien |
| R4c | M30.outro: de snackwagen uit beeld | De laatste vijf beurten van Tammo en Tessa van achter het paar, met de wagen Tam & Tes achter hen; alle camera's aan de kant van de opening (de lint telt in deze scène minder assprongen dan eerst). | opgelost, niet in beeld na de wijziging |
| R5 | De 14 losse primitieven | Nieuwe bouwers in het register `storyprops.js`: pinautomaat (op een aanhanger met wielen en dissel), jerrycan, goudbal, polsstok, bierglas, jeneverglas, wijnglas, kiosk, sticker VERKOCHT; de matras en de dozen van de verhuisdag uit de bestaande bouwers; de schaduwvlek één gedeelde fabriek (`shadowDisc`). Elk met oorsprong op de grond en een budget (`verhaal_props_audit` groen, `docs/PROPS-STAND-22-11.md` bijgewerkt). Baseline van `cutscene_assets_audit` is leeg. | opgelost |
| R6 | Bus- en treinscènes | De regie-audit legt nu ook elke zit- en staanplek van de gelede bus, de midibus en elke bootsoort tegen dak en wand. Eén vondst: in de smalle midibus (2,3 m) stond de reiziger bij de deur met een schouder in de wand (`businterieur.js`, opgelost). Trein- en taxirit (`reisrit3d.js`, `ritcabine.js`) zetten geen figuren neer: de camera is het oog van de passagier achter het raam; daar is geen plaatsingsfout mogelijk. | opgelost (bus), trein en taxi nagekeken |
| V1 | Opening 0:15: Tammo komt uit een zwart gat de keukendeur door, in losse delen | De keuken was een gesloten doos; zijn wand op de deur tekende over alles erachter. Nu vier wanden met een echte deuropening en een korte, verlichte gang (vloer, kapstok, lamp, de volgende deur aan het eind); Tammo begint in de gang. (`introkitchen3d.js`, `intromontage.js`) | opgelost, gezien |
| V2 | Opening 0:18: hoofd uit beeld bij "Moi. De bank?" | `story-opening-keuken` (de stand van integratie-0.66 met de keukenshots van cutscene-kwaliteit-23-11 als basis): de dolly keek laag en dichtbij naar zijn borst (`tammo@1.3`); nu op ooghoogte en iets verder. | opgelost, gezien |

Niet in deze ronde gedraaid: de volledige suite (coördinator). Twee tests falen in deze stand (main plus integratie-0.66) zonder dat ze cutscenecode raken: `perf_code2_test` (de timing van een verborgen tabblad, `visibletimer.js`) en `verhaal_onthulling_test` (de tekst van M01.1 en M03.x in `script.json`, die uit main komt). Niet op een schone checkout nagerekend.

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
overlap meer). Niet gedraaid: de volledige suite, `province_test` en de Electron-verhaaltest (coördinator). De rest van de 117 scènes is niet op beeld bekeken. Bus- en treinscènes (`reisrit3d.js`, `stationtravel.js`, `fjordtrain.js`) zijn niet onderzocht: de scènetaal kent geen bus of trein als prop (alleen de snackwagen), dus de nieuwe audit dekt ze niet; de plaatsing van figuren in die voertuigen is een vervolg.
