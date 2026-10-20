// Welke overlay wacht op welke (#239): pure regels, geen DOM. De resultaatkaart ("Missie geslaagd") en
// het keuzepaneel zijn van het hele scherm: wat er die tijd onder of over zou liggen (personagenaam,
// duelbalk, prestatie) wacht tot de kaart weg is. Een duelbalk houdt prestaties en de plaatsnaam
// tegen. Zo ligt er één ding tegelijk in beeld. overlayhold.js past het toe op de DOM;
// scripts/overlayrules_test.mjs.

// Rang: hoger wint. Zelfde rang houdt elkaar niet tegen.
export const RANK = { resultaat: 5, keuze: 4, duelbalk: 3, prestatie: 2, wijkkaart: 1.5, naamkaart: 1, locatie: 1 };

// Wat een actieve overlay tegenhoudt.
export const HOLDS = {
  resultaat: ['wijkkaart', 'naamkaart', 'locatie', 'prestatie', 'duelbalk'],
  keuze: ['wijkkaart', 'naamkaart', 'locatie', 'prestatie'],
  duelbalk: ['prestatie', 'locatie', 'wijkkaart'],
  // de wijkkaart (grote wijknaam linksonder) en de naamkaart staan op dezelfde plek: één tegelijk (#292)
  wijkkaart: ['naamkaart', 'locatie'],
};

// active: een lijst of Set met namen van wat nu in beeld is. Geeft de Set van wat moet wachten.
export function heldOverlays(active) {
  const on = new Set(active || []);
  const held = new Set();
  for (const a of on) for (const h of HOLDS[a] || []) if (on.has(h) && (RANK[a] || 0) > (RANK[h] || 0)) held.add(h);
  return held;
}

// Mag deze overlay nu beginnen?
export const mayStartOverlay = (name, active) => !heldOverlays([...(active || []).filter((a) => a !== name), name]).has(name);
