// Speaker colours for every subtitle surface (cutscenes, bubbles, calls,
// banter, the phone). One colour per character, the same as in
// docs/personages.md. Every colour has a relative luminance of about
// 0.17-0.30, so the bold name stays readable on the dark subtitle shadow and
// on the light speech bubble; Tammo (blue) and Anita (orange) are the
// Okabe-Ito pair that stays apart for every common colour blindness.
// Pure data plus two tiny helpers: Node scripts may import it.

export const SPEAKER_COLORS = {
  Tammo: '#2a8ad4',
  Anita: '#d86b00',
  Rikus: '#a35ad6',
  'Jelle Terpstra': '#d93a63',
  Durk: '#3f9a3f',
  Douwe: '#20968a',
  'Bommen Berend': '#a47a34',
  'Oma Trijntje': '#cc5f90',
  'Mem Terpstra': '#c0507a',
  Sjabbe: '#8c8a3c',
  Jelmer: '#a38a00',
  Sjoerd: '#5f9848',
  Henk: '#6f8bb0',
  Harm: '#a5823c',
  Geert: '#b27850',
  Femke: '#b464c4',
  'Kapitein Klaas': '#3f86a8',
  'Duivenmelker Bert': '#7282c4',
  'Dokter Dijkstra': '#dd4b44',
  Hilly: '#c0609e',
  'Schipper Wiebe': '#cf5a2e',
  'Koe Aaltje': '#818b58',
  'Koe Grietje': '#94866e',
  'Ome Jan': '#7a8a3a',
  'Koe Geertje': '#9a7a5a',
};
// generic NPCs, bijbaan bosses, radio and navigation voices
export const NEUTRAL = '#8a8a8a';

// "Tammo (gids)" and "Schipper Wiebe (megafoon)" are still Tammo and Wiebe.
export const baseSpeaker = (name) => String(name || '').replace(/\s*\(.*\)$/, '');
export const speakerColor = (name) => SPEAKER_COLORS[baseSpeaker(name)] || NEUTRAL;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// `<b class="spk">Tammo:</b> ` in Tammo's colour, or '' without a name.
export function speakerHtml(name) {
  if (!name) return '';
  return `<b class="spk" style="color:${speakerColor(name)}">${esc(name)}:</b> `;
}

// Same for an element that only holds the name (textContent + colour).
export function paintSpeaker(el, name) {
  if (!el) return;
  el.textContent = name ? name + ':' : '';
  el.style.color = name ? speakerColor(name) : '';
  el.style.fontWeight = 'bold';
}
