# Perfect-ronde 22-11, scope opening en eindkaarten

Stand van de perfect-ronde voor de randen van het verhaal: de opening (filmstaging C00.1 tot C00.3), de titelkaart, het laadscherm, de eindkaarten van missies, de overgangsscènes en telefoontjes (O1 tot O12, #1125), de recapkaart bij laden en de ontbrekende Aanwijzingen (#1122), de aftitels en de credits. Branch `perfect-opening-eindkaarten-22-11`, worktree gelijknamig, uitgaande van `origin/main` (519ff048d). Eigenaarsbesluit: het nieuwe verhaal moet helemaal perfect; beslissingen zelf genomen, de eigenaar mag achteraf vetoën. Verhaalissue: #1121.

**Niets hieronder is in beeld of gehoor gezien.** Geen Electron, geen build, geen luistertest (de machine is krap, een perf-meting loopt). Alles is statisch en met node-tests getoetst; alles wat beeld of geluid raakt staat als "nog niet bekeken" tot de sweep van de coördinator.

**Paneel.** In deze run waren geen subagents beschikbaar voor het humorpaneel van drie beoordelaars. De drie lenzen (Gronings-droog, absurd, warm) heb ik zelf langs de regels gelegd. Uitkomst: er is **geen gesproken regel gewijzigd** en geen grap herschreven; de bewezen grappen (strikje, huisgenoot, meeuw met frikandel) blijven. Alleen de kaarten eromheen zijn aangepast. Een echt paneel over de overgangsscènes blijft een open punt (zie onderaan); de eigenaar kan achteraf vetoën.

## Samenvatting

| Onderdeel | Gedaan en gefixt | Open |
|---|---|---|
| Opening (C00.1, C00.2, C00.3) | 19 shots, 30 regels (15 opgenomen, 15 alleen tekst), regels-validatie groen; 2 geluidshaken bijgebouwd; alle genoemde props bestaan in code | film staat nog achter `?openingfilm`, nooit in beeld gezien |
| Titelkaart | tekst klopt met canon (geen snackwagen, "Grunn", slogan); nu bewaakt door een test | beeld niet gezien |
| Laadscherm | tekstdieet klopt: één balk, één statusregel, geen tips; 8 laadstappen en 4 plekstappen kort en zonder punt, nu bewaakt | beeld niet gezien |
| Eindkaarten van missies | 2 echte fouten gefixt (dubbel label, afgebroken doel in 20 van 32 missie-outros) | geen bron ingekort; algemene knip op zinsgrens |
| Overgangsscènes O1 tot O12 | 12 scènes, 101 regels (59 opgenomen, 42 alleen tekst), 151 plus 47 controles groen, oude saves intact | paneel op de tekst; zie "Open" |
| Recapkaart | "Nu" houdt hele zinnen over: 21 van 67 stappen kregen een beter doel; 0 afgekapt | beeld niet gezien |
| Aanwijzingen in het pauzemenu | tab was al weg; de toast "Nieuwe aanwijzing" beloofde nog een lijst: herschreven; oud commentaar gelijkgetrokken | de data (CLUES) heeft geen plek meer in de interface (besluit 21-11) |
| Aftitels en credits | Beppe krijgt een naamkaart (nu 10 namenkaarten met personages), de verzoening krijgt een terugblikkaart (nu 8); alleen handles | handles die op een echte naam lijken: veto-vraag |

Aantallen van deze ronde: 3 gefixte fouten in code, 2 geluidshaken, 2 nieuwe kaarten in de aftitels, 1 nieuwe test (413 controles), 0 gewijzigde gesproken regels, 0 wijzigingen in `voice_wacht.json` (er is niets bijgekomen).

## Per onderdeel

### Opening (filmstaging)

Bron: [OPENING-FILMSCRIPT-21-11.md](OPENING-FILMSCRIPT-21-11.md), machinevorm `game/js/openingfilm.js`, staging `intromontage.js` (`buildShots`).

| Scène | Shots | Regels | Stand |
|---|---|---|---|
| C00.1 Koude opening (zwart, toren, fietsers, meeuw, duiven, schouder, deur) | 7 | 3 (Rikus; 2 opgenomen) | regels-validatie groen; naamkaart Tammo bij 1,0 s; gefixt: geluid van de zucht als de duif landt (`npc_sigh`) |
| C00.2 De keuken (gevel, bank, wagen, plan, thuis, huur, raam, kom) | 8 | 21 | props bestaan: bankbrief, tekening met TAM & TES, huurcontract, radio, kiosk met stikker VERKOCHT, man in blauw colbert, duif op het dak; gefixt: klap van de stikker (`deed_stamp`) |
| C00.3 Verhuisdag (toren, geld, titel, zweefvlucht) | 4 | 6 | Escapade met matras op het dak; de lekke band is een zakkende voorvoet (rol en stamp), geen apart wielmodel |

- Reachability: de film heeft geen doelcoördinaten; de plekken zijn kaartplaatsen (Martinitoren, Grote Markt, Vismarkt, Korenbloemstraat, Pleiadenlaan) met terugval op vaste punten. De film valt bij elke fout terug op de oude opening, dus een nieuwe speler krijgt altijd een opening.
- Poort en saves: M00 blijft zoals hij was; `introSeen` is per profiel; de opening opnieuw bekijken (#986) laat de speler staan waar hij stond.
- Samen spelen: de opening is lokaal en voor iedereen gelijk (`MULTIPLAYER` in `openingfilm.js`: geen poort, overslaan per speler, de zweefvlucht landt bij de lokale hoofdpersoon). Een gast ziet hem bij zijn eigen eerste start. Voortgang en beloning: geen.
- Geluid: 2 van de 6 geluidswoorden gekoppeld aan een bestaande sleutel in de centrale geluidskaart (`SFX_KOPPELING`); de meeuw (`caw`) en de telefoon (`notify`) speelden al. Open: de vleugelklap van de duiven (c1-duiven) en het sissen van de band (c3-geld) staan in `SFX_OPEN`; er is geen passend geluid in de kaart en er komt geen nieuwe audio in deze ronde.
- Muziek: `MUSIC` in `openingfilm.js` heeft 9 cues; het thema (`theme`) valt in bij de eerste kraan en wordt onder stemmen gedempt (`setThemeDuck`). Open volgens [MUZIEKLIJST-21-11.md](MUZIEKLIJST-21-11.md): C03 (keuken) en C04 (verhuisdag) ontbreken als nummer; C05 (lege vitrine) is een stilte.
- Canon-controle: Tammo en Tessa 24, net afgestudeerd, samen nul banen; de wagen is een tekening en een bijzin; de titelkaart noemt hem niet; Jelle is een silhouet; "Grunn", nooit "de Grunn". Alles bewaakt door `eindkaarten_opening_test`.
- Besluit (1): de eerste 20 minuten blijven een strakke maar niet dwingende volgorde met hints (`storydata`/`storyarc_nieuw.js`: poort, lead per stap); in deze scope niets gewijzigd.

### Titelkaart en laadscherm

- Titelkaart: `TITLE` ("GDE Groningen", "Zomer vol misdaad", slogan "Ontdek jezelf in Grunn.", "Twee afgestudeerden. Eén zomer. Nog geen plan."). Reduced motion maakt er een fade van.
- Laadscherm: besluit 21-11, één balk, geen Enter, statustekst eronder. `BOOT_STEPS` (8 stappen, 4 plekstappen `LOAD_STEPS`) en `BOOT_DONE_LABEL` ("Klaar, Grunn staat te wachten"): alle kort, geen punt. De test bewaakt dat `loadscreen.js` geen "Wist je dat" meer toont.

### Eindkaarten van missies (`bigmoment.js`)

Twee fouten gevonden door de kaart door `bouwMoment` te halen met de echte regels:

1. **Dubbel label.** `showBanner` geeft de titel `MISSIE GESLAAGD` door; die is korter dan 16 tekens en werd het grote woord, terwijl het kleine label al "Missie geslaagd" zegt. Nu is de titel gelijk aan het standaardlabel geen grote tekst meer en komt het Gronings "Mooi, dat gaait!" te staan. Een eigen korte titel ("Sikkom.") blijft.
2. **Afgekapt doel.** De kaart klemt op 14 woorden (`klemWoorden`). 20 van de 32 `outro`'s in `missions*.js` zijn langer en werden midden in een zin afgekapt met een beletselteken, waardoor "Nieuw doel: ..." (waar je nu heen moet) verdween, bijvoorbeeld bij het podium van M05. Nieuw: `kaartRegel` knipt op een zinsgrens, houdt de zin "Nieuw doel" en voegt de eerste zin toe als die erbij past.

De bronzinnen zelf zijn niet ingekort: andere werkbomen (akte 4, 5 en 6) wijzigen dezelfde bestanden, dus de algemene knip voorkomt een samenvoegconflict en dekt toekomstige outro's. Test: elke gevonden outro past in 14 woorden en eindigt niet op een beletselteken (32 stuks gevonden, 96 controles). Samen spelen: de eindkaart is lokaal per speler (`showBigMoment` filtert al op gast of deelnemer); beloning per speler (#429).

### Overgangsscènes en telefoontjes (WP2, #1125)

12 scènes in `BRIDGES` (`storyarc_nieuw.js`), 2 tot 9 regels, altijd overslaanbaar, nooit tijdens een missie, nooit na twee opeenvolgende missies. Getoetst met `storybridge_test` (151) en `verhaal_akte1_bridges_test` (47): na welke stap, welk kanaal (auto, flat, telefoon), migratie van oude saves (een speler voorbij de stap speelt de scène niet, niets verdwijnt).

| Scène | Na | Via | Regels (opgenomen/alleen tekst) |
|---|---|---|---|
| O1 Het kaartje | M02 | flat | 14 (7/7) |
| O2 Ik draai je plaat | M04 | telefoon | 9 (1/8) |
| O3 Eerlijk winnen | M06 | auto | 9 (5/4) |
| O4 Een jas | M08 | auto | 9 (7/2) |
| O5 Straks | M10 | telefoon | 8 (7/1) |
| O6 Een bod | M13 | telefoon | 8 (7/1) |
| O7 Over zaterdag | M16 | auto | 5 (2/3) |
| O8 Bewaar het | M18 | telefoon | 5 (1/4) |
| O9 Ik heb de auto | M21 | telefoon | 9 (6/3) |
| O10 De rekening | M24 | flat | 9 (5/4) |
| O11 Een eierbal | M28 | telefoon | 7 (6/1) |
| O12 Wat nu | M30 | flat | 9 (5/4) |

Gelezen op introducties vóór verwijzingen: Beppe wordt in O1 door Tammo voorgesteld en komt in N3 aan tafel; Mem belt in O4 vóór O5; Rikus is Tammo's jeugdvriend (canonblad). Geen regel gewijzigd. Samen spelen: van wie het spel opende blijft de scène, een gast ziet de ondertitels mee, voortgang per speler (#429).

### Recapkaart "Waar waren we?" (`recapcard.js`)

- Fout: bij een te lange kaart werd "Nu" altijd tot de eerste zin ingekort. Bij 21 van 67 stappen is dat een aanloopzin zonder opdracht ("Eerst de mosterd.", "Dan het bewijs.", "Wat kunnen wij eigenlijk?").
- Nu: zoveel hele zinnen als in 48 woorden passen; "waar het om draait" gaat eerst weg als dat een zin van de opdracht oplevert. Resultaat: 0 van de 67 leads wordt voor de kaart afgekapt (voorheen 21); elke kaart past in 48 woorden en eindigt op een hele zin. 2 stappen (M00, E) hebben bewust geen lead en dus geen kaart.
- Samen spelen: de kaart is lokaal voor wie Doorgaan kiest; in een sessie laden kan niet; niets gaat over het net en niets in de save.

### Aanwijzingen en hints (WP-A, #1122)

- Het tabblad Aanwijzingen en het blokje "Wat weten we?" zijn al weg (21-11); `pausemenu.js` zet een oude keuze om naar Opdrachten. De test bewaakt nu dat er geen Aanwijzingen-tab terugkomt.
- Gefixt: een toast "Nieuwe aanwijzing: ..." beloofde een lijst die er niet meer is. Nu "Opgevallen", "Onthouden" (hartkaart) of "Gronings geleerd".
- Hints blijven in de instelling "Hints en tips" (lokaal) en in de lead per stap (telefoon-regel).

### Aftitels en credits

- Namenkaarten (`CREDITS` in `story.js`): nu 10 kaarten met personages (was 9) en 10 kaarten met bronnen en makers; nieuw: **Beppe** ("zei weinig en kookte veel"). Terugblik (`TERUGBLIK`): 7 naar 8; nieuw: **Soep met een eierbal** / "Grunn en Fryslân aan één tafel" (de verzoening, F3). Alle terugblikken verwijzen naar iets dat in het verhaal gebeurt (gecontroleerd in de bron).
- Credits (`credits.js`): maker NatusPella, testers onder hun handle, geluiden onder de handle van de bron (ADR 0039). Geen echte naam van de eigenaar. De test bewaakt dat "Alexander" en "Buist" er niet in staan.
- De dedicatie (#832) is niet aangeraakt.

## Open

1. **De film staat achter `?openingfilm`** en is nooit in beeld gezien. Standaard aanzetten is een besluit na de sweep (zie [OPENING-TRAILER-BENCHMARK-21-11.md](../OPENING-TRAILER-BENCHMARK-21-11.md)); de terugval op de oude opening is er al. Eerst te beoordelen: posities van kiosk, man, duiven en bandcamera, de duivenpose en de stikker.
2. **Dagen in de vroege vulstappen kloppen niet met de wedstrijd.** De opening (en M03) zegt dat de inschrijving uiterlijk zaterdag 15 augustus om twaalf uur moet, en M03 speelt "zaterdag, tien uur". Maar de stappen N1 tot en met N4 staan in de volgorde vóór M03 en zeggen "zaterdagmiddag", "vrijdagavond" (N2, na een zaterdag), "zondagmiddag" en "maandagochtend". Dat is geen eenvoudige tekstfix (opgenomen regels, volgorde en saves). Voorstel: de dagwoorden in de regie en de lead van N1 tot en met N4 vervangen door neutrale tijdsaanduidingen, of die stappen na M03 zetten met `added`-migratie. Niet gedaan: hoort bij de akte 1-ronde.
3. **Eén canonbreuk die ik niet heb opgelost:** Jelles oma (Mem, Gerda) en zijn moeder (Sytske). RUGGENGRAAT zegt op regel 17 dat de eierbal-erfenis van zijn oma Mem is, op regel 23 "zijn moeder Mem (91), niet zijn oma"; de scènes (O4, O5, O6) noemen haar Mem en "zijn oma". Eigenaarsbesluit 21-11 zegt oma. De regels in de spelscènes volgen dat besluit; regel 23 van de ruggengraat is verouderd.
4. **Credits met handles die op een echte naam lijken** (`alexkramer98`, `jonathanbuist`): de grondwet staat alleen de eigenaar toe, de rest onder een handle of NatusPella. Een handle is een openbare gebruikersnaam, maar deze twee bevatten een voor- en achternaam. Veto-vraag aan de eigenaar: laten staan, of vervangen door "de playtesters".
5. **Muziek in de aftitels (C38, C40) is nog niet gekoppeld.** De lijst vraagt het titelthema (`theme`). Dat kan alleen met een eigen audio-element (het thema is na het eerste spelen "klaar") én het tijdelijk stilzetten van de radio, anders speelt G-Music eronder door. Zonder luistertest niet verantwoord. C03, C04 en C39 ontbreken als nummer: open punt.
6. **Het paneel voor de overgangsscènes.** O8 heeft twee keer de discretiegrap ("Dat heb je niet van mij" en "Ik heb dit niet gezegd"); de eerste mag weg. De bron staat in `09-script-akte4.md` (generated `script.json`, andere werkbomen wijzigen die ook), dus niet aangeraakt. Idem O1: "…Het was er al." is cryptisch zonder het kaartje in beeld.
7. **Termen in de opening:** Tessa zegt drie keer "frietwagen" (opgenomen) en Tammo eenmaal "snackwagen" (nieuw). De canon wil "snackwagen"; de opgenomen regels laten we staan tot de TTS-ronde.
8. **Nog niet bekeken** (geen beeld of geluid): alle kaarten (eind-, recap-, titel-, aftitel-), de twee nieuwe geluiden, de toast, de film zelf.

## Toetsen

`eindkaarten_opening_test` (413, nieuw), `bigmoment_test` (99), `recapcard_test` (52), `endcardimpact_test` (50), `openingfilm_test`, `openingstart_test` (54), `openingtempo_test` (10), `storybridge_test` (151), `verhaal_akte1_bridges_test` (47), `credits_test` (53), `loadlogic_test`, `muziekdekking_test` (558), `sfx_audit_test` (188), `sfx_haken_test` (174), `introduction_test` (16): groen. Verder `cutscene_lint --strict` (0), `voice_coverage` (3494/3494), `spec_check` (0 fouten), `docs_index_test`, `lineendings_test`, `text_audit` (0), `undef_check` (0), `import_cycles_test` (0), `naamtaal_check` (0). `rules_audit`: zie de comment op #1121.
