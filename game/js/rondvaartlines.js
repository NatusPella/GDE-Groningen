// The guided tour, in sailing order, shared by the H13 mission and the
// relaxed tour (sidejob_rondvaarttour.js). `at` is the thing itself; the
// story starts where the route passes closest to it. Tammo is the guide at
// the microphone, Tessa (who knows more) chimes in and corrects him; the
// tourists react in short bubbles. Facts are kept to what is well
// documented; the jokes are clearly jokes. Line keys: T Tammo, A Tessa,
// D the German tourist, E the English one, R the one from the Randstad
// (foreign lines get a Dutch subtitle, subtitles.js INTL).

import { P } from './worldframe.js';

export const TOUR_WELCOME = [
  ['T', 'Welkom aan boord! We varen een rondje over de Diepenring, de gracht rond de binnenstad, grotendeels gegraven in de zeventiende eeuw toen Grunn werd uitgebreid en een nieuwe vestinggordel kreeg.'],
  ['A', 'Tammo vertelt, ik stuur. Vragen over de geschiedenis mag u gerust aan mij stellen.'],
  ['T', 'Vragen over de kroegen aan mij.'],
];
export const TOUR_STOPS = [
  { at: P(29, -264), name: 'het Ebbingekwartier', lines: [
    ['T', 'Hier langs het water: het Ebbingekwartier. Vroeger stond hier onder meer de gasfabriek.'],
    ['A', 'Het heette eerst het CiBoGa-terrein: circusterrein, Bodenterrein en gasfabriek. Nu wonen en werken er mensen.'],
  ] },
  { at: P(120, -330), name: 'de Stadsschouwburg', lines: [
    ['T', 'Links, aan de Turfsingel: de Stadsschouwburg, geopend in 1883. De Turfsingel heet zo omdat hier de turf uit de venen werd aangevoerd. Brandstof voor de hele stad.'],
  ] },
  { at: P(228, -279), name: 'de Maagdenbrug', lines: [
    ['T', 'De Maagdenbrug. Waar die naam vandaan komt? Geen idee. En ik ga het ook niet verzinnen.'],
    ['A', 'Eindelijk een eerlijke gids.'],
  ] },
  { at: P(265, -205), name: 'de Prinsentuin', lines: [
    ['T', 'Rechts de Prinsenhoftuin, aangelegd in 1625 bij het Prinsenhof, waar de stadhouders woonden. Met rozen, kruiden en een beroemde zonnewijzer.'],
    ['D', 'Wunderschön, diese Rosen!'],
  ] },
  { at: P(214, 13), name: "d'Olle Grieze", lines: [
    ['T', "Rechts over de daken: de Martinitoren, zo'n 97 meter hoog en rond 1482 voltooid. De Stadjers noemen hem d'Olle Grieze: de oude grijze."],
    ['T', 'Hoogste toren van Nederland, trouwens.'],
    ['A', 'Nee, Tammo. De Domtoren in Utrecht is hoger. Maar d\'Olle Grieze is wel de mooiste.'],
    ['T', 'Dat bedoelde ik ook.'],
    ['D', 'Wie viele Stufen hat der Turm?'],
    ['T', 'Te veel.'],
  ] },
  { at: P(505, 91), name: 'het Schuitendiep', lines: [
    ['T', 'Dit is het Schuitendiep. Hier legden de schuiten aan, platte vrachtschepen die de stad bevoorraadden. Rechts de Poelestraat: overdag stil, om vier uur \'s nachts het drukste stukje Grunn.'],
    ['A', 'Grunn staat erom bekend dat de kroegen hier geen vaste sluitingstijd hebben. Geen grap.'],
    ['E', 'Four in the morning? I\'m in!'],
  ] },
  { at: P(560, 216), name: 'het Gedempte Kattendiep', lines: [
    ['T', 'Links het Gedempte Kattendiep. Vroeger een gracht, nu een straat. Groningers dempen iets en zetten dat dan gewoon in de naam.'],
    ['A', 'Net als het Gedempte Zuiderdiep, verderop. Waar nu de bussen rijden, voeren vroeger schepen.'],
  ] },
  { at: P(601, 283), name: 'de Steentilbrug', lines: [
    ['T', 'We gaan onder de Steentilbrug door. "Til" is Gronings voor brug, dus eigenlijk heet hij gewoon de stenen brug.'],
    ['A', 'Rechtdoor loopt het Damsterdiep, het oude kanaal naar Appingedam en Delfzijl.'],
    ['T', 'Handig, voor als je ooit snel de stad uit moet.'],
  ] },
  { at: P(681, 342), name: "Voor 't voormalig klein Poortje", lines: [
    ['A', 'Die straat daar heet echt "Voor \'t voormalig klein Poortje". Hier zat ooit een klein poortje in de stadswal.'],
    ['T', 'Kijk. Dat noem ik nou een duidelijke straatnaam.'],
  ] },
  { at: P(744, 390), name: 'de Oosterhaven', lines: [
    ['T', 'De Oosterhaven: vroeger een drukke binnenhaven, nu vol woonboten. Tuinen die meebewegen. Zwaai maar, ze zwaaien terug.'],
    ['R', 'Wonen hier echt mensen op het water? Wat kost dat per vierkante meter?'],
    ['A', 'Minder dan in Amsterdam, mevrouw. Veel minder.'],
  ] },
  { at: P(712, 492), name: 'de Oosterpoort', lines: [
    ['T', 'Achter de Trompsingel: de Oosterpoort. Nu een wijk en een concertgebouw, ooit een echte stadspoort.'],
    ['A', 'Van die poort is niks meer over. De wijk en de zaal hebben de naam gehouden.'],
  ] },
  { at: P(590, 650), name: 'Gronings Ontzet', lines: [
    ['T', 'In 1672 lag Bommen Berend voor de stad. Niet onze Berend met z\'n bakkie, hè: de bisschop van Münster, met een leger en heel veel kanonskogels.'],
    ['A', 'Hij kreeg Grunn niet. Op 28 augustus trok hij af, en dat vieren we nog elk jaar: Gronings Ontzet.'],
    ['D', 'Münster? Oh. Entschuldigung.'],
    ['T', 'Geeft niks. Is al even geleden.'],
  ] },
  { at: P(375, 753), name: 'de Herebrug', lines: [
    ['T', 'De Herebrug verbindt de Herestraat met de Hereweg: eeuwenlang de hoofdroute de stad uit, naar het zuiden en Drenthe. Gaat hij open, dan staat half Grunn te wachten.'],
  ] },
  { at: P(250, 800), name: 'het Verbindingskanaal', lines: [
    ['T', 'We varen nu over het Verbindingskanaal. Een kanaal dat dingen verbindt. Daar hebben ze lang over nagedacht.'],
  ] },
  { at: P(102, 834), name: 'het Groninger Museum', lines: [
    ['T', 'Links het Groninger Museum, geopend in 1994, op een eiland in het kanaal. Ontworpen door Alessandro Mendini, met paviljoens van onder anderen Philippe Starck en Coop Himmelb(l)au. Ja, het hoort zo scheef.'],
    ['A', 'In die gouden toren zit het depot. Daar staat de kunst die even niet aan de muur hangt.'],
    ['T', 'Net als mijn fiets in de schuur.'],
  ] },
  { at: P(60, 836), name: 'de Werkmanbrug', lines: [
    ['T', 'Deze brug is vernoemd naar Hendrik Werkman, drukker en kunstenaar van De Ploeg. Hij werd in april 1945 door de bezetter gefusilleerd, een paar dagen voor Groningen werd bevrijd.'],
  ] },
  { at: P(-60, 948), name: 'het Hoofdstation', lines: [
    ['T', 'Links, achter de bomen: het Hoofdstation uit 1896. Van buiten een paleis, van binnen een van de mooiste stationshallen van het land.'],
    ['E', 'Is that the station or a palace?'],
    ['A', 'Allebei, zeggen ze hier.'],
  ] },
  { at: P(-208, 773), name: 'de Emmabrug', lines: [
    ['T', 'De Emmabrug, net als de Emmasingel vernoemd naar koningin Emma. Hier komen studenten aan met één koffer en vertrekken ze tien jaar later met drie fietsen.'],
  ] },
  { at: P(-325, 756), name: 'de Emmasingel', lines: [
    ['R', 'Is dit nog steeds hetzelfde water?'],
    ['T', 'Het is allemaal één ring, mevrouw. Je kunt niet verdwalen.'],
    ['A', 'Hij wel.'],
  ] },
  { at: P(-372, 513), name: 'de Praediniussingel', lines: [
    ['A', 'Rechts de Praediniussingel, vernoemd naar Regnerus Praedinius. Hij was in de zestiende eeuw rector van de Latijnse school in Grunn.'],
    ['T', 'Ik had geen Latijn. Wel een fiets.'],
  ] },
  { at: P(-200, 359), name: 'de Der Aa-kerk', lines: [
    ['T', 'Rechts de Der Aa-kerk, voluit de Onze Lieve Vrouwe der A-kerk, vernoemd naar datzelfde riviertje. De toren is een paar keer ingestort; de huidige staat er sinds het begin van de achttiende eeuw.'],
  ] },
  { at: P(-384, 318), name: 'de A', lines: [
    ['T', 'Het riviertje heet de A, omdat ze in Grunn geen tijd hebben voor lange namen.'],
    ['A', 'Aa is gewoon een oud woord voor water, Tammo. Half Nederland heeft wel een Aa.'],
    ['T', 'Dus ik had half gelijk.'],
  ] },
  { at: P(-376, 250), name: 'de Hoge der A', lines: [
    ['T', 'De Hoge en de Lage der A, de oude stadshaven aan het riviertje de A. De pakhuizen komen uit de tijd dat de schepen via het Reitdiep naar zee voeren.'],
    ['D', 'Das ist wie in Amsterdam, nur ruhiger.'],
    ['A', 'Zeg dat maar niet te hard. Hier zijn ze trots op hun eigen grachten.'],
  ] },
  { at: P(-460, 102), name: 'de Visserbrug', lines: [
    ['T', 'De Visserbrug. Of eigenlijk, volgens de kaart: de tijdelijke Visserbrug.'],
    ['A', 'In Grunn is tijdelijk een rekbaar begrip.'],
  ] },
  { at: P(-533, 49), name: 'het Reitdiep', lines: [
    ['A', 'Daar gaat het Reitdiep naar het noorden, via Zoutkamp naar het Lauwersmeer. Eeuwenlang de weg van Grunn naar zee.'],
    ['T', 'Nu vooral de weg naar een visje in Zoutkamp.'],
  ] },
  { at: P(-408, -72), name: 'de Noorderhaven', lines: [
    ['T', 'De Noorderhaven, ooit de haven voor de zeeschepen. Nu liggen hier oude zeilschepen en woonboten. De eenden betalen geen liggeld.'],
  ] },
  { at: P(-340, -150), name: 'het Noorderplantsoen', lines: [
    ['T', 'Hier vlakbij ligt het Noorderplantsoen, aangelegd op de oude vestingwallen.'],
    ['A', 'Eind negentiende eeuw, toen de wallen weg mochten. Nu ligt heel Grunn er in de zomer op een kleedje.'],
  ] },
  { at: P(-270, -143), name: "de Kijk in 't Jatbrug", lines: [
    ['T', "De Kijk in 't Jatbrug, genoemd naar de Kijk in 't Jatstraat. Die dankt zijn naam aan een toren in de oude stadsmuur."],
    ['E', 'Kijk in... what?'],
    ['T', 'Precies.'],
  ] },
  { at: P(-143, -32), name: 'het Academiegebouw', lines: [
    ['T', 'Rechts, verderop: het Academiegebouw van de universiteit, die in 1614 werd opgericht. Het huidige gebouw is van 1909; het vorige brandde in 1906 af.'],
  ] },
  { at: P(-146, -197), name: 'de Ossenmarkt', lines: [
    ['A', 'Rechts de Ossenmarkt. Raad eens wat daar vroeger werd verhandeld.'],
    ['T', 'Fietsen.'],
    ['A', 'Ossen, Tammo. Het staat er gewoon.'],
    ['T', 'Dat was het rondje, dames en heren. Er gaat niets boven Groningen.'],
    ['A', 'Dat is een reclameslogan, Tammo.'],
    ['T', 'Het is ook gewoon waar.'],
  ] },
];
// Short tourist reactions between the stories (bumps, calm water, Wiebe).
export const TOURIST_REACT = {
  bump: [['D', 'Ach du lieber Himmel!'], ['R', 'Mijn koffie!'], ['E', 'Is this included in the ticket?']],
  calm: [['E', 'Lovely. Very relaxing.'], ['D', 'So gemütlich hier!'], ['R', 'Dit is leuker dan de grachten thuis. Zeg het niet door.']],
  wiebe: [['E', 'Is this part of the tour?'], ['D', 'Wer ist dieser Mann?']],
};

