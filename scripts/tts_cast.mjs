// Shared by the TTS line lists (tts_lines_list, tts_banter_lines,
// tts_sidejobs_lines): Tammo and Anita's voices and the speech_metadata
// style every job is voiced with (scripts/gemini_tts.py).
// same as gemini_tts.MODEL: a clip whose tts.json entry has another model is re-recorded
export const TTS_MODEL = 'google/gemini-3.8-flash-tts';
export const ACCENT = 'spoken in Dutch with a Groningen accent';
// Gronings dialect lines (Grunnegs): said as written, not turned into Dutch
export const GRO_ACCENT = 'spoken in Gronings dialect (Grunnegs) exactly as written, warm Groningen accent';

// Tammo's dialect style may swap a Dutch word for its Gronings one ("Mien droom"); that is wanted.
export const DUO = {
  Tammo: { voice: 'Orus', who: 'dry, deadpan man in his thirties', accent: 'spoken in Gronings dialect (Grunnegs), warm and strong Groningen accent, like a born and bred Stadjer from the Oosterpark' },
  Anita: { voice: 'Callirrhoe', who: 'Groningse vrouw, lacherig en ad rem', accent: ACCENT },
};

export const styleOf = (who, tag, accent = ACCENT) => `${accent}; ${who}.${tag ? ` Tone: ${tag}.` : ''}`;
