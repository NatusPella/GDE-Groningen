// Akte 2 "perfect" (22-11, verhaal-perfect): de stappen van akte 2 in volgorde, hun reisdoelen, kalenderdagen, tekstdieet,
// dubbele grappen, Beppes Friese regels (ondertitel en uitspraakhulp), de props van de regie en de stemwachtlijst.
//   node scripts/verhaal_akte2_perfect_test.mjs
// Zuiver node: de wereldcontrole (open grond bij een weg) staat in scripts/akte2_bereik_audit.mjs (vraagt game/world).
import './node3d.mjs';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const { STEPS } = await import('../game/js/storyarc_nieuw.js');
const { wgsToWorld } = await import('../game/js/rdnew.js');
const { dutchFor, FY, FY_UITSPRAAK, uitspraakFor, looksFrisian } = await import('../game/js/subtitles.js');
const { SPECS_AKTE2 } = await import('../game/js/cutscenes_akte2.js');
const { propKindIssue, DECOR_KINDS } = await import('../game/js/cutscenemodels.js');
const { PROP_KINDS } = await import('../game/js/cutscript.js');
const script = JSON.parse(fs.readFileSync(new URL('game/storydata/script.json', root), 'utf8'));
const scene = (id) => script.scenes.find((s) => s.id === id);
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const words = (t) => String(t).trim().split(/\s+/).filter(Boolean).length;

// --- 1. de stappen van akte 2, in volgorde ---
// N10 en N8 horen sinds de hoofdstuklijn (28-11) bij hoofdstuk 3 en staan in het deel 'kop'
const ORDER = ['M07', 'M08', 'T1', 'M09', 'N5', 'K1', 'M10', 'A1', 'N11', 'N12', 'N6', 'N7', 'T2', 'M11', 'K2'];
const act2 = STEPS.filter((s) => s.part === 'romp').map((s) => s.id);
ok(ORDER.join() === act2.join(), 'akte 2: de volgorde van de stappen is die van de ruggengraat', act2.join(' '));
for (const id of ORDER) {
  const st = STEPS.find((s) => s.id === id);
  ok(st && st.built, `${id}: gebouwd`);
  ok(st && st.lead && words(st.lead[1]) <= 27, `${id}: de lead is hoogstens 27 woorden`, st && st.lead ? words(st.lead[1]) : '');
  for (const sc of (st && st.scenes) || []) ok(scene(sc), `${id}: scène ${sc} staat in script.json`);
  if (st && st.goal && st.goal.type === 'reis') {
    const [x, y] = wgsToWorld(st.goal.at[0], st.goal.at[1]);
    ok(Number.isFinite(x) && Number.isFinite(y) && st.goal.r >= 250 && st.goal.r <= 500, `${id}: reisdoel met een straal van 250 tot 500 m`);
    if (st.goal.scene) ok(scene(st.goal.scene), `${id}: de scène van het reisdoel bestaat`);
  }
}
// opeenvolgende reisdoelen overlappen niet: anders loopt de volgende stap meteen af omdat de speler al binnen zijn straal staat
const at = (id) => { const g = STEPS.find((s) => s.id === id).goal; return wgsToWorld(g.at[0], g.at[1]); };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const rOf = (id) => STEPS.find((s) => s.id === id).goal.r;
for (let i = 0; i < ORDER.length - 1; i++) {
  const [a, b] = [ORDER[i], ORDER[i + 1]];
  const A = STEPS.find((s) => s.id === a), B = STEPS.find((s) => s.id === b);
  if (A.goal && A.goal.type === 'reis' && B.goal && B.goal.type === 'reis') ok(dist(at(a), at(b)) > rOf(a) + rOf(b), `${a} -> ${b}: de reisdoelen overlappen niet`, Math.round(dist(at(a), at(b))) + ' m');
}
ok(dist(at('N5'), at('K1')) > rOf('N5') + rOf('K1'), 'N5 en K1: de erf- en pastoriescène lopen niet in elkaar');