// H13's own scenes and moments (rondvaartchase.js). Keys: W Schipper Wiebe
// through his megaphone, G Tammo at the guide's microphone, t Tammo off the
// microphone, A Tessa.
export const RV_SCENES = {
  // why Wiebe is after them: his boat, his paying tourists, one beer
  why: [
    ['W', 'Eén biertje! Eén biertje in de kroeg en mien boot is weg! Met mien toeristen, die bij MIJ betaald hebben!'],
    ['t', 'Klaas zei dat hij tot vieren in de kroeg zat.'],
    ['A', 'Het is kwart over vier, Tammo.'],
  ],
  // under the H.N. Werkmanbrug: he does not duck
  bonk: [
    ['W', 'Ik buk voor niemaAU! Mien kop!'],
    ['A', 'Hij bukt voor niemand.'],
    ['t', 'Behalve nu.'],
  ],
  // the guide picks up where he left off
  resume: [
    ['G', 'Goed. Waar was ik. Dames en heren, aan uw rechterhand: Schipper Wiebe. Ook een bezienswaardigheid.'],
    ['A', 'Vertel nou maar over het museum.'],
  ],
  // the build-up to the kiss in the outro, in sailing order
  glance: [
    ['A', 'Je bent best een goede gids. Weet je dat?'],
    ['t', 'Ik lees alles van een bierviltje.'],
    ['A', 'Dan is het een goed bierviltje.'],
  ],
  hands: [
    ['A', 'Je hand.'],
    ['t', 'Wat is ermee?'],
    ['A', 'Die ligt op de mijne.'],
    ['t', 'Voor de grip.'],
    ['A', '…Natuurlijk.'],
  ],
  later: [
    ['A', 'Je praat de hele tijd tegen de toeristen.'],
    ['t', 'Dat is vandaag mijn werk.'],
    ['A', 'Praat straks eens tegen mij.'],
    ['t', '…Straks.'],
  ],
};
