// Interieurs ronde 7 (22-11, #1150, #1162, #1165): meer betreedbare panden zonder de prestaties of de geloofwaardigheid te schaden.
// Dekt: de typeafleiding voor panden zonder OSM-type (vorm en maat, alleen het pand zelf), de bijgebouwen (schuur, garagebox, stal, kas) en het portiek van
// een appartementencomplex, de gemaakte deur bij een gevel zonder deur, determinisme (zelfde pand = zelfde soort en indeling), loopbaarheid en
// deur-bereikbaarheid op 500 panden per nieuw recept, en het prestatiebudget (driehoeken en bouwtijd per nieuw recept).
// Geen game/world, geen Electron. Draai: node scripts/interieur_r7_test.mjs
import './node3d.mjs';
import { kindOfBuilding, fallbackKinds, hallMinOf, SUB_HALL, NOT_ENTERABLE, NOT_ENTERABLE_WHY, ringArea, bijgebouwSub, untypedKind, BEDRIJFSHAL_MIN_AREA, APPARTEMENT_MIN_AREA } from '../game/js/interiorkinds.js';
import { planInterior, interiorSeed } from '../game/js/interiorrules.js';
import { validateLayout, walkGrid, reachable, reachableAt, rectOf } from '../game/js/interiorlayout.js';
import { building } from './interior_fixtures.mjs';
import { mulberry32 } from '../game/js/rng.js';
import { crowdAt, crowdCurves } from '../game/js/interiorcrowd.js';
import { scriptOf, SCRIPTS } from '../game/js/interioractivity.js';
import { CLOTHING_ROLE } from '../game/js/interiornpc.js';
const B3 = await import('../game/js/interiorbuild3d.js');

let bad = 0, n = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.error('FAIL', m + (info ? ' (' + info + ')' : '')); } };

// een rechthoekig pand met de deur midden in de zuidgevel (y = 0), zoals een gevelbouwer het geeft; type en hoogte vrij
function rect(type, w, d, over = {}) {
  const c = Math.min(w - 1.2, Math.max(1.2, w * 0.5));
  const en = { ax: 0, ay: 0, tx: 1, ty: 0, nx: 0, ny: -1, len: w, c, w: 1.0, h: 2.1, shop: false, floorH: 2.9, floors: 1, depth: 3, look: null, archetype: 'house', doorColor: 0x6b2a24, frameColor: 0x2a2b2d, windows: [] };
  return { pts: [[0, 0], [w, 0], [w, d], [0, d], [0, 0]], bounds: [0, 0, w, d], type, h: 1, hm: 3, entrance: en, sd: [w * 7.3 + d * 3.1, d * 1.7 + w], ...over };
}