// --- 2. kalender: de dagen in de regie lopen niet terug ---
const DAGEN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
const dayOf = (st) => {
  for (const sc of st.scenes || []) {
    const s = scene(sc);
    for (const r of (s && s.regie) || []) { const m = new RegExp(DAGEN.join('|')).exec(String(r).toLowerCase()); if (m) return DAGEN.indexOf(m[0]); }
  }
  return null;
};
let last = -1;
for (const id of ORDER) {
  const d = dayOf(STEPS.find((s) => s.id === id));
  if (d === null) continue;
  ok(d >= last, `${id}: de dag in de regie (${DAGEN[d]}) gaat niet terug`, `vorige ${DAGEN[last]}`);
  last = Math.max(last, d);
}
ok(/vrijdag/.test(scene('K2').regie[0]), 'K2: de ochtend na de zandplaat is vrijdag, niet donderdag');

// --- 3. geen dubbele grap: dezelfde regel van dezelfde spreker staat niet in twee scènes van akte 2 ---
const SCOPE = ['M07.1', 'M07.2', 'M07.3', 'M07.4', 'M08.1', 'M08.2', 'M08.3', 'M08.4', 'O4', 'N10', 'N8', 'T1', 'M09.1', 'M09.3', 'M09.4', 'N5', 'K1', 'M10.1', 'M10.2', 'M10.3', 'M10.4', 'M10.5', 'O5', 'N11', 'N12', 'N6', 'N7', 'T2', 'M11.1', 'M11.3', 'M11.5', 'M11.6', 'M11.8', 'B2', 'B2.1', 'B2.2'];
const seen = new Map();
const TOEGESTAAN = new Set(['Tessa|Tammo.', 'Tessa|Rijden, niet praten.', 'Tessa|Niks. Iemand uit Friesland.']); // terugkerende grappen (bewust: de tweede keer is een terugkomer)
let dubbel = 0;
for (const id of SCOPE) {
  for (const l of scene(id).lines) {
    if (words(l.text) < 3 || l.channel === 'app-stil') continue;
    const k = l.speaker + '|' + l.text;
    if (TOEGESTAAN.has(k)) continue;
    if (seen.has(k) && seen.get(k) !== id) { dubbel++; ok(false, `dubbele regel in ${seen.get(k)} en ${id}`, k); }
    seen.set(k, id);
  }
}
ok(dubbel === 0, 'dubbele regels: geen (buiten de terugkerende grappen)');
// de kippengrap staat één keer: N5 herhaalt hem niet
const kip = (id) => scene(id).lines.filter((l) => /kippen/.test(l.text) && /vroeg/.test(l.text)).length;
ok(kip('M09.1') === 1 && kip('N5') === 0, 'de kippengrap staat alleen in M09.1', `${kip('M09.1')} / ${kip('N5')}`);
ok(scene('K1').lines.every((l) => !/voor ze kon lezen/.test(l.text)), 'K1: de eierensorteergrap van M09.1 wordt niet herhaald');
// het appje in M11.6 heeft een aanleiding: de trilling, dan Tammo's vraag, dan Tessa's antwoord
const m116 = scene('M11.6').lines.map((l) => l.text);
ok(m116.indexOf('Wie appt je nou weer?') !== -1 && m116.indexOf('Wie appt je nou weer?') < m116.indexOf('Niks. Iemand uit Friesland.'), 'M11.6: Tammo vraagt wie appt voor Tessa antwoordt');

