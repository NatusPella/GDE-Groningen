# Prestatieronde 21-11-2026 (#804, #937, #921): perf-review van 0.64.0 en de eigenaar-feedback over lag

> Opdracht: stabiele framerate op een middenklasse-pc (doel 60 fps, ook met vier spelers; norm 33,5 ms, hitchplafond 1 s).
> Aanleiding: de release 0.64.0 had geen fps-meting; de AI-review van de release vond vijf punten (a tot e). Daarna meldde
> de eigenaar na de eerste speelsessie: "alleen ik heb toch nog flink wat lag", haperingen bij het laden van nieuwe delen
> van de stad en lage fps in drukke delen. Stand: tak `worktree-agent-a0e569fba0b7260d6` vanaf `9d4f791a7` (main = v0.64.0). Niets gepusht of gemerged.

## Wat deze ronde NIET kon meten (lees dit eerst)

- **Geen Electron-meting van voor en na.** De perf-route (`scripts/perf/run.mjs`, `PERF_ONLY=foot,ring`) is klaargezet voor
  een gepaarde meting: twee stages (`desktop/build/before/game` = main `9d4f791a7`, `desktop/build/after/game` = deze tak, beide
  met de wereld van een andere recente build) en een wrapper die de run door de slotbewaker (`slot.mjs`) stuurt. De run kwam
  nooit aan de beurt: gedurende ruim een half uur waren alle drie de Electron-sloten bezet door andere agents
  (`samen`, `ds`, `spelers`, `missie`) en was er 0,7 tot 2,2 GB vrij geheugen (de bewaker eist 1,5 GB). Zonder slot draaien zou
  de meting door de andere instanties vervuild zijn (CPU, geheugen, GPU gedeeld) en de machine voor hen nog trager maken; dat
  heb ik niet gedaan. Er zijn dus **geen frametijden, hitchlijsten of laadtijden gemeten**; alles hieronder is uit de code, uit
  het manifest en uit node-microbenchmarks afgeleid.
- Wat de eigenaar voelt (hitches bij nieuwe stadsdelen, drukke delen) is daarmee **niet bewezen opgelost**. De wijzigingen
  hieronder halen aantoonbare, structurele kosten weg; of dat de lag oplost moet een gepaarde run bij een vrij slot laten zien
  (commando onderaan).
- Alle 'gemeten' cijfers hieronder zijn node-cijfers (zelfde code, zelfde uitkomst) en zeggen niets over Electron-frametijden.

## Gedaan (commits, elk los te mergen)

