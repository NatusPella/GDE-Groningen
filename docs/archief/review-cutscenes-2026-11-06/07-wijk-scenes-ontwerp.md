# 07 — Lange scènes per veroverde wijk (ontwerp)

**Status:** statisch gelezen op `e5e8b712` (main; werkboom had al wijzigingen). Geen runtime, Electron, spel of tests; geen commits. Bronnen: `cinematics.js` 681-909, `camerapath.js`, `cutscript.js`, `cutscenes.js`, `cutscenehost.js`, `coopcut.js`, `gebieden.js/live/bronnen`, `grenzen.json`, `stad.json`, `landmarks3d.js`, `landmarkmodels.js`, `marktgebouwen.js`, `thuis3d.js`, `cityprops.js`, `intromontage.js`, `activities.js`, `banterlines.js`, `docs/GEBIEDEN.md`, `docs/verhaal/nieuw/00-OVERZICHT.md`, `docs/PROVINCIE-VERHAAL.md`, `docs/verhaal/STIJLGIDS.md`.

## 1. Welke wijken zijn veroverbaar (benadering)

**Methode.** `MIN_TAKEN = 2`, vijf lagen. HUD en eerste-bezoek-scène gebruiken de **66 buurtpunten** (`stad.json`, `WIJK_LINES`); de veroverlaag gebruikt de **123 CBS-wijken** (`grenzen.json`, in de stad 20: Centrum, Oud-Zuid, Nieuw-Noord, …). Ik koppelde bekende taakpunten (missiestarts, padelbanen, klimtoren, skatepark, discgolf, zwembad, kermis, carillon, vaste bijbanen) aan het dichtstbijzijnde CBS-binnenpunt `c`. **Geen punt-in-polygoon, geen spellogica:** benadering, vooral bij padel (8 banen) en de parktaken.

| Wijk (CBS) | Buurt/plek | ≥2, benaderd | Zekerheid |
|---|---|---|---|
| Centrum | Binnenstad, Vismarkt, A-kwartier | 5 missiestarts (M01/02/03/06/10), kermis, carillon, taxi, bezorger, rondvaart | hard |
| Oud-Zuid | Stationsgebied, museum, Herebrug | M04/08/09, bus, fietsdepot, museum (M06) | hard |
| Oud-Oost | Oosterparkwijk, Kop van Oost, Vogelbuurt | M05 + padel Vogelbuurt | waarschijnlijk |
| Oud-West | Schildersbuurt, Westerhaven, Suikerfabriek | padel Suikerfabriek + padel Kostverloren | waarschijnlijk (2× padel) |
| Nieuw-Noord | Paddepoel, Paddepoel-Noord, Zernike | klimtoren + padel Paddepoel-Noord | hard |
| Zuidwest | Stadspark, Martini Trade Park | skatepark + discgolf + padel Martini Trade Park | waarschijnlijk |
| Nieuw-West / Hoogkerk | Hoogkerk | boerderij + bietenoogst + suikerbieten | hard, maar **woonplaats** |
| Midden-Zuid | Sterrebosbuurt, Europapark | zwembad + padel Europapark (1,5 km uit elkaar) | twijfel |
| Oud-Noord | Korrewegwijk, De Hoogte, Noorderplantsoen | geen taken gevonden | nee |
| Nieuw-Oost / Zuidoost | Ulgersmaborg / Eemskanaal | alleen één padelbaan | nee |
| Meerstad e.o. | Meerstad | alleen hengelen | nee |

**Conclusies.** (1) Geliefde buurten als Oosterparkwijk, Korrewegwijk, Noorderplantsoenbuurt, Selwerd, Herewegbuurt, De Hoogte, Westerhaven en Ebbingekwartier halen op de **vaste taakankers** 0-1 taken en zijn dus niet veroverbaar; een scène daar vuurt nooit. (2) In de stad blijven ~5-6 CBS-wijken over, deels door padel. (3) Wil de eigenaar een scène per buurt, dan: `MIN_TAKEN` voor buurten op 1, twee taken per buurt toevoegen (de 8 geheimen zijn bewust geen taak), of de scène ook op de **buurtlaag** laten vuren. Mijn scènes hangen aan een **plek + coördinaat**, niet aan een polygon.

