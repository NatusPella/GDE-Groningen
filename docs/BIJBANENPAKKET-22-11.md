# Bijbanenpakket (22-11)

> **Naslag.** De regels staan in de canonieke spec [`.specs-fire/standards/mechanica.md`](../.specs-fire/standards/mechanica.md); dit document beschrijft het pakket van vier korte bijbaantjes in Grunn en hoe ze op de bestaande onderdelen aansluiten.

Niet in beeld bekeken en geen Electron gedraaid: de regels zijn getest met pure tests (`scripts/sidejobpack_test.mjs`), de adapter en het paneel zijn "nog niet bekeken". Alles is zoet en komisch, zonder leed, met verzonnen bedrijven en personen (constitution 2, 6).

## Inventaris: wat er al was

Het sidejob-contract staat in `game/js/sidejobs.js` (elke baan een `sidejob_*.js`), de gedeelde hulpjes in `sidejobkit.js`, het DS3-keuzepaneel in `choicepanel.js`, de profielen in `sidejobprofiel.js` (familie dienst of kantoorklus, sfeer per vak), de loopbaanvakken in `loopbaan.js` (`BAAN_VAK`) en de ontgrendelpoort in `unlockgate.js`. Bestaande bijbanen: bezorger, krantenwijk, taxi, bus, lijn, rondvaart, rondvaarttour, fietsdepot, verhuizing, boa, rechtbank, cabaret, vracht, tien keuzewerk-banen (loket tot energielabel), de banen uit `bijbaanregels.js` (fietssoep, taxinacht, balenrit, berging, schoolrit, melkrit, strandpost, kermisdraai, brugdienst), de stadmissies (museumbus, suikerbieten, herstelploeg, oogtv, telefoonrave, vandermeden, schouwburg, bernardrit), de veerdienst, de zeeschepen, de tjalke, de bietenoogst, de boerderij en de snackoverlast. Bestaande doeltypes: rijden naar een doel met remmen en bochten (fietssoep), te voet naar een plek met een keuzepaneel (snackoverlast, rave) en een meter in een groene band (rave).

## De vier nieuwe banen

| Baan | Waar | Vak (loopbaan) | Type | Hergebruikt |
| --- | --- | --- | --- | --- |
| Vismarktkoerier, Vishandel De Zilveren Brasem | de Vismarkt | Bezorging | dienst, fiets | het doeltype van fietssoep: remmen en bochten kosten iets, doelen langs de weg |
| Bediening op het studentenfeest, Studentenhuis De Slapeloze Slak | de Poelestraat | Horeca | kantoorklus, te voet | het keuzepaneel van de snackoverlast, 1, 2 of 3 |
| Boerenmarktkraam, Boerderij De Blije Bonk | de Grote Markt | Landbouw | kantoorklus, te voet | de meter van de rave, nu met een gewicht in plaats van een volume |
| Toeristengids bij de Martinitoren, Gidsenbureau De Verdwaalde Toerist | de Martinitoren | Podium | kantoorklus, te voet | stops lopen en een keuzepaneel per stop |

