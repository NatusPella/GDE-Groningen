# Controller-review 22-11: besturing in het spel

Eigenaarsvraag: is alles logisch te bereiken met een controller? Dit deel gaat over het spelen zelf: te voet, in elk voertuigtype, boot, vliegtuig, heli, duif, trein, trekker, de minigames, de camera, de kaart en de telefoon. De schermen van het menu en de Samen-spelen-flow hebben hun eigen review. Niets hiervan is met een echte controller of in beeld bekeken; zie "Nog te controleren" onderaan.

Gereedschap: `node scripts/controller_ingame_audit.mjs` (rapport), `node scripts/controller_ingame_test.mjs` (permanente test), `node scripts/controller_ingame_doc.mjs --schrijf` (tabellen en cheatsheet). De volledige indeling: [CONTROLLER-INDELING-22-11.md](CONTROLLER-INDELING-22-11.md); printbaar: [CONTROLLER-CHEATSHEET-22-11.html](CONTROLLER-CHEATSHEET-22-11.html).

## Wat de audit doet

De inventaris telt 69 acties in 11 situaties (581 combinaties, met en zonder Samen spelen), elk met de toets die het spel kent en de bron in de code. Per combinatie zegt de audit waar de actie op het pad zit: een knop, de stick of een trigger, of het nieuwe acties-wiel. Verder zoekt ze botsende toetsen (dezelfde toets met twee betekenissen in een situatie), wat Samen spelen afpakt (`PAD_COOP`), dubbele knoppen, vrije knoppen, toetsen in de speltekst (`{E}`, `{6}`) zonder padplek, en of elke actie in elke situatie een glyph krijgt op toetsenbord, Xbox, PlayStation en Steam Deck (Switch gebruikt de Xbox-set met omgewisselde letters). De stand van voor het wiel is te herhalen met `--zonder-wiel`.

## Uitkomst voor en na

| Meting | Voor | Na |
| --- | --- | --- |
| Acties zonder plek op het pad | 20 acties in 177 combinaties | 0 (twee bewuste uitzonderingen met reden, plus achterom kijken in een sessie) |
| Botsende toetsen | 2 (T: de hef en door de trein lopen tegen het zinnenwiel van Samen spelen) | 0 |
| Door Samen spelen afgepakt en niet terug | 3 knoppen plus de radio, het kusje, overslaan en lak te voet | 3 (R3 achterom kijken in een auto, bewust) |
| Toetsen in de speltekst zonder padplek | B en U | B en U (B noemt de D-pad zelf in de zin, U staat in Instellingen) |
| Glyph-problemen per apparaat | n.v.t. | 0 |
| Dubbele knoppen | 12, zonder vastgelegde reden | 12, elk met reden (bewuste aliassen) |

