// Samen spelen (#527): de hub met drie stappen. Deze test doorloopt de regels (samenhub.js) en het scherm
// (samenhubui.js) zonder browser: onderaan staat een kleine DOM die alleen de standaard browsersemantiek nabootst
// (Tab gaat in documentvolgorde langs de knoppen, Enter of Spatie op een knop is een klik). Wat de hub zelf moet
// doen, doet hij echt: tekenen, van stap wisselen, een keuze doorgeven aan de lobby en Escape een stap terug.
// Bewezen wordt: de hub opent op stap 1, alle drie de stappen zijn met het toetsenbord te bereiken en te openen, en
// Escape gaat terug zonder ooit een sessie te beëindigen.
//   node scripts/samenhub_test.mjs
import assert from 'node:assert/strict';

let n = 0;
const t = async (naam, f) => { await f(); n++; };

// ---------------------------------------------------------------- regels (samenhub.js)

const H = await import('../game/js/samenhub.js');
const { STAP, STAPPEN, ACT, escapeStap, volgendeStap, vorigeStap, stapWaar, stapMetWie, stapStart, actieVan, sessieVan, hubView, landStap } = H;

await t('de hub heeft drie stappen, in de volgorde waarin een speler ze tegenkomt', () => {
  assert.deepEqual(STAPPEN.map((s) => s.id), ['waar', 'metwie', 'start']);
  assert.deepEqual(STAPPEN.map((s) => s.label), ['Waar speel je', 'Met wie', 'Start']);
  for (const s of STAPPEN) assert.ok(s.hint && s.hint.length > 8, `stap ${s.id} heeft een hint`);
});

await t('volgende en vorige stap lopen rond; Escape gaat een stap terug en vanaf stap 1 de hub uit', () => {
  assert.equal(volgendeStap(STAP.WAAR), STAP.METWIE);
  assert.equal(volgendeStap(STAP.START), STAP.WAAR, 'na de laatste stap weer vooraan');
  assert.equal(vorigeStap(STAP.WAAR), STAP.START);
  assert.equal(escapeStap(STAP.START), STAP.METWIE);
  assert.equal(escapeStap(STAP.METWIE), STAP.WAAR);
  assert.equal(escapeStap(STAP.WAAR), null, 'op de eerste stap verlaat Escape de hub (en niet de sessie)');
});

await t('stap 1: de drie keuzes staan er altijd, met uitleg; zonder toestemming zegt Meedoen waarom niet', () => {
  const v = stapWaar({ meedoen: null });
  assert.deepEqual(v.keuzes.map((k) => k.act), [ACT.MEEDOEN, ACT.HOSTEN, ACT.BESLOTEN]);
  const meedoen = v.keuzes[0];
  assert.equal(meedoen.kan, true, 'meedoen blijft zichtbaar; het scherm legt uit wat er moet gebeuren');
  assert.match(meedoen.uitleg, /toestemming/, 'zonder toestemming zegt de hub dat het aansluitscherm die eerst vraagt (ADR 0022: niets naar buiten voor akkoord)');
  assert.doesNotMatch(meedoen.uitleg, /Instellingen/, 'de hub verwijst niet naar een instelling die dit nog niet zet: onlineMeedoen is van het bootpad (#528)');
  assert.equal(meedoen.uitleg.indexOf('sessie past'), -1, 'en doet niet alsof er al een lijst is');
  assert.deepEqual(v.kandidaten, [], 'niets opgehaald zonder toestemming');
});

await t('stap 1: met toestemming en een opgehaalde lijst telt de hub de passende sessies', () => {
  const rijen = [
    { id: 'a', naam: 'Zomerrit', spelers: 2, max: 8, versie: '0.54.0' },
    { id: 'b', naam: 'Polder', spelers: 3, max: 8, versie: '0.54.0' },
  ];
  const v = stapWaar({ meedoen: true, rijen, gekeken: true, eigenId: 'ik' });
  assert.ok(v.kandidaten.length >= 1, 'er is minstens één kandidaat');
  assert.match(v.keuzes[0].uitleg, /sessie/);
  assert.equal(v.keuzes.find((k) => k.act === ACT.HOSTEN).uitleg.includes('kamercode'), true);
});

