// Seizoens- en carrièreregels voor het voetbalcommentaar (#1179, epic #1106): Hilbrand (h) en Roelie (r) praten mee over het seizoen van de carrière: de ronde, de plek in de stand, de laatste ronde, de beker,
// de Waddenbeker, het debuut, de ster en de sponsor. Alleen Nederlands, verzonnen clubs en bedrijven, droog en nooit gemeen (constitutie 2, 3 en 6: altijd zomer, geen winter, geen getoond leed).
// Dezelfde spelregels als voetbalcommentaardata.js (dat deze tabellen samenvoegt): een regel zonder accolade is vast en kan ingesproken worden; {speler}, {team}, {ander}, {ronde}, {rondes}, {divisie}
// en {sponsor} maken er een sjabloon van, dat ondertitel blijft. Geen regel noemt een leeftijd of een gezamenlijke jeugd van Tammo en Tessa (canon 21-11). Pure data (scripts/voetbal_uitzending_test.mjs).
export const KINDS_CARRIER = {
  seizoenRonde: { prio: 2, kans: 0.5 }, seizoenTop: { prio: 2, kans: 0.6 }, seizoenBodem: { prio: 2, kans: 0.6 }, seizoenLaatste: { prio: 3, kans: 0.8 },
  bekerWedstrijd: { prio: 2, kans: 0.6 }, europaWedstrijd: { prio: 2, kans: 0.6 }, carriereDebuut: { prio: 2, kans: 0.7 }, sterGoal: { prio: 3, kans: 0.8 }, sponsorRegel: { prio: 1, kans: 0.5 },
};