## 2. De acht scènes

**Vorm.** Drie hoofdstukken (A/B/C) per scène, elk met eigen anker; 4-7 shots, 24-34 s, één eindkaart. Dat hoofdstukmodel is het enige nieuwe raamwerkstuk (zie §5); zonder dat bouw je A en gebruik je B/C als camera-only postcards. Elke scène is een `playScript`-def (data, geen functies), zodat gasten hetzelfde pakket krijgen; max 3 ondertitelregels (bubble telt niet); ~3-5 kB per def (limiet 32.000). Elke eindkaart toont titel, geld, vlag en safehouse-sleutel. Samen staat in §6.

### 1. Centrum — "Klokslag" · 32 s · opgetogen
**Anker** A Grote Markt (214,10); B Vismarkt (17,256); C Forum (357,58). **Cast** Tammo, Tessa, koopman, duif. **Props** `tas`, `bord`, `duif`.

| t | shot | wat | h/fov | d | aansluiting |
|---|---|---|---|---|---|
| 0 | orbit | toren, kermis, markt; 22→6 m | 50→44 | 6 | titel |
| 6 | dolly | carillon → Tammo/Tessa aan de voet | 38 | 6 | op klokslag |
| 14 | dolly | Vismarkt, Korenbeurs, patatje | 42 | 8 | match cut |
| 24 | crane | Forum-gevel → dak, twee klein | 55 | 8 | eindkaart |

**Beeld** 17:40. Martinitoren (GLB, 95 m), kermis, carillon, kramen; Korenbeurs; Forum met glazen sleuf en dak. **Alleen hier:** klok, kermis en viskraam in één straat.
**Geluid** Tessa "Iedereen doet alsof hij hier per ongeluk loopt."; Tammo "Ik kom voor de klok."; Tessa "Je komt voor de friet." Carillon, kermis_ding, meeuwen; geen muziek.
**Verovering** Wijkheld van Centrum, €150, vlag, safehouse; grap "De duif had hier al een sleutel."
**Techniek** Toren-GLB, Martinikerk, Stadhuis, Goudkantoor, Korenbeurs, Forum, kermis, carillon; nieuw 4 shots + 3 regels; **M**.

### 2. Oud-Zuid — "Aankomen" · 30 s · warm, weemoedig
**Anker** A Stationsplein (-45,956); B museum (83,803); C Herebrug (330,830). **Cast** Tammo, Tessa, reiziger. **Props** `tas`, `koffer`, `duif`.

| t | shot | wat | h/fov | d | aansluiting |
|---|---|---|---|---|---|
| 0 | orbit | station, luifel, bussen | 18→8/48 | 6 | titel |
| 6 | dolly | busrij; Tessa kijkt op haar telefoon | 1,5/40 | 6 | op de zucht |
| 12 | crane | museum: gouden toren, pastel, brug | 4→28/44 | 8 | cut toren |
| 20 | orbit | de twee op de museumbrug, water | 2→3,4/42 | 5 | op de stad |
| 25 | cut | wide station, treinfluit | 6/50 | 5 | eindkaart |

**Beeld** 19:10. Baksteen, leien daken, luifel; gouden toren, Mendini-pastel, brug. **Alleen hier:** station en museum op 700 m vertellen de hele heen-en-weer.
**Geluid** Tessa "Iedereen komt hier aan. Niemand blijft."; Tammo "Wij zijn twee haltes opgeschoven."; Tessa "Paddepoel is geen halte, Tammo." Bus, treinfluit, meeuwen; geen muziek.
**Verovering** Wijkheld van Oud-Zuid, €150; grap "Welkom terug."
**Techniek** Hoofdstation, Museum, bussen/taxi's, `tas`/`koffer`/`duif`; nieuw 5 shots + 3 regels; **S/M**.

### 3. Oud-Oost — "De stoep" · 34 s · energiek, dan stil
**Anker** A Korenbloemstraat (1308,-805); B Trompsingel (594,635); C Kop van Oost (1256,228). **Cast** Tammo, Tessa, Rikus, kind. **Props** `radio`, `fiets`, `koffer`, `duif`.

