# Triage speeltest Mathijs en Alexander (15 okt 2026)

Bron (ruw, 79 punten): `docs/speeltest-mathijs-alexander.md`. Dit document sorteert elk punt in een categorie, geeft prioriteit, release en grootte, en past de regels van de eigenaar toe. Samengevat in `docs/BACKLOG.md` en `ROADMAP.md`.

## Hoe te lezen

- **#** is het regelnummer in de ruwe lijst (1 = OOGTV, 79 = Woeste Hoeve), zodat niets zoekraakt.
- **P0** schaadt het spel nu of ontgrendelt het volgende; **P1** grote waarde, eerstvolgende versies; **P2** belangrijk, kan wachten; **P3** leuk om te hebben.
- **Release**: 0.30.1 (patch), 0.31 (wegen en wereld), 0.32 (corridor), 0.33 (provincie), F3, F4a/b/c, of later.
- **Grootte**: S = minder dan een dag, M = 1 tot 3 dagen, L = meer dan 3 dagen (agent-dagen).
- **Afh.** = afhankelijk van: F1 (hoogteprofielen en wegennet uit 0.31), tegelwereld (0.32/0.33), nieuw model, of niets.
- **Dubbel** = hoort bij een bestaand backlogitem; dan samengevoegd, niet opnieuw geschreven.
- Eigen namen en merken uit de ruwe lijst staan alleen in de kolom "Tester zei"; in het spel gebruiken we de verzonnen naam uit de tabel "Spelnamen".
- Bestandsnamen zijn waarschijnlijke plekken (gevonden met grep op de code), geen garantie; controleer vóór het bouwen.

## Regels die voor alles gelden

1. Geen echte merken, bedrijven, instanties of personen in speltekst, borden of modellen. Echte **plaatsen en gebouwen** (Forum, Korenbeurs, Euroborg, Helix, Martinitoren, Academiegebouw, pannenkoekenschip, Stadsschouwburg, Kardinge, Gruno-park, Bourtange, Woeste Hoeve) mogen met hun echte naam.
2. Gaswinning en aardbevingen alleen als stille, respectvolle zijlijn (`PROVINCIE-VERHAAL.md` §8): geen grappen over schade of slachtoffers, geen schurk die "het gasbedrijf" is. Alles hierover staat bij de beslissingen.
3. Altijd zomer. Alleen Nederlands. 18+ is toegestaan.
4. Wat nieuwe wereld nodig heeft wacht op de tegelwereld; wat in het stadsgebied past kan eerder.

## Spelnamen (verzonnen vervangers)

| Tester zei | In het spel | Opmerking |
|---|---|---|
| OOGTV, RTV Noord-busje | streekomroep "Radio Noordkust" met een busje | geen echt logo |
| DUO | studiefonds-dienst "StudieStaat" | satire, geen echte instantie |
| McDonalds | snackketen "Snelle Hap" | |
| Swapfiets | fietsabonnement "Wisselwiel" (eigen kleur, niet blauw) | |
| Xior | studentenflat "Kamerkoning" | |
| ANWB | wandelbond "De Toerbond" | |
| NAM | mijnbouwbedrijf "Delfstof Noord" | besloten 2 |
| Gasunie-gebouw | "het glazen netbeheerhuis" | gevel mag herkenbaar zijn, de naam niet |
| Bakker Bart | bakkerij "Bakker Bert" | |
| Vindicat | studentencorps "Vigilantia" | |
| GemeenteOplossingen | gemeentedienst "Het Loket" | stoffig en ambtelijk |
| iWink | webbureau "Wiebelwerk" (knipoog, besloten) | zie Besloten 1 |
| KPN-gebouw | "het oude Telefoonhuis" | |
| Hanze | hogeschool "Noordhaven" in een Hanze-achtig gebouw | |
| Van Mesdag | "Kliniek Van der Meden" | zie open 5 |
| Datacenters Zernike | "Wolkenhal" (zelfde naam als Eemshaven, `PROVINCIE-VERHAAL.md` §8) | |
| Bernard | verzonnen zwerver "Bernhard met de Karretje", gelijkenis alleen in stijl (hoed, tas, praatstijl) | nooit de echte persoon |
| Riepe | straatkrant "De Straatkrant" | |

