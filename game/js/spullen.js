// Spullen (the pause menu's inventory): everything you have, read from the
// systems that own it. Per category the things you own, with what they do
// and where they came from, and a count of how many there are ("3 van 8"),
// never what the rest is. Choosing a weapon takes it in hand; furniture
// puts home on the GPS; eten eet je hier op (#502). Vehicles stay in Garage,
// clues and people in Verhaal.
// It is its own pause-menu section (`markup in pausemenu.js` data-panel="spullen":
// a list left and a detail pane right, the same `.m-*` set as the Garage) and it
// has no 3D preview: a preview belongs to the Garage, which owns the one shared
// renderer; Spullen only links to it. The in-world TV overlay in furniture.js is
// HUD, not this screen (#610).
import { WEAPONS, hasWeapon, isMeleeWeapon } from './combat.js';
import { WEAPON_STOCK, OUTFITS, CAR_UPGRADES, BIKE_UPGRADES, MOTO_UPGRADES, inventoryShopState, upgradeListForStock } from './shops.js';
import { VEHICLE_STOCK } from './shopdata.js';
import { furnitureOwned, FURNITURE_TOTAL } from './furniture.js';
import { fjordUpgradeOffers } from './pg_foodtruck.js';
import { getHomeForRender } from './home.js';
import { setUserWaypoint } from './routing.js';
import { getStoryJournal } from './story.js';
import { getSaveSet, EIERBAL_TOTAL } from './achievements.js';
import { SECRETS_TOTAL } from './geheimen.js';
import { getLedger, summary } from './finance.js';
import { woordenVan, past } from './zoektekst.js';
import { icoon } from './icons.js';
import { deviceText } from './touchui.js';
import { glyphHtml } from './keycap.js';
import { CATS, catVan, LEEG, cycleSort, sortLabel, sorteer, badgeTekst, tegelNaam, kanWeggooien, weggooiStap, weggooi, naWeggooien, WEGGOOI_VRAAG } from './spullenmodel.js';

// Phosphor-pictogrammen via icons.js (21-11), per categorie van deze lijst
const ICOON = { geld: 'geld', wapens: 'zwaard', melee: 'mes', werp: 'pakket', kleding: 'kleding', eten: 'eten', thuis: 'thuis', kaart: 'kaart', upgrade: 'gereedschap' };
const SECTIONS = [
  ['geld', 'Geld'],
  ['wapens', 'Wapens'],
  ['werp', 'Werpspul'],
  ['kleding', 'Kleding'],
  ['eten', 'Eten'],
  ['thuis', 'Thuis'],
  ['kaart', 'Kaarten & verzamelingen'],
  ['upgrade', 'Upgrades'],
];

// De tabs van het raster (#1013): wat je hebt, per soort; de indeling staat in spullenmodel.js. Een tab zonder spullen blijft staan en
// zegt waar je ze vindt (LEEG), zodat je weet dat de soort bestaat.
export const DELEN = CATS;

// Eten (#502) woont in eten.js: een bladmodule, want de winkel (shops.js) en de savegame
// gebruiken dezelfde voorraad en mogen daarvoor niet van dit menu afhangen. Hier zowel
// importeren (dit bestand gebruikt eetVoorraad en eet zelf) als doorgeven, zodat het menu en
// de tests dezelfde namen houden.
import { eetVoorraad, eet } from './eten.js';
export { eetWaar, eetVoorraad, etenSave, applyEtenSave, voegEtenToe, eet } from './eten.js';

// Wat er in een kaartje staat, als één lap tekst om in te zoeken. De beschrijving en
// de cijfers van het detailpaneel tellen mee: anders zou een woord dat alleen daar
// staat (zoals "boete" bij geld) niet vindbaar zijn.
const zoektekst = (it) => [it.title, it.sub, it.how, it.perk, it.desc, ...(it.rows || []).flat(), (SECTIONS.find(([c]) => c === it.cat) || [, ''])[1]].join(' ').toLowerCase();

// Zoeken en filteren (#435): alle woorden moeten ergens in het kaartje staan,
// en het kaartje moet in het gekozen deel vallen. Puur, zodat spullen_test het
// kan natrekken.
export function zoekSpullen(items, query = '', deel = 'alles') {
  const words = woordenVan(query);
  return items.filter((it) => {
    if (deel !== 'alles' && catVan(it) !== deel) return false;
    if (!words.length) return true;
    return past(zoektekst(it), words);
  });
}

let sel = null;
let byKey = new Map();
let zoek = '';
let deel = 'alles';
let sortering = 'soort';
// De openstaande vraag "Weggooien?" (spullenmodel.weggooiStap): hoort bij één tegel en vervalt zodra je een andere kiest.
let weggooiVraag = null;
// De melding van de laatste actie (#502): die hoort in het detailpaneel, want de HUD zit
// achter het pauzemenu en w.addMessage zou je nooit zien.
let note = '';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const euro = (v) => '€' + Math.round(v).toLocaleString('nl-NL');
const svg = (id) => icoon(ICOON[id] || 'kaart', { cls: 'pm-ic' });

