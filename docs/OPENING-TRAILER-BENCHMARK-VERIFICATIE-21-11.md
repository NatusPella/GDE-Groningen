# Verificatie en draaiboek: opening, trailer en benchmark (21-11)

Voor de coördinator, bij de ene grote Electron-sweep. Ontwerp en besluiten: [OPENING-TRAILER-BENCHMARK-21-11.md](OPENING-TRAILER-BENCHMARK-21-11.md). Alles hieronder is **nog niet bekeken**; niets is in beeld of gehoor gecontroleerd. Mocks (zonder spelstaat): `docs/beeld-21-11/opening-trailer-benchmark/*.html` (`node scripts/benchmark_mock.mjs`).

## 1. Opening (nieuw spel, eerste start)

**Testpad voor de nieuwe film (ronde 2):** start de gestagede build met een wegwerpprofiel en de vlag, bijvoorbeeld `desktop --url-flags=openingfilm` (zonder `noattract`, een nieuw spel: de opening speelt bij de eerste start; of Verhaal > Personages > opening opnieuw bekijken). Zonder de vlag speelt de oude opening: vergelijk die twee. Opnemen: `scripts/trailer` (`--clip`) of een schermopname van de run; de console moet leeg zijn van `opening-film`-waarschuwingen (een waarschuwing betekent dat de film is teruggevallen op de oude opening: noteer welke shot).

Let op bij de film (19 shots, ca. 170 s):

- [ ] Volgorde en tijden: zwart + Rikus, kraan, fietsen, meeuw, Tammo met duiven (naamkaart), duif op de schouder, deur, gevel, keuken (Tessa-naamkaart), de wedstrijd en de tekening, de belofte, de bekentenis met stilte, het raam met stikker en Rikus, "Kom. Werk.", verhuisdag, de regels over geld en de band, titelkaart, zweefvlucht naar de speler.
- [ ] Nieuwe staging in beeld: de 6 duiven lopen achter Tammo en de duif landt op zijn schouder (geen vlieg door hem heen); de kiosk, de man met zijn rug naar de camera en de stikker staan op een open plek (geen clipping in een gevel); de bandcamera zit bij het voorwiel; geen kaal of zwevend ding.
- [ ] Geen witte flitsen en geen sluiterklik; de camera's in de keuken blijven aan één kant van de tafel (geen springende as); ondertitels leesbaar.
- [ ] Fallback: forceer een fout (bijvoorbeeld de shot `c2-raam` laten gooien) en controleer dat de oude opening start in plaats van een vastgelopen scherm.

Voor de oude opening (zonder vlag) geldt:

- [ ] **Titelkaart (88 s):** logo, daaronder "Ontdek jezelf in Grunn." en "Twee afgestudeerden. Eén zomer. Nog geen plan.", geen woord over frietwagen of snacks; kaart blijft ruim leesbaar (13 px-vloer, letterafstand niet uitlopend).
- [ ] **Overslaan-hint:** "Houd SPATIE ingedrukt om over te slaan" met de toets in een toetsplaatje; de ring vult in 0,9 s; overslaan breekt niets (spel start bij de speler).
- [ ] **Geen flitsen** in de opening (de bestaande trailerparodie-opening heeft nog witte flitsen op sneden: toetsen of de flits bij reduced-motion uit is; zo niet, melden als bouwpunt).
- [ ] Ondertitels altijd aan, leesbaar, geen 3 regels; Rikus' radiolijn "Augustus. In Grunn heet dat zomer." als eerste geluid.
- [ ] Beoordeel de **oude staging tegen het filmscript** (`verhaal/OPENING-FILMSCRIPT-21-11.md`): wat komt overeen (zonsopgang, Oosterparkwijk, keuken, verhuisdag, zweefvlucht) en wat nog moet (duiven in beeld bij Tammo, Jelle-silhouet met stikker, naamkaarten, geregisseerde keuken).
- [ ] Samen spelen: een gast met eigen profiel ziet de opening lokaal; overslaan houdt niemand op; geen wereldwacht.
- [ ] Gehoor: thema begint bij het eerste zonlicht, ducket onder stemmen; stilte op "…Samen." (nu nog niet gemixt: bevinding noteren).

## 2. Trailer: opnemen en controleren

Het draaiboek met tijden, plaats, uur, tekst, stemmen en eisen per shot staat klaar: `node scripts/trailer/opnamelijst.mjs` (of `--json`); het toetst PLAN en dit filmscript tegen elkaar (`scripts/trailer_opnamelijst_test.mjs`). Correctie ronde 3: de fasetijden in het filmscript volgden niet de cut; de tempo-opbouw loopt van 33 tot 59 s (de tijdsprong van 3 s is de langste shot daarin).

```
node scripts/record_trailer.mjs --run --cut=ontdek --res=1080p --out=<map buiten de repo> --game-dir=<staged game> --slot
```

(één Electron-instantie, eigen profiel; ELECTRON_EXE als desktop/node_modules ontbreekt.) Daarna `node scripts/trailer/check_video.mjs`, `check_audio.mjs` en `contact_video.mjs` op de MP4 (zie `scripts/trailer/README.md`).

- [ ] 75 s, 24 shots, in de volgorde van de shotlijst (`verhaal/TRAILER-FILMSCRIPT-21-11.md`); tempo-opbouw tussen 33 en 59 s zichtbaar; de grap "…Kon minder." krijgt stilte ervoor.
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
- [ ] Hoogte (schatting, `scripts/benchmarkkeuze_test.mjs`): de kaart heeft ca. 940 px nodig op 720p (688 beschikbaar) en ca. 1120 px op 1080p (1048 beschikbaar), dus het paneel scrolt op beide; kijk of de knoppen onderaan met de pijltjes bereikbaar blijven en overweeg een bredere kaart in twee kolommen.
- [ ] Kaart op 1280×720 en 1920×1080: scrolt zonder afgekapte knoppen, 13 px-vloer, toets in de knop, focusring zichtbaar; reduced-motion (grafiek groeit niet, kaarten bewegen niet).
- [ ] De meting zelf: fps van de klassieke route op dezelfde computer als de vorige release (0.64.x): binnen de ruis. De commentaar-ondertitels mogen de fps niet meetbaar veranderen (meet één keer met en één keer zonder).

## 4. Bekende open punten voor de sweep

- De nieuwe filmstaging (opening) en de gemixte muziek ontbreken; dit draaiboek toetst de data en de oude staging.
- Vier nieuwe openingsregels zijn nog zonder stem; ze komen in de TTS-ronde na overname door de verhaal-lead.
- De mocks zijn niet in een browser bekeken.
