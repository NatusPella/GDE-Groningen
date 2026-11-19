# AAA-upgradeplan voor alle missies

Doel: "Verbeter alle missies; dat is wat ik met AAA bedoel." (eigenaarfeedback). Dit plan scoort elke missie op de code, wijst de grootste gaten aan en verdeelt het werk over een tweede ronde agents, per akte, zodat ze elkaars bestanden niet raken. Het hoort bij de issues #955 (aankleding), #956 (binnen spelen), #962 (minder QTE), #963 (wachten in een cirkel), #950 (kantoor i.p.v. weiland), en de gesloten bugs #914, #940, #968, #969, #976 (zie "Stand").

**Wat is niet gecontroleerd.** Alles hieronder komt uit het lezen van de code en de changelog (`missions_defs.js`, `missions_nieuw.js`, `missions_akte2/4/5/6.js`, `missions.js`, `cutscenes_akte*.js`, `missiedecor.js`, `racedecor.js`, `stagesets.js`, `wachtprops.js`, `sidejob_*.js`, `pg_*.js`). Er is geen Electron gedraaid en er is geen beeld bekeken: hoe iets eruitziet, klinkt of aanvoelt is **onbekend**. Een punt zegt dus "de code heeft het", niet "het is goed". Criterium 7 (geluid) is het onzekerst: de stemdekking is volledig (`node scripts/voice_coverage.mjs`: 2651 van 2651 regels, 66 alleen tekst), maar of er een sting of missie-SFX klinkt, is uit de code alleen af te leiden voor M18 tot M30 (enkele `sfx`-verwijzingen) en onbekend voor de rest. `docs/UITLEG-MET-ICONEN.md` bestaat nog niet.

## 1. Rubriek (0 tot 3 punten per criterium, maximaal 24)

