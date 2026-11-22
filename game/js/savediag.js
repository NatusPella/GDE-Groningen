// Opslagregels voor het foutrapport (22-11): hoeveel plekken er bezet zijn en in welke staat, hoeveel ruimte de
// spelopslag inneemt en waarom opslaan eventueel mislukte. Zonder namen, plekken of andere persoonsgegevens: alleen
// tellingen en toestanden. Pure logica: de opslag wordt meegegeven, scripts/savediag_test.mjs draait hem.
import { MAX_SLOTS, slotKey, slotRecoveryKey } from './storagekeys.js';

const STAAT = { ok: 'goed', hersteld: 'hersteld uit kopie', kapot: 'kapot', nieuwer: 'van nieuwere versie', 'ander-verhaal': 'ander verhaal', leeg: 'leeg' };

// readSlot: de leesfunctie van saveslots.js (ls, n) -> { state }. Eén storing in één plek maakt het rapport niet stuk.
export function saveDiagLines(ls, readSlot, { failText = '' } = {}) {
  const lines = [];
  try {
    const per = {};
    let bezet = 0;
    for (let n = 1; n <= MAX_SLOTS; n++) {
      let heeft = false;
      try { heeft = ls.getItem(slotKey(n)) != null || ls.getItem(slotRecoveryKey(n)) != null; } catch (e) { heeft = false; }
      if (!heeft) continue;
      bezet++;
      let st = 'onleesbaar';
      try { st = (STAAT[readSlot(ls, n).state] || 'onbekend'); } catch (e) { /* telt als onleesbaar */ }
      per[st] = (per[st] || 0) + 1;
    }
    lines.push(`Opslag: ${bezet} van ${MAX_SLOTS} plekken bezet${bezet ? ' (' + Object.entries(per).map(([k, v]) => `${v} ${k}`).join(', ') + ')' : ''}`);
    let tekens = 0;
    try { for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k && k.startsWith('gde-')) tekens += k.length + String(ls.getItem(k) || '').length; } } catch (e) { tekens = -1; }
    if (tekens >= 0) lines.push(`Spelopslag: ongeveer ${Math.round((tekens * 2) / 1024)} kB van de ca. 5000 kB die een browser toestaat`);
  } catch (e) {
    lines.push('Opslag: niet te lezen');
  }
  if (failText) lines.push(`Laatste opslagfout: ${failText}`);
  return lines;
}