| t | shot | wat | h/fov | d | aansluiting |
|---|---|---|---|---|---|
| 0 | dolly | straat in; Rikus op de stoep met radio | 1,55/38 | 7 | titel |
| 7 | orbit | Rikus, Tammo, Tessa; kind fietst langs | 2,2/42 | 6 | op fietsbel |
| 13 | dolly | Trompsingel: koffers, posters, band | 1,5/40 | 6 | op gitaar |
| 19 | crane | over de Oosterpoort naar het water | 24/50 | 9 | op water |
| 28 | cut | kade, bankje, meeuw; skyline | 8/52 | 6 | eindkaart |

**Beeld** 20:30. Arbeiderswoningen (Bouma-bouw), de stoep van Tammo en Rikus, de muziekzaal, water en pakhuizen. **Alleen hier:** stoep, band en water op één avondwandeling.
**Geluid** Rikus "Hier repeteert elke band die later beroemd wordt. Of niet."; Tammo "Hij had een mengtafel van karton."; Rikus "En twee luisteraars." Fietsbel, gitaar, water, meeuwen; geen muziek.
**Verovering** Wijkheld van Oud-Oost, €150; grap "De band heeft nog geen naam. De wijk wel." Rikus krijgt een naamkaart als hij nog niet bekend is.
**Techniek** Korenbloemstraat (thuis3d), Rikus-look, `radio`/`fiets`/`koffer`/`duif`, water/boten; nieuw 5 shots + 3 regels + naamkaart; **M**.

### 4. Oud-West — "De westkant" · 30 s · droog, dan warm
**Anker** A Schildersbuurt (-861,292); B Westerhaven (-463,499); C Suikerfabriek (-1788,930). **Cast** Tammo, Tessa, Berend, kat. **Props** `klembord`, `fiets`, `tas`, `kat`.

| t | shot | wat | h/fov | d | aansluiting |
|---|---|---|---|---|---|
| 0 | dolly | smalle straat; Berend met klembord op klapstoel | 1,5/36 | 6 | titel |
| 6 | cut | Berend telt; kat steekt over | 1,4/30 | 5 | op kat |
| 11 | orbit | Westerhaven: water, boten, winkelcentrum | 10/46 | 7 | cut mast |
| 18 | dolly | kade; Tessa wijst naar leeg fietsenrek | 1,5/40 | 5 | op fietsbel |
| 23 | crane | Suikerfabriek: fabriekswand, padelbaan, spelers | 20/50 | 7 | eindkaart |

**Beeld** 16:20. Schildersbuurt met smalle stoepen, Berend die "nul krassen" telt, Westerhaven met boten, Suikerfabriek met padelbanen. **Alleen hier:** de wijk waar niemand komt heeft de droogste man en de hipste padelbaan.
**Geluid** Berend "Goidag. Nul krassen. Ik tel."; Tessa "Woont u hier?"; Berend "Ik woon hier. Ik tel hier." Water, meeuwen, fietsbel, padelbal; geen muziek.
**Verovering** Wijkheld van Oud-West, €150; grap "Berend heeft de krassen geteld. Nul. De wijk is goedgekeurd."
**Techniek** Berend-look, klembord, kat, fiets, Westerhaven, padelbaan; nieuw 5 shots + 3 regels; **S/M**. Verovering kan hier door twee padelbanen komen; de scène maakt dat menselijk, de telling blijft een risico.

### 5. Nieuw-Noord — "Tegenwind" · 34 s · vrolijk, komisch
**Anker** A klimtoren Zernike (-1844,-1844); B padel Paddepoel-Noord (-2270,-1855); C Pleiadenlaan (-1285,-1083). **Cast** Tammo, Tessa, student, klimmer. **Props** `fiets`, `tas`, `duif`.

