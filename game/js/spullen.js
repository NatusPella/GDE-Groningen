// Spullen (the pause menu's inventory): everything you have, read from the
// systems that own it. Per category the things you own, with what they do
// and where they came from, and a count of how many there are ("3 van 8"),
// never what the rest is. Choosing a weapon takes it in hand; furniture
// puts home on the GPS; eten eet je hier op (#502). Vehicles stay in Garage,
// clues and people in Verhaal.
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
import { woordenVan, past } from './zoektekst.js';
import { soort as visSoort } from './visdata.js';

const ICON = {
  geld: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
  wapens: '<path d="M3 9h13l2 2h3v3h-6l-1.5 1.5V19h-3v-4l-1-1H3z"/>',
  melee: '<path d="M5 19l9-9M14 10l2-6 4 4-6 2M4 20l2-2"/>',
  werp: '<path d="M8 8h8l1 12H7zM9 8V5h6v3M12 5V3"/>',
  kleding: '<path d="M8 3l4 2 4-2 5 4-3 3-2-1v12H8V9l-2 1-3-3z"/>',
  eten: '<path d="M6 3v7a3 3 0 0 0 6 0V3M9 3v18M17 3v6c0 2 3 2 3 4v3M17 16h3"/>',
  thuis: '<path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6"/>',
  kaart: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 14h4"/>',
  upgrade: '<path d="M12 4l6 7h-4v8h-4v-8H6z"/>',
};
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

// Wat er staat als een categorie nog leeg is: waar je het vindt (#435)
const EMPTY = {
  werp: 'Nog niets om te gooien. Pang & Zo verkoopt het.',
  eten: 'Nog niets te eten. De toonbank verkoopt snacks; wat je vangt, gaat mee naar huis.',
  thuis: 'Nog geen meubels. EIKEA heeft ze; thuis zet je ze neer.',
  upgrade: 'Nog geen upgrades. Knal & Kolder Tuning en Spaak & Band helpen je graag.',
};
// Categorieen die ook leeg zichtbaar blijven, zodat je weet dat ze bestaan
const ALWAYS = new Set(['werp', 'eten', 'thuis', 'upgrade']);

// De delen van het scherm (#435): met een druk op de knop zie je alleen wat je
// bij je hebt, wat thuis staat of wat je verzamelt.
export const DELEN = [['alles', 'Alles'], ['uitrusting', 'Uitrusting'], ['thuis', 'Thuis'], ['verzameling', 'Verzamelingen']];
// geld hoort bij geen enkel deel: je ziet het bij Alles bovenaan, en in de
// andere delen gaat het over spullen (#435)
const DEEL_VAN = { geld: 'geld', wapens: 'uitrusting', werp: 'uitrusting', kleding: 'uitrusting', eten: 'uitrusting', upgrade: 'uitrusting', thuis: 'thuis', kaart: 'verzameling' };

// Eten (#502): wat je bij je hebt om op te eten. De toonbank (shops.js) verkoopt hetzelfde
// eten; de namen en de gezondheid per stuk zijn daar overgenomen, want deze module mag de
// winkel niet aanpassen. Opeten gebruikt precies de regel van de toonbank:
// world.health = min(100, health + hp). De aantallen staan als voorraad op het world-object
// (id -> aantal), net als w.ammo: geen eigen saveformaat. De save schrijft dit veld nog niet
// (savegame.js valt buiten deze opdracht), dus na een herstart begin je met een lege maag.
const TOONBANK = [
  ['krentenbol', 'Krentenbol', 3, 'Avondwinkel'],
  ['koffie', 'Koude bak koffie', 6, 'Avondwinkel'],
  ['drop', 'Zak drop', 5, 'Avondwinkel'],
  ['energie', 'Energiedrankje "Grunn Bull"', 12, 'Avondwinkel'],
  ['ehbo', 'EHBO-doos', 45, 'Avondwinkel'],
  ['kroket', 'Kroket', 8, 'Snackbar'],
  ['frikandel', 'Frikandel speciaal', 9, 'Snackbar'],
  ['eierbal', 'Eierbal', 12, 'Snackbar'],
  ['oorlog', 'Patatje oorlog', 13, 'Snackbar'],
  ['kapsalon', 'Kapsalon', 30, 'Snackbar'],
];
const EETBAAR = new Map(TOONBANK.map(([id, label, hp, how]) => [id, { label, hp, how }]));
// Een gevangen vis is ook eten; hij vult meer dan een snack. De soort komt uit visdata.js.
const VIS_HP = 15;
const VIS_VOOR = 'vis:';

// Wat een id is: een snack van de toonbank of een vis uit het hengelen (vis:<soort>).
export function eetWaar(id) {
  const snack = EETBAAR.get(id);
  if (snack) return snack;
  const s = typeof id === 'string' && id.startsWith(VIS_VOOR) ? visSoort(id.slice(VIS_VOOR.length)) : null;
  return s ? { label: s.naam, hp: VIS_HP, how: 'Zelf gevangen' } : null;
}

