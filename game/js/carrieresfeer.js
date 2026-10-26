// Sfeer per loopbaan (#492): elk vak krijgt een eigen motief in de loopbaan-UI, zodat een
// boerderij anders voelt dan een perron of een piste. De sfeer is een patroon, geen nieuwe
// merkkleur: cream en groen uit DESIGN_SYSTEM.md, en rood blijft de enige gevarenkleur.
// Daarom is de boerenzakdoek geblokt cream/groen; een rode doek in de UI zou als waarschuwing
// lezen. De vorm (ruit, gevouwen punt, maatlijnen) draagt de verwijzing. Puur: geen DOM, geen
// THREE, geen opslag, zodat scripts/carrieresfeer_test.mjs de patronen kan natrekken.

const CREAM = 'rgba(240, 237, 228, 0.30)';
const CREAM_SOFT = 'rgba(240, 237, 228, 0.14)';
const GREEN = 'rgba(63, 201, 122, 0.34)';
const GREEN_SOFT = 'rgba(63, 201, 122, 0.16)';
const DARK = 'rgba(12, 20, 14, 0.34)';

// beeld: de lagen van background-image; maat: background-size voor alle lagen.
const VORMEN = {
  // rails met dwarsliggers
  spoor: {
    beeld: `repeating-linear-gradient(90deg, transparent 0 9px, ${CREAM} 9px 11px, transparent 11px 28px), repeating-linear-gradient(0deg, ${GREEN_SOFT} 0 2px, transparent 2px 16px)`,
    maat: '28px 16px',
  },
  // diagonale strepen van een haltebord
  halte: {
    beeld: `repeating-linear-gradient(135deg, ${GREEN} 0 10px, transparent 10px 22px)`,
    maat: '31px 31px',
  },
  // de geblokte ruit van een taxi
  ruit: {
    beeld: `repeating-linear-gradient(45deg, ${CREAM} 0 8px, transparent 8px 16px), repeating-linear-gradient(-45deg, ${GREEN} 0 8px, transparent 8px 16px)`,
    maat: '23px 23px',
  },
  // pakband: twee banen met een stippellijn ertussen
  band: {
    beeld: `linear-gradient(180deg, transparent 0 26%, ${CREAM} 26% 34%, transparent 34% 58%, ${GREEN} 58% 66%, transparent 66%), repeating-linear-gradient(90deg, ${CREAM_SOFT} 0 2px, transparent 2px 12px)`,
    maat: '24px 24px',
  },
  // chevrons van de snelweg
  chevron: {
    beeld: `repeating-linear-gradient(135deg, ${GREEN} 0 9px, transparent 9px 20px), repeating-linear-gradient(45deg, ${CREAM} 0 9px, transparent 9px 20px)`,
    maat: '28px 28px',
  },
  // golven op het water
  golf: {
    beeld: `repeating-radial-gradient(circle at 50% 120%, transparent 0 18px, ${CREAM} 18px 20px, transparent 20px 30px, ${GREEN} 30px 32px, transparent 32px 44px)`,
    maat: '88px 46px',
  },
  // horizon met een lage zon
  horizon: {
    beeld: `radial-gradient(circle at 72% 38%, ${GREEN} 0 7px, transparent 7px), linear-gradient(180deg, transparent 0 44%, ${CREAM} 44% 46%, transparent 46% 60%, ${GREEN} 60% 62%, transparent 62%)`,
    maat: '64px 40px',
  },
  // controlekrusing op de hes
  vizier: {
    beeld: `linear-gradient(90deg, transparent 48%, ${CREAM} 48% 52%, transparent 52%), linear-gradient(0deg, transparent 48%, ${GREEN} 48% 52%, transparent 52%)`,
    maat: '30px 30px',
  },
  // liggende lijnen van een kasboek
  lijnen: {
    beeld: `repeating-linear-gradient(180deg, ${CREAM} 0 1px, transparent 1px 9px), repeating-linear-gradient(90deg, transparent 0 26px, ${GREEN_SOFT} 26px 27px, transparent 27px 52px)`,
    maat: '52px 10px',
  },
  // spotlights vanaf het podium
  stralen: {
    beeld: `conic-gradient(from 196deg at 50% 112%, transparent 0 7deg, ${GREEN} 7deg 9deg, transparent 9deg 18deg, ${CREAM} 18deg 20deg, transparent 20deg 29deg)`,
    maat: '120px 64px',
  },
  // geblokt tafelkleed
  kleed: {
    beeld: `repeating-linear-gradient(0deg, ${GREEN} 0 7px, transparent 7px 14px), repeating-linear-gradient(90deg, ${CREAM} 0 7px, transparent 7px 14px)`,
    maat: '22px 22px',
  },
  // vlaggetjes boven de kermis
  vlaggen: {
    beeld: `repeating-linear-gradient(135deg, ${GREEN} 0 7px, transparent 7px 15px), repeating-linear-gradient(45deg, ${CREAM} 0 7px, transparent 7px 15px)`,
    maat: '21px 21px',
  },
  // de boerenzakdoek: ruiteband met een dubbele draad, cream op groen
  zakdoek: {
    beeld: `repeating-linear-gradient(0deg, ${GREEN} 0 11px, transparent 11px 22px), repeating-linear-gradient(90deg, ${GREEN} 0 11px, transparent 11px 22px), repeating-linear-gradient(0deg, ${CREAM} 3px 4px, transparent 4px 22px), repeating-linear-gradient(90deg, ${CREAM} 3px 4px, transparent 4px 22px)`,
    maat: '44px 44px',
  },
  // maatlat met lange en korte streepjes
  maat: {
    beeld: `repeating-linear-gradient(90deg, ${CREAM} 0 1px, transparent 1px 10px), repeating-linear-gradient(90deg, ${GREEN} 0 2px, transparent 2px 50px)`,
    maat: '50px 22px',
  },
  // lijnen van de padelbaan
  baan: {
    beeld: `linear-gradient(90deg, transparent 0 23%, ${CREAM} 23% 24.5%, transparent 24.5% 75.5%, ${CREAM} 75.5% 77%, transparent 77%), linear-gradient(0deg, transparent 0 48%, ${GREEN} 48% 52%, transparent 52%)`,
    maat: '80px 48px',
  },
  // hoogtelijnen van de golfbaan
  contour: {
    beeld: `repeating-radial-gradient(circle at 32% 62%, transparent 0 11px, ${GREEN} 11px 12px, transparent 12px 23px, ${CREAM_SOFT} 23px 24px, transparent 24px 35px)`,
    maat: '90px 90px',
  },
  // visschubben
  schub: {
    beeld: `radial-gradient(circle at 0 50%, transparent 0 8px, ${CREAM} 8px 9px, transparent 9px), radial-gradient(circle at 100% 50%, transparent 0 8px, ${GREEN} 8px 9px, transparent 9px)`,
    maat: '20px 18px',
  },
  // startgrid van het circuit
  grid: {
    beeld: `conic-gradient(from 90deg at 1px 1px, ${GREEN} 0 25%, transparent 0 50%, ${CREAM} 0 75%, transparent 0)`,
    maat: '20px 20px',
  },
  // terreinlijnen van de kaart
  terrein: {
    beeld: `repeating-radial-gradient(ellipse at 68% 42%, transparent 0 15px, ${CREAM} 15px 16px, transparent 16px 30px, ${GREEN_SOFT} 30px 31px, transparent 31px 44px)`,
    maat: '110px 76px',
  },
  // bakstenen van de kade
  dam: {
    beeld: `linear-gradient(180deg, transparent 0 46%, ${DARK} 46% 50%, transparent 50%), repeating-linear-gradient(90deg, ${CREAM} 0 1px, transparent 1px 24px, ${GREEN_SOFT} 24px 25px, transparent 25px 48px)`,
    maat: '48px 20px',
  },
};

