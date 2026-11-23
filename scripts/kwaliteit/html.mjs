// Gedeelde HTML-bouwstenen voor de rapporten van de kwaliteitsmachine (beeldregressie en eindrapport): één pagina,
// zonder scripts van buiten en zonder netwerk; beelden staan als relatieve links naast het rapport.
import path from 'node:path';

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/** Een pad als link vanaf de map van het rapport (met / ook op Windows). */
export const rel = (vanMap, naar) => path.relative(vanMap, naar).split(path.sep).map(encodeURIComponent).join('/');
export const KLEUR = { ok: '#2e7d32', fout: '#c62828', nieuw: '#1565c0', overgeslagen: '#757575', let: '#ef6c00' };
export const badge = (soort, tekst) => `<span class="badge" style="background:${KLEUR[soort] || '#555'}">${esc(tekst || soort)}</span>`;

export function pagina(titel, body) {
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>${esc(titel)}</title>
<style>
body{font:15px/1.45 system-ui,sans-serif;background:#16181b;color:#e8e8e8;margin:0;padding:24px 32px;max-width:1800px}
h1{margin:0 0 6px}h2{margin:30px 0 8px;font-size:20px;border-bottom:1px solid #333;padding-bottom:4px}h3{margin:18px 0 6px;font-size:16px}
.meta{color:#9aa}.badge{display:inline-block;padding:1px 9px;border-radius:9px;color:#fff;font-size:12px;margin-right:6px}
table{border-collapse:collapse;margin:8px 0}td,th{border-bottom:1px solid #2c2f33;padding:4px 10px;text-align:left;vertical-align:top}th{color:#9aa;font-weight:600}
.drie{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:6px 0 18px}.drie figure,.vel figure{margin:0}.drie img,.vel img{width:100%;border:1px solid #444;background:#000}
figcaption{font-size:12px;color:#9aa}.vel{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}a{color:#8ab4f8}code{background:#23272b;padding:0 4px}
.punt{border-top:1px solid #2c2f33;padding-top:8px}.klein{font-size:12px}
</style></head><body>
${body}
</body></html>`;
}
