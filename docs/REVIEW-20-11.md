# AI-codereview van de wijzigingen van 20-11 (898c33a16 tot main)

> **Status:** onafhankelijke review voor de releasegate (ADR [0034](../.specs-fire/standards/adr/0034-ai-releasegate-met-bewijs.md), [RELEASEGATE.md](RELEASEGATE.md)).
> Alleen gelezen, niets gewijzigd. Basis: `git diff 898c33a16..main` (59 commits, 251 bestanden, ca. 7200 regels erbij).
> Gelezen: de spelcode in `game/js` die in de diff zit (scene3d, main, cameranear, openingstart, story, verhaalui, reisrit3d,
> reisrit, ritpad, ritcabine3d, stagerit, traindrive, missions, missions_akte2/3/45/6, missiedecor, pg_skutsje, kermis,
> sidejob_bieten, lobbyui, hud_panel, cutscenehost, cinehide, programwarm, rooms3d, roomspec, passages, botlogic, activitykit,
> todoui, loopbaanui, veroverdpanel), de datakant van de scripts en een steekproef van de nieuwe testscripts. Niet gelezen: de
> binaire TTS-clips, de CSS-blokken van het designsysteem (alleen op opmaak gescand) en de QA-beeldscripts onder `scripts/qa/`.
> De wegbudget-, klimtoren- en crowd-commits uit de opdracht zitten niet in deze diff (ze liggen vóór de basis); ze zijn niet
> beoordeeld.

## Uitslag

**Geen blokkerende bevinding voor een release vanmiddag.** Ik vond geen crash bij ontbrekende data, geen NaN-pad, geen
gewijzigde opslagsleutel en geen constitutieschending in de diff. Wel zes kleinere punten (hieronder, op ernst) en een paar
testgaten. Elk punt is met de code zelf nagelezen; wat ik niet kon bevestigen staat als zodanig aangemerkt.

Gedraaid (alleen lezen): `undef_check` (2453 modules, 0 problemen) en de tests `cameranear`, `ritcabine`, `ritpad`,
`openingstart`, `chasestuck`, `botdeur`, `aaa_aankleding`, `akte2_aaa`, `akte3_aaa`, `akte45_aaa`, `missiedecor`,
`passage_thin`, `todo_tijd`, `borden`, `bourtange`, `cinehide`: alle groen. De worktree waarin ik draaide staat op een nieuwer
commit dan `main` (Samen-spelen-geluiden en de release-voorbereiding erbij); de gelezen bestanden zijn daarin niet door die
latere commits veranderd.

## Wat in orde is (gecontroleerd)

- **Opslag en saves:** geen `gde-*`-sleutel toegevoegd of gewijzigd, `savegame.js` ongemoeid. De nieuwe missiestaat
  (`toastSet`, `eindDressing`, `eggMeld`, `stuckAt`) zit in runtime-`chainState()`, niet in de save. De missie-aankleding is
  data op bestaande defs (zoeken op `label`); id's, volgorde en beloning blijven. Opslaan is geblokkeerd tijdens een film
  (`savegame.js:757`), dus de opening opnieuw bekijken kan geen halve stand wegschrijven.
- **Constitutie:** geen lokale paden of persoonsnamen in de diff (de QA-scripts gebruiken `os.tmpdir()` en `GDE_PROFILE_DIR`),
  geen geheimen; tests blokkeren `localStorage` voor de echte sleutels. Spelertekst blijft Nederlands; nieuwe figuren en
  bedrijven zijn verzonnen.
- **Samen spelen:** de nieuwe aankleding, regelkaarten en stings zijn per module als lokaal beeld gedocumenteerd en de code
  doet dat ook (geen netwerkbericht, geen schrijfactie naar voortgang). Er is nergens een nieuwe `world.player` bijgekomen,
  alles gaat via `hoofdspeler(world)`. De `annuleerWachtend`-fix in `lobbyui.js:305` klopt: `transport.isOpen()` bestaat
  (`net/rtcroom.js:38`) en een nog wachtend aanbod wordt zoals eerst gesloten.
