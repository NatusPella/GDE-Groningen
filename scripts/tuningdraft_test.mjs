// De pimp-werkplaats zonder DOM (game/js/tuningdraft.js en tuningoffer.js, epic Autotuning #1155): concept, kosten,
// aanbod per garage en dag, tabbladen, groepen, effecten en vergrendelen. Pure test.
import {
  makeState, sameState, changeField, changePart, applyBuild, resetToStock, quote, canInstall, tabsFor, tabChanges, groupsFor, effectRows, changedEffectRows,
  summaryText, levelText, stateCode, DEFAULT_PAINT_PRICE, CATEGORY_IDS,
} from '../game/js/tuningdraft.js';
import { garageLevel, dailyDeals, offerPrice, offerState, orderedOptions, tierOf, tierOfPrice, dealLines, DEAL_COUNT, DEAL_DISCOUNT } from '../game/js/tuningoffer.js';
import { OPTIONS, lookCode, parseLook, fieldPrice, generateLook } from '../game/js/vehiclelook.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };

// --- het aanbod ---------------------------------------------------------------------------------------
const sites = Array.from({ length: 200 }, (_, i) => ({ id: 'g' + i, kind: 'garage' }));
const levels = sites.map(garageLevel);
ok([1, 2, 3].every((l) => levels.filter((x) => x === l).length > 10), 'alle niveaus komen voor', JSON.stringify([1, 2, 3].map((l) => levels.filter((x) => x === l).length)));
ok(garageLevel({ kind: 'thuis' }) === 3 && garageLevel(null) === 1, 'thuis is altijd niveau 3');
ok(sites.map((s) => garageLevel({ ...s, kind: 'pomp' })).every((l) => l <= 2), 'een pomp hoogstens niveau 2');
ok(garageLevel(sites[3]) === garageLevel({ ...sites[3] }), 'niveau is stabiel');
ok(tierOfPrice(0) === 0 && tierOfPrice(34) === 0 && tierOfPrice(35) === 1 && tierOfPrice(60) === 2 && tierOf('spoiler', 'gt') === 2 && tierOf('spoiler', 'none') === 0, 'lagen uit de prijs');
const low = { id: 'laag', kind: 'garage' };
const lowSite = sites.find((s) => garageLevel(s) === 1), midSite = sites.find((s) => garageLevel(s) === 2), topSite = sites.find((s) => garageLevel(s) === 3);
ok(offerState(lowSite, 'spoiler', 'none').ok && offerState(lowSite, 'hanger', 'tree').ok && !offerState(lowSite, 'spoiler', 'lip').ok, 'niveau 1: basis wel, standaard niet');
ok(offerState(midSite, 'spoiler', 'lip').ok && !offerState(midSite, 'spoiler', 'gt').ok && /grote garage/.test(offerState(midSite, 'spoiler', 'gt').reason), 'niveau 2: standaard wel, premium niet');
ok(offerState(topSite, 'spoiler', 'gt').ok && offerState(topSite, 'kit', 'wide').ok, 'niveau 3: alles');
ok(offerState(lowSite, 'color2', '#ffffff').ok && offerState(lowSite, 'glow', '#6fd3e0').ok, 'kleurvelden overal');
const dealsA = dailyDeals(topSite, 10), dealsB = dailyDeals(topSite, 10), dealsC = dailyDeals(topSite, 11);
ok(dealsA.length === DEAL_COUNT && JSON.stringify(dealsA) === JSON.stringify(dealsB), 'drie dagaanbiedingen, stabiel binnen een dag');
ok(JSON.stringify(dealsA) !== JSON.stringify(dailyDeals(topSite, 11)) || JSON.stringify(dealsA) !== JSON.stringify(dailyDeals(topSite, 12)), 'het aanbod wisselt per dag');
ok(JSON.stringify(dealsA) !== JSON.stringify(dailyDeals(sites[7], 10)) || JSON.stringify(dealsA) !== JSON.stringify(dailyDeals(sites[8], 10)), 'garages verschillen onderling');
ok(new Set(dealsA.map((d) => d.field + d.id)).size === DEAL_COUNT, 'geen dubbele aanbiedingen');
const d0 = dealsA[0];
const dealP = offerPrice(topSite, 10, 'auto', d0.field, d0.id), baseP = fieldPrice(d0.field, d0.id);
ok(dealP.deal && dealP.price === Math.max(1, Math.round(baseP * (1 - DEAL_DISCOUNT))) && dealP.base === baseP, 'dagaanbieding is 25% goedkoper');
ok(!offerPrice(topSite, 10, 'auto', 'hanger', 'none').deal && offerPrice(topSite, 10, 'auto', 'hanger', 'none').price === 0, 'standaard kost niets');
ok(dailyDeals(topSite, 10, 'boot').every((d) => ['finish', 'color2', 'stripe', 'decal'].includes(d.field)), 'aanbiedingen volgen het soort');
ok(dealLines(topSite, 10, 'auto', (f, id) => id).length === 3 && dealLines(topSite, 10, 'auto', (f, id) => id)[0].price < dealLines(topSite, 10, 'auto', (f, id) => id)[0].base, 'dealLines');
ok(orderedOptions({ region: 'stad' }, 'finish')[0].id === 'gloss' && orderedOptions({ region: 'stad' }, 'finish')[1].id === 'pearl', 'stad zet parelmoer voorop');
ok(orderedOptions({ region: 'platteland' }, 'finish')[1].id === 'matte', 'platteland zet mat voorop');
ok(orderedOptions({ region: 'stad' }, 'finish').length === OPTIONS.finish.length && orderedOptions(null, 'tint')[0].id === '0', 'volgorde laat niets weg en houdt de standaard eerst');

