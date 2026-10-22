// Safehouses (#414, fase 2): in elke veroverbare wijk en plaats staat een verzonnen woning (adres en makelaar in gebieden.js).
// Je koopt hem, goedkoper naarmate je meer in dat gebied deed, of krijgt hem als het gebied helemaal gedaan is. Bij de deur (E):
// slapen en opslaan, de kledingkast van het spel, je voertuigen laten brengen, onderduiken (de politie zoekt je hier niet) en de
// inrichting die meegroeit met je voortgang. Een snelreisanker is de knop "Reis erheen" in Loopbaan › Veroverd. Binnen kom je niet:
// het is een huisje met een deur, geen eigen verdieping. Het is een activiteit van activities.js (prompt, E, kaart en minimap).
// Per speler: wat je bezit staat in je eigen profiel (gebiedenlive.js); in Samen spelen ziet iedereen dezelfde huisjes op dezelfde
// plek en heeft zijn eigen sleutel. Niet door een mens in beeld bekeken.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import * as G from './gebieden.js';
import { getIndeling, getProfiel, koopHuisLive, heeftHuisLive } from './gebiedenlive.js';
import { getOwnedEntries, spawnOwnedEntry, wardrobeMenu } from './shops.js';
import { openShopMenu, closeShopMenu, isShopOpen } from './shopui.js';
import { respawnFade } from './respawn.js';
import { refreshDayNight } from './daynight.js';
import { clearDrunk } from './drunk.js';
import { recordStat } from './achievements.js';
import { saveGame } from './savehook.js';
import { getScene } from './scene3d.js';
import { addStaticCollider, removeProp } from './breakables.js';
import { iconDisc } from './activitykit.js';
import { playerBusy } from './busy.js';

const DEUR_AFSTAND = 3.2;   // m van het midden van het huisje tot de plek bij de deur
const GEBRUIK_R = 2.2;
const STREAM_IN = 200;
const STREAM_UIT = 260;
const SNAP_R = 60;
const HX = 2.25, HZ = 2.75; // halve diepte (naar voren) en halve breedte van het huisje
const MUREN = ['#d9c7a3', '#c9a98a', '#b9c7b0', '#d8b8b0', '#c4cdd6', '#e0d2a0'];
const WAKKER = [
  ['ochtend', 'Tot de ochtend', 'Wakker om half acht, fris en uitgerust', 7.5, 'Goeiemorgen, Grunn! Uitgeslapen en opgeslagen'],
  ['middag', 'Tot de middag', 'Uitslapen tot één uur, net als studenten', 13, 'Middag! Uitgeslapen als een student'],
  ['avond', 'Tot de avond', 'Wakker om half tien, klaar voor het nachtwerk', 21.5, 'Uitgeslapen tot de avond. Tijd voor actie'],
  ['nacht', 'Tot diep in de nacht', 'Om één uur, als heel Grunn slaapt', 1, 'Eén uur \'s nachts. Heel Grunn slaapt, behalve jij'],
];

let wereld = null;
let huizen = [];        // [{ ...huis uit gebieden.js, x, y, ang, geplaatst, mesh, props }]
let sig = '';
let bezig = false;      // een fade loopt
let groep = null;

const hashHoek = (id) => { let h = 2166136261; for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return (h % 3600) / 3600 * Math.PI * 2; };
const policeWatching = (w) => w.wanted > 0 && !!(w.police && w.police.seenRecently);

// De plek van de woningen: even naast het hart van het gebied, op open begaanbare grond; hoe dichter bij, hoe zekerder (de tegels).
function ververs(w) {
  const ind = getIndeling();
  if (!ind) return;
  const lijst = G.huizenLijst(ind);
  const s = lijst.map((h) => h.id).join('|');
  if (s === sig) return;
  sig = s;
  for (const h of huizen) opruimen(h);
  huizen = lijst.map((h) => {
    const ang = hashHoek(h.id);
    return { ...h, ang, x: h.x + Math.cos(ang) * 22, y: h.y + Math.sin(ang) * 22, geplaatst: false, mesh: null, props: null };
  });
}
function plaats(h, w) {
  if (h.geplaatst || !w.map || !w.map.findOpenSpawn) return;
  h.geplaatst = true;
  const sp = w.map.findOpenSpawn(h.x, h.y, SNAP_R);
  if (sp) { h.x = sp.x; h.y = sp.y; }
  // het huisje kijkt naar de dichtstbijzijnde weg, anders zoals het viel
  const rd = w.map.nearestRoadPoint ? w.map.nearestRoadPoint(h.x, h.y, 80, false, true) : null;
  if (rd) h.ang = Math.atan2(rd.y - h.y, rd.x - h.x);
}
const deur = (h) => ({ x: h.x + Math.cos(h.ang) * DEUR_AFSTAND, y: h.y + Math.sin(h.ang) * DEUR_AFSTAND });