- **Prestaties per frame:** `updateCameraNear` (`scene3d.js:4205`) vraagt de grondhoogte om de 6 beelden en alleen boven 10 m;
  de vlagparse keert zonder vlag direct terug. Het filmlicht compileert extra programma's, maar alleen op het laadscherm van een
  nieuw spel, begrensd op 12 s, en `yieldToPaint` valt na 100 ms zelf door, dus het kan niet blijven hangen. De ritcabine
  gebruikt dezelfde materialen als `carinterior.js` en voegt geen lichten toe. De nieuwe HUD-schrijfacties
  (`updateLimoMeter`) zijn gedempt met een vergelijking op de vorige waarde.

## Bevindingen

### 1. Middel (voor de eerstvolgende release): de speler rijdt mee met de taxi, maar bij een rit zonder landing wordt hij niet teruggezet

- **Waar:** `game/js/reisrit3d.js:74-75` (nieuw sinds f9c06ef03: de hoofdspeler krijgt elke stap de positie van de taxi),
  `game/js/reisrit.js:309` (`if (!a) return { aangekomen: false }` zonder verplaatsing).
- **Wat:** het normale pad is goed: `landNaRit` zet de speler daarna op de bestemming. Maar bereikt de rit het einde terwijl het
  geld inmiddels onder de prijs ligt (`aankomst()` geeft dan `null`, meetbaar na een beroving tijdens de rit; de wereld loopt
  door, `pause: false`), dan blijft de speler staan op de laatste taxipositie, kilometers van waar hij betaalde, zonder te
  betalen en zonder aankomst.
- **Fix:** bewaar `{ x, y, gz }` in `begin(w)` van `bouwTaxi` en zet ze terug in `einde(w)` als er niet geland wordt, of laat
  `landNaRit` bij `!a` de speler toch op de bestemming zetten. Werk ook de nu onjuiste opmerking op `reisrit3d.js:236` bij
  ("staat stil (verborgen op je plek): de wereld verandert niet door de rit").
- **Bijzaak, nog niet bekeken:** de simulatie (verkeer, spawn, despawn) volgt nu de taxi in plaats van het startpunt, en bij
  Samen spelen zien anderen een gast zonder voertuig door de wereld glijden. Waarschijnlijk gewenst (de cabine moest daarvoor),
  maar er is geen testbankstap voor een gast die een taxi of trein neemt.

### 2. Laag: `chaseStuckStep` telt een auto voor een stoplicht of in een file als "vastgelopen"

- **Waar:** `game/js/missions.js:2275-2279`, aanroep op `:3636`.
- **Wat:** een achtervolgd voertuig dat 12 s binnen 6 m blijft telt als gestopt en de bemanning stapt uit. Alleen stappen met
  `vast` (M07, de tankwagen) hebben dit, maar een rood licht of een file van 12 s is geen vastloper.
- **Scenario:** de tankwagen staat 12 s te wachten op een kruising terwijl de speler nog ver weg is: de stap eindigt met de
  `vast`-tekst. `chasestuck_test.mjs` dekt tijd en straal, niet de afstand tot de speler.
- **Fix:** tel de klok alleen op als de speler dichtbij is (de afstand `d` is op die plek al bekend) of reset hem zolang
  `Math.abs(t.speed) > 0.3`.

### 3. Laag: de skûtsje-finishcamera en het finishpubliek leven in een moduleglobal zonder vangnet

- **Waar:** `game/js/pg_skutsje.js:44-50`, `:383-389`, `:399`.
- **Wat:** `finishBeeld` blijft na `stop()` bestaan en wordt alleen door `idle()` opgeruimd (na `FINISHCAM_SECS + 1` of als
  `leftover` weg is). Laadt de speler binnen die seconden een opslag of stopt hij naar het menu, dan wijst `finishBeeld` naar een
  publiek in een weggegooide scène en blijft de `skutsje-finish`-shot staan tot de volgende `idle`-tik.
- **Fix:** roep `ruimFinishBeeld()` ook aan waar de wereld wordt gereset, of vergelijk in `idle()` met de wereld die het beeld
  maakte.
