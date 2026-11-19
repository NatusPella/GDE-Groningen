// De uitslag van de kermisrit (A2, de botsauto's, kermis.js): het publiek van de kermisavond reageert op de medaille.
// Puur (geen three, geen DOM): kermis.js vraagt hier wat het publiek doet en tekent het zelf. De medaillesting klinkt
// al vanzelf bij de uitslag (recordChallengeResult); er komt geen nieuwe spraak bij.
//
// Samen spelen: de rit is van wie hem start (activiteit, medaille en prijs per speler); het publiek is lokaal beeld bij
// de speler die de rit reed. Er gaat niets over het net.

// Per medaille (0 = geen): hoe lang het publiek reageert, met welke beweging en welk deel van de mensen meedoet.
export const UITSLAG = [
  { duur: 2.2, anim: 'shrug', aandeel: 0.4 },  // nog een rondje?
  { duur: 3.5, anim: 'wave', aandeel: 0.55 },  // brons
  { duur: 5.0, anim: 'cheer', aandeel: 0.8 },  // zilver
  { duur: 7.0, anim: 'cheer', aandeel: 1 },    // goud: iedereen
];

// De reactie bij een uitslag: { t, duur, anim, aandeel }. Rommel (geen getal, buiten 0 tot 3) geeft de rustigste.
export function uitslagReactie(medal) {
  const m = Number.isFinite(medal) ? Math.max(0, Math.min(3, Math.round(medal))) : 0;
  return { t: UITSLAG[m].duur, ...UITSLAG[m] };
}

// Doet bezoeker i mee? Een vaste verdeling (gulden snede), zodat het publiek niet in de maat beweegt.
export function doetMee(i, aandeel) {
  if (!(aandeel > 0) || !Number.isFinite(i)) return false;
  return aandeel >= 1 || ((Math.abs(i) * 0.6180339887) % 1) < aandeel;
}

// Wat bezoeker i nu doet: de animatie van de reactie, met een eigen vertraging per bezoeker (0 tot 0,6 s), of null als hij
// gewoon blijft staan (de reactie is voorbij of hij doet niet mee).
export function publiekAnim(reactie, i) {
  if (!reactie || !(reactie.t > 0) || !Number.isFinite(i)) return null;
  if (!doetMee(i, reactie.aandeel)) return null;
  const vertraging = ((i * 0.37) % 1) * 0.6;
  return reactie.duur - reactie.t >= vertraging ? reactie.anim : null;
}

// Eén tik van de reactie; geeft de nieuwe reactie (of null als hij voorbij is).
export function tikReactie(reactie, dt) {
  if (!reactie) return null;
  const t = reactie.t - (Number.isFinite(dt) && dt > 0 ? dt : 0);
  return t > 0 ? { ...reactie, t } : null;
}