// Kasboek bij het geld (#206): wat er werkelijk in en uit ging, met een strip van de
// laatste zeven dagen. Is het kasboek nog leeg, dan zegt het detail dat eerlijk in
// plaats van een rij met nullen te tonen.
const bedrag = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);

function moneyLedgerHtml() {
  const l = getLedger();
  const s = summary(l);
  if (!s.inTotal && !s.outTotal) return '<p class="sp-eerlijk">Nog geen inkomsten of uitgaven geboekt. Zodra je iets verdient of uitgeeft, staat het hier.</p>';
  const post = (list) => list.map(([k, v]) => `${k} ${euro(v)}`).join(', ');
  const row = (k, v) => `<div class="sp-lrow"><span>${esc(k)}</span><span class="sp-lv">${esc(v)}</span></div>`;
  const dagen = l.days.slice(-7);
  const netten = dagen.map((d) => bedrag(d.in) - bedrag(d.out));
  const max = Math.max(1, ...netten.map(Math.abs));
  const strip = netten.length ? `<div class="sp-days" role="img" aria-label="Inkomsten en uitgaven van de laatste ${netten.length} dagen">` +
    netten.map((n, i) => `<span class="sp-day${n < 0 ? ' uit' : ''}" title="Dag ${dagen[i].day}: ${n < 0 ? '-' : '+'}${euro(Math.abs(n))}"><i style="height:${Math.max(6, Math.round(Math.abs(n) / max * 100))}%"></i></span>`).join('') +
    '</div><p class="sp-lleg">Laatste zeven dagen: groen erbij, rood eraf</p>' : '';
  return `<div class="sp-ledger"><span class="sp-lhead">Kasboek</span>${strip}<div class="sp-lrows">` +
    row('Vandaag', `+${euro(s.todayIn)} / -${euro(s.todayOut)}`) +
    row('Deze week', `+${euro(s.weekIn)} / -${euro(s.weekOut)}`) +
    row('Totaal verdiend', euro(s.inTotal)) +
    row('Totaal uitgegeven', euro(s.outTotal)) +
    (s.topIn.length ? row('Meeste inkomsten', post(s.topIn)) : '') +
    (s.topOut.length ? row('Meeste uitgaven', post(s.topOut)) : '') +
    '</div></div>';
}

