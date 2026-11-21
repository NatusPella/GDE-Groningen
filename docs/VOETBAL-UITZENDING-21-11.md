# Voetbal als uitzending: de hele wedstrijd voorop (21-11)

> **Aanleiding (eigenaar, 21-11, letterlijk):** "Dit lijkt alleen penalty schieten, geen voetbalwedstrijd zoals in FIFA, met commentaar, etc. etc." De volledige wedstrijd (elf tegen elf of vijf tegen vijf, vorming, tactiek, AI) bestond al (zie [VOETBAL-SIM-21-11.md](VOETBAL-SIM-21-11.md)), maar was moeilijk te vinden naast de penaltyserie en voelde kaal. Dit document beschrijft wat er is bijgekomen: de wedstrijd staat voorop en heeft de presentatie en de spelregels van een uitzending.
>
> **Niets hiervan is in beeld bekeken** (geen Electron, alleen pure tests, node-simulaties en de rooktest met de echte three.js). Zie "Te verifiëren in beeld".

Spec: [.specs-fire/standards/mechanica.md](../.specs-fire/standards/mechanica.md) (sectie "Voetbal in de Euroborg"). Samen spelen: [COOP-GAST.md](COOP-GAST.md). Regie-taal: [CUTSCENE-REGIE-21-11.md](CUTSCENE-REGIE-21-11.md).

## 1. De wedstrijd is de hoofdervaring

- De poort heet **Wedstrijd spelen** (prompt, kaartmarker, startkaart). De penalty's blijven bestaan als **Penalty's (minigame)** bij de poort ernaast ("Bonusspel naast de wedstrijd"); `penalty.js` is verder ongemoeid.
- E bij de poort opent het keuzescherm met bovenaan **Wedstrijd spelen**: {F} begint, {1} formaat, {2} competitie, {3} vorming, {4} stijl, {5} duur, {6} kaarten en blessures aan of uit, {7} camera-regie. Daaronder de regel dat de penalty's een minigame bij de poort ernaast zijn.
- De carrièrewedstrijden (`launchCareerMatch`) spelen dezelfde volledige wedstrijd op het grote veld, dus ook met commentaar, herhaling en samenvatting. De carrière gebruikt de regels en de camera uit dezelfde voorkeur.

## 2. Spelregels (voetbalextrarules.js)

Alles is uit te zetten (voorkeur `tv.regels` in `gde-voetbal-v1`, {6} in het keuzescherm zet kaarten en blessures samen uit); met alles uit is de sim gelijk aan die van voor deze uitbreiding (de test vergelijkt twee runs en de oude tests draaien ongewijzigd).

| Regel | Wat er gebeurt | Standaard |
|---|---|---|
| Kaarten | Een felle of van achteren gemaakte fout geeft kans op geel (40%) of rood (5%); een tweede geel is rood. Een uitgesloten speler gaat naar de zijlijn en doet niet meer mee (één man minder; de besturing van een mens gaat naar de dichtstbijzijnde speler). Het is een kaartje, geen beeld van geweld (constitutie 6). | aan |
| Blessures | Een gekwetste speler loopt kreupel (60% tempo) tot de volgende dode bal en gaat er dan uit voor een wisselspeler. Zonder beeld van leed. | aan |
| Wissels | Bank van drie (groot) of twee (klein) met verzonnen voornamen. De computer wisselt de moeste veldspeler in de rust en een blessure bij een dode bal. Een mens wisselt zijn bestuurde speler alleen bij een blessure. | aan |
| Strafschoppen | Een fout in het eigen strafschopgebied geeft een strafschop: de nemer staat bij de stip, de keeper op zijn lijn, de rest buiten het gebied; de computer schiet op het doel. | aan |
| Vrije trap | Dicht bij het doel schiet de computer vaak direct op doel. | altijd |
| Hoekschop, ingooi, doeltrap | Bestonden al; nu geteld in de statistieken en met eigen commentaar. | altijd |
| Buitenspel | Bij een pass naar een speler voor de een-na-laatste tegenstander in de helft van de tegenstander volgt een vrije bal zodra hij de bal raakt. | **uit** (optioneel) |

Statistieken (`m.stat`, `statistiekenVan`): balbezit, schoten, schoten op doel, hoekschoppen, overtredingen, kaarten, wissels, ingooien, doeltrappen, vrije trappen, strafschoppen, buitenspel. Per speler (`p.st`): doelpunten, assists, schoten, reddingen, tackles, passes. De **Man van de match** (`matchMvp`) is de hoogste waarde uit doelpunten (6), assists (3,5), reddingen (1,6), tackles (1), schoten (0,4) en passes (0,15), min kaarten, plus een bonus voor het winnende team en voor een keeper die de nul hield; bij gelijkspel wint de laagste id (deterministisch).

