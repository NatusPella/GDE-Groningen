# Audit: boer (#1373) en snackwagen en horeca (#1378)

> **Status: audit, geen code.** Fase 3a en 3f van het bouwplan (`03-wereld-en-bouwplan.md` 5.2). Gemaakt op 28-11 vanaf `origin/main` (b052fdd25), branch `audit-boer-snack-28-11`.
> Methode: de modules zijn gelezen (niet alleen gegrept), de regelnummers hieronder komen uit die bestanden. Draaiproef: `boerderij_test` (29/29), `snackvan_test` (29/29), `snackstory_test` (12/12), `livestock_test` (12/12), `bezitcoop_test` (12/12) en `boerderijgast_test` (5/5) zijn groen. **Niet gedaan:** Electron, beeld, een volledige suite. Alles wat over uiterlijk of speelgevoel gaat is dus "niet bekeken"; de eigen verificatiedocs (`BOERDERIJ-VISUEEL-22-11.md`, `BEZIT-STAND-22-11.md`) zeggen hetzelfde van de bouwers.

## 0. Samenvatting en de drie grote bevindingen

1. **De bijbel (`02-loopbanen.md` 1 en 5) onderschat wat er is.** Bij de boer staat "veehouderij: ontbreekt", "zwaardere machines: ontbreken" en "gewasrotatie en bodem: ontbreekt"; alle drie bestaan in een eerste vorm (zie 1.2). Bij de snackwagen staat "horeca in de wereld: gebouwd" en "voorraad komt van de boer en het schip: ontbreekt"; het eerste is alleen een klantkant, het tweede is half aanwezig als korting (zie 2.2). Een bouwplan dat de bijbeltabel volgt, bouwt dingen dubbel.
2. **De bijbel spreekt zichzelf en de code tegen op namen en rangen.** Dit moet vóór de eerste regel verhaalcode beslist zijn (zie 4).
3. **Het grootste bouwrisico is niet de mechanica maar de koppeling.** Boer en snack leven in twee opslagen (`gde-boerderij-v1` en `bezit.x.snack` in `gde-bezit-v1`) en delen alleen een korting-factor (`chainOwn`). "Voorraad van de boer" betekent een transactie over twee opslagen; dat is de plek waar saves stukgaan (feedbackles #1295, #1293).

## 1. Boer (#1373)

### 1.1 Wat bestaat (met bestanden en regels)

| Onderdeel | Waar | Stand |
|---|---|---|
| Regels: veld per perceel (braak, geploegd, gezaaid, stoppel), taken ploegen, cultiveren, zaaien, bemesten, spuiten, oogsten, afleveren; kasboek per boekjaar (100 speldagen, 8 jaar bewaard), lening Boerenbank Noordhoek (max 25.000) | `boerderij.js` (453 r.): `TAKEN` r.51, `rondTaakAf` r.341, `opbrengstKg` r.382, `leverVracht` r.405, `LENING` r.71 | gebouwd, getest (`boerderij_test`) |
| Zes gewassen met afnemer en groeitijd: aardappelen, bieten, graan, gras (weiland), uien, fruit (boomgaard) | `GEWASSEN` r.25-33; prijzen `PRIJS_KG` in `gewasmarkt.js` r.8 | gebouwd |
| **Bodem en rotatie in eerste vorm:** uitputting per perceel (`bodemlog`, max 0,3), dezelfde teelt achter elkaar put twee keer zo hard uit (0,08 tegen 0,04), ploegen en bemesten herstellen; bodemkwaliteit per perceel (`bodemFactor`, `bodemNaam`) | `boerderij.js` r.65, r.349-370, r.378-390; `percelen.js` r.100-101 | gebouwd, **geen UI die dit uitlegt** (niet gecontroleerd in `farmcards.js`; de uitputting staat niet in `veldenOverzicht` r.169) |
| Dagmarkt per gewas (binnen 20% van de basis), trend op/neer | `gewasmarkt.js` (60 r.) | gebouwd |
| Leveringscontracten (aanbod per dag, bonus bij afronden) | `boerderijcontracten.js` (219 r.), uitbetaling `boerderijlive.js` r.233 `neemContract`, r.183 `leverAf` | gebouwd |
| Dagkeuze in één beeld | `boerderijdag.js` (51 r.) | gebouwd |
| Percelen en erven: twaalf vaste percelen (Hoogkerk, Zuidhorn, Winsum, Bedum, Sauwerd, Leek) en vier erven, kopen, huren per dag of week, achterstand en teruggave, opslag per erf, machinepark | `percelen.js` (435 r.): `PERCELEN` r.28-42, `ERVEN` r.68-73, `huur` r.211, `verwerkHuur` r.280, `bergOp` r.366 | gebouwd, getest |
| Extra percelen uit Bezit (echte kaartpercelen `p`+12 hex), akker, weiland en boomgaard | `percelen.js` r.48-60, `parcelfarm.js` (157 r.), `bezit.js` (223 r.; de twaalf vaste percelen staan er als `lg` in) | gebouwd |
| **Machines en werktuigen, ook zwaar:** Wierdetrekker W60 (60 pk), Kleibijter K140 (140 pk), **maaidorser Korenwolf M3 (220 pk)**, laadmachine; ploeg, cultivator, zaaimachine, mestwaaier, spuit, maaier, balenpers, aanhanger; diesel, slijtage, onderhoud, loonwerker | `percelen.js` r.78-91 (`MACHINE_CATALOGUS`), `machines.js` (173 r.; tank en verbruik r.20-21), `werktuigen.js` (184 r.), `boerderijlive.js` r.354-401 | gebouwd; de maaidorser en de trekker zijn in de wereld bestuurbaar (`boerderijwereld.js`, 1129 r.; `vehicle_farm.js`, 178 r.) |
| Het oude bijbaanmodel (`MACHINES` ploeg, zaai- en strooimachine, rooier: huur of koop) naast de catalogus | `boerderij.js` r.42-46 | gebouwd; twee machinemodellen naast elkaar, zie risico's |
| Het werk in de wereld: erf, trekker, werktuigen koppelen, aftakas, hef, veldcellen, stoppel | `boerderijwereld.js`, `boerderijlive.js` (453 r.), `sidejob_boerderij.js` (350 r.) | gebouwd; eigen Electron-meting in `docs/BOERDERIJ.md` "Gemeten in Electron", **niet door een mens gespeeld** |
| Schermen: pauzemenu Boerderij, kaarten, HUD-strook, perceelkaart, plaatjes | `boerderijui.js` (531 r.), `farmcards.js`, `farmhud.js`, `farmstatus.js`, `farmmodels3d.js`, `farmpics.js`, `pausemenu.js` r.50 | gebouwd, deels niet in beeld bekeken |
| **Veehouderij (via Bezit):** melkvee (2,5 per ha), schapen (10 per ha), kippen (hok van 200); voer, melk, wol, eieren, ziekte en dierenarts; verkoop tegen streekprijs; kudde in beeld (max 12 dieren) | `livestock.js` (r.12-16 `SPECIES`), `holdingsmodel.js`, `herdview.js`, `farmmodel.js`, `bezitlive.js` r.345 `koopVee` | gebouwd, getest (`livestock_test`); alleen **passief** (dagtik), geen melken of voeren als handeling |
| **Personeel en verpachten**, zichtbare AI-werkers | `farmstaff.js` (235 r.), `farmworkers.js`, `farmworkers3d.js` | gebouwd (#1101) |
| **Weer en gebeurtenissen:** droogte (zand meer dan klei), stortbui (-30%, verzekering), mieren, wespen, machine kapot, ziek vee, Inspectiedienst Noordrand, veilingdag, Landbouwbeurs Noorderveld, kermis en dorpsfeest, buren-kibbelen met een keuze | `bezitevents.js` (263 r.): r.21-22 weer, r.150 `FESTIVALS`, r.166 `auctionOffer`, r.195 buurman Hindrik; opbrengstverlies bij handwerk-oogst via `bezithooks.yieldInfo` (`boerderijlive.js` r.168) | gebouwd als regels; of alle events als speler-zichtbare gebeurtenis lopen is niet nagelopen |
| Streekmarkt met verzadiging, productieketens (melk-kaas, aardappel-friet, graan-brood, eieren, gras-hooi, bieten) | `areamarket.js`, `supplychain.js` r.26-51, `bezitchain.js` | gebouwd (#1103) |
| Loopbaan Landbouw: zes titels, loonfactor, bijbaan bietenoogst en balenrit | `loopbaan.js` r.77-79 (titels), r.13-18 (6 niveaus, drempels 0 tot 950 xp), `BAAN_VAK` r.109-110, `START.landbouw` r.142 | gebouwd |
| Gast: eigen akker als minigame, veldweergave (MISC_VELDEN), vee en eigen opslag per speler | `boerderijgast.js` (140 r.), `docs/COOP-GAST.md` r.72, r.136-146, test `farmfieldguest_test`, `coopbezit_test` | gebouwd; "trekker (boerderijklus)" staat op **nee** (`coopstatus.js` r.77) |
| Verhaalpunten die al op de boer wijzen | `storyarc_nieuw.js` r.309-322: M09 (eieren, Geesje), N5 "De boerderij in Warffum", K1, M10 "Een trekker-limo op de wierde" met `loopbanen: ['landbouw']`, A1 "De bietenoogst bij Hoogkerk"; poort `farm` op akte `romp` (`unlockgate.js` r.50) | gebouwd |

### 1.2 Wat de bijbel "ontbreekt" noemt maar er wel (deels) is

| Bijbel zegt ontbreekt | Werkelijk | Wat dan nog echt ontbreekt |
|---|---|---|
| Gewasrotatie en bodem | uitputting en rotatiestraf bestaan (`boerderij.js` r.368-370) | een zichtbare vruchtbaarheid, een beloning voor wisselen (nu alleen minder straf), een advies in `farmcards.js` |
| Zomerweer per reeks speldagen | droogte en stortbui per streek en dag, deterministisch (`bezitevents.js` r.21-22, r.52) | het weer is niet zichtbaar in het boerenscherm als gebeurtenis die jij ziet aankomen; geen seizoensverloop |
| Veehouderij | `livestock.js`, kudde en dierenarts | melken, voeren en scheren als handeling; **40 koeien past niet**: melkvee is 2,5 per ha (r.12), het grootste vaste perceel is 5 ha, dus 40 koeien vragen 16 ha; kwelderlammeren en een kudde op de hoeve vragen een eigen perceel of een uitzondering |
| Zwaardere machines (rooier, bietenrooier, maaidorser, grotere trekkers) | maaidorser en grote trekker staan in de catalogus; de rooier bestaat als huurmachine van de bijbaan (`boerderij.js` r.45) | een bietenrooier als eigen machine, een rang-ontgrendeling (nu koop je elke machine met geld), een derde trekkerklasse |
| Een markt met seizoenen | veilingdag, Landbouwbeurs, kermis (`bezitevents.js`), agenda met markten en kermis (`evenementen.js`) | geen Oogstfeest of Bietencampagne; de events zijn niet verbonden met de boerderijdag (`boerderijdag.js`) |
| Verwerking en verkoop | ketens met eigen verwerker geven marge (`supplychain.js` r.106 `extraMargin`); winkeltypen in `business.js` | geen hofwinkel, geen eigen merk "Hoeve Zeldenrust" |
| Verhaalkoppeling | de poort `farm` en de missies hierboven | geen schenking, geen hoeve, geen rangmomenten, geen notaris, Aaltje of Ypie in de code (gezocht op Aaltje, Zeldenrust, Ypie, erfenis, schenking: alleen `characterdossiers_*` noemen Hindrik) |

### 1.3 Wat echt ontbreekt (kern)

1. **De schenking.** Geen erf Zeldenrust, geen perceel op het Hogeland bij Warffum en Usquert (de vaste percelen liggen bij Hoogkerk, Zuidhorn, Winsum, Bedum, Sauwerd en Leek), geen mechaniek om een perceel of erf cadeau te krijgen (`percelen.koop` kost geld; `normaliseerBedrijf` r.144 leest alleen bestaande ids).
2. **Rangmomenten.** `loopbaanlive.meldOmhoog` (r.146-155) toont alleen een kaartje en bij niveau 2 een koppelgesprek uit `careerbeats.js`. Er is geen plek waar "rang 3 = de eerste machine van jezelf" iets *doet*. De rangen zijn nu alleen loonfactoren (`LOON_FACTOR` r.18).
3. **Het verhaal rond de boer** (bezoek, notaris, Ypie, Lutje, Wiebe, Hennie en Geert): geen scène en geen personageblad in de code.
4. **De eindeloze loop heeft geen doel.** Er is geen Oogstfeest, geen ranglijst Bietenbaron en geen veiling die jouw spel stuurt.
5. **Samen spelen.** Gedeeld boeren (medeboer) is nergens bedraad: `bezitcoop.workShare` (r.100) is een pure regel zonder aanroeper buiten `bezitcoop_test`; het transportbericht ontbreekt (het snackvoorbeeld `snack-work` in `bezitnet.js` r.42-60 laat zien hoe het eruit zou zien). De trekker is voor gasten `nee`.
6. **Tempo voor 40 tot 80 uur is niet gemeten.** Groeiuren (20 tot 48) tegen een speldag van 24 minuten maken een teeltronde 20 tot 50 minuten; de balans met `computeMoneyTimeline` (fase 7) en `docs/verhaal/BALANS-TEMPO.md` is niet nagelopen.

### 1.4 Hergebruikbaar

- `percelen.js`: een erf of perceel als **data** toevoegen is migratiebestendig, want `normaliseerBedrijf` loopt over `PERCEEL_IDS` en `ERF_IDS` en een oude opslag mist de nieuwe ids gewoon.
- De vlaggenadapter van de snackwagen (`storymilestones.js` + `snackstory.js`) is het patroon voor `boer:*`-vlaggen: stille vlaggen, een dunne adapter, "alleen toevoegen, nooit hernoemen".
- `careerbeats.js` (tekst per vak en niveau, `storytalk.js`) voor rangmomenten; `storybridge.js` voor scènes tussen stappen.
- `boerderijcontracten.js` is een compleet voorbeeld van "aanbod per dag, aanvaarden, uitbetalen via `loopbaanVerdien`", bruikbaar voor veiling en Oogstfeest.
- `evenementen.js` (agenda per plaats met kermis, markt, optocht) voor het Oogstfeest.
- `bezitevents.js` buren-kibbelen (r.190-210) als dialoogmodel voor Ypie.

## 2. Snackwagen en horeca (#1378)

### 2.1 Wat bestaat

| Onderdeel | Waar | Stand |
|---|---|---|
| De wagen als bedrijf-sim: drie wagenklassen (klein, groot, XL met terras), acht producten, drie upgrades (koeling, Terpsaus, dubbele pan), menu met sloten, voorraad in dagen (max 5), reputatie, vloot tot 11 wagens met medewerkers (loon of aandeel), gebeurtenissen met een keuze, dagafrekening | `snackvan.js` (514 r.): `TIERS` r.23, `ITEMS` r.36, `settleDay` r.277, `answerEvent` r.204 | gebouwd (#1095, #1102), getest (`snackvan_test`, `snackbalans_test`) |
| Zestien standplaatsen met vergunning, voetgangersdruk, kermis en wedstrijddag; Lauwersoog (`kust`) en Eemshaven erbij | `pitch.js` (185 r.) r.16-31 | gebouwd |
| Concurrent Us Mem Snacks: plekken, overnames, prijzenoorlog, sabotage als satire | `rival.js` (194 r.) | gebouwd |
| Jelle als eindbaas per akte (offerte, handlanger) | `jellebaas.js` (58 r.) | gebouwd |
| Goodwill, vaste klanten, buurthulp, bondgenoten, tevredenheid | `goodwill.js` (90 r.), `snackvan.js` r.469 `helpNeighbourhood` | gebouwd |
| **Eindscore Snackimperium** (0 tot 100) en 13 doelen | `snackvan.js` r.490-514 `GOALS`, `empireScore` | gebouwd |
| Haken, scherm, wereld | `snacklive.js` (177 r.), `snackui.js` (211 r.), `snackvanplan.js`, `snackvans3d.js`; `bezitlive.js` r.432 `snackState` (opslag `bezit.x.snack`) | gebouwd |
| Verhaalvlaggen en fasen: idee, menu, stek, team, naam, standplaats, keten | `storymilestones.js` r.14-22 (stappen M00, M08, M13, M20, M22, M26, M30), `snackstory.js` r.13-22 | gebouwd, getest (`snackstory_test`) |
| Poort: tak `snack` op akte 5 (`ontzet`) | `bezitgate.js` r.9-13 en r.51; `unlockgate.js` r.49 | gebouwd |
| **Voorraad en eigen keten als korting:** `chainOwn(product)` (0 tot 1) maakt inkoop tot de helft goedkoper; de ketens aardappel naar friet, melk naar kaas, eieren, graan naar brood bestaan | `snackvan.js` r.114-126, `bezitchain.js`, `supplychain.js` r.26-51, `bezitlive.js` r.620-636 | gebouwd, maar zie 2.3 |
| Samen spelen: eigen imperium per speler; claims op standplaatsen (`sp:<plek>`); een gast kan meewerken achter het luik van een medespeler (loon uit nieuw geld, de eigenaar verkoopt 8% meer) | `bezitcoop.js` r.110 `snackShare`, `snacklive.js` r.159, `bezitnet.js` r.42-60, tests `bezitcoop_test`, `bezitnet_test` | gebouwd |
| Ketenlaag **Kroketkoning**: bestaande snackbars kopen, upgraden, kassa ophalen; eigen opslag `gde-snackketen-v1`; los van `bezit.x.snack` | `snackrules.js` (130 r.), `snackketen.js` (166 r.), `activities.js` r.42 | gebouwd, **niet verbonden** met het imperium |
| Het recept als minigame: bakronde "Oma's recept is een volgorde", M25 en M26 | `bakeround.js`, `omakeuken3d.js` | gebouwd (verhaalmissie) |
| Bijbaan en missie | `sidejob_snackbar.js`, `missie_snackbar.js` (overlast bij de snackbar), `snackautomaat.js` (Muurkroket) | gebouwd |
| Pand-bedrijven (bakker, snackbar, slager, hotel, kiosk), mobiel bedrijf `frietwagen` | `business.js` (356 r.) r.22-37 en r.180-190 | gebouwd |
| Loopbaanvak **Horeca** (Afwashulp tot Patron van de pannenkoek) en vak Kermis | `loopbaan.js` r.71-76; banen `vigilantia`, `niemeyer`, `snackoverlast`, `studentenfeest` (`BAAN_VAK` r.121) | gebouwd |
| Horeca "in de wereld" | `horeca.js` (258 r.): de echte cafés uit de kaartdata, je betaalt 12 tot 35 euro en krijgt gezondheid terug | **alleen klantkant**, geen bedrijf |

### 2.2 Wat de bijbel anders voorstelt dan de code

- **"Horeca in de wereld: gebouwd"** is in `02-loopbanen.md` 5(c) misleidend: `horeca.js` laat je consumeren, niet exploiteren. Een eigen café, restaurant of terras is er niet: `SHOP_TYPES` (`business.js` r.22-37) kent geen café of restaurant, alleen snackbar, bakker, slager en hotel.
- **"Voorraad komt van de boer en het schip: ontbreekt"** klopt half: er is een keten-korting en een scalaire voorraad (`own.stockDays`, 0 tot 5 dagen, een inkooprit kost 40 euro, `snackvan.js` r.53), geen voorraad per ingrediënt en geen onttrekking aan de schuur of het erf (`percelen.opslag`). Vlees heeft bewust geen keten (`bezitlive.js` r.620), dus kroket en frikandel zijn nooit "van de boer".
- **"Beppe's recept van 1953"** (`02` 5(a)) tegen `01` r.99 en 7.1: het recept komt van **Oma Trijntje, Tessa's oma**, niet van Beppe; de code zegt ook Oma Trijntje (`storymilestones.js` r.15, `snackstory.js` r.16).
- **Rangen:** de snackwagen heeft in de code geen rangenladder. Het dichtstbij zijn de drie wagenklassen, de zeven fasen (`stageCount`, 0 tot 6 in `snackstory.js`) en de 13 doelen. "Een verhaalmoment per rang" (acceptatie #1378) moet dus eerst een rangbegrip krijgen.
- **Het recept zelf** staat nergens in het menu: `ITEMS` heeft geen Oma-Trijntje-product; `wagen:menu` opent alleen het scherm om het menu samen te stellen.
- **Spoilers:** de dichte tak laat via `unlockgate.js` r.49 en `bezitgate.js` r.51 een hint zien ("Tessa wil nu écht een eigen snackwagen", "eerst zoeken Tammo en Tessa hun plekje"), en `snackstory.js` r.15-22 noemt Berend, Tinus, Wubbo, Us Mem en Oma Trijntje bij naam. Acceptatie "de snackwagen verklapt het slot niet vroeg" is dus nu **niet** gehaald als een speler het tabblad vroeg opent; niet in beeld gecontroleerd waar die hints precies verschijnen (`bezitui.js` r.132 geeft `snackOpen` mee aan het lege scherm).

### 2.3 Wat echt ontbreekt (kern)

1. **Rangen met een verhaalmoment** en een zichtbare route van eerste standplaats naar Snackimperium.
2. **Het recept als hart** (product en bonus) en **voorraad per ingrediënt** met inkoop van de eigen oogst (cross-opslag, zie 0.3).
3. **Horeca naast de wagen**: pandtypen café en restaurant met terras, catering voor evenementen (bijvoorbeeld de Landbouwbeurs of het Oogstfeest).
4. **Seizoensevenementen als piek**: de kermis en wedstrijddag bestaan (`pitch.js` r.84-91, `bezitevents.js` `festivalOn` r.154), niet Oogstfeest, Dag van de Vaart, Zomerkermis als verhaalpieken.
5. **Een stad die reageert** (een straat met jouw naam): niets; hangt af van het stadsreactiesysteem uit fase 2.
6. **Een besluit over Kroketkoning** (open punt uit `02` 0c): zie 4.
7. **Samen spelen nieuw:** samen in één wagen als vaste verdeling, kermiswedstrijd, handel in ingrediënten.
8. **Het slot** zelf (actie, feest, stille scène) is fase 5 en valt buiten #1378.

### 2.4 Hergebruikbaar

- `snackstory.js`/`storymilestones.js` blijven de ruggengraat ("alleen toevoegen, nooit hernoemen").
- `bakeround.js` (logica puur, test `bakeround_test`) als bouwsteen voor "het recept samenstellen" in de wagen.
- `jellebaas.js` en `rival.js` hebben al een offerte per akte; rangmomenten kunnen daar tekst aan toevoegen in plaats van een nieuw systeem.
- `bezitnet.js` r.42-60 is het sjabloon voor een nieuw gedeeld bericht (oude clients negeren het, geen PROTO-wijziging).
- `bezitchain.js` `LINK_FIT` (r.25-35) voor nieuwe pandtypen in een keten.
- `evenementen.js` en `bezitevents.js` `FESTIVALS` voor pieken.

## 3. Risico's

### 3.1 Grote bestanden en botsingen

- Groot: `pausemenu.js` 3149 r., `story.js` 1629 r., `main.js` 1627 r., `sidejobs.js` 1334 r., `boerderijwereld.js` 1129 r., `bezitlive.js` 807 r., `loopbaan.js` 537 r., `boerderijui.js` 531 r., `snackvan.js` 514 r.; `storyarc_nieuw.js` 533 r. Alleen kleine, gerichte regels toevoegen; geen refactor (AGENTS.md).
- **Botsing op andere loopbanen** (bouwplan 5.2: "één loopbaan per worktree"): `loopbaan.js` (titels, `BAAN_VAK`, `START`) en `loopbaanlive.js` (`meldOmhoog`) zijn van alle loopbanen. De gedeelde **rang-haak** (zie taak B1) moet één keer door één agent gebouwd worden; daarna alleen data per loopbaan. Idem `unlockgate.js` (poortteksten), `evenementen.js` (Oogstfeest, Zomerkermis, Dag van de Vaart zijn gedeeld met vervoer, water en voetbal), `careerbeats.js` en `bezitgate.js`.
- **De stappenlijst verandert** (fase 1: 60 tot 90 stappen). `storymilestones.js` en `snackstory.js` hangen aan stap-id's M00 tot M30; een nieuwe stappenlijst moet de mapping naar de bestaande vlaggen behouden of migreren (`milestoneFlagsForDone` r.30 gebruikt de volgorde in `STEPS`).
- **Naambotsingen:** "Hindrik" is nu **vier** personages: Boer Hindrik bij het hek (`ommelandlines.js` r.17, `characterdossiers_minor.js` r.186, `ommelandprops3d.js`), buurman Hindrik (`bezitevents.js` r.195-198), chauffeur Hindrik (`supplychain.js` r.18), Gids Hindrik (`sidejobpack_rules.js` r.74). De bijbel maakt van de eerste Oom Hindrik de Jong van hoeve Zeldenrust, een ander verhaal dan "doar holdt de wereld op". Eén Hindrik moet winnen; de rest hernoemen in dezelfde commit als het bestand toch aangeraakt wordt.
- **Twee machinemodellen** (`boerderij.js` `MACHINES` voor de bijbaan en `percelen.js` `MACHINE_CATALOGUS` voor de eigen vloot): een nieuwe rooier of rang-ontgrendeling moet beide kennen, anders weet de een niet wat de ander bezit.
- **Voertuigbouwer:** een nieuwe machine raakt `models3d_vehicles.js` r.917-940, `cockpitlayout.js`, `carinteriorlayout.js`, `farmmodels3d.js` en `farmpicshtml.js` r.8; die zijn deels van een ander team (`docs/BOERDERIJ.md` "de besturing en interieurs zijn van de voertuigagent").

### 3.2 Opslag en migratie

- Boerderij: `gde-boerderij-v1`, `VERSIE = 1` en `normaliseer` gooit alles weg als `d.v !== VERSIE` (`boerderij.js` r.108). Een nieuw veld toevoegen zonder versie te verhogen is veilig zolang `normaliseer` het expliciet leest; een versiebump zonder migratie **wist de boerderij van elke speler**. Nooit bumpen.
- Snack: `bezit.x.snack` met `normalizeSnack` (r.74). Nieuwe velden (rang, voorraad per ingrediënt) horen daar met een standaard in; `newSnack()` is de bron.
- De schenking mag een bestaande boerderij niet overschrijven (feedbackles #1295, #1293): alleen bijschrijven in `bedrijf.percelen` en `bedrijf.erven`.
- Cross-opslag-voorraad (boer naar snack): twee `schrijfNu`-aanroepen in een volgorde die bij een crash geen oogst kan dupliceren; de verlaging bij de boer **eerst**, de bijschrijving in de wagen daarna, en bij mislukken terugzetten.

### 3.3 Samen spelen en per-speler voortgang

- De regel (#429): geld, voortgang en bezit zijn per speler; de wereld is van de host. De boerderij en het snackimperium zijn per speler en dat blijft zo.
- **Zeldenrust is een vast perceel (geen `p`+hex).** `bezitcoop.PARCEL_RE` claimt alleen `p`+12 hex en `sp:`-plekken, dus twee spelers kunnen allebei "hun" Zeldenrust hebben op dezelfde plek in de wereld zonder claimconflict, maar de **velden in de wereld zijn van de host** (`MISC_VELDEN`, `COOP-GAST.md` r.136-146): een gast ziet alleen de velden van de host. Besluit nodig: ziet een gast zijn eigen hoeve niet in de wereld (nu: zijn eigen akker is een lokale minigame), of krijgt de hoeve een claim-sleutel? Aanbeveling: het eerste, zoals nu, en medeboer later.
- Een gast die de schenking niet speelde: "altijd beschikbaar" (acceptatie #1373) betekent dat `boerderijlive` zonder `boer:schenking` gewoon werkt op De Zonnehoek; de schenking voegt toe, vervangt niet.
- Een gast die wegvalt of later komt: de dag wordt per speler uitbetaald (`COOP-GAST.md` r.128-130); een nieuw gedeeld bericht moet idempotent zijn en van een oude client veilig genegeerd worden (patroon `bezitnet.js` r.45).
- Medeboer en oogstverdeling (`workShare`) raakt de eigen-voortgang-regel: eerst "elk een eigen boerderij in dezelfde wereld" (bouwplan 541-regel in `02`), pas daarna gedeeld bezit, met een testbankstap (aanbeveling 3 in `02` 9).

### 3.4 Constitution en begrijpelijkheid

- Satire zonder leed: de overlijdens in de bijbel zijn vervangen door "Oom Hindrik overlijdt niet" (zwaait naar Huize Waddenzicht): goed; in de snack blijft sabotage zakelijk, zoals `rival.js` al afdwingt.
- Geen echte merken: Us Mem Snacks is parodie (met zorg); Kroketkoning is verzonnen; "Noordelijke Snackprijs" blijft verzonnen.
- Altijd zomer: bij weer en seizoen geen winter, geen sneeuw; alle bestaande events voldoen (`bezitevents.js` r.10).
- Begrijpelijkheid: elke naam eerst introduceren (Zeldenrust, Ypie, Aaltje, Oom Hindrik, Lutje); de hint "Tessa is boerendochter. Na Oma Trijntjes recept staat haar land voor je open" (`unlockgate.js` r.50) spreekt de nieuwe schenking tegen en moet mee.

## 4. Besluiten die de coördinator eerst moet nemen

| # | Vraag | Waarom | Mijn voorstel |
|---|---|---|---|
| 1 | **Oom Hindrik of Tante Gesina?** (#1373 en `01` zeggen Hindrik) | `02` gebruikt Gesina, Harm Veldkamp, Hoogkerk; `01` (r.227-228, 245) vervangt dat door Oom Hindrik, Tante Aaltje, Ypie Boekema en Zeldenrust bij Warffum | `01` wint (de bijbel zegt het zelf); `02` herschrijven bij de eerste boer-commit |
| 2 | **Hoeveel rangen en welke namen?** | code en `02`: zes (Veldhulp, Zaaier, Trekkerrijder, Loonwerker, Akkerbouwer, Bietenbaron van Oldambt); `01` r.366: vier (Knecht, Pachter, Boer, Akkerbaas); #1373: "Veldhulp tot Akkerbaas" | houd de **zes niveaus** (`MAX_NIVEAU = 6` is gedeeld met alle vakken, `XP_DREMPELS`), hernoem alleen titels; koppel de vier verhaalbogen aan niveau 1, 2-3, 4-5 en 6 |
| 3 | **Recept: Beppe of Oma Trijntje?** | `02` 5(a) zegt Beppe, `01` en code zeggen Oma Trijntje (Tessa's oma) | Oma Trijntje; `02` aanpassen |
| 4 | **Kroketkoning verbinden?** (open punt `02` 0c, acceptatie #1378) | twee parallelle imperia met eigen opslag (`gde-snackketen-v1`) | Licht verbinden: aantal Kroketkoning-bars telt mee in `empireScore.parts.ketens` en in een verhaalregel, **niet** in de mechanica en niet in dezelfde opslag |
| 5 | **Hoeve in de wereld voor een gast?** | zie 3.3 | nee; lokaal, zoals nu |
| 6 | **40 koeien** | melkvee is 2,5 per ha | de hoeve krijgt een eigen perceel `zeldenrust-wei` van 16 ha en de schenking zet een kudde; of de verhaaltekst zegt "een kudde" met een getal dat past (bijvoorbeeld 12 koeien op 5 ha). Voorkeur: tekst aanpassen, mechanica ongemoeid |
| 7 | **Wanneer verschijnt de snackwagen in beeld?** | hints spoilen nu | de tak `snack` blijft akte 5; de hinttekst vervangen door een neutrale zin zonder namen |

## 5. Bouwtaken, elk maximaal M

Volgorde en parallel: B1 is het fundament; daarna lopen de boertaken B2 tot B9 grotendeels naast elkaar. S1 is het fundament voor snack; S2 tot S7 volgen. Boer en snack mogen volledig parallel in aparte worktrees zolang B1 (gedeelde rang-haak) eerst op main staat en niemand tegelijk `loopbaan.js` en `loopbaanlive.js` raakt.

### Boer

**B0 (S) Besluiten en teksten.** Doe tabel 4 en pas `02-loopbanen.md` en `unlockgate.js` r.50 (hinttekst `farm`) aan. Bestanden: `docs/verhaal/bijbel-28-11/02-loopbanen.md`, `game/js/unlockgate.js`. Test: `unlockgate_test` (bestaat) en `node scripts/spec_check.mjs`. Parallel met alles; hoort vóór B2.

**B1 (M) Gedeelde rang-haak (fundament voor alle loopbanen).** Een kleine, data-gedreven haak in `loopbaanlive.meldOmhoog` (r.146): `setRangHaak(vak, fn)` die bij een niveau-omhoog een stille vlag zet en een gesprek (`storytalk.js`) speelt, naar het patroon van `careerbeats.js`. Een nieuw bestand `rangmomenten.js` (puur) met per vak en niveau `{ vlag, regels, ontgrendelt }`, nog leeg voor andere vakken. Bestanden: `game/js/loopbaanlive.js`, nieuw `game/js/rangmomenten.js`, `game/js/careerbeats.js` (alleen import). Tests: nieuw `scripts/rangmomenten_test.mjs` (een niveau-omhoog zet precies één keer de vlag, een tweede keer niet; een oud profiel dat al op niveau 4 staat krijgt de vlaggen van niveau 2 en 3 stil bijgeschreven); bestaand `loopbaan_test`, `loopbaan_dubbel_test`, `careerbeats_test`. Samen spelen: lokaal per speler, geen netwerk. **Eerst, door één agent; daarna parallel voor alle loopbanen.**

**B2 (M) De schenking en de hoeve Zeldenrust als data.** Erf `zeldenrust` en perceel(en) in `percelen.js` (`ERVEN` r.68, `PERCELEN` r.28; plek bij Warffum en Usquert uit de echte kaart, in de kaartdata opzoeken, niet uit het hoofd), `boerderijlive.schenkHoeve(w)` die bijschrijft zonder te overschrijven, `boerstory.js` met vlaggen `boer:bezoek`, `boer:schenking`, `boer:rang2` en volgende (naar `snackstory.js`), de poort `farm` in `unlockgate.js`. Bestanden: `game/js/percelen.js`, `game/js/boerderijlive.js`, nieuw `game/js/boerstory.js`, `game/js/unlockgate.js`, `game/js/storymilestones.js` (alleen een nieuwe lijst naast `VAN_MILESTONES`). Tests: `percelen_test` (nieuw erf ligt in `ERF_IDS`, oude opslag zonder het erf laadt onveranderd), nieuw `boerstory_test`, een nieuwe test voor `schenkHoeve` met `zetBoerderijVoorTest` (bestaande boerderij en kasboek blijven; tweede schenking doet niets). Samen spelen: de schenking is per speler en lokaal; een gast zonder schenking boert gewoon op De Zonnehoek; de hoeve is voor de gast niet zichtbaar in de wereld van de host. Afhankelijk van B0.

**B3 (M) Rangen van de boer: gebeurtenis en ontgrendeling per niveau.** Data in `rangmomenten.js` voor `landbouw` (zes niveaus), met per niveau een stille vlag, één Nederlandse scène of gesprek (Veldhulp, Zaaier, Trekkerrijder, Loonwerker, Akkerbouwer, Bietenbaron) en wat het opent (machine, perceel, markt). Nieuwe machines of percelen worden pas kopen-baar vanaf een rang (`percelen.koop` r.198 en `boerderijlive.koopMachineCat` r.354 krijgen een optionele rangeis). Bestanden: `game/js/rangmomenten.js`, `game/js/boerderijlive.js`, `game/js/boerderijui.js` (een sloteffect met de reden, nooit een leeg scherm). Tests: `rangmomenten_test` (landbouw), `boerderij_test`, `boerderijui_machines_test`. Samen spelen: de rang is per speler (`gde-loopbaan-v1`). Na B1 en B2.

**B4 (M) Personages en scènes van de boer.** Bezoek aan de hoeve (twee scènes), notaris, Tante Aaltje, Ypie, Lutje, Wiebe, Hennie en Geert als personageblad (fase 1b) en korte scènes via `storybridge.js`; herschrijving van `M10` (`storyarc_nieuw.js` r.315) naar de zwarte limo van Jelle. Bestanden: `game/js/storyarc_nieuw.js`, `game/js/characterdossiers_minor.js`, nieuw `game/js/boerscenes.js`; stem komt in fase 6. **Raakt het hoofdverhaal (fase 2 en 4):** alleen starten als de stappenlijst vaststaat; liever na B2 en B3 en in overleg met de verhaalbouwers. Tests: `story_spine_test`, `storybridge_test`, spec_check.

**B5 (S) Bodem zichtbaar en rotatiebeloning.** Vruchtbaarheid per perceel in de kaart en het veldpaneel, een kleine bonus voor drie verschillende gewassen op rij, een regel in `farmcards.js`. Bestanden: `game/js/boerderij.js` (alleen `rondTaakAf` oogsten en `uitputting`), `game/js/farmcards.js`, `game/js/farmstatus.js`. Tests: `boerderij_test` (rotatie geeft meer dan monocultuur), `farmmodel_test`. Parallel; raakt B3 niet.

**B6 (M) Zware machines en werktuigen met ontgrendeling.** Bietenrooier (en een grote trekker als derde klasse) in `MACHINE_CATALOGUS`, `machines.js` r.20-21 (tank en verbruik), `werktuigen.js`, het model in `vehicle_farm.js`, een plaatje in `farmmodels3d.js` en `farmpicshtml.js` r.8; ontgrendeld door B3. Los daarvan: het oude `boerderij.MACHINES` laten verwijzen of dubbel houden (eerst zeggen welke). Tests: `machines_test`, `werktuigen_test`, `farmmodels3d_test`, `boerderijwereld_test`. **Voertuigbouwer-risico** (3.1): alleen het model en de catalogus, geen cabine in deze ronde. Na B3.

**B7 (M) Markt met veiling en Oogstfeest.** Het Oogstfeest in `evenementen.js` (gedeeld, dus kort en met de andere loopbaanagents afstemmen), de weekveiling en `auctionOffer` (`bezitevents.js` r.166) in `boerderijdag.js` en `boerderijcontracten.js` zichtbaar maken, een Bietencampagne-contract. Bestanden: `game/js/evenementen.js`, `game/js/boerderijdag.js`, `game/js/boerderijcontracten.js`, `game/js/boerderijui.js`. Tests: `evenementen_test`, `boerderijdag_test`, `boerderijcontracten_test`, `bezitevents_test`. Samen spelen: de agenda is voor iedereen gelijk (gedeelde kalender), de contracten per speler. Parallel met B5 en B6.

**B8 (M) Kudde van de hoeve en dieren verzorgen.** De schenking (B2) zet een kudde op de hoeve (aantal volgens besluit 6), de kippen leveren Beppe's eieren; één handeling per dag (voeren of melken) als kleine klus bovenop `livestock.js`, naar het patroon van `werkgang.js`/`sidejob_boerderij.js`. Bestanden: `game/js/livestock.js` (alleen een optionele klus-bonus), `game/js/holdingsmodel.js`, `game/js/boerderijui.js`, nieuw `game/js/dierklus.js`. Tests: `livestock_test`, `holdingsmodel_test`, nieuw `dierklus_test`. Samen spelen: het vee is per speler en een gast ziet het niet (`livestock.js` r.6). Na B2.

**B9 (M) Hofwinkel en eigen merk "Hoeve Zeldenrust".** Een pandtype of mobiel bedrijf dat opslag van het erf (`bergOp` r.366) verkoopt met marge, via `business.js` `SHOP_TYPES` en een merknaam. Bestanden: `game/js/business.js`, `game/js/bezitbedrijven.js`, `game/js/percelen.js` (alleen lezen van de opslag). Tests: `business_test`, `percelen_test`. **Gedeelde pandtypen met S5 (horeca):** dezelfde agent of strikt na elkaar. Na B2.

**B10 (M) Samen spelen: medeboer en handel.** Het bericht `farm-work` naar het voorbeeld van `snack-work` (`bezitnet.js` r.42-60), een Meedoen-vraag (J of N), `workShare` (`bezitcoop.js` r.100) bedraad, de eigenaar krijgt oogst en voortgang, de gast loon en punten; handel van zaaigoed en oogst als eigen aanbod. Bestanden: `game/js/bezitnet.js`, `game/js/bezitcoop.js`, `game/js/boerderijgast.js`, `game/js/coopstatus.js` (trekker van `nee` naar `deels`), `docs/COOP-GAST.md`. Tests: `bezitcoop_test`, `bezitnet_test`, `boerderijgast_test`, `farmfieldguest_test`, testbankstap (tweeinstantiebewijs). **Als laatste en pas na akkoord op 4.5.**

### Snack en horeca

**S1 (M) Rangen van de snackwagen met een verhaalmoment per rang.** Een zuivere afleiding van de rang uit fasen, doelen en score (bijvoorbeeld Standplaats, Wagen, Menu, Team, Keten, Imperium) in nieuw `snackrang.js`; een regel en een gesprek per rang via `rangmomenten.js` (B1) of, als B1 nog niet staat, via `jellebaas.js` `ACTS`; één veld `rang` in `bezit.x.snack`. Bestanden: nieuw `game/js/snackrang.js`, `game/js/snackvan.js` (`newSnack` r.64, `normalizeSnack` r.74), `game/js/snacklive.js`, `game/js/jellebaas.js`. Tests: nieuw `snackrang_test`, `snackvan_test`, `snackstory_test`, `jellebaas_test`. Samen spelen: de rang is per speler (`bezit.x.snack`); een gast die meewerkt krijgt zijn eigen punten, de eigenaar zijn rang. Een oude save zonder `rang` krijgt hem afgeleid, niet nul. Na B1 (of zonder, met `jellebaas`).

**S2 (S) Spoilerhints en namen vervangen.** De hinttekst van de dichte tak (`unlockgate.js` r.49, `bezitgate.js` r.51) en `snackstory.js` r.15-22 (`STAGE_HINTS`) herschrijven zonder namen die nog niet geïntroduceerd zijn (Berend, Tinus, Wubbo, Us Mem, Oma Trijntje) en zonder te zeggen dat Tessa een wagen wil. Test: `snackstory_test` (de hint noemt geen naam uit een lijst), `unlockgate_test`. Parallel met alles; ook in beeld controleren waar de hint verschijnt.

**S3 (M) Het recept van 1953 als menu-hart.** Een product "Oma Trijntjes eierbal" (nieuwe naam bedenken, geen echt merk) in `ITEMS` (`snackvan.js` r.36) dat opent op `wagen:menu`, met een bonus op `localAppeal`, en het recept als bakronde in het wagenscherm (hergebruik `bakeround.js`, vet, eieren, zout, meel, mosterd). Bestanden: `game/js/snackvan.js`, `game/js/snackui.js`, `game/js/bakeround.js` (alleen export van de logica), `game/js/snackstory.js`. Tests: `snackvan_test`, `bakeround_test`, `snackui_test`. Samen spelen: per speler; een gast kan het recept lokaal spelen. Na S1 of parallel; kleine overlap in `snackvan.js`.

**S4 (M) Voorraad per ingrediënt met inkoop uit eigen oogst.** `own.stock` per ingrediënt (aardappelen, eieren, meel uit graan) naast `stockDays`, een transactie `uitSchuur` die uit `percelen.haalUit` (r.377) haalt en de wagen bijschrijft, met eerst-afboeken-dan-bijschrijven en teruglezen; de korting `chainOwn` blijft. Bestanden: `game/js/snackvan.js` (`restock` r.407, `wagonDay` r.150), `game/js/snacklive.js`, `game/js/bezitlive.js` (r.620-636), `game/js/boerderijlive.js` (alleen een kleine uitvoerfunctie). Tests: `snackvan_test`, `snacklive_test`, `bezitchain_test`, nieuw `voorraad_oogst_test` (crash tussen de twee stappen dupliceert niets en verliest geen oogst). Samen spelen: per speler; een gast die meewerkt gebruikt de voorraad van de eigenaar niet. **Hoogste risico** (twee opslagen): zeker een tweede review. Na B2 en S3.

**S5 (M) Horeca naast de wagen: pandtypen café en restaurant met terras.** Nieuwe `SHOP_TYPES` (`business.js` r.22-37), `LINK_FIT` (`bezitchain.js` r.25), omzet met terras en het interieur (`bezitinterior.js`); de echte cafés uit de kaartdata (`horeca.js` r.20 `poiLayerPlaces(map,'horeca')`) als kooppanden. Bestanden: `game/js/business.js`, `game/js/bezitchain.js`, `game/js/bezitinterior.js`, `game/js/bezitbedrijven.js`, `game/js/horeca.js` (alleen de lijst delen). Tests: `business_test`, `bezitchain_test`, `bezitinterior_test`. Samen spelen: panden zijn per speler met een claim op OSM-id (bestaand patroon, `bezitcoop.js`). **Gedeelde bestanden met B9.** Na S1.

**S6 (M) Seizoenspieken en catering.** De pieken Oogstfeest, Dag van de Vaart en Zomerkermis als `ctx` in `pitch.demandAt` (naar `kermis` en `matchDay`, `pitch.js` r.84-104), en een cateringopdracht naar het patroon van `boerderijcontracten.js`. Bestanden: `game/js/pitch.js`, `game/js/snacklive.js` (ctx), `game/js/evenementen.js` (gedeeld met B7), nieuw `game/js/catering.js`. Tests: `pitch_test`, `snacklive_test`, `evenementen_test`, nieuw `catering_test`. Samen spelen: de kalender is gedeeld, de omzet per speler. Na B7 (zelfde agenda).

**S7 (M) Kroketkoning verbinden (alleen na besluit 4).** De lichte brug uit tabel 4: bars tellen mee in `empireScore.parts.ketens` en in een rangregel. Bestanden: `game/js/snackvan.js` (`empireScore` r.508), `game/js/snackketen.js`, `game/js/snacklive.js`. Tests: `snackvan_test`, `snackketen_test`. Samen spelen: beide per speler. Parallel met S5.

**S8 (M) Samen spelen: kermiswedstrijd en handel in ingrediënten.** Een wedstrijd (wie verkoopt het meest op de kermis) als evenement met een rangschikking per sessie, en ingrediëntenhandel naar het patroon van `snack-work`. Bestanden: `game/js/bezitnet.js`, `game/js/bezitcoop.js`, `game/js/snacklive.js`, `docs/COOP-GAST.md`. Tests: `bezitcoop_test`, `bezitnet_test`, `snacklive_test`, testbankstap. Als laatste, met B10 samen gepland (zelfde netwerkcode).

**Een stad die reageert** (een straat met jouw naam) hoort **niet** in S1 tot S8: het hangt af van het stadsreactiesysteem uit fase 2 en wordt een eigen taak daarna; tot dan alleen een regel in `bezitnews.js` als goedkope voorloper.

### Volgorde en parallel in één blik

| Stap | Taken | Voorwaarde |
|---|---|---|
| 1 | B0 en S2 (teksten) | niets |
| 2 | B1 (rang-haak) | niets, één agent |
| 3 | B2, S1, B5 (parallel) | B1 (voor S1 en B3), B0 (voor B2) |
| 4 | B3, S3, B7 (parallel) | B2, S1 |
| 5 | B6, B8, B9, S4, S5, S6, S7 (grotendeels parallel; let op B9 met S5 en B7 met S6) | B3 en B2; S4 na B2 en S3 |
| 6 | B4 (verhaalscènes) | stappenlijst fase 1 klaar |
| 7 | B10 en S8 (samen één netwerkronde) | akkoord op 4.5, alle lokale taken af |

Alle taken sluiten af met: `node --check` op de gewijzigde JS, `node scripts/voice_coverage.mjs --quiet`, `node scripts/release/rules_audit.mjs --from=origin/main`, `node scripts/spec_check.mjs`, een Samen-spelen-regel in de changelog en een Nederlandse regel onder `[Unreleased]`. Niets wordt gesloten zonder beeld; de boer en de snackwagen hebben elk een verificatiedoc dat zegt dat een deel nog nooit in Electron is bekeken, dus geef die bestaande onzekerheid mee in elk issue.

## 6. Wat in deze audit niet is nagegaan

- Het uiterlijk van schermen, erf, trekker en wagen (geen Electron, geen beeld).
- Of elke gebeurtenis uit `bezitevents.js` als melding bij de speler aankomt (alleen de koppeling `bezithooks.yieldInfo` in `boerderijlive.js` r.168 is gelezen).
- De volledige testsuite en de testbank met meerdere instanties.
- Het tempo en de geldcurve over 40 tot 80 uur.
- De juiste coördinaten voor Zeldenrust (moet uit de echte kaartdata komen).
- Of `farmcards.js` de uitputting al ergens toont.
