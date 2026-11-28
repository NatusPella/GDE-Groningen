// The story as one continuous list of steps, without acts (#1359), with what happens to every existing mission
// and activity (#1360). Data plus a few pure readers; nothing here changes how the live story (storyarc_nieuw.js,
// ARC_ID 'nieuw') runs yet: the live STEPS keep their ids, order and saves. This list is the plan the next rounds
// move the live story towards (docs/verhaal/bijbel-28-11, part 1 sections 4 and 6).
//
// Step fields
//   id        an existing step id of storyarc_nieuw.js ('M01', 'N3', ...) or a new id 'h<chapter>-<name>' (lowercase,
//             so it never clashes with an existing id)
//   ch        chapter 1..16 (the main line), 'nazomer' for the free summer after the finale
//   area      one of AREAS: where the step plays (the region of the map, see regions.js)
//   goal      one sentence in Dutch: what the player does (the HUD goal, starts with a verb)
//   fn        what the step does for the story (the diary line)
//   figure    the one new side character this step introduces, or null (every name is introduced once)
//   knows     what the player knows after this step (feeds the recap card "Waar waren we?")
//   unlocks   (optional) what opens: a career, a vehicle or a job
//   decision  (existing steps) 'keep' | 'rewrite' | 'move': what #1360 decided; new steps have none
//   voice     (existing steps) 'recorded' (the line keeps its recording) | 'silent' (rewritten: silent until the next
//             recording round, scripts/voice_wacht.json)
//
// Multiplayer (Samen spelen): the world belongs to whoever opened the game; the step progress and the reward are per
// player (#429); a guest plays along without the story conversations of another player and a moved mission never
// blocks a guest at another stage (the gate works per player). Careers are always open to joiners.
// Saves: the live order is untouched, so no save migration is needed in this round. A step that moves in the live
// story later gets the ADDED_STEPS / passedBetweenSteps treatment of storyarc.js and a test in the same commit.

export const AREAS = ['stad', 'waddenkust', 'hogeland', 'veenkolonien', 'westerkwartier', 'oldambt', 'westerwolde', 'lucht', 'provincie'];

export const CHAPTERS = {
  1: { title: 'Verhuisdag', part: 'kennismaking' },
  2: { title: 'De straat', part: 'kennismaking' },
  3: { title: 'De stad is een derde hoofdpersoon', part: 'kennismaking' },
  4: { title: 'Het eerste Noorden', part: 'kennismaking' },
  5: { title: 'Het erf', part: 'loopbaan boer' },
  6: { title: 'Het veld', part: 'loopbaan voetbal' },
  7: { title: 'De dienst', part: 'loopbaan vervoer' },
  8: { title: 'Het water', part: 'loopbaan water' },
  9: { title: 'De lucht', part: 'eigen verhaalstuk' },
  10: { title: 'De stad reageert', part: 'loopbanen verweven' },
  11: { title: 'Het recept', part: 'snackwagen en slot' },
  12: { title: 'De bal', part: 'snackwagen en slot' },
  13: { title: 'De provincie rond', part: 'snackwagen en slot' },
  14: { title: 'Zuidwaarts', part: 'snackwagen en slot' },
  15: { title: 'De wagen', part: 'snackwagen en slot' },
  16: { title: 'Het Ontzet', part: 'snackwagen en slot' },
  nazomer: { title: 'Nazomer', part: 'nazomer' },
};

// Hand-picked helper: s(id, ch, area, goal, fn, figure, knows, extra)
const s = (id, ch, area, goal, fn, figure, knows, extra = {}) => ({ id, ch, area, goal, fn, figure, knows, ...extra });
const keep = { decision: 'keep', voice: 'recorded' };
const move = { decision: 'move', voice: 'recorded' };
const rewrite = { decision: 'rewrite', voice: 'silent' };

