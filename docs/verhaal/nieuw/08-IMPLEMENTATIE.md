# 08 · Implementatie (alleen voor een latere bouwronde)

Hoort bij [00-OVERZICHT.md](00-OVERZICHT.md). Er is geen code aangepast. Alles hieronder is gelezen uit `game/js` op `main` van 17 oktober 2026 of gelabeld **AANNAME** (niet geverifieerd). Volgens AGENTS.md: werk in een eigen worktree en branch, kleine commits, geen push of merge door agents; vóór elke merge `node --check`, `node scripts/voice_coverage.mjs --quiet` en alle `scripts/*_test.mjs`; vóór een release één Electron-verhaaltest.

## 1. Waar de wijzigingen vallen

| Plek | Wat verandert | Bestaand of nieuw |
|---|---|---|
| `game/js/storyarc.js` `STEPS` | volgorde en `id`'s: de 30 hoofdmissies als stappen; `part` wordt van 3 naar 5 akten | bestaat; uitbreiden |
| `storyarc.js` `PARTS` | `kop/romp/staart` blijven intern (saves); er komen twee extra delen of de titels/data veranderen (AANNAME: de ids blijven, alleen `title`, `name`, `date`, recaps veranderen; twee nieuwe ids voor akte 4 en 5) | bestaat; uitbreiden |
| `storyarc.js` `MISSION_IDS` | **alleen achteraan toevoegen**: indices staan in saves en medailles; de nieuwe missies krijgen nieuwe `mission`-id's (`loket`, `wierde`, `laagwater`, `containers`, `dijk`, `graan`, `bruggen`, `wiebelwerk`, `stoom`, `vestingbus`, `beleg`, `luik`, `colonne`, `eieren`) | bestaat; toevoegen |
| `storyarc.js` `RETIRED_STEPS` | `r-avond`, `s-boot`, `s-proefvlucht`, `s-carbid`, `s-padel`, `k-fiets`, `H7`, `H9`, `H13` gaan op `RETIRED_STEPS` of blijven als optionele klus; saves laten ze vallen (`story.js` `applyStorySave`) | bestaat |
| `storyarc.js` `SPEAKERS`, `CHARACTERS` | nieuwe sprekers en naamkaarten: Geesje, Lammert, Roelfien, Wubbo, Tinus; `Boer Roelf` en `Hilje` vervallen | bestaat; uitbreiden |
| `storyarc.js` `HIDEOUTS` | de drie keuzes van `r-trein` worden de treinscène in de reisbeat "Winsum" (alleen scène) | hergebruik |
| `game/js/calendar.js` `STEP_DATES` | nieuwe dagen per stap (zie 00-OVERZICHT §Kalender); de kalender van dit verhaal is leidend; `DEEL4_STEP_DAYS` hoort niet bij dit verhaal en mag blijven staan of bewust weg | bestaat; aanpassen |
| `calendar.js` `SPECIAL_DAYS` | nieuwe: Oldambt-kermis (za 22 - zo 23), Beleg van Bourtange (di 25). **De bestaande `oldambtkermis` staat nu op di 29 september (`open: false`)** en wordt verplaatst naar za 22 - zo 23 augustus | uitbreiden |
| `scripts/calendar_test.mjs` | bijwerken voor de nieuwe data | bestaat |
| `game/js/missions.js` defs | zie §2 | bestaat |
| `game/js/missionstory.js` | alle scènes (`playStoryIntro`, `playStoryOutro`, `playStoryFail`) voor de nieuwe teksten | bestaat |
| `storycast.js` | uiterlijk van Geesje, Lammert, Roelfien, Wubbo, Tinus (en Mem/Oma in de kruitkelder) | bestaat; uitbreiden (`MEM_LOOK` bestaat) |
| `game/js/banterlines.js`, `banter.js` | de autogesprekspools per akte (`[B1]`-`[B5]` in `09`) | bestaat; vervangen/uitbreiden |
| `game/js/subtitles.js` | `FY` voor Friese regels van Jelle en Mem; `GRO` voor Groningse regels | bestaat |
| `game/js/phonefeed.js`, `phone.js`, `smsvoice.js` | **appjes worden niet meer voorgelezen** (nu leest `phonefeed.js` elke notificatiekaart voor): een vlag `silent` op story-appjes | bestaat; wijzigen |
| `game/js/radio.js`, `radiostudio.js`, `audio.js` | radio alleen wereld, en dimt bij missie- of gesprekstart: AANNAME dat `audio.js` een duck-mechaniek heeft (grep op "duck" vond het in `audio.js`, `speech.js`; gedrag niet gecontroleerd) | bestaat; koppelen |
| `game/js/todoui.js`, `verhaalui.js` | het **plakjesbord** (acht plakjes, per plakje gewonnen/verloren) in "Wat weten we?" | nieuw (klein) |
| `game/js/heist.js` | `UI.showNote('Tige tank! – J.')` (rond regel 1145), `missions.js:321` en `missionstory.js:439` (de klomp) **blijven ongewijzigd**: het kaartje is en blijft "Tige tank! – J." | bestaat; wijzigen |

