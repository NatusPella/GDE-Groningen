# OV-missies: een bus- of treindienst starten bij elke halte en elk station (20-11)

> Eigenaarsfeedback (20-11): "ik wil gewoon een treinmissie kunnen starten op een station. Ik wil ook dat de bushaltes in de game zijn en dat ik bij elke halte een busmissie kan starten." Issue #985. Regels: `game/js/ovmissie.js` (puur, ADR 0005), test `scripts/ovmissie_test.mjs`, beeld `scripts/qa/ov_beeld.mjs`.

## Wat er was (onderzoek in de code, voor dit werk)

| Onderdeel | Stand voor 20-11 |
| --- | --- |
| Buslijnen | `provincie-bus.json` (door `build_corridor.mjs`) wordt bij het laden `prepareLine`-d tot lijnen met haltes op boogafstand `{ s, x, y }` (`busroutes.js`, `vehicle.getBusLines()`). De haltenamen uit de data zijn echt en komen nooit in beeld: `busservice.stopName` geeft een verzonnen naam, `lineName` een verzonnen lijn. |
| Bushaltes in de wereld | **Geen model.** De haltes bestonden alleen als data voor de bus-AI (halteren, het bord "volgende halte" op de bus). Geen paal, geen bord, geen abri, geen naam te zien. Er is ook geen OSM-haltepunt in de tegels (`stad_wegen.mjs` leest alleen treinperrons uit `public_transport=platform`). |
| Bushaltes op de kaart | Alleen de live bussen (`busmap.js`); geen haltes. |
| Busbijbaan `bus` (Stadsbus lijn 3) | Vaste lijst van zes haltes in de stad (`sidejob_bus.js STOPS`), start bij het bijbaanbord, de bus spawnt bij het Hoofdstation. Niet per halte. |
| Busbijbaan `lijn` (Noorderspoor streekbus, eerder Streekbus Hunzedal) | Start bij het bijbaanbord op het eerste halte van de eerste lijn, of door in een rijdende bus G te drukken (de dienst overnemen, `busboard3d.js`). Dus nooit "vanaf deze halte". |
| Stations | Kaartautomaat per station (`stationtravel.js`, prompt E "Met de trein", menu: snel reizen, als passagier meegaan, en een hint). Stations staan op de kaart (laag `trein`). Perrons zijn echte vloeren (`perrons.js`). |
| Treinmissie | Geen. Zelf rijden kon alleen door naar een stilstaande trein te lopen en E te drukken ("trein kapen": twee sterren, tenzij de trein geparkeerd was) en daarna G voor de dienst (`traindrive.js`, `machinist.js`). De machinistdienst zelf (regels, loon, medailles, conducteur, storingen) was er al. |

## Wat er nu is

**Stations (`treindienststart.js`).** In het menu van de kaartautomaat staat onder "Zelf de trein besturen" per richting een dienst: "Noorderspoor naar <eindhalte> · spoor n · de volgende haltes" (`ovmissie.stationOpties`). Kiezen zet de trein van die lijn klaar op het perron (geparkeerd, dus geen kaping en geen sterren), laat de speler instappen en begint de bestaande machinistdienst (`machinist.startDienst`). Een regelkaart met pictogrammen (doel, afloop, drie stappen) komt via `regelkaart.js`. Loon, medaille en conducteurskeuze zijn die van de machinistdienst. Onderweg staan de haltes van de dienst op de kaart (`missionmaplive.js`, bestaand).

**Bushaltes (`bushalte.js`).** Elke halte van elke lijn heeft een paal met bord, de haltenaam boven het bord (alleen bij de dichtstbijzijnde, binnen 45 m) en bij ongeveer elke tweede halte een abri. Dat zijn drie `InstancedMesh`-en met een vaste pool van 48 plekken rond de speler (haltes binnen 220 m, ververst per 0,6 s of 25 m): geen draw call per halte en geen lijst van alle haltes in beeld. De zoekvraag loopt over een raster (cel 400 m) en voegt haltes van verschillende lijnen binnen 14 m samen tot één halte. Bij de paal (9 m) staat de prompt "Halte <naam>" met E; het menu laat per lijn en richting een dienst zien ("Lijn 7 <naam> naar <eindhalte>"). Kiezen start de bijbaan `lijn` met `takeover.halte` (`sidejobs.startBusDienstBijHalte`): de bus staat bij de halte klaar, de rit begint daar in de gekozen richting (`makeRide` met `first`), met de bestaande dienstregeling, halteknop, deuren (O) en tevredenheid.

**Kaart.** Haltes rond de speler (2,5 km, hoogstens 70, per 150 m ververst) staan als busicoon onder het OV-filter (laag `trein`), met een legenda-rij "Bushalte".

## Samen spelen (regel)

De wereld, de haltes, de automaten en de treinen zijn van wie het spel opende. De speler die E drukt start de dienst voor zichzelf: loon, voortgang en medaille per speler (#429); de crew van een treindienst deelt zoals altijd via `treincoop.js` (#492). Een gast draait de wereld niet (`coopRole === 'client'`): bij hem blijft de halteprompt weg en het menu van de automaat laat de dienst weg; hij rijdt mee als passagier of conducteur. Wegvallen of later aansluiten verandert niets aan de beloning. Dekking: `ovmissie_test.mjs` (pure regels); met twee echte spelers niet bekeken. Zie ook [COOP-GAST.md](COOP-GAST.md).

## Gezien en niet gezien


**Gezien in Electron (20-11, beelden in desktop/build/ovtest3-uit en ovtest4-uit, scripts/qa/ov_beeld.mjs):** de halte Molenlaan met paal, bord, naam en abri (met glazen wand), de prompt "Halte Molenlaan" met E, het menu met vier diensten, een bus 3 m van de halte met bus-HUD ("Naar Veenkade"), instappen en de dienst; het station Groningen Noord met prompt, menu en het tabblad "Zelf de trein besturen", een dienst naar Eemshaven met de trein klaar op het perron (geen sterren), de cabine met het bord "Dienst 1/6" (Sauwerd, Winsum, Baflo, Warffum, Usquert, Uithuizen) en een trein die na gas geven rijdt (c 4100 naar 4129, 9,4 m/s). Geen fouten in de run.

**Niet gezien:** de regelkaart van de treindienst (in de cabine-beelden komt hij niet in beeld, mogelijk onderdrukt door de cabine-HUD of de lopende missiekaart); het busicoon op de kaart; de halteprompt en het menu voor een gast; Samen spelen met twee echte spelers; een halte buiten de stad; de prestaties van de pool in een dichte stad (alleen het aantal instanced meshes is gemeten). Twee richtingen op een station kunnen dezelfde eindhalte hebben (spoor verschilt); dat is geen fout.