await t('stap 1 met een lopende sessie: meedoen en hosten kunnen niet meer, besloten wel', () => {
  const sessie = sessieVan({ role: 'host', kamerCode: 'ABC123', hub: { roster: { spelers: [1, 2], max: 8 } } });
  const v = stapWaar({ sessie });
  assert.equal(v.keuzes.find((k) => k.act === ACT.MEEDOEN).kan, false);
  assert.equal(v.keuzes.find((k) => k.act === ACT.HOSTEN).kan, false);
  assert.equal(v.keuzes.find((k) => k.act === ACT.BESLOTEN).kan, true);
});

await t('de sessie: rol, kamercode en aantal spelers komen uit coopNet, zonder coopnet.js aan te raken', () => {
  assert.equal(sessieVan(null), null);
  const host = sessieVan({ role: 'host', kamerCode: 'K7', hub: { roster: { spelers: [1, 2, 3], max: 8 } } });
  assert.deepEqual(host, { rol: 'host', spelers: 3, max: 8, code: 'K7', openbaar: false, naam: '' });
  const gast = sessieVan({ role: 'gast', kamerCode: 'K7', session: { welcome: { lijst: [1, 2], max: 4 } }, openbaar: { naam: 'Zomerrit' } });
  assert.equal(gast.rol, 'gast');
  assert.equal(gast.spelers, 2);
  assert.equal(gast.openbaar, true);
  assert.equal(gast.naam, 'Zomerrit', 'de openbare naam hoort bij de sessie, niet bij de speler');
});

await t('stap 2: de kamercode en de spelers staan er; zonder sessie zegt de stap wat je eerst moet doen', () => {
  const met = stapMetWie({ sessie: sessieVan({ role: 'host', kamerCode: 'K7', hub: { roster: { spelers: [1, 2], max: 8 } } }) });
  const tekst = met.rijen.map((r) => r.tekst).join(' | ');
  assert.match(tekst, /K7/);
  assert.match(tekst, /2 van 8 spelers/);
  assert.match(tekst, /niet in een lijst/, 'een besloten sessie zegt dat er niets in een lijst staat');
  assert.ok(met.knoppen.some((k) => k.act === 'volgende'), 'verder naar Start');
  const leeg = stapMetWie({});
  assert.match(leeg.rijen[0].tekst, /Nog geen sessie|nog geen sessie/i);
  assert.deepEqual(leeg.knoppen.map((k) => k.act), [ACT.TERUG]);
  const besloten = stapMetWie({ besloten: true });
  assert.deepEqual(besloten.knoppen.map((k) => k.act), [ACT.ALLEEN, ACT.CODE], 'besloten: alleen, of met een kamercode');
});

await t('stap 3: starten kan pas met twee spelers, en Ontsnappen naar besloten staat er altijd', () => {
  const een = stapStart({ sessie: sessieVan({ role: 'host', hub: { roster: { spelers: [1], max: 8 } } }), genoeg: false });
  const start = een.knoppen.find((k) => k.act === ACT.START);
  assert.equal(start.disabled, true, 'één speler: de knop staat uit');
  assert.match(een.uitleg, /twee spelers/);
  assert.ok(een.knoppen.some((k) => k.act === ACT.ONTSNAP), 'de uitweg staat er altijd');
  const twee = stapStart({ sessie: sessieVan({ role: 'host', hub: { roster: { spelers: [1, 2], max: 8 } } }), genoeg: true });
  assert.equal(twee.knoppen.find((k) => k.act === ACT.START).disabled, false);
  const gast = stapStart({ sessie: sessieVan({ role: 'gast' }) });
  assert.equal(gast.knoppen.find((k) => k.act === ACT.START).disabled, true, 'een gast begint de wereld niet');
  assert.ok(gast.knoppen.some((k) => k.act === ACT.ONTSNAP));
});

