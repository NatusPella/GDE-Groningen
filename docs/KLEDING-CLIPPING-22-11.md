# Kleding en clipping: audit en reparaties (22-11)

Aanleiding (eigenaar): de nieuwe pet van Tammo clipte tijdens een testbuild door zijn hoofd. Dit document legt vast wat er mis was, hoe het is gemeten, wat er is gerepareerd en hoe de permanente test het bewaakt.
Het rapport komt uit `node scripts/kleding_clipping_audit.mjs --voor=<json> --out=docs/KLEDING-CLIPPING-22-11.md`; de meting zelf zit in `scripts/lib/kleding_clipping.mjs`, de test in `scripts/kleding_clipping_test.mjs`.

## 1. De pet van Tammo: oorzaak

De Stadjerspet (`stadjerspet`, hoofddeksel-soort `tammo`) is een schil over de schedel (`hairCap` in `models3d_people.js`). Drie fouten, elk met een eigen meting:

1. **Het haar zat niet onder de pet.** Het kapsel van Tammo (`short`) en alle andere kapsels zijn schillen en lokken op 1,05 tot 1,3 keer de schedel, de pet ligt op 1,12 keer: het haar stak overal door de kroon. Gemeten: tot 10 mm bij `short`, 30 tot 70 mm bij knot, staart, staartjes, hanenkam en vlecht (die zaten gewoon boven op het hoofd, dwars door de pet).
2. **De onderrand lag op ooghoogte.** De schil stopte op de evenaar van het hoofd (y = HEAD_Y), de klep zat ruim 4 cm hoger: de pet hing over de wenkbrauwen en de oren staken er 7 mm doorheen. Gemeten: 12 mm bedekking van wenkbrauw en oog, 7 mm oor door de schil.
3. **Het plaatje stond los.** Het plaatje van de Stadjer was een vlak blokje onder een hoek van -0,5 rad: de bovenkant leunde van de pet af. Het volgt nu de kromming van de schil.

De hoofd-in-hoofd-meting (`hoofddeksel-in-hoofd`) vond voor het deksel zelf geen doordringing: de pet zit niet in het hoofd, het haar zit niet onder de pet.

## 2. Methode

- **Bouw:** elke combinatie wordt gebouwd met `buildPersonMesh` (dezelfde functie als het spel), op de twee hoofdpersonen zoals `shops.js` ze bouwt (Tammo, Tessa) en op drie NPC's zoals `avatarLook` en `npcLook` ze bouwen (man, vrouw, oude man met buik), en op de agent (vaste pet). De bouwer legt met `personProbe.layers` vast welke driehoeken bij welk stuk horen (hoofddeksel, haar, bril, shirt, revers, sjaal, tas, ...). Dat kost niets als het uit staat.
- **Meetruimte:** de rustpose in modelruimte (alle botten recht; een elleboog is na het bouwen 0,12 rad gebogen). Het hoofd is bij elke lichaamsvorm gelijk; romp, armen en benen niet (smal, breed: `build`; lang, kort: groepsschaal). Daarom zijn hoofdcombinaties op `gemiddeld` gemeten en de rest op alle vijf de vormen.
- **Hoofd:** een analytische ellipsoide (`headShape`). Diepte = hoeveel mm een punt er radiaal binnen ligt. Het werkelijke hoofd is een 9x7-veelvlak binnen die ellipsoide, dus de meting is streng.
- **Laag over laag:** raycasting vanuit een middelpunt (hoofd) of een as (romp: verticaal; arm: lijn door de gespreide arm; been: verticaal door de heup) door een punt van de binnenste laag naar de buitenste laag. Diepte = hoeveel mm de binnenste laag buiten de buitenste steekt, of hoeveel mm een kenmerk eronder ligt.
- **Details op de romp** (revers, overhemd in een open jas, zakken): elk los stuk wordt apart gemeten. Het dichtstbijzijnde punt mag hoogstens 1 cm voor de romp liggen (anders zweeft het) en het buitenste punt moet boven het oppervlak uitkomen (anders zit het erin).
- **Drempels:** 2 mm voor alles (de eigenaar: een hoofddeksel dat meer dan 2 mm in het hoofd zit is al te veel). Uitzonderingen met reden: pearls-in-kleding 10,0 mm, beads-in-kleding 10,0 mm, pendant-in-kleding 10,0 mm, chain-in-kleding 6,0 mm, watch-in-arm 3,0 mm, band-in-arm 3,0 mm, bracelet-in-arm 3,0 mm, glove-in-arm 4,0 mm, work-in-arm 4,0 mm, garden-in-arm 4,0 mm, sjaal-in-kleding 6,0 mm, schoen-in-been 3,0 mm, sjaal-zweeft 2,0 mm (parels en kralen zijn dobbelsteentjes van 2 cm die op de stof rusten; een polsband of handschoen heeft een naad; een sjaal ligt in de kraag).

