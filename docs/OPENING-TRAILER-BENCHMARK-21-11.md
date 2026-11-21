# Opening, verhaaltrailer en benchmark: herbouw voor DS3 en het nieuwe verhaal (21-11)

Eigenaar-opdracht (21-11): "De openingscutscene en de verhaaltrailer en de benchmark mogen ook wel flink op de schop. Zowel voor Design System v3 en voor het nieuwe verhaal. En neem de nieuwe manier van scriptschrijven hierin mee (filmscript met sluglines/personagekaarten), net als het AAA maken." Branch `opening-trailer-benchmark-21-11`. Verificatie in beeld en geluid (draaiboek voor de coördinator): [OPENING-TRAILER-BENCHMARK-VERIFICATIE-21-11.md](OPENING-TRAILER-BENCHMARK-VERIFICATIE-21-11.md).

## Wat er is

| Onderdeel | Script / doc | Data en code | Test |
|---|---|---|---|
| A. Opening (92 s, C00.1 tot C00.3) | [verhaal/OPENING-FILMSCRIPT-21-11.md](verhaal/OPENING-FILMSCRIPT-21-11.md) | `game/js/openingfilm.js` (shotlijst, regels, cues, validators); titelkaart in `intromontage.js` uit die data | `scripts/openingfilm_test.mjs` |
| B. Verhaaltrailer (75 s, cut `ontdek`) | [verhaal/TRAILER-FILMSCRIPT-21-11.md](verhaal/TRAILER-FILMSCRIPT-21-11.md) | `PLAN.ontdek` in `game/js/trailerplan.js`; opnemen met `scripts/record_trailer.mjs --cut=ontdek` | `trailerplan_test.mjs`, `trailerfilm_test.mjs` |
| C. Benchmark | dit document, §C | `benchmarkmodel.js` (pure), `benchmarkui.js` (DS3), `FILM_ROUTE` in `benchstats.js`, de koppeling in `trailer.js`, stijlen in `ds-schermen.css` | `benchmarkmodel_test.mjs`, `benchstats_test.mjs`, `ds3_schermen_test.mjs` |
| Mocks | `scripts/benchmark_mock.mjs` | `docs/beeld-21-11/opening-trailer-benchmark/*.html` | n.v.t. |

## Besluiten (met reden)

1. **De opening is een film achter een vlag (ronde 2, 21-11).** Ronde 1 leverde script en data; ronde 2 bouwde de staging: `buildShots(w, film)` in `intromontage.js` maakt van `SEQUENCE` (`openingfilm.js`) 19 shots met de montage-engine: nieuwe shots (koude opening op zwart, kraan langs de toren, fietsen, Tammo met zijn duiven op straat en op zijn schouder, de gevel, het raam met de man in het blauwe colbert en de stikker) en de beproefde shots (meeuw, keukenset, verhuisdag, zweefvlucht) met de regels en de camerasneden van deze film. Veilig: alleen met `?openingfilm` (`--url-flags=openingfilm`); `story.js` speelt dan `playOpeningFilm` en valt bij elke fout (bouwen mislukt, een shot gooit een fout tijdens het spelen) terug op de oude opening (montage + de twee scènes uit `cutscenes.js`); zonder vlag verandert er niets. De film is zonder Electron niet in beeld gezien: de sweep toetst hem (draaiboek §1). Standaard aanzetten is een besluit na die sweep.
2. **Samen spelen: de opening is lokaal en identiek.** Een tweemansscène met beide hoofdpersonen in beeld heeft geen splitsing per protagonist nodig; elke speler ziet hem bij zijn eigen eerste start, overslaan is per speler, de host heeft geen zeggenschap, alleen het einde (de zweefvlucht) landt bij de lokale hoofdpersoon. Reden: AGENTS.md "doet iedereen het lokaal in zijn eigen spel?" en canon "protagonist wisselt lokaal".
3. **De snackwagen is geen marketingbelofte.** In opening en trailer is hij hooguit een tekening of een bijzin; de trailer-validator verbiedt de woorden frietwagen, snackwagen en standplaats in beeldtekst (`FORBIDDEN`), en elke cut moet sluiten met de slogan *Ontdek jezelf in Grunn.*. De oude cuts `teaser` en `hoofd` zijn alleen op slogan en tekstkaart aangepast; hun ritme blijft.
4. **Marketingdocs niet dubbel aangepast.** De verhaal-lead (branch `epic-verhaal-21-11`) heeft Steam, perskit, social en `TRAILER-SCRIPT.md` al op de slogan gezet. Ik raak die bestanden niet aan; het filmscript van de trailer noemt wat na het samenvoegen nog volgt (`docs/youtube/*`, `docs/showcase/*`).
5. **Benchmark: twee routes, de klassieke is bevroren.** `BENCH_ROUTE` blijft letterlijk gelijk (een test bewaakt dat), zodat oude metingen vergelijkbaar blijven. De nieuwe filmroute "Grunn in een dag" gebruikt alleen bestaande, vergrendelde shots (eigen klok, weer en camerapad) en is daarom even deterministisch; hij heeft geen naam- of titelkaarten, geen cutscene-shots en dus geen kosten die de meting vertekenen. De vergelijking met de vorige meting telt alleen binnen dezelfde route (`course` in de opslag; een oude run zonder route geldt als klassiek).
6. **De grafiek is gewone elementen, geen inline SVG** (de DS3-ratel telt SVG; staafjes met een hoogte-variabele zijn toegankelijker en tokenvast).
7. **Commentaar van Tammo en Tessa is ondertitel, geen audio**: kost niets aan de meting, kan uit en verandert de vergelijking niet. Muziek en geluiden: het bestaande thema; een `sfxmap` van de sfx-agent was niet aanwezig op main, dus de koppeling is een lijst met namen voor later.
8. **Eén rapportcijfer (1 tot 10) met drie vakken** (Vlotheid, Stabiliteit, Haperingen) als rapportkaart: een speler begrijpt "7,5: Goed" sneller dan p99-frametijden; de percentielen staan er als feiten onder voor wie het wil weten.