// --- het concept en de kosten ----------------------------------------------------------------------------
const inst = makeState({ look: {}, parts: {}, body: '#2e5f9e' });
let st = inst;
ok(sameState(st, inst), 'een kopie is gelijk');
st = changeField(st, 'spoiler', 'wing', 'auto');
ok(st.look.spoiler === 'wing' && !inst.look.spoiler, 'veld gezet zonder het origineel aan te raken');
ok(changeField(st, 'spoiler', 'bestaat-niet', 'auto') === st && changeField(st, 'spoiler', 'gt', 'boot') === st, 'onzin of onpasbare keuze verandert niets');
st = changeField(st, 'body', '#E8505B', 'auto');
ok(st.body === '#e8505b' && changeField(st, 'body', 'rood', 'auto') === st, 'carrosseriekleur gezet, onzin genegeerd');
st = changePart(st, 'ophanging', 'h-laag', 'auto');
ok(st.parts.ophanging === 'h-laag' && changePart(st, 'ophanging', 'b-race', 'auto') === st && changePart(st, 'ophanging', 'h-laag', 'tweewieler') === st, 'onderdeel gezet, verkeerd onderdeel of soort genegeerd');
st = changePart(st, 'ophanging', null, 'auto');
ok(!st.parts.ophanging, 'onderdeel eraf');
const ctx = { site: topSite, dayIndex: 5, kind: 'auto', partsKind: 'auto' };
let q = quote(st, inst, ctx);
const wingPrice = offerPrice(topSite, 5, 'auto', 'spoiler', 'wing').price;
ok(q.changed === 2 && q.total === wingPrice + DEFAULT_PAINT_PRICE, 'kosten = spoiler (met eventuele korting) + lak', JSON.stringify(q));
ok(quote(inst, inst, ctx).total === 0 && quote(inst, inst, ctx).changed === 0, 'niets veranderd kost niets');
const withParts = changePart(changePart(inst, 'banden', 'b-race', 'auto'), 'ophanging', 'h-sport', 'auto');
ok(quote(withParts, inst, ctx).total === 60 + 55 && quote(withParts, inst, ctx).lines.length === 2, 'onderdelen kosten hun prijs');
ok(quote(inst, withParts, ctx).total === 0 && quote(inst, withParts, ctx).lines.length === 2, 'onderdelen eraf is gratis');
// inruil
const installed2 = makeState({ look: { spoiler: 'gt' } }, 'auto');
ok(quote(changeField(installed2, 'spoiler', 'wing', 'auto'), installed2, { ...ctx, site: topSite, dayIndex: 5 }).total === Math.max(0, offerPrice(topSite, 5, 'auto', 'spoiler', 'wing').price - 42), 'inruil: helft van de oude spoiler');
ok(quote(changeField(installed2, 'spoiler', null, 'auto'), installed2, ctx).total === 0, 'terug naar standaard is gratis');
// vergrendeld
const lockedQ = quote(changeField(inst, 'spoiler', 'gt', 'auto'), inst, { ...ctx, site: lowSite });
ok(lockedQ.locked.length === 1 && /garage/.test(lockedQ.locked[0].locked), 'een premium onderdeel is in een kleine garage vergrendeld');
ok(!canInstall(changeField(inst, 'spoiler', 'gt', 'auto'), inst, { ...ctx, site: lowSite }, 9999).ok && /garage/.test(canInstall(changeField(inst, 'spoiler', 'gt', 'auto'), inst, { ...ctx, site: lowSite }, 9999).reason), 'niet te installeren zonder niveau');
ok(canInstall(st, inst, ctx, 9999).ok && !canInstall(st, inst, ctx, 10).ok && canInstall(st, inst, ctx, 10).reason === 'Te weinig geld', 'installeren hangt van het geld af');
ok(canInstall(inst, inst, ctx, 9999).reason === 'Niets veranderd', 'niets te installeren');
ok(summaryText(q) === '2 wijzigingen' && summaryText(quote(inst, inst, ctx)) === 'Niets veranderd' && summaryText({ changed: 1 }) === '1 wijziging', 'samenvatting');
ok(/Niveau [123] van 3/.test(levelText(topSite)), 'niveautekst');

