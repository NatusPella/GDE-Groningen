# Muzieklijst van het verhaal (21-11)

Cue-lijst voor een latere muziekronde, nagelopen tegen de code en `game/audio/`. Alleen verzonnen artiesten en eigen nummers (geen muziekrechten, geen echte personen of merken); bron van de momenten: de muziekmomenten per akte in [FILMSCRIPT-21-11.md](FILMSCRIPT-21-11.md). De namen in de kolom "Artiest / titel" zijn werktitels: de speler ziet ze pas als een nummer echt bestaat en op de radio komt. Het spel krijgt geen muziek die door Claude is gemaakt; de eigenaar levert tracks uit Gemini ([../MUZIEK-OPDRACHT-GEMINI.md](../MUZIEK-OPDRACHT-GEMINI.md), [../MUZIEK-TE-VRAGEN.md](../MUZIEK-TE-VRAGEN.md)). Er is in deze ronde geen audio gemaakt of opgehaald, en niets is beluisterd: de kolom Status zegt alleen wat in de code en de mapjes staat.

Samen spelen: muziek speelt op elk apparaat zelf af (zoals de rest van het geluid); er is geen netwerkbericht. Een gast hoort de sfeer van zijn eigen moment; wie de radio uitzet houdt stilte.

## Hoe je dit leest

Status:

- **bestaat**: het bestand staat in de repo en de code speelt het op dit moment.
- **te koppelen**: er is een bestand (of het moment vraagt alleen stilte), maar er hangt nog geen code aan dit moment.
- **ontbreekt**: er is geen bestand; tot er een is, speelt de radio (of niets).

Koppeling: `scenario:<sleutel>` (SCENARIO_TRACKS in `game/js/audio/scenario.js`), `sfeer:<sleutel>` (missiesfeer.js, via de missielijst), `gmusic:<bestand>` (radio, `game/audio/gmusic/`), `theme` (`game/audio/theme/`) of `-` (geen bestand). Lus: ja = naadloze loop, nee = eenmalig nummer of sting. Lengte is richting voor de opname.

De test `scripts/muziekdekking_test.mjs` leest de tabellen hieronder en controleert: elke koppeling bij status "bestaat" bestaat echt (bestand op schijf, sleutel in de code, en de sleutel wordt gebruikt), elke scenario-sleutel en elke beschikbare missiesfeer staat in deze lijst, elke artiest en titel is verzonnen (geen bekende echte namen) en de zendernamen, artiesten, jingles en radioreclames bevatten geen echte merken.

## Titel en opening

| ID | Moment | Sfeer | Tempo | Instrumenten | Lengte | Lus | Artiest / titel | Status | Koppeling |
|---|---|---|---|---|---|---|---|---|---|
| C01 | titelmenu en trailer | warm, zonnig, trots | 96 bpm | gitaar, toeter, strijkers | 3 min | nee | Kees Zonnebloem Orkest / Moi Grunn (titelthema) | bestaat | theme |
| C02 | pauzemenu en lobby | rustig, wachtend | 80 bpm | piano, zachte bas | 2 min | ja | Het Wachtkamerkwartet / Even Zitten, Hè | bestaat | scenario:menu |
| C03 | opening, de keuken | warm en licht, één toeter | 90 bpm | ukelele, kleine toeter | 1,5 min | ja | Tessa en de Keukenradio / Koffie Is Al Koud | ontbreekt | - |
| C04 | de verhuisdag | rustig, zomers, vol verwachting | 100 bpm | akoestische gitaar, fluit | 2 min | ja | De Verhuisbusjes / Alles Past Net Niet | ontbreekt | - |
| C05 | de lege vitrine | stilte, dan één noot | n.v.t. | enkele pianonoot | 15 s | nee | Stilte Noord / Leeg Glas | te koppelen | - |

## Akte 1 tot 5 en Deel 4 (het verhaal)