// --- het huisje in 3D ------------------------------------------------------------------------------------------------

function bouw(h, w) {
  const scene = getScene && getScene();
  if (!scene || h.mesh) return;
  if (!groep) { groep = new THREE.Group(); groep.name = 'safehuizen'; scene.add(groep); }
  const ind = getIndeling();
  const v = G.voortgang(getProfiel(), ind, h.gebied);
  const inr = G.inrichting(v.deel, v.voltooid);
  const eigen = heeftHuisLive(h.id);
  const gz = w.map.groundHeightAt ? w.map.groundHeightAt(h.x, h.y, 0) || 0 : 0;
  const g = new THREE.Group();
  const kleur = MUREN[Math.floor(hashHoek(h.id) / (Math.PI * 2) * MUREN.length) % MUREN.length];
  const mat = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, ...extra });
  const box = (bx, by, bz, c, px, py, pz, extra) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bx, by, bz), mat(c, extra)); m.position.set(px, py, pz); g.add(m); return m; };
  box(HX * 2, 3, HZ * 2, kleur, 0, 1.5, 0);
  const dak = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(HX, HZ) + 0.5, 1.7, 4), mat('#7a4332'));
  dak.rotation.y = Math.PI / 4; dak.scale.set(HX / HZ * 1.0 + 0.0, 1, 1); dak.position.y = 3.85;
  g.add(dak);
  box(0.12, 2.1, 1.1, eigen ? '#2f6f4f' : '#8a3b2e', HX + 0.04, 1.05, 0);                    // de deur
  box(0.1, 0.9, 0.9, '#f2e6a8', HX + 0.04, 1.9, -1.8, { emissive: new THREE.Color('#665a20') }); // twee raampjes
  box(0.1, 0.9, 0.9, '#f2e6a8', HX + 0.04, 1.9, 1.8, { emissive: new THREE.Color('#665a20') });
  if (inr.niveau >= 1) box(0.9, 0.5, 0.5, '#8a6a3a', HX + 0.6, 0.25, -1.2);                  // een bankje
  if (inr.niveau >= 2) box(0.6, 0.6, 0.6, '#4f8f4a', HX + 0.5, 0.3, 1.3);                    // een plantenbak
  if (eigen) {                                                                               // de vlag, in de kleur van de laag
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 6), mat('#e9e2d0'));
    pole.position.set(HX - 0.3, 4.6, HZ - 0.3); g.add(pole);
    const nv = G.niveauInfo(h.niveau);
    const vl = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.75), new THREE.MeshLambertMaterial({ color: nv.vlag, side: THREE.DoubleSide }));
    vl.position.set(HX - 0.3, 5.7, HZ - 0.3 - 0.62); vl.rotation.y = Math.PI / 2; g.add(vl);
  }
  g.position.set(h.x, gz, h.y);
  g.rotation.y = -h.ang;
  groep.add(g);
  h.mesh = g;
  // de muren houden je buiten (het huisje heeft geen binnenkant)
  const fx = Math.cos(h.ang), fy = Math.sin(h.ang), rx = -fy, ry = fx;
  h.props = [
    addStaticCollider('garagewall', h.x + fx * HX, h.y + fy * HX, 0.2, HZ, h.ang + Math.PI / 2),
    addStaticCollider('garagewall', h.x - fx * HX, h.y - fy * HX, 0.2, HZ, h.ang + Math.PI / 2),
    addStaticCollider('garagewall', h.x + rx * HZ, h.y + ry * HZ, 0.2, HX, h.ang),
    addStaticCollider('garagewall', h.x - rx * HZ, h.y - ry * HZ, 0.2, HX, h.ang),
  ];
  h.gebouwdMet = `${inr.niveau}|${eigen}`;
}
function opruimen(h) {
  if (h.mesh) {
    h.mesh.removeFromParent();
    h.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    h.mesh = null;
  }
  if (h.props) { for (const p of h.props) { try { removeProp(p); } catch (e) { /* al weg */ } } h.props = null; }
}

