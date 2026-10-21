# Inclusieve taal: audit van de speltekst

De eigenaar wil een spel dat inclusief is en niemand kwetst. Deze audit loopt langs alle speltekst en legt vast wat is aangepast en wat bewust bleef.
De woorden en voorkeursvormen staan in [WOORDENLIJST.md](WOORDENLIJST.md), sectie "Inclusieve taal". `node scripts/text_audit.mjs` (regel `inclusief`) houdt het vast.

## Wat is bekeken

Alle tekst die een speler ziet of hoort: elke tekenreeks in `game/js` (14.970 unieke teksten die als zin of naam gelden), `game/index.html`, de tekst in `game/storydata/script.json` (gebouwd uit `docs/verhaal/nieuw/09-script-akte1..5.md`), cutscenes, dialogen, banter, radio, bordjes, prestaties, hulpteksten en de Gronings-gesproken versies. Daarnaast `docs/verhaal` en de rest van `docs` op harde woorden.

Zoekopdrachten met woordgrens (`(?<![\p{L}\p{N}])woord(?![\p{L}\p{N}])`), in zes categorieën:

1. mannelijk als standaard (beroepen op -man, vrouwelijke varianten op -ster, onbekende personen met "hij");
2. aanspreekvormen van een gemengde groep (jongens, meisjes, dames en heren);
3. kwetsende of verouderde woorden over beperking, geestelijke gezondheid, afkomst, gender, uiterlijk of leeftijd;
4. ziekte als vloek (kanker, tyfus, tering);
5. machtstermen (master/slave, blacklist/whitelist, guest);
6. woorden voor volken en herkomst.

Valse positieven die er met de hand uit zijn gehaald: *negeren* (bevat "neger"), *gekocht*, *gekozen*, *Gekoppeld* (beginnen met "gek"), *twijfel* (bevat "wijf"), *Boteringestraat* en *achteringang* (bevatten "tering"), *smalle* (bevat "mal"), *traumaheli* (medisch, geen scheldwoord), *hoeren* in het Gronings voor "horen", *kleren* en *hartstikke*.

## Uitkomst in één alinea

De speltekst was al grotendeels schoon: geen enkel hard scheldwoord (mongool, zigeuner, neger, enzovoort) komt voor. De vondsten waren mild: "jongens" en "dames en heren" als aanspreking, een paar beroepen op -man, een onbekende persoon met "hij", en één keer "een gek" voor een gewelddadig mens. Zo'n twintig regels zijn aangepast, zes voor de verhaalbron en de rest in de js-tabellen.

## Aangepast

| Waar | Was | Wordt | Reden |
|---|---|---|---|
| `pedestrians.js` (112-melding bij geweld) | Politie? Een gek slaat hier mensen in elkaar! | Politie? Iemand slaat hier mensen in elkaar! | "een gek" maakt een psychische aandoening tot scheldwoord. **Ingesproken: de opname is uitgezet** (`scripts/voice_stil.json`), de regel staat als tekstballon. |
| `sidejob_taxi.js` ×2 | Een zakenman met drie telefoons / De zakenman belt zijn advocaat | Een zakenreiziger met drie telefoons / De zakenreiziger belt de advocaat | mannelijk als standaard |
| `furniture.js` | De mysterieuze klusjesmannen uit Paddepoel | De mysterieuze klussers uit Paddepoel | idem |
| `stadsprofielen.js` | Een stuurman zwaait naar een auto. | Iemand aan het roer zwaait naar een auto. | idem |
| `roadragerules.js` | met iets in zijn hand | met iets in de hand | geen "zijn" voor een onbekende bestuurder |
| `cheatlist.js` | het hoofd dat hij denkt te hebben | het hoofd dat bij de eigen verbeelding past | geen "hij" voor iedereen |
| `startscreen.js` | of hij die nou heeft of niet | of die nou voorrang heeft of niet | idem |
| `regioleven.js` | met een lamp op zijn hoed | met een lamp op de hoed | onbekende fietser |
| `casework.js` ×2 | een bankje dat hij zelf heeft meegenomen / Goeie jûn, dames en hearen! (Goedenavond, dames en heren!) | dat die persoon zelf / Goeie jûn, allegear! (Goedenavond, allemaal!) | onbekende persoon; aanspreking |
| `sidejob_rondvaart.js` | laat zijn stroopwafel vallen | laat de stroopwafel vallen | onbekende toerist |
| `keuzewerk.js` | "Dames en heren, een dankwoord…" | "Beste aanwezigen, een dankwoord…" | aanspreking |
| `pigeonmode.js` | Doei, jongens! | Doei, allemaal! | aanspreking |
| `subtitles.js` | Zwaaien, jongens. | Zwaaien, allemaal. | aanspreking |
| `09-script-akte2.md` ×5, `09-script-akte4.md` (en `script.json`, `HET-VERHAAL.md`, `00-OVERZICHT.md`, `04-akte4.md`) | …, jongens. (buschauffeur, Kapitein Klaas ×4, Jelle) | …, allemaal. / …, mensen. | aanspreking; alle zes zijn nog niet ingesproken |