// --- de typeafleiding: alleen het pand zelf ---
{
  const k = (type, w, d, over) => kindOfBuilding(rect(type, w, d, over));
  ok(k('yes', 5, 8).kind === 'woning' && k('yes', 5, 8).sub === null, 'een gewoon pand zonder type blijft een woning');
  ok(k('yes', 5, 7, { h: 5 }).kind === 'kantoor', 'een hoog pand zonder type blijft een kantoor');
  const big = k('yes', 30, 30, { hm: 6 });
  ok(big.kind === 'garage' && big.sub === 'magazijn' && ringArea(rect('yes', 30, 30).pts) >= BEDRIJFSHAL_MIN_AREA, 'een groot laag pand zonder type is een bedrijfshal');
  ok(k('yes', 30, 30, { hm: 20 }).kind === 'woning', 'een groot hoog pand zonder type is geen bedrijfshal');
  ok(k('apartments', 16, 16).sub === 'appartement' && ringArea(rect('apartments', 16, 16).pts) >= APPARTEMENT_MIN_AREA, 'een groot appartementencomplex krijgt een portiek');
  ok(k('apartments', 8, 8).sub === null, 'een klein appartementenblok is een gewone woning');
  ok(bijgebouwSub(rect('yes', 2.6, 8)) === 'box' && bijgebouwSub(rect('yes', 3.5, 4)) === 'schuur' && bijgebouwSub(rect('yes', 2, 2)) === 'schuur', 'lang en smal is een garagebox, de rest een schuur');
  for (const [t, sub] of [['shed', 'schuur'], ['outbuilding', 'schuur'], ['hut', 'schuur'], ['barn', 'stal'], ['stable', 'stal'], ['cowshed', 'stal'], ['farm_auxiliary', 'stal'], ['greenhouse', 'kas']]) ok(k(t, 6, 8).kind === 'garage' && k(t, 6, 8).sub === sub, t + ' is een ' + sub);
  for (const t of NOT_ENTERABLE) { ok(kindOfBuilding({ pts: [], type: t }) === null, t + ' blijft dicht'); ok(!!NOT_ENTERABLE_WHY[t], t + ' heeft een reden');  }
  ok(fallbackKinds(rect('house', 5, 8), { kind: 'woning', sub: null }).length === 0, 'een huis met type krijgt geen bijgebouw als terugval');
  ok(fallbackKinds(rect('yes', 4, 4), { kind: 'woning', sub: null })[0].sub === 'schuur', 'een klein pand zonder type valt terug op een schuur');
  ok(fallbackKinds(rect('garage', 3, 6), { kind: 'garage', sub: null })[0].sub === 'box', 'een garage (OSM) valt terug op een garagebox');
}

// --- kleine panden: wat past waar ---
{
  const p = (type, w, d, over) => planInterior(rect(type, w, d, over), { upper: false });
  // r8 (22-11): betreedbaar vanaf ca. 3 x 3 m binnenmaat; kleiner blijft dicht
  const tiny = p('yes', 2.9, 3.1);
  ok(!tiny.ok && tiny.why === 'small', 'een pand zonder type van 2,9 x 3,1 m is geen kamer om in te staan (blijft dicht)', JSON.stringify({ ok: tiny.ok, why: tiny.why, kind: tiny.kind }));
  const small = p('yes', 3.8, 3.8);
  ok(small.ok && small.kind === 'garage' && small.sub === 'schuur', 'een pand zonder type van 3,8 x 3,8 m is een schuur', JSON.stringify({ ok: small.ok, why: small.why, kind: small.kind }));
  for (const t of ['shed', 'garage']) { const q = p(t, 2.6, 2.8); ok(!q.ok, t + ' van 2,6 x 2,8 m blijft dicht (kleiner dan 3 x 3 m binnen)', JSON.stringify(q.why)); }
  for (const [kind, sub] of [['garage', 'schuur'], ['garage', 'box'], ['garage', 'kas'], ]) { const mn = hallMinOf(kind, sub); ok(mn.w >= 3 && mn.d >= 3, 'de kleinste hal van ' + kind + '/' + sub + ' is minstens 3 x 3 m', JSON.stringify(mn)); }
  ok(!p('yes', 2.2, 5).ok, 'een pand van 2,2 m breed is te smal');
  ok(p('yes', 3.4, 4.5 + 1).kind === 'woning' || p('yes', 4.6, 5.6).kind === 'woning', 'een gewoon pand zonder type blijft een woning (geen verlies)');
  ok(p('garage', 3.8, 6.4).ok && p('garage', 3.8, 6.4).sub === 'box', 'een garagebox van 3,8 x 6,4 m is betreedbaar');
  ok(p('shed', 3.6, 3.6).ok, 'een schuur van 3,6 x 3,6 m is betreedbaar');
  const ceil = p('shed', 4, 4).height;
  ok(ceil >= 2.3 && ceil <= 2.6, 'een schuur heeft een laag plafond', String(ceil));
  // een gevel zonder deur: een gemaakte deur in plaats van niets
  const nd = planInterior(rect('shed', 5, 6, { entrance: null }), { upper: false });
  ok(nd.ok && nd.kind === 'garage', 'een schuur zonder deur in de gevel krijgt een gemaakte deur', nd.why);
  const nd2 = planInterior(rect('house', 6, 9, { entrance: null }), { upper: false });
  ok(nd2.ok, 'een huis zonder deur in de gevel krijgt een gemaakte deur', nd2.why);
  ok(planInterior(rect('house', 6, 9, { entrance: undefined }), { upper: false }).why === 'nodoor', 'een pand waarvan de gevel nog niet getekend is wacht op zijn deur');
  // een deur dicht bij de hoek (1,2 m): de hal reikt tot de hoek
  const c = rect('house', 8, 9); c.entrance.c = 1.2;
  ok(planInterior(c, { upper: false }).ok, 'een deur op 1,2 m van de hoek geeft een hal (rijtjeshuis)');
}

