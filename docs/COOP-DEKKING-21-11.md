# Samen spelen: dekking van de hele game (21-11)

> Opdracht van de eigenaar (21-11): "Zorg er ook voor dat de hele game en alle systemen rekening houden met samen spelen." Dit document is de audit-matrix. De regels staan in [AGENTS.md](../AGENTS.md) (Multiplayer bij ontwerp), [MULTIPLAYER-VISIE.md](MULTIPLAYER-VISIE.md) en de spec [multiplayer.md](../.specs-fire/standards/multiplayer.md); de details per onderdeel in [COOP-GAST.md](COOP-GAST.md). De uitvoering van de sweep staat in [COOP-SWEEP-21-11.md](COOP-SWEEP-21-11.md).

## Hoe je dit leest

Elk systeem krijgt dezelfde zes vragen:

- **a)** Is het van de wereld (wie het spel opende, de host), lokaal per speler of per speler gesynct?
- **b)** Wat ziet of doet een gast (momentopname, EXTRA-bericht, lokaal)?
- **c)** Wie krijgt de beloning en de voortgang (per speler, #429)?
- **d)** Wat gebeurt er als iemand wegvalt, later aansluit of de host wisselt (#439, #1059)?
- **e)** Zit er een enkelspeler-aanname in de code (directe verwijzingen naar `world.player`, geteld door `scripts/player_singleton_audit.mjs`)?
- **f)** Welke test dekt het (pure coöp-test of testbank-suite), en wat is de status: OK, gat of niet van toepassing, met prioriteit?

De bron is [scripts/coop_coverage.json](../scripts/coop_coverage.json); de tabel hieronder wordt daaruit gegenereerd (`node scripts/coop_coverage_audit.mjs --write`) en de audit keurt dat hij klopt. Een systeem toevoegen of een status wijzigen doe je dus in de bron.

## Besluiten van deze ronde

