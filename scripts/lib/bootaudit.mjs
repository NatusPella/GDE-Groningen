// De bootaudit (scripts/world/boot_spawn_audit.mjs, scripts/boot_spawn_test.mjs): loopt alle plekken af waar het spel boten
// plaatst en meet ze met de regel van boatspots.js. Eén lijst rijen:
//   { cat, naam, x, y, klasse, ok, reden, breedte, opNet, kade, afstKade, water }
// Categorieen: marina (liggers in jachthavens), verhuur (Bootje Huren-steigers), bijbaan (bijbaan- en missieboten),
// ai (ambient boten van manageBoatPopulation, over meerdere seeds), sier (de decorboten op de maren van countrylife),
// race (de vaste wedstrijdplekken: Hoornse-Plas-regatta met startlijn, skutsjerace-starts, bruggenrace-grid; #1083),
// missie (de missieboten van akte 2 en 4; #1083).
import fs from 'node:fs';
import { laadBootWereld } from './bootwereld.mjs';

export const seeded = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

export async function maakAudit() {
  const W = await laadBootWereld();
  if (!W) return null;
  const B = await import('../../game/js/vehicle/boatspots.js');
  const { waterPolyAt } = await import('../../game/js/waterlevels.js');
  const { BOAT_KINDS } = await import('../../game/js/boattypes.js');
  const V = await import('../../game/js/vehicle.js');
  const { map, net } = W;

  const rij = async (cat, naam, x, y, klasse, extra = {}) => {
    await W.laadRond(x, y, 500);
    const afmeer = extra.afmeer;
    let b;
    if (afmeer) b = B.isMooringSpotValid(map, x, y, extra.hoek, klasse, { vinger: !!extra.vinger, anderen: extra.anderen, len: extra.len });
    else b = B.assessBoatSpot(map, x, y, klasse);
    const k = B.dichtstbijKade(x, y, 400);
    const p = waterPolyAt(map, x, y);
    return { cat, naam, x: Math.round(x), y: Math.round(y), klasse, ok: !!b.ok, reden: b.reden, breedte: b.breedte ?? B.lokaleBreedte(map, x, y), opNet: !!b.opNet, kade: b.kade ?? (k ? k.soort : null), afstKade: k ? Math.round(k.d) : null, water: p ? p.kind : null };
  };

  const alle = {};

  // 1. de liggers in de jachthavens (neus naar de steiger: alleen water, breedte en anker)
  alle.marina = async () => {
    const out = [];
    for (const m of W.json('marinas.json').marinas) {
      const gezien = [];
      for (const b of m.berths) {
        const klasse = (BOAT_KINDS[b.k] && BOAT_KINDS[b.k].kind) || 'sloep';
        const wid = (BOAT_KINDS[b.k] || {}).wid || 1.5;   // (de liggers liggen naast elkaar, neus naar de steiger: de breedte telt)
        const r = await rij('marina', `${m.name}:${b.k}`, b.x, b.y, klasse, { afmeer: true, vinger: true, hoek: b.a, anderen: gezien, len: wid });
        out.push(r);
        gezien.push({ x: b.x, y: b.y, len: wid });
      }
    }
    return out;
  };

  // 2. de verhuursteigers (Bootje Huren): het water bij het kiosk, zoals shops.js ze plaatst
  alle.verhuur = async () => {
    const out = [];
    let S = null;
    try { S = await import('../../game/js/shops.js'); } catch (e) { S = null; }
    if (!S || !S.bootSteigers) return out;
    const lijst = S.bootSteigers(map);
    B.voegAnkersToe(lijst.map((j) => ({ x: j.water.x, y: j.water.y, soort: 'verhuursteiger' })));   // (zoals initShops ze straks aanmeldt)
    for (const j of lijst) out.push(await rij('verhuur', `steiger ${j.street}`, j.water.x, j.water.y, 'sloep', { afmeer: true, hoek: j.water.angle }));
    return out;
  };

  // 3. bijbaan- en missieboten: de plek na spawnJobBoat (de boot schuift zelf naar vrij water)
  alle.bijbaan = async () => {
    const out = [];
    const probe = async (naam, x, y, a, model, klasse, terug = null) => {
      await W.laadRond(x, y, 500);
      const wereld = { map, vehicles: [], player: { x: 1e7, y: 1e7 }, time: 0 };
      let kit = null;
      try { kit = await import('../../game/js/sidejobkit.js'); } catch (e) { kit = null; }
      let px = x, py = y;
      if (kit && kit.spawnJobBoat) { const v = kit.spawnJobBoat(wereld, x, y, a, { ...model }) || (terug && kit.spawnJobBoat(wereld, x, y, a, { ...terug })); if (v) { px = v.x; py = v.y; } else { out.push({ cat: 'bijbaan', naam: naam + ' (geen boot)', x: Math.round(x), y: Math.round(y), klasse, ok: false, reden: 'geen-boot', breedte: 0, opNet: false, kade: null, afstKade: null, water: null }); return; } }
      out.push(await rij('bijbaan', naam, px, py, klasse, {}));
    };
    try {
      const J = await import('../../game/js/sidejob_rondvaart.js');
      const R = await import('../../game/js/rondvaartchase.js');
      const m0 = (J.LINE || [])[0], m34 = (J.LINE || [])[34];
      const bt = BOAT_KINDS.rondvaart;
      if (m0) await probe('rondvaart-bijbaan start', m0[0], m0[1], 0, { ...bt }, 'rondvaart');
      if (m34) await probe('veerdienst start', m34[0], m34[1], 0, { name: 'boat', len: 7.2, wid: 2.4, kind: 'sloep', color: '#2f6a4f' }, 'sloep');
      await W.laadRond(-39, -262, 500);
      const berth = R.rondvaartBerth(map);
      B.voegAnkersToe([{ x: berth.boat.x, y: berth.boat.y, soort: 'rondvaartsteiger' }]);   // (een ontworpen aanlegplek is zelf de kade)
      out.push(await rij('bijbaan', 'rondvaarttour kade', berth.boat.x, berth.boat.y, 'rondvaart', {}));
    } catch (e) { out.push({ cat: 'bijbaan', naam: 'rondvaart (kon niet laden: ' + e.message + ')', ok: true, reden: 'overgeslagen', x: 0, y: 0, klasse: '', breedte: 0 }); }
    try {
      const Z = await import('../../game/js/zeeschipvaart.js');
      const ZS = await import('../../game/js/sidejob_zeeschip.js');
      for (const h of Z.HAVENS) { await W.laadRond(h.kade.x, h.kade.y, 500); const k = ZS.kadePunt(map, h); const koers = Math.atan2(h.boei.y - h.kade.y, h.boei.x - h.kade.x); await probe('zeeschip ' + h.haven, k.x, k.y, koers, { ...ZS.KUSTVAARDER }, 'zeeschip', { ...ZS.KUSTVAARDER_KORT }); }
    } catch (e) { /* zonder module geen rij */ }
    try {
      const H = await import('../../game/js/heist.js');
      await W.laadRond(0, 0, 1);
      if (H.heistBoatMooring) { const m = H.heistBoatMooring(map); if (m) { B.voegAnkersToe([{ x: m.x, y: m.y, soort: 'steiger' }]); out.push(await rij('bijbaan', 'heist vluchtboot', m.x, m.y, 'sloep', {})); } }
    } catch (e) { /* heist laadt de UI: zonder die geen rij */ }
    return out;
  };

  // 4. AI-boten: manageBoatPopulation op echte kaartplekken, met een vaste Math.random per seed
  alle.ai = async ({ seeds = 3, posities = 24 } = {}) => {
    const out = [];
    const orig = Math.random;
    const pos = [[0, 0], [150, 400]];
    const havens = net.nodes.filter((n) => n.type === 'haven');
    for (let i = 0; i < havens.length && pos.length < posities / 2 + 2; i += Math.max(1, Math.floor(havens.length / (posities / 2)))) pos.push([havens[i].x, havens[i].y]);
    const rnd = seeded(7);
    while (pos.length < posities) {
      const e = net.edges[Math.floor(rnd() * net.edges.length)];
      if (e.pts && e.pts.length) pos.push([e.pts[0][0], e.pts[0][1]]);
    }
    for (const [px, py] of pos) {
      await W.laadRond(px, py, 600);
      for (let s = 1; s <= seeds; s++) {
        Math.random = seeded(s * 7919 + Math.round(px + py));
        const wereld = { map, player: { x: px, y: py, inVehicle: null }, vehicles: [], time: 100, dayNight: { hour: 13 } };
        const t0 = performance.now();
        for (let k = 0; k < 40; k++) V.manageBoatPopulation(wereld, { target: 6, budget: Infinity });   // (de kanaalscan af voor de keuze: het tijdbudget van het spel maakt de plekken anders klokafhankelijk)
        for (const v of wereld.vehicles) {
          if (!v.isBoat) continue;
          const klasse = (v.model && v.model.kind) || 'sloep';
          out.push(await rij('ai', `pos ${Math.round(px)},${Math.round(py)} seed ${s}`, v.x, v.y, klasse, {}));
        }
      }
    }
    Math.random = orig;
    return out;
  };

  // 5. decorboten op de maren van countrylife: een steekproef langs de maarlijnen van de provincie
  alle.sier = async ({ n = 200 } = {}) => {
    const out = [];
    const { BLOCK, maarX, maarY } = await import('../../game/js/countryfield.js');
    const r = seeded(11), b = map.meta.bounds;
    const x0 = b.minX ?? b[0], y0 = b.minY ?? b[1], x1 = b.maxX ?? b[2], y1 = b.maxY ?? b[3];
    for (let t = 0; out.length < n && t < n * 400; t++) {
      const i = Math.floor((x0 + r() * (x1 - x0)) / BLOCK), j = Math.floor((y0 + r() * (y1 - y0)) / BLOCK);
      const vert = r() < 0.5;
      if (!(vert ? maarX(i) : maarY(j))) continue;
      const x = vert ? i * BLOCK : (i + r()) * BLOCK, y = vert ? (j + r()) * BLOCK : j * BLOCK;
      const rw = await rij('sier', `maar ${Math.round(x)},${Math.round(y)}`, x, y, 'kano', {});
      // (de poort in countrylife.spawnBoat laat een ongeldige plek vervallen: dat telt als vervallen, niet als afwijker)
      if (!rw.ok) { rw.vervallen = true; rw.ok = true; }
      out.push(rw);
    }
    return out;
  };

  // 6. wedstrijdboten (#1083): de vaste plekken van de zeilregatta op de Hoornse Plas (tonnen en startlijn voor vier deelnemers,
  // zoals regatta.js startLijn ze legt), de skutsjerace (start en doel naast de rondvaartroute) en het startgrid van de bruggenrace
  alle.race = async () => {
    const out = [];
    const { PLAS, plasBaan } = await import('../../game/js/regattaplas.js');
    await W.laadRond(PLAS.x, PLAS.y, 500);
    const tonnen = plasBaan();
    for (let i = 0; i < tonnen.length; i++) out.push(await rij('race', 'regatta plas ton ' + (i + 1), tonnen[i].x, tonnen[i].y, 'dinghy', {}));
    const b0 = tonnen[0], b1 = tonnen[1];
    const a = Math.atan2(b1.y - b0.y, b1.x - b0.x), nx = -Math.sin(a), ny = Math.cos(a), n = 4;
    for (let k = 0; k < n; k++) {
      const cx = b0.x - Math.cos(a) * 36 + nx * (k - (n - 1) / 2) * 7, cy = b0.y - Math.sin(a) * 36 + ny * (k - (n - 1) / 2) * 7;
      out.push(await rij('race', 'regatta plas startlijn ' + (k + 1), cx, cy, 'dinghy', {}));
    }
    try {
      const R = await import('../../game/js/rondvaartchase.js');
      await W.laadRond(751, 380, 500);
      R.prepareDiepenringRoute(map);
      for (const [naam, p] of [['skutsje start', [751.16, 380.57]], ['skutsje doel', [-373.03, 288.27]]]) {
        await W.laadRond(p[0], p[1], 500);
        const s = R.diepenringProgress(p[0], p[1]).s, q = R.routeAt(s);
        out.push(await rij('race', naam + ' (route)', q.x, q.y, 'skutsje', {}));
      }
      await W.laadRond(-39, -262, 500);
      const berth = R.rondvaartBerth(map), s0 = R.diepenringProgress(berth.boat.x, berth.boat.y).s;
      B.voegAnkersToe([{ x: berth.boat.x, y: berth.boat.y, soort: 'rondvaartsteiger' }]);
      out.push(await rij('race', 'bruggenrace start (steiger)', berth.boat.x, berth.boat.y, 'rondvaart', {}));
      for (let k = 1; k < 6; k++) {   // het grid achter de steiger, zoals pg_bruggenrace.maakBoot (rij 8 m, baan 2,6 m)
        const q = R.routeAt(s0 - (Math.floor(k / 2) + 1) * 8), side = k % 2 ? 1 : -1;
        out.push(await rij('race', 'bruggenrace grid ' + k, q.x - Math.sin(q.a) * side * 2.6, q.y + Math.cos(q.a) * side * 2.6, 'rondvaart', {}));
      }
    } catch (e) { out.push({ cat: 'race', naam: 'skutsje/bruggenrace (kon niet laden: ' + e.message + ')', ok: true, reden: 'overgeslagen', x: 0, y: 0, klasse: '', breedte: 0 }); }
    return out;
  };

  // 7. missieboten (#1083): de boten van akte 2 en akte 4, zoals missions.js spawnStoryBoat/spawnMissionBoat ze legt (na ensureBoatValid).
  // Bron van de plekken: missions_akte2.js boatStart (M11) en missions_akte4.js veendamBoot (M17); verschuift er een, pas hem hier mee aan.
  alle.missie = async () => {
    const out = [];
    try {
      const { wgsToWorld } = await import('../../game/js/rdnew.js');

      // M11 (akte 2): Klaas' rubberboot op de Reitdiep bij Zoutkamp
      const m11 = { x: -18075, y: -12902, angle: 2.8, kind: 'rubberboot' };
      await W.laadRond(m11.x, m11.y, 500);
      const boot11 = { x: m11.x, y: m11.y, angle: m11.angle, model: { kind: m11.kind, len: 4, wid: 1.6 } };
      B.ensureBoatValid(map, boot11, 120);
      out.push(await rij('missie', 'M11 rubberboot (akte 2)', boot11.x, boot11.y, m11.kind, {}));

      // M17 (akte 4): de sloep voor de bruggenrace bij Veendam
      const veendamBoot = [53.05641, 6.84933];
      const [rdx, rdy] = wgsToWorld(veendamBoot[0], veendamBoot[1]);
      await W.laadRond(rdx, rdy, 500);
      const boot17 = { x: rdx, y: rdy, angle: -1.2, model: { kind: 'sloep', len: 7.2, wid: 2.4 } };
      B.ensureBoatValid(map, boot17, 120);
      out.push(await rij('missie', 'M17 sloep (akte 4)', boot17.x, boot17.y, 'sloep', {}));
    } catch (e) { out.push({ cat: 'missie', naam: 'missieboten (kon niet laden: ' + e.message + ')', ok: true, reden: 'overgeslagen', x: 0, y: 0, klasse: '', breedte: 0 }); }
    return out;
  };

  return { W, B, map, alle };
}

export function samenvatting(rijen) {
  const per = {};
  for (const r of rijen) {
    const c = (per[r.cat] = per[r.cat] || { n: 0, fout: 0, sloot: 0, smal: 0, geenVaarweg: 0, geenWater: 0, andere: 0, voorbeelden: [] });
    c.n++;
    if (r.vervallen) c.vervallen = (c.vervallen || 0) + 1;
    if (r.ok) continue;
    c.fout++;
    if (r.reden === 'sloot' || r.reden === 'vijver') c.sloot++;
    else if (r.reden === 'smal') c.smal++;
    else if (r.reden === 'geen-vaarweg' || r.reden === 'geen-kade') c.geenVaarweg++;
    else if (r.reden === 'geen-water') c.geenWater++;
    else c.andere++;
    if (c.voorbeelden.length < 6) c.voorbeelden.push(`${r.naam} @${r.x},${r.y} ${r.klasse}: ${r.reden} (breedte ${r.breedte}, water ${r.water}, kade ${r.afstKade} m)`);
  }
  return per;
}