// Eén sfeer per vak: naam en motief zijn spelerzichtbaar (Nederlands), vorm verwijst naar VORMEN.
export const SFEER = {
  trein: { naam: 'Perronstrepen', vorm: 'spoor', motief: 'Rails en perronstrepen' },
  bus: { naam: 'Haltebord', vorm: 'halte', motief: 'Diagonalen van een haltebord' },
  taxi: { naam: 'Taxiruit', vorm: 'ruit', motief: 'De geblokte ruit van een taxi' },
  bezorg: { naam: 'Pakband', vorm: 'band', motief: 'Pakband met een stippellijn' },
  vracht: { naam: 'Vrachtchevron', vorm: 'chevron', motief: 'Chevrons van de snelweg' },
  water: { naam: 'Golven', vorm: 'golf', motief: 'Golven op het water' },
  lucht: { naam: 'Horizon', vorm: 'horizon', motief: 'Horizon met een lage zon' },
  handhaving: { naam: 'Controlekruis', vorm: 'vizier', motief: 'Controlekruis op de hes' },
  kantoor: { naam: 'Kasboeklijnen', vorm: 'lijnen', motief: 'Lijnen van een kasboek' },
  podium: { naam: 'Spotlights', vorm: 'stralen', motief: 'Spotlights vanaf het podium' },
  horeca: { naam: 'Tafelkleed', vorm: 'kleed', motief: 'Geblokt tafelkleed' },
  kermis: { naam: 'Vlaggetjes', vorm: 'vlaggen', motief: 'Vlaggetjes boven de kermis' },
  landbouw: { naam: 'Boerenzakdoek', vorm: 'zakdoek', motief: 'Geblokte boerenzakdoek', vouw: true },
  klus: { naam: 'Maatlat', vorm: 'maat', motief: 'Maatlat met streepjes' },
  padel: { naam: 'Baanlijnen', vorm: 'baan', motief: 'Lijnen van de padelbaan' },
  golf: { naam: 'Hoogtelijnen', vorm: 'contour', motief: 'Hoogtelijnen van de baan' },
  hengelen: { naam: 'Visschubben', vorm: 'schub', motief: 'Visschubben op het water' },
  race: { naam: 'Startgrid', vorm: 'grid', motief: 'Startgrid van het circuit' },
  buiten: { naam: 'Terreinlijnen', vorm: 'terrein', motief: 'Terreinlijnen van de kaart' },
  // De kade is geen eigen loopbaanvak, maar de klusbaan "tjalke" speelt zich er af; de vorm
  // blijft beschikbaar voor een volgende sfeer zonder een nieuwe kleur te verzinnen.
  kade: { naam: 'Kade', vorm: 'dam', motief: 'Bakstenen van de kade' },
};

