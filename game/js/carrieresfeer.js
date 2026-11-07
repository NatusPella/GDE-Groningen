// Sfeer per loopbaan (#492): elk vak krijgt een eigen kleurvlak, motief en icoon in de
// loopbaan-UI, zodat een boerderij anders voelt dan een perron of een piste. De sfeer is
// geen nieuwe merkkleur: cream en de drie groenen uit DESIGN_SYSTEM.md, en rood blijft de
// enige gevarenkleur. Daarom is de boerenzakdoek geblokt cream/groen; een rode doek in de
// UI zou als waarschuwing lezen. De namen zijn droog en satirisch, zoals de rest van het
// spel; de vorm (vlak, ruit, vouw) draagt de verwijzing. Puur: geen DOM, geen THREE, geen
// opslag, zodat scripts/carrieresfeer_test.mjs de sferen kan natrekken.

const CREAM = 'rgba(240, 237, 228, 0.92)';
const CREAM_SOFT = 'rgba(240, 237, 228, 0.38)';
const GREEN = 'rgba(30, 158, 86, 0.92)';
const GREEN_LIGHT = 'rgba(63, 201, 122, 0.88)';
const GREEN_DARK = 'rgba(15, 92, 48, 0.94)';
const DARK = 'rgba(12, 20, 14, 0.72)';

