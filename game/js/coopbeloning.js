// Samen spelen (#448): beloningen per gebeurtenis. Pure logica (geen DOM, geen opslag, geen netwerk).
//  - Een gebeurtenis (een opdracht, een bijbaan, een prijs) heeft een vaste id; wat erbij hoort wordt hooguit één keer toegekend.
//  - Het bedrag gaat gelijk naar de deelnemers, in hele euro's; de rest gaat naar de eerste deelnemers, dus de som klopt altijd.
//  - Met twee of meer deelnemers komt er een samenwerkingsbonus bovenop (totaal x 1,5, begrensd).
// De bonus telt mee in de controle op dubbel toekennen: dezelfde id geeft nooit twee keer geld, ook niet de bonus.

export const BONUS_FACTOR = 1.5;
export const BONUS_MAX = 100000; // hoogste bonus (het deel erbovenop) per gebeurtenis
export const MIN_DEELNEMERS = 2;
export const ID_MAX = 200; // zoveel gebeurtenis-ids onthoudt een boekhouding (en een save)

const geheel = (x) => { const n = Math.floor(Number(x)); return Number.isFinite(n) && n > 0 ? n : 0; };

// Totaal na de samenwerkingsbonus: { totaal, bonus }. Eén deelnemer (of geen) krijgt geen bonus.
export function samenwerkingsBonus(totaal, deelnemers) {
  const basis = geheel(totaal);
  if (!(basis > 0) || !(deelnemers >= MIN_DEELNEMERS)) return { totaal: basis, bonus: 0 };
  const bonus = Math.min(BONUS_MAX, Math.floor(basis * (BONUS_FACTOR - 1)));
  return { totaal: basis + bonus, bonus };
}

// Gelijk verdelen over slots: hele euro's, de rest naar de eerste slots. Geeft { [slot]: bedrag }; de som is altijd het bedrag.
export function verdeelGelijk(bedrag, slots) {
  const lijst = [...new Set((Array.isArray(slots) ? slots : []).filter((s) => Number.isInteger(s)))];
  const uit = {};
  const totaal = geheel(bedrag);
  if (!lijst.length) return uit;
  const elk = Math.floor(totaal / lijst.length), rest = totaal - elk * lijst.length;
  lijst.forEach((s, i) => { uit[s] = elk + (i < rest ? 1 : 0); });
  return uit;
}

// Eén gebeurtenis: { id, totaal, bonus, bedragen: { slot: euro } }. Zonder id of zonder deelnemers is er niets toe te kennen.
export function beloningVoorGebeurtenis({ id, totaal, deelnemers }) {
  if (typeof id !== 'string' || !id) return null;
  const slots = [...new Set((Array.isArray(deelnemers) ? deelnemers : []).filter((s) => Number.isInteger(s)))];
  if (!slots.length) return null;
  const b = samenwerkingsBonus(totaal, slots.length);
  return { id, totaal: b.totaal, bonus: b.bonus, bedragen: verdeelGelijk(b.totaal, slots) };
}

// Gebeurtenis-id van een opdracht: sessie, soort en volgnummer van de gebeurtenis.
export const gebeurtenisId = (sessie, soort, nummer) => `${String(sessie || 's').slice(0, 16)}:${String(soort || 'g').slice(0, 16)}:${Math.max(0, Math.floor(Number(nummer) || 0))}`;

// De boekhouding van één speler of host: onthoudt welke ids al zijn toegekend (de laatste ID_MAX).
export function maakBoekhouding(ids = []) {
  const gezien = new Set((Array.isArray(ids) ? ids : []).filter((s) => typeof s === 'string' && s).slice(-ID_MAX));
  return {
    // true de eerste keer dat de id langskomt, daarna false
    claim(id) {
      if (typeof id !== 'string' || !id || gezien.has(id)) return false;
      gezien.add(id);
      while (gezien.size > ID_MAX) gezien.delete(gezien.values().next().value);
      return true;
    },
    heeft: (id) => gezien.has(id),
    ids: () => [...gezien],
  };
}

// Een gebeurtenis in de save van een speler: geld erbij en de id erbij, in dezelfde nieuwe save (dus in één schrijfbeurt).
// Geeft de nieuwe save, of null als de id er al staat of er niets te geven is. Het geld blijft een geheel getal en nooit negatief.
export function pasGebeurtenisToe(data, id, bedrag) {
  const e = geheel(bedrag);
  if (!data || typeof data !== 'object' || Array.isArray(data) || typeof id !== 'string' || !id) return null;
  const al = Array.isArray(data.coopGebeurtenissen) ? data.coopGebeurtenissen.filter((s) => typeof s === 'string') : [];
  if (al.includes(id)) return null;
  const base = Number.isFinite(data.money) && data.money >= 0 ? Math.floor(data.money) : 0;
  const money = base + e;
  return { ...data, money, moneyBackup: money, coopGebeurtenissen: [...al, id].slice(-ID_MAX) };
}