await t('stap 3 zonder sessie: geen startknop maar de weg terug', () => {
  const v = stapStart({});
  assert.deepEqual(v.knoppen.map((k) => k.act), [ACT.TERUG]);
});

await t('een keuze wijst de bestaande lobby de weg, met dezelfde stappen als lobbyui.js', () => {
  assert.deepEqual(actieVan(ACT.HOSTEN).lobby, [{ t: 'kies', rol: 'host' }, { t: 'route', route: 'kamer' }]);
  assert.deepEqual(actieVan(ACT.MEEDOEN).lobby, [{ t: 'kies', rol: 'gast' }], 'meedoen komt op het aansluitscherm (kamercode en Openbare sessies)');
  assert.deepEqual(actieVan(ACT.CODE).lobby, [{ t: 'kies', rol: 'gast' }]);
  assert.equal(actieVan(ACT.ALLEEN).sluit, true, 'alleen spelen sluit het menu en begint geen sessie');
  assert.deepEqual(actieVan(ACT.MEEDOEN, { sessie: sessieVan({ role: 'host' }) }).lobby, [], 'met een sessie wordt er niets opnieuw gestart');
});

await t('hubView geeft elke stap met nummer, hint en de Escape-uitweg', () => {
  const v1 = hubView(STAP.WAAR, {});
  assert.equal(v1.nummer, 1);
  assert.equal(v1.totaal, 3);
  assert.equal(v1.escape, null, 'op stap 1 verlaat Escape de hub');
  const v3 = hubView(STAP.START, {});
  assert.equal(v3.escape, STAP.METWIE);
  assert.equal(hubView('onzin', {}).stap, STAP.WAAR, 'een onbekende stap valt terug op het begin');
});

await t('landStap: zonder sessie opent de hub; met een sessie de bestaande schermen', () => {
  assert.equal(landStap({ loopt: false }), STAP.WAAR);
  assert.equal(landStap({ loopt: false, pref: 'samen' }), 'samen');
  assert.equal(landStap({ loopt: true }), 'samen');
  assert.equal(landStap({ loopt: true, pref: 'spelers' }), 'spelers');
});

// ---------------------------------------------------------------- kleine DOM (alleen browserstandaard)