## 1. Bug en UX-fix (3)

| # | Tester zei | Wat | P | Release | Grootte | Afh. | Dubbel |
|---|---|---|---|---|---|---|---|
| 4 | Herestraat ondoordringbaar / straatspam | Te veel props en voetgangers in de Herestraat; dichtheid per voetgangersstraat begrenzen, doorloopbreedte garanderen | P0 | 0.30.1 | S | geen | |
| 7 | Te lage viaducten! | Doorrijhoogte klopt niet: ring- en spoorviaducten te laag voor hoge voertuigen en de camera. Nu: dek omhoog waar gemeten; goed: hoogteprofielen | P0 | 0.30.1 (bijstellen), 0.31 (echt) | S dan L | F1 | 0.31 #1 |
| 8 | Bruggen kapot bij aanvaring met schepen | Schepen slopen bruggen of pijlers: botsing met brugdek moet het schip stoppen, de brug blijft heel | P0 | 0.30.1 | S | geen | 0.31 #5 (beweegbare bruggen) |

## 2. World-fidelity (8)

| # | Tester zei | Wat | P | Release | Grootte | Afh. | Dubbel |
|---|---|---|---|---|---|---|---|
| 10 | Japanse kersenbloesem (roze bomen) | Eén roze sierboom op een paar echte plekken (laan, park); het is zomer, dus als "sierboom" met roze blad | P3 | 0.31 | S | `treeprops.js` | 0.31 #6 |
| 11 | Meer soorten bomen, subtiele verschillen | 6 tot 8 soorten (eik, beuk, linde, wilg, berk, populier, es) met kleur, hoogte en kroonvorm; soort uit OSM `species` waar bekend | P1 | 0.31 | M | OSM-soort in tegels | 0.31 #6 |
| 14 | Binnenvaartschepen, jachthavens | Binnenvaartschepen op Eemskanaal en Van Starkenborghkanaal, jachthavens met vaste ligplaatsen (Paterswolde, Hoornse Plas, Lauwersoog) | P1 | 0.32 (stadsrand), F3 (provincie) | L | tegelwereld, `waterindex.js` | F3 veerboten |
| 20 | Ring niet zomaar overlopen / fietstunneltjes | Ringweg als echte barrière voor voetgangers en fietsers; oversteek via tunnel of brug | P0 | 0.31 | M | F1 | 0.31 #1 |
| 28 | Slootjes liggen dieper | Sloten en vaarten dieper in het terrein: oeverhelling, zichtbare diepte | P1 | 0.31 | M | F1 water | 0.31 #5 |
| 32 | Meer bestaande 3D-maps gebruiken | 3D BAG: echte hoogtes en dakvormen; waar nodig aanvullen met open 3D-stadsmodellen | P1 | 0.31 | L | 3D BAG, bronvermelding | 0.31 #7 |
| 33 | Vet veel fietsen in het centrum | Fietsstromen in drie lagen (dichtbij, midden, ver) in het centrum en bij de stations; fietsenwal bij het station | P1 | 0.31 (parkeren), 0.32 (stromen) | M | `trafficfleet.js`, `pedestrians.js` | 0.32 #5 |
| 55 | Bruggen open en dicht (race?) | Beweegbare bruggen met klok en schipgedrag; `pg_bruggenrace.js` bestaat al, uitbreiden met "haal de brug" | P2 | 0.31 (bruggen), later (race) | L | F1 water, schepen | 0.31 #5 |

## 3. Open-wereldleven (19)

