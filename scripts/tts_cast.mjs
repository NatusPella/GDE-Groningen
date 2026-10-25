// Shared by the TTS line lists (tts_lines_list, tts_banter_lines,
// tts_sidejobs_lines): Tammo and Tessa's voices and the speech_metadata
// style every job is voiced with (scripts/gemini_tts.py).
// same as gemini_tts.MODEL: the model new clips are recorded with over OpenRouter
export const TTS_MODEL = 'google/gemini-3.8-flash-tts';
// every model a recording may have been made with (gemini_tts.ACCEPTED): the lite model of #462 is
// the cheaper one for bulk work, and a clip recorded with it is not a re-recording candidate
export const TTS_MODELS = [TTS_MODEL, 'gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'];
// every clip is recorded from its Gronings spoken text (scripts/gronings_spoken.json); a clip
// whose tts.json entry has another lang is re-recorded
export const TTS_LANG = 'gro';
// the default for every voice: the spoken text is Gronings (scripts/gronings_spoken.json), said as written
export const GRO_ACCENT = 'spoken in Gronings dialect (Grunnegs) exactly as written, warm Groningen accent';
export const ACCENT = GRO_ACCENT;

// Tammo's dialect style may swap a Dutch word for its Gronings one ("Mien droom"); that is wanted.
export const DUO = {
  Tammo: { voice: 'Orus', who: 'dry, deadpan man in his thirties', accent: 'spoken in Gronings dialect (Grunnegs), warm and strong Groningen accent, like a born and bred Stadjer from the Oosterpark' },
  Anita: { voice: 'Callirrhoe', who: 'Nederlandse vrouw, lacherig en ad rem', accent: 'spoken in standard Dutch, clear and light, without a regional accent' },
};

// The short clips audio.js plays from fixed paths (tts_barks_lines.mjs), one
// voice per variant (_v0, _v1, ...). The first news voice is the sms
// newsreader ('Kiekdoar-redactie' in tts_lines_list.mjs).
export const CLIP_CAST = {
  npc: [
    { speaker: 'Stadjer (man)', voice: 'Sadaltager', who: 'gemoedelijke Groningse man op straat', accent: GRO_ACCENT },
    { speaker: 'Stadjer (vrouw)', voice: 'Despina', who: 'kletserige Groningse vrouw op straat', accent: GRO_ACCENT },
    { speaker: 'Stadjer (oud)', voice: 'Enceladus', who: 'oude Groningse man op straat, een beetje schor', accent: GRO_ACCENT },
  ],
  police: [
    { speaker: 'Agent', voice: 'Alnilam', who: 'Groningse politieagent, streng en kortaf' },
    { speaker: 'Agente', voice: 'Kore', who: 'Groningse politieagente, kordaat en zakelijk' },
  ],
  news: [
    { speaker: 'Kiekdoar-redactie', voice: 'Achernar', who: 'Groningse nieuwslezeres van nieuwssite Kiekdoar, leest een pushbericht voor' },
    { speaker: 'Kiekdoar-redactie (2)', voice: 'Umbriel', who: 'Groningse nieuwslezer van nieuwssite Kiekdoar, leest een pushbericht voor' },
  ],
  jingle: [
    { speaker: 'G-Music', voice: 'Zephyr', who: 'enthousiaste Groningse radio-dj, de jinglestem van zender G-Music' },
  ],
};

export const styleOf =(who, tag, accent = ACCENT) => `${accent}; ${who}.${tag ? ` Tone: ${tag}.` : ''}`;
