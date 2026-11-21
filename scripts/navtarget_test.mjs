// navtarget.js en navpijl.js (#1078): welk doel de pijl volgt, wat wacht, wat dezelfde plek is, wat klaar is; de kleur per type en de pijl zelf.
// Puur: geen DOM, geen spel. Samen spelen: de doelen zijn per speler lokaal; de groep komt als eigen lijst binnen (net als in coopmissie.js).
import fs from 'node:fs';
import { snapshotFromWorld, distanceFor, compactDistance, resolveNavTargets, navColor, navTekst, pathRole, eigenGlyph, lineStyleFor, NAV_ROL, NAV_TYPES, GLYPH, MAX_SECUNDAIR, AANKOMST_M, PATH_KIND } from '../game/js/navtarget.js';
import { drawMapTargets, track, place, spreid, drawKompasRand, TRACK_INSET, MIN_ACTIEF, MIN_DOT, ACTIVE_R, DOT_R, TAG_GAP, tagPlek } from '../game/js/navpijl.js';
import { iconBekend } from '../game/js/icons.js';
import { PALETTES } from '../game/js/a11y.js';
import { dsKleur, contrast, kaartLand } from '../game/js/kaartkleuren.js';

let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } };
const sp = { x: 0, y: 0 };
const bij = (x, y, extra = {}) => ({ x, y, name: 'doel', ...extra });
const nav = (s) => resolveNavTargets({ speler: sp, modus: 'auto', ...s });
const types = (r) => r.alle.map((d) => d.type + ':' + d.rol);