| # | Tester zei | Wat | P | Release | Grootte | Afh. / dubbel |
|---|---|---|---|---|---|---|
| 3 | Politiepaarden poepen | Stoet met paardenpoep op straat (kleine prop, geen punten); vrolijk detail | P3 | 0.30.1 | S | `policemounts.js` |
| 5 | Bedelaars / Riepe-verkopers | Verkopers van "De Straatkrant" met hesje; mensen die om geld vragen: respectvol, niet pesten | P2 | 0.31 | S | `pedestrians.js` |
| 6 | Bernard (herkenbare zwerver) | Verzonnen "Bernhard met de Karretje" op een vaste plek in het centrum, praatjes, kleine zijmissie | P2 | 0.31 | S | open 4 |
| 9 | Fatbike-overlast bij McDonalds | Jongeren op fatbikes bij "Snelle Hap"; als beveiliger de overlast aanpakken (zie 47) | P2 | F3 | M | combat, politie |
| 12 | Studenten verhuizen op de fiets, bankstel | Ambient: studenten met bankstel, matras, plant op bakfiets of lopend | P1 | 0.31 | M | nieuwe props; `sidejob_verhuizing.js` bestaat |
| 13 | Roeiende studenten | Skiffs en achttallen op Eemskanaal en Hoornse Plas, coach op de fiets ernaast | P2 | 0.32 | M | boot-ambient, nieuw model |
| 17 | Swapfietsen | "Wisselwiel"-fietsen in verkeer en bij het station; te pakken als huurfiets | P2 | 0.31 | S | `sidejob_fietsdepot.js` |
| 18 | Gammele fietsen, boete geen licht | Studenten op gammele fietsen; BOA schrijft boete voor geen licht 's nachts | P2 | 0.30.1 (boete), 0.31 (fietsen) | S | `trafficlaw.js`; zie 19, 47 |
| 19 | Boete voor mobiel in de hand | Boete als je op fiets of brommer met de telefoon in beeld rijdt | P2 | 0.30.1 | S | `trafficlaw.js`, `phone.js` |
| 21 | Magneetvissers beboeten / granaat vissen | Magneetvissers aan de brug; granaat uit het water vissen als geheimpje, melden bij politie | P2 | F3 | M | water, interactie |
| 22 | Meer bezorgers met grote tassen | Bezorgers op e-bike met grote kubusvormige tas, in de drukte en 's avonds | P1 | 0.31 | S | `sidejob_bezorger.js` |
| 24 | Fiets stelen en verkopen, kans op politie | Fiets pakken, naar de opkoper, klein bedrag, politiekans | P1 | 0.31 | M | `crime.js`, `economy.js` |
| 25 | Bedum straatgangs | Rondhangende jongens in Bedum met droge dialoog; geen echte bende, geen geweld nodig | P3 | F4a | S | herkenningspunt Bedum |
| 29 | ANWB-stellen in Ommeland | Wandelende en fietsende stellen van "De Toerbond" met kaart en fietstas, op fietsroutes | P2 | 0.33 | S | `countrylife.js` |
| 36 | Stedum-grappen | Droge grappen op bordjes en bij Rikus ("Komt u uit de stad of gaat u naar Stedum?") | P3 | 0.30.1 | S | `flavourlines.js`; herkenningspunt Stedum |
| 37 | RTV Noord-busje laten rondrijden | Busje "Radio Noordkust" met camera op het dak, rijdt rond, stopt bij events | P3 | 0.31 | S | nieuw model |
| 54 | Suppen op het water in de stad | Suppers en kano's op de grachten en het Reitdiep | P3 | 0.32 | S | boot-ambient |
| 77 | In bepaalde wijken beroofd worden | In een paar wijken kans op beroving (geld kwijt, geen geweld tegen jou); waarschuwing op de kaart | P2 | 0.31 | M | wijken; besloten 3 |
| 78 | Tessa voelt zich onveilig bij het uitgaan | Lichte sociale noot: Tessa vraagt 's nachts om een paar plekken te mijden; geen preek, geen slachtoffers in beeld | P2 | F4a | S | verhaal; besloten 3 |

## 4. Minigames en activiteiten (8)

