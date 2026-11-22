# Tuning en kleding: stand per wens (22-11)

Epics #1155 (autotuning) en #1151 (kleding), kinderen #1152 tot #1156. Alles hieronder is code-eerst gecontroleerd met pure of THREE-mocktests; **niets is in Electron of in beeld bekeken** (er draait een exclusieve perf-meting). Detail: [TUNING-21-11.md](TUNING-21-11.md), [KLEDING-21-11.md](KLEDING-21-11.md), [TUNING-VERIFICATIE-21-11.md](TUNING-VERIFICATIE-21-11.md), [KLEDING-VERIFICATIE-21-11.md](KLEDING-VERIFICATIE-21-11.md).

## Matrix

| Wens | Stand | Waar | Test |
| --- | --- | --- | --- |
| Pimpen in alle garages (garage, werf, fietsenmaker, tuningwinkel, thuis) | gedaan | `shops.js` `pimpEntryItem`, `garages.js` | `tuningdraft_test` |
| Meer onderdelen | uitgebreid 22-11: finishvlag-band, draai- en schotelvelgen, eendenstaart, rallykit, fietsendrager, surfplank, strenge lampen, schoorsteenpijpen, badeendje, frietpunt (nu ruim 60 opties in 19 lijsten) | `vehiclelook.js`, `vehiclelook3d.js` | `vehiclelook_test`, `vehiclelook3d_test` |
| Iconen en tegels met eigen voorbeeld | gedaan (velgen, banden, strepen, stickers, bol voor afwerking; nieuwe velgen en finishvlag 22-11); de rest een Phosphor-icoon per veld | `tuningtiles.js`, `iconmap.js` | `ds3_dekking_test` |
| Showroomgevoel in DS3 | gedaan: draaitafel, studiolicht, spiegelvloer, wand met neon, per werkplaats een sfeer, camerastanden, voor en na | `tuningshowroom.js`, `showroomplan.js` | headless beeld 21-11, niet in de echte game |
| Prestatie-tuning met begrensde balans | gedaan (ophanging, grenzen op draai en grip) | `tuningplan.js` | `tuningplan_test` |
| Gepimpte auto's in de wereld, met budget | gedaan: hoogstens 3 procent, rijdend hoogstens 8, 6 met underglow, treffen zeldzaam, platteland nooit | `tuningworld.js`, `tuningmeet.js`, `tuningtraffic.js` | `tuningworld_test`, `tuningmeet_test` |
| Snackwagen volledig te tunen | gedaan | `vehiclelook3d.js` `snackParts` | `vehiclelook3d_test` |
| Samen: tuning zichtbaar bij medespelers | gedaan: `tune`-code in het uiterlijkrecord, ook voor de auto van een medespeler en voor bezorgde auto's; nieuwe opties reizen mee | `coopworld.js`, `net/codec.js` | `coopworld_test`, `net_codec_test`, `coopbezit_test` |
| Kleding als eigen systeem (losse stukken, aan en uit) | gedaan: 63 soorten in 12 slots | `clothing.js`, `clothingdata.js` | `clothing_test` |
| Kleding-winkelervaring | gedaan: dagaanbod, uitverkoop, pashokje met gordijn, passen zonder te kopen, kassa, iconen, geluid, Home en End | `shops.js`, `clothingpanel.js`, `clothingsfx.js` | `clothing_test`, `aaa_aankleding_test` |
| Kast per speler (en per personage) | gedaan: de kast gaat mee met het personage, per speler (#429) en lokaal; 5 outfits | `clothing.js` `wardrobeMenu` | `clothing_test` |
| Outfit delen | gedaan: outfit-code v3 (met postuur en haar) in het menu Deel je look | `clothing.js` `outfitCode` | `clothing_test`, `outfitmelding_test` |
| Samen: outfit zichtbaar bij medespelers, ook midden in een sessie | gedaan: `outfit`-bericht aan de host, eigen lijst per tick, wissel van hoofdpersoon meldt (#1153) | `coopnet.js`, `coopplayers.js` | `kleding_r5_test`, testbank kleding |
| NPC-diversiteit en rolpools (#1152) | gedaan voor voetgangers, publiek, kermis, winkeliers, bestuurders; 22-11 erbij: ambulancebroeders en chauffeurs. Brandweer en politie blijven een vaste look | `clothingdata.js` `ROLE_POOLS` | `kleding_r5_test`, `worldlife_test` |
| Snelwisseltoets (#1154) | toets 6 te voet en in een voertuig; **controller en aanraking ontbreken** (alle padknoppen bezet, besturingsreview nodig) | `shops.js` `outfitKeyBusy` | `kleding_r5_test` |
| Kapper als pakket (#1156) | gedaan: haar in de outfit, 17 kapsels in groepen, reactie van Tammo of Tessa die bij model en kleur past, prestatie Nieuw kapsel | `clothinghair.js`, `kapperkeuze.js` | `kleding_r5_test`, `kapperkeuze_test` |
| Homebase-koppeling | wacht op het homebase-model; flat en safehuis roepen `wardrobeMenu` al aan | `home.js`, `safehuizen.js` | n.v.t. |

## Wat ontbreekt

1. Alles in beeld: werkplaats in een echte garage, tweewieler, bus en boot, underglow in de nacht, het treffen, parkeerchunks, perf van gepimpte verkeersauto's, kast en pashokje in een echt interieur, kapper-stoel. Eerst de sweep van de coordinator, daarna de hertest.
2. Snelwissel op controller en aanraking (besluit nodig over een knop).
3. Brandweer en ambulanceauto zelf hebben nog geen eigen voertuig-uiterlijk in de tuning (bewust: hulpdiensten zijn nooit gepimpt, aandeel 0).
4. Homebase-koppeling zodra het model er is.

## Samen-regel in een zin

Tuning en outfit zijn van wie ze draagt en reizen als korte code in bestaande berichten mee (geen nieuwe snapshot); kopen, de kast en de winkel zijn lokaal per speler; wie wegvalt of later aansluit krijgt de huidige code uit de spelerslijst of het uiterlijkrecord.
