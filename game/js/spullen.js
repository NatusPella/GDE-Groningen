// Spullen (the pause menu's inventory): everything you have, read from the
// systems that own it. Per category the things you own, with what they do
// and where they came from, and a count of how many there are ("3 van 8"),
// never what the rest is. Choosing a weapon takes it in hand; furniture
// puts home on the GPS. Vehicles stay in Garage, clues and people in Verhaal.
import { WEAPONS, hasWeapon, isMeleeWeapon } from './combat.js';
import { WEAPON_STOCK, OUTFITS, CAR_UPGRADES, BIKE_UPGRADES, MOTO_UPGRADES, inventoryShopState } from './shops.js';
import { furnitureOwned, FURNITURE_TOTAL } from './furniture.js';
import { fjordUpgradeOffers } from './pg_foodtruck.js';
import { getHomeForRender } from './home.js';
import { setUserWaypoint } from './routing.js';
import { getStoryJournal } from './story.js';
import { getSaveSet, EIERBAL_TOTAL } from './achievements.js';
import { SECRETS_TOTAL } from './geheimen.js';
import { getLedger, summary } from './finance.js';

const ICON = {
  geld: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
  wapens: '<path d="M3 9h13l2 2h3v3h-6l-1.5 1.5V19h-3v-4l-1-1H3z"/>',
  melee: '<path d="M5 19l9-9M14 10l2-6 4 4-6 2M4 20l2-2"/>',
  werp: '<path d="M8 8h8l1 12H7zM9 8V5h6v3M12 5V3"/>',
  kleding: '<path d="M8 3l4 2 4-2 5 4-3 3-2-1v12H8V9l-2 1-3-3z"/>',
  thuis: '<path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6"/>',
  kaart: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 14h4"/>',
  upgrade: '<path d="M12 4l6 7h-4v8h-4v-8H6z"/>',
};
const SECTIONS = [
  ['geld', 'Geld'],
  ['wapens', 'Wapens'],
  ['werp', 'Werpspul'],
  ['kleding', 'Kleding'],
  ['thuis', 'Thuis'],
  ['kaart', 'Kaarten & verzamelingen'],
  ['upgrade', 'Upgrades'],
];

// Wat er staat als een categorie nog leeg is: waar je het vindt (#435)
const EMPTY = {
  werp: 'Nog niets om te gooien. Pang & Zo verkoopt het.',
  thuis: 'Nog geen meubels. EIKEA heeft ze; thuis zet je ze neer.',
  upgrade: 'Nog geen upgrades. Knal & Kolder Tuning en Spaak & Band helpen je graag.',
};
// Categorieen die ook leeg zichtbaar blijven, zodat je weet dat ze bestaan
const ALWAYS = new Set(['werp', 'thuis', 'upgrade']);

// De delen van het scherm (#435): met een druk op de knop zie je alleen wat je
// bij je hebt, wat thuis staat of wat je verzamelt.
export const DELEN = [['alles', 'Alles'], ['uitrusting', 'Uitrusting'], ['thuis', 'Thuis'], ['verzameling', 'Verzamelingen']];
// geld hoort bij geen enkel deel: je ziet het bij Alles bovenaan, en in de
// andere delen gaat het over spullen (#435)
const DEEL_VAN = { geld: 'geld', wapens: 'uitrusting', werp: 'uitrusting', kleding: 'uitrusting', upgrade: 'uitrusting', thuis: 'thuis', kaart: 'verzameling' };

// Wat er in een kaartje staat, als één lap tekst om in te zoeken
const zoektekst = (it) => [it.title, it.sub, it.how, it.perk, (SECTIONS.find(([c]) => c === it.cat) || [, ''])[1]].join(' ').toLowerCase();

// Zoeken en filteren (#435): alle woorden moeten ergens in het kaartje staan,
// en het kaartje moet in het gekozen deel vallen. Puur, zodat spullen_test het
// kan natrekken.
export function zoekSpullen(items, query = '', deel = 'alles') {
  const words = String(query).toLowerCase().trim().split(/\s+/).filter(Boolean);
  return items.filter((it) => {
    if (deel !== 'alles' && DEEL_VAN[it.cat] !== deel) return false;
    if (!words.length) return true;
    const tekst = zoektekst(it);
    return words.every((w) => tekst.includes(w));
  });
}

let sel = null;
let byKey = new Map();
let zoek = '';
let deel = 'alles';
let laatsteWereld = null;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const euro = (v) => '€' + Math.round(v).toLocaleString('nl-NL');
const svg = (id) => `<svg class="pm-ic" viewBox="0 0 24 24" aria-hidden="true">${ICON[id] || ICON.kaart}</svg>`;