// De hub levert echte knoppen in documentvolgorde; Tab en Enter doen hier wat een browser doet. Geen spellogica.
// De parser kent alleen wat de hub tekent: elementen met tekst en attributen, alles netjes gesloten.
const parse = (html, ouder) => {
  const tag = /<(\/?)([a-zA-Z0-9]+)((?:\s+[a-zA-Z-]+(?:="[^"]*")?)*)\s*>/g;
  const attr = /([a-zA-Z-]+)(?:="([^"]*)")?/g;
  const stapel = [ouder];
  let laatste = 0, m;
  const tekst = (s) => { const t = s.replace(/\s+/g, ' ').trim(); if (t) stapel[stapel.length - 1].childNodes.push({ tekst: t }); };
  while ((m = tag.exec(html))) {
    tekst(html.slice(laatste, m.index));
    laatste = tag.lastIndex;
    if (m[1] === '/') { if (stapel.length > 1) stapel.pop(); continue; }
    const el = new Element(m[2]);
    attr.lastIndex = 0;
    let a;
    while ((a = attr.exec(m[3]))) el.setAttribute(a[1], a[2] === undefined ? '' : a[2]);
    stapel[stapel.length - 1].childNodes.push(el);
    el.parent = stapel[stapel.length - 1];
    stapel.push(el);
  }
  tekst(html.slice(laatste));
};

class Element {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.attrs = {};
    this.childNodes = [];
    this.parent = null;
    this.handlers = {};
    this.disabled = false;
  }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'disabled') this.disabled = true; }
  getAttribute(k) { return this.attrs[k] === undefined ? null : this.attrs[k]; }
  get dataset() {
    const d = {};
    for (const [k, v] of Object.entries(this.attrs)) {
      const m = /^data-(.+)$/.exec(k);
      if (m) d[m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
    }
    return d;
  }
  get classList() {
    const e = this;
    const set = () => new Set(String(e.attrs.class || '').split(' ').filter(Boolean));
    return {
      add: (c) => { const s = set(); s.add(c); e.attrs.class = [...s].join(' '); },
      remove: (c) => { const s = set(); s.delete(c); e.attrs.class = [...s].join(' '); },
      contains: (c) => set().has(c),
    };
  }
  set innerHTML(html) { this.childNodes = []; parse(String(html), this); }
  get innerHTML() {
    const uit = (el) => el.childNodes.map((c) => (c.tekst !== undefined ? c.tekst
      : `<${c.tagName.toLowerCase()}${Object.entries(c.attrs).map(([k, v]) => ` ${k}="${v}"`).join('')}>${uit(c)}</${c.tagName.toLowerCase()}>`)).join(' ');
    return uit(this);
  }
  get textContent() { return this.childNodes.map((c) => (c.tekst !== undefined ? c.tekst : c.textContent)).join(' '); }
  set textContent(v) { this.childNodes = [{ tekst: String(v) }]; }
  get isConnected() { let p = this; while (p.parent) p = p.parent; return p === document; }
  addEventListener(type, f) { (this.handlers[type] ||= []).push(f); }
  removeEventListener(type, f) { this.handlers[type] = (this.handlers[type] || []).filter((x) => x !== f); }
  querySelectorAll(sel) {
    const past = maakFilter(sel);
    const uit = [];
    const loop = (el) => { for (const c of el.childNodes) { if (c.tekst !== undefined) continue; if (past(c)) uit.push(c); loop(c); } };
    loop(this);
    return uit;
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  closest(sel) {
    const past = maakFilter(sel);
    let el = this;
    while (el) { if (past(el)) return el; el = el.parent; }
    return null;
  }
  focus() { document.activeElement = this; }
  appendChild(c) { c.parent = this; this.childNodes.push(c); return c; }
  removeChild(c) { this.childNodes = this.childNodes.filter((x) => x !== c); c.parent = null; return c; }
}

const maakFilter = (sel) => {
  const metWaarde = /^\[([a-zA-Z-]+)="([^"]*)"\]$/.exec(sel);
  if (metWaarde) { const [, k, v] = metWaarde; return (el) => el.attrs[k] === v; }
  if (/^\[[a-zA-Z-]+\]$/.test(sel)) { const k = sel.slice(1, -1); return (el) => el.attrs[k] !== undefined; }
  if (/^\.[\w-]+$/.test(sel)) { const c = sel.slice(1); return (el) => String(el.attrs.class || '').split(' ').includes(c); }
  if (/^[a-zA-Z0-9]+$/.test(sel)) { const tag = sel.toUpperCase(); return (el) => el.tagName === tag; }
  throw new Error('testdom kent deze kiezer niet: ' + sel);
};

const document = Object.assign(new Element('html'), { activeElement: null });
document.documentElement = document;
document.body = new Element('body');
document.body.parent = document;
document.createElement = (tag) => new Element(tag);
globalThis.document = document;

// Een klik borrelt naar boven, zoals in een browser (en een uitgezette knop krijgt geen klik).
const klik = (el) => {
  if (!el || el.disabled) return false;
  const ev = { target: el, preventDefault() {}, stopPropagation() {} };
  let e = el;
  while (e) { for (const f of e.handlers.click || []) f(ev); e = e.parent; }
  return true;
};
// Tab: de volgende knop in documentvolgorde (browserstandaard).
const tabNaar = (doel) => {
  const lijst = document.body.querySelectorAll('button').filter((b) => !b.disabled);
  document.activeElement = doel && lijst.includes(doel) ? doel : lijst[0];
  return document.activeElement;
};
// Enter of Spatie op een knop met focus: de browser maakt daar een klik van.
const enter = () => {
  const el = document.activeElement;
  return el && el.tagName === 'BUTTON' ? klik(el) : false;
};



// ---------------------------------------------------------------- het scherm (samenhubui.js)

const { mountSamenHub, hubTerug, isHubOpen, closeSamenHub } = await import('../game/js/samenhubui.js');

