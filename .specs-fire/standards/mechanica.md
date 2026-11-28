# Spec: Spelmechanica

> Canonieke spec. Vervangt de regelinhoud van `docs/LOOPBAAN.md`, `docs/BOERDERIJ.md`,
> `docs/VLIEGSCHOOL.md`, `docs/GELUID.md`, `docs/MUZIEK.md` en de archiefrapporten over prestaties,
> onboarding en weer; die blijven naslag. De code is de waarheid; `AGENTS.md` wint bij twijfel.

## Doel

Reikwijdte: loopbaan en bijbanen, hengelen, boerderij, vliegschool, de losse minigames, geluid en
muziek, prestaties en kwaliteitsstanden, weer en dag/nacht, en de uitleg. Elk systeem heeft een pure
regelmodule zonder THREE, DOM of klok, een eigen `scripts/<onderwerp>_test.mjs` en de glue ernaast.
Getallen staan in de regelmodule. Een levenslang profiel (loopbaan, visboek, boerderij, prestaties)
staat in zijn eigen `gde-*`-sleutel, nooit in een savegame.

## Loopbaan en vakken

**Doel.** Elk vak betaalt beter als je het vaker en gevarieerder doet.

**Regels.** Negentien vakken in drie groepen (`game/js/loopbaan.js:39`), niveau 1 tot 6 met drempels
0/50/140/300/560/950 (`:15`) en loonfactor 1,00 tot 1,30 (`:18`). Een nieuwe plek geeft 8 punten
(`:20`); `STAT_VAK` hangt prestatietellers aan een vak met €10 tot €20 premie (`:198`). Elke
uitbetaling loopt via `loopbaanVerdien` (`game/js/loopbaanlive.js:198`) of `loopbaanTel`; nooit
`w.money +=` naast een haak, en een nieuwe haak komt in `haken` van `loopbaan_balans_test.mjs`. De
eerste klus staat in `START` (`:129`, #431). Opslag `gde-loopbaan-v1`
(`game/js/storagekeys.js:77`). Samen spelen: de gastheer deelt `{ vak, basis, xp }` vóór zijn eigen
factor (`loopbaanDeel`, `:192`), de gast past zijn eigen factor toe (`loopbaanGast`, `:232`).

**Eerste klus en De Duizendpoot (#846).** De maatstaf is de eerste klus die echt gedaan is: punten of
teller > 0 in het vak, nooit de menuknop (`eersteKlusGedaan`, `game/js/loopbaan.js:244`; een uit de
prestaties gezaaid profiel telt mee). De telling gaat als levensduur-teller `careerFirstJobs` naar de
prestaties; bij negentien ontgrendelt de prestatie "De Duizendpoot" (categorie bijbaan) en betaalt
`loopbaanlive.js` eenmalig €2.000 lokaal, zonder loonfactor en zonder coopDeel (per speler/apparaat). De
titel "De Duizendpoot" blijft afgeleid zichtbaar in het Loopbanen-scherm. Een verhaalstap die een
loopbaan noemt geeft eenmalig een stil kaartje met de eerste klus en de startplek
(`game/js/loopbaankaarten.js`, profielveld `kaarten`). In Te doen staat één rij Loopbanen met de stand en
de dichtstbijzijnde nog open eerste klus als doel. De kaartjes, de teller en het bedrag zijn per speler
en device; een gast ziet en verdient zijn eigen loopbaan in zijn eigen spel.

**Bestanden.** `loopbaan.js`, `loopbaanlive.js`, `loopbaanui.js`, `loopbaankaarten.js`; haken in `sidejobs.js`,
`vliegschool.js`, `padel.js`, `kermis.js`, `carbid.js`, `driftzone.js`, `postgame.js`.

**Tests.** `loopbaan_test.mjs`, `loopbaan_balans_test.mjs`, `loopbaan_coop_test.mjs`,
`loopbaanstart_test.mjs`, `loopbaankaarten_test.mjs`.

## Vracht (bijbaan)

**Doel.** Een rondje vracht: achteruit onder de oplegger, koppelen, laden, naar de afnemer, lossen.

**Regels.** Vier contracttypes met eigen tarief per km, laad- en lostijd en toeslag
(`game/js/vrachtmarkt.js`); `maakAanbod(seed, km, niveau)` is deterministisch en geeft drie
verschillende aanbiedingen. Het loon is `km × tarief + toeslag`, met dezelfde laadschade-factor
als voorheen, en loopt via `completeRound`/`loopbaanVerdien` (nooit `w.money +=`). De laad- en
lostijd zitten in `c.timeLeft`, dus wachten laat de rit niet falen; lossen kan alleen bij de
afnemer. De markt is deterministisch per seed, de afstand komt uit de wereld. Host-only: een gast
kan de baan niet starten; het bestaande gastgat loopt via #365/#371.

**Bestanden.** `vrachtmarkt.js`, `sidejob_vracht.js`, `semitrailer.js`.

**Tests.** `vrachtmarkt_test.mjs`, `semitrailer_test.mjs`, `sidejob_glyph_test.mjs`.

## Trein (machinist)

**Doel.** Een machinistendienst rijden met echte reizigers.

**Regels.** `game/js/machinistrules.js` telt per halte deterministisch in- en uitstappers uit de
perrondrukte (1-8 wachtenden) en de capaciteit (90); op de laatste halte stapt niemand meer in.
Een kaartje is €0,70 per meegereden reiziger per halte. `stepService` boekt het kaartgeld,
`finish` en `payFor` nemen het mee, en de uitbetaling loopt via `loopbaanVerdien('trein', …)`.
Het bord toont het aantal reizigers en per stop de in- en uitstappers. De gastheer is
machinist; `cooptrein.js` koppelt gasten aan een wagen, de eerste gast is conducteur
(O deuren, K waakzaamheid), volgende gasten passagier. Elk crewlid krijgt het volle bedrag
en de xp via `splitReward`/`coopDeel`; de gastheer houdt zijn eigen `loopbaanVerdien`.
Zelf de trein besturen kan een gast niet.

**Bestanden.** `machinistrules.js`, `machinist.js`, `treincabine.js`, `traindrive.js`,
`cooptrein.js`, `treincoop.js`.

**Tests.** `machinist_test.mjs`, `simdienst_test.mjs`, `dienstregeling_test.mjs`,
`treincabine_test.mjs`, `gasttrein_test.mjs`, `cooptrein_test.mjs`,
`coop/treincoop_test.mjs`.

## Hengelen en vissen

**Doel.** Op elk water van de provincie vrij hengelen; het meer in Meerstad houdt zijn wedstrijd.

**Regels.** Je staat binnen 3,2 m van de kant of ligt bijna stil met een boot
(`game/js/hengelplek.js:10`). De wedstrijd duurt 90 s (`game/js/hengelrules.js:8`), vrij hengelen
kent geen klok. Zeven watertypen en 29 soorten (`game/js/visdata.js:8`, `:32`); nacht, schemer en
regen verschuiven de gewichten (`:93`). Een vangst is `(0,2 + 0,2 × kg) × zeldzaamheid (1 tot 8) ×
groei (max 1,8)` (`:123`), uitbetaald via `loopbaanVerdien` met `deel: false`
(`game/js/hengelen.js:96`). Opslag `gde-visboek-v1` (`storagekeys.js:79`).

**Bestanden.** `hengelen.js`, `hengelrules.js`, `hengelplek.js`, `visdata.js`, `visboek.js`,
`visboeklive.js`, `visboekui.js`, `hengelanim.js`, `hengeltuig.js`, `hengeltuiglive.js`.

**Tests.** `vis_test.mjs`, `hengeltuig_test.mjs`, `shops_test.mjs`, `minigames3_test.mjs` (de wedstrijd), `coophengelboot_test.mjs`.

Opslag: `gde-visboek-v1` en `gde-hengeltuig-v1` (`storagekeys.js`).

## Boerderij

**Doel.** Eén akker bij Hoogkerk in vaste stappen: ploegen, zaaien, bemesten, groeien, oogsten,
afleveren.

**Regels.** Vijf gewassen met eigen zaaigoed, groeitijd, opbrengst en een basisprijs per kg
(`game/js/boerderij.js:24`); de verkoopprijs per gewas is een dagprijs uit `game/js/gewasmarkt.js`
(binnen twintig procent van de basis, dag nul is de basis, per speler uit zijn eigen `b.uren`), en
`leverVracht` verkoopt daartegen. Elk perceel heeft een eigen teeltplan (`b.plan`); oude opslag
met alleen `keuze` migreert naar het actieve perceel. Een speldag is 24 minuten (`game/js/daynight.js:14`). Groei telt in
speluren uit `world.clock` (`game/js/boerderijlive.js:74`). Machines huur je per keer of koop je
(`:34`); een ronde levert ongeveer €300 tot €350 winst op, en de verkoop loopt via
`loopbaanVerdien`. Opslag `gde-boerderij-v1` (`storagekeys.js:81`). Samen spelen: een gast werkt op
zijn eigen akker als lokale minigame (`game/js/boerderijgast.js:1`), zijn gewas en contracten lopen
met de hostklok mee, maar leveren doet hij in zijn eigen spel. Leveringscontracten
(`game/js/boerderijcontracten.js`): per speldag een aanbod per gewas, max. 3 actief, deellevering
telt, de bonus gaat via `loopbaanVerdien('landbouw', …)` met `deel: false`, verlopen kost niets.

**Hoeve Zeldenrust (#1373, 28-11).** Het verhaal schenkt de speler hoeve Zeldenrust (erf, akker en weide van elk vijf hectare, twaalf melkkoeien; `boerstory.js`, `boerstoryrun.js`, `bezitlive.schenkHoeveCompleet`): per speler en lokaal, zonder iets te overschrijven, een tweede keer doet niets. Twaalf koeien, niet veertig: melkvee is 2,5 per hectare (besluit 6 van de audit; de mechanica blijft, de tekst volgt). Vanaf dan gelden de rangen van Landbouw (`boerrang.js`): machines en percelen zijn pas vanaf een niveau te koop of te huur, met de reden in het scherm; wie de hoeve niet kreeg koopt alles zoals voorheen. Daarbij: de rotatiebeloning (drie verschillende gewassen op rij: +5% en de grond raakt half zo moe; `boerderij.rotatieBonus`), de vruchtbaarheid en een advies op de veldkaart, de dierklus voeren en melken (`dierklus.js`, een per soort per speldag, melken telt als de melkrobot, voeren +5%), de hofwinkel met eigen merk vanaf Trekkerrijder (`hofwinkel.js`, 150 kg per speldag, 30% boven de markt), de veilingdag zichtbaar in het Gewas-tabblad en de Bietencampagne voor de Bietenbaron (één grote bietenvracht per zeven speldagen). Nog niet: de bietenrooier en een derde trekkerklasse (vragen modellen van de voertuigbouwer), het Oogstfeest en medeboer in Samen spelen (wacht op akkoord van de eigenaar).

**Bestanden.** `boerderij.js`, `boerderijlive.js`, `boerderijui.js`, `boerderijwereld.js`,
`boerderijgast.js`, `percelen.js`, `machines.js`, `werktuigen.js`, `werktuigen3d.js`,
`sidejob_boerderij.js`, `gewasmarkt.js`, `boerderijcontracten.js`, `karakterbonus.js`, `boerstory.js`, `boerstoryrun.js`, `boerrang.js`, `boerrangmomenten.js`, `dierklus.js`, `hofwinkel.js`.

**Karakterbonus (#1005, #981).** Boeren en voetballen doe je als Tessa: bij de start wisselt het spel naar haar (zelfde mechanisme als de verhaalwissel) en bij het einde terug; de tabel `KARAKTER_BONUS` in `karakterbonus.js` (klein: farm 15% sneller netjes-band, +5% oogst, minder fouten bij zaaien en oogsten; voetbal sprint, schot, aanname) geldt dus tijdens die activiteit, per speler, nooit voor de wereld. Persona-regels komen af en toe (kans en cooldown). Test `karakterbonus_test.mjs`.

**Tests.** `boerstory_test.mjs`, `boerrang_test.mjs`, `bodemrotatie_test.mjs`, `dierklus_test.mjs`, `hofwinkel_test.mjs`, `boerderijui_hoeve_test.mjs`, `boerderij_test.mjs`, `gewasmarkt_test.mjs`, `boerderijcontracten_test.mjs`,
`percelen_test.mjs`, `machines_test.mjs`, `werktuigen_test.mjs`, `boerderijwereld_test.mjs`,
`boerderijgast_test.mjs`, `boerderijui_machines_test.mjs`, `karakterbonus_test.mjs`.

## Vliegschool

**Doel.** Twintig lessen bij Eelde met het vliegtuig of de helikopter, elk met een medaille.

**Regels.** Elf vliegtuig- en negen helikopterlessen (`game/js/vliegschoolrules.js:34`); de
basislessen staan in `vliegbasis.js`. Een medaille betaalt €25, €40 of €60, alleen de eerste keer;
opnieuw doen geeft 6 punten, een les zonder medaille 2. Records staan onder `vlieg-<les>`; een crash
kost niets. De banen komen uit `game/vliegplekken.json`.

**Bestanden.** `vliegschoolrules.js`, `vliegbasis.js`, `vliegschool.js`, `instrumenten.js`.

**Tests.** `vliegschool_test.mjs` (vliegt elke vliegtuigles met de piloot), `instrumenten_test.mjs`.

## Discgolf, skatepark en de andere minigames

**Doel.** Losse activiteiten in de hub, elk met een pure kern en een eigen bediening.

**Regels.** Discgolf: negen holes in het Stadspark, medailles op +6, +1 en −2 slagen tegen par
(`game/js/discgolfrules.js:32`), water kost een slag. Skatepark: een run van 90 s, medailles bij
1200, 3200 en 6500 punten (`game/js/skatetricks.js:19`). Pitch en putt: zes holes, medailles op +7,
+3 en 0 (`game/js/puttinglogic.js:34`). Gratis, B of Backspace stopt, één bord bovenin via
`minigamekit.js`.

**Bestanden.** `discgolfrules.js` + `discgolf.js`, `skatetricks.js` + `skatepark.js`,
`puttinglogic.js` + `pitchputt.js`, `golfetiquette.js`, `activities.js`, `standactivity.js`,
`activitykit.js`, `minigamekit.js`.

**Tests.** `minigames_test.mjs`, `minigames3_test.mjs`, `golfbeurt_test.mjs`,
`golfetiquette_test.mjs`, `padelrules_test.mjs`.

## Voetbal in de Euroborg

**Doel.** Een echte, korte wedstrijd als light sim (#981): vijf tegen vijf op een klein veld in de Euroborg, in de speelstijl van een voetbalgame, met verzonnen teams (geen echte clubs, spelers, merken of competities; constitutie 2) en zonder getoond geweld (constitutie 6).

**Regels.** Twee formaten: vijf tegen vijf (klein veld) en elf tegen elf (volledig veld, 56 x 90 m), elk met vormingen (tactiek: 2-2, 3-1, 1-3; 4-4-2, 4-3-3, 3-5-2) en een speelstijl (verdedigend, evenwichtig, aanvallend); een competitie (`voetbalcompetitie.js`) is een seizoen van vijf rondes elf tegen elf met zes verzonnen clubs, drie punten voor winst en één voor gelijkspel. Twee helften van 90 s bij vijf tegen vijf (kort: 45 s) of 150 s bij elf tegen elf (kort: 75 s), de klok loopt alleen in het spel. Aftrap, uitbal (inworp, hoekschop, doelschop) met een korte pauze, doelpunt met viering en een slow-motionflits, de tegenpartij trapt af. Geen buitenspel en geen kaarten; omver lopen of een mislukte tackle van achteren is een vrije bal voor de ander. De bal (`voetbalbal.js`) rolt met wrijving, stuit, raakt paal en lat en is deterministisch. De computer (`voetbalai.js`) heeft rollen (keeper, verdediger, aanvaller) en een vorming die met de bal meeschuift; de moeilijkheid bepaalt reactietijd, snelheid, schotspreiding, keeper en tackle van de tegenstander, de maatjes spelen altijd standaard. Medailles: winst, winst met de nul, winst met een hattrick; het record is het doelsaldo van je beste winst, per stand. De invoer is één byte (`KNOP` in `voetbalrules.js`: sprint, schot, wissel, tackle, pass, lang), dezelfde voor toetsenbord, controller en een gast. Samen spelen: de live-wedstrijd van het bestaande kader (`multiplayerwedstrijd.js`), twee tot vier spelers in één team tegen de computer, autoritair bij wie het spel opende, beloning en record per speler (docs/COOP-GAST.md).

**Bestanden.** `voetbalcompetitie.js`, `voetbalrules.js`, `voetbalbal.js`, `voetbalai.js`, `voetbalmatch.js` (puur), `voetbalstatus.js` (HUD-model), `voetbaldata.js` (teksten), `voetbalkarakter.js` (de dunne aansluiting op Tessa), `voetbal.js` (wereld, camera, invoer, aansluiting), `penalty.js` (de bonusmodus Strafschoppen).

**Uitzending (epic voetbal-uitzending, 21-11).** De hele wedstrijd is de hoofdervaring (de poort heet Wedstrijd spelen; de penalty's zijn een minigame ernaast). `voetbalextrarules.js` (kaarten, blessures, wissels, strafschoppen, optioneel buitenspel; alles uit te zetten; statistieken en Man van de match), `voetbalregie.js` (camera-regie en herhaling), `voetbalpresentatie.js` (scorebord met verzonnen clubembleem, opstelling, rustpauze, eindsamenvatting, radar, gastgebeurtenissen), `voetbaltvlayer.js` met `voetbaltv.css` (de DOM-laag), `voetbalcommentaar.js` en `voetbalcommentaardata.js` (twee verzonnen commentatoren, 304 regels, afwisselend en niet herhalend; vaste regels met een stem in de TTS-cast, de rest ondertitel). Samen spelen: het commentaar, de regie, de radar en de namen zijn lokaal; kaarten, blessures en statistieken zijn van wie het spel opende; geen herhaling. Zie docs/VOETBAL-UITZENDING-21-11.md.

**Tests.** `voetbal_test.mjs`, `voetbal_uitzending_test.mjs` (regels, commentaar, regie, presentatie), `voetbal_botsim.mjs` (100 wedstrijden computer tegen computer: gemiddeld 2 tot 5 doelpunten, geen vastlopers of NaN), `penalty_test.mjs`.

## Voetbalcarrière (epic #1106)

**Doel.** De voetbalsim wordt een carrière met seizoenen, ontwikkeling, transfers en een managerlaag (ontwerp: docs/VOETBAL-CARRIERE-21-11.md; gebouwd en nog te controleren: docs/VOETBAL-CARRIERE-VERIFICATIE-21-11.md).

**Regels.** Eigen profiel per speler in `gde-voetbalcarriere-v1`, nooit in een savegame (ADR 0042); eigen dagteller op het nachtsignaal van `calendarday.js`, los van de verhaaldatum. Drie klassen van acht clubs (Talentenklasse, Terpklasse, Kroonklasse) met promotie en degradatie, beker en Waddenbeker; alle clubs hebben een parodienaam (ADR 0043). Seizoen: 7 rondes, een ronde per 3 speldagen. Per ronde zelf spelen (contractdeel plus bonus, volle ervaring) of laten uitrekenen (alleen het contractdeel, 60% ervaring). Niet-gespeelde duels zijn deterministisch (Poisson op de ratings, zaad uit seizoen, klasse, ronde en clubs): dezelfde seed geeft voor iedere speler dezelfde uitkomst. Alle geld loopt via `loopbaanVerdien` (vak Buiten); salaris volgt rondes, nooit nachten. Blessures: nooit getoond, hooguit 3 speldagen, uit te zetten. Ontgrendeling via de gedeelde poort (akte 4). Samen spelen: de carrière is van de speler zelf; een gast krijgt geld en ervaring per speler, geen competitiepunten; ratings worden aan de hostkant op het niveau van de klasse geklemd.

**Bestanden.** `voetbalplayers.js`, `voetbalclubs.js`, `voetbalparken.js` met `voetbalparkendata.js` (gebouwd door `scripts/world/build_voetbalparken.mjs`), `voetbalseason.js`, `voetbalagenda.js`, `voetbalontwikkeling.js`, `voetbalcarriere.js`, `voetbalcarrierelive.js`, `voetbalcarriereui.js`, `voetbaltransfers.js`, `voetbalbeats.js`, `voetbalpoort.js`, `voetbalsamen.js`, `voetbalsponsors.js`, `voetbalclub_bezit.js`, `voetbalworld.js`.

**Tests.** `voetbal_spelers_test`, `voetbalparken_test`, `voetbal_seizoen_test`, `voetbal_ontwikkeling_test`, `voetbal_carriere_test`, `voetbal_carrierelive_test`, `voetbal_ui_test`, `voetbal_transfers_test`, `voetbal_beats_test`, `voetbal_samen_test`, `voetbal_sponsors_test`, `voetbal_wereld_test` en de sim-testbank `scripts/voetbal_carriere_sim.mjs`.

## Bezit en snackwagen (epic #1095)

**Doel.** Percelen en panden in de hele provincie zijn te koop; wie ze heeft, laat ze draaien (land, vee, ketens, winkels, woningen) en eindigt met een eigen snackwagen tegenover de concurrent Us Mem Snacks. Ontwerp en werkpakketten: docs/BEZIT-21-11.md; wat nog gecontroleerd moet worden: docs/BEZIT-VERIFICATIE-21-11.md.

**Regels.** Alles is een pure functie van de speldag (`bezithash.js`), zonder Math.random en zonder klok. Opslag per speler; een gast bouwt een eigen imperium (#429) en claims lopen over het netwerk (`bezitnet.js`, `bezitcoop.js`). Een sponsor van de voetbalcarrière krijgt een eigen pand (`sponsorpanden.js`). Het verhaal opent de wereld in fasen via `unlockgate.js` en de stille vlaggen `wagen:*`. De concurrent is satire: zakelijk pesten, nooit geweld, nooit een echt slachtoffer (constitutie 6); alle namen zijn verzonnen (constitutie 2).

**Bestanden.** `parcelindex.js`, `bezit.js`, `bezitprijs.js`, `bezitchain.js`, `supplychain.js`, `chaintrucks.js`, `bezitbeheer.js`, `bezitevents.js`, `bezitnews.js`, `housing.js`, `snackvan.js`, `snackstory.js`, `rival.js`, `goodwill.js`, `reputation.js`. **Tests.** `bezit_test`, `bezit_index_test`, `bezit_sim_test`, `bezitchain_test`, `bezitcoop_test`, `bezitnet_test`, `snackvan_test`, `economie_sim_test`.

## Kleding (epic Kleding)

**Doel.** Kleding is een eigen systeem: losse stukken in veertien slots (twaalf, plus kousen en scheenbeschermers voor de voetbalkleding) die je koopt, past en combineert, met een kast per personage en dezelfde stukken voor NPC's. Zie docs/KLEDING-21-11.md.

**Regels.** Elk stuk is los te kiezen (sets zijn een snelkoppeling); alleen de pasvorm hangt van de lichaamsvorm af. De kapper hoort bij de outfit. Samen spelen: medespelers zien elkaars kleding en haar als optioneel veld. NPC's kleden zich uit rolpools per buurt en uur, zonder extra drawcalls per stuk. Kleding en haar mogen niet door elkaar of door het lichaam steken (hoofddeksel, haar, bril, sjaal, ketting, handschoen, tas, revers: meer dan 2 mm is een fout); `scripts/kleding_clipping_audit.mjs` meet dat voor elke combinatie van personage, lichaamsvorm, kapsel en stuk, en bij een nieuw stuk, kapsel of lichaamsvorm hoort een regel in `scripts/lib/kleding_clipping.mjs` (combinaties) en een draai van die audit. Voetbalkleding (22-11, docs/VOETBALKLEDING-22-11.md): het clubtenue is een tijdelijke override van `effectiveWorn` (`clothing.setKit`), nooit in de save; het niveau (amateur tot topniveau) staat in een tabel (`KIT_LEVELS` in `clothingkit.js`) en volgt de klasse van de club; het tenue reist als gewone outfit-code mee, zonder nieuw protocol.

**Bestanden.** `clothing.js`, `clothingdata.js`, `clothinghair.js`, `clothingpanel.js`, `kapperkeuze.js`, `models3d_clothing.js`, `models3d_hair.js`, `clothingkit.js`, `footballkit.js`, `footballkitlive.js`. **Tests.** `clothing_test`, `kleding_clipping_test` (zie docs/KLEDING-CLIPPING-22-11.md), `voetbalkleding_test` (zie docs/VOETBALKLEDING-22-11.md).

## Autotuning (epic #1155)

**Doel.** Je kunt je eigen voertuig pimpen in elke garage, en soms zie je een gepimpte auto in de wereld, maar nooit veel.

**Regels.** Eén uiterlijk-systeem voor alle voertuigtypen als overlay op het gebouwde model (hoogstens een drawcall voor de romp, een voor underglow en een voor het nummerbord; velgen kosten niets). Opslag per speler onder `gde-tuninglook-v1` met een korte code `L1...` en drie builds; onderdelen met prestatie-effect blijven in `gde-tuning-v1`, begrensd (`draai` 0,90 tot 1,08, `grip` hoogstens 1,25). Aandeel in de wereld hoogstens 3% (stad meer, platteland 0), autotreffens zeldzaam, hoogstens 8 rijdend en 6 zichtbare underglows tegelijk. Verzonnen namen, geen echte kentekens, geen politie-aandacht. Samen spelen: de look reist als optionele korte code, kopen alleen in je eigen spel.

**Bestanden.** `vehiclelook.js`, `vehiclelookstore.js`, `vehiclelook3d.js`, `tuningdraft.js`, `tuningoffer.js`, `tuningworkshopui.js`, `tuningbind.js`, `tuningworld.js`, `tuningtraffic.js`, `tuningplan.js`. **Tests.** `scripts/vehiclelook_test.mjs`, `vehiclelook3d_test.mjs`, `tuningdraft_test.mjs`, `tuningworld_test.mjs`, `tuningplan_test.mjs`. Uitgebreid in [docs/TUNING-21-11.md](../../docs/TUNING-21-11.md).

## Gevecht

**Doel.** Melee met gewicht: een reeks slagen die oploopt zolang je raakt.

**Regels.** `game/js/meleecombo.js` houdt per aanvaller én per wapen een stand bij: de tweede slag
binnen 0,8 s na een treffer doet ×1,15, de derde ×1,40 met +0,20 knock; een misser of een
wapenwissel zet de reeks terug. `combat.js` past de factor toe in `meleeHit`, dus ook voor de gast
via `gastAanvalUitvoeren`/`gastSlagLanding`; de camera-schok en het geluid houden de originele
waarden. Buiten PvP geldt "zonder getoond geweld" (constitutie 6): geen bloed of gore
toevoegen. In PvP mogen bloed en gore wel, maar alleen tussen twee spelers die beiden niet
passief staan, met de echte wapens en zonder blijvend verlies (#454); PvP houdt zijn eigen cap.

**Bestanden.** `meleecombo.js`, `combat.js`, `weapons.js`.

**Tests.** `meleecombo_test.mjs`, `coopwapen_test.mjs`, `cooppvp_test.mjs`, `gamefeel_test.mjs`.

## Geluid en muziek

**Doel.** Eén mix met effecten, spraak en muziek, en één radiozender.

**Regels.** Het meeste geluid wordt gesynthetiseerd; een paar CC0-opnames staan ernaast, beschreven
in `game/audio/sfx/manifest.json`. De radio is G-Music met vier programmablokken
(`game/js/musicpick.js:135`), een dag- en een nachtpool; een nummer uit de laatste 60% van de pool
komt niet terug (`:87`), in 60% van de overgangen zit een jingle (`:118`). Stings zijn procedureel
(`game/js/stings.js`): nooit twee tegelijk, 0,6 s afkoeling (`:10`), en de radio gaat er 45% zachter
van (`game/js/audio/scenario.js:127`).

Nieuw geluid koppel je via de centrale tabel `game/js/sfx/sfxmap.js` (gebeurtenis-sleutel naar opnames, bus, niveau, afkoeltijd en Samen-spelen-beleid) en `sfxEvent(world, sleutel, x, y)` uit `sfx/haken.js`; nooit dezelfde variant twee keer achter elkaar, lokale geluiden (UI, eigen handen, eigen voortgang) alleen op de eigen machine, wereldgeluiden van een medespeler alleen dichtbij en spaarzaam. Zie [SFX-DEKKING-21-11.md](../../docs/SFX-DEKKING-21-11.md).

**Bestanden.** `audio.js`, `sfx/samples.js`, `sfx/sfxmap.js`, `sfx/mixplan.js`, `musicpick.js`, `radio.js`,
`stings.js`.

**Tests.** `sfx_test.mjs`, `sfxsamples_test.mjs`, `sfx_round5_test.mjs`, `stings_test.mjs`, `music_pick_test.mjs`,
`minigamefoley_test.mjs`.

## Prestaties en kwaliteitsstanden

**Doel.** Levenslange prestaties per speler, en beeld dat zich aanpast.

**Regels.** Prestaties staan in `gde-prestaties-v1` (`storagekeys.js:27`); tellers lopen via
`recordStat` (`game/js/achievements.js:516`) en de gate (`:384`) zet ze stil bij een streek. Vier
presets: laag, middel, vlot en hoog (`game/js/gfxprofile.js:11`). Automatische kwaliteit beoordeelt
elke seconde op de mediaan, traag boven 27 ms (`:282`), schaalt de resolutie tot 50% (`:281`) en kent
cpuniveau 0 tot 3 (`:284`); `simload.js` volgt dat niveau voor verkeer en voetgangers. Het bewuste
wachten van de zuinige modus telt daarbij niet mee (`capIdleMs` in `game/js/framecap.js`, #561), zodat
30 fps op een snelle machine geen resolutieverlies oplevert.

**Bestanden.** `achievements.js`, `gfxprofile.js`, `simload.js`, `viewdist.js`, `settings.js`.

**Tests.** `prestaties_test.mjs`, `gfx_profile_test.mjs`, `viewdist_test.mjs`.

## Weer, dag en nacht

**Doel.** Altijd zomer, één klok, en een hemel die bij het weer past.

**Regels.** Zes weertypen: helder, bewolkt, mist, motregen, regenbui en onweer
(`game/js/weatherstate.js:18`); sneeuw, ijs en vorst bestaan niet. De dag duurt 24 minuten
(`daynight.js:12`). Sterren en maan volgen `cover = max(storm, bewolkt × 1,5, mist)`
(`game/js/scene3d.js:3886`). Een gast volgt het weer en de dagstand van de gastheer (#378).

**Bestanden.** `weatherstate.js`, `weerdag.js`, `sunrules.js`, `daynight.js`, `sky3d.js`,
`scene3d.js`.

**Tests.** `weerdag_test.mjs`, `weernacht_test.mjs`, `weerlook_test.mjs`, `coopweer_test.mjs`, `lightcurve_test.mjs` (vloeiende dag-nachtsleutels), `areamood_test.mjs` (streeksfeer: Waddenkust, Lauwersmeer, Veenkoloniën), `summerday_test.mjs` (zomervariatie per kalenderdag, docs/ZOMERVARIATIE-21-11.md);
beeldcontrole met `scripts/qa/weer_nacht.mjs`.

## Uitleg en onboarding

**Doel.** De eerste tien minuten begrijpelijk zonder uitleg van buiten, zonder tutorial die het
spelen tegenhoudt.

**Regels.** Vijf kaarten in vaste volgorde (`game/js/onboarding.js:45`), elk één keer per apparaat; de vijfde vertelt na de eerste missie dat Samen spelen onder Esc zit
onder `gde-uitleg` (`storagekeys.js:37`). Eén tegelijk: alleen als de narrative-planner het toelaat,
er niets speelt en de speler niet in een missie, bijbaan of minigame zit; 12 s na de opening, 30 s
ertussen. Uit te zetten met `onboardingTips`; de toetshints (`prompts.js`) dekken alleen wat niet
vanzelf spreekt.

Eerste doel (22-11, `firststeps.js`, puur): de toetsregel onder het eerste verhaaldoel wijkt per context
zodra de speler daar genoeg meters heeft afgelegd (te voet 60 m, voertuig en boot 250 m, lucht 600 m); bij
een missie, bijbaan of achtervolging blijft hij staan (#824). Wie 200 m van het eerste doel afdwaalt of
90 s niet opschiet krijgt de kaart "De weg kwijt?", hooguit twee keer per sessie, onder dezelfde
één-tegelijk-regel. Niets daarvan wordt opgeslagen. Sinds 23-11 geldt die kaart voor elke verhaalstap (één per latere stap, ook als alle
uitlegkaarten gezien zijn), en toont de doelbalk per stap een korte opdracht uit `game/js/stepdoel.js` (werkwoord, plek, hoogstens 44 tekens; `scripts/stepdoel_test.mjs`)
in plaats van de titel; zie docs/AUDIT-SPEELBAARHEID-23-11.md.

**Bestanden.** `onboarding.js`, `firststeps.js`, `prompts.js`, `hudcards.js`, `narrative.js`.

**Tests.** `onboarding_test.mjs` dekt de regel en de bedrading van de kaarten (welke kaart wanneer, en
dat de kaart "Samen spelen" ook in een sessie van één komt, #568); de schakelaar `onboardingTips` dekt
`spelmenu_test.mjs`. De kaarten in beeld zijn niet getest.

## Meten

De bron is `docs/PERF-METING-2026-10-19.md` (#4). Een nieuwe meting krijgt een eigen gedateerd
document in `docs/`; nooit bijschrijven in een oude meting. `docs/archief/2026-10/PERF-PROFIEL.md` is
historisch (0.24, vóór de tegels). Herhalen met `node scripts/perf/run.mjs <naam> <preset>` op een
gestagede build, en `scripts/perf/abpair.mjs` voor een gepaard verschil; alleen een paar
standaardfouten telt. De machine was nooit leeg; absolute ms zijn ruw en verhoudingen niet (`:23`).
Conflicten in één regel: de samenvatting noemt draw calls de grootste post (`:161`), terwijl Vervolg 9
een draw call op circa 2 µs zet en 46% minder draw calls maar 0,7 ms oplevert (`:417`); de vervolgen
zijn de latere meting (#477).

## Levende stad (epic, #1314, #1315, #1316)

**Doel.** Een stad met een dag: voetgangers met een ritme, verkeer dat terugpraat en af en toe iets kleins op straat.

**Regels.** Hoeveel voetgangers er zijn blijft van `simlagen.js`; `dailyrhythm.js` zegt alleen waarheen
(werk, school, station, halte, winkel, horeca, park, uitgaan, huis, per dagdeel en weekdag) en wat ze bij
aankomst doen; de terrassen vullen zich naar `terraceShare`. `trafficreact.js` geeft het verkeer een stem
(toeter, uitwijken, gebaar) zonder het remgedrag te veranderen. `streetevents.js` houdt de scènes zeldzaam
(gemiddeld drie tot vijf per speeluur), kort en zonder geweld; figuren zijn gewone voetgangers, props komen
uit het propregister (`propregister.js`, gebruik `straat`). Alles is van de wereld van wie het spel opende.

**Bestanden.** `dailyrhythm.js`, `pedroutes.js`, `terraceseats.js`, `trafficreact.js`, `vehicle/traffic.js`,
`streetevents.js`, `streeteventlive.js`, `streetevents3d.js`.

**Tests.** `dailyrhythm_test.mjs`, `trafficreact_test.mjs`, `streetevents_test.mjs`, `levendestad_wereld_test.mjs`
(echte tegels: bestemmingen per dagdeel en de kosten per beeld).

## Regels voor een nieuw systeem

1. Pure regelmodule zonder THREE, DOM of klok, met een eigen `scripts/<onderwerp>_test.mjs`; de
   glue ernaast tekent en voedt.
2. Alle getallen in die ene module; de UI en de glue lezen ze, kopiëren ze nooit.
3. Eén waarheid: geen tweede teller, geen tweede opslagsleutel, geen tweede economie. Geld via
   `loopbaanVerdien`, tellers via `recordStat`.
4. Elke missie, bijbaan of minigame krijgt een regel over Samen spelen: per speler of per wereld,
   wat een gast ziet, wie de beloning krijgt, en welke test dat dekt.
5. Opslag als `gde-<onderwerp>-v1` in `storagekeys.js`; een levenslang profiel nooit in een
   savegame; kapotte data geeft een geldig leeg profiel (`normaliseer`).
6. Een Nederlandse regel onder `[Unreleased]` in `CHANGELOG.md`.
7. Bewijs: `node --check`, de eigen test, en bij spelertekst `voice_coverage` en `text_audit`.

## Open punten (met issue)

- Loopbaan, boerderij en vliegschool lopen achter op de code: `docs/BOERDERIJ.md:29-34` noemt
  vier gewassen (Uien ontbreekt), `boerderij.js:23` heeft er vijf; `docs/LOOPBAAN.md` mist de
  start van een vak (#431). (#473)
- `docs/PERF-METING-2026-10-19.md` spreekt zichzelf tegen over de grootste kostenpost (#477).
- De audiowieken op de hoofdthread zijn weerlegd (#473): de `audio`-sectie van de hitchprobe bevatte ook de tegelvolger en de verhaalsystemen, en de perfrun draait met `--stil` (geen AudioContext). Echte audio staat in de worker; het zoeken van de loop-punten van scènemuziek gaat nu in stappen van 32768 samples per frame.
- Gast en boerderijgroei: de documentatie zegt dat een gast zijn gewassen niet ziet groeien, maar
  `main.js:723` roept `boerderijTijd` ook op het gastpad aan (#471).
- Twee testrunners naast elkaar (#481, opgelost 25-10): `scripts/run_tests.mjs` (CI) en
  `scripts/test_all.mjs` (fasen en rapport) delen hun lijsten; zie ADR 0013 en `docs/TESTEN.md`.

## Moeilijkheid per save (#1169)

**Regels.** Elke save heeft een niveau (ontspannen, standaard, uitdagend) en opties die ervan afwijken: één profiel `{ level, custom }` in het savegame-veld `moeilijkheid`, één bron in `game/js/difficulty.js`. De gameplay leest `opt(sleutel)` of een koppelfunctie; nooit een eigen getal. Op Standaard is elke optie neutraal (exact het oude gedrag, regressietest). Elke optie heeft vaste stappen binnen een veilige band; prijzen zijn geen optie en de beloningsfactor blijft binnen 0,75 en 1,25. Niets blokkeert de verhaalvoortgang; Verhaalmodus haalt de tijdsdruk weg. Samen spelen: politie en verkeer volgen wie het spel opende, al het andere is per speler. Naslag: [docs/MOEILIJKHEID-21-11.md](../../docs/MOEILIJKHEID-21-11.md).
