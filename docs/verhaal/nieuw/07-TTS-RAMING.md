# 07 · TTS-raming (er wordt niets opgenomen; alleen ter informatie)

**Besluit van de eigenaar: voorlopig GEEN nieuwe opnames.** Alle regels met de tag `[NIEUW]` blijven voorlopig alleen tekst (ondertitel, tekstkaart); er wordt geen TTS gedraaid voor dit verhaal en de kostenregel is **"nog niet opnemen"**. De bedragen hieronder zijn alleen een schatting voor later, geen opdracht. Het kaartje "Tige tank! – J." en de bestaande opname van Jelles radiomelding blijven zoals ze zijn opgenomen.

Hoort bij [00-OVERZICHT.md](00-OVERZICHT.md). Geen TTS gedraaid, geen netwerk gebruikt, `.env` niet gelezen. Alle cijfers komen uit de script-bestanden `09-script-akte1..5.md` (lokaal geteld met `node scripts/export_story.mjs`, dat nu ook radio-, telefoon- en appregels telt) en uit `docs/archief/2026-10/deel4-f4a.md` (de eerdere kostenmaat).

## 1. Hoe er geteld is

- Elke uiting in `09-script-akte*.md` heeft `[BEHOUDEN]` of `[NIEUW]`. `[BEHOUDEN]` is gecontroleerd met een lokaal script: de regel staat letterlijk (na normalisatie van aanhalingstekens en spaties) in `game/js/*.js`. Na de herschrijving (kanaalscheiding, Mem in het Nederlands in de finale, de gags op drie keer) is die controle opnieuw gedraaid: alle 350 `[BEHOUDEN]`-regels zijn terug te vinden; regels die niet meer kunnen blijven (bijvoorbeeld de radio-intro's van Berend, Jelmer, Sjoerd en Bert, de Groningse spreuk van Tessa, Mems Friese bevestiging van de finale, Rikus' romantiekcommentaar) zijn `[NIEUW]` of geschrapt. Zo is "behouden" een ondergrens: er kunnen meer regels bestaan met een andere spelling.
- Wijzigingen aan een bestaande regel tellen als `[NIEUW]` (sleutel = de tekst; de oude opname blijft verweesd). De drie vitrine-regels (`"Tige tank! – J."`, "Hij bedankt ons.", "Hij. Bedankt. Ons.") blijven `[BEHOUDEN]`.
- Appjes en sms (`APP VAN→NAAR (stil)`) zijn stil en kosten niets: 33 regels.
- De getelde regels zijn **het script dat nu bestaat**. Het spel heeft daarnaast kleine extra regels (faalregels, hints, ondertitel-varianten, extra autogesprekken). **AANNAME:** daar komt ca. 25% bovenop de nieuwe tekens.
- Telling opnieuw gedaan na de besluiten van de eigenaar en de drie reviews (lokaal script op de `09`-bestanden).

## 2. Aantallen per akte

| Akte | Scènes | Uitingen (stem) | Behouden | Nieuw/gewijzigd | Tekens nieuw | Tekens behouden | Appjes (stil) |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 · Stad | 41 | 302 | 156 (52%) | 146 | 8.214 | 6.450 | 5 |
| 2 · Hogeland, Wad | 35 | 211 | 58 (27%) | 153 | 6.993 | 2.218 | 9 |
| 3 · Eemsdelta, Oldambt | 29 | 186 | 35 (19%) | 151 | 6.021 | 974 | 6 |
| 4 · Veenkoloniën, Westerwolde | 32 | 221 | 15 (7%) | 206 | 7.927 | 602 | 8 |
| 5 · Westerkwartier, Stad | 35 | 244 | 86 (35%) | 158 | 7.159 | 3.290 | 5 |
| **Totaal** | **172** | **1.164** | **350 (30%)** | **814 (70%)** | **36.314** | **13.534** | **33** |

(Uitingen = behouden + nieuw. De scènes in `09` zijn koppen; sommige zijn herhalings- of poolscènes.)

**Lezing.** Akte 1 en 5 zijn grotendeels bestaand materiaal in een nieuwe volgorde; akte 2-4 zijn vooral nieuw omdat daar de provincie en de plot komen. Vergeleken met het vorige voorstel (1.114 uitingen, 403 behouden, 711 nieuw, 27.211 tekens nieuw) zijn er 50 uitingen bijgekomen en 53 behouden regels minder: de kanaalscheiding (briefings niet meer via de radio) kost opgenomen radio-intro's, en de finale, het dieptepunt en de bewijsscènes zijn nieuw geschreven. Omdat er voorlopig niets wordt opgenomen, zijn de 814 `[NIEUW]`-regels in de eerste versie stil (tekst).

