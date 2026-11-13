// #837: vijf onderdelen voor één unieke auto, op bestaande plekken in de provincie.
// Puur: geen DOM, geen three, geen opslag en geen klok; de live-laag doet de vondst.
export const ONDERDELEN_TOTAAL = 5;
export const ONDERDEEL_R = 10;
export const PRESTATIE_SET = 'autodelen';
export const ONDERDEEL_AUTO = {
  id: 'knutselwagen', make: 'Eigen Maaksel', model: 'Knutselwagen', basis: 'mug', kleur: '#b8621f',
};

const ONDERDELEN = [
  { id: 'molenwiek', naam: 'Molenwiek', plek: 'Molen Germania bij Thesinge', x: 5767, y: -5625.8, omschrijving: 'Een oude wiek die iemand keurig heeft afgezaagd. Zonde, maar mooi voor de auto.' },
  { id: 'sierhek', naam: 'Sierhek', plek: 'Familiepark Nienoord', x: -11149.1, y: 5736.3, omschrijving: 'Een stuk smeedijzer met een krul erin; het past precies op een motorkap.' },
  { id: 'ankerketting', naam: 'Ankerketting', plek: 'Achter Diek bij Zoutkamp', x: -18041.3, y: -13035, omschrijving: 'Zwaar, roestig en nog verrassend heel. Voor de trekhaak of gewoon als sieraad.' },
  { id: 'windvaan', naam: 'Windvaan', plek: 'Molen Adam in Delfzijl', x: 23844, y: -12839.8, omschrijving: 'Een haan die altijd de verkeerde kant op wijst. Als hij beweegt, weten we genoeg.' },
  { id: 'vestingskanon', naam: 'Vestingskanon', plek: 'Vestingmolen Bourtange', x: 42441.9, y: 22704.1, omschrijving: 'Geen kruit meer, wel een mooie loop. Voor de uitlaat, als siertekening.' },
];

export const onderdelen = () => ONDERDELEN.map((p) => ({ ...p }));
export const onderdeelId = (x, y, straal = ONDERDEEL_R) => {
  for (const p of ONDERDELEN) if (Math.hypot(p.x - x, p.y - y) <= straal) return p.id;
  return null;
};
const gezienSet = (gezien) => {
  if (gezien instanceof Set) return gezien;
  if (typeof gezien === 'function') return new Set(ONDERDELEN.map((p) => p.id).filter((id) => gezien(id)));
  if (Array.isArray(gezien)) return new Set(gezien);
  return new Set();
};
export const heeftAlle = (gezien) => {
  const s = gezienSet(gezien);
  return ONDERDELEN.every((p) => s.has(p.id));
};
export function stand(gezien) {
  const s = gezienSet(gezien);
  const gevonden = ONDERDELEN.filter((p) => s.has(p.id));
  return {
    totaal: ONDERDELEN.length, gevonden: gevonden.length, compleet: gevonden.length === ONDERDELEN.length,
    onderdelen: ONDERDELEN.map((p) => ({ ...p, gezien: s.has(p.id) })),
    ontbrekend: ONDERDELEN.filter((p) => !s.has(p.id)).map((p) => p.id),
  };
}
export const autoNaam = () => ONDERDEEL_AUTO.model;