## 3. Dekking

| Groep | Wat | Combinaties |
|---|---|---:|
| stuk | elk van de 67 stukken (63 winkelstukken en 4 rolstukken, 12 slots) op elk van de 5 personages en elke van de 5 lichaamsvormen, in een neutraal basisuitzicht | 1675 |
| hoofd | elk hoofddeksel x elk van de 17 kapsels x 4 personages; hoofddeksel x bril x gezichtsbeharing x kapsel; de agentpet | 1185 |
| jas | jas (5 soorten) x shirt (6) x broek of rok (4) x 5 lichaamsvormen x 3 personages | 1800 |
| schoen | schoen (3 soorten) x broek of rok (4) x 5 lichaamsvormen x 3 personages | 180 |
| hand | handschoen (3) x horloge x mouw (4 shirts, geen of 3 jassen) x 5 lichaamsvormen x 2 personages | 480 |
| sjaal | sjaal x jas (geen of 5) x shirt (3) x ketting (geen of 2) x 5 lichaamsvormen x 2 personages | 540 |
| tas | tas (2 soorten) x jas (geen of 5) x shirt (2) x 5 lichaamsvormen x 2 personages | 240 |
| **totaal** | | **6100** |

Doorlooptijd van de volledige audit: 35 s in gewone node, zonder Electron. De lichte test (`scripts/kleding_clipping_test.mjs`) neemt een gelijkmatige steekproef van elke groep.

## 4. Uitkomst voor en na

Voor: 6100 combinaties, **3002** met een overtreding (49 procent). Na: 6100 combinaties, **0** met een overtreding.

| Controle | Voor: combinaties | Voor: max mm | Na: combinaties | Na: max mm | Drempel mm |
|---|---:|---:|---:|---:|---:|
| kralenketting zit in het shirt (`beads-in-kleding`) | 25 | 108,6 | 0 | 0 | 10,0 |
| parelsnoer zit in het shirt (`pearls-in-kleding`) | 205 | 101,6 | 0 | 0 | 10,0 |
| ketting zit in het shirt (`chain-in-kleding`) | 205 | 91,8 | 0 | 0 | 6,0 |
| hanger zit in het shirt (`pendant-in-kleding`) | 25 | 90,9 | 0 | 0 | 10,0 |
| haar steekt door het hoofddeksel (`haar-door-hoofddeksel`) | 724 | 89,4 | 0 | 0 | 2,0 |
| revers steekt door de sjaal (`revers-door-sjaal`) | 360 | 75,5 | 0 | 0 | 2,0 |
| sjaal zit in het shirt (`sjaal-in-kleding`) | 615 | 74,5 | 0 | 0 | 6,0 |
| kraag steekt door de sjaal (`kraag-door-sjaal`) | 615 | 45,8 | 0 | 0 | 2,0 |
| sjaal staat meer dan 4 cm van de romp (`sjaal-zweeft`) | 615 | 31,6 | 0 | 0 | 2,0 |
| kledingdetail zweeft voor de romp (`detail-zweeft`) | 105 | 23,9 | 0 | 0 | 2,0 |
| werkhandschoen zit in de arm of mouw (`work-in-arm`) | 370 | 22,6 | 0 | 0 | 4,0 |
| tuinhandschoen zit in de arm of mouw (`garden-in-arm`) | 370 | 19,6 | 0 | 0 | 4,0 |
| overhemd onder de jas zweeft voor de jas (`overhemd-zweeft`) | 1076 | 16,2 | 0 | 0 | 2,0 |
| tas zit in de arm (`tas-in-arm`) | 90 | 14,0 | 0 | 0 | 2,0 |
| bril steekt door het hoofddeksel (`bril-door-hoofddeksel`) | 240 | 14,0 | 0 | 0 | 2,0 |
| hoofddeksel bedekt oog, neus of mond (`gezicht-bedekt-door-hoofddeksel`) | 692 | 12,3 | 0 | 0 | 2,0 |
| horloge zit in de arm of mouw (`watch-in-arm`) | 505 | 10,8 | 0 | 0 | 3,0 |
| armband zit in de arm of mouw (`bracelet-in-arm`) | 25 | 9,4 | 0 | 0 | 3,0 |
| oor of wenkbrauw steekt door het hoofddeksel (`gezicht-door-hoofddeksel`) | 519 | 7,8 | 0 | 0 | 2,0 |
| polsbandje zit in de arm of mouw (`band-in-arm`) | 25 | 5,5 | 0 | 0 | 3,0 |
| handschoen zit in de arm of mouw (`glove-in-arm`) | 120 | 5,5 | 0 | 0 | 4,0 |
| chain ligt helemaal onder de kleding (`chain-verborgen`) | 60 | 3,4 | 0 | 0 | 2,0 |
| hoofddeksel bedekt de bril (`bril-bedekt-door-hoofddeksel`) | 240 | 2,7 | 0 | 0 | 2,0 |