// --- 4. Beppe: Fries met Nederlandse ondertitel en uitspraakhulp ---
const beppeLines = new Set();
// alleen de Friese regels van Beppe: haar Nederlandse regels (Fries-getint Nederlands, bijbel 2.1) hebben geen tabelregel nodig
for (const s of script.scenes) for (const l of s.lines) if (l.key === 'beppe' && (looksFrisian(l.text) || FY[l.text])) beppeLines.add(l.text);
ok(beppeLines.size >= 8, 'Beppe heeft Friese regels in de scripts', beppeLines.size);
for (const t of beppeLines) {
  ok(!!FY[t], `Beppe-regel staat in de Friese tabel (FY): ${t}`);
  ok(dutchFor(t) && dutchFor(t) !== t, `Beppe-regel heeft een Nederlandse ondertitel: ${t}`);
  ok(uitspraakFor(t), `Beppe-regel heeft een uitspraakmarkering: ${t}`);
}
for (const [k, v] of Object.entries(FY_UITSPRAAK)) {
  ok(FY[k] && beppeLines.has(k), `uitspraakmarkering hoort bij een Friese Beppe-regel: ${k}`);
  ok(/[A-Z]{2,}/.test(v) && !/[ûêâôú]/.test(v), `uitspraakmarkering heeft klemtoon en geen Friese tekens: ${v}`);
  ok(Math.abs(words(v) - words(k)) <= 1, `uitspraakmarkering heeft evenveel woorden als de regel: ${v}`);
}
// Mem en Oma spreken Nederlands; Friese woorden daarin hebben een ondertitel
for (const id of ['O4', 'O5']) for (const l of scene(id).lines) if (looksFrisian(l.text)) ok(dutchFor(l.text), `${id}: Friese woorden hebben een ondertitel: ${l.text}`);

// --- 5. de regie: elke beat vindt zijn regel; elke prop is een bestaande soort met een bouwer ---
let audit = '';
try { audit = execFileSync(process.execPath, [fileURLToPath(new URL('akte2_beats_audit.mjs', import.meta.url))], { encoding: 'utf8', env: process.env }); } catch (e) { audit = String(e.stdout || e.message); }
ok(/(\d+)\/\1 beats/.test(audit), 'regiebeats van akte 2 vinden allemaal hun regel', audit.trim().split('\n').slice(0, 3).join(' | '));
const host = fs.readFileSync(new URL('game/js/storyprops.js', root), 'utf8');
// de gedeelde props uit het register (propregister.js CUTSCENE_PROPS) bouwt storyprops.js met registerProp, niet met een eigen regel
const { CUTSCENE_PROPS } = await import('../game/js/propregister.js');
const registerBouwt = /CUTSCENE_PROPS\.map\(\(id\) => \[id, registerProp\(id\)\]\)/.test(host);
for (const kind of DECOR_KINDS) ok(CUTSCENE_PROPS.includes(kind) ? registerBouwt : new RegExp('\\n\\s+' + kind + ': \\(\\) =>').test(host), `decorsoort ${kind} heeft een bouwer in storyprops.js (DECOR_MAKERS of het propregister; de bouwers verhuisden uit cutscenehost.js, #1121)`);
for (const kind of DECOR_KINDS) ok(PROP_KINDS.includes(kind), `decorsoort ${kind} staat in PROP_KINDS van cutscript.js`);
for (const [key, spec] of Object.entries(SPECS_AKTE2)) for (const [id, p] of Object.entries(spec.props || {})) ok(propKindIssue(p.kind) === null, `${key}: prop ${id} (${p.kind}) bestaat`);
ok(SPECS_AKTE2['M11.3'] && SPECS_AKTE2['M11.3'].props.trommel.kind === 'broodtrommel', 'M11.3 toont de broodtrommel met het briefje van Mem');
ok(SPECS_AKTE2['M08.outro'].props.prikbord && SPECS_AKTE2['M08.outro'].props.prikbord.kind === 'prikbord', 'M08.3 hangt het prikbord waar Tessa naar verwijst');

// --- 6. stemmen: een gewijzigde regel zonder opname staat op de wachtlijst (de TTS-ronde volgt) ---
const wacht = JSON.parse(fs.readFileSync(new URL('scripts/voice_wacht.json', root), 'utf8')).keys;
const nieuw = scene('N5').lines.find((l) => /jeugd/.test(l.text));
const opgenomen = JSON.parse(fs.readFileSync(new URL('game/audio/voicelines/lines/manifest.json', root), 'utf8'));
ok(nieuw && (nieuw.textOnly || wacht.includes('Anita|' + nieuw.text) || ('Anita|' + nieuw.text) in opgenomen), 'N5: de nieuwe Tessa-regel is alleen tekst, wacht op opname of is al opgenomen (TTS-ronde 3)');

console.log(`verhaal_akte2_perfect_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
