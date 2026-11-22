# Releasegate: elke release bewijsbaar zonder regressie

> **Status:** ingevoerd op 13-11-2026 (ADR [0034](../.specs-fire/standards/adr/0034-ai-releasegate-met-bewijs.md)).
> Dit document is de uitleg en het draaiboek; de regel staat in
> [`.specs-fire/standards/testing-standards.md`](../.specs-fire/standards/testing-standards.md) en
> [`.specs-fire/standards/publicatie.md`](../.specs-fire/standards/publicatie.md). Bij verschil wint
> `AGENTS.md`.

## Waarom

Een release ging tot nu toe door als de tests groen waren. Maar de bestaande keten keek niet
naar de dingen waar een speler een release op afrekent:

- **Performance**: de perf-norm (#804) en de perf-routes bestonden, maar niemand legde een
  release vast tegen een vorige meting. Een trage release kon groen door.
- **Graphics**: de beeldchecks keken of een beeld zwart, leeg of kapot was, niet of het er goed
  uitzag. Het rapport zei letterlijk dat niemand de beelden had bekeken.
- **Design system**: er waren losse tests (kleuren, HUD, tekstbudget), maar geen controle op de
  diff: een nieuwe losse hex of een te kleine letter kwam er zo in.
- **Regels**: de constitutie en de specs zijn deels meetbaar (taal, altijd zomer, geen merken),
  maar niet op de wijziging van deze release toegepast.
- **UI/UX/gameplay**: de spelbot en de QA-rondes vonden veel, maar de beoordeling "ziet dit er
  goed uit en speelt dit goed" hing aan een mens die uren naar beelden keek.
- **Code review**: die was geen vast onderdeel van een release; fouten in de diff werden pas
  later gevonden.

De releasegate maakt van die losse metingen één poort met bewijs. De mens is geen bottleneck
meer: de deterministische checks doen het meetwerk, een AI met beeldherkenning beoordeelt de
beelden, en AI-reviewers beoordelen de diff. De eigenaar houdt alleen het publicatierecht
(constitutie 8); de agent doet meten, reviewen en fixen.

## Toetshints in de regelaudit

`rules_audit.mjs` keurt elke toegevoegde regel in `game/js` met `checkKeyLine` (`scripts/release/design_rules.mjs`): een toetsnaam als woord in spelertekst of een tekstkeycap zonder icoon is een bevinding van ernst belangrijk. Zie DESIGN_SYSTEM.md, hoofdstuk Controls and key hints.

## Eén commando, vijf fasen

```
node scripts/release_gate.mjs --plan [--from=v0.60.7]      # wat heeft deze release nodig?
node scripts/release_gate.mjs --stage=auto --from=v0.60.7  # de gate draaien
node scripts/release_gate.mjs --verify                     # de poort voor release.sh
```

De gate kiest op basis van de diff sinds de vorige tag welke fasen nodig zijn (en `--all` dwingt
alles af). Elke fase is een bestaande meting; de gate voegt niets nieuws aan de meetmethode toe.

| Fase | Wat het draait | Bewijst | Duur (schatting) |
|---|---|---|---|
| **static** | `run_tests.mjs` (module-check, `undef_check`, `text_audit`, `spec_check`, dode code, alle pure tests), `secrets_scan`, `merkenregister_check`, de cutscene-linter (`scripts/cutscene_lint.mjs --strict`: streng voor alle cutscenes, blokkeert op elke blokkerende vondst zonder uitzondering), de ketenaudit van het verhaal (`scripts/verhaal_keten_audit.mjs`: elke stap van de opening tot de aftitels bereikbaar, met uitgang, vlaggen en scenes; met een wereld ook de plekken, zie docs/VERHAAL-DOORSPEELBAAR-22-11.md), en `release/rules_audit.mjs` op de diff | de code is syntactisch en semantisch in orde; de constitutie en het design system zijn op de *nieuwe regels* toegepast | 12-20 min |
| **world** | `test_all.mjs --fase=zwaar` | wereld, tegels, wegen, water, bruggen en plaatsing kloppen nog | 20-60 min, alleen als wereld/tegels geraakt zijn |
| **perf** | `scripts/perf/run.mjs` (de vaste routes) + `release/perf_gate.mjs` | elke route haalt de absolute norm én is niet fors slechter dan de vastgelegde baseline; een andere machine geeft geen valse regressie | 5-12 min |
| **visual** | de QA-beeldronde (`sweep`, `ui_shots`, `readme_shots`) + `release/visual_gate.mjs` | geen zwarte/lege/kapotte beelden, geen onbedoelde beeldverandering, en een compact AI-reviewpakket van wat veranderde | 20-40 min |
| **review** | `release/review_pack.mjs`, daarna de AI-reviewers, daarna `release/findings.mjs` | de diff is door AI gereviewd op correctheid, regels, design, perf, UX/gameplay en multiplayer; elke blokkerende bevinding is gedicht | 10-25 min AI-werk, parallel |

De gate schrijft alles in één map (standaard `%TEMP%/gde-release/<stamp>-<commit>/`, buiten de
repo): `release-gate.json` (machineleesbaar), `rapport.md` (Nederlands, met de uitslag per fase)
en per fase het bewijs (testlog, perf-json, beelden, reviewpakket).

### Nooit stil groen

- Een fase die niet kon draaien (geen wereld, geen Electron, geen beelden) heet **onvolledig**,
  niet geslaagd. De gate eindigt dan met exitcode 3, net als `test_all.mjs`.
- `--allow-skip` maakt van een bewuste deelrun exit 0, maar het rapport blijft "onvolledig"
  zeggen. `--verify` keurt zo'n rapport nooit goed.
- `--skip=<fase>` is bedoeld voor ontwikkelen, niet voor een release.
- Een review die niet op de laatste commit is gedaan, is niet geldig: na een fix moet de
  reviewdelta opnieuw.

### Per merge, niet alleen per release

Dezelfde regels- en designcontrole zit sinds ADR 0034 ook in `scripts/run_tests.mjs`, en dus
in CI op elke pull request en push naar `main`. CI geeft daarvoor `GDE_RULES_BASE` mee (de
PR-basis of de vorige main-commit); lokaal valt de runner terug op `origin/main` en anders op
de laatste tag, en het merkenregister draait mee. Zo krijgt elke agent de constitutie- en
designcontrole op zijn eigen diff zonder de 45-75 minuten van de volledige gate. De AI-review
en de perf- en beeldcontrole blijven bij de releasegate: die bewaken de release, niet elke
losse wijziging.

## De AI-reviewlus (het belangrijkste nieuwe deel)

De gate zelf is deterministisch; het oordeel over "is dit goed" doet AI. Dat gaat in vaste
stappen, zodat een volgende sessie hetzelfde doet en niemand hoeft te bedenken wat "review" is.

### Stap 1: het reviewpakket

```
node scripts/release_gate.mjs --stage=review --from=v0.60.7
```

Dit draait `scripts/release/review_pack.mjs`. De review- en finalize-run horen bij dezelfde
release-run als de meetfasen: zonder `--out` hergebruikt de gate de laatste runmap voor dezelfde
commit, zodat het bewijs van static/perf/visual blijft staan en het rapport wordt aangevuld. Geef
`--out=<map>` om bewust een andere runmap te kiezen. De gate schrijft naar `<run>/review/`:

- `review-pack.md`: de diff sinds de vorige tag, gegroepeerd per systeem, met per verplicht
  aspect een checklist en de strikte outputinstructie. De diff is begrensd (standaard 4000
  regels; per bestand 400; inkortingen staan er expliciet in).
- `review-required.json`: de verplichte aspecten. De gate voegt `vision` toe als de beeldfase
  een reviewset had.

Welke aspecten verplicht zijn, hangt van de diff af:

| Aspect | Wanneer | Prompt |
|---|---|---|
| `correctness` | altijd | `scripts/release/prompts/correctness.md` |
| `rules` | altijd (constitutie, ADR's, taal, naamgeving) | `scripts/release/prompts/code-review.md` |
| `design` | UI, CSS, HTML, menu's, HUD | `scripts/release/prompts/design.md` |
| `perf` | render-, streaming- of hot-path-bestanden | `scripts/release/prompts/perf.md` |
| `ux` / `gameplay` | missies, verhaal, minigames, menu's | `scripts/release/prompts/code-review.md` |
| `multiplayer` | netwerk-, coop- of multiplayerbestanden | `scripts/release/prompts/code-review.md` |
| `vision` | als de beeldfase beelden ter review had | `scripts/release/prompts/vision.md` |
| `cutscenes` | cutscene-code (`cutscene*`, `cinematics`, `cineshots`, `cutscript`, `cuegestures`, `poseclips`, camera- en intochtbestanden) of `game/storydata/script.json` gewijzigd | `scripts/release/prompts/cutscene-review.md` |

### Stap 2: reviewers parallel

De coördinator (de AI-agent die de release voorbereidt) start per verplicht aspect één
reviewer-subagent, parallel. Elke reviewer krijgt:

1. de eigen prompt uit `scripts/release/prompts/`;
2. het pad naar `review-pack.md` (en voor `vision` naar `<run>/visual/vision/vision-pack.md`);
3. de opdracht het reviewrapport-JSON te leveren volgens
   [`scripts/release/findings-schema.json`](../scripts/release/findings-schema.json).

Een kant-en-klare opdracht per reviewer:

```text
Lees scripts/release/prompts/<aspect>.md volledig. Lees daarna <run>/review/review-pack.md
en de bestanden die bij aspect <aspect> horen. Beoordeel alleen die bestanden. Schrijf je
reviewrapport als JSON volgens $defs.reviewrapport uit scripts/release/findings-schema.json
naar <run>/reviews/<aspect>.json. Geen proza eromheen; noem je dekking; een blokkerende
bevinding krijgt bewijs. Klaar als het bestand geldig is.
```

Voor `vision` is het pakket `<run>/visual/vision/vision-pack.md`: bekijk de contactbladen met
`read_image`, open de aangewezen volledige beelden, en schrijf `<run>/reviews/vision.json`.
Zonder `--out` hoort `<run>` de map te zijn die de gate zelf koos (dezelfde als waar
`review-required.json` staat); de gate print hem.

Regels voor de reviewers:

- alleen de genoemde bestanden en aspecten; geen speculatie zonder bewijs;
- per bevinding een ernst (`blokkerend`, `belangrijk`, `nit`), bewijs (bestand:regel, beeld,
  meting) en een concreet fixvoorstel;
- een **blokkerende** bevinding heeft altijd bewijs;
- "geen bevindingen" mag alleen als de reviewer zijn dekking noemt (welke bestanden/beelden
  echt bekeken).

### Stap 3: triage

```
node scripts/release_gate.mjs --stage=review --finalize
```

`scripts/release/findings.mjs` valideert de rapporten, dedupliceert, en schrijft naar
`<run>/review/`:

- `findings.json` en `bevindingen.md` (Nederlands, gegroepeerd op ernst en aspect);
- `gate.json` met status `groen`, `rood` of `onvolledig`;
- `issues-concept.md` met per belangrijke bevinding een issue-concept (labels, bewijs, afdruk).

De auto-bevindingen van de regels-, perf- en beeldcontrole worden als reviewrapport
meegetriëerd, zodat er één oordeel is. Exitcode 0 = groen, 1 = blokkerend, 3 = onvolledig
(ontbrekend aspect, ongeldig rapport, blokkerend zonder bewijs).

### Stap 4: fixen en opnieuw bewijzen

Een blokkerende bevinding is geen mening maar een poort:

1. fix in kleine commits, met de test die de fix dekt;
2. draai de geraakte deterministische fase opnieuw (`--stage=static`, `--stage=perf` of
   `--stage=visual`); de beeldfase alleen als het beeld écht kan zijn veranderd;
3. laat de reviewers **alleen de delta** opnieuw bekijken (nieuwe diff sinds de vorige review)
   en werk `<run>/reviews/<aspect>.json` bij, met de nieuwe commit erin;4. `--stage=review --finalize` opnieuw tot `gate.json` groen is en de review op HEAD staat.

Belangrijke en nit-bevindingen houden de release niet tegen: die worden een issue (het
`issues-concept.md`), zodat ze niet verdwijnen. Een release mag niet stilzwijgend een bekende
afwijking meenemen zonder issue.

### Wanneer blokkeert wat?

| Soort | Ernst | Voorbeeld |
|---|---|---|
| Constitutie of veiligheid | blokkerend | echt merk of echte persoon, winter, "de Grunn", `.env`, externe URL in spelcode, geheime sleutel |
| Design system | blokkerend | nieuwe losse hex buiten de tokens, tekst onder 12 px, tweede rood, blauw accent |
| Performance | blokkerend | normovertreding (p95 > 37 ms, werktijd-p95 > 35 ms of max > 1000 ms; ADR 0037), regressie boven de baseline-tolerantie. Tijdelijke uitzondering: ring en spoor p95 <= 52 ms in de gate-set `release` (geel, status `herijkt`, `TIJDELIJKE_NORMEN` in `scripts/perf/normrules.mjs`, #1184; zie [PERF-NORM-HERIJKING-22-11.md](PERF-NORM-HERIJKING-22-11.md)); foot en de rest blijven op 37 |
| Graphics | blokkerend | zwart/leeg/kapot beeld, zichtbaar kapotte wereld, HUD buiten beeld, overlappende tekst |
| Correctheid | blokkerend | crash, save- of netwerkfout, regressie in een bestaande test |
| UI/UX/gameplay | blokkerend als de speler vastloopt; anders belangrijk | onbereikbare knop, missie onhaalbaar, onduidelijke hint |
| Stijl, smaak, kleine afwijking | belangrijk/nit | lelijke rand, tekst die net te lang is, naamgeving |

## Een release voorbereiden (draaiboek voor de coördinator)

1. **Werkboom schoon en changelog klaar.** `## [X.Y.Z]` in `CHANGELOG.md`, versie in
   `desktop/package.json`, en de release-metadata van `android/` gelijk (dat doet
   `release.sh` zelf bij de bump).
2. **Gate draaien.** `node scripts/release_gate.mjs --stage=auto --from=<vorige tag>`.
   Dit duurt ongeveer 45-75 minuten (zonder wereldfase) en schrijft het bewijs.
3. **Review voorbereiden en laten invullen.** `--stage=review` (pakket), reviewers parallel
   (stap 2 hierboven), daarna `--stage=review --finalize`.
4. **Fixlus** tot de triage groen is (stap 4 hierboven).
5. **Gate-verificatie.** `node scripts/release_gate.mjs --verify` moet groen zijn op HEAD.
   `desktop/release.sh` doet deze controle zelf; zonder groen rapport stopt hij.
6. **Eigenaar-review: 20 screenshots (laatste stap vóór `desktop/release.sh`).** Zie hieronder.
7. **Release.** `cd desktop && npm run release -- minor|patch --world` (zoals altijd; de
   eigenaar publiceert, agents niet).
8. **Wat niet gedraaid is, staat als "niet getest" in het issue.** De gate liegt daar niet over.

### Eigenaar-review: 20 screenshots

De laatste stap vóór `desktop/release.sh`; `release_gate.mjs --verify` keurt een release pas met dit bewijs.

1. **Eerst DS3-conformiteit groen.** `ds3_dekking_test` en `ds3_ratel_test`, `rules_audit` met 0 blokkerend, `keycap_maat_test` en de keycapmeting, en de DS3-compliance-review. Zonder dat vraagt de coördinator de eigenaar niet te kijken.
2. **Twintig echte screenshots.** De coördinator maakt met één Electron-instantie (na de grote sweep, dus nooit tegelijk met een fps-meting) 20 in-game screenshots op 1920x1080, waar zinvol ook op 1280x720, van AFGEROND UI/UX-werk. Kies uit: startkeuze en Samen-naamkaart, laadscherm, HUD met minimap-doel en wanted-weergave, HUD-meldingen met balkje, kaart met popups en reis, Spullen-galerij met kleding en kapper, Bezit (kaartlaag, perceelkaart, beheerscherm), het voetbalcarrière-scherm, de vertrekbordtijdlijn, de tuninggarage, een interieur van binnen, de eindkaart en prestatietoast, de recapkaart en een cutsceneframe.
3. **Feedback van de eigenaar.** Blokkerende feedback wordt eerst verwerkt; daarna maakt de coördinator zo nodig nieuwe screenshots van wat veranderde.
4. **Bewijsbestand.** De coördinator schrijft `release/owner-review.json`: `{ "datum": "JJJJ-MM-DD", "aantal": 20, "status": "akkoord" of "feedback verwerkt", "bestanden": ["...png", ...] }`. `--verify` eist een geldige datum (niet in de toekomst), minstens 20 screenshots met evenveel genoemde bestanden en een van die twee statussen, en toont de regel `owner_review` in de uitvoer.
5. **Nooduitgang.** `GDE_RELEASE_SKIP_OWNERREVIEW=1` slaat de controle over, luid in de uitvoer, en alleen met akkoord van de eigenaar.

De logica is puur en getest in `scripts/release_ownerreview_test.mjs` (`scripts/release/ownerreview.mjs`).

### release.sh en de nooduitgang

`desktop/release.sh` verifieert de gate twee keer: eerst direct na de schone-werkboomcontrole
(strikt op de commit waarop de gate is gedraaid), en na de versiecommit nog eens met
`--verify --allow-release-commit`. Die tweede controle mag de versiecommit negeren omdat die
alleen release-metadata raakt (`desktop/package*.json`, `android/package*.json`, `CHANGELOG.md`);
de review moet wél op de code-commit staan. Zonder groen bewijs bouwt het script niet. Is de
gate groen, dan slaat `release.sh` de losse `run_tests`-stap over: die zit al in de fase static
en dubbel draaien kost alleen tijd.

Nooduitgang voor een hotfix door de eigenaar: `GDE_RELEASE_SKIP_GATE=1`. Dat staat luid in de
uitvoer en laat het rapport "niet gedraaid" zien; het is geen stille optie. De bestaande
nooduitgang voor de tests (`GDE_RELEASE_SKIP_TESTS=1`) blijft apart bestaan.

## Baselines beheren

De gate vergelijkt met twee gecommitte baselines:

- `scripts/release/baselines/perf-baseline.json` - per route de vorige gemeten waarden, met
  machine, datum, commit en reden.
- `scripts/release/baselines/visual-baseline.json` - per beeld een compacte vingerafdruk
  (32x18 helderheidsraster + dHash); de beelden zelf blijven buiten git.

Een baseline bijwerken mag alleen bewust, na een groene meting en na de review:

```
node scripts/release_gate.mjs --stage=perf  --update-baseline   # schrijft perf-baseline
node scripts/release_gate.mjs --stage=visual --update-baseline  # schrijft visual-baseline
```

De perf-baseline wordt alleen geschreven als alle routes de norm halen en er een reden is
(`GDE_BASELINE_REDEN=<tekst>`); de beeldbaseline alleen als er geen auto-fouten zijn. Beide
staan in dezelfde commit als de release waarin ze zijn vastgelegd, met de reden erbij. Zo is
"het is nu eenmaal zo" nooit een stille baseline-update.

Eerste keer: de baseline is leeg. De eerste gate stelt dan geen regressie vast en zegt dat
expliciet; na een groene release met review leg je de baseline vast.

## Kosten en besparing

De gate is gebouwd om weinig mens en weinig tokens te kosten:

- **Alleen de diff.** Code review gaat over de wijziging sinds de vorige tag, niet over de hele
  repo. Reviewers krijgen een begrensde diff (max 4000 regels) en alleen hun eigen aspect.
- **Alleen de beelden die iets zeggen.** De beeldbaseline filtert onveranderde beelden weg;
  de AI ziet een handvol contactbladen plus de volledige versie van wat veranderde of verdacht
  is (standaard max 36 beelden, 4 contactbladen van 9). Dat zijn 4-12 afbeeldingen per release
  in plaats van 150+ losse beelden.
- **Parallel.** Reviewers en beeldsets draaien naast elkaar; de coördinator wacht, niet de mens.
- **Slimme fasekeuze.** Een patch release zonder wereldwijziging slaat de wereldfase (20-60
  min) over. Een UI-wijziging vraagt geen wereldcheck, een wereldwijziging vraagt wel perf en
  beeld.
- **Bestaand bewijs hergebruiken.** `--perf-json=<paden>` en `--images=<mappen>` nemen de
  uitvoer van een al gedraaide `test_all --fase=electron` over; niets wordt dubbel gedraaid.

Grove schatting per release (gemeten werkelijk pas na de eerste runs; de gate schrijft de echte
duur in het rapport):

| Soort release | Deterministisch | AI-review | Totaal (parallel) |
|---|---|---|---|
| patch, geen wereld | 35-50 min | 5-15 min | 45-70 min |
| release met wereldwijziging | 60-110 min | 5-15 min | 70-125 min |
| alleen documentatie/tooling | 3-8 min | 2-5 min | 5-15 min |

Dat is minder dan de oude volledige Electron-poort (1,5 tot 2 uur) én het dekt performance,
design system, regels en review, die daarvoor niet structureel werden gecontroleerd.

## Wat de gate niet doet (eerlijk)

- **Smaak, gevoel en audio.** Of een grap leuk is, of muziek past en of de besturing lekker
  voelt, beoordeelt de AI alleen op bewijs (beeld/beeldverandering), niet als speler. Deze
  punten blijven "niet getest" of gaan naar een playtest-issue.
- **Hardware en omgeving.** De perf-meting geldt voor de machine waarop gemeten is; een andere
  machine geeft "onbeslist" in plaats van een valse regressie. De eerste echte run op een
  Steam Deck of een Android-toestel blijft nodig (zie `docs/RELEASEN.md`).
- **Beeldkwaliteit op detailniveau.** Een contactblad op 480 px ziet geen 1-pixel z-fighting;
  daarom opent de reviewer ook de volledige beelden die de baseline als gewijzigd aanwijst.
- **De wet, merkenregister en credits.** `publish_check`, `secrets_scan` en `merkenregister_check`
  draaien mee, maar de eigenaarsbesluiten (IARC, Steam, licentie-onderbouwing) blijven bij de
  eigenaar.
- **Publiceren.** De gate is een technische poort vóór de release; pushen, taggen en publiceren
  doet de eigenaar (constitutie 8, ADR 0014).

## Bestanden

| Bestand | Rol |
|---|---|
| `scripts/release_gate.mjs` | de orchestrator: plan, fasen, rapport, `--verify` |
| `scripts/release/ownerreview.mjs` | de eigenaar-review: eisen aan `release/owner-review.json` (20 screenshots, feedback verwerkt) |
| `scripts/release/stages.mjs` | pure plan- en verdictlogica (getest zonder Electron) |
| `scripts/release/perf_gate.mjs` | norm- en baselinevergelijking voor perf |
| `scripts/release/visual_gate.mjs` en `contactsheet.mjs` | beeldchecks, baseline, contactbladen en reviewpakket |
| `scripts/release/visual-sets.json` | welke bestaande QA-rondes de beeldfase draait (met vaste argumenten en tijdlimiet) |
| `scripts/release/findings-schema.json` | de bindende vorm van een bevinding en een reviewrapport |
| `scripts/release/rules_audit.mjs` en `design_rules.mjs` | constitutie- en designcontrole op de diff |
| `scripts/release/review_pack.mjs` | het reviewpakket uit de diff |
| `scripts/release/findings.mjs` | validatie, triage, issue-concepten en de reviewpoort |
| `scripts/release/prompts/` | de vaste opdrachten voor de AI-reviewers |
| `scripts/cutscene_lint.mjs`, `cutscene_review_pack.mjs`, `ui/cutscene_render.mjs` | het cutscene-kwaliteitssysteem (zie "Cutscenes" hieronder) |
| `scripts/release/baselines/` | de gecommitte perf- en beeldbaselines |
| `scripts/release_gate_test.mjs` e.a. | de tests van deze keten (draaien mee in `run_tests`) |

## Testen van de keten zelf

```
node scripts/release_gate_test.mjs
node scripts/release_perf_test.mjs
node scripts/release_visual_test.mjs
node scripts/release_findings_test.mjs
node scripts/release_reviewpack_test.mjs
node scripts/release_designrules_test.mjs
```

Deze tests draaien zonder Electron, wereld of netwerk, en zitten automatisch in
`run_tests.mjs` en de lichte fase van `test_all.mjs`. De **Electron-kant** (beelden maken,
perf meten) is hier niet te testen: dat bewijst de eerste echte releasegate-run op de machine
van de eigenaar. Tot die tijd heet dat deel "niet getest".

## Beeldregressie per scherm (#994)

`node scripts/ui/beeldregressie.mjs` vergelijkt per scherm een nieuw beeld met een goedgekeurde referentie in `docs/beeldreferentie/` (`<formaat>-<scherm>.png`), in drie formaten (1280x800, 1920x1080 en 4K, 3840x2160; andere maten met `--sizes`) en twee standen (vol en Rustig drukwerk, `<formaat>-<scherm>--rustig.png`). Het script heeft geen afhankelijkheden (eigen PNG-lezer, `scripts/lib/pngdiff.mjs`).

- `--run` maakt de beelden per formaat en per stand (`--modi=vol,rustig`; `ui_shots.mjs --rustig` zet de instelling `rustigDrukwerk` aan in het wegwerpprofiel). De releasegate draait dit als set `beeldregressie` in `scripts/release/visual-sets.json` met `"streng": true`: een afwijking boven de drempel (exit 1) laat de stage visual falen, ontbrekende voorwaarden (geen Electron of wereld) slaan hem over. Voor de rest maakt `--run` de beelden van de eerste set (vijf schermen: garage, te doen, verhaal, telefoon en de Samen spelen-hub) met `scripts/ui_shots.mjs`; `--run --groep=<id>` een andere groep (`momenten`: de vijf grote schermmomenten uit #996; `afronding`, `hud`, `kaart`, `samen-gast`; komma's of `alle` voor meer; de releasegate draait `eerste-set` en `momenten`); `--lijst` toont ze. Een Electron-run gaat via het slot: `node desktop/build/slots/slot.mjs run ds -- node scripts/ui/beeldregressie.mjs --run`.
- `--vergelijk` zet een uitvoermap (standaard `.beeldregressie/uit`) naast de referenties. Een pixel telt als afwijkend bij meer dan `--tolerantie` (standaard 8 van 255 per kanaal); een scherm faalt bij meer dan `--drempel` afwijkende pixels (standaard 0,5 procent). Bij een afwijking staat een diffbeeld in `<uit>-diff/`. Exit 1 bij een afwijking of een referentie zonder nieuw beeld; een beeld zonder referentie is alleen een melding (`--streng` maakt er een fout van).
- `--ververs [--only=a,b]` zet de beelden uit de uitvoermap als nieuwe referentie. Alleen met die vlag worden referenties aangemaakt of bijgewerkt, en alleen na een keuring van het beeld.
- De gastweergave van Samen spelen is een eigen groep (`samen-gast`).
- Puur getest: `node scripts/beeldregressie_test.mjs`. Referenties zijn er nog niet (eerste Electron-run en keuring volgen); zonder referentie meldt het script alleen "nieuw".

## Cutscenes: vier lagen, de eigenaar hoeft niet per scène te kijken

Het cutscene-kwaliteitssysteem dwingt tekst, camera en visuele logica van cutscenes automatisch af. Regie-bijbel: `docs/CUTSCENE-REGIE-21-11.md`; uitkomsten van de eerste meting: `docs/CUTSCENE-AUDIT-21-11.md`.

| Laag | Wat | Wanneer | Bestanden |
|---|---|---|---|
| 1. Bijbel en regels | de vaste shot-taal en de regels voor camera, tekst en visuele logica | altijd, ingebakken in de linter | `docs/CUTSCENE-REGIE-21-11.md`, `scripts/lib/cutscene_lint.mjs` (RULES) |
| 2. Statische linter | alle cutscenes toetsen zonder game, per cutscene blokkerend, belangrijk of nit en een score; streng voor alle cutscenes (geen baseline): blokkerend blokkeert, belangrijk en nit tellen in de score, een bewuste uitzondering staat met reden in `scripts/release/cutscene-uitzonderingen.json` | in de static-fase van de gate (`--strict`); `test_all` en `run_tests` melden alleen (`cutscene-lint.json` in de runmap) | `scripts/cutscene_lint.mjs`, `scripts/cutscene_lint_basis.json` |
| 3. Gerenderde controle | elke cutscene in Electron afspelen, drie frames per shot, zwart beeld, camera in geometrie, spreker op het scherm, ondertitel over de spreker, luminantiesprong, bevroren camera | door de coördinator, niet in de lichte fase | `scripts/ui/cutscene_render.mjs`, `scripts/lib/cutscene_measure.mjs` |
| 4. AI-review | reviewpakket per cutscene, een panel van drie onafhankelijke reviewers | als aspect `cutscenes` (verplicht bij gewijzigde cutscene-code of scripttekst) | `scripts/cutscene_review_pack.mjs`, `scripts/release/prompts/cutscene-review.md` |

**Streng voor alles (eigenaar-besluit 21-11).** De regels gelden voor alle cutscenes, ook de bestaande; er is geen baseline en geen stille schuld. De static-fase faalt bij elke blokkerende vondst. Waar een regel bij een bestaande cutscene bewust niet geldt, staat een uitzondering met reden en akkoord in `scripts/release/cutscene-uitzonderingen.json` (een uitzondering zonder reden, voor een onbekende regel of zonder vondst om te dekken is zelf een fout). Overgang: alleen `blokkerend` blokkeert, `belangrijk` en `nit` tellen mee in de score. De release wordt pas groen als de faallijst (`node scripts/cutscene_lint.mjs --lijst=docs/CUTSCENE-FAALLIJST-21-11.md`) leeg of uitgezonderd is; de verhaal-lead (epic-verhaal-21-11, WP15 #1138 regie en WP11 #1134 dialoogvorm) werkt hem weg. `test_all` en `run_tests` melden de lijst alleen, anders faalt elke PR op de bestaande schuld.

**Laag 3 draaien (coördinator, één Electron-instantie, na `cd desktop && npm run stage`):**
`node scripts/ui/cutscene_render.mjs [--only=M01,M02.intro]`. De frames, `measure.json` en de contactbladen (rij = shot, kolommen = begin, midden, eind) komen in `docs/beeld-21-11/cutscenes/<id>/`, het totaal in `render-report.json`. Zonder Electron: `--simulate` (alleen de projectiemetingen op de bemonsterde scènes); `--analyse=<runmap>` beoordeelt een eerdere run opnieuw.

**Laag 4 draaien:**
1. `node scripts/cutscene_review_pack.mjs --changed=<vorige tag> --panel=3` maakt per gewijzigde cutscene `review/<id>/pack.md` (script, shotlijst, lintvondsten, de contactbladen van laag 3 als ze er zijn) en drie opdrachten per cutscene in `review/panel/<id>/reviewer-1..3.md`.
2. Start per opdracht een vision-reviewer (agent); elke reviewer schrijft één `uitvoer-<id>-r<k>.json` volgens het voorbeeld in het pakket (scores, bevindingen, humoroordelen). Reviewers zien elkaars uitvoer niet.
3. `node scripts/cutscene_review_pack.mjs --collect=<map met uitvoer> --commit=<sha>` voegt het panel samen: `bevindingen.json` (reviewrapport voor `--stage=review --finalize`, aspect `cutscenes`; een bevinding van één van drie reviewers komt als nit mee), `bevindingen.md` (lijst voor issues) en per akte `humor-veto-akte<N>.md`.

**Humor is smaak.** De linter en het pakket beoordelen een grap nooit als goed of slecht: alleen structuur (grap uitgelegd, geen ruimte na de punch) en een label `humor-review` op komische beats. Het panel kiest per beat `behouden`, `aanpassen` (met een variant) of `schrappen` met een reden en een zekerheid; de meerderheid beslist en bij een gelijke stand blijft de grap zoals hij is. De eigenaar krijgt alleen de vetolijst: gevoelige en onzekere gevallen bovenaan, daarna wat het panel koos; wat hij niet aanvinkt, staat.

**Nieuwe scènes regisseren niet met de hand.** Een spec met `direct: { lines: [{ on, emotion, kind, to, humor }] }` laat de regie-engine (`game/js/cutdirector.js`) de camera kiezen: schouder en tegenschouder, close-up op emotie, een reactie na een belofte of ontboezeming, ruimte na een punch. Het is opt-in; geen bestaande scène gebruikt het.

Samen spelen: alleen data en scripts; een gast speelt dezelfde cutscene-data en wordt niet apart gecontroleerd.