## 3. Presentatie

| Onderdeel | Bestand | Wat |
|---|---|---|
| Tv-regie | `voetbalregie.js` | Shots: **speler** (achter je speler, de bestaande camera), **hoog**, **zijlijn** (breed), **breed** (opstelling, rust, einde), **doel** (doelcamera: doelpunt, strafschop, vrije trap dicht bij het doel), **viering** (de schutter), **hoek**, **kaart**. Standen: `auto` (standaard: alleen wisselen bij een dode bal), `speler` (nooit wisselen), `tv` (volledige uitzending met schotcamera), `hoog`. {3} of de D-pad omlaag wisselt. |
| Herhaling | `voetbalregie.js`, `voetbal.js` | Na een doelpunt (5 s ervoor, 1,2 s erna) en een grote kans (paal of lat, hoogstens één per anderhalve minuut) staat de wedstrijd stil en zie je de opname op 80% snelheid vanaf de zijlijn en dan de doelcamera, met het label Herhaling. {F}, Spatie of Enter slaat over. **Alleen solo.** |
| Scorebord | `voetbalpresentatie.js` | De rij van het bord bovenin: verzonnen clubembleem (kleuren en patroon van de club, nooit een echt embleem), naam, stand, klok, en per team kaart- (met het woord geel of rood) en blessure-icoontjes. |
| Aftrap-intro | idem | Opstelling van beide teams (nummers, namen, rollen, vorming en stijl, jouw speler gemarkeerd) tijdens de intro (7,5 s, {F} slaat over) met de sportjingle (`sport_stinger`, geen echte muziek) en het publiek (`crowd_chant`). |
| Rustpauze | idem | Stand, doelpuntenmakers met minuut en een tabel met balbezit, schoten, schoten op doel, hoekschoppen, overtredingen, kaarten en wissels (10 s). |
| Eindsignaal | idem | Uitslag, doelpuntenmakers, **Man van de match** met zijn cijfers en dezelfde tabel (12 s). |
| Namen en markering | `voetbal.js` | Naamkaartjes boven jouw speler (geel gemarkeerd), de baldrager, de medespelers (mensen) en bij eigen bal de teamgenoten binnen 18 m om aan te spelen. |
| Radar | `voetbalpresentatie.js` | Veldradar linksboven: bal, spelers per team, jouw speler groter en geel. |
| Pijlen | `voetbal.js` | Een passpijl naar de beste ontvanger zolang je de bal hebt, en een schotpijl die met het laden van het schot langer wordt (de krachtmeter in het bord bleef). |
| Uitleg | `voetbalstatus.js` | De toetsen staan in de knoppen (toetsplaatjes); de wat-nu-regel kent de strafschop. |
| Geluid | `voetbal.js` | Alleen bestaande `sfxEvent`-sleutels: trappen, paal, net, publiek juicht, publiek kreunt bij paal of lat, fluit (aftrap, kaart, buitenspel, herstart, einde), sportjingle. Geen nieuwe geluidsbestanden. |
| Controller | `controls.js` | `PAD_MAPS.voetbal`: D-pad omlaag = camera-regie ({3}). |

De tv-laag is een klein DOM-laagje (`voetbaltvlayer.js`, `voetbaltv.css`, alleen ds-tokens) zonder klik, in `hudbus.js` als eigen oppervlak `voetbaltv` geregistreerd.

## 4. Commentaar (voetbalcommentaar.js, voetbalcommentaardata.js)

