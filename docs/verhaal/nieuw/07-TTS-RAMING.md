# 07 · TTS-raming (achterhaald: er wordt weer opgenomen)

**Achterhaald op 25-10: nieuwe opnames mogen wel, op Gemini Flash-Lite en binnen een budget (ADR 0019, #462).** De raming in §1-3 en de kostenmaat in §4 blijven als historie staan; de **actuele stand** staat in de laatste alinea van §4 en de commando's in §6 (en in de comments op #462).

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

**Kosten tot 27-10: $0,184.** Er wordt opgenomen in rondes op \`gemini-3.8-flash-lite-tts\` (ADR 0019,
#462). Stand na de opnameronde van 29-10 en het opruimen van de wachtrij (6-11): **744 van de 1.450
verhaalregels hebben een stem en 706 zijn nog alleen tekst** (`node scripts/voice_coverage.mjs --quiet`).
Daarvan staan **63 opdrachten klaar in de wachtrij** (`scripts/tts_lines.json`; `python
scripts/tts_lines.py --dry-run` laat ze zien, samen ca. 197 s audio en ca. $0,03), wachten **155 regels
op een stemkeuze** (de 17 sprekers die nog niet in `CAST` van `scripts/tts_lines_list.mjs` staan) en
**451 op een Groningse spreektekst** (`scripts/gronings_spoken.json`); `node scripts/tts_lines_list.mjs`
print die drie getallen. De wachtrij had 163 opdrachten; 100 waren al opgenomen en zijn eruit gehaald.
De overige 37 tekstregels zijn stille appjes en sms'en (`channel: app-stil`), die hoeven geen opname.

**Onzekerheid.** (1) De kostenmaat is een schatting uit één eerder bedrag; het script waarop die gebaseerd was kan meer regels hebben gehad dan de 975 die dit bestand in het dialoogformaat laat zien (het bestand noemt zelf ca. 2.508 gesproken regels). Als de maat op 2.508 regels is gebaseerd, ligt de prijs per teken ruwweg de helft lager. (2) Tarief, model (nu Gemini 3.8 via OpenRouter, zie geheugen) en eventuele regels langer dan nu kunnen de prijs verschuiven. (3) De nieuwe stemmen voor de bondgenoten kosten een stemkeuze en tests, niet veel geld. **Orde van grootte, voor later: één tot twee dollar voor het hele nieuwe verhaal.**

## 5. Wat later moet gebeuren (pas na een nieuw besluit van de eigenaar)

1. Besluit of en wanneer er opgenomen wordt: alles, of eerst alleen akte 1 en 5.
2. Stemkeuze voor de sprekers zonder stem in `CAST`; welke dat zijn en hoeveel regels het kost, print `node scripts/tts_lines_list.mjs` (nu 155 regels van 17 sprekers, zie §4 en §6).
3. Ondertitels: de Friese regels van Jelle en Mem (`FY`), eventuele Groningse regels (`GRO`).
4. Per regel een tag (`speech_metadata.style`) in het Nederlands, in de stijl van `storyarc.js`; nu staan de tags niet in `09`.
5. `node scripts/voice_coverage.mjs --quiet` na het ingeven van de nieuwe regels in de code; pas dan weet je het exacte aantal.

## 6. Zo draai je een ronde (voor de eigenaar)

Dit is de actuele stand van de pijplijn; de raming in §1-4 blijft historie. Nodig: Python met `ffmpeg` en `ffprobe` in het pad. De sleutel staat in `.env` (nooit lezen of printen, zie AGENTS.md); `gemini_tts.py` zoekt die zelf (`GOOGLE_AI_STUDIO_KEY` of `GEMINI_API_KEY`; `OPENROUTER_API_KEY` alleen voor de oude openrouter-route). Zonder sleutel werkt alleen de droogloop.

1. **Lijst verversen** (schrijft `scripts/tts_lines.json`; neemt niets op, vraagt geen sleutel):
   `node scripts/tts_lines_list.mjs` → nu 63 jobs, 0 re-recordings, 155 + 451 wachtenden.
2. **Droogloop** (geen sleutel, geen netwerk, schrijft geen clip en geen manifest):
   `python scripts/tts_lines.py --dry-run` (ook `--dry`) → 63 opdrachten, 0 al ingesproken, 0 zonder
   Groningse spreektekst; ca. 197 s audio en ca. $0,03 via `gemini-3.8-flash-lite-tts`.
3. **Echte ronde binnen een budget:** `python scripts/tts_lines.py --budget 2.5` → stopt zodra de eigen
   meter (`gemini_tts.usage()`) het budget nadert; clips gaan naar de map van de opdracht
   (`game/audio/voicelines/lines/` voor de huidige 63), waar `manifest.json` en `tts.json` worden
   bijgewerkt. Kleiner of een proef kan ook:
   `python scripts/tts_lines.py 12 --budget 0.5` (eerste 12) of `python scripts/tts_lines.py 12 --out proef`
   (wegwerpmap, raakt het spelmanifest niet).
4. **Verhaaldata bijwerken:** `node scripts/build_story_data.mjs` → werkt `game/storydata/script.json` bij,
   zodat opgenomen regels niet meer `textOnly` zijn; `--check` faalt als het bestand verouderd is.
5. **Controle:** `node scripts/voice_coverage.mjs --quiet` → moet slagen (nu 744/744 ok, 706 alleen tekst);
   exitcode 1 betekent een ontbrekende opname of een Friese regel zonder Nederlandse ondertitel.

**Niet blind regenereren: banter, barks en sidejobs.** De opruimactie gold alleen `scripts/tts_lines.json` (de verhaalregels). `scripts/tts_banter.json`, `scripts/tts_barks.json` en `scripts/tts_sidejobs.json` en de manifesten in `game/audio/voicelines/{banter,jobs}` hebben hun eigen pijplijn; draai die generators niet "even" mee:

- `tts_banter.py` zonder `max_lines` is een volledige run die opruimt: alleen opnamen waarvan de tekst nog in `scripts/tts_banter.json` staat blijven, de rest gaat uit het manifest en de mp3's worden verwijderd. Nu staan er 932 regels in `game/audio/voicelines/banter/manifest.json` tegen 880 in de lijst; een blinde run wist 54 manifestregels en 55 clips (die teksten staan niet meer in `banterlines.js`, maar ze terugkrijgen kost een nieuwe opname).
- `tts_barks.py` schrijft vaste paden die in `audio.js` hard-coded zijn en heeft geen manifest; de teksten in `tts_barks_lines.mjs` zijn uit Whisper-transcripten van de oude WAV's gereconstrueerd (zie `docs/archief/geheugen-mac-sessie/gemini-38-tts-findings.md`). Alle 111 clips zijn nu actueel, dus een run doet niets; maar na het opnieuw genereren van de lijst kunnen teksten of paden verschuiven en worden bestaande clips overschreven.
- `tts_sidejobs.py` gebruikt index-bestandsnamen (`<job>/intro_0.mp3`, `<kind>_0.mp3`); wijzigt de volgorde in `sidejob_*.js` of `sidejobvoice.js`, dan komt een bestaande opname bij een andere regel te staan. Nieuwe verhaal- en jobsregels komen bewust in de `lines`-manifest terecht (waar `missionstory.js` op terugvalt), niet in `jobs`.