// --- de menu's -------------------------------------------------------------------------------------------------------

function laatBrengen(w, h) {
  const d = deur(h);
  const lijst = getOwnedEntries().filter((o) => !(o.v && o.v.driver === 'player'));
  return lijst.slice(0, 24).map((o, i) => ({
    id: 'veh-' + i, label: o.spec.name || o.spec.model || 'Voertuig', desc: o.lost ? 'Kwijt of gesloopt: hier staat hij weer voor de deur' : 'Wordt voor de deur gezet',
    verb: 'Laten brengen', price: 0, keepFocus: true,
    preview: { kind: o.spec.kind, model: o.spec.model, color: o.color, nameIdx: o.spec.nameIdx, flags: o.spec.flags || null },
    buy() {
      const ang = h.ang;
      const v = spawnOwnedEntry(w, o, d.x + Math.cos(ang) * 4.5 + Math.cos(ang + Math.PI / 2) * 3, d.y + Math.sin(ang) * 4.5 + Math.sin(ang + Math.PI / 2) * 3, ang + Math.PI / 2);
      return v ? `${o.spec.name || 'Voertuig'} staat voor de deur` : 'Er is geen plek voor de deur';
    },
  }));
}

function slaap(w, h, uur, bericht) {
  if (bezig) return false;
  bezig = true;
  closeShopMenu();
  respawnFade(1, 320);
  setTimeout(() => {
    try {
      w.clock = uur;
      refreshDayNight(w);
      w.health = 100;
      clearDrunk(w);
      recordStat(w, 'slept');
      saveGame(w, { toast: true });
      w.addMessage(bericht, 4, { kind: 'tip' });
    } catch (e) { console.error('safehuis', e); }
    setTimeout(() => { respawnFade(0, 420); bezig = false; }, 120);
  }, 900);
  return true;
}

function duikOnder(w, h, uren) {
  if (bezig) return false;
  bezig = true;
  closeShopMenu();
  respawnFade(1, 320);
  setTimeout(() => {
    try {
      w.clock = (((w.clock + uren) % 24) + 24) % 24;
      refreshDayNight(w);
      w.wanted = 0;
      w.wantedDecayTimer = 0;
      w.addMessage(`${uren} uur onderduiken: de politie is je kwijt`, 5, { kind: 'tip' });
    } catch (e) { console.error('safehuis', e); }
    setTimeout(() => { respawnFade(0, 420); bezig = false; }, 120);
  }, 900);
  return true;
}