- **Twee commentatoren, verzonnen:** Hilbrand (verslaggever: warm, snel) en Roelie (kleurcommentator, oud-spits van het dorpsteam, droog). Nederlands, met hier en daar een Gronings woord met zorg ("nait", "joh", "Grunn", nooit "de Grunn"). Geen echte clubs, spelers of merken (de test gebruikt `voetbal_verboden.mjs`).
- **412 regels als data**, 42 soorten (de seizoens- en carrièreregels van #1179 staan in `voetbalcommentarycareer.js` en zijn bij het laden samengevoegd): aftrap, tweede helft, derby, kans, schot, redding, paal, doelpunt (thuis, tegen, eigen), comeback, geel, rood, blessure, wissel, strafschop, hoekschop, ingooi, doeltrap, vrije trap, buitenspel, uit, overtreding, rust, einde (winst, verlies, gelijk), vulling, balbezit, laatste minuut, spanning, Man van de match, en in de carrière: de ronde, de plek in de stand (top en bodem), de laatste ronde, de Dijkbeker, de Waddenbeker, het debuut, een doelpunt van de ster en de sponsor. De grappen uit de eerste versie (de thermosfles, de pepermunt, de klompen, de hoed van Oma Trijntje) zijn behouden.
- **Afwisselend en niet herhalend:** elke soort en commentator heeft een zak die leeg moet voordat een regel terugkomt, nooit twee dezelfde achter elkaar, en een geheugen van de laatste dertig regels over alle soorten heen. De verslaggever opent, de ander reageert met een kans per soort en een vertraging van 2 tot 3,5 s. Kleine dingen (ingooi, schot, uit) vallen weg als er net iets gezegd is; een doelpunt, kaart of het einde komt altijd door. In rustige minuten komt vulling, en bij veel balbezit een regel over het bezit.
- **Stem of ondertitel:** een vaste regel (zonder accolade; 277 stuks) heeft de stembank-sleutel `Hilbrand|tekst` of `Roelie|tekst`. Ze staan in de TTS-cast (`scripts/tts_lines_list.mjs`, stemmen Sadachbia en Achird, gewoon Nederlands met een licht noordelijk accent), in `voice_coverage` (gebied "Voetbalcommentaar") en op de wachtlijst `scripts/voice_wacht.json` tot de opnameronde ze opneemt. Een sjabloon ({speler}, {team}, {stand}) en elke regel zonder opname blijft **ondertitel**; die staat er altijd.
- **Humor:** geschreven in de toon van de rest (droog, understatement, nooit gemeen). De bewerking via het panel (drie varianten, drie reviewers) is **nog niet gedaan**; de regels zijn een eerste ronde.

## 5. Samen spelen

Elf tegen elf kan samen (twee tot vier mensen in één team); dit document verandert het protocol niet.

- **Van wie:** de wereld, de sim, de regels, kaarten, blessures, wissels en statistieken zijn van wie het spel opende. De regels komen uit de voorkeur van de host.
- **Wat ziet een gast:** de momentopname (64 getallen, ongewijzigd; `net/protocol.js` zegt niets over voetbal). Een uitgesloten speler staat voor de gast gewoon aan de zijlijn (zijn plek is in de momentopname). De gast krijgt de opstelling, de stand en de klok; de **statistieken, de Man van de match en de kaart- en blessure-icoontjes** zijn van de host (de gast heeft ze niet, de panelen laten ze dan weg).
- **Commentaar, regie, radar, namen:** **lokaal bij elke speler** en met een eigen zaad. Er gaat niets over het net. Een gast haalt gebeurtenissen (doelpunt, rust, einde, een herstart) uit het verschil tussen twee momentopnamen (`guestEvents`), dus zijn commentaar kent geen kaarten of kansen.
- **Herhaling:** geen. De wedstrijd loopt voor iedereen door; de host kan hem niet stilzetten (tijd, pauzeren en slapen zijn geen hostrechten). Ook de panelen overslaan ({F}) kan alleen solo.
- **Beloning en voortgang:** ongewijzigd (per speler uit zijn eigen uitslagsregel). Een rode kaart kost niets extra; een uitgesloten speler krijgt dezelfde beloning als zijn team (de uitslag telt per team).
- **Wegvallen of later aansluiten:** ongewijzigd (de computer neemt de speler over; geen instap halverwege).
- **Test:** `voetbal_uitzending_test` (regels, commentaar, regie, presentatie, gastgebeurtenissen, een momentopname met een strafschop door het kader); de bestaande `coopwedstrijd_voetbal_test` en `voetbal_samen_test` draaien ongewijzigd.

## 6. Bewijs

- `node scripts/voetbal_uitzending_test.mjs` (30 groepen): de regels (kaarten, blessures, wissels, strafschop met de opstelling en een computernemer, optioneel buitenspel, alles uit), 412 regels (aantallen, woordbudget, geen echte namen, geen "de Grunn", geen winter), niet-herhaling, een hele wedstrijd met commentaar, de regie (elk shot in elke stand, camera eindig voor beide formaten), de opname en de herhaling (zetten en terugzetten), het scorebord (ontsnapt), de opstelling met 22 spelers, de rustpauze, de eindsamenvatting, de radar, de gastgebeurtenissen en de voorkeur.
- `voetbal_test` (59 groepen), `voetbal_botsim` (de eis "niemand buiten het veld" houdt rekening met uitgesloten spelers), `voetbal_samen_test`, `coopwedstrijd_voetbal_test`, `voetbal_carrierelive_test` en `voetbal_rook_test` (met de echte three.js: namen, pijlen, regie en overlay lopen een hele wedstrijd zonder fouten) groen.
- Ratel en keuringen: `ds3_ratel_test`, `ds_tokens_test`, `hudbus_surfaces_test`, `naamtaal_check`, `undef_check`, `import_cycles_test`, `voice_coverage`.

## Te verifiëren in beeld (nog niet bekeken)

1. De camera's: zijlijn, hoog, doel, viering, hoek en kaart (hoogte, afstand, wat in beeld is, of de zijlijnkant klopt met de lichtinval), en of de harde snit bij een dode bal prettig is of juist stoort.
2. De herhaling: of de opname leesbaar is (15 beelden per seconde, geïnterpoleerd), de duur, de twee hoeken, het label en het overslaan.
3. Het scorebord met embleem (leesbaarheid op 1080p en 1280x800, het patroon bij kleine maat, kaarticoontjes), de radar (plaats, formaat) en de ondertitel (plaats ten opzichte van de strook rechtsonder).
4. De panelen: opstelling, rustpauze en eindsamenvatting (leesbaarheid, hoogte op 1280x720, 4K, de tabellen, het patroon van Man van de match) en de duur van de pauzes.
5. De naamkaartjes (maat, overlap met de pijl boven je speler, leesbaarheid op afstand op het grote veld) en de pas- en schotpijlen op het gras.
6. De spelregels in een echte wedstrijd: te veel of te weinig kaarten (bot-sim: zie de test), of een uitgesloten speler duidelijk van het veld gaat, kreupel lopen, wissels, strafschoppen (opstelling, richt met de stick) en of de balans van de AI met één man minder klopt.
7. Het commentaar: of de afwisseling, het tempo en de toon werken, de lengte van de ondertitel, en later de stemmen (nog niet opgenomen).
8. Het menu: of **Wedstrijd spelen** nu direct vindbaar is en de penalty's duidelijk de minigame ernaast zijn.
9. De controller: de D-pad omlaag voor de camera, en de uitleg met de toetsen in de knoppen.
10. Samen spelen in echte vensters: de gast ziet de panelen zonder statistieken, een uitgesloten speler aan de zijlijn, en zijn eigen commentaar.

## Niet gedaan

- De humorronde met het panel (drie varianten, drie reviewers).
- De opname van de stemmen (de regels staan op de wachtlijst).
- Een herhaling in Samen spelen, kaarten en blessures in het commentaar van een gast, en de statistieken bij een gast.
- Een volledige spelerskeuze voor wissels door een mens (alleen automatisch en bij een blessure), en een menu voor de volgorde van de bank.
- Verlenging en strafschoppen bij gelijkspel (nog steeds een gelijkspel).
- Aanraakbediening en een Phosphor-voetbalicoon.

## 7. Seizoen en carrière in het commentaar (#1179)

- **Context:** `voetbalcarriere.js: commentaryContext(c, getClub, m)` geeft ronde, aantal rondes, klasse, plek, het aantal clubs, de laatste ronde, het debuut, de naam van de speler en de eerste geaccepteerde sponsor. `voetbal.js` zet hem in `ctx.carriere`; zonder carrière (Euroborg, Samen spelen) is hij `null` en gedraagt het commentaar zich als eerst.
- **Wat er klinkt:** na de aftrap opent Hilbrand met één regel over het seizoen (ronde, top, bodem, laatste ronde, beker of Waddenbeker), Roelie reageert met een kans. Daarna volgt bij een debuut de debuutregel en anders (bij een oneven ronde) de sponsorregel. Een doelpunt van de carrièrespeler is een ster-regel; een doelpunt van een ander blijft een gewoon doelpunt.
- **Stem:** de vaste regels (zonder accolade; 82 nieuwe sleutels, 359 in totaal in het gebied "Voetbalcommentaar") staan op `scripts/voice_wacht.json` tot de opnameronde; sjablonen ({speler}, {ronde}, {rondes}, {divisie}, {sponsor}) blijven ondertitel.
- **Samen spelen:** het commentaar is lokaal; een gast ziet en hoort alleen het gewone wedstrijdcommentaar, want de carrière is van de speler zelf.
