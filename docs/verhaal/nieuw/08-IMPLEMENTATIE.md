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
| `game/js/calendar.js` `STEP_DATES` | nieuwe dagen per stap (zie 00-OVERZICHT §Kalender); `DEEL4_STEP_DAYS` botst: Deel 4 begint 15 september met een andere plot (open vraag 1) | bestaat; aanpassen |
| `calendar.js` `SPECIAL_DAYS` | nieuwe: Oldambt-kermis (za 22 - zo 23), Beleg van Bourtange (di 25). **De bestaande `oldambtkermis` staat nu op di 29 september (Deel 4, `open: false`)** | uitbreiden |
| `scripts/calendar_test.mjs` | bijwerken voor de nieuwe data | bestaat |
| `game/js/missions.js` defs | zie §2 | bestaat |
| `game/js/missionstory.js` | alle scènes (`playStoryIntro`, `playStoryOutro`, `playStoryFail`) voor de nieuwe teksten | bestaat |
| `storycast.js` | uiterlijk van Geesje, Lammert, Roelfien, Wubbo, Tinus (en Mem/Oma in de kruitkelder) | bestaat; uitbreiden (`MEM_LOOK` bestaat) |
| `game/js/banterlines.js`, `banter.js` | de autogesprekspools per akte (`[B1]`-`[B5]` in `09`) | bestaat; vervangen/uitbreiden |
| `game/js/subtitles.js` | `FY` voor Friese regels van Jelle en Mem; `GRO` voor Groningse regels | bestaat |
| `game/js/phonefeed.js`, `phone.js`, `smsvoice.js` | **appjes worden niet meer voorgelezen** (nu leest `phonefeed.js` elke notificatiekaart voor): een vlag `silent` op story-appjes | bestaat; wijzigen |
| `game/js/radio.js`, `radiostudio.js`, `audio.js` | radio alleen wereld, en dimt bij missie- of gesprekstart: AANNAME dat `audio.js` een duck-mechaniek heeft (grep op "duck" vond het in `audio.js`, `speech.js`; gedrag niet gecontroleerd) | bestaat; koppelen |
| `game/js/todoui.js`, `verhaalui.js` | het **plakjesbord** (acht plakjes, per plakje gewonnen/verloren) in "Wat weten we?" | nieuw (klein) |
| `game/js/heist.js` | `UI.showNote('Tige tank! – J.')` (rond regel 1145) wordt W; `missions.js:321` ook (`['A', '"Tige tank! – J."'...`); `missionstory.js:439` (de klomp) blijft J | bestaat; wijzigen |

## 2. Per hoofdmissie: wat verandert en wat wordt hergebruikt

| Nr | Missie | Bestaande def / mechaniek | Wat verandert | Nieuw? |
|---|---|---|---|---|
| M01 | Berend | `missions.js` def `berend` (`deliver`) | 3 nieuwe contextregels in intro/outro | nee |
| M02 | Even pinnen | def `pinautomaat` (`stages`, `escape`) | idem | nee |
| M03 | Grote Markt | def `chaos` (`stunt`, `stuntavond.js`) | idem | nee |
| M04 | Het Loket | nieuw, op `sidejob_rechtbank.js`, `sidejobkit.js` (balie, wachtnummer) | nieuwe def en nieuw gebouw "Het Loket" (AANNAME: bestaand gebouw bij de Grote Markt kiezen; `marktgebouwen.js`, `landmarkkit.js`) | ja, klein-M |
| M05 | Kieken van boven | def `duifverkenning` (`pigeon`) | geen | nee |
| M06 | Wind tegen | def `kei` (`checkpoint`, `keiroute.js`) | een nieuwe regel (het besluit) | nee |
| M07 | Het museum | def `museumkraak` (`heist.js`, `museum3d.js`) | kaartje J naar W (zie §1), `k-kraakspullen` en `k-nacht` opgaan in de intro | nee |
| M08 | Het vet | def `vetgekaapt` (`chase`, `Tankwagen Us Mem Vet`) | niets in coördinaten, nieuwe openingsscène | nee |
| M09 | Fatbikes en Oma | def `fatbike` | nieuwe scène: lijstje en recept | nee |
| M10 | Eieren (Hogeland) | `deliver` met `TRACTOR_MODEL` (`vehicle.js`); def nieuw | breekbare lading: eieren als teller; routes via wierdepaden (`countryside.js`, `countryplan.js`) | ja, klein |
| M11 | Trekker-limo op de wierde | `escape`-stage; `QUAD_MODEL` en `trekkerlimo` bestaan; `fierljep.js` voor de animatie | nieuwe def en route | ja, klein-M |
| M12 | Skûtsje | def `skutsje` (`boatchase`, `animateSkutsjeRig`, `rubberboot`) | start en route naar Zoutkamp en het Reitdiep; **water in de tegelwereld nodig** (`tilewatermask.js`, `waterindex.js`, `water3d.js`) | nee (def), **ja (water)** |
| M13 | Laag water | boot door ondiep water (`waterlevels.js` `shallowWater`); te voet met timer | nieuwe def; nieuwe kleine "opkomend water"-timer | ja, M |
| M14 | Rooster (heli) | def `traumaduif` (`helirun.js`, `heliplan.js` autopilot) | nieuwe startpad (Lauwersoog) en route naar de Dollard; ballon en koffer als props (`skyprops.js`) | nee (def), ja (route) |
| M15 | Containerlabyrint | `heist.js` stages (camera's, bewakers, zekering, `plan`) | nieuwe def; een kraankooi als interactiepunt | ja, M |
| M16 | De dijk | `racers.js`, `createRace`; structuur van `RING_ROUTE` | nieuwe routedata langs de dijk (AANNAME: uit de wegen te trekken met `ringroute.js` en `scripts/gen_ringroute.py`) | ja, M |
| M17 | Nog eentje dan | def `kroegentocht` (`checkpoint`, `CROWD_SIZE`, `playToast`) | vier kermistenten in Winschoten in plaats van kroegen | nee (def), ja (locaties) |
| M18 | Laag over het graan | **nieuw voertuig: klein vliegtuig** (geen vliegtuigmodus gevonden; AANNAME) of heli-fallback (`heliflight.js`) | nieuwe vliegtuigmodus of dezelfde missie in de heli | ja, **L** (of S bij heli) |
| M19 | Botsauto's en kus | `kermis.js` (botsauto's met Durk en Douwe, `{ type: 'kermis' }`) | een tweede kermis in Winschoten, plus de dijkscène | ja, S |
| M20 | Open, dicht | `pg_bruggenrace.js`, `movablebridges.js` | nieuwe def met Wubbo | ja, S-M |
| M21 | Wie is W.? | `heist.js` (`updateLock`), `choicepanel.js` | nieuwe def en gebouw (Wiebelwerk) | ja, M |
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
| Water in de tegelwereld bij Zoutkamp/Reitdiep/Lauwersmeer | M-L (risico) | `tilewatermask.js`, `waterindex.js`, `water3d.js` |
| Opkomend-water timer op het wad | S-M | `waterlevels.js` |
| Vliegtuigmodus | L | `heliflight.js` (basis), `skyprops.js` |
| Lopen op een rijdende trein | M-L | `railway.js`, `traindrive.js` |
| Containerkraankooi | S | `heist.js` |
| Dijkroute (race) | M | `racers.js`, `ringroute.js` |
| Trekkerprofiel (trekkertrek en colonne) | S-M | `racers.js`, `vehicle.js` |
| Colonne-AI (meerijden van bondgenoten) | M-L | `racers.js`, `trafficfleet.js` |
| Vesting Bourtange als wereldplek met kruitkelder | M-L | `landmarkkit.js`, `museumplan.js` als sjabloon |