function menu(w, h) {
  const ind = getIndeling();
  const p = getProfiel();
  const v = G.voortgang(p, ind, h.gebied);
  const inr = G.inrichting(v.deel, v.voltooid);
  const stappen = {
    title: 'De inrichting', note: `Groeit mee met wat je in ${ind.gebied.get(h.gebied).naam} doet: ${v.klaar} van ${v.totaal}`,
    items: inr.stappen.map((s, i) => ({ id: 'inr-' + i, label: s.naam, desc: s.klaar ? 'Staat er' : 'Komt als je verder komt in dit gebied', verb: 'Bekijken', price: 0, disabled: s.klaar ? 'Staat er' : 'Komt nog', preview: { kind: 'product', product: 'bed' }, buy: () => 'Gezellig' })),
  };
  const tag = `${h.adres} · ${h.makelaar}`;
  if (!heeftHuisLive(h.id)) {
    const prijs = G.huisPrijs(p, ind, h.id);
    return {
      name: h.naam, type: 'eikea', color: '#b8741c', tagline: `Te koop: ${tag}`,
      sections: () => [
        { title: 'Te koop', note: `Gratis als je ${ind.gebied.get(h.gebied).naam} helemaal veroverd hebt. Hoe meer je al deed, hoe lager de prijs`, items: [{
          id: 'koop', label: `Koop ${h.naam}`, desc: `${tag}. Slapen en opslaan, garage, kledingkast en onderduiken`, verb: 'Kopen', price: prijs, preview: { kind: 'product', product: 'bed' },
          buy() {
            const r = koopHuisLive(w, h.id);
            if (!r.ok) return r.reden === 'geld' ? null : 'Dit huisje is al van jou';
            closeShopMenu({ save: true });
            w.addMessage(`Gefeliciteerd met ${h.naam}! De sleutel ligt op de mat`, 5, { kind: 'tip' });
            return 'Sleutel in de hand';
          },
        }] },
        stappen,
      ],
    };
  }
  return {
    name: h.naam, type: 'eikea', color: G.niveauInfo(h.niveau).vlag, tagline: tag,
    sections: () => [
      { title: 'Slapen en opslaan', note: 'Slapen slaat het spel op en geeft volle gezondheid', items: WAKKER.map(([id, label, desc, uur, msg]) => ({
        id: 'wake-' + id, label, desc, verb: 'Slapen', price: 0, keepFocus: true, preview: { kind: 'product', product: 'bed' }, buy() { slaap(w, h, uur, msg); return 'Welterusten'; } })) },
      { title: 'Onderduiken', note: 'De politie zoekt je hier niet. Hoe beter ingericht, hoe korter het duurt', items: [{
        id: 'onderduik', label: `Onderduiken (${G.ONDERDUIK_UREN[inr.niveau]} uur)`, desc: w.wanted > 0 ? 'Gezocht niveau naar nul, de klok loopt door' : 'Alleen als de politie je zoekt', verb: 'Onderduiken', price: 0, plain: true, disabled: w.wanted > 0 ? '' : 'Niet gezocht',
        preview: { kind: 'product', product: 'bed' }, buy() { duikOnder(w, h, G.ONDERDUIK_UREN[inr.niveau]); return 'Even stil zitten'; } }] },
      { title: 'Kledingkast', note: 'Alles wat je ooit kocht, in de kast bij de deur', items: [{
        id: 'kast', label: 'Kleren aantrekken', desc: 'Zelfde kast als thuis', verb: 'Openen', price: 0, plain: true, preview: { kind: 'product', product: 'bed' },
        buy() { setTimeout(() => openShopMenu(w, wardrobeMenu(w)), 0); return 'Kast open'; } }] },
      { title: 'Garage', note: 'Je voertuigen komen hier voor de deur te staan', items: laatBrengen(w, h) },
      { title: 'Snelreisanker', note: 'Vanuit Loopbaan › Veroverd kom je hier meteen terecht', items: [{ id: 'anker', label: 'Snelreisanker', desc: 'Pauzemenu › Loopbaan › Veroverd › Reis erheen', verb: 'Bekijken', price: 0, disabled: 'Via Loopbaan', preview: { kind: 'product', product: 'bed' }, buy: () => 'Jouw huisje staat op de kaart' }] },
      stappen,
    ].filter((s) => s.items.length),
  };
}

// --- de activiteit (activities.js) -----------------------------------------------------------------------------------

function dichtbij(w) {
  const p = w.player;
  let best = null, bd = GEBRUIK_R;
  for (const h of huizen) {
    const d = deur(h);
    const afst = Math.hypot(p.x - d.x, p.y - d.y);
    if (afst < bd) { bd = afst; best = h; }
  }
  return best;
}
const kanNiet = (w) => {
  const p = w.player;
  if (!wereld || bezig || isShopOpen() || w.pigeonMode || w.heliRun || p.inVehicle || p.swimming) return 'x';
  return playerBusy(w, ['mission', 'activeRace']).busy ? 'Niet nu: maak eerst je missie af' : '';
};

