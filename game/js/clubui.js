// De Club-kaarten (Bezit, epic #1095; voetbalcarrière #1113; Club-UI, ontwerp docs/ontwerp/CLUB-UI-24-11.md): het tenue als eigen kaart, het wapen en de kleuren, het stadion, het aandeel met het dividend en de sponsors.
// Dezelfde kaarten staan op twee plekken: het tabblad Club in Land en bedrijf (clubHtml, met een kop) en het tabblad Club in Voetbal (clubBodyHtml). Geen eigen opslag: de aandelen en het tenue staan in het
// carrièreprofiel (gde-voetbalcarriere-v1); dit is een weergave met knoppen die de live-functies aanroepen (voetbalcarrierelive.js). Per speler: een aandeel is van jouw profiel en komt mee als je in andermans wereld
// meedoet (#449). De HTML komt uit pure functies (scripts/clubui_test.mjs); een koop of verkoop vraagt een tweede druk. Stadion en trainingsveld alleen uit echte data (het park van de club); geen data, geen vlak.
import * as V from './voetbalcarrierelive.js';
import * as C from './voetbalcarriere.js';
import * as B from './voetbalclub_bezit.js';
import * as S from './voetbalseason.js';
import * as Sp from './voetbalsponsors.js';
import { euro } from './geldtekst.js';
import * as KIT from './footballkit.js';
import { icoon } from './icons.js';
import { crestSvg, hexOf } from './voetbalwapen.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const cui = { msg: '', confirm: null };
const knop = (act, text, extra = '', { uit = false, primair = false } = {}) => `<button type="button" class="ds-z-knop${primair ? '' : ' ds-z-knop--secundair'}" data-cl="${act}"${extra}${uit ? ' disabled' : ''}>${text}</button>`;
const key = (act, id) => `${act}:${id}`;
const askOr = (act, id, text, sure, extra = '', uit = false) => (cui.confirm === key(act, id)
  ? `<span class="bd-zeker">${sure} ${knop(act, 'Ja', ` data-id="${esc(id)}" data-ok="1"${extra}`)} ${knop('annuleer', 'Nee')}</span>`
  : knop(act, text, ` data-id="${esc(id)}"${extra}`, { uit }));
const top = (extra = '') => `<div class="pm-pane-top"><span class="m-eb">Land en bedrijf</span><h2 class="m-h2 td-h2">Club</h2></div>${extra}`;
const kc = (k) => `<kbd class="ds-z-toets">${k}</kbd>`;
const balk = (deel, label) => `<span class="ds-z-balk" style="--ds-z-w:${Math.round(Math.max(0, Math.min(1, deel)) * 100)}%"><span class="ds-z-balk__baan"><span class="ds-z-balk__vul"></span></span><span class="ds-z-balk__label">${esc(label)}</span></span>`;
const tussen = (t, rest = '') => `<h3 class="ds-z-tussenkop">${t}${rest}</h3>`;
const feit = (n, l) => `<div class="ds-z-feit"><span class="ds-z-feit__n">${n}</span><span class="ds-z-feit__l">${l}</span></div>`;
// een kleurvlak in de clubkleur: een SVG, zodat de clubkleur (data) als fill staat en nooit als stijl
const vlak = (n, naam) => `<span class="vb-kleur"><svg class="vb-kleurvlak" viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="1" width="22" height="22" rx="4" fill="${hexOf(n)}" class="vb-kleurvlak__rand"/></svg>${esc(naam)}</span>`;

// Het wapen van een club met zijn klasgenoten (voor een eigen combinatie per klasse).
export function crestOf(c, getClub, id, maat = 'm') {
  const club = getClub && getClub(id); if (!club) return '';
  const div = S.divisionOf(c.world, id), ids = (div && c.world[div]) || [];
  return crestSvg(club, ids.map((x) => getClub(x)).filter(Boolean), maat);
}