| ID | Moment | Sfeer | Tempo | Instrumenten | Lengte | Lus | Artiest / titel | Status | Koppeling |
|---|---|---|---|---|---|---|---|---|---|
| C06 | akte 1: Rikus' nachtnummer zonder tekst | nachtelijk, streek | 70 bpm | synth, oude radioruis | 3 min | nee | Nachtbus Nino / Goud in de Nacht | te koppelen | gmusic:Goud_in_de_Nacht.mp3 |
| C07 | akte 1: kennismakingsmissies M01 tot M05 | lichtvoetig, quirky, jazzy | 110 bpm | contrabas, drums met bezem, vibrafoon | 3 min | ja | Het Muntjeskwartet / Kleingeld en Klompen | bestaat | sfeer:missie_komisch |
| C08 | akte 2: Oma's keuken | huiselijk | 84 bpm | accordeon, huisharmonium | 2 min | ja | Oma Trijntje & de Stadjers / Thee Met Een Koekje | ontbreekt | - |
| C09 | akte 2: de zandplaat onder de sterren | bijna stil, hoge zachte toon | 50 bpm | glasharmonica, wind | 2 min | ja | Wad en Wolk / Laagwater Om Middernacht | ontbreekt | - |
| C10 | akte 2: de sloot (Jelle) | klompendans in mineur | 120 bpm | klompen, viool, trekzak | 1,5 min | nee | Jelle Sloot en de Natte Voeten / Klompendans met Kikkers | ontbreekt | - |
| C11 | heist-missies M06, M13, M14, M20, M21 | gespannen, laag | 88 bpm | contrabas, pizzicato, kerkorgel | 3 min | ja | Het Salonkwartet Nachtwacht / Kamerorgel op Kousenvoeten | bestaat | sfeer:missie_sluipen |
| C12 | de eieren en de camera's, M09 en M18 | lichtvoetig kapermuziek | 124 bpm | pizzicato, fagot, xylofoon | 2,5 min | ja | De Kippenrennerij / Drie Uur Op Het Erf | bestaat | sfeer:missie_caper |
| C13 | trekker-limo en de vlag, M10 en M24 | statig-komisch | 76 bpm | tuba, trombone, snaredrum | 2,5 min | ja | Burgemeester Brassband / Plechtig Over de Dijk | bestaat | sfeer:missie_wandeling |
| C14 | fatbikes en traumaduif, M08 en M12 | branie, zelfverzekerd loopje | 104 bpm | slaggitaar, bongo's, fluitje | 2,5 min | ja | De Stoeptegels / Brede Banden Brede Schouders | bestaat | sfeer:missie_flaneren |
| C15 | akte 3: het koopboek | bureaucratische marsmuziek | 100 bpm | stempel als slagwerk, tuba, schrijfmachine | 2 min | ja | Gemeentelijk Marsorkest / Formulier in Drievoud | ontbreekt | - |
| C16 | akte 3: de kermis (M16) | volksfeest | 128 bpm | draaiorgel, accordeon, trompet | 3 min | ja | Orgel Oosterhaven / Botsauto Boogie | bestaat | sfeer:missie_feest |
| C17 | akte 3: de kus op de kermis | muziek valt weg, zachte stilte | n.v.t. | niets, alleen verre kermis | 20 s | nee | Stilte Noord / Na de Botsauto's | te koppelen | - |
| C18 | akte 4: de bruggenrace (bijbaan) | feestelijk, racend | 128 bpm | draaiorgel, trompet, trommel | 3 min | ja | Orgel Oosterhaven / Brugwachter Wacht Niet | bestaat | sfeer:missie_feest |
| C19 | akte 4: de bruggen, elf slagen | één ritme, elf slagen | 66 bpm | kerkklok, pauken | 1 min | nee | De Elf Bruggen / Eén Maat, Elf Slagen | ontbreekt | - |
| C20 | akte 4: de kruitkelder | alleen een druppel | n.v.t. | waterdruppel, galm | 30 s | ja | Stilte Noord / Druppel in de Kelder | ontbreekt | - |
| C21 | akte 4: het skûtsje, M11 en de sprint | zondags, varend, wedstrijd | 96 bpm | mandoline, accordeon, fluit | 3 min | ja | Zeilclub Zuidpier / Zondag Aan de Kade | bestaat | sfeer:missie_water |
| C22 | akte 5: de knuffel | intiem | 60 bpm | piano | 1,5 min | nee | Tessa & Tammo / Net Te Dichtbij | ontbreekt | - |
| C23 | akte 5: de colonne | blaaskapel van Oma's vrienden | 108 bpm | koper, bastuba, trommel | 2 min | nee | Oma's Vrienden Harmonie / Colonne naar de Dijk | ontbreekt | - |
| C24 | akte 5: de vijf woorden en de kus | stilte, dan één akkoord | n.v.t. | enkel akkoord, piano of orgel | 20 s | nee | Stilte Noord / Vijf Woorden Kort | te koppelen | - |
| C25 | akte 5: Oma en Beppe, M27 tot M29 | emotioneel, warm | 72 bpm | piano, cello, zachte gitaar | 3 min | ja | Het Beppekoor / Ochtendlicht Boven de Warf | bestaat | sfeer:missie_warm |
| C26 | akte 5: het slot, M30 | groots, samen | 92 bpm | volle band, strijkers, koper | 3 min | ja | Het Slotkoor van Grunn / De Boomgaard Vol | bestaat | sfeer:missie_finale |
| C27 | Deel 4: het erf, "Voor de grip" | dansmuziek, hoogzomer | 118 bpm | accordeon, gitaar, voetenstampen | 3 min | nee | De Erfdansers / Voor de Grip | ontbreekt | - |
| C28 | Deel 4: Rikus' nummer zonder praatje | nachtelijk, warm | 70 bpm | synth, oude radioruis | 3 min | nee | Nachtbus Nino / Suikerbuiken in de Nacht | te koppelen | gmusic:Suikerbuiken_in_de_nacht.mp3 |

