# 07 — Lange scènes per veroverde wijk (ontwerp)

**Status:** statisch gelezen op `e5e8b712` (main; werkboom had al wijzigingen). Geen runtime, Electron, spel of tests; geen commits. Bronnen: `cinematics.js` 681-909, `camerapath.js`, `cutscript.js`, `cutscenehost.js`, `coopcut.js`, `gebieden*`, `grenzen.json`, `stad.json`, de landmark-/markt-/thuis-modules, `activities.js`, `banterlines.js`, `docs/GEBIEDEN.md` en de verhaal-docs.

## 1. Welke wijken zijn veroverbaar (benadering)

**Methode.** `MIN_TAKEN = 2`, vijf lagen. HUD en eerste-bezoek-scène gebruiken de **66 buurtpunten** (`stad.json`, `WIJK_LINES`); de veroverlaag gebruikt de **123 CBS-wijken** (`grenzen.json`, in de stad 20: Centrum, Oud-Zuid, Nieuw-Noord, …). Ik koppelde de **151 taken** (missiestarts, padelbanen, klimtoren, skatepark, discgolf, zwembad, kermis, carillon, vaste bijbanen) aan het dichtstbijzijnde CBS-binnenpunt `c`. **Geen punt-in-polygoon, geen spellogica:** benadering.

| Wijk (CBS, Groningen) | Buurt/plek | ≥2, benaderd | Zekerheid |
|---|---|---|---|
| Centrum | Binnenstad, Vismarkt, A-kwartier | 5 missiestarts (M01/02/03/06/10), kermis, carillon, taxi, bezorger, rondvaart | hard |
| Oud-Zuid | Stationsgebied, museum, Herebrug | M04/08/09, bus, fietsdepot, museum (M06) | hard |
| Oud-Oost | Oosterparkwijk, Kop van Oost, Vogelbuurt | M05 + padel Vogelbuurt | waarschijnlijk |
| Oud-West | Schildersbuurt, Westerhaven, Suikerfabriek | padel Suikerfabriek + padel Kostverloren | waarschijnlijk (2× padel) |
| Nieuw-Noord | Paddepoel, Paddepoel-Noord, Zernike | klimtoren + padel Paddepoel-Noord | hard |
| Zuidwest | Stadspark, Martini Trade Park | skatepark + discgolf + padel Martini Trade Park | waarschijnlijk |
| Nieuw-West / Hoogkerk | Hoogkerk | boerderij + bietenoogst + suikerbieten | hard, maar **woonplaats** |
| Midden-Zuid | Sterrebosbuurt, Europapark | zwembad + padel Europapark (1,2 km uit elkaar) | twijfel |
| Oud-Noord | Korrewegwijk, De Hoogte, Noorderplantsoen | geen taken gevonden | nee |

Nieuw-Oost, Zuidoost en Meerstad hebben alleen één padelbaan of hengelen: niet veroverbaar.

**Conclusies.** (1) Geliefde buurten als Oosterparkwijk, Korrewegwijk, Noorderplantsoenbuurt, Selwerd, Herewegbuurt, De Hoogte, Westerhaven en Ebbingekwartier halen op de **vaste taakankers** 0-1 taken en zijn dus niet veroverbaar; een scène daar vuurt nooit. (2) In de stad blijven ~5-6 CBS-wijken over, deels door padel. (3) Wil de eigenaar een scène per buurt, dan: `MIN_TAKEN` voor buurten op 1, twee taken per buurt toevoegen (de 8 geheimen zijn bewust geen taak), of de scène ook op de **buurtlaag** laten vuren. Mijn scènes hangen aan een **plek + coördinaat**, niet aan een polygon.

## 2. De acht scènes

**Vorm.** Drie hoofdstukken (A/B/C) per scène, elk met eigen anker; 4-7 shots, 24-34 s, één eindkaart. Dat hoofdstukmodel is het enige nieuwe raamwerkstuk (zie §5); zonder dat bouw je A en gebruik je B/C als camera-only postcards. Elke scène is een `playScript`-def (data, geen functies), zodat gasten hetzelfde pakket krijgen; max 3 ondertitelregels; ~3-5 kB (limiet 32.000). Elke eindkaart: titel, geld, vlag, safehouse.

