# Opening: filmscript (C00, 21-11, ronde 2)

Filmscript van de openingscutscene van een nieuw spel, voor iemand met NUL context. Machinevorm en reeks: [game/js/openingfilm.js](../../game/js/openingfilm.js) (`SEQUENCE`, `LINES`, cues, validators); de staging: `buildShots(w, film)` in [game/js/intromontage.js](../../game/js/intromontage.js) achter de vlag `?openingfilm`; de test: `scripts/openingfilm_test.mjs`. Scène-id's: **C00.1** koude opening, **C00.2** de keuken, **C00.3** verhuisdag (gelijk aan [09-script-akte1.md](nieuw/09-script-akte1.md) van de verhaal-lead). Regie: [../CUTSCENE-REGIE-21-11.md](../CUTSCENE-REGIE-21-11.md) (R-01 tot en met R-30). Canon: [../VERHAALCANON-21-11.md](../VERHAALCANON-21-11.md).

**Lengte.** Eigenaar-besluit 21-11: "langer mag", tot ca. 4 minuten; de grens in de tests is 240 s (was 180 s). Deze film is geschat op 170,8 s (het echte getal hangt van de stemlengtes en de beat af; de coördinator meet het in de sweep).

> **Formaat.** Een scène begint met een slugline (`INT.`/`EXT.`, plaats, dagdeel). Dan actieregels, `PERSONAGEKAART` bij een eerste verschijning, dialoog `SPREKER: tekst [BEHOUDEN|NIEUW]` (`[BEHOUDEN]` = er is een opname; `[NIEUW]` = alleen tekst tot de TTS-ronde), regie als `(regie: ...)`, `MUZIEK:` en `SFX:`. Geen toneelaanwijzing in een uiting. Geen echte merken of personen.

## Samenvoeging met de verhaal-lead (epic-verhaal-21-11)

De lead heeft de opening herschikt (openingstempo 170,8 s, testmarges 175 en 115 s) en de slogan doorgevoerd. Besluit: **dit filmscript is leidend voor volgorde, camera, naamkaarten en de koude opening; de dialoog van C00.2 en C00.3 is die van de lead**, zodat de opening blijft aansluiten op M01 (de wedstrijd, de standplaats, honderdvijftig euro, de lekke band, het bakkie). Concreet:

| Onderdeel | Besluit |
|---|---|
| Scène-id's | gelijk: C00.1, C00.2, C00.3; binnen een scène zijn de film-shots `c1-…`, `c2-…`, `c3-…` (zie de tabel in `openingfilm.js`). De lead hoeft zijn id's niet te wijzigen. |
| C00.1 | de lead heeft drie radioregels over de trailerparodie; deze film opent met Rikus' bestaande regel "Augustus. In Grunn heet dat zomer." (opname uit de trailer), "Er gaat niets boven Grunn. Behalve de Martinitoren." [BEHOUDEN] en "Vandaag in Grunn: weinig nieuws. Dat komt nog." [NIEUW]. Zijn eerste regel ("Tweehonderdduizend mensen…") vervalt; de parodie (fietsers, meeuw) blijft, de werkboot en de naamkaarten uit de oude trailer vervallen ten gunste van Tammo's duiven. |
| C00.2 | alle regels van de lead blijven, in dezelfde volgorde, behalve Rikus' openingsregel "Moi, Nachtstreek…" (de film opent al met zijn stem in C00.1). De Jelle-hint van Rikus ("Een luisteraar meldt een Fries in een blauw colbert…") komt na het huurcontract, met beeld erbij, in plaats van aan het begin. "Kom. Werk." sluit de keuken af. |
| C00.3 | alle regels van de lead blijven. De titelkaart staat sinds 28-11 vooraan (hieronder en in `openingfilm.js` als `c1-titel`), niet meer vóór de landing. |
| Regieronde 28-11 | C00.1 is verbreed met establishing shots: `c1-markt` (kraan van 85 m, de hele toren in beeld), `c1-daken` (zweefvlucht over de daken, de toren op het rechterderde) en `c1-plein` (lage dolly over de Grote Markt); daarna fietsen en meeuw, dan de titelkaart `c1-titel` (zwart, logo, slogan) en pas dan Tammo en Tessa. De film is de standaardopening; `?oudeopening` speelt de oude. Een geplande Noorderplantsoen-dolly is vervallen: vijver en bomen van het park kwamen in de gecontroleerde build niet in beeld. |
| Titelkaart | uit `TITLE` (slogan "Een zomer in Grunn. Kon minder.", sinds 23-11), in beide bronnen gelijk. In het merge-conflict op `intromontage.js` (de lead veranderde één regel met de kicker) wint `TITLE`. |
| Opnames en nieuwe regels | geen regel is gewijzigd: elke tekst staat letterlijk in `09-script-akte1.md` of is de Rikus-regel uit de trailer, dus er komen geen nieuwe opnames bij. Wijzigt de lead een regel, dan wijzigt `openingfilm.js` mee (de test vergelijkt de tekst met het script). |

