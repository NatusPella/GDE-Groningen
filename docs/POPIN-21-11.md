# Pop-in van de wereld (21-11-2026, #1016)

> Opdracht: Nikky en de eigenaar zien nog pop-in van gebouwen, bomen, props, voertuigen, voetgangers, wegen en gras bij
> lopen, rijden, vliegen en snel reizen, en de eigenaar zag in het bijzonder dat de ramen op het hoogste LOD pas laat
> inladen. Eerdere rondes: #534 (laadstraal en LOD), #247 (vooruitkijken), #786 (bomen), #755 (verre LOD).
> Stand: tak `worktree-agent-a97e02bcd34a0cf88` vanaf release v0.64.0. Niets gepusht of gemerged.

## Eerlijk vooraf: de meting is rommelig

De machine had tijdens alle runs 2 tot 3 andere Electron-instanties (andere agents) en minder dan 2 GB vrij geheugen. De
frametijd (p50) wisselde per run tussen 16 en 1000 ms; twee runs (kort-na2 en normaal-na) draaiden op 1 tot 5 beelden
per seconde en zijn **niet bruikbaar** voor een voor/na. Een run met een fout in mijn code (`_bPre is not defined`, zie
hieronder) is weggegooid. Wat hieronder staat als getal komt uit runs met een frametijd p50 van 18 tot 110 ms en is waar
mogelijk gepaard (zelfde route, afwisselend voor en na). Een afname in het aantal gebeurtenissen is geen bewijs op zich: de probe telt
alleen dat iets zichtbaar werd, niet of het zacht of hard verscheen (zie "Wat de probe niet ziet").

## Meetmethode

- `scripts/qa/popin.page.js` (draait via `scripts/qa/popin.mjs`, in één Electron met wegwerpprofiel, 1280x720, vaste kwaliteit
  Hoog zonder adaptieve afbouw, zichtafstand "kort" of "normaal", 14:00 helder). Routes: **foot** (Binnenstad, 5 m/s, 30 s),
  **a7** (provinciale weg per auto, 30 m/s, 40 s, begint in de stad), **heli** (korte vlucht, 40 m/s, 25 s).
- Per frame (na de eigen render van het spel) loopt de probe door de zichtbare scenegraaf en meldt wat **nieuw getekend
  wordt**: een nieuwe mesh, een mesh waarvan de geometrie groeit of wisselt (samengevoegde batches) of een InstancedMesh met
  meer instanties. Per gebeurtenis: categorie (naam of eigenschap van de mesh of zijn voorouder), afstand tot de camera
  (dichtstbijzijnde rand van de omhullende bol), schermgrootte in pixels, mistfactor op die afstand en of hij in het beeld
  valt. **Zichtbare pop-in** = in beeld, >= 2 px en minder dan 90% in de mist. "near60" = zichtbare pop-in binnen 60 m met
  minder dan 50% mist (de storende soort).
- Verder per frame: de straal van de detailring van gebouwen (`dists().buildingDetailR`) als aandeel van de tekenafstand,
  het tijdstip waarop elke tegel geladen werd (`store.on('tile')`) en de frametijd.
- Een reeks stills per route (6 beelden, 0,5 s uit elkaar, tussen 40% en 60% van de route) in `docs/beeld-21-11/popin/`.
- De probe zelf kost 1,6 tot 5 ms per frame (gemeten, `walkMs`), voor en na gelijk.

## Gemeten: waar en hoe vaak (voor, zichtafstand kort, tekenafstand 140 m)

Twee onafhankelijke voor-runs (voor2 en voor3) geven hetzelfde beeld:

| route | zichtbare pop-in per s | binnen 60 m per s | seconden met minstens één pop binnen 60 m | grootste bronnen |
|---|---|---|---|---|
| foot (30 s) | 16 tot 24 | 5 tot 9 | 27 van 30 | gebouwen, voetgangers, spelermesh, wegen |
| a7 (40 s) | 37 tot 39 | 11 | 18 tot 21 van 40 | gebouwen (1190 tot 1480 gebeurtenissen), wegen, grasvlakken, voetgangers, geparkeerde auto's, bomen (83 tot 93) |
| heli (25 s) | 17 | 4 tot 5 | 15 tot 20 van 25 | grasvlakken (137 tot 142), voetgangers, struiken en bloemen |

Afstanden: gebouwen verschijnen vooral tussen 60 en 190 m (de ring van 140 m plus de schaduw van de lage frame rate), wegen tussen 60
en 190 m, bomen tussen 60 en 190 m (a7), grasvlakken van 0 tot 190 m, geparkeerde auto's van 20 tot 130 m, voetgangers van 45 tot
190 m. Met zichtafstand "normaal" (tekenafstand 190 m, mist begint pas op 135 m en eindigt op 357 m) komt het meeste op 130 tot 260 m
met nauwelijks mist.

