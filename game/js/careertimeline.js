// De loopbaan-tour als tijdlijn (DS3, 21-11): de carrière-tour van Tammo en Tessa als route door de negentien loopbanen, in de volgorde waarin
// het verhaal ze noemt (storyarc.js LOOPBAAN_STAPPEN). Elke stop is done (je begon het vak), now (de eerstvolgende die open staat), next
// (open, maar niet de eerste) of closed (het verhaal opent hem nog niet, unlockgate.js). Een dichte stop verklapt niets: geen naam, geen icoon,
// alleen "Later in het verhaal". Wie het vak al begon (ook buiten het verhaal om) telt altijd als done en nooit als closed.
//
// Zuiver: geen DOM, geen wereld, geen opslag. `open(id)` is de poort (storyquery.js storyWorldOpen); het profiel is dat van de speler zelf.
// Samen spelen: voortgang is per speler (#429); een gast ziet zijn eigen tour en niets van een ander, er gaat niets over het net.
// Test: scripts/careertimeline_test.mjs.
import * as L from './loopbaan.js';
import { LOOPBAAN_STAPPEN } from './storyarc.js';
import { CAREER_FIT, FIT } from './careertour.js';

// De waarden staan ook in het scherm (data-staat) en in de CSS.
export const STATE = { done: 'gedaan', now: 'nu', next: 'volgende', closed: 'dicht' };

// De volgorde van de tour: elk vak één keer, op de eerste stap die het noemt; een vak dat geen stap noemt komt achteraan.
export function tourOrder(vakIds = L.VAK_IDS) {
  const seen = new Set();
  const out = [];
  for (const r of LOOPBAAN_STAPPEN) {
    for (const v of r.loopbanen) {
      if (seen.has(v) || !vakIds.includes(v)) continue;
      seen.add(v);
      out.push({ vak: v, deel: r.deel });
    }
  }
  for (const v of vakIds) if (!seen.has(v)) out.push({ vak: v, deel: null });
  return out;
}

// De stops met hun staat. `open`: de poort (id => boolean); zonder poort is alles open.
export function tourStops(profiel, open = () => true) {
  let nowSet = false;
  return tourOrder().map(({ vak, deel }, i) => {
    const info = L.vakInfo(vak);
    const began = L.isGestart(profiel, vak);
    const free = began || !!open(vak);
    let staat = STATE.closed;
    if (began) staat = STATE.done;
    else if (free && !nowSet) { staat = STATE.now; nowSet = true; } else if (free) staat = STATE.next;
    const fit = CAREER_FIT[vak];
    const shown = staat !== STATE.closed;
    return {
      nr: i + 1, vak: shown ? vak : null, deel, staat,
      naam: shown && info ? info.naam : null, icoon: shown && info ? info.icoon : null,
      goed: staat === STATE.done && fit ? FIT[fit.fit] : null,
      samen: staat === STATE.done && fit ? fit.together : null,
    };
  });
}

// De telling boven de tijdlijn: hoeveel done, hoeveel closed en welke stop nu is.
export function tourCount(stops) {
  const done = stops.filter((s) => s.staat === STATE.done).length;
  const closed = stops.filter((s) => s.staat === STATE.closed).length;
  const now = stops.find((s) => s.staat === STATE.now) || null;
  return { done, closed, total: stops.length, now: now ? now.vak : null, complete: stops.length > 0 && done === stops.length };
}

// De korte regel onder de naam (hooguit 40 tekens, tekstdieet): wat deze stop betekent.
export function stopLine(s) {
  if (s.staat === STATE.closed) return 'Later in het verhaal';
  if (s.staat === STATE.now) return 'Hier ga je nu verder';
  if (s.staat === STATE.next) return ''; // #1264: negen keer "Open voor je" is ruis; de staat zegt het al (stip en kleur)
  return s.goed ? `Gedaan · goed: ${s.goed}` : 'Gedaan';
}