// --- tabbladen en groepen ---------------------------------------------------------------------------------------
const tabs = tabsFor('auto');
ok(tabs.map((t) => t.id).join() === 'lak,strepen,velgen,carrosserie,licht,details,onderdelen,builds', 'tabbladen van een auto', tabs.map((t) => t.id).join());
ok(tabsFor('snackwagen').some((t) => t.id === 'snack') && !tabs.some((t) => t.id === 'snack', 'geen snack-tab voor een auto') , 'snack-tab alleen bij de snackwagen');
ok(tabsFor('boot', 'auto').map((t) => t.id).join() === 'lak,strepen,onderdelen,builds', 'een boot heeft minder tabbladen', tabsFor('boot').map((t) => t.id).join());
ok(CATEGORY_IDS.includes('lak'), 'categorie-ids');
const lak = groupsFor(tabs[0], st, inst, ctx, 500);
ok(lak[0].field === 'body' && lak[0].type === 'color' && lak[0].palette.some((c) => c.state === 'on' || true) && lak[1].field === 'finish' && lak[2].field === 'color2', 'lak-tab: kleur, afwerking, tweede kleur');
const finish = lak[1];
ok(finish.options[0].id === 'gloss' && finish.options.find((o) => o.state === 'on').id === 'gloss', 'afwerking: standaard staat aan');
ok(finish.options.find((o) => o.id === 'pearl').price === offerPrice(topSite, 5, 'auto', 'finish', 'pearl').price, 'optieprijs volgt het aanbod');
const carr = groupsFor(tabs[3], st, inst, ctx, 500);
const sp = carr.find((g) => g.field === 'spoiler');
ok(sp.options.find((o) => o.id === 'wing').state === 'on' && sp.options.find((o) => o.id === 'none').state === '', 'spoiler wing staat aan in het concept');
const carrLow = groupsFor(tabs[3], inst, inst, { ...ctx, site: lowSite }, 500).find((g) => g.field === 'spoiler');
ok(carrLow.options.find((o) => o.id === 'gt').locked && !carrLow.options.find((o) => o.id === 'none').locked, 'vergrendelde optie zichtbaar met reden');
ok(groupsFor(tabs[3], inst, inst, ctx, 5).find((g) => g.field === 'kit').options.find((o) => o.id === 'wide').tooExpensive === true, 'te duur wordt gemarkeerd');
const det = groupsFor(tabs[5], st, inst, ctx);
ok(det.find((g) => g.field === 'plate').type === 'text' && det.find((g) => g.field === 'hanger').type === 'enum', 'details: nummerbord is tekst');
const parts = groupsFor(tabs[6], withParts, inst, ctx);
ok(parts.length === 6 && parts.find((g) => g.field === 'ophanging').options.length === 1 + 4 && parts.find((g) => g.field === 'ophanging').options.find((o) => o.id === 'h-sport').state === 'on', 'onderdelen-tab: zes onderdelen met standaard erbij');
ok(groupsFor(tabs[6], inst, inst, { ...ctx, partsKind: 'tweewieler' }).find((g) => g.field === 'ophanging').options.length === 1 + 2, 'tweewieler: minder ophanging');
ok(groupsFor(tabs[2], st, inst, ctx)[1].type === 'color' && groupsFor(tabs[2], st, inst, ctx)[1].noneLabel === 'Geen', 'velgkleur is een kleurgroep');

