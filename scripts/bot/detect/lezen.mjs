// Detector (e): lees- en timingregels. Pure functies op de 'tekst'-regels van een run:
//   { type: 'tekst', t, tot, zichtbaarS, bron: 'cutscene' | 'gesprek' | 'melding' | 'kaart', spreker, tekst, stap, x, y }
// (de page-kant, detect/page.js, logt een regel zodra een ondertitel of melding verdwijnt of wisselt; zichtbaarS in speltijd).
//   leestempo(tekst, s)            woorden per seconde
//   leesBevindingen(events)        te snel (> 3 woorden/s, feedback #975), herhaalde zinnen, kruisbestand-frasen, uitlegkaart die te lang blijft
export const LEES = {
  maxWoordenPerS: 3,        // daarboven is een regel te snel voor een gemiddelde lezer (feedback #975)
  onleesbaarWoordenPerS: 5, // daarboven leest niemand mee
  minWoorden: 4,            // korter dan dit is een uitroep; die mag snel
  kaartMaxS: 25,            // een uitlegkaart die langer blijft staan dan dit
  minZinWoorden: 3,         // een herhaalde zin moet minstens dit lang zijn om te tellen
};

// Frasen die de eigenaar als kruisbestand-valkuil kent: dezelfde zin in meerdere missies. Aanvullen kan via opties.
export const WATCH_FRASEN = ['laatste klus', 'wij tweeën tegen de rest', 'wij tweeen tegen de rest'];

export const woorden = (t) => String(t || '').toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, ' ').split(/\s+/).filter(Boolean);
export const leestempo = (tekst, s) => (s > 0 ? Math.round((woorden(tekst).length / s) * 100) / 100 : Infinity);
const normaal = (t) => woorden(t).join(' ');

// zinnen uit een regel; een zin eindigt op . ! ? of de regel zelf
const zinnen = (t) => String(t || '').split(/(?<=[.!?…])\s+/).map((z) => z.trim()).filter(Boolean);

const tekstEvents = (events) => events.filter((e) => e.type === 'tekst' && e.tekst);

export function leesBevindingen(events, { watch = WATCH_FRASEN, ...o } = {}) {
  const L = { ...LEES, ...o }, uit = [], ev = tekstEvents(events);
  // 1. te snel: ondertitels, gesprekken en meldingen (kaarten leest een speler op eigen tempo)
  for (const e of ev) {
    if (e.bron === 'kaart') continue;
    const n = woorden(e.tekst).length, s = Number.isFinite(e.zichtbaarS) ? e.zichtbaarS : (Number.isFinite(e.tot) ? e.tot - e.t : null);
    if (s == null || n < L.minWoorden) continue;
    const wps = leestempo(e.tekst, s);
    if (wps > L.maxWoordenPerS) {
      uit.push({
        type: wps > L.onleesbaarWoordenPerS ? 'lees-onleesbaar-snel' : 'lees-te-snel', soort: 'lezen', ernst: wps > L.onleesbaarWoordenPerS ? 'verwarrend' : 'cosmetisch',
        stap: e.stap || '', plek: Number.isFinite(e.x) ? [Math.round(e.x), Math.round(e.y)] : null, t: e.t, tekst: e.tekst,
        bewijs: { woorden: n, zichtbaarS: Math.round(s * 10) / 10, woordenPerS: wps, bron: e.bron, spreker: e.spreker || '', minimaalNodigS: Math.round((n / L.maxWoordenPerS) * 10) / 10 },
      });
    }
  }
  // 2. dezelfde zin vaker dan een keer: binnen een stap (herhaling) of over stappen heen (kruisbestand)
  const perZin = new Map();
  for (const e of ev) {
    if (e.bron === 'kaart' || e.bron === 'melding') continue;
    for (const z of zinnen(e.tekst)) {
      const k = normaal(z);
      if (woorden(z).length < L.minZinWoorden) continue;
      if (!perZin.has(k)) perZin.set(k, { zin: z, items: [] });
      perZin.get(k).items.push(e);
    }
  }
  for (const { zin, items } of perZin.values()) {
    const stappen = [...new Set(items.map((e) => e.stap || ''))];
    // dezelfde regel die in één gesprek na een mislukking opnieuw komt telt niet: tel alleen unieke (stap, spreker)-paren met tijdverschil > 20 s
    const echt = items.filter((e, i) => i === 0 || items.slice(0, i).every((q) => Math.abs((q.t ?? 0) - (e.t ?? 0)) > 20 || (q.stap || '') !== (e.stap || '')));
    if (stappen.length >= 2) {
      uit.push({ type: 'lees-herhaling-kruis', soort: 'lezen', ernst: 'cosmetisch', stap: stappen.join('+'), plek: null, t: items[0].t, tekst: zin, bewijs: { stappen, aantal: items.length } });
    } else if (echt.length >= 2 && items.every((e) => (e.spreker || '') === (items[0].spreker || ''))) {
      uit.push({ type: 'lees-herhaling', soort: 'lezen', ernst: 'cosmetisch', stap: stappen[0], plek: null, t: items[0].t, tekst: zin, bewijs: { aantal: echt.length, tijden: echt.map((e) => e.t) } });
    }
  }
  // 3. de bekende frasen over missies heen, ook als de zin er net anders omheen staat
  for (const f of watch) {
    const sleutel = normaal(f), wie = ev.filter((e) => e.bron !== 'melding' && normaal(e.tekst).includes(sleutel));
    const stappen = [...new Set(wie.map((e) => e.stap || ''))];
    if (stappen.length >= 2 && !uit.some((u) => u.type === 'lees-herhaling-kruis' && normaal(u.tekst).includes(sleutel))) {
      uit.push({ type: 'lees-herhaling-kruis', soort: 'lezen', ernst: 'cosmetisch', stap: stappen.join('+'), plek: null, t: wie[0].t, tekst: f, bewijs: { stappen, aantal: wie.length, frase: f } });
    }
  }
  // 4. uitlegkaart die te lang blijft: uit de 'tekst'-regels met bron 'kaart' of uit het kaartveld van de oogmomenten
  const kaarten = ev.filter((e) => e.bron === 'kaart').map((e) => ({ tekst: e.tekst, s: e.zichtbaarS, stap: e.stap, t: e.t }))
    .concat(events.filter((e) => e.type === 'oog' && e.kaart && e.kaart.tekst).map((e) => ({ tekst: e.kaart.tekst, s: e.kaart.zichtbaarS, stap: e.stap, t: e.t ?? e.tijd })));
  const gezien = new Set();
  for (const k of kaarten) {
    if (!(k.s > L.kaartMaxS) || gezien.has(k.stap + k.tekst)) continue;
    gezien.add(k.stap + k.tekst);
    uit.push({ type: 'lees-kaart-blijft', soort: 'lezen', ernst: 'cosmetisch', stap: k.stap || '', plek: null, t: k.t, tekst: k.tekst, bewijs: { zichtbaarS: k.s, max: L.kaartMaxS } });
  }
  return uit;
}
