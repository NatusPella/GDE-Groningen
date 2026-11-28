// Spullen (the pause menu's inventory): everything you have, read from the
// systems that own it. Per category the things you own, with what they do
// and where they came from, and a count of how many there are ("3 van 8"),
// never what the rest is. Choosing a weapon takes it in hand; furniture
// puts home on the GPS; eten eet je hier op (#502). Vehicles stay in Garage,
// clues and people in Verhaal.
// It is its own pause-menu section (`markup in pausemenu.js` data-panel="spullen":
// a gallery of 3D thumbnails left (spullenthumbs.js, spullenraster.js) and a compact detail pane right (max 30%), the same `.m-*` set as the Garage). Het detail
// toont een draaibaar 3D-model van het ding (#1086): dezelfde gedeelde voorbeeldrenderer als
// de Garage (vehiclepreview.js createSharedPreview, één canvas per detail, geen eigen
// WebGL-context); welk model staat in spullen3d.js, de nieuwe modellen in models3d_spullen.js.
// Zonder model of zonder WebGL blijft het icoon staan. The in-world TV overlay in
// furniture.js is HUD, not this screen (#610).
import { plaatHtml, kopRij } from './bezitplaat.js';
import { WEAPONS, hasWeapon, isMeleeWeapon } from './combat.js';
import { WEAPON_STOCK, wearClothing, takeOffClothing, CAR_UPGRADES, BIKE_UPGRADES, MOTO_UPGRADES, inventoryShopState, upgradeListForStock } from './shops.js';
import { VEHICLE_STOCK } from './shopdata.js';
import { sfxEvent } from './sfx/haken.js';
import { furnitureOwned, FURNITURE_TOTAL } from './furniture.js';
import { fjordUpgradeOffers } from './pg_foodtruck.js';
import { getHomeForRender } from './home.js';
import { setUserWaypoint } from './routing.js';
import { getSaveSet, EIERBAL_TOTAL } from './achievements.js';
import { SECRETS_TOTAL } from './geheimen.js';
import { getLedger, summary } from './finance.js';
import { woordenVan, past } from './zoektekst.js';
import { icoon } from './icons.js';
import { deviceText } from './touchui.js';
import { glyphHtml } from './keycap.js';
import { createSharedPreview, renderSnapshot, cancelSnapshots, releaseSnapshots } from './vehiclepreview.js';
import { ownedPieces, wornPieces, takeOffBlock, ownsAll, wornMatches, wearSet } from './clothing.js';
import { SLOTS, SLOT_IDS, LOOKS, setsFor, parsePiece, pieceLabel } from './clothingdata.js';
import { reducedMotion } from './motion.js';
import { rasterMaat, kolommenUitTops, focusStep, TEGEL_MIN } from './spullenraster.js';
import { createThumbs } from './spullenthumbs.js';
import { hoofdspeler } from './players.js';
import { moneySpec, wapenSpec, stukSpec, setSpec, tintVoor, etenSpec, meubelSpec, cardSpec, upgradeSpec, modelLabel } from './spullen3d.js';
import { CATS, itemIcoon, catVan, LEEG, cycleSort, sortLabel, sorteer, badgeTekst, tegelNaam, kanWeggooien, weggooiStap, weggooi, naWeggooien, WEGGOOI_VRAAG } from './spullenmodel.js';

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
import { eetVoorraad, eet, etenWerkwoord } from './eten.js';
import { escapeHtml as esc } from './htmlescape.js';
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
// De sleutels van de tegels in de volgorde van de laatste tekening: weet het raster welke tegel naast een verdwenen ding stond.
let laatsteVolgorde = [];
// De melding van de laatste actie (#502): die hoort in het detailpaneel, want de HUD zit
// achter het pauzemenu en w.addMessage zou je nooit zien.
let note = '';
const euro = (v) => '€' + Math.round(v).toLocaleString('nl-NL');
// Phosphor-pictogram van een ding (spullenmodel.itemIcoon: per soort of groep, nooit het vraagteken van de terugval)
const svg = (it) => icoon(itemIcoon(it), { cls: 'pm-ic' });

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