## 2. Per hoofdmissie: wat verandert en wat wordt hergebruikt

| Nr | Missie | Bestaande def / mechaniek | Wat verandert | Nieuw? |
|---|---|---|---|---|
| M01 | Berend | `missions.js` def `berend` (`deliver`) | 3 nieuwe contextregels in intro/outro | nee |
| M02 | Even pinnen | def `pinautomaat` (`stages`, `escape`) | idem | nee |
| M03 | Grote Markt | def `chaos` (`stunt`, `stuntavond.js`) | idem | nee |
| M04 | Het Loket | nieuw, op `sidejob_rechtbank.js`, `sidejobkit.js` (balie, wachtnummer) | nieuwe def en nieuw gebouw "Het Loket" (AANNAME: bestaand gebouw bij de Grote Markt kiezen; `marktgebouwen.js`, `landmarkkit.js`) | ja, klein-M |
| M05 | Kieken van boven | def `duifverkenning` (`pigeon`) | geen | nee |
| M06 | Wind tegen | def `kei` (`checkpoint`, `keiroute.js`) | een nieuwe regel (het besluit) | nee |
| M07 | Het museum | def `museumkraak` (`heist.js`, `museum3d.js`) | kaartje blijft J (geen codewijziging), alleen Jelles radioregel over artikel 4 is tekst; `k-kraakspullen` en `k-nacht` opgaan in de intro | nee |
| M08 | Het vet | def `vetgekaapt` (`chase`, `Tankwagen Us Mem Vet`) | niets in coördinaten, nieuwe openingsscène | nee |
| M09 | Fatbikes en Oma | def `fatbike` | nieuwe scène: lijstje en recept | nee |
| M10 | Eieren (Hogeland) | `deliver` met `TRACTOR_MODEL` (`vehicle.js`); def nieuw | breekbare lading: eieren als teller; routes via wierdepaden (`countryside.js`, `countryplan.js`) | ja, klein |
| M11 | Trekker-limo op de wierde | `escape`-stage; `QUAD_MODEL` en `trekkerlimo` bestaan; `fierljep.js` voor de animatie | nieuwe def en route | ja, klein-M |
| M12 | Skûtsje | def `skutsje` (`boatchase`, `animateSkutsjeRig`, `rubberboot`) | start en route naar Zoutkamp en het Reitdiep; **zichtbare zee en vaarbaar Reitdiep/Lauwersmeer-monding nodig** (`tilewatermask.js`, `waterindex.js`, `water3d.js`); de achtervolging eindigt bij de sluis van Lauwersoog | nee (def), **ja (water)** |
| M13 | Laag water | boot door ondiep water (`waterlevels.js` `shallowWater`); te voet met timer | nieuwe def: sloep tot de zandplaat (beperkt vaarwater), daarna te voet langs de kwelder met een kleine "opkomend water"-timer; de open zee is alleen te zien | ja, M |
| M14 | Rooster (heli) | def `traumaduif` (`helirun.js`, `heliplan.js` autopilot) | spawn: heli op het UMCG-dak (pad `umcg`, bestaat), autopilot naar Lauwersoog; daarna route naar de Dollard; ballon en koffer als props (`skyprops.js`) | nee (def), ja (route) |
| M15 | Containerlabyrint | `heist.js` stages (camera's, bewakers, zekering, `plan`) | nieuwe def; een kraankooi als interactiepunt | ja, M |
| M16 | De dijk | `racers.js`, `createRace`; structuur van `RING_ROUTE` | nieuwe routedata langs de dijk (AANNAME: uit de wegen te trekken met `ringroute.js` en `scripts/gen_ringroute.py`) | ja, M |
| M17 | Nog eentje dan | def `kroegentocht` (`checkpoint`, `CROWD_SIZE`, `playToast`) | vier kermistenten in Winschoten in plaats van kroegen | nee (def), ja (locaties) |
| M18 | Laag over het graan | **nieuw voertuig: klein vliegtuig** (nieuwe vliegtuigmodus; geen bestaande gevonden), spawn op een echte strook in het Oldambt | nieuwe vliegtuigmodus, zie §3b; heli-fallback (`heliflight.js`) alleen als de modus niet af is | ja, **L** (of S bij heli) |
| M19 | Botsauto's en kus | `kermis.js` (botsauto's met Durk en Douwe, `{ type: 'kermis' }`) | een tweede kermis in Winschoten, plus de dijkscène | ja, S |
| M20 | Open, dicht | `pg_bruggenrace.js`, `movablebridges.js` | nieuwe def met Wubbo | ja, S-M |
| M21 | Wie draaide de camera's uit? | `heist.js` (`updateLock`), `choicepanel.js` | nieuwe def en gebouw (Wiebelwerk) | ja, M |
| M22 | Stoom | `traindrive.js`, `fjordtrain.js`, `railway.js` | Tammo als machinist; Tessa door de wagons (AANNAME: lopen op een rijdende trein vraagt code) | ja, **L** (of S: alleen scène) |
| M23 | Vestingbus | `sidejob_bus.js`, `BUS_MODELS` | nieuwe def met Berends passagiers | ja, S |
| M24 | Het beleg | `hold`/`blast`-stages, `fierljep.js`, kruitkelderscène | nieuwe def en de **Vesting Bourtange** als wereldplek (AANNAME: Bourtange zit al in de provincietegels; levering van de plek controleren, `landmarkkit.js`) | ja, **L** |
| M25 | Rode auto | def `fjord` (`fjordtrain.js`, `solo`) | overweg naar het Westerkwartier; Berends bakkie als ride-along | nee (def), ja (route) |
| M26 | Een luik erin | `garages.js`, `garageui.js` (`garage`-stage); trekkertrek-proef | nieuwe def; trekkerprofiel in `racers.js` | ja, M |
| M27 | Colonne | `chase` omgekeerd (leider volgen) | nieuwe def; meerdere bondgenoten als AI-voertuigen (`racers.js`, `trafficfleet.js`) | ja, M-L |
| M28 | Vlag | def `vlag` (`pigeon`, `storyprops3d.js`) | alleen plaats in de volgorde | nee |
| M29 | Het bod | def `bod` + bakken uit `pg_foodtruck.js` | oefenronde in Oma's keuken; bod als scène | ja, S |
| M30 | Ontzet | def `ontzet` | nieuwe openingsscène en regels, "plakjes terug" | nee |

