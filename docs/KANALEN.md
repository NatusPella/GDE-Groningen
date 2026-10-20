# Kanalen: alles wat de aandacht van de speler vraagt

Input voor #92 (minder ruis, meer visuele communicatie), uit #104 (één planner). Dit bestand wordt gemaakt door `node scripts/hudbus_inventory.mjs --md` uit de tabel `SURFACES` in `game/js/hudbus.js`; pas die tabel of de teksten in het script aan, niet dit bestand. Het getal bij de aanroepers komt uit de broncode van het moment van schrijven. De kolom "Voorstel" is een voorstel voor #92, geen besluit. Niets hiervan is in beeld bekeken.

## Hoe het nu gepland wordt

Eén vraag, `mayShow(kanaal, ctx)` in `hudbus.js`. De tabellen en regels staan daar; de oude modules houden hun toestand (klok, probes, laatste tijd) en vragen het antwoord:

| Poort | Regel in hudbus | Toestand blijft in | Wat het beslist |
|---|---|---|---|
| `hud` | `mayShowP` | `hudrules.js` | P0 tot P3: bij drukte of dialoog wacht P3 (en P2 in zone A) |
| `narrative` | `decideStart` | `narrative.js` | verhaal, praat en toasts, een tegelijk, met pauzes |
| `moment` | `decideMoment` | `attention.js` | filmische momenten: afkoeling, snelheid, rang na een hoger moment |
| `tip` | `decideTip` | `attention.js` | een tip per 20 s |
| `voice` | `decideVoice` | `attention.js` | telefoonberichten voorlezen: personage altijd, nieuws en app om de 45 en 30 s |
| `overlay` | `decideOverlay` | `overlayhold.js` | een volledig-scherm kaart houdt kleine kaarten tegen |
| `speech` | `decideSpeak` | `speech.js` | een stem tegelijk, een hogere klasse snijdt een lagere af |

Daarnaast: de kaartenwachtrij (`enqueueCard`, `hudcards.js`) en de zonelayout (`decideHud`, `hudrules.js`). Een nieuwe module die zelf iets op het scherm zet moet in `SURFACES` staan (`scripts/hudbus_surfaces_test.mjs`), met een poort of met de reden waarom niet.

## Per kanaal