// Inkomsten en uitgaven (finance.js, #206): vandaag, deze week, totaal en de grootste posten.
function financeRows() {
  const s = summary(getLedger());
  if (!s.inTotal && !s.outTotal) return [['Kasboek', 'Nog leeg. Verdien of geef iets uit']];
  const post = (list) => list.map(([k, v]) => `${k} ${euro(v)}`).join(', ');
  return [
    ['Vandaag', `+${euro(s.todayIn)} / -${euro(s.todayOut)}`],
    ['Deze week', `+${euro(s.weekIn)} / -${euro(s.weekOut)}`],
    ['Totaal verdiend', euro(s.inTotal)],
    ['Totaal uitgegeven', euro(s.outTotal)],
    ...(s.topIn.length ? [['Meeste inkomsten', post(s.topIn)]] : []),
    ...(s.topOut.length ? [['Meeste uitgaven', post(s.topOut)]] : []),
  ];
}

// Items: { key, cat, icon, title, sub, side, how, perk, rows, act: { label, run } }
function collect(w) {
  const out = [];
  const counts = {};
  const shop = inventoryShopState();
  const ch = w.player.character === 'anita' ? 'anita' : 'tammo';

  out.push({ key: 'geld', cat: 'geld', icon: 'geld', title: euro(Math.max(0, Math.floor(w.money))), sub: 'Contant, in je zak', how: 'Verdiend met klussen, missies en bijbaantjes', perk: 'Gepakt worden kost een boete per ster', rows: financeRows() });

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
      sub: melee ? 'Slaan · altijd bij de hand' : `${ammo} ${s.unit || 'patronen'}${s.cap ? ` (max ${s.cap})` : ''}`,
      side: held ? 'In de hand' : '', how: s.gun ? `Pang & Zo, ${euro(s.gun)}` : '', perk: s.desc || '',
      rows: [['Toets', String(WEAPONS[k].slot)], ...(WEAPONS[k].damage ? [['Schade', String(WEAPONS[k].damage)]] : [])],
      act: held ? null : { label: 'In de hand nemen', run: () => { w.weapon = k; return `${s.label || k} in de hand`; } },
    };
  };
  const ownGuns = guns.filter((k) => hasWeapon(w, k));
  counts.wapens = `${ownGuns.length} van ${guns.length}`;
  out.push({ key: 'w:fists', cat: 'wapens', icon: 'melee', title: 'Vuisten', sub: 'Altijd bij je', side: w.weapon === 'fists' ? 'In de hand' : '', how: 'Van jezelf', perk: 'Slaan, toets 1', act: w.weapon === 'fists' ? null : { label: 'In de hand nemen', run: () => { w.weapon = 'fists'; return 'Vuisten'; } } });
  for (const k of ownGuns) out.push(weaponItem(k, 'wapens'));
  const ownThrows = throws.filter((k) => hasWeapon(w, k));
  counts.werp = `${ownThrows.length} van ${throws.length}`;
  for (const k of ownThrows) out.push(weaponItem(k, 'werp'));

  const outfits = OUTFITS[ch] || [];
  const ownOutfits = outfits.filter((o) => shop.ownedOutfits.includes(`${ch}:${o.id}`));
  counts.kleding = `${ownOutfits.length} van ${outfits.length}`;
  for (const o of ownOutfits) {
    const wearing = (shop.storyOutfit || shop.outfit[ch]) === o.id;
    out.push({ key: 'o:' + o.id, cat: 'kleding', icon: 'kleding', title: o.label, sub: o.desc, side: wearing ? 'Aan' : '',
      how: o.price && o.id !== 'stadjer' && o.id !== 'classic' ? `Stoer & Stads, ${euro(o.price)}` : 'Van jezelf',
      perk: o.stealth ? 'Onopvallend: de politie raakt je sneller kwijt' : 'Omkleden kan thuis bij de kast',
      act: !wearing && getHomeForRender().length ? { label: 'Route naar de kast thuis', run: () => homeRoute('Kledingkast') } : null });
  }

  const furn = furnitureOwned();
  counts.thuis = `${furn.length} van ${FURNITURE_TOTAL}`;
  for (const f of furn) {
    out.push({ key: 'f:' + f.id, cat: 'thuis', icon: 'thuis', title: f.label, sub: f.ready ? f.perk : f.pending ? 'Wordt nog bezorgd' : 'Nog in elkaar zetten, thuis',
      how: `EIKEA, ${euro(f.price)}`, perk: f.perk, rows: f.stat ? [[f.stat[0], f.stat[1]]] : [],
      act: getHomeForRender().length ? { label: 'Route naar huis', run: () => homeRoute(f.short || f.label) } : null });
  }

  out.push({ key: 'k:stempels', cat: 'kaart', icon: 'kaart', title: 'Spaarkaart Krant & Kauwgom', sub: `${shop.stamps} van ${shop.stampCard} stempels`, how: 'Een stempel per aankoop bij Krant & Kauwgom', perk: 'Volle kaart: inleveren bij Krant & Kauwgom' });
  let jr = null;
  try { jr = getStoryJournal(); } catch (e) { /* story not ready */ }
  if (jr) out.push({ key: 'k:aanwijzingen', cat: 'kaart', icon: 'kaart', title: 'Aanwijzingen', sub: `${jr.found.length} van ${jr.total} gevonden`, how: 'Verhaal', perk: 'Alles wat je weet staat in Verhaal', link: ['verhaal', 'Naar Verhaal'] });
  out.push({ key: 'k:eieren', cat: 'kaart', icon: 'kaart', title: 'Eierballen', sub: `${getSaveSet('eierballen').size} van ${EIERBAL_TOTAL} gevonden`, how: 'Gevonden', perk: 'Verstopt bij de bezienswaardigheden', link: ['todo', 'Naar Te doen'] });
  out.push({ key: 'k:geheim', cat: 'kaart', icon: 'kaart', title: 'Geheimpjes', sub: `${getSaveSet('geheimen').size} van ${SECRETS_TOTAL} gevonden`, how: 'Gevonden', perk: 'We verklappen niks', link: ['todo', 'Naar Te doen'] });

  const ups = [];
  const label = (list, id) => (list.find((u) => u.id === id) || {});
  for (const id of shop.heroUpgrades) { const u = label(CAR_UPGRADES, id); ups.push({ key: 'u:hero:' + id, title: u.label || id, sub: 'Fjord Escapade', perk: u.desc, how: u.price ? `Knal & Kolder, ${euro(u.price)}` : '' }); }
  for (const v of shop.vehicles) {
    for (const id of v.upgrades) { const u = label(v.kind === 'bike' ? BIKE_UPGRADES : v.kind === 'scooter' ? [...BIKE_UPGRADES, ...MOTO_UPGRADES] : CAR_UPGRADES, id); ups.push({ key: `u:${v.key}:${id}`, title: u.label || id, sub: v.label, perk: u.desc, how: u.price ? euro(u.price) : '' }); }
  }
  for (const u of fjordUpgradeOffers(w)) if (u.owned) ups.push({ key: 'u:fjord:' + u.id, title: u.name, sub: 'Fjord Frituur', perk: u.blurb, how: euro(u.price) });
  for (const u of ups) out.push({ ...u, cat: 'upgrade', icon: 'upgrade', link: u.sub === 'Fjord Frituur' ? null : ['garage', 'Naar Garage'] });
  counts.upgrade = `${ups.length}`;
  return { items: out, counts };
}