## C. Benchmark

**Keuzescherm** (`showBenchmarkChoice`, `#bench-choice`): twee routekaarten (Grunn in een dag, Klassiek), twee lengtes (Volledig ca. 60 s, Kort ca. 33 s; klassiek heeft er één), een schakelaar voor het commentaar, de duur, Start met `{ENTER}` en Annuleren met `{ESC}` in de knop. Controller: pijlen lopen de knoppen af, A bevestigt (gamepad-menufallback, rol `dialog`). Microanimaties: kaart schuift 2 px op hover en indrukt bij actief; gekozen kaart krijgt de selectiekleur; alles uit bij reduced-motion.

**Rapportkaart** (`reportCard` en `reportHtml`): stempel met het cijfer en het oordeel, de drie vakken als rijen met cijfer, een staafgrafiek van de fps per halve seconde met lijnen bij 30 en 60 fps en rode staven onder 30, de feiten (gemiddelde fps, laagste 1%, laagste 0,1%, mediaan, p95 en p99 frametijd, JS-heap), de haperingen per scène, de vergelijking, de soorten scènes, de fps per grafische stand en de aanbeveling in een bordgroene kaart. Acties: Toepassen, Nog een keer (op dezelfde keuze, zonder nieuwe vraag), **Bewaar als bestand** (lokaal tekstbestand `gde-benchmark-JJJJ-MM-DD.txt`, geen netwerk, geen naam of IP), Instellingen, Technische info kopiëren, Terug.

**Voortgang**: een strook boven in beeld met "Scène n van m" en een DS3-balk (bijgewerkt op het tempo van de fps-teller, dus zonder extra DOM-werk per beeld); de bestaande ESC-hint onderaan blijft.

**Filmroute** (`FILM_ROUTE`, 59,4 s; kort 33,2 s): zonsopgang (mist, laag zonlicht), Vismarkt (menigte), de Escapade door de binnenstad, het Noorderplantsoen, de Ommelanden (streaming, veel land), het spoor, een luchtfoto bij zonsondergang (snelle vlucht, zichtafstand), de rondvaartboot en een tweede watershot, de kermis (drukte), de achtervolging in de motregen, de traumaheli, de nacht in de Poelestraat, de zomerstorm en de race op de ring. Dat dekt drukte, streaming, schaduwen bij laag zonlicht, water, regen en storm, nacht en lucht; de volgorde is de loop van een dag.

**Laadscherm van de benchmark**: tijdens de voorbereiding van de run toont de bestaande trailer-UI zwart met de ESC-hint; de voortgangsstrook is de DS3-vervanging. Het eerste-start-scherm ("Beeld instellen…") blijft zoals het was (ander pad, `startscreen.js`).

## Muziekverzoek voor een latere ronde

De cue-lijsten met timing en stemming staan onderaan [verhaal/OPENING-FILMSCRIPT-21-11.md](verhaal/OPENING-FILMSCRIPT-21-11.md) (`MUSIC` in `openingfilm.js`) en onderaan [verhaal/TRAILER-FILMSCRIPT-21-11.md](verhaal/TRAILER-FILMSCRIPT-21-11.md). Kern: opening en trailer delen één thema (warm, hoopvol, 111 bpm) met een huiselijke variant (gitaar, onder stemmen), een stilte-moment op de bekentenis, twee dreigend-luchtige noten voor Jelle, een tempo-opbouw met snare in de trailer en een titel-sting met klokje. Geen echte muziek; verzonnen of eigen.

## Wat niet is gedaan of niet bekeken

- De staging van de opening (besluit 1) is geschreven en statisch getoetst (`openingfilm_test`), maar nooit gedraaid: posities (kiosk, man, duiven, bandcamera), de duivenpose en de sticker zijn de eerste dingen om in beeld te beoordelen. Geen Electron gedraaid.
- De HTML-mocks zijn gegenereerd maar niet in een browser bekeken.
- De drie nieuwe benchmark-schermen zijn nooit met een echte run getest; de pure delen (model, markup, routes, statistiek) wel. De hoogte van de rapportkaart is nu groter dan de schatting in `ds3_schermen_test` (de kaart scrolt op 720p).
- Alle regels van de film zijn die van de verhaal-lead (`09-script-akte1.md`) of de bestaande trailerstem; er zijn geen nieuwe opnames nodig.
- `sfxmap`-koppeling en geluiden per shot: alleen namen.
