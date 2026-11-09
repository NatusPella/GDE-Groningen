// #807: de verkenlaag van de provincie, op de bestaande infrastructuur. Pure data en regels:
// per streek één uitkijkpunt (uit MENU_PLEKKEN, anders het eerste kerk-/molen-/borgpunt uit
// landmarkkits.json) en een albumteller over de herkenningspunten per streek. Geen nieuwe
// merken, namen of munten; de coördinaten zijn de bestaande wereldpunten.
import { MENU_PLEKKEN } from './menuplekken.js';
import { STREKEN } from './regioleven.js';
import { wgsToWorld } from './rdnew.js';

// Eén uitkijkpunt per streek: eerst de vaste menupiek (mooi camerastandpunt), anders het eerste
// kerk-, molen- of borgpunt in die streek. Zo heeft ook Lauwerskust/Hunsingo een punt zonder
// nieuwe data.
const SOORT_ORDE = ['castle', 'mill', 'church', 'tower', 'museum'];
export function uitkijkpunten(landmarks = [], plekken = MENU_PLEKKEN, streken = STREKEN) {
  const uit = [];
  for (const streek of streken) {
    const plek = plekken.find((p) => p.streek === streek.id);
    if (plek) { uit.push({ streek: streek.id, naam: plek.id.replace(/-/g, ' '), x: plek.x, y: plek.y, bron: 'menuplek' }); continue; }
    const kandidaten = landmarks
      .filter((k) => k && Number.isFinite(k.x) && Number.isFinite(k.y) && SOORT_ORDE.includes(k.k))
      .filter((k) => Math.hypot(k.x - wgsToWorld(streek.at[0], streek.at[1])[0], k.y - wgsToWorld(streek.at[0], streek.at[1])[1]) <= streek.reach)
      .sort((a, b) => SOORT_ORDE.indexOf(a.k) - SOORT_ORDE.indexOf(b.k));
    const k = kandidaten[0];
    if (k) uit.push({ streek: streek.id, naam: k.n || k.k, x: k.x, y: k.y, bron: 'landmark' });
  }
  return uit;
}

// Het album: hoeveel herkenningspunten per streek, en hoeveel daarvan kerk, molen of borg zijn.
export function albumStand(landmarks = [], streken = STREKEN, streekAtFn = null) {
  const per = new Map(streken.map((s) => [s.id, { totaal: 0, kerk: 0, molen: 0, borg: 0 }]));
  for (const k of landmarks) {
    if (!k || !Number.isFinite(k.x) || !Number.isFinite(k.y)) continue;
    let id = null;
    if (streekAtFn) { const s = streekAtFn(k.x, k.y); id = s && s.id; }
    // buiten de reach van een streek valt een punt toch bij de dichtstbijzijnde streek: het album telt
    // de hele provincie, niet alleen de cirkels rond de centra.
    if (!id) {
      let best = null, bd = Infinity;
      for (const s of streken) { const [cx, cy] = wgsToWorld(s.at[0], s.at[1]); const d = Math.hypot(cx - k.x, cy - k.y); if (d < bd) { bd = d; best = s; } }
      id = best && best.id;
    }
    if (!id) continue;
    const rij = per.get(id);
    if (!rij) continue;
    rij.totaal++;
    if (k.k === 'church') rij.kerk++;
    else if (k.k === 'mill') rij.molen++;
    else if (k.k === 'castle') rij.borg++;
  }
  return streken.map((s) => ({ streek: s.id, ...per.get(s.id) }));
}