- **Vismarktkoerier.** Een koelkist met verse vis per fiets naar drie tot vijf restaurants. De koeling loopt langzaam op, schudden (hard remmen of een scherpe bocht) kost koeling en de kok legt bij elk adres een vers koelelement in de kist. Is de koeling op of is de kist te veel geschud, dan is de dienst mislukt. Basis 12 + 8 per adres, fooi tot 16 naar de koeling die overblijft.
- **Studentenfeest.** Vijf tot acht gasten. Elke gast zegt in gewone woorden wat hij wil (fris, wakker, warm of "uit de koe") en jij kiest uit drie drankjes, alle zonder alcohol. Per gast een tijdslimiet die per niveau korter wordt; snel en goed geeft fooi, drie klachten (fout of te laat) is een mislukte dienst. Basis 10 + 9 per goede gast.
- **Boerenmarktkraam.** Vijf tot zeven klanten vragen om een gewicht (een half pond kaas, vier pond aardappelen). 1 doet 50 gram eraf, 3 doet er 50 gram bij, 2 rekent af. Binnen de marge is precies, ruimer is dichtbij, te veel is zonde, te weinig een klacht (drie klachten is een mislukte dienst). Soms springt een kip op de weegschaal (honderd gram erbij) en wie te lang wacht ziet de klant naar de buurkraam lopen. Alle bestellingen precies geeft de volle fooi.
- **Toeristengids.** Drie stops (vier vanaf niveau 3) op een ring rond de Martinitoren. Per stop zegt de groep wat ze willen horen (geschiedenis, een grap of een uitzicht) en jij kiest een van drie verhalen. Het goede verhaal vult de aandacht aan, een verkeerd verhaal of stilte kost aandacht; is die op, dan zoekt de groep zelf een terras. De feiten kloppen met wat het spel weet (bijna honderd meter, meer dan vijfhonderd jaar, d'Olle Grieze); de grappen zijn duidelijk grappen.

Nieuwe bestanden: `game/js/sidejobpack_rules.js` (pure regels, rng en abstracte invoer, geen THREE en geen DOM), `game/js/sidejob_pack.js` (adapter) en `scripts/sidejobpack_test.mjs`.

## Beloning per speler (#429)

De uitslag van een ronde is `{ base, tip, flawless, text, failed }`; `sidejobs.js` past `SIDEJOB_PAY_MULT`, het niveau en de loopbaanfactor van het vak toe. De baan schrijft nooit zelf in de portemonnee: alleen `c.complete` betaalt, dus elke speler krijgt zijn eigen ronde in eigen geld en loopbaan (vakken Bezorging, Horeca, Landbouw en Podium), de eerste ronde telt dubbel voor het niveau (`rondeWaarde`).

## Samen spelen

- **Van wie is het?** Van de speler die de baan start: de dienst, het paneel, de timers en de uitslag zijn lokaal per speler. De wereld bepaalt alleen waar de startplek staat.
- **Doet een gast mee?** Bij de drie banen te voet staat een helper-rol in `BIJBAAN_REGELS` (`coopbijbaan.js`): tweede barkeeper, kraamhulp en mede-gids. De gast krijgt "Meedoen?" (J of N), loopt mee en helpt met E; elke hulp (hooguit drie per ronde) levert extra fooi (`hulpTip`: 8, 8 en 10 euro). De vismarktkoerier is een fietsdienst en blijft in het eigen spel ("Alleen bij wie het spel opende", status nee).
- **Wat ziet een gast?** Doel en marker via het gewone bijbaanbericht; het keuzepaneel is beeld van de speler die de dienst draait.
- **Beloning en voortgang?** Per speler: de volle ronde in eigen geld en loopbaan (`beloningBijbaan`), geen deling via de host.
- **Wegvallen en later aansluiten?** Wie wegvalt krijgt niets meer; een late gast doet de volgende ronde mee; een eigen dienst loopt door.
- **Test.** `scripts/sidejobpack_test.mjs` (regels, poort, beloning per speler, rollen) en `scripts/coop/bijbaanrollen_test.mjs`.

## Ontgrendelpoort (loopbanen pas via het verhaal)

Een loopbaan komt pas vrij als het verhaal er een personage aan koppelt (`unlockgate.js`). Elke nieuwe baan hoort bij een vak dat al een poortwereld is: Bezorging (Oma Trijntje), Horeca (Geesje), Landbouw (Tessa) en Podium (Willemien). `gateReason(id, gate)` in `sidejobpack_rules.js` geeft `null` als de baan open is en anders de zachte hint van dat personage. De adapter weigert de start met die hint in de mond van de baas. Open is de baan als het verhaal het vak opent, als de speler het vak al begonnen is, bij een oude save zonder poort (migratieregel) en in dev (spelbot, trailer). Er is geen harde muur: de baan staat er, maar wacht.

## HUD en geluid

De HUD is het DS3-keuzepaneel (`createChoicePanel(accentVan(id))`: zeefdruk, het accent van het vak, toetsplaatjes met `keycap`, een meter voor tijd, aandacht of gewicht); de baan voegt geen eigen DOM of CSS toe. Geluid loopt alleen via `sfxEvent` met bestaande sleutels uit `sfx/sfxmap.js`: `bucket_water` en `door_bell_ring` (koerier), `bar_pour`, `bar_glass_clink`, `npc_sigh`, `npc_cough` en `npc_laugh` (feest), `ui_slider_tick`, `chicken_cluck`, `shop_sell_bills`, `shop_drawer` en `shop_bag_rustle` (kraam), `church_bell`, `npc_chuckle` en `npc_cough` (gids). Alles lokaal: elke speler hoort het van zijn eigen scherm, niets over het net. Niet beluisterd.

## Humorregels (voorstel)

Alleen tekst, voor de eigenaar om te schrappen of aan te scherpen. Geen opname gevraagd (de regels in de adapter zijn tekstballonnen, geen stemlijnen; nieuwe stemlijnen zouden op `scripts/voice_wacht.json` moeten).

### Vismarktkoerier

- Visboer Dobbe: "Een fiets is geen vis. Probeer dat niet te vergeten."
- Een kok bij het afleveren: "Is dit vers? Hij kijkt me zo verwijtend aan."
- Een meeuw volgt je drie straten lang en kijkt naar de kist. Hij heeft geen ervaring, wel veel geduld.

### Studentenfeest

- Lotte: "De dj vraagt om water. Of om genade. Ik kon het niet verstaan."
- Een gast: "Heb je iets met bubbels? Nee, geen alcohol. Gewoon bubbels, voor het gevoel."
- Een gast die zijn tentamen vergeten is: "Wat voor dag is het? O. Dat verklaart veel."

### Boerenmarktkraam

- Aaltje: "Een pond is vijfhonderd gram, een ons is honderd. En een boer is altijd een beetje te veel."
- Een klant over de kip op de weegschaal: "Wegen jullie die ook af? Ik neem hem voor de gezelligheid."
- Een klant, na een perfecte weging: "Dat is zo precies dat ik me bijna schuldig voel."

### Toeristengids

- Hindrik: "Kijk omhoog. Nee, hoger. Nee, dat is een duif."
- Een toerist: "En wat zit er aan de andere kant?" Gids: "Meer Grunn."
- Een kind: "Wie heeft die toren gebouwd?" Gids: "Een heel grote Tammo." Tammo, ergens in de buurt, knikt trots.

## Nog niet bekeken

Wat de adapter in beeld doet (de startplekken op de kaart, de figuranten, het paneel, de stops op de ring, de plaatsing van de fietsdoelen) en alles op het gehoor: niet in beeld bekeken en niet gespeeld in Electron. De plek van het Poelestraat-startpunt hangt aan de straatnaam in de kaart en valt anders terug op het landmark Martinitoren.
