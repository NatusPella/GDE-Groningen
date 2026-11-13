// #839: drie duikplekken bij bestaande waterplekken in de Wadden/Lauwersmeer, met een wrak
// en één vondst per plek. Puur: geen DOM, geen three, geen opslag en geen klok.
export const WRAKVONDSTEN_SET = 'wrakvondsten';
export const WRAKDUIKEN_STAT = 'wrakduiken';
export const DUIK_R = 30;

const PLEKKEN = [
  {
    id: 'lauwersmeer', naam: 'Lauwersmeer, oude pier', water: 'Lauwersmeer', x: -22744.8, y: -14141.8,
    bron: { plekId: 8262292 },
    wrak: { naam: 'De Blauwe Snik', diepteM: 4.2 },
    vondst: { id: 'scheepsklok', naam: 'Scheepsklok', tekst: 'Een koperen klok met een deuk erin. Hij luidt nog één keer, zacht.' },
  },
  {
    id: 'lauwersoog', naam: 'Lauwersoog, Noordergat', water: 'Waddenzee', x: -24210.3, y: -20486.6,
    bron: { plekId: 4313654 },
    wrak: { naam: 'De Lamme Hand', diepteM: 6.8 },
    vondst: { id: 'verrekijker', naam: 'Koperen verrekijker', tekst: 'Zilt en dof, maar door de lens zie je de pier ineens heel dichtbij.' },
  },
  {
    id: 'delfzijl', naam: 'Delfzijl, bij Het Dok', water: 'Eems', x: 23587.8, y: -12194.8,
    bron: { plekId: 59832748 },
    wrak: { naam: 'De Kleine Eems', diepteM: 3.4 },
    vondst: { id: 'porseleinen-bord', naam: 'Porseleinen bord', tekst: 'Een blauw-wit bord, heel gebleven. Er staat een molen op, natuurlijk.' },
  },
];

export const duikplekken = () => PLEKKEN.map((p) => ({ ...p, wrak: { ...p.wrak }, vondst: { ...p.vondst } }));
export const duikplekVoor = (id) => PLEKKEN.find((p) => p.id === id) || null;
export const vondstVoor = (id) => duikplekVoor(id)?.vondst || null;
export const vondstId = (plek) => (plek && plek.vondst ? plek.vondst.id : null);
export const duikplekBij = (x, y) => PLEKKEN.find((p) => Math.hypot(p.x - x, p.y - y) <= DUIK_R) || null;

const gezienSet = (gezien) => {
  if (gezien instanceof Set) return gezien;
  if (typeof gezien === 'function') return new Set(PLEKKEN.map((p) => p.vondst.id).filter((id) => gezien(id)));
  if (Array.isArray(gezien)) return new Set(gezien);
  return new Set();
};
export function duikStand(gezien) {
  const s = gezienSet(gezien);
  const rijen = PLEKKEN.map((p) => ({ ...p, gezien: s.has(p.vondst.id) }));
  return { totaal: PLEKKEN.length, gevonden: rijen.filter((r) => r.gezien).length, klaar: rijen.every((r) => r.gezien), rijen };
}
export const duikAlbum = (gezien) => duikStand(gezien);
