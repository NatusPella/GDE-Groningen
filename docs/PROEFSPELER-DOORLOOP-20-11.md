# Proefspeler-doorloop van het hele verhaal, 20-11

Doel: de eigenaar speelt om 13:00 met drie vrienden. Zoek de plekken waar een mens vastzit. Bron: de proefspeler ([PROEFSPELER.md](PROEFSPELER.md)), seed 1, `--mens` (geen cheats, HUD-route, menselijke reactietijd), snelheid 1, op de wereld en JS van de werkbranch (stage van 20-11, daarna een schone export van `HEAD`). Issue: #955. Alle missies van de keten (M01 t/m M30; M30 is de laatste stap) zijn los gestart met de sprong van het F9-paneel, zoals de bot dat doet; de activiteiten (T1 t/m T5, A1, A2) en de epiloog (E) zijn niet gespeeld.

## Hoe te lezen

- **Gehaald:** de bot speelde de missie uit zonder cheat en zonder op te geven.
- **Geskipt:** de bot gaf op (de O-toets van een mens) omdat hij de stap niet kan halen. Elke skip is een testresultaat en staat hieronder met de oorzaak.
- **Niet bereikt:** de bot haalde de tijdgrens van 600 s (of een run eindigde) zonder af te maken.
- **Mens vastgelopen?** Mijn schatting of een speler hier vermoedelijk blijft hangen. Wat de bot niet kan (een heli landen, een stoomtrein rijden, een sloep sturen) is daarmee nog geen spelbug.
- Beelden staan in `docs/img/qa/955-*` en in de runmappen onder `desktop/build/p2011` (niet in git).

## Wat gerepareerd is (met test)

| Missie | Bug | Fix | Test |
| --- | --- | --- | --- |
| M20 | De noordwal lag aan de overkant van een brede gracht: 790 m lopen om voor 60 m hemelsbreed; de looproute eindigde 52 m ervoor. | Doel naar de oever aan de kant van de westwal (76 m lopen). Beeld: `955-m20-noordwal-na-nadering.png`, `955-m20-noordwal-na-doel.png` (de houdring licht op, de stap loopt door). | `scripts/m20_oever_test.mjs` |
| M18 | "Naar de serverkamer" hing 25 m voor het doel: de serverkamer lag 23 m achter de glasgevel (147 m omlopen) en de speler staat na de intake bij de ingang aan de andere kant. De uitgang lag ook achter het pand. | Serverkamer en uitgang aan de ingangskant. M18 loopt daarna klaar (beeld `955-m18-serverkamer-na.png`). | `scripts/m20_oever_test.mjs`, `scripts/missieplek_test.mjs` |
| M30 | Bolwerk 1 en 3 werden door `roadSpot` 36 m en 30 m naar het dichtstbijzijnde pad geschoven, aan de overkant van de gracht: 930 m lopen van de brug naar bolwerk 1 voor 117 m hemelsbreed. `bourtange_test` keurde alleen de ongeschoven plekken. | Bolwerk 1 en 3 staan in `BOURTANGE_RAUW` (`snap: null`): ze staan op de gemeten plek (339 m lopen). | `scripts/m30_bolwerk_test.mjs` (lost de punten op zoals het spel) |
| M13 | Twee NaN-geometrieen bij de start (de kabelrollen van de containerterminal kregen het hele rolobject als straal). De verhaaltest zou hierop falen. | Straal `r.r`. | `scripts/containerplan_test.mjs` |

Bot-artefacten die ik in de bot (en een in de spel-API voor de bot) repareerde:

- `playerapi.js`: `hud.prompt` las een verouderde selector. Winkeldeur en stroomkast werden daardoor niet herkend (M05 en M06 liepen vast). Het leest nu de wereldprompt van het nieuwe HUD.
- `bot.page.js`: houdt E vast bij "Houd E ingedrukt" (de stroomkast van M06) en toetert in de sloep van M17.
- `botlogic.js`: pakt een vrije fiets bij "Het is een fietsrace. Kom op je eigen fiets." (M05).
- `run.mjs`: `GDE_ELECTRON_FLAGS` geeft `--no-sandbox --in-process-gpu` mee (nodig na een pc-herstart).

## Per missie

