# Cutscene-review GDE Groningen

Datum: 6-11-2026. Repo: `C:\Users\abuis\GIT\GDE-Groningen`, branch `main`.
Gemeten HEAD: `907f8c5c` (de cutscene-code is gelijk aan `e5e8b712`; daarna kwamen docs-, dev- en
review-commits van een andere sessie). De werkboom bevat daarnaast niet-gecommitte wijzigingen van
die andere sessie in `game/js/coopnet.js`, `coopplayers.js`, `coopspelers*.js`, `audio/radio.js`,
`postfx3d.js` en enkele scripts; de cutscene-bestanden zelf zijn ongemoeid. Deze review is leeswerk:
**niets runtime getest** (geen Electron, geen spel, geen netwerk, geen volledige suite), geen commits,
geen GitHub-issues, `.env` niet gelezen.

Deelrapporten (in deze map):

Op verzoek van de eigenaar zijn de bevindingen omgezet in **32 GitHub-issues (#704-#734 en #736)**, met
de labels `bug`/`wens`, één impact- en één kostenlabel, en op project 5 in de kolommen **Bugs** en
**Wensen** gezet.

| Rapport | Onderwerp |
|---|---|
| `01-regie-techniek.md` | regie, camera, timing, skip, audio, techniek (20 bevindingen: **1 Kritiek, 3 Hoog, 14 Midden, 2 Laag**) |
| `02-verhaal-scenes.md` | verhaal- en missiescènes, dekkingsgraad, logica (zie dekking: niet als eindrapport aangeleverd) |
| `04-multiplayer.md` | cutscenes in Samen spelen (15 bevindingen: 3 Hoog, 8 Midden, 4 Laag) |
| `05-wijk-verovering.md` | harde inventaris veroverbare wijken + raamwerk verover-film (14 bevindingen) |
| `07-wijk-scenes-ontwerp.md` | 8 uitgewerkte verover-scènes per stadswijk + template |
| `00-WIJK-VEROVER-FILM.md` | het samengevatte voorstel voor de lange verover-cutscene per wijk |

## Samenvatting

**Kritiek vooraf (nieuw uit deelreview 01, door de Lead geverifieerd):** `pause: true` pauzeert de
wereld en de speler **niet**. `world.paused` (`main.js:672`) kent geen cinematic, `updateGameplay`
en `player.update` lopen door (`main.js:688,784,846`), en `cinematicPausesGameplay()`
(`cinematics.js:185`) heeft één consument (`phone.js:427`). Tijdens een scène kan de speler dus
wegwandelen, in-/uitstappen, een winkel openen of schieten, terwijl de klok, het verkeer en de
missietimers doorlopen. Dat raakt de opening, elke missie-intro/outro en elke `cutscenehost`-scène —
en het is de eerste aanname onder elke nieuwe film (zie #729).

Het cutscene-systeem is technisch volwassen: een eigen regietaal (`cutscript.js`), een preview-tool,
een audit- en voiceduur-test, hold-to-skip, een aandachtssysteem dat momenten rantsoeneert, en in
Samen spelen een echte replay van scriptscènes. Maar de **speler** ziet op de momenten die ertoe doen
te weinig, en op de verkeerde momenten te veel ruis. De tien belangrijkste conclusies:

1. **De grootste beloning van het gebiedsysteem is een HUD-bericht van 7 seconden.** Wie een wijk
   helemaal "doet", krijgt geld, een titel en een huis, maar geen scène, geen vlag in beeld, geen
   camera. Dat is precies het moment waarvoor de eigenaar een lange cutscene wil. Zie §9 en
   `00-WIJK-VEROVER-FILM.md`; het is met 8-11 handgeschreven scènes haalbaar (niet 123).
2. **"Wijk" betekent op dit moment twee verschillende dingen.** De eerste-bezoek-kaart/flyover werkt
   op 66 buurtpunten uit `stad.json`; veroveren werkt op 123 echte CBS-wijken uit `grenzen.json`
   (20 in de gemeente Groningen). Dezelfde speler verover­t "Oud-Zuid" maar kreeg "Stadspark" of
   "Herewegbuurt" te zien. Dat moet eerst beslist worden; anders noemt de verover-film een andere
   wijk dan de kaart.
3. **De per-wijk-film bestaat al, maar bijna niemand ziet hem.** De flyover is standaard uit
   (`wijkFilm: false`), deelt een cooldown van 210 s met landmark- en Ommelanden-scènes, en speelt
   alleen onder 12 m/s (43 km/h). De standaard is een kaartje van één regel.
4. **In Samen spelen is de gast een tweederangs kijker.** Alleen `playScript`-scènes worden als data
   naar gasten gestuurd (mooi, en getest). Alle 43 `playCinematic`-momenten (wijk, landmark, crash,
   wanted5, Ommelanden, missie-intro's, treinreis, museumontsnapping, uitslagen) zijn host-only: de
   gast ziet zwarte balken plus "X kijkt een filmpje", en bij landmark/crash/wanted5 zelfs dat niet.
   Daarbovenop loopt de stem/timing van missiescènes bij de gast uit de pas (`own`-veld valt uit het
   pakket), en een hostwissel midden in een scène breekt de reeks.
5. **De opgenomen openingsmontage van 85 seconden is onbereikbaar.** `intromontage.js` (1416 regels,
   ingesproken, op de theme gesynchroniseerd) wordt alleen door `replayIntro()` aangeroepen, en die
   functie heeft geen enkele aanroeper; `introSeen()` wordt nergens gelezen. De eigenlijke opening is
   de 3-aktescène in `story.js`/`cutscenes.js`. Dat is blijkbaar een bewuste keuze
   (`trailerstate.js:32-34`: "no intro before the menu ... Nieuw spel opens with its own
   trailer-style opening"), maar dan hoort de dode code en de verwijzing in `ARCHITECTURE.md:392`
   weg — of de montage komt terug als opening, want het is het beste opgenomen materiaal van het spel.
6. **De openingsscène hangt aan de speler, niet aan thuis.** De keukenset staat 345 m boven de wereld
   (`KITCHEN_Z`) op de plek waar de speler staat; de straatset van akte 1 staat om de speler heen. Als
   de opening door drukte later begint (hij wacht op "rust"), speelt de openingsstraat en de keuken
   zich af waar de speler toevallig is. En na 40 s geeft de stap zich op: dan is de opening voor die
   save definitief overgeslagen.
7. **De finale teleporteert de speler.** `playFinale` zet de speler naar de Grote Markt zonder
   overgang; zit hij in een voertuig, dan gebeurt dat niet en draait de camera tóch om de Markt. De
   epiloog kan dus op een andere plek spelen dan waar de speler is.
8. **Activiteitenscènes zijn een lappendeken.** 43 `playCinematic`-aanroepen in 19 bestanden, elk met
   eigen vlaggen (skippable, hideHud, hidePlayers, queue); de museumkraak, treinreis en rondvaart
   krijgen een volledige scène, de klimtoren, kermis, kartbaan en het zwembad alleen een HUD-kaart. Er
   is één goede gedeelde helper (`dorpsuitjes.js` `scene()`), maar niemand anders gebruikt hem.
9. **De aandachtseconomie is te grof voor ontdekking.** De globale onderbrekingspauze is 40 s en
   `wijk`/`landmark`/`ommelanden` delen 210 s; daardoor kan een wijkkaart pas verschijnen als de
   speler de wijk al bijna uit is, of nooit. Voor een verover-film (verhaalbeloning) is deze poort
   bovendien de verkeerde: die moet op rust wachten, niet op een quotum.
10. **De documentatie loopt achter.** `ARCHITECTURE.md:392` rekent nog op de openingsmontage;
    `docs/GEBIEDEN.md` zegt dat veroveren geen scène heeft (terecht, maar de eigenaar wil nu het
    tegenovergestelde); `docs/COOP-GAST.md` heeft geen verover-sectie; de preview-tool kent de
    verover-film nog niet.

## 1. Inventaris: wat voor cutscenes heeft het spel?

| Soort | Aantal / vorm | Waar |
|---|---|---|
| Verhaal- en missiescènes (script) | **169 scène-id's** (C00.1-C00.3, M01-M30, reisbeats, epiloog), **207 narratieve scènes** in de inventaris, samen ~**101 min** spreektekst (inclusief telefoon/app/radio, niet allemaal film) | `game/storydata/script.json`, `storyarc_nieuw.js` |
| Eigen regie (staging) | **89 spec-keys**: 30 intro's (alle missies), 25 outro's, 34 scènes binnen missies; akte 1: 14, akte 2: 9, akte 3: 10, akte 4/5: 43, akte 6: 13 | `cutscenes_akte1/2/3/4/6.js` |
| Missies met een intro-spec | 30 van 30; **5 zonder outro-spec** (M06, M10, M21, M22, M24 — die hebben wel in-missie-regie) | idem |
| Moment-cinematics | wijk (kaart standaard, flyover opt-in), landmark, Ommelanden, crash, wanted5, death/busted, mission-intro, mission-fail, resultaatkaart | `cinematics.js` |
| Intro / einde | start fly-in 5,5 s; M00-opening in 3 aktes; onbereikbare montage ~85 s; finale 3 kaarten + Fjord-onthulling; aftiteling 18 kaarten (~71 s, skipbaar, herspeelbaar) | `story.js`, `intromontage.js`, `credits.js` |
| Activiteitenscènes | 43 `playCinematic`-aanroepen in 19 bestanden; groot: museumkraak (2), treinreis (3), rondvaart (2), fjordtrein, dorpsscènes, polsstok-camera, postgame (2) | `heist.js`, `stationtravel.js`, `rondvaartchase.js`, … |
| Preview en tests | `cutpreview.js/.ui` (catalogus, scrubben, stills); 7 cutscene-tests (`cutscenes_audit`, `voicedur`, `propclip`, `kort`, `cutscript`, `cutpreview`, `coopcut`) plus akte-tests | `scripts/*_test.mjs` |

De verhouding is scheef: de **beleefde** scènes (missie-intro's/outro's) zijn goed gedekt, de
**momenten** (wijk, landmark) zijn kaarten en de **beloning** (veroveren) is een toast.

## 2. Wat goed werkt (en niet hoeft te veranderen)

- **De regietaal is een echte kracht.** Scènes zijn data (`cutscenes_akte*.js`), refereren aan
  scriptregels (`'L3+0.4'`), en worden gevalideerd (`validateScene`), geaudit (`cutscenes_audit.mjs`)
  en getest op voice-duur, prop-clipping en korte scènes. Dat is meer dan de meeste spellen hebben.
- **De preview-tool** (`cutpreview.js`) maakt scènes bekijken, scrubben en valideren zonder het spel
  te spelen; de QA gebruikt hem voor stills.
- **Hold-to-skip** (Spatie 0,9 s) met een ring-hint, en skip werkt ook op touch (één ingedrukte knop)
  en controller.
- **Het aandachtssysteem** (`hudbus.js`/`attention.js`) is een nette, geteste oplossing voor "te veel
  filmpjes": één tabel met niveaus, cooldowns en één globale pauze. Alleen de waarden zijn te grof
  voor ontdekking (§5).
- **Samen spelen: scriptscènes worden echt gedeeld.** `coopcut.js` stuurt de regie-data in stukken,
  de gast speelt dezelfde scène, de tijd wordt elke 0,25 s bijgestuurd, de gastheer bepaalt het einde
  en de gast kan zijn eigen beeld skippen. Dat is knap en getest (`coopcut_test.mjs`,
  `coop434_test.mjs`, `coop_scenarios_test.mjs`).
- **De opening is geregisseerd als drie aktes** (straat, keuken, verhuisdag) met een fallback en
  `fit`/`ground`-regels zodat de set niet in een gevel staat.
- **Aftiteling en epiloog** hebben een eigen toon (Fjord-onthulling, "Wij tweeën vóór Grunn") en zijn
  herspeelbaar zodra de aftiteling een keer is geweest.

## 3. Visuele invulling en regie — wat kan beter

1. **[Hoog] De verovering heeft geen beeld.** Zie §9. Zonder scène is de duurste beloning van het
   spel een regel tekst; de camera, de vlag en de titel bestaan alleen op de kaart.
2. **[Hoog] Karakteristieke momenten zijn kaarten, geen shots.** De wijkkaart toont naam + één regel
   + "Te zien: …"; de flyover (11 s, één straat) haalt het niet. De landmark-scène is een orbit van
   3,8 s met kicker/titel maar zonder regel; een speler leert de Martinitoren niet "kennen" uit dat
   shot. Voor de 8-11 verover-wijken is een echte tocht (overzicht → 3-5 stops → eindbeeld) de
   goedkoopste kwaliteitssprong.
3. **[Midden] De camera is overal "orbit of dolly".** De regietaal kent vier shottypes
   (`cut`/`dolly`/`orbit`/`follow`, `cutscript.js:26`), maar de `playCinematic`-scènes (missie-intro,
   fail, death, crash, wanted5, finale, activiteiten) bouwen hun camera met de hand uit keyframes. Er
   is geen close-up, reactie-shot, over-the-shoulder of insert-grammatica; de montage is daardoor
   vlak. Voor de verover-film: voeg minstens één detail-shot (deurbel, vlag, hand, kat) en één
   reactie-shot (een bewoner kijkt op) toe — dat is een data-uitbreiding, geen engine-werk.
4. **[Midden] Geen consequent gebruik van naamkaarten.** `setNameCard` bestaat en de keukenscène
   gebruikt hem; de meeste momenten (landmark, wijk, crash) niet, en de verover-film heeft er juist
   één nodig voor de titel "Wijkheld van …". Zet de titel in de eindkaart (`kicker`/`title` van
   `playCinematic`) en de bewoner in een naamkaart.
5. **[Midden] De finale sprong.** `playFinale` verplaatst de speler naar `FINALE_SPOT` (Grote Markt)
   zonder fade; in een voertuig gebeurt de verplaatsing niet, maar de camera draait tóch om de Markt
   (`story.js:624-668`). Voeg een zwartframe/fade toe (het `blackframe.js` bestaat) of anker de
   finale op de plek waar de speler is; en als de speler in een auto zit, eerst netjes uitstappen.
6. **[Midden] De openingsset staat op de verkeerde plek.** `playOpening` bouwt de keuken 345 m boven
   de speler en de straat om de speler (`story.js:491-522`, `KITCHEN_Z = 345`). Begin de opening
   alleen bij de thuisplek (`homeSpawnPoint`, `home.js`) of forceer het anker daar; anders speelt de
   straat van de Oosterparkwijk in een villawijk.
7. **[Laag] De aftiteling is 18 kaarten met dezelfde langzame orbit** (~71 s, `story.js:702-710`,
   `finaleShot`). Skipbaar en functioneel, maar de montage verdient variatie (close-up van de toren,
   de frituur, een fiets) en een "overslaan"-hint die blijft staan.
8. **[Laag] De camera-band (letterbox) en tint zijn per scène met de hand gezet.** `letterbox` staat
   bijna overal aan, `tint` bijna nergens; `accent` alleen bij wanted5. Eén scene-standaard
   (bijv. altijd letterbox bij verhaal, nooit bij momenten) voorkomt dat een scène er anders uitziet
   dan de buurscène.

## 4. Logica en continuïteit

1. **[Hoog] Twee betekenissen van "wijk"** (§2 van de samenvatting, `cinematics.js:765-773` vs
   `gebieden.js:121-124`). Ook de prestaties gebruiken de 66 buurtpunten (`achievements.js:102-104`),
   de verover-titels de CBS-laag. Kies één naam en één laag per UI-oppervlak.
2. **[Hoog] De opening kan verloren gaan.** De `opening`-stap geeft zich na **40 s** op als de wereld
   niet rustig wordt (`story.js:238-248`); `met()` is daarna `true` en de scène komt nooit terug. In
   het slechtste geval mist een nieuwe speler de hele M00. Fix: geen tijdlimiet, of de stap opnieuw
   proberen bij een volgende gelegenheid; minimaal loggen waarom hij oversloeg.
3. **[Hoog] De gast hoort een andere stem en ziet andere ondertiteltijden.** `missionstory.js:1099`
   zet `own: true` op regels; `cutPakket` (`coopcut.js:25,66`) laat dat veld vallen, dus
   `attachVoices` (`cinematics.js:275-295`) zoekt bij de gast in de 'lines'-bank en schuift `at`/`dur`
   op. De gastheer eindigt op zijn duur en knipt de gast af. Fix: `own`, `clue` en `card` meenemen in
   het pakket (en in `leesCutPakket`), plus een test op de gast-kant. (04 §1)
4. **[Midden] Veroverde gebieden heten in de provincie "Wijk 00", "Wijk 01", "Wijk 13"…**
   `weergaveNamen` (`gebieden.js:94-99`) haalt "Wijk NN " weg als er een naam achter staat, maar
   kale CBS-namen blijven staan. Titel: "Wijkheld van Wijk 14". Fix: naam aanvullen met de
   dichtstbijzijnde woonplaats, of de laag voor die gemeenten overslaan. (05 V3/F5)
5. **[Midden] `wijkHighlights` kan landmarks van een andere wijk tonen.** Het zoekt binnen 700 m van
   het dichtstbijzijnde buurtpunt (`cinematics.js:828-840`), niet binnen de wijk. Voor de kaart is dat
   acceptabel, voor de verover-film niet: gebruik `grenzen.js` `puntInGebied` op de wijkpolygoon.
6. **[Midden] `loadWijken(fresh)` wist de "gezien"-lijst bij elk nieuw spel**, voor alle saves op dat
   apparaat (`cinematics.js:664,775-785`). Een nieuwe game laat oude saves hun wijkkaarten opnieuw
   tonen. Fix: alleen wissen als de speler dat wil, of de lijst in de save zetten.
7. **[Midden] De keuken/losse set-ankers zijn niet wereldvast.** Zelfde oorzaak als §3.6: sets
   hangen aan de spelerpositie in plaats van aan een vaste plek. Voor alle `playScript`-scènes met
   `set: 'keuken'` (opening, thuisavonden) geldt dit.
8. **[Laag] Spelersfiguren verbergen is een vlag die twee systemen delen.** `hidePlayers` zet
   `w.cinematicHidePlayers`, dat ook door andere paden wordt opgeruimd (`cinematics.js:447-449`).
   Werkt, maar is fragiel; een teller of eigenaar per scène zou veiliger zijn.
9. **[Laag] `cutvervang` is onbereikbaar.** `coopcut.js` stuurt bij vervanging `cutvervang', maar
   geen enkele gast leest dat bericht (04 §10). Ofwel implementeren (gast stopt zijn kopie zonder
   "overgeslagen"-effect) ofwel verwijderen.

## 5. Flow: waar het te druk is, waar te leeg

**Te druk / verkeerd moment**
- **Ontdekking vs. beloning door elkaar.** De globale pauze van 40 s en de 210 s-cooldown op
  wijk/landmark/ommelanden (`hudbus.js:103-115`) zorgen dat een wijkkaart soms pas komt als de speler
  de wijk al uit rijdt. De kaart hangt aan "binnenkomen", niet aan "iets bereiken".
- **Momenten stapelen.** `checkTriggers` kan in één frame een death-scène, wanted5, een crash-replay,
  een wijkkaart en een landmark willen tonen (`cinematics.js:484-509`); de poorten vangen dat
  grotendeels, maar de volgorde is impliciet (priority/queue) en niet getest als geheel.
- **Elke missie heeft intro + outro + resultaatkaart**, en de intro is 4,8-8 s. Bij 30 missies is dat
  een vast ritueel; de "herhaal"-varianten (replay/short) verlichten het pas bij herspelen. Overweeg
  de intro bij een *herstart* van dezelfde missie tot 2 s in te korten (de data bestaat al:
  `quickScene`).
- **De startfly-in (5,5 s) + daarna de opening (3 aktes) + de wijkkaart** is drie "intro's" achter
  elkaar. Wie de opening terugzet (montage) moet de startfly-in schrappen of inkorten.

**Te leeg / missende momenten**
- **Verovering** (§9): het grootste gemis.
- **Eerste keer een bijzondere plek** buiten de 14 landmarks: Euroborg, Hoofdstation, Martinitoren
  hebben een orbit; Kardinge, het Stadspark, de Suikerfabriek, de Eemshaven, Bourtange en de
  Waddenzee niet. Voor de verover-film kunnen die de stop zijn; los daarvan verdienen de vijf
  bekendste plekken een landmark-orbit.
- **Eerste keer een activiteit**: klimtoren, kartbaan, kermis, zwembad, waterski, hengelen krijgen
  alleen een HUD-helpkaart. Dat is voor uitleg goed, maar een 3-5 s "onthulling" bij aankomst (camera
  die omhoog gaat, bord in beeld) zou de set pieces laten landen. Kies de vier grootste.
- **Einde van een activiteit**: museumkraak en rondvaart hebben een outro; kartbaan, padel, discgolf
  eindigen met een uitslagkaart. Voor de grote (museum, trein, rondvaart) is dat genoeg; voor de
  kleine is de kaart genoeg — maak dat expliciet in plaats van toevallig.
- **Eerste keer Samen spelen** heeft geen scène/kaart ("zo werkt het"); de uitleg zit in het
  Samen-paneel. Geen film van maken, maar één kaart bij de eerste sessie is goedkoop.
- **Eerste dood/busted** heeft een sterke scène (`playDeath`, timeScale 0,25, tint); **eerste
  verovering** heeft niets. Dat contrast is het bewijs dat de verover-film ontbreekt, niet een
  extraatje is.

## 6. Verhaal- en missiescènes

De inventaris (207 narratieve scènes, 169 script-id's) laat zien dat de **vorm** klopt: elke missie
heeft een intro, de meeste een outro, en er zijn 34 scènes binnen missies. De zwakke plekken zitten
in de details:

- **Vijf missies hebben geen eigen outro-spec** (M06, M10, M21, M22, M24). Ze hebben wel in-missie-
  regie (M06.3, M21.3/M21.6, M22.2/M22.4, M24.3), dus het is de vraag of dit bewust is; zo niet, dan
  is dat de eerste plek om te controleren.
- **Herhaling van vorm**: vrijwel elke missie-intro is "twee mensen + één NPC + orbit/dolly", en de
  regels zijn vaak uitleg ("Jelle haalt vandaag in Veendam…"). De beste scènes (keuken, verhuisdag,
  Oud-Oost) zijn de scènes waar iets *gebeurt*. Voor nieuwe scènes: één handeling per scène
  (iemand loopt weg, een deur gaat open, een vlag valt) in plaats van één gesprek.
- **Lange scènes zonder eigen regie**: in de inventaris staan scènes van 60-107 s die als kaart/tekst
  kunnen afgaan (C00.2 = 107 s, E2 = 96 s, M03.2 = 89 s, M03.4 = 84 s, M08.3 = 84 s, M20.5 = 81 s,
  M30.1 = 76 s). Niet allemaal zijn het cutscenes (radio, app, banter), maar elke scène boven de
  ~60 s met alleen tekst is een kandidaat om te splitsen of te regisseren. Deelreview 02 toetst dit
  per scène; de cijfers hierboven komen uit de inventaris.
- **De openingsmontage** (C00.1, ingesproken) is de best geschreven opening van het spel en wordt
  niet gebruikt (§5 van de samenvatting). Hergebruik hem als C00.1 (en laat de straatact van
  `ACT_TRAILER` vervallen), of verwijder `intromontage.js` en de verwijzingen.
- **Constitutie**: de teksten die ik zag zijn Nederlands, de personages verzonnen, "Grunn" staat
  zonder "de", en de grappen zijn satire zonder leed. Geen schendingen gevonden in de scène-data.

## 7. Samen spelen (samengevat uit 04)

Vijf hoogtepunten, met de volledige uitwerking in `04-multiplayer.md`:

1. **[Hoog] Stem/tijddrift bij de gast** door het ontbrekende `own`-veld (§4.3). Elke missiescène met
   opgenomen tekst raakt dit.
2. **[Hoog] Filmpjes zonder script zijn host-only.** De gast ziet bij wijk/landmark/crash/wanted5/
   Ommelanden/heist/treinreis alleen zwarte balken en soms niets; `schoonScene`
   (`coopworld.js:382-416`) stuurt geen kicker/titel/`big` mee. Fix: kaartgegevens meesturen, en de
   drie kale momenten een regel geven.
3. **[Hoog] Hostwissel/uitval midden in een scène**: geen scènestaat in de herstelmomentopname
   (`coophostwisselnet.js:63-69`), `updateCinematics` kent `coopHold` niet, en de aktreeks van de
   opening stopt (`story.js:515-531`). Fix: bij hold `skipCinematic()` of bevriezen, en de scène in de
   momentopname zetten.
4. **[Midden] Late join/herverbinden** midden in een scène krijgt alleen de laag, niet de scène
   (`coopnet.js:331`; `cutHostStart` bewaart het pakket niet).
5. **[Midden] Een gast in pauzemenu/kaart/winkel/telefoon/minigame** mist de scène of springt erna
   bij (`cinematics.js:424-434`; `#cine` z-index 15 vs winkel 41).

Plus: de gast ziet de veroverkaart en de gebiedsvoortgang niet (#414 telt per speler, maar de kaart
wordt niet gedeeld); de eigen scène van de gast wordt door een prioriteit-4-scène afgebroken; en er is
geen test op de gast-kant van een scriptscène. De spelregels die 04 voorstelt (per speler, host
bepaalt skip, gast skipt eigen beeld, nooit stil wegvallen) zijn een goede basis voor de
verover-film.

## 8. Waar cutscenes missen of juist te veel zijn (kort)

**Missen (in volgorde van impact):**
1. De verover-film per wijk/woonplaats/gemeente (het onderwerp van §9).
2. Een echte eerste-bezoek-film in plaats van een kaart — of bewust alleen de kaart, maar dan zonder
   de flyover-instelling die niemand ziet.
3. Vijf ontbrekende outro-specs (M06, M10, M21, M22, M24) controleren.
4. Onthullingen voor de vijf bekendste plekken zonder landmark-scène (Euroborg, Kardinge,
   Suikerfabriek, Eemshaven, Bourtange).
5. Een korte aankomstscène voor de vier grootste activiteiten (klimtoren, kartbaan, kermis, zwembad).
6. Een openingsmontage die wél speelt (of bewust schrappen, §5).
7. Eerste-keer-Samen-spelen-kaart (geen film).

**Te veel / kan weg:**
1. De startfly-in direct vóór de opening (dubbel intro-gevoel).
2. De `ACT_TRAILER`-straatact als de montage terugkomt (dubbele inhoud).
3. Missie-intro's bij een herstart van dezelfde missie (kort ze in; de data bestaat).
4. De flyover-instelling `wijkFilm` zodra de verover-film er is (één film per wijk is genoeg).
5. De `landmark`-scène naast een verover-film over dezelfde plek: laat de verover-film de landmark
   overnemen en houd `landmark` alleen voor plekken die je níet verover­t.

## 9. Het kernvoorstel: één lange cutscene per veroverde wijk

De volledige uitwerking staat in `00-WIJK-VEROVER-FILM.md` (raamwerk, codeplan, per-wijk scènes) en
`05-wijk-verovering.md` (harde inventaris) + `07-wijk-scenes-ontwerp.md` (8 uitgewerkte scènes). De
kern:

**Hoeveel wijken?** Niet 123. Met de statische catalogus zijn **8 wijken** bewezen veroverbaar
(Centrum 38 taken, Oud-Zuid 8, Nieuw-Noord 4, Zuidoost 4, Nieuw-Oost 3, Nieuw-West 3, Oud-Oost 2,
Fivelzigt 2), plus **23 kandidaten met één taak** (waarvan 4 stadswijken: Midden-Zuid, Oud-Noord,
Oud-West, Zuidwest). Reken op **7-11 handgeschreven intochten** in de stad; de rest van de 980
gebieden is buurt/woonplaats/gemeente/provincie en vraagt om een kortere of data-gedreven variant
(woonplaats 8-12 s, gemeente 15-20 s, provincie één finale van 40-60 s). Dat is te overzien.

**Vorm.** 20-40 s: overzicht (0-6 s) → 3-5 stops op ooghoogte (6-24 s) → detail/gevoel (3-5 s) →
eindbeeld met titel "Wijkheld van …" (5-7 s). Eén stem (Rikus), maximaal één bewoner met naamkaart.
Sluit aan op de volgpose van de speler (`behindPose`, zoals `playWijk`) zodat de camera niet in de
lucht blijft hangen. De uitgewerkte 07-variant kiest per scène **drie hoofdstukken (A/B/C) met elk een
eigen anker**; dat hoofdstukkenmodel bestaat nog niet in `cutscript.js`/`cutscenehost.js` en is het
enige nieuwe raamwerkstuk. Alternatief is één `playCinematic`-tour met een eigen `shot` (goedkoper,
maar niet als data naar gasten te sturen). Kies dit vóór #706 wordt gebouwd.

**Ontwerp-spanning die eerst beslist moet worden.** De veroverlaag is de CBS-wijk, maar de
emotionele buurten — Oosterparkwijk (het thuis van Tammo en Tessa), Korrewegwijk,
Noorderplantsoenbuurt, Selwerd, Herewegbuurt, De Hoogte, Westerhaven, Ebbingekwartier — halen op de
vaste taakankers **0-1 taken** en zijn dus niet veroverbaar; een intocht die daar hangt, vuurt nooit.
Drie opties: `MIN_TAKEN` voor de buurtlaag op 1, twee taken per geliefde buurt toevoegen, of de
intocht ook op de buurtlaag laten vuren (de scène hangt aan een plek + coördinaat, niet aan een
polygoon). Advies: het laatste, zodat de buurt de emotionele eenheid blijft en de CBS-wijk de
verover-eenheid met titel en huis. Zie **#736**.

**Techniek.** Nieuwe `veroverTourShot(w, gebied, stops)` op `camerapath.js` (`pathShot`, `clearKeys`,
`buildingReach`, `roofAt`), stops data-gedreven uit `ind.gebied.get(gid).taken` + landmarks binnen de
polygoon + het safehouse (`huisVan`). Speel via `playCinematic` (id `veroverd`, priority 3, pause,
letterbox, skippable, hideHud, hidePlayers). Geen cutscript: dat is lokaal en 10 s per shot.
**Let op:** `pause: true` pauzeert op dit moment niets (#729); de intocht moet wachten op die fix of
de speler tijdens de film expliciet blokkeren, anders kan hij wegrijden terwijl de camera door de
wijk gaat.

**Trigger.** `betaal()` in `gebiedenlive.js` vult alleen een wachtrij; een tick (`achievementtracker`)
speelt pas als de speler rustig is (geen cinematic/banner/respawn/missie/minigame/race, wanted 0,
niet in een menu/kaart, `sinceCinematic() > 2.5`, rust ≥ 2 s na de beloning). Voeg
`MOMENTS.veroverd` toe aan `hudbus.js` (niveau story, cooldown 0) — niet hergebruiken als `wijk`,
want die 210 s-cooldown blokkeert de beloning. Vul de wachtrij nooit vanuit `zaai()`, anders krijgt
een oude speler een spervuur.

**Eenmalig.** De beloning is eenmalig per profiel (`p.beloond`), maar dat profiel overleeft een nieuw
spel. Kies: `p.tours` (per speler, met dezelfde normalisatie) of een save-gebonden lijst; plus een
knop "Bekijk de intocht" in Loopbaan › Veroverd en de preview-tool.

**Samen spelen.** De verovering is per speler, dus de intocht is in principe lokaal (geen
32.000-tekens-pakket, geen host-afhankelijkheid). Wil de eigenaar dat iedereen meekijkt, gebruik dan
`playScript` met een compacte def en accepteer dat de gast de wijk misschien niet zelf veroverde;
de bestaande `coopcut`-weg is te zwaar voor een tocht over 400 m. Documenteer de keuze in
`docs/COOP-GAST.md`.

**Wat met de huidige wijk-scène?** De kaart en de flyover zijn oriëntatie; de intocht is beloning. Laat
de kaart staan (of kort hem in), houd `WIJK_LINES` als stem, maar zet `wijkFilm` uit voor wijken met
een intocht en hergebruik `wijkHighlights` niet (die zoekt op buurtpunten). Na de intocht mag de HUD
de titel als kicker tonen — de goedkoopste beloning die er is.

## 10. Issue-klaar overzicht (samengevat; details in de deelrapporten)

Severity: **K** = Kritiek (breekt de ervaring), **H** = Hoog, **M** = Midden, **L** = Laag.
Elke regel is een issue-kandidaat met bewijs, impact en fix. Alle 30 staan als issue op het bord;
de nummers staan in `_issues_gemaakt.json` en `_issues_gemaakt2.json`.

Naast de 30 punten hierboven leverde deelreview 01 nog een kritieke vondst en vijf losse issues op:
**#729** (`pause:true` pauzeert niet — Kritiek), **#730** (regiehoogten op absolute z=0), **#731**
(`attachVoices` rekt de duur na `compileScene`), **#732** (landmark/Ommelanden zonder
snelheids-/race-/duifpoorten), **#733** (stemmenbank laadt zonder retry) en **#734** (bundel met de
resterende 14 midden- en 2 laagpunten uit 01). Uit de wijk-scène-ontwerp-review kwam daar **#736**
bij: geliefde buurten (Oosterparkwijk, Korrewegwijk, Selwerd, …) zijn met 0-1 taken niet veroverbaar,
terwijl juist daar de emotionele scènes horen.

| # | Sev | Issue | Bewijs | Fix | Labels |
|---|---|---|---|---|---|
| C1 | H | Verovering van een wijk is een HUD-bericht van 7 s; geen scène, vlag of titel in beeld | `gebiedenlive.js:132-136` | verover-film (§9) + beloningskaart erna | impact-hoog, kosten-M |
| C2 | H | "Wijk" is twee lagen: 66 buurtpunten (HUD/scènes) vs 123 CBS-wijken (veroveren) | `cinematics.js:765-773`, `gebieden.js:121-124` | één laag per UI; buurtpunten alleen HUD | impact-hoog, kosten-S |
| C3 | H | Coöp: gast hoort andere stem/ondertiteltijd doordat `own` uit het pakket valt | `missionstory.js:1099`, `coopcut.js:25,66`, `cinematics.js:275-295` | `own`/`clue`/`card` meesturen + test | impact-hoog, kosten-S |
| C4 | H | Coöp: alle `playCinematic`-films zijn host-only; gast ziet balken + regel, soms niets | `coopworld.js:382-416`, `coopscene.js:105-120`, 43 aanroepen | kaart/titel meesturen; kale momenten een regel geven; grote films via compacte def | impact-hoog, kosten-M |
| C5 | H | Coöp: hostwissel/uitval midden in een scène breekt de reeks; geen scènestaat in de momentopname | `coophostwisselnet.js:63-69`, `cinematics.js:408-434`, `story.js:515-531` | hold → skip/bevries; scène in momentopname | impact-hoog, kosten-M |
| C6 | H | Wijkflyover is standaard uit, deelt 210 s cooldown en speelt alleen < 43 km/h | `settings.js:60`, `hudbus.js:103-115`, `cinematics.js:47,808-816` | vervangen door verover-film; `wijkFilm` laten vallen | impact-hoog, kosten-S |
| C7 | H | Opgenomen openingsmontage (85 s) is onbereikbaar; `replayIntro`/`introSeen` hebben geen aanroeper; docs verwijzen ernaar | `intromontage.js:53-58,1375`, `cinematics.js:656`, `ARCHITECTURE.md:392`, `trailerstate.js:32-34` | hergebruiken als C00.1 of dood materiaal + docs opruimen (besluit vastleggen) | impact-hoog, kosten-M |
| C8 | H | Opening kan na 40 s definitief vervallen; keuken/straatset hangen aan de spelerpositie in plaats van thuis | `story.js:238-248,491-522` | geen tijdslimiet; anker op `homeSpawnPoint`; retry | impact-hoog, kosten-S |
| C9 | M | Finale teleporteert de speler zonder overgang; in een voertuig wijkt beeld en plek uiteen | `story.js:624-668` | fade/zwartframe; voertuig afhandelen; anker op speler | impact-midden, kosten-S |
| C10 | M | Activiteitenscènes: 43 aanroepen, eigen vlaggen, geen gedeelde helper; geen close-up/reactie/insert-grammatica | `heist.js:1457-1510`, `stationtravel.js:583-790`, `dorpsuitjes.js:380` | helper `scene()` uit dorpsuitjes veralgemenen; één scene-standaard | impact-midden, kosten-M |
| C11 | M | Vier grote set pieces (klimtoren, kartbaan, kermis, zwembad) hebben alleen een HUD-helpkaart | `activities.js`/`klimtoren.js` e.a., `docs/GEBIEDEN.md` | 3-5 s onthulling bij aankomst; kies de vier grootste | impact-midden, kosten-M |
| C12 | M | Ontdekking te streng gerantsoeneerd: wijkkaart kan pas komen als de speler de wijk al uit is | `hudbus.js:103-115`, `attention.js:31-52`, `cinematics.js:810,818` | ontdekking losser of kaart bij "blijven staan"; beloning buiten het quotum | impact-midden, kosten-S |
| C13 | M | `wijkHighlights` zoekt op buurtpunten en kan landmarks van een andere wijk tonen | `cinematics.js:828-840` | punt-in-polygoon (`grenzen.js`) of catalogus-stops | impact-midden, kosten-S |
| C14 | M | Veroverde gebieden heten "Wijk 00/01/13/14"; titel wordt "Wijkheld van Wijk 14" | `gebieden.js:94-99` | naam aanvullen of laag overslaan | impact-midden, kosten-S |
| C15 | M | Verover-film kan niet naar gasten; pakketlimiet 32.000 tekens valt stil weg | `coopcut.js:11-38`, 05 F4 | lokaal per speler (voorkeur) of compacte def + test | impact-midden, kosten-M |
| C16 | M | Geen `MOMENTS.veroverd`; hergebruik van `wijk` blokkeert de beloning 210 s | `hudbus.js:103-115` | nieuwe momentsoort (story, cooldown 0) | impact-midden, kosten-S |
| C17 | M | Wachtrij/eenmaligheid: profiel overleeft nieuw spel; `zaai()` zou een spervuur geven | `gebieden.js:276-290`, `storagekeys.js:86` | `p.tours` of save-gebonden; alleen `betaal()` vult de wachtrij | impact-midden, kosten-M |
| C18 | M | Coöp late join/herverbinden midden in scène krijgt alleen de laag | `coopnet.js:331`, `coopcut.js:111-121` | pakket bewaren en bij join sturen, of expliciet "niet" documenteren | impact-midden, kosten-M |
| C19 | M | Coöp: gast in pauze/kaart springt bij; in winkel/telefoon/minigame mist hij de scène | `cinematics.js:424-434`, `coopscene.js` | cinematic boven paneel of scène uitstellen; tik pauzeren bij gastmenu | impact-midden, kosten-M |
| C20 | M | Coöp: eigen scène van de gast wordt door prioriteit-4-scène afgebroken | `cinematics.js:249-262`, `coopcut.js:195-212` | prioriteit/queue per client respecteren | impact-midden, kosten-S |
| C21 | M | #414-verovering en veroverkaart tellen niet/zijn niet zichtbaar voor de gast | 04 §9, `docs/GEBIEDEN.md` | kaart/toast delen zonder voortgang te delen; regel in COOP-GAST | impact-midden, kosten-S |
| C22 | M | Dode `cutvervang`-tak zonder gast-handler | `coopcut.js:131-137`, 04 §10 | implementeren of verwijderen | impact-midden, kosten-S |
| C23 | M | Vijf missies zonder outro-spec (M06/M10/M21/M22/M24) — controleren of bewust | `cutscenes_akte*.js`, `storyarc_nieuw.js` | spec toevoegen of in docs als bewust noteren | impact-midden, kosten-S |
| C24 | M | Documentatie loopt achter (ARCHITECTURE:392, GEBIEDEN "geen scène", COOP-GAST zonder veroveren, preview zonder intocht) | docs | vier docs bijwerken in dezelfde commit | impact-midden, kosten-S |
| C25 | L | Safehouse heet "Safehouse Wijk 00" | `gebieden.js:337-342` | idem C14 | impact-laag, kosten-S |
| C26 | L | HUD toont na verovering nog dezelfde buurtregel; titel nergens in het spelbeeld | `hud_panel.js:742`, `cinematics.js:747-750` | titel als kicker bij veroverd gebied | impact-laag, kosten-S |
| C27 | L | `fierljep`/`pg-aim` gebruiken `playCinematic` als camerawrapper (600 s, niet skipbaar) | `pg_fierljep.js:157`, `fierljep.js:345` | aparte cameramodus i.p.v. cinematic-slot | impact-laag, kosten-M |
| C28 | L | `loadWijken(fresh)` wist de gezien-lijst voor alle saves | `cinematics.js:664,775-785` | lijst in de save of niet wissen | impact-laag, kosten-S |
| C29 | L | Geen test op de gast-kant van een scriptscène; geen test op een verover-film | `scripts/coopcut_test.mjs`, 04 §15 | pure tests + testbankstap | impact-laag, kosten-S |
| C30 | L | Aftiteling: 18 identieke kaarten, ~71 s | `story.js:702-710` | variatie in shots; skip-hint vasthouden | impact-laag, kosten-S |

## 11. Aanbevolen volgorde (drie golven)

**Golf 1 — klein, direct merkbaar (S/M, dagen):**
1. De verover-haak: `betaal()` → wachtrij + rust-poort + `MOMENTS.veroverd` (C1/C16); nog zonder
   film, maar met de titel in de HUD (C26) en de knop "Bekijk de intocht" (C17).
2. Het besluit "wijk = CBS-wijk" vastleggen en de UI consequent maken (C2/C14/C24).
3. De openingsmontage: beslissen (terug of weg) en de docs kloppend maken (C7).
4. Coöp `own`-fix (C3) — een kleine wijziging met veel effect.

**Golf 2 — de kern (M, weken):**
5. De eerste drie intochten: Oud-Oost "De stoep" (emotie), Centrum "Klokslag" (inhoud) en
   Nieuw-Noord "Tegenwind" (bewijs dat activiteiten in een scène kunnen). Data-gedreven stops uit de
   catalogus; per wijk één handgeschreven laag.
6. Coöp: kaart/titel meesturen voor host-only films (C4) en de hostwissel-scènestaat (C5).
7. Activiteitenscènes: gedeelde helper + de vier onthullingen (C10/C11).

**Golf 3 — afmaken (L/M):**
8. De overige intochten (t/m 11) + woonplaats/gemeente-varianten.
9. Finale-fade (C9), aftiteling-variatie (C30), tests (C29), preview-integratie.

## 12. Dekking en wat niet is bekeken

- **Wel gedaan:** statische leesreview van `cinematics.js`, `cutscript.js`, `cutscenehost.js`,
  `coopcut.js`, `coopscene.js`, `cutscenes.js`, de akte-bestanden, `story.js` (opening/einde/credits),
  `intromontage.js`, `trailerstate.js`, `camerapath.js`, `gebieden.js/live/bronnen`, `gebiedenui.js`,
  `hudbus.js`, `attention.js`, `busy.js`, `settings.js`, de werelddata (`grenzen.json`, `stad.json`,
  `echteplekken.json`), en de cutscene-tests en docs. Daarnaast de deelreviews 04, 05 en 07.
- **Niet runtime getest:** geen Electron, geen spel, geen netwerk, geen volledige suite, geen
  releasebouw. Alles wat met waarneming te maken heeft (staan de balken goed, hoort de gast dezelfde
  stem, is de HUD echt bedekt) is uit code/CSS afgeleid.
- **Deelreview 02 (verhaal) heeft geen eindrapport opgeleverd:** de reviewer is gefaald; een tweede,
  begrensde reviewer is gestart en levert mogelijk later `02-verhaal-scenes.md`. Tot die er is, is
  §6 dekkend op mijn eigen lezing plus de inventaris, maar de systematische scène-voor-scène-audit
  van alle 89 staging-specs en de volledige verhaal-/continuïteitsanalyse per akte ontbreken. De
  inventariscijfers (207 scènes, 101 min, 44% zonder eigen regie) komen uit de tussenstand van de
  eerste reviewer en zijn niet in een eindrapport verantwoord.
- **Deelreview 01 (regie/techniek) is wél aangeleverd** (`01-regie-techniek.md`, 20 bevindingen) en
  de kritieke vondst is door de Lead onafhankelijk in `main.js`/`cinematics.js` gecontroleerd.
- **Niet in beeld gezien:** de wereldtegels (`game/world/` is lokaal niet gebouwd), dus geen echte
  camerabeelden, maten of prestaties; geen TTS gegenereerd; geen mobiel/touch-apparaat; geen
  vier-speler-sessie.
- **Werkboom:** er stonden tijdens de review niet-gecommitte wijzigingen van een andere sessie in
  coöp- en audiobestanden; ik heb de schijf-versie gelezen. HEAD is tijdens het werk twee keer
  opgeschoven (docs/dev-commits); de cutscene-code is gelijk gebleven.
- **Geen commits, geen GitHub-issues en geen `.env`** — dit rapport is input voor de eigenaar.
