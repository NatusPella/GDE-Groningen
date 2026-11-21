# Opening: filmscript (C00, 21-11)

Filmscript van de openingscutscene van een nieuw spel: ca. 92 s, bedoeld voor iemand met NUL context. Machinevorm: [game/js/openingfilm.js](../../game/js/openingfilm.js) (shotlijst, regels, cues, validators); test: `scripts/openingfilm_test.mjs`. De opening hoort bij [09-script-akte1.md](nieuw/09-script-akte1.md) (scène-id's C00.1 tot en met C00.3; de verhaal-lead kan deze scènes één op één overnemen) en bij de regie-bijbel [../CUTSCENE-REGIE-21-11.md](../CUTSCENE-REGIE-21-11.md) (R-01 tot en met R-30). Het canonblad: [../VERHAALCANON-21-11.md](../VERHAALCANON-21-11.md).

> **Formaat.** Een scène begint met een slugline (`INT.`/`EXT.`, plaats, dagdeel). Dan actieregels (wat we zien), dan `PERSONAGEKAART` bij een eerste verschijning, dan dialoog `SPREKER: tekst [BEHOUDEN|NIEUW]` (`[BEHOUDEN]` = er is een opname; `[NIEUW]` = alleen tekst tot de TTS-ronde), regie-aanwijzingen als `(regie: ...)`, en `MUZIEK:` en `SFX:` als cues met tijd. Tijden zijn seconden vanaf het begin van de film. Geen toneelaanwijzing in een uiting. Geen echte merken of personen.

## Wat de opening moet doen (introductieprotocol)

Een speler die niets weet, hoort en ziet in anderhalve minuut:

1. **Twee namen:** Tammo en Tessa, ieder met een naamkaart en één droge regel (R-13). Rikus is een stem op de radio (geen kaart). Niemand anders heeft een naam nodig.
2. **Wat ze zijn:** 24, net afgestudeerd, samen nul banen, huisgenoten; en dat ze bang zijn elkaar kwijt te raken ("Na de studie gaat iedereen ergens anders heen. Wij niet.").
3. **Het thema:** een plek in de wereld zoeken, samen. Voor Tessa is dat een thuis met wielen (een tekening en een frietwagen als eerste wens, geen belofte); voor Tammo is het bij haar blijven, wat hij niet zegt (de bekentenis zit in één woord: "…Samen.").
4. **De toon:** warm, droog, zomer. Eén grap per 15 s, nooit ten koste van de informatie.
5. **Tammo's duiven:** ze volgen hem, hij kijkt er niet naar, niemand legt het uit.
6. **Jelle als vroege hinder:** een Fries in een blauw colbert die Grunn aan het opkopen is (Rikus), en een man van achteren die een stikker VERKOCHT op een frietkot plakt. Zonder naam, zonder uitleg; hij komt in M03 in persoon.
7. **Een kicker en een titelkaart:** "Rijden, niet praten." en dan de titel met de slogan *Ontdek jezelf in Grunn.*

**Snackwagen niet prominent:** de wagen komt in de opening alleen als bijzin en als tekening in beeld (R-15, canon). De titelkaart belooft hem niet (de test bewaakt dat).

## Regie in het kort (bijbel)

- Establishing shot per scène (R-01), shots 2 tot 7 s met als gemiddelde 4 tot 5 s (R-02), lens per shot-type (R-05: wide 46 tot 54, medium 36 tot 44, close 20 tot 32), ooghoogte tenzij gemotiveerd (R-06), kraan hoogstens 0,8 m/s en dolly hoogstens 2 m/s (R-07).
- De keuken wordt **geregisseerd uit de dialoog** met de regie-engine (`game/js/cutdirector.js`, opt-in `direct:`): shot/reverse-shot over de schouder, close-up op de bekentenis, een reactie na de grap, de camera blijft aan één kant van de as (R-04). De lijst staat in `kitchenDirection()`; Tammo staat links, Tessa rechts.
- Stilte na een grap of bekentenis: 0,5 tot 1,5 s (R-08). Maximaal twee inserts per scène (R-09).
- Altijd zomer (R-17): mist bij zonsopgang mag, helder de rest van de dag.
- Dagritme: gouden uur (06:12), zacht ochtendlicht in de kamer (07:25), heldere middag (13:40).
- Geen flitsen: elke overgang is een snede of een fade (toegankelijkheid; de oude witte flits van de trailer-parodie vervalt).

---

## [C00.1] Koude opening – Stad, d'Olle Grieze naar de Oosterparkwijk – geen voertuig

EXT. GRUNN, VAN D'OLLE GRIEZE NAAR DE OOSTERPARKWIJK – ZONSOPGANG (06:12, gouden uur)

(regie: **0,0 tot 3,0 s, c1-zwart.** Zwart. Meeuwen, een fietsbel, ver weg een bus. Rikus komt zacht binnen op de radio.)
RIKUS (radio): Augustus. In Grunn heet dat zomer. [BEHOUDEN]
SFX: 0,0 meeuwen-ver, 1,2 fietsbel. MUZIEK: 0,0 stilte met straatgeluid.

(regie: **3,0 tot 8,0 s, c1-markt, wide 50, kraan omhoog 3,5 m.** De Martinitoren in het eerste zonlicht; de camera stijgt langzaam langs de toren, de zon valt over de Grote Markt. Dit is het establishing shot van de film.)
MUZIEK: 3,0 thema in, zonsopgang, warm en hoopvol, een bar lang opbouwend.

(regie: **8,0 tot 12,0 s, c1-fietsen, beauty 46, laag naast de fietsers (6 m).** De camera rijdt mee op wieltjeshoogte; fietsers in plaats van flamingo's, een terras dekt tafels, een werkboot vist een fiets uit de gracht.)

(regie: **12,0 tot 14,2 s, c1-meeuw, 48, statisch. Bewezen grap, ongewijzigd.** Een meeuw pakt een frikandel van een terras en vliegt weg. Daarna stilte van een halve seconde.)
SFX: 12,0 meeuw-frikandel. MUZIEK: 12,0 sting-meeuw, korte pizzicato-stoot.

(regie: **14,2 tot 18,4 s, c1-duiven, wide 48, zij-aanzicht, 5 m meelopen.** Een stille straat in de Oosterparkwijk, de Korenbloemstraat. Een jongen loopt met twee bekers koffie. Achter hem, op een respectabele afstand, volgt een zwerm duiven. Hij kijkt er niet naar.)
PERSONAGEKAART (op 15,0 s, 3,0 s): **TAMMO** · Kent elke auto. De duiven kennen hem.
SFX: 14,2 duivenvleugels.

(regie: **18,4 tot 21,4 s, c1-schouder, medium 40.** Een duif landt op zijn schouder. Hij kijkt er niet naar; de koffie wel, die gaat over de rand. Hij zucht zonder iets te zeggen.)
SFX: 18,4 koffie-morsen.

(regie: **21,4 tot 24,8 s, c1-deur, medium 38, dolly 3 m.** Achter hem aan de voordeur in, het trappenhuis op, omhoog naar de zolder. De duiven blijven beneden zitten, op de stoeprand, alsof ze wachten.)
MUZIEK: 21,4 thema zacht, een octaaf lager, huiselijk.

## [C00.2] De keuken – Stad, Oosterparkwijk, zolder – geen voertuig

INT. ZOLDERKEUKEN, OOSTERPARKWIJK – OCHTEND (07:25, zacht daglicht door het zolderraam)

(regie: **24,8 tot 28,0 s, c2-gevel, wide 50, kraan 2 m.** Van de gevel naar het zolderraam; een rode Escapade met een lekke band staat op de stoep. Binnen zit iemand aan een tafel vol papieren.)

(regie: **28,0 tot 32,2 s, c2-twee, medium 40, dolly 1,5 m.** Tweeshot. Tessa zit aan de keukentafel: een bankbrief, een huurcontract, een tekening van een blauwe wagen met een luik. Tammo komt binnen en zet de bekers neer, één half leeg. Tammo links in beeld, Tessa rechts, de hele scène.)
PERSONAGEKAART (op 28,8 s, 3,0 s): **TESSA** · Zegt wat ze denkt. Meestal twee keer.
MUZIEK: 28,0 thema onder het gesprek, een kamertoon-gitaar; de muziek ducket onder elke stem.

(regie: **32,2 tot 62,4 s: het gesprek. Door de regie-engine uit de lijst hieronder: tweeshot, over de schouder, close-ups op de bekentenis en de belofte, een reactie na elke grap. Eén gedachte per regel; geen shot korter dan 1,2 s, geen stilstaand shot langer dan 7 s.**)
TAMMO: Moi. De bank? [BEHOUDEN] *(vraag, neutraal)*
TESSA: “Uw plan is sympathiek.” Dat betekent nee, met een strikje. [BEHOUDEN] *(grap; reactie van Tammo, stilte)*
TESSA: Een frietwagen is een auto met een luik, Tammo. En ik heb geen auto. [BEHOUDEN]
TAMMO: Ik wel. De Escapade. [BEHOUDEN] *(blij)*
TESSA: Die rijdt nauwelijks. [BEHOUDEN]
TAMMO: Dan rijdt hij nauwelijks voor jou. [NIEUW] *(teder)*
TESSA: Vierentwintig, afgestudeerd, samen nul banen. [NIEUW]
TESSA: Na de studie gaat iedereen ergens anders heen. Wij niet. [NIEUW] *(belofte: close-up op Tessa, reactie van Tammo)*
TESSA: Alleen kan ik de huur niet betalen. Jij ook niet. Samen net. [BEHOUDEN]
TAMMO: …Samen. [BEHOUDEN] *(bekentenis: close-up op Tammo; de langzame zoom; stilte van 0,6 s; muziek stopt)*
(regie: op het raam landt een duif en kijkt naar binnen. Niemand zegt er iets over.)
MUZIEK: 63,4 stilte-bekentenis, een halve seconde, dan zacht terug.

(regie: **62,4 tot 64,4 s, c2-contract, insert 28.** Het huurcontract schuift over de tafel. Een pen, twee handtekeningen die nog moeten komen.)
TESSA: Als huisgenoten, Tammo. Teken nou maar. [BEHOUDEN] *(grap; reactie, stilte)*

(regie: **66,0 tot 71,0 s, c2-raam, wide 46, dolly 3 m, door het raam.** Aan de overkant, op de hoek, hangt een frietkot. Een lange man in een blauw colbert, van achteren, plakt een stikker VERKOCHT op het luik en schudt een hand. De camera rijdt langzaam in, de duif op de vensterbank kijkt mee.)
RIKUS (radio): Een luisteraar meldt een Fries in een blauw colbert die Grunn aan het opkopen is. Ik zeg niks. [NIEUW]
SFX: 66,0 stikker. MUZIEK: 66,0 jelle-hint, twee diepe noten (tuba), dreigend maar luchtig; verder niets.

## [C00.3] Verhuisdag – Stad, Paddepoel (Pleiadenlaan) – Escapade

EXT. PADDEPOEL, PLEIADENLAAN – MIDDAG (13:40, helder)

(regie: **71,0 tot 75,0 s, c3-toren, wide 50, dolly 6 m.** De woontoren van de House of Groningen, elf hoog; op straat de Escapade met een matras op het dak en een lekke band. Een stuk Paddepoel: de rand van de stad.)

(regie: **75,0 tot 81,2 s, c3-twee, medium 40.** Tweeshot bij de auto. Ze praten tegen elkaar, niet tegen de camera.)
TAMMO: Elf hoog. Met een lift. Ik voel me rijk. [BEHOUDEN]
TESSA: Je bent niet rijk, Tammo. Je bent huisgenoot. [BEHOUDEN] *(grap, stilte)*

(regie: **81,2 tot 83,4 s, c3-band, close 28.** De lekke band zucht lucht uit.)
TESSA: Rijden, niet praten. [BEHOUDEN] *(kicker; Tammo kijkt naar de band)*
SFX: 81,2 band-sissen.

(regie: **83,4 tot 88,0 s, c3-zweef, wide 50, kraan 3,6 m.** De zweefvlucht naar de plek waar de speler begint (de bestaande `flyShot`); onderaan in beeld het kader "Welkom in Grunn". De camera landt bij de speler: voor wie Tammo is, is dat Tammo, voor wie Tessa is, Tessa.)
MUZIEK: 83,4 thema groot, ruim en vrolijk, op de zweefvlucht.

(regie: **88,0 tot 92,4 s, c3-titel, titelkaart.** Zwart. Het logo, de titel en de slogan.)
TITELKAART: **GDE GRONINGEN** · Zomer vol misdaad · *Ontdek jezelf in Grunn.* · Twee afgestudeerden. Eén zomer. Nog geen plan.
MUZIEK: 88,0 titel-sting op de beat, een klokje.

---

## Overslaan, Samen spelen, toegankelijkheid

- **Overslaan:** houd {SPATIE} 0,9 s ingedrukt (hint in DS3 met de toets in de knop; de hold is de bestaande cinematics-regel). De opening is lokaal en per speler; overslaan stopt niemand anders.
- **Samen spelen (regel):** het is van niemand en van iedereen: elke speler ziet de opening **lokaal in zijn eigen spel**, identiek (een tweemans-scène met beide hoofdpersonen in beeld), dus zonder splitsing per protagonist. De host heeft geen zeggenschap; een gast die later aansluit en een nieuw profiel heeft, ziet hem bij zijn eigen eerste start (`introSeen` is per profiel). Alleen het einde verschilt: de zweefvlucht landt bij de lokale hoofdpersoon (Tammo of Tessa). Wie wegvalt of later aansluit verliest niets: er is geen voortgang of beloning. Test: `scripts/openingfilm_test.mjs` (MULTIPLAYER: lokaal, geen gate).
- **Toegankelijkheid:** geen flitsen; reduced-motion maakt de titelkaart een gewone fade in plaats van zoom en letterafstand; ondertitels altijd aan in de opening, ook bij uitgezet geluid; de beschrijving per scène (de sluglines hierboven) is de tekst voor een schermlezer.

## Humor

De grappen zijn bewezen en blijven ongewijzigd: de strikje-regel (L02), "Als huisgenoten" (L11), "Je bent huisgenoot" (L14), de meeuw met de frikandel. De regie geeft ze ruimte en het label `humor-review`; de smaak oordeelt het humorpaneel. **Nieuwe komische beat:** alleen de kicker. Voorstel variant 0 is de bestaande "Rijden, niet praten." met de lekke band in beeld (geen nieuwe tekst). Varianten voor het paneel als de band-grap het niet haalt: (1) Tammo: "Rijden kan niet. De band." Tessa: "Duwen, niet praten." (2) Tessa kijkt naar de band: "Dan fietsen we." (3) Tammo kijkt naar de duiven, de duiven kijken naar de band. Neutrale terugval: variant 0.

## Nieuwe regels voor de TTS-ronde

Vier [NIEUW]-regels: L06 (Tammo), L07 en L08 (Tessa), L12 (Rikus, radio). Ze staan nog niet in `script.json`: de verhaal-lead neemt C00.2 over in `docs/verhaal/nieuw/09-script-akte1.md` (zelfde scène-id's), waarna `node scripts/tts_lines_list.mjs` en `node scripts/voice_wacht.mjs --write` ze oppikken. Tot die tijd tonen ze alleen tekst.