// De vaste opmaak van Spullen (#1013). Eigen <style> in dit bestand: links een raster van tegels (icoon, naam, stand, een aantal-badge),
// rechts het detail met de acties. Kleuren komen uit de tokens van het menu (--ink, --mut, --line, --g) en uit ds-tokens.css; de
// tekst is overal minstens 13 px en een tegel mag zijn naam over drie regels zetten, zodat niets midden in een woord wordt afgekapt.
// De stijl staat bij de lijst, die elke tekening opnieuw wordt gevuld: precies één keer in het paneel.
const SP_CSS = `<style data-spul-css>
#pause-menu [data-panel="spullen"] .td-list{width:min(560px,54%);padding-right:24px}
#pause-menu [data-panel="spullen"] .m-pane{padding-left:32px}
@media (max-width:1100px),(max-height:640px){#pause-menu [data-panel="spullen"] .td-list{width:min(460px,52%);padding-right:16px}}
@media (max-width:760px){#pause-menu [data-panel="spullen"] .td-list{width:auto;max-width:100%}}
#pause-menu .sp-raster{display:grid;grid-template-columns:repeat(auto-fill,minmax(116px,1fr));gap:10px;padding:6px 6px 20px}
#pause-menu .sp-tile{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0;min-height:128px;padding:26px 8px 10px;border-radius:12px;border:2px solid color-mix(in srgb,var(--ink) 28%,transparent);background:transparent;color:var(--ink);font:inherit;text-align:center;cursor:pointer;transition:background-color 150ms ease-out,border-color 150ms ease-out,transform 120ms ease-out}
#pause-menu .sp-tile:hover{border-color:var(--ink);background:color-mix(in srgb,var(--ink) 5%,transparent)}
#pause-menu .sp-tile:active{transform:scale(.97)}
#pause-menu .sp-tile[aria-current="true"]{background:var(--ds-c-sel-vlak);border-color:var(--g);box-shadow:inset 0 0 0 1px var(--g)}
#pause-menu .sp-tile:focus-visible{outline:3px solid var(--ds-focus,var(--ink));outline-offset:2px}
#pause-menu .sp-tile__ic{display:grid;place-items:center;width:40px;height:40px;color:var(--g)}
#pause-menu .sp-tile__ic svg{width:32px;height:32px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
#pause-menu .sp-tile__t{font-size:15px;line-height:1.2;max-width:100%;overflow-wrap:break-word;hyphens:auto;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
#pause-menu .sp-tile__s{font-size:13px;line-height:1.2;color:var(--mut);max-width:100%;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
#pause-menu .sp-badge{position:absolute;top:6px;right:6px;min-width:26px;height:24px;padding:0 7px;display:inline-grid;place-items:center;border-radius:12px;background:var(--ink);color:var(--ds-zeef-bg,#fff);font-size:14px;font-weight:700;letter-spacing:.02em}
#pause-menu .sp-pip{position:absolute;top:6px;left:6px;max-width:calc(100% - 52px);padding:1px 7px;border-radius:10px;border:1.5px solid var(--g);color:var(--g);font-size:13px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#pause-menu .sp-leeg{padding:var(--ds-s-4,16px) 8px;max-width:420px;font-size:max(16px,var(--menu-min));color:var(--mut)}
#pause-menu .sp-sort{margin-left:auto}
#pause-menu .sp-weg{display:flex;flex-direction:column;gap:10px;padding:14px 16px;border-radius:12px;border:2px solid var(--redtx);background:color-mix(in srgb,var(--redtx) 8%,transparent);animation:sp-in 160ms ease-out}
#pause-menu .sp-weg p{margin:0;font-size:max(18px,var(--menu-min))}
#pause-menu .sp-weg b{font-weight:700}
#pause-menu .sp-weg .sp-weg-ja{color:var(--redtx);border-color:var(--redtx)}
#pause-menu .sp-acts-weg{display:flex;flex-wrap:wrap;gap:8px}
#pause-menu .sp-dhead{display:flex;align-items:center;gap:18px;min-width:0;animation:sp-in 160ms ease-out}
@keyframes sp-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){#pause-menu .sp-tile,#pause-menu .sp-weg,#pause-menu .sp-dhead{transition:none;animation:none}}
#pause-menu .sp-big{width:76px;height:76px;flex:none;display:grid;place-items:center;border-radius:18px;background:color-mix(in srgb,var(--g) 10%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--g) 30%,transparent);color:var(--g)}
#pause-menu .sp-big svg{width:38px;height:38px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
#pause-menu .sp-dmeta{display:flex;flex-direction:column;gap:6px;min-width:0}
#pause-menu .sp-dmeta .td-h2{margin:0;overflow-wrap:break-word}
#pause-menu .sp-desc{margin:0;max-width:640px;font-size:20px;line-height:1.45;color:var(--ink)}
#pause-menu .sp-eerlijk{margin:0;max-width:640px;font-size:max(18px,var(--menu-min));line-height:1.45;color:var(--mut)}
#pause-menu .sp-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 32px;padding:16px 0 0;border-top:1px solid var(--line)}
#pause-menu .sp-fact{display:flex;flex-direction:column;gap:3px;min-width:0}
#pause-menu .sp-fact > span:first-child{font-size:max(15px,var(--menu-min));letter-spacing:.04em;text-transform:uppercase;color:var(--mut)}
#pause-menu .sp-fact > span:last-child{font-size:max(19px,var(--menu-min));line-height:1.35;color:var(--ink);overflow-wrap:anywhere}
#pause-menu .sp-ledger{display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:12px;background:rgba(12,20,14,.55);box-shadow:inset 0 0 0 1px var(--line2)}
#pause-menu .sp-lhead{font-family:'Bebas Neue','Arial Narrow',Arial,sans-serif;font-size:20px;letter-spacing:.14em;text-transform:uppercase;color:var(--mut)}
#pause-menu .sp-days{display:flex;align-items:flex-end;gap:6px;height:56px}
#pause-menu .sp-day{flex:1;display:flex;align-items:flex-end;height:100%}
#pause-menu .sp-day i{display:block;width:100%;border-radius:3px 3px 0 0;background:var(--g);opacity:.85}
#pause-menu .sp-day.uit i{background:var(--redtx)}
#pause-menu .sp-lleg{margin:0;font-size:max(14px,var(--menu-min));color:var(--mut)}
#pause-menu .sp-lrows{display:flex;flex-direction:column;gap:6px}
#pause-menu .sp-lrow{display:flex;align-items:baseline;justify-content:space-between;gap:20px;font-size:max(17px,var(--menu-min));line-height:1.35}
#pause-menu .sp-lrow > span:first-child{color:var(--mut);flex:none}
#pause-menu .sp-lv{color:var(--ink);text-align:right;overflow-wrap:anywhere}
@media (max-width:1440px){#pause-menu .sp-facts{grid-template-columns:1fr}}
</style>`;