| # | Punt | Wat | Voor | Na | Bewijs |
|---|---|---|---|---|---|
| 1 | (a) `sfx/samples.js` | Alle 154 geluiden werden bij de start gedecodeerd, in één lange rij. Nu decodeert `createSamples` alleen de korte, vaak gebruikte klanken bij de start (categorieën `ui`, `deur`, `voetstap`, `winkel`: 85 stuks); de rest (lussen van het weer, vliegtuig, boot, dieren, donder, trein) pas bij de eerste `has()`/`buffer()`-vraag, één decodeerbeurt tegelijk met 12 ms ruimte ertussen. Tot dan geeft `buffer()` `null` en speelt de synth, zoals bij een ontbrekend bestand (dat pad bestond al). `laadAlles()` laadt alles (testen en meetscripts) | ca. 102 MB PCM (154 klanken, 203,6 MB stereo-equivalent gedeeld door 2: mono) bij de start | ca. 6,5 MB bij de start; de rest alleen als het gebruikt wordt | Rekensom uit `manifest.json` (`duur_s` x 48 kHz x 4 bytes, mono): lussen van het weer alleen al ca. 51 MB. `sfxsamples_test` (1754 controles, o.a. dat een lus na `start()` nog niet geladen is en na de eerste vraag wel, en niets twee keer laadt). Decodeertijd zelf niet gemeten |
| 2 | (b) `hudcards.js` | `columnOpts()` las elk frame `offsetHeight` van `.phonefeed` zolang er een kaart in de wachtrij stond: een gedwongen layoutberekening per frame. Nu via `throttledRead` (nieuw in `hudbus.js`): hooguit 4x per seconde, en alleen als een E-kaart of een A-kaart het antwoord nodig heeft | 1 layoutlezing per frame met een wachtende kaart | 1 per 250 ms | `hudcards_layout_test`: 60 frames van 4 ms geven 1 lezing; een terugspringende klok leest opnieuw. De kosten van de layoutlezing zelf (hangt af van hoe vuil de layout is) zijn niet gemeten |
| 3 | (c) `scene3d.js` | Na 12 frames wachten bouwde de hoofdthread één heavy weg per frame, zonder tijdsbegrenzing: een hitchreeks van honderden ms achter elkaar (de bouw `buildRoadGroup` is één blok en niet in stukken te knippen). Nu bepaalt `createHeavyRoadGate` (`roadbudget.js`) dat na een heavy bouw van `cost` ms de volgende pas komt na max(250 ms, 4 x `cost`). De heavy bouw kost zo hooguit 1/5 van de tijd: een losse hitch met rust ertussen in plaats van een reeks. #883 (wegen verdwijnen) blijft gelden: de poort laat alles uiteindelijk door. `scene3d.js` staat op 4497 regels (grens < 4500; de oude teller `roadHeavyWait` is in de poort verhuisd) | heavy wegen opeenvolgend per frame (elk honderden ms) | een heavy weg per max(250 ms, 4 x bouwtijd) | `roadbudget_test` (21 controles): 70 heavy wegen van 300 ms worden allemaal gebouwd, de bouwtijd blijft ca. 1/5 van de tijd en geen weg wacht voor altijd. De werkelijke bouwtijd van een heavy weg in Electron niet gemeten |
| 4 | (e) `simhud.js` | `simHudTik` bouwde elk beeld de hele HTML-string (esc, svg, icoon) alleen om hem met de vorige te vergelijken. Nu vergelijkt hij een JSON-vingerafdruk van het model (plus een versienummer van de toetsplaatjes) en bouwt de HTML alleen bij een wijziging | 11,7 us per beeld | 1,6 us per beeld (7,4x) | `scripts/perf/simhud_bench.mjs` (node, zelfde uitkomst); alle `*hud*_test` groen |
| 5 | (e) `boerderijwereld.js` | `meldOogstklaar` (`Object.keys` over de percelen en `veldStand` per perceel) draaide elk beeld. Nu twee keer per seconde (`MELD_OOGST_S`); een veld dat oogstklaar wordt, wordt hooguit een halve seconde later gemeld | elk beeld | 2x per seconde | `boerderij*_test` groen. Winst niet gemeten (handvol percelen: ver onder 0,05 ms; dit is vooral hygiene) |

## Bekeken en bewust niet gedaan

- **`poseclips.js` (e):** `clipLayers` bouwt per acteur per beeld een gesorteerde lijst. Ik heb een cache per events-array
  geprobeerd; de bestaande `poseclips_bench.mjs` gaf 0,0683 naar 0,0627 ms per beeld voor 12 acteurs (8 procent). Dat is alleen in
  cutscenes (`cutscript.js`), niet in de stad, en niet de moeite voor het risico op een verouderde cache: teruggedraaid.
- **`glyphs.js` MutationObserver (eigenaar-feedback):** hij kijkt naar `document.body` met `subtree` en `characterData`. Per
  record is het werk klein (een `closest`, een regex, een `innerHTML`-vergelijking voor glyph-elementen), en bij een toegevoegde
  subboom loopt hij met een `TreeWalker` en twee `querySelectorAll` over alle nieuwe knopen. Dat is alleen een probleem als
  een HUD-onderdeel zijn hele subboom elk beeld herbouwt (zoals `simhud` dat deed, nu niet meer, en 'phonefeed'/menu's bij
  openen). **Niet gemeten**: een profiel met `PERF_HUD_MARKS=1` in drukke stadsdelen moet uitwijzen of de observer boven 0,2 ms
  per frame komt. Zo niet: laten staan.
