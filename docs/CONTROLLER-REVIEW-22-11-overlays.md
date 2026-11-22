# Controllerreview 22-11: kaarten, popups en korte overlays

Scope: alle kaarten, popups en korte overlays (#1011 spelersmenu/Samen-flow, #495 controllerknoppen). De pauzemenu-tabbladen, de instellingen en het voertuig staan in de zusterreviews.
Methode: `node scripts/controller_audit_overlays.mjs` bouwt de schermen in een eigen nep-DOM (`scripts/qa/overlay_minidom.mjs`), draait de echte `open...()`-functies, stuurt de toetsen die `gamepad.js` bij een controller verstuurt (met de echte `spatialNext` en de terugval van `menuFallback`) en leest de bronnen van de rest. De permanente test is `node scripts/controller_overlays_test.mjs` (nul bevindingen buiten de uitzonderingenlijst). Geen Electron, geen netwerk; Samen-regel: invoer is lokaal, de wijzigingen raken geen netwerkberichten.

Gemeten criteria per scherm: bereikbaarheid met D-pad/stick (geen onbereikbare knop), beginfocus, focus blijft in de kaart, B/Esc-uitweg, toetsplaatje IN de knop, geen dubbele sneltoets, rolkenmerken (`role="dialog"` + `aria-modal`, zodat de D-pad niet in het menu eronder zoekt), klikbare niet-knoppen, focus terug naar de opener, LB/RB naar tabbladen, hold zonder tik-alternatief, minigametoetsen die de controller niet heeft.

## Uitkomst: 47 schermen, 10 bevindingen voor, 0 na (1 onderbouwde uitzondering)

| Scherm | Voor | Na |
|---|---|---|
| Startkeuze Alleen/Samen (`launchchoiceui.js`) | goed: focus op Alleen, pijlen, A, B kiest Alleen, Tab-val | idem |
| Toestemmingskaart Samen spelen | uitleg-uitklapper (`summary`) niet met de D-pad te bereiken; focus ging na sluiten verloren | `summary` en `textarea` in de focuslijst van `gamepad.js`; focus gaat terug naar de knop die de kaart opende |
| Naam- en akkoordkaart (met en zonder Terug) | zelfde twee punten | zelfde twee reparaties |
| Moeilijkheidskaart (niveau en aanpassen) | goed: B in Aanpassen gaat een niveau terug, B in de niveaukeuze kiest Standaard | idem |
| Oude-saves-kaart | goed; B doet bewust niets (kiezen is verplicht, beide keuzes zijn veilig) | idem |
| Afsluit-bevestiging | goed: focus op Annuleren, B annuleert, focus terug naar het menu | idem |
| Laadscherm, naamkaart (trailerstijl), QTE, eindkaart, aftiteling, meldingen, foutmelding, busmelding, tv-laag van het voetbal | passief: geen focus nodig, geen knoppen | idem |
| Keuzepaneel (bijbanen, scenes) | cijfers 1 tot 4 via de D-pad, B is Backspace (minigame-indeling); toetsplaatjes wisselen mee | idem |
| Winkelmenu (kopen/verkopen), pashokje, kappersstoel, balie | LB en RB deden niets (er kwam geen toets aan: het pad zendt ze alleen in het pauzemenu); afdeling alleen met links/rechts of LT/RT | LB en RB wisselen de afdeling (`menuKey`, `body.shop-open`); ook in de tuningwerkplaats |
| Samen-overlay (wachten, wegvallen, spel overnemen) | knoppen "Ja (J)" en "Nee (N)": toets als platte tekst, geen glyph, op de controller bleef het "(J)" staan | `toets` in de knop (glyph met `data-gk`, `aria-keyshortcuts`); A is J, B is N (coopvraag-indeling) |
| Kaart: plekkaart, reiskeuze (OV-planner), uitleg | goed (DS3: toets in de knop, Esc/B sluit) | idem |
| Vertrekbord, radio-melding, zenderkeuze | goed; zenderkeuze is een lijst met knoppen in Instellingen | idem |
| Samen-wiel, gedeeld doel-voorstel, Meedoen?-kaart | A is J, B is N (coopvraag-indeling); het wiel heeft in de bron een Esc/Backspace-uitweg (de D-pad-bediening zelf: Electron-ronde) | idem |
| Telefoon met parodie-apps | B is Backspace in de telefoon | idem |
| Kart, padel, discgolf, penalty's | toetsen in de hints bestaan allemaal op het pad | idem |
| Klimtoren | A en D samen ingedrukt houden (twee vingers; geen tik-alternatief) | instelling Tikken in plaats van ingedrukt houden: een tik klikt die hand vast of los (standaard uit: niets verandert) |
| Trainingsminigames | goed | idem |
| Voetbalwedstrijd: keuzescherm | opties 5 tot 8 (stijl, duur, kaarten en blessures, camera, derby) alleen met het toetsenbord: de D-pad heeft vier cijfers | tweede pagina met E (Y): daar zijn 1 tot 4 de opties 5 tot 8 |
| Voetbalwedstrijd: tv-UI, pauze- en rustscherm | passief (`pointer-events: none`); de toetsen lopen via `voetbal.js` | idem |

## Uitzondering in de test

- Recapkaart, controle `klikdiv`: het element is de achtergrond van de kaart (een klik ernaast sluit). De focusbare uitweg is de knop Verder (met de focus) en Esc/B sluit ook. Geen onbereikbare knop.

## Bewuste keuzes

- Oude-saves-kaart en de naamkaart zonder Terug: B doet niets, want de speler moet kiezen of een naam geven. De naamkaart wordt in het spel alleen met Terug geopend (`ensureSamenProfile`, `main.js`).
- Moeilijkheidskaart: B in de niveaukeuze kiest Standaard (het gewone spel), omdat een speler zonder keuze toch moet kunnen starten.
- Shopmenu: Q (toetsenbord) sluit nog steeds de winkel; LB (controller) wisselt de afdeling. Het pad stuurt LB/RB als `[` en `]`, niet als Q/E.

## Alleen met een echt scherm of een echte controller te controleren (lijst voor de Electron-ronde)

De opmaak in de audit is een model (containers onder elkaar, behalve de rijen `os-knoppen`, `sk-knoppen`, `dk-knoppen`). Daarom nog te zien:

1. Focusring in DS3-stijl zichtbaar op 1280x720 en bij ui-schaal 1,5, op elke kaart hierboven (vooral het vinkje, de uitklapper en de Samen-overlayknoppen).
2. De echte focusvolgorde van de Moeilijkheid-opties (zes groepen) en de winkel-lijst met D-pad en stick, en dat de lijst meescrollt (menuFallback roept `scrollIntoView` aan; `focus()` van de kaarten scrollt zelf).
3. Het schermtoetsenbord (A op het naamveld) op de naamkaart en het wachtwoordveld in de wachtkamer: opent, typt, B sluit, en de focus keert terug naar het veld.
4. Het toetsplaatje in de Samen-overlayknoppen (J en N) wisselt van het toetsenbord naar A en B op de controller (coopvraag-indeling).
5. LB/RB in de winkel en de tuningwerkplaats met een echte controller (Xbox, PlayStation, Steam Deck): afdeling wisselt, geen tweede actie.
6. Voetbal-keuzescherm: E/Y wisselt de pagina en de hint toont de glyphs; de eerste halve seconde na het openen telt E niet mee.
7. Klimtoren met tikstand aan: een tik op A of D klikt de hand vast of los, na een val staan beide handen weer los.
8. Focus terug naar de knop na de Samen-toestemmingskaart en de naamkaart, vanuit het hoofdmenu en vanuit het pauzemenu.
9. Ui-schaal 1,5 en 1280x720: geen knop buiten beeld op de Moeilijkheid-opties en de winkel.

## Open punten

- De pauzemenu-tabbladen, de instellingen, de voertuigindelingen en het toestel-wisselen van de hints staan in de zusterreviews (`controller-menus`, `controller-ingame`).
- Een rij sneltoetsen op de kaarten is nog steeds per scherm eigen code (`toetsActie` in `launchchoice.js`, `levelKeyAction` in `difficultycard.js`); er is geen gedeelde kaartbesturing. Nu niet nodig: de audit houdt ze gelijk.