// Items: { key, cat, icon, title, sub, side, desc, how, perk, rows, act: { label, run }, link, ledger }
// `sub` is wat de kaart links al zegt (stand, aantal, munitie); het detail herhaalt dat nooit.
// `desc` is de korte typering in de toon van het spel, `how` de herkomst, `perk` het effect,
// `rows` de cijfers en `ledger` zet het kasboek van finance.js onder het geld.
function collect(w) {
  const out = [];
  const counts = {};
  const shop = inventoryShopState();
  const ch = w.player.character === 'anita' ? 'anita' : 'tammo';

  out.push({ key: 'geld', cat: 'geld', icon: 'geld', title: euro(Math.max(0, Math.floor(w.money))), sub: 'Contant',
    desc: 'Wat je op zak hebt om uit te geven. Waar het vandaan kwam en waar het heen ging, staat eronder in het kasboek.',
    how: 'Missies, bijbaantjes en verkopen', perk: 'Gepakt worden kost een boete per ster', ledger: true });

  const stock = new Map(WEAPON_STOCK.map((s) => [s.key, s]));
  const guns = Object.keys(WEAPONS).filter((k) => k !== 'fists' && !['throw', 'rocket'].includes(WEAPONS[k].kind));
  const throws = Object.keys(WEAPONS).filter((k) => ['throw', 'rocket'].includes(WEAPONS[k].kind));
  const weaponItem = (k, cat) => {
    const s = stock.get(k) || {};
    const melee = isMeleeWeapon(k);
    const ammo = w.ammo[k] || 0;
    const held = w.weapon === k;
    return {
      key: 'w:' + k, cat, icon: melee ? 'melee' : cat === 'werp' ? 'werp' : 'wapens', title: s.label || k,
      sub: melee ? 'Slaan · altijd bij de hand' : `${s.unit || 'patronen'}${s.cap ? ` (max ${s.cap})` : ''}`,
      aantal: melee ? 0 : ammo, eenheid: s.unit || 'patronen',
      side: held ? 'In de hand' : '', desc: s.desc || (melee ? 'Een slagwapen voor dichtbij.' : ''),
      how: s.gun ? `Pang & Zo, ${euro(s.gun)}` : '',
      rows: [['Toets', String(WEAPONS[k].slot)], ...(WEAPONS[k].damage ? [['Schade', String(WEAPONS[k].damage)]] : [])],
      act: held ? null : { label: 'In de hand nemen', run: () => { w.weapon = k; return `${s.label || k} in de hand`; } },
    };
  };
  const ownGuns = guns.filter((k) => hasWeapon(w, k));
  counts.wapens = `${ownGuns.length} van ${guns.length}`;
  out.push({ key: 'w:fists', cat: 'wapens', icon: 'melee', title: 'Vuisten', sub: 'Altijd bij je', side: w.weapon === 'fists' ? 'In de hand' : '',
    desc: 'Je eigen vuisten: geen munitie nodig en nooit kapot.',
    rows: [['Toets', '1'], ['Schade', String(WEAPONS.fists.damage)]],
    act: w.weapon === 'fists' ? null : { label: 'In de hand nemen', run: () => { w.weapon = 'fists'; return 'Vuisten'; } } });
  for (const k of ownGuns) out.push(weaponItem(k, 'wapens'));
  const ownThrows = throws.filter((k) => hasWeapon(w, k));
  counts.werp = `${ownThrows.length} van ${throws.length}`;
  for (const k of ownThrows) out.push(weaponItem(k, 'werp'));

  const outfits = OUTFITS[ch] || [];
  const ownOutfits = outfits.filter((o) => shop.ownedOutfits.includes(`${ch}:${o.id}`));
  counts.kleding = `${ownOutfits.length} van ${outfits.length}`;
  for (const o of ownOutfits) {
    const wearing = (shop.storyOutfit || shop.outfit[ch]) === o.id;
    out.push({ key: 'o:' + o.id, cat: 'kleding', icon: 'kleding', title: o.label, sub: wearing ? '' : 'Ligt thuis in de kast', side: wearing ? 'Aan' : '',
      desc: o.desc,
      how: o.price && o.id !== 'stadjer' && o.id !== 'classic' ? `Stoer & Stads, ${euro(o.price)}` : 'Van jezelf',
      perk: o.stealth ? 'Onopvallend: de politie raakt je sneller kwijt' : 'Omkleden kan thuis bij de kast',
      act: !wearing && getHomeForRender().length ? { label: 'Route naar de kast thuis', run: () => homeRoute('Kledingkast') } : null });
  }

  const furn = furnitureOwned();
  counts.thuis = `${furn.length} van ${FURNITURE_TOTAL}`;
  for (const f of furn) {
    out.push({ key: 'f:' + f.id, cat: 'thuis', icon: 'thuis', title: f.label,
      sub: f.ready ? 'Staat thuis' : f.pending ? 'Wordt bezorgd' : 'Moet nog in elkaar',
      desc: f.perk, how: `EIKEA, ${euro(f.price)}`, rows: f.stat ? [[f.stat[0], f.stat[1]]] : [],
      act: getHomeForRender().length ? { label: 'Route naar huis', run: () => homeRoute(f.short || f.label) } : null });
  }

  // Eten (#502): elk eetbaar ding een eigen kaart, met "Opeten" als actie. De actie
  // gebruikt dezelfde gezondheidsregel als de toonbank (eet hierboven).
  const eten = eetVoorraad(w);
  const stuks = eten.reduce((n, e) => n + e.aantal, 0);
  counts.eten = stuks ? `${stuks} ${stuks === 1 ? 'stuk' : 'stuks'}` : '';
  for (const e of eten) {
    out.push({ key: 'e:' + e.id, cat: 'eten', icon: 'eten', title: e.label, sub: e.how, aantal: e.aantal, weg: { id: e.id, aantal: e.aantal },
      desc: e.how === 'Zelf gevangen' ? 'Zelf gevangen aan de waterkant. Opeten kan overal, ook hier in het menu.'
        : `Meegenomen van de ${e.how.toLowerCase()}. Opeten kan overal, ook hier in het menu.`,
      rows: [['Per stuk', `+${e.hp} gezondheid`], ['Jij nu', `${Math.round(w.health)} van 100`]],
      act: { label: 'Opeten', run: () => eet(w, e.id) } });
  }

  const nogStempels = Math.max(0, shop.stampCard - shop.stamps);
  out.push({ key: 'k:stempels', cat: 'kaart', icon: 'kaart', title: 'Spaarkaart Krant & Kauwgom', sub: `${shop.stamps} van ${shop.stampCard} stempels`,
    desc: 'Elke aankoop bij Krant & Kauwgom levert een stempel. Vol is inleveren voor iets leuks.',
    how: 'Krant & Kauwgom', rows: [['Stand', nogStempels ? `nog ${nogStempels} ${nogStempels === 1 ? 'stempel' : 'stempels'}` : 'vol, inleveren maar']] });
  let jr = null;
  try { jr = getStoryJournal(); } catch (e) { /* story not ready */ }
  if (jr) out.push({ key: 'k:aanwijzingen', cat: 'kaart', icon: 'kaart', title: 'Aanwijzingen', sub: `${jr.found.length} van ${jr.total} gevonden`,
    desc: 'Alles wat je onderweg hoorde en zag over het verhaal. De volledige tekst staat bij Verhaal.', how: 'Verhaal',
    link: ['verhaal', 'Naar Verhaal'] });
  const eieren = getSaveSet('eierballen').size;
  out.push({ key: 'k:eieren', cat: 'kaart', icon: 'kaart', title: 'Eierballen', sub: `${eieren} van ${EIERBAL_TOTAL} gevonden`,
    desc: 'Verstopt bij de bezienswaardigheden van de provincie. Zoeken maar.',
    link: ['todo', 'Naar Te doen'] });
  const geheimen = getSaveSet('geheimen').size;
  out.push({ key: 'k:geheim', cat: 'kaart', icon: 'kaart', title: 'Geheimpjes', sub: `${geheimen} van ${SECRETS_TOTAL} gevonden`,
    desc: 'Kleine geheimpjes, hier en daar verstopt. We verklappen niks.',
    link: ['todo', 'Naar Te doen'] });

  const ups = [];
  const label = (list, id) => (list.find((u) => u.id === id) || {});
  for (const id of shop.heroUpgrades) { const u = label(CAR_UPGRADES, id); ups.push({ key: 'u:hero:' + id, title: u.label || id, sub: 'Fjord Escapade', desc: u.desc, how: u.price ? `Knal & Kolder, ${euro(u.price)}` : '' }); }
  for (const v of shop.vehicles) {
    for (const id of v.upgrades) { const u = label(v.kind === 'bike' ? BIKE_UPGRADES : v.kind === 'scooter' ? [...BIKE_UPGRADES, ...MOTO_UPGRADES] : CAR_UPGRADES, id); ups.push({ key: `u:${v.key}:${id}`, title: u.label || id, sub: v.label, desc: u.desc, how: u.price ? euro(u.price) : '' }); }
  }
  for (const u of fjordUpgradeOffers(w)) if (u.owned) ups.push({ key: 'u:fjord:' + u.id, title: u.name, sub: 'Fjord Frituur', desc: u.blurb, how: euro(u.price) });
  for (const u of ups) out.push({ ...u, cat: 'upgrade', icon: 'upgrade', link: u.sub === 'Fjord Frituur' ? null : ['garage', 'Naar Garage'] });
  counts.upgrade = `${ups.length} van ${upgradeTotaal(shop, fjordUpgradeOffers(w))}`;
  return { items: out, counts };
}

