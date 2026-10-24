// De HUD van het golf (#453): de rij met baan, par, slag, afstand en stok (met iconen), de krachtbalk-tekst en het scorebord per
// speler. Puur (tekst in, tekst uit; alleen ensureGolfCss raakt de DOM aan) zodat scripts/golfhud_test.mjs het kan controleren.
// pitchputt.js geeft het aan createBoard (minigamekit.js, set({ row, extra, meter })). Alle tekst is minstens 12 px.
import { golfIcon } from './golficons.js';

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const komma = (v, d = 1) => v.toFixed(d).replace('.', ',');
export const afstandTekst = (m) => `${m < 10 ? komma(m) : Math.round(m)} m`;

// de rij boven het scherm: wie, baan, par, slag, vlag, stok en ondergrond
export function golfRij({ wie = '', baan, banen, par, slag, vlag, club, ondergrond = 'gras', straf = 0 }) {
  const stok = club === 'putter' ? 'putter' : 'wedge';
  const naamStok = club === 'putter' ? 'Putter' : ondergrond === 'zand' ? 'Wedge (zand)' : 'Wedge';
  const bij = ondergrond === 'zand' ? golfIcon('zand', 16) : '';
  return [
    wie ? `<span class="gf-wie">${golfIcon('beurt', 16)}<b>${esc(wie)}</b></span>` : '',
    `<span>Baan <b>${baan}</b>/${banen}</span>`,
    `<span>Par <b>${par}</b></span>`,
    `<span>Slag <b>${slag}</b>${straf ? ` <small class="gf-straf">+${straf} straf</small>` : ''}</span>`,
    `<span>${golfIcon('vlag', 18)}<b>${afstandTekst(vlag)}</b></span>`,
    `<span>${golfIcon(stok, 18)}${bij}${naamStok}</span>`,
  ].join('');
}

// de tekst bij de krachtbalk
export const krachtTekst = (v) => `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%`;

// Het scorebord: een rij per speler, een kolom per baan, het totaal tegen par rechts.
// spelers: [{ id, naam, cellen: [{ t, cls }], totaal, aanDeBeurt, kijkt, klaar }]; nummers: de banen (1..n) boven de kolommen; huidigeBaan: 0-gebaseerd
export function scoreTabel({ spelers, nummers, huidigeBaan }) {
  if (!spelers || !spelers.length) return '';
  const kop = `<tr><th scope="col"></th>${nummers.map((n, i) => `<th scope="col" class="${i === huidigeBaan ? 'on' : ''}">${n}</th>`).join('')}<th scope="col">Totaal</th></tr>`;
  const rijen = spelers.map((s) => {
    const naam = `${s.aanDeBeurt ? golfIcon('beurt', 14) : s.kijkt ? golfIcon('oog', 14) : ''}${esc(s.naam)}${s.klaar ? ' ✓' : ''}${s.kijkt ? ' <small>kijkt mee</small>' : ''}`;
    return `<tr class="${s.aanDeBeurt ? 'on' : ''}${s.kijkt ? ' kijkt' : ''}"><th scope="row">${naam}</th>${s.cellen.map((c, i) => `<td class="${(c.cls || '').trim()}${i === huidigeBaan ? ' nu' : ''}">${c.ic || ''}${esc(c.t)}</td>`).join('')}<td class="tot">${esc(s.totaal)}</td></tr>`;
  }).join('');
  return `<table class="gf-score"><thead>${kop}</thead><tbody>${rijen}</tbody></table>`;
}

// Eén cel van de scorekaart van een speler voor baan i: afgerond (slagen), bezig (huidige slagen) of nog niet (het nummer).
export function scoreCel(c, i, huidigeBaan, bezigSlagen = 0) {
  if (c.done) return { t: String(c.strokes), cls: c.strokes <= c.par ? 'good' : 'bad', ic: klasseIcoon(c.strokes, c.par) };
  if (i === huidigeBaan) return { t: bezigSlagen ? String(bezigSlagen) : '·', cls: '' };
  return { t: '-', cls: 'leeg' };
}

// De klasse van een baan in één woord (#453): eagle of beter, birdie, par, bogey of erger. Het icoon erbij is het
// motief in de scorekaart: vlag onder par, bal op par, zand erboven. Zo leest de kaart ook zonder kleur.
export function klasseVan(slagen, par) {
  if (slagen <= par - 2) return 'eagle';
  if (slagen === par - 1) return 'birdie';
  if (slagen === par) return 'par';
  if (slagen === par + 1) return 'bogey';
  return 'dubbel';
}

export function klasseIcoon(slagen, par) {
  return slagen < par ? golfIcon('vlag', 13) : slagen === par ? golfIcon('bal', 13) : golfIcon('zand', 13);
}

export const GOLF_CSS = `
#hud .mg-board .gf-ic { vertical-align: -3px; margin-right: 4px; }
#hud .mg-board .gf-wie { display: inline-flex; align-items: baseline; }
#hud .mg-board .gf-straf { font-size: 12px; color: #ff9a3c; letter-spacing: 0.5px; }
#hud .mg-board .gf-score { border-collapse: collapse; margin: 6px 0 2px; font-size: 14px; letter-spacing: 0.3px; color: rgba(240,237,228,0.85); }
#hud .mg-board .gf-score th, #hud .mg-board .gf-score td { padding: 2px 7px; text-align: center; font-weight: normal; }
#hud .mg-board .gf-score th[scope=row] { text-align: left; white-space: nowrap; }
#hud .mg-board .gf-score thead th { font-size: 12px; letter-spacing: 1px; color: rgba(240,237,228,0.6); }
#hud .mg-board .gf-score thead th.on { color: #ffd23f; }
#hud .mg-board .gf-score tr.on { background: rgba(63,201,122,0.18); color: #f0ede4; }
#hud .mg-board .gf-score tr.kijkt { opacity: 0.7; }
#hud .mg-board .gf-score td.nu { background: rgba(255,210,63,0.2); color: #fff; }
#hud .mg-board .gf-score td.good { color: #5dff7a; }
#hud .mg-board .gf-score td.bad { color: #ff9a3c; }
#hud .mg-board .gf-score td .gf-ic { margin-right: 3px; vertical-align: -2px; }
#hud .mg-board .gf-score td.leeg { color: rgba(240,237,228,0.35); }
#hud .mg-board .gf-score td.tot { color: #ffd23f; font-size: 15px; border-left: 1px solid rgba(240,237,228,0.2); }
@media (max-width: 480px) { #hud .mg-board .gf-score { font-size: 12px; } #hud .mg-board .gf-score th, #hud .mg-board .gf-score td { padding: 2px 4px; } }
`;

let cssKlaar = false;
export function ensureGolfCss() {
  if (cssKlaar || typeof document === 'undefined') return;
  cssKlaar = true;
  const st = document.createElement('style');
  st.textContent = GOLF_CSS;
  document.head.appendChild(st);
}
