# Ruggengraat per akte (21-11, #1123)

Naslag voor de verhaal-epic (#1121). Spec: [.specs-fire/standards/verhaal.md](../../.specs-fire/standards/verhaal.md); onderbouwing: [VERHAAL-ANALYSE-21-11.md](../VERHAAL-ANALYSE-21-11.md) hoofdstuk 6 tot en met 9 en 20. Wijkt dit af van de code, dan is dit doc de fout.

Elk blad is de toetssteen voor elke regel in de akte: past een scène niet bij de doelzin, de inzet of de lijnen, dan schrap, kort of koppel je hem. De data (`WHY` en `lead` in `game/js/storyarc_nieuw.js`) volgt dit doc; `scripts/story_spine_test.mjs` bewaakt het.

## De kern (eigenaar, 21-11, tweede versie)

*Twee net afgestudeerde vrienden van 24 weten niet wat ze met hun leven moeten en zijn bang elkaar kwijt te raken. Ze proberen allerlei loopbanen en ontdekken onderweg dat ze verliefd zijn en samen kunnen werken; pas dan vallen de stukjes en willen ze samen een snackwagen met een eigen standplaats, en daar staat Jelle Terpstra voor.*

**Aanvulling eigenaar (24-11):** Tammo en Tessa zijn net afgestudeerd, al lang vrienden, en hebben hun eerste baantjes als volwassenen. De kern is een eigen plekje in de wereld en de carrière-tour; de snackwagen *Tam & Tes* komt pas laat. Jelle is de tegenspeler en krijgt een redemption (F4, O11). Femke blijft; Jelles moeder blijft onbenoemd; Gerda (Mem) is Jelles oma. Slogan: *Een zomer in Grunn. Kon minder.* In het spel opent het verhaal de vakken per akte, ook de bijbaantjes in de wereld (`unlockgate.js`, `sidejobgate.js`).

Hun doel is **niet** de snackwagen: hun doel is een plekje in de wereld vinden. De snackwagen is een verhaaltwist rond het kantelpunt (akte 4 en 5) en komt niet prominent in de marketing of in het begin van het verhaal (slogan: *Een zomer in Grunn. Kon minder.*, sinds 23-11).

Vier lijnen, elke scène hoort bij minstens één:

1. **Een plek in de wereld (A-lijn, het doel).** Tammo en Tessa zijn allebei anders en proberen verschillende carrières (de "Donald Duck-loopbaan": alle loopbanen en bijbanen van het spel langs, ook de profvoetbalcarrière). In de ene is Tammo goed, in de andere Tessa; in veel dingen kunnen ze juist niet samenwerken omdat hun vaardigheden verschillen. Ze ontdekken dat ze samen heel goed kunnen werken. Zie de carrière-tour in [VERHAAL-RELATIE-21-11.md](../VERHAAL-RELATIE-21-11.md).
2. **De romance (B-lijn).** Tammo is vijf jaar stiekem verliefd; Tessa is er een beetje blind voor maar vindt hem een leuke kerel. Zoet en komisch; kleine keuzes met stille flags `romantiek:*` (WP14), nooit een ander einde. Ze worden een stel (kantelpunt akte 4 en 5, de knuffel in M22.4, de vijf woorden en de kus in M26.7).
3. **Jelle (C-lijn).** Jelle is van de bureaucratie: regels, vergunningen en trucs zijn zijn wapen (rijk, lang, arrogant, een eikel waar je een hekel aan hebt, altijd in de weg). Tammo en Tessa zien bureaucratie als een noodzakelijk kwaad; zij investeren in mensen en relaties, en dat is hun kracht en wat uiteindelijk wint (de mensen die ze hielpen komen terug). Voor wie doet Jelle wat? De eierbal-erfenis is van zijn **oma** Mem (zij bakte hem en kreeg in 1953 niet de erkenning; hij wil die voor haar winnen, "foar mem"); het **imperium** en het succes zijn voor zijn **moeder** (onbenoemd, zonder stem en zonder scène; alleen Jelle noemt haar, O6 en J5; zij wil omzet; Jelle: "Mijn moeder wil omzet. Mijn oma wil een eierbal. Ik lever allebei."). Mem vindt dat helemaal niet nodig. De verzoening komt pas aan het eind (Dirk/Durk en Douwe, Mem). Hij wordt verslagen met zijn eigen vergunning en een warme eierbal, nooit met geweld.
4. **De snackwagen (D-lijn, de twist en daarna de endgame).** De wagen ontstaat pas als ze weten dat ze samen iets willen: Tessa houdt van snacks, Tammo van auto's en rijden (en van Tessa: hij staat elke dag naast haar in de wagen). Je moet de wagen verwerven en een standplaats veroveren; daar draait de strijd met Jelle om. De verhaalstappen leveren alleen de mijlpaal-flags `wagen:*` (WP13); de bedrijfsmechaniek (upgrades, menu, standplaatsen, AI-wagens, het snackimperium van Jelle overnemen) is de endgame van de Bezit-epic. Niets stopt: alle loopbanen, bijbanen en minigames blijven beschikbaar.

Kernkeuzes die hierbij horen (zie ook de veto-lijst):

- De bestaande plotmotor blijft (de Noordelijke Snackprijs, de Gouden Eierbal, Oma Trijntjes recept van 1953, Jelles koopronde): hij is beproefd en geeft elke akte een obstakel. Wat verschuift is de betekenis: de wagen is in akte 1 tot en met 3 hooguit een tekening die Tessa niet durft te geloven; de ontdekking is M22 (de luik in de Escapade), de standplaats het Ontzet (M26).
- Jelles verhaal: zijn oma Mem (Gerda Terpstra, 91), niet zijn moeder, is de tweede in 1953 (leeftijd klopt; Oma Trijntje won). Oma Trijntje gaf haar toen niet de erkenning; Mem krijgt die uiteindelijk. De spelling blijft "Us Mem Snacks" (de opgenomen regels zeggen het hetzelfde), de handlangers blijven Durk en Douwe.

## De naam van de wagen: Tam & Tes

Eigenaar-besluit (21-11): de wagen heet **Tam & Tes** (Tam = Tammo, Tes = Tessa), en "Fjord Frituur" is overal vervangen (proza: "de snackwagen"). De grap wordt nooit uitgelegd: de naam staat als belettering op het luik (M22.2, het juryscherm in M26, het bord in de epiloog, de kaartlaag en de standplaats van Bezit) en Henk is de enige die het merkt ("Tam. Tes." ... "Ik zeg niks. Eén koekje."; humorbeat H5-10, paneel midden). De naam komt niet prominent in de marketing of de slogan voor. Het eerdere namenpaneel (14 kandidaten, 1-1-1) is door het besluit van de eigenaar vervallen.

## Beppe (Tammo's Friese oma)

Beppe leeft in de eerdere boog en heeft een stem: haar regels zijn **Fries** (Friese spreektekst, Nederlandse ondertitel via `subtitles.js` FY, stem `Beppe` in `scripts/tts_lines_list.mjs` met Friese uitspraak). Eerste regels: O1 (zij belt: "Jonge, hast al iten?" en "Is Tessa der ek? Dan meitsje ik sop."). Haar huis en de soepbezoeken blijven tekst (beppe_visit_texts.js); die ronde heeft geen stem en blijft aan de beppe-werkstroom.

## Tempo en volgorde van akte 1 en 2 (ronde 3, plan)

Owner-feedback: akte 1 gaat te snel naar de Snackprijs en de snackwagen; akte 2 klopt maar mag langer. Uitgangspunt: eerst het zoeken naar een plekje in de wereld (carrière-tour, vrienden, de buurt, Beppe, kleine klusjes, Jelle als nuisance); de Snackprijs en de wagen komen veel later. Wat nu al is gedaan: de opening en de WHY draaien om het plekje (geen wagen als doel), de wagen-flags zijn verschoven (idee in M00, naam pas M22), de bijna-prominente Snackprijs-zinnen blijven. Gebouwd in ronde 4 (acht nieuwe activiteiten N1 tot en met N8, bestaande missie-ID's en volgorde ongewijzigd): **akte 1** vóór het Loket: N1 een klus voor Sjabbe (het vak klussen, Jelle koopt het kopieerpapier), N2 een duif op de gang (buurman Veldkamp), N3 soep bij Beppe (Fries), N4 een eerste ronde (taxi, formulieren, Jelle als nuisance met zijn gekochte stoep); **akte 2**: N8 een avond bij Oma (het prikbord, een bijna-moment), N5 de boerderij in Warffum (Tessa en de koe), N6 een dag op het water (Klaas; de ruildag in het klein), N7 de streekbus naar Winsum (Tammo bedankt de chauffeur). De Snackprijs en de wagen komen niet in deze stappen; de bestaande Loket-missie (M03) blijft op zijn plaats. Een oude save voorbij het invoegpunt speelt ze niet (ze tellen als gedaan, zonder beloning); een oude save ervoor krijgt ze te spelen (`storymigratie_test`). Ronde 5 voegt vier activiteiten toe (zelfde techniek, ook zonder beloning): **akte 2** N10 een middag op het terras (horeca: Tessa is goed, Tammo draagt het blad; de gast vraagt "Zijn jullie al samen?" en bedoelde de rekening), N11 een bezorgrondje bij Bedum (Tammo rijdt op de minuut, Tessa leest de kaart in koeien) en N12 de lijst op de koelkast (WIE KAN WAT, met een lege regel SAMEN: de voorloper van de kolom "wij vinden" in akte 3); **akte 4** N9 de nacht op een dijk bij de Dollard, na het logboek in Veendam (M18) en vóór Stoom (M19): de politie zoekt twee Stadjers, Rikus leent zijn oude busje, de sterren, een bijna-moment dat een schaap onderbreekt, zonder drama en zonder dat ze het erover hebben. De snackwagen Tam & Tes komt in geen van deze scènes voor; het busje is Rikus' busje (het busje met de antenne uit Deel 4).

## Wagen per akte (de flags)

| Akte | De wagen is... | Flag |
|---|---|---|
| 1 | een tekening op een bierviltje, nog geen plan | `wagen:idee` (M00) |
| 2 | een recept: Oma's vijf ingrediënten | `wagen:menu` (M08) |
| 3 | een plek die ze mogen gebruiken (Lammerts kade, de kermis) | `wagen:stek` (M13) |
| 4 | een team dat meehelpt | `wagen:team` (M20) |
| 5 | de ontdekking: het luik zit erin, de snackwagen | `wagen:naam` (M22), `wagen:standplaats` (M26) |
| Deel 4 | een bedrijf dat groeit (endgame) | `wagen:keten` (M30) |

## Spelersrol en wereld per akte

| Akte | Deel | Rol van de speler | Wat opengaat (poort, WP8) |
|---|---|---|---|
| 1 Moi, Grunn | `kop` | Tammo: rijden en klussen | taxi, klussen, kantoor, padel |
| 2 Het Noorden is groot | `romp` | Tessa: de boerderij; Tammo rijdt | boerderij, vracht, bezorging, horeca, water, vissen |
| 3 Aan de Eems | `staart` | beiden: panden en ondernemen | Bezit (de frietwagen als bedrijf), lucht, handhaving, kermis |
| 4 Zuidwaarts | `zuid` | Tessa speelt voetbal; Tammo regelt | voetbal en regio-reizen |
| 5 Ontzet | `ontzet` | beiden | race; de wagen rijdt |
| Deel 4 Nazomer | `nazomer` | beiden | de open wereld: boerderij, panden, voetbal, keten |

Bestaande saves houden alles wat al open was; alleen een nieuw spel begint dicht (`game/js/unlockgate.js`).

## Akte 1: Moi, Grunn (vr 14 tot ma 17 augustus)

| Onderdeel | Inhoud |
|---|---|
| Doel | Een plekje in Grunn zoeken: de eerste baantjes (de carrière-tour begint), honderdvijftig euro en een inschrijving voor de Noordelijke Snackprijs, voordat Jelle alles opkoopt. De snackwagen is hier nog geen doel. |
| Tegenstander | Jelle Terpstra, die de markt opkoopt. Hij is vroeg en vaak zichtbaar: radio, een geluidsbericht, dan in persoon (M03). |
| Inzet | Tessa's droom van een thuis met wielen; Tammo blijft bij haar. |
| Wagen | Een tekening op een bierviltje en een auto met een lekke band. Flag `wagen:idee`. |
| Kennismaken | Opening: Tammo, Tessa, Rikus (jeugdvriend van Tammo, hoorbaar). Daarna één trek per personage, aangekondigd door een ander: Berend (door Tammo), Sjabbe (door Tessa), Jelle (chat, Berend, Sjabbe), Bert (door Tammo: "de beste vriend van mijn opa"), Henk (door Berend: "mijn zwager"), Oma Trijntje (door Tammo, vroeg genoemd). |
| Romantiek | Het kaartje van de eerste studieweek in de flat; Rikus' "vijf jaar" aan Tammo; "Voor de grip". |
| Spelregel bal | Eén zin: *wie de bal heeft, zit de jury voor, en dat wil Jelle*. De rest komt later, één regel per scène. |
| Einde | De vitrine is leeg ("Tige tank! – J."): Jelle is een stap voor. |

## Akte 2: Het Noorden is groot (di 18 tot do 20 augustus)

| Onderdeel | Inhoud |
|---|---|
| Doel | Oma Trijntjes recept van 1953 redden (vet, eieren, zout, meel, mosterd), omdat ze eerlijk willen winnen. |
| Tegenstander | Jelle koopt de ingrediënten op, met een eigen telefoontje of scène per missie en een offerte ("Ik koop X voor Y"). |
| Inzet | Zonder recept en zonder Oma's vrienden geen deelname; Tessa ontdekt dat ze het zelf wil kunnen maken. |
| Wagen | Een recept: de vijf ingrediënten van Oma zijn later het menu. Flag `wagen:menu`. |
| Kennismaken | Oma Trijntje via Tammo en een prikbord in de flat (de vijf vrienden); Geesje, Klaas via Oma; Mem krijgt een stem (twee telefoontjes) vóór M20. |
| Romantiek | De Melkweg (M11): hij kijkt, zij ziet dat hij kijkt. |
| Einde | Dijkstra's belletje; het koopboek is de haak. |

## Akte 3: Aan de Eems (vr 21 tot zo 23 augustus)

| Onderdeel | Inhoud |
|---|---|
| Doel | Jelles koopboek lezen en hem stoppen bij haven, graan en jury, terwijl ze hun eerste eigen stek leren kennen. |
| Tegenstander | Jelle in persoon, minstens twee scènes: zijn limo bij de kermis, een bedankbriefje. Hij legt zijn eigen plan uit; Tessa legt minder uit. |
| Wagen | Een plek die ze mogen gebruiken (Lammerts kade, de kermis). Flag `wagen:stek`. |
| Kennismaken | Dijkstra (via Oma), Lammert (via Klaas), Roelfien, Geert (eerst genoemd door Tessa of Roelfien). |
| Romantiek | De kus in de botsauto; daarna doen ze alsof er niets gebeurde. |
| Einde | Durk verklapt dat Jelle met de bal naar Veendam rijdt. |

## Akte 4: Zuidwaarts (zo 23 tot wo 26 augustus)

| Onderdeel | Inhoud |
|---|---|
| Doel | De bal terughalen in Bourtange voordat Jelle hem aan zijn moeder geeft; bewijs dat hij hem al had. |
| Tegenstander | Jelle zelf op pad; zijn oma Mem als tweede gezicht. |
| Wagen | Een team: Berend, Tinus en Wubbo helpen bij wat ze samen gaan doen. Flag `wagen:team`. |
| Kennismaken | Wubbo, de accountmanager, Tinus (via Henk: "hij heeft een schuur"). |
| Romantiek | Het dieptepunt: de ruzie. De speler weet vooraf wat Tessa verbergt (Mems telefoontjes). |
| Einde | Ze zijn uit elkaar, de auto is terug, de bal is weg. |

## Akte 5: Ontzet (wo 26 tot vr 28 augustus)

| Onderdeel | Inhoud |
|---|---|
| Doel | De standplaats krijgen en het Ontzet winnen met de beste eierbal. |
| Tegenstander | Jelle in zijn eigen stad: notaris, limo, kraam. Eindbaas: verslagen met zijn eigen vergunning en een formulier in drievoud. |
| Wagen | De ontdekking (M22: het luik zit erin, de snackwagen) en een standplaats (M26). Flags `wagen:naam` en `wagen:standplaats`. |
| Romantiek | Het hoogtepunt: de vijf woorden, voor iedereen. |
| Einde | De rij loopt tot de Korenbeurs. Wat nu? |

## Het slot en de overgang naar het eindspel (verhaal-eind, 21-11)

Zes extra stappen (activiteiten zonder beloning, `added: true`, ID's F1 tot en met F6; scènes in `09-script-akte5.md` en `09-script-akte6.md`, `storymigratie_test` bewaakt de oude saves). Ze vullen wat de ruggengraat belooft en wat de bestaande scènes nog niet dragen: Tessa ontdekt de wagen, ze bouwen hem samen, Grunn en Fryslân worden verzoend, Jelle haalt zijn eierbal achteraan de rij en ze worden een stel. De wagen blijft tot dan toe een tekening: ook de F-stappen staan pas in akte 5.

| Stap | Waar en wanneer | Wat | Lijn | Samen spelen |
|---|---|---|---|---|
| F1 Een wagen langs de weg | zandweg bij Zuidhorn, wo 26 aug, vóór M22 | Tessa vindt een aanhanger met een luik en haalt het bierviltje van twaalf dagen terug tevoorschijn; Tammo kijkt naar de trekhaak. Ze beslist dat ze hem zelf willen maken. Opent de wereld `snackwagen` in `unlockgate.js` (akte 5). | A, D | de wereld is van wie het spel opende; een gast speelt de stap lokaal mee (J of N bij Meedoen); voortgang per speler |
| F2 De eerste bak | loods in Hoogkerk, do 27 aug, na M22 | Tammo sleutelt, Tessa bakt; de eerste eierbal drijft. Ze zien wat ze alleen niet kunnen: ze blijven bij elkaar. | A, B | idem |
| F3 Soep en eierbal | Oma's keuken, Noorderhaven, za 29 aug, na M26 | Beppe (Fries), Oma Trijntje (Gronings), Mem, Durk en Douwe in één keuken; Tammo is het compromis; soep met een eierbal wordt het menu. Groningers en Friezen verzoend. | C | idem |
| F4 Foar mem, achteraan de rij | Vismarkt, zo 30 aug, ochtend | Jelle staat zonder limo achteraan de rij; zijn vergunning om voor te dringen is ingetrokken; Tammo krijgt zijn klap niet (en wil hem niet meer); Mems mosterd van 1953 op het luik. Redemption via zijn oma, nooit met geweld. | C | idem |
| F5 Een avond voor twee | kade aan de Noorderhaven, zo 30 aug, avond | Zoet en komisch: het lijstje in Tammo's zak, waar zet ik mijn hand, "Berend telde elf seconden. Dat is officieel." Ze zijn een stel. | B | idem |
| F6 De kaart op het luik | Vismarkt, za 19 sept, na M30 en O12 | Eenenveertig rode stippen tegen één blauwe; Jelle belt: wedstrijd. De overgang naar het eindspel: het snackimperium van Jelle overnemen en de sandbox van de Bezit-epic; niets stopt. | D | idem |

De aftitelkaart (`story.js` `TERUGBLIK`) toont voor de namen acht korte terugblikgrappen (bierviltje, stoep met overeenkomst, Krolbrug, opa's horloge, één koekje, elf seconden, soep met een eierbal voor de verzoening, de duiven in de rij); in de namenkaarten staat ook Beppe. De humorbeats van de F-stappen staan als voorstel (niet door het paneel beoordeeld) in `game/storydata/humor.eind.json` en `HUMOR-KEUZELIJST.md` (HE-01 tot en met HE-08). Een oude save voorbij het invoegpunt speelt F1 tot en met F5 niet; alleen F6 volgt voor wie M30 al haalde (de overgang naar het eindspel, zonder beloning).

## Deel 4: Nazomer (14 tot 19 september) en daarna

Doel: de wagen laten groeien en de gemeenschap iets teruggeven. Willemien is vaste klant, Jelle bestelt een eierbal. M30 is de uitnodiging naar de open wereld: boerderij, panden, voetbal en de frietwagenketen zijn allemaal open. Flag `wagen:keten`.

## Toetsen (WP0)

- `scripts/dialogue_rhythm_test.mjs`: regels van meer dan 25 woorden, vier beurten van één spreker, scènes van één spreker, scènes van meer dan 14 regels; bestaande uitzonderingen in een lijst die alleen korter wordt.
- `scripts/introduction_test.mjs`: elk personage met meer dan één regel is aangekondigd of krijgt een naamkaart; radio en telefoon introduceren nooit.
- `scripts/story_spine_test.mjs`: elk deel heeft een waar-het-om-draait van hoogstens 30 woorden, elke stap een lead, de ruggengraat heeft een blad per akte.

## Akte 3 en 4: Jelle dwarsboomt, de romantiek groeit (ronde 5, gebouwd)

Zes nieuwe activiteiten (J1 tot en met J6, zonder beloning, overslaanbaar, zelfde migratie als N1 tot en met N8): **akte 3** J1 Post van de gemeente (flat, na M12), J2 Een envelop in Appingedam (na M14), J3 Koffie bij Tessa's ouders (na de kermisrit); **akte 4** J4 Een dubbele date in Veendam (na M17), J5 Een wielklem in Stadskanaal (na M18), J6 Beppe aan de deur (flat, na M19). De ruzie van M20 blijft de bodem: de stappen ervoor zijn zoet en komisch, zodat het verlies groter voelt.

- **Jelle (C-lijn):** zijn wapens zijn papier en geld, de tegenzet is Tessa die zijn papier leert lezen (J1: "Niet vechten. Lezen. Dat is erger."; J5: artikel 9 tegen zijn artikel 4a). Het formulier in drievoud van het Ontzet is zo voorbereid. J2: omkoping met gratis frikandellen; Lammert helpt wie vraagt, niet wie betaalt. J4: een betaalde tafel als voorschot.
- **Redemption-zaadje:** Durk en Douwe worden mensen (J2: Durks oma bakt ook en zegt dat een eierbal zonder zout geen eierbal is; J5: Douwe zegt Mems briefje na, "Eet wat"). In J5 draagt Jelles oma Mem hem een warme eierbal in een broodtrommel mee terwijl zijn moeder aan de telefoon omzet wil (zij is alleen te horen via Jelles helft van het gesprek). Tessa kent Mem en zegt niets.
- **Romantiek (B-lijn):** het kasboekje en het formulier "partner, huisgenoot of overig" (J1), de ouders die de afstand op de bank zien en Tammo's onvoltooide zin (de vijfde, J3), de dubbele date waar beiden zeggen dat het geen date is (J4), Beppe's "Wannear trouwe jim?" met Tammo's dagdroom van de bruiloft bij de snackwagen en "Overig." (J6). Het bewijs wordt niet uitgelegd.
- **Beppe en Douwe/Durk:** Beppe komt met soep en herhaalt haar zin uit N3 ("Hy seit neat, mar hy docht it goed."); Durk en Douwe staan in J2 en J5.
- **Samen spelen:** de stappen zijn van wie het spel opende (de wereld); Tammo en Tessa zijn de lokale hoofdpersonen, een andere speler is partner en NPC, en de voortgang is per speler.
