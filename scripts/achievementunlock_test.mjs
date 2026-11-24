// De prestatie als moment (game/js/achievementunlock.js) en de microanimatie-helpers (game/js/dsmicro.js): staffeltijden,
// de wachtrij, de tellerstappen en het menuplan. Pure logica, geen browser.
//   node scripts/achievementunlock_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as P from '../game/js/achievementunlock.js';
import * as D from '../game/js/dsmicro.js';
import { FAST_MS, STEP_MS, MAX_TOTAAL_MS } from '../game/js/endcardimpact.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info ? ` (${info})` : ''}`); } };

// ---- zeldzaamheid en accent ----
ok(P.zeldzaamheid({ medal: true }) === 'goud' && P.zeldzaamheid({ id: 'alle_goud' }) === 'goud', 'een medaille of alle goud is goud');
ok(P.zeldzaamheid({ hidden: true }) === 'zeldzaam' && P.zeldzaamheid({}) === 'gewoon' && P.zeldzaamheid(null) === 'gewoon', 'geheim is zeldzaam, de rest gewoon');
ok(P.accentInkt({ medal: true, cat: 'rijden' }) === 'geel' && P.accentInkt({ hidden: true, cat: 'rijden' }) === 'roze', 'goud is geel, zeldzaam roze');
ok(P.accentInkt({ cat: 'rijden' }) === 'roze' && P.accentInkt({ cat: 'spoor' }) === 'inkt' && P.accentInkt({ cat: 'onbekend' }) === 'bord', 'een gewone krijgt de inkt van zijn categorie, onbekend is bord');
ok(Object.values(P.CATEGORIE_INKT).every((i) => ['bord', 'roze', 'geel', 'inkt'].includes(i)), 'alle categorie-inkten bestaan als .ds-m-inkt--* klasse');
const achSrc = lees('game/js/achievements.js');
const cats = [...achSrc.matchAll(/^\s*\['([a-z]+)',/gm)].map((m) => m[1]);
ok(['missies', 'rijden', 'verkennen', 'spoor', 'politie', 'sociaal'].every((c) => P.CATEGORIE_INKT[c]), 'de grote categorieën hebben een inkt', cats.join(','));

// ---- het plan van een volle kaart ----
const vol = P.planPrestatie({ id: 'x', cat: 'rijden', behaald: 12, totaal: 200 });
ok(vol.impact && !vol.kort && vol.totaal > 0 && vol.totaal <= MAX_TOTAAL_MS, 'een volle kaart duurt hooguit 1,6 s', String(vol.totaal));
ok(vol.kaart.at === 0 && vol.icoon.at === FAST_MS && vol.titel.at === 2 * FAST_MS && vol.beschrijving.at === 3 * FAST_MS, 'de onderdelen staffelen in stappen van 120 ms');
ok(vol.icoon.eenh === 1 && vol.titel.eenh === 2 && vol.beschrijving.eenh === 3, 'eenh is de tijd in staffelstappen (voor --ds-moment-n)');
ok(vol.balk.at > vol.beschrijving.at && vol.glans.at >= vol.balk.at + vol.balk.duur, 'de balk komt na de tekst en de glans sluit af');
ok(vol.balk.duur <= STEP_MS, 'de balk vult hooguit 250 ms');
ok(vol.balk.van === 11 && vol.balk.naar === 12 && vol.balk.totaal === 200 && vol.balk.pctVan === 5 && vol.balk.pctNaar === 6, 'de balk loopt van 11/200 naar 12/200');
ok(Math.abs(vol.balk.p - 0.06) < 1e-9, 'p is naar/totaal');
ok(vol.teller && vol.teller.stappen.length >= 1 && vol.teller.stappen.at(-1).waarde === 12 && vol.teller.stappen[0].waarde > 11 - 1, 'de teller eindigt op het nieuwe aantal');
ok(vol.teller.stappen.every((s, i, a) => i === 0 || s.waarde >= a[i - 1].waarde), 'de teller loopt alleen omhoog');
const eersteGeluid = vol.geluid[0];
ok(eersteGeluid.at === 0 && eersteGeluid.naam === 'slag', 'het eerste geluid is de slag bij de inslag');
ok(vol.geluid.every((g, i, a) => i === 0 || g.at >= a[i - 1].at), 'het geluid staat op volgorde');
ok(vol.geluid.filter((g) => g.naam === 'munt').length === 1 && vol.geluid.filter((g) => g.naam === 'glans').length === 1, 'één munt en één glans');
ok(vol.geluid.length <= 8, 'geen ratel: hooguit 8 geluiden');
ok(vol.geluid.at(-1).at <= vol.totaal, 'alle geluid valt binnen het moment');
const a2 = P.planPrestatie({ id: 'x', cat: 'rijden', behaald: 12, totaal: 200 });
ok(JSON.stringify(a2) === JSON.stringify(vol), 'het plan is deterministisch');
ok(P.planPrestatie({ id: 'a', medal: true, behaald: 3, totaal: 100 }).inkt === 'geel' && P.planPrestatie({ id: 'a', medal: true, behaald: 3, totaal: 100 }).zeldzaam === 'goud', 'het plan neemt de zeldzaamheid mee');

// ---- de korte kaart en rustig ----
const kort = P.planPrestatie({ id: 'x', cat: 'rijden', behaald: 12, totaal: 200, kort: true });
ok(kort.impact && kort.kort && !kort.balk && !kort.teller && !kort.glans && kort.totaal < vol.totaal, 'een korte kaart heeft geen balk, teller of glans');
ok(kort.geluid.length === 1 && kort.geluid[0].naam === 'slag', 'een korte kaart klinkt alleen met de slag');
const rustig = P.planPrestatie({ id: 'x', cat: 'rijden', behaald: 12, totaal: 200, rustig: true });
ok(!rustig.impact && rustig.totaal === 0 && rustig.icoon === null && rustig.titel === null && rustig.glans === null && rustig.teller === null, 'rustig: geen staffel, geen glans, geen teller');
ok(rustig.geluid.length === 1 && rustig.geluid[0].naam === 'slag' && rustig.balk && rustig.balk.duur === 0 && rustig.balk.pctNaar === 6, 'rustig: één slag en een balk die direct op het eind staat');
const rustigKort = P.planPrestatie({ behaald: 1, totaal: 10, kort: true, rustig: true });
ok(rustigKort.balk === null, 'rustig en kort: geen balk');
ok(P.planPrestatie({ behaald: 0, totaal: 0 }).balk.p === 0 && P.planPrestatie({}).impact === true, 'lege invoer geeft een geldig plan, geen NaN');
ok(!JSON.stringify(P.planPrestatie({ behaald: 5, totaal: 0 })).includes('null,"p"') && !/NaN|Infinity/.test(JSON.stringify(P.planPrestatie({ behaald: 5, totaal: 0 }))), 'geen NaN of oneindig bij totaal 0');
ok(P.planPrestatie({ behaald: 500, totaal: 100 }).balk.naar === 100, 'behaald boven het totaal wordt begrensd');

// ---- de wachtrij ----
ok(JSON.stringify(P.wachtrijPlan(1)) === JSON.stringify([{ variant: 'vol', aantal: 1, nog: 0 }]), 'één prestatie: een volle kaart');
const w3 = P.wachtrijPlan(3);
ok(w3.map((x) => x.variant).join() === 'vol,kort,kort' && w3.map((x) => x.nog).join() === '2,1,0', 'drie: vol, kort, kort, met het aantal dat nog wacht');
const w4 = P.wachtrijPlan(4);
ok(w4.map((x) => x.variant).join() === 'vol,kort,kort,kort', 'vier: de vierde (de laatste) is nog gewoon een korte kaart');
const w9 = P.wachtrijPlan(9);
ok(w9.length === 4 && w9[3].variant === 'samenvatting' && w9[3].aantal === 6, 'negen: drie losse kaarten en één samenvatting van de zes die over zijn');
ok(P.wachtrijPlan(0).length === 0, 'een lege wachtrij geeft niets');
for (const nn of [1, 2, 3, 4, 5, 8, 20]) {
  const p = P.wachtrijPlan(nn);
  const getoond = p.reduce((s, x) => s + x.aantal, 0);
  ok(getoond === nn && p.length <= 4, `de wachtrij van ${nn} toont elke prestatie precies één keer, in hooguit vier kaarten`, `${getoond}/${p.length}`);
}
ok(P.queueStep({ index: 3, resterend: 1 }).variant === 'kort', 'als vierde met één over: kort, geen samenvatting van één');
ok(P.verblijfS(6, 'vol') === 6 && P.verblijfS(6, 'kort') === 3.6 && P.verblijfS(3, 'kort') === 2.4 && P.verblijfS(6, 'samenvatting') === 3, 'verblijf: vol gewoon, kort 60% met een vloer van 2,4 s, samenvatting 3 s');
ok(P.samenvattingTekst(3).titel === 'Nog 3 prestaties' && P.samenvattingTekst(1).titel === 'Nog 1 prestatie', 'de samenvatting is goed Nederlands (enkelvoud en meervoud)');
ok(P.balkTekst(12, 200) === '12/200 prestaties', 'het balkje zegt "x/y prestaties"');

// ---- het menuplan ----
{
  const gezien = new Set(), mem = new Map();
  const a = P.listPlan({ vers: ['p1', 'p2'], gezien, vorigeTellers: mem, tellers: [{ cat: 'rijden', done: 3 }, { cat: 'spoor', done: 0 }] });
  ok(a.glans.join() === 'p1,p2' && a.tellers.every((t) => t.stappen.length === 0), 'de eerste keer: de nieuwe rijen glanzen en er telt niets op');
  const b = P.listPlan({ vers: ['p1', 'p2', 'p3'], gezien, vorigeTellers: mem, tellers: [{ cat: 'rijden', done: 5 }, { cat: 'spoor', done: 0 }] });
  ok(b.glans.join() === 'p3', 'een rij glanst maar één keer per sessie');
  const t = b.tellers.find((x) => x.cat === 'rijden');
  ok(t.was === 3 && t.naar === 5 && t.stappen.at(-1).waarde === 5 && t.stappen[0].waarde > 3, 'de categorie-teller tikt van 3 naar 5');
  ok(t.stappen.every((s) => s.t <= 300) && t.stappen.length <= 5, 'de tellerstappen vallen binnen 300 ms en zijn niet meer dan 5');
  ok(b.tellers.find((x) => x.cat === 'spoor').stappen.length === 0, 'een teller zonder verandering tikt niet');
  const c = P.listPlan({ vers: ['p9'], gezien, vorigeTellers: mem, tellers: [{ cat: 'rijden', done: 9 }], rustig: true });
  ok(c.glans.length === 0 && c.tellers[0].stappen.length === 0, 'rustig: geen glans en geen teller');
  const d = P.listPlan({ vers: [], gezien, vorigeTellers: mem, tellers: [{ cat: 'rijden', done: 4 }] });
  ok(d.tellers[0].stappen.at(-1).waarde === 4 && d.tellers[0].stappen.every((s) => s.waarde < 9), 'een teller kan ook omlaag (een nieuw spel)');
}

// ---- de staffel van de lijstrijen ----
ok(D.staggerStep(0) === 0 && D.staggerStep(8) === 8 && D.staggerStep(50) === D.STAFFEL_MAX && D.staggerStep(-3) === 0 && D.staggerStep(NaN) === 0, 'de staffelstap is 0 tot 8');
ok(D.staffelNa(3) === 120 && D.staffelNa(99) === 320 && D.staffelNa(3, true) === 0, 'de vertraging is stap x 40 ms, hooguit 320 ms, 0 bij rustig');
const rp = D.rijPlan(20);
ok(rp.length === 20 && rp.filter((r) => r.beweegt).length === D.MAX_GELIJK && rp[11].beweegt && !rp[12].beweegt, 'hooguit 12 rijen bewegen tegelijk, de rest staat er direct');
ok(rp.slice(12).every((r) => r.klasse === '' && r.na === 0), 'een rij zonder animatie krijgt geen verborgen beginstand');
ok(D.rijPlan(5, { rustig: true }).every((r) => !r.beweegt && r.klasse === ''), 'rustig: geen rij beweegt');
ok(D.rijPlan(0).length === 0, 'nul rijen');
ok(rp.filter((r) => r.beweegt).every((r, i, a) => i === 0 || r.na >= a[i - 1].na), 'de vertragingen lopen op');
const at1 = D.rijAttr(2, 'm-li');
ok(at1.klasse === 'm-li ds-m-rij' && at1.stijl === '--ds-m-i:2', 'rijAttr geeft klasse en index mee');
ok(D.rijAttr(30, 'm-li').klasse === 'm-li' && D.rijAttr(30, 'm-li').stijl === '', 'een rij na de twaalfde krijgt niets');
ok(D.staffelDuur(5) === 4 * 40 + 250 && D.staffelDuur(0) === 0 && D.staffelDuur(100) <= 320 + 250 + 12 * 0, 'de staffel duurt hooguit 570 ms');

// ---- tab, scroll, eenmalig, budget ----
ok(JSON.stringify(D.tabLine([{ left: 10, width: 80 }, { left: 100, width: 120 }], 1, { left: 4 })) === JSON.stringify({ x: 96, w: 120 }), 'de streep zit onder de actieve tab, vanaf de linkerrand van de rij');
ok(D.tabLine([], 0).w === 0 && D.tabLine(null, 0).w === 0, 'zonder tabs geen streep');
ok(D.tabZoom(853, 1280) > 0.66 && D.tabZoom(853, 1280) < 0.67 && D.tabZoom(500, 0) === 1 && D.tabZoom(0, 500) === 1, '#1200: de zoom van het kader (scherm/layout), 1 zonder maat');
ok(D.tabLine([{ left: 10, width: 80 }, { left: 100, width: 120 }], 1, { left: 4 }, 0.5).x === 192 && /tabLine\(.*tabZoom\(/.test(lees('game/js/dsmicro.js')), '#1200, #1113: tabLine deelt door de zoom van de menustage, en applyTabLine geeft die door (tabZoom)');
ok(JSON.stringify(D.scrollRanden({ scrollTop: 0, clientHeight: 100, scrollHeight: 400 })) === JSON.stringify({ boven: false, onder: true }), 'bovenaan vervaagt alleen de onderrand');
ok(D.scrollRanden({ scrollTop: 150, clientHeight: 100, scrollHeight: 400 }).boven && D.scrollRanden({ scrollTop: 150, clientHeight: 100, scrollHeight: 400 }).onder, 'in het midden vervagen beide randen');
ok(!D.scrollRanden({ scrollTop: 300, clientHeight: 100, scrollHeight: 400 }).onder, 'onderaan vervaagt de onderrand niet');
ok(!D.scrollRanden({ scrollTop: 0, clientHeight: 100, scrollHeight: 100 }).onder && !D.scrollRanden({}).boven, 'zonder scrollen vervaagt niets');
{ const s = new Set(); ok(D.eenmalig(s, 'a') === true && D.eenmalig(s, 'a') === false && D.eenmalig(s, 'b') === true, 'eenmalig geeft maar één keer true'); }
ok(D.budget(new Array(20).fill({}), 12).filter((x) => x.beweegt).length === 12, 'het budget laat er hooguit 12 bewegen');
ok(D.calmState() === true, 'zonder document geldt de rustige stand (niets beweegt)');

// ---- de koppeling ----
const ui = lees('game/js/achievementsui.js');
ok(/listPlan\(/.test(ui) && /rijAttr\(/.test(ui) && /afterFrame\(/.test(ui) && /rijenKlaar\(/.test(ui), 'het prestatiemenu gebruikt het menuplan en de rij-helpers');
ok(/queueStep\(/.test(achSrc) && /planPrestatie\(/.test(achSrc) && /kind: 'prestatiemoment'/.test(achSrc), 'de toast gebruikt het plan, de wachtrij en het moment-geluid');
const audio = lees('game/js/audio.js');
ok(/case 'prestatiemoment':/.test(audio) && /export function playPrestatieMoment/.test(audio) && /playPrestatieMoment\(e\.naam/.test(audio), 'audio.js speelt het moment-geluid op de sting-bus');
const body = audio.slice(audio.indexOf('export function playPrestatieMoment'), audio.indexOf('export function playTimeWarning'));
ok(/bus: stingBus/.test(body) || /\.\.\.sting/.test(body), 'het moment-geluid loopt via de sting-bus (Effecten-volume en dempen)');
ok(!/coopnet|sendCoop|broadcast/.test(achSrc.slice(achSrc.indexOf('function showNextToast'))), 'het moment stuurt niets over het net (lokaal per speler)');
ok(/isOverlayHeld\('prestatie'\)/.test(achSrc), 'de prestatie wacht op de eindkaart: de slagen overlappen nooit');
const eind = lees('game/js/endcardimpact.js');
ok(/export function counterSteps/.test(eind) && /from '\.\/endcardimpact\.js'/.test(lees('game/js/achievementunlock.js')), 'de staffel-helper van de eindkaart wordt hergebruikt');
ok(!/^import/m.test(lees('game/js/dsmicro.js')), 'dsmicro.js heeft geen imports (pure helpers, geen cyclus)');

console.log(`${n - fails}/${n} prestatiemoment-controles groen`);
process.exit(fails ? 1 : 0);
