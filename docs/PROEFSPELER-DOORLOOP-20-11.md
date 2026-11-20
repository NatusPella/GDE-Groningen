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
| M02 Even pinnen | gehaald (532 s) | Eerste poging mislukt: de politie klemt de auto in. Twee keer 30 s vast met de auto tegen een muur 16 m voor de garage-ingang (beeld `shots-M02-oog18-vast`). De muur is een huis in de Moeskersgang waar de bot tegenaan stuurde. De regelkaart noemde "Spuit & Klaar", het gebouw heet "Garage Knalpot": tekst gefixt in het vervolg. | misschien kort; tekstverschil is verwarrend |
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
| M14 De dijk | niet bereikt (bot-fout) | De bot rijdt 2,5 km, stuurt dan dwars het talud van de dijk af en wordt door de kade tegengehouden (`De kade houdt je tegen`) op `(20202, -16226)`, 5,5 km voor het doel. Mijn eerste hypothese (een weg zonder brug) klopte niet: de hartlijn van de weg is droog, de sloot loopt er 6 tot 9 m naast (zie Vervolg, punt 1). | nee |
| M15 Laag over het graan | gehaald (443 s) | De eerste run eindigde door de tijdgrens van de run; de tweede haalde alle poorten. | nee |
| M16 Nog eentje dan | niet bereikt | De bot rijdt in een auto door een te-voet-missie (drie tenten, de menigte duwt) en haalt drie keer de tijd niet ("tijd op"). Het HUD toont een racetimer met "Controlepunt 1/3". | onzeker |
| M17 Open, dicht | niet bereikt; daarna gefixt | De bot krijgt de sloep niet vooruit en de bruggen draaien te laat open. HUD: 13,2 km voor 1,2 km hemelsbreed. Het vervolg vond twee echte fouten (te krappe etappelimieten en een ontbrekende tak van het vaarnet bij brug 1), zie Vervolg, punt 3. | nee, na de fix van het vervolg |
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

## M14 en de weg zonder brug: ingetrokken

In de eerste versie van dit document stond een verdachte plek op de Hogelandsterweg bij Holwierde (een weg door een sloot zonder brug). Dat was een meetfout van mij: ik trok de rijrichting van de bot door als wegverloop, en de natte punten lagen 7 m naast de hartlijn, in de sloot langs de dijk. Het vervolg (punt 1 hieronder) mat op de hartlijn zelf: droog. M14 is dus geen spelbug. Een audit over de provincie op wegen waarvan de hartlijn wel door water loopt zonder brug draait apart (resultaat: zie onder "Audit wegen zonder brug").

## Audit wegen zonder brug

AUDIT_PLAATSHOUDER

## Open punten voor een mens (13:00)

1. M17: controleer de sloep na de fix van het vervolg (etappelimieten en de tak van het vaarnet bij brug 1).
2. M26: de bakstap op de Grote Markt met een fiets (loop met je fiets).
3. M16: de menigte van de tenten (te voet; de race-HUD met "Controlepunt 1/3" staat erbij).
4. M30: loop van de ophaalbrug naar bolwerk 1 (339 m, geen routelijn in het HUD).
5. M20: de oversteek van het fietspad bij Atalanta (west van het fort), mogelijk een brug zonder dek.

## Niet bekeken

M12 (heli landen), M19 (trein rijden), M11 (de sprong aan boord), de sluipstap van M06, de activiteiten en de epiloog. Alle beelden en logs staan onder `desktop/build/p2011` (niet in git); de samenvatting per run is `events.jsonl` en `run.log`.

## Vervolg (20-11, voor 13:00)

Per punt: gezien, gefixt of open. Gemeten op de echte tegels en met de echte botenfysica (geen Electron; losse meetscripts, niet in git).