const knop = (root, attr, waarde) => [...root.querySelectorAll(`[${attr}]`)].find((e) => e.getAttribute(attr) === waarde);

await t('de hub opent op stap 1 als wizard: geen tabsemantiek, wel een statusregel en één zichtbare stap (#571)', () => {
  closeSamenHub();
  const root = document.createElement('div');
  const keuzes = [];
  mountSamenHub(root, { onKeuze: (a) => keuzes.push(a) });
  assert.equal(isHubOpen(), true, 'de hub meldt dat hij open is (voor Escape in pausemenu.js)');
  const stappen = root.querySelectorAll('[data-hub-stap]');
  assert.deepEqual(stappen.map((b) => b.getAttribute('data-hub-stap')), ['waar', 'metwie', 'start']);
  for (const b of stappen) {
    assert.equal(b.tagName, 'BUTTON', 'een stap is een echte knop, dus ook met de controller te kiezen');
    assert.equal(b.getAttribute('role'), null, 'geen tabrol: dit is een wizard met één zichtbare stap');
    assert.equal(b.getAttribute('aria-controls'), null, 'en dus geen tabpanel om naar te verwijzen');
  }
  assert.equal(stappen[0].getAttribute('aria-current'), 'step', 'de hub opent op Waar speel je');
  assert.deepEqual(stappen.slice(1).map((b) => b.getAttribute('aria-current')), ['false', 'false'], 'de andere stappen zijn niet de huidige');
  const groep = root.querySelector('.pm-hub-stappen');
  assert.equal(groep.getAttribute('role'), 'group', 'de stappen zijn een groep knoppen, geen tablist');
  assert.equal(groep.getAttribute('aria-label'), 'Stappen van Samen spelen');
  assert.equal(root.querySelector('[role="tablist"]'), null, 'nergens een tablist zonder panelen');
  assert.equal(root.querySelector('[role="tabpanel"]'), null, 'en geen tabpanel dat niet bestaat');
  assert.equal(root.querySelectorAll('.pm-hub-inhoud').length, 1, 'één zichtbare stap inhoud');
  const teller = root.querySelector('.pm-hub-teller');
  assert.equal(teller.getAttribute('role'), 'status', 'de teller kondigt de stapwissel aan');
  assert.equal(teller.getAttribute('aria-live'), 'polite');
  assert.equal(teller.getAttribute('id'), 'pm-hub-teller');
  assert.match(teller.textContent, /Stap 1 van 3/, 'de teller noemt de stap');
  assert.equal(root.querySelector('.pm-hub-inhoud').getAttribute('aria-labelledby'), 'pm-hub-teller', 'de inhoud hangt aan de teller');
  const k = root.querySelectorAll('[data-hub-keuze]').map((b) => b.getAttribute('data-hub-keuze'));
  assert.deepEqual(k, [ACT.MEEDOEN, ACT.HOSTEN, ACT.BESLOTEN]);
  assert.match(root.innerHTML, /Waar speel je/, 'de speler ziet de vraag');
  closeSamenHub();
  assert.equal(isHubOpen(), false);
});

await t('de drie stappen zijn met het toetsenbord te bereiken en te openen (Tab + Enter)', () => {
  closeSamenHub();
  const root = document.createElement('div');
  document.body.appendChild(root);
  mountSamenHub(root, {});
  const teller = root.querySelector('.pm-hub-teller');
  assert.equal(teller.getAttribute('role'), 'status', 'de statusregel staat er vanaf het begin, zodat een schermlezer de wissel hoort');
  const gezien = [];
  for (let i = 0; i < 3; i++) {
    // na elke klik tekent de hub opnieuw, dus de knoppen worden elke ronde vers opgehaald
    const doel = root.querySelectorAll('[data-hub-stap]')[i];
    tabNaar(doel); // Tab in documentvolgorde: browserstandaard
    assert.equal(document.activeElement, doel, `stap ${i + 1} krijgt de focus met Tab`);
    assert.equal(enter(), true, 'Enter op de knop met focus');
    assert.equal(document.activeElement.getAttribute('data-hub-stap'), doel.getAttribute('data-hub-stap'), 'de focus blijft op de gekozen stap staan na het hertekenen (anders begint het toetsenbord weer bovenaan)');
    gezien.push(doel.getAttribute('data-hub-stap'));
    const nu = root.querySelectorAll('[data-hub-stap]')[i];
    assert.equal(nu.getAttribute('aria-current'), 'step', `stap ${i + 1} is geopend met het toetsenbord`);
    assert.equal(root.querySelector('.pm-hub-teller'), teller, 'de statusregel blijft dezelfde knoop: alleen de tekst wisselt, zodat de schermlezer hem aankondigt');
    assert.match(teller.textContent, new RegExp(`Stap ${i + 1} van 3`), 'de teller volgt de stap');
  }
  assert.deepEqual(gezien, ['waar', 'metwie', 'start'], 'alle drie de stappen komen langs');
  document.body.removeChild(root);
  closeSamenHub();
});

