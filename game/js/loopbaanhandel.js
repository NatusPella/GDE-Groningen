// Handel tussen spelers (#1380, deel 3; ontwerp en pure logica, nog niet aan het spel of het net gekoppeld): zaaigoed, mest, oogst en andere goederen via een eigen aanbod, nooit een ruil
// midden in de lucht. Geen DOM, geen netwerk (scripts/loopbaanhandel_test.mjs). Elke speler boekt zijn eigen kant in zijn eigen opslag (#429); de berichten zijn gewone objecten die het
// bestaande JSON-gebeurtenissenkanaal kan dragen (k 'handel', zoals 'crew' en 'bezit': een oude client negeert ze).
//
// De regel is: niemand verliest geld, en elk bedrag is bij een speler of in een betaling die herhaald wordt tot de ontvanger bevestigt. De volgorde is
//   1. de verkoper heeft een aanbod (goed, aantal, prijs); de koper neemt het (neem);
//   2. de verkoper zet de goederen opzij in een eigen reservering (stock gaat naar reserve) en stuurt ze als levering; de koper kan ze nog niet gebruiken (wacht);
//   3. de koper betaalt: zijn geld gaat eraf en tegelijk komen de goederen vrij. Die betaling blijft in zijn journaal 'onderweg' tot de verkoper bevestigt;
//   4. de verkoper rekent af: het geld erbij, de reservering is verbruikt, bevestiging terug. Een herhaald bericht doet niets.
// Valt iemand weg voor stap 3, dan zet de verkoper de reservering terug en gooit de koper de wachtende goederen weg: alles is zoals het was. Valt iemand weg na stap 3, dan herhaalt de
// koper de betaling bij de volgende ontmoeting (open()) en rekent de verkoper alsnog af, ook als hij de reservering al terugzette (dan haalt hij de goederen er weer af, voor zover
// hij ze nog heeft; heeft hij ze niet meer, dan staan ze tweemaal in het spel: een eerlijke fout, geen verlies). Eén aanbod, één koper (de eerste die het neemt).
export const MAX_AANTAL = 9999;
export const MAX_PRIJS = 100000;
export const GOED_RE = /^[a-z][a-z0-9-]{1,23}$/;
const heel = (x, max) => (Number.isFinite(Number(x)) ? Math.max(0, Math.min(max, Math.floor(Number(x)))) : 0);

// Een speler: geld, goederen (stock) en het eigen journaal. De spelopslag koppelt money en stock aan zijn echte velden; dit is het model ervan.
export function maakHandelaar(id, { money = 0, stock = {} } = {}) {
  return { id, money: heel(money, 1e9), stock: { ...stock }, reserve: {}, wacht: {}, aanbod: {}, journaal: {} };
}
const stockVan = (P, goed) => Math.max(0, Math.floor(Number(P.stock[goed]) || 0));
const geldigAanbod = (a) => a && GOED_RE.test(String(a.goed)) && heel(a.aantal, MAX_AANTAL) >= 1 && heel(a.prijs, MAX_PRIJS) >= 0 && typeof a.id === 'string' && a.id.length > 0 && a.id.length <= 40;

// 1. De verkoper maakt een aanbod. De goederen blijven van hem tot iemand het neemt; hij kan niet meer aanbieden dan hij heeft (andere open aanbiedingen tellen mee).
export function biedAan(P, { id, goed, aantal, prijs }) {
  const a = { id, goed, aantal: heel(aantal, MAX_AANTAL), prijs: heel(prijs, MAX_PRIJS) };
  if (!geldigAanbod(a) || P.aanbod[id] || P.journaal[id]) return null;
  const toegezegd = Object.values(P.aanbod).filter((x) => x.goed === goed && x.fase === 'open').reduce((s, x) => s + x.aantal, 0);
  if (stockVan(P, goed) - toegezegd < a.aantal) return null;
  P.aanbod[id] = { ...a, fase: 'open' };
  return { a: 'aanbod', ...a };
}
export function trekIn(P, id) { const o = P.aanbod[id]; if (!o || o.fase !== 'open') return false; delete P.aanbod[id]; return true; }

// 2. De koper neemt het aanbod (hij kent alleen het bericht van de verkoper). Geeft het neem-bericht. Zijn eigen aanbod nemen kan niet.
export function neem(K, aanbod, van) {
  if (!geldigAanbod(aanbod) || van === K.id || K.journaal[aanbod.id]) return null;
  K.journaal[aanbod.id] = { rol: 'koper', fase: 'gekozen', van, goed: aanbod.goed, aantal: aanbod.aantal, prijs: aanbod.prijs };
  return { a: 'neem', id: aanbod.id };
}
// De verkoper ontvangt 'neem' van `van`: de eerste wint, de goederen gaan naar de reservering. Geeft het leveringsbericht of null (al genomen, weg of te weinig).
export function levering(V, body, van) {
  const o = body && V.aanbod[body.id];
  if (!o || o.fase !== 'open' || van === V.id || stockVan(V, o.goed) < o.aantal) return null;
  V.stock[o.goed] = stockVan(V, o.goed) - o.aantal;
  V.reserve[o.id] = o.aantal;
  o.fase = 'gereserveerd';
  V.journaal[o.id] = { rol: 'verkoper', fase: 'gereserveerd', met: van, goed: o.goed, aantal: o.aantal, prijs: o.prijs };
  return { a: 'levering', id: o.id, goed: o.goed, aantal: o.aantal, prijs: o.prijs };
}
// De koper ontvangt de levering: de goederen staan klaar maar zijn nog niet van hem. Is wat er komt niet wat hij koos, dan weigert hij. Geeft null als alles klopt en anders het weigerbericht.
export function ontvang(K, body, van) {
  const j = body && K.journaal[body.id];
  if (!j || j.rol !== 'koper' || j.fase !== 'gekozen' || j.van !== van) return { a: 'weiger', id: body && body.id };
  if (j.goed !== body.goed || j.aantal !== body.aantal || j.prijs !== body.prijs) { j.fase = 'afgewezen'; return { a: 'weiger', id: body.id }; }
  j.fase = 'wacht'; K.wacht[body.id] = true;
  return null;
}

