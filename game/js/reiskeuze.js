// The choice at a travel beat (#97): ride along, drive yourself or skip.
// Pure: a beat comes in ({ length, ride, vehicle, lines, ... }), the options with
// their ETA, the default, and what each option does on arrival go out. The panel
// (reispanel.js) draws it; the story runner applies `arrival`.
import { travelSeconds, needsBeat, classOf, CAP, MAX_DRIVE_S, piecesFor } from './reistijd.js';

export const CHOICES = ['meerijden', 'zelf', 'overslaan'];

// how you ride along, per kind: label shown on the button, the mode for the real ETA
export const RIDES = {
  trein: { label: 'Met de trein', mode: 'trein' },
  bus: { label: 'Met de bus', mode: 'bus' },
  boot: { label: 'Per boot', mode: 'boot' },
  heli: { label: 'Per helikopter', mode: 'lucht' },
  lift: { label: 'Meerijden', mode: 'auto' },
};

const mins = (s) => Math.max(1, Math.round(s / 60));
const label = (s) => `± ${mins(s)} min`;

// De keuze in gewone woorden (#445): een korte zin per keuze, voor het keuzevenster en de kaart.
export const UITLEG = {
  meerijden: 'Je zit er zo: een korte rit, de tijd loopt gewoon door.',
  zelf: 'Je rijdt of loopt zelf en verdient er wat bij.',
  overslaan: 'Direct aankomen; wat onderweg gezegd wordt, lees je als ondertitel.',
};

// Options for a beat. beat: { length (m), ride?: key of RIDES, selfMode?: 'auto'|'trekker'|..,
// lines?: string[] }. Skipping needs `lines` (the core of the trip talk) so that
// no story point is lost; without them the option is left out.
export function travelOptions(beat) {
  const length = beat.length || 0;
  const klasse = classOf(length);
  const ride = RIDES[beat.ride] || RIDES.lift;
  const selfMode = beat.selfMode || 'auto';
  const realRide = travelSeconds(length, ride.mode);
  const realSelf = travelSeconds(length, selfMode);
  const opts = [];
  // played time is cut to the ceiling; the clock still runs for the real time
  opts.push({
    id: 'meerijden', label: `Snel reizen · ${ride.label.toLowerCase()}`, ride: ride.label, uitleg: UITLEG.meerijden, kosten: 'gratis', etaS: realRide, playS: Math.min(realRide, CAP.meerijden), clockS: realRide,
    eta: label(realRide), reward: false,
  });
  // driving yourself longer than the ceiling is split by cuts into pieces
  opts.push({
    id: 'zelf', label: 'Zelf gaan', uitleg: UITLEG.zelf, kosten: `gratis, je verdient € ${selfReward(length)}`, etaS: realSelf, playS: realSelf, clockS: realSelf, eta: label(realSelf),
    pieces: piecesFor(realSelf), reward: true,
  });
  if (beat.lines && beat.lines.length) {
    opts.push({ id: 'overslaan', label: 'Overslaan', uitleg: UITLEG.overslaan, kosten: 'gratis', etaS: 0, playS: CAP.overslaan, clockS: realRide, eta: 'direct', reward: false, lines: beat.lines.slice(0, 4) });
  }
  return { klasse: klasse.id, required: klasse.beat, options: opts, def: defaultChoice(length, opts) };
}

// Default: ride along on a jump; on a shorter hop just drive.
export function defaultChoice(length, opts) {
  if (!needsBeat(length)) return 'zelf';
  return opts.some((o) => o.id === 'meerijden') ? 'meerijden' : 'zelf';
}

// Small reward for driving yourself; never a punishment for the others.
export const SELF_REWARD = { perKm: 4, max: 120 };
export function selfReward(length) {
  return Math.min(SELF_REWARD.max, Math.round((length / 1000) * SELF_REWARD.perKm));
}

// What happens on arrival, the same for every choice (nothing story is skipped):
// the clock runs the real time, vehicle and companion stand at the goal, timers
// of the next mission start only now.
export function arrival(beat, choice) {
  const o = travelOptions(beat).options.find((x) => x.id === choice);
  if (!o) return null;
  return {
    clockMinutes: Math.round(o.clockS / 60),
    vehicle: beat.vehicle || null,
    companion: beat.companion || null,
    money: choice === 'zelf' ? selfReward(beat.length || 0) : 0,
    subtitles: choice === 'overslaan' ? o.lines : [],
    startTimersAfter: true,
  };
}

// Does driving yourself break a ceiling? (for the audit and the editor)
export function selfDriveOver(beat) {
  return travelSeconds(beat.length || 0, beat.selfMode || 'auto') > MAX_DRIVE_S;
}
