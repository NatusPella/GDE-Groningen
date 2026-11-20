// De regels van de UI-geluidstaal (SFX-GAPS, groep a en b): welk geluid hoort bij welke melding, hoe vaak
// een geluid mag klinken en welke variant het wordt. Puur: geen DOM, geen audio. sfx/ui.js speelt wat deze
// regels teruggeven; scripts/sfx_uitaal_test.mjs draait ze op nagemaakte meldingen.
//
// Een melding is { text, kind, kicker } zoals world.addMessage ze bewaart (kind en kicker kunnen ontbreken).
// De bestaande reacties van ui.js (kassa bij + EUR, munitie, spuitbus, mislukte missie, gezondheid, pantser)
// gaan voor: deze regels krijgen alleen wat daar niet onder valt.

// minimale tijd (s) tussen twee keer hetzelfde geluid; de lange en betekenisvolle zijn ruimer dan de tikjes
export const UI_COOLDOWN = {
  ui_tab: 0.08, ui_weiger: 0.6, ui_toast: 1.2, ui_kaart_open: 0.4, ui_kaart_dicht: 0.4, ui_ontdek: 2.5,
  ui_uitkijk: 4, ui_verzameld: 0.5, ui_loopbaan: 4, ui_uitgave: 1.0, ui_gevaar: 3, winkel_kassa: 0.5,
  ui_speler_binnen: 1.5, ui_speler_weg: 1.5, ui_uitnodiging: 3,
};

// het geluid dat zachter moet zijn dan het niveau van de categorie (1 = gelijk); de lange, vrolijke zijn al vol
export const UI_NIVEAU = {
  ui_tab: 0.9, ui_weiger: 1, ui_toast: 0.8, ui_kaart_open: 0.9, ui_kaart_dicht: 0.8, ui_ontdek: 1, ui_uitkijk: 1,
  ui_verzameld: 0.9, ui_loopbaan: 1, ui_uitgave: 0.9, ui_gevaar: 0.9, winkel_kassa: 0.9,
  ui_speler_binnen: 0.8, ui_speler_weg: 0.8, ui_uitnodiging: 0.85,
};

// De meldingsgeluiden stapelen niet: een geluid met een lager of gelijk gewicht dan een ander meldingsgeluid dat
// minder dan MELDING_STIL seconden geleden begon, blijft weg. Een zwaarder geluid (een trap omhoog) speelt wel.
// Tab, kaart en uitgave horen er niet bij: dat zijn handelingen van de speler zelf, geen meldingen.
export const MELDING_STIL = 0.5;
export const MELDING_RANG = { ui_toast: 0, ui_verzameld: 1, ui_gevaar: 1, ui_weiger: 1, ui_ontdek: 2, ui_uitkijk: 3, ui_loopbaan: 3, ui_speler_binnen: 1, ui_speler_weg: 1, ui_uitnodiging: 1 };

const WEIGER = /^(Te weinig|Niet genoeg|Geen geld|Je hebt niet genoeg|Je kunt dit nog niet|Dat kan niet|Kan niet)/i;
// Samen spelen (coopnet.js, coopmeedoen.js): de teksten van een nieuwe speler, een vertrekkende speler en een uitnodiging
const SPELER_WEG = /(heeft het spel verlaten|is weggevallen|heeft het spel gestopt)\.?/i;
const UITNODIGING = /(is begonnen: je doet mee\.$|Het verhaal heeft jou nodig|^Meedoen met .+J = ja)/;
const SPELER_BINNEN = /^(?!Je )[^.]{1,40} doet mee\.$/;
const VERKEND = /^(Verkend|Streek verkend|Ommeland . verkennen|Nieuwe streek)/i;

// Welk geluid hoort bij deze melding, of null (geen eigen geluid)? kind: de categorie van het HUD-kaartje.
export function toastGeluid(m) {
  if (!m) return null;
  const text = String(m.text || '');
  const kind = m.kind || null;
  const kicker = String(m.kicker || '');
  if (WEIGER.test(text)) return 'ui_weiger';
  if (SPELER_WEG.test(text)) return 'ui_speler_weg';
  if (UITNODIGING.test(text)) return 'ui_uitnodiging';
  if (SPELER_BINNEN.test(text)) return 'ui_speler_binnen';
  if (kicker === 'Loopbaan' && kind === 'prestatie') return 'ui_loopbaan';
  if (kicker === 'Uitkijkpunt') return 'ui_uitkijk';
  if (VERKEND.test(kicker) || VERKEND.test(text)) return 'ui_ontdek';
  if (kicker === 'Visboek' && kind === 'prestatie') return 'ui_ontdek';
  if (/^Verzamelen/i.test(kicker)) return 'ui_verzameld';
  if (kind === 'politie' || kind === 'gevaar') return 'ui_gevaar';
  if (kind === 'tip' || kind === 'missie' || kind === 'reis') return 'ui_toast';
  return null;
}

// Mag dit geluid nu? last: Map of object met de laatste tijd per naam; legt de tijd vast als het mag.
export function magKlinken(last, naam, now) {
  const gap = UI_COOLDOWN[naam] ?? 0.3;
  const t = last instanceof Map ? last.get(naam) : last[naam];
  if (t !== undefined && now - t < gap) return false;
  if (last instanceof Map) last.set(naam, now); else last[naam] = now;
  return true;
}

// Wordt dit meldingsgeluid gesmoord door een ander dat net klonk? last: dezelfde Map als bij magKlinken.
export function wordtGesmoord(last, naam, now) {
  const rang = MELDING_RANG[naam];
  if (rang === undefined) return false;
  for (const [andere, r] of Object.entries(MELDING_RANG)) {
    if (andere === naam || r < rang) continue;
    const t = last instanceof Map ? last.get(andere) : last[andere];
    if (t !== undefined && now - t < MELDING_STIL) return true;
  }
  return false;
}

// Een variant kiezen uit de namen van een geluid (r: 0 tot 1); de vorige vermijden als er meer dan een is.
export function kiesVariant(namen, r, vorige = null) {
  if (!namen.length) return null;
  if (namen.length === 1) return namen[0];
  let i = Math.min(namen.length - 1, Math.floor(r * namen.length));
  if (namen[i] === vorige) i = (i + 1) % namen.length;
  return namen[i];
}

// Een kleine toonhoogtespreiding per aanroep, +-3 procent, uit r (0 tot 1)
export const toonSpreiding = (r) => 1 + (r * 2 - 1) * 0.03;
