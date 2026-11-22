# Voetbalkleding: van dorpsveld tot topklasse (22-11)

> **Wens van de eigenaar (22-11, letterlijk):** "Tammo en Tessa moeten ook voetballen in voetbalkleding, die via het kledingsysteem werkt" en "die aanpast van amateur tot prof".
> **Niets hiervan is in Electron of in het echte spel bekeken.** Alleen pure tests, three in node (driehoeken, NaN, opruimen), de clipping-audit en een softwarerenderer. Zie "Te controleren in beeld".

Spec: [.specs-fire/standards/mechanica.md](../.specs-fire/standards/mechanica.md) (kleding en voetbal). Samen spelen: [COOP-GAST.md](COOP-GAST.md) (sectie Voetbalkleding). Voortbouwend op [KLEDING-21-11.md](KLEDING-21-11.md), [KLEDING-CLIPPING-22-11.md](KLEDING-CLIPPING-22-11.md) en [KLEDING-PREVIEW-22-11.md](KLEDING-PREVIEW-22-11.md); de voetbalkant staat in [VOETBAL-CARRIERE-21-11.md](VOETBAL-CARRIERE-21-11.md) en [VOETBAL-UITZENDING-21-11.md](VOETBAL-UITZENDING-21-11.md).

## 1. Wat het is

Voetbalkleding zijn **gewone kledingstukken** van het bestaande kledingsysteem: een stuk heeft een slot, een soort en een kleur (`voetbalshirt_streep.groen`), staat in de winkel (afdeling Sport) en in de kast, past op alle vijf lichaamsvormen en alle 17 kapsels, en reist mee in de outfit-code. Er is geen apart poppetjessysteem. Bij een wedstrijd, training of penaltyserie trekken Tammo en Tessa het **tenue van hun club** aan: een tijdelijke override die de eigen outfit met rust laat. Het tenue groeit mee met de klasse van de club.

| Module | Rol |
|---|---|
| `clothingdata.js` | De 25 stukken (append-only achter de oude 67), twee nieuwe slots (`legs`, `guard`), `KIT_PAIR` (tweede kleur), de rolpool `voetballer`. |
| `clothingkit.js` | Puur: de niveau-tabel `KIT_LEVELS`, `kitWorn` (een tenue uit stukken), de patroonvakken, sponsors, kleurafronding op het palet. |
| `clothing.js` | De override (`setKit`, `kitActive`, `effectiveWorn` gaat erover), `outfitToLook` voor kousen, scheenbeschermers, band, hesje en shirtlagen, `npcOutfit('voetballer')`. |
| `footballkit.js` | Koppelt carrière en clubs aan het tenue: niveau per klasse, thuis, uit en derde, rugnummer, promotie en degradatie (`levelSync`), `actorLook` voor de wedstrijdfiguren, `kitView` voor het Club-scherm. |
| `footballkitlive.js` | Het tenue aan en uit rond een wedstrijd, training en penaltyserie, en het trainingspak bij de poort. |
| `models3d_people.js`, `models3d_clothing.js` | Kousen, scheenbeschermers, vier noppenschoenen, aanvoerdersband, hesje, het shirtpatroon met rugnummer, naamstrook en sponsorpaneel, keepershandschoenen. |
| `clothingpreview.js` | Een eigen voorbeeld per stuk (alleen het stuk), ook voor de nieuwe slots en het patroon. |
| `clubui.js` | Het tenue in het Club-scherm: 3D-voorbeeld van het shirt, thuis, uit, derde en rugnummer. |

## 2. De stukken (25)

| Stuk | Slot | Uitvoeringen |
|---|---|---|
| Voetbalshirt, korte mouw | `top` | 6 patronen (effen, brede strepen, smalle strepen, helften, hoepels, kruis), 19 kleuren |
| Voetbalshirt, lange mouw | `top` | dezelfde 6 patronen en kleuren |
| Keepersshirt | `top` | lange mouw, 9 opvallende kleuren |
| Voetbalbroekje | `bottom` | 19 kleuren |
| Voetbalsokken (kousen tot de knie) | `legs` (nieuw) | 19 kleuren; alleen zichtbaar onder een broekje of rok |
| Scheenbeschermers | `guard` (nieuw) | 5 kleuren; liggen op de kous, zichtbaar als plaat |
| Voetbalschoenen, vier uitvoeringen | `shoes` | buurtveld, streek, profklasse, topklasse (andere vorm en kleur, zie 3) |
| Keepershandschoenen | `hands` | 5 kleuren, gevoerd met manchet en rugpaneel |
| Aanvoerdersband | `wrist` | 6 kleuren, om de linkerbovenarm (een laag van de arm, geen los mesh) |
| Trainingsjack | `outer` | 19 kleuren, dicht tot de kin |
| Trainingsbroek | `bottom` | 19 kleuren |
| Opwarmhesje | `outer` | 7 kleuren; de mouwen van het shirt eronder blijven zichtbaar |