const LEGE = { naam: '', vorm: '', motief: '' };

// Vier tonaliteiten binnen de bestaande tokens: een donkere plaat, donkergroen, veldgroen
// en een melkwitte waas. Zo krijgt elk vak niet alleen een ander patroon, maar ook een
// andere toon; het blijft allemaal cream en groen uit DESIGN_SYSTEM.md.
const TINT = {
  nacht: 'rgba(12, 20, 14, 0.62)',
  bos: 'rgba(15, 92, 48, 0.58)',
  veld: 'rgba(30, 158, 86, 0.26)',
  melk: 'rgba(240, 237, 228, 0.12)',
};
const TINT_VAN = {
  trein: 'nacht', bus: 'veld', taxi: 'melk', bezorg: 'nacht', vracht: 'bos',
  water: 'veld', lucht: 'veld', handhaving: 'nacht', kantoor: 'nacht', podium: 'bos',
  horeca: 'melk', kermis: 'veld', landbouw: 'bos', klus: 'nacht', padel: 'veld',
  golf: 'melk', hengelen: 'veld', race: 'nacht', buiten: 'melk', kade: 'nacht',
};

// De sfeer van een vak; onbekend vak geeft een lege sfeer (de UI valt dan terug op geen band).
export function sfeerVan(id) {
  return SFEER[id] || LEGE;
}

// De CSS voor de achtergrond van de sfeerband. Alleen de vaste kleuren hierboven, dus geen
// invoer van buiten en geen nieuwe hex.
export function sfeerStijl(id) {
  const s = SFEER[id];
  const v = s && VORMEN[s.vorm];
  if (!v) return '';
  const tint = TINT[TINT_VAN[id]] || '';
  return `${tint ? `background-color:${tint};` : ''}background-image:${v.beeld};background-size:${v.maat};background-repeat:repeat;`;
}

export const SFEER_IDS = Object.keys(SFEER).filter((id) => id !== 'kade');