await t('de keuzes van stap 1 zijn met Tab + Enter te kiezen en tekenen in .pm-samen-inner', () => {
  closeSamenHub();
  const buiten = document.createElement('div');
  const vak = document.createElement('div');
  vak.setAttribute('class', 'pm-samen-inner');
  buiten.appendChild(vak);
  document.body.appendChild(buiten);
  const gekozen = [];
  mountSamenHub(buiten, { onKeuze: (a) => gekozen.push(a) }); // het onderdeel eromheen: de hub zoekt zelf het vak
  assert.equal(vak.querySelectorAll('[data-hub-keuze]').length, 3, 'de hub tekent in het vak van Samen spelen');
  tabNaar(vak.querySelectorAll('[data-hub-keuze]')[1]); // Tab naar "Zelf een sessie openen"
  assert.equal(enter(), true, 'Enter op de keuze met focus');
  assert.deepEqual(gekozen, [ACT.HOSTEN], 'de keuze komt bij de aanroeper aan, net als een klik');
  document.body.removeChild(buiten);
  closeSamenHub();
});
await t('Escape gaat een stap terug en beëindigt nooit een sessie (stap 3 -> 2 -> 1 -> menu)', () => {
  closeSamenHub();
  const root = document.createElement('div');
  const geroepen = [];
  let ontsnapt = 0;
  const view = mountSamenHub(root, {
    sessie: sessieVan({ role: 'host', kamerCode: 'K7', hub: { roster: { spelers: [1, 2], max: 8 } } }),
    genoeg: true,
    // de enige plek waar de hub een sessie mag verlaten: de knop (die komt hier als actie binnen)
    onActie: (a) => { geroepen.push(a); if (a === ACT.ONTSNAP) ontsnapt++; },
  }, STAP.START);
  assert.equal(view.stap(), STAP.START);
  assert.equal(hubTerug(), true, 'vanaf Start gaat Escape terug');
  assert.equal(view.stap(), STAP.METWIE);
  assert.equal(hubTerug(), true);
  assert.equal(view.stap(), STAP.WAAR);
  assert.equal(hubTerug(), false, 'op de eerste stap gebruikt de hub Escape niet: het pauzemenu sluit dan gewoon');
  assert.equal(isHubOpen(), true, 'de hub blijft open; Escape sluit geen sessie en geen scherm');
  assert.equal(ontsnapt, 0, 'Escape heeft Ontsnappen naar besloten niet aangeraakt');
  assert.deepEqual(geroepen, [], 'Escape heeft geen enkele actie doorgegeven: geen start, geen keuze, geen sessie-einde');
  view.zet(STAP.START); // terug naar de laatste stap om de uitweg te bekijken
  const ontsnap = knop(root, 'data-hub-act', ACT.ONTSNAP);
  assert.ok(ontsnap, 'de uitweg staat als knop op stap 3');
  klik(ontsnap);
  assert.equal(ontsnapt, 1, 'alleen de knop verlaat de sessie');
  closeSamenHub();
});