// --- determinisme: zelfde pand-id, zelfde soort en indeling (host en gast zien hetzelfde) ---
{
  const rnd = mulberry32(2211);
  let same = 0, tot = 0;
  for (let i = 0; i < 200; i++) {
    const w = 2 + rnd() * 12, d = 2.4 + rnd() * 12;
    const a = rect(i % 3 ? 'yes' : 'shed', w, d), b = rect(i % 3 ? 'yes' : 'shed', w, d);
    const pa = planInterior(a, { upper: false }), pb = planInterior(b, { upper: false });
    tot++;
    if (pa.ok === pb.ok && pa.kind === pb.kind && pa.sub === pb.sub && (!pa.ok || JSON.stringify(pa.layout.items) === JSON.stringify(pb.layout.items))) same++;
  }
  ok(same === tot, 'zelfde pand geeft zelfde soort en indeling', same + '/' + tot);
  ok(interiorSeed(rect('yes', 5, 5)) === interiorSeed(rect('yes', 5, 5)), 'het zaad hangt alleen van het pand af');
}

// --- loopbaarheid en deur-bereikbaarheid: 500 panden per nieuw recept ---
const NEW = [['garage', 'schuur'], ['garage', 'box'], ['garage', 'stal'], ['garage', 'kas'], ['woning', 'appartement']];
const stats = {};
{
  const rnd = mulberry32(1122);
  for (const [kind, sub] of NEW) {
    const mn = hallMinOf(kind, sub);
    let fail = 0, thinned = 0, planMax = 0, triMax = 0, buildMax = 0, built = 0, items = 0;
    for (let i = 0; i < 500; i++) {
      const w = mn.w + 1.0 + rnd() * 9, d = mn.d + 1.0 + rnd() * 9;
      const r = building(kind, sub, w, d, rnd);
      const t0 = performance.now();
      const plan = planInterior(r.b, { spot: r.spot, upper: false });
      planMax = Math.max(planMax, performance.now() - t0);
      if (!plan.ok) { fail++; continue; }
      items += plan.layout.items.length;
      if (plan.layout.removed) thinned++;
      const L = plan.layout;
      const bads = validateLayout(L);
      ok(!bads.length, kind + '/' + sub + ' ' + w.toFixed(1) + 'x' + d.toFixed(1) + ': indeling geldig', bads.join('; '));
      // de deur is bereikbaar: de vloer vlak achter de deur en de gebruiksplekken zijn te bereiken, en geen meubel staat in de deurzone of op de trap
      const res = reachable(L, walkGrid(L));
      ok(reachableAt(res, 0, L.hall.v0 + 0.8, 0.6), kind + '/' + sub + ': de vloer achter de deur is bereikbaar');
      const zone = { u0: -plan.door.w / 2 - 0.2, u1: plan.door.w / 2 + 0.2, v0: L.hall.v0 - 0.3, v1: L.hall.v0 + 1.2 };
      ok(!L.items.some((it) => it.solid && rectOf(it).u0 < zone.u1 && rectOf(it).u1 > zone.u0 && rectOf(it).v0 < zone.v1 && rectOf(it).v1 > zone.v0), kind + '/' + sub + ': geen meubel in de deurzone');
      for (const o of L.openings) ok(!L.items.some((it) => it.solid && Math.abs(it.u - o.u) < 0.5 && Math.abs(it.v - o.v) < 0.5), kind + '/' + sub + ': geen meubel in een doorgang');
      if (i % 10 === 0) {
        const t1 = performance.now();
        const { triangles } = B3.buildInteriorGeometry(plan, 0, { x: 0, y: 0 });
        buildMax = Math.max(buildMax, performance.now() - t1); triMax = Math.max(triMax, triangles); built++;
      }
    }
    stats[kind + '/' + sub] = { fail, thinned, planMax: Math.round(planMax), buildMax: Math.round(buildMax), triMax, items: Math.round(items / Math.max(1, 500 - fail)) };
    ok(fail === 0, kind + '/' + sub + ': elk van 500 panden slaagt', fail + ' mislukt');
    ok(thinned <= 25, kind + '/' + sub + ': hooguit 5% uitgedund', String(thinned));
    ok(triMax <= B3.MAX_TRIANGLES, kind + '/' + sub + ': driehoeken binnen het budget', String(triMax));
    ok(triMax <= 5000, kind + '/' + sub + ': een klein bijgebouw blijft ruim onder 5.000 driehoeken', String(triMax));
    ok(planMax < 200 && buildMax < 150, kind + '/' + sub + ': bouwtijd binnen het budget', planMax.toFixed(0) + ' / ' + buildMax.toFixed(0) + ' ms');
  }
}