function homeRoute(what) {
  const h = getHomeForRender()[0];
  if (!h) return 'Geen huis gevonden';
  setUserWaypoint(h.x, h.y, 'Thuis');
  return `Route naar huis (${what})`;
}

// Een tegel van het raster: icoon, naam en stand, links de toestand (In de hand, Aan) en rechts het aantal. De naam voor een schermlezer
// bevat het aantal en de toestand (tegelNaam), want de badge zelf is alleen voor het oog.
function tegel(it) {
  const badge = badgeTekst(it);
  return `<button type="button" class="sp-tile" data-spul="${esc(it.key)}" data-cat="${catVan(it)}" aria-label="${esc(tegelNaam(it))}" title="${esc(it.title)}"${sel === it.key ? ' aria-current="true"' : ''}>` +
    (it.side ? `<span class="sp-pip">${esc(it.side)}</span>` : '') + (badge ? `<span class="sp-badge" aria-hidden="true">${badge}</span>` : '') +
    `<span class="sp-tile__ic">${svg(it.icon)}</span><span class="sp-tile__t">${esc(it.title)}</span><span class="sp-tile__s">${esc(it.sub || '')}</span></button>`;
}

// De acties onder het detail: de eigen actie van het ding (Opeten, In de hand nemen), de weg naar een ander scherm, en bij eten het
// weggooien met een bevestiging die zegt dat het niet terug kan. De bevestiging staat IN het detail, niet in een venster erbovenop.
function actiesHtml(it) {
  let btns = '';
  if (it.act) btns += deviceText(`<button type="button" class="m-bp" data-spul-act="${esc(it.key)}">${esc(it.act.label)} ${glyphHtml('ENTER')}</button>`, `<button type="button" class="m-bp" data-spul-act="${esc(it.key)}">${esc(it.act.label)}</button>`);
  if (it.link) btns += `<button type="button" class="${it.act ? 'm-bg' : 'm-bp'}" data-goto="${it.link[0]}">${esc(it.link[1])}</button>`;
  let weg = '';
  if (kanWeggooien(it)) {
    const n = it.weg.aantal;
    if (weggooiVraag && weggooiVraag.key === it.key) {
      const wat = weggooiVraag.alles && n > 1 ? `alle ${n} stuks ${it.title}` : `één stuk ${it.title}`;
      weg = `<div class="sp-weg" role="alertdialog" aria-label="Weggooien bevestigen" aria-describedby="sp-weg-t"><p id="sp-weg-t"><b>${WEGGOOI_VRAAG}</b> ${esc(wat.charAt(0).toUpperCase() + wat.slice(1))} gaat weg.</p>` +
        `<div class="sp-acts-weg"><button type="button" class="m-bg" data-spul-weg-nee="${esc(it.key)}">Nee, houden</button><button type="button" class="m-bg sp-weg-ja" data-spul-weg-ja="${esc(it.key)}">${icoon('prullenbak', { cls: 'pm-ic' })}<span>Ja, weggooien</span></button></div></div>`;
    } else {
      weg = `<div class="sp-acts-weg"><button type="button" class="m-bg" data-spul-weg="${esc(it.key)}">${icoon('prullenbak', { cls: 'pm-ic' })}<span>${n > 1 ? 'Eén weggooien' : 'Weggooien'}</span></button>` +
        (n > 1 ? `<button type="button" class="m-bg" data-spul-weg="${esc(it.key)}" data-alles="1"><span>Alles weggooien (${n})</span></button>` : '') + '</div>';
    }
  }
  return (btns ? `<div class="m-acts td-acts">${btns}</div>` : '') + weg;
}