1. **M14 De dijk: gezien, geen spelbug.** De Hogelandsterweg bij Holwierde is droog: de hartlijn heeft op elke 2 m geen water (`overOpenWater` overal onwaar), de weg ligt op een dijk (hoogte `z` zakt van 3,2 naar 0 m). De sloot (de `vaart`) loopt 6 tot 9 m ten zuiden van de rand van de weg, evenwijdig. De bot stond op `(20202, -16226)`, 7 m naast de hartlijn, en reed dwars het talud af naar de sloot: `guardWaterEdge` deed dus zijn werk. De route over de weg (roadnet, 10,7 km van start tot sluis) heeft nergens water op de rijbaan; de natte punten op de route liggen allemaal op een brug (Kustweg, Oosterveldweg, Nieuwstad). Mijn eerdere hypothese (gelijkvloerse kruising) klopte niet: dat kwam door het punt van de bot, niet door de weg. Niets aangepast.
2. **M11 Geleend van de Friezen: gezien, haalbaar.** Met een scripted stuurman en `drivePlayerBoat` (rubberboot, top 16 m/s, versnelling 5): 15 m/s na 5 s, het skûtsje (7 m/s, 140 m voorsprong, 180 m hemelsbreed bij de start) is na 25 s langszij en aan boord (9 m, 2,5 s vast), zonder één botsing. Timer (240 s) en ontsnappingsafstand (420 m) hebben veel ruimte. Alleen invliegen en niet afremmen kost de aanhaak (de vasthoudtijd loopt terug): dat is de spanning. Het "het skûtsje is weg" van de bot is een stuurprobleem van de bot. Niets aangepast.
3. **M17 Open, dicht: gefixt, twee echte fouten.** (a) De etappelimiet van de eerste etappe was 105 s voor 1,19 km (de sloep haalt 11 m/s: 107 s zonder één brug of bocht). Een mens kon die etappe niet halen ("de bruggen draaiden te laat open"). De limieten zijn nu 190/130/130/100 s en de totaaltijd 600 s (was 420). (b) Het vaarnet liep dood bij `(19418, 17603)`, vlak voorbij brug 1: er ontbrak een tak naar `(19483, 17403)`; de HUD-route voor de sloep was daardoor 13,3 km (vanaf de kade eerst naar het zuidwesten). De tak (210 m, klasse 3) staat nu in `game/vaarnet.json`; de route is 1.187 m. De sloep zelf zat niet vast (9,8 m/s na 5 s, geen botsing). `boat_land_test` dekt beide. Let op: de generator (`scripts/world/vaarnet_graph.mjs`) is niet opnieuw gedraaid (geen `data/cache` hier); bij een nieuwe vaarnet-bouw verdwijnt de handmatige tak als het gat er dan nog is: kijk dan in `scripts/world/vaarnet.mjs --gaps`.
4. **M02 Even pinnen: gezien, tekst gefixt.** De garage is te bereiken (het beeld `shots-M02-oog20-doel` toont de auto in de garage, hij wordt wit gespoten). De muur 16 m ervoor (`shots-M02-oog18-vast`) is een huis in de Moeskersgang waar de bot tegenaan stuurde, geen blokkade van de garage. "Spuit & Klaar" is in het spel de lakcabine in Garage Knalpot (`garages.js`), het gebouw heet Garage Knalpot. De spreektekst en de gesproken regels laat ik staan (ingesproken); de regelkaart noemt nu "Garage Knalpot" erbij.
5. **M16 Nog eentje dan: gezien, klopt.** Het is een `checkpoint`-missie te voet (`onFoot`): de HUD "Controlepunt 1/3" is de tentenroute (drie tenten), met 100 s en 25 s erbij per tent. De wandelroute om de gebouwen heen is 414 m (rechte lijn 270 m): bij 6 tot 7 m/s ongeveer 60 s. Alle punten en menigtepunten liggen op open grond. Een mens in een auto haalt het niet beter: de missie is voor te voet bedoeld. Geen wijziging. **M26:** de melding "stap af en loop met je fiets" is een hint voor fietsers op de Grote Markt op marktdag (di/vr/za 8 tot 18 uur; het Ontzet is vrijdag); de bakstap vraagt zelf te voet (`mode: 'foot'`, straal 40 m). De bot fietste, een mens loopt. Het beeld `shots-M26-oog40-vast` toont de bot op een fiets met "Terug naar de kraam" op 260 m. Geen wijziging.
6. **M05 en M06: gezien, open (nog niet door een mens gespeeld).** M05: de tijd is ruim (58 s plus 33 s per punt; de acht etappes van 115 tot 180 m kosten 20 tot 25 s bij 7 m/s, na elke etappe meer reserve), het podium is plek 1 tot 3 van 5, de rivalen krijgen een elastiek. Een eigen fiets is nodig (hint staat er). M06: na de stroomkast heb je 180 s (plus 90 s verlenging) tot de vitrine open is; de route binnen is klein (zaal 1, Entreehal, lasers, vitrine). De bot haalde de sluipstap niet in 267 s; of een mens het haalt kan ik zonder spelen niet zeggen: dit blijft open.