await t('Escape op stap 2 met een besloten keuze gaat terug naar Waar speel je', () => {
  closeSamenHub();
  const root = document.createElement('div');
  const view = mountSamenHub(root, { besloten: true }, STAP.METWIE);
  assert.equal(view.stap(), STAP.METWIE);
  assert.equal(hubTerug(), true);
  assert.equal(view.stap(), STAP.WAAR);
  closeSamenHub();
});

await t('een keuze in stap 1 komt bij de aanroeper aan; een uitgezette keuze doet niets', () => {
  closeSamenHub();
  const root = document.createElement('div');
  const gekozen = [];
  mountSamenHub(root, {
    sessie: sessieVan({ role: 'host' }),
    onKeuze: (a) => gekozen.push(a),
  });
  klik(knop(root, 'data-hub-keuze', ACT.HOSTEN));
  assert.deepEqual(gekozen, [], 'met een lopende sessie kan hosten niet: de knop is uitgezet');
  closeSamenHub();
  const root2 = document.createElement('div');
  const gekozen2 = [];
  mountSamenHub(root2, { onKeuze: (a) => gekozen2.push(a) });
  klik(knop(root2, 'data-hub-keuze', ACT.HOSTEN));
  klik(knop(root2, 'data-hub-keuze', ACT.BESLOTEN));
  assert.deepEqual(gekozen2, [ACT.HOSTEN, ACT.BESLOTEN]);
  closeSamenHub();
});

await t('stap 3 tekent de startknop uit bij één speler en de uitweg ernaast', () => {
  closeSamenHub();
  const root = document.createElement('div');
  mountSamenHub(root, { sessie: sessieVan({ role: 'host', hub: { roster: { spelers: [1], max: 8 } } }), genoeg: false }, STAP.START);
  const start = knop(root, 'data-hub-act', ACT.START);
  assert.equal(start.disabled, true);
  assert.equal(start.getAttribute('aria-disabled'), 'true');
  assert.match(root.innerHTML, /Ontsnappen naar besloten/);
  closeSamenHub();
});

// ---------------------------------------------------------------- bedrading in het pauzemenu

const fs = await import('node:fs');
const lees = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');

await t('het pauzemenu geeft Escape eerst aan de hub, vóór de gewone stap terug', () => {
  const pm = lees('pausemenu.js');
  const goBack = pm.slice(pm.indexOf('function goBack()'), pm.indexOf('function goBack()') + 900);
  assert.match(goBack, /samenHubTerug\(\)/, 'goBack delegeert naar de hub');
  assert.ok(goBack.indexOf('samenHubTerug()') < goBack.indexOf('data-restart-confirm'), 'en doet dat vóór het sluiten van het menu');
  assert.match(goBack, /pref\.sub\.spel === 'samen' && \(pref\.sub\.samen \|\| 'samen'\) !== 'spelers'/, 'maar niet op het tabblad Spelers, waar geen hub staat');
  assert.match(pm, /import \{[^}]*samenHubTerug[^}]*\} from '\.\/samenpanel\.js'/, 'de hub komt via samenpanel.js binnen');
});

