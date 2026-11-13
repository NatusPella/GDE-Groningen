// #840: het eigen geluid van een prestatie, als pure gegevens (geen audio-context, geen assets).
// audio.js speelt deze noten met de bestaande synth (playTone/playNoiseBurst) op de sting-bus, dus
// het valt onder de Effecten-volume-instelling en de mute-knop van het spel. Twee varianten: een
// gewone prestatie en een gouden (medaille/alle goud), met dezelfde toonfamilie.
export const PRESTATIE_GELUID = {
  normaal: {
    noten: [
      { freq: 523.25, delay: 0, duration: 0.32, gain: 0.055, type: 'triangle', filterFreq: 3200 },
      { freq: 659.25, delay: 0.07, duration: 0.34, gain: 0.05, type: 'triangle', filterFreq: 3400 },
      { freq: 783.99, delay: 0.14, duration: 0.4, gain: 0.045, type: 'sine', filterFreq: 3600 },
      { freq: 1046.5, delay: 0.23, duration: 0.52, gain: 0.038, type: 'sine', filterFreq: 4200 },
    ],
    ruis: { duration: 0.32, freq: 5200, freqEnd: 7600, q: 1.4, gain: 0.028, type: 'bandpass', delay: 0.2 },
  },
  goud: {
    noten: [
      { freq: 261.63, delay: 0, duration: 0.5, gain: 0.04, type: 'sine', filterFreq: 2400 },
      { freq: 523.25, delay: 0.02, duration: 0.44, gain: 0.055, type: 'triangle', filterFreq: 3200 },
      { freq: 659.25, delay: 0.1, duration: 0.46, gain: 0.05, type: 'triangle', filterFreq: 3400 },
      { freq: 783.99, delay: 0.18, duration: 0.5, gain: 0.045, type: 'sine', filterFreq: 3600 },
      { freq: 1046.5, delay: 0.27, duration: 0.62, gain: 0.04, type: 'sine', filterFreq: 4200 },
      { freq: 1567.98, delay: 0.34, duration: 0.7, gain: 0.022, type: 'sine', filterFreq: 5200 },
    ],
    ruis: { duration: 0.42, freq: 5600, freqEnd: 8600, q: 1.3, gain: 0.034, type: 'bandpass', delay: 0.26 },
  },
};

// De noten en de ruis voor deze variant; onbekend = normaal.
export const notenVoor = (goud = false) => (goud ? PRESTATIE_GELUID.goud : PRESTATIE_GELUID.normaal).noten;
export const ruisVoor = (goud = false) => (goud ? PRESTATIE_GELUID.goud : PRESTATIE_GELUID.normaal).ruis;

// Hoe lang het geluid duurt: het einde van de laatste noot (voor de test en de timing).
export function geluidDuur(goud = false) {
  const n = notenVoor(goud);
  return Math.max(...n.map((x) => (x.delay || 0) + (x.duration || 0)));
}

// Dezelfde notenfamilie in een andere stand: goud is langer en heeft één hoge boventoon extra.
export const GELUID_VARIANTEN = ['normaal', 'goud'];
