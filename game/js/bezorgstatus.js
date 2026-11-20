// De HUD-stand van de maaltijdbezorger (#985): puur, geen DOM en geen THREE (scripts/bezorghud_test.mjs). Maakt uit de stand van een bestelling het model voor de
// gedeelde strook (simhud.js): de stappen (ophalen, bezorgen, klaar), de warmte van het eten als meter, de afstand tot het doel, de tijd en één zin wat nu.
// De regels (warmte, fooi, wind) staan in sidejob_bezorger.js; dit bestand leest ze alleen.

// Icoonpaden voor de chips (24x24, lijn): zaak (dak), fiets met doos, vinkje, vlam (warm).
export const ICOON = {
  zaak: '<path d="M4 10l2-5h12l2 5"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
  fiets: '<circle cx="6" cy="16" r="3.2"/><circle cx="18" cy="16" r="3.2"/><path d="M6 16l4-7h5l3 7"/><rect x="9" y="4" width="5" height="4" rx="1"/>',
  klaar: '<path d="M5 12l4 4 10-10"/>',
  warm: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 3-6 1 1 2 1 2-4z"/>',
};

export const STAPPEN = [
  { id: 'pickup', label: 'Ophalen', icoon: ICOON.zaak },
  { id: 'deliver', label: 'Bezorgen', icoon: ICOON.fiets },
  { id: 'klaar', label: 'Klaar', icoon: ICOON.klaar },
];

// De uitleg voor de eerste keer: vier iconen met een zin. Wordt getoond tot je voor het eerst iets ophaalt (dit apparaat).
export const UITLEG_ID = 'bezorger';
export const UITLEG = [
  { icoon: ICOON.zaak, tekst: 'Rij naar de zaak: ophalen gaat vanzelf' },
  { icoon: ICOON.fiets, tekst: 'Rij naar de klant, via de gele kolom' },
  { icoon: ICOON.warm, tekst: 'Het eten koelt af: warm geeft fooi' },
  { icoon: ICOON.klaar, tekst: 'Niet botsen: dan koelt het sneller af' },
];

export const KOUD = 40;   // % warmte: eronder is het eten bijna koud (fooi weg)
export const WARM = 70;   // % warmte: erboven is er fooi (zelfde grens als sidejob_bezorger.js)

// g: { fase: 'pickup'|'deliver', zaak, dish, n, straat, nr, wie, warmte (0..100), afstand (m), tijd (s), bestelling, regen, wind: { bft, along } | null, uitleg: bool }
export function bezorgHudModel(g) {
  if (!g || !g.fase) return null;
  const idx = Math.max(0, STAPPEN.findIndex((s) => s.id === g.fase));
  const stappen = STAPPEN.map((s, i) => ({ label: s.label, icoon: s.icoon, stand: i < idx ? 'klaar' : i === idx ? 'nu' : 'straks' }));
  const warmte = Math.max(0, Math.min(100, g.warmte == null ? 100 : g.warmte));
  const bezorgen = g.fase === 'deliver';
  const meter = bezorgen ? { pct: warmte, naam: 'Warmte van het eten', label: `${Math.round(warmte)}% warm`, staat: warmte < KOUD ? 'laag' : '' } : null;
  const wind = !g.wind ? 'geen' : g.wind.along < -0.5 ? `tegen ${g.wind.bft}` : g.wind.along > 0.5 ? 'mee' : 'zij';
  const cijfers = [{ label: 'Bestelling', waarde: String(g.bestelling || 1) }, { label: 'Afstand', waarde: g.afstand == null ? '-' : `${Math.round(g.afstand)} m` }];
  if (g.tijd != null) cijfers.push({ label: 'Tijd', waarde: `${Math.max(0, Math.ceil(g.tijd))} s` });
  cijfers.push({ label: 'Wind', waarde: wind });
  return {
    id: 'bezorger', titel: 'Bezorger', icoon: ICOON.fiets, plek: bezorgen ? `${g.straat || ''} ${g.nr || ''}`.trim() : (g.zaak || ''), stappen, meter, cijfers,
    uitleg: g.uitleg ? UITLEG : [], nu: watNu(g, warmte), hulp: 'Eten koelt af tijdens het rijden · botsen en regen maken het sneller koud', slecht: bezorgen && warmte < KOUD,
  };
}

export function watNu(g, warmte = g.warmte == null ? 100 : g.warmte) {
  if (g.fase === 'pickup') return `Haal ${g.n || 1}x ${g.dish || 'de bestelling'} op bij ${g.zaak || 'de zaak'}`;
  if (warmte < KOUD) return 'Snel, het eten wordt koud!';
  const regen = g.regen ? ' · regen: het koelt sneller af' : '';
  return `Bezorg bij ${g.straat || ''} ${g.nr || ''}${g.wie ? `: ${g.wie} wacht` : ''}${regen}`.replace('  ', ' ');
}

// Wat opspringt: bij het ophalen een korte tekst, bij het bezorgen of het eten warm was en wat de fooi is.
export function pickupPop() { return { tekst: 'Opgehaald', geluid: 'ui_loopbaan' }; }
export function afleverPop(warmte, tip) {
  const t = Math.round(tip || 0);
  return { tekst: `${warmte > WARM ? 'Warm bezorgd' : 'Bezorgd'}${t > 0 ? ` · fooi €${t}` : ''}`, geluid: warmte > WARM ? 'ui_verzameld' : 'ui_loopbaan' };
}
