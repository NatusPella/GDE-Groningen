// Pure logica van de screenshotjacht (scripts/screenshotjacht.mjs, docs/SCREENSHOTJACHT-22-11.md): seed, bestandsnamen,
// de tripwires per beeld, het samenvoegen van de gebeurtenissen van de pagina en van het hoofdproces tot index.json,
// de tellingen en de galerij (een HTML-pagina met de beelden en hun metagegevens). Geen Electron, geen bestanden.

// ---- seed ----
export function mulberry32(seed) {
  let st = seed >>> 0;
  return () => { st = (st + 0x6D2B79F5) >>> 0; let t = st; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const pickFrom = (rnd, a) => a[Math.floor(rnd() * a.length)];
export function shuffled(rnd, a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }

// ---- namen ----
export function slug(s, max = 40) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max) || 'x';
}
// <volgnr>_<soort>_<plaats>.jpg
export function beeldNaam(nr, soort, plaats) {
  return `${String(nr).padStart(4, '0')}_${slug(soort, 16)}_${slug(plaats, 40)}`;
}

// ---- tripwires ----
export const TRIP = { zwart: 0.55, transparant: 0.02, magenta: 0.004, vlak: 4, overbelicht: 250, gelijk: 0.99, gelijkScherm: 0.9995, fpsMin: 3, fpsMax: 190, fpsMaxScherm: 400 };
// console-regels die een bevinding zijn; de rest (gewone waarschuwingen) telt alleen mee als regel in index.json
export const CONSOLE_RE = /NaN|undefined|Failed to load resource|404|shader|WebGL|THREE\.|is not defined|is not a function|Cannot read|Uncaught|TypeError|ReferenceError|Unhandled|geen textuur|texture|mislukt|timed out|TimeoutError|not loaded/i;
// bekende, onschuldige regels van Electron zelf
export const CONSOLE_RUIS_RE = /Autofill|Electron Security Warning|GPU stall|Permissions-Policy|devtools|ResizeObserver loop|ERR_BLOCKED_BY_CLIENT|Third-party cookie|GL Driver Message \(OpenGL, Performance/i;
export const isRuis = (m) => CONSOLE_RUIS_RE.test(String(m));

// Gelijkenis van twee 16x9-vingerafdrukken (0 tot 1; 1 = identiek): 1 - gemiddeld absoluut verschil / 255.
export function gelijkenis(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || !a.length || a.length !== b.length) return 0;
  let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return 1 - s / a.length / 255;
}

