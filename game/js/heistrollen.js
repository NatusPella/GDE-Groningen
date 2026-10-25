// Een heist samen (#438): iedereen een eigen rol, of tegen elkaar om de buit.
// Puur: geen three.js, geen wereld, geen netwerk. De verhaalheist (heist.js) laat de
// rollen op de bouwtekening zien; de coöp-opdracht Kluisklus (coopactivities.js) gebruikt
// dezelfde rollen en de verdeling van de buit. Wat een gast zelf doet, gaat via de
// netlaag (coopnet.js); dit bestand rekent alleen wie welke rol heeft en wie wat krijgt.
// Nederlands, verzonnen namen, geen geweld (constitution 6).
// Tests: scripts/heistrollen_test.mjs.

// De rollen in de volgorde waarin ze verdeeld worden. Elke rol hoort bij een paar
// stappen van de heist: wie de rol heeft, doet die stap (of kijkt mee als die er niet is).
export const ROLLEN = ['uitkijk', 'loper', 'kluis', 'schipper'];

export const ROL = {
  uitkijk: { naam: 'Uitkijk', taak: 'Houdt de bewakers en de camera\'s in de gaten.', fasen: ['plan', 'watch', 'post', 'shot'] },
  loper: { naam: 'Loper', taak: 'Rolt het pasje en opent de deuren.', fasen: ['lock', 'pickpocket'] },
  kluis: { naam: 'Kluisspecialist', taak: 'Zet de stroom af en kraakt de vitrine.', fasen: ['fuse', 'laser', 'crack'] },
  schipper: { naam: 'Schipper', taak: 'Houdt de boot klaar voor de vlucht.', fasen: ['getaway'] },
};

export const isRol = (id) => ROLLEN.includes(id);
export const rolVanFase = (fase) => ROLLEN.find((r) => ROL[r].fasen.includes(fase)) || null;

// De rolverdeling: rol na rol bij een speler, in een rondje. Zo heeft iedereen minstens
// één rol en is elke rol bezet; met één speler doet die alle vier.
export function rollenVoor(spelers = []) {
  const slots = [...new Set((spelers || []).filter((s) => Number.isInteger(s) && s >= 0))].sort((a, b) => a - b);
  if (!slots.length) return [];
  return ROLLEN.map((rol, i) => ({ rol, slot: slots[i % slots.length] }));
}

// Per speler zijn rollen, in de volgorde van ROLLEN.
export function rollenPerSpeler(spelers = []) {
  const uit = [];
  for (const { rol, slot } of rollenVoor(spelers)) {
    let rij = uit.find((x) => x.slot === slot);
    if (!rij) { rij = { slot, rollen: [] }; uit.push(rij); }
    rij.rollen.push(rol);
  }
  return uit.sort((a, b) => a.slot - b.slot);
}

// Wie doet deze stap? De speler met de rol van de stap, of null als niemand die rol heeft.
export function wieDoet(verdeling, fase) {
  const rol = rolVanFase(fase);
  if (!rol) return null;
  const rij = (verdeling || []).find((x) => x.rol === rol);
  return rij ? rij.slot : null;
}

// De rolnaam zoals hij in een zin staat ("Tammo is de uitkijk en de loper.").
export const rolNaam = (rol) => (ROL[rol] ? ROL[rol].naam.toLowerCase() : 'helper');
export const rolZin = (naam, rollen) => `${naam} is de ${(rollen || []).filter(isRol).map(rolNaam).join(' en de ')}.`;

// De regel onder de bouwtekening: één zin per speler. Zonder namen blijft het bij de rol.
export function samenRegels(rijen = []) {
  return (rijen || [])
    .filter((r) => r && Array.isArray(r.rollen) && r.rollen.length)
    .map((r) => rolZin(r.naam || `Speler ${(r.slot | 0) + 1}`, r.rollen));
}

// De buit: samen delen, of ieder voor zich (tegen elkaar). `punten` is wat elke speler
// bij elkaar sprokkelde. Geeft per plek het bedrag en wie er won (bij tegen elkaar).
export function buitVerdelen(modus, spelers = [], punten = {}, buit = 0) {
  const slots = [...new Set((spelers || []).filter((s) => Number.isInteger(s) && s >= 0))].sort((a, b) => a - b);
  const totaal = Math.max(0, Math.round(Number(buit) || 0));
  const geld = {};
  for (const s of slots) geld[s] = 0;
  if (!slots.length || !totaal) return { geld, winnaar: null, modus: modus === 'tegen' ? 'tegen' : 'samen' };
  const score = Object.fromEntries(slots.map((s) => [s, Math.max(0, Math.round(Number(punten && punten[s]) || 0))]));
  const som = slots.reduce((a, s) => a + score[s], 0);
  if (modus === 'tegen') {
    // Ieder houdt wat hij zelf bij elkaar sprokkelde; de rest gaat naar de grootste buit.
    let rest = totaal;
    for (const s of slots) { geld[s] = som ? Math.floor((totaal * score[s]) / som) : Math.floor(totaal / slots.length); rest -= geld[s]; }
    const winnaar = slots.slice().sort((a, b) => score[b] - score[a] || a - b)[0];
    geld[winnaar] += Math.max(0, rest);
    return { geld, winnaar, modus: 'tegen' };
  }
  // Samen: gelijk delen, de rest naar wie het meest deed (bij gelijke stand de eerste plek).
  const deel = Math.floor(totaal / slots.length);
  for (const s of slots) geld[s] = deel;
  const rest = totaal - deel * slots.length;
  if (rest) geld[slots.slice().sort((a, b) => score[b] - score[a] || a - b)[0]] += rest;
  return { geld, winnaar: null, modus: 'samen' };
}

// De twee manieren om de Kluisklus te spelen.
export const MODI = {
  samen: { id: 'samen', naam: 'Samen', tekst: 'Iedereen heeft een eigen rol en de buit wordt gedeeld.' },
  tegen: { id: 'tegen', naam: 'Tegen elkaar', tekst: 'Iedereen doet het hele plan zelf: wie het meest buitmaakt, wint.' },
};
export const isModus = (id) => Object.prototype.hasOwnProperty.call(MODI, id);
