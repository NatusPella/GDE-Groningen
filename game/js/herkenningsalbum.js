// #820: het herkenningspunten-album, puur: de dichtstbijzijnde punten binnen een straal, de stand per
// soort (kerken, molens, borgen, ...) en het dichtstbijzijnde nog niet geziene punt. Geen DOM, geen
// opslag: de tracker en "Te doen" geven de gezien-set of een functie daarvoor mee.
export const SOORTEN = {
  church: { naam: 'kerk', meervoud: 'kerken' },
  chapel: { naam: 'kapel', meervoud: 'kapellen' },
  mill: { naam: 'molen', meervoud: 'molens' },
  castle: { naam: 'borg', meervoud: 'borgen' },
  tower: { naam: 'toren', meervoud: 'torens' },
  watertower: { naam: 'watertoren', meervoud: 'watertorens' },
  lighthouse: { naam: 'vuurtoren', meervoud: 'vuurtorens' },
  museum: { naam: 'museum', meervoud: 'musea' },
  factory: { naam: 'fabriek', meervoud: 'fabrieken' },
  farm: { naam: 'boerderij', meervoud: 'boerderijen' },
  flat: { naam: 'flat', meervoud: 'flats' },
  school: { naam: 'school', meervoud: 'scholen' },
  station: { naam: 'station', meervoud: 'stations' },
  overig: { naam: 'punt', meervoud: 'punten' },
};
export const soortInfo = (soort) => SOORTEN[soort] || SOORTEN.overig;

// Gezien mag een Set, een array met id's of een functie (id) => boolean zijn.
export function gezienFn(gezien) {
  if (typeof gezien === 'function') return gezien;
  if (gezien instanceof Set) return (id) => gezien.has(id);
  if (Array.isArray(gezien)) return (id) => gezien.includes(id);
  return () => false;
}

// Alle punten binnen `straal` meter, dichtstbij eerst.
export function binnenStraal(punten = [], x, y, straal = 70) {
  const uit = [];
  for (const p of punten) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d <= straal) uit.push({ ...p, afstand: d });
  }
  return uit.sort((a, b) => a.afstand - b.afstand);
}

// De stand van het album: totaal, gezien en per soort (met de Nederlandse naam en het meervoud).
export function albumStand(punten = [], gezien = null) {
  const isGezien = gezienFn(gezien);
  const per = new Map();
  let totaal = 0, gedaan = 0;
  for (const p of punten) {
    if (!p || !p.id) continue;
    totaal++;
    const rij = per.get(p.soort) || { soort: p.soort, ...soortInfo(p.soort), totaal: 0, gezien: 0 };
    rij.totaal++;
    if (isGezien(p.id)) { rij.gezien++; gedaan++; }
    per.set(p.soort, rij);
  }
  return { totaal, gezien: gedaan, perSoort: [...per.values()].sort((a, b) => b.totaal - a.totaal || a.naam.localeCompare(b.naam)) };
}

// Het dichtstbijzijnde punt dat nog niet gezien is (of null als alles gezien is).
export function dichtstbijzijndeOpen(punten = [], gezien = null, x = 0, y = 0) {
  const isGezien = gezienFn(gezien);
  let best = null, bd = Infinity;
  for (const p of punten) {
    if (!p || !p.id || isGezien(p.id) || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bd) { bd = d; best = { ...p, afstand: d }; }
  }
  return best;
}

// De punten binnen de straal die nu voor het eerst gezien worden, dichtstbij eerst.
export function ontdekkingen(punten = [], x, y, gezien = null, straal = 70) {
  const isGezien = gezienFn(gezien);
  return binnenStraal(punten, x, y, straal).filter((p) => !isGezien(p.id));
}

// De korte melding bij een ontdekking: de naam, de soort en de stand van die soort.
export function melding(punt, stand) {
  if (!punt) return '';
  const info = soortInfo(punt.soort);
  const rij = stand && Array.isArray(stand.perSoort) ? stand.perSoort.find((r) => r.soort === punt.soort) : null;
  const telling = rij ? ` ${rij.gezien} van ${rij.totaal} ${rij.meervoud} gezien.` : '';
  return `Herkenningspunt: ${punt.naam} (${info.naam}).${telling}`;
}
