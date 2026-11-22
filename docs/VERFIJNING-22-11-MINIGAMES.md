# Verfijning 22-11: minigames en bijbanen

Werkdocument van de verfijnronde (geen nieuwe features): wat er in de regels en HUD-modellen van de minigames (kart, padel, discgolf, klimtoren, fatbikes, penaltyserie, duivenspot) en de bijbanen wreef, wat eraan is gedaan en hoe dat is vastgelegd.
De regels staan in `.specs-fire/standards/mechanica.md` en `.specs-fire/standards/ui-taal.md`; dit document is naslag. Bewijs: `node scripts/verfijn_minigames_test.mjs` (8.046 controles, onder meer fuzz met NaN, Infinity, ontbrekende velden en een klimbot van tien minuten).

## Wrijving en oplossing

| # | Wrijving (bevinding) | Oplossing | Bewijs |
|---|---|---|---|
| 1 | Een tijd van 59,999 s stond als `0:60.00` op bord en uitslag | `fmtTime` rondt eerst af op honderdsten, dan splitsen; negatief wordt 0 | verfijn_minigames_test (2.000 tijden) |
| 2 | Zelfde fout in de karttijd (`tijdTekst`, met komma) | zelfde afronding | verfijn_minigames_test |
| 3 | `Wind NaN Bft` bij een gast zonder windgegevens | `windText` valt terug op Windstil | verfijn_minigames_test |
| 4 | Windpijl op de minikaart met NaN-sterkte | `windSterkte` blijft een getal (1 streepje) | verfijn_minigames_test |
| 5 | Penalty met een NaN-richting of kracht gaf vanzelf een doelpunt | NaN rekent als het midden van het bereik | fuzz 3.000 schoten |
| 6 | Onbekende uitkomst werd als schot genoteerd | `noteer` weigert wat niet in UITKOMSTEN staat | verfijn_minigames_test |
| 7 | Medaille met NaN doelpunten | geeft 0 | verfijn_minigames_test |
| 8 | Padelpunt voor een ongeldig team verhoogde NaN en brak de stand | stand blijft zoals hij was | verfijn_minigames_test |
| 9 | Padel-HUD en puntmelding zonder stand (gast, late snapshot) gaven undefined | standaard 0-0 | verfijn_minigames_test |
| 10 | Een gestopt padelpotje meldde "Punt voor hen" | "Potje gestopt" | verfijn_minigames_test |
| 11 | Discgolf: dubbele afronding van een baan telde de ace en de baan twee keer (snelle dubbelklik of dubbel bericht) | `finishHole` is idempotent en weigert NaN of onbestaande banen | verfijn_minigames_test |
| 12 | `holeName` met NaN gaf "Triple bogey of erger" | lege tekst | verfijn_minigames_test |
| 13 | Een ace sprong op als gewone baan | "Baan 3: 1 worp, ace!" met het loopbaangeluid | discgolfhud_test, verfijn_minigames_test |
| 14 | Mandafstand NaN in de discgolf-HUD | toont 0 m | verfijn_minigames_test |
| 15 | Duivenspot: afstand NaN of negatief ("NaN m") | `distText` begrenst op 0 m | verfijn_minigames_test |
| 16 | Richtingwoord bij NaN-hoek | "recht voor je" | verfijn_minigames_test |
| 17 | "Gespot 9 van 6" en "Gespot 0 van 0" | begrensd; zonder doelen "Nog niets te spotten" | verfijn_minigames_test |
| 18 | Duivengids zonder vluchtstand of zonder doelen brak | veilige standaard | verfijn_minigames_test |
| 19 | Randpijl met NaN-plek gaf NaN-hoek | pijl onderaan | verfijn_minigames_test |
| 20 | Klimtoren: een grote dt (tabblad weg, laden) liet de klimmer vallen of springen | dt hooguit een kwart seconde, NaN telt nul | verfijn_minigames_test |
| 21 | Klimtoren zonder invoerobject brak | lege invoer | verfijn_minigames_test |
| 22 | Klim-HUD zonder tijd toonde `undefined` | `0:00.00` | verfijn_minigames_test |
| 23 | Kart-driftmeter zonder tijd gaf NaN% | begrensd 0 tot 100 | verfijn_minigames_test |
| 24 | Bijbaanronde met een hapering van 50 s (of NaN) sprong door de hele baan | dt hooguit een kwart seconde; alle tien de banen doorstaan fuzz | verfijn_minigames_test |
| 25 | Lege tussenstand (Samen, nog niemand) gaf een kale tabel; een rij zonder cellen brak | rij "Nog niemand"; rijen zonder cellen mogen | verfijn_minigames_test |

Geen enkele wijziging raakt een opslagsleutel of het netwerkprotocol.

## Samen-regel

Alle punten zijn pure regels of HUD-modellen die ieder spel lokaal draait, voor host en gast gelijk. Gasten krijgen de verbeteringen 3, 9, 17, 18 en 25 (late snapshot, wegvallen, lege stand) zonder nieuw bericht. Beloningen en voortgang per speler zijn niet gewijzigd.

## Bewust niet

- Moeilijkheid en balans van kart, padel, golf en fatbikes bijstellen: dat vraagt een echte speler en beeld.
- Nieuwe regels, nieuwe minigames of een nieuw bord: nieuwe feature.
- Laadtijd van de minigame-scenes: geen meetbare bron zonder Electron (twee runs van andere agents liepen).

## Alleen in beeld of met een echte speler te bekijken

- De melding "Baan 3: 1 worp, ace!" (lengte in de pop-up, geluid).
- De rij "Nog niemand" in de Samen-tussenstand op de echte breedte van het bord.
- Of een kwart seconde als maximum voor een klim- of bijbaanstap in een echte hapering natuurlijk voelt.
- Tempo en beloning per bijbaan met echte spelers (loon staat in `bijbaan_loonschatting_test`).
