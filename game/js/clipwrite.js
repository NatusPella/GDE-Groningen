// Tekst naar het klembord, met een vaste keten (benchmarkrapport 22-11: "Kopiëren werkte niet, Opslaan wel"):
//   1. het klembord van de desktop-app (preload.js, via het main-proces; werkt zonder gebaar of toestemming),
//   2. navigator.clipboard (alleen in een veilige context en na een gebaar),
//   3. een verborgen tekstveld met document.execCommand('copy').
// Geeft true als één van de drie lukte. De omgeving is injecteerbaar voor de test (scripts/clipwrite_test.mjs).
export const CLIP_MAX = 200000;

export async function writeClipboardText(text, env = {}) {
  const t = String(text == null ? '' : text).slice(0, CLIP_MAX);
  const win = 'win' in env ? env.win : (typeof window !== 'undefined' ? window : null);
  const nav = 'nav' in env ? env.nav : (typeof navigator !== 'undefined' ? navigator : null);
  const doc = 'doc' in env ? env.doc : (typeof document !== 'undefined' ? document : null);
  try {
    const D = win && win.gdeDesktop;
    if (D && D.clipboard) { const r = await D.clipboard.writeText(t); if (r !== false) return true; }
  } catch (e) { /* de browser dan */ }
  try { if (nav && nav.clipboard) { await nav.clipboard.writeText(t); return true; } } catch (e) { /* geen toestemming: de oude manier */ }
  try {
    if (!doc || !doc.createElement) return false;
    const ta = doc.createElement('textarea');
    ta.value = t;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    doc.body.appendChild(ta);
    ta.select();
    const ok = !!doc.execCommand('copy');
    ta.remove();
    return ok;
  } catch (e) { return false; }
}
