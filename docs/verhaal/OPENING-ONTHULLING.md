# Opening: geleidelijke onthulling (#987)

Context: spelerfeedback van 19-11-2026: de openingszinnen in de eerste missies zijn "erg matig en niet te volgen"; de opening is alleen te volgen als je het hele verhaal al kent ("slecht in progressive disclosure"). Positief en te behouden: aan het einde komen alle personages die je hebt ontmoet samen.

Dit document is actueel (geen verslag van een oude ronde). De canon verandert niet; wat verandert is de volgorde, de formulering en wanneer iets wordt uitgelegd. Niets is in het spel gezien of gehoord; zie "Wat nog niet is bekeken".

## 1. Meten

`node scripts/verhaal_onthulling.mjs [--regels]` loopt de opening (de trailermontage, C00.2, C00.3) en M01 t/m M03 in speelvolgorde door, met een tijd, en telt per regel wat een nieuwe speler erbij krijgt: nieuwe namen (personen, bedrijven, evenementen, voorwerpen), plekken, jargon, regels met voorgeschiedenis en verwijzingen naar iets wat nog niet is getoond of uitgelegd. De test `scripts/verhaal_onthulling_test.mjs` bewaakt de norm. `VERHAAL_ROOT=<map>` meet een eerdere stand van de werkboom (zo is de nulmeting gedaan).

- **Wat meetelt:** de regels uit `script.json` zoals het spel ze speelt (zonder `OPENING_CUT`), de kaarten van de trailermontage (`intromontage.js`: C00.1 zoals gespeeld; de Rikus-regels van C00.1 in het script zijn alleen de terugvalact en tellen niet mee), de briefing en uitkomst van de missie (`missions_nieuw.js`, `missions_defs.js`) en het HUD-doel (`storyarc_nieuw.js`).
- **Tijd:** voorgelezen of leestijd per regel (zoals `story.js` ze plant) plus een schatting van de speeltijd tussen de scènes (rijden, stunten, de rij). Die schatting staat in `VOLGORDE` en is niet in het spel gemeten.
- **Gratis:** Tammo en Tessa (naamkaart in de trailer), de stad en de Martinitoren (in beeld), Rikus en Nachtstreek (de radio is de stem van de wereld, geen personage om te onthouden).
- **Norm voor de eerste vijf minuten:** hoogstens twee nieuwe namen per scène, twee plekken, twee stukken jargon, twee regels met voorgeschiedenis (een uitleg ervan telt mee), één figuur zonder naam ("een Fries in een blauw colbert" is een haak, geen naam) en geen verwijzing zonder uitleg. Daarna mag een scène drie namen dragen; een onverklaarde verwijzing blijft nergens toegestaan.
- **Grenzen:** een lexicon en een paar patronen. De meting vindt plekken waar een speler niets aan heeft; ze beoordeelt niet of iets grappig of mooi is. De autogesprekken en banter (`[B1]`) en de uitleg van de besturing zijn niet meegeteld.

### Nulmeting en nameting

| | voor | na |
|---|---|---|
| nieuwe dingen in de eerste 5 minuten | 15 | 15 |
| regels in de eerste 5 minuten | 49 | 48 |
| overtredingen van de norm | 7 | 0 |
| regels waar een nieuwe speler weinig aan heeft | 5 | 0 |
| verwijzingen zonder uitleg | 6 meldingen (Ontzet drie keer, de ladder twee keer, de Gouden Eierbal) | 0 |
| keuken (C00.2): nieuwe namen | 3 (Escapade, snackwagen, Snackprijs) | 2 (Escapade, snackwagen) |
| M01.1: het Ontzet | genoemd zonder uitleg | uitgelegd in de regel erna |
| M02.1: nieuwe namen | 4 (Durk, Douwe, Sjabbe, Pand & Poen) | 2 (Durk, Douwe) |

De dichtheid zelf daalt dus niet: de feiten blijven dezelfde. Wat verandert is dat niets meer wordt genoemd vóór het is uitgelegd, en dat de namen over de scènes zijn verdeeld.

## 2. Wat een nieuwe speler te zien en te horen krijgt