## 3. Nieuwe kleine features, met maat

| Feature | Maat | Waar |
|---|---|---|
| Plakjesbord in "Wat weten we?" (acht plakjes) | S | `todoui.js`, `verhaalui.js` |
| Appjes zonder stem (`silent`) | S | `phonefeed.js`, `smsvoice.js` |
| Radio dimt bij missie en gesprek | S (als duck bestaat) | `audio.js`, `radio.js` |
| Het Loket (gebouw, bijbaan) | M | `sidejob_rechtbank.js`, `marktgebouwen.js` |
| **Zee zichtbaar op de kaart en in de wereld** (Waddenzee, Noordzee, kust, kwelder; vereiste) | M | `tilewatermask.js`, `waterindex.js`, `water3d.js`, `mapview.js` |
| Beperkt bevaarbaar water: Reitdiep, monding Lauwersmeer, havens; scènes voor "hier kun je niet verder" (sluis, zandbank, Klaas weigert) | M (risico) | `waterlevels.js`, `boattypes.js`, `missions.js` |
| Opkomend-water timer op het wad | S-M | `waterlevels.js` |
| **Vliegtuigmodus (nieuw voertuig)** | L | `heliflight.js` (basis), `skyprops.js`; werklijst in §3b |
| Lopen op een rijdende trein | M-L | `railway.js`, `traindrive.js` |
| Containerkraankooi | S | `heist.js` |
| Dijkroute (race) | M | `racers.js`, `ringroute.js` |
| Trekkerprofiel (trekkertrek en colonne) | S-M | `racers.js`, `vehicle.js` |
| Colonne-AI (meerijden van bondgenoten) | M-L | `racers.js`, `trafficfleet.js` |
| Vesting Bourtange als wereldplek met kruitkelder | M-L | `landmarkkit.js`, `museumplan.js` als sjabloon |