// Het 2D-shirt: de terugval als het 3D-voorbeeld niet komt (WebGL faalt, een kapot voorbeeld, een leeg plaatje). Een shirtvorm in de clubkleuren met het patroon en het rugnummer; clubkleuren zijn gegevens (inline fill).
const SHIRT_D = 'M60 20 L84 8 Q100 26 116 8 L140 20 L190 52 L168 92 L148 82 L148 205 Q100 214 52 205 L52 82 L32 92 L10 52 Z';
export function shirt2dSvg(club, nr) {
  const shirt = hexOf(club && club.shirt), accent = hexOf(club && club.accent != null ? club.accent : club && club.broek);
  const pat = { 'brede-streep': `<rect x="70" y="0" width="60" height="220" fill="${accent}"/>`, helften: `<rect x="100" y="0" width="100" height="220" fill="${accent}"/>`, 'smalle-streep': [55, 90, 125].map((x) => `<rect x="${x}" y="0" width="14" height="220" fill="${accent}"/>`).join('') }[club && club.patroon] || '';
  return `<svg class="vb-shirt2d" viewBox="0 0 200 220" role="img" aria-label="Shirt met rugnummer ${esc(nr)}"><defs><clipPath id="vbsh"><path d="${SHIRT_D}"/></clipPath></defs><g clip-path="url(#vbsh)"><rect width="200" height="220" fill="${shirt}"/>${pat}</g><path d="${SHIRT_D}" class="vb-shirt2d__rand"/><text x="100" y="128" text-anchor="middle" class="vb-shirt2d__nr">${esc(nr)}</text></svg>`;
}

// Het tenue (voetbalkleding 22-11, docs/VOETBALKLEDING-22-11.md): het huidige clubtenue met een 3D-voorbeeld van het SHIRT, het niveau, de keuze thuis, uit of derde en een rugnummer.
// De toetsen 1, 2 en 3 kiezen het tenue, - en + het nummer (ook met de knoppen op een controller). kit = footballkit.kitView(); zonder carrière is er geen tenue.
export function kitHtml(kit, club = null) {
  if (!kit) return '';
  const names = { thuis: 'Thuis', uit: 'Uit', derde: 'Derde' };
  const vars = ['thuis', 'uit', 'derde'].map((v, i) => {
    const op = kit.variants.includes(v);
    return op ? `<button type="button" role="radio" data-cl="kitvar" data-id="${v}" aria-checked="${v === kit.variant}">${names[v]} ${kc(i + 1)}</button>` : `<button type="button" role="radio" aria-checked="false" aria-disabled="true" title="Een derde tenue krijg je vanaf Prof">${names[v]} · vanaf Prof</button>`;
  }).join('');
  const spons = kit.sponsor ? `Op het shirt: ${esc(kit.sponsor.name)}${kit.sponsor.lokaal ? ' (een lokaal bedrijf)' : ''}` : 'Nog geen sponsor op het shirt';
  return `<article class="ds-z-kaart ds-z-kaart--recht"><div class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">Tenue</h3><span>Niveau: ${esc(kit.naam)}</span></div>` +
    `<div class="vb-shirtvak">${shirt2dSvg(club, kit.number)}<img class="kit-shirt" alt="Voorbeeld van het shirt: ${esc(kit.shirtLabel)}" width="320" height="320" data-kit-shirt="${esc(kit.shirt)}" hidden></div>` +
    `<div class="vb-veldrij"><span class="vb-veldrij__l">Tenue</span><div class="ds-z-segment" role="radiogroup" aria-label="Kies je tenue">${vars}</div></div>` +
    `<div class="vb-veldrij"><span class="vb-veldrij__l">Rugnummer</span><div class="ds-z-stapper" role="group" aria-label="Kies je rugnummer"><button type="button" data-cl="kitnum" data-id="-1" aria-label="Nummer lager">−</button><output class="kit-nr" aria-live="polite">${kit.number}</output><button type="button" data-cl="kitnum" data-id="1" aria-label="Nummer hoger">+</button></div></div>` +
    `<div class="vb-veldrij"><span class="vb-veldrij__l">Sponsor</span><span>${spons}</span></div>` +
    `<p class="vb-tip">${esc(kit.fabric)}. Je draagt het tenue bij wedstrijd, training en penalty's; daarna krijg je je eigen kleren terug. Het shirt zit ook in je kast onder Sport.${kit.promo ? ` ${esc(kit.promo)}` : ''}</p></article>`;
}

