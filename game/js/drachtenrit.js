// De rit naar Tjalke (#411): een zijmissie van één keer. Je hebt een paar biertjes op en een vriend in Drachten wacht. De rit gaat van een café in de
// stad over de A7 naar het westen: tussen het verkeer door, door een met pionnen afgezette rijstrook (een slalom, waarbij je er een paar omtikt), met de
// politie achter je aan, tot de wereld ophoudt aan de provinciegrens. Drachten zelf ligt buiten de wereld (de provincietegels beginnen op RD-x 205 km, Drachten
// ligt op ~193 km): de rit eindigt waar de A7 de wereld verlaat, met een aankomstmoment en een bericht van de vriend.
// Zuivere regels, geen DOM en geen three.js (scripts/drachtenrit_test.mjs); sidejob_tjalke.js zet ze om in de wereld. Alles is verzonnen: de vriend, het café,
// het bedrijf. Geen slachtoffers, geen merken (ook geen biermerk), en een droge afsluiting: het is geen aanmoediging, het is een zijmissie die het uitlegt.

// De vriend in één constante, zodat de eigenaar hem makkelijk kan veranderen.
export const VRIEND = 'Tjalke Rumsma';

export const RIT = {
  // het café waar je vertrekt (verzonnen, aan de westkant van de stad, aan de weg naar de A7: 4,5 km tot de oprit; het centrum zit vol voetgangers en politie) en de plekken op de A7 (RD New, wereldcoördinaten)
  start: { x: -1369, y: 1144, naam: 'Café De Laatste Ronde' },
  // de afzetting: op de westgaande rijbaan, 15 km na het centrum; richting in radialen (x oost, y zuid), de plek is gemeten op de wegenkaart
  slalom: { x: -12939, y: 4380, heading: 2.55 },
  // het einde: waar de A7 de wereld verlaat
  einde: { x: -25227, y: 10348 },
  dronken: 0.35,           // world.drunk: een lichte zwaai, nooit onbespeelbaar (drunk.js)
  slalomZicht: 520,        // de pionnen worden neergezet als je zo dichtbij bent (de wegen zijn dan geladen)
  slalomLengte: 76,        // de afzetting is zo lang (m)
  slalomNa: 150,           // na zoveel meter voorbij de laatste pion komt de politie
  eindeRadius: 260,        // zo dichtbij het einde telt als aangekomen
  sterren: 2,
  sterrenRuw: 3,           // vanaf zoveel omgetikte pionnen
  pionnenRuw: 6,
  schoon: 3,               // minder dan zoveel pionnen omgetikt: een nette slalom (fooi)
};

export const TEKST = {
  intro: [
    `${VRIEND} woont in Drachten, met een koelkast die vol is en een bank die leeg is. Hij vroeg of je langskomt.`,
    'Je hebt een paar biertjes op. Rij over de A7 naar het westen, door de pionnen en langs alles wat zwaait. Op eigen risico, zoals altijd.',
  ],
  start: `${VRIEND}: Kom je nog? De koelkast is vol en de bank is leeg.`,
  snelweg: 'De A7 op, naar het westen. De weg zwaait een beetje mee, jij ook.',
  slalomOp: 'Pionnen! De rijstrook is afgezet. Slalommen maar.',
  tik: ['Tik. Eén pion minder.', 'Tik, tik. De pionnen tellen mee.', 'Weer een pion. De rij wordt dunner.'],
  slalomKlaar: 'Door de pionnen. Een stuk rechtdoor, rustig ademhalen.',
  politieSchoon: 'Een patrouille ziet je slingeren en pakt de sirene. Wegwezen, de A7 is lang.',
  politieRuw: 'De politie zag de pionnen vallen. Wegwezen, de A7 is lang.',
  kwijt: 'Je bent ze kwijt. Een paar kilometer stilte op de A7.',
  grens: 'De provinciegrens. Aan de overkant begint Friesland, en ergens daarachter Drachten.',
  nogPolitie: 'Eerst de politie kwijt, dan pas aankomen.',
  klaarSchoon: `${VRIEND}: Ik zie je op de camera bij de grens. Netjes geslalomd. Had je een taxi kunnen nemen.`,
  klaarRuw: `${VRIEND}: Ik zie je op de camera bij de grens. Een rits pionnen en de politie erachteraan. Had je een taxi kunnen nemen.`,
  weg: 'De rit stopt hier. Tjalke wacht wel.',
  alGedaan: `${VRIEND} heeft de koelkast leeggegeten. Een tweede keer is een taxi waard.`,
};

export const PRIJS = { basis: 300, fooi: 100 };

export const FASEN = ['stad', 'snelweg', 'slalom', 'politie', 'grens', 'klaar'];

export function nieuweRit() {
  return { fase: 'stad', pionnen: 0, geraakt: 0, tikTekst: 0, politie: false, kwijt: false, alsterren: 0, waarschuwd: false, sterGezien: false, klaar: false };
}