| Missie | Uitkomst | Wat er gebeurde | Mens vastgelopen? |
| --- | --- | --- | --- |
| M01 Nul krassen, vijftienhonderd punten | gehaald (151 s) | Geen bijzonderheden. | nee |
| M02 Even pinnen | gehaald (532 s) | Eerste poging mislukt: de politie klemt de auto in. Twee keer 30 s vast met de auto tegen een muur 16 m voor de garage-ingang (beeld `shots-M02-oog18-vast`). De tekst zegt "Spuit & Klaar", het gebouw heet "Garage Knalpot Damsterkwartier". | misschien kort; tekstverschil is verwarrend |
| M03 Het Loket | gehaald (30 s) | Geen bijzonderheden. | nee |
| M04 Kieken van boven | gehaald (56 s) | Geen bijzonderheden. | nee |
| M05 Wind tegen, beide kanten op | niet bereikt | Eerst "Koop een fiets bij Trap & Toeter" (de bot herkende de winkelprompt niet; opgelost). Daarna start de missie alleen op een fiets ("Kom op je eigen fiets", duidelijke melding). Na de fix start de race, maar de bot jat een fiets en wordt opgepakt. | nee: de eis en de hint zijn duidelijk |
| M06 Het museum stond er al zo | niet bereikt | Eerst skip (E vasthouden, opgelost). Daarna loopt de stroomkast ("Camera's op herhaling"), de bot haalt de sluipstap niet ("Nou zien ze ons wel") en loopt tegen de 600 s. | onzeker; de sluipstap is een bot-gat |
| M07 Al het vet van Grunn | gehaald (702 s) | Lange achtervolging, de brug gaat open. | nee |
| M08 Fatbikes tellen niet als fiets | gehaald (180 s) | Geen bijzonderheden. | nee |
| M09 Heel aankomen is ook een kunst | niet bereikt (tijd, 700 s) | Lange rit van meerdere kilometers over de wierdepaden met kratten. De "Stop even op de wierde" telt als stilstand (150 s) maar is een bedoelde stap. Geen blokkade. | nee (lang, geen vastloper) |
| M10 Een trekker-limo op de wierde | gehaald (400 s) | Geen bijzonderheden. | nee |
| M11 Geleend van de Friezen | niet bereikt | Drie keer "het skûtsje is weg" (afstand 150 tot 260 m, het skûtsje vaart 7 m/s, de rubberboot haalt 16 m/s). De bot stuurt de rubberboot niet goed genoeg. | onzeker; theoretisch haalbaar |
| M12 Het staat niet in het rooster | **geskipt** | De bot kan de heli niet landen ("Spoedje: land op de H van het UMCG", 930 m). Het bot-gat is bekend. De stap zelf werkt (de heli vliegt met Dijkstra, de prompt is duidelijk). | nee (alleen bot) |
| M13 Het containerlabyrint | gehaald (187 s) | NaN-geometrie bij de start, gerepareerd. | nee |
| M14 De dijk | niet bereikt | De bot rijdt 2,5 km en stopt dan bij "De kade houdt je tegen" op de Hogelandsterweg bij Holwierde (20200, -16226), 5,5 km voor het doel. Zes keer 30 s vast. De weg heeft daar water op de rijbaan (8 m, 3 m voor de bot) en is een weg met `z`, geen herkende brug. Zie hieronder. | **verdacht, handmatig controleren** |
| M15 Laag over het graan | gehaald (443 s) | De eerste run eindigde door de tijdgrens van de run; de tweede haalde alle poorten. | nee |
| M16 Nog eentje dan | niet bereikt | De bot rijdt in een auto door een te-voet-missie (drie tenten, de menigte duwt) en haalt drie keer de tijd niet ("tijd op"). Het HUD toont een racetimer met "Controlepunt 1/3". | onzeker |
| M17 Open, dicht | niet bereikt | De bot krijgt de sloep niet vooruit ("klem", snelheid ~1 m/s bij de start) en de bruggen draaien te laat open. HUD: 13,2 km voor 1,2 km hemelsbreed. Toeteren helpt niet voor een stilstaande boot. | onzeker; de routelengte van 13,2 km verdient een blik |
| M18 Wie draaide de camera's uit? | gehaald na fix (65 s) | Voor de fix 280 s vast 25 m voor "Naar de serverkamer". | nee (gerepareerd) |
| M19 Stoom | **geskipt** | De bot zit in de cabine en drukt nooit W (de bot rijdt geen trein). De cabine toont het bedieningspaneel en de hendel; de stap zelf lijkt goed. Beeld: `shots-M19-oog42-vast`. Na de sprong naar M20 bleef de speler in de cabine zitten (alleen bij de F9-sprong). | nee (alleen bot) |
| M20 Het beleg van Bourtange | gerepareerd, beeld gezien; niet door de bot uitgespeeld | De nieuwe noordwal en de houdring staan in de beelden hierboven (via de sprong, op de plek gezet: de stap loopt door naar de houdstap). Twee keer kwam de bot niet bij de startmarker: eerst vast bij een hoek aan de Kazernestraat (35 m), later 250 m ten westen van het fort, waar hij weigert een water-oversteek van een fietspad (rood, over de sloot bij Atalanta) te nemen. Een mens zwemt daar door; de bot niet. | onzeker: de oversteek bij Atalanta is mogelijk een brug zonder dek in de data |
| M21 Iedereen heeft een rode auto gezien | gehaald (151 s) | Geen bijzonderheden. | nee |
| M22 Een luik erin | niet bereikt | Stap 4/9 "Stap in de Escapade": de Escapade staat 99 tot 150 m weg. De bot stapt 331 keer in een andere auto in plaats van naar de marker te lopen (bot-lus). | nee: een mens loopt naar de marker |
| M23 De colonne | niet bereikt | Dezelfde bot-lus, 85 m van de Escapade. | nee |
| M24 Er hangt iets Fries aan d'Olle Grieze | gehaald (199 s) | Geen bijzonderheden. | nee |
| M25 Het bod viel tegen | gehaald (47 s) | Geen bijzonderheden. | nee |
| M26 Ontzet, net als in 1672 | niet bereikt | Bakstap op de Grote Markt: de bot fietst tegen een muur (de melding zegt "stap af en loop met je fiets door de kramen"). HUD-route 170 m voor 95 m hemelsbreed. | onzeker; de fietsmelding is de enige hint |
| M27 Inpakken | gehaald (135 s) | Geen bijzonderheden. | nee |
| M28 De wisselwoning | niet bereikt | De bot staat bij de bestuurdersdeur (de prompt "E Instappen" staat in beeld) en drukt niet op E: bot-artefact (te veel pogingen eerder in dezelfde run). | nee |
| M29 Terug | gehaald (56 s) | Geen bijzonderheden. | nee |
| M30 Het proefbeleg | niet bereikt (twee runs, voor en na de fix) | De bot haalt de gracht en de ophaalbrug, en loopt dan vast op de Batterijenstraat 60 m voor bolwerk 1 (op een fiets, "De kade houdt je tegen"). Na de fix staat bolwerk 1 op de gemeten plek: het loopt 339 m om (ruim 3x de hemelsbreedte) en het HUD toont geen routelijn (beeld `shots-M30-oog16-vast`: de lichtbundel staat aan de overkant van de gracht). Alleen de looptest `m30_bolwerk_test` bewijst dat het te voet kan. | onzeker: handmatig controleren van de brug naar bolwerk 1 |