| t | shot | wat | h/fov | d | aansluiting |
|---|---|---|---|---|---|
| 0 | dolly | klimtoren: wachtenden, klimmer halverwege | 1,6/40 | 7 | titel |
| 7 | crane | langs de klimmer omhoog; campus, flats | 14/46 | 7 | op top |
| 14 | cut | padelbaan: rally, Tammo mist | 1,5/42 | 6 | op bal |
| 20 | dolly | winkelcentrum; wind rukt aan een zak | 1,5/38 | 6 | op wind |
| 26 | orbit | Pleiadenlaan: woontoren, lichtje op de elfde | 18/50 | 4 | op lichtje |
| 30 | cut | wide dusk: toren, flats, fietslampjes | 12/52 | 4 | eindkaart |

**Beeld** 21:00. 12 m klimtoren, padelkooi, winkelcentrum met "eigen klimaat", flats en de woontoren waar Tammo op de elfde woont; de wind is de derde hoofdpersoon. **Alleen hier:** klimmen, padel en boodschappen zonder auto, alle drie op 500 m.
**Geluid** Tessa "Iedereen fietst hier tegen de wind in."; Tammo "En terug ook."; Tessa "Dat is de grap." Een klimmer boven, als bubble: "Kon minder." Wind, fietsbellen, padelbal; geen muziek.
**Verovering** Wijkheld van Nieuw-Noord, €150; grap "De wind is gratis. De rest niet."
**Techniek** Klimtoren, padelbaan, winkelcentrum Paddepoel, House of Groningen/Pleiadenlaan (thuis3d), Bakkie Prut, student/klimmer-looks; nieuw 6 shots + 3 regels + klim-animatie; **M**.

### 6. Zuidwest — "Het park" · 30 s · loom, zomers
**Anker** A skatepark Stadspark (-1116,1725); B discgolf (zelfde park); C padel Martini Trade Park (-979,2507). **Cast** Tammo, Tessa, skater, kind. **Props** `fiets`, `bal`, `tas`, `duif`.

| t | shot | wat | h/fov | d | aansluiting |
|---|---|---|---|---|---|
| 0 | crane | over de bomen naar het skatepark | 4/50 | 6 | titel |
| 6 | dolly | langs de bowl; Tessa met tas, kind kijkt | 1,4/38 | 6 | op trap |
| 12 | cut | discgolf: mand op de wei, speler draait | 1,8/42 | 6 | op mand |
| 18 | orbit | padelkooi: rally, glas, twee spelers | 3/44 | 6 | op smash |
| 24 | cut | wide park, picknickers, eenden, stad | 6/52 | 6 | eindkaart |

**Beeld** 14:00. Stadspark met skatepark, discgolfmanden en padelkooi; picknickers, eenden, fietsers. **Alleen hier:** één park waar je op één middag skatet, discgolft en padelt.
**Geluid** Tessa "In augustus is dit de achtertuin van de stad."; Tammo "In september is het van niemand."; Tessa "Tammo." Wind, eenden, wielen, padelbal; geen muziek.
**Verovering** Wijkheld van Zuidwest, €150; grap "De eenden hebben de schijf. Weer."
**Techniek** Skatepark, discgolf, padel Martini Trade Park, parkbomen; nieuw 5 shots + 3 regels; **S/M**. Geen disc-prop: toon de worp in silhouette of de mand.

### 7. Hoogkerk — "De oogst" · 30 s · warm, groot
**Anker** A akker Hoogkerk (-4520,-1497); B Suikerhal; C polderweg met stad. **Cast** Tammo, Tessa, boer. **Props** `trekker`, `doos`, `bord`, `duif`.

| t | shot | wat | h/fov | d | aansluiting |
|---|---|---|---|---|---|
| 0 | dolly | over de bietenrij; trekker komt dichterbij | 1,2/40 | 6 | titel |
| 6 | cut | boer op de trekker, zwaait; T/T aan de rand | 1,6/36 | 6 | op zwaai |
| 12 | crane | omhoog over de oogst, polder, stad | 22/50 | 7 | op toren |
| 19 | orbit | de twee met een doos, Suikerhal achter | 2,6/44 | 6 | op fabriek |
| 25 | dolly | polderweg bij avond, tractorlicht | 2/46 | 5 | eindkaart |

