// Zoeken in het pauzemenu (21-11, docs/ESCAPEMENU-UX-21-11.md): typ een woord en spring naar een scherm, een onderdeel,
// een instelling of een actie, zoals een spotlight. Puur (geen DOM), zodat scripts/menuzoek_test.mjs het natrekt;
// pausemenu.js levert de lijst en voert de gekozen regel uit.
import { woordenVan } from './zoektekst.js';

// de soorten, in de volgorde waarin ze bij gelijke score komen: eerst wat je doet, dan waar je heen gaat
export const SOORTEN = { actie: 'Doen', scherm: 'Scherm', onderdeel: 'Onderdeel', instelling: 'Instelling' };
const VOLGORDE = ['actie', 'scherm', 'onderdeel', 'instelling'];

// Een regel: { id, soort, label, plek, zoek, ... de rest is voor de aanroeper }.
// `zoek` is extra tekst om op te vinden (synoniemen), `plek` wat rechts staat ("Instellingen > Geluid").
export function maakRegel(r) {
  return { ...r, platte: `${r.label} ${r.zoek || ''} ${r.plek || ''}`.toLowerCase() };
}

// Score van een regel voor de woorden; null als een woord nergens past.
function score(regel, woorden) {
  const label = regel.label.toLowerCase();
  let s = 0;
  for (const w of woorden) {
    if (label.startsWith(w)) s += 0;
    else if (label.split(/[\s&>·-]+/).some((d) => d.startsWith(w))) s += 1;
    else if (label.includes(w)) s += 2;
    else if (regel.platte.includes(w)) s += 4;
    else return null;
  }
  return s;
}

// De beste `max` regels voor de opdracht. Een lege opdracht geeft de acties en schermen, als beginlijst
// (ook voor wie met een controller geen woord kan typen).
export function zoekRegels(regels, q, max = 8) {
  const woorden = woordenVan(q);
  if (!woorden.length) return regels.filter((r) => r.soort === 'actie' || r.soort === 'scherm').slice(0, max);
  const raak = [];
  for (const r of regels) {
    const s = score(r, woorden);
    if (s != null) raak.push([s - (r.soort === 'actie' ? 1.5 : 0), VOLGORDE.indexOf(r.soort), r]);
  }
  raak.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2].label.localeCompare(b[2].label, 'nl'));
  return raak.slice(0, max).map((x) => x[2]);
}