## 3b. Luchtvaartuigen: spawnregel, spawnpunten en werk voor de vliegtuigmodus

**Spawnregel (besluit van de eigenaar).** Helikopters spawnen op echte helipads, kleine vliegtuigen alleen op echte vliegvelden of -stroken in de Ommeland (de provincie buiten de stad). Beide mogen overal in de provincie vliegen. Er wordt geen vliegveld verzonnen: in de stad staat dus geen vliegtuig. Een missie mag buiten de stad een heli gebruiken en andersom.

| Type | Spawnpunt | Echt? | Bron / status |
|---|---|---|---|
| heli | UMCG-dakhelipad ("Universitair Medisch Centrum Heliport") | ja | OSM way 400026615 in `data/helipads_raw.json`; geregistreerd als `umcg` in `heliflight.js`; opgehaald met `scripts/add_helipad.py` |
| heli | Rotor Roelfs pad op Groningen Airport Eelde | gedeeltelijk: het vliegveld is echt, het pad is een spelpad (verzonnen verkoper) | `helipadById('eelde')`, `shops.js`, `helirun.js`; ligging op het echte terrein: AANNAME, controleren |
| heli | het dak van het eigen huis | nee, spelpad | `home.js`, id `home`; alleen voor de eigen heli |
| heli | Martini Ziekenhuis (dak) | AANNAME: niet in de repo | `scripts/add_helipad.py` zocht alleen in de stadsbbox; eerst controleren in OSM (`aeroway=helipad`), pas dan gebruiken |
| heli | Eemshaven / offshorebasis | AANNAME: niet in de repo | controleren in OSM (`aeroway=helipad` of `heliport`) over de hele provincie-bbox |
| vliegtuig | Groningen Airport Eelde | ja, het vliegveld bestaat | geen `aeroway`-data in de repo gevonden; AANNAME, ophalen uit OSM (`aeroway=aerodrome`) |
| vliegtuig | vliegveld Oostwold (Oldambt) voor M18 | AANNAME: ik meen dat het bestaat, niet gecontroleerd | controleren in OSM; bestaat het niet, kies een andere echte strook |
| vliegtuig | 1-2 andere echte stroken in de Ommeland | AANNAME | OSM-query `aeroway=aerodrome` of `airstrip` over de provincie; alleen echte gebruiken |
| vliegtuig | in de stad | geen | er is geen echt vliegveld in de stad, dus geen vliegtuig-spawn |

**Wat de vliegtuigmodus kost (nieuw voertuig, maat L).**
1. Vliegmodel met vaste vleugels (voortstuwing, lift, overtrek, minimale snelheid) naast `heliflight.js`; geen zweven of verticaal opstijgen.
2. Opstijgen en landen op een strook (taxi, rotatie, landing); een plek om te wachten en te parkeren.
3. Een register van strooklocaties zoals `registerHelipad`, met naam, ligging, richting en lengte.
4. Een 3D-model en animatie (propeller), geluid, camera en HUD (snelheid, hoogte, overtrek).
5. Missiestage `plane`: poortcorridor, spandoek slepen en oppikken (`waymarkers3d.js`), falen bij te hoog of te laag.
6. Luchtruimregels (plafond rond Eelde, zoals de heli nu 125 m heeft) en botsingen met molens en hoogspanning.
7. Opslag: voertuig-id en spawnpunt, zonder bestaande saves te breken.

## 4. Volgorde van bouwen