**Beeld** 20:50. Bieten, klei, trekker, Suikerhal en de stad klein aan de horizon. **Alleen hier:** de stad is silhouette, het land is hoofdpersoon. (Woonplaats: eindkaart "Burgemeester van Hoogkerk", €400.)
**Geluid** Boer "Ruikt u dat? Suiker. Nog niet."; Tessa "Het is augustus."; Boer "Dan ruikt het naar vooruitzicht." Tammo, als bubble: "Modder." Trekker, wind, meeuwen; geen muziek; de boer zegt één keer "jong".
**Verovering** Burgemeester van Hoogkerk, €400, vlag, safehouse; grap "De suiker komt in september. De rekening ook."
**Techniek** `trekker`, boer-look, akker/polder, `doos`/`bord`/`duif`; nieuw 5 shots + 3 regels; **S/M**.

### 8. Oud-Noord — "De zolder" · 28 s · intiem (voorbereid)
**Anker** A Korrewegwijk (356,-1338); B Noorderplantsoen (121,-725); C De Hoogte (-270,-1555). **Cast** Tammo, Tessa, buurvrouw. **Props** `fiets`, `tas`, `duif`, `kat`.

| t | shot | wat | h/fov | d | aansluiting |
|---|---|---|---|---|---|
| 0 | dolly | Korreweg: studentenhuizen, waslijnen, fietsen | 1,55/38 | 6 | titel |
| 6 | crane | omhoog naar het zolderraam, gordijn, plant | 8/40 | 6 | op gordijn |
| 12 | orbit | Noorderplantsoen: vijver, gras, studenten | 6/46 | 6 | cut vijver |
| 18 | cut | bankje; buurvrouw groet "Moi" | 1,5/42 | 5 | op groet |
| 23 | cut | golden hour over park en toren | 5/50 | 5 | eindkaart |

**Beeld** 18:30. Korreweg met waslijnen, zolderraam, Noorderplantsoen, De Hoogte met "moi". **Alleen hier:** Tammo's vier vierkante meter en het park waar heel Stad op de eerste zonnige dag ligt. **Status:** Oud-Noord heeft nu 0 taken; pas te bouwen als er twee bijkomen (of `MIN_TAKEN` voor de buurtlaag op 1 gaat). Dit is de scène met de meeste emotie per euro.
**Geluid** Tammo "Hier woonde ik op vier vierkante meter."; Tessa "Met drie huisgenoten."; Tammo "Het was gezellig. Noodgedwongen." Fietsen, wind, park, kinderen, "Moi"; geen muziek.
**Verovering** Later: Wijkheld van Oud-Noord, €150; grap "De zolder is er nog. De huur ook."
**Techniek** Korreweg, Noorderplantsoen, De Hoogte, `fiets`/`tas`/`duif`/`kat`, buurvrouw-look; nieuw 5 shots + 3 regels + 2 taken; **S.**

## 3. Overige veroverbare wijken (één alinea)

**Midden-Zuid — "Het Natte Papier" (28 s).** Zwembad Het Natte Papier aan de Papiermolenlaan (25 m-baan, startblokken, vlaggenlijnen), padelbaan Europapark, Euroborg-station. Uniek: Tessa duikt, Tammo telt de slagen en komt één tel achter; een trein rijdt langs. **Twijfelgeval:** bad en baan liggen 1,5 km uit elkaar; alleen bouwen als de telling één wijk ziet.

**Meerstad e.o. — "Het meer" (24 s).** Hengelsteiger aan het Meerstad-meer, nieuwe huizen aan het water, riet en meerkoeten. Uniek: Tammo heeft beet, Tessa zegt "Dat is een tak", en het is een tak. **Niet veroverbaar** met alleen hengelen; wacht op een tweede taak of gebruik hem als sfeerscène.

**Nieuw-West — "De polder" (26 s).** Reitdiepswaard met nieuwe huizen aan oud water, zeilboten en dijk; Hoogkerk heeft scène 7. Uniek: de brug gaat open en iedereen wacht, ook de haastige. **Twijfel:** de Hoogkerk-taken tellen op de woonplaats, niet op de wijk.

