// De tijdlijn van het vertrekbord (departuretimeline.js en departuretimelineui.js, #1085): sorteren, maximum, vertraging, vervallen,
// nacht en tijdwissel, lege en ongeldige gegevens, de afbeelding van spelklok naar tijdas, de HTML en het patchen van de rijen
// met een DOM-mock (geen browser, geen Electron).
//   node scripts/departuretimeline_test.mjs
import * as T from '../game/js/departuretimeline.js';
import { timelineHtml, rowHtml, nowHtml, createTimeline, STL_CSS } from '../game/js/departuretimelineui.js';
import { stationView } from '../game/js/stationlife.js';

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

const NU = 13 * 3600;
const rij = (min, extra = {}) => ({ lijn: 'Stoptrein Delfzijl', richting: 'Delfzijl', dir: 1, k: `r${min}`, spoor: 1, plan: NU + min * 60, tijd: NU + min * 60, vertraging: 0, reden: '', vervallen: false, live: false, ...extra });
const view = (bord, nu = NU) => ({ name: 'Groningen Hoofdstation', nu, bord });

// sorteren en maximum
{
  const m = T.buildTimeline(view([rij(9), rij(2), rij(5), rij(30), rij(12), rij(40), rij(50)]));
  check('maximaal vijf treinen', m.items.length === T.MAX_TRAINS);
  check('oplopend op verwachte tijd', m.items.every((x, i) => i === 0 || x.wait >= m.items[i - 1].wait) && m.items[0].wait === 120);
  check('max kleiner dan standaard', T.buildTimeline(view([rij(1), rij(2), rij(3)]), { max: 2 }).items.length === 2);
  check('max valt terug op 1..5', T.buildTimeline(view([rij(1), rij(2)]), { max: 0 }).items.length === 1 && T.buildTimeline(view([rij(1)]), { max: 'x' }).items.length === 1 && T.buildTimeline(view([1, 2, 3, 4, 5, 6, 7].map(rij)), { max: 99 }).items.length === 5);
  const gelijk = T.buildTimeline(view([rij(5, { k: 'a' }), rij(5, { k: 'b' })]));
  check('gelijke tijd blijft in bordvolgorde', gelijk.items[0].id.startsWith('a') && gelijk.items[1].id.startsWith('b'));
  check('de eerste trein is uitgelicht, de rest niet', m.items[0].first && m.items.slice(1).every((x) => !x.first) && m.firstId === m.items[0].id);
  check('de uitgelichte trein heeft toon bord, de rest inkt', m.items[0].tone === 'board' && m.items.slice(1).every((x) => x.tone === 'ink'));
  check('geel komt nergens voor', !/#f9c80e|zeef-primair|ink-geel/.test(STL_CSS));
}

// de tijdas: afbeelding van de spelklok
{
  const m = T.buildTimeline(view([rij(0.2), rij(4), rij(15)]));
  check('horizon minstens 15 min, in stappen van 15', m.horizon === 900 && T.horizonFor([100, 901]) === 1800 && T.horizonFor([100000]) === 3600 && T.horizonFor([]) === 900);
  check('positie = wacht / horizon', Math.abs(m.items[1].pos - 240 / 900) < 1e-9 && m.items[2].pos === 1 && m.items[0].pos < 0.02);
  check('positie ligt altijd in 0..1', T.buildTimeline(view([rij(-1), rij(5000)])).items.every((x) => x.pos >= 0 && x.pos <= 1));
  check('assen: nu en elk kwartier', JSON.stringify(T.axisFor(900).map((a) => a.label)) === '["nu","+15"]' && JSON.stringify(T.axisFor(3600).map((a) => a.label)) === '["nu","+30","+60"]' && T.axisFor(1800).length === 3);
  check('nu en as staan in het model', m.nowLabel === '13:00' && m.axis[0].pos === 0 && m.horizonMin === 15);
  check('afstandslabels', T.distanceLabel(0) === 'nu' && T.distanceLabel(30) === 'nu' && T.distanceLabel(60) === 'over 1 min' && T.distanceLabel(240) === 'over 4 min' && T.distanceLabel(3900) === 'over 1 u 5 min' && T.distanceLabel(7200) === 'over 2 u' && T.distanceLabel(NaN) === '');
  check('minuten komen overeen met het label', m.items[1].minutes === 4 && m.items[1].distance === 'over 4 min' && m.items[0].distance === 'nu' && m.items[0].minutes === 0);
}

// vertraging en vervallen
{
  const m = T.buildTimeline(view([
    rij(2, { plan: NU + 120 - 180, vertraging: 180, live: true, reden: 'x' }),
    rij(6, { plan: NU + 6 * 60 - 720, vertraging: 720, live: true }),
    rij(9, { vervallen: true, live: true }),
    rij(12, { vertraging: 30 }),
  ]));
  const [a, b, c, d] = m.items;
  check('vertraging +3 met nieuwe tijd en plantijd', a.delayLabel === '+3' && a.shifted && a.time === '13:02' && a.plan === '12:59' && a.status === 'delayed' && a.shape === 'diamond');
  check('lage vertraging is niet rood (wel een markering)', !a.high && a.tone === 'board');
  check('hoge vertraging (10 min of meer) is rood', b.delayLabel === '+12' && b.high && b.tone === 'red');
  check('vervalt: rood, kruis, geen afstand, woord', c.cancelled && c.tone === 'red' && c.shape === 'cross' && c.status === 'cancelled' && c.distance === 'vervalt' && /rijdt niet/.test(c.aria));
  check('onder een minuut vertraging telt als op tijd', d.delayLabel === '' && d.status === 'onTime' && !d.shifted);
  check('een vervallen eerste trein wordt niet uitgelicht', (() => { const x = T.buildTimeline(view([rij(1, { vervallen: true }), rij(4)])); return !x.items[0].first && x.items[1].first && x.firstId === x.items[1].id; })());
  check('alleen vervallen treinen: niemand uitgelicht', (() => { const x = T.buildTimeline(view([rij(1, { vervallen: true })])); return x.firstId === null && !x.empty; })());
  check('badge Live alleen met een melding, anders Rooster', a.badge === 'Live' && d.badge === 'Rooster' && T.buildTimeline(view([rij(3)])).items[0].badge === 'Rooster');
  check('de uitgelichte met hoge vertraging krijgt rood', T.buildTimeline(view([rij(3, { vertraging: 900, plan: NU - 720 })])).items[0].tone === 'red');
  check('status nu binnen 30 s', T.buildTimeline(view([rij(0.4)])).items[0].status === 'now' && T.buildTimeline(view([rij(0.4)])).items[0].aria.includes('vertrekt nu'));
  check('schermlezertekst noemt bestemming, spoor, tijd, afstand en bron', /Delfzijl.*spoor 1.*13:02.*over 2 min.*op tijd.*rooster/.test(T.buildTimeline(view([rij(2)])).items[0].aria));
  check('schermlezertekst van het geheel', /Eerstvolgende treinen op Groningen Hoofdstation, nu 13:00\. 1\. /.test(T.buildTimeline(view([rij(2)])).aria));
}

// nacht en tijdwissel
{
  const nu = 86400 - 10;
  const m = T.buildTimeline(view([rij(0, { tijd: 86400 + 120, plan: 86400 + 120, k: 'n1' }), rij(0, { tijd: 86400 + 4 * 3600, plan: 86400 + 4 * 3600, k: 'n2' })], nu));
  check('over middernacht: tijd gaat rond, wacht loopt door', m.items[0].time === '00:02' && m.items[0].wait === 130 && m.items[0].distance === 'over 2 min' && m.nowLabel === '23:59');
  check('een trein van uren later staat aan het einde van de as', m.items[1].pos === 1 && m.horizon === 3600 && /over 4 u/.test(m.items[1].distance));
  check('een net vertrokken trein (binnen een minuut) mag er nog staan, een oudere niet', T.buildTimeline(view([rij(-0.5)])).items.length === 1 && T.buildTimeline(view([rij(-2)])).empty);
  check('nu = 0 (middernacht) werkt', T.buildTimeline(view([rij(5, { tijd: 300, plan: 300 })], 0)).items[0].time === '00:05');
}

// geen trein en ongeldige gegevens
{
  const leeg = T.buildTimeline(view([]));
  check('geen trein: leeg met tekst', leeg.empty && leeg.emptyText === 'Geen treinen meer vandaag' && leeg.items.length === 0 && leeg.firstId === null && /Geen treinen meer vandaag/.test(leeg.aria));
  for (const [naam, v] of [['null', null], ['undefined', undefined], ['zonder bord', { nu: 5 }], ['bord geen lijst', { nu: 5, bord: 'x' }], ['nu NaN', { nu: NaN, bord: [rij(1)] }]]) {
    let m; try { m = T.buildTimeline(v); } catch (e) { m = null; }
    check(`ongeldig (${naam}) geeft een lege tijdlijn, geen fout`, m && m.empty && typeof m.emptyText === 'string' && m.emptyText.length > 0);
  }
  const rommel = T.buildTimeline(view([null, 5, 'x', {}, { tijd: 'NaN' }, { tijd: NaN }, { tijd: Infinity }, rij(3), { tijd: NU + 100 }]));
  check('onbruikbare rijen vallen weg, bruikbare blijven', rommel.items.length === 2);
  const kaal = rommel.items.find((x) => x.line === '');
  check('een rij zonder bestemming, lijn en spoor blijft leesbaar', kaal && kaal.destination === 'Onbekende bestemming' && kaal.trackLabel === '' && !/NaN|undefined/.test(kaal.aria));
  check('geen NaN of undefined in de HTML', !/NaN|undefined|null/.test(timelineHtml(rommel)) && !/NaN|undefined/.test(timelineHtml(leeg)));
  check('HTML-tekens in een naam worden ontsmet', timelineHtml(T.buildTimeline(view([rij(2, { richting: '<b>"x"&' })]))).includes('&lt;b&gt;&quot;x&quot;&amp;'));
  check('de sig verandert niet met seconden binnen dezelfde minuutlabels', T.buildTimeline(view([rij(5)], NU)).sig === T.buildTimeline(view([rij(5)], NU + 10)).sig && T.buildTimeline(view([rij(5)], NU)).sig !== T.buildTimeline(view([rij(5)], NU + 120)).sig);
  check('dezelfde invoer geeft dezelfde sig', T.buildTimeline(view([rij(5)])).sig === T.buildTimeline(view([rij(5)])).sig);
}

// samen met het echte bord (stationView)
{
  const A = { name: 'Stoptrein Noord', stops: [{ name: 'Alpha', s: 0 }, { name: 'Beta', s: 12000 }] };
  const v = stationView({ name: 'Beta', lijnen: [A] }, 8.0, 3);
  const m = T.buildTimeline(v);
  check('de tijdlijn volgt het bord van het station', m.items.length === Math.min(T.MAX_TRAINS, v.bord.length) && m.items.every((x, i) => i === 0 || x.wait >= m.items[i - 1].wait));
}

// HTML: één kaart, vorm en woord naast kleur, 13 px-vloer, geen losse kleuren
{
  const m = T.buildTimeline(view([rij(2, { vertraging: 180, plan: NU + 120 - 180, live: true }), rij(5, { vervallen: true }), rij(9)]));
  const h = timelineHtml(m);
  check('één samenhangende kaart: een lijst met nu-rij', (h.match(/<ol /g) || []).length === 1 && (h.match(/class="stl-row"/g) || []).length === 3 && h.includes('stl-now'));
  check('lijst is voor de schermlezer weg, de tekst staat er één keer', h.includes('aria-hidden="true"><li') && (h.match(/class="stl-sr"/g) || []).length === 1);
  check('vervalt staat als woord en vorm', rowHtml(m.items[1]).includes('Vervalt') && rowHtml(m.items[1]).includes('stl-shape-cross'));
  check('vertraging staat als +3 met een ruit', rowHtml(m.items[0]).includes('>+3<') && rowHtml(m.items[0]).includes('stl-shape-diamond'));
  check('tijd van de eerste: nieuwe tijd met plantijd doorgestreept', /<b class="">13:02<\/b><s class="stl-plan">12:59<\/s>/.test(rowHtml(m.items[0])));
  check('de afstand heeft een balk met schaal tussen 0 en 1', /--ds-m-p:0\.\d+/.test(rowHtml(m.items[2])));
  check('de eerste heeft de rustige live-stip, de anderen niet', rowHtml(m.items[0]).includes('ds-m-stip--live') && !rowHtml(m.items[2]).includes('ds-m-stip'));
  check('het nu-punt toont de spelkloktijd en de as', nowHtml(m).includes('13:00') && nowHtml(m).includes('+15'));
  check('een tik krijgt de hartslagklasse', rowHtml(m.items[2], { tick: true }).includes('ds-m-tikt') && !rowHtml(m.items[2]).includes('ds-m-tikt'));
  check('CSS: geen losse kleuren, geen tekst onder 13 px, geen eigen animaties', !/#[0-9a-f]{3,8}\b|rgba?\(|hsl\(/i.test(STL_CSS.replace(/'\\[0-9A-F]+/g, '')) && ![...STL_CSS.matchAll(/font-size:\s*(\d+)px/g)].some((x) => +x[1] < 13) && !/\banimation\b|@keyframes|transition/.test(STL_CSS));
  check('CSS: lettergrootte 13 px als vloer', [...STL_CSS.matchAll(/max\((\d+)px/g)].every((x) => +x[1] >= 13));
  check('CSS: kleurtaal via tokens (bordgroen, inkt, papier, rood)', ['--ds-c-ink-bord', '--ds-c-ink-inkt', '--ds-c-ink-papier', '--ds-c-rood-tx'].every((t) => STL_CSS.includes(t)));
}

// DOM-mock: patchen per trein
class El {
  constructor(tag) { this.tag = tag; this.children = []; this.parentNode = null; this.attrs = {}; this.classes = new Set(); this._inner = ''; this.hidden = false; this.textContent = ''; this.style = { props: {}, setProperty(k, v) { this.props[k] = v; } }; this.writes = 0; this.id = ''; }
  get className() { return [...this.classes].join(' '); }
  set className(v) { this.classes = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get classList() { const s = this.classes; return { add: (...c) => c.forEach((x) => s.add(x)), remove: (...c) => c.forEach((x) => s.delete(x)), contains: (c) => s.has(c) }; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k]; }
  removeAttribute(k) { delete this.attrs[k]; }
  get innerHTML() { return this._inner; }
  set innerHTML(v) { this._inner = v; this.writes++; }
  appendChild(c) { this.insertBefore(c, null); return c; }
  insertBefore(c, ref) { if (c.parentNode) c.parentNode.removeChild(c); const i = ref ? this.children.indexOf(ref) : -1; if (i < 0) this.children.push(c); else this.children.splice(i, 0, c); c.parentNode = this; return c; }
  removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; }
}
{
  const doc = { createElement: (t) => new El(t), head: new El('head'), documentElement: new El('html') };
  const ouder = new El('div');
  const flash = new El('div'); ouder.appendChild(flash);
  const tl = createTimeline(ouder, { doc, before: flash });
  check('de tijdlijn staat vóór de flits, css staat in de kop', ouder.children[0] === tl.root && ouder.children[1] === flash && doc.head.children.length === 1);
  const lijst = tl.root.children[1];
  tl.set(T.buildTimeline(view([rij(2), rij(5), rij(9)])));
  check('drie treinen en de nu-rij', lijst.children.length === 4 && lijst.children[0].classes.has('stl-now'));
  const li2 = lijst.children[2];
  const w0 = li2.writes;
  tl.set(T.buildTimeline(view([rij(2), rij(5), rij(9)])));
  check('dezelfde stand schrijft niets opnieuw', li2.writes === w0);
  tl.set(T.buildTimeline(view([rij(2), rij(5), rij(9)], NU + 20)));
  check('een stand zonder minutenwijziging laat de rij staan', li2.writes === w0 && lijst.children[2] === li2);
  tl.set(T.buildTimeline(view([rij(2), rij(5), rij(9)], NU + 60)));
  check('een nieuwe minuut: tekst bijgewerkt met één hartslag, dezelfde rij', lijst.children[2] === li2 && li2.writes === w0 + 1 && li2.innerHTML.includes('ds-m-tikt') && li2.innerHTML.includes('over 4 min'));
  tl.set(T.buildTimeline(view([rij(5), rij(9), rij(12)], NU + 60)));
  check('vertrokken trein verdwijnt, nieuwe komt achteraan, volgorde klopt', lijst.children.length === 4 && lijst.children[1].getAttribute('data-id').startsWith('r5') && lijst.children[3].getAttribute('data-id').startsWith('r12'));
  check('rustige stand (geen document): geen binnenkomklassen', !lijst.children[3].classes.has('ds-m-rij'));
  check('de nieuwe eerste krijgt data-first, de vorige niet meer', lijst.children[1].getAttribute('data-first') === '1' && lijst.children[2].getAttribute('data-first') === undefined);
  check('schermlezertekst volgt', tl.root.children[0].textContent.includes('13:05'));
  tl.set(T.buildTimeline(view([])));
  check('leeg: lijst weg, lege tekst zichtbaar', lijst.hidden && !tl.root.children[2].hidden && lijst.children.length === 1 && tl.root.children[2].textContent === 'Geen treinen meer vandaag');
  tl.set(T.buildTimeline(view([rij(3)])));
  check('weer treinen: lege tekst weg', !lijst.hidden && tl.root.children[2].hidden && lijst.children.length === 2);
  {
    // met beweging: alleen de NIEUWE trein krijgt ds-m-rij en .on (na het frame), de bestaande niet
    globalThis.document = { documentElement: { classList: { contains: () => false } } };
    globalThis.requestAnimationFrame = (cb) => cb();
    const tl2 = createTimeline(new El('div'), { doc });
    const l2 = tl2.root.children[1];
    tl2.set(T.buildTimeline(view([rij(2), rij(5)])));
    check('bij beweging schuiven de eerste treinen gestaffeld in', l2.children[1].classes.has('ds-m-rij') && l2.children[1].classes.has('on') && l2.children[2].style.props['--ds-m-i'] === '1');
    l2.children[1].classList.remove('ds-m-rij', 'on'); l2.children[2].classList.remove('ds-m-rij', 'on');
    tl2.set(T.buildTimeline(view([rij(2), rij(5), rij(9)])));
    check('alleen de nieuwe trein schuift in', !l2.children[1].classes.has('ds-m-rij') && l2.children[3].classes.has('ds-m-rij'));
    delete globalThis.document; delete globalThis.requestAnimationFrame;
  }
  tl.set(null);
  check('set(null) doet niets en gooit niet', lijst.children.length === 2);
  tl.destroy();
  check('destroy haalt de kaart weg', ouder.children.length === 1);
}

console.log(bad ? `${bad} van ${n} mislukt` : `departuretimeline_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);
