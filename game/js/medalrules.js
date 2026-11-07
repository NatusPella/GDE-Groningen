// Medailles (#672): één uitleg en één rekenregel voor wat een medaille oplevert, zodat missies,
// vliegschool, postgame en de losse activiteiten hetzelfde verhaal vertellen. Eerst stond overal een
// los bedrag of alleen de naam van de medaille; nu zegt elke uitslag hetzelfde: welke trede, wat hij
// die keer opleverde (euro en loopbaanpunten) en wat de volgende trede nog kost.
//
// Puur (geen DOM, geen opslag) zodat de economie- en prestatietests hem dekken; de uitslagen van de
// activiteiten (discgolf, kartbaan, skatepark, ...) en de missiebeloning gebruiken dezelfde regels.
import { medalBonus, PG_PRIZE } from './economy.js';

export const MEDAILLES = ['geen medaille', 'Brons', 'Zilver', 'Goud'];

// De ene uitleg die overal terugkomt (prestaties, loopbaan, uitslagen). Nederlands, spelerstaal.
export const UITLEG =
  'Een medaille krijg je voor hoe goed je het deed: brons, zilver of goud. Wat hij oplevert verschilt per onderdeel: ' +
  'een missie betaalt een eenmalige bonus over de missiebeloning, de vliegschool betaalt per les de eerste keer, ' +
  'de postgame-uitdagingen hebben hun eigen prijs en een losse activiteit betaalt een vaste premie en loopbaanpunten. ' +
  'Dezelfde trede telt nooit twee keer: ga je van brons naar goud, dan krijg je alleen het verschil erbij.';

export const uitleg = () => UITLEG;

const heel = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v))) : 0);
const trede = (medal) => Math.max(0, Math.min(3, heel(medal)));

// Wat een medaille bij een bron oplevert: { geld, xp, eenmalig, tekst }. `geld` en `xp` zijn wat er
// die keer echt bij komt; `tekst` is de regel naast de medaille in de uitslag.
//   'missie'      opts.reward = missiebeloning, opts.van = hoogste al betaalde trede
//   'vliegschool' opts.geld = BELONING[medaille], opts.xp = MEDAILLE_XP[medaille], opts.eerste
//   'postgame'    de prijs per medaille uit economy.js
//   'activiteit'  opts.geld = premie van de activiteit, opts.xp = loopbaanpunten van de ronde
export function medailleBedrag(soort, medal, opts = {}) {
  const m = trede(medal);
  if (!m) return { geld: 0, xp: 0, eenmalig: false, tekst: 'Geen medaille: geen bedrag.' };
  if (soort === 'missie') {
    const reward = heel(opts.reward);
    const van = Math.max(0, Math.min(m, heel(opts.van)));
    const geld = van >= m ? 0 : medalBonus(reward, van, m);
    return { geld, xp: 0, eenmalig: true, tekst: geld > 0
      ? `${MEDAILLES[m]} · +€${geld.toLocaleString('nl-NL')} medaillebonus (eenmalig)`
      : `${MEDAILLES[m]} · bonus al gehaald` };
  }
  if (soort === 'vliegschool') {
    const eerste = opts.eerste !== false;
    const geld = eerste ? heel(opts.geld) : 0;
    const xp = heel(opts.xp);
    return { geld, xp, eenmalig: eerste, tekst: `${MEDAILLES[m]}${geld ? ` · +€${geld}` : ''}${xp ? ` · +${xp} punten` : ''}${eerste ? ' (eerste keer)' : ' (opnieuw: geen bedrag)'}` };
  }
  if (soort === 'postgame') {
    const geld = PG_PRIZE[m] || 0;
    const xp = heel(opts.xp);
    return { geld, xp, eenmalig: true, tekst: `${MEDAILLES[m]} · +€${geld.toLocaleString('nl-NL')}${xp ? ` · +${xp} punten` : ''}` };
  }
  if (soort === 'activiteit') {
    const geld = heel(opts.geld);
    const xp = heel(opts.xp);
    return { geld, xp, eenmalig: false, tekst: `${MEDAILLES[m]}${geld ? ` · +€${geld} premie` : ''}${xp ? ` · +${xp} punten` : ''}` };
  }
  return { geld: 0, xp: 0, eenmalig: false, tekst: MEDAILLES[m] };
}

// Seconden als 0:04 (de klok van een missie of ronde).
export function klokTekst(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  const m = Math.floor(s / 60), r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

// De eerstvolgende trede (#672): "nog 0:04 tot zilver". `drempels` zijn de grenzen van brons, zilver
// en goud in de eenheid van de activiteit; `lager` betekent: hoe lager hoe beter (tijd, slagen).
// Geeft { klaar, medal, nodig, tekst } of { onbekend: true } als de waarde geen getal is.
export function volgendeTrede(drempels, waarde, { lager = false, eenheid = '', klok = false } = {}) {
  const grenzen = Array.isArray(drempels) ? drempels : [];
  const w = Number(waarde);
  if (!Number.isFinite(w)) return { onbekend: true, klaar: false, tekst: '' };
  let volgende = null;
  for (let m = 1; m <= 3; m++) {
    const grens = Number(grenzen[m - 1]);
    if (!Number.isFinite(grens)) break;
    const gehaald = lager ? w <= grens : w >= grens;
    if (!gehaald) { volgende = { medal: m, nodig: lager ? w - grens : grens - w }; break; }
  }
  if (!volgende) return { klaar: true, medal: 3, nodig: 0, tekst: 'Alle drie de medailles gehaald.' };
  const nodig = Math.max(0, volgende.nodig);
  const waardeTekst = klok ? klokTekst(nodig) : `${Math.round(nodig).toLocaleString('nl-NL')}${eenheid ? ` ${eenheid}` : ''}`;
  return { klaar: false, medal: volgende.medal, nodig, tekst: `nog ${waardeTekst} tot ${MEDAILLES[volgende.medal].toLowerCase()}` };
}

// Voor een klassering (kartbaan, ringrace): de volgende plek tot zilver of goud.
export function volgendePlek(plek) {
  const p = heel(plek);
  if (!p) return { klaar: false, tekst: '' };
  if (p === 1) return { klaar: true, medal: 3, tekst: 'Goud: je stond bovenaan.' };
  return { klaar: false, medal: p === 2 ? 3 : 2, tekst: p === 2 ? 'nog 1 plek tot goud' : 'nog 1 plek tot zilver' };
}

// De regel "volgende trede" voor de resultaatbanner; lege string als er niets te zeggen valt.
export function volgendeTredeTekst(drempels, waarde, opts = {}) {
  const r = volgendeTrede(drempels, waarde, opts);
  return r && r.tekst ? r.tekst : '';
}