// De voorraad eten die je bij je hebt, op naam gesorteerd. Wat niet (meer) bestaat telt niet mee.
export function eetVoorraad(w) {
  const bron = w && w.eten && typeof w.eten === 'object' ? w.eten : {};
  const out = [];
  for (const [id, n] of Object.entries(bron)) {
    const waar = eetWaar(id);
    const aantal = Math.max(0, Math.floor(Number(n) || 0));
    if (waar && aantal > 0) out.push({ id, ...waar, aantal });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label, 'nl'));
}

// Erbij krijgen (hengelen.js doet dit met een vis). Zonder world of met een onbekend id
// gebeurt er niets, zodat een aanroep nooit stukloopt.
export function voegEtenToe(w, id, n = 1) {
  if (!w || !eetWaar(id)) return 0;
  if (!w.eten || typeof w.eten !== 'object') w.eten = {};
  const bij = Math.floor(Number(n));
  const aantal = Math.max(0, Math.floor(Number(w.eten[id]) || 0) + (Number.isFinite(bij) ? bij : 0));
  if (aantal) w.eten[id] = aantal; else delete w.eten[id];
  return aantal;
}

// Opeten: dezelfde regel als de toonbank (shops.js foodItem). Op volle gezondheid blijft
// het eten liggen, net als daar ("om mee te nemen"). Geeft de melding voor het paneel.
export function eet(w, id) {
  const waar = eetWaar(id);
  const hebben = w && w.eten ? Math.floor(Number(w.eten[id]) || 0) : 0;
  if (!waar || hebben <= 0) return 'Dat heb je niet bij je.';
  if (w.health >= 100) return `${waar.label}: je zit vol, die bewaar je voor straks.`;
  w.health = Math.min(100, w.health + waar.hp);
  voegEtenToe(w, id, -1);
  return `${waar.label}: lekker! Gezondheid ${Math.round(w.health)}`;
}

// Wat er in een kaartje staat, als één lap tekst om in te zoeken
const zoektekst = (it) => [it.title, it.sub, it.how, it.perk, (SECTIONS.find(([c]) => c === it.cat) || [, ''])[1]].join(' ').toLowerCase();

// Zoeken en filteren (#435): alle woorden moeten ergens in het kaartje staan,
// en het kaartje moet in het gekozen deel vallen. Puur, zodat spullen_test het
// kan natrekken.
export function zoekSpullen(items, query = '', deel = 'alles') {
  const words = woordenVan(query);
  return items.filter((it) => {
    if (deel !== 'alles' && DEEL_VAN[it.cat] !== deel) return false;
    if (!words.length) return true;
    return past(zoektekst(it), words);
  });
}

let sel = null;
let byKey = new Map();
let zoek = '';
let deel = 'alles';
// De melding van de laatste actie (#502): die hoort in het detailpaneel, want de HUD zit
// achter het pauzemenu en w.addMessage zou je nooit zien.
let note = '';
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

  // Eten (#502): elk eetbaar ding een eigen kaart, met "Opeten" als actie. De actie
  // gebruikt dezelfde gezondheidsregel als de toonbank (eet hierboven).
  const eten = eetVoorraad(w);
  const stuks = eten.reduce((n, e) => n + e.aantal, 0);
  counts.eten = stuks ? `${stuks} ${stuks === 1 ? 'stuk' : 'stuks'}` : '';
  for (const e of eten) {
    out.push({ key: 'e:' + e.id, cat: 'eten', icon: 'eten', title: e.label, sub: `${e.aantal} ${e.aantal === 1 ? 'stuk' : 'stuks'} · +${e.hp} gezondheid`,
      side: '', how: e.how, perk: 'Opeten kan overal, ook hier in het menu', rows: [['Gezondheid', `${Math.round(w.health)} van 100`]],
      act: { label: 'Opeten', run: () => eet(w, e.id) } });
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
    `${it.sub ? `<p>${esc(it.sub)}</p>` : ''}${rows ? `<div class="m-facts td-stack">${rows}</div>` : ''}<span class="m-grow"></span>` +
    `${note ? `<p class="m-note" data-spul-melding role="status">${esc(note)}</p>` : ''}${btns ? `<div class="m-acts td-acts">${btns}</div>` : ''}`;
}

// Draws the section into panel (pausemenu.js); returns the sheet subtitle.
export function renderSpullen(panel, w) {
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
// blijven staan als je het scherm even verlaat. Ze zetten alleen de stand; het
// scherm opnieuw tekenen doet de aanroeper, zodat ook de voetregel klopt.
export function zetSpullenZoek(tekst) { zoek = String(tekst || ''); }
export function spullenZoekStand() { return { zoek, deel }; }
export function zetSpullenDeel(d) { deel = DELEN.some(([id]) => id === d) ? d : 'alles'; }

// Focus or click on a card shows it; the action button runs it. a: { rerender(keep), message(text) }
export function spullenFocus(panel, el) {
  const c = el && el.closest && el.closest('[data-spul]');
  if (!c || !panel.contains(c) || c.dataset.spul === sel) return;
  sel = c.dataset.spul;
  note = ''; // een andere kaart: de melding van de vorige actie hoort er niet meer bij
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

export function spullenClick(e, w, panel, a) {
  const chip = e.target.closest('[data-spul-deel]');
  if (chip) { zetSpullenDeel(chip.dataset.spulDeel); a.rerender(); return true; }
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