De overige buurten (Binnenstad-Oost, Hortusbuurt, Ebbingekwartier, Westerhaven, Schildersbuurt, De Hoogte, Selwerd, Reitdiepswaard, Hoendiep, Herewegbuurt, Rivierenbuurt, Grunobuurt, Laanhuizen, Zuiderpark, Zeeheldenbuurt, Oranjewijk, Professorenbuurt, Noorderplantsoenbuurt, Korrewegwijk, Oosterparkwijk, Damsterkwartier, Kop van Oost, Eemskanaal, Suikerfabriekterrein, Europapark, Paddepoel-Zuid, Het Blauwe Dorp, De Meeuwen) hebben 0-1 taken. Elk krijgt de generieke template (§4), met één eigen titel en één eigen moment; voorbeeld: "De Kiekdeuse" (Forum, Nieuwe Markt, Prinsentuin), "De tuin is weg" (Hortus, Noorderhaven, pannenkoekenschip), "Hier was ik mijn fiets drie uur kwijt" (Westerhaven).

## 4. Generieke template (wijk zonder eigen landmark)

**"Moi, <wijk>" · 22-24 s · 4 shots.** Anker: het wijkpunt uit `stad.json`, 6 m van de drukste straat. **Cast** Tammo, Tessa, één buurtbewoner (`buurvrouw`, `student`, `kind` of `boer`). **Props** één (`fiets`, `tas`, `kat` of `duif`).

| t | shot | wat | h/fov | d |
|---|---|---|---|---|
| 0 | crane | over de daken naar de straat; kerk/park in de verte | 4/50 | 6 |
| 6 | dolly | de straat in; buurtbewoner doet iets kleins | 1,5/40 | 6 |
| 12 | cut | detail: deurbel, plant, krijttekening, kat | 1,3/32 | 5 |
| 17 | cut | wide met de twee en de buurtbewoner; beste regel uit `WIJK_LINES` | 3/48 | 5-7 |

**Waarom het werkt:** bestaande `wijkLine` (geen nieuwe tekst), `wijkHighlights` voor de kijklijn, alleen bestaande props; **S**, packet <2,5 kB. **Grap:** de buurtbewoner zegt één Gronings woord ("Moi", "Kon minder", "Jong") en Tessa vertaalt het verkeerd. **Verovering:** Wijkheld van <naam>, €150, vlag.

## 5. Advies over de eerste-bezoek-scène

- **`WIJK_LINES` en `wijkHighlights` houden.** Ze zijn de stem en de kijklijn van de buurten (HUD `wijkBlurb`, kaart, banter) en leveren de drie hoofdstukken van de lange scène. Hooguit één regel toevoegen.
- **`wijkFilm` herbestemmen.** Nu "Filmpje bij nieuwe wijken" (uit, 11 s flyover). Maak er "Lange wijkfilm bij verovering" van (aan, skipbaar met Spatie/Esc); de eerste visit wordt een **kaart van 3,5-5 s** met de Rikus-regel en "Te zien: …". Wie `Beweging beperken` aan heeft, krijgt alleen de kaart. `playWijk`/`prepWijk`/`wijkStreetShot` kunnen als establishing shot worden hergebruikt of vervallen.
- **`wijkenSeen` houden, aparte sleutel toevoegen.** `gde-wijken-seen` blijft voor de eerste visit (en prestaties). Voor de lange scène een nieuwe sleutel (`gde-wijkfilms-seen`, max ~120) zodat save/reload niet opnieuw afspeelt en een tweede verovering niet opnieuw vuurt; zet hem in `storagekeys.js` en de `ARC_KEYS`-lijst.
- **HUD-plaatsnaam.** `wijkBlurb` blijft de regel onder de straatnaam. Na de verovering mag daar één keer de titel ("Wijkheld van …") verschijnen, niet permanent. `placeCandidate` (`hud_panel.js` r. 782-798) hoeft niet te veranderen.
- **Trigger en volgorde.** Hang de scène in `gebiedenlive.js` aan `betaal()`: als `b.niveau === 'wijk'` (en eventueel `'woonplaats'`), zet een `pendingWijkFilm` op de wereld in plaats van (of naast) de toast. Speel hem pas als er geen missie, cinematic, respawn of pauze is (via de bestaande `mayInterrupt('wijk', w)`), en na de missie-outro. Bij meerdere beloningen in één `markeer()`: eerst de hoogste laag, de rest als toast.
- **Geen dubbele beloning en geen vaste klok.** De scène toont alleen titel, geld, vlag en safehouse-sleutel; `betaal()` heeft het geld al gegeven. De eindkaart is een `playCinematic`-card (`kicker`, `title`, `accent`), geen tweede `addMessage`. `intromontage.js` kan `setClock`/`setWeather`, maar een `playScript`-def niet: voeg aan het hoofdstukmodel een optionele `clock`/`tint` toe, of accepteer de klok van de speler. Altijd zomer.