## 5. Wat is gerepareerd

Alle reparaties zitten in de data en de bouwers (`models3d_people.js`, `models3d_hair.js`, `models3d_clothing.js`), per lichaamsvorm waar het kan; geen stijl is geschrapt.

- **Pet, Stadjerspet, platte pet, mutsje:** een tabel `HAT_SHELL` (straal, tilt en onderrand per soort) is de ene bron. De onderrand ligt nu op 0,4 pi in plaats van 0,5 pi (boven ogen en oren; de klep zit op de voorrand). Het plaatje van de Stadjer ligt op de schil.
- **Haar onder het hoofddeksel** (`fitHairUnderHat`): elk haarpunt onder de schil gaat radiaal naar binnen tot onder de binnenwand (met marge voor de facetten van de schil); wat onder de rand uitkomt blijft zoals het was. Kapsels die er niet onder passen krijgen een lage variant: knot in de nek, staart onder de achterrand uit, staartjes op oorhoogte, bij een hanenkam blijft de tondeuse over.
- **Bandjes** (krans, feestoren, sluier, kroontje): de ring groeit mee met het haar op die hoogte (afro, krullen, hoge kam) in plaats van erin te zitten (`bandScale`).
- **Ketting, parels, kralen, hanger:** een pad over het oppervlak van de romp van deze lichaamsvorm (`neckPath`, 24 punten met normaal), niet meer een vlakke ring die aan de zijkanten tot 13 cm in het shirt zat. Kralen liggen erbovenop.
- **Sjaal:** de ringen volgen de romp van de vorm (`ringAt`), zijn zo wijd als de revers en de kraag eronder vragen, en liggen in dezelfde fase als de romp; het hangende eind ligt voor de buik van breed postuur.
- **Horloge, polsbandje, armband, handschoenen:** de armen staan 0,06 rad uit elkaar (`ARM_SPLAY`) maar de losse stukken hingen recht aan de elleboog: de arm stak er tot 14 mm doorheen. Ze draaien nu om de elleboog mee.
- **Schoudertas:** 5 cm dik in plaats van 7 en zo ver naar buiten als de arm van de lichaamsvorm toelaat (tot 1,4 cm in de arm bij breed postuur).
- **Overhemd in een open jas, revers, rits, buidelzak van de hoodie:** vlakke planken die tot 4 cm voor de borst zweefden zijn stroken die het oppervlak van de romp volgen (`surfaceStrip`).