### 1. Centrum — "Klokslag" · 32 s · opgetogen
**Anker** A Grote Markt (214,10); B Vismarkt (17,256); C Forum (357,58). **Cast** Tammo, Tessa, koopman, duif. **Props** `tas`, `bord`, `duif`.

| t | shot | wat | h/fov | d | aansluiting |
|---|---|---|---|---|---|
| 0 | orbit | toren, kermis, markt; 22→6 m | 50→44 | 6 | titel |
| 6 | dolly | carillon → Tammo/Tessa aan de voet | 1,6/38 | 8 | op klokslag |
| 14 | dolly | Vismarkt, Korenbeurs, patatje | 1,5/42 | 10 | match cut |
| 24 | crane | Forum-gevel → dak, twee klein | 46/55 | 8 | eindkaart |

**Beeld** 17:40. Martinitoren (95 m), kermis, carillon, kramen; Korenbeurs; Forum met glazen sleuf en dak. **Alleen hier:** klok, kermis en viskraam in één straat.

**Geluid** Tessa "Iedereen doet alsof hij hier per ongeluk loopt."; Tammo "Ik kom voor de klok."; Tessa "Je komt voor de friet." Carillon, kermis_ding, meeuwen; geen muziek.

**Verovering** Wijkheld van Centrum, €150, vlag, safehouse; grap "De duif had hier al een sleutel."

**Techniek** Toren-GLB, Martinikerk, Goudkantoor, Korenbeurs, Forum, kermis, carillon; nieuw 4 shots + 3 regels; **M**.


### 2. Oud-Zuid — "Aankomen" · 30 s · warm, weemoedig
**Anker** A Stationsplein (-45,956); B museum (83,803); C Herebrug (330,830). **Cast** Tammo, Tessa, reiziger. **Props** `tas`, `koffer`, `duif`.

| t | shot | wat | h/fov | d | aansluiting |
|---|---|---|---|---|---|
| 0 | orbit | station, luifel, bussen | 18→8/48 | 6 | titel |
| 6 | dolly | busrij; Tessa kijkt op haar telefoon | 1,5/40 | 8 | op de zucht |
| 14 | crane | museum: gouden toren, pastel, brug | 4→28/44 | 9 | cut toren |
| 23 | orbit | de twee op de museumbrug, water | 2→3,4/42 | 7 | eindkaart |

**Beeld** 19:10. Baksteen, leien daken, luifel; gouden toren, Mendini-pastel, brug. **Alleen hier:** station en museum op 700 m vertellen de hele heen-en-weer.

**Geluid** Tessa "Iedereen komt hier aan. Niemand blijft."; Tammo "Wij zijn twee haltes opgeschoven."; Tessa "Paddepoel is geen halte, Tammo." Bus, treinfluit, meeuwen; geen muziek.

**Verovering** Wijkheld van Oud-Zuid, €150; grap "Welkom terug."

**Techniek** Hoofdstation, Museum, bussen/taxi's; nieuw 4 shots + 3 regels; **S/M**.


### 3. Oud-Oost — "De stoep" · 34 s · energiek, dan stil
**Anker** A Korenbloemstraat (1308,-805); B Trompsingel (594,635); C Kop van Oost (1256,228). **Cast** Tammo, Tessa, Rikus, kind. **Props** `radio`, `fiets`, `koffer`, `duif`.

| t | shot | wat | h/fov | d | aansluiting |
|---|---|---|---|---|---|
| 0 | dolly | straat in; Rikus op de stoep met radio | 1,55/38 | 8 | titel |
| 8 | orbit | Rikus, Tammo, Tessa; kind fietst langs | 2,2/42 | 8 | op fietsbel |
| 16 | dolly | Trompsingel: koffers, posters, band | 1,5/40 | 8 | op gitaar |
| 24 | crane | over de Oosterpoort naar het water | 24/50 | 10 | eindkaart |

