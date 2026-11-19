# De proefspeler: playtesten zonder menselijke input

Playtesten door mensen is de bottleneck. De proefspeler is de Spelbot (#186) met een menselijk profiel (`--mens`) en een bundel per missie die een AI-reviewer met beeld kan lezen. Een run levert zonder menselijke input een bruikbaar playtestrapport per missie op. Het vult de mensen niet op: smaak, humor, geluid en gevoel beoordeelt hij niet (zie "Wat hij wel en niet vangt").

Onderdelen (alle in `scripts/bot/`, de logica is puur en droog getest):

| Bestand | Rol |
| --- | --- |
| `mens.mjs` | reactietijd, stuur- en richtruis, pogingen, camera-wiskunde (waypoint op het scherm, afgedekt door een gebouw), stilstandspreiding, het oogmoment |
| `bot.page.js` | de bestaande bot, met een `--mens`-laag (opt-in: zonder `--mens` is er niets veranderd) |
| `run.mjs` | start één Electron-run; kent `--mens`, `--seed`, `--pogingen` |
| `proefbundel.mjs` | uit `events.jsonl`: `samenvatting.json`, `index.md`, `review-brief.md`, faalratio over seeds |
| `proef.mjs` | de driver: een lijst missies en seeds (of een variatiematrix), roept `run.mjs` aan, bouwt de bundels en de triage |
| `detect/*.mjs` | de detectoren (a tot en met h), pure functies op `events.jsonl`, DOM-snapshots en PNG's; `detect/page.js` is hun page-kant en `detect/prelude.mjs` plakt ze in de pagina |
| `voortgang.mjs` | tijd per fase, stilstand, dode tijd, pogingen, schade, geld, faalheatmap en balans per missie |
| `matrix.mjs` | de variatiematrix (rook, pairwise, volledig), de toestandsvergelijking en het chaos-oordeel |
| `blind.mjs` | het blinde 'denken-hardop'-protocol, de persona's, de duidelijkheidsscore en de tegenlezer |
| `triage.mjs` | handtekening, ernst, ontdubbeling, repro-commando en issue-voorstellen; `goud.mjs` de gouden beelden; `proefanalyse.mjs` plakt het aan elkaar |

Tests (geen Electron): `node scripts/mens_test.mjs`, `node scripts/proefbundel_test.mjs`, `node scripts/proef_detect_test.mjs` (detectoren op gefabriceerde DOM-snapshots, PNG's en logregels) en `node scripts/proef_triage_test.mjs` (voortgang, matrix, blind, triage, goud en de hele keten).

## Het menselijke profiel (`--mens`)

- **Reactietijd:** een nieuwe situatie (ander doel, andere fase, gesprek of dialoog, filmpje begint of eindigt) krijgt 250 tot 400 ms speltijd (seed-gestuurd, vaker midden dan rand) voordat de bot reageert. De stick blijft ondertussen staan zoals hij was.
- **Ruis:** een langzaam wandelende afwijking (geen witte ruis; ca. 1,4 s geheugen) op het stuur in een voertuig (sigma 0,07) en op de looprichting te voet (0,06 rad). Stilstaan blijft stilstaan.
- **Geen perfecte route:** de bot volgt eerst de route die het spel de speler zelf toont (HUD-lijn en minimap, `routing.getActiveRoute`) in plaats van de eigen routeplanner (`route`-gebeurtenis: `src: "hud"`). Is er geen HUD-lijn naar het doel, dan valt hij terug op de planner; dat is dan zelf een vraag: kon een speler hier de weg vinden?
- **Nooit een cheat:** `bot.page.js` vervangt elke `B.cheat.*` door een weigering (`cheat-geweigerd` in `events.jsonl`). Uit zijn ook: de startplek-teleport van M01, de win-cheat na mislukken, `--invuln` en `--skip-stages` (dat is een cheat). De sprong naar de missie van `--mode=missions` (`__story.jump`, gelogd als `setup`) is hoe de missie start, net als in het F9-paneel; hij is geen cheat in de run zelf. De test `bot_cheatvrij_test` en `mens_test` bewaken dit.
- **Vast:** loopt hij vast, dan probeert hij de gewone zijstappen en omwegen (nudge, `zijstap`, `omweg`, `voertuigomweg`). Helpt dat niet, dan logt hij `stuck` (of `vast`) en geeft hij op zodra de tijd in dit pad het wachtbudget (`--wait`, standaard 45 s) haalt: `opgegeven` in het logboek, uitkomst `opgegeven`.
- **Pogingen:** `--pogingen=<n>` (standaard 3): na zoveel mislukkingen van de missie (de teller van het spel, `story.fails`) geeft hij op in plaats van een cheat te pakken.
- **Seeds:** `--seed=<n>` stuurt reactietijd en ruis; meerdere seeds van dezelfde missie geven een faalratio. De wereld zelf (verkeer, voetgangers) is niet volledig seed-vast, dus twee runs met dezelfde seed kunnen toch verschillen.

## Waarneming: de oogmomenten

Een oogmoment is een beeld (`<stap>-oogNN-<reden>`) plus een regel `{"type":"oog", ...}` in `events.jsonl`. Momenten: `begin` (stap begint), `start` (missie start), `doel` (doelwissel), `mislukt`, `slagen` (de situatie meteen na de stap), `filmpje` (1,2 s na het begin van een filmpje), `vast`, `stil` (8 s niets gedaan) en `opgegeven`. Per reden hooguit om de 4 s speltijd. De losse bot-beelden (begin, start, mislukt, filmpje) vervallen bij `--mens`; de reeks van `--watch` (`szene`) en het eindbeeld blijven en komen als "beeld" in de index.

Wat de momentopname bevat (een zuinige set, alles uit `status()` plus drie metingen):

- `doelTekst` (HUD), `doelNaam`, `afstand` tot het doel, `fase`, `stap`
- `zicht`: valt het doelwaypoint op het scherm (`opScherm`, met kant bij buiten beeld), ligt het niet achter de camera, en staat er een gebouw tussen (`afgedekt`; een lijn van camera naar doel afgetast met `buildingAt`, dakhoogte `b.h * 3,1 m`)
- `ondertitel` en `dialoog` (tekst en opties), `berichten` (HUD-meldingen)
- `kaart`: de uitleg- of contexthint die in beeld staat en hoeveel seconden al
- `voertuig` (soort, schade-stand, snelheid), `gezondheid`, `gezocht`, `geld`, `mislukt`
- `frameMs` (laatste frametijd) en `stilS` (hoe lang geen beweging, geen filmpje, geen gesprek) met `spreiding` (standaardafwijking van de positie over 10 s)

Beperkingen van de waarneming: `zicht` is een benadering (geen echte raycast tegen de meshes: bomen, kranen en hekken tellen niet mee, en het doel is een punt op 1,5 m, niet de lichtbundel of pijl die het spel tekent). Het zegt dus "dit punt valt buiten beeld of achter een gebouw", niet "de speler ziet niets". In filmpjes wordt het zicht niet gemeten.

## Draaien

Eisen (zelfde als de andere botruns, zie [TESTEN.md](TESTEN.md)): een gestagede game (`cd desktop && npm run stage`, of `GDE_GAME_DIR=<map>\game`; op Windows met backslashes, het pad niet via een Bash-heredoc), een wereld (`GDE_PREBUILT_WORLD=<andere-build>/game/world` als je worktree er geen heeft), `ELECTRON_EXE` als `desktop/node_modules/electron/dist` ontbreekt, en onder root of in een container `ELECTRON_DISABLE_SANDBOX=1`. Eén Electron tegelijk: `--slot` neemt een slot uit `gde-locks`, anders weigert `run.mjs` bij een lopende Electron (`--force` negeert dat; alleen als jij zeker weet dat het jouw instantie is). Zet de uitvoer in een worktree in de `.scr`-map (staat in `.git/info/exclude`), niet in git.

```
# één missie, één seed
node scripts/bot/proef.mjs --missies=M02 --out=.scr/proef/m02 --slot

# meerdere missies, drie seeds (faalratio per missie)
node scripts/bot/proef.mjs --missies=M02,M13,M15 --seeds=1,2,3 --out=.scr/proef/akte --slot

# een lijst met eigen instellingen per missie
node scripts/bot/proef.mjs --lijst=.scr/proef/lijst.json --out=.scr/proef/lijst --slot
#   lijst.json: ["M02", {"id":"M26","seeds":[1,2],"pogingen":5}]

# alleen de bundel opnieuw bouwen uit bestaande runs (geen Electron)
node scripts/bot/proef.mjs --out=.scr/proef/m02 --alleen-bundel --missies=M02

# of direct met run.mjs (geen bundel, wel events.jsonl en beelden)
node scripts/bot/run.mjs --mode=missions --only=M02 --mens --seed=1 --watch=20 --shots=150 --out=.scr/proef/ruw --slot
```

Standaard geeft `proef.mjs` mee: `--mode=missions --only=<id> --mens --seed=<n> --watch=20 --shots=150`. Alles wat hij niet kent gaat ongewijzigd door naar `run.mjs` (`--speed=2`, `--wait=45`, `--stuck=30`, `--per-step=600`, `--max-wall=<s>`, `--force`). Snelheid 1 is het meest menselijk; `--speed=2` halveert de duur (de reactietijd blijft in speltijd). Een missie krijgt `--per-step=600` s speltijd; een langere missie (M26, de colonne) verhoog je. Een exitcode 3 of 4 van `run.mjs` (Electron bezet, geen slot) stopt de hele proef.

### Uitvoer

```
<out>/overzicht.md          tabel met alle missies: geslaagd, faalratio, pogingen, vast, stilstand, schermen zonder doel, cheats
<out>/samenvatting.json     alles in één bestand
<out>/<missie>/             één seed; bij meer seeds: <missie>/seed-<n>/ met dezelfde bestanden
    events.jsonl            de volledige tijdlijn en invoer
    01-begin.png ...        de beelden, genummerd in tijdsvolgorde
    index.md                tijd, beeld en wat er gebeurde per nummer
    samenvatting.json       geslaagd, uitkomst, pogingen, duurS, cheats (moet 0), cheatsGeweigerd, vastgezet (+momenten),
                            langsteStilstandS, schermenZonderZichtbaarDoel (+nummers), doelwissels, frameMsP95/Max, minGezondheid, maxGezocht, timeouts
    review-brief.md         de checklist voor de vision-reviewer
    report.md, run.log, result.json   het gewone Spelbot-rapport en de Electron-uitvoer
<out>/<missie>/samenvatting.json   (bij meer seeds) de faalratio en de seeds, plus een review-brief die naar de seed-mappen verwijst
```

`geslaagd` is alleen waar als de stap `klaar` eindigde, zonder opgeven en zonder een echte cheat. Een run met `cheats > 0` is geen mensenrun en telt als mislukt.

## Detectoren: hoge precisie, overal, goedkoop

Wie meer vindt dan 'gehaald of mislukt' moet vooral niet te veel vinden: elke detector meldt alleen wat meetbaar fout is, en wat de kaart of het spel niet weet (een `null`) leidt nooit tot een bevinding. De page-kant (`detect/page.js`, aan met `--mens` of `--detect`, uit met `--geen-detect`) meet bij elk oogmoment en elke 5 s speltijd en schrijft de ruwe metingen als regels in `events.jsonl`; de pure kant (`detect/*.mjs`, `detecteer(events, { map })`) oordeelt na de run en is droog getest. Elke bevinding heeft `type`, `soort`, `ernst` (blokkeert, verwarrend, cosmetisch), `stap`, `plek`, `t`, `tekst` en `bewijs`.

| | Detector | Meet (page-kant, logregel) | Oordeel (type) |
| --- | --- | --- | --- |
| a | DOM-audit (`dom.mjs`) | `detect` met `soort: dom`: de zichtbare spelerstekst onder `#hud`, `#cine`, `#story-talk`, `.hud-ctx`, `.hud-prompts` met rect, lettergrootte, kleur en achtergrond | `dom-afgekapt` (scrollWidth > clientWidth bij overflow hidden, ellipsis of line-clamp), `dom-beletselteken` (een '…' of '...' in spelerstekst), `dom-buiten-beeld`, `dom-overlap` (niet-geneste elementen, >= 20% van het kleinste), `dom-lettergrootte` (onder 12 px) en `dom-lettergrootte-norm` (12 tot 13 px: alleen een noot, want 12 px is een toegestane uitzondering), `dom-contrast` (WCAG 4,5 op 1, 3 op 1 voor grote tekst; alleen met een dekkende achtergrond, tekst over de wereld wordt niet beoordeeld) |
| b | Beeld (`beeld.mjs`) | de oogmoment-beelden zelf, plus met `--flikker=<n>` `flikker`-sets (a, b = camera 0,05 graden gedraaid, c = terug) bij stilstand | `beeld-zwart` (> 95% donker), `beeld-blanco` en `beeld-mistig` (> 90% van de pixels binnen een band van 16 helderheidsniveaus), `beeld-egaal-vlak` (een samenhangend egaal blok van >= 45% van het beeld), `beeld-flikkering` (de a/b/c-analyse van `brug_beeld_analyse.mjs`: a-b minus a-c in vlakke delen, >= 40 pixels). Filmpjes tellen niet: daar is egaal bedoeld |
| c | Console (`console.mjs`) | `console` (eerste drie per handtekening) en `consoletelling` aan het eind; haakt `console.error/warn`, `error` en `unhandledrejection` | `console-nan`, `console-niet-gedefinieerd`, `console-onverwerkt` (blokkeert), `console-bron` (404), `console-error`, `console-warn` (cosmetisch); getallen en paden zijn gelijkgemaakt zodat dezelfde fout een bevinding is |
| d | Frametijd (`frametijd.mjs`) | `hitch` per frame boven 50 ms met plek, `streamPending`, de dichtstbijzijnde probe-sectie (alleen als het spel met `?hitch` draait) en `hitchtelling` | `frame-hitch` (>= 3 in 40 m) en `frame-hitch-zwaar` (> 100 ms), met de oorzaak: streaming als de meeste hapers `streamPending > 0` hadden |
| e | Lezen en timing (`lezen.mjs`) | `tekst`: elke ondertitel of gesprekregel met `zichtbaarS`; de uitlegkaart uit de oogmomenten | `lees-te-snel` (> 3 woorden per seconde, feedback #975), `lees-onleesbaar-snel` (> 5), `lees-herhaling` (dezelfde zin binnen een stap, > 20 s uit elkaar), `lees-herhaling-kruis` (dezelfde zin in meer stappen en de watch-frasen 'laatste klus' en 'wij tweeën tegen de rest'), `lees-kaart-blijft` (> 25 s) |
| f | Wereldcontext (`wereldcontext.mjs`) | `plekprobe` bij de eerste regel van een scène: binnen een gebouw, afstand tot gebouw, water en weg | `wereld-binnen-buiten` (woorden als kantoor, keuken, binnen op weiland, weg of water; issue #950), `wereld-water-ver`, `wereld-weide-binnen` |
| g | Bereikbaarheid (`bereikbaar.mjs`) | `bereik` bij elke doelwissel: in water, in gebouw, vrije plek binnen 40 m, route (`findWalkPath`) | `bereik-doel-in-water` (niet bij een boot of vliegtuig), `bereik-doel-in-gebouw`, `bereik-doel-onbereikbaar` (geen vrije plek binnen 6 m), `bereik-geen-route`, `bereik-omweg` (> 4x de hemelsbreedte) |
| h | Eerlijkheid (`eerlijk.mjs`) | `rivaal` elke seconde in een race: snelheid en plek van speler en rivalen | `eerlijk-rivaal-wacht`, `eerlijk-elastiek` (correlatie voorsprong-snelheid < -0,6), `eerlijk-botsing-duw`; altijd 'vermoedelijk', met het bewijs erbij |

In het echte spel moet de eerste run nog bevestigen: of `#hud` en de andere wortels de juiste selectors zijn voor alle meldingen, of `world.race.rivals` de velden `speed`, `prog` en `car` heeft die de page-kant raadt, en of `map.nearestRoadPoint` bij `wegNabijM` een zinnig getal geeft.

## Voortgang en balans

`voortgang.mjs` rekent per missie en run (zonder Electron, op `events.jsonl`): duur tegen de verwachte duur (`verwachtS` in de stap-regel; oordeel 'veel langer' bij > 2x), tijd per fase (tussen doelwissels), pogingen, schade en geldverschil, gezocht, en de mislukkingen met plek, tijdstip en oorzaak (de melding van het spel, anders dood, voertuig kapot of politie). Dode tijd is bewijsgebonden: stilstand van 8 s of meer, `stuck`-regels, en oogmomenten zonder zichtbaar doel en zonder doelregel; samengevoegd en pas een bevinding vanaf 30 s. Een lange rit zonder oogmoment is geen dode tijd. `balans.md` toont per missie over seeds de mediaan, het bereik, de verhouding tot de verwachte duur, geld, schade en dode tijd, en een faalheatmap in cellen van 50 m met de vaakste oorzaak en een tekstkaart.

## Variatie: de matrix

Alles op alles is te veel runs: de matrix is orthogonaal. `--matrix=rook|pairwise|volledig` maakt per missie een lijst runs (`--plan` toont ze zonder te draaien, `--assen=tijd,weer,chaos` beperkt de assen):

- **rook:** de basis, nacht, save/load en sterven midden in de stap (4 runs per missie).
- **pairwise:** elk waardepaar van twee assen komt minstens een keer voor (gretig algoritme, deterministisch; ongeveer 15 runs in plaats van honderden).
- **volledig:** alle combinaties, begrensd op 500.

| As | Waarden | Hoe |
| --- | --- | --- |
| seed | 1, 2, 3 | `--seed=` |
| tijd | dag (12 uur), nacht (22 uur) | `--klok=<uur>`; de page-kant zet `world.clock` vast |
| weer | helder, regenbui, mist | `--weer=`; de page-kant dwingt het weer in `world.weather` (`timer = 1e9`) |
| voertuig | standaard, quad, limo, frituur | `--stage-vehicle=` (alleen bij een board-stap) |
| scherm | 1280x720, 1920x1080, 800x360 | `--scherm=BxH` (de venstergrootte van Electron) |
| invoer | toetsenbord, controller | `--invoer=controller` zet `pad-active` aan (de prompts wisselen) |
| chaos | sterf, voertuig-uit, gebied-uit, stop-herstart, save-load, snelreis | `--chaos=<naam>:<s>` na <s> s speltijd in de actieve missie; stop-herstart is `--annuleer=20` |

Per missie vallen sommige combinaties af (skûtsje en vliegtuig: geen voertuigwissel of uitstappen; zie `UITSLUIT` in `matrix.mjs`). Wat alleen in het echte spel te beoordelen is, staat per run in `matrix.md` (kolom 'alleen in het echte spel'): mist (geen eigen schakelaar in `weather.js`), de mobiele indeling en aanraking bij 800x360, een echte controller, en 'gebied verlaten' (de bot springt 600 m weg).

Chaos en wat ze vinden: **save-load** (opslaan, direct laden, daarna `staatVergelijk` van stap, fase, doel, voortgang, geld, gezocht, voertuig en actieve missie: `chaos-staatbreuk`), **sterf** en **gebied-uit** (geen herstel binnen 120 s speltijd: `chaos-softlock`), **voertuig-uit** (de missie heeft daarna geen doel meer: `chaos-doel-weg`), **stop-herstart** (de bestaande `annuleer`-regel met `ok: false`), **snelreis** (de bot reist niet echt, hij vraagt `blockedReason(world, { reis: true })`; alleen een bevinding als de reis midden in een missie wel mocht). Een chaos-run is geen cheat: het is een gelogde verstoring (`chaos`, `perturbatie`).

## Blind reviewen: denken hardop

De gewone bundel (`index.md`, `review-brief.md`) laat de reviewer alles zien, ook de interne toestand. Voor een eerlijke meting of een nieuwe speler het begrijpt, maakt `blindBundelSchrijven` per run:

```
<run>/blind/                  ALLEEN dit krijgt de blinde reviewer
    brief.md                  het protocol: de laatste 4 tot 8 beelden, de zichtbare tekst, drie vragen
    persona-<id>.md           nieuw, ongeduldig, controller, ogen
    zichtbare-tekst.json      per moment: de beelden en de tekst in beeld (doelregel, ondertitel, dialoog, meldingen, uitlegkaart)
    beeld-01.png ...          neutrale namen: de reden en de stap zouden de oplossing verraden
<run>/antwoord-sjabloon.json  het antwoordformaat: { moment, wat, waar, onduidelijk, zekerheid }
<run>/waarheid.json           de oplossing (echte doeltekst, doelnaam, stap, zicht, plek): NIET aan de reviewer geven
```

De momenten zijn de beslismomenten (begin, start, doelwissel, stil, vast, mislukt, opgegeven), hooguit 12 per run, elk met de laatste 6 beelden. De reviewer beantwoordt: wat denk ik dat ik nu moet doen, waar kijk ik, wat is onduidelijk. Daarna vergelijkt `duidelijkheidRapport(antwoorden, waarheid, oordelen)`: de woordoverlap (inhoudswoorden, ruwe stam van 5 letters) tussen wat de speler dacht en de echte doelregel, waarbij 'ik weet het niet' nul is, gemiddeld met een optioneel LLM-oordeel (`oordeelPrompt` geeft de vraag voor die tweede stap). Per moment een score en het label duidelijk (>= 0,5), half duidelijk of onduidelijk (< 0,25); onduidelijk met zekerheid >= 2 wordt `duidelijkheid-laag`. Een stap zonder doeltekst is onbepaald. Persona's veranderen de kijk, niet de regels; de **tegenlezer** krijgt de clusters (`tegenlezer-brief.md`) en weerlegt of bevestigt elk met een reden (`pasTegenlezerToe` laat weerlegde clusters vallen).

## Triage en reproduceerbaarheid

`proef.mjs` schrijft naast de bundels: `bevindingen.json`, `issues.md`, `balans.md`, `matrix.md` en `tegenlezer-brief.md`. Per run staat `analyse.json` (de cache voor `--alleen-bundel`: de ruwe beelden zijn dan al hernoemd).

- **Handtekening:** `missie|stap|type|plek`. De plek is een cel van 50 m, of de selector en tekst bij DOM, de tekst bij lezen, de console-handtekening bij de console. Seed en variant staan er niet in: dat is wat wordt samengevoegd.
- **Ernst:** impact (blokkeert 3, verwarrend 2, cosmetisch 1) x frequentie (het aandeel runs van die missie waarin de bevinding voorkwam): `score = impact x 10 x (0,4 + 0,6 x aandeel) + min(5, log2(aantal + 1))`. P1 vanaf 28, P2 vanaf 16. Blokkeert is: de voortgang stopt (niet geslaagd, vast, soft-lock, doel onbereikbaar, NaN of een onverwerkte fout, zwart beeld). Verwarrend: de speler weet niet wat hij moet doen of kan niet lezen. Cosmetisch: de rest.
- **Bewijs:** per cluster tot vijf stuks: beeld, eventtijd en -soort, seed, run, plek en de meting.
- **REPRO:** met een `replay.jsonl` in de run: `node scripts/bot/run.mjs --replay=<run>/replay.jsonl --out=...` (speelt de invoer terug; de wereld is niet volledig seed-vast); anders de exacte regel `node scripts/bot/proef.mjs --missies=<id> --seeds=<n> <perturbaties> --slot`.
- **Issue-voorstel:** Nederlandse titel en body (wat, waar, hoe vaak, verwacht, bewijs, reproduceren) met labels `bug` of `wens`, `impact-hoog|midden|laag` en `kosten-S|M|L`, gekozen per type (`TYPEN` in `triage.mjs`). De coördinator maakt de issues aan; de body zegt dat een bevinding automatisch is en nog niet door een mens bekeken.
- **Gouden beelden:** `--goud-bewaar` zet per oogmoment `.scr/goud/<missie>/<stap>-<reden>-<n>.png` neer (bestaand goud blijft, `--goud-vernieuw` overschrijft); `--goud` vergelijkt bij de volgende run. Pixelverschil volgens het criterium van `scripts/perf/pngdiff.mjs` (grootste kanaalverschil > 8); boven 12% van de pixels is dat `goud-verschil`, een andere beeldgrootte is `goud-formaat`. Een aanwijzing voor een mens of vision-agent: verkeer en voetgangers bewegen ook.

Voorbeeld: `node scripts/bot/proef.mjs --missies=M02,M13 --seeds=1,2 --matrix=rook --out=.scr/proef/rook --slot --goud-bewaar`, daarna `issues.md` lezen, de tegenlezer laten lopen en de overgebleven clusters aan de coördinator geven.

## Een vision-agent laat de bundel beoordelen

1. Geef de agent de map `<out>/<missie>` (en bij seeds de map van de eerste seed die faalde; de brief verwijst ernaar).
2. De agent leest `review-brief.md` (checklist, cijfers, paden) en `index.md`, en opent de beelden in volgorde met de Read-tool. Bij een lange missie eerst de beelden met "NIET zichtbaar" of "stil" in het bijschrift.
3. De brief vraagt per beeld: weet ik wat ik moet doen; zie ik het doel; is de tekst leesbaar; is er iets zwevends, ontbrekends, door muren of flikkerends; klopt de camera in filmpjes; voelt het oneerlijk; wat zou een mens vragen; past het bij de regels (Nederlands, geen echte merken, altijd zomer).
4. De opbrengst zijn issue-voorstellen in het Nederlands (titel, `bug` of `wens`, impact, beeldnummers, wat de speler zou verwachten). Een bevinding zonder beeldnummer telt niet. De coördinator maakt er issues van (één impact- en één kostenlabel, zie [AGENTS.md](../AGENTS.md)); de agent maakt ze niet zelf aan.
5. De agent zegt eerlijk wat hij niet kon beoordelen (geluid, animatie, gevoel). Beelden die niemand bekeek staan in het issue als "nog niet bekeken".

## Wat hij wel en niet vangt

Wel: een missie die een speler zonder cheat niet haalt (faalratio, opgeven, stilstand), een doel dat buiten beeld of achter een gebouw staat, een route die alleen de planner kent, een doelwissel zonder uitleg (kaart of ondertitel ontbreekt of staat kort), een uitlegkaart die te lang of te kort staat, schade en gezocht-niveau na een missie, framedips op bepaalde plekken, camera's in filmpjes (met `--watch`), en alles wat een vision-agent op een beeld ziet (zwevend, door muren, onleesbaar). Daarbij de detectoren: afgekapte of te kleine tekst, overlap, laag contrast, zwarte of blanco beelden, flikkering bij stilstand, console-fouten, haperingen per plek, te snelle ondertitels en herhaalde zinnen, een scene op een plek die niet bij de tekst past, een doel in water of een muur, rubber-banding, en soft-locks en staatbreuken na save/load, sterven of uitstappen midden in een stap.

Niet: smaak, humor en tempo (wel `duurS` en de stilstand), geluid en stemmen, het gevoel van sturen (alleen indirect: schade, mislukken), animaties tussen de beelden, alles wat de bot zelf niet kan spelen (eigen beperkingen staan in [TESTEN.md](TESTEN.md): de vaarroute van M17, de colonne van M23). Een bot die faalt is niet altijd een spelbug: lees `index.md` voordat je een issue maakt. Menselijke ruis maakt een run gevoeliger voor smalle doorgangen: faalt een missie bij één seed en slaagt hij bij de rest, dan is dat een bevinding over precisie, geen reden om de bot te negeren. Wat een mens zou vragen verzint een agent, de bot niet. De detectoren zijn een meetlat, geen smaak: 'te snel' is een norm van 3 woorden per seconde, geen oordeel over de zin; het contrast van tekst over de wereld, de leesbaarheid voor kleurenblinden en flikkering bij een bewegende camera meten ze niet (de persona's met een vision-agent wel; de a/b/c-controle alleen bij stilstand); een chaos-run met een sprong van 600 m is geen echte wandeling; mist, mobiel en een echte controller blijven voor een mens.

## Missies uit de wensenlijst van de eigenaar

De ids zijn de verhaalstappen uit `game/js/storyarc_nieuw.js` (de missie zelf staat in `missions_*.js`).

| Wens | Id | Opmerking |
| --- | --- | --- |
| Grote Markt-chaos (stuntavond) | `M01` ("Nul krassen, vijftienhonderd punten") | bekende bot-beperking: de stuntrekwisieten staan er niet (zie TESTEN.md); met `--mens` is falen hier een bevinding en geen cheat |
| containers | `M13` ("Het containerlabyrint") | schuilen voor de lichtbundels |
| skûtsje-sprint | `M11` ("Geleend van de Friezen") | zeilen, wind en trim |
| koeienmissie | nog niet vastgesteld | geen missie met "koe" in de titel gevonden; kandidaat `M10` ("Een trekker-limo op de wierde", landbouw); eigenaar bevestigt het id |
| laag over het graan (vliegtuig) | `M15` ("Laag over het graan") | de vliegbot heeft eigen regels (`botlogic.planeKeys`) |
| mevrouw Hoving, trein | `M19` ("Stoom") | bewaarder Hoving zit in de trein; M18 en M03 noemen haar ook |
| bietencampagne | `A1` ("De bietenoogst bij Hoogkerk", bijbaan `bietenoogst`) | een `A`-stap; of `--mode=missions` die springt, is nog niet gemeten, anders `bot_actsweep` |
| M02 garage (de bot komt de garage niet in) | `M02` ("Even pinnen") | garagestap: de bot rijdt via een punt voor de deur naar binnen (`bot.page.js`, regel "a garage"); `--mens` laat zien of een speler het ook niet haalt |
| Bourtange | `M20` ("Het beleg van Bourtange"), ook `M30` ("Het proefbeleg") | timing-meters (M18, M20, M21, M22) |

## Eerste echte run: wat nog niet is gemeten

Prioriteit, in deze volgorde: (1) een gewone `--mens`-run van een korte missie (M02) met de detectoren aan: bevat `events.jsonl` de regels `detect`, `tekst`, `bereik`, `plekprobe`, `hitch` en `consoletelling`, en ontbreekt `detect-fout`; (2) `--chaos=save-load:20` en `--chaos=sterf:20` op dezelfde missie, want de page-kant raadt de savegame-aanroepen (`saveGame`, `readSaveInfo`, `applySave`) en het sterven (`player.health = 0`); (3) `--matrix=rook` op drie missies; (4) een blinde review op `blind/` van een run; (5) `--goud-bewaar` en een tweede run voor de tolerantie van 12%.

De code en de bundelbouw zijn droog getest; de eerste Electron-run (door de coördinator) moet nog laten zien: dat de camera-wiskunde in het echte spel klopt (`zicht.sx/sy` tegen het beeld), dat `getActiveRoute` bij elke missie een HUD-lijn geeft, dat de reactietijd de bot niet onterecht laat vastlopen op een korte timer (M16 kroegentocht, de stunt), en of `--shots=150` genoeg beelden is voor een lange missie.
