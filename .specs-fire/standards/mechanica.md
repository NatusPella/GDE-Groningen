# Spec: Spelmechanica

> Canonieke spec. Vervangt de regelinhoud van `docs/LOOPBAAN.md`, `docs/BOERDERIJ.md`,
> `docs/VLIEGSCHOOL.md`, `docs/GELUID.md`, `docs/MUZIEK.md` en de archiefrapporten over prestaties,
> onboarding en weer; die blijven naslag. De code is de waarheid; `AGENTS.md` wint bij twijfel.

## Doel

Reikwijdte: loopbaan en bijbanen, hengelen, boerderij, vliegschool, de losse minigames, geluid en
muziek, prestaties en kwaliteitsstanden, weer en dag/nacht, en de uitleg. Elk systeem heeft een pure
regelmodule zonder THREE, DOM of klok, een eigen `scripts/<onderwerp>_test.mjs` en de glue ernaast.
Getallen staan in de regelmodule. Een levenslang profiel (loopbaan, visboek, boerderij, prestaties)
staat in zijn eigen `gde-*`-sleutel, nooit in een savegame.

## Loopbaan en vakken

**Doel.** Elk vak betaalt beter als je het vaker en gevarieerder doet.

**Regels.** Negentien vakken in drie groepen (`game/js/loopbaan.js:32`), niveau 1 tot 6 met drempels
0/50/140/300/560/950 (`:15`) en loonfactor 1,00 tot 1,30 (`:18`). Een nieuwe plek geeft 8 punten
(`:20`); `STAT_VAK` hangt prestatietellers aan een vak met €10 tot €20 premie (`:191`). Elke
uitbetaling loopt via `loopbaanVerdien` (`game/js/loopbaanlive.js:156`) of `loopbaanTel`; nooit
`w.money +=` naast een haak, en een nieuwe haak komt in `haken` van `loopbaan_balans_test.mjs`. De
eerste klus staat in `START` (`:122`, #431). Opslag `gde-loopbaan-v1`
(`game/js/storagekeys.js:77`). Samen spelen: de gastheer deelt `{ vak, basis, xp }` vóór zijn eigen
factor (`loopbaanDeel`, `:150`), de gast past zijn eigen factor toe (`loopbaanGast`, `:190`).

**Bestanden.** `loopbaan.js`, `loopbaanlive.js`, `loopbaanui.js`; haken in `sidejobs.js`,
`vliegschool.js`, `padel.js`, `kermis.js`, `carbid.js`, `driftzone.js`, `postgame.js`.

**Tests.** `loopbaan_test.mjs`, `loopbaan_balans_test.mjs`, `loopbaan_coop_test.mjs`,
`loopbaanstart_test.mjs`.

## Vracht (bijbaan)

**Doel.** Een rondje vracht: achteruit onder de oplegger, koppelen, laden, naar de afnemer, lossen.

**Regels.** Vier contracttypes met eigen tarief per km, laad- en lostijd en toeslag
(`game/js/vrachtmarkt.js`); `maakAanbod(seed, km, niveau)` is deterministisch en geeft drie
verschillende aanbiedingen. Het loon is `km × tarief + toeslag`, met dezelfde laadschade-factor
als voorheen, en loopt via `completeRound`/`loopbaanVerdien` (nooit `w.money +=`). De laad- en
lostijd zitten in `c.timeLeft`, dus wachten laat de rit niet falen; lossen kan alleen bij de
afnemer. De markt is deterministisch per seed, de afstand komt uit de wereld. Host-only: een gast
kan de baan niet starten; het bestaande gastgat loopt via #365/#371.

**Bestanden.** `vrachtmarkt.js`, `sidejob_vracht.js`, `semitrailer.js`.

**Tests.** `vrachtmarkt_test.mjs`, `semitrailer_test.mjs`, `sidejob_glyph_test.mjs`.

## Trein (machinist)

**Doel.** Een machinistendienst rijden met echte reizigers.

**Regels.** `game/js/machinistrules.js` telt per halte deterministisch in- en uitstappers uit de
perrondrukte (1-8 wachtenden) en de capaciteit (90); op de laatste halte stapt niemand meer in.
Een kaartje is €0,70 per meegereden reiziger per halte. `stepService` boekt het kaartgeld,
`finish` en `payFor` nemen het mee, en de uitbetaling loopt via `loopbaanVerdien('trein', …)`.
Het bord toont het aantal reizigers en per stop de in- en uitstappers. De gastheer is
machinist; `cooptrein.js` koppelt gasten aan een wagen, de eerste gast is conducteur
(O deuren, K waakzaamheid), volgende gasten passagier. Elk crewlid krijgt het volle bedrag
en de xp via `splitReward`/`coopDeel`; de gastheer houdt zijn eigen `loopbaanVerdien`.
Zelf de trein besturen kan een gast niet.

**Bestanden.** `machinistrules.js`, `machinist.js`, `treincabine.js`, `traindrive.js`,
`cooptrein.js`, `treincoop.js`.

**Tests.** `machinist_test.mjs`, `simdienst_test.mjs`, `dienstregeling_test.mjs`,
`treincabine_test.mjs`, `gasttrein_test.mjs`, `cooptrein_test.mjs`,
`coop/treincoop_test.mjs`.

## Hengelen en vissen

**Doel.** Op elk water van de provincie vrij hengelen; het meer in Meerstad houdt zijn wedstrijd.

**Regels.** Je staat binnen 3,2 m van de kant of ligt bijna stil met een boot
(`game/js/hengelplek.js:10`). De wedstrijd duurt 90 s (`game/js/hengelrules.js:8`), vrij hengelen
kent geen klok. Zeven watertypen en 29 soorten (`game/js/visdata.js:8`, `:32`); nacht, schemer en
regen verschuiven de gewichten (`:93`). Een vangst is `(0,2 + 0,2 × kg) × zeldzaamheid (1 tot 8) ×
groei (max 1,8)` (`:123`), uitbetaald via `loopbaanVerdien` met `deel: false`
(`game/js/hengelen.js:96`). Opslag `gde-visboek-v1` (`storagekeys.js:79`).

**Bestanden.** `hengelen.js`, `hengelrules.js`, `hengelplek.js`, `visdata.js`, `visboek.js`,
`visboeklive.js`, `visboekui.js`, `hengelanim.js`.

**Tests.** `vis_test.mjs`, `minigames3_test.mjs` (de wedstrijd), `coophengelboot_test.mjs`.

## Boerderij

**Doel.** Eén akker bij Hoogkerk in vaste stappen: ploegen, zaaien, bemesten, groeien, oogsten,
afleveren.

**Regels.** Vier gewassen met eigen zaaigoed, groeitijd, opbrengst en een basisprijs per kg
(`game/js/boerderij.js:21`); de verkoopprijs per gewas is een dagprijs uit `game/js/gewasmarkt.js`
(binnen twintig procent van de basis, dag nul is de basis, per speler uit zijn eigen `b.uren`), en
`leverVracht` verkoopt daartegen. Een speldag is 24 minuten (`game/js/daynight.js:12`). Groei telt in
speluren uit `world.clock` (`game/js/boerderijlive.js:72`). Machines huur je per keer of koop je
(`:34`); een ronde levert ongeveer €300 tot €350 winst op, en de verkoop loopt via
`loopbaanVerdien`. Opslag `gde-boerderij-v1` (`storagekeys.js:81`). Samen spelen: een gast werkt op
zijn eigen akker als lokale minigame (`game/js/boerderijgast.js:1`), zijn gewas en contracten lopen
met de hostklok mee, maar leveren doet hij in zijn eigen spel. Leveringscontracten
(`game/js/boerderijcontracten.js`): per speldag een aanbod per gewas, max. 3 actief, deellevering
telt, de bonus gaat via `loopbaanVerdien('landbouw', …)` met `deel: false`, verlopen kost niets.

**Bestanden.** `boerderij.js`, `boerderijlive.js`, `boerderijui.js`, `boerderijwereld.js`,
`boerderijgast.js`, `percelen.js`, `machines.js`, `werktuigen.js`, `werktuigen3d.js`,
`sidejob_boerderij.js`, `gewasmarkt.js`, `boerderijcontracten.js`.

**Tests.** `boerderij_test.mjs`, `gewasmarkt_test.mjs`, `boerderijcontracten_test.mjs`,
`percelen_test.mjs`, `machines_test.mjs`, `werktuigen_test.mjs`, `boerderijwereld_test.mjs`,
`boerderijgast_test.mjs`, `boerderijui_machines_test.mjs`.

## Vliegschool

**Doel.** Twintig lessen bij Eelde met het vliegtuig of de helikopter, elk met een medaille.

**Regels.** Elf vliegtuig- en negen helikopterlessen (`game/js/vliegschoolrules.js:34`); de
basislessen staan in `vliegbasis.js`. Een medaille betaalt €25, €40 of €60, alleen de eerste keer;
opnieuw doen geeft 6 punten, een les zonder medaille 2. Records staan onder `vlieg-<les>`; een crash
kost niets. De banen komen uit `game/vliegplekken.json`.

**Bestanden.** `vliegschoolrules.js`, `vliegbasis.js`, `vliegschool.js`, `instrumenten.js`.

**Tests.** `vliegschool_test.mjs` (vliegt elke vliegtuigles met de piloot), `instrumenten_test.mjs`.

## Discgolf, skatepark en de andere minigames

**Doel.** Losse activiteiten in de hub, elk met een pure kern en een eigen bediening.

**Regels.** Discgolf: negen holes in het Stadspark, medailles op +6, +1 en −2 slagen tegen par
(`game/js/discgolfrules.js:32`), water kost een slag. Skatepark: een run van 90 s, medailles bij
1200, 3200 en 6500 punten (`game/js/skatetricks.js:19`). Pitch en putt: zes holes, medailles op +7,
+3 en 0 (`game/js/puttinglogic.js:34`). Gratis, B of Backspace stopt, één bord bovenin via
`minigamekit.js`.

**Bestanden.** `discgolfrules.js` + `discgolf.js`, `skatetricks.js` + `skatepark.js`,
`puttinglogic.js` + `pitchputt.js`, `golfetiquette.js`, `activities.js`, `standactivity.js`,
`activitykit.js`, `minigamekit.js`.

**Tests.** `minigames_test.mjs`, `minigames3_test.mjs`, `golfbeurt_test.mjs`,
`golfetiquette_test.mjs`, `padelrules_test.mjs`.

## Gevecht

**Doel.** Melee met gewicht: een reeks slagen die oploopt zolang je raakt.

**Regels.** `game/js/meleecombo.js` houdt per aanvaller én per wapen een stand bij: de tweede slag
binnen 0,8 s na een treffer doet ×1,15, de derde ×1,40 met +0,20 knock; een misser of een
wapenwissel zet de reeks terug. `combat.js` past de factor toe in `meleeHit`, dus ook voor de gast
via `gastAanvalUitvoeren`/`gastSlagLanding`; de camera-schok en het geluid houden de originele
waarden. Geen bloed of gore toevoegen; PvP houdt zijn eigen cap.

**Bestanden.** `meleecombo.js`, `combat.js`, `weapons.js`.

**Tests.** `meleecombo_test.mjs`, `coopwapen_test.mjs`, `cooppvp_test.mjs`, `gamefeel_test.mjs`.

## Geluid en muziek

**Doel.** Eén mix met effecten, spraak en muziek, en één radiozender.

**Regels.** Het meeste geluid wordt gesynthetiseerd; een paar CC0-opnames staan ernaast, beschreven
in `game/audio/sfx/manifest.json`. De radio is G-Music met vier programmablokken
(`game/js/musicpick.js:129`), een dag- en een nachtpool; een nummer uit de laatste 60% van de pool
komt niet terug (`:87`), in 60% van de overgangen zit een jingle (`:118`). Stings zijn procedureel
(`game/js/stings.js`): nooit twee tegelijk, 0,6 s afkoeling (`:10`), en de radio gaat er 45% zachter
van (`game/js/audio.js:1755`).

**Bestanden.** `audio.js`, `sfx/samples.js`, `sfx/mixplan.js`, `musicpick.js`, `radio.js`,
`stings.js`.

**Tests.** `sfx_test.mjs`, `sfxsamples_test.mjs`, `stings_test.mjs`, `music_pick_test.mjs`,
`minigamefoley_test.mjs`.

## Prestaties en kwaliteitsstanden

**Doel.** Levenslange prestaties per speler, en beeld dat zich aanpast.

**Regels.** Prestaties staan in `gde-prestaties-v1` (`storagekeys.js:27`); tellers lopen via
`recordStat` (`game/js/achievements.js:445`) en de gate (`:379`) zet ze stil bij een streek. Vier
presets: laag, middel, vlot en hoog (`game/js/gfxprofile.js:9`). Automatische kwaliteit beoordeelt
elke seconde op de mediaan, traag boven 27 ms (`:271`), schaalt de resolutie tot 50% (`:270`) en kent
cpuniveau 0 tot 3 (`:273`); `simload.js` volgt dat niveau voor verkeer en voetgangers.

**Bestanden.** `achievements.js`, `gfxprofile.js`, `simload.js`, `viewdist.js`, `settings.js`.

**Tests.** `prestaties_test.mjs`, `gfx_profile_test.mjs`, `viewdist_test.mjs`.

## Weer, dag en nacht

**Doel.** Altijd zomer, één klok, en een hemel die bij het weer past.

**Regels.** Zes weertypen: helder, bewolkt, mist, motregen, regenbui en onweer
(`game/js/weatherstate.js:18`); sneeuw, ijs en vorst bestaan niet. De dag duurt 24 minuten
(`daynight.js:12`). Sterren en maan volgen `cover = max(storm, bewolkt × 1,5, mist)`
(`game/js/scene3d.js:3956`). Een gast volgt het weer en de dagstand van de gastheer (#378).

**Bestanden.** `weatherstate.js`, `weerdag.js`, `sunrules.js`, `daynight.js`, `sky3d.js`,
`scene3d.js`.

**Tests.** `weerdag_test.mjs`, `weernacht_test.mjs`, `weerlook_test.mjs`, `coopweer_test.mjs`;
beeldcontrole met `scripts/qa/weer_nacht.mjs`.

## Uitleg en onboarding

**Doel.** De eerste tien minuten begrijpelijk zonder uitleg van buiten, zonder tutorial die het
spelen tegenhoudt.

**Regels.** Vijf kaarten in vaste volgorde (`game/js/onboarding.js:45`), elk één keer per apparaat; de vijfde vertelt na de eerste missie dat Samen spelen onder Esc zit
onder `gde-uitleg` (`storagekeys.js:37`). Eén tegelijk: alleen als de narrative-planner het toelaat,
er niets speelt en de speler niet in een missie, bijbaan of minigame zit; 12 s na de opening, 30 s
ertussen. Uit te zetten met `onboardingTips`; de toetshints (`prompts.js`) dekken alleen wat niet
vanzelf spreekt.

**Bestanden.** `onboarding.js`, `prompts.js`, `hudcards.js`, `narrative.js`.

**Tests.** Geen eigen test; alleen de schakelaar `onboardingTips` wordt gedekt door
`spelmenu_test.mjs`.

## Meten

De bron is `docs/PERF-METING-2026-10-19.md` (#4). Een nieuwe meting krijgt een eigen gedateerd
document in `docs/`; nooit bijschrijven in een oude meting. `docs/archief/2026-10/PERF-PROFIEL.md` is
historisch (0.24, vóór de tegels). Herhalen met `node scripts/perf/run.mjs <naam> <preset>` op een
gestagede build, en `scripts/perf/abpair.mjs` voor een gepaard verschil; alleen een paar
standaardfouten telt. De machine was nooit leeg; absolute ms zijn ruw en verhoudingen niet (`:23`).
Conflicten in één regel: de samenvatting noemt draw calls de grootste post (`:161`), terwijl Vervolg 9
een draw call op circa 2 µs zet en 46% minder draw calls maar 0,7 ms oplevert (`:417`); de vervolgen
zijn de latere meting (#477).

## Regels voor een nieuw systeem

1. Pure regelmodule zonder THREE, DOM of klok, met een eigen `scripts/<onderwerp>_test.mjs`; de
   glue ernaast tekent en voedt.
2. Alle getallen in die ene module; de UI en de glue lezen ze, kopiëren ze nooit.
3. Eén waarheid: geen tweede teller, geen tweede opslagsleutel, geen tweede economie. Geld via
   `loopbaanVerdien`, tellers via `recordStat`.
4. Elke missie, bijbaan of minigame krijgt een regel over Samen spelen: per speler of per wereld,
   wat een gast ziet, wie de beloning krijgt, en welke test dat dekt.
5. Opslag als `gde-<onderwerp>-v1` in `storagekeys.js`; een levenslang profiel nooit in een
   savegame; kapotte data geeft een geldig leeg profiel (`normaliseer`).
6. Een Nederlandse regel onder `[Unreleased]` in `CHANGELOG.md`.
7. Bewijs: `node --check`, de eigen test, en bij spelertekst `voice_coverage` en `text_audit`.

## Open punten (met issue)

- Loopbaan, boerderij en vliegschool lopen achter op de code: `docs/BOERDERIJ.md:25` noemt twee
  gewassen, `boerderij.js:18` heeft er vier; `docs/LOOPBAAN.md` mist de start van een vak (#431).
  (#473)
- `docs/PERF-METING-2026-10-19.md` spreekt zichzelf tegen over de grootste kostenpost (#477).
- De audiowieken staan op de hoofdthread: `audio` piekte op 1945 ms in de ringroute (#482).
- Gast en boerderijgroei: de documentatie zegt dat een gast zijn gewassen niet ziet groeien, maar
  `main.js:723` roept `boerderijTijd` ook op het gastpad aan (#471).
- Twee testrunners naast elkaar (#481): `scripts/run_tests.mjs` en `scripts/test_all.mjs`.
