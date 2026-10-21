// Three more small text jobs for the Stad (refs #26): "Het Loket" (forms, a
// queue and a stamp), "StudieStaat" (an invented student-loan office) and
// "Vigilantia" (a made-up student society: toast and table speech). Each is a
// short round of three multiple-choice questions at a named building; a wrong
// answer only pays less. Pure rules and invented text only (no DOM, no THREE;
// scripts/keuzewerk_test.mjs tests them). Every body, name and rule is made up
// and meant as dry satire of paperwork and ceremony, never of a real person,
// a real body or a student in trouble. Nothing is destroyed or robbed.
import { makeRng } from './minigamekit.js';

const rngOf = (r) => (typeof r === 'function' ? r : makeRng(r || 1));
const shuffle = (list, rng) => {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// A case: q, right (the good answer), wrong (two wrong ones).
const C = (q, right, wrong) => ({ q, right, wrong });

export const KEUZE_JOBS = {
  loket: {
    id: 'loket',
    name: 'Het Loket',
    boss: 'Mevrouw Stempelaar',
    building: 'Loketgebouw',
    wgs: [53.2196, 6.5672],
    color: '#5aa07a',
    blurb: 'Help een bezoeker door formulier, wachtrij en stempel',
    tagline: 'Drie vragen aan het loket. Een fout antwoord kost alleen een stempel.',
    intro: [
      'Het Loket: hier is alles in tweevoud, behalve de stoelen.',
      'Mevrouw Stempelaar stelt drie vragen over het formulier. Antwoord met 1, 2 of 3.',
    ],
    say: {
      arrive: 'Je trekt nummer 417. Op het bord staat 12. Mevrouw Stempelaar knikt: "Gaat u zitten, dat duurt even."',
      quit: 'Je laat je nummertje vallen en loopt weg. Het bord springt naar 13.',
      deskTitle: 'LOKET · FORMULIER',
    },
    cases: [
      C('Het formulier "Aanvraag voor het aanvragen van een aanvraag" heeft twee vakjes voor een naam. Wat vul je in?', 'Voor- en achternaam, elk in een eigen vakje', ['Beide namen in het eerste vakje, het tweede blijft leeg als reserve', 'De naam van je buurman, die kent het Loket al']),
      C('De wachtrij is veertien nummers lang. Wat is de snelste weg naar het loket?', 'Rustig wachten tot je nummer wordt omgeroepen', ['Naar voren lopen en zwaaien met je pasje', 'Een tweede nummer trekken, dan heb je er twee']),
      C('De stempel zit nog in de la en de stempelaar is koffie halen. Wat doe je?', 'Even wachten tot de stempelaar terug is', ['Zelf in de la zoeken en stempelen', 'Het formulier met een viltstift lief aankijken']),
      C('Je formulier mist een handtekening. Waar zet je die?', 'Onderaan, in het vakje met het potloodje ernaast', ['Bovenaan, boven de naam van het formulier', 'Op de achterkant, zodat niemand het ziet']),
      C('De ambtenaar zegt: "Dit moet in drievoud." Hoeveel exemplaren breng je mee?', 'Drie', ['Twee, de derde hoeft niet', 'Vierendertig, voor de zekerheid']),
      C('Het loket sluit om vijf uur. Het is vijf over vijf. Wat doe je?', 'Morgen terugkomen met een koekje voor de stempelaar', ['De deur openbreken en toch even stempelen', 'Tot maandag blijven staan']),
    ],
    pay: { base: 24, perRight: 14, tipAll: 18 },
    verdicts: ['Het formulier is gestempeld. Mevrouw Stempelaar glimlacht, vrijwel onzichtbaar.', 'Bijna goed. Eén stempel moet nog, maar die kan morgen.', 'Het formulier gaat terug in de la. Maak je geen zorgen, het ligt er goed.'],
  },

  studiestaat: {
    id: 'studiestaat',
    name: 'StudieStaat-balie',
    boss: 'Meneer Rekenhof',
    building: 'Gemeente Groningen',
    wgs: [53.2159, 6.5704],
    color: '#c8a23c',
    blurb: 'Rekenen aan de balie van een verzonnen studieloket',
    tagline: 'Drie rekensommetjes aan de balie. Niets wordt gewist, alles wordt netjes uitgelegd.',
    intro: [
      'StudieStaat is een verzonnen balie waar studieleningen worden uitgelegd, nooit weggetoverd.',
      'Meneer Rekenhof vraagt drie dingen. Hij zegt altijd: "dat is uiteraard maar een schatting".',
    ],
    say: {
      arrive: 'Meneer Rekenhof schuift een rekenmachine over de balie. "De knoppen zijn groot. De bedragen niet."',
      quit: 'Je pakt je tas en stapt naar buiten. De rekenmachine blijft staan en telt zachtjes door.',
      deskTitle: 'STUDIESTAAT · BALIE',
    },
    cases: [
      C('Een student leent €300 per maand, twaalf maanden lang. Hoeveel is dat in een jaar?', '€3.600', ['€3.000', '€4.200']),
      C('Mevrouw Bakker (verzonnen) heeft €2.400 geleend en lost €80 per maand af. Hoe lang duurt het?', 'Dertig maanden', ['Twintig maanden', 'Veertig maanden']),
      C('Een lening van €1.000 krijgt per jaar €20 rente (verzonnen percentage). Wat is dat?', 'Twee procent', ['Twintig procent', 'Een half procent']),
      C('Je hebt twee studieleningen: €1.500 en €2.500. Hoeveel is dat samen?', '€4.000', ['€3.500', '€4.500']),
      C('Meneer Rekenhof zegt: "Dit is aflosbaar in vijf jaar." Hoeveel maanden is dat?', 'Zestig maanden', ['Vijftig maanden', 'Zeventig maanden']),
      C('Een boekenbon van €45 hoort bij de uitgaven. De student heeft er drie. Hoeveel is dat?', '€135', ['€90', '€145']),
    ],
    pay: { base: 30, perRight: 16, tipAll: 20 },
    verdicts: ['Alles klopt tot op de cent. Meneer Rekenhof haalt zijn zakdoekje tevoorschijn.', 'Een paar sommen kloppen. De rest wordt "uiteraard maar een schatting".', 'Er komt een uitleg per post, in tweevoud.'],
  },

  vigilantia: {
    id: 'vigilantia',
    name: 'Borrel bij Vigilantia',
    boss: 'Praeses Wilgenhout',
    building: 'Academiegebouw',
    wgs: [53.2189, 6.5614],
    color: '#8a5ac8',
    blurb: 'Houd de tafelspeech op de borrel van een verzonnen studentenvereniging',
    tagline: 'Drie keuzes in de speech. Het gaat om de toon, niet om de glazen.',
    intro: [
      'Vigilantia is een verzonnen studentenvereniging met een veel te lange traditie.',
      'Praeses Wilgenhout vraagt of jij de tafelspeech houdt. Kies drie keer de zin die past.',
    ],
    say: {
      arrive: 'Praeses Wilgenhout tikt tegen zijn glas. "Dames en heren, een dankwoord, een grapje en een heildronk, in die volgorde."',
      quit: 'Je zet je glas neer en glipt naar de uitgang. Niemand merkt het, behalve de portier.',
      deskTitle: 'VIGILANTIA · TAFELSPEECH',
    },
    cases: [
      C('Hoe begin je de speech?', 'Met een dankwoord aan de gastheer', ['Met een lange lijst van je eigen prestaties', 'Met "Hé, wie heeft er nog bier?"']),
      C('De borrel is dit jaar kleiner dan vorig jaar. Wat zeg je?', '"Dit jaar zijn we met minder, maar de koekjes zijn per hoofd groter."', ['"Wie was er vorig jaar ook weer?"', '"Dit is de saaiste borrel ooit."']),
      C('Je wilt een heildronk uitbrengen. Wat doe je?', 'Je heft je glas en wacht tot iedereen mee heft', ['Je drinkt alvast op, de rest haalt je wel in', 'Je zet je glas op de tafel van een ander']),
      C('Iemand vraagt om stilte voor de speech. Wat doe je?', 'Je wacht tot het stil is', ['Je klopt met je lepel op het glas van de buurman', 'Je zingt alvast mee met het lied van gisteren']),
      C('De traditie vraagt om een dank aan de oudleden. Hoe doe je dat?', 'Kort en hartelijk, met een kleine buiging', ['Je roept hun namen door elkaar', 'Je slaat het over, ze zijn toch al weg']),
      C('Je speech is bijna afgelopen. Hoe sluit je af?', 'Met "Proost" en een knikje naar de praeses', ['Met "Dat was het dan, doei"', 'Met een tweede speech, nog langer dan de eerste']),
    ],
    pay: { base: 26, perRight: 15, tipAll: 18 },
    verdicts: ['Een warm applaus. Zelfs de portier klapt mee.', 'De zaal knikt beleefd. Een paar glazen blijven in de lucht hangen.', 'Stilte. Na een tijdje begint iemand maar over het weer.'],
  },

  kamerkoning: {
    id: 'kamerkoning',
    name: 'Kamerkoning',
    boss: 'Huismeester Plafond',
    building: 'Polluxflat',
    wgs: [53.2418, 6.533],
    color: '#d0703c',
    blurb: 'Help in de verzonnen studentenflat Kamerkoning, waar de verwarming op zomer blijft hangen',
    tagline: 'Drie vragen in de flat. Het is er te heet, de koffie blijft koud.',
    intro: [
      'Kamerkoning is een verzonnen studentenflat. De verwarming staat op "tropisch" en niemand weet waarom.',
      'Huismeester Plafond vraagt drie dingen. Antwoord met 1, 2 of 3.',
    ],
    say: {
      arrive: 'Huismeester Plafond veegt zijn voorhoofd af. "Het is hier zo warm dat de ficus om een ventilator vraagt."',
      quit: 'Je laat de sleutelbos op de gang liggen en neemt de trap naar buiten. Boven gaat een raam open.',
      deskTitle: 'KAMERKONING · HUISMEESTER',
    },
    cases: [
      C('De thermostaat op de gang staat op 31 graden. Wat doe je als eerste?', 'Hem lager zetten en een briefje voor de huismeester ophangen', ['Een jas aandoen, dan merk je het minder', 'Hem hoger zetten, dan breekt hij vanzelf']),
      C('Kamer 14 wordt leeggeruimd. Wie moet daar vooraf van weten?', 'De bewoner, via een briefje onder de deur', ['Niemand, iedereen is toch op vakantie', 'Alleen de buurman met de grootste speakers']),
      C('Er staat een koelkast op de gang met vijf namen erop. Van wie is de pudding?', 'Van degene wiens naam erop staat', ['Van degene met de grootste honger', 'Van de flat, dat is eerlijk verdeeld']),
      C('De lift is kapot en je moet drie dozen naar de zesde. Wat doe je?', 'Een voor een dragen en onderweg pauzeren', ['Alle drie tegelijk, het komt vanzelf goed', 'De dozen op de trap laten staan als decoratie']),
      C('Een bewoner klaagt over de hitte. Wat zeg je?', '"Dat is vervelend, ik ga het nu melden."', ['"Dat is zomer, doe een trui uit."', '"Wij hebben hier geen thermometer."']),
      C('Het feestje van boven is om middernacht nog niet gestopt. Wat doe je?', 'Vriendelijk aanbellen en vragen of het zachter kan', ['Je speelt harder muziek terug', 'Je zet de zekering uit en schuilt']),
    ],
    pay: { base: 24, perRight: 14, tipAll: 18 },
    verdicts: ['De verwarming staat weer normaal. Huismeester Plafond zet zijn pet af.', 'Iets koeler, iets rommeliger. De ficus leeft nog.', 'De flat blijft tropisch. Iemand zet maar een kinderbadje op de gang.'],
  },

  wolkenhal: {
    id: 'wolkenhal',
    name: 'Wolkenhal Zernike',
    boss: 'Bewaker Slagboom',
    building: 'bewakingspost Zernike',
    wgs: [53.2399, 6.5366],
    color: '#4a90c8',
    blurb: 'Regel de toegang tot een verzonnen datahal: bewakers, dozen en een slagboom',
    tagline: 'Drie vragen bij de slagboom. Er wordt niets gesaboteerd, alleen netjes gecontroleerd.',
    intro: [
      'Wolkenhal Zernike is een verzonnen datahal vol zoemende kasten en een felle slagboom.',
      'Bewaker Slagboom wil weten hoe jij de poort bemant. Kies steeds de zin die past.',
    ],
    say: {
      arrive: 'Bewaker Slagboom wijst naar een klembord. "Naam, kenteken en waarom u dozen draagt. In die volgorde."',
      quit: 'Je zet je bezoekerspas op de balie en loopt de parkeerplaats af. De slagboom gaat vanzelf omhoog, uit sympathie.',
      deskTitle: 'WOLKENHAL · POORT',
    },
    cases: [
      C('Een bezoeker heeft geen pasje. Wat doe je?', 'Je belt de afspraak na en geeft een gastpas', ['Je laat hem door omdat hij zo vriendelijk kijkt', 'Je stuurt hem naar de achterdeur, die staat altijd open']),
      C('Er arriveert een vrachtwagen met veertig dozen. Hoe controleer je die?', 'Je vergelijkt de vrachtbrief met het aantal dozen', ['Je telt tot tien en zegt dat het klopt', 'Je schudt een doos en luistert']),
      C('De slagboom blijft omlaag hangen. Wat doe je?', 'Je meldt het bij de technische dienst en wijst een omleiding aan', ['Je tilt hem zelf op met een bezemsteel', 'Je stuurt iedereen naar huis, de datahal is verhuisd']),
      C('Een kast piept zachtjes. Wat doe je?', 'Je meldt het aan de beheerder, de kast is niet van jou', ['Je trekt de stekker eruit om het stil te krijgen', 'Je zingt zachtjes mee']),
      C('Een rondleiding voor scholieren komt langs. Wat is de regel?', 'Ze blijven bij de gids en raken niets aan', ['Ze mogen de kasten tellen, ook door erop te drukken', 'Ze mogen een kast mee naar huis voor het werkstuk']),
      C('Het is lunchtijd en niemand bemant de poort. Wat doe je?', 'Je wacht op een collega voor je weggaat', ['Je plakt een briefje "terug over een uur" en vertrekt', 'Je laat de poort openstaan en neemt een broodje']),
    ],
    pay: { base: 28, perRight: 15, tipAll: 20 },
    verdicts: ['Alles staat op groen. Bewaker Slagboom knikt tevreden bij elke kast.', 'De hal draait nog, met een paar wijzende vingers erbij.', 'De slagboom gaat open en dicht zoals hij zelf wil. Iemand belt de beheerder.'],
  },

  helix: {
    id: 'helix',
    name: 'Verfblokkade Helix',
    boss: 'Pleinmeester Kwast',
    building: 'De Helix',
    wgs: [53.2253, 6.578],
    color: '#e0587c',
    blurb: 'Een verzonnen verfblokkade bij een afgesloten plein: beslis wat je doet met emmers en lint',
    tagline: 'Drie keuzes bij de Helix. De verf blijft in de emmer, het lint aan de paal.',
    intro: [
      'Bij de Helix staat een plein afgesloten, met oranje hekken en een emmer die niemand heeft neergezet.',
      'Pleinmeester Kwast vraagt of jij helpt de zaak vreedzaam op te lossen. Kies zorgvuldig.',
    ],
    say: {
      arrive: 'Pleinmeester Kwast staat met een kwast achter zijn rug. "Ik heb niets aangeraakt, maar de hekken zagen er koud uit."',
      quit: 'Je zet de emmer terug waar je hem vond en loopt weg. Een meeuw bekijkt het lint kritisch.',
      deskTitle: 'HELIX · PLEIN',
    },
    cases: [
      C('Een plein is afgesloten voor een evenement. Wat doe je?', 'Je loopt om en leest het bord met de omleiding', ['Je klimt over het hek, er zal wel een gat in zitten', 'Je zet het hek verder naar achteren']),
      C('Er staat een emmer verf naast het hek. Van wie is die?', 'Van de schilder, je laat hem staan en meldt het', ['Van niemand, dus van jou', 'Van de meeuw die er net op zit']),
      C('Iemand vraagt of je meedoet aan een protest tegen het hek. Wat zeg je?', '"Dat doe ik rustig, zonder iets te beschadigen."', ['"Prima, ik haal even alle verf."', '"Ik zet het hek zelf wel op fietsen."']),
      C('Het lint bij de Helix hangt los. Wat doe je?', 'Je knoopt het netjes vast aan de paal', ['Je hangt het om je schouders als sjerp', 'Je knipt een stukje voor je collectie']),
      C('Een groep kinderen wil op het plein tekenen. Hoe pak je dat aan?', 'Je wijst een stuk stoep aan met stoepkrijt', ['Je geeft ze de verfemmer en loopt weg', 'Je zegt dat tekenen verboden is voor iedereen']),
      C('De beheerder komt terug en vraagt wat er is gebeurd. Wat zeg je?', 'De waarheid, in een paar rustige zinnen', ['Dat de meeuw het deed', 'Dat het een kunstwerk is, tegen betaling']),
    ],
    pay: { base: 26, perRight: 14, tipAll: 18 },
    verdicts: ['Het plein is weer van iedereen. De emmer blijft dicht, de meeuw ook.', 'Er zit een veeg verf op een hek, maar niemand merkt het.', 'Het plein blijft nog even dicht. De verf droogt in de emmer.'],
  },

  niemeyer: {
    id: 'niemeyer',
    name: 'Robotkok Niemeyer',
    boss: 'Kamerbeheerder Chip',
    building: 'Niemeyer',
    wgs: [53.2149, 6.5798],
    color: '#58b0a0',
    blurb: 'Leid de verzonnen robotkok in de AI-kamer van het Niemeyer-gebouw door zijn recept',
    tagline: 'Drie vragen aan de robotkok. Hij kookt altijd netjes, behalve met woorden.',
    intro: [
      'In het Niemeyer-gebouw staat een verzonnen AI-kamer met een robotkok, "Pannenkoek 3000".',
      'Kamerbeheerder Chip wil dat jij hem vragen stelt. Kies de zin die hij begrijpt.',
    ],
    say: {
      arrive: 'De robotkok draait zijn hoofd en piept. Kamerbeheerder Chip fluistert: "Praat langzaam, hij leest van links naar rechts."',
      quit: 'Je zet de spatel terug en loopt de gang uit. Achter je zingt de robotkok een toonladder.',
      deskTitle: 'NIEMEYER · AI-KAMER',
    },
    cases: [
      C('De robotkok vraagt wat je wilt eten. Wat zeg je?', '"Een pannenkoek met stroop, graag."', ['"Iets met een gat erin, maar niet te groot."', '"Maak maar wat, ik kijk wel."']),
      C('Hij zegt: "Mijn recept bevat zeven stappen." Hoe controleer je dat?', 'Je vraagt hem de stappen op te lezen', ['Je telt zijn knipperlichten', 'Je neemt aan dat het er acht zijn']),
      C('Een stap is "voeg een teentje knoflook toe", maar het is een pannenkoek. Wat doe je?', 'Je meldt het aan Chip, het recept moet worden gecorrigeerd', ['Je voegt het toe, het recept zal wel kloppen', 'Je gooit het hele deeg in de gracht']),
      C('De robotkok blijft maar "een momentje" zeggen. Wat doe je?', 'Je wacht even en vraagt dan of hij opnieuw wil beginnen', ['Je tikt hem op zijn hoofd tot hij stopt', 'Je trekt de stekker eruit en neemt hem mee']),
      C('Hij biedt je een pannenkoek van zeventig centimeter aan. Wat zeg je?', '"Een kleinere graag, ik heb maar één bord."', ['"Prima, ik eet hem op de fiets."', '"Ik neem er twee, voor mijn schaduw."']),
      C('De kamer lijkt te heet. Hoe vraag je dat aan Chip?', '"Kan de ventilator aan, graag?"', ['"Is hier een brandje?"', '"Zet maar alle ramen open, ook die van de buren."']),
    ],
    pay: { base: 26, perRight: 14, tipAll: 19 },
    verdicts: ['De pannenkoek is perfect rond. De robotkok maakt een kleine buiging.', 'Een pannenkoek met een gat. Chip noemt het "stijl".', 'De robotkok serveert een stapel lege borden. Iedereen klapt toch beleefd.'],
  },

  bernard: {
    id: 'bernard',
    name: 'Bernhard en zijn karretje',
    boss: 'Bernhard',
    building: 'Groninger Museum',
    wgs: [53.2123, 6.5731],
    color: '#9a7a4a',
    blurb: 'Help Bernhard, de verzonnen zwerver met het karretje, door een rustige dag in het centrum',
    tagline: 'Drie vragen onderweg. Bernhard vraagt weinig, maar hij vraagt het vriendelijk.',
    intro: [
      'Bernhard is een verzonnen zwerver met een karretje vol verhalen en één grote paraplu.',
      'Hij vraagt of jij hem helpt met een paar kleine dingen. Droog en menselijk, nooit spot met hem.',
    ],
    say: {
      arrive: 'Bernhard tikt tegen zijn pet. "Goedemorgen. Ik zoek niets, maar als u iets vindt, is het van mij."',
      quit: 'Je groet Bernhard en loopt verder. Hij zwaait met zijn paraplu, alsof hij je uitzwaait.',
      deskTitle: 'BERNARD · KARRETJE',
    },
    cases: [
      C('Bernhard zegt dat zijn karretje te zwaar is. Wat doe je?', 'Je vraagt of je kunt helpen en tilt het samen met hem', ['Je pakt het karretje en rijdt weg', 'Je zegt dat hij het gewoon moet laten staan']),
      C('Hij wil weten hoe laat het is. Wat zeg je?', 'Je kijkt op je horloge en zegt de tijd', ['Dat het een mooie dag is voor een paraplu', 'Dat de tijd niet bestaat']),
      C('Een voorbijganger kijkt boos naar Bernards karretje. Wat doe je?', 'Je zegt vriendelijk dat het karretje er mag staan', ['Je kijkt net zo boos terug', 'Je duwt het karretje in de gracht']),
      C('Bernhard vertelt over een vis die kon fietsen. Wat doe je?', 'Je luistert en lacht op de goede plekken', ['Je onderbreekt hem met je eigen vis', 'Je zegt dat vissen niet kunnen fietsen']),
      C('Hij biedt je een appel uit zijn karretje aan. Wat zeg je?', '"Dank u, die houd ik voor later."', ['"Doe maar vijf, ik heb honger."', '"Appels zijn voor de gracht."']),
      C('Bernhard zoekt een bankje in de schaduw. Wat doe je?', 'Je wijst hem het bankje bij de bomen', ['Je wijst het bankje in de volle zon', 'Je zegt dat bankjes verboden zijn']),
    ],
    pay: { base: 22, perRight: 13, tipAll: 16 },
    verdicts: ['Bernhard knikt dankbaar. De paraplu gaat open, uit pure vreugde.', 'Een paar dingen gelukt. Bernhard doet alsof het precies zo bedoeld was.', 'Bernhard zwaait vriendelijk. Hij heeft het toch nooit zo precies genomen.'],
  },
};

export const KEUZE_IDS = Object.keys(KEUZE_JOBS);
export const QUESTIONS_PER_ROUND = 3;

// Three cases, avoiding last round's questions when enough others remain; options shuffled.
export function pickKeuzeRound(jobId, rng = Math.random, lastQs = []) {
  const job = KEUZE_JOBS[jobId];
  const r = rngOf(rng);
  const fresh = job.cases.filter((c) => !lastQs.includes(c.q));
  const pool = fresh.length >= QUESTIONS_PER_ROUND ? fresh : job.cases;
  return shuffle(pool, r).slice(0, QUESTIONS_PER_ROUND).map((c) => ({
    q: c.q,
    options: shuffle([{ text: c.right, ok: true }, ...c.wrong.map((t) => ({ text: t, ok: false }))], r),
  }));
}

export function keuzePay(jobId, right, total = QUESTIONS_PER_ROUND) {
  const p = KEUZE_JOBS[jobId].pay;
  const v = KEUZE_JOBS[jobId].verdicts;
  const all = right >= total;
  return {
    base: p.base + p.perRight * right,
    tip: all ? p.tipAll : 0,
    flawless: all,
    verdict: all ? v[0] : right >= Math.ceil(total / 2) ? v[1] : v[2],
  };
}