Alle stukken staan achter de oude 67 in `ITEMS` (append-only): de outfit-code verandert niet voor wat er was, en de test bewaakt dat met een vingerafdruk van de volgorde en de twee codes zoals de oude bouw ze maakte. De slots `legs` en `guard` staan achteraan `SLOTS`; de code leidt het slot af uit het stuk, niet uit de volgorde. Een shirtpatroon is een eigen stuk, zodat een stuk één kleur blijft: de tweede kleur volgt uit de eerste (`KIT_PAIR`, bijvoorbeeld groen met wit).

## 3. Van amateur tot prof: de niveau-tabel

De enige plek waar het niveau bepaalt wat je draagt is `KIT_LEVELS` in `clothingkit.js`. Het niveau volgt de klasse van de club (`DIVISION_LEVEL`).

| Niveau | Klasse | Stukkenset | Patronen | Nummer | Sponsorplek | Schoen | Extra |
|---|---|---|---|---|---|---|---|
| Straatvoetbal | geen club | neutrale trainingsset (grijs shirt, donker broekje, kousen) | effen | geen | geen | buurtveld, zwart | alleen kennismaking en straatvoetbal zonder carrière |
| Amateur | Talentenklasse (en lokale clubs) | simpel katoenen shirt, broekje, kousen | altijd effen | handgeschreven (dun, iets kleiner) | de helft van de clubs heeft een lokaal bedrijf (klein paneel), de rest geen | buurtveld, zwart (effen, zes noppen) | keepershandschoenen; geen scheenbeschermers, geen band |
| Semi-prof | Terpklasse | shirt in het clubpatroon | effen, brede streep, smalle streep, helften | rugnummer met naamstrook | een verzonnen lokaal bedrijf (klein paneel) | streek, zwart (streep op de zijkant, dunne noppen) | zichtbare scheenbeschermers, aanvoerdersband bij de kapitein |
| Prof | Kroonklasse | modern technisch shirt | ook hoepels | rugnummer en achternaam, technische cijfers | het sponsorpaneel van je eigen sponsors uit het sponsorsysteem (Bezit-panden); zonder sponsor een verzonnen lokaal bedrijf | profklasse, zwart (lage enkel, manchet, bladnoppen) | keepersset, band |
| Topniveau | Waddenbeker (europa) | speciale editie | alles, ook het kruis | groot en opvallend | groot paneel | topklasse, geel (hielkap, tong, opvallende kleur) | **derde tenue** (zwart met kruis, speciale editie) |

Kleurregels: het palet is `KIT_COLORS` (19 paletkleuren); de clubkleuren uit `voetbalclubs.js` (hex) worden op het dichtstbijzijnde paletstuk afgerond. **Thuis** is de clubkleur met het patroon van het niveau, **uit** is een effen shirt in de tweede clubkleur, **derde** (alleen topniveau) is een zwart of wit shirt met kruis. De keeper draagt de keeperskleur van de club. Twee teams die op elkaar lijken: de bestaande `awayKit` kiest, nu met de patronen van het niveau erbij (een dorpsclub is effen, dus het verschil moet in de kleur zitten). Alle sponsornamen zijn verzonnen (`LOCAL_SPONSORS`, of de namen uit het sponsorsysteem); het paneel in beeld is een gekleurd vlak zonder letters, de naam staat in het Club-scherm. De test controleert alle teksten tegen de woordenlijst van echte clubs en merken.

**Promotie en degradatie.** `voetbalcarrierelive.kitSync` vergelijkt het niveau met de vlag `kitLvl` van het profiel na elke wedstrijd en elke nacht. Verandert het niveau: de stukken van het nieuwe niveau (thuis, uit, derde waar het kan, keepersset, trainingspak en hesje) komen in de kast van Tammo én Tessa en er volgt de melding **"Nieuw tenue: <niveau>"**. Ook de eerste wedstrijd van een carrière geeft het begintenue.

## 4. Het tenue: automatisch aan en de eigen outfit veilig

