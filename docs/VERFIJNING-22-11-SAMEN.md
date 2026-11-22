# Verfijnronde Samen spelen (22-11)

Naslag. Een verfijnronde op de epic Samen spelen: geen nieuwe features, wel wrijving weghalen in wat er al is. Gedaan met code, data, tests en simulaties in Node; er is geen Electron, geen build en geen echte speelronde bij gebruikt. Wat niet in beeld of met een echte tweede speler bekeken is, staat onderaan. Tests: `scripts/verfijn_samen_22_11_test.mjs`, `verfijn_samen_22_11_sim_test.mjs` en `verfijn_samen_22_11_wegvallen_test.mjs`.

## Wrijving, oplossing, bewijs

| # | Wrijving (wat een speler merkte of kon merken) | Oplossing | Bewijs |
|---|---|---|---|
| 1 | De wachtkamer zei altijd "Anderen zien je als je figuur", ook als je een eigen naam en kleur koos (typfout `s.profil` in `lobby.js`) | De regel leest het echte profiel | `verfijn_samen_22_11_test` 1 |
| 2 | Een gast die een kamercode uit WhatsApp of Discord plakte ("Kamercode: K3J9D-8F2MN." of met een lang streepje of aanhalingstekens) kreeg "geen kamercode" | `kamercodeUitTekst` zoekt de code in de geplakte regel; het invoerveld heeft ruimte voor zo'n regel (`INVOER_MAX` 200 in plaats van 64) | test 4; `lobby_test` aangepast aan de nieuwe grens |
| 3 | Na een mislukte poging stond bij de volgende poging meteen "geen antwoord, klopt de code?" (de teller van de vorige poging bleef staan) | Een nieuwe poging (`verbinden`, `bron-hervat`) telt weer vanaf nul | test 2 |
| 4 | Na Annuleren kon een late melding een spookscherm maken: "Verbonden" of "Verbinding weg" zonder verbinding, een wachtkamer met een kamercode zonder gastheer, of "Verbinden…" zonder rol | `status`, `code` en `verbinden` doen niets zonder rol; `invoer` en `route` zetten de rol (een gast die via de lijst een code typt had er geen en zou daardoor zijn "verbonden" missen) | test 3, sim_test (lijstgast, 1200 reeksen) |
| 5 | Een nieuwe kamercode (na eruit zetten of weer privé maken) zette een gastheer met gasten terug naar "wacht op een medespeler" | Het scherm blijft de wachtkamer met gasten tot de lijst iets anders zegt | sim_test (code met gasten) |
| 6 | Twee spelers met dezelfde naam in de lijst: een gast zonder eigen naam kreeg de naam van zijn figuur ("Sanne") terwijl een ander die naam al als eigen naam had | `wijsPlekToe` maakt de naam ook uniek ("Sanne 2") | sim_test (20.000 acties) |
| 7 | Twee spelers met dezelfde figuur: een figuur die een ander via zijn online-avatar koos was nog "vrij" voor de volgende gast, en twee avatars konden dezelfde figuur kiezen | Een figuur telt als bezet zodra een speler hem echt heeft; een gekozen figuur van een ander wordt genegeerd | sim_test (20.000 acties, dubbele figuur) |
| 8 | Een nieuwe gast op een plek die net vrij kwam, erfde het "Meedoen?"-antwoord van zijn voorganger: hij kreeg geen uitnodiging, telde als meespeler of als toeschouwer zonder iets te zeggen | `vergeetSlot` bij echt weggaan (niet bij tijdelijk wegvallen: wie terugkomt houdt zijn antwoord) | `wegvallen_test` 1, 2 en 6 |
| 9 | Het ping-wachttijdje en het zinnenritme van een vertrokken speler bleven op zijn plek staan; zijn pings bleven nog even in beeld | `vergeetPings` en `forgetSender` bij weggaan | `wegvallen_test` 4 en 5 |
| 10 | De bewaarde Meedoen-standen groeiden mee met elke opdracht in een lange sessie | Hoogstens 24 bewaarde groepen (`MAX_STANDEN`), de oudste vervalt | `wegvallen_test` 3 (500 opdrachten) |
| 11 | "Opnieuw proberen" stond er alleen bij een wachtwoord; na "De ander antwoordt niet" of "gesloten" moest je de code opnieuw intypen | Bij die twee redenen staat Opnieuw proberen klaar met de code nog in het veld; bij een andere versie of een volle sessie niet (daar helpt een tweede poging niet) | test 10 |
| 12 | Het foutrapport zei "Het rapport is gekopieerd" ook als het klembord niet werkte | Eerlijk bericht voor gelukt en mislukt (met een schermafbeelding als weg uit de brand) | test 6 |
| 13 | Kreeg het starten een fout, dan bleef "Spel starten" voorgoed grijs op "wordt gestart" | Nieuwe gebeurtenis `start-mislukt` geeft de knop terug en zegt wat er is | test 11 |
| 14 | "Start gevraagd" bleef staan als er daarna iemand kwam of ging | Verandert het aantal spelers, dan mag de gast opnieuw vragen | test 7 |
| 15 | Een vreemde reden van het net (bijvoorbeeld `constructor`) gaf een foutscherm zonder titel en tekst | `foutUitleg` kent alleen eigen sleutels en valt terug op de algemene tekst | test 5 |
| 16 | Een uitnodiging met een leeg label gaf "Meedoen met ?" | Terugval op "de opdracht" | test 8 |
| 17 | `begin` zonder sleutel zette een opdracht "undefined" in de stand | Zonder sleutel gebeurt er niets | test 8 |
| 18 | In de spelerslijst werd 996 m "1000 m" terwijl 1004 m "1,0 km" werd | Eerst afronden, dan kiezen | test 12 |
| 19 | QA: er was geen simulatie over lange speelduur van de spelerslijst en geen fuzz van het uitnodigscherm | 20.000 willekeurige aansluitingen, verlaten, avatars en maxima (plekken, namen, kleuren en figuren uniek, bericht binnen het budget); 1200 reeksen van 40 gebeurtenissen op het scherm (altijd een knop, een scherm met verbinding heeft een rol) | `sim_test` |
| 20 | Het register van wat samen werkt had een dubbele sleutel (convoy stond twee keer in de stappen) en een commentaarregel met losse tekens | Opgeruimd, geen gedrag veranderd | test 13 |

