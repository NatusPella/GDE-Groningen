# Verhaaltrailer: filmscript "Ontdek jezelf in Grunn" (21-11)

De filmcut `ontdek` van 75 s (data: `PLAN.ontdek` in [game/js/trailerplan.js](../../game/js/trailerplan.js); test: `scripts/trailerplan_test.mjs` en `scripts/trailerfilm_test.mjs`). Hij verkoopt het **nieuwe verhaal zonder spoilers**: twee net afgestudeerde vrienden zonder plan, een stad in de zomer, een Fries in een blauw colbert, een man met duiven. **De snackwagen komt er niet in voor** (canon 21-11: hij is een late verhaaltwist en geen marketingbelofte; de validator verbiedt de woorden frietwagen, snackwagen en standplaats in beeldtekst). Slogan: **Ontdek jezelf in Grunn.** (zonder "met vette snacks"). Oudere cuts (`teaser`, `hoofd`) dragen nu dezelfde slogan en dezelfde tekstkaart.

Formaat: slugline, actieregels, geluid, kaarten. Opnemen: `node scripts/record_trailer.mjs --run --cut=ontdek --res=1080p` (headless, desktop-opnamemodus met vaste stap 1/60 s; de coördinator doet dat bij de grote sweep; de opname staat buiten de repo). Muziek: het eigen thema (`audio/theme/miles_past_the_city_square.mp3`); een nieuwe cue-lijst voor een latere muziekronde staat onderaan.

## Ritme (AAA-trailer)

| Fase | Tijd | Wat |
|---|---|---|
| Koude opening | 0 tot 4 s | zwart, een radio, één zin; geen muziek |
| Wereld en paar | 4 tot 22 s | zon, markt, Tammo, Tessa, de duiven; het thema draagt, grote beelden, 3 tot 4 s per shot |
| Hindernis en belofte | 22 tot 33 s | "Rijden, niet praten.", een blauw colbert, "Heel Groningen. Eén zomer."; riser op de stoot |
| Tempo-opbouw | 33 tot 59 s | shots van 2,0 tot 3,0 s (de tijdsprong is de langste), een tik op elke snede, de snare versnelt; water, kermis, spoor, achtervolging, race, lucht, nacht, storm |
| Komische beat | 59 tot 64 s | een stilte op de uitademing, dan "…Kon minder." |
| Adem | 64 tot 70 s | het Noorderplantsoen, rustig, "Zoek je plek. Samen." |
| Slotkaart | 70 tot 75 s | titel, slogan, platforms |

## Shotlijst met opnamepositie

Elke shot is een bestaand, vergrendeld cameraspoor in `game/js/trailer.js` (`buildShots`): de plaats, het uur en het weer staan vast, dus de opname is reproduceerbaar. Het uur is de gouden uur-keuze van de shot zelf (R-16, altijd zomer: R-17).