// De vaste opmaak van Spullen (#1013). Eigen <style> in dit bestand: links een galerij van tegels (3D-plaatje, naam, stand, een aantal-badge),
// rechts het detail met de acties. Kleuren komen uit de tokens van het menu (--ink, --mut, --line, --g) en uit ds-tokens.css; de
// tekst is overal minstens 13 px en een tegel mag zijn naam over drie regels zetten, zodat niets midden in een woord wordt afgekapt.
// De stijl staat bij de lijst, die elke tekening opnieuw wordt gevuld: precies één keer in het paneel.
const SP_CSS = `<style data-spul-css>
#pause-menu [data-panel="spullen"] .td-list{flex:1 1 auto;width:auto;min-width:0;padding-right:20px}
#pause-menu [data-panel="spullen"] .m-pane{flex:0 0 var(--sp-detail,380px);width:var(--sp-detail,380px);min-width:0;box-sizing:border-box;padding-left:24px}
@media (max-width:760px){#pause-menu [data-panel="spullen"] .td-list{max-width:100%;padding-right:0}#pause-menu [data-panel="spullen"] .m-pane{flex:none;width:auto;padding-left:0}}
#pause-menu .sp-raster{display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--sp-min,152px),1fr));gap:12px;padding:6px 6px 20px}
#pause-menu .sp-tile{position:relative;display:flex;flex-direction:column;gap:4px;min-width:0;padding:6px 6px 8px;border-radius:12px;border:2px solid color-mix(in srgb,var(--ink) 28%,transparent);background:transparent;color:var(--ink);font:inherit;text-align:left;cursor:pointer;transition:transform var(--ds-m-midden,150ms) var(--ds-m-uit,ease-out)}
#pause-menu .sp-tile::before,#pause-menu .sp-tile::after{content:"";position:absolute;pointer-events:none;border-radius:10px;opacity:0;transition:opacity var(--ds-m-midden,150ms) var(--ds-m-uit,ease-out)}
#pause-menu .sp-tile::before{inset:0;background:color-mix(in srgb,var(--ink) 6%,transparent)}
#pause-menu .sp-tile::after{inset:-2px;border-radius:12px;border:2px solid var(--g);box-shadow:inset 0 0 0 1px var(--g)}
#pause-menu .sp-tile:hover{transform:translateY(-2px)}
#pause-menu .sp-tile:hover::before,#pause-menu .sp-tile:focus-visible::before{opacity:1}
#pause-menu .sp-tile:active{transform:scale(.98)}
#pause-menu .sp-tile[aria-current="true"]::before{opacity:1;background:var(--ds-c-sel-vlak)}
#pause-menu .sp-tile[aria-current="true"]::after{opacity:1}
#pause-menu .sp-tile:focus-visible{outline:3px solid var(--ds-focus,var(--ink));outline-offset:3px}
#pause-menu .sp-tile > *{position:relative}
#pause-menu .sp-pw{position:relative;aspect-ratio:4/3;border-radius:8px;overflow:hidden;background:color-mix(in srgb,var(--ink) 7%,transparent);box-shadow:inset 0 0 0 1px var(--line)}
#pause-menu .sp-pw.sp-tint{background:var(--sp-tint)}
#pause-menu .sp-stage.sp-tint{background:var(--sp-tint)}
#pause-menu .sp-ph{position:absolute;inset:0;display:grid;place-items:center;color:var(--g)}
#pause-menu .sp-ph img{width:100%;height:100%;object-fit:contain;transition:transform var(--ds-m-lang,250ms) var(--ds-m-uit,ease-out);animation:sp-in var(--ds-m-midden,150ms) var(--ds-m-uit,ease-out) both}
#pause-menu .sp-tile:hover .sp-ph img,#pause-menu .sp-tile:focus-visible .sp-ph img{transform:scale(1.07)}
#pause-menu .sp-ph[data-state="laden"]::before,#pause-menu .sp-stage[data-state="laden"]:not([data-still])::before{content:"";position:absolute;inset:18% 22%;border-radius:12px;background:color-mix(in srgb,var(--ink) 9%,transparent)}
#pause-menu .sp-ph svg{width:34px;height:34px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
#pause-menu .sp-tile__t{font-size:15px;line-height:1.2;max-width:100%;overflow-wrap:break-word;hyphens:auto;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.4em}
#pause-menu .sp-tile__s{font-size:13px;line-height:1.2;color:var(--mut);max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#pause-menu .sp-badge{position:absolute;top:5px;right:5px;min-width:26px;height:24px;padding:0 7px;display:inline-grid;place-items:center;border-radius:12px;background:var(--ink);color:var(--ds-zeef-bg,#fff);font-size:14px;font-weight:700;letter-spacing:.02em}
#pause-menu .sp-pip{position:absolute;top:5px;left:5px;max-width:calc(100% - 52px);padding:1px 7px;border-radius:10px;background:var(--ds-zeef-bg,#fff);border:1.5px solid var(--g);color:var(--g);font-size:13px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#pause-menu .sp-pip--ic{padding:1px var(--ds-s-1);display:inline-flex}
#pause-menu .sp-pip--ic svg{width:1em;height:1em}
#pause-menu .sp-soort{position:absolute;left:5px;bottom:5px;max-width:calc(100% - 10px);padding:0 7px;border-radius:9px;background:color-mix(in srgb,var(--ink) 80%,transparent);color:var(--ds-zeef-bg,#fff);font-size:13px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#pause-menu .pm-spulchips .m-chip .pm-ic{width:1.1em;height:1.1em;margin-right:6px;vertical-align:-0.18em;flex:none}
#pause-menu .sp-leeg{padding:var(--ds-s-4,16px) 8px;max-width:420px;font-size:max(16px,var(--menu-min));color:var(--mut)}
#pause-menu .sp-sort{margin-left:auto}
#pause-menu .sp-weg{display:flex;flex-direction:column;gap:10px;padding:14px 16px;border-radius:12px;border:2px solid var(--redtx);background:color-mix(in srgb,var(--redtx) 8%,transparent);animation:sp-in 160ms ease-out}
#pause-menu .sp-weg p{margin:0;font-size:max(18px,var(--menu-min))}
#pause-menu .sp-weg b{font-weight:700}
#pause-menu .sp-weg .sp-weg-ja{color:var(--redtx);border-color:var(--redtx)}
#pause-menu .sp-acts-weg{display:flex;flex-wrap:wrap;gap:8px}
#pause-menu .sp-dhead{display:flex;align-items:center;gap:18px;min-width:0;animation:sp-in 160ms ease-out}
@keyframes sp-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){#pause-menu .sp-tile,#pause-menu .sp-tile::before,#pause-menu .sp-tile::after,#pause-menu .sp-ph img,#pause-menu .sp-weg,#pause-menu .sp-dhead{transition:none;animation:none}#pause-menu .sp-tile:hover,#pause-menu .sp-tile:hover .sp-ph img{transform:none}}
html.reduce-motion #pause-menu .sp-tile,html.reduce-motion #pause-menu .sp-tile::before,html.reduce-motion #pause-menu .sp-tile::after,html.reduce-motion #pause-menu .sp-ph img{transition:none;animation:none}html.reduce-motion #pause-menu .sp-tile:hover,html.reduce-motion #pause-menu .sp-tile:hover .sp-ph img{transform:none}
#pause-menu .sp-big{width:76px;height:76px;flex:none;display:grid;place-items:center;border-radius:18px;background:color-mix(in srgb,var(--g) 10%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--g) 30%,transparent);color:var(--g)}
#pause-menu .sp-big svg{width:38px;height:38px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
#pause-menu .sp-dmeta{display:flex;flex-direction:column;gap:6px;min-width:0}
#pause-menu .sp-dmeta .td-h2{margin:0;overflow-wrap:break-word;font-size:clamp(26px,2.2vw,34px);line-height:1.1}
#pause-menu .sp-desc{margin:0;max-width:640px;font-size:17px;line-height:1.4;color:var(--ink)}
#pause-menu .sp-eerlijk{margin:0;max-width:640px;font-size:max(18px,var(--menu-min));line-height:1.45;color:var(--mut)}
#pause-menu .sp-facts{display:grid;grid-template-columns:1fr;gap:6px;padding:10px 0 0;border-top:1px solid var(--line)}
#pause-menu .sp-fact{display:flex;flex-direction:row;align-items:baseline;justify-content:space-between;gap:12px;min-width:0}
#pause-menu .sp-fact > span:first-child{flex:none;font-size:max(13px,var(--menu-min));letter-spacing:.04em;text-transform:uppercase;color:var(--mut)}
#pause-menu .sp-fact > span:last-child{font-size:max(16px,var(--menu-min));line-height:1.3;color:var(--ink);text-align:right;overflow-wrap:anywhere}
#pause-menu .sp-ledger{display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:12px;background:color-mix(in srgb, var(--ds-c-glas) 55%, transparent);box-shadow:inset 0 0 0 1px var(--line2)}
#pause-menu .sp-lhead{font-family:var(--ds-font-kop);font-size:20px;letter-spacing:.14em;text-transform:uppercase;color:var(--mut)}
#pause-menu .sp-days{display:flex;align-items:flex-end;gap:6px;height:56px}
#pause-menu .sp-day{flex:1;display:flex;align-items:flex-end;height:100%}
#pause-menu .sp-day i{display:block;width:100%;border-radius:3px 3px 0 0;background:var(--g);opacity:.85}
#pause-menu .sp-day.uit i{background:var(--redtx)}
#pause-menu .sp-lleg{margin:0;font-size:max(14px,var(--menu-min));color:var(--mut)}
#pause-menu .sp-lrows{display:flex;flex-direction:column;gap:6px}
#pause-menu .sp-lrow{display:flex;align-items:baseline;justify-content:space-between;gap:20px;font-size:max(17px,var(--menu-min));line-height:1.35}
#pause-menu .sp-lrow > span:first-child{color:var(--mut);flex:none}
#pause-menu .sp-lv{color:var(--ink);text-align:right;overflow-wrap:anywhere}
#pause-menu .sp-model{display:flex;flex-direction:column;gap:var(--ds-s-2,8px);min-width:0;animation:sp-in 160ms ease-out}
#pause-menu .sp-stage{position:relative;height:clamp(140px,24vh,200px);overflow:hidden;border:var(--ds-lijn-zeef,2px) solid var(--ds-c-ink-inkt,var(--ink));background:var(--ds-zeef-bg,transparent);color:var(--ds-zeef-tx,var(--ink));box-shadow:var(--ds-schaduw-hard-klein,none)}
#pause-menu .sp-stage canvas{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:grab;touch-action:none;transition:opacity 160ms ease-out}
#pause-menu .sp-stage canvas.on{opacity:1}
#pause-menu .sp-stage canvas:active{cursor:grabbing}
#pause-menu .sp-stage canvas:focus-visible{outline:3px solid var(--ds-focus,var(--ink));outline-offset:-5px}
#pause-menu .sp-stage .sp-ic{position:absolute;inset:0;display:grid;place-items:center;color:var(--g);transition:opacity 160ms ease-out;pointer-events:none}
#pause-menu .sp-stage .sp-ic svg{width:72px;height:72px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
#pause-menu .sp-stage .sp-ic{opacity:0}
#pause-menu .sp-stage[data-state="terugval"] .sp-ic{opacity:1}
#pause-menu .sp-stage .sp-still{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;transition:opacity 160ms ease-out}
#pause-menu .sp-stage[data-state="klaar"] .sp-still,#pause-menu .sp-stage[data-state="terugval"] .sp-still{opacity:0}
#pause-menu .sp-stage-voet{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;min-height:32px;font-size:max(14px,var(--menu-min,14px));color:var(--mut)}
#pause-menu .sp-stage-voet .sp-melding{flex:1 1 auto;min-width:0}
#pause-menu .sp-stage-voet [data-spul-reset]{margin-left:auto;min-height:32px;padding:2px 12px;font-size:max(15px,var(--menu-min,15px));letter-spacing:.02em;text-shadow:none}
#pause-menu [data-panel="spullen"] .m-pane > .m-acts.td-acts{position:static;padding:0;margin:0}
#pause-menu .sp-stage-voet [hidden]{display:none}
@media (prefers-reduced-motion:reduce){#pause-menu .sp-model,#pause-menu .sp-stage canvas,#pause-menu .sp-stage .sp-ic{transition:none;animation:none}}
html.reduce-motion #pause-menu .sp-model,html.reduce-motion #pause-menu .sp-stage canvas,html.reduce-motion #pause-menu .sp-stage .sp-ic,html.reduce-motion #pause-menu .sp-stage[data-state="laden"] .sp-ic{transition:none;animation:none}
</style>`;

