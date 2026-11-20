// #804: wat kost de simhud-vergelijking per beeld: de hele HTML-string (oud) of de JSON-vingerafdruk van het model (nieuw)?
//   node scripts/perf/simhud_bench.mjs
import { simHudHtml, modelSleutel } from '../../game/js/simhud.js';
const m = {
  id: 'hengel', titel: 'Hengelen', icoon: 'vis', plek: 'Noorderplantsoen',
  stappen: [{ label: 'Werp uit', icoon: 'vis', stand: 'klaar' }, { label: 'Wacht op een beet', icoon: 'klok', stand: 'nu' }, { label: 'Haal in', icoon: 'hand', stand: 'straks' }],
  primair: { icoon: 'vis', waarde: '3 vissen', naam: 'Gevangen' },
  meter: { pct: 42, label: 'Beet', naam: 'Tijd van de beet', staat: 'goed' },
  cijfers: [{ icoon: 'klok', label: 'Tijd', waarde: '12:04', staat: 'goed' }, { icoon: 'euro', label: 'Opbrengst', waarde: '€ 18' }, { icoon: 'vis', label: 'Aas', waarde: '5' }],
  nu: 'Houd {SPATIE} ingedrukt om in te halen.', hulp: [], uitleg: [],
};
const N = 20000;
function run(f) { for (let i = 0; i < 2000; i++) f(); const t = process.hrtime.bigint(); let s = 0; for (let i = 0; i < N; i++) s += f().length; return { us: Number(process.hrtime.bigint() - t) / 1000 / N, s }; }
const oud = run(() => simHudHtml(m));
const nieuw = run(() => modelSleutel(m));
console.log(`simhud: oud (HTML-string) ${oud.us.toFixed(2)} us per beeld, nieuw (JSON-vingerafdruk) ${nieuw.us.toFixed(2)} us per beeld, ${(oud.us / nieuw.us).toFixed(1)}x sneller`);
