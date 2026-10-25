// Samen spelen (#95): de partner in beeld. Pure logica voor het label (naam en
// status), de markering op kaart en minimap, pings en het roepen van een
// voertuig of erbij springen. Geen DOM; de HUD tekent wat hier uitkomt.
// Kleur is nooit het enige signaal: de marker heeft een vorm en een naam.

import { charInfo } from './coopplayers.js';

export const PARTNER = {
  host: { naam: 'Tessa', kleur: '#ff7ab8', vorm: 'ruit' },   // de host ziet de gast als Tessa
  gast: { naam: 'Tammo', kleur: '#4fb3ff', vorm: 'driehoek' }, // de gast ziet de host als Tammo
};
export const PING_COOLDOWN = 1.5;
export const PING_TTL = 8;
export const PING_MAX = 16;          // samen in beeld: genoeg voor een ping van elke speler (de codec kent tot 16 spelers)
export const PING_PER_AFZENDER = 2;  // een speler die snel achter elkaar roept houdt de lijst niet voor anderen bezet
export const CALL_RANGE = 40;      // m: erbij springen kan binnen deze afstand
export const WORLD_LIMIT = 2e6;    // m: grens voor ontvangen coördinaten (RD New)

const STATUS_TEXT = { voet: 'te voet', voertuig: 'in een voertuig', neer: 'neergeslagen', haperen: 'verbinding haperd', weg: 'verbinding weg', rijdt: 'aan het stuur' };

// role = onze rol ('host' | 'gast'); sample = laatste toestand van de ander (net/codec snapshot-speler);
// verbinding = 'ok' | 'lag' | 'lost'
export function partnerInfo(role, sample, verbinding = 'ok') {
  const p = PARTNER[role] || PARTNER.host;
  let status = 'voet';
  if (verbinding === 'lost') status = 'weg';
  else if (verbinding === 'lag') status = 'haperen';
  else if (sample && (sample.down || sample.alive === false)) status = 'neer'; // neergeslagen (een ragdoll) of dood/gepakt: alive alleen zegt niet alles (#369)
  else if (sample && sample.inVeh) status = sample.driver ? 'rijdt' : 'voertuig';
  return {
    naam: p.naam, kleur: p.kleur, vorm: p.vorm, status, tekst: STATUS_TEXT[status],
    x: sample ? sample.x : null, y: sample ? sample.y : null, heading: sample ? sample.angle || 0 : 0,
    zichtbaar: !!sample && Number.isFinite(sample.x) && Number.isFinite(sample.y),
  };
}

// Kaartpunt voor de marker. view: { cx, cy (midden van de kaart in wereldmeters), scale (px per m),
// rx, ry (halve breedte en hoogte in px), rot (kaartdraaiing in rad, 0 = noord boven) }.
// Valt de partner buiten beeld, dan blijft de marker op de rand met een pijl naar hem toe.
export function projectMarker(info, view) {
  if (!info.zichtbaar) return null;
  const dx = (info.x - view.cx) * view.scale, dy = -(info.y - view.cy) * view.scale; // wereld-y omhoog, scherm-y omlaag
  const c = Math.cos(view.rot || 0), s = Math.sin(view.rot || 0);
  let x = dx * c - dy * s, y = dx * s + dy * c;
  const kx = view.rx - 6, ky = view.ry - 6;
  const buiten = Math.abs(x) > kx || Math.abs(y) > ky;
  if (buiten) { const f = Math.min(kx / Math.abs(x || 1e-9), ky / Math.abs(y || 1e-9)); x *= f; y *= f; }
  return { x, y, buiten, pijl: buiten ? Math.atan2(y, x) : null, naam: info.naam, kleur: info.kleur, vorm: info.vorm };
}

// ----------------------------------------------------------- pings
export function createPings() { return { lijst: [], laatste: {} }; }

// van: 'eigen' | 'ander'. Geeft de nieuwe ping of null (te snel, ongeldig of te veel).
export function addPing(p, { x, y, van = 'eigen', soort = 'hier' }, nu) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > WORLD_LIMIT || Math.abs(y) > WORLD_LIMIT) return null;
  if (!['hier', 'gevaar', 'doel'].includes(soort)) soort = 'hier';
  const key = String(van === undefined || van === null ? 'eigen' : van); // 'eigen', 'ander' of de plek van een speler
  if (nu - (p.laatste[key] ?? -1e9) < PING_COOLDOWN) return null;
  p.laatste[key] = nu;
  const ping = { x, y, van: key, soort, tot: nu + PING_TTL };
  p.lijst.push(ping);
  const eigen = p.lijst.filter((x) => x.van === key);
  for (let i = 0; i < eigen.length - PING_PER_AFZENDER; i++) p.lijst.splice(p.lijst.indexOf(eigen[i]), 1);
  while (p.lijst.length > PING_MAX) p.lijst.shift();
  return ping;
}
export function tickPings(p, nu) { p.lijst = p.lijst.filter((x) => x.tot > nu); return p.lijst; }
// bericht voor de ander (reliable event); de ontvanger valideert met addPing
export const pingEvent = (x, y, soort = 'hier') => ({ k: 'ping', x, y, soort });

// ----------------------------------------------------------- voertuig roepen of erbij springen
// me, partner: { x, y, vehicle (id|null), seat }; vehicles: { [id]: { driver, passenger, x, y, stoelen } }
// eigen: id van een eigen voertuig dat bij de partner kan komen (garage), anders null.
export function voertuigActie(me, partner, vehicles, eigen = null) {
  if (partner && partner.vehicle != null) {
    const v = vehicles[partner.vehicle];
    const vrij = v && (v.stoelen == null || v.stoelen >= 2) && (v.driver == null || v.passenger == null);
    const afstand = v ? Math.hypot(v.x - me.x, v.y - me.y) : Infinity;
    if (vrij && afstand <= CALL_RANGE) return { actie: 'spring-erbij', id: partner.vehicle, stoel: v.passenger == null ? 'passenger' : 'driver' };
    if (vrij) return { actie: 'te-ver', id: partner.vehicle, afstand: Math.round(afstand), tekst: 'Te ver weg' };
    return { actie: 'vol', id: partner.vehicle, tekst: 'Voertuig vol' };
  }
  if (eigen) return { actie: 'roep', id: eigen, tekst: 'Voertuig komt' };
  return { actie: 'geen', tekst: 'Geen voertuig' };
}

// ----------------------------------------------------------- N spelers
// Alle andere spelers met naam, kleur en vorm uit de lijst met spelers (coopplayers.js).
// players = lichamen uit de snapshot; roster = [{ slot, char, verbinding }]; mySlot = onze plek.
export function partnersInfo(mySlot, players, roster, naam = (id) => charInfo(id)) {
  const out = [];
  for (const r of roster || []) {
    if (r.slot === mySlot) continue;
    const c = naam(r.char) || {};
    const av = r.avatar && typeof r.avatar === 'object' ? r.avatar : {}; // (#455) de online-avatar gaat voor de figuur
    const sample = (players || []).find((p) => p.slot === r.slot) || null;
    const st = partnerInfo('host', sample, r.verbinding || 'ok');
    out.push({ ...st, slot: r.slot, naam: av.naam || c.naam || st.naam, kleur: av.kleur || c.kleur || st.kleur, vorm: c.vorm || st.vorm });
  }
  return out;
}
export function projectMarkers(infos, view) { return infos.map((i) => ({ slot: i.slot, ...projectMarker(i, view) })).filter((m) => m.x !== undefined); }
