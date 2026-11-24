// De markup van de boerderijplaatjes (22-11, docs/BOERDERIJ-VISUEEL-22-11.md): de plaatsvakken (data-fp) met een groot icoon, de lege staat en de sleutels. Node-safe en zonder three:
// farmcards.js en boerderijui.js maken hiermee HTML, farmpics.js (3D) vult de vakken later met een stilstaand plaatje. Sleutels:
//   m:<machine-id>  trekker, maaidorser, laadmachine   w:<type>  werktuig   dier:<koe|schaap|kip>   gebouw:<schuur|silo|kas>   gewas:<gewas-id>
import { icoon } from './icons.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const FP_MACHINES = { 'trekker-klein': 'tractor', 'trekker-groot': 'tractor', maaidorser: 'oogst', laadmachine: 'gereedschap' };
export const FP_IMPLEMENTS = { ploeg: 'ploeg', cultivator: 'cultivator', zaaimachine: 'zaaimachine', mestverspreider: 'mestverspreider', spuit: 'veldspuit', maaier: 'maaibalk', aanhanger: 'aanhanger' };
export const FP_ANIMALS = { koe: 'koe', schaap: 'schaap', kip: 'kip' };
export const FP_GEBOUWEN = { schuur: 'schuur', silo: 'silo', kas: 'kas' };
export const FP_CROPS = { aardappelen: 'aardappelen', bieten: 'suikerbieten', graan: 'graan', gras: 'gras', uien: 'uien', fruit: 'fruit' };
const CROP_ICON = { aardappelen: 'wortel', bieten: 'wortel', graan: 'oogst', gras: 'blad', uien: 'wortel', fruit: 'boom' };
const ANIMAL_ICON = { koe: 'koe', schaap: 'koe', kip: 'ei' };
// De kuddes uit livestock.js (melkvee, schapen, kippen) in de sleutels hierboven.
export const animalKey = (sp) => ({ melkvee: 'dier:koe', schapen: 'dier:schaap', kippen: 'dier:kip' }[sp] || '');

// { soort, id, icoon, naam } of null voor een onbekende sleutel.
export function fpMeta(sleutel) {
  const [soort, id] = String(sleutel || '').split(':');
  if (soort === 'm' && FP_MACHINES[id]) return { soort, id, icoon: FP_MACHINES[id], naam: id.startsWith('trekker') ? 'trekker' : id };
  if (soort === 'w' && FP_IMPLEMENTS[id]) return { soort, id, icoon: 'gereedschap', naam: FP_IMPLEMENTS[id] };
  if (soort === 'dier' && FP_ANIMALS[id]) return { soort, id, icoon: ANIMAL_ICON[id], naam: FP_ANIMALS[id] };
  if (soort === 'gebouw' && FP_GEBOUWEN[id]) return { soort, id, icoon: id === 'kas' ? 'gewas' : 'boerderij', naam: FP_GEBOUWEN[id] };
  if (soort === 'gewas' && FP_CROPS[id]) return { soort, id, icoon: CROP_ICON[id], naam: `veld met ${FP_CROPS[id]}` };
  return null;
}

// Het slot van een plaatje: een groot icoon als plek tot het 3D-plaatje er is (of zonder WebGL). maat: 's' (lijst), 'm' (kaart), 'l' (kop van het scherm).
// Het slot is een afbeelding voor de screenreader (role img); de naam staat ook als tekst in de kaart zelf.
export function fpHtml(sleutel, titel = '', maat = 's') {
  const i = fpMeta(sleutel);
  if (!i) return '';
  return `<span class="bd-fp bd-fp--${maat}" data-fp="${esc(sleutel)}" role="img" aria-label="${esc(titel ? `Plaatje van ${titel}` : `Plaatje van ${i.naam}`)}">` +
    `<span class="bd-fp__ic" aria-hidden="true">${icoon(i.icoon, { cls: 'ds-icoon' })}</span></span>`;
}

// De lege staat: een plaatje en één zin.
export function leegHtml(sleutel, zin) {
  return `<div class="ds-leeg bd-leeg">${fpHtml(sleutel, '', 'm')}<p>${esc(zin)}</p></div>`;
}

// Een groot getal met icoon en label (i.p.v. een zin): <span class="bd-getal"><icoon><b>€1.200</b><small>Omzet</small></span>.
export function getalHtml(iconNaam, waarde, label, toon = '') {
  return `<span class="bd-getal"${toon ? ` data-toon="${esc(toon)}"` : ''}><span class="bd-getal__ic" aria-hidden="true">${icoon(iconNaam, { cls: 'ds-icoon' })}</span><b>${esc(waarde)}</b><small>${esc(label)}</small></span>`;
}

// Uitleg op verzoek: een uitklapper met i-icoon; de tekst telt niet als zichtbare tekst (tekstdieet).
export function meerHtml(tekst, label = 'Uitleg') {
  return `<details class="bd-meer"><summary class="ds-z-link bd-meer__sum" aria-label="${esc(label)}">${icoon('info', { cls: 'ds-icoon' })}<span>${esc(label)}</span></summary><p>${esc(tekst)}</p></details>`;
}