// --- mensen en drukte: de stal heeft een boer met een schema en kleding; elk nieuw recept heeft een eigen drukte ---
{
  ok(!!SCRIPTS.boer && scriptOf('boer').length >= 3 && CLOTHING_ROLE.boer === 'boer', 'de boer heeft een schema en een kledingpool');
  for (const [kind, sub] of NEW) ok(!!crowdCurves()[kind + ':' + sub], kind + '/' + sub + ' heeft een eigen drukte');
  ok(crowdAt('garage', 'stal', 6) > crowdAt('garage', 'stal', 13), 'op een stal is het vroeg drukker dan om één uur');
  let boer = 0;
  const rnd = mulberry32(77);
  for (let i = 0; i < 100; i++) { const r = building('garage', 'stal', 8 + rnd() * 6, 9 + rnd() * 6, rnd); const p = planInterior(r.b, { spot: r.spot, upper: false }); if (p.ok && p.layout.npc.some((x) => x.role === 'boer')) boer++; }
  ok(boer >= 40, 'in een deel van de stallen staat een boer', String(boer));
}

// --- het portiek: brievenbussen, een doorgang naar de woning erachter, geen etage ---
{
  const r = building('woning', 'appartement', 9, 12, mulberry32(5));
  const p = planInterior(r.b, { spot: r.spot });
  ok(p.ok && p.sub === 'appartement' && p.levels === 1 && !p.stairs, 'een appartement heeft een portiek en geen etage');
  ok(p.layout.items.some((it) => it.type === 'locker') && p.layout.openings.length >= 1 && p.layout.rooms.some((x) => x.id === 'portiek') && p.layout.rooms.some((x) => x.id === 'woonkamer'), 'het portiek heeft brievenbussen, een doorgang en een woonkamer erachter');
}

// --- uitslag ---
console.log('  nieuwe recepten (500 panden elk): ' + Object.entries(stats).map(([k, s]) => k + ' items ' + s.items + ', plan max ' + s.planMax + ' ms, bouw max ' + s.buildMax + ' ms, driehoeken max ' + s.triMax + ', uitgedund ' + s.thinned).join(' | '));
console.log('interieur_r7_test: ' + (bad ? bad + ' van ' + n + ' mislukt' : n + ' controles ok'));
process.exit(bad ? 1 : 0);
void SUB_HALL; void untypedKind;