## 3. Wie spreekt (alleen de belangrijkste)

| Spreker | Behouden | Nieuw | Tekens nieuw | Opmerking |
|---|---:|---:|---:|---|
| Tessa | 110 | 274 | 11.727 | de grootste klus; nieuwe regels in standaard Nederlands (Tessa is Nederlands) |
| Tammo | 110 | 208 | 4.413 | korte zinnen (alle NIEUW-regels op de twee grote momenten na hoogstens acht woorden), dus goedkoop |
| Rikus | 29 | 19 | 1.779 | de radio is alleen wereld; romantiekcommentaar vervallen |
| Jelle Terpstra | 12 | 46 | 3.359 | kil en zakelijk, dan Fries-getint; ondertitels nodig (`subtitles.js` `FY`) |
| Berend | 12 | 42 | 2.389 | de finale-regels zijn nieuw |
| Oma Trijntje | 18 | 20 | 1.131 | |
| Durk, Douwe | 16 | 29 | 696 | |
| Mem Terpstra | 2 | 19 | 853 | Nederlands in de finale, Fries-getint in appjes en M20/M21; ondertitels nodig |
| Nieuwe en kleine sprekers (Klaas, Sjabbe-telefoon, Wubbo, Geesje, Lammert, Tinus, Roelfien, de Bewaarder, Loketbediende, Accountmanager, Jurylid, Buschauffeur, Kustwachter, Kermisexploitant, Boer, Deurwaarder) | | 125 | 7.883 | nieuwe stemmen en naamkaarten nodig (pas bij een latere opnameronde) |

## 4. Kostenraming (alleen informatie: nog niet opnemen)

**Kostenmaat.** `docs/archief/2026-10/deel4-f4a.md` bevat 975 dialoogregels met samen 46.874 tekens (lokaal geteld, alleen regels in het dialoogformaat van dat bestand). De eerdere raming was ca. 1,00-1,50 dollar per F4a-script via OpenRouter. Dat geeft **0,021-0,032 dollar per 1.000 tekens**.

| Post | Tekens | Kosten (laag-hoog) |
|---|---:|---|
| Akte 1 | 8.214 | 0,17-0,26 |
| Akte 2 | 6.993 | 0,15-0,22 |
| Akte 3 | 6.021 | 0,13-0,19 |
| Akte 4 | 7.927 | 0,17-0,25 |
| Akte 5 | 7.159 | 0,15-0,23 |
| **Script zoals nu** | **36.314** | **0,76-1,16** |
| + extra spelregels (aanname +25%) | ca. 9.100 | 0,19-0,29 |
| **Eerste opnameronde** | ca. 45.400 | **0,95-1,45** |
| Met heropnamen (aanname x1,5 voor tonen en fouten) | | **1,43-2,18** |

**Kosten nu: 0.** Er wordt niets opgenomen tot de eigenaar daarover beslist.

**Onzekerheid.** (1) De kostenmaat is een schatting uit één eerder bedrag; het script waarop die gebaseerd was kan meer regels hebben gehad dan de 975 die dit bestand in het dialoogformaat laat zien (het bestand noemt zelf ca. 2.508 gesproken regels). Als de maat op 2.508 regels is gebaseerd, ligt de prijs per teken ruwweg de helft lager. (2) Tarief, model (nu Gemini 3.8 via OpenRouter, zie geheugen) en eventuele regels langer dan nu kunnen de prijs verschuiven. (3) De nieuwe stemmen voor de bondgenoten kosten een stemkeuze en tests, niet veel geld. **Orde van grootte, voor later: één tot twee dollar voor het hele nieuwe verhaal.**

## 5. Wat later moet gebeuren (pas na een nieuw besluit van de eigenaar)

1. Besluit of en wanneer er opgenomen wordt: alles, of eerst alleen akte 1 en 5.
2. Stemkeuze voor Wubbo, Geesje, Lammert, Tinus, Roelfien, de Bewaarder, de Loketbediende, de Accountmanager.
3. Ondertitels: de Friese regels van Jelle en Mem (`FY`), eventuele Groningse regels (`GRO`).
4. Per regel een tag (`speech_metadata.style`) in het Nederlands, in de stijl van `storyarc.js`; nu staan de tags niet in `09`.
5. `node scripts/voice_coverage.mjs --quiet` na het ingeven van de nieuwe regels in de code; pas dan weet je het exacte aantal.