- **Wanneer:** bij een wedstrijd (alle carrièrewedstrijden, de Euroborg-wedstrijd en Samen spelen), een trainingsoefening en de penaltyserie. Bij de spelerspoort (binnen 45 m) draagt de speler met carrière het **trainingspak** van zijn club; verder weg zijn eigen kleren. Training: het effen clubshirt met een opwarmhesje. Zonder carrière: de neutrale trainingsset.
- **Override, geen verandering:** `clothing.setKit` legt het tenue over `effectiveWorn`; `W(ch).worn` wordt nooit aangeraakt. Het tenue staat **niet** in de save (`getClothingSave` is voor en na gelijk, de test vergelijkt de JSON). Crasht het spel of sluit je af midden in een wedstrijd, dan heeft de save het tenue nooit gezien en is je eigen outfit er exact nog. Een save laden (`applyClothingSave` en `resetClothing`) haalt het tenue weg. Het kapsel en de lichaamsvorm blijven die van het personage.
- **Toets 6** (volgende outfit) doet niets zolang je het tenue draagt ("Je draagt het clubtenue"). Kleding aan- en uittrekken in een menu werkt op de eigen outfit en is pas na de wedstrijd te zien.
- **Het verhaaloutfit** blijft werken: het tenue gaat er tijdelijk voor en geeft het daarna terug.
- **Wedstrijdfiguren:** `voetbal.js` bouwt elke speler uit het kledingsysteem (`voetbalkit.actorLook`): de eigen speler is precies de figuur uit de wereld met het tenue, teamgenoten en tegenstanders hebben hun clubkleuren, rugnummer en (bij pro en top) het sponsorpaneel. Voor het haar en de lichaamsvorm van computerspelers gebruikt het de rolpool `voetballer`.
- **Rolpool `voetballer`:** `npcOutfit(seed, 'voetballer', { level, color, pattern, role })` bouwt een coherent tenue uit een zaad (één kleur voor shirt, broek en kousen), deterministisch op elke client.
- **Club-scherm:** het tabblad Club toont het huidige tenue met een 3D-voorbeeld van het **shirt** (alleen het stuk, geen pop), het niveau en de keuze thuis, uit of derde en een rugnummer (1 tot 99). Toetsen {1}, {2}, {3} kiezen het tenue en {-} en {+} het nummer; de knoppen werken ook met controller en aanraking. De keuze staat in `flags.kitVar` en `flags.kitNum` van het carrièreprofiel.
- **Kast en winkel:** de categorie **Sport** toont alle voetbalstukken bij elkaar (ook shirt, broek en schoenen), met pictogrammen per slot (`kl_sok`, `kl_scheen` erbij). De afdeling Sport verkoopt ze.

## 5. Samen spelen

Zie COOP-GAST.md, sectie Voetbalkleding: het tenue is lokaal per speler en reist als gewone outfit-code mee (geen nieuw protocol, geen nieuw bericht). Per speler eigen clubvoortgang, een hostwissel midden in een wedstrijd laat het tenue staan, wegvallen en later aansluiten kost niets. Wat alleen lokaal te zien is: het rugnummer en het sponsorpaneel. Een ander ziet shirt, patroon, broekje, kousen, schoenen en de band; zijn tweede kleur volgt uit `KIT_PAIR`.

## 6. Prestaties en kwaliteit

- Een voetballer is één rompmesh (gedeelde geometrie) plus hoogstens twee losse shirtlagen: het patroon met het rugnummer in de tweede kleur en het sponsorpaneel in de sponsorkleur. Een keeper heeft er twee handschoenen bij. Gemeten (three in node): romp 1.880 tot 2.050 driehoeken, shirtlagen 170 (amateur) tot 430 (topniveau); een gewone figuur heeft er ongeveer 2.060.
- **Clipping:** de audit heeft een groep `sport` (2.080 combinaties: elk niveau en elke uitvoering, de vier schoenen onder een broekje of lange broek, hesje en trainingspak over lange en korte mouwen, keepershandschoenen met band, op alle vijf de lichaamsvormen en vijf onderwerpen) met nieuwe controles: kous door het been, scheenbeschermer zweeft of zit in de kous, aanvoerdersband in de mouw, rugnummer en sponsorpaneel zweven of zitten in de romp. **0 overtredingen** (volledige audit 8.805 combinaties). De test bewijst dat de controles werken door ze met opzet te breken.
- Kousen en scheenbeschermers verschijnen alleen bij een broekje of rok (onder een lange broek zouden ze door de stof steken).

## 7. Besluiten (zelf beslist, conservatief)