| # | Tester zei | Wat | P | Release | Grootte | Afh. |
|---|---|---|---|---|---|---|
| 15 | Discgolf in het stadspark | Negen manden in het Stadspark, worp met kracht en wind | P2 | F3 | M | `throwables.js` |
| 16 | Skateparks | Skatepark (o.a. bij de Oosterhamrikkade): tricks op een board, scoreboard | P2 | F3 | M | nieuw model, bordphysica |
| 52 | Boot te water laten | Trailer en helling: je boot zelf te water laten bij een jachthaven | P2 | 0.32 | M | boten, jachthaven (14) |
| 60 | Zwembad (de Papiermolen) | Banen zwemmen, duiken, badmeester | P2 | F3 | M | `swimmers3d.js`, zwembad-interieur |
| 63 | Pitch & Putt | Negen holes, zelf putten | P3 | F3 | M | |
| 65 | Klimtoren bij Zernike | Klimtoren en boulderwand, vallen kan | P3 | F3 | M | nieuw model |
| 66 | Karten bij Kardinge | Kartbaan in Kardinge (arcade-rijden bestaat al), rondetijden | P1 | 0.32 | M | `drift.js`, `gearbox.js`, baan |
| 68 | Waterskieren bij het Gruno-park | Waterskiën achter boot of kabelbaan, sprongen | P3 | F3 | M | boot- en waterphysica |

## 5. Missies, zijmissies en verhaalhaken (19)

"Deel" verwijst naar `docs/verhaal/deel4-f4a.md` en `PROVINCIE-VERHAAL.md` (F4a Stad/Hogeland/Eemsdelta, F4b Wadden/Westerkwartier, F4c Oldambt/Veenkoloniën/Westerwolde/Bourtange). Dit zijn eerst ideeën op papier; stemmen kosten geld en wachten op akkoord.

| # | Tester zei | Spelversie | Deel / regio | P | Release | Grootte | Opmerking |
|---|---|---|---|---|---|---|---|
| 1 | OOGTV | Radio Noordkust: verslaggever die jou live wil filmen; busje en camera | F4a Stad | P2 | F4a | M | zie 37 |
| 2 | DUO | StudieStaat: studieschuld "wissen" of kluis leegroven (satire op een instantie) | F4a Stad | P2 | F4a | M | open 6 |
| 23 | Datacenters op Zernike | Wolkenhal Zernike: bewakers, dozen; geen sabotage | F4a Stad | P3 | F4a | S | §8 verhaalplan |
| 30 | Wraak voor mijnbouwschade (NAM) | Delfstof Noord als stille zijlijn: herstelploeg helpen, dorp opvangen; wraak alleen zacht en klein | F4a Hogeland | P2 | F4a | M | besloten 2 |
| 35 | Bourtange, een missie | Slot van de finale in Vesting Bourtange | F4c Westerwolde | P1 | F4c | L | staat al als finale in het plan |
| 42 | Iets met de rechtbank | Getuige of tas afleveren bij de rechtbank | F4a Stad | P3 | F4a | S | |
| 43 | Academiegebouw, hoedjes | Promotie met toga en hoedje; plechtige optocht begeleiden of verstoren | F4a Stad | P2 | F4a | M | |
| 44 | Busmuseum, bus afleveren | Museumbus ophalen en afleveren | F4a Stad | P2 | 0.32 of F4a | M | `sidejob_bus.js` |
| 45 | Stadsschouwburg: Friese cabaret verstoren | Friese cabaretier verstoren; droge spot, geen kwaad | F4a Stad | P3 | F4a | S | |
| 47 | BOA-missie met onzinnige boetes | Je bent BOA voor een dag en deelt onzinnige boetes uit; satire op regelzucht | F4a Stad | P2 | 0.31 (basis), F4a | M | zie 18, 19 |
| 49 | Iets met Vindicat | Studentencorps "Vigilantia": borrel, tafelspeech | F4a Stad | P3 | F4a | S | open 10 |
| 57 | Xior-flat die te heet wordt | Studentenflat "Kamerkoning": verwarming kapot, flat leegruimen | F4a Stad | P3 | F4a | S | |
| 58 | Jeugdgevangenis, het poortje | Poortje bij het jeugdinstituut: droog en menselijk, geen spot met de jongeren | F4a Stad | P3 | later | S | open 5 |
| 59 | Van Mesdag-missie, meer detail locatie | "Kliniek Van der Meden": zachte missie, geen spot met patiënten | F4a Stad | P3 | later | M | open 5 |
| 61 | GemeenteOplossingen, iWink | Missie bij "Het Loket" (formulier, wachtrij, stempel) en webbureau "Wiebelwerk" | F4a Stad | P2 | F4a | S | besloten 1 |
| 62 | De Helix, verven blokkeren | Helix: verfblokkade tegen een afgesloten plein; echte plek, verzonnen actie | F4a Stad | P3 | F4a | S | |
| 72 | Niemeyer-fabriek, iets met AI | In het Niemeyer-gebouw een AI-kamer of "robotkok"; satire zonder echte bedrijven | F4a Stad | P3 | F4a | S | |
| 75 | Suikerbieten in Hoogkerk | Suikercampagne (kalender 15 sep): bieten laden, vrachtwagen | F4a Stad | P2 | F4a | M | kalender bestaat |
| 76 | Oud KPN-gebouw met raves | Raves in "het oude Telefoonhuis": geluid regelen, hek | F4a Stad | P2 | F4a | M | zie `stuntavond.js` |