**Beeld** 20:30. Arbeiderswoningen (Bouma-bouw), de stoep van Tammo en Rikus, de muziekzaal, water en pakhuizen. **Alleen hier:** stoep, band en water op één avondwandeling.

**Geluid** Rikus "Hier repeteert elke band die later beroemd wordt. Of niet."; Tammo "Hij had een mengtafel van karton."; Rikus "En twee luisteraars." Fietsbel, gitaar, water, meeuwen; geen muziek.

**Verovering** Wijkheld van Oud-Oost, €150; grap "De band heeft nog geen naam. De wijk wel." Rikus: naamkaart.

**Techniek** Korenbloemstraat, Rikus-look, radio/fiets/koffer; nieuw 4 shots + 3 regels + naamkaart; **M**.


### 4. Oud-West — "De westkant" · 30 s · droog, dan warm
**Anker** A Schildersbuurt (-861,292); B Westerhaven (-463,499); C Suikerfabriek (-1788,930). **Cast** Tammo, Tessa, Berend, kat. **Props** `klembord`, `fiets`, `tas`, `kat`.

| t | shot | wat | h/fov | d | aansluiting |
|---|---|---|---|---|---|
| 0 | dolly | smalle straat; Berend met klembord op klapstoel | 1,5/36 | 6 | titel |
| 6 | cut | Berend telt; kat steekt over | 1,4/30 | 7 | op kat |
| 13 | orbit | Westerhaven: water, boten, winkelcentrum | 10/46 | 8 | cut mast |
| 21 | crane | Suikerfabriek: fabriekswand, padelbaan, spelers | 20/50 | 9 | eindkaart |

**Beeld** 16:20. Schildersbuurt met smalle stoepen, Berend die "nul krassen" telt, Westerhaven met boten, Suikerfabriek met padelbanen. **Alleen hier:** de wijk waar niemand komt heeft de droogste man en de hipste padelbaan.

**Geluid** Berend "Goidag. Nul krassen. Ik tel."; Tessa "Woont u hier?"; Berend "Ik woon hier. Ik tel hier." Water, meeuwen, fietsbel, pala; geen muziek.

**Verovering** Wijkheld van Oud-West, €150; grap "Berend heeft de krassen geteld. Nul. De wijk is goedgekeurd."

**Techniek** Berend-look, klembord, kat, Westerhaven, padelbaan; nieuw 4 shots + 3 regels; **S/M**. Verovering kan hier door twee padelbanen komen; de scène maakt dat menselijk.


### 5. Nieuw-Noord — "Tegenwind" · 34 s · vrolijk, komisch
**Anker** A klimtoren Zernike (-1844,-1844); B padel Paddepoel-Noord (-2270,-1855); C Pleiadenlaan (-1285,-1083). **Cast** Tammo, Tessa, student, klimmer. **Props** `fiets`, `tas`, `duif`.

| t | shot | wat | h/fov | d | aansluiting |
|---|---|---|---|---|---|
| 0 | dolly | klimtoren: wachtenden, klimmer halverwege | 1,6/40 | 8 | titel |
| 8 | crane | langs de klimmer omhoog; campus, flats | 14/46 | 8 | top |
| 16 | cut | padelbaan: rally, Tammo mist | 1,5/42 | 8 | op bal |
| 24 | orbit | Pleiadenlaan: woontoren, lichtje op de elfde | 18/50 | 10 | eindkaart |

**Beeld** 21:00. 12 m klimtoren, padelkooi, winkelcentrum met "eigen klimaat", flats en de woontoren waar Tammo op de elfde woont; de wind is de derde hoofdpersoon. **Alleen hier:** klimmen, padel en boodschappen zonder auto, alle drie op 500 m.

**Geluid** Tessa "Iedereen fietst hier tegen de wind in."; Tammo "En terug ook."; Tessa "Dat is de grap." Een klimmer boven, als bubble: "Kon minder." Wind, fietsbellen, pala; geen muziek.