// 3. De koper betaalt: geld eraf en de goederen komen vrij, in één stap. Te weinig geld: er gebeurt niets en de verkoper krijgt zijn goederen terug (weiger).
export function betaal(K, id) {
  const j = K.journaal[id];
  if (!j || j.rol !== 'koper' || j.fase !== 'wacht') return null;
  if (K.money < j.prijs) { j.fase = 'afgewezen'; delete K.wacht[id]; return { a: 'weiger', id, reden: 'geld' }; }
  K.money -= j.prijs; K.stock[j.goed] = stockVan(K, j.goed) + j.aantal;
  delete K.wacht[id];
  j.fase = 'onderweg';                                                     // betaald, nog niet bevestigd
  return { a: 'betaald', id, prijs: j.prijs };
}
// 4. De verkoper rekent af. Geeft het bevestigingsbericht, ook bij een herhaald bericht (zonder nog eens te boeken); null bij iets onbekends.
export function afrekenen(V, body, van) {
  const j = body && V.journaal[body.id];
  if (!j || j.rol !== 'verkoper' || j.met !== van || body.prijs !== j.prijs) return null;
  if (j.fase === 'afgerekend') return { a: 'bevestig', id: body.id };
  if (j.fase === 'gereserveerd') { V.money += j.prijs; delete V.reserve[body.id]; }
  else if (j.fase === 'teruggezet') { V.money += j.prijs; V.stock[j.goed] = Math.max(0, stockVan(V, j.goed) - j.aantal); }   // de betaling kwam toch nog: de goederen gaan er weer af
  else return null;
  j.fase = 'afgerekend'; delete V.aanbod[body.id];
  return { a: 'bevestig', id: body.id };
}
export function bevestig(K, body) {
  const j = body && K.journaal[body.id];
  if (!j || j.rol !== 'koper' || j.fase !== 'onderweg') return false;
  j.fase = 'klaar'; return true;
}

// Annuleren of weigeren voor de betaling: de verkoper zet zijn reservering terug en het aanbod staat weer open of is weg.
export function zetTerug(V, id, { heropen = true } = {}) {
  const j = V.journaal[id];
  if (!j || j.rol !== 'verkoper' || j.fase !== 'gereserveerd') return false;
  V.stock[j.goed] = stockVan(V, j.goed) + (V.reserve[id] || 0); delete V.reserve[id];
  j.fase = 'teruggezet';
  if (V.aanbod[id]) { if (heropen) { V.aanbod[id].fase = 'open'; delete V.journaal[id]; } else delete V.aanbod[id]; }
  return true;
}
export function geefOp(K, id) { const j = K.journaal[id]; if (!j || j.rol !== 'koper' || (j.fase !== 'gekozen' && j.fase !== 'wacht')) return false; delete K.wacht[id]; j.fase = 'afgewezen'; return true; }

// Iemand valt weg. Verkoper: wat nog niet betaald is gaat terug in zijn stock. Koper: wachtende goederen vervallen. Een betaling die onderweg was blijft staan (open()).
export function weggevallen(P, ander) {
  let n = 0;
  for (const [id, j] of Object.entries(P.journaal)) {
    if (j.rol === 'verkoper' && j.met === ander && j.fase === 'gereserveerd') { zetTerug(P, id, { heropen: false }); n++; }
    else if (j.rol === 'koper' && j.van === ander && (j.fase === 'gekozen' || j.fase === 'wacht')) { delete P.wacht[id]; j.fase = 'afgewezen'; n++; }
  }
  return n;
}
// Bij de volgende ontmoeting met `ander`: de betalingen die nog niet bevestigd zijn, opnieuw te sturen (de ontvanger boekt ze één keer).
export const open = (K, ander) => Object.entries(K.journaal).filter(([, j]) => j.rol === 'koper' && j.fase === 'onderweg' && j.van === ander).map(([id, j]) => ({ a: 'betaald', id, prijs: j.prijs }));

// Voor de test en het spel: wat is er in totaal? Een reservering waarvan de koper al betaald heeft telt niet meer mee (de goederen zijn dan van de koper). Geld telt de betalingen mee die onderweg zijn en nog niet door de verkoper geboekt (anders zou het geld even verdwenen lijken).
export function totalen(spelers) {
  const nodig = {};
  for (const P of spelers) for (const [id, j] of Object.entries(P.journaal)) if (j.rol === 'koper' && j.fase === 'onderweg') nodig[id] = { prijs: j.prijs, van: j.van };
  let geld = 0; const goed = {};
  for (const P of spelers) {
    geld += P.money;
    for (const [g, a] of Object.entries(P.stock)) goed[g] = (goed[g] || 0) + a;
    for (const [id, a] of Object.entries(P.reserve)) { const j = P.journaal[id]; if (j && !nodig[id]) goed[j.goed] = (goed[j.goed] || 0) + a; }
  }
  for (const [id, b] of Object.entries(nodig)) { const v = spelers.find((P) => P.id === b.van); const jv = v && v.journaal[id]; if (!jv || jv.fase !== 'afgerekend') geld += b.prijs; }
  return { geld, goed };
}
