// Golfetiquette op de pitch & putt-baan (#394): twee verzonnen figuren met een eigen stem in de tekst en twee spelregels als grapje.
// Wolfie, de baanmedewerker, praat met een Duits/Zuid-Afrikaans aandoend accent ("ja-nee", "net nou", "laat de pendule maar doen");
// Sir Cedric, de golfer, is hoogdravend en doet nederig over beginners zonder eigen kluppen ("moet je nog huren?").
// Het zijn karikaturen met verzonnen namen, niet herleidbaar tot een echt persoon of beroep (constitution 2). Alleen tekst in
// tekstballonnen, geen opgenomen stem. De regels: stil staan als iemand slaat, en de speelvolgorde (de eer) niet omdraaien; wie
// dat toch doet krijgt een kleine reactie en geen straf. Puur (geen DOM, geen THREE): pitchputt.js tekent en speelt het af,
// scripts/golfetiquette_test.mjs draait de regels.
export const WOLFIE = 'Wolfie';
export const SIR = 'Sir Cedric';

export const ETQ_LINES = {
  wolfie: {
    // bij het hutje bij de eerste tee, als je langs loopt
    hallo: [
      'Ja-nee, welkom! Kluppen nodig? Die liggen in de kast, net nou.',
      'De baan ligt er ordentelijk bij. Zes banen, geen haast.',
      'Niks aan de hand, hoor. Laat de pendule maar doen.',
      'Kijk naar de vlag, niet naar mij. Ja-nee, mij kennen ze al.',
    ],
    huren: ['Huren? Alles gratis, meneer. De pendule rekent niet af.', 'Ja-nee, kluppen zat. Met de hand gepoetst, net nou.'],
    pendule: [
      'Ach, laat de pendule maar doen. Die komt wel weer recht.',
      'Zand? Laat de pendule maar doen, die harkt het zo glad.',
      'Niet piekeren. De pendule weet de weg.',
    ],
    eerSir: ['De eer is aan meneer Cedric. Jij komt zo, ja-nee.', 'Eerst meneer Cedric, dan jij. Zo hoort dat.'],
    eerSpeler: ['De eer is aan jou! Lekker, sla maar.', 'Jij mag eerst. Ordentelijk gedaan, die vorige baan.'],
    stil: ['Sst! Stil staan bij een slag. Zo doen wij dat hier.', 'Ja-nee, even stil. Een slag is een slag.'],
    volgorde: ['Wacht even, de eer ligt bij meneer Cedric. Ja-nee, de volgorde is heilig.', 'Eerst de eer, dan jij. Zo blijft het gezellig.'],
    eind: ['Ordentelijke ronde! De pendule is trots.', 'Klaar-klaar. Kluppen mag je zo laten liggen.'],
  },
  sir: {
    start: [
      'Moet je nog huren?',
      'Geen eigen kluppen? Wat charmant. Ieder moet ergens beginnen, nietwaar.',
      'Ik kijk niet neer op beginners. Mijn kraag is gewoon erg stijf.',
    ],
    eer: ['De eer is aan mij, vanzelfsprekend.', 'Ik sla eerst, als u het niet erg vindt. Of ook als u het wel erg vindt.'],
    slag: ['Een nette slag. Een beetje geluk hoort erbij.', 'Zo hoort het. Van vader op zoon.', 'Hm. De wind. Het is altijd de wind.'],
    volgorde: ['Pardon. Wij slaan op volgorde, jongeman.', 'Ik had de eer, maar goed. Gaat u gerust voor.', 'Hmpf. Op deze baan telt de volgorde nog.'],
    stil: ['Zou u zo vriendelijk willen zijn stil te staan?', 'Een slag is geen schouwspel. Behalve de mijne.'],
    kijken: ['Ik sta stil, zoals het hoort. Doe maar, doe maar.', 'Stokstijf, zoals het hoort. Slaat u gerust.'],
    sirBeter: ['Ik noteer een {n}. De eer is dus aan mij.', 'Een {n}, natuurlijk. U kunt het van mij leren.'],
    spelerBeter: ['Een {n} voor mij. De eer is aan u, beginnersgeluk.', 'Ik had er {n}. U mag eerst, hoogst vermakelijk.'],
    gelijk: ['Ook een {n}. De eer blijft waar ze was.', 'Gelijk, met een {n}. Hoogst toevallig.'],
    birdie: ['Beginnersgeluk. Bij mij heet het ervaring.', 'Onder par? Hoogst opmerkelijk, voor iemand zonder eigen kluppen.'],
    bogey: ['Een zeer eerzaam resultaat.', 'Ieder moet ergens beginnen, ik zei het al.'],
    eenSlag: ['In één slag. Dat... dat telt vandaag, neem ik aan.'],
    endGood: ['Voor een beginner verrassend verdienstelijk.', 'Netjes. Ik had niets anders verwacht, vanzelfsprekend.'],
    endPoor: ['Het is maar een spel. Dat zegt men mij ook wel eens.', 'Volgende keer huurt u gewoon.'],
  },
};

// Elke regel die de speler kan lezen, voor de tests en de audits
export const ALLE_ETQ_REGELS = Object.entries(ETQ_LINES).flatMap(([wie, groep]) => Object.entries(groep).flatMap(([sleutel, lijst]) => lijst.map((tekst) => ({ wie, sleutel, tekst }))));

const pick = (lijst, rand) => lijst[Math.floor(rand() * lijst.length)];
export const vul = (tekst, n) => tekst.replace('{n}', String(n));