De stijl blijft: dezelfde stukken, kleuren en kapsels, geen stuk is geschrapt. Wat verandert is wat zichtbaar fout was: het haar zit onder de pet, de pet ligt boven de wenkbrauwen en de oren, de ketting en de sjaal volgen de schouders en het overhemd ligt op de borst.

## 6. Overtredingen vóór de reparatie

Per controle en stuk de slechtste combinatie (personage, lichaamsvorm, kapsel, wat eromheen zit). De audit vond 1363 afzonderlijke regels (stuk met alles wat eromheen zit) in 6100 combinaties; hier zijn ze per stuk samengevoegd. Bij 'zweeft' is de diepte het overschot boven 1 cm. Alle andere combinaties waren schoon.

| Stuk | Slot | Controle | Personage | Lichaamsvorm | Kapsel | Diepte mm | Combinaties | Slechtste combinatie |
|---|---|---|---|---|---|---:|---:|---|
| kralen | jewel | kralenketting zit in het shirt | tammo | breed | standaard | 108,6 | 25 | kralen |
| parels | jewel | parelsnoer zit in het shirt | tammo | breed | standaard | 101,6 | 205 | parels |
| ketting | jewel | ketting zit in het shirt | tammo | breed | standaard | 91,8 | 205 | ketting |
| hanger | jewel | hanger zit in het shirt | tammo | breed | standaard | 90,9 | 25 | hanger |
| feestoren | hat | haar steekt door het hoofddeksel | npcF | gemiddeld | afro (en 2 andere) | 89,4 | 32 | feestoren + afro |
| sluier | hat | haar steekt door het hoofddeksel | npcF | gemiddeld | afro (en 2 andere) | 89,3 | 32 | sluier + afro |
| krans | hat | haar steekt door het hoofddeksel | npcF | gemiddeld | afro (en 3 andere) | 88,2 | 36 | krans + afro |
| kroontje | hat | haar steekt door het hoofddeksel | npcOud | gemiddeld | afro (en 3 andere) | 78,6 | 36 | kroontje + afro |
| korte_jas | outer | revers steekt door de sjaal | tammo | breed | standaard | 75,5 | 90 | sjaal + tshirt + korte_jas |
| lange_jas | outer | revers steekt door de sjaal | tammo | breed | standaard | 75,5 | 90 | sjaal + tshirt + lange_jas |
| platpet | hat | haar steekt door het hoofddeksel | tammo | gemiddeld | mohawk (en 15 andere) | 74,7 | 149 | platpet + mohawk |
| sjaal | neck | sjaal zit in het shirt | tammo | breed | standaard | 74,5 | 565 | sjaal |
| nekdoek | neck | sjaal zit in het shirt | tammo | breed | standaard | 74,5 | 25 | nekdoek |
| strandsjaal | neck | sjaal zit in het shirt | tammo | breed | standaard | 74,5 | 25 | strandsjaal |
| stadjerspet | hat | haar steekt door het hoofddeksel | tammo | gemiddeld | mohawk (en 14 andere) | 69,8 | 145 | stadjerspet + mohawk |
| pet | hat | haar steekt door het hoofddeksel | tammo | gemiddeld | mohawk (en 14 andere) | 69,8 | 145 | pet + mohawk |
| mutsje | hat | haar steekt door het hoofddeksel | tammo | gemiddeld | mohawk (en 15 andere) | 69,0 | 149 | mutsje + mohawk |
| jack | outer | revers steekt door de sjaal | tammo | breed | standaard | 60,5 | 90 | sjaal + tshirt + jack |
| colbert | outer | revers steekt door de sjaal | tammo | breed | standaard | 60,5 | 90 | sjaal + tshirt + colbert |
| korte_jas | outer | kraag steekt door de sjaal | tammo | gemiddeld | standaard | 45,8 | 90 | sjaal + tshirt + korte_jas |
| lange_jas | outer | kraag steekt door de sjaal | tammo | gemiddeld | standaard | 45,8 | 90 | sjaal + tshirt + lange_jas |
| regenjas | outer | kraag steekt door de sjaal | tammo | gemiddeld | standaard | 45,8 | 90 | sjaal + tshirt + regenjas |
| jack | outer | kraag steekt door de sjaal | tammo | gemiddeld | standaard | 42,2 | 90 | sjaal + tshirt + jack |
| colbert | outer | kraag steekt door de sjaal | tammo | gemiddeld | standaard | 42,2 | 90 | sjaal + tshirt + colbert |
| hoodie | top | kraag steekt door de sjaal | tammo | gemiddeld | standaard | 39,8 | 30 | sjaal + hoodie |
| trui | top | kraag steekt door de sjaal | tammo | gemiddeld | standaard | 33,8 | 30 | sjaal + trui |
| sjaal | neck | sjaal staat meer dan 4 cm van de romp | tammo | breed | standaard | 31,6 | 565 | sjaal |
| nekdoek | neck | sjaal staat meer dan 4 cm van de romp | tammo | breed | standaard | 31,6 | 25 | nekdoek |
| strandsjaal | neck | sjaal staat meer dan 4 cm van de romp | tammo | breed | standaard | 31,6 | 25 | strandsjaal |
| sjaal | neck | kraag steekt door de sjaal | tammo | gemiddeld | standaard | 30,2 | 25 | sjaal |
| nekdoek | neck | kraag steekt door de sjaal | tammo | gemiddeld | standaard | 30,2 | 25 | nekdoek |
| strandsjaal | neck | kraag steekt door de sjaal | tammo | gemiddeld | standaard | 30,2 | 25 | strandsjaal |
| tshirt | top | kraag steekt door de sjaal | tammo | gemiddeld | standaard | 30,2 | 30 | sjaal + tshirt |
| hoodie | top | kledingdetail zweeft voor de romp | npcOud | smal | standaard | 23,9 | 105 | hoodie |
| werkhandschoen | hands | werkhandschoen zit in de arm of mouw | tammo | breed | standaard | 22,6 | 370 | werkhandschoen + horloge + tshirt + jack |
| tuinhandschoen | hands | tuinhandschoen zit in de arm of mouw | tammo | breed | standaard | 19,6 | 370 | tuinhandschoen + horloge + tshirt + jack |
| colbert | outer | overhemd onder de jas zweeft voor de jas | tessa | gemiddeld | standaard | 16,2 | 508 | colbert |
| jack | outer | overhemd onder de jas zweeft voor de jas | tessa | smal | standaard | 15,2 | 508 | jack |
| werkjack | outer | overhemd onder de jas zweeft voor de jas | tessa | smal | standaard | 15,2 | 20 | werkjack |
| uniformjas | outer | overhemd onder de jas zweeft voor de jas | tessa | smal | standaard | 15,2 | 20 | uniformjas |
| veiligheidsjas | outer | overhemd onder de jas zweeft voor de jas | tessa | smal | standaard | 15,2 | 20 | veiligheidsjas |
| schoudertas | back | tas zit in de arm | tessa | breed | standaard | 14,0 | 70 | schoudertas + hoodie |
| stadjerspet | hat | bril steekt door het hoofddeksel | tammo | gemiddeld | bald (en 3 andere) | 14,0 | 80 | stadjerspet + leesbril + bald |
| pet | hat | bril steekt door het hoofddeksel | tammo | gemiddeld | bald (en 3 andere) | 14,0 | 80 | pet + leesbril + bald |
| mutsje | hat | bril steekt door het hoofddeksel | tammo | gemiddeld | bald (en 3 andere) | 13,5 | 80 | mutsje + leesbril + bald |
| mutsje | hat | hoofddeksel bedekt oog, neus of mond | tammo | gemiddeld | standaard (en 16 andere) | 12,3 | 173 | mutsje |
| stadjerspet | hat | hoofddeksel bedekt oog, neus of mond | tammo | gemiddeld | standaard (en 16 andere) | 12,0 | 173 | stadjerspet |
| pet | hat | hoofddeksel bedekt oog, neus of mond | tammo | gemiddeld | standaard (en 16 andere) | 12,0 | 173 | pet |
| horloge | wrist | horloge zit in de arm of mouw | tessa | breed | standaard | 10,8 | 505 | fietshandschoen + horloge + tshirt + jack |
| boodschappentas | back | tas zit in de arm | tessa | breed | standaard | 9,5 | 10 | boodschappentas |
| sporttas | back | tas zit in de arm | tessa | breed | standaard | 9,5 | 10 | sporttas |
| armband | wrist | armband zit in de arm of mouw | tessa | breed | standaard | 9,4 | 25 | armband |
| platpet | hat | hoofddeksel bedekt oog, neus of mond | tammo | gemiddeld | standaard (en 16 andere) | 8,2 | 173 | platpet |
| mutsje | hat | oor of wenkbrauw steekt door het hoofddeksel | tammo | gemiddeld | standaard (en 16 andere) | 7,8 | 173 | mutsje |
| stadjerspet | hat | oor of wenkbrauw steekt door het hoofddeksel | tammo | gemiddeld | standaard (en 16 andere) | 7,0 | 173 | stadjerspet |
| pet | hat | oor of wenkbrauw steekt door het hoofddeksel | tammo | gemiddeld | standaard (en 16 andere) | 7,0 | 173 | pet |
| polsbandje | wrist | polsbandje zit in de arm of mouw | tessa | breed | standaard | 5,5 | 25 | polsbandje |
| fietshandschoen | hands | handschoen zit in de arm of mouw | tammo | breed | standaard | 5,5 | 120 | fietshandschoen + horloge + tshirt + jack |
| ketting | jewel | chain ligt helemaal onder de kleding | tammo | breed | standaard | 3,4 | 60 | sjaal + tshirt + jack + ketting |
| mutsje | hat | hoofddeksel bedekt de bril | tammo | gemiddeld | bald (en 3 andere) | 2,7 | 80 | mutsje + leesbril + bald |
| stadjerspet | hat | hoofddeksel bedekt de bril | tammo | gemiddeld | bald (en 3 andere) | 2,1 | 80 | stadjerspet + leesbril + bald |
| pet | hat | hoofddeksel bedekt de bril | tammo | gemiddeld | bald (en 3 andere) | 2,1 | 80 | pet + leesbril + bald |

