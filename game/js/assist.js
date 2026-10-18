// Hulp (#215): een zachte opening voor wie vastloopt. Meer tijd, minder
// voertuigschade, ruimere vliegpoorten; na twee mislukkingen van dezelfde stap
// biedt het spel dit zichtbaar aan. Prestaties blijven open: een stap die met
// hulp is gehaald krijgt alleen het label "met hulp".
// Pure keuzes en getallen, geen DOM: de runner leest ze via getAssist().
// scripts/assist_test.mjs test dit.

export const HELP_TIME = { uit: 1, ruimer: 1.25, ruim: 1.5, 'heel ruim': 2 };
export const HELP_DAMAGE = { normaal: 1, minder: 0.6, 'veel minder': 0.3 };
export const HELP_GATES = { normaal: 1, ruimer: 1.35, ruim: 1.8 };
export const HELP_OFFER_AFTER = 2;

export const HELP_DEFAULTS = { helpTime: 'uit', helpDamage: 'normaal', helpGates: 'normaal', helpOffer: true };

// De voorinstellingen die het aanbod en de keuzelijst gebruiken.
export const HELP_PRESETS = {
  licht: { helpTime: 'ruimer', helpDamage: 'minder', helpGates: 'ruimer' },
  veel: { helpTime: 'ruim', helpDamage: 'veel minder', helpGates: 'ruim' },
  uit: { helpTime: 'uit', helpDamage: 'normaal', helpGates: 'normaal' },
};

const pick = (table, key) => (Object.prototype.hasOwnProperty.call(table, key) ? table[key] : 1);

// settings -> factoren (onbekende waarden tellen als geen hulp)
export function assistFactors(s = {}) {
  return { time: pick(HELP_TIME, s.helpTime), damage: pick(HELP_DAMAGE, s.helpDamage), gates: pick(HELP_GATES, s.helpGates) };
}

export function helpActive(s = {}) {
  const f = assistFactors(s);
  return f.time !== 1 || f.damage !== 1 || f.gates !== 1;
}

// Een geldige waarde voor een hulpinstelling, anders de standaard.
export function cleanHelpSetting(key, value) {
  const tables = { helpTime: HELP_TIME, helpDamage: HELP_DAMAGE, helpGates: HELP_GATES };
  return tables[key] && Object.prototype.hasOwnProperty.call(tables[key], value) ? value : HELP_DEFAULTS[key];
}

// Tijdslimiet of venster in seconden; null/Infinity/0 (geen limiet) blijven zoals ze zijn.
export function scaleTime(secs, s) {
  if (!Number.isFinite(secs) || !(secs > 0)) return secs;
  return Math.round(secs * assistFactors(s).time);
}

// Schade aan het voertuig van de speler (hoeveelheid vóór de schaal).
export function scaleDamage(dmg, s) {
  return dmg * assistFactors(s).damage;
}

// Een vliegpoort ruimer: de straal groeit; de hoogteband groeit omhoog en omlaag
// rond het midden, maar nooit onder de grond (lo >= 0 blijft lo >= 0).
export function widenGate(g, s) {
  const f = assistFactors(s).gates;
  if (f === 1) return g;
  const mid = (g.lo + g.hi) / 2, half = (g.hi - g.lo) / 2 * f;
  return { ...g, r: g.r * f, lo: Math.max(g.lo >= 0 ? 0 : -Infinity, mid - half), hi: mid + half };
}

// Moet het aanbod nu komen? fails: mislukkingen van deze stap; offered: is het
// aanbod voor deze stap al gedaan; ook als de speler al hulp heeft komt het niet.
export function shouldOffer({ fails = 0, offered = false, settings = {} } = {}) {
  if (settings.helpOffer === false) return false;
  return fails >= HELP_OFFER_AFTER && !offered && !helpActive(settings);
}

// Wat het aanbod zegt: een korte tekst en wat "Ja" aanzet.
export function offerText(preset = 'licht') {
  const p = HELP_PRESETS[preset] || HELP_PRESETS.licht;
  const bits = [];
  if (p.helpTime !== 'uit') bits.push(`${Math.round((HELP_TIME[p.helpTime] - 1) * 100)}% meer tijd`);
  if (p.helpDamage !== 'normaal') bits.push('minder schade aan je voertuig');
  if (p.helpGates !== 'normaal') bits.push('ruimere vliegpoorten');
  return `Dit lukt nog niet. Wil je hulp? ${bits.join(', ')}. Je prestaties blijven open; de stap krijgt het label "met hulp". Je kunt het altijd uitzetten onder Toegankelijk › Hulp.`;
}

// "Met hulp"-boekhouding per stap-id: {stepId: true}
export function markHelped(map, id, settings) {
  const out = { ...(map || {}) };
  if (id && helpActive(settings)) out[id] = true;
  return out;
}
export function cleanHelped(raw) {
  const out = {};
  if (raw && typeof raw === 'object') for (const [k, v] of Object.entries(raw)) if (v === true && typeof k === 'string' && k.length < 80) out[k] = true;
  return out;
}