## 6. Samen spelen per scène

**Regel voor alle scènes:** de gastheer stuurt de def als één logisch pakket (`cutPakket`, in stukjes van 800 tekens, `CUT_MAX_CHARS = 32.000`); de gast speelt hem lokaal na (`playScript(..., replay: true)`) en ziet geen online-avatars. De gastheer bepaalt het einde; een gast kan alleen zijn eigen weergave overslaan. De beloning en het `gedaan`-profiel zijn per speler; een gast die zijn eigen wijk veroverd heeft, ziet de scène alleen lokaal, niet bij de anderen. Late join krijgt geen replay; toon hooguit de eindkaart/het toast als hij de wijk al veroverd heeft.

| Scène | Pakket | Bijzonder |
|---|---|---|
| 1 Centrum | ~4 kB | duif en kermis zijn wereldprops |
| 2 Oud-Zuid | ~3,5 kB | bussen/taxi's uit het verkeer |
| 3 Oud-Oost | ~4 kB | Rikus eenmalig, naamkaart |
| 4 Oud-West | ~3,5 kB | Berend eenmalig |
| 5 Nieuw-Noord | ~4 kB | klimmer/studenten figuratie |
| 6 Zuidwest | ~3,5 kB | skater/kind figuratie |
| 7 Hoogkerk | ~3,5 kB | boer eenmalig |
| 8 Oud-Noord | ~3 kB | pas na twee taken |
| Generiek | <2,5 kB | één buurtbewoner |

## 7. Top-5 om als eerste te bouwen, en wat ik niet heb bekeken

**Top-5.** 1. **Centrum "Klokslag"** — hoogste inhoud, bijna alles bestaat, zet het hoofdstukformat en de eindkaart. 2. **Oud-Zuid "Aankomen"** — station + museum, het beste bookend, weinig nieuwe assets. 3. **Nieuw-Noord "Tegenwind"** — bewijst dat activiteiten (klimtoren, padel, winkelcentrum) zonder nieuwe props kunnen, sterkste grap. 4. **Oud-West "De westkant"** — Berend en de droogste toon; goedkoop (S/M), geeft een vergeten wijk een gezicht. 5. **Oud-Oost "De stoep"** — de emotionele scène (Tammo's stoep, Rikus); duurder (drie ankers), maar het hart van het verhaal. Hoogkerk is de beste **buiten-de-stad-pilot** als woonplaatsen meetellen.

**Niet bekeken / niet geverifieerd.** Geen runtime, Electron, wereldtegels (`game/world/` is niet gebouwd), dus geen echte beelden, maten of prestaties. Niet doorgerekend: punt-in-polygoon voor de 123 CBS-wijken (tabel is centroid-benadering), de exacte telling van de 151 taken, of het hoofdstukmodel al bestaat (het bestaat **niet** in `cutscript.js`/`cutscenehost.js`; raamwerkvoorstel), of de Martinitoren-GLB laadt, of de 30 s-preload/perf haalbaar is, en of TTS voor de nieuwe regels beschikbaar is. Niet bekeken: mobiel/touch, 4K/HUD-schaling, pauzemenu-teksten, coop-late-join in de praktijk, de `CoopCut`-rolverdeling bij een gast die zelf veroverd, en de precieze CBS-grenzen van padelbanen, klimtoren, skatepark en zwembad.
