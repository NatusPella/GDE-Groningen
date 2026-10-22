# Cijferblad (gemaakt 2026-10-21)

Alle cijfers komen uit `node scripts/stats/schaal.mjs`; elk cijfer heeft zijn bron. Een cijfer met een voorbehoud staat onder "Let op".

## git

| Cijfer | Waarde | Eenheid | Bron | Let op |
|---|---:|---|---|---|
| Commits | 3.716 | commits | git rev-list --count HEAD |  |
| Eerste commit | 2026-09-18 | datum | git log (--format=%cI) |  |
| Laatste commit (op deze checkout) | 2026-10-21 | datum | git log (--format=%cI) |  |
| Kalenderdagen van eerste tot laatste commit | 34 | dagen | git log (--format=%cI) |  |
| Dagen met minstens één commit | 19 | dagen | git log (--format=%cI) |  |
| Gemiddeld aantal commits per actieve dag | 195,6 | commits | commits / actieve dagen |  |
| Drukste dag (2026-10-18) | 1.101 | commits | git log (--format=%cI) |  |
| Commits tussen 00:00 en 06:00 (lokale tijd van de commit) | 603 | commits | git log (--format=%cI) | de tijdstippen zijn de commit-tijden van de auteur; zegt niets over wie er wakker was |
| Merge-commits | 931 | commits | git log --merges |  |
| Verschillende git-identiteiten als auteur | 2 | identiteiten | git log (--format=%cI) | namen worden bewust niet bewaard |
| Commits met een AI als medeauteur in de voetregel | 2.810 | commits | Co-Authored-By: Claude in de commitberichten |  |
| Verschillende AI-modelnamen in die voetregels | 3 | modellen | idem | per naam: Claude Sonnet 5.5 1930; Claude Opus 5.5 850; Claude Sonnet 5 30 |
| Commits die een issue noemen (Closes/Refs #n) | 1.692 | commits | regex op de commitberichten |  |
| Verschillende issues genoemd in commitberichten | 352 | issues | idem |  |
| Regels programmacode ooit toegevoegd (over alle commits) | 355.707 | regels | git log --numstat, alleen code-extensies | bruto: een regel die vaak is herschreven telt elke keer mee |
| Regels programmacode ooit verwijderd | 67.874 | regels | idem | zie hierboven |
| Bestandswijzigingen in programmacode (som over commits) | 9.723 | wijzigingen | idem |  |

## sessies

| Cijfer | Waarde | Eenheid | Bron | Let op |
|---|---:|---|---|---|
| Verschillende sessie-branches (claude/… en worktree-agent-…) die ooit bestonden of zijn gemerged | 394 | branches | git for-each-ref + kopteksten van merge-commits | ondergrens: een sessie die op een bestaande branch werkte, een opgeruimde en nooit gemergede branch of een oude branchnaam telt niet mee |
| Daarvan gemerged in de hoofdlijn | 365 | branches | git log --merges |  |
| Branches in deze checkout (lokaal en op afstand) | 255 | branches | git for-each-ref |  |
| Git-werkbomen (parallelle werkmappen) nu | 76 | werkbomen | git worktree list | momentopname; opgeruimde werkbomen zijn weg |
| Git-tags (releases) | 48 | tags | git tag |  |

## code

| Cijfer | Waarde | Eenheid | Bron | Let op |
|---|---:|---|---|---|
| Bestanden in git | 5.070 | bestanden | git ls-files |  |
| JavaScript-bestanden (.js, .mjs, .cjs) | 1.497 | bestanden | git ls-files |  |
| JavaScript-modules van het spel zelf (game/js/*.js) | 715 | modules | git ls-files game/js |  |
| Regels JavaScript (alles) | 280.154 | regels | regels van alle .js/.mjs/.cjs in git (incl. lege regels en commentaar) |  |
| Regels programmacode (JS, Python, HTML, CSS, shell, Java, Gradle) | 288.172 | regels | som van de talen hieronder, zonder Markdown en data |  |
| Regels documentatie (Markdown) | 44.866 | regels | git ls-files *.md |  |
| Regels JSON-data in git | 92.642 | regels | git ls-files *.json | gegenereerde en handgemaakte data; geen programmacode |

## code_per_taal

| Cijfer | Waarde | Eenheid | Bron | Let op |
|---|---:|---|---|---|
| JavaScript: 1497 bestanden | 280.154 | regels | git ls-files + regels tellen | 262309 niet-lege regels |
| JSON (data): 91 bestanden | 92.642 | regels | git ls-files + regels tellen | 92642 niet-lege regels |
| Markdown: 112 bestanden | 44.866 | regels | git ls-files + regels tellen | 37486 niet-lege regels |
| Python: 30 bestanden | 4.335 | regels | git ls-files + regels tellen | 3818 niet-lege regels |
| CSS: 12 bestanden | 2.500 | regels | git ls-files + regels tellen | 2374 niet-lege regels |
| YAML: 9 bestanden | 446 | regels | git ls-files + regels tellen | 402 niet-lege regels |
| Tekst: 8 bestanden | 440 | regels | git ls-files + regels tellen | 351 niet-lege regels |
| Shell: 10 bestanden | 410 | regels | git ls-files + regels tellen | 391 niet-lege regels |
| XML: 10 bestanden | 314 | regels | git ls-files + regels tellen | 304 niet-lege regels |
| HTML: 2 bestanden | 232 | regels | git ls-files + regels tellen | 225 niet-lege regels |

## code_per_soort

| Cijfer | Waarde | Eenheid | Bron | Let op |
|---|---:|---|---|---|
| Spelcode (game/js): 715 bestanden | 196.934 | regels | git ls-files + regels tellen | 183470 niet-lege regels |
| Gereedschap en audits (scripts/, rest): 326 bestanden | 44.684 | regels | git ls-files + regels tellen | 42904 niet-lege regels |
| Testcode (*_test.mjs): 424 bestanden | 35.246 | regels | git ls-files + regels tellen | 32829 niet-lege regels |
| Desktop-app (Electron): 15 bestanden | 1.694 | regels | git ls-files + regels tellen | 1604 niet-lege regels |
| Android: 10 bestanden | 876 | regels | git ls-files + regels tellen | 830 niet-lege regels |
| Webbouw: 4 bestanden | 473 | regels | git ls-files + regels tellen | 442 niet-lege regels |
| Overig JavaScript: 3 bestanden | 247 | regels | git ls-files + regels tellen | 230 niet-lege regels |

## tests

| Cijfer | Waarde | Eenheid | Bron | Let op |
|---|---:|---|---|---|
| Testscripts (scripts/**/*_test.mjs) | 424 | scripts | git ls-files |  |
| Audit- en probe-scripts (*_audit.mjs en scripts in een audits-map) | 36 | scripts | git ls-files |  |
| Controle-aanroepen in de testscripts (ok(, assert(, check(, eq(, expect() | 9.297 | aanroepen | regex op de bronregels van de *_test.mjs | statische telling van aanroepen in de code, geen uitgevoerde controles: een controle in een lus draait vaker |
| Volledige testrondes (test_all) met rapport op deze machine | 3 | rondes | tijdelijke map gde-testall | alleen wat nog op schijf staat; het tijdelijke rapportmapje wordt niet bewaard |
| Items in het laatste testrapport (20261021-191603) | 422 | items | gde-testall/20261021-191603/rapport.json |  |
| Status PASS (20261021-191603) | 378 | items | idem |  |
| Status FAIL (20261021-191603) | 9 | items | idem |  |
| Status SKIP (20261021-191603) | 28 | items | idem |  |
| Status TIMEOUT (20261021-191603) | 7 | items | idem |  |
| Duur van die ronde (20261021-191603) | 27 | minuten | gde-testall/20261021-191603/rapport.json |  |

## issues

| Cijfer | Waarde | Eenheid | Bron | Let op |
|---|---:|---|---|---|
| Issues (geopend, open en gesloten) | 378 | issues | gh issue list --state all | pull requests zijn hier niet bij |
| Gesloten | 338 | issues | gh issue list --state all |  |
| Nog open | 40 | issues | gh issue list --state all |  |
| Bugs (label bug) | 188 | issues | gh issue list --state all |  |
| Bugs die gesloten zijn | 179 | issues | gh issue list --state all |  |
| Wensen (label wens) | 190 | issues | gh issue list --state all |  |
| Wensen die gesloten zijn | 159 | issues | gh issue list --state all |  |
| Label impact-zeer-hoog | 19 | issues | gh issue list --state all |  |
| Label impact-hoog | 112 | issues | gh issue list --state all |  |
| Label impact-midden | 163 | issues | gh issue list --state all |  |
| Label impact-laag | 84 | issues | gh issue list --state all |  |
| Label kosten-S | 190 | issues | gh issue list --state all |  |
| Label kosten-M | 129 | issues | gh issue list --state all |  |
| Label kosten-L | 59 | issues | gh issue list --state all |  |
| Wachten op de eigenaar (label eigenaar) | 22 | issues | gh issue list --state all |  |
| Mediane tijd van openen tot sluiten | 19,1 | uur | gh issue list --state all |  |
| Mijlpalen (epics) | 7 | mijlpalen | gh api milestones |  |
| Pull requests | 1 | pull requests | gh pr list --state all | het project merget vooral direct via branches; weinig PR's is normaal |

## releases

| Cijfer | Waarde | Eenheid | Bron | Let op |
|---|---:|---|---|---|
| Releases op GitHub | 48 | releases | gh release list |  |
| Daarvan pre-releases | 48 | releases | gh release list |  |
| Eerste release | v0.0.0 op 2026-09-25 | tag | gh release list |  |
| Laatste release | v0.38.1 op 2026-10-21 | tag | gh release list |  |
| Releases van 0.35.0 tot en met de laatste | 6 | releases | gh release list |  |
| Dagen tussen eerste en laatste release | 26 | dagen | gh release list |  |
| Versiesecties in CHANGELOG.md | 48 | secties | CHANGELOG.md |  |

## wereld

| Cijfer | Waarde | Eenheid | Bron | Let op |
|---|---:|---|---|---|
| Wereldbouw waaruit dit komt | 2026-10-18 | datum | game/world/index-provincie.json (tijdstempel) | een bouw van de dag genoemd; latere wijzigingen aan de wereldbouw zitten er niet in |
| Kaarttegels van 1 × 1 km | 2.901 | tegels | game/world/index-provincie.json + tegels (.gdp) |  |
| Tegelpakketten (.gdp) | 69 | bestanden | game/world/index-provincie.json + tegels (.gdp) |  |
| Grootte van alle tegelpakketten | 44,1 | MB | game/world/index-provincie.json + tegels (.gdp) |  |
| Speelgebied: oppervlak van de provinciegrens (spelcoördinaten, meters) | 2.955 | km² | oppervlakte (formule van Gauss) van global.outline in index-provincie.json | het gebied binnen de grens, dus ook water; docs/PROVINCIE-PLAN.md noemt ~2.960 km² totaal en ~2.330 km² land |
| Gebouwen (unieke objecten in de tegels) | 387.530 | gebouwen | game/world/index-provincie.json + tegels (.gdp) | unieke gid; gelijk aan index stats.buildings |
| Daarvan met hoogte uit de BAG/3D BAG (hsrc = 3dbag) | 346.058 | gebouwen | game/world/index-provincie.json + tegels (.gdp) |  |
| Wegen- en padstukken (unieke OSM-ways met eigen gid) | 97.839 | stukken | game/world/index-provincie.json + tegels (.gdp) |  |
| Wegen, fiets- en voetpaden bij elkaar | 12.344 | km | game/world/index-provincie.json + tegels (.gdp) | som van de lengte van de polylijnen; een weg met twee rijbanen telt per rijbaan |
| Daarvan wegen waar een auto op mag (normal, minor, major) | 9.643 | km | game/world/index-provincie.json + tegels (.gdp) | categorienamen van de tegelbouw |
| Brugstukken (wegen met bridge = true) | 2.687 | stukken | game/world/index-provincie.json + tegels (.gdp) | OSM-ways met het brugkenmerk; een brug kan uit meerdere stukken bestaan |
| Totale lengte van die brugstukken | 56,9 | km | game/world/index-provincie.json + tegels (.gdp) |  |
| Wateroppervlakken en waterlopen (polygonen) | 22.160 | objecten | game/world/index-provincie.json + tegels (.gdp) |  |
| Groenvlakken (park, bos, weide) | 103.479 | vlakken | game/world/index-provincie.json + tegels (.gdp) |  |
| Bomen | 956.141 | bomen | game/world/index-provincie.json + tegels (.gdp) | rijen in de tegels; een rij kan een boom of een groepje zijn |
| Spoor | 344 | km | game/world/index-provincie.json + tegels (.gdp) |  |
| Straatmeubilair (lantaarns, bankjes, borden, verkeerslichten, ...) | 26.794 | objecten | game/world/index-provincie.json + tegels (.gdp) |  |
| Treinstations | 30 | stations | index-provincie.json global.stations |  |
| Treinlijnen (met de stad als beginpunt) | 10 | lijnen | index-provincie.json global.routes |  |
| Sluizen en keersluizen (OSM, in de tegelindex) | 122 | sluizen | index-provincie.json global.locks | inclusief kleine sluisjes en gemalen met een sluisfunctie in OSM |
| Benoemde plaatsen (index global.places) | 802 | plaatsen | index-provincie.json global.places |  |
| Steden | 1 | plaatsen | places kind city |  |
| Stadjes en kleine steden (kind town) | 14 | plaatsen | places kind town |  |
| Dorpen (kind village) | 190 | plaatsen | places kind village |  |
| Gehuchten (kind hamlet) | 399 | plaatsen | places kind hamlet |  |
| Wijken en buurten (kind neighbourhood, quarter, suburb) | 143 | plaatsen | places |  |
| Buslijn-routes (OSM-relaties, per richting) | 252 | routes | game/world/provincie-bus.json |  |
| Verschillende buslijnnummers | 98 | lijnnummers | game/world/provincie-bus.json (ref) |  |
| Sluizen met eigen bediening in het spel (game/sluizen.json) | 62 | sluizen | game/sluizen.json |  |

## wereld_wegen

| Cijfer | Waarde | Eenheid | Bron | Let op |
|---|---:|---|---|---|
| Wegcategorie normal | 5.107 | km | game/world/index-provincie.json + tegels (.gdp) |  |
| Wegcategorie minor | 3.378 | km | game/world/index-provincie.json + tegels (.gdp) |  |
| Wegcategorie cycle | 1.614 | km | game/world/index-provincie.json + tegels (.gdp) |  |
| Wegcategorie major | 1.159 | km | game/world/index-provincie.json + tegels (.gdp) |  |
| Wegcategorie foot | 1.087 | km | game/world/index-provincie.json + tegels (.gdp) |  |

## inhoud

| Cijfer | Waarde | Eenheid | Bron | Let op |
|---|---:|---|---|---|
| Verhaalmissies (MISSION_IDS) | 31 | missies | game/js/storyarc.js |  |
| Aktes van het verhaal (PARTS) | 5 | aktes | game/js/storyarc.js |  |
| Stappen in het verhaal (STEPS) | 32 | stappen | game/js/storyarc.js |  |
| Scènes in het verhaalscript | 185 | scènes | game/storydata/script.json |  |
| Sprekende personages in het script | 37 | sprekers | game/storydata/script.json |  |
| Regels dialoog in het verhaalscript | 1.337 | regels | game/storydata/script.json (scenes[].lines) |  |
| Woorden dialoog in het verhaalscript | 11.351 | woorden | idem | splitsen op spaties |
| Regie-aanwijzingen in het script | 137 | aanwijzingen | idem |  |
| Geregisseerde cutscenes (SPECS + MORE_SPECS, na het laden van akte 1 t/m 4) | 76 | cutscenes | game/js/cutscenes_akte1..4.js |  |
| Bijbanen en zijmissies (SIDE_JOBS) | 39 | bijbanen | game/js/sidejobs.js |  |
| Vrijetijdsactiviteiten en minigames (legenda van activities.js) | 17 | activiteiten | game/js/activities.js | zonder de pg_*-minigames van de verhaalmissies |
| Prestaties (trofeeën) | 187 | prestaties | game/js/achievements.js |  |
| Voertuigmodellen in het voertuigregister | 28 | modellen | game/js/vehicleregister.js | per klasse: auto 19, tweewieler 3, boot 1, lucht 1, attractie 2, dier 1, ov 1 |
| Diersoorten in het dierenregister | 13 | soorten | game/js/dierenregister.js | koe, schaap, paard, gans, eend, zwaan, meeuw, reiger, vis, zeehond, duif, kat, hond |
| Minigames in de verhaalmissies (bestanden pg_*.js) | 6 | minigames | game/js/pg_*.js |  |
| Bijbaanmodules (bestanden sidejob_*.js) | 17 | modules | game/js/sidejob_*.js |  |
| Stemopnames (game/audio/voicelines) | 3.057 | bestanden | game/audio/voicelines | bestanden, geen zinnen; alle stemmen zijn met AI gemaakt (README) |
| Geluidsbestanden in game/audio (stemmen, muziek, radio, nieuws) | 3.148 | bestanden | game/audio |  |
| Grootte van game/audio | 156 | MB | game/audio |  |
| Muziektracks in de radiolijst (gmusic/manifest.json) | 22 | tracks | game/audio/gmusic/manifest.json | tracks met AI gemaakt (README); meer dan 3 minuten per track is niet gemeten |
| Muziekbestanden (gmusic + scenario + theme) | 29 | bestanden | game/audio/{gmusic,scenario,theme} |  |
| Talen van het spel (tekst) | 1 | taal | AGENTS.md (constitution punt 1) | alleen Nederlands; de stemmen praten Gronings, de ondertitels zijn Nederlands |
| Los 3D-model als bestand (.glb) | 1 | modellen | game/models | bijna alle voertuigen, gebouwen en figuren worden met code gegenereerd (procedureel), niet gemodelleerd |
| Doelplatformen met eigen map (desktop, web, android) | 3 | platformen | desktop, web, android | builds: macOS, Windows en (soms) Linux; webversie en Android in ontwikkeling (README) |

## inhoud_audio

| Cijfer | Waarde | Eenheid | Bron | Let op |
|---|---:|---|---|---|
| game/audio/gmusic | 26 | bestanden | game/audio/gmusic |  |
| game/audio/nieuws | 20 | bestanden | game/audio/nieuws |  |
| game/audio/npc | 30 | bestanden | game/audio/npc |  |
| game/audio/police | 12 | bestanden | game/audio/police |  |
| game/audio/scenario | 2 | bestanden | game/audio/scenario |  |
| game/audio/theme | 1 | bestanden | game/audio/theme |  |