## 6. Landmarks en herkenbare plekken (11)

Niveau: A = buitenkant op de plek, B = buitenkant met detail en naamkaart, C = ook binnenin, D = hoofdlocatie met missie.

| # | Tester zei | Welk gebouw of plek | Niveau | P | Release | Grootte | Opmerking |
|---|---|---|---|---|---|---|---|
| 26 | Pieterpad (Winsum) | Pieterpad: wandelroute met palen en wandelaars | B | P3 | F4a | S | echte route, geen merkborden |
| 27 | Winsum mooiste dorp | Winsum: dorpskern, kerk, brug over het Reitdiep, naamkaart met droge grap | B | P3 | F4a | S | |
| 38 | Kerken met interieur | Martinikerk, Der Aa-kerk, een dorpskerk of twee: banken, orgel, doopvont | C | P2 | 0.33 | L | nieuwe 3D-modellen |
| 39 | Genoeg iconische dingen per wijk | Zie "Landmarks per wijk" hieronder | B tot D | P1 | 0.31 (lijst), 0.32 en 0.33 (bouw) | L | |
| 67 | Meerstad | Meerstad en Woldmeer: woonwijk met meer, strand | B | P3 | 0.33 | S | |
| 69 | Euroborg | Euroborg: buitenkant, parkeerterrein, wedstrijddag | B tot C | P2 | 0.32 | M | |
| 70 | Groot tv-scherm op Bakker Bart | Scherm op "Bakker Bert" met korte grap-clips | A | P3 | 0.31 | S | |
| 71 | Prinsentuin | Prinsentuin: park met vijver, bankjes, pauwen | B | P3 | 0.31 | S | |
| 73 | Herkenbare begraafplaatsen | Noorderbegraafplaats en Zuiderbegraafplaats met poort en lanen; kalm | B | P3 | 0.33 | S | respectvol |
| 74 | Hanze namaken | Hogeschool "Noordhaven" in een Hanze-achtig gebouw | B | P2 | 0.32 | M | |
| 79 | Woeste Hoeve | Woeste Hoeve: sfeerplek met een geheim | B | P3 | F4a | S | open 7 |

### Landmarks per wijk (voorstel, te controleren op de echte plek)

| Wijk of gebied | Landmarks | Niveau |
|---|---|---|
| Binnenstad Oost (Grote Markt) | Martinitoren, Forum (binnen), Korenbeurs, Stadhuis | Forum C, rest B tot C |
| Binnenstad West (Vismarkt, Nieuwe Markt) | Vismarkt, Nieuwe Markt, Der Aa-kerk, Academiegebouw | B, Academiegebouw C |
| Kades en water | Sluisbrug en kade, Reitdiep, pannenkoekenschip | B, schip C |
| Zernike | Klimtoren, Wolkenhal, hoge torens | B |
| Noord en Hoogkerk | Suikerfabriekterrein, molen | B |
| Zuid en Euroborg | Euroborg, Kardinge, Paddepoel, het glazen netbeheerhuis | B tot C |
| Ommeland | Pieterpad, Winsum, scheve toren Bedum, Stedum, Woeste Hoeve, Bourtange | A tot D |

