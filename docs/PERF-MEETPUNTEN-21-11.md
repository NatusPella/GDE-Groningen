# Meetpunten voor de eindsweep: laden, opwarmen, pop-in en haperingen (21-11-2026, #1008, #1016, #1046, #1052; #1032 en #1073 apart)

> Naslag voor de coördinator. Spec: [.specs-fire/standards/wereld.md](../.specs-fire/standards/wereld.md). Dit document verzint geen
> metingen: de code-oorzaken staan in [PERF-STREAM-SOEPEL-21-11.md](PERF-STREAM-SOEPEL-21-11.md), [PERF-HITCHES-21-11.md](PERF-HITCHES-21-11.md),
> [PERF-START-21-11.md](PERF-START-21-11.md), [PERF-TEGELSTREAM-21-11.md](PERF-TEGELSTREAM-21-11.md) en [PERF-BISECT-21-11.md](PERF-BISECT-21-11.md).
> Hier staat alleen wat de eindsweep in Electron moet meten, met het commando, de A-schakelaar, de maat en de grens waaraan een uitslag gaat tellen.
> `node scripts/meetpunten_laden_test.mjs` bewaakt dat elk commando, elke `?perfoff=`-schakelaar en elke `window.__`-meetingang hier nog bestaat.
> De grenzen zijn voorstellen uit de referentiecijfers hieronder, geen gemeten eisen: de eigenaar of de coördinator mag ze bijstellen.

## Regels voor elke meting

- Eén Electron tegelijk, de machine stil (CPU vóór de run onder 25%), dezelfde wereld en dezelfde Electron voor beide kanten.
- Mediaan van 3 afwisselende runs (A, B, A, B, A, B), Laag, Hoog en Ultra, 1280x720. Een uitslag binnen de run-op-run-spreiding (bootMs 31 tot 39 s bij dezelfde code) telt niet.
- Wat niet in beeld bekeken is, staat als "nog niet bekeken" in het issue; label `hertest` blijft staan tot een mens het ziet.

## Referentiecijfers (uit de stille nachtmeting, PERF-STIL-21-11.md)

| gem. fps (`--benchmark=1`) | 0.44.0 | 0.64.0 | main (eba31ad1e) | doel |
|---|---|---|---|---|
| Laag | 53,0 | 46,8 | 50,5 | terug op 0.44 (52 of meer) |
| Hoog | 48,5 | 42,1 | 44,9 | 48 of meer |
| Ultra | 42,7 | 34,4 | 38,9 | 42 of meer |

