# Beppes huis: vroeg open, een plek om langs te gaan (#1063, 21-11)

Wens van de eigenaar: "Ik wil beppe haar huis veel eerder laten unlocken, zodat je daar af en toe naartoe kunt gaan." Code: `game/js/beppe_visit_rules.js` (puur), `beppe_visit_texts.js` (alleen tekst), `beppe_binnen.js` (de kamer), haken in `beppe_garden.js` en `beppe_rules.js`. Test: `scripts/beppe_visit_test.mjs`. Het eerbetoon zelf (bankje, bordje, tuin, herinnering) staat in #832 en [personages.md](personages.md).

## Wat er was

- Het huis stond al op de kaart (kaartonthulling: `om:beppe` blijft altijd zichtbaar), maar **was een buitenplek**: een gesloten huis met tuin, geen deur en geen binnenkant. Er was niets te "unlocken", alleen niets te doen.
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

**Beppe is geen levend personage** (de afspraak van #832: geen stem). Wat zij "zegt" komt dus als briefje op de tafel en het prikbord, niet als gesproken regel. Alle nieuwe regels (25 briefjes, 7 tips, het bericht, de kaarten) zijn **alleen tekst**: niets is ingesproken en er is geen TTS nodig. De bestaande opgenomen regels (`HOUSE_LINES`, fase 2 van de eigenaar) blijven staan en zijn niet aangeraakt.

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
