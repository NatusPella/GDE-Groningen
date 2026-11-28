# Audit voetbal tegen de gewenste diepte (#1374, 28-11)

> Status: audit, alleen lezen. Peildatum: `origin/main` op `b052fdd25` (28-11). Gecontroleerd door de code te lezen, de pure voetbaltests te draaien en tegen `docs/verhaal/bijbel-28-11/02-loopbanen.md` (§2) en `01-verhaal-en-personages.md` te leggen. **Niet in beeld bekeken**: er is geen Electron of beeld gedraaid. Alles over wat de speler ziet komt uit code en docs, niet uit een scherm.
> Tests die ik draaide en die groen zijn: `voetbal_carriere_test` (14 groepen), `voetbal_seizoen_test` (9), `voetbal_transfers_test` (12), `voetbal_samen_test` (11), `voetbal_beats_test` (8), `voetbalparken_test` (9). De `ExperimentalWarning` over `localStorage` in de uitvoer is ruis van node, geen fout.

## 0. Samenvatting

De voetbalcarrière is mechanisch bijna compleet en puur getest: profiel, seizoenen van zeven rondes, drie divisies met promotie en degradatie, beker, Waddenbeker, transfers met AI-clubs, contracten, sponsors, clubbezit, Trainer en Manager, 281 echte sportparken, en een Samen-spelen-laag voor de wedstrijd zelf. Wat **ontbreekt is het verhaal eromheen en drie stukken diepte**: (1) een geschreven aanleiding en rangenboog met bijfiguren (nu vier regels dialoog in `careerdebut.js` en tien korte appjes in `voetbalbeats.js`), (2) een transfermarkt met scouting en een eigen transferverhaal in plaats van één automatisch bod, en (3) Samen spelen op clubniveau (gedeelde club, competitie tussen clubs van mensen, handel).

Daarnaast zijn er **vier botsingen met bestaande regels en canon** die vóór de bouw besloten moeten worden (§4.1): de naam "SC Noorderlicht" en "VV De Hoek" tegen de verboden voorvoegsels van ADR 0043, drie verschillende namen voor dezelfde dorpsclub en voorzitter in de bijbel zelf, en de startplek van de carrière die nu vast op Paddepoel staat in plaats van in een Hogeland-dorp.

## 1. Wat bestaat (bestanden en regels)

Regelaantallen zijn uit `wc -l`; veel regels zijn lang, dus de bytes tellen mee voor het risico (§5). Alles in `game/js/`.

### 1.1 Kern van de carrière (puur, geen DOM)

| Onderdeel | Bestand (regels, bytes) | Wat er staat | Test |
|---|---|---|---|
| Profiel en regels | `voetbalcarriere.js` (584, 46 kB) | `createCareer` r41, `openSeason` r62, `playEvent` r182, `advanceDays` r262, `finishSeason` r291, `promoteRoles` r434 (aanvoerder vanaf seizoen 3, Trainer vanaf 4, Manager na twee Trainerseizoenen of aandeel-klaar), `acceptOffer` r441, `managerBuy/Renew/Sell` r489 tot 516, `clubDividends` r344, opslag `serialize/normalize` r533 | `voetbal_carriere_test` |
| Seizoen en divisies | `voetbalseason.js` (210) | 7 rondes (r9), `endSeason` r95 (twee omhoog, twee omlaag, pool vult de Talentenklasse), knock-outs (Dijkbeker, Waddenbeker) r128 tot 185, `baseStrength` r190 | `voetbal_seizoen_test` |
| Agenda | `voetbalagenda.js` (38) | een ronde per 3 speldagen, pauze van 3 dagen (`BREAK_DAYS` r7), `MAX_CATCHUP_DAYS` 40 | `voetbal_carriere_test` |
| Clubs | `voetbalclubs.js` (51) | 8 Kroonklasse (`stadion: 'euroborg'`), 8 Terpklasse, 16 verzonnen Waddenbeker-clubs; `CLUBS.length === 16` wordt in drie tests afgedwongen | `voetbal_spelers_test` r70-89, `voetbal_seizoen_test` r127, `voetbal_transfers_test` r101 |
| Lokale clubs en velden | `voetbalparken.js` (89) en `voetbalparkendata.js` (2 regels, 27,8 kB data) | 281 parken bij 139 plaatsen; één club per plaats uit acht naamsjablonen (r12 tot 21); `localDivision` (r61) neemt de 8 dichtstbijzijnde plaatsen bij `home`; `HOME_FALLBACK` is het huis in Paddepoel (r84); `travel` r72 (tot 15 km één speldag, daarboven twee) | `voetbalparken_test` |
| Spelers | `voetbalplayers.js` (180), `voetbalontwikkeling.js` (100) | vijf vaardigheden, verborgen potentieel, ervaring, vorm, vermoeidheid, blessure (nooit getoond, max 3 speldagen); **geen leeftijd** (r128 zegt het met zoveel woorden) | `voetbal_spelers_test`, `voetbal_ontwikkeling_test` |
| Transfers | `voetbaltransfers.js` (168) | markt van 14 transfervrije spelers (`freeAgents` r21), `aiRound` r55 (AI-clubs kopen deterministisch), `buyPlayer/sellPlayer`, contracten 1 tot 3 seizoenen, `agentAdvice` r162 (Tammo als zaakwaarnemer), `offerFor` r121 | `voetbal_transfers_test` |
| Coach | `voetbalcoach.js` (56) | coachwedstrijd met alleen computerspelers, tactiek onderweg | `voetbal_coach_test` |
| Sponsors en clubbezit | `voetbalsponsors.js` (90), `voetbalclub_bezit.js` (54), `voetbalbezit.js` (46), `clubui.js` (191) | sponsorsleuven als parodiebedrijven met pand in de wereld; aandelen, dividend, tribunes; tabblad Club | `voetbal_sponsors_test`, `voetbal_bezit_test`, `clubui_test` |
| Beats | `voetbalbeats.js` (75) | tien appjes B1 tot B10, max 14 woorden, per speler anders (Tessa of Tammo), `nextBeat`, `markBeat` | `voetbal_beats_test` |
| Poort | `voetbalpoort.js` (16) | carrière opent in akte 4 via `unlockgate.js` | `voetbal_beats_test` |
| Samen spelen | `voetbalsamen.js` (89) | `MAX_PER_TEAM` 4, `LEVEL_CAP` per klasse, `clampGuestFactors` r13, `encodeRatings/decodeRatings`, `deriveTeams` (derby) r60, `dropOut` r73, `guestReward` r76, `guestCareerExtra` r85 | `voetbal_samen_test`, `coopwedstrijd_voetbal_test` |