function homeRoute(what) {
  const h = getHomeForRender()[0];
  if (!h) return 'Geen huis gevonden';
  setUserWaypoint(h.x, h.y, 'Thuis');
  return `Route naar huis (${what})`;
}

function card(it) {
  return `<button type="button" class="m-li" data-spul="${esc(it.key)}"${sel === it.key ? ' aria-current="true"' : ''}>` +
    `${svg(it.icon)}<span class="nm"><span class="one">${esc(it.title)}</span><span class="mut one">${esc(it.sub || '')}</span></span>` +
    `${it.side ? `<span class="t g">${esc(it.side)}</span>` : ''}</button>`;
}

function detailHtml() {
  const it = byKey.get(sel);
  if (!it) return '<p class="mut">Kies iets om te zien wat het doet, of wat je ermee kunt.</p>';
  const rows = [['Hoe', it.how], ['Doet', it.perk], ...(it.rows || [])].filter(([, v]) => v).map(([k, v]) => `<div class="m-fact"><span>${esc(k)}</span><span class="td-fv">${esc(v)}</span></div>`).join('');
  let btns = '';
  if (it.act) btns += `<button type="button" class="m-bp" data-spul-act="${esc(it.key)}">${esc(it.act.label)}</button>`;
  if (it.link) btns += `<button type="button" class="${it.act ? 'm-bg' : 'm-bp'}" data-goto="${it.link[0]}">${esc(it.link[1])}</button>`;
  return `<div class="pm-pane-top"><span class="m-eb sp-gh">${svg(it.icon)}${esc((SECTIONS.find(([c]) => c === it.cat) || [, ''])[1])}</span><h2 class="m-h2 td-h2">${esc(it.title)}</h2></div>` +
    `${it.sub ? `<p>${esc(it.sub)}</p>` : ''}${rows ? `<div class="m-facts td-stack">${rows}</div>` : ''}<span class="m-grow"></span>${btns ? `<div class="m-acts td-acts">${btns}</div>` : ''}`;
}