| Kanaal | Module | Aanroepers | Prioriteit | Zone | Via hudbus | Voorstel #92 |
|---|---|---|---|---|---|---|
| kaart | hudcards.js | 114 modules, 428 aanroepen | P0 tot P3 per soort | A | ja: hud, narrative (card), tip | Blijft de ene tekstkaart. Alles wat nu een eigen tekstkaartje is (Opgeslagen, prestatietoast) kan hier als soort in; dat scheelt twee eigen DOM-elementen. |
| prestatie | achievements.js | 31 modules, 80 aanroepen | P3 | E | ja: narrative (award), overlay (prestatie) | Samen met kaart: de soort prestatie bestaat al in KINDS (zone E). Een kaart met een medaille-icoon in plaats van een tweede element. |
| bel | phonefeed.js | 3 modules, 3 aanroepen | P1 | A | ja: narrative (call), speech (call) | Samen met radio: twee telefoonschermen (phonefeed en storycontact) voor hetzelfde gesprek; één telefoonpaneel met een portret en een regel. |
| bericht | phonefeed.js, sikkomfeed.js | 3 modules, 3 aanroepen | P1 tot P2 per soort | A | ja: narrative (text, phone), voice | Samen met kaart voor wat niet verhaal is (bank, nieuws, app): dezelfde zone, dezelfde rang, nu twee stromen. Voorlezen: alleen verhaal. |
| radio | storycontact.js | 1 module, 2 aanroepen | P1 | - | ja: narrative (contact) | Samen met bel (zie daar). Het portret en de ondertitelregel zijn het enige dat de speler echt nodig heeft. |
| opmerking | story.js | beslist zelf | P1 | - | ja: narrative (say) | Samen met autopraat en ballon: een praatkanaal, dat als ondertitel of als ballon laat zien, nooit allebei. |
| autopraat | banter.js | 2 modules, 2 aanroepen | P3 | G | ja: narrative (banter, sub-banter), speech (banter) | Samen met opmerking en ballon (zie daar). De 8 s wachttijd na verhaal blijft. |
| ondertitel | cinematics.js, storytalk.js, subtitles.js | 4 modules, 4 aanroepen | P1 | G | ja: narrative (sub-cine) | Blijft. setDualText is een tekstmaker, geen kanaal: meerdere modules bouwen er hun eigen regel mee; de plaatsing hoort bij het ene ondertitelblok. |
| scene | cinematics.js, intromontage.js, respawn.js en 1 andere | 15 modules, 30 aanroepen | n.v.t. | - | ja: narrative (scene) | Blijft. |
| moment | cinematics.js | beslist zelf | n.v.t. | - | ja: moment (wijk, landmark, ommelanden, crash, wanted5) | wijk en landmark kunnen samen met de plaatsnaam: het vlucht-shot is dezelfde boodschap als de naam. Minder momenten, meer plaatsnaam. |
| banner | cinematics.js | 17 modules, 27 aanroepen | P0 | D | ja: overlay (resultaat), narrative (scene) | Blijft de ene resultaatkaart. Veel minigame- en bijbaanmodules roepen hem apart aan; één gedeeld resultaat via minigamekit scheelt herhaling. |
| naamkaart | namecard.js | 2 modules, 3 aanroepen | n.v.t. | - | ja: overlay (naamkaart) | Samen met ondertitel: de naam staat al als sprekerlabel in de regel; de grote kaart alleen voor het eerste ontmoeten. |
| plaatsnaam | hud_panel.js | beslist zelf | P3 | B | ja: overlay (locatie) | Samen met moment (wijk, landmark) en opgeslagen: een plaatsblok. |
| wijkkaart | cinematics.js | beslist zelf | P3 | B | ja: overlay (wijkkaart) |  |
| keuze | choicepanel.js | 9 modules, 9 aanroepen | P1 | B | ja: overlay (keuze) | Samen met bord en activiteit: een activiteitenpaneel bovenaan (kop, regels, toetsen). Het keuzepaneel en het minigamebord zijn dezelfde familie. |
| bord | minigamekit.js | 13 modules, 13 aanroepen | P1 | B | ja: overlay (duelbalk) | Samen met keuze en activiteit (zie daar). |
| ballon | scene3d.js | 13 modules, 24 aanroepen | P3 | - | ja: speech (ambient) | Samen met opmerking en autopraat (zie daar). Achtergrondballonnen van voorbijgangers blijven eigen, ze zijn sfeer. |
| spraak | speech.js | 14 modules, 19 aanroepen | n.v.t. | - | ja: speech | Blijft. Zie ook #110 (voicebank). |
| status | hud_panel.js, hudgps.js, lowhealth.js | beslist zelf | P2 | - | nee: decideHud (hudrules.js) zet sterren, geld, kaart, voertuig, doel en balken neer | Blijft; dit is de vaste laag. decideHud blijft in hudrules (zonelayout), de tabellen zijn die van hudbus. |
| opgeslagen | savegame.js | beslist zelf | P3 | F | nee: het kleine Opgeslagen-vinkje bij de plaatsnaam, links onder; een eigen DOM-element, geen kaart | Weg als eigen element: een pictogram in het plaatsblok, of een kaart van de soort tip. |
| toetsen | prompts.js, hudtext.js | 18 modules, 18 aanroepen | P2 | H | nee: de toetstips tellen mee in decideHud (keys); gameBusy houdt ze weg | Blijft. Veel modules leveren een toetstip aan; geen planner nodig, de ruimte is vast (twee regels). |
| activiteit | stunthud.js, heistui.js, casework.js en 10 andere | beslist zelf | P1 | C | nee: het paneel van de activiteit zelf; de activiteit bepaalt wanneer, playerBusy houdt de rest weg | Samen met keuze en bord: een gedeeld activiteitenpaneel (createBoard) voor titel, stand en toetsen. Veel eigen CSS-strings verdwijnen. |
| voertuighud | heliflight.js, helirun.js, planeflight.js en 1 andere | beslist zelf | P2 | H | nee: vervangt de snelheidsmeter zolang je vliegt (body.heli-flying) | Samen: een voertuigblok per voertuigsoort via hudlook (welke meters per voertuig staat er al). |
| samen | coophud.js, coophold.js, coopscene.js en 1 andere | beslist zelf | P2 | - | nee: het partnerlabel en de fade bij samen spelen, en het meekijklaagje van een gast op de scene van de host (coopscene.js, volgt wat de host toont); geen eigen planner | Blijft; klein en zonder tekst. |
| menu | pausemenu.js, mapview.js, phone.js en 8 andere | beslist zelf | n.v.t. | - | nee: de speler opent het zelf; het is modaal en de rest wacht | Blijft; buiten dit probleem (de speler vraagt erom). |
| invoer | input.js, touch.js, aimassist.js | beslist zelf | n.v.t. | - | nee: invoer en richtkruis; vragen de aandacht niet | Blijft; vraagt geen aandacht. |
| dev | storydev.js, storytest.js, testmenu.js en 2 andere | beslist zelf | n.v.t. | - | nee: ontwikkel- en promohulpen; niet voor de speler | Blijft; hoort niet in het kritieke pad (zie #109). |
| effect | postfx3d.js, drunk.js | 3 modules, 3 aanroepen | n.v.t. | - | nee: schermeffect zonder tekst (flits, kleur); geen informatie | Blijft; geen informatie, geen kanaal. |

## Wat de speler ziet

- **kaart**: Het berichtkaartje links boven (zone A, een tegelijk, met een korte wachtrij): missie, bijbaan, geld, politie, gevaar, tip. Ook de nieuwsticker, de reiskaart en de kaartmeldingen komen hier.
- **prestatie**: De prestatietoast (zone E, links midden). Wacht op de resultaatkaart, het keuzepaneel en een duelbalk.
- **bel**: Het belscherm van de telefoon (zone A, P1); houdt het spraakkanaal als klasse call.
- **bericht**: Telefoonberichten (verhaaltekst, sms, nieuws, bank) als kaartje in zone A; sommige worden voorgelezen (ratio per soort).
- **radio**: De verhaalradio en de beltelefoon van een personage (rechts, onder het statusblok): portret, regel, golfvorm.
- **opmerking**: De opmerking van de metgezel als een stap begint: een spraakballon boven het personage.
- **autopraat**: Gesprek tijdens het rijden: ondertitelregel onderaan (zone G); wacht langer dan al het andere verhaal.
- **ondertitel**: Ondertitels en dubbeltekst (Fries/Gronings met Nederlandse regel) onderaan (zone G); het doel dimt eronder.
- **scene**: Tussenfilmpjes en intro (hele scherm); niets anders start zolang er een scene loopt (alleen bekeken, nooit geremd).
- **moment**: Gerantsoeneerde filmische momenten: nieuwe wijk, bezienswaardigheid, Ommelanden, crash-herhaling, vijf sterren. Vragen aan attention.js.
- **banner**: De resultaatkaart midden (Missie geslaagd / mislukt, bijbaan, minigame), met stats. Houdt personagenaam, plaatsnaam, prestatie en duelbalk tegen.
- **naamkaart**: De naamkaart bij het eerste ontmoeten van een personage (groot, links onder, boven de ondertitel).
- **plaatsnaam**: De naam van de plek waar je binnenkomt (zone B, bovenaan midden), met het Opgeslagen-vinkje ernaast.
- **wijkkaart**: 
- **keuze**: Het keuzepaneel van een tekstbijbaan of verhaalkeuze (bovenaan midden, antwoorden met nummertoetsen).
- **bord**: Het minigamebord (bovenaan midden): titel, stand, toetsen. Houdt prestatietoast en plaatsnaam tegen.
- **ballon**: Spraakballonnen boven voetgangers, bemanning, zwemmers en de metgezel; spreken een opname uit op de ambient-klasse.
- **spraak**: Het ene stemkanaal: een regel tegelijk, hogere klasse snijdt lagere af (speech.js, nu regels in hudbus).
- **status**: De vaste HUD: sterren, geld, wapen, klok, kaart, balken, voertuig, doel, GPS (zones B, C, F, G). decideHud in hudrules.js zet ze neer.
- **opgeslagen**: Het kleine Opgeslagen-vinkje links onder, bij de plaatsnaam.
- **toetsen**: De toetstips onderaan rechts (zone H, maximaal twee): wat E, Spatie en de rest hier doen.
- **activiteit**: Het eigen paneel van een activiteit (stuntscore, heistpanelen, tekstbijbaan, bakronde, padel, kermis en andere): rechts of bovenaan, alleen tijdens de activiteit.
- **voertuighud**: Voertuig-HUD buiten de auto: de heli-HUD (vervangt de snelheidsmeter), de vliegtuigkaart en het busbord.
- **samen**: Samen spelen: de fade bij binnenkomst en het partnerlabel.
- **menu**: Pauzemenu, kaart, telefoon, overzicht, garage, winkel, startscherm, profiel: de speler opent ze zelf; modaal.
- **invoer**: Invoer en richtkruis: aanraakknoppen, toetsenbordhulp, het richtkruis.
- **dev**: Ontwikkel- en promohulpen (testmenu, trailer, verhaaltest): niet voor de speler.
- **effect**: Schermeffecten zonder tekst: flits (trailer, dorpsuitje, verhaal), kleur van de dronken speler.

## Voor #92: wat kan samen, wat kan weg

Zes groepen die nu apart zijn gebouwd en voor de speler grotendeels hetzelfde zijn:

1. **Eén tekstkaart** (zone A): `kaart`, `bericht` (wat geen verhaal is), `prestatie` en `opgeslagen` worden één stroom van kaartjes met een icoon per soort. Dat haalt twee eigen DOM-elementen weg en maakt de rang duidelijk.
2. **Eén telefoon**: `bel` en `radio` zijn twee schermen voor hetzelfde gesprek (portret, een regel, geluid).
3. **Eén praatkanaal**: `opmerking`, `autopraat` en `ballon` laten een personage praten; kies per moment ondertitel of ballon, nooit beide.
4. **Eén activiteitenpaneel** bovenaan: `keuze`, `bord` en `activiteit` (stuntscore, heist, tekstbijbaan en de panelen van padel, kermis en bakronde) zijn dezelfde familie en delen nu elk hun CSS-string.
5. **Eén plaatsblok**: `plaatsnaam`, `moment` (wijk, landmark) en `opgeslagen`.
6. **Eén voertuigblok**: `voertuighud` per voertuigsoort, via `hudlook`.

Bewust niet aan een poort gekoppeld (`own` in de tabel): `status` en `toetsen` worden door `decideHud` neergezet, `activiteit`, `voertuighud` en `samen` horen bij een activiteit of voertuig dat de rest al wegzet (`playerBusy`), `menu`, `invoer`, `dev` en `effect` vragen niet om aandacht. Een poort erbij zou de beslissing veranderen, niet vastleggen.

Blijven zoals ze zijn: `status`, `toetsen`, `ondertitel`, `scene`, `banner`, `spraak`, `samen`, `menu`, `invoer`, `dev`, `effect`.

Vuistregel voor de omzetting: eerst de planner (die is er), dan per groep de kanalen samenvoegen en de rij uit `SURFACES` halen; de test houdt bij dat er geen nieuw kanaal naast komt.
