# Verfijnronde 22-11: stabiliteit, prestaties en QA-infrastructuur

Eigenaarsopdracht: geen nieuwe features, wel verfijnen wat er is. Dit document hoort bij branch `verfijn-stabiliteit-22-11`
(scope `STABILITEIT`). Alles is zonder Electron en zonder build gedaan: pure tests, mocks, fuzz en simulaties in node.

## Wrijving, oplossing en bewijs

| # | Wrijving (wat ging mis of was onzichtbaar) | Oplossing | Bewijs |
|---|---|---|---|
| 1 | Een luisteraar van Instellingen die struikelt (een kapotte weergave) brak `setSetting` en nam de luisteraars erna mee: een instelling "deed niets" | `notify()` vangt per luisteraar; de fout gaat naar het Foutrapport | `settings_robuust_test.mjs` |
| 2 | `setSetting('fov', 'abc')` of NaN zette NaN in het live spel en in het bestand | getalinstellingen weigeren NaN en oneindig | `settings_robuust_test.mjs` |
| 3 | Trilsterkte en dronken effect werden bij het laden niet op hun bereik gecontroleerd | bereik en keuzelijst in `load()` | `settings_robuust_test.mjs`, `settings_fuzz_test.mjs` |
| 4 | `?preset=resolution:abc` gaf NaN | niet-getallen worden overgeslagen | `settings_fuzz_test.mjs` |
| 5 | De online naam (zichtbaar voor anderen) kon stuurtekens en haakjes bevatten | `cleanOnlineNaam` bij laden en bij zetten | `settings_fuzz_test.mjs` (300 bewerkte bestanden, 33.000 controles) |
| 6 | Volle of geblokkeerde opslag: instellingen gingen stil verloren | één waarschuwing in het Foutrapport, stand blijft in het geheugen | `settings_robuust_test.mjs` |
| 7 | Eén save-onderdeel dat gooit blokkeerde de hele autosave eindeloos | `saveveilig.js`: dat veld valt terug op de laatste goede waarde of het veld uit de vorige save, één melding per veld | `saveveilig_test.mjs` |
| 8 | Dezelfde fout met een ander getal (elk beeld) vulde het Foutrapport met bijna gelijke regels | meldingen die alleen in getallen verschillen tellen op één regel | `errorlog_vloed_test.mjs` |
| 9 | Het Foutrapport zei niets over de opslag | regels met bezette plekken, staat, ruimte en laatste opslagfout, zonder namen (`savediag.js`, `addReportExtra`) | `savediag_test.mjs` |
| 10 | Een enorm `console.error`-argument kostte megabytes tekst in één beeld; een kapotte luisteraar brak het loggen | budget van 300 knopen, luisteraars gevangen | `errorlog_vloed_test.mjs` |
| 11 | "Uitleg gezien" met een kapot opgeslagen object liet de uitleg elke keer terugkomen | `opslaglezen.js`: altijd het goede type, herstelt zichzelf | `opslaglezen_test.mjs` |
| 12 | Toetshint-tellers met tekst in plaats van getallen plakten aan elkaar bij het optellen | alleen eindige getallen worden gelezen | `opslaglezen_test.mjs` |
| 13 | De leescache van een slot deelde zijn data met elke lezer: een aangepaste lijst vervuilde de samenvatting, export en kopie | elke lezer krijgt een eigen kopie (goedkoper dan opnieuw parsen) | `saveslots_cache_test.mjs` (bug eerst aangetoond) |
| 14 | `setActive(0)`, `deleteSlot(99)` en vergelijkbare aanroepen schreven stil een ongeldige plek | ongeldig plekkennummer geeft false en verandert niets | `saveslots_ongeldig_test.mjs` |
| 15 | Een ongeldige datum bij exporteren gooide een RangeError | terugval op nu | `saveslots_ongeldig_test.mjs` |
| 16 | Bij een volle opslag mislukte een save terwijl 320 kB aan miniaturen versiering stond | als laatste uitweg gaan de miniaturen weg, de save past | `saveslots_ruimte_test.mjs` |
| 17 | Een lege plek in de shotlijst van de benchmark brak de rapportkaart | `categoryStats` slaat lege plekken over | `benchmark_fuzz_test.mjs` (bug eerst aangetoond) |
| 18 | HUD-paneel (250 ms) en spelerslijst (500 ms) bleven pollen terwijl het venster verborgen was | `setVisibleInterval` | `perf_code2_test.mjs` (lijst uitgebreid) |
| 19 | Geen manier om een flaky test te herkennen vóór hij in `KNOWN_FLAKES` belandt | `scripts/flaky_herhaal.mjs`: n keer draaien, STABIEL, FLAKY of KAPOT | `flaky_herhaal_test.mjs` |
| 20 | Geen aantoonbare grens aan wat een bewerkt save- of instellingenbestand kan aanrichten | fuzz op migratie, instellingen, benchmark en een simulatie van het laadscherm (nooit hangen, balk loopt niet terug) | `savemigrate_fuzz_test.mjs`, `settings_fuzz_test.mjs`, `benchmark_fuzz_test.mjs`, `loadlogic_fuzz_test.mjs` |

Samen-regel: de wijzigingen raken alleen lokale opslag en diagnose; in Samen spelen verandert niets aan snapshots of
beloningen. Een gast bewaart nog steeds alleen zijn eigen verdiensten (`saveGuestEarnings`); `veilig()` werkt niet voor de gast.

## Gevonden en gecontroleerd zonder fout

Migraties (30 fixtures, 1800 muteringen), instellingen laden (300 bestanden), de benchmark-statistiek en het laadscherm
bleken robuust; die tests blijven als regressienet staan. Alle `fetch`-ketens in `game/js` hebben een vangnet.

## Bewust niet

- Een roterende dagelijkse back-up van de save (nieuwe functie, kost opslag): de herstelkopie per plek en de back-up vóór
  een migratie dekken de gangbare gevallen.
- Een knop "Kopieer opslagdiagnose" los van het Foutrapport: de regels staan nu in het rapport zelf.
- `multiplayerhostwisselui.js` tikt nog elke 200 ms in de achtergrond: valt onder de Samen-epic en raakt de overdracht.

## Alleen in beeld of met een echte speler te bekijken

- Het Foutrapport met de nieuwe opslagregels (Instellingen, Foutrapport): staan ze leesbaar en kort?
- Echte volle opslag in Electron: weggaan van miniaturen zonder dat de savekaart kaal oogt.
- Lange speelsessie (uren) met de meetpunten uit `PERF-MEETPUNTEN-21-11.md`: geheugen en pollers.

## Testgezondheid

In `run_tests --quick` met drie banen vielen `undef_check`, `coop_coverage_audit` en `audio_ruis_test` op de tijdslimiet van 30 s
(machine druk door andere agents); `world_eigenaar`, `akte6_aaa_test` en `cine_pause_test` falen op code die deze branch niet raakt.
