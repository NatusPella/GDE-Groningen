# 07 · TTS-raming (er wordt niets opgenomen; de eigenaar beslist)

Hoort bij [00-OVERZICHT.md](00-OVERZICHT.md). Geen TTS gedraaid, geen netwerk gebruikt, `.env` niet gelezen. Alle cijfers komen uit de script-bestanden `09-script-akte1..5.md` (lokaal geteld) en uit `docs/verhaal/deel4-f4a.md` (de eerdere kostenmaat).

## 1. Hoe er geteld is

- Elke uiting in `09-script-akte*.md` heeft `[BEHOUDEN]` of `[NIEUW]`. `[BEHOUDEN]` is gecontroleerd met een lokaal script: de regel staat letterlijk (na normalisatie van aanhalingstekens en spaties) in `game/js/*.js`. Van de 645 aanvankelijk als behouden gemarkeerde regels (in alle bestanden samen) waren er 51 niet letterlijk terug te vinden; die zijn teruggezet naar `[NIEUW]`. Zo is "behouden" een ondergrens: er kunnen meer regels bestaan met een andere spelling.
- Wijzigingen aan een bestaande regel tellen als `[NIEUW]` (sleutel = de tekst; de oude opname blijft verweesd). Een kleine groep regels staat al bijna zo in de repo (ellips, interpunctie, een naam): dat zijn de 51 teruggezette plus de vier "Tige tank"-regels waarin J een W werd.
- Appjes en sms (`APP VAN→NAAR (stil)`) zijn stil en kosten niets: 29 regels.
- De getelde regels zijn **het script dat nu bestaat**. Het spel heeft daarnaast kleine extra regels (faalregels, hints, ondertitel-varianten, extra autogesprekken). **AANNAME:** daar komt ca. 25% bovenop de nieuwe tekens.

## 2. Aantallen per akte

| Akte | Scènes | Uitingen (stem) | Behouden | Nieuw/gewijzigd | Tekens nieuw | Tekens behouden | Appjes (stil) |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 · Stad | 41 | 294 | 172 (58%) | 122 | 5.735 | 7.930 | 4 |
| 2 · Hogeland, Wad | 32 | 209 | 66 (32%) | 143 | 5.666 | 2.507 | 9 |
| 3 · Eemsdelta, Oldambt | 31 | 188 | 43 (23%) | 145 | 5.220 | 1.266 | 6 |
| 4 · Veenkoloniën, Westerwolde | 31 | 204 | 28 (14%) | 176 | 6.036 | 964 | 5 |
| 5 · Westerkwartier, Stad | 32 | 215 | 94 (44%) | 121 | 3.938 | 3.710 | 5 |
| **Totaal** | **167** | **1.110** | **403 (36%)** | **707 (64%)** | **26.595** | **16.377** | **29** |

(Uitingen = behouden + nieuw. De scènes in `09` zijn koppen; sommige zijn herhalings- of poolscènes.)

**Lezing.** Akte 1 en 5 zijn grotendeels bestaand materiaal in een nieuwe volgorde; akte 2-4 zijn vooral nieuw omdat daar de provincie en de plot komen. Van de bestaande 1.725 opgenomen regels blijven er dus ca. 400 in gebruik; de rest blijft verweesd in het manifest en wordt niet gespeeld.

## 3. Wie spreekt (alleen de belangrijkste)

| Spreker | Behouden | Nieuw | Tekens nieuw | Opmerking |
|---|---:|---:|---:|---|
| Tessa | 115 | 244 | 9.044 | de grootste klus; nieuwe regels in standaard Nederlands (besluit van de eigenaar: Tessa is Nederlands) |
| Tammo | 124 | 198 | 4.520 | korte zinnen, dus goedkoop |
| Rikus | 48 | 26 | 2.037 | bijna alle rubrieken blijven |
| Jelle Terpstra | 13 | 37 | 1.682 | Fries-getint, ondertitels nodig (`subtitles.js` `FY`) |
| Berend | 15 | 27 | 1.208 | |
| Oma Trijntje | 18 | 17 | 893 | |
| Durk, Douwe | 17 | 29 | 711 | |
| Mem Terpstra | 4 | 12 | 336 | Fries-getint, ondertitels |
| Nieuwe sprekers | 0 | ca. 93 | ca. 4.100 | Wubbo, Geesje, Lammert, Tinus, Roelfien (vijf bondgenoten), Loketbediende, Accountmanager, Jurylid, Buschauffeur: nieuwe stemmen en naamkaarten nodig |

## 4. Kostenraming

**Kostenmaat.** `docs/verhaal/deel4-f4a.md` bevat 975 dialoogregels met samen 46.874 tekens (lokaal geteld, alleen regels in het dialoogformaat van dat bestand). De eerdere raming was ca. 1,00-1,50 dollar per F4a-script via OpenRouter. Dat geeft **0,021-0,032 dollar per 1.000 tekens**.

| Post | Tekens | Kosten (laag-hoog) |
|---|---:|---|
| Akte 1 | 5.735 | 0,12-0,18 |
| Akte 2 | 5.666 | 0,12-0,18 |
| Akte 3 | 5.220 | 0,11-0,17 |
| Akte 4 | 6.036 | 0,13-0,19 |
| Akte 5 | 3.938 | 0,08-0,13 |
| **Script zoals nu** | **26.595** | **0,57-0,85** |
| + extra spelregels (aanname +25%) | ca. 6.600 | 0,14-0,21 |
| **Eerste opnameronde** | ca. 33.200 | **0,71-1,06** |
| Met heropnamen (aanname x1,5 voor tonen en fouten) | | **1,07-1,60** |

**Onzekerheid.** (1) De kostenmaat is een schatting uit één eerder bedrag; het script waarop die gebaseerd was kan meer regels hebben gehad dan de 975 die dit bestand in het dialoogformaat laat zien (het bestand noemt zelf ca. 2.508 gesproken regels). Als de maat op 2.508 regels is gebaseerd, ligt de prijs per teken ruwweg de helft lager (dan ca. 0,35-0,55 voor de eerste ronde). (2) Tarief, model (nu Gemini 3.8 via OpenRouter, zie geheugen) en eventuele regels langer dan nu kunnen de prijs verschuiven. (3) De nieuwe stemmen voor de vijf bondgenoten kosten een stemkeuze en tests, niet veel geld. **Orde van grootte: één tot twee dollar voor het hele nieuwe verhaal.**

## 5. Wat nog moet gebeuren (door de eigenaar beslist)

1. Akkoord op de lijst `[NIEUW]` of een sneller pad (alleen akte 1 en 5 hernemen, akte 2-4 later).
2. Stemkeuze voor Wubbo, Geesje, Lammert, Tinus, Roelfien, de Loketbediende, de Accountmanager.
3. Ondertitels: de Friese regels van Jelle en Mem (`FY`), eventuele Groningse regels (`GRO`).
4. Per regel een tag (`speech_metadata.style`) in het Nederlands, in de stijl van `storyarc.js`; nu staan de tags niet in `09`.
5. `node scripts/voice_coverage.mjs --quiet` na het ingeven van de nieuwe regels in de code; pas dan weet je het exacte aantal.
