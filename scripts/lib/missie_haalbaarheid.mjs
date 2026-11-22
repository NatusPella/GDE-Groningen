// De rekenregels van de haalbaarheidsaudit voor missies (moeilijkheid, besluit eigenaar 22-11). Puur: geen wereld, geen DOM.
// Een missie met een klok (tijdslimiet) of een medailletijd moet haalbaar zijn: de kortst mogelijke looptijd is de tijd van
// de scènes en gesprekken die op de klok staan, de wachttijden (hold) en de reistijd tussen de doelen. Een doel mag strak
// zijn (een medaille is een uitdaging), maar nooit onder wat een foutloze run al kost.
//   minSeconds(def, ctx)      kortst mogelijke looptijd van de hoofdlijn
//   judgeMission(...)         lijst afwijkingen met een voorstel
// Het hoofdpad (de tijdslimiet) krijgt ruime tijd, ook op Uitdagend (tijd x0,85); een medaille mag strak zijn, op Uitdagend
// (medailles x0,8) nog steeds boven het foutloze minimum.

// m/s: de snelste haalbare tempo (sprint 6,8 te voet, een fiets met sprint ca. 9, een auto in de stad ca. 16): het minimum is een ondergrens
export const SPEED = Object.freeze({ foot: 6.8, vehicle: 16, bike: 9, boat: 11, air: 25 });
export const ROUTE_FACTOR = 1.3;          // een route is langer dan de vogelvlucht
export const LIMIT_MARGIN = 1.8;          // tijdslimiet >= 1,8 x het minimum (op Uitdagend, x0,85, nog 1,5 x)
export const GOLD_MARGIN = 1.25;          // goud >= 1,25 x het minimum (op Uitdagend, x0,8, nog 1,0 x)
export const SILVER_MARGIN = 1.4;         // zilver >= 1,4 x het minimum
export const UITDAGEND_TIME = 0.85;       // difficulty.js DIFFICULTY.uitdagend.time (de test houdt ze gelijk)
export const UITDAGEND_TARGET = 0.8;      // difficulty.js DIFFICULTY.uitdagend.target

const READING_CAP = 12;
export const readingSeconds = (text) => Math.max(2.2, Math.min(READING_CAP, 1.3 + String(text || '').length * 0.058));

// Duur van een regel in een scène: de opname (met 0,25 s lucht) als die langer is dan de leestijd, anders de leestijd; plus een pauze.
export function lineSeconds(line, voiceDur = 0) {
  if (!line || line.channel === 'app-stil') return 0;
  const read = readingSeconds(line.text);
  return (voiceDur > 0 ? Math.max(read, voiceDur + 0.25) : read) + 0.1;
}

// Duur van een lijst regels uit script.json; `voiceOf(line)` geeft de duur van de opname of 0.
export function linesSeconds(lines, voiceOf = () => 0) {
  return (lines || []).reduce((t, l) => t + lineSeconds(l, voiceOf(l)), 0);
}

// Duur van een stap die niet reist: een scène (script of eigen regels), een wachttijd, een vaste duur.
// `scenes` = Map of object id -> scène uit script.json.
export function stageFixedSeconds(st, { scenes = {}, voiceOf = () => 0 } = {}) {
  if (!st) return 0;
  let t = 0;
  if (st.kind === 'scene') {
    const ids = st.script && st.script.ids ? [].concat(st.script.ids) : [];
    for (const id of ids) {
      const sc = scenes[id];
      if (!sc) continue;
      let ls = sc.lines || [];
      if (st.script && (st.script.from || st.script.to != null)) ls = ls.slice(st.script.from || 0, st.script.to == null ? undefined : st.script.to);
      t += linesSeconds(ls, voiceOf);
    }
    if (Array.isArray(st.lines)) t += st.lines.reduce((s, l) => s + readingSeconds(Array.isArray(l) ? l[1] : l && l.text) + 0.1, 0);
  }
  if (st.kind === 'hold' && Number.isFinite(st.time)) t += st.time;
  return t;
}

// De klok van een missie met checkpoints: de starttijd plus de bonus van elk checkpoint dat geen doorrijpunt (via) is (missions.js: timeLeft += wp.bonus ?? def.checkpointBonus).
export function limitSeconds(def) {
  if (!Number.isFinite(def.timeLimit) || !(def.timeLimit > 0)) return null;
  const bonus = (def.waypoints || []).reduce((t, w) => t + (w && !w.via ? (Number.isFinite(w.bonus) ? w.bonus : def.checkpointBonus || 0) : 0), 0);
  return def.timeLimit + bonus;
}

export const legSeconds = (dist, mode = 'foot') => (Number.isFinite(dist) && dist > 0 ? (dist * ROUTE_FACTOR) / (SPEED[mode] || SPEED.foot) : 0);

// Kortst mogelijke looptijd. ctx.legs = [{ dist, mode }] (de audit rekent die met de wereld uit; zonder wereld is het []).
export function minSeconds(def, ctx = {}) {
  const fixed = (def.stages || []).reduce((t, st) => t + stageFixedSeconds(st, ctx), 0);
  const travel = (ctx.legs || []).reduce((t, l) => t + legSeconds(l.dist, l.mode), 0);
  return { fixed, travel, total: fixed + travel };
}

const up10 = (s) => Math.ceil(s / 10) * 10;

// Wat is er mis met de doelen van een missie? goals = { gold, silver } uit MISSION_GOALS (of null).
// Geeft [{ soort, waarde, minimum, voorstel, tekst }].
export function judgeMission(def, goals, ctx = {}) {
  const m = minSeconds(def, ctx);
  const out = [];
  if (!(m.total > 0)) return out;
  const f = (s) => `${Math.round(s)} s`;
  const limit = limitSeconds(def);
  if (limit != null) {
    const need = m.total * LIMIT_MARGIN;
    if (limit < need) out.push({ soort: 'timeLimit', waarde: limit, minimum: m.total, voorstel: up10(need), tekst: `tijdslimiet ${f(limit)} (met checkpointbonus) is krapper dan 1,8 x het foutloze minimum (${f(m.total)}: ${f(m.fixed)} scènes en wachten, ${f(m.travel)} reizen)` });
  }
  if (Number.isFinite(def.medalTime) && def.medalTime > 0) {
    const need = m.total * GOLD_MARGIN;
    if (def.medalTime < need) out.push({ soort: 'medalTime', waarde: def.medalTime, minimum: m.total, voorstel: up10(need), tekst: `medailletijd ${f(def.medalTime)} is krapper dan 1,25 x het foutloze minimum (${f(m.total)})` });
  }
  if (goals && Number.isFinite(goals.gold)) {
    if (goals.gold < m.total * GOLD_MARGIN) out.push({ soort: 'gold', waarde: goals.gold, minimum: m.total, voorstel: up10(m.total * GOLD_MARGIN), tekst: `goud ${f(goals.gold)} is krapper dan 1,25 x het foutloze minimum (${f(m.total)})` });
    if (Number.isFinite(goals.silver) && goals.silver < m.total * SILVER_MARGIN) out.push({ soort: 'silver', waarde: goals.silver, minimum: m.total, voorstel: up10(m.total * SILVER_MARGIN), tekst: `zilver ${f(goals.silver)} is krapper dan 1,4 x het foutloze minimum (${f(m.total)})` });
  }
  return out;
}
