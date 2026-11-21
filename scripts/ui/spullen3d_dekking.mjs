// Dekking van de Spullen-viewer (#1086): per categorie hoeveel dingen een 3D-model hebben, uit de echte bronnen (WEAPONS, OUTFITS,
// het meubelhuis, de toonbank, de vissoorten, de upgradelijsten, de kaarten). Een ding zonder model of zonder gedocumenteerde terugval
// laat dit script falen. Elk model wordt ook echt gebouwd (geometrie > 0 driehoeken, binnen het budget) en weer opgeruimd.
//   node scripts/ui/spullen3d_dekking.mjs [--json]      (heeft de gevendorde three nodig: cd desktop && npm run stage)
import '../node3d.mjs';
import { readFileSync } from 'node:fs';

const arg = process.argv.slice(2);
export const DRIEHOEKEN_MAX = 6000;
// de bronnen hebben een toestand (spelstand); een lege wereld volstaat voor de lijsten
const [S, V, E, P, SP, M3, FURN, W] = await Promise.all([
  import('../../game/js/shops.js'), import('../../game/js/visdata.js'), import('../../game/js/eten.js'), import('../../game/js/models3d_people.js'),
  import('../../game/js/spullen3d.js'), import('../../game/js/models3d_spullen.js'), import('../../game/js/furniture.js'), import('../../game/js/weapons.js'),
]);
const { buildProductMesh } = await import('../../game/js/shopmodels3d.js');
const F = await import('../../game/js/pg_foodtruck.js');