// rec: een beeldrecord (pixel, console, fps, vorigVerwacht); prev: het vorige beeldrecord van dezelfde stop of null.
// rec.verwachtAnders: true als dit beeld (anders camera, tijd, plek, scherm) er duidelijk anders uit moet zien dan het vorige; alleen dan telt "gelijk".
// Geeft een lijst { vlag, tekst } terug; leeg = niets verdachts.
export function tripwires(rec, prev = null, cfg = TRIP) {
  const v = [];
  const px = rec.pixel;
  if (!px) v.push({ vlag: 'geenbeeld', tekst: 'geen pixelcijfers (beeld niet opgeslagen?)' });
  else {
    if (px.black > cfg.zwart) v.push({ vlag: 'zwart', tekst: `${Math.round(px.black * 100)}% zwarte pixels` });
    if (px.clear > cfg.transparant) v.push({ vlag: 'transparant', tekst: `${Math.round(px.clear * 1000) / 10}% transparante pixels` });
    if (px.magenta > cfg.magenta) v.push({ vlag: 'magenta', tekst: `${Math.round(px.magenta * 10000) / 100}% magenta/roze pixels (ontbrekende textuur?)` });
    if (px.mean < 6 && px.black <= cfg.zwart) v.push({ vlag: 'donker', tekst: `gemiddelde helderheid ${px.mean.toFixed(1)}` });
    if (px.mean > cfg.overbelicht) v.push({ vlag: 'overbelicht', tekst: `gemiddelde helderheid ${px.mean.toFixed(1)}` });
    if (prev && prev.pixel && rec.verwachtAnders) {
      const g = gelijkenis(px.sig, prev.pixel.sig);
      // menu's en kaart: tekstpagina's lijken in een 16x9-vingerafdruk altijd op elkaar, daar telt alleen een bijna identiek beeld
      const drempel = /pauzemenu|kaart/.test(rec.scherm || '') ? (cfg.gelijkScherm ?? 0.9995) : cfg.gelijk;
      if (g > drempel) v.push({ vlag: 'gelijk', tekst: `lijkt op het vorige beeld (${(g * 100).toFixed(1)}%): vastgelopen?` });
    }
  }
  const bad = (rec.console || []).filter((c) => CONSOLE_RE.test(c.msg) && !isRuis(c.msg));
  if (bad.length) v.push({ vlag: 'console', tekst: bad.slice(0, 3).map((c) => c.msg.slice(0, 160)).join(' | ') });
  if (Number.isFinite(rec.fps)) {
    const max = rec.scherm ? cfg.fpsMaxScherm : cfg.fpsMax;
    if (rec.fps > 0 && rec.fps < cfg.fpsMin) v.push({ vlag: 'fps-laag', tekst: `fps ${rec.fps}` });
    else if (rec.fps > max) v.push({ vlag: 'fps-hoog', tekst: `fps ${rec.fps} (spel loopt niet echt?)` });
  }
  if (rec.tekst && /undefined|NaN|\[object|\bnull\b/.test(rec.tekst)) v.push({ vlag: 'tekst', tekst: 'schermtekst bevat undefined/NaN/[object/null' });
  if (rec.tekst && /Er ging iets mis|Kopieer foutrapport/.test(rec.tekst)) v.push({ vlag: 'foutmelding', tekst: 'het spel toont zelf een foutmelding (Er ging iets mis)' });
  if (rec.fout) v.push({ vlag: 'scriptfout', tekst: String(rec.fout).slice(0, 200) });
  return v;
}

// ---- gebeurtenissen -> index ----
// events: de regels van het --bot-events-bestand (al als object): { type: 'beeld' | 'pixel' | 'console' | 'stop' | 'stopklaar' | 'crash', ... }.
// De pagina logt per beeld een 'beeld' (metagegevens), het hoofdproces een 'pixel' (cijfers van het JPEG) en elke console-waarschuwing of -fout als 'console'.
// Console-regels horen bij het eerstvolgende 'beeld'.
export function samenvoegen(events, cfg = TRIP) {
  const pix = new Map();
  for (const e of events) if (e && e.type === 'pixel' && e.name) pix.set(e.name, e);
  const out = []; let wacht = []; const crashes = []; const stopFouten = [];
  for (const e of events) {
    if (!e) continue;
    if (e.type === 'console') { if (!isRuis(e.msg)) wacht.push({ level: e.level, msg: String(e.msg) }); continue; }
    if (e.type === 'crash') { crashes.push(e); continue; }
    if (e.type === 'stopfout') { stopFouten.push(e); continue; }
    if (e.type !== 'beeld') continue;
    const p = pix.get(e.naam);
    const rec = { ...e, pixel: p ? { black: p.black, clear: p.clear, magenta: p.magenta, mean: p.mean, size: p.size, sig: p.sig } : null, console: wacht };
    delete rec.type; wacht = [];
    out.push(rec);
  }
  // elk beeld tegen het vorige van dezelfde stop
  const laatste = new Map();
  for (const r of out) {
    r.vlaggen = tripwires(r, laatste.get(r.stop) || null, cfg);
    laatste.set(r.stop, r);
  }
  return { beelden: out, crashes, stopFouten, restConsole: wacht };
}

// Tellingen per soort, verdachte beelden en vlaggen.
export function tellingen(beelden) {
  const perSoort = {}, perVlag = {}; let verdacht = 0;
  for (const b of beelden) {
    perSoort[b.soort] = (perSoort[b.soort] || 0) + 1;
    if (b.vlaggen && b.vlaggen.length) { verdacht++; for (const f of b.vlaggen) perVlag[f.vlag] = (perVlag[f.vlag] || 0) + 1; }
  }
  return { totaal: beelden.length, verdacht, perSoort, perVlag };
}

// index.json: zonder de vingerafdruk (te lang om te lezen) en met een leesbare samenvatting.
export function indexVan(samen, meta = {}) {
  const beelden = samen.beelden.slice().sort((a, b) => (a.nr || 0) - (b.nr || 0)).map((b) => { const c = { ...b }; if (c.pixel) c.pixel = { ...c.pixel, sig: undefined }; c.verdacht = !!(c.vlaggen && c.vlaggen.length); return c; });
  return { ...meta, bijgewerkt: new Date().toISOString(), tellingen: tellingen(samen.beelden), crashes: samen.crashes, stopFouten: samen.stopFouten, beelden };
}

// ---- galerij: één HTML-bestand met de gegevens erin (werkt vanaf schijf, zonder server) ----
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function galerijHtml(index) {
  const data = JSON.stringify(index).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Screenshotjacht ${esc(index.seed)}</title>
<style>
body{font:14px system-ui,sans-serif;margin:0;background:#15181c;color:#dfe3e8}
header{position:sticky;top:0;background:#20252b;padding:8px 12px;z-index:5;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
header b{margin-right:8px} select,input,button{background:#2c333b;color:#dfe3e8;border:1px solid #46505b;border-radius:4px;padding:4px 6px}
#grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;padding:10px}
.k{background:#20252b;border:1px solid #333b44;border-radius:6px;overflow:hidden;cursor:pointer}
.k.v{border-color:#d9534f}.k img{width:100%;display:block;aspect-ratio:16/9;object-fit:cover;background:#000}
.k div{padding:4px 8px;font-size:12px;line-height:1.4}.vl{color:#ff8a80}.g{color:#9aa5b1}
#modal{position:fixed;inset:0;background:#000d;display:none;z-index:9;overflow:auto}
#modal.aan{display:block}#modal .in{max-width:1300px;margin:20px auto;background:#20252b;padding:12px;border-radius:8px}
#modal img{width:100%}pre{white-space:pre-wrap;word-break:break-word;background:#15181c;padding:8px;border-radius:4px;max-height:220px;overflow:auto}
</style></head><body>
<header><b>Screenshotjacht seed ${esc(index.seed)}</b>
<label>Soort <select id="f-soort"><option value="">alle</option></select></label>
<label><input type="checkbox" id="f-vd"> alleen verdacht</label>
<label>Vlag <select id="f-vlag"><option value="">alle</option></select></label>
<label>Zoek <input id="f-q" placeholder="plaats, stap, tekst"></label>
<span id="tel"></span></header>
<div id="grid"></div><div id="modal"><div class="in"></div></div>
<script>
const INDEX=${data};const B=INDEX.beelden;
const $=(i)=>document.getElementById(i);
const soorten=[...new Set(B.map(b=>b.soort))].sort(),vlaggen=[...new Set(B.flatMap(b=>(b.vlaggen||[]).map(f=>f.vlag)))].sort();
for(const s of soorten)$('f-soort').add(new Option(s+' ('+B.filter(b=>b.soort===s).length+')',s));
for(const s of vlaggen)$('f-vlag').add(new Option(s,s));
const e=(s)=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function teken(){
 const so=$('f-soort').value,vd=$('f-vd').checked,vl=$('f-vlag').value,q=$('f-q').value.toLowerCase();
 const lijst=B.filter(b=>(!so||b.soort===so)&&(!vd||b.verdacht)&&(!vl||(b.vlaggen||[]).some(f=>f.vlag===vl))&&(!q||JSON.stringify([b.plaats,b.stap,b.missie,b.tekst,b.naam]).toLowerCase().includes(q)));
 $('tel').textContent=lijst.length+' van '+B.length+' beelden, '+B.filter(b=>b.verdacht).length+' verdacht';
 $('grid').innerHTML=lijst.map(b=>'<div class="k'+(b.verdacht?' v':'')+'" data-n="'+e(b.naam)+'"><img loading="lazy" src="'+e(b.bestand)+'"><div><b>'+e(b.naam)+'</b><br><span class="g">'+e([b.uur!=null?b.uur+'u':'',b.voertuig,b.camera,b.scherm].filter(Boolean).join(' / '))+'</span>'+(b.vlaggen&&b.vlaggen.length?'<br><span class="vl">'+e(b.vlaggen.map(f=>f.vlag).join(', '))+'</span>':'')+'</div></div>').join('');
}
$('grid').onclick=(ev)=>{const k=ev.target.closest('.k');if(!k)return;const b=B.find(x=>x.naam===k.dataset.n);
 $('modal').querySelector('.in').innerHTML='<p><button onclick="document.getElementById(\\'modal\\').classList.remove(\\'aan\\')">Sluiten</button> <b>'+e(b.naam)+'</b></p><img src="'+e(b.bestand)+'"><pre>'+e(JSON.stringify({plaats:b.plaats,pos:b.pos,uur:b.uur,voertuig:b.voertuig,missie:b.missie,stap:b.stap,camera:b.camera,scherm:b.scherm,fps:b.fps,pixel:b.pixel,vlaggen:b.vlaggen,console:b.console},null,1))+'</pre><b>Schermtekst</b><pre>'+e(b.tekst)+'</pre>';
 $('modal').classList.add('aan');};
$('modal').onclick=(ev)=>{if(ev.target===$('modal'))$('modal').classList.remove('aan');};
for(const i of ['f-soort','f-vd','f-vlag','f-q'])$(i).oninput=teken;
teken();
</script></body></html>
`;
}
