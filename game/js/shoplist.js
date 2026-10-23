// Pure list model of the shop screen (issue #170), no DOM and no world: which icon an item gets,
// its status chip ("kan ik kopen" / "heb ik al" / "te duur" ...), the tabs made from a shop's
// sections, the "te weinig geld" feedback and when a purchase asks for a second press.
// shopui.js only draws what this returns; scripts/shoplist_test.mjs covers it.
// Items are the objects shops.js builds: { id, label, desc, price, income, disabled, tag, plain, ... }.

// First matching rule wins; the text is the item's id, label and section title, lower case.
const ICON_RULES = [
  ['kras', /kraskaart|krasloot|\bkras|loterij|lot\b|jackpot/],
  ['vest', /vest|pantser|bodywarmer|kogelwerend/],
  ['knaller', /carbid|vuurwerk|knal|spetter|waterpistool|oud en nieuw/],
  ['wapen', /pistool|uzi|geweer|hagel|buks|jachtgeweer|munitie|patronen|wapen/],
  ['knuppel', /knuppel|hockey|bezem|fietspomp|klomp|polsstok|slag- en stoot/],
  ['kapsel', /kapsel|haar|knippen|kuif|baard|kleur van je haar/],
  ['schoen', /schoen|laars|sneaker/],
  ['kleding', /jas|jack|shirt|broek|pet\b|outfit|kleding|stadjer|corps|incognito|boer op|keuning|wadloper|noorderzon|groen-wit|lente op|rode jas/],
  ['band', /band\b|banden|velg|plakken/],
  ['bel', /\bbel\b|toeter|claxon|licht|lamp|verlichting/],
  ['fiets', /fiets|bakfiets|e-step|step\b|racefiets|trapper|spaak|ketting|versnelling|accu/],
  ['verf', /verf|spuit|lak|kleur|spuiterij|lakken|poets/],
  ['tuning', /motor\b|uitlaat|turbo|remmen|remschijf|differentieel|chip|opgevoerd|schroef|tuning|pk\b|keerkoppeling|roer|peddel/],
  ['reparatie', /repar|monteur|plak|ehbo|pleister|sleutel|gereedschap|mankeert|garage/],
  ['elektronica', /telefoon|tv\b|televisie|radio|speaker|laptop|camera|drone|koptelefoon|lader|elektron|gadget|console/],
  ['meubel', /bank\b|kast\b|bed\b|tafel|stoel|lamp|meubel|boekenkast|woonafdeling|keuken|prikbord|eikea/],
  ['bloem', /bloem|plant|boeket|roos|tulp|cactus/],
  ['cadeau', /cadeau|souvenir|kado|klomp|mok\b|sleutelhanger|ansichtkaart|ansicht|zakmes|beeldje/],
  ['drank', /koffie|thee|bier|wijn|fris|cola|sap|limonade|energie|drankje|melk|water\b|drank|bak koffie|shake|ijs\b/],
  ['eten', /brood|bol\b|krentenbol|taart|koek|gebak|snoep|drop|kroket|frikandel|eierbal|patat|friet|kapsalon|worst|kaas|burger|ballen|hotdog|vlees|gehakt|appel|eten|restaurant|maaltijd|ontbijt|lunch|snack/],
  ['auto', /auto\b|wagen|bus\b|taxi|sedan|hatchback|barrel|suv|sport|occasion|voertuig|brommer|scooter|vrachtwagen/],
  ['boot', /boot|kano|kajak|sup\b|zeil|waterfiets|steiger|huren/],
  ['heli', /heli|rotor/],
  ['geld', /pand|verkop|inkoop|inruil|poen|geld|\bpas\b/],
];
const SHOP_ICON = {
  wapens: 'wapen', pand: 'geld', kleding: 'kleding', kapper: 'kapsel', tabak: 'kras', super: 'eten', snack: 'eten', fietsen: 'fiets',
  fietsenmaker: 'reparatie', auto: 'auto', tuning: 'tuning', boot: 'boot', spuit: 'verf', eikea: 'meubel', heli: 'heli',
  supermarkt: 'eten', bakker: 'eten', slager: 'eten', snackbar: 'eten', bloemist: 'bloem', elektronica: 'elektronica', tweedehands: 'geld',
  souvenir: 'cadeau', kiosk: 'drank', kermiskraam: 'kras',
};
export const ICON_IDS = [...new Set([...ICON_RULES.map(([id]) => id), ...Object.values(SHOP_ICON), 'standaard'])];

// Icon id for an item: a rule on its own text first, then on its section, then the shop's own icon.
export function itemIcon(it, shopType = '', sectionTitle = '') {
  const own = `${it.id || ''} ${it.label || ''}`.toLowerCase();
  for (const [id, re] of ICON_RULES) if (re.test(own)) return id;
  const sec = String(sectionTitle).toLowerCase();
  for (const [id, re] of ICON_RULES) if (re.test(sec)) return id;
  return SHOP_ICON[shopType] || 'standaard';
}

const OWNED = /^(heb je al|heeft deze kleur al|al gedaan|staat al hier|je zit erop)/i;
const FULL = /vol$/i;

