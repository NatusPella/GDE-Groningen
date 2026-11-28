# Feedback-lessen (28-11): wat spelers en de eigenaar steeds zeggen

Doel: nieuw werk (het uitgebreide verhaal van 40 tot 80 uur, loopbanen, cutscenes, UI, wereld, Samen spelen, #1357) mag niet dezelfde feedback opleveren als eerder. Dit is een compacte bundel van alle feedback die ooit op de game is gegeven, als regels ("doe X / doe nooit Y") met een controlelijst per thema. Lees de top-15 en het thema dat je raakt; loop de controlelijst af vóór je oplevert.

Geen echte namen: testers staan als "een tester", de eigenaar als "eigenaar". Bewijs is een issuenummer of een bronbestand (docs/ tenzij anders vermeld).

## Dekking en eerlijkheid

- Issues: alle 1.341 issues (open en gesloten) op titel doorzocht; labels geteld: bug 677, hertest 673, wacht-beeld 101, eigenaar 38. Ca. 75 issues volledig gelezen, waaronder #116 (69 comments), #434 tot #438, #986, #987, #1008, #1016, #1308, #1334 tot #1357, #93, #392, #536. De comments op #116 zijn bijna alleen releasemeldingen; de inhoudelijke feedback staat in aparte issues.
- Docs: 106 bestanden matchen op feedback, playtest of tester; ca. 30 gelezen (kop, samenvatting of lijst): de audits (UX/UI, speelbaarheid, verhaal, cutscenes), UI-KRITIEK (4 delen), QA-AUDIT, pop-in-, audio- en z-fight-metingen, PLAYTESTPLAN, archief/2026-10/FEEDBACK-SPEELTEST-1, beeld-21-11/feedback-menus.
- Memory (besluiten en feedback van de eigenaar): 14 bestanden gelezen.
- Niet gedaan: het ruwe transcript van de playtest van 23-10 (alleen de checklists #434 tot #438), de Discord zelf (alleen de doorgezette issues #1335 tot #1351 en de CHANGELOG), geen spel gestart. Veel audits zijn zelf "niet in beeld bekeken"; dat staat per bron.
- De aantallen per thema zijn titelmatches: richtinggevend, geen exacte telling.

## Top-15: vaakst terugkerend of duurst

1. **Sluiten zonder beeld.** Issues sloten op een pure test of regex terwijl de speler het nog zag: #883 heropend, 485 gesloten issues kregen het label hertest, de 0.66.0-push sloot 10 hertest-issues zonder beeld, #1298 (tests die niets bewijzen). Duurste fout: dezelfde bug keert elke playtest terug.
2. **Verhaal niet te volgen zonder voorkennis.** #93 ("belangrijkste bug"), #987, #123, VERHAAL-ANALYSE-21-11: te veel namen, personages "uit de lucht", doel verschuift zonder dat iemand het zegt, uitleg in monologen.
3. **Het doel is een grap of titel, geen opdracht.** "Ga naar: Het museum stond er al zo" (AUDIT-SPEELBAARHEID-23-11), #120 doel bestaat niet, #536 "Knielen" zonder uitleg, #392 enorme pop-up zonder doel.
4. **Pop-in en haperingen bij laden.** #1016, #1008, #1354, #1317, #1292, #553, #755, #786, #534, #247: vijf rondes, nog steeds. Een tegel gold te vroeg als klaar.
5. **Sprekers niet in beeld of niet aanwezig; camera in muur of voertuig.** CUTSCENE-FAALLIJST-21-11 (11 blokkerend), #149, #261, #321, #858, #1331.
6. **Figuren in voertuigen, boten of gebouwen in scènes** (op het dak, door de romp, midden in de snackwagen): CUTSCENE-ISSUES-23-11, #861, #546, #1338.
7. **Nieuwe assets zonder dekkingscontrole:** nieuwe voertuigen en mensen braken wielen, LOD, trap en gaven een staart (#1336, #1337, #1340, #1349, #1350, #1351); kale primitieven in scènes ("goedkoop", memory assets-centraal-echte-modellen); #1329, #1330.
8. **UI-tekst met fouten:** ruwe {ACCOLADES}, dubbele informatie, tekstmuren, "undefined" (#1257, UI-KRITIEK-22-11-menu, patronen P1, P8, P12), brackettekst (#626, #628).
9. **Overlap en afkapping van UI:** popup over het zicht (#1345), HUD-kaarten over elkaar (#294, #1058, duivenspot-HUD in beeld-21-11/feedback-menus), tekst die op 720p afkapt (#293).
10. **Te veel tegelijk:** geen "één ding per moment" (AUDIT-UXUI-23-11, #168, #132): prompts, uitlegkaarten, nieuwsmeldingen en doelbalk botsen.
11. **Samen spelen: de gast is toeschouwer of ziet iets anders:** geen filmpjes (#279, #318), geen marker (#368), lege straten (#280), schokkerig (#434), host-wegval (#1059, #1293), onduidelijke voortgang (#317, #429).
12. **Missies die vastlopen of overslaan:** #1341 (vastgehouden spatie sloeg de missie over), #1294 (achtervolgd voertuig blijft hangen), #1342, M05-softlock, #243 (markers niet bereikt).
13. **Wereld kaal of herhalend:** #1353 ("geen extra mensen, meer details en props"), #1328, #1326, #1333, #124, #156 (alle winkels lijken op elkaar).
14. **Geluid: stil, te hard, muziek onder spraak:** #131, #173, #117, #146, AUDIO-CUTSCENEMIX-28-11 (muziek leidt af onder spraak), AUDIO-GLITCHES-21-11, #129 (bel klinkt niet als bel).
15. **Besturing meldt niets of te veel:** Shift zonder feedback en melding pas na Escape (#435), actie-popup terwijl een klik volstaat (#1355), politie reageert op een zwaai in de lucht (#1356), rakelings telt geparkeerde auto's (#1347), ruwe toetsnamen in plaats van plaatjes (#152, #1257).

## 1. Verhaal begrijpen en context

**Terugkerende klachten**
- Het verhaal slaat soms nergens op, is niet te volgen, geen logische flow (#93). Het eigenlijke motief (een plekje vinden) komt pas in akte 5 uit hun mond (VERHAAL-ANALYSE-21-11, §1).
- De opening is alleen te volgen als je het verhaal al kent: te veel namen, plekken en voorgeschiedenis tegelijk (#987).
- 43 sprekende personages, ongeveer de helft zonder aanloop; mensen "komen uit de lucht vallen" (VERHAAL-ANALYSE, CUTSCENE-AUDIT-OPUS-21-11: Henk M06, Dijkstra M11.8).
- Uitleg door voorlezen: Tessa als samenvatter, lange uitleg-monologen in M07.1, M12.1, M13.1 (AUDIT-VERHAAL-23-11, CUTSCENE-AUDIT-OPUS).
- Hints en clues uit het escape-menu "voegen niks toe": het verhaal moet duidelijk worden doordat mensen dingen vertellen (eigenaar in VERHAAL-ANALYSE).
- Verhaallijn kiezen (oud/nieuw) onduidelijk (#123); het verhaal speelt bijna alleen in de stad (#93).
- Continuïteitsfouten: nummer 4140 vóór Jelle het uitdeelt, Tessa "Nederlandse", Tammo die "twee weken studeerde" (AUDIT-VERHAAL-23-11, A1 e.v.).
- Tics: een goede grap wordt uitgesmeerd ("Ik zeg niks" 20 keer, "Mijn juristen" 17 keer).

**Regels**
- Doe: elk personage, elke plek en elke verwijzing eerst introduceren; hoogstens twee nieuwe namen per scène; één haak en één doel per scène (#987, #1357).
- Doe: het doel is op elk moment in één zin te zeggen, door een personage in de wereld (niet door het menu), en komt terug bij elke mijlpaal.
- Doe: leg per missie vast wat de speler al gezien heeft en verwijs alleen daarnaar (#1357, 28-11).
- Doe: introduceer bijrollen via een ander personage en geef ze een eigen stem (eigenaarsbesluit 21-11).
- Nooit: uitleg als monoloog van Tessa of Tammo; geen "zoals je weet".
- Nooit: een grap op meer dan ca. 8 regels laten terugkomen, tenzij het een bewuste terugkeer is.
- Nooit: verwijzen naar een personage of plek die de speler nog niet heeft gezien.

**Controlelijst**
- [ ] Kan iemand zonder voorkennis na elke scène in één zin zeggen wat er gebeurde en wat nu moet?
- [ ] Wordt elke naam geïntroduceerd (wie, hoe verbonden, waarom belangrijk) vóór hij gebruikt wordt?
- [ ] Nieuwe namen, plekken en jargon per scène gemeten (`node scripts/audit_verhaal_stats.mjs`); hoogstens twee nieuwe namen.
- [ ] Geen beurt boven ca. 25 woorden; niemand leest de stand van het verhaal voor.
- [ ] Kalender, leeftijden en achtergrond kloppen met de personagebijbel.
- [ ] Speelt het verhaal ook buiten de stad, of is er een reden waarom niet?

## 2. Cutscenes en camera

**Terugkerende klachten**
- Camera clipt tegen gebouwen, zit in een muur of figuur, flipt (#149, #261, #858, #321, CS-C05).
- Cutscenes te statisch of lelijk; "creatiever en levendiger" (#136, #147, #722, #742 geen eigen regie, #1325).
- Acteurs lopen dwars door voertuigen of staan erin (#861; CUTSCENE-ISSUES-23-11: op het dak van de rondvaartboot, in de limo, midden in de snackwagen, in het water bij kano's).
- Regiehoogten absoluut op z=0: scènes zakken weg op dijken en viaducten (#730).
- Pop-in bij plekwissel in een scène (#1016, CUTSCENE-POPIN-22-11); cutscenes renderen soms lagere LOD (#157).
- "Spook"-voetgangers, halfdoorzichtig (#1331); cilinders als mensen (#1330).
- Skip: een vastgehouden toets sloeg de hele missie over (#1341); skip-hint met ruwe toets (#152).
- Intro-filmpje met voertuigen en objecten die niet kloppen met de nieuwe set (#1338).
- Cutscenes missen de SFX en omgeving van de plek (#1327); shots zonder beweging van 11,8 s (#224).

**Regels**
- Doe: elke scène alleen met echte spelassets: mensen via het personage- en kledingsysteem, dieren uit het dierenregister, voertuigen, props en gebouwen uit de echte bibliotheek; een nieuw prop komt in het centrale register op kwaliteitsniveau (memory assets-centraal-echte-modellen).
- Doe: loop elke scène door `cutscene_lint`, `scripts/cutscene_regie_audit.mjs --strict` (figuren in voertuigen of elkaar, camera in figuur, sprekers die wegkijken) en `cutscene_sets_audit`.
- Doe: bekijk een contactvel van de scène (headless, #1322) vóór je "klaar" zegt; regie is beeld, geen data.
- Doe: een scène die van plek wisselt krijgt `prewarm` en een nette fade; meet pop-in.
- Doe: zet muziek en SFX als data per scène (`music: 'laag'`, `cutscenesfx.js`).
- Nooit: een eigen primitief ("basic aankleding") in scènecode.
- Nooit: skippen met één druk; alleen ingedrukt houden, en test met keydown-herhaling.
- Nooit: een scène starten vanuit een voertuig zonder te controleren waar de figuren staan.

**Controlelijst**
- [ ] Contactvel gezien: spreker in beeld, camera niet in muur of figuur, niemand in voertuig of romp.
- [ ] Skip met vastgehouden toets slaat precies één scène over, niet de missie.
- [ ] Scène gestart vanuit elk voertuigtype dat de missie toestaat (auto, boot, fiets, te voet).
- [ ] Prewarm gezet bij plekwissel; geen zichtbare pop-in in een rijtest.
- [ ] Geen primitieven in scènecode (audit); alle assets uit het register.
- [ ] Muziek en SFX volgen de scène; stem is verstaanbaar.

## 3. Spreker in beeld

**Terugkerende klachten**
- Spreker praat maar staat achter de camera of is niet in beeld (CS-R03: 6 plekken, o.a. keukenopening, M04.outro, M05.intro, M14.intro; CS-C05).
- Spreker ontbreekt in de scène terwijl er een regel is (CS-V01: M15.outro, M19.intro, M23.intro, M26.intro).
- Sprekers die van hun gesprekspartner af kijken (CUTSCENE-ISSUES-23-11).
- Ondertitel herhaalt de naam van de naamkaart (#505); ondertitels te klein of in de weg (#644); een ondertitel ligt over knoppen (beeld-21-11/feedback-menus 40 en 42).
- Een personage mist TTS-audio (#924, #987); de stem rekt de scèneduur op (#731); een gast hoort een andere stem (#711).
- Mimiek en lipsync ontbreken (#1311).

**Regels**
- Doe: elke regel heeft een spreker in de scène, in beeld, met de blik naar de gesprekspartner (lint: CS-R03, CS-V01, CS-C05).
- Doe: na een tekstwijziging de stemregel opnieuw opnemen; houd voice-manifest en scènetijd gelijk (#731, #733).
- Doe: ondertitel en naamkaart zeggen niet hetzelfde.
- Nooit: een beurt voor iemand die in de scène niet bestaat.
- Nooit: een regel zonder stem of ondertitel (toegankelijkheid, #200).

**Controlelijst**
- [ ] `node scripts/cutscene_lint.mjs --lijst` geeft geen CS-R03, CS-V01 of CS-C05 voor de scène.
- [ ] Gewijzigde regels staan op de TTS-opnamelijst; `voice_coverage` groen.
- [ ] Ondertitel over geen knop en niet onder 12 px; geen duplicaat van de naamkaart.
- [ ] Een gast ziet dezelfde ondertitels en hoort dezelfde stem.

## 4. Geluid en muziek

**Terugkerende klachten**
- Stille of ontbrekende effecten: vuurwerk (#131), carbidschieten (#173), achtervolgingscutscene (#117).
- Muziek stopt of komt niet terug (#146); muziek onder spraak leidt af (eigenaar; AUDIO-CUTSCENEMIX-28-11: scènes liepen op -4,6 tot -8 dB, minstens 16 dB nodig).
- Ruis en glitches op een sterke pc (AUDIO-GLITCHES-21-11, niet beluisterd, limiter toegevoegd).
- Geluid dat niet klopt: fietsbel (#129), schakelen 4-5-4 (#126).
- Dempknop zonder uitleg; gasten horen na dempen niets en weten niet hoe te herstellen; pratende mensen te luid (#435, #434).
- Menugeluiden ontbreken in andere menu's (#413).

**Regels**
- Doe: ducking onder spraak (16 dB, `cutmix.js`) en per scène een muziekstand; gebruik alleen SFX die het spel zelf bij dat scenario gebruikt.
- Doe: een duidelijke dempindicator met toets en uitleg in Besturing.
- Doe: zeg eerlijk dat niemand kon luisteren; zet een luisterlijst klaar voor de eigenaar (`SFX-LUISTERLIJST.md`).
- Nooit: een nieuw object, wapen of voertuig zonder geluid opleveren.
- Nooit: AI-muziek of -stem zonder licentiecontrole (constitution 4, ADR 0039).

**Controlelijst**
- [ ] Elk nieuw object, wapen, voertuig en UI-actie heeft een sfx-id en staat in de luisterlijst.
- [ ] Ducking gemeten in elke nieuwe scène (`cutmix_test`).
- [ ] Geen klik of knak bij start en einde.
- [ ] Dempknop heeft indicator, toets en herstel.

## 5. UI en menu's

**Terugkerende klachten**
- De twaalf patronen uit de eigenaarfeedback (UI-KRITIEK-22-11-menu, 27 bevindingen, #1257 tot #1282): P1 tekstmuren, P2 overlap of afkapping, P3 generiek beeld, P4 onduidelijke stappen, P5 vreemde lege elementen, P6 inconsistente werkwoorden, iconen, kleuren of tabstijl, P7 native scrollbalken en controls, P8 dubbele informatie, P9 debug of dev zichtbaar, P10 niet bereikbaar of foute toetsplaatjes, P11 pop-in of lege staten, P12 foute bron of tekstvorm.
- Ruwe {ACCOLADES} in speltekst, "undefined" in chips (#1257, UI-KRITIEK-22-11-hud).
- Eindkaart zegt twee keer hetzelfde, noemt de missie niet, toont een beloning bij mislukt (#1332, UI-KRITIEK-22-11-hud 1 tot 5).
- Popup blokkeert het zicht (#1345); pop-up zonder doel (#392); actie-popup waar een klik volstaat (#1355).
- Menu onoverzichtelijk: afsluiten ontbreekt in het hoofdmenu, "nieuw"-bolletjes verdwijnen, teller onduidelijk, Verhaal > Opdrachten rommelig, Activiteiten bevat verhaalmissies (#435).
- Cheats verstopt of juist als debug zichtbaar (#435, #1268); cheat activeert bij lezen (#161).
- Laadscherm met dubbele balken (#226), versie twee keer (#183), "x prestaties wachten" in de HUD (#168).
- Kaart: overbodige schakelaars (#169), dubbele wijkmeldingen (#132), reizen en waypoints verwarrend (#445), lagenpaneel bedekt de kaart (feedback-menus 23).
- Niet alles past op 1280x720 (#293, feedback-menus).
- Eerste start: naam en meedoen in één keer (#529, #530); "Doorgaan" dubbel (AUDIT-UXUI-23-11 R2).
- Pop-ups overlappen minimap en elkaar (#294, #1058, duivenspot-HUD).

**Regels**
- Doe: één hoofddoel per scherm, de rest ondergeschikt of op aanvraag; wereld en icoon boven tekst (leidraad eigenaar, AUDIT-UXUI-23-11).
- Doe: één gele knop per scherm (besluit 20-11); toetsen als plaatjes via `keyText` en `keyTextHtml`; alle tekst gaat door de toetsvervanger.
- Doe: bekijk elke UI op 1280x720, 1920x1080 en UI-schaal 1,5.
- Doe: toon een melding direct en zeg waarom iets niet mag.
- Nooit: dezelfde informatie meer dan één keer op een scherm (chip, titel en zin).
- Nooit: debug, dev of tellers in een spelermenu; geen "undefined", geen lege balk.
- Nooit: een native keuzelijst of scrollbalk; geen popup over de wereld tijdens bewegen.
- Nooit: nieuwe tekst zonder `ai_tells_scan_test`: geen gedachtestreepjes, "niet X maar Y", regel van drie, trailerstaccato.

**Controlelijst**
- [ ] Beeld op 720p, 1080p en ui 1,5; niets afgekapt, niets over wereld of minimap.
- [ ] Geen dubbele informatie, accolades, "undefined" of dev-elementen.
- [ ] Elk scherm heeft één primaire (gele) actie en een Escape-uitweg.
- [ ] Toetsplaatjes kloppen met de actuele binding en met de controller.
- [ ] Lege staten en laadstaten bekeken (P11).
- [ ] `ai_tells_scan_test` groen.

## 6. Onboarding en het eerste uur

**Terugkerende klachten**
- De openingsscène speelde niet eerst (#986); de opening is niet te volgen zonder voorkennis (#987).
- Eerste doel bestaat niet (#120); markers worden niet bereikt (#243).
- Doeltekst als missietitel; geen lopen-toets in beeld; tweede regel dubbel met minimap (AUDIT-SPEELBAARHEID-23-11, AUDIT-UXUI-23-11, EERSTE-30-MINUTEN-20-11).
- Medaille-eis niet vooraf uitgelegd; geen vervolgdoel na de hoogste medaille (#673; archief/review-activiteiten-2026-11-06/RAPPORT).
- Uitleg wees naar de verkeerde plek en kaartjes waren twee keer te lang (QA-AUDIT-2026-11-16, §0).
- Eerste frames haperen (783 ms) (EERSTE-30-MINUTEN-20-11).
- De hulp bij vastzitten werkte alleen voor het eerste doel.
- De eerste missie moet foutloos zijn: de lat voor alle andere (#1308).

**Regels**
- Doe: één uitleg tegelijk; start uitleg pas als alle vertelling vier seconden stil is; hints pas als de speler vastzit (tijd en positie).
- Doe: één korte werkwoordelijke zin met de plek erin (`stepdoel.js`, max 44 tekens: "Praat met Berend bij het Martinikerkhof").
- Doe: elke nieuwe loopbaan, minigame of bijbaan krijgt een kleine introductie met doel en medaille-eis vooraf (#1357).
- Doe: test met een nieuwe speler zonder uitleg (PLAYTESTPLAN, scenario A).
- Nooit: een titel als doel; geen uitlegkaart over het eerste doel heen.
- Nooit: een eerste missie opleveren zonder dat een mens of de proefspeler haar heeft gezien.

**Controlelijst**
- [ ] Nieuw spel: de opening speelt eerst; skip alleen ingedrukt.
- [ ] Na de opening in één zin duidelijk: wie, waar, waarom nu, wat nu.
- [ ] Doelbalk toont een werkwoord, geen titel; route of marker bestaat en is bereikbaar.
- [ ] Geen twee uitlegkaarten tegelijk; elke kaart noemt doel en medaille-eis.
- [ ] Eerste 30 minuten in beeld gespeeld (mens of proefspeler).

## 7. Wereld en kaalheid

**Terugkerende klachten**
- Straten, dorpen en wijken voelen kaal; "geen extra mensen, meer details en props" (#1353, eigenaar).
- Kale scènes: carbidscène in een weiland (#1326), M13-haven (#1328).
- Winkels lijken allemaal boekwinkels (#156); herhalend fietsbehang en roze bloesembomen ogen goedkoop en on-zomers (#1333).
- Herkenbare gebouwen ontbreken of kloppen niet: kerken als doos met toren (#406), ambulance niet Nederlands (#407), landmarks (#164), Bourtange (#1221).
- Hoogkerk weinig bebouwing (#436); grens: stilstaande mensen, zwarte borden zonder tekst (#436).
- Boerderijen in het water, hekken over weg en water (#124); props op verkeerde plekken (#1044); viaduct stopt abrupt (#1339).
- Doorvallen of onzichtbare barricades: perron (#1348), garage (#1335), drempel op de weg (#1346).
- Z-fighting en flikkerende borden of schaduwen (#82, #137, #382, #739, #917; ZFIGHT-METING).
- Wegen en water: samenkomende wegen, overgangen, bruggen glitchy (#130, #189, #235), water van twee lagen (#181, #231).

**Regels**
- Doe: per buurttype een lijst props en details (voortuinen, hagen, kliko's, kabelkasten, regenpijpen, bankjes, lantaarnpalen, borden, parkeervakken) uit het centrale propregister, binnen het prestatiebudget (instancing, LOD, tegel-streaming).
- Doe: na elke wereldwijziging een rondlooptest op de plek: kun je erdoorheen of er niet in? Controleer collision van perron, deur en garage.
- Doe: echte plekken herkenbaar (gevel, maat, kleur) met verzonnen namen waar het een merk is.
- Doe: altijd zomer (constitution 3) en variatie per winkeltype.
- Nooit: meer mensen als oplossing voor een kale straat (#1353); nooit een kale primitief als aankleding.
- Nooit: een nieuwe baan, brug of perron zonder hoogte- en botsingscontrole.

**Controlelijst**
- [ ] Voor/na-beeld van de plek, te voet en op rijsnelheid.
- [ ] Geen doorvallen, geen onzichtbare muur: loop en rij erdoorheen.
- [ ] Geen z-fight op 5, 100 en 300 m (`zfight_meting`).
- [ ] Props uit het register, geïnstanced, binnen het frame-budget.
- [ ] Niets wat niet bij zomer past.

## 8. Pop-in en prestaties

**Terugkerende klachten**
- Pop-in van gebouwen, bomen, props, voertuigen, voetgangers, wegen en gras bij lopen, rijden, vliegen en snel reizen (#1016, #534, #786, #755, #247); tegel te snel als klaar (#1354).
- Lag en haperingen bij laden in de stad, lage fps in drukke delen (#1008, #1317, #1321, #553); geheugenpiek 3,1 GB (#1040); 60 fps Ultra niet gehaald (0.66.0: ca. 47).
- Verre objecten: renderafstand van hoog detail te dichtbij op het spoor (#158); LOD-sprongen en ontbrekende wielen (#1337, #1340).
- Laadscherm: wat achter het scherm gebeurt en wat erna (#1292); langer laden verkiezen boven haperen (eigenaar 20-11).
- Shaderfout `vViewPosition`: iets wordt niet getekend (#1334, onbewezen).
- Hapering bij het wisselen van opstap: adaptieve schaduwmap zonder hysterese (#792).

**Regels**
- Doe: leg "tegel klaar voor de speler" streng vast: data, geometrie, texturen en shaders gecompileerd, gebouwen, props, bomen, colliders, LOD, verkeer en mensen (#1354).
- Doe: stabiele framerate boven beeld: kortere tekenafstand of minder gras liever dan hapering (norm 33,5 ms, hitchplafond 1 s).
- Doe: prefetch in rijrichting, shaders en texturen vooraf opwarmen, spawn buiten zicht, zachte in-fades.
- Doe: meet pop-in met een rij- en vliegtest op een stille machine (te veel agents maakt fps-metingen waardeloos).
- Nooit: "geen hapering" claimen zonder meting; nooit een fix zonder voor/na-getal.
- Nooit: zware logica op de hoofdthread (zware wegen, SFX-decodering bij start).

**Controlelijst**
- [ ] Pop-in gemeten (`scripts/qa/popin.mjs`) voor en na: lopen, rijden en vliegen.
- [ ] Frametijd binnen budget in een drukke wijk; geen piek bij tegelwissel.
- [ ] Geen shader- of consolefouten en geen NaN in de verhaaltest.
- [ ] Vermeld wat niet gemeten is.

## 9. Voertuigen en mensen: animatie

**Terugkerende klachten**
- Fiets trapt achteruit (#1336), voorwiel draait de andere kant op (#436), fietsers in het verkeer zonder bewegende benen en zonder banden (#1337), auto's van dichtbij zonder banden (#1340), fietsen in rekken als zwarte "spinnen" (#1329).
- Treinen "met lichtsnelheid" (#1339, #1348); een trein rijdt door spelers heen en stottert (#436).
- Nieuwe mensen: ragdoll en IK werken niet (#1350), animatie- en posefouten (#1349), een staart op Tammo (#1351).
- Wielen, deuren, lichten, interieur, schaal, zweven, door de grond, LOD-sprongen (#1349); taxi verliest lichtkrant (LOD, #436).
- Hybride auto's: harde eis een echt gat in de carrosserie bij deuren, auto's te laag (memory sessiestand-23-11-pauze); tractor te snel; de vet-truck voelt niet zwaar.
- Dieren: reuzenvogel (#433), gans zweeft zonder vleugelslag (#436); voetgangers als cilinders (#1330).
- Regels rond rakelings en politie raken geparkeerde auto's en zwaaien in de lucht (#1347, #1356).
- Missievoertuigen: een busje zonder aanhanger, pijl wijst verkeerd (#1342).

**Regels**
- Doe: elke nieuwe voertuigsoort en elk nieuw personagemodel loopt door een audit op 5, 20 en 60 m: wielen, banden, deuren, lichten, schaal, draairichting van wielen en pedalen, LOD-keten, botsmaat.
- Doe: state-machine, ragdoll en IK samen testen met het echte skelet (22 botten) en alle LOD's.
- Doe: leg snelheid en schaal van voertuigen vast en meet ze met verschillende tijdstappen (trein, tractor, boot).
- Nooit: een nieuw model "klaar" noemen zonder het in beeld te zien; nooit alleen de eerste LOD controleren.
- Nooit: een personage een extra onderdeel laten krijgen door een nieuw haar-, hoofd- of rekwisietdeel zonder controle (Tammo, #1351).

**Controlelijst**
- [ ] Contactvel of video op 5, 20 en 60 m: draairichting van wielen en pedalen, benen en banden zichtbaar.
- [ ] Ragdoll: vallen, geraakt, overreden, opstaan; IK: voeten op de grond, handen aan stuur.
- [ ] Snelheid van trein, bus en tractor in km/u gemeten bij verschillende tijdstappen.
- [ ] Tammo, Tessa en Jelle in cutscene en spel gecontroleerd op ongewenste onderdelen.
- [ ] Elk voertuig dat de missie nodig heeft (aanhanger) is gekoppeld en zichtbaar.

## 10. Missies en doelen

**Terugkerende klachten**
- Doel bestaat niet of is niet bereikbaar (#120, #243; M20 noordwal 48 m buiten de looproute); missie start niet op een voertuig (#121).
- Missie loopt vast of slaat over (#1341, #1294, M05-softlock, #222); sms'jes komen te laat (#171).
- Route onhandig: omweg langs het kanaal (#119, #320), gele lijn blijft staan bij de bestemming (#118).
- Medaille en tempo: stuntavond, aftrek voor mensen raken (#392), vervolgdoel na de hoogste medaille (#673), boerenwerk zonder duidelijke knop (#437).
- Missievoertuigen en -plekken: heli spawnt door heli (#166), ballon op heli-hoogte (#167), Peerd steeds op een andere rotonde (#172), Jelle polsstokspringt op onlogische plekken (#135), tankwagen stopt voor de speler (#133).
- Binnenmissies speelden niet echt binnen (#1022); een mislukte lading zette de oude stand niet terug (#1073).

**Regels**
- Doe: elke missie heeft een bereikbaar doel (audit op de echte kaart), een zichtbare route en een hervatpunt dat keuzes onthoudt.
- Doe: een mislukking geeft een heldere reden en een snelle herhaling; vastzitten geeft een hint.
- Doe: elk doel in kaartlabel en wereld als werkwoordszin.
- Doe: een missie met klok krijgt een haalbaarheidscontrole (`missie_haalbaarheid_audit`).
- Nooit: een missie sluiten op een geometrietest; speel haar met de bot of een mens.
- Nooit: een skip of snelkoppeling die een missie kan overslaan.

**Controlelijst**
- [ ] Doel bereikbaar op de echte kaart (te lopen en te rijden); markers geactiveerd.
- [ ] Mislukken en herstarten gespeeld: voertuig, keuzes en geld zijn terug.
- [ ] Spelbot of proefspeler heeft de missie gehaald; zo niet, noteer wat ontbreekt.
- [ ] Medaille-eis, tempo en loon passen bij elke moeilijkheidsstand.
- [ ] Het doel is voor een nieuwe speler zonder uitleg te lezen.

## 11. Samen spelen

**Terugkerende klachten (playtest 23-10: #434 tot #438; later #1059, #1293)**
- Schokkerig bewegen bij de gast (voertuigen, mensen, boten, treinen); gast teruggezet naar de host; gast kan niet springen, bukken, instappen (#434, #291).
- Gast ziet niet: filmpjes, ondertitels, keuzes (#279, #318), missiemarker en doel (#368), voetgangers en agenten (#280), wapens van de host, passagiers.
- Voortgang en save: beloning dubbel (#278), onduidelijk welk spel (#317), eigen voortgang (#429), wereld stopt als de host het menu opent, gast blijft in gastrol (#305).
- Verbinding: eindeloos op verbinden (#274), dode verbinding houdt plek bezet (#275), vergeten gasten (#276, #310), host valt hard weg en elke gast wordt zijn eigen host (#1059), hervatten bevriest de wereld (#1293).
- Startknop, filmpje-overslaan en "iedereen stoppen" waren van de opener (#642).
- Wachtkamer: geen WASD typen en niets plakken (#315); toestemming per route (#526).
- Races en minigames moeten tegen elkaar kunnen (#443); de host kan spelers verwijderen (#438).
- Onzichtbaar huisje (safehouse Hoogkerk) en onzichtbare garage voor gasten (#434).

**Regels**
- Doe: stel bij elke nieuwe missie, bijbaan, minigame of functie de Samen-spelen-regel vast: van wie het spel opende, doet een gast mee (J of N), of lokaal per speler; wat ziet de gast; wie krijgt beloning en voortgang (per speler); wat bij wegvallen of later aansluiten; welke test dekt het (AGENTS.md, "Multiplayer bij ontwerp").
- Doe: elke speler is gelijkwaardig; tijd, reizen, slapen, laden, cheats en pauzeren zijn gezamenlijke keuzes; alleen kicken is hostrecht.
- Doe: interpoleer en voorspel snapshots (voertuigen, mensen, boten, treinen); test met twee instanties en een echte wegval en hervatting.
- Doe: loopbanen zijn altijd beschikbaar zodra je meedoet, ook voor gasten (#1357).
- Nooit: een nieuwe `world.player`-aanname; nooit een gast als toeschouwer.
- Nooit: IP-adressen opslaan of tonen; geen echte namen in sessienamen (constitution 10).

**Controlelijst**
- [ ] De Samen-spelen-regel staat in changelog of issue en in docs/COOP-GAST.md als het nieuw is.
- [ ] Gast ziet marker, filmpje, ondertitel en doel; krijgt eigen beloning en voortgang.
- [ ] Gast valt weg en sluit later weer aan: geen bevriezing, geen dubbele beloning.
- [ ] Testbank-stap of pure coöp-test aanwezig; twee-instantie-bewijs waar het kan.
- [ ] Het menu van één speler stopt de wereld niet voor anderen.

## 12. Saves en voortgang

**Terugkerende klachten**
- Nieuw spel laadt na reload de oude save (#562); gezondheid 1 na sluiten op het doodscherm, missionModes weg bij overzetten (#1295).
- Een mislukte lading mocht de stand niet overschrijven (#1073); oude saves: Ommeland overlapt Corpus den Hoorn (#212).
- Opgeslagen spellen: rustig scherm, één actie per kaart (#319); onduidelijk welk spel je speelt (#317).
- Het oude verhaal verdween: saves moesten migreren (#187).

**Regels**
- Doe: elke opslagwijziging krijgt een migratie en een test op een echt oud save-bestand; de sleutels `gde-*` blijven.
- Doe: een mislukte lading zet de oude stand terug of blokkeert bewaren.
- Doe: verhaal en loopbanen houden eigen voortgang per speler.
- Nooit: tests naar echte opslag laten schrijven (`gde-save-v1`, `gde-settings`, `gde-prestaties-v1`).
- Nooit: een save breken om een nieuwe structuur te kunnen gebruiken.

**Controlelijst**
- [ ] Een save van de vorige release laadt zonder verlies; migratietest groen.
- [ ] Laden mislukt: geen overschreven stand.
- [ ] Nieuw spel op een vers profiel, doorgaan en opnieuw laden bekeken.
- [ ] Elke nieuwe verhaalstap van de 40 tot 80 uur heeft een hervatpunt.

## 13. Toon en humor

**Terugkerende klachten**
- Grappen die tics worden (AUDIT-VERHAAL-23-11); "AI-tells" die een publisher in een seconde ziet (AI-TELLS-23-11).
- Gronings of Fries zonder zorg: Tessa spreekt Nederlands zonder Gronings accent (#134), nalezing door een echte spreker (#13), DIALECT-CONTROLE.
- Echte merken en personen in speltekst of beeld (speeltest 15-10, constitution 2; verzonnen vervangers in archief/2026-10/FEEDBACK-SPEELTEST-1).
- Gevoelige onderwerpen (gaswinning, onveiligheid van vrouwen) alleen met zorg, controleerbare cijfers en geen grap over slachtoffers (constitution 6, TESSA-CIJFERS).
- Te suggestieve scène (poes in appartement, #434).
- Komische timing is moeilijk voor een model; de eigenaar wil geen bottleneck zijn (memory geen-bottleneck-eigenaar).
- Gewenst: droog Gronings understatement, bureaucratische absurditeit, situatiekomedie en parodie met verzonnen namen (#1357).

**Regels**
- Doe: grappen via personages en dialoog; missies zelf mogen serieuzer; elke bijrol een eigen stem.
- Doe: een panel van drie onafhankelijke reviewer-agents met meerderheid; leg alleen canon, constitution of veto aan de eigenaar voor.
- Doe: "Grunn" (nooit "de Grunn"), echte plekken met verzonnen namen, altijd zomer, alleen Nederlands.
- Nooit: een grap herhalen tot een tic; geen echte merken of personen; geen slachtoffer als grap.
- Nooit: AI-stijlmiddelen: gedachtestreepjes, "niet X maar Y", staccato-drietal.

**Controlelijst**
- [ ] `ai_tells_scan_test` groen; dialectcontrole gedaan; geen echt merk of persoon (`rules_audit`).
- [ ] Tellers per tic onder de grens; reviewer-panel akkoord.
- [ ] Geen constitution-6-risico: geen getoond geweld buiten PvP, geen echt slachtoffer.

## Ontwerpwensen (feedback die geen bug was)

Dit zijn richtingen uit playtests of van de eigenaar; ze horen als wens op het bord, niet als bug.

- **Verhaalvorm (28-11, #1357):** 40 tot 80 uur; kennismaking 25%, loopbanen 40%, snackwagen en slot 35%; één doorlopend verhaal, geen aktes en geen vertakkingen; wereld direct open; mijlpaal elke 2 tot 3 uur; alles ingesproken; iedereen eigen voortgang.
- **Loopbanen met aanleiding:** boer = erfenis, voetbal = invaller bij een dorpsclub, vervoer = chauffeur valt weg, snackwagen = slotstuk, water = schipper valt weg; geen kale menu-ingang; elke eindeloze loopbaan echt diep.
- **Na 40 uur:** "Groningen is mijn stad, ik heb iets opgebouwd, ik hou van Tammo en Tessa, er is altijd iets te doen" (#1357).
- **Samen spelen (24-10):** serverlijst opt-in, host overdragen, heist met rollen, races tegen elkaar, wereld laten doorlopen bij het menu van één speler, kaartpings, emotes, groepsvoertuig (#438, memory besluiten-samenspelen-24-10).
- **Wereld:** dieren aaien, een wolf als gevaarlijk dier (23-11), schepen als loopbaan, reizen met een boot (#438).
- **Menu:** Veroverd onder Verhaal, loopbanen gelijk behandeld, per loopbaan een waypoint naar de volgende klus (#435).
- **Doodgaan:** visuele feedback (rode rand, zwaar ademen, lichte shake); politie op vijf sterren moeilijker (#436).
- **Muziek:** meer radiostijlen (#66); dagmuziek en stings; geen eigen muziek (memory geen-eigen-muziek).
- **Graphics:** automatische grafische stand per pc; 60 fps in het middensegment; AAA-niveau voor de eerste akte (besluiten-eigenaar-23-11).
- **Stuntavond (#392):** omrijden van losse dingen geeft punten; mensen springen weg of vallen zonder geweld.
- **Werkwijze eigenaar:** geen eigen tools, alleen beelden en speelbare builds; "los het zelf op" boven vragen (memory eigenaar-geen-tools-zelf, geen-bottleneck-eigenaar).

## Wat werkt: niet kapot maken

- Alle personages die je ontmoet komen aan het einde samen (#987, positief).
- Station Noord ziet er veel beter uit (#1345, #1346); de opening (C00) is sterk (CUTSCENE-AUDIT-OPUS-21-11).
- Korte beurten en eigen stemmen voor bijrollen (Wubbo, Geesje, Willemien, Berend, Mem, Durk, Douwe), "Rijden, niet praten", "Nul krassen", het Loket, de duiven (AUDIT-VERHAAL-23-11, VERHAAL-ANALYSE-21-11).
- 29 van de 30 verhaalmissies volledig samen speelbaar (archief/review-activiteiten-2026-11-06/RAPPORT).
- HUD "Slim" (na 8 s alleen minimap en doel) en het ene toetsplaatje per actie (AUDIT-UXUI-23-11).
- De rondvaartboot-scènes en dekmomenten na de fix (CUTSCENE-ISSUES-23-11, gezien).

## Algemene opleverlijst (voor elk werk)

1. [ ] Het issue is gelezen; elk punt van de melder staat in dit document of in het issue.
2. [ ] In beeld bekeken (screenshot of video) op 720p, 1080p en ui 1,5 en op lage en hoge detailstand. Zo niet: schrijf "nog niet bekeken".
3. [ ] `Closes #n` alleen met beeldbewijs; bij het label hertest of een visuele wijziging zonder beeld: `Refs #n`.
4. [ ] `node --check` op gewijzigde JS, `node scripts/voice_coverage.mjs --quiet` en de bij de wijziging passende tests; zeg eerlijk wat niet is getest.
5. [ ] Spelertekst alleen Nederlands, geen echt merk of persoon, altijd zomer, geen AI-tells.
6. [ ] Samen spelen: de regel voor gast en host, beloning per speler.
7. [ ] Save-migratie getest; geen schrijven naar echte opslag in tests.
8. [ ] Nieuw model of voertuig: audit op 5, 20 en 60 m en alle LOD's; geen primitieven in scènecode.
9. [ ] Pop-in en fps alleen meten op een stille machine; anders "niet gemeten".
10. [ ] Comment op het issue: wat gedaan is, wat open staat, wat niet bekeken is.

## Bronnen per thema

- Verhaal: #93, #120, #123, #536, #987, #1308, #1357; VERHAAL-ANALYSE-21-11, AUDIT-VERHAAL-23-11, CUTSCENE-AUDIT-OPUS-21-11, PLAYTESTPLAN.
- Cutscenes en sprekers: #136, #149, #157, #224, #261, #730, #861, #1331, #1338; CUTSCENE-ISSUES-23-11, CUTSCENE-FAALLIJST-21-11, CUTSCENE-POPIN-22-11.
- Geluid: #117, #126, #129, #131, #146, #173; AUDIO-GLITCHES-21-11, AUDIO-CUTSCENEMIX-28-11.
- UI: #152, #168, #169, #183, #226, #293, #1257 e.v.; UI-KRITIEK-22-11-menu, -hud, -kaarten, -winkels, AUDIT-UXUI-23-11, beeld-21-11/feedback-menus.
- Onboarding: #986, #987, #120, #243, #673; EERSTE-30-MINUTEN-20-11, AUDIT-SPEELBAARHEID-23-11, QA-AUDIT-2026-11-16.
- Wereld: #124, #156, #164, #406, #407, #1044, #1326, #1328, #1333, #1339, #1348, #1353; ZFIGHT-METING.
- Pop-in en prestaties: #247, #534, #553, #755, #786, #1008, #1016, #1040, #1292, #1317, #1321, #1334, #1354.
- Voertuigen en mensen: #433, #1329, #1330, #1336, #1337, #1340, #1347, #1349, #1350, #1351, #1356.
- Missies: #118, #119, #121, #166, #167, #172, #243, #320, #392, #1294, #1341, #1342.
- Samen spelen: #272 tot #318, #368, #434 tot #438, #1059, #1293; COOP-GAST, MULTIPLAYER-VISIE.
- Saves: #187, #208, #212, #562, #1073, #1295.
- Toon: #13, #134, #1357; AI-TELLS-23-11, archief/2026-10/FEEDBACK-SPEELTEST-1, TESSA-CIJFERS.
- Werkproces (memory): werkopdracht-19-11-bugs-diepte-aaa (hertest, beeldbewijs), release-0-66-0-gedaan, besluiten-eigenaar-21-11 en -23-11, assets-centraal-echte-modellen.