- **`FrameQueue` (frame-pacing bij tegelstreaming):** budget 2 ms per frame via `follow()`, met minstens één item per aanroep.
  Een item is niet te splitsen en kan veel langer dan het budget duren (`addTile` gemiddeld 13,5 ms, 85 boven 20 ms, max 531 in
  PERF-METING-2026-10-19). Dat is de bekende staart; een betere pacing vraagt dat items hun kosten vooraf melden of in stukken
  komen. Geen wijziging zonder meting. Een kleine, veilige kandidaat: `run()` sorteert de hele rij elke aanroep.
- **Audiobuffers vrijgeven:** door het lui laden staan er alleen nog buffers in het geheugen die ooit nodig waren. Een
  buffer wordt daarna nooit meer vrijgegeven. Voorstel (niet gedaan, kost S): een lus die 5 minuten niet gevraagd is (regen,
  vliegtuig, dieren) uit de `buffers`-map halen; `has()` laadt hem dan opnieuw.

## (d) Filmlicht-prewarm: voorstel, geen besluit

`main.js` (rond regel 529) compileert bij een nieuw spel de scène ook in de filmlichtstand en wacht daarop tot `FILM_LICHT_MS` (12 s)
of tot `programsPending() === 0`. Het is een besluit van de eigenaar van 20-11 ("liever langer laden dan haperen", #985); dit
is dus alleen een voorstel, en **niet gemeten** (de aangegeven 16 tot 18 s extra laadtijd is de claim van de review). Opties, van zacht naar hard:

1. **Voorwaarts begrenzen i.p.v. wachten:** wacht hoogstens 6 s en laat de rest linken tijdens de eerste, rustige beelden van de
   film (de film heeft pas bij de cuts de nachtprogramma's nodig); de hitchbewaker (`hookLinkGuard`) vangt het restant.
2. **Alleen wat de film gebruikt:** compileer niet alle 40 tot 132 varianten van de andere lichtstand maar de lijst die de
   filmcuts werkelijk raakt (`programs.mjs` in `scripts/perf` kan die lijst per cut loggen).
3. **Meten vóór kiezen:** `?perfoff=filmlicht` aan en uit met `scripts/perf/loadcheck.mjs` (laadtijd) en de eerste 60 s van de film
   (hitches), gepaard en drie keer, bij een vrij slot. Pas dan kiezen tussen 16 s langer laden of een paar hitches in de film.

## Gates (alle groen, behalve het genoemde)

`node --check` op de gewijzigde JS, `sfxsamples_test`, `sfx_haken_test`, `stappen_test`, `weer_sfx_test`, `hudcards_layout_test` (nieuw),
`overlap_fixes_test`, `hud_linkerkolom_test`, `hudbus_surfaces_test`, alle `*hud*_test`, `roadbudget_test`, `firstperson_test`
(328 controles; `scene3d.js` 4497 regels), `import_cycles_test`, `boerderij*_test`, `perf_norm_test`, `perf_marks_test`, `perfafrond*_test`,
`perfrest*_test`, `perfscan_test`, `scene_perf_pure_test`, `hitchmarks_test`, `voice_coverage`, `text_audit` (0 bevindingen),
`docs_index_test`, `lineendings_test`. `spec_check` geeft een fout die al op main staat en niet van deze ronde is:
`publicatie.md` zegt versie 0.63.0, `desktop/package.json` 0.64.0 (`node scripts/spec_check.mjs --write` zet dat gelijk).

## Meten bij een vrij slot (zodra de machine stil is)

```
node desktop/build/runperf.mjs before b1   # main 9d4f791a7, route foot + ring, 20 s per route
node desktop/build/runperf.mjs after  a1   # deze tak
```

(`desktop/build/` staat niet in git; opnieuw opbouwen: `GDE_PREBUILT_WORLD=<recente build>/game/world GDE_STAGE_OUT=<map>/game node desktop/build.mjs`,
voor de basislijn met `GDE_STAGE_SRC` op een `git archive` van main.) Herhaal drie keer, neem de mediaan van p95 en de hitchlijst,
en meld hoeveel andere Electron-instanties er draaiden.
