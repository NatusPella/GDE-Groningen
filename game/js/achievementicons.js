// Pictogrammen voor de prestaties (#191): per categorie een eenvoudig lijn-
// icoon, met een paar eigen voor losse prestaties. Puur en zonder imports,
// zodat de definities zonder browser te testen zijn.
const P = {
  trofee: 'M7 4h10v4a5 5 0 0 1-10 0V4zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 13v4M8 20h8M9 17h6',
  wiel: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM12 3v6.5M12 14.5V21M3 12h6.5M14.5 12H21',
  voet: 'M9 3c2 0 3 2 3 5s-1 4-3 4-3-1-3-4 1-5 3-5zM14.5 12c2 0 3.5 1.5 3.5 4s-1 5-3 5-3-2-3-5 1-4 2.5-4z',
  schild: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3z',
  kompas: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5 5-2z',
  trein: 'M7 3h10a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2zM5 11h14M9 21l2-3M15 21l-2-3',
  munt: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1 0-2-.5-2.5-1.5',
  ster: 'M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.100L12 16.8 6.6 19.700l1.1-6.100L3.2 9.400l6.1-.8L12 3z',
  duif: 'M4 14c3 0 5-1 7-4 1-1.5 3-2 5-1l4 1-3 2c0 4-3 7-8 7-3 0-5-2-5-5zM16 9.500v.01',
  tas: 'M5 8h14v12H5V8zM9 8V6a3 3 0 0 1 6 0v2M5 13h14',
  boek: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4zM8 17h11',
  mand: 'M4 10h16l-2 10H6L4 10zM8 10l3-6M16 10l-3-6',
  rad: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3v18M3 12h18M5.6 5.600l12.8 12.800M18.4 5.600L5.6 18.4',
  boot: 'M3 15h18l-3 5H6l-3-5zM12 3v12M12 4l6 8h-6',
  mensen: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3 2.5-5 6-5s6 2 6 5M17 10a2.5 2.5 0 1 0 0-5M17.5 15c2.2.4 3.5 2 3.5 5',
  vraag: 'M9 9a3 3 0 1 1 4.5 2.600C12.5 12.2 12 13 12 14M12 18v.01',
};
const BY_CAT = {
  missies: 'trofee', rijden: 'wiel', tevoet: 'voet', politie: 'schild', verkennen: 'kompas', spoor: 'trein',
  sociaal: 'munt', verzamelen: 'mand', duif: 'duif', bijbaan: 'tas', nahetverhaal: 'boek',
};
const BY_ID = [
  [/^coop_/, 'mensen'], [/^reuzenrad_/, 'rad'], [/^varen_|^bruggen_|^skutsje_|^ski_/, 'boot'],
  [/^ster_|^gezocht_|^ontsnapt/, 'ster'], [/^reizen_|^trein|^forens/, 'trein'],
];

export const ICON_PATHS = P;

export function iconName(a) {
  if (a.hidden) return 'vraag';
  for (const [re, n] of BY_ID) if (re.test(a.id)) return n;
  return BY_CAT[a.cat] || 'trofee';
}

export function iconSvg(a, cls = 'ach-pic') {
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${P[iconName(a)]}"/></svg>`;
}