1. **Tekst zonder gameplay** (laagste risico): nieuwe leads en scènes voor M01-M09, plus de nieuwe Mem-scène (de J) in M24. Datums in `STEP_DATES`. Geen opnames nodig om het te testen (de tekstkaarten werken zonder stem; AANNAME).
2. **Wereldplekken en reizen:** reisbeats (`stationtravel.js`, bus, heli-autopilot), Het Loket, Wiebelwerk, Bourtange.
3. **Bestaande defs verplaatsen:** M08, M09, M12, M14, M17, M25, M28, M29, M30 met nieuwe start/doelcoördinaten (geen nieuwe mechaniek).
4. **Nieuwe defs op bestaande mechaniek:** M10, M11, M15, M16, M19, M20, M21, M23, M26.
5. **Zware nieuwe features (laatst):** vliegtuig (M18), trein-lopen (M22), colonne-AI (M27), beleg (M24).
6. **Kwaliteit:** `scripts/storytest.js`-achtige verhaaltest (AANNAME: `game/js/storytest.js` is de driver; scriptnaam controleren), nieuwe save-fixtures voor de oude stappen (`savemigrate.js`), `node scripts/voice_coverage.mjs --quiet`.
7. **Stemmen** pas daarna, na akkoord van de eigenaar.

## 5. Risico's

| Risico | Wat | Wat helpt |
|---|---|---|
| **Saves breken** | stappen verdwijnen of krijgen een andere volgorde; `MISSION_IDS`-indices staan in saves | alleen toevoegen aan `MISSION_IDS`; oude stappen via `RETIRED_STEPS`; migratietest |
| **Zee en water in de tegelwereld** | Waddenzee en Noordzee moeten op de kaart en in de wereld te zien zijn (eis van de eigenaar); Reitdiep en Lauwersmeer-monding ontbreken misschien (FLOW-ANALYSE) | eerst `scripts/province_water_audit.mjs`; de zee hoeft niet vaarbaar, alleen zichtbaar; de vaarstukken blijven beperkt tot Reitdiep, monding en havens; waar je niet verder kunt, een scène in plaats van een muur |
| **Vliegtuig** | geen bestaande vliegtuigmodus gevonden; geen echte vliegvelddata in de repo | M18 als heli-missie vanaf een Ommeland-helipad bouwen; vliegtuig later; eerst de strook-controle uit §3b |
| **Trein-lopen** | een gebied waar de physics vol onzekerheid zit | alleen de scène in M22 en Tammo als machinist |
| **Afstanden** | ruim 460 km reisafstand over alle akten (schatting) | elke reisbeat kent trein, bus, heli of skip; "Overal en nergens"-sprong van #97 |
| **Eén rol, drie versies** | Tessa's "Groningse vrouw" in de bestaande stem (zie `docs/personages.md`) botst met "Nederlands" in nieuwe regels | besluit van de eigenaar: Tessa is Nederlands; nieuwe regels in standaard Nederlands, opgenomen regels blijven (de stem blijft) |
| **Stemkosten** | 707 nieuwe regels | zie `07-TTS-RAMING.md` |
| **Gevoelig** | Delfstof Noord (alleen zijlijn), Ter Apel (geen decor), de CBS-regel (één getal met bron) | AGENTS.md constitutie 6; het gebruik van die zijlijnen alleen na akkoord |
| **Echte personen** | de opdracht noemde als voorbeeldspreker de naam "WOPKE" (een echte persoon); die is **niet gebruikt**. Het kaartje blijft "J." (Mems J) | blijf bij verzonnen namen in speltekst en bij de naam NatusPella in de credits |
| **Veel tegelijk in één missie** | M24 (siege, fierljep, onthulling, ruzie, Jelle) is te vol | splits in twee missies als de speelduur boven 15 minuten komt |

## 6. Tests en controles die nu al kunnen

- `node scripts/calendar_test.mjs` na het aanpassen van `STEP_DATES`.
- `node scripts/voice_coverage.mjs --quiet` na toevoeging van tekst: toont de ontbrekende opnames.
- `node scripts/province_test.mjs`, `scripts/province_water_audit.mjs` voor de regio-plekken en het water.
- Een Electron-verhaaltest (`--story-test=<dir>`) vóór de release; NaN-waarschuwingen laten de test falen (AGENTS.md).
- Alles wat niet in beeld is gezien staat in het issue als "nog niet bekeken".
