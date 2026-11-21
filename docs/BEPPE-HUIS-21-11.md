# Beppes huis: vroeg open, een plek om langs te gaan (#1063, 21-11)

Wens van de eigenaar: "Ik wil beppe haar huis veel eerder laten unlocken, zodat je daar af en toe naartoe kunt gaan." Code: `game/js/beppe_visit_rules.js` (puur), `beppe_visit_texts.js` (alleen tekst), `beppe_binnen.js` (de kamer), haken in `beppe_garden.js` en `beppe_rules.js`. Test: `scripts/beppe_visit_test.mjs`. Het eerbetoon zelf (bankje, bordje, tuin, herinnering) staat in #832 en [personages.md](personages.md).

## De verhaalboog (aanvulling 21-11, verduidelijking van de eigenaar)

Eigenaar: "Dat je Beppe eerst een keer bezoekt als speler en ziet hoe hartelijk zij is. En dat zij dan ook Tessa voor het eerst ziet, en zegt dat Tammo en Tessa vrienden zijn. Beppe is de oma van Tammo. Dat een paar missies later Beppe overlijdt en de herinnering alleen blijft." Dit vervangt het uitgangspunt "overleden vóór het spel, een memorial vanaf het begin" van de eerste versie van dit werk.

| Stap | Waar in de verhaalketen | Wat | Hoe afgeleid |
| --- | --- | --- | --- |
| Uitnodiging | na M01 (akte 1) | het huis opent; Tammo stuurt een bericht | `visitUnlocked`: M01 of een latere stap klaar |
| Eerste bezoek | eerste keer door de deur, akte 1 | Beppe in persoon: knuffel voor Tammo, soep; **Tessa ontmoet haar**, ze klikken over koeien en het platteland, Beppe zegt dat ze vrienden zijn, Tammo is verlegen, Tessa reageert | scène `FIRST_VISIT`, merk `eerste` (per save) |
| Wenken | na M03 en na M06 | een kort bericht van Tammo als je nog niet (twee keer) bent geweest | `nudgeDue`, merken `wenk:1`, `wenk:2` |
| Bezoeken terwijl ze leeft | elke keer daarna | een kort gesprekje (3 tot 4 regels): groet naar bezoekentelling en wie je speelt (ze vraagt naar de ander), een opmerking naar akte, dagdeel en weer, soms een tip, een afscheid; soep eens per speeldag | `aliveVisit`, merken `bezoek1..4` |
| Overlijden | **na M06** (einde akte 1), maar pas als je haar kent: kennismaking gedaan en minstens twee keer binnen geweest; **terugval na M08** wat je ook deed | rustig bericht van Tante Aaltje ("Beppe is vannacht rustig ingeslapen"), alleen als je buiten het huis bent | `arcPhase` (afgeleid), merk `nieuws` |
| Afscheid | eerste bezoek na het nieuws | het lege huis: kaarsje, foto's, de stoel bij het raam, het briefje "Soep staat op het fornuis"; Tammo zwijgt bijna, Tessa staat naast hem | scène `FAREWELL_SCENE`, merk `afscheid` |
| Herinnering | daarna | Beppe verdwijnt uit het huis; kaars, foto en lege stoel; het briefje op tafel wordt "Wat Beppe zou zeggen" (12 briefjes per akte, speler, dagdeel en weer); soep blijft (kleine bonus, eens per dag) | `pickMemory` |
| Echo's | na M09, M16 en M24 | drie keer, zeer sporadisch, één regel van Tammo of Tessa | `echoDue`, merken `echo:<id>` |

**Waarom M06 en een terugval op M08.** Het ritme van het verhaal: akte 1 (M01 tot M06) eindigt luid met de museumkraak en de eindkaart ("Dat was akte 1. Er komt meer."); akte 2 begint met een gebroken, grappig stuk (M07, M08 Fatbikes). Een stil moment tussen de twee aktes past het beste en geeft vijf missies (M02 tot M06) om haar te leren kennen: "een paar missies later". De terugval op M08 voorkomt dat een speler die nooit komt haar nooit ziet sterven en het verhaal eromheen laat hangen. De voorwaarde "kennismaking en twee bezoeken" voorkomt dat ze sterft vlak na de eerste ontmoeting. Wie M06 haalde zonder haar te kennen krijgt twee wenken en daarna, uiterlijk bij M08, de herinnering.