| Besluit | Reden | Afgewezen |
|---|---|---|
| Talentenklasse = amateur, Terpklasse = semi-prof, Kroonklasse = prof, Waddenbeker = topniveau | De carrière begint in de Talentenklasse: het eerste tenue is dus een dorpsshirt en de ladder is zichtbaar. | Kroonklasse als topniveau (dan is er geen verschil met de beker). |
| Een stuk heeft één kleur; de tweede kleur volgt uit `KIT_PAIR` | De outfit-code blijft zoals hij is; geen nieuw protocol. | Een tweede kleur in het stuk-id (breekt oude codes). |
| De tweede clubkleur van het wapen is dus de paarkleur, niet de exacte tweede clubkleur | Zie boven. Het verschil is klein: de club blijft herkenbaar aan kleur en patroon. | Een eigen kitcode in het netwerk. |
| Rugnummer en sponsorpaneel alleen lokaal en in de wedstrijdfiguren | Een extra bericht is een protocolwijziging. | Een nummerveld in de spelerslijst. |
| Het sponsorpaneel is een kleurvlak zonder letters | Geen echte merken of opschrift; de naam staat in het Club-scherm. | Een canvas met tekst. |
| Twee nieuwe slots (`legs`, `guard`) achteraan | Een kous en een scheenbeschermer zijn eigen stukken; de code leidt het slot af uit het stuk. | Alles in het slot `shoes`. |
| De aanvoerdersband is een laag van de arm, geen los mesh | Geen extra drawcall en hij beweegt met de arm mee. | Een accessoire aan de onderarm. |
| Zonder carrière draagt de speler een neutrale set, ook als de speler elders wel een carrière heeft | Zo is "de club" altijd het team waarvoor je speelt. | De clubkit in een Euroborg-wedstrijd. |

## 8. Tests en audits

- `node scripts/voetbalkleding_test.mjs` (14 tests): catalogus en vingerafdruk, geen merken of winter, outfit-code (oude codes en rondes), niveau-tabel, clubs en uit-shirts, override en herstel (inclusief laden midden in een wedstrijd), NPC-rolpool, `actorLook`, carrière (promotie, degradatie, keuze, opslag), modellen (driehoeken, NaN, opruimen, schoenen per niveau), clipping-steekproef en de meting zelf, de sportafdeling.
- `node scripts/kleding_clipping_audit.mjs --sets=sport` (volledig) en de lichte `kleding_clipping_test`.
- Bijgewerkt: `clothing_test`, `kleding_clipping_test` (88 winkelstukken, 14 slots), `kledingvoorbeeld_test` (92 stukken, nieuwe slots).
- Contactblad: `node scripts/ui/footballkit_blad.mjs` (softwarerenderer) schrijft `docs/beeld-22-11/voetbalkleding/niveaus.png` (de vijf niveaus van voren en van achteren) en `uitvoeringen.png` (uit, derde, keeper, training, trainingspak).

## 9. Te controleren in beeld (niet gedaan)

1. Het contactblad is een softwarerender; hoe het in het echte spel met licht, schaduw en de shirtlagen eruitziet is niet bekeken. In het bijzonder: de randen van het streeppatroon bij de schouders (de bestaande rijen van `shirtBands`) en de kleur van de shirtlagen ten opzichte van de rompkleur (de lagen gebruiken de ruwe hex, de romp de wereldpalet-tint).
2. Het rugnummer (zeven-segmentcijfers) en het sponsorpaneel op de romp van alle lichaamsvormen; of het nummer op een afstand te lezen is.
3. De noppenschoenen per niveau, kousen en scheenbeschermers in beweging (rennen, schieten): de kous volgt het been via dezelfde botgewichten, maar is niet geanimeerd bekeken.
4. De Club-schermtegel: het 3D-voorbeeld van het shirt (de gedeelde voorbeeldrenderer laadt pas als het paneel opent), de knoppen met controller.
5. De omkleding: het trainingspak bij de poort, het tenue bij het starten van een wedstrijd en de eigen kleren erna; de melding "Nieuw tenue: <niveau>".
6. Of de wedstrijdfiguren (22 stuks) vloeiend blijven: elke speler heeft een eigen romp (haar en lichaamsvorm) en een eigen shirtlaag per rugnummer; de cache is begrensd (120 rompen, 64 shirtlagen) en de test meet het driehoekenbudget, niet de framerate.
7. Het geluid van het omkleden (`clothes_rustle`) bij het aanleggen van het tenue is niet gekoppeld: het tenue is geen handeling van de speler.

## 10. Niet gedaan en open

- Geen apart kleedkamerscherm: "de kleedkamer" is de zone bij de spelerspoort waar het trainingspak aangaat.
- Het tenue van de computerteams in het gewone Euroborg-spel (zonder carrière) draait op niveau amateur.
- Shirts met lange mouw staan in de winkel, maar de wedstrijdtenues kiezen de korte mouw.
- Het rugnummer heeft geen eigen lettertype (zeven-segmentcijfers) en de naamstrook is een balk (geen letters).