## 7. Events en weer (4)

| # | Tester zei | Wat | P | Release | Grootte | Afh. |
|---|---|---|---|---|---|---|
| 31 | Aardbeving als random weer-event | Kort trillen van beeld en geluid, hanglamp; stil en respectvol, alleen de schrik, geen schade of doden | P3 | F3 | S | `weather.js`; besloten 2 |
| 41 | Veel Duitsers tijdens bloemetjesmarkt | Meer toeristen met rugzak en kaart tijdens de bloemetjesmarkt (kalender 12 sep) | P2 | 0.31 | S | kalender |
| 56 | Vuurwerk tijdens Bommen Berend | Vuurwerk boven de Grote Markt rond Bommen Berend (kalender) | P2 | 0.31 | S | `fx3d.js`, kalender |
| 64 | Blauwalg in het water | Waarschuwingsbord en groene waas in zwemwater; zwemmen niet mogelijk | P3 | F3 | S | `water3d.js` |

## 8. Meta en UI (7)

| # | Tester zei | Wat | P | Release | Grootte | Bestand (waarschijnlijk) |
|---|---|---|---|---|---|---|
| 34 | Niet te veel tekst tegelijk, ook niet op laadscherm | Op laadscherm één regel per keer | P1 | 0.30.1 | S | `loadscreen.js`, `loadscreen.css` |
| 40 | Plaatsnaam naast minimap verticaal gecentreerd | Uitlijnen aan de onderrand van de minimap | P1 | 0.30.1 | S | `hud_panel.css` (`.hud-location`), `hud_panel.js` |
| 46 | Missie gelukt dubbel getoond | Eén keer tonen, banner of fullscreen | P1 | 0.30.1 | S | `cinematics.js`, `missionstory.js` |
| 48 | Verwarring over fietsen op de Grote Markt | Eenmalige hint en duidelijke markering waar fietsen mag | P1 | 0.30.1 | S | `roadaccess.js`, `hudcards.js` |
| 50 | Consistente witte, heldere knoppen | Eén knopstijl; keycaps en knoppen uit één bron | P1 | 0.30.1 | M | `hud_panel.css`, `prompts.css`, `hudcards.css`, `menu.css` |
| 51 | Instelling voor controller- of toetsenbordhints | Keuze Auto, Toetsenbord, Controller; geldt overal in de HUD | P1 | 0.30.1 | S | `settings.js`, `pausemenu.js`, `prompts.js` |
| 53 | "x meldingen in de wacht" niet tonen | Teller weghalen; wachtrij blijft | P1 | 0.30.1 | S | `hudcards.js`, `hudcards.css` |

## Quick wins voor 0.30.1 (15)

Klein en veilig, geen nieuwe wereld. Alle paden onder `game/js/`; eerst grep, dan bouwen.

