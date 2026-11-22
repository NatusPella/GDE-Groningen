# Hertest-ronde 22-11: scenes, bewijspagina en sluiten

Doel: de 95 open issues met het label `hertest` (73) of `wacht-beeld` (25; drie hebben beide) in één Electron-run laten controleren en met één pagina door een mens laten beoordelen, zonder tientallen losse bestanden. De GitHub-issues blijven de enige bron (AGENTS.md, constitution 7): hier staat alleen hoe de ronde draait. Niets hiervan is al gedraaid: **alles is nog niet bekeken**.

## Onderdelen

| Bestand | Rol |
|---|---|
| `scripts/ui/hertest_scenes.js` | Eén definitie per issuenummer: soort, titel, wat te controleren, verwachte uitkomst, maten, opnamen, metingen en de scene zelf (`run`). Het bestand is een scriptbody voor `ui_shots` (Electron, wegwerpprofiel). |
| `scripts/hertest_pack.mjs` | Planner, scene-runner (`--draai`), bewijsverzamelaar en paginabouwer: bouwt **één** `hertest.html`. |
| `scripts/hertest_sluit.mjs` | Leest het JSON-resultaat van de pagina en sluit met `gh` de Opgelost-issues (dry-run standaard). |
| `scripts/hertest_test.mjs` | Pure node-test: alle issuenummers bestaan, verplichte velden, pagina- en JSON-generator met nepbewijs, sluitplan. |

## Soorten

- **image** (55): de scene zet de wereld klaar (plek, tijd, wanted, scherm, voertuig, duif, eerste persoon, camera) en maakt een of meer screenshots (`<maat>-h<nr>-<naam>.png`, 1280x720 en/of 1920x1080).
- **metric** (4): de scene meet getallen of tekst (heap, frametijd, taxi-opties) en logt die als `[hertest] {json}`; image-scenes kunnen er ook een paar loggen (tellers, tekst op het scherm, "is het scherm open").
- **question** (35): alleen een mens kan het beoordelen (geluid, humor, verhaalgevoel, spelgevoel, of een tweede venster nodig). Zonder scene; de pagina toont de vraag, de stappen en de keuzeknoppen. Een image-scene kan ook losse `questions` hebben voor wat de run niet kan zien.

Samen spelen: elke scene draait lokaal in één spel; scenes die een gast of hostwissel nodig hebben (#983, #1061, #1153, #1160) zijn vragen voor de testbank (`scripts/coop/testbank.mjs`).

## Draaiboek voor de coordinator

1. **Wachten op de perf-meting.** De run gebruikt Electron: nooit tegelijk met een exclusieve fps-meting of releasebouw (AGENTS.md, Agents). Eén Electron-instantie per maat, geen tweede agent erbij.
2. Op `main` of op de merge die getest wordt: `node scripts/hertest_pack.mjs` (zonder opties) toont het plan: 55 beelden en 4 metingen, verdeeld over twee maten (1920x1080 en 1280x720), en de 35 vragen.
3. **Draaien:** `node scripts/hertest_pack.mjs --draai --uit=<map>`. Per maat start `ui_shots.mjs` een Electron met een wegwerpprofiel (`--sizes`, `--scenes`, `--only` met de scenenummers van die maat, `--timeout=1500`); bewijs komt in `<map>/bewijs/<maat>/` (png's en `_log-<maat>.txt`). Een scene die kapot gaat stopt de rest niet: de pagina meldt hem als mislukt.
   - Alleen een paar issues: `--only=1177,1141`. De vroege scenes (#986, #1171: de openingsfilm) moeten in een run met een **nieuw spel** zitten; de film is er maar een keer en #1171 begint ongeveer vier seconden na #986.
   - Bewijs dat er al ligt opnieuw tot een pagina maken: `node scripts/hertest_pack.mjs --bewijs=<map>/bewijs --uit=<map>`.
4. **Pagina:** `<map>/hertest.html`. Beelden zitten standaard in de pagina (base64, een bestand; met 55 beelden van 1920x1080 kan dat tientallen MB zijn: gebruik `--beelden=verwijs` als dat te groot is, dan staan de png's er relatief naast). `--repo=<eigenaar/naam>` maakt de nummers links. De pagina wordt niet automatisch geopend.
5. **De eigenaar of een tester** kiest per issue Opgelost, Nog niet of Nieuw punt (met opmerking) en kopieert het JSON-resultaat (de knop bovenin of het tekstvak onderaan). De keuzes blijven in de browser staan (localStorage van de pagina, niet van het spel).
6. **Sluiten:** sla het JSON op als `resultaat.json`, dan:
   - `node scripts/hertest_sluit.mjs --bestand=resultaat.json` (dry-run: toont de `gh`-opdrachten);
   - `node scripts/hertest_sluit.mjs --bestand=resultaat.json --apply` (comment, labels `hertest` en `wacht-beeld` eraf, issue dicht; een al gesloten issue wordt overgeslagen).
   Nog niet: alleen een comment, het issue blijft open met zijn labels. Nieuw punt: een comment en een regel in de uitvoer; de coordinator maakt het nieuwe issue zelf (met label, impact en kosten).
7. Zet daarna het bord bij (kolom Klaar) en schrijf de stand als comment op het overkoepelende issue.

## Het JSON-resultaat

```json
{ "version": 1, "run": "hertest-22-11", "date": "2026-11-22",
  "results": [ { "issue": 1177, "outcome": "fixed", "note": "" },
               { "issue": 919, "outcome": "not-yet", "note": "dek bij Visvliet nog doorzichtig" } ] }
```

`outcome` is `fixed`, `not-yet` of `new-point`; bij de laatste twee is een opmerking verplicht. Ongeldig JSON of een onbekende uitkomst stopt `hertest_sluit` voordat er iets gebeurt.

## Grenzen (eerlijk)

- Plekken: de scenes gebruiken bekende punten uit `scripts/qa/hertest_beeld.page.js` (Visvliet, Zuidhorn, Warffum, Bourtange, Marum, Usquert) en het stadscentrum (`P(100, 77)`); een scene die een API mist, logt dat als notitie en de pagina toont het.
- De scene-code is **nog niet in Electron uitgevoerd**: de API-aanroepen zijn gecontroleerd tegen de bronnen, niet tegen een draaiend spel. De eerste echte run kan scenes laten falen; dat is dan bewijs voor de pagina, niet voor het issue.
- Perf-issues (#1039, #1046, #1016, #1015) blijven vragen voor de exclusieve perf-run (`docs/PERF-MEETPUNTEN-21-11.md`); #1040, #1052 en #1008 krijgen alleen een eerste puntmeting.
- Geluid, humor en spelgevoel worden nooit door de run beoordeeld.
