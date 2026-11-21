# Verificatie en draaiboek: opening, trailer en benchmark (21-11)

Voor de coördinator, bij de ene grote Electron-sweep. Ontwerp en besluiten: [OPENING-TRAILER-BENCHMARK-21-11.md](OPENING-TRAILER-BENCHMARK-21-11.md). Alles hieronder is **nog niet bekeken**; niets is in beeld of gehoor gecontroleerd. Mocks (zonder spelstaat): `docs/beeld-21-11/opening-trailer-benchmark/*.html` (`node scripts/benchmark_mock.mjs`).

## 1. Opening (nieuw spel, eerste start)

Start met een wegwerpprofiel (`--story-test=<map>` of een nieuw profiel; nooit het profiel van de eigenaar). Let op:

- [ ] **Titelkaart (88 s):** logo, daaronder "Ontdek jezelf in Grunn." en "Twee afgestudeerden. Eén zomer. Nog geen plan.", geen woord over frietwagen of snacks; kaart blijft ruim leesbaar (13 px-vloer, letterafstand niet uitlopend).
- [ ] **Overslaan-hint:** "Houd SPATIE ingedrukt om over te slaan" met de toets in een toetsplaatje; de ring vult in 0,9 s; overslaan breekt niets (spel start bij de speler).
- [ ] **Geen flitsen** in de opening (de bestaande trailerparodie-opening heeft nog witte flitsen op sneden: toetsen of de flits bij reduced-motion uit is; zo niet, melden als bouwpunt).
- [ ] Ondertitels altijd aan, leesbaar, geen 3 regels; Rikus' radiolijn "Augustus. In Grunn heet dat zomer." als eerste geluid.
- [ ] Beoordeel de **oude staging tegen het filmscript** (`verhaal/OPENING-FILMSCRIPT-21-11.md`): wat komt overeen (zonsopgang, Oosterparkwijk, keuken, verhuisdag, zweefvlucht) en wat nog moet (duiven in beeld bij Tammo, Jelle-silhouet met stikker, naamkaarten, geregisseerde keuken).
- [ ] Samen spelen: een gast met eigen profiel ziet de opening lokaal; overslaan houdt niemand op; geen wereldwacht.
- [ ] Gehoor: thema begint bij het eerste zonlicht, ducket onder stemmen; stilte op "…Samen." (nu nog niet gemixt: bevinding noteren).

## 2. Trailer: opnemen en controleren

```
node scripts/record_trailer.mjs --run --cut=ontdek --res=1080p --out=<map buiten de repo> --game-dir=<staged game> --slot
```

(één Electron-instantie, eigen profiel; ELECTRON_EXE als desktop/node_modules ontbreekt.) Daarna `node scripts/trailer/check_video.mjs`, `check_audio.mjs` en `contact_video.mjs` op de MP4 (zie `scripts/trailer/README.md`).

- [ ] 75 s, 24 shots, in de volgorde van de shotlijst (`verhaal/TRAILER-FILMSCRIPT-21-11.md`); tempo-opbouw tussen 36 en 58 s zichtbaar; de grap "…Kon minder." krijgt stilte ervoor.
- [ ] Geen vitrine, briefje, kus, finale of uitslag; Jelle alleen als silhouet/kleur; **geen snackwagen** in beeld of tekst.
- [ ] Slotkaart: "GDE Groningen – Zomer vol misdaad", **Ontdek jezelf in Grunn.**, "Gratis · voor pc en Mac".
- [ ] Spraak: Rikus (radio), Tessa "Rijden, niet praten.", Tammo "Dat bedoelde ik ook.", Berend "…Kon minder." (allemaal bestaande opnames).
- [ ] Luidheid -14 LUFS, true peak onder -1 dBTP (check_audio); geen witte flitsen die de cut niet bedoelt (de camera-`flash()` bij een camerawissel binnen één shot).
- [ ] Per shot: de camera-opnamepositie klopt met de tabel (plaats, uur, weer).

## 3. Benchmark

Met een wegwerpprofiel, zonder andere programma's (fps-meting is exclusief, AGENTS.md).

- [ ] **Keuzescherm** (Instellingen > Beeld > Benchmark draaien): twee routekaarten, lengtes, schakelaar commentaar, "ca. 60 s" bij Volledig, Start `{ENTER}` en Annuleren `{ESC}` als toetsplaatjes; muis, toetsenbord en controller (pijlen, A, B) werken; Esc annuleert zonder meting.
- [ ] **Klassiek** kiezen: lengte Kort is uitgegrijsd met uitleg; de run is gelijk aan de oude (11 shots, ca. 40 s); het cijfer klopt met de oude fps-cijfers.
- [ ] **Grunn in een dag**: 15 shots in dagvolgorde; commentaar verschijnt 0,6 s na de start van elke shot, 2,8 s lang, past binnen de shot en blijft uit met de schakelaar; voortgangsstrook "Scène n van m" loopt op; geen kaarten of titels in beeld.
- [ ] **Reproduceerbaar:** drie runs achter elkaar geven binnen enkele procenten hetzelfde gemiddelde (en dezelfde scène als zwakste); vergelijk met Kort.
- [ ] **Rapportkaart:** cijfer en oordeel kloppen met de feiten; de grafiek toont de dips (rode staven) op de scènes met haperingen; percentielen oplopend (mediaan < p95 < p99; laagste 0,1% <= laagste 1%); "Haperingen per scène" noemt echte scènes; de vergelijking zegt "andere route: geen vergelijking" na een wissel van route.
- [ ] **Bewaar als bestand:** een `gde-benchmark-<datum>.txt` in de downloads, leesbaar, zonder naam, IP of pad; er gaat niets over het netwerk (netwerkpaneel leeg).
- [ ] **Nog een keer** meet direct op dezelfde keuze, zonder nieuwe vraag; **Toepassen** zet de aanbevolen stand; Technische info kopiëren werkt nog.
- [ ] Kaart op 1280×720 en 1920×1080: scrolt zonder afgekapte knoppen, 13 px-vloer, toets in de knop, focusring zichtbaar; reduced-motion (grafiek groeit niet, kaarten bewegen niet).
- [ ] De meting zelf: fps van de klassieke route op dezelfde computer als de vorige release (0.64.x): binnen de ruis. De commentaar-ondertitels mogen de fps niet meetbaar veranderen (meet één keer met en één keer zonder).

## 4. Bekende open punten voor de sweep

- De nieuwe filmstaging (opening) en de gemixte muziek ontbreken; dit draaiboek toetst de data en de oude staging.
- Vier nieuwe openingsregels zijn nog zonder stem; ze komen in de TTS-ronde na overname door de verhaal-lead.
- De mocks zijn niet in een browser bekeken.