**De detailring van gebouwen** (de straal waarbinnen het gebouw met ramen, kozijnen en gevelversiering staat; daarbuiten
tekent het verre LOD een kale massa met een donker raamraster): in de Binnenstad lag die straal in **10% (foot) en 13 tot 23%
(a7) van de frames onder 90% van de tekenafstand**, in 3 tot 5% onder 50%, met een kleinste straal van **18 m (a7)** en 36 m (foot).
Dat is de meting achter "de ramen komen pas laat": zolang één gebouw nog niet klaar is, wordt de hele ring daarachter het
verre LOD (`scene3d.js syncBuildingsPass`: de detailring is een cirkel tot het dichtstbijzijnde gebouw dat nog mist, omdat
`farlod.js` zijn eigen kopie op dezelfde afstand verbergt).

## Oorzaken (uit code en meting)

1. **De tekenstraal van bomen, voertuigen en props eindigt waar de mist nog niets verbergt.** Mistbegin = 0,45 x detailstraal
   + (zichtafstand - 150) x 0,25, mistein = 1,02 x zichtafstand. Bij "kort" is de mist op 130 m 74% (gaat nog), bij "normaal" op 190 m
   maar 25% en bij "ver" 0%. Een harde rand in de afstand is dan een zichtbare ring. Bomen hadden TREE_DIST = 130 m, zonder fade.
2. **Laadstraal gelijk aan de tekenstraal.** De boomlijst werd pas na 8 m beweging herbouwd (`treeSyncDue`): de ring verschoof dus
   in stappen van 8 m en bomen verschenen tot 8 m te laat, bij 30 m/s vier keer per seconde.
3. **De detailring krimpt** (zie boven): een gebouw dat wacht op het bouwbudget of op het linken van zijn shaders (tot 2 s,
   `BUILDING_LINK_WAIT_MS`) trekt de ring naar zijn eigen afstand. Het voorladen was een vaste 30 m (een seconde bij 30 m/s),
   korter dan zo'n compilatie.
4. **Raamkozijnen op een drukke machine.** Bij `cpuLevel` 1 tot 3 tekent het spel de gevelversiering (kozijnen, lijsten,
   winkelpuien) alleen binnen 100, 70 en 45 m (`CPU_FACADE_DIST`), met een harde sprong op die afstand. In de runs stond
   cpuLevel al op 1 zodra de machine belast was (ook bij "adaptief uit" in de probe), dus een machine die even stottert
   toont de kozijnen pas op 100 m terwijl de gebouwen op 140 tot 190 m staan.
5. **Grasvlakken** (`green-chunk`, het groen van parken en weilanden) werden gebouwd op de tekenafstand, twee per frame binnen
   3 ms: bij snelheid en op een trage machine verschenen ze pas dichtbij.
6. **Voertuigen** werden gebouwd op `d < DRAW_DIST` en gesloopt op hetzelfde getal: een auto die op de rand rijdt werd steeds
   opnieuw gebouwd en gesloopt (bouwkost en flikker).
7. **Al goed:** voetgangers (fade met schermdeur-dither, spawn buiten het gezicht), verkeer en geparkeerde auto's (`spawnWouldPop`),
   gras zelf (smoothstep-fade in de shader), gebouwen (voorladen tot 30 m buiten de ring), wegen (vooruit-prioriteit `streamRank`).

## Fixes (elk een eigen commit, pure regels in `popinrules.js`)

| # | Wat | Waarom | Kost |
|---|---|---|---|
| 1 | **Bomen: zachte rand en laadstraal voorbij de tekenstraal.** `edgefade3d.js` patcht de bestaande boommaterialen (geen extra pass of programma: de kloon deelt het programma) met een schermdeur-dither op camera-afstand in de band 114 tot 126 m (verre kronen 232 tot 256 m). De lijst wordt `REBUILD_STEP_M` (8 m) verder geladen (`loadRadius`); een boom van een bos krijgt in de band ook zijn verre kroon, zodat de nabije boom erin overloopt. | oorzaak 1 en 2 | 1 discard-tak per boompixel binnen de band; nul extra draw calls |
| 2 | **Voertuigen: hysterese** op de rand (`VEH_KEEP_EXTRA` = 15 m): bouwen op 140 m, pas weghalen op 155 m. | oorzaak 6 | nul |
| 3 | **Grasvlakken:** `GRASS_PREBUILD` = 30 m: een vlak wordt verborgen (`visible = false`) gebouwd en op zijn straal getoond; opruimen 30 m verder. | oorzaak 5 | tot 65% meer grasvlakken in het geheugen (verborgen, niet getekend); bouwbudget (2 per frame, 3 ms) ongewijzigd |
| 4 | **Raamkozijnen:** `CPU_FACADE_DIST` van 100/70/45 naar 140/90/60 m. | oorzaak 4 | op een drukke machine meer kozijnen getekend (1,96x het oppervlak bij niveau 1); **frametijd niet apart gemeten, zie risico** |
| 5 | **Teruggedraaid: gebouwen voorladen met de snelheid mee, vooruit.** De vaste marge van 30 m wordt vooruit tot 90 m groter (lead = 3 s x snelheid), op volgorde van `streamRank`. In vier gepaarde a7-runs (zie de A/B-tabel) bleef de detailring even vaak klein als zonder; "alleen echte winst houden", dus niet in de tak (de commits staan er als revert). | oorzaak 3 | n.v.t. |