// beeld: de lagen van background-image; maat: background-size voor alle lagen. Grote
// vlakken en een enkele duidelijke vorm in plaats van fijne lijntjes: kleur boven textuur.
const VORMEN = {
  // een cream perronbord op een donkergroene plaat
  spoor: {
    beeld: `linear-gradient(90deg, ${CREAM} 0 26%, transparent 26% 100%), linear-gradient(0deg, ${GREEN_DARK} 0 40%, ${DARK} 40% 100%), radial-gradient(circle at 13% 50%, ${GREEN_LIGHT} 0 6%, transparent 6.5%)`,
    maat: '100% 100%',
  },
  // een groene route met een cream halte
  halte: {
    beeld: `linear-gradient(90deg, transparent 0 14%, ${GREEN_LIGHT} 14% 26%, transparent 26%), radial-gradient(circle at 20% 38%, ${CREAM} 0 8%, transparent 8.5%), linear-gradient(0deg, ${GREEN_DARK} 0 32%, transparent 32%)`,
    maat: '100% 100%',
  },
  // de geblokte ruit van een taxi, groot en kleurig
  ruit: {
    beeld: `conic-gradient(from 90deg at 50% 50%, ${CREAM} 0 25%, ${GREEN_DARK} 0 50%, ${CREAM} 0 75%, ${GREEN_DARK} 0)`,
    maat: '34px 34px',
  },
  // een groene doos met een cream pakband
  band: {
    beeld: `linear-gradient(90deg, transparent 0 40%, ${CREAM} 40% 60%, transparent 60%), linear-gradient(0deg, transparent 0 34%, ${CREAM} 34% 66%, transparent 66%), linear-gradient(180deg, ${GREEN} 0 100%)`,
    maat: '100% 100%',
  },
  // een grote diagonale vrachtkleur
  chevron: {
    beeld: `linear-gradient(135deg, ${GREEN_DARK} 0 48%, ${CREAM} 48% 52%, ${GREEN_LIGHT} 52% 100%)`,
    maat: '100% 100%',
  },
  // grote golven op het water
  golf: {
    beeld: `radial-gradient(circle at 50% 130%, ${GREEN_LIGHT} 0 26%, ${CREAM} 26% 28%, ${GREEN} 28% 50%, ${CREAM} 50% 52%, transparent 52%)`,
    maat: '180px 100px',
  },
  // horizon met een grote zon
  horizon: {
    beeld: `radial-gradient(circle at 70% 32%, ${CREAM} 0 15%, transparent 15.5%), linear-gradient(180deg, ${GREEN_DARK} 0 50%, ${GREEN_LIGHT} 50% 54%, ${CREAM} 54% 57%, ${GREEN} 57% 100%)`,
    maat: '100% 100%',
  },
  // een groot controlekrusing op de hes
  vizier: {
    beeld: `radial-gradient(circle at 50% 50%, transparent 0 20%, ${CREAM} 20% 24%, transparent 24% 40%, ${CREAM} 40% 44%, transparent 44%), linear-gradient(90deg, transparent 0 48%, ${CREAM} 48% 52%, transparent 52%), linear-gradient(0deg, transparent 0 48%, ${CREAM} 48% 52%, transparent 52%)`,
    maat: '100% 100%',
  },
  // een cream dossier op een groene balie
  lijnen: {
    beeld: `linear-gradient(90deg, ${CREAM} 0 64%, transparent 64%), linear-gradient(0deg, ${GREEN_DARK} 0 100%), linear-gradient(0deg, transparent 0 72%, ${GREEN} 72% 100%)`,
    maat: '100% 100%',
  },
  // spotlights vanaf het podium
  stralen: {
    beeld: `conic-gradient(from 200deg at 18% 120%, ${GREEN_LIGHT} 0 14deg, transparent 14deg 26deg, ${CREAM} 26deg 40deg, transparent 40deg 52deg, ${GREEN} 52deg 66deg, transparent 66deg 90deg)`,
    maat: '100% 100%',
  },
  // een groot geblokt tafelkleed
  kleed: {
    beeld: `repeating-linear-gradient(0deg, ${GREEN} 0 20px, transparent 20px 40px), repeating-linear-gradient(90deg, ${GREEN} 0 20px, transparent 20px 40px), linear-gradient(${CREAM}, ${CREAM})`,
    maat: '40px 40px',
  },
  // vlaggetjes boven de kermis
  vlaggen: {
    beeld: `conic-gradient(from 135deg at 50% 0, ${GREEN} 0 90deg, transparent 90deg), conic-gradient(from 225deg at 50% 0, ${CREAM} 0 90deg, transparent 90deg)`,
    maat: '44px 30px',
  },
  // de boerenzakdoek: grove ruiten met een dubbele draad
  zakdoek: {
    beeld: `repeating-linear-gradient(0deg, ${GREEN} 0 20px, transparent 20px 40px), repeating-linear-gradient(90deg, ${GREEN} 0 20px, transparent 20px 40px), repeating-linear-gradient(0deg, ${CREAM} 6px 8px, transparent 8px 40px), repeating-linear-gradient(90deg, ${CREAM} 6px 8px, transparent 8px 40px), linear-gradient(${CREAM_SOFT}, ${CREAM_SOFT})`,
    maat: '40px 40px',
  },
  // een maatlat met een groot cream vlak en een groene klusbubbel
  maat: {
    beeld: `linear-gradient(90deg, ${CREAM} 0 18%, transparent 18%), linear-gradient(0deg, ${GREEN_DARK} 0 100%), radial-gradient(circle at 80% 30%, ${GREEN_LIGHT} 0 18%, transparent 18.5%)`,
    maat: '100% 100%',
  },
  // de lijnen van een padelbaan, dik en duidelijk
  baan: {
    beeld: `linear-gradient(90deg, transparent 0 10%, ${CREAM} 10% 13%, transparent 13% 87%, ${CREAM} 87% 90%, transparent 90%), linear-gradient(0deg, transparent 0 46%, ${CREAM} 46% 54%, transparent 54%), linear-gradient(${GREEN_DARK}, ${GREEN_DARK})`,
    maat: '100% 100%',
  },
  // hoogtelijnen van de golfbaan: twee grote ringen
  contour: {
    beeld: `radial-gradient(circle at 70% 50%, ${GREEN_LIGHT} 0 22%, ${CREAM} 22% 26%, ${GREEN} 26% 44%, transparent 44%)`,
    maat: '100% 100%',
  },
  // visschubben: twee grote schubben
  schub: {
    beeld: `radial-gradient(circle at 30% 40%, ${CREAM} 0 22%, transparent 22.5%), radial-gradient(circle at 70% 60%, ${GREEN_LIGHT} 0 26%, transparent 26.5%)`,
    maat: '100% 100%',
  },
  // startgrid van het circuit, met het felle groen van de startlampen
  grid: {
    beeld: `conic-gradient(from 90deg at 50% 50%, ${CREAM} 0 25%, ${GREEN_LIGHT} 0 50%, ${CREAM} 0 75%, ${GREEN_LIGHT} 0)`,
    maat: '30px 30px',
  },
  // terreinlijnen van de kaart: grote heuvelvlakken
  terrein: {
    beeld: `linear-gradient(135deg, ${GREEN_DARK} 0 55%, ${GREEN_LIGHT} 55% 100%), radial-gradient(ellipse at 70% 30%, ${CREAM} 0 18%, transparent 18.5%)`,
    maat: '100% 100%',
  },
  // bakstenen van de kade
  dam: {
    beeld: `linear-gradient(180deg, transparent 0 44%, ${DARK} 44% 50%, transparent 50%), repeating-linear-gradient(90deg, ${CREAM} 0 2px, transparent 2px 40px, ${GREEN_DARK} 40px 42px, transparent 42px 80px)`,
    maat: '80px 32px',
  },
};