// meubel-ids uit de bron (de lijst zelf wordt niet geëxporteerd); het totaal moet kloppen
const meubelBron = readFileSync(new URL('../../game/js/furniture.js', import.meta.url), 'utf8');
const MEUBEL_IDS = [...meubelBron.matchAll(/^ {2}\{ id: '([a-z]+)', short:/gm)].map((m) => m[1]);

// De volledige lijst items zoals spullen.js ze zou maken als je alles had: { key, cat, viewer }.
export function alleItems() {
  const items = [];
  const put = (key, cat, viewer) => items.push({ key, cat, viewer });
  put('geld', 'geld', SP.moneySpec(120));
  for (const k of Object.keys(W.WEAPONS).filter((x) => x !== 'fists')) put('w:' + k, ['throw', 'rocket'].includes(W.WEAPONS[k].kind) ? 'werp' : 'wapens', SP.wapenSpec(k));
  for (const ch of ['tammo', 'anita']) {
    const app = ch === 'anita' ? P.ANITA_APPEARANCE : P.TAMMO_APPEARANCE;
    for (const o of S.OUTFITS[ch]) put(`o:${ch}:${o.id}`, 'kleding', SP.kledingSpec({ ...app, shirt: o.shirt, pants: o.pants, shoes: o.shoes, ...(o.cap != null ? { cap: o.cap } : {}) }));
  }
  for (const id of MEUBEL_IDS) put('f:' + id, 'thuis', SP.meubelSpec(id));
  for (const [id] of E.TOONBANK) put('e:' + id, 'eten', SP.etenSpec(id));
  for (const s of V.SOORTEN) put('e:vis:' + s.id, 'eten', SP.etenSpec('vis:' + s.id));
  for (const id of ['stempels', 'aanwijzingen', 'eieren', 'geheim']) put('k:' + id, 'kaart', SP.cardSpec(id));
  for (const u of S.CAR_UPGRADES) put('u:auto:' + u.id, 'upgrade', SP.upgradeSpec('auto', u.id));
  for (const u of [...S.BIKE_UPGRADES, ...S.MOTO_UPGRADES]) put('u:tweewieler:' + u.id, 'upgrade', SP.upgradeSpec('tweewieler', u.id));
  for (const u of F.fjordUpgradeOffers({ money: 0 })) put('u:fjord:' + u.id, 'upgrade', SP.upgradeSpec('fjord', u.id));
  return items;
}

// Bouwt het model van een spec zoals vehiclepreview.js dat doet; null als de bouwer het ding niet kent.
export function bouwModel(spec) {
  if (!spec) return null;
  if (spec.kind === 'weapon') return P.buildWeaponMesh(spec.weapon);
  if (spec.kind === 'product') return buildProductMesh(spec.product);
  if (spec.kind === 'spul') return M3.buildSpulMesh(spec.spul);
  if (spec.kind === 'person') return P.buildPersonMesh(spec.look.shirt, spec.look.skin, spec.look);
  return null;
}

// Per item: model bestaat, > 0 driehoeken, binnen het budget; daarna dispose van wat de mesh zelf bezit.
export function controleer(items) {
  const rapport = [];
  for (const it of items) {
    const r = { key: it.key, cat: it.cat, viewer: it.viewer ? it.viewer.kind + (it.viewer.product ? ':' + it.viewer.product : it.viewer.weapon ? ':' + it.viewer.weapon : it.viewer.spul ? ':' + it.viewer.spul.type : '') : null, ok: false, reden: '', tris: 0 };
    if (!it.viewer) { r.reden = 'geen viewerdata'; rapport.push(r); continue; }
    let mesh = null;
    try { mesh = bouwModel(it.viewer); } catch (e) { r.reden = 'bouwfout: ' + String(e.message).split('\n')[0]; rapport.push(r); continue; }
    if (!mesh) { r.reden = 'bouwer kent het model niet'; rapport.push(r); continue; }
    const tris = M3.driehoeken(mesh);
    let eigen = 0, gedeeld = 0, nan = false;
    mesh.traverse((o) => { if (o.geometry && o.geometry.attributes.position && o.geometry.attributes.position.array.some((v) => !Number.isFinite(v))) nan = true; });
    if (nan) { r.reden = 'NaN in de geometrie'; rapport.push(r); continue; }
    mesh.traverse((o) => { if (o.geometry) { if (o.geometry.userData && o.geometry.userData.shared) gedeeld++; else { eigen++; o.geometry.dispose(); } } });
    r.tris = Math.round(tris);
    if (!(tris > 0)) r.reden = 'geen driehoeken';
    else if (tris > DRIEHOEKEN_MAX) r.reden = `te zwaar: ${r.tris} > ${DRIEHOEKEN_MAX}`;
    else r.ok = true;
    r.geo = { eigen, gedeeld };
    rapport.push(r);
  }
  return rapport;
}

export function perCategorie(rapport) {
  const per = {};
  for (const r of rapport) {
    const c = per[r.cat] || (per[r.cat] = { totaal: 0, model: 0, zonder: [], maxTris: 0 });
    c.totaal++;
    if (r.ok) { c.model++; c.maxTris = Math.max(c.maxTris, r.tris); } else c.zonder.push(`${r.key} (${r.reden})`);
  }
  return per;
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').slice(-3).join('/'));
if (isMain) {
  const items = alleItems();
  const rapport = controleer(items);
  const per = perCategorie(rapport);
  if (arg.includes('--json')) console.log(JSON.stringify({ per, rapport }, null, 1));
  else {
    let tot = 0, met = 0;
    console.log('categorie     met model / totaal   zwaarste (driehoeken)');
    for (const [c, r] of Object.entries(per)) {
      tot += r.totaal; met += r.model;
      console.log(`${c.padEnd(12)}  ${String(r.model).padStart(3)} / ${String(r.totaal).padEnd(3)}  ${String(Math.round(100 * r.model / r.totaal)).padStart(4)}%   ${r.maxTris}`);
      for (const z of r.zonder) console.log('   zonder:', z);
    }
    console.log(`TOTAAL        ${String(met).padStart(3)} / ${String(tot).padEnd(3)}  ${String(Math.round(100 * met / tot)).padStart(4)}%`);
  }
  const fout = rapport.filter((r) => !r.ok);
  process.exit(fout.length ? 1 : 0);
}
