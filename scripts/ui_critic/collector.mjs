// UI-kritiekharnas: de verzamelaar die IN de pagina draait (via CDP Runtime.evaluate). Geeft per zichtbaar element een
// record met geometrie en stijl voor tripwires.mjs. Eén functie zonder imports, zodat toString() hem naar de pagina brengt.

export function collect(rootSelector) {
  const root = (rootSelector && document.querySelector(rootSelector)) || document.body;
  const recs = [];
  const idx = new Map();
  const NATIEF = new Set(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY']);
  const RONDE = new Set(['button', 'tab', 'menuitem', 'link', 'checkbox', 'radio', 'switch', 'option', 'slider']);
  const pc = (s) => {
    const m = String(s || '').match(/rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.%]+))?\s*\)/);
    if (!m) return null;
    const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return [Math.round(+m[1]), Math.round(+m[2]), Math.round(+m[3]), a];
  };
  const selOf = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const c = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 3) : [];
    if (c.length) s += '.' + c.join('.');
    return s;
  };
  // Eigen CSS-regels voor ::-webkit-scrollbar (een eigen scrollbalk is geen native).
  const sbSelectors = [];
  for (const sh of document.styleSheets) {
    let rules; try { rules = sh.cssRules; } catch (e) { continue; }
    for (const r of rules || []) if (r.selectorText && /::-webkit-scrollbar/.test(r.selectorText)) {
      for (const part of r.selectorText.split(',')) if (/::-webkit-scrollbar\s*$/.test(part.trim())) sbSelectors.push(part.replace(/::-webkit-scrollbar\s*$/, '').trim() || '*');
    }
  }
  const eigenScrollbar = (el, cs) => {
    if (cs.scrollbarWidth && cs.scrollbarWidth !== 'auto') return true;
    for (const s of sbSelectors) { try { if (el.matches(s)) return true; } catch (e) { /* ongeldig */ } }
    return false;
  };
  const effBg = (el) => { // de eerste dekkende achtergrond omhoog, met alpha eroverheen
    const stapel = [];
    let onbekend = false;
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') onbekend = true;
      const c = pc(cs.backgroundColor);
      if (c && c[3] > 0) { stapel.push(c); if (c[3] >= 0.99) break; }
    }
    let basis = [255, 255, 255];
    for (let i = stapel.length - 1; i >= 0; i--) { const c = stapel[i]; basis = [0, 1, 2].map((k) => Math.round(c[k] * c[3] + basis[k] * (1 - c[3]))); }
    return { bg: [...basis, 1], onbekend };
  };
  const walk = (el, parent, inScroller, layerKey) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || el.hidden) return;
    if (parseFloat(cs.opacity) === 0) return;
    const r = el.getBoundingClientRect();
    const tag = el.tagName;
    if (['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'TEMPLATE'].includes(tag)) return;
    const ownText = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
    const media = ['IMG', 'SVG', 'CANVAS', 'VIDEO', 'svg'].includes(tag);
    const role = (el.getAttribute('role') || '').toLowerCase();
    const interactive = NATIEF.has(tag) && !(tag === 'INPUT' && el.type === 'hidden') || RONDE.has(role) || (cs.cursor === 'pointer' && !el.closest('a,button') && !['LABEL', 'OUTPUT'].includes(tag) && !(el.parentElement && getComputedStyle(el.parentElement).cursor === 'pointer'));
    const overflowScroll = /(auto|scroll)/.test(cs.overflowY) || /(auto|scroll)/.test(cs.overflowX);
    // een voorouder die afknipt (hidden/clip/auto/scroll) houdt zijn inhoud binnen zijn eigen rand: dat is geen ontsnapping uit het kader
    const knipt = el !== document.body && el !== document.documentElement && (cs.overflowX !== 'visible' || cs.overflowY !== 'visible');
    const posLayer = cs.position === 'fixed' || cs.position === 'absolute' || cs.position === 'sticky';
    const layer = (cs.zIndex !== 'auto' && posLayer) ? layerKey + '/' + cs.zIndex + selOf(el) : (posLayer ? layerKey + '/p' + recs.length : layerKey);
    const kleur = pc(cs.color);
    const eb = effBg(el);
    const rec = {
      sel: selOf(el), tag: tag.toLowerCase(), parent: parent, rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      ownText: ownText, fontSize: parseFloat(cs.fontSize), fontWeight: parseInt(cs.fontWeight, 10) || 400,
      color: kleur ? [kleur[0], kleur[1], kleur[2], kleur[3] * (parseFloat(cs.opacity) || 1)] : null, bg: eb.bg, bgOnbekend: eb.onbekend,
      scrollW: el.scrollWidth, clientW: el.clientWidth, scrollH: el.scrollHeight, clientH: el.clientHeight,
      clipsX: cs.overflowX !== 'visible' || cs.textOverflow === 'ellipsis', scroller: overflowScroll,
      scrolls: overflowScroll && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1),
      customScrollbar: overflowScroll ? eigenScrollbar(el, cs) : true, inScroller: inScroller,
      hasBorder: ['Top', 'Right', 'Bottom', 'Left'].some((s) => parseFloat(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Style'] !== 'none'),
      hasBg: (pc(cs.backgroundColor) || [0, 0, 0, 0])[3] > 0.05, childCount: el.children.length, media: media,
      interactive: !!interactive, focusable: el.tabIndex >= 0 || el.hasAttribute('tabindex'), // tabindex=-1 is een rollende focus (listnav), geen gat disabled: !!el.disabled || el.getAttribute('aria-disabled') === 'true',
      decor: el.getAttribute('aria-hidden') === 'true' || (el.className && /(^|\s)(ds-)?(deco|decor|spacer|sep|rule|dot|bar|fill|track|pip|swatch)/.test(String(el.className))) || el.tagName === 'HR',
      layer: layer,
    };
    const me = recs.length;
    if (r.width > 0 && r.height > 0) { recs.push(rec); idx.set(el, me); }
    const next = r.width > 0 && r.height > 0 ? me : parent;
    for (const c of el.children) walk(c, next, inScroller || knipt, layer);
  };
  walk(root, -1, false, 'root');
  return { records: recs, vw: window.innerWidth, vh: window.innerHeight, ui: getComputedStyle(document.documentElement).getPropertyValue('--ui').trim() };
}