## Eigen nummers voor Tammo en Tessa

| ID | Moment | Sfeer | Tempo | Instrumenten | Lengte | Lus | Artiest / titel | Status | Koppeling |
|---|---|---|---|---|---|---|---|---|---|
| C29 | het autoduet (R3.4 en B3.3): Tessa het refrein, Tammo de bas | zingbaar, hoopvol, een lift die werkt | 112 bpm | gitaar, bas, tweestemmig zingen | 3 min | nee | De Fietstunnels / Elfde Verdieping | ontbreekt | - |
| C30 | afrollen: slotthema (een rustige "Elfde Verdieping") | rustig, tevreden | 80 bpm | piano, strijkers, zachte bas | 2,5 min | nee | De Fietstunnels / Elfde Verdieping (slotversie) | ontbreekt | - |
| C31 | Tessa alleen, de eerste dag in de winkel | nuchter, vol plannen | 98 bpm | elektrische piano, brushes | 2 min | ja | Tessa Kroket / Plan Zonder Plan | ontbreekt | - |
| C32 | Tammo alleen, op de fiets door de stad | zorgeloos, een tikje te laat | 106 bpm | gitaar, fluitje, belletje | 2 min | ja | Tammo en het Tegenwindje / Altijd Tien Minuten Te Laat | ontbreekt | - |

Een nummer met songtekst heeft nooit zijn tekst op het scherm. Voorgestelde richting voor het refrein van C29:

> Elfde verdieping, de lift doet het weer,
> jij drukt op de knop en ik trek het kleine deel.
> Elfde verdieping, de stad ligt plat,
> en wij zijn boven, met nul euro en een plan dat nog niet bestaat.

