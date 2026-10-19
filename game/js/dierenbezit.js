// De dieren die je houdt (#193): kopen, verzorgen, trainen en uitrusten, als pure regels op het
// dierenregister. Opslag onder de eigen sleutel gde-dieren-v1 (storagekeys.js), los van de save.
// De dierenhoek van de winkel (shops.js) roept dit aan; verder weet de rest van het spel er niets van.
import { dierById, HOUDEN } from './dierenregister.js';

export const STORE_VERSION = 1;
// hoeveel je er per plek kunt houden
export const PLEK_MAX = { erf: 6, huis: 2, vijver: 8, duiventil: 6 };
export const MAX_NAAM = 20;

export const leegBezit = () => ({ versie: STORE_VERSION, dieren: [] });

const schoon = (b) => {
  if (!b || b.versie !== STORE_VERSION || !Array.isArray(b.dieren)) return leegBezit();
  const dieren = [];
  for (const x of b.dieren.slice(0, 40)) {
    const d = x && dierById(x.id);
    if (!d || !d.kopen) continue;
    const ok = new Set(d.upgrades.map((u) => u.id));
    dieren.push({ uid: String(x.uid || '').slice(0, 20) || 'd' + dieren.length, id: d.id, naam: String(x.naam || d.naam).slice(0, MAX_NAAM), plek: HOUDEN.includes(x.plek) ? x.plek : d.kopen.houden, upgrades: (x.upgrades || []).filter((u) => ok.has(u)), verzorgd: Math.max(0, Math.min(100, +x.verzorgd || 0)) });
  }
  return { versie: STORE_VERSION, dieren };
};

export function loadBezit(store, key) {
  try { const raw = store && store.getItem(key); return raw ? schoon(JSON.parse(raw)) : leegBezit(); } catch { return leegBezit(); }
}
export function saveBezit(store, key, b) {
  try { if (store) store.setItem(key, JSON.stringify(schoon(b))); return true; } catch { return false; }
}

export const aantalOp = (b, plek) => b.dieren.filter((x) => x.plek === plek).length;

// Kan dit dier gekocht worden? Geeft null of de reden waarom niet.
export function koopBlokkade(b, id, geld) {
  const d = dierById(id);
  if (!d) return 'Onbekend dier';
  if (!d.kopen) return d.reden || 'Niet te koop';
  if (aantalOp(b, d.kopen.houden) >= PLEK_MAX[d.kopen.houden]) return 'Daar is geen plek meer voor';
  if (geld < d.kopen.prijs) return 'Te weinig geld';
  return null;
}

// Koop: geeft { bezit, prijs, dier } of { fout }. Geen bijwerking op het origineel.
export function koop(b, id, geld, naam = null) {
  const fout = koopBlokkade(b, id, geld);
  if (fout) return { fout };
  const d = dierById(id);
  const n = b.dieren.filter((x) => x.id === id).length + 1;
  const dier = { uid: id + n + 'x' + b.dieren.length, id, naam: (naam || (n > 1 ? `${d.naam} ${n}` : d.naam)).slice(0, MAX_NAAM), plek: d.kopen.houden, upgrades: [], verzorgd: 0 };
  return { bezit: { versie: STORE_VERSION, dieren: [...b.dieren, dier] }, prijs: d.kopen.prijs, dier };
}

// Een verbetering (verzorgen, trainen, accessoire) kopen voor een dier uit het bezit.
export function upgradeBlokkade(b, uid, upgradeId, geld) {
  const x = b.dieren.find((e) => e.uid === uid);
  if (!x) return 'Onbekend dier';
  const u = dierById(x.id).upgrades.find((e) => e.id === upgradeId);
  if (!u) return 'Onbekende verbetering';
  if (upgradeId !== 'verzorgen' && upgradeId !== 'voer' && x.upgrades.includes(upgradeId)) return 'Zit er al op';
  if (geld < u.prijs) return 'Te weinig geld';
  return null;
}
export function upgrade(b, uid, upgradeId, geld) {
  const fout = upgradeBlokkade(b, uid, upgradeId, geld);
  if (fout) return { fout };
  const u = dierById(b.dieren.find((e) => e.uid === uid).id).upgrades.find((e) => e.id === upgradeId);
  const dieren = b.dieren.map((x) => {
    if (x.uid !== uid) return x;
    // verzorgen en voer zijn herhaalbaar: ze vullen de verzorging aan; de rest is eenmalig
    if (upgradeId === 'verzorgen' || upgradeId === 'voer') return { ...x, verzorgd: Math.min(100, x.verzorgd + 25) };
    return { ...x, upgrades: [...x.upgrades, upgradeId] };
  });
  return { bezit: { versie: STORE_VERSION, dieren }, prijs: u.prijs, upgrade: u };
}

// Het dier raakt een beetje uit de verzorging per speeldag.
export const verval = (b, dagen = 1) => ({ versie: STORE_VERSION, dieren: b.dieren.map((x) => ({ ...x, verzorgd: Math.max(0, x.verzorgd - 10 * dagen) })) });
export const stemming = (x) => (x.verzorgd >= 60 ? 'tevreden' : x.verzorgd >= 25 ? 'gaat wel' : 'verwaarloosd');