// Het detailpaneel (#929, #1013): wat het ding IS, waar het vandaan komt, wat het doet en de acties. De tegel draagt de naam en de
// stand al; hier staat nooit dezelfde regel nog eens, en is er niets te zeggen dan zegt het paneel dat in één eerlijke zin.
function detailHtml() {
  const it = byKey.get(sel);
  if (!it) return '<div class="ds-leeg sp-leeg"><p>Kies een tegel; hier lees je wat het is, waar het vandaan komt en wat je ermee kunt.</p></div>';
  const facts = [
    it.how ? ['Herkomst', it.how] : null,
    it.perk ? ['Effect', it.perk] : null,
    ...(it.rows || []),
  ].filter(Boolean);
  if (it.aantal > 0) facts.unshift(['Bij je', `${it.aantal} ${it.eenheid || (it.aantal === 1 ? 'stuk' : 'stuks')}`]);
  const factHtml = facts.length
    ? `<div class="sp-facts">${facts.map(([k, v]) => `<div class="sp-fact"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('')}</div>`
    : '';
  const ledger = it.ledger ? moneyLedgerHtml() : '';
  const cat = (SECTIONS.find(([c]) => c === it.cat) || [, ''])[1];
  const kop = it.cat === 'geld' ? 'Geld' : it.title;
  return `<div class="sp-dhead"><span class="sp-big">${svg(it.icon)}</span><div class="sp-dmeta">` +
    `${cat && cat !== kop ? `<span class="m-eb sp-detail-cat">${esc(cat)}</span>` : ''}<h2 class="m-h2 td-h2">${esc(kop)}</h2></div></div>` +
    `${it.desc ? `<p class="sp-desc">${esc(it.desc)}</p>` : ''}` +
    (ledger || factHtml ? (ledger || '') + factHtml : (!it.desc ? '<p class="sp-eerlijk">Verder valt hier niets over te zeggen.</p>' : '')) +
    `<span class="m-grow"></span>` +
    `${note ? `<p class="m-note" data-spul-melding role="status">${esc(note)}</p>` : ''}${actiesHtml(it)}`;
}

// Het <style>-blok staat één keer boven de lijst. De lijst wordt bij elke tekening
// opnieuw gevuld, dus er staat nooit een tweede kopie in het paneel; het detailpaneel
// wordt los hertekend (spullenFocus) en houdt de stijl zo gewoon.
// Draws the section into panel (pausemenu.js); returns the sheet subtitle.
// QoL (#985): hoeveel upgrades er te halen zijn voor wat je hebt: de Escapade, elk gekocht voertuig (naar zijn
// soort) en de Fjord Frituur. Zo staat de teller als "3 van 8" en krijgt de categorie zijn voortgangsbalk.
export function upgradeTotaal(shop, fjordOffers = []) {
  let totaal = CAR_UPGRADES.length + fjordOffers.length;
  for (const v of (shop && shop.vehicles) || []) {
    const spec = VEHICLE_STOCK[v.key];
    if (spec) totaal += upgradeListForStock(spec).length;
  }
  return totaal;
}

export function renderSpullen(panel, w) {
  const { items } = collect(w);
  byKey = new Map(items.map((it) => [it.key, it]));
  const zichtbaar = sorteer(zoekSpullen(items, zoek, deel), sortering);
  const zichtbaarSet = new Set(zichtbaar);
  if (!sel || !zichtbaarSet.has(sel)) sel = zichtbaar[0] ? zichtbaar[0].key : null;
  if (weggooiVraag && (weggooiVraag.key !== sel || !kanWeggooien(byKey.get(sel)))) weggooiVraag = null;
  const list = panel.querySelector('.td-list');
  const zoekt = zoek.trim();
  const raster = zichtbaar.length
    ? `<div class="sp-raster" role="group" aria-label="Je spullen">${zichtbaar.map(tegel).join('')}</div>`
    : `<div class="ds-leeg sp-leeg" data-spul-leeg><p>${zoekt ? `Niks gevonden voor "${esc(zoekt)}". ${deel === 'alles' ? 'Probeer een ander woord.' : 'Kies Alles om overal te zoeken.'}` : esc(LEEG[deel] || LEEG.alles)}</p></div>`;
  // De stijl hoort bij de lijst, die elke tekening opnieuw wordt gevuld: zo staat hij er precies één keer en niet in het detail.
  list.innerHTML = SP_CSS + raster;
  // de knoppen boven de lijst tonen de stand (#435)
  for (const b of panel.querySelectorAll('[data-spul-deel]')) b.setAttribute('aria-pressed', String(b.dataset.spulDeel === deel));
  const sortKnop = panel.querySelector('[data-spul-sort]');
  if (sortKnop) { const t = sortKnop.querySelector('span'); if (t) t.textContent = 'Sorteren: ' + sortLabel(sortering).toLowerCase(); }
  const zoekveld = panel.querySelector('[data-spul-search]');
  if (zoekveld && zoekveld.value !== zoek) zoekveld.value = zoek;
  panel.querySelector('.td-detail').innerHTML = detailHtml();
  const owned = items.filter((it) => it.cat !== 'geld' && it.cat !== 'kaart').length;
  const kop = zichtbaar.length === items.length ? '' : `${zichtbaar.length} van ${items.length} · `;
  return `${kop}${owned} dingen in bezit · ${euro(Math.max(0, Math.floor(w.money)))} contant`;
}

// De zoekopdracht en het gekozen deel komen uit het paneel (pausemenu.js) en
// blijven staan als je het scherm even verlaat. Ze zetten alleen de stand; het
// scherm opnieuw tekenen doet de aanroeper, zodat ook de voetregel klopt.
export function zetSpullenZoek(tekst) { zoek = String(tekst || ''); }
export function spullenZoekStand() { return { zoek, deel }; }
export function zetSpullenDeel(d) { deel = DELEN.some(([id]) => id === d) ? d : 'alles'; }

// Focus or click on a tile shows it; the action button runs it. a: { rerender(keep), message(text) }
export function spullenFocus(panel, el) {
  const c = el && el.closest && el.closest('[data-spul]');
  if (!c || !panel.contains(c) || c.dataset.spul === sel) return;
  sel = c.dataset.spul;
  note = ''; // een andere tegel: de melding van de vorige actie hoort er niet meer bij
  weggooiVraag = weggooiStap(weggooiVraag, 'ander', sel).state; // en een openstaande vraag Weggooien? ook niet
  for (const b of panel.querySelectorAll('[data-spul]')) b.toggleAttribute('aria-current', b.dataset.spul === sel);
  panel.querySelector('.td-detail').innerHTML = detailHtml();
}

// Een kaartselector zonder CSS.escape: de sleutels zijn van ons (geen quotes), en zo
// werkt dezelfde code ook buiten de browser (scripts/spullen_eten_test.mjs).
const kaartSel = (key) => `[data-spul="${String(key).replace(/["\\]/g, '\\$&')}"]`;