| # | Criterium | 0 | 3 |
|---|---|---|---|
| 1 | **Duidelijk doel**: weet de speler wat, waar en waarom, zonder tekstmuur (kans voor een regelkaart) | alleen een intro-tekst | doel, plek, regels en tijd zichtbaar in HUD/kaart/startkaart |
| 2 | **Set-piece**: een herkenbaar hoogtepunt met regie (camera, publiek, props, timing) | geen | scène met camera, figuranten, props en een moment dat je onthoudt |
| 3 | **Juiste plek**: binnen/buiten klopt met de dialoog (#956, #950) | spel zegt "kantoor", speler staat in een weiland | binnenset of echte plek die bij de dialoog hoort |
| 4 | **Wereldvertelling i.p.v. QTE** (#962) | verhaal hangt aan timing-QTE's die falen | verhaal in scène en wereld; QTE hooguit kort en zonder falen |
| 5 | **Eerlijke moeilijkheid**: haalbaar, zichtbare regels, geen magische tegenstander | onhaalbaar of onzichtbare regel | regels zichtbaar, schadevloer, geen rubber-band-cheat, getest |
| 6 | **Wachten en overgangen** (#963): animatie en props, geen lege cirkel | lege cirkel | wachtstap heeft figuur, props en voortgang |
| 7 | **Geluid, muziek, stem**: SFX-gaten, stemdekking, sting | stil | stem plus missie-SFX plus sting bij start en afloop |
| 8 | **Beloning en afloop**: voelbaar, outro | alleen een bedrag | outro-scène, publiek of terugkoppeling, beloning in beeld |

Telregel: aanwezig in de code is 1 of 2, uitgewerkt en met regie is 3. Streefwaarde "af": 21 van 24 of meer.

## 2. Stand van het werk (wat er al is)

Gebouwd in de vorige ronde (changelog `[Unreleased]`, test erbij): `racedecor.js` (finishboog, hekken, 8 toeschouwers) alleen voor `chase`+`race` (M14, `missions.js` rond regel 2530); `missiedecor.js` met twee plannen, `naspeling` (M20) en `schuur` (M22); `stagesets.js` met vier binnensets (`kantoor`, `serverkamer` in M18, `loket` in M03, `omakeuken` in M25); `wachtprops.js` (ring plus vijf props voor elke `hold` zonder set); #962 maakte QTE's in M18, M21, M22, M24, M26 zacht of weg; #914 (M01), #940 (M15), #968 (skûtsje-sprint), #969 (koe) en #976 (biettruck) zijn dicht. Open en volgens de code grotendeels gedekt: #950 (M18 heeft nu een kantoorset; de coördinator controleert in beeld en sluit), #955, #956, #962, #963 (blijven open tot alle missies door de rubriek zijn).

## 3. Tabel per missie

Samen spelen (SS) afgekort, zie de legenda onder de tabel. K = kosten (S dagdeel, M een dag of twee, L meer), R = risico (l, m, h). Scores: c1 c2 c3 c4 c5 c6 c7 c8.

### Akte 1 (Stad)

| id | titel | scores | Σ | grootste gat | concrete upgrade | K | R | afhankelijk van | SS |
|---|---|---|---|---|---|---|---|---|---|
| M01 | Nul krassen, vijftienhonderd punten | 2 1 3 3 2 3 1 2 | 17 | set-piece: lege cirkel op de Grote Markt, geen publiek | `missiedecor.js`: plan `stuntarena` (hekken, 12 toeschouwers met telefoons, Jelmer-livestreamer) rond `stunt.center`; finishcam en puntenpop-ups bij 1500 (`stunthud.js`). | M | l | nieuw dressingplan | SS-1 |
| M02 | Even pinnen | 2 2 2 3 2 3 1 2 | 17 | plek: "garage" is een stap, geen plek | binnenset `garage` in `stagesets.js` (spuitbeurt-scène, Sjabbe achterom), zoekbalk-uitleg als regelkaart; geen nieuwe QTE. | M | m | nieuwe binnenset | SS-1, SS-3 |
| M03 | Het Loket | 3 2 3 2 3 2 1 2 | 18 | wachten: in de rij staan zonder wachtrijfiguren die bewegen | `loket`-set krijgt wachtrij van 6 figuranten (`actoranim.js` idle, kijken op horloge) en nummerscherm-SFX; keuzes blijven kort. | S | l | geluid | SS-3 |
| M04 | Kieken van boven | 3 2 3 3 2 3 1 2 | 19 | afloop: geen beeld van wat je fotografeert | zoekerbeeld en een fotokaart per doel; afsluitscène met de foto's in beeld (`cameraplan.js`). | S | l | geen | SS-1 |
| M05 | Wind tegen, beide kanten op | 2 1 3 3 2 3 1 2 | 17 | set-piece: kei-race zonder start, finish of publiek | `racedecor.js` ook voor `checkpoint`-races (`def.race === 'kei'`): startboog, finishboog, toeschouwers langs de Kei, startschot-aftelling, podiumscène. | S | l | geluid (startschot) | SS-1 |
| M06 | Het museum stond er al zo | 2 3 3 1 2 2 1 3 | 17 | QTE: fuse, lock, crack, laser en pickpocket in één missie | volg #962: fuse en crack worden E-ingedrukt-houden-op-prop met animatie en falen nooit; lock en laser blijven kort en kosten alleen argwaan; keer `heist.js` niet om, alleen de stappen. | M | h | heist.js, coopmissie_test (`iedereen: true`) | SS-1, SS-2 |

### Akte 2 (Hogeland en Wad)

| id | titel | scores | Σ | grootste gat | concrete upgrade | K | R | afhankelijk van | SS |
|---|---|---|---|---|---|---|---|---|---|
| M07 | Al het vet van Grunn | 3 2 3 3 2 3 1 2 | 19 | afloop: Jelle springt weg zonder camera | `vault`-scène: finishcam en publiek op de Oosterpoort (plan `plein`); tankwagen met zichtbare lekkende banden; chasevoortgang als balk. | S | l | dressingplan `plein` | SS-1 |
| M08 | Fatbikes tellen niet als fiets | 3 1 3 3 2 3 1 2 | 18 | set-piece: fatbikes komen van twee kanten maar er is geen regie | regelkaart ("loop, wijk uit, niet remmen"), cameramoment op de Ebbingebrug (`notes`), Oma Trijntje als wachtend figuur op de kade. | M | l | regelkaart | SS-1 |
| M09 | Heel aankomen is ook een kunst | 3 1 3 3 2 3 1 2 | 18 | set-piece en regel: eierschade is onzichtbaar tot het misgaat | zichtbare eierkratten achterop (voertuigmodel), schademeter in HUD, intro met trekker door een cinedrive-pad (`cinedrive.js`). | M | m | cutscene-voertuig | SS-1 |
| M10 | Een trekker-limo op de wierde | 2 2 3 3 2 3 1 2 | 18 | eerlijkheid: limo "kan niet" over wierdepaden, regel staat alleen in de say-tekst | regelkaart plus zichtbare afstand tot de limo; kerktuin-doorsteek als camera-moment; geen snelheidsbonus voor de limo. | M | m | geen | SS-1 |
| M11 | Geleend van de Friezen | 2 3 3 3 2 2 2 3 | 20 | doel en wachten: vier `scene`-stappen achter elkaar, doelwissels onduidelijk | skûtsje-aanleg als `boatchase` met regelkaart; wachtstap op de zandplaat krijgt figuur (Klaas met hengel) en props; behoud dek-camera. | M | m | wachtfiguur | SS-1 |
| A1 | De bietenoogst bij Hoogkerk (bijbaan, tussenstuk) | 3 1 3 3 2 3 1 2 | 18 | set-piece: truck is er (#976), de suikerhal-aankomst niet | aankomstscène bij de Suikerhal (weegbrug, kippende oplegger, SFX), publiek van twee werknemers; `bietenrules.js` blijft ongemoeid. | S | l | geluid | SS-4 |
| T1, T2 | Treinreis Warffum, bus Zoutkamp | 2 2 3 3 3 3 2 2 | 20 | doel: reisscène zonder doel-kaart | regelkaart "kijk mee, eerste en laatste acht seconden rijd je", bijrollen langs het raam (`haltefiguren.js`). Onbekend: hoe de rit eruitziet (#882, #926). | S | l | geen | SS-1 |

### Akte 3 (Eemsdelta, Oldambt, Dollard)

| id | titel | scores | Σ | grootste gat | concrete upgrade | K | R | afhankelijk van | SS |
|---|---|---|---|---|---|---|---|---|---|
| M12 | Het staat niet in het rooster | 3 2 3 3 2 3 1 2 | 19 | afloop: Jelle landt in een weiland zonder beeld | landingscène met koeien (`koe`-plan) en cameravlucht; hang-aan-het-touw als zichtbare regelkaart (W/S, touw). | S | l | geen | SS-1 |
| M13 | Het containerlabyrint | 3 2 3 2 2 2 1 2 | 17 | wachten: stil staan in de kraankooi, geen figuur | `wachtprops.js` krijgt een lopende bewaker (animatie) en ticks als bubbels; mislukken blijft "argwaan" (zie M18); camera-cue bij het wegdraaien. | S | l | wachtfiguur | SS-1 |
| M14 | De dijk | 3 2 3 3 2 3 1 2 | 19 | eerlijkheid: deurwaarder is een achtervolger met `cruise`, regel onbekend voor de speler | regelkaart ("eerst bij de sluis wint"), afstandsmeter tot de deurwaarder, finishcamera op de Delfzijl-sluis (`racedecor.js` is er al). | S | m | geen | SS-1 |
| M15 | Laag over het graan | 3 3 3 3 2 3 1 2 | 20 | afloop: landing zonder publiek, #940-fix alleen getest op papier | publiek van 10 kermisgangers bij het spandoek, landingsscène bij Roelfien; test het instappen opnieuw met de proefspeler. | S | m | geluid | SS-1 |
| M16 | Nog eentje dan | 3 2 2 3 2 3 2 2 | 19 | plek: kroeg is een deur, geen interieur | binnenset `kroeg` (bar, drie figuren, glas) voor de toast (`toast` bestaat); botsauto-moment sluit aan op A2. | L | m | nieuwe binnenset | SS-1, SS-3 |
| A2 | De kermisrit (kermis.js) | 3 2 3 3 3 3 2 2 | 21 | beloning: afloop alleen een uitslag | uitslagscène met publiek (`simambient.js`); `startkaart.js` is er al. | S | l | geen | SS-4 |
| T3 | Trein naar Winschoten | 2 2 3 3 3 3 2 2 | 20 | zie T1 | zie T1. | S | l | geen | SS-1 |

### Akte 4 (Veenkoloniën, Westerwolde)

| id | titel | scores | Σ | grootste gat | concrete upgrade | K | R | afhankelijk van | SS |
|---|---|---|---|---|---|---|---|---|---|
| M17 | Open, dicht | 2 2 3 3 2 2 2 2 | 18 | doel en wachten: bij elke brug wachten, regel alleen in tekst | regelkaart ("toeter, wacht op de fanfare"); Wubbo als figuur op elke brug met animatie; ritme-aanduiding op de HUD. | M | m | wachtfiguur, regelkaart | SS-1 |
| M18 | Wie draaide de camera's uit? | 3 3 3 2 3 3 2 2 | 21 | geluid: kantoor en serverkamer zonder eigen SFX | alleen SFX (printer, ventilatoren, scanner-piep); de rest is af. #950 in beeld controleren. | S | l | geluid | SS-1, SS-3 |
| M19 | Stoom | 3 2 3 3 2 3 2 2 | 20 | set-piece: rit zonder aankomst-regie | aankomstscène op het perron met publiek en fotograaf (`haltefiguren.js`); stoomfluit als sting. | S | l | geluid | SS-1 |
| M20 | Het beleg van Bourtange | 2 3 2 2 2 2 2 3 | 18 | plek en wachten: kruitkelder is buiten, zeven `hold`-stappen | binnenset `kruitkelder` (deuren, ton, kaars) voor de drie deuren; wachtfiguren (Jelles mannen die kloppen) i.p.v. alleen ticks; fierljep-duel als korte, nooit falende timing. | L | m | nieuwe binnenset | SS-1, SS-3 |
| M21 | Iedereen heeft een rode auto gezien | 2 3 3 2 2 2 1 3 | 18 | doel: drie soorten stappen zonder duidelijke regel | regelkaart per deel; wagonspring blijft zacht; overweg-stap met trein-camera. | M | m | regelkaart | SS-1 (solo Tessa: de gast kijkt mee) |
| T4 | De bus naar Bourtange | 2 2 3 3 3 3 2 2 | 20 | zie T1 | zie T1. | S | l | geen | SS-1 |

### Akte 5 (Westerkwartier, Stad: Ontzet)

| id | titel | scores | Σ | grootste gat | concrete upgrade | K | R | afhankelijk van | SS |
|---|---|---|---|---|---|---|---|---|---|
| M22 | Een luik erin | 2 2 3 2 2 2 1 2 | 16 | wachten en QTE: "los uit de modder" is timing, `hold` op het erf | modder-stap als `hold` met trekker-animatie en kijkende vrienden (schuur-plan staat); timing blijft kort en zonder falen; stap voor het luik in de Escapade als scène. | M | l | geluid | SS-1 |
| M23 | De colonne | 2 3 3 3 2 2 1 2 | 18 | doel en eerlijkheid: convoi met `timeLimit` x3, regel onduidelijk | regelkaart (volg de colonne, houd afstand), `cinedrive` voor de colonne in de intro; afstandsmeter. | M | m | cutscene-voertuig, regelkaart | SS-1 |
| M24 | Er hangt iets Fries aan d'Olle Grieze | 3 3 3 3 2 3 2 3 | 22 | geen groot gat (referentiemissie) | alleen SFX voor de touwen en de valpartij; gebruik als referentie voor de rest. | S | l | geluid | SS-1 |
| M25 | Het bod viel tegen | 3 2 3 3 2 3 1 2 | 19 | eerlijkheid: eierschade `failAt` 25 | schadevloer zoals #914 (de rit mag niet mislukken door een paar stoten); aankomst bij de kraam met publiek (plan `markt`). | S | m | dressingplan `markt` | SS-1, SS-3 |
| M26 | Ontzet, net als in 1672 (finale) | 3 2 3 3 2 2 2 3 | 20 | set-piece: de finale op de Grote Markt heeft geen publiek of jury | plan `snackprijs`: jurytafel, kramen, 14 toeschouwers die reageren op vuurwerk en duiven (`actoranim.js` cheer); wachtstap van 22 s met figuren; finishcamera bij de uitslag. | M | m | dressingplan `snackprijs` | SS-1 |

### Akte 6 (Nazomer) en tussenstuk

| id | titel | scores | Σ | grootste gat | concrete upgrade | K | R | afhankelijk van | SS |
|---|---|---|---|---|---|---|---|---|---|
| M27 | Inpakken | 3 1 2 3 3 2 1 3 | 18 | plek: inpakken is buiten (onbekend: staat er een binnenset?) | binnenset `woonkamer` (dozen, rustig) of de bestaande flat; drie `hold`-stappen als inpak-animatie. | M | l | nieuwe binnenset | SS-1 |
| M28 | De wisselwoning | 3 1 2 3 3 3 1 2 | 18 | set-piece: rit zonder regie | aankomstscène met buren als figuranten; voertuigdressing (verhuiswagen). | S | l | geen | SS-1 |
| M29 | Terug | 3 2 2 3 3 2 1 3 | 19 | plek en wachten: `hold` zonder props | wachtfiguur (Willemien), props op het erf; rustige sting. | S | l | geluid | SS-1 |
| M30 | Het proefbeleg | 3 2 3 3 3 2 1 3 | 20 | aankleding ontbreekt: het eerste beleg (M20) heeft tenten en publiek, dit niet | hergebruik `dressing: 'naspeling'` op de zeven `goto`- en drie `hold`-stappen met een lichte variant (een toeschouwer, geen publiek: "waar niemand het ziet"). | S | l | geen | SS-1 |
| T5 | De weg naar Bourtange | 2 2 3 3 3 3 2 2 | 20 | zie T1 | zie T1. | S | l | geen | SS-1 |

### Bijbanen en Na het verhaal die als missie voelen

| id | titel | scores | Σ | grootste gat | concrete upgrade | K | R | afhankelijk van | SS |
|---|---|---|---|---|---|---|---|---|---|
| PG-koe | De Koe van Ome Jan (`pg_koe.js`) | 2 2 3 3 2 3 2 3 | 20 | doel: de schuur is een markering, geen herkenbaar gebouw (#969 dicht, hertest) | schuur-plan (`missiedecor.js` `schuur`) en een bord "Stal Ome Jan"; regelkaart (kijk naar de koe). | S | l | geen | SS-5 |
| PG-skûtsje | Skûtsje-sprint (`pg_skutsje.js`) | 2 2 3 3 3 3 1 3 | 20 | geluid: geen startschot of brugsignaal | startschot en brug-SFX; publiek langs de Diepenring; `skutsje_fair_test.mjs` houdt de eerlijkheid. | S | l | geluid | SS-5 |
| PG-bruggen | Bruggenrace (`pg_bruggenrace.js`) | 2 2 3 3 2 3 1 3 | 19 | zie skûtsje; brugwachter als figuur | publiek op de bruggen, startschot, `racedecor.js` bij start en finish. | M | l | geluid | SS-5 |
| PG-food | Fjord Frituur-dienst (`pg_foodtruck.js`) | 3 2 3 3 2 3 2 3 | 21 | geen groot gat | alleen een wachtrij met meer figuranten en een sting bij een volle bak. | S | l | geluid | SS-5 |
| PG-fierljep | Fierljep-duel (`pg_fierljep.js`) | 3 2 3 3 3 3 2 3 | 22 | geen | referentie voor korte, eerlijke timing. | S | l | geen | SS-5 |
| BB-rij | Rechtbank, BOA, cabaret (`sidejob_*.js`) | 3 1 3 3 2 2 1 2 | 17 | set-piece: bijbaan zonder regie of figuranten | per bijbaan een korte instap-scène (`sidejobkit.js`) en één set-piece (publiek bij het cabaret, rechtszaal binnen). | M | l | binnenset `rechtszaal` | SS-4 |
| BB-weg | Taxi, bus, verhuizing, krantenwijk, vracht, boerderij, veer, tjalke, zeeschip, rondvaart | 3 1 3 3 2 2 1 2 | 17 | zie BB-rij; wachten bij klanten zonder animatie | wachtfiguur (klant met koffer) en uitzet-animatie; uitkomst-bubbel. Van veertien gecontroleerde `sidejob_*.js`-bestanden roept er geen één `cinematics` of `playScript` aan (`grep`). | M | l | wachtfiguur | SS-4 |

Legenda Samen spelen:
- **SS-1** verhaalmissie: wie het spel opende speelt; een gast kiest "Meedoen?" (J of N, geen antwoord is nee). Beloning en voortgang per speler (#429). Nieuwe aankleding is decor van de host; de gast ziet het via snapshot of EXTRA-bericht, of niet (alleen beeld, geen spelregel). Valt iemand weg of sluit later aan: de stap blijft bij de opener (`coopmissie.js`).
- **SS-2** `iedereen: true`-stappen (M06 laser en kraak): iedereen speelt lokaal, de beloning is per speler.
- **SS-3** binnenset: decor van de host (`stagesets.js`, #956); de keuzes zijn een groepsstemming.
- **SS-4** bijbaan: via `BIJBAAN_REGELS` (`coopbijbaan.js`); loon en voortgang per speler.
- **SS-5** Na het verhaal: eigen regel te controleren in `coopgast.js` (`GAST_ACTIVITEITEN`); **niet geverifieerd** in dit onderzoek.

Elke nieuwe stap of dressing krijgt een regel in de changelog en, bij een nieuwe regel, in `docs/COOP-GAST.md`; het testen van de gastkant gaat via `scripts/coopmissie_audit_test.mjs`.

## 4. Playbook: herbruikbare bouwstenen (in bouwvolgorde)

1. **Regelkaart per missiestap** (helpt c1 bij bijna alle missies). Bestaat: `startkaart.js` (kaart voor activiteiten, #678), `minigamekit.js` (`createBoard`, `mgIcoon`), `hudcards.js`. Bouw: `stage.rules: ['..','..']` (max 3 korte regels met iconen) dat de runner als kaart toont bij het begin van de stap; geen tekstmuur, geen nieuwe taal buiten de speltekst. Kost S, risico laag.
2. **Dressingplannen uitbreiden** (c2, c6, c8; M01, M05, M07, M25, M26, M30, PG's). Bestaat: `missiedecor.js` (`dressingPlan`, `buildMissionDressing`, plannen `naspeling` en `schuur`), `racedecor.js`. Bouw: plannen `plein` (markt, jury, kramen), `stuntarena`, `kade`, `perron`, `erf`; én `racedecor.js` koppelen aan `checkpoint`-races en aan `def.race` (nu alleen `chase`+`race`, `missions.js` rond regel 2530). Hergebruik `buildPersonMesh` en `actoranim.js` (idle, talk, point, cheer).
3. **Wachtfiguur en wachtanimatie** (c6, #963). Bestaat: `wachtprops.js` (`waitDressingFor`, ring plus `bank`, `kist`, `baal`, `ton`, `plant`, gekozen op label en say). Bouw: een figuur (loopt, kijkt op het horloge, rookt, wijst) met `actoranim.js`, gekozen op dezelfde regex, plus kinds `koffie`, `krant`, `hengel`. Regressie: `scripts/wachtprops_test.mjs`, `scripts/qa/wachtbeeld.mjs`.
4. **Binnensets** (c3, #956, #950). Bestaat: `stagesets.js` met `kantoor`, `serverkamer` (`office3d.js`), `loket` (`loket3d.js`), `omakeuken` (`omakeuken3d.js`). Bouw (in volgorde van winst): `garage` (M02), `kroeg` (M16), `kruitkelder` (M20), `woonkamer` (M27, M28), `rechtszaal` (bijbaan). Elke set is puur in `stageSetLayout`, getest in `scripts/stagesets_test.mjs`.
5. **Cutscene-voertuigen en camerasjablonen** (c2, c8). Bestaat: `cutscenes_akte1.js` (`cyclist`, `passer`, specs met `shots`, `wide`, `beats`), `cinedrive.js` (`smoothPath` voor gescripte auto's), `cameraplan.js`, `cinematics.js` (`startCameraTake`), stage-`cam` met `crane` (M24) en `deckCam` (M11). Bouw: sjablonen `startsein` (aftelling plus startboog), `finishcam` (volgt de winnaar, houdt vast op de boog), `aankomst` (establisher plus close-up), en een `vehicle`-prop in cutscenes die over een pad rijdt (`road: 'drive'` naast het bestaande `road: 'cycle'`, #863).
6. **QTE-beleid** (c4, #962). Bestaat: `stagetiming.js`, `stagechoice.js`, `missioncurve.js` (`CHALLENGE`, `SCENERY`) en `scripts/qte_story_test.mjs`. Regel: een QTE hoogstens drie rondes, geen `failAt`, geen `wrongFails`, nooit meer dan één per missie. Eerste klus: de vijf kraakstappen van M06.
7. **Missie-stings en SFX** (c7, c8). Bestaat: de synth in `audio.js` en `game/js/sfx/`, samples via `playSample` (`docs/GELUID.md`), verhaalregels volledig gesproken. Bouw: vaste stings voor start, checkpoint, falen, slagen op de bestaande bank (geen nieuwe opnames zonder akkoord van de eigenaar; alleen CC0); per missie hooguit twee nieuwe SFX-sleutels. Let op: `sfx/worldbank.js` en `sfx/uibank.js` zijn nu niet-ingecheckt werk van een ander; wacht op die merge.
8. **Eerlijkheidscontrole** (c5). Bestaat: `scripts/bot/proef.mjs` (faalratio over seeds, `--matrix`), `scripts/skutsje_race_sim.mjs`, `skutsje_fair_test.mjs`, `missiongoals_audit.mjs`. Bouw: per chase en race een regel "geen rubber-band boven de spelersnelheid" als test, en een zichtbare afstandsmeter.
9. **Crowd** (c2, c6, c8). Bestaat: `missionlanes.js` (`spawnCrowds` voor `def.crowds`), `coopfigures.js`, `haltefiguren.js`, `simambient.js`, de figuranten in `racedecor.js` en `missiedecor.js`. Bouw: één `crowdPlan(area, n, mood)` met reacties (klappen, juichen, wijzen) zodat de plannen uit stap 2 geen eigen figurenlijst meer meenemen.

Volgorde: 1 en 2 helpen de meeste missies (c1, c2); 3 en 7 zijn goedkoop en raken alle `hold`-stappen en alle afloop; 5 en 9 hebben stap 2 nodig; 4 is duur en gaat per missie.

## 5. Uitvoeringsplan

**Regels voor alle agents** (`AGENTS.md`): eigen worktree en branch, kleine commits, geen push of merge, alleen `node --check` plus de tests die bij de wijziging horen; de coördinator draait de volle suite, de Electron-run en de proefspeler. Groter werk (een bouwsteen of een binnenset) plan je met specsmd FIRE en voer je uit met UltraCode (`docs/SPECS-FIRE.md`). `missions.js` (3882 regels, de runner) mag maar één agent tegelijk wijzigen: de bouwstenenagent. Missieagents wijzigen alleen defs (data) en voegen `dressing:`, `set:`, `rules:` toe. Twee agents mogen in één defs-bestand als ze andere missies raken (aparte hunks, de coördinator merget). `cutscenes_akte4.js` bevat ook M22 tot M26: dat bestand krijgt één eigenaar (akte 4 en 5 samen, of een nieuw `cutscenes_akte5.js`, geen verdeling op regels).

**Golf 0, bouwstenen (eerst, parallel, geen overlap):**
- G0a: `racedecor.js`, `missiedecor.js`, `wachtprops.js`, `crowd` plus de runnerhaken in `missions.js` (stappen 1, 2, 3, 9 van de playbook).
- G0b: `cutscript.js`, `cutscenehost.js`, `cinedrive.js` (camera- en voertuigsjablonen, stap 5).
- G0c: stings en SFX (stap 7), na de merge van de niet-ingecheckte banken.

**Golf 1, per akte, parallel na G0a (grootste winst eerst):**
- **A1 Akte 1** (bestanden `missions_nieuw.js` M01 en M03, `missions_defs.js` M02, M04, M05, `cutscenes_akte1.js`, M06 in `missions.js`/`heist.js` pas na G0a): M05, M01, M06 (QTE's), M02 (garage-set), M04, M03.
- **A2 Akte 2 en A1-bieten** (`missions_akte2.js`, M07 en M08 in `missions_defs.js`, `cutscenes_akte2.js`, `sidejob_bieten.js`): M09, M08, M10, M07, M11, A1.
- **A3 Akte 3 en A2** (`missions_nieuw.js` M13 tot M15, M12 en M16 in `missions_defs.js`, `cutscenes_akte3.js`, `kermis.js`): M13, M16 (kroeg-set), M14, M12, M15, A2.
- **A4 Akte 4 en 5** (`missions_akte4.js`, `missions_akte5.js`, M21, M24, M25, M26 in `missions_defs.js`, `cutscenes_akte4.js`, nieuwe sets in `stagesets.js`): M22, M26, M20 (kruitkelder), M17, M23, M21, M25, M19, M18, M24.
- **A5 Akte 6** (`missions_akte6.js`, `cutscenes_akte6.js`): M30, M27, M28, M29, T5.
- **A6 Bijbanen en Na het verhaal** (`sidejob_*.js`, `pg_*.js`, `sidejobkit.js`): BB-rij en BB-weg (instap-scène en wachtfiguur), PG-bruggen, PG-skûtsje, PG-koe.

**Tests en beeldchecks per missie** (de agent draait alleen de eerste regel en de gerichte tests; de rest is voor de coördinator, één Electron tegelijk, met een slot):
- Pure tests bij de akte: `node scripts/akte1_doelen_test.mjs` en de `akte2` tot `akte6_test.mjs` en `cutscenes_akteN_test.mjs`; plus `missiedecor_test`, `racedecor_test`, `stagesets_test`, `wachtprops_test`, `qte_story_test`, `missiongoals_audit`, `coopmissie_audit_test`, `node scripts/voice_coverage.mjs --quiet`, `node scripts/spec_check.mjs`, `node scripts/docs_index_test.mjs`.
- Proefspeler: `node scripts/bot/proef.mjs --missies=Mxx --mens --slot --out=.scr/proef/mxx` (ook `A1`, `A2`; meer seeds voor de faalratio met `--seeds=1,2,3`). Een run zonder blokkade: geen `stuck`, geen `vast`, geen faalratio boven de helft.
- Beeld: `node scripts/qa/cutscene_shots.mjs --only=Mxx` voor de scènes en `node scripts/qa/wachtbeeld.mjs --jobs=...` voor de wachtstappen; de beoordeling van de beelden gaat in het issue ("nog niet bekeken" tot iemand ze zag).

**Definitie van "af" per missie:** (1) rubriek 21 van 24 of meer, geen enkel criterium onder 2, opnieuw gescoord in het issue; (2) een proefspeler-run zonder blokkade en zonder detectormelding van ernst hoog; (3) de beeldcheck is beoordeeld (een mens of een vision-reviewer) en genoteerd; (4) changelogregel in het Nederlands, Samen spelen-regel genoteerd, tests groen.

## 6. Top 10 snelle winsten (kosten S, hoge impact)

1. **M05**: `racedecor.js` ook voor `checkpoint`-races (start- en finishboog, toeschouwers); een paar regels in de runner plus een test.
2. **M26**: `dressing: 'plein'` op de eerste `hold`-stap (jurytafel, kramen, toeschouwers) en een finishcam bij de uitslag.
3. **M01**: `stuntarena`-plan (hekken, 12 toeschouwers) rond `stunt.center`.
4. **M30**: `dressing: 'naspeling'` op de bestaande stappen (één regel per stap, alleen beeld).
5. **Wachtfiguur in `wachtprops.js`** voor elke `hold` (M03, M13, M20, M26, M29): een lopende of wijzende figuur.
6. **Regelkaart** (`stage.rules`) voor M17, M10, M14, M08: drie korte regels met iconen, bestaand HUD-kaartbudget.
7. **M13**: bewaker die zichtbaar wegloopt in de kraankooi (`ticks` als bubbels), mislukken blijft argwaan.
8. **M25**: schadevloer voor de eieren (zoals #914), zodat de rit niet mislukt door een paar stoten.
9. **M19**: aankomstscène met publiek en fotograaf op het perron (`haltefiguren.js`) en een stoomfluit.
10. **M15**: publiek bij het spandoek en bij de landing; daarna de proefspeler opnieuw op het instappen (#940).

## 7. Open punten en risico's

- De scores zijn code-gebaseerd en royaal waar een systeem aanwezig is; het eerste beeldwerk kan scores omlaag brengen (vooral c2 en c6).
- M06 en `heist.js` hebben twee takken (`sluip`, `vermomd`) en `iedereen: true`: elke wijziging moet `coopmissie_test` en `missioncheckpoint_test` groen houden.
- Binnensets zijn de duurste post (L): begin met M02 (garage), niet met alles tegelijk.
- Nieuwe spraak is niet gepland (`docs/verhaal/nieuw/00-OVERZICHT.md`: TTS-kosten voorlopig niet opnemen); nieuwe regels in scènes zijn alleen tekst en tellen als "vrijgesteld" in `voice_coverage`.
- Nergens in dit plan staat een echte merknaam of persoon; nieuwe dressing gebruikt verzonnen namen (zie `AGENTS.md`, constitution 2).