// Eén sfeer per vak: de naam is de satirische sfeer, het motief de droge omschrijving.
export const SFEER = {
  trein: { naam: 'Altijd vertraging', vorm: 'spoor', motief: 'Het perronbord heeft altijd een excuus' },
  bus: { naam: 'Halte gemist', vorm: 'halte', motief: 'De bus rijdt net voor je neus weg' },
  taxi: { naam: 'Nachtrit', vorm: 'ruit', motief: 'De meter tikt, de grap is gratis' },
  bezorg: { naam: 'Bij de buren', vorm: 'band', motief: 'Het pakketje is al bij de buren' },
  vracht: { naam: 'Brug open', vorm: 'chevron', motief: 'De planning strandt bij de brug' },
  water: { naam: 'Rondje gracht', vorm: 'golf', motief: 'De brug is de baas van de gracht' },
  lucht: { naam: 'Rondje boven de stad', vorm: 'horizon', motief: 'De lucht is vrij, de wind niet' },
  handhaving: { naam: 'Parkeerbon', vorm: 'vizier', motief: 'Een souvenir van de gemeente' },
  kantoor: { naam: 'Loket gesloten', vorm: 'lijnen', motief: 'Het dossier is zoek, de koffie niet' },
  podium: { naam: 'Microfoon piept', vorm: 'stralen', motief: 'Het publiek lacht om de verkeerde reden' },
  horeca: { naam: 'Pannenkoek met alles', vorm: 'kleed', motief: 'Alles erop, ook de rekening' },
  kermis: { naam: 'Suikerspin', vorm: 'vlaggen', motief: 'De suikerspin plakt aan je jas' },
  landbouw: { naam: 'Boerenzakdoek', vorm: 'zakdoek', motief: 'De bietenbaron zwaait boven de klei', vouw: true },
  klus: { naam: 'Klusje van een uur', vorm: 'maat', motief: 'Twee uur later nog steeds' },
  padel: { naam: 'Bal over het hek', vorm: 'baan', motief: 'De baan naast de baan is dichterbij' },
  golf: { naam: 'Bal in de sloot', vorm: 'contour', motief: 'De molshoop wint' },
  hengelen: { naam: 'Weer een laars', vorm: 'schub', motief: 'De vis lacht terug' },
  race: { naam: 'Startgrid', vorm: 'grid', motief: 'Iedereen is kampioen tot de eerste bocht' },
  buiten: { naam: 'Heuvel op', vorm: 'terrein', motief: 'De heuvel is altijd hoger' },
  // De kade is geen eigen loopbaanvak, maar de klusbaan "tjalke" speelt zich er af; de vorm
  // blijft beschikbaar voor een volgende sfeer zonder een nieuwe kleur te verzinnen.
  kade: { naam: 'Kade', vorm: 'dam', motief: 'Bakstenen van de kade' },
};

const LEGE = { naam: '', vorm: '', motief: '' };

// Vier tonaliteiten binnen de bestaande tokens: een donkere plaat, donkergroen, veldgroen
// en een melkwitte waas. Zo krijgt elk vak niet alleen een ander vlak, maar ook een
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

// De tint van een sfeer (bestaande rgba-tokens, geen nieuwe hex): bruikbaar als accent van een paneel of kaart.
export function sfeerTint(id) {
  return TINT[TINT_VAN[id]] || '';
}

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

// Het patroon van een vorm, zonder tint of sfeer-id (#595): de activiteitenborden gebruiken
// dezelfde grote vlakken als de loopbaanbanden, zodat er geen tweede patroontabel ontstaat.
export function vormStijl(naam) {
  const v = VORMEN[naam];
  return v ? `background-image:${v.beeld};background-size:${v.maat};` : '';
}