## M14: de kade op de Hogelandsterweg

De auto van de bot (met een lekke band, 1 m/s) stopt bij `(20202, -16226)` met "De kade houdt je tegen. Rustig aan bij het water." De tegels zeggen: de weg `Hogelandsterweg` (`major`) loopt daar over ongeveer 8 m water (`isInWater` is waar van 3 tot 9 m voor het punt, de hartlijn zelf ligt in het water), de hoogte van de weg (`z`) is daar 0,00 en `isOnBridge` is nergens waar. Er ligt dus geen brug of duiker in de data: de weg kruist een sloot gelijkvloers. `guardWaterEdge` houdt een langzame auto tegen; een snellere auto valt in de plons (`startVehicleFall`), want `waterPolyAt` is alleen droog voor `z > 1,5` of op een brug. Het wegen-veto van `overOpenWater` helpt hier niet (de hartlijn ligt in het water, en wegen met een `z`-reeks worden overgeslagen). Ik heb dit in het spel zelf niet kunnen herhalen (mijn meetscript kreeg de testauto niet aan het rijden); het bewijs is de run van de bot en de tegeldata. Controleer met de hand: rij vanuit het westen over de Hogelandsterweg bij Holwierde. Voorstel: de brug in de wereldbouw markeren (het OSM-deel heeft vermoedelijk een duiker of brug zonder `bridge=yes`), of `onCarRoad` laten gelden voor een weg die aan beide kanten binnen 15 m droog weer begint. Niet aangepast: dit raakt de rijfysica en de wereldbouw vlak voor de speelsessie. Dit is de enige verdachte plek waar een mens hard kan vastzitten of zinken tijdens een missie.

## Aanbeveling: audit op wegen zonder brug

Twee plekken (M14 bij Holwierde, M20 bij Atalanta) tonen hetzelfde patroon: een weg of fietspad dat een waterpolygoon kruist zonder brug in de data. Voor een voetganger is dat zwemmen; voor een auto is het een muur of een plons. Een audit over de provincie (wegen met de hartlijn in water, zonder bridge-vlag en met een hoogte rond 0) zou de rest vinden; die is niet gedraaid.

## Open punten voor een mens (13:00)

1. M14: rij de Hogelandsterweg bij Holwierde (zie boven). Een auto kan daar stoppen of zinken.
2. M17: controleer de sloep (de HUD toont 13,2 km voor een route van 1,2 km) en de eerste vier bruggen.
3. M26: de bakstap op de Grote Markt met een fiets (loop met je fiets).
4. M16: de menigte van de tenten (te voet; de race-HUD met "Controlepunt 1/3" staat erbij).
5. M02: de garage-tekst ("Spuit & Klaar") past niet bij "Garage Knalpot".
6. M30: loop van de ophaalbrug naar bolwerk 1 (339 m, geen routelijn in het HUD).
7. M20: de oversteek van het fietspad bij Atalanta (west van het fort), mogelijk een brug zonder dek.

## Niet bekeken

M12 (heli landen), M19 (trein rijden), M11 (de sprong aan boord), de sluipstap van M06, de activiteiten en de epiloog. Alle beelden en logs staan onder `desktop/build/p2011` (niet in git); de samenvatting per run is `events.jsonl` en `run.log`.