De 20 acties die geen plek hadden: andere kleren (toets 6), het waypoint naar je eigen doel (5), de filmcamera (V), eerste persoon (C), de cabinecamera in de trein, de radio en de volgende zender (Shift + N) in elk voertuig (sinds #495 weg uit de auto), de busdienst overnemen (G, de bus had geen G), de alarmlichten bij handmatig schakelen en in een sessie, verhaalstap overslaan en het lakmenu in veel situaties, de directe wapenkeuze (1 tot 4; wisselen met LB en RB kon al), en de roepjes (7, 8, 9) en het zinnenwiel van Samen spelen buiten de voetindeling (in een voertuig, aan de waterkant, als duif, in de trein).

## Wat er is gedaan

1. **Het acties-wiel** (`actionradial.js`, `actionradialui.js`, data in `controls.js`). Houd Overzicht (View) 0,4 seconde: een wiel met alles wat in die situatie geen eigen knop heeft. Linkerstick of D-pad kiest, A bevestigt, B, Menu of Overzicht sluit, LB en RB bladeren naar de volgende groep (Spelen, Wapens, Samen spelen). Het wiel stuurt dezelfde toetsen als het toetsenbord, dus herbinden, de Nintendo-wissel en opslag veranderen niet; oude herbindingen werken door. Een actie die in een situatie al een eigen knop heeft, staat daar niet ook in het wiel (de test bewaakt dat). Een korte tik op Overzicht blijft de kaart; die gaat nu bij het loslaten open in plaats van bij het indrukken. In de menus, minigames en activiteiten is Overzicht ongewijzigd.
2. **Tik in plaats van houden.** Met de instelling tikStand (rennen, richten of beide) opent een tik het wiel, met de kaart als eerste onderdeel. Het wiel blijft open na loslaten: om te kiezen hoeft niets vastgehouden te worden.
3. **Hints.** Een toets die alleen in het wiel zit, krijgt in de speltekst de glyph van Overzicht met het woord "houd" erachter (`glyphs.js`, `padWheelFor`, `.is-wiel` in `ds-keycap.css`). Zonder dit verdween de hint op het pad.
4. **Samen spelen aan de waterkant.** De voetindeling kreeg in een sessie de roepjes en "bij de groep" op de D-pad, de hengelsituatie niet: daar waren ze weg. `PAD_COOP.hengelen` geeft ze terug; X blijft hengelen.
5. **T botst niet meer.** Het zinnenwiel van Samen spelen opende op T ook in de trein (door de trein lopen) en op de trekker (de hef). `canOpen` in `multiplayerphrasesradial.js` laat het daar achterwege. Op de trekker bestaat het wiel dus niet meer in een sessie; de hef wint nu altijd.
6. **Busdienst.** G (de dienst overnemen) had geen knop in de bus; het staat nu in het wiel van de bus.
7. **Beschrijvingen in Besturing.** De teksten bij X ("trekker: aftakas") en Z ("trekker: ploeg aankoppelen") in de herbindlijst klopten niet met de code (G is de aftakas, X ontkoppelt, Z is alleen het zeil van de boot). Gerepareerd in `KEY_ACTIONS`.
8. **Documentatie.** De indeling als tabellen per situatie en per actie, en de cheatsheet, worden uit de bron gemaakt en door de test op drift bewaakt.

## Bekende uitzonderingen en open punten

- **Toeteren te voet** heeft bewust geen knop (eigenaarsbesluit, `pad_input_audit`). **Geluid aan of uit** (U) staat in Instellingen.
- **Achterom kijken in een sessie**: R3 opent dan de spelerslijst (#636). Achterom kijken is vasthouden en past niet in een wiel. Op het toetsenbord blijft Q.
- **G in de browser**: in de webversie is G de verplaatste eerste-persoonstoets (`BROWSER_KEYS`). De canonieke G (aftakas, busdienst, trein starten) is op het toetsenbord in de browser dan niet te bereiken. De controller en de desktop-app hebben dit niet. Een keuze voor de eigenaar: een andere browsertoets voor eerste persoon. Niet aangeraakt.
- **O in de bus**: deuren en verhaalstap overslaan delen een toets; de bus consumeert O voor de deuren. Bewust (in de bus rijdt de speler).
- **Aanraakbediening** leest `PAD_MAPS` en kent het wiel dus niet: de acties die alleen in het wiel zitten (kleren, filmcamera, waypoint, radio in een voertuig) hebben op aanraking nog geen knop achter Meer. Open punt; een volgende stap is `wheelItemsFor` in `touchMore` op te nemen.
- **Hints in een sessie**: `padSlotFor` kent `PAD_COOP` niet, dus een hint voor 7, 8, 9 of B krijgt te voet in een sessie geen D-pad-glyph; de teksten noemen de D-pad zelf. Open punt.
- **Vrije knoppen** (boot, heli, vliegtuig, duif en trein hebben er een of meer) zijn bewust niet opgevuld: de bestaande indelingen blijven staan en het wiel geeft de rest.

## Nog te controleren (Electron-ronde, met een echte controller)

- Het wiel in beeld: de plek (onderin, boven de HUD), de leesbaarheid op 1280x720 en ui-schaal 1,5, de DS3-focusring op het gekozen onderdeel, de "houd"-aanduiding naast de Overzicht-glyph in een hint.
- Voelt 0,4 seconde goed voor de lange druk? De kaart op de tik gaat nu op loslaten open: voelt dat vertraagd?
- De stick-hoek bij 9 onderdelen (Samen spelen te voet) en bij 5: pakt hij de bedoelde richting?
- Shift + N in het wiel: schakelt de radio echt naar de volgende zender (de toetsen worden 90 ms vastgehouden)?
- Het wiel sluit bij instappen, uitstappen en het openen van het pauzemenu; geen vastgehouden toets blijft hangen.
- Samen spelen: de zinnenwiel-knop (LB) in een auto en het ontbreken ervan op de trekker en in de trein; de roepjes aan de waterkant.
- De cheatsheet printen (A4 liggend) en met het oog lezen.
- De Nintendo-indeling (A en B omgewisseld) en PlayStation: staan de woorden in de cheatsheet en de hints goed?