**Verovering** Wijkheld van Nieuw-Noord, €150; grap "De wind is gratis. De rest niet."

**Techniek** Klimtoren, padelbaan, winkelcentrum Paddepoel, Pleiadenlaan, Bakkie Prut; nieuw 4 shots + 3 regels + klim-animatie; **M**.


### 6. Zuidwest — "Het park" · 30 s · loom, zomers
**Anker** A skatepark Stadspark (-1116,1725); B discgolf (zelfde park); C padel Martini Trade Park (-979,2507). **Cast** Tammo, Tessa, skater, kind. **Props** `fiets`, `bal`, `tas`, `duif`.

| t | shot | wat | h/fov | d | aansluiting |
|---|---|---|---|---|---|
| 0 | crane | over de bomen naar het skatepark | 4/50 | 7 | titel |
| 7 | dolly | langs de bowl; Tessa met tas, kind kijkt | 1,4/38 | 8 | op trap |
| 15 | cut | discgolf: mand op de wei, speler draait | 1,8/42 | 8 | op mand |
| 23 | orbit | padelkooi: rally, glas, twee spelers | 3/44 | 7 | eindkaart |

**Beeld** 14:00. Stadspark met skatepark en discgolfmanden; de padelkooi even verderop; picknickers, eenden, fietsers. **Alleen hier:** één wijk waar je op één middag skatet, discgolft en padelt.

**Geluid** Tessa "In augustus is dit de achtertuin van de stad."; Tammo "In september is het van niemand."; Tessa "Tammo." Wind, eenden, wielen, pala; geen muziek.

**Verovering** Wijkheld van Zuidwest, €150; grap "De eenden hebben de schijf. Weer."

**Techniek** Skatepark, discgolf, padel Martini Trade Park; nieuw 4 shots + 3 regels; **S/M**. Geen disc-prop: toon de worp in silhouette of de mand.


### 7. Hoogkerk — "De oogst" · 30 s · warm, groot
**Anker** A akker Hoogkerk (-4520,-1497); B Suikerhal; C polderweg met stad. **Cast** Tammo, Tessa, boer. **Props** `trekker`, `doos`, `bord`, `duif`.

| t | shot | wat | h/fov | d | aansluiting |
|---|---|---|---|---|---|
| 0 | dolly | over de bietenrij; trekker komt dichterbij | 1,2/40 | 7 | titel |
| 7 | cut | boer op de trekker, zwaait; Tammo/Tessa aan de rand | 1,6/36 | 8 | op zwaai |
| 15 | crane | omhoog over de oogst, polder, stad | 22/50 | 8 | op toren |
| 23 | dolly | polderweg bij avond, tractorlicht | 2/46 | 7 | eindkaart |

**Beeld** 20:50. Bieten, klei, trekker, Suikerhal en de stad klein aan de horizon. **Alleen hier:** de stad is silhouette, het land is hoofdpersoon. (Woonplaats: eindkaart "Burgemeester van Hoogkerk", €400.)

**Geluid** Boer "Ruikt u dat? Suiker. Nog niet."; Tessa "Het is augustus."; Boer "Dan ruikt het naar vooruitzicht." Tammo, als bubble: "Modder." Trekker, wind, meeuwen; geen muziek; de boer zegt één keer "jong".

**Verovering** Burgemeester van Hoogkerk, €400, vlag, safehouse; grap "De suiker komt in september. De rekening ook."

**Techniek** Trekker, boer-look, akker/polder, doos; nieuw 4 shots + 3 regels; **S/M**.


### 8. Oud-Noord — "De zolder" · 28 s · intiem (voorbereid)
**Anker** A Korrewegwijk (356,-1338); B Noorderplantsoen (121,-725); C De Hoogte (-270,-1555). **Cast** Tammo, Tessa, buurvrouw. **Props** `fiets`, `tas`, `duif`, `kat`.