// Het wapen, de kleuren en (alleen met data) het stadion en het trainingsveld van de club.
function profielHtml(c, getClub) {
  const club = getClub(c.club); if (!club) return '';
  const patroon = { effen: 'effen', 'brede-streep': 'brede streep', helften: 'helften', 'smalle-streep': 'smalle streep' }[club.patroon] || 'effen';
  const kleuren = `<div class="vb-twee-vlak">${crestOf(c, getClub, c.club, 'xl')}<div class="vb-kolom" style="gap:var(--ds-s-3)"><div class="vb-kleuren">${vlak(club.shirt, 'Shirt')}${vlak(club.broek, 'Broek')}${club.accent !== club.shirt ? vlak(club.accent, 'Accent') : ''}</div><span class="vb-feit"><small>Patroon</small><b>${patroon}</b></span></div></div>`;
  const feiten = [];
  if (club.stadion) feiten.push(feit(club.stadion === 'euroborg' ? 'Euroborg' : esc(club.stadion), 'thuis in het stadion'));
  if (club.park && Number.isFinite(club.park.f)) feiten.push(feit(club.park.f, `${club.park.f === 1 ? 'veld' : 'velden'} op het park${club.plaats ? ` in ${esc(club.plaats)}` : ''}`));
  if (Array.isArray(club.trainingsvelden) && club.trainingsvelden.length) feiten.push(feit(club.trainingsvelden.length, `${club.trainingsvelden.length === 1 ? 'trainingsveld' : 'trainingsvelden'} erbij`));
  return `<article>${tussen('Wapen en kleuren')}${kleuren}</article>` + (feiten.length ? `<article>${tussen('Stadion en trainingsveld')}<div class="vb-feiten">${feiten.join('')}</div></article>` : '');
}

// Het aandeel: dicht met de echte voorwaarde, open met bezit, dividend en de koopkeuzes.
function aandeelHtml(c, money, getClub) {
  if (!B.isVisible(c)) {
    const nodig = C.SHARE_READY_EARNED, nu = (c.stats && c.stats.earned) || 0;
    return `<article>${tussen('Aandeel en dividend')}<div class="vb-slot">${icoon('slot', { cls: 'vb-ico' })}<div class="vb-slot__tekst"><b>Aandeel kopen: nog dicht.</b> Dat kan zodra je ${euro(nodig)} met voetbal hebt verdiend, of manager van je club wordt.${balk(nu / nodig, `${euro(nu)} van ${euro(nodig)}`)}</div></div></article>`;
  }
  const held = C.clubSharesOf(c), div = C.divisionOfMyClub(c) || 'talent', have = (c.bezit.clubs[c.club] || {}).aandeel || 0;
  const perRonde = C.clubDividends(c, getClub).reduce((a, x) => a + x.amount, 0);
  const tiles = `<div class="vb-feiten">${feit(held.length, held.length === 1 ? 'club in bezit' : 'clubs in bezit')}${feit(euro(perRonde), 'Dividend per ronde')}${feit(euro(held.reduce((a, h) => a + h.prijs, 0)), 'Aanschaf samen')}</div>`;
  const rows = held.map((h) => {
    const sell = Math.round(h.prijs * B.VERKOOP_FACTOR);
    return `<div class="vb-sponsor" data-row="${esc(h.club)}"><span><b>${esc(C.nameOf(getClub, h.club))}</b><small>${Math.round(h.aandeel * 100)}% · sinds speldag ${h.sinds} · gekocht voor ${euro(h.prijs)}</small></span><span></span><span class="bd-acties">${askOr('verkoop', h.club, `Verkoop voor ${euro(sell)}`, `Verkopen voor ${euro(sell)}? Dat is 75% van de aankoop.`)}</span></div>`;
  }).join('');
  const buy = B.SHARES.filter((x) => have + x <= 1 + 1e-9).map((x) => {
    const r = B.canBuy(c, c.club, div, x, money), prijs = B.priceOf(div, x, B.ownedCount(c.bezit));
    return askOr('koop', `${c.club}|${x}`, `${Math.round(x * 100)}% voor ${euro(prijs)}`, `${Math.round(x * 100)}% kopen voor ${euro(prijs)}?`, '', !r.ok);
  }).join(' ');
  return `<article>${tussen('Aandeel en dividend')}${tiles}<p class="vb-tip">Een aandeel keert na elke competitieronde een deel van de winst uit, meer als je club hoger staat. Je koopt nooit je spaargeld leeg: een kwart van je geld blijft over. Verkopen levert 75% op.</p>` +
    `${rows || '<p class="vb-tip">Nog geen aandelen.</p>'}<div class="vb-acties" style="margin-top:var(--ds-s-3)">${buy || '<span class="vb-tip">Je bezit de hele club.</span>'}</div></article>`;
}