## 7. Overtredingen na de reparatie

Geen: alle combinaties blijven binnen de drempels.

## 8. Niet gemeten en niet bekeken

- **Niet in Electron of de testbuild bekeken.** De audit meet geometrie; de beelden zijn met een kleine softwarerenderer (`scripts/lib/kleding_clip_png.mjs`, zij- en vooraanzicht van de rustpose) bekeken, niet met de belichting en schaduw van het spel. De eigenaar moet de pet, het haar eronder, de ketting en de sjaal nog in de testbuild bekijken.
- **Alleen de rustpose.** Tijdens lopen, fietsen, zitten of vechten bewegen armen en hoofd; stukken die aan een bot hangen (horloge, handschoen, ketting) draaien daarin mee met de huid, maar een pose waarin het hoofd ver kantelt is niet gemeten.
- **Haar tegen de capuchon** is niet gemeten (het haar valt in de opening van de capuchon; in de zijkant zag het er goed uit). Evenmin schoenen tegen een wijd broekspijpeinde, handen tegen zakken en de verhaalfiguren met een eigen look (`storycast.js`).
- **Kleuren** zijn niet gevarieerd: de geometrie hangt niet van de kleur af (alleen de vertexkleur).
- **De 2 mm-drempel is streng voor het haar:** de schillen zijn veelvlakken; binnen de drempel kan haar nog net door een facet van de pet prikken (twee sliertjes in de zijkant zijn te zien in de render).

## 9. Samen spelen

Kleding is per speler zichtbaar bij anderen via de outfit-code (`avatar.outfit`): dezelfde geometrie, dezelfde bouwers. Deze wijziging raakt alleen de geometrie die `buildPersonMesh` uit die code bouwt; er is geen netwerkwijziging, geen nieuw bericht en de code zelf (versie 3) is ongewijzigd. Een gast ziet de gerepareerde pet, het haar eronder en de nieuwe ketting dus zonder dat host of gast iets doet.