| # | Shot-id | Duur | Plaats (opnamepositie) | Uur, weer | Beeld en cue |
|---|---|---|---|---|---|
| 1 | `radio` | 4,0 | zwart, Radio Nachtstreek 06:12 | nacht | RIKUS: "Augustus. In Grunn heet dat zomer." [BEHOUDEN]; stoot-geluid vanaf 0 |
| 2 | `sunrise` | 4,0 | Martinitoren, kraan omhoog, Grote Markt | 06:20, mist | kaart "Grunn. d'Olle Grieze"; stoot |
| 3 | `vismarkt` | 3,2 | terrassen op de Vismarkt, duiven voor de camera | 13:12, helder | beauty; de meeuw met de frikandel |
| 4 | `tammo` | 4,0 | voordeur, Tammo met naamkaart | 08:24, helder | kaart "Twee vrienden. Net afgestudeerd."; TAMMO: "Dat bedoelde ik ook." [BEHOUDEN] |
| 5 | `anita` | 4,0 | Tessa aan haar tafel, naamkaart | 08:06, helder | kaart "Nog geen plan." |
| 6 | `pigeon` | 3,0 | duif langs de Martinitoren | 16:12, helder | kaart "Eén heeft duiven." |
| 7 | `escapade` | 3,6 | de Escapade in de Herestraat | 10:30, helder | TESSA: "Rijden, niet praten." [BEHOUDEN]; riser op 2,8 s |
| 8 | `jelle` | 3,4 | Fjordweg, blauw colbert (nog zonder naam) | 18:54, helder | kaart "En een Fries in een blauw colbert."; stoot |
| 9 | `ommeland` | 3,4 | de Ommelanden, het weidse land | 19:00, helder | kaart "Heel Groningen. Eén zomer." |
| 10 | `boat` | 2,6 | rondvaartboot op de Diepenring | 18:24, helder | tikken op 0 en 1,3 s |
| 11 | `kermis` | 2,4 | kermis op de Grote Markt | 22:24, helder | tikken |
| 12 | `spoor` | 2,4 | langs het spoor (trein) | 15:12, helder | tikken |
| 13 | `chase` | 2,4 | achtervolging door de binnenstad | 21:36, motregen | vier tikken (zomerse bui) |
| 14 | `race` | 2,2 | race op de ringweg | 12:48, helder | vier tikken |
| 15 | `aerial` | 2,4 | luchtfoto bij zonsondergang | 19:06, helder | tikken |
| 16 | `tanker` | 2,6 | tankwagen op de Europaweg | 17:36, helder | tik |
| 17 | `night` | 2,4 | nacht in de Poelestraat | 23:18, helder | tik |
| 18 | `storm` | 2,0 | zomerstorm boven het Forum | 16:48, storm | tikken |
| 19 | `trauma` | 2,4 | traumaheli boven het UMCG | 07:12, helder | stilte in de montage |
| 20 | `timelapse` | 3,0 | dag en nacht boven de toren | 09:00 tot 22:36 | adem voor de grap |
| 21 | `bijna` | 1,3 | een pion op de weg, bijna | 12:54, helder | twee tikken |
| 22 | `berend` | 3,6 | Berends bakkie | 09:24, helder | BEREND: "…Kon minder." [BEHOUDEN] (de stilte voor de zin is bedoeld) |
| 23 | `plantsoen` | 5,7 | Noorderplantsoen | 15:24, helder | kaart "Zoek je plek. Samen."; muziek zakt naar de bas |
| 24 | `logo` | 5,0 | de toren, gedimd | 19:06 tot 19:21, helder | titelkaart GDE Groningen, Zomer vol misdaad, **Ontdek jezelf in Grunn.**, Gratis voor pc en Mac; stoot |

Spoilerregels: geen vitrine, geen briefje, geen kus, geen finale, geen uitslag (`FORBIDDEN` in de validator); geen voltooide wagen; Jelle blijft een silhouet en een kleur (blauw colbert), zonder naam in beeld.

## Marketingteksten (afstemming met de verhaal-lead)

De verhaal-lead heeft de slogan al in Steam (`docs/steam/winkelpagina.md`), de perskit (`docs/PERSKIT.md`), social (`docs/SOCIAL-EN-WEBSITE.md`) en `TRAILER-SCRIPT.md` doorgevoerd (branch `epic-verhaal-21-11`); ik raak die bestanden niet aan om dubbel werk en conflicten te vermijden. Wat bij deze trailer hoort en nog volgt na het samenvoegen: `docs/youtube/trailers.md` en `docs/youtube/kaarten/eindkaart.svg` en `kaart_slagzin.svg` (nog "Heel Groningen. Voor één eierbal." en "Een frietwagen. Eén standplaats."), en `docs/showcase/showcase-video.json` / `SHOWCASE-VIDEO.md` (dezelfde zinnen). Voorstel voor de YouTube-beschrijving: "Ontdek jezelf in Grunn. Twee net afgestudeerde vrienden zonder plan, een Fries in een blauw colbert en een stad vol rare types. Een open-wereldkomedie in een low-poly Groningen: eigen verhaal, eigen personages, echte plekken."

## Muziek: cue-lijst voor een latere ronde

| Tijd | Cue | Stemming | Opmerking |
|---|---|---|---|
| 0 | stilte met straatgeluid | rustig | alleen radio, meeuwen |
| 4 | thema in | warm, hoopvol | opbouw over twee maten, kick op de stoot van `sunrise` |
| 22 | spanningsbocht | speels, een tikje dreigend | twee diepe noten op `jelle` (tuba), dan weer licht |
| 33 | tempo omhoog | rennend | snare op elke snede, riser vooraf, crescendo tot 59 s |
| 59 | stilte | adem | één halve seconde stilte op de uitademing voor `berend` |
| 64 | zacht terug | tederheid | gitaar en bas, geen drums, onder "Zoek je plek. Samen." |
| 70 | titel-sting | groot, vrolijk | het thema vol op de slotkaart, een klokje op de laatste beat |

## Toegankelijkheid

Geen flitsen in de cut (de `flash()` van cutscenes wordt in de opname niet gebruikt); alle gesproken regels hebben een ondertitel; kaarten blijven minimaal 2 s staan; de slogan staat ook als tekst in de beschrijving.
