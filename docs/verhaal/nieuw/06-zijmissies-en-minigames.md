# 06 · Zijmissies, minigames en open-wereldactiviteiten

Hoort bij [00-OVERZICHT.md](00-OVERZICHT.md). Alleen verzonnen namen (geen echte merken, bedrijven of personen). Gevoelige onderwerpen volgen AGENTS.md en [../../PROVINCIE-VERHAAL.md](../../PROVINCIE-VERHAAL.md) §8: gaswinning alleen via "Delfstof Noord", stil en zacht; Tessa-onveiligheid alleen met het geverifieerde cijfer uit [../../TESSA-CIJFERS.md](../../TESSA-CIJFERS.md); geen grappen over asielzoekers/Ter Apel, patiënten of jeugdzorgkinderen.

**Kolommen.** *Hergebruik* = bestaand bestand/mechaniek (gecontroleerd in `game/js`), anders "nieuw". *Maat* = S (dagen), M (een week), L (meerdere weken) bouwwerk. *Essentieel?* = nodig om de 4+ uur te halen (zie onder de tabel).

## Rangtabel per regio (rang = verhouding leuk/lokaal/meme tegen kosten)

| Rang | Titel | Regio | Hergebruik (bestand) | Wat maakt het leuk, lokaal of meme-baar | Band met het hoofdverhaal | Maat | Essentieel? |
|---|---|---|---|---|---|---|---|
| 1 | **Fjord Frituur-dienst** | alle regio's (na M22) | `pg_foodtruck.js` (bakken en serveren), `economy.js` `FJORD_DAY_PAY` | je eigen frietwagen, rij met een wachtrij; "de rij loopt tot de Korenbeurs" | de wagen uit M22; na de finale het bedrijf | S (bestaat) | nee, wel de beste herspeelbaarheid |
| 2 | **Meeuw te slim af** (meeuwenmechaniek) | Stad, Wad | `pigeonmode.js` (`summonDiveGull`, "Meeuw te slim af") | de meeuw steelt je frikandel; jij bent de duif of de meeuw; Sikkom-waardig | Bert (M04); Tammo's duivengave | S | nee |
| 3 | **Het Loket** (bijbaan) | Stad, daarna elke regio | `sidejob_rechtbank.js`, `sidejobkit.js`, `sidejobs.js` | formulier 7B, "Loket B is vandaag Loket C"; de grap die iedereen herkent | M03 (hoofdverhaal) als instap | S | ja, als terugkerende bijbaan (past bij M03) |
| 4 | **Botsauto's en kermiscircuit** | Stad, Winschoten, Uithuizen | `kermis.js` | Durk en Douwe in de volgende auto; grijpautomaat, schiettent | M16 | S | nee |
| 5 | **Carbid schieten** | elk dorp | `carbid.js` | de hardste knal van de provincie; dorpswedstrijd | los | S (bestaat) | nee |
| 6 | **Fierljepwedstrijd** | Stad, Veenkoloniën, Westerwolde | `fierljep.js`, `pg_fierljep.js` | Friezen over een sloot; de plons als beloning | M10, M20 (Jelle en D&D) | S (bestaat) | nee |
| 7 | **Streekbus** (bijbaan, ook met museumbus) | alle regio's | `sidejob_bus.js`, `BUS_MODELS` in `vehicle.js` | dienstregeling, stiptheid, rare passagiers; busmuseum-bus als bonusvoertuig | T4 | S (bestaat), M (busmuseum) | ja, als vervoerskeuze in de reisbeats |
| 8 | **BOA voor een dag** | Stad | `sidejob_boa.js` | onzinnige boetes (fiets op de verkeerde plek, een duif zonder duivenbewijs); satire op regelzucht | los, of na M03 | S (bestaat) | nee |
| 9 | **Rechtbank: tas afleveren** | Stad | `sidejob_rechtbank.js` | de tas is altijd net te laat | los | S (bestaat) | nee |
| 10 | **Friese cabaret verstoren** | Stad (Stadsschouwburg) | `sidejob_cabaret.js` | Friese cabaretier, droge spot, geen kwaad | Jelle-thema | S (bestaat) | nee |
| 11 | **Taxi, bezorger, verhuizing, fietsdepot, rondvaart** | Stad, meerdere regio's | `sidejob_taxi.js`, `_bezorger.js`, `_verhuizing.js`, `_fietsdepot.js`, `_rondvaarttour.js` | bestaande bijbanen; uitbreiden naar de regio's | geld, gespreid | S per regio | nee, wel de basis van "iets te doen" |
| 12 | **Flitskoerier "Gauw Gebracht"** (verzonnen parodie, geen echte dienst) | Stad, Winschoten, Veendam | `sidejob_bezorger.js` met scooter (`SCOOTER_MODELS`) | tien minuten of het is gratis; de scooter is een Zoemzoem | los | S | nee |
| 13 | **Suikercampagne** | Stad (Hoogkerk) | `sidejobkit.js` laden, vrachtwagen (`van`) | kalender 15 sep bestaat; de lucht die naar suiker ruikt (Rikus-grap in epiloog) | epiloog | M | nee |
| 14 | **Pitch & putt** | Stad | `pitchputt.js` | zes holes bij de Concourslaan | los | S (bestaat) | nee |
| 15 | **Padel** | Stad | `padel.js` | Durk en Douwe als bezigheid | M20 (verwijzing) | S (bestaat) | nee |
| 16 | **Discgolf, skatepark, kartbaan, zwembad, klimtoren, waterski** | Stad | `discgolf.js`, `skatepark.js`, `kartbaan.js`, `zwembad.js`, `klimtoren.js`, `waterski.js` | bestaande minigames; rustpunten tussen missies | los | S (bestaan) | nee |
| 17 | **Kamerkoning** (flat leegruimen) | Stad | `sidejob_verhuizing.js` | verwarming kapot, verhuurder "De Kamerkoning"; satire op huisjesmelkers | los | S | nee |
| 18 | **OOGTV: Radio Noordkust filmt jou** | Stad | `phonefeed.js` (livestream-scene, `scene` kind 'live'), `casework.js` | verslaggever jaagt je om content; Jelmer-parodie | M01 | M | nee |
| 19 | **StudieStaat (DUO-parodie)** | Stad | `sidejobkit.js` (balie), `choicepanel.js` | studieschuld "wissen" of de kluis leegroven? Satire op een instantie, geen echte naam | los | M | nee |
| 20 | **Academiegebouw: promotie met hoedje** | Stad | `sidejob_rondvaarttour.js` (optocht) of `stuntavond.js` | plechtige optocht begeleiden of verstoren | los | M | nee |
| 21 | **Vigilantia (corps-parodie): borrel en tafelspeech** | Stad | `choicepanel.js` | tafelspeech met de verkeerde dingen zeggen | los | S | nee |
| 22 | **Helix: verfblokkade** | Stad | `missions.js` `blast`-stage | echte plek, verzonnen actie; blokkeer het plein | los | S | nee |
| 23 | **Niemeyer: AI-kamer / robotkok** | Stad | `heist.js` (kamer) | een robotkok die alleen eierballen kent; satire zonder echte bedrijven | los | S | nee |
| 24 | **Raves in "het oude Telefoonhuis"** | Stad | `stuntavond.js` | geluid regelen, hek; de eerste week van de Kiezelweek | Kiezelweek | M | nee |
| 25 | **Wolkenhal Zernike: de bewakers** | Stad | `heist.js` (bewakers, dozen) | geen sabotage, alleen dozen; Durk en Douwe als bewakers ("Wij bewaken de cloud.") | los | S | nee |
| 26 | **Wolkenhal Eemshaven** | Eemsdelta | `heist.js` | de grote grijze dozen aan de horizon; één komische scène | M13 (zijpad) | S | nee |
| 27 | **Delfstof Noord: herstelploeg** | Hogeland, Eemsdelta | `sidejob_verhuizing.js` | stil en warm: inpakken, verhuizen, terugkomen; Rikus zegt er één keer iets zonder grap; geen schurk, geen "het gasbedrijf" | zijlijn | M | nee, alleen met akkoord en zorg |
| 28 | **De Piepjager** (metaaldetector op de wierde) | Hogeland | `geheimen.js`, wandelen | Vikinggoud dat een schroef blijkt; de boer met een riek | M09 | S | nee |
| 29 | **Pieterpad bij Winsum** (wandeling) | Hogeland (Winsum) | `dorpsuitjes.js`, `geheimen.js` | palen, wandelaars, droge naamkaart; #25 | M09 (omgeving) | S | nee |
| 30 | **Pannenkoekenschip** | Waddenzee, Westerkwartier | `sidejob_rondvaart.js` | een schip waar je pannenkoeken bezorgt; #25 | los | S | nee |
| 31 | **Wadlopen en sterren kijken** | Waddenzee | `waterlevels.js` (`shallowWater`) | stilte, de Melkweg, een zeehond; geen geweld | M11 | M | nee, wel de sfeer |
| 32 | **Garnalendag in Zoutkamp** | Waddenzee | `dorpsuitjes.js` | pellen op tijd, de kleinste competitie van het noorden | los | S | nee |
| 33 | **Havenloods** (schepen binnenbrengen) | Eemsdelta, Lauwersoog | `boattypes.js` | mist en stroming; rustig gevaarlijk | M11 | M | nee |
| 34 | **Machinist** (trein besturen) | alle lijnen | `traindrive.js` | stoomtrein of dieseltreintje; #14 | M19 | M (de bijbaan), S (alleen M19) | nee |
| 35 | **Gewasspuiter** (bijbaan, klein vliegtuig) | Oldambt | nieuw (vliegtuigmodus, vgl. `heliflight.js`); start op een echte strook (AANNAME: Oostwold) | laag onder hoogspanning door; #15 | M15 | L | nee |
| 36 | **Brugwachter** (Wubbo-reeks) | Veenkoloniën | `movablebridges.js`, `pg_bruggenrace.js` | tien bruggen, één wachter | M17 | M | nee |
| 37 | **Brommer met versnellingen** | Oldambt, Veenkoloniën | `motomodels.js` (`GEARED_MOPED_MODEL`), `vehicle.js` | Pruttelaar op het dorp | los | S | nee |
| 38 | **Trekkertrek** | Westerkwartier, Hogeland | `racers.js` met trekkerprofiel (nieuw), `TRACTOR_MODEL` | tunen, trekken, winnen; de baan vol zwarte rook | M22 | M | nee |
| 39 | **Balen rapen / aardappelen rooien** | Hogeland, Veenkoloniën | `sidejobkit.js` | tegen de regen of tegen de buurman | los | S | nee |
| 40 | **Kerkenpad en wierden** | Hogeland, Westerkwartier | `dorpsuitjes.js`, `geheimen.js` | stempelkaart; bij honderd een orgelconcert in Stad | los | M | nee |
| 41 | **Carillon in de Martinitoren** | Stad | `klimtoren.js` | bekende deuntjes bespelen; #55 | M24 (kijk naar boven) | S | nee |
| 42 | **Bernard (de man met het karretje)** | Stad | `choicepanel.js` | verzonnen herkenbare figuur, respectvol, kleine zijmissie | los | S | nee |
| 43 | **Bedum straatgangs** | Hogeland | `choicepanel.js` | droge dialoog, geen geweld | los | S | nee |
| 44 | **"Een avond uit": Tessa voelt zich onveilig** | Stad | `choicepanel.js` (korte scène) | geen actie. Eén getal met bron: "Bijna de helft van de vrouwen (48%) voelt zich weleens onveilig. Bij mannen is dat ruim een kwart (26%). Bron: CBS Veiligheidsmonitor 2025." | los, ernst en zorg | S | nee |
| 45 | **Woeste Hoeve** (geheim) | Veenkoloniën | `geheimen.js` | sfeerplek met een geheim | los | S | nee |
| 46 | **Jeugdinstituut: het poortje en Kliniek Van der Meden** | Stad | `choicepanel.js` | droog en menselijk, geen spot met jongeren of patiënten; pas na bijzonder zorgvuldig lezen | later | S | nee, uitgesteld |