### 1.2 Wedstrijd, scherm en wereld

| Onderdeel | Bestand (regels, bytes) | Opmerking |
|---|---|---|
| Wedstrijdsim 5 en 11 tegen 11 | `voetbalmatch.js` (728, 46 kB), `voetbalrules.js` (171), `voetbalai.js` (208), `voetbalbal.js` (103), `voetbalextrarules.js` (165) | `voetbalmatch.js` is ook in 24-11 niet meer gewijzigd |
| Spelmodule met 3D, HUD, netwerk | `voetbal.js` (1114, **75 kB**) | het veld staat standaard in de Euroborg (CX, CY r66), bij een carrièrewedstrijd op het park van de thuisploeg (r71, `pitchPlacement`); `plekTekst` r665 kent Euroborg of sportpark. Importeert 40+ modules (r1 tot 56). Laatste maand 4 commits: de drukste voetbalfile |
| Carrièrescherm | `voetbalcarriereui.js` (374, 45 kB) | tabs Overzicht, Selectie, Tactiek, Stand, Kalender enz. (r29); acties `play`, `sim`, `train`, `coach`, `buy/sell/renew`, `offer:accept/decline` (r335 tot 365) |
| Live-laag (opslag, nachten, beats, betalen) | `voetbalcarrierelive.js` (253) | opslag in `gde-voetbalcarriere-v1`, nooit in een savegame; `updateBeats` r207, `advance` r132 |
| Wereldlaag | `voetbalworld.js` (118), `voetbalpubliek.js` (181), `voetbalregie.js`, `voetbalpresentatie.js`, `voetbalcommentaar*.js`, `footballkit.js`, `footballmusic.js` | shirts, publiek 30 tot 140 op een park en 600 tot 2000 in de Euroborg, commentaar, muziek, tv-laag |
| Training | `voetbaltraining.js`, `voetbaltrainingrun.js`, `voetbaltraining3d.js` | vijf minigames |
| Begincutscene | `careerdebut.js` (334) en `careerdebutrun.js` | `FOOTBALL_LINES` r31 tot 59: **de eerste training**, niet de invalbeurt; sprekers `Tammo`, `Anita` (interne naam van Tessa), `Trainer Eppo` zonder achternaam. Het bestand deelt het boerenbegin (`FARM_LINES`, `farmSpec`) met de boer-loopbaan |
| Verhaalstappen | `storyarc_nieuw.js` r384 | voetbalverhaallijn V1 tot V3 (#1179): shop- en reisdoelen in akte 4, **geen voorwaarde** voor de carrière |
| Oude Euroborg-sim | `voetbalcompetitie.js` (84), `voetbaldata.js` (19) | zes clubs, `MIJN_CLUB = 'stadjers'`; apart van de carrière; Hilbrand (verslaggever) en Oma Trijntje (tribune, nu Tessa's oma volgens besluit 4 van 28-11) staan hier |

### 1.3 Wat de canon al gebruikt

Hilbrand en Roelie (commentaar), Oma Trijntje (tribune, `voetbalbeats.js` r17, `voetbalcommentaardata.js` r29), Tammo als zaakwaarnemer (`agentAdvice`), Trainer Eppo (alleen een voornaam in `careerdebut.js`).

## 2. Wat ontbreekt tegen de gewenste diepte

Genummerd tegen `02-loopbanen.md` §2 en issue #1374. Geverifieerd met `grep` op `Noorderlicht`, `Gladiolen`, `Albert`, `Teuben`, `Rozema`, `Remco`, `Kleibijter` in `game/js`, `scripts` en `docs`: **geen enkel van die namen staat in de code**; `Noorderlicht` komt alleen voor als bootnaam (`boattypes.js` r63) en als advertentienaam in een test.

| # | Ontbreekt | Wat er nu is | Omvang |
|---|---|---|---|
| 1 | **De invalbeurt als aanleiding.** Een zondag bij de dorpsclub, de linksbuiten ligt eruit, Tessa valt in, Tammo is grensrechter en wordt bestuurslid; clubhuis met bord en foto | `careerdebut.js` begint bij de eerste *training* in de Talentenklasse met Trainer Eppo; geen wedstrijd, geen clubhuis, geen Albert | M |
| 2 | **De boog per rang met bijfiguren** (Eppo Rozema, Albert Teuben, Remco Zwart, Jan Kleibijter, Hilbrand, Femke de keeper, Jelle's brief per seizoen) | tien appjes; `LEVELS` r22 in `voetbalcarriere.js` (Talent, Selectiespeler, Basisspeler, ...) zijn spelmechaniek, geen verhaalrangen; geen scènes per rang | M |
| 3 | **Een geschreven eigen dorpsclub** met vaste naam, plek op het Hogeland en eigen clubhuis | alle lokale clubs komen uit acht naamsjablonen (`TEMPLATES` r12), voor de speler is de thuisclub gewoon de dichtstbijzijnde bij Paddepoel (`HOME_FALLBACK`, r84; `createCareer` r41 neemt `home` al als optie) | S |
| 4 | **SC Noorderlicht als Euroborg-club van de speler.** Eigen club met verhaal, shirt, bestuur | de acht Kroonklasse-clubs zijn vast; de speler komt in de Kroonklasse via `offerFor` r121, dat altijd de *zwakste* club boven je neemt die sterker is dan de huidige (`list.find(k => k.sterkte > mine)`). Geen keuze, geen verhaal | M |
| 5 | **Transfermarkt met scouting.** Dossiers, interesse van clubs, zichtbare transferperiode | de markt is een lijst van 14 transfervrije spelers (`freeAgents`); `managerBuy/Sell/Renew` werken alleen in de pauze (`inBreak`: 3 speldagen); je kunt geen speler van een andere club kopen, en de speler zelf krijgt hooguit één bod per seizoen (`c.offer`, `acceptOffer` r441) | M |
| 6 | **Eindeloze modus à la FIFA.** Veel meer speelmomenten, een seizoen automatisch doorspelen, nieuwe generaties | seizoenen lopen oneindig door (`seasonNr++` in `finishSeason`, geen einde), maar: geen "seizoen uitrekenen"-knop (alleen `sim` per wedstrijd, `actie 'sim'` r341), een ronde per drie speldagen, geen leeftijd of pensioen (r128), geen nieuwe spelers uit de jeugd. De simdoc zegt zelf "twee wedstrijden na elkaar met automatisch doorgaan: niet gedaan" | S plus M |
| 7 | **Velden door de provincie als reis.** Uitwedstrijd als rit met bus, trein of taxi, de supportersbus als bijbaan | de wedstrijd start vanuit het menu en zet de speler naar het park (`voetbal.js` r71); `travel()` rekent alleen speldagen (één of twee); de verificatie zegt zelf: "de reis via de kaart met reisopties is niet gebouwd" (punt 8) | M |
| 8 | **Samen in dezelfde club.** Gedeelde clubkas, gedeelde trainingsavond | elke speler heeft een eigen profiel (`gde-voetbalcarriere-v1`, nooit gedeeld); in een wedstrijd zitten gasten in jouw team (`voetbalsamen.js`), maar hun club, kas en competitie zijn niet verbonden. Er is geen gedeelde clubkas-structuur | M |
| 9 | **Tegen elkaar op clubniveau.** Een competitieronde tussen de clubs van mensen; handel met twee kassen | alleen de derby in één wedstrijd (`deriveTeams`); elkaars clubs bestaan niet als clubs | M |
| 10 | **Sportdag over meerdere sporten** (padel, golf, voetbal) | `padel.js` (1415 regels) en `loopbaan.js` hebben aparte vakken met teller en titels; niets verbindt ze | S |
| 11 | **Stem** voor de boog | commentaar is deels ingesproken; de nieuwe boog is nog niet geschreven | L (aparte ronde, TTS-achterstand) |
| 12 | **Beeldverificatie van wat al gebouwd is.** Acceptatie 1 van #1374: "eerst een audit van de bestaande carrière in beeld" | `docs/VOETBAL-CARRIERE-VERIFICATIE-21-11.md` r31 tot 46 en r92 noemen een lange lijst "nog niet bekeken" (carrièrewedstrijd op het park, trainingsvelden, kaartlaag, sponsorpanden, publiek in de Euroborg, perfmeting). Deze audit heeft dat **niet** gedaan en kan het niet zonder Electron | coördinator |

## 3. Wat te hergebruiken (dus niet opnieuw bouwen)

- **Aanleiding en scènes:** `careerdebut.js` heeft de volledige keten (regels, regie-spec voor `missionScene`, tijdlijn met `ov`, blokkades `debutBlockers`, `debutDecide`, `clubLook`, `teamLooks`) en `careerdebutrun.js` speelt hem af. De invalbeurt is een tweede scène-id naast `FOOTBALL_ID` en gebruikt dezelfde machinerie, de stemlijst (`DEBUT_LINES` wordt door `voicelines_collect.mjs` gelezen) en het Samen-spelen-patroon (scène als data naar gasten via `coopcut.js`).
- **Appjes met verhaal:** `voetbalbeats.js` heeft `when(c)`-triggers, per-speler tekst, hooguit één per speldag en `markBeat` (bitmasker in `c.flags.beats`, max 31 beats). Nieuwe rangmomenten kunnen hier als extra beats of in een nieuwe module met dezelfde vorm.
- **Rangen:** `LEVELS`, `levelOf` (r108), `promoteRoles` (r434), `c.stats.promotions/titles/seasons`, `c.flags.captain`, `c.flags.moved` zijn de bestaande triggers voor "Selectie", "Doorbraak", "Transfers en kapitein", "Trainer en Manager".
- **Clubs en velden:** `index.byId`, `clubPlace(id)` (live r36), `terpParks` (r67), `pitchPlacement` (r77) en `localDivision` met `home`. Een vaste verhaalclub is een override in `clubForPlace` (r35) of in `createCareer`.
- **Transfers:** `offerFor`, `acceptOffer`, `T.buyPlayer/sellPlayer/renewPlayer/agentAdvice`, `settleSeason`, `aiRound`. De exploit-audit van `voetbal_balans_test.mjs` (koop-verkoop geeft altijd verlies, clubkassen behouden) blijft de vangrail voor scouting en markt.
- **Seizoen automatisch:** `S.playOut` en `finishSeason` rekenen al een heel seizoen uit; `advanceDays` doet dat bij een lange afwezigheid. Een knop "Seizoen uitrekenen" is dus UI en een regel voor de beloning (60% ervaring, `SIM_XP`), geen nieuwe sim.
- **Samen spelen:** `voetbalsamen.js` (indeling, klemmen, beloning per speler, wegvallen), `multiplayerwedstrijd.js` (933 regels, de uitnodiging en EXTRA-berichten, `maakUitnodiging` r293), `docs/COOP-GAST.md` r579 tot 594 (de zes vragen voor de carrière staan er al), `coopwedstrijd_voetbal_test.mjs`. **Het protocol (`net/protocol.js`) blijft ongewijzigd**: nieuwe clubberichten moeten via het bestaande EXTRA-bericht of de start-`v`.
- **Tests om uit te breiden:** `voetbal_carriere_test` (163 regels), `voetbal_transfers_test`, `voetbal_balans_test` (173), `voetbal_ui_test` (223), `voetbal_samen_test`, `voetbal_beats_test`. De bestaande botsim `scripts/voetbal_carriere_sim.mjs` kan een volledige loopbaan tot de Euroborg bewijzen.

## 4. Risico's

### 4.1 Besluiten die vóór de bouw moeten vallen (canon en regels)

1. **"SC Noorderlicht" en "VV De Hoek" botsen met ADR 0043.** `voetbalclubs.js` r2 en `voetbalparken.js` r3 verbieden de voorvoegsels VV, SV, FC, SC en RKSV; `scripts/voetbal_verboden.mjs` r2 heeft `VV` en `SC` in `FORBIDDEN_CLUB_WORDS`; `voetbal_spelers_test.mjs` r80 en `voetbalparken_test.mjs` r30 keuren elke naam die ermee begint af. De eigenaar heeft de club SC Noorderlicht op 28-11 akkoord gegeven (`01-verhaal-en-personages.md` r723), maar de ADR en de tests zijn niet bijgewerkt. Voorstel: ADR 0043 krijgt een wijziging "twee verhaalclubs met voorvoegsel zijn toegestaan (SC Noorderlicht, de dorpsclub)", de tests nemen een witte lijst (`STORY_CLUB_IDS`) en `voetbal_verboden.mjs` blijft voor alle andere clubs gelden. Dit hoort in dezelfde commit als de code (AGENTS.md).
2. **Drie namen voor dezelfde dorpsclub en voorzitter.** `02-loopbanen.md` (r159 tot 192) zegt "De Hogelander Gladiolen", Voorzitter **Albert Bos** en trainer **Meester Klaas**. `01-verhaal-en-personages.md` (r191, r238 tot 239, r368) zegt **"VV De Hoek"**, Voorzitter **Albert Teuben** en trainer **Meester Eppo Rozema**, en de tabel op r238 bevestigt dat Teuben en Rozema de gelijkgetrokken namen zijn. De code heeft al "Trainer Eppo". Deel 01 wint (nieuwer, door de eigenaar vastgesteld); deel 02 §2 moet bij de eerste bouwtaak mee worden gecorrigeerd. Ook "Remco Zwart" (rivaal, alleen deel 02) en "Jan Kleibijter" (alleen deel 02, en `De Kleibijters` is al een Terpklasse-club in `voetbalclubs.js`) hebben geen plek in deel 01: vraag aan de eigenaar of ze blijven.
3. **Startplek.** `createCareer` (r41) plaatst de speler bij het dichtstbijzijnde park vanaf Paddepoel. De aanleiding speelt op het Hogeland (`01` r368) en de eerste training in Veendam. Zonder aanpassing begint de speler dus bij een stadsclub. Oplossing: `createCareer({ home })` krijgt het dorp van de verhaalclub (de optie bestaat al); de Talentenklasse wordt dan de acht dichtstbijzijnde plaatsen bij dat dorp.
4. **Poort.** `voetbalpoort.js` opent de carrière in akte 4. De bijbel (`03`, r114) laat de invaller bij H6 liggen. Controleer dat de invalbeurt niet vóór akte 4 kan beginnen, of dat de poort mee verschuift (`unlockgate.js` is gedeeld met de boer).

### 4.2 Technische risico's

- **Grote bestanden en botsing.** `voetbal.js` (75 kB, 1114 regels), `voetbalcarriere.js` (46 kB), `voetbalmatch.js` (46 kB) en `voetbalcarriereui.js` (45 kB) hebben lange regels; een merge-conflict is daar duur. De werkbrief zegt "één loopbaan per worktree" en de issue zegt het ook. **Alle taken hieronder die `voetbalcarriere.js`, `voetbalcarriereui.js` of `voetbal.js` raken, moeten dus na elkaar of in één worktree, niet parallel.** Nieuwe pure modules (`voetbalverhaal.js`, `voetbalscouting.js`, `voetbalsamenclub.js`) beperken dat.
- **`careerdebut.js` wordt gedeeld met de boer-loopbaan** (#1373, `FARM_LINES`, `farmSpec`, `firstParcel`). Beide issues willen dit bestand uitbreiden. Afspraak: de invalbeurt komt in een nieuw bestand `careerdebut_voetbal.js` (of de boer in een eigen) en `SCENES` (r96) krijgt alleen een regel erbij.
- **Hardgecodeerde tellers.** `CLUBS.length === 16` in drie tests en `clubsOf(d).length === CLUBS_PER_DIVISION` (8). SC Noorderlicht moet dus een *vervanging* zijn van een bestaande Kroonklasse-club (voorstel: vervang `domtorenaars` of `hunebedders`, de zwakste twee, sterkte 66 en 69), geen toevoeging; anders breken `voetbal_spelers_test`, `voetbal_seizoen_test` en `voetbal_transfers_test`. Andere clubs die in `02` worden genoemd (Wadlopers, Ommelanders, Veenpiraten, Kleibijters, Palingtrappers, Hunebedders, De Stadjers) bestaan alle in `voetbalclubs.js`.
- **Balans.** Een extra transfermarkt of gratis scouting raakt de economie die `voetbal_balans_test` bewaakt (koop-verkoop moet verlies blijven; `SELL_FACTOR` 0,8 en `TAX` 0,1 in `voetbaltransfers.js` r9). Elke taak die geld verplaatst moet die test mee laten lopen.
- **Opslag en saves.** Het profiel heeft `VERSION = 1` (`voetbalcarriere.js` r17) en `normalize` (r536) migreert. Nieuwe velden (verhaalvlaggen, scoutinglijst, gedeelde club) moeten daar een standaardwaarde krijgen, anders breken oude profielen (AGENTS.md: "laat saves nooit stuk gaan").
- **Samen: de host kan wisselen (#439).** Een gedeelde clubkas mag niet aan de host hangen. Voorstel: de kas is een geordend grootboek met speler-id, bedrag en volgnummer, door iedere deelnemer lokaal bijgehouden en bij samenvoegen deterministisch opgelost (zoals `claimWinner` in `voetbalclub_bezit.js` r54 al doet). Dit is het grootste ontwerprisico en hoort bij #1380 (Samen bij loopbanen), dus overleg met die taak.
- **Eigen voortgang (#429).** Alle verhaalvlaggen en rangen staan per speler in het profiel; een gast die de aanleiding mist krijgt de terugblik van Albert (`02` r167). Geen nieuwe `w.player`-aanname: nieuwe code gebruikt `hoofdspeler()` of krijgt de speler als parameter.
- **Stem.** Elke nieuwe regel hoort in de stemlijst; `voice_coverage.mjs --quiet` zal falen als dat ontbreekt. Plan dialoog eerst in aantallen (bijbel §9 punt 1).
- **Beeld.** Alles wat de speler ziet (clubhuis, bord, foto, Euroborg-avond) vraagt beeldcontrole; agents zonder Electron kunnen dat niet. Zet "nog niet bekeken" in elk issue.
- **Constitution.** Geen echte clubs, spelers of merken; "Grunn"; altijd zomer (geen winterstop; `BREAK_DAYS` is een zomerpauze); geen getoond leed (blessures zijn al nooit getoond).

## 5. Opdeling in bouwtaken (maximaal M)

Notatie: **S** = klein, **M** = middelgroot. Elke taak heeft een eigen worktree; geen push of merge door de agent. Alle taken draaien na afloop `node --check`, `voice_coverage.mjs --quiet`, `rules_audit.mjs --from=origin/main` en `spec_check.mjs`.

### Volgorde en parallel

```
V0 (S, besluiten + namen) ──► V1 (M, verhaaldata + beats) ──┬──► V3 (M, rangenboog en Euroborg) ──► V5 (M, scouting)
                                                            │                                          │
V2 (M, invalbeurt-scène)  ◄── V0                            │                                          ▼
                                                            └──► V4 (S, seizoen uitrekenen)        V6 (M, reizen)
V7 (M, gedeelde club) ◄── V1, na #1380-ontwerp
V8 (M, competitie en handel) ◄── V7
V9 (S, sportdag) ◄── onafhankelijk
V10 (S, beeldronde) ◄── na V2 en V3, coördinator
```

**Parallel kan:** V1 met V2 (andere bestanden), V9 met alles, en V4 met V1 of V2 (V4 raakt `voetbalcarriereui.js` en `voetbalcarriere.js` niet als de knop alleen `advanceDays` aanroept; zie V4). **Niet parallel:** V3, V4, V5, V6 raken `voetbalcarriere.js`, `voetbalcarriereui.js` of `voetbal.js`; draai ze na elkaar. V7 en V8 zitten in `voetbalsamen.js` en nieuwe modules en wachten op de besluiten van #1380.

### V0: Namen, ADR en canon (S)
- **Doel:** de vier besluiten van §4.1 vastleggen zodat de rest niet over namen struikelt.
- **Bestanden:** `.specs-fire/standards/adr/0043-parodienamen-voor-voetbalclubs.md` (wijziging), `scripts/voetbal_verboden.mjs`, `scripts/voetbal_spelers_test.mjs` (r80), `scripts/voetbalparken_test.mjs` (r30), `game/js/voetbalclubs.js` (vervang één Kroonklasse-club door `sc-noorderlicht`, `stadion: 'euroborg'`, sterkte ongeveer 67), `game/js/voetbalparken.js` (vaste verhaalclub voor het dorp; sterkte en palet), `docs/verhaal/bijbel-28-11/02-loopbanen.md` §2 (namen gelijktrekken met deel 01), `docs/VOETBAL-CARRIERE-21-11.md` bijlage A.1.
- **Tests:** `voetbal_spelers_test`, `voetbalparken_test`, `voetbal_seizoen_test`, `voetbal_transfers_test`, `voetbal_balans_test` (de balans verschuift licht met een andere sterkte), `scripts/voetbal_verboden.mjs` via `text_audit`.
- **Open vraag aan de eigenaar:** welk dorp is de dorpsclub (Hogeland), blijven Remco Zwart en Jan Kleibijter?

### V1: Verhaaldata, bijfiguren en beats (M)
- **Doel:** één pure module met de rangen (zes uit `02` r171 tot 180), de bijfiguren, hun regels en de triggers; de tien bestaande beats worden daaraan gekoppeld.
- **Bestanden:** nieuw `game/js/voetbalverhaal.js` (puur: rangen, cast, regels, `when(c)`), `game/js/voetbalbeats.js` (verwijzing, extra beats; let op de 31-beats-grens van het bitmasker), `game/js/voetbalcarriere.js` (alleen `normalize` voor nieuwe vlaggen, klein), nieuw `scripts/voetbal_verhaal_test.mjs`, `docs/COOP-GAST.md` (Samen-regel), `CHANGELOG.md`.
- **Tests:** nieuwe test bewijst gedrag (een carrière die rang 3 haalt krijgt de beat, één per speldag, niet tijdens een scène, per speler), `voetbal_beats_test`, `voetbal_carriere_test` (migratie van een oud profiel).
- **Samen:** rangen en vlaggen zijn per speler; gast krijgt de terugblik (zie V2).

### V2: De invalbeurt (aanleiding) als scène (M)
- **Doel:** zondag bij de dorpsclub: de uitval, Tessa valt in, Tammo als grensrechter en bestuurslid, het clubhuis met bord en foto; daarna loopt de bestaande eerste training door.
- **Bestanden:** nieuw `game/js/careerdebut_voetbal.js` (regels, regie-spec, `invallerDue`), `game/js/careerdebut.js` (alleen `SCENES` r96 en `footballDue` r270 aanpassen), `game/js/careerdebutrun.js`, `game/js/voetbalcarrierelive.js` (`createNew` r101: `home` van de verhaalclub doorgeven), `game/js/voetbalcarriere.js` (`createCareer` neemt een vaste verhaalclub aan, klein), `scripts/careerdebut_test.mjs`, `docs/CARRIERESCENES-22-11.md`.
- **Tests:** `careerdebut_test` (de scène is data, `ov`-timing, blokkades), een nieuwe stap in `voetbal_beats_test` (beat B1 verschijnt na de scène, niet ervoor), `cutpreview` voor beeld.
- **Samen:** de scène is van wie de carrière start; een gast ziet de terugblik van Albert (data, lokaal nagespeeld via `coopcut.js`); wie niet speelt schrijft geen vlag.
- **Risico:** botsing met #1373 op `careerdebut.js`; houd de wijziging daar tot twee regels.
- **Niet bekeken:** beeld; vraagt de beeldronde V10.

### V3: Rangenboog en de weg naar de Euroborg (M)
- **Doel:** het enkele automatische bod (`offerFor`) wordt een verhaalbod per rang: Waddenkust-bod (rang 4), stadsclub (rang 5), en SC Noorderlicht in de Euroborg met een keuze, plus de aanvoerdersband en de Trainer- en Manager-overgang als scène.
- **Bestanden:** `game/js/voetbaltransfers.js` (`offerFor` r121: naast het bod ook een verhaaldoel), `game/js/voetbalcarriere.js` (`acceptOffer` r441, `promoteRoles` r434), `game/js/voetbalverhaal.js` (V1), `game/js/voetbalcarriereui.js` (de bodkaart, klein), `scripts/voetbal_transfers_test.mjs`, `scripts/voetbal_carriere_test.mjs`.
- **Tests:** een gesimuleerde carrière (`voetbal_carriere_sim.mjs`) haalt de Euroborg-club; een bod is er alleen aan het begin van een seizoen (`evDone === 0`); de balanstest blijft groen.
- **Samen:** een bod is van de speler zelf; wie wegvalt verliest niets.

### V4: Eindeloze modus, deel 1: seizoen uitrekenen en meer speelmomenten (S)
- **Doel:** knop "Seizoen uitrekenen" (60% ervaring, geen sneller geld dan spelen) en optioneel twee wedstrijden op één speldag.
- **Bestanden:** `game/js/voetbalcarriere.js` (een `simulateSeason` die `playEvent` herhaalt; `advanceDays` doet dit al voor gemiste ronden), `game/js/voetbalcarriereui.js` (knop plus melding via `actieBericht` r328), `game/js/voetbalagenda.js` (`DAYS_PER_ROUND`), `scripts/voetbal_carriere_test.mjs`, `scripts/voetbal_balans_test.mjs`.
- **Tests:** uitgerekend levert nooit meer geld per dag dan spelen (de bestaande exploit-audit); een gehaald seizoen start een nieuw; opslaan en laden midden in het seizoen.
- **Samen:** lokaal en per speler.

### V5: Spelersmarkt en scouting (M)
- **Doel:** dossiers, interesse van clubs en een zichtbare transferperiode in plaats van alleen transfervrije spelers; de pauze (`BREAK_DAYS`) wordt het venster.
- **Bestanden:** nieuw `game/js/voetbalscouting.js` (puur: dossier, kans, interesse), `game/js/voetbaltransfers.js` (spelers van andere clubs kopen, `aiRound` neemt biedingen mee), `game/js/voetbalcarriere.js` (nieuwe `managerBuyFrom`), `game/js/voetbalcarriereui.js` (subtab Transfers, nu `deel: 'transfers'` r36), `scripts/voetbal_transfers_test.mjs`, `scripts/voetbal_balans_test.mjs`, `scripts/voetbal_ui_test.mjs`.
- **Tests:** behoud van spelers (een speler zit in precies één selectie), koop-verkoop levert verlies op, deterministisch met dezelfde seed, venster alleen in de pauze.
- **Samen:** lokaal en per speler; handel tussen spelers hoort bij V8.

### V6: Uitwedstrijd als reis door de provincie (M)
- **Doel:** uitwedstrijden als rit (bus, trein of taxi, eventueel rondvaartboot), de plekken uit `voetbalparkendata.js`, aankomst op het park van de tegenstander.
- **Bestanden:** `game/js/voetbal.js` (alleen de startplek, r71 en r665; **het grootste conflictrisico**), `game/js/voetbalparken.js` (`travel` r72 geeft een route), `game/js/voetbalcarrierelive.js`, `game/js/voetbalworld.js` (`parkMarkers`), koppeling met de vervoerloopbaan (#1375) via een dun contract.
- **Tests:** `voetbalparken_test` (reisduur, route), `voetbal_wereld_test`, `scripts/world/prop_conflict_audit.mjs` is voor de coördinator.
- **Samen:** uitwedstrijden zijn van wie hem startte; gasten reizen mee of spelen lokaal (J of N).
- **Voorwaarde:** V10 heeft eerst bevestigd dat de carrièrewedstrijd op een park in beeld klopt.

### V7: Samen in dezelfde club (M)
- **Doel:** een gast sluit aan bij de club van de host en krijgt een gedeelde clubkas en een gedeelde trainingsavond; alleen de clubkas, nooit eigen geld.
- **Bestanden:** nieuw `game/js/voetbalsamenclub.js` (puur: grootboek, samenvoegen, regels), `game/js/voetbalsamen.js` (aansluiten, wegvallen), `game/js/multiplayerwedstrijd.js` (alleen de berichtvorm via EXTRA; protocol ongewijzigd), `scripts/voetbal_samen_test.mjs`, een nieuwe stap in de testbank (`docs/COOP-TESTBANK.md`), `docs/COOP-GAST.md`.
- **Tests:** grootboek is bij hostwissel (#439) en late aansluiting identiek; geen dubbele beloning; protocol-bewaker in `voetbal_samen_test`.
- **Samen:** dit is de Samen-taak zelf; afstemmen met #1380 vóór de start.

### V8: Competitie tussen clubs van mensen en handel (M)
- **Doel:** een competitieronde tussen de clubs van spelers (elkaars clubs zijn anders computerclubs in de eigen competitie) en transfers met twee kassen.
- **Bestanden:** `game/js/voetbalsamenclub.js` (uitbreiden), `game/js/voetbalseason.js` (één ronde met een mensenclub als vaste tegenstander, klein), `game/js/voetbaltransfers.js` (`buyPlayer`/`sellPlayer` met twee kassen), `scripts/voetbal_samen_test.mjs`, `scripts/voetbal_transfers_test.mjs`.
- **Tests:** de som van de kassen verandert alleen door de bekende bronnen en putten (de bewaarregel van `voetbaltransfers.js`); verkoper krijgt, koper betaalt; wegvallen midden in een handel doet niets.
- **Voorwaarde:** V7.

### V9: Sportdag over meerdere sporten (S, onafhankelijk)
- **Doel:** een lichte laag met één wedstrijd per sport (padel, golf, voetbal) en een medaillespiegel, als evenement.
- **Bestanden:** `game/js/loopbaan.js` (r84 padel, r87 golf), nieuw `game/js/sportdag.js` (puur), `game/js/padelstatus.js`, `scripts/sportdag_test.mjs`. Raakt `voetbal.js` niet.
- **Samen:** evenement, gezamenlijk; beloning per speler.

### V10: Beeldronde en verificatie (S, coördinator)
- **Doel:** acceptatie 1 van #1374: de bestaande carrière in beeld (de lijst in `VOETBAL-CARRIERE-VERIFICATIE-21-11.md` r31 tot 46), daarna de nieuwe scènes uit V2 en V3.
- **Wie:** de coördinator met Electron (agents hebben geen Electron en lopen er niet in). Wegwerpprofiel, één instantie, daarna `--story-test`.
- **Bewijs:** beelden op 1280x720, 1280x800 en 4K; vastleggen wat niet is gezien.

**Niet gepland als bouwtaak:** stem voor de hele boog (L; eerst de dialoog tellen, dan een eigen TTS-ronde) en de Trainer-/Manager-schermen "van de grond af": de schermen bestaan (tabs, `coach`, `managerBuy`), de diepte komt via V3 en V5.

## 6. Aanbeveling voor de coördinator

1. Vraag de eigenaar de twee open vragen van V0 (dorp en de bijfiguren Remco en Jan) en bevestig de ADR-wijziging voor de voorvoegsels.
2. Start V0, daarna V1 en V2 parallel in twee worktrees; ze raken verschillende bestanden.
3. V3, V4, V5 en V6 strikt na elkaar, omdat ze `voetbalcarriere.js`, `voetbalcarriereui.js` of `voetbal.js` raken; V6 pas na een beeldronde.
4. Plan V7 en V8 samen met #1380 zodat het gedeelde-bezit-ontwerp (grootboek, hostwissel) één keer wordt gemaakt.
5. Zeg in elk issue eerlijk "nog niet bekeken" voor alles wat beeld vraagt.