**Canon-afweging.** Nagekeken: het verhaal (`docs/verhaal/**`, `storyarc_nieuw.js`, de cutscenes en `script.json`) zegt nergens iets over Beppe; zij bestond alleen in het eerbetoon (#832: `beppe_texts.js`, `beppe_garden.js`) en in `docs/personages.md`. Niets ingesproken verwijst naar haar (voice_coverage groen, 0 nieuwe gesproken regels). De enige botsing was het eerbetoon zelf: het was "in herinnering" vanaf het begin. Minimaal aangepast: de herinneringskaart ("Ik hoopje dat der in himel is", `REMEMBRANCE`) en het laatste-bankje-plaatje worden pas in de herinneringsfase getoond; het bankje blijft tot dan een rustpunt zonder herinneringskaart. Wat bleef: het koperen plaatje, het Kollum-bordje, de aankomstkaart, de verborgen prestatie "Goed eten" en de aftitelingskaarten (die ná het verhaal komen, dus kloppen). `docs/MUZIEK-OPDRACHT-GEMINI.md` noemt "de Oma- en Beppe-scènes" (M27 tot M29): dat zijn de scènes van Oma Trijntje; er is geen Beppe-scène in die missies en er is niets aangepast. De postgame-wenk ("Ik moet nog even langs mijn beppe") klopt nu beter: dan is het een bezoek aan de herinnering.

**Beppe heeft geen stem.** Haar tekst komt in het gesprekspaneel (`beppe_gesprek.js`, het tekstpaneel van de tekstbanen, met een warme accentkleur en haar naam als kicker) en nooit als spraak. In beeld staat een eigen figuur (oude vrouw in een vest, een bun, idle-animatie) bij de keukentafel. De knuffel is een tekstregel (er is geen knuffelanimatie).

**Opslaan en laden.** De fase is nooit opgeslagen: zij volgt uit de verhaalstand en de merken in de per-save set `beppe` (in de prestatiegegevens van de save, `getAchievementSaveData`; een oudere save mist de sleutel en heeft dus geen merken). Een save die al voorbij het overlijden is staat meteen in de herinneringsfase (de merken `nieuws` en `afscheid` gaan na een korte gratietijd stil aan: geen nieuws, geen afscheid). Een save tussen de uitnodiging en het overlijden krijgt de levende variant. Een scène is atomair: haar merk komt pas aan het eind, dus opslaan en laden midden in de ontmoeting of het afscheid speelt hem opnieuw.

**Samen spelen.** De verhaalboog is **lokaal per speler**: elke speler heeft zijn eigen verhaalstand, zijn eigen merken en loopt zelf naar binnen (het huis is van de wereld van wie het spel opende, het gesprek niet). De scènes worden niet naar gasten gestuurd; een gast ziet een figuur door de deur gaan. Beloning en voortgang (soep, merken) zijn per speler (#429). Niemand krijgt een recht bij. De scène noemt Tammo en Tessa allebei, wie je ook speelt (het bestaande patroon voor scènes met het vaste duo). Zie [COOP-GAST.md](COOP-GAST.md).

**TTS.** Alle nieuwe regels zijn alleen tekst en staan in [verhaal/TTS-ACHTERSTAND-21-11-alleen-tekst.md](verhaal/TTS-ACHTERSTAND-21-11-alleen-tekst.md). Test: `scripts/beppe_boog_test.mjs`.

**Niet gedaan of nog niet in beeld bekeken:** de kamer met Beppe, het gesprekspaneel, de figuur (haaksheid, kleding, idle), de camerahoek met de figuur erbij, de nieuwe rekwisieten (kaars, foto, stoel); geen knuffelanimatie en geen echte cutscene (alles is tekst in het paneel, in de kamer); Tessa en Tammo staan niet als figuren in de kamer (alleen hun regels); geen telefoontje met stem. De scène is niet als echte verhaalstap in `STEPS` gezet (dat zou de tellers, de geldlijn en de opslagindex van missies verschuiven): de boog is een laag op de verhaalstand. Daardoor tellen de scènes niet mee in de voortgang en hebben ze geen checkpoint van het verhaal, alleen hun eigen merk.

## Wat er was

- Beschreven in de eerste versie van dit werk (nog geldig als stand van de kamer en de soep): het huis stond al op de kaart (kaartonthulling: `om:beppe` blijft altijd zichtbaar), maar **was een buitenplek**: een gesloten huis met tuin, geen deur en geen binnenkant. Er was niets te "unlocken", alleen niets te doen.
- De route erheen werd pas **na het verhaal** aangewezen (postgame: "Ik moet nog even langs mijn beppe").
- Het tuinbankje geeft bij elk bezoek volle gezondheid, gerepareerde voertuigen en alle wapens (bestaand, niet aangeraakt).
- **Beppe en Oma Trijntje zijn verschillende personages.** Beppe is Tammo's Friese oma (het eerbetoon, geen levend personage, geen stem). Oma Trijntje is de 92-jarige uit Stad, de tweede mentor (akte 2 en verder). Niets in dit werk verwart ze.

## Besluit: het huis opent na M01

Het huis is open zodra **M01** ("Nul krassen, vijftienhonderd punten", de eerste missie) klaar is, of een latere stap. Onderbouwing: de opening (M00) is alleen de verhuizing; M01 is de eerste keer dat je rijdt, dus vanaf dan is de westgrens bereikbaar en klopt Tammo's tekst. Eerder (na de opening) is er nog geen rit, later (na de eerste akte) is het niet "veel eerder". Op dat moment komt één telefoonbericht van Tammo (alleen tekst) en een kaart "Beppes huis staat open"; de Te-doen-kaart en de kaartmarker zeggen dat de deur openstaat.

**Afgeleid, nooit opgeslagen:** `visitUnlocked({ done, completed })` leest wat het spel al bijhoudt (verhaalstappen klaar of overgeslagen, en de gehaalde missies in de keten). Een bestaande save voorbij M01 heeft het huis dus meteen open bij het laden; er is geen migratie en geen nieuwe sleutel in `gde-save-v1`. De uitnodiging en de dagelijkse soep staan als lifetime-merken (`beppe_huis`, in het profiel van de speler: `gde-prestaties-v1`).

## Wat je er doet

Bij de voordeur (E: Naar binnen) loop je met een korte fade de kamer in; E bij de deur binnen brengt je terug op de veranda.

| Plek | Wat | Per bezoek |
| --- | --- | --- |
| Fornuis (soep) | Eén keer per speeldag en per speler: +30 gezondheid (niet boven het maximum); wie al fit is krijgt een koek met €10. Klein bedoeld. | Cooldown per speeldag (`soep:<dag>`) |
| Keukentafel (briefje) | Een nieuw briefje van Beppe, droog en warm | Afwisselend, nooit twee keer hetzelfde achter elkaar |
| Prikbord (tip) | Een tip of gerucht over de wereld: de dertig eierballen, een bankje met plaatje, het deurtje in de Martinitoren, de eendjesrace, de bieten bij Hoogkerk | Idem |

**Beppe heeft geen stem** (de afspraak van #832). Terwijl ze leeft staat ze zelf bij de keukentafel (E: Praten met Beppe: een kort gesprekje in het tekstpaneel, zie de verhaalboog hierboven); na haar overlijden is het briefje op tafel de plek waar "Wat Beppe zou zeggen" ligt. Alle nieuwe regels (briefjes, tips, gesprekken, het bericht, de kaarten) zijn **alleen tekst**: niets is ingesproken en er is geen TTS nodig. De bestaande opgenomen regels (`HOUSE_LINES`, fase 2 van de eigenaar) blijven staan en zijn niet aangeraakt.

## Variatie en spoilers

`pickNote` en `pickTip` kiezen deterministisch op speeldag en bezoek. Een briefje heeft een akte (`kop`, `romp`, `staart`, `zuid`, `ontzet`, `nazomer`) en mag alleen worden getoond als de speler **die akte bereikt heeft** (de verste stap die klaar is; `reachedAct`): nooit vooruit. Extra voorwaarden per briefje: wie speelt (`tammo` of `anita`, dat is Tessa), dagdeel (ochtend, middag, avond, nacht) en regen. Een briefje met een voorwaarde dat past gaat voor, maar elk derde bezoek is een gewoon briefje. Geen briefje bevat een spoiler van een latere akte; de test loopt alle combinaties van akte, speler, dagdeel en weer langs.

## Binnen: echt binnen

Hergebruikt het principe van [BINNENSETS-21-11.md](BINNENSETS-21-11.md) zonder missiestap: de kamer is het huis zelf (5,6 x 7 x 2,6 m) op de echte grond. De buitenmuren hebben al botsvlakken (`beppe_garden.js addColliders`), dus er is geen teleport naar een zak en er is geen grondhaak. Tijdens het bezoek is de buitenkant van het huis verborgen, heeft de kamer eigen gesloten wanden en een plafond (alleen van binnen te zien, met een lamp en een warm licht), staat er een **vaste kamercamera** binnen de wanden (0,45 m) en onder het plafond (0,3 m), een harde snee zonder pan, en worden de spelerbewegingen op de wanden en het meubilair gehouden (`keepInRoom`). De camera staat in de voorhoek en kijkt schuin over de kamer, zodat fornuis, tafel, prikbord en deur in beeld zijn; de besturing volgt die richting. De kamer is een gesloten schil op het erf van een huis (geen weg, geen fietsenstalling), dus er staan geen losse props van de wereld in.

Niet naar binnen: in een voertuig, tijdens een missie of activiteit, tijdens een filmpje of met de politie op je hielen. Een respawn, een voertuig of een filmpje zet je zonder fade weer buiten.

## Samen spelen

Het huis is van de wereld van wie het spel opende (iedereen bouwt het uit dezelfde weg- en grensgegevens). **Iedere speler loopt lokaal naar binnen:** de kamer, de camera, de soep en het briefje zijn van de speler zelf; de soep-cooldown en de uitnodiging staan in zijn eigen profiel (#429). Anderen zien alleen een figuur door de voordeur lopen. Er gaat niets over het netwerk. Een gast die later aansluit krijgt de kamer niet gedwongen; hij kiest zelf. Gelijkwaardig: niemand krijgt een recht bij. Zie [COOP-GAST.md](COOP-GAST.md).

## Wat niet is gedaan of niet in beeld bekeken

- **Niet in beeld gezien** (geen Electron, `game/world` ontbreekt in deze worktree): de kamer, het licht, de camerahoek en de plek van fornuis, tafel en prikbord in beeld; of de camera bij elke gamepad- of muisbesturing prettig voelt (mouse-look bij een vaste camera); de fade in en uit.
- De plaatsing van de plek (`beppe_site_test` slaat over zonder wereld) is dezelfde als voor #832.
- **Snelreizen** gebruikt de bestaande kaartactie (Reis erheen op elk icoon): de marker is een plekdoel (getest); of de taxi of trein een rit naar de westgrens aankan en waar je aankomt is niet in het spel geprobeerd.
- `binnenset_test` en andere tests die THREE laden draaien hier niet (de gestagede bibliotheek ontbreekt); voor `beppe_binnen.js` en `beppe_garden.js` is alleen `node --check` gedraaid.
- De soep komt één keer per kalenderdag (`calendarday.js`): bij een lange stap zonder dagwisseling is er dus langer geen soep; de briefjes blijven wel wisselen.