| Nr | Wat | Bestand | # |
|---|---|---|---|
| 1 | "+N in de wacht" weghalen | `hudcards.js` (`syncWait`), `hudcards.css` (`.hc-wait`), `hudrules.js` (telling opruimen) | 53 |
| 2 | Plaatsnaam naast minimap onderaan uitlijnen | `hud_panel.css` (`.hud-location`, `.hud-street`, `.hud-district`), `hud_panel.js` (bij `location.innerHTML`) | 40 |
| 3 | Dubbel "missie geslaagd" tot één | `cinematics.js` (`playMissionOutro`), `missionstory.js` (`outroNow`) | 46 |
| 4 | Eén knop- en keycapstijl (wit, helder) | `hud_panel.css`, `prompts.css`, `hudcards.css`, `menu.css`, `DESIGN_SYSTEM.md` | 50 |
| 5 | Hintbron: Auto, Toetsenbord, Controller | `settings.js` (naast `showHints`), `pausemenu.js` (toggle), `prompts.js`, `input.js`, `glyphs.js` | 51 |
| 6 | Laadscherm: één tekstregel tegelijk | `loadscreen.js`, `loadscreen.css` | 34 |
| 7 | Hint en markering voor fietsen op de Grote Markt | `roadaccess.js`, `hudcards.js`, `mapfilters.js` | 48 |
| 8 | Herestraat: dichtheid van props en voetgangers begrenzen | `streetclutter.js`, `cityprops.js`, `pedestrians.js` | 4 |
| 9 | Viaducten: dek omhoog waar de doorrijhoogte te laag is (meten met `ring_probe`) | `roadstructures3d.js`, `elevation.js`, `ringcheck.js` | 7 |
| 10 | Schepen breken geen brugdekken meer | `breakables.js`, `bridgerails.js`, `boattypes.js` | 8 |
| 11 | Boetes voor mobiel in de hand en geen fietslicht 's nachts | `trafficlaw.js`, `phone.js` | 18, 19 |
| 12 | Stedum-grap als bordje en regel van Rikus | `flavourlines.js`, `funlines.js` | 36 |
| 13 | Politiepaarden laten poepen (kleine prop) | `policemounts.js`, `fx3d.js` | 3 |
| 14 | Merknamen uit speltekst, bordjes en modellen houden (grep op de tester-namen) | `*lines.js`, `streetsigns.js`, `shopmodels3d.js` | 9, 17, 29 |
| 15 | Meer fietsen in het centrum: dichtheidsfactor omhoog | `trafficfleet.js`, `parkedcars.js`, `pedestrians.js` | 33 |

## Besloten door de eigenaar (15 okt)

