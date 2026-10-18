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
