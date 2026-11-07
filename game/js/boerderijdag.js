// #669: de dagelijkse keuze van de boerderij in één beeld. Wat staat er vandaag op het land (gewas per perceel,
// de dagprijs en de verwachte winst), welk contract is het meest waard en welke machine hoort bij de volgende
// taak. Puur: boerderij.js, gewasmarkt.js, percelen.js en boerderijcontracten.js leveren de regels, de UI tekent het.
import { GEWASSEN, gewasVoor, standaardVoor, volgendeTaak, MACHINES } from './boerderij.js';
import { dagVan, dagprijs } from './gewasmarkt.js';
import { PERCEEL_IDS, perceelDef } from './percelen.js';
import { openAanbod } from './boerderijcontracten.js';

const euro = (n) => '€' + Math.round(Number(n) || 0).toLocaleString('nl-NL');

// De keuze van vandaag: percelen met gewas, dagprijs en verwachte winst; het beste open contract; de volgende
// taak met de machine die erbij hoort; en de verwachte opbrengst bij elkaar.
export function dagKeuze(b) {
  if (!b || !b.bedrijf) return null;
  const dag = dagVan(b.uren);
  const percelen = [];
  for (const id of PERCEEL_IDS) {
    if (!b.bedrijf.percelen || !b.bedrijf.percelen[id]) continue;
    const def = perceelDef(id);
    const gewas = gewasVoor((b.plan && b.plan[id]) || standaardVoor(def.soort), def.soort);
    const g = GEWASSEN[gewas];
    if (!g) continue;
    const prijs = dagprijs(gewas, dag);
    const opbrengst = Math.round(g.kgBasis * prijs);
    const zaaigoed = g.zaaigoed || 0;
    percelen.push({ id, naam: def.naam, soort: def.soort, gewas, gewasNaam: g.naam, prijs, opbrengst, zaaigoed, verwacht: opbrengst - zaaigoed });
  }
  const aanbod = openAanbod(b.contracten || {});
  const contract = aanbod.slice().sort((x, y) => (y.bonus || 0) - (x.bonus || 0))[0] || null;
  const taak = volgendeTaak(b);
  const machine = taak ? machineVoor(taak, b) : null;
  const verwacht = percelen.reduce((s, p) => s + Math.max(0, p.verwacht), 0) + (contract ? contract.bonus || 0 : 0);
  return { dag, percelen, contract, taak, machine, verwacht };
}

// De machine die bij een taak hoort: de eigen machine als je hem hebt, anders de huur/koopprijs.
export function machineVoor(taak, b) {
  const m = Object.entries(MACHINES).find(([, d]) => d.taken.includes(taak));
  if (!m) return null;
  const [id, d] = m;
  const eigen = !!(b && b.bedrijf && b.bedrijf.machinepark && b.bedrijf.machinepark.machines || []).some((x) => x && x.type === id);
  return { id, naam: d.naam, taak, eigen, huur: d.huur, koop: d.koop };
}

// Eén regel voor de kop van het scherm (en de test): gewas, contract en verwachte winst.
export function dagKeuzeTekst(k) {
  if (!k) return '';
  const gewassen = [...new Set(k.percelen.map((p) => p.gewasNaam))].join(', ');
  const contract = k.contract ? `contract ${GEWASSEN[k.contract.gewas] ? GEWASSEN[k.contract.gewas].naam : k.contract.gewas} (${euro(k.contract.bonus)})` : 'geen contract';
  return `Vandaag: ${gewassen || 'geen perceel'} · ${contract} · verwacht ${euro(k.verwacht)}.`;
}