| t | shot | wat | h/fov | d | aansluiting |
|---|---|---|---|---|---|
| 0 | dolly | Korreweg: studentenhuizen, waslijnen, fietsen | 1,55/38 | 7 | titel |
| 7 | crane | omhoog naar het zolderraam, gordijn, plant | 8/40 | 7 | op gordijn |
| 14 | orbit | Noorderplantsoen: vijver, gras, studenten | 6/46 | 8 | cut vijver |
| 22 | cut | golden hour over park en toren | 5/50 | 6 | eindkaart |

**Beeld** 18:30. Korreweg met waslijnen, zolderraam, Noorderplantsoen, De Hoogte met "moi". **Alleen hier:** Tammo's vier vierkante meter en het park waar heel Stad op de eerste zonnige dag ligt. **Status:** Oud-Noord heeft nu 0 taken; pas te bouwen als er twee bijkomen (of `MIN_TAKEN` voor de buurtlaag op 1 gaat). Dit is de scène met de meeste emotie per euro.

**Geluid** Tammo "Hier woonde ik op vier vierkante meter."; Tessa "Met drie huisgenoten."; Tammo "Het was gezellig. Noodgedwongen." Fietsen, wind, park, kinderen, "Moi"; geen muziek.

**Verovering** Later: Wijkheld van Oud-Noord, €150; grap "De zolder is er nog. De huur ook."

**Techniek** Korreweg, Noorderplantsoen, De Hoogte; nieuw 4 shots + 3 regels + 2 taken; **S.**

## 3. Overige veroverbare wijken (één alinea)

**Midden-Zuid — "Het Natte Papier" (28 s).** Zwembad Het Natte Papier aan de Papiermolenlaan (25 m-baan, startblokken), padelbaan Europapark. Uniek: Tessa duikt, Tammo telt de slagen en komt één tel achter. **Twijfelgeval:** bad en baan liggen 1,2 km uit elkaar; alleen bouwen als de telling één wijk ziet.

**Meerstad e.o. — "Het meer" (24 s).** Hengelsteiger aan het Meerstad-meer, nieuwe huizen aan het water. Uniek: Tammo heeft beet, Tessa zegt "Dat is een tak", en het is een tak. **Niet veroverbaar** met alleen hengelen; wacht op een tweede taak of gebruik hem als sfeerscène.

De overige 28 buurten (o.a. Binnenstad-Oost, Hortusbuurt, Ebbingekwartier, Westerhaven, Schildersbuurt, De Hoogte, Selwerd, Reitdiepswaard, Herewegbuurt, Oosterparkwijk, Korrewegwijk, Noorderplantsoenbuurt, Damsterkwartier, Kop van Oost, Europapark) hebben 0-1 taken; gebruik §4.

## 4. Generieke template (wijk zonder eigen landmark)

**"Moi, <wijk>" · 22-24 s · 4 shots.** Anker: het wijkpunt uit `stad.json`, 6 m van de drukste straat. **Cast** Tammo, Tessa, één buurtbewoner (`buurvrouw`, `student`, `kind` of `boer`). **Props** één (`fiets`, `tas`, `kat` of `duif`).

| t | shot | wat | h/fov | d |
|---|---|---|---|---|
| 0 | crane | over de daken naar de straat; kerk/park in de verte | 4/50 | 6 |
| 6 | dolly | de straat in; buurtbewoner doet iets kleins | 1,5/40 | 6 |
| 12 | cut | detail: deurbel, plant, krijttekening, kat | 1,3/32 | 5 |
| 17 | cut | wide met de twee en de buurtbewoner; beste regel uit `WIJK_LINES` | 3/48 | 5-7 |

**Grap en verovering:** de buurtbewoner zegt één Gronings woord ("Moi", "Kon minder", "Jong"), Tessa vertaalt het verkeerd; **S**, packet <2,5 kB; "Wijkheld van <naam>", €150.

## 5. Advies over de eerste-bezoek-scène

