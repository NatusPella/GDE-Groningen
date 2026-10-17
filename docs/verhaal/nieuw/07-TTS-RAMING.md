# 07 · TTS-raming (er wordt niets opgenomen; alleen ter informatie)

**Besluit van de eigenaar: voorlopig GEEN nieuwe opnames.** Alle regels met de tag `[NIEUW]` blijven voorlopig alleen tekst (ondertitel, tekstkaart); er wordt geen TTS gedraaid voor dit verhaal en de kostenregel is **"nog niet opnemen"**. De bedragen hieronder zijn alleen een schatting voor later, geen opdracht. Het kaartje "Tige tank! – J." en de bestaande opname van Jelles radiomelding blijven zoals ze zijn opgenomen.

Hoort bij [00-OVERZICHT.md](00-OVERZICHT.md). Geen TTS gedraaid, geen netwerk gebruikt, `.env` niet gelezen. Alle cijfers komen uit de script-bestanden `09-script-akte1..5.md` (lokaal geteld) en uit `docs/verhaal/deel4-f4a.md` (de eerdere kostenmaat).

## 1. Hoe er geteld is

- Elke uiting in `09-script-akte*.md` heeft `[BEHOUDEN]` of `[NIEUW]`. `[BEHOUDEN]` is gecontroleerd met een lokaal script: de regel staat letterlijk (na normalisatie van aanhalingstekens en spaties) in `game/js/*.js`. Van de 645 aanvankelijk als behouden gemarkeerde regels (in alle bestanden samen) waren er 51 niet letterlijk terug te vinden; die zijn teruggezet naar `[NIEUW]`. Zo is "behouden" een ondergrens: er kunnen meer regels bestaan met een andere spelling.
- Wijzigingen aan een bestaande regel tellen als `[NIEUW]` (sleutel = de tekst; de oude opname blijft verweesd). Na het besluit over het kaartje zijn de drie vitrine-regels (`"Tige tank! – J."`, "Hij bedankt ons.", "Hij. Bedankt. Ons.") weer `[BEHOUDEN]`; de epiloog (drie regels zonder koude) is `[NIEUW]` geworden.
- Appjes en sms (`APP VAN→NAAR (stil)`) zijn stil en kosten niets: 29 regels.
- De getelde regels zijn **het script dat nu bestaat**. Het spel heeft daarnaast kleine extra regels (faalregels, hints, ondertitel-varianten, extra autogesprekken). **AANNAME:** daar komt ca. 25% bovenop de nieuwe tekens.
- Telling opnieuw gedaan na de besluiten van de eigenaar (lokaal script op de `09`-bestanden).

## 2. Aantallen per akte

| Akte | Scènes | Uitingen (stem) | Behouden | Nieuw/gewijzigd | Tekens nieuw | Tekens behouden | Appjes (stil) |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 · Stad | 41 | 292 | 175 (60%) | 117 | 5.594 | 7.981 | 4 |
| 2 · Hogeland, Wad | 32 | 210 | 66 (31%) | 144 | 5.876 | 2.507 | 9 |
| 3 · Eemsdelta, Oldambt | 31 | 188 | 43 (23%) | 145 | 5.220 | 1.266 | 6 |
| 4 · Veenkoloniën, Westerwolde | 31 | 209 | 28 (13%) | 181 | 6.442 | 964 | 5 |
| 5 · Westerkwartier, Stad | 32 | 215 | 91 (42%) | 124 | 4.079 | 3.601 | 5 |
| **Totaal** | **167** | **1.114** | **403 (36%)** | **711 (64%)** | **27.211** | **16.319** | **29** |

(Uitingen = behouden + nieuw. De scènes in `09` zijn koppen; sommige zijn herhalings- of poolscènes.)

**Lezing.** Akte 1 en 5 zijn grotendeels bestaand materiaal in een nieuwe volgorde; akte 2-4 zijn vooral nieuw omdat daar de provincie en de plot komen. Van de bestaande 1.725 opgenomen regels blijven er dus ca. 400 in gebruik; de rest blijft verweesd in het manifest en wordt niet gespeeld. Omdat er voorlopig niets wordt opgenomen, zijn de 711 `[NIEUW]`-regels in de eerste versie stil (tekst).

