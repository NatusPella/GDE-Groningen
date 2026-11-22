# Verfijnronde 22-11: onboarding, moeilijkheid en progressie

Epic: de eerste 20 minuten, de moeilijkheidskeuze, het voortgangsgevoel, wat-nu-hulp, eerste-keer-uitleg, snelreizen en de standaarden voor nieuwe spelers. Geen nieuwe functies: wat er al is scherper gemaakt. Branch `verfijn-onboarding-22-11`. Alles hieronder is in node getoetst (pure logica, bronchecks en een speelsimulatie); er is niets in beeld of in Electron bekeken.

Toets: `node scripts/verfijn_onboarding_test.mjs` (166 controles, onder meer een fuzz van 4000 voortgangsstanden en een speelsimulatie van drie uur voor de voertuig- en minigamekaarten).

## Wat er is verbeterd

| # | Wrijving | Oplossing | Bewijs |
| --- | --- | --- | --- |
| 1 | "100% klaar" terwijl er nog iets ontbrak: 399 van 400 rondde af naar 100% (HUD, Overzicht, savegame-overzicht, hervatten) | 100% alleen als alles klaar is, anders hooguit 99% (`honestPercentage`) | `verfijn_onboarding_test`, `progress_test` |
| 2 | "0% klaar" terwijl je al bezig bent (1 van 400) | Minstens 1% zodra er iets gedaan is | idem, plus fuzz |
| 3 | Het savegame-overzicht gebruikte zijn eigen afronding | Dezelfde regel als de rest (`saveProgress`) | bronchecks in de test |
| 4 | De hulp zei dat het doel onderin staat; het hangt bovenin in het midden (zone B), en de uitlegkaart zei al bovenin | Beide hulpregels (Waar moet ik heen, Je eerste dag) zeggen bovenin; een verouderde testregel is mee gecorrigeerd | `onboarding_help_test`, `verfijn_onboarding_test` |
| 5 | De vliegtuigkaart noemde "Kleppen (K)" als kale letter, die een herbonden toets niet volgde | `{K}`-toetsfiche; test op alle kaarten dat er geen kale toets in staat | `verfijn_onboarding_test` |
| 6 | Trekker- en vliegtuigkaart waren 217 en 202 tekens: een tekstmuur voor een kaart | Korter (onder 200), alle inhoud blijft; test op de lengte van elke kaart | idem, `hintkit_test`, `besturing_zoek_test` |
| 7 | Fatbike en vrachtwagen hadden alleen een tekstkaart | Uitleg met iconen (icoon eerst, tekst als "Meer uitleg") | idem, `uitleg_test` |
| 8 | Discgolf, Pitch & putt en de kartbaan hadden alleen een tekstkaart | Uitleg met iconen | idem |
| 9 | "Alles gezien" telde vreemde ids in de opslag mee (`seen.size`): de laatste kaart kon wegblijven | Controle op de echte kaarten (`lessonsAllSeen`) | idem |
| 10 | Wie een bestaand spel laadt kreeg "Zelf kiezen" nooit: die hing aan een eerste-klus-kaart die voor hem niet bestaat | Hangt aan `goalHandled` (kaart gezien of al een missie gehaald) | idem |
| 11 | "Kies er een op de kaart (M)": vaste letter, ook na herbinden of met een controller | Toetsfiche `{M}` die de eigen toets of knop toont | idem |
| 12 | Brandmelding, Zitmoi-melding, trein kapen en waakzaamheid noemden kale toetsen (E, G, K) | Toetsfiches | idem |
| 13 | Kaartradiaal "Kies eerst een doel op de kaart (M)" | Toetsfiche | idem |
| 14 | Reiskeuze: een kapotte of negatieve lengte kon "NaN min" of een negatieve beloning geven | Veilige tijd en beloning (nooit onder 0) | idem, `reiskeuze_test` |
| 15 | Reispaneel: met het toetsenbord alleen 1, 2, 3 of Enter op de standaard; een controller kon wel door de lijst lopen | Pijl omhoog en omlaag (en W en S) verplaatsen de keuze, zoals de D-pad (`pickDirFromKey`) | idem, `reisview_test` |
| 16 | Terugblikkaart "Waar waren we?" knipte bij een lange tekst midden in een afkorting ("Dr.", "St.", een voorletter) | De eerste zin eindigt niet meer na een afkorting of voorletter | idem, `recapcard_test` |
| 17 | De moeilijkheidskaart zei niet waar je later de toegankelijkheid vindt (late tab) | Eén regel: Instellingen, Moeilijkheid, Toegankelijkheid (binnen 60 tekens) | idem, `tekstdieet_test`, `difficultycard_test` |
| 18 | "Uitleg opnieuw tonen" beloofde kaarten die niet komen als "Uitleg voor nieuwe spelers" uit staat | De melding zegt dan dat je die schakelaar aan moet zetten (`explanationResetMessage`) | idem |
| 19 | De kaarten van de uitleg hadden geen test op lengte, taal en toetsfiches | Test op alle zes: hooguit 22 woorden, Nederlands, alleen toetsfiches | idem |
| 20 | De lijst van de kaart-ids stond maar op één plek | `onboardinglogic.js` met een test dat hij gelijk blijft aan `onboarding.js` | idem |
| 21 | Voertuig- en minigamekaarten zonder lange-duurtest | Simulatie van drie uur wisselend rijden en spelen: nooit dubbel, nooit met politie of dood, altijd met tussenruimte, ook na opslaan en laden | idem |
| 22 | Rommel in de opslag van gezien-kaarten | Test op kapotte JSON en vreemde ids | idem |

Samen spelen: wie het spel opende en een gast zien dezelfde meldingen; de voortgang, de uitleg en de reiskeuze blijven lokaal per speler (voortgang per speler, #429). Niets gaat over het net, geen opslagsleutel is gewijzigd, geen save breekt.

## Bewust niet (te groot of een nieuwe functie)

- Honderden plekken in de tekst noemen nog een vaste "druk E" (bordjes, startregels, activiteitenlijst, heistrollen); `E` is de standaardtoets en de regels staan in veel tests. Een tekenvervanging over de hele code is een eigen ronde. Alleen de meldingen op het scherm die niet in een test vastliggen zijn omgezet. (De golvenmelding "Druk op E" ligt in `golven_test` vast.)
- Uitleg met iconen voor de laatste minigames (zwembad, vliegschool, waterski, carbid, wandeling): vraagt eigen iconen en lussen.
- Een eigen onboarding voor een gast (de gast draait de kaarten niet): vraagt een tweespelersrun, zie [EERSTE-30-MINUTEN-20-11.md](EERSTE-30-MINUTEN-20-11.md) punt 3.
- Een kaart voor een bestaand spel dat later pas "Te doen" of Samen spelen mag horen: de kaarten hangen aan een missie in deze sessie; een andere timing is een ontwerpkeuze.
- De moeilijkheid per save wijzigen vanuit de eerste kaart: de kaart blijft kort, de opties staan onder Aanpassen.

## Alleen in beeld of met een echte speler te bekijken

- De iconenuitleg van de nieuwe voertuigen en minigames (lus, volgorde, leesbaarheid).
- De moeilijkheidskaart met de nieuwe regel (past hij op een smal scherm en met grote tekst?).
- Het reispaneel met de pijltoetsen en de focus op een controller en op aanraking.
- De melding met `{M}` op de HUD in de kleine, de grote en de extra grote tekst.
- Een echte eerste 20 minuten met de nieuwe kaartvolgorde voor iemand met een bestaand spel.
