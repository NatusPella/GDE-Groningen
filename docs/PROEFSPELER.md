# De proefspeler: playtesten zonder menselijke input

Playtesten door mensen is de bottleneck. De proefspeler is de Spelbot (#186) met een menselijk profiel (`--mens`) en een bundel per missie die een AI-reviewer met beeld kan lezen. Een run levert zonder menselijke input een bruikbaar playtestrapport per missie op. Het vult de mensen niet op: smaak, humor, geluid en gevoel beoordeelt hij niet (zie "Wat hij wel en niet vangt").

Onderdelen (alle in `scripts/bot/`, de logica is puur en droog getest):

| Bestand | Rol |
| --- | --- |
| `mens.mjs` | reactietijd, stuur- en richtruis, pogingen, camera-wiskunde (waypoint op het scherm, afgedekt door een gebouw), stilstandspreiding, het oogmoment |
| `bot.page.js` | de bestaande bot, met een `--mens`-laag (opt-in: zonder `--mens` is er niets veranderd) |
| `run.mjs` | start één Electron-run; kent `--mens`, `--seed`, `--pogingen` |
| `proefbundel.mjs` | uit `events.jsonl`: `samenvatting.json`, `index.md`, `review-brief.md`, faalratio over seeds |
| `proef.mjs` | de driver: een lijst missies en seeds, roept `run.mjs` aan en bouwt de bundels |

Tests (geen Electron): `node scripts/mens_test.mjs`, `node scripts/proefbundel_test.mjs`.

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

## Een vision-agent laat de bundel beoordelen

1. Geef de agent de map `<out>/<missie>` (en bij seeds de map van de eerste seed die faalde; de brief verwijst ernaar).
2. De agent leest `review-brief.md` (checklist, cijfers, paden) en `index.md`, en opent de beelden in volgorde met de Read-tool. Bij een lange missie eerst de beelden met "NIET zichtbaar" of "stil" in het bijschrift.
3. De brief vraagt per beeld: weet ik wat ik moet doen; zie ik het doel; is de tekst leesbaar; is er iets zwevends, ontbrekends, door muren of flikkerends; klopt de camera in filmpjes; voelt het oneerlijk; wat zou een mens vragen; past het bij de regels (Nederlands, geen echte merken, altijd zomer).
4. De opbrengst zijn issue-voorstellen in het Nederlands (titel, `bug` of `wens`, impact, beeldnummers, wat de speler zou verwachten). Een bevinding zonder beeldnummer telt niet. De coördinator maakt er issues van (één impact- en één kostenlabel, zie [AGENTS.md](../AGENTS.md)); de agent maakt ze niet zelf aan.
5. De agent zegt eerlijk wat hij niet kon beoordelen (geluid, animatie, gevoel). Beelden die niemand bekeek staan in het issue als "nog niet bekeken".

## Wat hij wel en niet vangt

Wel: een missie die een speler zonder cheat niet haalt (faalratio, opgeven, stilstand), een doel dat buiten beeld of achter een gebouw staat, een route die alleen de planner kent, een doelwissel zonder uitleg (kaart of ondertitel ontbreekt of staat kort), een uitlegkaart die te lang of te kort staat, schade en gezocht-niveau na een missie, framedips op bepaalde plekken, camera's in filmpjes (met `--watch`), en alles wat een vision-agent op een beeld ziet (zwevend, door muren, onleesbaar).

Niet: smaak, humor en tempo (wel `duurS` en de stilstand), geluid en stemmen, het gevoel van sturen (alleen indirect: schade, mislukken), animaties tussen de beelden, alles wat de bot zelf niet kan spelen (eigen beperkingen staan in [TESTEN.md](TESTEN.md): de vaarroute van M17, de colonne van M23). Een bot die faalt is niet altijd een spelbug: lees `index.md` voordat je een issue maakt. Menselijke ruis maakt een run gevoeliger voor smalle doorgangen: faalt een missie bij één seed en slaagt hij bij de rest, dan is dat een bevinding over precisie, geen reden om de bot te negeren. Wat een mens zou vragen verzint een agent, de bot niet.

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

De code en de bundelbouw zijn droog getest; de eerste Electron-run (door de coördinator) moet nog laten zien: dat de camera-wiskunde in het echte spel klopt (`zicht.sx/sy` tegen het beeld), dat `getActiveRoute` bij elke missie een HUD-lijn geeft, dat de reactietijd de bot niet onterecht laat vastlopen op een korte timer (M16 kroegentocht, de stunt), en of `--shots=150` genoeg beelden is voor een lange missie.
