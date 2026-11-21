# Ruggengraat per akte (21-11, #1123)

Naslag voor de verhaal-epic (#1121). Spec: [.specs-fire/standards/verhaal.md](../../.specs-fire/standards/verhaal.md); onderbouwing: [VERHAAL-ANALYSE-21-11.md](../VERHAAL-ANALYSE-21-11.md) hoofdstuk 6 tot en met 9 en 20. Wijkt dit af van de code, dan is dit doc de fout.

Elk blad is de toetssteen voor elke regel in de akte: past een scène niet bij de doelzin, de inzet of de lijnen, dan schrap, kort of koppel je hem. De data (`WHY` en `lead` in `game/js/storyarc_nieuw.js`) volgt dit doc; `scripts/story_spine_test.mjs` bewaakt het.

## De ene zin boven alles

*Twee net afgestudeerde, werkloze vrienden van 24 willen een frietwagen laten rijden; Tessa wil dat meer dan ze zegt, Tammo wil bij haar blijven, en Jelle Terpstra koopt Grunn op voordat het kan.*

Drie lijnen, elke scène hoort bij minstens één:

1. **De frietwagen (A-lijn).** Tessa ontdekt dat ze een frietwagen wil (vette snacks, mensen aan één luik); Tammo rijdt (zijn autoliefde). De wagen is thuisbasis en bedrijf en groeit per akte: naam en plan, recept, stek, team, standplaats, keten. De verhaalstappen leveren alleen de mijlpaal-flags `wagen:*` (WP13); de bedrijfsmechaniek hoort bij Bezit.
2. **De romance (B-lijn).** Tammo is vijf jaar stiekem verliefd, Tessa merkt iets en durft het niet te lezen. Zoet en komisch; kleine keuzes met stille flags `romantiek:*` (WP14), nooit een ander einde.
3. **Jelle (C-lijn).** Rijk, bureaucratisch, lang, arrogant, en tegelijk lief ("Foar mem"). Terugkerende rivaal, in de laatste akte de eindbaas: hij wordt verslagen met bureaucratie en vette snacks, nooit met geweld.

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
| Doel | Honderdvijftig euro verdienen en zich inschrijven voor de Noordelijke Snackprijs: de enige weg naar een standplaats voor de Fjord Frituur. |
| Tegenstander | Jelle Terpstra, die de markt opkoopt. Hij is vroeg en vaak zichtbaar: radio, een geluidsbericht, dan in persoon (M03). |
| Inzet | Tessa's droom van een thuis met wielen; Tammo blijft bij haar. |
| Wagen | Een naam, een tekening en een auto met een lekke band. Flag `wagen:naam`. |
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
| Wagen | Een recept: de vijf ingrediënten zijn het menu. Flag `wagen:menu`. |
| Kennismaken | Oma Trijntje via Tammo en een prikbord in de flat (de vijf vrienden); Geesje, Klaas via Oma; Mem krijgt een stem (twee telefoontjes) vóór M20. |
| Romantiek | De Melkweg (M11): hij kijkt, zij ziet dat hij kijkt. |
| Einde | Dijkstra's belletje; het koopboek is de haak. |

## Akte 3: Aan de Eems (vr 21 tot zo 23 augustus)

| Onderdeel | Inhoud |
|---|---|
| Doel | Jelles koopboek lezen en hem stoppen bij haven, graan en jury, terwijl ze hun eerste eigen stek leren kennen. |
| Tegenstander | Jelle in persoon, minstens twee scènes: zijn limo bij de kermis, een bedankbriefje. Hij legt zijn eigen plan uit; Tessa legt minder uit. |
| Wagen | Een stek (Lammerts kade, de kermis). Flag `wagen:stek`. |
| Kennismaken | Dijkstra (via Oma), Lammert (via Klaas), Roelfien, Geert (eerst genoemd door Tessa of Roelfien). |
| Romantiek | De kus in de botsauto; daarna doen ze alsof er niets gebeurde. |
| Einde | Durk verklapt dat Jelle met de bal naar Veendam rijdt. |

## Akte 4: Zuidwaarts (zo 23 tot wo 26 augustus)

| Onderdeel | Inhoud |
|---|---|
| Doel | De bal terughalen in Bourtange voordat Jelle hem aan zijn moeder geeft; bewijs dat hij hem al had. |
| Tegenstander | Jelle zelf op pad; zijn moeder Mem als tweede gezicht. |
| Wagen | Een team: Berend, Tinus en Wubbo helpen. Flag `wagen:team`. |
| Kennismaken | Wubbo, de accountmanager, Tinus (via Henk: "hij heeft een schuur"). |
| Romantiek | Het dieptepunt: de ruzie. De speler weet vooraf wat Tessa verbergt (Mems telefoontjes). |
| Einde | Ze zijn uit elkaar, de auto is terug, de bal is weg. |

## Akte 5: Ontzet (wo 26 tot vr 28 augustus)

| Onderdeel | Inhoud |
|---|---|
| Doel | De standplaats krijgen en het Ontzet winnen met de beste eierbal. |
| Tegenstander | Jelle in zijn eigen stad: notaris, limo, kraam. Eindbaas: verslagen met zijn eigen vergunning en een formulier in drievoud. |
| Wagen | Een luik en een standplaats. Flag `wagen:standplaats`. |
| Romantiek | Het hoogtepunt: de vijf woorden, voor iedereen. |
| Einde | De rij loopt tot de Korenbeurs. Wat nu? |

## Deel 4: Nazomer (14 tot 19 september) en daarna

Doel: de wagen laat groeien en de gemeenschap iets teruggeven. Willemien is vaste klant, Jelle bestelt een eierbal. M30 is de uitnodiging naar de open wereld: boerderij, panden, voetbal en de frietwagenketen zijn allemaal open. Flag `wagen:keten`.

## Toetsen (WP0)

- `scripts/dialogue_rhythm_test.mjs`: regels van meer dan 25 woorden, vier beurten van één spreker, scènes van één spreker, scènes van meer dan 14 regels; bestaande uitzonderingen in een lijst die alleen korter wordt.
- `scripts/introduction_test.mjs`: elk personage met meer dan één regel is aangekondigd of krijgt een naamkaart; radio en telefoon introduceren nooit.
- `scripts/story_spine_test.mjs`: elk deel heeft een waar-het-om-draait van hoogstens 30 woorden, elke stap een lead, de ruggengraat heeft een blad per akte.