// ---- de score van Sir Cedric ----

// Zijn slagen op een baan: meestal par of een erboven; nu en dan een birdie, soms twee erboven.
export function sirScore(par, rand = Math.random) {
  const r = rand();
  return par + (r < 0.12 ? -1 : r < 0.5 ? 0 : r < 0.85 ? 1 : 2);
}

// Wie het laagst scoorde op de vorige baan heeft op de volgende tee de eer; bij gelijk houdt de vorige zijn eer.
export function eerNa(vorige, spelerRel, sirRel) {
  if (spelerRel < sirRel) return 'speler';
  if (sirRel < spelerRel) return 'sir';
  return vorige;
}

// ---- de baan door ----

export const PEND_S = 2.6; // Sir Cedric loopt naar de tee en richt zich
export const SWING_S = 1.1; // zijn slag zelf: dan staat iedereen stil
export const KIJKEN_KANS = 0.5;

export function newEtiquette(rand = Math.random) {
  return { rand, eer: 'sir', hole: null, sirRel: 0, spelerRel: 0, gepraat: 0, boos: 0 };
}

// Begin van een baan: de eer is bepaald, Sir Cedric neemt hem of wacht.
export function beginHole(e, par) {
  e.hole = { par, fase: e.eer === 'sir' ? 'wacht' : 'toekijken', t: 0, gezegd: new Set(), sirScore: sirScore(par, e.rand) };
  const ev = [];
  if (e.gepraat === 0) { ev.push(say(e, 'sir', 'start'), say(e, 'wolfie', 'huren')); e.gepraat = 1; }
  if (e.eer === 'sir') ev.push(say(e, 'sir', 'eer'), say(e, 'wolfie', 'eerSir'));
  else ev.push(say(e, 'wolfie', 'eerSpeler'));
  return ev;
}

function say(e, wie, sleutel, n) {
  const tekst = pick(ETQ_LINES[wie][sleutel], e.rand);
  return { wie, sleutel, tekst: n === undefined ? tekst : vul(tekst, n) };
}

// Eén stap. ctx: { laadt: de speler houdt Spatie vast, draait: de speler richt met A/D, schiet: de speler sloeg nu }.
// Geeft de gebeurtenissen terug ({ wie, sleutel, tekst }); nooit een straf: de slagen van de speler blijven zoals ze zijn.
export function step(e, dt, ctx = {}) {
  const h = e.hole;
  const ev = [];
  if (!h) return ev;
  h.t += dt;
  const eenmaal = (k) => { if (h.gezegd.has(k)) return false; h.gezegd.add(k); return true; };
  if (h.fase === 'wacht') {
    // Sir Cedric heeft de eer: wie voor zijn slag al laadt, draait de volgorde om
    if ((ctx.laadt || ctx.schiet) && eenmaal('volgorde')) { e.boos++; ev.push(say(e, 'sir', 'volgorde'), say(e, 'wolfie', 'volgorde')); }
    if (h.t >= PEND_S) { h.fase = 'slag'; h.t = 0; }
  } else if (h.fase === 'slag') {
    // zijn slag: stil staan; wie dan draait of laadt krijgt een sst
    if ((ctx.laadt || ctx.draait) && eenmaal('stil')) ev.push(say(e, 'wolfie', 'stil'), say(e, 'sir', 'stil'));
    if (h.t >= SWING_S) { h.fase = 'klaar'; h.t = 0; if (eenmaal('slag')) ev.push(say(e, 'sir', 'slag')); }
  } else if (h.fase === 'toekijken') {
    // de speler heeft de eer: Sir Cedric kijkt stil toe bij de slag
    if (ctx.schiet && eenmaal('kijken') && e.rand() < KIJKEN_KANS) ev.push(say(e, 'sir', 'kijken'));
  }
  return ev;
}

// De baan is uit: Sir Cedric noteert zijn score, de eer gaat naar de laagste, en hij reageert op die van de speler.
export function holeDone(e, par, spelerSlagen, door = 'cup') {
  const h = e.hole;
  const sirSlagen = h ? h.sirScore : par;
  const spelerRel = spelerSlagen - par, sirRel = sirSlagen - par;
  e.spelerRel += spelerRel;
  e.sirRel += sirRel;
  const vorige = e.eer;
  e.eer = eerNa(vorige, spelerRel, sirRel);
  const ev = [];
  if (door === 'cup' && spelerSlagen === 1) ev.push(say(e, 'sir', 'eenSlag'));
  else if (spelerRel < 0) ev.push(say(e, 'sir', 'birdie'));
  else if (spelerRel > 0 && e.rand() < 0.4) ev.push(say(e, 'sir', 'bogey'));
  const sleutel = sirRel < spelerRel ? 'sirBeter' : sirRel > spelerRel ? 'spelerBeter' : 'gelijk';
  ev.push(say(e, 'sir', sleutel, sirSlagen));
  e.hole = null;
  return ev;
}

// Wolfie op een misser: de pendule doet het wel.
export function misser(e) {
  return say(e, 'wolfie', 'pendule');
}

export function einde(e, goed) {
  return [say(e, 'sir', goed ? 'endGood' : 'endPoor'), say(e, 'wolfie', 'eind')];
}

// Wolfie bij het hutje, als de speler langsloopt
export function hallo(rand = Math.random) {
  return { wie: 'wolfie', sleutel: 'hallo', tekst: pick(ETQ_LINES.wolfie.hallo, rand) };
}
