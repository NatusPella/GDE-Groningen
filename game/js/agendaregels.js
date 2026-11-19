// De agenda in Overzicht (#985): de bijzondere dagen (calendarday.js) en de evenementen
// (evenementen.js) in één lijst, op datum. Evenementen stonden er niet in, dus je kon niet vooruit
// plannen naar de Zomerkermis Zuidbroek: hij verscheen pas op de dag zelf. Pure regel, zonder DOM.
import { upcoming as komendeEvenementen, timeLabel, KINDS } from './evenementen.js';

// n: de dag van vandaag. special: de bijzondere dag van vandaag (of null), specials: de komende
// bijzondere dagen ([{ s, from, label }], calendarday.upcoming). Geeft [{ icon, name, when, on }].
export function agendaRegels(n, { special = null, specials = [], count = 6 } = {}) {
  const regels = [];
  if (special) regels.push({ start: n, icon: special.icon, name: special.name, when: 'vandaag', on: true });
  const rest = specials.filter((u) => !special || u.s.id !== special.id);
  for (const u of rest) regels.push({ start: Math.max(u.from, n), icon: u.s.icon, name: u.s.name, when: u.label, on: false });
  for (const { ev, label } of komendeEvenementen(n, count)) {
    const tijd = timeLabel(ev);
    regels.push({ start: Math.max(ev.from, n), icon: (KINDS[ev.kind] || {}).icon || 'vlag', name: ev.naam, when: `${label} · ${tijd} · ${ev.plaats}`, on: ev.from <= n && ev.to >= n });
  }
  // vandaag eerst, daarna op datum; bij gelijke dag blijft de volgorde van invoer (specials voor evenementen)
  regels.sort((a, b) => (a.on === b.on ? 0 : a.on ? -1 : 1) || a.start - b.start);
  return regels.slice(0, Math.max(count, special ? 1 : 0)).map(({ icon, name, when, on }) => ({ icon, name, when, on }));
}
