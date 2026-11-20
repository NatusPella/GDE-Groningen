// AAA akte 1 en 2 (docs/MISSIE-AAA-AKTE1-2.md, #955): de aankleding van de start- en doelplekken die nog kaal waren, als
// plannen voor missiedecor.js (registreerAankleding) en als `dressing` op de stap die er staat (zoals M07 en M08 al deden).
// Alleen data: de plannen bouwen niets zelf, de runner zet ze neer bij het doel van de stap en haalt ze weg bij de volgende.
//
// Samen spelen: alles is lokaal beeld bij de speler die de stap draait; niets in wereld, beloning of voortgang (per speler,
// #429). Alle namen zijn verzonnen (Pand & Poen, Groothandel De Vetpot).
import { registreerAankleding } from './missiedecor.js';

const kijk = (shirt, skin, seed, variant) => ({ shirt, skin, seed, variant });

export const PLANNEN_AKTE12 = {
  // M02: bij Pand & Poen staat het bord buiten en Sjabbe wacht in de deuropening met twee klanten die doen alsof ze kijken
  pandenpoen: {
    props: [
      { kind: 'banner', along: 12, side: 0, a: 0, title: 'PAND & POEN', sub: 'Inkoop en verkoop, zonder vragen' },
      { kind: 'kist', along: 8, side: -8.5, a: 0.3 }, { kind: 'kist', along: 9.4, side: -9.2, a: -0.2 },
      { kind: 'ton', along: 7, side: 8.8, a: 0 }, { kind: 'vaandel', along: 12, side: -6, a: 0 },
    ],
    people: [
      { look: kijk(0x3a3a4a, 0xf1c9a5, 8701, 'male'), along: 10, side: 1.2, a: Math.PI, anim: 'point' }, // Sjabbe wijst naar de achterdeur
      { look: kijk(0x8a4a3a, 0xd9a06e, 8702, 'female'), along: 7, side: -7, a: 1.3, anim: 'talk' },
      { look: kijk(0x3f6a4a, 0xa9744a, 8703, 'male'), along: 7.8, side: -6.2, a: 1.1, anim: 'nod' },
    ],
  },
  // M07: de groothandel aan de Bornholmstraat: vaten frituurvet en kratten, Durk en Douwe sjouwen
  groothandel: {
    props: [
      { kind: 'banner', along: 14, side: 0, a: 0, title: 'GROOTHANDEL DE VETPOT', sub: 'Frituurvet in bulk, ook voor Grunn' },
      { kind: 'ton', along: 8, side: -8, a: 0 }, { kind: 'ton', along: 9, side: -8.9, a: 0 }, { kind: 'ton', along: 7.2, side: -9, a: 0 },
      { kind: 'ton', along: 9.2, side: 8, a: 0 }, { kind: 'ton', along: 8, side: 8.9, a: 0 },
      { kind: 'kist', along: 11, side: -6, a: 0.4 }, { kind: 'kist', along: 11, side: 6.5, a: -0.3 },
    ],
    people: [
      { look: kijk(0xc8552e, 0xf1c9a5, 8711, 'male'), along: 9, side: -6, a: 1.2, anim: 'hips' }, // Durk
      { look: kijk(0x2f6fb0, 0xf1c9a5, 8712, 'male'), along: 9.5, side: 6, a: -1.3, anim: 'talk' }, // Douwe
    ],
  },
  // M09: halverwege op de wierde: een marktkraam met eieren, een boer die toekijkt en een kind dat telt
  wierdemarkt: {
    props: [
      { kind: 'kraam', along: 8, side: -9, a: -0.2 }, { kind: 'baal', along: 7, side: 8.5, a: 0 }, { kind: 'baal', along: 8.2, side: 9.4, a: 0 },
      { kind: 'kist', along: 10, side: 7.6, a: 0.3 }, { kind: 'vaandel', along: 12, side: -5, a: 0 },
      { kind: 'banner', along: 15, side: 0, a: 0, title: 'WIERDEMARKT', sub: 'Eieren, kaas en nieuws' },
    ],
    people: [
      { look: kijk(0x6a4a2a, 0xd9a06e, 8721, 'male'), along: 8.5, side: -6.8, a: 1.3, anim: 'talk' },
      { look: kijk(0x8a4a8a, 0xf1c9a5, 8722, 'female'), along: 9.4, side: -7.4, a: 1.2, anim: 'nod' },
      { look: kijk(0xe0b93a, 0xa9744a, 8723, 'male'), along: 9, side: 6.4, a: -1.4, anim: 'point' },
    ],
  },
  // M09: bij de kerkkelder in Usquert: de koster met zijn lijstje, banken van de kerk buiten
  kerkkelder: {
    props: [
      { kind: 'bank', along: 7, side: -8.5, a: 0 }, { kind: 'bank', along: 11, side: -8.5, a: 0 },
      { kind: 'ton', along: 8, side: 8.8, a: 0 }, { kind: 'kist', along: 9.4, side: 8.2, a: 0.2 },
      { kind: 'vaandel', along: 13, side: -5, a: 0 }, { kind: 'vaandel', along: 13, side: 5, a: 0 },
    ],
    people: [
      { look: kijk(0x333a44, 0xf1c9a5, 8731, 'male'), along: 9, side: 1.5, a: Math.PI, anim: 'nod' }, // de koster
      { look: kijk(0x7a3a4a, 0xd9a06e, 8732, 'female'), along: 6.2, side: -6.6, a: 1.2, anim: 'talk' },
    ],
  },
  // M10: de sloot bij Uithuizen: een paar toeschouwers op de dijk, kratten, iemand wijst naar de limo
  slootkant: {
    props: [
      { kind: 'baal', along: 8, side: -8.5, a: 0 }, { kind: 'baal', along: 9.3, side: -9.2, a: 0 },
      { kind: 'kist', along: 7, side: 8.5, a: 0.3 }, { kind: 'vaandel', along: 12, side: 6, a: 0 },
    ],
    people: [
      { look: kijk(0x3a6a8a, 0xf1c9a5, 8741, 'male'), along: 9, side: -6.5, a: 1.4, anim: 'point' },
      { look: kijk(0x8a6a3a, 0xa9744a, 8742, 'female'), along: 10, side: -7.3, a: 1.2, anim: 'wave' },
    ],
  },
};

