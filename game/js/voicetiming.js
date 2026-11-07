// Stemtijden vóór het compileren van een scène (#731). attachVoices in cinematics.js
// rekte de scèneduur pas op in playCinematic: ná cutscenehost.compileScene. De shots,
// cues en L-tijden waren dan al met de oude duur gecompileerd, dus aan het eind liepen
// beeld en stem uit elkaar en vuurden deuren/props op de oude tijd. Deze pure functie
// doet hetzelfde werk (regels zonder opname krijgen er een uit de bank, de rest schuift
// op en de duur rekt mee) maar dan vóórdat er gecompileerd wordt; attachVoices gebruikt
// hem ook, zodat er één bron is.
//
// Regels met `own` (de scène speelt de stem zelf) of met een eigen `voice` blijven staan:
// de gast moet dezelfde opname en dezelfde ondertiteltijden houden als de gastheer (#711).
// Idempotent: een tweede keer plannen verandert niets meer.
export function plannedVoiceLines(lines, duration, voiceFor) {
  const leeg = { lines: Array.isArray(lines) ? lines : [], duration, changed: false };
  if (!Array.isArray(lines) || !lines.length || typeof voiceFor !== 'function') return leeg;
  let found = false;
  const voiced = lines.map((l) => {
    const v = !l.voice && !l.own && voiceFor(l.speaker, l.text);
    if (!v) return l;
    found = true;
    return { ...l, voice: v.src, vdur: v.dur };
  });
  if (!found) return { lines, duration, changed: false };
  const start = 0.5;
  const even = Math.max(0.5, (Number.isFinite(duration) ? duration : 0) - start - 0.2) / voiced.length;
  let shift = 0;
  const uit = voiced.map((l, i) => {
    const dur0 = l.dur ?? even;
    const o = { ...l, at: (l.at ?? start + i * even) + shift, dur: l.vdur ? Math.max(dur0, l.vdur + 0.25) : dur0 };
    shift += o.dur - dur0;
    return o;
  });
  const end = uit[uit.length - 1];
  const nieuweDuur = Math.max((Number.isFinite(duration) ? duration : 0) + shift, end.at + end.dur + 0.2);
  return { lines: uit, duration: nieuweDuur, changed: true };
}

// Alleen de duur, voor een aanroeper die de regels al heeft (tests, een snelle check).
export const voicedDuration = (lines, duration, voiceFor) => plannedVoiceLines(lines, duration, voiceFor).duration;