// Status of one item at the current amount of money.
// { id: koop | verkoop | gratis | kies | heb | duur | slot | nu, label, tone: ok | no | mut, buyable }
export function itemStatus(it, money = 0) {
  const d = it.disabled || '';
  if (it.plain) return { id: 'kies', label: 'Kiezen', tone: 'ok', buyable: !d };
  if (d) {
    if (OWNED.test(d) || it.tag === 'Van jou') return { id: 'heb', label: it.tag === 'Van jou' && !OWNED.test(d) ? 'Van jou' : 'Heb ik al', tone: 'mut', buyable: false };
    if (d === 'Te weinig geld') return { id: 'duur', label: 'Te duur', tone: 'no', buyable: false };
    if (/op slot/i.test(d)) return { id: 'slot', label: 'Op slot', tone: 'no', buyable: false };
    return { id: 'nu', label: d, tone: 'mut', buyable: false };
  }
  if (it.income > 0) return { id: 'verkoop', label: 'Verkopen', tone: 'ok', buyable: true };
  if (it.price > 0 && it.price > money) return { id: 'duur', label: 'Te duur', tone: 'no', buyable: false };
  if (it.price > 0) return { id: 'koop', label: 'Kan ik kopen', tone: 'ok', buyable: true };
  return { id: 'gratis', label: 'Gratis', tone: 'ok', buyable: true };
}

// How much money is missing for an item (0 when nothing, or when it is no purchase).
export function shortfall(it, money = 0) {
  if (it.plain || it.income > 0 || !(it.price > 0)) return 0;
  return Math.max(0, Math.ceil(it.price - money));
}

const euro = (n) => '€' + Math.round(n).toLocaleString('nl-NL');
export function brokeMessage(it, money = 0) {
  const k = shortfall(it, money);
  return k > 0 ? `Te weinig geld: je mist nog ${euro(k)}. Bijverdienen? Kijk in het menu onder Loopbanen of Activiteiten` : 'Te weinig geld. Bijverdienen? Kijk in het menu onder Loopbanen of Activiteiten';
}

// Message for a refused press on an item: why it can't be bought now.
export function refusalMessage(it, money = 0) {
  const st = itemStatus(it, money);
  if (st.id === 'duur') return brokeMessage(it, money);
  if (st.id === 'heb') return `${it.label}: dat heb je al`;
  return it.disabled || st.label;
}

// Expensive purchases ask once more.
const CONFIRM_FROM = 1000;
const CONFIRM_SHARE = 0.5;
export function needsConfirm(it, money = 0) {
  return !!it.confirmText || it.price >= CONFIRM_FROM || (it.price >= 300 && it.price > money * CONFIRM_SHARE);
}

// Label of the one buy button.
export function buyLabel(it, shopType, armed = false) {
  if (it.disabled) return it.disabled;
  const verb = it.verb || (shopType === 'tuning' ? 'Betalen' : 'Kopen voor');
  if (armed) return `Zeker? Nog eens: €${it.price}`;
  if (it.income > 0) return `Verkopen voor €${it.income}`;
  if (it.price > 0) return `${verb} €${it.price}`;
  return it.verb || 'Kiezen';
}

// Tabs of a shop: one per section, plus "Alles" in front when there are two or more.
// Sections without items have no tab. [{ id, label, count, owned }]
export function shopTabs(sections) {
  const real = sections.filter((s) => s.items && s.items.length);
  if (real.length < 2) return [];
  const tabs = real.map((s, i) => ({ id: 's' + i, label: s.title, count: s.items.length, owned: s.items.filter((it) => itemStatus(it, 0).id === 'heb').length }));
  return [{ id: 'alles', label: 'Alles', count: tabs.reduce((n, t) => n + t.count, 0), owned: tabs.reduce((n, t) => n + t.owned, 0) }, ...tabs];
}

// The sections a tab shows (the tab id as shopTabs made it).
export function tabSections(sections, tab) {
  const real = sections.filter((s) => s.items && s.items.length);
  if (!tab || tab === 'alles') return real;
  const i = Number(String(tab).slice(1));
  return real[i] ? [real[i]] : real;
}

// Next tab, wrapping around; a tab that vanished (stock changed) falls back to "Alles".
export function stepTab(tabs, cur, dir) {
  if (!tabs.length) return 'alles';
  let i = tabs.findIndex((t) => t.id === cur);
  if (i < 0) i = 0;
  return tabs[(i + dir + tabs.length) % tabs.length].id;
}
export function keepTab(tabs, cur) {
  return tabs.some((t) => t.id === cur) ? cur : 'alles';
}

// Items in the shown sections, flat, in screen order.
export function flatItems(sections) {
  return sections.flatMap((s) => s.items || []);
}

// The item that stays selected when the list is redrawn or the tab changes.
export function keepItem(items, id) {
  if (id != null && items.some((it) => it.id === id)) return id;
  const pick = items.find((it) => it.story === 'ok') || items.find((it) => !it.disabled) || items[0];
  return pick ? pick.id : null;
}

// Short property for a row: the first sentence of the description or the effect.
export function shortPerk(it, max = 54) {
  const t = String(it.effect || it.desc || '').split(/[.·]/)[0].trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
}