1. **Eén bron, een gegenereerde matrix.** De matrix is gegenereerd uit het manifest zodat hij niet kan verouderen; de handgeschreven delen (dit hoofdstuk en de lijsten per epic) staan buiten de markeringen. Alternatief (een handgeschreven tabel) is afgewezen: dat wijkt binnen een week af van de code.
2. **Nieuwe modules moeten bij een systeem horen.** De audit kent de moduleslijst van nu (`scripts/coop_coverage_baseline.json`, 1.298 modules). Een nieuw bestand in `game/js` moet onder een systeem met een Samen-regel vallen of onder `nietCoopRelevant` met een reden. De 1.298 oude modules zijn niet allemaal bij naam toegewezen: dat zou een tabel van 1.300 regels zijn zonder winst. Per systeem staan wel de patronen, en daaruit komt kolom e.
3. **Opslagsleutels zijn per speler, per apparaat of wereldstaat.** Elke sleutel in `storagekeys.js` is ingedeeld; wereldstaat mag alleen voor de savegame zelf (`save`, `saveSlots`, `saveBackup`); een sleutel per speler mag niet in `savegame.js` staan; een nieuwe `gde-`-literal buiten het register is een fout.
4. **De singleton-teller telt meer.** De eerste meting (#500) zag `world.player` en `w.player` maar niet `ctx.world.player` en `const { player } = world`. Dat zijn 13 verwijzingen erbij (nu 80 in plaats van 67); de nieuwe basislijn is het startpunt voor de ratel, en wie een verwijzing weghaalt moet `--update` draaien. Nieuwe verwijzingen zijn een fout; de teller kan alleen omlaag.
5. **Zekere gaten zijn gefixt, de rest is een issue of een lijst voor de lead.** Alleen kleine, gerichte wijzigingen; geen refactors. Wat een nieuw ontwerp vraagt (waypoint delen, tuning in het bezorg-bericht, beroving per speler) is een issue.
6. **Een bewust beperkt systeem (host-only met een reden) telt als OK.** Zo staan verhuizing en andere bijbanen die niet samen kunnen er met prioriteit laag: de eigenaar heeft dat in #683 zo gekozen en de speler krijgt vooraf een waarschuwing.
7. **De gate blokkeert, de sweep bewijst.** De statische audit draait in `test_all --fase=licht` en in de releasegate (fase static). Het echte samen spelen bewijst de suite `alles` van de testbank in de sweep ([COOP-SWEEP-21-11.md](COOP-SWEEP-21-11.md)); die draait niet in deze ronde (geen Electron).

## De matrix

<!-- MATRIX:BEGIN (gegenereerd door scripts/coop_coverage_audit.mjs --write; niet met de hand aanpassen) -->

**Samenvatting:** 52 systemen: 49 OK, 0 gat, 2 deels, 1 niet van toepassing. Directe verwijzingen naar world.player (de ratel in scripts/player_singleton_baseline.json): 51 in totaal; kolom e toont ze per systeem (een bestand kan bij twee systemen horen, een deel hoort bij geen systeem: intromontage, dorpsuitjes, main).

| Systeem | a) Bezit | b) Gast | c) Beloning | d) Wegvallen, aansluiten, hostwissel | e) world.player | f) Dekking | Status |
|---|---|---|---|---|---|---|---|
| **Verhaal** | | | | | | | |
| Verhaalmissies en opdrachtstand | wereld (wie het spel opende) | Meedoen? (J of N); wie J zegt loopt mee, anderen kijken. Stappen met rekwisieten bij de host zijn deels. | Volledige beloning en eigen verhaalstap per speler (coopbeloning, coopverhaal, #429). | Valt weg: niets verloren, geen beloning. Later aansluiten: geen late instap bij race of timer. Hostwissel laat de opdrachtstand staan (#439). | ja: 2 (missionstory 2) | `coopmissie_test`, `coopverhaal_test`, `coopmissie_motor_test`, `coopmissie_audit_test`, `chaserlook_test` | OK |
| Cutscenes en filmpjes | wereld (wie het spel opende) | Scenes met een scriptbeschrijving gaan als data naar de gast en spelen lokaal na; host-only momenten krijgen een regel tekst. | Geen; wel eigen verhaalstap via de opdracht. | Wie later aansluit mist alleen de lopende scene; overslaan door de gast is lokaal. | nee | `cutgast_test`, `coopcut_test` | OK |
| Overgangsscenes, mijlpalen en ontgrendelpoort (epic Verhaal) | per speler | Een overgangsscene is van wie het spel opende; een gast ziet de ondertitels mee. De ontgrendelpoort telt per speler. | Geen; een gast verliest niets. | Niets te herstellen: de poort leest de eigen progress. | nee | `unlockgate_test`, `storybridge_test`, `samen_sweep_test` | OK |
| Begincutscenes van de voetbalcarrière en van Bezit | per speler | Wie de carrière start of het eerste perceel koopt ziet de scène; een gastheer stuurt hem als geregisseerde scène (data) naar de gasten, die hem lokaal nakijken en overslaan kunnen. Een gast die zelf begint speelt hem alleen voor zichzelf. | Geen: een scène heeft geen geld of voortgang; alleen de eigen vlag per speler (carriere:voetbal-start, carriere:bezit-start) zodat hij eenmaal te zien is. | Wie wegvalt mist de rest van de scène; wie later aansluit ziet hem niet. Niets te herstellen: de vlag staat bij wie hem startte. | nee | `careerdebut_test` | OK |
| Menu-onthulling: wat het menu toont volgt het verhaal | per speler | Per speler (#429): het menu, de kaart en de activiteitenlijst volgen de eigen verhaalstand van wie speelt. Een gast ziet wat hij zelf ontgrendelde; de opener ziet wat hij ontgrendelde. | Geen: een onderdeel verschijnt, er komt geen geld of voortgang bij. De melding Nieuw in je menu is lokaal en de lijst van wat gemeld is staat bij de speler (bezit.x.menuTold). | Niets te herstellen: de stand en de lijst staan bij de speler zelf; wie later aansluit houdt zijn eigen menu. | nee | `featurereveal_test` | OK |
| Recap Waar waren we? | lokaal per apparaat | Bestaat alleen bij Doorgaan in een sessie van een; een gast of lopende sessie slaat hem over. | Geen. | Geen staat om te herstellen (per apparaat, nooit in een savegame). | nee | `recapcard_test` | OK |
| Thuis, safehuis en Beppe's huis | wereld (wie het spel opende) | Het huis en het safehuis staan in de wereld van wie het spel opende; een gast kan er niet slapen of opslaan voor zichzelf, onderduiken is een gezamenlijke keuze (J of N). | Geen. | Slapen en onderduiken tellen alleen wie nog verbonden is. | nee | `safehuisplek_test`, `beppe_visit_test`, `groep_test` | OK |
| Binnenspawn: thuis beginnen in de woning (22-11) | per speler | Lokaal per speler: wie thuis verschijnt (een save bij het huis laden, Naar huis) staat boven in zijn eigen flat; het interieur is lokaal en er gaat niets over het net. Een gast die aansluit komt naast de host (buiten), nooit in een woning waar de groep niet is; een gast die boven in de flat staat, zet de band niet in het torengebouw. | Geen: een plek verandert geen voortgang, geld of einde. | Niets te herstellen: de plek is lokaal. Hostwissel verplaatst niemand; later aansluiten komt naast de host. Een save die buiten stond blijft buiten. | nee | `spawnbinnen_test`, `interior_coop_test`, `homebase_test` | OK |
| **Werk en vermaak** | | | | | | | |
| Bijbanen (taxi, bezorgen, krantenwijk, vracht, rondvaart, veer, rechtbank) | wereld (wie het spel opende) | Start bij het startpunt: de host draait de baan met het lichaam van de gast (world.lokaalLichaam); de anderen krijgen Meedoen? J of N. | Volledige beloning en loopbaanpunten per deelnemer; fooi wordt gedeeld. | De opvolger neemt de baan over (suites overname en overdracht); wie wegvalt verliest niets. | nee | `bijbaan_test`, `bijbaanrollen_test`, `bijbaanparallel_test`, `sidejobpack_test`, `sidejobfeel_test`, `deliveryteam_test`, `coopmeedoen_test` | OK |
| Verhuizing en andere host-only bijbanen | wereld (wie het spel opende) | nee: alleen in het eigen spel, met een waarschuwing vooraf (coopstatus.js BIJBAAN, DEELS_KEUZE met reden). | Alleen voor wie de baan zelf speelt. | Niets: de baan hoort bij een lokaal spel. | nee | `coopstatus_test` | OK, laag |
| Minigames en light sims | wedstrijd | Wedstrijden tegen elkaar (E bij het startpunt, Meedoen? J of N) of lokaal op het eigen scherm; de HUD-strook is altijd lokaal. | Per plek (races, golf) of per speler (hengelen, pannenkoeken); record en medaille per speler. | Wie wegvalt telt niet mee; niet halverwege aansluiten (uitnodiging vooraf). | ja: 8 (pg_fierljep 6, pg_skutsje 2) | `coopwedstrijd_test`, `coopwedstrijd_padel_test`, `coopbezig_test`, `coopstatus_test`, `simhud_layout_test`, `standtabel_test`, `meedoenvorm_test` | OK |
| Loopbanen en gebieden | per speler | Eigen niveaus en titels op het eigen apparaat; wat je als gast verdient rekent met je eigen niveau. | Loopbaanpunten per speler (gde-loopbaan-v1, gde-gebieden-v1), nooit in een savegame. | Niets te herstellen: de staat is lokaal. | ja: 4 (gebiedenlive 4) | `loopbaan_coop_test`, `loopbaan_test`, `gebieden_test` | OK |
| **Bezit en geld** | | | | | | | |
| Boerderij en akkers | per speler | Eigen akker in het pauzemenu; de klus op het land speel je als lokale minigame (boerderijgast.js). | Opbrengst en Landbouw-niveau per speler; geld in je eigen opslag. | Het gewas groeit lokaal door; niets te herstellen. | nee | `boerderijgast_test`, `farmfieldguest_test`, `boerderij_test` | OK |
| Bezit: percelen, panden, productieketen (epic Bezit) | per speler | Eigen bezit in de eigen progress; medespelers zien jouw percelen als gekleurde omtrek met naam (ID-verzameling); een gast kan op andermans perceel meewerken voor loon. | Oogst en voortgang naar de eigenaar; loon (nieuw geld) en eigen Landbouw-punten naar de gast. | Het veld blijft staan zoals het is; de claim leeft in de eigen progress en overleeft een hostwissel. | nee | `bezitcoop_test`, `business_test`, `bezitnet_test`, `parcelcare_test`, `bezitzorg_test`, `bezit_perf_test` | **deels**, hoog, lead Bezit |
| Voetbalcarrière (team, tegenstanders, rollen) | per speler | Een gast speelt zijn eigen figuur in jouw team; zijn ratings reizen mee als hexblok in zijn wedgast-antwoord J (haak ratings van registreerWedstrijd) en worden aan de hostkant geklemd, ook op de klasse van de eigen carrière van de host. | Per speler uit de eigen uitslagsregel (geld en ervaring); nooit competitiepunten van een ander. | De computer neemt over; het team wordt nooit leeg; geen instap halverwege. | nee | `voetbal_samen_test`, `voetbal_carriere_test`, `clubui_test`, `voetbal_balans_test` | **deels**, middel, #1157 |
| **Werk en vermaak** | | | | | | | |
| Voetbalwedstrijd Euroborg (live, 11 tegen 11, penalty's) | wedstrijd | E bij de spelerspoort: Meedoen? J of N; elf tegen elf met twee tot vier mensen; snapshot van 64 getallen. | Per plek of per speler; medaille en record per speler. | De computer neemt over; wie wegvalt telt niet mee. | nee | `coopwedstrijd_voetbal_test`, `voetbal_rook_test`, `voetbal_shirt_test`, `voetbal_publiek_test`, `samenwedstrijd_tcp_test` | OK |
| **Bezit en geld** | | | | | | | |
| Winkels, kasboek en geld | per speler | Winkels met spullen voor jezelf (kleding, kapper, avondwinkel, horeca) draaien op je eigen scherm met je eigen geld; voertuigen en tuning kopen kan alleen in je eigen spel. | Geld per speler in de eigen opslag; dezelfde beloning telt nooit dubbel (coopbeloning, #448). | Niemand verliest geld: beloning per gebeurtenis, checkpoint per speler. | nee | `coopgastlokaal_test`, `coopbeloning_test`, `shops_test`, `finance_test` | OK |
| Prestaties | per speler | Eigen prestaties (GAST_VELDEN prestaties); een gast kan er in andermans wereld een verdienen. | Per speler; dezelfde prestatie telt een keer. | Wat een gast verdiende staat in zijn eigen opgeslagen spel (applyGuestAchievements). | nee | `coopsave_test`, `prestaties_test` | OK |
| **Uiterlijk** | | | | | | | |
| Kleding, kapper en NPC-outfits (epic Kleding) | per speler | Medespelers zien je outfit via het optionele veld avatar.outfit (code k1) in de hello en de spelerslijst; de winkel is voor iedereen hetzelfde (deterministisch aanbod). Het voetbaltenue (22-11) is een tijdelijke override die als gewone outfit-code meereist, zonder nieuw bericht; het rugnummer en het sponsorpaneel zijn lokaal. | Geen; wel prestaties per speler. | Niets te herstellen; later aansluiten: de code staat in de spelerslijst. | nee | `clothing_test`, `voetbalkleding_test`, `coopspeler_test`, `uiterlijk_tcp_test`, `samen_sweep_test` | OK |
| Tuning, onderdelen, lak en gepimpte auto's | per speler | Eigen voertuigen en panden komen mee in de wereld van een ander (bezorgen en delen, #449): kleur, upgrades, deuken en lekke band reizen mee. Garage-ontdekking (22-11): per speler lokaal (gde-garage-ontdekt-v1); een gast kent het winkelmodel van een voertuig van de opener niet. | Geen; kosten uit je eigen geld. | Een bezorgde kopie verdwijnt met zijn eigenaar; het origineel blijft in de eigen opslag. | ja: 1 (garages 1) | `coopbezit_test`, `tuningplan_test`, `garage_zone_test`, `garageknown_test` | OK |
| Interieurs: binnen elkaar zien, NPC-bezit (epic Interieurs) | gedeeld, gesynct | Voertuiginterieurs zijn beeld en worden door elke client zelf gebouwd; gebouwinterieurs van de epic zijn nog niet in main. Echte-wereld-sets (realsets.js): een cutscene of binnenmissie speelt in een echt pand bij het anker; de keuze hangt alleen van de wereld af (nabijste pand van het soort, of een vaste pand-id voor een verhaalplek), dus de gast kiest hetzelfde pand; de scène is lokaal per speler en je ziet niemand in andermans scène-interieur. | Geen. | Niets te herstellen: het interieur is een deterministische functie van het gebouw. | nee | `interieurs_test`, `binnenset_test`, `realsets_test`, `cutscene_sets_audit_test`, `interior_coop_test`, `interior_crowd_test`, `interior_pandtypes_test`, `binnenklank_test`, `interieur_matrix_test`, `interieur_r8_test`, `uiterlijk_tcp_test` | OK |
| **Verkeer en reizen** | | | | | | | |
| Voertuigen: besturen, passagiers, meerijden, boten en toestellen | wereld (wie het spel opende) | E bij een vrij voertuig: je stapt in als bestuurder of bijrijder; Y geeft het stuur; schade en politie zijn van de bestuurder. De luchtroute-HUD (airguide, airguidecard) en de vaarlijn zijn lokaal per speler: elke speler ziet zijn eigen route, er gaat niets over het net. De radiozender in een gedeeld voertuig kiest de bestuurder (radiogroup.js). | Geen. | De bestuurder valt weg: het voertuig wordt vrij of de bijrijder krijgt het stuur; niets blijft hangen. | ja: 3 (vehicle 1, boatwater 1, buspop 1) | `coopbestuur_test`, `coopmeerijden_test`, `coopboot_test`, `coopvoertuigen_test`, `radiogroup_test` | OK |
| **Kaart en navigatie** | | | | | | | |
| Kaartping en roepjes (7, 8, 9) | gedeeld, gesynct | Drie toetsen geven bij iedereen een baken in de wereld, een punt op de minimap en de kaart en een regel. | Geen. | Een ping vervalt vanzelf; niets te herstellen. | nee | `coopspelers_test`, `coophostwisselwereld_test`, `multiplayerping_test`, `multiplayergoal_test` | OK |
| Snelle zinnen, emotes, dempen en blokkeren | gedeeld, gesynct | Een vaste lijst Nederlandse zinnen en emotes uit een wiel (T, controller X), zonder vrije tekst en alleen met opt-in; de host stuurt het id door, elke ontvanger zet de tekst erbij. Dempen en blokkeren per speler in de spelerslijst. | Geen. | Geen staat: wat gemist is blijft gemist. Dempen en blokkeren staan op naam in het geheugen en blijven na een hostwissel gelden; niets wordt opgeslagen. | nee | `multiplayerphrases_test`, `playerstatus_test`, `samen_sweep_test` | OK |
| Kaart, minimap, navigatiedoel en kijkanker | per speler | Elke speler heeft zijn eigen kaart, doel en ontdekking (gde-verkenning-v1); de kaart toont medespelers en pings; kijkanker en kaartheading lezen hoofdspeler(world). | Geen; ontdekking is per speler. | Niets te herstellen. | ja: 4 (gebiedenlive 4) | `viewanchor_test`, `kaartontdekking_test`, `minimap_pijlen_test`, `localmap_test`, `navtarget_test`, `loadwait_test` | OK |
| HUD-meldingen, ondertitels en melding-timer (wacht op meldingen-timer-21-11) | lokaal per apparaat | Meldingen en hints zijn lokaal per speler en per apparaat; meldingen over medespelers komen uit de spelerslijst. | Geen. | Niets te herstellen. | nee | `hudmeldingen_test`, `hudstack_test`, `uitleg_test` | OK |
| **Verkeer en reizen** | | | | | | | |
| Gezocht-niveau en politie | wereld (wie het spel opende) | Een gezocht-niveau per speler (world.coopWanted); de politie jaagt op de speler met het hoogste niveau. | Geen. | Het niveau van een weggevallen speler vervalt; het heatcooldown-pad blijft werken. | ja: 2 (coopgezocht 2) | `wanted_een_test`, `wanted_flow_test`, `coopbestuur_test`, `cashvan_dader_test` | OK |
| OV, trein, vertrekbord, taxi en reizen | wereld (wie het spel opende) | Een gast rijdt mee als passagier of conducteur; het vertrekbord is lokaal en leest een openbare feed; een dienst starten is voor wie E drukt. | Loon en voortgang per speler (#429) voor de eigen dienst. | Een machinist die wegvalt: de trein stopt of de opvolger neemt over. | ja: 7 (coopbus 4, stationtravel 2, buspop 1) | `treincoop_test`, `buscoop_test`, `gasttrein_test`, `departuretimeline_test` | OK |
| **Wereld** | | | | | | | |
| Tijd, slapen, pauzeren en laden | gedeeld, gesynct | Tijd verspringen, slapen, reizen, laden en pauzeren zijn gezamenlijke keuzes (stemming J of N); pauzeren is voor jezelf. | Geen. | Een weggevallen speler telt niet mee in de stemming; hostwissel laat tijd, weer en politie zoals ze waren. | nee | `groep_test`, `coopladen_test`, `coopduur_test`, `coophostwissel_test` | OK |
| Weer | wereld (wie het spel opende) | Het weer is van de wereld: de host meldt de weerstaat, een gast zet hem in zijn eigen machine. | Geen. | Hostwissel neemt de weerstaat mee (herstelsnapshot). | nee | `coopweer_test`, `weatherstate_test` | OK |
| Streeksfeer en vloeiend daglicht | lokaal per apparaat | Alleen beeld: elke speler ziet de lucht van de plek van het eigen beeld, afgeleid van de gedeelde klok en het gedeelde weer; er gaat niets over het net. | Geen. | Niets te synchroniseren: de sfeer volgt uit plek en klok. | nee | `areamood_test`, `lightcurve_test` | OK |
| Wereld levend (dagelijkse evenementen en dieren) | wereld (wie het spel opende) | De evenementen van de dag (markt, artiesten, studentenfeest, kermis, wandelaars, hardlopers, toeristen, eenden, schapen, duiven, zwaluwen) zijn een pure functie van kalenderdag en klok: elke speler rekent ze zelf uit op de dag en klok van de gastheer, zonder bericht. | Geen: het is decor, geen voortgang. | Er is niets om te verliezen of over te nemen: wie later aansluit of de gastheer wordt, ziet dezelfde plekken en aantallen (alleen het lopen en de bubbels zijn lokaal). | nee | `worldlife_test`, `worldlife3d_test` | OK |
| Cheats en testmenu | lokaal per apparaat | Vrijgespeeld per speler in het eigen verhaal (valsspeelbon na missie 4, streken.open in de eigen save). Uit zodra er een tweede speler is: geen cheats, geen teleport, geen testmenu of dev-paneel; wat anderen raakt staat dus alleen aan als niemand anders meespeelt. | Geen; het vrijspelen is voortgang van de eigen speler. | Valt de tweede speler weg, dan staan cheats weer aan te zetten voor wie alleen speelt. | nee | `cheats_test`, `cheats_vrijspelen_test`, `cheatsui_test`, `bot_cheatvrij_test` | OK |
| Achtergrondverkeer, voetgangers, dieren en wereldstreaming | wereld (wie het spel opende) | De wereld wordt geladen en gesimuleerd rond elke groep spelers (foci); een gast ziet dezelfde NPC's uit de snapshots. | Geen. | Een focus verdwijnt met zijn spelers; het totaalbudget blijft begrensd. | ja: 10 (pedestrians 4, streetpopulation 1, swimmers3d 1, wildlife 4) | `coopfoci_test`, `tilefocus_test`, `coopgaten_test` | OK |
| Provinciedieren en de wolf (Quaternius, ADR 0053) | wereld (wie het spel opende) | Ree, vos, erfdieren en de wolf leven in de wereld van de host en komen bij de gast uit de dierenlijst van de snapshot; de stand van de wolf gaat mee in het aux-veld en een gast neemt een beet in zijn eigen spel. | Het dierenboek per speler; een wolfsbeet is schade voor de speler die gebeten wordt. | De dieren blijven in de wereld van de host; een oudere gast ziet de wolf maar krijgt geen beet. | nee | `provinciedieren_test`, `coopextra_test` | OK |
| **Verkeer en reizen** | | | | | | | |
| Straat reageert op toeter en rijgedrag | wereld (wie het spel opende) | Verkeer dat opzij gaat of terugtoetert en voetgangers die opzij stappen of een auto nakijken horen bij de wereld: de gastheer rekent het uit voor elk voertuig dat een mens bestuurt (ook dat van een gast), een gast ziet het via het gewone snapshot (plek, toetervlag) en hoort de toeter met zijn eigen geluid. | Geen: het is gedrag van de straat, geen voortgang of beloning. | Er is geen toestand om over te nemen: valt iemand weg of wisselt de gastheer, dan reageert de straat gewoon op wie er daarna toetert. | nee | `hornreact_test` | OK |
| **Wereld** | | | | | | | |
| Levende stad: dagritmes, verkeersreacties en straatgebeurtenissen | wereld (wie het spel opende) | Dezelfde voetgangers, auto's en scènes van de host via de snapshot (plek, toetervlag, tekstballon), de losgebroken hond in de dierenlijst en de kraam, ijscokar of gitaarkoffer als tijdelijke rekwisieten; houdingen (zitten, bellen, praten) en het gebaar achter het stuur tekent alleen de host. | Geen: sfeer, geen geld of voortgang. | Niets te bewaren: een gast die later aansluit ziet de lopende scène; bij een hostwissel begint de nieuwe host met een lege scène op zijn eigen klok. | nee | `dailyrhythm_test`, `trafficreact_test`, `streetevents_test`, `levendestad_wereld_test` | OK |
| Wapens, PvP en passive mode | gedeeld, gesynct | Eigen wapen uit je eigen opslag; PvP alleen buiten passive mode; dood door een medespeler kost niets. | Geen. | Niets te herstellen. | nee | `coopwapen_test`, `cooppvp_test`, `pvpvertraging_test` | OK |
| Gewicht te voet en schietgevoel | lokaal per apparaat | Aanzetten en uitlopen gelden voor elk lichaam dat de loopregel van player.js draait; de vaste hand (gebukt, stil, sprint) geldt ook voor het schot van een gast, want de host rekent het uit vanuit zijn lichaam. De raakbevestiging is alleen te zien bij wie de kogels uitrekent: een gast ziet hem nog niet. | Geen. | Niets te herstellen: geen netwerkbericht, geen opslag. | nee | `footfeel_test`, `combatfeel_test` | OK |
| Berovingen | wereld (wie het spel opende) | Iedereen wordt lokaal beroofd tegen zijn eigen geld: de host door een dief in de wereld, een gast op zijn eigen scherm met zijn portemonnee op een plek op de kaart (geen lichaam van de dief, geen geweld). | Het geld terug als je de dief of de plek op tijd bereikt; per speler. | Een gast die opener wordt (hostwissel) krijgt zijn portemonnee terug; wie wegvalt verliest niets blijvends. | nee | `muggings_test`, `muggings_gast_test` | OK |
| **Spelmenu** | | | | | | | |
| Telefoon en apps | lokaal per apparaat | De telefoon is lokaal; een gast start een opdracht niet aan de telefoon maar bij het startpunt; delen van een voertuig staat in de telefoon (coopbezit). | Geen. | Niets te herstellen. | ja: 2 (phone 2) | `telefoon_berichten_test`, `coopbezit_test` | OK |
| Spullen, Te doen en spelmenu (wacht op spullen-ui-21-11) | per speler | Je eigen spullen, kast en Te doen staan in je eigen opslag; het spelersmenu is een weergave van de spelerslijst. | Geen. | Niets te herstellen; het menu leest de actuele lijst. | ja: 6 (spelersregister 5, spullen 1) | `spullen_test`, `todo_ui_test`, `spelmenu_test`, `lobby_test` | OK |
| Dieren, duif en vrijetijd | per speler | De duif wordt in de duifmodus door de gast mee bestuurd; dieren, fotomodus en radio zijn lokaal (ook de zender die bij een voertuig hoort, #988: de bestuurder bepaalt de zender van een gedeeld voertuig en een passagier volgt); evenementen zijn van de wereld en worden bij de gast getoond. | Eigen dierenbezit en visboek per speler. | Niets te herstellen. | ja: 5 (aaien 2, pigeonmode 2, pigeonspots 1) | `pigeon_sync_test`, `dierenregister_test`, `radiovehicle_test`, `radiocontrol_test`, `evenementen_test` | OK |
| Stemmen (TTS), geluid en muziek | lokaal per apparaat | Opgenomen stemmen en geluid worden op elk apparaat zelf afgespeeld; geluidsevents van anderen komen via coopgeluid. | Geen. | Niets te herstellen. | nee | `coopgeluid_test`, `voicebank_retry_test`, `voice_lookup_audit_test`, `sfxfeel_test` | OK |
| **Sessie en profiel** | | | | | | | |
| Startkeuze, naam en toestemming | per speler | Eerste start: naam en de vraag of je met anderen meedoet; een ontbrekende waarde is geen ja; nooit stil openbaar. | Geen. | Niets te herstellen; de keuze staat in gde-settings. | nee | `lobbyui_consent_test`, `sessiekeuze_test`, `sessionboot_test`, `coopsolo_test`, `onlinestart_test` | OK |
| Instellingen | lokaal per apparaat | Instellingen zijn per apparaat (gde-settings); niemand beheert de instellingen van een ander. | Geen. | Niets te herstellen. | nee | `settings_online_test`, `instellingen_test` | OK |
| Opslaan, laden en savegames | gedeeld, gesynct | Het spel van wie het opende wordt gespeeld; wat een gast verdient gaat in zijn eigen actieve savegame (GAST_VELDEN). | Checkpoints per speler; beloning per gebeurtenis, nooit pas aan het einde. | Bij een crash of wegvallen verliest niemand geld of voortgang. | ja: 1 (savegame 1) | `coopsave_test`, `guestsave_test`, `coopladen_test`, `compat_saves_test` | OK |
| Hostwissel en overname | gedeeld, gesynct | De langst verbonden speler neemt over uit de herstelsnapshot; tijd, weer, politie, verkeer en opdrachtstand blijven. | Niemand verliest iets. | Een harde crash van de host: de opvolger opent zijn kamer en de anderen sluiten aan. | ja: 2 (coophostwisselnet 2) | `coophostwissel_test`, `coophostwisselwereld_test`, `hostwissel_test`, `viersp_hostwissel_test` | OK |
| Netwerk, wachtkamer en openbare lijst | gedeeld, gesynct | Een dunne client: snapshots en invoer; EXTRA-berichten voor wat de snapshot niet draagt; IP-adressen nooit zichtbaar of opgeslagen. | Geen. | Kort wegvallen en opnieuw verbinden (#982, #983); kicken en verbannen door de host. | ja: 9 (coopnet 9) | `coopnet_test`, `coopcore_test`, `coop_tcp_test`, `net_lifecycle_test`, `net_protocol_test`, `net_rejoin_test`, `samen_sweep_test` | OK |
| **Technisch** | | | | | | | |
| Beeld, performance, build en tooling zonder spelregel | lokaal per apparaat | Beeld en techniek zonder eigen spelregel: elke client bouwt zijn eigen beeld uit dezelfde data. | Geen. | Niets te herstellen. | ja: 8 (cityprops 1, streetpopulation 1, swimmers3d 1, wildlife 4, ...) | nvt | nvt |
| **Instellingen** | | | | | | | |
| Analoog gas, analoge rem en stuurcurve met een controller | lokaal per apparaat | Invoer per speler en per apparaat: elke speler doseert zijn eigen voertuig. Een gast aan het stuur stuurt zijn pedaal-as als gewone invoer mee en de host past dezelfde regel toe; anderen zien alleen het voertuig rijden (bestaande snapshot, geen nieuw bericht). | Geen beloning of voortgang. | Niets te synchroniseren bij wegvallen, later aansluiten of een hostwissel: de regel is een pure functie van de invoer van dat moment. | nee | `pedalfeel_test`, `gamepad_live_test` | OK |
| Moeilijkheid (niveau per speler en voor de wereld) | gedeeld, gesynct | De wereld (politie en verkeer) is een gezamenlijke keuze, geen hostrecht: een wijziging vraagt akkoord van de groep (J of N, geen antwoord is nee); een gast kan geen stemming starten en vraagt het wie het spel opende. Een gast kiest zelf hoe pittig zijn eigen deel is (schade, rij-assist, quicktime-events, hints, tijd en medailles, beloning, boete). | Per speler volgens het eigen niveau; niemand krijgt een lagere beloning door het niveau van een ander. | Valt iemand weg of sluit hij later aan: het wereldniveau blijft dat van wie het spel opende; het eigen niveau reist mee met de speler. | nee | `difficulty_test`, `difficulty_integration_test`, `difficulty_profile_test`, `difficultycard_test`, `difficultyvote_test`, `missie_haalbaarheid_test` | OK |

### Gaten

- **Bezit: percelen, panden, productieketen (epic Bezit)** (hoog, lead Bezit): Pure en geheugentests zijn groen (claims, aansluiten, wegvallen, hostwissel, rate limit in bezitnet_test, verzekering en bestrijding per speler). Alleen met echte vensters te bewijzen: een gast die op andermans perceel meewerkt met een echte trekker, wat een gast na een hostwissel in beeld ziet, en een late aansluiter die de bestaande percelen op de kaart ziet (nog niet bekeken).
- **Voetbalcarrière (team, tegenstanders, rollen)** (middel, #1157): Ratings van een gast reizen mee en worden geklemd, de gastbeloning is per speler (voetbal_samen_test, samenwedstrijd_tcp_test). Open: sponsorpanden wachten op Bezit, uitwedstrijd als reis is niet gebouwd (geen Samen-regel nodig tot dan) en de gastbeloning is niet in een venster bekeken.

### Gefixt in deze ronde

- **Overgangsscenes, mijlpalen en ontgrendelpoort (epic Verhaal)**: 22-11: het bewijs dat een meespeler en een lopende sessie geen overgangsscene spelen en dat een gast zijn eigen done en flags houdt staat in scripts/storybridge_test.mjs (bridgeBlockers: client en session); de scene speelt lokaal bij wie het spel opende en een gast kan er niet in vastlopen.
- **Bijbanen (taxi, bezorgen, krantenwijk, vracht, rondvaart, veer, rechtbank)**: 22-11 game feel: tempobonus (telt als fooi, per deelnemer) en reeks na tegenslag per dienst (sidejobfeel.js, scripts/sidejobfeel_test.mjs), regel in docs/COOP-GAST.md. 22-11: het bijbanenpakket (studentenfeest, marktkraam, toeristengids: helper-rol met E; vismarktkoerier in het eigen spel) staat in docs/COOP-GAST.md. Fix 21-11: krantenwijk, rondvaart, rondvaarttour, sidejobkit en het keuzepaneel lazen world.player (het lichaam van de host) terwijl een gastgroep met world.lokaalLichaam speelt; nu hoofdspeler(world).
- **Tuning, onderdelen, lak en gepimpte auto's**: 22-11: de tuning van een bezorgd voertuig (onderdelen en look-code) reist mee in het bezorgbericht (coopbezit.js TUNING_VELD, leesTuning, bezorgHost geeft hem aan de host-kopie); scripts/coopbezit_test.mjs keurt het veld, ook een ouder bericht zonder.
- **Voertuigen: besturen, passagiers, meerijden, boten en toestellen**: 22-11: de radiozender in een gedeeld voertuig (bestuurder kiest, passagier volgt of stemt, late instapper volgt) is gebouwd: radiogroup.js, bericht zender, radio.js-haak; scripts/radiogroup_test.mjs.
- **Kaartping en roepjes (7, 8, 9)**: 22-11: een ping op een gekozen kaartpunt (pingGoal) en een waypoint delen (shareGoal, bestuurder met bijrijder of iedereen) bestaan; coopping.js heeft een eigen test (multiplayerping_test.mjs) en het delen een geheugenverbindingstest (multiplayergoal_test.mjs).
- **Kaart, minimap, navigatiedoel en kijkanker**: Fix 21-11: viewanchor.js las world.lokaalLichaam // world.player; nu hoofdspeler(world). 22-11: de melding van een nieuw gebied of een nieuwe streek wacht tot het laadscherm weg is (loadwait.js, per speler).
- **Hostwissel en overname**: 22-11: overdragen wacht op een lopende race, wedstrijd of score en de eigen bijbaan van de oude host stopt met melding (coophostwisselnet.js kanOverdragen, oudeBaanStop; scripts/coop/hostwissel_test.mjs).

### Opslagsleutels

| Sleutel | Scope | Reden |
|---|---|---|
| `serverlijstVerborgen` | apparaat | Welke openbare sessies je meldde, alleen op dit apparaat. |
| `serverlijstFavorieten` | apparaat | Sterren op dit apparaat. |
| `save` | wereld | De savegame zelf: het spel van wie het opende; wat een gast verdient gaat in zijn eigen savegame (GAST_VELDEN). |
| `settings` | apparaat | Instellingen per apparaat. |
| `saveSlots` | wereld | De lijst met savegames. |
| `achievements` | speler | Prestaties van deze speler. |
| `saveBackup` | wereld | Herstelkopie van de savegame. |
| `menu` | apparaat | Menu-voorkeuren. |
| `todoFilter` | apparaat | Filter van Te doen. |
| `pigeon` | speler | Duifvoortgang van deze speler. |
| `flavour` | apparaat | Welke sfeerregels je zag. |
| `banter` | apparaat | Welke ondertitel-banter je zag. |
| `lastVersion` | apparaat | Laatst gespeelde versie. |
| `gfxAdvice` | apparaat | Grafisch advies. |
| `audioGlitch` | apparaat | Diagnose van geluidsonderbrekingen. |
| `muted` | apparaat | Geluid uit. |
| `introSeen` | apparaat | Intro gezien. |
| `onboarding` | apparaat | Uitleg gezien. |
| `hintUses` | apparaat | Hoe vaak een hint werd gebruikt. |
| `mapLayers` | apparaat | Kaartlagen. |
| `wijkenSeen` | speler | Welke wijken deze speler zag. |
| `wijkLinesRecent` | apparaat | Recente wijkregels. |
| `radioHistory` | apparaat | Radiogeschiedenis. |
| `radioChannel` | apparaat | Gekozen radiozender. |
| `radioTalk` | apparaat | Radiopraat. |
| `fog` | apparaat | Mistvoorkeur. |
| `errorLog` | apparaat | Foutlog. |
| `snapshots` | apparaat | Cache. |
| `placeshots` | apparaat | Cache. |
| `ghosts` | speler | Eigen spookritten. |
| `snackChain` | speler | Eigen snackketen. |
| `hintsGezien` | apparaat | Hints gezien. |
| `uitlegNietMeer` | apparaat | Uitleg niet meer tonen. |
| `oefenronde` | apparaat | Oefenronde klaar. |
| `gallery` | apparaat | Fotogalerij. |
| `eventsSeen` | apparaat | Evenementen gezien. |
| `menuPlekken` | apparaat | Menuachtergronden gezien. |
| `coopSession` | apparaat | Laatste modus en verbindingscode; geen verhaal. |
| `nieuwVerhaal` | apparaat | Oude sleutel, niets leest hem. |
| `oudGemigreerd` | apparaat | Migratievlag. |
| `benchmarkLast` | apparaat | Laatste benchmark. |
| `tuning` | speler | Onderdelen per voertuig van deze speler; nooit in een savegame. |
| `dieren` | speler | Dieren van deze speler. |
| `hudSeen` | apparaat | HUD-uitleg gezien. |
| `ovHint` | apparaat | OV-hint, nooit in een savegame. |
| `help` | speler | Stappen met hulp van deze speler. |
| `loopbaan` | speler | Loopbaan per speler. |
| `beleid` | speler | Gemeentebeleid per speler. |
| `visboek` | speler | Visboek per speler. |
| `hengeltuig` | speler | Hengeltuig per speler. |
| `boerderij` | speler | Boerderij per speler. |
| `boerderijUitleg` | apparaat | Uitleg gezien. |
| `simUitleg` | apparaat | Uitleg gezien. |
| `voetbal` | apparaat | Voorkeur voor de duur van een wedstrijd. |
| `reputatie` | speler | Lichte reputatie per speler (reputation.js, #1135), nooit in een savegame en nooit over het net; een gast heeft zijn eigen. |
| `voetbalCarriere` | speler | Voetbalcarrière per speler, nooit in een savegame. |
| `terugkeer` | apparaat | Terugkeerscene gezien. |
| `recap` | apparaat | Recapkaart: nooit in een savegame. |
| `gebieden` | speler | Gebieden per speler. |
| `exploration` | speler | Verkenning per speler. |
| `tuningLook` | speler | Het uiterlijk dat deze speler aan een eigen voertuig gaf; per speler (#429), nooit in een savegame, niet gedeeld. |
| `bezit` | speler | Percelen en panden van deze speler (#1097); per speler (#429), nooit in een savegame. |
| `garageOntdekt` | speler | Welke voertuigen deze speler kent voor de garage (22-11); per speler (#429), nooit in een savegame, niet gedeeld. |
| `saveScope` | speler | Welke save de bewaarde voortgang (prestaties, kaart, gebieden, garage, bezit) nu hoort; per speler en per apparaat, nooit over het net (savescope.js). |

<!-- MATRIX:END -->

## Beeld, performance, build en tooling zonder spelregel

Een deel van `game/js` is alleen beeld of techniek: de meshes (`models3d_*`, `*3d`), het terrein, de tegels, de wegen, het designsysteem (`ds-*`), de performancemeting en de tooling. Elke client bouwt zijn eigen beeld uit dezelfde data en er is geen aparte spelregel; die modules staan onder `nietCoopRelevant` in het manifest. Het Samen-gedrag van de wereld zelf (wie simuleert, wie laadt) staat bij Achtergrondverkeer en wereldstreaming.

## Gaten per epic

De lijsten hieronder zijn ook als bericht naar de leads gegaan, zodat zij ze in hun epic oplossen. De epics die nog niet in main staan (Bezit, Verhaal, Kleding, Interieurs) zijn gescand: geen enkele epic-branch voegt een nieuwe verwijzing naar `world.player` toe.

### Bezit (epic-bezit-21-11)

- De sectie Bezit ontbreekt nog in COOP-GAST.md. Eén regel per vraag a tot en met d, in de vorm van "Kleding (21-11)".
- Een testbankstap voor de claim in de suite `alles` (stap `bezitclaim`: host en gast kopen verschillend, zien elkaars omtrek, een gast werkt op andermans perceel en de eigenaar krijgt de oogst).
- Bewijs met een pure test dat de dagtik per speldag niet dubbel telt bij een hostwissel en niet bij een gast draait.
- De sponsorpanden van het voetbal (`voetbalsponsors.js`) en de Bezit-pandindex koppelen; nu staat dat open in VOETBAL-CARRIERE-VERIFICATIE-21-11.md.
- `docs/COOP-GAST.md` en `docs/COOP-DEKKING-21-11.md` (status van Bezit van gat naar OK) bijwerken zodra het gemerged is.

### Verhaal (epic-verhaal-21-11)

- Pure test dat `storybridgerun.js` niets doet bij `coopRole` client en dat een gast niet in de overgangsscene van de host vastloopt (de regel staat in VERHAAL-ANALYSE-21-11.md, de test ontbreekt).
- Bewijs dat de ontgrendelpoort (`unlockgate.js`) leest uit de progress van de speler zelf, ook voor een gast in andermans wereld (gast heeft eigen akte).
- Cutscene-deelname in de suite `alles` (stap `cutscene`): een gast ziet de scène als data en slaat hem lokaal over.
- Recap blijft alleen bij een sessie van een; de epic raakt `recapcard*` niet, houd dat zo.

### Kleding (epic-kleding-21-11)

- Een outfitwissel midden in een sessie bereikt anderen pas bij het opnieuw meedoen: voeg een `avatar`-update-bericht toe (optioneel veld, PROTO blijft) en test het.
- NPC-outfits uit rolpools (`opts.role`) zijn klaar maar niet aangesloten op voetgangers en winkeliers; ze zijn deterministisch uit zaad, dus geen netwerk, maar test dat host en gast dezelfde NPC dezelfde kleren geven.
- Testbankstap `outfit` in de suite `alles`.

### Interieurs (epic-interieurs-21-11)

- Twee spelers in dezelfde kamer zien elkaar (positie in het snapshot, avatar in het interieur).
- Het interieur komt deterministisch uit de gebouwsleutel (geen RNG-toestand), zodat host en gast hetzelfde indelen.
- NPC's en bezit in een interieur (`interiornpc`, `interiorbuy`): wie simuleert ze, wie krijgt de koop (per speler).
- Een speler binnen bij een hostwissel, en een gast die later aansluit terwijl een ander binnen is.
- De regel in COOP-GAST.md of BINNENSETS-21-11.md ("Samen spelen" bestaat al voor de binnensets; breid hem uit voor de interieurs).

### Tuning

- De onderdelen van `tuningplan.js` reizen niet mee in het bezorg-bericht (`coopbezit.js`): een bezorgde auto verliest zijn tuning in andermans wereld. Voeg een gesaneerd `tuning`-veld toe (PROTO blijft) en test het in `coopbezit_test.mjs`.
- Testbankstap `tuning` in de suite `alles`: een gast ziet de gepimpte auto van de host met zijn onderdelen en kleur.

### Voetbal (epic klaar: issues)

Zie het issue "Voetbalcarrière: koppel voetbalsamen.js aan coopnet.js en registreerWedstrijd" (derby, sponsorpanden en uitwedstrijd als reis staan erin).

## Mechanische bewaking

| Wat | Hoe | Waar |
|---|---|---|
| Geen nieuwe `world.player` | `node scripts/player_singleton_audit.mjs` (ratel, telt ook `ctx.world.player` en destructurering) | test_all licht, CI |
| Elk systeem een Samen-regel, elke nieuwe module bij een systeem | `node scripts/coop_coverage_audit.mjs` (blokkerend) | test_all licht, releasegate static |
| Opslagsleutels per speler of als wereldstaat gemarkeerd | dezelfde audit | idem |
| Echt samen spelen | testbank-suite `alles` en de pure tegenhanger `scripts/coop/all_systems_test.mjs` | sweep, zie [COOP-SWEEP-21-11.md](COOP-SWEEP-21-11.md) |

Een nieuwe module of feature toevoegen: kies het systeem in het manifest waar hij bij hoort (of voeg een systeem toe met een Samen-regel in COOP-GAST.md of in het feature-doc), draai `node scripts/coop_coverage_audit.mjs --write` en zet `--update` pas na akkoord van de coördinator op de moduleslijst.
