// Een kleine nep-DOM voor de controlleraudit van de kaarten en popups (scripts/controller_audit_overlays.mjs): genoeg om de echte
// open...()-functies van de kaarten te draaien (innerHTML, querySelector, focus, toetsgebeurtenissen met capture op window) zonder
// jsdom en zonder Electron. De opmaak is een MODEL: elke container legt zijn kinderen onder elkaar, behalve de klassen in ROW_CLASSES
// (naast elkaar). Echte rechthoeken komen pas in de Electron-ronde; dit is voor bereikbaarheid en volgorde.
//   import { installMiniDom } from './qa/overlay_minidom.mjs';

const VOID = new Set(['input', 'br', 'img', 'hr', 'meta', 'link', 'path', 'circle', 'rect', 'use']);
export const ROW_CLASSES = /(^|\s)(os-knoppen|sk-knoppen|dk-knoppen|dk-onder|cp-actions|pm-channel-actie|rij-h)(\s|$)/;

function parseAttrs(s) {
  const attrs = {};
  for (const m of s.matchAll(/([^\s=/"'<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) attrs[m[1]] = m[2] ?? m[3] ?? m[4] ?? '';
  return attrs;
}

// ---------------------------------------------------------------- selectors (genoeg voor de kaarten en gamepad.js)
function splitTop(s, sep) {
  const out = []; let depth = 0; let cur = '';
  for (const ch of s) {
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth--;
    if (ch === sep && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}
function parseCompound(c) {
  const parts = [];
  const re = /([a-zA-Z][\w-]*)|#([\w-]+)|\.([\w-]+)|\[([^\]=~]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]|:not\(((?:[^()]|\([^)]*\))*)\)/g;
  let m;
  while ((m = re.exec(c))) {
    if (m[1]) parts.push({ t: 'tag', v: m[1].toLowerCase() });
    else if (m[2]) parts.push({ t: 'id', v: m[2] });
    else if (m[3]) parts.push({ t: 'cls', v: m[3] });
    else if (m[4]) parts.push({ t: 'attr', k: m[4], v: m[5] ?? m[6] ?? m[7] ?? null });
    else if (m[8]) parts.push({ t: 'not', sel: parseCompound(m[8]) });
  }
  return parts;
}
const matchesCompound = (el, parts) => parts.every((p) => {
  if (p.t === 'tag') return el.tagName.toLowerCase() === p.v;
  if (p.t === 'id') return el.id === p.v;
  if (p.t === 'cls') return el.classList.contains(p.v);
  if (p.t === 'attr') return p.v == null ? el.hasAttribute(p.k) : el.getAttribute(p.k) === p.v;
  if (p.t === 'not') return !matchesCompound(el, p.sel);
  return false;
});
function parseSelector(sel) {
  return splitTop(sel, ',').map((one) => {
    const chain = []; let comb = ' '; let cur = ''; let depth = 0;
    for (const ch of one) {
      if (ch === '(' || ch === '[') depth++;
      if (ch === ')' || ch === ']') depth--;
      if (depth === 0 && (ch === ' ' || ch === '>')) { if (cur) { chain.push({ comb, parts: parseCompound(cur) }); cur = ''; comb = ' '; } if (ch === '>') comb = '>'; } else cur += ch;
    }
    if (cur) chain.push({ comb, parts: parseCompound(cur) });
    return chain;
  });
}
function matchChain(el, chain, i) {
  const link = chain[i];
  if (!matchesCompound(el, link.parts)) return false;
  if (i === 0) return true;
  if (link.comb === '>') return !!el.parentNode && el.parentNode.tagName && matchChain(el.parentNode, chain, i - 1);
  for (let p = el.parentNode; p && p.tagName; p = p.parentNode) if (matchChain(p, chain, i - 1)) return true;
  return false;
}

// ---------------------------------------------------------------- elementen
class ClassList {
  constructor(el) { this.el = el; }
  list() { return String(this.el.attrs.class || '').split(/\s+/).filter(Boolean); }
  contains(c) { return this.list().includes(c); }
  add(...c) { const l = this.list(); for (const x of c) if (!l.includes(x)) l.push(x); this.el.attrs.class = l.join(' '); }
  remove(...c) { this.el.attrs.class = this.list().filter((x) => !c.includes(x)).join(' '); }
  toggle(c, force) { const on = force == null ? !this.contains(c) : !!force; if (on) this.add(c); else this.remove(c); return on; }
}

export class MiniEl {
  constructor(doc, tag) {
    this.ownerDocument = doc; this.tagName = tag.toUpperCase(); this.attrs = {}; this.childNodes = []; this.parentNode = null;
    this.listeners = {}; this.style = { setProperty() {}, removeProperty() {} }; this._text = ''; this.classList = new ClassList(this);
    this.value = ''; this.checked = false; this.nodeType = 1;
  }
  get children() { return this.childNodes.filter((c) => c.tagName); }
  get firstElementChild() { return this.children[0] || null; }
  get id() { return this.attrs.id || ''; } set id(v) { this.attrs.id = v; }
  get className() { return this.attrs.class || ''; } set className(v) { this.attrs.class = v; }
  get hidden() { return 'hidden' in this.attrs; } set hidden(v) { if (v) this.attrs.hidden = ''; else delete this.attrs.hidden; }
  get disabled() { return 'disabled' in this.attrs; }
  get type() { return this.attrs.type || (this.tagName === 'BUTTON' ? 'submit' : this.tagName === 'INPUT' ? 'text' : ''); } set type(v) { this.attrs.type = v; }
  set tabIndex(v) { this.attrs.tabindex = String(v); } get tabIndex() { return this.attrs.tabindex != null ? Number(this.attrs.tabindex) : -1; }
  get dataset() {
    const self = this;
    return new Proxy({}, {
      get: (_, k) => { const a = 'data-' + String(k).replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()); return a in self.attrs ? self.attrs[a] : undefined; },
      set: (_, k, v) => { self.attrs['data-' + String(k).replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())] = String(v); return true; },
      has: (_, k) => ('data-' + String(k).replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())) in self.attrs,
    });
  }
  get isConnected() { let p = this; while (p.parentNode) p = p.parentNode; return p === this.ownerDocument.documentElementRoot; }
  get textContent() { return this._text + this.childNodes.map((c) => (c.tagName ? c.textContent : c.data || '')).join(''); }
  set textContent(v) { this.childNodes = []; this._text = String(v); }
  setAttribute(k, v) { this.attrs[k] = String(v); } getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  hasAttribute(k) { return k in this.attrs; } removeAttribute(k) { delete this.attrs[k]; }
  appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.childNodes.push(c); return c; }
  removeChild(c) { const i = this.childNodes.indexOf(c); if (i >= 0) this.childNodes.splice(i, 1); c.parentNode = null; return c; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); if (this.ownerDocument.activeElement && !this.ownerDocument.contains(this.ownerDocument.activeElement)) this.ownerDocument.activeElement = null; }
  contains(o) { for (let p = o; p; p = p.parentNode) if (p === this) return true; return false; }
  set innerHTML(html) { this.childNodes.forEach((c) => { c.parentNode = null; }); this.childNodes = []; this._text = ''; parseInto(this, String(html)); const a = this.ownerDocument.activeElement; if (a && !this.ownerDocument.contains(a)) this.ownerDocument.activeElement = null; }
  get innerHTML() { return this.childNodes.map((c) => (c.tagName ? `<${c.tagName.toLowerCase()}>` : c.data)).join(''); }
  querySelectorAll(sel) {
    const chains = parseSelector(sel); const out = [];
    const walk = (n) => { for (const c of n.children) { if (chains.some((ch) => matchChain(c, ch, ch.length - 1))) out.push(c); walk(c); } };
    walk(this); return out;
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  matches(sel) { return parseSelector(sel).some((ch) => matchChain(this, ch, ch.length - 1)); }
  closest(sel) { for (let p = this; p && p.tagName; p = p.parentNode) if (p.matches(sel)) return p; return null; }
  addEventListener(t, f, o) { (this.listeners[t] ||= []).push({ f, capture: o === true || !!(o && o.capture) }); }
  removeEventListener(t, f) { this.listeners[t] = (this.listeners[t] || []).filter((x) => x.f !== f); }
  dispatchEvent(ev) { return dispatch(this.ownerDocument, this, ev); }
  focus() { if (!isFocusableTag(this) || this.disabled) return; this.ownerDocument.activeElement = this; this.focused = (this.focused || 0) + 1; }
  blur() { if (this.ownerDocument.activeElement === this) this.ownerDocument.activeElement = null; }
  click() { if (this.tagName === 'INPUT' && this.attrs.type === 'checkbox') this.checked = !this.checked; dispatch(this.ownerDocument, this, mkEvent('click', {})); }
  scrollIntoView() { this.scrolled = (this.scrolled || 0) + 1; }
  scrollBy() {}
  getClientRects() { return this.hidden || hiddenAncestor(this) || !this.isConnected && !this.ownerDocument.layoutAnyway ? [] : [1]; }
  getBoundingClientRect() { const r = layoutOf(this); return { left: r.x, top: r.y, width: r.w, height: r.h, right: r.x + r.w, bottom: r.y + r.h }; }
  get offsetWidth() { return 1; }
}
const isFocusableTag = (el) => /^(BUTTON|INPUT|SELECT|TEXTAREA|A|SUMMARY)$/.test(el.tagName) || el.hasAttribute('tabindex');
const hiddenAncestor = (el) => { for (let p = el; p && p.tagName; p = p.parentNode) if (p.hasAttribute('hidden')) return true; return false; };

function parseInto(parent, html) {
  const doc = parent.ownerDocument;
  const stack = [parent];
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s=/>"']+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    const top = stack[stack.length - 1];
    if (m[1]) { const t = m[1].toLowerCase(); for (let i = stack.length - 1; i > 0; i--) if (stack[i].tagName.toLowerCase() === t) { stack.length = i; break; } } else if (m[2]) {
      const el = new MiniEl(doc, m[2]); el.attrs = parseAttrs(m[3] || '');
      if (el.tagName === 'INPUT' && el.attrs.type === 'checkbox') el.checked = 'checked' in el.attrs;
      if (el.tagName === 'INPUT') el.value = el.attrs.value || '';
      top.appendChild(el);
      if (!m[4] && !VOID.has(m[2].toLowerCase())) stack.push(el);
    } else if (m[5] != null && !m[0].startsWith('<!--')) top.childNodes.push({ data: m[5].replace(/&amp;|&lt;|&gt;|&quot;/g, (x) => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"' }[x])), parentNode: top });
  }
}

// ---------------------------------------------------------------- opmaakmodel
export function layoutOf(el) {
  let top = el; while (top.parentNode && top.parentNode.tagName) top = top.parentNode;
  const rects = new Map();
  const walk = (n, x, y) => {
    const kids = n.children.filter((c) => !c.hidden);
    if (!kids.length) { rects.set(n, { x, y, w: 200, h: 40 }); return { w: 200, h: 40 }; }
    const row = ROW_CLASSES.test(n.attrs.class || '');
    let cx = x, cy = y, w = 0, h = 0;
    for (const k of kids) {
      const s = walk(k, cx, cy);
      if (row) { cx += s.w + 10; w += s.w + 10; h = Math.max(h, s.h); } else { cy += s.h + 10; h += s.h + 10; w = Math.max(w, s.w); }
    }
    rects.set(n, { x, y, w, h });
    return { w, h };
  };
  walk(top, 0, 0);
  return rects.get(el) || { x: 0, y: 0, w: 0, h: 0 };
}

// ---------------------------------------------------------------- gebeurtenissen
export function mkEvent(type, init = {}) {
  const ev = { type, bubbles: true, cancelable: true, defaultPrevented: false, repeat: false, key: '', target: null, __stop: false, __stopNow: false, ...init };
  ev.preventDefault = () => { ev.defaultPrevented = true; };
  ev.stopPropagation = () => { ev.__stop = true; };
  ev.stopImmediatePropagation = () => { ev.__stop = true; ev.__stopNow = true; };
  return ev;
}
function dispatch(doc, target, ev) {
  ev.target = target;
  const path = []; for (let p = target; p && p.tagName; p = p.parentNode) path.push(p);
  const win = doc.window;
  const run = (node, capture) => { for (const l of [...(node.listeners[ev.type] || [])]) { if (!!l.capture !== capture && node !== target) continue; l.f.call(node, ev); if (ev.__stopNow) return true; } return ev.__stop; };
  if (win.listeners[ev.type]) for (const l of [...win.listeners[ev.type]]) { if (!l.capture) continue; l.f.call(win, ev); if (ev.__stopNow) return !ev.defaultPrevented; }
  if (ev.__stop) return !ev.defaultPrevented;
  for (const node of [...path].reverse()) { if (node === target) break; if (run(node, true)) return !ev.defaultPrevented; }
  for (const node of path) { if (run(node, false)) return !ev.defaultPrevented; if (!ev.bubbles) break; }
  if (win.listeners[ev.type]) for (const l of [...win.listeners[ev.type]]) { if (l.capture) continue; l.f.call(win, ev); if (ev.__stopNow) break; }
  return !ev.defaultPrevented;
}

// ---------------------------------------------------------------- installeren
export function installMiniDom() {
  const mem = new Map();
  const doc = {
    activeElement: null, hidden: false, window: null, layoutAnyway: false,
    createElement: (t) => new MiniEl(doc, t),
    addEventListener() {}, removeEventListener() {},
    getElementById: (id) => doc.documentElementRoot.querySelector('#' + id),
    querySelector: (s) => doc.documentElementRoot.querySelector(s), querySelectorAll: (s) => doc.documentElementRoot.querySelectorAll(s),
    contains: (el) => !!el && (el === doc.documentElementRoot || doc.documentElementRoot.contains(el)),
  };
  doc.documentElementRoot = new MiniEl(doc, 'html');
  doc.documentElement = doc.documentElementRoot;
  doc.body = new MiniEl(doc, 'body'); doc.documentElementRoot.appendChild(doc.body);
  doc.head = new MiniEl(doc, 'head'); doc.documentElementRoot.appendChild(doc.head);
  const win = { listeners: {}, document: doc };
  win.addEventListener = (t, f, o) => { (win.listeners[t] ||= []).push({ f, capture: o === true || !!(o && o.capture) }); };
  win.removeEventListener = (t, f) => { win.listeners[t] = (win.listeners[t] || []).filter((x) => x.f !== f); };
  doc.window = win;
  Object.defineProperty(doc, 'activeElementOrBody', { get: () => doc.activeElement || doc.body });
  // KeyboardEvent zoals input.js sendKey hem maakt: naar het element met de focus, anders naar window
  globalThis.KeyboardEvent = class { constructor(type, init) { return mkEvent(type, init); } };
  globalThis.Event = class { constructor(type, init) { return mkEvent(type, init); } };
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  globalThis.document = doc;
  globalThis.window = Object.assign(globalThis, { addEventListener: win.addEventListener, removeEventListener: win.removeEventListener });
  try { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node', maxTouchPoints: 0 }, configurable: true }); } catch (e) { /* al gezet */ }
  const origDispatch = (target, ev) => dispatch(doc, target || doc.body, ev);
  return { doc, win, mem, fire: (target, ev) => origDispatch(target, ev), tick: () => new Promise((r) => setTimeout(r, 0)) };
}
