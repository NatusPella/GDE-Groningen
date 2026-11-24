# Props, sets en figuranten van het verhaal (stand 22-11)

Gegenereerd door `node scripts/verhaal_props_audit.mjs --write` (#1121). De audit haalt uit alle scène- en missiedata (cutscene-specs, aankleding, wachtstappen, sets, cast) de gebruikte soorten en controleert dat elk bestaat in de modelbouwers, binnen zijn polygoonbudget valt (2 tot 6 materialen, geen NaN, op de grond, niet dubbel), dat de verwijzingen kloppen en dat geen figuur aan het begin in een voertuig of groot voorwerp staat. Alle modellen zijn procedureel laag-poly (`game/js/storyprops.js`); voertuigen en dieren komen uit de wereld. Niets is in beeld gezien: dat blijft "nog niet bekeken" tot de Electron-sweep van de coördinator.

Telling: 102 scènes, 163 props, 51 soorten in gebruik, 27 aankledingsplannen, 51 figuren in de NPC-tabel. Fouten: 0, waarschuwingen: 0.

## Decor (storyprops.js)

| Soort | Bron | Driehoeken | Budget | Materialen | Afmeting (m) | Gebruik |
|---|---|---|---|---|---|---|
| afvalbak | decor | 344 | 420 | 1 | 0.607 x 1.005 x 0.54 | 0 |
| aktetas | decor | 36 | 400 | 3 | 0.46 x 0.355 x 0.13 | 1 |
| automaat | decor | 36 | 400 | 3 | 0.8 x 1.5 x 0.62 | 2 |
| bal | decor | 115 | 400 | 2 | 0.312 x 0.306 x 0.312 | 0 |
| bank | decor | 380 | 480 | 1 | 0.731 x 0.962 x 1.7 | 0 |
| bierglas | decor | 80 | 400 | 2 | 0.074 x 0.164 x 0.078 | 0 |
| bierviltje | decor | 112 | 400 | 2 | 0.097 x 0.009 x 0.1 | 2 |
| bord | decor | 36 | 400 | 3 | 0.74 x 1.545 x 0.05 | 9 |
| botsauto | decor | 48 | 300 | 4 | 1.74 x 0.95 x 1.04 | 2 |
| briefje | decor | 24 | 400 | 2 | 0.21 x 0.016 x 0.15 | 4 |
| broodtrommel | decor | 36 | 400 | 3 | 0.29 x 0.145 x 0.195 | 1 |
| busdeksel | decor | 340 | 420 | 1 | 0.23 x 0.111 x 0.236 | 0 |
| bushokje | decor | 514 | 900 | 1 | 4.14 x 2.76 x 1.76 | 0 |
| carbidbok | decor | 276 | 400 | 1 | 0.646 x 0.555 x 0.549 | 0 |
| carbidspul | decor | 514 | 650 | 1 | 0.526 x 0.425 x 0.324 | 0 |
| container | decor | 204 | 600 | 4 | 3.1 x 2.72 x 2.5 | 5 |
| deken | decor | 48 | 400 | 2 | 1.3 x 0.032 x 0.9 | 1 |
| doos | decor | 24 | 400 | 2 | 0.52 x 0.4 x 0.4 | 12 |
| duiventil | decor | 108 | 400 | 4 | 1.6 x 2.12 x 1 | 2 |
| fietsenrek | decor | 370 | 560 | 1 | 0.126 x 0.472 x 2.9 | 0 |
| fotolijst | decor | 72 | 400 | 3 | 0.47 x 1.408 x 0.36 | 1 |
| friteuse | decor | 60 | 400 | 4 | 0.8 x 1.01 x 0.63 | 1 |
| frituuraanhanger | decor | 176 | 400 | 8 | 4.1 x 1.68 x 2.325 | 1 |
| gehoorkap | decor | 368 | 480 | 1 | 0.1 x 0.207 x 0.31 | 0 |
| goudbal | decor | 372 | 600 | 2 | 0.254 x 0.235 x 0.254 | 0 |
| hek | decor | 48 | 400 | 2 | 2.5 x 1.1 x 0.1 | 1 |
| hesjes | decor | 48 | 400 | 2 | 0.5 x 0.2 x 0.4 | 1 |
| hooibaal | decor | 1012 | 1200 | 1 | 1.361 x 1.412 x 1.239 | 0 |
| jas | decor | 48 | 400 | 3 | 0.44 x 0.13 x 0.49 | 1 |
| jeneverglas | decor | 80 | 400 | 2 | 0.043 x 0.076 x 0.045 | 0 |
| jerrycan | decor | 152 | 260 | 1 | 0.191 x 0.502 x 0.33 | 4 |
| kaart | decor | 516 | 600 | 3 | 0.9 x 0.025 x 0.65 | 1 |
| kantoorwagen | decor | 352 | 400 | 8 | 5.9 x 3.05 x 2.49 | 1 |
| kiosk | decor | 48 | 300 | 4 | 3.02 x 2.42 x 2.4 | 0 |
| klembord | decor | 60 | 400 | 4 | 0.3 x 0.055 x 0.4 | 6 |
| klomp | decor | 128 | 400 | 3 | 0.38 x 0.128 x 0.12 | 5 |
| koelbox | decor | 36 | 400 | 3 | 0.62 x 0.415 x 0.42 | 1 |
| koffer | decor | 60 | 400 | 4 | 0.56 x 0.42 x 0.22 | 4 |
| koffietafel | decor | 960 | 1200 | 1 | 0.704 x 1.118 x 1.322 | 0 |
| krat | decor | 228 | 400 | 3 | 0.51 x 0.26 x 0.34 | 6 |
| lontstok | decor | 164 | 260 | 1 | 2.055 x 0.072 x 0.07 | 0 |
| map | decor | 48 | 400 | 4 | 0.326 x 0.032 x 0.27 | 2 |
| matras | decor | 48 | 300 | 4 | 1.94 x 0.3 x 1.04 | 1 |
| melkbus | decor | 824 | 1000 | 1 | 0.68 x 0.372 x 0.336 | 0 |
| mosterdpot | decor | 92 | 400 | 3 | 0.2 x 0.175 x 0.2 | 1 |
| paaltje | decor | 160 | 260 | 1 | 0.23 x 0.93 x 0.23 | 0 |
| pan | decor | 200 | 400 | 3 | 0.41 x 0.315 x 0.5 | 3 |
| pinautomaat | decor | 200 | 400 | 7 | 3.105 x 2.07 x 1.68 | 0 |
| pinpas | decor | 36 | 400 | 3 | 0.12 x 0.008 x 0.075 | 1 |
| polsstok | decor | 48 | 400 | 2 | 0.09 x 1 x 0.104 | 0 |
| prikbord | decor | 168 | 400 | 6 | 0.072 x 1.385 x 1.04 | 1 |
| radio | decor | 36 | 400 | 3 | 0.4 x 0.5 x 0.16 | 3 |
| scherm | decor | 60 | 400 | 4 | 0.3 x 1.61 x 0.9 | 3 |
| soepketel | decor | 120 | 400 | 3 | 0.56 x 0.355 x 0.46 | 1 |
| statief | decor | 200 | 400 | 4 | 0.524 x 1.541 x 0.6 | 1 |
| stempel | decor | 168 | 400 | 4 | 0.18 x 0.19 x 0.26 | 2 |
| sticker | decor | 14 | 400 | 2 | 1.56 x 0.62 x 0.006 | 0 |
| tas | decor | 48 | 400 | 4 | 0.42 x 0.355 x 0.23 | 2 |
| vetvat | decor | 324 | 480 | 1 | 0.57 x 0.9 x 0.584 | 4 |
| vuurwerk | decor | 150 | 400 | 3 | 0.52 x 0.675 x 0.36 | 1 |
| weidehek | decor | 214 | 320 | 1 | 0.18 x 1.43 x 4.22 | 0 |
| wijnglas | decor | 80 | 400 | 2 | 0.058 x 0.12 x 0.061 | 0 |
| zuil | decor | 36 | 400 | 3 | 0.4 x 1.305 x 0.42 | 1 |

## Voertuigen en dieren uit de wereld

| Soort | Bron | Driehoeken | Budget | Materialen | Afmeting (m) | Gebruik |
|---|---|---|---|---|---|---|
| auto | voertuig (wereld) |  |  |  | 4.7 x 1.95 x 1.75 | 13 |
| bakkie | voertuig (wereld) |  |  |  | 5.4 x 2.1 x 2.5 | 3 |
| bestelbus | voertuig (wereld) |  |  |  | 5.4 x 2.1 x 2.5 | 3 |
| duif | dier (wereld) |  |  |  |  | 8 |
| fiets | voertuig (wereld) |  |  |  | 1.9 x 0.7 x 1.15 | 12 |
| kat | dier (wereld) |  |  |  |  | 4 |
| koe | dier (wereld) |  |  |  |  | 0 |
| limo | voertuig (wereld) | 8912 |  |  | 5.84 x 2.667 x 2.24 | 6 |
| politie | voertuig (wereld) |  |  |  | 4.8 x 1.95 x 1.75 | 1 |
| snackwagen | voertuig (wereld) | 8936 |  |  | 5.719 x 2.964 x 3.268 | 5 |
| tankwagen | voertuig (wereld) | 5350 |  |  | 8.667 x 3.28 x 3.11 | 2 |
| trekker | voertuig (wereld) |  |  |  | 4.5 x 2.4 x 3 | 4 |

## Aankleding van missies (missiedecor.js) en wachtstappen (wachtprops.js)

| Soort | Bron | Driehoeken | Budget | Materialen | Afmeting (m) | Gebruik |
|---|---|---|---|---|---|---|
| aankleding:baal | aankleding | 80 | 600 | 2 | 1.198 x 1.13 x 1.26 | 15 |
| aankleding:bank | aankleding | 48 | 600 | 2 | 2.2 x 1.095 x 0.6 | 15 |
| aankleding:hek | aankleding | 60 | 600 | 3 | 3.1 x 1.05 x 0.08 | 16 |
| aankleding:jurytafel | aankleding | 108 | 600 | 4 | 3.3 x 1.14 x 1 | 3 |
| aankleding:kanon | aankleding | 300 | 600 | 4 | 1.56 x 0.9 x 1.04 | 2 |
| aankleding:kist | aankleding | 36 | 600 | 3 | 1.14 x 0.76 x 0.85 | 33 |
| aankleding:kraam | aankleding | 50 | 600 | 4 | 2.4 x 2.524 x 1.503 | 5 |
| aankleding:perronbord | aankleding | 48 | 600 | 3 | 1 x 2.6 x 0.1 | 2 |
| aankleding:tent | aankleding | 64 | 600 | 3 | 3.2 x 1.925 x 4.774 | 2 |
| aankleding:ton | aankleding | 96 | 600 | 2 | 0.88 x 0.95 x 0.88 | 26 |
| aankleding:tractor | aankleding | 272 | 600 | 5 | 2.646 x 2.05 x 1.68 | 4 |
| aankleding:vaandel | aankleding | 26 | 600 | 2 | 1.343 x 3.2 x 0.1 | 26 |
| wacht:baal | wachtstap | 80 | 600 | 2 | 1.198 x 1.13 x 1.26 | 0 |
| wacht:bank | wachtstap | 48 | 600 | 2 | 2.2 x 1.095 x 0.6 | 0 |
| wacht:bordje | wachtstap | 68 | 600 | 3 | 1.432 x 1.021 x 0.345 | 0 |
| wacht:hengel | wachtstap | 56 | 600 | 3 | 0.94 x 1.346 x 2.08 | 0 |
| wacht:kaartspel | wachtstap | 180 | 600 | 5 | 2.046 x 0.765 x 1.45 | 0 |
| wacht:kist | wachtstap | 36 | 600 | 3 | 1.14 x 0.76 x 0.85 | 0 |
| wacht:koffie | wachtstap | 168 | 600 | 4 | 0.856 x 1.265 x 0.9 | 0 |
| wacht:krant | wachtstap | 68 | 600 | 2 | 0.9 x 1.598 x 0.6 | 0 |
| wacht:landkaart | wachtstap | 48 | 600 | 3 | 1.129 x 1.698 x 0.08 | 0 |
| wacht:plant | wachtstap | 44 | 600 | 2 | 0.936 x 1.632 x 0.936 | 0 |
| wacht:radio | wachtstap | 68 | 600 | 4 | 0.8 x 1.24 x 0.6 | 0 |
| wacht:ton | wachtstap | 96 | 600 | 2 | 0.88 x 0.95 x 0.88 | 0 |

## Sets

Cutscene-sets in gebruik: loket (3), kantoor (5), omakeuken (4), serverkamer (1). Stap-sets in de missies: kantoor (1), serverkamer (1), kruitkelder (3), omakeuken (1), woonkamer (3), loket (4). Elke naam staat in `STAGE_SETS` of is de keuken van de opening.

## Gefixt in deze ronde

- 17 nieuwe decormodellen (klomp, stempel, pinpas, map, bierviltje, fotolijst, statief, krat, pan, vuurwerk, koelbox, jas, aktetas, hesjes, container, scherm, prikbord); eerder stonden die als doos, bord, klembord of tas in beeld.
- 3 echte wereldmodellen als scène-prop: de snackwagen (M30), de vettankwagen (M07) en de trekker-limo (M10, M14, M15, M26); eerder een bestelbus of gewone trekker.
- De bal is een voetbal (twee materialen) in plaats van een gele bol; matras, koffer, klembord, bord, radio en duiventil kregen een detail of een materiaal erbij.
- Beppe heeft een figuur in de NPC-tabel (`missionstory.js`); de scène met haar kon eerder niet worden bezet.
- Bank, kist, baal en ton bestonden twee keer (aankleding en wachtstap); nu één bouwer (`wachtprops.js`).
- `PROP_MAKERS` is uit `cutscenehost.js` verhuisd naar `storyprops.js` (met budget en meting); de draaghoogte (`CARRY_LOW`) staat nu op één plek.

## Open

- `paal` (M02), `lijstje`, `zak`, `bakje`, `vergunning` en `bord` als bordje blijven bestaande vormen (bord, klembord, tas, doos): herkenbaar genoeg, geen eigen model nodig.
- De aankleding-trekker (`tractor` in missiedecor.js) is een blokkenmodel van 6 delen; het silhouet klopt maar de wereldtrekker is mooier.
- Het prikbord (N8, de vijf vrienden) bestaat nu als model, maar er is nog geen scène-spec die hem neerzet (N8 is een gesprek zonder cutscene-spec).
- Niets hiervan is in beeld gezien (geen Electron in deze ronde): vorm, schaal en kleur zijn alleen gemeten, niet gekeken.

Soorten zonder scène-gebruik (model bestaat, geen spec zet ze neer): bal, bank, afvalbak, fietsenrek, bushokje, paaltje, melkbus, busdeksel, carbidbok, carbidspul, lontstok, gehoorkap, koffietafel, hooibaal, weidehek, pinautomaat, goudbal, polsstok, bierglas, jeneverglas, wijnglas, kiosk, sticker, koe.

