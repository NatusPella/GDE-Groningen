// Speaker colours for every subtitle surface (cutscenes, bubbles, calls,
// banter, the phone). One colour per character, the same as in
// docs/personages.md. Every colour has a relative luminance of about
// 0.17-0.30, so the bold name stays readable on the dark subtitle shadow and
// on the light speech bubble; Tammo (blue) and Tessa (orange) are the
// Okabe-Ito pair that stays apart for every common colour blindness.
// Pure data plus two tiny helpers: Node scripts may import it.

const SPEAKER_COLORS = {
  Tammo: '#2a8ad4',
  Anita: '#d86b00',
  Rikus: '#a35ad6',
  'Jelle Terpstra': '#d93a63',
  Durk: '#3f9a3f',
  Douwe: '#20968a',
  'Berend Bos': '#a47a34',
  Torenwachter: '#9a8f6a',
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
  'Rotor Roelf': '#2a9ab8',
  'Boer Roelf': '#9a7a52',
  Hilje: '#a8709a',
  // the new story (storyarc_nieuw.js)
  Geesje: '#c28a3e',
  Lammert: '#4c8fa8',
  Roelfien: '#79a23c',
  Wubbo: '#6f8fb0',
  Tinus: '#b0883a',
  'Mevrouw Hoving': '#a47ab8',
  // Deel 4
  Willemien: '#9a86b4',
  Buurvrouw: '#c4788c',
};
// generic NPCs, bijbaan bosses, radio and navigation voices
const NEUTRAL = '#8a8a8a';

// The one place where a speaker id becomes the name players see. Speaker ids
// key the voice manifests ("Anita|<text>"), SPEAKER_COLORS and the TTS cast,
// and the character key 'anita' is in saves, so those stay. On screen she is
// called Tessa.
const DISPLAY_NAME = { Anita: 'Tessa' };
// character key ('tammo' / 'anita', as in saves) -> the name on screen
const CHARACTER_NAME = { tammo: 'Tammo', anita: 'Tessa' };
export const charName = (key) => CHARACTER_NAME[key] || CHARACTER_NAME.tammo;

// "Tammo (gids)" and "Schipper Wiebe (megafoon)" are still Tammo and Wiebe.
export const baseSpeaker = (name) => String(name || '').replace(/\s*\(.*\)$/, '');
// "Anita" -> "Tessa", "Anita (gids)" -> "Tessa (gids)"; other names as they are
export const displayName = (name) => {
  const s = String(name || ''), b = baseSpeaker(s);
  return DISPLAY_NAME[b] ? DISPLAY_NAME[b] + s.slice(b.length) : s;
};
const SPEAKER_ID = Object.fromEntries(Object.entries(DISPLAY_NAME).map(([id, shown]) => [shown, id]));
export const speakerColor = (name) => SPEAKER_COLORS[baseSpeaker(name)] || SPEAKER_COLORS[SPEAKER_ID[baseSpeaker(name)]] || NEUTRAL;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// `<b class="spk">Tammo:</b> ` in Tammo's colour, or '' without a name.
export function speakerHtml(name) {
  if (!name) return '';
  return `<b class="spk" style="color:${speakerColor(name)}">${esc(displayName(name))}:</b> `;
}

// Same for an element that only holds the name (textContent + colour).
export function paintSpeaker(el, name) {
  if (!el) return;
  el.textContent = name ? displayName(name) + ':' : '';
  el.style.color = name ? speakerColor(name) : '';
  el.style.fontWeight = 'bold';
}