Nieuw en geen onderdeel van het spel: `scripts/qa/popin.mjs` + `popin.page.js` (de probe), `scripts/popinrules_test.mjs` (52
controles: band, dither, laadstraal), `scripts/popin_wiring_test.mjs` (10: de statische no-undef-controle op de geraakte
bestanden en dat elke nieuwe naam gedeclareerd of geïmporteerd is, naar aanleiding van de mislukte poging hieronder).
`scene3d.js` staat op 4499 regels (grens 4500); de nieuwe code staat in eigen modules en de regels zijn elders bespaard.

### Een fout onderweg

De eerste versie van fix 5 (inmiddels teruggedraaid) gebruikte `_bPre` zonder hem te declareren (een mislukte bewerking van het script). `node --check` ziet dat
niet; de eerste na-run met die versie toonde "Er ging iets mis: _bPre is not defined" in beeld en liep op een kapotte frame. Die run
(en wat ik er in de vorige tussenstand over zei) is vervallen. `scripts/popin_wiring_test.mjs` vangt dit nu, de probe meldt fouten in
`results.errors`, en de beelden hieronder komen uit een run zonder fouten.

## Voor/na (zichtafstand kort, tekenafstand 140 m)

Geldige paren: **voor3** (kort-voor3, basis v0.64.0) tegen **na5** (kort-na5, zonder fouten). Let op: na5 bevat nog fix 5, die daarna is teruggedraaid; de stills en deze tabel zijn dus van de tak mét die fix. Omdat fix 5 niets meetbaars deed (zie de A/B-tabel) verwacht ik geen verschil met de uiteindelijke tak, maar die uiteindelijke tak (fix 1 tot 4) is als aparte volledige run **niet** gemeten (alleen als a7-run `na3`). Frametijd p50
voor/na: foot 108/80 ms, a7 47/37 ms, heli 27/24 ms (beide kanten dezelfde drukke machine, de na-runs iets rustiger).

| route | zichtbaar per s (voor, na) | binnen 60 m per s (voor, na) | detailring < 90% van de tekenafstand (voor, na) | kleinste ring (voor, na) |
|---|---|---|---|---|
| foot | 16 / 16 | 5,3 / 4,9 | 0% / 0% | 126 / 127 m |
| a7 | 39 / 42 | 10,8 / 14,3 | 13,2% / 3,5% | 37 / 44 m |
| heli | 17 / 18 | 5,4 / 5,0 | 0% / 0% | 140 / 140 m |

**A/B op de detailring** (alleen route a7, kort, afwisselend; `ab-*`). Een run op 1 beeld per seconde (base-1, p50 1015 ms) is weggelaten.

| run | variant | p50 | detailring < 90% | < 50% | kleinste ring |
|---|---|---|---|---|---|
| voor3 (volledige run) | basis | 47 ms | 13,2% | 2,9% | 37 m |
| ab-base-2 | basis | 35 ms | 6,4% | 1,9% | 18 m |
| ab-na3-1 | fix 1 tot 4 | 77 ms | 32,7% | 6,4% | 11 m |
| ab-na3-2 | fix 1 tot 4 | 35 ms | 10,7% | 4,5% | 18 m |
| ab-na5-1 | fix 1 tot 5 | 45 ms | 6,3% | 1,9% | 36 m |
| ab-na5-2 | fix 1 tot 5 | 40 ms | 6,5% | 2,4% | 18 m |
| kort-na5 (volledige run) | fix 1 tot 5 | 37 ms | 3,5% | 0,9% | 44 m |

Lees: de spreiding tussen twee runs van dezelfde variant (basis 6,4% en 13,2%; fix 1 tot 4 10,7% en 32,7% bij een tragere frame) is
groter dan elk verschil tussen varianten. De ring krimpt dus nog steeds in de Binnenstad (6 tot 13% van de frames onder 90%), en geen enkele
fix heeft dat aangetoond verbeterd of verslechterd. Het is een eigen, nog open oorzaak (hieronder).