// De actie van een kaart uitvoeren: de knop in het detail doet dit via een klik, Enter op
// de kaart zelf komt hier ook uit (#502). De melding gaat naar het paneel, niet naar de
// HUD: die zit achter het pauzemenu. Geeft false als de kaart niets kan.
export function spullenEnter(panel, key, a) {
  const it = byKey.get(key);
  if (!it || !it.act) return false;
  note = it.act.run() || '';
  const kaart = panel ? panel.querySelector(kaartSel(key)) : null;
  if (a) a.rerender(kaart);
  note = ''; // de tekst staat nu in het paneel; een volgende tekening begint schoon
  return true;
}

// Esc op een openstaande vraag Weggooien? sluit die en laat de focus op de knop zijn waar hij vandaan kwam. Geeft true als er iets te
// sluiten was (dan gaat Esc niet ook nog een scherm terug).
export function spullenAnnuleer(panel) {
  if (!weggooiVraag) return false;
  const key = weggooiVraag.key;
  weggooiVraag = weggooiStap(weggooiVraag, 'annuleer', key).state;
  if (panel) {
    panel.querySelector('.td-detail').innerHTML = detailHtml();
    const terug = panel.querySelector('[data-spul-weg]');
    if (terug && terug.focus) terug.focus({ preventScroll: true });
  }
  return true;
}