export const SAFEHUIS = {
  id: 'safehuis',
  layer: 'safehuis',
  legend: { kind: 'act-safehuis', label: 'Safehouse', note: 'een huisje om te kopen of te krijgen in elk gebied dat je kunt veroveren' },
  init(w) { wereld = w; window.__safehuis = { lijst: () => huizen.map((h) => ({ id: h.id, naam: h.naam, adres: h.adres, x: h.x, y: h.y, ang: h.ang, deur: deur(h), gebied: h.gebied, geplaatst: h.geplaatst, mesh: !!h.mesh, eigen: heeftHuisLive(h.id) })), menu: (id) => { const h = huizen.find((q) => q.id === id); return h ? openShopMenu(w, menu(w, h)) : null; } }; },
  spots: () => huizen.map((h) => ({ id: h.id, name: h.naam, ...deur(h), mode: 'walk' })),
  prompt(w) {
    const h = kanNiet(w) === 'x' ? null : dichtbij(w);
    if (!h) return null;
    const eigen = heeftHuisLive(h.id), d = deur(h);
    if (policeWatching(w)) return { id: h.id, x: d.x, y: d.y, h: 2.4, key: 'E', label: 'Safehouse', sub: 'Deur op slot: politie op je hielen', ring: true, dim: true };
    const prijs = eigen ? 0 : G.huisPrijs(getProfiel(), getIndeling(), h.id);
    return { id: h.id, x: d.x, y: d.y, h: 2.4, key: 'E', label: eigen ? h.naam : `${h.naam} bekijken`, sub: eigen ? `${h.adres}: slapen, kleren, garage, onderduiken` : `${h.adres} · €${prijs.toLocaleString('nl-NL')}`, ring: true };
  },
  secondary(w) {
    const p = w.player;
    const lijst = [];
    const hier = dichtbij(w);
    for (const h of huizen) {
      if (Math.hypot(p.x - h.x, p.y - h.y) > 70 || h === hier) continue;
      lijst.push({ id: h.id + '-2', x: h.x, y: h.y, h: 4.6, label: h.naam, sub: heeftHuisLive(h.id) ? h.adres : `Te koop · ${h.adres}`, kind: 'place' });
    }
    return lijst;
  },
  interact(w) {
    const k = kanNiet(w);
    if (k === 'x') return false;
    const h = dichtbij(w);
    if (!h) return false;
    if (k) { w.addMessage(k, 3); return true; }
    if (policeWatching(w)) { w.addMessage('Deur op slot: eerst de politie kwijt', 3); return true; }
    openShopMenu(w, menu(w, h));
    return true;
  },
  active: () => false,
  quit() {},
  update() {},
  tick(dt, w) {
    wereld = w;
    ververs(w);
    const p = w.player;
    for (const h of huizen) {
      const d = Math.hypot(p.x - h.x, p.y - h.y);
      if (d < STREAM_IN) {
        if (!h.geplaatst) plaats(h, w);
        const eigen = heeftHuisLive(h.id);
        if (h.mesh && h.gebouwdMet !== undefined && !h.gebouwdMet.endsWith(String(eigen))) opruimen(h); // net gekocht: de vlag erbij
        if (!h.mesh) bouw(h, w);
      } else if (d > STREAM_UIT && h.mesh) opruimen(h);
    }
  },
  camera() {},
  icon(ctx, s) {
    iconDisc(ctx, s, '#b8741c');
    ctx.save();
    ctx.scale(s, s);
    ctx.fillStyle = '#f2ede0';
    ctx.beginPath(); ctx.moveTo(-3.2, 0.2); ctx.lineTo(0, -3); ctx.lineTo(3.2, 0.2); ctx.lineTo(2.4, 0.2); ctx.lineTo(2.4, 3); ctx.lineTo(-2.4, 3); ctx.lineTo(-2.4, 0.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b8741c'; ctx.fillRect(-0.7, 0.9, 1.4, 2.1);
    ctx.restore();
  },
  mapSub(spot) {
    const h = huizen.find((q) => q.id === spot.id);
    if (!h) return 'Safehouse';
    return heeftHuisLive(h.id) ? `Jouw safehouse · ${h.adres}` : `Te koop · ${h.adres} · gratis als je het gebied veroverd hebt`;
  },
};

export const safehuisLijst = () => huizen;
export const huisVanGebied = (gebiedId) => huizen.find((h) => h.gebied === gebiedId) || null;

// Het snelreisanker: naar de deur van je eigen safehouse, met de bewakers van de kaartteleport (geen missie, geen politie, niet op het water).
export function reisNaarHuis(huisIdent) {
  const h = huizen.find((q) => q.id === huisIdent);
  if (!h || !wereld || !heeftHuisLive(huisIdent)) return false;
  const d = deur(h);
  return !!(wereld.cheatActions && wereld.cheatActions.teleport(d.x, d.y, h.naam));
}
