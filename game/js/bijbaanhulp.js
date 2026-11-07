// Samen spelen (#683): de hulpjes van een meespeler bij de vijf herhaalbare banen die nu een helper-rol hebben:
// cabaret (mede-optreder), loket (tweede balie), snackoverlast (handhaver), tjalke (bemanning) en bietenoogst
// (helper). Puur: alleen kleine beslissingen en bedragen, zodat de baan en de test dezelfde regel gebruiken.
// De baan bepaalt zelf of de hulp nu kan (fase, afstand); dit bestand bepaalt wat één hulp oplevert.

export const HULP_MAX = 3;

// Dezelfde timingregels als de hoofdspeler (casework.heckleTiming): een meespeler die op de maat terugroept,
// levert de helft van de punten van een eigen grapje. Eén keer per grap.
export function medeGrapje(cueAt, t, gedaan = false) {
  if (gedaan) return { ok: false, soort: 'gedaan', punten: 0 };
  if (!Number.isFinite(cueAt) || !Number.isFinite(t)) return { ok: false, soort: 'geen', punten: 0 };
  const d = t - cueAt;
  if (d < 0) return { ok: false, soort: 'te-vroeg', punten: 0 };
  if (d <= 0.4) return { ok: true, soort: 'perfect', punten: 15 };
  if (d <= 0.9) return { ok: true, soort: 'ok', punten: 8 };
  return { ok: false, soort: 'te-laat', punten: 0 };
}

// Eén hulpstap erbij (tweede balie, bemanning, oogst): nooit boven HULP_MAX.
export function hulpStap(help) {
  const n = Math.min(HULP_MAX, Math.max(0, (help | 0) + 1));
  return n > (help | 0) ? { ok: true, help: n } : { ok: false, help: n };
}

// De extra fooi per hulpje, bovenop de gewone rondebeloning. De gast krijgt die via de gedeelde beloning;
// de host ziet hem in zijn eigen loon terug omdat de basis met dezelfde tip omhoog gaat (sidejobs.js).
export const HULP_TIP = { kabaret: 0, balie: 10, handhaver: 15, bemanning: 10, oogst: 12 };

export function hulpTip(soort, help) {
  const n = Math.min(HULP_MAX, Math.max(0, help | 0));
  if (soort === 'handhaver') return n > 0 ? HULP_TIP.handhaver : 0;
  return n * (HULP_TIP[soort] || 0);
}