// De sponsors van dit seizoen: elk aanbod met bedrag en doel; aangenomen rijen staan gemarkeerd.
function sponsorsHtml(c) {
  const slots = (c.sponsors && c.sponsors.slots) || [];
  if (!slots.length) return `<article class="vol">${tussen('Sponsors')}<div class="ds-z-leeg"><p class="ds-z-leeg__kop">Geen sponsors dit seizoen</p><p class="ds-z-leeg__tekst">Aan het begin van een seizoen komen er nieuwe aanbiedingen.</p></div></article>`;
  const aan = slots.filter((s) => s.accepted).length;
  const rij = slots.map((s) => {
    const pand = s.accepted ? (Number.isFinite(s.osm) ? ' · pand gevonden: koop het bij Bedrijven' : ' · nog geen pand') : '';
    const wat = s.paid ? '<span class="vb-ja">✓ Betaald</span>' : s.accepted ? '<span class="vb-ja">✓ Aangenomen</span>' : `<button type="button" class="ds-z-knop ds-z-knop--secundair" data-cl="sponsor" data-id="${esc(s.id)}">Neem aan</button>`;
    return `<div class="vb-sponsor${s.accepted ? ' vb-sponsor--aan' : ''}" data-sponsor="${esc(s.id)}"><span><b>${esc(s.naam)}</b><small>${esc(Sp.SORTS[s.sort].naam)} · ${esc(Sp.GOALS[s.goal].tekst)}${pand}</small></span><span class="vb-sponsor__bedrag">${euro(s.amount)}</span>${wat}</div>`;
  }).join('');
  return `<article class="vol">${tussen('Sponsors', `<small>${slots.length} aanbiedingen, ${aan} aangenomen</small>`)}${rij}<p class="vb-tip">Een sponsor betaalt bij zijn doel. Zijn pand kun je kopen bij Bedrijven, met hooguit 10% klantenbonus op wedstrijddagen.</p></article>`;
}

// De kaarten van het tabblad Club (zonder kop): zonder carrière een uitleg, anders tenue, wapen, stadion, aandeel en sponsors.
export function clubBodyHtml(view) {
  const c = view && view.career, getClub = (view && view.getClub) || (() => null), money = Math.max(0, Math.floor((view && view.money) || 0));
  if (!C.hasCareer(c)) return '<div class="ds-z-leeg"><p class="ds-z-leeg__kop">Nog geen voetbalcarrière</p><p class="ds-z-leeg__tekst">Zodra je bij een club speelt en genoeg verdiend hebt, kun je hier een aandeel in een club kopen. Begin klein: het eerste aandeel komt na je eerste verdiensten uit het voetbal.</p></div>';
  const msg = (view && view.msg) || '';
  return `${msg ? `<p class="vb-tip" role="status">${esc(msg)}</p>` : ''}<div class="vb-clubraster">${kitHtml(view && view.kit, getClub(c.club))}<div class="vb-kolom" style="gap:var(--ds-s-5)">${profielHtml(c, getClub)}${aandeelHtml(c, money, getClub)}</div>${sponsorsHtml(c)}</div>`;
}
// view = { career, money, getClub, msg, confirm, kit }: zo is de HTML een pure functie van de stand.
export function clubHtml(view) {
  return top() + clubBodyHtml(view);
}

