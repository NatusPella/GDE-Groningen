// Fietsers met een Bluetooth-speakertje (#401): af en toe draait een NPC-fietser een nummer uit de eigen bibliotheek
// (de G-Music-records van de radio). Je hoort het aankomen; bij het voorbijrijden zakt de toonhoogte (Doppler) en wordt
// het zachter. De keuze (wie, hoeveel, hoe dichtbij) en de Doppler-berekening staan hier, zonder DOM, zodat ze puur te
// testen zijn; audio.js bouwt de stemmen (panner, afstandsdemping, playbackRate) en stuurt ze met deze functies.

export const SPEAKER_CHANCE = 0.12;   // deel van de NPC-fietsers dat een speakertje bij zich heeft
export const SPEAKER_MAX = 2;         // hooguit zoveel tegelijk (prestaties en audiobudget)
export const SPEAKER_RANGE = 55;      // m: binnen deze afstand van de speler gaat een speakertje aan
export const SPEAKER_STOP = 70;       // m: verder dan dit gaat het uit (marge, zodat het niet aan en uit flipt op de rand)
export const SPEAKER_FADE = 14;       // m: de laatste meters voor SPEAKER_STOP wordt het zacht uitgefaded
export const SPEAKER_LEVEL = 0.6;     // volume van een speakertje op 1 m, ten opzichte van de radio (die meeschaalt met het muziekvolume)
export const SPEAKER_REF = 5;         // m: refDistance van de panner (afstandsdemping erbuiten)
export const SPEAKER_ROLLOFF = 1;
// Een spelgeluidssnelheid in plaats van 343 m/s: een fiets rijdt 4 tot 6 m/s, en met de echte geluidssnelheid is dat 1,5% en
// niet te horen. Met 90 is een fiets van 5 m/s goed voor ongeveer 5% (de toonhoogte zakt bij het voorbijrijden zo'n anderhalve halve toon).
export const SPEAKER_C = 90;
export const RATE_MIN = 0.8, RATE_MAX = 1.25;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// Afspeelsnelheid door het Doppler-effect. Eenheidsvector u van luisteraar naar bron; vs = snelheid van de bron langs u
// (positief = weg van de luisteraar), vl = snelheid van de luisteraar langs u (positief = naar de bron toe):
//   f'/f = (c + vl) / (c + vs)
export function dopplerRate(src, srcVel, lis, lisVel, c = SPEAKER_C) {
  const dx = src.x - lis.x, dy = src.y - lis.y, d = Math.hypot(dx, dy);
  if (!(d > 1e-6)) return 1; // op dezelfde plek: geen richting, geen verschuiving
  const ux = dx / d, uy = dy / d;
  const vs = clamp(srcVel.x * ux + srcVel.y * uy, -c * 0.6, c * 0.6);
  const vl = clamp(lisVel.x * ux + lisVel.y * uy, -c * 0.6, c * 0.6);
  return clamp((c + vl) / (c + vs), RATE_MIN, RATE_MAX);
}

// Halve tonen van een afspeelsnelheid (voor de test en de tekst)
export const rateSemitones = (r) => 12 * Math.log2(r);

// Volume door de afstand: de panner (inverse) demp het geluid zelf; dit is alleen het uitfaden aan de rand van het bereik.
export function edgeFade(d) {
  return clamp((SPEAKER_STOP - d) / SPEAKER_FADE, 0, 1);
}

// Het inverse-model van de panner (WebAudio: ref / (ref + rolloff * (d - ref))), om het zachter worden te kunnen toetsen
export function pannerGain(d, ref = SPEAKER_REF, rolloff = SPEAKER_ROLLOFF) {
  return ref / (ref + rolloff * (Math.max(d, ref) - ref));
}

// Eenmalig per fietser: heeft hij een speakertje? (v.btSpeaker blijft daarna vast, ook als hij uit beeld is en weer terugkomt)
export function assignSpeaker(v, rng = Math.random, chance = SPEAKER_CHANCE) {
  if (v.btSpeaker === undefined) v.btSpeaker = !!v.isBike && !v.isScooter && v.driver !== 'player' && rng() < chance;
  return v.btSpeaker;
}

// Kan dit speakertje nu spelen? Een rijdende NPC-fiets: niet van de speler, niet kapot, niet geparkeerd of in het water.
export function speakerEligible(v) {
  return !!v && !!v.btSpeaker && v.isBike && v.driver !== 'player' && !v.wrecked && !v.sinking && !v.parked && !v.isBoat && Math.abs(v.speed || 0) > 0.8;
}

// Welke fietsen spelen nu: wie al speelt blijft tot SPEAKER_STOP, nieuwe komen erbij binnen SPEAKER_RANGE, de dichtstbijzijnde
// eerst, hooguit `max`. `active` is de lijst van vorig beeld; `lis` de luisteraar {x, y}; `vehicles` alle voertuigen.
// Geeft de nieuwe lijst terug (zelfde volgorde voor wie bleef). Wijst zelf speakertjes toe (assignSpeaker) voor wie dichtbij is.
export function pickSpeakers(vehicles, lis, active = [], { max = SPEAKER_MAX, rng = Math.random } = {}) {
  const dist = (v) => Math.hypot(v.x - lis.x, v.y - lis.y);
  const present = new Set(vehicles); // een fiets die uit de wereld is (weggehaald, opgeruimd) speelt niet door
  const keep = active.filter((v) => present.has(v) && speakerEligible(v) && dist(v) <= SPEAKER_STOP).slice(0, max);
  if (keep.length >= max) return keep;
  const cand = [];
  for (const v of vehicles) {
    if (!v.isBike || keep.includes(v)) continue;
    const d = dist(v);
    if (d > SPEAKER_RANGE) continue;
    assignSpeaker(v, rng);
    if (speakerEligible(v)) cand.push([d, v]);
  }
  cand.sort((a, b) => a[0] - b[0]);
  for (const [, v] of cand) { if (keep.length >= max) break; keep.push(v); }
  return keep;
}

// Een nummer voor het speakertje: een echt record uit de bibliotheek, niet dat van de radio net nu, en per fietser een ander
// beginpunt in het nummer (de fietser zet het niet bij het begin aan). tracks: [{ id, duration }]; geeft { index, start } of null.
export function pickSpeakerTrack(tracks, rng = Math.random, avoidId = null, minS = 20) {
  const ok = tracks.map((t, i) => [t, i]).filter(([t]) => t && (!t.duration || t.duration >= minS));
  if (!ok.length) return null;
  const free = ok.filter(([t]) => t.id !== avoidId);
  const pool = free.length ? free : ok;
  const [t, index] = pool[Math.floor(rng() * pool.length) % pool.length];
  const start = Number.isFinite(t.duration) && t.duration > 40 ? rng() * (t.duration - 30) : 0;
  return { index, start };
}
