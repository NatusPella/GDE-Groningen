// Omverrijden (#392): wat losse dingen opleveren als je ze met een voertuig omver rijdt. Pure regels, geen DOM en geen
// THREE (scripts/omverrules_test.mjs); stuntavond.js leest de punten, omverrijden.js betaalt het kleine geld in de stad.
// Mensen horen hier niet bij: wie een mens raakt verliest nooit punten, en omverrijden van dingen is satire zonder leed
// (constitution 6): alleen straatmeubilair, geen echt slachtoffer.

// Stuntavond: punten per soort prop (de kinds van breakables.js PROP_DEFAULTS). Wat er niet staat levert niets op
// (de flitspaal brengt de politie op de been, een boom en een vangrail zijn geen stuntspullen).
export const STUNT_PUNTEN = {
  parasol: { pts: 120, label: 'parasol' },
  stall: { pts: 150, label: 'kraam' },
  lamp: { pts: 150, label: 'lantaarn' },
  trafficlight: { pts: 150, label: 'stoplicht' },
  bench: { pts: 90, label: 'bankje' },
  table: { pts: 70, label: 'tafel' },
  bike: { pts: 60, label: 'fiets' },
  stoepbord: { pts: 60, label: 'bord' },
  rail: { pts: 50, label: 'hekje' },
  bin: { pts: 40, label: 'bak' },
  chair: { pts: 40, label: 'stoel' },
  hek: { pts: 30, label: 'hek' },
};

// In de stad, buiten een missie: een paar euro per ding, en nooit meer dan MAX_EURO per VENSTER_S seconden spelen
// (dan loont het om met opzet rond te rijden en dingen te slopen niet).
export const OMVER_EURO = { bin: 1, chair: 1, stoepbord: 1, bike: 2, table: 2, parasol: 2, bench: 3 };
export const VENSTER_S = 600;
export const MAX_EURO = 25;

export const stuntPunten = (kind) => STUNT_PUNTEN[kind] || null;

export const nieuweOmverStand = () => ({ lijst: [] });

// Wat dit ding nu oplevert: het bedrag, of 0 (onbekend soort, of het maximum van dit venster is bereikt). Boekt het ook.
export function omverEuro(stand, kind, now) {
  const e = OMVER_EURO[kind];
  if (!e || !Number.isFinite(now)) return 0;
  stand.lijst = stand.lijst.filter(([t]) => now - t < VENSTER_S && t <= now);
  const som = stand.lijst.reduce((s, [, v]) => s + v, 0);
  const bedrag = Math.min(e, MAX_EURO - som);
  if (bedrag <= 0) return 0;
  stand.lijst.push([now, bedrag]);
  return bedrag;
}