## Bewust gebleven (met reden)

Elke regel staat met een `why` in `scripts/text_audit_allow.json` (rule `inclusief`).

**Ingesproken en mild: de opname blijft, de nieuwe tekst staat klaar bij een heropname** (zie `scripts/voice_stil.json`, sectie `heropname`, en de laatste sectie van [OPNAMELIJST.md](verhaal/OPNAMELIJST.md)):

- Rikus aan de luisteraars: "ik ook, jongens" (wordt "luisteraars"), in de intromontage en in akte 1.
- Anita: "Opzij, jongens." en Tammo: "Kom op, jongens.", "Moi, jongens. Lekker gebotst?" (wordt "allemaal").
- Kapitein Klaas: "Jongens. Ik heb net twee reuzen uit de haven gevist." (wordt "Mensen.").
- Jelle: "Jim fytse mar, jonges." met de Nederlandse ondertitel "Fietsen jullie maar, jongens."
- De rondvaartgids en Schipper Wiebe (megafoon): vier keer "dames en heren" (wordt "beste mensen").
- "dat hij niet in de bus zit" (banter, Tammo): wordt "dat die niet in de bus zit".
- Het radiobericht "Mysterieuze klusjesman weer aan het werk in Groningen" (radio, Kiekdoar): wordt "klusser".

**Idioom over gedrag, geen persoon of aandoening:**
- "In Stad rieden ze as gekken", "Doe mor normaal, den dousto al gek genog", "Ben je gek geworden?", "gek op de fanfare", "Bist mal?", "Gekookt ei": een gezegde of voorkeur, geen groep.

**Personage met eigenheid of een bekend geslacht:**
- "Twee grote kerels" (Durk en Douwe), "een nors mannetje" (Berend Bos), "Tessa, meisje?" en "Mijn jongens" (Jelle over zijn handlangers), de buurman, de kroegbaas, Bewaker twee: personages en handlangers met een vast, verzonnen geslacht.
- "Tammo, jij bent kleurenblind" (ingesproken): Anita plaagt Tammo om een kleur, de grap is dat hij het niet ziet en dat zij er niets van zegt; het raakt geen groep. Bij een heropname kan "Tammo, jij ziet dit anders" ervoor in de plaats.

**Neutraal Nederlands, dus geen probleem:** voorzitter, bemanning, vakmanschap, bewaker, baas, baasje, kok, chauffeur. De Friese en Groningse woorden voor "jongen/meisje" (famke, jonges) zijn geen aanspreking van een groep.

**Namen van objecten, dieren en verzonnen mensen:** "Dikke Tinus" (fatbike), "Café De Dikke Duif", "Dikkie Dijkstra" (verzonnen lezer), "Winkelverslaafde" (prestatie; het woord staat al in de woordenlijst als vervanging van *shopaholic*).

**Samen spelen:** "Iedereen houdt zijn eigen voortgang" in `lobby.js` laat ik aan de sessie r27-samenspelen; de allowlist heeft er een tijdelijke regel voor die moet vervallen zodra die tekst verandert. De rollen *gastheer* en *gast* zijn gewoon Nederlands; `host` en `lobby` stonden al als anglicisme op de lijst.

**Geen tekst, wel code:** `master`, `slave`, `whitelist`, `blacklist` komen alleen voor als identifier in `audio.js` (`master`-gain), niet in speltekst.

## Opnames

Er zijn geen nieuwe opnames gemaakt (geen TTS). Eén ingesproken regel is bewust stil gezet (zie boven); de rest staat voor een heropname in `scripts/voice_stil.json`. `voice_coverage` en de generator (`voicelines_collect.mjs`) slaan de stille regels over.

## Controles

`node scripts/text_audit_test.mjs`, `node scripts/voice_coverage.mjs --quiet`, `node scripts/opnamelijst.mjs --check`, `node scripts/build_story_data.mjs --check`, `node scripts/storydata_test.mjs`, `node scripts/story_similarity_test.mjs` en de overige tests met gewone `node` zijn groen; zie de commit voor de uitslag. Niet in beeld bekeken in het spel zelf (alleen tekst gewijzigd; de Electron-verhaaltest draait de coördinator bij de release).