await t('Samen spelen toont de hub zolang er geen sessie is; de bestaande routes blijven bestaan', () => {
  const sp = lees('samenpanel.js');
  assert.match(sp, /mountHub\(root, world, sluit\)/, 'het paneel tekent de hub');
  assert.match(sp, /if \(!nu && !startOpts\.rol && !startOpts\.lijst && !view\)/, 'alleen zonder sessie, zonder gekozen rol en met de hub als enige scherm');
  assert.match(sp, /const route = actieVan\(act\);/, 'de keuze komt uit de hub-regels (samenhub.js actieVan)');
  assert.match(sp, /naarLobby\(route\.rol, route\.lijst\)/, 'de hub geeft de lobby rol en lijst: dezelfde beginsituatie als het oude beginscherm');
  assert.match(sp, /if \(route\.sluit\) \{ setGate\(false\); sluit\(\);/, 'alleen spelen begint geen sessie');
});

await t('stap 2 knoppen (Alleen spelen, kamercode) komen bij dezelfde afhandeling aan als de keuzes van stap 1', () => {
  closeSamenHub();
  const root = document.createElement('div');
  const geroepen = [];
  mountSamenHub(root, { besloten: true, onKeuze: (a) => geroepen.push(a), onActie: (a) => geroepen.push(a) }, STAP.METWIE);
  klik(knop(root, 'data-hub-act', ACT.ALLEEN));
  klik(knop(root, 'data-hub-act', ACT.CODE));
  assert.deepEqual(geroepen, [ACT.ALLEEN, ACT.CODE], 'geen knop van stap 2 valt weg');
  closeSamenHub();
});
await t('Terug in de lobby gaat naar de hub, niet naar het oude beginscherm met vier knoppen', () => {
  const sp = lees('samenpanel.js');
  assert.match(sp, /\[data-act="terug"\]/, 'de Terug-knop van de lobby wordt herkend');
  assert.match(sp, /if \(!b \|\| !vanHub \|\| !view \|\| !view\.state\) return;/, 'alleen als de lobby uit de hub kwam en er echt een scherm staat');
  assert.match(sp, /HUB_TERUG_STAPPEN\.includes\(view\.state\(\)\.step\)/, 'en alleen op de schermen waar de hub ze neerzette');
  assert.match(sp, /e\.stopPropagation\(\)/, 'de lobby zelf ziet de klik niet: anders tekent hij zijn eigen beginscherm');
  assert.match(sp, /\}, true\);/, 'in de capture-fase, dus vóór de luisteraar van de lobby');
});
await t('een hub op een vak waar een oude lobby nog aan luistert, houdt die lobby buiten (verse knoop)', () => {
  // lobbyui.js ruimt bij close() de inhoud op, niet zijn luisteraars. De hub tekent in hetzelfde vak en gebruikt
  // dezelfde data-act-namen, dus mountHub moet een luistervrije knoop op dezelfde plek zetten.
  const sp = lees('samenpanel.js');
  assert.match(sp, /cloneNode\(false\)/, 'mountHub kloont het vak leeg in plaats van erin te hergebruiken');
  assert.match(sp, /replaceChild\(vak, eerste\)/, 'en zet de kloon op dezelfde plek in het menu');
  assert.match(sp, /let vak = eerste;/, 'zonder DOM-API (tests) blijft het vak zoals het is');
});
await t('een sessie van één (#554) wordt niet geadopteerd: geen kamercode en geen wachtrij', () => {
  // Alleen spelen is een gastheer-sessie van één (#554, coopsolo.js). Zo'n hub heeft geen transport en dus
  // geen kamer waarin iemand kan binnenkomen: het paneel moet hem negeren en het gewone "nog geen sessie"-
  // scherm tonen. De markering zelf is getest in coopsolo_test.mjs; hier gaat het om de bedrading.
  const sp = lees('samenpanel.js');
  assert.match(sp, /import \{ isSoloHost \} from '\.\/coopsolo\.js';/, 'de solo-markering komt uit coopsolo.js');
  assert.match(sp, /const samenNet = \(world\) => \{\s*const n = world && world\.coopNet;\s*return n && !isSoloHost\(world\) \? n : null;\s*\};/,
    'een solo-hub telt voor dit paneel niet als sessie');
  const hs = sp.slice(sp.indexOf('function huidigeSessie'), sp.indexOf('function huidigeSessie') + 500);
  assert.match(hs, /const n = samenNet\(world\);/, 'huidigeSessie leest via samenNet: een solo-hub geeft null (dus geen rol, route of code)');
  assert.match(sp, /const nu = samenNet\(world\);/, 'ook de hub-keuze in renderSamenPanel negeert de solo-hub en opent "nog geen sessie"');
  assert.match(sp, /\.\.\.\(loopt \? \{ adopt: \{ code: loopt\.code, route: loopt\.route \}/,
    'de lobby krijgt alleen bij een echte sessie een kamercode/route (adopt) mee; zonder loopt blijft die weg');
  assert.doesNotMatch(sp, /Wacht op een medespeler/, 'dit paneel schrijft zelf geen wachtrijtekst');
});
console.log(`samenhub_test: ${n} controles ok`);