- **`WIJK_LINES` en `wijkHighlights` houden.** Ze zijn de stem en de kijklijn van de buurten en leveren de drie hoofdstukken.
- **`wijkFilm` herbestemmen.** Nu "Filmpje bij nieuwe wijken" (uit, 11 s flyover). Maak er "Lange wijkfilm bij verovering" van (aan, skipbaar); de eerste visit wordt een **kaart van 3,5-5 s** met de Rikus-regel en "Te zien: …". Wie `Beweging beperken` aan heeft, krijgt alleen de kaart.
- **`wijkenSeen` houden, aparte sleutel toevoegen.** `gde-wijken-seen` blijft voor de eerste visit. Voor de lange scène `gde-wijkfilms-seen`, zodat save/reload en een tweede verovering niet opnieuw vuren; zet hem in `storagekeys.js`. De HUD-regel blijft `wijkBlurb`; na de verovering mag daar één keer de titel staan.
- **Trigger en volgorde.** Hang de scène in `gebiedenlive.js` aan `betaal()`: als `b.niveau === 'wijk'` (en eventueel `'woonplaats'`), zet een `pendingWijkFilm` op de wereld in plaats van (of naast) de toast. Speel hem pas als er geen missie, cinematic, respawn of pauze is (via de bestaande `mayInterrupt('wijk', w)`), en na de missie-outro. Bij meerdere beloningen in één `markeer()`: eerst de hoogste laag, de rest als toast. De scène toont alleen titel, geld, vlag en safehouse-sleutel; `betaal()` heeft het geld al gegeven. `intromontage.js` kan `setClock`/`setWeather`, maar een `playScript`-def niet: voeg aan het hoofdstukmodel een optionele `clock`/`tint` toe, of accepteer de klok van de speler.

## 6. Samen spelen per scène

**Regel voor alle scènes:** de gastheer stuurt de def als één logisch pakket (`cutPakket`, in stukjes van 800 tekens, `CUT_MAX_CHARS = 32.000`); de gast speelt hem lokaal na (`playScript(..., replay: true)`). De gastheer bepaalt het einde; een gast kan alleen zijn eigen weergave overslaan. Beloning en `gedaan`-profiel zijn per speler; late join krijgt geen replay.

| Scène | Pakket |
|---|---|
| 1 Centrum | ~4 kB |
| 2 Oud-Zuid | ~3,5 kB |
| 3 Oud-Oost | ~4 kB |
| 4 Oud-West | ~3,5 kB |
| 5 Nieuw-Noord | ~4 kB |
| 6 Zuidwest | ~3,5 kB |
| 7 Hoogkerk | ~3,5 kB |
| 8 Oud-Noord | ~3 kB |
| Generiek | <2,5 kB |

## 7. Top-5 om als eerste te bouwen, en wat ik niet heb bekeken

**Top-5.** 1. Centrum "Klokslag" (zet het format). 2. Oud-Zuid "Aankomen" (bookend). 3. Nieuw-Noord "Tegenwind" (sterkste grap). 4. Oud-West "De westkant" (goedkoop). 5. Oud-Oost "De stoep" (emotioneel, duurder).

**Niet bekeken / niet geverifieerd.** Geen runtime, Electron of wereldtegels, dus geen echte beelden, maten of prestaties. Niet model-geverifieerd: pakhuizen Kop van Oost, muziekzaal Trompsingel, fabriekswand Suikerfabriek. Niet doorgerekend: punt-in-polygoon voor de 123 CBS-wijken (centroid-benadering), de exacte telling van de 151 taken, of het hoofdstukmodel bestaat (het bestaat **niet** in `cutscript.js`/`cutscenehost.js`), of de Martinitoren-GLB laadt, of de 30 s-preload/perf haalbaar is, en of TTS voor de nieuwe regels beschikbaar is. Niet bekeken: mobiel/touch, 4K/HUD-schaling, pauzemenu-teksten, coop-late-join, de `CoopCut`-rolverdeling bij een gast die zelf veroverd, en de precieze CBS-grenzen van padelbanen, klimtoren, skatepark en zwembad.