// Koppelt de plannen aan de stappen van akte 1 en 2 (list: de defs van missions.js, zoals applyNieuw ze krijgt).
export function applyAkte12(list) {
  for (const [kind, plan] of Object.entries(PLANNEN_AKTE12)) registreerAankleding(kind, plan);
  const by = (label) => list.find((d) => d && d.label === label);
  const zet = (def, vind, dressing) => {
    const st = def && Array.isArray(def.stages) ? def.stages.find(vind) : null;
    if (st && !st.dressing) st.dressing = dressing; // een stap met eigen aankleding (M07-plein, M08) houdt die
  };
  zet(by('Even pinnen'), (q) => q.kind === 'goto' && q.target && q.target.shop === 'pand', 'pandenpoen');
  zet(by('Al het vet van Grunn'), (q) => q.kind === 'chase', 'groothandel');
  zet(by('Heel aankomen is ook een kunst'), (q) => q.kind === 'goto' && q.target && q.target.label === 'Tussenstop op de wierde', 'wierdemarkt');
  zet(by('Heel aankomen is ook een kunst'), (q) => q.kind === 'goto' && q.target && q.target.label === 'De kerkkelder in Usquert', 'kerkkelder');
  zet(by('Een trekker-limo op de wierde'), (q) => q.kind === 'goto' && q.target && q.target.label === 'De sloot bij Uithuizen', 'slootkant');
}