export const STORY_STEPS = [
  // ---- H1 Verhuisdag (het eerste uur: opening, eerste overwinning, eerste bijbaan, eerste verkenning buiten de stad)
  s('M00', 1, 'stad', 'Verhuis de spullen van het studentenhuis naar de flat in Paddepoel.', 'De opening: Tammo en Tessa plagen elkaar bij de verhuizing en op de radio van Rikus klinkt Nachtstreek.', 'Rikus', 'Tammo en Tessa zijn net afgestudeerd en werkloos; de Escapade is hun enige bezit.', { ...keep, note: 'de opening zelf blijft zoals hij is (vaste film); radiospot en bord staan in h1-vismarkt' }),
  s('h1-vismarkt', 1, 'stad', 'Loop met Tessa over de Vismarkt naar het Martinikerkhof.', 'Een grap van drie seconden: een radiospot van Us Mem Snacks en een bord Vrije standplaats op de Vismarkt; Tessa zou daar wel willen staan.', null, 'Er gaat een Fries snackbedrijf rond (Us Mem Snacks) en op de Vismarkt hangt een bord Vrije standplaats, aan te vragen bij een Commissie.', {}),
  s('M01', 1, 'stad', 'Rij voor Berend zijn bakkie door de stad zonder een kras.', 'De eerste kleine overwinning en de eerste euro\'s; Berend vertelt over een Fries in een blauw colbert die contant een bakkie wilde kopen.', 'Berend', 'Rijden loont, en een onbekende Fries wil ergens contant mee betalen.', keep),
  s('N1', 1, 'stad', 'Draag de kopieermachine de trap op voor Sjabbe.', 'De eerste bijbaan: klussen, dertig euro en een man die niets vraagt.', 'Sjabbe', 'Een klus levert geld op; Sjabbe is iemand die je kunt vragen.', { ...keep, unlocks: 'klussen' }),
  s('N3', 1, 'westerkwartier', 'Breng soep naar Beppe in het Westerkwartier.', 'De eerste verkenning buiten de stad; Beppe ontmoet Tessa en zegt: Jullie zijn vrienden.', 'Beppe', 'Beppe is Tammo\'s Friese oma en haar keuken is een plek om langs te komen.', { ...keep, decision: 'keep', note: 'locatie binnen de provinciegrens' }),
  s('W1', 1, 'stad', 'Loop met Tessa na een lange dag nog een friet halen.', 'Het zaadje van Tessa\'s liefde voor snacks en van het recept (de pot mosterd van Oma, Oma\'s eierballen).', null, 'Tessa houdt van snacks en van haar oma, en Tammo en zij willen elkaar niet kwijt.', keep),

  // ---- H2 De straat
  s('N2', 2, 'stad', 'Haal de duif van de gang voor buurman Veldkamp.', 'Veldkamp als buurman; hij vraagt of ze al zijn begonnen en kondigt Bert aan.', 'Veldkamp', 'Veldkamp woont naast hen en bemoeit zich ermee.', move),
  s('h2-scooters', 2, 'stad', 'Ruim samen de scooters op van de stoep voor het huis.', 'Sander Poelman is de rivaal die ook snacks wil en ze de stoep uit pest.', 'Sander Poelman', 'Sander is een rivaal.', {}),
  s('J1', 2, 'stad', 'Lees de brief van de gemeente die bij de flat op de mat ligt.', 'De eerste bureaucratische grap: een kenmerk en een afzender, J. Terpstra, voorzitter van de Commissie Standplaatsen Noord.', 'Jelle Terpstra', 'Er bestaat een Commissie voor standplaatsen en een voorzitter die Jelle heet.', move),
  s('h2-bon', 2, 'stad', 'Ga naar Hoofdagent Wolthuis voor de parkeerbon op de Escapade.', 'Politie als komische bijrol: precies, plechtig en altijd met een artikel erbij.', 'Hilda Wolthuis', 'De politie in de wijk neemt regels heel serieus.', {}),
  s('M02', 2, 'stad', 'Pin geld bij de automaat met de hulp van Sjabbe.', 'Een kleine opdracht over geld pinnen; de loketbediende staat al klaar voor het Loket.', 'de loketbediende', 'Zonder papieren en pasjes kom je nergens.', move),
  s('N4', 2, 'stad', 'Rij een eerste taxironde met een formulier.', 'De proefrit met een taxi.', null, 'Een taxi rijden is werk.', { ...keep, unlocks: 'taxi' }),
  s('M03', 2, 'stad', 'Lever formulier 14-B in bij het Loket voor het werkbewijs.', 'Het werkbewijs, de eerste bureaucratische grap (bezwaartermijn zes weken) en een korte ontmoeting met Jelle zelf die het werkbewijs stempelt.', null, 'Jelle is bureaucraat, een standplaats is iets waarvoor iemand vecht en het werkbewijs is binnen.', { ...rewrite, unlocks: 'kantoor' }),

  // ---- H3 De stad is een derde hoofdpersoon
  s('h3-omroeper', 3, 'stad', 'Luister op de Grote Markt naar de Stadsomroeper.', 'De omroeper leest een besluit van Jelle voor en laat zien hoe de stad nieuws maakt.', 'Hayo Prins', 'Op de Grote Markt hoor je wat de Commissie besluit.', {}),
  s('h3-bert', 3, 'stad', 'Bezoek Bert en zijn duiven op het dak bij het station.', 'Bert, aangekondigd door Veldkamp, en zijn duiven geven de speler een blik op de stad van boven; hij ziet elke nacht een zwarte trekker bij het museum.', 'Bert', 'De stad heeft van boven een eigen leven, vol duiven.', {}),
  s('M05', 3, 'stad', 'Win de fietsrace en het padelduel van Sjoerd.', 'Stadsminigame: wind tegen, beide kanten op.', 'Sjoerd', 'De stad heeft sport en Sjoerd daagt iedereen uit.', { ...rewrite, unlocks: 'padel' }),
  s('N10', 3, 'stad', 'Proef een middag op het terras bij de terrasgast.', 'Horeca-proeven: eten en bedienen als eerste aanzet tot de snackwagen.', 'de terrasgast', 'Horeca is werk en lekker eten is een vak.', { ...move, unlocks: 'horeca' }),
  s('h3-kiezelweek', 3, 'stad', 'Speel de Kiezelweek van vijf jaar geleden op het Academiegebouw.', 'Een speelbare flashback: de valse start, de gedeelde pen, en Tammo ontdekt dat de Oma van de straat Tessa\'s oma is.', null, 'Tammo en Tessa werden vrienden in de Kiezelweek.', {}),
  s('N8', 3, 'stad', 'Eet een avond bij Oma Trijntje.', 'Oma Trijntje legt 1953 en de Snackprijs uit als een gerecht van vijf ingrediënten en vijf vrienden (nog geen geheim).', 'Oma Trijntje', 'Oma Trijntje won in 1953 de Snackprijs, Jelles oma werd tweede, en het prikbord heeft vijf namen.', move),

  // ---- H4 Het eerste Noorden
  s('T1', 4, 'hogeland', 'Neem de trein naar Warffum.', 'De eerste treinreis; Tessa wordt stil.', null, 'De provincie is groter dan de stad.', keep),
  s('M09', 4, 'hogeland', 'Breng de eieren van Geesje heel aan.', 'Eieren als zaadje van het recept, nog zonder uitleg.', 'Geesje', 'Eieren van het land zijn waardevol.', keep),
  s('K1', 4, 'hogeland', 'Loop over het land achter de pastorie.', 'Geesje en haar land: een rustige verkenning.', null, 'Het Noorden is wijd en rustig.', keep),
  s('T2', 4, 'waddenkust', 'Neem de streekbus naar Zoutkamp.', 'De bus brengt hen naar de kust.', null, 'Met de bus kom je overal in de provincie.', { ...keep, unlocks: 'bus' }),
  s('N6', 4, 'waddenkust', 'Hengel een dag op het water bij Klaas.', 'Een rustige dag aan het water; Klaas leert hen hengelen.', 'Klaas', 'Hengelen is een rustig vak aan het water.', { ...keep, unlocks: 'hengelen' }),
  s('N5', 4, 'waddenkust', 'Bezoek hoeve Zeldenrust bij Oom Hindrik op de Waddendijk.', 'Tessa melkt, Tammo valt in de sloot; Oom Hindrik wijst naar de dijk: Doar achter is niks meer.', 'Oom Hindrik', 'Oom Hindrik heeft een hoeve en zoekt een nieuwe boer.', rewrite),
  s('h4-aaltje', 4, 'waddenkust', 'Luister naar Tante Aaltje aan het eind van de dag.', 'Oom Hindrik gaat naar Huize Waddenzicht; Tante Aaltje zet hen op één bank: Jullie zien er goed uit.', 'Tante Aaltje', 'De provincie is open en Oom Hindriks erf zoekt een nieuwe boer.', { unlocks: 'provincie' }),

  // ---- H5 Het erf (boer)
  s('h5-notaris', 5, 'hogeland', 'Hoor bij de notaris de akte van de schenking.', 'Oom Hindrik schenkt de hoeve aan Tammo en Tessa die zijn koeien begreep; hij overlijdt niet.', 'de notaris', 'De hoeve is van hen.', {}),
  s('J3', 5, 'hogeland', 'Drink koffie bij Tessa\'s ouders in Siddeburen.', 'Tessa\'s wortels: ze komt van het platteland.', null, 'Tessa komt van een boerenfamilie.', move),
  s('h5-ypie', 5, 'hogeland', 'Help buurboer Ypie Boekema met de melkronde.', 'Ypie melkt al een week mee; de buurt helpt.', 'Ypie Boekema', 'Buren op het platteland helpen elkaar.', {}),
  s('M10', 5, 'hogeland', 'Zie hoe de zwarte trekker-limo het erf op en af rijdt.', 'Jelle overhandigt zelf een brief (Warffum in beheer) vanuit het limoraam; Durk en Douwe zitten aan het stuur.', 'Durk en Douwe', 'De zwarte limo is van Jelle, en de Commissie heeft Warffum in beheer.', { ...rewrite, unlocks: 'jelle' }),
  s('A1', 5, 'hogeland', 'Oogst de bieten bij Hoogkerk.', 'Minigame boer; Tessa herkent de eieren als Oma\'s eieren (zaadje 2).', null, 'Boeren is een loopbaan met rangen (Knecht, Pachter, Boer, Akkerbaas).', { ...keep, unlocks: 'boer' }),

  // ---- H6 Het veld (voetbal)
  s('h6-invaller', 6, 'hogeland', 'Val in bij VV De Hoek op zondag.', 'De linksbuiten van de dorpsclub ligt eruit; Eppo vraagt Tessa en de ploeg heeft haar nodig.', 'Eppo Rozema', 'Voetbal begint met een dorpsclub; Tessa kan voetballen.', {}),
  s('V1', 6, 'hogeland', 'Haal voetbalschoenen en papieren voor Tessa.', 'Tammo regelt schoenen en papieren; de handschoen blijft in zijn jaszak.', null, 'Tammo steunt Tessa vanaf de lijn.', { ...rewrite, unlocks: 'voetbal' }),
  s('V2', 6, 'veenkolonien', 'Train voor het eerst in Veendam.', 'De eerste ladderstap; Femke, de keeper, kent Tessa van het dorpsteam.', 'Femke', 'Voetbal is een ladder van dorp naar Euroborg.', rewrite),
  s('V3', 6, 'veenkolonien', 'Speel de eerste wedstrijd.', 'De eerste wedstrijd: het is jouw avond.', null, 'Voetbal heeft een eigen ladder, teams en seizoenen.', rewrite),

  // ---- H7 De dienst (vervoer, minimaal verhaal)
  s('D1', 7, 'stad', 'Stap mee in de laatste bus naar huis van Dries Oltmans.', 'Dries rijdt al dertig jaar de laatste bus naar Winsum, met zijn eigen koffiekan en een groet voor iedereen; mevrouw Wassink vraagt of ze getrouwd zijn; zijn rug protesteert.', 'Dries Oltmans', 'Dries is de vaste chauffeur van de bus naar huis en heeft last van zijn rug.', { decision: 'rewrite', voice: 'silent', note: 'nieuw live (28-11, #1375): vervangt de plan-stap h7-dries; migratie via ADDED_STEPS' }),
  s('D2', 7, 'hogeland', 'Neem bij de halte in Winsum de dienst van Dries over.', 'Dries ligt op de bank; Annemarie van de centrale belt, Tammo parkeert de bus en Tessa maakt het rooster. De loopbaan vervoer opent.', 'Annemarie', 'Vervoer heeft een rooster, Noorderspoor betaalt per dienst en iemand moet de bus rijden.', { decision: 'rewrite', voice: 'silent', unlocks: 'vervoer', note: 'nieuw live (28-11, #1375)' }),
  s('N7', 7, 'hogeland', 'Rij de streekbus naar Winsum.', 'Een eerste dienst als vervanger.', 'de buschauffeur', 'Een dienst rijden is een vak met rangen.', move),
  s('N11', 7, 'hogeland', 'Bezorg een rondje bij Bedum.', 'Bezorgrit; Tammo levert een vat vet en een zak mosterd af zonder te weten waarvoor (zaadje 3).', null, 'Tessa maakt het rooster; de Commissie bepaalt ook de lijnen.', move),
  s('D3', 7, 'provincie', 'Loop met Jochem Luiken over perron 1 van Station Groningen.', 'De stationschef laat zien dat je een trein rijdt volgens de dienstregeling; Tessa gaat mee als conducteur. De diepte zit in de eindeloze modus.', 'Jochem Luiken', 'Met de trein bouw je een eigen dienst: eerst conducteur, dan de cabine.', { decision: 'rewrite', voice: 'silent', note: 'nieuw live (28-11, #1375): vervangt h7-trein' }),

  // ---- H8 Het water
  s('Z1', 8, 'stad', 'Neem op de steiger aan de Diepenring de rondvaartboot over van Wiebe Hazenberg.', 'De schipper struikelt over zijn eigen megafoon en ligt drie weken thuis (heup, geen leed in beeld); Noor, de gids-student, staat met veertig toeristen op de steiger. Tammo vaart, Tessa vertelt: twee op één dek is een bemanning. De pet blijft aan de haak, het logboek heeft een foto van twee jonge schippers. De rondvaart is de eerste klus van het vak Water.', 'Wiebe Hazenberg', 'Water is een eigen wereld: rondvaart in de stad, met Wiebe als schipper die wegvalt.', { decision: 'rewrite', voice: 'silent', unlocks: 'water', note: 'nieuw live (28-11, #1376): vervangt de plan-stap h8-wiebe; migratie via ADDED_STEPS' }),
  s('Z2', 8, 'provincie', 'Ga naar de kade bij het Rustpunt en neem De Drie Zusters over van Lammert Veenstra.', 'Wiebes vriend Lammert gaat een week naar een bruiloft; De Drie Zusters brengt kisten voor Geesje in Warffum en zakken voor een boerderij in de buurt. Noorderspoor Water doet de papieren, Tammo vaart, Tessa plant. Het provinciespoor van de loopbaan.', 'Schipper Lammert', 'Binnenvaart is vracht door de hele provincie, met een schip dat een eigen naam heeft.', { decision: 'rewrite', voice: 'silent', unlocks: 'binnenvaart', note: 'nieuw live (28-11, #1376): vervangt de plan-stap h8-lammert' }),
  s('Z3', 8, 'waddenkust', 'Wacht bij de sluis bij Zoutkamp op Dina.', 'Bij een sluis wacht je: dat is het spel. Dina zit in het sluiswachtershuisje; de loods van Lauwersoog roept op de marifoon en Jelle laat een mededeling omroepen over een verplicht rustpunt.', 'Dina', 'Sluizen en havens zijn plekken met een eigen tempo; een zeeschip komt later.', { decision: 'rewrite', voice: 'silent', note: 'nieuw live (28-11, #1376)' }),
  s('K2', 8, 'stad', 'Ga in de ochtend naar de kade.', 'Jelle staat zelf op de kade met een klembord en weigert de aanlegplaats.', null, 'Water heeft een Commissie met een klembord.', move),
  s('h8-rubberboot', 8, 'waddenkust', 'Help de rubberboot van Klaas.', 'Opmaat naar de achtervolging van M11.', null, 'Water is er voor vracht en toerist.', {}),

  // ---- H9 De lucht
  s('M12', 9, 'lucht', 'Vlieg mee met de traumaheli.', 'De lucht als eigen verhaalstuk.', 'Dijkstra', 'De lucht is er, met een heli die hulp brengt.', { ...rewrite, unlocks: 'heli' }),
  s('M15', 9, 'lucht', 'Vlieg laag over het graan voor Roelfien.', 'Roelfien is Oma\'s nicht; het meel is een recept-ingrediënt.', 'Roelfien', 'Roelfien is Oma\'s nicht.', move),
  s('L1', 9, 'westerkwartier', 'Leer meevaren met Gerlof Hamminga op de weide bij Eelde.', 'De ballonvaarder legt uit dat je een ballon niet stuurt: de brander kiest de hoogte, de wind de richting. Hij zoekt twee handen voor de brander.', 'Gerlof Hamminga', 'In een ballon kies je alleen hoe hoog; de wind doet de rest.', { decision: 'rewrite', voice: 'silent', note: 'nieuw live (28-11, #1377): vervangt de plan-stap h9-ballon (eerste helft)' }),
  s('L2', 9, 'oldambt', 'Stijg op in de ballon boven de Dollard.', 'Jelles ballon van Us Mem Snacks hangt in de verte en hij zwaait vanuit de mand; een schaap op de landingsplek maakt het eerste bijna van Tammo en Tessa stuk.', null, 'Jelle laat zich zien en zwaait; Tammo en Tessa landen zacht.', { decision: 'rewrite', voice: 'silent', note: 'nieuw live (28-11, #1377): vervangt de plan-stap h9-ballon (tweede helft)' }),

  // ---- H10 De stad reageert
  s('h10-euroborg', 10, 'stad', 'Speel de openingswedstrijd in de Euroborg.', 'De stad kent hen; Hilbrand verslaat de wedstrijd.', 'Hilbrand', 'De Euroborg is het hoogste niveau.', {}),
  s('J4', 10, 'veenkolonien', 'Ga op een dubbele date in Veendam.', 'Femke en Rikus; dubbele friet.', null, 'Rikus en Femke horen bij hen.', move),
  s('N9', 10, 'hogeland', 'Rij door de nacht over een dijk.', 'De politie zoekt twee Stadjers in het zwart; Wijkagent Bolhuis kijkt de andere kant op.', 'Tjeerd Bolhuis', 'De wijkagent kijkt de andere kant op.', move),
  s('A2', 10, 'stad', 'Rij de kermisrit in de stad.', 'De stadskermis.', null, 'De stad viert feest.', move),
  s('N12', 10, 'stad', 'Lees de lijst op de koelkast: WIE KAN WAT.', 'De lege regel SAMEN.', null, 'Ze raakten vijf loopbanen en missen alleen iets samen.', move),
  s('J6', 10, 'westerkwartier', 'Bezoek Beppe aan de deur.', 'Beppe leeft nog: soep, de foto uit de Kiezelweek, hint 5.', null, 'Beppe is er altijd voor hen.', { decision: 'keep', voice: 'recorded', note: 'licht herschreven: Beppe leeft nog' }),
  s('h10-bestelling', 10, 'stad', 'Neem de eerste bestelling van Sander aan.', 'Sander plaatst een bestelling; de stad wint het stadsfeest.', null, 'De stad kent hen en de snackwagen komt dichterbij.', {}),

  // ---- H11 Het recept
  s('M07', 11, 'stad', 'Haal al het vet van Grunn bij elkaar.', 'Vet is een ingrediënt van Oma\'s recept.', null, 'Het recept heeft vijf ingrediënten uit hun eigen loopbanen.', move),
  s('M08', 11, 'stad', 'Haal het recept op bij Oma Trijntje.', 'Oma: Wat jullie de hele zomer droegen, is mijn recept.', null, 'Het recept is het hart van de snackwagen.', move),
  s('h11-mem', 11, 'stad', 'Lees de eerste appjes van Mem op Tessa\'s telefoon.', 'Mem appt Tessa voor het eerst; Tessa verzwijgt het, geen ruzie.', 'Mem', 'Mem is Jelles oma en geen vijand.', {}),
  s('h11-inschrijving', 11, 'stad', 'Schrijf in voor de Snackprijs.', 'Jelle stempelt zelf hun inschrijving met een kleine zucht.', null, 'De Snackprijs nadert en Jelle zit achter het loket.', {}),

  // ---- H12 De bal
  s('h12-hoving', 12, 'stad', 'Bezoek mevrouw Hoving in het museum.', 'De Gouden Eierbal staat in het museum; zij zit de jury voor.', 'Mevrouw Hoving', 'De Gouden Eierbal is te zien in het museum.', {}),
  s('M04', 12, 'stad', 'Kijk van boven naar het museum.', 'Kieken van boven: Bert is al bekend; de bal-lijn begint pas als je Oma\'s 1953 kent.', null, 'Het museum is van boven te bekijken.', move),
  s('h12-henk', 12, 'stad', 'Bouw met Henk Pol het plan.', 'Henk bouwt het plan; Tammo houdt de ladder, Tessa de plattegrond.', 'Henk Pol', 'Het plan heeft een ladder en een plattegrond.', {}),
  s('M06', 12, 'stad', 'Kraak het museum.', 'De vitrine is al leeg: Tige tank! - J.; Joost komt drie minuten te laat voor het alarm.', 'Joost Ensing', 'Jelle heeft de bal echt.', move),

  // ---- H13 De provincie rond
  s('M11', 13, 'waddenkust', 'Achtervolg de skûtsje van de Friezen.', 'Geleend van de Friezen: de achtervolging past in de provincietour.', null, 'Jelle zit in een skûtsje.', move),
  s('M13', 13, 'oldambt', 'Zoek je weg door het containerlabyrint.', 'Lammert Visser en de haven.', 'Lammert Visser', 'In de haven telt elk papier.', keep),
  s('K3', 13, 'oldambt', 'Ga in de nacht naar het havenkantoor.', 'Handhaving in het havenkantoor.', null, 'De Commissie houdt de haven in de gaten.', keep),
  s('M14', 13, 'oldambt', 'Houd de deurwaarder tegen bij zonsopgang op de dijk.', 'Jelles papier in actie.', null, 'Jelles papier is een wapen.', keep),
  s('J2', 13, 'oldambt', 'Lever een envelop af in Appingedam.', 'Jelles papier.', null, 'Jelle koopt en betaalt met papier.', keep),
  s('W2', 13, 'oldambt', 'Zoek het havenhuis voor later.', 'Een plek voor later in de haven.', null, 'Een havenhuis is een eigen plek.', keep),
  s('T3', 13, 'oldambt', 'Neem de trein naar Winschoten.', 'Past bij de kermis.', null, 'Winschoten heeft een kermis.', move),
  s('M16', 13, 'oldambt', 'Doe nog eentje dan op de kermis in Winschoten.', 'De kus in de botsauto wordt een bijna; Jelle zonnebril op met een brief in drievoud.', 'Geert', 'Jelle haat hen niet maar bestudeert hen.', rewrite),

  // ---- H14 Zuidwaarts
  s('M17', 14, 'veenkolonien', 'Open en dicht de elf bruggen voor Wubbo.', 'De mosterd is een ingrediënt.', 'Wubbo', 'Bruggen openen is een vak.', keep),
  s('M18', 14, 'westerwolde', 'Zoek wie de camera\'s uitdraaide.', 'Het logboek; consistent met de kraak in H12.', null, 'Het logboek helpt hen.', keep),
  s('J5', 14, 'veenkolonien', 'Haal de Escapade uit de wielklem in Stadskanaal.', 'Jelles papier in actie.', null, 'De Escapade zat in de klem.', keep),
  s('M19', 14, 'westerwolde', 'Rij mee met de stoomtrein voor de jury.', 'Stoomtrein als decor.', null, 'De jury is onderweg.', keep),
  s('T4', 14, 'westerwolde', 'Neem de bus naar Bourtange.', 'Tinus en Berend.', 'Tinus', 'Bourtange is de plek van het Beleg.', keep),
  s('M20', 14, 'westerwolde', 'Neem deel aan het Beleg van Bourtange.', 'Mem komt in beeld; de bal is terug; Jelle zegt: Ja, mem.', null, 'Mem is geen vijand.', keep),
  s('M21', 14, 'westerwolde', 'Haal de Escapade terug zonder ruzie.', 'Praktisch uit elkaar en de stilte wordt getoond op het perron.', null, 'Ze missen elkaar maar praten er niet over.', rewrite),

  // ---- H15 De wagen
  s('F1', 15, 'westerkwartier', 'Vind een wagen langs de weg.', 'De vondst; Tinus en zijn schuur.', null, 'Er staat een wagen.', keep),
  s('M22', 15, 'westerkwartier', 'Laat Henk het luik in de wagen bouwen.', 'De naam Tam & Tes; Tammo pandt zijn opa\'s horloge bij Sjabbe.', null, 'De wagen heet Tam & Tes en is van hen.', keep),
  s('F2', 15, 'westerkwartier', 'Maak de eerste bak in de loods in Hoogkerk.', 'Alles uit de loopbanen komt terug.', null, 'De wagen is van hen; de standplaats nog niet.', keep),

  // ---- H16 Het Ontzet
  s('M23', 16, 'stad', 'Leid de colonne naar de stad.', 'Iedereen die ze hielpen komt terug met een voertuig of hulp.', null, 'Iedereen helpt mee.', keep),
  s('M24', 16, 'stad', 'Haal de Friese vlag van d\'Olle Grieze.', 'De Torenwachter meldt het voor de derde keer.', null, 'Er hangt iets Fries aan d\'Olle Grieze.', keep),
  s('M25', 16, 'stad', 'Doe de proefronde van het recept met alle vijf.', 'Het bod viel tegen; het recept wordt echt.', null, 'Het recept is compleet.', keep),
  s('M26', 16, 'stad', 'Bevrijd de stad bij het Gronings Ontzet.', 'Jelles ontknoping via zijn eigen verordening; Oma Trijntje erkent Mem.', null, 'Mem en Oma Trijntje krijgen samen de standplaats.', rewrite),
  s('F3', 16, 'stad', 'Eet soep en eierbal bij de twee oma\'s.', 'De twee oma\'s in één keuken; Beppe op het feest.', null, 'De Gerda is de tweede eierbal.', keep),
  s('F4', 16, 'stad', 'Sta achteraan in de rij.', 'Jelle in de rij, zonnebril af.', null, 'Jelle hoort erbij.', keep),
  s('F5', 16, 'stad', 'Zit een avond voor twee aan de Noorderhaven.', 'De stille scène: weinig woorden, haar hand in zijn zak met de handschoen.', null, 'Ze hoeven het niet uit te leggen.', rewrite),
  s('E', 16, 'westerkwartier', 'Neem afscheid van Beppe in Oudwoude.', 'Beppe overlijdt na het Ontzet; de begrafenis in Oudwoude en de aftiteling.', null, 'Houd elkaar vast.', { decision: 'rewrite', voice: 'silent', note: 'aanvullen: Beppe\'s overlijden, de aftiteling' }),

  // ---- Nazomer: vrije speeltijd na het slot
  s('M27', 'nazomer', 'stad', 'Pak in voor de verhuizing.', 'Vrije speeltijd; Willemien in Loppersum.', null, 'Het slot is geweest, er is nog genoeg te doen.', keep),
  s('M28', 'nazomer', 'stad', 'Bekijk de wisselwoning.', 'Vrije speeltijd.', null, 'Er is altijd nog iets te doen.', keep),
  s('M29', 'nazomer', 'stad', 'Kom terug op het podium.', 'Vrije speeltijd; podium-loopbaan.', null, 'Het podium wacht.', keep),
  s('T5', 'nazomer', 'westerwolde', 'Neem de weg naar Bourtange.', 'Het proefbeleg.', null, 'Het Beleg komt terug.', keep),
  s('M30', 'nazomer', 'westerwolde', 'Speel het proefbeleg.', 'Golf-loopbaan; het Beleg als feest.', null, 'Het Beleg is een feest.', keep),
  s('F6', 'nazomer', 'stad', 'Hang de kaart op het luik.', 'Endgame: de standplaatsenkaart.', null, 'De standplaatsenkaart groeit.', keep),
];