Stills (1280x720, dezelfde route): `docs/beeld-21-11/popin/voor-*.png` en `na-*.png`, route foot, a7 en heli, beeld 1, 3 en 6.
Het duidelijkste verschil is in `voor-heli-3.png` tegen `na-heli-6.png`: de boomrij vooruit loopt in "na" uit in een schermdeurpatroon en
is niet langer in de mist afgekapt. Dat is een eenzaam beeld, geen statistiek.

## Wat de probe niet ziet en wat niet bewezen is

- **Zachte randen zijn onzichtbaar voor de probe.** Een boom die met 10% van zijn pixels verschijnt telt als een gebeurtenis, net als een
  boom die hard verschijnt. De boom-, voertuig- en grasfixes laten de aantallen dus nauwelijks dalen (a7: bomen 93 -> 76, grasvlakken in
  de heli 142 -> 137); wat ze doen is de zichtbaarheid van die gebeurtenis, en die is hier **niet** gemeten maar volgt uit de regel
  (`popinrules_test.mjs`) en uit het beeld. Een echte beeldmeting (pixelverschil tussen opeenvolgende beelden) is niet gedaan.
- **Grote objecten hebben een betekenisloze afstand.** Een grasvlak of batch met een omhullende bol van 200 m "verschijnt" op 0 m als de
  camera in de bol staat. De afstandsverdeling per categorie geldt voor kleine dingen (gebouwen, bomen, auto's), niet voor vlakken.
- **De detailring**: zie de A/B-tabel. De uitslag van een enkele run is ruis (de frametijd wisselde 2 tot 5 keer tussen runs door de belasting van
  de machine); de ramen-op-het-hoogste-LOD-klacht is daarmee gemeten (de ring krimpt) maar **niet opgelost** door deze ronde. Wat wel is gedaan
  voor ramen: fix 4 (kozijnen op een drukke machine op grotere afstand), die niet apart op frametijd is gemeten.
- **Frametijd en geheugen van de fixes zijn niet apart gemeten.** In de geldige paren (hierboven) is de p50 voor/na gelijk of lager, de
  heap hoger (foot 2,7 -> 2,9 GB, a7 1,2 -> 2,3 GB, heli 2,2 -> 1,8 GB: wisselt met de run en met de garbage collector, niet toe te
  schrijven aan een fix). Een `scripts/perf/run.mjs`-reeks (norm 33,5 ms) is niet gedraaid: die machine was deze middag niet stil genoeg
  (zie boven) en de coördinator draait die toch bij de release. De grootste kans op een kostenpost is fix 4 (meer kozijnen bij cpuLevel 1);
  zet die terug (een regel in `scene3d.js`) als de release-perfreeks een verslechtering laat zien.
- **De zichtafstanden "normaal" en "ver"** (mist 25% resp. 0% op de tekenafstand) zijn gemeten in de eerste runs (normaal-voor) maar
  niet met een geldige na-run herhaald; de boomfix zou daar het meeste doen en is daar niet aangetoond.
- **De werkelijke oorzaak van een kleinste ring van 18 m** (a7) is niet bevestigd: de link-wachttijd van 2 s is de waarschijnlijkste
  (de ring krimpt tot de afstand van het wachtende gebouw), een tegel die laat binnenkomt de tweede. Het voorladen met de snelheid mee
  (fix 5) had dat moeten verkleinen en deed dat niet aantoonbaar, wat de link-wachttijd als enige oorzaak onzeker maakt. Een tijdreeks per frame van
  welk gebouw mist, hoe lang en waarom is de eerstvolgende stap.
- **Voertuigen en voetgangers** zijn in deze ronde niet aangepast behalve de hysterese: hun spawnregels (`spawnWouldPop`, pedView) en de
  voetgangersfade bestonden al; de probe toont voetgangers wel als gebeurtenissen (met fade) en geparkeerde auto's (66 tot 78 in de a7).

## Vervolg (niet gedaan)

1. Pixelverschil tussen opeenvolgende stills (vaste camera, 60 beelden per seconde in lock-step) als echte maat voor zichtbare pop-in.
2. Geen kale gevel op het lage LOD: het verre LOD heeft al een donker raamraster (`farlod.js`, #259, #463), maar geen kozijnen. Een
   kozijnentextuur op de verre gevel en een dither-overgang tussen de twee (zelfde patroon als `edgefade3d.js`) is de logische stap; de
   overgang is nu een harde wissel op de detailring.
3. Gevelversiering (`facadeDetail`) in dezelfde dither-band als de bomen laten uitdoven in plaats van `visible = false` op de afstand.
4. De ring niet langer als cirkel verbergen: per gebouw in plaats van per straal (vraagt een masker in de shader van `farlod.js`).