## 3. Wie spreekt (alleen de belangrijkste)

| Spreker | Behouden | Nieuw | Tekens nieuw | Opmerking |
|---|---:|---:|---:|---|
| Tessa | 116 | 244 | 9.124 | de grootste klus; nieuwe regels in standaard Nederlands (besluit van de eigenaar: Tessa is Nederlands) |
| Tammo | 124 | 198 | 4.699 | korte zinnen, dus goedkoop |
| Rikus | 47 | 27 | 2.112 | bijna alle rubrieken blijven |
| Jelle Terpstra | 13 | 38 | 1.716 | Fries-getint, ondertitels nodig (`subtitles.js` `FY`) |
| Berend | 15 | 27 | 1.208 | |
| Oma Trijntje | 18 | 16 | 835 | |
| Durk, Douwe | 17 | 29 | 711 | |
| Mem Terpstra | 4 | 14 | 450 | Fries-getint, ondertitels |
| Nieuwe sprekers | 0 | 76 | 3.644 | Wubbo, Geesje, Lammert, Tinus, Roelfien (vijf bondgenoten), Loketbediende, Accountmanager, Jurylid, Buschauffeur: nieuwe stemmen en naamkaarten nodig (pas bij een latere opnameronde) |

## 4. Kostenraming (alleen informatie: nog niet opnemen)

**Kostenmaat.** `docs/verhaal/deel4-f4a.md` bevat 975 dialoogregels met samen 46.874 tekens (lokaal geteld, alleen regels in het dialoogformaat van dat bestand). De eerdere raming was ca. 1,00-1,50 dollar per F4a-script via OpenRouter. Dat geeft **0,021-0,032 dollar per 1.000 tekens**.

| Post | Tekens | Kosten (laag-hoog) |
|---|---:|---|
| Akte 1 | 5.594 | 0,12-0,18 |
| Akte 2 | 5.876 | 0,12-0,19 |
| Akte 3 | 5.220 | 0,11-0,17 |
| Akte 4 | 6.442 | 0,14-0,21 |
| Akte 5 | 4.079 | 0,09-0,13 |
| **Script zoals nu** | **27.211** | **0,57-0,87** |
| + extra spelregels (aanname +25%) | ca. 6.800 | 0,14-0,22 |
| **Eerste opnameronde** | ca. 34.000 | **0,71-1,09** |
| Met heropnamen (aanname x1,5 voor tonen en fouten) | | **1,07-1,63** |

**Kosten nu: 0.** Er wordt niets opgenomen tot de eigenaar daarover beslist.

**Onzekerheid.** (1) De kostenmaat is een schatting uit één eerder bedrag; het script waarop die gebaseerd was kan meer regels hebben gehad dan de 975 die dit bestand in het dialoogformaat laat zien (het bestand noemt zelf ca. 2.508 gesproken regels). Als de maat op 2.508 regels is gebaseerd, ligt de prijs per teken ruwweg de helft lager. (2) Tarief, model (nu Gemini 3.8 via OpenRouter, zie geheugen) en eventuele regels langer dan nu kunnen de prijs verschuiven. (3) De nieuwe stemmen voor de vijf bondgenoten kosten een stemkeuze en tests, niet veel geld. **Orde van grootte, voor later: één tot twee dollar voor het hele nieuwe verhaal.**

## 5. Wat later moet gebeuren (pas na een nieuw besluit van de eigenaar)

1. Besluit of en wanneer er opgenomen wordt: alles, of eerst alleen akte 1 en 5.
2. Stemkeuze voor Wubbo, Geesje, Lammert, Tinus, Roelfien, de Loketbediende, de Accountmanager.
3. Ondertitels: de Friese regels van Jelle en Mem (`FY`), eventuele Groningse regels (`GRO`).
4. Per regel een tag (`speech_metadata.style`) in het Nederlands, in de stijl van `storyarc.js`; nu staan de tags niet in `09`.
5. `node scripts/voice_coverage.mjs --quiet` na het ingeven van de nieuwe regels in de code; pas dan weet je het exacte aantal.