- **Niet bevestigd:** of `idle()` na een laadactie nog voor deze wereld loopt; de aanroeper heb ik niet gevolgd.

### 4. Laag: `cameranear.js` kent `indoors`, maar `scene3d.js` geeft het altijd `false`

- **Waar:** `game/js/scene3d.js:4217` tegenover de opmerking in `cameranear.js:5-8` ("binnen ... blijft near 0,5").
- **Wat:** dat klopt nu alleen omdat de speler binnen niet hoger dan 10 m boven de grond komt, of omdat `pl.gz + pl.z` de vrije
  ruimte klein houdt, of omdat een film `cameraOverride` zet. Zet een toekomstige binnenset de speler hoog zonder `gz` mee te
  nemen, dan wordt near tot 2,5 m en knipt de camera muren dichter dan dat weg.
- **Fix:** geef `indoors` de waarde "speler in een kamer" of schrap de parameter en de opmerking. Nu geen bug; geen test dekt de
  koppeling in `scene3d.js` (de test kent alleen de pure functies).

### 5. Laag: de knop "Opening opnieuw bekijken" sluit het menu voor de reden bekend is

- **Waar:** `game/js/verhaalui.js:347-350`.
- **Wat:** `hooks.close()` draait vóór `replayOpening()`. Kan de opening nu niet (in een voertuig, missie actief, Samen spelen),
  dan sluit het menu en toont alleen een bericht van 4 s; de speler moet het menu opnieuw openen. De knop staat altijd zichtbaar.
- **Fix:** laat `replayOpening` eerst de reden teruggeven en sluit het menu alleen bij een geslaagde start, of zet de knop uit
  met de reden als hulptekst.

### 6. Laag: een object per beeld in de kermisreactie

- **Waar:** `game/js/kermis_uitslag.js` (`tikReactie`), gebruikt in `game/js/kermis.js:728`.
- **Wat:** elk beeld een nieuw object en een sluiting in `crowd.forEach` zolang de reactie loopt (2 tot 7 s). Verwaarloosbaar,
  maar wel een allocatie in een updatelus.
- **Fix:** muteer `reactie.t` in plaats van een kopie terug te geven.

## Testgaten

- **Koppelingen in `scene3d.js` zijn niet getest:** `updateCameraNear`, `updateRitCabine` en `syncTreinKader` zijn alleen
  door de pure modules gedekt (`cameranear_test`, `ritcabine_test`). Een regressie in de aanroep (bijvoorbeeld het treinkader dat
  na een rit blijft hangen) valt pas in de beeldrun op.
- **`programsPending`** (`programwarm.js`) heeft geen test, ook niet voor de `isReady()`-tak zonder
  `KHR_parallel_shader_compile`. De 12-s-grens in `main.js` houdt het veilig.
- **`replayOpening`** zelf is ongetest (alleen de pure `openingActEnd`, `openingFinish`, `openingReplayBlockers`): het terugzetten
  van speler, metgezel en klok (`story.js:623-631`) heeft geen dekking.
- **Samen spelen:** geen testbankstap voor een gast die een taxi- of treinrit neemt, en geen voor de aankleding bij een gast die
  meedoet met een missie.
- **Niet bekeken** (alleen de code gelezen, niets in beeld gezien): de kroegkamer bij de toast van M16 (`missions.js:1783-1789`:
  `playToast` krijgt de grondpositie van de speler, terwijl de kamer op `roomBaseHeight` kan liggen; of dat klopt kon ik niet
  bevestigen), het perron van M19, de kruitkelder van M20 en de bietenhal van A1.

## Advies voor de release

Release gerust door op deze diff. Bevinding 1 en 2 zijn de moeite waard om vóór de eerstvolgende release te dichten, de rest kan
met een gewone ronde mee. Kijk in de verplichte Electron-verhaaltest in elk geval naar de taxirit tot en met de landing en naar de
M16-toast met de kroegkamer: daar maakt de code een aanname die ik niet in beeld kon controleren.
