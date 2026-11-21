// De loopbaan-tour als tijdlijn (DS3, 21-11): volgorde van het verhaal, staten gedaan/nu/volgende/dicht, geen spoilers voor dichte stops,
// per speler (eigen profiel), en de bron van het scherm (wissel met toets, listnav, tekstdieet, microbeweging <= 250 ms).
//   node scripts/careertimeline_test.mjs
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as L from '../game/js/loopbaan.js';
import { tourOrder, tourStops, tourCount, stopLine, STATE } from '../game/js/careertimeline.js';
import { navIndex } from '../game/js/listnav.js';
import { gateWorlds, worldOpen, newGate, progressFrom } from '../game/js/unlockgate.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const lees = (p) => fs.readFileSync(ROOT + p, 'utf8');
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };

// 1. volgorde: elk vak precies één keer, in de volgorde van het verhaal
const vol = tourOrder();
ok(vol.length === L.VAK_IDS.length, 'elk vak staat in de tour', vol.length);
ok(new Set(vol.map((v) => v.vak)).size === vol.length, 'geen vak dubbel');
ok(L.VAK_IDS.every((v) => vol.some((x) => x.vak === v)), 'geen vak mist');

// 2. staten zonder poort: alles open, het eerste ongedane vak is nu
const nieuw = L.nieuwProfiel();
const s0 = tourStops(nieuw);
ok(s0[0].staat === STATE.now && s0.slice(1).every((s) => s.staat === STATE.next), 'nieuw profiel: eerste stop nu, de rest volgende');
const p1 = L.nieuwProfiel();
p1.gestart.push(vol[0].vak, vol[2].vak);
const s1 = tourStops(p1);
ok(s1[0].staat === STATE.done && s1[2].staat === STATE.done, 'begonnen vakken zijn gedaan');
ok(s1[1].staat === STATE.now, 'de eerste ongedane stop is nu');
ok(s1.filter((s) => s.staat === STATE.now).length === 1, 'altijd hooguit één stop is nu');
ok(tourCount(s1).done === 2 && tourCount(s1).now === vol[1].vak, 'telling: twee gedaan, nu wijst naar de volgende');

// 3. dicht: geen spoilers (geen naam, geen vak-id, geen icoon), en een begonnen vak is nooit dicht
const dichtAlles = () => false;
const sd = tourStops(nieuw, dichtAlles);
ok(sd.every((s) => s.staat === STATE.closed), 'zonder open wereld is alles dicht');
ok(sd.every((s) => s.vak === null && s.naam === null && s.icoon === null && s.goed === null), 'een dichte stop verklapt geen naam, icoon of fit');
ok(sd.every((s) => stopLine(s) === 'Later in het verhaal'), 'dichte stop: alleen "Later in het verhaal"');
ok(!tourCount(sd).now, 'niets open: geen nu-stop');
const sd2 = tourStops(p1, dichtAlles);
ok(sd2[0].staat === STATE.done && sd2[2].staat === STATE.done && sd2[1].staat === STATE.closed, 'een begonnen vak blijft gedaan, ook als de poort dicht is');
const alleenEerste = (id) => id === vol[0].vak;
const sg = tourStops(nieuw, alleenEerste);
ok(sg[0].staat === STATE.now && sg[1].staat === STATE.closed, 'open vak is nu, de rest dicht');

// 4. met de echte poort: een nieuw spel begint dicht, een oude save (zonder poort) is volledig open
const poort = (gate, stepId) => (id) => worldOpen(id, progressFrom({ stepId, gate, begun: () => false }));
const dichtStart = tourStops(nieuw, poort(newGate(), null));
ok(dichtStart.every((s) => s.staat === STATE.closed), 'nieuw spel zonder verhaalstap: alle stops dicht');
const legacy = tourStops(nieuw, poort(undefined, null));
ok(legacy.every((s) => s.staat !== STATE.closed), 'oude save zonder poort: niets dicht (migratieregel)');
ok(gateWorlds().filter((w) => w.kind === 'loopbaan').length === L.VAK_IDS.length, 'de poort kent alle loopbanen');

// 5. alles gedaan
const alles = L.nieuwProfiel();
alles.gestart.push(...L.VAK_IDS);
const sa = tourStops(alles, dichtAlles);
ok(tourCount(sa).complete && sa.every((s) => s.staat === STATE.done), 'alles begonnen: de tour is klaar');
ok(sa.some((s) => s.goed), 'bij een gedane stop staat wie er goed in is');

// 6. per speler: twee profielen, twee tours (Samen spelen, #429)
ok(JSON.stringify(tourStops(nieuw)) !== JSON.stringify(tourStops(p1)), 'een ander profiel geeft een andere tour');
ok(JSON.stringify(tourStops(null)) === JSON.stringify(tourStops(nieuw)), 'zonder profiel leest het als een nieuw profiel');

// 7. tekstdieet: elke regel hooguit 40 tekens
for (const s of [...s1, ...sd, ...sa]) ok(stopLine(s).length <= 40, 'regel hooguit 40 tekens', stopLine(s));

// 8. listnav: de tijdlijn loopt stop voor stop, aan de rand blijft de index staan
ok(navIndex(5, 0, 'ArrowDown') === 1 && navIndex(5, 4, 'ArrowDown') === 4 && navIndex(5, 0, 'ArrowUp') === 0, 'listnav: omlaag, omhoog en de randen');

// 9. de bron van het scherm
const ui = lees('game/js/loopbaanui.js');
ok(/data-lb-weergave=/.test(ui) && /keyTextHtml\('\{T\}'\)/.test(ui), 'wissel Tour/Vakken met de toets T in de knop');
ok(/storyWorldOpen/.test(ui) && /icoon\('slot'\)/.test(ui), 'slot-status via de poort, met een slot-icoon');
ok(/aria-current="step"/.test(ui), 'de nu-stop is aria-current="step"');
ok(!/lb-hero|pm-hero/.test(ui), 'geen hero-alinea meer');
const pm = lees('game/js/pausemenu.js');
ok(/import \{ navIndex \} from '\.\/listnav\.js'/.test(pm) && /tourNavigeer\(activePanel\(\), t, k\)/.test(pm), 'het pauzemenu loopt de tour met listnav');
ok(/\[\['T'\], 'tour of vakken'\]/.test(pm), 'de voettekst noemt de toets T');
const css = ui.slice(ui.indexOf('const CSS'), ui.indexOf('let cssAan'));
const ms = [...css.matchAll(/(\d+)ms/g)].map((m) => Number(m[1]));
ok(ms.length > 0 && ms.every((m) => m <= 250), 'microanimaties hooguit 250 ms', ms.join(','));
ok(/prefers-reduced-motion[^}]*\.lb-stop/.test(css), 'rustige beweging: ook de tour respecteert reduced-motion');
// geen tekstmuur: de titel en de ondertitel van de kop blijven kort
const titels = [...L.VAKKEN.flatMap((v) => v.titels), 'Je loopbaan'];
ok(titels.every((t) => t.length <= 30), 'elke functietitel (kop) hooguit 30 tekens', titels.find((t) => t.length > 30));
ok('Kies een vak en doe een eerste klus'.length <= 40 && `Duizendpoot van Grunn · 19 van 19`.length <= 40, 'ondertitels hooguit 40 tekens');

console.log(`careertimeline_test: ${n - fails}/${n}`);
if (fails) process.exit(1);
