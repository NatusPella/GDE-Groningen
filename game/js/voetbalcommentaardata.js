// Het commentaar van de voetbalwedstrijd (epic voetbal-uitzending, 21-11): twee verzonnen commentatoren, als data. Pure tekst, geen DOM (scripts/voetbal_uitzending_test.mjs controleert de aantallen,
// de woordbudgetten en dat er niets echts in staat). Alleen Nederlands, met hier en daar een Gronings woord met zorg ("nait", "joh", "Grunn", nooit "de Grunn"); alle clubs, spelers en
// bedrijven zijn verzonnen (constitutie 2). Geen getoond leed: een blessure is een speler die even bijkomt, een kaart is een kaartje.
// Hilbrand = de verslaggever (warm, vol vuur, praat het spel). Roelie = de kleurcommentator (droog, speelde jaren in het dorpsteam, weet het altijd net iets beter).
// Een regel zonder accolade is vast en kan ingesproken worden (stem `Hilbrand|tekst` of `Roelie|tekst`, scripts/tts_cast.mjs); een regel met {speler}, {team}, {ander} of {stand} is een
// sjabloon en blijft ondertitel (de naam verandert per wedstrijd). De humor is bewust droog: grappen die al in de eerste versie stonden (de thermosfles, de pepermunt, de klompen) blijven.
export const COMMENTATOREN = {
  h: { id: 'h', naam: 'Hilbrand', stem: 'Hilbrand', rol: 'Verslaggever' },
  r: { id: 'r', naam: 'Roelie', stem: 'Roelie', rol: 'Kleurcommentaar' },
};

// Per soort: h (de verslaggever) en r (de kleurcommentator). `kans`: hoe groot de kans is dat de ander er nog iets achteraan zegt (0 tot 1); `prio`: 3 komt altijd door, 1 vervalt bij drukte.
export const KINDS = {
  start: { prio: 3, kans: 0.9 }, tweedeHelft: { prio: 3, kans: 0.6 }, derby: { prio: 3, kans: 0.8 },
  kans: { prio: 1, kans: 0.3 }, schot: { prio: 1, kans: 0.2 }, redding: { prio: 2, kans: 0.5 }, paal: { prio: 2, kans: 0.6 },
  goalThuis: { prio: 3, kans: 0.9 }, goalUit: { prio: 3, kans: 0.9 }, goalEigen: { prio: 3, kans: 0.9 }, comeback: { prio: 3, kans: 0.8 },
  geel: { prio: 3, kans: 0.6 }, rood: { prio: 3, kans: 0.9 }, blessure: { prio: 3, kans: 0.6 }, wissel: { prio: 2, kans: 0.4 },
  strafschop: { prio: 3, kans: 0.8 }, hoek: { prio: 1, kans: 0.25 }, ingooi: { prio: 1, kans: 0.15 }, doelschop: { prio: 1, kans: 0.2 }, vrij: { prio: 1, kans: 0.25 },
  buitenspel: { prio: 2, kans: 0.4 }, uit: { prio: 1, kans: 0.15 }, overtreding: { prio: 1, kans: 0.3 },
  rust: { prio: 3, kans: 0.9 }, eindWinst: { prio: 3, kans: 0.9 }, eindVerlies: { prio: 3, kans: 0.9 }, eindGelijk: { prio: 3, kans: 0.9 },
  vulling: { prio: 1, kans: 0.5 }, laatsteMinuut: { prio: 3, kans: 0.6 }, spanning: { prio: 2, kans: 0.5 }, manOfTheMatch: { prio: 3, kans: 0.8 },
  bezitThuis: { prio: 1, kans: 0.4 }, bezitUit: { prio: 1, kans: 0.4 },
};