Eerste scenes op Hoog: Vismarkt en Noorderplantsoen halen in 0.54 ca. 37 en 47 fps en in 0.58 tot 0.64 8 en 9 fps (#1052). Doel: geen scene van de eerste minuut onder 30 fps.

## Per issue

| # | Wat | Commando of ingang | A-schakelaar | Maat en grens |
|---|---|---|---|---|
| 1052 | opwarmfase: stad streamt in de eerste minuut | `node scripts/perf/run.mjs` en de ingebouwde `--benchmark=1`; `window.__tileWindows` per plaatsingsvenster | `?perfoff=planner` | gem. fps per scene; tegelstap onder 1 s in de eerste 30 s; geen longtask boven 500 ms in de eerste minuut; elk venster in `__tileWindows` met `add` onder 150 ms |
| 1052 | plaatsingsvensters na een lading en bij een lopende activiteit zijn urgent (noteRestore, activiteitssonde) | de gate-verhaaltest (discgolf, pitch and putt, zwembad, koe) en een lading van een save met een faciliteit binnen 400 m | n.v.t. | de faciliteit staat er binnen 6 s na het laden en na de opdrachtstart; niets wordt vastgehouden door een cutscene |
| 1008 | haperingen bij nieuwe stadsdelen, lage fps in druk gebied | `node scripts/qa/popin.mjs` routes `foot`, `a7`, `heli` (30 s, 40 s, 25 s) | `?perfoff=planner` | frametijd p50, p95, p99; frames boven 33 ms en 50 ms; `window.__streamPlanner` (`stats()` per klasse: ms, eenheden, overschrijdingen, schuld); norm 33,5 ms p95 op Hoog |
| 1008 | longtask rond 28 s en de 6,5 s-uitschieter | `GDE_DIAG=1 node scripts/perf/filmwarm.mjs` met `scripts/perf/startdiag.page.js` | `?perfoff=compileklein`, `?perfoff=filmlicht` | geen longtask boven 1 s; de lijst nieuwe programma's na de start (`window.__programWatch`) korter dan 30 |
| 1046 | stilstand van 10 tot 57 s bij Spel starten | `node scripts/perf/filmwarm.mjs` (bootMs, programma's, frames na de start), `window.__loadMarks` | `?perfoff=compileporties`, `?perfoff=filmlicht` | bootMs onder 35 s bij een nieuw spel; frames boven 100 ms in de eerste 60 s onder 20; langste frame onder 500 ms |
| 1046 | shaders na de start | `node scripts/perf/programs.mjs` | `?perfoff=linkwacht`, `?perfoff=linkvroeg` | aantal programma's en compilatietijd van gebouwen- en glasmaterialen; geen nieuw programma bij het eerste setbeeld (keuken, loket, kantoor, kamers) |
| 1016 | pop-in van gebouwen, bomen, props, verkeer, wegen en gras | `node scripts/qa/popin.mjs` (afstand en frequentie per categorie) | `?perfoff=ringuitzondering`, `?perfoff=kozijnfade`, `?perfoff=ringsnelheid` | de detailring (`buildingDetailR`) in minder dan 2% van de frames onder 90% van de tekenafstand; stills op 5 en 30 m/s van een straat met kale gebouwen |
| 1016 | ramen dichtbij op de Grote Markt | teleport naar de Grote Markt, daarna stills op 5, 15 en 30 m | `?perfoff=kozijnfade` | geen kale gevel binnen 40 m; extra bouwtijd van nabije gebouwen hoogstens 4 per frame boven het budget |
| 1016 | sprong en rit | teleport, taxi (3 km), trein (Groningen naar Delfzijl), heli | n.v.t. | frames boven 50 ms in de eerste 3 s onder 5; tijd tot de eerste volledige ring onder 6 s; met en zonder `warmRoute` |
| 1016 | geheugen bij een lange rit | `node scripts/perf/streamdrive.mjs` (20 km) | n.v.t. | heappiek en `endHeapMB` niet hoger dan vóór het vertraagd opruimen |

## Laden en stabiliteit (een bekijkpunt, geen fps-meting)

- **#1073:** laad een save met een kapot veld laat in de volgorde (bijvoorbeeld `shops` of `thuis` als tekst) en kijk of de wereld terugkeert naar de vorige stand, de vorige slot ongemoeid blijft en bij een kapotte terugval de melding over het mislukte laden verschijnt zonder dat daarna een autosave schrijft. De pure test is `node scripts/laadterugval_test.mjs`.
- **#1032:** `WEBGL_lose_context.loseContext()` en `restoreContext()` in de console van een Electron-run; let op de donkere sluier (is hij zichtbaar), de omgevingskaart (reflecties terug na het herstel) en Ctrl+Shift+G (tellers). De eerdere run toonde alleen de DOM-waarden, geen beeld.
- **#1069:** laadscherm op een traag venster: geen Enter-prompt, een vloeiende balk, bij meer dan 8 s een eerlijke statusregel (`node scripts/loadgate_test.mjs`).

## Samen spelen

Alles hier is lokaal per speler (streaming, planner, shaders, plaatsingsvensters). Een gast ziet geen verschil in wat gedeeld is; beloning en voortgang zijn niet geraakt. Een Samen-run met vier vensters meet de start per speler: dezelfde maat, per venster.