// Draws the section into panel (pausemenu.js); returns the sheet subtitle.
export function renderSpullen(panel, w) {
  laatsteWereld = w;
  const { items, counts } = collect(w);
  byKey = new Map(items.map((it) => [it.key, it]));
  const zichtbaar = zoekSpullen(items, zoek, deel);
  const zichtbaarSet = new Set(zichtbaar);
  if (!sel || !zichtbaarSet.has(sel)) sel = zichtbaar[0] ? zichtbaar[0].key : null;
  const list = panel.querySelector('.td-list');
  const leeg = zoek.trim() || deel !== 'alles';
  const secties = SECTIONS.map(([cat, label]) => {
    const mine = zichtbaar.filter((it) => it.cat === cat);
    if (!mine.length && !(ALWAYS.has(cat) && !leeg)) return '';
    const kop = `<div class="m-gh"><span class="sp-gh">${svg(cat)}${label}</span>${counts[cat] ? `<span>${esc(counts[cat])}</span>` : ''}</div>`;
    return kop + (mine.length ? mine.map(card).join('') : `<p class="mut sp-leeg">${esc(EMPTY[cat] || '')}</p>`);
  }).join('');
  list.innerHTML = secties || `<p class="m-note sp-leeg" data-spul-leeg>Niks gevonden${zoek.trim() ? ` voor "${esc(zoek.trim())}"` : ''}. ${deel === 'alles' ? 'Probeer een ander woord.' : 'Kies Alles om alles te zien.'}</p>`;
  // de knoppen boven de lijst tonen de stand (#435)
  for (const b of panel.querySelectorAll('[data-spul-deel]')) b.setAttribute('aria-pressed', String(b.dataset.spulDeel === deel));
  const zoekveld = panel.querySelector('[data-spul-search]');
  if (zoekveld && zoekveld.value !== zoek) zoekveld.value = zoek;
  panel.querySelector('.td-detail').innerHTML = detailHtml();
  const owned = items.filter((it) => it.cat !== 'geld' && it.cat !== 'kaart').length;
  const kop = zichtbaar.length === items.length ? '' : `${zichtbaar.length} van ${items.length} · `;
  return `${kop}${owned} dingen in bezit · ${euro(Math.max(0, Math.floor(w.money)))} contant`;
}

// De zoekopdracht en het gekozen deel komen uit het paneel (pausemenu.js) en
// blijven staan als je het scherm even verlaat.
export function zetSpullenZoek(panel, tekst) { zoek = String(tekst || ''); if (panel && laatsteWereld) renderSpullen(panel, laatsteWereld); }
export function spullenZoekStand() { return { zoek, deel }; }
export function zetSpullenDeel(panel, d) { deel = DELEN.some(([id]) => id === d) ? d : 'alles'; if (panel && laatsteWereld) renderSpullen(panel, laatsteWereld); }

// Focus or click on a card shows it; the action button runs it. a: { rerender(keep), message(text) }
export function spullenFocus(panel, el) {
  const c = el && el.closest && el.closest('[data-spul]');
  if (!c || !panel.contains(c) || c.dataset.spul === sel) return;
  sel = c.dataset.spul;
  for (const b of panel.querySelectorAll('[data-spul]')) b.toggleAttribute('aria-current', b.dataset.spul === sel);
  panel.querySelector('.td-detail').innerHTML = detailHtml();
}

export function spullenClick(e, w, panel, a) {
  const chip = e.target.closest('[data-spul-deel]');
  if (chip) { zetSpullenDeel(panel, chip.dataset.spulDeel); return true; }
  const act = e.target.closest('[data-spul-act]');
  if (act) {
    const it = byKey.get(act.dataset.spulAct);
    if (it && it.act) { const msg = it.act.run(); if (msg) w.addMessage(msg, 3); }
    a.rerender(panel.querySelector(`[data-spul="${CSS.escape(act.dataset.spulAct)}"]`));
    return true;
  }
  const c = e.target.closest('[data-spul]');
  if (c) { spullenFocus(panel, c); return true; }
  return false;
}