// 1. geen doel: een rustige kaart
{
  const r = nav({});
  ok(r.actief === null && r.alle.length === 0 && r.secundair.length === 0, 'geen doel: geen pijlen');
}
// 2. alleen de gids van het verhaal: die is het actieve doel, een ster
{
  const r = nav({ verhaal: bij(500, 0) });
  ok(r.actief && r.actief.type === 'verhaal' && r.actief.glyph === 'ster' && r.actief.rol === 'actief', 'verhaal is actief, met een ster');
  ok(navColor(r.actief, PALETTES.uit) === PALETTES.uit.mission, 'het verhaal is geel');
}
// 3. een eigen doel gaat voor het verhaal; het verhaal wacht (hol), geen tweede gevulde pijl
{
  const r = nav({ verhaal: bij(500, 0), eigen: bij(0, 600, { soort: 'place' }) });
  ok(r.actief.type === 'eigen' && r.actief.glyph === 'vlag', 'eigen plek: actief met een vlag');
  ok(r.secundair.length === 1 && r.secundair[0].type === 'verhaal' && r.secundair[0].rol === 'secundair', 'het verhaal wacht');
  ok(r.alle.filter((d) => d.rol === 'actief').length === 1, 'precies één actief doel');
  ok(navColor(r.actief, PALETTES.uit) === PALETTES.uit.user, 'eigen doel is paars');
  ok(navColor(r.secundair[0], PALETTES.uit) === PALETTES.uit.mission, 'het wachtende verhaal houdt zijn gele icoonkleur');
}
// 4. de speler zet een missie als doel en het verhaal wijst dezelfde missie aan: één doel, geen dubbele pin
{
  const r = nav({ missie: bij(300, 0, { fase: 'idle', opKaart: true }), eigen: bij(301, 1, { soort: 'mission' }), verhaal: bij(300, 0) });
  ok(r.actief.type === 'eigen' && r.actief.glyph === 'ster', 'een gekozen missie is jouw doel, met een ster');
  ok(r.alle.length === 1, 'dezelfde plek is één pijl');
  ok(r.verborgen.some((v) => v.id === 'missie' && /^zelfde plek/.test(v.reden)), 'de missiemarker is samengevoegd met jouw doel');
  ok(r.verborgen.some((v) => v.id === 'gids' && /^zelfde plek/.test(v.reden)), 'de gids is samengevoegd met jouw doel');
}
// 5. een missie in uitvoering gaat voor jouw doel (zoals routing.js): de missie is actief, jouw doel wacht
{
  const r = nav({ missie: bij(200, 0, { fase: 'active', opKaart: true }), eigen: bij(0, 900, { soort: 'place' }) });
  ok(r.actief.type === 'missie' && r.secundair[0].type === 'eigen', 'missie in uitvoering is actief, jouw doel wacht');
  const s = nav({ missie: bij(200, 0, { fase: 'active', opKaart: true }), eigen: bij(200, 0, { soort: 'mission' }) });
  ok(s.alle.length === 1 && s.actief.type === 'missie' && s.verborgen.some((v) => v.id === 'eigen'), 'de lopende missie en jouw doel op dezelfde plek zijn één pijl (geen paarse pin onder de gele ring)');
}
// 6. een klus gaat voor alles; de missie verdwijnt (zoals de minikaart deed), een uitdaging ook
{
  const r = nav({ klus: bij(100, 0), missie: bij(300, 0, { fase: 'active', opKaart: true }), uitdaging: bij(0, 400), eigen: bij(0, 800, { soort: 'place' }) });
  ok(r.actief.type === 'klus' && r.actief.glyph === 'ruit', 'klus is actief, een ruit');
  ok(r.verborgen.some((v) => v.type === 'missie' && v.reden === 'klus actief'), 'de missie is verborgen tijdens een klus');
  ok(!r.alle.some((d) => d.type === 'uitdaging' || d.type === 'missie'), 'geen uitdaging of missie naast de klus');
  ok(navColor(r.actief, PALETTES.uit) === PALETTES.uit.job, 'een klus houdt zijn eigen kleur');
}
// 7. minigame en heli-run: alles stil
{
  const m = nav({ bezig: 'minigame', missie: bij(10, 0, { fase: 'active', opKaart: true }), eigen: bij(0, 500, { soort: 'place' }), verhaal: bij(9, 9), klus: bij(5, 50) });
  ok(m.alle.length === 0 && m.actief === null && m.reden === 'minigame', 'minigame: rustige kaart');
  const h = nav({ bezig: 'heli', heli: bij(0, 300), eigen: bij(0, 500, { soort: 'place' }), verhaal: bij(9, 90) });
  ok(h.alle.length === 1 && h.actief.type === 'heli' && h.actief.glyph === 'ring', 'heli-run: alleen het volgende doel van de run');
}
// 8. geen pijl naar iets dat klaar is of waar je al bent
{
  const cd = nav({ missie: bij(300, 0, { fase: 'cooldown', opKaart: true }) });
  ok(cd.alle.length === 0 && cd.verborgen.some((v) => v.reden === 'afgerond'), 'geen pijl naar een afgeronde missie');
  const hier = nav({ eigen: bij(AANKOMST_M - 1, 0, { soort: 'place' }) });
  ok(hier.alle.length === 0 && hier.verborgen.some((v) => v.reden === 'aangekomen'), 'geen pijl naar een doel waar je al bent');
  const net = nav({ eigen: bij(0, 500, { soort: 'place' }), klaar: ['eigen'], verhaal: bij(400, 0) });
  ok(net.actief.type === 'verhaal' && net.verborgen.some((v) => v.type === 'eigen' && v.reden === 'klaar'), 'een afgerond eigen doel verdwijnt; het verhaal neemt het over');
  const dicht = nav({ verhaal: bij(AANKOMST_M + 5, 0) });
  ok(dicht.actief && dicht.actief.type === 'verhaal', 'net buiten de aankomstafstand blijft de pijl');
}
// 9. hooguit MAX_SECUNDAIR holle pijlen
{
  const r = nav({ klus: bij(0, 800), eigen: bij(600, 0, { soort: 'place' }), verhaal: bij(0, -700), groep: [bij(-900, 0)], zorg: bij(-500, -500, { waarom: 'repair' }) });
  ok(r.alle.length === 1 + MAX_SECUNDAIR && r.secundair.length === MAX_SECUNDAIR, 'één gevuld en hooguit ' + MAX_SECUNDAIR + ' holle pijlen: ' + types(r).join(' '));
  ok(r.verborgen.some((v) => v.reden === 'te veel pijlen'), 'de rest staat als te veel pijlen op de lijst');
  ok(r.actief.type === 'klus', 'de hoogste prioriteit is actief');
}
// 10. de volgorde is die van routing.js
{
  const volgorde = ['heli', 'klus', 'missie', 'eigen', 'verhaal', 'uitdaging', 'zorg'];
  for (let i = 1; i < volgorde.length; i++) ok(NAV_TYPES[volgorde[i - 1]].rank > NAV_TYPES[volgorde[i]].rank, `${volgorde[i - 1]} gaat voor ${volgorde[i]}`);
  ok(NAV_TYPES.groep.rank > NAV_TYPES.eigen.rank && NAV_TYPES.groep.rank < NAV_TYPES.missie.rank, 'de missie van de groep staat tussen missie en eigen doel');
  ok(NAV_TYPES.eigenauto.volg === false, 'je eigen auto is nooit het doel dat je volgt');
}
// 11. modus-wissel: hetzelfde doel, een andere lijn
{
  const s = { eigen: bij(0, 800, { soort: 'place' }), verhaal: bij(500, 0) };
  const per = Object.fromEntries(['lopen', 'fiets', 'auto', 'boot', 'ov', 'lucht'].map((m) => [m, nav({ ...s, modus: m })]));
  ok(Object.values(per).every((r) => r.actief.type === 'eigen' && r.secundair.length === 1), 'in elke modus is hetzelfde doel actief');
  ok(per.boot.lijn === 'vaar' && per.lucht.lijn === 'lucht' && per.ov.lijn === 'ov' && per.auto.lijn === 'weg' && per.lopen.lijn === 'weg', 'de lijn volgt de manier van reizen');
  ok(lineStyleFor('fiets') === 'weg', 'een fiets rijdt over de weg');
}
// 12. Samen spelen: het doel van de groep telt als missie; een gast met een eigen doel houdt zijn eigen doel erbij
{
  const r = nav({ groep: [bij(0, 300)], eigen: bij(400, 0, { soort: 'place' }) });
  ok(r.actief.type === 'groep' && r.secundair[0].type === 'eigen', 'het doel van de groep gaat voor het eigen doel, dat wacht');
  ok(navColor(r.actief, PALETTES.uit) === PALETTES.uit.mission, 'de missie van de groep is geel');
}
// 13. dezelfde plek: het hoogste type wint, ook de gids op de missie
{
  const r = nav({ missie: bij(300, 0, { fase: 'idle', opKaart: true }), verhaal: bij(302, 1) });
  ok(r.alle.length === 1 && r.actief.id === 'missie', 'de gids op de startmarker is die marker, de marker wint');
  ok(r.verborgen.some((v) => v.id === 'gids'), 'de gids is verborgen');
}
// 14. de kleur is één regel: wijzig NAV_ROL en alles volgt
{
  const doel = { type: 'eigen', rol: 'actief' };
  ok(navColor(doel, PALETTES.uit) === PALETTES.uit.user && pathRole('user') === 'user', 'standaard: jouw doel is paars');
  const oud = NAV_ROL.eigen;
  NAV_ROL.eigen = 'mission';
  ok(navColor(doel, PALETTES.uit) === PALETTES.uit.mission && pathRole('user') === 'mission', 'met één regel wordt jouw doel geel');
  NAV_ROL.eigen = oud;
  ok(pathRole('user') === 'user', 'terug op paars');
  for (const kind of Object.keys(PATH_KIND)) ok(Object.keys(PALETTES.uit).includes(pathRole(kind)), `routesoort ${kind} heeft een paletrol`);
  for (const [stand, pal] of Object.entries(PALETTES)) for (const t of Object.keys(NAV_ROL)) ok(typeof pal[NAV_ROL[t]] === 'string', `palet ${stand} heeft een kleur voor ${t}`);
}
// 15. de glyphs: elk volg-type heeft een eigen tekening en elk eigen doel een vorm
{
  for (const [naam, t] of Object.entries(NAV_TYPES)) ok(!!GLYPH[t.glyph], `type ${naam} heeft een glyph (${t.glyph})`);
  ok(['place', 'mission', 'play', 'job', 'challenge'].every((k) => GLYPH[eigenGlyph(k)]), 'elke soort eigen doel heeft een vorm');
  ok(eigenGlyph('place') !== eigenGlyph('mission'), 'een plek en een missie hebben een andere vorm');
  const zichtbaar = ['missie', 'eigen', 'klus', 'zorg', 'heli'].map((t) => NAV_TYPES[t].glyph);
  ok(new Set(zichtbaar).size === zichtbaar.length, 'missie, eigen doel, klus, zorg en heli hebben elk een eigen vorm (nooit alleen kleur)');
  ok(navTekst({ type: 'klus', rol: 'actief', afstand: 420 }) === 'Klus, 420 m' && /wacht/.test(navTekst({ type: 'eigen', rol: 'secundair', afstand: 90 })), 'de tekst voor de schermlezer');
}
// 16. de kompasboog: meetkunde (vaste afstand tot de rand, markers schuiven uit elkaar, één boog) en tekenen (ook zonder beweging)
{
  const S = 250, b = track(S);
  let min = 1e9, max = 0;
  for (let q = 0; q < b.lengte; q += 3) { const [x, y] = b.punt(q); const d = Math.min(x, y, S - x, S - y); min = Math.min(min, d); max = Math.max(max, d); }
  ok(Math.abs(min - TRACK_INSET) < 0.6 && max <= TRACK_INSET + 7.2, `de baan ligt op rechte stukken ${TRACK_INSET} px van de rand en rondt de hoeken af (${min.toFixed(1)}..${max.toFixed(1)})`);
  for (const graden of [0, 45, 90, 135, 180, 225, 270, 315]) {
    const [x, y] = b.punt(b.sVoor(graden * Math.PI / 180));
    let h = Math.atan2(y - S / 2, x - S / 2) * 180 / Math.PI; h = (h + 360) % 360;
    const d = Math.min(Math.abs(h - graden), 360 - Math.abs(h - graden));
    ok(d < 1.5, `de marker voor peiling ${graden} ligt in die richting (${d.toFixed(2)} graden ernaast)`);
  }
  // drie markers in bijna dezelfde richting liggen na het plaatsen niet op elkaar
  const dicht = place([{ a: -0.9, actief: true }, { a: -0.85, actief: false }, { a: -0.95, actief: false }, { a: -0.88, actief: false }], S).items;
  const langs = (p, q) => { const d = Math.abs(p.s - q.s) % b.lengte; return Math.min(d, b.lengte - d); };
  let goed = true;
  for (let i = 0; i < dicht.length; i++) for (let j = i + 1; j < dicht.length; j++) {
    const nodig = dicht[i].actief || dicht[j].actief ? MIN_ACTIEF : MIN_DOT;
    if (langs(dicht[i], dicht[j]) < nodig - 0.6) goed = false;
  }
  ok(goed, 'markers in dezelfde richting schuiven uit elkaar');
  ok(dicht.find((q) => q.actief).s === b.sVoor(-0.9), 'het doel dat je volgt blijft op zijn plek staan');
  ok(place([{ a: 0, actief: true }, { a: 1, actief: true }], S).items.filter((q) => q.actief).length === 1, 'er is hooguit één boog');
  ok(spreid([{ s: 5, actief: false }], b.lengte).length === 1, 'spreid met één punt doet niets');

  // tekenen op een nep-canvas met Path2D
  globalThis.Path2D = globalThis.Path2D || class { constructor(d) { this.d = d; } };
  const maak = () => {
    const tel = { fill: 0, stroke: 0, arc: 0, save: 0, restore: 0, text: 0, radii: [] };
    const c = new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 30 }) : k === 'fillText' ? () => { tel.text++; } : k in tel ? (...a) => { tel[k]++; if (k === 'arc') tel.radii.push(a[2]); } : () => {}), set: () => true });
    return { c, tel };
  };
  const items = [{ a: -0.8, kleur: '#f9c80e', icoon: 'ster', actief: true, tekst: '420 m' }, { a: 0.4, kleur: '#c068ff', icoon: 'vlag' }, { a: 2.5, kleur: '#4363d8', icoon: 'speler' }];
  const m1 = maak(), m2 = maak(), leeg = maak();
  const r1 = drawKompasRand(m1.c, S, items, { t: 0.3, beweging: true });
  drawKompasRand(m2.c, S, items, { t: 0.3, beweging: false });
  ok(drawKompasRand(leeg.c, S, [], {}).length === 0 && leeg.tel.fill === 0 && leeg.tel.stroke === 0, 'zonder doelen tekent de kaart niets (rustige kaart)');
  ok(r1.length === 3 && m1.tel.save === m1.tel.restore, 'drie markers, save en restore in evenwicht');
  ok(m1.tel.text === 1, 'alleen het doel dat je volgt krijgt een afstand (' + m1.tel.text + ' teksten)');
  ok(m1.tel.fill > 4 && m1.tel.stroke > 3, 'schijven, iconen en randen worden getekend');
  ok(!m2.tel.radii.some((r) => r > ACTIVE_R && r < ACTIVE_R + 0.7) && m1.tel.radii.some((r) => r > ACTIVE_R && r < ACTIVE_R + 0.7), 'met Beweging beperken pulseert het doel niet');
  // elk type heeft een Phosphor-icoon in de icoonset
  for (const [g, naam] of Object.entries(GLYPH)) ok(iconBekend(naam), `glyph ${g} is een bestaand Phosphor-icoon (${naam})`);
}
// 17. de bedrading: de minikaart leest nav, de oude losse pijlen zijn weg; de tokens staan er
{
  const hud = fs.readFileSync(new URL('../game/js/hud_panel.js', import.meta.url), 'utf8');
  ok(/resolveNavTargets\(/.test(hud) && !/missionEdge|jobEdge|wpEdge|heliEdge|lekEdge/.test(hud), 'hud_panel.js: de minikaart krijgt zijn markeringen uit navtarget.js, geen losse missionEdge/jobEdge/wpEdge meer');
  ok(/NAV_ROL\.eigen/.test(hud), 'hud_panel.js: ROUTE_COLORS volgt NAV_ROL');
  ok(/drawKompasRand\(/.test(hud) && !/drawNavPijl|drawEdgeArrow/.test(hud), 'hud_panel.js tekent de kompasboog, niet de oude pijl');
  ok(/reducedMotion\(\)/.test(hud) && /--nav-doel/.test(hud), 'hud_panel.js: Beweging beperken en de kleur van de GPS-kaart');
  const ka = fs.readFileSync(new URL('../game/js/kaartactie.js', import.meta.url), 'utf8');
  ok(/rond icoon tegen de rand/.test(ka), 'Zo werkt de kaart legt het randicoon uit');
  const css = fs.readFileSync(new URL('../game/js/ds-tokens.css', import.meta.url), 'utf8');
  for (const t of ['--nav-actief', '--nav-eigen', '--nav-secundair']) ok(css.includes(t + ':'), `ds-tokens.css heeft ${t}`);
  const a11y = fs.readFileSync(new URL('../game/js/a11y.js', import.meta.url), 'utf8');
  ok(/--nav-actief/.test(a11y) && /--nav-eigen/.test(a11y), 'a11y.js zet de doelkleuren op de kleurenblindpaletten');
}

// 18. de momentopname uit de wereld (minikaart en grote kaart delen hem) en de afstand
{
  const w = { mission: { marker: { x: 300, y: 0 }, phase: 'idle', label: 'M1' }, sideJob: null, storyGuide: { x: 302, y: 1, name: 'Gids' }, storyFreePlay: false };
  const r = resolveNavTargets(snapshotFromWorld(w, { speler: sp, modus: 'auto', goal: { x: 0, y: 600, name: 'Plek', kind: 'place' }, missieOpKaart: true }));
  ok(r.actief.type === 'eigen' && r.secundair.length === 1 && r.secundair[0].id === 'missie', 'uit de wereld: eigen doel actief, de missie wacht, de gids valt samen met de missie');
  const heli = resolveNavTargets(snapshotFromWorld({ ...w, heliRun: true }, { speler: sp, heli: { x: 0, y: 50 } }));
  ok(heli.actief && heli.actief.type === 'heli' && heli.alle.length === 1, 'uit de wereld: een heli-run toont alleen zijn eigen doel');
  const mini = resolveNavTargets(snapshotFromWorld(w, { speler: sp, busyGame: true }));
  ok(mini.alle.length === 0, 'uit de wereld: een minigame laat de kaart rustig');
  const route = { target: { x: 0, y: 601 }, remaining: 910 };
  ok(distanceFor({ x: 0, y: 600, afstand: 600 }, route) === 910 && distanceFor({ x: 50, y: 600, afstand: 600 }, route) === 600 && distanceFor({ x: 0, y: 600, afstand: 600 }, null) === 600, 'de afstand volgt de route, anders hemelsbreed');
  const maak = () => { const tel = { fill: 0, stroke: 0, text: 0 }; const c = new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 30 }) : k === 'fillText' ? () => { tel.text++; } : k in tel ? () => { tel[k]++; } : () => {}), set: () => true }); return { c, tel }; };
  const g = maak();
  drawMapTargets(g.c, [{ sx: 50, sy: 60, kleur: '#f9c80e', icoon: 'ster', actief: true, tekst: '420 m' }, { sx: 90, sy: 60, kleur: '#c068ff', icoon: 'vlag', actief: false }, { sx: 120, sy: 60, kleur: '#c068ff', icoon: 'vlag', actief: true, tekst: '90 m', zonderSchijf: true }], { s: 1, beweging: false });
  ok(g.tel.text === 2 && g.tel.fill > 4, 'grote kaart: afstand bij het actieve doel, ook bij een doel met een eigen pin');
  const leeg = maak(); drawMapTargets(leeg.c, [], {}); ok(leeg.tel.fill === 0, 'grote kaart: zonder doelen niets');
}
// 19. één geel (ds-tokens: ink-geel) en de 3D-bakens
{
  const geel = dsKleur('ink-geel');
  ok(PALETTES.uit.mission === geel && geel === '#f9c80e', 'het geel van de missie is het hoofdgeel van de tokens');
  const mini = kaartLand().mini;
  ok(contrast(geel, dsKleur('glas')) >= 4.5, 'geel leest op glas (4,5:1)');
  for (const bg of ['meadow', 'park', 'forest', 'village']) ok(contrast(geel, mini[bg]) >= 3, `geel tegen de minikaart (${bg}) haalt 3:1`);
  ok(contrast(dsKleur('inkt'), geel) >= 4.5, 'inkt op geel leest (4,5:1); geel tegen papier heeft altijd een inktrand');
  const wm = fs.readFileSync(new URL('../game/js/worldmarker3d.js', import.meta.url), 'utf8');
  ok(!/missionActive/.test(wm) && /goal: \{ color: NAV_ROL\.missie/.test(wm) && /checkpoint: \{ color: NAV_ROL\.uitdaging/.test(wm) && /user: \{ color: NAV_ROL\.eigen/.test(wm), '3D-bakens: goal en checkpoint geel, eigen doel paars, via NAV_ROL');
  const mm = fs.readFileSync(new URL('../game/js/missionmarker3d.js', import.meta.url), 'utf8');
  ok(/MARKER_COLOR_ACTIVE = 0xf9c80e/.test(mm), 'de ringen van de actieve missie zijn geel, niet cyaan');
  const mv = fs.readFileSync(new URL('../game/js/mapview.js', import.meta.url), 'utf8');
  ok(/resolveNavTargets\(snapshotFromWorld/.test(mv) && /drawMapTargets\(/.test(mv), 'de grote kaart leest navtarget.js');
}

// 20. compact (ronde 4): afstandstekst, inzet, klemming, obstakels
{
  ok(compactDistance(0) === '10 m' && compactDistance(84) === '80 m' && compactDistance(420) === '420 m' && compactDistance(994) === '990 m', 'afstand: meters onder een kilometer op tientallen');
  ok(compactDistance(995) === '1,0 km' && compactDistance(4730) === '4,7 km' && compactDistance(9940) === '9,9 km', 'afstand: een decimaal onder 10 km');
  ok(compactDistance(9950) === '10 km' && compactDistance(12400) === '12 km' && compactDistance(123456) === '123 km', 'afstand: hele kilometers vanaf 10 km, geen decimale ruis');
  ok(compactDistance(NaN) === '' && compactDistance(-5) === '', 'afstand: geen onzin bij een ongeldige waarde');
  const S = 250, b = track(S);
  // inzet: de schijf zit 3 px van de rand (op de rechte stukken), nooit erbuiten
  ok(TRACK_INSET - ACTIVE_R >= 2.5 && TRACK_INSET - ACTIVE_R <= 4, `vaste inzet van de schijf: ${TRACK_INSET - ACTIVE_R} px van de rand`);
  let binnen = true; for (let q = 0; q < b.lengte; q += 2) { const [x, y] = b.punt(q); if (Math.min(x, y, S - x, S - y) < ACTIVE_R + 2) binnen = false; }
  ok(binnen, 'elke plek op de baan houdt de schijf binnen de kaart');
  // de tag staat tegen de schijf aan, aan de binnenkant, en nooit buiten de kaart
  const l = tagPlek(TRACK_INSET, 120, S, 38, 17), r = tagPlek(S - TRACK_INSET, 120, S, 38, 17), o = tagPlek(120, TRACK_INSET, S, 38, 17), u = tagPlek(120, S - TRACK_INSET, S, 38, 17);
  ok(l.kant === 0 && l.cx - 19 >= TRACK_INSET + ACTIVE_R + TAG_GAP - 0.01 && Math.abs(l.cy - 120) < 0.01, 'tag links: rechts naast de schijf, op dezelfde hoogte');
  ok(r.kant === 2 && r.cx + 19 <= S - TRACK_INSET - ACTIVE_R - TAG_GAP + 0.01, 'tag rechts: links naast de schijf');
  ok(o.kant === 1 && o.cy - 8.5 >= TRACK_INSET + ACTIVE_R + TAG_GAP - 0.01 && u.kant === 3 && u.cy + 8.5 <= S - TRACK_INSET - ACTIVE_R - TAG_GAP + 0.01, 'tag boven en onder: aan de binnenkant');
  const hoek = tagPlek(TRACK_INSET, TRACK_INSET, S, 60, 17);
  ok(hoek.cx - 30 >= 2 && hoek.cy - 8.5 >= 2 && hoek.cx + 30 <= S - 2, 'tag in de hoek blijft binnen de kaart');
  // obstakels: een marker op de plek van de N-badge schuift opzij en blijft op de baan
  const n = place([{ a: -Math.PI / 2, actief: true }], S, [{ a: -Math.PI / 2, nodig: 28 }]).items[0];
  const noord = b.sVoor(-Math.PI / 2);
  const afstandTotN = Math.min(Math.abs(n.s - noord) % b.lengte, b.lengte - (Math.abs(n.s - noord) % b.lengte));
  ok(afstandTotN >= 28 - 0.6, `het doel dat je volgt wijkt voor de N-badge (${afstandTotN.toFixed(1)} px) en blijft op de baan`);
  const punt = place([{ a: -Math.PI / 2, actief: false }], S, [{ a: -Math.PI / 2, nodig: 28 }]).items[0];
  const dp = Math.min(Math.abs(punt.s - noord) % b.lengte, b.lengte - (Math.abs(punt.s - noord) % b.lengte));
  ok(dp >= 28 - 0.6, `een wachtend doel schuift weg van de N-badge (${dp.toFixed(1)} px)`);
  const wind = place([{ a: 2.7, actief: false }, { a: 2.75, actief: false }], S, [{ a: 2.72, nodig: 30 }]).items;
  ok(wind.every((q) => Math.min(Math.abs(q.s - b.sVoor(2.72)) % b.lengte, b.lengte - (Math.abs(q.s - b.sVoor(2.72)) % b.lengte)) >= 30 - 0.6), 'punten wijken ook voor het windschijfje');
  const hud = fs.readFileSync(new URL('../game/js/hud_panel.js', import.meta.url), 'utf8');
  ok(/compactDistance\(/.test(hud) && /obstakels/.test(hud), 'hud_panel.js: compacte afstand en obstakels');
  ok(DOT_R < ACTIVE_R && DOT_R * 2 >= 16, 'punten kleiner dan de schijf, maar minstens 16 px');
}

console.log(`navtarget_test: ${n} controles, ${fails} fouten`);
process.exit(fails ? 1 : 0);