1. Een trailer met kaarten ("Grunn.", "Een zomer.", de naamkaarten van Tessa en Tammo, flitsen vooruit, de titel). Geen stem.
2. De keuken (ca. anderhalve minuut): de radio, Tammo en Tessa aan tafel, de bank zegt nee, een wedstrijd, een flat op de elfde verdieping, "huisgenoten".
3. Verhuisdag: eerst geld, honderdvijftig euro voor morgen twaalf uur, een streamer betaalt voor stunts.
4. M01 Berend en de stunts, M02 de pinautomaat, M03 het Loket: de eerste ontmoetingen met Berend, de streamer, de torenwachter, Durk en Douwe, Sjabbe, de loketbediende, Jelle en mevrouw Hoving.

## 3. Waar het misging (concrete regels, stand voor de herschrijving)

| Waar | Regel | Probleem |
|---|---|---|
| C00.2 | "Ik wel. De Escapade." / "De snackwagen, op een Fjord." / "…de Noordelijke Snackprijs." | drie eigennamen in een scène waarin de speler nog niet weet wat het plan is |
| C00.2 | "Op Gronings Ontzet." en "…in 1672 de bisschop buiten hield." | de naam stond in een regel, de uitleg stond in een regel die was geschrapt (#662); het Ontzet bleef daarna onverklaard hangen |
| M01.1 | "Jij bent toch Bommen Berend? Van het Ontzet?" | het Ontzet is voor de speler nergens verteld; de grap werkt alleen met voorkennis |
| M01.1 | "Met de stunts erbij is dat genoeg, Tammo." | zegt niet wat genoeg is, noch voor wat |
| M01.2 | "Zonder krassen." | een losse zin zonder reden (het bakkie is van Berend) |
| M01.6 | "Trede twee van de complimentenladder, Tammo." | verwijst naar een ladder die nergens is uitgelegd |
| M02.1 | "Sjabbe van Pand & Poen koopt wat niemand wil…" | vier namen in één scène (Durk, Douwe, Sjabbe, Pand & Poen) |
| M02.3 | "Het museum. De Gouden Eierbal." | de bal is nog nooit uitgelegd als prijs |
| M03.2 | het hele jurygedeelte | veel voorgeschiedenis in één scène (sinds 1998, sinds 1982, sinds woensdag); blijft staan, het is canon die later nodig is, en valt binnen de norm voor het tweede deel van M03 |

Daarnaast zei de slotkaart van de trailer alleen "Een zomer in Grunn"; de haak (wat is er aan de hand) kwam pas in de keuken.

## 4. Ontwerp voor geleidelijke onthulling

Regels voor elke scène in de opening en de eerste drie missies:

1. **Eén haak:** wat is er aan de hand. Hier: twee Stadjers hebben een frietwagen nodig en geen plek. Staat in de slotkaart van de trailer.
2. **Eén doel per scène.** Keuken: ze willen die wedstrijd winnen. Verhuisdag: eerst honderdvijftig euro. M01: dat geld verdienen. M02: de pas terug. M03: inschrijven.
3. **Eerst tonen of uitleggen, dan benoemen.** De keuken zegt eerst "een wedstrijd, de enige vrije standplaats, een plek voor een frietwagen"; de naam Noordelijke Snackprijs komt pas in de verhuisdag, bij het geld. Het Ontzet wordt uitgelegd in de regel na de grap. De Gouden Eierbal wordt in dezelfde regel de wisselprijs genoemd.
4. **Hoogstens twee nieuwe namen per scène.** Wat daarbuiten valt, wacht op een scène waar het nodig is: het Loket wordt pas in M01.2 een naam; Sjabbe en Pand & Poen staan in het doel van M02 (de briefing) en niet meer in Tessa's eerste regels.
5. **Voorgeschiedenis pas wanneer ze nodig is.** Het Ontzet en 1672 komen bij Berend, waar de speler hem in zijn rol ziet; 1998 en 1982 blijven bij mevrouw Hoving omdat latere scènes ze gebruiken.
6. **Een duidelijke vraag aan het eind van de opening:** "Honderdvijftig euro. Vandaag." en Tessa's antwoord (een streamer, een bakkie, rijden) zeggen wat er nu moet; het HUD zegt waar.
7. **Humor blijft:** de strikje-grap, "Samen net", "Dat is buitenland", "Je bent huisgenoot", de torenwachter ("Ik meld alleen"), Berends krassen en "Goud" blijven. De vijf regels die #662 uit de opening schrapte (waaronder de kat) staan niet meer in het script, want ze werden al niet gespeeld.
8. **Verder ongemoeid:** het slot en de ensemble-samenkomst aan het eind van het spel, de ids en de volgorde van scènes (saves en tellers), de bestaande opnames waar de tekst gelijk kan blijven. Alleen Nederlandse regels van Tessa zijn herschreven, zodat geen nieuwe Groningse spreektekst nodig is.

## 5. Wat er is veranderd

Zie `docs/verhaal/nieuw/09-script-akte1.md` (bron) en de commit. Samengevat:

- **Trailer (C00.1):** de slotkaart noemt de haak ("Twee afgestudeerden. Eén frietwagen. Geen plek."). De Rikus-regels van C00.1 in het script blijven ongewijzigd: ze zijn de terugvalact en worden normaal niet gespeeld.
- **Keuken (C00.2):** de vijf geschrapte regels (#662) zijn uit het script gehaald zodat meting, script en spel gelijk zijn (18 gespeelde regels; `ACT_SPLIT` in `cutscenes.js` volgt). Tessa zegt nu "een wedstrijd" met een standplaats als prijs ("een plek voor een frietwagen"), niet meer meteen de naam.
- **Verhuisdag (C00.3):** de Noordelijke Snackprijs krijgt hier zijn naam, bij het geld; het Loket noemt Tessa nog niet.
- **M01.2:** "Dat is precies de inschrijving voor het Loket" wordt "Dat is precies de inschrijving. Die betaal je bij het Loket, het stadsloket." (het Loket krijgt een omschrijving waar het eerst valt).
- **M01:** Tessa legt het Ontzet uit (1672, de bisschop), zegt waarom de klus de inschrijving betaalt ("Vijftig euro van Berend en honderdvijftig van de streamer. Dan kunnen we ons inschrijven"), geeft "Zonder krassen" een reden, en de complimentenladder is vervangen door "Goud, Tammo. Van Berend is dat een medaille."
- **M02:** Tessa noemt Sjabbe niet meer in haar eerste regels ("Ik ken iemand die opent wat niemand kan"); de Gouden Eierbal wordt als wisselprijs van de Snackprijs genoemd.
- **M03:** ongewijzigd in tekst; valt binnen de norm doordat het Ontzet en de bal al zijn uitgelegd.

Staging: de cues op regels in `cutscenes_akte1.js` (`on:`) volgen de nieuwe regelbegin ("Goud, Tammo", "Ik ken iemand"). `cutscenes_akte1_test` en `cutscript_test` blijven groen.

## 6. Het TTS-gat

`node scripts/voice_coverage.mjs --quiet` meldt dat elke gespeelde regel van de opening en M01-M03 vóór deze ronde een opname had (alle manifestregels bestaan, alle mp3's zijn hoorbaar: gemiddeld rond -18 dB). Het ontbrekende personage zit dus niet in die scènes. De bekende gaten elders (#924): **Geesje** (18 regels in M09, M21, M23, M26 en M30) en **Rotor Roelf** (2 regels in M12) wachten op een Groningse spreektekst van een kenner (`scripts/tts_waiting.json`); dat is geen code of koppeling. De trailermontage zelf heeft geen stem (de naamkaarten zijn tekst); dat is ontwerp, geen gat. Welk personage de eigenaar precies niet hoorde, is uit de data niet af te leiden: vraag het hem als het Geesje niet is.

Nieuw in deze ronde, voor de TTS-ronde (`docs/verhaal/TTS-OPNAMELIJST-735.md`): tien herschreven regels van Tessa (Nederlands, `lang: own`) zonder opname, klaar in `scripts/tts_lines.json`: C00.2 (1), C00.3 (1), M01.1 (2), M01.2 (3), M01.6 (1), M02.1 (1), M02.3 (1). Er is geen nieuwe Groningse spreektekst nodig.

## 7. Samen spelen

Ongewijzigd: de opening is van wie het spel opende (de wereld) en een gast ziet haar niet opnieuw; de scènes gaan als data naar de gasten (`coopcut_test` en `cutgast_test` zijn groen met de nieuwe regelaantallen). M01-M03 blijven gesprekken van wie de missie speelt; er komt geen nieuwe gastregel bij.

## 8. Wat nog niet is bekeken

Alles hierboven is gemeten op tekst en data; er is geen Electron gedraaid en niets in het spel gezien of gehoord. De eigenaar beoordeelt de toon en de humor van de herschreven regels, of de slotkaart van de trailer past in beeld (lange kaart in hoofdletters), en of de keuken nu helderder aanvoelt. De tijden uit de meting voor stunts en rijden zijn schattingen.