De Samen-regel per wijziging: alles hierboven gaat over wat wie het spel opende en wat elke gast ziet of krijgt. Nr. 8 tot en met 10 hoort bij "wat gebeurt er als iemand wegvalt of later aansluit" (voortgang per speler, #429): de host bewaart per plek het antwoord, en dat hoort bij de speler, niet bij de plek. Nr. 6 en 7 gaan over wat een gast van de anderen ziet (de lijst); nr. 1 tot en met 5 en 11 tot en met 14 over het uitnodigen en aansluiten zelf. Er is geen nieuw netwerkbericht en geen protocolwijziging.

## Bewust niet (te groot of een nieuwe feature)

- **Lijst met recente codes of sessies** (snel opnieuw verbinden): nu staat alleen de laatste code klaar en zijn er sterren in de openbare lijst. Een echte lijst is een feature met opslag.
- **Vrienden:** ook een feature (identiteit zonder account, privacy volgens constitutie 4 en 10).
- **Nee veranderen in ja bij "Meedoen?"** na een misklik: raakt de beloningsregels (#429, #452) en de late-instapregels per opdracht; eerst een besluit.
- **Meer zinnen en emotes** (Ja, Nee, Let op): het wiel is vol (acht plekken per pagina); een derde pagina is een nieuwe feature.
- **Twee spelers met dezelfde naam bij dempen:** dempen gaat op naam (zodat het een hostwissel overleeft); met unieke namen (nr. 6) is het risico klein, maar niet weg.

## Alleen in beeld of met een echte speler te bekijken (nog niet bekeken)

- De nieuwe knop "Opnieuw proberen" na een time-out en de melding bij een mislukt rapport: DOM en stijl (alleen via de gedeelde knoppen van `lobbyui.js`; niet getekend bekeken).
- Plakken van een echte chatregel in het invoerveld op Windows, macOS en Android (klembord, lange regels, automatisch aanvullen).
- Echt wegvallen en terugkomen met twee tot vier instanties: de Meedoen-uitnodiging voor een nieuwe gast op een vrijgekomen plek, de pings en zinnen. De logica is in Node getest, het netwerkpad (onLeave) is alleen als broncontrole gedekt, niet door een lopende sessie.
- De wachtkamer met je eigen naam en kleur (nr. 1), zoals ze er in beeld uitziet.
- Gedrag bij 16 spelers op een trage verbinding (geheugen en bandbreedte): alleen de berichtgrootte is gesimuleerd, geen echte doorvoer.