export const VORM_IDS = Object.keys(VORMEN);

// De sfeerband boven een scherm met een eigen sfeer (#492, #609): het patroon van het vak,
// het icoon van het scherm als watermerk, de droge sfeernaam en een korte, echte regel
// erboven (13 px, geen ontwerptaal). Eén bron voor Loopbanen, Visboek en Boerderij, zodat
// een nieuw scherm dezelfde band krijgt en niemand een tweede kleur of patroon verzint.
// `icoon` is de HTML van het icoon van het scherm, `klein` een korte mededeling (mag leeg).
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function sfeerBandHtml(id, { icoon = '', klein = '' } = {}) {
  const s = SFEER[id];
  if (!s || !VORMEN[s.vorm]) return '';
  const stijl = sfeerStijl(id);
  return `<div class="lb-sfeer" style="${stijl}" title="${esc(s.motief)}">` +
    icoon + (klein ? `<span class="lb-sfeer-klein">${esc(klein)}</span>` : '') +
    `<span class="lb-sfeer-groot">${esc(s.naam)}</span>` +
    (s.vouw ? `<span class="lb-sfeer-vouw" style="${stijl}" aria-hidden="true"></span>` : '') + '</div>';
}

// De opmaak van die band; het scherm zet hem in zijn eigen stijlblok. Kleur alleen is nooit
// de enige cue: het patroon, het icoon en de naam staan ernaast. De kleine regel is 13 px,
// de menuvloer; niets in de band is kleiner.
export const SFEER_BAND_CSS = `
.lb-sfeer { position: relative; min-height: 116px; border-radius: 10px; overflow: hidden; box-shadow: inset 0 0 0 1px rgba(240, 237, 228, 0.10); flex: none; }
.lb-sfeer::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(12, 20, 14, 0.80) 0 54%, rgba(12, 20, 14, 0.34) 72%, rgba(12, 20, 14, 0.10) 100%); }
.lb-sfeer-ico { position: absolute; right: 18px; top: 50%; z-index: 2; display: block; width: 86px; height: 86px; margin: 0; padding: 15px; box-sizing: border-box; border-radius: 50%; background: rgba(12, 20, 14, 0.36); box-shadow: inset 0 0 0 1px rgba(240, 237, 228, 0.20); color: rgba(240, 237, 228, 0.94); transform: translateY(-50%); }
.lb-sfeer-groot { position: absolute; left: 14px; top: calc(50% + 6px); z-index: 2; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; max-width: calc(100% - 132px); overflow: hidden; transform: translateY(-50%); font: 40px "Bebas Neue", "Arial Narrow", Arial, sans-serif; line-height: 0.92; letter-spacing: 0.04em; text-transform: uppercase; color: rgba(240, 237, 228, 0.96); text-shadow: 0 2px 6px rgba(0, 0, 0, 0.55); }
.lb-sfeer-ico svg { width: 100%; height: 100%; fill: none; stroke: currentColor; stroke-width: 1.35; stroke-linecap: round; stroke-linejoin: round; }
.lb-sfeer-klein { position: absolute; left: 14px; top: 9px; z-index: 2; max-width: calc(100% - 132px); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font: 13px "Arial Narrow", Arial, sans-serif; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(240, 237, 228, 0.72); }
.lb-sfeer-vouw { position: absolute; right: 22px; bottom: -24px; z-index: 1; width: 64px; height: 64px; transform: rotate(45deg); border-radius: 3px; box-shadow: inset 0 0 0 1px rgba(240, 237, 228, 0.22), 0 2px 8px rgba(0, 0, 0, 0.22); pointer-events: none; }
.lb-sfeer-chip { width: 20px; height: 20px; border-radius: 5px; flex: none; box-shadow: inset 0 0 0 1px rgba(240, 237, 228, 0.18); }
@media (max-height: 820px) {
  .lb-sfeer { min-height: 86px; }
  .lb-sfeer-ico { width: 60px; height: 60px; padding: 10px; right: 12px; }
  .lb-sfeer-groot { font-size: 28px; left: 10px; top: calc(50% + 4px); max-width: calc(100% - 96px); }
  .lb-sfeer-klein { font-size: 13px; top: 6px; left: 10px; }
  .lb-sfeer-vouw { width: 46px; height: 46px; bottom: -18px; right: 16px; }
}`;
