// Zeeschepen als eigen loopbaan (#438): loodsen bij Lauwersoog en de Eemshaven.
// Puur: geen three.js, geen wereld, geen DOM. De wereldkant (sidejob_zeeschip.js) zet het
// schip neer en voedt deze regels met de plek en de snelheid van het schip.
//
// Een ronde is een uit-en-terug: van de kade de haven uit naar de boei op de rede, daar
// rustig keren en weer aanleggen bij de kade (langzaam en stil). In de haven geldt een
// lage limiet; te lang te hard kost de fooi en uiteindelijk de klus. Geen geweld, geen
// leed: een misser is een boze havenmeester of een schip dat nog op de rede ligt.
// De punten gaan naar het vak Water (loopbaan.js: BAAN_VAK), met per haven een eigen
// dienst (uniek) zodat Lauwersoog en de Eemshaven allebei tellen.
// Tests: scripts/zeeschipvaart_test.mjs.

export const HAVENS = [
  {
    id: 'zeeschipwad', haven: 'Lauwersoog', bedrijf: 'Loodswezen Wadden', kleur: '#2d6a8f',
    kade: { x: -23882, y: -19952 }, boei: { x: -24157, y: -20142 },
    intro: ['Loodswezen Wadden: een kustvaarder wacht aan de kade van Lauwersoog.', 'Breng hem de haven uit naar de boei, keer rustig en leg weer aan. In de haven vaar je stapvoets.'],
  },
  {
    id: 'zeeschipeems', haven: 'Eemshaven', bedrijf: 'Loodswezen Eems', kleur: '#2d4a63',
    kade: { x: 17303, y: -24937 }, boei: { x: 16973, y: -25002 },
    intro: ['Loodswezen Eems: in de Eemshaven ligt een kustvaarder klaar.', 'Naar de boei op de rede en terug naar de kade. Rustig aan: het is er druk.'],
  },
];

// De regels van een ronde. Maten in meters, snelheid in m/s, tijd in seconden.
export const VAART = {
  boeiR: 40,      // zo dichtbij telt de boei als gerond
  aanlegR: 45,    // zo dicht bij de kade mag je aanleggen
  aanlegV: 1.3,   // langzamer dan dit en je ligt stil genoeg
  limiet: 3.0,    // in de haven mag het niet harder
  havenR: 300,    // zo ver rond de kade geldt de havenlimiet
  budget: 260,    // seconden voor de hele ronde op niveau 1
  perNiveau: 25,  // zoveel seconden gaat er per niveau af
  tehardMax: 8,   // zoveel seconden te hard en de klus mislukt
};

export const havenById = (id) => HAVENS.find((h) => h.id === id) || null;

const clampNiveau = (level) => Math.max(1, Math.min(5, Math.round(Number.isFinite(level) ? level : 1)));

// Een schone ronde; null bij een onbekende haven.
export function maakVaart(id, level = 1) {
  const h = havenById(id);
  if (!h) return null;
  return {
    id: h.id, haven: h.haven, fase: 'uit', t: 0,
    budget: VAART.budget - (clampNiveau(level) - 1) * VAART.perNiveau,
    tehard: 0, stoten: 0, klaar: false, mislukt: false,
    koers: Math.atan2(h.boei.y - h.kade.y, h.boei.x - h.kade.x),
  };
}

// Waar de volgende stap heen gaat: eerst de boei, dan de kade.
export function doelVan(s) {
  const h = havenById(s && s.id);
  if (!h) return null;
  return s.fase === 'uit'
    ? { x: h.boei.x, y: h.boei.y, label: `de boei bij ${h.haven}` }
    : { x: h.kade.x, y: h.kade.y, label: `de kade van ${h.haven}` };
}

export const afstandTotDoel = (s, x, y) => {
  const d = doelVan(s);
  return d && Number.isFinite(x) && Number.isFinite(y) ? Math.hypot(d.x - x, d.y - y) : Infinity;
};

// Geldt hier de havenlimiet?
export function inHaven(s, x, y) {
  const h = havenById(s && s.id);
  if (!h || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  return Math.hypot(h.kade.x - x, h.kade.y - y) <= VAART.havenR;
}

export const faseTekst = (s) => (s && s.fase === 'terug' ? 'Terug naar de kade' : 'Op weg naar de boei');

// Eén stap. Geeft de gebeurtenissen: 'tehard', 'boei', 'klaar' of 'fail' (met `why`).
export function stapVaart(s, { x, y, speed = 0, bump = 0 } = {}, dt = 0) {
  const ev = [];
  if (!s || s.klaar || s.mislukt || !(dt > 0)) return ev;
  s.t += dt;
  if (bump > 0) s.stoten += bump;
  if (inHaven(s, x, y) && speed > VAART.limiet) {
    s.tehard += dt;
    ev.push({ type: 'tehard', rest: Math.max(0, VAART.tehardMax - s.tehard) });
    if (s.tehard >= VAART.tehardMax) { s.mislukt = true; ev.push({ type: 'fail', why: 'te vaak te hard gevaren in de haven' }); return ev; }
  }
  if (s.t > s.budget) { s.mislukt = true; ev.push({ type: 'fail', why: 'de loodsploeg staat niet langer te wachten' }); return ev; }
  const d = doelVan(s);
  const dist = Math.hypot(d.x - x, d.y - y);
  if (s.fase === 'uit') {
    if (dist <= VAART.boeiR) { s.fase = 'terug'; ev.push({ type: 'boei' }); }
  } else if (dist <= VAART.aanlegR && speed <= VAART.aanlegV) {
    s.klaar = true;
    ev.push({ type: 'klaar' });
  }
  return ev;
}

// Wat de ronde oplevert: op tijd, rustig in de haven en zonder stoten geeft de fooi.
export function uitslagVan(s) {
  if (!s || !s.klaar) return { base: 0, tip: 0, flawless: false, text: 'Het zeeschip ligt nog op de rede.', failed: true };
  const opTijd = Math.max(0, 1 - s.t / s.budget);
  const schoon = s.tehard === 0 && s.stoten < 0.2;
  return {
    base: Math.round(Math.max(0, 90 + opTijd * 70 - s.tehard * 4)),
    tip: schoon ? 30 : 0,
    flawless: schoon,
    text: schoon ? 'Netjes geloodst: de havenmeester knikt.' : 'Het schip ligt vast, maar de havenmeester keek even.',
    failed: false,
  };
}

// Voor het scherm: de regel onder de titel.
export const voortgangTekst = (s) => {
  if (!s || !s.klaar) return `${faseTekst(s)} \u00b7 nog ${Math.max(0, Math.ceil((s ? s.budget - s.t : 0)))} s`;
  return 'Aan de kade';
};