export const COMMENTAAR_CARRIER = {
  seizoenRonde: {
    h: ['Ronde {ronde} van {rondes} in de {divisie}. In zo\'n kort seizoen telt elke wedstrijd.', 'Zeven rondes in een seizoen: wie nu punten laat liggen, ziet ze niet meer terug.', 'Weer een speeldag in de {divisie}. De tribune zit vol mensen die het beter weten.', 'Het seizoen is kort en de zomer is lang. Dat kan niet verkeerd gaan.', 'Een nieuwe ronde in de competitie. De punten liggen op het gras.', 'Dit is ronde {ronde}. Geen tijd om te rommelen, joh.'],
    r: ['In een kort seizoen mag je één keer slecht zijn. En liever niet vandaag.', 'Bij het dorpsteam was een seizoen ook kort. Vooral als je moest invallen.', 'Elke ronde is een kwartfinale, zeg ik altijd. Dat klopt nooit, maar het voelt goed.', 'Ik heb de stand gezien. Ik zeg niks, maar ik kijk bezorgd.', 'Punten tellen. Mooi voetbal telt ook, maar niet op het bord.', 'Zeven rondes is niks. Een koffiepauze met een scheidsrechter.'],
  },
  seizoenTop: {
    h: ['{team} staat bovenin. Dat vraagt om een goede start vandaag.', 'Bovenaan de {divisie}, en iedereen komt voor ze.', 'Wie bovenaan staat, heeft alleen hoogte om vanaf te vallen.', 'De koppositie is van {team}, en iedereen wil hem hebben.', 'Hoog in de stand, en dat zie je aan de tribune.', 'Aan de top is de lucht dun en het gras nat.'],
    r: ['Bovenaan staan is makkelijk. Er blijven staan is de kunst.', 'Ik heb ooit twee weken bovenaan gestaan. Daarna kwam een ruzie met de keeper.', 'Wie bovenaan staat, krijgt altijd de zon in de ogen.', 'Als je bovenaan staat, is iedereen ineens je vriend. Tot de eerste tackle.', 'De top is gezellig, maar je moet je plek verdienen.', 'Hoge ogen gooien, joh. Dat doen ze hier graag.'],
  },
  seizoenBodem: {
    h: ['{team} staat onderin. Maar vandaag is het moment om het te keren!', 'Onderin de stand, maar het gras is nog net zo groen.', 'De onderste plekken zijn gevaarlijk. Elk punt is hier een cadeau.', 'Een zware middag voor {team}: elk punt telt dubbel.', 'Daar staat {team}, met de rug tegen de muur.', 'Wie onderaan staat, moet iets laten zien. Liefst een doelpunt.'],
    r: ['Onderin heb je niks te verliezen, behalve de wedstrijd.', 'Degradatie is geen ramp. Het is alleen een andere kantine.', 'Ik heb ooit onderaan gestaan. De koffie smaakte beter dan bovenaan.', 'Als het tegenzit, zit het tegen. Maar dan wel met zijn allen.', 'Onderaan leer je het meest, zeggen ze. Ik leer liever bovenaan.', 'Je moet ergens beginnen. Liefst niet onderaan, maar het kan.'],
  },
  seizoenLaatste: {
    h: ['De laatste ronde van het seizoen! Na vandaag is alles beslist.', 'Dit is de slotdag. Wie nu wint, kan feestvieren.', 'Ronde zeven, de laatste. De stand ligt klaar op de tribune.', 'Slotdag in de {divisie}. Kampioen, promotie en degradatie: alles wordt vandaag beslist.', 'Het hele seizoen komt hier samen, op één middag.', 'Dit is het moment. De laatste fluit zegt het allemaal.'],
    r: ['De laatste ronde: alles of niks. Zoals bij het dorpsteam op het laatste biertje.', 'Slotdag. Alle rekensommen op de tribune kloppen niet.', 'Zo\'n laatste dag duurt altijd langer dan negentig minuten.', 'De nagelbijters zitten vandaag vooraan.', 'Na afloop weten we alles. Of niks. Het hangt van de rekensom af.', 'Spannend, joh. Het wordt een lange avond.'],
  },
  bekerWedstrijd: {
    h: ['De Dijkbeker: wie verliest, gaat naar huis. Zo simpel is het.', 'Een bekerwedstrijd! Geen tweede kans en geen punten voor de stand.', 'Dijkbeker, ronde {ronde}. Bij gelijkspel volgen strafschoppen.', 'De beker heeft zijn eigen wetten: de kleine club mag altijd dromen.', 'Bekervoetbal is eerlijk: er blijft er maar één staan.', 'Hier wordt het gras nog zenuwachtiger dan de spelers.'],
    r: ['Bekervoetbal: negentig minuten en dan strafschoppen. Als je pech hebt.', 'In de beker bestaat geen morgen. Alleen de koffie erna.', 'Ik ben ooit door in de beker gegaan op een eigen doelpunt. Mooi was het niet. Wel door.', 'Een beker is gemaakt om te verliezen. Maar je wilt hem winnen.', 'Alle kleine clubs dromen hier van een grote.', 'Bij strafschoppen helpt geen beleid, alleen een goede keeper.'],
  },
  europaWedstrijd: {
    h: ['De Waddenbeker! Clubs van over de grens in het Groninger gras.', 'Een buitenlandse tegenstander: de tribunes zingen een tikje harder.', 'Waddenbeker, een toernooi met zout en een zeewindje.', 'Vanavond speelt {team} tegen {ander}. Zo ver reikt het wad.', 'Een internationale avond in Grunn, en de zon schijnt gewoon mee.', 'Welkom bij de Waddenbeker. Iedereen is hier even een toerist.'],
    r: ['Buitenlandse clubs: ik begrijp ze niet, maar hun voeten begrijp ik wel.', 'Zout in de lucht en een bal aan de voet. Dat is het wad.', 'Een internationale avond. Ik heb mijn mooie sjaal aan.', 'Het zijn dezelfde regels, hoor. Alleen de bijnamen zijn langer.', 'Ver van huis spelen is moeilijk. Dichtbij huis is het alleen moeilijker.', 'Dit is waarvoor je op zaterdag je kantine verlaat.'],
  },
  carriereDebuut: {
    h: ['Een debuut vandaag! {speler} loopt voor het eerst het veld op in dit shirt.', 'Het eerste optreden van {speler}. Even kijken wat dat wordt.', 'Nieuw in de selectie: {speler}. Het dorp houdt zijn adem in.', 'Daar is {speler}, voor het eerst op dit veld. Doe maar rustig aan.', 'Het debuut van {speler}! De zenuwen zitten in de benen.', 'Een eerste wedstrijd, en een heel seizoen te gaan.'],
    r: ['Debuteren is moeilijk. Vooral als iedereen kijkt, en dat doen ze.', 'Mijn debuut was een eigen doelpunt. Je kan alleen maar beter worden.', 'De eerste wedstrijd is de zwaarste. Daarna wordt het gewoon werk.', 'Rustig blijven, {speler}. Het gras bijt niet.', 'Ik zie talent. Of een goede jas. Het is lastig te zeggen.', 'Wie een debuut overleeft, overleeft alles.'],
  },
  sterGoal: {
    h: ['Daar is de ster van de ploeg: {speler} scoort!', 'Natuurlijk, {speler}! Wie anders?', '{speler} maakt hem, en de tribune weet niet wat ze ziet.', 'Dat is het talent van {speler}: koel en zonder omhaal.', 'De ster van de ploeg doet wat een ster moet doen: scoren! Dit spreekt zich rond in de regio.', 'Op {speler} kun je bouwen. En vandaag bouwt {speler} een doelpunt.'],
    r: ['Dat had ik zelf niet beter gedaan. Ik heb het ook nooit geprobeerd.', 'Een ster is geboren. Of hij was het al. Dat is moeilijk te zien.', 'Dit zijn de doelpunten waar je koffie voor koud laat worden.', 'Zie je? Daar zit werk achter. En een goede vriend aan de zijlijn.', 'Het talent zit in de voeten, de rest zit in de papieren.', 'Dat wordt een mooi verhaal in de krant. Als iemand de foto heeft.'],
  },
  sponsorRegel: {
    h: ['Deze wedstrijd is mogelijk gemaakt door {sponsor}. Hartelijk dank!', 'Een groet aan {sponsor}, die vandaag het publiek verwent.', 'Met dank aan {sponsor} voor de reclameborden langs het veld.', 'Een warme groet voor onze sponsor, die elk seizoen in de club gelooft.', 'Zonder sponsor geen netten, en zonder netten geen doelpunten.', 'De borden langs het veld zijn weer prachtig, dank aan onze sponsor.'],
    r: ['Sponsors maken het mogelijk, en ik mag het zeggen.', 'Fijn, zo\'n bedrijf dat in ons gelooft. Dat gebeurt niet vaak.', 'Een sponsor is als een goede keeper: je merkt hem pas als hij er niet is.', 'Een bedankje aan de borden. Die kijken tenminste de hele wedstrijd mee.', 'Zonder sponsor betalen we de nootjes zelf. Dat wil niemand.', 'Mooi dat ze meekijken. Maar ze mogen ook best juichen.'],
  },
};