## Wat de opening moet doen (introductieprotocol)

1. **Twee namen:** Tammo en Tessa, ieder met een naamkaart en één droge regel (R-13). Rikus is een stem (geen kaart). Niemand anders heeft een naam nodig.
2. **Wat ze zijn:** 24, net afgestudeerd, samen nul banen, huisgenoten, en bang elkaar kwijt te raken ("Na de studie gaat iedereen ergens anders heen. Wij niet.").
3. **Het thema:** een plek in de wereld zoeken, samen: voor Tessa een tekening van iets met wielen, voor Tammo bij haar blijven, wat hij niet zegt ("…Samen.").
4. **Wat ze eerst moeten doen:** de wedstrijd, de standplaats, honderdvijftig euro vóór morgen twaalf uur, een lekke band, een bakkie lenen.
5. **De toon:** warm, droog, zomer; één grap per ca. 15 s, nooit ten koste van de informatie.
6. **Tammo's duiven:** ze volgen hem, hij kijkt er niet naar, niemand legt het uit.
7. **Jelle als vroege hinder:** een Fries in een blauw colbert die Grunn opkoopt (Rikus), en een man van achteren die een stikker VERKOCHT op een frietkot plakt: zonder naam, zonder uitleg.
8. **Een kicker en een titelkaart:** "Rijden, niet praten." en dan de titel met de slogan, daarna de landing bij de speler.

**Snackwagen niet prominent:** in de opening is de wagen een tekening en een bijzin; de titelkaart belooft hem niet (de test bewaakt dat).

## Regie in het kort (bijbel)

- Establishing shot per scène (R-01); camerastanden gemiddeld 3 tot 4 s (R-02); lens per shot-type (R-05: wide 46 tot 54, medium 34 tot 44, close 20 tot 32); ooghoogte tenzij gemotiveerd (R-06); kraan hoogstens 0,8 m/s en dolly of meeloop hoogstens 2 m/s (R-07).
- Het keukengesprek is shot/reverse-shot **per regel** (R-03) over de schouder, met close-ups op de belofte en de bekentenis, reacties na de grappen (R-10), en alle over-de-schouder-camera's aan één kant van de as, v = −0,32 (R-04, blokkerend). Tammo links, Tessa rechts.
- Stilte na de grap en de bekentenis (R-08): "…Samen." heeft 0,7 s lucht ervoor en 0,8 s erna.
- Hoogstens drie sprekers per scène (R-20). Hoogstens twee inserts per scène (R-09: de tekening, het huurcontract).
- Altijd zomer (R-17): mist bij zonsopgang mag, helder de rest van de dag. Dagritme: gouden uur (06:12), ochtend (07:25), heldere ochtend (10:36).
- **Geen witte flitsen** in de film (`r.film`: de montage-flits en de sluiterklik zijn uit); een snede is een snede.

