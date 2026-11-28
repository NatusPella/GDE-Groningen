# Straatdetail: referenties en wat eruit gehaald is (28-11, #1353)

Alleen gelezen, niets gedownload of overgenomen; de bronnen zijn openbare pagina's. Wat het spel toevoegt staat per buurttype in
`game/js/streetdetail.js` (kop van het bestand) en in `docs/wereld/STRAATDETAIL-28-11.md`.

## Bronnen en wat eruit komt

| Bron | Wat het laat zien | Gebruikt voor |
|---|---|---|
| https://www.cultureelerfgoed.nl/onderwerpen/p/post-65-erfgoed/wat-is-post-65-erfgoed/de-bloemkoolwijk | Bloemkoolwijken (jaren 70 en 80): groene hofjes, tuintjes bij de woningen, woonerven met drempels en bochten, speeltuintjes, auto's ondergeschikt, woningen rond hofjes | Voortuinen met haag of hekje op elke gevel met ruimte; zone-30-borden aan de uiteinden van woonstraten; geen parkeerrijen langs de gevel, wel een enkele fiets of kliko |
| https://docplayer.nl/11032963-7-jaren-70-en-80-wijken.html | Welstandsnota: in deze wijken staan auto's in woonhoven, carports of garages | Geen eigen parkeerlaag erbij: de bestaande geparkeerde auto's (`parkedcars.js`) blijven de enige; carports en garageboxen komen later |
| https://scherpinbeeld.nl/archieven/28791 | Oranjestraat in 1975: woonhuizen, garageboxen, trottoirs, fietsenrekken en straatverlichting | Fietsen tegen de gevel, bij flats een rij fietsen loodrecht op de muur; lantaarns bestaan al |
| https://ontdeknoordgroningen.nl/themas/boerderijen.html | Noord-Groningse boerderijen: kop-hals-rompboerderij, dwarshuis, slingertuinen, boerderijen aan de dijk (Oude Dijk bij Pieterburen en Uithuizen) | Erf met hooibalen naast de schuur; de bestaande erfgebouwen (`erfgebouwen3d.js`) blijven staan |
| https://www.riekeleprins.nl/?page_id=109 | Tekeningen en foto's: hooibulten bij een boerderij, Warffum, Usquert (Raadhuisstraat) | Hooibalen aan de zijkant van een erf, nooit voor de deur |
| https://www.rug.nl/research/kenniscentrum-landschap/voor-studenten/masterscripties/masterscriptie_jetske_evenhuis.pdf | Lintbebouwing langs een oude dijk (Oude Dijk tussen Usquert en Warffum): losse huizen langs een smalle weg | Bermpalen langs landwegen buiten de bebouwing; rietpollen langs sloten |

Het zoeken naar losse foto's leverde geen directe beelden van een jaren-70-straat met kliko's en voortuinen op (kliko's zijn pas
sinds de jaren 90 gewoon). De lijst hieronder komt dus uit het algemene beeld van een Nederlandse woonstraat en uit de
bovenstaande beschrijvingen; hij is niet uit een bepaalde foto overgenomen.

## Wat een kale straat mist, per buurttype

- Jaren-70-wijk en rijtjeshuizen: voortuintjes met een lage haag of een lattenhekje, een tuinpad naar de voordeur, een of twee
  kliko's (grijs voor restafval, groen voor gft, blauw voor papier), een fiets bij de deur, een plantenbak, een kabelkast per
  straat, zone-30-borden, voorrangsborden op zijwegen.
- Flatstraat: fietsen tegen de gevel, een afvalzuil bij de weg.
- Dorpskern: voortuinen en hekjes, kliko's, fietsen, bermpalen aan de rand, rietpollen langs de sloot.
- Dorpsstraat met boerderijen en dijk: hooibalen naast de schuur, rietpollen, bermpalen.
- Bedrijventerrein: hekwerk langs de straat met een brede poort.
- Provinciale weg met bebouwing: bermpalen buiten de kom, kabelkasten alleen in woonstraten.

## Nog niet gedaan (staat als kaal in het eindrapport)

Boomspiegels (de boomposities zijn niet per tegel beschikbaar in de generator), geveldetails (kozijnkleur, gordijnen, regenpijpen:
de gevel is een shader en hoort bij de perf- en visueelwerkers), dakdetails (zonnepanelen, schotels, schoorstenen, dakkapellen),
carports en garageboxen, speeltoestellen, brievenbussen en huisnummers, wasrekken, straatnaamborden met tekst.
