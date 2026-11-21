// navdoel.js en navpijl.js (#1078): welk doel de pijl volgt, wat wacht, wat dezelfde plek is, wat klaar is; de kleur per type en de pijl zelf.
// Puur: geen DOM, geen spel. Samen spelen: de doelen zijn per speler lokaal; de groep komt als eigen lijst binnen (net als in coopmissie.js).
import fs from 'node:fs';
import { bepaalNavDoelen, navKleur, navTekst, routeRol, eigenGlyph, lijnVoor, NAV_ROL, NAV_TYPES, GLYPH, MAX_SECUNDAIR, AANKOMST_M, ROUTE_TYPE } from '../game/js/navdoel.js';
import { drawNavPijl, NAV_PIJL_VORMEN } from '../game/js/navpijl.js';
import { PALETTES } from '../game/js/a11y.js';

let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } };
const sp = { x: 0, y: 0 };
const bij = (x, y, extra = {}) => ({ x, y, name: 'doel', ...extra });
const nav = (s) => bepaalNavDoelen({ speler: sp, modus: 'auto', ...s });
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
  ok(navKleur(r.actief, PALETTES.uit) === PALETTES.uit.mission, 'het verhaal is geel');
}
// 3. een eigen doel gaat voor het verhaal; het verhaal wacht (hol), geen tweede gevulde pijl
{
  const r = nav({ verhaal: bij(500, 0), eigen: bij(0, 600, { soort: 'place' }) });
  ok(r.actief.type === 'eigen' && r.actief.glyph === 'vlag', 'eigen plek: actief met een vlag');
  ok(r.secundair.length === 1 && r.secundair[0].type === 'verhaal' && r.secundair[0].rol === 'secundair', 'het verhaal wacht');
  ok(r.alle.filter((d) => d.rol === 'actief').length === 1, 'precies één actief doel');
  ok(navKleur(r.actief, PALETTES.uit) === PALETTES.uit.user, 'eigen doel is paars');
  ok(navKleur(r.secundair[0], PALETTES.uit) === PALETTES.uit.mission, 'het wachtende verhaal houdt zijn gele icoonkleur');
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
  ok(navKleur(r.actief, PALETTES.uit) === PALETTES.uit.job, 'een klus houdt zijn eigen kleur');
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
  ok(lijnVoor('fiets') === 'weg', 'een fiets rijdt over de weg');
}
// 12. Samen spelen: het doel van de groep telt als missie; een gast met een eigen doel houdt zijn eigen doel erbij
{
  const r = nav({ groep: [bij(0, 300)], eigen: bij(400, 0, { soort: 'place' }) });
  ok(r.actief.type === 'groep' && r.secundair[0].type === 'eigen', 'het doel van de groep gaat voor het eigen doel, dat wacht');
  ok(navKleur(r.actief, PALETTES.uit) === PALETTES.uit.mission, 'de missie van de groep is geel');
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
  ok(navKleur(doel, PALETTES.uit) === PALETTES.uit.user && routeRol('user') === 'user', 'standaard: jouw doel is paars');
  const oud = NAV_ROL.eigen;
  NAV_ROL.eigen = 'mission';
  ok(navKleur(doel, PALETTES.uit) === PALETTES.uit.mission && routeRol('user') === 'mission', 'met één regel wordt jouw doel geel');
  NAV_ROL.eigen = oud;
  ok(routeRol('user') === 'user', 'terug op paars');
  for (const kind of Object.keys(ROUTE_TYPE)) ok(Object.keys(PALETTES.uit).includes(routeRol(kind)), `routesoort ${kind} heeft een paletrol`);
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
// 16. de tekening: gevuld of hol, elke glyph tekent zonder fout en komt in evenwicht (save/restore)
{
  for (const hol of [false, true]) for (const glyph of NAV_PIJL_VORMEN.concat(['', 'onbekend'])) {
    const tel = { save: 0, restore: 0, fill: 0, stroke: 0 };
    const c2 = new Proxy({}, { get: (t, k) => (k in tel ? (...a) => { tel[k]++; } : () => {}), set: () => true });
    try { drawNavPijl(c2, 100, 100, 0.5, { kleur: '#f9c80e', hol, glyph, s: 1.25 }); } catch (e) { ok(false, `tekenen ${glyph} ${hol}: ${e.message}`); continue; }
    ok(tel.save === tel.restore && tel.save === 1, `save/restore in evenwicht (${glyph || 'geen'} ${hol ? 'hol' : 'gevuld'})`);
    ok(tel.stroke >= (hol ? 2 : 1), `de pijl heeft een rand (${hol ? 'hol: kleur en donkere rand' : 'gevuld'})`);
  }
}
// 17. de bedrading: de minikaart leest nav, de oude losse pijlen zijn weg; de tokens staan er
{
  const hud = fs.readFileSync(new URL('../game/js/hud_panel.js', import.meta.url), 'utf8');
  ok(/bepaalNavDoelen\(/.test(hud) && !/missionEdge|jobEdge|wpEdge|heliEdge|lekEdge/.test(hud), 'hud_panel.js: de minikaart krijgt zijn pijlen uit navdoel.js, geen losse missionEdge/jobEdge/wpEdge meer');
  ok(/NAV_ROL\.eigen/.test(hud), 'hud_panel.js: ROUTE_COLORS volgt NAV_ROL');
  const css = fs.readFileSync(new URL('../game/js/ds-tokens.css', import.meta.url), 'utf8');
  for (const t of ['--nav-actief', '--nav-eigen', '--nav-secundair']) ok(css.includes(t + ':'), `ds-tokens.css heeft ${t}`);
  const a11y = fs.readFileSync(new URL('../game/js/a11y.js', import.meta.url), 'utf8');
  ok(/--nav-actief/.test(a11y) && /--nav-eigen/.test(a11y), 'a11y.js zet de doelkleuren op de kleurenblindpaletten');
}

console.log(`navdoel_test: ${n} controles, ${fails} fouten`);
process.exit(fails ? 1 : 0);
