// Dialoogvorm (#1134, WP11): overlap, onderbreking en stilte in een gesprek, als drie optionele tags per regel in het 09-script
// (`{ov=0.3}`, `{cut=1.4}`, `{pause=0.8}` achter de tekst, voor [NIEUW]) die de build in script.json zet als `form`. Zonder tags
// verandert er niets. Zuiver: geen DOM, geen wereld; scripts/dialoogvorm_test.mjs loopt het in node. Het afspelen (timing van de
// ondertitelpraat) staat in storytalk.js en gebruikt lineSchedule hieronder.
//   ov     overlap: de volgende regel start zoveel seconden vóór het einde van deze (een reactie of "Ja, maar..."); de ondertitel is
//          één regel tegelijk, dus dit is alleen timing: de stem van de volgende regel kan eerder beginnen (in een tweede, zacht kanaal
//          zodra de audiopijplijn dat heeft)
//   cut    onderbreking: deze regel wordt na zoveel seconden afgekapt (de tekst eindigt op "...") en de volgende begint meteen
//   pause  stilte: zoveel seconden stilte na deze regel in plaats van de standaardpauze (een stilte telt als beurt)
// Samen spelen: de vorm is tekst en timing bij de scène; een gast ziet dezelfde timing mee; niets over het net.
export const FORM_KEYS = ['ov', 'cut', 'pause'];
export const FORM_LIMITS = { ov: [0.1, 1.2], cut: [0.4, 6], pause: [0.2, 3] };
export const DEFAULT_GAP = 0.25;
export const MIN_START = 0.3;

const TAG = /\s*\{((?:ov|cut|pause)=\d+(?:\.\d+)?)\}/g;

// Haalt de tags uit een tekst: geeft { text, form }, `form` is null zonder tags. Een tag buiten de grenzen of een dubbele tag is een fout.
export function parseForm(raw) {
  const form = {};
  let bad = null;
  const text = String(raw).replace(TAG, (m, kv) => {
    const [k, v] = kv.split('=');
    const x = Number(v);
    const [lo, hi] = FORM_LIMITS[k];
    if (k in form) bad = `dubbele tag ${k}`;
    else if (!(x >= lo && x <= hi)) bad = `${k}=${v} buiten ${lo} tot ${hi}`;
    else form[k] = x;
    return '';
  }).trim();
  if (bad) throw new Error(`dialoogvorm: ${bad} in "${String(raw).slice(0, 40)}"`);
  if (form.ov !== undefined && form.cut !== undefined) throw new Error('dialoogvorm: ov en cut samen is dubbelzinnig');
  return { text, form: Object.keys(form).length ? form : null };
}

// De tijd van één regel in de ondertitelpraat. `dur` is de duur van de regel zelf (stem of leestijd), `baseGap` de standaardpauze.
// Geeft { holdS, untilNextS, text }: hoe lang de regel in beeld staat, hoeveel seconden na het begin de volgende start, en de tekst
// zoals die getoond wordt (een afgekapte regel eindigt op "...").
export function lineSchedule(line, dur, baseGap = DEFAULT_GAP) {
  const f = (line && line.form) || null;
  let hold = dur;
  let text = line ? line.text : '';
  let next = dur + baseGap;
  if (f) {
    if (f.cut !== undefined && f.cut < dur) {
      hold = f.cut;
      next = f.cut;
      text = text.replace(/[.!?…]+$/, '').replace(/\s+$/, '') + '...';
    }
    if (f.pause !== undefined) next = hold + f.pause;
    if (f.ov !== undefined) next = Math.max(MIN_START, hold - f.ov);
  }
  return { holdS: hold, untilNextS: next, text };
}

// Controle voor de tests: tags alleen op gesproken regels van een scène met minstens twee sprekers; een afgekapte regel is lang
// genoeg om te kappen.
export function formProblems(scenes) {
  const out = [];
  for (const sc of scenes) {
    const talkers = new Set(sc.lines.filter((l) => l.channel !== 'app-stil').map((l) => l.speaker));
    for (const [i, l] of sc.lines.entries()) {
      if (!l.form) continue;
      if (l.channel === 'app-stil') out.push(`${sc.id}#${i}: een stil appje heeft geen vorm`);
      if (l.form.ov !== undefined && talkers.size < 2) out.push(`${sc.id}#${i}: overlap in een scène van één spreker`);
      if (l.form.ov !== undefined && i === sc.lines.length - 1) out.push(`${sc.id}#${i}: overlap op de laatste regel`);
      if (l.form.cut !== undefined && l.text.split(/\s+/).length < 4) out.push(`${sc.id}#${i}: een afgekapte regel van minder dan vier woorden`);
    }
  }
  return out;
}