Tessa zingt de eerste twee regels, Tammo de bas eronder ("bom, bom"); bij "nul euro" zwijgt de bas een maat (de stilte telt).

## Snackwagen, voetbal, Bezit en interieurs

| ID | Moment | Sfeer | Tempo | Instrumenten | Lengte | Lus | Artiest / titel | Status | Koppeling |
|---|---|---|---|---|---|---|---|---|---|
| C33 | de snackwagen (Jelle, carrièretour) | gezellig, frituurlucht | 114 bpm | orgeltje, slaggitaar, handklap | 2,5 min | ja | Jelle en de Frituurpan / Nog Één Kroket | ontbreekt | - |
| C34 | voetbal (activiteit en wedstrijddag) | volkszang, spanning, aanmoediging | 124 bpm | trommels, trompet, zangkoor | 2,5 min | ja | FC Noordkantje Supporters / Hij Zat Er Net Naast | ontbreekt | - |
| C35 | Bezit (eigendom kopen en beheren) | zakelijk, tevreden | 92 bpm | vibrafoon, bas, zachte drums | 3 min | ja | Makelaardij Schuifdeur Combo / Bezichtiging Staand | ontbreekt | - |
| C36 | interieur: het safehouse-menu en de fotomodus | knus, kalm | 76 bpm | piano, gitaar met zachte tik | 3 min | ja | De Voorkamer Toeristen / Binnen Is Het Beter | bestaat | scenario:thuis |
| C37 | interieur: winkel en kroeg (#1164) | gedempte achtergrond, praten | 90 bpm | contrabas, jazzdrums | 3 min | ja | Het Kroegkwintet / Alles Scheef Behalve de Rekening | ontbreekt | - |

C36 is de loop van het safehouse-menu en de fotomodus; wie door zijn huis loopt krijgt hem nog niet. Een koppeling per interieur hoort bij #1164.

## Eindkaarten en credits

| ID | Moment | Sfeer | Tempo | Instrumenten | Lengte | Lus | Artiest / titel | Status | Koppeling |
|---|---|---|---|---|---|---|---|---|---|
| C38 | eindkaart: het einde van het verhaal | rustig terugkijken | 80 bpm | piano, strijkers | 2 min | nee | De Fietstunnels / Elfde Verdieping (slotversie) | te koppelen | theme |
| C39 | eindkaart: wat er daarna gebeurt (epiloogkaarten) | luchtig, grappig | 100 bpm | ukelele, xylofoon | 2 min | ja | Het Nawoord / En Toen Was Het Zomer | ontbreekt | - |
| C40 | credits | warm, meezingbaar | 96 bpm | titelthema, instrumentaal | 3 min | nee | Kees Zonnebloem Orkest / Moi Grunn (titelthema) | te koppelen | theme |

## Activiteiten, voertuigen en wedstrijden

| ID | Moment | Sfeer | Tempo | Instrumenten | Lengte | Lus | Artiest / titel | Status | Koppeling |
|---|---|---|---|---|---|---|---|---|---|
| C41 | race (straatrace) | strak, snel | 150 bpm | synthbas, drums | 3 min | ja | De Uitlaatjes / Burnout op de Ring | bestaat | scenario:race |
| C42 | achtervolging door de politie | dreigend, dringend | 160 bpm | synth, snaredrum | 3 min | ja | De Ringweg Drillers / Rood Licht Is Een Mening | bestaat | scenario:chase |
| C43 | kartbaan | vrolijk racen | 140 bpm | synth, bas | 2 min | ja | Karel Kartbaan / Rondje Nummer Zeven | bestaat | scenario:kart |
| C44 | padel | speels, ritmisch | 118 bpm | gitaar, handklap, bas | 2 min | ja | De Padeltjes / Net Over de Muur | bestaat | scenario:padel |
| C45 | discgolf en pitch-and-putt | luchtig, rustig | 92 bpm | ukelele, fluit | 2 min | ja | Golfcentrum De Pendule / Achttien Gaten Tussen de Koeien | bestaat | scenario:golf |
| C46 | klimtoren | hoog, gespannen | 104 bpm | strijkers, pauken | 2 min | ja | De Martinitoren Ensemble / Naar Boven, Nooit Naar Beneden | bestaat | scenario:klimtoren |
| C47 | trein (machinist en passagier) | gestaag, ritmisch | 100 bpm | akoestische gitaar, ritmische percussie | 3 min | ja | Spoorboekje Noord / Perron Twee Is Perron Drie | bestaat | scenario:trein |
| C48 | bus (buschauffeur en lijndienst) | middagzonnig, rijdend | 108 bpm | gitaar, fluit, drums | 3 min | ja | Lijn 15 Live / Halte Voorbij | bestaat | scenario:bus |
| C49 | boerderij (trekker, maaidorser, lader) | landelijk, werkend | 96 bpm | banjo, accordeon, stamp | 3 min | ja | De Bietenbende / Pas Bij Zonsopgang | bestaat | scenario:boerderij |
| C50 | vliegen (vliegschool en helikopter) | wijds, vrij | 88 bpm | strijkers, zachte synth | 3 min | ja | Lucht Boven Eelde / Hoge Wolken Hoge Rekening | bestaat | scenario:vlucht |
| C51 | fiets en scooter | ontspannen, zomers | 102 bpm | gitaar, fluitje, belletje | 3 min | ja | De Tegenwindjes / Tegenwind Is Ook Wind | bestaat | scenario:fiets |
| C52 | PvP-arena van Samen spelen | rauw, krachtig | 140 bpm | drums, vervormde gitaar | 3 min | ja | Arena Noord / Niemand Verliest Echt | bestaat | scenario:pvp |
| C53 | vlucht uit de stad, opjagend | opjagend | 150 bpm | percussie, strijkers | 3 min | ja | De Ringweg Drillers / Geen Stoplicht Houdt Ons Tegen | te koppelen | gmusic:Geen_stoplicht_houdt_ons_tegen.mp3 |
| C54 | skatepark | sprongen, tikkend | 130 bpm | gitaar, drums | 2 min | ja | De Skatende Stoeptegels / Ollie Over de Gracht | ontbreekt | - |
| C55 | botsauto's | kermis, bonkend | 126 bpm | orgel, trompet | 2 min | ja | Orgel Oosterhaven / Botsauto Boogie (kort) | ontbreekt | - |
| C56 | waterski en rondvaart | zonnig, plonzend | 110 bpm | mandoline, ukelele | 2 min | ja | Rondvaart Rik / Onder de Brug Door | ontbreekt | - |
| C57 | trekker (wedstrijd, niet het werk) | grappig, zwaar | 100 bpm | tuba, banjo | 2 min | ja | Trekkerpul Trio / Vierkant Naar Voren | ontbreekt | - |

## Stings

Alle stings zijn nu procedureel (`game/js/stings.js`, `game/js/sfx/missiebank.js`, `sfx/stingen.js`; besluit 24-10: geen opnames). Een echte opname alleen als de eigenaar de procedurele versie wil vervangen.

| ID | Moment | Sfeer | Tempo | Instrumenten | Lengte | Lus | Artiest / titel | Status | Koppeling |
|---|---|---|---|---|---|---|---|---|---|
| C58 | kart_countdown | spannend, aftellend | 120 bpm | piep, drums | 4 s | nee | Karel Kartbaan / Drie Twee Een Gas | ontbreekt | - |
| C59 | kart_finish en winnaar_jingle | feestelijk | 130 bpm | trompet, bekken | 5 s | nee | Het Podiumkoor / Eerste Hoek Rechts | ontbreekt | - |
| C60 | verliezer_jingle | komisch treurig | 80 bpm | trombone, tuba | 4 s | nee | Het Podiumkoor / Volgende Keer Beter, Tante | ontbreekt | - |
| C61 | meedoen_sting en speler_sluit_aan | welkom, kort | 110 bpm | gong, ukelele | 3 s | nee | De Meedoeners / Moi, Kom Erbij | ontbreekt | - |
| C62 | trein_vertrek en halte_jingle | helder, stationsachtig | 100 bpm | bel, vibrafoon | 4 s | nee | Spoorboekje Noord / Let Op de Sluitende Deuren | ontbreekt | - |

## Autoradio-zenders

Er is één zender in het spel, **G-Music**, met vier programma's naar de speltijd (`PROGRAMMES` in `game/js/musicpick.js`): Proat in de ochtend (06 tot 10), De hits (10 tot 18), Avondproat (18 tot 22) en Nachtstreek (22 tot 06, Rikus draait streekmuziek door een oude radio). De praatsoorten (ident, nieuws, verkeer, weer, reclame, koeien, clip, Rikus) zijn spreektekst en staan in de stemmenlijst, niet hier. De reclames in `game/js/radioads.js` hebben alleen verzonnen afzenders. De nummers in de radiopool staan met hun verzonnen artiest in `GMUSIC_ARTISTS` (`game/js/audio/radio.js`); alle mp3's in `game/audio/gmusic/` staan in het manifest.

| ID | Moment | Sfeer | Tempo | Instrumenten | Lengte | Lus | Artiest / titel | Status | Koppeling |
|---|---|---|---|---|---|---|---|---|---|
| C63 | G-Music overdag: ochtend, hits en avond | stadsrap, drill, eurodance, punk | 90 tot 150 bpm | wisselend | 3 min per nummer | nee | Lil' Eierbal / Onder de Martinitoren | bestaat | gmusic:Onder_de_Martinitoren.mp3 |
| C64 | Nachtstreek (Rikus, 22 tot 06) | streekmuziek, nachtelijk | 70 bpm | synth, ruis | 3 min per nummer | nee | Spookie Stadjer / De Geest van Oosterpark | bestaat | gmusic:De_Geest_Van_Oosterpark.mp3 |
| C65 | G-Music-jingles (ident, overgang, knipoog, wanted) | kort, Gronings | n.v.t. | stem | 3 s | nee | G-Music / Dit is G-Music, de soundtrack van Grunn | bestaat | gmusic:jingles/station_id.wav |
| C66 | dagpool met nieuwe stijlen (4 tot 6 nummers) | akoestisch, zomerpop, funk, ska | 90 tot 120 bpm | wisselend | 3 min per nummer | nee | Zomerzoet Soezen / Bietenbloed en Zonnecrème | ontbreekt | - |
| C67 | Radio Proat (tweede zender, plan) | praatprogramma, regionaal | n.v.t. | DJ-stem, jingle | n.v.t. | nee | Radio Proat / Proat Mit Poat | ontbreekt | - |
| C68 | Radio Noordkust (derde zender, plan) | kustpop, wadwind | 100 bpm | gitaar, wind | 3 min | nee | Radio Noordkust / Zunneschien en Zandkorrels | ontbreekt | - |

C67 en C68 zijn alleen een plan (nog geen code en geen stemmenlijst). Een nieuwe zender betekent een eigen `PROGRAMMES`-pool en een DJ-stem in de stemmenlijst, dus een besluit voor de coördinator en geen losse koppeling.

## Wat de eigenaar nog moet leveren

In volgorde van impact: de verhaalnummers C29 en C30 (het autoduet en het slotthema), C08, C09, C10 en C15 (de akte-momenten zonder bestand), C33 en C34 (snackwagen en voetbal), de dagpool C66, en daarna de ontbrekende activiteitenloops C54 tot C57. De "te koppelen"-regels zijn code en geen audio: dat kan zonder nieuw bestand, zodra de coördinator de scène aanwijst.
