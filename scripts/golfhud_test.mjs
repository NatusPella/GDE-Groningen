// De HUD, de iconen en de geluiden van het golf (#453): golficons.js, golfhud.js, de golf-events in audio.js en pitchputt.js.
//   node scripts/golfhud_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { golfIcon, GOLF_ICONEN } from '../game/js/golficons.js';
import { golfRij, krachtTekst, scoreTabel, scoreCel, afstandTekst, GOLF_CSS } from '../game/js/golfhud.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let n = 0;
const ok = (c, m) => { n++; assert.ok(c, m); };

// iconen: elk een eigen vorm, verborgen voor schermlezers (de tekst ernaast zegt het), geen echte merken, geen losse kleuren buiten het palet
for (const naam of GOLF_ICONEN) {
  const s = golfIcon(naam, 20);
  ok(/^<svg class="gf-ic" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">/.test(s) && s.endsWith('</svg>'), `${naam}: een svg`);
  ok(/<polygon|<ellipse|<rect/.test(s), `${naam}: vlakken`);
  ok(!/stroke=|filter|<image|<text/.test(s), `${naam}: geen contour of plaatje (low-poly)`);
}
ok(GOLF_ICONEN.length >= 8 && ['vlag', 'bal', 'wedge', 'putter', 'zand', 'water', 'beurt'].every((i) => GOLF_ICONEN.includes(i)), 'de iconen die de HUD nodig heeft');
ok(golfIcon('bestaatniet') === '', 'onbekend icoon geeft niets');
ok(new Set(GOLF_ICONEN.map((i) => golfIcon(i))).size === GOLF_ICONEN.length, 'elk icoon ziet er anders uit');

// de rij
{
  const r = golfRij({ wie: 'Speler 2', baan: 3, banen: 6, par: 3, slag: 2, vlag: 24.3, club: 'wedge', ondergrond: 'gras' });
  ok(r.includes('Speler 2') && r.includes('Baan <b>3</b>/6') && r.includes('Par <b>3</b>') && r.includes('Slag <b>2</b>') && r.includes('24 m') && r.includes('Wedge'), 'de rij toont wie, baan, par, slag, afstand en stok');
  ok(golfRij({ baan: 1, banen: 6, par: 2, slag: 1, vlag: 3.46, club: 'putter' }).includes('3,5 m'), 'een kleine afstand met een komma');
  ok(golfRij({ baan: 1, banen: 6, par: 2, slag: 1, vlag: 3, club: 'putter' }).includes('Putter') && !golfRij({ baan: 1, banen: 6, par: 2, slag: 1, vlag: 3, club: 'putter' }).includes('gf-wie'), 'een putter, zonder beurtnaam bij één speler');
  ok(golfRij({ baan: 1, banen: 6, par: 3, slag: 3, vlag: 10, club: 'wedge', ondergrond: 'zand' }).includes('Wedge (zand)'), 'zand staat erbij');
  ok(golfRij({ baan: 1, banen: 6, par: 3, slag: 3, vlag: 10, club: 'wedge', straf: 1 }).includes('+1 straf'), 'de strafslag staat erbij');
  ok(afstandTekst(9.94) === '9,9 m' && afstandTekst(10.2) === '10 m', 'afstandstekst');
  ok(krachtTekst(0.624) === '62%' && krachtTekst(-1) === '0%' && krachtTekst(3) === '100%', 'krachttekst');
}

// het scorebord
{
  const kaart = (slagen) => slagen.map((s, i) => ({ n: i + 1, par: 3, strokes: s || 0, done: s != null }));
  const cellen = (k, hole, bezig) => k.map((c, i) => scoreCel(c, i, hole, bezig));
  const a = kaart([3, 4, null, null, null, null]), b = kaart([2, 3, null, null, null, null]);
  const html = scoreTabel({
    nummers: [1, 2, 3, 4, 5, 6], huidigeBaan: 2,
    spelers: [
      { id: 's1', naam: 'Speler 1', aanDeBeurt: false, klaar: true, totaal: '+1', cellen: cellen(a, 2, 3) },
      { id: 's2', naam: 'Speler <2>', aanDeBeurt: true, klaar: false, totaal: '-2', cellen: cellen(b, 2, 1) },
      { id: 's3', naam: 'Gast', kijkt: true, totaal: 'E', cellen: cellen(a, 2, 0) },
    ],
  });
  ok(html.startsWith('<table class="gf-score">') && html.endsWith('</table>'), 'een tabel');
  ok((html.match(/<tr/g) || []).length === 4, 'een kop en een rij per speler');
  ok(html.includes('scope="row"') && html.includes('scope="col"'), 'kop- en rijkoppen voor schermlezers');
  ok(html.includes('Speler &lt;2&gt;') && !html.includes('<2>'), 'namen worden veilig gemaakt');
  ok(/<tr class="on"><th scope="row">[^]*Speler &lt;2&gt;/.test(html), 'wie aan de beurt is staat gemarkeerd');
  ok(html.includes('kijkt mee') && html.includes('class="on kijkt"') === false && html.includes('kijkt'), 'een toeschouwer kijkt mee');
  ok(html.includes('class="good"') && html.includes('class="bad nu"') === false, 'goed en slecht hebben eigen klassen');
  ok(html.includes('td class="tot">+1') && html.includes('td class="tot">-2'), 'de totalen tegen par');
  ok(scoreTabel({ spelers: [], nummers: [], huidigeBaan: 0 }) === '', 'zonder spelers niets');
  ok(scoreCel({ done: true, strokes: 2, par: 3 }, 0, 1).cls === 'good' && scoreCel({ done: true, strokes: 5, par: 3 }, 0, 1).cls === 'bad', 'cellen onder en boven par');
  ok(scoreCel({ done: false, n: 2 }, 1, 1, 0).t === '·' && scoreCel({ done: false, n: 2 }, 1, 1, 2).t === '2' && scoreCel({ done: false, n: 4 }, 3, 1).t === '-', 'bezig, onderweg en nog niet');
}

// de tekst is minstens 12 px en volgt het ontwerp (geen blauw, geen zwarte vlakken)
{
  const maten = [...GOLF_CSS.matchAll(/font-size:\s*(\d+)px/g)].map((m) => +m[1]);
  ok(maten.length >= 5 && maten.every((m) => m >= 12), `lettergroottes ${maten.join(',')}`);
  ok(!/#000\b|#000000|rgb\(0,\s*0,\s*0\)/.test(GOLF_CSS), 'geen zwarte vlakken');
}

// de krachtbalk en het bord (minigamekit.js)
{
  const kit = read('game/js/minigamekit.js');
  ok(/class="mg-extra"/.test(kit) && /mg-meter-t/.test(kit) && /s\.extra/.test(kit), 'het bord heeft een extra blok en een tekst bij de krachtbalk');
  ok([...kit.matchAll(/\.mg-meter-t \{[^}]*font-size:\s*(\d+)px/g)].every((m) => +m[1] >= 12), 'de tekst bij de balk is minstens 12 px');
}

// de geluiden: elk event van pitchputt.js heeft een geluid in audio.js, procedureel, geen stem en geen nieuwe opname
{
  const pp = read('game/js/pitchputt.js'), au = read('game/js/audio.js');
  const regel = (pp.match(/const GOLF_SUB = \{([^}]*)\}/) || [])[1] || '';
  const subs = [...regel.matchAll(/: '(\w+)'/g)].map((m) => m[1]);
  ok(new Set(subs).size >= 6, `pitchputt.js kent ${subs.join(',')}`);
  const fn = au.slice(au.indexOf('function playGolfEvent'), au.indexOf('function playCritterEvent'));
  for (const sub of [...new Set(subs), 'putt', 'rol']) ok(fn.includes(`'${sub}'`), `audio.js speelt ${sub}`);
  ok(/case 'golf': playGolfEvent\(e\.sub/.test(au), 'audio.js luistert naar golf-events');
  ok(!/new Audio\(|speechSynthesis|playBuf\(['"]/.test(fn), 'het golfgeluid is procedureel (toon en ruis)');
  ok(/kind: 'golf', sub: 'rol'/.test(pp), 'de rol heeft een geluid');
  ok(/pushAudioEvent\(w, \{ kind: 'golf'/.test(pp), 'pitchputt.js stuurt golf-events');
}

console.log(`golfhud_test ok (${n} controles)`);
