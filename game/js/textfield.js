// Tekstvelden (#95, kamercode en IP-adres in de wachtkamer): alles wat je in een gewoon tekstveld verwacht
// werkt ook in het spel: alle toetsen (de spelbesturing in input.js laat ze met rust), plakken, kopiëren,
// knippen, alles selecteren en een menu met die vier op de rechtermuisknop. Een Electron-venster zonder
// menu (Windows en Linux) of zonder Bewerken-menu (macOS) plakt anders niet; dan doet dit het werk, met het
// klembord van de desktop-app (preload.js) of van de browser. Eerst probeert de browser het zelf: komt er
// binnen een paar tellen geen paste-gebeurtenis, dan plakken we met de hand (zo nooit dubbel).
export const isTextField = (t) => !!(t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && !['range', 'checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'color'].includes(t.type)) || t.isContentEditable));

async function readClip() {
  try { const d = typeof window !== 'undefined' && window.gdeDesktop && window.gdeDesktop.clipboard; if (d) return String(await d.readText()); } catch (e) { /* de browser dan */ }
  try { return String(await navigator.clipboard.readText()); } catch (e) { return ''; }
}
async function writeClip(text) {
  try { const d = window.gdeDesktop && window.gdeDesktop.clipboard; if (d) { await d.writeText(text); return true; } } catch (e) { /* de browser dan */ }
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { return false; }
}

// pure helper (getest): wat staat er na het invoegen van `text` over de selectie van een veld?
export function insertAt(value, start, end, text, maxLength = 0) {
  const s = Math.max(0, Math.min(start ?? value.length, value.length)), e = Math.max(s, Math.min(end ?? s, value.length));
  let ins = String(text);
  if (maxLength > 0) ins = ins.slice(0, Math.max(0, maxLength - (value.length - (e - s))));
  return { value: value.slice(0, s) + ins + value.slice(e), caret: s + ins.length };
}

function setValue(el, value, caret) {
  el.value = value;
  try { el.setSelectionRange(caret, caret); } catch (e) { /* geen selectie in dit soort veld */ }
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
async function pasteInto(el) {
  const t = (await readClip()).replace(/[\r\n]+/g, ' ');
  if (!t) return false;
  const r = insertAt(el.value, el.selectionStart, el.selectionEnd, t, el.maxLength > 0 ? el.maxLength : 0);
  setValue(el, r.value, r.caret);
  return true;
}
async function copyFrom(el, cut) {
  const s = el.selectionStart, e = el.selectionEnd; if (s == null || e == null || s === e) return false;
  const ok = await writeClip(el.value.slice(s, e));
  if (ok && cut) setValue(el, el.value.slice(0, s) + el.value.slice(e), s);
  return ok;
}
const selectAll = (el) => { try { el.select(); } catch (e) { try { el.setSelectionRange(0, el.value.length); } catch (er) { /* niets te selecteren */ } } };

let menu = null;
function closeMenu() { if (menu) { menu.remove(); menu = null; } }
function showMenu(el, x, y) {
  closeMenu();
  menu = document.createElement('div');
  menu.className = 'tfmenu-gde';
  menu.setAttribute('role', 'menu');
  menu.style.cssText = `position:fixed;left:${Math.round(x)}px;top:${Math.round(y)}px;z-index:99999;min-width:160px;padding:4px;border-radius:8px;background:rgba(15,40,26,0.97);box-shadow:inset 0 0 0 1px rgba(240,237,228,0.24),0 8px 24px rgba(0,0,0,0.5);font:20px 'Bebas Neue','Arial Narrow',Arial,sans-serif;letter-spacing:0.05em;color:#f0ede4;`;
  const items = [['Knippen', () => copyFrom(el, true)], ['Kopiëren', () => copyFrom(el, false)], ['Plakken', () => pasteInto(el)], ['Alles selecteren', () => selectAll(el)]];
  for (const [label, fn] of items) {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('role', 'menuitem'); b.textContent = label;
    b.style.cssText = 'display:block;width:100%;text-align:left;padding:6px 12px;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;border-radius:6px;';
    b.addEventListener('mouseenter', () => { b.style.background = 'rgba(240,237,228,0.12)'; });
    b.addEventListener('mouseleave', () => { b.style.background = 'transparent'; });
    b.addEventListener('mousedown', (e) => e.preventDefault()); // het veld houdt de focus en de selectie
    b.addEventListener('click', async () => { closeMenu(); el.focus(); await fn(); });
    menu.appendChild(b);
  }
  document.body.appendChild(menu);
  const r = menu.getBoundingClientRect();
  if (r.right > innerWidth) menu.style.left = Math.max(4, innerWidth - r.width - 4) + 'px';
  if (r.bottom > innerHeight) menu.style.top = Math.max(4, innerHeight - r.height - 4) + 'px';
}

let native = { paste: 0, copy: 0, cut: 0 }, started = false;
export function initTextFields() {
  if (typeof window === 'undefined' || started) return;
  started = true;
  for (const k of ['paste', 'copy', 'cut']) document.addEventListener(k, () => { native[k] = Date.now(); }, true);
  window.addEventListener('keydown', (e) => {
    const el = e.target;
    if (!isTextField(el) || e.__gde) return;
    const key = String(e.key || '').toLowerCase(), mod = e.ctrlKey || e.metaKey;
    const act = mod && key === 'v' ? 'paste' : (e.shiftKey && key === 'insert') ? 'paste' : mod && key === 'c' ? 'copy' : mod && key === 'x' ? 'cut' : mod && key === 'a' ? 'select' : null;
    if (!act) return;
    const t0 = Date.now();
    setTimeout(() => {
      if (act === 'select') { if (el.selectionStart === 0 && el.selectionEnd === el.value.length) return; selectAll(el); return; }
      if (native[act] >= t0) return; // de browser deed het zelf
      if (act === 'paste') pasteInto(el); else copyFrom(el, act === 'cut');
    }, 90);
  }, true);
  window.addEventListener('contextmenu', (e) => {
    if (!isTextField(e.target)) return;
    e.stopImmediatePropagation(); e.preventDefault();
    e.target.focus();
    showMenu(e.target, e.clientX, e.clientY);
  }, true);
  window.addEventListener('pointerdown', (e) => { if (menu && !menu.contains(e.target)) closeMenu(); }, true);
  window.addEventListener('keydown', (e) => { if (menu && e.key === 'Escape') { e.stopImmediatePropagation(); closeMenu(); } }, true);
  window.addEventListener('blur', closeMenu);
}