const bound = new WeakSet();
export const clubView = (world, extra = {}) => ({ career: V.getCareer(), money: world && world.money, getClub: V.getClub, msg: cui.msg, confirm: cui.confirm, kit: KIT.kitView(V.getCareer(), V.getClub), ...extra });
export function renderClubPanel(el, world) {
  if (!el) return;
  const draw = () => { el.innerHTML = clubHtml(clubView(world)); kitPhotos(el); };
  draw();
  if (bound.has(el)) return;
  bound.add(el);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cl]');
    if (!b) return;
    clubAct(world, b.dataset);
    draw();
  });
  // het tenue met het toetsenbord (en de knoppen voor een controller): 1, 2 en 3 kiezen thuis, uit of derde; - en + het rugnummer. Alleen als de focus in het paneel staat.
  el.addEventListener('keydown', (e) => { if (clubKeys(e, world, el)) draw(); });
}
// De toetsen van het tenue; geeft true als er iets veranderde (de aanroeper tekent opnieuw).
export function clubKeys(e, world, el) {
  if (e.ctrlKey || e.altKey || e.metaKey || !el.querySelector('[data-cl="kitvar"]')) return false;
  const nr = { '1': 0, '2': 1, '3': 2 }[e.key];
  const kit = KIT.kitView(V.getCareer(), V.getClub);
  if (!kit) return false;
  if (nr != null && kit.variants[nr]) { clubAct(world, { cl: 'kitvar', id: kit.variants[nr] }); e.preventDefault(); return true; }
  if (e.key === '-' || e.key === '+' || e.key === '=') { clubAct(world, { cl: 'kitnum', id: e.key === '-' ? '-1' : '1' }); e.preventDefault(); return true; }
  return false;
}

// Het 3D-voorbeeld van het shirt (alleen het stuk): de gedeelde voorbeeldrenderer, pas geladen als het paneel echt open gaat (de pure test laadt three niet).
export function kitPhotos(el) {
  const img = el.querySelector && el.querySelector('img[data-kit-shirt]');
  if (!img || typeof document === 'undefined') return;
  const piece = img.getAttribute('data-kit-shirt');
  // het 2D-shirt staat er al; het 3D-voorbeeld vervangt hem pas als het een echt, niet-leeg plaatje is (zonder WebGL of bij 'too many errors' blijft het 2D-shirt staan)
  const toon = (url) => { if (!url || !img.isConnected) return; const t = new Image(); t.onload = () => { if (img.isConnected && plaatjeHeeftInhoud(t)) { img.src = url; img.hidden = false; const d = el.querySelector('.vb-shirt2d'); if (d) d.setAttribute('hidden', ''); } }; t.src = url; };
  import('./vehiclepreview.js').then((m) => { m.renderSnapshot({ kind: 'piece', piece }, 320, 320, toon, { angle: 0.6 }); }).catch(() => { /* het 2D-shirt blijft */ });
}
// Een plaatje is leeg als geen enkele pixel iets heeft (een mislukte WebGL-render geeft een doorzichtig vlak).
export function plaatjeHeeftInhoud(im) {
  try {
    const c = document.createElement('canvas'); c.width = c.height = 24;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0, 24, 24);
    const d = g.getImageData(0, 0, 24, 24).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 8) return true;
    return false;
  } catch (e) { return true; }   // kan het niet gemeten worden, dan vertrouwen we het plaatje
}
export function clubAct(world, d) {
  const a = d.cl, id = d.id || '', ok = d.ok === '1';
  const ask = (name) => { if (!ok) { cui.confirm = key(name, id); cui.msg = ''; return true; } cui.confirm = null; return false; };
  if (a === 'annuleer') cui.confirm = null;
  else if (a === 'koop') { if (!ask(a)) { const [club, share] = id.split('|'); const r = V.buyShare(world, club, Number(share)); cui.msg = r.ok ? `Aandeel gekocht voor ${euro(r.price)}.` : r.reason || 'Dat lukt nu niet.'; } }
  else if (a === 'kitvar') { V.replaceCareer(KIT.withKitChoice(V.getCareer(), { variant: id })); cui.msg = ''; }
  else if (a === 'kitnum') { const c = V.getCareer(), nu = KIT.kitChoice(c).number, n = Math.max(1, Math.min(99, nu + (Number(id) || 0))); V.replaceCareer(KIT.withKitChoice(c, { number: n })); }
  else if (a === 'verkoop') { if (!ask(a)) { const r = V.sellShare(world, id); cui.msg = r.ok ? `Aandeel verkocht voor ${euro(r.price)}.` : r.reason || 'Dat lukt nu niet.'; } }
  else if (a === 'sponsor') { const c = V.getCareer(), r = C.acceptSponsor(c, id, V.getSponsorPandIndex(), V.clubPlace(c.club)); if (r.ok) V.replaceCareer(r.career); cui.msg = r.ok ? 'Sponsor getekend.' : r.reason || 'Dat lukt nu niet.'; }
}