// The decision per bridge scene (storyarc_nieuw.js BRIDGES, section 6.3 of the bible): where it plays in the new line.
export const BRIDGE_PLAN = {
  O1: { decision: 'keep', ch: 1 },
  O2: { decision: 'rewrite', ch: 3 },
  O3: { decision: 'move', ch: 11 },
  O4: { decision: 'move', ch: 11 },
  O5: { decision: 'move', ch: 11 },
  O6: { decision: 'move', ch: 11 },
  O7: { decision: 'move', ch: 13 },
  O8: { decision: 'move', ch: 10 },
  O9: { decision: 'rewrite', ch: 14 },
  O10: { decision: 'move', ch: 16 },
  O11: { decision: 'move', ch: 16 },
  O12: { decision: 'keep', ch: 'nazomer' },
};

export const CHAPTER_KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 'nazomer'];
const chapterRank = (ch) => CHAPTER_KEYS.indexOf(ch);

export const STORY_STEP_BY_ID = new Map(STORY_STEPS.map((x) => [x.id, x]));
export const stepsOfChapter = (ch) => STORY_STEPS.filter((x) => x.ch === ch);
export const isNewStep = (x) => !x.decision;
export const chapterOf = (id) => (STORY_STEP_BY_ID.get(id) || {}).ch ?? null;

// The next step of the plan after the ones done (a Set or an array of ids); null at the end.
export function nextPlanStep(done) {
  const have = (id) => (done instanceof Set ? done.has(id) : done.includes(id));
  return STORY_STEPS.find((x) => !have(x.id)) || null;
}

// What the cards show once step `id` is done: the goal of the next step (HUD marker), the diary (what happened so
// far, one line per step) and the recap (what the player knows now, without repeats).
export function stepCards(id) {
  const k = STORY_STEPS.findIndex((x) => x.id === id);
  if (k < 0) return null;
  const upto = STORY_STEPS.slice(0, k + 1);
  const next = STORY_STEPS[k + 1] || null;
  const recap = [...new Set(upto.map((x) => x.knows))];
  return { goal: next ? next.goal : '', diary: upto.map((x) => x.fn), recap, figures: upto.map((x) => x.figure).filter(Boolean), chapter: upto[upto.length - 1].ch };
}

export { chapterRank };
