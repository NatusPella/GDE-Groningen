# Wereldkleur: verificatie in de grote Electron-sweep (21-11)

Draaiboek voor de echte beoordeling van de wereldkleur (zie [WERELDKLEUR-21-11.md](WERELDKLEUR-21-11.md)). Alles hieronder is **nog niet bekeken**: de bouw had geen Electron. De benaderde voor-en-na-beelden in [beeld-21-11/wereldkleur-grading/](beeld-21-11/wereldkleur-grading/) zijn geen bewijs.

## 1. Opzet

- Eén Electron-instantie per run, eigen profiel en uitvoermap (wegwerpprofiel; poort 9000 en de geïnstalleerde app blijven onaangeroerd). Een beeldrun mag naast een tweede; **de perf-A/B (§4) draait exclusief**.
- De stand per run zetten met een wegwerpprofiel waarin `gde-settings` `"worldColor": "uit" | "subtiel" | "drukwerk"` bevat (de materiaalkleuren worden bij de start gelezen), of voor alleen de materiaalmenging `--url-flags=dswereld=0|0.4|0.65`. Houd de overige instellingen gelijk: zelfde voorinstelling (Ultra voor de beelden, ook Midden en Laag voor §3), zelfde resolutie 1280x720, zelfde seed of NPC-vrije scène waar het kan.
- Kalender en tijd vastzetten (zie het geheugen "Beeldscenes in een worktree met junctions": tijdlijn bevriezen). Altijd zomer.

## 2. Schermen, tijden en weer om te vergelijken

Per cel drie beelden: Uit, Subtiel, Drukwerk. Plekken: Grote Markt (overdag), binnenstad, Ommeland (polder), haven en water, woonwijk met fietspad, kermis, snelweg of ringweg, het Hoofdstation (gele en rode accenten).

| Tijd | Weer |
|---|---|
| 07:30 ochtend | helder |
| 13:00 middag | helder, bewolkt, mist, regenbui, onweer |
| 19:30 gouden uur (zon rond 14 tot 6 graden) | helder |
| 21:30 avond/schemering | helder |
| 00:30 nacht | helder, regen |

Minimaal: 8 plekken x (middag helder) x 3 standen = 24 beelden, daarbovenop de tijd- en weerrijen op twee vaste plekken (Grote Markt en Ommeland).

**Wat te beoordelen per beeld (ja of nee, met een zin):**
1. Is het verschil tussen Uit en Subtiel naast elkaar te zien en zonder naast elkaar bijna niet? (Subtiel hoort subtiel te zijn.)
2. Voelt Drukwerk als papier en inkt, en niet als een filter over alles? Is het raster in de schaduw een hint en geen patroon dat je afleidt? Is de korrel te zien op een egaal vlak (muur, lucht) zonder stoor?
3. Leesbaarheid: wegrand en stoep, fietspad, water tegen oever, trottoirband, gevaar (voertuigen, politie), de doelmarkering en het geel van 'volg dit', borden, de minikaart.
4. Is de wereld niet te geel, te bruin, te grijs of te plat geworden? Schaduw nog diepte? Horizon en mist crème zonder vlekken?
5. Kleurverschil tussen tegels en LOD-niveaus (naden in kleur bij het loopen op de rand van een tegel, bij de overgang van dichtbij naar ver)?
6. Regen en onweer: warm papier in plaats van koud grijs? Mist papierachtig zonder te vlekken?
7. Nacht: onveranderd van sfeer? Geen raster; alleen een zachte korrel.

## 3. Schakelaar-vergelijking

| Test | Verwachting |
|---|---|
| Instellingen, Beeld, Wereldkleur wisselen in het spel | licht, mist, zenit en tinten volgen meteen; gevels, gras en straat pas na herstart (de rij zegt het) |
| Laag | geen verschil in licht tussen Uit en Subtiel; alleen de materiaalkleuren (na herstart) |
| Midden | licht en tint zonder raster of korrel |
| Hoog en Ultra | + raster en korrel (zoom op een schaduw en een muur) |
| Rustig drukwerk aan | geen raster en geen korrel; Drukwerk gedraagt zich als Subtiel |
| Kleurenblind aan (drie modi) | geen demping; raster uit; markers, routes en gevaar goed te onderscheiden |
| Beweging beperken aan | niets verandert (het raster en de korrel staan al stil) |
| Samen spelen met twee instanties, elk een andere stand | elk beeld volgt zijn eigen speler; niets gesynchroniseerd; geen foutmelding |
| Cutscenes en de intro-montage | de eigen grading van de cutscene wint; geen dubbele tint |
| Fotomodus, trailer-look (`postfx.look`) en heli-grade | de filters werken nog; geen onverwachte kleurzweem door de extra tint |
| Een oud `gde-settings` zonder `worldColor` | start op Subtiel zonder fout |
| Ctrl+Shift+G (gpu-info) | geen waarschuwing |

## 4. Perf A/B-draaiboek (exclusief)

1. Schijf vrij, geen andere Electron of zware taak, stroom aan, vaste resolutie en voorinstelling per reeks. Meet met de bestaande perfmeting (`scripts/perf/`, zie [PERF-BESLUITEN.md](PERF-BESLUITEN.md) en de laatste `PERF-METING-*.md`) op dezelfde route en kloktijd.
2. Voor elke voorinstelling (Laag, Midden, Hoog, Ultra) en elke stand (Uit, Subtiel, Drukwerk): 3 runs per cel, gepaard (A/B/A/B), mediaan en p95 van de frametijd en het aantal frames boven 33 ms; gedeelde route met één kloktijd 13:00 helder, één 19:30, één regen.
3. Beslisregel: de Uit-stand is de controle (nieuwe code, tak overgeslagen). Subtiel op Laag en Midden mag niet meer dan de ruis kosten (mediaan binnen 0,2 ms, p95 binnen 0,5 ms). Hoog en Ultra: Drukwerk tegenover Uit hoogstens 0,3 ms op de mediaan; meer dan 0,3 ms en de raster- en korreltak wordt op Ultra alleen bij Drukwerk aangezet (een eenvoudige wijziging in `worldgrade.js gradeParams`).
4. Meld de GPU, de resolutie, de voorinstelling, de drie getallen per cel en de ruis (spreiding tussen de drie runs).

## 5. Wat een gebrek is (terugdraaien of bijstellen)

- Een kleur van een weg, markering of marker die slechter te lezen is dan bij Uit: de rol of het gewicht van die kleur in `worldpalette.js` aanpassen, niet de hele stand.
- Zichtbaar raster op een muur of lucht in daglicht (moet alleen in de donkerste schaduwen zichtbaar zijn): `GRADE_BASE.raster` of het masker verlagen.
- Een geel- of roodzweem op wit: de papier-tint (`GRADE_DAYPARTS.papier`) verlagen.
- Een frametijdregressie boven de grenzen van §4: de tak op Ultra beperken tot Drukwerk.
- Een kleurverschil tussen tegel of LOD: onverwacht (de functie is puur); meld de tegel en de kleur.

Na de sweep: vul het resultaat in het issue en verwijder de regel "nog niet bekeken" uit de changelog als de beelden akkoord zijn.