## 4. Volgorde van bouwen

1. **Tekst zonder gameplay** (laagste risico): nieuwe leads en scènes voor M01-M09, plus de aanpassing J naar W. Datums in `STEP_DATES`. Geen opnames nodig om het te testen (de tekstkaarten werken zonder stem; AANNAME).
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
| **Water in de tegelwereld** | Reitdiep, Lauwersmeer en wad ontbreken misschien in de tiles (FLOW-ANALYSE noemt het) | eerst een bestaande water-check (`scripts/province_water_audit.mjs`); anders M12 en M13 vervangen door de rubberboot op bestaand water of een scène |
| **Vliegtuig** | geen bestaande vliegtuigmodus gevonden | M18 als heli-missie bouwen; vliegtuig later |
| **Trein-lopen** | een gebied waar de physics vol onzekerheid zit | alleen de scène in M22 en Tammo als machinist |
| **Afstanden** | ruim 460 km reisafstand over alle akten (schatting) | elke reisbeat kent trein, bus, heli of skip; "Overal en nergens"-sprong van #97 |
| **Eén rol, drie versies** | Tessa's "Groningse vrouw" in de bestaande stem (zie `docs/personages.md`) botst met "Nederlands" in nieuwe regels | open vraag 3; de TTS-tag aanpassen, niet de stem |
| **Stemkosten** | 707 nieuwe regels | zie `07-TTS-RAMING.md` |
| **Gevoelig** | Delfstof Noord (alleen zijlijn), Ter Apel (geen decor), de CBS-regel (één getal met bron) | AGENTS.md constitutie 6; het gebruik van die zijlijnen alleen na akkoord |
| **Echte personen** | de opdracht noemde als voorbeeldspreker de naam "WOPKE" (een echte persoon); die is **niet gebruikt**. De "W." op het kaartje betekent "Wij" | blijf bij verzonnen namen in speltekst en bij de naam NatusPella in de credits |
| **Veel tegelijk in één missie** | M24 (siege, fierljep, onthulling, ruzie, Jelle) is te vol | splits in twee missies als de speelduur boven 15 minuten komt |

## 6. Tests en controles die nu al kunnen

- `node scripts/calendar_test.mjs` na het aanpassen van `STEP_DATES`.
- `node scripts/voice_coverage.mjs --quiet` na toevoeging van tekst: toont de ontbrekende opnames.
- `node scripts/province_test.mjs`, `scripts/province_water_audit.mjs` voor de regio-plekken en het water.
- Een Electron-verhaaltest (`--story-test=<dir>`) vóór de release; NaN-waarschuwingen laten de test falen (AGENTS.md).
- Alles wat niet in beeld is gezien staat in het issue als "nog niet bekeken".