// tabbladen: wijzigingen tellen
ok(tabChanges(tabs[0], st, inst, 'auto') === 1 && tabChanges(tabs[3], st, inst, 'auto') === 1 && tabChanges(tabs[1], st, inst, 'auto') === 0, 'wijzigingen per tab');
ok(tabChanges(tabs[6], withParts, inst, 'auto') === 2 && tabChanges(tabs[7], st, inst, 'auto') === 0, 'onderdelen-tab telt mee, builds niet');

// effecten
const rows = effectRows({}, { ophanging: 'h-laag', banden: 'b-race' });
ok(rows.find((r) => r.key === 'draai').after === 107 && rows.find((r) => r.key === 'comfort').after === 80 && rows.find((r) => r.key === 'grip').after === 120, 'effecten voor en na', JSON.stringify(rows.map((r) => [r.key, r.before, r.after])));
ok(changedEffectRows({}, {}).length === 0 && changedEffectRows({}, { uitlaat: 'u-knal' }).map((r) => r.key).sort().join() === 'geluid,opvallend', 'alleen veranderde rijen');

// builds en terugzetten
const code = lookCode({ spoiler: 'lip', stripe: 'racing', color2: '#ffffff' });
const built = applyBuild(inst, code, 'auto');
ok(built.look.spoiler === 'lip' && built.look.stripe === 'racing' && built.body === inst.body, 'een build zet de look maar laat de lak');
ok(applyBuild(inst, 'nep', 'auto') === inst, 'een kapotte build verandert niets');
ok(stateCode(built, 'auto') === code, 'code van het concept');
ok(sameState(resetToStock(st), makeState({ body: '#e8505b' })), 'terug naar kaal (de lak blijft)');
ok(Object.keys(parseLook(stateCode(changeField(inst, 'plate', 'ZOMER 21', 'auto'), 'auto'))).includes('plate'), 'nummerbord in de code');

// een gegenereerde world-look is ook een geldige build voor een werkplaats
for (let i = 0; i < 40; i++) { const g = generateLook(i); const b = applyBuild(inst, lookCode(g.look), 'auto'); ok(quote(b, inst, ctx).changed >= 1, 'gegenereerde look is een build', String(i)); if (fails) break; }

console.log(`tuningdraft_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