export const COMMENTAAR = {
  start: {
    h: ['Welkom in de Euroborg! De zon schijnt, het gras is groen en Oma Trijntje heeft haar thermosfles al open.', 'Goedemiddag allemaal! Het is zomer in Grunn en de bal ligt klaar op de stip.', 'Daar komen de spelers het veld op. Wat een sfeer, wat een zomerdag!', 'De tribunes zitten vol. Nou ja, vol genoeg voor een dinsdag.', 'Hier zijn we dan: elf tegen elf, één bal en een heleboel Grunnegers die het beter weten.', 'De scheidsrechter kijkt op zijn horloge. Het kan beginnen.'],
    r: ['Ik heb er zin in, Hilbrand. Het gras ruikt precies zoals vroeger bij het dorpsteam.', 'Let op de middenmoot vandaag. Daar wordt het gewonnen of verloren.', 'Mooie dag voor voetbal. Slechte dag om in de schaduw te zitten.', 'Ik zeg: de eerste tien minuten zijn de belangrijkste. Dat zeg ik elke week, en elke week heb ik gelijk.', 'Oma Trijntje zit op haar vaste plek. Dan weet je dat het menens is.'],
  },
  tweedeHelft: {
    h: ['En we zijn weer begonnen. De tweede helft, met de rust nog in de benen.', 'De spelers staan weer klaar. Alles kan nog, joh.', 'Daar gaan we weer. De thermosfles is leeg, de spanning niet.', 'Tweede helft! Wie heeft in de rust het beste gepraat?'],
    r: ['In de rust wordt het gewonnen, zeggen ze. Of verloren. Het ligt eraan.', 'Ik ben benieuwd wie er nog benen heeft.', 'Nu komt het op conditie aan. En op koffie.'],
  },
  derby: {
    h: ['Dit is wat we noemen een Groninger derby: niemand wil verliezen, iedereen kent elkaar.', 'Een echte derby vandaag! Dat is zweet, gras en een bakkie koffie na afloop.', 'Het is een derby. De tribunes zijn kleurrijker dan anders, en luider.'],
    r: ['Bij een derby zijn de regels dezelfde, de tackles net iets stevigeres.', 'Ik heb in mijn tijd drie derby\'s gespeeld. Ik heb nog steeds ruzie met een buurman.', 'Niemand wil de buurman laten winnen. Dat is de eerste wet van het Noorden.'],
  },
  kans: {
    h: ['Wat een kans! Hij kon alles doen, maar hij deed net iets anders.', 'Gevaar! Dat scheelde niet veel.', 'Dat had een doelpunt moeten zijn, vind ik.', 'Een grote kans! En de bal gaat net naast.', 'Dichtbij! Heel dichtbij!', 'Daar komt een schot! Net niet, net niet.', 'Bijna, bijna! De tribunes zuchten.', 'Wat een mogelijkheid, maar de afwerking klopt niet.'],
    r: ['Die moet er in, Hilbrand. Zelfs mijn oma had die gescoord.', 'Dat is het verschil tussen een goed en een geweldig schot: de laatste tien centimeter.', 'Net als bij het dorpsteam: eerst bijna, dan koffie.', 'Hij keek te veel naar de keeper en te weinig naar de bal.', 'Pech. En een beetje onhandig.'],
  },
  schot: {
    h: ['Een schot! Het gaat hard.', 'Hij haalt uit!', 'Daar gaat de bal, richting het doel.', 'Schieten, en het is een harde!', 'Hij probeert het van afstand.', 'Een poging! De keeper moet opletten.', 'Een kogel! Wat doet de keeper?', 'Hij schiet, hij schiet!'],
    r: ['Rustig aan, jongen. Eerst richten, dan schieten.', 'Daar zit kracht achter.', 'Dat doe je met je hele been, niet alleen met je voet.', 'Een mooie poging, maar vooral een harde.'],
  },
  redding: {
    h: ['Wat een redding! De keeper houdt zijn doel schoon.', 'Gestopt! Die ging er bijna in.', 'De keeper vloog erheen. Er zat gras in zijn haar.', 'Daar is hij! De keeper redt met zijn vingertoppen.', 'Weggeslagen! Wat een reflex.', 'Hij pakt hem! Zekerheid in het doel.', 'Op de lijn gered. Die keeper heeft vandaag zijn handschoenen aan, letterlijk.', 'De bal is veilig bij de keeper.'],
    r: ['Dat noem ik keeperswerk. Alleen de beste keepers lachen daarna.', 'Hij stond precies goed. Dat is geen geluk, dat is training.', 'Een keeper is een eenzaam beroep. Maar hij heeft vanmiddag veel bezoek.', 'Bij ons in het dorp heette zo iemand Meneer Muur.', 'De spits dacht dat hij hem had. De keeper dacht van niet.', 'Mooi gedaan. Hij verdient een pepermunt.'],
  },
  paal: {
    h: ['Tegen de paal! Dat scheelde een haar.', 'Op de lat! De hele tribune hield de adem in.', 'De paal redt! Het doelpunt blijft uit.', 'Ping! Dat klonk als een klok. Net niet, net niet.', 'Hout! Het doel staat nog.'],
    r: ['Dat is nog net zo erg als missen, maar mooier om te zien.', 'De paal is de beste verdediger van het veld.', 'Zo dicht bij. Het hout was zijn vriend niet.', 'Ik hoor het nog galmen.'],
  },
  goalThuis: {
    h: ['GOAL voor de Stadjers! Dat noem ik een vloeiende aanval.', 'Binnen! De Stadjers vieren het met een polonaise.', 'Wat een schot! De keeper keek nog naar de verkeerde hoek.', 'Doelpunt! Wat een mooi moment voor de tribune!', 'En hij zit! De bal ligt in het net. Prachtig!', 'JA! Daar is het doelpunt! De Euroborg ontploft.', 'Goal! {speler} scoort voor {team}. De stand: {stand}.', 'Wat een afwerking van {speler}! {stand}.', 'Raak! {speler} is niet te stoppen. {stand}.', 'Een doelpunt voor {team}! Zo kan het ook.'],
    r: ['Zo spelen we het thuis ook. Zonder tamtam, gewoon erin.', 'Mooi. Dat was niet alleen een goal, dat was een kunstwerk.', 'Dat was verdiend, Hilbrand. Heel verdiend.', 'Als dat niet binnen gaat, eet ik mijn sjaal op.', 'De keeper had geen schijn van kans. Hij had het wel geprobeerd.', 'Dit is het mooiste geluid van het voetbal: het net dat beweegt.', 'Oma Trijntje is opgestaan. Dat doet ze alleen bij doelpunten.', 'Ik zou zeggen: dikke goal.'],
  },
  goalUit: {
    h: ['De tegenstander scoort. Even slikken, even doorgaan.', 'Tegendoelpunt. Oma Trijntje schudt haar hoofd, maar ze blijft zitten.', 'Binnen. De keeper wil de grasmat even onder handen nemen.', 'Dat is een domper. {team} scoort: {stand}.', 'Daar gaat de bal in ons doel. {speler} maakt hem koel af.', 'Het is gebeurd: {team} komt op {stand}.', 'Tegenvaller! De bal zit achter de keeper.', 'Een doelpunt voor de bezoekers. Het gras zwijgt.', 'Helaas. {speler} had er zin in.'],
    r: ['Dat doet pijn, Hilbrand. Maar het spel is nog lang niet uit.', 'Daar had de verdediging bij moeten staan. Niet erbij moeten kijken.', 'Je moet het toegeven: dat was mooi, alleen niet voor ons.', 'Even doorademen en opnieuw beginnen.', 'In het dorpsteam zeiden we dan: volgende keer doen we het ook.', 'Bij een tegendoelpunt kijkt de hele ploeg naar de keeper. Meestal onterecht.', 'Nou, dat was effe niet best.'],
  },
  goalEigen: {
    h: ['Een eigen doelpunt! Dat gaat in de boeken als pech.', 'Oei! Die gaat in zijn eigen doel. Dat vergeet hij niet snel.', 'Een ongelukje: een eigen doelpunt. {stand}.', 'Dat was niet de bedoeling. De bal rolt in het verkeerde net.'],
    r: ['Dit kan elke speler overkomen. Behalve de keeper, die kan het dubbel.', 'Het is geen schande, het is een anekdote.', 'Hij kijkt nu heel erg naar de lucht.', 'Pech, zeg ik. Pure pech. Ik heb er zelf ook een paar op mijn naam staan.'],
  },
  comeback: {
    h: ['De comeback is compleet! Wie had dat gedacht?', 'Terug in de wedstrijd! Wat een veerkracht!', 'Gelijk! Na achterstand komt {team} terug. {stand}.', 'Wat een wedstrijd! Eerst achter, nu weer gelijk.'],
    r: ['Zie je wel: nooit opgeven. Dat is het Groninger motto.', 'Dat is karakter. Dat kan je niet kopen, ook niet in de supermarkt.', 'Dit is waarom we naar voetbal kijken, Hilbrand.'],
  },
  geel: {
    h: ['Een gele kaart. De scheidsrechter noteert het in zijn boekje.', 'Geel! Dat was een gele kaart.', 'Daar is het kaartje: geel voor {speler}.', 'De scheidsrechter trekt geel. Dat zal hij onthouden.', 'Gele kaart, en terecht. Voorzichtig nu.', 'Een waarschuwing met een kaartje erbij.'],
    r: ['Dat is de goedkoopste les van het voetbal.', 'Hij mag nu niet meer te vurig worden.', 'Geel is een vriendelijk verzoek in kleur.', 'Dat hadden we kunnen zien aankomen.', 'Eerlijk is eerlijk: dat was een tikje te veel.'],
  },
  rood: {
    h: ['Rood! De scheidsrechter stuurt hem naar de kant.', 'Een rode kaart! {team} gaat met tien man verder.', 'Dat is einde wedstrijd voor {speler}. Rood.', 'Hij moet eraf. Dat wordt lastig.', 'Tweede geel, dus rood. {speler} verlaat het veld.'],
    r: ['Dat wordt een lange middag met tien man.', 'Rood. Hij had beter kunnen kiezen.', 'Dit verandert alles. Het hele plan moet om.', 'Niemand wil dit zien, maar de regel is de regel.', 'Er is nu ruimte, en die ruimte moet je gebruiken.'],
  },
  blessure: {
    h: ['Hij blijft even liggen. Het medisch team komt kijken.', 'Een blessure. We hopen dat het meevalt.', 'Daar loopt {speler} niet lekker meer. Even bijkomen.', 'De spelers houden even in. Een gekwetste speler wordt geholpen.', 'Hij haalt de wedstrijd niet. Er komt een wissel.'],
    r: ['Rustig aan, even uitlopen. Zo gaat dat.', 'De wedstrijd gaat daarna gewoon verder. Dat is het voetbal.', 'Een goede wissel is soms het beste medicijn.', 'Beterschap alvast.'],
  },
  wissel: {
    h: ['Een wissel: {speler} komt erin.', 'Er wordt gewisseld. Verse benen op het veld.', 'Nieuwe speler, nieuwe kansen.', 'De bank wordt benut. {speler} gaat spelen.', 'Een wissel, daar zit een idee achter.'],
    r: ['De trainer weet iets wat wij niet weten. Of hij hoopt het.', 'Verse benen zijn goud waard in de laatste helft.', 'Die was moe, Hilbrand. Dat zag je aan zijn schoenen.', 'Een goede wissel verandert de wedstrijd. Meestal.'],
  },
  strafschop: {
    h: ['Strafschop! De scheidsrechter wijst naar de stip.', 'Penalty! Dit wordt spannend.', 'De bal ligt op de stip. Het hele stadion zwijgt.', 'Een strafschop voor {team}. Wie gaat hem nemen?', 'Alle ogen op de stip. Eén speler, één keeper, één kans.', 'Straf! En nu is het stil.'],
    r: ['Dit is het enige moment waarop het voetbal heel eenzaam is.', 'Je kijkt niet naar de keeper. Je kijkt naar de hoek.', 'Dat is alleen maar zenuwen. Het doel is groot genoeg.', 'Ik heb er eens een gemist op een dorpsfeest. Mijn oma weet het nog.'],
  },
  hoek: {
    h: ['Hoekschop voor {team}.', 'Een hoekschop. Alle lange spelers gaan mee naar voren.', 'De bal gaat de hoek in. Kan dit gevaarlijk worden?', 'Een corner, en dat levert altijd drukte op.', 'Hoekschop! Het wordt druk voor het doel.'],
    r: ['Een hoekschop is een uitnodiging om te duwen.', 'Bij een corner telt alleen de eerste bal.', 'Dit kan een goede kans worden, als de voorzet goed is.'],
  },
  ingooi: {
    h: ['Een ingooi voor {team}.', 'De bal gaat uit, de ingooi is voor de ander.', 'Een inworp aan de zijlijn.', 'Even rust bij de zijlijn. Een ingooi.'],
    r: ['Een ingooi is de enige keer dat je met je handen mag.', 'Vergeet je voeten niet op de grond te houden.', 'Altijd opletten bij een ingooi. Daar slapen ze vaak.'],
  },
  doelschop: {
    h: ['Een doelschop voor {team}. De keeper trapt hem uit.', 'De keeper pakt de bal en gaat hem weer in het spel brengen.', 'Doelschop. Rustig opbouwen is het idee.', 'De bal ging over de achterlijn. Doelschop.'],
    r: ['Een doelschop is een tweede kans voor wie hem nodig heeft.', 'Dit is het ideale moment om je even te herpakken.', 'De keeper heeft alle tijd, en gebruikt hem ook.'],
  },
  vrij: {
    h: ['Een vrije trap voor {team}.', 'Vrije bal. Wie gaat hem nemen?', 'De scheidsrechter geeft een vrije trap.', 'Een vrije trap, en dat kan gevaarlijk zijn.'],
    r: ['Bij een vrije trap telt de muur. En de muur telt zijn schoenen.', 'Dat is een kans om iets moois te doen.', 'Dit zijn de momenten waar je voor traint.'],
  },
  buitenspel: {
    h: ['Buitenspel! De vlag gaat omhoog.', 'Hij stond buitenspel. Vrije bal voor de ander.', 'Buitenspel, dat is de regel.', 'Te vroeg gestart. Buitenspel.'],
    r: ['Het is een heel simpele regel. Daarom snapt niemand hem.', 'Een stap te ver, en het hele plan valt weg.', 'Hij liep mooi, maar iets te vroeg.'],
  },
  uit: {
    h: ['De bal is uit.', 'Naar de tribune. Oma Trijntje vangt hem, en geeft hem niet terug.', 'Uit. Even de adem inhouden.', 'De bal verlaat het veld.'],
    r: ['Zo gaan er elk jaar veertig ballen verloren in de gracht.', 'Een balletje over de lijn is nooit weg. Het is alleen even weg.', 'Een mooie poging, maar buiten bereik.'],
  },
  overtreding: {
    h: ['Overtreding. Vrije bal, de scheidsrechter wijst.', 'Dat was te fel. Vrije bal voor de ander.', 'Een overtreding. Het spel ligt even stil.', 'De scheidsrechter fluit. Dat was geen bal, dat was een been.', 'Hard spel! Een vrije bal.'],
    r: ['Een tackle van achteren is nooit een goed plan.', 'Je mag best hard spelen. Maar niet met je beide benen tegelijk.', 'Dat is een kleine overtreding met grote gevolgen.', 'Van achteren? Dat doe je niet.'],
  },
  rust: {
    h: ['Rust. De thermosfles gaat rond.', 'Rust. Even bijkomen en dan weer vol gas.', 'Het fluitsignaal klinkt. Het is rust in de Euroborg.', 'De eerste helft zit erop. Tijd voor een bakkie koffie.', 'Rust! Wat vond Roelie ervan?', 'Dat was de eerste helft. De tweede wordt net zo mooi.'],
    r: ['Ik zou zeggen: een helft vol bijna. Het bijna moet nu binnen.', 'De trainer heeft vijftien minuten voor een speech van twee zinnen.', 'Ik ga even in de statistieken kijken. Dan weet ik het zeker.', 'Het is te warm. Dat zeg ik elke zomer.', 'Een goede rust is half gewonnen. Of half verloren.', 'Zoveel gras, zo weinig schaduw.'],
  },
  eindWinst: {
    h: ['Gewonnen! De Stadjers dansen over het veld.', 'Een overwinning in de Euroborg. Oma Trijntje trakteert op pepermunt.', 'Het eindsignaal! En het is winst. Wat een middag!', 'Gewonnen! Het is een feest op de tribunes.'],
    r: ['Verdiend, Hilbrand. Heel verdiend. Ik heb geen kwaad woord over.', 'Het is een dag om in te lijsten. Het liefst met een bakkie erbij.', 'Dat doe je niet vaak. Maar vandaag deed je het wel.'],
  },
  eindVerlies: {
    h: ['Verloren. De volgende keer beter, Oma Trijntje blijft komen.', 'Dat was niet ons dagje. Het gras kan er niets aan doen.', 'Het eindsignaal. Dit was geen mooie middag.', 'Verloren. Maar de zon schijnt nog.'],
    r: ['Het is maar voetbal, Hilbrand. Zeg ik, met een brok in mijn keel.', 'We leren ervan. Ik zeg dat elke keer.', 'De tribune klapt toch. Dat is een goed teken.'],
  },
  eindGelijk: {
    h: ['Gelijkspel. Niemand wint, niemand gaat boos naar huis.', 'Gelijk. De pepermunt wordt eerlijk verdeeld.', 'Het eindsignaal klinkt: het blijft gelijk.', 'Een gelijkspel. Beide teams nemen een punt mee.'],
    r: ['Een gelijkspel is een lekker neutraal resultaat. Net zoals koffie zonder suiker.', 'Eerlijk gedeeld, eerlijk gespeeld.', 'Daar is niemand ongelukkig mee, en niemand blij.'],
  },
  vulling: {
    h: ['De bal gaat heen en weer, en de zon schijnt.', 'Rustig opbouwen, kijk eens hoe ze het veld verdelen.', 'Het is een tactisch spel. Elke zijde zoekt de ruimte.', 'Er wordt geduldig gespeeld. Een korte pass hier, een korte pass daar.', 'De middenvelders voeren de strijd.', 'Het spel verplaatst zich naar de andere kant.', 'Mooie passing, dat zie je niet vaak zo in het Noorden.', 'Ze zoeken een opening, en die is er nog niet.', 'Let op de achterhoede, die staat er netjes bij.', 'De bal rolt over het gras. Zomer in het Noorden.'],
    r: ['De wind draait een beetje. Dat merk je aan de lange ballen.', 'Op een warme dag is het tempo vanzelf lager.', 'Dit is ouderwets voetbal. Ik hou ervan.', 'Een goede pass is een geheugenoefening: waar loopt hij heen?', 'Kijk naar de ruimte. Ruimte is wat tellen moet.', 'Niet alles hoeft een schot te zijn. Soms is een zucht genoeg.', 'In het dorp zeiden we: eerst de bal, dan de man. Of andersom.', 'Het gras is erg kort. Dat is ook een tactiek.', 'Mooie middag voor een pakje friet. Nu even niet.', 'Die verdediger weet precies wat hij doet.'],
  },
  bezitThuis: {
    h: ['{team} heeft nu veel de bal. Ze zijn de baas op het middenveld.', 'De Stadjers houden de bal lekker lang.', 'Veel balbezit voor de thuisploeg.'],
    r: ['Als je de bal hebt, kan de tegenstander niet scoren. Dat is geen filosofie, dat is rekenen.', 'Balbezit is mooi, maar het moet wel ergens heen.'],
  },
  bezitUit: {
    h: ['De tegenstander heeft de bal veel. Het wordt hard werken voor de Stadjers.', 'De bezoekers houden de bal vast.', 'Veel druk van {team}. Opletten!'],
    r: ['Als je de bal niet hebt, moet je rennen. Dat is de enige manier.', 'Eerst de bal terugwinnen, dan pas praten.'],
  },
  laatsteMinuut: {
    h: ['De laatste minuten! Alles of niets.', 'Het loopt naar het einde. Wat kunnen ze nog doen?', 'Nog maar even te gaan! De spanning stijgt.', 'De klok tikt. De laatste kansen.'],
    r: ['Nu merk je wie het meest conditie heeft.', 'De laatste minuten zijn voor helden en voor wie het geluk aan zijn zijde heeft.', 'Ik zeg: alles op de laatste lange bal.'],
  },
  spanning: {
    h: ['Wat een spanning! Het kan nog alle kanten op.', 'Dit blijft tot het einde spannend.', 'Het is een heel gelijkopgaande wedstrijd.'],
    r: ['Zo wil je voetbal zien: iedereen zit op het puntje van de stoel.', 'Met één doelpunt verschil is het nooit zeker.', 'Ik durf er niets over te zeggen. En dat zegt wat.'],
  },
  manOfTheMatch: {
    h: ['Man van de match: {speler}. Verdiend!', 'De prijs voor de beste speler gaat naar {speler}.', 'Wie was de beste? {speler}, zonder twijfel.'],
    r: ['Ik had hem ook gekozen. Ik zeg het alleen niet hardop.', 'Een prima prestatie, die niet zomaar uit de lucht komt vallen.', 'Dat is een speler die je in je team wilt.'],
  },
};

// Een aantal regels dat er altijd moet zijn (de test eist een ondergrens per soort en in totaal).
export const MIN_PER_KIND = 5;
export const MIN_TOTAAL = 200;
export const MAX_WORDS = 22;
const DERBYS = [['stadjers', 'ommelanders'], ['stadjers', 'hunebedders'], ['veenpiraten', 'kleibijters'], ['wadlopers', 'ommelanders']];
export const isDerby = (a, b) => DERBYS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
