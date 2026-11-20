// De pictogrammen van de light sims (#985): 24x24 lijnpaden, één bron voor de strook (simhud.js) en de modellen per sim. Kleur komt van de omgeving (currentColor).
export const IC = {
  klok: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  euro: '<path d="M17 7a6 6 0 1 0 0 10"/><path d="M5 10h8M5 14h8"/>',
  afstand: '<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2"/>',
  gewicht: '<path d="M6 8h12l2 12H4z"/><circle cx="12" cy="5.5" r="2"/>',
  vis: '<path d="M4 12c3-5 9-6 13-1l3-3v8l-3-3c-4 5-10 4-13-1z"/><circle cx="8.5" cy="11" r="0.8"/>',
  wind: '<path d="M3 9h10a3 3 0 1 0-3-3"/><path d="M3 15h14a3 3 0 1 1-3 3"/>',
  hart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10z"/>',
  pakket: '<path d="M4 8l8-4 8 4v9l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v9"/>',
  vlam: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 3-6 1 1 2 1 2-4z"/>',
  krant: '<rect x="4" y="9" width="16" height="7" rx="3.5"/><path d="M9 9v7"/>',
  bus: '<rect x="5" y="6" width="14" height="9" rx="2"/><path d="M9 11h6"/><path d="M12 15v5"/>',
  verhaal: '<path d="M5 5h14v10H9l-4 4z"/>',
};
