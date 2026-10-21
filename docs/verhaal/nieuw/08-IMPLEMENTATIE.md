# 08 · Implementatie (alleen voor een latere bouwronde)

Hoort bij [00-OVERZICHT.md](00-OVERZICHT.md). Er is geen code aangepast. Alles hieronder is gelezen uit `game/js` op `main` van 17 oktober 2026 of gelabeld **AANNAME** (niet geverifieerd). Volgens AGENTS.md: werk in een eigen worktree en branch, kleine commits, geen push of merge door agents; vóór elke merge `node --check`, `node scripts/voice_coverage.mjs --quiet` en alle `scripts/*_test.mjs`; vóór een release één Electron-verhaaltest.

## 1. Waar de wijzigingen vallen

| Plek | Wat verandert | Bestaand of nieuw |
|---|---|---|
| `game/js/storyarc.js` `STEPS` | volgorde en `id`'s: de 26 hoofdmissies als stappen; `part` wordt van 3 naar 5 akten | bestaat; uitbreiden |
| `storyarc.js` `PARTS` | `kop/romp/staart` blijven intern (saves); er komen twee extra delen of de titels/data veranderen (AANNAME: de ids blijven, alleen `title`, `name`, `date`, recaps veranderen; twee nieuwe ids voor akte 4 en 5) | bestaat; uitbreiden |
| `storyarc.js` `MISSION_IDS` | **alleen achteraan toevoegen**: indices staan in saves en medailles; de nieuwe missies krijgen nieuwe `mission`-id's (`loket`, `wierde`, `containers`, `dijk`, `graan`, `bruggen`, `wiebelwerk`, `stoom`, `beleg`, `luik`, `colonne`, `eieren`). De samengevoegde missies hergebruiken bestaande id's: M01 `berend` (met de `chaos`-stunt als eerste stage), M11 `skutsje` (met het zout als tweede deel), M16 `kroegentocht` (met de `kermis`-botsauto's als tweede deel). **Vervallen ten opzichte van het vorige voorstel:** `laagwater` (zit in M11) en `vestingbus` (M23 is een reisbeat) | bestaat; toevoegen |
| `storyarc.js` `RETIRED_STEPS` | `r-avond`, `s-boot`, `s-proefvlucht`, `s-carbid`, `s-padel`, `k-fiets`, `H7`, `H9`, `H13`, en de stap `H3` (`chaos`, nu in M01) gaan op `RETIRED_STEPS` of blijven als optionele klus; saves laten ze vallen (`story.js` `applyStorySave`) | bestaat |
| `storyarc.js` `SPEAKERS`, `CHARACTERS` | nieuwe sprekers en naamkaarten: Geesje, Lammert, Roelfien, Wubbo, Tinus, **de Bewaarder (mevrouw Hoving)**; Kustwachter en Kermisexploitant als kleine rollen; Sjabbe krijgt een telefoonkleur; `Boer Roelf` en `Hilje` vervallen | bestaat; uitbreiden |
| `storyarc.js` `HIDEOUTS` | de drie keuzes van `r-trein` worden de treinscène in de reisbeat "Winsum" (alleen scène) | hergebruik |
| `game/js/calendar.js` `STEP_DATES` | nieuwe dagen per stap (zie 00-OVERZICHT §3, Kalender en tijdlijn); de kalender van dit verhaal is leidend; de epiloog staat op vr 11 september; `DEEL4_STEP_DAYS` hoort niet bij dit verhaal | bestaat; aanpassen |
| `calendar.js` `SPECIAL_DAYS` | nieuwe: Oldambt-kermis (za 22 - zo 23), Beleg van Bourtange (di 25). **De bestaande `oldambtkermis` staat nu op di 29 september (`open: false`)** en wordt verplaatst naar za 22 - zo 23 augustus. De namen "Kiezelweek" en "Plantsoenfestijn" komen in de speltekst; de code-ids (`kei`, `KEI_ROUTE`) blijven intern | uitbreiden |
| `scripts/calendar_test.mjs` | bijwerken voor de nieuwe data | bestaat |
| `game/js/missions.js` defs | zie §2 | bestaat |
| `game/js/missionstory.js` | alle scènes (`playStoryIntro`, `playStoryOutro`, `playStoryFail`) voor de nieuwe teksten | bestaat |
| `storycast.js` | uiterlijk van Geesje, Lammert, Roelfien, Wubbo, Tinus, de Bewaarder (en Mem/Oma in de kruitkelder) | bestaat; uitbreiden (`MEM_LOOK` bestaat) |
| `game/js/banterlines.js`, `banter.js` | de autogesprekspools per akte (`[B1]`-`[B5]` in `09`; B5 is een autogesprek in de colonne van do 27) | bestaat; vervangen/uitbreiden |
| `game/js/subtitles.js` | `FY` voor Friese regels van Jelle en Mem; `GRO` voor Groningse regels | bestaat |
| `game/js/phonefeed.js`, `phone.js`, `smsvoice.js` | **appjes worden niet meer voorgelezen** (nu leest `phonefeed.js` elke notificatiekaart voor): een vlag `silent` op story-appjes; **briefings via telefoon**: een telefoonstem-kanaal (`speaker (telefoon)`) dat ook tijdens een missie mag praten | bestaat; wijzigen |
| `game/js/radio.js`, `radiostudio.js`, `audio.js` | **de radio is alleen wereld en dimt (ducking) zodra een missie of gesprek begint en tot de missie is afgelopen**; AANNAME dat `audio.js` een duck-mechaniek heeft (grep op "duck" vond het in `audio.js`, `speech.js`; gedrag niet gecontroleerd); bellers als Jelle mogen alleen in de scènes na een missie | bestaat; koppelen |
| `game/js/todoui.js`, `verhaalui.js` | het **plakjesbord** (acht plakjes, per plakje gewonnen of definitief verloren) in "Wat weten we?" | nieuw (klein) |
| `game/js/heist.js` | `UI.showNote('Tige tank! – J.')` (rond regel 1145), `missions.js:321` en `missionstory.js:439` (de klomp) **blijven ongewijzigd**: het kaartje is en blijft "Tige tank! – J."; de koepel krijgt een doek met RESTAURATIE (prop) | bestaat; wijzigen |

## 2. Per hoofdmissie: wat verandert en wat wordt hergebruikt

| Nr | Missie | Bestaande def / mechaniek | Wat verandert | Nieuw? |
|---|---|---|---|---|
| M01 | Nul krassen, vijftienhonderd punten | defs `berend` (`deliver`) en `chaos` (`stunt`, `stuntavond.js`) | **samengevoegd:** eerst de stuntpunten op de Grote Markt in Berends bakkie, dan afleveren zonder kras (`scratchFine` telt over beide delen); telefoonscènes voor Jelmer en Berend | ja, klein |
| M02 | Even pinnen | def `pinautomaat` (`stages`, `escape`) | het geld van Jelmer zit in de pas; Sjabbe belt hints | nee |
| M03 | Het Loket | nieuw, op `sidejob_rechtbank.js`, `sidejobkit.js` (balie, wachtnummer) | nieuwe def en nieuw gebouw "Het Loket" (AANNAME: bestaand gebouw bij de Grote Markt kiezen; `marktgebouwen.js`, `landmarkkit.js`); **de rij wordt gekocht: de klok loopt harder**; de Bewaarder als stempelaar | ja, klein-M |
| M04 | Kieken van boven | def `duifverkenning` (`pigeon`) | bewaker twee met het koekje als foto-doel | nee |
| M05 | Wind tegen | def `kei` (`checkpoint`, `keiroute.js`) | een nieuwe regel (het besluit); Sjoerd ter plekke | nee |
| M06 | Het museum | def `museumkraak` (`heist.js`, `museum3d.js`) | kaartje blijft J (geen codewijziging), de koepel onder een doek (prop); `k-kraakspullen` en `k-nacht` opgaan in de intro; bewaker twee staat niet op zijn plek | nee |
| M07 | Het vet | def `vetgekaapt` (`chase`, `Tankwagen Us Mem Vet`) | **weg dichtgekocht:** een `reroute` midden in de missie (AANNAME: kleine toevoeging) en het zwaartepunt van de tankwagen (kantelen bij hard remmen: bestaat al als `tipOver`-achtig gedrag, AANNAME) | nee |
| M08 | Fatbikes en Oma | def `fatbike` | nieuwe scène: lijstje en recept | nee |
| M09 | Eieren (Hogeland) | `deliver` met `TRACTOR_MODEL` (`vehicle.js`); def nieuw | breekbare lading: zestig eieren als teller; omleiding over wierdepaden (`countryside.js`, `countryplan.js`) | ja, klein |
| M10 | Trekker-limo op de wierde | `escape`-stage; `QUAD_MODEL` en `trekkerlimo` bestaan; `fierljep.js` voor de animatie | nieuwe def en route; de koffer als prop (boven water houden) | ja, klein-M |
| M11 | Geleend van de Friezen (kust) | def `skutsje` (`boatchase`, `animateSkutsjeRig`, `rubberboot`) + `waterlevels.js` `shallowWater` | **samengevoegd met M13 (laag water):** na het skûtsje (afleiding) de zandplaat en het zout te voet, met sluipen langs een kustwachtboot (zoeklicht: bestaande bewakers-AI van `heist.js`, AANNAME); **zichtbare zee en vaarbaar Reitdiep/Lauwersmeer-monding nodig** (`tilewatermask.js`, `waterindex.js`, `water3d.js`); de achtervolging eindigt bij de sluis van Lauwersoog | ja, M (water en sluipen) |
| M12 | Rooster (heli) | def `traumaduif` (`helirun.js`, `heliplan.js` autopilot) | **lichte uitvoering:** spawn op het UMCG-dak (`umcg`, bestaat; Eelde ligt in Drenthe en vervalt), autopilot naar Lauwersoog, UMCG, de Dollard en de Eemshaven in één keten; alleen stil houden naast de mand en de aktetas losknippen zijn spelhandelingen; ballon en aktetas als props (`skyprops.js`) | nee (def), ja (route) |
| M13 | Containerlabyrint | `heist.js` stages (camera's, bewakers, zekering, `plan`) | **lichte uitvoering:** de kraankooi is een interactiepunt met een korte scripted animatie, geen kraanbesturing | ja, S-M |
| M14 | De dijk | `racers.js`, `createRace`; structuur van `RING_ROUTE` | nieuwe routedata langs de dijk (AANNAME: uit de wegen te trekken met `ringroute.js` en `scripts/gen_ringroute.py`); de limo met de deurwaarder als rivaal-checkpoint | ja, M |
| M15 | Laag over het graan | **nieuw voertuig: klein vliegtuig** (nieuwe vliegtuigmodus; geen bestaande gevonden), spawn op een echte strook in het Oldambt | het enige vliegtuig; nieuwe vliegtuigmodus, zie §3b; heli-fallback (`heliflight.js`) alleen als de modus niet af is | ja, **L** (of S bij heli) |
| M16 | Nog eentje dan (kermis en kus) | def `kroegentocht` (`checkpoint`, `CROWD_SIZE`, `playToast`) + `kermis.js` botsauto's | **samengevoegd met de botsauto-missie:** drie kermistenten te voet, dan één rit botsauto's met Durk en Douwe, de kus in de rit, de dijkscène; een tweede kermis in Winschoten | ja, S-M |
| M17 | Open, dicht | `pg_bruggenrace.js`, `movablebridges.js` | nieuwe def met Wubbo; de fanfare valt halverwege weg (het ritme verandert naar fluit-signalen) | ja, S-M |
| M18 | Wie draaide de camera's uit? | `heist.js` (`updateLock`), `choicepanel.js` | nieuwe def en gebouw (Wiebelwerk); het logboek als prop (het printje), dat in M26 weer opduikt | ja, M |
| M19 | Stoom | `traindrive.js`, `fjordtrain.js`, `railway.js` | **lichte uitvoering:** Tammo als machinist met alleen gas en rem op een korte gescripte rit; Tessa door de wagons als scène met keuzes, geen lopen op een rijdende trein; de Bewaarder en twee juryleden als passagiers | ja, M (licht) |
| T4 | De bus naar Bourtange (reisbeat) | `sidejob_bus.js`, `BUS_MODELS` | geen eigen missie meer: een reisbeat (meerijden, zelf rijden of skippen) met scène en autogesprek | ja, S |
| M20 | Het beleg | `hold`/`blast`-stages, `fierljep.js`, kruitkelderscène | nieuwe def en de **Vesting Bourtange** als wereldplek (AANNAME: Bourtange zit al in de provincietegels; levering van de plek controleren, `landmarkkit.js`); **de kruitkelder-hold en het dragen van de bal naar het bakkie zijn spelhandelingen** | ja, **L** |
| M21 | Rode auto (twee solodelen) | def `fjord` (`fjordtrain.js`, `solo`) | deel Tessa: overweg bij Zuidhorn op de lijn Groningen-Leeuwarden, Berends bakkie als ride-along, keuze op de wagon (auto of bal); deel Tammo: een gesprekspuzzel (`choicepanel.js`) bij Tinus' schuur waarin elke keuze faalt | nee (def), ja (route, keuze) |
| M22 | Een luik erin | `garages.js`, `garageui.js` (`garage`-stage); trekkertrek-proef | nieuwe def; trekkerprofiel in `racers.js`; het horloge als prop | ja, M |
| M23 | Colonne | `chase` omgekeerd (leider volgen) | nieuwe def; meerdere bondgenoten als AI-voertuigen (`racers.js`, `trafficfleet.js`); bruggenvergunningen als blokkades | ja, M-L |
| M24 | Vlag | def `vlag` (`pigeon`, `storyprops3d.js`) | alleen plaats in de volgorde; de vlag hangt boven de standplaats | nee |
| M25 | Het bod | def `bod` + bakken uit `pg_foodtruck.js` | oefenronde in Oma's keuken met **grof** meel; bod als scène | ja, S |
| M26 | Ontzet | def `ontzet` | **wedstrijd:** gesproken regels, bakken in drie rondes (`pg_foodtruck.js`), blokkade met de wagen in de Oude Boteringestraat (`chase` omgekeerd, duiven voor het zicht, de colonne sluit de weg), jury-stemming; geen balroof meer | ja, M (blokkade en jury) |

## 3. Nieuwe kleine features, met maat

| Feature | Maat | Waar |
|---|---|---|
| Plakjesbord in "Wat weten we?" (acht plakjes; gewonnen of definitief verloren) | S | `todoui.js`, `verhaalui.js` |
| Appjes zonder stem (`silent`) | S | `phonefeed.js`, `smsvoice.js` |
| Radio dimt bij missie en gesprek, telefoonkanaal blijft aan | S (als duck bestaat) | `audio.js`, `radio.js`, `phone.js` |
| Het Loket (gebouw, bijbaan) | M | `sidejob_rechtbank.js`, `marktgebouwen.js` |
| **Zee zichtbaar op de kaart en in de wereld** (Waddenzee, Noordzee, kust, kwelder; vereiste) | M | `tilewatermask.js`, `waterindex.js`, `water3d.js`, `mapview.js` |
| Beperkt bevaarbaar water: Reitdiep, monding Lauwersmeer, havens; scènes voor "hier kun je niet verder" | M (risico) | `waterlevels.js`, `boattypes.js`, `missions.js` |
| Opkomend-water timer op het wad, met zoeklicht van een kustwachtboot | S-M | `waterlevels.js`, `heist.js` |
| **Vliegtuigmodus (nieuw voertuig, één missie)** | L | `heliflight.js` (basis), `skyprops.js`; werklijst in §3b |
| Containerkraankooi (scripted) | S | `heist.js` |
| Dijkroute (race) | M | `racers.js`, `ringroute.js` |
| Trekkerprofiel (trekkertrek en colonne) | S-M | `racers.js`, `vehicle.js` |
| Colonne-AI (meerijden van bondgenoten) | M-L | `racers.js`, `trafficfleet.js` |
| Vesting Bourtange als wereldplek met kruitkelder | M-L | `landmarkkit.js`, `museumplan.js` als sjabloon |
| Keuze op de wagon (auto of bal) en het gesprek waarin elke keuze faalt (M21) | S | `choicepanel.js`, `fjordtrain.js` |
| De wedstrijd-regels, jury-stemming en de blokkade (M26) | M | `missions.js`, `pg_foodtruck.js`, `racers.js` |

## 3b. Luchtvaartuigen: spawnregel, spawnpunten en werk voor de vliegtuigmodus

**Spawnregel (besluit van de eigenaar).** Helikopters spawnen op echte helipads, kleine vliegtuigen alleen op echte vliegvelden of -stroken in de Ommeland (de provincie buiten de stad). Beide mogen overal in de provincie vliegen. Er wordt geen vliegveld verzonnen: in de stad staat dus geen vliegtuig. Een missie mag buiten de stad een heli gebruiken en andersom.

| Type | Spawnpunt | Echt? | Bron / status |
|---|---|---|---|
| heli | UMCG-dakhelipad ("Universitair Medisch Centrum Heliport") | ja | OSM way 400026615 in `data/helipads_raw.json`; geregistreerd als `umcg` in `heliflight.js`; opgehaald met `scripts/add_helipad.py` (het UMCG-gebouw blijft een echte plek; de lunch landt hier in M12) |
| heli | Rotor Roelfs pad op Groningen Airport Eelde | gedeeltelijk: het vliegveld is echt, het pad is een spelpad (verzonnen verkoper) | `helipadById('eelde')`, `shops.js`, `helirun.js`; niet meer de startplek van M12 (die is het UMCG-dak); alleen nog als Rotor Roelfs winkelpad in vrij spel |
| heli | het dak van het eigen huis | nee, spelpad | `home.js`, id `home`; alleen voor de eigen heli |
| heli | Martini Ziekenhuis (dak) | AANNAME: niet in de repo | `scripts/add_helipad.py` zocht alleen in de stadsbbox; eerst controleren in OSM (`aeroway=helipad`), pas dan gebruiken |
| heli | Eemshaven / offshorebasis | AANNAME: niet in de repo | controleren in OSM (`aeroway=helipad` of `heliport`) over de hele provincie-bbox |
| vliegtuig | Groningen Airport Eelde | ja, het vliegveld bestaat | geen `aeroway`-data in de repo gevonden; AANNAME, ophalen uit OSM (`aeroway=aerodrome`) |
| vliegtuig | vliegveld Oostwold (Oldambt) voor M15 | AANNAME: ik meen dat het bestaat, niet gecontroleerd | controleren in OSM; bestaat het niet, kies een andere echte strook |
| vliegtuig | 1-2 andere echte stroken in de Ommeland | AANNAME | OSM-query `aeroway=aerodrome` of `airstrip` over de provincie; alleen echte gebruiken |
| vliegtuig | in de stad | geen | er is geen echt vliegveld in de stad, dus geen vliegtuig-spawn |

**Wat de vliegtuigmodus kost (nieuw voertuig, maat L, voor één missie).**
1. Vliegmodel met vaste vleugels (voortstuwing, lift, overtrek, minimale snelheid) naast `heliflight.js`; geen zweven of verticaal opstijgen.
2. Opstijgen en landen op een strook (taxi, rotatie, landing); een plek om te wachten en te parkeren.
3. Een register van strooklocaties zoals `registerHelipad`, met naam, ligging, richting en lengte.
4. Een 3D-model en animatie (propeller), geluid, camera en HUD (snelheid, hoogte, overtrek).
5. Missiestage `plane`: poortcorridor, spandoek slepen en oppikken (`waymarkers3d.js`), falen bij te hoog of te laag.
6. Luchtruimregels (plafond rond Eelde, zoals de heli nu 125 m heeft) en botsingen met molens en hoogspanning.
7. Opslag: voertuig-id en spawnpunt, zonder bestaande saves te breken.

## 3c. Productiekeuzes: drie signature-systemen, de rest licht

Om de scope beheersbaar te houden zijn drie systemen de **signature** van het verhaal en krijgen de volle aandacht (en de beste uitvoering): **de duif** (M04, M24 en de duiven in de finale), **de boot** (M11 en de bruggen van M17) en **de finale-colonne** (M23 en de blokkade in M26). Het **vliegtuig** blijft voor precies één missie (M15; de eigenaar vindt het mooi; spawn op een echte strook). Alles wat zwaar kan worden, is licht uitgevoerd of hergebruikt:

| Onderdeel | Uitvoering | Waarom |
|---|---|---|
| Heli (M12) | autopilot (`heliplan.js`), alleen stil houden en de lier; geen vrije vlucht langs de hele route | bestaand systeem, korte spelhandeling |
| Stoomtrein (M19) | alleen gas en rem op een korte gescripte rit; Tessa door de wagons is een scène; geen lopen op een rijdende trein | physics zijn riskant (`railway.js`) |
| Containerkraan (M13) | scripted interactiepunt met korte animatie; de speler kiest het moment | geen kraanbesturing nodig |
| Bourtange (M20) | `hold` en `blast` zijn bestaande stages; de kruitkelder is één interieur | de plek is nieuw, de mechaniek niet |
| Bus (T4) | reisbeat met meerijden of skippen | geen eigen missie meer |
| Kustwacht (M11) | bestaande bewakers-AI met een zoeklichtkegel | geen nieuwe AI |

## 4. Volgorde van bouwen

1. **Tekst zonder gameplay** (laagste risico): nieuwe leads en scènes voor M01-M08, plus de Mem-scène in M20. Datums in `STEP_DATES`. Geen opnames nodig om het te testen (de tekstkaarten werken zonder stem; AANNAME).
2. **Wereldplekken en reizen:** reisbeats (`stationtravel.js`, bus, heli-autopilot), Het Loket, Wiebelwerk, Bourtange.
3. **Bestaande defs verplaatsen:** M07, M08, M11, M12, M16, M21, M24, M25, M26 met nieuwe start/doelcoördinaten (geen nieuwe mechaniek).
4. **Nieuwe defs op bestaande mechaniek:** M09, M10, M13, M14, M17, M18, M22.
5. **Signature en zware features (laatst):** de duif-uitbreiding, de boot (M11-water), de colonne-AI (M23, M26), het vliegtuig (M15), het beleg (M20).
6. **Kwaliteit:** `scripts/storytest.js`-achtige verhaaltest (AANNAME: `game/js/storytest.js` is de driver; scriptnaam controleren), nieuwe save-fixtures voor de oude stappen (`savemigrate.js`), `node scripts/voice_coverage.mjs --quiet`.
7. **Stemmen:** voorlopig niet. Alle `[NIEUW]`-regels blijven tekst (ondertitel of tekstkaart); opnemen kan pas na een nieuw besluit van de eigenaar.

## 5. Risico's

| Risico | Wat | Wat helpt |
|---|---|---|
| **Saves breken** | stappen verdwijnen of krijgen een andere volgorde; `MISSION_IDS`-indices staan in saves | alleen toevoegen aan `MISSION_IDS`; oude stappen via `RETIRED_STEPS`; migratietest |
| **Zee en water in de tegelwereld** | Waddenzee en Noordzee moeten op de kaart en in de wereld te zien zijn (eis van de eigenaar); Reitdiep en Lauwersmeer-monding ontbreken misschien (FLOW-ANALYSE) | eerst `scripts/province_water_audit.mjs`; de zee hoeft niet vaarbaar, alleen zichtbaar; de vaarstukken blijven beperkt tot Reitdiep, monding en havens; waar je niet verder kunt, een scène in plaats van een muur |
| **Vliegtuig** | geen bestaande vliegtuigmodus gevonden; geen echte vliegvelddata in de repo | M15 als heli-missie vanaf een Ommeland-helipad bouwen; vliegtuig later; eerst de strook-controle uit §3b |
| **Trein-lopen** | een gebied waar de physics vol onzekerheid zit | alleen de scène in M19 en Tammo als machinist met gas en rem |
| **Afstanden** | ruim 470 km reisafstand over alle akten (schatting) | elke reisbeat kent trein, bus, heli of skip; "Overal en nergens"-sprong van #97; tijdlijn per reisbeat in 00-OVERZICHT §3 |
| **Eén rol, drie versies** | Tessa's "Groningse vrouw" in de bestaande stem (zie `docs/personages.md`) botst met "Nederlands" in nieuwe regels | besluit van de eigenaar: Tessa is Nederlands; nieuwe regels in standaard Nederlands, opgenomen regels blijven (de stem blijft) |
| **Stemkosten** | 814 nieuwe regels | voorlopig tekst, niet opgenomen (besluit van de eigenaar); zie `07-TTS-RAMING.md` |
| **Gevoelig** | Delfstof Noord (alleen zijlijn), Ter Apel (geen decor), de CBS-regel (één getal met bron) | AGENTS.md constitutie 6; het gebruik van die zijlijnen alleen na akkoord |
| **Echte personen en organisaties** | de opdracht noemde als voorbeeldspreker de naam "WOPKE" (een echte persoon); die is **niet gebruikt**. De introweek en het festival hebben verzonnen namen (Kiezelweek, Plantsoenfestijn); echte plekken en gebouwen (UMCG, Grote Markt, Martinitoren) blijven. "Escapade" is een verzonnen voertuignaam | blijf bij verzonnen namen in speltekst en bij de naam NatusPella in de credits |
| **Veel tegelijk in één missie** | M20 (beleg, fierljep, afname, vasthouden, ruzie) is te vol; M11 (skûtsje, wad, kustwacht) is ook lang | splits in twee missies als de speelduur boven 15 minuten komt (M11 en M16 zijn al samengevoegd: ca. 12-14 minuten) |
| **Kanaalscheiding in code** | de radio moet dimmen en het telefoonkanaal moet tijdens missies kunnen praten | vlag per kanaal in `audio.js` en `phone.js` (AANNAME); luistertest met verse spelers |

## 6. Tests en controles die nu al kunnen

- `node scripts/calendar_test.mjs` na het aanpassen van `STEP_DATES`.
- `node scripts/voice_coverage.mjs --quiet` na toevoeging van tekst: toont de ontbrekende opnames.
- `node scripts/export_story.mjs` telt de regels in de `09`-bestanden (nu ook radio-, telefoon- en appregels) en toetst het formaat.
- `node scripts/province_test.mjs`, `scripts/province_water_audit.mjs` voor de regio-plekken en het water.
- Een Electron-verhaaltest (`--story-test=<dir>`) vóór de release; NaN-waarschuwingen laten de test falen (AGENTS.md).
- Alles wat niet in beeld is gezien staat in het issue als "nog niet bekeken".