export function spullenClick(e, w, panel, a) {
  const chip = e.target.closest('[data-spul-deel]');
  if (chip) { zetSpullenDeel(chip.dataset.spulDeel); weggooiVraag = null; a.rerender(); return true; }
  if (e.target.closest('[data-spul-sort]')) { sortering = cycleSort(sortering); a.rerender(); return true; }
  const weg = e.target.closest('[data-spul-weg]');
  if (weg) {
    weggooiVraag = weggooiStap(null, 'vraag', weg.dataset.spulWeg, !!weg.dataset.alles).state;
    panel.querySelector('.td-detail').innerHTML = detailHtml();
    const veilig = panel.querySelector('[data-spul-weg-nee]'); // de veilige keuze krijgt de focus
    if (veilig && veilig.focus) veilig.focus({ preventScroll: true });
    return true;
  }
  const nee = e.target.closest('[data-spul-weg-nee]');
  if (nee) { spullenAnnuleer(panel); return true; }
  const ja = e.target.closest('[data-spul-weg-ja]');
  if (ja) {
    const key = ja.dataset.spulWegJa;
    const r = weggooiStap(weggooiVraag, 'bevestig', key);
    const it = byKey.get(key);
    weggooiVraag = r.state;
    if (r.doe && it) {
      const sleutels = [...panel.querySelectorAll('[data-spul]')].map((b) => b.dataset.spul);
      note = weggooi(w, it, r.alles);
      const rest = Math.floor(Number(w.eten && w.eten[it.weg.id]) || 0);
      const volgende = rest > 0 ? key : naWeggooien(sleutels, key);
      if (rest <= 0) sel = volgende;
      a.rerender({ dataset: { spul: volgende || '' } });
      note = '';
    } else a.rerender(panel.querySelector(kaartSel(key)));
    return true;
  }
  const act = e.target.closest('[data-spul-act]');
  if (act) {
    const it = byKey.get(act.dataset.spulAct);
    if (it && it.act) note = it.act.run() || '';
    a.rerender(panel.querySelector(kaartSel(act.dataset.spulAct)));
    note = ''; // net als bij Enter: de melding blijft in het paneel staan, niet in de staat
    return true;
  }
  const c = e.target.closest('[data-spul]');
  if (c) { spullenFocus(panel, c); return true; }
  return false;
}