// Een positie in de assen van de afzetting: along (m voorbij het midden, in rijrichting) en across (m opzij, positief rechts van de rijrichting).
export function langsAfzetting(p, slalom = RIT.slalom) {
  const dx = p.x - slalom.x, dy = p.y - slalom.y;
  const c = Math.cos(slalom.heading), s = Math.sin(slalom.heading);
  return { along: dx * c + dy * s, across: -dx * s + dy * c };
}

// De pionnen van de afzetting: vier blokken van vier pionnen, om en om de linker en de rechter helft van de rijbaan dicht, een taper van drie pionnen ervoor.
// center: { x, y }; heading: rijrichting (rad); breedte: de rijbaan (m). Geeft [{ x, y, along, across }] in wereldcoördinaten.
export function slalomPionnen(center, heading, breedte = 10.5) {
  const c = Math.cos(heading), s = Math.sin(heading);
  const half = breedte / 2;
  const at = (along, across) => ({ x: center.x + c * along - s * across, y: center.y + s * along + c * across, along, across });
  const out = [];
  // de taper: drie pionnen schuin vanaf de linkerkant naar de middenstreep (het eerste blok sluit de linkerhelft)
  for (let k = 0; k < 3; k++) out.push(at(-RIT.slalomLengte / 2 - 18 + k * 6, -(half - 1.4 - k * 1.6)));
  const blokken = 4, gap = RIT.slalomLengte / blokken;
  for (let b = 0; b < blokken; b++) {
    const links = b % 2 === 0;   // links = de kant van negatieve across (links van de rijrichting)
    for (let k = 0; k < 4; k++) {
      const breedtePlek = 0.8 + k * 1.15;   // van de middenstreep naar de kant
      out.push(at(-RIT.slalomLengte / 2 + b * gap + k * 0.6, links ? -breedtePlek : breedtePlek));
    }
  }
  return out;
}

// Een stap van de rit. inp: { afstandSlalom, along, afstandEinde, wanted, tikken (aantal omgetikt tot nu toe), snelheid, opWeg (staat op of bij de A7) }.
// Geeft gebeurtenissen: { type: 'snelweg' | 'slalom-op' | 'tik' | 'slalom-klaar' | 'politie' | 'kwijt' | 'grens' | 'klaar' }.
export function stapRit(s, inp, dt) {
  const ev = [];
  if (s.klaar) return ev;
  if (inp.tikken > s.pionnen) {
    for (let k = s.pionnen; k < inp.tikken; k++) ev.push({ type: 'tik', n: k + 1 });
    s.pionnen = inp.tikken;
  }
  if (s.fase === 'stad' && inp.opWeg) { s.fase = 'snelweg'; ev.push({ type: 'snelweg' }); }
  if ((s.fase === 'stad' || s.fase === 'snelweg') && inp.afstandSlalom < RIT.slalomZicht) { s.fase = 'slalom'; ev.push({ type: 'slalom-op' }); }
  if (s.fase === 'slalom' && inp.along > RIT.slalomLengte / 2 + 12) { s.fase = 'politie'; ev.push({ type: 'slalom-klaar' }); }
  if (s.fase === 'politie' && !s.politie && inp.along > RIT.slalomLengte / 2 + RIT.slalomNa) {
    s.politie = true;
    s.alsterren = s.pionnen >= RIT.sterrenRuw ? (s.pionnen >= RIT.pionnenRuw ? RIT.sterrenRuw : RIT.sterren) : RIT.sterren;
    ev.push({ type: 'politie', ruw: s.pionnen >= RIT.sterrenRuw, sterren: s.alsterren });
  }
  // kwijt: de sterren zijn er geweest (de adapter zet ze na de gebeurtenis 'politie', dus pas een stap later) en nu weer weg
  if (s.politie && inp.wanted > 0) s.sterGezien = true;
  if (s.fase === 'politie' && s.politie && s.sterGezien && inp.wanted === 0 && !s.kwijt) { s.kwijt = true; s.fase = 'grens'; ev.push({ type: 'kwijt' }); }
  // de afstand tot het einde telt alleen na de slalom: de rit begint in de stad en loopt dan naar het westen
  const voorbij = s.fase === 'politie' || s.fase === 'grens';
  if (voorbij && inp.afstandEinde < RIT.eindeRadius) {
    if (inp.wanted > 0) { if (!s.waarschuwd) { s.waarschuwd = true; ev.push({ type: 'nog-politie' }); } }
    else { s.klaar = true; s.fase = 'klaar'; ev.push({ type: 'klaar', schoon: s.pionnen < RIT.schoon }); }
  }
  return ev;
}

export function ritResultaat(s) {
  const schoon = s.pionnen < RIT.schoon;
  return {
    base: PRIJS.basis,
    tip: schoon ? PRIJS.fooi : 0,
    flawless: schoon,
    text: schoon ? TEKST.klaarSchoon : TEKST.klaarRuw,
  };
}
