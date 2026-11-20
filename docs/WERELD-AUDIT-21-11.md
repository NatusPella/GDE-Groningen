# Wereldaudit 21-11: props en gebouwen op verkeerde plekken (#1044, #1045)

De eigenaar meldde herhaaldelijk bomen en heg op de weg bij een streekplek, een kraan in een weiland,
een container op de weg en een station dat als kerk oogt. Deze audit zoekt de generieke oorzaken over
de hele provincie (2.978 tegels, 370.144 gebouwen, 971.839 bomen, 13.567 meubelrijen, 945 streekplekken,
2.941 waterplekken, 707 landmarkkits).

Gereedschap: `node scripts/world/world_audit.mjs [--strict] [--list] [--json]` (±9 s, één pass, eigen
ruimte-index op de ruwe tegelrijen; in `test_all --fase=zwaar` als `world_audit`, naast
`mission_prop_audit` en `park_road_audit`). De drempels staan in `CAPS` in dat script en kunnen alleen dalen.
De audit oordeelt op de ruwe tegelrijen, onafhankelijk van de filters van het spel (`game/js/propfilter.js`,
`streetfurniture.js spotFreeOnMap`, `treeclear.js`): een `After`-teller telt wat die filters overlaten.

## Oorzaken en fixes

| Oorzaak | Fix |
|---|---|
| M13-plan (`containerplan.js`) met vaste afstanden van een punt; geen controle tegen de tegels | kraan en container verplaatst naar gemeten open plekken; `mission_prop_audit` bewaakt ze |
| Streekplek-kits (mast, zuil, schoorsteen, perron) kenden geen wegcheck, alleen parken | `propfilter.dropStreekParts` voor elke soort (weg, spoor, gebouw) |
| Waterkits (haven, pier, kraan) staan op het vlakmiddel; schuine vlakken leggen de kade op het droge | `propfilter.dropWaterParts` (weg, gebouw, afstand tot water) |
| Stationskit midden op het OSM-punt (ligt op het spoor), willekeurige hoek | `propfilter.stationFit`, aangeroepen in `ommelandlandmarks.js` |
| Bankje of lantaarn kon op het spoor | `spotFreeOnMap` kent het spoor |
| Eerste bouw van een cel vóór de tegels klaar zijn | cel opnieuw bouwen bij `map.geoVer` (alleen als de tegelwachtrij leeg is) |

## Voor en na (parts = onderdelen van de kits)

| Categorie | Voor | Na |
|---|---:|---:|
| Streekplek-onderdelen op een rijbaan | 247 | 0 |
| Streekplek-onderdelen in een gebouw | 671 | 0 |
| Streekplek-onderdelen op het spoor | 354 | 0 |
| Waterplek-onderdelen op een rijbaan | 126 | 0 |
| Waterplek-onderdelen in een gebouw | 57 | 0 |
| Haven-, jachthaven- en pierdelen ver van water (60, 80 en 100 m) | 1.972 | 0 |
| Stations zonder omtrek met voetafdruk op spoor (>10%) | 20 van 21 | 0 |
| Stations met voetafdruk op een weg (>5%) | 4 | 0 |
| Stations met voetafdruk in een gebouw (>15%) | 5 | 0 |
| M13: kraan van het water | 128 m | 6,6 m |
| M13: containers op de Synergieweg | 2 van 4 | 0 |
| Gemapt straatmeubilair op rijbaan (ruw, door het spel al gefilterd) | 2.326 | 0 |
| Gemapt straatmeubilair op het spoor | 6 | 0 |
| OSM-bomen op de rijbaan (ruw, door treeclear gefilterd) | 5 | 0 |
| Landmarkkits met vorm die de OSM-tags niet dragen (kerk, station, museum, school, stadhuis, molen, vuurtoren, kasteel) | 0 | 0 |
| Stations ver (>120 m) van het spoor | 0 | 0 |

Het vorige onderzoek van de weilandranden bleef schoon: `prop_conflict_audit --strict` geeft nul voor palen,
draad, heggen en vee over spoor, weg, water en gebouw, en `park_road_audit --strict` nul na de filter.

## Resterende gevallen (in de tegeldata zelf; herbouw nodig, #1045)

| Categorie | Aantal |
|---|---:|
| Gebouwen met middelpunt op een rijbaan | 146 |
| Gebouwen in water (o.a. De Drie Delfzijlen, Gemaal Rozema, 5 zonder naam) | 7 |
| Bomen in water | 83 |
| Bomen in een gebouw | 36 |
| Meubelrijen in water, ruw (het spel filtert bij het tekenen) | 80 |
| Meubelrijen in een gebouw, ruw (idem) | 44 |
| Brugdekken zonder water, spoor of weg eronder | 161 |
| Stadsperrons zonder spoor in de provinciegegevens (vermoedelijk stad.json) | 13 |
| Landmark in water (De Drie Delfzijlen) | 1 |

Herbouwcommando (niet gedraaid, zoals gevraagd): `node scripts/world/build_province.mjs`, daarna
`cd desktop && npm run stage`. Reden: gebouw- en boomrijen komen uit de pakketbouw (`tegel_schoon.mjs`,
`treeclear.js`), niet uit de runtime.

## Niet gedaan of niet bewezen

- Niet in beeld bekeken: geen Electron-run (de wijzigingen zijn in node bewezen met de audit en de unittests).
  De kraan, de containers en de stations zijn dus nog niet met het oog gecontroleerd: label `wacht-beeld`.
- Sloten en water zonder oevers, objecten onder het maaiveld of zwevend: niet gecontroleerd (vraagt de AHN-raster
  per tegel; de bestaande `terrain_audit` en `prop_water_audit` blijven de bron).
- Strekdammen en golfbrekers (zee, waar de tegels geen watervlak hebben) hebben bewust geen waterregel; 1.185 van
  1.433 strekdammen liggen volledig op >30 m van een tegelwatervlak.
- Brugdekken en tunnels: alleen "iets eronder" (water, spoor, weg) getest, geen vorm of hoogte; 161 zonder
  ondersteuning zijn niet één voor één nagelopen (de maat van de lange opritten van de A7 bij Hoogkerk lijkt legitiem).
- Vaste missieplannen anders dan M13 (waypoints in `missions_*.js`) zijn niet doorgelicht; `missions-AAA` is niet aangeraakt.
- De drempels voor de herbouwgevallen zijn de gemeten stand van nu; ze bewaken alleen dat er niets bij komt.
