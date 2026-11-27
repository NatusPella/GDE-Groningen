// Het clubwapen van de voetbalcarrière (Club-UI, ontwerp docs/ontwerp/CLUB-UI-24-11.md): een schild in de clubkleuren (shirt, accent, patroon uit voetbalclubs.js) met een klein symbool.
// Puur, geen DOM (scripts/voetbal_wapen_test.mjs). Elke club in één klasse heeft een eigen combinatie (kleur, accent, patroon en symbool); het symbool komt deterministisch uit de club-id en schuift
// alleen door als een klasgenoot al dezelfde combinatie had. De clubkleuren zijn gegevens uit de clubdata (inline), de rest van het schild leest alleen de tokens van het designsysteem.
import { hashSeed } from './voetbalplayers.js';
import { escapeHtml as esc } from './htmlescape.js';

export const hexOf = (n) => `#${(Number.isFinite(n) ? n & 0xffffff : 0x888888).toString(16).padStart(6, '0')}`;
// Acht symbolen in een vak van 100 x 115 rond (50, 42); elk een eigen vorm, zodat het wapen ook zonder kleur te onderscheiden is.
export const EMBLEMS = [
  { id: 'ring', d: 'M50 28a14 14 0 1 0 0.01 0z' },
  { id: 'ster', d: 'M50 26l4.6 9.6 10.6 1.4-7.7 7.4 1.9 10.5L50 49.700l-9.4 5.200 1.9-10.500-7.700-7.400 10.600-1.400z' },
  { id: 'kruis', d: 'M44 26h12v12h12v12H56v10H44V50H32V38h12z' },
  { id: 'toren', d: 'M36 58V34h6v4h5v-4h6v4h5v-4h6v24z' },
  { id: 'golf', d: 'M30 44q10-14 20 0t20 0v12q-10 14-20 0t-20 0z' },
  { id: 'balk', d: 'M30 52l32-26 8 8-32 26z' },
  { id: 'ruit', d: 'M50 24l17 19-17 19-17-19z' },
  { id: 'dak', d: 'M32 56V42l18-18 18 18v14l-18-14z' },
];
const PATTERN_SVG = {
  effen: () => '',
  'brede-streep': (c) => `<rect x="36" y="0" width="28" height="120" fill="${c}"/>`,
  helften: (c) => `<rect x="50" y="0" width="50" height="120" fill="${c}"/>`,
  'smalle-streep': (c) => `<rect x="22" y="0" width="10" height="120" fill="${c}"/><rect x="45" y="0" width="10" height="120" fill="${c}"/><rect x="68" y="0" width="10" height="120" fill="${c}"/>`,
};
const sig = (c, e) => `${c.shirt}|${c.accent}|${c.patroon}|${e}`;
// Het symbool van een club, uniek binnen zijn klasgenoten (een lijst clubs met id, shirt, accent en patroon; mag de club zelf bevatten). Deterministisch: klasgenoten met een lagere id gaan voor.
export function emblemIndex(club, mates = []) {
  if (!club) return 0;
  if (Number.isInteger(club.emblem)) return Math.abs(club.emblem) % EMBLEMS.length;     // een wedstrijdteam draagt het symbool uit zijn klas al mee (matchSetup)
  const start = hashSeed('wapen', club.id) % EMBLEMS.length;
  const others = mates.filter((m) => m && m.id !== club.id).sort((a, b) => (String(a.id) < String(b.id) ? -1 : 1));
  const taken = new Set();
  for (const m of others) {
    if (String(m.id) > String(club.id)) break;
    let e = hashSeed('wapen', m.id) % EMBLEMS.length, g = 0;
    while (taken.has(sig(m, e)) && g++ < EMBLEMS.length) e = (e + 1) % EMBLEMS.length;
    taken.add(sig(m, e));
  }
  let e = start, guard = 0;
  while (taken.has(sig(club, e)) && guard++ < EMBLEMS.length) e = (e + 1) % EMBLEMS.length;
  return e;
}
let uid = 0;
// De SVG van het wapen. `maat` is xs, s, m, l of xl (de klasse .vb-wapen--maat); `naam` komt in de aria-label.
export function crestSvg(club, mates = [], maat = 'm') {
  if (!club) return '';
  const id = `wp${++uid}`, e = EMBLEMS[emblemIndex(club, mates)], shirt = hexOf(club.shirt), accent = hexOf(club.accent);
  const pat = (PATTERN_SVG[club.patroon] || PATTERN_SVG.effen)(accent);
  const body = 'M8 6H92V58C92 88 70 104 50 112C30 104 8 88 8 58Z';
  return `<span class="vb-wapen vb-wapen--${esc(maat)}" role="img" aria-label="Wapen van ${esc(club.naam)}"><svg viewBox="0 0 100 115" aria-hidden="true"><defs><clipPath id="${id}"><path d="${body}"/></clipPath></defs>` +
    `<g clip-path="url(#${id})"><rect width="100" height="120" fill="${shirt}"/>${pat}</g><path d="${body}" class="vb-wapen__rand"/><path d="${e.d}" class="vb-wapen__teken" data-teken="${e.id}"/></svg></span>`;
}
export const crestKey = (club, mates = []) => sig(club, emblemIndex(club, mates));