// Items: { key, cat, icon, title, sub, side, desc, how, perk, rows, act: { label, run }, link, ledger }
// `sub` is wat de kaart links al zegt (stand, aantal, munitie); het detail herhaalt dat nooit.
// `desc` is de korte typering in de toon van het spel, `how` de herkomst, `perk` het effect,
// `rows` de cijfers en `ledger` zet het kasboek van finance.js onder het geld.
function collect(w) {
  const out = [];
  const counts = {};
  const shop = inventoryShopState();
  const hp = hoofdspeler(w);
  const ch = hp && hp.character === 'anita' ? 'anita' : 'tammo';

  out.push({ key: 'geld', cat: 'geld', icon: 'geld', title: euro(Math.max(0, Math.floor(w.money))), sub: 'Contant',
    desc: 'Wat je op zak hebt om uit te geven. Waar het vandaan kwam en waar het heen ging, staat eronder in het kasboek.',
    how: 'Missies, bijbaantjes en verkopen', perk: 'Gepakt worden kost een boete per ster', ledger: true, viewer: moneySpec(w.money) });

  const stock = new Map(WEAPON_STOCK.map((s) => [s.key, s]));
  const guns = Object.keys(WEAPONS).filter((k) => k !== 'fists' && !['throw', 'rocket'].includes(WEAPONS[k].kind));
  const throws = Object.keys(WEAPONS).filter((k) => ['throw', 'rocket'].includes(WEAPONS[k].kind));
  const weaponItem = (k, cat) => {
    const s = stock.get(k) || {};
    const melee = isMeleeWeapon(k);
    const ammo = w.ammo[k] || 0;
    const held = w.weapon === k;
    return {
      key: 'w:' + k, cat, viewer: wapenSpec(k), icon: melee ? 'melee' : cat === 'werp' ? 'werp' : 'wapens', title: s.label || k,
      sub: melee ? 'Slaan · altijd bij de hand' : `${s.unit || 'patronen'}${s.cap ? ` (max ${s.cap})` : ''}`,
      aantal: melee ? 0 : ammo, eenheid: s.unit || 'patronen', leeg: !melee && ammo <= 0,
      side: held ? 'In de hand' : '', desc: s.desc || (melee ? 'Een slagwapen voor dichtbij.' : ''),
      how: s.gun ? `Pang & Zo, ${euro(s.gun)}` : '',
      rows: [['Toets', String(WEAPONS[k].slot)], ...(WEAPONS[k].damage ? [['Schade', String(WEAPONS[k].damage)]] : [])],
      act: held ? { label: 'Wegleggen', run: () => { w.weapon = 'fists'; return `${s.label || k} weggelegd`; } } : { label: 'In de hand nemen', run: () => { w.weapon = k; sfxEvent(w, 'ui_item_equip'); return !melee && ammo <= 0 ? `${s.label || k} in de hand, maar leeg. ${s.unit ? 'Nieuwe voorraad' : 'Munitie'} koop je bij Pang & Zo` : `${s.label || k} in de hand`; } },
    };
  };
  const ownGuns = guns.filter((k) => hasWeapon(w, k));
  counts.wapens = `${ownGuns.length} van ${guns.length}`;
  for (const k of ownGuns) out.push(weaponItem(k, 'wapens'));
  const ownThrows = throws.filter((k) => hasWeapon(w, k));
  counts.werp = `${ownThrows.length} van ${throws.length}`;
  for (const k of ownThrows) out.push(weaponItem(k, 'werp'));

  // Kleding (epic Kleding): losse stukken in je kast en de sets die compleet zijn; aan of uit kan hier, ook onderweg
  const ownPieces = ownedPieces(ch).map((p) => parsePiece(p)).filter(Boolean);
  counts.kleding = `${ownPieces.length} stukken`;
  const worn = wornPieces(ch);
  const storyOn = !!shop.storyOutfit;
  for (const x of ownPieces.sort((a, b) => SLOT_IDS.indexOf(a.item.slot) - SLOT_IDS.indexOf(b.item.slot) || a.id.localeCompare(b.id))) {
    const on = worn[x.item.slot] === x.id;
    const block = on ? takeOffBlock(ch, x.item.slot) : '';
    // alleen het stuk, niet Tammo (eigenaar 22-11): clothingpreview.js bouwt het stuk los, op de vorm die het nodig heeft
    out.push({ key: 'k:' + x.id, cat: 'kleding', viewer: stukSpec(x.id), tint: x.color === 'natuur' ? '' : tintVoor(x.hex), icon: 'kleding',
      title: pieceLabel(x), sub: SLOTS.find((s) => s.id === x.item.slot).label, side: on ? 'Aan' : '',
      desc: x.item.desc, how: x.item.price ? `Kledingwinkel, ${euro(x.item.price)}` : 'Van jezelf',
      perk: storyOn ? 'Het verhaal bepaalt nu wat je aanhebt' : block || (on ? 'Uitdoen kan hier' : 'Aantrekken kan hier'),
      act: storyOn || block ? null : on ? { label: 'Uitdoen', run: () => takeOffClothing(ch, x.item.slot) } : { label: 'Aantrekken', run: () => wearClothing(w, ch, x.id) } });
  }
  for (const set of [...setsFor(ch), ...LOOKS]) {
    if (!ownsAll(ch, set.pieces)) continue;
    const on = wornMatches(ch, set.pieces);
    // een set: de stukken als nette compositie (een raster), geen poppetje
    out.push({ key: 's:' + set.id, cat: 'kleding', viewer: setSpec(set.pieces), icon: 'kleding', title: `Set: ${set.label}`, sub: `${set.pieces.length} stukken`, side: on ? 'Aan' : '',
      desc: set.desc, how: set.price ? `Kledingwinkel, ${euro(set.price)}` : 'Van jezelf',
      perk: set.bonus && set.bonus.stealth ? 'Onopvallend: de politie raakt je sneller kwijt' : 'Alle stukken bij elkaar',
      act: storyOn || on ? null : { label: 'Hele set aantrekken', run: () => { const r = wearSet(ch, set); if (!r.ok) return r.reason; wearClothing(w, ch, set.pieces[0]); return `${set.label} aan`; } } });
  }

  const furn = furnitureOwned();
  counts.thuis = `${furn.length} van ${FURNITURE_TOTAL}`;
  for (const f of furn) {
    out.push({ key: 'f:' + f.id, cat: 'thuis', viewer: meubelSpec(f.id), icon: 'thuis', title: f.label,
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
    out.push({ key: 'e:' + e.id, cat: 'eten', viewer: etenSpec(e.id), icon: e.id.startsWith('vis:') ? 'vis' : 'eten', title: e.label, sub: e.how, aantal: e.aantal, weg: { id: e.id, aantal: e.aantal },
      desc: e.how === 'Zelf gevangen' ? 'Zelf gevangen aan de waterkant. Opeten kan overal, ook hier in het menu.'
        : etenWerkwoord(e.id) === 'Gebruiken' ? `Meegenomen van de ${e.how.toLowerCase()}. Gebruiken kan overal, ook hier in het menu.`
          : `Meegenomen van de ${e.how.toLowerCase()}. Opeten kan overal, ook hier in het menu.`,
      rows: [['Per stuk', `+${e.hp} gezondheid`], ['Jij nu', `${Math.round(w.health)} van 100`]],
      act: { label: etenWerkwoord(e.id), run: () => { const voor = Number(w.eten && w.eten[e.id]) || 0; const r = eet(w, e.id); if ((Number(w.eten && w.eten[e.id]) || 0) < voor) sfxEvent(w, e.id === 'ehbo' ? 'shop_bag_rustle' : 'snack_wrap'); return r; } } });
  }

  const nogStempels = Math.max(0, shop.stampCard - shop.stamps);
  out.push({ key: 'k:stempels', cat: 'kaart', viewer: cardSpec('stempels'), icon: 'kaart', title: 'Spaarkaart Krant & Kauwgom', sub: `${shop.stamps} van ${shop.stampCard} stempels`,
    desc: 'Elke aankoop bij Krant & Kauwgom levert een stempel. Vol is inleveren voor iets leuks.',
    how: 'Krant & Kauwgom', rows: [['Stand', nogStempels ? `nog ${nogStempels} ${nogStempels === 1 ? 'stempel' : 'stempels'}` : 'vol, inleveren maar']] });
  const eieren = getSaveSet('eierballen').size;
  out.push({ key: 'k:eieren', cat: 'kaart', viewer: cardSpec('eieren'), icon: 'kaart', title: 'Eierballen', sub: `${eieren} van ${EIERBAL_TOTAL} gevonden`,
    desc: 'Verstopt bij de bezienswaardigheden van de provincie. Zoeken maar.',
    link: ['todo', 'Naar Te doen'] });
  const geheimen = getSaveSet('geheimen').size;
  out.push({ key: 'k:geheim', cat: 'kaart', viewer: cardSpec('geheim'), icon: 'kaart', title: 'Geheimpjes', sub: `${geheimen} van ${SECRETS_TOTAL} gevonden`,
    desc: 'Kleine geheimpjes, hier en daar verstopt. We verklappen niks.',
    link: ['todo', 'Naar Te doen'] });

  const ups = [];
  const label = (list, id) => (list.find((u) => u.id === id) || {});
  for (const id of shop.heroUpgrades) { const u = label(CAR_UPGRADES, id); ups.push({ key: 'u:hero:' + id, viewer: upgradeSpec('auto', id), title: u.label || id, sub: 'Fjord Escapade', desc: u.desc, how: u.price ? `Knal & Kolder, ${euro(u.price)}` : '' }); }
  for (const v of shop.vehicles) {
    for (const id of v.upgrades) { const u = label(v.kind === 'bike' ? BIKE_UPGRADES : v.kind === 'scooter' ? [...BIKE_UPGRADES, ...MOTO_UPGRADES] : CAR_UPGRADES, id); ups.push({ key: `u:${v.key}:${id}`, viewer: upgradeSpec(v.kind === 'bike' || v.kind === 'scooter' ? 'tweewieler' : 'auto', id), title: u.label || id, sub: v.label, desc: u.desc, how: u.price ? euro(u.price) : '' }); }
  }
  for (const u of fjordUpgradeOffers(w)) if (u.owned) ups.push({ key: 'u:fjord:' + u.id, viewer: upgradeSpec('fjord', u.id), title: u.name, sub: 'snackwagen', desc: u.blurb, how: euro(u.price) });
  for (const u of ups) out.push({ ...u, cat: 'upgrade', icon: 'upgrade', link: u.sub === 'snackwagen' ? null : ['garage', 'Naar Garage'] });
  counts.upgrade = `${ups.length} van ${upgradeTotaal(shop, fjordUpgradeOffers(w))}`;
  return { items: out, counts };
}

function homeRoute(what) {
  const h = getHomeForRender()[0];
  if (!h) return 'Geen huis gevonden';
  setUserWaypoint(h.x, h.y, 'Thuis');
  return `Route naar huis (${what})`;
}

// Een tegel van de galerij (spullen-ui 21-11): een 3D-plaatje van het ding (geen icoon: dat staat er alleen als het model ontbreekt of WebGL
// faalt), met links boven de toestand (In de hand, Aan), rechts boven het aantal en onderaan de soort (alleen op het tabblad Alles).
// Het plaatje komt lui binnen (spullenthumbs.js); tot dan staat een neutraal, stilstaand vak. De naam voor een schermlezer bevat het
// aantal en de toestand (tegelNaam), want de badges zelf zijn alleen voor het oog.
const catLabel = (it) => (CATS.find(([id]) => id === catVan(it)) || [, ''])[1];
function tegel(it, i) {
  const badge = badgeTekst(it);
  const soort = deel === 'alles' && it.cat !== 'geld' ? catLabel(it) : '';
  const ph = it.viewer ? '<span class="sp-ph" data-state="laden"></span>' : `<span class="sp-ph" data-state="icoon">${svg(it)}</span>`;
  return `<button type="button" class="sp-tile" data-spul="${esc(it.key)}" data-i="${i}" data-cat="${catVan(it)}" aria-label="${esc(tegelNaam(it))}" title="${esc(it.title)}"${sel === it.key ? ' aria-current="true"' : ''}>` +
    `<span class="sp-pw${it.tint ? ' sp-tint' : ''}"${it.tint ? ` style="--sp-tint:${it.tint}"` : ''}>${ph}${it.side ? (it.side === 'Aan' ? `<span class="sp-pip sp-pip--ic" title="Aan">${icoon('vinkje')}</span>` : `<span class="sp-pip">${esc(it.side)}</span>`) : ''}${badge ? `<span class="sp-badge" aria-hidden="true">${badge}</span>` : ''}${soort ? `<span class="sp-soort" aria-hidden="true">${esc(soort)}</span>` : ''}</span>` +
    `<span class="sp-tile__t">${esc(it.title)}</span><span class="sp-tile__s">${esc(it.sub || '')}</span></button>`;
}

// De maten van de galerij: het detail hooguit 30% van de breedte, de rest voor de tegels (spullenraster.rasterMaat). Gemeten aan het
// gebied met raster en detail (dus na de ui-schaal); staat het paneel verborgen, dan blijven de standaardmaten staan.
let thumbs = null;
let thumbPaneel = null;
let thumbItems = [];
const STANDAARD_MAAT = { thumbW: 192, thumbH: 144 };
function meetMaat() {
  const p = thumbPaneel;
  const main = p && p.querySelector ? p.querySelector('.m-main') : null;
  let breedte = main && main.clientWidth ? main.clientWidth : 0;
  if (breedte && typeof getComputedStyle === 'function') { const cs = getComputedStyle(main); breedte -= (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0); }
  if (!breedte) return STANDAARD_MAAT;
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
  const m = rasterMaat({ breedte, dpr });
  if (!m.smal && p.style && p.style.setProperty) {
    p.style.setProperty('--sp-detail', m.detailB + 'px');
    p.style.setProperty('--sp-min', (breedte < 1100 ? TEGEL_MIN.krap : TEGEL_MIN.ruim) + 'px');
  }
  return m;
}

function stopThumbs(geef) {
  if (thumbs) { thumbs.dispose(geef); thumbs = null; }
  if (geef) releaseSnapshots('spullen');
}

function startThumbs(panel, lijst, zichtbaar) {
  stopThumbs(false);
  thumbPaneel = panel;
  thumbItems = zichtbaar;
  if (!lijst || !lijst.addEventListener || !zichtbaar.length) return;
  thumbs = createThumbs(lijst, {
    items: zichtbaar,
    maat: meetMaat,
    gekozen: () => zichtbaar.findIndex((it) => it.key === sel),
    render: renderSnapshot, release: releaseSnapshots, cancel: cancelSnapshots,
    icoon: (it) => svg(it),
  });
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

// --- het 3D-model in het detail (#1086) ---------------------------------------------------------------------------------------
// Eén gedeelde renderer (vehiclepreview.js): het detail heeft één <canvas> en een bijbehorende createSharedPreview, nooit een eigen
// WebGL-context. De stage blijft staan als alleen de tekst eromheen verandert (melding, weggooivraag), zodat het model niet
// opnieuw begint. Tab weg of menu dicht: disposeSpullenViewer(). Buiten beeld (scrollen, ander tabblad): de tekenlus pauzeert.
const TURN_STEP = 0.35;
let viewer = null;
let viewerKey = '';
let viewerObs = null;
const stageKey = (it) => (it && it.viewer ? JSON.stringify(it.viewer) : '');

function stageHtml(it) {
  const label = esc(modelLabel(it.title));
  return `<div class="sp-model"><div class="sp-stage${it.tint ? ' sp-tint' : ''}"${it.tint ? ` style="--sp-tint:${it.tint}"` : ''} data-spul-stage data-key="${esc(stageKey(it))}" data-state="laden">` +
    `<span class="sp-ic" aria-hidden="true">${svg(it)}</span><img class="sp-still" alt="" draggable="false" hidden>` +
    `<canvas tabindex="0" role="img" aria-label="${label}: sleep of gebruik de pijltjestoetsen om te draaien"></canvas></div>` +
    `<div class="sp-stage-voet"><span class="sp-melding" data-spul-hint>Sleep of gebruik ${glyphHtml('ARROWLEFT')}${glyphHtml('ARROWRIGHT')} om te draaien</span>` +
    `<button type="button" class="ds-z-knop ds-z-knop--ghost" data-spul-reset aria-label="Model terugzetten naar de voorkant">Terugzetten</button></div></div>`;
}

let viewerTimer = 0;
function stopViewer() {
  clearTimeout(viewerTimer);
  if (viewerObs) { viewerObs.disconnect(); viewerObs = null; }
  if (viewer) { viewer.dispose(); viewer = null; }
  viewerKey = '';
}

// Zet het detailpaneel neer en koppelt het model. Dezelfde stage (zelfde model) blijft staan; een ander model krijgt een nieuwe
// preview op het nieuwe canvas (de gedeelde renderer blijft). Valt WebGL weg of is er geen model, dan blijft het icoon staan.
function zetDetail(panel, traag = false) {
  const detail = panel.querySelector('.td-detail');
  const it = byKey.get(sel);
  const nieuwKey = stageKey(it);
  const oud = viewer && viewerKey === nieuwKey ? detail.querySelector('[data-spul-stage]') : null;
  const oudModel = oud ? oud.closest('.sp-model') : null;
  if (oudModel) oudModel.remove(); // uit het oude detail halen voor de innerHTML (blijft als node bestaan)
  detail.innerHTML = detailHtml();
  if (oudModel) {
    const vers = detail.querySelector('.sp-model');
    if (vers) {
      const lbl = vers.querySelector('canvas').getAttribute('aria-label'); // andere naam, hetzelfde model
      oudModel.querySelector('canvas').setAttribute('aria-label', lbl);
      vers.replaceWith(oudModel);
    }
    return;
  }
  stopViewer();
  const stage = detail.querySelector('[data-spul-stage]');
  if (!stage || !it || !it.viewer) return;
  const still = stage.querySelector('.sp-still');
  const url = thumbs ? thumbs.url(it.viewer) : '';
  if (still && url) { still.src = url; still.hidden = false; stage.dataset.still = '1'; }
  // een toets die snel door het raster loopt bouwt niet bij elke tegel een model: het beeld volgt als de focus even rust (90 ms)
  if (traag) viewerTimer = setTimeout(() => { if (stage.isConnected) koppelModel(panel, detail, stage, it, nieuwKey); }, 90);
  else koppelModel(panel, detail, stage, it, nieuwKey);
}

function koppelModel(panel, detail, stage, it, nieuwKey) {
  const c = stage.querySelector('canvas');
  let zichtbaar = true;
  const preview = createSharedPreview(c, {
    interactive: true,
    speed: reducedMotion() ? 0 : 0.35,
    zoom: 1.05,
    angle: 0.6,
    active: () => c.isConnected && c.offsetParent !== null && zichtbaar,
    onFirstFrame: () => { stage.dataset.state = 'klaar'; },
  });
  viewer = preview;
  viewerKey = nieuwKey;
  preview.show(it.viewer);
  if (!c.classList.contains('on')) {
    // geen model of geen WebGL: het icoon blijft, met één eerlijke zin
    stage.dataset.state = 'terugval';
    const hint = detail.querySelector('[data-spul-hint]');
    if (hint) hint.textContent = '3D is hier niet beschikbaar; het icoon blijft staan.';
    const reset = detail.querySelector('[data-spul-reset]');
    if (reset) reset.hidden = true;
    return;
  }
  // pauzeren buiten beeld: scrollt het model uit het paneel, dan stopt de lus tot hij weer zichtbaar is
  if (typeof IntersectionObserver === 'function') {
    viewerObs = new IntersectionObserver((es) => { for (const e of es) { zichtbaar = e.isIntersecting; if (zichtbaar) preview.wake(); } });
    viewerObs.observe(c);
  }
}

// Het model loslaten: tab gewisseld of menu gesloten (pausemenu.js).
export function disposeSpullenViewer() { stopViewer(); stopThumbs(true); }

// Draaien met de pijltjes of de D-pad (net als de draaitafel van de Garage); true als er een model draait.
export function turnSpullenViewer(dir) {
  if (!viewer || !dir) return false;
  viewer.turn(dir * TURN_STEP);
  return true;
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
  else if (it.leeg) facts.unshift(['Bij je', `geen ${it.eenheid || 'patronen'} meer`]);
  const factHtml = facts.length
    ? `<div class="sp-facts">${facts.map(([k, v]) => `<div class="sp-fact"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('')}</div>`
    : '';
  const ledger = it.ledger ? moneyLedgerHtml() : '';
  const cat = (SECTIONS.find(([c]) => c === it.cat) || [, ''])[1];
  const kop = it.cat === 'geld' ? 'Geld' : it.title;
  return (it.viewer ? stageHtml(it) : '') + `<div class="sp-dhead">${it.viewer ? '' : `<span class="sp-big">${svg(it)}</span>`}<div class="sp-dmeta">` +
    `${cat && cat !== kop ? `<span class="m-eb sp-detail-cat">${esc(cat)}</span>` : ''}<h2 class="m-h2 td-h2">${esc(kop)}</h2></div></div>` +
    `${it.desc ? `<p class="sp-desc">${esc(it.desc)}</p>` : ''}` +
    // de acties staan direct onder de omschrijving (compact detail: nooit onder een scrollrand), de cijfers en het kasboek daarna
    `${note ? `<p class="m-note" data-spul-melding role="status">${esc(note)}</p>` : ''}${actiesHtml(it)}` +
    (ledger || factHtml ? (ledger || '') + factHtml : (!it.desc ? '<p class="sp-eerlijk">Verder valt hier niets over te zeggen.</p>' : ''));
}

// Het <style>-blok staat één keer boven de lijst. De lijst wordt bij elke tekening
// opnieuw gevuld, dus er staat nooit een tweede kopie in het paneel; het detailpaneel
// wordt los hertekend (spullenFocus) en houdt de stijl zo gewoon.
// Draws the section into panel (pausemenu.js); returns the sheet subtitle.
// QoL (#985): hoeveel upgrades er te halen zijn voor wat je hebt: de Escapade, elk gekocht voertuig (naar zijn
// soort) en de snackwagen. Zo staat de teller als "3 van 8" en krijgt de categorie zijn voortgangsbalk.
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
  // een ding dat net op is (het laatste stuk gegeten) laat de keuze naar de buurtegel gaan in plaats van naar de eerste tegel van de lijst
  const zichtbaarKeys = new Set(zichtbaar.map((it) => it.key));
  if (sel && !byKey.has(sel) && laatsteVolgorde.includes(sel)) {
    const buur = naWeggooien(laatsteVolgorde.filter((k) => k === sel || zichtbaarKeys.has(k)), sel);
    if (buur && zichtbaarKeys.has(buur)) sel = buur;
  }
  // (stond: zichtbaarSet.has(sel) op een Set van objecten, dus altijd onwaar: elke tekening zette de keuze terug op de eerste tegel)
  if (!sel || !zichtbaarKeys.has(sel)) sel = zichtbaar[0] ? zichtbaar[0].key : null;
  laatsteVolgorde = zichtbaar.map((it) => it.key);
  if (weggooiVraag && (weggooiVraag.key !== sel || !kanWeggooien(byKey.get(sel)))) weggooiVraag = null;
  const list = panel.querySelector('.td-list');
  const zoekt = zoek.trim();
  const raster = zichtbaar.length
    ? `<div class="sp-raster" role="group" aria-label="Je spullen">${zichtbaar.map((it, i) => tegel(it, i)).join('')}</div>`
    : `<div class="ds-leeg sp-leeg" data-spul-leeg><p>${zoekt ? `Niks gevonden voor "${esc(zoekt)}". ${deel === 'alles' ? 'Probeer een ander woord.' : 'Kies Alles om overal te zoeken.'}` : esc(LEEG[deel] || LEEG.alles)}</p></div>`;
  // De stijl hoort bij de lijst, die elke tekening opnieuw wordt gevuld: zo staat hij er precies één keer en niet in het detail.
  list.innerHTML = SP_CSS + raster;
  // de knoppen boven de lijst tonen de stand (#435)
  for (const b of panel.querySelectorAll('[data-spul-deel]')) b.setAttribute('aria-pressed', String(b.dataset.spulDeel === deel));
  const sortKnop = panel.querySelector('[data-spul-sort]');
  if (sortKnop) { const t = sortKnop.querySelector('span'); if (t) t.textContent = 'Sorteren: ' + sortLabel(sortering).toLowerCase(); }
  const zoekveld = panel.querySelector('[data-spul-search]');
  if (zoekveld && zoekveld.value !== zoek) zoekveld.value = zoek;
  startThumbs(panel, list, zichtbaar);
  zetDetail(panel);
  const owned = items.filter((it) => it.cat !== 'geld' && it.cat !== 'kaart').length;
  const kop = zichtbaar.length === items.length ? '' : `${zichtbaar.length} van ${items.length} · `;
  // de kop van Bezit (24-11): de aantallen staan in waardeplaatjes boven de lijst, niet meer in de eyebrow
  const plaatjes = kopRij(plaatHtml('tas', String(owned), 'dingen') + plaatHtml('geld', euro(Math.max(0, Math.floor(w.money))), 'contant'));
  const huidig = panel.querySelector(':scope > .bz-kop');
  if (huidig) huidig.outerHTML = plaatjes; else if (panel.insertAdjacentHTML) panel.insertAdjacentHTML('afterbegin', plaatjes);
  return kop ? kop.replace(/ · $/, '') : '';
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
  for (const b of panel.querySelectorAll('[data-spul]')) { if (b.dataset.spul === sel) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); } // niet toggleAttribute: dat zet aria-current="" en dat is geen waarde
  zetDetail(panel, true);
}

// Pijltjes, Home, End en PageUp/PageDown door de galerij (pausemenu.js roept dit aan voor een tegel met focus). true als de focus
// verplaatst is; false als er in die richting niets meer is, dan neemt het menu de toets over (omhoog naar het zoekveld, links naar
// de rail, rechts naar het detail).
export function spullenNavigeer(panel, el, toets) {
  const huidig = el && el.closest ? el.closest('.sp-tile') : null;
  if (!panel || !huidig) return false;
  const tegels = [...panel.querySelectorAll('.sp-tile')];
  const i = tegels.indexOf(huidig);
  if (i < 0) return false;
  const n = focusStep(i, tegels.length, kolommenUitTops(tegels.map((t) => t.offsetTop)), toets);
  if (n === null || !tegels[n]) return false;
  tegels[n].focus();
  return true;
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
    zetDetail(panel);
    const terug = panel.querySelector('[data-spul-weg]');
    if (terug && terug.focus) terug.focus({ preventScroll: true });
  }
  return true;
}

export function spullenClick(e, w, panel, a) {
  const chip = e.target.closest('[data-spul-deel]');
  if (chip) { zetSpullenDeel(chip.dataset.spulDeel); weggooiVraag = null; a.rerender(); return true; }
  if (e.target.closest('[data-spul-sort]')) { sortering = cycleSort(sortering); a.rerender(); return true; }
  if (e.target.closest('[data-spul-reset]')) { if (viewer) viewer.reset(); return true; }
  const weg = e.target.closest('[data-spul-weg]');
  if (weg) {
    weggooiVraag = weggooiStap(null, 'vraag', weg.dataset.spulWeg, !!weg.dataset.alles).state;
    zetDetail(panel);
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