1. **iWink is een knipoog, geen letterlijke naam.** Een verzonnen webbureau met een herkenbare maar verzonnen naam en stijl; een grap als "het favoriete bureau van je favoriete bureau" mag. Geen echt logo, merk, kleur of echte mensen. Uitwerking: webbureau "Wiebelwerk" (#61).
2. **Wraak voor mijnbouwschade mag**, met een verzonnen bedrijf ("Delfstof Noord"), met zorg: stille, respectvolle zijlijn, geen grappen over de schade of de slachtoffers, geen schurk die "het gasbedrijf" is (#30, #31).
3. **Tessa die zich onveilig voelt bij het uitgaan mag**, als lichte sociale noot, met echte cijfers erbij zodat het klopt. Zie het blok hieronder (#77, #78).

## Nog open voor de eigenaar

4. **Herkenbare zwerver "Bernard".** Verzonnen personage met eigen naam; gelijkenis alleen in stijl (hoed, karretje), of nog lichter? (#6)
5. **Kliniek Van der Meden en het jeugdinstituut.** Weglaten, of zacht doen (geen spot met patiënten of jongeren)? (#58, #59)
6. **Studieschuld wissen.** Satire op een instantie, geen echte mensen geraakt. OK? (#2)
7. **Woeste Hoeve en andere echte plekken met een eigenaar.** Echte naam gebruiken of herdopen? (#79)
8. **Lijn voor verenigingen en gebouwen.** "Echte plaats mag, echt bedrijf of vereniging niet": Vigilantia, Telefoonhuis, Noordhaven. Akkoord?
9. **Kersenbloesem in een zomerspel.** Roze bomen als sierboom, of alleen als geheimpje? (#10)
10. **Ontgroeningsparodie en ontsnapping uit een inrichting (#49, #59).** Toon en grens bepalen voor F4a.
11. **Prioriteit.** Mogen de Meta- en UX-punten voor alles gaan, zodat 0.30.1 klein blijft?
12. **Berovingen (#77).** Alleen geldverlies zonder geweld tegen de speler, en een waarschuwing op de kaart?

## Tessa en onveilig uitgaan: feitenblok en ontwerp (#77, #78)

### Feitenblok (alleen controleerbare cijfers; hier offline niet geverifieerd)

Ik heb geen internet gebruikt en noem daarom geen getallen. Te controleren voor de definitieve tekst, met bron en jaar in de speltekst:

| Onderwerp | Bron om te controleren | Stand |
|---|---|---|
| Aandeel vrouwen dat zich weleens onveilig voelt in het uitgaansleven of de openbare ruimte | CBS, Veiligheidsmonitor (nieuwste jaar) | cijfer te verifiëren |
| Aandeel vrouwen dat in het afgelopen jaar op straat is lastiggevallen (nafluiten, nariepen, achtervolgen) | CBS Veiligheidsmonitor, rapport over seksuele intimidatie of Politie en Ministerie van Justitie en Veiligheid | cijfer te verifiëren |
| Verschil tussen vrouwen en mannen, en tussen jongere en oudere vrouwen | zelfde monitor, uitsplitsing naar geslacht en leeftijd | cijfer te verifiëren |
| Aantal aangiften van seksuele intimidatie | Politie, jaarcijfers | cijfer te verifiëren |

Regel: de speltekst noemt dan één getal met bron en jaar ("Volgens het CBS ..., 20xx"), niet meer. Zolang het niet geverifieerd is blijft het getal uit het spel en zegt de regel alleen "Veel vrouwen kennen dit gevoel; het CBS meet het elk jaar."

### Ontwerp in het spel

- **Scene (F4a, Stad, nacht):** kort en overslaanbaar (hold-to-skip). Tessa loopt tussen twee uitgaansplekken; twee mannen roepen naar haar en lopen een stuk achter haar aan. Geen beeld van aanraking, geen geweld. Tammo (of jij) kiest: tussen komen met een droge zin, of rustig naast haar komen lopen. Beide keuzes zijn goed; Tessa is nergens "gered", ze beslist zelf.
- **Systeem:** een zachte "Tessa-comfortmeter" op nachten dat ze meegaat. Hoog als je dichtbij blijft, een taxi regelt of de route via drukke straten kiest; daalt bij donkere stegen. Effect: ze praat meer en geeft tips bij hoge meter; bij lage meter wil ze naar huis (korte tijd, geen straf). Geen game over.
- **Toon:** serieus, niet grappig, nooit expliciet. Tessa is de enige die het tempo bepaalt.
- **Slotregel:** één feit als Kiekdoar-nieuwsbericht of laadschermregel (bron en jaar genoemd, zodra het cijfer geverifieerd is).
- **Release:** hoort bij F4a, nachtstreek (`deel4-f4a.md` §8). De berovingskans in wijken (#77) komt eerder, 0.31, en is een apart, klein systeem.

## Telling per categorie

| Categorie | Aantal |
|---|---|
| Bug en UX-fix | 3 |
| World-fidelity | 8 |
| Open-wereldleven | 19 |
| Minigame | 8 |
| Missie, zijmissie, verhaalhaak | 19 |
| Landmark en iconisch | 11 |
| Event en weer | 4 |
| Meta en UI | 7 |
| **Totaal** | **79** |

Dubbel met bestaand backlog (samengevoegd): 7, 8, 11, 20, 28, 32, 33, 55 (0.31); 14, 52 (F3, veerboten); 35 (F4c-finale); 25, 36 (herkenningspunten Deel 4); 23 (Wolkenhal, `PROVINCIE-VERHAAL.md` §8); 41, 56, 75 (spelkalender); 12, 17, 22 (bestaande bijbanen).

## Besluiten van de eigenaar (15 okt 2026)

- **Bernard:** een verzonnen lookalike, geen echte persoon.
- **Jeugdgevangenis en studieschuld-satire:** blijven erin, in de bestaande lichte toon.
- **Beroofd worden in bepaalde wijken** (de "rooftochten"): de eigenaar liet de invulling aan ons over. Besluit: een overval kost alleen een deel van je geld, zonder geweld in beeld. Gevaarlijke wijken krijgen 's avonds en 's nachts een waarschuwing op de kaart. Je krijgt het geld terug door de dader te achtervolgen.
- **Roze kersenbloesem:** blijft, ook in een zomerspel.
- **Kleine bedieningsfixes:** eerst in 0.30.1 voor zover we komen; de rest schuift door.
- **Eerder besloten:** iWink als knipoog (Wiebelwerk), mijnbouwschade met een verzonnen bedrijf en met zorg, Tessa met voorzichtig sociaal commentaar en geverifieerde cijfers.