## Wat valt af (duplicaten en overbodig)

- Gemini-ideeën die vrijwel dezelfde achtervolging herhalen (fierljepen als achtervolging, trekker-achtervolging in drie varianten, helikopter-wraakmissie na M12, "verfblokkade" als tweede race): weggelaten; de bestaande missies dekken ze.
- Echte merken en bedrijven in de Gemini-lijst: weggelaten.
- Gevoelige onderwerpen die niet in de hoofdlijn passen (Ter Apel-opvang, patiënten als grap): niet gebruikt.

## Welke zijn essentieel voor 4+ uur?

De hoofdlijn (26 missies plus vier reisbeats in de vijf akten, en daarna Deel 4 met M27-M30 en T5) komt op ca. 4:37 (zie 00-OVERZICHT, bandbreedte 4:00-5:10). **Niets uit deze lijst is strikt nodig voor 4+ uur.** Drie dingen beschermen de ondergrens van 4:00 voor spelers die snel spelen:
1. **Het Loket als bijbaan** (rang 3): vult Stad aan zonder nieuwe code.
2. **De streekbus en museumbus** (rang 7): de reisbeats gaan er via, en reizen is inhoud.
3. **De Fjord Frituur-dienst** (rang 1): na M22 beschikbaar, de beloning van het bezit.

Voor 6+ uur (vrij spel, verzamelen): rangen 2, 4, 6, 8-11, 28-40.
