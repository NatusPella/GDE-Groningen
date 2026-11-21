// Maakt docs/beeld-21-11/vertrekbord/mock.html: het vertrekbord oud (vier cellen) naast nieuw (tijdlijn), met de echte tokens, de echte
// bord-CSS (minigamekit.js) en de echte tijdlijnlogica (departuretimeline.js, departuretimelineui.js) (#1085, 21-11). Geen spel, geen Electron.
// Daarna maakt `node scripts/vertrekbord_shots.mjs` de PNG's met een headless Chrome.
//   node scripts/vertrekbord_mock.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CSS as BORD_CSS, mgIcoon } from '../game/js/minigamekit.js';
import { sfeerVan } from '../game/js/activiteitensfeer.js';
import { bordCellen, bordBron } from '../game/js/stationlife.js';
import { buildTimeline } from '../game/js/departuretimeline.js';
import { timelineHtml, STL_CSS } from '../game/js/departuretimelineui.js';
import { tijdLabel } from '../game/js/dienstregeling.js';

const UIT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'beeld-21-11', 'vertrekbord', 'mock.html');
const NU = 13 * 3600;
const rij = (min, lijn, richting, spoor, extra = {}) => ({ lijn, richting, dir: 1, k: `${lijn}${min}`, spoor, plan: NU + min * 60, tijd: NU + min * 60, vertraging: 0, reden: '', vervallen: false, live: false, ...extra });

// dezelfde vijf treinen als op het referentiebeeld (screenshot 70), plus de live-varianten
const ROOSTER = [rij(2, 'Intercity Zwolle', 'Zwolle', 6), rij(4, 'Stoptrein Delfzijl', 'Delfzijl', 1), rij(8, 'Stoptrein Europapark', 'Groningen Europapark', 2), rij(17, 'Stoptrein Eemshaven', 'Eemshaven', 1), rij(26, 'Intercity Zwolle', 'Zwolle', 6)];
const LIVE = [
  rij(2, 'Intercity Zwolle', 'Zwolle', 6, { plan: NU - 60, vertraging: 180, live: true, reden: 'Zo meldt de open reisinformatie' }),
  rij(4, 'Stoptrein Delfzijl', 'Delfzijl', 1, { live: true }),
  rij(8, 'Stoptrein Europapark', 'Groningen Europapark', 2, { vervallen: true, live: true }),
  rij(17, 'Stoptrein Eemshaven', 'Eemshaven', 1, { plan: NU - 60 * 4, vertraging: 21 * 60, live: true }),
  rij(26, 'Intercity Zwolle', 'Zwolle', 6),
];
const view = (bord, nu = NU, echt = true) => ({ name: 'Groningen Hoofdstation', nu, bord, eerst: bord.find((r) => !r.vervallen) || null, echtRooster: echt });

const sfeer = sfeerVan('station');
const kop = (v, bron) => `${sfeer.vorm ? '<span class="mg-vorm" aria-hidden="true"></span>' : ''}<small>${mgIcoon('beurt')}<span>VERTREKBORD</span><em class="mg-sfeer">${sfeer.naam}</em></small><div class="mg-row"><b>${v.name}</b> &middot; ${tijdLabel(v.nu)} <em class="mg-sfeer">${bron.kort}</em></div>`;
const bordAttr = `class="mg-board" data-sfeer="station" data-sfeerbord="${sfeer.bordvorm}"`;

function oud(v, opts) {
  const bron = bordBron(v, opts);
  const cellen = bordCellen(v).map((c) => `<i class="${c.cls}">${c.t}</i>`).join('');
  return `<div ${bordAttr}>${kop(v, bron)}<div class="mg-cells">${cellen}</div><div class="mg-extra">${bron.eerste ? `<span>${bron.eerste}</span>` : ''}</div><div class="mg-flash${v.eerst && v.eerst.vertraging >= 60 ? '' : ''}">${v.eerst && v.eerst.vertraging >= 60 ? v.eerst.reden : ''}</div><div class="mg-help">${bron.regel}</div></div>`;
}
function nieuw(v, opts) {
  const bron = bordBron(v, opts);
  const m = buildTimeline(v);
  return `<div ${bordAttr}>${kop(v, bron)}${timelineHtml(m)}<div class="mg-flash">${v.eerst && v.eerst.vertraging >= 60 ? v.eerst.reden : ''}</div><div class="mg-help">${bron.regel}</div></div>`;
}

const LIVESTAND = { aan: true, laatsteOk: 1000000, reden: null, aantal: 14 };
const roosterOpts = { instelling: true, liveStand: null, nu: 1000000 };
const liveOpts = { instelling: true, liveStand: LIVESTAND, nu: 1000000 + 20000 };

const vak = (titel, html, w = 'auto') => `<section class="vak" style="width:${w}"><h2>${titel}</h2>${html}</section>`;
const NACHT = view([rij(0, 'Stoptrein Delfzijl', 'Delfzijl', 1, { tijd: 86400 + 5 * 3600 + 12 * 60, plan: 86400 + 5 * 3600 + 12 * 60 }), rij(0, 'Intercity Zwolle', 'Zwolle', 6, { tijd: 86400 + 5 * 3600 + 40 * 60, plan: 86400 + 5 * 3600 + 40 * 60 })], 23 * 3600 + 58 * 60);

const views = {
  vergelijk: [vak('Oud: vier cellen (Rooster)', oud(view(ROOSTER), roosterOpts)), vak('Nieuw: tijdlijn (Rooster)', nieuw(view(ROOSTER), roosterOpts))],
  live: [vak('Oud: Live met +3, vervalt en +21', oud(view(LIVE), liveOpts)), vak('Nieuw: Live met +3, vervalt en +21', nieuw(view(LIVE), liveOpts))],
  staten: [
    vak('Nieuw: nacht, eerste trein 05:12 (nu 23:58)', nieuw(NACHT, roosterOpts)),
    vak('Nieuw: geen trein meer', nieuw(view([]), roosterOpts)),
    vak('Nieuw: een trein, vertrekt nu', nieuw(view([rij(0.2, 'Intercity Zwolle', 'Zwolle', 6)]), roosterOpts)),
  ],
  smal: [vak('Nieuw: smal scherm (460 px, onder 1100 px breed)', nieuw(view(LIVE), liveOpts), '460px')],
};

const html = `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><title>Vertrekbord: oud en nieuw (#1085)</title>
<link rel="stylesheet" href="../../../game/fonts/fonts.css">
<link rel="stylesheet" href="../../../game/js/ds-tokens.css">
<link rel="stylesheet" href="../../../game/js/ds-micro.css">
<style>${BORD_CSS}${STL_CSS}</style>
<style>
html, body { margin: 0; background: #53636b; font-family: var(--ds-font-zeef-tekst); }
body { padding: 18px 24px; }
.vak { display: inline-block; vertical-align: top; margin: 0 24px 22px 0; }
.vak h2 { margin: 0 0 8px; font: 800 18px var(--ds-font-zeef-kop); letter-spacing: 2px; text-transform: uppercase; color: #f3ead3; }
#hud .mg-board { position: relative; left: auto; top: auto; transform: none; max-width: none; }
.weergave { display: none; }
</style></head>
<body><div id="hud">
${Object.entries(views).map(([k, v]) => `<div class="weergave" id="${k}">${v.join('')}</div>`).join('\n')}
</div><script>(document.getElementById(location.hash.slice(1)) || document.getElementById('vergelijk')).style.display = 'block';</script></body></html>
`;
fs.mkdirSync(path.dirname(UIT), { recursive: true });
fs.writeFileSync(UIT, html);
console.log(`geschreven: ${UIT}`);
