// De detectoren van de proefspeler bij elkaar (docs/PROEFSPELER.md, "Detectoren"). Eén ingang voor de bundel: `detecteer(events, { map })`
// geeft een platte lijst bevindingen { type, soort, ernst, stap, plek, t, tekst, shot?, bewijs } uit de events.jsonl van één run
// (en, met `map`, uit de beelden ernaast). Geen Electron: alles wat de page-kant (detect/page.js) niet in het logboek zette, bestaat niet.
import { consoleBevindingen } from './console.mjs';
import { hitchBevindingen } from './frametijd.mjs';
import { leesBevindingen } from './lezen.mjs';
import { contextBevindingen } from './wereldcontext.mjs';
import { bereikBevindingen } from './bereikbaar.mjs';
import { eerlijkBevindingen } from './eerlijk.mjs';
import { beeldAudit } from './beeld.mjs';
import { dedupeDom } from './dom.mjs';

// De DOM-audit draait in de pagina (hij heeft de DOM nodig); het logboek bevat de uitkomst als 'detect'-regels.
export function domBevindingen(events) {
  const uit = [];
  for (const e of events.filter((q) => q.type === 'detect' && q.soort === 'dom')) {
    for (const i of dedupeDom(e.items || [])) uit.push({ type: i.type, soort: 'dom', ernst: i.ernst, stap: e.stap || '', plek: e.plek || null, t: e.t, tekst: i.tekst, shot: e.shot || '', bewijs: { ...i.bewijs, sel: i.sel, rect: i.rect, scherm: e.scherm || null } });
  }
  return uit;
}

export const DETECTOREN = {
  dom: (ev) => domBevindingen(ev),
  console: (ev) => consoleBevindingen(ev),
  frame: (ev) => hitchBevindingen(ev),
  lezen: (ev) => leesBevindingen(ev),
  wereld: (ev) => contextBevindingen(ev),
  bereik: (ev) => bereikBevindingen(ev),
  eerlijkheid: (ev) => eerlijkBevindingen(ev),
};

export function detecteer(events, { map = null, uit = [] } = {}) {
  const lijst = [];
  for (const [naam, f] of Object.entries(DETECTOREN)) {
    if (uit.includes(naam)) continue;
    try { lijst.push(...f(events)); } catch (e) { lijst.push({ type: 'detector-fout', soort: naam, ernst: 'cosmetisch', stap: '', plek: null, t: null, tekst: '', bewijs: { fout: String(e && e.message || e) } }); }
  }
  let beeldStats = [];
  if (map && !uit.includes('beeld')) {
    try { const r = beeldAudit(events, map); lijst.push(...r.bevindingen); beeldStats = r.stats; } catch (e) { lijst.push({ type: 'detector-fout', soort: 'beeld', ernst: 'cosmetisch', stap: '', plek: null, t: null, tekst: '', bewijs: { fout: String(e && e.message || e) } }); }
  }
  // een bevinding zonder stap krijgt de stap die op dat tijdstip actief was (de laatste step-begin ervoor)
  const stappen = events.filter((e) => e.type === 'step' && e.event === 'begin').map((e) => ({ t: e.t, id: e.id }));
  for (const b of lijst) if (!b.stap && Number.isFinite(b.t)) { const s = [...stappen].reverse().find((q) => q.t <= b.t); if (s) b.stap = s.id; }
  return { bevindingen: lijst, beeldStats };
}
