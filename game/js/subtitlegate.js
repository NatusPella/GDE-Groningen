// Eén ondertitel tegelijk, en geen ondertitel over een menu of het laadscherm (23-11, vondst van de AI-review van 0.65.0).
// Puur, zonder DOM: overlayhold.js leest de lagen en zet de klasse ov-hold op wat hier terugkomt.
// Volgorde = voorrang: de film gaat voor het gesprek, het gesprek voor de achtergrondregels.
export const SUBTITLE_LAYERS = ['cine', 'story-talk', 'rv-sub', 'pg-sub', 'banter-sub', 'radio-sub'];

// Het ene ondertitelcomponent (subtitleui.js, subtitle.css): de klassen, en hoe elke laag in de DOM te vinden is
// (overlayhold.js zet er ov-hold op; de film telt pas als het vak een regel heeft).
export const SUB_CLASS = 'ds-sub';
export const SUB_SPEAKER_CLASS = 'ds-sub-speaker';
export const SUB_LINE_CLASS = 'ds-sub-line';
export const SUBTITLE_SELECTORS = { cine: '#cine.has-sub .cine-sub', 'story-talk': '#story-talk', 'rv-sub': '#rv-sub', 'pg-sub': '#pg-sub', 'banter-sub': '#banter-sub', 'radio-sub': '#radio-sub' };

// zichtbaar: de ids van de lagen die nu een regel tonen. blokkade: een menu, de kaart of het laadscherm is open.
// Geeft de ids terug die verborgen moeten worden.
export function hiddenSubtitles(zichtbaar, blokkade = false) {
  const live = SUBTITLE_LAYERS.filter((id) => zichtbaar.includes(id));
  if (blokkade) return new Set(live);
  return new Set(live.slice(1));
}