---

## [C00.1] Koude opening – Stad, d'Olle Grieze naar de Oosterparkwijk – geen voertuig

EXT. DE STAD, VAN D'OLLE GRIEZE NAAR DE OOSTERPARKWIJK – ZONSOPGANG (06:12, gouden uur)

(regie: **c1-zwart, 3,4 s.** Zwart. Meeuwen, een fietsbel. Rikus komt zacht binnen op de radio.)
RIKUS (radio): Augustus. In Grunn heet dat zomer. [BEHOUDEN]

(regie: **c1-markt, 5,2 s, wide 50, kraan 3,6 m.** De Martinitoren in het eerste zonlicht; de camera stijgt langzaam, de zon valt over de stad. Establishing shot.)
RIKUS (radio): Er gaat niets boven Grunn. Behalve de Martinitoren. [BEHOUDEN]
MUZIEK: thema in, zonsopgang, warm en hoopvol, een bar lang opbouwend.

(regie: **c1-fietsen, 4,2 s, beauty 46, laag, statisch.** Fietsers in plaats van flamingo's trekken door beeld, ooghoogte van een fietszadel.)
RIKUS (radio): Vandaag in Grunn: weinig nieuws. Dat komt nog. [NIEUW]

(regie: **c1-meeuw, 2,4 s. Bewezen grap, ongewijzigd.** Een meeuw pakt een frikandel van een terras; de duiven stuiven weg. Stilte van een halve seconde.)
MUZIEK: korte pizzicato-stoot, het ritme gaat even uit.

(regie: **c1-duiven, 4,6 s, wide 48, meeloop 1,5 m/s.** Een stille straat in de Oosterparkwijk. Een jongen loopt met een beker koffie. Achter hem, op een respectabele afstand, volgt een zwerm duiven. Hij kijkt er niet naar.)
PERSONAGEKAART (op 1,0 s): **TAMMO** · Kent elke auto. De duiven kennen hem.

(regie: **c1-schouder, 3,2 s, medium 40.** Een duif landt op zijn schouder. Hij kijkt er niet naar; de koffie wel. Een zucht, geen woord.)

(regie: **c1-deur, 3,4 s, medium 34.** De deur door, de kamer in: hij houdt de deur open met zijn elleboog.)
MUZIEK: het thema zakt een octaaf, huiselijk.

## [C00.2] De keuken – Stad, Oosterparkwijk, zolder – geen voertuig

INT. ZOLDERKEUKEN, OOSTERPARKWIJK – OCHTEND (07:25, zacht daglicht)

(regie: **c2-gevel, 5,4 s, wide 50, dolly 7 m en een kantel omhoog.** Van de straat langs de rode Escapade met de lekke band omhoog naar het zolderraam. Establishing shot.)

(regie: **c2-bank.** Wide van de keuken; Tessa zit aan tafel met een bankbrief en een tekening, Tammo komt binnen met de koffie.)
PERSONAGEKAART (op 1,0 s): **TESSA** · Zegt wat ze denkt. Meestal twee keer.
TAMMO: Moi. De bank? [BEHOUDEN]
TESSA: "Uw plan is sympathiek." Dat betekent nee, met een strikje. [BEHOUDEN] *(grap; daarna Tammo's gezicht, stilte)*
MUZIEK: thema onder het gesprek, een kamertoon-gitaar; ducket onder elke stem.

(regie: **c2-wagen.** Ze zitten tegenover elkaar; shot/reverse over de tafel; op "een auto met een luik" een insert op de tekening, met de belettering TAM & TES op de blauwe snackwagen: de enige plek waar de naam in beeld komt, nooit in titel of slogan.)
TESSA: Een frietwagen is een auto met een luik, Tammo. En ik heb geen auto. [BEHOUDEN]
TAMMO: Ik wel. De Escapade. [BEHOUDEN]
TESSA: Die rijdt nauwelijks. [BEHOUDEN]
TAMMO: Dan rijdt hij nauwelijks voor jou. Een snackwagen die nauwelijks rijdt. Dat is een concept. [NIEUW]

(regie: **c2-plan.** Shot/reverse per regel; op "Het is een tekening" eerst de tekening, dan een close-up op Tessa; op "Dan rijd ik hem" een close-up op Tammo.)
TESSA: Zonder bank blijft er één weg over: een wedstrijd. Wie wint, krijgt de enige vrije standplaats van de Stad, een plek voor een wagen. [NIEUW]
TAMMO: De prijs voor de beste eierbal. [NIEUW]
TESSA: Wij winnen op 28 augustus, wij krijgen die standplaats, en dan zien we wel wat erop komt te staan. [NIEUW]
TAMMO: Is dat het plan? Een frietwagen? [NIEUW]
TESSA: Het is een tekening, Tammo. Ik weet nog niet wat ik wil. Dit heb ik tot nu toe. [NIEUW]
TAMMO: Dan rijd ik hem. Tot je het weet. [NIEUW]
TAMMO: En tot die tijd? Hier past geen frietwagen. [NIEUW]

(regie: **c2-thuis.** De belofte: een langzame zoom op Tessa; Tammo luistert; op het eind zijn reactie.)
TESSA: Daarom. Paddepoel, elfde verdieping. Twee kamers en een garage, voor de Fjord. [BEHOUDEN]
TAMMO: Paddepoel? Dat is buitenland. [BEHOUDEN]
TESSA: Vierentwintig, net afgestudeerd en samen nul banen. Na de studie gaat iedereen ergens anders heen. Wij niet. [NIEUW]

(regie: **c2-huur.** De bekentenis: een langzame zoom op Tammo, stilte; een insert op het huurcontract dat over de tafel schuift; reactie.)
TESSA: Alleen kan ik de huur niet betalen. Jij ook niet. Samen net. [BEHOUDEN]
TAMMO: …Samen. [BEHOUDEN] *(0,7 s lucht ervoor, muziek stopt)*
TESSA: Als huisgenoten, Tammo. Teken nou maar. [BEHOUDEN] *(grap; reactie, stilte)*
MUZIEK: een halve seconde stilte op "…Samen.", dan zacht terug.

(regie: **c2-raam, wide 46, dolly 3 m, van boven.** Van het zolderraam af, over de straat: aan de overkant plakt een lange man in een blauw colbert, van achteren, een stikker VERKOCHT op het luik van het frietkot en schudt een hand. Een duif op het dak kijkt mee. De Escapade met de lekke band staat in beeld.)
RIKUS (radio): Het is vrijdag 14 augustus. Een luisteraar meldt een Fries in een blauw colbert die Grunn aan het opkopen is. Ik zeg niks. [NIEUW]
MUZIEK: twee diepe noten (tuba), dreigend maar luchtig; verder niets.

(regie: **c2-kom.** Haar telefoon trilt op de tafel; zij pakt hem.)
TESSA: Kom. Werk. [BEHOUDEN]

## [C00.3] Verhuisdag – Stad, Paddepoel (Pleiadenlaan) – Escapade

EXT. PADDEPOEL, PLEIADENLAAN – OCHTEND (10:36, helder)

(regie: **c3-toren, wide 50, dolly 6 m, naar beneden langs de toren.** De House of Groningen, elf hoog; op straat de Escapade met een matras op het dak en een lekke band. Establishing shot; bijschrift PADDEPOEL.)
TAMMO: Elf hoog. Met een lift. Ik voel me rijk. [BEHOUDEN]
TESSA: Je bent niet rijk, Tammo. Je bent huisgenoot. [BEHOUDEN] *(grap, stilte)*

(regie: **c3-geld.** Shot/reverse bij de auto, Tammo met een verhuisdoos; op "een lekke band" een close-up op de band; de kicker op Tessa, dan Tammo's reactie.)
TESSA: Eerst geld. Meedoen aan die wedstrijd, de Noordelijke Snackprijs, kost honderdvijftig euro, contant, uiterlijk morgen om twaalf uur. [NIEUW]
TAMMO: Honderdvijftig euro. Vandaag. [NIEUW]
TESSA: Een streamer betaalt honderdvijftig euro voor stunts. Alleen heeft de Escapade een lekke band. [NIEUW]
TESSA: Dus we lenen een bakkie. Rijden, niet praten. [NIEUW]

(regie: **c1-titel, 4,4 s** (sinds 28-11 na de establishing shots van C00.1; hier stond hij eerder als c3-titel). Zwart. Het logo, de titel en de slogan.)
TITELKAART: **GDE GRONINGEN** · Zomer vol misdaad · *Een zomer in Grunn. Kon minder.* · Tammo en Tessa zijn net afgestudeerd en hebben samen geld voor één patatje.
MUZIEK: titel-sting op de beat, een klokje.

(regie: **c3-zweef, 4,6 s, kraan 3,6 m.** De zweefvlucht naar de plek waar de speler begint (de bestaande `flyShot`); "Welkom in Grunn". De camera landt bij de lokale hoofdpersoon.)
MUZIEK: het thema vol, ruim en vrolijk.

---

## Overslaan, Samen spelen, toegankelijkheid

- **Overslaan:** houd {SPATIE} 0,9 s ingedrukt (de bestaande cinematics-regel, hint met de toets in een toetsplaatje, DS3). De opening is lokaal en per speler; overslaan stopt niemand anders.
- **Samen spelen (regel):** de opening is van niemand en van iedereen: elke speler ziet hem **lokaal in zijn eigen spel**, gelijk (een tweemansscène met beide hoofdpersonen in beeld), dus zonder splitsing per protagonist. De host heeft geen zeggenschap; een gast met een nieuw profiel ziet hem bij zijn eigen eerste start (`introSeen` is per profiel). Alleen het einde verschilt: de zweefvlucht landt bij de lokale hoofdpersoon. Wie wegvalt of later aansluit verliest niets (geen voortgang of beloning). Test: `scripts/openingfilm_test.mjs` (`MULTIPLAYER`: lokaal, geen gate).
- **Toegankelijkheid:** geen flitsen; reduced-motion maakt de titelkaart een fade in plaats van zoom en laat het korrelfilter uit; ondertitels altijd aan in de opening; de sluglines zijn de tekst voor een schermlezer.

## Humor

De grappen zijn bewezen en blijven ongewijzigd: de strikje-regel, "Als huisgenoten", "Je bent huisgenoot" en de meeuw met de frikandel. De regie geeft ze ruimte (reactie, stilte) en het label `humor-review`; de smaak oordeelt het humorpaneel. **Nieuwe komische beat:** alleen de kicker "Dus we lenen een bakkie. Rijden, niet praten." met de lekke band in beeld. Varianten voor het paneel als de grap het niet haalt: (1) Tammo: "Rijden kan niet. De band." Tessa: "Duwen, niet praten." (2) Tessa kijkt naar de band: "Dan fietsen we." (3) Tammo kijkt naar de duiven, de duiven kijken naar de band. Neutrale terugval: variant 0.

## Nieuwe regels voor de TTS-ronde

Alle [NIEUW]-regels staan al in `docs/verhaal/nieuw/09-script-akte1.md` en gaan dus via de gewone TTS-ronde van de lead; de enige regel die niet in het script staat is Rikus' "Vandaag in Grunn: weinig nieuws. Dat komt nog." (ook van de lead) en de bestaande opname "Augustus. In Grunn heet dat zomer." (trailerstem). Er is niets nieuws bijgekomen.
